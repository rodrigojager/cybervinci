import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import * as Ajv from '@theia/core/shared/ajv';
import * as fsSync from 'fs';
import * as fs from 'fs/promises';
import * as http from 'http';
import * as https from 'https';
import * as os from 'os';
import * as path from 'path';
import { createInterface } from 'readline';
import { FileUri } from '@theia/core/lib/common/file-uri';
import { generateUuid } from '@theia/core/lib/common';
import { inject, injectable, optional } from '@theia/core/shared/inversify';
import {
    FlowEvent,
    FlowGateDecisionRequest,
    FlowGateStatus,
    FlowHumanGate,
    FlowKernelRunMetadata,
    FlowRun,
    FlowRunExecutionMode,
    FlowStateRuntimeStatus,
    FlowWorkloadResultIssue,
    FlowWorkflow,
    FlowWorkflowTransition,
    FlowWorkflowState,
    FlowWorkload,
    FlowContextPack,
    FlowKernelHostRequest as FlowKernelProtocolHostRequest,
    FlowKernelHostRequestType,
    AGENCY_KERNEL_PROTOCOL_VERSION,
    AGENCY_KERNEL_WORKFLOW_VERSION,
    FlowSizeLimits,
    limitFlowJsonValue,
    truncateFlowText,
    validateFlowWorkflow
} from '../common';
import {
    FlowWorkloadExecutor,
    FlowWorkloadExecutionContext,
    ProviderBackedFlowWorkloadExecutor
} from './flow-workload-executor';
import { CommandEffectHostAdapter, LocalCommandEffectHostAdapter } from './command-effect-host-adapter';
import { MemoryAdapter } from './memory-adapter';
import contractsSchema = require('./schemas/contracts.schema.json');

interface KernelMessage {
    type: string;
    id?: string;
    [key: string]: unknown;
}

interface KernelResponse extends KernelMessage {
    requestId?: string;
    error?: string;
}

interface KernelTransport {
    request(message: KernelMessage): Promise<KernelResponse>;
    close(): Promise<void> | void;
    start?(): Promise<void>;
    healthCheck?(): Promise<void>;
    restart?(reason?: string): Promise<void>;
    shutdown?(): Promise<void>;
    getStderrSnapshot?(maxBytes?: number): string;
    onPushMessage?(listener: (message: KernelMessage) => void): () => void;
    onDisconnect?(listener: (error: Error) => void): () => void;
}

const flowContractSchemaValidator = new Ajv({
    allErrors: true,
    validateSchema: false
}).compile(normalizeFlowSchemaForAjv(contractsSchema as Record<string, unknown>));

function normalizeFlowSchemaForAjv(schema: Record<string, unknown>): Record<string, unknown> {
    const { $schema, ...normalizedSchema } = schema;
    return normalizedSchema;
}

interface PendingKernelResponse {
    resolve: (response: KernelResponse) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
}

interface RuntimeWebSocket {
    readyState: number;
    binaryType?: string;
    onopen: ((event: unknown) => void) | null;
    onerror: ((event: unknown) => void) | null;
    onmessage: ((event: { data: unknown }) => void) | null;
    onclose: ((event: unknown) => void) | null;
    send(data: string): void;
    close(code?: number, reason?: string): void;
}

type RuntimeWebSocketConstructor = new (url: string) => RuntimeWebSocket;

function defaultRequestTimeoutMs(): number {
    const configured = process.env.FLOW_KERNEL_TIMEOUT_MS || process.env.AGENCY_KERNEL_TIMEOUT_MS;
    const timeout = Number.parseInt(configured || '', 10);
    return Number.isFinite(timeout) && timeout > 0 ? timeout : 30000;
}

const AGENT_KERNEL_STDERR_BUFFER_BYTES = 64 * 1024;

type KernelBridgePreference = 'auto' | 'external' | 'simulated';

export const FlowKernelBridge = Symbol('FlowKernelBridge');

export type FlowKernelBridgeMode = 'external' | 'simulated';

export interface FlowKernelBridge {
    available?(): boolean;
    supportsRunEventStream?(): boolean | Promise<boolean>;
    startRun(workflow: FlowWorkflow, prompt: string, projectSummary: string, workspaceRootUri?: string): Promise<FlowRun>;
    tickRun(workflow: FlowWorkflow, run: FlowRun, workspaceRootUri?: string): Promise<FlowRun>;
    approveGate(workflow: FlowWorkflow, run: FlowRun, request: FlowGateDecisionRequest): Promise<FlowRun>;
    pauseRun(workflow: FlowWorkflow, run: FlowRun, reason?: string): Promise<FlowRun>;
    resumeRun(workflow: FlowWorkflow, run: FlowRun, reason?: string): Promise<FlowRun>;
    cancelRun(workflow: FlowWorkflow, run: FlowRun, reason?: string): Promise<FlowRun>;
    refreshRun(workflow: FlowWorkflow, run: FlowRun): Promise<FlowRun>;
    subscribeRunEvents?(
        workflow: FlowWorkflow,
        run: FlowRun,
        workspaceRootUri: string | undefined,
        listener: (run: FlowRun) => void,
        errorListener?: (error: Error) => void
    ): Promise<() => void>;
    getBridgeMode(): Promise<FlowKernelBridgeMode>;
}

function resolveKernelBridgePreference(): KernelBridgePreference {
    const configured = (process.env.FLOW_KERNEL_MODE || process.env.FLOW_KERNEL_EXECUTION_MODE || '')
        .trim()
        .toLowerCase();
    if (configured === 'simulated' || configured === 'force-simulated' || configured === 'mock' || configured === 'fake') {
        return 'simulated';
    }
    if (configured === 'external' || configured === 'durable' || configured === 'kernel') {
        return 'external';
    }
    return 'auto';
}

function isExplicitSimulatedKernelMode(): boolean {
    return resolveKernelBridgePreference() === 'simulated';
}

function formatKernelBridgeError(operation: string, error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);
    return `External Flow Kernel ${operation} failed: ${message}`;
}

function fallbackExecutionMode(): FlowRunExecutionMode {
    return isExplicitSimulatedKernelMode() ? 'kernel_simulated' : 'kernel_simulated_fallback_error';
}

function fallbackExecutionMessage(operation: string): string {
    return isExplicitSimulatedKernelMode()
        ? `Explicitly using simulated execution for ${operation}.`
        : `External protocol was unavailable; ${operation} continued in degraded simulated mode.`;
}

class PersistentStdioTransport implements KernelTransport {
    protected closed = false;
    protected process?: ChildProcessWithoutNullStreams;
    protected running = false;
    protected ready?: Promise<void>;
    protected lineReader?: ReturnType<typeof createInterface>;
    protected readonly pending = new Map<string, PendingKernelResponse>();
    protected stderrBuffer = '';
    protected readonly stderrBufferBytes = AGENT_KERNEL_STDERR_BUFFER_BYTES;

    constructor(protected readonly command: KernelCommand) { }

    async start(): Promise<void> {
        await this.ensureRunning();
    }

    async healthCheck(): Promise<void> {
        const response = await this.request({ type: 'status', id: `status-${generateUuid()}` } as KernelMessage);
        ensureResponseType(response, 'status.ok');
    }

    async restart(reason = 'Kernel daemon restart requested.'): Promise<void> {
        if (this.closed) {
            throw new Error('Flow Kernel transport is closed and cannot be restarted.');
        }
        const message = `Flow Kernel transport is restarting. ${reason}`;
        this.failPending(new Error(message));
        this.stopProcess();
        this.ready = undefined;
        await this.startProcess();
    }

    async shutdown(): Promise<void> {
        this.closed = true;
        this.failPending(new Error('Flow Kernel transport shutdown requested.'));
        this.stopProcess();
    }

    getStderrSnapshot(maxBytes = this.stderrBufferBytes): string {
        if (!this.stderrBuffer.length) {
            return '';
        }
        if (maxBytes <= 0 || this.stderrBuffer.length <= maxBytes) {
            return this.stderrBuffer;
        }
        return this.stderrBuffer.slice(this.stderrBuffer.length - maxBytes);
    }

    async request(message: KernelMessage): Promise<KernelResponse> {
        await this.ensureRunning();
        if (!this.process) {
            throw new Error('Flow Kernel transport process is not running.');
        }
        const payload = { ...message, id: message.id || generateUuid() } as KernelMessage;
        const id = String(payload.id);
        return new Promise<KernelResponse>((resolve, reject) => {
            const timeoutMs = defaultRequestTimeoutMs();
            const timeout = setTimeout(() => {
                this.pending.delete(id);
                reject(new Error(`Flow Kernel request timed out after ${timeoutMs}ms (id=${id}).`));
            }, timeoutMs);
            this.pending.set(id, {
                resolve: (response: KernelResponse): void => {
                    clearTimeout(timeout);
                    if (response.type === 'error' || response.error) {
                        const reason = response.error || `Flow Kernel responded with error for ${id}.`;
                        reject(new Error(String(reason)));
                        return;
                    }
                    resolve(response);
                },
                reject,
                timeout
            });
            const process = this.process;
            if (!process) {
                reject(new Error('Flow Kernel transport process is not running.'));
                return;
            }
            const text = `${JSON.stringify(payload)}\n`;
            try {
                process.stdin.write(text, 'utf8');
            } catch (error) {
                clearTimeout(timeout);
                this.pending.delete(id);
                reject(new Error(error instanceof Error ? error.message : `Failed to write request ${id} to Flow Kernel stdin.`));
            }
        });
    }

    async close(): Promise<void> {
        this.closed = true;
        this.failPending(new Error('Flow Kernel transport closed.'));
        this.stopProcess();
        this.running = false;
    }

    protected async ensureRunning(): Promise<void> {
        if (this.process && this.running && !this.closed) {
            return;
        }
        if (!this.ready) {
            this.ready = (async () => {
                await this.startProcess();
            })();
            try {
                await this.ready;
            } catch (error) {
                this.ready = undefined;
                throw error;
            }
        }
        await this.ready;
    }

    protected async startProcess(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const child = spawn(this.command.executable, [...this.command.argsPrefix, 'serve', '--stdio'], {
                cwd: this.command.cwd,
                windowsHide: true
            });
            this.process = child as ChildProcessWithoutNullStreams;
            this.stderrBuffer = '';

            child.stdout.setEncoding('utf8');
            child.stderr.setEncoding('utf8');
            child.stderr.on('data', chunk => {
                this.captureStderr(String(chunk));
            });

            this.lineReader = createInterface({ input: child.stdout, crlfDelay: Infinity });
            this.lineReader.on('line', line => this.onLine(line));

            child.once('error', error => {
                this.stopProcess();
                reject(new Error(`Cannot start Flow Kernel daemon: ${error.message}`));
            });

            child.once('spawn', () => {
                this.running = true;
                child.once('close', (code, signal) => {
                    const reason = code === 0
                        ? `Flow Kernel daemon stopped.`
                        : `Flow Kernel daemon exited with code ${code || 0}${signal ? ` (${signal})` : ''}.`;
                    this.failPending(new Error(`${reason}${this.stderrBuffer ? ` ${this.stderrBuffer}` : ''}`));
                    this.ready = undefined;
                    this.stopProcess();
                });
                resolve();
            });
        });
    }

    protected captureStderr(chunk: string): void {
        this.stderrBuffer += chunk;
        if (this.stderrBuffer.length <= this.stderrBufferBytes) {
            return;
        }
        this.stderrBuffer = this.stderrBuffer.slice(this.stderrBuffer.length - this.stderrBufferBytes);
    }

    protected onLine(line: string): void {
        const raw = line.trim();
        if (!raw) {
            return;
        }
        let response: KernelResponse;
        try {
            response = JSON.parse(raw) as KernelResponse;
        } catch {
            return;
        }
        const requestId = typeof response.id === 'string' ? response.id : typeof response.requestId === 'string' ? response.requestId : undefined;
        if (!requestId) {
            return;
        }
        const waiter = this.pending.get(requestId);
        if (!waiter) {
            return;
        }
        this.pending.delete(requestId);
        waiter.resolve(response);
    }

    protected failPending(error: Error): void {
        for (const waiter of this.pending.values()) {
            clearTimeout(waiter.timeout);
            waiter.reject(error);
        }
        this.pending.clear();
    }

    protected stopProcess(): void {
        this.running = false;
        this.ready = undefined;
        this.lineReader?.close();
        this.lineReader = undefined;
        if (this.process) {
            const child = this.process;
            this.process = undefined;
            child.removeAllListeners();
            child.kill();
        }
    }
}

class PersistentHttpTransport implements KernelTransport {
    constructor(protected readonly endpoint: string) { }

    async start(): Promise<void> {
        await this.healthCheck();
    }

    async healthCheck(): Promise<void> {
        const response = await this.request({ type: 'status', id: `status-${generateUuid()}` } as KernelMessage);
        ensureResponseType(response, 'status.ok');
    }

    async restart(): Promise<void> {
        throw new Error('HTTP kernel transport does not manage a local process.');
    }

    async shutdown(): Promise<void> {
        return Promise.resolve();
    }

    getStderrSnapshot(): string {
        return '';
    }

    async request(message: KernelMessage): Promise<KernelResponse> {
        const payload = { ...message, id: message.id || generateUuid() };
        const response = await postKernelHttpMessage(this.endpoint, payload);
        if (!response.type) {
            throw new Error('Flow Kernel HTTP response missing response type.');
        }
        const kernelResponse = response as KernelResponse;
        if (kernelResponse.type === 'error' || kernelResponse.error) {
            const reason = kernelResponse.error || `Flow Kernel responded with error for ${kernelResponse.id || 'request'}.`;
            throw new Error(String(reason));
        }
        return kernelResponse;
    }

    async close(): Promise<void> {
        return Promise.resolve();
    }
}

class PersistentWebSocketTransport implements KernelTransport {
    protected socket?: RuntimeWebSocket;
    protected opening?: Promise<void>;
    protected closed = false;
    protected readonly pending = new Map<string, PendingKernelResponse>();
    protected readonly pushListeners = new Set<(message: KernelMessage) => void>();
    protected readonly disconnectListeners = new Set<(error: Error) => void>();

    constructor(protected readonly endpoint: string) { }

    async start(): Promise<void> {
        await this.ensureOpen();
    }

    async healthCheck(): Promise<void> {
        const response = await this.request({ type: 'status', id: `status-${generateUuid()}` } as KernelMessage);
        ensureResponseType(response, 'status.ok');
    }

    async restart(): Promise<void> {
        throw new Error('WebSocket kernel transport does not manage a local process.');
    }

    async shutdown(): Promise<void> {
        await this.close();
    }

    getStderrSnapshot(): string {
        return '';
    }

    async request(message: KernelMessage): Promise<KernelResponse> {
        await this.ensureOpen();
        const socket = this.socket;
        if (!socket || socket.readyState !== 1) {
            throw new Error('Flow Kernel WebSocket is not open.');
        }
        const payload = { ...message, id: message.id || generateUuid() } as KernelMessage;
        const id = String(payload.id);
        return new Promise<KernelResponse>((resolve, reject) => {
            const timeoutMs = defaultRequestTimeoutMs();
            const timeout = setTimeout(() => {
                this.pending.delete(id);
                reject(new Error(`Flow Kernel WebSocket request timed out after ${timeoutMs}ms (id=${id}).`));
            }, timeoutMs);
            this.pending.set(id, {
                resolve: (response: KernelResponse): void => {
                    clearTimeout(timeout);
                    if (response.type === 'error' || response.error) {
                        const reason = response.error || `Flow Kernel responded with error for ${id}.`;
                        reject(new Error(String(reason)));
                        return;
                    }
                    resolve(response);
                },
                reject,
                timeout
            });
            try {
                socket.send(JSON.stringify(payload));
            } catch (error) {
                clearTimeout(timeout);
                this.pending.delete(id);
                reject(new Error(error instanceof Error ? error.message : `Failed to write request ${id} to Flow Kernel WebSocket.`));
            }
        });
    }

    async close(): Promise<void> {
        this.closed = true;
        this.failPending(new Error('Flow Kernel WebSocket transport closed.'));
        this.pushListeners.clear();
        this.disconnectListeners.clear();
        const socket = this.socket;
        this.socket = undefined;
        this.opening = undefined;
        if (socket && (socket.readyState === 0 || socket.readyState === 1)) {
            socket.close(1000, 'Flow transport closed.');
        }
    }

    protected async ensureOpen(): Promise<void> {
        if (this.socket?.readyState === 1) {
            return;
        }
        if (this.closed) {
            throw new Error('Flow Kernel WebSocket transport is closed.');
        }
        if (!this.opening) {
            this.opening = this.openSocket();
        }
        try {
            await this.opening;
        } catch (error) {
            this.opening = undefined;
            throw error;
        }
    }

    protected async openSocket(): Promise<void> {
        const WebSocketCtor = resolveRuntimeWebSocket();
        const socket = new WebSocketCtor(this.endpoint);
        socket.binaryType = 'arraybuffer';
        this.socket = socket;
        return new Promise<void>((resolve, reject) => {
            const timeoutMs = defaultRequestTimeoutMs();
            const timeout = setTimeout(() => {
                reject(new Error(`Flow Kernel WebSocket did not open within ${timeoutMs}ms.`));
                socket.close();
            }, timeoutMs);
            socket.onopen = () => {
                clearTimeout(timeout);
                resolve();
            };
            socket.onerror = event => {
                clearTimeout(timeout);
                reject(new Error(`Flow Kernel WebSocket connection failed: ${formatWebSocketEvent(event)}`));
            };
            socket.onmessage = event => this.onMessage(event.data);
            socket.onclose = event => {
                clearTimeout(timeout);
                if (this.socket === socket) {
                    this.socket = undefined;
                }
                this.opening = undefined;
                const error = new Error(`Flow Kernel WebSocket closed: ${formatWebSocketEvent(event)}`);
                this.failPending(error);
                if (!this.closed) {
                    this.emitDisconnect(error);
                }
            };
        });
    }

    protected onMessage(data: unknown): void {
        const raw = typeof data === 'string'
            ? data
            : Buffer.isBuffer(data)
                ? data.toString('utf8')
                : data instanceof ArrayBuffer
                    ? Buffer.from(data).toString('utf8')
                    : '';
        if (!raw) {
            return;
        }
        let response: KernelResponse;
        try {
            response = JSON.parse(raw) as KernelResponse;
        } catch {
            return;
        }
        const requestId = typeof response.id === 'string' ? response.id : typeof response.requestId === 'string' ? response.requestId : undefined;
        if (!requestId) {
            this.emitPushMessage(response);
            return;
        }
        const waiter = this.pending.get(requestId);
        if (!waiter) {
            this.emitPushMessage(response);
            return;
        }
        this.pending.delete(requestId);
        waiter.resolve(response);
    }

    onPushMessage(listener: (message: KernelMessage) => void): () => void {
        this.pushListeners.add(listener);
        return () => this.pushListeners.delete(listener);
    }

    onDisconnect(listener: (error: Error) => void): () => void {
        this.disconnectListeners.add(listener);
        return () => this.disconnectListeners.delete(listener);
    }

    protected emitPushMessage(message: KernelMessage): void {
        for (const listener of [...this.pushListeners]) {
            listener(message);
        }
    }

    protected emitDisconnect(error: Error): void {
        for (const listener of [...this.disconnectListeners]) {
            listener(error);
        }
    }

    protected failPending(error: Error): void {
        for (const waiter of this.pending.values()) {
            clearTimeout(waiter.timeout);
            waiter.reject(error);
        }
        this.pending.clear();
    }
}

class FlowKernelTransport {
    protected init?: Promise<KernelTransport>;
    protected transport?: KernelTransport;
    protected reconnecting?: Promise<void>;
    protected readonly pushListeners = new Set<(message: KernelMessage) => void>();
    protected readonly transportDisposers: Array<() => void> = [];

    available(): boolean {
        return Boolean(resolveKernelHttpEndpoint() || resolveKernelCommand());
    }

    supportsPushMessages(): boolean {
        const endpoint = resolveKernelHttpEndpoint();
        return Boolean(endpoint && isKernelWebSocketEndpoint(endpoint));
    }

    async start(): Promise<void> {
        const transport = await this.resolveTransport();
        if (transport.start) {
            await transport.start();
            return;
        }
        const response = await transport.request({ type: 'status', id: `status-${generateUuid()}` } as KernelMessage);
        ensureResponseType(response, 'status.ok');
    }

    async healthCheck(): Promise<void> {
        const transport = await this.resolveTransport();
        if (transport.healthCheck) {
            await transport.healthCheck();
            return;
        }
        const response = await transport.request({ type: 'status', id: `status-${generateUuid()}` } as KernelMessage);
        ensureResponseType(response, 'status.ok');
    }

    async restart(reason = 'Kernel restart requested from host.'): Promise<void> {
        const transport = await this.resolveTransport();
        if (transport.restart) {
            await transport.restart(reason);
            return;
        }
        throw new Error('Flow Kernel transport does not support controlled restart in this mode.');
    }

    async shutdown(): Promise<void> {
        if (!this.transport) {
            return;
        }
        if (this.transport.shutdown) {
            await this.transport.shutdown();
        } else {
            await Promise.resolve(this.transport.close()).catch(() => {
                // ignore transport shutdown failure while recovering.
            });
        }
        this.transport = undefined;
        this.init = undefined;
        this.disposeTransportListeners();
    }

    getStderrSnapshot(maxBytes = 65536): string {
        if (!this.transport || !this.transport.getStderrSnapshot) {
            return '';
        }
        return this.transport.getStderrSnapshot(maxBytes);
    }

    async onPushMessage(listener: (message: KernelMessage) => void): Promise<() => void> {
        this.pushListeners.add(listener);
        const transport = await this.resolveTransport();
        this.attachTransportListeners(transport);
        return () => this.pushListeners.delete(listener);
    }

    async request(message: KernelMessage): Promise<KernelResponse> {
        const transport = await this.resolveTransport();
        try {
            return await transport.request(message);
        } catch (error) {
            if (this.transport) {
                this.transport = undefined;
            }
            this.init = undefined;
            this.disposeTransportListeners();
            await Promise.resolve(transport.close()).catch(() => {
                // ignore close failures while recovering transport.
            });
            throw error;
        }
    }

    protected async resolveTransport(): Promise<KernelTransport> {
        if (this.transport) {
            return this.transport;
        }
        if (!this.init) {
            this.init = this.createTransport();
        }
        try {
            this.transport = await this.init;
            this.attachTransportListeners(this.transport);
            return this.transport;
        } catch (error) {
            this.init = undefined;
            throw error;
        }
    }

    protected async createTransport(): Promise<KernelTransport> {
        const httpEndpoint = resolveKernelHttpEndpoint();
        if (httpEndpoint) {
            const transport = isKernelWebSocketEndpoint(httpEndpoint)
                ? new PersistentWebSocketTransport(httpEndpoint)
                : new PersistentHttpTransport(httpEndpoint);
            await this.handshake(transport);
            return transport;
        }

        const command = resolveKernelCommand();
        if (!command) {
            throw new Error('Flow Kernel daemon configuration was not found.');
        }
        const transport = new PersistentStdioTransport(command);
        await this.handshake(transport);
        return transport;
    }

    protected async handshake(transport: KernelTransport): Promise<void> {
        const handshake = await transport.request({ type: 'handshake', id: `hs-${generateUuid()}` } as KernelMessage);
        ensureResponseType(handshake, 'handshake.ok');
        if (handshake.protocol !== AGENCY_KERNEL_PROTOCOL_VERSION) {
            throw new Error(`Unsupported Flow Kernel protocol "${String(handshake.protocol)}"; expected "${AGENCY_KERNEL_PROTOCOL_VERSION}".`);
        }
        if (handshake.version !== AGENCY_KERNEL_WORKFLOW_VERSION) {
            throw new Error(`Unsupported Flow Kernel workflow version "${String(handshake.version)}"; expected "${AGENCY_KERNEL_WORKFLOW_VERSION}".`);
        }
        await this.handshakeStatus(transport);
    }

    protected async handshakeStatus(transport: KernelTransport): Promise<void> {
        if (transport.healthCheck) {
            await transport.healthCheck();
            return;
        }
        const response = await transport.request({ type: 'status', id: `st-${generateUuid()}` } as KernelMessage);
        ensureResponseType(response, 'status.ok');
    }

    protected attachTransportListeners(transport: KernelTransport): void {
        this.disposeTransportListeners();
        if (transport.onPushMessage) {
            this.transportDisposers.push(transport.onPushMessage(message => this.emitPushMessage(message)));
        }
        if (transport.onDisconnect) {
            this.transportDisposers.push(transport.onDisconnect(() => {
                void this.reconnectAfterDisconnect(transport);
            }));
        }
    }

    protected disposeTransportListeners(): void {
        for (const dispose of this.transportDisposers.splice(0)) {
            dispose();
        }
    }

    protected emitPushMessage(message: KernelMessage): void {
        for (const listener of [...this.pushListeners]) {
            listener(message);
        }
    }

    protected async reconnectAfterDisconnect(transport: KernelTransport): Promise<void> {
        if (this.transport !== transport || this.reconnecting) {
            return;
        }
        this.transport = undefined;
        this.init = undefined;
        this.disposeTransportListeners();
        this.reconnecting = (async () => {
            try {
                await Promise.resolve(transport.close()).catch(() => undefined);
                await this.resolveTransport();
            } catch {
                this.init = undefined;
            } finally {
                this.reconnecting = undefined;
            }
        })();
        await this.reconnecting;
    }
}

@injectable()
export class HybridFlowKernelBridge implements FlowKernelBridge {

    protected readonly external: FlowKernelBridge;
    protected readonly simulated: SimulatedFlowKernelBridge;

    constructor(
        @inject(FlowWorkloadExecutor) @optional()
        workloadExecutor: FlowWorkloadExecutor = new ProviderBackedFlowWorkloadExecutor(),
        @inject(CommandEffectHostAdapter) @optional()
        commandEffectHostAdapter: CommandEffectHostAdapter = new LocalCommandEffectHostAdapter(),
        @inject(MemoryAdapter) @optional()
        memoryAdapter?: MemoryAdapter
    ) {
        this.external = new ExternalFlowKernelBridge(workloadExecutor, memoryAdapter, commandEffectHostAdapter);
        this.simulated = new SimulatedFlowKernelBridge(workloadExecutor);
    }

    protected async shouldUseExternalKernel(): Promise<boolean> {
        const preference = resolveKernelBridgePreference();
        if (preference === 'simulated') {
            return false;
        }
        if (!this.external.available?.()) {
            return false;
        }
        if (preference === 'external') {
            return true;
        }
        return (await this.external.getBridgeMode()) === 'external';
    }

    async getBridgeMode(): Promise<FlowKernelBridgeMode> {
        if (!this.external.available?.()) {
            return 'simulated';
        }
        if (resolveKernelBridgePreference() === 'simulated') {
            return 'simulated';
        }
        try {
            return await this.external.getBridgeMode();
        } catch {
            return 'simulated';
        }
    }

    async supportsRunEventStream(): Promise<boolean> {
        if (!this.external.available?.() || resolveKernelBridgePreference() === 'simulated') {
            return false;
        }
        try {
            return await this.external.supportsRunEventStream?.() === true;
        } catch {
            return false;
        }
    }

    async startRun(workflow: FlowWorkflow, prompt: string, projectSummary: string, workspaceRootUri?: string): Promise<FlowRun> {
        if (await this.shouldUseExternalKernel()) {
            try {
                const run = await this.external.startRun(workflow, prompt, projectSummary, workspaceRootUri);
                return setExecutionMode(run, 'kernel_external', 'Execution by external kernel daemon.');
            } catch (error) {
                const fallback = await this.simulated.startRun(workflow, prompt, projectSummary, workspaceRootUri);
                pushEvent(fallback, {
                    type: 'transition.evaluated',
                    workflowId: workflow.id,
                    message: formatKernelBridgeError('startRun', error),
                    payload: { error: error instanceof Error ? error.message : String(error) }
                });
                return setExecutionMode(fallback, fallbackExecutionMode(), fallbackExecutionMessage('startRun'));
            }
        }
        const fallback = await this.simulated.startRun(workflow, prompt, projectSummary, workspaceRootUri);
        return setExecutionMode(fallback, fallbackExecutionMode(), fallbackExecutionMessage('startRun'));
    }

    async tickRun(workflow: FlowWorkflow, run: FlowRun, workspaceRootUri?: string): Promise<FlowRun> {
        const runUsesDurableKernel = shouldUseExternalKernel(run);
        if (runUsesDurableKernel) {
            if (await this.shouldUseExternalKernel()) {
                try {
                    const updated = await this.external.tickRun(workflow, run, workspaceRootUri);
                    return setExecutionMode(updated, 'kernel_external', 'Execution mode set to external kernel.');
                } catch (error) {
                    const fallback = await this.simulated.tickRun(workflow, run, workspaceRootUri);
                    pushEvent(fallback, {
                        type: 'transition.evaluated',
                        workflowId: workflow.id,
                        message: formatKernelBridgeError('tickRun', error),
                        payload: { error: error instanceof Error ? error.message : String(error) }
                    });
                    return setExecutionMode(fallback, fallbackExecutionMode(), fallbackExecutionMessage('tickRun'));
                }
            }
            const fallback = await this.simulated.tickRun(workflow, run, workspaceRootUri);
            return setExecutionMode(
                fallback,
                fallbackExecutionMode(),
                fallbackExecutionMessage('tickRun')
            );
        }
        const updated = await this.simulated.tickRun(workflow, run, workspaceRootUri);
        return ensureExecutionMode(updated, run);
    }

    async approveGate(workflow: FlowWorkflow, run: FlowRun, request: FlowGateDecisionRequest): Promise<FlowRun> {
        const runUsesDurableKernel = shouldUseExternalKernel(run);
        if (runUsesDurableKernel) {
            if (await this.shouldUseExternalKernel()) {
                try {
                    const updated = await this.external.approveGate(workflow, run, request);
                    return setExecutionMode(updated, 'kernel_external', 'Execution mode set to external kernel.');
                } catch (error) {
                    const fallback = await this.simulated.approveGate(workflow, run, request);
                    pushEvent(fallback, {
                        type: 'transition.evaluated',
                        workflowId: workflow.id,
                        message: formatKernelBridgeError('approveGate', error),
                        payload: { error: error instanceof Error ? error.message : String(error) }
                    });
                    return setExecutionMode(fallback, fallbackExecutionMode(), fallbackExecutionMessage('approveGate'));
                }
            }
            const fallback = await this.simulated.approveGate(workflow, run, request);
            return setExecutionMode(
                fallback,
                fallbackExecutionMode(),
                fallbackExecutionMessage('approveGate')
            );
        }
        const updated = await this.simulated.approveGate(workflow, run, request);
        return ensureExecutionMode(updated, run);
    }

    async refreshRun(workflow: FlowWorkflow, run: FlowRun): Promise<FlowRun> {
        if (this.external.available?.() && shouldUseExternalKernel(run)) {
            const refreshed = await this.external.refreshRun(workflow, run);
            return setExecutionMode(refreshed, 'kernel_external', 'Execution mode set to external kernel.');
        }
        return this.simulated.refreshRun(workflow, run);
    }

    async subscribeRunEvents(
        workflow: FlowWorkflow,
        run: FlowRun,
        workspaceRootUri: string | undefined,
        listener: (run: FlowRun) => void,
        errorListener?: (error: Error) => void
    ): Promise<() => void> {
        if (this.external.available?.() && shouldUseExternalKernel(run) && await this.shouldUseExternalKernel() && await this.supportsRunEventStream()) {
            try {
                return await this.external.subscribeRunEvents?.(workflow, run, workspaceRootUri, async updated => {
                    listener(setExecutionMode(updated, 'kernel_external', 'Execution mode set to external kernel.'));
                }, errorListener) || (() => undefined);
            } catch (error) {
                errorListener?.(error instanceof Error ? error : new Error(String(error)));
            }
        }
        errorListener?.(new Error('Kernel event stream is unavailable; manual refresh/tick remains an explicit fallback.'));
        return () => undefined;
    }

    async pauseRun(workflow: FlowWorkflow, run: FlowRun, reason?: string): Promise<FlowRun> {
        return this.lifecycleRun('pauseRun', workflow, run, reason);
    }

    async resumeRun(workflow: FlowWorkflow, run: FlowRun, reason?: string): Promise<FlowRun> {
        return this.lifecycleRun('resumeRun', workflow, run, reason);
    }

    async cancelRun(workflow: FlowWorkflow, run: FlowRun, reason?: string): Promise<FlowRun> {
        return this.lifecycleRun('cancelRun', workflow, run, reason);
    }

    protected async lifecycleRun(operation: 'pauseRun' | 'resumeRun' | 'cancelRun', workflow: FlowWorkflow, run: FlowRun, reason?: string): Promise<FlowRun> {
        if (shouldUseExternalKernel(run) && await this.shouldUseExternalKernel()) {
            try {
                const updated = await this.external[operation](workflow, run, reason);
                return setExecutionMode(updated, 'kernel_external', 'Execution mode set to external kernel.');
            } catch (error) {
                const fallback = await this.simulated[operation](workflow, run, reason);
                pushEvent(fallback, {
                    type: 'transition.evaluated',
                    workflowId: workflow.id,
                    message: formatKernelBridgeError(operation, error),
                    payload: { error: error instanceof Error ? error.message : String(error) }
                });
                return setExecutionMode(fallback, fallbackExecutionMode(), fallbackExecutionMessage(operation));
            }
        }
        const updated = await this.simulated[operation](workflow, run, reason);
        return ensureExecutionMode(updated, run);
    }
}

export class ExternalFlowKernelBridge implements FlowKernelBridge {

    protected readonly transport = new FlowKernelTransport();

    constructor(
        protected readonly workloadExecutor: FlowWorkloadExecutor = new ProviderBackedFlowWorkloadExecutor(),
        protected readonly memoryAdapter?: MemoryAdapter,
        protected readonly commandEffectHostAdapter: CommandEffectHostAdapter = new LocalCommandEffectHostAdapter()
    ) {
    }

    available(): boolean {
        return this.transport.available();
    }

    supportsRunEventStream(): boolean {
        return this.available() && this.transport.supportsPushMessages();
    }

    async startKernelProcess(): Promise<void> {
        await this.transport.start();
    }

    async checkKernelHealth(): Promise<void> {
        await this.transport.healthCheck();
    }

    async restartKernelProcess(reason?: string): Promise<void> {
        await this.transport.restart(reason);
    }

    async shutdownKernelProcess(): Promise<void> {
        await this.transport.shutdown();
    }

    getKernelStderr(maxBytes = 65536): string {
        return this.transport.getStderrSnapshot?.(maxBytes) || '';
    }

    async getBridgeMode(): Promise<FlowKernelBridgeMode> {
        if (!this.available()) {
            return 'simulated';
        }
        try {
            await this.checkKernelHealth();
            return 'external';
        } catch {
            return 'simulated';
        }
    }

    async startRun(workflow: FlowWorkflow, prompt: string, projectSummary: string, workspaceRootUri?: string): Promise<FlowRun> {
        const validation = validateFlowWorkflow(workflow);
        if (!validation.valid) {
            throw new Error(validation.errors.map(error => error.message).join('\n'));
        }
        const limitedPrompt = truncateFlowText(prompt, FlowSizeLimits.promptBytes, 'prompt');
        const limitedProjectSummary = truncateFlowText(projectSummary, FlowSizeLimits.contextPackBytes, 'project summary');
        const kernelWorkflow = toKernelWorkflow(workflow);
        await this.validateKernelWorkflow(kernelWorkflow);
        const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'flow-kernel-run-'));
        const storeDir = path.join(workDir, 'runs');
        const response = await this.requestWithReconnect({
            type: 'start_run',
            workflow: kernelWorkflow,
            input: limitedPrompt,
            storeDir
        });
        ensureResponseType(response, 'start_run.ok');
        let kernelRun = getKernelRun(response);
        kernelRun = await this.processHostRequests(workflow, limitedPrompt, kernelRun, storeDir, workspaceRootUri, {
            storeDir,
            kernelRunId: kernelRun.id,
            projectSummary: limitedProjectSummary
        }, response.requests);
        const events = await this.getKernelEvents({ runId: kernelRun.id, storeDir });
        return mapKernelRunToFlowRun(workflow, limitedPrompt, kernelRun, events, {
            storeDir,
            kernelRunId: kernelRun.id,
            projectSummary: limitedProjectSummary
        });
    }

    protected async validateKernelWorkflow(workflow: FlowWorkflow): Promise<void> {
        const response = await this.requestWithReconnect({
            type: 'validate_workflow',
            workflow
        });
        ensureResponseType(response, 'validate_workflow.ok');
    }

    async tickRun(workflow: FlowWorkflow, run: FlowRun, workspaceRootUri?: string): Promise<FlowRun> {
        const metadata = kernelMetadata(run);
        if (!metadata) {
            throw new Error('External Flow Kernel metadata is missing.');
        }
        const response = await this.requestWithReconnect({
            type: 'tick_run',
            runId: metadata.kernelRunId,
            storeDir: metadata.storeDir
        });
        ensureResponseType(response, 'tick_run.ok');
        let kernelRun = getKernelRun(response);
        kernelRun = await this.processHostRequests(workflow, run.prompt, kernelRun, metadata.storeDir, workspaceRootUri, metadata, response.requests, run);
        const events = await this.getKernelEvents({ runId: kernelRun.id, storeDir: metadata.storeDir });
        return mapKernelRunToFlowRun(workflow, run.prompt, kernelRun, events, metadata, run);
    }

    async approveGate(workflow: FlowWorkflow, run: FlowRun, request: FlowGateDecisionRequest): Promise<FlowRun> {
        const metadata = kernelMetadata(run);
        if (!metadata) {
            throw new Error('External Flow Kernel metadata is missing.');
        }
        if (request.decision === 'revision_requested') {
            throw new Error('External Flow Kernel gates support approve/reject decisions only.');
        }
        const requestType = request.decision === 'approved' ? 'gate_approved' : 'gate_rejected';
        const response = await this.requestWithReconnect({
            type: requestType,
            runId: metadata.kernelRunId,
            gateId: request.gateId,
            storeDir: metadata.storeDir,
            note: request.note
        });
        ensureResponseType(response, `${requestType}.ok`);
        let kernelRun = getKernelRun(response);
        kernelRun = await this.processHostRequests(workflow, run.prompt, kernelRun, metadata.storeDir, undefined, metadata, response.requests, run);
        const events = await this.getKernelEvents({ runId: kernelRun.id, storeDir: metadata.storeDir });
        return mapKernelRunToFlowRun(workflow, run.prompt, kernelRun, events, metadata, run);
    }

    async pauseRun(workflow: FlowWorkflow, run: FlowRun, reason?: string): Promise<FlowRun> {
        return this.lifecycleRun('pause_run', 'pause_run.ok', workflow, run, reason);
    }

    async resumeRun(workflow: FlowWorkflow, run: FlowRun, reason?: string): Promise<FlowRun> {
        return this.lifecycleRun('resume_run', 'resume_run.ok', workflow, run, reason);
    }

    async cancelRun(workflow: FlowWorkflow, run: FlowRun, reason?: string): Promise<FlowRun> {
        return this.lifecycleRun('cancel_run', 'cancel_run.ok', workflow, run, reason);
    }

    async refreshRun(workflow: FlowWorkflow, run: FlowRun): Promise<FlowRun> {
        const metadata = kernelMetadata(run);
        if (!metadata) {
            throw new Error('External Flow Kernel metadata is missing.');
        }
        const kernelRun = await this.getKernelRun(metadata);
        const events = await this.getKernelEvents({ runId: kernelRun.id, storeDir: metadata.storeDir });
        return mapKernelRunToFlowRun(workflow, run.prompt, kernelRun, events, metadata, run);
    }

    async subscribeRunEvents(
        workflow: FlowWorkflow,
        run: FlowRun,
        workspaceRootUri: string | undefined,
        listener: (run: FlowRun) => void,
        errorListener?: (error: Error) => void
    ): Promise<() => void> {
        const metadata = kernelMetadata(run);
        if (!metadata) {
            throw new Error('External Flow Kernel metadata is missing.');
        }
        let latestRun = run;
        let active = true;
        const dispose = await this.transport.onPushMessage(async message => {
            if (!active) {
                return;
            }
            const pushedEvents = normalizePushedKernelEvents(message).filter(event => event.runId === metadata.kernelRunId);
            if (pushedEvents.length === 0) {
                return;
            }
            try {
                const kernelRun = await this.getKernelRun(metadata);
                const events = dedupeKernelEvents([
                    ...await this.getKernelEvents({ runId: metadata.kernelRunId, storeDir: metadata.storeDir }),
                    ...pushedEvents
                ]);
                latestRun = mapKernelRunToFlowRun(workflow, latestRun.prompt, kernelRun, events, metadata, latestRun);
                listener(latestRun);
            } catch (error) {
                errorListener?.(error instanceof Error ? error : new Error(String(error)));
            }
        });
        return () => {
            active = false;
            dispose();
        };
    }

    protected async processHostRequests(
        workflow: FlowWorkflow,
        prompt: string,
        kernelRun: KernelRunState,
        storeDir: string,
        workspaceRootUri: string | undefined,
        metadata: KernelBridgeMetadata,
        rawRequests: unknown,
        previousRun?: FlowRun
    ): Promise<KernelRunState> {
        let currentRun = kernelRun;
        let requests = normalizeKernelRequests(rawRequests, storeDir);
        const handled = new Set<string>();
        for (let round = 0; round < 25; round += 1) {
            const hostRequests = requests.filter(request => !handled.has(requestKey(request)));
            if (hostRequests.length === 0) {
                return currentRun;
            }
            requests = [];
            hostRequests.forEach(request => handled.add(requestKey(request)));
            const workloadRequests = hostRequests.filter(isKernelWorkloadRequest);
            for (const request of workloadRequests) {
                await this.requestWithReconnect({
                    type: 'workload_started',
                    runId: request.runId,
                    storeDir: request.storeDir,
                    workloadId: request.workloadId
                });
            }
            if (workloadRequests.length > 0) {
                const events = await this.getKernelEvents({ runId: currentRun.id, storeDir });
                const flowRun = mapKernelRunToFlowRun(workflow, prompt, currentRun, events, metadata, previousRun);
                const results = await Promise.all(workloadRequests.map(request =>
                    this.executeHostWorkload(workflow, flowRun, request, workspaceRootUri)
                ));
                for (const result of results) {
                    currentRun = await this.commitHostWorkloadResult(storeDir, currentRun.id, result);
                    requests = requests.concat(normalizeKernelRequests(currentRun.requests, storeDir));
                }
            }
            for (const request of hostRequests) {
                if (!isKernelWorkloadRequest(request)) {
                    currentRun = await this.processNonWorkloadHostRequest(currentRun, request);
                    requests = requests.concat(normalizeKernelRequests(currentRun.requests, storeDir));
                }
            }
        }
        throw new Error('External Flow Kernel host request processing exceeded the safety limit.');
    }

    protected async processNonWorkloadHostRequest(
        currentRun: KernelRunState,
        request: VersionedKernelHostRequest
    ): Promise<KernelRunState> {
        switch (request.type) {
            case 'request_human_gate':
                return currentRun;
            case 'request_artifact_open':
                return this.recordArtifactOpenAvailability(currentRun, request);
            default:
                throw new Error(`External Flow Kernel emitted unsupported host request type "${request.type}".`);
        }
    }

    protected async recordArtifactOpenAvailability(
        currentRun: KernelRunState,
        request: VersionedKernelHostRequest
    ): Promise<KernelRunState> {
        const artifactId = request.artifactId || request.id;
        const target = request.path || artifactId;
        const response = await this.requestWithReconnect({
            type: 'signal_recorded',
            runId: request.runId,
            storeDir: request.storeDir,
            stateId: request.stateId,
            workloadId: request.workloadId,
            key: `artifact.${artifactId}.open.available`,
            value: {
                artifactId,
                target,
                available: Boolean(target),
                autoOpen: false,
                requiresUserAction: true,
                disposition: 'available_for_user_requested_open'
            }
        });
        ensureResponseType(response, 'signal_recorded.ok');
        return getKernelRun(response);
    }

    protected async executeHostWorkload(
        workflow: FlowWorkflow,
        run: FlowRun,
        request: VersionedKernelHostRequest,
        workspaceRootUri?: string
    ): Promise<HostWorkloadResult> {
        if (request.type === 'request_context_pack') {
            return this.executeContextPackRequest(workflow, run, request, workspaceRootUri);
        }
        if (request.type === 'request_memory_write') {
            return this.proposeMemoryWriteRequest(run, request);
        }
        if (request.type === 'request_command_execution') {
            return this.executeCommandExecutionRequest(workflow, run, request, workspaceRootUri);
        }
        const workload = run.workloads.find(candidate => candidate.id === request.workloadId);
        if (!workload) {
            throw new Error(`Kernel requested unknown workload "${request.workloadId}".`);
        }
        const state = getState(workflow, workload.stateId);
        const isolatedRun = cloneFlowRun(run);
        const isolatedWorkload = isolatedRun.workloads.find(candidate => candidate.id === workload.id);
        if (!isolatedWorkload) {
            throw new Error(`Kernel workload "${workload.id}" was not available in isolated execution context.`);
        }
        await this.workloadExecutor.execute({
            workflow,
            run: isolatedRun,
            state,
            workload: isolatedWorkload,
            workspaceRootUri
        });
        return diffHostWorkloadResult(run, isolatedRun, isolatedWorkload);
    }

    protected async executeContextPackRequest(
        workflow: FlowWorkflow,
        run: FlowRun,
        request: VersionedKernelHostRequest,
        workspaceRootUri?: string
    ): Promise<HostWorkloadResult> {
        if (!this.memoryAdapter) {
            return {
                workloadId: request.workloadId,
                stateId: request.stateId,
                artifacts: [],
                effects: [],
                signals: [],
                issues: [],
                failed: true,
                error: 'Memory adapter is not available for request_context_pack.'
            };
        }
        const workload = run.workloads.find(candidate => candidate.id === request.workloadId);
        const pack = await this.memoryAdapter.buildContextPack(workspaceRootUri, workflow, workload);
        const artifact = await this.writeContextPackArtifact(request, pack);
        return {
            workloadId: request.workloadId,
            stateId: request.stateId,
            agent: workload?.agent,
            artifacts: [artifact],
            effects: [],
            signals: [{
                runId: request.runId,
                stateId: request.stateId,
                key: 'memory.context_pack.built',
                value: true,
                createdAt: timestamp()
            }],
            issues: [],
            failed: false
        };
    }

    protected proposeMemoryWriteRequest(run: FlowRun, request: VersionedKernelHostRequest): HostWorkloadResult {
        const workload = run.workloads.find(candidate => candidate.id === request.workloadId);
        const summary = `Memory write requested by workflow state "${request.stateId}". Review and approve the generated memory candidate before persistence.`;
        return {
            workloadId: request.workloadId,
            stateId: request.stateId,
            agent: workload?.agent,
            artifacts: [],
            effects: [{
                id: stableId('memory-write-effect', request.runId, request.workloadId, request.id),
                runId: request.runId,
                stateId: request.stateId,
                kind: 'memory_write',
                type: 'memory.write',
                status: 'proposed',
                approvalPolicy: 'human_gate_required',
                summary
            }],
            signals: [{
                runId: request.runId,
                stateId: request.stateId,
                key: 'memory_write.candidate_proposed',
                value: request.id,
                createdAt: timestamp()
            }],
            issues: [],
            failed: false
        };
    }

    protected async executeCommandExecutionRequest(
        workflow: FlowWorkflow,
        run: FlowRun,
        request: VersionedKernelHostRequest,
        workspaceRootUri?: string
    ): Promise<HostWorkloadResult> {
        const workload = run.workloads.find(candidate => candidate.id === request.workloadId);
        const state = getState(workflow, request.stateId || workload?.stateId || '');
        const command = toTrimmedString(state.command);
        if (!command) {
            return {
                workloadId: request.workloadId,
                stateId: request.stateId,
                agent: workload?.agent,
                artifacts: [],
                effects: [],
                signals: [],
                issues: [{ severity: 'blocking', type: 'command_policy', summary: `Command request "${request.id}" has no command configured.` }],
                failed: true,
                error: `Command request "${request.id}" has no command configured.`
            };
        }
        const result = await this.commandEffectHostAdapter.apply(workspaceRootUri, {
            command,
            cwd: toTrimmedString(state.cwd),
            env: parseRecordEnv(state.env),
            allowedEnv: parseStringArray(state.allowedEnv),
            allowedCommands: parseStringArray(state.allowedCommands),
            timeoutMs: parseOptionalNumber(state.timeoutMs),
            approvalPolicy: toTrimmedString(state.approvalPolicy)
        });
        const failed = result.status === 'failed' || result.status === 'blocked';
        const effect: FlowRun['effects'][number] = {
            id: stableId('command-effect', request.runId, request.workloadId, request.id),
            runId: request.runId,
            stateId: request.stateId,
            kind: 'command',
            type: 'command.executed',
            command,
            cwd: result.relativeCwd,
            env: result.env,
            timeoutMs: result.timeoutMs,
            exitCode: result.exitCode,
            stdout: truncateFlowText(result.stdout || '', FlowSizeLimits.commandOutputBytes, 'command stdout'),
            stderr: truncateFlowText(result.stderr || '', FlowSizeLimits.commandOutputBytes, 'command stderr'),
            timedOut: result.timedOut,
            approvalPolicy: result.approvalPolicy,
            status: result.status,
            summary: `Command "${result.executable}" ${result.status} for ${request.stateId}.`
        };
        return {
            workloadId: request.workloadId,
            stateId: request.stateId,
            agent: workload?.agent,
            artifacts: [],
            effects: [effect],
            signals: [{
                runId: request.runId,
                stateId: request.stateId,
                key: 'command_execution.status',
                value: result.status,
                createdAt: timestamp()
            }],
            issues: failed ? [{ severity: 'blocking', type: 'command_execution', summary: effect.summary }] : [],
            failed,
            error: failed ? (result.stderr || effect.summary) : undefined
        };
    }

    protected async writeContextPackArtifact(request: VersionedKernelHostRequest, pack: FlowContextPack): Promise<FlowRun['artifacts'][number]> {
        const artifactId = stableId('context-pack', request.runId, request.workloadId);
        const artifactPath = path.join(request.storeDir, 'host-artifacts', request.runId, `${artifactId}.json`);
        await fs.mkdir(path.dirname(artifactPath), { recursive: true });
        await fs.writeFile(artifactPath, JSON.stringify(limitFlowJsonValue(pack, FlowSizeLimits.contextPackBytes, 'context pack'), undefined, 2), 'utf8');
        return {
            id: artifactId,
            runId: request.runId,
            stateId: request.stateId,
            uri: artifactPath,
            kind: 'other',
            summary: pack.summary,
            createdAt: timestamp()
        };
    }

    protected async commitHostWorkloadResult(storeDir: string, runId: string, result: HostWorkloadResult): Promise<KernelRunState> {
        for (const artifact of result.artifacts) {
            await this.requestWithReconnect({
                type: 'artifact_created',
                runId,
                storeDir,
                artifactId: artifact.id,
                artifactType: artifact.kind,
                path: artifact.uri,
                stateId: artifact.stateId,
                workloadId: result.workloadId,
                producer: result.agent
            });
        }
        for (const effect of result.effects) {
            await this.requestWithReconnect({
                type: 'effect_recorded',
                runId,
                storeDir,
                stateId: effect.stateId,
                workloadId: result.workloadId,
                effectType: effect.type || effect.kind,
                effect,
                path: effect.path,
                command: effect.command,
                hashBefore: effect.hashBefore,
                hashAfter: effect.hashAfter,
                patch: effect.patch,
                summary: effect.summary,
                status: effect.status,
                approvalPolicy: effect.approvalPolicy
            });
        }
        for (const signal of result.signals) {
            await this.requestWithReconnect({
                type: 'signal_recorded',
                runId,
                storeDir,
                stateId: signal.stateId,
                workloadId: result.workloadId,
                key: signal.key,
                value: signal.value
            });
        }
        for (const issue of result.issues) {
            await this.requestWithReconnect({
                type: 'issue_recorded',
                runId,
                storeDir,
                stateId: result.stateId,
                workloadId: result.workloadId,
                issue
            });
        }
        const response = await this.requestWithReconnect({
            type: result.failed ? 'workload_failed' : 'workload_completed',
            runId,
            storeDir,
            workloadId: result.workloadId,
            error: result.error
        });
        ensureResponseType(response, result.failed ? 'workload_failed.ok' : 'workload_completed.ok');
        return getKernelRun(response);
    }

    protected async getKernelEvents(request: { runId: string; storeDir: string }): Promise<KernelEvent[]> {
        const response = await this.requestWithReconnect({
            type: 'list_events',
            runId: request.runId,
            storeDir: request.storeDir
        });
        ensureResponseType(response, 'list_events.ok');
        const events = response.events;
        if (!Array.isArray(events)) {
            throw new Error('Kernel event list response is invalid.');
        }
        return dedupeKernelEvents(events as KernelEvent[]);
    }

    protected async lifecycleRun(type: string, responseType: string, workflow: FlowWorkflow, run: FlowRun, reason?: string): Promise<FlowRun> {
        const metadata = kernelMetadata(run);
        if (!metadata) {
            throw new Error('External Flow Kernel metadata is missing.');
        }
        const response = await this.requestWithReconnect({
            type,
            runId: metadata.kernelRunId,
            storeDir: metadata.storeDir,
            reason
        });
        ensureResponseType(response, responseType);
        const kernelRun = getKernelRun(response);
        const events = await this.getKernelEvents({ runId: kernelRun.id, storeDir: metadata.storeDir });
        return mapKernelRunToFlowRun(workflow, run.prompt, kernelRun, events, metadata, run);
    }

    protected async getKernelRun(metadata: KernelBridgeMetadata): Promise<KernelRunState> {
        const response = await this.requestWithReconnect({
            type: 'get_run',
            runId: metadata.kernelRunId,
            storeDir: metadata.storeDir
        });
        ensureResponseType(response, 'get_run.ok');
        return getKernelRun(response);
    }

    protected async requestWithReconnect(message: KernelMessage): Promise<KernelResponse> {
        let lastError: Error | undefined;
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                return await this.transport.request(message);
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                if (!this.transport.restart || attempt >= 1) {
                    break;
                }
                await this.transport.restart(`Kernel transport reconnection after ${message.type} failure.`);
            }
        }
        throw lastError || new Error('Kernel request failed after reconnect attempt.');
    }
}

@injectable()
export class SimulatedFlowKernelBridge implements FlowKernelBridge {
    constructor(
        @inject(FlowWorkloadExecutor)
        protected readonly workloadExecutor: FlowWorkloadExecutor = new ProviderBackedFlowWorkloadExecutor()
    ) {
    }

    async getBridgeMode(): Promise<FlowKernelBridgeMode> {
        return 'simulated';
    }

    supportsRunEventStream(): boolean {
        return false;
    }

    async refreshRun(workflow: FlowWorkflow, run: FlowRun): Promise<FlowRun> {
        return preserveFlowRunContext(run, run);
    }

    async startRun(workflow: FlowWorkflow, prompt: string, projectSummary: string, workspaceRootUri?: string): Promise<FlowRun> {
        const validation = validateFlowWorkflow(workflow);
        if (!validation.valid) {
            throw new Error(validation.errors.map(error => error.message).join('\n'));
        }

        const now = timestamp();
        const runId = generateUuid();
        const startStateId = findStartStateId(workflow);
        const stateStatuses = buildInitialStateStatuses(workflow);
        stateStatuses[startStateId] = 'running';

        const run: FlowRun = {
            id: runId,
            workflowId: workflow.id,
            prompt: truncateFlowText(prompt, FlowSizeLimits.promptBytes, 'prompt'),
            status: 'running',
            createdAt: now,
            updatedAt: now,
            currentStateIds: [startStateId],
            stateStatuses,
            workloads: [],
            events: [],
            artifacts: [],
            effects: [],
            signals: [],
            gates: [],
            tick: 0
        };
        run.executionMode = 'kernel_simulated';
        run.executionModeMessage = 'Kernel simulator started.';

        pushEvent(run, {
            type: 'run.started',
            workflowId: workflow.id,
            message: `Run started for "${workflow.name}".`,
            payload: {
                prompt: truncateFlowText(prompt, FlowSizeLimits.promptBytes, 'prompt'),
                projectSummary: truncateFlowText(projectSummary, FlowSizeLimits.contextPackBytes, 'project summary')
            }
        });
        enterState(workflow, run, startStateId);
        return run;
    }

    async tickRun(workflow: FlowWorkflow, run: FlowRun, workspaceRootUri?: string): Promise<FlowRun> {
        if (run.status === 'completed' || run.status === 'failed' || run.status === 'cancelled') {
            return run;
        }
        if (run.status === 'paused') {
            pushEvent(run, {
                type: 'transition.evaluated',
                message: 'Run is paused.',
                payload: { reason: 'manual_pause' }
            });
            return touch(run);
        }
        if (run.status === 'waiting_gate') {
            pushEvent(run, {
                type: 'transition.evaluated',
                message: 'Run is waiting for a human gate decision.',
                payload: { pendingGates: run.gates.filter(gate => gate.status === 'pending').map(gate => gate.id) }
            });
            return touch(run);
        }

        run.tick += 1;
        const activeStateIds = [...run.currentStateIds];
        const activeStateId = activeStateIds[0];
        if (!activeStateId) {
            completeRun(run);
            return run;
        }

        const activeWorkloads = run.workloads.filter(workload => activeStateIds.includes(workload.stateId) && (workload.status === 'running' || workload.status === 'ready'));
        if (activeWorkloads.length > 0) {
            await Promise.all(activeWorkloads.map(async activeWorkload => {
                const state = getState(workflow, activeWorkload.stateId);
                const context: FlowWorkloadExecutionContext = {
                    workflow,
                    run,
                    state,
                    workload: activeWorkload
                };
                if (workspaceRootUri) {
                    context.workspaceRootUri = workspaceRootUri;
                }
                await this.workloadExecutor.execute(context);
            }));
            const failedWorkload = activeWorkloads.find(workload => workload.status === 'failed');
            if (failedWorkload && !hasMatchingTransition(workflow, run, failedWorkload.stateId)) {
                run.status = 'failed';
                run.stateStatuses[failedWorkload.stateId] = 'failed';
                return touch(run);
            }
            const activeParent = findActiveParallelParent(workflow, activeStateIds);
            if (activeParent && activeWorkloads.every(workload => workload.status === 'done')) {
                run.stateStatuses[activeParent] = 'done';
                pushEvent(run, {
                    type: 'state.completed',
                    stateId: activeParent,
                    message: `Parallel state "${activeParent}" completed.`
                });
                advanceFromState(workflow, run, activeParent);
                return touch(run);
            }
        } else {
            const activeWorkload = run.workloads.find(workload => workload.stateId === activeStateId && (workload.status === 'running' || workload.status === 'ready'));
            if (activeWorkload) {
                const state = getState(workflow, activeWorkload.stateId);
            const context: FlowWorkloadExecutionContext = {
                workflow,
                run,
                state,
                workload: activeWorkload
            };
            if (workspaceRootUri) {
                context.workspaceRootUri = workspaceRootUri;
            }
            await this.workloadExecutor.execute(context);
            if (activeWorkload.status === 'failed') {
                run.status = 'failed';
                run.stateStatuses[activeWorkload.stateId] = 'failed';
                return touch(run);
            }
            }
        }
        if (requiresGate(workflow, activeStateId)) {
            createGate(workflow, run, activeStateId);
            return touch(run);
        }

        advanceFromState(workflow, run, activeStateId);
        return touch(run);
    }

    async approveGate(workflow: FlowWorkflow, run: FlowRun, request: FlowGateDecisionRequest): Promise<FlowRun> {
        const gate = run.gates.find(candidate => candidate.id === request.gateId);
        if (!gate) {
            throw new Error(`Unknown gate "${request.gateId}".`);
        }
        gate.status = request.decision;
        const eventType = request.decision === 'approved' ? 'gate.approved' : request.decision === 'rejected' ? 'gate.rejected' : 'gate.revision_requested';
        pushEvent(run, {
            type: eventType,
            gateId: gate.id,
            stateId: gate.stateId,
            message: `Gate "${gate.title}" ${request.decision}.`,
            payload: { note: request.note }
        });

        const gateStateId = gate.stateId;
        if (request.decision === 'approved' && gateStateId) {
            run.status = 'running';
            run.stateStatuses[gateStateId] = 'done';
            run.signals.push({
                key: gateStateId === 'contract_gate' ? 'contract.status' : `${gateStateId}.status`,
                value: 'approved',
                stateId: gateStateId,
                runId: run.id,
                createdAt: timestamp()
            });
            advanceFromState(workflow, run, gateStateId);
        } else {
            run.status = request.decision === 'rejected' ? 'failed' : 'waiting_gate';
            if (gateStateId) {
                run.stateStatuses[gateStateId] = request.decision === 'rejected' ? 'failed' : 'review';
            }
        }
        return touch(run);
    }

    async pauseRun(_workflow: FlowWorkflow, run: FlowRun, reason?: string): Promise<FlowRun> {
        if (run.status === 'completed' || run.status === 'failed' || run.status === 'cancelled' || run.status === 'paused') {
            return run;
        }
        run.status = 'paused';
        pushEvent(run, {
            type: 'run.paused',
            message: reason || 'Run paused.',
            payload: { reason }
        });
        return touch(run);
    }

    async resumeRun(_workflow: FlowWorkflow, run: FlowRun, reason?: string): Promise<FlowRun> {
        if (run.status !== 'paused') {
            return run;
        }
        run.status = run.gates.some(gate => gate.status === 'pending') ? 'waiting_gate' : 'running';
        pushEvent(run, {
            type: 'run.resumed',
            message: reason || 'Run resumed.',
            payload: { reason }
        });
        return touch(run);
    }

    async cancelRun(_workflow: FlowWorkflow, run: FlowRun, reason?: string): Promise<FlowRun> {
        if (run.status === 'completed' || run.status === 'failed' || run.status === 'cancelled') {
            return run;
        }
        run.status = 'cancelled';
        pushEvent(run, {
            type: 'run.cancelled',
            message: reason || 'Run cancelled.',
            payload: { reason }
        });
        return touch(run);
    }
}

function enterState(workflow: FlowWorkflow, run: FlowRun, stateId: string): void {
    const state = getState(workflow, stateId);
    if (state.type === 'parallel' && state.branches) {
        run.currentStateIds = Object.keys(state.branches);
    } else {
        run.currentStateIds = [stateId];
    }
    run.stateStatuses[stateId] = state.type === 'gate' ? 'review' : 'running';
    pushEvent(run, {
        type: 'state.entered',
        stateId,
        message: `Entered state "${stateId}".`
    });

    if (state.type === 'gate') {
        createGate(workflow, run, stateId);
        return;
    }

    if (state.type === 'parallel' && state.branches) {
        for (const [branchId, branch] of Object.entries(state.branches)) {
            run.stateStatuses[branchId] = 'running';
            const workload = createWorkload(run, branchId, { ...branch, id: branchId });
            run.workloads.push(workload);
            pushEvent(run, {
                type: 'workload.created',
                stateId: branchId,
                workloadId: workload.id,
                message: `Workload "${workload.id}" created for branch "${branchId}".`
            });
            workload.status = 'running';
            pushEvent(run, {
                type: 'workload.started',
                stateId: branchId,
                workloadId: workload.id,
                message: `Workload "${workload.id}" started.`
            });
        }
        return;
    }

    const workload = createWorkload(run, stateId, state);
    run.workloads.push(workload);
    pushEvent(run, {
        type: 'workload.created',
        stateId,
        workloadId: workload.id,
        message: `Workload "${workload.id}" created for state "${stateId}".`
    });
    workload.status = 'running';
    pushEvent(run, {
        type: 'workload.started',
        stateId,
        workloadId: workload.id,
        message: `Workload "${workload.id}" started.`
    });
}

function advanceFromState(workflow: FlowWorkflow, run: FlowRun, stateId: string): void {
    const transitions = (workflow.transitions || [])
        .filter(transition => transition.from === stateId)
        .sort((left, right) => (right.priority || 0) - (left.priority || 0));

    if (transitions.length === 0) {
        completeRun(run);
        return;
    }

    const transition = transitions.find(candidate => evaluateGuard(workflow, run, candidate.guard));
    if (!transition) {
        if (run.stateStatuses[stateId] === 'failed') {
            run.status = 'failed';
            pushEvent(run, {
                type: 'transition.evaluated',
                stateId,
                message: `No transition guard matched for failed state "${stateId}".`
            });
            return;
        }
        completeRun(run);
        return;
    }
    const transitionId = transition.id || `${transition.from}-${transition.to}`;
    pushEvent(run, {
        type: 'transition.evaluated',
        transitionId,
        stateId,
        message: `Transition "${transition.from}" -> "${transition.to}" evaluated.`,
        payload: { guard: transition.guard }
    });
    pushEvent(run, {
        type: 'transition.fired',
        transitionId,
        stateId,
        message: `Transition "${transition.from}" -> "${transition.to}" fired.`,
        payload: { loopCounter: transitionLoopCounter(transition.guard) }
    });
    enterState(workflow, run, transition.to);
}

function hasMatchingTransition(workflow: FlowWorkflow, run: FlowRun, stateId: string): boolean {
    return (workflow.transitions || [])
        .filter(transition => transition.from === stateId)
        .some(transition => evaluateGuard(workflow, run, transition.guard));
}

function findActiveParallelParent(workflow: FlowWorkflow, activeStateIds: string[]): string | undefined {
    const active = new Set(activeStateIds);
    for (const [stateId, state] of Object.entries(workflow.states)) {
        const branchIds = Object.keys(state.branches || {});
        if (branchIds.length > 0 && branchIds.every(branchId => active.has(branchId))) {
            return stateId;
        }
    }
    return undefined;
}

function evaluateGuard(workflow: FlowWorkflow, run: FlowRun, guard: FlowWorkflowTransition['guard']): boolean {
    if (!guard || Object.keys(guard).length === 0) {
        return true;
    }
    return Object.entries(guard).every(([key, value]) => {
        switch (key) {
            case 'all':
                return Array.isArray(value) && value.every(item => evaluateGuard(workflow, run, item as FlowWorkflowTransition['guard']));
            case 'any':
                return Array.isArray(value) && value.some(item => evaluateGuard(workflow, run, item as FlowWorkflowTransition['guard']));
            case 'artifact.exists':
                return typeof value === 'string' && run.artifacts.some(artifact => artifact.uri.includes(value) || artifact.summary?.includes(value));
            case 'artifact.validates':
                return artifactValidates(run, value);
            case 'signal.equals':
                return signalEquals(run, value);
            case 'gate.status':
                return gateStatusEquals(run, value);
            case 'branches.all_completed':
                return Array.isArray(value) && value.every(branchId => run.stateStatuses[String(branchId)] === 'done');
            case 'loop.lt':
                return loopCount(run, value) < loopMax(value);
            case 'loop.gte':
                return loopCount(run, value) >= loopMax(value);
            default:
                return true;
        }
    });
}

function artifactValidates(run: FlowRun, value: unknown): boolean {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const record = value as Record<string, unknown>;
    const artifactPath = typeof record.path === 'string' ? record.path : '';
    const schema = typeof record.schema === 'string' ? record.schema : '';
    if (!artifactPath || (schema !== 'contracts.schema.json' && schema !== 'flow-kernel/schemas/contracts.schema.json')) {
        return false;
    }
    const artifact = run.artifacts.find(candidate => artifactMatchesPath(candidate, artifactPath));
    if (!artifact) {
        return false;
    }
    try {
        const filePath = artifactFilePath(artifact.uri);
        const raw = filePath && fsSync.existsSync(filePath) ? fsSync.readFileSync(filePath, 'utf8') : '';
        if (!raw.trim()) {
            return false;
        }
        const parsed = JSON.parse(raw);
        return flowContractSchemaValidator(parsed) === true;
    } catch {
        return false;
    }
}

function artifactFilePath(uri: string): string | undefined {
    if (!uri) {
        return undefined;
    }
    if (uri.startsWith('file:')) {
        return FileUri.fsPath(uri);
    }
    return uri;
}

function artifactMatchesPath(artifact: FlowRun['artifacts'][number], artifactPath: string): boolean {
    const normalizedPath = normalizeArtifactGuardPath(artifactPath);
    return normalizeArtifactGuardPath(artifact.uri).includes(normalizedPath)
        || normalizeArtifactGuardPath(artifact.summary || '').includes(normalizedPath);
}

function normalizeArtifactGuardPath(value: string): string {
    return value.replace(/\\/g, '/');
}

function signalEquals(run: FlowRun, value: unknown): boolean {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const record = value as Record<string, unknown>;
    const key = String(record.key || '');
    return run.signals.some(signal => signal.key === key && signal.value === record.value);
}

function gateStatusEquals(run: FlowRun, value: unknown): boolean {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const record = value as Record<string, unknown>;
    return run.gates.some(gate => gate.id === record.id && gate.status === record.value);
}

function loopCount(run: FlowRun, value: unknown): number {
    const counter = loopCounter(value);
    if (!counter) {
        return 0;
    }
    return run.events.filter(event => event.type === 'transition.fired' && event.payload?.loopCounter === counter).length;
}

function loopMax(value: unknown): number {
    if (!value || typeof value !== 'object') {
        return 0;
    }
    const raw = (value as Record<string, unknown>).max;
    return typeof raw === 'number' ? raw : Number(raw || 0);
}

function loopCounter(value: unknown): string | undefined {
    if (!value || typeof value !== 'object') {
        return undefined;
    }
    const record = value as Record<string, unknown>;
    return typeof record.counter === 'string' ? record.counter : typeof record.key === 'string' ? record.key : undefined;
}

function transitionLoopCounter(guard: FlowWorkflowTransition['guard']): string | undefined {
    if (!guard) {
        return undefined;
    }
    for (const [key, value] of Object.entries(guard)) {
        if (key === 'loop.lt') {
            return loopCounter(value);
        }
        if ((key === 'all' || key === 'any') && Array.isArray(value)) {
            for (const item of value) {
                const found = transitionLoopCounter(item as FlowWorkflowTransition['guard']);
                if (found) {
                    return found;
                }
            }
        }
    }
    return undefined;
}

function createGate(workflow: FlowWorkflow, run: FlowRun, stateId: string): void {
    const state = getState(workflow, stateId);
    const existing = run.gates.find(gate => gate.stateId === stateId && gate.status === 'pending');
    if (existing) {
        run.status = 'waiting_gate';
        return;
    }
    const configuredGate = state.gates?.[0];
    const gate: FlowHumanGate = {
        id: configuredGate?.id || generateUuid(),
        title: configuredGate?.title || `Approve ${stateId}`,
        prompt: configuredGate?.prompt || `Approve state "${stateId}" before the run continues.`,
        stateId,
        status: 'pending'
    };
    run.gates.push(gate);
    run.status = 'waiting_gate';
    run.stateStatuses[stateId] = 'review';
    pushEvent(run, {
        type: 'gate.created',
        stateId,
        gateId: gate.id,
        message: `Human gate "${gate.title}" is waiting.`
    });
}

function requiresGate(workflow: FlowWorkflow, stateId: string): boolean {
    const state = getState(workflow, stateId);
    return Boolean(state.gates?.length);
}

function createWorkload(run: FlowRun, stateId: string, state: FlowWorkflowState): FlowWorkload {
    const now = timestamp();
    return {
        id: generateUuid(),
        runId: run.id,
        stateId,
        agent: state.agent,
        status: 'ready',
        inputArtifacts: state.input?.include || [],
        outputArtifacts: [],
        issues: [],
        effectIds: [],
        createdAt: now,
        updatedAt: now
    };
}

function completeRun(run: FlowRun): void {
    run.status = 'completed';
    run.currentStateIds = [];
    pushEvent(run, {
        type: 'run.completed',
        message: 'Run completed.'
    });
    touch(run);
}

function buildInitialStateStatuses(workflow: FlowWorkflow): Record<string, FlowStateRuntimeStatus> {
    const statuses: Record<string, FlowStateRuntimeStatus> = {};
    for (const [stateId, state] of Object.entries(workflow.states)) {
        statuses[stateId] = 'pending';
        for (const branchId of Object.keys(state.branches || {})) {
            statuses[branchId] = 'pending';
        }
    }
    return statuses;
}

function findStartStateId(workflow: FlowWorkflow): string {
    const stateIds = new Set(Object.keys(workflow.states));
    const targets = new Set((workflow.transitions || []).map(transition => transition.to));
    return [...stateIds].find(stateId => !targets.has(stateId)) || [...stateIds][0];
}

function getState(workflow: FlowWorkflow, stateId: string): FlowWorkflowState {
    const direct = workflow.states[stateId];
    if (direct) {
        return direct;
    }
    for (const state of Object.values(workflow.states)) {
        const branch = state.branches?.[stateId];
        if (branch) {
            return branch;
        }
    }
    throw new Error(`Unknown workflow state "${stateId}".`);
}

function pushEvent(run: FlowRun, event: Omit<FlowEvent, 'id' | 'runId' | 'timestamp'>): void {
    run.events.push({
        ...event,
        payload: event.payload ? limitFlowJsonValue(event.payload, FlowSizeLimits.eventPayloadBytes, 'event payload') as Record<string, unknown> : undefined,
        id: generateUuid(),
        runId: run.id,
        timestamp: timestamp()
    });
}

function touch(run: FlowRun): FlowRun {
    run.updatedAt = timestamp();
    return run;
}

function timestamp(): string {
    return new Date().toISOString();
}

function stableId(prefix: string, ...parts: string[]): string {
    return `${prefix}-${parts.join('-').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || generateUuid()}`;
}

interface KernelCommand {
    executable: string;
    argsPrefix: string[];
    cwd?: string;
}

export type KernelBridgeMetadata = FlowKernelRunMetadata;

export interface KernelRunState {
    id: string;
    workflowId: string;
    workflow: FlowWorkflow;
    input?: string;
    status: string;
    error?: string;
    createdAt: string;
    updatedAt: string;
    activeStates?: Record<string, boolean>;
    completedStates?: Record<string, boolean>;
    branchCompleted?: Record<string, boolean>;
    workloads?: Record<string, KernelWorkload>;
    artifacts?: Record<string, KernelArtifact>;
    effects?: KernelEffect[];
    signals?: Record<string, string | number | boolean>;
    requests?: unknown[];
}

interface KernelHostRequest {
    id: string;
    type: string;
    runId: string;
    workloadId: string;
    stateId: string;
    storeDir: string;
    artifactId?: string;
    gateId?: string;
    path?: string;
}

type VersionedKernelHostRequest = KernelHostRequest & Partial<FlowKernelProtocolHostRequest>;

interface HostWorkloadResult {
    workloadId: string;
    stateId: string;
    agent?: string;
    artifacts: FlowRun['artifacts'];
    effects: FlowRun['effects'];
    signals: FlowRun['signals'];
    issues: Array<Record<string, unknown>>;
    failed: boolean;
    error?: string;
}

interface KernelWorkload {
    id: string;
    runId: string;
    stateId: string;
    parentState?: string;
    agent?: string;
    status: string;
    attempt?: number;
    previousWorkloadId?: string;
    input?: { include?: string[] };
    outputs?: string[];
    createdAt: string;
    startedAt?: string;
    completedAt?: string;
}

interface KernelArtifact {
    id: string;
    type?: string;
    path: string;
    stateId?: string;
    workloadId?: string;
    createdAt: string;
}

interface KernelEffect {
    id?: string;
    type: string;
    path?: string;
    command?: string;
    hashBefore?: string;
    hashAfter?: string;
    patch?: string;
    summary?: string;
    status?: string;
    approvalPolicy?: string;
    stateId?: string;
    workloadId?: string;
    createdAt?: string;
}

export interface KernelEvent {
    seq: number;
    time: string;
    type: string;
    runId: string;
    stateId?: string;
    workloadId?: string;
    gateId?: string;
    transitionId?: string;
    message?: string;
    data?: Record<string, unknown>;
}

export function mapKernelRunToFlowRun(
    workflow: FlowWorkflow,
    prompt: string,
    kernelRun: KernelRunState,
    kernelEvents: KernelEvent[],
    metadata: KernelBridgeMetadata,
    previousRun?: FlowRun
): FlowRun {
    const activeStates = new Set(Object.entries(kernelRun.activeStates || {}).filter(([, active]) => active).map(([stateId]) => stateId));
    const completedStates = new Set(Object.entries(kernelRun.completedStates || {}).filter(([, done]) => done).map(([stateId]) => stateId));
    const stateStatuses = buildInitialStateStatuses(workflow);
    for (const stateId of Object.keys(stateStatuses)) {
        if (completedStates.has(stateId)) {
            stateStatuses[stateId] = 'done';
        } else if (activeStates.has(stateId)) {
            stateStatuses[stateId] = kernelRun.status === 'waiting' ? 'waiting' : 'running';
        }
    }
    const workloads = Object.values(kernelRun.workloads || {}).map(workload => mapKernelWorkload(workload));
    const artifacts = Object.values(kernelRun.artifacts || {}).map(artifact => ({
        id: artifact.id,
        runId: kernelRun.id,
        stateId: artifact.stateId || '',
        uri: artifact.path,
        kind: artifactKind(artifact),
        summary: artifact.path,
        createdAt: normalizeTime(artifact.createdAt)
    }));
    const effects = (kernelRun.effects || []).map(effect => ({
        id: effect.id || generateUuid(),
        runId: kernelRun.id,
        stateId: effect.stateId || '',
        kind: effectKind(effect),
        status: 'applied' as const,
        type: effect.type,
        path: effect.path,
        command: effect.command,
        hashBefore: effect.hashBefore,
        hashAfter: effect.hashAfter,
        patch: effect.patch,
        approvalPolicy: effect.approvalPolicy,
        summary: effect.summary || effect.path || effect.command || effect.type
    }));
    const signals = Object.entries(kernelRun.signals || {}).map(([key, value]) => ({
        key,
        value,
        runId: kernelRun.id,
        createdAt: normalizeTime(kernelRun.updatedAt)
    }));
    const events = mergeKernelEvents(previousRun?.events || [], kernelEvents, metadata);
    const gateDecisionById = new Map<string, FlowGateStatus>();
    for (const event of kernelEvents) {
        if ((event.type === 'gate.approved' || event.type === 'gate.rejected') && (event.gateId || event.stateId)) {
            gateDecisionById.set(event.gateId || event.stateId || '', event.type === 'gate.approved' ? 'approved' : 'rejected');
        }
    }
    const gates = kernelEvents
        .filter(event => event.type === 'gate.waiting')
        .map(event => {
            const gateId = event.gateId || event.stateId || generateUuid();
            return {
                id: gateId,
                title: `Approve ${event.stateId || event.gateId}`,
                stateId: event.stateId,
                status: gateDecisionById.get(gateId) || 'pending' as const,
                prompt: event.message || 'Approve this gate before the run continues.'
            };
        });
    const run: FlowRun = {
        id: kernelRun.id,
        workflowId: workflow.id,
        prompt,
        status: mapKernelStatus(kernelRun.status),
        createdAt: normalizeTime(kernelRun.createdAt),
        updatedAt: normalizeTime(kernelRun.updatedAt),
        externalKernelMetadata: metadata,
        currentStateIds: [...activeStates],
        stateStatuses,
        workloads,
        events,
        artifacts,
        effects,
        signals,
        gates,
        tick: kernelEvents.filter(event => event.type === 'clock.tick').length
    };
    attachSecondRunSuggestionFromEvents(run);
    if (previousRun) {
        preserveFlowRunContext(previousRun, run);
    }
    return run;
}

function preserveFlowRunContext(source: FlowRun, target: FlowRun): FlowRun {
    if (source.file && !target.file) {
        target.file = source.file;
    }
    if (source.externalKernelMetadata) {
        target.externalKernelMetadata = source.externalKernelMetadata;
    }
    target.contextPack = source.contextPack;
    target.workloadContextPacks = source.workloadContextPacks;
    target.memoryCandidates = source.memoryCandidates;
    target.memoryWrites = source.memoryWrites;
    if (source.secondRunSuggestion && source.secondRunSuggestion.status !== 'suggested') {
        target.secondRunSuggestion = source.secondRunSuggestion;
    } else if (source.secondRunSuggestion && !target.secondRunSuggestion) {
        target.secondRunSuggestion = source.secondRunSuggestion;
    }
    if (!source.executionMode) {
        return target;
    }
    target.executionMode = source.executionMode;
    target.executionModeMessage = source.executionModeMessage;
    return target;
}

function parseKernelEventId(raw: string): number | undefined {
    if (!/^\d+$/.test(raw)) {
        return undefined;
    }
    const seq = Number.parseInt(raw, 10);
    return Number.isFinite(seq) && Number.isInteger(seq) ? seq : undefined;
}

function dedupeKernelEvents(events: KernelEvent[]): KernelEvent[] {
    const bySeq = new Map<number, KernelEvent>();
    for (const event of events) {
        if (!Number.isInteger(event.seq)) {
            continue;
        }
        bySeq.set(event.seq, event);
    }
    return [...bySeq.entries()]
        .sort((left, right) => left[0] - right[0])
        .map(([, event]) => event);
}

function mergeKernelEvents(existing: FlowEvent[] = [], incoming: KernelEvent[], metadata: KernelBridgeMetadata): FlowEvent[] {
    const hasIncomingRunStarted = incoming.some(event => event.type === 'run.started');
    const localEvents = existing.filter(event => parseKernelEventId(event.id) === undefined
        && !(hasIncomingRunStarted && isSyntheticExternalRunStarted(event)));
    const bySeq = new Map<number, FlowEvent>();
    for (const event of existing) {
        const seq = parseKernelEventId(event.id);
        if (seq === undefined) {
            continue;
        }
        bySeq.set(seq, event);
    }

    for (const event of dedupeKernelEvents(incoming)) {
        bySeq.set(event.seq, mapKernelEvent(event, metadata));
    }

    const mergedKernel = [...bySeq.entries()]
        .sort((left, right) => left[0] - right[0])
        .map(([, event]) => event);
    if (!mergedKernel.some(event => event.type === 'run.started')) {
        mergedKernel.unshift({
            id: generateUuid(),
            runId: incoming[0]?.runId || (existing[0]?.runId || ''),
            workflowId: existing[0]?.workflowId,
            type: 'run.started',
            timestamp: existing[0]?.timestamp || normalizeTime(new Date().toISOString()),
            message: 'Run started by external Flow Kernel.',
            payload: { kernel: metadata }
        });
    } else {
        for (const event of mergedKernel) {
            if (event.type === 'run.started') {
                event.payload = { ...(event.payload as Record<string, unknown> | undefined), kernel: metadata };
                break;
            }
        }
    }

    return [...mergedKernel, ...localEvents];
}

function isSyntheticExternalRunStarted(event: FlowEvent): boolean {
    return event.type === 'run.started'
        && event.message === 'Run started by external Flow Kernel.';
}

function normalizePushedKernelEvents(message: KernelMessage): KernelEvent[] {
    const rawEvents: unknown[] = Array.isArray(message.events)
        ? message.events
        : Array.isArray(message.data)
            ? message.data
            : Array.isArray((message as { event?: unknown }).event)
                ? (message as unknown as { event: unknown[] }).event
                : isKernelEventLike(message)
                    ? [message]
                    : isKernelEventLike((message as { event?: unknown }).event)
                        ? [(message as { event?: unknown }).event]
                        : [];
    return rawEvents.filter(isKernelEventLike).map((event: Partial<KernelEvent>) => event as KernelEvent);
}

function isKernelEventLike(value: unknown): value is Partial<KernelEvent> {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const event = value as Partial<KernelEvent>;
    return typeof event.seq === 'number'
        && typeof event.type === 'string'
        && typeof event.runId === 'string'
        && typeof event.time === 'string';
}

function mapKernelWorkload(workload: KernelWorkload): FlowWorkload {
    return {
        id: workload.id,
        runId: workload.runId,
        stateId: workload.stateId,
        branchId: workload.parentState,
        agent: workload.agent,
        attempt: workload.attempt,
        previousWorkloadId: workload.previousWorkloadId,
        status: mapKernelWorkloadStatus(workload.status),
        inputArtifacts: workload.input?.include || [],
        outputArtifacts: workload.outputs || [],
        issues: [],
        effectIds: [],
        createdAt: normalizeTime(workload.createdAt),
        updatedAt: normalizeTime(workload.completedAt || workload.startedAt || workload.createdAt)
    };
}

function normalizeKernelRequests(raw: unknown, storeDir: string): VersionedKernelHostRequest[] {
    if (!Array.isArray(raw)) {
        return [];
    }
    return raw
        .filter((request): request is Record<string, unknown> => Boolean(request) && typeof request === 'object')
        .map(request => ({
            id: String(request.id || request.requestId || request.workloadId || ''),
            type: String(request.type || '') as FlowKernelHostRequestType,
            runId: String(request.runId || ''),
            workloadId: String(request.workloadId || request.id || ''),
            stateId: String(request.stateId || ''),
            storeDir,
            artifactId: optionalString(request.artifactId),
            gateId: optionalString(request.gateId),
            path: optionalString(request.path)
        }))
        .filter(request => request.id && request.type && request.runId && (isKernelWorkloadRequest(request) ? Boolean(request.workloadId) : true));
}

function requestKey(request: VersionedKernelHostRequest): string {
    return `${request.type}:${request.runId}:${request.workloadId}:${request.id}`;
}

function isKernelWorkloadRequest(request: VersionedKernelHostRequest): boolean {
    return request.type === 'execute_workload'
        || request.type === 'request_context_pack'
        || request.type === 'request_memory_write'
        || request.type === 'request_command_execution';
}

function optionalString(value: unknown): string | undefined {
    if (value === undefined || value === null) {
        return undefined;
    }
    const text = String(value);
    return text ? text : undefined;
}

function cloneFlowRun(run: FlowRun): FlowRun {
    return JSON.parse(JSON.stringify(run)) as FlowRun;
}

function diffHostWorkloadResult(before: FlowRun, after: FlowRun, workload: FlowWorkload): HostWorkloadResult {
    const beforeArtifacts = new Set(before.artifacts.map(artifact => artifact.id));
    const beforeEffects = new Set(before.effects.map(effect => effect.id));
    const beforeSignals = new Set(before.signals.map(signal => `${signal.key}:${signal.createdAt || ''}:${String(signal.value)}`));
    const artifacts = after.artifacts.filter(artifact => !beforeArtifacts.has(artifact.id) || workload.outputArtifacts.includes(artifact.uri));
    const effects = after.effects.filter(effect => !beforeEffects.has(effect.id) || workload.effectIds.includes(effect.id));
    const signals = after.signals.filter(signal => !beforeSignals.has(`${signal.key}:${signal.createdAt || ''}:${String(signal.value)}`)
        || signal.stateId === workload.stateId);
    const issues = workload.issues.map(issue => ({ severity: 'non_blocking', type: 'workload_issue', summary: issue }));
    return {
        workloadId: workload.id,
        stateId: workload.stateId,
        agent: workload.agent,
        artifacts,
        effects,
        signals,
        issues,
        failed: workload.status === 'failed',
        error: workload.issues[0]
    };
}

function mapKernelEvent(event: KernelEvent, metadata: KernelBridgeMetadata): FlowEvent {
    return {
        id: String(event.seq),
        runId: event.runId,
        type: mapKernelEventType(event.type),
        timestamp: normalizeTime(event.time),
        stateId: event.stateId,
        transitionId: event.transitionId,
        workloadId: event.workloadId,
        gateId: event.gateId,
        message: event.message || event.type,
        payload: event.type === 'run.started' ? { ...event.data, kernel: metadata } : event.data
    };
}

function attachSecondRunSuggestionFromEvents(run: FlowRun): void {
    const issues = run.events
        .filter(event => event.type === 'issue.recorded')
        .map(event => event.payload)
        .filter((payload): payload is Record<string, unknown> => Boolean(payload) && typeof payload === 'object')
        .map(payload => ({
            severity: stringValue(payload.severity) || 'non_blocking',
            type: stringValue(payload.type) || 'workload_issue',
            summary: stringValue(payload.summary) || stringValue(payload.message) || 'Issue recorded during run.',
            producer: stringValue(payload.producer),
            impact: stringValue(payload.impact),
            suggestedFollowup: stringValue(payload.suggestedFollowup)
        }))
        .filter(issue => issue.summary && isSecondRunIssue(issue));
    if (issues.length === 0) {
        return;
    }
    const deduped = dedupeIssues(issues);
    const reason = `QA/agentes registraram ${deduped.length} melhoria(s) fora de escopo ou problema(s) nao bloqueante(s).`;
    run.secondRunSuggestion = {
        id: `second-run-${run.id}`,
        status: 'suggested',
        reason,
        title: 'Segunda run sugerida',
        sourceRunId: run.id,
        sourceIssueCount: deduped.length,
        issues: deduped,
        prompt: [
            `Continue a partir da run ${run.id}.`,
            reason,
            '',
            'Trate apenas os follow-ups abaixo, preservando o escopo entregue na run original:',
            deduped.map(issue => `- [${issue.severity}] ${issue.type}: ${issue.summary}`).join('\n')
        ].join('\n'),
        createdAt: run.updatedAt
    };
}

function dedupeIssues(issues: FlowWorkloadResultIssue[]): FlowWorkloadResultIssue[] {
    const seen = new Set<string>();
    const result: FlowWorkloadResultIssue[] = [];
    for (const issue of issues) {
        const key = `${issue.severity}:${issue.type}:${issue.summary}`;
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        result.push(issue);
    }
    return result;
}

function isSecondRunIssue(issue: Pick<FlowWorkloadResultIssue, 'severity' | 'type' | 'summary' | 'suggestedFollowup'>): boolean {
    const severity = (issue.severity || '').toLowerCase();
    const text = [issue.type, issue.summary, issue.suggestedFollowup].join(' ').toLowerCase();
    return severity === 'non_blocking'
        || severity === 'warning'
        || severity === 'minor'
        || text.includes('out-of-scope')
        || text.includes('out of scope')
        || text.includes('fora de escopo')
        || text.includes('followup')
        || text.includes('follow-up')
        || text.includes('melhoria')
        || text.includes('improvement')
        || text.includes('second run')
        || text.includes('segunda run');
}

function stringValue(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toTrimmedString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function parseStringArray(value: unknown): string[] {
    return Array.isArray(value) ? value.map(item => toTrimmedString(item)).filter(Boolean) : [];
}

function parseOptionalNumber(value: unknown): number | undefined {
    const parsed = typeof value === 'number' ? value : Number.parseInt(toTrimmedString(value), 10);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function parseRecordEnv(value: unknown): Record<string, string | number | boolean> {
    if (!isRecord(value)) {
        return {};
    }
    const env: Record<string, string | number | boolean> = {};
    for (const [key, raw] of Object.entries(value)) {
        if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') {
            env[key] = raw;
        }
    }
    return env;
}

function mapKernelStatus(status: string): FlowRun['status'] {
    switch (status) {
        case 'completed': return 'completed';
        case 'failed': return 'failed';
        case 'cancelled': return 'cancelled';
        case 'paused': return 'paused';
        case 'waiting': return 'waiting_gate';
        default: return 'running';
    }
}

function mapKernelWorkloadStatus(status: string): FlowWorkload['status'] {
    switch (status) {
        case 'started': return 'running';
        case 'completed': return 'done';
        case 'failed': return 'failed';
        default: return 'pending';
    }
}

function mapKernelEventType(type: string): FlowEvent['type'] {
    switch (type) {
        case 'run.started': return 'run.started';
        case 'run.completed': return 'run.completed';
        case 'run.failed': return 'run.failed';
        case 'run.cancelled': return 'run.cancelled';
        case 'run.paused': return 'run.paused';
        case 'run.resumed': return 'run.resumed';
        case 'state.entered': return 'state.entered';
        case 'state.completed': return 'state.completed';
        case 'workload.created': return 'workload.created';
        case 'workload.requeued': return 'workload.requeued';
        case 'workload.started': return 'workload.started';
        case 'workload.failed': return 'workload.failed';
        case 'workload.completed': return 'workload.completed';
        case 'workload.retry': return 'workload.retry';
        case 'artifact.created': return 'artifact.created';
        case 'transition.fired': return 'transition.fired';
        case 'gate.approved': return 'gate.approved';
        case 'gate.rejected': return 'gate.rejected';
        case 'gate.waiting': return 'gate.created';
        case 'effect.recorded': return 'effect.proposed';
        case 'issue.recorded': return 'issue.recorded';
        case 'signal.recorded': return 'signal.emitted';
        case 'transition.checked':
        case 'transition.check_requested':
        case 'clock.tick':
        default:
            return 'transition.evaluated';
    }
}

function artifactKind(artifact: KernelArtifact): FlowRun['artifacts'][number]['kind'] {
    if (artifact.type === 'contract') {
        return 'contract';
    }
    if (artifact.path.endsWith('.md')) {
        return 'report';
    }
    if (artifact.path.endsWith('.log')) {
        return 'log';
    }
    return 'other';
}

function effectKind(effect: KernelEffect): FlowRun['effects'][number]['kind'] {
    switch (effect.type) {
        case 'file.edited':
        case 'file.create':
        case 'file.created':
        case 'file.deleted':
            return 'file_write';
        case 'command.executed':
            return 'command';
        case 'memory.write':
            return 'memory_write';
        default:
            return 'other';
    }
}

function toKernelWorkflow(workflow: FlowWorkflow): FlowWorkflow {
    const states: Record<string, FlowWorkflowState> = {};
    for (const [stateId, state] of Object.entries(workflow.states)) {
        states[stateId] = toKernelState(state);
    }
    return {
        version: workflow.version,
        id: workflow.id,
        name: workflow.name,
        requires: workflow.requires,
        agents: workflow.agents,
        states,
        transitions: workflow.transitions
    };
}

function toKernelState(state: FlowWorkflowState): FlowWorkflowState {
    const branches: Record<string, FlowWorkflowState> = {};
    for (const [branchId, branch] of Object.entries(state.branches || {})) {
        branches[branchId] = toKernelState(branch);
    }
    return {
        type: state.type,
        agent: state.agent,
        input: state.input,
        timeoutMs: state.timeoutMs,
        outputs: state.outputs,
        waitFor: state.waitFor,
        branches: Object.keys(branches).length ? branches : undefined,
        gateId: state.gates?.[0]?.id,
        retry: state.retry,
        signals: state.signals as Record<string, unknown> | undefined,
        effects: state.effects as unknown[] | undefined
    } as FlowWorkflowState;
}

function kernelMetadata(run: FlowRun): KernelBridgeMetadata | undefined {
    if (run.externalKernelMetadata && run.externalKernelMetadata.kernelRunId && run.externalKernelMetadata.storeDir) {
        return run.externalKernelMetadata;
    }
    for (const event of run.events) {
        const kernel = event.payload?.kernel as KernelBridgeMetadata | undefined;
        if (kernel?.kernelRunId && kernel.storeDir) {
            return kernel;
        }
    }
    return undefined;
}

function shouldUseExternalKernel(run: FlowRun): boolean {
    return run.executionMode === 'kernel_external' || Boolean(kernelMetadata(run));
}

function ensureExecutionMode(run: FlowRun, source: FlowRun): FlowRun {
    if (run.executionMode) {
        return run;
    }
    return setExecutionMode(
        run,
        source.executionMode || 'kernel_simulated',
        source.executionModeMessage
    );
}

function setExecutionMode(run: FlowRun, executionMode: FlowRunExecutionMode, executionModeMessage?: string): FlowRun {
    run.executionMode = executionMode;
    if (executionModeMessage) {
        run.executionModeMessage = executionModeMessage;
    }
    return run;
}

async function postKernelHttpMessage(url: string, message: KernelMessage): Promise<Record<string, unknown>> {
    const normalized = new URL(url);
    const body = JSON.stringify(message);
    return new Promise<Record<string, unknown>>((resolve, reject) => {
        const request = (normalized.protocol === 'https:' ? https : http).request({
        protocol: normalized.protocol,
        hostname: normalized.hostname,
        port: normalized.port,
        path: `${normalized.pathname}${normalized.search}`,
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'content-length': Buffer.byteLength(body)
        }
    });
    request.on('error', error => {
        reject(error);
    });
    request.on('response', response => {
        let raw = '';
        response.on('data', chunk => {
            raw += chunk;
        });
        response.on('end', () => {
            if (response.statusCode !== 200) {
                reject(new Error(`Flow Kernel HTTP responded with status ${response.statusCode}: ${raw}`));
                return;
            }
            try {
                resolve(JSON.parse(raw || '{}') as Record<string, unknown>);
            } catch (error) {
                reject(error);
            }
        });
    });
    request.write(body);
    request.end();
    });
}

function resolveKernelCommand(): KernelCommand | undefined {
    const configured = process.env.FLOW_KERNEL_CLI || process.env.AGENCY_KERNEL_CLI;
    if (configured) {
        return { executable: configured, argsPrefix: [] };
    }
    const cwd = process.cwd();
    const localMain = path.join(cwd, 'flow-kernel', 'cmd', 'flow-kernel', 'main.go');
    return fileExistsSyncish(localMain)
        ? { executable: 'go', argsPrefix: ['run', './flow-kernel/cmd/flow-kernel'], cwd }
        : undefined;
}

function resolveKernelHttpEndpoint(): string | undefined {
    const configured = process.env.FLOW_KERNEL_HTTP || process.env.AGENCY_KERNEL_HTTP;
    if (!configured) {
        return undefined;
    }
    const target = configured.includes('://') ? configured : `http://${configured}`;
    const parsed = new URL(target);
    if (parsed.protocol === 'ws:' || parsed.protocol === 'wss:') {
        if (parsed.pathname === '/' || parsed.pathname === '') {
            parsed.pathname = '/ws';
        }
        return parsed.toString();
    }
    if (parsed.pathname === '/' || parsed.pathname === '' || parsed.pathname === '/ws') {
        parsed.pathname = '/message';
    }
    return parsed.toString();
}

function isKernelWebSocketEndpoint(endpoint: string): boolean {
    const protocol = new URL(endpoint).protocol;
    return protocol === 'ws:' || protocol === 'wss:';
}

function resolveRuntimeWebSocket(): RuntimeWebSocketConstructor {
    const WebSocketCtor = (globalThis as { WebSocket?: RuntimeWebSocketConstructor }).WebSocket;
    if (!WebSocketCtor) {
        throw new Error('WebSocket endpoints require a runtime WebSocket implementation. Use Node.js >=22 or configure the HTTP endpoint.');
    }
    return WebSocketCtor;
}

function formatWebSocketEvent(event: unknown): string {
    if (event instanceof Error) {
        return event.message;
    }
    if (event && typeof event === 'object') {
        const record = event as Record<string, unknown>;
        const code = record.code === undefined ? '' : ` code=${String(record.code)}`;
        const reason = record.reason === undefined ? '' : ` reason=${String(record.reason)}`;
        const message = record.message === undefined ? '' : ` message=${String(record.message)}`;
        return `${code}${reason}${message}`.trim() || 'no details';
    }
    return String(event || 'no details');
}

function fileExistsSyncish(file: string): boolean {
    try {
        // eslint-disable-next-line no-sync
        return require('fs').existsSync(file);
    } catch {
        return false;
    }
}

function normalizeTime(value: string | undefined): string {
    return value ? new Date(value).toISOString() : timestamp();
}

function ensureResponseType(response: KernelMessage, expectedType: string): void {
    if (response.type !== expectedType) {
        throw new Error(`Unexpected kernel response type: "${response.type}" (expected ${expectedType}).`);
    }
}

function getKernelRun(response: KernelMessage): KernelRunState {
    const run = (response as { run?: unknown }).run;
    if (!run || typeof run !== 'object') {
        throw new Error('Kernel response did not include a valid run payload.');
    }
    return run as KernelRunState;
}

import { FlowGateDecisionRequest, FlowKernelRunMetadata, FlowRun, FlowWorkflow, FlowContextPack, FlowKernelHostRequest as FlowKernelProtocolHostRequest } from '../common';
import { FlowWorkloadExecutor } from './flow-workload-executor';
import { CommandEffectHostAdapter } from './command-effect-host-adapter';
import { MemoryAdapter } from './memory-adapter';
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
export declare const FlowKernelBridge: any;
export type FlowKernelBridgeMode = 'external' | 'simulated';
export interface FlowKernelBridge {
    available?(): boolean;
    supportsRunEventStream?(): boolean | Promise<boolean>;
    startRun(workflow: FlowWorkflow, prompt: string, projectSummary: string, workspaceRootUri?: string): Promise<FlowRun>;
    tickRun(workflow: FlowWorkflow, run: FlowRun, workspaceRootUri?: string): Promise<FlowRun>;
    approveGate(workflow: FlowWorkflow, run: FlowRun, request: FlowGateDecisionRequest, workspaceRootUri?: string): Promise<FlowRun>;
    pauseRun(workflow: FlowWorkflow, run: FlowRun, reason?: string): Promise<FlowRun>;
    resumeRun(workflow: FlowWorkflow, run: FlowRun, reason?: string): Promise<FlowRun>;
    cancelRun(workflow: FlowWorkflow, run: FlowRun, reason?: string): Promise<FlowRun>;
    refreshRun(workflow: FlowWorkflow, run: FlowRun): Promise<FlowRun>;
    subscribeRunEvents?(workflow: FlowWorkflow, run: FlowRun, workspaceRootUri: string | undefined, listener: (run: FlowRun) => void, errorListener?: (error: Error) => void): Promise<() => void>;
    getBridgeMode(): Promise<FlowKernelBridgeMode>;
}
declare class FlowKernelTransport {
    protected init?: Promise<KernelTransport>;
    protected transport?: KernelTransport;
    protected reconnecting?: Promise<void>;
    protected readonly pushListeners: any;
    protected readonly transportDisposers: Array<() => void>;
    available(): boolean;
    supportsPushMessages(): boolean;
    start(): Promise<void>;
    healthCheck(): Promise<void>;
    restart(reason?: string): Promise<void>;
    shutdown(): Promise<void>;
    getStderrSnapshot(maxBytes?: number): string;
    onPushMessage(listener: (message: KernelMessage) => void): Promise<() => void>;
    request(message: KernelMessage): Promise<KernelResponse>;
    protected resolveTransport(): Promise<KernelTransport>;
    protected createTransport(): Promise<KernelTransport>;
    protected handshake(transport: KernelTransport): Promise<void>;
    protected handshakeStatus(transport: KernelTransport): Promise<void>;
    protected attachTransportListeners(transport: KernelTransport): void;
    protected disposeTransportListeners(): void;
    protected emitPushMessage(message: KernelMessage): void;
    protected reconnectAfterDisconnect(transport: KernelTransport): Promise<void>;
}
export declare class HybridFlowKernelBridge implements FlowKernelBridge {
    protected readonly external: FlowKernelBridge;
    protected readonly simulated: SimulatedFlowKernelBridge;
    constructor(workloadExecutor?: FlowWorkloadExecutor, commandEffectHostAdapter?: CommandEffectHostAdapter, memoryAdapter?: MemoryAdapter);
    protected shouldUseExternalKernel(operation: string, requireExternal?: boolean): Promise<boolean>;
    getBridgeMode(): Promise<FlowKernelBridgeMode>;
    supportsRunEventStream(): Promise<boolean>;
    startRun(workflow: FlowWorkflow, prompt: string, projectSummary: string, workspaceRootUri?: string): Promise<FlowRun>;
    tickRun(workflow: FlowWorkflow, run: FlowRun, workspaceRootUri?: string): Promise<FlowRun>;
    approveGate(workflow: FlowWorkflow, run: FlowRun, request: FlowGateDecisionRequest, workspaceRootUri?: string): Promise<FlowRun>;
    refreshRun(workflow: FlowWorkflow, run: FlowRun): Promise<FlowRun>;
    subscribeRunEvents(workflow: FlowWorkflow, run: FlowRun, workspaceRootUri: string | undefined, listener: (run: FlowRun) => void, errorListener?: (error: Error) => void): Promise<() => void>;
    pauseRun(workflow: FlowWorkflow, run: FlowRun, reason?: string): Promise<FlowRun>;
    resumeRun(workflow: FlowWorkflow, run: FlowRun, reason?: string): Promise<FlowRun>;
    cancelRun(workflow: FlowWorkflow, run: FlowRun, reason?: string): Promise<FlowRun>;
    protected lifecycleRun(operation: 'pauseRun' | 'resumeRun' | 'cancelRun', workflow: FlowWorkflow, run: FlowRun, reason?: string): Promise<FlowRun>;
}
export declare class ExternalFlowKernelBridge implements FlowKernelBridge {
    protected readonly workloadExecutor: FlowWorkloadExecutor;
    protected readonly memoryAdapter?: MemoryAdapter;
    protected readonly commandEffectHostAdapter: CommandEffectHostAdapter;
    protected readonly transport: FlowKernelTransport;
    constructor(workloadExecutor?: FlowWorkloadExecutor, memoryAdapter?: MemoryAdapter, commandEffectHostAdapter?: CommandEffectHostAdapter);
    available(): boolean;
    supportsRunEventStream(): boolean;
    startKernelProcess(): Promise<void>;
    checkKernelHealth(): Promise<void>;
    restartKernelProcess(reason?: string): Promise<void>;
    shutdownKernelProcess(): Promise<void>;
    getKernelStderr(maxBytes?: number): string;
    getBridgeMode(): Promise<FlowKernelBridgeMode>;
    startRun(workflow: FlowWorkflow, prompt: string, projectSummary: string, workspaceRootUri?: string): Promise<FlowRun>;
    protected validateKernelWorkflow(workflow: FlowWorkflow): Promise<void>;
    tickRun(workflow: FlowWorkflow, run: FlowRun, workspaceRootUri?: string): Promise<FlowRun>;
    approveGate(workflow: FlowWorkflow, run: FlowRun, request: FlowGateDecisionRequest, workspaceRootUri?: string): Promise<FlowRun>;
    pauseRun(workflow: FlowWorkflow, run: FlowRun, reason?: string): Promise<FlowRun>;
    resumeRun(workflow: FlowWorkflow, run: FlowRun, reason?: string): Promise<FlowRun>;
    cancelRun(workflow: FlowWorkflow, run: FlowRun, reason?: string): Promise<FlowRun>;
    refreshRun(workflow: FlowWorkflow, run: FlowRun): Promise<FlowRun>;
    subscribeRunEvents(workflow: FlowWorkflow, run: FlowRun, workspaceRootUri: string | undefined, listener: (run: FlowRun) => void, errorListener?: (error: Error) => void): Promise<() => void>;
    protected processHostRequests(workflow: FlowWorkflow, prompt: string, kernelRun: KernelRunState, storeDir: string, workspaceRootUri: string | undefined, metadata: KernelBridgeMetadata, rawRequests: unknown, previousRun?: FlowRun): Promise<KernelRunState>;
    protected processNonWorkloadHostRequest(currentRun: KernelRunState, request: VersionedKernelHostRequest): Promise<KernelRunState>;
    protected recordArtifactOpenAvailability(currentRun: KernelRunState, request: VersionedKernelHostRequest): Promise<KernelRunState>;
    protected executeHostWorkload(workflow: FlowWorkflow, run: FlowRun, request: VersionedKernelHostRequest, workspaceRootUri?: string): Promise<HostWorkloadResult>;
    protected executeContextPackRequest(workflow: FlowWorkflow, run: FlowRun, request: VersionedKernelHostRequest, workspaceRootUri?: string): Promise<HostWorkloadResult>;
    protected proposeMemoryWriteRequest(run: FlowRun, request: VersionedKernelHostRequest): HostWorkloadResult;
    protected executeCommandExecutionRequest(workflow: FlowWorkflow, run: FlowRun, request: VersionedKernelHostRequest, workspaceRootUri?: string): Promise<HostWorkloadResult>;
    protected writeContextPackArtifact(request: VersionedKernelHostRequest, pack: FlowContextPack): Promise<FlowRun['artifacts'][number]>;
    protected commitHostWorkloadResult(storeDir: string, runId: string, result: HostWorkloadResult): Promise<KernelRunState>;
    protected getKernelEvents(request: {
        runId: string;
        storeDir: string;
    }): Promise<KernelEvent[]>;
    protected lifecycleRun(type: string, responseType: string, workflow: FlowWorkflow, run: FlowRun, reason?: string): Promise<FlowRun>;
    protected getKernelRun(metadata: KernelBridgeMetadata): Promise<KernelRunState>;
    protected requestWithReconnect(message: KernelMessage): Promise<KernelResponse>;
}
export declare class SimulatedFlowKernelBridge implements FlowKernelBridge {
    protected readonly workloadExecutor: FlowWorkloadExecutor;
    constructor(workloadExecutor?: FlowWorkloadExecutor);
    getBridgeMode(): Promise<FlowKernelBridgeMode>;
    supportsRunEventStream(): boolean;
    refreshRun(workflow: FlowWorkflow, run: FlowRun): Promise<FlowRun>;
    startRun(workflow: FlowWorkflow, prompt: string, projectSummary: string, workspaceRootUri?: string): Promise<FlowRun>;
    tickRun(workflow: FlowWorkflow, run: FlowRun, workspaceRootUri?: string): Promise<FlowRun>;
    approveGate(workflow: FlowWorkflow, run: FlowRun, request: FlowGateDecisionRequest, workspaceRootUri?: string): Promise<FlowRun>;
    pauseRun(_workflow: FlowWorkflow, run: FlowRun, reason?: string): Promise<FlowRun>;
    resumeRun(_workflow: FlowWorkflow, run: FlowRun, reason?: string): Promise<FlowRun>;
    cancelRun(_workflow: FlowWorkflow, run: FlowRun, reason?: string): Promise<FlowRun>;
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
    input?: {
        include?: string[];
    };
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
export declare function mapKernelRunToFlowRun(workflow: FlowWorkflow, prompt: string, kernelRun: KernelRunState, kernelEvents: KernelEvent[], metadata: KernelBridgeMetadata, previousRun?: FlowRun): FlowRun;
export {};

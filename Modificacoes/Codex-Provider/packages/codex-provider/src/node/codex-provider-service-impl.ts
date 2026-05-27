// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { ContributionProvider, ILogger, generateUuid, nls } from '@theia/core';
import { inject, injectable, named, optional } from '@theia/core/shared/inversify';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
    CodexProviderApprovalRequestMessage,
    CodexProviderApprovalResponseMessage,
    CodexProviderAppServerRequest,
    CodexProviderBackendRequest,
    CodexProviderBackendStatus,
    CodexProviderCollectResult,
    CodexProviderClient,
    CodexProviderFileUpdateChange,
    CodexProviderInputItem,
    CodexProviderLoginRequest,
    CodexProviderLoginResult,
    CodexProviderOptions,
    CodexProviderStatusRequest,
    CodexProviderQuestionOption,
    CodexProviderSetThreadRequest,
    CodexProviderService,
    CodexProviderThreadActionRequest,
    CodexProviderThreadActionResult,
    CodexProviderUserInputQuestion,
    CodexProviderUserInputResponseMessage
} from '../common/codex-provider-service';
import {
    CodexProviderSpawnEnvironmentContext,
    CodexProviderSpawnEnvironmentContribution,
    CodexProviderSpawnEnvironmentFragment
} from './codex-provider-spawn-environment';

interface JsonRpcMessage {
    id?: string | number;
    method?: string;
    params?: unknown;
    result?: unknown;
    error?: unknown;
}

interface PendingRpcRequest {
    resolve: (result: unknown) => void;
    reject: (error: Error) => void;
    timeout?: ReturnType<typeof setTimeout>;
}

interface ActiveStream {
    streamId: string;
    client?: CodexProviderClient;
    threadId?: string;
    turnId?: string;
    receivedNotification?: boolean;
    cwd?: string;
    complete: () => void;
}

type PendingServerResponse = (message: CodexProviderApprovalResponseMessage | CodexProviderUserInputResponseMessage) => void;

interface WorkspaceFileSnapshot {
    path: string;
    content: string;
    mtimeMs: number;
    size: number;
}

interface ResolvedSpawnEnvironment {
    env: NodeJS.ProcessEnv;
    fingerprint: string;
}

const CODEX_CLI_SYNTHETIC_FILE_CHANGE_MAX_FILES = 300;
const CODEX_CLI_SYNTHETIC_FILE_CHANGE_MAX_DEPTH = 2;
const CODEX_CLI_SYNTHETIC_FILE_CHANGE_MAX_FILE_SIZE = 256 * 1024;
const CODEX_CLI_SYNTHETIC_FILE_CHANGE_MAX_DIFF_SIZE = 48 * 1024;
const CODEX_CLI_OPTIONAL_STATUS_REQUEST_TIMEOUT = 1500;
const CODEX_CLI_SYNTHETIC_FILE_CHANGE_IGNORED_DIRS = new Set([
    '.git',
    '.theia',
    'node_modules',
    'lib',
    'src-gen',
    'dist',
    'build',
    'coverage',
    'plugins.disabled',
    '.codex-app-server-types'
]);

@injectable()
export class CodexProviderServiceImpl implements CodexProviderService {

    @inject(ILogger) @named('CodexCLI')
    protected readonly logger: ILogger;

    @inject(ContributionProvider) @named(CodexProviderSpawnEnvironmentContribution) @optional()
    protected readonly spawnEnvironmentContributions: ContributionProvider<CodexProviderSpawnEnvironmentContribution> | undefined;

    protected client: CodexProviderClient | undefined;
    protected process: ChildProcessWithoutNullStreams | undefined;
    protected initializePromise: Promise<void> | undefined;
    protected stdoutBuffer = '';
    protected stderrBuffer = '';
    protected requestSeq = 0;
    protected pendingRequests = new Map<string, PendingRpcRequest>();
    protected pendingServerResponses = new Map<string, PendingServerResponse>();
    protected activeStreams = new Map<string, ActiveStream>();
    protected turnToStream = new Map<string, string>();
    protected sessionThreads = new Map<string, string>();
    protected loadedThreads = new Set<string>();
    protected sessionThreadsLoaded = false;
    protected activeStreamId: string | undefined;
    protected processKey = '';
    protected stderrTail: string[] = [];

    setClient(client: CodexProviderClient): void {
        this.client = client;
    }

    dispose(): void {
        this.stopServer();
        this.activeStreams.clear();
        this.turnToStream.clear();
    }

    async send(request: CodexProviderBackendRequest, streamId: string): Promise<void> {
        if (!this.client) {
            throw new Error(nls.localize('theia/ai/codex-provider/clientNotInitialized', 'Codex Provider client not initialized'));
        }
        this.sendMessages(streamId, request, this.client);
    }

    async sendAndCollect(request: CodexProviderBackendRequest): Promise<CodexProviderCollectResult> {
        const streamId = generateUuid();
        const notifications: CodexProviderCollectResult['notifications'] = [];
        const textParts: string[] = [];
        const errors: string[] = [];
        let receivedAgentDelta = false;
        const client: CodexProviderClient = {
            sendToken: (_streamId, token) => {
                if (!token) {
                    return;
                }
                if (token.type === 'approval-request') {
                    this.handleApprovalResponse({
                        type: 'approval-response',
                        requestId: token.requestId,
                        decision: this.defaultDecision(token.method)
                    });
                    return;
                }
                if (token.type === 'user-input-request') {
                    this.handleUserInputResponse({
                        type: 'user-input-response',
                        requestId: token.requestId,
                        answers: {}
                    });
                    return;
                }
                if (token.type !== 'notification') {
                    return;
                }
                notifications.push(token);
                const text = this.notificationToCollectedText(token, receivedAgentDelta);
                if (text) {
                    textParts.push(text);
                    if (token.method === 'item/agentMessage/delta') {
                        receivedAgentDelta = true;
                    }
                }
            },
            sendError: (_streamId, error) => {
                errors.push(error.message);
            }
        };
        await this.sendMessages(streamId, request, client);
        if (errors.length > 0) {
            throw new Error(errors.join('\n'));
        }
        return {
            text: textParts.join(''),
            notifications
        };
    }

    async login(request: CodexProviderLoginRequest): Promise<CodexProviderLoginResult> {
        await this.ensureServer(request.executablePath, request.profile, request.cwd);
        await this.sendRequest('account/login/start', { type: 'chatgpt' });
        return {
            status: 'started',
            message: nls.localize('theia/ai/codex-provider/loginStarted',
                'ChatGPT login was started through Codex Provider. Complete the browser flow if one was opened.')
        };
    }

    async restart(request: CodexProviderStatusRequest): Promise<CodexProviderBackendStatus> {
        this.stopServer();
        try {
            await this.ensureServer(request.executablePath, request.profile, request.cwd);
        } catch (error) {
            const executable = this.resolveExecutable(request.executablePath);
            return {
                available: false,
                executablePath: executable,
                appServer: false,
                message: error instanceof Error ? error.message : String(error)
            };
        }
        return this.getStatus(request);
    }

    async getStatus(request: CodexProviderStatusRequest): Promise<CodexProviderBackendStatus> {
        const executable = this.resolveExecutable(request.executablePath);
        try {
            const version = await this.readExecutableVersion(executable, request.cwd);
            const details = await this.readAppServerStatusDetails(request).catch(error => ({
                appServer: false,
                message: error instanceof Error ? error.message : String(error)
            }));
            return {
                available: true,
                executablePath: executable,
                version,
                ...details
            };
        } catch (error) {
            return {
                available: false,
                executablePath: executable,
                appServer: false,
                message: error instanceof Error ? error.message : String(error)
            };
        }
    }

    async invokeAppServerRequest(request: CodexProviderAppServerRequest): Promise<unknown> {
        await this.ensureServer(request.executablePath, request.profile, request.cwd);
        return this.sendRequest(request.method, request.params ?? {}, request.timeoutMs);
    }

    async compactThread(request: CodexProviderThreadActionRequest): Promise<CodexProviderThreadActionResult> {
        await this.loadSessionThreads();
        const sessionKey = this.buildSessionKey(request);
        const threadId = this.sessionThreads.get(sessionKey);
        if (!threadId) {
            return {
                status: 'no-thread',
                message: nls.localize('theia/ai/codex-provider/noThreadToCompact', 'There is no Codex Provider thread associated with this chat yet.')
            };
        }
        try {
            await this.ensureServer(request.executablePath, request.profile, request.cwd, request.sessionId);
            await this.sendThreadCompactRequest(threadId);
            return {
                status: 'completed',
                threadId,
                message: nls.localize('theia/ai/codex-provider/threadCompacted', 'Codex Provider compacted the current thread context.')
            };
        } catch (error) {
            return {
                status: 'failed',
                threadId,
                message: error instanceof Error ? error.message : String(error)
            };
        }
    }

    async resetThread(request: CodexProviderThreadActionRequest): Promise<CodexProviderThreadActionResult> {
        await this.loadSessionThreads();
        const sessionKey = this.buildSessionKey(request);
        const threadId = this.sessionThreads.get(sessionKey);
        this.sessionThreads.delete(sessionKey);
        await this.saveSessionThreads();
        return {
            status: threadId ? 'completed' : 'no-thread',
            threadId,
            message: threadId
                ? nls.localize('theia/ai/codex-provider/threadReset', 'The next Codex Provider turn in this chat will start a new thread.')
                : nls.localize('theia/ai/codex-provider/noThreadToReset', 'This chat did not have a Codex Provider thread yet.')
        };
    }

    async setThread(request: CodexProviderSetThreadRequest): Promise<CodexProviderThreadActionResult> {
        await this.loadSessionThreads();
        const threadId = request.threadId.trim();
        if (!threadId) {
            return {
                status: 'failed',
                message: nls.localize('theia/ai/codex-provider/emptyThreadId', 'Thread id cannot be empty.')
            };
        }
        const sessionKey = this.buildSessionKey(request);
        this.sessionThreads.set(sessionKey, threadId);
        await this.saveSessionThreads();
        this.loadedThreads.delete(threadId);
        return {
            status: 'completed',
            threadId,
            message: nls.localize('theia/ai/codex-provider/threadSelected', 'This chat now uses Codex Provider thread {0}.', threadId)
        };
    }

    cancel(streamId: string): void {
        const stream = this.activeStreams.get(streamId);
        if (stream?.threadId) {
            this.sendRequest('turn/interrupt', { threadId: stream.threadId, turnId: stream.turnId })
                .catch(error => this.logger.debug('Codex Provider turn interrupt failed:', error));
        }
        this.client?.sendToken(streamId, undefined);
        stream?.complete();
        this.cleanupStream(streamId);
    }

    handleApprovalResponse(response: CodexProviderApprovalResponseMessage): void {
        this.pendingServerResponses.get(response.requestId)?.(response);
    }

    handleUserInputResponse(response: CodexProviderUserInputResponseMessage): void {
        this.pendingServerResponses.get(response.requestId)?.(response);
    }

    protected async sendMessages(streamId: string, request: CodexProviderBackendRequest, client: CodexProviderClient | undefined): Promise<void> {
        let completed = false;
        const completePromise = new Promise<void>(resolve => {
            this.activeStreams.set(streamId, {
                streamId,
                client,
                complete: () => {
                    completed = true;
                    resolve();
                }
            });
        });

        try {
            const cwd = request.options?.cwd || process.cwd();
            await this.ensureServer(request.executablePath, request.profile, cwd, request.sessionId);
            await this.loadSessionThreads();
            this.activeStreamId = streamId;
            this.activeStreams.get(streamId)!.cwd = cwd;
            const workspaceBefore = await this.snapshotWorkspaceFiles(cwd);

            const sessionKey = request.sessionId ? `${this.processKey}:${request.sessionId}` : undefined;
            let threadId = sessionKey ? this.sessionThreads.get(sessionKey) : undefined;
            if (threadId && !this.loadedThreads.has(threadId)) {
                threadId = await this.tryResumeThread(threadId, request.options, cwd);
                if (threadId && sessionKey) {
                    this.sessionThreads.set(sessionKey, threadId);
                    await this.saveSessionThreads();
                }
            }
            if (!threadId) {
                const threadResult = await this.sendRequest('thread/start', this.buildThreadStartParams(request.options, cwd));
                threadId = this.extractThreadId(threadResult);
                if (threadId && sessionKey) {
                    this.sessionThreads.set(sessionKey, threadId);
                    await this.saveSessionThreads();
                }
            }
            if (!threadId) {
                throw new Error(nls.localize('theia/ai/codex-provider/missingThreadId', 'Codex Provider did not return a thread id.'));
            }
            this.loadedThreads.add(threadId);
            this.activeStreams.get(streamId)!.threadId = threadId;

            let turnResult: unknown;
            try {
                turnResult = await this.startTurnWithFallback(threadId, request.prompt, request.input, request.options, cwd);
            } catch (error) {
                if (this.isCancellationError(error) && this.activeStreams.get(streamId)?.receivedNotification) {
                    await completePromise;
                    return;
                }
                throw error;
            }
            const turnId = this.extractTurnId(turnResult);
            if (turnId) {
                this.activeStreams.get(streamId)!.turnId = turnId;
                this.turnToStream.set(turnId, streamId);
            }

            await completePromise;
            await this.sendSyntheticFileChanges(streamId, cwd, workspaceBefore);
            client?.sendToken(streamId, undefined);
        } catch (error) {
            this.logger.error('Codex Provider error:', error);
            const normalizedError = error instanceof Error ? error : new Error(String(error));
            client?.sendToken(streamId, {
                type: 'notification',
                method: 'error',
                params: {
                    message: normalizedError.message
                }
            });
            client?.sendError(streamId, normalizedError);
        } finally {
            if (!completed) {
                client?.sendToken(streamId, undefined);
            }
            this.cleanupStream(streamId);
        }
    }

    protected async startTurnWithFallback(
        threadId: string,
        prompt: string,
        input: CodexProviderInputItem[] | undefined,
        options: Partial<CodexProviderOptions> | undefined,
        cwd: string
    ): Promise<unknown> {
        const attempts = [
            this.buildTurnStartParams(threadId, prompt, input, options, cwd, true),
            this.buildTurnStartParams(threadId, prompt, input, options, cwd, false)
        ];
        try {
            return await this.sendRequest('turn/start', attempts[0]);
        } catch (error) {
            if (!this.shouldRetryTurnStartWithoutOverrides(error)) {
                throw error;
            }
        }
        return this.sendRequest('turn/start', attempts[1]);
    }

    protected buildProcessKey(executablePath?: string, profile?: string, cwd?: string): string {
        return JSON.stringify({ executablePath: this.resolveExecutable(executablePath), profile: profile || '', cwd: cwd || '' });
    }

    protected buildSessionKey(request: CodexProviderThreadActionRequest): string {
        return `${this.buildProcessKey(request.executablePath, request.profile, request.cwd)}:${request.sessionId}`;
    }

    protected async ensureServer(executablePath?: string, profile?: string, cwd?: string, sessionId?: string): Promise<void> {
        const resolvedEnvironment = await this.resolveSpawnEnvironment({ executablePath, profile, cwd, sessionId });
        const key = this.buildServerProcessKey(executablePath, profile, cwd, sessionId, resolvedEnvironment.fingerprint);
        if (this.process && !this.process.killed && this.processKey === key && this.initializePromise) {
            return this.initializePromise;
        }

        this.stopServer();
        this.processKey = key;
        this.stderrTail = [];
        const executable = this.resolveExecutable(executablePath);
        const spawnInfo = this.buildSpawnInfo(executable, this.buildServerArgs(profile));

        const childProcess = spawn(spawnInfo.command, spawnInfo.args, {
            cwd: cwd || process.cwd(),
            env: resolvedEnvironment.env,
            shell: spawnInfo.shell,
            windowsHide: true
        });
        this.process = childProcess;

        childProcess.stdout.setEncoding('utf8');
        childProcess.stdout.on('data', chunk => this.handleStdout(String(chunk)));
        childProcess.stderr.setEncoding('utf8');
        childProcess.stderr.on('data', chunk => this.handleStderr(String(chunk)));
        childProcess.on('exit', (code, signal) => this.handleProcessExit(childProcess, code, signal));
        childProcess.on('error', error => {
            if (childProcess === this.process) {
                this.failAll(error);
            }
        });

        this.initializePromise = this.initializeServer();
        return this.initializePromise;
    }

    protected buildServerProcessKey(
        executablePath: string | undefined,
        profile: string | undefined,
        cwd: string | undefined,
        sessionId: string | undefined,
        environmentFingerprint: string
    ): string {
        return JSON.stringify({
            executablePath: this.resolveExecutable(executablePath),
            profile: profile || '',
            cwd: cwd || '',
            sessionId: sessionId || '',
            environmentFingerprint
        });
    }

    protected async resolveSpawnEnvironment(context: CodexProviderSpawnEnvironmentContext): Promise<ResolvedSpawnEnvironment> {
        const env: NodeJS.ProcessEnv = { ...process.env };
        const pathEntries: string[] = [];
        const fingerprints: string[] = [];
        const contributions = this.spawnEnvironmentContributions?.getContributions() ?? [];
        for (const contribution of contributions) {
            let fragment: CodexProviderSpawnEnvironmentFragment | undefined;
            try {
                fragment = await contribution.contributeCodexProviderSpawnEnvironment(context);
            } catch (error) {
                this.logger.warn('Codex Provider spawn environment contribution failed:', error);
                continue;
            }
            if (!fragment) {
                continue;
            }
            for (const [key, value] of Object.entries(fragment.env ?? {})) {
                if (value === undefined) {
                    delete env[key];
                } else {
                    env[key] = value;
                }
            }
            pathEntries.push(...(fragment.pathEntries ?? []).filter(entry => !!entry));
            if (fragment.fingerprint) {
                fingerprints.push(fragment.fingerprint);
            }
        }
        this.applyPathEntries(env, pathEntries);
        return {
            env,
            fingerprint: JSON.stringify({
                sessionId: context.sessionId || '',
                pathEntries,
                fingerprints
            })
        };
    }

    protected applyPathEntries(env: NodeJS.ProcessEnv, pathEntries: string[]): void {
        if (pathEntries.length === 0) {
            return;
        }
        const pathKey = this.findPathKey(env);
        const existingEntries = (env[pathKey] ?? '').split(path.delimiter).filter(entry => !!entry);
        const mergedEntries: string[] = [];
        const seen = new Set<string>();
        for (const entry of [...pathEntries, ...existingEntries]) {
            const key = process.platform === 'win32' ? entry.toLowerCase() : entry;
            if (!seen.has(key)) {
                seen.add(key);
                mergedEntries.push(entry);
            }
        }
        env[pathKey] = mergedEntries.join(path.delimiter);
    }

    protected findPathKey(env: NodeJS.ProcessEnv): string {
        const existing = Object.keys(env).find(key => key.toLowerCase() === 'path');
        return existing ?? 'PATH';
    }

    protected stopServer(): void {
        const oldProcess = this.process;
        this.process = undefined;
        if (oldProcess && !oldProcess.killed) {
            oldProcess.kill();
        }
        this.initializePromise = undefined;
        for (const pending of this.pendingRequests.values()) {
            if (pending.timeout) {
                clearTimeout(pending.timeout);
            }
        }
        this.pendingRequests.clear();
        this.pendingServerResponses.clear();
        this.loadedThreads.clear();
    }

    protected async initializeServer(): Promise<void> {
        await this.sendRequest('initialize', {
            clientInfo: { name: 'theia-codex-provider', version: '1.0.0' },
            capabilities: { experimentalApi: true }
        });
        this.sendNotification('initialized', {});
    }

    protected buildServerArgs(profile?: string): string[] {
        const args = ['app-server', '--listen', 'stdio://'];
        if (profile?.trim()) {
            args.push('--profile', profile.trim());
        }
        return args;
    }

    protected buildThreadStartParams(options: Partial<CodexProviderOptions> | undefined, cwd: string): Record<string, unknown> {
        const params: Record<string, unknown> = {
            cwd,
            approvalPolicy: options?.approvalPolicy ?? 'on-request',
            approvalsReviewer: 'user',
            sandbox: options?.sandboxMode ?? 'read-only',
            personality: 'pragmatic',
            serviceName: 'CyberVinci',
            ephemeral: false,
            threadSource: 'user'
        };
        this.addIfTruthy(params, 'model', options?.model);
        this.addIfTruthy(params, 'serviceTier', options?.serviceTier);
        this.addIfTruthy(params, 'config', this.buildThreadConfig(options));
        return params;
    }

    protected buildThreadResumeParams(threadId: string, options: Partial<CodexProviderOptions> | undefined, cwd: string): Record<string, unknown> {
        const params: Record<string, unknown> = {
            threadId,
            cwd,
            approvalPolicy: options?.approvalPolicy ?? 'on-request',
            approvalsReviewer: 'user',
            sandbox: options?.sandboxMode ?? 'read-only',
            personality: 'pragmatic'
        };
        this.addIfTruthy(params, 'model', options?.model);
        this.addIfTruthy(params, 'serviceTier', options?.serviceTier);
        this.addIfTruthy(params, 'config', this.buildThreadConfig(options));
        return params;
    }

    protected buildThreadConfig(options: Partial<CodexProviderOptions> | undefined): Record<string, unknown> | undefined {
        const config: Record<string, unknown> = {};
        this.addIfTruthy(config, 'model_verbosity', options?.verbosity);
        if (options?.webSearch) {
            config.web_search = options.webSearch;
            if (options.webSearch !== 'disabled') {
                config.tools = {
                    web_search: {
                        context_size: options.webSearchContextSize ?? 'medium',
                        allowed_domains: undefined,
                        location: undefined
                    },
                    view_image: true
                };
            }
        }
        return Object.keys(config).length > 0 ? config : undefined;
    }

    protected async tryResumeThread(threadId: string, options: Partial<CodexProviderOptions> | undefined, cwd: string): Promise<string | undefined> {
        try {
            const resumeResult = await this.sendRequest('thread/resume', this.buildThreadResumeParams(threadId, options, cwd));
            const resumedThreadId = this.extractThreadId(resumeResult) || threadId;
            this.loadedThreads.add(resumedThreadId);
            return resumedThreadId;
        } catch (error) {
            this.logger.debug('Codex Provider thread resume failed; starting a new thread:', error);
            return undefined;
        }
    }

    protected async sendThreadCompactRequest(threadId: string): Promise<void> {
        const attempts = [
            { method: 'thread/compact/start', params: { threadId } },
            { method: 'thread/compact/start', params: { thread_id: threadId } },
            { method: 'thread/compact', params: { threadId } },
            { method: 'thread/compact', params: { thread_id: threadId } }
        ];
        let lastError: unknown;
        for (const attempt of attempts) {
            try {
                await this.sendRequest(attempt.method, attempt.params, 15000);
                return;
            } catch (error) {
                lastError = error;
                if (!this.shouldRetryTurnStartWithoutOverrides(error)) {
                    break;
                }
            }
        }
        throw lastError instanceof Error ? lastError : new Error(String(lastError));
    }

    protected buildTurnStartParams(
        threadId: string,
        prompt: string,
        input: CodexProviderInputItem[] | undefined,
        options: Partial<CodexProviderOptions> | undefined,
        cwd: string,
        includeOverrides: boolean
    ): Record<string, unknown> {
        const params: Record<string, unknown> = {
            threadId,
            cwd,
            input: this.buildTurnInput(prompt, input, cwd)
        };
        if (includeOverrides) {
            this.addIfTruthy(params, 'model', options?.model);
            this.addIfTruthy(params, 'effort', options?.reasoningEffort);
            this.addIfTruthy(params, 'serviceTier', options?.serviceTier);
            this.addIfTruthy(params, 'approvalPolicy', options?.approvalPolicy ?? 'on-request');
            params.approvalsReviewer = 'user';
            params.sandboxPolicy = this.buildSandboxPolicy(options?.sandboxMode, cwd);
        }
        return params;
    }

    protected buildTurnInput(prompt: string, input: CodexProviderInputItem[] | undefined, cwd: string): CodexProviderInputItem[] {
        const items = input?.length ? input : [{ type: 'text' as const, text: prompt, text_elements: [] }];
        return [
            { type: 'text', text: `The IDE working directory is "${cwd}".`, text_elements: [] },
            ...items.map(item => item.type === 'text' ? { ...item, text_elements: item.text_elements ?? [] } : item)
        ];
    }

    protected buildSandboxPolicy(mode: string | undefined, cwd: string): Record<string, unknown> {
        if (mode === 'danger-full-access') {
            return { type: 'dangerFullAccess' };
        }
        if (mode === 'workspace-write') {
            return {
                type: 'workspaceWrite',
                writableRoots: [cwd],
                networkAccess: false,
                excludeTmpdirEnvVar: false,
                excludeSlashTmp: false
            };
        }
        return { type: 'readOnly', networkAccess: false };
    }

    protected addIfTruthy(target: Record<string, unknown>, key: string, value: unknown): void {
        if (value !== undefined && value !== '') {
            target[key] = value;
        }
    }

    protected async readAppServerStatusDetails(request: CodexProviderStatusRequest): Promise<Partial<CodexProviderBackendStatus>> {
        if (!this.process || this.process.killed || !this.initializePromise) {
            return { appServer: false };
        }
        if (!this.matchesCurrentServer(request.executablePath, request.profile, request.cwd)) {
            return { appServer: false };
        }
        await this.initializePromise;
        const [account, models, capabilities, requirements] = await Promise.all([
            this.trySendRequest('account/read', {}),
            this.trySendRequest('model/list', {}),
            this.trySendRequest('modelProvider/capabilities/read', {}),
            this.trySendRequest('configRequirements/read', {})
        ]);
        return {
            appServer: true,
            ...this.extractAccountStatus(account),
            models: this.extractModelIds(models),
            capabilities: this.extractCapabilities(capabilities),
            configurationRequired: this.extractConfigurationRequirements(requirements)
        };
    }

    protected matchesCurrentServer(executablePath?: string, profile?: string, cwd?: string): boolean {
        try {
            const current = JSON.parse(this.processKey) as Record<string, string>;
            return current.executablePath === this.resolveExecutable(executablePath) &&
                (current.profile || '') === (profile || '') &&
                (current.cwd || '') === (cwd || '');
        } catch {
            return this.processKey === this.buildProcessKey(executablePath, profile, cwd);
        }
    }

    protected async trySendRequest(method: string, params: unknown): Promise<unknown> {
        try {
            return await this.sendRequest(method, params, CODEX_CLI_OPTIONAL_STATUS_REQUEST_TIMEOUT);
        } catch (error) {
            this.logger.debug(`Optional Codex Provider status request failed: ${method}`, error);
            return undefined;
        }
    }

    protected sendRequest(method: string, params: unknown, timeoutMs?: number): Promise<unknown> {
        const id = String(++this.requestSeq);
        const promise = new Promise<unknown>((resolve, reject) => {
            const pending: PendingRpcRequest = { resolve, reject };
            if (timeoutMs !== undefined) {
                pending.timeout = setTimeout(() => {
                    this.pendingRequests.delete(id);
                    reject(new Error(nls.localize('theia/ai/codex-provider/appServerRequestTimedOut', 'Codex Provider app-server request timed out: {0}', method)));
                }, timeoutMs);
            }
            this.pendingRequests.set(id, pending);
        });
        this.writeMessage({ id, method, params });
        return promise;
    }

    protected sendNotification(method: string, params: unknown): void {
        this.writeMessage({ method, params });
    }

    protected sendResponse(id: string | number, result: unknown): void {
        this.writeMessage({ id, result });
    }

    protected writeMessage(message: unknown): void {
        if (!this.process) {
            throw new Error(nls.localize('theia/ai/codex-provider/appServerNotRunning', 'Codex Provider app-server is not running.'));
        }
        this.traceProtocol('out', message);
        this.process.stdin.write(`${JSON.stringify(message)}\n`);
    }

    protected handleStdout(chunk: string): void {
        this.stdoutBuffer += chunk;
        let index = this.stdoutBuffer.indexOf('\n');
        while (index >= 0) {
            const line = this.stdoutBuffer.slice(0, index).trim();
            this.stdoutBuffer = this.stdoutBuffer.slice(index + 1);
            if (line) {
                this.handleLine(line);
            }
            index = this.stdoutBuffer.indexOf('\n');
        }
    }

    protected handleStderr(chunk: string): void {
        this.stderrBuffer += chunk;
        let index = this.stderrBuffer.indexOf('\n');
        while (index >= 0) {
            const line = this.stderrBuffer.slice(0, index).trim();
            this.stderrBuffer = this.stderrBuffer.slice(index + 1);
            if (line) {
                this.stderrTail.push(line);
                this.stderrTail = this.stderrTail.slice(-10);
                this.logger.debug('Codex Provider stderr:', line);
            }
            index = this.stderrBuffer.indexOf('\n');
        }
    }

    protected handleLine(line: string): void {
        this.traceProtocol('in', line);
        let message: JsonRpcMessage;
        try {
            message = JSON.parse(line);
        } catch (error) {
            this.logger.debug('Ignoring non-JSON Codex Provider output:', line, error);
            return;
        }

        if (message.id !== undefined && !message.method) {
            this.handleResponse(message);
        } else if (message.id !== undefined && message.method) {
            this.handleServerRequest(message);
        } else if (message.method) {
            this.handleNotification(message);
        }
    }

    protected handleResponse(message: JsonRpcMessage): void {
        const id = String(message.id);
        const pending = this.pendingRequests.get(id);
        if (!pending) {
            return;
        }
        this.pendingRequests.delete(id);
        if (pending.timeout) {
            clearTimeout(pending.timeout);
        }
        if (message.error) {
            pending.reject(new Error(this.errorToString(message.error)));
        } else {
            pending.resolve(message.result);
        }
    }

    protected handleServerRequest(message: JsonRpcMessage): void {
        if (message.id === undefined || !message.method) {
            return;
        }
        if (message.method === 'item/commandExecution/requestApproval' ||
            message.method === 'item/fileChange/requestApproval' ||
            message.method === 'execCommandApproval' ||
            message.method === 'applyPatchApproval' ||
            message.method === 'item/permissions/requestApproval') {
            this.requestApproval(message);
        } else if (message.method === 'item/tool/requestUserInput' || message.method === 'mcpServer/elicitation/request') {
            this.requestUserInput(message);
        } else {
            this.sendResponse(message.id, {});
        }
    }

    protected requestApproval(message: JsonRpcMessage): void {
        const streamId = this.findStreamId(message.params);
        const client = this.clientForStream(streamId);
        if (!streamId || !client || message.id === undefined || !message.method) {
            this.sendResponse(message.id!, this.buildApprovalResponse(message.method || '', message.params, this.defaultDecision(message.method || '')));
            return;
        }
        const requestId = generateUuid();
        this.pendingServerResponses.set(requestId, response => {
            this.pendingServerResponses.delete(requestId);
            const approval = response as CodexProviderApprovalResponseMessage;
            this.sendResponse(message.id!, this.buildApprovalResponse(message.method!, message.params, approval.decision));
        });
        client.sendToken(streamId, this.buildApprovalRequest(requestId, message.method, message.params));
    }

    protected requestUserInput(message: JsonRpcMessage): void {
        const streamId = this.findStreamId(message.params);
        const client = this.clientForStream(streamId);
        if (!streamId || !client || message.id === undefined) {
            this.sendResponse(message.id!, { answers: {} });
            return;
        }
        const requestId = generateUuid();
        this.pendingServerResponses.set(requestId, response => {
            this.pendingServerResponses.delete(requestId);
            const userInput = response as CodexProviderUserInputResponseMessage;
            this.sendResponse(message.id!, { answers: userInput.answers });
        });
        client.sendToken(streamId, {
            type: 'user-input-request',
            requestId,
            title: nls.localize('theia/ai/codex-provider/inputTitle', 'Codex Provider input'),
            questions: this.buildUserInputQuestions(message.params)
        });
    }

    protected handleNotification(message: JsonRpcMessage): void {
        const streamId = this.findStreamId(message.params);
        const turnId = this.extractTurnId(message.params);
        if (message.method === 'turn/started' && turnId && streamId) {
            this.turnToStream.set(turnId, streamId);
            const stream = this.activeStreams.get(streamId);
            if (stream) {
                stream.turnId = turnId;
            }
        }

        const client = this.clientForStream(streamId);
        if (streamId && client && message.method) {
            const stream = this.activeStreams.get(streamId);
            if (stream) {
                stream.receivedNotification = true;
            }
            client.sendToken(streamId, { type: 'notification', method: message.method, params: message.params });
        }

        if (message.method === 'turn/completed' || message.method === 'turn/failed' || message.method === 'task_complete') {
            if (streamId) {
                this.activeStreams.get(streamId)?.complete();
            }
        } else if (message.method === 'account/login/completed' && this.activeStreamId) {
            this.clientForStream(this.activeStreamId)?.sendToken(this.activeStreamId, { type: 'login-event', method: message.method, params: message.params });
        }
    }

    protected clientForStream(streamId: string | undefined): CodexProviderClient | undefined {
        return streamId ? this.activeStreams.get(streamId)?.client ?? this.client : this.client;
    }

    protected notificationToCollectedText(message: { method: string; params?: unknown }, receivedAgentDelta: boolean): string {
        const { method, params } = message;
        if (method === 'item/agentMessage/delta') {
            return this.readString(params, 'delta');
        }
        if (method === 'item/completed' && !receivedAgentDelta) {
            const item = this.readObject(params, 'item');
            const type = this.readString(item, 'type');
            if (type === 'agent_message' || type === 'agentMessage') {
                return this.readString(item, 'text') || this.readString(item, 'message');
            }
        }
        if (method === 'task_complete' && !receivedAgentDelta) {
            return this.readString(params, 'last_agent_message');
        }
        if (method === 'turn/failed' || method === 'error') {
            return this.readNotificationMessage(params);
        }
        return '';
    }

    protected readNotificationMessage(params: unknown): string {
        if (typeof params === 'string') {
            return params;
        }
        const message = this.readString(params, 'message') || this.readString(params, 'error') || this.readString(params, 'reason');
        if (message) {
            return message;
        }
        try {
            return JSON.stringify(params);
        } catch {
            return '';
        }
    }

    protected buildApprovalRequest(requestId: string, method: string, params: unknown): CodexProviderApprovalRequestMessage {
        const command = this.readString(params, 'command') || this.readArrayString(params, 'command');
        const isFileChange = method === 'item/fileChange/requestApproval' || method === 'applyPatchApproval';
        const isPermissions = method === 'item/permissions/requestApproval';
        const changes = this.readFileChanges(params);
        return {
            type: 'approval-request',
            requestId,
            method,
            approvalKind: isPermissions ? 'permissions' : isFileChange ? 'file-change' : 'command',
            title: isPermissions
                ? nls.localize('theia/ai/codex-provider/permissionsApprovalQuestion', 'Codex Provider is requesting additional permissions. Allow it?')
                : isFileChange
                ? nls.localize('theia/ai/codex-provider/fileApprovalQuestion', 'Codex Provider wants to apply file changes. Allow it?')
                : nls.localize('theia/ai/codex-provider/commandApprovalQuestion', 'Codex Provider wants approval to continue. Allow it?'),
            command,
            changes: changes.length > 0 ? changes : undefined,
            reason: this.readString(params, 'reason'),
            workingDirectory: this.readString(params, 'cwd'),
            permissions: this.readObject(params, 'permissions'),
            grantRoot: this.readString(params, 'grantRoot'),
            options: this.buildApprovalOptions(method)
        };
    }

    protected buildApprovalOptions(method: string): CodexProviderQuestionOption[] {
        const isFileChange = method === 'item/fileChange/requestApproval' || method === 'applyPatchApproval';
        const isPermissions = method === 'item/permissions/requestApproval';
        if (isPermissions) {
            return [
                { text: nls.localize('theia/ai/codex-provider/allowTurn', 'Allow for this turn'), value: 'accept' },
                { text: nls.localize('theia/ai/codex-provider/allowSession', 'Allow for this session'), value: 'acceptForSession' },
                { text: nls.localizeByDefault('Deny'), value: 'cancel' }
            ];
        }
        return [
            { text: nls.localizeByDefault('Allow'), value: 'accept' },
            { text: nls.localize('theia/ai/codex-provider/allowSession', 'Allow for this session'), value: 'acceptForSession' },
            { text: nls.localizeByDefault('Deny'), value: isFileChange ? 'decline' : 'cancel' }
        ];
    }

    protected buildApprovalResponse(method: string, params: unknown, decision: string | object): Record<string, unknown> {
        if (method === 'item/permissions/requestApproval') {
            if (decision === 'accept' || decision === 'acceptForSession') {
                return {
                    permissions: this.toGrantedPermissions(this.readObject(params, 'permissions')),
                    scope: decision === 'acceptForSession' ? 'session' : 'turn',
                    strictAutoReview: false
                };
            }
            return {
                permissions: {},
                scope: 'turn',
                strictAutoReview: false
            };
        }
        if (method === 'execCommandApproval' || method === 'applyPatchApproval') {
            return { decision: this.toLegacyReviewDecision(decision) };
        }
        return { decision };
    }

    protected toLegacyReviewDecision(decision: string | object): string | object {
        if (decision === 'accept') {
            return 'approved';
        }
        if (decision === 'acceptForSession') {
            return 'approved_for_session';
        }
        if (decision === 'decline') {
            return 'denied';
        }
        if (decision === 'cancel') {
            return 'abort';
        }
        return decision;
    }

    protected toGrantedPermissions(requestedPermissions: Record<string, unknown>): Record<string, unknown> {
        const granted: Record<string, unknown> = {};
        const fileSystem = requestedPermissions.fileSystem;
        const network = requestedPermissions.network;
        if (fileSystem) {
            granted.fileSystem = fileSystem;
        }
        if (network) {
            granted.network = network;
        }
        return granted;
    }

    protected buildUserInputQuestions(params: unknown): CodexProviderUserInputQuestion[] {
        return this.readArray(params, 'questions').map((question, index) => {
            const id = this.readString(question, 'id') || `question_${index}`;
            const options = this.readArray(question, 'options').map(option => ({
                text: this.readString(option, 'label') || this.readString(option, 'text'),
                value: this.readString(option, 'label') || this.readString(option, 'text'),
                description: this.readString(option, 'description')
            })).filter(option => option.text);
            return {
                id,
                header: this.readString(question, 'header'),
                question: this.readString(question, 'question') || id,
                options
            };
        });
    }

    protected defaultDecision(method: string): string {
        return method === 'item/fileChange/requestApproval' || method === 'applyPatchApproval' ? 'decline' : 'cancel';
    }

    protected readFileChanges(source: unknown): CodexProviderFileUpdateChange[] {
        const item = this.readObject(source, 'item');
        const changes = this.readArray(source, 'changes').length > 0 ? this.readArray(source, 'changes') : this.readArray(item, 'changes');
        return changes.map(change => ({
            path: this.readString(change, 'path'),
            kind: this.readChangeKind(change),
            diff: this.readString(change, 'diff')
        })).filter(change => !!change.path);
    }

    protected findStreamId(params: unknown): string | undefined {
        const turnId = this.readString(params, 'turnId') || this.readString(params, 'turn_id') || this.extractTurnId(params);
        if (turnId && this.turnToStream.has(turnId)) {
            return this.turnToStream.get(turnId);
        }
        const threadId = this.readString(params, 'threadId') || this.readString(params, 'thread_id');
        if (threadId) {
            for (const stream of this.activeStreams.values()) {
                if (stream.threadId === threadId) {
                    return stream.streamId;
                }
            }
        }
        return this.activeStreamId;
    }

    protected isCancellationError(error: unknown): boolean {
        return this.errorToString(error).toLowerCase() === 'canceled' || this.errorToString(error).toLowerCase() === 'cancelled';
    }

    protected shouldRetryTurnStartWithoutOverrides(error: unknown): boolean {
        const message = this.errorToString(error).toLowerCase();
        return message.includes('invalid') ||
            message.includes('unknown') ||
            message.includes('unrecognized') ||
            message.includes('unsupported') ||
            message.includes('unexpected');
    }

    protected cleanupStream(streamId: string): void {
        const stream = this.activeStreams.get(streamId);
        if (stream?.turnId) {
            this.turnToStream.delete(stream.turnId);
        }
        this.activeStreams.delete(streamId);
        if (this.activeStreamId === streamId) {
            this.activeStreamId = undefined;
        }
    }

    protected async sendSyntheticFileChanges(streamId: string, cwd: string, before: Map<string, WorkspaceFileSnapshot>): Promise<void> {
        const after = await this.snapshotWorkspaceFiles(cwd);
        const changes: CodexProviderFileUpdateChange[] = [];
        for (const [filePath, afterSnapshot] of after) {
            const beforeSnapshot = before.get(filePath);
            if (!beforeSnapshot) {
                changes.push({
                    path: filePath,
                    kind: 'add',
                    diff: this.buildSyntheticUnifiedDiff(filePath, 'add', undefined, afterSnapshot)
                });
            } else if (beforeSnapshot.content !== afterSnapshot.content ||
                beforeSnapshot.mtimeMs !== afterSnapshot.mtimeMs ||
                beforeSnapshot.size !== afterSnapshot.size) {
                changes.push({
                    path: filePath,
                    kind: 'modify',
                    diff: this.buildSyntheticUnifiedDiff(filePath, 'modify', beforeSnapshot, afterSnapshot)
                });
            }
        }
        for (const [filePath, beforeSnapshot] of before) {
            if (!after.has(filePath)) {
                changes.push({
                    path: filePath,
                    kind: 'delete',
                    diff: this.buildSyntheticUnifiedDiff(filePath, 'delete', beforeSnapshot, undefined)
                });
            }
        }
        if (changes.length === 0) {
            return;
        }
        this.clientForStream(streamId)?.sendToken(streamId, {
            type: 'notification',
            method: 'item/completed',
            params: {
                item: {
                    type: 'fileChange',
                    id: 'codex-provider-observed-file-change',
                    cwd,
                    changes,
                    status: 'completed'
                }
            }
        });
    }

    protected buildSyntheticUnifiedDiff(
        filePath: string,
        kind: 'add' | 'modify' | 'delete',
        before: WorkspaceFileSnapshot | undefined,
        after: WorkspaceFileSnapshot | undefined
    ): string {
        const normalizedPath = filePath.replace(/\\/g, '/');
        const header = kind === 'add'
            ? `--- /dev/null\n+++ b/${normalizedPath}\n@@\n`
            : kind === 'delete'
            ? `--- a/${normalizedPath}\n+++ /dev/null\n@@\n`
            : `--- a/${normalizedPath}\n+++ b/${normalizedPath}\n@@\n`;
        const beforeLines = kind !== 'add' ? this.toSyntheticDiffLines(before?.content ?? '', '-') : '';
        const afterLines = kind !== 'delete' ? this.toSyntheticDiffLines(after?.content ?? '', '+') : '';
        return this.truncateSyntheticDiff(`${header}${beforeLines}${beforeLines && afterLines ? '\n' : ''}${afterLines}`);
    }

    protected toSyntheticDiffLines(content: string, prefix: '-' | '+'): string {
        if (!content) {
            return '';
        }
        return content.replace(/\r\n/g, '\n').split('\n').map(line => `${prefix}${line}`).join('\n');
    }

    protected truncateSyntheticDiff(diff: string): string {
        if (diff.length <= CODEX_CLI_SYNTHETIC_FILE_CHANGE_MAX_DIFF_SIZE) {
            return diff;
        }
        return `${diff.slice(0, CODEX_CLI_SYNTHETIC_FILE_CHANGE_MAX_DIFF_SIZE)}\n... [diff truncated by CyberVinci]`;
    }

    protected async snapshotWorkspaceFiles(cwd: string): Promise<Map<string, WorkspaceFileSnapshot>> {
        const result = new Map<string, WorkspaceFileSnapshot>();
        await this.collectWorkspaceFileSnapshots(cwd, cwd, result, 0);
        return result;
    }

    protected async collectWorkspaceFileSnapshots(
        root: string,
        directory: string,
        result: Map<string, WorkspaceFileSnapshot>,
        depth: number
    ): Promise<void> {
        if (result.size >= CODEX_CLI_SYNTHETIC_FILE_CHANGE_MAX_FILES || depth > CODEX_CLI_SYNTHETIC_FILE_CHANGE_MAX_DEPTH) {
            return;
        }
        let entries: fs.Dirent[];
        try {
            entries = await fs.promises.readdir(directory, { withFileTypes: true });
        } catch {
            return;
        }
        for (const entry of entries) {
            if (result.size >= CODEX_CLI_SYNTHETIC_FILE_CHANGE_MAX_FILES) {
                return;
            }
            if (entry.name.startsWith('.') && entry.name !== '.env' && entry.name !== '.npmrc') {
                continue;
            }
            const absolutePath = path.join(directory, entry.name);
            if (entry.isDirectory()) {
                if (!CODEX_CLI_SYNTHETIC_FILE_CHANGE_IGNORED_DIRS.has(entry.name)) {
                    await this.collectWorkspaceFileSnapshots(root, absolutePath, result, depth + 1);
                }
                continue;
            }
            if (!entry.isFile()) {
                continue;
            }
            const snapshot = await this.readWorkspaceFileSnapshot(root, absolutePath);
            if (snapshot) {
                result.set(snapshot.path, snapshot);
            }
        }
    }

    protected async readWorkspaceFileSnapshot(root: string, absolutePath: string): Promise<WorkspaceFileSnapshot | undefined> {
        try {
            const stat = await fs.promises.stat(absolutePath);
            if (!stat.isFile() || stat.size > CODEX_CLI_SYNTHETIC_FILE_CHANGE_MAX_FILE_SIZE) {
                return undefined;
            }
            const content = await fs.promises.readFile(absolutePath, 'utf8');
            if (content.includes('\u0000')) {
                return undefined;
            }
            return {
                path: path.relative(root, absolutePath) || path.basename(absolutePath),
                content,
                mtimeMs: stat.mtimeMs,
                size: stat.size
            };
        } catch {
            return undefined;
        }
    }

    protected async loadSessionThreads(): Promise<void> {
        if (this.sessionThreadsLoaded) {
            return;
        }
        this.sessionThreadsLoaded = true;
        try {
            const content = await fs.promises.readFile(this.sessionThreadsPath(), 'utf8');
            const parsed = JSON.parse(content);
            if (typeof parsed === 'object' && parsed) {
                this.sessionThreads = new Map(Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
            }
        } catch {
            // Missing or invalid session cache is non-fatal; Codex Provider can start a new thread.
        }
    }

    protected async saveSessionThreads(): Promise<void> {
        const sessionPath = this.sessionThreadsPath();
        await fs.promises.mkdir(path.dirname(sessionPath), { recursive: true });
        await fs.promises.writeFile(sessionPath, JSON.stringify(Object.fromEntries(this.sessionThreads), undefined, 2));
    }

    protected sessionThreadsPath(): string {
        return path.join(os.homedir(), '.theia', 'codex-provider-sessions.json');
    }

    protected handleProcessExit(exitedProcess: ChildProcessWithoutNullStreams, code: number | null, signal: NodeJS.Signals | null): void {
        if (exitedProcess !== this.process) {
            return;
        }
        this.process = undefined;
        const detail = this.stderrTail.length > 0 ? `\n\n${this.stderrTail.join('\n')}` : '';
        const signalDetail = signal ? nls.localize('theia/ai/codex-provider/appServerExitSignal', ' and signal {0}', signal) : '';
        this.failAll(new Error(nls.localize(
            'theia/ai/codex-provider/appServerExited',
            'Codex Provider app-server exited with code {0}{1}.{2}',
            code ?? nls.localize('theia/ai/codex-provider/unknownCode', 'unknown'),
            signalDetail,
            detail
        )));
    }

    protected failAll(error: Error): void {
        for (const pending of this.pendingRequests.values()) {
            if (pending.timeout) {
                clearTimeout(pending.timeout);
            }
            pending.reject(error);
        }
        this.pendingRequests.clear();
        for (const stream of this.activeStreams.values()) {
            this.client?.sendError(stream.streamId, error);
            stream.complete();
        }
    }

    protected resolveExecutable(executablePath?: string): string {
        const configured = executablePath?.trim() || process.env.CODEX_CLI_PATH?.trim();
        if (configured) {
            return configured;
        }
        return process.platform === 'win32' ? 'codex.cmd' : 'codex';
    }

    protected buildSpawnInfo(executable: string, args: string[]): { command: string, args: string[], shell: boolean } {
        if (process.platform === 'win32' && executable.toLowerCase().endsWith('.ps1')) {
            return {
                command: 'powershell.exe',
                args: ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', executable, ...args],
                shell: false
            };
        }
        const hasPathSeparator = executable.includes(path.sep) || executable.includes('/') || executable.includes('\\');
        if (process.platform === 'win32' && (!hasPathSeparator || executable.toLowerCase().endsWith('.cmd') || executable.toLowerCase().endsWith('.bat'))) {
            const commandLine = [executable, ...args].map(arg => this.quoteWindowsArg(arg)).join(' ');
            return {
                command: 'cmd.exe',
                args: ['/d', '/s', '/c', commandLine],
                shell: false
            };
        }
        return {
            command: executable,
            args,
            shell: false
        };
    }

    protected readExecutableVersion(executable: string, cwd?: string): Promise<string | undefined> {
        const spawnInfo = this.buildSpawnInfo(executable, ['--version']);
        return new Promise((resolve, reject) => {
            const childProcess = spawn(spawnInfo.command, spawnInfo.args, {
                cwd: cwd || process.cwd(),
                env: { ...process.env },
                shell: spawnInfo.shell,
                windowsHide: true
            });
            let stdout = '';
            let stderr = '';
            const timeout = setTimeout(() => {
                childProcess.kill();
                reject(new Error(nls.localize('theia/ai/codex-provider/checkTimedOut', 'Timed out while checking Codex Provider.')));
            }, 5000);
            childProcess.stdout.setEncoding('utf8');
            childProcess.stdout.on('data', chunk => stdout += String(chunk));
            childProcess.stderr.setEncoding('utf8');
            childProcess.stderr.on('data', chunk => stderr += String(chunk));
            childProcess.on('error', error => {
                clearTimeout(timeout);
                reject(error);
            });
            childProcess.on('exit', code => {
                clearTimeout(timeout);
                const output = `${stdout}\n${stderr}`.trim();
                if (code === 0) {
                    resolve(output || undefined);
                } else {
                    reject(new Error(output || nls.localize(
                        'theia/ai/codex-provider/exitedWithCode',
                        'Codex Provider exited with code {0}.',
                        code ?? nls.localize('theia/ai/codex-provider/unknownCode', 'unknown')
                    )));
                }
            });
        });
    }

    protected quoteWindowsArg(arg: string): string {
        if (!/[\s"&|<>^]/.test(arg)) {
            return arg;
        }
        return `"${arg.replace(/"/g, '\\"')}"`;
    }

    protected extractAccountStatus(value: unknown): Partial<CodexProviderBackendStatus> {
        const account = this.readObject(value, 'account');
        const user = this.readObject(value, 'user');
        const authStatus = this.readString(value, 'authStatus') ||
            this.readString(value, 'auth_status') ||
            this.readString(account, 'status') ||
            this.readString(value, 'status');
        const label = this.readString(value, 'email') ||
            this.readString(account, 'email') ||
            this.readString(user, 'email') ||
            this.readString(value, 'username') ||
            this.readString(account, 'username') ||
            this.readString(value, 'plan') ||
            this.readString(account, 'plan');
        const authenticated = this.readBoolean(value, 'authenticated') ??
            this.readBoolean(account, 'authenticated') ??
            (authStatus ? ['authenticated', 'logged_in', 'active', 'ok', 'ready'].includes(authStatus.toLowerCase()) : undefined);
        return {
            authenticated,
            authStatus: authStatus || undefined,
            accountLabel: label || undefined
        };
    }

    protected extractModelIds(value: unknown): string[] | undefined {
        const modelValues = Array.isArray(value) ? value : this.readArray(value, 'models');
        const models = modelValues.map(model => {
            if (typeof model === 'string') {
                return model;
            }
            return this.readString(model, 'id') ||
                this.readString(model, 'name') ||
                this.readString(model, 'model') ||
                this.readString(model, 'slug');
        }).filter(Boolean);
        return models.length > 0 ? Array.from(new Set(models)) : undefined;
    }

    protected extractCapabilities(value: unknown): CodexProviderBackendStatus['capabilities'] | undefined {
        if (!value) {
            return undefined;
        }
        const tools = this.readObject(value, 'tools');
        const capabilities = this.readObject(value, 'capabilities');
        return {
            webSearch: this.readBoolean(value, 'webSearch') ??
                this.readBoolean(value, 'web_search') ??
                this.readBoolean(tools, 'web_search') ??
                this.readBoolean(capabilities, 'webSearch'),
            imageGeneration: this.readBoolean(value, 'imageGeneration') ??
                this.readBoolean(value, 'image_generation') ??
                this.readBoolean(tools, 'image_generation') ??
                this.readBoolean(capabilities, 'imageGeneration'),
            mcp: this.readBoolean(value, 'mcp') ??
                this.readBoolean(capabilities, 'mcp'),
            applyPatch: this.readBoolean(value, 'applyPatch') ??
                this.readBoolean(value, 'apply_patch') ??
                this.readBoolean(tools, 'apply_patch') ??
                this.readBoolean(capabilities, 'applyPatch'),
            shellExecution: this.readBoolean(value, 'shellExecution') ??
                this.readBoolean(value, 'shell_execution') ??
                this.readBoolean(tools, 'shell') ??
                this.readBoolean(capabilities, 'shellExecution'),
            raw: value
        };
    }

    protected extractConfigurationRequirements(value: unknown): string[] | undefined {
        const requirements = this.readArray(value, 'requirements').length > 0 ? this.readArray(value, 'requirements') : this.readArray(value, 'missing');
        const labels = requirements.map(requirement => {
            if (typeof requirement === 'string') {
                return requirement;
            }
            return this.readString(requirement, 'id') ||
                this.readString(requirement, 'name') ||
                this.readString(requirement, 'message');
        }).filter(Boolean);
        return labels.length > 0 ? labels : undefined;
    }

    protected extractThreadId(value: unknown): string | undefined {
        const thread = this.readObject(value, 'thread');
        return this.readString(thread, 'id') || this.readString(value, 'threadId') || this.readString(value, 'thread_id');
    }

    protected extractTurnId(value: unknown): string | undefined {
        const turn = this.readObject(value, 'turn');
        return this.readString(turn, 'id') || this.readString(value, 'turnId') || this.readString(value, 'turn_id');
    }

    protected readString(source: unknown, key: string): string {
        if (typeof source === 'object' && source && key in source) {
            const value = (source as Record<string, unknown>)[key];
            return typeof value === 'string' ? value : '';
        }
        return '';
    }

    protected readArrayString(source: unknown, key: string): string {
        if (typeof source === 'object' && source && key in source) {
            const value = (source as Record<string, unknown>)[key];
            return Array.isArray(value) ? value.map(String).join(' ') : '';
        }
        return '';
    }

    protected readObject(source: unknown, key: string): Record<string, unknown> {
        if (typeof source === 'object' && source && key in source) {
            const value = (source as Record<string, unknown>)[key];
            return typeof value === 'object' && value ? value as Record<string, unknown> : {};
        }
        return {};
    }

    protected readChangeKind(source: unknown): string {
        const kind = this.readString(source, 'kind');
        if (kind) {
            return kind;
        }
        return this.readString(this.readObject(source, 'kind'), 'type');
    }

    protected readArray(source: unknown, key: string): unknown[] {
        if (typeof source === 'object' && source && key in source) {
            const value = (source as Record<string, unknown>)[key];
            return Array.isArray(value) ? value : [];
        }
        return [];
    }

    protected readBoolean(source: unknown, key: string): boolean | undefined {
        if (typeof source === 'object' && source && key in source) {
            const value = (source as Record<string, unknown>)[key];
            return typeof value === 'boolean' ? value : undefined;
        }
        return undefined;
    }

    protected errorToString(error: unknown): string {
        if (typeof error === 'string') {
            return error;
        }
        if (typeof error === 'object' && error && 'message' in error) {
            return String((error as { message: unknown }).message);
        }
        return JSON.stringify(error);
    }

    protected traceProtocol(direction: 'in' | 'out', message: unknown): void {
        const traceFile = process.env.THEIA_CODEX_CLI_TRACE_FILE;
        if (!traceFile) {
            return;
        }
        fs.appendFileSync(traceFile, `${new Date().toISOString()} ${direction} ${typeof message === 'string' ? message : JSON.stringify(message)}\n`);
    }
}

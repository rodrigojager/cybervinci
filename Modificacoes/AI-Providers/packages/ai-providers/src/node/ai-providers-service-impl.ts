// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { ContributionProvider, Disposable, ILogger, generateUuid, nls } from '@theia/core';
import { inject, injectable, named, optional } from '@theia/core/shared/inversify';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { TextDecoder } from 'util';
import {
    CodexProviderApprovalRequestMessage,
    CodexProviderApprovalResponseMessage,
    CodexProviderAppServerRequest,
    CodexProviderAppServerNotification,
    CodexProviderBackendRequest,
    CodexProviderBackendStatus,
    CodexProviderCollectResult,
    CodexProviderClient,
    CodexProviderDetectedProvider,
    CodexProviderFileUpdateChange,
    CodexProviderInputItem,
    CodexProviderLoginRequest,
    CodexProviderLoginResult,
    CodexProviderModelCost,
    CodexProviderModelMetadata,
    CodexProviderModelPricing,
    CodexProviderOptions,
    CodexProviderRuntime,
    CodexProviderStatusRequest,
    CodexProviderQuestionOption,
    CodexProviderSetThreadRequest,
    CodexProviderService,
    CodexProviderThreadActionRequest,
    CodexProviderThreadActionResult,
    CodexProviderUserInputQuestion,
    CodexProviderUserInputResponseMessage
} from '../common/ai-providers-service';
import {
    CodexProviderSpawnEnvironmentContext,
    CodexProviderSpawnEnvironmentContribution,
    CodexProviderSpawnEnvironmentFragment
} from './ai-providers-spawn-environment';

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
    runtime?: CodexProviderRuntime;
    client?: CodexProviderClient;
    threadId?: string;
    turnId?: string;
    receivedNotification?: boolean;
    receivedAgentDelta?: boolean;
    cwd?: string;
    cliProcess?: ChildProcessWithoutNullStreams;
    abortController?: AbortController;
    canceled?: boolean;
    complete: () => void;
}

type PendingServerResponse = (message: CodexProviderApprovalResponseMessage | CodexProviderUserInputResponseMessage) => void;

interface WorkspaceFileSnapshot {
    path: string;
    content: string;
    mtimeMs: number;
    size: number;
}

interface DirectHttpUnavailableModel {
    reason: string;
    observedAt: number;
    expiresAt: number;
}

interface DirectHttpCredentialError {
    reason: string;
    keyFingerprint: string;
    observedAt: number;
    expiresAt: number;
}

interface ResolvedSpawnEnvironment {
    env: NodeJS.ProcessEnv;
    fingerprint: string;
}

interface CliRuntimeAdapter {
    runtime: Exclude<CodexProviderRuntime, 'codex-app-server' | 'direct-http'>;
    provider: string;
    label: string;
    executableEnvVar: string;
    defaultExecutable: string;
    defaultModels?: string[];
}

type DirectHttpProtocol = 'openai-chat' | 'openai-responses' | 'anthropic-messages' | 'google-generate';

interface DirectHttpPromptParts {
    system: string;
    user: string;
    images: string[];
}

interface DirectHttpProviderConfig {
    runtime: 'direct-http';
    provider: 'openrouter' | 'opencode-go' | 'opencode';
    label: string;
    baseUrl: string;
    modelsUrl: string;
    apiKeyEnvVar: string;
    apiKeyRequestField: 'openRouterApiKey' | 'openCodeApiKey';
    modelPrefix: string;
    defaultModel: string;
}

interface ProviderDetectionPreset {
    runtime: CodexProviderRuntime;
    modelProvider: string;
    label: string;
    defaultModel?: string;
}

const CODEX_CLI_SYNTHETIC_FILE_CHANGE_MAX_FILES = 300;
const CODEX_CLI_SYNTHETIC_FILE_CHANGE_MAX_DEPTH = 2;
const CODEX_CLI_SYNTHETIC_FILE_CHANGE_MAX_FILE_SIZE = 256 * 1024;
const CODEX_CLI_SYNTHETIC_FILE_CHANGE_MAX_DIFF_SIZE = 48 * 1024;
const CODEX_CLI_OPTIONAL_STATUS_REQUEST_TIMEOUT = 1500;
const OPENCODE_STATUS_REQUEST_TIMEOUT = 15000;
const OPENCODE_COMMAND_MAX_OUTPUT = 2 * 1024 * 1024;
const DIRECT_HTTP_MODEL_CATALOG_TTL_MS = 30 * 60 * 1000;
const DIRECT_HTTP_UNAVAILABLE_MODEL_TTL_MS = 30 * 60 * 1000;
const DIRECT_HTTP_CREDENTIAL_ERROR_TTL_MS = 30 * 60 * 1000;
const BASE_PROCESS_ENVIRONMENT_TTL_MS = 30 * 1000;
const MODELS_DEV_CATALOG_URL = 'https://models.dev/api.json';
const MODELS_DEV_CATALOG_TTL_MS = 12 * 60 * 60 * 1000;
const AI_PROVIDER_ENVIRONMENT_KEYS = [
    'PATH',
    'Path',
    'CODEX_CLI_PATH',
    'OPENROUTER_API_KEY',
    'OPENCODE_API_KEY',
    'GEMINI_CLI_PATH',
    'CLAUDE_CODE_CLI_PATH',
    'CURSOR_AGENT_CLI_PATH',
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
    'GOOGLE_API_KEY',
    'GEMINI_API_KEY',
    'HUGGINGFACE_API_KEY',
    'VERCEL_AI_API_KEY'
];
const OPENCODE_PROVIDER_DEFAULT_MODELS: Record<string, string> = {
    openrouter: 'openrouter/openai/gpt-5.5',
    'opencode-go': 'opencode-go/deepseek-v4-flash',
    opencode: 'opencode/gpt-5.5'
};
const OPENCODE_PROVIDER_LABELS: Record<string, string[]> = {
    openrouter: ['OpenRouter', 'openrouter'],
    'opencode-go': ['OpenCode Go', 'opencode-go'],
    opencode: ['OpenCode Zen', 'OpenCode', 'opencode']
};
const OPENCODE_ZEN_LIMITED_FREE_MODEL_IDS = new Set([
    'big-pickle'
]);
const DIRECT_HTTP_PROVIDER_CONFIGS: Record<string, DirectHttpProviderConfig> = {
    openrouter: {
        runtime: 'direct-http',
        provider: 'openrouter',
        label: 'OpenRouter',
        baseUrl: 'https://openrouter.ai/api/v1',
        modelsUrl: 'https://openrouter.ai/api/v1/models',
        apiKeyEnvVar: 'OPENROUTER_API_KEY',
        apiKeyRequestField: 'openRouterApiKey',
        modelPrefix: 'openrouter',
        defaultModel: 'openrouter/openai/gpt-5.5'
    },
    'opencode-go': {
        runtime: 'direct-http',
        provider: 'opencode-go',
        label: 'OpenCode Go',
        baseUrl: 'https://opencode.ai/zen/go/v1',
        modelsUrl: 'https://opencode.ai/zen/go/v1/models',
        apiKeyEnvVar: 'OPENCODE_API_KEY',
        apiKeyRequestField: 'openCodeApiKey',
        modelPrefix: 'opencode-go',
        defaultModel: 'opencode-go/deepseek-v4-flash'
    },
    opencode: {
        runtime: 'direct-http',
        provider: 'opencode',
        label: 'OpenCode Zen',
        baseUrl: 'https://opencode.ai/zen/v1',
        modelsUrl: 'https://opencode.ai/zen/v1/models',
        apiKeyEnvVar: 'OPENCODE_API_KEY',
        apiKeyRequestField: 'openCodeApiKey',
        modelPrefix: 'opencode',
        defaultModel: 'opencode/gpt-5.5'
    }
};
const OPENCODE_GO_ANTHROPIC_MODELS = new Set([
    'minimax-m3',
    'minimax-m2.7',
    'minimax-m2.5',
    'qwen3.7-max',
    'qwen3.7-plus',
    'qwen3.6-plus',
    'qwen3.5-plus'
]);
const CLI_RUNTIME_ADAPTERS: Record<Exclude<CodexProviderRuntime, 'codex-app-server' | 'direct-http'>, CliRuntimeAdapter> = {
    'opencode-cli': {
        runtime: 'opencode-cli',
        provider: 'opencode',
        label: 'OpenCode CLI',
        executableEnvVar: 'OPENCODE_CLI_PATH',
        defaultExecutable: process.platform === 'win32' ? 'opencode.cmd' : 'opencode'
    },
    'gemini-cli': {
        runtime: 'gemini-cli',
        provider: 'gemini',
        label: 'Gemini CLI',
        executableEnvVar: 'GEMINI_CLI_PATH',
        defaultExecutable: process.platform === 'win32' ? 'gemini.cmd' : 'gemini'
    },
    'claude-code-cli': {
        runtime: 'claude-code-cli',
        provider: 'claude-code',
        label: 'Claude Code CLI',
        executableEnvVar: 'CLAUDE_CODE_CLI_PATH',
        defaultExecutable: process.platform === 'win32' ? 'claude.exe' : 'claude',
        defaultModels: ['sonnet', 'opus']
    },
    'cursor-cli': {
        runtime: 'cursor-cli',
        provider: 'cursor',
        label: 'Cursor CLI',
        executableEnvVar: 'CURSOR_AGENT_CLI_PATH',
        defaultExecutable: process.platform === 'win32' ? 'cursor-agent.cmd' : 'cursor-agent'
    }
};
const PROVIDER_DETECTION_PRESETS: ProviderDetectionPreset[] = [
    { runtime: 'codex-app-server', modelProvider: 'codex', label: 'Codex CLI' },
    { runtime: 'direct-http', modelProvider: 'openrouter', label: 'OpenRouter', defaultModel: 'openrouter/openai/gpt-5.5' },
    { runtime: 'direct-http', modelProvider: 'opencode-go', label: 'OpenCode Go', defaultModel: 'opencode-go/deepseek-v4-flash' },
    { runtime: 'direct-http', modelProvider: 'opencode', label: 'OpenCode Zen', defaultModel: 'opencode/gpt-5.5' },
    { runtime: 'gemini-cli', modelProvider: 'gemini', label: 'Gemini CLI' },
    { runtime: 'claude-code-cli', modelProvider: 'claude-code', label: 'Claude Code', defaultModel: 'sonnet' },
    { runtime: 'cursor-cli', modelProvider: 'cursor', label: 'Cursor CLI' }
];
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
const CODEX_CLI_MEMORY_GRAPH_FIRST_INSTRUCTION = [
    'CyberVinci Memory graph-first rule:',
    'Before using shell rg/grep or broad repository scans, call MCP tool cybervinci.search.graphFirst when available with workspacePath set to the IDE working directory and query set to the search intent.',
    'Use its compact graph/retrieval evidence first; follow recommendedNextStep, preferring ast-grep before rg when Memory has no evidence.'
].join('\n');

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
    protected readonly appServerNotificationListeners = new Set<(notification: CodexProviderAppServerNotification) => void>();
    protected activeStreams = new Map<string, ActiveStream>();
    protected turnToStream = new Map<string, string>();
    protected sessionThreads = new Map<string, string>();
    protected directHttpModelCatalogCache = new Map<string, {
        expiresAt: number;
        promise?: Promise<CodexProviderModelMetadata[] | undefined>;
        value?: CodexProviderModelMetadata[] | undefined;
    }>();
    protected directHttpUnavailableModels = new Map<string, Map<string, DirectHttpUnavailableModel>>();
    protected directHttpCredentialErrors = new Map<string, DirectHttpCredentialError>();
    protected modelsDevCatalogCache: {
        expiresAt: number;
        promise?: Promise<Map<string, Map<string, CodexProviderModelMetadata>>>;
        value?: Map<string, Map<string, CodexProviderModelMetadata>>;
    } | undefined;
    protected loadedThreads = new Set<string>();
    protected sessionThreadsLoaded = false;
    protected activeStreamId: string | undefined;
    protected processKey = '';
    protected stderrTail: string[] = [];
    protected baseProcessEnvironmentCache: { expiresAt: number, value: ResolvedSpawnEnvironment } | undefined;
    protected baseProcessEnvironmentPromise: Promise<ResolvedSpawnEnvironment> | undefined;

    setClient(client: CodexProviderClient): void {
        this.client = client;
    }

    async initialize(): Promise<void> {
        await this.primeProcessEnvironment();
    }

    onAppServerNotification(listener: (notification: CodexProviderAppServerNotification) => void): Disposable {
        this.appServerNotificationListeners.add(listener);
        return Disposable.create(() => this.appServerNotificationListeners.delete(listener));
    }

    dispose(): void {
        this.stopServer();
        for (const stream of this.activeStreams.values()) {
            if (stream.cliProcess && !stream.cliProcess.killed) {
                stream.cliProcess.kill();
            }
            stream.abortController?.abort();
        }
        this.activeStreams.clear();
        this.turnToStream.clear();
    }

    async send(request: CodexProviderBackendRequest, streamId: string): Promise<void> {
        if (!this.client) {
            throw new Error(nls.localize('theia/ai/ai-providers/clientNotInitialized', 'CyberVinci AI Providers client not initialized'));
        }
        this.sendBackendMessages(streamId, request, this.client);
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
        await this.sendBackendMessages(streamId, request, client);
        if (errors.length > 0) {
            throw new Error(errors.join('\n'));
        }
        return {
            text: textParts.join(''),
            notifications
        };
    }

    async login(request: CodexProviderLoginRequest): Promise<CodexProviderLoginResult> {
        await this.primeProcessEnvironment();
        const directProvider = this.resolveDirectHttpProviderConfig(request);
        if (directProvider) {
            return {
                status: 'completed',
                message: nls.localize(
                    'theia/ai/ai-providers/directApiLoginMessage',
                    '{0} uses a direct API key. Configure it in CyberVinci or set {1} in the environment.',
                    directProvider.label,
                    directProvider.apiKeyEnvVar
                )
            };
        }
        const loginAdapter = this.resolveCliAdapter(request.runtime);
        if (loginAdapter) {
            const provider = this.resolveAdapterProvider(loginAdapter, request.modelProvider);
            return {
                status: 'completed',
                message: nls.localize(
                    'theia/ai/ai-providers/cliLoginMessage',
                    '{0} credentials are managed by its CLI. Use the CLI login/auth command if provider `{1}` is not authenticated yet.',
                    loginAdapter.label,
                    provider
                )
            };
        }
        await this.ensureServer(request.executablePath, request.profile, request.cwd);
        await this.sendRequest('account/login/start', { type: 'chatgpt' });
        return {
            status: 'started',
            message: nls.localize('theia/ai/ai-providers/loginStarted',
                'ChatGPT login was started through CyberVinci AI Providers. Complete the browser flow if one was opened.')
        };
    }

    async restart(request: CodexProviderStatusRequest): Promise<CodexProviderBackendStatus> {
        await this.primeProcessEnvironment();
        if (this.isDirectHttpRuntime(request.runtime)) {
            for (const stream of this.activeStreams.values()) {
                if (stream.runtime === 'direct-http') {
                    stream.canceled = true;
                    stream.abortController?.abort();
                    stream.complete();
                }
            }
            return this.getStatus(request);
        }
        if (this.resolveCliAdapter(request.runtime)) {
            for (const stream of this.activeStreams.values()) {
                if (this.resolveCliAdapter(stream.runtime) && stream.cliProcess && !stream.cliProcess.killed) {
                    stream.canceled = true;
                    stream.cliProcess.kill();
                    stream.complete();
                }
            }
            return this.getStatus(request);
        }
        this.stopServer();
        try {
            await this.ensureServer(request.executablePath, request.profile, request.cwd);
        } catch (error) {
            const executable = this.resolveExecutable(request.executablePath);
            return {
                available: false,
                runtime: 'codex-app-server',
                modelProvider: 'codex',
                executablePath: executable,
                appServer: false,
                message: error instanceof Error ? error.message : String(error),
                detectedProviders: await this.detectProviders(request)
            };
        }
        return this.getStatus(request);
    }

    async getStatus(request: CodexProviderStatusRequest): Promise<CodexProviderBackendStatus> {
        await this.primeProcessEnvironment();
        const detectedProviders = await this.detectProviders(request);
        const directProvider = this.resolveDirectHttpProviderConfig(request);
        if (directProvider) {
            return {
                ...(await this.getDirectHttpStatus(directProvider, request)),
                detectedProviders
            };
        }
        const statusAdapter = this.resolveCliAdapter(request.runtime);
        if (statusAdapter) {
            return {
                ...(await this.getCliStatus(statusAdapter, request)),
                detectedProviders
            };
        }
        const executable = this.resolveExecutable(request.executablePath);
        try {
            const version = await this.readExecutableVersion(executable, request.cwd);
            const details = await this.readAppServerStatusDetails(request).catch(error => ({
                appServer: false,
                message: error instanceof Error ? error.message : String(error)
            }));
            return {
                available: true,
                runtime: 'codex-app-server',
                modelProvider: 'codex',
                executablePath: executable,
                version,
                ...details,
                detectedProviders
            };
        } catch (error) {
            return {
                available: false,
                runtime: 'codex-app-server',
                modelProvider: 'codex',
                executablePath: executable,
                appServer: false,
                message: error instanceof Error ? error.message : String(error)
            };
        }
    }

    async invokeAppServerRequest(request: CodexProviderAppServerRequest): Promise<unknown> {
        await this.primeProcessEnvironment();
        await this.ensureServer(request.executablePath, request.profile, request.cwd);
        return this.sendRequest(request.method, request.params ?? {}, request.timeoutMs);
    }

    async compactThread(request: CodexProviderThreadActionRequest): Promise<CodexProviderThreadActionResult> {
        if (this.isDirectHttpRuntime(request.runtime)) {
            return {
                status: 'no-thread',
                message: nls.localize('theia/ai/ai-providers/directNoThreadToCompact', 'Direct API provider turns are sent as independent API requests by this adapter.')
            };
        }
        if (this.resolveCliAdapter(request.runtime)) {
            return {
                status: 'no-thread',
                message: nls.localize('theia/ai/ai-providers/cliNoThreadToCompact', 'CLI adapter turns are launched as independent CLI sessions by this adapter.')
            };
        }
        await this.loadSessionThreads();
        const sessionKey = this.buildSessionKey(request);
        const threadId = this.sessionThreads.get(sessionKey);
        if (!threadId) {
            return {
                status: 'no-thread',
                message: nls.localize('theia/ai/ai-providers/noThreadToCompact', 'There is no CyberVinci AI Providers thread associated with this chat yet.')
            };
        }
        try {
            await this.ensureServer(request.executablePath, request.profile, request.cwd, request.sessionId);
            await this.sendThreadCompactRequest(threadId);
            return {
                status: 'completed',
                threadId,
                message: nls.localize('theia/ai/ai-providers/threadCompacted', 'CyberVinci AI Providers compacted the current thread context.')
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
        if (this.isDirectHttpRuntime(request.runtime)) {
            return {
                status: 'no-thread',
                message: nls.localize('theia/ai/ai-providers/directNoThreadToReset', 'Direct API provider turns are sent as independent API requests by this adapter.')
            };
        }
        if (this.resolveCliAdapter(request.runtime)) {
            return {
                status: 'no-thread',
                message: nls.localize('theia/ai/ai-providers/cliNoThreadToReset', 'CLI adapter turns are launched as independent CLI sessions by this adapter.')
            };
        }
        await this.loadSessionThreads();
        const sessionKey = this.buildSessionKey(request);
        const threadId = this.sessionThreads.get(sessionKey);
        this.sessionThreads.delete(sessionKey);
        await this.saveSessionThreads();
        return {
            status: threadId ? 'completed' : 'no-thread',
            threadId,
            message: threadId
                ? nls.localize('theia/ai/ai-providers/threadReset', 'The next CyberVinci AI Providers turn in this chat will start a new thread.')
                : nls.localize('theia/ai/ai-providers/noThreadToReset', 'This chat did not have a CyberVinci AI Providers thread yet.')
        };
    }

    async setThread(request: CodexProviderSetThreadRequest): Promise<CodexProviderThreadActionResult> {
        if (this.isDirectHttpRuntime(request.runtime)) {
            return {
                status: 'no-thread',
                message: nls.localize('theia/ai/ai-providers/directNoThreadToSet', 'Direct API provider turns are sent as independent API requests by this adapter.')
            };
        }
        if (this.resolveCliAdapter(request.runtime)) {
            return {
                status: 'no-thread',
                message: nls.localize('theia/ai/ai-providers/cliNoThreadToSet', 'CLI adapter turns are launched as independent CLI sessions by this adapter.')
            };
        }
        await this.loadSessionThreads();
        const threadId = request.threadId.trim();
        if (!threadId) {
            return {
                status: 'failed',
                message: nls.localize('theia/ai/ai-providers/emptyThreadId', 'Thread id cannot be empty.')
            };
        }
        const sessionKey = this.buildSessionKey(request);
        this.sessionThreads.set(sessionKey, threadId);
        await this.saveSessionThreads();
        this.loadedThreads.delete(threadId);
        return {
            status: 'completed',
            threadId,
            message: nls.localize('theia/ai/ai-providers/threadSelected', 'This chat now uses CyberVinci AI Providers thread {0}.', threadId)
        };
    }

    cancel(streamId: string): void {
        const stream = this.activeStreams.get(streamId);
        if (stream?.runtime === 'direct-http') {
            stream.canceled = true;
            stream.abortController?.abort();
            this.client?.sendToken(streamId, undefined);
            stream.complete();
            this.cleanupStream(streamId);
            return;
        }
        if (stream && this.resolveCliAdapter(stream.runtime)) {
            stream.canceled = true;
            if (stream.cliProcess && !stream.cliProcess.killed) {
                stream.cliProcess.kill();
            }
            this.client?.sendToken(streamId, undefined);
            stream.complete();
            this.cleanupStream(streamId);
            return;
        }
        if (stream?.threadId) {
            this.sendRequest('turn/interrupt', { threadId: stream.threadId, turnId: stream.turnId })
                .catch(error => this.logger.debug('CyberVinci AI Providers turn interrupt failed:', error));
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

    protected async sendBackendMessages(streamId: string, request: CodexProviderBackendRequest, client: CodexProviderClient | undefined): Promise<void> {
        await this.primeProcessEnvironment();
        const directProvider = this.resolveDirectHttpProviderConfig(request);
        if (directProvider) {
            return this.sendDirectHttpMessages(directProvider, streamId, request, client);
        }
        const adapter = this.resolveCliAdapter(request.runtime);
        if (adapter) {
            return this.sendCliMessages(adapter, streamId, request, client);
        }
        return this.sendMessages(streamId, request, client);
    }

    protected async sendMessages(streamId: string, request: CodexProviderBackendRequest, client: CodexProviderClient | undefined): Promise<void> {
        let completed = false;
        const completePromise = new Promise<void>(resolve => {
            this.activeStreams.set(streamId, {
                streamId,
                runtime: 'codex-app-server',
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
                throw new Error(nls.localize('theia/ai/ai-providers/missingThreadId', 'CyberVinci AI Providers did not return a thread id.'));
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
            this.logger.error('CyberVinci AI Providers error:', error);
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

    protected async sendCliMessages(
        adapter: CliRuntimeAdapter,
        streamId: string,
        request: CodexProviderBackendRequest,
        client: CodexProviderClient | undefined
    ): Promise<void> {
        let completed = false;
        this.activeStreams.set(streamId, {
            streamId,
            runtime: adapter.runtime,
            client,
            complete: () => {
                completed = true;
            }
        });

        const stderrTail: string[] = [];
        let stdoutBuffer = '';
        let stdoutTail = '';
        try {
            const cwd = request.options?.cwd || process.cwd();
            const executable = this.resolveCliExecutable(adapter, request);
            const args = this.buildCliRunArgs(adapter, request);
            const spawnInfo = this.buildSpawnInfo(executable, args);
            const resolvedEnvironment = await this.resolveSpawnEnvironment({ executablePath: executable, cwd, sessionId: request.sessionId });
            const prompt = this.buildCliPrompt(adapter, request.prompt, request.input, cwd);
            const workspaceBefore = await this.snapshotWorkspaceFiles(cwd);
            const childProcess = spawn(spawnInfo.command, spawnInfo.args, {
                cwd,
                env: resolvedEnvironment.env,
                shell: spawnInfo.shell,
                windowsHide: true
            });
            const stream = this.activeStreams.get(streamId);
            if (stream) {
                stream.cwd = cwd;
                stream.cliProcess = childProcess;
            }

            childProcess.stdout.setEncoding('utf8');
            childProcess.stdout.on('data', chunk => {
                stdoutBuffer += String(chunk);
                let index = stdoutBuffer.indexOf('\n');
                while (index >= 0) {
                    const line = stdoutBuffer.slice(0, index).trim();
                    stdoutBuffer = stdoutBuffer.slice(index + 1);
                    if (line) {
                        stdoutTail = this.truncateCommandOutput(`${stdoutTail}\n${line}`.trim());
                        this.handleCliRunLine(adapter, streamId, line, client);
                    }
                    index = stdoutBuffer.indexOf('\n');
                }
            });
            childProcess.stderr.setEncoding('utf8');
            childProcess.stderr.on('data', chunk => {
                for (const line of String(chunk).split(/\r?\n/).map(value => value.trim()).filter(Boolean)) {
                    stderrTail.push(line);
                    while (stderrTail.join('\n').length > 8192) {
                        stderrTail.shift();
                    }
                    this.logger.debug(`${adapter.label} stderr:`, line);
                }
            });
            childProcess.stdin.on('error', error => this.logger.debug(`${adapter.label} stdin failed:`, error));
            childProcess.stdin.end(prompt);

            const result = await new Promise<{ code: number | null, signal: NodeJS.Signals | null }>((resolve, reject) => {
                childProcess.on('error', reject);
                childProcess.on('exit', (code, signal) => resolve({ code, signal }));
            });
            const finalStream = this.activeStreams.get(streamId);
            if (finalStream?.canceled) {
                return;
            }
            if (result.code !== 0) {
                const detail = stderrTail.join('\n') || stdoutTail;
                const signalDetail = result.signal ? nls.localize('theia/ai/ai-providers/cliExitSignal', ' and signal {0}', result.signal) : '';
                throw new Error(nls.localize(
                    'theia/ai/ai-providers/cliRunExited',
                    '{0} exited with code {1}{2}.{3}',
                    adapter.label,
                    result.code ?? nls.localize('theia/ai/ai-providers/unknownCode', 'unknown'),
                    signalDetail,
                    detail ? `\n\n${detail}` : ''
                ));
            }
            if (stdoutBuffer.trim()) {
                this.handleCliRunLine(adapter, streamId, stdoutBuffer.trim(), client);
            }
            await this.sendSyntheticFileChanges(streamId, cwd, workspaceBefore);
            client?.sendToken(streamId, {
                type: 'notification',
                method: 'turn/completed',
                params: {
                    runtime: adapter.runtime,
                    model: this.resolveCliModel(adapter, request)
                }
            });
            completed = true;
            client?.sendToken(streamId, undefined);
        } catch (error) {
            const stream = this.activeStreams.get(streamId);
            if (stream?.canceled) {
                return;
            }
            this.logger.error(`${adapter.label} Provider error:`, error);
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

    protected async sendDirectHttpMessages(
        provider: DirectHttpProviderConfig,
        streamId: string,
        request: CodexProviderBackendRequest,
        client: CodexProviderClient | undefined
    ): Promise<void> {
        let completed = false;
        const abortController = new AbortController();
        this.activeStreams.set(streamId, {
            streamId,
            runtime: 'direct-http',
            client,
            abortController,
            complete: () => {
                completed = true;
            }
        });

        try {
            const cwd = request.options?.cwd || process.cwd();
            const workspaceBefore = await this.snapshotWorkspaceFiles(cwd);
            const apiKey = this.resolveDirectHttpApiKey(provider, request);
            if (!apiKey) {
                throw new Error(nls.localize(
                    'theia/ai/ai-providers/directApiKeyRequired',
                    '{0} requires an API key. Configure it in CyberVinci or set {1} in the environment.',
                    provider.label,
                    provider.apiKeyEnvVar
                ));
            }

            const model = this.resolveDirectHttpModel(provider, request);
            const protocol = this.resolveDirectHttpProtocol(provider, model);
            const httpRequest = this.buildDirectHttpRequest(provider, protocol, request, cwd, model, apiKey);
            const response = await fetch(httpRequest.url, {
                method: 'POST',
                headers: httpRequest.headers,
                body: JSON.stringify(httpRequest.body),
                signal: abortController.signal
            });
            const stream = this.activeStreams.get(streamId);
            if (stream?.canceled) {
                return;
            }
            if (!response.ok) {
                const detail = await response.text().catch(() => '');
                this.markDirectHttpCredentialErrorFromResponse(provider, apiKey, response.status, detail);
                this.markDirectHttpModelUnavailableFromError(provider, model, response.status, detail);
                throw new Error(nls.localize(
                    'theia/ai/ai-providers/directApiHttpError',
                    '{0} returned HTTP {1}.{2}',
                    provider.label,
                    response.status,
                    detail ? `\n\n${this.truncateCommandOutput(detail)}` : ''
                ));
            }

            this.clearDirectHttpCredentialError(provider, apiKey);
            if (response.body) {
                await this.readDirectHttpSseStream(protocol, streamId, response.body, client);
            } else {
                const json = await response.json().catch(() => undefined);
                this.handleDirectHttpJsonResponse(protocol, streamId, json, client);
            }

            await this.sendSyntheticFileChanges(streamId, cwd, workspaceBefore);
            client?.sendToken(streamId, {
                type: 'notification',
                method: 'turn/completed',
                params: {
                    runtime: 'direct-http',
                    model: this.withDirectProviderPrefix(provider, model),
                    modelProvider: provider.provider,
                    protocol
                }
            });
            completed = true;
            client?.sendToken(streamId, undefined);
        } catch (error) {
            const stream = this.activeStreams.get(streamId);
            if (stream?.canceled || this.isAbortError(error)) {
                return;
            }
            this.logger.error(`${provider.label} direct API error:`, error);
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

    protected buildCliRunArgs(adapter: CliRuntimeAdapter, request: CodexProviderBackendRequest): string[] {
        if (adapter.runtime === 'opencode-cli') {
            return this.buildOpenCodeRunArgs(request);
        }
        if (adapter.runtime === 'gemini-cli') {
            return this.buildGeminiRunArgs(request);
        }
        if (adapter.runtime === 'claude-code-cli') {
            return this.buildClaudeCodeRunArgs(request);
        }
        return this.buildCursorRunArgs(request);
    }

    protected buildOpenCodeRunArgs(request: CodexProviderBackendRequest): string[] {
        const args = ['run', '--format', 'json'];
        const model = this.resolveOpenCodeModel(request);
        if (model) {
            args.push('--model', model);
        }
        if (request.openCodeAgent?.trim()) {
            args.push('--agent', request.openCodeAgent.trim());
        }
        if (request.openCodeVariant?.trim()) {
            args.push('--variant', request.openCodeVariant.trim());
        } else if (request.options?.reasoningVariant?.trim()) {
            args.push('--variant', request.options.reasoningVariant.trim());
        }
        if (request.options?.reasoningEffort && !request.options?.reasoningVariant) {
            args.push('--thinking');
        }
        return args;
    }

    protected buildGeminiRunArgs(request: CodexProviderBackendRequest): string[] {
        const args = ['--output-format', 'stream-json', '--skip-trust'];
        const model = this.resolveCliModel(CLI_RUNTIME_ADAPTERS['gemini-cli'], request);
        if (model) {
            args.push('--model', model);
        }
        args.push('--approval-mode', this.toGeminiApprovalMode(request));
        return args;
    }

    protected buildClaudeCodeRunArgs(request: CodexProviderBackendRequest): string[] {
        const args = ['--print', '--output-format', 'stream-json', '--include-partial-messages', '--verbose'];
        const model = this.resolveCliModel(CLI_RUNTIME_ADAPTERS['claude-code-cli'], request);
        if (model) {
            args.push('--model', model);
        }
        if (request.claudeAgent?.trim()) {
            args.push('--agent', request.claudeAgent.trim());
        }
        if (request.options?.reasoningEffort && request.options.reasoningEffort !== 'xhigh') {
            args.push('--effort', request.options.reasoningEffort);
        }
        const permissionMode = this.toClaudePermissionMode(request);
        args.push('--permission-mode', permissionMode);
        if (permissionMode === 'bypassPermissions') {
            args.push('--dangerously-skip-permissions');
        }
        return args;
    }

    protected buildCursorRunArgs(request: CodexProviderBackendRequest): string[] {
        const args = ['--print', '--output-format', 'stream-json', '--stream-partial-output', '--trust'];
        const model = this.resolveCliModel(CLI_RUNTIME_ADAPTERS['cursor-cli'], request);
        if (model) {
            args.push('--model', model);
        }
        const mode = request.cursorMode?.trim();
        if (mode === 'plan' || mode === 'ask') {
            args.push('--mode', mode);
        } else if (request.options?.sandboxMode === 'read-only' || request.options?.collaborationMode === 'plan') {
            args.push('--mode', 'plan');
        }
        args.push('--sandbox', request.options?.sandboxMode === 'danger-full-access' ? 'disabled' : 'enabled');
        if (request.options?.sandboxMode === 'danger-full-access') {
            args.push('--force');
        }
        return args;
    }

    protected toGeminiApprovalMode(request: CodexProviderBackendRequest): 'default' | 'auto_edit' | 'yolo' | 'plan' {
        if (request.options?.collaborationMode === 'plan' || request.options?.sandboxMode === 'read-only') {
            return 'plan';
        }
        if (request.options?.sandboxMode === 'danger-full-access') {
            return 'yolo';
        }
        if (request.options?.sandboxMode === 'workspace-write') {
            return 'auto_edit';
        }
        return 'default';
    }

    protected toClaudePermissionMode(request: CodexProviderBackendRequest): 'acceptEdits' | 'bypassPermissions' | 'default' | 'dontAsk' | 'plan' {
        if (request.options?.collaborationMode === 'plan' || request.options?.sandboxMode === 'read-only') {
            return 'plan';
        }
        if (request.options?.sandboxMode === 'danger-full-access') {
            return 'bypassPermissions';
        }
        if (request.options?.sandboxMode === 'workspace-write') {
            return 'acceptEdits';
        }
        return request.options?.approvalPolicy === 'never' ? 'dontAsk' : 'default';
    }

    protected resolveCliModel(adapter: CliRuntimeAdapter, request: CodexProviderBackendRequest | CodexProviderStatusRequest): string | undefined {
        if (adapter.runtime === 'opencode-cli') {
            return this.resolveOpenCodeModel(request);
        }
        const model = ('model' in request ? request.model : undefined) || ('options' in request ? request.options?.model : undefined);
        return model?.trim() || undefined;
    }

    protected resolveOpenCodeModel(request: CodexProviderBackendRequest | CodexProviderStatusRequest): string | undefined {
        const model = ('model' in request ? request.model : undefined) || ('options' in request ? request.options?.model : undefined);
        if (model?.trim()) {
            return model.trim();
        }
        const provider = this.resolveOpenCodeProvider(request);
        return provider ? OPENCODE_PROVIDER_DEFAULT_MODELS[provider] : undefined;
    }

    protected resolveOpenCodeProvider(request: CodexProviderBackendRequest | CodexProviderStatusRequest): string {
        const providerFromPreference = request.modelProvider?.trim();
        if (providerFromPreference && providerFromPreference !== 'codex') {
            return providerFromPreference;
        }
        const providerFromModel = this.openCodeProviderFromModel(this.resolveOpenCodeModelFromRequest(request));
        return providerFromModel || 'opencode';
    }

    protected resolveOpenCodeModelFromRequest(request: CodexProviderBackendRequest | CodexProviderStatusRequest): string | undefined {
        const model = ('model' in request ? request.model : undefined) || ('options' in request ? request.options?.model : undefined);
        return model?.trim() || undefined;
    }

    protected openCodeProviderFromModel(model: string | undefined): string | undefined {
        if (!model) {
            return undefined;
        }
        const [provider, ...modelId] = model.split('/');
        return provider && modelId.length > 0 ? provider : undefined;
    }

    protected buildCliPrompt(adapter: CliRuntimeAdapter, prompt: string, input: CodexProviderInputItem[] | undefined, cwd: string): string {
        return this.buildOpenCodePrompt(prompt, input, cwd);
    }

    protected buildOpenCodePrompt(prompt: string, input: CodexProviderInputItem[] | undefined, cwd: string): string {
        return this.buildTurnInput(prompt, input, cwd).map(item => {
            if (item.type === 'text') {
                return item.text;
            }
            if (item.type === 'image') {
                return `Image: ${item.url}`;
            }
            if (item.type === 'localImage') {
                return `Image: ${item.path}`;
            }
            if (item.type === 'skill') {
                return `Skill: ${item.name} (${item.path})`;
            }
            return `Mention: ${item.name} (${item.path})`;
        }).filter(Boolean).join('\n\n');
    }

    protected buildDirectHttpRequest(
        provider: DirectHttpProviderConfig,
        protocol: DirectHttpProtocol,
        request: CodexProviderBackendRequest,
        cwd: string,
        model: string,
        apiKey: string
    ): { url: string, headers: Record<string, string>, body: Record<string, unknown> } {
        const prompt = this.buildDirectHttpPrompt(request.prompt, request.input, cwd);
        const variantOptions = this.reasoningVariantOptions(request.options);
        const baseHeaders: Record<string, string> = {
            'content-type': 'application/json'
        };
        if (protocol === 'anthropic-messages') {
            const body = this.compactObject({
                model,
                max_tokens: 32000,
                system: [{ type: 'text', text: prompt.system }],
                messages: [{
                    role: 'user',
                    content: this.buildAnthropicMessageContent(prompt)
                }],
                thinking: this.readRecord(variantOptions.thinking),
                stream: true
            });
            return {
                url: `${provider.baseUrl}/messages`,
                headers: {
                    ...baseHeaders,
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body
            };
        }
        if (protocol === 'openai-responses') {
            const body = this.compactObject({
                model,
                input: [
                    { role: 'system', content: prompt.system },
                    { role: 'user', content: this.buildOpenAiResponseInputContent(prompt) }
                ],
                stream: true,
                text: request.options?.verbosity ? { verbosity: request.options.verbosity } : undefined,
                reasoning: this.openAiResponsesReasoningOptions(request.options, variantOptions),
                service_tier: request.options?.serviceTier,
                include: variantOptions.include
            });
            return {
                url: `${provider.baseUrl}/responses`,
                headers: {
                    ...baseHeaders,
                    authorization: `Bearer ${apiKey}`
                },
                body
            };
        }
        if (protocol === 'google-generate') {
            const generationConfig = this.readRecord(variantOptions.thinkingConfig)
                ? { thinkingConfig: variantOptions.thinkingConfig }
                : undefined;
            return {
                url: `${provider.baseUrl}/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`,
                headers: {
                    ...baseHeaders,
                    'x-goog-api-key': apiKey
                },
                body: this.compactObject({
                    systemInstruction: {
                        parts: [{ text: prompt.system }]
                    },
                    contents: [{
                        role: 'user',
                        parts: this.buildGoogleGenerateParts(prompt)
                    }],
                    generationConfig
                })
            };
        }
        const chatBody = this.compactObject({
            model,
            messages: [
                { role: 'system', content: prompt.system },
                { role: 'user', content: this.buildOpenAiChatMessageContent(prompt) }
            ],
            stream: true,
            stream_options: { include_usage: true },
            reasoning: this.readRecord(variantOptions.reasoning),
            reasoning_effort: this.readString(variantOptions, 'reasoning_effort') || this.readString(variantOptions, 'reasoningEffort') || request.options?.reasoningEffort,
            thinking: this.readRecord(variantOptions.thinking),
            service_tier: request.options?.serviceTier
        });
        return {
            url: `${provider.baseUrl}/chat/completions`,
            headers: {
                ...baseHeaders,
                authorization: `Bearer ${apiKey}`,
                ...(provider.provider === 'openrouter' ? {
                    'HTTP-Referer': 'https://cybervinci.ai/',
                    'X-Title': 'CyberVinci'
                } : {
                    'x-session-affinity': request.sessionId || streamIdSafe(request.prompt)
                })
            },
            body: chatBody
        };

        function streamIdSafe(value: string): string {
            return Buffer.from(value).toString('base64').slice(0, 24) || 'cybervinci';
        }
    }

    protected reasoningVariantOptions(options: Partial<CodexProviderOptions> | undefined): Record<string, unknown> {
        return options?.reasoningVariant && options.reasoningVariant !== 'default'
            ? options.reasoningVariantOptions ?? {}
            : {};
    }

    protected openAiResponsesReasoningOptions(
        options: Partial<CodexProviderOptions> | undefined,
        variantOptions: Record<string, unknown>
    ): Record<string, unknown> | undefined {
        const reasoning = this.readRecord(variantOptions.reasoning) ?? {};
        const effort = this.readString(variantOptions, 'reasoningEffort')
            || this.readString(reasoning, 'effort')
            || options?.reasoningEffort;
        const summary = this.readString(variantOptions, 'reasoningSummary') || this.readString(reasoning, 'summary');
        const result = this.compactObject({
            ...reasoning,
            effort,
            summary
        });
        return Object.keys(result).length ? result : undefined;
    }

    protected compactObject<T extends Record<string, unknown>>(value: T): T {
        return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
    }

    protected readRecord(value: unknown): Record<string, unknown> | undefined {
        return value && typeof value === 'object' && !Array.isArray(value)
            ? value as Record<string, unknown>
            : undefined;
    }

    protected buildDirectHttpPrompt(prompt: string, input: CodexProviderInputItem[] | undefined, cwd: string): DirectHttpPromptParts {
        const items = this.buildTurnInput(prompt, input, cwd);
        const system = items.slice(0, 2).map(item => this.directInputItemToText(item)).filter(Boolean).join('\n\n');
        const userItems = items.slice(2);
        const user = userItems.map(item => this.directInputItemToText(item)).filter(Boolean).join('\n\n') || prompt;
        const images = userItems.map(item => this.directInputItemToImageUrl(item)).filter((url): url is string => !!url);
        return { system, user, images };
    }

    protected directInputItemToText(item: CodexProviderInputItem): string {
        if (item.type === 'text') {
            return item.text;
        }
        if (item.type === 'image') {
            return item.url.startsWith('data:') ? 'Image attached.' : `Image attached: ${item.url}`;
        }
        if (item.type === 'localImage') {
            return `Image attached: ${path.basename(item.path)}`;
        }
        if (item.type === 'skill') {
            return `Skill: ${item.name} (${item.path})`;
        }
        return `Mention: ${item.name} (${item.path})`;
    }

    protected directInputItemToImageUrl(item: CodexProviderInputItem): string | undefined {
        if (item.type === 'image') {
            return item.url;
        }
        if (item.type === 'localImage') {
            return this.localImageToDataUrl(item.path);
        }
        return undefined;
    }

    protected localImageToDataUrl(filePath: string): string | undefined {
        try {
            if (!fs.existsSync(filePath)) {
                return undefined;
            }
            const mimeType = this.imageMimeType(filePath);
            return `data:${mimeType};base64,${fs.readFileSync(filePath).toString('base64')}`;
        } catch {
            return undefined;
        }
    }

    protected imageMimeType(filePath: string): string {
        switch (path.extname(filePath).toLowerCase()) {
            case '.jpg':
            case '.jpeg':
                return 'image/jpeg';
            case '.webp':
                return 'image/webp';
            case '.gif':
                return 'image/gif';
            case '.svg':
                return 'image/svg+xml';
            case '.png':
            default:
                return 'image/png';
        }
    }

    protected buildOpenAiChatMessageContent(prompt: DirectHttpPromptParts): string | Array<Record<string, unknown>> {
        if (!prompt.images.length) {
            return prompt.user;
        }
        return [
            { type: 'text', text: prompt.user },
            ...prompt.images.map(url => ({ type: 'image_url', image_url: { url } }))
        ];
    }

    protected buildOpenAiResponseInputContent(prompt: DirectHttpPromptParts): Array<Record<string, unknown>> {
        return [
            { type: 'input_text', text: prompt.user },
            ...prompt.images.map(url => ({ type: 'input_image', image_url: url }))
        ];
    }

    protected buildAnthropicMessageContent(prompt: DirectHttpPromptParts): Array<Record<string, unknown>> {
        return [
            { type: 'text', text: prompt.user },
            ...prompt.images.map(url => this.toAnthropicImageContent(url)).filter((content): content is Record<string, unknown> => !!content)
        ];
    }

    protected toAnthropicImageContent(url: string): Record<string, unknown> | undefined {
        const parsed = this.parseImageDataUrl(url);
        if (!parsed) {
            return undefined;
        }
        return {
            type: 'image',
            source: {
                type: 'base64',
                media_type: parsed.mimeType,
                data: parsed.base64
            }
        };
    }

    protected buildGoogleGenerateParts(prompt: DirectHttpPromptParts): Array<Record<string, unknown>> {
        return [
            { text: prompt.user },
            ...prompt.images.map(url => this.toGoogleImagePart(url)).filter((part): part is Record<string, unknown> => !!part)
        ];
    }

    protected toGoogleImagePart(url: string): Record<string, unknown> | undefined {
        const parsed = this.parseImageDataUrl(url);
        if (!parsed) {
            return undefined;
        }
        return {
            inlineData: {
                mimeType: parsed.mimeType,
                data: parsed.base64
            }
        };
    }

    protected parseImageDataUrl(url: string): { mimeType: string; base64: string } | undefined {
        const match = /^data:([^;,]+);base64,(.+)$/i.exec(url.trim());
        return match ? { mimeType: match[1], base64: match[2] } : undefined;
    }

    protected async readDirectHttpSseStream(
        protocol: DirectHttpProtocol,
        streamId: string,
        body: unknown,
        client: CodexProviderClient | undefined
    ): Promise<void> {
        const reader = (body as {
            getReader: () => {
                read: () => Promise<{ done: boolean, value?: Uint8Array }>,
                releaseLock?: () => void
            }
        }).getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }
                buffer += decoder.decode(value, { stream: true });
                let index = this.findSseBlockEnd(buffer);
                while (index >= 0) {
                    const block = buffer.slice(0, index);
                    buffer = buffer.slice(index + (buffer[index] === '\r' ? 4 : 2));
                    this.handleDirectHttpSseBlock(protocol, streamId, block, client);
                    index = this.findSseBlockEnd(buffer);
                }
            }
            buffer += decoder.decode();
            if (buffer.trim()) {
                this.handleDirectHttpSseBlock(protocol, streamId, buffer, client);
            }
        } finally {
            reader.releaseLock?.();
        }
    }

    protected findSseBlockEnd(buffer: string): number {
        const crlf = buffer.indexOf('\r\n\r\n');
        const lf = buffer.indexOf('\n\n');
        if (crlf >= 0 && lf >= 0) {
            return Math.min(crlf, lf);
        }
        return crlf >= 0 ? crlf : lf;
    }

    protected handleDirectHttpSseBlock(
        protocol: DirectHttpProtocol,
        streamId: string,
        block: string,
        client: CodexProviderClient | undefined
    ): void {
        const lines = block.split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith(':'));
        const event = lines.find(line => line.startsWith('event:'))?.slice('event:'.length).trim();
        const data = lines.filter(line => line.startsWith('data:')).map(line => line.slice('data:'.length).trim()).join('\n');
        if (!data || data === '[DONE]') {
            return;
        }
        let json: unknown;
        try {
            json = JSON.parse(data);
        } catch {
            this.logger.debug('Ignoring non-JSON direct API SSE data:', data);
            return;
        }
        if (protocol === 'openai-responses') {
            this.handleDirectOpenAiResponsesEvent(streamId, event, json, client);
        } else if (protocol === 'anthropic-messages') {
            this.handleDirectAnthropicEvent(streamId, event, json, client);
        } else if (protocol === 'google-generate') {
            this.handleDirectGoogleEvent(streamId, json, client);
        } else {
            this.handleDirectOpenAiChatEvent(streamId, json, client);
        }
    }

    protected handleDirectHttpJsonResponse(
        protocol: DirectHttpProtocol,
        streamId: string,
        json: unknown,
        client: CodexProviderClient | undefined
    ): void {
        const text = this.extractDirectHttpResponseText(protocol, json);
        if (text) {
            this.sendDirectTextDelta(streamId, text, client);
        }
    }

    protected handleDirectOpenAiChatEvent(streamId: string, json: unknown, client: CodexProviderClient | undefined): void {
        const error = this.readObject(json, 'error');
        if (Object.keys(error).length > 0) {
            this.sendDirectError(streamId, this.openCodeErrorToString(error), client);
            return;
        }
        for (const choice of this.readArray(json, 'choices')) {
            const delta = this.readObject(choice, 'delta');
            const reasoning = this.readFirstAvailableString(delta, ['reasoning_content', 'reasoning', 'thinking']);
            if (reasoning) {
                this.sendDirectReasoningDelta(streamId, reasoning, client);
            }
            const text = this.readString(delta, 'content');
            if (text) {
                this.sendDirectTextDelta(streamId, text, client);
            }
            const toolCalls = this.readArray(delta, 'tool_calls');
            if (toolCalls.length > 0) {
                this.sendDirectToolCall(streamId, toolCalls, client);
            }
        }
    }

    protected handleDirectOpenAiResponsesEvent(streamId: string, event: string | undefined, json: unknown, client: CodexProviderClient | undefined): void {
        const type = event || this.readString(json, 'type');
        if (type.includes('error')) {
            this.sendDirectError(streamId, this.openCodeErrorToString(this.readObject(json, 'error') || json), client);
            return;
        }
        if (type === 'response.output_text.delta') {
            const text = this.readString(json, 'delta') || this.readString(json, 'text') || this.readString(json, 'output_text_delta');
            if (text) {
                this.sendDirectTextDelta(streamId, text, client);
            }
            return;
        }
        if (type.includes('reasoning') && type.endsWith('.delta')) {
            const text = this.readString(json, 'delta') || this.readString(json, 'text') || this.readString(json, 'summary_text_delta');
            if (text) {
                this.sendDirectReasoningDelta(streamId, text, client);
            }
            return;
        }
        if (type === 'response.output_item.added') {
            const item = this.readObject(json, 'item');
            if (this.readString(item, 'type') === 'function_call') {
                this.sendDirectToolCall(streamId, item, client);
            }
        }
    }

    protected handleDirectAnthropicEvent(streamId: string, event: string | undefined, json: unknown, client: CodexProviderClient | undefined): void {
        const type = this.readString(json, 'type') || event || '';
        if (type.includes('error')) {
            this.sendDirectError(streamId, this.openCodeErrorToString(this.readObject(json, 'error') || json), client);
            return;
        }
        if (type === 'content_block_start') {
            const contentBlock = this.readObject(json, 'content_block');
            if (this.readString(contentBlock, 'type') === 'tool_use') {
                this.sendDirectToolCall(streamId, contentBlock, client);
            }
            return;
        }
        if (type === 'content_block_delta') {
            const delta = this.readObject(json, 'delta');
            const deltaType = this.readString(delta, 'type');
            const text = this.readString(delta, 'text') || this.readString(delta, 'partial_json');
            if (!text) {
                return;
            }
            if (deltaType === 'thinking_delta' || deltaType === 'signature_delta') {
                this.sendDirectReasoningDelta(streamId, text, client);
            } else if (deltaType === 'input_json_delta') {
                this.sendDirectToolCall(streamId, { arguments: text }, client);
            } else {
                this.sendDirectTextDelta(streamId, text, client);
            }
        }
    }

    protected handleDirectGoogleEvent(streamId: string, json: unknown, client: CodexProviderClient | undefined): void {
        const error = this.readObject(json, 'error');
        if (Object.keys(error).length > 0) {
            this.sendDirectError(streamId, this.openCodeErrorToString(error), client);
            return;
        }
        for (const candidate of this.readArray(json, 'candidates')) {
            const content = this.readObject(candidate, 'content');
            for (const part of this.readArray(content, 'parts')) {
                const text = this.readString(part, 'text');
                if (text) {
                    this.sendDirectTextDelta(streamId, text, client);
                }
            }
        }
    }

    protected extractDirectHttpResponseText(protocol: DirectHttpProtocol, json: unknown): string {
        if (protocol === 'openai-responses') {
            const direct = this.readString(json, 'output_text');
            if (direct) {
                return direct;
            }
            return this.readArray(json, 'output').flatMap(item => this.readArray(item, 'content'))
                .map(content => this.readString(content, 'text')).filter(Boolean).join('');
        }
        if (protocol === 'anthropic-messages') {
            return this.readArray(json, 'content').map(content => this.readString(content, 'text')).filter(Boolean).join('');
        }
        if (protocol === 'google-generate') {
            return this.readArray(json, 'candidates').flatMap(candidate => this.readArray(this.readObject(candidate, 'content'), 'parts'))
                .map(part => this.readString(part, 'text')).filter(Boolean).join('');
        }
        return this.readArray(json, 'choices')
            .map(choice => this.readString(this.readObject(choice, 'message'), 'content'))
            .filter(Boolean)
            .join('');
    }

    protected sendDirectTextDelta(streamId: string, text: string, client: CodexProviderClient | undefined): void {
        if (!text) {
            return;
        }
        const stream = this.activeStreams.get(streamId);
        if (stream) {
            stream.receivedNotification = true;
            stream.receivedAgentDelta = true;
        }
        client?.sendToken(streamId, {
            type: 'notification',
            method: 'item/agentMessage/delta',
            params: {
                delta: text,
                runtime: 'direct-http'
            }
        });
    }

    protected sendDirectReasoningDelta(streamId: string, text: string, client: CodexProviderClient | undefined): void {
        if (!text) {
            return;
        }
        const stream = this.activeStreams.get(streamId);
        if (stream) {
            stream.receivedNotification = true;
        }
        client?.sendToken(streamId, {
            type: 'notification',
            method: 'item/reasoning/textDelta',
            params: {
                delta: text,
                runtime: 'direct-http'
            }
        });
    }

    protected sendDirectToolCall(streamId: string, raw: unknown, client: CodexProviderClient | undefined): void {
        const stream = this.activeStreams.get(streamId);
        if (stream) {
            stream.receivedNotification = true;
        }
        client?.sendToken(streamId, {
            type: 'notification',
            method: 'item/completed',
            params: {
                item: {
                    type: 'toolCall',
                    runtime: 'direct-http',
                    raw
                }
            }
        });
    }

    protected sendDirectError(streamId: string, message: string, client: CodexProviderClient | undefined): void {
        client?.sendToken(streamId, {
            type: 'notification',
            method: 'error',
            params: { message }
        });
    }

    protected handleCliRunLine(adapter: CliRuntimeAdapter, streamId: string, line: string, client: CodexProviderClient | undefined): void {
        const cleanLine = this.stripAnsi(line).trim();
        if (!cleanLine) {
            return;
        }
        let event: Record<string, unknown>;
        try {
            event = JSON.parse(cleanLine);
        } catch (error) {
            if (adapter.runtime !== 'opencode-cli') {
                this.sendCliTextDelta(adapter, streamId, cleanLine, client);
            } else {
                this.logger.debug('Ignoring non-JSON OpenCode output:', cleanLine, error);
            }
            return;
        }
        if (adapter.runtime === 'opencode-cli') {
            this.handleOpenCodeRunEvent(streamId, event, client);
        } else {
            this.handleGenericCliRunEvent(adapter, streamId, event, client);
        }
    }

    protected handleOpenCodeRunEvent(streamId: string, event: Record<string, unknown>, client: CodexProviderClient | undefined): void {
        const type = this.readString(event, 'type');
        const part = this.readObject(event, 'part');
        if (type === 'text') {
            const text = this.readString(part, 'text');
            if (text) {
                const stream = this.activeStreams.get(streamId);
                if (stream) {
                    stream.receivedNotification = true;
                    stream.receivedAgentDelta = true;
                }
                client?.sendToken(streamId, {
                    type: 'notification',
                    method: 'item/agentMessage/delta',
                    params: {
                        delta: text,
                        runtime: 'opencode-cli',
                        sessionID: this.readString(event, 'sessionID')
                    }
                });
            }
            return;
        }
        if (type === 'reasoning') {
            const text = this.readString(part, 'text');
            if (text) {
                const stream = this.activeStreams.get(streamId);
                if (stream) {
                    stream.receivedNotification = true;
                }
                client?.sendToken(streamId, {
                    type: 'notification',
                    method: 'item/reasoning/textDelta',
                    params: {
                        delta: text,
                        runtime: 'opencode-cli',
                        sessionID: this.readString(event, 'sessionID')
                    }
                });
            }
            return;
        }
        if (type === 'tool_use') {
            const stream = this.activeStreams.get(streamId);
            if (stream) {
                stream.receivedNotification = true;
            }
            client?.sendToken(streamId, {
                type: 'notification',
                method: 'item/completed',
                params: {
                    item: {
                        type: 'toolCall',
                        runtime: 'opencode-cli',
                        raw: part
                    }
                }
            });
            return;
        }
        if (type === 'error') {
            const message = this.openCodeErrorToString(event['error']);
            client?.sendToken(streamId, {
                type: 'notification',
                method: 'error',
                params: { message }
            });
        }
    }

    protected handleGenericCliRunEvent(
        adapter: CliRuntimeAdapter,
        streamId: string,
        event: Record<string, unknown>,
        client: CodexProviderClient | undefined
    ): void {
        const type = this.readString(event, 'type').toLowerCase();
        if (type.includes('error') || event['error']) {
            const message = this.openCodeErrorToString(event['error'] ?? event);
            client?.sendToken(streamId, {
                type: 'notification',
                method: 'error',
                params: { message }
            });
            return;
        }

        const reasoning = this.extractCliReasoningText(event);
        if (reasoning) {
            this.sendCliReasoningDelta(adapter, streamId, reasoning, client);
            return;
        }

        const text = this.extractCliText(event);
        if (text) {
            const finalLike = type === 'result' || type === 'complete' || type === 'completed' || type === 'response';
            if (finalLike && this.activeStreams.get(streamId)?.receivedAgentDelta) {
                return;
            }
            this.sendCliTextDelta(adapter, streamId, text, client);
            return;
        }

        if (type.includes('tool') || this.readObject(event, 'tool').type || this.readObject(event, 'toolCall').type) {
            client?.sendToken(streamId, {
                type: 'notification',
                method: 'item/completed',
                params: {
                    item: {
                        type: 'toolCall',
                        runtime: adapter.runtime,
                        raw: event
                    }
                }
            });
        }
    }

    protected sendCliTextDelta(adapter: CliRuntimeAdapter, streamId: string, text: string, client: CodexProviderClient | undefined): void {
        if (!text) {
            return;
        }
        const stream = this.activeStreams.get(streamId);
        if (stream) {
            stream.receivedNotification = true;
            stream.receivedAgentDelta = true;
        }
        client?.sendToken(streamId, {
            type: 'notification',
            method: 'item/agentMessage/delta',
            params: {
                delta: text,
                runtime: adapter.runtime
            }
        });
    }

    protected sendCliReasoningDelta(adapter: CliRuntimeAdapter, streamId: string, text: string, client: CodexProviderClient | undefined): void {
        if (!text) {
            return;
        }
        const stream = this.activeStreams.get(streamId);
        if (stream) {
            stream.receivedNotification = true;
        }
        client?.sendToken(streamId, {
            type: 'notification',
            method: 'item/reasoning/textDelta',
            params: {
                delta: text,
                runtime: adapter.runtime
            }
        });
    }

    protected extractCliText(event: Record<string, unknown>): string {
        const direct = this.readFirstAvailableString(event, ['delta', 'text', 'content', 'message', 'response', 'result']);
        if (direct) {
            return direct;
        }
        const nestedObjects = [
            this.readObject(event, 'delta'),
            this.readObject(event, 'part'),
            this.readObject(event, 'message'),
            this.readObject(event, 'event')
        ];
        for (const nested of nestedObjects) {
            const nestedText = this.readFirstAvailableString(nested, ['delta', 'text', 'content', 'message', 'response', 'result']);
            if (nestedText) {
                return nestedText;
            }
        }
        const content = this.readArray(this.readObject(event, 'message'), 'content').length > 0
            ? this.readArray(this.readObject(event, 'message'), 'content')
            : this.readArray(event, 'content');
        const parts = content.map(part => {
            if (typeof part === 'string') {
                return part;
            }
            return this.readFirstAvailableString(part, ['text', 'content', 'message']);
        }).filter(Boolean);
        return parts.join('');
    }

    protected extractCliReasoningText(event: Record<string, unknown>): string {
        const direct = this.readFirstAvailableString(event, ['thinking', 'thought', 'reasoning']);
        if (direct) {
            return direct;
        }
        const part = this.readObject(event, 'part');
        const partType = this.readString(part, 'type').toLowerCase();
        if (partType === 'reasoning' || partType === 'thinking') {
            return this.readFirstAvailableString(part, ['text', 'content', 'message']);
        }
        const delta = this.readObject(event, 'delta');
        return this.readFirstAvailableString(delta, ['thinking', 'thought', 'reasoning']);
    }

    protected readFirstAvailableString(source: unknown, keys: string[]): string {
        for (const key of keys) {
            const value = this.readString(source, key);
            if (value) {
                return value;
            }
        }
        return '';
    }

    protected openCodeErrorToString(error: unknown): string {
        if (typeof error === 'string') {
            return error;
        }
        if (typeof error === 'object' && error) {
            const data = this.readObject(error, 'data');
            const dataMessage = this.readString(data, 'message');
            if (dataMessage) {
                return dataMessage;
            }
            const message = this.readString(error, 'message') || this.readString(error, 'name');
            if (message) {
                return message;
            }
        }
        return this.errorToString(error);
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

    protected async primeProcessEnvironment(): Promise<void> {
        await this.resolveBaseProcessEnvironment();
    }

    protected async resolveBaseProcessEnvironment(): Promise<ResolvedSpawnEnvironment> {
        const now = Date.now();
        if (this.baseProcessEnvironmentCache && this.baseProcessEnvironmentCache.expiresAt > now) {
            return {
                env: { ...this.baseProcessEnvironmentCache.value.env },
                fingerprint: this.baseProcessEnvironmentCache.value.fingerprint
            };
        }
        if (!this.baseProcessEnvironmentPromise) {
            this.baseProcessEnvironmentPromise = this.loadBaseProcessEnvironment()
                .then(value => {
                    this.baseProcessEnvironmentCache = {
                        expiresAt: Date.now() + BASE_PROCESS_ENVIRONMENT_TTL_MS,
                        value
                    };
                    return value;
                })
                .finally(() => {
                    this.baseProcessEnvironmentPromise = undefined;
                });
        }
        const value = await this.baseProcessEnvironmentPromise;
        return {
            env: { ...value.env },
            fingerprint: value.fingerprint
        };
    }

    protected async loadBaseProcessEnvironment(): Promise<ResolvedSpawnEnvironment> {
        const env: NodeJS.ProcessEnv = { ...process.env };
        if (process.platform === 'win32') {
            try {
                this.mergeWindowsEnvironment(env, await this.readWindowsEnvironmentFromRegistry());
            } catch (error) {
                this.logger.debug('CyberVinci AI Providers could not read Windows user environment:', error);
            }
            this.applyPathEntries(env, this.defaultWindowsPathEntries(env));
        }
        this.applyResolvedEnvironmentToProcess(env);
        return {
            env,
            fingerprint: this.environmentFingerprint(env)
        };
    }

    protected readWindowsEnvironmentFromRegistry(): Promise<NodeJS.ProcessEnv> {
        const systemRoot = process.env.SystemRoot || 'C:\\Windows';
        const powershell = path.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
        const script = [
            '$ErrorActionPreference = "Stop"',
            '[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)',
            '$OutputEncoding = [Console]::OutputEncoding',
            '$result = @{}',
            'foreach ($scope in @("Machine", "User")) {',
            '  $vars = [Environment]::GetEnvironmentVariables($scope)',
            '  foreach ($key in $vars.Keys) {',
            '    $value = [string]$vars[$key]',
            '    if ($value) { $result[$key] = [Environment]::ExpandEnvironmentVariables($value) }',
            '  }',
            '}',
            '$result | ConvertTo-Json -Compress'
        ].join('; ');
        return this.runRawCommandOutput(powershell, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script], undefined, 3000, { ...process.env })
            .then(output => {
                const parsed = JSON.parse(output.replace(/^\uFEFF/, '').trim() || '{}') as Record<string, unknown>;
                const env: NodeJS.ProcessEnv = {};
                for (const [key, value] of Object.entries(parsed)) {
                    if (typeof value === 'string' && value.trim()) {
                        env[key] = value;
                    }
                }
                return env;
            });
    }

    protected mergeWindowsEnvironment(env: NodeJS.ProcessEnv, incoming: NodeJS.ProcessEnv): void {
        const pathKey = this.findPathKey(env);
        const incomingPathKey = Object.keys(incoming).find(key => key.toLowerCase() === 'path');
        if (incomingPathKey && incoming[incomingPathKey]) {
            this.applyPathEntries(env, incoming[incomingPathKey]!.split(path.delimiter).filter(entry => !!entry));
        }
        for (const [key, value] of Object.entries(incoming)) {
            if (!value || key.toLowerCase() === 'path') {
                continue;
            }
            const existingKey = Object.keys(env).find(candidate => candidate.toLowerCase() === key.toLowerCase());
            if (!existingKey || !env[existingKey]) {
                env[existingKey ?? key] = value;
            }
        }
        if (!env[pathKey]) {
            env[pathKey] = incoming[incomingPathKey ?? 'Path'];
        }
    }

    protected defaultWindowsPathEntries(env: NodeJS.ProcessEnv): string[] {
        if (process.platform !== 'win32') {
            return [];
        }
        const userProfile = env.USERPROFILE || os.homedir();
        const localAppData = env.LOCALAPPDATA || (userProfile ? path.join(userProfile, 'AppData', 'Local') : undefined);
        const programFiles = env.ProgramFiles || 'C:\\Program Files';
        const programFilesX86 = env['ProgramFiles(x86)'];
        return [
            userProfile ? path.join(userProfile, 'AppData', 'Roaming', 'npm') : undefined,
            localAppData ? path.join(localAppData, 'Programs', 'nodejs') : undefined,
            programFiles ? path.join(programFiles, 'nodejs') : undefined,
            programFilesX86 ? path.join(programFilesX86, 'nodejs') : undefined,
            env.VOLTA_HOME ? path.join(env.VOLTA_HOME, 'bin') : undefined,
            env.FNM_MULTISHELL_PATH,
            env.MISE_BIN
        ].filter((entry): entry is string => !!entry);
    }

    protected applyResolvedEnvironmentToProcess(env: NodeJS.ProcessEnv): void {
        const processPathKey = this.findPathKey(process.env);
        const envPathKey = this.findPathKey(env);
        if (env[envPathKey]) {
            process.env[processPathKey] = env[envPathKey];
        }
        for (const [key, value] of Object.entries(env)) {
            if (!value || key.toLowerCase() === 'path') {
                continue;
            }
            const existingKey = Object.keys(process.env).find(candidate => candidate.toLowerCase() === key.toLowerCase());
            if (!existingKey || !process.env[existingKey]) {
                process.env[existingKey ?? key] = value;
            }
        }
    }

    protected environmentFingerprint(env: NodeJS.ProcessEnv): string {
        const relevant = AI_PROVIDER_ENVIRONMENT_KEYS
            .map(key => {
                const actualKey = Object.keys(env).find(candidate => candidate.toLowerCase() === key.toLowerCase());
                return actualKey ? `${key}=${env[actualKey] ?? ''}` : `${key}=`;
            })
            .join('\n');
        return createHash('sha256').update(relevant).digest('hex');
    }

    protected async resolveSpawnEnvironment(context: CodexProviderSpawnEnvironmentContext): Promise<ResolvedSpawnEnvironment> {
        const baseEnvironment = await this.resolveBaseProcessEnvironment();
        const env: NodeJS.ProcessEnv = { ...baseEnvironment.env };
        const pathEntries: string[] = [];
        const fingerprints: string[] = [baseEnvironment.fingerprint];
        const contributions = this.spawnEnvironmentContributions?.getContributions() ?? [];
        for (const contribution of contributions) {
            let fragment: CodexProviderSpawnEnvironmentFragment | undefined;
            try {
                fragment = await contribution.contributeCodexProviderSpawnEnvironment(context);
            } catch (error) {
                this.logger.warn('CyberVinci AI Providers spawn environment contribution failed:', error);
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
                base: baseEnvironment.fingerprint,
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
            clientInfo: { name: 'theia-ai-providers', version: '1.0.0' },
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
            this.logger.debug('CyberVinci AI Providers thread resume failed; starting a new thread:', error);
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
            const variantOptions = this.reasoningVariantOptions(options);
            const effort = this.readString(variantOptions, 'reasoningEffort')
                || this.readString(this.readRecord(variantOptions.reasoning), 'effort')
                || options?.reasoningEffort;
            this.addIfTruthy(params, 'model', options?.model);
            this.addIfTruthy(params, 'effort', effort);
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
            { type: 'text', text: CODEX_CLI_MEMORY_GRAPH_FIRST_INSTRUCTION, text_elements: [] },
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

    protected async getDirectHttpStatus(provider: DirectHttpProviderConfig, request: CodexProviderStatusRequest): Promise<CodexProviderBackendStatus> {
        const apiKey = this.resolveDirectHttpApiKey(provider, request);
        const credentialError = apiKey ? this.currentDirectHttpCredentialError(provider, apiKey) : undefined;
        const available = !!apiKey && !credentialError;
        const modelMetadata = await this.readDirectHttpModelCatalog(provider).catch(error => {
            this.logger.debug(`${provider.label} model list failed:`, error);
            return [this.fallbackDirectHttpModelMetadata(provider)];
        });
        const models = this.modelIdsFromMetadata(modelMetadata) ?? [provider.defaultModel];
        return {
            runtime: 'direct-http',
            modelProvider: provider.provider,
            available,
            executablePath: provider.baseUrl,
            appServer: false,
            authenticated: available,
            authStatus: !apiKey ? 'api key required' : credentialError ? 'api key rejected' : 'api key configured',
            accountLabel: available ? provider.label : undefined,
            models,
            modelMetadata,
            configurationRequired: available ? undefined : [provider.apiKeyEnvVar],
            message: credentialError?.reason ?? (apiKey ? undefined : nls.localize(
                'theia/ai/ai-providers/directApiKeyMissing',
                'Configure an API key or set {0} in the environment.',
                provider.apiKeyEnvVar
            )),
            capabilities: {
                webSearch: provider.provider === 'openrouter',
                imageGeneration: false,
                mcp: false,
                applyPatch: false,
                shellExecution: false,
                raw: {
                    provider: provider.provider,
                    runtime: 'direct-http',
                    baseUrl: provider.baseUrl
                }
            }
        };
    }

    protected async readDirectHttpModels(provider: DirectHttpProviderConfig): Promise<string[] | undefined> {
        return this.modelIdsFromMetadata(await this.readDirectHttpModelCatalog(provider));
    }

    protected async readDirectHttpModelCatalog(provider: DirectHttpProviderConfig): Promise<CodexProviderModelMetadata[] | undefined> {
        const cacheKey = provider.provider;
        const now = Date.now();
        const cached = this.directHttpModelCatalogCache.get(cacheKey);
        if (cached?.value && cached.expiresAt > now) {
            return this.applyDirectHttpUnavailableModels(provider, cached.value);
        }
        if (cached?.promise) {
            return cached.promise.then(value => this.applyDirectHttpUnavailableModels(provider, value));
        }
        const promise = this.fetchDirectHttpModelCatalog(provider).then(value => {
            this.directHttpModelCatalogCache.set(cacheKey, {
                value,
                expiresAt: Date.now() + DIRECT_HTTP_MODEL_CATALOG_TTL_MS
            });
            return this.applyDirectHttpUnavailableModels(provider, value);
        }, error => {
            const previous = this.directHttpModelCatalogCache.get(cacheKey)?.value;
            this.directHttpModelCatalogCache.delete(cacheKey);
            if (previous?.length) {
                return this.applyDirectHttpUnavailableModels(provider, previous);
            }
            throw error;
        });
        this.directHttpModelCatalogCache.set(cacheKey, {
            promise,
            value: cached?.value,
            expiresAt: cached?.expiresAt ?? 0
        });
        return promise;
    }

    protected async fetchDirectHttpModelCatalog(provider: DirectHttpProviderConfig): Promise<CodexProviderModelMetadata[] | undefined> {
        const response = await fetch(provider.modelsUrl);
        if (!response.ok) {
            throw new Error(nls.localize(
                'theia/ai/ai-providers/directModelsHttpError',
                'Model list request failed with HTTP {0}.',
                response.status
            ));
        }
        const json = await response.json();
        const modelValues = this.readArray(json, 'data').length > 0 ? this.readArray(json, 'data') : this.readArray(json, 'models');
        const metadata = modelValues
            .map(model => this.toDirectHttpModelMetadata(provider, model))
            .filter((model): model is CodexProviderModelMetadata => !!model);
        const baseMetadata = metadata.length > 0 ? this.uniqueModelMetadata(metadata) : [this.fallbackDirectHttpModelMetadata(provider)];
        return this.enrichDirectHttpModelMetadata(provider, baseMetadata);
    }

    protected markDirectHttpModelUnavailableFromError(provider: DirectHttpProviderConfig, model: string, status: number, detail: string): void {
        const reason = this.directHttpUnavailableModelReason(status, detail);
        if (!reason) {
            return;
        }
        const modelId = this.withDirectProviderPrefix(provider, model);
        const now = Date.now();
        const providerModels = this.directHttpUnavailableModels.get(provider.provider) ?? new Map<string, DirectHttpUnavailableModel>();
        providerModels.set(modelId, {
            reason,
            observedAt: now,
            expiresAt: now + DIRECT_HTTP_UNAVAILABLE_MODEL_TTL_MS
        });
        this.directHttpUnavailableModels.set(provider.provider, providerModels);
        this.directHttpModelCatalogCache.delete(provider.provider);
        this.logger?.warn(`${provider.label} model marked unavailable: ${modelId}. ${reason}`);
    }

    protected directHttpUnavailableModelReason(status: number, detail: string): string | undefined {
        if (status !== 401 && status !== 403 && status !== 404) {
            return undefined;
        }
        const parsedMessage = this.extractDirectHttpErrorMessage(detail);
        const candidate = parsedMessage || detail;
        const normalized = candidate.toLowerCase();
        if (normalized.includes('free promotion has ended')) {
            return parsedMessage || 'Free promotion has ended for this model.';
        }
        if (normalized.includes('modelerror') && (normalized.includes('not available') || normalized.includes('unavailable'))) {
            return parsedMessage || 'Model is not available for this provider/account.';
        }
        return undefined;
    }

    protected markDirectHttpCredentialErrorFromResponse(provider: DirectHttpProviderConfig, apiKey: string, status: number, detail: string): string | undefined {
        const reason = this.directHttpCredentialErrorReason(status, detail);
        if (!reason) {
            return undefined;
        }
        const now = Date.now();
        this.directHttpCredentialErrors.set(provider.provider, {
            reason,
            keyFingerprint: this.directHttpApiKeyFingerprint(apiKey),
            observedAt: now,
            expiresAt: now + DIRECT_HTTP_CREDENTIAL_ERROR_TTL_MS
        });
        this.logger?.warn(`${provider.label} API key was rejected: ${reason}`);
        return reason;
    }

    protected clearDirectHttpCredentialError(provider: DirectHttpProviderConfig, apiKey: string): void {
        const current = this.directHttpCredentialErrors.get(provider.provider);
        if (!current || current.keyFingerprint !== this.directHttpApiKeyFingerprint(apiKey)) {
            return;
        }
        this.directHttpCredentialErrors.delete(provider.provider);
    }

    protected currentDirectHttpCredentialError(provider: DirectHttpProviderConfig, apiKey: string): DirectHttpCredentialError | undefined {
        const current = this.directHttpCredentialErrors.get(provider.provider);
        if (!current) {
            return undefined;
        }
        if (current.expiresAt <= Date.now() || current.keyFingerprint !== this.directHttpApiKeyFingerprint(apiKey)) {
            this.directHttpCredentialErrors.delete(provider.provider);
            return undefined;
        }
        return current;
    }

    protected directHttpCredentialErrorReason(status: number, detail: string): string | undefined {
        if (status !== 401 && status !== 403) {
            return undefined;
        }
        const parsedMessage = this.extractDirectHttpErrorMessage(detail);
        if (status === 401) {
            return parsedMessage || nls.localize(
                'theia/ai/ai-providers/directApiKeyRejected',
                'The provider rejected the configured API key. Paste a valid key to continue.'
            );
        }
        const candidate = parsedMessage || detail;
        const normalized = candidate.toLowerCase();
        if (/\b(api[\s_-]?key|auth|authenticated|authentication|unauthori[sz]ed|credential|forbidden|invalid|token)\b/.test(normalized)) {
            return parsedMessage || nls.localize(
                'theia/ai/ai-providers/directApiKeyRejectedForbidden',
                'The provider rejected the configured API key or account permissions. Paste a valid key to continue.'
            );
        }
        return undefined;
    }

    protected directHttpApiKeyFingerprint(apiKey: string): string {
        return createHash('sha256').update(apiKey).digest('hex');
    }

    protected extractDirectHttpErrorMessage(detail: string): string | undefined {
        const trimmed = detail.trim();
        if (!trimmed) {
            return undefined;
        }
        try {
            const parsed = JSON.parse(trimmed);
            const error = this.readObject(parsed, 'error');
            return this.readString(error, 'message') || this.readString(parsed, 'message') || undefined;
        } catch {
            return undefined;
        }
    }

    protected applyDirectHttpUnavailableModels(
        provider: DirectHttpProviderConfig,
        metadata: CodexProviderModelMetadata[] | undefined
    ): CodexProviderModelMetadata[] | undefined {
        if (!metadata?.length) {
            return metadata;
        }
        const unavailable = this.currentDirectHttpUnavailableModels(provider);
        if (!unavailable.size) {
            return metadata;
        }
        return metadata.map(model => {
            const unavailableModel = unavailable.get(model.id);
            if (!unavailableModel) {
                return model;
            }
            return {
                ...model,
                unavailable: true,
                unavailableReason: unavailableModel.reason,
                unavailableAt: unavailableModel.observedAt
            };
        });
    }

    protected currentDirectHttpUnavailableModels(provider: DirectHttpProviderConfig): Map<string, DirectHttpUnavailableModel> {
        const providerModels = this.directHttpUnavailableModels.get(provider.provider);
        if (!providerModels?.size) {
            return new Map();
        }
        const now = Date.now();
        for (const [modelId, state] of providerModels) {
            if (state.expiresAt <= now) {
                providerModels.delete(modelId);
            }
        }
        if (!providerModels.size) {
            this.directHttpUnavailableModels.delete(provider.provider);
            return new Map();
        }
        return providerModels;
    }

    protected toDirectHttpModelMetadata(provider: DirectHttpProviderConfig, value: unknown): CodexProviderModelMetadata | undefined {
        if (typeof value === 'string') {
            const id = this.withDirectProviderPrefix(provider, value);
            return {
                id,
                label: value,
                provider: provider.provider,
                cost: this.classifyDirectHttpModelCost(provider, id)
            };
        }
        if (typeof value !== 'object' || !value) {
            return undefined;
        }
        const idValue = this.readString(value, 'id') ||
            this.readString(value, 'name') ||
            this.readString(value, 'model') ||
            this.readString(value, 'slug');
        if (!idValue) {
            return undefined;
        }
        const id = this.withDirectProviderPrefix(provider, idValue);
        const pricing = this.extractDirectHttpModelPricing(value);
        const architecture = this.readObject(value, 'architecture');
        const topProvider = this.readObject(value, 'top_provider');
        const supportedParameters = this.readStringArray(value, 'supported_parameters');
        const inputModalities = this.readStringArray(architecture, 'input_modalities');
        const outputModalities = this.readStringArray(architecture, 'output_modalities');
        return {
            id,
            label: this.readString(value, 'name') || idValue,
            provider: provider.provider,
            cost: this.classifyDirectHttpModelCost(provider, id, pricing),
            pricing,
            contextLength: this.readNumeric(value, 'context_length') ?? this.readNumeric(topProvider, 'context_length'),
            inputModalities,
            outputModalities,
            supportedParameters,
            reasoning: this.modelSupportedParameterAvailable(supportedParameters, ['reasoning', 'include_reasoning']),
            toolCalling: this.modelSupportedParameterAvailable(supportedParameters, ['tools', 'tool_choice']),
            structuredOutput: this.modelSupportedParameterAvailable(supportedParameters, ['structured_output', 'response_format']),
            description: this.readString(value, 'description') || undefined,
            raw: value
        };
    }

    protected async enrichDirectHttpModelMetadata(provider: DirectHttpProviderConfig, metadata: CodexProviderModelMetadata[]): Promise<CodexProviderModelMetadata[]> {
        if (!metadata.length) {
            return metadata;
        }
        const providerMetadata = await this.readModelsDevProviderModelMetadata(provider.provider).catch(error => {
            this.logger.debug(`${provider.label} models.dev enrichment failed:`, error);
            return undefined;
        });
        if (!providerMetadata?.size) {
            return metadata;
        }
        return metadata.map(model => this.mergeDirectHttpModelMetadata(
            provider,
            model,
            providerMetadata.get(this.stripDirectProviderPrefix(provider, model.id))
        ));
    }

    protected async readModelsDevProviderModelMetadata(provider: string): Promise<Map<string, CodexProviderModelMetadata> | undefined> {
        const catalog = await this.readModelsDevCatalog();
        return catalog.get(provider);
    }

    protected async readModelsDevCatalog(): Promise<Map<string, Map<string, CodexProviderModelMetadata>>> {
        const now = Date.now();
        const cached = this.modelsDevCatalogCache;
        if (cached?.value && cached.expiresAt > now) {
            return cached.value;
        }
        if (cached?.promise) {
            return cached.promise;
        }
        const promise = this.fetchModelsDevCatalog().then(value => {
            this.modelsDevCatalogCache = {
                value,
                expiresAt: Date.now() + MODELS_DEV_CATALOG_TTL_MS
            };
            return value;
        }, error => {
            const previous = this.modelsDevCatalogCache?.value;
            this.modelsDevCatalogCache = undefined;
            if (previous?.size) {
                return previous;
            }
            throw error;
        });
        this.modelsDevCatalogCache = {
            promise,
            value: cached?.value,
            expiresAt: cached?.expiresAt ?? 0
        };
        return promise;
    }

    protected async fetchModelsDevCatalog(): Promise<Map<string, Map<string, CodexProviderModelMetadata>>> {
        const response = await fetch(MODELS_DEV_CATALOG_URL);
        if (!response.ok) {
            throw new Error(nls.localize(
                'theia/ai/ai-providers/modelsDevHttpError',
                'Models.dev catalog request failed with HTTP {0}.',
                response.status
            ));
        }
        const json = await response.json();
        const catalog = new Map<string, Map<string, CodexProviderModelMetadata>>();
        for (const provider of Object.values(DIRECT_HTTP_PROVIDER_CONFIGS)) {
            const providerObject = this.readObject(json, provider.provider);
            const modelsObject = this.readObject(providerObject, 'models');
            const providerModels = new Map<string, CodexProviderModelMetadata>();
            for (const [modelId, value] of Object.entries(modelsObject)) {
                const metadata = this.toModelsDevModelMetadata(provider, modelId, value);
                if (metadata) {
                    providerModels.set(modelId, metadata);
                }
            }
            if (providerModels.size) {
                catalog.set(provider.provider, providerModels);
            }
        }
        return catalog;
    }

    protected toModelsDevModelMetadata(provider: DirectHttpProviderConfig, modelId: string, value: unknown): CodexProviderModelMetadata | undefined {
        if (typeof value !== 'object' || !value) {
            return undefined;
        }
        const id = this.withDirectProviderPrefix(provider, modelId);
        const limit = this.readObject(value, 'limit');
        const modalities = this.readObject(value, 'modalities');
        const pricing = this.extractModelsDevModelPricing(value);
        return {
            id,
            label: this.readString(value, 'name') || modelId,
            provider: provider.provider,
            cost: this.classifyDirectHttpModelCost(provider, id, pricing),
            pricing,
            contextLength: this.readNumeric(limit, 'context'),
            inputModalities: this.readStringArray(modalities, 'input'),
            outputModalities: this.readStringArray(modalities, 'output'),
            attachment: this.readBoolean(value, 'attachment'),
            reasoning: this.readBoolean(value, 'reasoning'),
            toolCalling: this.readBoolean(value, 'tool_call') ?? this.readBoolean(value, 'toolCalling'),
            structuredOutput: this.readBoolean(value, 'structured_output') ?? this.readBoolean(value, 'structuredOutput'),
            temperature: this.readBoolean(value, 'temperature'),
            description: this.readString(value, 'description') || undefined,
            raw: value
        };
    }

    protected extractModelsDevModelPricing(value: unknown): CodexProviderModelPricing | undefined {
        const cost = this.readObject(value, 'cost');
        if (!Object.keys(cost).length) {
            return undefined;
        }
        return {
            prompt: this.readPriceString(cost, 'input'),
            completion: this.readPriceString(cost, 'output'),
            request: this.readPriceString(cost, 'request'),
            image: this.readPriceString(cost, 'image') ?? this.readPriceString(cost, 'output_image'),
            inputCacheRead: this.readPriceString(cost, 'input_cache_read'),
            inputCacheWrite: this.readPriceString(cost, 'input_cache_write'),
            cachedRead: this.readPriceString(cost, 'cache_read'),
            cachedWrite: this.readPriceString(cost, 'cache_write'),
            raw: cost
        };
    }

    protected mergeDirectHttpModelMetadata(
        provider: DirectHttpProviderConfig,
        primary: CodexProviderModelMetadata,
        enrichment: CodexProviderModelMetadata | undefined
    ): CodexProviderModelMetadata {
        if (!enrichment) {
            return primary;
        }
        const pricing = primary.pricing ?? enrichment.pricing;
        return {
            ...primary,
            label: primary.label ?? enrichment.label,
            cost: primary.pricing ? primary.cost : enrichment.cost ?? primary.cost,
            pricing,
            contextLength: primary.contextLength ?? enrichment.contextLength,
            inputModalities: this.mergeModelMetadataStringArrays(primary.inputModalities, enrichment.inputModalities),
            outputModalities: this.mergeModelMetadataStringArrays(primary.outputModalities, enrichment.outputModalities),
            supportedParameters: this.mergeModelMetadataStringArrays(primary.supportedParameters, enrichment.supportedParameters),
            attachment: primary.attachment ?? enrichment.attachment,
            reasoning: primary.reasoning ?? enrichment.reasoning,
            toolCalling: primary.toolCalling ?? enrichment.toolCalling,
            structuredOutput: primary.structuredOutput ?? enrichment.structuredOutput,
            temperature: primary.temperature ?? enrichment.temperature,
            description: primary.description ?? enrichment.description,
            raw: primary.raw && enrichment.raw
                ? { directHttp: primary.raw, modelsDev: enrichment.raw, provider: provider.provider }
                : primary.raw ?? enrichment.raw
        };
    }

    protected mergeModelMetadataStringArrays(left: string[] | undefined, right: string[] | undefined): string[] | undefined {
        const values = [...(left ?? []), ...(right ?? [])]
            .map(value => value.trim())
            .filter(Boolean);
        const unique = Array.from(new Set(values));
        return unique.length ? unique : undefined;
    }

    protected modelSupportedParameterAvailable(parameters: string[] | undefined, candidates: string[]): boolean | undefined {
        if (!parameters?.length) {
            return undefined;
        }
        const normalized = new Set(parameters.map(parameter => parameter.toLowerCase()));
        return candidates.some(candidate => normalized.has(candidate.toLowerCase()));
    }

    protected fallbackDirectHttpModelMetadata(provider: DirectHttpProviderConfig): CodexProviderModelMetadata {
        return {
            id: provider.defaultModel,
            provider: provider.provider,
            cost: this.classifyDirectHttpModelCost(provider, provider.defaultModel)
        };
    }

    protected extractDirectHttpModelPricing(value: unknown): CodexProviderModelPricing | undefined {
        const pricing = this.readObject(value, 'pricing');
        if (!Object.keys(pricing).length) {
            return undefined;
        }
        return {
            prompt: this.readPriceString(pricing, 'prompt'),
            completion: this.readPriceString(pricing, 'completion'),
            request: this.readPriceString(pricing, 'request'),
            image: this.readPriceString(pricing, 'image'),
            inputCacheRead: this.readPriceString(pricing, 'input_cache_read'),
            inputCacheWrite: this.readPriceString(pricing, 'input_cache_write'),
            cachedRead: this.readPriceString(pricing, 'cached_read'),
            cachedWrite: this.readPriceString(pricing, 'cached_write'),
            raw: pricing
        };
    }

    protected classifyDirectHttpModelCost(provider: DirectHttpProviderConfig, modelId: string, pricing?: CodexProviderModelPricing): CodexProviderModelCost {
        const normalized = this.stripDirectProviderPrefix(provider, modelId).toLowerCase();
        const hasFreeSlug = normalized.endsWith(':free') || /(^|[-_:/\s])free($|[-_:/\s])/.test(normalized);
        const isKnownZenLimitedFree = provider.provider === 'opencode' && OPENCODE_ZEN_LIMITED_FREE_MODEL_IDS.has(normalized);
        const priceValues = this.directHttpPriceValues(pricing);
        const allExplicitPricesAreZero = priceValues.length > 0 && priceValues.every(value => value === 0);
        const hasPositivePrice = priceValues.some(value => value > 0);
        if (provider.provider === 'opencode-go') {
            return hasFreeSlug || allExplicitPricesAreZero ? 'free-limited' : 'included';
        }
        if (hasFreeSlug || isKnownZenLimitedFree || allExplicitPricesAreZero) {
            return provider.provider === 'opencode' ? 'free-limited' : 'free';
        }
        if (hasPositivePrice) {
            return 'paid';
        }
        return provider.provider === 'opencode' ? 'paid' : 'unknown';
    }

    protected directHttpPriceValues(pricing: CodexProviderModelPricing | undefined): number[] {
        if (!pricing) {
            return [];
        }
        return [
            pricing.prompt,
            pricing.completion,
            pricing.request,
            pricing.image,
            pricing.inputCacheRead,
            pricing.inputCacheWrite,
            pricing.cachedRead,
            pricing.cachedWrite
        ].map(value => this.priceStringToNumber(value)).filter((value): value is number => value !== undefined);
    }

    protected priceStringToNumber(value: string | undefined): number | undefined {
        if (value === undefined || value === '') {
            return undefined;
        }
        const normalized = value.trim().toLowerCase();
        if (!normalized || normalized === '-' || normalized === 'n/a' || normalized === 'na') {
            return undefined;
        }
        if (normalized === 'free') {
            return 0;
        }
        const parsed = Number(normalized.replace(/[$,\s]/g, ''));
        if (!Number.isFinite(parsed) || parsed < 0) {
            return undefined;
        }
        return parsed;
    }

    protected modelIdsFromMetadata(metadata: readonly CodexProviderModelMetadata[] | undefined): string[] | undefined {
        const ids = metadata?.map(model => model.id).filter(Boolean) ?? [];
        return ids.length > 0 ? Array.from(new Set(ids)) : undefined;
    }

    protected uniqueModelMetadata(metadata: readonly CodexProviderModelMetadata[]): CodexProviderModelMetadata[] {
        const seen = new Set<string>();
        const result: CodexProviderModelMetadata[] = [];
        for (const model of metadata) {
            if (!model.id || seen.has(model.id)) {
                continue;
            }
            seen.add(model.id);
            result.push(model);
        }
        return result;
    }

    protected async detectProviders(request: CodexProviderStatusRequest): Promise<CodexProviderDetectedProvider[]> {
        const versionPromises = new Map<string, Promise<{ available: boolean, version?: string, message?: string }>>();
        const openCodeProvidersListPromises = new Map<string, Promise<{ output: string, message?: string }>>();
        const detectExecutable = (runtime: CodexProviderRuntime, executablePath: string): Promise<{ available: boolean, version?: string, message?: string }> => {
            const key = `${runtime}:${executablePath}`;
            const existing = versionPromises.get(key);
            if (existing) {
                return existing;
            }
            const promise = this.readExecutableVersion(executablePath, request.cwd)
                .then(version => ({ available: true, version }))
                .catch(error => ({
                    available: false,
                    message: error instanceof Error ? error.message : String(error)
                }));
            versionPromises.set(key, promise);
            return promise;
        };
        const readOpenCodeProvidersList = (executablePath: string): Promise<{ output: string, message?: string }> => {
            const existing = openCodeProvidersListPromises.get(executablePath);
            if (existing) {
                return existing;
            }
            const promise = this.runCommandOutput(executablePath, ['providers', 'list'], request.cwd, 8000)
                .then(output => ({ output }))
                .catch(error => ({
                    output: '',
                    message: error instanceof Error ? error.message : String(error)
                }));
            openCodeProvidersListPromises.set(executablePath, promise);
            return promise;
        };

        return Promise.all(PROVIDER_DETECTION_PRESETS.map(async preset => {
            if (preset.runtime === 'direct-http') {
                const provider = DIRECT_HTTP_PROVIDER_CONFIGS[preset.modelProvider];
                const apiKey = provider ? this.resolveDirectHttpApiKey(provider, request) : undefined;
                const credentialError = apiKey && provider ? this.currentDirectHttpCredentialError(provider, apiKey) : undefined;
                const available = !!apiKey && !credentialError;
                const modelMetadata = apiKey && provider
                    ? await this.readDirectHttpModelCatalog(provider).catch(error => {
                        this.logger.debug(`${provider.label} detected model list failed:`, error);
                        return [this.fallbackDirectHttpModelMetadata(provider)];
                    })
                    : provider ? [this.fallbackDirectHttpModelMetadata(provider)] : undefined;
                const models = this.modelIdsFromMetadata(modelMetadata);
                return {
                    ...preset,
                    executablePath: provider?.baseUrl ?? preset.modelProvider,
                    available,
                    cliAvailable: true,
                    configured: available,
                    models,
                    modelMetadata,
                    message: credentialError?.reason ?? (apiKey ? undefined : nls.localize(
                        'theia/ai/ai-providers/directProviderNeedsApiKey',
                        'Set {0} or paste the API key in CyberVinci.',
                        provider?.apiKeyEnvVar ?? 'API_KEY'
                    ))
                };
            }
            const executablePath = this.resolveDetectionExecutable(preset, request);
            const detection = await detectExecutable(preset.runtime, executablePath);
            if (preset.runtime === 'opencode-cli') {
                if (!detection.available) {
                    return {
                        ...preset,
                        executablePath,
                        available: false,
                        cliAvailable: false,
                        configured: false,
                        message: detection.message
                    };
                }
                const providersList = await readOpenCodeProvidersList(executablePath);
                const auth = this.extractOpenCodeAuthStatus(preset.modelProvider, providersList.output);
                const configured = auth.authenticated === true;
                return {
                    ...preset,
                    executablePath,
                    available: configured,
                    cliAvailable: true,
                    configured,
                    version: detection.version,
                    message: configured
                        ? undefined
                        : providersList.message || nls.localize(
                            'theia/ai/ai-providers/openCodeProviderNotConfigured',
                            'OpenCode is installed, but {0} credentials were not found in OpenCode.',
                            preset.label
                        )
                };
            }
            return {
                ...preset,
                executablePath,
                available: detection.available,
                cliAvailable: detection.available,
                configured: detection.available,
                version: detection.version,
                message: detection.message
            };
        }));
    }

    protected resolveDetectionExecutable(preset: ProviderDetectionPreset, request: CodexProviderStatusRequest): string {
        if (preset.runtime === 'codex-app-server') {
            return this.resolveExecutable(request.executablePath);
        }
        if (preset.runtime === 'direct-http') {
            return DIRECT_HTTP_PROVIDER_CONFIGS[preset.modelProvider]?.baseUrl ?? preset.modelProvider;
        }
        const adapter = CLI_RUNTIME_ADAPTERS[preset.runtime];
        return this.resolveCliExecutable(adapter, request);
    }

    protected async getCliStatus(adapter: CliRuntimeAdapter, request: CodexProviderStatusRequest): Promise<CodexProviderBackendStatus> {
        if (adapter.runtime === 'opencode-cli') {
            return this.getOpenCodeStatus(request);
        }
        const executable = this.resolveCliExecutable(adapter, request);
        const provider = this.resolveAdapterProvider(adapter, request.modelProvider);
        try {
            const [version, models] = await Promise.all([
                this.readExecutableVersion(executable, request.cwd),
                this.readCliModels(adapter, executable, request.cwd).catch(error => {
                    this.logger.debug(`${adapter.label} model list failed:`, error);
                    return adapter.defaultModels;
                })
            ]);
            return {
                runtime: adapter.runtime,
                modelProvider: provider,
                available: true,
                executablePath: executable,
                version,
                appServer: false,
                authenticated: undefined,
                authStatus: undefined,
                models,
                capabilities: {
                    mcp: true,
                    shellExecution: true,
                    raw: {
                        provider,
                        runtime: adapter.runtime
                    }
                }
            };
        } catch (error) {
            return {
                runtime: adapter.runtime,
                modelProvider: provider,
                available: false,
                executablePath: executable,
                appServer: false,
                message: error instanceof Error ? error.message : String(error)
            };
        }
    }

    protected async readCliModels(adapter: CliRuntimeAdapter, executable: string, cwd?: string): Promise<string[] | undefined> {
        if (adapter.runtime === 'cursor-cli') {
            const output = await this.runCommandOutput(executable, ['models'], cwd, 8000);
            const models = this.stripAnsi(output)
                .split(/\r?\n/)
                .map(line => line.trim())
                .filter(line => !!line && !line.toLowerCase().includes('loading') && !line.toLowerCase().includes('no models available'));
            return models.length > 0 ? Array.from(new Set(models)) : adapter.defaultModels;
        }
        return adapter.defaultModels;
    }

    protected async getOpenCodeStatus(request: CodexProviderStatusRequest): Promise<CodexProviderBackendStatus> {
        const executable = this.resolveOpenCodeExecutable(request.openCodeExecutablePath);
        const provider = this.resolveOpenCodeProvider(request);
        try {
            const [version, providersOutput, models] = await Promise.all([
                this.readExecutableVersion(executable, request.cwd),
                this.runCommandOutput(executable, ['providers', 'list'], request.cwd, OPENCODE_STATUS_REQUEST_TIMEOUT).catch(error => {
                    this.logger.debug('OpenCode providers list failed:', error);
                    return '';
                }),
                this.readOpenCodeModels(executable, provider, request.cwd).catch(error => {
                    this.logger.debug('OpenCode model list failed:', error);
                    return undefined;
                })
            ]);
            const auth = this.extractOpenCodeAuthStatus(provider, providersOutput);
            return {
                runtime: 'opencode-cli',
                modelProvider: provider,
                available: true,
                executablePath: executable,
                version,
                appServer: false,
                ...auth,
                models,
                capabilities: {
                    mcp: true,
                    shellExecution: true,
                    raw: {
                        provider,
                        runtime: 'opencode-cli'
                    }
                }
            };
        } catch (error) {
            return {
                runtime: 'opencode-cli',
                modelProvider: provider,
                available: false,
                executablePath: executable,
                appServer: false,
                message: error instanceof Error ? error.message : String(error)
            };
        }
    }

    protected async readOpenCodeModels(executable: string, provider: string, cwd?: string): Promise<string[] | undefined> {
        const output = await this.runCommandOutput(executable, ['models', provider], cwd, OPENCODE_STATUS_REQUEST_TIMEOUT);
        const models = this.stripAnsi(output)
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(line => line.includes('/') && !line.includes(' '));
        return models.length > 0 ? Array.from(new Set(models)) : undefined;
    }

    protected extractOpenCodeAuthStatus(provider: string, output: string): Partial<CodexProviderBackendStatus> {
        if (!output.trim()) {
            return {
                authenticated: undefined,
                authStatus: undefined
            };
        }
        const normalized = output.toLowerCase();
        const labels = OPENCODE_PROVIDER_LABELS[provider] ?? [provider, provider.replace(/-/g, ' ')];
        const authenticated = labels.some(label => normalized.includes(label.toLowerCase()));
        return {
            authenticated,
            authStatus: authenticated ? 'authenticated' : 'not authenticated',
            accountLabel: labels[0]
        };
    }

    protected async runCommandOutput(executable: string, args: string[], cwd: string | undefined, timeoutMs: number): Promise<string> {
        const spawnInfo = this.buildSpawnInfo(executable, args);
        const resolvedEnvironment = await this.resolveSpawnEnvironment({ executablePath: executable, cwd });
        return this.runRawCommandOutput(spawnInfo.command, spawnInfo.args, cwd, timeoutMs, resolvedEnvironment.env, spawnInfo.shell, executable);
    }

    protected runRawCommandOutput(
        command: string,
        args: string[],
        cwd: string | undefined,
        timeoutMs: number,
        env: NodeJS.ProcessEnv,
        shell = false,
        displayCommand = command
    ): Promise<string> {
        return new Promise((resolve, reject) => {
            const childProcess = spawn(command, args, {
                cwd: cwd || process.cwd(),
                env,
                shell,
                windowsHide: true
            });
            let stdout = '';
            let stderr = '';
            const timeout = setTimeout(() => {
                childProcess.kill();
                reject(new Error(nls.localize('theia/ai/ai-providers/commandTimedOut', 'Timed out while running {0}.', displayCommand)));
            }, timeoutMs);
            childProcess.stdout.setEncoding('utf8');
            childProcess.stdout.on('data', chunk => stdout = this.truncateCommandOutput(stdout + String(chunk)));
            childProcess.stderr.setEncoding('utf8');
            childProcess.stderr.on('data', chunk => stderr = this.truncateCommandOutput(stderr + String(chunk)));
            childProcess.on('error', error => {
                clearTimeout(timeout);
                reject(error);
            });
            childProcess.on('exit', code => {
                clearTimeout(timeout);
                const output = `${stdout}\n${stderr}`.trim();
                if (code === 0) {
                    resolve(output);
                } else {
                    reject(new Error(output || nls.localize(
                        'theia/ai/ai-providers/commandExitedWithCode',
                        '{0} exited with code {1}.',
                        displayCommand,
                        code ?? nls.localize('theia/ai/ai-providers/unknownCode', 'unknown')
                    )));
                }
            });
        });
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
            this.logger.debug(`Optional CyberVinci AI Providers status request failed: ${method}`, error);
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
                    reject(new Error(nls.localize('theia/ai/ai-providers/appServerRequestTimedOut', 'CyberVinci AI Providers app-server request timed out: {0}', method)));
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
            throw new Error(nls.localize('theia/ai/ai-providers/appServerNotRunning', 'CyberVinci AI Providers app-server is not running.'));
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
                this.logger.debug('CyberVinci AI Providers stderr:', line);
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
            this.logger.debug('Ignoring non-JSON CyberVinci AI Providers output:', line, error);
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
            title: nls.localize('theia/ai/ai-providers/inputTitle', 'CyberVinci AI Providers input'),
            questions: this.buildUserInputQuestions(message.params)
        });
    }

    protected handleNotification(message: JsonRpcMessage): void {
        if (message.method) {
            this.emitAppServerNotification({ method: message.method, params: message.params });
        }

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

    protected emitAppServerNotification(notification: CodexProviderAppServerNotification): void {
        for (const listener of this.appServerNotificationListeners) {
            try {
                listener(notification);
            } catch (error) {
                this.logger.debug('CyberVinci AI Providers app-server notification listener failed:', error);
            }
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
                ? nls.localize('theia/ai/ai-providers/permissionsApprovalQuestion', 'CyberVinci AI Providers is requesting additional permissions. Allow it?')
                : isFileChange
                ? nls.localize('theia/ai/ai-providers/fileApprovalQuestion', 'CyberVinci AI Providers wants to apply file changes. Allow it?')
                : nls.localize('theia/ai/ai-providers/commandApprovalQuestion', 'CyberVinci AI Providers wants approval to continue. Allow it?'),
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
                { text: nls.localize('theia/ai/ai-providers/allowTurn', 'Allow for this turn'), value: 'accept' },
                { text: nls.localize('theia/ai/ai-providers/allowSession', 'Allow for this session'), value: 'acceptForSession' },
                { text: nls.localizeByDefault('Deny'), value: 'cancel' }
            ];
        }
        return [
            { text: nls.localizeByDefault('Allow'), value: 'accept' },
            { text: nls.localize('theia/ai/ai-providers/allowSession', 'Allow for this session'), value: 'acceptForSession' },
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

    protected isAbortError(error: unknown): boolean {
        return error instanceof Error && error.name === 'AbortError';
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
                    id: 'ai-providers-observed-file-change',
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
            // Missing or invalid session cache is non-fatal; CyberVinci AI Providers can start a new thread.
        }
    }

    protected async saveSessionThreads(): Promise<void> {
        const sessionPath = this.sessionThreadsPath();
        await fs.promises.mkdir(path.dirname(sessionPath), { recursive: true });
        await fs.promises.writeFile(sessionPath, JSON.stringify(Object.fromEntries(this.sessionThreads), undefined, 2));
    }

    protected sessionThreadsPath(): string {
        return path.join(os.homedir(), '.theia', 'ai-providers-sessions.json');
    }

    protected handleProcessExit(exitedProcess: ChildProcessWithoutNullStreams, code: number | null, signal: NodeJS.Signals | null): void {
        if (exitedProcess !== this.process) {
            return;
        }
        this.process = undefined;
        const detail = this.stderrTail.length > 0 ? `\n\n${this.stderrTail.join('\n')}` : '';
        const signalDetail = signal ? nls.localize('theia/ai/ai-providers/appServerExitSignal', ' and signal {0}', signal) : '';
        this.failAll(new Error(nls.localize(
            'theia/ai/ai-providers/appServerExited',
            'CyberVinci AI Providers app-server exited with code {0}{1}.{2}',
            code ?? nls.localize('theia/ai/ai-providers/unknownCode', 'unknown'),
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
            if (stream.runtime === 'direct-http' || this.resolveCliAdapter(stream.runtime)) {
                continue;
            }
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

    protected resolveOpenCodeExecutable(executablePath?: string): string {
        return this.resolveConfiguredCliExecutable(CLI_RUNTIME_ADAPTERS['opencode-cli'], executablePath);
    }

    protected resolveRuntime(runtime: CodexProviderRuntime | undefined): CodexProviderRuntime {
        if (runtime === 'direct-http') {
            return runtime;
        }
        if (runtime && runtime in CLI_RUNTIME_ADAPTERS) {
            return runtime;
        }
        return 'codex-app-server';
    }

    protected resolveCliAdapter(runtime: CodexProviderRuntime | undefined): CliRuntimeAdapter | undefined {
        const resolved = this.resolveRuntime(runtime);
        return resolved === 'codex-app-server' || resolved === 'direct-http' ? undefined : CLI_RUNTIME_ADAPTERS[resolved];
    }

    protected resolveCliExecutable(adapter: CliRuntimeAdapter, request: CodexProviderBackendRequest | CodexProviderStatusRequest | CodexProviderLoginRequest): string {
        if (adapter.runtime === 'opencode-cli') {
            return this.resolveConfiguredCliExecutable(adapter, request.openCodeExecutablePath);
        }
        if (adapter.runtime === 'gemini-cli') {
            return this.resolveConfiguredCliExecutable(adapter, request.geminiExecutablePath);
        }
        if (adapter.runtime === 'claude-code-cli') {
            return this.resolveConfiguredCliExecutable(adapter, request.claudeExecutablePath);
        }
        return this.resolveConfiguredCliExecutable(adapter, request.cursorExecutablePath);
    }

    protected resolveConfiguredCliExecutable(adapter: CliRuntimeAdapter, executablePath?: string): string {
        const configured = executablePath?.trim() || process.env[adapter.executableEnvVar]?.trim();
        return configured || adapter.defaultExecutable;
    }

    protected resolveAdapterProvider(adapter: CliRuntimeAdapter, modelProvider: string | undefined): string {
        if (adapter.runtime === 'opencode-cli') {
            const provider = modelProvider?.trim();
            return provider && provider !== 'codex' ? provider : adapter.provider;
        }
        return adapter.provider;
    }

    protected isDirectHttpRuntime(runtime: CodexProviderRuntime | undefined): boolean {
        return this.resolveRuntime(runtime) === 'direct-http';
    }

    protected resolveDirectHttpProviderConfig(request: Pick<CodexProviderStatusRequest, 'runtime' | 'modelProvider' | 'model'> & { options?: Partial<CodexProviderOptions> }): DirectHttpProviderConfig | undefined {
        if (!this.isDirectHttpRuntime(request.runtime)) {
            return undefined;
        }
        const provider = this.resolveDirectHttpProvider(request);
        return DIRECT_HTTP_PROVIDER_CONFIGS[provider];
    }

    protected resolveDirectHttpProvider(request: Pick<CodexProviderStatusRequest, 'modelProvider' | 'model'> & { options?: Partial<CodexProviderOptions> }): string {
        const providerFromPreference = request.modelProvider?.trim();
        if (providerFromPreference && DIRECT_HTTP_PROVIDER_CONFIGS[providerFromPreference]) {
            return providerFromPreference;
        }
        const model = ('model' in request ? request.model : undefined) || ('options' in request ? request.options?.model : undefined);
        const providerFromModel = this.openCodeProviderFromModel(model);
        if (providerFromModel && DIRECT_HTTP_PROVIDER_CONFIGS[providerFromModel]) {
            return providerFromModel;
        }
        return 'openrouter';
    }

    protected resolveDirectHttpApiKey(provider: DirectHttpProviderConfig, request: CodexProviderBackendRequest | CodexProviderStatusRequest | CodexProviderLoginRequest): string | undefined {
        const configured = request[provider.apiKeyRequestField]?.trim();
        if (configured) {
            return configured;
        }
        return process.env[provider.apiKeyEnvVar]?.trim() || undefined;
    }

    protected resolveDirectHttpModel(provider: DirectHttpProviderConfig, request: CodexProviderBackendRequest | CodexProviderStatusRequest): string {
        const model = (('model' in request ? request.model : undefined) || ('options' in request ? request.options?.model : undefined) || provider.defaultModel).trim();
        return this.stripDirectProviderPrefix(provider, model);
    }

    protected stripDirectProviderPrefix(provider: DirectHttpProviderConfig, model: string): string {
        const prefix = `${provider.modelPrefix}/`;
        return model.startsWith(prefix) ? model.slice(prefix.length) : model;
    }

    protected withDirectProviderPrefix(provider: DirectHttpProviderConfig, model: string): string {
        return model.startsWith(`${provider.modelPrefix}/`) ? model : `${provider.modelPrefix}/${model}`;
    }

    protected resolveDirectHttpProtocol(provider: DirectHttpProviderConfig, model: string): DirectHttpProtocol {
        if (provider.provider === 'openrouter') {
            return 'openai-chat';
        }
        const normalized = this.stripDirectProviderPrefix(provider, model);
        if (provider.provider === 'opencode-go') {
            return OPENCODE_GO_ANTHROPIC_MODELS.has(normalized) ? 'anthropic-messages' : 'openai-chat';
        }
        if (normalized.startsWith('gpt-')) {
            return 'openai-responses';
        }
        if (normalized.startsWith('claude-') ||
            normalized.startsWith('qwen3.7-') ||
            normalized.startsWith('qwen3.6-') ||
            normalized.startsWith('qwen3.5-')) {
            return 'anthropic-messages';
        }
        if (normalized.startsWith('gemini-')) {
            return 'google-generate';
        }
        return 'openai-chat';
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
                args: ['/d', '/s', '/c', `chcp 65001>nul & ${commandLine}`],
                shell: false
            };
        }
        return {
            command: executable,
            args,
            shell: false
        };
    }

    protected async readExecutableVersion(executable: string, cwd?: string): Promise<string | undefined> {
        const spawnInfo = this.buildSpawnInfo(executable, ['--version']);
        const resolvedEnvironment = await this.resolveSpawnEnvironment({ executablePath: executable, cwd });
        return new Promise((resolve, reject) => {
            const childProcess = spawn(spawnInfo.command, spawnInfo.args, {
                cwd: cwd || process.cwd(),
                env: resolvedEnvironment.env,
                shell: spawnInfo.shell,
                windowsHide: true
            });
            let stdout = '';
            let stderr = '';
            const timeout = setTimeout(() => {
                childProcess.kill();
                reject(new Error(nls.localize('theia/ai/ai-providers/checkTimedOut', 'Timed out while checking CyberVinci AI Providers.')));
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
                        'theia/ai/ai-providers/exitedWithCode',
                        'CyberVinci AI Providers exited with code {0}.',
                        code ?? nls.localize('theia/ai/ai-providers/unknownCode', 'unknown')
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

    protected stripAnsi(value: string): string {
        return value.replace(/\u001b\[[0-9;?]*[ -/]*[@-~]/g, '');
    }

    protected truncateCommandOutput(value: string): string {
        return value.length <= OPENCODE_COMMAND_MAX_OUTPUT ? value : value.slice(-OPENCODE_COMMAND_MAX_OUTPUT);
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

    protected readPriceString(source: unknown, key: string): string | undefined {
        if (typeof source === 'object' && source && key in source) {
            const value = (source as Record<string, unknown>)[key];
            if (typeof value === 'string') {
                return value;
            }
            if (typeof value === 'number' && Number.isFinite(value)) {
                return String(value);
            }
        }
        return undefined;
    }

    protected readNumeric(source: unknown, key: string): number | undefined {
        if (typeof source === 'object' && source && key in source) {
            const value = (source as Record<string, unknown>)[key];
            if (typeof value === 'number' && Number.isFinite(value)) {
                return value;
            }
            if (typeof value === 'string') {
                const parsed = Number(value);
                return Number.isFinite(parsed) ? parsed : undefined;
            }
        }
        return undefined;
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

    protected readStringArray(source: unknown, key: string): string[] | undefined {
        const values = this.readArray(source, key).map(value => typeof value === 'string' ? value : undefined).filter((value): value is string => !!value);
        return values.length ? values : undefined;
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

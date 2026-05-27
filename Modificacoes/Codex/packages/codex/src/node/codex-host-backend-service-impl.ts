// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import { PreferenceService } from '@theia/core/lib/common/preferences';
import { CodexProviderService } from '@cybervinci/codex-provider/lib/common/codex-provider-service';
import {
    CHATGPT_CONFIGURATION_KEYS,
    CodexExtensionPreferences
} from '../common/codex-preferences';
import {
    CodexFetchRequest,
    CodexFetchResponse,
    CODEX_VSCODE_RPC_PREFIX,
    parseCodexRpcParams
} from '../common/codex-host-protocol';
import {
    CodexHostBackendClient,
    CodexHostBackendService
} from '../common/codex-host-backend-service';
import { CodexFetchProxyService } from './codex-fetch-proxy-service';
import { CodexGitBridgeService } from './codex-git-bridge-service';
import { CodexGitWorkerService } from './codex-git-worker-service';
import { CodexGitWorktreeService } from './codex-git-worktree-service';
import { CodexRemoteHostService } from './codex-remote-host-service';
import { CodexSkillsService } from './codex-skills-service';
import {
    CodexFileBridgeService,
    CodexGlobalStateService,
    CodexSharedObjectService,
    CodexWslPathService
} from './codex-support-services';
import { CodexWorkerRequest, CodexWorkerResponseBody, codexWorkerError } from '../common/codex-worker-protocol';

@injectable()
export class CodexHostBackendServiceImpl implements CodexHostBackendService {

    @inject(PreferenceService)
    protected readonly preferences: PreferenceService;

    @inject(CodexGlobalStateService)
    protected readonly globalState: CodexGlobalStateService;

    @inject(CodexSharedObjectService)
    protected readonly sharedObjects: CodexSharedObjectService;

    @inject(CodexFetchProxyService)
    protected readonly fetchProxy: CodexFetchProxyService;

    @inject(CodexFileBridgeService)
    protected readonly fileBridge: CodexFileBridgeService;

    @inject(CodexWslPathService)
    protected readonly wslPaths: CodexWslPathService;

    @inject(CodexRemoteHostService)
    protected readonly remoteHosts: CodexRemoteHostService;

    @inject(CodexGitWorktreeService)
    protected readonly worktrees: CodexGitWorktreeService;

    @inject(CodexGitBridgeService)
    protected readonly gitBridge: CodexGitBridgeService;

    @inject(CodexGitWorkerService)
    protected readonly gitWorker: CodexGitWorkerService;

    @inject(CodexSkillsService)
    protected readonly skills: CodexSkillsService;

    @inject(CodexProviderService)
    protected readonly codexProvider: CodexProviderService;

    protected client: CodexHostBackendClient | undefined;

    @postConstruct()
    protected initDefaults(): void {
        if (this.sharedObjects.get('host_config') === undefined) {
            this.sharedObjects.set('host_config', {
                id: 'local',
                display_name: 'Local',
                kind: 'local'
            });
        }
    }

    setClient(client: CodexHostBackendClient | undefined): void {
        this.client = client;
    }

    async invokeRpc(webviewId: string, method: string, params: unknown): Promise<unknown> {
        switch (method) {
            case 'ping':
                return { ok: true, webviewId };
            case 'get-configuration': {
                const key = this.extractParamKey(params);
                if (key) {
                    return this.preferences.get(key);
                }
                const config: Record<string, unknown> = {};
                for (const configKey of CHATGPT_CONFIGURATION_KEYS) {
                    config[configKey] = this.preferences.get(configKey);
                }
                return config;
            }
            case 'set-configuration': {
                const entries = this.extractConfigEntries(params);
                for (const [key, value] of Object.entries(entries)) {
                    await this.preferences.set(key, value);
                }
                return { ok: true };
            }
            case 'get-global-state': {
                const key = this.extractParamKey(params);
                return key ? this.globalState.get(key) : this.globalState.getSnapshot();
            }
            case 'set-global-state': {
                const { key, value } = this.extractKeyValue(params);
                if (key) {
                    this.globalState.set(key, value);
                }
                return { ok: true };
            }
            case 'read-file': {
                const uri = this.extractUri(params);
                if (!uri) {
                    throw new Error('Missing uri for read-file');
                }
                return this.fileBridge.readText(uri);
            }
            case 'read-file-binary': {
                const uri = this.extractUri(params);
                if (!uri) {
                    throw new Error('Missing uri for read-file-binary');
                }
                const bytes = await this.fileBridge.readBinary(uri);
                return { data: Buffer.from(bytes).toString('base64') };
            }
            case 'read-file-metadata': {
                const uri = this.extractUri(params);
                if (!uri) {
                    throw new Error('Missing uri for read-file-metadata');
                }
                return this.fileBridge.readMetadata(uri);
            }
            case 'paths-exist': {
                const record = parseCodexRpcParams(params);
                const paths = Array.isArray(record.paths)
                    ? record.paths.filter((entry): entry is string => typeof entry === 'string')
                    : [];
                const existingPaths = await this.fileBridge.pathsExist(paths);
                return { existingPaths };
            }
            case 'git-origins':
                return this.gitBridge.gitOrigins(params);
            case 'git-merge-base':
                return this.gitBridge.gitMergeBase(params);
            case 'git-create-branch':
                return this.gitBridge.gitCreateBranch(params);
            case 'git-push':
                return this.gitBridge.gitPush(params);
            case 'refresh-remote-connections':
                return this.remoteHosts.refreshConnections();
            case 'discover-remote-ssh-connections':
                return this.remoteHosts.discoverSshConnections(params);
            case 'refresh-remote-control-connections':
                return this.remoteHosts.refreshRemoteControlConnections();
            case 'set-remote-control-connections-enabled':
                return this.remoteHosts.setRemoteControlConnectionsEnabled(params);
            case 'add-remote-connection':
                return this.remoteHosts.addConnection(params);
            case 'codex-worktrees': {
                const record = parseCodexRpcParams(params);
                const cwd = typeof record.cwd === 'string' ? record.cwd : process.cwd();
                return this.worktrees.codexWorktrees(cwd);
            }
            case 'list-worktrees': {
                const record = parseCodexRpcParams(params);
                const cwd = typeof record.cwd === 'string' ? record.cwd : process.cwd();
                return { worktrees: await this.worktrees.listWorktrees(cwd) };
            }
            case 'resolve-worktree-for-thread':
                return { worktree: null };
            case 'open-in-targets':
                return { preferredTarget: null, availableTargets: [], targets: [] };
            case 'set-preferred-app':
                return { success: false };
            case 'terminal-shell-options':
                return { availableShells: [] };
            case 'thread-terminal-snapshot':
                return { session: null };
            case 'local-environments':
                return { environments: [] };
            case 'local-environment':
                return { environment: null };
            case 'local-environment-config':
                return { config: null };
            case 'local-environment-config-save':
                return { success: false };
            case 'worktree-shell-environment-config':
                return { shellEnvironment: null };
            case 'mcp-codex-config':
                return { config: null };
            case 'ipc-request':
                return this.handleIpcRequest(params);
            case 'set-vs-context':
                return { ok: true };
            case 'apply-patch':
                return { success: false };
            case 'prepare-worktree-snapshot':
            case 'upload-worktree-snapshot':
                return { success: false };
            case 'gh-pr-create':
            case 'gh-pr-merge':
            case 'gh-pr-update':
            case 'gh-pr-comment':
                return { success: false };
            case 'queued-follow-up-send-lock-acquire':
            case 'queued-follow-up-send-lock-release':
                return { acquired: false, released: false };
            case 'confirm-trace-recording-start':
            case 'cancel-trace-recording-start':
                return { success: false };
            case 'submit-trace-recording-details':
                return { success: false };
            case 'account-info':
                return this.codexProvider.getStatus({ executablePath: this.getCliExecutable() });
            case 'is-copilot-api-available':
                return { available: true };
            case 'recommended-skills':
                return this.skills.recommendedSkills(params);
            case 'install-recommended-skill':
                return this.skills.installRecommendedSkill(params);
            case 'read-plugin-skill':
                return this.skills.readPluginSkill(params);
            case 'developer-instructions':
                return { instructions: '' };
            case 'read-config-for-host':
                return this.buildReadConfigForHostResponse(params);
            case 'get-config-requirements-for-host':
                return { requirements: null };
            case 'write-config-value':
            case 'batch-write-config-value':
                return { ok: true };
            case 'list-mcp-server-status':
                return { servers: [], cursor: null };
            case 'read-mcp-resource':
                return { contents: [] };
            case 'set-thread-title':
                return { ok: true };
            case 'fork-conversation-from-latest':
            case 'fork-conversation-from-turn':
                return `thread-${Date.now()}`;
            case 'start-conversation':
                return this.startConversation(params);
            case 'thread-follower-start-turn':
            case 'thread-follower-steer-turn':
            case 'thread-follower-interrupt-turn':
            case 'thread-follower-compact-thread':
            case 'thread-follower-set-thread':
                return this.handleThreadFollower(method, params);
            case 'codex-home':
                return { path: process.env.CODEX_HOME ?? process.env.HOME ?? process.cwd() };
            case 'home-directory':
                return { path: process.env.HOME ?? process.cwd() };
            case 'workspace-root-options':
                return { roots: [process.cwd()] };
            case 'list-hooks-for-host':
                return { hooks: [] };
            default:
                throw new Error(`Unknown Codex RPC method: ${method}`);
        }
    }

    protected async handleIpcRequest(params: unknown): Promise<unknown> {
        const record = parseCodexRpcParams(params);
        const method = typeof record.method === 'string' ? record.method : undefined;
        const requestId = typeof record.requestId === 'string' ? record.requestId : '';
        if (!method) {
            return {
                requestId,
                type: 'response',
                resultType: 'error',
                error: 'Missing method for ipc-request'
            };
        }
        try {
            const result = await this.tryInvokeCliIpc(method, record.params);
            return {
                requestId,
                type: 'response',
                resultType: 'success',
                result
            };
        } catch (cliError) {
            const cliMessage = cliError instanceof Error ? cliError.message : String(cliError);
            console.info(`[Codex] ipc-request fallback (${method}): ${cliMessage}`);
            try {
                const result = this.handleLocalIpcRequest(method, record.params);
                return {
                    requestId,
                    type: 'response',
                    resultType: 'success',
                    result
                };
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                return {
                    requestId,
                    type: 'response',
                    resultType: 'error',
                    error: message
                };
            }
        }
    }

    protected async tryInvokeCliIpc(method: string, params: unknown): Promise<unknown> {
        const executablePath = this.getCliExecutable();
        if (!executablePath) {
            throw new Error('Codex Provider is not configured (chatgpt.cliExecutable)');
        }
        return this.codexProvider.invokeAppServerRequest({
            method,
            params,
            executablePath,
            timeoutMs: 10_000
        });
    }

    protected handleLocalIpcRequest(method: string, params: unknown): unknown {
        console.info(`[Codex] ipc-request: ${method}`);
        switch (method) {
            case 'initialize':
                return {
                    protocolVersion: '1.0',
                    serverCapabilities: {},
                    userCapabilities: {}
                };
            case 'account/read':
                return { type: 'logged-out' };
            case 'account/info':
            case 'account/status':
                return { type: 'logged-out' };
            case 'model/list':
                return { models: [] };
            case 'modelProvider/capabilities/read':
                return { capabilities: {} };
            case 'configRequirements/read':
                return { requirements: null };
            case 'config/read':
            case 'config/effective':
            case 'config/layered/read':
                return this.buildReadConfigForHostResponse(params);
            case 'conversation/list':
            case 'thread/list':
                return { conversations: [], threads: [] };
            case 'notification/list':
                return { notifications: [] };
            case 'host/read':
            case 'host/list':
                return {
                    hosts: [{
                        id: 'local',
                        displayName: 'Local',
                        kind: 'local'
                    }]
                };
            case 'sharedObject/read':
            case 'sharedObject/snapshot':
                return { value: this.sharedObjects.get('host_config') };
            default:
                return { ok: true, unsupported: true, method };
        }
    }

    protected buildReadConfigForHostResponse(params: unknown): unknown {
        const record = parseCodexRpcParams(params);
        const includeLayers = record.includeLayers === true;
        const config: Record<string, unknown> = {
            model: null,
            review_model: null,
            model_context_window: null,
            model_auto_compact_token_limit: null,
            model_provider: null,
            approval_policy: null,
            approvals_reviewer: null,
            sandbox_mode: null,
            sandbox_workspace_write: null,
            forced_chatgpt_workspace_id: null,
            forced_login_method: null,
            web_search: null,
            tools: null,
            profile: null,
            profiles: {},
            instructions: null,
            developer_instructions: null,
            compact_prompt: null,
            model_reasoning_effort: null,
            model_reasoning_summary: null,
            service_tier: null,
            model_verbosity: null,
            analytics: null,
            mcp_servers: {},
            apps: {
                _default: {
                    enabled: true,
                    destructive_enabled: false,
                    open_world_enabled: false,
                    default_tools_approval_mode: null,
                    default_tools_enabled: null,
                    tools: null
                }
            }
        };
        for (const key of CHATGPT_CONFIGURATION_KEYS) {
            const value = this.preferences.get(key);
            if (value !== undefined) {
                config[key.replace(/^chatgpt\./, '')] = value;
            }
        }
        return {
            config,
            origins: {},
            ...(includeLayers ? { layers: [] } : {})
        };
    }

    protected async startConversation(params: unknown): Promise<string> {
        const record = parseCodexRpcParams(params);
        const cwd = typeof record.cwd === 'string' ? record.cwd : process.cwd();
        const input = Array.isArray(record.input) ? record.input : [];
        try {
            const permissions = record.permissions as { approvalPolicy?: unknown } | undefined;
            const response = await this.codexProvider.invokeAppServerRequest({
                method: 'thread/start',
                params: {
                    cwd,
                    input,
                    workspaceRoots: Array.isArray(record.workspaceRoots) ? record.workspaceRoots : [cwd],
                    threadSource: record.threadSource ?? 'user',
                    ...(record.config ? { config: record.config } : {}),
                    ...(permissions?.approvalPolicy !== undefined ? { approvalPolicy: permissions.approvalPolicy } : {})
                },
                executablePath: this.getCliExecutable(),
                cwd
            }) as { thread?: { id?: string } } | undefined;
            const threadId = response?.thread?.id;
            if (typeof threadId === 'string' && threadId.length > 0) {
                return threadId;
            }
        } catch {
            // Fall back to a local conversation id when Codex Provider is unavailable.
        }
        return `thread-${Date.now()}`;
    }

    async fetch(request: CodexFetchRequest): Promise<CodexFetchResponse> {
        if (request.url.startsWith(CODEX_VSCODE_RPC_PREFIX)) {
            return this.handleExtensionRpcFetch(request, 'backend');
        }
        return this.fetchProxy.fetch(request);
    }

    protected async handleExtensionRpcFetch(request: CodexFetchRequest, webviewId: string): Promise<CodexFetchResponse> {
        const method = request.url.slice(CODEX_VSCODE_RPC_PREFIX.length).replace(/\/$/, '');
        let params: unknown = undefined;
        if (request.body) {
            try {
                params = JSON.parse(request.body);
            } catch {
                params = request.body;
            }
        }
        try {
            const result = await this.invokeRpc(webviewId, method, params);
            return {
                requestId: request.requestId,
                responseType: 'success',
                status: 200,
                bodyJsonString: JSON.stringify(result ?? null)
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return {
                requestId: request.requestId,
                responseType: 'error',
                status: 500,
                error: message,
                bodyJsonString: JSON.stringify({ error: message })
            };
        }
    }

    cancelFetch(requestId: string): void {
        this.fetchProxy.cancelFetch(requestId);
    }

    async fetchStream(_request: CodexFetchRequest, _onEvent: (event: unknown) => void): Promise<void> {
        return undefined;
    }

    cancelFetchStream(requestId: string): void {
        this.fetchProxy.cancelFetchStream(requestId);
    }

    subscribeSharedObject(webviewId: string, key: string): void {
        this.sharedObjects.subscribe(webviewId, key);
        const current = this.sharedObjects.get(key);
        if (current !== undefined) {
            this.client?.notifySharedObjectUpdated(key, current);
        }
    }

    unsubscribeSharedObject(webviewId: string, key: string): void {
        this.sharedObjects.unsubscribe(webviewId, key);
    }

    setSharedObject(webviewId: string, key: string, value: unknown): void {
        this.sharedObjects.set(key, value);
        for (const subscriber of this.sharedObjects.getSubscriberWebviewIds(key)) {
            if (subscriber !== webviewId) {
                this.client?.notifySharedObjectUpdated(key, value);
            }
        }
    }

    getSharedObjectSnapshot(key: string): unknown {
        return this.sharedObjects.get(key);
    }

    async handleWorkerRequest(workerId: string, request: CodexWorkerRequest): Promise<CodexWorkerResponseBody> {
        if (workerId === 'git') {
            return this.gitWorker.handleRequest(request);
        }
        return {
            id: request.id,
            method: request.method,
            result: codexWorkerError(`Worker bridge not available for worker "${workerId}"`)
        };
    }

    cancelWorkerRequest(workerId: string, requestId: string | number): void {
        if (workerId === 'git') {
            this.gitWorker.handleCancel(requestId);
        }
    }

    protected async handleThreadFollower(method: string, params: unknown): Promise<unknown> {
        const payload = params as Record<string, unknown> | undefined;
        switch (method) {
            case 'thread-follower-compact-thread':
                return this.codexProvider.compactThread({
                    sessionId: String(payload?.threadId ?? payload?.sessionId ?? 'default'),
                    executablePath: this.getCliExecutable()
                });
            case 'thread-follower-set-thread':
                return this.codexProvider.setThread({
                    sessionId: String(payload?.sessionId ?? 'default'),
                    threadId: String(payload?.threadId ?? ''),
                    executablePath: this.getCliExecutable()
                });
            default:
                return { ok: true, method, params };
        }
    }

    protected getCliExecutable(): string | undefined {
        return this.preferences.get<string>(CodexExtensionPreferences.CLI_EXECUTABLE, undefined);
    }

    protected extractParamKey(params: unknown): string | undefined {
        if (typeof params === 'string') {
            return params;
        }
        if (params && typeof params === 'object') {
            const record = params as Record<string, unknown>;
            if (typeof record.key === 'string') {
                return record.key;
            }
            if (typeof record.params === 'object' && record.params) {
                const nested = record.params as Record<string, unknown>;
                if (typeof nested.key === 'string') {
                    return nested.key;
                }
            }
        }
        return undefined;
    }

    protected extractKeyValue(params: unknown): { key?: string; value?: unknown } {
        if (!params || typeof params !== 'object') {
            return {};
        }
        const record = params as Record<string, unknown>;
        const nested = record.params && typeof record.params === 'object'
            ? record.params as Record<string, unknown>
            : record;
        return {
            key: typeof nested.key === 'string' ? nested.key : undefined,
            value: nested.value
        };
    }

    protected extractUri(params: unknown): string | undefined {
        if (!params || typeof params !== 'object') {
            return undefined;
        }
        const record = params as Record<string, unknown>;
        const nested = record.params && typeof record.params === 'object'
            ? record.params as Record<string, unknown>
            : record;
        if (typeof nested.uri === 'string') {
            return nested.uri;
        }
        if (typeof nested.path === 'string') {
            return nested.path;
        }
        return undefined;
    }

    protected extractConfigEntries(params: unknown): Record<string, unknown> {
        if (!params || typeof params !== 'object') {
            return {};
        }
        const record = params as Record<string, unknown>;
        if (record.params && typeof record.params === 'object') {
            return record.params as Record<string, unknown>;
        }
        return record;
    }
}

export function isCodexExtensionRpcUrl(url: string): boolean {
    return url.startsWith(CODEX_VSCODE_RPC_PREFIX);
}

// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { inject, injectable, optional, postConstruct } from '@theia/core/shared/inversify';
import { PreferenceService } from '@theia/core/lib/common/preferences';
import { FileUri } from '@theia/core/lib/common/file-uri';
import { CodexProviderAppServerNotification, CodexProviderService } from '@cybervinci/codex-provider/lib/common/codex-provider-service';
import { FlowService } from '@cybervinci/flow/lib/common';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
    CHATGPT_CONFIGURATION_KEYS,
    CodexExtensionPreferences
} from '../common/codex-preferences';
import {
    CODEX_OFFICIAL_EXTENSION_VERSION,
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

    @inject(FlowService) @optional()
    protected readonly flowService?: FlowService;

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
        this.codexProvider.onAppServerNotification(notification => this.forwardAppServerNotification(notification));
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
                    return { value: this.preferences.get(key) };
                }
                const config: Record<string, unknown> = {};
                for (const configKey of CHATGPT_CONFIGURATION_KEYS) {
                    config[configKey] = this.preferences.get(configKey);
                }
                return { config, values: config };
            }
            case 'set-configuration': {
                const entries = this.extractConfigEntries(params);
                for (const [key, value] of Object.entries(entries)) {
                    await this.preferences.set(key, value);
                }
                return { ok: true };
            }
            case 'get-settings':
                return { values: this.buildSettingsValues() };
            case 'get-setting': {
                const key = this.extractSettingKey(params);
                return { value: key ? this.readSettingValue(key) : undefined };
            }
            case 'set-setting': {
                const { key, value } = this.extractKeyValue(params);
                if (key) {
                    await this.writeSettingValue(key, value);
                }
                return { ok: true };
            }
            case 'get-global-state': {
                const key = this.extractParamKey(params);
                return key ? { value: this.globalState.get(key) } : this.globalState.getSnapshot();
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
            case 'list-pinned-threads': {
                const threadIds = this.globalState.get('pinnedThreadIds');
                return {
                    threadIds: Array.isArray(threadIds)
                        ? threadIds.filter((entry): entry is string => typeof entry === 'string')
                        : []
                };
            }
            case 'set-pinned-threads-order': {
                const record = parseCodexRpcParams(params);
                const threadIds = Array.isArray(record.threadIds)
                    ? record.threadIds.filter((entry): entry is string => typeof entry === 'string')
                    : [];
                this.globalState.set('pinnedThreadIds', threadIds);
                return { threadIds };
            }
            case 'extension-info':
                return {
                    appName: 'Codex',
                    displayName: 'Codex',
                    extensionId: 'openai.chatgpt',
                    extensionVersion: CODEX_OFFICIAL_EXTENSION_VERSION,
                    name: 'chatgpt',
                    publisher: 'openai',
                    version: CODEX_OFFICIAL_EXTENSION_VERSION
                };
            case 'os-info':
                return {
                    arch: process.arch,
                    platform: process.platform,
                    release: os.release(),
                    homedir: os.homedir(),
                    tmpdir: os.tmpdir()
                };
            case 'active-workspace-roots':
                return this.workspaceRootOptions(params);
            case 'locale-info':
                return {
                    ideLocale: process.env.LANG || 'en-US',
                    systemLocale: Intl.DateTimeFormat().resolvedOptions().locale || 'en-US'
                };
            case 'openai-api-key':
                return { value: process.env.OPENAI_API_KEY ?? null };
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
            case 'git-checkout-branch':
                return this.gitBridge.gitCheckoutBranch(params);
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
                return this.openInTargets(params);
            case 'set-preferred-app':
                return this.setPreferredApp(params);
            case 'terminal-shell-options':
                return this.terminalShellOptions();
            case 'thread-terminal-snapshot':
                return this.threadTerminalSnapshot(params);
            case 'local-environments':
                return this.localEnvironments(params);
            case 'local-environment':
                return this.localEnvironment(params);
            case 'local-environment-config':
                return this.localEnvironmentConfig(params);
            case 'local-environment-config-save':
                return this.localEnvironmentConfigSave(params);
            case 'worktree-shell-environment-config':
                return this.worktreeShellEnvironmentConfig(params);
            case 'mcp-codex-config':
                return this.mcpCodexConfig(params);
            case 'ipc-request':
                return this.handleIpcRequest(params);
            case 'set-vs-context':
                return { ok: true };
            case 'apply-patch':
                return this.gitBridge.applyPatch(params);
            case 'prepare-worktree-snapshot':
                return this.worktrees.prepareWorktreeSnapshot(params);
            case 'upload-worktree-snapshot':
                return this.worktrees.uploadWorktreeSnapshot(params);
            case 'gh-cli-status':
                return this.gitBridge.ghCliStatus(params);
            case 'gh-current-user':
                return this.gitBridge.ghCurrentUser(params);
            case 'gh-pr-create':
                return this.gitBridge.ghPrCreate(params);
            case 'gh-pr-board':
                return this.gitBridge.ghPrBoard(params);
            case 'gh-pr-body':
                return this.gitBridge.ghPrBody(params);
            case 'gh-pr-checks':
                return this.gitBridge.ghPrChecks(params);
            case 'gh-pr-comments':
                return this.gitBridge.ghPrComments(params);
            case 'gh-pr-status':
                return this.gitBridge.ghPrStatus(params);
            case 'gh-pr-diff':
                return this.gitBridge.ghPrDiff(params);
            case 'gh-pr-merge':
                return this.gitBridge.ghPrMerge(params);
            case 'gh-pr-update':
                return this.gitBridge.ghPrUpdate(params);
            case 'gh-pr-comment':
                return this.gitBridge.ghPrComment(params);
            case 'queued-follow-up-send-lock-acquire':
            case 'queued-follow-up-send-lock-release':
                return { acquired: false, released: false };
            case 'confirm-trace-recording-start':
            case 'cancel-trace-recording-start':
                return { success: false };
            case 'submit-trace-recording-details':
                return { success: false };
            case 'chrome-native-host-install':
            case 'chrome-native-host-uninstall':
                return {
                    success: false,
                    unavailable: true,
                    reason: 'Chrome native host integration is not available in the Theia host.'
                };
            case 'account-info':
                return this.codexProvider.getStatus({ executablePath: this.getCliExecutable() });
            case 'is-copilot-api-available':
                return { available: false };
            case 'get-copilot-api-proxy-info':
                return null;
            case 'has-custom-cli-executable':
                return { hasCustomCliExecutable: this.hasCustomCliExecutable() };
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
            case 'fast-mode-rollout-metrics':
                return null;
            case 'flow-list-workflows':
                return this.flowListWorkflows(params);
            case 'flow-list-workflow-patterns':
                return this.flowListWorkflowPatterns();
            case 'flow-ai-authoring-spec':
                return this.flowAiAuthoringSpec();
            case 'flow-create-workflow-from-ai-authoring-draft':
                return this.flowCreateWorkflowFromAiAuthoringDraft(params);
            case 'flow-plan-dynamic-workflow':
                return this.flowPlanDynamicWorkflow(params);
            case 'flow-start-workflow':
                return this.flowStartWorkflow(params);
            case 'flow-run-dynamic-workflow':
                return this.flowRunDynamicWorkflow(params);
            case 'list-mcp-server-status':
                return this.listMcpServerStatus(params);
            case 'read-mcp-resource':
                return this.readMcpResource(params);
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
                return this.workspaceRootOptions(params);
            case 'list-hooks-for-host':
                return this.listHooksForHost(params);
            default:
                throw new Error(`Unknown Codex RPC method: ${method}`);
        }
    }

    protected workspaceRootOptions(params: unknown): Record<string, unknown> {
        const record = parseCodexRpcParams(params);
        const roots = this.extractStringArray(record.roots);
        const cwd = this.extractString(record, ['cwd', 'workspaceRoot', 'root', 'gitRoot']) ?? process.cwd();
        const resolvedRoots = roots.length > 0 ? roots : [cwd];
        const labels = Object.fromEntries(resolvedRoots.map(root => [root, path.basename(root) || root]));
        return { roots: resolvedRoots, labels };
    }

    protected async flowListWorkflows(params: unknown): Promise<Record<string, unknown>> {
        const flow = this.requireFlowService();
        const workspaceRootUri = this.extractFlowWorkspaceRootUri(params);
        const workflows = await flow.listWorkflows(workspaceRootUri ? { workspaceRootUri } : {});
        return { workflows };
    }

    protected async flowListWorkflowPatterns(): Promise<Record<string, unknown>> {
        const flow = this.requireFlowService();
        const patterns = await flow.listWorkflowPatterns();
        return { patterns };
    }

    protected async flowAiAuthoringSpec(): Promise<Record<string, unknown>> {
        const flow = this.requireFlowService();
        const authoringFlow = flow as FlowService & { getAiAuthoringSpec?: () => Promise<unknown> };
        if (!authoringFlow.getAiAuthoringSpec) {
            throw new Error('CyberVinci Flow AI authoring spec is not available in this host.');
        }
        const spec = await authoringFlow.getAiAuthoringSpec();
        return { spec };
    }

    protected async flowCreateWorkflowFromAiAuthoringDraft(params: unknown): Promise<Record<string, unknown>> {
        const flow = this.requireFlowService();
        const authoringFlow = flow as FlowService & { createWorkflowFromAiAuthoringDraft?: (request: { workspaceRootUri?: string; draft: unknown }) => Promise<unknown> };
        if (!authoringFlow.createWorkflowFromAiAuthoringDraft) {
            throw new Error('CyberVinci Flow AI authoring draft materialization is not available in this host.');
        }
        const record = parseCodexRpcParams(params);
        const draft = this.isRecord(record.authoringDraft) ? record.authoringDraft : this.isRecord(record.draft) ? record.draft : undefined;
        if (!draft) {
            throw new Error('flow-create-workflow-from-ai-authoring-draft requires draft or authoringDraft.');
        }
        const workspaceRootUri = this.extractFlowWorkspaceRootUri(record);
        const workflow = await authoringFlow.createWorkflowFromAiAuthoringDraft(workspaceRootUri ? { workspaceRootUri, draft } : { draft });
        return { workflow };
    }

    protected async flowPlanDynamicWorkflow(params: unknown): Promise<Record<string, unknown>> {
        const flow = this.requireFlowService();
        const record = parseCodexRpcParams(params);
        const prompt = this.extractString(record, ['prompt', 'message', 'input']) || '';
        if (!prompt.trim()) {
            throw new Error('flow-plan-dynamic-workflow requires prompt, message, or input.');
        }
        const workspaceRootUri = this.extractFlowWorkspaceRootUri(record);
        const request = {
            prompt,
            preferSaved: record.preferSaved !== false
        };
        const plan = await flow.planDynamicWorkflow(workspaceRootUri ? { ...request, workspaceRootUri } : request);
        return { plan };
    }

    protected async flowStartWorkflow(params: unknown): Promise<Record<string, unknown>> {
        const flow = this.requireFlowService();
        const record = parseCodexRpcParams(params);
        const workflowId = this.extractString(record, ['workflowId', 'workflow', 'id']);
        const prompt = this.extractString(record, ['prompt', 'message', 'input']) || '';
        if (!workflowId) {
            throw new Error('flow-start-workflow requires workflowId.');
        }
        if (!prompt.trim()) {
            throw new Error('flow-start-workflow requires prompt, message, or input.');
        }
        const workspaceRootUri = this.extractFlowWorkspaceRootUri(record);
        const request = {
            workflowId,
            prompt
        };
        const run = await flow.startRun(workspaceRootUri ? { ...request, workspaceRootUri } : request);
        return { run };
    }

    protected async flowRunDynamicWorkflow(params: unknown): Promise<Record<string, unknown>> {
        const flow = this.requireFlowService();
        const record = parseCodexRpcParams(params);
        const prompt = this.extractString(record, ['prompt', 'message', 'input']) || '';
        if (!prompt.trim()) {
            throw new Error('flow-run-dynamic-workflow requires prompt, message, or input.');
        }
        const workspaceRootUri = this.extractFlowWorkspaceRootUri(record);
        const request = {
            prompt,
            preferSaved: record.preferSaved !== false
        };
        const parameters = this.isRecord(record.parameters) ? { parameters: record.parameters } : {};
        const roleOverrides = this.isRecord(record.roleOverrides) ? { roleOverrides: record.roleOverrides } : {};
        const authoringDraft = this.isRecord(record.authoringDraft) ? { authoringDraft: record.authoringDraft } : this.isRecord(record.draft) ? { authoringDraft: record.draft } : {};
        const run = await flow.runDynamicWorkflow(workspaceRootUri ? { ...request, ...parameters, ...roleOverrides, ...authoringDraft, workspaceRootUri } : { ...request, ...parameters, ...roleOverrides, ...authoringDraft });
        return { run };
    }

    protected requireFlowService(): FlowService {
        if (!this.flowService) {
            throw new Error('CyberVinci Flow service is not available in this host.');
        }
        return this.flowService;
    }

    protected extractFlowWorkspaceRootUri(params: unknown): string | undefined {
        const record = parseCodexRpcParams(params);
        const explicitUri = this.extractString(record, ['workspaceRootUri', 'workspaceUri', 'rootUri']);
        if (explicitUri) {
            return explicitUri;
        }
        const workspaceRoot = this.extractString(record, ['workspaceRoot', 'workspacePath', 'cwd', 'root', 'gitRoot']);
        return workspaceRoot ? FileUri.create(path.resolve(workspaceRoot)).toString() : undefined;
    }

    protected openInTargets(_params: unknown): Record<string, unknown> {
        const preferredTarget = this.globalState.get('preferredOpenTarget');
        const fileManagerLabel = process.platform === 'darwin'
            ? 'Finder'
            : process.platform === 'win32'
                ? 'File Explorer'
                : 'File Manager';
        const targets = [
            {
                id: 'theia',
                target: 'editor',
                label: 'Theia',
                kind: 'editor',
                icon: null,
                hidden: false
            },
            {
                id: 'system-default',
                target: 'systemDefault',
                label: 'System default',
                kind: 'native',
                icon: null,
                hidden: false
            },
            {
                id: 'file-manager',
                target: 'fileManager',
                label: fileManagerLabel,
                kind: 'native',
                icon: null,
                hidden: false
            }
        ];
        return {
            mode: 'editor',
            preferredTarget: typeof preferredTarget === 'string' ? preferredTarget : 'editor',
            availableTargets: targets.map(target => target.target),
            targets
        };
    }

    protected setPreferredApp(params: unknown): Record<string, unknown> {
        const record = parseCodexRpcParams(params);
        const target = this.extractString(record, ['target', 'preferredTarget', 'appId', 'id']);
        if (target) {
            this.globalState.set('preferredOpenTarget', target);
        }
        return { success: !!target, preferredTarget: target ?? null };
    }

    protected terminalShellOptions(): Record<string, unknown> {
        const shells = process.platform === 'win32'
            ? [
                { id: 'powershell', label: 'PowerShell', path: 'powershell.exe', args: ['-NoLogo'] },
                { id: 'pwsh', label: 'PowerShell 7', path: 'pwsh.exe', args: ['-NoLogo'] },
                { id: 'cmd', label: 'Command Prompt', path: 'cmd.exe', args: [] }
            ]
            : [
                { id: 'bash', label: 'bash', path: process.env.SHELL || '/bin/bash', args: [] },
                { id: 'sh', label: 'sh', path: '/bin/sh', args: [] }
            ];
        return {
            defaultShell: shells[0]?.id ?? null,
            availableShells: shells,
            shells
        };
    }

    protected threadTerminalSnapshot(params: unknown): Record<string, unknown> {
        const record = parseCodexRpcParams(params);
        return {
            session: null,
            terminal: null,
            cwd: this.extractString(record, ['cwd', 'workspaceRoot']) ?? process.cwd(),
            scrollback: ''
        };
    }

    protected async localEnvironments(params: unknown): Promise<Record<string, unknown>> {
        const record = parseCodexRpcParams(params);
        const workspaceRoot = this.extractString(record, ['workspaceRoot', 'cwd', 'root']) ?? process.cwd();
        const envDir = path.join(workspaceRoot, '.codex', 'environments');
        const environments: Record<string, unknown>[] = [];
        try {
            const entries = await fs.readdir(envDir, { withFileTypes: true });
            for (const entry of entries) {
                if (!entry.isFile() || !entry.name.endsWith('.toml')) {
                    continue;
                }
                const configPath = path.join(envDir, entry.name);
                environments.push(await this.readLocalEnvironmentConfig(configPath));
            }
        } catch {
            // No environment directory yet.
        }
        const legacyPath = path.join(workspaceRoot, '.codex', 'environment.toml');
        try {
            await fs.access(legacyPath);
            if (!environments.some(environment => environment.configPath === legacyPath)) {
                environments.unshift(await this.readLocalEnvironmentConfig(legacyPath));
            }
        } catch {
            // No legacy config.
        }
        return { environments };
    }

    protected async localEnvironment(params: unknown): Promise<Record<string, unknown>> {
        const record = parseCodexRpcParams(params);
        const configPath = this.extractString(record, ['configPath', 'path']);
        if (configPath) {
            return { environment: await this.readLocalEnvironmentConfig(configPath) };
        }
        const environments = await this.localEnvironments(params);
        const list = Array.isArray(environments.environments) ? environments.environments : [];
        return { environment: list[0] ?? null };
    }

    protected async localEnvironmentConfig(params: unknown): Promise<Record<string, unknown>> {
        const record = parseCodexRpcParams(params);
        const configPath = this.extractString(record, ['configPath', 'path']);
        if (!configPath) {
            return { config: null };
        }
        return { config: await this.readLocalEnvironmentConfig(configPath) };
    }

    protected async localEnvironmentConfigSave(params: unknown): Promise<Record<string, unknown>> {
        const record = parseCodexRpcParams(params);
        const configPath = this.extractString(record, ['configPath', 'path']);
        const raw = typeof record.raw === 'string'
            ? record.raw
            : typeof record.contents === 'string'
                ? record.contents
                : typeof record.content === 'string'
                    ? record.content
                    : undefined;
        if (!configPath || raw === undefined) {
            return { success: false, error: 'Missing configPath or raw config content' };
        }
        await fs.mkdir(path.dirname(configPath), { recursive: true });
        await fs.writeFile(configPath, raw, 'utf8');
        return { success: true, config: await this.readLocalEnvironmentConfig(configPath) };
    }

    protected async worktreeShellEnvironmentConfig(params: unknown): Promise<Record<string, unknown>> {
        const environment = (await this.localEnvironment(params)).environment ?? null;
        return {
            shellEnvironment: environment,
            environment
        };
    }

    protected async readLocalEnvironmentConfig(configPath: string): Promise<Record<string, unknown>> {
        try {
            const raw = await fs.readFile(configPath, 'utf8');
            return {
                type: 'success',
                configPath,
                name: path.basename(configPath, '.toml'),
                raw,
                config: this.extractSimpleTomlConfig(raw)
            };
        } catch (error) {
            return {
                type: 'error',
                configPath,
                name: path.basename(configPath, '.toml'),
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    protected extractSimpleTomlConfig(raw: string): Record<string, unknown> {
        const config: Record<string, unknown> = {};
        for (const line of raw.split(/\r?\n/)) {
            const match = /^\s*([A-Za-z0-9_.-]+)\s*=\s*(.+?)\s*$/.exec(line);
            if (!match) {
                continue;
            }
            const [, key, value] = match;
            if (!key || value === undefined) {
                continue;
            }
            config[key] = this.parseSimpleTomlValue(value);
        }
        return config;
    }

    protected parseSimpleTomlValue(value: string): unknown {
        const trimmed = value.trim();
        if (trimmed === 'true') {
            return true;
        }
        if (trimmed === 'false') {
            return false;
        }
        if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
            return Number(trimmed);
        }
        const quoted = /^["'](.*)["']$/.exec(trimmed);
        return quoted ? quoted[1] : trimmed;
    }

    protected async mcpCodexConfig(params: unknown): Promise<Record<string, unknown>> {
        const config = this.buildReadConfigForHostResponse(params);
        const record = this.isRecord(config) ? config : {};
        return {
            config: this.isRecord(record.config) ? record.config.mcp_servers ?? {} : {},
            mcpServers: this.isRecord(record.config) ? record.config.mcp_servers ?? {} : {}
        };
    }

    protected async listMcpServerStatus(params: unknown): Promise<Record<string, unknown>> {
        try {
            const result = await this.tryInvokeCliIpc('mcpServerStatus/list', params);
            const record = parseCodexRpcParams(result);
            const data = this.extractArray(record.data) ?? this.extractArray(record.servers) ?? [];
            return {
                ...record,
                data,
                servers: data,
                nextCursor: this.extractCursor(record),
                cursor: this.extractCursor(record)
            };
        } catch {
            return { data: [], servers: [], nextCursor: null, cursor: null };
        }
    }

    protected async readMcpResource(params: unknown): Promise<Record<string, unknown>> {
        const record = parseCodexRpcParams(params);
        for (const method of ['mcp/resource/read', 'resources/read', 'mcpServerResource/read']) {
            try {
                const result = await this.tryInvokeCliIpc(method, params);
                const normalized = parseCodexRpcParams(result);
                if (Array.isArray(normalized.contents)) {
                    return { contents: normalized.contents };
                }
            } catch {
                // Try the next app-server method name; CLI builds have used different internal names.
            }
        }
        const uri = this.extractString(record, ['uri', 'resourceUri']);
        if (uri?.startsWith('file://')) {
            try {
                const filePath = fileURLToPath(uri);
                const text = await fs.readFile(filePath, 'utf8');
                return { contents: [{ uri, text, mimeType: 'text/plain' }] };
            } catch {
                return { contents: [] };
            }
        }
        return { contents: [] };
    }

    protected async listHooksForHost(params: unknown): Promise<Record<string, unknown>> {
        try {
            const result = await this.tryInvokeCliIpc('hooks/list', params);
            const record = parseCodexRpcParams(result);
            const hooks = this.extractArray(record.hooks) ?? this.extractArray(record.data) ?? [];
            return { ...record, hooks, data: hooks, nextCursor: this.extractCursor(record) };
        } catch {
            return { hooks: [], data: [], nextCursor: null };
        }
    }

    protected async handleIpcRequest(params: unknown): Promise<unknown> {
        const record = this.extractIpcRequest(params);
        const method = record.method;
        const requestId = record.requestId;
        if (!method) {
            return {
                requestId,
                type: 'response',
                resultType: 'success',
                result: { ok: true, unsupported: true, method: 'unknown' }
            };
        }
        try {
            const result = this.normalizeIpcResult(method, await this.tryInvokeCliIpc(method, record.params));
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
                const result = this.normalizeIpcResult(method, this.handleLocalIpcRequest(method, record.params));
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

    protected extractIpcRequest(params: unknown): { requestId: string, method?: string, params?: unknown } {
        const record = this.isRecord(params) ? params : {};
        const nested = this.isRecord(record.params) ? record.params : undefined;
        const source = typeof record.method === 'string'
            ? record
            : nested && typeof nested.method === 'string'
                ? nested
                : record;
        const requestId = typeof source.requestId === 'string' || typeof source.requestId === 'number'
            ? String(source.requestId)
            : '';
        return {
            requestId,
            method: typeof source.method === 'string' ? source.method : undefined,
            params: source.params
        };
    }

    protected async tryInvokeCliIpc(method: string, params: unknown): Promise<unknown> {
        const executablePath = this.getCliExecutable();
        return this.codexProvider.invokeAppServerRequest({
            method,
            params,
            executablePath,
            timeoutMs: method === 'account/login/start' ? 30_000 : 10_000
        });
    }

    protected normalizeIpcResult(method: string, result: unknown): unknown {
        const record = parseCodexRpcParams(result);
        switch (method) {
            case 'conversation/list':
            case 'thread/list': {
                const data = this.extractArray(record.data)
                    ?? this.extractArray(record.threads)
                    ?? this.extractArray(record.conversations)
                    ?? [];
                return {
                    ...record,
                    data,
                    conversations: this.extractArray(record.conversations) ?? data,
                    threads: this.extractArray(record.threads) ?? data,
                    nextCursor: this.extractCursor(record)
                };
            }
            case 'notification/list': {
                const data = this.extractArray(record.data) ?? this.extractArray(record.notifications) ?? [];
                return {
                    ...record,
                    data,
                    notifications: this.extractArray(record.notifications) ?? data,
                    nextCursor: this.extractCursor(record)
                };
            }
            case 'model/list': {
                const data = this.extractArray(record.data) ?? this.extractArray(record.models) ?? [];
                return {
                    ...record,
                    data,
                    models: this.extractArray(record.models) ?? data
                };
            }
            case 'account/login/start':
                return this.normalizeLoginStartResponse(result);
            case 'mcpServerStatus/list':
            case 'app/list':
            case 'plugin/list':
            case 'skills/list':
            case 'externalAgentConfig/list':
            case 'experimentalFeature/list':
                return {
                    ...record,
                    data: this.extractArray(record.data) ?? [],
                    nextCursor: this.extractCursor(record)
                };
            default:
                return result;
        }
    }

    protected extractArray(value: unknown): unknown[] | undefined {
        return Array.isArray(value) ? value : undefined;
    }

    protected extractCursor(record: Record<string, unknown>): string | null {
        if (typeof record.nextCursor === 'string') {
            return record.nextCursor;
        }
        if (typeof record.cursor === 'string') {
            return record.cursor;
        }
        return null;
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
                return { account: null, requiresOpenaiAuth: true };
            case 'account/info':
            case 'account/status':
                return { account: null, requiresOpenaiAuth: true };
            case 'account/login/start':
            case 'account/login/cancel':
            case 'account/logout':
                throw new Error(`${method} requires a running Codex CLI app-server. Install the codex CLI or configure chatgpt.cliExecutable.`);
            case 'model/list':
                return { data: [], models: [] };
            case 'modelProvider/capabilities/read':
                return { capabilities: {}, data: { capabilities: {} } };
            case 'configRequirements/read':
                return { requirements: null };
            case 'config/read':
            case 'config/effective':
            case 'config/layered/read':
                return this.buildReadConfigForHostResponse(params);
            case 'conversation/list':
            case 'thread/list':
                return { data: [], nextCursor: null, conversations: [], threads: [] };
            case 'notification/list':
                return { data: [], nextCursor: null, notifications: [] };
            case 'mcpServerStatus/list':
                return { data: [], nextCursor: null, servers: [] };
            case 'app/list':
            case 'plugin/list':
            case 'skills/list':
            case 'externalAgentConfig/list':
            case 'experimentalFeature/list':
                return { data: [], nextCursor: null };
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
            features: {
                remote_connections: false,
                remote_control_connections: false,
                request_permissions_tool: false
            },
            'features.remote_connections': false,
            'features.remote_control_connections': false,
            'features.request_permissions_tool': false,
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

    protected normalizeLoginStartResponse(result: unknown): unknown {
        const record = this.unwrapLoginStartResponse(result);
        switch (record.type) {
            case 'apiKey':
            case 'chatgptAuthTokens':
                return record;
            case 'chatgpt':
                if (typeof record.loginId === 'string' && typeof record.authUrl === 'string') {
                    return record;
                }
                break;
            case 'chatgptDeviceCode':
                if (typeof record.loginId === 'string' &&
                    typeof record.verificationUrl === 'string' &&
                    typeof record.userCode === 'string') {
                    return record;
                }
                break;
        }
        if (typeof record.loginId === 'string' && typeof record.authUrl === 'string') {
            return { ...record, type: 'chatgpt' };
        }
        throw new Error('Codex CLI app-server returned an invalid account/login/start response.');
    }

    protected unwrapLoginStartResponse(result: unknown): Record<string, unknown> {
        let current = result;
        for (let index = 0; index < 4; index++) {
            const record = parseCodexRpcParams(current);
            if (record.type !== undefined || !('result' in record)) {
                return record;
            }
            current = record.result;
        }
        return parseCodexRpcParams(current);
    }

    protected buildSettingsValues(): Record<string, unknown> {
        const values: Record<string, unknown> = {};
        for (const key of CHATGPT_CONFIGURATION_KEYS) {
            values[key] = this.preferences.get(key);
        }
        for (const [key, value] of Object.entries(this.globalState.getSnapshot())) {
            if (key.startsWith('setting:')) {
                values[key.slice('setting:'.length)] = value;
            }
        }
        return values;
    }

    protected extractSettingKey(params: unknown): string | undefined {
        const key = parseCodexRpcParams(params).key;
        if (typeof key === 'string') {
            return key;
        }
        const record = this.isRecord(key) ? key : {};
        return typeof record.key === 'string' ? record.key : undefined;
    }

    protected readSettingValue(key: string): unknown {
        const preferenceValue = this.preferences.get(key);
        return preferenceValue !== undefined
            ? preferenceValue
            : this.globalState.get(this.getSettingStateKey(key));
    }

    protected async writeSettingValue(key: string, value: unknown): Promise<void> {
        if (this.isKnownConfigurationKey(key)) {
            await this.preferences.set(key, value);
            return;
        }
        this.globalState.set(this.getSettingStateKey(key), value);
    }

    protected isKnownConfigurationKey(key: string): key is typeof CHATGPT_CONFIGURATION_KEYS[number] {
        return CHATGPT_CONFIGURATION_KEYS.includes(key as typeof CHATGPT_CONFIGURATION_KEYS[number]);
    }

    protected getSettingStateKey(key: string): string {
        return `setting:${key}`;
    }

    protected isRecord(value: unknown): value is Record<string, unknown> {
        return !!value && typeof value === 'object' && !Array.isArray(value);
    }

    protected extractString(record: Record<string, unknown>, keys: string[]): string | undefined {
        for (const key of keys) {
            const value = record[key];
            if (typeof value === 'string' && value.length > 0) {
                return value;
            }
        }
        return undefined;
    }

    protected extractStringArray(value: unknown): string[] {
        return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
    }

    protected forwardAppServerNotification(notification: CodexProviderAppServerNotification): void {
        if (notification.method) {
            this.client?.notifyMcpNotification?.('local', notification.method, notification.params);
        }
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
        const configured = this.preferences.get<string>(CodexExtensionPreferences.CLI_EXECUTABLE, undefined);
        return configured?.trim() || undefined;
    }

    protected hasCustomCliExecutable(): boolean {
        return this.getCliExecutable() !== undefined;
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

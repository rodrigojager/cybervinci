// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

export const CODEX_HOST_SERVICE_PATH = '/services/codex-host';
export const CODEX_WEBVIEW_STATIC_PATH = '/codex-webview';
export const CODEX_WEBVIEW_CHANNEL = 'codex-webview-ipc';

export const CODEX_OFFICIAL_EXTENSION_VERSION = '26.5527.31454';

/** Fire-and-forget message types webview → host */
export const CODEX_HOST_EVENT_TYPES = [
    'ready',
    'webview-ready',
    'view-focused',
    'shared-object-subscribe',
    'shared-object-unsubscribe',
    'shared-object-set',
    'open-vscode-command',
    'open-in-browser',
    'show-settings',
    'open-config-toml',
    'open-keyboard-shortcuts',
    'show-diff',
    'update-diff-if-open',
    'show-plan-summary',
    'navigate-to-route',
    'navigate-in-new-editor-tab',
    'hotkey-window-dismiss',
    'query-cache-invalidate',
    'tray-menu-threads-changed',
    'persisted-atom-sync-request',
    'persisted-atom-update',
    'mcp-request',
    'thread-prewarm-start',
    'implement-todo',
    'worker-request',
    'worker-request-cancel',
    'fetch',
    'fetch-stream',
    'cancel-fetch',
    'cancel-fetch-stream',
    'log-message'
] as const;

/** Host → webview event types */
export const CODEX_WEBVIEW_EVENT_TYPES = [
    'shared-object-updated',
    'theme-updated',
    'fetch-response',
    'fetch-stream-event',
    'fetch-stream-error',
    'fetch-stream-complete',
    'worker-response',
    'worker-event',
    'persisted-atom-sync',
    'persisted-atom-updated',
    'pinned-threads-updated',
    'mcp-response',
    'mcp-notification'
] as const;

/** RPC methods handled in the browser (file dialogs, IDE context, open file) */
export const CODEX_FRONTEND_RPC_METHODS = [
    'pick-files',
    'pick-file',
    'ide-context',
    'add-context-file',
    'open-file',
    'active-workspace-roots',
    'workspace-root-options'
] as const;

/** RPC methods invoked via vscode://codex/ fetch bridge */
export const CODEX_HOST_RPC_METHODS = [
    'get-configuration',
    'set-configuration',
    'get-settings',
    'get-setting',
    'set-setting',
    'get-global-state',
    'set-global-state',
    'read-file',
    'read-file-binary',
    'read-file-metadata',
    'list-pinned-threads',
    'set-pinned-threads-order',
    'extension-info',
    'os-info',
    'active-workspace-roots',
    'locale-info',
    'openai-api-key',
    'open-file',
    'pick-files',
    'pick-file',
    'ide-context',
    'add-context-file',
    'paths-exist',
    'git-origins',
    'git-merge-base',
    'git-create-branch',
    'git-checkout-branch',
    'git-push',
    'apply-patch',
    'open-in-targets',
    'set-preferred-app',
    'terminal-shell-options',
    'thread-terminal-snapshot',
    'local-environments',
    'local-environment',
    'local-environment-config',
    'local-environment-config-save',
    'worktree-shell-environment-config',
    'mcp-codex-config',
    'read-config-for-host',
    'get-config-requirements-for-host',
    'write-config-value',
    'list-mcp-server-status',
    'read-mcp-resource',
    'ipc-request',
    'set-vs-context',
    'set-thread-title',
    'prepare-worktree-snapshot',
    'upload-worktree-snapshot',
    'gh-cli-status',
    'gh-current-user',
    'gh-pr-create',
    'gh-pr-board',
    'gh-pr-body',
    'gh-pr-checks',
    'gh-pr-comments',
    'gh-pr-status',
    'gh-pr-diff',
    'gh-pr-merge',
    'gh-pr-update',
    'gh-pr-comment',
    'queued-follow-up-send-lock-acquire',
    'queued-follow-up-send-lock-release',
    'confirm-trace-recording-start',
    'cancel-trace-recording-start',
    'submit-trace-recording-details',
    'recommended-skills',
    'install-recommended-skill',
    'read-plugin-skill',
    'developer-instructions',
    'fork-conversation-from-latest',
    'fork-conversation-from-turn',
    'start-conversation',
    'account-info',
    'is-copilot-api-available',
    'get-copilot-api-proxy-info',
    'has-custom-cli-executable',
    'thread-follower-start-turn',
    'thread-follower-steer-turn',
    'thread-follower-interrupt-turn',
    'thread-follower-compact-thread',
    'thread-follower-set-thread',
    'codex-home',
    'home-directory',
    'workspace-root-options',
    'list-hooks-for-host',
    'batch-write-config-value',
    'fast-mode-rollout-metrics',
    'flow-list-workflows',
    'flow-list-workflow-patterns',
    'flow-ai-authoring-spec',
    'flow-create-workflow-from-ai-authoring-draft',
    'flow-plan-dynamic-workflow',
    'flow-start-workflow',
    'flow-run-dynamic-workflow',
    'refresh-remote-connections',
    'discover-remote-ssh-connections',
    'refresh-remote-control-connections',
    'set-remote-control-connections-enabled',
    'add-remote-connection',
    'codex-worktrees',
    'list-worktrees',
    'resolve-worktree-for-thread',
    'chrome-native-host-install',
    'chrome-native-host-uninstall',
    'ping'
] as const;

export const CODEX_VSCODE_RPC_PREFIX = 'vscode://codex/';

export type CodexHostEventType = typeof CODEX_HOST_EVENT_TYPES[number];
export type CodexWebviewEventType = typeof CODEX_WEBVIEW_EVENT_TYPES[number];
export type CodexHostRpcMethod = typeof CODEX_HOST_RPC_METHODS[number];
export type CodexFrontendRpcMethod = typeof CODEX_FRONTEND_RPC_METHODS[number];

export interface CodexPickedFile {
    label: string;
    path: string;
    fsPath: string;
}

export function parseCodexRpcParams(params: unknown): Record<string, unknown> {
    if (!params || typeof params !== 'object') {
        return {};
    }
    const record = params as Record<string, unknown>;
    if (record.params && typeof record.params === 'object') {
        return record.params as Record<string, unknown>;
    }
    return record;
}

export function isCodexFrontendRpcMethod(method: string): method is CodexFrontendRpcMethod {
    return (CODEX_FRONTEND_RPC_METHODS as readonly string[]).includes(method);
}

export interface CodexWebviewEnvelope {
    channel: typeof CODEX_WEBVIEW_CHANNEL;
    webviewId: string;
    message: CodexHostMessage;
}

export interface CodexHostMessage {
    type: string;
    requestId?: string;
    method?: string;
    params?: unknown;
    [key: string]: unknown;
}

export interface CodexHostRpcRequest {
    webviewId: string;
    requestId: string;
    method: CodexHostRpcMethod | string;
    params?: unknown;
}

export interface CodexHostRpcResponse {
    requestId: string;
    result?: unknown;
    error?: string;
}

export interface CodexWebviewOptions {
    webviewId: string;
    initialRoute?: string;
    viewKind: 'sidebar' | 'editor' | 'hotkey';
}

export interface CodexFetchRequest {
    requestId: string;
    hostId?: string;
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: string;
}

export interface CodexFetchResponse {
    requestId: string;
    responseType: 'success' | 'error';
    status?: number;
    headers?: Record<string, string>;
    bodyJsonString?: string;
    error?: string;
}

export interface CodexSharedObjectUpdate {
    key: string;
    value: unknown;
}

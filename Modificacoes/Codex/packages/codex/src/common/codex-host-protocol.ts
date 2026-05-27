// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

export const CODEX_HOST_SERVICE_PATH = '/services/codex-host';
export const CODEX_WEBVIEW_STATIC_PATH = '/codex-webview';
export const CODEX_WEBVIEW_CHANNEL = 'codex-webview-ipc';

export const CODEX_OFFICIAL_EXTENSION_VERSION = '26.5513.21555';

/** Fire-and-forget message types webview → host */
export const CODEX_HOST_EVENT_TYPES = [
    'shared-object-subscribe',
    'shared-object-unsubscribe',
    'shared-object-set',
    'open-vscode-command',
    'navigate-to-route',
    'navigate-in-new-editor-tab',
    'hotkey-window-dismiss',
    'query-cache-invalidate',
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
    'fetch-response',
    'fetch-stream-event',
    'fetch-stream-error',
    'fetch-stream-complete',
    'worker-response',
    'worker-event'
] as const;

/** RPC methods handled in the browser (file dialogs, IDE context, open file) */
export const CODEX_FRONTEND_RPC_METHODS = [
    'pick-files',
    'pick-file',
    'ide-context',
    'add-context-file',
    'open-file'
] as const;

/** RPC methods invoked via vscode://codex/ fetch bridge */
export const CODEX_HOST_RPC_METHODS = [
    'get-configuration',
    'set-configuration',
    'get-global-state',
    'set-global-state',
    'read-file',
    'read-file-binary',
    'read-file-metadata',
    'open-file',
    'pick-files',
    'pick-file',
    'ide-context',
    'add-context-file',
    'paths-exist',
    'git-origins',
    'git-merge-base',
    'git-create-branch',
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
    'ipc-request',
    'set-vs-context',
    'prepare-worktree-snapshot',
    'upload-worktree-snapshot',
    'gh-pr-create',
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
    'refresh-remote-connections',
    'discover-remote-ssh-connections',
    'refresh-remote-control-connections',
    'set-remote-control-connections-enabled',
    'add-remote-connection',
    'codex-worktrees',
    'list-worktrees',
    'resolve-worktree-for-thread',
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

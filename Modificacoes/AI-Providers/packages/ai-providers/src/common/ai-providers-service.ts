// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { Disposable, JsonRpcServer } from '@theia/core';

export const CODEX_CLI_SERVICE_PATH = '/services/ai-providers';

export const CodexProviderClient = Symbol('CodexProviderClient');
export interface CodexProviderClient {
    sendToken(streamId: string, token?: CodexProviderStreamMessage): void;
    sendError(streamId: string, error: Error): void;
}

export const CodexProviderService = Symbol('CodexProviderService');
export interface CodexProviderService extends JsonRpcServer<CodexProviderClient> {
    send(request: CodexProviderBackendRequest, streamId: string): Promise<void>;
    sendAndCollect(request: CodexProviderBackendRequest): Promise<CodexProviderCollectResult>;
    cancel(streamId: string): void;
    handleApprovalResponse(response: CodexProviderApprovalResponseMessage): void;
    handleUserInputResponse(response: CodexProviderUserInputResponseMessage): void;
    login(request: CodexProviderLoginRequest): Promise<CodexProviderLoginResult>;
    restart(request: CodexProviderStatusRequest): Promise<CodexProviderBackendStatus>;
    getStatus(request: CodexProviderStatusRequest): Promise<CodexProviderBackendStatus>;
    compactThread(request: CodexProviderThreadActionRequest): Promise<CodexProviderThreadActionResult>;
    resetThread(request: CodexProviderThreadActionRequest): Promise<CodexProviderThreadActionResult>;
    setThread(request: CodexProviderSetThreadRequest): Promise<CodexProviderThreadActionResult>;
    invokeAppServerRequest(request: CodexProviderAppServerRequest): Promise<unknown>;
    onAppServerNotification(listener: (notification: CodexProviderAppServerNotification) => void): Disposable;
}

export interface CodexProviderAppServerRequest extends CodexProviderStatusRequest {
    method: string;
    params?: unknown;
    timeoutMs?: number;
}

export interface CodexProviderAppServerNotification {
    method: string;
    params?: unknown;
}

export interface CodexProviderRequest {
    prompt: string;
    input?: CodexProviderInputItem[];
    sessionId?: string;
    options?: Partial<CodexProviderOptions>;
}

export type CodexProviderRuntime = 'codex-app-server' | 'direct-http' | 'opencode-cli' | 'gemini-cli' | 'claude-code-cli' | 'cursor-cli';

export interface CodexProviderBackendRequest extends CodexProviderRequest {
    runtime?: CodexProviderRuntime;
    executablePath?: string;
    profile?: string;
    modelProvider?: string;
    openRouterApiKey?: string;
    openCodeApiKey?: string;
    openCodeExecutablePath?: string;
    openCodeAgent?: string;
    openCodeVariant?: string;
    geminiExecutablePath?: string;
    claudeExecutablePath?: string;
    claudeAgent?: string;
    cursorExecutablePath?: string;
    cursorMode?: string;
}

export interface CodexProviderLoginRequest {
    runtime?: CodexProviderRuntime;
    executablePath?: string;
    profile?: string;
    cwd?: string;
    modelProvider?: string;
    openRouterApiKey?: string;
    openCodeApiKey?: string;
    openCodeExecutablePath?: string;
    geminiExecutablePath?: string;
    claudeExecutablePath?: string;
    cursorExecutablePath?: string;
}

export interface CodexProviderLoginResult {
    status: 'started' | 'completed';
    message?: string;
}

export interface CodexProviderStatusRequest {
    runtime?: CodexProviderRuntime;
    executablePath?: string;
    profile?: string;
    cwd?: string;
    model?: string;
    modelProvider?: string;
    openRouterApiKey?: string;
    openCodeApiKey?: string;
    openCodeExecutablePath?: string;
    openCodeAgent?: string;
    openCodeVariant?: string;
    geminiExecutablePath?: string;
    claudeExecutablePath?: string;
    claudeAgent?: string;
    cursorExecutablePath?: string;
    cursorMode?: string;
}

export interface CodexProviderThreadActionRequest extends CodexProviderStatusRequest {
    sessionId: string;
}

export interface CodexProviderSetThreadRequest extends CodexProviderThreadActionRequest {
    threadId: string;
}

export interface CodexProviderThreadActionResult {
    status: 'completed' | 'failed' | 'no-thread';
    message?: string;
    threadId?: string;
}

export interface CodexProviderBackendStatus {
    available: boolean;
    executablePath: string;
    runtime?: CodexProviderRuntime;
    modelProvider?: string;
    version?: string;
    message?: string;
    appServer?: boolean;
    authenticated?: boolean;
    authStatus?: string;
    accountLabel?: string;
    models?: string[];
    capabilities?: CodexProviderCapabilityStatus;
    configurationRequired?: string[];
    detectedProviders?: CodexProviderDetectedProvider[];
}

export interface CodexProviderCollectResult {
    text: string;
    notifications: CodexProviderNotificationMessage[];
}

export interface CodexProviderStatus {
    runtime?: CodexProviderRuntime;
    modelProvider?: string;
    executablePath?: string;
    profile?: string;
    cwd?: string;
    available?: boolean;
    version?: string;
    message?: string;
    appServer?: boolean;
    authenticated?: boolean;
    authStatus?: string;
    accountLabel?: string;
    models?: string[];
    capabilities?: CodexProviderCapabilityStatus;
    configurationRequired?: string[];
    detectedProviders?: CodexProviderDetectedProvider[];
    model?: string;
    approvalPolicy?: CodexProviderOptions['approvalPolicy'];
    sandboxMode?: CodexProviderOptions['sandboxMode'];
    reasoningEffort?: CodexProviderOptions['reasoningEffort'];
    verbosity?: CodexProviderOptions['verbosity'];
    serviceTier?: CodexProviderOptions['serviceTier'];
    webSearch?: CodexProviderOptions['webSearch'];
    webSearchContextSize?: CodexProviderOptions['webSearchContextSize'];
    openCodeExecutablePath?: string;
    openCodeAgent?: string;
    openCodeVariant?: string;
    geminiExecutablePath?: string;
    claudeExecutablePath?: string;
    claudeAgent?: string;
    cursorExecutablePath?: string;
    cursorMode?: string;
}

export interface CodexProviderDetectedProvider {
    runtime: CodexProviderRuntime;
    modelProvider: string;
    label: string;
    executablePath: string;
    available: boolean;
    cliAvailable?: boolean;
    configured?: boolean;
    version?: string;
    message?: string;
    defaultModel?: string;
}

export interface CodexProviderCapabilityStatus {
    webSearch?: boolean;
    imageGeneration?: boolean;
    mcp?: boolean;
    applyPatch?: boolean;
    shellExecution?: boolean;
    raw?: unknown;
}

export interface CodexProviderFileUpdateChange {
    path: string;
    kind?: string;
    diff?: string;
}

export type CodexProviderInputItem =
    { type: 'text', text: string, text_elements?: unknown[] } |
    { type: 'image', url: string } |
    { type: 'localImage', path: string } |
    { type: 'skill', name: string, path: string } |
    { type: 'mention', name: string, path: string };

export interface CodexProviderOptions {
    cwd?: string;
    model?: string;
    approvalPolicy?: 'untrusted' | 'on-failure' | 'on-request' | 'never';
    sandboxMode?: 'read-only' | 'workspace-write' | 'danger-full-access';
    reasoningEffort?: 'low' | 'medium' | 'high' | 'xhigh';
    verbosity?: 'low' | 'medium' | 'high';
    serviceTier?: 'fast' | 'flex';
    webSearch?: 'disabled' | 'cached' | 'live';
    webSearchContextSize?: 'low' | 'medium' | 'high';
    collaborationMode?: 'default' | 'plan';
}

export type CodexProviderStreamMessage =
    CodexProviderNotificationMessage |
    CodexProviderApprovalRequestMessage |
    CodexProviderUserInputRequestMessage |
    CodexProviderLoginEventMessage;

export interface CodexProviderNotificationMessage {
    type: 'notification';
    method: string;
    params?: unknown;
}

export interface CodexProviderLoginEventMessage {
    type: 'login-event';
    method: string;
    params?: unknown;
}

export interface CodexProviderApprovalRequestMessage {
    type: 'approval-request';
    requestId: string;
    method: string;
    approvalKind?: 'command' | 'file-change' | 'permissions';
    title: string;
    command?: string;
    changes?: CodexProviderFileUpdateChange[];
    reason?: string;
    workingDirectory?: string;
    permissions?: unknown;
    grantRoot?: string;
    options: CodexProviderQuestionOption[];
}

export interface CodexProviderApprovalResponseMessage {
    type: 'approval-response';
    requestId: string;
    decision: string | object;
}

export interface CodexProviderUserInputRequestMessage {
    type: 'user-input-request';
    requestId: string;
    title: string;
    questions: CodexProviderUserInputQuestion[];
}

export interface CodexProviderUserInputQuestion {
    id: string;
    header?: string;
    question: string;
    options: CodexProviderQuestionOption[];
    multiSelect?: boolean;
}

export interface CodexProviderQuestionOption {
    text: string;
    value?: string;
    description?: string;
}

export interface CodexProviderUserInputResponseMessage {
    type: 'user-input-response';
    requestId: string;
    answers: Record<string, { answers: string[] }>;
}

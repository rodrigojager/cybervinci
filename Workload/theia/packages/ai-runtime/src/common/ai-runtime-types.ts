// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import {
    CodexProviderCapabilityStatus,
    CodexProviderInputItem,
    CodexProviderModelMetadata,
    CodexProviderNotificationMessage,
    CodexProviderOptions,
    CodexProviderRuntime
} from '@cybervinci/ai-providers/lib/common';

export type CyberVinciAiReasoningPolicy =
    | 'off'
    | 'native'
    | 'virtual'
    | 'auto'
    | 'native_plus_virtual_light';

export type CyberVinciAiReasoningEffort = 'none' | 'low' | 'medium' | 'high' | 'xhigh';
export type CyberVinciAiReasoningVariant = string;

export type CyberVinciAiVirtualReasoningMode =
    | 'off'
    | 'auto'
    | 'fast'
    | 'balanced'
    | 'deep'
    | 'coding'
    | 'research'
    | 'lats';

export type CyberVinciAiOutputMode = 'text' | 'json';

export type CyberVinciAiModelMetadata = CodexProviderModelMetadata;

export interface CyberVinciAiExecutionSelection {
    providerId?: string;
    runtime?: CodexProviderRuntime;
    modelProvider?: string;
    label?: string;
    model?: string;
    reasoningPolicy?: CyberVinciAiReasoningPolicy;
    reasoningEffort?: CyberVinciAiReasoningEffort;
    reasoningVariant?: CyberVinciAiReasoningVariant;
    reasoningVariantOptions?: Record<string, unknown>;
    virtualReasoningMode?: CyberVinciAiVirtualReasoningMode;
    approvalPolicy?: CodexProviderOptions['approvalPolicy'];
    sandboxMode?: CodexProviderOptions['sandboxMode'];
    verbosity?: CodexProviderOptions['verbosity'];
    serviceTier?: CodexProviderOptions['serviceTier'];
    webSearch?: CodexProviderOptions['webSearch'];
    webSearchContextSize?: CodexProviderOptions['webSearchContextSize'];
    collaborationMode?: CodexProviderOptions['collaborationMode'];
    cwd?: string;
    executablePath?: string;
    profile?: string;
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

export interface CyberVinciAiProviderDescriptor {
    id: string;
    runtime: CodexProviderRuntime;
    modelProvider: string;
    label: string;
    available: boolean;
    authenticated?: boolean;
    executablePath?: string;
    defaultModel?: string;
    models?: string[];
    modelMetadata?: CyberVinciAiModelMetadata[];
    capabilities?: CodexProviderCapabilityStatus;
    configurationRequired?: string[];
    message?: string;
    supportsNativeReasoning?: boolean;
    supportsVirtualReasoning?: boolean;
}

export interface CyberVinciAiProviderListRequest {
    workspacePath?: string;
    includeUnavailable?: boolean;
    model?: string;
    runtime?: CodexProviderRuntime;
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

export interface CyberVinciAiContextPolicy {
    mode?: 'none' | 'memory' | 'memory-if-available';
    queries?: string[];
    maxItems?: number;
    tokenBudget?: number;
    sourceKinds?: string[];
    sessionId?: string;
    taskId?: string;
}

export interface CyberVinciAiContextReport {
    requested: boolean;
    used: boolean;
    source: 'none' | 'memory';
    estimatedTokens: number;
    omittedCount?: number;
    suggestions: CyberVinciAiContextSuggestion[];
    citations: CyberVinciAiContextCitation[];
    message?: string;
}

export interface CyberVinciAiContextSuggestion {
    id: string;
    title: string;
    reason: string;
    sourceKind: string;
    score: number;
    estimatedTokens: number;
    uri?: string;
}

export interface CyberVinciAiContextCitation {
    resultId: string;
    sourceKind: string;
    title: string;
    uri?: string;
}

export interface CyberVinciAiOutputContract {
    mode: CyberVinciAiOutputMode;
    schemaName?: string;
    schema?: Record<string, unknown>;
    instructions?: string;
}

export interface CyberVinciAiEffectPolicy {
    previewOnly?: boolean;
    workspaceWrites?: 'forbidden' | 'allow-with-approval' | 'allowed';
    shellExecution?: 'forbidden' | 'allow-with-approval' | 'allowed';
    requireUserConfirmation?: boolean;
}

export interface CyberVinciAiTaskRequest<TInput = unknown> {
    taskId?: string;
    surfaceId: string;
    action: string;
    workspacePath?: string;
    sessionId?: string;
    userPrompt: string;
    systemPrompt?: string;
    input?: TInput;
    inputItems?: CodexProviderInputItem[];
    context?: CyberVinciAiContextPolicy;
    output?: CyberVinciAiOutputContract;
    effectPolicy?: CyberVinciAiEffectPolicy;
    execution?: CyberVinciAiExecutionSelection;
}

export interface CyberVinciAiTaskResult<TStructured = unknown> {
    taskId?: string;
    surfaceId: string;
    action: string;
    text: string;
    structured?: TStructured;
    provider: CyberVinciAiProviderDescriptor;
    execution: CyberVinciAiExecutionSelection;
    context: CyberVinciAiContextReport;
    notifications: CodexProviderNotificationMessage[];
    diagnostics: string[];
    usage?: CyberVinciAiUsageReport;
}

export interface CyberVinciAiUsageReport {
    inputTokens?: number;
    outputTokens?: number;
    cachedInputTokens?: number;
    cacheCreationInputTokens?: number;
    cacheReadInputTokens?: number;
    totalTokens?: number;
    costUsd?: number;
    source: 'provider-notification';
    raw?: unknown[];
}

export type CyberVinciAiTaskStreamEvent<TStructured = unknown> =
    | CyberVinciAiTaskStreamTextDelta
    | CyberVinciAiTaskStreamReasoningDelta
    | CyberVinciAiTaskStreamNotification
    | CyberVinciAiTaskStreamComplete<TStructured>
    | CyberVinciAiTaskStreamError;

export interface CyberVinciAiTaskStreamTextDelta {
    readonly type: 'text-delta';
    readonly text: string;
}

export interface CyberVinciAiTaskStreamReasoningDelta {
    readonly type: 'reasoning-delta';
    readonly text: string;
}

export interface CyberVinciAiTaskStreamNotification {
    readonly type: 'notification';
    readonly notification: CodexProviderNotificationMessage;
}

export interface CyberVinciAiTaskStreamComplete<TStructured = unknown> {
    readonly type: 'complete';
    readonly text: string;
    readonly structured?: TStructured;
    readonly notifications: CodexProviderNotificationMessage[];
    readonly diagnostics: string[];
}

export interface CyberVinciAiTaskStreamError {
    readonly type: 'error';
    readonly message: string;
}

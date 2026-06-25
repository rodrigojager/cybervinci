"use strict";
// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************
Object.defineProperty(exports, "__esModule", { value: true });
exports.CyberVinciAiRuntimeFrontendService = exports.CyberVinciAiRuntimeBackendService = void 0;
const tslib_1 = require("tslib");
const ai_providers_runtime_provider_1 = require("@cybervinci/ai-providers/lib/browser/ai-providers-runtime-provider");
const ai_providers_preferences_1 = require("@cybervinci/ai-providers/lib/common/ai-providers-preferences");
const core_1 = require("@theia/core");
const inversify_1 = require("@theia/core/shared/inversify");
const common_1 = require("../common");
exports.CyberVinciAiRuntimeBackendService = Symbol('CyberVinciAiRuntimeBackendService');
let CyberVinciAiRuntimeFrontendService = class CyberVinciAiRuntimeFrontendService {
    async listProviders(request = {}) {
        if (!this.aiRuntimeService) {
            throw new Error('CyberVinci AI Runtime service is not available.');
        }
        return this.aiRuntimeService.listProviders(this.withProviderPreferences(request));
    }
    async getDefaultExecution(request = {}) {
        if (!this.aiRuntimeService) {
            return this.defaultExecutionFromPreferences();
        }
        return this.aiRuntimeService.getDefaultExecution(this.withProviderPreferences(request));
    }
    async runTask(request) {
        if (!this.aiRuntimeService) {
            throw new Error('CyberVinci AI Runtime service is not available.');
        }
        return this.aiRuntimeService.runTask(this.withTaskProviderPreferences(request));
    }
    async *runTaskStream(request, cancellationToken) {
        if (!this.providerRuntime) {
            throw new Error('CyberVinci AI Providers streaming service is not available.');
        }
        const execution = await this.resolveExecution(request.execution, request.workspacePath);
        const diagnostics = [];
        this.appendReasoningDiagnostics(execution, diagnostics);
        const prompt = this.buildPrompt(request, undefined, execution);
        const stream = await this.providerRuntime.send(this.toProviderRequest(request, execution, prompt), cancellationToken);
        const notifications = [];
        let text = '';
        let receivedAgentDelta = false;
        try {
            for await (const message of stream) {
                if (message.type === 'approval-request') {
                    this.providerRuntime.sendApprovalResponse({
                        type: 'approval-response',
                        requestId: message.requestId,
                        decision: message.approvalKind === 'file-change' ? 'decline' : 'cancel'
                    });
                    continue;
                }
                if (message.type === 'user-input-request') {
                    this.providerRuntime.sendUserInputResponse({
                        type: 'user-input-response',
                        requestId: message.requestId,
                        answers: {}
                    });
                    continue;
                }
                if (message.type !== 'notification') {
                    continue;
                }
                notifications.push(message);
                yield { type: 'notification', notification: message };
                const reasoningDelta = this.notificationToReasoningDelta(message);
                if (reasoningDelta) {
                    yield { type: 'reasoning-delta', text: reasoningDelta };
                }
                const textDelta = this.notificationToTextDelta(message, receivedAgentDelta);
                if (textDelta) {
                    receivedAgentDelta = true;
                    text += textDelta;
                    yield { type: 'text-delta', text: textDelta };
                }
                const errorMessage = this.notificationToError(message);
                if (errorMessage) {
                    diagnostics.push(errorMessage);
                    yield { type: 'error', message: errorMessage };
                }
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            yield { type: 'error', message };
            throw error;
        }
        let structured;
        if (request.output?.mode === 'json' && text.trim()) {
            try {
                structured = (0, common_1.parseCyberVinciAiJson)(text);
            }
            catch (error) {
                diagnostics.push(`Could not parse streamed AI Runtime JSON output: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        yield {
            type: 'complete',
            text,
            structured,
            notifications,
            diagnostics
        };
    }
    async resolveExecution(selection, workspacePath) {
        const parsed = selection?.providerId ? this.parseProviderId(selection.providerId) : undefined;
        const withParsed = {
            ...this.providerPreferenceSelection(),
            ...selection,
            runtime: selection?.runtime ?? parsed?.runtime,
            modelProvider: selection?.modelProvider ?? parsed?.modelProvider
        };
        if (withParsed.runtime && withParsed.modelProvider) {
            return {
                reasoningPolicy: 'auto',
                reasoningEffort: 'medium',
                ...withParsed,
                providerId: this.providerId(withParsed.runtime, withParsed.modelProvider)
            };
        }
        if (this.aiRuntimeService) {
            return {
                ...(await this.aiRuntimeService.getDefaultExecution({ workspacePath, includeUnavailable: true })),
                ...withParsed
            };
        }
        return {
            providerId: this.providerId('codex-app-server', 'codex'),
            runtime: 'codex-app-server',
            modelProvider: 'codex',
            label: 'Codex CLI',
            reasoningPolicy: 'auto',
            reasoningEffort: 'medium',
            ...withParsed
        };
    }
    withProviderPreferences(request = {}) {
        const preferences = this.providerPreferenceSelection();
        return {
            ...request,
            model: request.model ?? preferences.model,
            runtime: request.runtime ?? preferences.runtime,
            modelProvider: request.modelProvider ?? preferences.modelProvider,
            openRouterApiKey: request.openRouterApiKey ?? preferences.openRouterApiKey,
            openCodeApiKey: request.openCodeApiKey ?? preferences.openCodeApiKey,
            openCodeExecutablePath: request.openCodeExecutablePath ?? preferences.openCodeExecutablePath,
            openCodeAgent: request.openCodeAgent ?? preferences.openCodeAgent,
            openCodeVariant: request.openCodeVariant ?? preferences.openCodeVariant,
            geminiExecutablePath: request.geminiExecutablePath ?? preferences.geminiExecutablePath,
            claudeExecutablePath: request.claudeExecutablePath ?? preferences.claudeExecutablePath,
            claudeAgent: request.claudeAgent ?? preferences.claudeAgent,
            cursorExecutablePath: request.cursorExecutablePath ?? preferences.cursorExecutablePath,
            cursorMode: request.cursorMode ?? preferences.cursorMode
        };
    }
    withTaskProviderPreferences(request) {
        return {
            ...request,
            execution: {
                ...this.providerPreferenceSelection(),
                ...request.execution
            }
        };
    }
    defaultExecutionFromPreferences() {
        const preferences = this.providerPreferenceSelection();
        return {
            providerId: this.providerId(preferences.runtime ?? 'codex-app-server', preferences.modelProvider ?? 'codex'),
            label: preferences.modelProvider ?? 'Codex CLI',
            reasoningPolicy: 'auto',
            reasoningEffort: 'medium',
            ...preferences
        };
    }
    providerPreferenceSelection() {
        const runtime = this.preferenceService.get(ai_providers_preferences_1.CODEX_CLI_RUNTIME_PREF, 'codex-app-server');
        const modelProvider = this.preferenceService.get(ai_providers_preferences_1.CODEX_CLI_MODEL_PROVIDER_PREF, 'codex');
        return {
            providerId: this.providerId(runtime, modelProvider),
            runtime,
            modelProvider,
            model: this.preferenceService.get(ai_providers_preferences_1.CODEX_CLI_MODEL_PREF, undefined),
            reasoningEffort: this.preferenceService.get(ai_providers_preferences_1.CODEX_CLI_REASONING_EFFORT_PREF, undefined),
            reasoningVariant: this.preferenceService.get(ai_providers_preferences_1.CODEX_CLI_REASONING_VARIANT_PREF, undefined),
            reasoningVariantOptions: this.preferenceService.get(ai_providers_preferences_1.CODEX_CLI_REASONING_VARIANT_OPTIONS_PREF, undefined),
            serviceTier: this.preferenceService.get(ai_providers_preferences_1.CODEX_CLI_SERVICE_TIER_PREF, undefined),
            executablePath: this.preferenceService.get(ai_providers_preferences_1.CODEX_CLI_EXECUTABLE_PATH_PREF, undefined),
            profile: this.preferenceService.get(ai_providers_preferences_1.CODEX_CLI_PROFILE_PREF, undefined),
            openRouterApiKey: this.preferenceService.get(ai_providers_preferences_1.CODEX_CLI_OPENROUTER_API_KEY_PREF, undefined),
            openCodeApiKey: this.preferenceService.get(ai_providers_preferences_1.CODEX_CLI_OPENCODE_API_KEY_PREF, undefined),
            openCodeExecutablePath: this.preferenceService.get(ai_providers_preferences_1.CODEX_CLI_OPENCODE_EXECUTABLE_PATH_PREF, undefined),
            openCodeAgent: this.preferenceService.get(ai_providers_preferences_1.CODEX_CLI_OPENCODE_AGENT_PREF, undefined),
            openCodeVariant: this.preferenceService.get(ai_providers_preferences_1.CODEX_CLI_OPENCODE_VARIANT_PREF, undefined),
            geminiExecutablePath: this.preferenceService.get(ai_providers_preferences_1.CODEX_CLI_GEMINI_EXECUTABLE_PATH_PREF, undefined),
            claudeExecutablePath: this.preferenceService.get(ai_providers_preferences_1.CODEX_CLI_CLAUDE_EXECUTABLE_PATH_PREF, undefined),
            claudeAgent: this.preferenceService.get(ai_providers_preferences_1.CODEX_CLI_CLAUDE_AGENT_PREF, undefined),
            cursorExecutablePath: this.preferenceService.get(ai_providers_preferences_1.CODEX_CLI_CURSOR_EXECUTABLE_PATH_PREF, undefined),
            cursorMode: this.preferenceService.get(ai_providers_preferences_1.CODEX_CLI_CURSOR_MODE_PREF, undefined)
        };
    }
    toProviderRequest(request, execution, prompt) {
        const previewOnly = request.effectPolicy?.previewOnly ?? request.effectPolicy?.workspaceWrites !== 'allowed';
        const options = {
            cwd: execution.cwd ?? request.workspacePath,
            model: execution.model,
            approvalPolicy: execution.approvalPolicy ?? (previewOnly ? 'never' : 'on-request'),
            sandboxMode: execution.sandboxMode ?? (previewOnly ? 'read-only' : 'workspace-write'),
            reasoningEffort: this.toProviderReasoningEffort(execution),
            reasoningVariant: this.toProviderReasoningVariant(execution),
            reasoningVariantOptions: this.toProviderReasoningVariantOptions(execution),
            verbosity: execution.verbosity,
            serviceTier: execution.serviceTier,
            webSearch: execution.webSearch ?? 'disabled',
            webSearchContextSize: execution.webSearchContextSize,
            collaborationMode: execution.collaborationMode
        };
        return {
            prompt,
            sessionId: request.sessionId,
            runtime: execution.runtime,
            executablePath: execution.executablePath,
            profile: execution.profile,
            modelProvider: execution.modelProvider,
            openRouterApiKey: execution.openRouterApiKey,
            openCodeApiKey: execution.openCodeApiKey,
            openCodeExecutablePath: execution.openCodeExecutablePath,
            openCodeAgent: execution.openCodeAgent,
            openCodeVariant: execution.openCodeVariant,
            geminiExecutablePath: execution.geminiExecutablePath,
            claudeExecutablePath: execution.claudeExecutablePath,
            claudeAgent: execution.claudeAgent,
            cursorExecutablePath: execution.cursorExecutablePath,
            cursorMode: execution.cursorMode,
            options
        };
    }
    buildPrompt(request, contextSection, execution) {
        const sections = [
            request.systemPrompt,
            'CyberVinci AI Runtime task envelope:',
            JSON.stringify({
                surfaceId: request.surfaceId,
                action: request.action,
                taskId: request.taskId,
                effectPolicy: request.effectPolicy,
                execution: {
                    providerId: execution.providerId,
                    runtime: execution.runtime,
                    modelProvider: execution.modelProvider,
                    model: execution.model,
                    reasoningPolicy: execution.reasoningPolicy,
                    reasoningEffort: execution.reasoningEffort,
                    reasoningVariant: execution.reasoningVariant,
                    virtualReasoningMode: execution.virtualReasoningMode
                }
            }, undefined, 2),
            contextSection,
            request.input === undefined ? undefined : [
                'Structured task input:',
                JSON.stringify(request.input, undefined, 2)
            ].join('\n'),
            [
                'User request:',
                request.userPrompt
            ].join('\n'),
            this.outputInstructions(request)
        ];
        return sections.filter(Boolean).join('\n\n');
    }
    outputInstructions(request) {
        if (!request.output) {
            return undefined;
        }
        const instructions = [
            request.output.instructions,
            request.output.mode === 'json' ? 'Return only one JSON value. Do not wrap it in Markdown fences.' : undefined,
            request.output.schemaName ? `Schema name: ${request.output.schemaName}` : undefined,
            request.output.schema ? `JSON schema:\n${JSON.stringify(request.output.schema, undefined, 2)}` : undefined
        ];
        return instructions.filter(Boolean).join('\n\n');
    }
    appendReasoningDiagnostics(execution, diagnostics) {
        if (execution.reasoningPolicy === 'virtual' || execution.reasoningPolicy === 'native_plus_virtual_light') {
            diagnostics.push('Virtual reasoning policy requested; runtime forwards the policy in prompt context and uses native provider execution for this request.');
        }
    }
    toProviderReasoningEffort(execution) {
        if (execution.reasoningPolicy === 'off' || execution.reasoningEffort === 'none') {
            return undefined;
        }
        return execution.reasoningEffort;
    }
    toProviderReasoningVariant(execution) {
        if (execution.reasoningPolicy === 'off' || execution.reasoningVariant === 'default' || execution.reasoningVariant === 'none') {
            return undefined;
        }
        return execution.reasoningVariant?.trim() || undefined;
    }
    toProviderReasoningVariantOptions(execution) {
        if (execution.reasoningPolicy === 'off' || execution.reasoningVariant === 'default' || execution.reasoningVariant === 'none') {
            return undefined;
        }
        return execution.reasoningVariantOptions && Object.keys(execution.reasoningVariantOptions).length
            ? execution.reasoningVariantOptions
            : undefined;
    }
    notificationToTextDelta(message, receivedAgentDelta) {
        const { method, params } = message;
        if (method === 'item/agentMessage/delta' || method === 'item/agent_message/delta' || method === 'agent_message_delta' || method === 'response/output_text/delta') {
            return this.readFirstString(params, ['delta', 'text', 'content', 'message']);
        }
        if (method === 'item/completed' && !receivedAgentDelta) {
            const item = this.readObject(params, 'item');
            const type = this.readString(item, 'type');
            if (type === 'agent_message' || type === 'agentMessage') {
                return this.readFirstString(item, ['text', 'message', 'content']);
            }
        }
        if ((method === 'turn/completed' || method === 'response/completed') && !receivedAgentDelta) {
            return this.readFirstString(params, ['last_agent_message', 'text', 'message', 'content', 'output_text']);
        }
        if (method === 'task_complete' && !receivedAgentDelta) {
            return this.readString(params, 'last_agent_message');
        }
        return '';
    }
    notificationToReasoningDelta(message) {
        if (message.method === 'item/reasoning/textDelta' || message.method === 'item/reasoning/summaryTextDelta' || message.method === 'item/plan/delta') {
            return this.readFirstString(message.params, ['delta', 'text', 'content', 'message']);
        }
        return '';
    }
    notificationToError(message) {
        if (message.method === 'turn/failed' || message.method === 'error') {
            return this.toDisplayText(message.params);
        }
        return '';
    }
    readFirstString(value, keys) {
        for (const key of keys) {
            const text = this.readString(value, key);
            if (text) {
                return text;
            }
        }
        return '';
    }
    readString(value, key) {
        const object = this.readObjectLike(value);
        const candidate = object?.[key];
        return typeof candidate === 'string' ? candidate : '';
    }
    readObject(value, key) {
        const candidate = this.readObjectLike(value)?.[key];
        return this.readObjectLike(candidate) ?? {};
    }
    readObjectLike(value) {
        return value && typeof value === 'object' && !Array.isArray(value)
            ? value
            : undefined;
    }
    toDisplayText(value) {
        if (typeof value === 'string') {
            return value;
        }
        const message = this.readFirstString(value, ['message', 'error', 'reason']);
        if (message) {
            return message;
        }
        try {
            return JSON.stringify(value);
        }
        catch {
            return '';
        }
    }
    providerId(runtime, modelProvider) {
        return `${runtime}:${modelProvider}`;
    }
    parseProviderId(providerId) {
        const separator = providerId.indexOf(':');
        if (separator <= 0) {
            return undefined;
        }
        return {
            runtime: providerId.slice(0, separator),
            modelProvider: providerId.slice(separator + 1)
        };
    }
};
exports.CyberVinciAiRuntimeFrontendService = CyberVinciAiRuntimeFrontendService;
tslib_1.__decorate([
    (0, inversify_1.inject)(exports.CyberVinciAiRuntimeBackendService),
    (0, inversify_1.optional)(),
    tslib_1.__metadata("design:type", Object)
], CyberVinciAiRuntimeFrontendService.prototype, "aiRuntimeService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(ai_providers_runtime_provider_1.CodexProviderRuntimeProvider),
    (0, inversify_1.optional)(),
    tslib_1.__metadata("design:type", Object)
], CyberVinciAiRuntimeFrontendService.prototype, "providerRuntime", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.PreferenceService),
    tslib_1.__metadata("design:type", Object)
], CyberVinciAiRuntimeFrontendService.prototype, "preferenceService", void 0);
exports.CyberVinciAiRuntimeFrontendService = CyberVinciAiRuntimeFrontendService = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], CyberVinciAiRuntimeFrontendService);
//# sourceMappingURL=ai-runtime-frontend-service.js.map
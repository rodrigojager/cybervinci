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
exports.CyberVinciAiRuntimeServiceImpl = void 0;
const tslib_1 = require("tslib");
const common_1 = require("@cybervinci/ai-providers/lib/common");
const inversify_1 = require("@theia/core/shared/inversify");
const common_2 = require("../common");
const ai_context_broker_1 = require("./ai-context-broker");
// Fallback only; live Codex app-server model/list results take precedence.
const CODEX_MODEL_PRESETS = ['gpt-5.5', 'gpt-5.4', 'gpt-5.4-mini', 'gpt-5.3-codex-spark'];
const DEFAULT_PROVIDER_PRESETS = [
    { runtime: 'codex-app-server', modelProvider: 'codex', label: 'Codex CLI', defaultModel: 'gpt-5.5', models: CODEX_MODEL_PRESETS },
    { runtime: 'direct-http', modelProvider: 'openrouter', label: 'OpenRouter', defaultModel: 'openrouter/openai/gpt-5.5' },
    { runtime: 'direct-http', modelProvider: 'opencode-go', label: 'OpenCode Go', defaultModel: 'opencode-go/deepseek-v4-flash' },
    { runtime: 'direct-http', modelProvider: 'opencode', label: 'OpenCode Zen', defaultModel: 'opencode/gpt-5.5' },
    { runtime: 'gemini-cli', modelProvider: 'gemini', label: 'Gemini CLI' },
    { runtime: 'claude-code-cli', modelProvider: 'claude-code', label: 'Claude Code', defaultModel: 'sonnet' },
    { runtime: 'cursor-cli', modelProvider: 'cursor', label: 'Cursor CLI' }
];
let CyberVinciAiRuntimeServiceImpl = class CyberVinciAiRuntimeServiceImpl {
    setClient(client) {
        this.client = client;
    }
    dispose() {
        this.client = undefined;
    }
    async listProviders(request = {}) {
        const presets = new Map(DEFAULT_PROVIDER_PRESETS.map(provider => [
            this.providerId(provider.runtime, provider.modelProvider),
            this.toDescriptor({
                runtime: provider.runtime,
                modelProvider: provider.modelProvider,
                label: provider.label,
                defaultModel: provider.defaultModel,
                available: false,
                message: this.codexProviderService ? undefined : 'CyberVinci AI Providers service is not available.'
            })
        ]));
        if (!this.codexProviderService) {
            return this.filterProviders(Array.from(presets.values()), request.includeUnavailable);
        }
        try {
            const status = await this.codexProviderService.getStatus({
                cwd: request.workspacePath,
                model: request.model,
                runtime: request.runtime,
                modelProvider: request.modelProvider,
                openRouterApiKey: request.openRouterApiKey,
                openCodeApiKey: request.openCodeApiKey,
                openCodeExecutablePath: request.openCodeExecutablePath,
                openCodeAgent: request.openCodeAgent,
                openCodeVariant: request.openCodeVariant,
                geminiExecutablePath: request.geminiExecutablePath,
                claudeExecutablePath: request.claudeExecutablePath,
                claudeAgent: request.claudeAgent,
                cursorExecutablePath: request.cursorExecutablePath,
                cursorMode: request.cursorMode
            });
            for (const detected of status.detectedProviders ?? []) {
                const descriptor = this.detectedProviderToDescriptor(detected, status);
                presets.set(descriptor.id, descriptor);
            }
            if (status.runtime && status.modelProvider) {
                const descriptor = this.statusToDescriptor(status);
                presets.set(descriptor.id, descriptor);
            }
        }
        catch (reason) {
            const message = String(reason?.message ?? reason);
            for (const [key, descriptor] of presets) {
                presets.set(key, { ...descriptor, message });
            }
        }
        return this.filterProviders(Array.from(presets.values()), request.includeUnavailable);
    }
    async getDefaultExecution(request = {}) {
        const providers = await this.listProviders({ ...request, includeUnavailable: true });
        const provider = providers.find(candidate => candidate.available) ?? providers[0];
        return this.providerToExecution(provider);
    }
    async runTask(request) {
        if (!this.codexProviderService) {
            throw new Error('CyberVinci AI Providers service is not available.');
        }
        const preparedContext = await this.contextBroker.prepare(request);
        const execution = await this.resolveExecution(request.execution, request.workspacePath);
        const provider = this.toDescriptor({
            runtime: execution.runtime ?? 'codex-app-server',
            modelProvider: execution.modelProvider ?? 'codex',
            label: execution.label ?? execution.modelProvider ?? 'Codex CLI',
            defaultModel: execution.model,
            available: true
        });
        const diagnostics = [];
        this.appendReasoningDiagnostics(execution, diagnostics);
        const prompt = this.buildPrompt(request, preparedContext.promptSection, execution);
        const result = await this.codexProviderService.sendAndCollect(this.toCodexRequest(request, execution, prompt));
        let structured;
        if (request.output?.mode === 'json') {
            structured = (0, common_2.parseCyberVinciAiJson)(result.text);
        }
        return {
            taskId: request.taskId,
            surfaceId: request.surfaceId,
            action: request.action,
            text: result.text,
            structured,
            provider,
            execution,
            context: preparedContext.report,
            notifications: result.notifications,
            usage: this.extractUsageReport(result.notifications),
            diagnostics
        };
    }
    extractUsageReport(notifications) {
        const raw = [];
        const usage = {
            source: 'provider-notification'
        };
        for (const notification of notifications) {
            const candidates = this.usageCandidates(notification.params);
            for (const candidate of candidates) {
                const record = this.asRecord(candidate);
                if (!record) {
                    continue;
                }
                const nestedUsage = this.asRecord(record.usage);
                const source = nestedUsage ?? record;
                const inputTokens = this.firstNumber(source, ['input_tokens', 'prompt_tokens', 'inputTokens', 'promptTokens']);
                const outputTokens = this.firstNumber(source, ['output_tokens', 'completion_tokens', 'outputTokens', 'completionTokens']);
                const cachedInputTokens = this.firstNumber(source, ['cached_input_tokens', 'cachedInputTokens']);
                const cacheCreationInputTokens = this.firstNumber(source, ['cache_creation_input_tokens', 'cacheCreationInputTokens']);
                const cacheReadInputTokens = this.firstNumber(source, ['cache_read_input_tokens', 'cacheReadInputTokens']);
                const totalTokens = this.firstNumber(source, ['total_tokens', 'totalTokens']);
                const costUsd = this.firstNumber(record, ['total_cost_usd', 'cost_usd', 'totalCostUsd', 'costUsd'])
                    ?? this.firstNumber(source, ['total_cost_usd', 'cost_usd', 'totalCostUsd', 'costUsd']);
                if ([inputTokens, outputTokens, cachedInputTokens, cacheCreationInputTokens, cacheReadInputTokens, totalTokens, costUsd].every(value => value === undefined)) {
                    continue;
                }
                usage.inputTokens = this.sumOptional(usage.inputTokens, inputTokens);
                usage.outputTokens = this.sumOptional(usage.outputTokens, outputTokens);
                usage.cachedInputTokens = this.sumOptional(usage.cachedInputTokens, cachedInputTokens);
                usage.cacheCreationInputTokens = this.sumOptional(usage.cacheCreationInputTokens, cacheCreationInputTokens);
                usage.cacheReadInputTokens = this.sumOptional(usage.cacheReadInputTokens, cacheReadInputTokens);
                usage.totalTokens = this.sumOptional(usage.totalTokens, totalTokens);
                usage.costUsd = this.sumOptional(usage.costUsd, costUsd);
                raw.push(candidate);
            }
        }
        if (usage.inputTokens === undefined &&
            usage.outputTokens === undefined &&
            usage.cachedInputTokens === undefined &&
            usage.cacheCreationInputTokens === undefined &&
            usage.cacheReadInputTokens === undefined &&
            usage.totalTokens === undefined &&
            usage.costUsd === undefined) {
            return undefined;
        }
        if (usage.totalTokens === undefined) {
            const total = (usage.inputTokens ?? 0)
                + (usage.outputTokens ?? 0)
                + (usage.cachedInputTokens ?? 0)
                + (usage.cacheCreationInputTokens ?? 0)
                + (usage.cacheReadInputTokens ?? 0);
            usage.totalTokens = total > 0 ? total : undefined;
        }
        usage.raw = raw.slice(0, 8);
        return usage;
    }
    usageCandidates(value) {
        const record = this.asRecord(value);
        if (!record) {
            return [];
        }
        const candidates = [record];
        for (const key of ['result', 'message', 'response', 'turn', 'item']) {
            if (record[key] !== undefined) {
                candidates.push(record[key]);
            }
        }
        return candidates;
    }
    firstNumber(record, keys) {
        for (const key of keys) {
            const value = this.toFiniteNumber(record[key]);
            if (value !== undefined) {
                return value;
            }
        }
        return undefined;
    }
    sumOptional(left, right) {
        return right === undefined ? left : (left ?? 0) + right;
    }
    toFiniteNumber(value) {
        if (typeof value === 'number' && Number.isFinite(value)) {
            return value;
        }
        if (typeof value === 'string' && value.trim()) {
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : undefined;
        }
        return undefined;
    }
    asRecord(value) {
        return value && typeof value === 'object' && !Array.isArray(value)
            ? value
            : undefined;
    }
    async resolveExecution(selection, workspacePath) {
        const parsed = selection?.providerId ? this.parseProviderId(selection.providerId) : undefined;
        const withParsed = {
            ...selection,
            runtime: selection?.runtime ?? parsed?.runtime,
            modelProvider: selection?.modelProvider ?? parsed?.modelProvider
        };
        if (withParsed.runtime && withParsed.modelProvider) {
            const providerId = this.providerId(withParsed.runtime, withParsed.modelProvider);
            const provider = await this.findExecutionProvider(providerId, workspacePath, withParsed);
            if (provider) {
                this.assertExecutionProviderAvailable(provider);
            }
            return {
                reasoningPolicy: 'auto',
                reasoningEffort: 'medium',
                ...withParsed,
                providerId,
                runtime: provider?.runtime ?? withParsed.runtime,
                modelProvider: provider?.modelProvider ?? withParsed.modelProvider,
                label: provider?.label ?? withParsed.label,
                executablePath: withParsed.executablePath ?? provider?.executablePath,
                model: this.resolveExecutionModel(provider, withParsed.model)
            };
        }
        return {
            ...(await this.getDefaultExecution({ workspacePath, includeUnavailable: true })),
            ...withParsed
        };
    }
    async findExecutionProvider(providerId, workspacePath, selection) {
        const providers = await this.listProviders({
            workspacePath,
            includeUnavailable: true,
            model: selection.model,
            runtime: selection.runtime,
            modelProvider: selection.modelProvider,
            openRouterApiKey: selection.openRouterApiKey,
            openCodeApiKey: selection.openCodeApiKey,
            openCodeExecutablePath: selection.openCodeExecutablePath,
            openCodeAgent: selection.openCodeAgent,
            openCodeVariant: selection.openCodeVariant,
            geminiExecutablePath: selection.geminiExecutablePath,
            claudeExecutablePath: selection.claudeExecutablePath,
            claudeAgent: selection.claudeAgent,
            cursorExecutablePath: selection.cursorExecutablePath,
            cursorMode: selection.cursorMode
        });
        return providers.find(provider => provider.id === providerId);
    }
    assertExecutionProviderAvailable(provider) {
        if (provider.available && !provider.configurationRequired?.length) {
            return;
        }
        const requirements = provider.configurationRequired?.length
            ? ` Configuration required: ${provider.configurationRequired.join(', ')}.`
            : '';
        const message = provider.message ? ` ${provider.message}` : '';
        throw new Error(`AI provider '${provider.label}' is not available.${requirements}${message}`.trim());
    }
    resolveExecutionModel(provider, selectedModel) {
        const selected = selectedModel?.trim();
        if (!provider) {
            return selected || undefined;
        }
        const models = this.mergeModels(provider.models);
        if (!models?.length) {
            return selected || provider.defaultModel;
        }
        if (selected && models.includes(selected)) {
            return selected;
        }
        const defaultModel = provider.defaultModel?.trim();
        if (defaultModel && models.includes(defaultModel)) {
            return defaultModel;
        }
        return models[0];
    }
    toCodexRequest(request, execution, prompt) {
        const previewOnly = request.effectPolicy?.previewOnly ?? request.effectPolicy?.workspaceWrites !== 'allowed';
        const options = {
            cwd: execution.cwd ?? request.workspacePath,
            model: execution.model,
            approvalPolicy: execution.approvalPolicy ?? (previewOnly ? 'never' : 'on-request'),
            sandboxMode: execution.sandboxMode ?? (previewOnly ? 'read-only' : 'workspace-write'),
            reasoningEffort: this.toCodexReasoningEffort(execution),
            reasoningVariant: this.toCodexReasoningVariant(execution),
            reasoningVariantOptions: this.toCodexReasoningVariantOptions(execution),
            verbosity: execution.verbosity,
            serviceTier: execution.serviceTier,
            webSearch: execution.webSearch ?? 'disabled',
            webSearchContextSize: execution.webSearchContextSize,
            collaborationMode: execution.collaborationMode
        };
        const input = request.inputItems?.length
            ? [{ type: 'text', text: prompt, text_elements: [] }, ...request.inputItems]
            : undefined;
        return {
            prompt,
            input,
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
    toCodexReasoningEffort(execution) {
        if (execution.reasoningPolicy === 'off' || execution.reasoningEffort === 'none') {
            return undefined;
        }
        return execution.reasoningEffort;
    }
    toCodexReasoningVariant(execution) {
        if (execution.reasoningPolicy === 'off' || execution.reasoningVariant === 'default' || execution.reasoningVariant === 'none') {
            return undefined;
        }
        return execution.reasoningVariant?.trim() || undefined;
    }
    toCodexReasoningVariantOptions(execution) {
        if (execution.reasoningPolicy === 'off' || execution.reasoningVariant === 'default' || execution.reasoningVariant === 'none') {
            return undefined;
        }
        return execution.reasoningVariantOptions && Object.keys(execution.reasoningVariantOptions).length
            ? execution.reasoningVariantOptions
            : undefined;
    }
    detectedProviderToDescriptor(provider, status) {
        const sameProvider = provider.runtime === status.runtime && provider.modelProvider === status.modelProvider;
        return this.toDescriptor({
            runtime: provider.runtime,
            modelProvider: provider.modelProvider,
            label: provider.label,
            executablePath: provider.executablePath,
            available: provider.available,
            defaultModel: provider.defaultModel,
            models: sameProvider ? status.models : provider.models ?? (provider.defaultModel ? [provider.defaultModel] : undefined),
            modelMetadata: sameProvider ? status.modelMetadata : provider.modelMetadata,
            capabilities: sameProvider ? status.capabilities : undefined,
            authenticated: sameProvider ? status.authenticated : undefined,
            configurationRequired: sameProvider ? status.configurationRequired : undefined,
            message: provider.message
        });
    }
    statusToDescriptor(status) {
        const runtime = status.runtime ?? 'codex-app-server';
        const modelProvider = status.modelProvider ?? 'codex';
        const preset = this.findPreset(runtime, modelProvider);
        const modelMetadata = new Map((status.modelMetadata ?? []).map(model => [model.id, model]));
        const firstAvailableModel = status.models?.find(model => !modelMetadata.get(model)?.unavailable);
        return this.toDescriptor({
            runtime,
            modelProvider,
            label: this.findPresetLabel(runtime, modelProvider),
            executablePath: status.executablePath,
            available: status.available,
            authenticated: status.authenticated,
            defaultModel: preset?.defaultModel ?? firstAvailableModel ?? status.models?.[0],
            models: status.models,
            modelMetadata: status.modelMetadata,
            capabilities: status.capabilities,
            configurationRequired: status.configurationRequired,
            message: status.message
        });
    }
    toDescriptor(provider) {
        const preset = this.findPreset(provider.runtime, provider.modelProvider);
        const models = this.mergeModels(provider.models, provider.defaultModel ? [provider.defaultModel] : undefined, preset?.models, preset?.defaultModel ? [preset.defaultModel] : undefined);
        const modelMetadata = this.mergeModelMetadata(models, provider.modelMetadata, preset?.modelMetadata);
        return {
            ...provider,
            defaultModel: provider.defaultModel ?? preset?.defaultModel ?? models?.[0],
            models,
            modelMetadata,
            id: this.providerId(provider.runtime, provider.modelProvider),
            supportsNativeReasoning: true,
            supportsVirtualReasoning: true
        };
    }
    providerToExecution(provider) {
        return {
            providerId: provider.id,
            runtime: provider.runtime,
            modelProvider: provider.modelProvider,
            label: provider.label,
            model: provider.defaultModel ?? provider.models?.[0],
            reasoningPolicy: 'auto',
            reasoningEffort: 'medium'
        };
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
    findPresetLabel(runtime, modelProvider) {
        return this.findPreset(runtime, modelProvider)?.label ?? modelProvider;
    }
    findPreset(runtime, modelProvider) {
        return DEFAULT_PROVIDER_PRESETS.find(provider => provider.runtime === runtime && provider.modelProvider === modelProvider);
    }
    mergeModels(...modelSets) {
        const seen = new Set();
        const models = [];
        for (const modelSet of modelSets) {
            for (const model of modelSet ?? []) {
                const trimmed = model.trim();
                if (!trimmed || seen.has(trimmed)) {
                    continue;
                }
                seen.add(trimmed);
                models.push(trimmed);
            }
        }
        return models.length ? models : undefined;
    }
    mergeModelMetadata(models, ...metadataSets) {
        const metadataById = new Map();
        for (const metadataSet of metadataSets) {
            for (const metadata of metadataSet ?? []) {
                const id = metadata.id?.trim();
                if (!id || metadataById.has(id)) {
                    continue;
                }
                metadataById.set(id, metadata);
            }
        }
        if (!models?.length && !metadataById.size) {
            return undefined;
        }
        const ordered = [];
        const seen = new Set();
        for (const model of models ?? []) {
            const id = model.trim();
            if (!id || seen.has(id)) {
                continue;
            }
            seen.add(id);
            ordered.push(metadataById.get(id) ?? { id });
        }
        for (const metadata of metadataById.values()) {
            if (seen.has(metadata.id)) {
                continue;
            }
            seen.add(metadata.id);
            ordered.push(metadata);
        }
        return ordered.length ? ordered : undefined;
    }
    filterProviders(providers, includeUnavailable = false) {
        return providers
            .filter(provider => includeUnavailable || provider.available)
            .sort((left, right) => Number(right.available) - Number(left.available) || left.label.localeCompare(right.label));
    }
};
exports.CyberVinciAiRuntimeServiceImpl = CyberVinciAiRuntimeServiceImpl;
tslib_1.__decorate([
    (0, inversify_1.inject)(common_1.CodexProviderService),
    (0, inversify_1.optional)(),
    tslib_1.__metadata("design:type", Object)
], CyberVinciAiRuntimeServiceImpl.prototype, "codexProviderService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(ai_context_broker_1.CyberVinciAiContextBroker),
    tslib_1.__metadata("design:type", ai_context_broker_1.CyberVinciAiContextBroker)
], CyberVinciAiRuntimeServiceImpl.prototype, "contextBroker", void 0);
exports.CyberVinciAiRuntimeServiceImpl = CyberVinciAiRuntimeServiceImpl = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], CyberVinciAiRuntimeServiceImpl);
//# sourceMappingURL=ai-runtime-service.js.map
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
    CodexProviderBackendRequest,
    CodexProviderBackendStatus,
    CodexProviderDetectedProvider,
    CodexProviderOptions,
    CodexProviderRuntime,
    CodexProviderService
} from '@cybervinci/ai-providers/lib/common';
import { Disposable } from '@theia/core';
import { inject, injectable, optional } from '@theia/core/shared/inversify';
import {
    parseCyberVinciAiJson,
    CyberVinciAiExecutionSelection,
    CyberVinciAiProviderDescriptor,
    CyberVinciAiProviderListRequest,
    CyberVinciAiRuntimeClient,
    CyberVinciAiRuntimeService,
    CyberVinciAiTaskRequest,
    CyberVinciAiTaskResult
} from '../common';
import { CyberVinciAiContextBroker } from './ai-context-broker';

const DEFAULT_PROVIDER_PRESETS: Array<Pick<CyberVinciAiProviderDescriptor, 'runtime' | 'modelProvider' | 'label' | 'defaultModel'>> = [
    { runtime: 'codex-app-server', modelProvider: 'codex', label: 'Codex CLI' },
    { runtime: 'direct-http', modelProvider: 'openrouter', label: 'OpenRouter', defaultModel: 'openrouter/openai/gpt-5' },
    { runtime: 'direct-http', modelProvider: 'opencode-go', label: 'OpenCode Go', defaultModel: 'opencode-go/deepseek-v4-flash' },
    { runtime: 'direct-http', modelProvider: 'opencode', label: 'OpenCode Zen', defaultModel: 'opencode/gpt-5-codex' },
    { runtime: 'gemini-cli', modelProvider: 'gemini', label: 'Gemini CLI' },
    { runtime: 'claude-code-cli', modelProvider: 'claude-code', label: 'Claude Code', defaultModel: 'sonnet' },
    { runtime: 'cursor-cli', modelProvider: 'cursor', label: 'Cursor CLI' }
];

@injectable()
export class CyberVinciAiRuntimeServiceImpl implements CyberVinciAiRuntimeService, Disposable {

    protected client: CyberVinciAiRuntimeClient | undefined;

    @inject(CodexProviderService) @optional()
    protected readonly codexProviderService?: CodexProviderService;

    @inject(CyberVinciAiContextBroker)
    protected readonly contextBroker: CyberVinciAiContextBroker;

    setClient(client: CyberVinciAiRuntimeClient | undefined): void {
        this.client = client;
    }

    dispose(): void {
        this.client = undefined;
    }

    async listProviders(request: CyberVinciAiProviderListRequest = {}): Promise<CyberVinciAiProviderDescriptor[]> {
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
            const status = await this.codexProviderService.getStatus({ cwd: request.workspacePath });
            for (const detected of status.detectedProviders ?? []) {
                const descriptor = this.detectedProviderToDescriptor(detected, status);
                presets.set(descriptor.id, descriptor);
            }
            if (status.runtime && status.modelProvider) {
                const descriptor = this.statusToDescriptor(status);
                presets.set(descriptor.id, descriptor);
            }
        } catch (reason) {
            const message = String((reason as Error)?.message ?? reason);
            for (const [key, descriptor] of presets) {
                presets.set(key, { ...descriptor, message });
            }
        }

        return this.filterProviders(Array.from(presets.values()), request.includeUnavailable);
    }

    async getDefaultExecution(request: CyberVinciAiProviderListRequest = {}): Promise<CyberVinciAiExecutionSelection> {
        const providers = await this.listProviders({ ...request, includeUnavailable: true });
        const provider = providers.find(candidate => candidate.available) ?? providers[0];
        return this.providerToExecution(provider);
    }

    async runTask<TInput = unknown, TStructured = unknown>(request: CyberVinciAiTaskRequest<TInput>): Promise<CyberVinciAiTaskResult<TStructured>> {
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
        const diagnostics: string[] = [];
        this.appendReasoningDiagnostics(execution, diagnostics);

        const prompt = this.buildPrompt(request, preparedContext.promptSection, execution);
        const result = await this.codexProviderService.sendAndCollect(this.toCodexRequest(request, execution, prompt));
        let structured: TStructured | undefined;
        if (request.output?.mode === 'json') {
            structured = parseCyberVinciAiJson(result.text) as TStructured;
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
            diagnostics
        };
    }

    protected async resolveExecution(selection: CyberVinciAiExecutionSelection | undefined, workspacePath: string | undefined): Promise<CyberVinciAiExecutionSelection> {
        const parsed = selection?.providerId ? this.parseProviderId(selection.providerId) : undefined;
        const withParsed: CyberVinciAiExecutionSelection = {
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
        return {
            ...(await this.getDefaultExecution({ workspacePath, includeUnavailable: true })),
            ...withParsed
        };
    }

    protected toCodexRequest(request: CyberVinciAiTaskRequest, execution: CyberVinciAiExecutionSelection, prompt: string): CodexProviderBackendRequest {
        const previewOnly = request.effectPolicy?.previewOnly ?? request.effectPolicy?.workspaceWrites !== 'allowed';
        const options: Partial<CodexProviderOptions> = {
            cwd: execution.cwd ?? request.workspacePath,
            model: execution.model,
            approvalPolicy: execution.approvalPolicy ?? (previewOnly ? 'never' : 'on-request'),
            sandboxMode: execution.sandboxMode ?? (previewOnly ? 'read-only' : 'workspace-write'),
            reasoningEffort: this.toCodexReasoningEffort(execution),
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

    protected buildPrompt(request: CyberVinciAiTaskRequest, contextSection: string | undefined, execution: CyberVinciAiExecutionSelection): string {
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

    protected outputInstructions(request: CyberVinciAiTaskRequest): string | undefined {
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

    protected appendReasoningDiagnostics(execution: CyberVinciAiExecutionSelection, diagnostics: string[]): void {
        if (execution.reasoningPolicy === 'virtual' || execution.reasoningPolicy === 'native_plus_virtual_light') {
            diagnostics.push('Virtual reasoning policy requested; runtime forwards the policy in prompt context and uses native provider execution for this request.');
        }
    }

    protected toCodexReasoningEffort(execution: CyberVinciAiExecutionSelection): CodexProviderOptions['reasoningEffort'] | undefined {
        if (execution.reasoningPolicy === 'off' || execution.reasoningEffort === 'none') {
            return undefined;
        }
        return execution.reasoningEffort as CodexProviderOptions['reasoningEffort'] | undefined;
    }

    protected detectedProviderToDescriptor(provider: CodexProviderDetectedProvider, status: CodexProviderBackendStatus): CyberVinciAiProviderDescriptor {
        const sameProvider = provider.runtime === status.runtime && provider.modelProvider === status.modelProvider;
        return this.toDescriptor({
            runtime: provider.runtime,
            modelProvider: provider.modelProvider,
            label: provider.label,
            executablePath: provider.executablePath,
            available: provider.available,
            defaultModel: provider.defaultModel,
            models: sameProvider ? status.models : provider.defaultModel ? [provider.defaultModel] : undefined,
            capabilities: sameProvider ? status.capabilities : undefined,
            authenticated: sameProvider ? status.authenticated : undefined,
            configurationRequired: sameProvider ? status.configurationRequired : undefined,
            message: provider.message
        });
    }

    protected statusToDescriptor(status: CodexProviderBackendStatus): CyberVinciAiProviderDescriptor {
        return this.toDescriptor({
            runtime: status.runtime ?? 'codex-app-server',
            modelProvider: status.modelProvider ?? 'codex',
            label: this.findPresetLabel(status.runtime ?? 'codex-app-server', status.modelProvider ?? 'codex'),
            executablePath: status.executablePath,
            available: status.available,
            authenticated: status.authenticated,
            defaultModel: status.models?.[0],
            models: status.models,
            capabilities: status.capabilities,
            configurationRequired: status.configurationRequired,
            message: status.message
        });
    }

    protected toDescriptor(provider: Omit<CyberVinciAiProviderDescriptor, 'id' | 'supportsNativeReasoning' | 'supportsVirtualReasoning'>): CyberVinciAiProviderDescriptor {
        return {
            ...provider,
            id: this.providerId(provider.runtime, provider.modelProvider),
            supportsNativeReasoning: true,
            supportsVirtualReasoning: true
        };
    }

    protected providerToExecution(provider: CyberVinciAiProviderDescriptor): CyberVinciAiExecutionSelection {
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

    protected providerId(runtime: CodexProviderRuntime, modelProvider: string): string {
        return `${runtime}:${modelProvider}`;
    }

    protected parseProviderId(providerId: string): { runtime: CodexProviderRuntime; modelProvider: string } | undefined {
        const separator = providerId.indexOf(':');
        if (separator <= 0) {
            return undefined;
        }
        return {
            runtime: providerId.slice(0, separator) as CodexProviderRuntime,
            modelProvider: providerId.slice(separator + 1)
        };
    }

    protected findPresetLabel(runtime: CodexProviderRuntime, modelProvider: string): string {
        return DEFAULT_PROVIDER_PRESETS.find(provider => provider.runtime === runtime && provider.modelProvider === modelProvider)?.label ?? modelProvider;
    }

    protected filterProviders(providers: CyberVinciAiProviderDescriptor[], includeUnavailable = false): CyberVinciAiProviderDescriptor[] {
        return providers
            .filter(provider => includeUnavailable || provider.available)
            .sort((left, right) => Number(right.available) - Number(left.available) || left.label.localeCompare(right.label));
    }
}

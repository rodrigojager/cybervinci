import {
    CodexProviderBackendRequest,
    CodexProviderRuntime,
    CodexProviderService
} from '@cybervinci/ai-providers/lib/common/ai-providers-service';
import { LanguageModel, LanguageModelRegistry, LanguageModelService } from '@theia/ai-core';
import { inject, injectable, optional } from '@theia/core/shared/inversify';
import { FlowWorkflowState, FlowWorkload } from '../common';

export const FlowAgentProviderResolver = Symbol('FlowAgentProviderResolver');

export interface FlowAgentProviderResolver {
    resolveProvider(context: FlowAgentProviderResolutionContext): Promise<FlowLlmProviderConfig>;
}

export interface FlowAgentProviderResolutionContext {
    state: FlowWorkflowState;
    workload: FlowWorkload;
}

export interface LlmCommandProviderConfig {
    command: string;
    providerId: string;
}

export interface LlmChatProviderConfig {
    model: LanguageModel;
    agentId: string;
    purpose: string;
    providerId: string;
}

export interface LlmE2eMockProviderConfig {
    mock: 'e2e';
    providerId: string;
}

export interface LlmCodexProviderProviderConfig {
    codexProvider: CodexProviderService;
    providerId: string;
    modelId?: string;
    request?: Partial<CodexProviderBackendRequest>;
}

export type FlowLlmProviderConfig = LlmCommandProviderConfig | LlmChatProviderConfig | LlmE2eMockProviderConfig | LlmCodexProviderProviderConfig;

@injectable()
export class FlowAgentProviderRegistry implements FlowAgentProviderResolver {

    constructor(
        @inject(LanguageModelRegistry) @optional() protected readonly languageModelRegistry?: LanguageModelRegistry,
        @inject(LanguageModelService) @optional() protected readonly languageModelService?: LanguageModelService,
        @inject(CodexProviderService) @optional() protected readonly codexProviderService?: CodexProviderService
    ) {
    }

    async resolveProvider(context: FlowAgentProviderResolutionContext): Promise<FlowLlmProviderConfig> {
        const providerId = this.resolveProviderId(context);
        if (!providerId) {
            const inheritedProvider = await this.resolveInheritedProvider(context);
            if (inheritedProvider) {
                return inheritedProvider;
            }
            return this.resolveMissingProvider(context);
        }
        if (isE2eMockProviderId(providerId)) {
            if (e2eMockLlmProviderEnabled()) {
                return { mock: 'e2e', providerId };
            }
            throw new Error(this.unsupportedProviderMessage(context, providerId, 'Set FLOW_AGENT_PROVIDER=e2e-mock to enable the test-only mock provider.'));
        }
        if (providerId === 'command') {
            const command = resolveConfiguredCommand();
            if (command) {
                return { command, providerId };
            }
            throw new Error(this.unsupportedProviderMessage(context, providerId, 'Set FLOW_AGENT_LLM_COMMAND or FLOW_AGENT_COMMAND to an executable provider command.'));
        }
        if (providerId === 'theia' || providerId === 'theia-language-model') {
            return this.resolveTheiaProvider(context, providerId);
        }
        const codexRuntimeProvider = parseCodexRuntimeProviderId(providerId);
        if (providerId === 'codex' || providerId === 'codex-provider' || codexRuntimeProvider) {
            return this.resolveCodexProvider(context, providerId, codexRuntimeProvider);
        }
        const customCommand = process.env[customProviderCommandEnvName(providerId)];
        if (customCommand?.trim()) {
            return { command: customCommand, providerId };
        }
        throw new Error(this.unsupportedProviderMessage(
            context,
            providerId,
            `Set ${customProviderCommandEnvName(providerId)} to an executable command-backed provider, or choose one of: theia, theia-language-model, command.`
        ));
    }

    protected async resolveInheritedProvider(_context: FlowAgentProviderResolutionContext): Promise<FlowLlmProviderConfig | undefined> {
        const inheritedTheiaProvider = await this.resolveInheritedTheiaProvider();
        if (inheritedTheiaProvider) {
            return inheritedTheiaProvider;
        }
        return undefined;
    }

    protected resolveProviderId(context: FlowAgentProviderResolutionContext): string | undefined {
        const stateProviderId = context.state.provider?.providerId?.trim().toLowerCase();
        if (stateProviderId) {
            return normalizeLegacyProviderAlias(stateProviderId);
        }
        const envProvider = process.env.FLOW_AGENT_PROVIDER?.trim().toLowerCase();
        if (envProvider && envProvider !== 'auto') {
            return normalizeLegacyProviderAlias(envProvider);
        }
        if (e2eMockLlmProviderEnabled()) {
            return 'e2e-mock';
        }
        if (resolveConfiguredCommand()) {
            return 'command';
        }
        if (resolveConfiguredModelId()) {
            return 'theia';
        }
        return undefined;
    }

    protected resolveMissingProvider(context: FlowAgentProviderResolutionContext): FlowLlmProviderConfig {
        throw new Error(
            `Flow agent provider is missing for state "${stateIdForMessage(context)}". `
            + 'Configure state.provider.providerId, set FLOW_AGENT_PROVIDER, or set FLOW_AGENT_LLM_COMMAND/FLOW_AGENT_COMMAND for a command-backed provider. '
            + 'Deterministic production fallback is disabled.'
        );
    }

    protected async resolveTheiaProvider(context: FlowAgentProviderResolutionContext, providerId: string): Promise<LlmChatProviderConfig> {
        if (!this.languageModelRegistry || !this.languageModelService) {
            throw new Error(this.unsupportedProviderMessage(context, providerId, 'The Theia LanguageModelRegistry and LanguageModelService are not available in this backend container.'));
        }
        const hints = resolveTheiaHints(context);
        if (hints.modelId) {
            const model = await this.languageModelRegistry.getLanguageModel(hints.modelId);
            if (model?.status.status === 'ready') {
                return { model, agentId: hints.agentId, purpose: hints.purpose, providerId };
            }
            throw new Error(this.unsupportedProviderMessage(context, providerId, `The requested modelId "${hints.modelId}" is not available or not ready in the Theia language model registry.`));
        }
        const selected = await this.resolveSelectedTheiaModel([{ agentId: hints.agentId, purpose: hints.purpose }]);
        if (selected) {
            return { model: selected.model, agentId: selected.agentId, purpose: selected.purpose, providerId };
        }
        throw new Error(this.unsupportedProviderMessage(context, providerId, 'No ready Theia language model is available. Configure state.provider.modelId or install/authenticate a Theia language model provider.'));
    }

    protected async resolveInheritedTheiaProvider(): Promise<LlmChatProviderConfig | undefined> {
        if (!this.languageModelRegistry || !this.languageModelService) {
            return undefined;
        }
        const selected = await this.resolveSelectedTheiaModel(defaultTheiaSelections());
        return selected ? { ...selected, providerId: 'theia' } : undefined;
    }

    protected async resolveSelectedTheiaModel(selections: Array<{ agentId: string; purpose: string }>): Promise<{ model: LanguageModel; agentId: string; purpose: string } | undefined> {
        if (!this.languageModelRegistry) {
            return undefined;
        }
        for (const selection of selections) {
            const model = await this.languageModelRegistry.selectLanguageModel({ agent: selection.agentId, purpose: selection.purpose });
            if (model?.status.status === 'ready') {
                return { model, agentId: selection.agentId, purpose: selection.purpose };
            }
        }
        return undefined;
    }

    protected async resolveCodexProvider(
        context: FlowAgentProviderResolutionContext,
        providerId: string,
        runtimeProvider?: { runtime: CodexProviderRuntime; modelProvider: string }
    ): Promise<LlmCodexProviderProviderConfig> {
        const modelId = resolveModelId(context);
        if (!this.codexProviderService) {
            throw new Error(this.unsupportedProviderMessage(context, providerId, 'CodexProviderService is not available in this backend container.'));
        }
        const optionRequest = codexProviderRequestOptions(context.state.provider?.options);
        const request = {
            ...optionRequest,
            runtime: runtimeProvider?.runtime ?? optionRequest.runtime,
            modelProvider: runtimeProvider?.modelProvider ?? optionRequest.modelProvider
        };
        try {
            const status = await this.codexProviderService.getStatus({ cwd: process.cwd(), model: modelId, ...request });
            if (status.available && status.authenticated !== false) {
                return { codexProvider: this.codexProviderService, providerId, modelId, request };
            }
            throw new Error('Codex provider is not available or authenticated.');
        } catch (error) {
            throw new Error(this.unsupportedProviderMessage(context, providerId, `${errorToMessage(error)} Ensure the Codex provider is installed, available, and authenticated.`));
        }
    }

    protected unsupportedProviderMessage(context: FlowAgentProviderResolutionContext, providerId: string, hint: string): string {
        return `Unsupported or unavailable Flow agent provider for state "${stateIdForMessage(context)}": "${providerId}". ${hint}`;
    }
}

function resolveTheiaHints(context: FlowAgentProviderResolutionContext): { modelId?: string; agentId: string; purpose: string; } {
    const options = context.state.provider?.options;
    return {
        modelId: resolveModelId(context),
        agentId: stringOption(options, 'agentId') || stringOption(options, 'agent') || (process.env.FLOW_AGENT_CHAT_AGENT_ID || process.env.FLOW_AGENT_CHAT_AGENT || process.env.FLOW_AGENT_ID || 'Flow').trim(),
        purpose: stringOption(options, 'purpose') || (process.env.FLOW_AGENT_CHAT_PURPOSE || process.env.FLOW_AGENT_PURPOSE || 'agent').trim()
    };
}

function resolveModelId(context: FlowAgentProviderResolutionContext): string | undefined {
    return context.state.provider?.modelId?.trim() || resolveConfiguredModelId();
}

function resolveConfiguredModelId(): string | undefined {
    return (process.env.FLOW_AGENT_MODEL_ID || process.env.FLOW_AGENT_LLM_MODEL_ID || '').trim() || undefined;
}

function resolveConfiguredCommand(): string | undefined {
    return (process.env.FLOW_AGENT_LLM_COMMAND || process.env.FLOW_AGENT_COMMAND || '').trim() || undefined;
}

function defaultTheiaSelections(): Array<{ agentId: string; purpose: string }> {
    return [
        { agentId: 'OpenCoder', purpose: 'chat' },
        { agentId: 'Coder', purpose: 'chat' },
        { agentId: 'OpenPencil', purpose: 'openpencil-design' },
        { agentId: 'OpenPencil', purpose: 'chat' },
        { agentId: 'Flow', purpose: 'agent' },
        { agentId: 'Universal', purpose: 'chat' }
    ];
}

function stringOption(options: Record<string, unknown> | undefined, key: string): string | undefined {
    const value = options?.[key];
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function codexProviderRequestOptions(options: Record<string, unknown> | undefined): Partial<CodexProviderBackendRequest> {
    return {
        runtime: codexRuntimeOption(options, 'runtime'),
        modelProvider: stringOption(options, 'modelProvider'),
        executablePath: stringOption(options, 'executablePath'),
        profile: stringOption(options, 'profile'),
        openRouterApiKey: stringOption(options, 'openRouterApiKey'),
        openCodeApiKey: stringOption(options, 'openCodeApiKey'),
        openCodeExecutablePath: stringOption(options, 'openCodeExecutablePath'),
        openCodeAgent: stringOption(options, 'openCodeAgent'),
        openCodeVariant: stringOption(options, 'openCodeVariant'),
        geminiExecutablePath: stringOption(options, 'geminiExecutablePath'),
        claudeExecutablePath: stringOption(options, 'claudeExecutablePath'),
        claudeAgent: stringOption(options, 'claudeAgent'),
        cursorExecutablePath: stringOption(options, 'cursorExecutablePath'),
        cursorMode: stringOption(options, 'cursorMode')
    };
}

function codexRuntimeOption(options: Record<string, unknown> | undefined, key: string): CodexProviderRuntime | undefined {
    const value = stringOption(options, key);
    return value && isCodexProviderRuntime(value) ? value : undefined;
}

function parseCodexRuntimeProviderId(providerId: string): { runtime: CodexProviderRuntime; modelProvider: string } | undefined {
    const separator = providerId.indexOf(':');
    if (separator <= 0) {
        return undefined;
    }
    const runtime = providerId.slice(0, separator) as CodexProviderRuntime;
    const modelProvider = providerId.slice(separator + 1);
    if (!isCodexProviderRuntime(runtime) || !modelProvider) {
        return undefined;
    }
    return { runtime, modelProvider };
}

function isCodexProviderRuntime(value: string): value is CodexProviderRuntime {
    return value === 'codex-app-server'
        || value === 'direct-http'
        || value === 'opencode-cli'
        || value === 'gemini-cli'
        || value === 'claude-code-cli'
        || value === 'cursor-cli';
}

function normalizeLegacyProviderAlias(providerId: string): string {
    if (providerId === 'chat' || providerId === 'llm') {
        return 'theia';
    }
    if (providerId === 'provider' || providerId === 'cli') {
        return 'command';
    }
    if (providerId === 'codex_cli') {
        return 'codex';
    }
    return providerId;
}

function isE2eMockProviderId(providerId: string): boolean {
    return providerId === 'e2e-mock' || providerId === 'mock-llm' || providerId === 'mock-llm-provider';
}

function e2eMockLlmProviderEnabled(): boolean {
    const provider = (process.env.FLOW_AGENT_PROVIDER || '').trim().toLowerCase();
    return isE2eMockProviderId(provider);
}

export function customProviderCommandEnvName(providerId: string): string {
    const sanitized = providerId.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    return `FLOW_AGENT_PROVIDER_${sanitized || 'CUSTOM'}_COMMAND`;
}

function stateIdForMessage(context: FlowAgentProviderResolutionContext): string {
    return context.state.id || context.workload.stateId;
}

function errorToMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

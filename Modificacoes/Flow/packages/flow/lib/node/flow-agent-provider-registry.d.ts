import { CodexProviderBackendRequest, CodexProviderRuntime, CodexProviderService } from '@cybervinci/ai-providers/lib/common/ai-providers-service';
import { LanguageModel, LanguageModelRegistry, LanguageModelService } from '@theia/ai-core';
import { FlowWorkflowState, FlowWorkload } from '../common';
export declare const FlowAgentProviderResolver: any;
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
export declare class FlowAgentProviderRegistry implements FlowAgentProviderResolver {
    protected readonly languageModelRegistry?: LanguageModelRegistry;
    protected readonly languageModelService?: LanguageModelService;
    protected readonly codexProviderService?: CodexProviderService;
    constructor(languageModelRegistry?: LanguageModelRegistry, languageModelService?: LanguageModelService, codexProviderService?: CodexProviderService);
    resolveProvider(context: FlowAgentProviderResolutionContext): Promise<FlowLlmProviderConfig>;
    protected resolveInheritedProvider(_context: FlowAgentProviderResolutionContext): Promise<FlowLlmProviderConfig | undefined>;
    protected resolveProviderId(context: FlowAgentProviderResolutionContext): string | undefined;
    protected resolveMissingProvider(context: FlowAgentProviderResolutionContext): FlowLlmProviderConfig;
    protected resolveTheiaProvider(context: FlowAgentProviderResolutionContext, providerId: string): Promise<LlmChatProviderConfig>;
    protected resolveInheritedTheiaProvider(): Promise<LlmChatProviderConfig | undefined>;
    protected resolveSelectedTheiaModel(selections: Array<{
        agentId: string;
        purpose: string;
    }>): Promise<{
        model: LanguageModel;
        agentId: string;
        purpose: string;
    } | undefined>;
    protected resolveCodexProvider(context: FlowAgentProviderResolutionContext, providerId: string, runtimeProvider?: {
        runtime: CodexProviderRuntime;
        modelProvider: string;
    }): Promise<LlmCodexProviderProviderConfig>;
    protected unsupportedProviderMessage(context: FlowAgentProviderResolutionContext, providerId: string, hint: string): string;
}
export declare function customProviderCommandEnvName(providerId: string): string;

import { CodexProviderBackendRequest, CodexProviderBackendStatus, CodexProviderDetectedProvider, CodexProviderNotificationMessage, CodexProviderOptions, CodexProviderRuntime, CodexProviderService } from '@cybervinci/ai-providers/lib/common';
import { Disposable } from '@theia/core';
import { CyberVinciAiExecutionSelection, CyberVinciAiModelMetadata, CyberVinciAiProviderDescriptor, CyberVinciAiProviderListRequest, CyberVinciAiRuntimeClient, CyberVinciAiRuntimeService, CyberVinciAiTaskRequest, CyberVinciAiTaskResult, CyberVinciAiUsageReport } from '../common';
import { CyberVinciAiContextBroker } from './ai-context-broker';
declare const DEFAULT_PROVIDER_PRESETS: Array<Pick<CyberVinciAiProviderDescriptor, 'runtime' | 'modelProvider' | 'label' | 'defaultModel' | 'models' | 'modelMetadata'>>;
export declare class CyberVinciAiRuntimeServiceImpl implements CyberVinciAiRuntimeService, Disposable {
    protected client: CyberVinciAiRuntimeClient | undefined;
    protected readonly codexProviderService?: CodexProviderService;
    protected readonly contextBroker: CyberVinciAiContextBroker;
    setClient(client: CyberVinciAiRuntimeClient | undefined): void;
    dispose(): void;
    listProviders(request?: CyberVinciAiProviderListRequest): Promise<CyberVinciAiProviderDescriptor[]>;
    getDefaultExecution(request?: CyberVinciAiProviderListRequest): Promise<CyberVinciAiExecutionSelection>;
    runTask<TInput = unknown, TStructured = unknown>(request: CyberVinciAiTaskRequest<TInput>): Promise<CyberVinciAiTaskResult<TStructured>>;
    protected extractUsageReport(notifications: CodexProviderNotificationMessage[]): CyberVinciAiUsageReport | undefined;
    protected usageCandidates(value: unknown): unknown[];
    protected firstNumber(record: Record<string, unknown>, keys: string[]): number | undefined;
    protected sumOptional(left: number | undefined, right: number | undefined): number | undefined;
    protected toFiniteNumber(value: unknown): number | undefined;
    protected asRecord(value: unknown): Record<string, unknown> | undefined;
    protected resolveExecution(selection: CyberVinciAiExecutionSelection | undefined, workspacePath: string | undefined): Promise<CyberVinciAiExecutionSelection>;
    protected findExecutionProvider(providerId: string, workspacePath: string | undefined, selection: CyberVinciAiExecutionSelection): Promise<CyberVinciAiProviderDescriptor | undefined>;
    protected assertExecutionProviderAvailable(provider: CyberVinciAiProviderDescriptor): void;
    protected resolveExecutionModel(provider: CyberVinciAiProviderDescriptor | undefined, selectedModel: string | undefined): string | undefined;
    protected toCodexRequest(request: CyberVinciAiTaskRequest, execution: CyberVinciAiExecutionSelection, prompt: string): CodexProviderBackendRequest;
    protected buildPrompt(request: CyberVinciAiTaskRequest, contextSection: string | undefined, execution: CyberVinciAiExecutionSelection): string;
    protected outputInstructions(request: CyberVinciAiTaskRequest): string | undefined;
    protected appendReasoningDiagnostics(execution: CyberVinciAiExecutionSelection, diagnostics: string[]): void;
    protected toCodexReasoningEffort(execution: CyberVinciAiExecutionSelection): CodexProviderOptions['reasoningEffort'] | undefined;
    protected toCodexReasoningVariant(execution: CyberVinciAiExecutionSelection): string | undefined;
    protected toCodexReasoningVariantOptions(execution: CyberVinciAiExecutionSelection): Record<string, unknown> | undefined;
    protected detectedProviderToDescriptor(provider: CodexProviderDetectedProvider, status: CodexProviderBackendStatus): CyberVinciAiProviderDescriptor;
    protected statusToDescriptor(status: CodexProviderBackendStatus): CyberVinciAiProviderDescriptor;
    protected toDescriptor(provider: Omit<CyberVinciAiProviderDescriptor, 'id' | 'supportsNativeReasoning' | 'supportsVirtualReasoning'>): CyberVinciAiProviderDescriptor;
    protected providerToExecution(provider: CyberVinciAiProviderDescriptor): CyberVinciAiExecutionSelection;
    protected providerId(runtime: CodexProviderRuntime, modelProvider: string): string;
    protected parseProviderId(providerId: string): {
        runtime: CodexProviderRuntime;
        modelProvider: string;
    } | undefined;
    protected findPresetLabel(runtime: CodexProviderRuntime, modelProvider: string): string;
    protected findPreset(runtime: CodexProviderRuntime, modelProvider: string): typeof DEFAULT_PROVIDER_PRESETS[number] | undefined;
    protected mergeModels(...modelSets: Array<readonly string[] | undefined>): string[] | undefined;
    protected mergeModelMetadata(models: readonly string[] | undefined, ...metadataSets: Array<readonly CyberVinciAiModelMetadata[] | undefined>): CyberVinciAiModelMetadata[] | undefined;
    protected filterProviders(providers: CyberVinciAiProviderDescriptor[], includeUnavailable?: boolean): CyberVinciAiProviderDescriptor[];
}
export {};
//# sourceMappingURL=ai-runtime-service.d.ts.map
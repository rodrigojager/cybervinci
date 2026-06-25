import { CodexProviderBackendRequest, CodexProviderNotificationMessage, CodexProviderOptions, CodexProviderRuntime } from '@cybervinci/ai-providers/lib/common';
import { CodexProviderRuntimeProvider } from '@cybervinci/ai-providers/lib/browser/ai-providers-runtime-provider';
import { CancellationToken, PreferenceService } from '@theia/core';
import { CyberVinciAiExecutionSelection, CyberVinciAiProviderDescriptor, CyberVinciAiProviderListRequest, CyberVinciAiRuntimeService, CyberVinciAiTaskRequest, CyberVinciAiTaskResult, CyberVinciAiTaskStreamEvent } from '../common';
export declare const CyberVinciAiRuntimeBackendService: unique symbol;
export declare class CyberVinciAiRuntimeFrontendService {
    protected readonly aiRuntimeService: CyberVinciAiRuntimeService | undefined;
    protected readonly providerRuntime: CodexProviderRuntimeProvider | undefined;
    protected readonly preferenceService: PreferenceService;
    listProviders(request?: CyberVinciAiProviderListRequest): Promise<CyberVinciAiProviderDescriptor[]>;
    getDefaultExecution(request?: CyberVinciAiProviderListRequest): Promise<CyberVinciAiExecutionSelection>;
    runTask<TInput = unknown, TStructured = unknown>(request: CyberVinciAiTaskRequest<TInput>): Promise<CyberVinciAiTaskResult<TStructured>>;
    runTaskStream<TInput = unknown, TStructured = unknown>(request: CyberVinciAiTaskRequest<TInput>, cancellationToken?: CancellationToken): AsyncIterable<CyberVinciAiTaskStreamEvent<TStructured>>;
    protected resolveExecution(selection: CyberVinciAiExecutionSelection | undefined, workspacePath: string | undefined): Promise<CyberVinciAiExecutionSelection>;
    protected withProviderPreferences(request?: CyberVinciAiProviderListRequest): CyberVinciAiProviderListRequest;
    protected withTaskProviderPreferences<TInput>(request: CyberVinciAiTaskRequest<TInput>): CyberVinciAiTaskRequest<TInput>;
    protected defaultExecutionFromPreferences(): CyberVinciAiExecutionSelection;
    protected providerPreferenceSelection(): CyberVinciAiExecutionSelection;
    protected toProviderRequest<TInput>(request: CyberVinciAiTaskRequest<TInput>, execution: CyberVinciAiExecutionSelection, prompt: string): CodexProviderBackendRequest;
    protected buildPrompt<TInput>(request: CyberVinciAiTaskRequest<TInput>, contextSection: string | undefined, execution: CyberVinciAiExecutionSelection): string;
    protected outputInstructions<TInput>(request: CyberVinciAiTaskRequest<TInput>): string | undefined;
    protected appendReasoningDiagnostics(execution: CyberVinciAiExecutionSelection, diagnostics: string[]): void;
    protected toProviderReasoningEffort(execution: CyberVinciAiExecutionSelection): CodexProviderOptions['reasoningEffort'] | undefined;
    protected toProviderReasoningVariant(execution: CyberVinciAiExecutionSelection): string | undefined;
    protected toProviderReasoningVariantOptions(execution: CyberVinciAiExecutionSelection): Record<string, unknown> | undefined;
    protected notificationToTextDelta(message: CodexProviderNotificationMessage, receivedAgentDelta: boolean): string;
    protected notificationToReasoningDelta(message: CodexProviderNotificationMessage): string;
    protected notificationToError(message: CodexProviderNotificationMessage): string;
    protected readFirstString(value: unknown, keys: string[]): string;
    protected readString(value: unknown, key: string): string;
    protected readObject(value: unknown, key: string): Record<string, unknown>;
    protected readObjectLike(value: unknown): Record<string, unknown> | undefined;
    protected toDisplayText(value: unknown): string;
    protected providerId(runtime: CodexProviderRuntime, modelProvider: string): string;
    protected parseProviderId(providerId: string): {
        runtime: CodexProviderRuntime;
        modelProvider: string;
    } | undefined;
}
//# sourceMappingURL=ai-runtime-frontend-service.d.ts.map
import { ILogger, MessageService } from '@theia/core';
import { CyberVinciAiRuntimeFrontendService } from '@cybervinci/ai-runtime/lib/browser/ai-runtime-frontend-service';
import { CyberVinciAiEffectPolicy, CyberVinciAiExecutionSelection } from '@cybervinci/ai-runtime/lib/common';
import { MutableChatRequestModel } from '@theia/ai-chat/lib/common';
import { PreferenceService } from '@theia/core/lib/common/preferences';
import { QuickPickService } from '@theia/core/lib/common/quick-pick-service';
import { CyberVinciAgent, CyberVinciAiChatExperienceService, CyberVinciDeclarativeChatAgent, CyberVinciHostToolExecutionContext, CyberVinciHostToolExecutionResult, CyberVinciPlaybookAskOption, CyberVinciPlaybookCondition, CyberVinciPlaybookDefinition, CyberVinciPlaybookState } from '../common';
import { CyberVinciToolRegistry } from './cybervinci-tool-registry';
export declare const CYBERVINCI_DIRECT_CHAT_PLAYBOOK_ID = "direct-chat";
export declare const CYBERVINCI_AI_CHAT_FLOW_ROUTE_PLAYBOOK_ID = "ai-chat-flow-route";
export declare const CYBERVINCI_NATIVE_AGENT_DELEGATE_PLAYBOOK_ID = "native-agent-delegate";
export declare const CYBERVINCI_NATIVE_AGENT_PLAYBOOK_PREFIX = "native-agent.";
export declare const CYBERVINCI_PLAYBOOK_RUN_HISTORY_STORAGE_KEY = "cybervinci.aiChat.playbookRunHistory.v1";
export interface CyberVinciPlaybookChatTurn {
    prompt: string;
    playbookId: string;
    handled?: boolean;
    diagnostics?: string[];
    message?: string;
}
interface CyberVinciPlaybookExecutionContext {
    requestId: string;
    playbookId: string;
    input: Record<string, unknown> & {
        prompt: string;
        rawPrompt: string;
        agentId?: string;
        sourceAgentId?: string;
        execution?: CyberVinciAiExecutionSelection;
        providerId?: string;
        model?: string;
        runtime?: string;
        modelProvider?: string;
        reasoningEffort?: string;
        reasoningVariant?: string;
        serviceTier?: string;
    };
    state: Record<string, unknown>;
    diagnostics: string[];
    request?: MutableChatRequestModel;
    invokeNativeAgent?: () => Promise<void>;
    events: CyberVinciPlaybookRunEvent[];
    runRecord?: CyberVinciPlaybookRunRecord;
}
interface CyberVinciPlaybookStateResult {
    ok?: boolean;
    next?: string;
    prompt?: string;
    handled?: boolean;
    stop?: boolean;
    paused?: boolean;
    message?: string;
}
export interface CyberVinciPlaybookRunEvent {
    timestamp: number;
    type: 'started' | 'state' | 'tool' | 'ai' | 'native-agent' | 'paused' | 'resumed' | 'retry' | 'completed' | 'failed';
    stateId?: string;
    message?: string;
    durationMs?: number;
    data?: Record<string, unknown>;
}
export interface CyberVinciPlaybookRunCheckpoint {
    playbookId: string;
    nextStateId?: string;
    input: CyberVinciPlaybookExecutionContext['input'];
    state: Record<string, unknown>;
    diagnostics: string[];
    updatedAt: number;
    canResume: boolean;
    reason?: string;
}
export interface CyberVinciPlaybookFailureArtifacts {
    version: 'cybervinci.playbookFailureArtifacts/v1';
    summary: string;
    failedAt: number;
    diagnostics: string[];
    compensation: {
        canResume: boolean;
        nextStateId?: string;
        retryable: boolean;
        suggestedAction: string;
    };
    secondRunSuggestion: {
        prompt: string;
        playbookId: string;
        input: CyberVinciPlaybookExecutionContext['input'];
    };
}
export interface CyberVinciPlaybookRunRecord {
    requestId: string;
    playbookId: string;
    agentId?: string;
    sourceAgentId?: string;
    startedAt: number;
    completedAt?: number;
    durationMs?: number;
    status: 'running' | 'paused' | 'completed' | 'failed';
    diagnostics: string[];
    events: CyberVinciPlaybookRunEvent[];
    checkpoint?: CyberVinciPlaybookRunCheckpoint;
    failureArtifacts?: CyberVinciPlaybookFailureArtifacts;
}
export declare class CyberVinciPlaybookRuntime {
    protected readonly service: CyberVinciAiChatExperienceService;
    protected readonly toolRegistry: CyberVinciToolRegistry;
    protected readonly preferenceService: PreferenceService;
    protected readonly messageService: MessageService;
    protected readonly logger: ILogger;
    protected readonly quickPickService: QuickPickService | undefined;
    protected readonly aiRuntime: CyberVinciAiRuntimeFrontendService | undefined;
    protected readonly runHistory: CyberVinciPlaybookRunRecord[];
    protected init(): void;
    protected withCurrentExecutionInput(overrides?: Record<string, unknown>): Partial<CyberVinciPlaybookExecutionContext['input']>;
    protected currentExecutionSelection(overrides?: Record<string, unknown>): CyberVinciAiExecutionSelection;
    protected executionSelectionFromPreferences(): CyberVinciAiExecutionSelection;
    protected currentChatMode(): string;
    protected currentExecutionAccessPolicy(): Pick<CyberVinciAiExecutionSelection, 'approvalPolicy' | 'sandboxMode' | 'collaborationMode'>;
    protected currentChatEffectPolicy(): CyberVinciAiEffectPolicy;
    protected asExecutionSelection(value: unknown): CyberVinciAiExecutionSelection | undefined;
    protected firstString(...values: unknown[]): string | undefined;
    protected firstRecord(...values: unknown[]): Record<string, unknown> | undefined;
    protected getSelectedAgentProfileSystemPrompt(): Promise<string | undefined>;
    protected buildSelectedAgentProfileSystemPrompt(profileId: string, profile: CyberVinciAgent): string | undefined;
    protected stripMarkdownFrontmatter(content: string): string;
    protected readMarkdownFrontmatterString(content: string | undefined, key: string): string | undefined;
    prepareChatTurn(prompt: string, selectedPlaybookId?: string): Promise<CyberVinciPlaybookChatTurn>;
    invokeAgentTurn(agent: CyberVinciDeclarativeChatAgent, request: MutableChatRequestModel, invokeNativeAgent: () => Promise<void>): Promise<void>;
    protected resolvePlaybook(playbookId: string, agent?: CyberVinciDeclarativeChatAgent): Promise<CyberVinciPlaybookDefinition | undefined>;
    protected createRuntimeAutonomousPlaybook(playbookId: string, agent?: CyberVinciDeclarativeChatAgent): CyberVinciPlaybookDefinition;
    protected nativeAgentPlaybookId(agentId: string): string;
    protected agentIdFromNativePlaybook(playbookId: string): string | undefined;
    getRecentRuns(): CyberVinciPlaybookRunRecord[];
    resumeRun(requestId: string): Promise<CyberVinciHostToolExecutionResult>;
    resumeRunWithInput(requestId: string, input: Record<string, unknown>, state?: Record<string, unknown>): Promise<CyberVinciHostToolExecutionResult>;
    runPlaybookById(playbookId: string, prompt?: string, input?: Record<string, unknown>): Promise<CyberVinciHostToolExecutionResult>;
    protected runPlaybookAsTool(playbookId: string, toolContext: CyberVinciHostToolExecutionContext): Promise<CyberVinciHostToolExecutionResult>;
    protected resumeRunAsTool(requestId: string, toolContext: CyberVinciHostToolExecutionContext): Promise<CyberVinciHostToolExecutionResult>;
    protected runPlaybook(playbook: CyberVinciPlaybookDefinition, context: CyberVinciPlaybookExecutionContext): Promise<CyberVinciPlaybookStateResult>;
    protected runPlaybookFrom(playbook: CyberVinciPlaybookDefinition, context: CyberVinciPlaybookExecutionContext, entry: string | undefined): Promise<CyberVinciPlaybookStateResult>;
    protected executeState(playbook: CyberVinciPlaybookDefinition, state: CyberVinciPlaybookState, context: CyberVinciPlaybookExecutionContext): Promise<CyberVinciPlaybookStateResult>;
    protected executeToolState(playbook: CyberVinciPlaybookDefinition, state: CyberVinciPlaybookState, context: CyberVinciPlaybookExecutionContext, explicitToolId: string | undefined): Promise<CyberVinciPlaybookStateResult>;
    protected executeGuardState(playbook: CyberVinciPlaybookDefinition, state: CyberVinciPlaybookState, context: CyberVinciPlaybookExecutionContext): Promise<CyberVinciPlaybookStateResult>;
    protected executeAskState(state: CyberVinciPlaybookState, context: CyberVinciPlaybookExecutionContext): Promise<CyberVinciPlaybookStateResult>;
    protected resumeAskStateFromChat(context: CyberVinciPlaybookExecutionContext, askStateId: string, optionId: string): Promise<void>;
    protected resolveAskOptionSelection(state: CyberVinciPlaybookState, context: CyberVinciPlaybookExecutionContext): CyberVinciPlaybookAskOption | undefined;
    protected matchAskOption(options: NonNullable<CyberVinciPlaybookState['options']>, value: unknown): CyberVinciPlaybookAskOption | undefined;
    protected executeAiState(state: CyberVinciPlaybookState, context: CyberVinciPlaybookExecutionContext): Promise<CyberVinciPlaybookStateResult>;
    protected executeNestedPlaybookState(state: CyberVinciPlaybookState, context: CyberVinciPlaybookExecutionContext): Promise<CyberVinciPlaybookStateResult>;
    protected executeParallelState(playbook: CyberVinciPlaybookDefinition, state: CyberVinciPlaybookState, context: CyberVinciPlaybookExecutionContext): Promise<CyberVinciPlaybookStateResult>;
    protected executeFlowState(playbook: CyberVinciPlaybookDefinition, state: CyberVinciPlaybookState, context: CyberVinciPlaybookExecutionContext): Promise<CyberVinciPlaybookStateResult>;
    protected executeResponseState(state: CyberVinciPlaybookState, context: CyberVinciPlaybookExecutionContext): CyberVinciPlaybookStateResult;
    protected captureToolResult(state: CyberVinciPlaybookState, result: CyberVinciHostToolExecutionResult, context: CyberVinciPlaybookExecutionContext): void;
    protected resolveNextState(state: CyberVinciPlaybookState, result: CyberVinciPlaybookStateResult, context: CyberVinciPlaybookExecutionContext): string | undefined;
    protected resolveConditionState(state: CyberVinciPlaybookState, context: CyberVinciPlaybookExecutionContext): string | undefined;
    protected evaluateCondition(condition: CyberVinciPlaybookCondition | string | unknown, context: CyberVinciPlaybookExecutionContext): boolean;
    protected resolveRecord(record: Record<string, unknown>, context: CyberVinciPlaybookExecutionContext): Record<string, unknown>;
    protected asRecord(value: unknown): Record<string, unknown> | undefined;
    protected resolveValue(value: unknown, context: CyberVinciPlaybookExecutionContext): unknown;
    protected renderTemplate(template: string, context: CyberVinciPlaybookExecutionContext): string;
    protected lookupPath(pathExpression: string, context: CyberVinciPlaybookExecutionContext): unknown;
    protected stableValue(value: unknown): string;
    protected createRequestId(): string;
    protected retryStateIfAllowed(state: CyberVinciPlaybookState, retryCounts: Map<string, number>, context: CyberVinciPlaybookExecutionContext, message: string | undefined): Promise<boolean>;
    protected startRunRecord(context: CyberVinciPlaybookExecutionContext): CyberVinciPlaybookRunRecord;
    protected finishRunRecord(record: CyberVinciPlaybookRunRecord, result: CyberVinciPlaybookStateResult, context: CyberVinciPlaybookExecutionContext): void;
    protected createFailureArtifacts(record: CyberVinciPlaybookRunRecord, result: CyberVinciPlaybookStateResult, context: CyberVinciPlaybookExecutionContext): CyberVinciPlaybookFailureArtifacts;
    protected updateRunCheckpoint(context: CyberVinciPlaybookExecutionContext, nextStateId: string | undefined, reason: string): void;
    protected loadRunHistory(): void;
    protected persistRunHistory(): void;
    protected isRunRecord(candidate: unknown): candidate is CyberVinciPlaybookRunRecord;
}
export {};

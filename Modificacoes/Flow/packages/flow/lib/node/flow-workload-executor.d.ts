import { LanguageModelRegistry, LanguageModelService } from '@theia/ai-core';
import { CodexProviderService } from '@cybervinci/ai-providers/lib/common/ai-providers-service';
import { FlowArtifact, FlowEffect, FlowRun, MemoryCandidate, FlowWorkflow, FlowWorkflowState, FlowWorkload, FlowReasoningMode } from '../common';
import { AgentMarkdownStore } from './agent-markdown-store';
import { CommandEffectHostAdapter } from './command-effect-host-adapter';
import { AppliedFileEffect, FileEffectHostAdapter } from './file-effect-host-adapter';
import { ImageEffectHostAdapter } from './image-effect-host-adapter';
import { MemoryAdapter } from './memory-adapter';
import { FlowAgentProviderResolver, FlowLlmProviderConfig } from './flow-agent-provider-registry';
import { FlowPlaybookRunner, FlowPlaybookRunResult } from './flow-playbook-runner';
import { FlowStore } from './flow-store';
export interface FlowWorkloadExecutionContext {
    workflow: FlowWorkflow;
    run: FlowRun;
    state: FlowWorkflowState;
    workload: FlowWorkload;
    workspaceRootUri?: string;
}
export interface FlowWorkloadExecutionResult {
    artifactUri?: string;
    effectId?: string;
}
export declare const FlowWorkloadExecutor: any;
export interface FlowWorkloadExecutor {
    execute(context: FlowWorkloadExecutionContext): Promise<FlowWorkloadExecutionResult>;
    executeAgentWorkload(context: FlowWorkloadExecutionContext): Promise<FlowWorkloadExecutionResult>;
    executePlaybookWorkload?(context: FlowWorkloadExecutionContext): Promise<FlowWorkloadExecutionResult>;
    executeContextWorkload(context: FlowWorkloadExecutionContext): Promise<FlowWorkloadExecutionResult>;
    executeCommandWorkload(context: FlowWorkloadExecutionContext): Promise<FlowWorkloadExecutionResult>;
    executeMemoryWriteWorkload(context: FlowWorkloadExecutionContext): Promise<FlowWorkloadExecutionResult>;
    executeReportWorkload(context: FlowWorkloadExecutionContext): Promise<FlowWorkloadExecutionResult>;
}
type SignalValue = string | number | boolean;
interface ParsedAgentIssue {
    severity: string;
    type: string;
    summary: string;
    producer?: string;
    impact?: string;
    suggestedFollowup?: string;
}
interface ParsedAgentEffect {
    type: string;
    summary: string;
    path?: string;
    prompt?: string;
    artifactPath?: string;
    mimeType?: string;
    provider?: string;
    bytes?: number;
    command?: string;
    cwd?: string;
    env?: Record<string, string | number | boolean>;
    allowedEnv?: string[];
    allowedCommands?: string[];
    allowedPaths?: string[];
    deniedPaths?: string[];
    timeoutMs?: number;
    exitCode?: number | null;
    stdout?: string;
    stderr?: string;
    timedOut?: boolean;
    content?: string;
    hashBefore?: string;
    hashAfter?: string;
    patch?: string;
    approvalPolicy?: string;
    status?: string;
}
interface AgentGenerationResult {
    artifacts: Array<{
        path: string;
        content: string;
    }>;
    summary: string;
    report: string;
    status: string;
    effects: ParsedAgentEffect[];
    signals: Record<string, SignalValue>;
    issues: ParsedAgentIssue[];
    memoryCandidates: MemoryCandidate[];
}
interface InputArtifact {
    path: string;
    content: string;
}
interface FlowPrimitiveItem {
    index: number;
    value: unknown;
    source?: string;
}
interface FlowPrimitiveStepResult {
    stateId: string;
    workloadId: string;
    failed: boolean;
    artifacts: FlowArtifact[];
    effects: FlowEffect[];
    signals: FlowRun['signals'];
    issues: string[];
    metadata?: Record<string, unknown>;
}
export declare class ProviderBackedFlowWorkloadExecutor implements FlowWorkloadExecutor {
    protected readonly agentMarkdownStore: AgentMarkdownStore;
    protected readonly commandEffectHostAdapter: CommandEffectHostAdapter;
    protected readonly imageEffectHostAdapter: ImageEffectHostAdapter;
    protected readonly fileEffectHostAdapter: FileEffectHostAdapter;
    protected readonly languageModelRegistry?: LanguageModelRegistry;
    protected readonly languageModelService?: LanguageModelService;
    protected readonly codexProviderService?: CodexProviderService;
    protected readonly memoryAdapter?: MemoryAdapter;
    protected readonly agentProviderResolver?: FlowAgentProviderResolver;
    protected readonly playbookRunner?: FlowPlaybookRunner;
    protected readonly flowStore?: FlowStore;
    constructor(agentMarkdownStore?: AgentMarkdownStore, commandEffectHostAdapter?: CommandEffectHostAdapter, imageEffectHostAdapter?: ImageEffectHostAdapter, fileEffectHostAdapter?: FileEffectHostAdapter, languageModelRegistry?: LanguageModelRegistry, languageModelService?: LanguageModelService, codexProviderService?: CodexProviderService, memoryAdapter?: MemoryAdapter, agentProviderResolver?: FlowAgentProviderResolver, playbookRunner?: FlowPlaybookRunner, flowStore?: FlowStore);
    execute(context: FlowWorkloadExecutionContext): Promise<FlowWorkloadExecutionResult>;
    executeDynamicParallelWorkload(context: FlowWorkloadExecutionContext): Promise<FlowWorkloadExecutionResult>;
    executeTournamentWorkload(context: FlowWorkloadExecutionContext): Promise<FlowWorkloadExecutionResult>;
    executePlaybookWorkload(context: FlowWorkloadExecutionContext): Promise<FlowWorkloadExecutionResult>;
    protected isPlaybookRunnerAvailable(): Promise<boolean>;
    protected completePlaybookRun(context: FlowWorkloadExecutionContext, playbookId: string, result: FlowPlaybookRunResult): Promise<FlowWorkloadExecutionResult>;
    protected registerPlaybookResultSignals(context: FlowWorkloadExecutionContext, playbookId: string, result: FlowPlaybookRunResult): void;
    executeAgentWorkload(context: FlowWorkloadExecutionContext): Promise<FlowWorkloadExecutionResult>;
    protected resolveModelProfileContext(context: FlowWorkloadExecutionContext): Promise<FlowWorkloadExecutionContext>;
    protected executeRealAgentWorkload(context: FlowWorkloadExecutionContext, provider: FlowLlmProviderConfig): Promise<FlowWorkloadExecutionResult>;
    protected buildProviderPayload(context: FlowWorkloadExecutionContext, agentMarkdown: string, inputArtifacts: InputArtifact[]): Record<string, unknown>;
    protected prepareWorkOrderEnvelope(context: FlowWorkloadExecutionContext, workloadDir: string): Promise<InputArtifact[]>;
    protected ensureWorkloadContextPack(context: FlowWorkloadExecutionContext): Promise<void>;
    protected copyInputArtifacts(context: FlowWorkloadExecutionContext, artifactDir: string): Promise<InputArtifact[]>;
    protected resolvePrimitiveItems(context: FlowWorkloadExecutionContext, source: string, maxItems?: number): Promise<FlowPrimitiveItem[]>;
    protected materializePrimitiveInputArtifact(context: FlowWorkloadExecutionContext, relativePath: string, content: string): Promise<FlowArtifact>;
    protected writePrimitiveAggregateArtifact(context: FlowWorkloadExecutionContext, relativePath: string, payload: Record<string, unknown>): Promise<string>;
    protected executePrimitiveStep(parentContext: FlowWorkloadExecutionContext, stateId: string, state: FlowWorkflowState, metadata?: Record<string, unknown>): Promise<FlowPrimitiveStepResult>;
    protected registerPrimitiveAggregateSignals(context: FlowWorkloadExecutionContext, primitive: 'dynamic_parallel' | 'tournament', itemCount: number, successCount: number, failureCount: number): void;
    protected loadAgentMarkdown(context: FlowWorkloadExecutionContext, agentPath: string): Promise<import("./agent-markdown-store").AgentMarkdownFile>;
    protected applyProviderGenerationToRun(context: FlowWorkloadExecutionContext, generation: AgentGenerationResult): Promise<string[]>;
    protected synchronizeWorkloadEnvelopeEffects(context: FlowWorkloadExecutionContext): void;
    protected registerGeneratedSignals(context: FlowWorkloadExecutionContext, signals: Record<string, SignalValue>): void;
    protected registerGeneratedIssues(context: FlowWorkloadExecutionContext, issues: ParsedAgentIssue[]): void;
    protected registerGeneratedEffects(context: FlowWorkloadExecutionContext, effects: ParsedAgentEffect[]): Promise<string[]>;
    protected applyGeneratedFileEffect(context: FlowWorkloadExecutionContext, effect: ParsedAgentEffect): Promise<AppliedFileEffect>;
    protected registerGeneratedMemoryCandidates(context: FlowWorkloadExecutionContext, candidates: MemoryCandidate[]): void;
    protected resolveLlmProvider(context: FlowWorkloadExecutionContext): Promise<FlowLlmProviderConfig>;
    protected invokeLlmProvider(context: FlowWorkloadExecutionContext, providerPayload: Record<string, unknown>, provider: FlowLlmProviderConfig, workloadDir: string): Promise<string>;
    protected invokeLlmProviderDirect(context: FlowWorkloadExecutionContext, providerPayload: Record<string, unknown>, provider: FlowLlmProviderConfig, workloadDir: string): Promise<string>;
    executeContextWorkload(context: FlowWorkloadExecutionContext): Promise<FlowWorkloadExecutionResult>;
    executeCommandWorkload(context: FlowWorkloadExecutionContext): Promise<FlowWorkloadExecutionResult>;
    executeMemoryWriteWorkload(context: FlowWorkloadExecutionContext): Promise<FlowWorkloadExecutionResult>;
    executeReportWorkload(context: FlowWorkloadExecutionContext): Promise<FlowWorkloadExecutionResult>;
    executeDefaultWorkload(context: FlowWorkloadExecutionContext): Promise<FlowWorkloadExecutionResult>;
    protected completeWorkloadWithArtifacts(context: FlowWorkloadExecutionContext, artifactUris: string[], options: {
        effectSummary: string;
        completionStatus?: string;
    }): FlowWorkloadExecutionResult;
}
/**
 * @deprecated Use ProviderBackedFlowWorkloadExecutor. This alias is kept for
 * downstream extensions compiled against the historical name.
 */
export declare class SimulatedFlowWorkloadExecutor extends ProviderBackedFlowWorkloadExecutor {
}
export interface VirtualReasoningHarnessRequest {
    mode: FlowReasoningMode;
    basePayload: Record<string, unknown>;
    invoke: (payload: Record<string, unknown>) => Promise<string>;
    onProgress?: (message: string) => void;
}
export declare function runVirtualReasoningHarness(request: VirtualReasoningHarnessRequest): Promise<string>;
export {};

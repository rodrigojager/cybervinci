import { AgentService, AISettingsService, ToolInvocationRegistry, ToolRequest } from '@theia/ai-core';
import { ChatAgent, ChatAgentService } from '@theia/ai-chat/lib/common';
import { Command, CommandContribution, CommandRegistry, ILogger, MessageService, QuickInputService, URI } from '@theia/core';
import { ApplicationShell, FrontendApplicationContribution, OpenerService } from '@theia/core/lib/browser';
import { ClipboardService } from '@theia/core/lib/browser/clipboard-service';
import { PreferenceService } from '@theia/core/lib/common/preferences';
import { QuickPickItem, QuickPickService } from '@theia/core/lib/common/quick-pick-service';
import { CyberVinciAiChatExperienceService, CyberVinciCatalogItemKind, CyberVinciDeclarativeChatAgent, CyberVinciDeclarativeTool, CyberVinciPlaybookState } from '../common';
import { CyberVinciDeclarativePromptChatAgent, CyberVinciDelegatingChatAgent } from './cybervinci-declarative-chat-agent';
import { CyberVinciPlaybookRunRecord, CyberVinciPlaybookRuntime } from './cybervinci-playbook-runtime';
import { CyberVinciToolRegistry } from './cybervinci-tool-registry';
export declare const CYBERVINCI_RELOAD_DECLARATIVE_CHAT_AGENTS_COMMAND: Command;
export declare const CYBERVINCI_SHOW_PLAYBOOK_RUNS_COMMAND: Command;
export declare const CYBERVINCI_SHOW_CATALOG_DIAGNOSTICS_COMMAND: Command;
export declare const CYBERVINCI_SHOW_AGENT_MANAGER_COMMAND: Command;
export declare const CYBERVINCI_SHOW_TOOL_MANAGER_COMMAND: Command;
export declare const CYBERVINCI_SHOW_PLAYBOOK_MANAGER_COMMAND: Command;
export declare const CYBERVINCI_SHOW_LOCAL_MARKETPLACE_COMMAND: Command;
export declare const CYBERVINCI_OPEN_CATALOG_PATH_COMMAND: Command;
export declare const CyberVinciDeclarativePromptChatAgentFactory: unique symbol;
export type CyberVinciDeclarativePromptChatAgentFactory = () => CyberVinciDeclarativePromptChatAgent;
declare const CYBERVINCI_NATIVE_AGENT_OVERLAY: unique symbol;
interface CyberVinciNativeAgentOverlayState {
    originalInvoke: ChatAgent['invoke'];
    definition: CyberVinciDeclarativeChatAgent;
}
type CyberVinciPlaybookRunPick = QuickPickItem & ({
    action: 'inspect';
    runIndex: number;
} | {
    action: 'filter-status';
} | {
    action: 'filter-playbook';
} | {
    action: 'compare-runs';
} | {
    action: 'copy-summary-json';
} | {
    action: 'copy-summary-markdown';
});
interface CyberVinciPlaybookRunArtifact {
    id: string;
    label: string;
    source: string;
    description?: string;
    value: unknown;
}
interface CyberVinciPlaybookRunTimelineItem {
    index: number;
    timestamp: string;
    offsetMs: number;
    type: string;
    stateId?: string;
    durationMs?: number;
    message?: string;
    hasData: boolean;
    dataSummary?: string;
    data?: unknown;
}
interface CyberVinciPlaybookRunDiagnosticItem {
    source: 'run' | 'checkpoint' | 'failure';
    index: number;
    message: string;
}
export declare class CyberVinciDeclarativeChatAgentContribution implements FrontendApplicationContribution, CommandContribution {
    protected readonly service: CyberVinciAiChatExperienceService;
    protected readonly promptAgentFactory: CyberVinciDeclarativePromptChatAgentFactory;
    protected readonly agentService: AgentService;
    protected readonly chatAgentService: ChatAgentService;
    protected readonly toolInvocationRegistry: ToolInvocationRegistry;
    protected readonly playbookRuntime: CyberVinciPlaybookRuntime;
    protected readonly toolRegistry: CyberVinciToolRegistry;
    protected readonly logger: ILogger;
    protected readonly messageService: MessageService;
    protected readonly openerService: OpenerService;
    protected readonly shell: ApplicationShell;
    protected readonly clipboardService: ClipboardService;
    protected readonly quickPickService: QuickPickService | undefined;
    protected readonly quickInputService: QuickInputService | undefined;
    protected readonly aiSettingsService: AISettingsService | undefined;
    protected readonly preferenceService: PreferenceService;
    protected readonly registeredAgentIds: Set<string>;
    registerCommands(registry: CommandRegistry): void;
    onStart(): void;
    refreshDeclarativeChatAgents(): Promise<void>;
    protected withRuntimeNativeAgents(definitions: CyberVinciDeclarativeChatAgent[]): CyberVinciDeclarativeChatAgent[];
    protected toRuntimeNativeAgentDefinition(agent: ChatAgent): CyberVinciDeclarativeChatAgent;
    protected nativeAgentPlaybookId(agentId: string): string;
    protected unregisterDynamicAgents(): void;
    protected registerDeclarativeTools(tools: CyberVinciDeclarativeTool[]): void;
    protected toToolRequest(tool: CyberVinciDeclarativeTool): ToolRequest;
    protected registerDeclarativeAgent(definition: CyberVinciDeclarativeChatAgent): Promise<void>;
    protected applyNativeAgentOverlay(definition: CyberVinciDeclarativeChatAgent): void;
    protected registerDelegateAgent(definition: CyberVinciDeclarativeChatAgent): void;
    protected registerPromptAgent(definition: CyberVinciDeclarativeChatAgent): Promise<void>;
    protected registerDynamicAgent(agent: CyberVinciDelegatingChatAgent | CyberVinciDeclarativePromptChatAgent): void;
    protected applyChatVisibility(definition: CyberVinciDeclarativeChatAgent): Promise<void>;
    protected showRecentPlaybookRuns(): Promise<void>;
    protected showPlaybookRunPicker(runs: CyberVinciPlaybookRunRecord[], title: string, placeholder: string): Promise<CyberVinciPlaybookRunPick | undefined>;
    protected handlePlaybookRunPick(picked: CyberVinciPlaybookRunPick, runs: CyberVinciPlaybookRunRecord[]): Promise<void>;
    protected playbookRunPickItem(run: CyberVinciPlaybookRunRecord, runIndex: number): CyberVinciPlaybookRunPick;
    protected showPlaybookRunsFilteredByStatus(runs: CyberVinciPlaybookRunRecord[]): Promise<void>;
    protected showPlaybookRunsFilteredByPlaybook(runs: CyberVinciPlaybookRunRecord[]): Promise<void>;
    protected showPlaybookRunInspector(run: CyberVinciPlaybookRunRecord): Promise<void>;
    protected showPlaybookRunArtifacts(run: CyberVinciPlaybookRunRecord): Promise<void>;
    protected showPlaybookRunTimeline(run: CyberVinciPlaybookRunRecord): Promise<void>;
    protected showPlaybookRunDiagnostics(run: CyberVinciPlaybookRunRecord): Promise<void>;
    protected playbookRunTimeline(run: CyberVinciPlaybookRunRecord): CyberVinciPlaybookRunTimelineItem[];
    protected playbookRunDiagnostics(run: CyberVinciPlaybookRunRecord): CyberVinciPlaybookRunDiagnosticItem[];
    protected toPlaybookRunTimelineExport(run: CyberVinciPlaybookRunRecord, timeline?: CyberVinciPlaybookRunTimelineItem[]): Record<string, unknown>;
    protected toPlaybookRunTimelineMarkdown(run: CyberVinciPlaybookRunRecord, timeline?: CyberVinciPlaybookRunTimelineItem[]): string;
    protected toPlaybookRunDiagnosticsExport(run: CyberVinciPlaybookRunRecord, diagnostics?: CyberVinciPlaybookRunDiagnosticItem[]): Record<string, unknown>;
    protected toPlaybookRunDiagnosticsMarkdown(run: CyberVinciPlaybookRunRecord, diagnostics?: CyberVinciPlaybookRunDiagnosticItem[]): string;
    protected playbookRunArtifacts(run: CyberVinciPlaybookRunRecord): CyberVinciPlaybookRunArtifact[];
    protected artifactSummary(value: unknown): string;
    protected redactedText(value: unknown): string;
    protected toPlaybookRunArtifactsExport(run: CyberVinciPlaybookRunRecord, artifacts?: CyberVinciPlaybookRunArtifact[]): Record<string, unknown>;
    protected toPlaybookRunArtifactsMarkdown(run: CyberVinciPlaybookRunRecord, artifacts?: CyberVinciPlaybookRunArtifact[]): string;
    protected copyPlaybookRunJson(run: CyberVinciPlaybookRunRecord, playbook: Awaited<ReturnType<CyberVinciAiChatExperienceService['getPlaybook']>>, agent: CyberVinciDeclarativeChatAgent | undefined, migrationStatus: Record<string, unknown> | undefined): Promise<void>;
    protected copyPlaybookRunMarkdown(run: CyberVinciPlaybookRunRecord, playbook: Awaited<ReturnType<CyberVinciAiChatExperienceService['getPlaybook']>>, agent: CyberVinciDeclarativeChatAgent | undefined, migrationStatus: Record<string, unknown> | undefined): Promise<void>;
    protected toPlaybookRunExport(run: CyberVinciPlaybookRunRecord, playbook: Awaited<ReturnType<CyberVinciAiChatExperienceService['getPlaybook']>>, agent: CyberVinciDeclarativeChatAgent | undefined, migrationStatus: Record<string, unknown> | undefined): Record<string, unknown>;
    protected toPlaybookRunMarkdown(run: CyberVinciPlaybookRunRecord, playbook: Awaited<ReturnType<CyberVinciAiChatExperienceService['getPlaybook']>>, agent: CyberVinciDeclarativeChatAgent | undefined, migrationStatus: Record<string, unknown> | undefined): string;
    protected copyPlaybookRunListJson(runs: CyberVinciPlaybookRunRecord[]): Promise<void>;
    protected copyPlaybookRunListMarkdown(runs: CyberVinciPlaybookRunRecord[]): Promise<void>;
    protected toPlaybookRunListExport(runs: CyberVinciPlaybookRunRecord[]): Record<string, unknown>;
    protected toPlaybookRunListMarkdown(runs: CyberVinciPlaybookRunRecord[]): string;
    protected showPlaybookRunComparisonPicker(runs: CyberVinciPlaybookRunRecord[]): Promise<void>;
    protected showPlaybookRunComparison(left: CyberVinciPlaybookRunRecord, right: CyberVinciPlaybookRunRecord): Promise<void>;
    protected toPlaybookRunComparison(left: CyberVinciPlaybookRunRecord, right: CyberVinciPlaybookRunRecord): Record<string, unknown>;
    protected runComparisonSide(run: CyberVinciPlaybookRunRecord): Record<string, unknown>;
    protected toPlaybookRunComparisonMarkdown(comparison: Record<string, unknown>): string;
    protected countBy<T>(items: T[], selector: (item: T) => string): Record<string, number>;
    protected formatCounts(counts: Record<string, number>): string;
    protected markdownCell(value: unknown): string;
    protected resolveRunAgent(run: CyberVinciPlaybookRunRecord): Promise<CyberVinciDeclarativeChatAgent | undefined>;
    protected resolveRunMigrationStatus(run: CyberVinciPlaybookRunRecord, agent?: CyberVinciDeclarativeChatAgent): Promise<Record<string, unknown> | undefined>;
    protected migrationStatusDescription(status: Record<string, unknown> | undefined): string;
    protected runDuration(run: CyberVinciPlaybookRunRecord): number;
    protected showStructuredRunDetails(title: string, value: unknown): Promise<void>;
    protected canResumeRun(run: CyberVinciPlaybookRunRecord): boolean;
    runRunInspectorObservabilitySmoke(): Promise<Record<string, unknown>>;
    startPlaybookPersistenceReloadSmoke(): Promise<Record<string, unknown>>;
    finishPlaybookPersistenceReloadSmoke(requestId: string): Promise<Record<string, unknown>>;
    runCatalogManagerEditingSmoke(): Promise<Record<string, unknown>>;
    runCanvasDesignQaRealEditorSmoke(options?: Record<string, unknown>): Promise<Record<string, unknown>>;
    protected runCanvasSmokeStep<T>(steps: Array<Record<string, unknown>>, stage: string, action: () => Promise<T>, timeoutMs: number): Promise<T>;
    protected failedCanvasSmokeStage(steps: Array<Record<string, unknown>>): string | undefined;
    protected saveAndCloseCanvasWidgetBestEffort(uri: URI): Promise<void>;
    protected canvasSmokeRecentRuns(): Array<Record<string, unknown>>;
    protected activateCanvasSmokeWidget(uri: URI, opened: unknown): Promise<void>;
    protected waitForCanvasSmokeDocument(uriText: string): Promise<void>;
    protected restoreCanvasSmokeDocument(uriText: string, document: Record<string, unknown>): Promise<{
        ok: boolean;
        message?: string;
    }>;
    protected saveAndCloseCanvasSmokeWidget(uri: URI): Promise<void>;
    protected findCanvasSmokeWidget(uri: URI): {
        id?: string;
        getResourceUri?: () => URI | undefined;
        getUri?: () => URI | undefined;
        uri?: URI;
        saveable?: unknown;
    } | undefined;
    protected activeCanvasSmokePage(document: Record<string, unknown> | undefined): Record<string, unknown> | undefined;
    protected canvasDesignQaRealEditorSmokeMarkdown(report: Record<string, unknown>): string;
    protected readPersistedRunHistoryForSmoke(): CyberVinciPlaybookRunRecord[];
    protected writePersistedRunHistoryForSmoke(runs: CyberVinciPlaybookRunRecord[]): void;
    protected isPersistedRunRecordForSmoke(value: unknown): value is CyberVinciPlaybookRunRecord;
    protected resumeRunFromCommand(run: CyberVinciPlaybookRunRecord): Promise<void>;
    protected resolveCheckpointAskState(run: CyberVinciPlaybookRunRecord): Promise<CyberVinciPlaybookState | undefined>;
    protected showCatalogDiagnostics(): Promise<void>;
    protected showAgentManager(): Promise<void>;
    protected showToolManager(): Promise<void>;
    protected showPlaybookManager(): Promise<void>;
    protected showLocalMarketplace(): Promise<void>;
    protected showCatalogItemActions(item: (QuickPickItem & {
        kind: CyberVinciCatalogItemKind;
        id: string;
        source?: string;
        sourcePath?: string;
        definition?: CyberVinciDeclarativeChatAgent | CyberVinciDeclarativeTool;
    }) | undefined): Promise<void>;
    protected showToolDefinition(toolId: string, definition?: CyberVinciDeclarativeTool): Promise<void>;
    protected compactJson(value: unknown): string | undefined;
    protected handleCatalogWriteResult(result: {
        ok: boolean;
        message: string;
        path?: string;
        paths?: string[];
    }): Promise<void>;
    protected openCatalogPaths(filePaths: string[]): Promise<void>;
    protected openCatalogPath(filePath: string | undefined): Promise<void>;
    protected assignAgentPlaybook(agentId: string): Promise<void>;
    protected setChatToolbarPlaybook(playbookId: string): Promise<void>;
    protected assignPlaybookToAgent(playbookId: string): Promise<void>;
    protected showPlaybookStates(playbookId: string): Promise<void>;
    protected testDeclarativeAgent(agentId: string): Promise<void>;
    protected runAgentSimulation(agentId: string): Promise<void>;
    protected defaultAgentSimulationPrompt(agent: CyberVinciDeclarativeChatAgent): string;
    protected showAgentCapabilities(agentId: string): Promise<void>;
    protected capabilitySection(label: string, value: unknown): QuickPickItem;
    protected record(value: unknown): Record<string, unknown> | undefined;
    protected testDeclarativeTool(toolId: string): Promise<void>;
    protected collectToolTestInput(toolId: string, tool: CyberVinciDeclarativeTool | undefined): Promise<{
        input: Record<string, unknown>;
        rawJson: string;
    } | undefined>;
    protected runPlaybookSimulation(playbookId: string): Promise<void>;
    protected collectPlaybookSimulationInput(playbookId: string, defaultPrompt?: string, baseInput?: Record<string, unknown>): Promise<{
        prompt: string;
        input: Record<string, unknown>;
    } | undefined>;
    protected defaultPlaybookSimulationPrompt(playbookId: string): string;
    protected canvasQaSimulationPrompt(): string;
    protected isSafeManagerToolTest(tool: CyberVinciDeclarativeTool): boolean;
    protected applyNativeAgentInvokeOverlay(agent: ChatAgent & {
        invoke: ChatAgent['invoke'];
        defaultPlaybook?: string;
        playbooks?: string[];
        [CYBERVINCI_NATIVE_AGENT_OVERLAY]?: CyberVinciNativeAgentOverlayState;
    }, definition: CyberVinciDeclarativeChatAgent): void;
}
export {};
//# sourceMappingURL=cybervinci-declarative-chat-agent-contribution.d.ts.map
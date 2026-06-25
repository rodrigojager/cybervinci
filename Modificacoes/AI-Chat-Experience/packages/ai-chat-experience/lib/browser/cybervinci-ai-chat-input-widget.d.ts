import { ChatAgent } from '@theia/ai-chat';
import { AIChatInputOptionsContribution, AIChatInputWidget } from '@theia/ai-chat-ui/lib/browser/chat-input-widget';
import { GenericCapabilitySelections } from '@theia/ai-core';
import { FlowService } from '@cybervinci/flow/lib/common';
import { ContributionProvider } from '@theia/core';
import * as React from '@theia/core/shared/react';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { CyberVinciAiChatExperienceService, CyberVinciPlaybookSummary } from '../common';
import { CyberVinciPlaybookRuntime } from './cybervinci-playbook-runtime';
type Query = (query: string, mode?: string, capabilityOverrides?: Record<string, boolean>, genericCapabilitySelections?: GenericCapabilitySelections) => Promise<void>;
type FlowChatMode = 'chat' | 'saved' | 'dynamic';
type VirtualReasoningMode = 'off' | 'auto' | 'fast' | 'balanced' | 'deep' | 'coding' | 'research' | 'lats';
interface VirtualReasoningSettings {
    enabled: boolean;
    mode: VirtualReasoningMode;
}
interface PlaybookMentionCandidate {
    playbook: CyberVinciPlaybookSummary;
    aliases: string[];
}
/**
 * CyberVinci's AI Chat input implementation.
 *
 * The class intentionally extends Theia's input widget so existing Theia
 * commands, focus tracking, history handling, and capability checks that rely
 * on `instanceof AIChatInputWidget` keep working after this package replaces
 * the concrete binding.
 */
export declare class CyberVinciAIChatInputWidget extends AIChatInputWidget {
    protected readonly cyberVinciExperienceService: CyberVinciAiChatExperienceService;
    protected readonly cyberVinciPlaybookRuntime: CyberVinciPlaybookRuntime;
    protected readonly cyberVinciFlowService: FlowService | undefined;
    protected readonly cyberVinciWorkspaceService: WorkspaceService | undefined;
    protected readonly inputOptionsContributions: ContributionProvider<AIChatInputOptionsContribution> | undefined;
    protected cyberVinciPlaybookMentionSyncTimeout: number | undefined;
    protected cyberVinciPlaybookMentionCandidates: PlaybookMentionCandidate[] | undefined;
    protected cyberVinciPlaybookMentionCandidatesPromise: Promise<PlaybookMentionCandidate[]> | undefined;
    protected cyberVinciLastMentionPlaybookId: string | undefined;
    protected cyberVinciActivePlaybookId: string | undefined;
    protected render(): React.ReactNode;
    set onQuery(query: Query);
    protected routeSelectedAgentPlaybookThroughChat(playbookId: string, prompt: string, query: Query, mode?: string, capabilityOverrides?: Record<string, boolean>, genericCapabilitySelections?: GenericCapabilitySelections): Promise<boolean>;
    protected resolveChatAgentForPlaybook(playbookId: string): Promise<ChatAgent | undefined>;
    protected agentIdFromNativePlaybook(playbookId: string): string | undefined;
    protected setupEditorEventListeners(): void;
    protected handleCyberVinciPlaybookPreferenceChange(): Promise<void>;
    protected clearPinnedAgentForPlaybook(playbookId: string): Promise<void>;
    protected addPromptToHistory(prompt: string): void;
    protected getCyberVinciPlaybookId(): string;
    protected scheduleCyberVinciPlaybookMentionSync(): void;
    protected syncCyberVinciPlaybookMentionSelection(): Promise<void>;
    protected clearCyberVinciPlaybookMentionSelectionIfCurrent(): Promise<void>;
    protected findCyberVinciPlaybookMention(prompt: string): Promise<CyberVinciPlaybookSummary | undefined>;
    protected getCyberVinciPlaybookMentionCandidates(): Promise<PlaybookMentionCandidate[]>;
    protected createCyberVinciPlaybookMentionAliases(playbook: CyberVinciPlaybookSummary): string[];
    protected promptContainsCyberVinciPlaybookMention(prompt: string, alias: string): boolean;
    protected getCyberVinciFlowChatMode(): FlowChatMode;
    protected getCyberVinciChatRequestModeId(): string | undefined;
    protected applyVirtualReasoningPreferenceToSession(): void;
    protected applyVirtualReasoningToSession(virtualReasoning: VirtualReasoningSettings | undefined): void;
    protected runCyberVinciFlowRoute(prompt: string, flowMode: FlowChatMode): Promise<boolean>;
    protected runLegacyFlowCommand(prompt: string, flowMode: FlowChatMode): Promise<void>;
    protected getSavedFlowWorkflowId(): string;
    protected withCyberVinciFlowExecutionSelection(options: Record<string, unknown>, modeOrCommandId: FlowChatMode | string): Record<string, unknown>;
    protected parseCyberVinciFlowChatCommand(prompt: string): {
        commandId: string;
        options: Record<string, unknown>;
    } | undefined;
    protected updateReasoningSupport(agentId: string | undefined): Promise<void>;
}
export {};
//# sourceMappingURL=cybervinci-ai-chat-input-widget.d.ts.map
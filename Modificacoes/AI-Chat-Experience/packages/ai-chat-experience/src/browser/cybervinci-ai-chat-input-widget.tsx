// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { ChatAgent, ChatModel, ChatSessionSettings, MutableChatModel } from '@theia/ai-chat';
import { AIChatInputOptionsContribution, AIChatInputWidget } from '@theia/ai-chat-ui/lib/browser/chat-input-widget';
import { GenericCapabilitySelections } from '@theia/ai-core';
import { FlowGateDecisionDefinition, FlowGateStatus, FlowHumanGate, FlowRun, FlowService, FlowWorkflow } from '@cybervinci/flow/lib/common';
import { ContributionProvider } from '@theia/core';
import { Disposable } from '@theia/core/lib/common/disposable';
import { PreferenceScope } from '@theia/core/lib/common/preferences';
import { inject, injectable, named, optional } from '@theia/core/shared/inversify';
import * as React from '@theia/core/shared/react';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { CyberVinciAiChatExperienceService, CyberVinciPlaybookSummary } from '../common';
import {
    CYBERVINCI_AI_CHAT_MODE_PREF,
    CYBERVINCI_AI_CHAT_PLAYBOOK_PREF,
    CYBERVINCI_AI_CHAT_FLOW_MODE_PREF,
    CYBERVINCI_AI_CHAT_SAVED_WORKFLOW_PREF,
    CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_AUTO_CONTINUE_PREF,
    CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_AUTO_CONTINUE_ON_RESUME_PREF,
    CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_DISABLE_IN_PLAN_MODE_PREF,
    CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_ENABLED_PREF,
    CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_MAX_ROUNDS_PREF,
    CYBERVINCI_AI_CHAT_VIRTUAL_REASONING_MODE_PREF
} from './cybervinci-ai-chat-experience-preferences';
import { cyberVinciChatModeToRequestModeId, normalizeCyberVinciChatMode, normalizeCyberVinciFlowChatMode, normalizeVirtualReasoningMode, readChatAiExecutionFromPreferences } from './cybervinci-chat-ai-execution-controls';
import { CyberVinciChatGoalStatusBar } from './cybervinci-ai-chat-goal-status';
import { CyberVinciChatGoalObjectiveUpdatedSteering, CyberVinciChatGoalService, CyberVinciChatGoalState, CyberVinciVirtualGoalSettings } from './cybervinci-ai-chat-goal-service';
import {
    CYBERVINCI_AI_CHAT_FLOW_ROUTE_PLAYBOOK_ID,
    CYBERVINCI_DIRECT_CHAT_PLAYBOOK_ID,
    CYBERVINCI_NATIVE_AGENT_PLAYBOOK_PREFIX,
    CyberVinciPlaybookRuntime
} from './cybervinci-playbook-runtime';

type Query = (query: string, mode?: string, capabilityOverrides?: Record<string, boolean>, genericCapabilitySelections?: GenericCapabilitySelections) => Promise<void>;
type FlowChatMode = 'chat' | 'saved' | 'dynamic';
type VirtualReasoningMode = 'off' | 'auto' | 'fast' | 'balanced' | 'deep' | 'coding' | 'research' | 'lats';

interface VirtualReasoningSettings {
    enabled: boolean;
    mode: VirtualReasoningMode;
}

interface FlowRoutingSettings extends ChatSessionSettings {
    flowMode?: FlowChatMode;
    virtualReasoning?: VirtualReasoningSettings;
    virtualGoal?: CyberVinciVirtualGoalSettings;
    commonSettings?: ChatSessionSettings['commonSettings'] & {
        flowMode?: FlowChatMode;
        virtualReasoning?: VirtualReasoningSettings;
        virtualGoal?: CyberVinciVirtualGoalSettings;
    };
}

interface PlaybookMentionCandidate {
    playbook: CyberVinciPlaybookSummary;
    aliases: string[];
}

interface CyberVinciGoalCommand {
    action: 'set' | 'status' | 'budget' | 'clear' | 'pause' | 'resume' | 'complete';
    objective?: string;
    tokenBudget?: number;
}

const FLOW_START_WORKFLOW_COMMAND = 'cybervinci.flow.startWorkflow';
const FLOW_RUN_DYNAMIC_WORKFLOW_COMMAND = 'cybervinci.flow.runDynamicWorkflow';

/**
 * CyberVinci's AI Chat input implementation.
 *
 * The class intentionally extends Theia's input widget so existing Theia
 * commands, focus tracking, history handling, and capability checks that rely
 * on `instanceof AIChatInputWidget` keep working after this package replaces
 * the concrete binding.
 */
@injectable()
export class CyberVinciAIChatInputWidget extends AIChatInputWidget {

    @inject(CyberVinciAiChatExperienceService)
    protected readonly cyberVinciExperienceService: CyberVinciAiChatExperienceService;

    @inject(CyberVinciPlaybookRuntime)
    protected readonly cyberVinciPlaybookRuntime: CyberVinciPlaybookRuntime;

    @inject(FlowService) @optional()
    protected readonly cyberVinciFlowService: FlowService | undefined;

    @inject(WorkspaceService) @optional()
    protected readonly cyberVinciWorkspaceService: WorkspaceService | undefined;

    @inject(CyberVinciChatGoalService)
    protected readonly cyberVinciGoalService: CyberVinciChatGoalService;

    @inject(ContributionProvider) @named(AIChatInputOptionsContribution) @optional()
    protected override readonly inputOptionsContributions: ContributionProvider<AIChatInputOptionsContribution> | undefined;

    protected cyberVinciPlaybookMentionSyncTimeout: number | undefined;
    protected cyberVinciPlaybookMentionCandidates: PlaybookMentionCandidate[] | undefined;
    protected cyberVinciPlaybookMentionCandidatesPromise: Promise<PlaybookMentionCandidate[]> | undefined;
    protected cyberVinciLastMentionPlaybookId: string | undefined;
    protected cyberVinciActivePlaybookId: string | undefined;
    protected cyberVinciGoalResponseCheckTimeout: number | undefined;
    protected cyberVinciGoalContinuationInFlight = false;
    protected readonly cyberVinciHandledGoalResponses = new Set<string>();
    protected readonly cyberVinciGoalLastStatusByChatModelId = new Map<string, CyberVinciChatGoalState['status']>();
    protected readonly cyberVinciGoalThreadResumeContinuations = new Set<string>();
    protected readonly cyberVinciGoalBudgetLimitWrapUps = new Set<string>();

    protected override render(): React.ReactNode {
        return <>
            <CyberVinciFlowGateInlinePanel
                flowService={this.cyberVinciFlowService}
                workspaceService={this.cyberVinciWorkspaceService}
                disabled={!this.isEnabled || this.queryInFlight}
            />
            <CyberVinciChatGoalStatusBar
                goalService={this.cyberVinciGoalService}
                chatModel={this._chatModel}
            />
            {super.render()}
        </>;
    }

    override set chatModel(chatModel: ChatModel) {
        super.chatModel = chatModel;
        const lastRequest = chatModel.getRequests().at(-1);
        if (lastRequest?.response.isComplete) {
            this.cyberVinciHandledGoalResponses.add(lastRequest.id);
        }
        this.cyberVinciGoalService.ensureLoaded(chatModel).then(() =>
            this.handleCyberVinciGoalAutoContinueAfterThreadResume(chatModel)
        ).catch(error => {
            console.warn('Could not restore CyberVinci Virtual Goal state:', error);
        });
        this.onDisposeForChatModel.push(chatModel.onDidChange(event => {
            if (event.kind === 'responseChanged') {
                this.scheduleCyberVinciGoalResponseCheck(chatModel);
            }
        }));
    }

    override set onQuery(query: Query) {
        this._onQuery = async (prompt: string, mode?: string, capabilityOverrides?: Record<string, boolean>, genericCapabilitySelections?: GenericCapabilitySelections) => {
            const flowCommand = this.parseCyberVinciFlowChatCommand(prompt);
            if (flowCommand) {
                this.addPromptToHistory(prompt);
                await this.commandService.executeCommand(
                    flowCommand.commandId,
                    this.withCyberVinciFlowExecutionSelection(flowCommand.options, flowCommand.commandId)
                );
                return;
            }
            if (prompt.trim().startsWith('/flow')) {
                return;
            }
            const flowMode = this.getCyberVinciFlowChatMode();
            const goalCommand = this.parseCyberVinciGoalCommand(prompt);
            let promptForHistory = prompt;
            if (goalCommand) {
                const originalPrompt = prompt;
                const goalResult = await this.runCyberVinciGoalCommand(goalCommand, flowMode);
                if (!goalResult.prompt) {
                    this.addPromptToHistory(originalPrompt);
                    return;
                }
                promptForHistory = originalPrompt;
                prompt = goalResult.prompt;
            }
            if (flowMode !== 'chat' && prompt.trim()) {
                this.addPromptToHistory(prompt);
                if (await this.runCyberVinciFlowRoute(prompt.trim(), flowMode)) {
                    return;
                }
                await this.runLegacyFlowCommand(prompt.trim(), flowMode);
                return;
            }

            const playbookId = this.getCyberVinciPlaybookId();
            if (await this.routeSelectedAgentPlaybookThroughChat(playbookId, prompt, query, mode, capabilityOverrides, genericCapabilitySelections, promptForHistory)) {
                return;
            }

            const playbookTurn = await this.cyberVinciPlaybookRuntime.prepareChatTurn(prompt, playbookId);
            if (playbookTurn.handled) {
                this.addPromptToHistory(promptForHistory);
                return;
            }
            const effectivePrompt = this.withCyberVinciGoalObjectiveUpdatedSteering(playbookTurn.prompt);
            const effectiveMode = mode ?? this.getCyberVinciChatRequestModeId();
            await this.cyberVinciGoalService.ensureLoaded(this._chatModel);
            this.applyVirtualReasoningPreferenceToSession();
            this.applyVirtualGoalPreferenceToSession();
            this.cyberVinciGoalService.recordUserGoalCreationIntent(this._chatModel, promptForHistory);
            this.addPromptToHistory(promptForHistory);
            await this.recordCyberVinciGoalUserTurnStarted(this._chatModel, {
                source: 'user_turn',
                playbookId,
                modeId: effectiveMode,
                promptLength: promptForHistory.length,
                effectivePromptLength: effectivePrompt.length
            });
            this.queryInFlight = true;
            try {
                await query(effectivePrompt, effectiveMode, capabilityOverrides, genericCapabilitySelections);
            } finally {
                this.queryInFlight = false;
                await this.clearCyberVinciPlaybookMentionSelectionIfCurrent();
            }
        };
    }

    protected async routeSelectedAgentPlaybookThroughChat(
        playbookId: string,
        prompt: string,
        query: Query,
        mode?: string,
        capabilityOverrides?: Record<string, boolean>,
        genericCapabilitySelections?: GenericCapabilitySelections,
        historyPrompt: string = prompt
    ): Promise<boolean> {
        const agent = await this.resolveChatAgentForPlaybook(playbookId);
        if (!agent) {
            return false;
        }
        const session = this.chatService.getSessions().find(candidate => candidate.model.id === this._chatModel?.id);
        const previousSessionPinnedAgent = session?.pinnedAgent;
        const previousInputPinnedAgent = this._pinnedAgent;
        if (session) {
            session.pinnedAgent = agent;
        }
        this.pinnedAgent = agent;
        const effectiveMode = mode ?? this.getCyberVinciChatRequestModeId();
        await this.cyberVinciGoalService.ensureLoaded(this._chatModel);
        this.applyVirtualReasoningPreferenceToSession();
        this.applyVirtualGoalPreferenceToSession();
        this.cyberVinciGoalService.recordUserGoalCreationIntent(this._chatModel, historyPrompt);
        this.addPromptToHistory(historyPrompt);
        await this.recordCyberVinciGoalUserTurnStarted(this._chatModel, {
            source: 'user_turn_selected_agent',
            playbookId,
            agentId: agent.id,
            modeId: effectiveMode,
            promptLength: historyPrompt.length,
            effectivePromptLength: prompt.length
        });
        this.queryInFlight = true;
        try {
            await query(this.withCyberVinciGoalObjectiveUpdatedSteering(prompt), effectiveMode, capabilityOverrides, genericCapabilitySelections);
        } finally {
            this.queryInFlight = false;
            if (session?.pinnedAgent?.id === agent.id) {
                session.pinnedAgent = previousSessionPinnedAgent;
            }
            if (this._pinnedAgent?.id === agent.id) {
                this.pinnedAgent = previousInputPinnedAgent;
            }
            await this.clearCyberVinciPlaybookMentionSelectionIfCurrent();
        }
        return true;
    }

    protected async resolveChatAgentForPlaybook(playbookId: string): Promise<ChatAgent | undefined> {
        if (!playbookId || playbookId === CYBERVINCI_DIRECT_CHAT_PLAYBOOK_ID || playbookId === CYBERVINCI_AI_CHAT_FLOW_ROUTE_PLAYBOOK_ID) {
            return undefined;
        }
        const nativeAgentId = this.agentIdFromNativePlaybook(playbookId);
        const nativeAgent = nativeAgentId ? this.chatAgentService.getAgent(nativeAgentId) : undefined;
        if (nativeAgent) {
            return nativeAgent;
        }
        try {
            const manifest = await this.cyberVinciExperienceService.getDeclarativeChatAgentManifest();
            const definition = manifest.agents.find(agent =>
                agent.kind !== 'profile' &&
                (agent.defaultPlaybook === playbookId || agent.playbooks?.includes(playbookId))
            );
            if (!definition) {
                return undefined;
            }
            return this.chatAgentService.getAgent(definition.id)
                ?? (definition.sourceAgentId ? this.chatAgentService.getAgent(definition.sourceAgentId) : undefined);
        } catch (error) {
            console.warn(`Could not resolve CyberVinci chat agent for Playbook '${playbookId}':`, error);
            return undefined;
        }
    }

    protected agentIdFromNativePlaybook(playbookId: string): string | undefined {
        return playbookId.startsWith(CYBERVINCI_NATIVE_AGENT_PLAYBOOK_PREFIX)
            ? playbookId.slice(CYBERVINCI_NATIVE_AGENT_PLAYBOOK_PREFIX.length)
            : undefined;
    }

    protected override setupEditorEventListeners(): void {
        super.setupEditorEventListeners();
        this.cyberVinciActivePlaybookId = this.getCyberVinciPlaybookId();
        this.toDispose.push(Disposable.create(() => {
            if (this.cyberVinciGoalResponseCheckTimeout !== undefined) {
                window.clearTimeout(this.cyberVinciGoalResponseCheckTimeout);
                this.cyberVinciGoalResponseCheckTimeout = undefined;
            }
        }));
        if (this.preferenceService) {
            this.toDispose.push(this.preferenceService.onPreferenceChanged(event => {
                if (event.preferenceName === CYBERVINCI_AI_CHAT_PLAYBOOK_PREF) {
                    this.handleCyberVinciPlaybookPreferenceChange().catch(error => {
                        console.warn('Could not sync CyberVinci Playbook state:', error);
                    });
                }
            }));
        }
        this.toDispose.push(this.cyberVinciGoalService.onDidChangeGoal(event => {
            const previousStatus = this.cyberVinciGoalLastStatusByChatModelId.get(event.chatModelId);
            if (event.goal) {
                this.cyberVinciGoalLastStatusByChatModelId.set(event.chatModelId, event.goal.status);
            } else {
                this.cyberVinciGoalLastStatusByChatModelId.delete(event.chatModelId);
            }
            if (event.goal?.status === 'active' && this.isCyberVinciGoalResumeTransition(previousStatus)) {
                this.handleCyberVinciGoalAutoContinueAfterResume(event.chatModelId, event.goal, previousStatus).catch(error => {
                    console.warn('Could not auto-continue resumed CyberVinci Virtual Goal:', error);
                });
            }
        }));
        const editor = this.editorRef?.getControl();
        if (!editor) {
            return;
        }
        this.toDispose.push(editor.onDidChangeModelContent(() => this.scheduleCyberVinciPlaybookMentionSync()));
        this.scheduleCyberVinciPlaybookMentionSync();
    }

    protected async handleCyberVinciPlaybookPreferenceChange(): Promise<void> {
        const previousPlaybookId = this.cyberVinciActivePlaybookId;
        const nextPlaybookId = this.getCyberVinciPlaybookId();
        this.cyberVinciActivePlaybookId = nextPlaybookId;
        if (!previousPlaybookId || previousPlaybookId === nextPlaybookId) {
            return;
        }
        await this.clearPinnedAgentForPlaybook(previousPlaybookId);
    }

    protected async clearPinnedAgentForPlaybook(playbookId: string): Promise<void> {
        const agent = await this.resolveChatAgentForPlaybook(playbookId);
        if (!agent) {
            return;
        }
        const session = this.chatService.getSessions().find(candidate => candidate.model.id === this._chatModel?.id);
        if (session?.pinnedAgent?.id === agent.id) {
            session.pinnedAgent = undefined;
        }
        if (this._pinnedAgent?.id === agent.id) {
            this.pinnedAgent = session?.pinnedAgent;
        }
    }

    protected addPromptToHistory(prompt: string): void {
        if (this.configuration?.enablePromptHistory !== false && prompt.trim()) {
            this.historyService.addToHistory(prompt);
            this.navigationState.stopNavigation();
        }
    }

    protected getCyberVinciPlaybookId(): string {
        return this.preferenceService?.get<string>(CYBERVINCI_AI_CHAT_PLAYBOOK_PREF, CYBERVINCI_DIRECT_CHAT_PLAYBOOK_ID)?.trim()
            || CYBERVINCI_DIRECT_CHAT_PLAYBOOK_ID;
    }

    protected scheduleCyberVinciPlaybookMentionSync(): void {
        if (this.cyberVinciPlaybookMentionSyncTimeout !== undefined) {
            window.clearTimeout(this.cyberVinciPlaybookMentionSyncTimeout);
        }
        this.cyberVinciPlaybookMentionSyncTimeout = window.setTimeout(() => {
            this.cyberVinciPlaybookMentionSyncTimeout = undefined;
            this.syncCyberVinciPlaybookMentionSelection().catch(error => {
                console.warn('Could not sync CyberVinci Playbook mention selection:', error);
            });
        }, 120);
    }

    protected async syncCyberVinciPlaybookMentionSelection(): Promise<void> {
        const prompt = this.editorRef?.getControl().getValue() ?? '';
        const mention = await this.findCyberVinciPlaybookMention(prompt);
        if (mention) {
            this.cyberVinciLastMentionPlaybookId = mention.id;
            if (this.getCyberVinciPlaybookId() !== mention.id) {
                await this.preferenceService?.set(CYBERVINCI_AI_CHAT_PLAYBOOK_PREF, mention.id, PreferenceScope.User);
            }
            return;
        }
        if (this.queryInFlight && !prompt.trim()) {
            return;
        }
        await this.clearCyberVinciPlaybookMentionSelectionIfCurrent();
    }

    protected async clearCyberVinciPlaybookMentionSelectionIfCurrent(): Promise<void> {
        const lastMentionPlaybookId = this.cyberVinciLastMentionPlaybookId;
        if (!lastMentionPlaybookId) {
            return;
        }
        this.cyberVinciLastMentionPlaybookId = undefined;
        if (this.getCyberVinciPlaybookId() === lastMentionPlaybookId) {
            await this.preferenceService?.set(CYBERVINCI_AI_CHAT_PLAYBOOK_PREF, CYBERVINCI_DIRECT_CHAT_PLAYBOOK_ID, PreferenceScope.User);
        }
    }

    protected async findCyberVinciPlaybookMention(prompt: string): Promise<CyberVinciPlaybookSummary | undefined> {
        if (!prompt.includes('@')) {
            return undefined;
        }
        const candidates = await this.getCyberVinciPlaybookMentionCandidates();
        for (const candidate of candidates) {
            if (candidate.aliases.some(alias => this.promptContainsCyberVinciPlaybookMention(prompt, alias))) {
                return candidate.playbook;
            }
        }
        return undefined;
    }

    protected async getCyberVinciPlaybookMentionCandidates(): Promise<PlaybookMentionCandidate[]> {
        if (this.cyberVinciPlaybookMentionCandidates) {
            return this.cyberVinciPlaybookMentionCandidates;
        }
        if (!this.cyberVinciPlaybookMentionCandidatesPromise) {
            this.cyberVinciPlaybookMentionCandidatesPromise = this.cyberVinciExperienceService.listPlaybooks()
                .then(playbooks => playbooks
                    .filter(playbook => playbook.enabled !== false && playbook.id !== CYBERVINCI_DIRECT_CHAT_PLAYBOOK_ID)
                    .map(playbook => ({
                        playbook,
                        aliases: this.createCyberVinciPlaybookMentionAliases(playbook)
                    }))
                    .filter(candidate => candidate.aliases.length > 0)
                    .sort((left, right) => Math.max(...right.aliases.map(alias => alias.length)) - Math.max(...left.aliases.map(alias => alias.length))))
                .then(candidates => {
                    this.cyberVinciPlaybookMentionCandidates = candidates;
                    return candidates;
                })
                .catch(error => {
                    this.cyberVinciPlaybookMentionCandidatesPromise = undefined;
                    throw error;
                });
        }
        return this.cyberVinciPlaybookMentionCandidatesPromise;
    }

    protected createCyberVinciPlaybookMentionAliases(playbook: CyberVinciPlaybookSummary): string[] {
        const aliases = new Set<string>();
        const add = (value: string | undefined): void => {
            const trimmed = value?.trim();
            if (trimmed) {
                aliases.add(trimmed);
                aliases.add(trimmed.replace(/^native-agent\./i, ''));
                aliases.add(trimmed.replace(/([a-z])([A-Z])/g, '$1-$2'));
            }
        };
        add(playbook.id);
        add(playbook.name);
        for (const value of Array.from(aliases)) {
            aliases.add(value.replace(/\s+/g, '-'));
            aliases.add(value.replace(/[\s_.-]+/g, ''));
        }
        return Array.from(aliases)
            .map(alias => alias.trim())
            .filter((alias, index, values) => alias.length > 1 && values.indexOf(alias) === index)
            .sort((left, right) => right.length - left.length);
    }

    protected promptContainsCyberVinciPlaybookMention(prompt: string, alias: string): boolean {
        const escapedAlias = alias.split(/\s+/)
            .map(segment => segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
            .join('[\\s_-]+');
        return new RegExp(`(^|\\s)@${escapedAlias}(?=$|[\\s.,;:!?\\)\\]\\}])`, 'i').test(prompt);
    }

    protected getCyberVinciFlowChatMode(): FlowChatMode {
        return normalizeCyberVinciFlowChatMode(this.preferenceService?.get(CYBERVINCI_AI_CHAT_FLOW_MODE_PREF, 'chat'));
    }

    protected getCyberVinciChatRequestModeId(): string | undefined {
        return cyberVinciChatModeToRequestModeId(this.preferenceService?.get(CYBERVINCI_AI_CHAT_MODE_PREF, 'chat'));
    }

    protected isCyberVinciGoalContinuationSuppressedByChatMode(): boolean {
        const disableInPlanMode = this.preferenceService?.get<boolean>(
            CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_DISABLE_IN_PLAN_MODE_PREF,
            true
        ) ?? true;
        return disableInPlanMode && normalizeCyberVinciChatMode(this.preferenceService?.get(CYBERVINCI_AI_CHAT_MODE_PREF, 'chat')) === 'plan';
    }

    protected isCyberVinciVirtualGoalEnabled(): boolean {
        return this.preferenceService?.get<boolean>(CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_ENABLED_PREF, true) ?? true;
    }

    protected isCyberVinciVirtualGoalAutoContinueEnabled(): boolean {
        return this.isCyberVinciVirtualGoalEnabled()
            && (this.preferenceService?.get<boolean>(CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_AUTO_CONTINUE_PREF, true) ?? true);
    }

    protected isCyberVinciVirtualGoalAutoContinueOnResumeEnabled(): boolean {
        return this.preferenceService?.get<boolean>(CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_AUTO_CONTINUE_ON_RESUME_PREF, true) ?? true;
    }

    protected areCyberVinciVirtualGoalModelToolsAvailable(): boolean {
        return this.cyberVinciGoalService.isModelControlEnabled();
    }

    protected applyVirtualReasoningPreferenceToSession(): void {
        const mode = normalizeVirtualReasoningMode(this.preferenceService?.get(CYBERVINCI_AI_CHAT_VIRTUAL_REASONING_MODE_PREF, 'off'));
        this.applyVirtualReasoningToSession(mode === 'off' ? undefined : { enabled: true, mode });
    }

    protected applyVirtualReasoningToSession(virtualReasoning: VirtualReasoningSettings | undefined): void {
        const session = this.chatService.getSessions().find(s => s.model.id === this._chatModel?.id);
        if (!session) {
            return;
        }
        const currentSettings = (session.model.settings ?? {}) as FlowRoutingSettings;
        const currentVirtualReasoning = currentSettings.virtualReasoning ?? currentSettings.commonSettings?.virtualReasoning;
        if (
            (currentVirtualReasoning?.enabled ?? false) === (virtualReasoning?.enabled ?? false) &&
            normalizeVirtualReasoningMode(currentVirtualReasoning?.mode) === normalizeVirtualReasoningMode(virtualReasoning?.mode)
        ) {
            return;
        }
        const newCommon = { ...(currentSettings.commonSettings ?? {}) } as NonNullable<FlowRoutingSettings['commonSettings']>;
        const newSettings: FlowRoutingSettings = { ...currentSettings, commonSettings: newCommon };
        if (virtualReasoning?.enabled) {
            newSettings.virtualReasoning = { ...virtualReasoning };
            newCommon.virtualReasoning = { ...virtualReasoning };
        } else {
            delete newSettings.virtualReasoning;
            delete newCommon.virtualReasoning;
        }
        (session.model as MutableChatModel).setSettings(newSettings);
    }

    protected applyVirtualGoalPreferenceToSession(): void {
        this.applyVirtualGoalToSession(this.cyberVinciGoalService.toVirtualGoalSettings(this._chatModel));
    }

    protected applyVirtualGoalToSession(virtualGoal: CyberVinciVirtualGoalSettings | undefined): void {
        const session = this.chatService.getSessions().find(s => s.model.id === this._chatModel?.id);
        if (!session) {
            return;
        }
        const currentSettings = (session.model.settings ?? {}) as FlowRoutingSettings;
        const currentVirtualGoal = currentSettings.virtualGoal ?? currentSettings.commonSettings?.virtualGoal;
        if (JSON.stringify(currentVirtualGoal ?? undefined) === JSON.stringify(virtualGoal ?? undefined)) {
            return;
        }
        const newCommon = { ...(currentSettings.commonSettings ?? {}) } as NonNullable<FlowRoutingSettings['commonSettings']>;
        const newSettings: FlowRoutingSettings = { ...currentSettings, commonSettings: newCommon };
        if (virtualGoal) {
            newSettings.virtualGoal = { ...virtualGoal };
            newCommon.virtualGoal = { ...virtualGoal };
        } else {
            delete newSettings.virtualGoal;
            delete newCommon.virtualGoal;
        }
        (session.model as MutableChatModel).setSettings(newSettings);
    }

    protected parseCyberVinciGoalCommand(prompt: string): CyberVinciGoalCommand | undefined {
        const trimmed = prompt.trim();
        const match = trimmed.match(/^\/goal(?:\s+([\s\S]*))?$/i);
        if (!match) {
            return undefined;
        }
        const body = match[1]?.trim();
        if (!body) {
            return { action: 'status' };
        }
        const normalized = body.toLowerCase();
        if (normalized === 'status' || normalized === 'view') {
            return { action: 'status' };
        }
        const budgetMatch = body.match(/^budget\s+(\d+)$/i);
        if (budgetMatch) {
            return { action: 'budget', tokenBudget: Number(budgetMatch[1]) };
        }
        if (normalized === 'clear' || normalized === 'reset' || normalized === 'stop') {
            return { action: 'clear' };
        }
        if (normalized === 'pause') {
            return { action: 'pause' };
        }
        if (normalized === 'resume' || normalized === 'continue') {
            return { action: 'resume' };
        }
        if (normalized === 'complete' || normalized === 'done') {
            return { action: 'complete' };
        }
        return { action: 'set', objective: body };
    }

    protected async runCyberVinciGoalCommand(command: CyberVinciGoalCommand, flowMode: FlowChatMode): Promise<{ prompt?: string }> {
        if (!this._chatModel) {
            return {};
        }
        if (!this.isCyberVinciVirtualGoalEnabled()) {
            this.messageService.warn('CyberVinci Virtual Goal is disabled.');
            return {};
        }
        if (command.action === 'status') {
            await this.showCyberVinciGoalStatus();
            return {};
        }
        if (command.action === 'budget') {
            const goal = await this.cyberVinciGoalService.setTokenBudget(this._chatModel, command.tokenBudget);
            if (!goal) {
                this.messageService.warn('No Virtual Goal exists for this chat.');
                return {};
            }
            this.messageService.info(`Virtual Goal budget set to ${goal.tokenBudget ?? 'unlimited'} tokens.`);
            return {};
        }
        if (command.action === 'clear') {
            await this.cyberVinciGoalService.clearGoal(this._chatModel);
            return {};
        }
        if (command.action === 'pause') {
            await this.cyberVinciGoalService.updateStatus(this._chatModel, 'paused');
            return {};
        }
        if (command.action === 'resume') {
            await this.cyberVinciGoalService.updateStatus(this._chatModel, 'active');
            return {};
        }
        if (command.action === 'complete') {
            await this.cyberVinciGoalService.updateStatus(this._chatModel, 'complete');
            return {};
        }
        if (flowMode !== 'chat') {
            this.messageService.warn('Virtual Goal is available only in normal chat mode, not Flow routing.');
            return {};
        }
        const trimmed = command.objective?.trim();
        if (!trimmed) {
            return {};
        }
        await this.cyberVinciGoalService.setVirtualGoal(this._chatModel, trimmed, {
            maxRounds: this.getCyberVinciVirtualGoalMaxRounds()
        });
        return { prompt: trimmed };
    }

    protected async showCyberVinciGoalStatus(goal = this._chatModel ? this.cyberVinciGoalService.getGoal(this._chatModel) : undefined): Promise<void> {
        if (!goal) {
            this.messageService.info('No Virtual Goal exists for this chat.');
            return;
        }
        const budget = goal.tokenBudget ? `${goal.tokensUsed}/${goal.tokenBudget} tokens` : `${goal.tokensUsed} tokens`;
        this.messageService.info(`Virtual Goal ${goal.status}: ${goal.objective} (${goal.rounds} rounds, ${budget}).`);
    }

    protected scheduleCyberVinciGoalResponseCheck(chatModel: ChatModel): void {
        if (this.cyberVinciGoalResponseCheckTimeout !== undefined) {
            window.clearTimeout(this.cyberVinciGoalResponseCheckTimeout);
        }
        this.cyberVinciGoalResponseCheckTimeout = window.setTimeout(() => {
            this.cyberVinciGoalResponseCheckTimeout = undefined;
            this.handleCyberVinciGoalResponseComplete(chatModel).catch(error => {
                console.warn('Could not continue CyberVinci Virtual Goal:', error);
            });
        }, 160);
    }

    protected async handleCyberVinciGoalResponseComplete(chatModel: ChatModel): Promise<void> {
        if (this._chatModel?.id !== chatModel.id) {
            return;
        }
        if (!this.isCyberVinciVirtualGoalEnabled()) {
            return;
        }
        const lastRequest = chatModel.getRequests().at(-1);
        if (!lastRequest || !lastRequest.response.isComplete || this.cyberVinciHandledGoalResponses.has(lastRequest.id)) {
            return;
        }
        this.cyberVinciHandledGoalResponses.add(lastRequest.id);
        await this.cyberVinciGoalService.ensureLoaded(chatModel);
        if (lastRequest.response.isCanceled) {
            await this.cyberVinciGoalService.recordRunLogEvent(chatModel, 'turn_canceled', {
                turnId: lastRequest.id
            });
            return;
        }
        if (lastRequest.response.isError) {
            const usageLimited = this.isCyberVinciUsageLimitedResponse(lastRequest.response.errorObject?.message);
            await this.cyberVinciGoalService.recordRunLogEvent(chatModel, 'turn_error', {
                turnId: lastRequest.id,
                usageLimited,
                message: lastRequest.response.errorObject?.message
            });
            await this.cyberVinciGoalService.updateStatus(
                chatModel,
                usageLimited ? 'usage_limited' : 'blocked'
            );
            return;
        }
        const responseText = lastRequest.response.response.asString();
        await this.cyberVinciGoalService.recordRunLogEvent(chatModel, 'turn_stopped', {
            turnId: lastRequest.id,
            responseLength: responseText.length,
            tokenUsageAvailable: !!lastRequest.response.tokenUsage
        });
        await this.cyberVinciGoalService.accountGoalUsage(chatModel, lastRequest.response.tokenUsage, responseText);
        await this.cyberVinciGoalService.recordAssistantResponse(chatModel, responseText);
        const scopeGuard = await this.cyberVinciGoalService.assessScopeGuard(chatModel, responseText);
        if (scopeGuard.status === 'blocked') {
            this.messageService.warn(`Virtual Goal blocked by scope guard (${scopeGuard.violations.join(', ')}).`);
        } else if (scopeGuard.status === 'warning') {
            this.messageService.warn(`Virtual Goal scope guard warning (${scopeGuard.violations.join(', ')}).`);
        }
        const progressGuard = await this.cyberVinciGoalService.assessProgressGuard(chatModel, responseText);
        if (progressGuard.status === 'blocked') {
            const reasonLabel = progressGuard.reason === 'repeated_failure' ? 'repeated command failures' : 'repeated no-progress turns';
            this.messageService.warn(`Virtual Goal stopped after ${reasonLabel} (${progressGuard.reason}).`);
        }
        const goal = this.cyberVinciGoalService.getGoal(chatModel);
        if (!goal) {
            return;
        }
        if (goal.status === 'budget_limited') {
            await this.handleCyberVinciGoalBudgetLimitWrapUp(chatModel, goal);
            return;
        }
        if (goal.status !== 'active') {
            await this.recordCyberVinciGoalContinuationSuppressed(chatModel, 'status_not_active', { status: goal.status });
            return;
        }
        const flowMode = this.getCyberVinciFlowChatMode();
        if (flowMode !== 'chat') {
            await this.recordCyberVinciGoalContinuationSuppressed(chatModel, 'flow_mode', { flowMode });
            return;
        }
        if (goal.tokenBudget !== undefined && goal.tokensUsed >= goal.tokenBudget) {
            const budgetGoal = await this.cyberVinciGoalService.updateStatus(chatModel, 'budget_limited');
            await this.recordCyberVinciGoalContinuationSuppressed(chatModel, 'token_budget', {
                tokensUsed: goal.tokensUsed,
                tokenBudget: goal.tokenBudget
            });
            this.messageService.warn('Virtual Goal reached its token budget.');
            if (budgetGoal) {
                await this.handleCyberVinciGoalBudgetLimitWrapUp(chatModel, budgetGoal);
            }
            return;
        }
        if (!this.isCyberVinciVirtualGoalAutoContinueEnabled()) {
            await this.recordCyberVinciGoalContinuationSuppressed(chatModel, 'auto_continue_disabled');
            return;
        }
        if (this.isCyberVinciGoalContinuationSuppressedByChatMode()) {
            await this.recordCyberVinciGoalContinuationSuppressed(chatModel, 'plan_mode');
            return;
        }
        if (this.hasCyberVinciPendingUserInput()) {
            await this.recordCyberVinciGoalContinuationSuppressed(chatModel, 'pending_user_input');
            return;
        }
        const maxRounds = this.getCyberVinciVirtualGoalMaxRounds(goal);
        if (goal.rounds >= maxRounds) {
            const budgetGoal = await this.cyberVinciGoalService.updateStatus(chatModel, 'budget_limited');
            await this.recordCyberVinciGoalContinuationSuppressed(chatModel, 'round_limit', { maxRounds });
            this.messageService.warn(`Virtual Goal reached the ${maxRounds} round limit.`);
            if (budgetGoal) {
                await this.handleCyberVinciGoalBudgetLimitWrapUp(chatModel, budgetGoal);
            }
            return;
        }
        await this.continueCyberVinciVirtualGoal(chatModel);
    }

    protected hasCyberVinciPendingUserInput(): boolean {
        const value = this.editorRef?.getControl().getValue() ?? '';
        return value.replace(/#imageContext:\S+/g, '').trim().length > 0;
    }

    protected async recordCyberVinciGoalUserTurnStarted(chatModel: ChatModel | undefined, data: Record<string, unknown>): Promise<void> {
        if (!chatModel) {
            return;
        }
        const goal = this.cyberVinciGoalService.getGoal(chatModel);
        if (!goal || goal.status !== 'active') {
            return;
        }
        await this.cyberVinciGoalService.recordRunLogEvent(chatModel, 'turn_started', data);
    }

    protected isCyberVinciUsageLimitedResponse(message: string | undefined): boolean {
        if (!message) {
            return false;
        }
        const normalized = message.toLowerCase();
        return /\b(429|quota|rate limit|rate_limit|usage limit|usage_limit|insufficient quota|too many requests|billing)\b/.test(normalized);
    }

    protected async continueCyberVinciVirtualGoal(chatModel: ChatModel): Promise<boolean> {
        if (this.cyberVinciGoalContinuationInFlight || this._chatModel?.id !== chatModel.id) {
            return false;
        }
        if (!this.areCyberVinciVirtualGoalModelToolsAvailable()) {
            await this.recordCyberVinciGoalContinuationSuppressed(chatModel, 'model_tools_unavailable');
            return false;
        }
        const session = this.chatService.getSessions().find(candidate => candidate.model.id === chatModel.id);
        if (!session) {
            return false;
        }
        this.cyberVinciGoalContinuationInFlight = true;
        this.queryInFlight = true;
        this.update();
        const previousSessionPinnedAgent = session.pinnedAgent;
        const previousInputPinnedAgent = this._pinnedAgent;
        let pinnedAgentForContinuation: ChatAgent | undefined;
        try {
            const goal = await this.cyberVinciGoalService.incrementRound(chatModel);
            if (!goal || goal.status !== 'active') {
                return false;
            }
            await this.cyberVinciGoalService.ensureLoaded(chatModel);
            this.applyVirtualReasoningPreferenceToSession();
            this.applyVirtualGoalPreferenceToSession();

            const continuationPrompt = this.withCyberVinciGoalObjectiveUpdatedSteering(
                this.createCyberVinciGoalContinuationPrompt(goal),
                chatModel
            );
            const playbookId = this.getCyberVinciPlaybookId();
            let effectivePrompt = continuationPrompt;
            pinnedAgentForContinuation = await this.resolveChatAgentForPlaybook(playbookId);
            if (pinnedAgentForContinuation) {
                session.pinnedAgent = pinnedAgentForContinuation;
                this.pinnedAgent = pinnedAgentForContinuation;
            } else {
                const playbookTurn = await this.cyberVinciPlaybookRuntime.prepareChatTurn(continuationPrompt, playbookId);
                if (playbookTurn.handled) {
                    await this.cyberVinciGoalService.recordRunLogEvent(chatModel, 'continuation_failed', {
                        round: goal.rounds,
                        reason: 'playbook_handled_continuation',
                        playbookId
                    });
                    await this.cyberVinciGoalService.updateStatus(chatModel, 'blocked');
                    return false;
                }
                effectivePrompt = playbookTurn.prompt;
            }
            await this.cyberVinciGoalService.recordRunLogEvent(chatModel, 'turn_started', {
                source: 'virtual_goal_continuation',
                round: goal.rounds,
                playbookId,
                promptLength: effectivePrompt.length
            });
            const requestProgress = await this.chatService.sendRequest(session.id, {
                text: effectivePrompt,
                displayText: 'Continue',
                modeId: this.getCyberVinciChatRequestModeId(),
                capabilityOverrides: this.getCyberVinciCapabilityOverridesForRequest(),
                genericCapabilitySelections: this.genericCapabilitySelections
            });
            requestProgress?.responseCompleted.finally(() => {
                if (pinnedAgentForContinuation && session.pinnedAgent?.id === pinnedAgentForContinuation.id) {
                    session.pinnedAgent = previousSessionPinnedAgent;
                }
                if (pinnedAgentForContinuation && this._pinnedAgent?.id === pinnedAgentForContinuation.id) {
                    this.pinnedAgent = previousInputPinnedAgent;
                }
            });
            return true;
        } catch (error) {
            await this.cyberVinciGoalService.recordRunLogEvent(chatModel, 'continuation_failed', {
                message: error instanceof Error ? error.message : String(error)
            });
            throw error;
        } finally {
            this.cyberVinciGoalContinuationInFlight = false;
            this.queryInFlight = false;
            this.update();
        }
    }

    protected getCyberVinciVirtualGoalMaxRounds(goal?: CyberVinciChatGoalState): number {
        const configured = goal?.maxRounds ?? this.preferenceService?.get<number>(CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_MAX_ROUNDS_PREF, 12) ?? 12;
        if (!Number.isFinite(configured)) {
            return 12;
        }
        return Math.min(50, Math.max(1, Math.floor(configured)));
    }

    protected createCyberVinciGoalContinuationPrompt(goal: CyberVinciChatGoalState): string {
        const tokenUsage = goal.tokenBudget !== undefined
            ? `${goal.tokensUsed}/${goal.tokenBudget}${goal.usageEstimated ? ' estimated' : ''}`
            : `${goal.tokensUsed}${goal.usageEstimated ? ' estimated' : ''}`;
        return [
            'Continue working toward the active CyberVinci Virtual Goal.',
            `Goal ID: ${goal.goalId}`,
            `Objective: ${goal.objective}`,
            `Continuation round: ${goal.rounds}${goal.maxRounds ? ` of ${goal.maxRounds}` : ''}.`,
            `Token usage before this turn: ${tokenUsage}.`,
            'Do not narrow, replace, or silently redefine the objective.',
            'Make the next concrete progress step now. If the work is complete, verify it against direct evidence before marking the goal complete.',
            'Use update_goal with status "complete" and expectedGoalId only when the objective is genuinely satisfied. Use status "blocked" only when meaningful progress is impossible without user input or an external state change.',
            'If work remains, keep the goal active and do not explain the hidden goal-control protocol to the user.'
        ].join('\n');
    }

    protected withCyberVinciGoalObjectiveUpdatedSteering(prompt: string, chatModel = this._chatModel): string {
        const steering = this.cyberVinciGoalService.takePendingObjectiveUpdatedSteering(chatModel);
        if (!steering) {
            return prompt;
        }
        return `${this.createCyberVinciGoalObjectiveUpdatedPrompt(steering)}\n\n${prompt}`;
    }

    protected createCyberVinciGoalObjectiveUpdatedPrompt(steering: CyberVinciChatGoalObjectiveUpdatedSteering): string {
        return [
            'The active CyberVinci Virtual Goal objective was updated by the user or runtime.',
            `Previous Goal ID: ${steering.previousGoalId}`,
            `Previous Objective: ${steering.previousObjective}`,
            `Current Goal ID: ${steering.goalId}`,
            `Current Objective: ${steering.objective}`,
            'Stop pursuing the previous objective except where it still directly supports the current objective.',
            'Use the current Goal ID for any update_goal expectedGoalId. Do not complete or block the previous goal.'
        ].join('\n');
    }

    protected createCyberVinciGoalBudgetLimitPrompt(goal: CyberVinciChatGoalState): string {
        const tokenUsage = goal.tokenBudget !== undefined
            ? `${goal.tokensUsed}/${goal.tokenBudget}${goal.usageEstimated ? ' estimated' : ''}`
            : `${goal.tokensUsed}${goal.usageEstimated ? ' estimated' : ''}`;
        return [
            'The active CyberVinci Virtual Goal reached its automatic continuation budget.',
            `Goal ID: ${goal.goalId}`,
            `Objective: ${goal.objective}`,
            `Token usage at limit: ${tokenUsage}.`,
            `Continuation rounds used: ${goal.rounds}${goal.maxRounds ? ` of ${goal.maxRounds}` : ''}.`,
            'Do not start new implementation work, edit files, run tools, or continue the goal automatically.',
            'Give the user a concise handoff: what was accomplished, what remains, and the smallest useful next action.',
            'Do not mark the goal complete unless the current transcript already contains direct evidence that the full objective is satisfied.',
            'Keep the goal status budget_limited and do not explain hidden goal-control protocol to the user.'
        ].join('\n');
    }

    protected async recordCyberVinciGoalContinuationSuppressed(chatModel: ChatModel, reason: string, data: Record<string, unknown> = {}): Promise<void> {
        await this.cyberVinciGoalService.recordRunLogEvent(chatModel, 'continuation_suppressed', {
            reason,
            ...data
        });
    }

    protected async handleCyberVinciGoalBudgetLimitWrapUp(chatModel: ChatModel, goal: CyberVinciChatGoalState): Promise<void> {
        if (this._chatModel?.id !== chatModel.id || goal.status !== 'budget_limited') {
            return;
        }
        const wrapUpKey = `${chatModel.id}:${goal.goalId}`;
        if (this.cyberVinciGoalBudgetLimitWrapUps.has(wrapUpKey)) {
            return;
        }
        if (!this.isCyberVinciVirtualGoalAutoContinueEnabled()) {
            await this.recordCyberVinciGoalContinuationSuppressed(chatModel, 'budget_wrap_up_auto_continue_disabled');
            return;
        }
        if (this.cyberVinciGoalContinuationInFlight) {
            await this.recordCyberVinciGoalContinuationSuppressed(chatModel, 'budget_wrap_up_continuation_in_flight');
            return;
        }
        const flowMode = this.getCyberVinciFlowChatMode();
        if (flowMode !== 'chat') {
            await this.recordCyberVinciGoalContinuationSuppressed(chatModel, 'budget_wrap_up_flow_mode', { flowMode });
            return;
        }
        if (this.isCyberVinciGoalContinuationSuppressedByChatMode()) {
            await this.recordCyberVinciGoalContinuationSuppressed(chatModel, 'budget_wrap_up_plan_mode');
            return;
        }
        if (this.hasCyberVinciPendingUserInput()) {
            await this.recordCyberVinciGoalContinuationSuppressed(chatModel, 'budget_wrap_up_pending_user_input');
            return;
        }
        this.cyberVinciGoalBudgetLimitWrapUps.add(wrapUpKey);
        const sent = await this.sendCyberVinciGoalBudgetLimitWrapUp(chatModel, goal);
        if (!sent) {
            this.cyberVinciGoalBudgetLimitWrapUps.delete(wrapUpKey);
        }
    }

    protected async sendCyberVinciGoalBudgetLimitWrapUp(chatModel: ChatModel, goal: CyberVinciChatGoalState): Promise<boolean> {
        if (this.cyberVinciGoalContinuationInFlight || this._chatModel?.id !== chatModel.id) {
            return false;
        }
        const session = this.chatService.getSessions().find(candidate => candidate.model.id === chatModel.id);
        if (!session) {
            return false;
        }
        this.cyberVinciGoalContinuationInFlight = true;
        this.queryInFlight = true;
        this.update();
        const previousSessionPinnedAgent = session.pinnedAgent;
        const previousInputPinnedAgent = this._pinnedAgent;
        let pinnedAgentForWrapUp: ChatAgent | undefined;
        try {
            await this.cyberVinciGoalService.ensureLoaded(chatModel);
            this.applyVirtualReasoningPreferenceToSession();
            this.applyVirtualGoalPreferenceToSession();

            const wrapUpPrompt = this.createCyberVinciGoalBudgetLimitPrompt(goal);
            const playbookId = this.getCyberVinciPlaybookId();
            let effectivePrompt = wrapUpPrompt;
            pinnedAgentForWrapUp = await this.resolveChatAgentForPlaybook(playbookId);
            if (pinnedAgentForWrapUp) {
                session.pinnedAgent = pinnedAgentForWrapUp;
                this.pinnedAgent = pinnedAgentForWrapUp;
            } else {
                const playbookTurn = await this.cyberVinciPlaybookRuntime.prepareChatTurn(wrapUpPrompt, playbookId);
                if (playbookTurn.handled) {
                    await this.cyberVinciGoalService.recordRunLogEvent(chatModel, 'continuation_failed', {
                        round: goal.rounds,
                        reason: 'playbook_handled_budget_wrap_up',
                        playbookId
                    });
                    return false;
                }
                effectivePrompt = playbookTurn.prompt;
            }
            await this.cyberVinciGoalService.recordRunLogEvent(chatModel, 'turn_started', {
                source: 'virtual_goal_budget_limit_wrap_up',
                round: goal.rounds,
                playbookId,
                promptLength: effectivePrompt.length
            });
            const requestProgress = await this.chatService.sendRequest(session.id, {
                text: effectivePrompt,
                displayText: 'Wrap up',
                modeId: cyberVinciChatModeToRequestModeId('readonly') ?? this.getCyberVinciChatRequestModeId(),
                capabilityOverrides: this.getCyberVinciCapabilityOverridesForRequest(),
                genericCapabilitySelections: this.genericCapabilitySelections
            });
            requestProgress?.responseCompleted.finally(() => {
                if (pinnedAgentForWrapUp && session.pinnedAgent?.id === pinnedAgentForWrapUp.id) {
                    session.pinnedAgent = previousSessionPinnedAgent;
                }
                if (pinnedAgentForWrapUp && this._pinnedAgent?.id === pinnedAgentForWrapUp.id) {
                    this.pinnedAgent = previousInputPinnedAgent;
                }
            });
            return true;
        } catch (error) {
            await this.cyberVinciGoalService.recordRunLogEvent(chatModel, 'continuation_failed', {
                source: 'virtual_goal_budget_limit_wrap_up',
                message: error instanceof Error ? error.message : String(error)
            });
            throw error;
        } finally {
            this.cyberVinciGoalContinuationInFlight = false;
            this.queryInFlight = false;
            this.update();
        }
    }

    protected async handleCyberVinciGoalAutoContinueAfterThreadResume(chatModel: ChatModel): Promise<void> {
        if (this._chatModel?.id !== chatModel.id) {
            return;
        }
        await this.cyberVinciGoalService.ensureLoaded(chatModel);
        const goal = this.cyberVinciGoalService.getGoal(chatModel);
        if (!goal || goal.status !== 'active') {
            return;
        }
        const resumeKey = `${chatModel.id}:${goal.goalId}`;
        if (this.cyberVinciGoalThreadResumeContinuations.has(resumeKey)) {
            return;
        }
        const lastRequest = chatModel.getRequests().at(-1);
        if (lastRequest && !lastRequest.response.isComplete) {
            await this.recordCyberVinciGoalContinuationSuppressed(chatModel, 'thread_resume_turn_in_progress', {
                turnId: lastRequest.id
            });
            return;
        }
        const continued = await this.tryContinueCyberVinciGoalAfterResume(chatModel, goal, 'thread_resume');
        if (continued) {
            this.cyberVinciGoalThreadResumeContinuations.add(resumeKey);
        }
    }

    protected isCyberVinciGoalResumeTransition(status: CyberVinciChatGoalState['status'] | undefined): boolean {
        return status === 'paused' || status === 'blocked' || status === 'usage_limited' || status === 'budget_limited';
    }

    protected async handleCyberVinciGoalAutoContinueAfterResume(
        chatModelId: string,
        goal: CyberVinciChatGoalState,
        previousStatus: CyberVinciChatGoalState['status'] | undefined
    ): Promise<void> {
        const chatModel = this._chatModel;
        if (!chatModel || chatModel.id !== chatModelId || goal.status !== 'active') {
            return;
        }
        await this.tryContinueCyberVinciGoalAfterResume(chatModel, goal, 'resume', { previousStatus });
    }

    protected async tryContinueCyberVinciGoalAfterResume(
        chatModel: ChatModel,
        goal: CyberVinciChatGoalState,
        reasonPrefix: 'resume' | 'thread_resume',
        data: Record<string, unknown> = {}
    ): Promise<boolean> {
        if (!this.isCyberVinciVirtualGoalAutoContinueEnabled() || !this.isCyberVinciVirtualGoalAutoContinueOnResumeEnabled()) {
            await this.recordCyberVinciGoalContinuationSuppressed(chatModel, `${reasonPrefix}_auto_continue_disabled`, data);
            return false;
        }
        if (this.cyberVinciGoalContinuationInFlight) {
            await this.recordCyberVinciGoalContinuationSuppressed(chatModel, `${reasonPrefix}_continuation_in_flight`, data);
            return false;
        }
        const flowMode = this.getCyberVinciFlowChatMode();
        if (flowMode !== 'chat') {
            await this.recordCyberVinciGoalContinuationSuppressed(chatModel, `${reasonPrefix}_flow_mode`, { ...data, flowMode });
            return false;
        }
        if (this.isCyberVinciGoalContinuationSuppressedByChatMode()) {
            await this.recordCyberVinciGoalContinuationSuppressed(chatModel, `${reasonPrefix}_plan_mode`, data);
            return false;
        }
        if (this.hasCyberVinciPendingUserInput()) {
            await this.recordCyberVinciGoalContinuationSuppressed(chatModel, `${reasonPrefix}_pending_user_input`, data);
            return false;
        }
        const current = this.cyberVinciGoalService.getGoal(chatModel) ?? goal;
        if (current.tokenBudget !== undefined && current.tokensUsed >= current.tokenBudget) {
            await this.cyberVinciGoalService.updateStatus(chatModel, 'budget_limited');
            await this.recordCyberVinciGoalContinuationSuppressed(chatModel, `${reasonPrefix}_token_budget`, {
                ...data,
                tokensUsed: current.tokensUsed,
                tokenBudget: current.tokenBudget
            });
            return false;
        }
        const maxRounds = this.getCyberVinciVirtualGoalMaxRounds(current);
        if (current.rounds >= maxRounds) {
            await this.cyberVinciGoalService.updateStatus(chatModel, 'budget_limited');
            await this.recordCyberVinciGoalContinuationSuppressed(chatModel, `${reasonPrefix}_round_limit`, { ...data, maxRounds });
            return false;
        }
        return this.continueCyberVinciVirtualGoal(chatModel);
    }

    protected getCyberVinciCapabilityOverridesForRequest(): Record<string, boolean> | undefined {
        const capabilityOverrides: Record<string, boolean> = {};
        for (const [key, value] of this.userCapabilityOverrides) {
            capabilityOverrides[key] = value;
        }
        return Object.keys(capabilityOverrides).length ? capabilityOverrides : undefined;
    }

    protected async runCyberVinciFlowRoute(prompt: string, flowMode: FlowChatMode): Promise<boolean> {
        if (flowMode === 'saved' && !this.getSavedFlowWorkflowId()) {
            return false;
        }
        try {
            const result = await this.cyberVinciPlaybookRuntime.runPlaybookById(CYBERVINCI_AI_CHAT_FLOW_ROUTE_PLAYBOOK_ID, prompt, {
                ...this.withCyberVinciFlowExecutionSelection({
                    prompt,
                    flowMode,
                    preferSaved: true,
                    ...(flowMode === 'saved' ? { workflowId: this.getSavedFlowWorkflowId() } : {})
                }, flowMode)
            });
            return result.ok === true && result.stop === true;
        } catch (error) {
            this.messageService.warn(`Could not route AI Chat through Flow playbook: ${error instanceof Error ? error.message : String(error)}`);
            return false;
        }
    }

    protected async runLegacyFlowCommand(prompt: string, flowMode: FlowChatMode): Promise<void> {
        if (flowMode === 'dynamic') {
            await this.commandService.executeCommand(
                FLOW_RUN_DYNAMIC_WORKFLOW_COMMAND,
                this.withCyberVinciFlowExecutionSelection({
                    prompt,
                    preferSaved: true
                }, FLOW_RUN_DYNAMIC_WORKFLOW_COMMAND)
            );
            return;
        }
        const workflowId = this.getSavedFlowWorkflowId();
        await this.commandService.executeCommand(FLOW_START_WORKFLOW_COMMAND, {
            prompt,
            ...(workflowId ? { workflowId } : { selectWorkflow: true })
        });
    }

    protected getSavedFlowWorkflowId(): string {
        return this.preferenceService?.get<string>(CYBERVINCI_AI_CHAT_SAVED_WORKFLOW_PREF, '')?.trim() ?? '';
    }

    protected withCyberVinciFlowExecutionSelection(options: Record<string, unknown>, modeOrCommandId: FlowChatMode | string): Record<string, unknown> {
        const shouldInheritChatExecution = modeOrCommandId === 'dynamic' || modeOrCommandId === FLOW_RUN_DYNAMIC_WORKFLOW_COMMAND;
        if (!shouldInheritChatExecution || !this.preferenceService) {
            return options;
        }
        return {
            ...options,
            execution: readChatAiExecutionFromPreferences(this.preferenceService)
        };
    }

    protected parseCyberVinciFlowChatCommand(prompt: string): { commandId: string; options: Record<string, unknown> } | undefined {
        const trimmed = prompt.trim();
        if (!trimmed.startsWith('/flow')) {
            return undefined;
        }
        const dynamicMatch = trimmed.match(/^\/flow(?:-dynamic|\s+dynamic)\s+([\s\S]+)$/i);
        const dynamicPrompt = dynamicMatch?.[1]?.trim();
        if (dynamicPrompt) {
            return {
                commandId: FLOW_RUN_DYNAMIC_WORKFLOW_COMMAND,
                options: {
                    prompt: dynamicPrompt,
                    preferSaved: true
                }
            };
        }
        const manualMatch = trimmed.match(/^\/flow\s+([\s\S]+)$/i);
        const manualBody = manualMatch?.[1]?.trim();
        if (!manualBody) {
            this.messageService.warn('Use /flow <prompt> or /flow-dynamic <prompt>. For a specific saved workflow, use /flow <workflowId>: <prompt>.');
            return undefined;
        }
        const workflowMatch = manualBody.match(/^([a-zA-Z0-9_.-]+)\s*:\s+([\s\S]+)$/);
        const workflowId = workflowMatch?.[1]?.trim();
        const workflowPrompt = workflowMatch?.[2]?.trim();
        return {
            commandId: FLOW_START_WORKFLOW_COMMAND,
            options: workflowId && workflowPrompt
                ? { workflowId, prompt: workflowPrompt }
                : { prompt: manualBody, selectWorkflow: true }
        };
    }

    protected override async updateReasoningSupport(agentId: string | undefined): Promise<void> {
        await super.updateReasoningSupport(agentId);
        if (this.currentReasoningSupport) {
            this.currentReasoningSupport = undefined;
            this.update();
        }
    }
}

interface PendingFlowGate {
    run: FlowRun;
    gate: FlowHumanGate;
    workspaceRootUri?: string;
    workflow?: FlowWorkflow;
}

const CyberVinciFlowGateInlinePanel: React.FunctionComponent<{
    flowService?: FlowService;
    workspaceService?: WorkspaceService;
    disabled?: boolean;
}> = ({ flowService, workspaceService, disabled }) => {
    const [pendingGates, setPendingGates] = React.useState<PendingFlowGate[]>([]);
    const [error, setError] = React.useState<string | undefined>();
    const [refreshNonce, setRefreshNonce] = React.useState(0);

    React.useEffect(() => {
        let disposed = false;
        const load = async (): Promise<void> => {
            if (!flowService) {
                if (!disposed) {
                    setPendingGates([]);
                }
                return;
            }
            try {
                const roots = await workspaceService?.roots;
                const rootUri = roots?.[0]?.resource.toString();
                const scopes = rootUri ? [rootUri, undefined] : [undefined];
                const candidateMap = new Map<string, PendingFlowGate>();
                const scopeErrors: string[] = [];
                for (const scope of scopes) {
                    try {
                        const runs = await flowService.listRuns({ workspaceRootUri: scope });
                        for (const run of runs.filter(candidate => candidate.status === 'waiting_gate')) {
                            for (const gate of (run.gates || []).filter(candidate => candidate.status === 'pending')) {
                                const key = `${run.id}:${gate.id}`;
                                if (!candidateMap.has(key)) {
                                    candidateMap.set(key, { run, gate, workspaceRootUri: scope });
                                }
                            }
                        }
                    } catch (cause) {
                        scopeErrors.push(cause instanceof Error ? cause.message : String(cause));
                    }
                }
                if (candidateMap.size === 0 && scopeErrors.length === scopes.length) {
                    throw new Error(scopeErrors.join('; '));
                }
                const candidates = Array.from(candidateMap.values())
                    .sort((left, right) => String(right.run.updatedAt || '').localeCompare(String(left.run.updatedAt || '')))
                    .slice(0, 3);
                const workflows = new Map<string, FlowWorkflow>();
                await Promise.all(candidates.map(async candidate => {
                    try {
                        const key = `${candidate.workspaceRootUri || 'global'}:${candidate.run.workflowId}`;
                        if (!workflows.has(key)) {
                            workflows.set(key, await flowService.getWorkflow({
                                workspaceRootUri: candidate.workspaceRootUri,
                                workflowId: candidate.run.workflowId
                            }));
                        }
                    } catch {
                        // The gate can still be decided without workflow metadata.
                    }
                }));
                if (!disposed) {
                    setPendingGates(candidates.map(candidate => ({
                        ...candidate,
                        workflow: workflows.get(`${candidate.workspaceRootUri || 'global'}:${candidate.run.workflowId}`)
                    })));
                    setError(undefined);
                }
            } catch (cause) {
                if (!disposed) {
                    setError(cause instanceof Error ? cause.message : String(cause));
                }
            }
        };
        load();
        const handle = window.setInterval(load, pendingGates.length ? 1500 : 3500);
        return () => {
            disposed = true;
            window.clearInterval(handle);
        };
    }, [flowService, workspaceService, refreshNonce]);

    if (!flowService) {
        return null;
    }
    if (pendingGates.length === 0 && !error) {
        return null;
    }
    return <div className='cybervinci-flow-gate-panel'>
        <div className='cybervinci-flow-gate-panel-header'>
            <span className='codicon codicon-feedback' />
            <strong>Flow aguardando decisão humana</strong>
            <button
                type='button'
                className='cybervinci-flow-gate-icon-button'
                title='Atualizar gates pendentes'
                onClick={() => setRefreshNonce(value => value + 1)}
            >
                <span className='codicon codicon-refresh' />
            </button>
        </div>
        {error && <div className='cybervinci-flow-gate-error'>{error}</div>}
        {pendingGates.map(item => (
            <CyberVinciFlowGateInlineCard
                key={`${item.run.id}:${item.gate.id}`}
                item={item}
                flowService={flowService}
                disabled={disabled}
                onDecided={() => setRefreshNonce(value => value + 1)}
            />
        ))}
    </div>;
};

const CyberVinciFlowGateInlineCard: React.FunctionComponent<{
    item: PendingFlowGate;
    flowService: FlowService;
    disabled?: boolean;
    onDecided: () => void;
}> = ({ item, flowService, disabled, onDecided }) => {
    const decisions = item.gate.decisions?.length ? item.gate.decisions : defaultFlowGateDecisions();
    const [decisionId, setDecisionId] = React.useState(decisions[0]?.id || 'approved');
    const [targetStateId, setTargetStateId] = React.useState('');
    const [note, setNote] = React.useState('');
    const [busy, setBusy] = React.useState(false);
    const [error, setError] = React.useState<string | undefined>();
    const selectedDecision = decisions.find(decision => decision.id === decisionId) || decisions[0];
    const workflowStates = item.workflow ? Object.keys(item.workflow.states || {}) : [];
    const canSelectTarget = Boolean(selectedDecision?.allowTargetSelection);
    const targetValue = canSelectTarget ? targetStateId || selectedDecision?.to || '' : selectedDecision?.to || targetStateId || '';

    const decide = async (): Promise<void> => {
        if (!selectedDecision) {
            return;
        }
        setBusy(true);
        setError(undefined);
        try {
            await flowService.approveGate({
                workspaceRootUri: item.workspaceRootUri,
                runId: item.run.id,
                gateId: item.gate.id,
                decision: flowGateStatusForDecision(selectedDecision),
                decisionId: selectedDecision.id,
                targetStateId: targetValue || undefined,
                note: note.trim() || undefined,
                approvedBy: 'AI Chat'
            });
            setNote('');
            setTargetStateId('');
            onDecided();
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : String(cause));
        } finally {
            setBusy(false);
        }
    };

    return <div className='cybervinci-flow-gate-card'>
        <div className='cybervinci-flow-gate-title-row'>
            <div>
                <strong>{item.gate.title || item.gate.id}</strong>
                <span>{item.workflow?.name || item.run.workflowId}</span>
            </div>
            <code>{item.run.id.slice(0, 8)}</code>
        </div>
        {item.gate.prompt && <p>{item.gate.prompt}</p>}
        <div className='cybervinci-flow-gate-controls'>
            <label>
                <span>Decisão</span>
                <select
                    value={decisionId}
                    disabled={disabled || busy}
                    onChange={event => {
                        setDecisionId(event.currentTarget.value);
                        setTargetStateId('');
                    }}
                >
                    {decisions.map(decision => <option key={decision.id} value={decision.id}>{decision.label || decision.id}</option>)}
                </select>
            </label>
            <label className={canSelectTarget ? undefined : 'disabled'}>
                <span>Próxima etapa</span>
                <select
                    value={targetValue}
                    disabled={disabled || busy || !canSelectTarget || workflowStates.length === 0}
                    onChange={event => setTargetStateId(event.currentTarget.value)}
                >
                    <option value=''>{selectedDecision?.to ? selectedDecision.to : 'Padrão do gate'}</option>
                    {workflowStates.map(stateId => <option key={stateId} value={stateId}>{stateId}</option>)}
                </select>
            </label>
        </div>
        <textarea
            value={note}
            disabled={disabled || busy}
            placeholder='Instrução opcional para esta decisão'
            onChange={event => setNote(event.currentTarget.value)}
        />
        {error && <div className='cybervinci-flow-gate-error'>{error}</div>}
        <div className='cybervinci-flow-gate-actions'>
            <button
                type='button'
                disabled={disabled || busy}
                onClick={decide}
            >
                {busy ? 'Aplicando...' : selectedDecision?.label || 'Aplicar decisão'}
            </button>
        </div>
    </div>;
};

function defaultFlowGateDecisions(): FlowGateDecisionDefinition[] {
    return [
        { id: 'approved', label: 'Aprovar', outcome: 'approved' },
        { id: 'revision_requested', label: 'Pedir ajustes', outcome: 'revision_requested', action: 'wait', allowTargetSelection: true, requireNote: true },
        { id: 'rejected', label: 'Rejeitar', outcome: 'rejected', action: 'fail', requireNote: true }
    ];
}

function flowGateStatusForDecision(decision: FlowGateDecisionDefinition): Exclude<FlowGateStatus, 'pending'> {
    const normalized = String(decision.outcome || decision.id || '').toLowerCase();
    if (normalized === 'rejected' || decision.action === 'fail') {
        return 'rejected';
    }
    if (
        normalized === 'revision_requested'
        || normalized === 'changes_requested'
        || decision.action === 'wait'
        || decision.action === 'pause'
        || decision.allowTargetSelection
    ) {
        return 'revision_requested';
    }
    return 'approved';
}

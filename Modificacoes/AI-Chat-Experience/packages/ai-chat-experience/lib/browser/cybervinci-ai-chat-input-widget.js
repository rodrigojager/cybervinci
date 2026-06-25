"use strict";
// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************
Object.defineProperty(exports, "__esModule", { value: true });
exports.CyberVinciAIChatInputWidget = void 0;
const tslib_1 = require("tslib");
const chat_input_widget_1 = require("@theia/ai-chat-ui/lib/browser/chat-input-widget");
const common_1 = require("@cybervinci/flow/lib/common");
const core_1 = require("@theia/core");
const preferences_1 = require("@theia/core/lib/common/preferences");
const inversify_1 = require("@theia/core/shared/inversify");
const React = require("@theia/core/shared/react");
const browser_1 = require("@theia/workspace/lib/browser");
const common_2 = require("../common");
const cybervinci_ai_chat_experience_preferences_1 = require("./cybervinci-ai-chat-experience-preferences");
const cybervinci_chat_ai_execution_controls_1 = require("./cybervinci-chat-ai-execution-controls");
const cybervinci_playbook_runtime_1 = require("./cybervinci-playbook-runtime");
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
let CyberVinciAIChatInputWidget = class CyberVinciAIChatInputWidget extends chat_input_widget_1.AIChatInputWidget {
    render() {
        return React.createElement(React.Fragment, null,
            React.createElement(CyberVinciFlowGateInlinePanel, { flowService: this.cyberVinciFlowService, workspaceService: this.cyberVinciWorkspaceService, disabled: !this.isEnabled || this.queryInFlight }),
            super.render());
    }
    set onQuery(query) {
        this._onQuery = async (prompt, mode, capabilityOverrides, genericCapabilitySelections) => {
            const flowCommand = this.parseCyberVinciFlowChatCommand(prompt);
            if (flowCommand) {
                this.addPromptToHistory(prompt);
                await this.commandService.executeCommand(flowCommand.commandId, this.withCyberVinciFlowExecutionSelection(flowCommand.options, flowCommand.commandId));
                return;
            }
            if (prompt.trim().startsWith('/flow')) {
                return;
            }
            const flowMode = this.getCyberVinciFlowChatMode();
            if (flowMode !== 'chat' && prompt.trim()) {
                this.addPromptToHistory(prompt);
                if (await this.runCyberVinciFlowRoute(prompt.trim(), flowMode)) {
                    return;
                }
                await this.runLegacyFlowCommand(prompt.trim(), flowMode);
                return;
            }
            const playbookId = this.getCyberVinciPlaybookId();
            if (await this.routeSelectedAgentPlaybookThroughChat(playbookId, prompt, query, mode, capabilityOverrides, genericCapabilitySelections)) {
                return;
            }
            const playbookTurn = await this.cyberVinciPlaybookRuntime.prepareChatTurn(prompt, playbookId);
            if (playbookTurn.handled) {
                this.addPromptToHistory(prompt);
                return;
            }
            const effectivePrompt = playbookTurn.prompt;
            const effectiveMode = mode ?? this.getCyberVinciChatRequestModeId();
            this.applyVirtualReasoningPreferenceToSession();
            this.addPromptToHistory(prompt);
            this.queryInFlight = true;
            try {
                await query(effectivePrompt, effectiveMode, capabilityOverrides, genericCapabilitySelections);
            }
            finally {
                this.queryInFlight = false;
                await this.clearCyberVinciPlaybookMentionSelectionIfCurrent();
            }
        };
    }
    async routeSelectedAgentPlaybookThroughChat(playbookId, prompt, query, mode, capabilityOverrides, genericCapabilitySelections) {
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
        this.applyVirtualReasoningPreferenceToSession();
        this.addPromptToHistory(prompt);
        this.queryInFlight = true;
        try {
            await query(prompt, effectiveMode, capabilityOverrides, genericCapabilitySelections);
        }
        finally {
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
    async resolveChatAgentForPlaybook(playbookId) {
        if (!playbookId || playbookId === cybervinci_playbook_runtime_1.CYBERVINCI_DIRECT_CHAT_PLAYBOOK_ID || playbookId === cybervinci_playbook_runtime_1.CYBERVINCI_AI_CHAT_FLOW_ROUTE_PLAYBOOK_ID) {
            return undefined;
        }
        const nativeAgentId = this.agentIdFromNativePlaybook(playbookId);
        const nativeAgent = nativeAgentId ? this.chatAgentService.getAgent(nativeAgentId) : undefined;
        if (nativeAgent) {
            return nativeAgent;
        }
        try {
            const manifest = await this.cyberVinciExperienceService.getDeclarativeChatAgentManifest();
            const definition = manifest.agents.find(agent => agent.kind !== 'profile' &&
                (agent.defaultPlaybook === playbookId || agent.playbooks?.includes(playbookId)));
            if (!definition) {
                return undefined;
            }
            return this.chatAgentService.getAgent(definition.id)
                ?? (definition.sourceAgentId ? this.chatAgentService.getAgent(definition.sourceAgentId) : undefined);
        }
        catch (error) {
            console.warn(`Could not resolve CyberVinci chat agent for Playbook '${playbookId}':`, error);
            return undefined;
        }
    }
    agentIdFromNativePlaybook(playbookId) {
        return playbookId.startsWith(cybervinci_playbook_runtime_1.CYBERVINCI_NATIVE_AGENT_PLAYBOOK_PREFIX)
            ? playbookId.slice(cybervinci_playbook_runtime_1.CYBERVINCI_NATIVE_AGENT_PLAYBOOK_PREFIX.length)
            : undefined;
    }
    setupEditorEventListeners() {
        super.setupEditorEventListeners();
        this.cyberVinciActivePlaybookId = this.getCyberVinciPlaybookId();
        if (this.preferenceService) {
            this.toDispose.push(this.preferenceService.onPreferenceChanged(event => {
                if (event.preferenceName === cybervinci_ai_chat_experience_preferences_1.CYBERVINCI_AI_CHAT_PLAYBOOK_PREF) {
                    this.handleCyberVinciPlaybookPreferenceChange().catch(error => {
                        console.warn('Could not sync CyberVinci Playbook state:', error);
                    });
                }
            }));
        }
        const editor = this.editorRef?.getControl();
        if (!editor) {
            return;
        }
        this.toDispose.push(editor.onDidChangeModelContent(() => this.scheduleCyberVinciPlaybookMentionSync()));
        this.scheduleCyberVinciPlaybookMentionSync();
    }
    async handleCyberVinciPlaybookPreferenceChange() {
        const previousPlaybookId = this.cyberVinciActivePlaybookId;
        const nextPlaybookId = this.getCyberVinciPlaybookId();
        this.cyberVinciActivePlaybookId = nextPlaybookId;
        if (!previousPlaybookId || previousPlaybookId === nextPlaybookId) {
            return;
        }
        await this.clearPinnedAgentForPlaybook(previousPlaybookId);
    }
    async clearPinnedAgentForPlaybook(playbookId) {
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
    addPromptToHistory(prompt) {
        if (this.configuration?.enablePromptHistory !== false && prompt.trim()) {
            this.historyService.addToHistory(prompt);
            this.navigationState.stopNavigation();
        }
    }
    getCyberVinciPlaybookId() {
        return this.preferenceService?.get(cybervinci_ai_chat_experience_preferences_1.CYBERVINCI_AI_CHAT_PLAYBOOK_PREF, cybervinci_playbook_runtime_1.CYBERVINCI_DIRECT_CHAT_PLAYBOOK_ID)?.trim()
            || cybervinci_playbook_runtime_1.CYBERVINCI_DIRECT_CHAT_PLAYBOOK_ID;
    }
    scheduleCyberVinciPlaybookMentionSync() {
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
    async syncCyberVinciPlaybookMentionSelection() {
        const prompt = this.editorRef?.getControl().getValue() ?? '';
        const mention = await this.findCyberVinciPlaybookMention(prompt);
        if (mention) {
            this.cyberVinciLastMentionPlaybookId = mention.id;
            if (this.getCyberVinciPlaybookId() !== mention.id) {
                await this.preferenceService?.set(cybervinci_ai_chat_experience_preferences_1.CYBERVINCI_AI_CHAT_PLAYBOOK_PREF, mention.id, preferences_1.PreferenceScope.User);
            }
            return;
        }
        if (this.queryInFlight && !prompt.trim()) {
            return;
        }
        await this.clearCyberVinciPlaybookMentionSelectionIfCurrent();
    }
    async clearCyberVinciPlaybookMentionSelectionIfCurrent() {
        const lastMentionPlaybookId = this.cyberVinciLastMentionPlaybookId;
        if (!lastMentionPlaybookId) {
            return;
        }
        this.cyberVinciLastMentionPlaybookId = undefined;
        if (this.getCyberVinciPlaybookId() === lastMentionPlaybookId) {
            await this.preferenceService?.set(cybervinci_ai_chat_experience_preferences_1.CYBERVINCI_AI_CHAT_PLAYBOOK_PREF, cybervinci_playbook_runtime_1.CYBERVINCI_DIRECT_CHAT_PLAYBOOK_ID, preferences_1.PreferenceScope.User);
        }
    }
    async findCyberVinciPlaybookMention(prompt) {
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
    async getCyberVinciPlaybookMentionCandidates() {
        if (this.cyberVinciPlaybookMentionCandidates) {
            return this.cyberVinciPlaybookMentionCandidates;
        }
        if (!this.cyberVinciPlaybookMentionCandidatesPromise) {
            this.cyberVinciPlaybookMentionCandidatesPromise = this.cyberVinciExperienceService.listPlaybooks()
                .then(playbooks => playbooks
                .filter(playbook => playbook.enabled !== false && playbook.id !== cybervinci_playbook_runtime_1.CYBERVINCI_DIRECT_CHAT_PLAYBOOK_ID)
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
    createCyberVinciPlaybookMentionAliases(playbook) {
        const aliases = new Set();
        const add = (value) => {
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
    promptContainsCyberVinciPlaybookMention(prompt, alias) {
        const escapedAlias = alias.split(/\s+/)
            .map(segment => segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
            .join('[\\s_-]+');
        return new RegExp(`(^|\\s)@${escapedAlias}(?=$|[\\s.,;:!?\\)\\]\\}])`, 'i').test(prompt);
    }
    getCyberVinciFlowChatMode() {
        return (0, cybervinci_chat_ai_execution_controls_1.normalizeCyberVinciFlowChatMode)(this.preferenceService?.get(cybervinci_ai_chat_experience_preferences_1.CYBERVINCI_AI_CHAT_FLOW_MODE_PREF, 'chat'));
    }
    getCyberVinciChatRequestModeId() {
        return (0, cybervinci_chat_ai_execution_controls_1.cyberVinciChatModeToRequestModeId)(this.preferenceService?.get(cybervinci_ai_chat_experience_preferences_1.CYBERVINCI_AI_CHAT_MODE_PREF, 'chat'));
    }
    applyVirtualReasoningPreferenceToSession() {
        const mode = (0, cybervinci_chat_ai_execution_controls_1.normalizeVirtualReasoningMode)(this.preferenceService?.get(cybervinci_ai_chat_experience_preferences_1.CYBERVINCI_AI_CHAT_VIRTUAL_REASONING_MODE_PREF, 'off'));
        this.applyVirtualReasoningToSession(mode === 'off' ? undefined : { enabled: true, mode });
    }
    applyVirtualReasoningToSession(virtualReasoning) {
        const session = this.chatService.getSessions().find(s => s.model.id === this._chatModel?.id);
        if (!session) {
            return;
        }
        const currentSettings = (session.model.settings ?? {});
        const currentVirtualReasoning = currentSettings.virtualReasoning ?? currentSettings.commonSettings?.virtualReasoning;
        if ((currentVirtualReasoning?.enabled ?? false) === (virtualReasoning?.enabled ?? false) &&
            (0, cybervinci_chat_ai_execution_controls_1.normalizeVirtualReasoningMode)(currentVirtualReasoning?.mode) === (0, cybervinci_chat_ai_execution_controls_1.normalizeVirtualReasoningMode)(virtualReasoning?.mode)) {
            return;
        }
        const newCommon = { ...(currentSettings.commonSettings ?? {}) };
        const newSettings = { ...currentSettings, commonSettings: newCommon };
        if (virtualReasoning?.enabled) {
            newSettings.virtualReasoning = { ...virtualReasoning };
            newCommon.virtualReasoning = { ...virtualReasoning };
        }
        else {
            delete newSettings.virtualReasoning;
            delete newCommon.virtualReasoning;
        }
        session.model.setSettings(newSettings);
    }
    async runCyberVinciFlowRoute(prompt, flowMode) {
        if (flowMode === 'saved' && !this.getSavedFlowWorkflowId()) {
            return false;
        }
        try {
            const result = await this.cyberVinciPlaybookRuntime.runPlaybookById(cybervinci_playbook_runtime_1.CYBERVINCI_AI_CHAT_FLOW_ROUTE_PLAYBOOK_ID, prompt, {
                ...this.withCyberVinciFlowExecutionSelection({
                    prompt,
                    flowMode,
                    preferSaved: true,
                    ...(flowMode === 'saved' ? { workflowId: this.getSavedFlowWorkflowId() } : {})
                }, flowMode)
            });
            return result.ok === true && result.stop === true;
        }
        catch (error) {
            this.messageService.warn(`Could not route AI Chat through Flow playbook: ${error instanceof Error ? error.message : String(error)}`);
            return false;
        }
    }
    async runLegacyFlowCommand(prompt, flowMode) {
        if (flowMode === 'dynamic') {
            await this.commandService.executeCommand(FLOW_RUN_DYNAMIC_WORKFLOW_COMMAND, this.withCyberVinciFlowExecutionSelection({
                prompt,
                preferSaved: true
            }, FLOW_RUN_DYNAMIC_WORKFLOW_COMMAND));
            return;
        }
        const workflowId = this.getSavedFlowWorkflowId();
        await this.commandService.executeCommand(FLOW_START_WORKFLOW_COMMAND, {
            prompt,
            ...(workflowId ? { workflowId } : { selectWorkflow: true })
        });
    }
    getSavedFlowWorkflowId() {
        return this.preferenceService?.get(cybervinci_ai_chat_experience_preferences_1.CYBERVINCI_AI_CHAT_SAVED_WORKFLOW_PREF, '')?.trim() ?? '';
    }
    withCyberVinciFlowExecutionSelection(options, modeOrCommandId) {
        const shouldInheritChatExecution = modeOrCommandId === 'dynamic' || modeOrCommandId === FLOW_RUN_DYNAMIC_WORKFLOW_COMMAND;
        if (!shouldInheritChatExecution || !this.preferenceService) {
            return options;
        }
        return {
            ...options,
            execution: (0, cybervinci_chat_ai_execution_controls_1.readChatAiExecutionFromPreferences)(this.preferenceService)
        };
    }
    parseCyberVinciFlowChatCommand(prompt) {
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
    async updateReasoningSupport(agentId) {
        await super.updateReasoningSupport(agentId);
        if (this.currentReasoningSupport) {
            this.currentReasoningSupport = undefined;
            this.update();
        }
    }
};
exports.CyberVinciAIChatInputWidget = CyberVinciAIChatInputWidget;
tslib_1.__decorate([
    (0, inversify_1.inject)(common_2.CyberVinciAiChatExperienceService),
    tslib_1.__metadata("design:type", Object)
], CyberVinciAIChatInputWidget.prototype, "cyberVinciExperienceService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(cybervinci_playbook_runtime_1.CyberVinciPlaybookRuntime),
    tslib_1.__metadata("design:type", cybervinci_playbook_runtime_1.CyberVinciPlaybookRuntime)
], CyberVinciAIChatInputWidget.prototype, "cyberVinciPlaybookRuntime", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(common_1.FlowService),
    (0, inversify_1.optional)(),
    tslib_1.__metadata("design:type", Object)
], CyberVinciAIChatInputWidget.prototype, "cyberVinciFlowService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_1.WorkspaceService),
    (0, inversify_1.optional)(),
    tslib_1.__metadata("design:type", Object)
], CyberVinciAIChatInputWidget.prototype, "cyberVinciWorkspaceService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.ContributionProvider),
    (0, inversify_1.named)(chat_input_widget_1.AIChatInputOptionsContribution),
    (0, inversify_1.optional)(),
    tslib_1.__metadata("design:type", Object)
], CyberVinciAIChatInputWidget.prototype, "inputOptionsContributions", void 0);
exports.CyberVinciAIChatInputWidget = CyberVinciAIChatInputWidget = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], CyberVinciAIChatInputWidget);
const CyberVinciFlowGateInlinePanel = ({ flowService, workspaceService, disabled }) => {
    const [pendingGates, setPendingGates] = React.useState([]);
    const [error, setError] = React.useState();
    const [refreshNonce, setRefreshNonce] = React.useState(0);
    React.useEffect(() => {
        let disposed = false;
        const load = async () => {
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
                const candidateMap = new Map();
                const scopeErrors = [];
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
                    }
                    catch (cause) {
                        scopeErrors.push(cause instanceof Error ? cause.message : String(cause));
                    }
                }
                if (candidateMap.size === 0 && scopeErrors.length === scopes.length) {
                    throw new Error(scopeErrors.join('; '));
                }
                const candidates = Array.from(candidateMap.values())
                    .sort((left, right) => String(right.run.updatedAt || '').localeCompare(String(left.run.updatedAt || '')))
                    .slice(0, 3);
                const workflows = new Map();
                await Promise.all(candidates.map(async (candidate) => {
                    try {
                        const key = `${candidate.workspaceRootUri || 'global'}:${candidate.run.workflowId}`;
                        if (!workflows.has(key)) {
                            workflows.set(key, await flowService.getWorkflow({
                                workspaceRootUri: candidate.workspaceRootUri,
                                workflowId: candidate.run.workflowId
                            }));
                        }
                    }
                    catch {
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
            }
            catch (cause) {
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
    return React.createElement("div", { className: 'cybervinci-flow-gate-panel' },
        React.createElement("div", { className: 'cybervinci-flow-gate-panel-header' },
            React.createElement("span", { className: 'codicon codicon-feedback' }),
            React.createElement("strong", null, "Flow aguardando decis\u00E3o humana"),
            React.createElement("button", { type: 'button', className: 'cybervinci-flow-gate-icon-button', title: 'Atualizar gates pendentes', onClick: () => setRefreshNonce(value => value + 1) },
                React.createElement("span", { className: 'codicon codicon-refresh' }))),
        error && React.createElement("div", { className: 'cybervinci-flow-gate-error' }, error),
        pendingGates.map(item => (React.createElement(CyberVinciFlowGateInlineCard, { key: `${item.run.id}:${item.gate.id}`, item: item, flowService: flowService, disabled: disabled, onDecided: () => setRefreshNonce(value => value + 1) }))));
};
const CyberVinciFlowGateInlineCard = ({ item, flowService, disabled, onDecided }) => {
    const decisions = item.gate.decisions?.length ? item.gate.decisions : defaultFlowGateDecisions();
    const [decisionId, setDecisionId] = React.useState(decisions[0]?.id || 'approved');
    const [targetStateId, setTargetStateId] = React.useState('');
    const [note, setNote] = React.useState('');
    const [busy, setBusy] = React.useState(false);
    const [error, setError] = React.useState();
    const selectedDecision = decisions.find(decision => decision.id === decisionId) || decisions[0];
    const workflowStates = item.workflow ? Object.keys(item.workflow.states || {}) : [];
    const canSelectTarget = Boolean(selectedDecision?.allowTargetSelection);
    const targetValue = canSelectTarget ? targetStateId || selectedDecision?.to || '' : selectedDecision?.to || targetStateId || '';
    const decide = async () => {
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
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : String(cause));
        }
        finally {
            setBusy(false);
        }
    };
    return React.createElement("div", { className: 'cybervinci-flow-gate-card' },
        React.createElement("div", { className: 'cybervinci-flow-gate-title-row' },
            React.createElement("div", null,
                React.createElement("strong", null, item.gate.title || item.gate.id),
                React.createElement("span", null, item.workflow?.name || item.run.workflowId)),
            React.createElement("code", null, item.run.id.slice(0, 8))),
        item.gate.prompt && React.createElement("p", null, item.gate.prompt),
        React.createElement("div", { className: 'cybervinci-flow-gate-controls' },
            React.createElement("label", null,
                React.createElement("span", null, "Decis\u00E3o"),
                React.createElement("select", { value: decisionId, disabled: disabled || busy, onChange: event => {
                        setDecisionId(event.currentTarget.value);
                        setTargetStateId('');
                    } }, decisions.map(decision => React.createElement("option", { key: decision.id, value: decision.id }, decision.label || decision.id)))),
            React.createElement("label", { className: canSelectTarget ? undefined : 'disabled' },
                React.createElement("span", null, "Pr\u00F3xima etapa"),
                React.createElement("select", { value: targetValue, disabled: disabled || busy || !canSelectTarget || workflowStates.length === 0, onChange: event => setTargetStateId(event.currentTarget.value) },
                    React.createElement("option", { value: '' }, selectedDecision?.to ? selectedDecision.to : 'Padrão do gate'),
                    workflowStates.map(stateId => React.createElement("option", { key: stateId, value: stateId }, stateId))))),
        React.createElement("textarea", { value: note, disabled: disabled || busy, placeholder: 'Instru\u00E7\u00E3o opcional para esta decis\u00E3o', onChange: event => setNote(event.currentTarget.value) }),
        error && React.createElement("div", { className: 'cybervinci-flow-gate-error' }, error),
        React.createElement("div", { className: 'cybervinci-flow-gate-actions' },
            React.createElement("button", { type: 'button', disabled: disabled || busy, onClick: decide }, busy ? 'Aplicando...' : selectedDecision?.label || 'Aplicar decisão')));
};
function defaultFlowGateDecisions() {
    return [
        { id: 'approved', label: 'Aprovar', outcome: 'approved' },
        { id: 'revision_requested', label: 'Pedir ajustes', outcome: 'revision_requested', action: 'wait', allowTargetSelection: true, requireNote: true },
        { id: 'rejected', label: 'Rejeitar', outcome: 'rejected', action: 'fail', requireNote: true }
    ];
}
function flowGateStatusForDecision(decision) {
    const normalized = String(decision.outcome || decision.id || '').toLowerCase();
    if (normalized === 'rejected' || decision.action === 'fail') {
        return 'rejected';
    }
    if (normalized === 'revision_requested'
        || normalized === 'changes_requested'
        || decision.action === 'wait'
        || decision.action === 'pause'
        || decision.allowTargetSelection) {
        return 'revision_requested';
    }
    return 'approved';
}
//# sourceMappingURL=cybervinci-ai-chat-input-widget.js.map
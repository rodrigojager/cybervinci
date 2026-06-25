// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { AgentService, AISettingsService, ToolInvocationRegistry, ToolRequest } from '@theia/ai-core';
import { ChatAgent, ChatAgentLocation, ChatAgentService } from '@theia/ai-chat/lib/common';
import { Command, CommandContribution, CommandRegistry, ILogger, MessageService, QuickInputService, URI } from '@theia/core';
import { ApplicationShell, FrontendApplicationContribution, open, OpenerService } from '@theia/core/lib/browser';
import { ClipboardService } from '@theia/core/lib/browser/clipboard-service';
import { PreferenceScope, PreferenceService } from '@theia/core/lib/common/preferences';
import { QuickPickItem, QuickPickService } from '@theia/core/lib/common/quick-pick-service';
import { inject, injectable, optional } from '@theia/core/shared/inversify';
import {
    CyberVinciAiChatExperienceService,
    CyberVinciCatalogItemKind,
    CyberVinciDeclarativeChatAgent,
    CyberVinciDeclarativeTool,
    CyberVinciMarketplaceItem,
    CyberVinciPlaybookState,
    redactCyberVinciSecrets
} from '../common';
import { CyberVinciDeclarativePromptChatAgent, CyberVinciDelegatingChatAgent } from './cybervinci-declarative-chat-agent';
import { CYBERVINCI_AI_CHAT_PLAYBOOK_PREF } from './cybervinci-ai-chat-experience-preferences';
import {
    CYBERVINCI_DIRECT_CHAT_PLAYBOOK_ID,
    CYBERVINCI_NATIVE_AGENT_PLAYBOOK_PREFIX,
    CYBERVINCI_PLAYBOOK_RUN_HISTORY_STORAGE_KEY,
    CyberVinciPlaybookRunRecord,
    CyberVinciPlaybookRuntime
} from './cybervinci-playbook-runtime';
import { CyberVinciToolRegistry } from './cybervinci-tool-registry';

export const CYBERVINCI_RELOAD_DECLARATIVE_CHAT_AGENTS_COMMAND: Command = {
    id: 'cybervinci.aiChat.reloadDeclarativeAgents',
    label: 'CyberVinci: Reload Declarative Chat Agents'
};

export const CYBERVINCI_SHOW_PLAYBOOK_RUNS_COMMAND: Command = {
    id: 'cybervinci.aiChat.showPlaybookRuns',
    label: 'CyberVinci: Show Playbook Runs'
};

export const CYBERVINCI_SHOW_CATALOG_DIAGNOSTICS_COMMAND: Command = {
    id: 'cybervinci.aiChat.showCatalogDiagnostics',
    label: 'CyberVinci: Show AI Chat Catalog Diagnostics'
};

export const CYBERVINCI_SHOW_AGENT_MANAGER_COMMAND: Command = {
    id: 'cybervinci.aiChat.showAgentManager',
    label: 'CyberVinci: Show Agents'
};

export const CYBERVINCI_SHOW_TOOL_MANAGER_COMMAND: Command = {
    id: 'cybervinci.aiChat.showToolManager',
    label: 'CyberVinci: Show Tools'
};

export const CYBERVINCI_SHOW_PLAYBOOK_MANAGER_COMMAND: Command = {
    id: 'cybervinci.aiChat.showPlaybookManager',
    label: 'CyberVinci: Show Playbooks'
};

export const CYBERVINCI_SHOW_LOCAL_MARKETPLACE_COMMAND: Command = {
    id: 'cybervinci.aiChat.showLocalMarketplace',
    label: 'CyberVinci: Show Local Marketplace'
};

export const CYBERVINCI_OPEN_CATALOG_PATH_COMMAND: Command = {
    id: 'cybervinci.aiChat.openCatalogPath',
    label: 'CyberVinci: Open Catalog Path'
};

export const CyberVinciDeclarativePromptChatAgentFactory = Symbol('CyberVinciDeclarativePromptChatAgentFactory');
export type CyberVinciDeclarativePromptChatAgentFactory = () => CyberVinciDeclarativePromptChatAgent;

const CYBERVINCI_DECLARATIVE_TOOL_PROVIDER = 'cybervinci-declarative-tools';
const CYBERVINCI_NATIVE_AGENT_OVERLAY = Symbol.for('cybervinci.aiChat.nativeAgentOverlay');

interface CyberVinciNativeAgentOverlayState {
    originalInvoke: ChatAgent['invoke'];
    definition: CyberVinciDeclarativeChatAgent;
}

type CyberVinciPlaybookRunPick = QuickPickItem & (
    { action: 'inspect'; runIndex: number }
    | { action: 'filter-status' }
    | { action: 'filter-playbook' }
    | { action: 'compare-runs' }
    | { action: 'copy-summary-json' }
    | { action: 'copy-summary-markdown' }
);

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

type CyberVinciPlaybookRunArtifactPick = QuickPickItem & (
    { action: 'inspect-artifact'; artifact: CyberVinciPlaybookRunArtifact }
    | { action: 'copy-artifacts-json' }
    | { action: 'copy-artifacts-markdown' }
);

@injectable()
export class CyberVinciDeclarativeChatAgentContribution implements FrontendApplicationContribution, CommandContribution {

    @inject(CyberVinciAiChatExperienceService)
    protected readonly service: CyberVinciAiChatExperienceService;

    @inject(CyberVinciDeclarativePromptChatAgentFactory)
    protected readonly promptAgentFactory: CyberVinciDeclarativePromptChatAgentFactory;

    @inject(AgentService)
    protected readonly agentService: AgentService;

    @inject(ChatAgentService)
    protected readonly chatAgentService: ChatAgentService;

    @inject(ToolInvocationRegistry)
    protected readonly toolInvocationRegistry: ToolInvocationRegistry;

    @inject(CyberVinciPlaybookRuntime)
    protected readonly playbookRuntime: CyberVinciPlaybookRuntime;

    @inject(CyberVinciToolRegistry)
    protected readonly toolRegistry: CyberVinciToolRegistry;

    @inject(ILogger)
    protected readonly logger: ILogger;

    @inject(MessageService)
    protected readonly messageService: MessageService;

    @inject(OpenerService)
    protected readonly openerService: OpenerService;

    @inject(ApplicationShell)
    protected readonly shell: ApplicationShell;

    @inject(ClipboardService)
    protected readonly clipboardService: ClipboardService;

    @inject(QuickPickService) @optional()
    protected readonly quickPickService: QuickPickService | undefined;

    @inject(QuickInputService) @optional()
    protected readonly quickInputService: QuickInputService | undefined;

    @inject(AISettingsService) @optional()
    protected readonly aiSettingsService: AISettingsService | undefined;

    @inject(PreferenceService)
    protected readonly preferenceService: PreferenceService;

    protected readonly registeredAgentIds = new Set<string>();

    registerCommands(registry: CommandRegistry): void {
        registry.registerCommand(CYBERVINCI_RELOAD_DECLARATIVE_CHAT_AGENTS_COMMAND, {
            execute: () => this.refreshDeclarativeChatAgents()
        });
        registry.registerCommand(CYBERVINCI_SHOW_PLAYBOOK_RUNS_COMMAND, {
            execute: () => this.showRecentPlaybookRuns()
        });
        registry.registerCommand(CYBERVINCI_SHOW_CATALOG_DIAGNOSTICS_COMMAND, {
            execute: () => this.showCatalogDiagnostics()
        });
        registry.registerCommand(CYBERVINCI_SHOW_AGENT_MANAGER_COMMAND, {
            execute: () => this.showAgentManager()
        });
        registry.registerCommand(CYBERVINCI_SHOW_TOOL_MANAGER_COMMAND, {
            execute: () => this.showToolManager()
        });
        registry.registerCommand(CYBERVINCI_SHOW_PLAYBOOK_MANAGER_COMMAND, {
            execute: () => this.showPlaybookManager()
        });
        registry.registerCommand(CYBERVINCI_SHOW_LOCAL_MARKETPLACE_COMMAND, {
            execute: () => this.showLocalMarketplace()
        });
        registry.registerCommand(CYBERVINCI_OPEN_CATALOG_PATH_COMMAND, {
            execute: (filePath?: string) => this.openCatalogPath(filePath)
        });
    }

    onStart(): void {
        this.refreshDeclarativeChatAgents().catch(error => {
            this.logger.error('Failed to load CyberVinci declarative chat agents:', error);
        });
    }

    async refreshDeclarativeChatAgents(): Promise<void> {
        const manifest = await this.service.getDeclarativeChatAgentManifest();
        this.unregisterDynamicAgents();
        this.registerDeclarativeTools(manifest.tools ?? []);
        for (const definition of this.withRuntimeNativeAgents(manifest.agents)) {
            await this.registerDeclarativeAgent(definition);
        }
    }

    protected withRuntimeNativeAgents(definitions: CyberVinciDeclarativeChatAgent[]): CyberVinciDeclarativeChatAgent[] {
        const byId = new Map<string, CyberVinciDeclarativeChatAgent>();
        for (const definition of definitions) {
            byId.set(definition.id, definition);
        }
        for (const agent of this.chatAgentService.getAllAgents()) {
            if (byId.has(agent.id)) {
                continue;
            }
            byId.set(agent.id, this.toRuntimeNativeAgentDefinition(agent));
        }
        return [...byId.values()];
    }

    protected toRuntimeNativeAgentDefinition(agent: ChatAgent): CyberVinciDeclarativeChatAgent {
        const defaultPlaybook = this.nativeAgentPlaybookId(agent.id);
        return {
            version: 'cybervinci.agent/v1',
            kind: 'native',
            source: 'runtime',
            id: agent.id,
            sourceAgentId: agent.id,
            name: agent.name,
            description: agent.description,
            iconClass: agent.iconClass,
            locations: agent.locations?.map(location => String(location)) ?? undefined,
            tags: agent.tags,
            variables: agent.variables,
            functions: agent.functions,
            defaultPlaybook,
            playbooks: [defaultPlaybook],
            tools: ['core.agent.describe', 'core.agent.preflight', 'system.agent.nativeMcpRequirements'],
            modes: agent.modes?.map(mode => ({
                id: mode.id,
                name: mode.name,
                isDefault: mode.isDefault
            })),
            languageModelRequirements: agent.languageModelRequirements?.map(requirement => ({
                purpose: requirement.purpose,
                identifier: requirement.identifier,
                name: requirement.name,
                vendor: requirement.vendor,
                version: requirement.version,
                family: requirement.family,
                tokens: requirement.tokens
            })),
            preserveNative: {
                invoke: false,
                modes: true,
                prompts: true,
                variables: true,
                functions: true,
                languageModelRequirements: true
            }
        };
    }

    protected nativeAgentPlaybookId(agentId: string): string {
        return `${CYBERVINCI_NATIVE_AGENT_PLAYBOOK_PREFIX}${agentId}`;
    }

    protected unregisterDynamicAgents(): void {
        for (const id of this.registeredAgentIds) {
            this.chatAgentService.unregisterChatAgent(id);
            this.agentService.unregisterAgent(id);
        }
        this.registeredAgentIds.clear();
    }

    protected registerDeclarativeTools(tools: CyberVinciDeclarativeTool[]): void {
        this.toolInvocationRegistry.unregisterAllTools(CYBERVINCI_DECLARATIVE_TOOL_PROVIDER);
        for (const tool of tools.filter(candidate => candidate.exposeToModel !== false)) {
            this.toolInvocationRegistry.registerTool(this.toToolRequest(tool));
        }
    }

    protected toToolRequest(tool: CyberVinciDeclarativeTool): ToolRequest {
        return {
            id: tool.id,
            name: tool.name,
            description: tool.description,
            providerName: CYBERVINCI_DECLARATIVE_TOOL_PROVIDER,
            parameters: {
                type: 'object',
                properties: (tool.parameters?.properties ?? {}) as ToolRequest['parameters']['properties'],
                required: tool.parameters?.required
            },
            handler: async argsJson => {
                const result = await this.service.executeDeclarativeTool(tool.id, argsJson);
                const output = [
                    result.stdout.trim(),
                    result.stderr.trim() ? `stderr:\n${result.stderr.trim()}` : '',
                    result.exitCode !== 0 && result.exitCode !== null ? `exitCode: ${result.exitCode}` : ''
                ].filter(Boolean).join('\n\n');
                const content = result.exitCode === 0
                    ? [{ type: 'text' as const, text: output || `Tool '${tool.id}' completed.` }]
                    : [{ type: 'error' as const, data: output || `Tool '${tool.id}' completed with exit code ${result.exitCode}.` }];
                return {
                    content
                };
            }
        };
    }

    protected async registerDeclarativeAgent(definition: CyberVinciDeclarativeChatAgent): Promise<void> {
        if (definition.kind === 'native') {
            this.applyNativeAgentOverlay(definition);
            await this.applyChatVisibility(definition);
            return;
        }
        if (definition.kind === 'delegate') {
            this.registerDelegateAgent(definition);
            await this.applyChatVisibility(definition);
            return;
        }
        await this.registerPromptAgent(definition);
        await this.applyChatVisibility(definition);
    }

    protected applyNativeAgentOverlay(definition: CyberVinciDeclarativeChatAgent): void {
        const sourceAgentId = definition.sourceAgentId ?? definition.id;
        const agent = this.chatAgentService.getAllAgents().find(candidate => candidate.id === sourceAgentId);
        if (!agent) {
            this.logger.warn(`CyberVinci native declarative agent '${sourceAgentId}' was not found for metadata overlay.`);
            return;
        }
        const mutable = agent as ChatAgent & {
            id: string;
            name: string;
            description: string;
            iconClass?: string;
            tags?: string[];
            locations?: ChatAgentLocation[];
            languageModelRequirements?: ChatAgent['languageModelRequirements'];
            variables?: string[];
            functions?: string[];
            defaultPlaybook?: string;
            playbooks?: string[];
        };
        mutable.name = definition.name ?? mutable.name;
        mutable.description = definition.description ?? mutable.description;
        mutable.iconClass = definition.iconClass ?? mutable.iconClass;
        mutable.tags = definition.tags ?? mutable.tags;
        mutable.locations = definition.locations?.length
            ? definition.locations.map(location => ChatAgentLocation.fromRaw(location))
            : mutable.locations;
        mutable.languageModelRequirements = definition.languageModelRequirements?.length
            ? definition.languageModelRequirements
            : mutable.languageModelRequirements;
        mutable.variables = definition.variables ?? mutable.variables;
        mutable.functions = definition.functions ?? mutable.functions;
        const defaultPlaybook = definition.defaultPlaybook ?? this.nativeAgentPlaybookId(definition.sourceAgentId ?? definition.id);
        mutable.defaultPlaybook = defaultPlaybook;
        mutable.playbooks = definition.playbooks ?? [defaultPlaybook];
        this.applyNativeAgentInvokeOverlay(mutable, {
            ...definition,
            defaultPlaybook
        });
    }

    protected registerDelegateAgent(definition: CyberVinciDeclarativeChatAgent): void {
        const sourceAgentId = definition.sourceAgentId ?? definition.id;
        if (definition.id === sourceAgentId) {
            return;
        }
        if (this.chatAgentService.getAllAgents().some(agent => agent.id === definition.id)) {
            this.logger.warn(`CyberVinci declarative agent '${definition.id}' was skipped because an agent with that id already exists.`);
            return;
        }
        const agent = new CyberVinciDelegatingChatAgent(definition, id => this.chatAgentService.getAgent(id), this.playbookRuntime);
        this.registerDynamicAgent(agent);
    }

    protected async registerPromptAgent(definition: CyberVinciDeclarativeChatAgent): Promise<void> {
        if (this.chatAgentService.getAllAgents().some(agent => agent.id === definition.id)) {
            this.logger.warn(`CyberVinci prompt agent '${definition.id}' was skipped because an agent with that id already exists.`);
            return;
        }
        const agentProfile = definition.agentProfile ?? definition.agencyProfile;
        const agencyProfile = agentProfile
            ? await this.service.readAgent(agentProfile)
            : undefined;
        const agent = this.promptAgentFactory();
        agent.configure(definition, agencyProfile?.content);
        this.registerDynamicAgent(agent);
    }

    protected registerDynamicAgent(agent: CyberVinciDelegatingChatAgent | CyberVinciDeclarativePromptChatAgent): void {
        this.chatAgentService.registerChatAgent(agent);
        this.agentService.registerAgent(agent);
        this.registeredAgentIds.add(agent.id);
    }

    protected async applyChatVisibility(definition: CyberVinciDeclarativeChatAgent): Promise<void> {
        if (definition.showInChat === undefined || !this.aiSettingsService) {
            return;
        }
        const current = await this.aiSettingsService.getAgentSettings(definition.id);
        if (current?.showInChat !== definition.showInChat) {
            await this.aiSettingsService.updateAgentSettings(definition.id, {
                ...(current ?? {}),
                showInChat: definition.showInChat
            });
        }
    }

    protected async showRecentPlaybookRuns(): Promise<void> {
        const runs = this.playbookRuntime.getRecentRuns();
        if (!runs.length) {
            this.messageService.info('No CyberVinci playbook runs recorded yet.');
            return;
        }
        if (!this.quickPickService) {
            const latest = runs[0];
            this.messageService.info(`${latest.playbookId}: ${latest.status} (${latest.durationMs ?? 0}ms, ${latest.events.length} events, ${latest.diagnostics.length} diagnostics)`);
            return;
        }
        const picked = await this.showPlaybookRunPicker(runs, 'CyberVinci Playbook Runs', 'Inspect, filter, compare, or export recent Playbook runs.');
        if (!picked) {
            return;
        }
        await this.handlePlaybookRunPick(picked, runs);
    }

    protected async showPlaybookRunPicker(
        runs: CyberVinciPlaybookRunRecord[],
        title: string,
        placeholder: string
    ): Promise<CyberVinciPlaybookRunPick | undefined> {
        if (!this.quickPickService) {
            return undefined;
        }
        const statusCounts = this.countBy(runs, run => run.status);
        const playbookCounts = this.countBy(runs, run => run.playbookId);
        return this.quickPickService.show<CyberVinciPlaybookRunPick>(
            [
                {
                    action: 'filter-status' as const,
                    label: '$(filter) Filter By Status',
                    description: this.formatCounts(statusCounts),
                    detail: 'Narrow the run list before inspecting or exporting.'
                },
                {
                    action: 'filter-playbook' as const,
                    label: '$(filter) Filter By Playbook',
                    description: this.formatCounts(playbookCounts),
                    detail: 'Narrow the run list to one Playbook id.'
                },
                {
                    action: 'compare-runs' as const,
                    label: '$(git-compare) Compare Runs',
                    description: `${runs.length} available`,
                    detail: 'Choose two runs and compare status, duration, diagnostics, checkpoint, and event counts.'
                },
                {
                    action: 'copy-summary-json' as const,
                    label: '$(json) Copy Runs Summary JSON',
                    description: `${runs.length} run(s)`,
                    detail: 'Copies a compact audit summary for the current run list.'
                },
                {
                    action: 'copy-summary-markdown' as const,
                    label: '$(markdown) Copy Runs Summary Markdown',
                    description: `${runs.length} run(s)`,
                    detail: 'Copies a readable Markdown summary for the current run list.'
                },
                ...runs.map((run, index) => this.playbookRunPickItem(run, index))
            ],
            { title, placeholder }
        );
    }

    protected async handlePlaybookRunPick(picked: CyberVinciPlaybookRunPick, runs: CyberVinciPlaybookRunRecord[]): Promise<void> {
        if (picked.action === 'inspect') {
            await this.showPlaybookRunInspector(runs[picked.runIndex]);
            return;
        }
        if (picked.action === 'filter-status') {
            await this.showPlaybookRunsFilteredByStatus(runs);
            return;
        }
        if (picked.action === 'filter-playbook') {
            await this.showPlaybookRunsFilteredByPlaybook(runs);
            return;
        }
        if (picked.action === 'compare-runs') {
            await this.showPlaybookRunComparisonPicker(runs);
            return;
        }
        if (picked.action === 'copy-summary-json') {
            await this.copyPlaybookRunListJson(runs);
            return;
        }
        if (picked.action === 'copy-summary-markdown') {
            await this.copyPlaybookRunListMarkdown(runs);
        }
    }

    protected playbookRunPickItem(run: CyberVinciPlaybookRunRecord, runIndex: number): CyberVinciPlaybookRunPick {
        return {
            action: 'inspect',
            runIndex,
            label: `${run.playbookId} - ${run.status}`,
            description: run.agentId ? `Agent ${run.agentId}` : undefined,
            detail: [
                `Request: ${run.requestId}`,
                `Started: ${new Date(run.startedAt).toLocaleString()}`,
                `Duration: ${this.runDuration(run)}ms`,
                `Events: ${run.events.length}`,
                run.diagnostics.length ? `Diagnostics: ${run.diagnostics.join(' | ')}` : undefined
            ].filter(Boolean).join(' | ')
        };
    }

    protected async showPlaybookRunsFilteredByStatus(runs: CyberVinciPlaybookRunRecord[]): Promise<void> {
        if (!this.quickPickService) {
            return;
        }
        const statuses = [...new Set(runs.map(run => run.status))].sort();
        const pickedStatus = await this.quickPickService.show<QuickPickItem & { status: CyberVinciPlaybookRunRecord['status'] }>(
            statuses.map(status => ({
                status,
                label: status,
                description: `${runs.filter(run => run.status === status).length} run(s)`
            })),
            {
                title: 'Filter Playbook Runs By Status',
                placeholder: 'Choose a run status.'
            }
        );
        if (!pickedStatus) {
            return;
        }
        const filtered = runs.filter(run => run.status === pickedStatus.status);
        const picked = await this.showPlaybookRunPicker(filtered, `CyberVinci Playbook Runs: ${pickedStatus.status}`, `${filtered.length} run(s) with status ${pickedStatus.status}.`);
        if (picked) {
            await this.handlePlaybookRunPick(picked, filtered);
        }
    }

    protected async showPlaybookRunsFilteredByPlaybook(runs: CyberVinciPlaybookRunRecord[]): Promise<void> {
        if (!this.quickPickService) {
            return;
        }
        const playbooks = [...new Set(runs.map(run => run.playbookId))].sort();
        const pickedPlaybook = await this.quickPickService.show<QuickPickItem & { playbookId: string }>(
            playbooks.map(playbookId => ({
                playbookId,
                label: playbookId,
                description: `${runs.filter(run => run.playbookId === playbookId).length} run(s)`
            })),
            {
                title: 'Filter Playbook Runs By Playbook',
                placeholder: 'Choose a Playbook id.'
            }
        );
        if (!pickedPlaybook) {
            return;
        }
        const filtered = runs.filter(run => run.playbookId === pickedPlaybook.playbookId);
        const picked = await this.showPlaybookRunPicker(filtered, `CyberVinci Playbook Runs: ${pickedPlaybook.playbookId}`, `${filtered.length} run(s) for ${pickedPlaybook.playbookId}.`);
        if (picked) {
            await this.handlePlaybookRunPick(picked, filtered);
        }
    }

    protected async showPlaybookRunInspector(run: CyberVinciPlaybookRunRecord): Promise<void> {
        if (!this.quickPickService) {
            return;
        }
        const [playbook, agent] = await Promise.all([
            this.service.getPlaybook(run.playbookId),
            this.resolveRunAgent(run)
        ]);
        const migrationStatus = await this.resolveRunMigrationStatus(run, agent);
        const picked = await this.quickPickService.show<QuickPickItem & {
            action: 'resume'
                | 'open-playbook-source'
                | 'open-agent-source'
                | 'checkpoint'
                | 'artifacts'
                | 'timeline'
                | 'diagnostics'
                | 'failure-recovery'
                | 'migration-status'
                | 'event'
                | 'diagnostic'
                | 'summary'
                | 'copy-json'
                | 'copy-markdown';
            eventIndex?: number;
            diagnosticIndex?: number;
        }>(
            [
                ...(this.canResumeRun(run) ? [{
                    action: 'resume' as const,
                    label: '$(debug-continue) Resume Run',
                    description: run.checkpoint?.nextStateId ? `Next state: ${run.checkpoint.nextStateId}` : undefined,
                    detail: run.checkpoint?.reason
                }] : []),
                ...(playbook?.sourcePath ? [{
                    action: 'open-playbook-source' as const,
                    label: '$(go-to-file) Open Playbook Source',
                    description: playbook.sourcePath,
                    detail: playbook.description
                }] : []),
                ...(agent?.sourcePath ? [{
                    action: 'open-agent-source' as const,
                    label: '$(go-to-file) Open Agent Source',
                    description: agent.sourcePath,
                    detail: agent.description
                }] : []),
                {
                    action: 'summary' as const,
                    label: 'Summary',
                    description: [run.status, run.agentId ? `agent=${run.agentId}` : undefined, run.sourceAgentId ? `source=${run.sourceAgentId}` : undefined].filter(Boolean).join(' | '),
                    detail: [
                        `request=${run.requestId}`,
                        `playbook=${run.playbookId}`,
                        `duration=${this.runDuration(run)}ms`,
                        `events=${run.events.length}`,
                        `diagnostics=${run.diagnostics.length}`,
                        playbook?.name ? `playbookName=${playbook.name}` : undefined
                    ].filter(Boolean).join(' | ')
                },
                {
                    action: 'copy-json' as const,
                    label: '$(json) Copy Run JSON',
                    description: 'Full audit payload',
                    detail: 'Copies request, status, checkpoint, migration status, events, diagnostics, Playbook metadata, and Agent metadata.'
                },
                {
                    action: 'copy-markdown' as const,
                    label: '$(markdown) Copy Run Markdown',
                    description: 'Readable audit summary',
                    detail: 'Copies a compact Markdown report with status, duration, checkpoint, diagnostics, events, and source links.'
                },
                {
                    action: 'timeline' as const,
                    label: '$(list-tree) Timeline',
                    description: `${run.events.length} event(s)`,
                    detail: 'Inspect the chronological run timeline or copy it as JSON/Markdown with event data redacted.'
                },
                {
                    action: 'diagnostics' as const,
                    label: '$(warning) Diagnostics',
                    description: `${this.playbookRunDiagnostics(run).length} diagnostic item(s)`,
                    detail: 'Inspect diagnostics collected from the run, checkpoint, and failure artifacts.'
                },
                {
                    action: 'checkpoint' as const,
                    label: 'Checkpoint',
                    description: run.checkpoint?.canResume ? `resumable at ${run.checkpoint.nextStateId}` : 'completed snapshot',
                    detail: this.compactJson({
                        nextStateId: run.checkpoint?.nextStateId,
                        canResume: run.checkpoint?.canResume,
                        reason: run.checkpoint?.reason,
                        input: run.checkpoint?.input,
                        stateKeys: Object.keys(run.checkpoint?.state ?? {}),
                        diagnostics: run.checkpoint?.diagnostics
                    })
                },
                {
                    action: 'artifacts' as const,
                    label: '$(archive) Artifacts',
                    description: `${this.playbookRunArtifacts(run).length} artifact(s)`,
                    detail: 'Inspect checkpoint input, state values, diagnostics, and event data as individual run artifacts.'
                },
                ...(run.failureArtifacts ? [{
                    action: 'failure-recovery' as const,
                    label: '$(debug-restart) Failure Recovery',
                    description: run.failureArtifacts.compensation.retryable ? 'retryable' : 'not retryable',
                    detail: this.compactJson({
                        summary: run.failureArtifacts.summary,
                        compensation: run.failureArtifacts.compensation,
                        secondRunSuggestion: run.failureArtifacts.secondRunSuggestion
                    })
                }] : []),
                {
                    action: 'migration-status' as const,
                    label: 'Migration Status',
                    description: this.migrationStatusDescription(migrationStatus),
                    detail: this.compactJson(migrationStatus)
                },
                ...run.events.map((event, index) => ({
                    action: 'event' as const,
                    eventIndex: index,
                    label: `${new Date(event.timestamp).toLocaleTimeString()} ${event.type}${event.stateId ? `:${event.stateId}` : ''}`,
                    description: [event.message, event.durationMs !== undefined ? `${event.durationMs}ms` : undefined].filter(Boolean).join(' | '),
                    detail: event.data ? this.compactJson(event.data) : undefined
                })),
                ...run.diagnostics.map((diagnostic, index) => ({
                    action: 'diagnostic' as const,
                    diagnosticIndex: index,
                    label: `Diagnostic ${index + 1}`,
                    description: diagnostic
                }))
            ],
            {
                title: `CyberVinci Playbook Run: ${run.playbookId}`,
                placeholder: 'Inspect summary, checkpoint, artifacts, migration status, source files, events, and diagnostics.'
            }
        );
        if (!picked) {
            return;
        }
        if (picked.action === 'resume') {
            await this.resumeRunFromCommand(run);
            return;
        }
        if (picked.action === 'open-playbook-source') {
            await this.openCatalogPath(playbook?.sourcePath);
            return;
        }
        if (picked.action === 'open-agent-source') {
            await this.openCatalogPath(agent?.sourcePath);
            return;
        }
        if (picked.action === 'checkpoint') {
            await this.showStructuredRunDetails(`Checkpoint: ${run.requestId}`, {
                playbookId: run.checkpoint?.playbookId,
                nextStateId: run.checkpoint?.nextStateId,
                canResume: run.checkpoint?.canResume,
                reason: run.checkpoint?.reason,
                input: run.checkpoint?.input,
                state: run.checkpoint?.state,
                diagnostics: run.checkpoint?.diagnostics
            });
            return;
        }
        if (picked.action === 'artifacts') {
            await this.showPlaybookRunArtifacts(run);
            return;
        }
        if (picked.action === 'timeline') {
            await this.showPlaybookRunTimeline(run);
            return;
        }
        if (picked.action === 'diagnostics') {
            await this.showPlaybookRunDiagnostics(run);
            return;
        }
        if (picked.action === 'failure-recovery') {
            await this.showStructuredRunDetails(`Failure Recovery: ${run.requestId}`, run.failureArtifacts);
            return;
        }
        if (picked.action === 'migration-status') {
            await this.showStructuredRunDetails(`Migration Status: ${agent?.name ?? run.agentId ?? run.playbookId}`, migrationStatus);
            return;
        }
        if (picked.action === 'event' && picked.eventIndex !== undefined) {
            await this.showStructuredRunDetails(`Run Event: ${run.events[picked.eventIndex]?.type ?? picked.eventIndex}`, run.events[picked.eventIndex]);
            return;
        }
        if (picked.action === 'copy-json') {
            await this.copyPlaybookRunJson(run, playbook, agent, migrationStatus);
            return;
        }
        if (picked.action === 'copy-markdown') {
            await this.copyPlaybookRunMarkdown(run, playbook, agent, migrationStatus);
            return;
        }
        if (picked.action === 'diagnostic' && picked.diagnosticIndex !== undefined) {
            this.messageService.warn(run.diagnostics[picked.diagnosticIndex]);
        }
    }

    protected async showPlaybookRunArtifacts(run: CyberVinciPlaybookRunRecord): Promise<void> {
        if (!this.quickPickService) {
            return;
        }
        const artifacts = this.playbookRunArtifacts(run);
        if (!artifacts.length) {
            this.messageService.info(`Playbook run '${run.requestId}' does not have checkpoint artifacts.`);
            return;
        }
        const picked = await this.quickPickService.show<CyberVinciPlaybookRunArtifactPick>(
            [
                {
                    action: 'copy-artifacts-json' as const,
                    label: '$(json) Copy Artifacts JSON',
                    description: `${artifacts.length} artifact(s)`,
                    detail: 'Copies all navigable checkpoint artifacts with full values.'
                },
                {
                    action: 'copy-artifacts-markdown' as const,
                    label: '$(markdown) Copy Artifacts Markdown',
                    description: `${artifacts.length} artifact(s)`,
                    detail: 'Copies a readable artifact inventory with compact values.'
                },
                ...artifacts.map(artifact => ({
                    action: 'inspect-artifact' as const,
                    artifact,
                    label: artifact.label,
                    description: artifact.description,
                    detail: this.compactJson(artifact.value)
                }))
            ],
            {
                title: `Run Artifacts: ${run.playbookId}`,
                placeholder: 'Open a checkpoint artifact or copy the full artifact inventory.'
            }
        );
        if (!picked) {
            return;
        }
        if (picked.action === 'copy-artifacts-json') {
            await this.clipboardService.writeText(JSON.stringify(this.toPlaybookRunArtifactsExport(run, artifacts), undefined, 2));
            this.messageService.info(`Copied ${artifacts.length} artifact(s) from Playbook run '${run.requestId}' as JSON.`);
            return;
        }
        if (picked.action === 'copy-artifacts-markdown') {
            await this.clipboardService.writeText(this.toPlaybookRunArtifactsMarkdown(run, artifacts));
            this.messageService.info(`Copied ${artifacts.length} artifact(s) from Playbook run '${run.requestId}' as Markdown.`);
            return;
        }
        await this.showStructuredRunDetails(`Run Artifact: ${picked.artifact.source}`, {
            id: picked.artifact.id,
            source: picked.artifact.source,
            value: redactCyberVinciSecrets(picked.artifact.value)
        });
    }

    protected async showPlaybookRunTimeline(run: CyberVinciPlaybookRunRecord): Promise<void> {
        if (!this.quickPickService) {
            return;
        }
        const timeline = this.playbookRunTimeline(run);
        if (!timeline.length) {
            this.messageService.info(`Playbook run '${run.requestId}' does not have timeline events.`);
            return;
        }
        const picked = await this.quickPickService.show<QuickPickItem & (
            { action: 'inspect-timeline'; item: CyberVinciPlaybookRunTimelineItem }
            | { action: 'copy-timeline-json' }
            | { action: 'copy-timeline-markdown' }
        )>(
            [
                {
                    action: 'copy-timeline-json' as const,
                    label: '$(json) Copy Timeline JSON',
                    description: `${timeline.length} event(s)`,
                    detail: 'Copies a redacted chronological event timeline with offsets and event data.'
                },
                {
                    action: 'copy-timeline-markdown' as const,
                    label: '$(markdown) Copy Timeline Markdown',
                    description: `${timeline.length} event(s)`,
                    detail: 'Copies a readable event timeline table plus detailed event data sections.'
                },
                ...timeline.map(item => ({
                    action: 'inspect-timeline' as const,
                    item,
                    label: `${item.index + 1}. ${item.type}${item.stateId ? `:${item.stateId}` : ''}`,
                    description: [`+${item.offsetMs}ms`, item.durationMs !== undefined ? `${item.durationMs}ms` : undefined, item.message].filter(Boolean).join(' | '),
                    detail: item.dataSummary
                }))
            ],
            {
                title: `Run Timeline: ${run.playbookId}`,
                placeholder: 'Inspect a timeline event or copy the complete timeline.'
            }
        );
        if (!picked) {
            return;
        }
        if (picked.action === 'copy-timeline-json') {
            await this.clipboardService.writeText(JSON.stringify(this.toPlaybookRunTimelineExport(run, timeline), undefined, 2));
            this.messageService.info(`Copied ${timeline.length} timeline event(s) from Playbook run '${run.requestId}' as JSON.`);
            return;
        }
        if (picked.action === 'copy-timeline-markdown') {
            await this.clipboardService.writeText(this.toPlaybookRunTimelineMarkdown(run, timeline));
            this.messageService.info(`Copied ${timeline.length} timeline event(s) from Playbook run '${run.requestId}' as Markdown.`);
            return;
        }
        await this.showStructuredRunDetails(`Timeline Event ${picked.item.index + 1}: ${picked.item.type}`, picked.item);
    }

    protected async showPlaybookRunDiagnostics(run: CyberVinciPlaybookRunRecord): Promise<void> {
        if (!this.quickPickService) {
            return;
        }
        const diagnostics = this.playbookRunDiagnostics(run);
        if (!diagnostics.length) {
            this.messageService.info(`Playbook run '${run.requestId}' does not have diagnostics.`);
            return;
        }
        const picked = await this.quickPickService.show<QuickPickItem & (
            { action: 'inspect-diagnostic'; item: CyberVinciPlaybookRunDiagnosticItem }
            | { action: 'copy-diagnostics-json' }
            | { action: 'copy-diagnostics-markdown' }
        )>(
            [
                {
                    action: 'copy-diagnostics-json' as const,
                    label: '$(json) Copy Diagnostics JSON',
                    description: `${diagnostics.length} diagnostic item(s)`,
                    detail: 'Copies all run, checkpoint, and failure diagnostics with source metadata.'
                },
                {
                    action: 'copy-diagnostics-markdown' as const,
                    label: '$(markdown) Copy Diagnostics Markdown',
                    description: `${diagnostics.length} diagnostic item(s)`,
                    detail: 'Copies a readable diagnostics report grouped by source.'
                },
                ...diagnostics.map(item => ({
                    action: 'inspect-diagnostic' as const,
                    item,
                    label: `${item.source} diagnostic ${item.index + 1}`,
                    description: item.message
                }))
            ],
            {
                title: `Run Diagnostics: ${run.playbookId}`,
                placeholder: 'Inspect a diagnostic or copy the complete diagnostics report.'
            }
        );
        if (!picked) {
            return;
        }
        if (picked.action === 'copy-diagnostics-json') {
            await this.clipboardService.writeText(JSON.stringify(this.toPlaybookRunDiagnosticsExport(run, diagnostics), undefined, 2));
            this.messageService.info(`Copied ${diagnostics.length} diagnostic item(s) from Playbook run '${run.requestId}' as JSON.`);
            return;
        }
        if (picked.action === 'copy-diagnostics-markdown') {
            await this.clipboardService.writeText(this.toPlaybookRunDiagnosticsMarkdown(run, diagnostics));
            this.messageService.info(`Copied ${diagnostics.length} diagnostic item(s) from Playbook run '${run.requestId}' as Markdown.`);
            return;
        }
        await this.showStructuredRunDetails(`Run Diagnostic: ${picked.item.source} ${picked.item.index + 1}`, picked.item);
    }

    protected playbookRunTimeline(run: CyberVinciPlaybookRunRecord): CyberVinciPlaybookRunTimelineItem[] {
        return run.events.map((event, index) => {
            const data = event.data !== undefined ? redactCyberVinciSecrets(event.data) : undefined;
            return {
                index,
                timestamp: new Date(event.timestamp).toISOString(),
                offsetMs: Math.max(0, event.timestamp - run.startedAt),
                type: event.type,
                stateId: event.stateId,
                durationMs: event.durationMs,
                message: event.message !== undefined ? this.redactedText(event.message) : undefined,
                hasData: data !== undefined,
                dataSummary: data !== undefined ? this.artifactSummary(data) : undefined,
                data
            };
        });
    }

    protected playbookRunDiagnostics(run: CyberVinciPlaybookRunRecord): CyberVinciPlaybookRunDiagnosticItem[] {
        const diagnostics: CyberVinciPlaybookRunDiagnosticItem[] = [];
        run.diagnostics.forEach((message, index) => diagnostics.push({
            source: 'run',
            index,
            message: this.redactedText(message)
        }));
        run.checkpoint?.diagnostics?.forEach((message, index) => diagnostics.push({
            source: 'checkpoint',
            index,
            message: this.redactedText(message)
        }));
        run.failureArtifacts?.diagnostics?.forEach((message, index) => diagnostics.push({
            source: 'failure',
            index,
            message: this.redactedText(message)
        }));
        return diagnostics;
    }

    protected toPlaybookRunTimelineExport(
        run: CyberVinciPlaybookRunRecord,
        timeline: CyberVinciPlaybookRunTimelineItem[] = this.playbookRunTimeline(run)
    ): Record<string, unknown> {
        return redactCyberVinciSecrets({
            version: 'cybervinci.playbookRunTimeline/v1',
            exportedAt: new Date().toISOString(),
            requestId: run.requestId,
            playbookId: run.playbookId,
            status: run.status,
            startedAt: new Date(run.startedAt).toISOString(),
            completedAt: run.completedAt ? new Date(run.completedAt).toISOString() : undefined,
            durationMs: this.runDuration(run),
            eventCount: timeline.length,
            eventTypeCounts: this.countBy(timeline, item => item.type),
            timeline
        });
    }

    protected toPlaybookRunTimelineMarkdown(
        run: CyberVinciPlaybookRunRecord,
        timeline: CyberVinciPlaybookRunTimelineItem[] = this.playbookRunTimeline(run)
    ): string {
        const rows = timeline.map(item => `| ${item.index + 1} | ${item.timestamp} | ${item.offsetMs} | ${this.markdownCell(item.type)} | ${this.markdownCell(item.stateId)} | ${item.durationMs ?? ''} | ${this.markdownCell(item.message)} | ${this.markdownCell(item.dataSummary)} |`).join('\n')
            || '| none | none | 0 | none | none | 0 | none | none |';
        const dataSections = timeline
            .filter(item => item.data !== undefined)
            .map(item => [
                `### Event ${item.index + 1}: ${item.type}${item.stateId ? `:${item.stateId}` : ''}`,
                '',
                '```json',
                JSON.stringify(redactCyberVinciSecrets(item.data), undefined, 2),
                '```'
            ].join('\n'))
            .join('\n\n') || '- none';
        return [
            '# CyberVinci Playbook Run Timeline',
            '',
            `- Request: ${run.requestId}`,
            `- Playbook: ${run.playbookId}`,
            `- Status: ${run.status}`,
            `- Events: ${timeline.length}`,
            `- Duration: ${this.runDuration(run)}ms`,
            '',
            '| # | Timestamp | Offset ms | Type | State | Duration ms | Message | Data |',
            '| ---: | --- | ---: | --- | --- | ---: | --- | --- |',
            rows,
            '',
            '## Event Data',
            '',
            dataSections
        ].join('\n');
    }

    protected toPlaybookRunDiagnosticsExport(
        run: CyberVinciPlaybookRunRecord,
        diagnostics: CyberVinciPlaybookRunDiagnosticItem[] = this.playbookRunDiagnostics(run)
    ): Record<string, unknown> {
        return redactCyberVinciSecrets({
            version: 'cybervinci.playbookRunDiagnostics/v1',
            exportedAt: new Date().toISOString(),
            requestId: run.requestId,
            playbookId: run.playbookId,
            status: run.status,
            diagnosticCount: diagnostics.length,
            sourceCounts: this.countBy(diagnostics, item => item.source),
            diagnostics
        });
    }

    protected toPlaybookRunDiagnosticsMarkdown(
        run: CyberVinciPlaybookRunRecord,
        diagnostics: CyberVinciPlaybookRunDiagnosticItem[] = this.playbookRunDiagnostics(run)
    ): string {
        const rows = diagnostics.map(item => `| ${this.markdownCell(item.source)} | ${item.index + 1} | ${this.markdownCell(item.message)} |`).join('\n')
            || '| none | 0 | none |';
        return [
            '# CyberVinci Playbook Run Diagnostics',
            '',
            `- Request: ${run.requestId}`,
            `- Playbook: ${run.playbookId}`,
            `- Status: ${run.status}`,
            `- Diagnostics: ${diagnostics.length}`,
            `- Sources: ${this.formatCounts(this.countBy(diagnostics, item => item.source)) || 'none'}`,
            '',
            '| Source | # | Message |',
            '| --- | ---: | --- |',
            rows
        ].join('\n');
    }

    protected playbookRunArtifacts(run: CyberVinciPlaybookRunRecord): CyberVinciPlaybookRunArtifact[] {
        const artifacts: CyberVinciPlaybookRunArtifact[] = [];
        if (run.checkpoint?.input !== undefined) {
            artifacts.push({
                id: 'checkpoint.input',
                label: 'checkpoint.input',
                source: 'checkpoint.input',
                description: this.artifactSummary(run.checkpoint.input),
                value: redactCyberVinciSecrets(run.checkpoint.input)
            });
        }
        const state = run.checkpoint?.state && typeof run.checkpoint.state === 'object' && !Array.isArray(run.checkpoint.state)
            ? run.checkpoint.state as Record<string, unknown>
            : {};
        for (const key of Object.keys(state).sort()) {
            artifacts.push({
                id: `checkpoint.state.${key}`,
                label: `state.${key}`,
                source: `checkpoint.state.${key}`,
                description: this.artifactSummary(state[key]),
                value: redactCyberVinciSecrets(state[key])
            });
        }
        if (run.checkpoint?.diagnostics?.length) {
            artifacts.push({
                id: 'checkpoint.diagnostics',
                label: 'checkpoint.diagnostics',
                source: 'checkpoint.diagnostics',
                description: `${run.checkpoint.diagnostics.length} diagnostic(s)`,
                value: redactCyberVinciSecrets(run.checkpoint.diagnostics)
            });
        }
        if (run.failureArtifacts) {
            artifacts.push({
                id: 'failure.summary',
                label: 'failure.summary',
                source: 'failure.summary',
                description: this.artifactSummary(run.failureArtifacts.summary),
                value: redactCyberVinciSecrets(run.failureArtifacts.summary)
            });
            artifacts.push({
                id: 'failure.compensation',
                label: 'failure.compensation',
                source: 'failure.compensation',
                description: this.artifactSummary(run.failureArtifacts.compensation),
                value: redactCyberVinciSecrets(run.failureArtifacts.compensation)
            });
            artifacts.push({
                id: 'failure.secondRunSuggestion',
                label: 'failure.secondRunSuggestion',
                source: 'failure.secondRunSuggestion',
                description: this.artifactSummary(run.failureArtifacts.secondRunSuggestion),
                value: redactCyberVinciSecrets(run.failureArtifacts.secondRunSuggestion)
            });
        }
        run.events.forEach((event, index) => {
            if (event.data !== undefined) {
                artifacts.push({
                    id: `events.${index}.data`,
                    label: `event ${index + 1} data`,
                    source: `events.${index}.data`,
                    description: [event.type, event.stateId, this.artifactSummary(event.data)].filter(Boolean).join(' | '),
                    value: redactCyberVinciSecrets(event.data)
                });
            }
        });
        return artifacts;
    }

    protected artifactSummary(value: unknown): string {
        const redactedValue = redactCyberVinciSecrets(value);
        if (Array.isArray(redactedValue)) {
            return `${redactedValue.length} item(s)`;
        }
        if (redactedValue && typeof redactedValue === 'object') {
            const keys = Object.keys(redactedValue as Record<string, unknown>);
            return keys.length ? `${keys.length} key(s): ${keys.slice(0, 5).join(', ')}` : 'empty object';
        }
        if (typeof redactedValue === 'string') {
            return redactedValue.length > 80 ? `${redactedValue.slice(0, 77)}...` : redactedValue;
        }
        return String(redactedValue);
    }

    protected redactedText(value: unknown): string {
        const redactedValue = redactCyberVinciSecrets(value);
        if (typeof redactedValue === 'string') {
            return redactedValue;
        }
        return this.compactJson(redactedValue) ?? String(redactedValue);
    }

    protected toPlaybookRunArtifactsExport(
        run: CyberVinciPlaybookRunRecord,
        artifacts: CyberVinciPlaybookRunArtifact[] = this.playbookRunArtifacts(run)
    ): Record<string, unknown> {
        return redactCyberVinciSecrets({
            version: 'cybervinci.playbookRunArtifacts/v1',
            exportedAt: new Date().toISOString(),
            requestId: run.requestId,
            playbookId: run.playbookId,
            status: run.status,
            artifactCount: artifacts.length,
            artifacts: artifacts.map(artifact => ({
                id: artifact.id,
                label: artifact.label,
                source: artifact.source,
                description: artifact.description,
                value: redactCyberVinciSecrets(artifact.value)
            }))
        });
    }

    protected toPlaybookRunArtifactsMarkdown(
        run: CyberVinciPlaybookRunRecord,
        artifacts: CyberVinciPlaybookRunArtifact[] = this.playbookRunArtifacts(run)
    ): string {
        const artifactLines = artifacts.length
            ? artifacts.map(artifact => [
                `### ${artifact.source}`,
                '',
                artifact.description ? `- ${artifact.description}` : '- no summary',
                '',
                '```json',
                JSON.stringify(redactCyberVinciSecrets(artifact.value), undefined, 2),
                '```'
            ].join('\n')).join('\n\n')
            : '- none';
        return [
            '# CyberVinci Playbook Run Artifacts',
            '',
            `- Request: ${run.requestId}`,
            `- Playbook: ${run.playbookId}`,
            `- Status: ${run.status}`,
            `- Artifacts: ${artifacts.length}`,
            '',
            artifactLines
        ].join('\n');
    }

    protected async copyPlaybookRunJson(
        run: CyberVinciPlaybookRunRecord,
        playbook: Awaited<ReturnType<CyberVinciAiChatExperienceService['getPlaybook']>>,
        agent: CyberVinciDeclarativeChatAgent | undefined,
        migrationStatus: Record<string, unknown> | undefined
    ): Promise<void> {
        await this.clipboardService.writeText(JSON.stringify(this.toPlaybookRunExport(run, playbook, agent, migrationStatus), undefined, 2));
        this.messageService.info(`Copied Playbook run '${run.requestId}' JSON to clipboard.`);
    }

    protected async copyPlaybookRunMarkdown(
        run: CyberVinciPlaybookRunRecord,
        playbook: Awaited<ReturnType<CyberVinciAiChatExperienceService['getPlaybook']>>,
        agent: CyberVinciDeclarativeChatAgent | undefined,
        migrationStatus: Record<string, unknown> | undefined
    ): Promise<void> {
        await this.clipboardService.writeText(this.toPlaybookRunMarkdown(run, playbook, agent, migrationStatus));
        this.messageService.info(`Copied Playbook run '${run.requestId}' Markdown to clipboard.`);
    }

    protected toPlaybookRunExport(
        run: CyberVinciPlaybookRunRecord,
        playbook: Awaited<ReturnType<CyberVinciAiChatExperienceService['getPlaybook']>>,
        agent: CyberVinciDeclarativeChatAgent | undefined,
        migrationStatus: Record<string, unknown> | undefined
    ): Record<string, unknown> {
        return redactCyberVinciSecrets({
            version: 'cybervinci.playbookRunExport/v1',
            exportedAt: new Date().toISOString(),
            requestId: run.requestId,
            playbookId: run.playbookId,
            playbook: playbook ? {
                id: playbook.id,
                name: playbook.name,
                description: playbook.description,
                category: playbook.category,
                source: playbook.source,
                sourcePath: playbook.sourcePath,
                entry: playbook.entry,
                stateCount: playbook.states.length
            } : undefined,
            agent: agent ? {
                id: agent.id,
                name: agent.name,
                source: agent.source,
                sourcePath: agent.sourcePath,
                sourceAgentId: agent.sourceAgentId,
                defaultPlaybook: agent.defaultPlaybook
            } : undefined,
            migrationStatus,
            status: run.status,
            startedAt: new Date(run.startedAt).toISOString(),
            completedAt: run.completedAt ? new Date(run.completedAt).toISOString() : undefined,
            durationMs: this.runDuration(run),
            diagnostics: redactCyberVinciSecrets(run.diagnostics),
            checkpoint: redactCyberVinciSecrets(run.checkpoint),
            failureArtifacts: redactCyberVinciSecrets(run.failureArtifacts),
            events: redactCyberVinciSecrets(run.events)
        });
    }

    protected toPlaybookRunMarkdown(
        run: CyberVinciPlaybookRunRecord,
        playbook: Awaited<ReturnType<CyberVinciAiChatExperienceService['getPlaybook']>>,
        agent: CyberVinciDeclarativeChatAgent | undefined,
        migrationStatus: Record<string, unknown> | undefined
    ): string {
        const eventLines = run.events.length
            ? run.events.map(event => {
                const state = event.stateId ? ` state=${event.stateId}` : '';
                const duration = event.durationMs !== undefined ? ` duration=${event.durationMs}ms` : '';
                const message = event.message ? ` - ${redactCyberVinciSecrets(event.message)}` : '';
                return `- ${new Date(event.timestamp).toISOString()} ${event.type}${state}${duration}${message}`;
            }).join('\n')
            : '- none';
        const diagnostics = run.diagnostics.length
            ? redactCyberVinciSecrets(run.diagnostics).map(item => `- ${item}`).join('\n')
            : '- none';
        return [
            `# CyberVinci Playbook Run`,
            '',
            `- Request: ${run.requestId}`,
            `- Status: ${run.status}`,
            `- Playbook: ${playbook?.name ?? run.playbookId} (${run.playbookId})`,
            agent ? `- Agent: ${agent.name} (${agent.id})` : undefined,
            run.sourceAgentId ? `- Source agent: ${run.sourceAgentId}` : undefined,
            `- Duration: ${this.runDuration(run)}ms`,
            `- Started: ${new Date(run.startedAt).toISOString()}`,
            run.completedAt ? `- Completed: ${new Date(run.completedAt).toISOString()}` : undefined,
            playbook?.sourcePath ? `- Playbook source: ${playbook.sourcePath}` : undefined,
            agent?.sourcePath ? `- Agent source: ${agent.sourcePath}` : undefined,
            '',
            '## Migration Status',
            '',
            this.compactJson(migrationStatus) ?? 'not available',
            '',
            '## Checkpoint',
            '',
            this.compactJson(run.checkpoint) ?? 'not available',
            '',
            '## Failure Artifacts',
            '',
            this.compactJson(run.failureArtifacts) ?? 'not available',
            '',
            '## Diagnostics',
            '',
            diagnostics,
            '',
            '## Events',
            '',
            eventLines
        ].filter(line => line !== undefined).join('\n');
    }

    protected async copyPlaybookRunListJson(runs: CyberVinciPlaybookRunRecord[]): Promise<void> {
        await this.clipboardService.writeText(JSON.stringify(this.toPlaybookRunListExport(runs), undefined, 2));
        this.messageService.info(`Copied ${runs.length} Playbook run summary record(s) as JSON.`);
    }

    protected async copyPlaybookRunListMarkdown(runs: CyberVinciPlaybookRunRecord[]): Promise<void> {
        await this.clipboardService.writeText(this.toPlaybookRunListMarkdown(runs));
        this.messageService.info(`Copied ${runs.length} Playbook run summary record(s) as Markdown.`);
    }

    protected toPlaybookRunListExport(runs: CyberVinciPlaybookRunRecord[]): Record<string, unknown> {
        return {
            version: 'cybervinci.playbookRunListExport/v1',
            exportedAt: new Date().toISOString(),
            totalRuns: runs.length,
            statusCounts: this.countBy(runs, run => run.status),
            playbookCounts: this.countBy(runs, run => run.playbookId),
            runs: runs.map(run => ({
                requestId: run.requestId,
                playbookId: run.playbookId,
                agentId: run.agentId,
                sourceAgentId: run.sourceAgentId,
                status: run.status,
                startedAt: new Date(run.startedAt).toISOString(),
                completedAt: run.completedAt ? new Date(run.completedAt).toISOString() : undefined,
                durationMs: this.runDuration(run),
                eventCount: run.events.length,
                diagnosticCount: run.diagnostics.length,
                canResume: run.checkpoint?.canResume === true,
                nextStateId: run.checkpoint?.nextStateId
            }))
        };
    }

    protected toPlaybookRunListMarkdown(runs: CyberVinciPlaybookRunRecord[]): string {
        const rows = runs.map(run => {
            return `| ${run.requestId} | ${run.playbookId} | ${run.status} | ${this.runDuration(run)} | ${run.events.length} | ${run.diagnostics.length} |`;
        }).join('\n') || '| none | none | none | 0 | 0 | 0 |';
        return [
            '# CyberVinci Playbook Runs',
            '',
            `- Exported: ${new Date().toISOString()}`,
            `- Runs: ${runs.length}`,
            `- Statuses: ${this.formatCounts(this.countBy(runs, run => run.status)) || 'none'}`,
            `- Playbooks: ${this.formatCounts(this.countBy(runs, run => run.playbookId)) || 'none'}`,
            '',
            '| Request | Playbook | Status | Duration ms | Events | Diagnostics |',
            '| --- | --- | --- | ---: | ---: | ---: |',
            rows
        ].join('\n');
    }

    protected async showPlaybookRunComparisonPicker(runs: CyberVinciPlaybookRunRecord[]): Promise<void> {
        if (!this.quickPickService) {
            return;
        }
        if (runs.length < 2) {
            this.messageService.warn('At least two Playbook runs are required for comparison.');
            return;
        }
        const left = await this.quickPickService.show<QuickPickItem & { run: CyberVinciPlaybookRunRecord }>(
            runs.map(run => ({
                run,
                label: `${run.playbookId} - ${run.status}`,
                description: run.requestId,
                detail: [
                    `started=${new Date(run.startedAt).toLocaleString()}`,
                    `duration=${this.runDuration(run)}ms`,
                    `events=${run.events.length}`,
                    `diagnostics=${run.diagnostics.length}`
                ].join(' | ')
            })),
            {
                title: 'Compare Playbook Runs: Base',
                placeholder: 'Choose the base run.'
            }
        );
        if (!left) {
            return;
        }
        const candidates = runs.filter(run => run.requestId !== left.run.requestId);
        const right = await this.quickPickService.show<QuickPickItem & { run: CyberVinciPlaybookRunRecord }>(
            candidates.map(run => ({
                run,
                label: `${run.playbookId} - ${run.status}`,
                description: run.requestId,
                detail: [
                    run.playbookId === left.run.playbookId ? 'same Playbook' : `different Playbook: ${run.playbookId}`,
                    `durationDelta=${this.runDuration(run) - this.runDuration(left.run)}ms`,
                    `events=${run.events.length}`,
                    `diagnostics=${run.diagnostics.length}`
                ].join(' | ')
            })),
            {
                title: `Compare Against: ${left.run.requestId}`,
                placeholder: 'Choose the run to compare against the base run.'
            }
        );
        if (!right) {
            return;
        }
        await this.showPlaybookRunComparison(left.run, right.run);
    }

    protected async showPlaybookRunComparison(left: CyberVinciPlaybookRunRecord, right: CyberVinciPlaybookRunRecord): Promise<void> {
        if (!this.quickPickService) {
            return;
        }
        const comparison = this.toPlaybookRunComparison(left, right);
        const picked = await this.quickPickService.show<QuickPickItem & { action: 'summary' | 'copy-json' | 'copy-markdown' }>(
            [
                {
                    action: 'summary',
                    label: 'Summary',
                    description: `${left.requestId} -> ${right.requestId}`,
                    detail: this.compactJson(comparison.summary)
                },
                {
                    action: 'copy-json',
                    label: '$(json) Copy Comparison JSON',
                    description: 'Full comparison payload',
                    detail: 'Copies run metadata, deltas, diagnostics, event counts, and checkpoint keys.'
                },
                {
                    action: 'copy-markdown',
                    label: '$(markdown) Copy Comparison Markdown',
                    description: 'Readable comparison report',
                    detail: 'Copies a Markdown comparison between the selected runs.'
                }
            ],
            {
                title: `Compare Runs: ${left.playbookId}`,
                placeholder: 'Inspect or copy this run comparison.'
            }
        );
        if (!picked) {
            return;
        }
        if (picked.action === 'summary') {
            await this.showStructuredRunDetails(`Run Comparison: ${left.requestId} -> ${right.requestId}`, comparison);
            return;
        }
        if (picked.action === 'copy-json') {
            await this.clipboardService.writeText(JSON.stringify(comparison, undefined, 2));
            this.messageService.info(`Copied Playbook run comparison '${left.requestId}' -> '${right.requestId}' as JSON.`);
            return;
        }
        await this.clipboardService.writeText(this.toPlaybookRunComparisonMarkdown(comparison));
        this.messageService.info(`Copied Playbook run comparison '${left.requestId}' -> '${right.requestId}' as Markdown.`);
    }

    protected toPlaybookRunComparison(
        left: CyberVinciPlaybookRunRecord,
        right: CyberVinciPlaybookRunRecord
    ): Record<string, unknown> {
        const leftEvents = this.countBy(left.events, event => event.type);
        const rightEvents = this.countBy(right.events, event => event.type);
        const eventTypes = [...new Set([...Object.keys(leftEvents), ...Object.keys(rightEvents)])].sort();
        const leftStateKeys = Object.keys(left.checkpoint?.state ?? {}).sort();
        const rightStateKeys = Object.keys(right.checkpoint?.state ?? {}).sort();
        return redactCyberVinciSecrets({
            version: 'cybervinci.playbookRunComparison/v1',
            exportedAt: new Date().toISOString(),
            left: this.runComparisonSide(left),
            right: this.runComparisonSide(right),
            summary: {
                samePlaybook: left.playbookId === right.playbookId,
                statusChanged: left.status !== right.status,
                durationDeltaMs: this.runDuration(right) - this.runDuration(left),
                eventDelta: right.events.length - left.events.length,
                diagnosticDelta: right.diagnostics.length - left.diagnostics.length,
                checkpointChanged: JSON.stringify(left.checkpoint) !== JSON.stringify(right.checkpoint)
            },
            eventTypeCounts: eventTypes.map(type => ({
                type,
                left: leftEvents[type] ?? 0,
                right: rightEvents[type] ?? 0,
                delta: (rightEvents[type] ?? 0) - (leftEvents[type] ?? 0)
            })),
            stateKeys: {
                leftOnly: leftStateKeys.filter(key => !rightStateKeys.includes(key)),
                rightOnly: rightStateKeys.filter(key => !leftStateKeys.includes(key)),
                shared: leftStateKeys.filter(key => rightStateKeys.includes(key))
            },
            diagnostics: {
                leftOnly: redactCyberVinciSecrets(left.diagnostics.filter(item => !right.diagnostics.includes(item))),
                rightOnly: redactCyberVinciSecrets(right.diagnostics.filter(item => !left.diagnostics.includes(item))),
                shared: redactCyberVinciSecrets(left.diagnostics.filter(item => right.diagnostics.includes(item)))
            }
        });
    }

    protected runComparisonSide(run: CyberVinciPlaybookRunRecord): Record<string, unknown> {
        return {
            requestId: run.requestId,
            playbookId: run.playbookId,
            agentId: run.agentId,
            sourceAgentId: run.sourceAgentId,
            status: run.status,
            startedAt: new Date(run.startedAt).toISOString(),
            completedAt: run.completedAt ? new Date(run.completedAt).toISOString() : undefined,
            durationMs: this.runDuration(run),
            eventCount: run.events.length,
            diagnosticCount: run.diagnostics.length,
            canResume: run.checkpoint?.canResume === true,
            nextStateId: run.checkpoint?.nextStateId
        };
    }

    protected toPlaybookRunComparisonMarkdown(comparison: Record<string, unknown>): string {
        const left = this.record(comparison.left);
        const right = this.record(comparison.right);
        const summary = this.record(comparison.summary);
        const eventTypeCounts = Array.isArray(comparison.eventTypeCounts)
            ? comparison.eventTypeCounts as Record<string, unknown>[]
            : [];
        const eventRows = eventTypeCounts.map(item => `| ${item.type} | ${item.left} | ${item.right} | ${item.delta} |`).join('\n') || '| none | 0 | 0 | 0 |';
        return [
            '# CyberVinci Playbook Run Comparison',
            '',
            `- Exported: ${comparison.exportedAt}`,
            `- Left: ${left?.requestId} (${left?.playbookId}, ${left?.status})`,
            `- Right: ${right?.requestId} (${right?.playbookId}, ${right?.status})`,
            `- Same Playbook: ${String(summary?.samePlaybook)}`,
            `- Status changed: ${String(summary?.statusChanged)}`,
            `- Duration delta: ${String(summary?.durationDeltaMs)}ms`,
            `- Event delta: ${String(summary?.eventDelta)}`,
            `- Diagnostic delta: ${String(summary?.diagnosticDelta)}`,
            '',
            '## Event Type Counts',
            '',
            '| Type | Left | Right | Delta |',
            '| --- | ---: | ---: | ---: |',
            eventRows,
            '',
            '## State Keys',
            '',
            this.compactJson(comparison.stateKeys) ?? '{}',
            '',
            '## Diagnostics',
            '',
            this.compactJson(comparison.diagnostics) ?? '{}'
        ].join('\n');
    }

    protected countBy<T>(items: T[], selector: (item: T) => string): Record<string, number> {
        const counts: Record<string, number> = {};
        for (const item of items) {
            const key = selector(item) || '<empty>';
            counts[key] = (counts[key] ?? 0) + 1;
        }
        return counts;
    }

    protected formatCounts(counts: Record<string, number>): string {
        return Object.entries(counts)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, value]) => `${key}=${value}`)
            .join(' | ');
    }

    protected markdownCell(value: unknown): string {
        return String(value ?? '')
            .replace(/\|/g, '\\|')
            .replace(/\r?\n/g, ' ');
    }

    protected async resolveRunAgent(run: CyberVinciPlaybookRunRecord): Promise<CyberVinciDeclarativeChatAgent | undefined> {
        const manifest = await this.service.getDeclarativeChatAgentManifest();
        const agents = this.withRuntimeNativeAgents(manifest.agents);
        return agents.find(agent =>
            (!!run.agentId && agent.id === run.agentId)
            || (!!run.sourceAgentId && (agent.sourceAgentId === run.sourceAgentId || agent.id === run.sourceAgentId))
            || agent.defaultPlaybook === run.playbookId
            || (agent.playbooks ?? []).includes(run.playbookId)
        );
    }

    protected async resolveRunMigrationStatus(run: CyberVinciPlaybookRunRecord, agent?: CyberVinciDeclarativeChatAgent): Promise<Record<string, unknown> | undefined> {
        const checkpointState = this.record(run.checkpoint?.state);
        const agentProfile = this.record(checkpointState?.agentProfile);
        const profileAgent = this.record(agentProfile?.agent);
        const recordedMigration = this.record(profileAgent?.migrationStatus) ?? this.record(agentProfile?.migrationStatus);
        if (recordedMigration) {
            return recordedMigration;
        }
        if (!agent?.id) {
            return undefined;
        }
        const result = await this.toolRegistry.executeTool('core.agent.describe', {
            requestId: `run-inspector-agent-${Date.now().toString(36)}`,
            playbookId: run.playbookId,
            input: {
                agentId: agent.id,
                playbookId: run.playbookId
            },
            state: {
                agent: {
                    id: agent.id,
                    name: agent.name,
                    kind: agent.kind,
                    sourceAgentId: agent.sourceAgentId ?? agent.id
                }
            }
        });
        const value = this.record(result.value);
        const resolvedAgent = this.record(value?.agent);
        return this.record(resolvedAgent?.migrationStatus);
    }

    protected migrationStatusDescription(status: Record<string, unknown> | undefined): string {
        if (!status) {
            return 'not available';
        }
        return [
            typeof status.strategy === 'string' ? status.strategy : undefined,
            status.autonomousPlaybook === true ? 'autonomous' : undefined,
            status.nativeDelegate === true ? 'native delegate' : undefined,
            typeof status.selectedPlaybook === 'string' ? `playbook=${status.selectedPlaybook}` : undefined,
            status.sourceAgentAvailable === false ? 'source missing' : undefined
        ].filter(Boolean).join(' | ') || 'available';
    }

    protected runDuration(run: CyberVinciPlaybookRunRecord): number {
        return run.durationMs ?? (run.completedAt ? run.completedAt - run.startedAt : 0);
    }

    protected async showStructuredRunDetails(title: string, value: unknown): Promise<void> {
        if (!this.quickPickService) {
            this.messageService.info(this.compactJson(redactCyberVinciSecrets(value)) ?? title);
            return;
        }
        const redactedValue = redactCyberVinciSecrets(value);
        const record = this.record(redactedValue);
        await this.quickPickService.show(
            record
                ? Object.entries(record).map(([key, item]) => ({
                    label: key,
                    description: Array.isArray(item) ? `${item.length} item(s)` : typeof item,
                    detail: this.compactJson(item)
                }))
                : [{
                    label: 'Value',
                    description: typeof redactedValue,
                    detail: this.compactJson(redactedValue)
                }],
            {
                title,
                placeholder: 'Structured Playbook run detail.'
            }
        );
    }

    protected canResumeRun(run: CyberVinciPlaybookRunRecord): boolean {
        return run.status !== 'completed' && run.checkpoint?.canResume === true && !!run.checkpoint.nextStateId;
    }

    async runRunInspectorObservabilitySmoke(): Promise<Record<string, unknown>> {
        const startedAt = Date.now() - 120;
        const rawSecret = 'sk-observability1234567890abcdef';
        const rawBearer = 'Bearer observability1234567890abcdef';
        const run: CyberVinciPlaybookRunRecord = {
            requestId: `observability-smoke-${Date.now().toString(36)}`,
            playbookId: 'observability-smoke-playbook',
            agentId: 'observability-agent',
            sourceAgentId: 'observability-source-agent',
            startedAt,
            completedAt: startedAt + 120,
            durationMs: 120,
            status: 'failed',
            diagnostics: [
                `run diagnostic ${rawSecret}`,
                'ordinary run diagnostic'
            ],
            checkpoint: {
                playbookId: 'observability-smoke-playbook',
                nextStateId: 'recover',
                input: {
                    prompt: `inspect ${rawSecret}`,
                    rawPrompt: `inspect ${rawSecret}`,
                    tokenCount: 42
                },
                state: {
                    toolResult: {
                        authorization: rawBearer,
                        visibleCounter: 3
                    }
                },
                diagnostics: [`checkpoint diagnostic ${rawBearer}`],
                updatedAt: startedAt + 90,
                canResume: true,
                reason: 'smoke checkpoint'
            },
            failureArtifacts: {
                version: 'cybervinci.playbookFailureArtifacts/v1',
                summary: `failure ${rawSecret}`,
                failedAt: startedAt + 120,
                diagnostics: [`failure diagnostic ${rawBearer}`],
                compensation: {
                    canResume: true,
                    nextStateId: 'recover',
                    retryable: true,
                    suggestedAction: `retry without ${rawSecret}`
                },
                secondRunSuggestion: {
                    prompt: `second run ${rawBearer}`,
                    playbookId: 'observability-smoke-playbook',
                    input: {
                        prompt: 'retry observability smoke',
                        rawPrompt: 'retry observability smoke',
                        authorization: rawBearer
                    }
                }
            },
            events: [
                {
                    timestamp: startedAt,
                    type: 'started',
                    message: 'started observability smoke'
                },
                {
                    timestamp: startedAt + 35,
                    type: 'tool',
                    stateId: 'inspect',
                    durationMs: 22,
                    message: `tool event ${rawSecret}`,
                    data: {
                        authorization: rawBearer,
                        visibleCounter: 7
                    }
                },
                {
                    timestamp: startedAt + 120,
                    type: 'failed',
                    stateId: 'recover',
                    message: `failed ${rawBearer}`
                }
            ]
        };
        const artifacts = this.playbookRunArtifacts(run);
        const timeline = this.playbookRunTimeline(run);
        const diagnostics = this.playbookRunDiagnostics(run);
        const exports = {
            run: this.toPlaybookRunExport(run, undefined, undefined, undefined),
            runMarkdown: this.toPlaybookRunMarkdown(run, undefined, undefined, undefined),
            artifacts: this.toPlaybookRunArtifactsExport(run, artifacts),
            artifactsMarkdown: this.toPlaybookRunArtifactsMarkdown(run, artifacts),
            timeline: this.toPlaybookRunTimelineExport(run, timeline),
            timelineMarkdown: this.toPlaybookRunTimelineMarkdown(run, timeline),
            diagnostics: this.toPlaybookRunDiagnosticsExport(run, diagnostics),
            diagnosticsMarkdown: this.toPlaybookRunDiagnosticsMarkdown(run, diagnostics)
        };
        const serialized = JSON.stringify(exports);
        const rawSecretsPresent = [rawSecret, rawBearer].some(secret => serialized.includes(secret));
        return {
            ok: !rawSecretsPresent
                && artifacts.some(artifact => artifact.source === 'failure.compensation')
                && timeline.length === run.events.length
                && diagnostics.some(item => item.source === 'failure')
                && serialized.includes('cybervinci.playbookRunTimeline/v1')
                && serialized.includes('cybervinci.playbookRunDiagnostics/v1'),
            requestId: run.requestId,
            artifactCount: artifacts.length,
            timelineEventCount: timeline.length,
            diagnosticCount: diagnostics.length,
            diagnosticSources: this.countBy(diagnostics, item => item.source),
            eventTypeCounts: this.countBy(timeline, item => item.type),
            rawSecretsPresent,
            tokenCounterPreserved: serialized.includes('"tokenCount":42') || serialized.includes('"tokenCount": 42'),
            hasFailureRecovery: artifacts.some(artifact => artifact.source === 'failure.compensation'),
            hasTimelineMarkdown: exports.timelineMarkdown.includes('# CyberVinci Playbook Run Timeline'),
            hasDiagnosticsMarkdown: exports.diagnosticsMarkdown.includes('# CyberVinci Playbook Run Diagnostics')
        };
    }

    async startPlaybookPersistenceReloadSmoke(): Promise<Record<string, unknown>> {
        const now = Date.now();
        const requestId = `persistence-reload-smoke-${now.toString(36)}`;
        const playbookId = `${CYBERVINCI_NATIVE_AGENT_PLAYBOOK_PREFIX}GitHub`;
        const run: CyberVinciPlaybookRunRecord = {
            requestId,
            playbookId,
            agentId: 'GitHub',
            sourceAgentId: 'GitHub',
            startedAt: now - 80,
            completedAt: now,
            durationMs: 80,
            status: 'paused',
            diagnostics: [],
            checkpoint: {
                playbookId,
                nextStateId: 'ask-native-mcp-configure',
                input: {
                    prompt: 'Persistence reload smoke prompt',
                    rawPrompt: 'Persistence reload smoke prompt',
                    agentId: 'GitHub',
                    sourceAgentId: 'GitHub'
                },
                state: {
                    nativeMcpRequirements: {
                        ok: false,
                        recommendedAction: 'configure',
                        selectedGroupLabel: 'Persistence Reload Smoke MCP',
                        agentName: 'Persistence Reload Smoke Agent'
                    }
                },
                diagnostics: [],
                updatedAt: now,
                canResume: true,
                reason: 'Persistence reload smoke waits at an ask state before browser reload.'
            },
            events: [
                {
                    timestamp: now - 80,
                    type: 'started',
                    message: `Playbook '${playbookId}' started for persistence reload smoke.`
                },
                {
                    timestamp: now,
                    type: 'paused',
                    stateId: 'ask-native-mcp-configure',
                    message: "Playbook paused at ask state 'ask-native-mcp-configure'.",
                    durationMs: 80
                }
            ]
        };
        const previous = this.readPersistedRunHistoryForSmoke()
            .filter(candidate => !candidate.requestId.startsWith('persistence-reload-smoke-'));
        this.writePersistedRunHistoryForSmoke([run, ...previous].slice(0, 100));
        const stored = this.readPersistedRunHistoryForSmoke().find(candidate => candidate.requestId === requestId);
        return {
            ok: stored?.status === 'paused'
                && stored.checkpoint?.canResume === true
                && stored.checkpoint.nextStateId === 'ask-native-mcp-configure',
            requestId,
            playbookId: run.playbookId,
            storedStatus: stored?.status,
            storedCanResume: stored?.checkpoint?.canResume,
            storedNextStateId: stored?.checkpoint?.nextStateId,
            persistedCount: this.readPersistedRunHistoryForSmoke().length
        };
    }

    async finishPlaybookPersistenceReloadSmoke(requestId: string): Promise<Record<string, unknown>> {
        const before = this.playbookRuntime.getRecentRuns().find(run => run.requestId === requestId);
        const beforeStatus = before?.status;
        const beforeCanResume = before?.checkpoint?.canResume;
        const beforeNextStateId = before?.checkpoint?.nextStateId;
        const resumeResult = before
            ? await this.playbookRuntime.resumeRunWithInput(requestId, {
                optionId: 'cancel',
                prompt: before.checkpoint?.input.prompt,
                rawPrompt: before.checkpoint?.input.rawPrompt
            })
            : undefined;
        const after = this.playbookRuntime.getRecentRuns().find(run => run.requestId === requestId);
        const resumedEvents = this.record(resumeResult?.value)?.events;
        const eventRecords = Array.isArray(resumedEvents) ? resumedEvents as Array<Record<string, unknown>> : [];
        return {
            ok: beforeStatus === 'paused'
                && beforeCanResume === true
                && resumeResult?.ok === true
                && after?.status === 'completed'
                && after.checkpoint?.canResume === false
                && eventRecords.some(event => event.type === 'resumed'),
            requestId,
            foundAfterReload: !!before,
            beforeStatus,
            beforeCanResume,
            beforeNextStateId,
            resumeOk: resumeResult?.ok,
            resumeMessage: resumeResult?.message,
            afterStatus: after?.status,
            afterCanResume: after?.checkpoint?.canResume,
            resumedEventSeen: eventRecords.some(event => event.type === 'resumed'),
            persistedAfterReloadCount: this.playbookRuntime.getRecentRuns().length
        };
    }

    async runCatalogManagerEditingSmoke(): Promise<Record<string, unknown>> {
        const duplicates: Record<string, unknown>[] = [];
        const deleted: Record<string, unknown>[] = [];
        const duplicateSpecs: Array<{ kind: CyberVinciCatalogItemKind; id: string }> = [
            { kind: 'agent', id: 'GitHub' },
            { kind: 'tool', id: 'core.agent.describe' },
            { kind: 'playbook', id: CYBERVINCI_DIRECT_CHAT_PLAYBOOK_ID }
        ];
        for (const spec of duplicateSpecs) {
            const duplicate = await this.service.duplicateCatalogItemToUser(spec.kind, spec.id);
            duplicates.push({
                kind: spec.kind,
                sourceId: spec.id,
                ok: duplicate.ok,
                id: duplicate.id,
                path: duplicate.path,
                paths: duplicate.paths
            });
            if (duplicate.ok && duplicate.id) {
                if (spec.kind === 'agent') {
                    const manifest = await this.service.getDeclarativeChatAgentManifest();
                    const copiedAgent = manifest.agents?.find(agent => agent.id === duplicate.id);
                    const companionPlaybookId = copiedAgent?.defaultPlaybook;
                    if (companionPlaybookId?.startsWith('user.')) {
                        const companionDelete = await this.service.deleteUserCatalogItem('playbook', companionPlaybookId);
                        deleted.push({
                            kind: 'playbook',
                            id: companionPlaybookId,
                            ok: companionDelete.ok,
                            removedFiles: companionDelete.removedFiles,
                            updatedFiles: companionDelete.updatedFiles
                        });
                    }
                }
                const deleteResult = await this.service.deleteUserCatalogItem(spec.kind, duplicate.id);
                deleted.push({
                    kind: spec.kind,
                    id: duplicate.id,
                    ok: deleteResult.ok,
                    removedFiles: deleteResult.removedFiles,
                    updatedFiles: deleteResult.updatedFiles
                });
            }
        }
        const tools = await this.service.listTools();
        const overrideCandidate = tools.find(tool => tool.source !== 'system-override' && tool.source !== 'user');
        const override = overrideCandidate
            ? await this.service.createSystemOverride('tool', overrideCandidate.id)
            : undefined;
        const restore = override?.ok && override.id
            ? await this.service.restoreSystemOverride('tool', override.id)
            : undefined;
        return {
            ok: duplicates.every(item => item.ok === true)
                && deleted.length >= 4
                && deleted.every(item => item.ok === true)
                && (overrideCandidate ? override?.ok === true && restore?.ok === true : true),
            duplicates,
            deleted,
            override: overrideCandidate ? {
                candidate: overrideCandidate.id,
                ok: override?.ok,
                path: override?.path
            } : {
                skipped: true,
                reason: 'No non-user tool was available for system override smoke.'
            },
            restore: restore ? {
                ok: restore.ok,
                removedFiles: restore.removedFiles,
                updatedFiles: restore.updatedFiles
            } : undefined
        };
    }

    async runCanvasDesignQaRealEditorSmoke(options: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
        const uriText = typeof options.uri === 'string' && options.uri.trim() ? options.uri.trim() : undefined;
        if (!uriText) {
            return { ok: false, reason: 'Canvas Design QA real editor smoke requires options.uri.' };
        }
        const uri = new URI(uriText);
        const steps: Array<Record<string, unknown>> = [];
        const prompt = typeof options.prompt === 'string' && options.prompt.trim()
            ? options.prompt.trim()
            : 'Clone Amazon as Saara, keep the search input as a compact input/button row, repair overlaps, fit content in the page, and include a footer.';
        let beforeDocument: Record<string, unknown> | undefined;
        try {
            const opened = await this.runCanvasSmokeStep(steps, 'open-editor', () => open(this.openerService, uri), 10000);
            await this.runCanvasSmokeStep(steps, 'activate-widget', () => this.activateCanvasSmokeWidget(uri, opened), 5000);
            await this.runCanvasSmokeStep(steps, 'wait-document', () => this.waitForCanvasSmokeDocument(uriText), 10000);

            const before = await this.runCanvasSmokeStep(steps, 'capture-before', () => this.toolRegistry.executeTool('system.canvas.captureCurrentDocument', {
                requestId: 'canvas-qa-real-before',
                input: { uri: uriText },
                state: {}
            }), 5000);
            beforeDocument = this.record(this.record(before.value)?.document);
            const beforePage = this.activeCanvasSmokePage(beforeDocument);
            const beforeChildCount = Array.isArray(beforePage?.children) ? beforePage.children.length : 0;

            const runResult = await this.runCanvasSmokeStep(steps, 'run-playbook', () => this.playbookRuntime.runPlaybookById('canvas-design-qa', prompt, {
                uri: uriText,
                visionJudgeMode: 'deterministic',
                agentId: 'canvas-design-qa-real-editor-smoke',
                source: 'canvas-design-qa-real-editor-smoke'
            }), 45000);
            const runValue = this.record(runResult.value);
            const runState = this.record(runValue?.state);
            const visionJudge = this.record(runState?.visionJudge);
            const applyResult = this.record(runState?.applyResult);
            const verification = this.record(runState?.verification);
            const runRecord = typeof runValue?.requestId === 'string'
                ? this.playbookRuntime.getRecentRuns().find(run => run.requestId === runValue.requestId)
                : this.playbookRuntime.getRecentRuns().find(run => run.playbookId === 'canvas-design-qa');

            const after = await this.runCanvasSmokeStep(steps, 'capture-after', () => this.toolRegistry.executeTool('system.canvas.captureCurrentDocument', {
                requestId: 'canvas-qa-real-after',
                input: { uri: uriText },
                state: {}
            }), 5000);
            const afterDocument = this.record(this.record(after.value)?.document);
            const afterPage = this.activeCanvasSmokePage(afterDocument);
            const afterChildCount = Array.isArray(afterPage?.children) ? afterPage.children.length : 0;

            const restore = beforeDocument
                ? await this.runCanvasSmokeStep(steps, 'restore-document', () => this.restoreCanvasSmokeDocument(uriText, beforeDocument!), 10000)
                : { ok: false, message: 'Initial Canvas document was not available for restore.' };
            await this.runCanvasSmokeStep(steps, 'save-close-editor', () => this.saveAndCloseCanvasSmokeWidget(uri), 10000);

            const applied = typeof applyResult?.applied === 'number' ? applyResult.applied : 0;
            const verificationPassed = verification?.passed === true || verification?.needsRepair === false;
            const reportMarkdown = this.canvasDesignQaRealEditorSmokeMarkdown({
                uri: uriText,
                requestId: runValue?.requestId,
                initialSummary: visionJudge?.summary,
                finalSummary: verification?.summary,
                applied,
                beforeChildCount,
                afterChildCount,
                diagnostics: runRecord?.diagnostics ?? []
            });

            return {
                ok: before.ok === true
                    && runResult.ok === true
                    && applied > 0
                    && verificationPassed
                    && after.ok === true
                    && afterChildCount > beforeChildCount
                    && restore.ok === true,
                uri: uriText,
                requestId: runValue?.requestId,
                runOk: runResult.ok,
                runStatus: runRecord?.status,
                beforeChildCount,
                afterChildCount,
                applied,
                initialSummary: visionJudge?.summary,
                finalSummary: verification?.summary,
                verificationPassed,
                diagnostics: runRecord?.diagnostics ?? [],
                restored: restore.ok,
                restoreMessage: restore.message,
                reportMarkdown,
                steps,
                events: runRecord?.events.map(event => ({ type: event.type, stateId: event.stateId, message: event.message })) ?? []
            };
        } catch (error) {
            await this.saveAndCloseCanvasWidgetBestEffort(uri);
            const message = error instanceof Error ? error.message : String(error);
            return {
                ok: false,
                uri: uriText,
                stage: this.failedCanvasSmokeStage(steps),
                error: message,
                steps,
                recentCanvasRuns: this.canvasSmokeRecentRuns()
            };
        }
    }

    protected async runCanvasSmokeStep<T>(
        steps: Array<Record<string, unknown>>,
        stage: string,
        action: () => Promise<T>,
        timeoutMs: number
    ): Promise<T> {
        const step: Record<string, unknown> = { stage, status: 'running', startedAt: new Date().toISOString() };
        const startedAt = Date.now();
        steps.push(step);
        let timeout: ReturnType<typeof setTimeout> | undefined;
        try {
            const result = await Promise.race([
                action(),
                new Promise<never>((_resolve, reject) => {
                    timeout = setTimeout(() => reject(new Error(`Canvas QA smoke step '${stage}' timed out after ${timeoutMs}ms.`)), timeoutMs);
                })
            ]);
            step.status = 'ok';
            return result;
        } catch (error) {
            step.status = 'failed';
            step.message = error instanceof Error ? error.message : String(error);
            throw error;
        } finally {
            if (timeout) {
                clearTimeout(timeout);
            }
            step.elapsedMs = Date.now() - startedAt;
        }
    }

    protected failedCanvasSmokeStage(steps: Array<Record<string, unknown>>): string | undefined {
        return steps.find(step => step.status === 'failed')?.stage as string | undefined;
    }

    protected async saveAndCloseCanvasWidgetBestEffort(uri: URI): Promise<void> {
        try {
            await this.saveAndCloseCanvasSmokeWidget(uri);
        } catch {
            // Best-effort cleanup for diagnostics; the smoke report carries the real failed stage.
        }
    }

    protected canvasSmokeRecentRuns(): Array<Record<string, unknown>> {
        return this.playbookRuntime.getRecentRuns()
            .filter(run => run.playbookId === 'canvas-design-qa')
            .slice(-3)
            .map(run => ({
                requestId: run.requestId,
                status: run.status,
                checkpoint: run.checkpoint,
                diagnostics: run.diagnostics,
                lastEvents: run.events.slice(-8).map(event => ({
                    type: event.type,
                    stateId: event.stateId,
                    message: event.message,
                    durationMs: event.durationMs
                }))
            }));
    }

    protected async activateCanvasSmokeWidget(uri: URI, opened: unknown): Promise<void> {
        const openedWidget = this.record(opened);
        const openedId = typeof openedWidget?.id === 'string' ? openedWidget.id : undefined;
        if (openedId) {
            await this.shell.activateWidget(openedId);
            return;
        }
        const widget = this.findCanvasSmokeWidget(uri);
        if (widget?.id) {
            await this.shell.activateWidget(widget.id);
        }
    }

    protected async waitForCanvasSmokeDocument(uriText: string): Promise<void> {
        const startedAt = Date.now();
        let lastMessage = 'Canvas document is not loaded yet.';
        while (Date.now() - startedAt < 8000) {
            const result = await this.toolRegistry.executeTool('system.canvas.captureCurrentDocument', {
                requestId: 'canvas-qa-real-wait',
                input: { uri: uriText },
                state: {}
            });
            if (result.ok) {
                return;
            }
            lastMessage = result.message ?? lastMessage;
            await new Promise(resolve => setTimeout(resolve, 120));
        }
        throw new Error(lastMessage);
    }

    protected async restoreCanvasSmokeDocument(uriText: string, document: Record<string, unknown>): Promise<{ ok: boolean; message?: string }> {
        const page = this.activeCanvasSmokePage(document);
        if (!page || typeof page.id !== 'string') {
            return { ok: false, message: 'Initial Canvas page was not available for restore.' };
        }
        const changes: Record<string, unknown> = {};
        for (const key of ['name', 'width', 'height', 'background', 'gridSize', 'showGrid', 'snapToGrid']) {
            if (key in page) {
                changes[key] = page[key];
            }
        }
        changes.children = Array.isArray(page.children) ? page.children : [];
        const result = await this.toolRegistry.executeTool('system.canvas.applyOperations', {
            requestId: 'canvas-qa-real-restore',
            input: {
                uri: uriText,
                operations: [
                    { operation: 'updatePage', pageId: page.id, changes },
                    { operation: 'setSelection', nodeIds: [] }
                ]
            },
            state: {}
        });
        return { ok: result.ok === true, message: result.message };
    }

    protected async saveAndCloseCanvasSmokeWidget(uri: URI): Promise<void> {
        const widget = this.findCanvasSmokeWidget(uri);
        if (!widget) {
            return;
        }
        const saveable = this.record(widget)?.saveable as { save?: () => Promise<void> | void } | undefined;
        await saveable?.save?.();
        if (typeof widget.id === 'string') {
            await this.shell.closeWidget(widget.id, { save: false });
        }
    }

    protected findCanvasSmokeWidget(uri: URI): { id?: string; getResourceUri?: () => URI | undefined; getUri?: () => URI | undefined; uri?: URI; saveable?: unknown } | undefined {
        return this.shell.widgets.find(widget => {
            const candidate = widget as { getResourceUri?: () => URI | undefined; getUri?: () => URI | undefined; uri?: URI };
            const widgetUri = candidate.getResourceUri?.() ?? candidate.getUri?.() ?? candidate.uri;
            return widgetUri?.toString() === uri.toString();
        }) as { id?: string; getResourceUri?: () => URI | undefined; getUri?: () => URI | undefined; uri?: URI; saveable?: unknown } | undefined;
    }

    protected activeCanvasSmokePage(document: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
        const pages = Array.isArray(document?.pages)
            ? document.pages.filter((page): page is Record<string, unknown> => !!page && typeof page === 'object' && !Array.isArray(page))
            : [];
        const activePageId = typeof document?.activePageId === 'string' ? document.activePageId : undefined;
        return pages.find(page => page.id === activePageId) ?? pages[0];
    }

    protected canvasDesignQaRealEditorSmokeMarkdown(report: Record<string, unknown>): string {
        const diagnostics = Array.isArray(report.diagnostics) ? report.diagnostics : [];
        return [
            '# Canvas Design QA Real Editor Smoke',
            '',
            `- URI: ${String(report.uri ?? '')}`,
            `- Request: ${String(report.requestId ?? '')}`,
            `- Initial: ${String(report.initialSummary ?? '')}`,
            `- Final: ${String(report.finalSummary ?? '')}`,
            `- Applied operations: ${String(report.applied ?? 0)}`,
            `- Nodes before: ${String(report.beforeChildCount ?? 0)}`,
            `- Nodes after repair: ${String(report.afterChildCount ?? 0)}`,
            `- Diagnostics: ${diagnostics.length}`,
            ...diagnostics.map(item => `  - ${String(item)}`)
        ].join('\n');
    }

    protected readPersistedRunHistoryForSmoke(): CyberVinciPlaybookRunRecord[] {
        if (typeof localStorage === 'undefined') {
            return [];
        }
        try {
            const raw = localStorage.getItem(CYBERVINCI_PLAYBOOK_RUN_HISTORY_STORAGE_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed)
                ? parsed.filter((item): item is CyberVinciPlaybookRunRecord => this.isPersistedRunRecordForSmoke(item))
                : [];
        } catch {
            return [];
        }
    }

    protected writePersistedRunHistoryForSmoke(runs: CyberVinciPlaybookRunRecord[]): void {
        if (typeof localStorage === 'undefined') {
            return;
        }
        localStorage.setItem(CYBERVINCI_PLAYBOOK_RUN_HISTORY_STORAGE_KEY, JSON.stringify(redactCyberVinciSecrets(runs)));
    }

    protected isPersistedRunRecordForSmoke(value: unknown): value is CyberVinciPlaybookRunRecord {
        const record = this.record(value);
        return !!record
            && typeof record.requestId === 'string'
            && typeof record.playbookId === 'string'
            && typeof record.startedAt === 'number'
            && ['running', 'paused', 'completed', 'failed'].includes(String(record.status))
            && Array.isArray(record.events)
            && Array.isArray(record.diagnostics);
    }

    protected async resumeRunFromCommand(run: CyberVinciPlaybookRunRecord): Promise<void> {
        const askState = await this.resolveCheckpointAskState(run);
        let input: Record<string, unknown> = {};
        if (askState?.options?.length) {
            if (!this.quickPickService) {
                this.messageService.error(`CyberVinci Playbook run '${run.requestId}' is waiting for ask state '${askState.id}', but QuickPick is unavailable.`);
                return;
            }
            const picked = await this.quickPickService.show<QuickPickItem & { optionId: string }>(
                askState.options.map((option, index) => ({
                    optionId: option.id,
                    label: option.label,
                    description: option.id,
                    detail: option.next ? `Next state: ${option.next}` : `Option ${index + 1}`
                })),
                {
                    title: askState.label ?? `Resume ${run.playbookId}`,
                    placeholder: askState.text ?? askState.prompt ?? 'Choose the option to resume this playbook run.'
                }
            );
            if (!picked) {
                return;
            }
            input = {
                optionId: picked.optionId,
                askStateId: askState.id
            };
        }
        const result = Object.keys(input).length
            ? await this.playbookRuntime.resumeRunWithInput(run.requestId, input)
            : await this.playbookRuntime.resumeRun(run.requestId);
        if (result.ok) {
            this.messageService.info(result.message ?? `CyberVinci Playbook run '${run.requestId}' resumed.`);
        } else {
            this.messageService.error(result.message ?? `CyberVinci Playbook run '${run.requestId}' could not be resumed.`);
        }
    }

    protected async resolveCheckpointAskState(run: CyberVinciPlaybookRunRecord): Promise<CyberVinciPlaybookState | undefined> {
        const stateId = run.checkpoint?.nextStateId;
        if (!stateId) {
            return undefined;
        }
        const playbook = await this.service.getPlaybook(run.checkpoint?.playbookId ?? run.playbookId);
        const state = playbook?.states.find(candidate => candidate.id === stateId);
        return state?.type === 'ask' ? state : undefined;
    }

    protected async showCatalogDiagnostics(): Promise<void> {
        const diagnostics = await this.service.getCatalogDiagnostics();
        if (!diagnostics.length) {
            this.messageService.info('CyberVinci AI Chat catalog has no diagnostics.');
            return;
        }
        if (!this.quickPickService) {
            const errors = diagnostics.filter(item => item.severity === 'error').length;
            const warnings = diagnostics.filter(item => item.severity === 'warning').length;
            this.messageService.warn(`CyberVinci catalog diagnostics: ${errors} errors, ${warnings} warnings.`);
            return;
        }
        await this.quickPickService.show(
            diagnostics.map((diagnostic, index) => ({
                label: `${diagnostic.severity.toUpperCase()}: ${diagnostic.id ?? diagnostic.source ?? `diagnostic-${index + 1}`}`,
                description: diagnostic.source,
                detail: diagnostic.message
            })),
            {
                title: 'CyberVinci Catalog Diagnostics',
                placeholder: 'Catalog diagnostics from Agents, Tools, Playbooks, system overrides, and user files.'
            }
        );
    }

    protected async showAgentManager(): Promise<void> {
        const agents = await this.service.getDeclarativeChatAgentManifest().then(manifest => this.withRuntimeNativeAgents(manifest.agents));
        if (!this.quickPickService) {
            this.messageService.info(`CyberVinci Agents: ${agents.length}`);
            return;
        }
        const picked = await this.quickPickService.show<QuickPickItem & { kind: CyberVinciCatalogItemKind; id: string; source?: string; sourcePath?: string; definition?: CyberVinciDeclarativeChatAgent }>(
            agents
                .slice()
                .sort((left, right) => (left.category ?? '').localeCompare(right.category ?? '') || left.name.localeCompare(right.name))
                .map(agent => ({
                    kind: 'agent' as const,
                    id: agent.id,
                    source: agent.source,
                    sourcePath: agent.sourcePath,
                    definition: agent,
                    label: agent.name,
                    description: [agent.kind, agent.source ?? 'system', agent.sourcePath, agent.defaultPlaybook ? `playbook=${agent.defaultPlaybook}` : undefined].filter(Boolean).join(' | '),
                    detail: [agent.description, agent.tools?.length ? `tools: ${agent.tools.join(', ')}` : undefined, agent.playbooks?.length ? `playbooks: ${agent.playbooks.join(', ')}` : undefined].filter(Boolean).join(' | ')
                })),
            {
                title: 'CyberVinci Agents',
                placeholder: 'Agents from native Theia mirrors, Markdown profiles, system overrides, and user catalog.'
            }
        );
        await this.showCatalogItemActions(picked);
    }

    protected async showToolManager(): Promise<void> {
        const tools = await this.service.listTools();
        if (!this.quickPickService) {
            this.messageService.info(`CyberVinci Tools: ${tools.length}`);
            return;
        }
        const picked = await this.quickPickService.show<QuickPickItem & { kind: CyberVinciCatalogItemKind; id: string; source?: string; sourcePath?: string; definition?: CyberVinciDeclarativeTool }>(
            tools
                .slice()
                .sort((left, right) => (left.category ?? '').localeCompare(right.category ?? '') || left.id.localeCompare(right.id))
                .map(tool => ({
                    kind: 'tool' as const,
                    id: tool.id,
                    source: tool.source,
                    sourcePath: tool.sourcePath,
                    definition: tool,
                    label: tool.id,
                    description: [tool.kind ?? 'tool', tool.source ?? 'core', tool.sourcePath, tool.implementation ?? 'host', tool.protected ? 'protected' : undefined].filter(Boolean).join(' | '),
                    detail: [
                        tool.name,
                        tool.description,
                        tool.inputSchema ? 'input schema available' : undefined,
                        tool.outputSchema ? 'output schema available' : undefined,
                        tool.steps?.length ? `${tool.steps.length} composite step(s)` : undefined
                    ].filter(Boolean).join(' | ')
                })),
            {
                title: 'CyberVinci Tools',
                placeholder: 'Core, system, system-overrides, and user.* tools. Use catalog files to edit or restore.'
            }
        );
        await this.showCatalogItemActions(picked);
    }

    protected async showPlaybookManager(): Promise<void> {
        const playbooks = await this.service.listPlaybooks();
        if (!this.quickPickService) {
            this.messageService.info(`CyberVinci Playbooks: ${playbooks.length}`);
            return;
        }
        const picked = await this.quickPickService.show<QuickPickItem & { kind: CyberVinciCatalogItemKind; id: string; source?: string; sourcePath?: string }>(
            playbooks
                .slice()
                .sort((left, right) => left.category.localeCompare(right.category) || left.name.localeCompare(right.name))
                .map(playbook => ({
                    kind: 'playbook' as const,
                    id: playbook.id,
                    source: playbook.source,
                    sourcePath: playbook.sourcePath,
                    label: playbook.name,
                    description: [playbook.category, playbook.source ?? 'system', playbook.sourcePath, playbook.enabled === false ? 'disabled' : 'enabled'].filter(Boolean).join(' | '),
                    detail: playbook.description
                })),
            {
                title: 'CyberVinci Playbooks',
                placeholder: 'Playbooks can be assigned as agent defaults or selected in the chat toolbar.'
            }
        );
        await this.showCatalogItemActions(picked);
    }

    protected async showLocalMarketplace(): Promise<void> {
        const items = await this.service.listMarketplaceItems();
        if (!items.length) {
            this.messageService.info('CyberVinci Local Marketplace has no items.');
            return;
        }
        if (!this.quickPickService) {
            this.messageService.info(`CyberVinci Local Marketplace: ${items.length} item(s).`);
            return;
        }
        const picked = await this.quickPickService.show<QuickPickItem & { item: CyberVinciMarketplaceItem }>(
            items.map(item => ({
                item,
                label: `${item.installed ? '$(check) ' : ''}${item.name}`,
                description: [item.collection, item.installTarget ? `${item.installTarget.kind}:${item.installTarget.id}` : undefined].filter(Boolean).join(' | '),
                detail: [item.description, item.tags?.length ? `tags: ${item.tags.join(', ')}` : undefined, item.sourcePath].filter(Boolean).join(' | ')
            })),
            {
                title: 'CyberVinci Local Marketplace',
                placeholder: 'Install Agents, Skills, Tools, Playbooks, Flows, and Canvas QA packs into the local workspace catalog.'
            }
        );
        if (!picked) {
            return;
        }
        const actions: Array<QuickPickItem & { action: 'install' | 'open' | 'details' }> = [
            {
                action: 'details',
                label: 'Show Details',
                description: picked.item.collection,
                detail: picked.item.description
            }
        ];
        if (picked.item.installTarget) {
            actions.unshift({
                action: 'install',
                label: picked.item.installed ? 'Install Another Copy' : 'Install',
                description: `${picked.item.installTarget.kind}:${picked.item.installTarget.id}`,
                detail: 'Install this marketplace item into the user catalog when supported.'
            });
        }
        if (picked.item.sourcePath) {
            actions.push({
                action: 'open',
                label: 'Open Marketplace Source',
                description: picked.item.sourcePath
            });
        }
        const action = await this.quickPickService.show(actions, {
            title: picked.item.name,
            placeholder: 'Choose a marketplace action.'
        });
        if (!action) {
            return;
        }
        if (action.action === 'install') {
            await this.handleCatalogWriteResult(await this.service.installMarketplaceItem(picked.item.id));
            return;
        }
        if (action.action === 'open') {
            await this.openCatalogPath(picked.item.sourcePath);
            return;
        }
        this.messageService.info([
            `${picked.item.collection}:${picked.item.id}`,
            picked.item.installTarget ? `target=${picked.item.installTarget.kind}:${picked.item.installTarget.id}` : undefined,
            picked.item.sourcePath ? `path=${picked.item.sourcePath}` : undefined
        ].filter(Boolean).join(' | '));
    }

    protected async showCatalogItemActions(
        item: (QuickPickItem & { kind: CyberVinciCatalogItemKind; id: string; source?: string; sourcePath?: string; definition?: CyberVinciDeclarativeChatAgent | CyberVinciDeclarativeTool }) | undefined
    ): Promise<void> {
        if (!item || !this.quickPickService) {
            return;
        }
        const locations = await this.service.getCatalogLocations();
        const actions: Array<QuickPickItem & {
            action: 'restore'
                | 'delete-user'
                | 'details'
                | 'open'
                | 'duplicate-user'
                | 'create-override'
                | 'show-tool-definition'
                | 'test-tool'
                | 'run-playbook'
                | 'set-chat-playbook'
                | 'assign-playbook'
                | 'assign-playbook-to-agent'
                | 'show-playbook-states'
                | 'show-agent-capabilities'
                | 'test-agent'
                | 'run-agent-simulation'
        }> = [
            {
                action: 'details',
                label: 'Show Details',
                description: item.sourcePath ?? item.source ?? locations.root,
                detail: item.detail
            }
        ];
        if (item.sourcePath) {
            actions.unshift({
                action: 'open',
                label: 'Open Source File',
                description: item.sourcePath,
                detail: 'Open the YAML/JSON file that contributed this catalog item.'
            });
        }
        actions.push({
            action: 'duplicate-user',
            label: 'Duplicate To User Catalog',
            description: `${item.kind}:${item.id}`,
            detail: 'Create an editable user copy with a non-conflicting id.'
        });
        if (item.source !== 'user' && item.source !== 'runtime') {
            actions.push({
                action: 'create-override',
                label: 'Create System Override',
                description: `${item.kind}:${item.id}`,
                detail: 'Create an editable system-overrides copy with the same id.'
            });
        }
        if (item.kind === 'agent') {
            actions.push({
                action: 'show-agent-capabilities',
                label: 'Show Capabilities',
                description: item.id,
                detail: 'Inspect tools, guards, functions, variables, modes, prompts, and model requirements resolved for this Agent.'
            });
            actions.push({
                action: 'assign-playbook',
                label: 'Set Default Playbook',
                description: item.id,
                detail: 'Choose a Playbook and persist it as this Agent default.'
            });
            actions.push({
                action: 'test-agent',
                label: 'Test Agent Preflight',
                description: item.id,
                detail: 'Runs the deterministic agent readiness guard without invoking a chat turn.'
            });
            actions.push({
                action: 'run-agent-simulation',
                label: 'Run Agent Simulation',
                description: item.id,
                detail: 'Runs this Agent default Playbook with configurable prompt/input and opens the recorded Run Inspector.'
            });
        }
        if (item.kind === 'tool') {
            actions.push({
                action: 'show-tool-definition',
                label: 'Show Definition',
                description: item.id,
                detail: 'Inspect input schema, output schema, policy, capabilities, and composite steps.'
            });
            actions.push({
                action: 'test-tool',
                label: 'Test Tool',
                description: item.id,
                detail: 'Runs safe read-only host/query tools through the runtime, or command tools through the declarative bridge, with empty or JSON input.'
            });
        }
        if (item.kind === 'playbook') {
            actions.push({
                action: 'set-chat-playbook',
                label: 'Use In Chat Toolbar',
                description: item.id,
                detail: 'Set this Playbook as the active AI Chat Playbook selector value.'
            });
            actions.push({
                action: 'show-playbook-states',
                label: 'Show States',
                description: item.id,
                detail: 'Inspect this Playbook state machine without opening YAML.'
            });
            actions.push({
                action: 'assign-playbook-to-agent',
                label: 'Assign To Agent',
                description: item.id,
                detail: 'Choose an Agent and persist this Playbook as its default.'
            });
            actions.push({
                action: 'run-playbook',
                label: 'Run Simulation',
                description: item.id,
                detail: 'Choose a prompt/input preset, run this Playbook through the CyberVinci runtime, and inspect the recorded run.'
            });
        }
        if (item.source === 'system-override') {
            actions.unshift({
                action: 'restore',
                label: 'Restore Bundled Definition',
                description: `${item.kind}:${item.id}`,
                detail: 'Remove this system override and fall back to the bundled system definition.'
            });
        }
        if (item.source === 'user') {
            actions.unshift({
                action: 'delete-user',
                label: 'Delete User Copy',
                description: `${item.kind}:${item.id}`,
                detail: 'Remove this user catalog item. Bundled system definitions remain available.'
            });
        }
        const action = await this.quickPickService.show(actions, {
            title: `${item.label}`,
            placeholder: 'Choose a catalog action.'
        });
        if (!action) {
            return;
        }
        if (action.action === 'open') {
            await this.openCatalogPath(item.sourcePath);
            return;
        }
        if (action.action === 'restore') {
            const result = await this.service.restoreSystemOverride(item.kind, item.id);
            if (result.ok) {
                this.messageService.info(result.message);
                await this.refreshDeclarativeChatAgents();
            } else {
                this.messageService.warn(result.message);
            }
            return;
        }
        if (action.action === 'delete-user') {
            const result = await this.service.deleteUserCatalogItem(item.kind, item.id);
            if (result.ok) {
                this.messageService.info(result.message);
                await this.refreshDeclarativeChatAgents();
            } else {
                this.messageService.warn(result.message);
            }
            return;
        }
        if (action.action === 'duplicate-user') {
            const agentDefinition = item.kind === 'agent'
                ? item.definition as CyberVinciDeclarativeChatAgent | undefined
                : undefined;
            const result = item.source === 'runtime' && agentDefinition
                ? await this.service.createUserAgentCopy(agentDefinition)
                : await this.service.duplicateCatalogItemToUser(item.kind, item.id);
            await this.handleCatalogWriteResult(result);
            return;
        }
        if (action.action === 'create-override') {
            const result = await this.service.createSystemOverride(item.kind, item.id);
            await this.handleCatalogWriteResult(result);
            return;
        }
        if (action.action === 'assign-playbook') {
            await this.assignAgentPlaybook(item.id);
            return;
        }
        if (action.action === 'test-agent') {
            await this.testDeclarativeAgent(item.id);
            return;
        }
        if (action.action === 'run-agent-simulation') {
            await this.runAgentSimulation(item.id);
            return;
        }
        if (action.action === 'show-agent-capabilities') {
            await this.showAgentCapabilities(item.id);
            return;
        }
        if (action.action === 'show-playbook-states') {
            await this.showPlaybookStates(item.id);
            return;
        }
        if (action.action === 'assign-playbook-to-agent') {
            await this.assignPlaybookToAgent(item.id);
            return;
        }
        if (action.action === 'set-chat-playbook') {
            await this.setChatToolbarPlaybook(item.id);
            return;
        }
        if (action.action === 'test-tool') {
            await this.testDeclarativeTool(item.id);
            return;
        }
        if (action.action === 'show-tool-definition') {
            await this.showToolDefinition(item.id, item.kind === 'tool' ? item.definition as CyberVinciDeclarativeTool | undefined : undefined);
            return;
        }
        if (action.action === 'run-playbook') {
            await this.runPlaybookSimulation(item.id);
            return;
        }
        this.messageService.info([
            `${item.kind}:${item.id}`,
            item.source ? `source=${item.source}` : undefined,
            item.sourcePath ? `path=${item.sourcePath}` : undefined,
            locations.root ? `catalog=${locations.root}` : undefined
        ].filter(Boolean).join(' | '));
    }

    protected async showToolDefinition(toolId: string, definition?: CyberVinciDeclarativeTool): Promise<void> {
        if (!this.quickPickService) {
            return;
        }
        const tool = definition ?? (await this.service.listTools()).find(candidate => candidate.id === toolId);
        if (!tool) {
            this.messageService.warn(`Tool '${toolId}' was not found.`);
            return;
        }
        const sections: Array<QuickPickItem & { section: string }> = [
            {
                section: 'summary',
                label: 'Summary',
                description: [tool.kind ?? 'tool', tool.implementation ?? 'host', tool.source ?? 'core'].filter(Boolean).join(' | '),
                detail: [
                    tool.name,
                    tool.description,
                    tool.protected ? 'protected=true' : 'protected=false',
                    tool.exposeToModel === false ? 'exposeToModel=false' : 'exposeToModel=true',
                    tool.sourcePath ? `sourcePath=${tool.sourcePath}` : undefined
                ].filter(Boolean).join(' | ')
            },
            {
                section: 'inputSchema',
                label: 'Input Schema',
                description: tool.inputSchema ? 'defined' : 'not defined',
                detail: this.compactJson(tool.inputSchema)
            },
            {
                section: 'outputSchema',
                label: 'Output Schema',
                description: tool.outputSchema ? 'defined' : 'not defined',
                detail: this.compactJson(tool.outputSchema)
            },
            {
                section: 'policy',
                label: 'Policy',
                description: tool.policy ? 'defined' : 'default',
                detail: this.compactJson(tool.policy)
            },
            {
                section: 'capabilities',
                label: 'Capabilities',
                description: tool.capabilities ? 'defined' : 'not defined',
                detail: this.compactJson(tool.capabilities)
            },
            {
                section: 'entry',
                label: 'Entry',
                description: tool.entry ? tool.entry.type ?? 'defined' : 'not defined',
                detail: this.compactJson(tool.entry)
            },
            {
                section: 'binding',
                label: 'Runtime Binding',
                description: tool.command ?? tool.theiaToolId ?? tool.implementation ?? 'host',
                detail: this.compactJson({
                    command: tool.command,
                    theiaToolId: tool.theiaToolId,
                    args: tool.args,
                    cwd: tool.cwd,
                    env: tool.env,
                    shell: tool.shell,
                    timeoutMs: tool.timeoutMs
                })
            },
            {
                section: 'steps',
                label: 'Composite Steps',
                description: tool.steps?.length ? `${tool.steps.length} step(s)` : 'not a composite tool',
                detail: this.compactJson(tool.steps)
            }
        ];
        await this.quickPickService.show(sections, {
            title: `Tool Definition: ${tool.id}`,
            placeholder: 'Inspect schema, policy, capabilities, entries, and composite steps.'
        });
    }

    protected compactJson(value: unknown): string | undefined {
        if (value === undefined) {
            return undefined;
        }
        const serialized = JSON.stringify(redactCyberVinciSecrets(value));
        if (!serialized) {
            return undefined;
        }
        return serialized.length > 900 ? `${serialized.slice(0, 897)}...` : serialized;
    }

    protected async handleCatalogWriteResult(result: { ok: boolean; message: string; path?: string; paths?: string[] }): Promise<void> {
        if (result.ok) {
            this.messageService.info(result.message);
            await this.refreshDeclarativeChatAgents();
            await this.openCatalogPaths(result.paths?.length ? result.paths : result.path ? [result.path] : []);
        } else {
            this.messageService.warn(result.message);
        }
    }

    protected async openCatalogPaths(filePaths: string[]): Promise<void> {
        for (const filePath of [...new Set(filePaths.filter(Boolean))]) {
            await this.openCatalogPath(filePath);
        }
    }

    protected async openCatalogPath(filePath: string | undefined): Promise<void> {
        if (!filePath) {
            return;
        }
        await open(this.openerService, URI.fromFilePath(filePath));
    }

    protected async assignAgentPlaybook(agentId: string): Promise<void> {
        if (!this.quickPickService) {
            return;
        }
        const playbooks = await this.service.listPlaybooks();
        const picked = await this.quickPickService.show<QuickPickItem & { id: string }>(
            playbooks.map(playbook => ({
                id: playbook.id,
                label: playbook.name,
                description: [playbook.category, playbook.id, playbook.source ?? 'system'].filter(Boolean).join(' | '),
                detail: playbook.description
            })),
            {
                title: `Set Default Playbook For ${agentId}`,
                placeholder: 'Choose the Playbook this Agent should use by default.'
            }
        );
        if (!picked) {
            return;
        }
        await this.handleCatalogWriteResult(await this.service.assignAgentDefaultPlaybook(agentId, picked.id));
    }

    protected async setChatToolbarPlaybook(playbookId: string): Promise<void> {
        const normalized = playbookId.trim();
        if (!normalized) {
            this.messageService.warn('Playbook id is required.');
            return;
        }
        await this.preferenceService.set(
            CYBERVINCI_AI_CHAT_PLAYBOOK_PREF,
            normalized,
            PreferenceScope.User
        );
        this.messageService.info(`AI Chat Playbook selector set to '${normalized}'.`);
    }

    protected async assignPlaybookToAgent(playbookId: string): Promise<void> {
        if (!this.quickPickService) {
            return;
        }
        const manifest = await this.service.getDeclarativeChatAgentManifest();
        const agents = this.withRuntimeNativeAgents(manifest.agents);
        const picked = await this.quickPickService.show<QuickPickItem & { definition: CyberVinciDeclarativeChatAgent }>(
            agents
                .slice()
                .sort((left, right) => (left.category ?? '').localeCompare(right.category ?? '') || left.name.localeCompare(right.name))
                .map(agent => ({
                    definition: agent,
                    label: agent.name,
                    description: [agent.kind, agent.id, agent.source ?? 'system', agent.defaultPlaybook ? `current=${agent.defaultPlaybook}` : undefined].filter(Boolean).join(' | '),
                    detail: agent.description
                })),
            {
                title: `Assign ${playbookId} To Agent`,
                placeholder: 'Choose the Agent that should use this Playbook by default.'
            }
        );
        if (!picked) {
            return;
        }
        const agent = picked.definition;
        if (agent.source === 'runtime') {
            await this.handleCatalogWriteResult(await this.service.createUserAgentCopy({
                ...agent,
                defaultPlaybook: playbookId,
                playbooks: [playbookId, ...(agent.playbooks ?? []).filter(candidate => candidate !== playbookId)]
            }));
            return;
        }
        await this.handleCatalogWriteResult(await this.service.assignAgentDefaultPlaybook(agent.id, playbookId));
    }

    protected async showPlaybookStates(playbookId: string): Promise<void> {
        if (!this.quickPickService) {
            return;
        }
        const playbook = await this.service.getPlaybook(playbookId);
        if (!playbook) {
            this.messageService.warn(`Playbook '${playbookId}' was not found.`);
            return;
        }
        await this.quickPickService.show(
            playbook.states.map(state => ({
                label: state.id,
                description: [
                    state.type,
                    state.tool ? `tool=${state.tool}` : undefined,
                    state.guard ? `guard=${state.guard}` : undefined,
                    state.agent ? `agent=${state.agent}` : undefined,
                    (state.playbook ?? state.playbookId) ? `playbook=${state.playbook ?? state.playbookId}` : undefined,
                    state.mode ? `mode=${state.mode}` : undefined
                ].filter(Boolean).join(' | '),
                detail: [
                    state.label,
                    state.description,
                    state.prompt,
                    state.text,
                    state.transitions?.length ? `transitions: ${state.transitions.map(transition => transition.to).join(', ')}` : undefined,
                    state.cases?.length ? `cases: ${state.cases.map(item => item.next).join(', ')}` : undefined,
                    state.default ? `default: ${state.default}` : undefined,
                    state.saveAs ? `saveAs: ${state.saveAs}` : undefined
                ].filter(Boolean).join(' | ')
            })),
            {
                title: `States: ${playbook.name}`,
                placeholder: `${playbook.states.length} state(s), entry=${playbook.entry}`
            }
        );
    }

    protected async testDeclarativeAgent(agentId: string): Promise<void> {
        try {
            const result = await this.toolRegistry.executeTool('core.agent.preflight', {
                requestId: `manager-agent-test-${Date.now().toString(36)}`,
                input: {
                    agentId
                },
                state: {
                    agent: {
                        id: agentId
                    }
                }
            });
            const diagnostics = result.diagnostics?.length ? ` diagnostics=${result.diagnostics.join(' | ')}` : '';
            if (result.ok) {
                this.messageService.info(`Agent '${agentId}' preflight completed.${result.message ? ` ${result.message}` : ''}${diagnostics}`);
            } else {
                this.messageService.warn(`Agent '${agentId}' preflight found issues.${result.message ? ` ${result.message}` : ''}${diagnostics}`);
            }
        } catch (error) {
            this.messageService.error(`Agent '${agentId}' preflight failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    protected async runAgentSimulation(agentId: string): Promise<void> {
        try {
            const agents = await this.service.getDeclarativeChatAgentManifest().then(manifest => this.withRuntimeNativeAgents(manifest.agents));
            const agent = agents.find(candidate => candidate.id === agentId || candidate.sourceAgentId === agentId);
            if (!agent) {
                this.messageService.warn(`Agent '${agentId}' was not found.`);
                return;
            }
            const playbookId = agent.defaultPlaybook?.trim()
                || (agent.sourceAgentId || agent.kind === 'native'
                    ? `${CYBERVINCI_NATIVE_AGENT_PLAYBOOK_PREFIX}${agent.sourceAgentId ?? agent.id}`
                    : undefined)
                || 'direct-chat';
            const simulation = await this.collectPlaybookSimulationInput(
                playbookId,
                this.defaultAgentSimulationPrompt(agent),
                {
                    agentId: agent.id,
                    sourceAgentId: agent.sourceAgentId ?? agent.id,
                    agentName: agent.name,
                    agentKind: agent.kind,
                    source: 'manager-agent-simulation'
                }
            );
            if (!simulation) {
                return;
            }
            const result = await this.playbookRuntime.runPlaybookById(playbookId, simulation.prompt, {
                ...simulation.input,
                agentId: agent.id,
                sourceAgentId: agent.sourceAgentId ?? agent.id,
                agentName: agent.name,
                source: 'manager-agent-simulation',
                simulation: true
            });
            const resultValue = this.record(result.value);
            const requestId = typeof resultValue?.requestId === 'string' ? resultValue.requestId : undefined;
            const diagnostics = result.diagnostics?.length ? ` diagnostics=${result.diagnostics.join(' | ')}` : '';
            if (result.ok) {
                this.messageService.info(`Agent '${agent.name}' simulation completed through '${playbookId}'${requestId ? ` (${requestId})` : ''}.${result.message ? ` ${result.message}` : ''}${diagnostics}`);
            } else {
                this.messageService.warn(`Agent '${agent.name}' simulation finished with issues through '${playbookId}'${requestId ? ` (${requestId})` : ''}.${result.message ? ` ${result.message}` : ''}${diagnostics}`);
            }
            const run = requestId
                ? this.playbookRuntime.getRecentRuns().find(candidate => candidate.requestId === requestId)
                : this.playbookRuntime.getRecentRuns().find(candidate => candidate.playbookId === playbookId && candidate.agentId === agent.id);
            if (run) {
                await this.showPlaybookRunInspector(run);
            }
        } catch (error) {
            this.messageService.error(`Agent '${agentId}' simulation failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    protected defaultAgentSimulationPrompt(agent: CyberVinciDeclarativeChatAgent): string {
        const source = agent.sourceAgentId ? ` native source '${agent.sourceAgentId}'` : '';
        return `Simulate CyberVinci Agent '${agent.name}'${source}. Validate its selected/default Playbook route, readiness, migration status, tool requirements, diagnostics, and response behavior for a representative manager request.`;
    }

    protected async showAgentCapabilities(agentId: string): Promise<void> {
        if (!this.quickPickService) {
            return;
        }
        try {
            const result = await this.toolRegistry.executeTool('core.agent.describe', {
                requestId: `manager-agent-capabilities-${Date.now().toString(36)}`,
                input: {
                    agentId
                },
                state: {
                    agent: {
                        id: agentId
                    }
                }
            });
            if (!result.ok || !result.value || typeof result.value !== 'object') {
                this.messageService.warn(`Agent '${agentId}' capabilities could not be resolved.${result.message ? ` ${result.message}` : ''}`);
                return;
            }
            const value = result.value as Record<string, unknown>;
            const agent = this.record(value.agent);
            const capabilityProfile = this.record(agent?.capabilityProfile ?? value.capabilityProfile);
            const migrationStatus = this.record(agent?.migrationStatus ?? value.migrationStatus);
            const sections = [
                {
                    label: 'Summary',
                    description: [agent?.kind, agent?.source, agent?.sourceAgentId ? `sourceAgent=${agent.sourceAgentId}` : undefined].filter(Boolean).join(' | '),
                    detail: [agent?.name, agent?.description, agent?.defaultPlaybook ? `defaultPlaybook=${agent.defaultPlaybook}` : undefined].filter(Boolean).join(' | ')
                },
                {
                    label: 'Migration Status',
                    description: this.migrationStatusDescription(migrationStatus),
                    detail: this.compactJson(migrationStatus)
                },
                this.capabilitySection('Tools', capabilityProfile?.tools),
                this.capabilitySection('Guards', capabilityProfile?.guards),
                this.capabilitySection('Functions', capabilityProfile?.functions),
                this.capabilitySection('Variables', capabilityProfile?.variables),
                this.capabilitySection('Modes', capabilityProfile?.modes),
                this.capabilitySection('Prompts', capabilityProfile?.prompts),
                this.capabilitySection('Prompt Sets', capabilityProfile?.promptSets),
                this.capabilitySection('Language Models', capabilityProfile?.languageModels),
                this.capabilitySection('Preserve Native', agent?.preserveNative),
                this.capabilitySection('Playbooks', agent?.playbooks)
            ];
            await this.quickPickService.show(sections, {
                title: `Agent Capabilities: ${String(agent?.name ?? agentId)}`,
                placeholder: 'Inspect resolved declarative and native capability metadata.'
            });
        } catch (error) {
            this.messageService.error(`Agent '${agentId}' capability inspection failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    protected capabilitySection(label: string, value: unknown): QuickPickItem {
        const count = Array.isArray(value)
            ? value.length
            : value && typeof value === 'object'
                ? Object.keys(value).length
                : value === undefined
                    ? 0
                    : 1;
        return {
            label,
            description: count ? `${count}` : 'none',
            detail: this.compactJson(value)
        };
    }

    protected record(value: unknown): Record<string, unknown> | undefined {
        return value && typeof value === 'object' && !Array.isArray(value)
            ? value as Record<string, unknown>
            : undefined;
    }

    protected async testDeclarativeTool(toolId: string): Promise<void> {
        try {
            const tool = (await this.service.listTools()).find(candidate => candidate.id === toolId);
            const testInput = await this.collectToolTestInput(toolId, tool);
            if (!testInput) {
                return;
            }
            if (tool?.implementation === 'host') {
                if (!this.isSafeManagerToolTest(tool)) {
                    this.messageService.warn(`Tool '${toolId}' is an effect/action tool and was not run from the Manager.`);
                    return;
                }
                const result = await this.toolRegistry.executeTool(toolId, {
                    requestId: `manager-test-${Date.now().toString(36)}`,
                    input: testInput.input,
                    state: {}
                });
                const diagnostics = result.diagnostics?.length ? ` diagnostics=${result.diagnostics.join(' | ')}` : '';
                if (result.ok) {
                    this.messageService.info(`Tool '${toolId}' runtime test completed.${result.message ? ` ${result.message}` : ''}${diagnostics}`);
                } else {
                    this.messageService.warn(`Tool '${toolId}' runtime test failed.${result.message ? ` ${result.message}` : ''}${diagnostics}`);
                }
                return;
            }
            const result = await this.service.executeDeclarativeTool(toolId, testInput.rawJson);
            const output = [
                `exitCode=${result.exitCode}`,
                result.stdout.trim(),
                result.stderr.trim() ? `stderr=${result.stderr.trim()}` : undefined
            ].filter(Boolean).join(' | ');
            if (result.exitCode === 0 || result.exitCode === null) {
                this.messageService.info(`Tool '${toolId}' test completed. ${output}`);
            } else {
                this.messageService.warn(`Tool '${toolId}' test failed. ${output}`);
            }
        } catch (error) {
            this.messageService.error(`Tool '${toolId}' test failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    protected async collectToolTestInput(
        toolId: string,
        tool: CyberVinciDeclarativeTool | undefined
    ): Promise<{ input: Record<string, unknown>; rawJson: string } | undefined> {
        if (!this.quickInputService || !this.quickPickService) {
            return { input: {}, rawJson: '{}' };
        }
        const picked = await this.quickPickService.show<QuickPickItem & { mode: 'empty' | 'json' }>(
            [
                {
                    mode: 'empty',
                    label: 'Empty Input',
                    description: toolId,
                    detail: 'Run with {}.'
                },
                {
                    mode: 'json',
                    label: 'JSON Input',
                    description: tool?.inputSchema ? 'input schema available' : 'custom object',
                    detail: tool?.inputSchema ? this.compactJson(tool.inputSchema) : 'Enter an object such as {"prompt":"smoke"}'
                }
            ],
            {
                title: `Test Tool: ${toolId}`,
                placeholder: 'Choose the Manager test input.'
            }
        );
        if (!picked) {
            return undefined;
        }
        if (picked.mode === 'empty') {
            return { input: {}, rawJson: '{}' };
        }
        const rawJson = await this.quickInputService.input({
            title: `Tool JSON Input: ${toolId}`,
            placeHolder: '{"prompt":"manager test"}',
            value: '{}'
        });
        if (rawJson === undefined) {
            return undefined;
        }
        const parsed = JSON.parse(rawJson);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new Error('Tool test JSON input must be an object.');
        }
        return {
            input: parsed as Record<string, unknown>,
            rawJson: JSON.stringify(parsed)
        };
    }

    protected async runPlaybookSimulation(playbookId: string): Promise<void> {
        try {
            const simulation = await this.collectPlaybookSimulationInput(playbookId);
            if (!simulation) {
                return;
            }
            const { prompt, input } = simulation;
            const result = await this.playbookRuntime.runPlaybookById(playbookId, prompt, {
                ...input,
                source: 'manager-simulation',
                simulation: true
            });
            const resultValue = this.record(result.value);
            const requestId = typeof resultValue?.requestId === 'string' ? resultValue.requestId : undefined;
            const diagnostics = result.diagnostics?.length ? ` diagnostics=${result.diagnostics.join(' | ')}` : '';
            if (result.ok) {
                this.messageService.info(`Playbook '${playbookId}' simulation completed${requestId ? ` (${requestId})` : ''}.${result.message ? ` ${result.message}` : ''}${diagnostics}`);
            } else {
                this.messageService.warn(`Playbook '${playbookId}' simulation finished with issues${requestId ? ` (${requestId})` : ''}.${result.message ? ` ${result.message}` : ''}${diagnostics}`);
            }
            const run = requestId
                ? this.playbookRuntime.getRecentRuns().find(candidate => candidate.requestId === requestId)
                : this.playbookRuntime.getRecentRuns().find(candidate => candidate.playbookId === playbookId);
            if (run) {
                await this.showPlaybookRunInspector(run);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.messageService.error(`Playbook '${playbookId}' simulation failed: ${message}`);
        }
    }

    protected async collectPlaybookSimulationInput(
        playbookId: string,
        defaultPrompt = this.defaultPlaybookSimulationPrompt(playbookId),
        baseInput: Record<string, unknown> = {}
    ): Promise<{ prompt: string; input: Record<string, unknown> } | undefined> {
        const defaultInput: Record<string, unknown> = {
            ...baseInput,
            playbookId,
            source: typeof baseInput.source === 'string' ? baseInput.source : 'manager-simulation'
        };
        if (!this.quickInputService || !this.quickPickService) {
            return { prompt: defaultPrompt, input: defaultInput };
        }
        const picked = await this.quickPickService.show<QuickPickItem & { mode: 'preset' | 'custom' | 'custom-json' | 'canvas-qa' }>(
            [
                {
                    mode: 'preset',
                    label: 'Preset Prompt',
                    description: playbookId,
                    detail: defaultPrompt
                },
                {
                    mode: 'custom',
                    label: 'Custom Prompt',
                    description: 'Prompt only',
                    detail: 'Enter the prompt used as input.prompt/rawPrompt for this simulation.'
                },
                {
                    mode: 'custom-json',
                    label: 'Custom Prompt + JSON Input',
                    description: 'Prompt plus extra input object',
                    detail: 'Adds parsed JSON fields to the Playbook input object.'
                },
                {
                    mode: 'canvas-qa',
                    label: 'Canvas QA Prompt',
                    description: 'Design QA preset',
                    detail: 'Useful for canvas-design-qa or Canvas-oriented Playbooks.'
                }
            ],
            {
                title: `Run Playbook Simulation: ${playbookId}`,
                placeholder: 'Choose how to provide simulation input.'
            }
        );
        if (!picked) {
            return undefined;
        }
        const prompt = picked.mode === 'canvas-qa'
            ? this.canvasQaSimulationPrompt()
            : picked.mode === 'preset'
                ? defaultPrompt
                : await this.quickInputService.input({
                    title: `Simulation Prompt: ${playbookId}`,
                    placeHolder: 'Prompt to run through this Playbook',
                    value: defaultPrompt
                });
        if (prompt === undefined) {
            return undefined;
        }
        let input = defaultInput;
        if (picked.mode === 'custom-json') {
            const rawJson = await this.quickInputService.input({
                title: `Simulation JSON Input: ${playbookId}`,
                placeHolder: '{"agentId":"ProjectInfo","skipNativeMcpPrompt":true}',
                value: '{}'
            });
            if (rawJson === undefined) {
                return undefined;
            }
            const parsed = JSON.parse(rawJson);
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                throw new Error('Simulation JSON input must be an object.');
            }
            input = {
                ...defaultInput,
                ...parsed as Record<string, unknown>
            };
        }
        return { prompt, input };
    }

    protected defaultPlaybookSimulationPrompt(playbookId: string): string {
        if (playbookId === 'canvas-design-qa') {
            return this.canvasQaSimulationPrompt();
        }
        if (playbookId.startsWith(CYBERVINCI_NATIVE_AGENT_PLAYBOOK_PREFIX)) {
            const agentId = playbookId.slice(CYBERVINCI_NATIVE_AGENT_PLAYBOOK_PREFIX.length);
            return `Simulate the migrated native agent '${agentId}' and report whether the Playbook can answer without native delegation.`;
        }
        if (playbookId.includes('flow')) {
            return `Simulate Flow routing for CyberVinci Playbook '${playbookId}' and report the selected route, inputs, and artifacts.`;
        }
        return `Manager simulation for CyberVinci Playbook '${playbookId}'. Validate transitions, tools, diagnostics, and produced artifacts.`;
    }

    protected canvasQaSimulationPrompt(): string {
        return 'Validate the current Canvas design against the user request, check overlaps, text overflow, footer completeness, clone completeness, and repair if needed.';
    }

    protected isSafeManagerToolTest(tool: CyberVinciDeclarativeTool): boolean {
        const kind = tool.kind ?? 'tool';
        if (['action', 'effect', 'flow', 'ui'].includes(kind)) {
            return false;
        }
        if (tool.policy?.allowWorkspaceWrite || tool.policy?.allowShell || tool.policy?.requiresApproval || tool.policy?.requiresConfirmation || tool.policy?.approval === 'always') {
            return false;
        }
        return true;
    }

    protected applyNativeAgentInvokeOverlay(
        agent: ChatAgent & {
            invoke: ChatAgent['invoke'];
            defaultPlaybook?: string;
            playbooks?: string[];
            [CYBERVINCI_NATIVE_AGENT_OVERLAY]?: CyberVinciNativeAgentOverlayState;
        },
        definition: CyberVinciDeclarativeChatAgent
    ): void {
        const existing = agent[CYBERVINCI_NATIVE_AGENT_OVERLAY];
        const originalInvoke = existing?.originalInvoke ?? agent.invoke.bind(agent);
        agent[CYBERVINCI_NATIVE_AGENT_OVERLAY] = {
            originalInvoke,
            definition
        };
        agent.invoke = async (request, chatAgentService) => {
            const overlay = agent[CYBERVINCI_NATIVE_AGENT_OVERLAY];
            const activeDefinition = overlay?.definition ?? definition;
            await this.playbookRuntime.invokeAgentTurn(
                activeDefinition,
                request,
                () => originalInvoke(request, chatAgentService)
            );
        };
    }
}

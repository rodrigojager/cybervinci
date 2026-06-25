// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { ILogger, MessageService } from '@theia/core';
import { CyberVinciAiRuntimeFrontendService } from '@cybervinci/ai-runtime/lib/browser/ai-runtime-frontend-service';
import { CyberVinciAiEffectPolicy, CyberVinciAiExecutionSelection } from '@cybervinci/ai-runtime/lib/common';
import { CodexProviderOptions, CodexProviderRuntime } from '@cybervinci/ai-providers/lib/common';
import {
    CODEX_CLI_CLAUDE_AGENT_PREF,
    CODEX_CLI_CLAUDE_EXECUTABLE_PATH_PREF,
    CODEX_CLI_CURSOR_EXECUTABLE_PATH_PREF,
    CODEX_CLI_CURSOR_MODE_PREF,
    CODEX_CLI_EXECUTABLE_PATH_PREF,
    CODEX_CLI_GEMINI_EXECUTABLE_PATH_PREF,
    CODEX_CLI_MODEL_PREF,
    CODEX_CLI_MODEL_PROVIDER_PREF,
    CODEX_CLI_OPENCODE_AGENT_PREF,
    CODEX_CLI_OPENCODE_API_KEY_PREF,
    CODEX_CLI_OPENCODE_EXECUTABLE_PATH_PREF,
    CODEX_CLI_OPENCODE_VARIANT_PREF,
    CODEX_CLI_OPENROUTER_API_KEY_PREF,
    CODEX_CLI_PROFILE_PREF,
    CODEX_CLI_REASONING_EFFORT_PREF,
    CODEX_CLI_REASONING_VARIANT_OPTIONS_PREF,
    CODEX_CLI_REASONING_VARIANT_PREF,
    CODEX_CLI_RUNTIME_PREF,
    CODEX_CLI_SERVICE_TIER_PREF
} from '@cybervinci/ai-providers/lib/common/ai-providers-preferences';
import { ErrorChatResponseContentImpl, MarkdownChatResponseContentImpl, QuestionResponseContentImpl } from '@theia/ai-chat/lib/common/chat-model';
import { MutableChatRequestModel } from '@theia/ai-chat/lib/common';
import { PreferenceService } from '@theia/core/lib/common/preferences';
import { QuickPickItem, QuickPickService } from '@theia/core/lib/common/quick-pick-service';
import { inject, injectable, optional, postConstruct } from '@theia/core/shared/inversify';
import {
    CyberVinciAgent,
    CyberVinciAiChatExperienceService,
    CyberVinciDeclarativeChatAgent,
    CyberVinciHostToolExecutionContext,
    CyberVinciHostToolExecutionResult,
    CyberVinciPlaybookAskOption,
    CyberVinciPlaybookCondition,
    CyberVinciPlaybookDefinition,
    CyberVinciPlaybookState,
    redactCyberVinciSecrets
} from '../common';
import { CYBERVINCI_AI_CHAT_AGENT_PROFILE_PREF, CYBERVINCI_AI_CHAT_MODE_PREF, CYBERVINCI_AI_CHAT_WORKDIR_PREF } from './cybervinci-ai-chat-experience-preferences';
import { CyberVinciToolRegistry } from './cybervinci-tool-registry';

export const CYBERVINCI_DIRECT_CHAT_PLAYBOOK_ID = 'direct-chat';
export const CYBERVINCI_AI_CHAT_FLOW_ROUTE_PLAYBOOK_ID = 'ai-chat-flow-route';
export const CYBERVINCI_NATIVE_AGENT_DELEGATE_PLAYBOOK_ID = 'native-agent-delegate';
export const CYBERVINCI_NATIVE_AGENT_PLAYBOOK_PREFIX = 'native-agent.';

const MAX_PLAYBOOK_STEPS = 64;
const MAX_RUN_HISTORY = 100;
export const CYBERVINCI_PLAYBOOK_RUN_HISTORY_STORAGE_KEY = 'cybervinci.aiChat.playbookRunHistory.v1';

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

@injectable()
export class CyberVinciPlaybookRuntime {

    @inject(CyberVinciAiChatExperienceService)
    protected readonly service: CyberVinciAiChatExperienceService;

    @inject(CyberVinciToolRegistry)
    protected readonly toolRegistry: CyberVinciToolRegistry;

    @inject(PreferenceService)
    protected readonly preferenceService: PreferenceService;

    @inject(MessageService)
    protected readonly messageService: MessageService;

    @inject(ILogger)
    protected readonly logger: ILogger;

    @inject(QuickPickService) @optional()
    protected readonly quickPickService: QuickPickService | undefined;

    @inject(CyberVinciAiRuntimeFrontendService) @optional()
    protected readonly aiRuntime: CyberVinciAiRuntimeFrontendService | undefined;

    protected readonly runHistory: CyberVinciPlaybookRunRecord[] = [];

    @postConstruct()
    protected init(): void {
        this.loadRunHistory();
        this.toolRegistry.setPlaybookRunner((playbookId, context) => this.runPlaybookAsTool(playbookId, context));
        this.toolRegistry.setPlaybookResumer((requestId, context) => this.resumeRunAsTool(requestId, context));
    }

    protected withCurrentExecutionInput(overrides: Record<string, unknown> = {}): Partial<CyberVinciPlaybookExecutionContext['input']> {
        const execution = this.currentExecutionSelection(overrides);
        return {
            execution,
            providerId: this.firstString(overrides.providerId, overrides.provider, execution.providerId),
            model: this.firstString(overrides.model, execution.model),
            runtime: this.firstString(overrides.runtime, execution.runtime),
            modelProvider: this.firstString(overrides.modelProvider, execution.modelProvider),
            reasoningEffort: this.firstString(overrides.reasoningEffort, execution.reasoningEffort),
            reasoningVariant: this.firstString(overrides.reasoningVariant, execution.reasoningVariant),
            serviceTier: this.firstString(overrides.serviceTier, execution.serviceTier),
            cwd: this.firstString(overrides.cwd, execution.cwd)
        };
    }

    protected currentExecutionSelection(overrides: Record<string, unknown> = {}): CyberVinciAiExecutionSelection {
        const configured = this.executionSelectionFromPreferences();
        const explicit = this.asExecutionSelection(overrides.execution);
        const accessPolicy = this.currentExecutionAccessPolicy();
        const runtime = this.firstString(overrides.runtime, explicit?.runtime, configured.runtime) as CodexProviderRuntime | undefined;
        const modelProvider = this.firstString(overrides.modelProvider, explicit?.modelProvider, configured.modelProvider);
        const providerId = this.firstString(
            overrides.providerId,
            overrides.provider,
            explicit?.providerId,
            configured.providerId,
            runtime && modelProvider ? `${runtime}:${modelProvider}` : undefined
        );
        return {
            ...configured,
            ...explicit,
            providerId,
            runtime,
            modelProvider,
            model: this.firstString(overrides.model, explicit?.model, configured.model),
            reasoningEffort: this.firstString(overrides.reasoningEffort, explicit?.reasoningEffort, configured.reasoningEffort) as CyberVinciAiExecutionSelection['reasoningEffort'],
            reasoningVariant: this.firstString(overrides.reasoningVariant, explicit?.reasoningVariant, configured.reasoningVariant),
            reasoningVariantOptions: this.firstRecord(overrides.reasoningVariantOptions, explicit?.reasoningVariantOptions, configured.reasoningVariantOptions),
            serviceTier: this.firstString(overrides.serviceTier, explicit?.serviceTier, configured.serviceTier) as CodexProviderOptions['serviceTier'],
            reasoningPolicy: explicit?.reasoningPolicy ?? configured.reasoningPolicy ?? 'auto',
            approvalPolicy: this.firstString(overrides.approvalPolicy, explicit?.approvalPolicy, configured.approvalPolicy, accessPolicy.approvalPolicy) as CodexProviderOptions['approvalPolicy'],
            sandboxMode: this.firstString(overrides.sandboxMode, explicit?.sandboxMode, configured.sandboxMode, accessPolicy.sandboxMode) as CodexProviderOptions['sandboxMode'],
            collaborationMode: this.firstString(overrides.collaborationMode, explicit?.collaborationMode, configured.collaborationMode, accessPolicy.collaborationMode) as CodexProviderOptions['collaborationMode'],
            cwd: this.firstString(overrides.cwd, explicit?.cwd, configured.cwd)
        };
    }

    protected executionSelectionFromPreferences(): CyberVinciAiExecutionSelection {
        const runtime = this.preferenceService.get<CodexProviderRuntime>(CODEX_CLI_RUNTIME_PREF, 'codex-app-server');
        const modelProvider = this.preferenceService.get<string>(CODEX_CLI_MODEL_PROVIDER_PREF, 'codex');
        const accessPolicy = this.currentExecutionAccessPolicy();
        return {
            providerId: runtime && modelProvider ? `${runtime}:${modelProvider}` : undefined,
            runtime,
            modelProvider,
            model: this.preferenceService.get<string>(CODEX_CLI_MODEL_PREF, undefined),
            reasoningEffort: this.preferenceService.get<CyberVinciAiExecutionSelection['reasoningEffort']>(CODEX_CLI_REASONING_EFFORT_PREF, undefined),
            reasoningVariant: this.preferenceService.get<string>(CODEX_CLI_REASONING_VARIANT_PREF, undefined) ?? 'default',
            reasoningVariantOptions: this.preferenceService.get<Record<string, unknown>>(CODEX_CLI_REASONING_VARIANT_OPTIONS_PREF, undefined),
            serviceTier: this.preferenceService.get<CodexProviderOptions['serviceTier']>(CODEX_CLI_SERVICE_TIER_PREF, undefined),
            executablePath: this.preferenceService.get<string>(CODEX_CLI_EXECUTABLE_PATH_PREF, undefined),
            profile: this.preferenceService.get<string>(CODEX_CLI_PROFILE_PREF, undefined),
            openRouterApiKey: this.preferenceService.get<string>(CODEX_CLI_OPENROUTER_API_KEY_PREF, undefined),
            openCodeApiKey: this.preferenceService.get<string>(CODEX_CLI_OPENCODE_API_KEY_PREF, undefined),
            openCodeExecutablePath: this.preferenceService.get<string>(CODEX_CLI_OPENCODE_EXECUTABLE_PATH_PREF, undefined),
            openCodeAgent: this.preferenceService.get<string>(CODEX_CLI_OPENCODE_AGENT_PREF, undefined),
            openCodeVariant: this.preferenceService.get<string>(CODEX_CLI_OPENCODE_VARIANT_PREF, undefined),
            geminiExecutablePath: this.preferenceService.get<string>(CODEX_CLI_GEMINI_EXECUTABLE_PATH_PREF, undefined),
            claudeExecutablePath: this.preferenceService.get<string>(CODEX_CLI_CLAUDE_EXECUTABLE_PATH_PREF, undefined),
            claudeAgent: this.preferenceService.get<string>(CODEX_CLI_CLAUDE_AGENT_PREF, undefined),
            cursorExecutablePath: this.preferenceService.get<string>(CODEX_CLI_CURSOR_EXECUTABLE_PATH_PREF, undefined),
            cursorMode: this.preferenceService.get<string>(CODEX_CLI_CURSOR_MODE_PREF, undefined),
            cwd: this.preferenceService.get<string>(CYBERVINCI_AI_CHAT_WORKDIR_PREF, undefined),
            reasoningPolicy: 'auto',
            approvalPolicy: accessPolicy.approvalPolicy,
            sandboxMode: accessPolicy.sandboxMode,
            collaborationMode: accessPolicy.collaborationMode
        };
    }

    protected currentChatMode(): string {
        const value = this.preferenceService.get<string>(CYBERVINCI_AI_CHAT_MODE_PREF, 'chat');
        return typeof value === 'string' && value.trim() ? value.trim().toLocaleLowerCase() : 'chat';
    }

    protected currentExecutionAccessPolicy(): Pick<CyberVinciAiExecutionSelection, 'approvalPolicy' | 'sandboxMode' | 'collaborationMode'> {
        switch (this.currentChatMode()) {
            case 'fullaccess':
                return {
                    approvalPolicy: 'never',
                    sandboxMode: 'danger-full-access',
                    collaborationMode: 'default'
                };
            case 'workspace':
            case 'edit':
                return {
                    approvalPolicy: 'on-request',
                    sandboxMode: 'workspace-write',
                    collaborationMode: 'default'
                };
            case 'plan':
                return {
                    approvalPolicy: 'never',
                    sandboxMode: 'read-only',
                    collaborationMode: 'plan'
                };
            case 'readonly':
            case 'agent-next':
            case 'chat':
            default:
                return {
                    approvalPolicy: 'never',
                    sandboxMode: 'read-only',
                    collaborationMode: 'default'
                };
        }
    }

    protected currentChatEffectPolicy(): CyberVinciAiEffectPolicy {
        switch (this.currentChatMode()) {
            case 'fullaccess':
                return {
                    previewOnly: false,
                    workspaceWrites: 'allowed',
                    shellExecution: 'allowed',
                    requireUserConfirmation: false
                };
            case 'workspace':
            case 'edit':
                return {
                    previewOnly: false,
                    workspaceWrites: 'allowed',
                    shellExecution: 'allow-with-approval',
                    requireUserConfirmation: false
                };
            case 'plan':
            case 'readonly':
            case 'agent-next':
            case 'chat':
            default:
                return {
                    previewOnly: true,
                    workspaceWrites: 'forbidden',
                    shellExecution: 'forbidden',
                    requireUserConfirmation: false
                };
        }
    }

    protected asExecutionSelection(value: unknown): CyberVinciAiExecutionSelection | undefined {
        return value && typeof value === 'object' && !Array.isArray(value)
            ? value as CyberVinciAiExecutionSelection
            : undefined;
    }

    protected firstString(...values: unknown[]): string | undefined {
        for (const value of values) {
            if (typeof value === 'string' && value.trim()) {
                return value.trim();
            }
        }
        return undefined;
    }

    protected firstRecord(...values: unknown[]): Record<string, unknown> | undefined {
        for (const value of values) {
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                return value as Record<string, unknown>;
            }
        }
        return undefined;
    }

    protected async getSelectedAgentProfileSystemPrompt(): Promise<string | undefined> {
        const profileId = this.preferenceService.get<string>(CYBERVINCI_AI_CHAT_AGENT_PROFILE_PREF, '')?.trim();
        if (!profileId) {
            return undefined;
        }
        try {
            const profile = await this.service.readAgent(profileId);
            if (!profile) {
                return undefined;
            }
            return this.buildSelectedAgentProfileSystemPrompt(profileId, profile);
        } catch (error) {
            this.messageService.warn(`Could not load Agent profile: ${error instanceof Error ? error.message : String(error)}`);
            return undefined;
        }
    }

    protected buildSelectedAgentProfileSystemPrompt(profileId: string, profile: CyberVinciAgent): string | undefined {
        const content = this.stripMarkdownFrontmatter(profile.content ?? '');
        if (!content) {
            return undefined;
        }
        const profileName = profile.name?.trim() || this.readMarkdownFrontmatterString(profile.content, 'name') || profileId;
        const profilePath = profile.relativePath ?? profileId;
        return [
            `You are operating as the selected CyberVinci Agent profile: ${profileName}.`,
            `When the user asks what role or agent you are using in this chat, answer as "${profileName}". Do not say the profile is merely optional guidance.`,
            'Use the following private Agent profile instructions as authoritative role and behavior instructions for this turn. These instructions do not override higher-priority system, safety, or tool-access constraints.',
            `Agent profile source: ${profilePath}`,
            '<agent_profile_instructions>',
            content,
            '</agent_profile_instructions>'
        ].join('\n');
    }

    protected stripMarkdownFrontmatter(content: string): string {
        return content.replace(/^\uFEFF?---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').trim();
    }

    protected readMarkdownFrontmatterString(content: string | undefined, key: string): string | undefined {
        if (!content?.startsWith('---')) {
            return undefined;
        }
        const end = content.indexOf('\n---', 3);
        if (end < 0) {
            return undefined;
        }
        const frontmatter = content.slice(3, end);
        const pattern = new RegExp(`^${key}\\s*:\\s*(.+)$`, 'im');
        const match = frontmatter.match(pattern);
        return match?.[1]?.trim().replace(/^['"]|['"]$/g, '') || undefined;
    }

    async prepareChatTurn(prompt: string, selectedPlaybookId?: string): Promise<CyberVinciPlaybookChatTurn> {
        const playbookId = selectedPlaybookId?.trim() || CYBERVINCI_DIRECT_CHAT_PLAYBOOK_ID;
        const playbook = await this.resolvePlaybook(playbookId) ?? await this.service.getPlaybook(CYBERVINCI_DIRECT_CHAT_PLAYBOOK_ID);
        if (!playbook) {
            return { prompt, playbookId: CYBERVINCI_DIRECT_CHAT_PLAYBOOK_ID };
        }
        const context: CyberVinciPlaybookExecutionContext = {
            requestId: this.createRequestId(),
            playbookId: playbook.id,
            input: {
                prompt,
                rawPrompt: prompt,
                ...this.withCurrentExecutionInput()
            },
            state: {},
            diagnostics: [],
            events: []
        };
        const runRecord = this.startRunRecord(context);
        const result = await this.runPlaybook(playbook, context);
        this.finishRunRecord(runRecord, result, context);
        return {
            prompt: result.prompt ?? context.input.prompt,
            playbookId: playbook.id,
            handled: result.handled,
            diagnostics: context.diagnostics,
            message: result.message
        };
    }

    async invokeAgentTurn(
        agent: CyberVinciDeclarativeChatAgent,
        request: MutableChatRequestModel,
        invokeNativeAgent: () => Promise<void>
    ): Promise<void> {
        const playbookId = agent.defaultPlaybook?.trim()
            || this.nativeAgentPlaybookId(agent.sourceAgentId ?? agent.id);
        const playbook = await this.resolvePlaybook(playbookId, agent);
        if (!playbook) {
            const message = `No autonomous CyberVinci playbook is configured for agent '${agent.id}'.`;
            const error = new Error(message);
            request.response.response.addContent(new ErrorChatResponseContentImpl(error));
            request.response.error(error);
            return;
        }
        const context: CyberVinciPlaybookExecutionContext = {
            requestId: this.createRequestId(),
            playbookId: playbook.id,
            input: {
                prompt: request.request.text,
                rawPrompt: request.request.text,
                agentId: agent.id,
                sourceAgentId: agent.sourceAgentId ?? agent.id,
                ...this.withCurrentExecutionInput()
            },
            state: {
                agent: {
                    id: agent.id,
                    name: agent.name,
                    sourceAgentId: agent.sourceAgentId ?? agent.id,
                    kind: agent.kind
                }
            },
            diagnostics: [],
            request,
            invokeNativeAgent: async () => {
                context.events.push({
                    timestamp: Date.now(),
                    type: 'native-agent',
                    message: `Invoking native source agent '${agent.sourceAgentId ?? agent.id}'.`
                });
                await invokeNativeAgent();
            },
            events: []
        };
        const runRecord = this.startRunRecord(context);
        request.addData('cybervinci.playbook.requestId', context.requestId);
        request.addData('cybervinci.playbook.id', playbook.id);
        try {
            const result = await this.runPlaybook(playbook, context);
            this.finishRunRecord(runRecord, result, context);
            if (runRecord.status === 'failed') {
                const message = result.message ?? `CyberVinci playbook '${playbook.id}' failed for agent '${agent.id}'.`;
                const wrapped = new Error(message);
                context.state['cybervinci.playbook.errorContentAdded'] = true;
                request.response.response.addContent(new ErrorChatResponseContentImpl(wrapped));
                request.response.error(wrapped);
            } else if (runRecord.status === 'completed' && context.state['core.agent.invoke.invoked'] !== true) {
                request.response.complete();
            }
        } catch (error) {
            if (context.state['cybervinci.playbook.errorContentAdded'] === true) {
                throw error;
            }
            const message = error instanceof Error ? error.message : String(error);
            context.diagnostics.push(message);
            this.finishRunRecord(runRecord, { handled: true, stop: true, message }, context);
            const wrapped = new Error(`CyberVinci playbook '${playbook.id}' failed for agent '${agent.id}': ${message}`, { cause: error });
            request.response.response.addContent(new ErrorChatResponseContentImpl(wrapped));
            request.response.error(wrapped);
        }
    }

    protected async resolvePlaybook(playbookId: string, agent?: CyberVinciDeclarativeChatAgent): Promise<CyberVinciPlaybookDefinition | undefined> {
        const configured = await this.service.getPlaybook(playbookId);
        if (configured) {
            return configured;
        }
        if (!playbookId.startsWith(CYBERVINCI_NATIVE_AGENT_PLAYBOOK_PREFIX)) {
            return undefined;
        }
        return this.createRuntimeAutonomousPlaybook(playbookId, agent);
    }

    protected createRuntimeAutonomousPlaybook(playbookId: string, agent?: CyberVinciDeclarativeChatAgent): CyberVinciPlaybookDefinition {
        const agentName = agent?.name?.trim() || this.agentIdFromNativePlaybook(playbookId) || 'Native';
        return {
            version: 'cybervinci.playbook/v1',
            id: playbookId,
            name: agentName,
            category: 'Agents',
            source: 'system',
            enabled: true,
            description: `Use ${agentName} for chat requests that should follow this agent's role, available context, setup checks, and response guidance.`,
            entry: 'describe-agent',
            tools: ['core.agent.describe', 'core.agent.preflight', 'system.agent.nativeMcpRequirements'],
            tags: ['Agents', 'Runtime', 'Autonomous'],
            states: [
                {
                    id: 'describe-agent',
                    type: 'tool',
                    tool: 'core.agent.describe',
                    saveAs: 'agentProfile',
                    transitions: [{ to: 'preflight' }]
                },
                {
                    id: 'preflight',
                    type: 'tool',
                    tool: 'core.agent.preflight',
                    saveAs: 'agentPreflight',
                    transitions: [{ to: 'check-native-requirements' }]
                },
                {
                    id: 'check-native-requirements',
                    type: 'tool',
                    tool: 'system.agent.nativeMcpRequirements',
                    saveAs: 'nativeMcpRequirements',
                    transitions: [{ to: 'decide-native-mcp' }]
                },
                {
                    id: 'decide-native-mcp',
                    type: 'condition',
                    cases: [
                        { if: { equals: ['${input.skipNativeMcpPrompt}', true] }, next: 'answer-runtime-agent' },
                        { if: { equals: ['${state.nativeMcpRequirements.recommendedAction}', 'configure'] }, next: 'ask-native-mcp-configure' },
                        { if: { equals: ['${state.nativeMcpRequirements.recommendedAction}', 'start'] }, next: 'ask-native-mcp-start' }
                    ],
                    default: 'answer-runtime-agent'
                },
                {
                    id: 'ask-native-mcp-configure',
                    type: 'ask',
                    label: 'Configure MCP requirement',
                    text: '${state.nativeMcpRequirements.selectedGroupLabel} is not ready for ${state.nativeMcpRequirements.agentName}. Choose how to continue.',
                    saveAs: 'nativeMcpDecision',
                    options: [
                        { id: 'configure-settings', label: 'Configure MCP settings', next: 'configure-native-mcp' },
                        { id: 'cancel', label: 'Cancel', next: 'cancel-native-mcp' }
                    ]
                },
                {
                    id: 'ask-native-mcp-start',
                    type: 'ask',
                    label: 'Start MCP requirement',
                    text: '${state.nativeMcpRequirements.selectedGroupLabel} is configured but not running for ${state.nativeMcpRequirements.agentName}. Choose how to continue.',
                    saveAs: 'nativeMcpDecision',
                    options: [
                        { id: 'start-through-playbook', label: 'Start MCP servers', next: 'ensure-native-mcp' },
                        { id: 'cancel', label: 'Cancel', next: 'cancel-native-mcp' }
                    ]
                },
                {
                    id: 'configure-native-mcp',
                    type: 'tool',
                    tool: 'system.agent.nativeMcpRequirements',
                    args: {
                        mode: 'configure',
                        openSettings: true
                    },
                    saveAs: 'nativeMcpSetup',
                    transitions: [{ to: 'native-mcp-configured-response' }]
                },
                {
                    id: 'ensure-native-mcp',
                    type: 'tool',
                    tool: 'system.agent.nativeMcpRequirements',
                    args: {
                        mode: 'ensure'
                    },
                    saveAs: 'nativeMcpSetup',
                    transitions: [
                        { to: 'answer-runtime-agent', when: { equals: ['${state.nativeMcpSetup.ok}', true] } },
                        { to: 'native-mcp-start-failed' }
                    ]
                },
                {
                    id: 'native-mcp-configured-response',
                    type: 'response',
                    text: 'MCP settings were opened for ${state.nativeMcpRequirements.selectedGroupLabel}. Save the required values and run the agent again.'
                },
                {
                    id: 'native-mcp-start-failed',
                    type: 'response',
                    text: 'Could not start ${state.nativeMcpRequirements.selectedGroupLabel}: ${state.nativeMcpSetup.message}'
                },
                {
                    id: 'cancel-native-mcp',
                    type: 'response',
                    text: '${state.nativeMcpRequirements.selectedGroupLabel} setup was cancelled.'
                },
                {
                    id: 'answer-runtime-agent',
                    type: 'ai',
                    agent: agent?.id ?? agentName,
                    prompt: [
                        `You are ${agentName}. Answer the user's request using the CyberVinci declarative agent runtime.`,
                        '',
                        'User request:',
                        '${input.prompt}',
                        '',
                        'Agent description:',
                        '${state.agentProfile.agent.description}',
                        '',
                        'Use available runtime metadata, MCP readiness, and function/tool capability information from state. Do not invoke or delegate to the original Theia native agent.'
                    ].join('\n'),
                    input: {
                        prompt: '${input.prompt}',
                        agentId: '${input.agentId}',
                        sourceAgentId: '${input.sourceAgentId}',
                        agentProfile: '${state.agentProfile}',
                        preflight: '${state.agentPreflight}',
                        nativeMcpRequirements: '${state.nativeMcpRequirements}'
                    },
                    saveAs: 'runtimeAgentAnswer',
                    transitions: [{ to: 'runtime-agent-response' }]
                },
                {
                    id: 'runtime-agent-response',
                    type: 'response',
                    text: '${state.runtimeAgentAnswer}'
                }
            ]
        };
    }

    protected nativeAgentPlaybookId(agentId: string): string {
        return `${CYBERVINCI_NATIVE_AGENT_PLAYBOOK_PREFIX}${agentId}`;
    }

    protected agentIdFromNativePlaybook(playbookId: string): string | undefined {
        return playbookId.startsWith(CYBERVINCI_NATIVE_AGENT_PLAYBOOK_PREFIX)
            ? playbookId.slice(CYBERVINCI_NATIVE_AGENT_PLAYBOOK_PREFIX.length)
            : undefined;
    }

    getRecentRuns(): CyberVinciPlaybookRunRecord[] {
        return [...this.runHistory];
    }

    async resumeRun(requestId: string): Promise<CyberVinciHostToolExecutionResult> {
        return this.resumeRunAsTool(requestId, {
            requestId,
            input: {},
            state: {}
        });
    }

    async resumeRunWithInput(
        requestId: string,
        input: Record<string, unknown>,
        state: Record<string, unknown> = {}
    ): Promise<CyberVinciHostToolExecutionResult> {
        return this.resumeRunAsTool(requestId, {
            requestId,
            input,
            state
        });
    }

    async runPlaybookById(playbookId: string, prompt = '', input: Record<string, unknown> = {}): Promise<CyberVinciHostToolExecutionResult> {
        return this.runPlaybookAsTool(playbookId, {
            requestId: this.createRequestId(),
            input: {
                prompt,
                ...input
            },
            state: {}
        });
    }

    protected async runPlaybookAsTool(
        playbookId: string,
        toolContext: CyberVinciHostToolExecutionContext
    ): Promise<CyberVinciHostToolExecutionResult> {
        const playbook = await this.resolvePlaybook(playbookId);
        if (!playbook) {
            return { ok: false, message: `Playbook '${playbookId}' was not found.` };
        }
        const prompt = String(toolContext.input.prompt ?? toolContext.input.userPrompt ?? toolContext.state.prompt ?? '').trim();
        const context: CyberVinciPlaybookExecutionContext = {
            requestId: toolContext.requestId || this.createRequestId(),
            playbookId: playbook.id,
            input: {
                ...toolContext.input,
                ...this.withCurrentExecutionInput(toolContext.input),
                prompt,
                rawPrompt: prompt,
                agentId: typeof toolContext.input.agentId === 'string' ? toolContext.input.agentId : undefined,
                sourceAgentId: typeof toolContext.input.sourceAgentId === 'string' ? toolContext.input.sourceAgentId : undefined
            },
            state: {
                ...toolContext.state,
                toolInput: toolContext.input
            },
            diagnostics: [],
            request: toolContext.chatRequest as MutableChatRequestModel | undefined,
            invokeNativeAgent: toolContext.invokeNativeAgent,
            events: []
        };
        const runRecord = this.startRunRecord(context);
        const result = await this.runPlaybook(playbook, context);
        this.finishRunRecord(runRecord, result, context);
        const terminalFailed = result.ok === false
            || (result.ok !== true && context.diagnostics.length > 0 && result.handled === true && result.stop === true);
        return {
            ok: !terminalFailed,
            stop: result.stop,
            message: result.message ?? `Playbook '${playbook.id}' completed as workload.`,
            diagnostics: context.diagnostics,
            value: {
                playbookId: playbook.id,
                requestId: context.requestId,
                prompt: result.prompt ?? context.input.prompt,
                state: redactCyberVinciSecrets(context.state),
                events: redactCyberVinciSecrets(context.events)
            }
        };
    }

    protected async resumeRunAsTool(
        requestId: string,
        toolContext: CyberVinciHostToolExecutionContext
    ): Promise<CyberVinciHostToolExecutionResult> {
        const record = this.runHistory.find(candidate => candidate.requestId === requestId);
        if (!record) {
            return { ok: false, message: `Playbook run '${requestId}' was not found.` };
        }
        const checkpoint = record.checkpoint;
        if (!checkpoint?.canResume || !checkpoint.nextStateId) {
            return { ok: false, message: `Playbook run '${requestId}' has no resumable checkpoint.` };
        }
        if (record.status === 'completed') {
            return { ok: false, message: `Playbook run '${requestId}' is already completed.` };
        }
        const playbook = await this.resolvePlaybook(checkpoint.playbookId);
        if (!playbook) {
            return { ok: false, message: `Playbook '${checkpoint.playbookId}' was not found for run '${requestId}'.` };
        }
        const input = {
            ...checkpoint.input,
            prompt: String(toolContext.input.prompt ?? checkpoint.input.prompt ?? ''),
            rawPrompt: String(toolContext.input.rawPrompt ?? checkpoint.input.rawPrompt ?? checkpoint.input.prompt ?? '')
        };
        const context: CyberVinciPlaybookExecutionContext = {
            requestId,
            playbookId: playbook.id,
            input,
            state: {
                ...checkpoint.state,
                ...(toolContext.state ?? {}),
                resumeInput: toolContext.input
            },
            diagnostics: [...checkpoint.diagnostics],
            request: toolContext.chatRequest as MutableChatRequestModel | undefined,
            invokeNativeAgent: toolContext.invokeNativeAgent,
            events: [...record.events],
            runRecord: record
        };
        record.status = 'running';
        record.completedAt = undefined;
        record.durationMs = undefined;
        context.events.push({
            timestamp: Date.now(),
            type: 'resumed',
            stateId: checkpoint.nextStateId,
            message: `Resuming Playbook '${playbook.id}' from state '${checkpoint.nextStateId}'.`
        });
        this.persistRunHistory();
        const result = await this.runPlaybookFrom(playbook, context, checkpoint.nextStateId);
        this.finishRunRecord(record, result, context);
        return {
            ok: result.ok !== false && context.diagnostics.length === 0,
            stop: result.stop,
            message: result.message ?? `Playbook run '${requestId}' resumed.`,
            diagnostics: context.diagnostics,
            value: {
                playbookId: playbook.id,
                requestId,
                prompt: result.prompt ?? context.input.prompt,
                state: context.state,
                events: context.events
            }
        };
    }

    protected async runPlaybook(
        playbook: CyberVinciPlaybookDefinition,
        context: CyberVinciPlaybookExecutionContext
    ): Promise<CyberVinciPlaybookStateResult> {
        return this.runPlaybookFrom(playbook, context, playbook.entry);
    }

    protected async runPlaybookFrom(
        playbook: CyberVinciPlaybookDefinition,
        context: CyberVinciPlaybookExecutionContext,
        entry: string | undefined
    ): Promise<CyberVinciPlaybookStateResult> {
        const states = new Map(playbook.states.map(state => [state.id, state]));
        let stateId: string | undefined = entry;
        let lastResult: CyberVinciPlaybookStateResult = {};
        const retryCounts = new Map<string, number>();
        for (let step = 0; stateId && step < MAX_PLAYBOOK_STEPS; step++) {
            const state = states.get(stateId);
            if (!state) {
                const message = `Playbook '${playbook.id}' references unknown state '${stateId}'.`;
                context.diagnostics.push(message);
                context.events.push({ timestamp: Date.now(), type: 'failed', stateId, message });
                return { handled: true, stop: true, message };
            }
            this.updateRunCheckpoint(context, state.id, `Before state '${state.id}'.`);
            context.events.push({
                timestamp: Date.now(),
                type: 'state',
                stateId: state.id,
                message: `Entering state '${state.id}' (${state.type}).`
            });
            this.logger.info(`CyberVinci playbook '${playbook.id}' entering state '${state.id}' (${state.type}).`);
            const stateStartedAt = Date.now();
            try {
                const result = await this.executeState(playbook, state, context);
                context.events.push({
                    timestamp: Date.now(),
                    type: 'state',
                    stateId: state.id,
                    message: `State '${state.id}' (${state.type}) completed.`,
                    durationMs: Date.now() - stateStartedAt,
                    data: {
                        ok: result.ok !== false,
                        stop: result.stop === true,
                        next: result.next
                    }
                });
                lastResult = result;
                if (result.prompt !== undefined) {
                    context.input.prompt = result.prompt;
                }
                if (result.ok === false) {
                    if (await this.retryStateIfAllowed(state, retryCounts, context, result.message)) {
                        continue;
                    }
                    if (state.onError) {
                        stateId = state.onError;
                        this.updateRunCheckpoint(context, stateId, `State '${state.id}' returned ok=false; routing to onError '${stateId}'.`);
                        continue;
                    }
                    if (!result.next && result.message) {
                        context.diagnostics.push(result.message);
                    }
                }
                if (result.stop) {
                    return result;
                }
                stateId = this.resolveNextState(state, result, context);
                this.updateRunCheckpoint(context, stateId, stateId ? `Next state '${stateId}'.` : 'Playbook reached terminal transition.');
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                context.events.push({ timestamp: Date.now(), type: 'failed', stateId: state.id, message, durationMs: Date.now() - stateStartedAt });
                if (await this.retryStateIfAllowed(state, retryCounts, context, message)) {
                    continue;
                }
                if (state.onError) {
                    stateId = state.onError;
                    continue;
                }
                context.diagnostics.push(`State '${state.id}' failed: ${message}`);
                return { handled: true, stop: true, message };
            }
        }
        if (stateId) {
            const message = `Playbook '${playbook.id}' exceeded ${MAX_PLAYBOOK_STEPS} steps.`;
            context.diagnostics.push(message);
            context.events.push({ timestamp: Date.now(), type: 'failed', message });
            return { handled: true, stop: true, message };
        }
        return lastResult;
    }

    protected async executeState(
        playbook: CyberVinciPlaybookDefinition,
        state: CyberVinciPlaybookState,
        context: CyberVinciPlaybookExecutionContext
    ): Promise<CyberVinciPlaybookStateResult> {
        switch (state.type) {
            case 'start':
            case 'end':
                return {};
            case 'tool':
                return this.executeToolState(playbook, state, context, state.tool);
            case 'guard':
                return this.executeGuardState(playbook, state, context);
            case 'ask':
                return this.executeAskState(state, context);
            case 'ai':
                return this.executeAiState(state, context);
            case 'flow':
                return this.executeFlowState(playbook, state, context);
            case 'playbook':
                return this.executeNestedPlaybookState(state, context);
            case 'parallel':
                return this.executeParallelState(playbook, state, context);
            case 'condition':
                return { next: this.resolveConditionState(state, context) };
            case 'response':
                return this.executeResponseState(state, context);
            default:
                return { handled: true, stop: true, message: `Unknown playbook state type '${state.type}'.` };
        }
    }

    protected async executeToolState(
        playbook: CyberVinciPlaybookDefinition,
        state: CyberVinciPlaybookState,
        context: CyberVinciPlaybookExecutionContext,
        explicitToolId: string | undefined
    ): Promise<CyberVinciPlaybookStateResult> {
        const toolId = explicitToolId?.trim();
        if (!toolId) {
            return { ok: false, handled: true, stop: true, message: `State '${state.id}' does not define a tool.` };
        }
        const startedAt = Date.now();
        const result = await this.toolRegistry.executeTool(toolId, {
            requestId: context.requestId,
            playbookId: playbook.id,
            stateId: state.id,
            input: this.resolveRecord({
                prompt: context.input.prompt,
                ...this.withCurrentExecutionInput(context.input),
                ...(state.args ?? {})
            }, context),
            state: context.state,
            invokeNativeAgent: context.invokeNativeAgent,
            chatRequest: context.request
        });
        context.events.push({
            timestamp: Date.now(),
            type: 'tool',
            stateId: state.id,
            message: `Tool '${toolId}' completed with ok=${result.ok}.`,
            durationMs: Date.now() - startedAt,
            data: {
                toolId,
                ok: result.ok,
                stop: result.stop === true,
                message: result.message,
                diagnostics: result.diagnostics?.length ?? 0
            }
        });
        this.captureToolResult(state, result, context);
        return {
            ok: result.ok,
            handled: result.stop,
            stop: result.stop,
            message: result.message
        };
    }

    protected async executeGuardState(
        playbook: CyberVinciPlaybookDefinition,
        state: CyberVinciPlaybookState,
        context: CyberVinciPlaybookExecutionContext
    ): Promise<CyberVinciPlaybookStateResult> {
        const result = await this.executeToolState(playbook, state, context, state.guard ?? state.tool);
        return {
            ...result,
            stop: result.stop || (!result.ok && !state.onFail),
            next: result.ok ? state.onPass : state.onFail
        };
    }

    protected async executeAskState(
        state: CyberVinciPlaybookState,
        context: CyberVinciPlaybookExecutionContext
    ): Promise<CyberVinciPlaybookStateResult> {
        const options = state.options ?? [];
        if (!options.length) {
            return { ok: false, handled: true, stop: true, message: `Ask state '${state.id}' does not define options.` };
        }
        const selectedOption = this.resolveAskOptionSelection(state, context);
        const saveKey = state.saveAs ?? state.id;
        if (selectedOption) {
            context.state[saveKey] = selectedOption.id;
            context.state[`${saveKey}Meta`] = {
                optionId: selectedOption.id,
                label: selectedOption.label,
                next: selectedOption.next,
                selectedAt: Date.now()
            };
            return { ok: true, next: selectedOption.next };
        }
        if (context.request) {
            const question = this.renderTemplate(state.text ?? state.prompt ?? 'Choose an option.', context);
            context.state[saveKey] = {
                status: 'paused',
                reason: `Ask state '${state.id}' is waiting for a user option.`,
                options: options.map(option => ({
                    id: option.id,
                    label: option.label,
                    next: option.next
                }))
            };
            context.request.addData('cybervinci.playbook.askStateId', state.id);
            context.request.addData('cybervinci.playbook.askSaveAs', saveKey);
            context.request.addData('cybervinci.playbook.askOptions', options.map(option => ({
                id: option.id,
                label: option.label,
                next: option.next
            })));
            context.request.response.response.addContent(new QuestionResponseContentImpl(
                question,
                options.map(option => ({
                    text: option.label,
                    value: option.id,
                    description: option.next ? `Next: ${option.next}` : undefined
                })),
                context.request,
                selected => {
                    const optionId = selected.value ?? selected.text;
                    void this.resumeAskStateFromChat(context, state.id, optionId);
                },
                {
                    header: state.label ?? `CyberVinci Playbook: ${context.playbookId}`,
                    onSkip: () => {
                        context.request?.response.complete();
                    }
                }
            ));
            context.request.response.waitForInput();
            return { ok: true, handled: true, stop: true, paused: true, message: `Playbook paused at ask state '${state.id}'.` };
        }
        if (!this.quickPickService) {
            context.state[saveKey] = {
                status: 'paused',
                reason: `Ask state '${state.id}' requires an explicit option but no chat request or QuickPick service is available.`,
                options: options.map(option => ({
                    id: option.id,
                    label: option.label,
                    next: option.next
                }))
            };
            return { ok: true, handled: true, stop: true, paused: true, message: `Playbook paused at ask state '${state.id}' waiting for optionId.` };
        }
        const picked = await this.quickPickService.show<QuickPickItem & { optionId: string; next?: string }>(
            options.map(option => ({
                optionId: option.id,
                next: option.next,
                label: option.label,
                description: option.id
            })),
            {
                title: state.label ?? state.id,
                placeholder: this.renderTemplate(state.text ?? state.prompt ?? 'Choose an option.', context),
                ignoreFocusOut: true
            }
        );
        if (!picked) {
            context.state[saveKey] = {
                status: 'paused',
                reason: `Ask state '${state.id}' was cancelled before the user selected an option.`
            };
            return { ok: true, handled: true, stop: true, paused: true, message: `Playbook paused at ask state '${state.id}'.` };
        }
        context.state[saveKey] = picked.optionId;
        context.state[`${saveKey}Meta`] = {
            optionId: picked.optionId,
            label: picked.label,
            next: picked.next,
            selectedAt: Date.now()
        };
        return { ok: true, next: picked.next };
    }

    protected async resumeAskStateFromChat(
        context: CyberVinciPlaybookExecutionContext,
        askStateId: string,
        optionId: string
    ): Promise<void> {
        if (!context.request) {
            return;
        }
        try {
            const result = await this.resumeRunAsTool(context.requestId, {
                requestId: context.requestId,
                playbookId: context.playbookId,
                stateId: askStateId,
                input: {
                    optionId,
                    askStateId
                },
                state: {},
                invokeNativeAgent: context.invokeNativeAgent,
                chatRequest: context.request
            });
            if (!result.ok) {
                const message = result.message ?? `CyberVinci playbook run '${context.requestId}' could not resume.`;
                context.request.response.response.addContent(new ErrorChatResponseContentImpl(new Error(message)));
                context.request.response.complete();
                return;
            }
            const resultValue = this.asRecord(result.value);
            const resultState = this.asRecord(resultValue?.state);
            if (result.stop && resultState?.['core.agent.invoke.invoked'] !== true) {
                context.request.response.complete();
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            context.request.response.response.addContent(new ErrorChatResponseContentImpl(new Error(`CyberVinci playbook ask resume failed: ${message}`)));
            context.request.response.complete();
        }
    }

    protected resolveAskOptionSelection(
        state: CyberVinciPlaybookState,
        context: CyberVinciPlaybookExecutionContext
    ): CyberVinciPlaybookAskOption | undefined {
        const options = state.options ?? [];
        const saveKey = state.saveAs ?? state.id;
        const candidateKeys = [
            'optionId',
            'askOptionId',
            'askOption',
            'selectedOption',
            'choice',
            'decision',
            saveKey,
            state.id
        ];
        const candidateSources = [
            this.asRecord(context.state.resumeInput),
            this.asRecord(context.state.toolInput),
            this.asRecord(context.input),
            context.state
        ].filter((source): source is Record<string, unknown> => !!source);
        for (const source of candidateSources) {
            for (const key of candidateKeys) {
                const option = this.matchAskOption(options, source[key]);
                if (option) {
                    return option;
                }
            }
        }
        return undefined;
    }

    protected matchAskOption(
        options: NonNullable<CyberVinciPlaybookState['options']>,
        value: unknown
    ): CyberVinciPlaybookAskOption | undefined {
        if (value === undefined || value === null) {
            return undefined;
        }
        if (typeof value === 'object') {
            const record = this.asRecord(value);
            if (!record) {
                return undefined;
            }
            return this.matchAskOption(
                options,
                record.optionId ?? record.id ?? record.value ?? record.choice ?? record.decision ?? record.selectedOption
            );
        }
        const raw = String(value).trim();
        if (!raw) {
            return undefined;
        }
        const numeric = Number(raw);
        if (Number.isInteger(numeric) && numeric >= 1 && numeric <= options.length) {
            return options[numeric - 1];
        }
        const normalized = raw.toLocaleLowerCase();
        return options.find(option =>
            option.id.toLocaleLowerCase() === normalized ||
            option.label.toLocaleLowerCase() === normalized
        );
    }

    protected async executeAiState(
        state: CyberVinciPlaybookState,
        context: CyberVinciPlaybookExecutionContext
    ): Promise<CyberVinciPlaybookStateResult> {
        const nextPrompt = state.prompt || state.template
            ? this.renderTemplate(state.prompt ?? state.template ?? '', context)
            : context.input.prompt;
        const wantsStructuredOutput = !!state.outputSchema || state.outputMode === 'json';
        if (wantsStructuredOutput || state.input || state.agent) {
            if (!this.aiRuntime) {
                return { ok: false, handled: true, stop: true, message: `AI state '${state.id}' requires CyberVinci AI Runtime, but it is not available.` };
            }
            const input = this.resolveRecord({
                prompt: context.input.prompt,
                agentId: context.input.agentId,
                sourceAgentId: context.input.sourceAgentId,
                ...(state.input ?? {}),
                ...(state.args ?? {})
            }, context);
            const startedAt = Date.now();
            const selectedAgentProfilePrompt = await this.getSelectedAgentProfileSystemPrompt();
            const systemPrompt = [
                state.agent ? `Act as playbook AI state agent '${state.agent}'.` : undefined,
                selectedAgentProfilePrompt
            ].filter(Boolean).join('\n\n') || undefined;
            const result = await this.aiRuntime.runTask<Record<string, unknown>, unknown>({
                surfaceId: 'ai-chat-playbook',
                action: `playbook.${context.playbookId}.${state.id}`,
                sessionId: context.requestId,
                userPrompt: nextPrompt,
                systemPrompt,
                input,
                output: wantsStructuredOutput
                    ? {
                        mode: 'json',
                        schemaName: `${context.playbookId}.${state.id}`,
                        schema: state.outputSchema,
                        instructions: 'Return exactly one JSON value matching the schema. Do not wrap it in Markdown fences.'
                    }
                    : { mode: 'text' },
                effectPolicy: this.currentChatEffectPolicy(),
                execution: state.provider && state.provider !== 'inherit'
                    ? state.provider
                    : context.input.execution
            });
            context.events.push({
                timestamp: Date.now(),
                type: 'ai',
                stateId: state.id,
                message: `AI state '${state.id}' completed with provider '${result.provider.label}'.`,
                durationMs: Date.now() - startedAt,
                data: {
                    providerId: result.provider.id,
                    providerLabel: result.provider.label,
                    model: result.execution.model,
                    runtime: result.execution.runtime,
                    modelProvider: result.execution.modelProvider,
                    contextEstimatedTokens: result.context?.estimatedTokens,
                    contextUsed: result.context?.used,
                    usage: result.usage,
                    diagnostics: result.diagnostics?.length ?? 0,
                    notifications: result.notifications?.length ?? 0
                }
            });
            if (state.saveAs) {
                context.state[state.saveAs] = wantsStructuredOutput ? result.structured ?? result.text : result.text;
            }
            return {
                ok: true,
                prompt: wantsStructuredOutput ? context.input.prompt : result.text || nextPrompt,
                message: result.diagnostics?.join('\n')
            };
        }
        if (state.saveAs) {
            context.state[state.saveAs] = nextPrompt;
        }
        return { ok: true, prompt: nextPrompt };
    }

    protected async executeNestedPlaybookState(
        state: CyberVinciPlaybookState,
        context: CyberVinciPlaybookExecutionContext
    ): Promise<CyberVinciPlaybookStateResult> {
        const playbookId = state.playbook ?? state.playbookId;
        if (!playbookId) {
            return { ok: false, handled: true, stop: true, message: `Nested playbook state '${state.id}' does not define playbook/playbookId.` };
        }
        const child = await this.resolvePlaybook(playbookId);
        if (!child) {
            return { ok: false, handled: true, stop: true, message: `Nested playbook '${playbookId}' was not found.` };
        }
        const previousPlaybookId = context.playbookId;
        context.playbookId = child.id;
        context.events.push({
            timestamp: Date.now(),
            type: 'state',
            stateId: state.id,
            message: `Entering nested playbook '${child.id}'.`
        });
        try {
            const result = await this.runPlaybookFrom(child, context, child.entry);
            if (state.saveAs) {
                context.state[state.saveAs] = {
                    ok: result.ok !== false,
                    message: result.message,
                    prompt: result.prompt
                };
            }
            return {
                ok: result.ok,
                message: result.message,
                prompt: result.prompt
            };
        } finally {
            context.playbookId = previousPlaybookId;
        }
    }

    protected async executeParallelState(
        playbook: CyberVinciPlaybookDefinition,
        state: CyberVinciPlaybookState,
        context: CyberVinciPlaybookExecutionContext
    ): Promise<CyberVinciPlaybookStateResult> {
        const branches = state.branches ?? [];
        if (!branches.length) {
            return { ok: false, handled: true, stop: true, message: `Parallel state '${state.id}' does not define branches.` };
        }
        const results = await Promise.all(branches.map(async branch => {
            const branchContext: CyberVinciPlaybookExecutionContext = {
                ...context,
                state: { ...context.state },
                diagnostics: [],
                events: context.events
            };
            const result = await this.runPlaybookFrom(playbook, branchContext, branch);
            return {
                branch,
                ok: result.ok !== false,
                message: result.message,
                diagnostics: branchContext.diagnostics,
                state: branchContext.state
            };
        }));
        const failed = results.find(result => !result.ok);
        if (state.saveAs) {
            context.state[state.saveAs] = results;
        }
        for (const result of results) {
            context.state[`parallel.${state.id}.${result.branch}`] = result.state;
            context.diagnostics.push(...result.diagnostics);
        }
        return {
            ok: !failed,
            message: failed
                ? `Parallel branch '${failed.branch}' failed: ${failed.message ?? 'unknown error'}`
                : `Parallel state '${state.id}' completed ${results.length} branch(es).`
        };
    }

    protected async executeFlowState(
        playbook: CyberVinciPlaybookDefinition,
        state: CyberVinciPlaybookState,
        context: CyberVinciPlaybookExecutionContext
    ): Promise<CyberVinciPlaybookStateResult> {
        const mode = state.mode ?? (state.route === 'dynamic-workflow' ? 'dynamic' : 'saved');
        const input = this.resolveRecord({
            prompt: state.prompt || state.template ? this.renderTemplate(state.prompt ?? state.template ?? '', context) : context.input.prompt,
            workflowId: state.workflowId ?? state.flowId,
            preferSaved: state.preferSaved,
            authoringDraft: state.authoringDraft,
            execution: context.input.execution,
            providerId: context.input.providerId,
            model: context.input.model,
            runtime: context.input.runtime,
            modelProvider: context.input.modelProvider,
            reasoningEffort: context.input.reasoningEffort,
            reasoningVariant: context.input.reasoningVariant,
            serviceTier: context.input.serviceTier,
            ...(state.args ?? {})
        }, context);
        const toolId = mode === 'authoring'
            ? 'core.flow.runAiAuthoringDraft'
            : mode === 'dynamic'
                ? 'core.flow.runDynamicWorkflow'
                : 'core.flow.startRun';
        const result = await this.toolRegistry.executeTool(toolId, {
            requestId: context.requestId,
            playbookId: playbook.id,
            stateId: state.id,
            input,
            state: context.state,
            chatRequest: context.request
        });
        this.captureToolResult(state, result, context);
        return {
            ok: result.ok,
            handled: result.stop,
            stop: result.stop || !result.ok,
            message: result.message
        };
    }

    protected executeResponseState(
        state: CyberVinciPlaybookState,
        context: CyberVinciPlaybookExecutionContext
    ): CyberVinciPlaybookStateResult {
        const message = this.renderTemplate(state.template ?? state.prompt ?? state.text ?? '', context);
        if (message) {
            if (context.request) {
                context.request.response.response.addContent(new MarkdownChatResponseContentImpl(message));
            } else {
                this.messageService.info(message);
            }
        }
        return { ok: true, handled: true, stop: true, message };
    }

    protected captureToolResult(
        state: CyberVinciPlaybookState,
        result: CyberVinciHostToolExecutionResult,
        context: CyberVinciPlaybookExecutionContext
    ): void {
        if (state.saveAs) {
            context.state[state.saveAs] = result.value ?? result.message ?? result.ok;
        }
        if (result.diagnostics?.length) {
            context.diagnostics.push(...result.diagnostics);
        }
    }

    protected resolveNextState(
        state: CyberVinciPlaybookState,
        result: CyberVinciPlaybookStateResult,
        context: CyberVinciPlaybookExecutionContext
    ): string | undefined {
        if (result.next) {
            return result.next;
        }
        for (const transition of state.transitions ?? []) {
            if (transition.when === undefined || this.evaluateCondition(transition.when, context)) {
                return transition.to;
            }
        }
        return state.next;
    }

    protected resolveConditionState(state: CyberVinciPlaybookState, context: CyberVinciPlaybookExecutionContext): string | undefined {
        for (const conditionCase of state.cases ?? []) {
            if (this.evaluateCondition(conditionCase.if, context)) {
                return conditionCase.next;
            }
        }
        return state.default ?? state.next;
    }

    protected evaluateCondition(condition: CyberVinciPlaybookCondition | string | unknown, context: CyberVinciPlaybookExecutionContext): boolean {
        if (typeof condition === 'string') {
            return Boolean(this.resolveValue(condition, context));
        }
        if (!condition || typeof condition !== 'object' || Array.isArray(condition)) {
            return Boolean(condition);
        }
        const typed = condition as CyberVinciPlaybookCondition;
        if (typed.exists !== undefined) {
            const value = this.resolveValue(typed.exists, context);
            return value !== undefined && value !== null && value !== '';
        }
        if (typed.lengthGreaterThan) {
            const value = this.resolveValue(typed.lengthGreaterThan[0], context);
            const threshold = Number(this.resolveValue(typed.lengthGreaterThan[1], context));
            const length = Array.isArray(value) || typeof value === 'string' ? value.length : 0;
            return length > threshold;
        }
        if (typed.equals) {
            return this.stableValue(this.resolveValue(typed.equals[0], context)) === this.stableValue(this.resolveValue(typed.equals[1], context));
        }
        if (typed.not !== undefined) {
            return !this.evaluateCondition(typed.not, context);
        }
        if (typed.and) {
            return typed.and.every(item => this.evaluateCondition(item, context));
        }
        if (typed.or) {
            return typed.or.some(item => this.evaluateCondition(item, context));
        }
        return true;
    }

    protected resolveRecord(record: Record<string, unknown>, context: CyberVinciPlaybookExecutionContext): Record<string, unknown> {
        const resolved: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(record)) {
            resolved[key] = this.resolveValue(value, context);
        }
        return resolved;
    }

    protected asRecord(value: unknown): Record<string, unknown> | undefined {
        return value && typeof value === 'object' && !Array.isArray(value)
            ? value as Record<string, unknown>
            : undefined;
    }

    protected resolveValue(value: unknown, context: CyberVinciPlaybookExecutionContext): unknown {
        if (typeof value !== 'string') {
            return value;
        }
        const exact = value.match(/^\$\{([^}]+)\}$/);
        if (exact) {
            return this.lookupPath(exact[1].trim(), context);
        }
        return this.renderTemplate(value, context);
    }

    protected renderTemplate(template: string, context: CyberVinciPlaybookExecutionContext): string {
        return template.replace(/\$\{([^}]+)\}/g, (_match, pathExpression: string) => {
            const value = this.lookupPath(pathExpression.trim(), context);
            return value === undefined || value === null ? '' : String(value);
        });
    }

    protected lookupPath(pathExpression: string, context: CyberVinciPlaybookExecutionContext): unknown {
        if (pathExpression.startsWith('preferences.')) {
            return this.preferenceService.get(pathExpression.slice('preferences.'.length));
        }
        const root = pathExpression.split('.')[0];
        const source: unknown = root === 'input'
            ? context.input
            : root === 'state'
                ? context.state
                : undefined;
        if (source === undefined) {
            return undefined;
        }
        return pathExpression.split('.').slice(1).reduce<unknown>((current, key) => {
            if (!current || typeof current !== 'object') {
                return undefined;
            }
            return (current as Record<string, unknown>)[key];
        }, source);
    }

    protected stableValue(value: unknown): string {
        return typeof value === 'string' ? value : JSON.stringify(value);
    }

    protected createRequestId(): string {
        return `playbook-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    }

    protected async retryStateIfAllowed(
        state: CyberVinciPlaybookState,
        retryCounts: Map<string, number>,
        context: CyberVinciPlaybookExecutionContext,
        message: string | undefined
    ): Promise<boolean> {
        const max = Math.max(0, state.retry?.max ?? 0);
        const count = retryCounts.get(state.id) ?? 0;
        if (count >= max) {
            return false;
        }
        retryCounts.set(state.id, count + 1);
        context.events.push({
            timestamp: Date.now(),
            type: 'retry',
            stateId: state.id,
            message: `Retrying state '${state.id}' (${count + 1}/${max})${message ? ` after: ${message}` : ''}.`
        });
        const delayMs = Math.max(0, state.retry?.delayMs ?? 0);
        if (delayMs > 0) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
        return true;
    }

    protected startRunRecord(context: CyberVinciPlaybookExecutionContext): CyberVinciPlaybookRunRecord {
        const record: CyberVinciPlaybookRunRecord = {
            requestId: context.requestId,
            playbookId: context.playbookId,
            agentId: context.input.agentId,
            sourceAgentId: context.input.sourceAgentId,
            startedAt: Date.now(),
            status: 'running',
            diagnostics: redactCyberVinciSecrets(context.diagnostics),
            events: redactCyberVinciSecrets(context.events)
        };
        context.runRecord = record;
        context.events.push({
            timestamp: record.startedAt,
            type: 'started',
            message: `Playbook '${context.playbookId}' started.`
        });
        this.updateRunCheckpoint(context, undefined, 'Run started.');
        this.runHistory.unshift(record);
        this.runHistory.splice(MAX_RUN_HISTORY);
        this.persistRunHistory();
        return record;
    }

    protected finishRunRecord(
        record: CyberVinciPlaybookRunRecord,
        result: CyberVinciPlaybookStateResult,
        context: CyberVinciPlaybookExecutionContext
    ): void {
        record.completedAt = Date.now();
        record.durationMs = record.completedAt - record.startedAt;
        const terminalFailed = result.ok === false
            || (result.ok !== true && context.diagnostics.length > 0 && result.handled === true && result.stop === true);
        record.status = result.paused
            ? 'paused'
            : terminalFailed ? 'failed' : 'completed';
        record.diagnostics = redactCyberVinciSecrets([...context.diagnostics]);
        if (record.status === 'completed') {
            record.checkpoint = {
                playbookId: context.playbookId,
                input: redactCyberVinciSecrets({ ...context.input }),
                state: redactCyberVinciSecrets({ ...context.state }),
                diagnostics: redactCyberVinciSecrets([...context.diagnostics]),
                updatedAt: record.completedAt,
                canResume: false,
                reason: 'Run completed.'
            };
        } else if (record.status === 'paused') {
            this.updateRunCheckpoint(context, record.checkpoint?.nextStateId, result.message ?? 'Run paused.');
        }
        record.events = redactCyberVinciSecrets([...context.events, {
            timestamp: record.completedAt,
            type: record.status === 'paused' ? 'paused' : record.status === 'failed' ? 'failed' : 'completed',
            message: result.message ?? `Playbook '${context.playbookId}' ${record.status}.`,
            durationMs: record.durationMs
        }]);
        record.failureArtifacts = record.status === 'failed'
            ? this.createFailureArtifacts(record, result, context)
            : undefined;
        this.persistRunHistory();
    }

    protected createFailureArtifacts(
        record: CyberVinciPlaybookRunRecord,
        result: CyberVinciPlaybookStateResult,
        context: CyberVinciPlaybookExecutionContext
    ): CyberVinciPlaybookFailureArtifacts {
        const summary = result.message
            ?? context.diagnostics[context.diagnostics.length - 1]
            ?? `Playbook '${context.playbookId}' failed.`;
        const nextStateId = record.checkpoint?.nextStateId;
        const retryable = record.checkpoint?.canResume === true && !!nextStateId;
        return redactCyberVinciSecrets({
            version: 'cybervinci.playbookFailureArtifacts/v1' as const,
            summary,
            failedAt: record.completedAt ?? Date.now(),
            diagnostics: [...context.diagnostics],
            compensation: {
                canResume: record.checkpoint?.canResume === true,
                nextStateId,
                retryable,
                suggestedAction: retryable
                    ? `Resume the run from state '${nextStateId}'.`
                    : 'Start a new run with the second-run suggestion after addressing the diagnostics.'
            },
            secondRunSuggestion: {
                prompt: [
                    `Retry CyberVinci Playbook '${context.playbookId}' after this failure.`,
                    `Failure: ${summary}`,
                    context.diagnostics.length ? `Diagnostics: ${context.diagnostics.join(' | ')}` : undefined,
                    `Original prompt: ${context.input.prompt}`
                ].filter(Boolean).join('\n'),
                playbookId: context.playbookId,
                input: { ...context.input }
            }
        });
    }

    protected updateRunCheckpoint(context: CyberVinciPlaybookExecutionContext, nextStateId: string | undefined, reason: string): void {
        if (!context.runRecord) {
            return;
        }
        context.runRecord.checkpoint = {
            playbookId: context.playbookId,
            nextStateId,
            input: redactCyberVinciSecrets({ ...context.input }),
            state: redactCyberVinciSecrets({ ...context.state }),
            diagnostics: redactCyberVinciSecrets([...context.diagnostics]),
            updatedAt: Date.now(),
            canResume: !!nextStateId,
            reason
        };
        this.persistRunHistory();
    }

    protected loadRunHistory(): void {
        try {
            if (typeof localStorage === 'undefined') {
                return;
            }
            const raw = localStorage.getItem(CYBERVINCI_PLAYBOOK_RUN_HISTORY_STORAGE_KEY);
            if (!raw) {
                return;
            }
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) {
                return;
            }
            this.runHistory.splice(0, this.runHistory.length, ...redactCyberVinciSecrets(parsed
                .filter(this.isRunRecord)
                .slice(0, MAX_RUN_HISTORY)));
            this.persistRunHistory();
        } catch (error) {
            this.logger.warn('Failed to load CyberVinci playbook run history.', error);
        }
    }

    protected persistRunHistory(): void {
        try {
            if (typeof localStorage === 'undefined') {
                return;
            }
            localStorage.setItem(CYBERVINCI_PLAYBOOK_RUN_HISTORY_STORAGE_KEY, JSON.stringify(redactCyberVinciSecrets(this.runHistory.slice(0, MAX_RUN_HISTORY))));
        } catch (error) {
            this.logger.warn('Failed to persist CyberVinci playbook run history.', error);
        }
    }

    protected isRunRecord(candidate: unknown): candidate is CyberVinciPlaybookRunRecord {
        return !!candidate
            && typeof candidate === 'object'
            && typeof (candidate as CyberVinciPlaybookRunRecord).requestId === 'string'
            && typeof (candidate as CyberVinciPlaybookRunRecord).playbookId === 'string'
            && typeof (candidate as CyberVinciPlaybookRunRecord).startedAt === 'number'
            && ['running', 'paused', 'completed', 'failed'].includes((candidate as CyberVinciPlaybookRunRecord).status)
            && Array.isArray((candidate as CyberVinciPlaybookRunRecord).events)
            && Array.isArray((candidate as CyberVinciPlaybookRunRecord).diagnostics);
    }
}

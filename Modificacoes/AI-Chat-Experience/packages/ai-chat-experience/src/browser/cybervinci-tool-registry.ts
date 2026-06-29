// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import {
    FLOW_AI_AUTHORING_SPEC_VERSION,
    FlowAiAuthoringDraft,
    FlowCapabilities,
    FlowGateStatus,
    FlowModelProfile,
    FlowPipelinePreset,
    FlowService,
    FlowWorkflow,
    FlowWorkflowPattern,
    redactFlowSecretsValue
} from '@cybervinci/flow/lib/common';
import {
    CyberVinciAiExecutionSelection,
    CyberVinciAiProviderDescriptor
} from '@cybervinci/ai-runtime/lib/common';
import { CyberVinciAiRuntimeFrontendService } from '@cybervinci/ai-runtime/lib/browser/ai-runtime-frontend-service';
import { CodexProviderInputItem } from '@cybervinci/ai-providers/lib/common';
import { ChatAgent, ChatAgentService, MutableChatRequestModel } from '@theia/ai-chat/lib/common';
import { MarkdownChatResponseContentImpl } from '@theia/ai-chat/lib/common/chat-model';
import { ToolInvocationContext, ToolInvocationRegistry, ToolRequest } from '@theia/ai-core';
import { MCPFrontendService, MCPServerDescription } from '@theia/ai-mcp/lib/common/mcp-server-manager';
import { MCP_SERVERS_PREF } from '@theia/ai-mcp/lib/common/mcp-preferences';
import {
    OpenPencilApplyOperationsOptions,
    OpenPencilDesignCommandService,
    OpenPencilDesignSession
} from '@cybervinci/openpencil-extension/lib/browser/openpencil-design-command-service';
import {
    OpenPencilDesignOperation,
    OpenPencilDocument,
    OpenPencilNode,
    OpenPencilPage,
    OpenPencilValidationIssue
} from '@cybervinci/openpencil-extension/lib/common/openpencil-types';
import { ApplicationShell } from '@theia/core/lib/browser';
import { CommandService, ILogger } from '@theia/core';
import { QuickPickItem, QuickPickService } from '@theia/core/lib/common/quick-pick-service';
import { PreferenceScope } from '@theia/core/lib/common';
import { FileUri } from '@theia/core/lib/common/file-uri';
import { PreferenceService } from '@theia/core/lib/common/preferences';
import URI from '@theia/core/lib/common/uri';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { inject, injectable, optional } from '@theia/core/shared/inversify';
import {
    CyberVinciAgentDefinition,
    CyberVinciAgentCapabilityProfile,
    CyberVinciAgentPromptCapability,
    CyberVinciAgentToolCapability,
    CyberVinciAgentVariableCapability,
    CyberVinciAiChatExperienceService,
    CyberVinciHostToolExecutionContext,
    CyberVinciHostToolExecutionResult,
    CyberVinciPlaybookDefinition,
    CyberVinciToolDefinition
} from '../common';
import {
    CYBERVINCI_AI_CHAT_WORKDIR_PREF,
    CYBERVINCI_AI_CHAT_VISION_JUDGE_ENABLED_PREF,
    CYBERVINCI_AI_CHAT_VISION_JUDGE_MODEL_PREF,
    CYBERVINCI_AI_CHAT_VISION_JUDGE_PROVIDER_PREF
} from './cybervinci-ai-chat-experience-preferences';

const FLOW_START_WORKFLOW_COMMAND = 'cybervinci.flow.startWorkflow';
const FLOW_RUN_DYNAMIC_WORKFLOW_COMMAND = 'cybervinci.flow.runDynamicWorkflow';
const NATIVE_AGENT_PLAYBOOK_PREFIX = 'native-agent.';
const MEMORY_SERVICE_TOKEN = 'cybervinci.memory.MemoryService';

type MemoryScope = 'global' | 'workspace' | 'repository' | 'session' | 'task';
type MemorySourceKind = string;
type MemoryType =
    | 'user_preference'
    | 'project_decision'
    | 'project_convention'
    | 'file_location'
    | 'architecture_note'
    | 'workflow_note'
    | 'interaction_summary'
    | 'generated_skill_note'
    | 'bug_history'
    | 'command_note'
    | 'testing_note'
    | 'security_note'
    | 'manual_note';

interface MemoryItem {
    id: string;
    title: string;
    memoryType: MemoryType;
}

interface MemoryService {
    search(query: {
        workspacePath: string;
        text: string;
        limit?: number;
        sourceKinds?: MemorySourceKind[];
        sessionId?: string;
        taskId?: string;
    }): Promise<Array<{
        id: string;
        sourceKind: string;
        title: string;
        snippet: string;
        score: number;
        uri?: string;
        evidence?: string;
        estimatedTokens?: number;
    }>>;
    buildContextPack(request: {
        workspacePath: string;
        prompt: string;
        retrievalResults: unknown[];
        tokenBudget: number;
    }): Promise<unknown>;
    proposeMemoryCandidate(request: {
        workspacePath: string;
        text: string;
        source: string;
        evidence: string;
        eventId?: string;
        relativePath?: string;
        maxCandidates?: number;
    }): Promise<{ candidates: unknown[]; created: number }>;
    addMemory(memory: {
        scope: MemoryScope;
        workspacePath?: string;
        memoryType: MemoryType;
        title: string;
        content: string;
        importance?: 'low' | 'medium' | 'high' | 'critical';
        source: string;
        evidence?: string;
        taskId?: string;
        sessionId?: string;
    }): Promise<MemoryItem>;
}

interface CyberVinciCanvasDiagnostic {
    category: 'document' | 'overlap' | 'off-canvas' | 'text-overflow' | 'footer' | 'clone-completeness' | 'layout-quality';
    severity: 'info' | 'warning' | 'error';
    message: string;
    nodeId?: string;
    otherNodeId?: string;
    details?: Record<string, unknown>;
}

interface CyberVinciCanvasNodeBox {
    id: string;
    name?: string;
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
    parentId?: string;
    depth: number;
    text?: string;
}

interface CyberVinciNativeMcpServerGroup {
    id: string;
    label: string;
    default?: boolean;
    requiresUserSecret?: boolean;
    promptVariantId?: string;
    promptRefs?: string[];
    servers: MCPServerDescription[];
}

interface CyberVinciNativeMcpRequirement {
    agentId: string;
    agentName: string;
    sourceAgentId?: string;
    groups: CyberVinciNativeMcpServerGroup[];
}

interface CyberVinciMcpServerStatus {
    name: string;
    configured: boolean;
    started: boolean;
    hasPlaceholderSecret?: boolean;
}

interface FlowWorkflowSummaryForAi {
    id: string;
    name: string;
    description?: string;
    stateCount: number;
    transitionCount: number;
    editable: boolean;
}

interface FlowAiAuthoringRuntimeInput {
    authoringSpec: unknown;
    activeWorkflow?: unknown;
    workflowSummaries: FlowWorkflowSummaryForAi[];
    workflowPatterns: FlowWorkflowPattern[];
    modelProfiles: FlowModelProfile[];
    pipelinePresets: FlowPipelinePreset[];
    aiProviders: CyberVinciAiProviderDescriptor[];
    languageModels: Array<{ id: string; label: string; status: 'ready' | 'unavailable' }>;
    capabilities?: FlowCapabilities;
    selectedPatternId?: string;
    selectedPipelinePresetId?: string;
}

type CyberVinciPlaybookToolRunner = (
    playbookId: string,
    context: CyberVinciHostToolExecutionContext
) => Promise<CyberVinciHostToolExecutionResult>;

type CyberVinciPlaybookToolResumer = (
    requestId: string,
    context: CyberVinciHostToolExecutionContext
) => Promise<CyberVinciHostToolExecutionResult>;

@injectable()
export class CyberVinciToolRegistry {

    @inject(CyberVinciAiChatExperienceService)
    protected readonly service: CyberVinciAiChatExperienceService;

    @inject(CommandService)
    protected readonly commandService: CommandService;

    @inject(PreferenceService)
    protected readonly preferenceService: PreferenceService;

    @inject(ILogger)
    protected readonly logger: ILogger;

    @inject(FlowService) @optional()
    protected readonly flowService: FlowService | undefined;

    @inject(MEMORY_SERVICE_TOKEN) @optional()
    protected readonly memoryService: MemoryService | undefined;

    @inject(CyberVinciAiRuntimeFrontendService) @optional()
    protected readonly aiRuntime: CyberVinciAiRuntimeFrontendService | undefined;

    @inject(ToolInvocationRegistry) @optional()
    protected readonly toolInvocationRegistry: ToolInvocationRegistry | undefined;

    @inject(ChatAgentService) @optional()
    protected readonly chatAgentService: ChatAgentService | undefined;

    @inject(MCPFrontendService) @optional()
    protected readonly mcpService: MCPFrontendService | undefined;

    @inject(OpenPencilDesignCommandService) @optional()
    protected readonly openPencilDesignCommandService: OpenPencilDesignCommandService | undefined;

    @inject(ApplicationShell) @optional()
    protected readonly shell: ApplicationShell | undefined;

    @inject(WorkspaceService) @optional()
    protected readonly workspaceService: WorkspaceService | undefined;

    @inject(QuickPickService) @optional()
    protected readonly quickPickService: QuickPickService | undefined;

    protected toolsById: Map<string, CyberVinciToolDefinition> | undefined;
    protected playbookRunner: CyberVinciPlaybookToolRunner | undefined;
    protected playbookResumer: CyberVinciPlaybookToolResumer | undefined;

    setPlaybookRunner(runner: CyberVinciPlaybookToolRunner): void {
        this.playbookRunner = runner;
    }

    setPlaybookResumer(resumer: CyberVinciPlaybookToolResumer): void {
        this.playbookResumer = resumer;
    }

    async getTool(id: string): Promise<CyberVinciToolDefinition | undefined> {
        return (await this.getToolsById()).get(id);
    }

    async executeTool(toolId: string, context: CyberVinciHostToolExecutionContext): Promise<CyberVinciHostToolExecutionResult> {
        const tool = await this.getTool(toolId);
        if (!tool) {
            if (this.toolInvocationRegistry?.getFunction(toolId)) {
                return this.executeTheiaTool(toolId, context);
            }
            return { ok: false, message: `Tool '${toolId}' is not configured.` };
        }
        const approval = await this.ensureToolPolicyApproved(tool, context);
        if (!approval.ok) {
            return approval;
        }
        if (tool.implementation === 'composite' || tool.entry?.type === 'composite' || tool.steps?.length) {
            return this.executeCompositeTool(tool, context);
        }
        if (tool.implementation === 'theia-tool' || tool.theiaToolId) {
            return this.executeTheiaTool(tool.theiaToolId ?? tool.entry?.ref ?? tool.id, context);
        }
        if (tool.implementation === 'command' || tool.command) {
            return this.executeCommandTool(tool.id, context);
        }
        return this.executeHostTool(tool.id, context);
    }

    protected async getToolsById(): Promise<Map<string, CyberVinciToolDefinition>> {
        if (!this.toolsById) {
            const tools = await this.service.listTools();
            this.toolsById = new Map(tools.map(tool => [tool.id, tool]));
        }
        return this.toolsById;
    }

    protected async executeHostTool(toolId: string, context: CyberVinciHostToolExecutionContext): Promise<CyberVinciHostToolExecutionResult> {
        switch (toolId) {
            case 'core.agent.invoke':
            case 'system.agent.native.invoke':
            case 'system.chat.direct':
                if (context.invokeNativeAgent) {
                    await context.invokeNativeAgent();
                    context.state['core.agent.invoke.invoked'] = true;
                    return { ok: true, stop: true, value: { route: 'native-agent', invoked: true } };
                }
                return { ok: true, value: { route: 'agent' } };
            case 'core.agent.describe':
            case 'system.agent.describe':
                return this.describeAgent(context);
            case 'core.agent.preflight':
            case 'system.agent.preflight':
                return this.preflightAgent(context);
            case 'system.agent.nativeMcpRequirements':
                return this.nativeAgentMcpRequirements(context);
            case 'core.chat.respond':
                return this.respondInChat(context);
            case 'core.chat.stop':
                return { ok: true, stop: true, message: 'Chat turn stopped by playbook.' };
            case 'core.playbook.list':
                return this.listPlaybooks();
            case 'core.playbook.run':
                return this.runPlaybookTool(context);
            case 'core.playbook.resume':
                return this.resumePlaybookTool(context);
            case 'core.playbook.compileToFlowDraft':
                return this.compilePlaybookToFlowDraft(context);
            case 'core.playbook.createFlowFromPlaybook':
                return this.createFlowFromPlaybook(context);
            case 'core.provider.status':
            case 'system.provider.ready':
                return this.providerStatus(context);
            case 'core.preferences.get':
                return {
                    ok: true,
                    value: this.preferenceService.get(String(context.input.key ?? ''), context.input.defaultValue)
                };
            case 'core.preferences.set':
                return this.setPreference(context);
            case 'core.flow.listWorkflows':
                return this.listFlowWorkflows(context);
            case 'core.flow.listPendingGates':
            case 'system.flow.gates.pending':
                return this.listPendingFlowGates(context);
            case 'core.flow.approveGate':
            case 'system.flow.gate.decide':
                return this.approveFlowGate(context);
            case 'core.flow.startRun':
            case 'system.flow.saved.available':
                return this.startFlowRun(context);
            case 'core.flow.runDynamicWorkflow':
            case 'system.flow.dynamic.run':
                return this.runDynamicWorkflow(context);
            case 'core.flow.runAiAuthoredDynamicWorkflow':
            case 'system.flow.aiAuthoring.runWorkflow':
                return this.runAiAuthoredDynamicWorkflow(context);
            case 'core.flow.runAiAuthoringDraft':
            case 'system.flow.aiAuthoringDraft.run':
                return this.runAiAuthoringDraft(context);
            case 'core.flow.createWorkflowFromAiAuthoringDraft':
            case 'system.flow.aiAuthoringDraft.createWorkflow':
                return this.createWorkflowFromAiAuthoringDraft(context);
            case 'core.flow.getAiAuthoringSpec':
            case 'system.flow.aiAuthoringSpec':
                return this.getFlowAiAuthoringSpec();
            case 'core.memory.searchContext':
            case 'system.memory.searchContext':
                return this.searchMemoryContext(context);
            case 'core.memory.proposeCandidate':
            case 'system.memory.proposeCandidate':
                return this.proposeMemoryCandidate(context);
            case 'core.memory.requestWriteApproval':
            case 'system.memory.requestWriteApproval':
                return this.requestMemoryWriteApproval(context);
            case 'core.memory.writeApproved':
            case 'system.memory.writeApproved':
                return this.writeApprovedMemory(context);
            case 'core.theiaTool.list':
            case 'system.theiaTool.list':
                return this.listTheiaTools();
            case 'core.theiaTool.invoke':
            case 'system.theiaTool.invoke':
                return this.executeTheiaTool(String(context.input.toolId ?? '').trim(), context);
            case 'system.mcp.hasServer':
                return this.mcpHasServer(context);
            case 'system.mcp.isServerStarted':
                return this.mcpIsServerStarted(context);
            case 'system.mcp.configureServer':
                return this.mcpConfigureServers(context, false);
            case 'system.mcp.ensureServersStarted':
                return this.mcpConfigureServers(context, true);
            case 'system.canvas.captureCurrentDocument':
                return this.captureCanvasDocument(context);
            case 'system.canvas.captureScreenshot':
                return this.captureCanvasVisualSnapshot(context);
            case 'system.canvas.collectLayoutDiagnostics':
                return this.collectCanvasLayoutDiagnostics(context);
            case 'system.canvas.detectOverlaps':
                return this.collectCanvasLayoutDiagnostics(context, ['overlap']);
            case 'system.canvas.detectOffCanvasNodes':
                return this.collectCanvasLayoutDiagnostics(context, ['off-canvas']);
            case 'system.canvas.detectTextOverflow':
                return this.collectCanvasLayoutDiagnostics(context, ['text-overflow']);
            case 'system.canvas.validateFooterPresence':
                return this.collectCanvasLayoutDiagnostics(context, ['footer']);
            case 'system.canvas.validateCloneCompleteness':
                return this.collectCanvasLayoutDiagnostics(context, ['clone-completeness']);
            case 'system.canvas.applyOperations':
                return this.applyCanvasOperations(context);
            case 'system.canvas.resizeToFit':
                return this.resizeCanvasNodesToFit(context);
            case 'system.canvas.reorderLayers':
                return this.reorderCanvasLayers(context);
            case 'system.canvas.getReferenceFromKnownSite':
                return this.getCanvasKnownSiteReference(context);
            case 'system.vision.judge':
                return this.runVisionJudge(context);
            default:
                return this.executeSystemStub(toolId);
        }
    }

    protected async describeAgent(context: CyberVinciHostToolExecutionContext): Promise<CyberVinciHostToolExecutionResult> {
        const agents = (await this.service.getDeclarativeChatAgentManifest()).agents ?? [];
        const agent = this.resolveAgentFromContext(agents, context);
        const runtimeAgent = this.resolveRuntimeChatAgent(agent, context);
        const runtimeCapabilityProfile = this.runtimeAgentCapabilityProfile(runtimeAgent);
        const capabilityProfile = agent
            ? this.agentCapabilityProfile(agent, runtimeCapabilityProfile)
            : runtimeCapabilityProfile;
        const functionBridge = this.functionBridgeStatus(capabilityProfile.functions);
        const playbookId = String(context.input.playbookId ?? context.playbookId ?? agent?.defaultPlaybook ?? '').trim();
        const value = {
            agent: agent ? {
                id: agent.id,
                name: agent.name,
                kind: agent.kind,
                category: agent.category,
                source: agent.source,
                sourceAgentId: agent.sourceAgentId,
                description: agent.description,
                defaultPlaybook: agent.defaultPlaybook,
                playbooks: agent.playbooks ?? [],
                tools: agent.tools ?? [],
                variables: agent.variables ?? [],
                functions: agent.functions ?? [],
                modes: (agent.modes ?? []).map(mode => mode.id),
                preserveNative: agent.preserveNative,
                capabilityProfile,
                runtimeAgent: this.runtimeAgentSummary(runtimeAgent),
                theiaFunctionBridge: functionBridge,
                migrationStatus: this.agentMigrationStatus(agent, capabilityProfile, playbookId, runtimeAgent)
            } : undefined,
            request: {
                requestId: context.requestId,
                playbookId,
                stateId: context.stateId,
                promptLength: String(context.input.prompt ?? '').length
            }
        };
        const diagnostics = !agent && this.expectsAgentInContext(context)
            ? ['No selected agent was found in the CyberVinci declarative agent catalog.']
            : [];
        return {
            ok: true,
            value,
            diagnostics,
            message: agent
                ? `Resolved agent '${agent.name}' for playbook '${playbookId || '<none>'}' with ${(capabilityProfile.functions ?? []).length} function(s), ${(capabilityProfile.promptSets ?? []).length} prompt set(s), and ${(capabilityProfile.modes ?? []).length} mode(s).`
                : 'No selected agent was resolved for this playbook run.'
        };
    }

    protected agentMigrationStatus(
        agent: CyberVinciAgentDefinition,
        capabilityProfile: CyberVinciAgentCapabilityProfile,
        playbookId: string,
        runtimeAgent: ChatAgent | undefined
    ): Record<string, unknown> {
        const nativeLike = agent.kind === 'native' || !!agent.sourceAgentId;
        if (!nativeLike) {
            return {
                strategy: 'declarative',
                autonomousPlaybook: true,
                nativeDelegate: false,
                deterministicCoverage: ['playbook']
            };
        }
        const hasMcpRequirementRefs = (capabilityProfile.mcpPromptRefs ?? []).length > 0;
        const explicitMigrationStatus = agent.migrationStatus;
        if (explicitMigrationStatus && typeof explicitMigrationStatus === 'object' && !Array.isArray(explicitMigrationStatus)) {
            return {
                ...explicitMigrationStatus,
                selectedPlaybook: explicitMigrationStatus.selectedPlaybook ?? (playbookId || agent.defaultPlaybook),
                sourceAgentId: explicitMigrationStatus.sourceAgentId ?? agent.sourceAgentId ?? agent.id,
                sourceAgentAvailable: !!runtimeAgent
            };
        }
        return {
            strategy: 'playbook-autonomous',
            autonomousPlaybook: true,
            nativeDelegate: false,
            nativeDelegateFallback: false,
            selectedPlaybook: playbookId || agent.defaultPlaybook,
            preservesNativeInvoke: agent.preserveNative?.invoke === true,
            sourceAgentId: agent.sourceAgentId ?? agent.id,
            sourceAgentAvailable: !!runtimeAgent,
            deterministicCoverage: [
                'agent.describe',
                'agent.preflight',
                'agent.nativeMcpRequirements',
                ...(hasMcpRequirementRefs ? ['mcp.configureOrStartDecision'] : []),
                'ai.autonomousResponse'
            ],
            migrationReady: {
                editableUserCopy: true,
                capabilityProfile: true,
                replacementStillUsesNativeDelegate: false,
                fallbackStillUsesNativeDelegate: false
            }
        };
    }

    protected async preflightAgent(context: CyberVinciHostToolExecutionContext): Promise<CyberVinciHostToolExecutionResult> {
        const diagnostics: string[] = [];
        const agents = (await this.service.getDeclarativeChatAgentManifest()).agents ?? [];
        const agent = this.resolveAgentFromContext(agents, context);
        const expectsAgent = this.expectsAgentInContext(context);
        const runtimeAgent = this.resolveRuntimeChatAgent(agent, context);
        const capabilityProfile = agent
            ? this.agentCapabilityProfile(agent, this.runtimeAgentCapabilityProfile(runtimeAgent))
            : this.runtimeAgentCapabilityProfile(runtimeAgent);
        const functionBridge = this.functionBridgeStatus(capabilityProfile.functions);
        const mcpFunctionRefs = new Set(capabilityProfile.mcpPromptRefs ?? []);
        const missingNonMcpFunctions = functionBridge.missingFunctions.filter(id => !id.startsWith('mcp_') && !mcpFunctionRefs.has(id));
        if (!agent && expectsAgent) {
            diagnostics.push('Agent preflight could not resolve the selected declarative/native agent.');
        }

        const playbookId = String(context.input.playbookId ?? context.playbookId ?? agent?.defaultPlaybook ?? '').trim();
        const playbookResolution = playbookId ? await this.resolvePreflightPlaybook(playbookId) : undefined;
        if (playbookId && !playbookResolution?.playbook) {
            diagnostics.push(`Agent preflight could not find playbook '${playbookId}'.`);
        }

        if (agent?.kind === 'native') {
            const preserve = agent.preserveNative ?? {};
            for (const key of ['modes', 'prompts', 'variables', 'functions', 'languageModelRequirements'] as const) {
                if (preserve[key] !== true) {
                    diagnostics.push(`Native agent '${agent.id}' does not declare preserveNative.${key}=true.`);
                }
            }
        }
        if (agent?.kind === 'native' && !runtimeAgent) {
            diagnostics.push(`Native source agent '${agent.sourceAgentId ?? agent.id}' is not registered in Theia ChatAgentService.`);
        }
        if (functionBridge.declaredFunctions.length > 0 && !functionBridge.available) {
            diagnostics.push('Theia ToolInvocationRegistry is not available for native agent function checks.');
        }
        if (missingNonMcpFunctions.length > 0) {
            diagnostics.push(`Native agent '${agent?.id ?? playbookId ?? '<unknown>'}' references missing Theia function(s): ${missingNonMcpFunctions.join(', ')}.`);
        }

        const provider = await this.providerStatus(context);
        if (!provider.ok && provider.message) {
            diagnostics.push(provider.message);
        }

        const toolCount = this.toolInvocationRegistry ? this.toolInvocationRegistry.getAllFunctions().length : 0;
        const ready = diagnostics.length === 0;
        return {
            ok: ready,
            value: {
                ready,
                agentId: agent?.id,
                sourceAgentId: agent?.sourceAgentId,
                playbookId,
                playbookResolution: playbookResolution ? {
                    id: playbookResolution.playbook?.id,
                    generated: playbookResolution.generated,
                    fallbackPlaybookId: playbookResolution.fallbackPlaybookId
                } : undefined,
                runtimeAgent: this.runtimeAgentSummary(runtimeAgent),
                capabilityProfile,
                theiaFunctionBridge: functionBridge,
                nativeCapabilityCheck: {
                    ok: missingNonMcpFunctions.length === 0 && (functionBridge.declaredFunctions.length === 0 || functionBridge.available),
                    missingNonMcpFunctions,
                    mcpFunctionRefs: [...mcpFunctionRefs],
                    mcpMissingFunctions: functionBridge.missingFunctions.filter(id => id.startsWith('mcp_') || mcpFunctionRefs.has(id))
                },
                provider: provider.value,
                theiaToolBridge: {
                    available: !!this.toolInvocationRegistry,
                    toolCount
                }
            },
            diagnostics,
            message: ready
                ? `Agent preflight passed for '${agent?.name ?? playbookId ?? 'chat'}' with ${functionBridge.registeredFunctions.length}/${functionBridge.declaredFunctions.length} declared function(s) registered.`
                : `Agent preflight found ${diagnostics.length} issue(s).`
        };
    }

    protected async resolvePreflightPlaybook(playbookId: string): Promise<{ playbook?: CyberVinciPlaybookDefinition; generated: boolean; fallbackPlaybookId?: string }> {
        const playbook = await this.service.getPlaybook(playbookId);
        if (playbook) {
            return { playbook, generated: false };
        }
        if (!playbookId.startsWith(NATIVE_AGENT_PLAYBOOK_PREFIX)) {
            return { generated: false };
        }
        return {
            playbook: this.createRuntimeAutonomousPlaybook(playbookId),
            generated: true,
            fallbackPlaybookId: undefined
        };
    }

    protected createRuntimeAutonomousPlaybook(playbookId: string): CyberVinciPlaybookDefinition {
        const agentName = this.agentIdFromNativePlaybook(playbookId) ?? 'Native';
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
            states: [
                { id: 'describe-agent', type: 'tool', tool: 'core.agent.describe', transitions: [{ to: 'preflight' }] },
                { id: 'preflight', type: 'tool', tool: 'core.agent.preflight', transitions: [{ to: 'check-native-requirements' }] },
                { id: 'check-native-requirements', type: 'tool', tool: 'system.agent.nativeMcpRequirements', transitions: [{ to: 'answer-runtime-agent' }] },
                {
                    id: 'answer-runtime-agent',
                    type: 'ai',
                    agent: agentName,
                    prompt: `You are ${agentName}. Answer the user's request through the CyberVinci autonomous playbook runtime. Do not invoke or delegate to the original Theia native agent.\n\nUser request:\n${'${input.prompt}'}`,
                    input: {
                        prompt: '${input.prompt}',
                        agentId: '${input.agentId}',
                        sourceAgentId: '${input.sourceAgentId}'
                    },
                    saveAs: 'runtimeAgentAnswer',
                    transitions: [{ to: 'runtime-agent-response' }]
                },
                { id: 'runtime-agent-response', type: 'response', text: '${state.runtimeAgentAnswer}' }
            ]
        };
    }

    protected async nativeAgentMcpRequirements(context: CyberVinciHostToolExecutionContext): Promise<CyberVinciHostToolExecutionResult> {
        const agents = (await this.service.getDeclarativeChatAgentManifest()).agents ?? [];
        const agent = this.resolveAgentFromContext(agents, context);
        const runtimeAgent = this.resolveRuntimeChatAgent(agent, context);
        const capabilityProfile = agent
            ? this.agentCapabilityProfile(agent, this.runtimeAgentCapabilityProfile(runtimeAgent))
            : this.runtimeAgentCapabilityProfile(runtimeAgent);
        const requirement = this.nativeMcpRequirementForAgent(agent, capabilityProfile, context);
        if (!requirement || !requirement.groups.length) {
            return {
                ok: true,
                value: {
                    agentId: agent?.id,
                    sourceAgentId: agent?.sourceAgentId,
                    groups: [],
                    selectedGroupId: undefined,
                    requirements: [],
                    requiresConfiguration: false,
                    requiresStart: false
                },
                message: `No known native MCP requirements for '${agent?.name ?? context.playbookId ?? 'chat'}'.`
            };
        }

        const selectedGroup = this.selectNativeMcpRequirementGroup(requirement.groups, context);
        const statuses = await this.readMcpRequirementStatuses(selectedGroup.servers);
        const requiresConfiguration = statuses.some(status => !status.configured);
        const requiresUserConfiguration = selectedGroup.requiresUserSecret === true
            && statuses.some(status => !status.configured || status.hasPlaceholderSecret);
        const requiresStart = statuses.some(status => !status.started);
        const recommendedAction = requiresUserConfiguration
            ? 'configure'
            : requiresStart
                ? 'start'
                : 'none';
        const canAutoEnsure = !requiresUserConfiguration;
        const mode = String(context.input.mode ?? context.input.action ?? 'report').trim().toLowerCase();
        if (mode === 'configure' || mode === 'ensure' || mode === 'start') {
            if ((mode === 'ensure' || mode === 'start') && !canAutoEnsure) {
                return {
                    ok: false,
                    value: {
                        ok: false,
                        agentId: agent?.id,
                        sourceAgentId: agent?.sourceAgentId,
                        selectedGroupId: selectedGroup.id,
                        selectedGroupLabel: selectedGroup.label,
                        requirements: statuses,
                        recommendedAction,
                        requiresConfiguration,
                        requiresUserConfiguration,
                        requiresStart,
                        canAutoEnsure
                    },
                    message: `${selectedGroup.label} requires user configuration before it can be started.`
                };
            }
            const result = await this.mcpConfigureServers({
                ...context,
                input: {
                    ...context.input,
                    servers: selectedGroup.servers
                }
            }, mode !== 'configure');
            if (mode === 'configure' && context.input.openSettings !== false) {
                await this.openMcpSettingsPreference();
            }
            return {
                ...result,
                value: {
                    ok: result.ok,
                    agentId: agent?.id,
                    sourceAgentId: agent?.sourceAgentId,
                    selectedGroupId: selectedGroup.id,
                    selectedGroupLabel: selectedGroup.label,
                    before: statuses,
                    configured: (result.value as Record<string, unknown> | undefined)?.configured,
                    started: (result.value as Record<string, unknown> | undefined)?.started,
                    recommendedAction,
                    requiresConfiguration,
                    requiresUserConfiguration,
                    requiresStart,
                    canAutoEnsure
                }
            };
        }

        return {
            ok: true,
            value: {
                agentId: agent?.id,
                sourceAgentId: agent?.sourceAgentId,
                agentName: requirement.agentName,
                available: !!this.mcpService,
                groups: requirement.groups.map(group => ({
                    id: group.id,
                    label: group.label,
                    default: group.default === true,
                    requiresUserSecret: group.requiresUserSecret === true,
                    promptVariantId: group.promptVariantId,
                    promptRefs: group.promptRefs ?? [],
                    servers: group.servers.map(server => server.name)
                })),
                selectedGroupId: selectedGroup.id,
                selectedGroupLabel: selectedGroup.label,
                requirements: statuses,
                requiresConfiguration,
                requiresUserConfiguration,
                requiresStart,
                recommendedAction,
                canAutoEnsure
            },
            message: `Native MCP requirements for '${requirement.agentName}': configured ${statuses.filter(status => status.configured).length}/${statuses.length}, started ${statuses.filter(status => status.started).length}/${statuses.length}.`
        };
    }

    protected nativeMcpRequirementForAgent(
        agent: CyberVinciAgentDefinition | undefined,
        capabilityProfile: CyberVinciAgentCapabilityProfile,
        context: CyberVinciHostToolExecutionContext
    ): CyberVinciNativeMcpRequirement | undefined {
        const agentId = String(agent?.sourceAgentId ?? agent?.id ?? context.input.sourceAgentId ?? context.input.agentId ?? '').trim();
        const promptRefs = capabilityProfile.mcpPromptRefs ?? [];
        const groups = new Map<string, CyberVinciNativeMcpServerGroup>();
        const addGroup = (group: CyberVinciNativeMcpServerGroup): void => {
            const previous = groups.get(group.id);
            if (!previous) {
                groups.set(group.id, group);
                return;
            }
            groups.set(group.id, {
                ...previous,
                ...group,
                promptRefs: this.uniqueStrings([...(previous.promptRefs ?? []), ...(group.promptRefs ?? [])]),
                servers: [...previous.servers, ...group.servers].filter((server, index, servers) =>
                    servers.findIndex(candidate => candidate.name === server.name) === index
                )
            });
        };

        for (const promptRef of promptRefs) {
            const group = this.nativeMcpRequirementGroupForPromptRef(promptRef);
            if (group) {
                addGroup(group);
            }
        }

        if (agentId === 'GitHub') {
            addGroup(this.githubMcpRequirementGroup());
        }
        if (agentId === 'AppTester') {
            addGroup(this.chromeDevToolsMcpRequirementGroup());
            addGroup(this.playwrightMcpRequirementGroup());
        }

        const resolvedGroups = [...groups.values()];
        if (!resolvedGroups.length) {
            return undefined;
        }
        return {
            agentId: agent?.id ?? agentId,
            agentName: agent?.name ?? agentId,
            sourceAgentId: agent?.sourceAgentId,
            groups: resolvedGroups
        };
    }

    protected nativeMcpRequirementGroupForPromptRef(promptRef: string): CyberVinciNativeMcpServerGroup | undefined {
        switch (promptRef) {
            case 'mcp_github_tools':
                return this.githubMcpRequirementGroup();
            case 'mcp_chrome-devtools_tools':
                return this.chromeDevToolsMcpRequirementGroup();
            case 'mcp_playwright_tools':
            case 'mcp_playwright-visual_tools':
                return this.playwrightMcpRequirementGroup();
            default:
                return undefined;
        }
    }

    protected githubMcpRequirementGroup(): CyberVinciNativeMcpServerGroup {
        return {
            id: 'github',
            label: 'GitHub MCP',
            default: true,
            requiresUserSecret: true,
            promptRefs: ['mcp_github_tools'],
            servers: [{
                name: 'github',
                serverUrl: 'https://api.githubcopilot.com/mcp/',
                serverAuthToken: 'your_github_token_here'
            }]
        };
    }

    protected chromeDevToolsMcpRequirementGroup(): CyberVinciNativeMcpServerGroup {
        return {
            id: 'chrome-devtools',
            label: 'Chrome DevTools MCP',
            default: true,
            promptRefs: ['mcp_chrome-devtools_tools'],
            servers: [{
                name: 'chrome-devtools',
                command: 'npx',
                args: ['-y', 'chrome-devtools-mcp@latest', '--cdp-endpoint', 'http://127.0.0.1:9222', '--no-usage-statistics']
            }]
        };
    }

    protected playwrightMcpRequirementGroup(): CyberVinciNativeMcpServerGroup {
        return {
            id: 'playwright',
            label: 'Playwright MCP',
            promptVariantId: 'app-tester-system-playwright',
            promptRefs: ['mcp_playwright_tools', 'mcp_playwright-visual_tools'],
            servers: [
                {
                    name: 'playwright',
                    command: 'npx',
                    args: ['-y', '@playwright/mcp@latest', '--cdp-endpoint', 'http://localhost:9222/']
                },
                {
                    name: 'playwright-visual',
                    command: 'npx',
                    args: ['-y', '@playwright/mcp@latest', '--vision', '--cdp-endpoint', 'http://localhost:9222/']
                }
            ]
        };
    }

    protected selectNativeMcpRequirementGroup(groups: CyberVinciNativeMcpServerGroup[], context: CyberVinciHostToolExecutionContext): CyberVinciNativeMcpServerGroup {
        const requested = String(
            context.input.groupId
            ?? context.input.mcpGroupId
            ?? context.input.promptVariantId
            ?? context.input.variantId
            ?? ''
        ).trim();
        return groups.find(group =>
            group.id === requested
            || group.promptVariantId === requested
            || (group.promptRefs ?? []).includes(requested)
        ) ?? groups.find(group => group.default) ?? groups[0];
    }

    protected async readMcpRequirementStatuses(servers: MCPServerDescription[]): Promise<CyberVinciMcpServerStatus[]> {
        if (!this.mcpService) {
            return servers.map(server => ({
                name: server.name,
                configured: false,
                started: false
            }));
        }
        const statuses: CyberVinciMcpServerStatus[] = [];
        for (const server of servers) {
            const configured = await this.mcpService.hasServer(server.name);
            const started = configured ? await this.mcpService.isServerStarted(server.name) : false;
            const stored = this.preferenceService.get<Record<string, Record<string, unknown>>>(MCP_SERVERS_PREF, {}) ?? {};
            const serverPreference = stored[server.name];
            const authToken = typeof serverPreference?.serverAuthToken === 'string'
                ? serverPreference.serverAuthToken
                : typeof (server as unknown as Record<string, unknown>).serverAuthToken === 'string'
                    ? String((server as unknown as Record<string, unknown>).serverAuthToken)
                    : undefined;
            statuses.push({
                name: server.name,
                configured,
                started,
                hasPlaceholderSecret: this.isPlaceholderMcpSecret(authToken)
            });
        }
        return statuses;
    }

    protected isPlaceholderMcpSecret(value: string | undefined): boolean {
        if (!value) {
            return false;
        }
        return /your_.*token_here|<.*token.*>|github-pat-or-app-token/i.test(value);
    }

    protected async openMcpSettingsPreference(): Promise<void> {
        try {
            await this.commandService.executeCommand('preferences:open', MCP_SERVERS_PREF);
        } catch (error) {
            this.logger.debug(`Failed to open MCP settings preference '${MCP_SERVERS_PREF}'.`, error);
        }
    }

    protected async providerStatus(context: CyberVinciHostToolExecutionContext): Promise<CyberVinciHostToolExecutionResult> {
        if (!this.aiRuntime) {
            return {
                ok: false,
                value: { ready: false, reason: 'ai-runtime-unavailable' },
                message: 'CyberVinci AI Runtime is not available.'
            };
        }
        try {
            const workspacePath = this.workspaceService?.workspace?.resource?.path.fsPath();
            const [defaultExecution, providers] = await Promise.all([
                this.aiRuntime.getDefaultExecution({ workspacePath, includeUnavailable: true }),
                this.aiRuntime.listProviders({ workspacePath, includeUnavailable: true })
            ]);
            const requestedExecution = this.readAiExecutionSelection(context);
            const selectedExecution: CyberVinciAiExecutionSelection = { ...defaultExecution };
            for (const [key, value] of Object.entries(requestedExecution)) {
                if (value !== undefined && (typeof value !== 'string' || value.trim())) {
                    (selectedExecution as Record<string, unknown>)[key] = value;
                }
            }
            if (!selectedExecution.providerId && selectedExecution.runtime && selectedExecution.modelProvider) {
                selectedExecution.providerId = `${selectedExecution.runtime}:${selectedExecution.modelProvider}`;
            }
            const requestedProviderId = String(selectedExecution.providerId ?? '').trim();
            const requestedModel = String(selectedExecution.model ?? '').trim();
            const provider = providers.find(candidate =>
                candidate.id === requestedProviderId
                || (!!selectedExecution.runtime && !!selectedExecution.modelProvider
                    && candidate.runtime === selectedExecution.runtime
                    && candidate.modelProvider === selectedExecution.modelProvider)
            ) ?? providers.find(candidate => candidate.available);
            const modelIds = new Set<string>([
                ...(provider?.models ?? []),
                ...((provider?.modelMetadata ?? []).map(model => model.id).filter(Boolean) as string[])
            ]);
            const modelReady = !requestedModel || !modelIds.size || modelIds.has(requestedModel);
            const ready = !!provider?.available && modelReady;
            return {
                ok: ready,
                value: {
                    ready,
                    selected: selectedExecution,
                    requestedProviderId,
                    requestedModel,
                    provider: provider ? {
                        id: provider.id,
                        label: provider.label,
                        runtime: provider.runtime,
                        modelProvider: provider.modelProvider,
                        available: provider.available,
                        authenticated: provider.authenticated,
                        defaultModel: provider.defaultModel,
                        configurationRequired: provider.configurationRequired ?? [],
                        message: provider.message
                    } : undefined,
                    providerCount: providers.length,
                    modelReady
                },
                message: ready
                    ? `Provider '${provider?.label ?? requestedProviderId}' is ready.`
                    : `Provider/model is not ready${provider ? ` for '${provider.label}'` : ''}.`
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return {
                ok: false,
                value: { ready: false, reason: message },
                message
            };
        }
    }

    protected respondInChat(context: CyberVinciHostToolExecutionContext): CyberVinciHostToolExecutionResult {
        const message = String(context.input.message ?? context.input.text ?? context.input.prompt ?? '').trim();
        const request = this.asChatRequest(context.chatRequest);
        if (message && request) {
            request.response.response.addContent(new MarkdownChatResponseContentImpl(message));
        }
        return {
            ok: true,
            stop: true,
            value: message,
            message
        };
    }

    protected resolveAgentFromContext(agents: CyberVinciAgentDefinition[], context: CyberVinciHostToolExecutionContext): CyberVinciAgentDefinition | undefined {
        const candidates = this.contextAgentHints(context);
        for (const id of candidates) {
            const agent = agents.find(candidate =>
                candidate.id === id
                || candidate.sourceAgentId === id
                || candidate.defaultPlaybook === context.playbookId
            );
            if (agent) {
                return agent;
            }
        }
        if (candidates.length > 0) {
            const runtimeAgent = this.resolveRuntimeChatAgent(undefined, context);
            if (runtimeAgent) {
                return this.toRuntimeNativeAgentDefinition(runtimeAgent);
            }
        }
        if (context.playbookId) {
            const agent = agents.find(candidate => candidate.defaultPlaybook === context.playbookId || (candidate.playbooks ?? []).includes(context.playbookId!));
            if (agent) {
                return agent;
            }
        }
        const runtimeAgentByPlaybook = this.resolveRuntimeChatAgent(undefined, context);
        if (runtimeAgentByPlaybook) {
            return this.toRuntimeNativeAgentDefinition(runtimeAgentByPlaybook);
        }
        return undefined;
    }

    protected contextAgentHints(context: CyberVinciHostToolExecutionContext): string[] {
        const stateAgent = typeof context.state.agent === 'object' && context.state.agent !== null
            ? context.state.agent as Record<string, unknown>
            : {};
        return this.uniqueStrings([
            context.input.agentId,
            context.input.sourceAgentId,
            this.agentIdFromNativePlaybook(context.playbookId),
            stateAgent.id,
            stateAgent.sourceAgentId
        ]);
    }

    protected expectsAgentInContext(context: CyberVinciHostToolExecutionContext): boolean {
        return this.contextAgentHints(context).length > 0 || !!context.playbookId?.startsWith(NATIVE_AGENT_PLAYBOOK_PREFIX);
    }

    protected resolveRuntimeChatAgent(agent: CyberVinciAgentDefinition | undefined, context: CyberVinciHostToolExecutionContext): ChatAgent | undefined {
        if (!this.chatAgentService) {
            return undefined;
        }
        const ids = this.uniqueStrings([
            agent?.sourceAgentId,
            agent?.id,
            this.agentIdFromNativePlaybook(context.playbookId),
            ...this.contextAgentHints(context)
        ]);
        const allAgents = this.chatAgentService.getAllAgents();
        for (const id of ids) {
            const runtimeAgent = allAgents.find(candidate => candidate.id === id);
            if (runtimeAgent) {
                return runtimeAgent;
            }
        }
        return undefined;
    }

    protected agentIdFromNativePlaybook(playbookId: string | undefined): string | undefined {
        if (!playbookId?.startsWith(NATIVE_AGENT_PLAYBOOK_PREFIX)) {
            return undefined;
        }
        return playbookId.slice(NATIVE_AGENT_PLAYBOOK_PREFIX.length);
    }

    protected toRuntimeNativeAgentDefinition(agent: ChatAgent): CyberVinciAgentDefinition {
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
        return `${NATIVE_AGENT_PLAYBOOK_PREFIX}${agentId}`;
    }

    protected agentCapabilityProfile(agent: CyberVinciAgentDefinition, runtimeProfile: CyberVinciAgentCapabilityProfile = {}): CyberVinciAgentCapabilityProfile {
        const explicitTools = agent.capabilityProfile?.tools ?? [];
        const declaredTools = (agent.tools ?? []).map(id => ({ id, source: 'catalog' }));
        const declaredFunctionTools = this.functionToolCapabilities(agent.functions ?? [], 'theia');
        const byId = new Map<string, CyberVinciAgentToolCapability>();
        for (const tool of [...declaredTools, ...declaredFunctionTools, ...explicitTools]) {
            byId.set(tool.id, { ...byId.get(tool.id), ...tool });
        }
        const staticProfile: CyberVinciAgentCapabilityProfile = {
            tools: [...byId.values()],
            guards: agent.capabilityProfile?.guards ?? [],
            variables: agent.capabilityProfile?.variables ?? agent.variables ?? [],
            agentSpecificVariables: agent.capabilityProfile?.agentSpecificVariables ?? [],
            functions: agent.capabilityProfile?.functions ?? agent.functions ?? [],
            promptFunctionRefs: agent.capabilityProfile?.promptFunctionRefs ?? [],
            mcpPromptRefs: agent.capabilityProfile?.mcpPromptRefs ?? [],
            modes: agent.capabilityProfile?.modes ?? (agent.modes ?? []).map(mode => mode.id),
            prompts: agent.capabilityProfile?.prompts ?? (agent.promptVariants ?? []).map(prompt => prompt.id),
            promptSets: agent.capabilityProfile?.promptSets ?? [],
            languageModels: agent.capabilityProfile?.languageModels ?? (agent.languageModelRequirements ?? []).map(requirement => requirement.name ?? requirement.identifier ?? requirement.purpose)
        };
        return this.mergeAgentCapabilityProfiles(staticProfile, runtimeProfile);
    }

    protected runtimeAgentCapabilityProfile(agent: ChatAgent | undefined): CyberVinciAgentCapabilityProfile {
        if (!agent) {
            return {};
        }
        const promptSets = this.runtimePromptSets(agent);
        const promptFunctionRefs = this.runtimePromptFunctionRefs(agent);
        const mcpPromptRefs = this.runtimeMcpPromptRefs(agent);
        const functionIds = this.uniqueStrings([...(agent.functions ?? []), ...promptFunctionRefs]);
        return {
            variables: this.uniqueStrings(agent.variables ?? []),
            agentSpecificVariables: this.runtimeAgentSpecificVariables(agent),
            tools: this.functionToolCapabilities(functionIds, 'theia'),
            functions: functionIds,
            promptFunctionRefs,
            mcpPromptRefs,
            modes: this.uniqueStrings((agent.modes ?? []).map(mode => mode.id)),
            prompts: promptSets.map(promptSet => promptSet.id),
            promptSets,
            languageModels: this.uniqueStrings((agent.languageModelRequirements ?? []).map(requirement => this.languageModelRequirementLabel(requirement)))
        };
    }

    protected functionToolCapabilities(functionIds: readonly string[], source: CyberVinciAgentToolCapability['source']): CyberVinciAgentToolCapability[] {
        if (!functionIds.length) {
            return [];
        }
        const allFunctions = this.toolInvocationRegistry?.getAllFunctions() ?? [];
        const byId = new Map(allFunctions.map(tool => [tool.id, tool]));
        return this.uniqueStrings(functionIds).map(id => {
            const tool = byId.get(id);
            return {
                id,
                kind: 'tool',
                source,
                required: true,
                description: tool?.description ?? tool?.name ?? `Theia ToolInvocationRegistry function '${id}'.`
            };
        });
    }

    protected runtimeAgentSummary(agent: ChatAgent | undefined): Record<string, unknown> {
        if (!agent) {
            return { available: false };
        }
        return {
            available: true,
            id: agent.id,
            name: agent.name,
            description: agent.description,
            iconClass: agent.iconClass,
            tags: agent.tags ?? [],
            locations: (agent.locations ?? []).map(location => String(location)),
            variables: agent.variables?.length ?? 0,
            agentSpecificVariables: agent.agentSpecificVariables?.length ?? 0,
            functions: agent.functions?.length ?? 0,
            promptSets: agent.prompts?.length ?? 0,
            modes: agent.modes?.length ?? 0,
            languageModelRequirements: agent.languageModelRequirements?.length ?? 0
        };
    }

    protected runtimePromptSets(agent: ChatAgent): CyberVinciAgentPromptCapability[] {
        return (agent.prompts ?? []).map(promptSet => ({
            id: promptSet.id,
            defaultVariant: this.promptFragmentId(promptSet.defaultVariant),
            variants: this.uniqueStrings((promptSet.variants ?? []).map(variant => this.promptFragmentId(variant)))
        }));
    }

    protected runtimePromptFunctionRefs(agent: ChatAgent): string[] {
        return this.uniqueStrings((agent.prompts ?? []).flatMap(promptSet => {
            const templates = [
                promptSet.defaultVariant?.template,
                ...(promptSet.variants ?? []).map(variant => variant.template)
            ];
            return templates.flatMap(template => this.extractPromptFunctionRefs(template));
        }));
    }

    protected runtimeMcpPromptRefs(agent: ChatAgent): string[] {
        return this.uniqueStrings((agent.prompts ?? []).flatMap(promptSet => {
            const templates = [
                promptSet.defaultVariant?.template,
                ...(promptSet.variants ?? []).map(variant => variant.template)
            ];
            return templates.flatMap(template => this.extractMcpPromptRefs(template));
        }));
    }

    protected extractPromptFunctionRefs(template: string | undefined): string[] {
        if (!template) {
            return [];
        }
        const refs: string[] = [];
        const refPattern = /~\{([^}]+)\}/g;
        let match = refPattern.exec(template);
        while (match) {
            refs.push(match[1]);
            match = refPattern.exec(template);
        }
        return refs;
    }

    protected extractMcpPromptRefs(template: string | undefined): string[] {
        if (!template) {
            return [];
        }
        const refs: string[] = [];
        const refPattern = /\{\{\s*prompt:(mcp_[^}\s]+_tools)\s*\}\}/g;
        let match = refPattern.exec(template);
        while (match) {
            refs.push(match[1]);
            match = refPattern.exec(template);
        }
        return refs;
    }

    protected runtimeAgentSpecificVariables(agent: ChatAgent): CyberVinciAgentVariableCapability[] {
        return (agent.agentSpecificVariables ?? []).map(variable => ({
            id: variable.name,
            description: variable.description,
            usedInPrompt: variable.usedInPrompt
        }));
    }

    protected promptFragmentId(fragment: { id?: string } | undefined): string | undefined {
        return typeof fragment?.id === 'string' ? fragment.id : undefined;
    }

    protected languageModelRequirementLabel(requirement: unknown): string {
        if (!requirement || typeof requirement !== 'object') {
            return String(requirement ?? '');
        }
        const record = requirement as Record<string, unknown>;
        return this.uniqueStrings([
            record.purpose,
            record.name,
            record.identifier,
            record.vendor,
            record.family,
            record.version
        ]).join(':');
    }

    protected functionBridgeStatus(functionIds: readonly string[] | undefined): {
        available: boolean;
        toolCount: number;
        declaredFunctions: string[];
        registeredFunctions: string[];
        missingFunctions: string[];
        functions: Array<{ id: string; registered: boolean; name?: string; providerName?: string }>;
    } {
        const declaredFunctions = this.uniqueStrings(functionIds ?? []);
        const allFunctions = this.toolInvocationRegistry?.getAllFunctions() ?? [];
        const byId = new Map(allFunctions.map(tool => [tool.id, tool]));
        const functions = declaredFunctions.map(id => {
            const tool = byId.get(id);
            return {
                id,
                registered: !!tool,
                name: tool?.name,
                providerName: tool?.providerName
            };
        });
        return {
            available: !!this.toolInvocationRegistry,
            toolCount: allFunctions.length,
            declaredFunctions,
            registeredFunctions: functions.filter(item => item.registered).map(item => item.id),
            missingFunctions: functions.filter(item => !item.registered).map(item => item.id),
            functions
        };
    }

    protected mergeAgentCapabilityProfiles(...profiles: CyberVinciAgentCapabilityProfile[]): CyberVinciAgentCapabilityProfile {
        const promptFunctionRefs = this.uniqueStrings(profiles.flatMap(profile => profile.promptFunctionRefs ?? []));
        const mcpPromptRefs = this.uniqueStrings(profiles.flatMap(profile => profile.mcpPromptRefs ?? []));
        return {
            tools: this.mergeToolCapabilities(...profiles.map(profile => profile.tools ?? [])),
            guards: this.mergeToolCapabilities(...profiles.map(profile => profile.guards ?? [])),
            variables: this.uniqueStrings(profiles.flatMap(profile => profile.variables ?? [])),
            agentSpecificVariables: this.mergeVariableCapabilities(...profiles.map(profile => profile.agentSpecificVariables ?? [])),
            functions: this.uniqueStrings([...profiles.flatMap(profile => profile.functions ?? []), ...promptFunctionRefs]),
            promptFunctionRefs,
            mcpPromptRefs,
            modes: this.uniqueStrings(profiles.flatMap(profile => profile.modes ?? [])),
            prompts: this.uniqueStrings(profiles.flatMap(profile => profile.prompts ?? [])),
            promptSets: this.mergePromptCapabilities(...profiles.map(profile => profile.promptSets ?? [])),
            languageModels: this.uniqueStrings(profiles.flatMap(profile => profile.languageModels ?? []))
        };
    }

    protected mergeToolCapabilities(...groups: CyberVinciAgentToolCapability[][]): CyberVinciAgentToolCapability[] {
        const byId = new Map<string, CyberVinciAgentToolCapability>();
        for (const tool of groups.flat()) {
            if (!tool.id) {
                continue;
            }
            byId.set(tool.id, { ...byId.get(tool.id), ...tool });
        }
        return [...byId.values()];
    }

    protected mergeVariableCapabilities(...groups: CyberVinciAgentVariableCapability[][]): CyberVinciAgentVariableCapability[] {
        const byId = new Map<string, CyberVinciAgentVariableCapability>();
        for (const variable of groups.flat()) {
            if (!variable.id) {
                continue;
            }
            byId.set(variable.id, { ...byId.get(variable.id), ...variable });
        }
        return [...byId.values()];
    }

    protected mergePromptCapabilities(...groups: CyberVinciAgentPromptCapability[][]): CyberVinciAgentPromptCapability[] {
        const byId = new Map<string, CyberVinciAgentPromptCapability>();
        for (const prompt of groups.flat()) {
            if (!prompt.id) {
                continue;
            }
            const previous = byId.get(prompt.id);
            byId.set(prompt.id, {
                ...previous,
                ...prompt,
                variants: this.uniqueStrings([
                    ...(previous?.variants ?? []),
                    ...(prompt.variants ?? [])
                ])
            });
        }
        return [...byId.values()];
    }

    protected uniqueStrings(values: readonly unknown[]): string[] {
        return [...new Set(values
            .filter((value): value is string => typeof value === 'string')
            .map(value => value.trim())
            .filter(Boolean))];
    }

    protected async listPlaybooks(): Promise<CyberVinciHostToolExecutionResult> {
        const playbooks = await this.service.listPlaybooks();
        return {
            ok: true,
            value: { playbooks },
            message: `Found ${playbooks.length} CyberVinci Playbook(s).`
        };
    }

    protected async runPlaybookTool(context: CyberVinciHostToolExecutionContext): Promise<CyberVinciHostToolExecutionResult> {
        const playbookId = String(context.input.playbookId ?? context.input.playbook ?? context.input.id ?? '').trim();
        if (!playbookId) {
            return { ok: false, message: 'core.playbook.run requires playbookId, playbook, or id.' };
        }
        if (!this.playbookRunner) {
            return { ok: false, message: 'CyberVinci Playbook runner is not registered.' };
        }
        return this.playbookRunner(playbookId, context);
    }

    protected async resumePlaybookTool(context: CyberVinciHostToolExecutionContext): Promise<CyberVinciHostToolExecutionResult> {
        const requestId = String(context.input.requestId ?? context.input.runId ?? context.requestId ?? '').trim();
        if (!requestId) {
            return { ok: false, message: 'core.playbook.resume requires requestId or runId.' };
        }
        if (!this.playbookResumer) {
            return { ok: false, message: 'CyberVinci Playbook resumer is not registered.' };
        }
        return this.playbookResumer(requestId, context);
    }

    protected async compilePlaybookToFlowDraft(context: CyberVinciHostToolExecutionContext): Promise<CyberVinciHostToolExecutionResult> {
        const playbookId = String(context.input.playbookId ?? context.input.playbook ?? context.input.id ?? context.playbookId ?? '').trim();
        if (!playbookId) {
            return { ok: false, message: 'core.playbook.compileToFlowDraft requires playbookId, playbook, or id.' };
        }
        const playbook = await this.service.getPlaybook(playbookId);
        if (!playbook) {
            return { ok: false, message: `Playbook '${playbookId}' was not found.` };
        }
        const prompt = String(context.input.prompt ?? context.state.prompt ?? '').trim();
        const workflow = this.playbookToFlowWorkflow(playbook, prompt);
        const draft: FlowAiAuthoringDraft = {
            version: FLOW_AI_AUTHORING_SPEC_VERSION,
            action: 'create_workflow',
            confidence: 1,
            reason: `Compiled from CyberVinci Playbook '${playbook.id}'.`,
            promptMarkdown: prompt || playbook.description || playbook.name,
            workflow
        };
        return {
            ok: true,
            value: { draft, workflow },
            message: `Compiled Playbook '${playbook.id}' to flow.ai-authoring/v1 draft.`
        };
    }

    protected async createFlowFromPlaybook(context: CyberVinciHostToolExecutionContext): Promise<CyberVinciHostToolExecutionResult> {
        if (!this.flowService) {
            return { ok: false, message: 'Flow service is not available.' };
        }
        const compiled = await this.compilePlaybookToFlowDraft(context);
        const value = compiled.value as { draft?: FlowAiAuthoringDraft } | undefined;
        if (!compiled.ok || !value?.draft) {
            return compiled;
        }
        const workflow = await this.flowService.createWorkflowFromAiAuthoringDraft({
            workspaceRootUri: await this.resolveWorkspaceRootUri(context),
            draft: value.draft
        });
        return {
            ok: true,
            value: { workflow, draft: value.draft },
            message: `Created Flow workflow '${workflow.id}' from Playbook.`
        };
    }

    protected async executeCommandTool(toolId: string, context: CyberVinciHostToolExecutionContext): Promise<CyberVinciHostToolExecutionResult> {
        try {
            const tool = await this.getTool(toolId);
            if (tool?.shell && tool.policy?.allowShell !== true) {
                return {
                    ok: false,
                    message: `Declarative tool '${toolId}' requests shell execution but policy.allowShell is not enabled.`
                };
            }
            const result = await this.service.executeDeclarativeTool(toolId, JSON.stringify({
                input: context.input,
                state: context.state,
                requestId: context.requestId,
                playbookId: context.playbookId,
                stateId: context.stateId
            }));
            return {
                ok: result.exitCode === 0 || result.exitCode === null,
                value: result.stdout,
                message: result.stderr || result.stdout,
                diagnostics: result.stderr ? [result.stderr] : undefined
            };
        } catch (error) {
            return {
                ok: false,
                message: error instanceof Error ? error.message : String(error)
            };
        }
    }

    protected async executeCompositeTool(tool: CyberVinciToolDefinition, context: CyberVinciHostToolExecutionContext): Promise<CyberVinciHostToolExecutionResult> {
        const steps = tool.steps ?? [];
        if (!steps.length) {
            return { ok: false, message: `Composite tool '${tool.id}' does not define steps.` };
        }
        const results: Array<{ id: string; tool: string; ok: boolean; message?: string; value?: unknown }> = [];
        const localState = context.state;
        for (const [index, step] of steps.entries()) {
            const stepId = step.id ?? `step-${index + 1}`;
            const args = this.resolveToolArgs(step.args ?? {}, {
                ...context,
                state: localState
            });
            const result = await this.executeTool(step.tool, {
                ...context,
                state: localState,
                stateId: `${context.stateId ?? tool.id}:${stepId}`,
                input: {
                    ...context.input,
                    ...args
                }
            });
            if (step.saveAs) {
                localState[step.saveAs] = result.value ?? result.message ?? result.ok;
            }
            results.push({
                id: stepId,
                tool: step.tool,
                ok: result.ok,
                message: result.message,
                value: result.value
            });
            if (!result.ok && step.stopOnFail !== false) {
                return {
                    ok: false,
                    value: { results },
                    message: result.message ?? `Composite tool '${tool.id}' stopped at '${stepId}'.`,
                    diagnostics: result.diagnostics
                };
            }
            if (result.stop) {
                return {
                    ok: result.ok,
                    stop: true,
                    value: { results },
                    message: result.message
                };
            }
        }
        return {
            ok: true,
            value: { results },
            message: `Composite tool '${tool.id}' completed ${results.length} step(s).`
        };
    }

    protected async executeTheiaTool(toolId: string, context: CyberVinciHostToolExecutionContext): Promise<CyberVinciHostToolExecutionResult> {
        if (!toolId) {
            return { ok: false, message: 'Theia toolId is required.' };
        }
        const tool = this.toolInvocationRegistry?.getFunction(toolId);
        if (!tool) {
            return { ok: false, message: `Theia tool '${toolId}' is not registered.` };
        }
        try {
            const args = this.readTheiaToolArgs(context);
            const result = await tool.handler(args, this.createTheiaToolContext(context, tool));
            const hasError = this.hasToolCallError(result);
            return {
                ok: !hasError,
                value: result,
                message: this.stringifyToolResult(result),
                diagnostics: hasError ? [this.stringifyToolResult(result)] : undefined
            };
        } catch (error) {
            return {
                ok: false,
                message: error instanceof Error ? error.message : String(error)
            };
        }
    }

    protected listTheiaTools(): CyberVinciHostToolExecutionResult {
        if (!this.toolInvocationRegistry) {
            return { ok: false, message: 'Theia ToolInvocationRegistry is not available.' };
        }
        return {
            ok: true,
            value: this.toolInvocationRegistry.getAllFunctions().map(tool => ({
                id: tool.id,
                name: tool.name,
                providerName: tool.providerName,
                description: tool.description,
                parameters: tool.parameters,
                confirmAlwaysAllow: tool.confirmAlwaysAllow
            }))
        };
    }

    protected readTheiaToolArgs(context: CyberVinciHostToolExecutionContext): string {
        const explicitArgs = context.input.args ?? context.input.argString ?? context.input.arguments;
        if (typeof explicitArgs === 'string') {
            return explicitArgs;
        }
        if (explicitArgs && typeof explicitArgs === 'object') {
            return JSON.stringify(explicitArgs);
        }
        const { toolId: _toolId, args: _args, argString: _argString, arguments: _arguments, ...input } = context.input;
        return JSON.stringify(input);
    }

    protected createTheiaToolContext(context: CyberVinciHostToolExecutionContext, tool: ToolRequest): ToolInvocationContext {
        const toolCallId = `${context.playbookId ?? 'playbook'}:${context.stateId ?? tool.id}:${Date.now().toString(36)}`;
        const request = this.asChatRequest(context.chatRequest);
        if (request) {
            return {
                request,
                toolCallId,
                cancellationToken: request.response.cancellationToken,
                rootSessionId: request.session.rootSessionId,
                get response() {
                    return request.response;
                }
            } as ToolInvocationContext;
        }
        return ToolInvocationContext.create(toolCallId);
    }

    protected asChatRequest(candidate: unknown): MutableChatRequestModel | undefined {
        if (candidate && typeof candidate === 'object' && 'response' in candidate && 'session' in candidate) {
            return candidate as MutableChatRequestModel;
        }
        return undefined;
    }

    protected hasToolCallError(result: unknown): boolean {
        return !!result && typeof result === 'object' && 'content' in result && Array.isArray((result as { content: unknown[] }).content)
            && (result as { content: unknown[] }).content.some(item => !!item && typeof item === 'object'
                && (item as { type?: unknown }).type === 'error');
    }

    protected stringifyToolResult(result: unknown): string {
        if (result === undefined) {
            return '';
        }
        if (typeof result === 'string') {
            return result;
        }
        try {
            return JSON.stringify(result);
        } catch {
            return String(result);
        }
    }

    protected async setPreference(context: CyberVinciHostToolExecutionContext): Promise<CyberVinciHostToolExecutionResult> {
        const key = String(context.input.key ?? '');
        if (!key) {
            return { ok: false, message: 'Preference key is required.' };
        }
        await this.preferenceService.set(key, context.input.value);
        return { ok: true, value: { key, value: context.input.value } };
    }

    protected async listFlowWorkflows(context: CyberVinciHostToolExecutionContext): Promise<CyberVinciHostToolExecutionResult> {
        if (!this.flowService) {
            return { ok: false, message: 'Flow service is not available.' };
        }
        const workflows = await this.flowService.listWorkflows({ workspaceRootUri: await this.resolveWorkspaceRootUri(context) });
        return { ok: true, value: workflows };
    }

    protected async listPendingFlowGates(context: CyberVinciHostToolExecutionContext): Promise<CyberVinciHostToolExecutionResult> {
        if (!this.flowService) {
            return { ok: false, message: 'Flow service is not available.' };
        }
        const runId = String(context.input.runId ?? context.input.id ?? '').trim();
        if (!runId) {
            return { ok: false, message: 'Flow runId is required.' };
        }
        const run = await this.flowService.getRun({
            workspaceRootUri: await this.resolveWorkspaceRootUri(context),
            runId
        });
        const pendingGates = (run.gates || []).filter(gate => gate.status === 'pending');
        return {
            ok: true,
            value: {
                runId: run.id,
                workflowId: run.workflowId,
                status: run.status,
                pendingGates
            },
            message: pendingGates.length
                ? `Flow run '${run.id}' is waiting for ${pendingGates.length} gate decision(s).`
                : `Flow run '${run.id}' has no pending gates.`
        };
    }

    protected async approveFlowGate(context: CyberVinciHostToolExecutionContext): Promise<CyberVinciHostToolExecutionResult> {
        if (!this.flowService) {
            return { ok: false, message: 'Flow service is not available.' };
        }
        const runId = String(context.input.runId ?? context.input.id ?? '').trim();
        const gateId = String(context.input.gateId ?? context.input.gate ?? '').trim();
        if (!runId || !gateId) {
            return { ok: false, message: 'Flow runId and gateId are required.' };
        }
        const decision = normalizeFlowGateDecision(context.input.decision ?? context.input.status ?? context.input.outcome);
        const run = await this.flowService.approveGate({
            workspaceRootUri: await this.resolveWorkspaceRootUri(context),
            runId,
            gateId,
            decision,
            decisionId: toOptionalString(context.input.decisionId),
            targetStateId: toOptionalString(context.input.targetStateId ?? context.input.to),
            note: toOptionalString(context.input.note),
            approvedBy: 'AI Chat'
        });
        return {
            ok: true,
            stop: run.status === 'completed' || run.status === 'failed' || run.status === 'cancelled',
            value: run,
            message: `Flow gate '${gateId}' decided as '${decision}'. Run status: ${run.status}.`
        };
    }

    protected async startFlowRun(context: CyberVinciHostToolExecutionContext): Promise<CyberVinciHostToolExecutionResult> {
        const workflowId = String(context.input.workflowId ?? context.input.flowId ?? '').trim();
        const prompt = String(context.input.prompt ?? '').trim();
        if (!workflowId) {
            return { ok: false, message: 'Flow workflowId is required.' };
        }
        if (!prompt) {
            return { ok: false, message: 'Flow prompt is required.' };
        }
        if (this.flowService) {
            const run = await this.flowService.startRun({
                workspaceRootUri: await this.resolveWorkspaceRootUri(context),
                workflowId,
                prompt
            });
            return { ok: true, stop: true, value: run, message: `Started Flow run '${run.id}'.` };
        }
        await this.commandService.executeCommand(FLOW_START_WORKFLOW_COMMAND, { workflowId, prompt });
        return { ok: true, stop: true, value: { workflowId, prompt } };
    }

    protected async runDynamicWorkflow(context: CyberVinciHostToolExecutionContext): Promise<CyberVinciHostToolExecutionResult> {
        const prompt = String(context.input.prompt ?? '').trim();
        if (!prompt) {
            return { ok: false, message: 'Dynamic workflow prompt is required.' };
        }
        const preferSaved = context.input.preferSaved !== false;
        if (context.input.aiAuthoring !== false && this.flowService && this.aiRuntime) {
            return this.runAiAuthoredDynamicWorkflow(context);
        }
        if (this.flowService) {
            const run = await this.flowService.runDynamicWorkflow({
                workspaceRootUri: await this.resolveWorkspaceRootUri(context),
                prompt,
                preferSaved
            });
            return { ok: true, stop: true, value: run, message: `Started dynamic Flow run '${run.id}'.` };
        }
        await this.commandService.executeCommand(FLOW_RUN_DYNAMIC_WORKFLOW_COMMAND, { prompt, preferSaved });
        return { ok: true, stop: true, value: { prompt, preferSaved } };
    }

    protected async runAiAuthoringDraft(context: CyberVinciHostToolExecutionContext): Promise<CyberVinciHostToolExecutionResult> {
        const prompt = String(context.input.prompt ?? '').trim();
        const authoringDraft = context.input.authoringDraft ?? context.input.draft;
        if (!prompt) {
            return { ok: false, message: 'AI authoring draft prompt is required.' };
        }
        if (!authoringDraft || typeof authoringDraft !== 'object') {
            return { ok: false, message: 'AI authoring draft is required. Use flow.ai-authoring/v1 output as authoringDraft.' };
        }
        if (!this.flowService) {
            return { ok: false, message: 'Flow service is not available.' };
        }
        const run = await this.flowService.runDynamicWorkflow({
            workspaceRootUri: await this.resolveWorkspaceRootUri(context),
            prompt,
            preferSaved: context.input.preferSaved !== false,
            authoringDraft: authoringDraft as never
        });
        return { ok: true, stop: true, value: run, message: `Started AI-authored Flow run '${run.id}'.` };
    }

    protected async runAiAuthoredDynamicWorkflow(context: CyberVinciHostToolExecutionContext): Promise<CyberVinciHostToolExecutionResult> {
        const prompt = String(context.input.prompt ?? '').trim();
        if (!prompt) {
            return { ok: false, message: 'AI-authored dynamic workflow prompt is required.' };
        }
        if (!this.flowService) {
            return { ok: false, message: 'Flow service is not available.' };
        }
        if (!this.aiRuntime) {
            return this.runDynamicWorkflow({
                ...context,
                input: {
                    ...context.input,
                    aiAuthoring: false
                }
            });
        }
        const workspaceRootUri = await this.resolveWorkspaceRootUri(context);
        const workspacePath = await this.resolveWorkspacePath(context);
        const [
            authoringSpec,
            workflows,
            workflowPatterns,
            modelProfiles,
            pipelinePresets,
            aiProviders,
            capabilities
        ] = await Promise.all([
            this.flowService.getAiAuthoringSpec(),
            this.flowService.listWorkflows({ workspaceRootUri }),
            this.flowService.listWorkflowPatterns(),
            this.flowService.listModelProfiles(),
            this.flowService.listPipelinePresets({ workspaceRootUri }),
            this.aiRuntime.listProviders({ workspacePath, includeUnavailable: true }),
            this.flowService.getCapabilities()
        ]);
        const activeWorkflowId = String(context.input.activeWorkflowId ?? '').trim();
        const activeWorkflow = activeWorkflowId
            ? workflows.find(workflow => workflow.id === activeWorkflowId)
            : workflows[0];
        const input: FlowAiAuthoringRuntimeInput = {
            authoringSpec,
            activeWorkflow: activeWorkflow ? redactFlowSecretsValue(activeWorkflow) : undefined,
            workflowSummaries: workflows.map(workflow => this.toFlowWorkflowSummaryForAi(workflow)),
            workflowPatterns,
            modelProfiles,
            pipelinePresets,
            aiProviders,
            languageModels: this.toLanguageModelOptions(aiProviders),
            capabilities,
            selectedPatternId: typeof context.input.selectedPatternId === 'string' ? context.input.selectedPatternId : undefined,
            selectedPipelinePresetId: typeof context.input.selectedPipelinePresetId === 'string' ? context.input.selectedPipelinePresetId : undefined
        };
        const execution = this.readAiExecutionSelection(context);
        const result = await this.aiRuntime.runTask<FlowAiAuthoringRuntimeInput, FlowAiAuthoringDraft>({
            surfaceId: 'ai-chat',
            action: 'flow.authorWorkflow',
            workspacePath,
            sessionId: context.requestId,
            userPrompt: prompt,
            systemPrompt: authoringSpec.systemPrompt,
            input,
            context: {
                mode: 'memory-if-available',
                maxItems: 8,
                tokenBudget: 1600
            },
            output: {
                mode: 'json',
                schemaName: 'FlowAiAuthoringDraft',
                schema: authoringSpec.outputSchema,
                instructions: 'Return exactly one FlowAiAuthoringDraft. Use ask_user only when required information is missing.'
            },
            effectPolicy: {
                previewOnly: false,
                workspaceWrites: 'allow-with-approval',
                shellExecution: 'forbidden',
                requireUserConfirmation: true
            },
            execution: {
                ...execution,
                collaborationMode: execution.collaborationMode ?? 'default'
            }
        });
        const draft = this.coerceFlowAiAuthoringDraft(result.structured);
        if (draft.action === 'ask_user') {
            const question = draft.questionMarkdown || draft.reason || 'Flow AI needs more detail before it can build the workflow.';
            return {
                ok: true,
                stop: true,
                value: { draft, provider: result.provider, execution: result.execution },
                message: question
            };
        }
        const run = await this.flowService.runDynamicWorkflow({
            workspaceRootUri,
            prompt,
            preferSaved: context.input.preferSaved !== false,
            authoringDraft: draft
        });
        return {
            ok: true,
            stop: true,
            value: {
                run,
                draft,
                provider: result.provider,
                execution: result.execution,
                diagnostics: result.diagnostics
            },
            diagnostics: result.diagnostics,
            message: `Started AI-authored Flow run '${run.id}'.`
        };
    }

    protected async createWorkflowFromAiAuthoringDraft(context: CyberVinciHostToolExecutionContext): Promise<CyberVinciHostToolExecutionResult> {
        const draft = context.input.authoringDraft ?? context.input.draft;
        if (!draft || typeof draft !== 'object') {
            return { ok: false, message: 'AI authoring draft is required. Use flow.ai-authoring/v1 output as draft.' };
        }
        if (!this.flowService) {
            return { ok: false, message: 'Flow service is not available.' };
        }
        const workflow = await this.flowService.createWorkflowFromAiAuthoringDraft({
            workspaceRootUri: await this.resolveWorkspaceRootUri(context),
            draft: draft as never
        });
        return { ok: true, value: workflow, message: `Created Flow workflow '${workflow.id}' from AI authoring draft.` };
    }

    protected async getFlowAiAuthoringSpec(): Promise<CyberVinciHostToolExecutionResult> {
        if (!this.flowService) {
            return { ok: false, message: 'Flow service is not available.' };
        }
        return { ok: true, value: await this.flowService.getAiAuthoringSpec() };
    }

    protected async searchMemoryContext(context: CyberVinciHostToolExecutionContext): Promise<CyberVinciHostToolExecutionResult> {
        if (!this.memoryService) {
            return { ok: false, message: 'Memory service is not available.' };
        }
        const workspacePath = await this.resolveWorkspacePath(context);
        if (!workspacePath) {
            return { ok: false, message: 'Workspace path is required for Memory context search.' };
        }
        const text = String(context.input.query ?? context.input.text ?? context.input.prompt ?? '').trim();
        if (!text) {
            return { ok: false, message: 'Memory search query is required.' };
        }
        const limit = this.readNumberInput(context.input.limit, 8);
        const sourceKinds = this.readStringArray(context.input.sourceKinds) as MemorySourceKind[] | undefined;
        const retrievalResults = await this.memoryService.search({
            workspacePath,
            text,
            limit,
            sourceKinds,
            sessionId: typeof context.input.sessionId === 'string' ? context.input.sessionId : undefined,
            taskId: typeof context.input.taskId === 'string' ? context.input.taskId : undefined
        });
        const tokenBudget = this.readNumberInput(context.input.tokenBudget, 1600);
        const contextPack = context.input.buildContextPack === false
            ? undefined
            : await this.memoryService.buildContextPack({
                workspacePath,
                prompt: text,
                retrievalResults,
                tokenBudget
            });
        return {
            ok: true,
            value: { retrievalResults, contextPack },
            message: `Memory returned ${retrievalResults.length} retrieval result(s).`
        };
    }

    protected async proposeMemoryCandidate(context: CyberVinciHostToolExecutionContext): Promise<CyberVinciHostToolExecutionResult> {
        if (!this.memoryService) {
            return { ok: false, message: 'Memory service is not available.' };
        }
        const workspacePath = await this.resolveWorkspacePath(context);
        if (!workspacePath) {
            return { ok: false, message: 'Workspace path is required for Memory candidate proposal.' };
        }
        const text = String(context.input.text ?? context.input.content ?? context.input.prompt ?? '').trim();
        if (!text) {
            return { ok: false, message: 'Memory candidate text is required.' };
        }
        const result = await this.memoryService.proposeMemoryCandidate({
            workspacePath,
            text,
            source: typeof context.input.source === 'string' ? context.input.source : 'ai-chat-playbook',
            evidence: typeof context.input.evidence === 'string' ? context.input.evidence : `Playbook ${context.playbookId ?? 'unknown'} state ${context.stateId ?? 'unknown'}.`,
            eventId: typeof context.input.eventId === 'string' ? context.input.eventId : undefined,
            relativePath: typeof context.input.relativePath === 'string' ? context.input.relativePath : undefined,
            maxCandidates: this.readNumberInput(context.input.maxCandidates, 3)
        });
        return {
            ok: true,
            value: result,
            message: `Memory proposed ${result.candidates.length} candidate(s), ${result.created} created.`
        };
    }

    protected async requestMemoryWriteApproval(context: CyberVinciHostToolExecutionContext): Promise<CyberVinciHostToolExecutionResult> {
        const content = String(context.input.content ?? context.input.text ?? context.input.prompt ?? '').trim();
        if (!content) {
            return { ok: false, message: 'Memory write content is required.' };
        }
        if (!this.quickPickService) {
            return {
                ok: false,
                value: { approvalRequired: true, content },
                message: 'Memory write approval UI is not available.'
            };
        }
        const picked = await this.quickPickService.show<QuickPickItem & { decision: 'approve' | 'reject' }>([
            {
                label: 'Approve Memory Write',
                description: this.readMemoryTitle(context.input, content),
                detail: content,
                decision: 'approve'
            },
            {
                label: 'Reject Memory Write',
                description: 'Do not persist this candidate.',
                detail: content,
                decision: 'reject'
            }
        ], {
            title: 'CyberVinci Memory Approval',
            placeholder: 'Approve this Playbook memory write?'
        });
        if (!picked) {
            return { ok: false, message: 'Memory write approval was cancelled.' };
        }
        if (picked.decision !== 'approve') {
            return { ok: true, value: { status: 'rejected', content }, message: 'Memory write rejected.' };
        }
        return this.writeApprovedMemory({
            ...context,
            input: {
                ...context.input,
                approved: true
            }
        });
    }

    protected async writeApprovedMemory(context: CyberVinciHostToolExecutionContext): Promise<CyberVinciHostToolExecutionResult> {
        if (!this.memoryService) {
            return { ok: false, message: 'Memory service is not available.' };
        }
        if (context.input.approved !== true) {
            return { ok: false, message: 'Memory writes require explicit approved=true.' };
        }
        const content = String(context.input.content ?? context.input.text ?? context.input.prompt ?? '').trim();
        if (!content) {
            return { ok: false, message: 'Memory write content is required.' };
        }
        const workspacePath = await this.resolveWorkspacePath(context);
        const scope = this.readMemoryScope(context.input.scope);
        if (scope === 'workspace' && !workspacePath) {
            return { ok: false, message: 'Workspace path is required for workspace-scoped Memory writes.' };
        }
        const memory = await this.memoryService.addMemory({
            scope,
            workspacePath: scope === 'workspace' ? workspacePath : undefined,
            memoryType: this.readMemoryType(context.input.memoryType),
            title: this.readMemoryTitle(context.input, content),
            content,
            source: typeof context.input.source === 'string' ? context.input.source : 'ai-chat-playbook',
            evidence: typeof context.input.evidence === 'string' ? context.input.evidence : `Approved from Playbook ${context.playbookId ?? 'unknown'} state ${context.stateId ?? 'unknown'}.`,
            taskId: typeof context.input.taskId === 'string' ? context.input.taskId : undefined,
            sessionId: typeof context.input.sessionId === 'string' ? context.input.sessionId : undefined
        });
        return {
            ok: true,
            value: memory,
            message: `Memory '${memory.title}' written.`
        };
    }

    protected async mcpHasServer(context: CyberVinciHostToolExecutionContext): Promise<CyberVinciHostToolExecutionResult> {
        const name = this.readMcpServerName(context);
        if (!name) {
            return { ok: false, message: 'MCP server name is required.' };
        }
        if (!this.mcpService) {
            return { ok: false, message: 'MCP frontend service is not available.' };
        }
        const configured = await this.mcpService.hasServer(name);
        return { ok: configured, value: { name, configured }, message: configured ? undefined : `MCP server '${name}' is not configured.` };
    }

    protected async mcpIsServerStarted(context: CyberVinciHostToolExecutionContext): Promise<CyberVinciHostToolExecutionResult> {
        const name = this.readMcpServerName(context);
        if (!name) {
            return { ok: false, message: 'MCP server name is required.' };
        }
        if (!this.mcpService) {
            return { ok: false, message: 'MCP frontend service is not available.' };
        }
        const started = await this.mcpService.isServerStarted(name);
        return { ok: started, value: { name, started }, message: started ? undefined : `MCP server '${name}' is not running.` };
    }

    protected async mcpConfigureServers(context: CyberVinciHostToolExecutionContext, start: boolean): Promise<CyberVinciHostToolExecutionResult> {
        if (!this.mcpService) {
            return { ok: false, message: 'MCP frontend service is not available.' };
        }
        const servers = this.readMcpServers(context);
        if (!servers.length) {
            return { ok: false, message: 'At least one MCP server definition is required.' };
        }
        const configured: string[] = [];
        const started: string[] = [];
        for (const server of servers) {
            if (!server.name) {
                return { ok: false, message: 'Every MCP server definition must include a name.' };
            }
            if (!(await this.mcpService.hasServer(server.name))) {
                const currentServers = this.preferenceService.get<Record<string, MCPServerDescription>>(MCP_SERVERS_PREF, {});
                const { name, ...serverWithoutName } = server;
                await this.preferenceService.set(MCP_SERVERS_PREF, { ...currentServers, [name]: serverWithoutName }, PreferenceScope.User);
                await this.mcpService.addOrUpdateServer(server);
                configured.push(server.name);
            }
            if (start && !(await this.mcpService.isServerStarted(server.name))) {
                await this.mcpService.startServer(server.name);
                started.push(server.name);
            }
        }
        return {
            ok: true,
            value: { configured, started },
            message: start
                ? `MCP servers ready: ${servers.map(server => server.name).join(', ')}.`
                : `MCP servers configured: ${servers.map(server => server.name).join(', ')}.`
        };
    }

    protected readMcpServerName(context: CyberVinciHostToolExecutionContext): string {
        const server = context.input.server;
        const serverName = server && typeof server === 'object' && 'name' in server
            ? (server as { name?: unknown }).name
            : undefined;
        return String(context.input.name ?? context.input.serverName ?? serverName ?? '').trim();
    }

    protected readMcpServers(context: CyberVinciHostToolExecutionContext): MCPServerDescription[] {
        const servers = context.input.servers;
        if (Array.isArray(servers)) {
            return servers.filter(server => !!server && typeof server === 'object') as MCPServerDescription[];
        }
        const server = context.input.server;
        if (server && typeof server === 'object') {
            return [server as MCPServerDescription];
        }
        const name = this.readMcpServerName(context);
        return name ? [{ name } as MCPServerDescription] : [];
    }

    protected captureCanvasDocument(context: CyberVinciHostToolExecutionContext): CyberVinciHostToolExecutionResult {
        const sessionResult = this.getCanvasSession(context);
        if (!this.isCanvasSessionResult(sessionResult)) {
            return sessionResult;
        }
        const session = sessionResult.session;
        const document = session.getDocument();
        if (!document) {
            return { ok: false, message: 'Canvas document is not loaded.' };
        }
        const page = this.getActiveCanvasPage(document);
        const summary = this.summarizeCanvasDocument(document, page);
        return {
            ok: true,
            value: {
                uri: session.uri.toString(),
                document: this.cloneJson(document),
                selection: session.getSelection(),
                summary
            }
        };
    }

    protected captureCanvasVisualSnapshot(context: CyberVinciHostToolExecutionContext): CyberVinciHostToolExecutionResult {
        const sessionResult = this.getCanvasSession(context);
        if (!this.isCanvasSessionResult(sessionResult)) {
            return sessionResult;
        }
        const widget = this.getActiveCanvasWidget(sessionResult.session.uri);
        const svg = widget?.node?.querySelector('svg');
        if (!svg) {
            return {
                ok: false,
                message: 'Canvas SVG viewport was not found for the active design widget.'
            };
        }
        const bounds = svg.getBoundingClientRect();
        return {
            ok: true,
            value: {
                kind: 'svg-snapshot',
                uri: sessionResult.session.uri.toString(),
                bounds: {
                    x: bounds.x,
                    y: bounds.y,
                    width: bounds.width,
                    height: bounds.height
                },
                svg: svg.outerHTML
            }
        };
    }

    protected collectCanvasLayoutDiagnostics(
        context: CyberVinciHostToolExecutionContext,
        categories?: CyberVinciCanvasDiagnostic['category'][]
    ): CyberVinciHostToolExecutionResult {
        const sessionResult = this.getCanvasSession(context);
        if (!this.isCanvasSessionResult(sessionResult)) {
            return sessionResult;
        }
        const document = sessionResult.session.getDocument();
        if (!document) {
            return { ok: false, message: 'Canvas document is not loaded.' };
        }
        const diagnostics = this.computeCanvasDiagnostics(document, categories);
        const errors = diagnostics.filter(diagnostic => diagnostic.severity === 'error');
        return {
            ok: errors.length === 0,
            value: {
                uri: sessionResult.session.uri.toString(),
                diagnostics,
                summary: this.summarizeCanvasDocument(document, this.getActiveCanvasPage(document))
            },
            diagnostics: diagnostics.map(diagnostic => diagnostic.message),
            message: diagnostics.length
                ? `${diagnostics.length} Canvas diagnostic(s) found.`
                : 'No Canvas layout diagnostics found.'
        };
    }

    protected async applyCanvasOperations(context: CyberVinciHostToolExecutionContext): Promise<CyberVinciHostToolExecutionResult> {
        const sessionResult = this.getCanvasSession(context);
        if (!this.isCanvasSessionResult(sessionResult)) {
            return sessionResult;
        }
        const operations = this.readCanvasOperations(context);
        if (!operations.length) {
            return { ok: false, message: 'Canvas operations are required.' };
        }
        const document = sessionResult.session.getDocument();
        const selection = sessionResult.session.getSelection();
        const stabilized = document && this.openPencilDesignCommandService
            ? this.openPencilDesignCommandService.stabilizeAiOperationsForDocument(
                document,
                selection,
                operations,
                this.readCanvasApplyOptions(context)
            )
            : { operations, diagnostics: [], skipped: 0, reordered: false, skippedOperations: [] };
        const results = [];
        for (const operation of stabilized.operations) {
            results.push(await sessionResult.session.applyOperation(operation));
        }
        const failures = results.filter(result => !result.changed && result.message);
        return {
            ok: failures.length === 0,
            value: {
                applied: results.length,
                requested: operations.length,
                skipped: stabilized.skipped,
                reordered: stabilized.reordered,
                diagnostics: stabilized.diagnostics,
                results
            },
            diagnostics: stabilized.diagnostics,
            message: failures[0]?.message ?? `Applied ${results.length} Canvas operation(s).`
        };
    }

    protected async resizeCanvasNodesToFit(context: CyberVinciHostToolExecutionContext): Promise<CyberVinciHostToolExecutionResult> {
        const sessionResult = this.getCanvasSession(context);
        if (!this.isCanvasSessionResult(sessionResult)) {
            return sessionResult;
        }
        const document = sessionResult.session.getDocument();
        if (!document) {
            return { ok: false, message: 'Canvas document is not loaded.' };
        }
        const operations = this.createResizeToFitOperations(document);
        if (context.input.apply === false) {
            return { ok: true, value: { operations }, message: `${operations.length} resize operation(s) suggested.` };
        }
        if (!operations.length) {
            return { ok: true, value: { operations }, message: 'No resize-to-fit operations were needed.' };
        }
        return this.applyCanvasOperations({
            ...context,
            input: {
                ...context.input,
                operations
            }
        });
    }

    protected async reorderCanvasLayers(context: CyberVinciHostToolExecutionContext): Promise<CyberVinciHostToolExecutionResult> {
        const operationName = String(context.input.operation ?? context.input.layerOperation ?? '').trim();
        const nodeId = String(context.input.nodeId ?? '').trim();
        const operations = this.readCanvasOperations(context);
        if (!operations.length && operationName && nodeId) {
            operations.push({ operation: operationName, nodeId } as OpenPencilDesignOperation);
        }
        if (!operations.length) {
            return { ok: false, message: 'Layer reorder requires operations or operation/nodeId.' };
        }
        return this.applyCanvasOperations({
            ...context,
            input: {
                ...context.input,
                operations
            }
        });
    }

    protected getCanvasKnownSiteReference(context: CyberVinciHostToolExecutionContext): CyberVinciHostToolExecutionResult {
        const prompt = String(context.input.prompt ?? context.state.prompt ?? '').toLowerCase();
        const site = String(context.input.site ?? '').toLowerCase();
        const key = site || prompt;
        const references: Array<{ match: RegExp; site: string; modules: string[]; notes: string[] }> = [
            {
                match: /\bamazon\b|\bsaara\b/,
                site: 'Amazon-style marketplace homepage',
                modules: ['global header', 'logo', 'delivery/location area', 'search input with submit button', 'account/orders/cart nav', 'category nav', 'hero/deal region', 'product/category cards', 'support/service strips', 'multi-column footer'],
                notes: ['Search must remain an input/button row, not oversized cards.', 'Complete clone requests should include footer and multiple body modules.']
            },
            {
                match: /\bmercado\s*livre\b|\bmercado\s*privado\b|\bmercado\s*regulado\b/,
                site: 'Mercado Livre-style marketplace homepage',
                modules: ['yellow header', 'logo', 'large search bar', 'location row', 'navigation links', 'promo hero', 'payments/benefits row', 'product/deal cards', 'footer'],
                notes: ['Keep a centered marketplace feed with explicit card widths and no placeholder-only content.']
            }
        ];
        const reference = references.find(item => item.match.test(key));
        if (!reference) {
            return {
                ok: false,
                message: 'No built-in known-site reference matched the prompt/site.',
                value: { prompt: context.input.prompt, site: context.input.site }
            };
        }
        return { ok: true, value: reference, message: `Matched ${reference.site}.` };
    }

    protected async runVisionJudge(context: CyberVinciHostToolExecutionContext): Promise<CyberVinciHostToolExecutionResult> {
        if (context.input.enabled === false) {
            return { ok: true, value: { skipped: true, reason: 'Vision Judge disabled for this run.' } };
        }
        const visionJudgeMode = String(context.input.visionJudgeMode ?? context.input.mode ?? '').trim().toLowerCase();
        const prompt = String(context.input.prompt ?? context.state.prompt ?? context.input.userPrompt ?? '').trim();
        if (visionJudgeMode === 'deterministic' || context.input.deterministic === true) {
            return this.runDeterministicVisionJudge(context, prompt, 'Deterministic Vision Judge mode was requested.');
        }
        if (!this.aiRuntime) {
            return this.runDeterministicVisionJudge(context, prompt, 'CyberVinci AI Runtime service is not available.');
        }
        const workspacePath = await this.resolveWorkspacePath(context);
        const documentResult = this.captureCanvasDocument(context);
        const snapshotResult = this.captureCanvasVisualSnapshot(context);
        const diagnosticsResult = this.collectCanvasLayoutDiagnostics(context);
        const knownReferenceResult = this.getCanvasKnownSiteReference(context);
        const visualSnapshot = this.readResultRecord(snapshotResult);
        const documentCapture = this.readResultRecord(documentResult);
        const layoutDiagnostics = this.readResultRecord(diagnosticsResult);
        const knownReference = knownReferenceResult.ok ? knownReferenceResult.value : undefined;
        const explicitReference = context.input.reference ?? context.input.referenceUrl ?? context.input.referenceImage;
        const inputItems = await this.visionJudgeInputItems(context, visualSnapshot);
        const input = {
            prompt,
            requestedOutcome: context.input.requestedOutcome ?? context.input.acceptanceCriteria,
            reference: explicitReference ?? knownReference,
            document: documentCapture?.summary ? { summary: documentCapture.summary, selection: documentCapture.selection } : documentCapture,
            layoutDiagnostics,
            visualSnapshot: visualSnapshot
                ? {
                    kind: visualSnapshot.kind,
                    uri: visualSnapshot.uri,
                    bounds: visualSnapshot.bounds,
                    svgLength: typeof visualSnapshot.svg === 'string' ? visualSnapshot.svg.length : undefined
                }
                : undefined
        };
        const result = await this.aiRuntime.runTask<typeof input, {
            passed?: boolean;
            score?: number;
            summary?: string;
            issues?: Array<{ severity?: string; message?: string; nodeId?: string; recommendation?: string }>;
            suggestedOperations?: unknown[];
            needsRepair?: boolean;
        }>({
            surfaceId: 'ai-chat',
            action: 'vision.judge',
            workspacePath,
            sessionId: context.requestId,
            userPrompt: prompt || 'Judge whether the current Canvas output matches the requested design.',
            systemPrompt: [
                'You are CyberVinci Vision Judge.',
                'Evaluate whether the current Canvas/design output actually satisfies the user request.',
                'Compare the visual snapshot, Canvas document summary, deterministic layout diagnostics, and any known-site/reference guidance.',
                'Focus on visible delivery: missing requested modules, bad clone fidelity, broken search bars, oversized controls, incoherent overlaps, clipping, off-canvas elements, missing footer, and wrong visual hierarchy.',
                'Do not propose unrelated redesigns. When repair is needed, suggest concise Canvas operations or concrete layout changes.',
                'Return only the JSON object requested by the schema.'
            ].join('\n'),
            input,
            inputItems,
            output: {
                mode: 'json',
                schemaName: 'CyberVinciVisionJudgeResult',
                schema: {
                    type: 'object',
                    additionalProperties: true,
                    properties: {
                        passed: { type: 'boolean' },
                        score: { type: 'number', minimum: 0, maximum: 1 },
                        summary: { type: 'string' },
                        needsRepair: { type: 'boolean' },
                        issues: { type: 'array' },
                        suggestedOperations: { type: 'array' }
                    }
                },
                instructions: 'Return JSON with passed, score, summary, needsRepair, issues, and suggestedOperations. Set passed=false when the prompt was not visually delivered.'
            },
            effectPolicy: {
                previewOnly: true,
                workspaceWrites: 'forbidden',
                shellExecution: 'forbidden',
                requireUserConfirmation: false
            },
            execution: this.readVisionExecutionSelection(context)
        });
        const structured = result.structured ?? {};
        const passed = structured.passed === true || (structured.passed !== false && structured.needsRepair !== true && (structured.score ?? 1) >= 0.72);
        return {
            ok: passed,
            value: {
                ...structured,
                provider: result.provider,
                execution: result.execution,
                diagnostics: result.diagnostics
            },
            diagnostics: [
                ...(result.diagnostics || []),
                ...((structured.issues || [])
                    .map(issue => issue.message || issue.recommendation || '')
                    .filter(Boolean))
            ],
            message: structured.summary || (passed ? 'Vision Judge passed.' : 'Vision Judge found visual delivery issues.')
        };
    }

    protected runDeterministicVisionJudge(context: CyberVinciHostToolExecutionContext, prompt: string, reason: string): CyberVinciHostToolExecutionResult {
        const documentResult = this.captureCanvasDocument(context);
        if (!documentResult.ok) {
            return documentResult;
        }
        const documentCapture = this.readResultRecord(documentResult);
        const document = documentCapture?.document as OpenPencilDocument | undefined;
        if (!document) {
            return { ok: false, message: 'Canvas document capture did not include a document payload.' };
        }
        const diagnosticsResult = this.collectCanvasLayoutDiagnostics(context);
        const layoutDiagnostics = this.readResultRecord(diagnosticsResult);
        const diagnostics = Array.isArray(layoutDiagnostics?.diagnostics)
            ? layoutDiagnostics.diagnostics as CyberVinciCanvasDiagnostic[]
            : [];
        const knownReferenceResult = this.getCanvasKnownSiteReference(context);
        const suggestedOperations = this.createCanvasDiagnosticRepairOperations(document, diagnostics);
        const issues = diagnostics
            .filter(diagnostic => diagnostic.severity !== 'info')
            .map(diagnostic => ({
                severity: diagnostic.severity,
                message: diagnostic.message,
                nodeId: diagnostic.nodeId,
                recommendation: this.canvasDiagnosticRecommendation(diagnostic)
            }));
        const needsRepair = issues.length > 0;
        const score = needsRepair ? Math.max(0.2, 0.86 - Math.min(issues.length, 8) * 0.08) : 0.94;
        const knownReference = knownReferenceResult.ok ? knownReferenceResult.value : undefined;
        const summary = needsRepair
            ? `Deterministic Canvas QA found ${issues.length} issue(s) and suggested ${suggestedOperations.length} repair operation(s).`
            : 'Deterministic Canvas QA passed with no blocking layout diagnostics.';
        return {
            ok: !needsRepair,
            value: {
                passed: !needsRepair,
                score,
                summary,
                needsRepair,
                issues,
                suggestedOperations,
                deterministic: true,
                fallbackReason: reason,
                prompt,
                reference: knownReference,
                layoutDiagnostics
            },
            diagnostics: issues.map(issue => issue.message),
            message: summary
        };
    }

    protected createCanvasDiagnosticRepairOperations(
        document: OpenPencilDocument,
        diagnostics: CyberVinciCanvasDiagnostic[]
    ): OpenPencilDesignOperation[] {
        const page = this.getActiveCanvasPage(document);
        const pageWidth = typeof page.width === 'number' ? page.width : 900;
        const pageHeight = typeof page.height === 'number' ? page.height : 620;
        const boxes = this.flattenCanvasBoxes(page.children);
        const boxById = new Map(boxes.map(box => [box.id, box]));
        const updates = new Map<string, Partial<OpenPencilNode>>();
        const operations: OpenPencilDesignOperation[] = [];
        const addUpdate = (nodeId: string | undefined, changes: Partial<OpenPencilNode>) => {
            if (!nodeId || !Object.keys(changes).length) {
                return;
            }
            updates.set(nodeId, {
                ...(updates.get(nodeId) ?? {}),
                ...changes
            });
        };

        for (const operation of this.createResizeToFitOperations(document)) {
            if (operation.operation === 'updateNode') {
                addUpdate(operation.nodeId, operation.changes);
            } else {
                operations.push(operation);
            }
        }

        for (const diagnostic of diagnostics) {
            if (diagnostic.category === 'overlap') {
                const left = this.recordFromUnknown(diagnostic.details?.left) ?? boxById.get(diagnostic.nodeId ?? '');
                const right = this.recordFromUnknown(diagnostic.details?.right) ?? boxById.get(diagnostic.otherNodeId ?? '');
                const leftBox = this.coerceCanvasBox(left);
                const rightBox = this.coerceCanvasBox(right);
                const target = this.chooseOverlapRepairTarget(leftBox, rightBox);
                const anchor = target?.id === leftBox?.id ? rightBox : leftBox;
                if (target && anchor) {
                    const targetWidth = Math.min(Math.max(96, this.numberValue(target.width, 120)), Math.max(96, pageWidth * 0.18));
                    const targetHeight = Math.min(Math.max(32, this.numberValue(anchor.height, target.height)), 52);
                    const rightOfAnchor = this.numberValue(anchor.x, 0) + this.numberValue(anchor.width, 0) + 8;
                    const belowAnchor = this.numberValue(anchor.y, 0) + this.numberValue(anchor.height, 0) + 8;
                    const x = rightOfAnchor + targetWidth <= pageWidth
                        ? rightOfAnchor
                        : Math.max(0, Math.min(pageWidth - targetWidth, this.numberValue(target.x, 0)));
                    const y = rightOfAnchor + targetWidth <= pageWidth
                        ? this.numberValue(anchor.y, this.numberValue(target.y, 0))
                        : Math.min(Math.max(0, belowAnchor), Math.max(0, pageHeight - targetHeight));
                    addUpdate(target.id, {
                        x,
                        y,
                        width: targetWidth,
                        height: targetHeight
                    });
                }
            }
        }

        if (diagnostics.some(diagnostic => diagnostic.category === 'footer' || (diagnostic.category === 'clone-completeness' && diagnostic.details?.missing === 'footer'))) {
            operations.push(this.createCanvasFooterOperation(document));
        }
        if (diagnostics.some(diagnostic => diagnostic.category === 'clone-completeness' && diagnostic.details?.missing === 'cart')) {
            operations.push(this.createCanvasCartOperation(document));
        }

        operations.unshift(...[...updates.entries()].map(([nodeId, changes]) => ({
            operation: 'updateNode',
            nodeId,
            changes
        } as OpenPencilDesignOperation)));

        const seen = new Set<string>();
        return operations.filter(operation => {
            const key = JSON.stringify(operation);
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    protected chooseOverlapRepairTarget(
        left: CyberVinciCanvasNodeBox | undefined,
        right: CyberVinciCanvasNodeBox | undefined
    ): CyberVinciCanvasNodeBox | undefined {
        const candidates = [left, right].filter((box): box is CyberVinciCanvasNodeBox => !!box);
        const editableCandidates = candidates.filter(box => !this.isCanvasStructuralContainerBox(box));
        const prioritized = editableCandidates.length ? editableCandidates : candidates;
        return prioritized.find(box => /button|submit|card|cta|bot[aã]o/i.test(`${box.id} ${box.name ?? ''} ${box.text ?? ''}`))
            ?? prioritized.sort((a, b) => (b.width * b.height) - (a.width * a.height))[0];
    }

    protected recordFromUnknown(value: unknown): Record<string, unknown> | undefined {
        return value && typeof value === 'object' && !Array.isArray(value)
            ? value as Record<string, unknown>
            : undefined;
    }

    protected coerceCanvasBox(value: CyberVinciCanvasNodeBox | Record<string, unknown> | undefined): CyberVinciCanvasNodeBox | undefined {
        if (!value || typeof value.id !== 'string' || typeof value.type !== 'string') {
            return undefined;
        }
        return {
            id: value.id,
            name: typeof value.name === 'string' ? value.name : undefined,
            type: value.type,
            x: this.numberValue(value.x, 0),
            y: this.numberValue(value.y, 0),
            width: this.numberValue(value.width, 0),
            height: this.numberValue(value.height, 0),
            parentId: typeof value.parentId === 'string' ? value.parentId : undefined,
            depth: this.numberValue(value.depth, 0),
            text: typeof value.text === 'string' ? value.text : undefined
        };
    }

    protected createCanvasFooterOperation(document: OpenPencilDocument): OpenPencilDesignOperation {
        const page = this.getActiveCanvasPage(document);
        const pageWidth = typeof page.width === 'number' ? page.width : 900;
        const pageHeight = typeof page.height === 'number' ? page.height : 620;
        const footerHeight = 96;
        const footerY = Math.max(0, pageHeight - footerHeight);
        const suffix = Date.now().toString(36);
        return {
            operation: 'addNode',
            parentId: page.id,
            node: {
                id: `canvas-qa-footer-${suffix}`,
                type: 'frame',
                name: 'Canvas QA footer',
                x: 0,
                y: footerY,
                width: pageWidth,
                height: footerHeight,
                fill: [{ type: 'solid', color: '#111827' }],
                children: [
                    {
                        id: `canvas-qa-footer-title-${suffix}`,
                        type: 'text',
                        name: 'Footer legal copy',
                        x: 32,
                        y: 28,
                        width: Math.max(220, pageWidth - 64),
                        height: 24,
                        content: 'Saara footer, support links, legal and company information',
                        fontSize: 14,
                        fontWeight: 600,
                        fill: [{ type: 'solid', color: '#ffffff' }]
                    },
                    {
                        id: `canvas-qa-footer-copy-${suffix}`,
                        type: 'text',
                        name: 'Footer support copy',
                        x: 32,
                        y: 56,
                        width: Math.max(220, pageWidth - 64),
                        height: 20,
                        content: 'Ajuda | Pagamentos | Privacidade | Copyright',
                        fontSize: 12,
                        fill: [{ type: 'solid', color: '#cbd5e1' }]
                    }
                ]
            }
        };
    }

    protected createCanvasCartOperation(document: OpenPencilDocument): OpenPencilDesignOperation {
        const page = this.getActiveCanvasPage(document);
        const pageWidth = typeof page.width === 'number' ? page.width : 900;
        const suffix = Date.now().toString(36);
        return {
            operation: 'addNode',
            parentId: page.id,
            node: {
                id: `canvas-qa-cart-${suffix}`,
                type: 'text',
                name: 'Cart nav item',
                x: Math.max(16, pageWidth - 146),
                y: 36,
                width: 110,
                height: 24,
                content: 'Carrinho',
                fontSize: 13,
                fontWeight: 600,
                fill: [{ type: 'solid', color: '#111827' }]
            } as OpenPencilNode
        };
    }

    protected canvasDiagnosticRecommendation(diagnostic: CyberVinciCanvasDiagnostic): string {
        switch (diagnostic.category) {
            case 'overlap':
                return 'Separate the overlapping nodes or reduce the oversized control.';
            case 'off-canvas':
                return 'Resize or move the node so it fits inside the page bounds.';
            case 'text-overflow':
                return 'Increase the text node height or reduce the text size/copy length.';
            case 'footer':
            case 'clone-completeness':
                return 'Add the missing page module before final approval.';
            default:
                return 'Review and repair this Canvas diagnostic before approval.';
        }
    }

    protected getCanvasSession(context: CyberVinciHostToolExecutionContext): { ok: true; session: OpenPencilDesignSession } | CyberVinciHostToolExecutionResult {
        if (!this.openPencilDesignCommandService) {
            return { ok: false, message: 'Canvas design command service is not available.' };
        }
        const explicitUri = typeof context.input.uri === 'string' && context.input.uri.trim()
            ? new URI(context.input.uri)
            : undefined;
        const widgetUri = explicitUri ?? this.getActiveCanvasWidgetUri();
        if (!widgetUri) {
            return { ok: false, message: 'No active Canvas design widget or Canvas URI was found.' };
        }
        const session = this.openPencilDesignCommandService.getSession(widgetUri);
        if (!session) {
            return { ok: false, message: `No Canvas design session is registered for '${widgetUri.toString()}'.` };
        }
        return { ok: true, session };
    }

    protected isCanvasSessionResult(candidate: { ok: true; session: OpenPencilDesignSession } | CyberVinciHostToolExecutionResult): candidate is { ok: true; session: OpenPencilDesignSession } {
        return candidate.ok === true && 'session' in candidate;
    }

    protected getActiveCanvasWidgetUri(): URI | undefined {
        const widget = this.shell?.currentWidget as unknown as {
            getResourceUri?: () => URI | undefined;
            getUri?: () => URI | undefined;
            uri?: URI;
        } | undefined;
        return widget?.getResourceUri?.() ?? widget?.getUri?.() ?? widget?.uri;
    }

    protected getActiveCanvasWidget(uri: URI): { node?: HTMLElement } | undefined {
        const widgets = [
            this.shell?.currentWidget,
            this.shell?.activeWidget
        ].filter(Boolean) as Array<{ node?: HTMLElement; getResourceUri?: () => URI | undefined; getUri?: () => URI | undefined; uri?: URI }>;
        return widgets.find(widget => {
            const widgetUri = widget.getResourceUri?.() ?? widget.getUri?.() ?? widget.uri;
            return widgetUri?.toString() === uri.toString();
        });
    }

    protected readCanvasOperations(context: CyberVinciHostToolExecutionContext): OpenPencilDesignOperation[] {
        const value = context.input.operations ?? context.input.operation;
        if (Array.isArray(value)) {
            return value.filter(item => item && typeof item === 'object') as OpenPencilDesignOperation[];
        }
        if (value && typeof value === 'object') {
            return [value as OpenPencilDesignOperation];
        }
        return [];
    }

    protected readCanvasApplyOptions(context: CyberVinciHostToolExecutionContext): OpenPencilApplyOperationsOptions {
        const options = context.input.options;
        return options && typeof options === 'object'
            ? options as OpenPencilApplyOperationsOptions
            : {
                normalizeVisibleBounds: true,
                preservePageWidth: true,
                requireVisibleContent: true,
                removeAiPlaceholderSkeletons: true
            };
    }

    protected computeCanvasDiagnostics(
        document: OpenPencilDocument,
        categories?: CyberVinciCanvasDiagnostic['category'][]
    ): CyberVinciCanvasDiagnostic[] {
        const selected = categories ? new Set(categories) : undefined;
        const include = (category: CyberVinciCanvasDiagnostic['category']) => !selected || selected.has(category);
        const diagnostics: CyberVinciCanvasDiagnostic[] = [];
        const page = this.getActiveCanvasPage(document);
        const boxes = this.flattenCanvasBoxes(page.children);
        if (include('document') && this.openPencilDesignCommandService) {
            const validation = this.openPencilDesignCommandService.validateDocument(document);
            diagnostics.push(...validation.issues.map(issue => this.canvasValidationIssueToDiagnostic(issue)));
            const quality = this.openPencilDesignCommandService.validateAiLayoutQuality(document, {
                normalizeVisibleBounds: true,
                preservePageWidth: true,
                removeAiPlaceholderSkeletons: true
            });
            diagnostics.push(...quality.issues.map(issue => this.canvasValidationIssueToDiagnostic(issue, 'layout-quality')));
        }
        if (include('off-canvas')) {
            diagnostics.push(...this.detectCanvasOffCanvasNodes(boxes, page));
        }
        if (include('overlap')) {
            diagnostics.push(...this.detectCanvasOverlaps(boxes));
        }
        if (include('text-overflow')) {
            diagnostics.push(...this.detectCanvasTextOverflow(boxes));
        }
        if (include('footer')) {
            diagnostics.push(...this.detectCanvasFooterPresence(boxes, page));
        }
        if (include('clone-completeness')) {
            diagnostics.push(...this.detectCanvasCloneCompleteness(document, boxes));
        }
        return diagnostics;
    }

    protected canvasValidationIssueToDiagnostic(
        issue: OpenPencilValidationIssue,
        category: CyberVinciCanvasDiagnostic['category'] = 'document'
    ): CyberVinciCanvasDiagnostic {
        return {
            category,
            severity: issue.severity === 'error' ? 'error' : 'warning',
            message: issue.message,
            details: { path: issue.path }
        };
    }

    protected detectCanvasOffCanvasNodes(boxes: CyberVinciCanvasNodeBox[], page: OpenPencilPage): CyberVinciCanvasDiagnostic[] {
        const pageWidth = typeof page.width === 'number' ? page.width : 900;
        const pageHeight = typeof page.height === 'number' ? page.height : 620;
        return boxes
            .filter(box => box.x < -1 || box.y < -1 || box.x + box.width > pageWidth + 1 || box.y + box.height > pageHeight + 1)
            .map(box => ({
                category: 'off-canvas',
                severity: 'error',
                nodeId: box.id,
                message: `Node '${box.name ?? box.id}' exceeds page bounds.`,
                details: { box, pageWidth, pageHeight }
            }));
    }

    protected detectCanvasOverlaps(boxes: CyberVinciCanvasNodeBox[]): CyberVinciCanvasDiagnostic[] {
        const diagnostics: CyberVinciCanvasDiagnostic[] = [];
        const leafBoxes = boxes.filter(box => box.width > 2 && box.height > 2);
        for (let index = 0; index < leafBoxes.length; index++) {
            for (let otherIndex = index + 1; otherIndex < leafBoxes.length; otherIndex++) {
                const left = leafBoxes[index];
                const right = leafBoxes[otherIndex];
                if (left.parentId !== right.parentId || this.isLikelyIntentionalOverlap(left, right)) {
                    continue;
                }
                const area = this.intersectionArea(left, right);
                const smaller = Math.min(left.width * left.height, right.width * right.height);
                if (smaller > 0 && area / smaller > 0.35) {
                    diagnostics.push({
                        category: 'overlap',
                        severity: 'warning',
                        nodeId: left.id,
                        otherNodeId: right.id,
                        message: `Nodes '${left.name ?? left.id}' and '${right.name ?? right.id}' overlap substantially.`,
                        details: { overlapRatio: area / smaller, left, right }
                    });
                }
            }
        }
        return diagnostics;
    }

    protected detectCanvasTextOverflow(boxes: CyberVinciCanvasNodeBox[]): CyberVinciCanvasDiagnostic[] {
        return boxes
            .filter(box => box.text && this.estimatedTextHeight(box.text, box.width) > box.height + 4)
            .map(box => ({
                category: 'text-overflow',
                severity: 'warning',
                nodeId: box.id,
                message: `Text node '${box.name ?? box.id}' may not have enough height for its content.`,
                details: {
                    box,
                    estimatedHeight: this.estimatedTextHeight(box.text!, box.width)
                }
            }));
    }

    protected detectCanvasFooterPresence(boxes: CyberVinciCanvasNodeBox[], page: OpenPencilPage): CyberVinciCanvasDiagnostic[] {
        const pageHeight = typeof page.height === 'number' ? page.height : 620;
        const hasFooter = boxes.some(box => /footer|rodap[eé]|legal|copyright|links/i.test(`${box.id} ${box.name ?? ''} ${box.text ?? ''}`)
            || box.y > pageHeight * 0.78 && box.height > 40);
        return hasFooter ? [] : [{
            category: 'footer',
            severity: 'warning',
            message: 'No footer-like section was detected near the bottom of the Canvas page.'
        }];
    }

    protected detectCanvasCloneCompleteness(document: OpenPencilDocument, boxes: CyberVinciCanvasNodeBox[]): CyberVinciCanvasDiagnostic[] {
        const text = `${document.name ?? ''} ${boxes.map(box => `${box.id} ${box.name ?? ''} ${box.text ?? ''}`).join(' ')}`.toLowerCase();
        const looksMarketplace = /\bamazon\b|\bsaara\b|mercado|shop|cart|oferta|produto|categoria|compras/.test(text);
        if (!looksMarketplace) {
            return [];
        }
        const required = [
            { key: 'search', label: 'search input/header search', pattern: /search|busca|buscar|pesquisa/ },
            { key: 'cart', label: 'cart or checkout area', pattern: /cart|carrinho|checkout|compras/ },
            { key: 'cards', label: 'product/category cards', pattern: /card|produto|oferta|categoria|deal/ },
            { key: 'footer', label: 'footer', pattern: /footer|rodap[eé]|copyright|legal/ }
        ];
        return required
            .filter(item => !item.pattern.test(text))
            .map(item => ({
                category: 'clone-completeness',
                severity: 'warning',
                message: `Marketplace clone appears to be missing ${item.label}.`,
                details: { missing: item.key }
            }));
    }

    protected createResizeToFitOperations(document: OpenPencilDocument): OpenPencilDesignOperation[] {
        const page = this.getActiveCanvasPage(document);
        const pageWidth = typeof page.width === 'number' ? page.width : 900;
        const pageHeight = typeof page.height === 'number' ? page.height : 620;
        return this.flattenCanvasBoxes(page.children).flatMap(box => {
            const changes: Partial<OpenPencilNode> = {};
            if (box.x < 0) {
                changes.x = 0;
            }
            if (box.y < 0) {
                changes.y = 0;
            }
            if (box.x + box.width > pageWidth) {
                changes.width = Math.max(8, pageWidth - Math.max(0, box.x));
            }
            if (box.y + box.height > pageHeight) {
                changes.height = Math.max(8, pageHeight - Math.max(0, box.y));
            }
            if (box.text) {
                const estimatedHeight = this.estimatedTextHeight(box.text, box.width);
                if (estimatedHeight > box.height + 4) {
                    changes.height = Math.max(Number(changes.height ?? box.height), estimatedHeight);
                }
            }
            return Object.keys(changes).length
                ? [{ operation: 'updateNode', nodeId: box.id, changes } as OpenPencilDesignOperation]
                : [];
        });
    }

    protected getActiveCanvasPage(document: OpenPencilDocument): OpenPencilPage {
        const page = document.pages?.find(item => item.id === document.activePageId) ?? document.pages?.[0];
        return page ?? { id: 'root', name: 'Page 1', width: 900, height: 620, children: document.children ?? [] };
    }

    protected summarizeCanvasDocument(document: OpenPencilDocument, page: OpenPencilPage): Record<string, unknown> {
        const boxes = this.flattenCanvasBoxes(page.children);
        return {
            name: document.name,
            activePageId: page.id,
            activePageName: page.name,
            pageWidth: page.width,
            pageHeight: page.height,
            nodeCount: boxes.length,
            contentBottom: boxes.reduce((bottom, box) => Math.max(bottom, box.y + box.height), 0),
            topLevelNodeCount: page.children.length,
            topLevelNodes: page.children.map(node => ({
                id: node.id,
                type: node.type,
                name: node.name,
                x: node.x,
                y: node.y,
                width: node.width,
                height: node.height,
                childCount: node.children?.length ?? 0
            }))
        };
    }

    protected flattenCanvasBoxes(nodes: OpenPencilNode[] | undefined, parentId?: string, depth = 0): CyberVinciCanvasNodeBox[] {
        const boxes: CyberVinciCanvasNodeBox[] = [];
        for (const node of nodes ?? []) {
            const width = this.numberValue(node.width, 0);
            const height = this.numberValue(node.height, 0);
            boxes.push({
                id: node.id,
                name: node.name,
                type: node.type,
                x: this.numberValue(node.x, 0),
                y: this.numberValue(node.y, 0),
                width,
                height,
                parentId,
                depth,
                text: typeof node.content === 'string' ? node.content : undefined
            });
            boxes.push(...this.flattenCanvasBoxes(node.children, node.id, depth + 1));
        }
        return boxes;
    }

    protected numberValue(value: unknown, fallback: number): number {
        const parsed = typeof value === 'number'
            ? value
            : typeof value === 'string'
                ? Number.parseFloat(value)
                : NaN;
        return Number.isFinite(parsed) ? parsed : fallback;
    }

    protected intersectionArea(left: CyberVinciCanvasNodeBox, right: CyberVinciCanvasNodeBox): number {
        const x = Math.max(0, Math.min(left.x + left.width, right.x + right.width) - Math.max(left.x, right.x));
        const y = Math.max(0, Math.min(left.y + left.height, right.y + right.height) - Math.max(left.y, right.y));
        return x * y;
    }

    protected isLikelyIntentionalOverlap(left: CyberVinciCanvasNodeBox, right: CyberVinciCanvasNodeBox): boolean {
        if (left.depth !== right.depth) {
            return true;
        }
        if (this.isCanvasStructuralContainerBox(left) !== this.isCanvasStructuralContainerBox(right)) {
            const structural = this.isCanvasStructuralContainerBox(left) ? left : right;
            const other = structural.id === left.id ? right : left;
            return structural.width * structural.height >= other.width * other.height;
        }
        const labels = `${left.type} ${right.type} ${left.name ?? ''} ${right.name ?? ''}`.toLowerCase();
        return /icon|badge|avatar|overlay|shadow|background|bg|image/.test(labels);
    }

    protected isCanvasStructuralContainerBox(box: CyberVinciCanvasNodeBox): boolean {
        const label = `${box.id} ${box.name ?? ''} ${box.type}`.toLowerCase();
        return /header|footer|section|container|background|hero|nav/.test(label) && /frame|group|rectangle/.test(box.type.toLowerCase());
    }

    protected estimatedTextHeight(text: string, width: number): number {
        const usableWidth = Math.max(24, width);
        const averageCharWidth = 7.5;
        const charsPerLine = Math.max(1, Math.floor(usableWidth / averageCharWidth));
        const explicitLines = text.split(/\r?\n/);
        const lines = explicitLines.reduce((count, line) => count + Math.max(1, Math.ceil(line.length / charsPerLine)), 0);
        return lines * 18;
    }

    protected cloneJson<T>(value: T): T {
        return JSON.parse(JSON.stringify(value)) as T;
    }

    protected readResultRecord(result: CyberVinciHostToolExecutionResult): Record<string, unknown> | undefined {
        return result.value && typeof result.value === 'object' && !Array.isArray(result.value)
            ? result.value as Record<string, unknown>
            : undefined;
    }

    protected async visionJudgeInputItems(context: CyberVinciHostToolExecutionContext, visualSnapshot: Record<string, unknown> | undefined): Promise<CodexProviderInputItem[]> {
        const items: CodexProviderInputItem[] = [];
        const imageValues = [
            context.input.imageUrl,
            context.input.referenceImageUrl,
            context.input.referenceImage
        ];
        for (const value of imageValues) {
            if (typeof value === 'string' && value.trim()) {
                items.push({ type: 'image', url: value.trim() });
            }
        }
        if (Array.isArray(context.input.images)) {
            for (const value of context.input.images) {
                if (typeof value === 'string' && value.trim()) {
                    items.push({ type: 'image', url: value.trim() });
                }
            }
        }
        const svg = visualSnapshot?.svg;
        if (typeof svg === 'string' && svg.trim()) {
            const snapshot = await this.svgToPngDataUrl(svg, visualSnapshot?.bounds);
            if (snapshot) {
                items.push({ type: 'image', url: snapshot });
            } else {
                items.push({
                    type: 'text',
                    text: 'The Canvas visual snapshot could not be rasterized to PNG for the vision model; use the document summary and layout diagnostics as fallback evidence.',
                    text_elements: []
                });
            }
        }
        return items;
    }

    protected async svgToPngDataUrl(svg: string, bounds: unknown): Promise<string | undefined> {
        const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        try {
            const image = await new Promise<HTMLImageElement>((resolve, reject) => {
                const element = new Image();
                element.onload = () => resolve(element);
                element.onerror = () => reject(new Error('Canvas SVG snapshot could not be rasterized for Vision Judge.'));
                element.src = url;
            });
            const fallbackSize = this.readVisualSnapshotSize(bounds);
            const naturalWidth = image.naturalWidth || image.width || fallbackSize?.width || 1;
            const naturalHeight = image.naturalHeight || image.height || fallbackSize?.height || 1;
            const maxDimension = 2200;
            const scale = Math.min(1, maxDimension / Math.max(naturalWidth, naturalHeight));
            const canvas = window.document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(naturalWidth * scale));
            canvas.height = Math.max(1, Math.round(naturalHeight * scale));
            const context = canvas.getContext('2d');
            if (!context) {
                return undefined;
            }
            context.imageSmoothingEnabled = true;
            context.imageSmoothingQuality = 'high';
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            return canvas.toDataURL('image/png');
        } catch (error) {
            this.logger?.debug('CyberVinci Vision Judge PNG snapshot creation failed:', error);
            return undefined;
        } finally {
            URL.revokeObjectURL(url);
        }
    }

    protected readVisualSnapshotSize(bounds: unknown): { width: number; height: number } | undefined {
        if (!bounds || typeof bounds !== 'object') {
            return undefined;
        }
        const record = bounds as Record<string, unknown>;
        const width = typeof record.width === 'number' ? record.width : Number(record.width);
        const height = typeof record.height === 'number' ? record.height : Number(record.height);
        return Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0
            ? { width, height }
            : undefined;
    }

    protected readVisionExecutionSelection(context: CyberVinciHostToolExecutionContext): CyberVinciAiExecutionSelection {
        const useIndependentVisionModel = this.preferenceService.get<boolean>(CYBERVINCI_AI_CHAT_VISION_JUDGE_ENABLED_PREF, false);
        const execution = {
            ...this.readAiExecutionSelection(context),
            ...this.readObjectInput<CyberVinciAiExecutionSelection>(context.input.visionExecution),
            ...this.readObjectInput<CyberVinciAiExecutionSelection>(context.input.visualExecution)
        };
        const providerId = this.readFirstStringInput(context.input, ['visionProviderId', 'visualProviderId'])
            || (useIndependentVisionModel ? this.preferenceService.get<string>(CYBERVINCI_AI_CHAT_VISION_JUDGE_PROVIDER_PREF, '') : undefined);
        const model = this.readFirstStringInput(context.input, ['visionModel', 'visualModel'])
            || (useIndependentVisionModel ? this.preferenceService.get<string>(CYBERVINCI_AI_CHAT_VISION_JUDGE_MODEL_PREF, '') : undefined);
        const runtime = this.readFirstStringInput(context.input, ['visionRuntime', 'visualRuntime']);
        const modelProvider = this.readFirstStringInput(context.input, ['visionModelProvider', 'visualModelProvider']);
        return {
            ...execution,
            providerId: providerId || execution.providerId,
            model: model || execution.model,
            runtime: runtime as CyberVinciAiExecutionSelection['runtime'] || execution.runtime,
            modelProvider: modelProvider || execution.modelProvider
        };
    }

    protected readAiExecutionSelection(context: CyberVinciHostToolExecutionContext): CyberVinciAiExecutionSelection {
        const execution = this.readObjectInput<CyberVinciAiExecutionSelection>(context.input.execution);
        const providerId = this.readFirstStringInput(context.input, ['providerId']);
        const model = this.readFirstStringInput(context.input, ['model']);
        const runtime = this.readFirstStringInput(context.input, ['runtime']);
        const modelProvider = this.readFirstStringInput(context.input, ['modelProvider']);
        const reasoningEffort = this.readFirstStringInput(context.input, ['reasoningEffort']);
        const reasoningVariant = this.readFirstStringInput(context.input, ['reasoningVariant']);
        const serviceTier = this.readFirstStringInput(context.input, ['serviceTier']);
        return {
            ...execution,
            providerId: providerId || execution.providerId,
            model: model || execution.model,
            runtime: runtime as CyberVinciAiExecutionSelection['runtime'] || execution.runtime,
            modelProvider: modelProvider || execution.modelProvider,
            reasoningEffort: reasoningEffort as CyberVinciAiExecutionSelection['reasoningEffort'] || execution.reasoningEffort,
            reasoningVariant: reasoningVariant || execution.reasoningVariant,
            serviceTier: serviceTier as CyberVinciAiExecutionSelection['serviceTier'] || execution.serviceTier
        };
    }

    protected readObjectInput<T>(value: unknown): Partial<T> {
        return value && typeof value === 'object' && !Array.isArray(value)
            ? value as Partial<T>
            : {};
    }

    protected readFirstStringInput(input: Record<string, unknown>, keys: string[]): string | undefined {
        for (const key of keys) {
            const value = input[key];
            if (typeof value === 'string' && value.trim()) {
                return value.trim();
            }
        }
        return undefined;
    }

    protected resolveToolArgs(args: Record<string, unknown>, context: CyberVinciHostToolExecutionContext): Record<string, unknown> {
        const resolved: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(args)) {
            resolved[key] = this.resolveToolValue(value, context);
        }
        return resolved;
    }

    protected resolveToolValue(value: unknown, context: CyberVinciHostToolExecutionContext): unknown {
        if (typeof value !== 'string') {
            return value;
        }
        const exact = value.match(/^\$\{([^}]+)\}$/);
        if (exact) {
            return this.lookupToolPath(exact[1].trim(), context);
        }
        return value.replace(/\$\{([^}]+)\}/g, (_match, expression: string) => {
            const resolved = this.lookupToolPath(expression.trim(), context);
            return resolved === undefined || resolved === null ? '' : String(resolved);
        });
    }

    protected lookupToolPath(pathExpression: string, context: CyberVinciHostToolExecutionContext): unknown {
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

    protected toFlowWorkflowSummaryForAi(workflow: FlowWorkflow): FlowWorkflowSummaryForAi {
        return {
            id: workflow.id,
            name: workflow.name,
            description: workflow.description,
            stateCount: Object.keys(workflow.states || {}).length,
            transitionCount: workflow.transitions.length,
            editable: workflow.file?.editable !== false
        };
    }

    protected toLanguageModelOptions(providers: CyberVinciAiProviderDescriptor[]): Array<{ id: string; label: string; status: 'ready' | 'unavailable' }> {
        return providers.flatMap(provider => {
            const models = provider.models?.length ? provider.models : provider.defaultModel ? [provider.defaultModel] : [];
            if (!models.length) {
                return [{
                    id: provider.id,
                    label: provider.label,
                    status: provider.available ? 'ready' as const : 'unavailable' as const
                }];
            }
            return models.map(model => ({
                id: `${provider.id}:${model}`,
                label: `${provider.label} / ${model}`,
                status: provider.available ? 'ready' as const : 'unavailable' as const
            }));
        });
    }

    protected coerceFlowAiAuthoringDraft(value: unknown): FlowAiAuthoringDraft {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            throw new Error('Flow AI response must be a FlowAiAuthoringDraft object.');
        }
        const draft = value as FlowAiAuthoringDraft;
        if (typeof draft.version !== 'string' || typeof draft.action !== 'string') {
            throw new Error('Flow AI response must include version and action.');
        }
        if (!['run_saved_workflow', 'instantiate_pattern', 'create_workflow', 'ask_user'].includes(draft.action)) {
            throw new Error(`Flow AI returned unsupported authoring action: ${draft.action}`);
        }
        return draft;
    }

    protected async ensureToolPolicyApproved(tool: CyberVinciToolDefinition, context: CyberVinciHostToolExecutionContext): Promise<CyberVinciHostToolExecutionResult> {
        const approval = tool.policy?.approval;
        const requiresApproval = approval === 'always'
            || tool.policy?.requiresApproval === true
            || tool.policy?.requiresConfirmation === true;
        if (!requiresApproval) {
            return { ok: true };
        }
        if (!this.quickPickService) {
            return {
                ok: false,
                value: { approvalRequired: true, toolId: tool.id, playbookId: context.playbookId, stateId: context.stateId },
                message: `Tool '${tool.id}' requires approval, but the approval UI is not available.`
            };
        }
        const picked = await this.quickPickService.show<QuickPickItem & { approved: boolean }>([
            {
                label: `Approve ${tool.name}`,
                description: tool.id,
                detail: tool.description,
                approved: true
            },
            {
                label: `Reject ${tool.name}`,
                description: tool.id,
                detail: `Requested by ${context.playbookId ?? 'unknown playbook'}${context.stateId ? ` / ${context.stateId}` : ''}.`,
                approved: false
            }
        ], {
            title: 'CyberVinci Tool Approval',
            placeholder: `Approve tool '${tool.id}'?`
        });
        if (!picked?.approved) {
            return { ok: false, message: `Tool '${tool.id}' was not approved.` };
        }
        return { ok: true };
    }

    protected playbookToFlowWorkflow(playbook: CyberVinciPlaybookDefinition, prompt: string): FlowWorkflow {
        const states: FlowWorkflow['states'] = {};
        const transitions: FlowWorkflow['transitions'] = [];
        let index = 0;
        for (const playbookState of playbook.states) {
            const state = playbookState as unknown as Record<string, unknown>;
            const id = String(state.id ?? `state_${index + 1}`);
            const type = String(state.type ?? 'tool');
            states[id] = {
                id,
                type: this.playbookStateToFlowStateType(type),
                agent: typeof state.agent === 'string' ? state.agent : undefined,
                taskPrompt: this.playbookStatePrompt(state),
                outputs: typeof state.saveAs === 'string' ? [`playbook/${id}-${state.saveAs}.json`] : undefined,
                layout: {
                    x: 80 + (index % 4) * 260,
                    y: 80 + Math.floor(index / 4) * 180
                },
                playbookState: {
                    type,
                    tool: state.tool,
                    guard: state.guard,
                    mode: state.mode,
                    workflowId: state.workflowId,
                    route: state.route
                }
            };
            for (const transition of this.playbookStateTransitions(state)) {
                transitions.push({
                    id: `${id}_to_${transition.to}_${transitions.length + 1}`.replace(/[^A-Za-z0-9_-]+/g, '_'),
                    from: id,
                    to: transition.to,
                    on: transition.on,
                    guard: transition.guard ? { playbook: transition.guard } : undefined
                });
            }
            index++;
        }
        return {
            version: 'flow.workflow/v1',
            id: `playbook_${playbook.id}`.replace(/[^A-Za-z0-9_-]+/g, '_'),
            name: `${playbook.name} Flow`,
            description: playbook.description ?? `Compiled from CyberVinci Playbook '${playbook.id}'.`,
            requires: {
                capabilities: ['llm.agent.execute', 'run.event_stream']
            },
            states,
            transitions,
            agents: {
                playbook: playbook.id
            }
        };
    }

    protected playbookStateToFlowStateType(type: string): FlowWorkflow['states'][string]['type'] {
        switch (type) {
            case 'ai':
                return 'agent';
            case 'ask':
                return 'gate';
            case 'condition':
                return 'condition';
            case 'parallel':
                return 'parallel';
            case 'response':
            case 'end':
                return 'report';
            case 'tool':
            case 'guard':
            case 'flow':
            case 'playbook':
            case 'start':
            default:
                return 'command';
        }
    }

    protected playbookStatePrompt(state: Record<string, unknown>): string {
        const prompt = typeof state.prompt === 'string'
            ? state.prompt
            : typeof state.template === 'string'
                ? state.template
                : typeof state.text === 'string'
                    ? state.text
                    : '';
        const type = String(state.type ?? 'state');
        const tool = typeof state.tool === 'string' ? ` Tool: ${state.tool}.` : '';
        const guard = typeof state.guard === 'string' ? ` Guard: ${state.guard}.` : '';
        return [prompt, `CyberVinci Playbook state type: ${type}.${tool}${guard}`].filter(Boolean).join('\n\n');
    }

    protected playbookStateTransitions(state: Record<string, unknown>): Array<{ to: string; on: string; guard?: string }> {
        const transitions: Array<{ to: string; on: string; guard?: string }> = [];
        const push = (to: unknown, on: string, guard?: string) => {
            if (typeof to === 'string' && to.trim()) {
                transitions.push({ to: to.trim(), on, guard });
            }
        };
        push(state.next, 'playbook.next');
        push(state.onPass, 'condition.passed');
        push(state.onFail, 'condition.failed');
        push(state.onError, 'workload.failed');
        for (const transition of Array.isArray(state.transitions) ? state.transitions : []) {
            if (transition && typeof transition === 'object') {
                const typed = transition as Record<string, unknown>;
                push(typed.to, 'transition.evaluated', typeof typed.label === 'string' ? typed.label : undefined);
            }
        }
        for (const option of Array.isArray(state.options) ? state.options : []) {
            if (option && typeof option === 'object') {
                const typed = option as Record<string, unknown>;
                push(typed.next, 'gate.approved', typeof typed.label === 'string' ? typed.label : undefined);
            }
        }
        for (const conditionCase of Array.isArray(state.cases) ? state.cases : []) {
            if (conditionCase && typeof conditionCase === 'object') {
                const typed = conditionCase as Record<string, unknown>;
                push(typed.next, 'transition.evaluated', JSON.stringify(typed.if ?? 'case'));
            }
        }
        for (const branch of Array.isArray(state.branches) ? state.branches : []) {
            push(branch, 'workload.created', 'parallel.branch');
        }
        return transitions;
    }

    protected readNumberInput(value: unknown, fallback: number): number {
        const parsed = typeof value === 'number'
            ? value
            : typeof value === 'string'
                ? Number.parseInt(value, 10)
                : NaN;
        return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
    }

    protected readStringArray(value: unknown): string[] | undefined {
        if (Array.isArray(value)) {
            const items = value.filter((item): item is string => typeof item === 'string' && !!item.trim()).map(item => item.trim());
            return items.length ? items : undefined;
        }
        if (typeof value === 'string' && value.trim()) {
            return value.split(',').map(item => item.trim()).filter(Boolean);
        }
        return undefined;
    }

    protected readMemoryScope(value: unknown): MemoryScope {
        return value === 'global' || value === 'repository' || value === 'session' || value === 'task' || value === 'workspace'
            ? value
            : 'workspace';
    }

    protected readMemoryType(value: unknown): MemoryType {
        const allowed: MemoryType[] = [
            'user_preference',
            'project_decision',
            'project_convention',
            'file_location',
            'architecture_note',
            'bug_history',
            'command_note',
            'testing_note',
            'security_note',
            'generated_skill_note',
            'manual_note'
        ];
        return typeof value === 'string' && (allowed as string[]).includes(value) ? value as MemoryType : 'manual_note';
    }

    protected readMemoryTitle(input: Record<string, unknown>, content: string): string {
        if (typeof input.title === 'string' && input.title.trim()) {
            return input.title.trim();
        }
        return content.split(/\r?\n/).find(line => line.trim())?.trim().slice(0, 80) || 'CyberVinci Playbook Memory';
    }

    protected executeSystemStub(toolId: string): CyberVinciHostToolExecutionResult {
        this.logger.warn(`CyberVinci tool '${toolId}' is registered but has no browser host implementation.`);
        return { ok: false, message: `Tool '${toolId}' has no host implementation.` };
    }

    protected readWorkspaceRootUri(context: CyberVinciHostToolExecutionContext): string | undefined {
        const value = context.input.workspaceRootUri ?? context.state.workspaceRootUri;
        return typeof value === 'string' && value.trim() ? value : undefined;
    }

    protected async resolveWorkspaceRootUri(context: CyberVinciHostToolExecutionContext): Promise<string | undefined> {
        const explicit = this.readWorkspaceRootUri(context);
        if (explicit) {
            return explicit;
        }
        const roots = await this.workspaceService?.roots;
        return roots?.[0]?.resource.toString();
    }

    protected async resolveWorkspacePath(context: CyberVinciHostToolExecutionContext): Promise<string | undefined> {
        const explicit = context.input.workspacePath ?? context.state.workspacePath;
        if (typeof explicit === 'string' && explicit.trim()) {
            return explicit.trim();
        }
        const configuredWorkdir = this.preferenceService.get<string>(CYBERVINCI_AI_CHAT_WORKDIR_PREF, undefined);
        if (typeof configuredWorkdir === 'string' && configuredWorkdir.trim()) {
            return configuredWorkdir.trim();
        }
        const workspaceRootUri = await this.resolveWorkspaceRootUri(context);
        if (!workspaceRootUri) {
            return undefined;
        }
        try {
            return FileUri.fsPath(workspaceRootUri);
        } catch {
            return undefined;
        }
    }
}

function normalizeFlowGateDecision(value: unknown): Exclude<FlowGateStatus, 'pending'> {
    const normalized = String(value || 'approved').trim().toLowerCase();
    if (normalized === 'rejected' || normalized === 'reject' || normalized === 'failed' || normalized === 'fail') {
        return 'rejected';
    }
    if (normalized === 'revision_requested' || normalized === 'changes_requested' || normalized === 'review' || normalized === 'repair') {
        return 'revision_requested';
    }
    return 'approved';
}

function toOptionalString(value: unknown): string | undefined {
    const text = typeof value === 'string' ? value.trim() : value === undefined || value === null ? '' : String(value).trim();
    return text || undefined;
}

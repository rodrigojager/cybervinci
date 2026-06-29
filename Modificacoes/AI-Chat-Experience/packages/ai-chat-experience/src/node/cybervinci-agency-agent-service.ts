// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { injectable } from '@theia/core/shared/inversify';
import * as yaml from 'js-yaml';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { spawn } from 'child_process';
import {
    CYBERVINCI_AGENT_CATALOG_VERSION,
    CYBERVINCI_FRONTEND_BRIDGE_SMOKE_PLAYBOOK_ID,
    CyberVinciAgent,
    CyberVinciAgentCatalog,
    CyberVinciAgentSummary,
    CyberVinciAgencyAgent,
    CyberVinciAgencyAgentSummary,
    CyberVinciAiChatExperienceClient,
    CyberVinciAiChatExperienceService,
    CyberVinciCatalogDiagnostic,
    CyberVinciCatalogItemKind,
    CyberVinciCatalogLocations,
    CyberVinciCatalogRestoreResult,
    CyberVinciCatalogWriteResult,
    CyberVinciMarketplaceCollection,
    CyberVinciMarketplaceItem,
    CyberVinciFrontendBridgeSmokeResult,
    CyberVinciDeclarativeChatAgent,
    CyberVinciDeclarativeChatAgentManifest,
    CyberVinciDeclarativeTool,
    CyberVinciDeclarativeToolExecutionResult,
    CyberVinciPlaybookDefinition,
    CyberVinciFlowPlaybookRunRequest,
    CyberVinciFlowPlaybookRunResult,
    CyberVinciRuntimeDiagnostics,
    CyberVinciPlaybookSummary,
    CyberVinciToolDefinition,
    CyberVinciThreadGoalBudgetParams,
    CyberVinciThreadGoalQueryParams,
    CyberVinciThreadGoalResponse,
    CyberVinciThreadGoalSetParams
} from '../common';
import { CyberVinciCatalogValidator } from './cybervinci-catalog-validator';

const AGENCY_AGENTS_RELATIVE_PATHS = [
    path.join('Modificacoes', 'Skills', 'Manual', 'Agency Agents'),
    path.join('Skills', 'Manual', 'Agency Agents')
];
const CHAT_AGENTS_RELATIVE_PATH = path.join('Modificacoes', 'AI-Chat-Experience', 'config', 'chat-agents.json');
const CHAT_CATALOG_RELATIVE_PATH = path.join('Modificacoes', 'AI-Chat-Experience', 'config');
const DECLARATIVE_TOOL_TIMEOUT = 120_000;
const NATIVE_AGENT_DELEGATE_PLAYBOOK_ID = 'native-agent-delegate';
const NATIVE_AGENT_PLAYBOOK_PREFIX = 'native-agent.';
const CATALOG_SOURCE_ORDER = [
    { directory: 'system', source: 'system' },
    { directory: 'system-overrides', source: 'system-override' },
    { directory: 'user', source: 'user' }
] as const;
type CatalogSource = typeof CATALOG_SOURCE_ORDER[number]['source'];

const BUILT_IN_CHAT_AGENTS: CyberVinciDeclarativeChatAgent[] = [
    {
        kind: 'native',
        id: 'OpenCoder',
        sourceAgentId: 'OpenCoder',
        name: 'CyberVinci',
        iconClass: 'codicon codicon-hubot',
        tags: ['Chat', 'Coding', 'Workspace', 'Provider Runtime'],
        description: 'Provider-neutral coding agent with CyberVinci AI Providers runtime, file changes, sandbox controls, and validation workflows.'
    },
    {
        kind: 'native',
        id: 'Coder',
        sourceAgentId: 'Coder',
        name: 'Coder',
        iconClass: 'codicon codicon-code',
        tags: ['Chat', 'Coding', 'Workspace'],
        description: 'Software-development chat agent that can inspect workspace files and suggest file changes.'
    },
    {
        kind: 'native',
        id: 'Architect',
        sourceAgentId: 'Architect',
        name: 'Architect',
        iconClass: 'codicon codicon-map',
        tags: ['Chat', 'Planning', 'Workspace'],
        description: 'Planning and project-understanding agent for codebase questions and implementation plans.'
    },
    {
        kind: 'native',
        id: 'GitHub',
        sourceAgentId: 'GitHub',
        name: 'GitHub',
        iconClass: 'codicon codicon-github',
        tags: ['Chat', 'GitHub', 'MCP'],
        description: 'GitHub workflow agent that configures and starts the GitHub MCP server when needed.'
    },
    {
        kind: 'native',
        id: 'AppTester',
        sourceAgentId: 'AppTester',
        name: 'AppTester',
        iconClass: 'codicon codicon-beaker',
        tags: ['Chat', 'Testing', 'Browser', 'MCP'],
        description: 'UI testing agent that can start browser automation MCP servers and verify application scenarios.'
    },
    {
        kind: 'native',
        id: 'code-reviewer',
        sourceAgentId: 'code-reviewer',
        name: 'Code Reviewer',
        iconClass: 'codicon codicon-code-review',
        tags: ['Chat', 'Review', 'Coding'],
        description: 'Code review agent for finding defects, regressions, and missing tests.'
    },
    {
        kind: 'native',
        id: 'pr-reviewer',
        sourceAgentId: 'pr-reviewer',
        name: 'PR Reviewer',
        iconClass: 'codicon codicon-git-pull-request-go-to-changes',
        tags: ['Chat', 'Review', 'GitHub'],
        description: 'Pull-request review agent for GitHub-oriented review workflows.'
    },
    {
        kind: 'native',
        id: 'explore',
        sourceAgentId: 'explore',
        name: 'Explore',
        iconClass: 'codicon codicon-compass',
        tags: ['Chat', 'Research', 'Workspace'],
        description: 'Exploration agent for discovering project structure and answering workspace questions.'
    },
    {
        kind: 'native',
        id: 'ProjectInfo',
        sourceAgentId: 'ProjectInfo',
        name: 'ProjectInfo',
        iconClass: 'codicon codicon-info',
        tags: ['Chat', 'Workspace'],
        description: 'Project information agent for summarizing and explaining the current workspace.'
    },
    {
        kind: 'native',
        id: 'CreateSkill',
        sourceAgentId: 'CreateSkill',
        name: 'CreateSkill',
        iconClass: 'codicon codicon-tools',
        tags: ['Chat', 'Skills'],
        description: 'Skill creation agent for authoring reusable AI workflow instructions.'
    },
    {
        kind: 'native',
        id: 'Orchestrator',
        sourceAgentId: 'Orchestrator',
        name: 'Orchestrator',
        iconClass: 'codicon codicon-organization',
        tags: ['Chat', 'Delegation'],
        description: 'Routing agent that delegates to other chat agents.'
    },
    {
        kind: 'native',
        id: 'Universal',
        sourceAgentId: 'Universal',
        name: 'Universal',
        iconClass: 'codicon codicon-copilot',
        tags: ['Chat'],
        description: 'General-purpose fallback chat agent.'
    },
    {
        kind: 'native',
        id: 'Command',
        sourceAgentId: 'Command',
        name: 'Command',
        iconClass: 'codicon codicon-terminal',
        tags: ['Chat', 'Commands'],
        description: 'Command-oriented chat agent for command generation and execution-related workflows.'
    }
];

const BUILT_IN_TOOLS: CyberVinciToolDefinition[] = [
    {
        version: 'cybervinci.tool/v1',
        id: 'core.agent.invoke',
        name: 'Invoke Agent',
        kind: 'action',
        source: 'core',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Agent',
        description: 'Host action reserved for invoking the selected CyberVinci or native Theia chat agent.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'core.agent.describe',
        name: 'Describe Agent Runtime',
        kind: 'tool',
        source: 'core',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Agent',
        description: 'Host tool that resolves the selected chat agent, native source id, playbooks, and declared capabilities before an autonomous Playbook continues.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'core.agent.preflight',
        name: 'Agent Preflight',
        kind: 'guard',
        source: 'core',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Agent',
        description: 'Host guard that checks whether the selected agent/playbook/provider/tool bridge has enough runtime context to continue without hiding missing setup.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'system.agent.nativeMcpRequirements',
        name: 'Native Agent MCP Requirements',
        kind: 'guard',
        source: 'system',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Agent',
        description: 'Host guard that reports MCP server requirements inferred from native agent prompts and known native agent setup rules.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'core.chat.respond',
        name: 'Respond In Chat',
        kind: 'action',
        source: 'core',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Chat',
        description: 'Host action reserved for writing the final response to the active chat turn.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'core.chat.stop',
        name: 'Stop Chat Turn',
        kind: 'action',
        source: 'core',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Chat',
        description: 'Host action reserved for cancelling or ending the active chat turn.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'core.playbook.list',
        name: 'List Playbooks',
        kind: 'tool',
        source: 'core',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Playbooks',
        description: 'Host tool reserved for listing CyberVinci Playbooks as reusable workloads.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'core.playbook.run',
        name: 'Run Playbook',
        kind: 'action',
        source: 'core',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Playbooks',
        description: 'Host action reserved for running a CyberVinci Playbook as a workload from another playbook, Flow, or host tool bridge.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'core.playbook.resume',
        name: 'Resume Playbook Run',
        kind: 'action',
        source: 'core',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Playbooks',
        description: 'Host action that resumes a paused or failed CyberVinci Playbook run from its latest deterministic checkpoint.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'core.playbook.compileToFlowDraft',
        name: 'Compile Playbook To Flow Draft',
        kind: 'tool',
        source: 'core',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Playbooks',
        description: 'Host tool that compiles a CyberVinci Playbook into a flow.ai-authoring/v1 create_workflow draft.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'core.playbook.createFlowFromPlaybook',
        name: 'Create Flow From Playbook',
        kind: 'action',
        source: 'core',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Playbooks',
        description: 'Host action that materializes a Flow workflow from a CyberVinci Playbook compile draft.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'core.flow.listWorkflows',
        name: 'List Flow Workflows',
        kind: 'tool',
        source: 'core',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Flow',
        description: 'Host tool reserved for listing saved CyberVinci Flow workflows.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'core.flow.startRun',
        name: 'Start Saved Flow',
        kind: 'action',
        source: 'core',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Flow',
        description: 'Host action reserved for starting a saved CyberVinci Flow run.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'core.flow.listPendingGates',
        name: 'List Pending Flow Gates',
        kind: 'tool',
        source: 'core',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Flow',
        description: 'Host tool reserved for listing pending human gate decisions in a CyberVinci Flow run.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'core.flow.approveGate',
        name: 'Decide Flow Gate',
        kind: 'action',
        source: 'core',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Flow',
        description: 'Host action reserved for approving, rejecting, or routing a CyberVinci Flow human gate.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'core.flow.runDynamicWorkflow',
        name: 'Run Dynamic Workflow',
        kind: 'action',
        source: 'core',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Flow',
        description: 'Host action reserved for asking AI Runtime and Flow to choose, author, and run a workflow for the prompt.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'core.flow.runAiAuthoredDynamicWorkflow',
        name: 'Run AI-Authored Dynamic Workflow',
        kind: 'action',
        source: 'core',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Flow',
        description: 'Host action that asks the shared AI Runtime for a flow.ai-authoring/v1 draft, then materializes and runs it through Flow.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'core.flow.getAiAuthoringSpec',
        name: 'Get Flow AI Authoring Spec',
        kind: 'tool',
        source: 'core',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Flow',
        description: 'Host tool reserved for reading flow.ai-authoring/v1 before an AI authoring draft is produced.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'core.flow.runAiAuthoringDraft',
        name: 'Run AI Authored Flow',
        kind: 'action',
        source: 'core',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Flow',
        description: 'Host action reserved for executing a Flow run from a flow.ai-authoring/v1 draft.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'core.flow.createWorkflowFromAiAuthoringDraft',
        name: 'Create Flow From AI Authoring Draft',
        kind: 'action',
        source: 'core',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Flow',
        description: 'Host action reserved for materializing a Flow workflow from a flow.ai-authoring/v1 draft without starting it.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'core.memory.searchContext',
        name: 'Search Memory Context',
        kind: 'tool',
        source: 'core',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Memory',
        description: 'Host tool that searches CyberVinci Memory and optionally builds a context pack for a Playbook state.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'core.memory.proposeCandidate',
        name: 'Propose Memory Candidate',
        kind: 'action',
        source: 'core',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Memory',
        description: 'Host action that extracts Memory candidate records without persisting unapproved writes.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'core.memory.requestWriteApproval',
        name: 'Request Memory Write Approval',
        kind: 'action',
        source: 'core',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Memory',
        description: 'Host action that asks the user before writing an approved Memory entry.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'core.memory.writeApproved',
        name: 'Write Approved Memory',
        kind: 'action',
        source: 'core',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Memory',
        description: 'Host action that writes Memory only when approved=true is supplied by a prior deterministic approval step.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'system.memory.searchContext',
        name: 'Search Memory Context',
        kind: 'tool',
        source: 'system',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Memory',
        description: 'System tool wrapper for searching CyberVinci Memory from Playbooks.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'system.memory.proposeCandidate',
        name: 'Propose Memory Candidate',
        kind: 'action',
        source: 'system',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Memory',
        description: 'System tool wrapper for proposing Memory candidates without writing them.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'system.memory.requestWriteApproval',
        name: 'Request Memory Write Approval',
        kind: 'action',
        source: 'system',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Memory',
        description: 'System tool wrapper for explicit Memory write approval.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'system.memory.writeApproved',
        name: 'Write Approved Memory',
        kind: 'action',
        source: 'system',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Memory',
        description: 'System tool wrapper that writes only explicitly approved Memory content.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'core.provider.status',
        name: 'Provider Status',
        kind: 'guard',
        source: 'core',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Providers',
        description: 'Host guard reserved for checking provider/model configuration before a playbook continues.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'core.theiaTool.list',
        name: 'List Theia Tools',
        kind: 'tool',
        source: 'core',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Tools',
        description: 'Host tool for listing tools registered in Theia\'s ToolInvocationRegistry.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'core.theiaTool.invoke',
        name: 'Invoke Theia Tool',
        kind: 'action',
        source: 'core',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Tools',
        description: 'Host action for invoking an existing Theia tool by ID from a playbook.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'system.mcp.hasServer',
        name: 'Check MCP Server Configured',
        kind: 'guard',
        source: 'system',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'MCP',
        description: 'Host guard that checks whether an MCP server is configured.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'system.mcp.isServerStarted',
        name: 'Check MCP Server Running',
        kind: 'guard',
        source: 'system',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'MCP',
        description: 'Host guard that checks whether an MCP server is currently running.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'system.mcp.configureServer',
        name: 'Configure MCP Server',
        kind: 'action',
        source: 'system',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'MCP',
        description: 'Host action that adds or updates one or more MCP server definitions in user preferences.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'system.mcp.ensureServersStarted',
        name: 'Ensure MCP Servers Started',
        kind: 'action',
        source: 'system',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'MCP',
        description: 'Host action that configures missing MCP servers and starts stopped servers.'
    }
];

const BUILT_IN_CANVAS_TOOL_IDS: Array<Pick<CyberVinciToolDefinition, 'id' | 'name' | 'kind' | 'category' | 'description'>> = [
    {
        id: 'system.canvas.captureCurrentDocument',
        name: 'Capture Canvas Document',
        kind: 'tool',
        category: 'Canvas',
        description: 'Host tool for capturing the current Canvas document structure.'
    },
    {
        id: 'system.canvas.captureScreenshot',
        name: 'Capture Canvas Screenshot',
        kind: 'tool',
        category: 'Canvas',
        description: 'Host tool for capturing a visual snapshot of the current Canvas viewport.'
    },
    {
        id: 'system.canvas.collectLayoutDiagnostics',
        name: 'Collect Canvas Layout Diagnostics',
        kind: 'guard',
        category: 'Canvas',
        description: 'Host guard for detecting overlaps, off-canvas nodes, text overflow, and width issues.'
    },
    {
        id: 'system.canvas.detectOverlaps',
        name: 'Detect Canvas Overlaps',
        kind: 'guard',
        category: 'Canvas',
        description: 'Host guard for checking incoherent overlapping Canvas elements.'
    },
    {
        id: 'system.canvas.detectOffCanvasNodes',
        name: 'Detect Off-Canvas Nodes',
        kind: 'guard',
        category: 'Canvas',
        description: 'Host guard for checking nodes that exceed the expected Canvas bounds.'
    },
    {
        id: 'system.canvas.detectTextOverflow',
        name: 'Detect Text Overflow',
        kind: 'guard',
        category: 'Canvas',
        description: 'Host guard for checking clipped or overflowing text in Canvas nodes.'
    },
    {
        id: 'system.canvas.applyOperations',
        name: 'Apply Canvas Operations',
        kind: 'action',
        category: 'Canvas',
        description: 'Host action for applying approved Canvas operation patches.'
    },
    {
        id: 'system.canvas.reorderLayers',
        name: 'Reorder Canvas Layers',
        kind: 'action',
        category: 'Canvas',
        description: 'Host action for repairing layer order when elements overlap incorrectly.'
    },
    {
        id: 'system.canvas.resizeToFit',
        name: 'Resize Canvas Nodes To Fit',
        kind: 'action',
        category: 'Canvas',
        description: 'Host action for resizing Canvas nodes so controls and content fit expected bounds.'
    },
    {
        id: 'system.canvas.validateFooterPresence',
        name: 'Validate Canvas Footer Presence',
        kind: 'guard',
        category: 'Canvas',
        description: 'Host guard for checking that complete page requests include a footer when appropriate.'
    },
    {
        id: 'system.canvas.validateCloneCompleteness',
        name: 'Validate Canvas Clone Completeness',
        kind: 'guard',
        category: 'Canvas',
        description: 'Host guard for checking that known-site clone requests include the expected major modules.'
    },
    {
        id: 'system.canvas.getReferenceFromKnownSite',
        name: 'Get Reference From Known Site',
        kind: 'tool',
        category: 'Canvas',
        description: 'Host tool for obtaining a reference when the prompt clearly names a known site without a URL.'
    },
    {
        id: 'system.vision.judge',
        name: 'Vision Judge',
        kind: 'guard',
        category: 'Vision',
        description: 'Host guard that uses the shared AI Runtime and optional independent vision provider/model to judge visual delivery.'
    },
    {
        id: 'system.flow.aiAuthoringSpec',
        name: 'Flow AI Authoring Spec',
        kind: 'tool',
        category: 'Flow',
        description: 'Host tool for exposing flow.ai-authoring/v1 to dynamic workflow planning.'
    }
];

BUILT_IN_TOOLS.push(...BUILT_IN_CANVAS_TOOL_IDS.map(tool => ({
    version: 'cybervinci.tool/v1' as const,
    source: 'system' as const,
    implementation: 'host' as const,
    exposeToModel: false,
    protected: true,
    ...tool
})));

const BUILT_IN_PLAYBOOKS: CyberVinciPlaybookDefinition[] = [
    {
        version: 'cybervinci.playbook/v1',
        id: NATIVE_AGENT_DELEGATE_PLAYBOOK_ID,
        name: 'Native Agent Delegate (Legacy Disabled)',
        category: 'Agents',
        source: 'core',
        description: 'Legacy compatibility placeholder. Standard CyberVinci agents now use autonomous playbooks and do not delegate to the original Theia native agent.',
        entry: 'disabled',
        enabled: false,
        tools: [],
        states: [
            {
                id: 'disabled',
                type: 'response',
                text: 'Native delegation is disabled. Use the agent-specific autonomous playbook instead.'
            }
        ]
    },
    {
        version: 'cybervinci.playbook/v1',
        id: 'direct-chat',
        name: 'Direct Chat',
        category: 'Chat',
        source: 'core',
        description: 'Default direct chat pass-through. It does not delegate to a native Theia agent.',
        entry: 'pass-through',
        enabled: true,
        tools: [],
        states: [
            {
                id: 'pass-through',
                type: 'end'
            }
        ]
    }
];

BUILT_IN_PLAYBOOKS.push({
    version: 'cybervinci.playbook/v1',
    id: 'canvas-design-qa',
    name: 'Canvas Design QA',
    category: 'Canvas',
    source: 'system',
    enabled: false,
    description: 'V2 playbook for reference capture, Vision Judge, layout diagnostics, repair planning, Canvas operations, and verification.',
    entry: 'capture-document',
    tools: [
        'system.canvas.captureCurrentDocument',
        'system.canvas.collectLayoutDiagnostics',
        'system.vision.judge',
        'system.canvas.applyOperations'
    ],
    guards: [
        'system.canvas.detectOverlaps',
        'system.canvas.detectTextOverflow',
        'system.canvas.validateFooterPresence',
        'system.canvas.validateCloneCompleteness'
    ],
    states: [
        { id: 'capture-document', type: 'tool', tool: 'system.canvas.captureCurrentDocument', transitions: [{ to: 'layout-diagnostics' }] },
        { id: 'layout-diagnostics', type: 'guard', guard: 'system.canvas.collectLayoutDiagnostics', transitions: [{ to: 'vision-judge' }] },
        { id: 'vision-judge', type: 'guard', guard: 'system.vision.judge', saveAs: 'visionJudge', onPass: 'done', onFail: 'repair-plan', transitions: [{ to: 'repair-plan' }] },
        { id: 'repair-plan', type: 'ai', prompt: 'prompts/canvas-repair-planner.md', transitions: [{ to: 'apply-operations' }] },
        { id: 'apply-operations', type: 'tool', tool: 'system.canvas.applyOperations', transitions: [{ to: 'verify' }] },
        { id: 'verify', type: 'ai', prompt: 'prompts/canvas-verify-repairs.md', transitions: [{ to: 'done' }] },
        { id: 'done', type: 'response', prompt: 'Canvas Design QA finished.', transitions: [{ to: 'end' }] },
        { id: 'end', type: 'end' }
    ]
});

interface CatalogFragments {
    agents: CyberVinciDeclarativeChatAgent[];
    tools: CyberVinciToolDefinition[];
    playbooks: CyberVinciPlaybookDefinition[];
    diagnostics: CyberVinciCatalogDiagnostic[];
}

@injectable()
export class CyberVinciAgencyAgentService implements CyberVinciAiChatExperienceService {

    protected cachedRoot: string | undefined;
    protected cachedManifestPath: string | undefined;
    protected cachedCatalogRoot: string | undefined;
    protected client: CyberVinciAiChatExperienceClient | undefined;
    protected readonly validator = new CyberVinciCatalogValidator();

    setClient(client: CyberVinciAiChatExperienceClient | undefined): void {
        this.client = client;
    }

    hasFlowPlaybookClient(): boolean {
        return Boolean(this.client);
    }

    async runPlaybookFromFlowOnClient(request: CyberVinciFlowPlaybookRunRequest): Promise<CyberVinciFlowPlaybookRunResult | undefined> {
        return this.client?.runPlaybookFromFlow(request);
    }

    async getRuntimeDiagnostics(): Promise<CyberVinciRuntimeDiagnostics> {
        return {
            frontendClientConnected: this.hasFlowPlaybookClient(),
            flowPlaybookBridgeProtocol: 'cybervinci-ai-chat-experience-rpc'
        };
    }

    async runFrontendBridgeSmoke(): Promise<CyberVinciFrontendBridgeSmokeResult> {
        if (!this.client) {
            return {
                ok: false,
                frontendClientConnected: false,
                delegated: false,
                message: 'No frontend client is connected to the AI Chat Experience RPC bridge.'
            };
        }
        const result = await this.client.runPlaybookFromFlow({
            workflowId: 'cybervinci-runtime-smoke',
            runId: `cybervinci-runtime-smoke-${Date.now()}`,
            stateId: 'frontend-rpc',
            workloadId: 'frontend-rpc',
            playbookId: CYBERVINCI_FRONTEND_BRIDGE_SMOKE_PLAYBOOK_ID,
            prompt: 'CyberVinci frontend bridge smoke',
            input: {
                marker: 'frontend-rpc',
                source: 'CyberVinciAgencyAgentService.runFrontendBridgeSmoke'
            }
        });
        return {
            ok: result.ok && result.signals?.['cybervinci.playbook.frontend'] === true,
            frontendClientConnected: true,
            delegated: result.signals?.['cybervinci.playbook.frontend'] === true,
            message: result.message,
            value: result.value,
            signals: result.signals,
            diagnostics: result.diagnostics
        };
    }

    async setThreadGoal(params: CyberVinciThreadGoalSetParams): Promise<CyberVinciThreadGoalResponse> {
        return this.delegateThreadGoalClient('setThreadGoal', params);
    }

    async getThreadGoal(params: CyberVinciThreadGoalQueryParams): Promise<CyberVinciThreadGoalResponse> {
        return this.delegateThreadGoalClient('getThreadGoal', params);
    }

    async clearThreadGoal(params: CyberVinciThreadGoalQueryParams): Promise<CyberVinciThreadGoalResponse> {
        return this.delegateThreadGoalClient('clearThreadGoal', params);
    }

    async pauseThreadGoal(params: CyberVinciThreadGoalQueryParams): Promise<CyberVinciThreadGoalResponse> {
        return this.delegateThreadGoalClient('pauseThreadGoal', params);
    }

    async resumeThreadGoal(params: CyberVinciThreadGoalQueryParams): Promise<CyberVinciThreadGoalResponse> {
        return this.delegateThreadGoalClient('resumeThreadGoal', params);
    }

    async setThreadGoalBudget(params: CyberVinciThreadGoalBudgetParams): Promise<CyberVinciThreadGoalResponse> {
        return this.delegateThreadGoalClient('setThreadGoalBudget', params);
    }

    async getThreadGoalStatus(params: CyberVinciThreadGoalQueryParams): Promise<CyberVinciThreadGoalResponse> {
        return this.delegateThreadGoalClient('getThreadGoalStatus', params);
    }

    async ['thread/goal/set'](params: CyberVinciThreadGoalSetParams): Promise<CyberVinciThreadGoalResponse> {
        return this.setThreadGoal(params);
    }

    async ['thread/goal/get'](params: CyberVinciThreadGoalQueryParams): Promise<CyberVinciThreadGoalResponse> {
        return this.getThreadGoal(params);
    }

    async ['thread/goal/clear'](params: CyberVinciThreadGoalQueryParams): Promise<CyberVinciThreadGoalResponse> {
        return this.clearThreadGoal(params);
    }

    async ['thread/goal/pause'](params: CyberVinciThreadGoalQueryParams): Promise<CyberVinciThreadGoalResponse> {
        return this.pauseThreadGoal(params);
    }

    async ['thread/goal/resume'](params: CyberVinciThreadGoalQueryParams): Promise<CyberVinciThreadGoalResponse> {
        return this.resumeThreadGoal(params);
    }

    async ['thread/goal/budget'](params: CyberVinciThreadGoalBudgetParams): Promise<CyberVinciThreadGoalResponse> {
        return this.setThreadGoalBudget(params);
    }

    async ['thread/goal/status'](params: CyberVinciThreadGoalQueryParams): Promise<CyberVinciThreadGoalResponse> {
        return this.getThreadGoalStatus(params);
    }

    protected async delegateThreadGoalClient(
        method: 'setThreadGoal' | 'getThreadGoal' | 'clearThreadGoal' | 'pauseThreadGoal' | 'resumeThreadGoal' | 'setThreadGoalBudget' | 'getThreadGoalStatus',
        params: CyberVinciThreadGoalSetParams | CyberVinciThreadGoalQueryParams | CyberVinciThreadGoalBudgetParams
    ): Promise<CyberVinciThreadGoalResponse> {
        const handler = this.client?.[method] as ((value: typeof params) => Promise<CyberVinciThreadGoalResponse>) | undefined;
        if (!handler) {
            return {
                ok: false,
                message: 'No frontend client is connected to the CyberVinci Virtual Goal RPC bridge.'
            };
        }
        return handler.call(this.client, params);
    }

    async listAgents(): Promise<CyberVinciAgentSummary[]> {
        return this.listAgencyAgents();
    }

    async readAgent(id: string): Promise<CyberVinciAgent | undefined> {
        return this.readAgencyAgent(id);
    }

    async getAgentProfilePath(id: string): Promise<CyberVinciCatalogWriteResult> {
        const resolved = await this.resolveAgencyAgentFile(id);
        if (!resolved) {
            return { ok: false, message: `Agent profile '${id}' was not found.` };
        }
        return {
            ok: true,
            id: resolved.summary.id,
            path: resolved.absolutePath,
            message: `Agent profile '${resolved.summary.name}' is stored at ${resolved.absolutePath}.`
        };
    }

    async duplicateAgentProfileToUser(id: string): Promise<CyberVinciCatalogWriteResult> {
        const resolved = await this.resolveAgencyAgentFile(id);
        if (!resolved) {
            return { ok: false, message: `Agent profile '${id}' was not found.` };
        }
        const userCategory = path.join('_user', resolved.summary.category || 'general');
        const outputDir = path.join(resolved.root, userCategory);
        const sourceFileName = path.basename(resolved.summary.relativePath, '.md');
        const outputBaseName = this.safeCatalogFileName(sourceFileName || resolved.summary.name || resolved.summary.id);
        const outputPath = await this.uniqueMarkdownOutputPath(outputDir, outputBaseName);
        const content = await fs.readFile(resolved.absolutePath, 'utf8');
        await fs.mkdir(outputDir, { recursive: true });
        await fs.writeFile(outputPath, content, 'utf8');
        const relativePath = path.relative(resolved.root, outputPath).split(path.sep).join('/');
        return {
            ok: true,
            id: this.normalizeId(relativePath),
            path: outputPath,
            paths: [outputPath],
            message: `Created editable Agent profile copy '${relativePath}' at ${outputPath}.`
        };
    }

    async getAgentCatalog(): Promise<CyberVinciAgentCatalog> {
        const [agents, manifest] = await Promise.all([
            this.listAgents(),
            this.getDeclarativeChatAgentManifest()
        ]);
        return {
            version: CYBERVINCI_AGENT_CATALOG_VERSION,
            agents,
            chatAgents: manifest.agents,
            tools: manifest.tools ?? [],
            playbooks: manifest.playbooks ?? [],
            diagnostics: manifest.diagnostics ?? []
        };
    }

    async listTools(): Promise<CyberVinciToolDefinition[]> {
        const manifest = await this.getDeclarativeChatAgentManifest();
        return manifest.tools ?? [];
    }

    async listPlaybooks(): Promise<CyberVinciPlaybookSummary[]> {
        const manifest = await this.getDeclarativeChatAgentManifest();
        return (manifest.playbooks ?? []).map(playbook => ({
            id: playbook.id,
            name: playbook.name,
            description: playbook.description,
            category: playbook.category ?? 'General',
            source: playbook.source,
            sourcePath: playbook.sourcePath,
            enabled: playbook.enabled
        })).sort((left, right) => left.category.localeCompare(right.category) || left.name.localeCompare(right.name));
    }

    async getPlaybook(id: string): Promise<CyberVinciPlaybookDefinition | undefined> {
        const manifest = await this.getDeclarativeChatAgentManifest();
        return manifest.playbooks?.find(playbook => playbook.id === id);
    }

    async getCatalogDiagnostics(): Promise<CyberVinciCatalogDiagnostic[]> {
        const manifest = await this.getDeclarativeChatAgentManifest();
        return manifest.diagnostics ?? [];
    }

    async getCatalogLocations(): Promise<CyberVinciCatalogLocations> {
        const root = await this.resolveCatalogRoot();
        return root
            ? {
                root,
                system: path.join(root, 'system'),
                systemOverrides: path.join(root, 'system-overrides'),
                user: path.join(root, 'user')
            }
            : {};
    }

    async restoreSystemOverride(kind: CyberVinciCatalogItemKind, id: string): Promise<CyberVinciCatalogRestoreResult> {
        const root = await this.resolveCatalogRoot();
        const normalizedId = id.trim();
        if (!root || !normalizedId) {
            return { ok: false, message: 'Catalog root or override id is not available.' };
        }
        const overridesRoot = path.join(root, 'system-overrides');
        if (!await this.pathExists(overridesRoot)) {
            return { ok: false, message: 'No system-overrides catalog directory exists.' };
        }
        const files = await this.collectCatalogFiles(overridesRoot);
        const removedFiles: string[] = [];
        const updatedFiles: string[] = [];
        const diagnostics: CyberVinciCatalogDiagnostic[] = [];
        const key = this.catalogCollectionKey(kind);
        for (const file of files) {
            const parsed = await this.readCatalogFile(file);
            const update = this.removeCatalogOverride(parsed, key, normalizedId);
            if (!update.changed) {
                continue;
            }
            if (update.removeFile) {
                await fs.unlink(file);
                removedFiles.push(file);
            } else {
                await fs.writeFile(file, this.stringifyCatalogFile(file, update.value), 'utf8');
                updatedFiles.push(file);
            }
        }
        this.cachedCatalogRoot = undefined;
        const changed = removedFiles.length + updatedFiles.length;
        if (!changed) {
            diagnostics.push({
                severity: 'warning',
                id: normalizedId,
                source: 'system-overrides',
                message: `No system override ${kind} '${normalizedId}' was found.`
            });
        }
        return {
            ok: changed > 0,
            message: changed > 0
                ? `Restored bundled ${kind} '${normalizedId}' by removing ${changed} override file change(s).`
                : `No system override ${kind} '${normalizedId}' was found.`,
            removedFiles,
            updatedFiles,
            diagnostics
        };
    }

    async deleteUserCatalogItem(kind: CyberVinciCatalogItemKind, id: string): Promise<CyberVinciCatalogRestoreResult> {
        const root = await this.resolveCatalogRoot();
        const normalizedId = id.trim();
        if (!root || !normalizedId) {
            return { ok: false, message: 'Catalog root or user item id is not available.' };
        }
        const userRoot = path.join(root, 'user');
        if (!await this.pathExists(userRoot)) {
            return { ok: false, message: 'No user catalog directory exists.' };
        }
        const files = await this.collectCatalogFiles(userRoot);
        const removedFiles: string[] = [];
        const updatedFiles: string[] = [];
        const diagnostics: CyberVinciCatalogDiagnostic[] = [];
        const key = this.catalogCollectionKey(kind);
        for (const file of files) {
            const parsed = await this.readCatalogFile(file);
            const update = this.removeCatalogOverride(parsed, key, normalizedId);
            if (!update.changed) {
                continue;
            }
            if (update.removeFile) {
                await fs.unlink(file);
                removedFiles.push(file);
            } else {
                await fs.writeFile(file, this.stringifyCatalogFile(file, update.value), 'utf8');
                updatedFiles.push(file);
            }
        }
        this.cachedCatalogRoot = undefined;
        const changed = removedFiles.length + updatedFiles.length;
        if (!changed) {
            diagnostics.push({
                severity: 'warning',
                id: normalizedId,
                source: 'user',
                message: `No user ${kind} '${normalizedId}' was found.`
            });
        }
        return {
            ok: changed > 0,
            message: changed > 0
                ? `Deleted user ${kind} '${normalizedId}' by applying ${changed} catalog file change(s).`
                : `No user ${kind} '${normalizedId}' was found.`,
            removedFiles,
            updatedFiles,
            diagnostics
        };
    }

    async duplicateCatalogItemToUser(kind: CyberVinciCatalogItemKind, id: string): Promise<CyberVinciCatalogWriteResult> {
        const root = await this.resolveCatalogRoot();
        if (!root) {
            return { ok: false, message: 'Catalog root is not available.' };
        }
        const item = await this.findCatalogItem(kind, id);
        if (!item) {
            return { ok: false, message: `${kind} '${id}' was not found in the catalog.` };
        }
        const duplicate = this.copyCatalogItemForUser(kind, item);
        duplicate.id = await this.uniqueCatalogId(kind, String(duplicate.id));
        const companionPlaybookPath = kind === 'agent'
            ? await this.materializeEditableNativeAgentPlaybook(root, duplicate, item)
            : undefined;
        const outputPath = path.join(root, 'user', this.catalogCollectionKey(kind), `${this.safeCatalogFileName(String(duplicate.id))}.yml`);
        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        await fs.writeFile(outputPath, this.stringifyCatalogFile(outputPath, { [this.catalogCollectionKey(kind)]: [duplicate] }), 'utf8');
        this.cachedCatalogRoot = undefined;
        return {
            ok: true,
            id: String(duplicate.id),
            path: outputPath,
            paths: [outputPath, companionPlaybookPath].filter((candidate): candidate is string => !!candidate),
            message: `Created user ${kind} copy '${duplicate.id}' at ${outputPath}.${companionPlaybookPath ? ` Editable Playbook: ${companionPlaybookPath}.` : ''}`
        };
    }

    async createUserAgentCopy(agent: CyberVinciDeclarativeChatAgent): Promise<CyberVinciCatalogWriteResult> {
        const root = await this.resolveCatalogRoot();
        if (!root) {
            return { ok: false, message: 'Catalog root is not available.' };
        }
        const validated = this.validator.validateAgent(agent, `runtime-agent:${agent.id}`);
        if (!validated.value) {
            return {
                ok: false,
                message: `Runtime Agent '${agent.id ?? '<unknown>'}' could not be converted to a user catalog copy.`,
                diagnostics: validated.diagnostics
            };
        }
        const duplicate = this.copyCatalogItemForUser('agent', validated.value as unknown as Record<string, unknown>);
        duplicate.id = await this.uniqueCatalogId('agent', String(duplicate.id));
        const companionPlaybookPath = await this.materializeEditableNativeAgentPlaybook(root, duplicate, validated.value as unknown as Record<string, unknown>);
        const outputPath = path.join(root, 'user', 'agents', `${this.safeCatalogFileName(String(duplicate.id))}.yml`);
        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        await fs.writeFile(outputPath, this.stringifyCatalogFile(outputPath, { agents: [duplicate] }), 'utf8');
        this.cachedCatalogRoot = undefined;
        return {
            ok: true,
            id: String(duplicate.id),
            path: outputPath,
            paths: [outputPath, companionPlaybookPath].filter((candidate): candidate is string => !!candidate),
            diagnostics: validated.diagnostics,
            message: `Created user agent copy '${duplicate.id}' at ${outputPath}.${companionPlaybookPath ? ` Editable Playbook: ${companionPlaybookPath}.` : ''}`
        };
    }

    async createSystemOverride(kind: CyberVinciCatalogItemKind, id: string): Promise<CyberVinciCatalogWriteResult> {
        const root = await this.resolveCatalogRoot();
        if (!root) {
            return { ok: false, message: 'Catalog root is not available.' };
        }
        const item = await this.findCatalogItem(kind, id);
        if (!item) {
            return { ok: false, message: `${kind} '${id}' was not found in the catalog.` };
        }
        const override = this.copyCatalogItemForSystemOverride(item);
        const outputPath = path.join(root, 'system-overrides', this.catalogCollectionKey(kind), `${this.safeCatalogFileName(id)}.yml`);
        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        await fs.writeFile(outputPath, this.stringifyCatalogFile(outputPath, { [this.catalogCollectionKey(kind)]: [override] }), 'utf8');
        this.cachedCatalogRoot = undefined;
        return {
            ok: true,
            id: String(override.id),
            path: outputPath,
            message: `Created system override for ${kind} '${id}' at ${outputPath}.`
        };
    }

    async assignAgentDefaultPlaybook(agentId: string, playbookId: string): Promise<CyberVinciCatalogWriteResult> {
        const root = await this.resolveCatalogRoot();
        const normalizedAgentId = agentId.trim();
        const normalizedPlaybookId = playbookId.trim();
        if (!root || !normalizedAgentId || !normalizedPlaybookId) {
            return { ok: false, message: 'Catalog root, agent id, and playbook id are required.' };
        }
        const [agent, playbook] = await Promise.all([
            this.findCatalogItem('agent', normalizedAgentId),
            this.findCatalogItem('playbook', normalizedPlaybookId)
        ]);
        if (!agent) {
            return { ok: false, message: `Agent '${normalizedAgentId}' was not found in the catalog.` };
        }
        if (!playbook) {
            return { ok: false, message: `Playbook '${normalizedPlaybookId}' was not found in the catalog.` };
        }

        const source = typeof agent.source === 'string' ? agent.source : undefined;
        const sourcePath = typeof agent.sourcePath === 'string' ? agent.sourcePath : undefined;
        let outputPath: string;
        if (source === 'user' && sourcePath) {
            const rootPath = path.resolve(root);
            outputPath = path.resolve(rootPath, ...sourcePath.split(/[\\/]+/g));
            const outputPathKey = outputPath.toLowerCase();
            const rootPathKey = rootPath.toLowerCase();
            if (outputPathKey !== rootPathKey && !outputPathKey.startsWith(`${rootPathKey}${path.sep}`)) {
                return { ok: false, message: `Agent '${normalizedAgentId}' source path is outside the catalog root.` };
            }
            const parsed = await this.readCatalogFile(outputPath);
            const update = this.updateCatalogItemInParsed(parsed, 'agents', normalizedAgentId, item => this.assignPlaybookToAgentRecord(item, normalizedPlaybookId));
            if (!update.changed) {
                return { ok: false, message: `Agent '${normalizedAgentId}' was not found in ${sourcePath}.` };
            }
            await fs.writeFile(outputPath, this.stringifyCatalogFile(outputPath, update.value), 'utf8');
        } else {
            const override = this.assignPlaybookToAgentRecord(this.copyCatalogItemForSystemOverride(agent), normalizedPlaybookId);
            outputPath = path.join(root, 'system-overrides', 'agents', `${this.safeCatalogFileName(normalizedAgentId)}.yml`);
            await fs.mkdir(path.dirname(outputPath), { recursive: true });
            await fs.writeFile(outputPath, this.stringifyCatalogFile(outputPath, { agents: [override] }), 'utf8');
        }
        this.cachedCatalogRoot = undefined;
        return {
            ok: true,
            id: normalizedAgentId,
            path: outputPath,
            message: `Assigned Playbook '${normalizedPlaybookId}' as the default for Agent '${normalizedAgentId}' at ${outputPath}.`
        };
    }

    async listMarketplaceItems(): Promise<CyberVinciMarketplaceItem[]> {
        const [manifest, explicitItems] = await Promise.all([
            this.getDeclarativeChatAgentManifest(),
            this.readMarketplaceItems()
        ]);
        const installedUserIds = new Set([
            ...manifest.agents.filter(item => item.source === 'user').map(item => item.id),
            ...(manifest.tools ?? []).filter(item => item.source === 'user').map(item => item.id),
            ...(manifest.playbooks ?? []).filter(item => item.source === 'user').map(item => item.id)
        ]);
        const installedMarketplaceItemIds = await this.installedNonCatalogMarketplaceItemIds();
        const generated: CyberVinciMarketplaceItem[] = [
            ...manifest.agents
                .filter(agent => agent.source !== 'user')
                .map(agent => this.catalogMarketplaceItem('agents', 'agent', agent.id, agent.name, agent.description, agent.tags, agent.sourcePath, installedUserIds)),
            ...(manifest.tools ?? [])
                .filter(tool => tool.source !== 'user')
                .map(tool => this.catalogMarketplaceItem('tools', 'tool', tool.id, tool.name, tool.description, tool.category ? [tool.category] : undefined, tool.sourcePath, installedUserIds)),
            ...(manifest.playbooks ?? [])
                .filter(playbook => playbook.source !== 'user')
                .map(playbook => this.catalogMarketplaceItem('playbooks', 'playbook', playbook.id, playbook.name, playbook.description, playbook.tags, playbook.sourcePath, installedUserIds))
        ];
        const byId = new Map<string, CyberVinciMarketplaceItem>();
        for (const item of [...generated, ...explicitItems]) {
            byId.set(item.id, {
                ...item,
                installed: item.installed ?? (item.installTarget && this.isCatalogInstallTarget(item.installTarget.kind)
                    ? installedUserIds.has(this.userCopyId(item.installTarget.kind, item.installTarget.id))
                    : installedMarketplaceItemIds.has(item.id))
            });
        }
        return [...byId.values()].sort((left, right) => left.collection.localeCompare(right.collection) || left.name.localeCompare(right.name));
    }

    async installMarketplaceItem(id: string): Promise<CyberVinciCatalogWriteResult> {
        const item = (await this.listMarketplaceItems()).find(candidate => candidate.id === id);
        if (!item) {
            return { ok: false, message: `Marketplace item '${id}' was not found.` };
        }
        const target = item.installTarget;
        if (!target) {
            return { ok: false, message: `Marketplace item '${id}' does not define an install target.` };
        }
        let result: CyberVinciCatalogWriteResult;
        if (target.kind === 'agent' || target.kind === 'tool' || target.kind === 'playbook') {
            if (target.action === 'create-override') {
                result = await this.createSystemOverride(target.kind, target.id);
            } else {
                result = await this.duplicateCatalogItemToUser(target.kind, target.id);
            }
            return this.withMarketplaceInstallAudit(item, target, result);
        }
        result = await this.installNonCatalogMarketplaceItem(item, target);
        return this.withMarketplaceInstallAudit(item, target, result);
    }

    async listAgencyAgents(): Promise<CyberVinciAgencyAgentSummary[]> {
        const root = await this.resolveAgencyAgentsRoot();
        if (!root) {
            return [];
        }
        const files = await this.collectMarkdownFiles(root);
        const summaries = await Promise.all(files
            .filter(file => !path.basename(file).toLowerCase().startsWith('readme'))
            .map(file => this.readSummary(root, file)));
        return summaries
            .filter((summary): summary is CyberVinciAgencyAgentSummary => !!summary)
            .sort((left, right) => left.category.localeCompare(right.category) || left.name.localeCompare(right.name));
    }

    async readAgencyAgent(id: string): Promise<CyberVinciAgencyAgent | undefined> {
        const resolved = await this.resolveAgencyAgentFile(id);
        if (!resolved) {
            return undefined;
        }
        const content = await fs.readFile(resolved.absolutePath, 'utf8');
        return { ...resolved.summary, content };
    }

    protected async resolveAgencyAgentFile(id: string): Promise<{ root: string; summary: CyberVinciAgencyAgentSummary; absolutePath: string } | undefined> {
        const root = await this.resolveAgencyAgentsRoot();
        if (!root) {
            return undefined;
        }
        const normalizedId = this.normalizeId(id);
        const normalizedPath = id.replace(/\\/g, '/');
        const summaries = await this.listAgencyAgents();
        const summary = summaries.find(candidate => candidate.id === normalizedId || candidate.relativePath === normalizedPath);
        if (!summary) {
            return undefined;
        }
        const absolutePath = path.resolve(root, ...summary.relativePath.split('/'));
        if (!this.pathContainsOrEquals(root, absolutePath)) {
            return undefined;
        }
        return { root, summary, absolutePath };
    }

    async getDeclarativeChatAgentManifest(): Promise<CyberVinciDeclarativeChatAgentManifest> {
        const fileManifest = await this.readDeclarativeChatAgentManifest();
        const catalogFragments = await this.readCatalogFragments();
        const agentById = new Map<string, CyberVinciDeclarativeChatAgent>();
        const toolById = new Map<string, CyberVinciToolDefinition>();
        const playbookById = new Map<string, CyberVinciPlaybookDefinition>();
        for (const agent of BUILT_IN_CHAT_AGENTS) {
            agentById.set(agent.id, agent);
        }
        for (const agent of fileManifest?.agents ?? []) {
            agentById.set(agent.id, { ...agentById.get(agent.id), ...agent });
        }
        for (const agent of catalogFragments.agents) {
            const existing = agentById.get(agent.id);
            if (!this.shouldMergeCatalogFragment('Agent', agent, existing, catalogFragments.diagnostics)) {
                continue;
            }
            agentById.set(agent.id, { ...agentById.get(agent.id), ...agent });
        }
        for (const [id, agent] of agentById) {
            agentById.set(id, this.withAgentDefaults(agent));
        }
        for (const tool of BUILT_IN_TOOLS) {
            toolById.set(tool.id, tool);
        }
        for (const tool of fileManifest?.tools ?? []) {
            toolById.set(tool.id, { ...toolById.get(tool.id), ...tool });
        }
        for (const tool of catalogFragments.tools) {
            const existing = toolById.get(tool.id);
            if (!this.shouldMergeCatalogFragment('Tool', tool, existing, catalogFragments.diagnostics)) {
                continue;
            }
            toolById.set(tool.id, { ...toolById.get(tool.id), ...tool });
        }
        for (const playbook of BUILT_IN_PLAYBOOKS) {
            playbookById.set(playbook.id, playbook);
        }
        for (const playbook of fileManifest?.playbooks ?? []) {
            playbookById.set(playbook.id, { ...playbookById.get(playbook.id), ...playbook });
        }
        for (const playbook of catalogFragments.playbooks) {
            const existing = playbookById.get(playbook.id);
            if (!this.shouldMergeCatalogFragment('Playbook', playbook, existing, catalogFragments.diagnostics)) {
                continue;
            }
            playbookById.set(playbook.id, { ...playbookById.get(playbook.id), ...playbook });
        }
        this.validateCatalogReferences(agentById, toolById, playbookById, catalogFragments.diagnostics);
        return {
            version: 1,
            agents: [...agentById.values()],
            tools: [...toolById.values()],
            playbooks: [...playbookById.values()],
            diagnostics: [
                ...(fileManifest?.diagnostics ?? []),
                ...catalogFragments.diagnostics
            ]
        };
    }

    async executeDeclarativeTool(toolId: string, argsJson: string): Promise<CyberVinciDeclarativeToolExecutionResult> {
        const manifest = await this.getDeclarativeChatAgentManifest();
        const tool = manifest.tools?.find(candidate => candidate.id === toolId);
        if (!tool) {
            throw new Error(`Declarative tool '${toolId}' is not configured.`);
        }
        const command = tool.command ?? (tool.entry?.type === 'command' || tool.entry?.type === 'script' ? tool.entry.command : undefined);
        if (!command) {
            if (tool.implementation === 'host') {
                return {
                    exitCode: 0,
                    stdout: `Host tool '${tool.id}' is registered for the CyberVinci Playbook runtime and is not executed through the command bridge.`,
                    stderr: ''
                };
            }
            throw new Error(`Declarative tool '${toolId}' does not define a command.`);
        }
        if (tool.shell === true && tool.policy?.allowShell !== true) {
            throw new Error(`Declarative tool '${toolId}' requests shell execution but policy.allowShell is not enabled.`);
        }
        const allowedCommands = tool.policy?.allowedCommands?.map(item => item.trim()).filter(Boolean);
        if (allowedCommands?.length && !allowedCommands.includes(command)) {
            throw new Error(`Declarative tool '${toolId}' command '${command}' is not in policy.allowedCommands.`);
        }
        const args = tool.args ?? (Array.isArray(tool.entry?.args) ? tool.entry.args.map(String) : []);
        const cwd = tool.cwd ? this.resolveConfiguredPath(tool.cwd) : process.cwd();
        this.validateCommandToolPathPolicy(toolId, cwd, tool.policy?.allowedPaths, tool.policy?.deniedPaths);
        const timeoutMs = Math.max(1, tool.timeoutMs ?? tool.policy?.timeoutMs ?? DECLARATIVE_TOOL_TIMEOUT);
        return new Promise((resolve, reject) => {
            const child = spawn(command, args, {
                cwd,
                shell: tool.shell ?? false,
                env: {
                    ...process.env,
                    ...(tool.env ?? {}),
                    CYBERVINCI_TOOL_ID: tool.id,
                    CYBERVINCI_TOOL_ARGS: argsJson
                }
            });
            let stdout = '';
            let stderr = '';
            const timer = setTimeout(() => {
                child.kill();
                reject(new Error(`Declarative tool '${toolId}' timed out after ${timeoutMs}ms.`));
            }, timeoutMs);
            child.stdout?.on('data', chunk => stdout += chunk.toString());
            child.stderr?.on('data', chunk => stderr += chunk.toString());
            child.on('error', error => {
                clearTimeout(timer);
                reject(error);
            });
            child.on('close', exitCode => {
                clearTimeout(timer);
                resolve({ exitCode, stdout, stderr });
            });
        });
    }

    protected withAgentDefaults(agent: CyberVinciDeclarativeChatAgent): CyberVinciDeclarativeChatAgent {
        if (agent.kind !== 'native' && agent.kind !== 'delegate') {
            return agent;
        }
        const playbooks = new Set(agent.playbooks ?? []);
        const defaultPlaybook = agent.defaultPlaybook ?? this.nativeAgentPlaybookId(agent.sourceAgentId ?? agent.id);
        playbooks.add(defaultPlaybook);
        const tools = new Set(agent.tools ?? []);
        tools.add('core.agent.describe');
        tools.add('core.agent.preflight');
        tools.add('system.agent.nativeMcpRequirements');
        return {
            ...agent,
            defaultPlaybook,
            playbooks: [...playbooks],
            tools: [...tools],
            capabilityProfile: {
                ...(agent.capabilityProfile ?? {}),
                tools: [
                    {
                        id: 'core.agent.describe',
                        kind: 'tool',
                        source: 'playbook',
                        required: true,
                        description: 'Resolves selected agent metadata and declarative capability profile.'
                    },
                    {
                        id: 'core.agent.preflight',
                        kind: 'guard',
                        source: 'playbook',
                        required: true,
                        description: 'Checks selected playbook, provider readiness, and Theia tool bridge availability.'
                    },
                    {
                        id: 'system.agent.nativeMcpRequirements',
                        kind: 'guard',
                        source: 'playbook',
                        required: false,
                        description: 'Reports MCP server requirements inferred from native prompts and known native setup rules.'
                    },
                    ...(agent.capabilityProfile?.tools ?? [])
                ],
                guards: [
                    {
                        id: 'core.agent.preflight',
                        kind: 'guard',
                        source: 'playbook',
                        required: true,
                        description: 'Deterministic readiness check before the autonomous agent playbook.'
                    },
                    {
                        id: 'system.agent.nativeMcpRequirements',
                        kind: 'guard',
                        source: 'playbook',
                        required: false,
                        description: 'Deterministic MCP requirement report before the autonomous agent playbook.'
                    },
                    ...(agent.capabilityProfile?.guards ?? [])
                ],
                variables: agent.capabilityProfile?.variables ?? agent.variables,
                functions: agent.capabilityProfile?.functions ?? agent.functions,
                modes: agent.capabilityProfile?.modes ?? agent.modes?.map(mode => mode.id),
                languageModels: agent.capabilityProfile?.languageModels ?? agent.languageModelRequirements?.map(requirement => requirement.name ?? requirement.identifier ?? requirement.purpose)
            }
        };
    }

    protected shouldMergeCatalogFragment(
        kind: 'Agent' | 'Tool' | 'Playbook',
        item: { id: string; source?: string },
        existing: unknown,
        diagnostics: CyberVinciCatalogDiagnostic[]
    ): boolean {
        const lowerKind = kind.toLocaleLowerCase();
        if (item.source === 'user' && (item.id.startsWith('core.') || item.id.startsWith('system.'))) {
            diagnostics.push({
                severity: 'warning',
                id: item.id,
                message: `${kind} '${item.id}' cannot override a protected core/system ${lowerKind} from the user catalog. Use system-overrides for system items or user.* for user items.`,
                source: item.source
            });
            return false;
        }
        if (item.source === 'user' && !item.id.startsWith('user.')) {
            diagnostics.push({
                severity: 'warning',
                id: item.id,
                message: `User ${lowerKind} '${item.id}' must use the user.* namespace.`,
                source: item.source
            });
            return false;
        }
        if (item.source === 'system-override' && !existing) {
            diagnostics.push({
                severity: 'warning',
                id: item.id,
                message: `System override '${item.id}' ignored because there is no bundled ${lowerKind} with that id.`,
                source: item.source
            });
            return false;
        }
        return true;
    }

    protected validateCatalogReferences(
        agents: Map<string, CyberVinciDeclarativeChatAgent>,
        tools: Map<string, CyberVinciToolDefinition>,
        playbooks: Map<string, CyberVinciPlaybookDefinition>,
        diagnostics: CyberVinciCatalogDiagnostic[]
    ): void {
        const emitted = new Set<string>();
        const warn = (id: string | undefined, message: string, source?: string): void => {
            const key = `${id ?? ''}\0${message}`;
            if (emitted.has(key)) {
                return;
            }
            emitted.add(key);
            diagnostics.push({
                severity: 'warning',
                id,
                source,
                message
            });
        };
        const hasPlaybook = (id: string): boolean =>
            playbooks.has(id) || (id.startsWith(NATIVE_AGENT_PLAYBOOK_PREFIX) && playbooks.has(NATIVE_AGENT_DELEGATE_PLAYBOOK_ID));
        for (const agent of agents.values()) {
            const source = agent.sourcePath ?? agent.source;
            if (agent.defaultPlaybook && !hasPlaybook(agent.defaultPlaybook)) {
                warn(agent.id, `Agent '${agent.id}' defaultPlaybook '${agent.defaultPlaybook}' does not exist.`, source);
            }
            for (const playbookId of agent.playbooks ?? []) {
                if (!hasPlaybook(playbookId)) {
                    warn(agent.id, `Agent '${agent.id}' references missing playbook '${playbookId}'.`, source);
                }
            }
            for (const toolId of agent.tools ?? []) {
                if (!tools.has(toolId)) {
                    warn(agent.id, `Agent '${agent.id}' references missing tool '${toolId}'.`, source);
                }
            }
            for (const capability of [
                ...(agent.capabilityProfile?.tools ?? []),
                ...(agent.capabilityProfile?.guards ?? [])
            ]) {
                if (capability.id && !tools.has(capability.id)) {
                    warn(agent.id, `Agent '${agent.id}' capabilityProfile references missing tool '${capability.id}'.`, source);
                }
            }
        }
        for (const tool of tools.values()) {
            const source = tool.sourcePath ?? tool.source;
            for (const step of tool.steps ?? []) {
                if (step.tool && !tools.has(step.tool)) {
                    warn(tool.id, `Composite tool '${tool.id}' references missing step tool '${step.tool}'.`, source);
                }
            }
        }
        for (const playbook of playbooks.values()) {
            const source = playbook.sourcePath ?? playbook.source;
            for (const toolId of [
                ...(playbook.tools ?? []),
                ...(playbook.guards ?? []),
                ...(playbook.uses?.tools ?? []),
                ...(playbook.uses?.guards ?? [])
            ]) {
                if (toolId && !tools.has(toolId)) {
                    warn(playbook.id, `Playbook '${playbook.id}' references missing tool '${toolId}'.`, source);
                }
            }
            for (const state of playbook.states ?? []) {
                const toolId = state.type === 'guard' ? state.guard ?? state.tool : state.type === 'tool' ? state.tool : undefined;
                if (toolId && !tools.has(toolId)) {
                    warn(playbook.id, `Playbook '${playbook.id}' state '${state.id}' references missing tool '${toolId}'.`, source);
                }
                const childPlaybookId = state.type === 'playbook' ? state.playbook ?? state.playbookId : undefined;
                if (childPlaybookId && !hasPlaybook(childPlaybookId)) {
                    warn(playbook.id, `Playbook '${playbook.id}' state '${state.id}' references missing playbook '${childPlaybookId}'.`, source);
                }
            }
        }
    }

    protected nativeAgentPlaybookId(agentId: string): string {
        return `${NATIVE_AGENT_PLAYBOOK_PREFIX}${agentId}`;
    }

    protected async readSummary(root: string, absolutePath: string): Promise<CyberVinciAgencyAgentSummary | undefined> {
        try {
            const content = await fs.readFile(absolutePath, 'utf8');
            const relativePath = path.relative(root, absolutePath).split(path.sep).join('/');
            const segments = relativePath.split('/');
            const category = segments.length > 1 ? segments[0] : 'general';
            const fileName = path.basename(relativePath, '.md');
            const frontmatter = this.extractFrontmatter(content);
            const title = frontmatter.name ?? this.extractTitle(content) ?? this.titleFromFileName(fileName);
            return {
                id: this.normalizeId(relativePath),
                name: title,
                category,
                relativePath,
                description: frontmatter.description ?? this.extractDescription(content, title)
            };
        } catch {
            return undefined;
        }
    }

    protected extractFrontmatter(content: string): { name?: string; description?: string } {
        const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        if (!match) {
            return {};
        }
        const result: { name?: string; description?: string } = {};
        for (const line of match[1].split(/\r?\n/)) {
            const property = line.match(/^([a-zA-Z][\w-]*)\s*:\s*(.+)$/);
            if (!property) {
                continue;
            }
            const key = property[1].toLowerCase();
            const value = this.cleanFrontmatterValue(property[2]);
            if (key === 'name') {
                result.name = value;
            } else if (key === 'description') {
                result.description = value;
            }
        }
        return result;
    }

    protected cleanFrontmatterValue(value: string): string {
        return value
            .trim()
            .replace(/^['"]|['"]$/g, '')
            .trim();
    }

    protected extractTitle(content: string): string | undefined {
        const heading = this.stripFrontmatter(content).match(/^#\s+(.+)$/m)?.[1]?.trim();
        return heading || undefined;
    }

    protected extractDescription(content: string, title: string): string | undefined {
        const normalizedTitle = title.toLowerCase();
        const lines = this.stripFrontmatter(content)
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(line => line
                && !line.startsWith('#')
                && !line.startsWith('---')
                && !/^(name|description|color|emoji|vibe)\s*:/i.test(line)
                && line.toLowerCase() !== normalizedTitle);
        return lines[0]?.replace(/[*_`]/g, '').slice(0, 220);
    }

    protected stripFrontmatter(content: string): string {
        return content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
    }

    protected titleFromFileName(fileName: string): string {
        return fileName
            .split(/[-_]+/g)
            .filter(Boolean)
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
    }

    protected normalizeId(value: string): string {
        return value
            .replace(/\\/g, '/')
            .replace(/\.md$/i, '')
            .toLowerCase();
    }

    protected async collectMarkdownFiles(root: string): Promise<string[]> {
        const entries = await fs.readdir(root, { withFileTypes: true });
        const nested = await Promise.all(entries.map(async entry => {
            const absolute = path.join(root, entry.name);
            if (entry.isDirectory()) {
                return this.collectMarkdownFiles(absolute);
            }
            return entry.isFile() && entry.name.toLowerCase().endsWith('.md') ? [absolute] : [];
        }));
        return nested.flat();
    }

    protected async resolveAgencyAgentsRoot(): Promise<string | undefined> {
        if (this.cachedRoot && await this.pathExists(this.cachedRoot)) {
            return this.cachedRoot;
        }
        const explicit = process.env.CYBERVINCI_AGENCY_AGENTS_DIR
            ? this.resolveConfiguredPath(process.env.CYBERVINCI_AGENCY_AGENTS_DIR)
            : undefined;
        if (explicit) {
            const explicitCandidates = [
                explicit,
                ...AGENCY_AGENTS_RELATIVE_PATHS.map(relativePath => path.join(explicit, relativePath))
            ];
            for (const candidate of explicitCandidates) {
                if (await this.pathExists(candidate)) {
                    this.cachedRoot = candidate;
                    return candidate;
                }
            }
        }
        const candidates = [
            ...this.parentCandidates(process.cwd()),
            ...this.parentCandidates(__dirname)
        ];
        for (const base of candidates) {
            for (const relativePath of AGENCY_AGENTS_RELATIVE_PATHS) {
                const candidate = base.endsWith(relativePath)
                    ? base
                    : path.join(base, relativePath);
                if (await this.pathExists(candidate)) {
                    this.cachedRoot = candidate;
                    return candidate;
                }
            }
        }
        return undefined;
    }

    protected async readDeclarativeChatAgentManifest(): Promise<CyberVinciDeclarativeChatAgentManifest | undefined> {
        const manifestPath = await this.resolveDeclarativeChatAgentsPath();
        if (!manifestPath) {
            return undefined;
        }
        try {
            const parsed = JSON.parse(await fs.readFile(manifestPath, 'utf8')) as Partial<CyberVinciDeclarativeChatAgentManifest>;
            const diagnostics: CyberVinciCatalogDiagnostic[] = [];
            const agents = Array.isArray(parsed.agents)
                ? parsed.agents.flatMap((agent, index) => {
                    const result = this.validator.validateAgent(agent, `${path.basename(manifestPath)}#agents.${index}`);
                    diagnostics.push(...result.diagnostics);
                    return result.value ? [result.value] : [];
                })
                : [];
            const tools = Array.isArray(parsed.tools)
                ? parsed.tools.flatMap((tool, index) => {
                    const result = this.validator.validateTool(tool, `${path.basename(manifestPath)}#tools.${index}`);
                    diagnostics.push(...result.diagnostics);
                    return result.value ? [result.value] : [];
                })
                : [];
            const playbooks = Array.isArray(parsed.playbooks)
                ? parsed.playbooks.flatMap((playbook, index) => {
                    const result = this.validator.validatePlaybook(playbook, `${path.basename(manifestPath)}#playbooks.${index}`);
                    diagnostics.push(...result.diagnostics);
                    return result.value ? [result.value] : [];
                })
                : [];
            return {
                version: 1,
                agents,
                tools,
                playbooks,
                diagnostics: [
                    ...diagnostics,
                    ...(Array.isArray(parsed.diagnostics)
                        ? parsed.diagnostics.filter(this.isCatalogDiagnostic)
                        : [])
                ]
            };
        } catch (error) {
            throw new Error(`Could not load declarative chat agents from ${manifestPath}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    protected async readCatalogFragments(): Promise<CatalogFragments> {
        const result: CatalogFragments = {
            agents: [],
            tools: [],
            playbooks: [],
            diagnostics: []
        };
        const root = await this.resolveCatalogRoot();
        if (!root) {
            return result;
        }
        for (const sourceEntry of CATALOG_SOURCE_ORDER) {
            const sourceRoot = path.join(root, sourceEntry.directory);
            if (!await this.pathExists(sourceRoot)) {
                continue;
            }
            const files = await this.collectCatalogFiles(sourceRoot);
            for (const file of files) {
                try {
                    this.mergeCatalogObject(result, await this.readCatalogFile(file), sourceEntry.source, path.relative(root, file).split(path.sep).join('/'));
                } catch (error) {
                    result.diagnostics.push({
                        severity: 'error',
                        source: path.relative(root, file).split(path.sep).join('/'),
                        message: error instanceof Error ? error.message : String(error)
                    });
                }
            }
        }
        return result;
    }

    protected async resolveCatalogRoot(): Promise<string | undefined> {
        if (this.cachedCatalogRoot && await this.pathExists(this.cachedCatalogRoot)) {
            return this.cachedCatalogRoot;
        }
        const explicit = process.env.CYBERVINCI_AI_CHAT_CATALOG_DIR;
        const candidates = [
            explicit,
            ...this.packageConfigCandidates(),
            ...this.parentCandidates(process.cwd()).map(base => path.join(base, CHAT_CATALOG_RELATIVE_PATH)),
            ...this.parentCandidates(__dirname).map(base => path.join(base, CHAT_CATALOG_RELATIVE_PATH))
        ].filter((candidate): candidate is string => !!candidate);
        for (const candidate of candidates) {
            if (await this.pathExists(candidate)) {
                this.cachedCatalogRoot = candidate;
                return candidate;
            }
        }
        return undefined;
    }

    protected async collectCatalogFiles(root: string): Promise<string[]> {
        const entries = await fs.readdir(root, { withFileTypes: true });
        const nested = await Promise.all(entries.map(async entry => {
            const absolute = path.join(root, entry.name);
            if (entry.isDirectory()) {
                return this.collectCatalogFiles(absolute);
            }
            return entry.isFile() && /\.(json|ya?ml)$/i.test(entry.name) ? [absolute] : [];
        }));
        return nested.flat().sort((left, right) => left.localeCompare(right));
    }

    protected async readCatalogFile(file: string): Promise<unknown> {
        const content = await fs.readFile(file, 'utf8');
        if (/\.ya?ml$/i.test(file)) {
            return yaml.load(content);
        }
        return JSON.parse(content);
    }

    protected stringifyCatalogFile(file: string, value: unknown): string {
        if (/\.ya?ml$/i.test(file)) {
            return `${yaml.dump(value, { noRefs: true, lineWidth: 120 })}`;
        }
        return `${JSON.stringify(value, undefined, 2)}\n`;
    }

    protected catalogCollectionKey(kind: CyberVinciCatalogItemKind): 'agents' | 'tools' | 'playbooks' {
        switch (kind) {
            case 'agent':
                return 'agents';
            case 'playbook':
                return 'playbooks';
            default:
                return 'tools';
        }
    }

    protected async findCatalogItem(kind: CyberVinciCatalogItemKind, id: string): Promise<Record<string, unknown> | undefined> {
        const manifest = await this.getDeclarativeChatAgentManifest();
        const items = kind === 'agent'
            ? manifest.agents
            : kind === 'playbook'
                ? manifest.playbooks ?? []
                : manifest.tools ?? [];
        const item = items.find(candidate => candidate.id === id);
        return item ? this.cloneCatalogValue(item) as unknown as Record<string, unknown> : undefined;
    }

    protected async readMarketplaceItems(): Promise<CyberVinciMarketplaceItem[]> {
        const root = await this.resolveCatalogRoot();
        if (!root) {
            return [];
        }
        const marketplaceRoot = path.join(root, 'marketplace');
        if (!await this.pathExists(marketplaceRoot)) {
            return [];
        }
        const files = await this.collectCatalogFiles(marketplaceRoot);
        const items: CyberVinciMarketplaceItem[] = [];
        for (const file of files) {
            const parsed = await this.readCatalogFile(file);
            const records = this.marketplaceRecords(parsed);
            for (const [index, record] of records.entries()) {
                const item = this.toMarketplaceItem(record, path.relative(root, file).split(path.sep).join('/'), index);
                if (item) {
                    items.push(item);
                }
            }
        }
        return items;
    }

    protected marketplaceRecords(parsed: unknown): Record<string, unknown>[] {
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return [];
        }
        const record = parsed as Record<string, unknown>;
        if (Array.isArray(record.marketplace)) {
            return record.marketplace.filter(item => this.isRecord(item));
        }
        if (Array.isArray(record.items)) {
            return record.items.filter(item => this.isRecord(item));
        }
        return this.isMarketplaceRecord(record) ? [record] : [];
    }

    protected isMarketplaceRecord(record: Record<string, unknown>): boolean {
        return typeof record.id === 'string'
            && typeof record.name === 'string'
            && typeof record.collection === 'string';
    }

    protected toMarketplaceItem(record: Record<string, unknown>, sourcePath: string, index: number): CyberVinciMarketplaceItem | undefined {
        const collection = this.marketplaceCollection(record.collection);
        if (!collection || typeof record.id !== 'string' || typeof record.name !== 'string') {
            return undefined;
        }
        const installTarget = this.isRecord(record.installTarget)
            ? {
                kind: String(record.installTarget.kind ?? '') as NonNullable<CyberVinciMarketplaceItem['installTarget']>['kind'],
                id: String(record.installTarget.id ?? ''),
                action: typeof record.installTarget.action === 'string'
                    ? record.installTarget.action as NonNullable<CyberVinciMarketplaceItem['installTarget']>['action']
                    : undefined
            }
            : undefined;
        return {
            id: record.id || `${sourcePath}#${index}`,
            name: record.name,
            collection,
            description: typeof record.description === 'string' ? record.description : undefined,
            tags: Array.isArray(record.tags) ? record.tags.filter((tag): tag is string => typeof tag === 'string') : undefined,
            source: 'marketplace',
            sourcePath,
            installTarget: installTarget?.id && installTarget.kind ? installTarget : undefined
        };
    }

    protected marketplaceCollection(value: unknown): CyberVinciMarketplaceCollection | undefined {
        return value === 'agents'
            || value === 'skills'
            || value === 'tools'
            || value === 'playbooks'
            || value === 'flows'
            || value === 'canvas-qa-packs'
            ? value
            : undefined;
    }

    protected isCatalogInstallTarget(kind: unknown): kind is CyberVinciCatalogItemKind {
        return kind === 'agent' || kind === 'tool' || kind === 'playbook';
    }

    protected async installNonCatalogMarketplaceItem(
        item: CyberVinciMarketplaceItem,
        target: NonNullable<CyberVinciMarketplaceItem['installTarget']>
    ): Promise<CyberVinciCatalogWriteResult> {
        const root = await this.resolveCatalogRoot();
        if (!root) {
            return { ok: false, message: 'Catalog root is not available.' };
        }
        const collectionKey = this.nonCatalogMarketplaceCollectionKey(item.collection);
        if (!collectionKey) {
            return {
                ok: false,
                message: `Marketplace install for '${target.kind}' is not supported by collection '${item.collection}'.`,
                path: item.sourcePath
            };
        }
        const outputPath = path.join(root, 'user', collectionKey, `${this.safeCatalogFileName(item.id)}.yml`);
        const record = {
            id: item.id,
            name: item.name,
            collection: item.collection,
            source: 'user',
            sourceMarketplacePath: item.sourcePath,
            installedAt: new Date().toISOString(),
            description: item.description,
            tags: item.tags,
            installTarget: target
        };
        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        await fs.writeFile(outputPath, this.stringifyCatalogFile(outputPath, {
            version: 'cybervinci.marketplace-install/v1',
            marketplaceInstalls: [record]
        }), 'utf8');
        return {
            ok: true,
            id: item.id,
            path: outputPath,
            message: `Installed marketplace ${target.kind} '${target.id}' as editable metadata at ${outputPath}.`
        };
    }

    protected async installedNonCatalogMarketplaceItemIds(): Promise<Set<string>> {
        const root = await this.resolveCatalogRoot();
        const installed = new Set<string>();
        if (!root) {
            return installed;
        }
        for (const collectionKey of ['skills', 'flows', 'canvas-qa-packs']) {
            const collectionRoot = path.join(root, 'user', collectionKey);
            if (!await this.pathExists(collectionRoot)) {
                continue;
            }
            for (const file of await this.collectCatalogFiles(collectionRoot)) {
                const parsed = await this.readCatalogFile(file);
                for (const record of this.marketplaceInstallRecords(parsed)) {
                    if (typeof record.id === 'string' && record.id.trim()) {
                        installed.add(record.id);
                    }
                }
            }
        }
        return installed;
    }

    protected async withMarketplaceInstallAudit(
        item: CyberVinciMarketplaceItem,
        target: NonNullable<CyberVinciMarketplaceItem['installTarget']>,
        result: CyberVinciCatalogWriteResult
    ): Promise<CyberVinciCatalogWriteResult> {
        if (!result.ok) {
            return result;
        }
        try {
            const auditPath = await this.writeMarketplaceInstallAudit(item, target, result);
            return {
                ...result,
                diagnostics: [
                    ...(result.diagnostics ?? []),
                    {
                        severity: 'info',
                        message: `Marketplace install audit written to ${auditPath}.`,
                        source: auditPath,
                        id: 'marketplace.install.audit'
                    }
                ]
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return {
                ...result,
                diagnostics: [
                    ...(result.diagnostics ?? []),
                    {
                        severity: 'warning',
                        message: `Marketplace install audit could not be written: ${message}`,
                        source: item.sourcePath,
                        id: 'marketplace.install.audit.failed'
                    }
                ]
            };
        }
    }

    protected async writeMarketplaceInstallAudit(
        item: CyberVinciMarketplaceItem,
        target: NonNullable<CyberVinciMarketplaceItem['installTarget']>,
        result: CyberVinciCatalogWriteResult
    ): Promise<string> {
        const root = await this.resolveCatalogRoot();
        if (!root) {
            throw new Error('Catalog root is not available.');
        }
        const auditPath = path.join(root, 'user', 'audit', 'marketplace-installs.yml');
        const installedAt = new Date().toISOString();
        const sourceFilePath = item.sourcePath ? path.resolve(root, ...item.sourcePath.split(/[\\/]+/g)) : undefined;
        const outputPath = result.path ? path.resolve(result.path) : undefined;
        const sourceFileSha256 = sourceFilePath && this.pathContainsOrEquals(root, sourceFilePath) && await this.pathExists(sourceFilePath)
            ? await this.fileSha256(sourceFilePath)
            : undefined;
        const marketplaceItemSha256 = this.valueSha256({
            id: item.id,
            name: item.name,
            collection: item.collection,
            description: item.description,
            tags: item.tags,
            sourcePath: item.sourcePath,
            installTarget: item.installTarget
        });
        const outputFileSha256 = outputPath && this.pathContainsOrEquals(root, outputPath) && await this.pathExists(outputPath)
            ? await this.fileSha256(outputPath)
            : undefined;
        const record = {
            id: `marketplace-install-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
            marketplaceItemId: item.id,
            name: item.name,
            collection: item.collection,
            sourcePath: item.sourcePath,
            sourceFileSha256,
            sourceFileSignature: sourceFileSha256 ? `sha256:${sourceFileSha256}` : undefined,
            marketplaceItemSha256,
            marketplaceItemSignature: `sha256:${marketplaceItemSha256}`,
            installTarget: target,
            installedId: result.id,
            outputPath: outputPath ? path.relative(root, outputPath).split(path.sep).join('/') : undefined,
            outputFileSha256,
            outputFileSignature: outputFileSha256 ? `sha256:${outputFileSha256}` : undefined,
            installedAt,
            resultMessage: result.message
        };
        const parsed = await this.pathExists(auditPath)
            ? await this.readCatalogFile(auditPath)
            : undefined;
        const existingRecords = this.marketplaceInstallAuditRecords(parsed);
        await fs.mkdir(path.dirname(auditPath), { recursive: true });
        await fs.writeFile(auditPath, this.stringifyCatalogFile(auditPath, {
            version: 'cybervinci.marketplace-install-audit/v1',
            marketplaceInstallAudit: [...existingRecords, record]
        }), 'utf8');
        return auditPath;
    }

    protected marketplaceInstallAuditRecords(parsed: unknown): Record<string, unknown>[] {
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return [];
        }
        const record = parsed as Record<string, unknown>;
        if (Array.isArray(record.marketplaceInstallAudit)) {
            return record.marketplaceInstallAudit.filter(item => this.isRecord(item));
        }
        if (Array.isArray(record.audit)) {
            return record.audit.filter(item => this.isRecord(item));
        }
        return [];
    }

    protected async fileSha256(filePath: string): Promise<string> {
        return crypto.createHash('sha256').update(await fs.readFile(filePath)).digest('hex');
    }

    protected valueSha256(value: unknown): string {
        return crypto.createHash('sha256').update(this.stableJson(value)).digest('hex');
    }

    protected stableJson(value: unknown): string {
        if (Array.isArray(value)) {
            return `[${value.map(item => this.stableJson(item)).join(',')}]`;
        }
        if (value && typeof value === 'object') {
            return `{${Object.entries(value as Record<string, unknown>)
                .filter(([, item]) => item !== undefined)
                .sort(([left], [right]) => left.localeCompare(right))
                .map(([key, item]) => `${JSON.stringify(key)}:${this.stableJson(item)}`)
                .join(',')}}`;
        }
        return JSON.stringify(value);
    }

    protected marketplaceInstallRecords(parsed: unknown): Record<string, unknown>[] {
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return [];
        }
        const record = parsed as Record<string, unknown>;
        if (Array.isArray(record.marketplaceInstalls)) {
            return record.marketplaceInstalls.filter(item => this.isRecord(item));
        }
        if (this.isRecord(record.marketplaceInstall)) {
            return [record.marketplaceInstall];
        }
        return [];
    }

    protected nonCatalogMarketplaceCollectionKey(collection: CyberVinciMarketplaceCollection): 'skills' | 'flows' | 'canvas-qa-packs' | undefined {
        switch (collection) {
            case 'skills':
                return 'skills';
            case 'flows':
                return 'flows';
            case 'canvas-qa-packs':
                return 'canvas-qa-packs';
            default:
                return undefined;
        }
    }

    protected catalogMarketplaceItem(
        collection: CyberVinciMarketplaceCollection,
        kind: CyberVinciCatalogItemKind,
        id: string,
        name: string,
        description: string | undefined,
        tags: string[] | undefined,
        sourcePath: string | undefined,
        installedUserIds: Set<string>
    ): CyberVinciMarketplaceItem {
        const copyId = this.userCopyId(kind, id);
        return {
            id: `catalog.${collection}.${id}`,
            name,
            collection,
            description,
            tags,
            source: 'system',
            sourcePath,
            installTarget: {
                kind,
                id,
                action: 'duplicate-to-user'
            },
            installed: installedUserIds.has(copyId)
        };
    }

    protected copyCatalogItemForUser(kind: CyberVinciCatalogItemKind, item: Record<string, unknown>): Record<string, unknown> {
        const copy = this.sanitizeCatalogItem(item);
        const originalId = String(item.id ?? kind);
        copy.id = this.userCopyId(kind, originalId);
        copy.name = `${String(copy.name ?? originalId)} Copy`;
        copy.source = 'user';
        if (kind === 'tool') {
            copy.protected = false;
            copy.exposeToModel = item.exposeToModel ?? true;
        }
        if (kind === 'agent' && item.kind === 'native') {
            copy.kind = 'delegate';
            copy.sourceAgentId = item.sourceAgentId ?? item.id;
            copy.preserveNative = item.preserveNative ?? { invoke: false, modes: true, prompts: true, variables: true, functions: true };
        }
        if (kind === 'playbook') {
            copy.enabled = true;
        }
        return copy;
    }

    protected copyCatalogItemForSystemOverride(item: Record<string, unknown>): Record<string, unknown> {
        const copy = this.sanitizeCatalogItem(item);
        copy.source = 'system-override';
        return copy;
    }

    protected async materializeEditableNativeAgentPlaybook(
        root: string,
        agentCopy: Record<string, unknown>,
        sourceAgent: Record<string, unknown>
    ): Promise<string | undefined> {
        if (agentCopy.kind !== 'delegate' && agentCopy.kind !== 'native') {
            return undefined;
        }
        const sourceAgentId = String(agentCopy.sourceAgentId ?? sourceAgent.sourceAgentId ?? sourceAgent.id ?? '').trim();
        if (!sourceAgentId) {
            return undefined;
        }
        const preferredPlaybookId = `user.native-agent.${this.safeCatalogId(sourceAgentId)}`;
        const playbookId = await this.uniqueCatalogId('playbook', preferredPlaybookId);
        const sourcePlaybookId = String(sourceAgent.defaultPlaybook ?? agentCopy.defaultPlaybook ?? this.nativeAgentPlaybookId(sourceAgentId));
        const sourcePlaybook = await this.findCatalogItem('playbook', sourcePlaybookId);
        const playbook = sourcePlaybook
            ? this.copyCatalogItemForUser('playbook', sourcePlaybook)
            : this.createEditableAutonomousNativeAgentPlaybook(playbookId, sourceAgentId, agentCopy, sourceAgent);
        playbook.id = playbookId;
        playbook.name = `${String(agentCopy.name ?? sourceAgent.name ?? sourceAgentId)} Playbook`;
        playbook.category = 'Agents';
        playbook.enabled = true;
        playbook.description = `Editable Playbook for user Agent '${agentCopy.id}'. Customize the role prompt, setup checks, and response flow for this agent.`;
        playbook.tags = [...new Set(['Agents', 'Autonomous', 'Editable', ...((Array.isArray(sourcePlaybook?.tags) ? sourcePlaybook.tags : []).filter((tag): tag is string => typeof tag === 'string' && tag !== 'Native'))])];
        agentCopy.defaultPlaybook = playbookId;
        const playbooks = Array.isArray(agentCopy.playbooks)
            ? agentCopy.playbooks.filter((candidate): candidate is string => typeof candidate === 'string' && !!candidate.trim())
            : [];
        agentCopy.playbooks = [
            playbookId,
            ...playbooks.filter(candidate => candidate !== playbookId && candidate !== NATIVE_AGENT_DELEGATE_PLAYBOOK_ID && candidate !== 'direct-chat')
        ].filter((candidate, index, all) => all.indexOf(candidate) === index);

        const outputPath = path.join(root, 'user', 'playbooks', `${this.safeCatalogFileName(playbookId)}.yml`);
        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        await fs.writeFile(outputPath, this.stringifyCatalogFile(outputPath, { playbooks: [playbook] }), 'utf8');
        return outputPath;
    }

    protected createEditableAutonomousNativeAgentPlaybook(
        playbookId: string,
        sourceAgentId: string,
        agentCopy: Record<string, unknown>,
        sourceAgent: Record<string, unknown>
    ): Record<string, unknown> {
        const agentName = String(agentCopy.name ?? sourceAgent.name ?? sourceAgentId);
        return {
            version: 'cybervinci.playbook/v1',
            id: playbookId,
            name: `${agentName} Playbook`,
            category: 'Agents',
            source: 'user',
            enabled: true,
            description: `Editable Playbook for ${agentName}. Customize the role prompt, setup checks, and response flow for this agent.`,
            entry: 'describe-agent',
            tools: ['core.agent.describe', 'core.agent.preflight', 'system.agent.nativeMcpRequirements'],
            tags: ['Agents', 'Autonomous', 'Editable'],
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
                    args: { mode: 'configure', openSettings: true },
                    saveAs: 'nativeMcpSetup',
                    transitions: [{ to: 'native-mcp-configured-response' }]
                },
                {
                    id: 'ensure-native-mcp',
                    type: 'tool',
                    tool: 'system.agent.nativeMcpRequirements',
                    args: { mode: 'ensure' },
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
                    agent: sourceAgentId,
                    prompt: `You are running as the CyberVinci autonomous replacement for the ${agentName} Theia chat agent.

User request:
${'${input.prompt}'}

Selected agent:
${'${state.agentProfile.agent.name}'}

Agent description:
${'${state.agentProfile.agent.description}'}

Use the preserved agent profile, preflight result, MCP readiness, and available context to answer the user directly. Do not claim you used the original Theia native agent or any tool that is not present in the current playbook state.`,
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
                },
                {
                    id: 'end',
                    type: 'end'
                }
            ]
        };
    }

    protected assignPlaybookToAgentRecord(item: Record<string, unknown>, playbookId: string): Record<string, unknown> {
        const copy = this.cloneCatalogValue(item);
        const playbooks = Array.isArray(copy.playbooks)
            ? copy.playbooks.filter((candidate): candidate is string => typeof candidate === 'string' && !!candidate.trim())
            : [];
        copy.defaultPlaybook = playbookId;
        copy.playbooks = [playbookId, ...playbooks.filter(candidate => candidate !== playbookId)];
        return copy;
    }

    protected sanitizeCatalogItem(item: Record<string, unknown>): Record<string, unknown> {
        const copy = this.cloneCatalogValue(item);
        delete copy.sourcePath;
        delete copy.relativePath;
        return copy;
    }

    protected userCopyId(kind: CyberVinciCatalogItemKind, id: string): string {
        const base = this.safeCatalogId(id);
        if (kind === 'tool') {
            return base.startsWith('user.') ? `${base}.copy` : `user.${base}`;
        }
        return base.startsWith('user.') ? `${base}.copy` : `user.${base}`;
    }

    protected async uniqueCatalogId(kind: CyberVinciCatalogItemKind, preferredId: string): Promise<string> {
        const manifest = await this.getDeclarativeChatAgentManifest();
        const existing = new Set((kind === 'agent'
            ? manifest.agents
            : kind === 'playbook'
                ? manifest.playbooks ?? []
                : manifest.tools ?? []).map(item => item.id));
        if (!existing.has(preferredId)) {
            return preferredId;
        }
        for (let index = 2; index < 1000; index++) {
            const candidate = `${preferredId}-${index}`;
            if (!existing.has(candidate)) {
                return candidate;
            }
        }
        return `${preferredId}-${Date.now().toString(36)}`;
    }

    protected safeCatalogId(id: string): string {
        return id
            .trim()
            .replace(/[\\/]+/g, '.')
            .replace(/[^a-zA-Z0-9_.-]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .toLowerCase() || 'item';
    }

    protected safeCatalogFileName(id: string): string {
        return this.safeCatalogId(id).replace(/\.+/g, '-');
    }

    protected async uniqueMarkdownOutputPath(directory: string, baseName: string): Promise<string> {
        const safeBase = this.safeCatalogFileName(baseName) || 'agent-profile';
        let index = 0;
        while (true) {
            const suffix = index === 0 ? '' : `-${index + 1}`;
            const candidate = path.join(directory, `${safeBase}${suffix}.md`);
            if (!await this.pathExists(candidate)) {
                return candidate;
            }
            index++;
        }
    }

    protected cloneCatalogValue<T>(value: T): T {
        return JSON.parse(JSON.stringify(value)) as T;
    }

    protected removeCatalogOverride(
        parsed: unknown,
        key: 'agents' | 'tools' | 'playbooks',
        id: string
    ): { changed: boolean; removeFile?: boolean; value?: unknown } {
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return { changed: false };
        }
        const record = parsed as Record<string, unknown>;
        if (Array.isArray(record[key])) {
            const before = record[key].length;
            const next = record[key].filter(item => !this.isRecord(item) || item.id !== id);
            if (next.length === before) {
                return { changed: false };
            }
            const updated: Record<string, unknown> = {
                ...record,
                [key]: next
            };
            const hasCatalogContent = ['agents', 'tools', 'playbooks', 'diagnostics'].some(candidateKey => {
                const value = updated[candidateKey];
                return Array.isArray(value) ? value.length > 0 : value !== undefined;
            });
            return {
                changed: true,
                removeFile: !hasCatalogContent,
                value: updated
            };
        }
        if (this.isRecord(parsed) && typeof parsed.id === 'string' && parsed.id === id && this.recordLooksLikeCatalogKind(parsed, key)) {
            return { changed: true, removeFile: true };
        }
        return { changed: false };
    }

    protected updateCatalogItemInParsed(
        parsed: unknown,
        key: 'agents' | 'tools' | 'playbooks',
        id: string,
        updater: (item: Record<string, unknown>) => Record<string, unknown>
    ): { changed: boolean; value?: unknown } {
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return { changed: false };
        }
        const record = parsed as Record<string, unknown>;
        if (Array.isArray(record[key])) {
            let changed = false;
            const next = record[key].map(item => {
                if (this.isRecord(item) && item.id === id) {
                    changed = true;
                    return updater(item);
                }
                return item;
            });
            return changed
                ? {
                    changed: true,
                    value: {
                        ...record,
                        [key]: next
                    }
                }
                : { changed: false };
        }
        if (this.isRecord(parsed) && typeof parsed.id === 'string' && parsed.id === id && this.recordLooksLikeCatalogKind(parsed, key)) {
            return { changed: true, value: updater(parsed) };
        }
        return { changed: false };
    }

    protected recordLooksLikeCatalogKind(record: Record<string, unknown>, key: 'agents' | 'tools' | 'playbooks'): boolean {
        if (key === 'agents') {
            return typeof record.kind === 'string' || typeof record.sourceAgentId === 'string' || typeof record.defaultPlaybook === 'string';
        }
        if (key === 'playbooks') {
            return Array.isArray(record.states) || typeof record.entry === 'string';
        }
        return typeof record.implementation === 'string' || typeof record.command === 'string' || typeof record.theiaToolId === 'string';
    }

    protected mergeCatalogObject(result: CatalogFragments, parsed: unknown, source: CatalogSource, sourcePath: string): void {
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            result.diagnostics.push({
                severity: 'warning',
                source: sourcePath,
                message: 'Catalog file ignored because it does not contain an object.'
            });
            return;
        }
        const record = parsed as Record<string, unknown>;
        if (Array.isArray(record.agents)) {
            for (const [index, agent] of record.agents.entries()) {
                const validated = this.validator.validateAgent(agent, `${sourcePath}#agents.${index}`);
                result.diagnostics.push(...validated.diagnostics);
                if (validated.value) {
                    result.agents.push({ ...validated.value, source, sourcePath });
                }
            }
        } else if (this.isDeclarativeChatAgent(parsed)) {
            const validated = this.validator.validateAgent(parsed, sourcePath);
            result.diagnostics.push(...validated.diagnostics);
            if (validated.value) {
                result.agents.push({ ...validated.value, source, sourcePath });
            }
        }
        if (Array.isArray(record.tools)) {
            for (const [index, tool] of record.tools.entries()) {
                const validated = this.validator.validateTool(tool, `${sourcePath}#tools.${index}`);
                result.diagnostics.push(...validated.diagnostics);
                if (validated.value) {
                    result.tools.push({ ...validated.value, source, sourcePath });
                }
            }
        } else if (this.isDeclarativeTool(parsed)) {
            const validated = this.validator.validateTool(parsed, sourcePath);
            result.diagnostics.push(...validated.diagnostics);
            if (validated.value) {
                result.tools.push({ ...validated.value, source, sourcePath });
            }
        }
        if (Array.isArray(record.playbooks)) {
            for (const [index, playbook] of record.playbooks.entries()) {
                const validated = this.validator.validatePlaybook(playbook, `${sourcePath}#playbooks.${index}`);
                result.diagnostics.push(...validated.diagnostics);
                if (validated.value) {
                    result.playbooks.push({ ...validated.value, source, sourcePath });
                }
            }
        } else if (this.isPlaybookDefinition(parsed)) {
            const validated = this.validator.validatePlaybook(parsed, sourcePath);
            result.diagnostics.push(...validated.diagnostics);
            if (validated.value) {
                result.playbooks.push({ ...validated.value, source, sourcePath });
            }
        }
        if (Array.isArray(record.diagnostics)) {
            result.diagnostics.push(...record.diagnostics.filter(this.isCatalogDiagnostic));
        }
    }

    protected async resolveDeclarativeChatAgentsPath(): Promise<string | undefined> {
        if (this.cachedManifestPath && await this.pathExists(this.cachedManifestPath)) {
            return this.cachedManifestPath;
        }
        const explicit = process.env.CYBERVINCI_CHAT_AGENTS_FILE;
        const candidates = [
            explicit,
            ...this.packageConfigCandidates().map(base => path.join(base, 'chat-agents.json')),
            ...this.parentCandidates(process.cwd()).map(base => path.join(base, CHAT_AGENTS_RELATIVE_PATH)),
            ...this.parentCandidates(__dirname).map(base => path.join(base, CHAT_AGENTS_RELATIVE_PATH))
        ].filter((candidate): candidate is string => !!candidate);
        for (const candidate of candidates) {
            if (await this.pathExists(candidate)) {
                this.cachedManifestPath = candidate;
                return candidate;
            }
        }
        return undefined;
    }

    protected isDeclarativeChatAgent(candidate: unknown): candidate is CyberVinciDeclarativeChatAgent {
        if (!candidate || typeof candidate !== 'object') {
            return false;
        }
        const record = candidate as Record<string, unknown>;
        return typeof record.id === 'string'
            && typeof record.name === 'string'
            && (record.kind === 'native'
                || record.kind === 'delegate'
                || record.kind === 'prompt'
                || record.kind === 'markdown'
                || record.kind === 'flow'
                || record.kind === 'external'
                || record.kind === 'profile');
    }

    protected isDeclarativeTool(candidate: unknown): candidate is CyberVinciDeclarativeTool {
        if (!candidate || typeof candidate !== 'object') {
            return false;
        }
        const record = candidate as Record<string, unknown>;
        return typeof record.id === 'string' && typeof record.name === 'string';
    }

    protected isPlaybookDefinition(candidate: unknown): candidate is CyberVinciPlaybookDefinition {
        if (!candidate || typeof candidate !== 'object') {
            return false;
        }
        const record = candidate as Record<string, unknown>;
        return typeof record.id === 'string'
            && typeof record.name === 'string'
            && typeof record.entry === 'string'
            && Array.isArray(record.states);
    }

    protected isRecord(candidate: unknown): candidate is Record<string, unknown> {
        return !!candidate && typeof candidate === 'object' && !Array.isArray(candidate);
    }

    protected isCatalogDiagnostic(candidate: unknown): candidate is CyberVinciCatalogDiagnostic {
        if (!candidate || typeof candidate !== 'object') {
            return false;
        }
        const record = candidate as Record<string, unknown>;
        return (record.severity === 'info' || record.severity === 'warning' || record.severity === 'error')
            && typeof record.message === 'string';
    }

    protected resolveConfiguredPath(configuredPath: string): string {
        if (path.isAbsolute(configuredPath)) {
            return configuredPath;
        }
        return path.resolve(process.cwd(), configuredPath);
    }

    protected validateCommandToolPathPolicy(toolId: string, cwd: string, allowedPaths: string[] | undefined, deniedPaths: string[] | undefined): void {
        const resolvedCwd = path.resolve(cwd);
        const allowed = (allowedPaths ?? []).map(item => item.trim()).filter(Boolean).map(item => this.resolveConfiguredPath(item));
        const denied = (deniedPaths ?? []).map(item => item.trim()).filter(Boolean).map(item => this.resolveConfiguredPath(item));
        if (allowed.length > 0 && !allowed.some(allowedPath => this.pathContainsOrEquals(allowedPath, resolvedCwd))) {
            throw new Error(`Declarative tool '${toolId}' cwd '${resolvedCwd}' is not inside policy.allowedPaths.`);
        }
        const deniedPath = denied.find(candidate => this.pathContainsOrEquals(candidate, resolvedCwd));
        if (deniedPath) {
            throw new Error(`Declarative tool '${toolId}' cwd '${resolvedCwd}' is inside policy.deniedPaths '${path.resolve(deniedPath)}'.`);
        }
    }

    protected pathContainsOrEquals(parent: string, child: string): boolean {
        const resolvedParent = path.resolve(parent);
        const resolvedChild = path.resolve(child);
        const relative = path.relative(resolvedParent, resolvedChild);
        return relative === '' || (!!relative && !relative.startsWith('..') && !path.isAbsolute(relative));
    }

    protected parentCandidates(start: string): string[] {
        const candidates: string[] = [];
        let current = path.resolve(start);
        while (true) {
            candidates.push(current);
            const next = path.dirname(current);
            if (next === current) {
                return candidates;
            }
            current = next;
        }
    }

    protected packageConfigCandidates(): string[] {
        return [
            path.resolve(__dirname, '..', '..', 'config'),
            path.resolve(__dirname, '..', '..', '..', 'config')
        ];
    }

    protected async pathExists(candidate: string): Promise<boolean> {
        try {
            await fs.access(candidate);
            return true;
        } catch {
            return false;
        }
    }
}

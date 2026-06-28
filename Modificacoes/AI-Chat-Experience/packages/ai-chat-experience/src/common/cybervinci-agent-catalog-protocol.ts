// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { CyberVinciAgent, CyberVinciAgentDefinition, CyberVinciAgentSummary } from './cybervinci-agent-definition';
import { CyberVinciPlaybookDefinition, CyberVinciPlaybookSummary } from './cybervinci-playbook-definition';
import { CyberVinciToolDefinition, CyberVinciToolExecutionResult } from './cybervinci-tool-definition';
import { FlowWorkloadResultIssue } from '@cybervinci/flow/lib/common';
import {
    CyberVinciThreadGoalBudgetParams,
    CyberVinciThreadGoalQueryParams,
    CyberVinciThreadGoalResponse,
    CyberVinciThreadGoalSetParams
} from './cybervinci-goal-protocol';

export const CYBERVINCI_AGENT_CATALOG_VERSION = 'cybervinci.catalog/v1';

export type CyberVinciCatalogDiagnosticSeverity = 'info' | 'warning' | 'error';

export interface CyberVinciCatalogDiagnostic {
    severity: CyberVinciCatalogDiagnosticSeverity;
    message: string;
    source?: string;
    id?: string;
}

export type CyberVinciCatalogItemKind = 'agent' | 'tool' | 'playbook';

export interface CyberVinciCatalogLocations {
    root?: string;
    system?: string;
    systemOverrides?: string;
    user?: string;
}

export interface CyberVinciCatalogRestoreResult {
    ok: boolean;
    message: string;
    removedFiles?: string[];
    updatedFiles?: string[];
    diagnostics?: CyberVinciCatalogDiagnostic[];
}

export interface CyberVinciCatalogWriteResult {
    ok: boolean;
    message: string;
    path?: string;
    paths?: string[];
    id?: string;
    diagnostics?: CyberVinciCatalogDiagnostic[];
}

export type CyberVinciMarketplaceCollection =
    | 'agents'
    | 'skills'
    | 'tools'
    | 'playbooks'
    | 'flows'
    | 'canvas-qa-packs';

export interface CyberVinciMarketplaceInstallTarget {
    kind: CyberVinciCatalogItemKind | 'skill' | 'flow' | 'canvas-qa-pack';
    id: string;
    action?: 'duplicate-to-user' | 'create-override' | 'open-source';
}

export interface CyberVinciMarketplaceItem {
    id: string;
    name: string;
    collection: CyberVinciMarketplaceCollection;
    description?: string;
    tags?: string[];
    source?: 'system' | 'user' | 'marketplace';
    sourcePath?: string;
    installTarget?: CyberVinciMarketplaceInstallTarget;
    installed?: boolean;
}

export interface CyberVinciRuntimeDiagnostics {
    frontendClientConnected: boolean;
    flowPlaybookBridgeProtocol: 'cybervinci-ai-chat-experience-rpc';
}

export interface CyberVinciFrontendBridgeSmokeResult {
    ok: boolean;
    frontendClientConnected: boolean;
    delegated: boolean;
    message?: string;
    value?: unknown;
    signals?: Record<string, string | number | boolean>;
    diagnostics?: unknown[];
}

export interface CyberVinciAgentCatalog {
    version: typeof CYBERVINCI_AGENT_CATALOG_VERSION;
    agents: CyberVinciAgentSummary[];
    chatAgents: CyberVinciAgentDefinition[];
    tools: CyberVinciToolDefinition[];
    playbooks: CyberVinciPlaybookDefinition[];
    diagnostics: CyberVinciCatalogDiagnostic[];
}

export interface CyberVinciDeclarativeChatAgentManifest {
    version: 1 | typeof CYBERVINCI_AGENT_CATALOG_VERSION;
    agents: CyberVinciAgentDefinition[];
    tools?: CyberVinciToolDefinition[];
    playbooks?: CyberVinciPlaybookDefinition[];
    diagnostics?: CyberVinciCatalogDiagnostic[];
}

export interface CyberVinciAiChatExperienceService {
    listAgents(): Promise<CyberVinciAgentSummary[]>;
    readAgent(id: string): Promise<CyberVinciAgent | undefined>;
    getAgentProfilePath(id: string): Promise<CyberVinciCatalogWriteResult>;
    duplicateAgentProfileToUser(id: string): Promise<CyberVinciCatalogWriteResult>;
    getAgentCatalog(): Promise<CyberVinciAgentCatalog>;
    listTools(): Promise<CyberVinciToolDefinition[]>;
    listPlaybooks(): Promise<CyberVinciPlaybookSummary[]>;
    getPlaybook(id: string): Promise<CyberVinciPlaybookDefinition | undefined>;
    getCatalogDiagnostics(): Promise<CyberVinciCatalogDiagnostic[]>;
    getCatalogLocations(): Promise<CyberVinciCatalogLocations>;
    restoreSystemOverride(kind: CyberVinciCatalogItemKind, id: string): Promise<CyberVinciCatalogRestoreResult>;
    deleteUserCatalogItem(kind: CyberVinciCatalogItemKind, id: string): Promise<CyberVinciCatalogRestoreResult>;
    duplicateCatalogItemToUser(kind: CyberVinciCatalogItemKind, id: string): Promise<CyberVinciCatalogWriteResult>;
    createUserAgentCopy(agent: CyberVinciAgentDefinition): Promise<CyberVinciCatalogWriteResult>;
    createSystemOverride(kind: CyberVinciCatalogItemKind, id: string): Promise<CyberVinciCatalogWriteResult>;
    assignAgentDefaultPlaybook(agentId: string, playbookId: string): Promise<CyberVinciCatalogWriteResult>;
    listMarketplaceItems(): Promise<CyberVinciMarketplaceItem[]>;
    installMarketplaceItem(id: string): Promise<CyberVinciCatalogWriteResult>;
    getDeclarativeChatAgentManifest(): Promise<CyberVinciDeclarativeChatAgentManifest>;
    executeDeclarativeTool(toolId: string, argsJson: string): Promise<CyberVinciToolExecutionResult>;
    getRuntimeDiagnostics(): Promise<CyberVinciRuntimeDiagnostics>;
    runFrontendBridgeSmoke(): Promise<CyberVinciFrontendBridgeSmokeResult>;
    setThreadGoal(params: CyberVinciThreadGoalSetParams): Promise<CyberVinciThreadGoalResponse>;
    getThreadGoal(params: CyberVinciThreadGoalQueryParams): Promise<CyberVinciThreadGoalResponse>;
    clearThreadGoal(params: CyberVinciThreadGoalQueryParams): Promise<CyberVinciThreadGoalResponse>;
    pauseThreadGoal(params: CyberVinciThreadGoalQueryParams): Promise<CyberVinciThreadGoalResponse>;
    resumeThreadGoal(params: CyberVinciThreadGoalQueryParams): Promise<CyberVinciThreadGoalResponse>;
    setThreadGoalBudget(params: CyberVinciThreadGoalBudgetParams): Promise<CyberVinciThreadGoalResponse>;
    getThreadGoalStatus(params: CyberVinciThreadGoalQueryParams): Promise<CyberVinciThreadGoalResponse>;
    'thread/goal/set'(params: CyberVinciThreadGoalSetParams): Promise<CyberVinciThreadGoalResponse>;
    'thread/goal/get'(params: CyberVinciThreadGoalQueryParams): Promise<CyberVinciThreadGoalResponse>;
    'thread/goal/clear'(params: CyberVinciThreadGoalQueryParams): Promise<CyberVinciThreadGoalResponse>;
    'thread/goal/pause'(params: CyberVinciThreadGoalQueryParams): Promise<CyberVinciThreadGoalResponse>;
    'thread/goal/resume'(params: CyberVinciThreadGoalQueryParams): Promise<CyberVinciThreadGoalResponse>;
    'thread/goal/budget'(params: CyberVinciThreadGoalBudgetParams): Promise<CyberVinciThreadGoalResponse>;
    'thread/goal/status'(params: CyberVinciThreadGoalQueryParams): Promise<CyberVinciThreadGoalResponse>;

    // Compatibility methods for the pre-V1 CyberVinci chat extension.
    listAgencyAgents(): Promise<CyberVinciAgentSummary[]>;
    readAgencyAgent(id: string): Promise<CyberVinciAgent | undefined>;
}

export interface CyberVinciFlowPlaybookRunRequest {
    workspaceRootUri?: string;
    workflowId: string;
    runId: string;
    stateId: string;
    workloadId: string;
    playbookId: string;
    prompt: string;
    input: Record<string, unknown>;
}

export const CYBERVINCI_FRONTEND_BRIDGE_SMOKE_PLAYBOOK_ID = '__cybervinci.frontend-rpc-smoke';

export interface CyberVinciFlowPlaybookRunResult {
    ok: boolean;
    stop?: boolean;
    message?: string;
    value?: unknown;
    signals?: Record<string, string | number | boolean>;
    issues?: FlowWorkloadResultIssue[];
    diagnostics?: unknown[];
}

export interface CyberVinciAiChatExperienceClient {
    runPlaybookFromFlow(request: CyberVinciFlowPlaybookRunRequest): Promise<CyberVinciFlowPlaybookRunResult>;
    setThreadGoal?(params: CyberVinciThreadGoalSetParams): Promise<CyberVinciThreadGoalResponse>;
    getThreadGoal?(params: CyberVinciThreadGoalQueryParams): Promise<CyberVinciThreadGoalResponse>;
    clearThreadGoal?(params: CyberVinciThreadGoalQueryParams): Promise<CyberVinciThreadGoalResponse>;
    pauseThreadGoal?(params: CyberVinciThreadGoalQueryParams): Promise<CyberVinciThreadGoalResponse>;
    resumeThreadGoal?(params: CyberVinciThreadGoalQueryParams): Promise<CyberVinciThreadGoalResponse>;
    setThreadGoalBudget?(params: CyberVinciThreadGoalBudgetParams): Promise<CyberVinciThreadGoalResponse>;
    getThreadGoalStatus?(params: CyberVinciThreadGoalQueryParams): Promise<CyberVinciThreadGoalResponse>;
}

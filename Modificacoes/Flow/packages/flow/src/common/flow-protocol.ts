import { JsonRpcServer } from '@theia/core';
import { FlowGateStatus, FlowMemoryScope, FlowRun, FlowCapabilities, FlowSnapshot, FlowValidationResult, FlowWorkflow, FlowWorkflowVersion } from './flow-types';
import { FlowWorkflowTemplate } from './flow-templates';

export const FLOW_SERVICE_PATH = '/services/flow';
export const LEGACY_FLOW_SERVICE_PATH = '/services/agency-studio';

export const FlowService = Symbol('FlowService');

export interface FlowWorkspaceRequest {
    workspaceRootUri?: string;
}

export interface FlowWorkflowRequest extends FlowWorkspaceRequest {
    workflowId: string;
}

export interface FlowSaveWorkflowRequest extends FlowWorkspaceRequest {
    workflow: FlowWorkflow;
    filePath?: string;
    fileUri?: string;
    author?: string;
    origin?: string;
    message?: string;
}

export interface FlowWorkflowVersionRequest extends FlowWorkflowRequest {
    versionId: string;
    author?: string;
    message?: string;
}

export interface FlowWorkflowFileRequest extends FlowWorkspaceRequest {
    workflowId?: string;
    filePath?: string;
    fileUri?: string;
}

export interface FlowImportWorkflowRequest extends FlowWorkspaceRequest {
    filePath?: string;
    fileUri?: string;
}

export interface FlowExportWorkflowRequest extends FlowWorkspaceRequest {
    workflowId: string;
    targetPath?: string;
    targetUri?: string;
}

export interface FlowWorkflowExportResult {
    path: string;
    uri: string;
    workflowId: string;
    manifestPath: string;
    files: string[];
    missingAgents: string[];
    missingContracts: string[];
}

export interface FlowExportRunRequest extends FlowWorkspaceRequest {
    runId: string;
    targetPath?: string;
    targetUri?: string;
}

export interface FlowRunExportResult {
    path: string;
    uri: string;
    runId: string;
    manifestPath: string;
    files: string[];
    missingArtifacts: string[];
}

export interface FlowImportRunRequest extends FlowWorkspaceRequest {
    filePath?: string;
    fileUri?: string;
}

export interface FlowAgentMarkdownRequest extends FlowWorkspaceRequest {
    relativePath: string;
    title?: string;
    createIfMissing?: boolean;
}

export interface FlowCreateAgentMarkdownRequest extends FlowWorkspaceRequest {
    relativePath: string;
    title?: string;
    content?: string;
}

export interface FlowDuplicateAgentMarkdownRequest extends FlowWorkspaceRequest {
    sourceRelativePath: string;
    targetRelativePath: string;
    title?: string;
}

export interface FlowRenameAgentMarkdownRequest extends FlowWorkspaceRequest {
    sourceRelativePath: string;
    targetRelativePath: string;
}

export interface FlowAgentMarkdownFile {
    path: string;
    uri: string;
    relativePath: string;
    content: string;
    updatedAt: string;
}

export interface FlowAgentMarkdownSummary {
    path: string;
    uri: string;
    relativePath: string;
    updatedAt: string;
}

export interface FlowCreateWorkflowFromTemplateRequest extends FlowWorkspaceRequest {
    templateId: string;
    workflowId?: string;
    name?: string;
    description?: string;
}

export interface FlowStartRunRequest extends FlowWorkspaceRequest {
    workflowId: string;
    prompt: string;
}

export interface FlowRunRequest extends FlowWorkspaceRequest {
    runId: string;
}

export interface FlowRunLifecycleRequest extends FlowRunRequest {
    reason?: string;
}

export interface FlowRunStreamRequest extends FlowRunRequest {
    intervalMs?: number;
}

export interface FlowGateDecisionRequest extends FlowRunRequest {
    gateId: string;
    decision: Exclude<FlowGateStatus, 'pending'>;
    note?: string;
}

export interface FlowMemoryWriteRequest extends FlowRunRequest {
    candidateId: string;
    decision?: 'approved' | 'rejected';
    content?: string;
    approvedBy?: string;
    scope?: FlowMemoryScope;
    target?: string;
}

export interface FlowEffectDecisionRequest extends FlowRunRequest {
    effectId: string;
    decision: 'approved' | 'rejected' | 'applied';
    note?: string;
    approvedBy?: string;
}

export interface FlowSecondRunApprovalRequest extends FlowRunRequest {
    suggestionId: string;
    approvedBy?: string;
}

export interface FlowSecondRunDecisionRequest extends FlowRunRequest {
    suggestionId: string;
    decision: 'approved' | 'dismissed';
    approvedBy?: string;
    note?: string;
}

export const FlowClient = Symbol('FlowClient');

export interface FlowRunUpdate {
    workspaceRootUri?: string;
    run: FlowRun;
    reason: 'started' | 'snapshot' | 'tick' | 'approval' | 'memory' | 'lifecycle' | 'stream' | 'poll' | 'error';
}

export interface FlowClient {
    onRunUpdated(update: FlowRunUpdate): void;
    onRunStreamError(error: { workspaceRootUri?: string; runId: string; message: string }): void;
    onRunUpdate?(listener: (update: FlowRunUpdate) => void): () => void;
    onRunError?(listener: (error: { workspaceRootUri?: string; runId: string; message: string }) => void): () => void;
}

export interface FlowService extends JsonRpcServer<FlowClient> {
    getCapabilities(): Promise<FlowCapabilities>;
    getSnapshot(request: FlowWorkspaceRequest): Promise<FlowSnapshot>;
    listWorkflows(request: FlowWorkspaceRequest): Promise<FlowWorkflow[]>;
    listWorkflowTemplates(): Promise<FlowWorkflowTemplate[]>;
    listAgentMarkdownFiles(request: FlowWorkspaceRequest): Promise<FlowAgentMarkdownSummary[]>;
    getAgentMarkdownFile(request: FlowAgentMarkdownRequest): Promise<FlowAgentMarkdownFile>;
    createAgentMarkdownFile(request: FlowCreateAgentMarkdownRequest): Promise<FlowAgentMarkdownFile>;
    duplicateAgentMarkdownFile(request: FlowDuplicateAgentMarkdownRequest): Promise<FlowAgentMarkdownFile>;
    renameAgentMarkdownFile(request: FlowRenameAgentMarkdownRequest): Promise<FlowAgentMarkdownFile>;
    createWorkflowFromTemplate(request: FlowCreateWorkflowFromTemplateRequest): Promise<FlowWorkflow>;
    getWorkflow(request: FlowWorkflowRequest): Promise<FlowWorkflow>;
    openWorkflowFile(request: FlowWorkflowFileRequest): Promise<FlowWorkflow>;
    importWorkflow(request: FlowImportWorkflowRequest): Promise<FlowWorkflow>;
    exportWorkflow(request: FlowExportWorkflowRequest): Promise<FlowWorkflowExportResult>;
    exportRun(request: FlowExportRunRequest): Promise<FlowRunExportResult>;
    importRun(request: FlowImportRunRequest): Promise<FlowRun>;
    reloadWorkflow(request: FlowWorkflowRequest): Promise<FlowWorkflow>;
    saveWorkflow(request: FlowSaveWorkflowRequest): Promise<FlowValidationResult>;
    saveWorkflowFile(request: FlowSaveWorkflowRequest): Promise<FlowValidationResult>;
    listWorkflowVersions(request: FlowWorkflowRequest): Promise<FlowWorkflowVersion[]>;
    restoreWorkflowVersion(request: FlowWorkflowVersionRequest): Promise<FlowWorkflow>;
    validateWorkflow(workflow: FlowWorkflow): Promise<FlowValidationResult>;
    startRun(request: FlowStartRunRequest): Promise<FlowRun>;
    getRun(request: FlowRunRequest): Promise<FlowRun>;
    tickRun(request: FlowRunRequest): Promise<FlowRun>;
    pauseRun(request: FlowRunLifecycleRequest): Promise<FlowRun>;
    resumeRun(request: FlowRunLifecycleRequest): Promise<FlowRun>;
    cancelRun(request: FlowRunLifecycleRequest): Promise<FlowRun>;
    finalizeRun(request: FlowRunLifecycleRequest): Promise<FlowRun>;
    approveGate(request: FlowGateDecisionRequest): Promise<FlowRun>;
    decideEffect(request: FlowEffectDecisionRequest): Promise<FlowRun>;
    approveMemoryCandidate(request: FlowMemoryWriteRequest): Promise<FlowRun>;
    approveSecondRunSuggestion(request: FlowSecondRunApprovalRequest): Promise<FlowRun>;
    decideSecondRunSuggestion(request: FlowSecondRunDecisionRequest): Promise<FlowRun>;
    subscribeRunEvents(request: FlowRunStreamRequest): Promise<FlowRun>;
    unsubscribeRunEvents(request: FlowRunRequest): Promise<void>;
}

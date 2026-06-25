import { FlowArtifact, FlowCleanupRunsResult, FlowFileMetadata, FlowModelProfile, FlowPipelinePreset, FlowPipelinePresetAgentNodeConfiguration, FlowRun, FlowRunExportResult, FlowWorkflow, FlowWorkflowExportResult, FlowWorkflowFileFormat, FlowWorkflowVersion } from '../common';
export declare class FlowStore {
    listWorkflows(workspaceRootUri?: string): Promise<FlowWorkflow[]>;
    getWorkflow(workspaceRootUri: string | undefined, workflowId: string): Promise<FlowWorkflow | undefined>;
    openWorkflowFile(filePathOrUri: string): Promise<FlowWorkflow>;
    importWorkflow(workspaceRootUri: string | undefined, filePathOrUri: string): Promise<FlowWorkflow>;
    exportWorkflow(workspaceRootUri: string | undefined, workflow: FlowWorkflow, targetPathOrUri?: string): Promise<FlowWorkflowExportResult>;
    exportRun(workspaceRootUri: string | undefined, workflow: FlowWorkflow, run: FlowRun, targetPathOrUri?: string): Promise<FlowRunExportResult>;
    importRun(workspaceRootUri: string | undefined, filePathOrUri: string): Promise<FlowRun>;
    saveWorkflow(workspaceRootUri: string | undefined, workflow: FlowWorkflow, filePathOrUri?: string, version?: {
        author?: string;
        origin?: string;
        message?: string;
    }): Promise<void>;
    listWorkflowVersions(workspaceRootUri: string | undefined, workflowId: string): Promise<FlowWorkflowVersion[]>;
    restoreWorkflowVersion(workspaceRootUri: string | undefined, workflowId: string, versionId: string, options?: {
        author?: string;
        message?: string;
    }): Promise<FlowWorkflow>;
    listWorkspacePipelinePresets(workspaceRootUri: string | undefined): Promise<FlowPipelinePreset[]>;
    getWorkspacePipelinePreset(workspaceRootUri: string | undefined, presetId: string): Promise<FlowPipelinePreset | undefined>;
    savePipelinePreset(workspaceRootUri: string | undefined, preset: FlowPipelinePreset, options?: {
        overwrite?: boolean;
    }): Promise<FlowPipelinePreset>;
    listWorkspaceModelProfiles(workspaceRootUri: string | undefined): Promise<FlowModelProfile[]>;
    saveModelProfile(workspaceRootUri: string | undefined, profile: FlowModelProfile): Promise<FlowModelProfile>;
    createWorkflowFromPreset(workspaceRootUri: string | undefined, preset: FlowPipelinePreset, options?: {
        workflowId?: string;
        name?: string;
        description?: string;
        agentNodeOverrides?: Record<string, FlowPipelinePresetAgentNodeConfiguration>;
    }): Promise<FlowWorkflow>;
    createWorkflowFromTemplate(workspaceRootUri: string | undefined, templateId: string, options?: {
        workflowId?: string;
        name?: string;
        description?: string;
    }): Promise<FlowWorkflow>;
    createWorkflowFromPattern(workspaceRootUri: string | undefined, workflow: FlowWorkflow, patternId: string): Promise<FlowWorkflow>;
    createWorkflowFromGeneratedWorkflow(workspaceRootUri: string | undefined, workflow: FlowWorkflow, source: string): Promise<FlowWorkflow>;
    listRuns(workspaceRootUri?: string): Promise<FlowRun[]>;
    getRun(workspaceRootUri: string | undefined, runId: string): Promise<FlowRun | undefined>;
    saveRun(workspaceRootUri: string | undefined, run: FlowRun): Promise<void>;
    cleanupRuns(workspaceRootUri: string | undefined, runIds: string[], options?: {
        includeArtifacts?: boolean;
        includeWorktrees?: boolean;
    }): Promise<FlowCleanupRunsResult>;
    writeRunReport(workspaceRootUri: string | undefined, runId: string, relativePath: string, content: string): Promise<string>;
    workflowFileMetadata(workspaceRootUri: string | undefined, workflowId: string): Promise<FlowFileMetadata>;
    runFileMetadata(workspaceRootUri: string | undefined, runId: string): Promise<FlowFileMetadata>;
    protected workflowFile(workspaceRootUri: string | undefined, workflowId: string, format?: FlowWorkflowFileFormat): Promise<string>;
    protected pipelinePresetFile(workspaceRootUri: string | undefined, presetId: string): Promise<string>;
    protected modelProfileFile(workspaceRootUri: string | undefined, profileId: string): Promise<string>;
    protected nextWorkflowIdentity(workspaceRootUri: string | undefined, requestedId: string, requestedName: string): Promise<{
        id: string;
        name: string;
    }>;
    protected runFile(workspaceRootUri: string | undefined, runId: string): Promise<string>;
    protected findWorkflowFile(workspaceRootUri: string | undefined, workflowId: string): Promise<string | undefined>;
    protected ensureDir(workspaceRootUri: string | undefined, child: 'workflows' | 'runs' | 'exports' | 'workflow-history' | 'presets' | 'model-profiles'): Promise<string>;
    protected readJson<T>(file: string): Promise<T>;
    protected readJsonLines<T>(file: string): Promise<T[]>;
    protected readWorkflowFile(file: string): Promise<FlowWorkflow>;
    protected readRunFile(file: string): Promise<FlowRun>;
    protected writeJson(file: string, value: unknown): Promise<void>;
    protected writeYaml(file: string, value: unknown): Promise<void>;
    protected recordWorkflowVersion(workspaceRootUri: string | undefined, workflow: FlowWorkflow, before: FlowWorkflow | undefined, options: {
        author?: string;
        origin?: string;
        message?: string;
    }): Promise<void>;
    protected nextWorkflowVersionId(dir: string, idBase: string): Promise<string>;
    protected workflowHistoryDir(workspaceRootUri: string | undefined, workflowId: string): Promise<string>;
    protected fileMetadata(file: string, format: FlowWorkflowFileFormat, editable: boolean, unsupportedReason?: string): Promise<FlowFileMetadata>;
    protected fsPath(filePathOrUri: string): string;
    protected readImportWorkflow(source: string): Promise<FlowWorkflow>;
    protected readWorkflowFromRunExport(runFile: string): Promise<FlowWorkflow>;
    protected importWorkflowFormat(source: string): Promise<FlowWorkflowFileFormat>;
    protected runExportDir(source: string): Promise<string>;
    protected importedArtifactUri(packageDir: string, artifactPath: string): string;
    protected resolveArtifactSource(workspaceRootUri: string | undefined, runId: string, artifact: FlowArtifact): string | undefined;
}

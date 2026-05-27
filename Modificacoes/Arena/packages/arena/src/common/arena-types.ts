export type ArenaOutputType = 'markdown' | 'webpage' | 'code' | 'json' | 'document' | 'generic';
export type ArenaDisputeStatus = 'Draft' | 'Running' | 'Reviewing' | 'Completed' | 'Cancelled' | 'Failed' | 'Expired';
export type ArenaCandidateLabel = 'A' | 'B' | 'C';
export type ArenaRunStatus = 'pending' | 'running' | 'succeeded' | 'failed';

export interface GeneratedFile {
    path: string;
    content: string;
    contentType: string;
    language?: string;
    sizeBytes: number;
}

export interface ArenaArtifact {
    artifactType: ArenaOutputType;
    files: GeneratedFile[];
    rawOutput: string;
    parsedSuccessfully: boolean;
    error: string | null;
}

export interface RunnerCapabilities {
    supportsFilesystem: boolean;
    supportsModelSelection: boolean;
    supportsReasoningEffort: boolean;
    supportsDiff: boolean;
    isStub?: boolean;
}

export interface ArenaRunnerInfo {
    id: string;
    name: string;
    description: string;
    capabilities: RunnerCapabilities;
    available: boolean;
}

export interface ArenaRunRequest {
    disputeId: string;
    candidateLabel: ArenaCandidateLabel;
    agentMarkdown: string;
    userTask: string;
    outputType: ArenaOutputType;
    workspaceRoot: string;
    model?: string;
    reasoningEffort?: string;
}

export interface ArenaRunResult {
    candidateLabel: ArenaCandidateLabel;
    status: ArenaRunStatus;
    artifact: ArenaArtifact;
    logs: string[];
    gitDiff?: string;
    latencyMs: number;
    error?: string;
}

export interface ArenaAgentSummary {
    id: string;
    name: string;
    uri: string;
    relativePath: string;
    source: 'workspace' | 'arena';
    sizeBytes: number;
    updatedAt: string;
}

export interface ArenaCandidateRun {
    id: string;
    disputeId: string;
    label: ArenaCandidateLabel;
    agentName: string;
    agentMarkdown?: string;
    status: ArenaRunStatus;
    artifact?: ArenaArtifact;
    logs: string[];
    gitDiff?: string;
    error?: string;
    startedAt: string;
    completedAt?: string;
    latencyMs?: number;
}

export interface ArenaDispute {
    id: string;
    title: string;
    userTask: string;
    outputType: ArenaOutputType;
    runnerId: string;
    model?: string;
    reasoningEffort?: string;
    status: ArenaDisputeStatus;
    autoGenerateC: boolean;
    createdAt: string;
    completedAt?: string;
    expiresAt?: string;
    winnerLabel?: ArenaCandidateLabel;
    candidates: ArenaCandidateRun[];
    generatedAgentC?: ArenaGeneratedAgent;
    sandboxRoot?: string;
    notes?: string;
}

export interface ArenaListAgentsRequest {
    workspaceRootUris: string[];
}

export type ArenaAgentInputSource = 'library' | 'text';

export interface ArenaAgentInput {
    source: ArenaAgentInputSource;
    uri?: string;
    name?: string;
    contentMarkdown?: string;
}

export interface ArenaRunDuelRequest {
    workspaceRootUris: string[];
    agentAUri?: string;
    agentBUri?: string;
    agentA?: ArenaAgentInput;
    agentB?: ArenaAgentInput;
    userTask: string;
    outputType: ArenaOutputType;
    runnerId: string;
    model?: string;
    reasoningEffort?: string;
    autoGenerateC: boolean;
    autoGenerateCContextual?: boolean;
    generatedAgentCContent?: string;
}

export interface ArenaGenerateAgentCRequest {
    workspaceRootUris: string[];
    agentAUri?: string;
    agentBUri?: string;
    agentA?: ArenaAgentInput;
    agentB?: ArenaAgentInput;
    outputType: ArenaOutputType;
    model?: string;
    reasoningEffort?: string;
    userTask?: string;
    contextual?: boolean;
}

export interface ArenaGeneratedAgent {
    name: string;
    contentMarkdown: string;
    mode: 'generic' | 'contextual';
}

export interface ArenaSaveAgentRequest {
    workspaceRootUris: string[];
    name: string;
    contentMarkdown: string;
    notes?: string;
}

export interface ArenaSaveArtifactRequest {
    workspaceRootUris: string[];
    disputeId: string;
    winnerLabel: ArenaCandidateLabel;
}

export interface ArenaSavePatchRequest {
    workspaceRootUris: string[];
    disputeId: string;
    winnerLabel: ArenaCandidateLabel;
}

export interface ArenaRefineAgentRequest {
    disputeId: string;
    winnerLabel: ArenaCandidateLabel;
    model?: string;
    reasoningEffort?: string;
}

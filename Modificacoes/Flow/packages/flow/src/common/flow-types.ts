export type FlowStateType = 'input' | 'context' | 'agent' | 'parallel' | 'join' | 'condition' | 'gate' | 'command' | 'memory_write' | 'report';

export interface FlowWorkflow {
    version: 'flow.workflow/v1' | string;
    id: string;
    name: string;
    description?: string;
    templateId?: string;
    templateVersion?: string;
    file?: FlowFileMetadata;
    agents?: Record<string, string>;
    requires?: FlowWorkflowRequires;
    states: Record<string, FlowWorkflowState>;
    transitions: FlowWorkflowTransition[];
}

export interface FlowWorkflowRequires {
    capabilities?: string[];
}

export type FlowWorkflowFileFormat = 'json' | 'yaml' | 'unknown';

export interface FlowFileMetadata {
    path: string;
    uri: string;
    format: FlowWorkflowFileFormat;
    updatedAt: string;
    editable: boolean;
    unsupportedReason?: string;
}

export interface FlowWorkflowState {
    id?: string;
    type: FlowStateType;
    layout?: FlowWorkflowStateLayout;
    agent?: string;
    branches?: Record<string, FlowWorkflowState>;
    waitFor?: string[];
    input?: FlowInputContract;
    outputs?: string[];
    gates?: FlowHumanGate[];
    timeoutMs?: number;
    retry?: FlowRetryPolicy;
    [key: string]: unknown;
}

export interface FlowWorkflowVersion {
    id: string;
    workflowId: string;
    createdAt: string;
    author: string;
    origin: 'create' | 'save' | 'import' | 'restore' | string;
    message?: string;
    workflow: FlowWorkflow;
    file?: FlowFileMetadata;
    diff: FlowWorkflowVersionDiffItem[];
}

export interface FlowWorkflowVersionDiffItem {
    kind: 'state' | 'transition' | 'metadata' | 'agent' | 'guard' | 'capability' | 'template' | 'requirement' | 'source';
    change: 'added' | 'removed' | 'changed';
    id: string;
    summary: string;
}

export interface FlowWorkflowStateLayout {
    x?: number;
    y?: number;
}

export interface FlowInputContract {
    include?: string[];
    signals?: string[];
}

export interface FlowRetryPolicy {
    max: number;
    counter?: string;
}

export interface FlowWorkflowTransition {
    id?: string;
    from: string;
    to: string;
    on: FlowEventType | string;
    guard?: FlowGuardExpression;
    priority?: number;
}

export type FlowGuardExpression = Record<string, unknown>;

export interface FlowKernelRunMetadata {
    storeDir: string;
    workflowFile?: string;
    kernelRunId: string;
    projectSummary?: string;
}

export const AGENCY_KERNEL_PROTOCOL_VERSION = 'flow-kernel/stdio/v1';
export const AGENCY_KERNEL_WORKFLOW_VERSION = 'flow.workflow/v1';

export type FlowKernelProtocolVersion = typeof AGENCY_KERNEL_PROTOCOL_VERSION;
export type FlowKernelWorkflowVersion = typeof AGENCY_KERNEL_WORKFLOW_VERSION;

export type FlowKernelHostRequestType =
    | 'execute_workload'
    | 'request_context_pack'
    | 'request_memory_write'
    | 'request_command_execution'
    | 'request_human_gate'
    | 'request_artifact_open';

export type FlowKernelHostCallbackType =
    | 'workload_started'
    | 'workload_completed'
    | 'workload_failed'
    | 'artifact_created'
    | 'effect_recorded'
    | 'signal_recorded'
    | 'issue_recorded'
    | 'gate_approved'
    | 'gate_rejected'
    | 'clock_tick';

export interface FlowKernelHostRequest {
    id: string;
    requestId: string;
    type: FlowKernelHostRequestType;
    runId: string;
    workloadId?: string;
    stateId?: string;
    agent?: string;
    inputArtifacts?: string[];
    outputContract?: string;
    artifactId?: string;
    gateId?: string;
    path?: string;
}

export interface FlowKernelHostCallback {
    type: FlowKernelHostCallbackType;
    id?: string;
    storeDir?: string;
    runId: string;
    workloadId?: string;
    stateId?: string;
    gateId?: string;
    path?: string;
    artifactId?: string;
    artifactType?: string;
    hash?: string;
    producer?: string;
    effectType?: string;
    effect?: Record<string, unknown>;
    key?: string;
    value?: unknown;
    issue?: Record<string, unknown>;
    note?: string;
    error?: string;
}

export interface FlowHumanGate {
    id: string;
    title: string;
    stateId?: string;
    status?: FlowGateStatus;
    prompt?: string;
}

export type FlowGateStatus = 'pending' | 'approved' | 'rejected' | 'revision_requested';

export type FlowRunStatus = 'idle' | 'running' | 'paused' | 'waiting_gate' | 'completed' | 'failed' | 'cancelled';

export type FlowStateRuntimeStatus = 'pending' | 'ready' | 'running' | 'waiting' | 'review' | 'done' | 'failed';

export type FlowRunExecutionMode =
    | 'kernel_external'
    | 'kernel_simulated'
    | 'kernel_simulated_fallback_error'
    | 'capability_missing';

export type FlowWorkloadStatus = 'pending' | 'ready' | 'running' | 'waiting' | 'review' | 'done' | 'failed';

export interface FlowRun {
    id: string;
    workflowId: string;
    prompt: string;
    status: FlowRunStatus;
    file?: FlowFileMetadata;
    createdAt: string;
    updatedAt: string;
    currentStateIds: string[];
    stateStatuses: Record<string, FlowStateRuntimeStatus>;
    workloads: FlowWorkload[];
    events: FlowEvent[];
    artifacts: FlowArtifact[];
    effects: FlowEffect[];
    signals: FlowSignal[];
    gates: FlowHumanGate[];
    executionMode?: FlowRunExecutionMode;
    executionModeMessage?: string;
    externalKernelMetadata?: FlowKernelRunMetadata;
    contextPack?: FlowContextPack;
    workloadContextPacks?: Record<string, FlowContextPack>;
    memoryCandidates?: MemoryCandidate[];
    memoryWrites?: MemoryWrite[];
    secondRunSuggestion?: FlowSecondRunSuggestion;
    audit?: FlowRunAuditMetadata;
    tick: number;
}

export interface FlowRunAuditMetadata {
    readOnly: boolean;
    importedAt: string;
    sourcePath: string;
    packagePath?: string;
    workflow?: FlowWorkflow;
    manifest?: Record<string, unknown>;
}

export interface FlowSecondRunSuggestion {
    id: string;
    status: 'suggested' | 'accepted' | 'dismissed';
    reason: string;
    title: string;
    sourceRunId: string;
    sourceIssueCount: number;
    issues: FlowWorkloadResultIssue[];
    prompt: string;
    createdAt: string;
    approvedRunId?: string;
    approvedWorkflowId?: string;
    approvedAt?: string;
}

export interface FlowWorkloadResultIssue {
    severity: string;
    type: string;
    summary: string;
    producer?: string;
    impact?: string;
    suggestedFollowup?: string;
}

export interface FlowWorkloadResultEffect {
    type: 'file.created' | 'file.edited' | 'file.deleted' | string;
    summary: string;
    path?: string;
    content?: string;
    prompt?: string;
    artifactPath?: string;
    mimeType?: string;
    provider?: string;
    bytes?: number;
    command?: string;
    cwd?: string;
    env?: Record<string, string | number | boolean>;
    allowedEnv?: string[];
    allowedCommands?: string[];
    allowedPaths?: string[];
    deniedPaths?: string[];
    timeoutMs?: number;
    exitCode?: number | null;
    stdout?: string;
    stderr?: string;
    timedOut?: boolean;
    hashBefore?: string;
    hashAfter?: string;
    patch?: string;
    approvalPolicy?: string;
    status?: 'proposed' | 'approved' | 'applied' | 'rejected' | 'blocked' | 'failed' | string;
}

export interface FlowWorkloadOutputArtifact {
    id: string;
    path: string;
    type?: string;
    hash?: string;
}

export interface FlowWorkloadOutputEnvelope {
    status: string;
    result: {
        status: string;
        summary: string;
        artifacts: FlowWorkloadOutputArtifact[];
        signals: Record<string, string | number | boolean>;
        issues: FlowWorkloadResultIssue[];
    };
    artifacts: FlowWorkloadOutputArtifact[];
    effects: FlowWorkloadResultEffect[];
    signals: Record<string, string | number | boolean>;
    issues: FlowWorkloadResultIssue[];
    report: string;
    memoryCandidates?: MemoryCandidate[];
}

export interface FlowWorkload {
    id: string;
    runId: string;
    stateId: string;
    branchId?: string;
    agent?: string;
    attempt?: number;
    previousWorkloadId?: string;
    status: FlowWorkloadStatus;
    inputArtifacts: string[];
    outputArtifacts: string[];
    issues: string[];
    reportUri?: string;
    effectIds: string[];
    outputEnvelope?: FlowWorkloadOutputEnvelope;
    createdAt: string;
    updatedAt: string;
}

export interface FlowArtifact {
    id: string;
    runId: string;
    stateId: string;
    uri: string;
    kind: 'input' | 'report' | 'contract' | 'work_order' | 'patch' | 'log' | 'other';
    summary?: string;
    createdAt: string;
}

export interface FlowEffect {
    id: string;
    runId: string;
    stateId: string;
    kind: 'file' | 'file_write' | 'command' | 'image' | 'memory_write' | 'notification' | 'other';
    type?: 'file.created' | 'file.edited' | 'file.deleted' | string;
    path?: string;
    prompt?: string;
    artifactPath?: string;
    mimeType?: string;
    provider?: string;
    bytes?: number;
    command?: string;
    cwd?: string;
    env?: Record<string, string>;
    allowedPaths?: string[];
    deniedPaths?: string[];
    timeoutMs?: number;
    exitCode?: number | null;
    stdout?: string;
    stderr?: string;
    timedOut?: boolean;
    hashBefore?: string;
    hashAfter?: string;
    patch?: string;
    approvalPolicy?: string;
    status: 'proposed' | 'approved' | 'applied' | 'rejected' | 'blocked' | 'failed';
    summary: string;
}

export interface FlowSignal {
    key: string;
    value: string | number | boolean;
    stateId?: string;
    runId: string;
    createdAt: string;
}

export interface FlowContextPack {
    workspaceRootUri?: string;
    summary: string;
    workflow: {
        id: string;
        name: string;
        stateCount: number;
        transitionCount: number;
        agentIds: string[];
    };
    files: FlowContextFile[];
    symbols: string[];
    signals: FlowContextSignal[];
    sections?: FlowContextSection[];
    missingService?: string;
}

export interface FlowContextSection {
    id: string;
    title: string;
    items: FlowContextSectionItem[];
}

export interface FlowContextSectionItem {
    title: string;
    content: string;
    uri?: string;
    source?: string;
    score?: number;
}

export interface FlowContextFile {
    uri: string;
    reason: string;
}

export interface FlowContextSignal {
    key: string;
    value: string | number | boolean;
    stateId?: string;
}

export interface MemoryCandidate {
    id: string;
    runId: string;
    stateId?: string;
    source: 'workflow_state' | 'effect' | 'artifact' | 'signal';
    kind: 'fact' | 'decision' | 'preference' | 'instruction' | 'summary';
    scope?: FlowMemoryScope;
    content: string;
    reason: string;
    confidence: number;
    status: 'candidate' | 'approved' | 'rejected' | 'written';
    createdAt: string;
}

export type FlowMemoryScope = 'ide' | 'workspace' | 'project' | 'workflow' | 'run' | 'agent';

export interface MemoryWrite {
    id: string;
    runId: string;
    candidateId: string;
    status: 'approved' | 'written' | 'failed';
    content: string;
    approvedAt: string;
    approvedBy?: string;
    scope?: FlowMemoryScope;
    target?: string;
    error?: string;
}

export type FlowEventType =
    | 'workflow.saved'
    | 'workflow.validation_failed'
    | 'run.started'
    | 'run.completed'
    | 'run.failed'
    | 'run.cancelled'
    | 'run.paused'
    | 'run.resumed'
    | 'state.entered'
    | 'state.completed'
    | 'transition.evaluated'
    | 'transition.fired'
    | 'workload.created'
    | 'workload.requeued'
    | 'workload.started'
    | 'workload.retry'
    | 'workload.failed'
    | 'workload.completed'
    | 'artifact.created'
    | 'effect.proposed'
    | 'effect.approved'
    | 'effect.applied'
    | 'effect.rejected'
    | 'effect.blocked'
    | 'effect.failed'
    | 'issue.recorded'
    | 'signal.emitted'
    | 'gate.created'
    | 'gate.approved'
    | 'gate.rejected'
    | 'gate.revision_requested'
    | 'memory_write.approved'
    | 'memory_write.rejected'
    | 'memory_write.written'
    | 'memory_write.failed'
    | 'second_run.approved'
    | 'second_run.dismissed';

export interface FlowEvent {
    id: string;
    runId?: string;
    workflowId?: string;
    type: FlowEventType;
    timestamp: string;
    stateId?: string;
    transitionId?: string;
    workloadId?: string;
    gateId?: string;
    message: string;
    payload?: Record<string, unknown>;
}

export interface FlowValidationResult {
    valid: boolean;
    errors: FlowValidationIssue[];
    warnings: FlowValidationIssue[];
}

export interface FlowValidationIssue {
    code: string;
    message: string;
    path?: string;
}

export interface FlowCanvasNode {
    id: string;
    label: string;
    type: FlowStateType;
    agent?: string;
    status: FlowStateRuntimeStatus;
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface FlowCanvasEdge {
    id: string;
    from: string;
    to: string;
    event: string;
    guardSummary?: string;
    priority?: number;
    points: Array<{ x: number; y: number }>;
}

export interface FlowCanvasModel {
    nodes: FlowCanvasNode[];
    edges: FlowCanvasEdge[];
    width: number;
    height: number;
}

export interface FlowFlowDraftNode {
    id: string;
    type: 'flowState';
    position: { x: number; y: number };
    data: {
        stateId: string;
        label: string;
        stateType: FlowStateType;
        agent?: string;
        status: FlowStateRuntimeStatus;
    };
}

export interface FlowFlowDraftEdge {
    id: string;
    source: string;
    target: string;
    label?: string;
    data: {
        event: string;
        guardSummary?: string;
        priority?: number;
    };
}

export interface FlowFlowDraft {
    nodes: FlowFlowDraftNode[];
    edges: FlowFlowDraftEdge[];
    viewport: {
        width: number;
        height: number;
    };
}

export interface FlowKanbanColumn {
    id: FlowWorkloadStatus;
    label: string;
    workloads: FlowWorkload[];
}

export interface FlowSnapshot {
    workflows: FlowWorkflow[];
    activeWorkflow?: FlowWorkflow;
    activeRun?: FlowRun;
    validation?: FlowValidationResult;
    capabilities: FlowCapabilities;
}

export interface FlowCapabilities {
    workflowFileSource: boolean;
    visualCanvas: boolean;
    workloadKanban: boolean;
    runEventStream: boolean;
    humanGates: boolean;
    runLifecycleControls: boolean;
    llmAgentExecution: FlowCapabilityAvailability;
    llmAgentProvider: FlowProviderAvailability;
    filesystemEdit: FlowCapabilityAvailability;
    filesystemEditPolicy: FlowPolicyAvailability;
    imageGeneration: FlowCapabilityAvailability;
    imageProvider: FlowProviderAvailability;
    commandExecution: boolean;
    commandExecutionPolicy: FlowPolicyAvailability;
    memoryAdapter: boolean;
    memoryProvider: 'local' | 'external' | 'missing';
    explicitMemoryWrites: boolean;
    demoMode: FlowDemoMode;
    kernelBridge: 'simulated' | 'external';
    deterministicFallback: boolean;
    deterministicFallbackReason?: string;
}

export type FlowCapabilityAvailability = 'available' | 'unavailable' | 'mock' | 'blocked';
export type FlowProviderAvailability = 'configured' | 'missing' | 'mock';
export type FlowPolicyAvailability = 'configured' | 'missing' | 'blocked';
export type FlowDemoMode = 'off' | 'demo' | 'e2e';

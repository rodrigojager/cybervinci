// *****************************************************************************
// Copyright (C) 2026.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

export type MemoryScanMode = 'quick' | 'full';
export type MemoryFindingSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';
export type MemoryKind = 'decision' | 'fact' | 'todo' | 'risk' | 'note';
export type MemoryImportance = 'critical' | 'high' | 'medium' | 'low';
export type MemorySkillKind = 'workflow' | 'framework' | 'testing' | 'security' | 'domain' | 'tooling';
export type MemoryRetrievalSource = 'workspace' | 'memory' | 'skill' | 'mock';
export type MemoryVectorBackfillStatus = 'not_started' | 'pending' | 'running' | 'completed' | 'failed';
export type MemoryPromptIntent =
    | 'create_unit_test'
    | 'create_e2e_test'
    | 'map_architecture'
    | 'review_change'
    | 'review_pr'
    | 'security_review'
    | 'performance_review'
    | 'debug_error'
    | 'fix_error'
    | 'generate_doc'
    | 'modify_code'
    | 'refactor_code'
    | 'find_file'
    | 'create_endpoint'
    | 'update_config'
    | 'create_prompt'
    | 'create_prd'
    | 'explain_code'
    | 'general';

export type SecretSeverity = 'low' | 'medium' | 'high' | 'critical';
export type SecretFindingKind = 'api-key' | 'token' | 'password' | 'private-key' | 'connection-string' | 'unknown';

export interface SecretScannerRequest {
    content: string;
    sourceUri?: string;
    languageId?: string;
    maxFindings?: number;
}

export interface SecretFinding {
    kind: SecretFindingKind;
    severity: SecretSeverity;
    fingerprint: string;
    redactedPreview: string;
    range?: {
        startLine: number;
        startColumn: number;
        endLine: number;
        endColumn: number;
    };
    sourceUri?: string;
}

export interface SecretScannerResult {
    findings: SecretFinding[];
    redactedContent: string;
}

export interface PromptContextItem {
    kind: 'file' | 'selection' | 'diagnostic' | 'terminal' | 'metadata';
    uri?: string;
    content: string;
    priority?: number;
}

export interface PromptNormalizerRequest {
    prompt: string;
    workspaceRoot?: string;
    context?: readonly PromptContextItem[];
    redactions?: readonly SecretFinding[];
}

export interface PromptSection {
    id: string;
    title: string;
    content: string;
}

export interface PromptNormalizerResult {
    normalizedPrompt: string;
    sections: readonly PromptSection[];
    redactionCount: number;
    warnings: readonly string[];
    signature: string;
    intent: MemoryPromptIntent;
    language: string;
    targetKind: string;
    framework: string;
    action: string;
}

export interface IntentClassifierRequest {
    prompt: string;
    context?: readonly PromptContextItem[];
}

export interface IntentClassifierResult {
    intent: MemoryPromptIntent;
    confidence: number;
    matchedSignals: readonly string[];
    languageHint: string;
}

export interface ProjectSignal {
    kind: 'dependency' | 'framework' | 'language' | 'file' | 'command' | 'diagnostic';
    value: string;
    weight?: number;
}

export interface AvailableSkill {
    id: string;
    name: string;
    description: string;
    discovery?: 'auto' | 'manual' | 'system';
    tags?: readonly string[];
}

export interface SkillSuggestionRequest {
    task: string;
    projectSignals: readonly ProjectSignal[];
    availableSkills: readonly AvailableSkill[];
    limit?: number;
    minimumConfidence?: number;
    suggestionThreshold?: number;
    approvalThreshold?: number;
}

export interface SkillSuggestion {
    skillId: string;
    confidence: number;
    reasons: readonly string[];
}

export interface SkillSuggestionResult {
    suggestions: readonly SkillSuggestion[];
}

export interface SkillSuggestionLifecycleDecision {
    status: MemorySkillCandidate['status'];
    reason: string;
    requiresApproval: boolean;
}

export interface SkillSuggestionLifecycleRequest {
    candidate: MemorySkillCandidate;
    trackingThreshold?: number;
    trackingWindowDays?: number;
    suggestionThreshold?: number;
    suggestionWindowDays?: number;
    approvalThreshold?: number;
    rejectionThreshold?: number;
}

export interface MemoryScanRequest {
    workspaceRoot: string;
    mode?: MemoryScanMode;
    maxFiles?: number;
    maxFileBytes?: number;
    includeGlobs?: string[];
    excludeGlobs?: string[];
}

export interface MemoryWorkspaceRequest {
    workspaceRoot: string;
}

export type MemoryConsentCapability = {
    [Key in keyof NonNullable<MemoryWorkspaceSettings['optIn']>]:
    NonNullable<MemoryWorkspaceSettings['optIn']>[Key] extends boolean | undefined ? Key : never
}[keyof NonNullable<MemoryWorkspaceSettings['optIn']>];

export interface MemoryWorkspaceConsentUpdateRequest {
    workspacePath: string;
    capabilities: Partial<Record<Extract<MemoryConsentCapability, string>, boolean>>;
}

export interface MemorySearchRequest extends MemoryWorkspaceRequest {
    query: string;
    maxResults?: number;
    includeSources?: MemoryRetrievalSource[];
}

export interface MemoryRequest extends MemoryWorkspaceRequest {
    memory: MemoryInput;
}

export interface MemoryDeleteMemoryRequest extends MemoryWorkspaceRequest {
    id: string;
}

export interface MemorySkillRequest extends MemoryWorkspaceRequest {
    skill: MemorySkillInput;
}

export interface MemoryDeleteSkillRequest extends MemoryWorkspaceRequest {
    id: string;
}

export interface MemoryFileSummary {
    path: string;
    language?: string;
    sizeBytes: number;
    lineCount: number;
    hash: string;
    lastModifiedAt?: string;
    tags: string[];
    preview?: string;
}

export interface MemoryManifestSummary {
    path: string;
    kind: 'npm' | 'python' | 'go' | 'rust' | 'dotnet' | 'maven' | 'gradle' | 'composer' | 'unknown';
    name?: string;
    version?: string;
    dependencies: MemoryDependency[];
}

export interface MemoryDependency {
    name: string;
    versionRange?: string;
    kind: 'dependency' | 'devDependency' | 'peerDependency' | 'runtime' | 'build' | 'test' | 'unknown';
    ecosystem: string;
}

export interface MemorySecretFinding extends SecretFinding {
    id: string;
    ruleId: string;
    label: string;
    severity: SecretSeverity;
    path: string;
    line: number;
    column: number;
}

export interface MemoryScanIssue {
    id: string;
    severity: MemoryFindingSeverity;
    message: string;
    path?: string;
    detail?: string;
}

export interface MemoryLanguageStat {
    language: string;
    files: number;
    bytes: number;
}

export interface MemoryWorkspaceSnapshot {
    workspaceRoot: string;
    scanId: string;
    scannedAt: string;
    mode: MemoryScanMode;
    totals: {
        files: number;
        indexedFiles: number;
        skippedFiles: number;
        bytes: number;
        lines: number;
        secrets: number;
    };
    languages: MemoryLanguageStat[];
    files: MemoryFileSummary[];
    manifests: MemoryManifestSummary[];
    secretFindings: MemorySecretFinding[];
    issues: MemoryScanIssue[];
    graphSnapshot?: MemoryGraphSnapshot;
    graphDiff?: MemoryGraphDiffRecord;
}

export interface MemoryInput {
    id?: string;
    kind: MemoryKind;
    title: string;
    body: string;
    tags?: string[];
    sourcePath?: string;
}

export interface Memory extends MemoryInput {
    id: string;
    createdAt: string;
    updatedAt: string;
}

export interface MemorySkillInput {
    id?: string;
    kind: MemorySkillKind;
    name: string;
    description: string;
    appliesTo?: string[];
    guidance: string[];
    tags?: string[];
}

export interface MemorySkill extends MemorySkillInput {
    id: string;
    createdAt: string;
    updatedAt: string;
    builtin?: boolean;
}

export interface MemoryRetrievalResult {
    id: string;
    source: MemoryRetrievalSource;
    title: string;
    excerpt: string;
    score: number;
    path?: string;
    metadata?: Record<string, string | number | boolean>;
}

export interface MemoryOverview {
    workspaceRoot: string;
    generatedAt: string;
    health: {
        status: 'ready' | 'needs-scan' | 'attention';
        summary: string;
    };
    stats: {
        indexedFiles: number;
        languages: number;
        memories: number;
        skills: number;
        secrets: number;
    };
    topLanguages: MemoryLanguageStat[];
    recentMemories: Memory[];
    recommendedSkills: MemorySkill[];
    warnings: string[];
}

export interface MemoryUiModel {
    overview: MemoryOverview;
    snapshot?: MemoryWorkspaceSnapshot;
    memories: Memory[];
    skills: MemorySkill[];
    sampleQueries: string[];
}

export type MemoryTab =
    | 'overview'
    | 'code-graph'
    | 'documents-graph'
    | 'project-memories'
    | 'preferences'
    | 'skills'
    | 'settings'
    | 'events'
    | 'impact';

/**
 * Scope for project intelligence memories and memory-derived artifacts.
 *
 * Required fields by scope:
 * - `global`: no locator field is required; `workspacePath` must stay unset.
 * - `workspace`: `workspacePath` is required.
 * - `repository`: at least one stable repository locator is required:
 *   `repositoryUrl` or `repositoryId`.
 * - `session`: `sessionId` is required. `expiresAt` should be set for
 *   non-persistent session memory.
 * - `task`: `taskId` and `retentionPolicy` are required. `expiresAt` should be
 *   set when the retention policy is time-bound.
 */
export type MemoryScope = 'global' | 'workspace' | 'repository' | 'session' | 'task';
export type MemoryRetentionPolicy = 'session' | 'task' | 'ttl' | 'manual' | 'permanent';
export type MemorySourceKind = 'code' | 'code-graph' | 'local-docs' | 'external-docs' | 'project-memory' | 'repository-memory' | 'task-memory' | 'skill' | 'agent-event' | 'feedback-record';
export type MemoryNodeKind =
    | 'file'
    | 'symbol'
    | 'memory'
    | 'knowledge-concept'
    | 'doc'
    | 'skill'
    | 'event'
    | 'setting'
    | MemoryArchitectureGraphNodeKind
    | MemoryDomainGraphNodeKind
    | MemoryTestGraphNodeKind
    | MemorySecurityGraphNodeKind
    | MemoryWorkflowGraphNodeKind
    | MemoryUserPreferenceGraphNodeKind;
export type MemoryGraphKind = 'code' | 'documents' | 'knowledge' | MemorySpecializedGraphKind;
export type MemorySpecializedGraphKind =
    | 'architecture'
    | 'domain'
    | 'tests'
    | 'security'
    | 'workflow'
    | 'user-preferences';
export type MemoryArchitectureGraphNodeKind =
    | 'architecture-system'
    | 'architecture-container'
    | 'architecture-component'
    | 'architecture-module'
    | 'architecture-service'
    | 'architecture-api'
    | 'architecture-database'
    | 'architecture-queue'
    | 'architecture-boundary'
    | 'architecture-dependency';
export type MemoryDomainGraphNodeKind =
    | 'domain-bounded-context'
    | 'domain-aggregate'
    | 'domain-entity'
    | 'domain-value-object'
    | 'domain-event'
    | 'domain-command'
    | 'domain-policy'
    | 'domain-term'
    | 'domain-invariant';
export type MemoryTestGraphNodeKind =
    | 'test-suite'
    | 'test-case'
    | 'test-fixture'
    | 'test-assertion'
    | 'test-coverage-target'
    | 'test-gap'
    | 'test-flake'
    | 'test-run';
export type MemorySecurityGraphNodeKind =
    | 'security-asset'
    | 'security-boundary'
    | 'security-principal'
    | 'security-permission'
    | 'security-threat'
    | 'security-control'
    | 'security-secret'
    | 'security-vulnerability'
    | 'security-data-flow'
    | 'security-risk';
export type MemoryWorkflowGraphNodeKind =
    | 'workflow'
    | 'workflow-step'
    | 'workflow-trigger'
    | 'workflow-artifact'
    | 'workflow-tool'
    | 'workflow-command'
    | 'workflow-decision'
    | 'workflow-blocker';
export type MemoryUserPreferenceGraphNodeKind =
    | 'preference'
    | 'preference-rule'
    | 'preference-exception'
    | 'preference-source'
    | 'preference-scope'
    | 'preference-conflict';
export type MemoryBaseRelationType =
    | 'contains'
    | 'imports'
    | 'references'
    | 'calls'
    | 'inherits'
    | 'implements'
    | 'injects'
    | 'maps_to_endpoint'
    | 'uses_dependency'
    | 'uses_db_context'
    | 'uses_entity'
    | 'tests'
    | 'tested_by'
    | 'related_to_memory'
    | 'related_to_doc'
    | 'related_to_skill'
    | 'affected_by_change'
    | 'affects'
    | 'supports'
    | 'contradicts'
    | 'depends_on'
    | 'documents'
    | 'decides'
    | 'replaces'
    | 'blocks'
    | 'derived_from'
    | 'surprising_connection';
export type MemoryGraphRelationType =
    | MemoryBaseRelationType
    | 'communicates_with'
    | 'reads_from'
    | 'writes_to'
    | 'publishes'
    | 'subscribes_to'
    | 'owns'
    | 'contains_concept'
    | 'emits'
    | 'handles'
    | 'enforces'
    | 'violates'
    | 'covers'
    | 'misses_coverage'
    | 'flakes_with'
    | 'protects'
    | 'exposes'
    | 'mitigates'
    | 'requires_permission'
    | 'transfers_data_to'
    | 'triggers'
    | 'produces'
    | 'consumes'
    | 'prefers'
    | 'overrides'
    | 'conflicts_with';
export type MemoryGraphEvidenceKind =
    | 'static-analysis'
    | 'language-analyzer'
    | 'test-run'
    | 'coverage-report'
    | 'security-scan'
    | 'user-memory'
    | 'feedback'
    | 'document'
    | 'agent-event'
    | 'manual';

export interface MemoryWorkspaceSettings {
    workspacePath: string;
    enabled: boolean;
    graphEnabled: boolean;
    memoryEnabled: boolean;
    skillSuggestionsEnabled: boolean;
    icmBridge?: MemoryIcmBridgeSettings;
    vectorSearch?: MemoryVectorSettings;
    chatLearningEnabled?: boolean;
    chatInlineSuggestionsEnabled?: boolean;
    chatAutoIndexEnabled?: boolean;
    chatLearningLlmEnabled?: boolean;
    /**
     * 0 means no periodic schedule. Deterministic triggers may still run LLM analysis when chatLearningLlmEnabled is true.
     * Values greater than 0 also run LLM analysis every N chat prompts.
     */
    chatLearningLlmFrequency?: number;
    /**
     * Optional explicit model id for chat learning. When omitted, CyberVinci uses the active chat agent's default model.
     */
    chatLearningModelId?: string;
    editorHoverEnabled?: boolean;
    ignoreRules?: MemoryIgnoreRuleSettings;
    restrictIndexingToAllowlist?: boolean;
    allowlist?: string[];
    denylist?: string[];
    exportOptions?: MemoryExportSettings;
    retentionPolicies?: MemoryRetentionPolicySettings;
    externalDocCollections?: MemoryExternalDocCollectionPolicy[];
    optIn?: {
        codeGraph?: boolean;
        documentGraph?: boolean;
        projectMemory?: boolean;
        preferences?: boolean;
        skills?: boolean;
        contextCart?: boolean;
        editorHover?: boolean;
        vectorSearch?: boolean;
        transcriptSearch?: boolean;
        events?: boolean;
        promptSnippets?: boolean;
        pdfDocuments?: boolean;
        officeDocuments?: boolean;
        images?: boolean;
        diagrams?: boolean;
        audioVideo?: boolean;
        remoteImageSemantics?: boolean;
        remoteImageSemanticsConsentAt?: string;
        remoteMediaTranscription?: boolean;
        remoteMediaTranscriptionConsentAt?: string;
        externalDocCollections?: boolean;
    };
    updatedAt: string;
}

export type MemoryExternalDocRefreshPolicy = 'manual' | 'on-demand';

export interface MemoryExternalDocCollectionPolicy {
    id: string;
    label: string;
    rootPath: string;
    enabled: boolean;
    refreshPolicy: MemoryExternalDocRefreshPolicy;
    includeGlobs?: string[];
    excludeGlobs?: string[];
    maxFiles?: number;
    source?: string;
    origin?: string;
    updatedAt?: string;
    lastRefreshedAt?: string;
}

export interface MemoryIgnoreRuleSettings {
    useGitignore?: boolean;
    useCyberVinciIgnore?: boolean;
}

export interface MemoryExportSettings {
    includeGlobalMemories?: boolean;
}

export interface MemoryRetentionPolicySettings {
    sessionMemory?: MemoryRetentionPolicy;
    taskMemory?: MemoryRetentionPolicy;
    transcripts?: MemoryRetentionPolicy;
    transcriptTtlDays?: number;
}

export interface MemoryIcmBridgeSettings {
    enabled?: boolean;
    binaryPath?: string;
    updatedAt?: string;
}

export interface MemoryVectorSettings {
    enabled: boolean;
    userConsentAt?: string;
    localModelId: string;
    dimensions: number;
    backfillStatus: MemoryVectorBackfillStatus;
    backfilledAt?: string;
    lastError?: string;
}

export interface MemoryVectorSettingsUpdate {
    workspacePath: string;
    enabled?: boolean;
    consent?: boolean;
    userConsentAt?: string;
    localModelId?: string;
    dimensions?: number;
    backfillStatus?: MemoryVectorBackfillStatus;
}

export interface MemoryVectorStatus {
    workspacePath: string;
    enabled: boolean;
    consented: boolean;
    backend: 'json' | 'sqlite-local';
    userConsentAt?: string;
    localModelId: string;
    dimensions: number;
    backfillStatus: MemoryVectorBackfillStatus;
    backfilledAt?: string;
    lastError?: string;
    totalMemories: number;
    totalVectors: number;
    pendingMemories: number;
    updatedAt: string;
}

export interface MemoryFile {
    id: string;
    relativePath: string;
    fileName: string;
    extension?: string;
    languageId?: string;
    sizeBytes: number;
    contentHash: string;
    isIgnored: boolean;
    isGenerated: boolean;
    isBinary: boolean;
    isSensitive: boolean;
    ignoreReason?: MemoryFileIgnoreReason;
    indexedAt?: string;
}

export type MemoryFileIgnoreReasonKind =
    | 'gitignore'
    | 'cvignore'
    | 'cybervinciignore'
    | 'denylist'
    | 'allowlist'
    | 'binary'
    | 'size'
    | 'generated'
    | 'secret';

export interface MemoryFileIgnoreReason {
    kind: MemoryFileIgnoreReasonKind;
    source: string;
    detail: string;
}

export interface MemorySymbol {
    id: string;
    fileId: string;
    languageId: string;
    symbolKind: 'namespace' | 'class' | 'interface' | 'record' | 'struct' | 'enum' | 'method' | 'constructor' | 'property' | 'field' | 'endpoint' | 'test_method' | 'database_schema' | 'table' | 'view' | 'procedure' | 'function' | 'column' | 'index' | 'migration';
    name: string;
    fullName?: string;
    parentSymbolId?: string;
    signature?: string;
    startLine?: number;
    endLine?: number;
    attributes?: string[];
    modifiers?: string[];
    returnType?: string;
    metadata?: Record<string, string | number | boolean | string[]>;
}

export interface MemoryRelation {
    id: string;
    sourceKind: MemoryNodeKind;
    sourceId: string;
    targetKind: MemoryNodeKind;
    targetId: string;
    relationType: MemoryGraphRelationType;
    confidenceLevel: 'extracted' | 'inferred' | 'ambiguous' | 'user_confirmed';
    confidenceScore: number;
    evidence?: string;
    metadata?: Record<string, string | number | boolean | string[]>;
}

export interface LanguageAnalysisContext {
    workspacePath: string;
    file: MemoryFile;
    content: string;
    createSymbolId(seed: string): string;
    createRelationId(seed: string): string;
}

export interface LanguageCallHint {
    sourceSymbolId: string;
    targetName: string;
    targetSymbolId?: string;
    targetSemanticFullName?: string;
    evidence?: string;
}

export interface LanguageDependencyHint {
    sourceSymbolId: string;
    targetTypeName: string;
    targetSymbolId?: string;
    targetSemanticFullName?: string;
    sourceConstructorSymbolId?: string;
    parameterName?: string;
    evidence?: string;
}

export interface LanguageAnalysisResult {
    fileId: string;
    languageId: string;
    analyzerId: string;
    symbols: MemorySymbol[];
    relations: MemoryRelation[];
    imports?: string[];
    callHints?: LanguageCallHint[];
    dependencyHints?: LanguageDependencyHint[];
    diagnostics?: MemoryScanIssue[];
}

export interface MemoryLanguageAnalyzer {
    readonly id: string;
    readonly languageId: string;
    canAnalyze(file: MemoryFile): boolean;
    analyze(context: LanguageAnalysisContext): Promise<LanguageAnalysisResult> | LanguageAnalysisResult;
}

export interface MemoryItem {
    id: string;
    /** Default Memory Space that owns this memory without changing its scope semantics. */
    memorySpaceId?: string;
    /**
     * Required when `scope` is `workspace`.
     * Must remain unset for `global` memories.
     */
    workspacePath?: string;
    /**
     * Scope-specific requirements:
     * - global: no locator field; keep `workspacePath` unset.
     * - workspace: `workspacePath` is required.
     * - repository: `repositoryUrl` or `repositoryId` is required.
     * - session: `sessionId` is required; `expiresAt` should be set.
     * - task: `taskId` and `retentionPolicy` are required; `expiresAt` should be set for TTL/task-bound retention.
     */
    scope: MemoryScope;
    /** Stable remote URL for `repository` scoped memory. */
    repositoryUrl?: string;
    /** Stable normalized repository id for `repository` scoped memory. */
    repositoryId?: string;
    /** Required when `scope` is `session`. */
    sessionId?: string;
    /** Required when `scope` is `task`. */
    taskId?: string;
    /** Required for `task` scope and recommended for temporary `session` scope. */
    retentionPolicy?: MemoryRetentionPolicy;
    /** Expiration timestamp for temporary `session` and `task` memories. */
    expiresAt?: string;
    memoryType: 'user_preference' | 'project_decision' | 'project_convention' | 'file_location' | 'architecture_note' | 'bug_history' | 'command_note' | 'testing_note' | 'security_note' | 'generated_skill_note' | 'manual_note';
    title: string;
    content: string;
    status: 'active' | 'candidate' | 'archived' | 'rejected' | 'blocked';
    staleStatus: 'fresh' | 'possibly_stale' | 'stale' | 'unknown';
    importance: MemoryImportance;
    weight: number;
    lastAccessedAt: string;
    accessCount: number;
    createdAt: string;
    updatedAt: string;
    acceptedCount: number;
    rejectedCount: number;
    source?: string;
    evidence?: string;
    supersededBy?: string;
    supersedes?: string[];
    originMarkers?: string[];
}

export interface MemorySpace {
    id: string;
    scope: MemoryScope;
    workspacePath?: string;
    repositoryUrl?: string;
    repositoryId?: string;
    sessionId?: string;
    taskId?: string;
    retentionPolicy?: MemoryRetentionPolicy;
    metadata?: Record<string, string | number | boolean | undefined>;
    createdAt: string;
    updatedAt: string;
}

export interface MemoryTranscriptSession {
    id: string;
    workspacePath?: string;
    scope: MemoryScope;
    origin: string;
    source?: string;
    title?: string;
    startedAt: string;
    endedAt?: string;
    retentionPolicy?: MemoryRetentionPolicy;
    redactionStatus: 'clean' | 'redacted';
    metadata?: Record<string, string | number | boolean | undefined>;
    createdAt: string;
    updatedAt: string;
}

export interface MemoryTranscriptMessage {
    id: string;
    sessionId: string;
    workspacePath?: string;
    scope: MemoryScope;
    origin: string;
    role: 'user' | 'assistant' | 'system' | 'tool' | 'agent';
    content: string;
    redactedContent?: string;
    redactionStatus: 'clean' | 'redacted' | 'blocked';
    redactionSummary?: {
        findingCount: number;
        severities: Record<string, number>;
        kinds: Record<string, number>;
        fingerprints: string[];
    };
    retentionPolicy?: MemoryRetentionPolicy;
    sessionIdHint?: string;
    taskId?: string;
    metadata?: Record<string, string | number | boolean | undefined>;
    createdAt: string;
    updatedAt: string;
}

export interface MemoryStartTranscriptSessionRequest {
    workspacePath: string;
    sessionId?: string;
    scope?: MemoryScope;
    origin?: string;
    source?: string;
    title?: string;
    retentionPolicy?: MemoryRetentionPolicy;
    metadata?: Record<string, string | number | boolean | undefined>;
}

export interface MemoryRecordTranscriptMessageRequest {
    workspacePath: string;
    transcriptSessionId?: string;
    sessionId?: string;
    taskId?: string;
    scope?: MemoryScope;
    origin?: string;
    role: MemoryTranscriptMessage['role'];
    content: string;
    retentionPolicy?: MemoryRetentionPolicy;
    metadata?: Record<string, string | number | boolean | undefined>;
}

export interface MemoryTranscriptSearchRequest {
    workspacePath: string;
    query?: string;
    limit?: number;
    tokenBudget?: number;
    scopes?: MemoryScope[];
    transcriptSessionId?: string;
    sessionId?: string;
    taskId?: string;
    roles?: MemoryTranscriptMessage['role'][];
    origins?: string[];
}

export interface MemoryForgetTranscriptRequest {
    workspacePath: string;
    mode?: 'delete' | 'expire';
    scopes?: MemoryScope[];
    transcriptSessionId?: string;
    sessionId?: string;
    taskId?: string;
    retentionPolicy?: MemoryRetentionPolicy;
}

export interface MemoryForgetTranscriptResult {
    workspacePath: string;
    mode: 'delete' | 'expire';
    removedMessages: number;
    removedSessions: number;
    expiredSessions: number;
    filters: {
        scopes?: MemoryScope[];
        transcriptSessionId?: string;
        sessionId?: string;
        taskId?: string;
        retentionPolicy?: MemoryRetentionPolicy;
    };
}

export interface MemoryTranscriptSearchResult {
    id: string;
    transcriptSessionId: string;
    workspacePath?: string;
    scope: MemoryScope;
    origin: string;
    role: MemoryTranscriptMessage['role'];
    snippet: string;
    score: number;
    estimatedTokens: number;
    createdAt: string;
    updatedAt: string;
    redactionStatus: MemoryTranscriptMessage['redactionStatus'];
    redactionSummary?: MemoryTranscriptMessage['redactionSummary'];
    explanation: {
        source: 'pi_transcript_messages';
        scope: MemoryScope;
        evidence: string;
        matchedQuery: boolean;
        tokenBudgetApplied: boolean;
        redaction: 'clean' | 'redacted' | 'blocked';
        filters: {
            workspacePath: string;
            scopes?: MemoryScope[];
            transcriptSessionId?: string;
            sessionId?: string;
            taskId?: string;
            roles?: MemoryTranscriptMessage['role'][];
            origins?: string[];
        };
        ranking: {
            textScore: number;
            recencyScore: number;
            finalScore: number;
        };
    };
}

export interface MemoryVector {
    id: string;
    memoryId: string;
    /**
     * Required when `scope` is `workspace`.
     * Must remain unset for `global` vectors.
     */
    workspacePath?: string;
    /**
     * Mirrors the owning memory scope. Scope-specific locator fields follow the
     * same requirements documented on `MemoryItem`.
     */
    scope: MemoryScope;
    repositoryUrl?: string;
    repositoryId?: string;
    sessionId?: string;
    taskId?: string;
    expiresAt?: string;
    modelId: string;
    dimensions: number;
    contentHash: string;
    vector: number[];
    createdAt: string;
    updatedAt: string;
}

export interface MemoryExtractedMemoryCandidate {
    /**
     * Scope-specific requirements:
     * - global: no locator field.
     * - workspace: resolved from the proposal request `workspacePath`.
     * - repository: `repositoryUrl` or `repositoryId` should be provided when available.
     * - session: `sessionId` is required before persistence.
     * - task: `taskId` and `retentionPolicy` are required before persistence.
     */
    scope: MemoryScope;
    repositoryUrl?: string;
    repositoryId?: string;
    sessionId?: string;
    taskId?: string;
    retentionPolicy?: MemoryRetentionPolicy;
    expiresAt?: string;
    memoryType: MemoryItem['memoryType'];
    title: string;
    content: string;
    importance?: MemoryImportance;
    weight?: number;
    source?: string;
    evidence?: string;
    matchedPattern: string;
    confidence: number;
}

export interface MemoryCandidateProposalRequest {
    workspacePath: string;
    text: string;
    source?: string;
    evidence?: string;
    eventId?: string;
    relativePath?: string;
    maxCandidates?: number;
}

export interface MemoryCandidateProposalResult {
    candidates: MemoryItem[];
    created: number;
    deduplicated: number;
    events: MemoryEvent[];
}

export interface MemoryConsolidationRequest {
    workspacePath: string;
    topic: string;
    memoryIds?: string[];
    maxMemories?: number;
}

export interface MemoryConsolidationResult {
    candidate?: MemoryItem;
    relatedMemoryIds: string[];
    skippedSensitiveMemoryIds: string[];
    created: boolean;
    deduplicated: boolean;
}

export interface MemoryHealth {
    status: 'healthy' | 'attention' | 'critical';
    summary: string;
    total: number;
    byScope: Record<MemoryScope, number>;
    active: number;
    stale: number;
    possiblyStale: number;
    unknown: number;
    critical: number;
    averageWeight: number;
    lowWeight: number;
    neverAccessed: number;
    oldestAccessedAt?: string;
    duplicate: number;
    contradictions: number;
    missingSource: number;
    sensitive: number;
    globalWithWorkspace: number;
    oldCandidates: number;
    recentConsolidations?: MemoryHealthConsolidation[];
    issues: MemoryHealthIssue[];
}

export interface MemoryHealthConsolidation {
    id: string;
    memoryId?: string;
    title?: string;
    scope?: MemoryScope;
    supersedes?: string[];
    createdAt: string;
}

export type MemoryHealthIssueKind = 'duplicate' | 'contradiction' | 'missing_source' | 'sensitive' | 'global_with_workspace' | 'old_candidate' | 'low_weight' | 'never_accessed';

export interface MemoryHealthIssue {
    kind: MemoryHealthIssueKind;
    memoryId: string;
    title: string;
    scope: MemoryScope;
    evidence: string;
    relatedMemoryId?: string;
}

export type MemoryPruningReason = 'old' | 'duplicate' | 'sensitive' | 'missing_source' | 'global_with_workspace' | 'old_candidate';
export type MemoryPruningAction = 'archive' | 'remove';

export interface MemoryPruningProposal {
    id: string;
    scope: MemoryScope;
    title: string;
    action: MemoryPruningAction;
    reasons: MemoryPruningReason[];
    reviewRequired: true;
    evidence: string;
    staleStatus: MemoryItem['staleStatus'];
    importance: MemoryImportance;
    weight: number;
    lastAccessedAt: string;
    accessCount: number;
    duplicateOf?: string;
}

export interface MemorySkillCandidate {
    id: string;
    workspacePath?: string;
    signature: string;
    title: string;
    description: string;
    generationSources?: MemorySkillSuggestionSource[];
    redactedExamples?: string[];
    triggers?: string[];
    activationCriteria?: string;
    triggerCount: number;
    rejectionCount?: number;
    rejectionReasons?: string[];
    status: 'tracking' | 'suggested' | 'accepted' | 'rejected' | 'blocked' | 'delete_pending';
    proposedSkillJson?: string;
    statusReason?: string;
    lastTriggeredAt?: string;
    triggerHistory?: string[];
    trackingStartedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export type MemorySkillSuggestionSource = 'code-graph' | 'memory' | 'docs' | 'event' | 'skill';

export type MemoryEventType =
    | 'prompt.submitted'
    | 'prompt.normalized'
    | 'tool.requested'
    | 'file.opened'
    | 'file.read'
    | 'file.created'
    | 'file.edited'
    | 'file.deleted'
    | 'file.saved'
    | 'file.renamed'
    | 'search.executed'
    | 'terminal.command'
    | 'task.started'
    | 'task.failed'
    | 'task.succeeded'
    | 'build.started'
    | 'build.failed'
    | 'build.succeeded'
    | 'test.started'
    | 'test.failed'
    | 'test.passed'
    | 'context.suggested'
    | 'context.accepted'
    | 'context.rejected'
    | 'context.inserted'
    | 'context.ignored'
    | 'memory.suggested'
    | 'memory.created'
    | 'memory.approved'
    | 'memory.edited'
    | 'memory.promoted'
    | 'memory.demoted'
    | 'memory.deleted'
    | 'memory.accessed'
    | 'memory.consolidated'
    | 'memory.superseded'
    | 'memory.decayed'
    | 'memory.pruning_proposed'
    | 'consent.updated'
    | 'feedback.recorded'
    | 'feedback.resolved'
    | 'transcript.session.started'
    | 'transcript.message.recorded'
    | 'transcript.forgotten'
    | 'embedding.generated'
    | 'embedding.backfilled'
    | 'export.created'
    | 'export.installed'
    | 'export.portable-maintenance'
    | 'import.completed'
    | 'index.incremental.completed'
    | 'index.incremental.failed'
    | 'skill.suggested'
    | 'skill.accepted'
    | 'skill.rejected'
    | 'skill.unblocked'
    | 'agent.completed'
    | 'agent.failed';

export interface MemoryEvent {
    id: string;
    workspacePath: string;
    eventType: MemoryEventType;
    payload?: string;
    relativePath?: string;
    promptSignature?: string;
    sessionId?: string;
    taskId?: string;
    createdAt: string;
}

export interface MemoryEventRecordRequest {
    workspacePath: string;
    eventType: MemoryEvent['eventType'];
    payload?: string;
    relativePath?: string;
    promptSignature?: string;
    sessionId?: string;
    taskId?: string;
}

export interface MemoryEventListRequest {
    workspacePath: string;
    eventTypes?: MemoryEvent['eventType'][];
    relativePath?: string;
    promptSignature?: string;
    limit?: number;
    since?: string;
}

export interface MemoryUpdateMemoryRequest {
    workspacePath: string;
    id: string;
    patch: Partial<Pick<MemoryItem, 'workspacePath' | 'scope' | 'repositoryUrl' | 'repositoryId' | 'sessionId' | 'taskId' | 'expiresAt' | 'retentionPolicy' | 'memoryType' | 'title' | 'content' | 'status' | 'staleStatus' | 'importance' | 'weight' | 'lastAccessedAt' | 'accessCount' | 'source' | 'evidence' | 'supersededBy' | 'supersedes' | 'originMarkers'>>;
}

export interface MemoryUpdateMemoryAccessRequest {
    workspacePath: string;
    id: string;
}

export interface MemoryPromoteMemoryToIdeRequest {
    workspacePath: string;
    id: string;
    reason?: string;
}

export interface MemoryDemoteMemoryToWorkspaceRequest {
    workspacePath: string;
    id: string;
    reason?: string;
}

export interface MemoryRunMemoryDecayRequest {
    workspacePath: string;
    now?: string;
    dryRun?: boolean;
}

export interface MemoryRunMemoryDecayResult {
    workspacePath: string;
    evaluated: number;
    decayed: number;
    unchanged: number;
    dryRun: boolean;
    ranAt: string;
    pruningProposals: MemoryPruningProposal[];
    changes: Array<{
        id: string;
        scope: MemoryScope;
        title: string;
        previousWeight: number;
        nextWeight: number;
        previousStaleStatus: MemoryItem['staleStatus'];
        nextStaleStatus: MemoryItem['staleStatus'];
        lastAccessedAt: string;
        accessCount: number;
    }>;
}

export interface MemoryForgetMemoryRequest {
    workspacePath: string;
    id: string;
}

export interface MemoryForgetWorkspaceLearningRequest {
    workspacePath: string;
}

export interface MemoryForgetWorkspaceLearningResult {
    workspacePath: string;
    promptEventsDeleted: number;
    derivedMemoriesDeleted: number;
    memoryVectorsDeleted: number;
    knowledgeConceptsDeleted: number;
    knowledgeLinksDeleted: number;
}

export type MemoryFeedbackKind = 'accepted' | 'rejected' | 'stale';
export type MemoryFeedbackTargetKind = 'retrieval-result' | 'context-suggestion' | 'memory' | 'skill' | 'event';

export interface MemoryFeedbackRecord {
    id: string;
    workspacePath: string;
    promptSignature?: string;
    targetKind: MemoryFeedbackTargetKind;
    targetId: string;
    targetSourceKind?: MemorySourceKind;
    targetUri?: string;
    targetTitle?: string;
    feedback: MemoryFeedbackKind;
    reason?: string;
    evidence?: string;
    metadata?: Record<string, string | number | boolean>;
    createdAt: string;
    resolvedAt?: string;
}

export interface MemoryFeedbackRequest {
    workspacePath: string;
    promptSignature?: string;
    targetKind: MemoryFeedbackTargetKind;
    targetId: string;
    targetSourceKind?: MemorySourceKind;
    targetUri?: string;
    targetTitle?: string;
    feedback: MemoryFeedbackKind;
    reason?: string;
    evidence?: string;
    metadata?: Record<string, string | number | boolean>;
}

export interface MemoryFeedbackSearchRequest {
    workspacePath: string;
    promptSignature?: string;
    targetIds?: string[];
    targetSourceKinds?: MemorySourceKind[];
    targetKinds?: MemoryFeedbackTargetKind[];
    feedback?: MemoryFeedbackKind[];
    unresolvedOnly?: boolean;
    limit?: number;
}

export interface MemoryResolveFeedbackRequest {
    workspacePath: string;
    id: string;
}

export interface MemorySkillDecisionRequest {
    workspacePath: string;
    id: string;
    status: MemorySkillCandidate['status'];
    reason?: string;
}

export interface MemorySkillCandidateProposalRequest {
    workspacePath: string;
    signature: string;
    title: string;
    description: string;
    proposedSkillJson?: string;
    evidence?: string;
    source?: string;
    generationSources?: MemorySkillSuggestionSource[];
}

export interface MemoryContextSuggestion {
    id: string;
    title: string;
    reason: string;
    sourceKind: MemorySourceKind;
    score: number;
    estimatedTokens: number;
    uri?: string;
    rankingSignals?: MemoryRankingSignals;
}

export type MemoryCodeChunkKind = 'file' | 'symbol' | 'markdown-section' | 'json-block' | 'yaml-block' | 'sql-schema' | 'sql-migration' | 'sql-procedure' | 'sql-relation' | 'pdf-page' | 'office-document' | 'image-metadata' | 'diagram-document' | 'media-transcript' | 'media-metadata' | 'text-block';

export interface MemoryCodeChunk {
    id: string;
    workspacePath: string;
    fileId: string;
    relativePath: string;
    languageId?: string;
    chunkKind: MemoryCodeChunkKind;
    title: string;
    content: string;
    contentHash: string;
    symbolName?: string;
    startLine: number;
    endLine: number;
    estimatedTokens: number;
    indexedAt: string;
    sourceKind?: MemorySourceKind;
    source?: string;
    origin?: string;
    externalCollectionId?: string;
    externalCollectionLabel?: string;
}

export interface MemoryGraphSnapshot {
    id: string;
    workspacePath: string;
    label?: string;
    graphJson?: string;
    createdAt?: string;
    indexedAt?: string;
    fileCount?: number;
    symbolCount?: number;
    relationCount?: number;
    contentHash?: string;
    graph?: MemoryGraph;
}

export interface MemoryGraphDiffRecord extends GraphDiffResult {
    id: string;
    workspacePath: string;
    createdAt: string;
    beforeSnapshotId?: string;
    afterSnapshotId: string;
}

export interface MemoryChangeImpact {
    id: string;
    workspacePath: string;
    relativePath?: string;
    sourceId?: string;
    summary: string;
    riskScore: number;
    impactJson?: string;
    createdAt: string;
}

export type MemoryChangeSetSource = 'git-diff' | 'file-events' | 'none';

export interface MemoryChangeSetRequest {
    workspacePath: string;
    baseRef?: string;
    compareRef?: string;
    includeUntracked?: boolean;
    since?: string;
    events?: MemoryEvent[];
}

export interface MemoryChangeSetResult {
    workspacePath: string;
    changedFilePaths: string[];
    source: MemoryChangeSetSource;
    diagnostics: string[];
}

export interface MemoryDetectChangeImpactRequest extends MemoryChangeSetRequest {
    maxDepth?: number;
}

export interface MemoryDetectedChangeImpact extends BlastRadiusResult {
    changeSet: MemoryChangeSetResult;
    storedImpactIds: string[];
}

export interface MemoryStoredContextSuggestion extends MemoryContextSuggestion {
    workspacePath: string;
    promptSignature: string;
    createdAt: string;
    accepted?: boolean;
}

export interface MemoryContextSuggestionRequest {
    workspacePath: string;
    prompt: string;
    limit?: number;
    tokenBudget?: number;
    sourceKinds?: MemorySourceKind[];
    sessionId?: string;
    taskId?: string;
    rankingWeights?: Partial<MemoryRankingWeights>;
}

export interface MemoryContextSuggestionResult {
    suggestions: MemoryContextSuggestion[];
    estimatedTokens: number;
    omittedCount: number;
}

export interface MemoryBenchmarkRequest {
    workspacePath: string;
    limit?: number;
}

export interface MemoryBenchmarkDatasetItem {
    id: string;
    prompt: string;
    expectedSourceKind: MemorySourceKind;
    expectedIds?: string[];
    expectedTerms?: string[];
    scope?: MemoryScope;
}

export type MemoryBenchmarkDatasetDomain = 'retrieval' | 'ranking' | 'security' | 'indexing' | 'multi-session-memory';

export interface MemoryBenchmarkDatasetSuite {
    id: string;
    version: number;
    title: string;
    description: string;
    domains: MemoryBenchmarkDatasetDomain[];
    createdAt: string;
    updatedAt: string;
    cases: MemoryBenchmarkDatasetItem[];
    expectedMinimumRecall: number;
    securityExpectations?: {
        sensitiveFiles: number;
        sensitiveResults: number;
        secretLikeSnippets: number;
    };
}

export interface MemoryBenchmarkCaseResult extends MemoryBenchmarkDatasetItem {
    latencyMs: number;
    hit: boolean;
    topResultId?: string;
    topResultTitle?: string;
    topResultSourceKind?: MemorySourceKind;
    resultCount: number;
    estimatedTokens: number;
}

export interface MemoryBenchmarkSecurityReport {
    sensitiveFiles: number;
    sensitiveResults: number;
    secretLikeSnippets: number;
    status: 'passed' | 'attention' | 'failed';
}

export interface MemoryBenchmarkFeedbackReport {
    suggestedCount: number;
    acceptedCount: number;
    rejectedCount: number;
    rejectionRate: number;
    unresolvedFeedbackCount: number;
    feedbackAppliedResultCount: number;
    feedbackBoostedResultCount: number;
    feedbackPenalizedResultCount: number;
    averageFeedbackMultiplier: number;
    status: 'passed' | 'attention';
}

export interface MemoryIndexingLatencyBenchmark {
    workspacePath: string;
    indexedAt: string;
    durationMs: number;
    fileCount: number;
    indexedFileCount: number;
    indexedChunkCount: number;
    ignoredFileCount: number;
    sensitiveFileCount: number;
    largeFileCount: number;
    generatedFileCount: number;
    binaryFileCount: number;
    multiLanguageFileCount: number;
    languageCount: number;
    filesPerSecond: number;
    indexedFilesPerSecond: number;
    chunksPerSecond: number;
    ignoredBreakdown: Record<MemoryFileIgnoreReasonKind | 'sensitive' | 'large' | 'generated' | 'binary', number>;
    languageBreakdown: Record<string, number>;
    status: 'passed' | 'attention';
    summary: string;
}

export interface MemoryBenchmarkReport {
    workspacePath: string;
    generatedAt: string;
    datasetSize: number;
    baselineTokens: number;
    contextTokens: number;
    tokenReductionPercent: number;
    recall: number;
    multiSessionRecall: number;
    averageLatencyMs: number;
    p95LatencyMs: number;
    security: MemoryBenchmarkSecurityReport;
    feedback: MemoryBenchmarkFeedbackReport;
    indexingLatency?: MemoryIndexingLatencyBenchmark;
    cases: MemoryBenchmarkCaseResult[];
    summary: string;
}

export type MemoryKnowledgeGraphScope = 'global' | 'workspace';
export type MemoryKnowledgeGraphStatus = 'active' | 'archived';
export type MemoryKnowledgeConceptKind =
    | 'decision'
    | 'constraint'
    | 'concept'
    | 'component'
    | 'memory'
    | 'risk'
    | 'todo'
    | 'preference'
    | 'file'
    | 'skill'
    | 'document';
export type MemoryKnowledgeConceptStatus = 'active' | 'candidate' | 'archived' | 'rejected' | 'blocked' | 'stale';
export type MemoryKnowledgeLinkKind =
    | 'related_to'
    | 'supports'
    | 'contradicts'
    | 'depends_on'
    | 'implements'
    | 'documents'
    | 'decides'
    | 'replaces'
    | 'conflicts_with'
    | 'blocks'
    | 'derived_from'
    | 'surprising_connection';
export type MemoryKnowledgeExportFormat = 'json' | 'markdown' | 'dot' | 'context-cart';
export type MemoryKnowledgeSourceKind = MemorySourceKind | 'knowledge-graph';

export interface MemoryKnowledgeConceptInput {
    id?: string;
    kind?: MemoryKnowledgeConceptKind;
    title: string;
    summary: string;
    status?: MemoryKnowledgeConceptStatus;
    sourceKind?: MemoryKnowledgeSourceKind;
    sourceId?: string;
    uri?: string;
    evidence?: string;
    tags?: string[];
    weight?: number;
    metadata?: Record<string, string | number | boolean | string[]>;
}

export interface MemoryKnowledgeConcept extends MemoryKnowledgeConceptInput {
    id: string;
    graphId: string;
    kind: MemoryKnowledgeConceptKind;
    status: MemoryKnowledgeConceptStatus;
    createdAt: string;
    updatedAt: string;
}

export interface MemoryKnowledgeLinkInput {
    id?: string;
    sourceConceptId: string;
    targetConceptId: string;
    linkKind?: MemoryKnowledgeLinkKind;
    status?: MemoryKnowledgeConceptStatus;
    label?: string;
    confidenceScore?: number;
    evidence?: string;
    metadata?: Record<string, string | number | boolean | string[]>;
}

export interface MemoryKnowledgeLink extends MemoryKnowledgeLinkInput {
    id: string;
    graphId: string;
    linkKind: MemoryKnowledgeLinkKind;
    confidenceScore: number;
    createdAt: string;
    updatedAt: string;
}

export interface MemoryKnowledgeGraph {
    id: string;
    workspacePath?: string;
    scope: MemoryKnowledgeGraphScope;
    title: string;
    description?: string;
    status: MemoryKnowledgeGraphStatus;
    tags?: string[];
    concepts: MemoryKnowledgeConcept[];
    links: MemoryKnowledgeLink[];
    metadata?: Record<string, string | number | boolean | string[]>;
    createdAt: string;
    updatedAt: string;
}

export interface MemoryCreateKnowledgeGraphRequest {
    workspacePath: string;
    title?: string;
    description?: string;
    scope?: MemoryKnowledgeGraphScope;
    tags?: string[];
    seedFromMemories?: boolean;
}

export interface MemoryAddKnowledgeConceptRequest {
    workspacePath: string;
    graphId: string;
    concept: MemoryKnowledgeConceptInput;
}

export interface MemoryLinkKnowledgeConceptsRequest extends MemoryKnowledgeLinkInput {
    workspacePath: string;
    graphId: string;
}

export interface MemorySearchKnowledgeRequest {
    workspacePath: string;
    query: string;
    graphId?: string;
    limit?: number;
    includeArchived?: boolean;
}

export interface MemoryKnowledgeSearchResult {
    id: string;
    graphId: string;
    graphTitle: string;
    kind: 'concept' | 'link';
    title: string;
    excerpt: string;
    score: number;
    sourceKind: MemoryKnowledgeSourceKind;
    sourceId?: string;
    uri?: string;
    evidence?: string;
    concept?: MemoryKnowledgeConcept;
    link?: MemoryKnowledgeLink;
}

export interface MemoryKnowledgeContextCartItem {
    id: string;
    title: string;
    content: string;
    sourceKind: MemoryKnowledgeSourceKind;
    uri?: string;
    estimatedTokens: number;
    metadata?: Record<string, string | number | boolean>;
}

export interface MemoryExportKnowledgeGraphRequest {
    workspacePath: string;
    graphId?: string;
    format: MemoryKnowledgeExportFormat;
}

export interface MemoryKnowledgeGraphExport {
    graphId: string;
    format: MemoryKnowledgeExportFormat;
    mimeType: string;
    fileName: string;
    content: string;
    exportedAt: string;
    graph?: MemoryKnowledgeGraph;
    contextCart?: MemoryKnowledgeContextCartItem[];
}

export interface MemoryIcmMemory {
    id?: string;
    topic?: string;
    title?: string;
    text?: string;
    content?: string;
    body?: string;
    kind?: string;
    importance?: string;
    weight?: number;
    created_at?: string;
    updated_at?: string;
    last_accessed_at?: string;
    access_count?: number;
    metadata?: Record<string, string | number | boolean | string[]>;
}

export interface MemoryIcmMemoirConcept {
    id?: string;
    name?: string;
    title?: string;
    description?: string;
    labels?: string[];
    confidence?: number;
    metadata?: Record<string, string | number | boolean | string[]>;
}

export interface MemoryIcmMemoirLink {
    id?: string;
    from?: string;
    to?: string;
    source?: string;
    target?: string;
    relation?: string;
    type?: string;
    confidence?: number;
    evidence?: string;
}

export interface MemoryIcmMemoir {
    id?: string;
    name?: string;
    title?: string;
    description?: string;
    concepts?: MemoryIcmMemoirConcept[];
    links?: MemoryIcmMemoirLink[];
    metadata?: Record<string, string | number | boolean | string[]>;
}

export interface MemoryIcmBridgeBundle {
    version: 1;
    exportedAt: string;
    workspacePath: string;
    source: 'cybervinci-memory' | 'icm';
    memories: MemoryIcmMemory[];
    memoirs: MemoryIcmMemoir[];
    limits: string[];
}

export interface MemoryIcmImportRequest {
    workspacePath: string;
    data: Partial<MemoryIcmBridgeBundle> & {
        memories?: MemoryIcmMemory[];
        memoirs?: MemoryIcmMemoir[];
    };
    activateMemories?: boolean;
}

export interface MemoryIcmExportRequest {
    workspacePath: string;
    includeArchived?: boolean;
}

export interface MemoryIcmImportResult {
    importedMemories: number;
    importedMemoirs: number;
    deduplicatedMemories: number;
    limits: string[];
}

export interface TokenBudgetRequest {
    budgetTokens: number;
    reservedTokens?: number;
    items: Array<{
        id: string;
        text: string;
        priority?: number;
    }>;
}

export interface TokenBudgetResult {
    selectedIds: string[];
    omittedIds: string[];
    estimatedTokens: number;
    budgetTokens: number;
}

export interface ContextPackRequest {
    workspacePath: string;
    prompt: string;
    retrievalResults: RetrievalResult[];
    tokenBudget?: number;
}

export interface ContextPack {
    workspacePath: string;
    promptSignature: string;
    estimatedTokens: number;
    sections: PromptSection[];
    citations: Array<{
        resultId: string;
        sourceKind: MemorySourceKind;
        title: string;
        uri?: string;
    }>;
}

export interface MemoryExport {
    exportedAt: string;
    workspacePath?: string;
    memories: MemoryItem[];
}

export interface MemoryImportResult {
    imported: number;
    skipped: number;
    memories: MemoryItem[];
}

export type MemoryImportDiffClassification =
    | 'new'
    | 'duplicate'
    | 'conflicting'
    | 'obsolete'
    | 'sensitive'
    | 'not_importable';

export interface MemoryImportDiffEntry {
    memoryId?: string;
    title?: string;
    classification: MemoryImportDiffClassification;
    importable: boolean;
    reason: string;
    existingMemoryId?: string;
    redactionCount?: number;
}

export interface MemoryWorkspaceImportResult {
    importedMemories: number;
    skippedMemories: number;
    memoryDiff: MemoryImportDiffEntry[];
    importedKnowledgeConceptCandidates?: number;
    importedKnowledgeLinkCandidates?: number;
}

export interface MemoryGraphifyImportRequest {
    workspacePath: string;
    graphPath?: string;
    graphJson?: string;
}

export type MemoryGraphifyImportDiffClassification = MemoryImportDiffClassification;

export interface MemoryGraphifyImportDiffEntry {
    itemId?: string;
    title?: string;
    itemKind: 'concept' | 'link';
    classification: MemoryGraphifyImportDiffClassification;
    importable: boolean;
    reason: string;
    existingItemId?: string;
    redactionCount?: number;
}

export interface MemoryGraphifyImportResult {
    graphId?: string;
    importedKnowledgeConceptCandidates: number;
    importedKnowledgeLinkCandidates: number;
    skippedNodes: number;
    skippedEdges: number;
    diff: MemoryGraphifyImportDiffEntry[];
    warnings: string[];
}

export interface MemoryWorkspaceExportRequest {
    workspacePath: string;
    /**
     * Workspace exports omit IDE/global memories by default. Set this only for
     * explicit user-requested full exports that may carry cross-workspace data.
     */
    includeGlobalMemories?: boolean;
    /**
     * Session and task memories are temporary and omitted by default unless the
     * caller explicitly exports ephemeral state for review.
     */
    includeEphemeralMemories?: boolean;
}

export interface MemoryPortableInstallRequest extends MemoryWorkspaceExportRequest {
    /**
     * Installation is an explicit user action from the UI/command layer. The
     * backend requires this flag so programmatic callers cannot write portable
     * artifacts into the repository by accident.
     */
    confirmed: boolean;
}

export interface MemoryPortableInstallResult {
    workspacePath: string;
    installPath: string;
    artifactCount: number;
    files: string[];
}

export type MemoryPortablePackageAction = 'ignore' | 'remove-local-reference' | 'regenerate';

export interface MemoryPortablePackageActionRequest extends MemoryWorkspaceExportRequest {
    action: MemoryPortablePackageAction;
    /**
     * Portable package maintenance writes or removes files in the workspace.
     * The backend requires explicit confirmation for every action.
     */
    confirmed: boolean;
}

export interface MemoryPortablePackageActionResult {
    workspacePath: string;
    installPath: string;
    action: MemoryPortablePackageAction;
    ignored: boolean;
    removed: boolean;
    regenerated: boolean;
    files: string[];
}

export interface MemoryPortablePackageSummary {
    detected: boolean;
    installPath: string;
    source?: string;
    version?: number;
    exportedAt?: string;
    installedAt?: string;
    author?: string;
    machine?: string;
    producer?: string;
    workspacePath?: string;
    policies: Record<string, boolean | string | number>;
    counts: Record<string, number>;
    artifactPaths: string[];
    summary: string;
    warnings: string[];
}

export interface MemoryPortableArtifact {
    path: string;
    mediaType: string;
    content: string;
}

export interface MemoryStandaloneProjectGraphFile {
    id: string;
    relativePath: string;
    fileName: string;
    extension?: string;
    languageId?: string;
    sizeBytes: number;
    contentHash: string;
    indexedAt?: string;
    classificationMarkers: string[];
    originMarkers: string[];
    ignoreReason?: MemoryFileIgnoreReason;
}

export interface MemoryStandaloneProjectGraphSymbol {
    id: string;
    fileId: string;
    languageId: string;
    symbolKind: MemorySymbol['symbolKind'];
    name: string;
    fullName?: string;
    parentSymbolId?: string;
    signature?: string;
    startLine?: number;
    endLine?: number;
    attributes?: string[];
    modifiers?: string[];
    returnType?: string;
    metadata?: MemorySymbol['metadata'];
    classificationMarkers: string[];
    originMarkers: string[];
}

export interface MemoryStandaloneProjectGraphRelation {
    id: string;
    sourceKind: MemoryNodeKind;
    sourceId: string;
    targetKind: MemoryNodeKind;
    targetId: string;
    relationType: MemoryGraphRelationType;
    confidenceLevel: MemoryRelation['confidenceLevel'];
    confidenceScore: number;
    evidence?: string;
    metadata?: MemoryRelation['metadata'];
    classificationMarkers: string[];
    originMarkers: string[];
}

export interface MemoryStandaloneProjectGraphConcept {
    id: string;
    graphId: string;
    kind: MemoryKnowledgeConceptKind;
    title: string;
    summary: string;
    status: MemoryKnowledgeConceptStatus;
    sourceKind?: MemoryKnowledgeConcept['sourceKind'];
    sourceId?: string;
    uri?: string;
    evidence?: string;
    confidenceScore?: number;
    weight?: number;
    tags?: string[];
    createdAt: string;
    updatedAt: string;
    classificationMarkers: string[];
    originMarkers: string[];
}

export interface MemoryStandaloneProjectGraphLink {
    id: string;
    graphId: string;
    sourceConceptId: string;
    targetConceptId: string;
    linkKind: MemoryKnowledgeLinkKind;
    label?: string;
    evidence?: string;
    confidenceScore: number;
    createdAt: string;
    updatedAt: string;
    classificationMarkers: string[];
    originMarkers: string[];
    metadata?: MemoryKnowledgeLink['metadata'];
}

export interface MemoryStandaloneProjectGraph {
    version: 1;
    exportedAt: string;
    workspacePath: string;
    source: 'cybervinci-memory';
    policies: Record<string, boolean | string | number>;
    files: MemoryStandaloneProjectGraphFile[];
    symbols: MemoryStandaloneProjectGraphSymbol[];
    relations: MemoryStandaloneProjectGraphRelation[];
    concepts: MemoryStandaloneProjectGraphConcept[];
    links: MemoryStandaloneProjectGraphLink[];
    metadata: {
        fileCount: number;
        symbolCount: number;
        relationCount: number;
        conceptCount: number;
        linkCount: number;
        knowledgeGraphCount: number;
    };
}

export interface MemoryExportBundle {
    version: number;
    exportedAt: string;
    workspacePath: string;
    settings: MemoryWorkspaceSettings;
    files: MemoryFile[];
    symbols: MemorySymbol[];
    relations: MemoryRelation[];
    codeChunks: MemoryCodeChunk[];
    graphSnapshots: MemoryGraphSnapshot[];
    changeImpacts: MemoryChangeImpact[];
    contextSuggestions: MemoryStoredContextSuggestion[];
    memories: MemoryItem[];
    memorySpaces?: MemorySpace[];
    memoryVectors?: MemoryVector[];
    knowledgeGraphs: MemoryKnowledgeGraph[];
    skillCandidates: MemorySkillCandidate[];
    events: MemoryEvent[];
    feedbackRecords: MemoryFeedbackRecord[];
    artifacts?: MemoryPortableArtifact[];
}

export interface GraphQueryRequest {
    workspacePath?: string;
    nodeId?: string;
    filePath?: string;
    symbolName?: string;
    depth?: number;
}

export interface GraphQueryResult {
    nodes: MemoryGraphNode[];
    edges: MemoryGraphEdge[];
}

export interface BlastRadiusRequest {
    changedFilePaths: string[];
    files: MemoryFile[];
    symbols: MemorySymbol[];
    relations: MemoryRelation[];
    events?: MemoryEvent[];
    memories?: MemoryItem[];
    maxDepth?: number;
}

export interface BlastRadiusImpact {
    file: MemoryFile;
    riskScore: number;
    reasons: string[];
    relatedSymbols: MemorySymbol[];
    relatedTests: MemoryFile[];
    centralityScore?: number;
    recentChangeCount?: number;
    coverageStatus?: 'covered' | 'low_inferred_coverage';
    sensitiveMemoryIds?: string[];
}

export interface BlastRadiusResult {
    impacts: BlastRadiusImpact[];
    graph: MemoryGraph;
}

export interface MemoryPullRequestGraphAnalysisRequest extends BlastRadiusRequest {
    contextLimit?: number;
}

export interface MemoryPullRequestAffectedCommunity {
    community: GraphCommunity;
    changedFilePaths: string[];
    impactedFilePaths: string[];
    riskScore: number;
    reasons: string[];
}

export interface MemoryPullRequestRiskFile {
    relativePath: string;
    riskScore: number;
    reasons: string[];
    relatedSymbolIds: string[];
    relatedTestPaths: string[];
    sensitiveMemoryIds: string[];
}

export interface MemoryPullRequestTouchedMemory {
    id: string;
    title: string;
    scope: MemoryScope;
    source: MemoryItem['source'];
    importance: MemoryItem['importance'];
    weight: number;
    staleStatus: MemoryItem['staleStatus'];
    status: MemoryItem['status'];
    evidence?: string;
    reason: string;
}

export interface MemoryPullRequestRecommendedContext {
    id: string;
    sourceKind: MemorySourceKind;
    title: string;
    uri?: string;
    score: number;
    evidence: string;
    reason: string;
}

export type MemoryAnalysisCitationKind = 'file' | 'symbol' | 'memory' | 'relation' | 'doc' | 'community';

export interface MemoryAnalysisCitation {
    id: string;
    kind: MemoryAnalysisCitationKind;
    title: string;
    uri?: string;
    scope?: MemoryScope;
    sourceKind?: MemorySourceKind;
    evidence?: string;
    reason: string;
}

export interface MemoryCompactAnalysisContext {
    summary: string;
    highlights: string[];
    recommendedContext: MemoryPullRequestRecommendedContext[];
    citations: MemoryAnalysisCitation[];
}

export type MemoryFlowAgentKind = 'review' | 'impact' | 'tests' | 'security';

export interface MemoryFlowAgentSuggestion {
    id: string;
    kind: MemoryFlowAgentKind;
    title: string;
    priority: number;
    riskScore: number;
    affectedCommunityIds: string[];
    affectedFilePaths: string[];
    evidence: string;
    reason: string;
}

export interface MemoryPullRequestGraphAnalysisResult {
    changedFilePaths: string[];
    affectedCommunities: MemoryPullRequestAffectedCommunity[];
    highRiskFiles: MemoryPullRequestRiskFile[];
    relatedTests: MemoryFile[];
    touchedMemories: MemoryPullRequestTouchedMemory[];
    recommendedContext: MemoryPullRequestRecommendedContext[];
    flowAgentSuggestions: MemoryFlowAgentSuggestion[];
    blastRadius: BlastRadiusResult;
    graph: MemoryGraph;
    compactContext: MemoryCompactAnalysisContext;
    summary: string;
}

export interface MemoryConflictAnalysisRequest extends BlastRadiusRequest {
    conflictingFilePaths: string[];
    contextLimit?: number;
}

export interface MemoryConflictAffectedRelation {
    id: string;
    sourceKind: MemoryNodeKind;
    sourceId: string;
    targetKind: MemoryNodeKind;
    targetId: string;
    relationType: MemoryGraphRelationType;
    confidenceScore: number;
    evidence?: string;
    reason: string;
}

export interface MemoryConflictAffectedDoc {
    id: string;
    title: string;
    uri?: string;
    relationIds: string[];
    evidence?: string;
    reason: string;
}

export interface MemoryConflictRiskArea {
    id: string;
    title: string;
    riskScore: number;
    affectedFilePaths: string[];
    relationTypes: MemoryGraphRelationType[];
    memoryIds: string[];
    docIds: string[];
    reasons: string[];
}

export interface MemoryConflictAnalysisResult {
    conflictingFilePaths: string[];
    affectedRelations: MemoryConflictAffectedRelation[];
    affectedMemories: MemoryPullRequestTouchedMemory[];
    affectedDocs: MemoryConflictAffectedDoc[];
    riskAreas: MemoryConflictRiskArea[];
    recommendedContext: MemoryPullRequestRecommendedContext[];
    pullRequestAnalysis: MemoryPullRequestGraphAnalysisResult;
    compactContext: MemoryCompactAnalysisContext;
    summary: string;
}

export interface GodNodeAnalysisRequest {
    files: MemoryFile[];
    symbols: MemorySymbol[];
    relations: MemoryRelation[];
    minDegree?: number;
    minCriticalPathCount?: number;
    maxCriticalPathDepth?: number;
    limit?: number;
}

export interface GodNodeMetric {
    id: string;
    kind: 'file' | 'symbol';
    label: string;
    detail?: string;
    degree: number;
    fanIn: number;
    fanOut: number;
    criticalPathCount: number;
    criticalPathIds: string[];
    score: number;
    reasons: string[];
}

export interface GodNodeAnalysisResult {
    nodes: GodNodeMetric[];
    thresholds: {
        minDegree: number;
        minCriticalPathCount: number;
        maxCriticalPathDepth: number;
    };
}

export interface GraphCommunityDetectionRequest {
    files: MemoryFile[];
    symbols: MemorySymbol[];
    relations: MemoryRelation[];
    minCommunitySize?: number;
    maxCommunities?: number;
    maxIterations?: number;
}

export interface GraphCommunityRelationSummary {
    relationType: MemoryGraphRelationType;
    count: number;
    confidenceScore: number;
}

export interface GraphCommunityMainRelation {
    id: string;
    sourceId: string;
    targetId: string;
    relationType: MemoryGraphRelationType;
    confidenceScore: number;
    evidence?: string;
}

export interface GraphCommunity {
    id: string;
    name: string;
    nodeIds: string[];
    fileIds: string[];
    symbolIds: string[];
    centralNodeIds: string[];
    relationSummaries: GraphCommunityRelationSummary[];
    mainRelations: GraphCommunityMainRelation[];
    score: number;
    reasons: string[];
}

export interface GraphCommunityDetectionResult {
    communities: GraphCommunity[];
    thresholds: {
        minCommunitySize: number;
        maxCommunities: number;
        maxIterations: number;
    };
}

export interface GraphDiffRequest {
    before: {
        files: MemoryFile[];
        symbols: MemorySymbol[];
        relations: MemoryRelation[];
    };
    after: {
        files: MemoryFile[];
        symbols: MemorySymbol[];
        relations: MemoryRelation[];
    };
}

export interface GraphDiffResult {
    addedFileIds: string[];
    removedFileIds: string[];
    changedFileIds: string[];
    addedSymbolIds: string[];
    removedSymbolIds: string[];
    addedRelationIds: string[];
    removedRelationIds: string[];
}

export interface MemoryTableColumn {
    name: string;
    type: 'TEXT' | 'INTEGER' | 'REAL' | 'BLOB';
    nullable?: boolean;
    primaryKey?: boolean;
    indexed?: boolean;
}

export interface MemoryTableSchema {
    name: `pi_${string}`;
    columns: MemoryTableColumn[];
    indexes?: Array<{
        name: string;
        columns: string[];
        unique?: boolean;
    }>;
}

export interface MemoryMigration {
    id: string;
    description: string;
    statements: string[];
}

export interface MemorySchema {
    version: number;
    tables: MemoryTableSchema[];
    migrations: MemoryMigration[];
}

export interface MemoryGraphNode {
    id: string;
    kind: MemoryNodeKind;
    label: string;
    detail?: string;
    source?: MemorySourceKind;
    staleStatus?: MemoryItem['staleStatus'];
    riskScore?: number;
    relativePath?: string;
    line?: number;
    semanticTags?: string[];
    changeStatus?: 'added' | 'modified' | 'deleted' | 'unchanged' | 'impacted';
}

export interface MemoryGraphEvidence {
    kind: MemoryGraphEvidenceKind;
    source: MemorySourceKind | MemoryKnowledgeSourceKind | 'manual' | 'security-scan' | 'test-run';
    sourceId?: string;
    uri?: string;
    summary: string;
    confidenceScore: number;
    capturedAt?: string;
    redacted?: boolean;
}

export interface MemorySpecializedGraphNode extends MemoryGraphNode {
    graphKind: MemorySpecializedGraphKind;
    kind:
        | MemoryArchitectureGraphNodeKind
        | MemoryDomainGraphNodeKind
        | MemoryTestGraphNodeKind
        | MemorySecurityGraphNodeKind
        | MemoryWorkflowGraphNodeKind
        | MemoryUserPreferenceGraphNodeKind;
    scope?: MemoryScope;
    workspacePath?: string;
    repositoryUrl?: string;
    repositoryId?: string;
    sourceIds?: string[];
    evidence?: MemoryGraphEvidence[];
    importance?: MemoryImportance;
    weight?: number;
    owner?: string;
    status?: 'active' | 'candidate' | 'archived' | 'rejected' | 'blocked' | 'unknown';
}

export interface MemoryGraphEdge {
    id: string;
    sourceId: string;
    targetId: string;
    relationType: MemoryGraphRelationType;
    confidenceScore: number;
    label?: string;
    evidence?: MemoryGraphEvidence[];
    staleStatus?: MemoryItem['staleStatus'];
    metadata?: Record<string, string | number | boolean | string[]>;
}

export interface MemoryGraph {
    id?: string;
    kind?: MemoryGraphKind;
    scope?: MemoryScope;
    workspacePath?: string;
    repositoryUrl?: string;
    repositoryId?: string;
    title: string;
    nodes: MemoryGraphNode[];
    edges: MemoryGraphEdge[];
    generatedAt?: string;
    sourceKinds?: MemorySourceKind[];
    metadata?: Record<string, string | number | boolean | string[]>;
}

export interface MemoryArchitectureGraph extends MemoryGraph {
    kind: 'architecture';
    nodes: Array<MemorySpecializedGraphNode & { graphKind: 'architecture'; kind: MemoryArchitectureGraphNodeKind }>;
}

export interface MemoryDomainGraph extends MemoryGraph {
    kind: 'domain';
    ubiquitousLanguage?: string[];
    nodes: Array<MemorySpecializedGraphNode & { graphKind: 'domain'; kind: MemoryDomainGraphNodeKind }>;
}

export interface MemoryTestGraph extends MemoryGraph {
    kind: 'tests';
    coveragePercent?: number;
    nodes: Array<MemorySpecializedGraphNode & { graphKind: 'tests'; kind: MemoryTestGraphNodeKind }>;
}

export interface MemorySecurityGraph extends MemoryGraph {
    kind: 'security';
    threatModelStatus?: 'unknown' | 'draft' | 'reviewed' | 'stale';
    nodes: Array<MemorySpecializedGraphNode & { graphKind: 'security'; kind: MemorySecurityGraphNodeKind }>;
}

export interface MemoryWorkflowGraph extends MemoryGraph {
    kind: 'workflow';
    nodes: Array<MemorySpecializedGraphNode & { graphKind: 'workflow'; kind: MemoryWorkflowGraphNodeKind }>;
}

export interface MemoryUserPreferenceGraph extends MemoryGraph {
    kind: 'user-preferences';
    nodes: Array<MemorySpecializedGraphNode & { graphKind: 'user-preferences'; kind: MemoryUserPreferenceGraphNodeKind }>;
}

export type MemorySpecializedGraph =
    | MemoryArchitectureGraph
    | MemoryDomainGraph
    | MemoryTestGraph
    | MemorySecurityGraph
    | MemoryWorkflowGraph
    | MemoryUserPreferenceGraph;

export interface MemoryGraphBundle {
    version: 1;
    exportedAt: string;
    workspacePath?: string;
    repositoryUrl?: string;
    repositoryId?: string;
    graphs: MemorySpecializedGraph[];
    limits?: string[];
}

export interface RetrievalQuery {
    workspacePath: string;
    text: string;
    limit?: number;
    sourceKinds?: MemorySourceKind[];
    repositoryUrl?: string;
    repositoryId?: string;
    sessionId?: string;
    taskId?: string;
}

export interface MemoryRankingWeights {
    bm25Score: number;
    vectorScore: number;
    graphScore: number;
    memoryWeight: number;
    recencyScore: number;
    eventTypeScore: number;
    workspaceScore: number;
    sessionTaskScore: number;
    acceptanceScore: number;
    scopeBoost: number;
    stalePenalty: number;
}

export interface MemoryRankingSignals {
    bm25Score?: number;
    vectorScore?: number;
    graphScore?: number;
    godNodeScore?: number;
    communityScore?: number;
    surprisingConnectionScore?: number;
    riskScore?: number;
    graphSignals?: string[];
    memoryWeight?: number;
    recencyScore?: number;
    eventTypeScore?: number;
    eventType?: MemoryEventType;
    workspaceScore?: number;
    sessionTaskScore?: number;
    acceptanceScore?: number;
    scopeBoost?: number;
    stalePenalty?: number;
    importance?: MemoryItem['importance'];
    weight?: number;
    staleStatus?: MemoryItem['staleStatus'];
    scope?: MemoryScope;
    feedbackMultiplier?: number;
    matchedTokenBudget?: boolean;
}

export interface RetrievalResult {
    id: string;
    sourceKind: MemorySourceKind;
    title: string;
    snippet: string;
    score: number;
    uri?: string;
    evidence?: string;
    estimatedTokens?: number;
    rankingSignals?: MemoryRankingSignals;
}

export interface MemoryRetrievalCacheEntry {
    id: string;
    workspacePath: string;
    queryKey: string;
    scopeParams: {
        workspacePath: string;
        sourceKinds: MemorySourceKind[];
        limit: number;
        repositoryUrl?: string;
        repositoryId?: string;
        sessionId?: string;
        taskId?: string;
    };
    sourcesHash: string;
    results: RetrievalResult[];
    createdAt: string;
    expiresAt: string;
}

export interface IRetrievalSource {
    readonly sourceKind: MemorySourceKind;
    search(query: RetrievalQuery): Promise<RetrievalResult[]>;
}

export interface PromptNormalizerResult {
    signature: string;
    intent: MemoryPromptIntent;
    language: string;
    targetKind: string;
    framework: string;
    action: string;
}

export type MemoryCSharpAnalysisMode = 'roslyn-semantic' | 'roslyn-parse-only' | 'structural-fallback' | 'unavailable';

export interface MemoryCSharpAnalysisStatus {
    mode: MemoryCSharpAnalysisMode;
    label: string;
    detail: string;
    analyzerId?: string;
    fileCount: number;
    symbolCount: number;
    updatedAt?: string;
}

export interface MemoryDashboard {
    settings: MemoryWorkspaceSettings;
    portablePackage?: MemoryPortablePackageSummary;
    csharpAnalysisStatus?: MemoryCSharpAnalysisStatus;
    files: MemoryFile[];
    symbols: MemorySymbol[];
    relations: MemoryRelation[];
    codeChunks: MemoryCodeChunk[];
    graphSnapshots: MemoryGraphSnapshot[];
    changeImpacts: MemoryChangeImpact[];
    contextSuggestions: MemoryStoredContextSuggestion[];
    memories: MemoryItem[];
    memorySpaces: MemorySpace[];
    memoryHealth: MemoryHealth;
    benchmarkReport?: MemoryBenchmarkReport;
    benchmarkReports: MemoryBenchmarkReport[];
    knowledgeGraphs: MemoryKnowledgeGraph[];
    skillCandidates: MemorySkillCandidate[];
    events: MemoryEvent[];
    retrievalResults: RetrievalResult[];
    suggestedQuestions: MemorySuggestedQuestion[];
    graphs: {
        code: MemoryGraph;
        documents: MemoryGraph;
        projectMemories: MemoryGraph;
        preferences: MemoryGraph;
        knowledge: MemoryGraph;
    };
}

export type MemorySuggestedQuestionSource = 'code-graph' | 'knowledge-graph' | 'project-memory' | 'local-docs' | 'risk' | 'decision';

export interface MemorySuggestedQuestion {
    id: string;
    question: string;
    source: MemorySuggestedQuestionSource;
    scope: MemoryScope;
    evidence: string;
    reason: string;
    priority: number;
    uri?: string;
}

export interface MemoryIndexRequest {
    workspacePath: string;
    /**
     * Defaults to changed-files to keep indexing incremental. local-docs indexes only
     * documentation/config text chunks and skips language graph extraction.
     */
    scope?: 'changed-files' | 'local-docs' | 'workspace';
    /**
     * Optional caller-controlled cap for backfill runs. The service may scan the
     * workspace for metadata, but only this many changed/backfill targets are chunked.
     */
    maxFiles?: number;
    /**
     * Optional file paths supplied by reactive file events. When present with the
     * changed-files scope, indexing is narrowed to these workspace-relative paths.
     */
    changedRelativePaths?: string[];
    /**
     * Optional explicit memory-vector backfill after indexing. Still requires vector
     * settings and consent, and never runs implicitly.
     */
    backfillMemories?: boolean;
    /**
     * External documentation collections are never refreshed by ordinary
     * workspace indexing. The caller must opt in through settings and pass this
     * flag, optionally narrowed to collection ids.
     */
    refreshExternalDocs?: boolean;
    externalDocCollectionIds?: string[];
}

export interface MemoryIndexResult {
    workspacePath: string;
    fileCount: number;
    changedFileCount?: number;
    indexedFileCount?: number;
    preservedChunkCount?: number;
    indexedChunkCount?: number;
    refreshedExternalDocCollectionCount?: number;
    backfillScope?: MemoryIndexRequest['scope'];
    memoryBackfillStatus?: MemoryVectorBackfillStatus;
    symbolCount: number;
    relationCount: number;
    sensitiveFileCount: number;
    indexingLatency: MemoryIndexingLatencyBenchmark;
    indexedAt: string;
}

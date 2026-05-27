// *****************************************************************************
// Copyright (C) 2026.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import {
    MemoryDashboard,
    MemoryDeleteMemoryRequest,
    MemoryDeleteSkillRequest,
    MemoryExportBundle,
    MemoryIndexRequest,
    MemoryIndexResult,
    MemoryAddKnowledgeConceptRequest,
    MemoryCreateKnowledgeGraphRequest,
    MemoryExportKnowledgeGraphRequest,
    MemoryKnowledgeConcept,
    MemoryKnowledgeGraph,
    MemoryKnowledgeGraphExport,
    MemoryKnowledgeLink,
    MemoryKnowledgeSearchResult,
    MemoryLinkKnowledgeConceptsRequest,
    MemoryMigration,
    Memory,
    MemoryConsolidationRequest,
    MemoryConsolidationResult,
    MemoryCandidateProposalRequest,
    MemoryCandidateProposalResult,
    MemoryItem,
    MemoryRequest,
    MemorySpace,
    MemoryOverview,
    MemoryScanRequest,
    MemorySearchRequest,
    MemorySkill,
    MemorySkillCandidate,
    MemorySkillCandidateProposalRequest,
    MemorySkillDecisionRequest,
    MemorySkillRequest,
    MemoryStartTranscriptSessionRequest,
    MemoryRecordTranscriptMessageRequest,
    MemoryForgetTranscriptRequest,
    MemoryForgetTranscriptResult,
    MemoryTranscriptSearchRequest,
    MemoryTranscriptSearchResult,
    MemoryTranscriptMessage,
    MemoryTranscriptSession,
    MemoryRunMemoryDecayRequest,
    MemoryRunMemoryDecayResult,
    MemoryDemoteMemoryToWorkspaceRequest,
    MemoryPromoteMemoryToIdeRequest,
    MemoryUpdateMemoryAccessRequest,
    MemoryUpdateMemoryRequest,
    MemorySearchKnowledgeRequest,
    MemoryRetrievalResult,
    MemoryUiModel,
    MemoryVectorSettingsUpdate,
    MemoryVectorStatus,
    MemoryPortableInstallRequest,
    MemoryPortableInstallResult,
    MemoryPullRequestGraphAnalysisRequest,
    MemoryPullRequestGraphAnalysisResult,
    MemoryPortablePackageActionRequest,
    MemoryPortablePackageActionResult,
    MemoryWorkspaceRequest,
    MemoryWorkspaceExportRequest,
    MemoryWorkspaceImportResult,
    MemoryWorkspaceConsentUpdateRequest,
    MemoryWorkspaceSettings,
    MemoryWorkspaceSnapshot,
    MemoryEvent,
    MemoryEventListRequest,
    MemoryEventRecordRequest,
    MemoryFeedbackRecord,
    MemoryFeedbackRequest,
    MemoryFeedbackSearchRequest,
    MemoryForgetMemoryRequest,
    MemoryForgetWorkspaceLearningRequest,
    MemoryForgetWorkspaceLearningResult,
    MemoryGraphifyImportRequest,
    MemoryGraphifyImportResult,
    MemoryIcmBridgeBundle,
    MemoryIcmExportRequest,
    MemoryIcmImportRequest,
    MemoryIcmImportResult,
    MemoryResolveFeedbackRequest,
    MemoryContextSuggestionRequest,
    MemoryContextSuggestionResult,
    MemoryConflictAnalysisRequest,
    MemoryConflictAnalysisResult,
    MemoryBenchmarkReport,
    MemoryBenchmarkRequest,
    MemoryDetectChangeImpactRequest,
    MemoryDetectedChangeImpact,
    ContextPackRequest,
    ContextPack,
    GraphQueryRequest,
    GraphQueryResult,
    GraphCommunityDetectionRequest,
    GraphCommunityDetectionResult,
    BlastRadiusRequest,
    BlastRadiusResult,
    GraphDiffRequest,
    GraphDiffResult,
    RetrievalQuery,
    RetrievalResult
} from './memory-types';

export const MemoryService = Symbol('MemoryService');
export const MemoryServicePath = '/services/memory';
export const MEMORY_SERVICE_PATH = MemoryServicePath;
export const LEGACY_MEMORY_SERVICE_PATH = '/services/project-intelligence';

export interface MemoryService {
    getStorePath(): Promise<string>;
    getWorkspaceSnapshot(request: MemoryWorkspaceRequest): Promise<MemoryWorkspaceSnapshot | undefined>;
    scanWorkspace(request: MemoryScanRequest): Promise<MemoryWorkspaceSnapshot>;
    getOverview(request: MemoryWorkspaceRequest): Promise<MemoryOverview>;
    search(request: MemorySearchRequest): Promise<MemoryRetrievalResult[]>;
    listMemories(request: MemoryWorkspaceRequest): Promise<Memory[]>;
    upsertMemory(request: MemoryRequest): Promise<Memory>;
    deleteMemory(request: MemoryDeleteMemoryRequest): Promise<boolean>;
    listSkills(request: MemoryWorkspaceRequest): Promise<MemorySkill[]>;
    upsertSkill(request: MemorySkillRequest): Promise<MemorySkill>;
    deleteSkill(request: MemoryDeleteSkillRequest): Promise<boolean>;
    getUiModel(request: MemoryWorkspaceRequest): Promise<MemoryUiModel>;
    getSettings(workspacePath: string): Promise<MemoryWorkspaceSettings>;
    updateSettings(settings: Partial<MemoryWorkspaceSettings> & { workspacePath: string }): Promise<MemoryWorkspaceSettings>;
    updateWorkspaceConsent(request: MemoryWorkspaceConsentUpdateRequest): Promise<MemoryWorkspaceSettings>;
    getVectorStatus(workspacePath: string): Promise<MemoryVectorStatus>;
    updateVectorSettings(settings: MemoryVectorSettingsUpdate): Promise<MemoryVectorStatus>;
    backfillMemoryVectors(workspacePath: string): Promise<MemoryVectorStatus>;
    listMemorySpaces(workspacePath: string): Promise<MemorySpace[]>;
    clearWorkspaceData(workspacePath: string): Promise<void>;
    getDashboard(workspacePath: string): Promise<MemoryDashboard>;
    indexWorkspace(request: MemoryIndexRequest): Promise<MemoryIndexResult>;
    search(query: RetrievalQuery): Promise<RetrievalResult[]>;
    addMemory(memory: Pick<MemoryItem, 'scope' | 'memoryType' | 'title' | 'content'> & Partial<Pick<MemoryItem, 'workspacePath' | 'repositoryUrl' | 'repositoryId' | 'sessionId' | 'taskId' | 'expiresAt' | 'retentionPolicy' | 'importance' | 'weight' | 'source' | 'evidence' | 'supersededBy' | 'supersedes' | 'originMarkers'>>): Promise<MemoryItem>;
    proposeMemoryCandidate(request: MemoryCandidateProposalRequest): Promise<MemoryCandidateProposalResult>;
    proposeMemoryConsolidation(request: MemoryConsolidationRequest): Promise<MemoryConsolidationResult>;
    updateMemory(request: MemoryUpdateMemoryRequest): Promise<MemoryItem | undefined>;
    updateMemoryAccess(request: MemoryUpdateMemoryAccessRequest): Promise<MemoryItem | undefined>;
    promoteMemoryToIde(request: MemoryPromoteMemoryToIdeRequest): Promise<MemoryItem | undefined>;
    demoteMemoryToWorkspace(request: MemoryDemoteMemoryToWorkspaceRequest): Promise<MemoryItem | undefined>;
    runMemoryDecay(request: MemoryRunMemoryDecayRequest): Promise<MemoryRunMemoryDecayResult>;
    forgetMemory(request: MemoryForgetMemoryRequest): Promise<boolean>;
    forgetWorkspaceLearningData(request: MemoryForgetWorkspaceLearningRequest): Promise<MemoryForgetWorkspaceLearningResult>;
    proposeSkillCandidate(request: MemorySkillCandidateProposalRequest): Promise<MemorySkillCandidate>;
    updateSkillCandidateStatus(id: string, status: MemorySkillCandidate['status']): Promise<MemorySkillCandidate | undefined>;
    decideSkillCandidate(request: MemorySkillDecisionRequest): Promise<MemorySkillCandidate | undefined>;
    exportWorkspaceData(request: string | MemoryWorkspaceExportRequest): Promise<MemoryExportBundle>;
    installPortableMemory(request: MemoryPortableInstallRequest): Promise<MemoryPortableInstallResult>;
    managePortableMemory(request: MemoryPortablePackageActionRequest): Promise<MemoryPortablePackageActionResult>;
    importWorkspaceData(bundle: MemoryExportBundle): Promise<MemoryWorkspaceImportResult>;
    importGraphifyGraph(request: MemoryGraphifyImportRequest): Promise<MemoryGraphifyImportResult>;
    importIcmData(request: MemoryIcmImportRequest): Promise<MemoryIcmImportResult>;
    exportIcmData(request: MemoryIcmExportRequest): Promise<MemoryIcmBridgeBundle>;
    getMigrations(): Promise<MemoryMigration[]>;
    recordEvent(request: MemoryEventRecordRequest): Promise<MemoryEvent>;
    listEvents(request: MemoryEventListRequest): Promise<MemoryEvent[]>;
    clearEvents(workspacePath: string): Promise<void>;
    startTranscriptSession(request: MemoryStartTranscriptSessionRequest): Promise<MemoryTranscriptSession>;
    recordTranscriptMessage(request: MemoryRecordTranscriptMessageRequest): Promise<MemoryTranscriptMessage & { blocked: boolean }>;
    searchTranscripts(request: MemoryTranscriptSearchRequest): Promise<MemoryTranscriptSearchResult[]>;
    forgetTranscripts(request: MemoryForgetTranscriptRequest): Promise<MemoryForgetTranscriptResult>;
    recordFeedback(request: MemoryFeedbackRequest): Promise<MemoryFeedbackRecord>;
    searchFeedback(request: MemoryFeedbackSearchRequest): Promise<MemoryFeedbackRecord[]>;
    listFeedbackForPrompt(request: MemoryWorkspaceRequest & { promptSignature: string; limit?: number }): Promise<MemoryFeedbackRecord[]>;
    resolveFeedback(request: MemoryResolveFeedbackRequest): Promise<MemoryFeedbackRecord | undefined>;
    suggestContext(request: MemoryContextSuggestionRequest): Promise<MemoryContextSuggestionResult>;
    buildContextPack(request: ContextPackRequest): Promise<ContextPack>;
    runBenchmarks(request: MemoryBenchmarkRequest): Promise<MemoryBenchmarkReport>;
    createKnowledgeGraph(request: MemoryCreateKnowledgeGraphRequest): Promise<MemoryKnowledgeGraph>;
    addKnowledgeConcept(request: MemoryAddKnowledgeConceptRequest): Promise<MemoryKnowledgeConcept>;
    linkKnowledgeConcepts(request: MemoryLinkKnowledgeConceptsRequest): Promise<MemoryKnowledgeLink>;
    searchKnowledge(request: MemorySearchKnowledgeRequest): Promise<MemoryKnowledgeSearchResult[]>;
    exportKnowledgeGraph(request: MemoryExportKnowledgeGraphRequest): Promise<MemoryKnowledgeGraphExport>;
    getCallers(request: GraphQueryRequest): Promise<GraphQueryResult>;
    getCallees(request: GraphQueryRequest): Promise<GraphQueryResult>;
    getTests(request: GraphQueryRequest): Promise<GraphQueryResult>;
    analyzeGraphCommunities(request: GraphCommunityDetectionRequest): Promise<GraphCommunityDetectionResult>;
    analyzeBlastRadius(request: BlastRadiusRequest): Promise<BlastRadiusResult>;
    analyzePullRequestGraph(request: MemoryPullRequestGraphAnalysisRequest): Promise<MemoryPullRequestGraphAnalysisResult>;
    analyzeConflicts(request: MemoryConflictAnalysisRequest): Promise<MemoryConflictAnalysisResult>;
    detectChangeImpactFromGitDiff(request: MemoryDetectChangeImpactRequest): Promise<MemoryDetectedChangeImpact>;
    diffGraph(request: GraphDiffRequest): Promise<GraphDiffResult>;
}

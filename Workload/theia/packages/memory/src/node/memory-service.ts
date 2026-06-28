import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import ignore, { Ignore } from 'ignore';
import { LibraryService } from '@cybervinci/library/lib/common/library-service';
import { inject, injectable, multiInject, optional } from '@theia/core/shared/inversify';
import {
    BenchmarkService,
    BlastRadiusAnalyzer,
    BlastRadiusRequest,
    BlastRadiusResult,
    ContextPack,
    ContextPackBuilder,
    ContextPackRequest,
    ContextSuggestionService,
    ContradictionDetector,
    ConflictAnalysisAnalyzer,
    EventCaptureBus,
    FeedbackService,
    GodNodeAnalyzer,
    GraphCommunityAnalyzer,
    GraphCommunityDetectionRequest,
    GraphCommunityDetectionResult,
    GraphDiffRequest,
    GraphDiffResult,
    GraphDiffService,
    GraphQueryRequest,
    GraphQueryResult,
    GraphQueryService,
    IcmBridgeService,
    KnowledgeGraphService,
    MEMORY_ICM_LIMITS,
    MemoryDashboard,
    MemoryDeleteMemoryRequest,
    MemoryDeleteSkillRequest,
    MemoryDependency,
    MemoryDemoteMemoryToWorkspaceRequest,
    MemoryEvent,
    MemoryEventListRequest,
    MemoryEventRecordRequest,
    MemoryFeedbackRecord,
    MemoryFeedbackRequest,
    MemoryFeedbackSearchRequest,
    MemoryForgetTranscriptRequest,
    MemoryForgetTranscriptResult,
    MemoryForgetWorkspaceLearningRequest,
    MemoryForgetWorkspaceLearningResult,
    MemoryForgetMemoryRequest,
    MemoryFile,
    MemoryFileIgnoreReason,
    MemoryFileSummary,
    MemoryGraph,
    MemoryGraphifyImportRequest,
    MemoryGraphifyImportDiffEntry,
    MemoryGraphifyImportResult,
    MemoryGraphRelationType,
    MemoryIcmBridgeBundle,
    MemoryIcmExportRequest,
    MemoryIcmImportRequest,
    MemoryIcmImportResult,
    MemoryIndexRequest,
    MemoryIndexResult,
    MemoryAddKnowledgeConceptRequest,
    MemoryBenchmarkCaseResult,
    MemoryBenchmarkReport,
    MemoryBenchmarkRequest,
    MemoryChangeImpact,
    MemoryCodeChunk,
    MemoryConflictAnalysisRequest,
    MemoryConflictAnalysisResult,
    MemoryCreateKnowledgeGraphRequest,
    MemoryExportKnowledgeGraphRequest,
    MemoryKnowledgeConcept,
    MemoryKnowledgeConceptKind,
    MemoryKnowledgeGraph,
    MemoryKnowledgeGraphExport,
    MemoryKnowledgeLink,
    MemoryKnowledgeSearchResult,
    MemoryLinkKnowledgeConceptsRequest,
    MemoryLanguageStat,
    MemoryManifestSummary,
    Memory,
    MemoryCandidateProposalRequest,
    MemoryCandidateProposalResult,
    MemoryConsolidationRequest,
    MemoryConsolidationResult,
    MemoryImportDiffEntry,
    MemoryInput,
    MemoryItem,
    MemorySpace,
    MemoryVector,
    MemoryPortableArtifact,
    MemoryPortablePackageSummary,
    MemoryStandaloneProjectGraph,
    MemoryStandaloneProjectGraphRelation,
    MemoryRequest,
    MemoryMigration,
    MemoryOverview,
    MemoryPortablePackageActionRequest,
    MemoryPortablePackageActionResult,
    MemoryPortableInstallRequest,
    MemoryPortableInstallResult,
    MemoryRelation,
    MemoryResolveFeedbackRequest,
    MemoryRunMemoryDecayRequest,
    MemoryRunMemoryDecayResult,
    MemoryPromoteMemoryToIdeRequest,
    MemoryContextSuggestionRequest,
    MemoryContextSuggestionResult,
    MemoryDetectChangeImpactRequest,
    MemoryDetectedChangeImpact,
    MemoryExportBundle,
    MemoryGraphSnapshot,
    MemoryRetrievalResult,
    MemoryScanRequest,
    MemoryScanIssue,
    MemorySearchRequest,
    MemorySkill,
    MemorySkillCandidate,
    MemorySkillCandidateProposalRequest,
    MemorySkillDecisionRequest,
    MemorySkillSuggestionSource,
    MemorySuggestedQuestion,
    MemorySkillInput,
    MemorySkillRequest,
    MemorySourceKind,
    MemoryStartTranscriptSessionRequest,
    MemoryRecordTranscriptMessageRequest,
    MemoryTranscriptMessage,
    MemoryTranscriptSearchRequest,
    MemoryTranscriptSearchResult,
    MemorySearchKnowledgeRequest,
    MemoryTranscriptSession,
    MemoryUiModel,
    MemoryVectorService,
    MemoryVectorBackfillStatus,
    MemoryVectorSettings,
    MemoryVectorSettingsUpdate,
    MemoryVectorStatus,
    MemoryWorkspaceRequest,
    MemoryWorkspaceImportResult,
    MemoryWorkspaceConsentUpdateRequest,
    MemorySymbol,
    MemoryUpdateMemoryAccessRequest,
    MemoryUpdateMemoryRequest,
    MemoryWorkspaceSettings,
    MemoryWorkspaceSnapshot,
    LanguageAnalysisResult,
    MemoryCandidateExtractor,
    MemoryServiceHelper,
    PromptNormalizer,
    PullRequestGraphAnalyzer,
    MemoryPullRequestGraphAnalysisRequest,
    MemoryPullRequestGraphAnalysisResult,
    RetrievalQuery,
    RetrievalResult,
    SecretRedactionService,
    SecretScanner,
    SkillSuggestionEngine,
    TokenBudgetService
} from '../common';
import { MEMORY_SCHEMA } from '../common/memory-schema';
import { FileContentIndexer } from './file-content-indexer';
import { AgentEventRetrievalSource, CodeTextRetrievalSource, FeedbackRecordRetrievalSource, LocalDocsRetrievalSource, ProjectMemoryRetrievalSource, RepositoryMemoryRetrievalSource, SkillRetrievalSource, TaskMemoryRetrievalSource } from './retrieval-sources';
import { MemoryStoreData, MemoryStoreRepository } from './memory-repositories';
import { CSharpStructuralAnalyzer } from './analysis/csharp-structural-analyzer';
import { CppStructuralAnalyzer } from './analysis/cpp-structural-analyzer';
import { JavaStructuralAnalyzer } from './analysis/java-structural-analyzer';
import { PythonStructuralAnalyzer } from './analysis/python-structural-analyzer';
import { RustStructuralAnalyzer } from './analysis/rust-structural-analyzer';
import { SqlStructuralAnalyzer } from './analysis/sql-structural-analyzer';
import { TypeScriptJavaScriptStructuralAnalyzer } from './analysis/typescript-javascript-structural-analyzer';
import { MemoryLanguageAnalyzerContribution, RankedMemoryLanguageAnalyzer } from './memory-language-analyzer';
import { ChangeSetDetector } from './change-set-detector';
import { IncrementalIndexQueue, IncrementalIndexQueueStatus } from './incremental-index-queue';

type MemoryStore = MemoryStoreData;
type MemoryRepositoryIdentity = Pick<MemoryItem, 'repositoryUrl' | 'repositoryId'>;
interface WorkspaceIgnoreMatcher {
    basePath: string;
    fileName: '.gitignore' | '.cvignore' | '.cybervinciignore';
    sourcePath: string;
    matcher: Ignore;
    kind: 'gitignore' | 'cvignore' | 'cybervinciignore';
}

const execFileAsync = promisify(execFile);

const DEFAULT_DENYLIST = new Set([
    '.git',
    '.vs',
    '.idea',
    'node_modules',
    'bin',
    'obj',
    'dist',
    'build',
    'coverage',
    'logs',
    'tmp'
]);

const TEXT_EXTENSIONS = new Set([
    '.cs',
    '.csproj',
    '.sln',
    '.slnx',
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
    '.json',
    '.yaml',
    '.yml',
    '.md',
    '.txt',
    '.xml',
    '.sql',
    '.css',
    '.html',
    '.java',
    '.c',
    '.cc',
    '.cpp',
    '.cxx',
    '.h',
    '.hh',
    '.hpp',
    '.hxx'
]);

const LOCAL_DOC_EXTENSIONS = new Set([
    '.md',
    '.mdx',
    '.txt',
    '.json',
    '.yaml',
    '.yml'
]);

const OFFICE_DOCUMENT_EXTENSIONS = new Set([
    '.docx',
    '.pptx',
    '.xlsx'
]);

const IMAGE_DOCUMENT_EXTENSIONS = new Set([
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.webp',
    '.bmp',
    '.ico'
]);

const DIAGRAM_DOCUMENT_EXTENSIONS = new Set([
    '.svg',
    '.drawio',
    '.mermaid',
    '.mmd',
    '.puml',
    '.plantuml'
]);

@injectable()
export class MemoryServiceImpl {
    protected readonly portableIgnoreMarker = '.cybervinci-portable-ignore';


    protected readonly scanner = new SecretScanner();
    protected readonly redactionService = new SecretRedactionService();
    protected readonly benchmarkService = new BenchmarkService();
    protected readonly fileContentIndexer = new FileContentIndexer();
    protected readonly memoryCandidateExtractor = new MemoryCandidateExtractor();
    protected readonly memoryService = new MemoryServiceHelper();
    protected readonly contradictionDetector = new ContradictionDetector();
    protected readonly feedbackService = new FeedbackService();
    protected readonly icmBridgeService = new IcmBridgeService();
    protected readonly knowledgeGraphService = new KnowledgeGraphService();
    protected readonly vectorService = new MemoryVectorService();
    protected readonly promptNormalizer = new PromptNormalizer();
    protected readonly tokenBudgetService = new TokenBudgetService();
    protected readonly skillSuggestionEngine = new SkillSuggestionEngine();
    protected readonly fallbackLanguageAnalyzers: RankedMemoryLanguageAnalyzer[] = [new CSharpStructuralAnalyzer(), new CppStructuralAnalyzer(), new JavaStructuralAnalyzer(), new PythonStructuralAnalyzer(), new RustStructuralAnalyzer(), new SqlStructuralAnalyzer(), new TypeScriptJavaScriptStructuralAnalyzer()];
    protected readonly changeSetDetector = new ChangeSetDetector();
    protected readonly incrementalIndexQueue = new IncrementalIndexQueue(request => this.performIndexWorkspace(request), {
        debounceMs: 750,
        maxFilesPerRun: 200,
        maxConcurrentRuns: 1,
        audit: {
            completed: event => this.recordIncrementalIndexAudit('index.incremental.completed', event.request, {
                status: 'completed',
                scope: event.result.backfillScope,
                durationMs: event.durationMs,
                indexedFileCount: event.result.indexedFileCount,
                indexedChunkCount: event.result.indexedChunkCount,
                changedFileCount: event.result.changedFileCount,
                refreshedExternalDocCollectionCount: event.result.refreshedExternalDocCollectionCount,
                symbolCount: event.result.symbolCount,
                relationCount: event.result.relationCount,
                sensitiveFileCount: event.result.sensitiveFileCount,
                startedAt: event.startedAt,
                finishedAt: event.finishedAt
            }),
            failed: event => this.recordIncrementalIndexAudit('index.incremental.failed', event.request, {
                status: 'failed',
                scope: event.request.scope ?? 'changed-files',
                durationMs: event.durationMs,
                errorName: event.error instanceof Error ? event.error.name : undefined,
                errorMessage: event.error instanceof Error ? event.error.message : String(event.error),
                startedAt: event.startedAt,
                finishedAt: event.finishedAt
            })
        }
    });
    protected lastLanguageAnalysisResults: LanguageAnalysisResult[] = [];

    @inject(MemoryStoreRepository)
    protected readonly repository: MemoryStoreRepository;

    @inject(LibraryService) @optional()
    protected readonly libraryService: LibraryService | undefined;

    @multiInject(MemoryLanguageAnalyzerContribution) @optional()
    protected readonly languageAnalyzers: RankedMemoryLanguageAnalyzer[] = [];

    @inject(EventCaptureBus) @optional()
    protected readonly eventCaptureBus: EventCaptureBus | undefined;

    async getStorePath(): Promise<string> {
        return this.storePath();
    }

    async getSchema(): Promise<typeof MEMORY_SCHEMA> {
        return MEMORY_SCHEMA;
    }

    async getMigrations(): Promise<MemoryMigration[]> {
        return MEMORY_SCHEMA.migrations;
    }

    async recordEvent(request: MemoryEventRecordRequest): Promise<MemoryEvent> {
        const store = await this.readStore();
        if (!this.canPersistEvent(request, store)) {
            return {
                id: this.id('event'),
                workspacePath: request.workspacePath,
                eventType: request.eventType,
                payload: this.sanitizedEventPayload(request, store),
                promptSignature: request.promptSignature ?? this.promptSignatureFromEvent(request),
                relativePath: this.redactionService.redactText(request.relativePath),
                createdAt: new Date().toISOString()
            };
        }
        const promptSignature = request.promptSignature ?? this.promptSignatureFromEvent(request);
        const payload = this.sanitizedEventPayload(request, store);
        const event = await this.captureEvent({
            ...request,
            payload,
            promptSignature
        });
        store.events.push(event);
        const eventFeedback = this.feedbackRequestFromEvent(event);
        if (eventFeedback) {
            store.feedbackRecords.push(this.feedbackService.normalize(eventFeedback, this.id('feedback'), event.createdAt));
            this.updateContextSuggestionDecision(store, eventFeedback);
        }
        if (promptSignature && (event.eventType === 'prompt.submitted' || event.eventType === 'skill.rejected' || event.eventType === 'skill.accepted')) {
            this.updateSkillCandidateFromEvent(store, event, promptSignature);
        }
        const memoryProposalText = this.memoryProposalTextFromEvent(event);
        if (memoryProposalText) {
            this.proposeMemoryCandidatesInStore(store, {
                workspacePath: event.workspacePath,
                text: memoryProposalText,
                source: `event:${event.eventType}`,
                evidence: event.payload,
                eventId: event.id,
                relativePath: event.relativePath
            }, event.createdAt);
        }
        const invalidatedRelativePaths = this.applyReactiveFileEvent(store, event);
        await this.writeStore(store);
        if (invalidatedRelativePaths.length) {
            await this.repository.invalidateRetrievalCache?.(event.workspacePath, invalidatedRelativePaths);
        }
        this.enqueueReactiveFileIndex(event);
        return event;
    }

    protected canPersistEvent(request: MemoryEventRecordRequest, store: MemoryStoreData): boolean {
        if (request.eventType === 'consent.updated') {
            return true;
        }
        const settings = this.normalizeSettings(request.workspacePath, store.settings[this.workspaceKey(request.workspacePath)]);
        if (request.eventType === 'prompt.submitted') {
            const minimizedPromptAudit = this.hasMinimizedPromptAuditPayload(request);
            return settings.optIn?.events === true
                || settings.optIn?.transcriptSearch === true
                || settings.optIn?.skills === true
                || minimizedPromptAudit;
        }
        return true;
    }

    protected hasMinimizedPromptAuditPayload(request: MemoryEventRecordRequest): boolean {
        if (request.promptSignature) {
            return true;
        }
        if (request.eventType !== 'prompt.submitted' || !request.payload) {
            return false;
        }
        try {
            const payload = JSON.parse(request.payload) as { promptTextHash?: unknown; promptSignature?: unknown; normalizedSignature?: unknown; signature?: unknown };
            return typeof payload.promptTextHash === 'string'
                || typeof payload.promptSignature === 'string'
                || typeof payload.normalizedSignature === 'string'
                || typeof payload.signature === 'string';
        } catch {
            return false;
        }
    }

    protected applyReactiveFileEvent(store: MemoryStoreData, event: MemoryEvent): string[] {
        const invalidatedRelativePaths = this.reactiveRelativePathsFromEvent(event);
        if (invalidatedRelativePaths.length) {
            this.invalidateChangeImpactsForRelativePaths(store, event.workspacePath, invalidatedRelativePaths);
            this.markDerivedMemoriesPossiblyStaleForRelativePaths(store, event.workspacePath, invalidatedRelativePaths, event.createdAt);
        }
        if (event.eventType === 'file.deleted' && event.relativePath) {
            this.removeIndexedFileArtifactsFromStore(store, event.workspacePath, [event.relativePath], event.createdAt);
            return invalidatedRelativePaths;
        }
        if (event.eventType === 'file.renamed') {
            const previousPath = this.previousRelativePathFromEvent(event);
            if (previousPath) {
                this.removeIndexedFileArtifactsFromStore(store, event.workspacePath, [previousPath], event.createdAt);
            }
        }
        return invalidatedRelativePaths;
    }

    protected reactiveRelativePathsFromEvent(event: MemoryEvent): string[] {
        if (!this.isReactiveFileEvent(event.eventType)) {
            return [];
        }
        return [...new Set([
            event.relativePath,
            event.eventType === 'file.renamed' ? this.previousRelativePathFromEvent(event) : undefined
        ].filter((relativePath): relativePath is string => !!relativePath))];
    }

    protected enqueueReactiveFileIndex(event: MemoryEvent): void {
        if (!event.relativePath || !this.shouldEnqueueReactiveFileIndex(event.eventType)) {
            return;
        }
        this.incrementalIndexQueue.enqueue({
            workspacePath: event.workspacePath,
            scope: 'changed-files',
            changedRelativePaths: [event.relativePath],
            maxFiles: 25
        }).catch(() => undefined);
    }

    protected shouldEnqueueReactiveFileIndex(eventType: MemoryEvent['eventType']): boolean {
        return eventType === 'file.created'
            || eventType === 'file.edited'
            || eventType === 'file.saved'
            || eventType === 'file.renamed';
    }

    protected isReactiveFileEvent(eventType: MemoryEvent['eventType']): boolean {
        return eventType === 'file.created'
            || eventType === 'file.edited'
            || eventType === 'file.saved'
            || eventType === 'file.deleted'
            || eventType === 'file.renamed';
    }

    protected previousRelativePathFromEvent(event: MemoryEvent): string | undefined {
        if (!event.payload) {
            return undefined;
        }
        try {
            const payload = JSON.parse(event.payload) as { fromRelativePath?: unknown };
            return typeof payload.fromRelativePath === 'string' ? payload.fromRelativePath : undefined;
        } catch {
            return undefined;
        }
    }

    protected removeIndexedFileArtifactsFromStore(
        store: MemoryStoreData,
        workspacePath: string,
        relativePaths: readonly string[],
        removedAt: string
    ): void {
        const key = this.workspaceKey(workspacePath);
        const normalizedPaths = new Set(relativePaths.map(relativePath => this.normalizeReactiveRelativePath(relativePath)));
        if (!normalizedPaths.size) {
            return;
        }
        const previousFiles = store.files[key] ?? [];
        const removedFileIds = new Set(previousFiles
            .filter(file => normalizedPaths.has(this.normalizeReactiveRelativePath(file.relativePath)))
            .map(file => file.id));
        if (!removedFileIds.size && !(store.codeChunks[key] ?? []).some(chunk => normalizedPaths.has(this.normalizeReactiveRelativePath(chunk.relativePath)))) {
            return;
        }
        store.files[key] = previousFiles.filter(file => !removedFileIds.has(file.id)
            && !normalizedPaths.has(this.normalizeReactiveRelativePath(file.relativePath)));
        const previousSymbols = store.symbols[key] ?? [];
        const removedSymbolIds = new Set(previousSymbols.filter(symbol => removedFileIds.has(symbol.fileId)).map(symbol => symbol.id));
        store.symbols[key] = previousSymbols.filter(symbol => !removedFileIds.has(symbol.fileId));
        store.relations[key] = (store.relations[key] ?? []).filter(relation =>
            !removedFileIds.has(relation.sourceId)
            && !removedFileIds.has(relation.targetId)
            && !removedSymbolIds.has(relation.sourceId)
            && !removedSymbolIds.has(relation.targetId)
        );
        store.codeChunks[key] = (store.codeChunks[key] ?? []).filter(chunk =>
            !removedFileIds.has(chunk.fileId)
            && !normalizedPaths.has(this.normalizeReactiveRelativePath(chunk.relativePath))
        );
        store.snapshots[key] = this.buildSnapshot(workspacePath, removedAt, 'quick', store.files[key] ?? []);
        store.graphSnapshots.push(this.graphSnapshot(
            workspacePath,
            'Code Graph',
            this.buildCodeGraph(store.files[key] ?? [], store.symbols[key] ?? [], store.relations[key] ?? []),
            removedAt
        ));
    }

    protected invalidateChangeImpactsForRelativePaths(
        store: MemoryStoreData,
        workspacePath: string,
        relativePaths: readonly string[]
    ): void {
        const key = this.workspaceKey(workspacePath);
        const normalizedPaths = new Set(relativePaths.map(relativePath => this.normalizeReactiveRelativePath(relativePath)));
        if (!normalizedPaths.size) {
            return;
        }
        store.changeImpacts = store.changeImpacts.filter(impact => {
            if (this.workspaceKey(impact.workspacePath) !== key) {
                return true;
            }
            if (impact.relativePath && normalizedPaths.has(this.normalizeReactiveRelativePath(impact.relativePath))) {
                return false;
            }
            return !this.changeImpactReferencesPaths(impact, normalizedPaths);
        });
    }

    protected markDerivedMemoriesPossiblyStaleForRelativePaths(
        store: MemoryStoreData,
        workspacePath: string,
        relativePaths: readonly string[],
        markedAt: string
    ): void {
        const key = this.workspaceKey(workspacePath);
        const normalizedPaths = new Set(relativePaths.map(relativePath => this.normalizeReactiveRelativePath(relativePath)));
        if (!normalizedPaths.size) {
            return;
        }
        store.memories = store.memories.map(memory => {
            if (this.workspaceKey(memory.workspacePath ?? '') !== key || memory.staleStatus === 'stale') {
                return memory;
            }
            if (!this.memoryOriginReferencesPaths(memory, normalizedPaths)) {
                return memory;
            }
            return this.memoryService.update(memory, {
                staleStatus: 'possibly_stale',
                evidence: this.appendEvidence(memory.evidence, `possibly_stale:file-change:${[...normalizedPaths].join(',')}`)
            }, markedAt);
        });
    }

    protected memoryOriginReferencesPaths(memory: MemoryItem, normalizedPaths: ReadonlySet<string>): boolean {
        const originText = [
            memory.source,
            memory.evidence,
            ...(memory.originMarkers ?? [])
        ].filter((value): value is string => !!value).join('\n').replace(/\\/g, '/').toLowerCase();
        if (!originText) {
            return false;
        }
        return [...normalizedPaths].some(relativePath => originText.includes(relativePath));
    }

    protected appendEvidence(existing: string | undefined, evidence: string): string {
        return existing ? `${existing}; ${evidence}` : evidence;
    }

    protected changeImpactReferencesPaths(impact: MemoryChangeImpact, normalizedPaths: ReadonlySet<string>): boolean {
        const values = [impact.relativePath, impact.sourceId, impact.summary, impact.impactJson].filter((value): value is string => !!value);
        return values.some(value => {
            const normalizedValue = value.replace(/\\/g, '/').toLowerCase();
            return [...normalizedPaths].some(relativePath => normalizedValue.includes(relativePath));
        });
    }

    protected normalizeReactiveRelativePath(relativePath: string): string {
        return relativePath.replace(/\\/g, '/').replace(/^\/+/, '').toLowerCase();
    }

    protected async captureEvent(request: MemoryEventRecordRequest): Promise<MemoryEvent> {
        if (this.eventCaptureBus) {
            return this.eventCaptureBus.record(request);
        }
        return {
            id: this.id('event'),
            workspacePath: request.workspacePath,
            eventType: request.eventType,
            payload: this.redactionService.redactText(request.payload),
            relativePath: this.redactionService.redactText(request.relativePath),
            promptSignature: request.promptSignature,
            sessionId: request.sessionId,
            taskId: request.taskId,
            createdAt: new Date().toISOString()
        };
    }

    protected sanitizedEventPayload(request: MemoryEventRecordRequest, store: MemoryStoreData): string | undefined {
        const redactedPayload = this.redactionService.redactText(request.payload);
        if (request.eventType !== 'prompt.submitted' || !redactedPayload) {
            return redactedPayload;
        }
        const settings = this.normalizeSettings(request.workspacePath, store.settings[this.workspaceKey(request.workspacePath)]);
        if (settings.optIn?.promptSnippets === true) {
            return this.minimizedPromptPayload(redactedPayload, true);
        }
        return this.minimizedPromptPayload(redactedPayload, false);
    }

    protected minimizedPromptPayload(payload: string, includeRedactedSnippet: boolean): string | undefined {
        try {
            const parsed = JSON.parse(payload) as Record<string, unknown>;
            delete parsed.prompt;
            delete parsed.text;
            delete parsed.content;
            delete parsed.message;
            if (includeRedactedSnippet) {
                for (const key of ['promptSnippet', 'redactedPromptSnippet', 'promptSample', 'redactedPromptSample']) {
                    if (typeof parsed[key] === 'string') {
                        parsed[key] = this.redactPromptSnippetText(parsed[key] as string);
                    }
                }
            } else {
                delete parsed.promptSnippet;
                delete parsed.redactedPromptSnippet;
                delete parsed.promptSample;
                delete parsed.redactedPromptSample;
            }
            return JSON.stringify(parsed);
        } catch {
            return undefined;
        }
    }

    protected redactPromptSnippetText(value: string): string {
        return (this.redactionService.redactText(value) ?? '')
            .replace(/(?=[A-Za-z0-9_=-]{32,})(?=[A-Za-z0-9_=-]*[0-9=])[A-Za-z0-9_=-]{32,}/g, token => `${token.slice(0, 6)}********${token.slice(-4)}`);
    }

    async listEvents(request: MemoryEventListRequest): Promise<MemoryEvent[]> {
        const store = await this.readStore();
        const eventTypes = new Set(request.eventTypes ?? []);
        const since = request.since ? Date.parse(request.since) : undefined;
        return store.events
            .filter(event => this.workspaceKey(event.workspacePath) === this.workspaceKey(request.workspacePath))
            .filter(event => !eventTypes.size || eventTypes.has(event.eventType))
            .filter(event => !request.relativePath || event.relativePath === request.relativePath)
            .filter(event => !request.promptSignature || event.promptSignature === request.promptSignature)
            .filter(event => since === undefined || Date.parse(event.createdAt) >= since)
            .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
            .slice(0, request.limit ?? 100);
    }

    async clearEvents(workspacePath: string): Promise<void> {
        const store = await this.readStore();
        const key = this.workspaceKey(workspacePath);
        store.events = store.events.filter(event => this.workspaceKey(event.workspacePath) !== key);
        await this.writeStore(store);
    }

    async startTranscriptSession(request: MemoryStartTranscriptSessionRequest): Promise<MemoryTranscriptSession> {
        const store = await this.readStore();
        const now = new Date().toISOString();
        const settings = this.normalizeSettings(request.workspacePath, store.settings[this.workspaceKey(request.workspacePath)]);
        const session: MemoryTranscriptSession = {
            id: request.sessionId ?? this.id('transcript-session'),
            workspacePath: request.scope === 'global' ? undefined : request.workspacePath,
            scope: request.scope ?? 'workspace',
            origin: this.redactionService.redactText(request.origin ?? 'mcp') ?? 'mcp',
            source: this.redactionService.redactText(request.source),
            title: this.redactionService.redactText(request.title),
            startedAt: now,
            retentionPolicy: request.retentionPolicy ?? settings.retentionPolicies?.transcripts ?? 'manual',
            redactionStatus: 'clean',
            metadata: this.redactTranscriptMetadata(request.metadata),
            createdAt: now,
            updatedAt: now
        };
        if (this.transcriptSessionHasRedaction(session, request)) {
            session.redactionStatus = 'redacted';
        }
        store.transcriptSessions = [
            ...(store.transcriptSessions ?? []).filter(existing => existing.id !== session.id),
            session
        ];
        this.recordAuditEvent(store, request.workspacePath, 'transcript.session.started', {
            sessionId: session.id,
            scope: session.scope,
            origin: session.origin,
            source: session.source,
            retentionPolicy: session.retentionPolicy,
            metadataKeys: Object.keys(session.metadata ?? {})
        }, now);
        await this.writeStore(store);
        return session;
    }

    async recordTranscriptMessage(request: MemoryRecordTranscriptMessageRequest): Promise<MemoryTranscriptMessage & { blocked: boolean }> {
        const store = await this.readStore();
        const now = new Date().toISOString();
        const session = (store.transcriptSessions ?? []).find(candidate => candidate.id === request.transcriptSessionId || candidate.id === request.sessionId);
        const settings = this.normalizeSettings(request.workspacePath, store.settings[this.workspaceKey(request.workspacePath)]);
        const scope = request.scope ?? session?.scope ?? (request.taskId ? 'task' : request.sessionId ? 'session' : 'workspace');
        const scan = this.scanner.scan({ content: request.content, sourceUri: request.workspacePath });
        const redactedContent = scan.redactedContent;
        const blocked = scan.findings.length > 0;
        const message: MemoryTranscriptMessage = {
            id: this.id('transcript-message'),
            sessionId: request.transcriptSessionId ?? session?.id ?? request.sessionId ?? this.id('transcript-session'),
            workspacePath: scope === 'global' ? undefined : request.workspacePath,
            scope,
            origin: this.redactionService.redactText(request.origin ?? session?.origin ?? 'mcp') ?? 'mcp',
            role: request.role,
            content: redactedContent,
            redactedContent: blocked ? redactedContent : undefined,
            redactionStatus: blocked ? 'blocked' : 'clean',
            redactionSummary: blocked ? this.transcriptRedactionSummary(scan.findings) : undefined,
            retentionPolicy: request.retentionPolicy ?? session?.retentionPolicy ?? settings.retentionPolicies?.transcripts,
            sessionIdHint: request.sessionId,
            taskId: request.taskId,
            metadata: this.redactTranscriptMetadata(request.metadata),
            createdAt: now,
            updatedAt: now
        };
        store.transcriptMessages = [...(store.transcriptMessages ?? []), message];
        if (session) {
            session.updatedAt = now;
            if (blocked) {
                session.redactionStatus = 'redacted';
            }
        }
        this.recordAuditEvent(store, request.workspacePath, 'transcript.message.recorded', {
            messageId: message.id,
            transcriptSessionId: message.sessionId,
            sessionId: request.sessionId,
            taskId: request.taskId,
            scope: message.scope,
            origin: message.origin,
            role: message.role,
            redactionStatus: message.redactionStatus,
            blocked,
            redactionSummary: message.redactionSummary,
            metadataKeys: Object.keys(message.metadata ?? {})
        }, now);
        await this.writeStore(store);
        return { ...message, blocked };
    }

    async searchTranscripts(request: MemoryTranscriptSearchRequest): Promise<MemoryTranscriptSearchResult[]> {
        const store = await this.readStore();
        const settings = this.normalizeSettings(request.workspacePath, store.settings[this.workspaceKey(request.workspacePath)]);
        if (settings.optIn?.transcriptSearch !== true) {
            return [];
        }
        const workspaceKey = this.workspaceKey(request.workspacePath);
        const query = request.query?.trim().toLowerCase() ?? '';
        const now = Date.now();
        const candidates = (store.transcriptMessages ?? [])
            .filter(message => this.transcriptMatchesScope(message, request, workspaceKey))
            .map(message => this.transcriptSearchResult(message, request, query, now))
            .filter((result): result is MemoryTranscriptSearchResult => !!result)
            .filter(result => !query || result.score > 0)
            .sort((left, right) => right.score - left.score || right.createdAt.localeCompare(left.createdAt))
            .slice(0, Math.max(1, request.limit ?? 20));
        const budget = request.tokenBudget && request.tokenBudget > 0
            ? this.tokenBudgetService.fit({
                budgetTokens: request.tokenBudget,
                items: candidates.map(result => ({
                    id: result.id,
                    text: result.snippet,
                    priority: result.score
                }))
            })
            : undefined;
        const selected = budget ? new Set(budget.selectedIds) : undefined;
        return candidates
            .filter(result => !selected || selected.has(result.id))
            .map(result => ({
                ...result,
                explanation: {
                    ...result.explanation,
                    tokenBudgetApplied: Boolean(budget)
                }
            }));
    }

    async recordFeedback(request: MemoryFeedbackRequest): Promise<MemoryFeedbackRecord> {
        const store = await this.readStore();
        const normalizedRequest = this.normalizeFeedbackRequest(request);
        const record = this.feedbackService.normalize(normalizedRequest, this.id('feedback'));
        store.feedbackRecords.push(record);
        this.updateContextSuggestionDecision(store, normalizedRequest);
        this.recordAuditEvent(store, record.workspacePath, 'feedback.recorded', {
            feedbackId: record.id,
            promptSignature: record.promptSignature,
            targetKind: record.targetKind,
            targetId: record.targetId,
            targetSourceKind: record.targetSourceKind,
            feedback: record.feedback,
            hasReason: !!record.reason,
            hasEvidence: !!record.evidence
        }, record.createdAt);
        await this.writeStore(store);
        return record;
    }

    async searchFeedback(request: MemoryFeedbackSearchRequest): Promise<MemoryFeedbackRecord[]> {
        const store = await this.readStore();
        return this.feedbackService.search(store.feedbackRecords, request, workspacePath => this.workspaceKey(workspacePath));
    }

    async listFeedbackForPrompt(request: MemoryWorkspaceRequest & { promptSignature: string; limit?: number }): Promise<MemoryFeedbackRecord[]> {
        return this.searchFeedback({
            workspacePath: request.workspaceRoot,
            promptSignature: request.promptSignature,
            limit: request.limit
            });
    }

    async forgetTranscripts(request: MemoryForgetTranscriptRequest): Promise<MemoryForgetTranscriptResult> {
        const store = await this.readStore();
        const now = new Date().toISOString();
        const workspaceKey = this.workspaceKey(request.workspacePath);
        const mode = request.mode ?? 'delete';
        const messages = store.transcriptMessages ?? [];
        const sessions = store.transcriptSessions ?? [];
        const matchingMessages = messages.filter(message => this.transcriptMatchesForgetRequest(message, request, workspaceKey));
        const matchingMessageIds = new Set(matchingMessages.map(message => message.id));
        const affectedSessionIds = new Set(matchingMessages.map(message => message.sessionId));
        const directlyMatchedSessionIds = new Set<string>();
        for (const session of sessions) {
            if (this.transcriptSessionMatchesForgetRequest(session, request, workspaceKey)) {
                affectedSessionIds.add(session.id);
                directlyMatchedSessionIds.add(session.id);
            }
        }

        store.transcriptMessages = messages.filter(message =>
            !matchingMessageIds.has(message.id) && !directlyMatchedSessionIds.has(message.sessionId)
        );
        const removedMessages = messages.length - store.transcriptMessages.length;

        let removedSessions = 0;
        let expiredSessions = 0;
        if (mode === 'expire') {
            for (const session of sessions) {
                if (affectedSessionIds.has(session.id)) {
                    session.endedAt = session.endedAt ?? now;
                    session.updatedAt = now;
                    expiredSessions++;
                }
            }
        } else {
            const sessionsWithMessages = new Set(store.transcriptMessages.map(message => message.sessionId));
            store.transcriptSessions = sessions.filter(session => {
                if (!affectedSessionIds.has(session.id)) {
                    return true;
                }
                if (sessionsWithMessages.has(session.id)) {
                    return true;
                }
                removedSessions++;
                return false;
            });
        }

        const result: MemoryForgetTranscriptResult = {
            workspacePath: request.workspacePath,
            mode,
            removedMessages,
            removedSessions,
            expiredSessions,
            filters: {
                scopes: request.scopes,
                transcriptSessionId: request.transcriptSessionId,
                sessionId: request.sessionId,
                taskId: request.taskId,
                retentionPolicy: request.retentionPolicy
            }
        };
        this.recordAuditEvent(store, request.workspacePath, 'transcript.forgotten', {
            mode,
            removedMessages,
            removedSessions,
            expiredSessions,
            filters: result.filters
        }, now);
        await this.writeStore(store);
        return result;
    }

    async resolveFeedback(request: MemoryResolveFeedbackRequest): Promise<MemoryFeedbackRecord | undefined> {
        const store = await this.readStore();
        const key = this.workspaceKey(request.workspacePath);
        const existing = store.feedbackRecords.find(record => record.id === request.id && this.workspaceKey(record.workspacePath) === key);
        if (!existing) {
            return undefined;
        }
        store.feedbackRecords = this.feedbackService.resolve(store.feedbackRecords, request.id);
        this.recordAuditEvent(store, request.workspacePath, 'feedback.resolved', {
            feedbackId: request.id,
            targetKind: existing.targetKind,
            targetId: existing.targetId,
            feedback: existing.feedback
        });
        await this.writeStore(store);
        return store.feedbackRecords.find(record => record.id === request.id);
    }

    async suggestContext(request: MemoryContextSuggestionRequest): Promise<MemoryContextSuggestionResult> {
        const store = await this.readStore();
        const sourceKinds = this.consentAllowedSourceKinds(request.workspacePath, request.sourceKinds, store);
        if (!sourceKinds.length) {
            return {
                suggestions: [],
                estimatedTokens: 0,
                omittedCount: 0
            };
        }
        const scopedRequest = {
            ...request,
            sourceKinds
        };
        const sourcesHash = await this.retrievalSourcesHash(request.workspacePath);
        const queryKey = this.contextSuggestionCacheQueryKey(scopedRequest);
        const cached = await this.repository.getRetrievalCache?.(queryKey, request.workspacePath, sourcesHash);
        const cachedResult = cached ? this.decodeContextSuggestionCache(cached.results) : undefined;
        if (cachedResult) {
            return cachedResult;
        }
        const result = await new ContextSuggestionService(this.retrievalSources()).suggest(scopedRequest);
        const key = this.workspaceKey(request.workspacePath);
        const now = new Date().toISOString();
        const promptSignature = this.hash(request.prompt);
        store.contextSuggestions = [
            ...store.contextSuggestions.filter(suggestion => this.workspaceKey(suggestion.workspacePath) !== key || suggestion.promptSignature !== promptSignature),
            ...result.suggestions.map(suggestion => ({
                ...suggestion,
                workspacePath: request.workspacePath,
                promptSignature,
                createdAt: now
            }))
        ];
        await this.writeStore(store);
        await this.repository.setRetrievalCache?.({
            id: `context-suggestion:${queryKey}`,
            workspacePath: request.workspacePath,
            queryKey,
            scopeParams: {
                workspacePath: request.workspacePath,
                sourceKinds: [...sourceKinds].sort(),
                limit: request.limit ?? 12,
                sessionId: request.sessionId,
                taskId: request.taskId
            },
            sourcesHash: await this.retrievalSourcesHash(request.workspacePath),
            results: this.encodeContextSuggestionCache(result),
            createdAt: now,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString()
        });
        return result;
    }

    async buildContextPack(request: ContextPackRequest): Promise<ContextPack> {
        return new ContextPackBuilder().build(request);
    }

    async runBenchmarks(request: MemoryBenchmarkRequest): Promise<MemoryBenchmarkReport> {
        const store = await this.readStore();
        const key = this.workspaceKey(request.workspacePath);
        const memories = this.memoryService.markStaleness(store.memories
            .filter(memory => !memory.workspacePath || this.workspaceKey(memory.workspacePath) === key)
            .filter(memory => this.memoryService.isRetrievable(memory)));
        const codeChunks = store.codeChunks[key] ?? [];
        const files = store.files[key] ?? [];
        const dataset = this.benchmarkService.buildDataset({
            memories,
            codeChunks,
            limit: request.limit
        });
        const cases: MemoryBenchmarkCaseResult[] = [];
        const resultSets: RetrievalResult[][] = [];
        for (const item of dataset) {
            const startedAt = Date.now();
            const results = await this.search({
                workspacePath: request.workspacePath,
                text: item.prompt,
                limit: 8,
                sourceKinds: [item.expectedSourceKind]
            });
            const latencyMs = Date.now() - startedAt;
            resultSets.push(results);
            cases.push(this.benchmarkService.caseResult(item, results, latencyMs));
        }
        const report = this.benchmarkService.buildReport({
            workspacePath: request.workspacePath,
            generatedAt: new Date().toISOString(),
            dataset,
            cases,
            memories,
            codeChunks,
            files,
            resultSets,
            contextSuggestions: store.contextSuggestions.filter(suggestion => this.workspaceKey(suggestion.workspacePath) === key),
            feedbackRecords: store.feedbackRecords.filter(record => this.workspaceKey(record.workspacePath) === key)
        });
        store.benchmarkReports = [
            report,
            ...(store.benchmarkReports ?? []).filter(candidate => !(this.workspaceKey(candidate.workspacePath) === key && candidate.generatedAt === report.generatedAt))
        ]
            .sort((left, right) => right.generatedAt.localeCompare(left.generatedAt))
            .slice(0, 100);
        await this.writeStore(store);
        return report;
    }

    async createKnowledgeGraph(request: MemoryCreateKnowledgeGraphRequest): Promise<MemoryKnowledgeGraph> {
        const store = await this.readStore();
        const now = new Date().toISOString();
        const graph = this.knowledgeGraphService.createGraph(request, prefix => this.id(prefix), now);
        store.knowledgeGraphs.push(graph);
        if (request.seedFromMemories) {
            this.mergeMemoryConceptsIntoGraph(graph, this.activeKnowledgeMemories(store, request.workspacePath), now);
        }
        await this.writeStore(store);
        return graph;
    }

    async addKnowledgeConcept(request: MemoryAddKnowledgeConceptRequest): Promise<MemoryKnowledgeConcept> {
        const store = await this.readStore();
        const graph = this.findKnowledgeGraph(store, request.workspacePath, request.graphId);
        if (!graph) {
            throw new Error(`Knowledge graph not found: ${request.graphId}`);
        }
        const now = new Date().toISOString();
        const concept = this.knowledgeGraphService.createConcept(graph, request, prefix => this.id(prefix), now);
        graph.concepts = [...graph.concepts.filter(item => item.id !== concept.id), concept];
        graph.updatedAt = now;
        await this.writeStore(store);
        return concept;
    }

    async linkKnowledgeConcepts(request: MemoryLinkKnowledgeConceptsRequest): Promise<MemoryKnowledgeLink> {
        const store = await this.readStore();
        const graph = this.findKnowledgeGraph(store, request.workspacePath, request.graphId);
        if (!graph) {
            throw new Error(`Knowledge graph not found: ${request.graphId}`);
        }
        if (!graph.concepts.some(concept => concept.id === request.sourceConceptId) || !graph.concepts.some(concept => concept.id === request.targetConceptId)) {
            throw new Error('Knowledge link endpoints must exist in the graph.');
        }
        const now = new Date().toISOString();
        const link = this.knowledgeGraphService.createLink(graph, request, prefix => this.id(prefix), now);
        graph.links = [...graph.links.filter(item => item.id !== link.id), link];
        graph.updatedAt = now;
        await this.writeStore(store);
        return link;
    }

    async searchKnowledge(request: MemorySearchKnowledgeRequest): Promise<MemoryKnowledgeSearchResult[]> {
        const store = await this.readStore();
        if (this.ensureDefaultKnowledgeGraph(store, request.workspacePath)) {
            await this.writeStore(store);
        }
        return this.knowledgeGraphService.search(store.knowledgeGraphs, request, workspacePath => this.workspaceKey(workspacePath));
    }

    async exportKnowledgeGraph(request: MemoryExportKnowledgeGraphRequest): Promise<MemoryKnowledgeGraphExport> {
        const store = await this.readStore();
        const defaultGraph = this.ensureDefaultKnowledgeGraph(store, request.workspacePath);
        if (defaultGraph) {
            await this.writeStore(store);
        }
        const graph = request.graphId
            ? this.findKnowledgeGraph(store, request.workspacePath, request.graphId)
            : this.defaultKnowledgeGraph(store, request.workspacePath) ?? store.knowledgeGraphs.find(candidate => this.knowledgeGraphInWorkspace(candidate, request.workspacePath));
        if (!graph) {
            throw new Error('Knowledge graph not found.');
        }
        return this.knowledgeGraphService.exportGraph(graph, request);
    }

    async getCallers(request: GraphQueryRequest): Promise<GraphQueryResult> {
        const graphQuery = await this.graphQuery(request.workspacePath);
        return graphQuery.callers(request);
    }

    async getCallees(request: GraphQueryRequest): Promise<GraphQueryResult> {
        const graphQuery = await this.graphQuery(request.workspacePath);
        return graphQuery.callees(request);
    }

    async getTests(request: GraphQueryRequest): Promise<GraphQueryResult> {
        const graphQuery = await this.graphQuery(request.workspacePath);
        return graphQuery.tests(request);
    }

    async analyzeGraphCommunities(request: GraphCommunityDetectionRequest): Promise<GraphCommunityDetectionResult> {
        return new GraphCommunityAnalyzer().analyze(request);
    }

    async analyzeBlastRadius(request: BlastRadiusRequest): Promise<BlastRadiusResult> {
        return new BlastRadiusAnalyzer().analyze(request);
    }

    async analyzePullRequestGraph(request: MemoryPullRequestGraphAnalysisRequest): Promise<MemoryPullRequestGraphAnalysisResult> {
        return new PullRequestGraphAnalyzer().analyze(request);
    }

    async analyzeConflicts(request: MemoryConflictAnalysisRequest): Promise<MemoryConflictAnalysisResult> {
        return new ConflictAnalysisAnalyzer().analyze(request);
    }

    async detectChangeImpactFromGitDiff(request: MemoryDetectChangeImpactRequest): Promise<MemoryDetectedChangeImpact> {
        const store = await this.readStore();
        const key = this.workspaceKey(request.workspacePath);
        const workspaceEvents = store.events.filter(event => this.workspaceKey(event.workspacePath) === key);
        const changeSet = await this.changeSetDetector.detect({
            ...request,
            events: request.events ?? workspaceEvents
        });
        const blastRadius = new BlastRadiusAnalyzer().analyze({
            changedFilePaths: changeSet.changedFilePaths,
            files: store.files[key] ?? [],
            symbols: store.symbols[key] ?? [],
            relations: store.relations[key] ?? [],
            events: workspaceEvents,
            memories: store.memories
                .filter(memory => !memory.workspacePath || this.workspaceKey(memory.workspacePath) === key)
                .filter(memory => this.memoryService.isRetrievable(memory)),
            maxDepth: request.maxDepth
        });
        const createdAt = new Date().toISOString();
        const storedImpactIds: string[] = [];
        for (const impact of blastRadius.impacts) {
            const record = {
                id: this.id('impact'),
                workspacePath: request.workspacePath,
                relativePath: impact.file.relativePath,
                sourceId: impact.file.id,
                summary: `${impact.file.relativePath}: ${impact.reasons.join(' ')}`,
                riskScore: impact.riskScore,
                impactJson: JSON.stringify({
                    source: changeSet.source,
                    changedFilePaths: changeSet.changedFilePaths,
                    relatedSymbols: impact.relatedSymbols.map(symbol => symbol.id),
                    relatedTests: impact.relatedTests.map(file => file.relativePath),
                    centralityScore: impact.centralityScore,
                    recentChangeCount: impact.recentChangeCount,
                    coverageStatus: impact.coverageStatus,
                    sensitiveMemoryIds: impact.sensitiveMemoryIds,
                    reasons: impact.reasons
                }),
                createdAt
            };
            store.changeImpacts.push(record);
            storedImpactIds.push(record.id);
        }
        store.events.push({
            id: this.id('event'),
            workspacePath: request.workspacePath,
            eventType: 'search.executed',
            payload: JSON.stringify({
                source: changeSet.source,
                changedFilePaths: changeSet.changedFilePaths,
                impactCount: blastRadius.impacts.length
            }),
            createdAt
        });
        await this.writeStore(store);
        return {
            ...blastRadius,
            changeSet,
            storedImpactIds
        };
    }

    async diffGraph(request: GraphDiffRequest): Promise<GraphDiffResult> {
        return new GraphDiffService().diff(request);
    }

    async getWorkspaceSnapshot(request: MemoryWorkspaceRequest): Promise<MemoryWorkspaceSnapshot | undefined> {
        const store = await this.readStore();
        return store.snapshots[this.workspaceKey(request.workspaceRoot)];
    }

    async scanWorkspace(request: MemoryScanRequest): Promise<MemoryWorkspaceSnapshot> {
        const index = await this.indexWorkspace({
            workspacePath: request.workspaceRoot
        });
        const store = await this.readStore();
        const key = this.workspaceKey(request.workspaceRoot);
        const snapshot = this.buildSnapshot(request.workspaceRoot, index.indexedAt, request.mode ?? 'quick', store.files[key] ?? []);
        store.snapshots[key] = snapshot;
        await this.writeStore(store);
        return snapshot;
    }

    async getOverview(request: MemoryWorkspaceRequest): Promise<MemoryOverview> {
        const store = await this.readStore();
        const key = this.workspaceKey(request.workspaceRoot);
        const snapshot = store.snapshots[key];
        const files = store.files[key] ?? [];
        const memories = store.legacyMemories[key] ?? [];
        const skills = store.skills[key] ?? [];
        const secrets = snapshot?.totals.secrets ?? 0;
        const warnings = [
            secrets > 0 ? `${secrets} secret finding${secrets === 1 ? '' : 's'} detected.` : undefined,
            files.length === 0 ? 'Workspace has not been indexed yet.' : undefined
        ].filter((warning): warning is string => warning !== undefined);
        return {
            workspaceRoot: request.workspaceRoot,
            generatedAt: new Date().toISOString(),
            health: {
                status: files.length ? (warnings.length ? 'attention' : 'ready') : 'needs-scan',
                summary: files.length ? `${files.length} indexed files.` : 'Run workspace indexing to populate Memory.'
            },
            stats: {
                indexedFiles: files.length,
                languages: this.languageStats(files).length,
                memories: memories.length,
                skills: skills.length,
                secrets
            },
            topLanguages: this.languageStats(files).slice(0, 5),
            recentMemories: memories.slice(-5).reverse(),
            recommendedSkills: skills.slice(0, 5),
            warnings
        };
    }

    async listMemories(request: MemoryWorkspaceRequest): Promise<Memory[]> {
        const store = await this.readStore();
        return store.legacyMemories[this.workspaceKey(request.workspaceRoot)] ?? [];
    }

    async upsertMemory(request: MemoryRequest): Promise<Memory> {
        const store = await this.readStore();
        const key = this.workspaceKey(request.workspaceRoot);
        const now = new Date().toISOString();
        const existing = store.legacyMemories[key] ?? [];
        const memory = this.toLegacyMemory(request.memory, existing.find(item => item.id === request.memory.id), now);
        store.legacyMemories[key] = [...existing.filter(item => item.id !== memory.id), memory];
        await this.writeStore(store);
        return memory;
    }

    async deleteMemory(request: MemoryDeleteMemoryRequest): Promise<boolean> {
        const store = await this.readStore();
        const key = this.workspaceKey(request.workspaceRoot);
        const before = store.legacyMemories[key] ?? [];
        store.legacyMemories[key] = before.filter(memory => memory.id !== request.id);
        await this.writeStore(store);
        return before.length !== store.legacyMemories[key].length;
    }

    async listSkills(request: MemoryWorkspaceRequest): Promise<MemorySkill[]> {
        const store = await this.readStore();
        return store.skills[this.workspaceKey(request.workspaceRoot)] ?? [];
    }

    async upsertSkill(request: MemorySkillRequest): Promise<MemorySkill> {
        const store = await this.readStore();
        const key = this.workspaceKey(request.workspaceRoot);
        const now = new Date().toISOString();
        const existing = store.skills[key] ?? [];
        const skill = this.toSkill(request.skill, existing.find(item => item.id === request.skill.id), now);
        store.skills[key] = [...existing.filter(item => item.id !== skill.id), skill];
        await this.writeStore(store);
        return skill;
    }

    async deleteSkill(request: MemoryDeleteSkillRequest): Promise<boolean> {
        const store = await this.readStore();
        const key = this.workspaceKey(request.workspaceRoot);
        const before = store.skills[key] ?? [];
        store.skills[key] = before.filter(skill => skill.id !== request.id);
        await this.writeStore(store);
        return before.length !== store.skills[key].length;
    }

    async getUiModel(request: MemoryWorkspaceRequest): Promise<MemoryUiModel> {
        const [overview, snapshot, memories, skills] = await Promise.all([
            this.getOverview(request),
            this.getWorkspaceSnapshot(request),
            this.listMemories(request),
            this.listSkills(request)
        ]);
        return {
            overview,
            snapshot,
            memories,
            skills,
            sampleQueries: [
                'Find related tests',
                'Show project conventions',
                'Summarize risky files'
            ]
        };
    }

    async getSettings(workspacePath: string): Promise<MemoryWorkspaceSettings> {
        const store = await this.readStore();
        return this.normalizeSettings(workspacePath, store.settings[this.workspaceKey(workspacePath)]);
    }

    async updateSettings(settings: Partial<MemoryWorkspaceSettings> & { workspacePath: string }): Promise<MemoryWorkspaceSettings> {
        const store = await this.readStore();
        const key = this.workspaceKey(settings.workspacePath);
        const current = this.normalizeSettings(settings.workspacePath, store.settings[key]);
        const updated = {
            ...current,
            ...settings,
            icmBridge: {
                ...current.icmBridge,
                ...settings.icmBridge
            },
            vectorSearch: {
                ...(current.vectorSearch ?? this.defaultVectorSettings()),
                ...(settings.vectorSearch ?? {})
            },
            ignoreRules: {
                ...current.ignoreRules,
                ...settings.ignoreRules
            },
            exportOptions: {
                ...current.exportOptions,
                ...settings.exportOptions
            },
            retentionPolicies: {
                ...current.retentionPolicies,
                ...settings.retentionPolicies
            },
            optIn: {
                ...current.optIn,
                ...settings.optIn
            },
            updatedAt: new Date().toISOString()
        };
        store.settings[key] = updated;
        await this.writeStore(store);
        return updated;
    }

    async updateWorkspaceConsent(request: MemoryWorkspaceConsentUpdateRequest): Promise<MemoryWorkspaceSettings> {
        const store = await this.readStore();
        const key = this.workspaceKey(request.workspacePath);
        const current = this.normalizeSettings(request.workspacePath, store.settings[key]);
        const now = new Date().toISOString();
        const optIn = {
            ...current.optIn,
            ...request.capabilities
        };
        const updated: MemoryWorkspaceSettings = {
            ...current,
            enabled: Object.values(optIn).some(value => value === true),
            graphEnabled: optIn.codeGraph === true || optIn.documentGraph === true,
            memoryEnabled: optIn.projectMemory === true || optIn.preferences === true || optIn.transcriptSearch === true,
            skillSuggestionsEnabled: optIn.skills === true,
            chatLearningEnabled: optIn.events === true || optIn.skills === true || optIn.transcriptSearch === true || optIn.promptSnippets === true,
            editorHoverEnabled: optIn.editorHover === true,
            optIn,
            updatedAt: now
        };
        store.settings[key] = updated;
        this.recordAuditEvent(store, request.workspacePath, 'consent.updated', {
            enabled: updated.enabled,
            granted: Object.entries(request.capabilities)
                .filter(([, value]) => value === true)
                .map(([capability]) => capability)
                .sort(),
            revoked: Object.entries(request.capabilities)
                .filter(([, value]) => value === false)
                .map(([capability]) => capability)
                .sort()
        }, now);
        await this.writeStore(store);
        return updated;
    }

    async getVectorStatus(workspacePath: string): Promise<MemoryVectorStatus> {
        const store = await this.readStore();
        return this.vectorStatus(store, workspacePath);
    }

    async updateVectorSettings(settings: MemoryVectorSettingsUpdate): Promise<MemoryVectorStatus> {
        const store = await this.readStore();
        const key = this.workspaceKey(settings.workspacePath);
        const now = new Date().toISOString();
        const current = this.normalizeSettings(settings.workspacePath, store.settings[key]).vectorSearch ?? this.defaultVectorSettings();
        const dimensions = this.vectorService.normalizeDimensions(settings.dimensions ?? current.dimensions);
        const localModelId = settings.localModelId ?? current.localModelId;
        const requiresBackfill = localModelId !== current.localModelId || dimensions !== current.dimensions;
        const updatedVectorSettings: MemoryVectorSettings = {
            ...current,
            enabled: settings.enabled ?? current.enabled,
            userConsentAt: settings.consent === true ? now : settings.consent === false ? undefined : settings.userConsentAt ?? current.userConsentAt,
            localModelId,
            dimensions,
            backfillStatus: settings.backfillStatus ?? (requiresBackfill ? 'pending' : current.backfillStatus)
        };
        store.settings[key] = {
            ...this.normalizeSettings(settings.workspacePath, store.settings[key]),
            workspacePath: settings.workspacePath,
            vectorSearch: updatedVectorSettings,
            optIn: store.settings[key]?.optIn ?? {},
            updatedAt: now
        };
        await this.writeStore(store);
        return this.vectorStatus(store, settings.workspacePath);
    }

    async backfillMemoryVectors(workspacePath: string): Promise<MemoryVectorStatus> {
        const store = await this.readStore();
        const now = new Date().toISOString();
        const beforeVectorCount = store.memoryVectors.length;
        const status = this.backfillMemoryVectorsInStore(store, workspacePath, now);
        this.recordAuditEvent(store, workspacePath, 'embedding.backfilled', {
            status,
            generatedVectors: Math.max(0, store.memoryVectors.length - beforeVectorCount),
            totalVectors: store.memoryVectors.length
        }, now);
        await this.writeStore(store);
        return this.vectorStatus(store, workspacePath);
    }

    protected backfillMemoryVectorsInStore(store: MemoryStore, workspacePath: string, now: string): MemoryVectorBackfillStatus {
        const key = this.workspaceKey(workspacePath);
        const settings = this.normalizeSettings(workspacePath, store.settings[key]);
        const optIn = store.settings[key]?.optIn ?? {};
        const vectorSettings = settings.vectorSearch ?? this.defaultVectorSettings();
        if (!vectorSettings.enabled || !vectorSettings.userConsentAt) {
            store.settings[key] = {
                ...settings,
                optIn,
                vectorSearch: {
                    ...vectorSettings,
                    backfillStatus: 'not_started',
                    lastError: vectorSettings.enabled ? 'Vector backfill requires user consent.' : undefined
                },
                updatedAt: now
            };
            return 'not_started';
        }
        store.settings[key] = {
            ...settings,
            optIn,
            vectorSearch: {
                ...vectorSettings,
                backfillStatus: 'running',
                lastError: undefined
            },
            updatedAt: now
        };
        try {
            const vectors = this.buildMemoryVectors(store, workspacePath, vectorSettings, now);
            const vectorMemoryIds = new Set(vectors.map(vector => vector.memoryId));
            store.memoryVectors = [
                ...store.memoryVectors.filter(vector => !this.vectorBelongsToWorkspace(vector, key) || !vectorMemoryIds.has(vector.memoryId)),
                ...vectors
            ];
            for (const vector of vectors) {
                const memory = store.memories.find(item => item.id === vector.memoryId);
                this.recordAuditEvent(store, workspacePath, 'embedding.generated', {
                    memoryId: vector.memoryId,
                    vectorId: vector.id,
                    scope: vector.scope,
                    modelId: vector.modelId,
                    dimensions: vector.dimensions,
                    contentHash: vector.contentHash,
                    memoryStatus: memory?.status,
                    source: 'backfill'
                }, now);
            }
            store.settings[key] = {
                ...store.settings[key],
                optIn,
                vectorSearch: {
                    ...vectorSettings,
                    backfillStatus: 'completed',
                    backfilledAt: now,
                    lastError: undefined
                },
                updatedAt: now
            };
        } catch (error) {
            store.settings[key] = {
                ...store.settings[key],
                optIn,
                vectorSearch: {
                    ...vectorSettings,
                    backfillStatus: 'failed',
                    lastError: error instanceof Error ? error.message : String(error)
                },
                updatedAt: now
            };
        }
        return store.settings[key].vectorSearch?.backfillStatus ?? 'failed';
    }

    async clearWorkspaceData(workspacePath: string): Promise<void> {
        const store = await this.readStore();
        const key = this.workspaceKey(workspacePath);
        delete store.files[key];
        delete store.symbols[key];
        delete store.relations[key];
        delete store.codeChunks[key];
        delete store.snapshots[key];
        delete store.legacyMemories[key];
        delete store.skills[key];
        store.graphSnapshots = store.graphSnapshots.filter(snapshot => this.workspaceKey(snapshot.workspacePath) !== key);
        store.changeImpacts = store.changeImpacts.filter(impact => this.workspaceKey(impact.workspacePath) !== key);
        store.contextSuggestions = store.contextSuggestions.filter(suggestion => this.workspaceKey(suggestion.workspacePath) !== key);
        store.memories = store.memories.filter(memory => memory.scope === 'global' || this.workspaceKey(memory.workspacePath ?? '') !== key);
        store.memoryVectors = store.memoryVectors.filter(vector => vector.scope === 'global' || this.workspaceKey(vector.workspacePath ?? '') !== key);
        store.knowledgeGraphs = store.knowledgeGraphs.filter(graph => graph.scope === 'global' || this.workspaceKey(graph.workspacePath ?? '') !== key);
        store.skillCandidates = store.skillCandidates.filter(candidate => this.workspaceKey(candidate.workspacePath ?? '') !== key);
        store.events = store.events.filter(event => this.workspaceKey(event.workspacePath) !== key);
        store.feedbackRecords = store.feedbackRecords.filter(record => this.workspaceKey(record.workspacePath) !== key);
        await this.writeStore(store);
        await this.repository.replaceCodeChunks(workspacePath, []);
    }

    async getDashboard(workspacePath: string): Promise<MemoryDashboard> {
        const store = await this.readStore();
        const key = this.workspaceKey(workspacePath);
        const settings = store.settings[key] ?? this.defaultSettings(workspacePath);
        const files = store.files[key] ?? [];
        const symbols = store.symbols[key] ?? [];
        const relations = store.relations[key] ?? [];
        const codeChunks = store.codeChunks[key] ?? [];
        const graphSnapshots = store.graphSnapshots.filter(snapshot => this.workspaceKey(snapshot.workspacePath) === key);
        const changeImpacts = store.changeImpacts.filter(impact => this.workspaceKey(impact.workspacePath) === key);
        const contextSuggestions = store.contextSuggestions.filter(suggestion => this.workspaceKey(suggestion.workspacePath) === key);
        const memories = this.memoryService.markStaleness(store.memories
            .filter(memory => !memory.workspacePath || this.workspaceKey(memory.workspacePath) === key)
            .filter(memory => this.memoryService.isRetrievable(memory)));
        if (this.ensureDefaultKnowledgeGraph(store, workspacePath)) {
            await this.writeStore(store);
        }
        const knowledgeGraphs = store.knowledgeGraphs.filter(graph => this.knowledgeGraphInWorkspace(graph, workspacePath));
        const skillCandidates = store.skillCandidates.filter(candidate => !candidate.workspacePath || this.workspaceKey(candidate.workspacePath) === key);
        const events = store.events.filter(event => this.workspaceKey(event.workspacePath) === key).slice(-50).reverse();
        const memoryHealth = {
            ...this.memoryService.healthReport(memories),
            recentConsolidations: this.recentMemoryConsolidations(events)
        };
        const benchmarkReports = (store.benchmarkReports ?? [])
            .filter(report => this.workspaceKey(report.workspacePath) === key)
            .sort((left, right) => right.generatedAt.localeCompare(left.generatedAt))
            .slice(0, 10);
        const retrievalResults = await this.search({ workspacePath, text: '', limit: 8 });
        const portablePackage = await this.detectPortableMemory(workspacePath);
        return {
            settings,
            portablePackage,
            csharpAnalysisStatus: this.getCSharpAnalysisStatus(files, symbols),
            files: files.slice(0, 200),
            symbols: symbols.slice(0, 300),
            relations: relations.slice(0, 500),
            codeChunks: codeChunks.slice(0, 300),
            graphSnapshots: graphSnapshots.slice(-10).reverse(),
            changeImpacts: changeImpacts.slice(-50).reverse(),
            contextSuggestions: contextSuggestions.slice(-50).reverse(),
            memories,
            memorySpaces: await this.listMemorySpaces(workspacePath),
            memoryHealth,
            benchmarkReport: benchmarkReports[0],
            benchmarkReports,
            knowledgeGraphs,
            skillCandidates,
            events,
            retrievalResults,
            suggestedQuestions: this.suggestContributorQuestions({
                workspacePath,
                files,
                symbols,
                relations,
                codeChunks,
                memories,
                knowledgeGraphs,
                changeImpacts
            }),
            graphs: {
                code: this.buildCodeGraph(files, symbols, relations),
                documents: await this.buildDocumentsGraph(workspacePath),
                projectMemories: this.buildMemoryGraph(memories.filter(memory => memory.scope === 'workspace'), 'Project Memories Graph'),
                preferences: this.buildMemoryGraph(memories.filter(memory => memory.scope === 'global'), 'IDE Memories Graph'),
                knowledge: this.buildKnowledgeGraphView(knowledgeGraphs)
            }
        };
    }

    protected getCSharpAnalysisStatus(
        files: readonly MemoryFile[],
        symbols: readonly MemorySymbol[]
    ): MemoryDashboard['csharpAnalysisStatus'] {
        const csharpFiles = files.filter(file => file.languageId === 'csharp' || file.relativePath.toLowerCase().endsWith('.cs'));
        const csharpFileIds = new Set(csharpFiles.map(file => file.id));
        const csharpSymbols = symbols.filter(symbol => csharpFileIds.has(symbol.fileId));
        const csharpResults = this.lastLanguageAnalysisResults.filter(result => result.languageId === 'csharp');
        const diagnostics = csharpResults.flatMap(result => result.diagnostics ?? []);
        const metadataAnalyzer = csharpSymbols.find(symbol => typeof symbol.metadata?.analyzer === 'string')?.metadata?.analyzer;
        const analyzerId = csharpResults.find(result => result.analyzerId)?.analyzerId
            ?? (typeof metadataAnalyzer === 'string' ? metadataAnalyzer : undefined);
        const indexedAt = csharpFiles
            .map(file => file.indexedAt)
            .filter((value): value is string => !!value)
            .sort();
        const updatedAt = indexedAt[indexedAt.length - 1];

        if (!csharpFiles.length) {
            return {
                mode: 'unavailable',
                label: 'C#: unavailable',
                detail: 'No C# files are indexed in this workspace.',
                analyzerId,
                fileCount: 0,
                symbolCount: 0,
                updatedAt
            };
        }
        if (diagnostics.some(diagnostic => diagnostic.id === 'roslyn-semantic-mode')
            || csharpSymbols.some(symbol => symbol.metadata?.analysisMode === 'msbuild-workspace')) {
            return {
                mode: 'roslyn-semantic',
                label: 'C#: Roslyn semantic',
                detail: 'Roslyn is using MSBuild workspace context and semantic models for C# analysis.',
                analyzerId,
                fileCount: csharpFiles.length,
                symbolCount: csharpSymbols.length,
                updatedAt
            };
        }
        if (diagnostics.some(diagnostic => diagnostic.id === 'roslyn-parse-only-mode')
            || csharpSymbols.some(symbol => symbol.metadata?.analysisMode === 'syntax')) {
            return {
                mode: 'roslyn-parse-only',
                label: 'C#: Roslyn parse-only',
                detail: 'Roslyn is available, but no MSBuild project or semantic model was available for this workspace.',
                analyzerId,
                fileCount: csharpFiles.length,
                symbolCount: csharpSymbols.length,
                updatedAt
            };
        }
        if (csharpResults.some(result => result.analyzerId === 'csharp-structural-fallback')
            || diagnostics.some(diagnostic => diagnostic.id === 'roslyn-fallback-mode' || diagnostic.id === 'roslyn-sidecar-unavailable')
            || csharpSymbols.some(symbol => symbol.metadata?.analysisMode === 'structural-fallback')) {
            const fallbackReason = diagnostics.find(diagnostic => diagnostic.id === 'roslyn-sidecar-unavailable' || diagnostic.id === 'roslyn-fallback-mode')?.message;
            return {
                mode: 'structural-fallback',
                label: 'C#: structural fallback',
                detail: fallbackReason ?? 'C# symbols were extracted by the structural fallback analyzer; semantic confidence is limited.',
                analyzerId,
                fileCount: csharpFiles.length,
                symbolCount: csharpSymbols.length,
                updatedAt
            };
        }
        return {
            mode: 'unavailable',
            label: 'C#: unavailable',
            detail: 'C# files are present, but no C# analysis result is available yet.',
            analyzerId,
            fileCount: csharpFiles.length,
            symbolCount: csharpSymbols.length,
            updatedAt
        };
    }

    protected async detectPortableMemory(workspacePath: string): Promise<MemoryPortablePackageSummary> {
        const installPath = path.join(path.resolve(workspacePath), '.cybervinci', 'memory');
        const empty: MemoryPortablePackageSummary = {
            detected: false,
            installPath,
            policies: {},
            counts: {},
            artifactPaths: [],
            summary: 'No portable Memory package was detected in this workspace.',
            warnings: []
        };
        let entries: string[];
        try {
            entries = await fs.readdir(installPath);
        } catch {
            return empty;
        }
        if (entries.includes(this.portableIgnoreMarker)) {
            return {
                ...empty,
                summary: 'A portable Memory package exists in this workspace, but local detection is ignored.'
            };
        }
        const warnings: string[] = [];
        const artifactPaths = entries.filter(entry => !entry.startsWith('.')).sort();
        const metadata = await this.readPortableJson(path.join(installPath, 'metadata.json'), warnings);
        const bundle = await this.readPortableJson(path.join(installPath, 'cybervinci-memory-bundle.json'), warnings);
        const stats = await this.portableInstallStats(installPath, ['metadata.json', 'cybervinci-memory-bundle.json']);
        const metadataOrigin = this.recordValue(metadata, 'origin');
        const bundleSettings = this.recordValue(bundle, 'settings');
        const metadataScope = this.recordValue(metadata, 'scope');
        const version = this.numberValue(metadata.version) ?? this.numberValue(bundle.version);
        const exportedAt = this.stringValue(metadata.exportedAt) ?? this.stringValue(bundle.exportedAt);
        const policies = this.booleanRecord(this.recordValue(metadata, 'policies'));
        const counts = this.numberRecord(this.recordValue(metadata, 'counts'));
        const source = this.stringValue((metadataOrigin as Record<string, unknown> | undefined)?.source) ?? this.stringValue(bundle.source) ?? 'workspace-export';
        const producer = this.stringValue((metadataOrigin as Record<string, unknown> | undefined)?.producer) ?? 'cybervinci-memory';
        const workspace = this.stringValue((metadataScope as Record<string, unknown> | undefined)?.workspacePath) ?? this.stringValue(bundle.workspacePath);
        const author = this.stringValue((metadataOrigin as Record<string, unknown> | undefined)?.author)
            ?? this.stringValue((bundleSettings as Record<string, unknown> | undefined)?.author);
        const machine = this.stringValue((metadataOrigin as Record<string, unknown> | undefined)?.machine)
            ?? this.stringValue((metadataOrigin as Record<string, unknown> | undefined)?.host)
            ?? this.stringValue((bundleSettings as Record<string, unknown> | undefined)?.machine);
        return {
            detected: true,
            installPath,
            source,
            version,
            exportedAt,
            installedAt: stats.newestMtime,
            author,
            machine,
            producer,
            workspacePath: workspace,
            policies,
            counts: Object.keys(counts).length ? counts : this.portableCountsFromBundle(bundle),
            artifactPaths,
            summary: this.portablePackageSummary(version, exportedAt, artifactPaths.length, stats.totalBytes),
            warnings
        };
    }

    protected async readPortableJson(filePath: string, warnings: string[]): Promise<Record<string, unknown>> {
        try {
            const stat = await fs.stat(filePath);
            if (stat.size > 5 * 1024 * 1024) {
                warnings.push(`${path.basename(filePath)} was not read because it is larger than 5 MiB.`);
                return {};
            }
            const parsed = JSON.parse(await fs.readFile(filePath, 'utf8'));
            return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
        } catch (error) {
            const code = (error as NodeJS.ErrnoException).code;
            if (code !== 'ENOENT') {
                warnings.push(`Could not read ${path.basename(filePath)}.`);
            }
            return {};
        }
    }

    protected async portableInstallStats(installPath: string, fileNames: string[]): Promise<{ totalBytes: number; newestMtime?: string }> {
        let totalBytes = 0;
        let newestMtime = 0;
        for (const fileName of fileNames) {
            try {
                const stat = await fs.stat(path.join(installPath, fileName));
                totalBytes += stat.size;
                newestMtime = Math.max(newestMtime, stat.mtimeMs);
            } catch {
                // Optional portable files may be absent in older packages.
            }
        }
        return {
            totalBytes,
            newestMtime: newestMtime ? new Date(newestMtime).toISOString() : undefined
        };
    }

    protected recentMemoryConsolidations(events: MemoryEvent[]): MemoryDashboard['memoryHealth']['recentConsolidations'] {
        return events
            .filter(event => event.eventType === 'memory.consolidated')
            .slice(0, 5)
            .map(event => {
                const payload = this.safeJsonObject(event.payload);
                const supersedes = Array.isArray(payload.supersedes)
                    ? payload.supersedes.filter((value): value is string => typeof value === 'string')
                    : undefined;
                return {
                    id: event.id,
                    memoryId: typeof payload.memoryId === 'string' ? payload.memoryId : undefined,
                    title: typeof payload.topic === 'string' ? payload.topic : undefined,
                    scope: this.isMemoryScope(payload.scope) ? payload.scope : undefined,
                    supersedes,
                    createdAt: event.createdAt
                };
            });
    }

    protected safeJsonObject(value: string | undefined): Record<string, unknown> {
        if (!value) {
            return {};
        }
        try {
            const parsed = JSON.parse(value);
            return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
        } catch {
            return {};
        }
    }

    protected recordValue(value: Record<string, unknown>, key: string): Record<string, unknown> | undefined {
        const candidate = value[key];
        return candidate && typeof candidate === 'object' && !Array.isArray(candidate) ? candidate as Record<string, unknown> : undefined;
    }

    protected stringValue(value: unknown): string | undefined {
        return typeof value === 'string' && value.trim() ? this.redactionService.redactText(value.trim()) : undefined;
    }

    protected numberValue(value: unknown): number | undefined {
        return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
    }

    protected booleanRecord(value: Record<string, unknown> | undefined): Record<string, boolean | string | number> {
        const result: Record<string, boolean | string | number> = {};
        for (const [key, candidate] of Object.entries(value ?? {})) {
            if (typeof candidate === 'boolean' || typeof candidate === 'string' || typeof candidate === 'number') {
                result[key] = typeof candidate === 'string' ? this.redactionService.redactText(candidate) ?? '' : candidate;
            }
        }
        return result;
    }

    protected numberRecord(value: Record<string, unknown> | undefined): Record<string, number> {
        const result: Record<string, number> = {};
        for (const [key, candidate] of Object.entries(value ?? {})) {
            if (typeof candidate === 'number' && Number.isFinite(candidate)) {
                result[key] = candidate;
            }
        }
        return result;
    }

    protected portableCountsFromBundle(bundle: Record<string, unknown>): Record<string, number> {
        const counts: Record<string, number> = {};
        for (const key of ['files', 'symbols', 'relations', 'codeChunks', 'graphSnapshots', 'changeImpacts', 'contextSuggestions', 'memories', 'memorySpaces', 'memoryVectors', 'knowledgeGraphs', 'skillCandidates', 'events', 'feedbackRecords']) {
            const value = bundle[key];
            if (Array.isArray(value)) {
                counts[key] = value.length;
            }
        }
        return counts;
    }

    protected portablePackageSummary(version: number | undefined, exportedAt: string | undefined, artifactCount: number, totalBytes: number): string {
        const versionText = version === undefined ? 'unknown version' : `version ${version}`;
        const dateText = exportedAt ? ` exported at ${exportedAt}` : '';
        const sizeText = totalBytes ? `; metadata size ${totalBytes} bytes` : '';
        return `Detected CyberVinci Memory portable package (${versionText}${dateText}) with ${artifactCount} files${sizeText}.`;
    }

    protected isMemoryScope(value: unknown): value is MemoryItem['scope'] {
        return value === 'global' || value === 'workspace' || value === 'repository' || value === 'session' || value === 'task';
    }

    async listMemorySpaces(workspacePath: string): Promise<MemorySpace[]> {
        const spaces = this.repository.listMemorySpaces
            ? await this.repository.listMemorySpaces()
            : (await this.readStore()).memorySpaces;
        const key = this.workspaceKey(workspacePath);
        const repositoryIdentity = await this.resolveRepositoryIdentity(workspacePath);
        return spaces.filter(space => {
            switch (space.scope) {
                case 'global':
                    return true;
                case 'workspace':
                    return !!space.workspacePath && this.workspaceKey(space.workspacePath) === key;
                case 'repository':
                    return (!!space.repositoryId && space.repositoryId === repositoryIdentity.repositoryId)
                        || (!!space.repositoryUrl && space.repositoryUrl === repositoryIdentity.repositoryUrl);
                case 'session':
                case 'task':
                    return !!space.workspacePath && this.workspaceKey(space.workspacePath) === key;
                default:
                    return false;
            }
        });
    }

    async indexWorkspace(request: MemoryIndexRequest): Promise<MemoryIndexResult> {
        return this.performIndexWorkspace(request);
    }

    async enqueueIncrementalIndex(request: MemoryIndexRequest): Promise<MemoryIndexResult> {
        return this.incrementalIndexQueue.enqueue(request);
    }

    protected async recordIncrementalIndexAudit(eventType: 'index.incremental.completed' | 'index.incremental.failed', request: MemoryIndexRequest, payload: Record<string, unknown>): Promise<void> {
        await this.recordEvent({
            workspacePath: request.workspacePath,
            eventType,
            payload: JSON.stringify({
                ...payload,
                requestedScope: request.scope ?? 'changed-files',
                requestedChangedPathCount: request.changedRelativePaths?.length ?? 0,
                maxFiles: request.maxFiles,
                backfillMemories: request.backfillMemories === true,
                refreshExternalDocs: request.refreshExternalDocs === true,
                externalDocCollectionCount: request.externalDocCollectionIds?.length ?? 0
            })
        });
    }

    getIncrementalIndexQueueStatus(workspacePath?: string): IncrementalIndexQueueStatus[] {
        return this.incrementalIndexQueue.status(workspacePath);
    }

    protected async performIndexWorkspace(request: MemoryIndexRequest): Promise<MemoryIndexResult> {
        const startedAtMs = Date.now();
        const store = await this.readStore();
        const key = this.workspaceKey(request.workspacePath);
        const backfillScope = request.scope ?? 'changed-files';
        const settings = this.normalizeSettings(request.workspacePath, store.settings[key]);
        const previousFiles = store.files[key] ?? [];
        const previousSymbols = store.symbols[key] ?? [];
        const previousRelations = store.relations[key] ?? [];
        const previousCodeChunks = store.codeChunks[key] ?? [];
        const files = await this.scanWorkspaceFiles(request.workspacePath, settings);
        const unchangedFileIds = this.unchangedFileIds(previousFiles, files);
        const requestedChangedPaths = this.changedRelativePathSet(request);
        const changedFiles = files.filter(file => requestedChangedPaths
            ? requestedChangedPaths.has(this.normalizeReactiveRelativePath(file.relativePath))
            : !unchangedFileIds.has(file.id));
        const indexedFiles = this.indexTargetsForScope(changedFiles, backfillScope, settings).slice(0, request.maxFiles);
        const indexedFileIds = new Set(indexedFiles.map(file => file.id));
        const preservedFileIds = this.preservedFileIdsForIndex(previousFiles, files, indexedFileIds, backfillScope);
        const preservedSymbols = previousSymbols.filter(symbol => preservedFileIds.has(symbol.fileId));
        const changedSymbols = backfillScope === 'local-docs'
            ? []
            : await this.extractSymbols(request.workspacePath, indexedFiles);
        const symbols = [...preservedSymbols, ...changedSymbols];
        const relations = this.uniqueRelations([
            ...this.preservedRelations(previousRelations, previousSymbols, preservedFileIds),
            ...this.extractRelations(files, symbols)
        ]);
        const indexedAt = new Date().toISOString();
        const refreshingExternalDocs = request.refreshExternalDocs === true && settings.optIn?.externalDocCollections === true;
        const refreshingExternalIds = new Set(request.externalDocCollectionIds ?? []);
        const refreshedCollections = refreshingExternalDocs
            ? (settings.externalDocCollections ?? []).filter(collection => collection.enabled
                && (collection.refreshPolicy === 'on-demand' || request.refreshExternalDocs === true)
                && (!refreshingExternalIds.size || refreshingExternalIds.has(collection.id)))
            : [];
        const refreshedCollectionIds = new Set(refreshedCollections.map(collection => collection.id));
        const preservedCodeChunks = previousCodeChunks.filter(chunk => {
            if (chunk.sourceKind === 'external-docs') {
                return !refreshedCollectionIds.has(chunk.externalCollectionId ?? '');
            }
            return preservedFileIds.has(chunk.fileId);
        });
        const changedCodeChunks = await this.fileContentIndexer.indexWorkspace(request.workspacePath, indexedFiles, symbols.filter(symbol => indexedFileIds.has(symbol.fileId)), indexedAt, {
            includePdfDocuments: settings.optIn?.pdfDocuments === true,
            includeOfficeDocuments: settings.optIn?.officeDocuments === true,
            includeImages: settings.optIn?.images === true,
            includeDiagrams: settings.optIn?.diagrams === true,
            includeAudioVideo: settings.optIn?.audioVideo === true,
            allowRemoteImageSemantics: settings.optIn?.remoteImageSemantics === true && !!settings.optIn.remoteImageSemanticsConsentAt,
            allowRemoteMediaTranscription: settings.optIn?.remoteMediaTranscription === true && !!settings.optIn.remoteMediaTranscriptionConsentAt
        });
        const externalDocChunks = (await Promise.all(refreshedCollections.map(collection =>
            this.fileContentIndexer.indexExternalDocCollection(request.workspacePath, collection, indexedAt)
        ))).flat();
        const codeChunks = [...preservedCodeChunks, ...changedCodeChunks, ...externalDocChunks];
        store.settings[key] = {
            ...settings,
            externalDocCollections: (settings.externalDocCollections ?? []).map(collection => refreshedCollectionIds.has(collection.id)
                ? { ...collection, lastRefreshedAt: indexedAt, updatedAt: indexedAt }
                : collection),
            enabled: true,
            graphEnabled: true,
            updatedAt: indexedAt
        };
        store.files[key] = this.mergeIndexedFiles(previousFiles, files, indexedFileIds, backfillScope, indexedAt);
        store.symbols[key] = symbols;
        store.relations[key] = relations;
        store.codeChunks[key] = codeChunks;
        store.snapshots[key] = this.buildSnapshot(request.workspacePath, indexedAt, 'quick', store.files[key]);
        store.graphSnapshots.push(this.graphSnapshot(request.workspacePath, 'Code Graph', this.buildCodeGraph(store.files[key], symbols, relations), indexedAt));
        const canProposeMemoryFromIndex = settings.optIn?.projectMemory === true || settings.optIn?.preferences === true;
        const canProposeDocumentMemoryCandidates = canProposeMemoryFromIndex
            || settings.optIn?.pdfDocuments === true
            || settings.optIn?.officeDocuments === true
            || settings.optIn?.diagrams === true
            || settings.optIn?.audioVideo === true;
        for (const chunk of changedCodeChunks.filter(candidate => canProposeDocumentMemoryCandidates && ['pdf-page', 'office-document', 'diagram-document', 'media-transcript'].includes(candidate.chunkKind))) {
            const source = chunk.chunkKind === 'pdf-page'
                ? 'pdf-document-ingestion'
                : chunk.chunkKind === 'office-document'
                    ? 'office-document-ingestion'
                    : chunk.chunkKind === 'diagram-document'
                        ? 'diagram-document-ingestion'
                        : 'local-media-transcript-ingestion';
            this.proposeMemoryCandidatesInStore(store, {
                workspacePath: request.workspacePath,
                text: chunk.content,
                source,
                evidence: JSON.stringify({
                    source,
                    relativePath: chunk.relativePath,
                    chunkId: chunk.id,
                    redacted: true,
                    reviewRequired: true
                }),
                relativePath: chunk.relativePath,
                maxCandidates: 5
            }, indexedAt);
        }
        if (canProposeMemoryFromIndex) {
            this.proposeContradictionCandidatesInStore(store, request.workspacePath, indexedAt);
        }
        store.events.push({
            id: this.id('event'),
            workspacePath: request.workspacePath,
            eventType: 'search.executed',
            payload: 'workspace indexed',
            createdAt: indexedAt
        });
        if (canProposeMemoryFromIndex) {
            await this.ensureSeedData(store, request.workspacePath);
        }
        let memoryBackfillStatus: MemoryVectorBackfillStatus | undefined;
        if (request.backfillMemories && settings.vectorSearch?.enabled === true && !!settings.vectorSearch.userConsentAt) {
            const beforeVectorCount = store.memoryVectors.length;
            memoryBackfillStatus = this.backfillMemoryVectorsInStore(store, request.workspacePath, indexedAt);
            this.recordAuditEvent(store, request.workspacePath, 'embedding.backfilled', {
                status: memoryBackfillStatus,
                source: 'indexWorkspace',
                generatedVectors: Math.max(0, store.memoryVectors.length - beforeVectorCount),
                totalVectors: store.memoryVectors.length
            }, indexedAt);
        }
        await this.writeStore(store);
        await this.repository.replaceCodeChunks(request.workspacePath, codeChunks);
        await this.repository.invalidateRetrievalCache?.(request.workspacePath, indexedFiles.map(file => file.relativePath));
        const indexedChunkCount = changedCodeChunks.length + externalDocChunks.length;
        const indexingLatency = this.benchmarkService.buildIndexingLatencyBenchmark({
            workspacePath: request.workspacePath,
            indexedAt,
            durationMs: Date.now() - startedAtMs,
            files: store.files[key],
            indexedFileCount: indexedFiles.length,
            indexedChunkCount
        });
        return {
            workspacePath: request.workspacePath,
            fileCount: files.length,
            changedFileCount: changedFiles.length,
            indexedFileCount: indexedFiles.length,
            preservedChunkCount: preservedCodeChunks.length,
            indexedChunkCount,
            refreshedExternalDocCollectionCount: refreshedCollections.length,
            backfillScope,
            memoryBackfillStatus,
            symbolCount: symbols.length,
            relationCount: relations.length,
            sensitiveFileCount: files.filter(file => file.isSensitive).length,
            indexingLatency,
            indexedAt
        };
    }

    async search(request: MemorySearchRequest): Promise<MemoryRetrievalResult[]>;
    async search(query: RetrievalQuery): Promise<RetrievalResult[]>;
    async search(query: MemorySearchRequest | RetrievalQuery): Promise<MemoryRetrievalResult[] | RetrievalResult[]> {
        if ('workspaceRoot' in query) {
            const retrievalResults = await this.search({
                workspacePath: query.workspaceRoot,
                text: query.query,
                limit: query.maxResults,
                sourceKinds: this.toSourceKinds(query.includeSources)
            });
            return retrievalResults.map(result => ({
                id: result.id,
                source: result.sourceKind === 'project-memory' || result.sourceKind === 'repository-memory' || result.sourceKind === 'task-memory' ? 'memory' as const : result.sourceKind === 'code' || result.sourceKind === 'code-graph' ? 'workspace' as const : result.sourceKind === 'skill' ? 'skill' as const : 'mock' as const,
                title: result.title,
                excerpt: result.snippet,
                score: result.score,
                path: result.uri,
                metadata: {
                    sourceKind: result.sourceKind,
                    evidence: result.evidence ?? ''
                }
            }));
        }
        const limit = query.limit ?? 20;
        const store = await this.readStore();
        const enabledSources = new Set(this.consentAllowedSourceKinds(query.workspacePath, query.sourceKinds, store));
        if (!enabledSources.size) {
            return [];
        }
        const repositoryIdentity = enabledSources.has('project-memory') || enabledSources.has('repository-memory')
            ? await this.resolveRepositoryIdentity(query.workspacePath)
            : {};
        const sourceKinds = [...enabledSources].sort();
        let sourcesHash = await this.retrievalSourcesHash(query.workspacePath);
        const queryKey = this.retrievalCacheQueryKey({
            ...query,
            ...repositoryIdentity,
            limit,
            sourceKinds: sourceKinds as MemorySourceKind[]
        });
        const cached = await this.repository.getRetrievalCache?.(queryKey, query.workspacePath, sourcesHash);
        if (cached) {
            return cached.results.slice(0, limit);
        }
        const results = (await Promise.all(this.retrievalSources()
            .filter(source => enabledSources.has(source.sourceKind) || (source.sourceKind === 'code' && (enabledSources.has('local-docs') || enabledSources.has('external-docs'))))
            .map(source => source.search({ ...query, ...repositoryIdentity, limit }))))
            .flat();
        if (enabledSources.has('code-graph')) {
            results.push(...await this.searchCodeGraph(query));
        }
        const rankedResults = results.sort((left, right) => right.score - left.score).slice(0, limit);
        if (query.text.trim()) {
            await this.recordMemoryRetrievalAccess(query.workspacePath, rankedResults);
            sourcesHash = await this.retrievalSourcesHash(query.workspacePath);
        }
        await this.repository.setRetrievalCache?.({
            id: `retrieval:${queryKey}`,
            workspacePath: query.workspacePath,
            queryKey,
            scopeParams: {
                workspacePath: query.workspacePath,
                sourceKinds: sourceKinds as MemorySourceKind[],
                limit,
                repositoryUrl: repositoryIdentity.repositoryUrl,
                repositoryId: repositoryIdentity.repositoryId,
                taskId: query.taskId
            },
            sourcesHash,
            results: rankedResults.map(result => ({
                ...result,
                snippet: result.snippet.length > 1200 ? `${result.snippet.slice(0, 1200)}...` : result.snippet
            })),
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString()
        });
        return rankedResults;
    }

    async addMemory(memory: Pick<MemoryItem, 'scope' | 'memoryType' | 'title' | 'content'> & Partial<Pick<MemoryItem, 'workspacePath' | 'repositoryUrl' | 'repositoryId' | 'sessionId' | 'taskId' | 'expiresAt' | 'retentionPolicy' | 'importance' | 'weight' | 'source' | 'evidence' | 'supersededBy' | 'supersedes' | 'originMarkers'>>): Promise<MemoryItem> {
        const store = await this.readStore();
        const now = new Date().toISOString();
        const normalizedWorkspacePath = memory.scope === 'global' ? undefined : memory.workspacePath;
        const repositoryIdentity = await this.repositoryIdentityForMemory(memory, normalizedWorkspacePath);
        const normalized = this.memoryService.normalize({
            id: this.id('mem'),
            ...memory,
            workspacePath: normalizedWorkspacePath,
            repositoryUrl: memory.repositoryUrl ?? repositoryIdentity.repositoryUrl,
            repositoryId: memory.repositoryId ?? repositoryIdentity.repositoryId,
            status: 'active',
            staleStatus: 'fresh',
            createdAt: now,
            updatedAt: now,
            acceptedCount: 0,
            rejectedCount: 0
        });
        const item = this.assignDefaultMemorySpace(normalized);
        this.upsertDefaultMemorySpace(store, item, now);
        store.memories.push(item);
        const workspaceMemoryPath = item.workspacePath ?? memory.workspacePath;
        this.proposeContradictionCandidatesInStore(store, workspaceMemoryPath, now);
        if (item.status === 'active' && item.scope === 'workspace' && workspaceMemoryPath) {
            this.ensureDefaultKnowledgeGraph(store, workspaceMemoryPath);
        }
        this.upsertMemoryVectorIfEnabled(store, item, workspaceMemoryPath);
        this.recordMemoryAuditEvent(store, 'memory.created', item, now, {
            source: item.source,
            hasEvidence: !!item.evidence,
            originMarkers: item.originMarkers
        }, workspaceMemoryPath);
        await this.writeStore(store);
        return item;
    }

    async proposeMemoryCandidate(request: MemoryCandidateProposalRequest): Promise<MemoryCandidateProposalResult> {
        const store = await this.readStore();
        const result = this.proposeMemoryCandidatesInStore(store, request, new Date().toISOString(), await this.resolveRepositoryIdentity(request.workspacePath));
        if (result.created > 0) {
            await this.writeStore(store);
        }
        return result;
    }

    async proposeMemoryConsolidation(request: MemoryConsolidationRequest): Promise<MemoryConsolidationResult> {
        const store = await this.readStore();
        const now = new Date().toISOString();
        const key = this.workspaceKey(request.workspacePath);
        const topic = request.topic.trim();
        if (!topic) {
            throw new Error('Memory consolidation requires a topic.');
        }
        const visible = store.memories
            .filter(memory => memory.status === 'active' && !memory.supersededBy)
            .filter(memory => !memory.workspacePath || this.workspaceKey(memory.workspacePath) === key)
            .filter(memory => this.memoryService.isRetrievable(memory))
            .filter(memory => request.memoryIds?.length ? request.memoryIds.includes(memory.id) : this.memoryMatchesTopic(memory, topic));
        const selected = visible.slice(0, Math.max(2, request.maxMemories ?? 8));
        const skippedSensitiveMemoryIds = selected
            .filter(memory => this.memoryHasSensitiveText(memory))
            .map(memory => memory.id);
        const related = selected.filter(memory => !skippedSensitiveMemoryIds.includes(memory.id));
        if (related.length < 2) {
            return {
                relatedMemoryIds: related.map(memory => memory.id),
                skippedSensitiveMemoryIds,
                created: false,
                deduplicated: false
            };
        }
        const relatedMemoryIds = related.map(memory => memory.id);
        const marker = `consolidation:${this.hash(`${key}:${topic}:${relatedMemoryIds.sort().join(':')}`)}`;
        const existing = store.memories.find(memory => memory.originMarkers?.includes(marker));
        if (existing) {
            return {
                candidate: existing,
                relatedMemoryIds,
                skippedSensitiveMemoryIds,
                created: false,
                deduplicated: true
            };
        }
        const candidate = this.assignDefaultMemorySpace(this.memoryService.normalize({
            id: this.id('mem_candidate'),
            workspacePath: request.workspacePath,
            scope: 'workspace',
            memoryType: this.consolidatedMemoryType(related),
            title: `Consolidated topic: ${topic}`,
            content: this.consolidatedMemoryContent(topic, related),
            status: 'candidate',
            staleStatus: 'unknown',
            importance: this.highestMemoryImportance(related),
            weight: Math.max(...related.map(memory => memory.weight), 0.6),
            source: 'memory-consolidation',
            evidence: `review-required topic consolidation for "${topic}" from memories: ${relatedMemoryIds.join(', ')}`,
            supersedes: relatedMemoryIds,
            originMarkers: [marker],
            createdAt: now,
            updatedAt: now,
            acceptedCount: 0,
            rejectedCount: 0
        }));
        this.upsertDefaultMemorySpace(store, candidate, now);
        store.memories.push(candidate);
        this.recordMemoryAuditEvent(store, 'memory.consolidated', candidate, now, {
            topic,
            source: candidate.source,
            supersedes: relatedMemoryIds,
            skippedSensitiveMemoryIds
        }, request.workspacePath);
        store.events.push({
            id: this.id('event'),
            workspacePath: request.workspacePath,
            eventType: 'memory.suggested',
            payload: JSON.stringify({
                memoryId: candidate.id,
                topic,
                source: candidate.source,
                status: candidate.status,
                supersedes: relatedMemoryIds,
                skippedSensitiveMemoryIds
            }),
            createdAt: now
        });
        await this.writeStore(store);
        return {
            candidate,
            relatedMemoryIds,
            skippedSensitiveMemoryIds,
            created: true,
            deduplicated: false
        };
    }

    async proposeSkillCandidate(request: MemorySkillCandidateProposalRequest): Promise<MemorySkillCandidate> {
        const store = await this.readStore();
        const key = this.workspaceKey(request.workspacePath);
        const now = new Date().toISOString();
        const existing = store.skillCandidates.find(candidate =>
            this.workspaceKey(candidate.workspacePath ?? '') === key && candidate.signature === request.signature
        );
        const candidate: MemorySkillCandidate = {
            id: existing?.id ?? this.id('skill_candidate'),
            workspacePath: request.workspacePath,
            signature: request.signature,
            title: request.title,
            description: request.description,
            generationSources: request.generationSources?.length ? request.generationSources : existing?.generationSources ?? this.skillSuggestionSourcesFromText(`${request.source ?? ''} ${request.evidence ?? ''}`),
            triggerCount: Math.max(existing?.triggerCount ?? 0, 1),
            rejectionCount: existing?.rejectionCount ?? 0,
            status: existing?.status === 'accepted' || existing?.status === 'blocked' ? existing.status : 'suggested',
            proposedSkillJson: request.proposedSkillJson ?? existing?.proposedSkillJson,
            statusReason: request.evidence ?? existing?.statusReason,
            lastTriggeredAt: now,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now
        };
        store.skillCandidates = [
            ...store.skillCandidates.filter(item => item.id !== candidate.id),
            candidate
        ];
        store.events.push({
            id: this.id('event'),
            workspacePath: request.workspacePath,
            eventType: 'skill.suggested',
            promptSignature: request.signature,
            payload: JSON.stringify({
                title: request.title,
                    description: request.description,
                    source: request.source ?? 'chat-learning',
                    generationSources: candidate.generationSources,
                    evidence: request.evidence
                }),
            createdAt: now
        });
        await this.writeStore(store);
        return candidate;
    }

    async updateMemory(request: MemoryUpdateMemoryRequest): Promise<MemoryItem | undefined> {
        const store = await this.readStore();
        const key = this.workspaceKey(request.workspacePath);
        const index = store.memories.findIndex(memory => memory.id === request.id && (!memory.workspacePath || this.workspaceKey(memory.workspacePath) === key));
        if (index === -1) {
            return undefined;
        }
        const previous = store.memories[index];
        const updated = this.memoryService.update(previous, request.patch);
        store.memories[index] = updated;
        const changedFields = this.changedMemoryFields(previous, updated, Object.keys(request.patch));
        this.recordMemoryAuditEvent(
            store,
            previous.status !== 'active' && updated.status === 'active' ? 'memory.approved' : 'memory.edited',
            updated,
            updated.updatedAt,
            {
                previousStatus: previous.status,
                nextStatus: updated.status,
                changedFields
            },
            request.workspacePath
        );
        if (updated.status === 'active' && previous.status !== 'active' && updated.supersedes?.length) {
            this.markSupersededMemoriesAfterReview(store, updated, request.workspacePath);
        }
        this.upsertMemoryVectorIfEnabled(store, updated, request.workspacePath);
        const feedback = this.feedbackRequestFromMemoryUpdate(request, store.memories[index]);
        if (feedback) {
            store.feedbackRecords.push(this.feedbackService.normalize(feedback, this.id('feedback'), updated.updatedAt));
        }
        await this.writeStore(store);
        return updated;
    }

    async updateMemoryAccess(request: MemoryUpdateMemoryAccessRequest): Promise<MemoryItem | undefined> {
        const store = await this.readStore();
        const key = this.workspaceKey(request.workspacePath);
        const index = store.memories.findIndex(memory => memory.id === request.id && (!memory.workspacePath || this.workspaceKey(memory.workspacePath) === key));
        if (index === -1) {
            return undefined;
        }
        const previous = store.memories[index];
        const updated = this.memoryService.recordAccess(previous);
        store.memories[index] = updated;
        this.recordMemoryAuditEvent(store, 'memory.accessed', updated, updated.updatedAt, {
            previousAccessCount: previous.accessCount,
            nextAccessCount: updated.accessCount,
            previousWeight: this.safeNumber(previous.weight),
            nextWeight: this.safeNumber(updated.weight)
        }, request.workspacePath);
        await this.writeStore(store);
        return updated;
    }

    async promoteMemoryToIde(request: MemoryPromoteMemoryToIdeRequest): Promise<MemoryItem | undefined> {
        const store = await this.readStore();
        const key = this.workspaceKey(request.workspacePath);
        const index = store.memories.findIndex(memory => memory.id === request.id && (!memory.workspacePath || this.workspaceKey(memory.workspacePath) === key));
        if (index === -1) {
            return undefined;
        }
        const previous = store.memories[index];
        const updatedAt = new Date().toISOString();
        const promoted = this.assignDefaultMemorySpace(this.memoryService.update(previous, {
            scope: 'global',
            memorySpaceId: undefined,
            workspacePath: undefined,
            repositoryUrl: undefined,
            repositoryId: undefined,
            sessionId: undefined,
            taskId: undefined,
            expiresAt: undefined,
            retentionPolicy: 'permanent'
        }, updatedAt));
        store.memories[index] = promoted;
        this.upsertDefaultMemorySpace(store, promoted, updatedAt);
        store.memoryVectors = store.memoryVectors.filter(vector => vector.memoryId !== promoted.id);
        this.recordMemoryAuditEvent(store, 'memory.promoted', promoted, updatedAt, {
            previousScope: previous.scope,
            previousWorkspacePath: previous.workspacePath,
            previousRepositoryUrl: previous.repositoryUrl,
            previousRepositoryId: previous.repositoryId,
            previousSessionId: previous.sessionId,
            previousTaskId: previous.taskId,
            reason: request.reason,
            changedFields: this.changedMemoryFields(previous, promoted, [
                'scope',
                'workspacePath',
                'repositoryUrl',
                'repositoryId',
                'sessionId',
                'taskId',
                'expiresAt',
                'retentionPolicy',
                'memorySpaceId'
            ])
        }, request.workspacePath);
        await this.writeStore(store);
        return promoted;
    }

    async demoteMemoryToWorkspace(request: MemoryDemoteMemoryToWorkspaceRequest): Promise<MemoryItem | undefined> {
        const store = await this.readStore();
        const index = store.memories.findIndex(memory => memory.id === request.id && memory.scope === 'global');
        if (index === -1) {
            return undefined;
        }
        const previous = store.memories[index];
        const updatedAt = new Date().toISOString();
        const demoted = this.assignDefaultMemorySpace(this.memoryService.update(previous, {
            scope: 'workspace',
            memorySpaceId: undefined,
            workspacePath: request.workspacePath,
            repositoryUrl: undefined,
            repositoryId: undefined,
            sessionId: undefined,
            taskId: undefined,
            expiresAt: undefined,
            retentionPolicy: 'manual'
        }, updatedAt));
        store.memories[index] = demoted;
        this.upsertDefaultMemorySpace(store, demoted, updatedAt);
        this.upsertMemoryVectorIfEnabled(store, demoted, request.workspacePath);
        this.recordMemoryAuditEvent(store, 'memory.demoted', demoted, updatedAt, {
            previousScope: previous.scope,
            previousWorkspacePath: previous.workspacePath,
            previousRepositoryUrl: previous.repositoryUrl,
            previousRepositoryId: previous.repositoryId,
            previousSessionId: previous.sessionId,
            previousTaskId: previous.taskId,
            reason: request.reason,
            changedFields: this.changedMemoryFields(previous, demoted, [
                'scope',
                'workspacePath',
                'repositoryUrl',
                'repositoryId',
                'sessionId',
                'taskId',
                'expiresAt',
                'retentionPolicy',
                'memorySpaceId'
            ])
        }, request.workspacePath);
        await this.writeStore(store);
        return demoted;
    }

    async runMemoryDecay(request: MemoryRunMemoryDecayRequest): Promise<MemoryRunMemoryDecayResult> {
        const store = await this.readStore();
        const key = this.workspaceKey(request.workspacePath);
        const ranAtDate = request.now ? new Date(request.now) : new Date();
        if (Number.isNaN(ranAtDate.getTime())) {
            throw new Error(`Invalid memory decay timestamp: ${request.now}`);
        }
        const ranAt = ranAtDate.toISOString();
        const visibleIndexes = store.memories
            .map((memory, index) => ({ memory, index }))
            .filter(item => !item.memory.workspacePath || this.workspaceKey(item.memory.workspacePath) === key)
            .filter(item => this.memoryService.isRetrievable(item.memory, ranAtDate));
        const pruningProposals = this.memoryService.proposePruning(visibleIndexes.map(item => item.memory), ranAtDate);
        const changes: MemoryRunMemoryDecayResult['changes'] = [];
        for (const item of visibleIndexes) {
            const before = this.memoryService.normalize(item.memory);
            const stalenessMarked = this.memoryService.markStaleness([before], ranAtDate)[0];
            const after = this.memoryDecayEligible(stalenessMarked, ranAtDate)
                ? this.memoryService.decay([stalenessMarked], ranAtDate)[0]
                : stalenessMarked;
            const changed = before.weight !== after.weight || before.staleStatus !== after.staleStatus;
            if (!changed) {
                continue;
            }
            changes.push({
                id: before.id,
                scope: before.scope,
                title: before.title,
                previousWeight: before.weight,
                nextWeight: after.weight,
                previousStaleStatus: before.staleStatus,
                nextStaleStatus: after.staleStatus,
                lastAccessedAt: before.lastAccessedAt,
                accessCount: before.accessCount
            });
            if (!request.dryRun) {
                store.memories[item.index] = {
                    ...after,
                    updatedAt: ranAt
                };
                this.recordMemoryAuditEvent(store, 'memory.decayed', store.memories[item.index], ranAt, {
                    previousWeight: before.weight,
                    nextWeight: after.weight,
                    previousStaleStatus: before.staleStatus,
                    nextStaleStatus: after.staleStatus
                }, request.workspacePath);
            }
        }
        if (!request.dryRun && changes.length > 0) {
            for (const proposal of pruningProposals) {
                const memory = store.memories.find(candidate => candidate.id === proposal.id);
                this.recordMemoryAuditEvent(store, 'memory.pruning_proposed', memory ?? {
                    id: proposal.id,
                    workspacePath: request.workspacePath,
                    scope: proposal.scope,
                    memoryType: 'manual_note',
                    status: 'candidate',
                    staleStatus: proposal.staleStatus,
                    importance: proposal.importance,
                    weight: proposal.weight,
                    accessCount: proposal.accessCount
                }, ranAt, {
                    action: proposal.action,
                    reasons: proposal.reasons,
                    reviewRequired: proposal.reviewRequired,
                    duplicateOf: proposal.duplicateOf
                }, request.workspacePath);
            }
            store.events.push({
                id: this.id('event'),
                workspacePath: request.workspacePath,
                eventType: 'memory.suggested',
                payload: JSON.stringify({
                    action: 'decay',
                    evaluated: visibleIndexes.length,
                    decayed: changes.length,
                    pruningProposals: pruningProposals.length,
                    ranAt
                }),
                createdAt: ranAt
            });
            await this.writeStore(store);
        }
        return {
            workspacePath: request.workspacePath,
            evaluated: visibleIndexes.length,
            decayed: changes.length,
            unchanged: visibleIndexes.length - changes.length,
            dryRun: request.dryRun === true,
            ranAt,
            pruningProposals,
            changes
        };
    }

    protected memoryDecayEligible(memory: MemoryItem, now: Date): boolean {
        if (memory.status !== 'active') {
            return false;
        }
        const reference = Date.parse(memory.lastAccessedAt || memory.updatedAt);
        if (Number.isNaN(reference)) {
            return true;
        }
        return (now.getTime() - reference) / 86_400_000 >= 30;
    }

    protected recordMemoryAuditEvent(
        store: MemoryStore,
        eventType: MemoryEvent['eventType'],
        memory: Pick<MemoryItem, 'id' | 'workspacePath' | 'scope' | 'memoryType' | 'status' | 'staleStatus' | 'importance' | 'weight' | 'accessCount' | 'supersededBy' | 'supersedes'>,
        createdAt: string,
        details: Record<string, unknown> = {},
        workspacePath?: string
    ): void {
        this.recordAuditEvent(store, workspacePath ?? memory.workspacePath ?? '', eventType, {
            memoryId: memory.id,
            scope: memory.scope,
            memoryType: memory.memoryType,
            status: memory.status,
            staleStatus: memory.staleStatus,
            importance: memory.importance,
            weight: this.safeNumber(memory.weight),
            accessCount: memory.accessCount,
            supersededBy: memory.supersededBy,
            supersedes: memory.supersedes,
            ...details
        }, createdAt);
    }

    protected recordAuditEvent(
        store: MemoryStore,
        workspacePath: string,
        eventType: MemoryEvent['eventType'],
        payload: Record<string, unknown>,
        createdAt = new Date().toISOString(),
        relativePath?: string,
        promptSignature?: string
    ): void {
        const redactedPayload = this.redactionService.redactJson(payload);
        store.events.push({
            id: this.id('event'),
            workspacePath,
            eventType,
            payload: JSON.stringify(redactedPayload),
            relativePath: this.redactionService.redactText(relativePath),
            promptSignature,
            createdAt
        });
    }

    protected redactTranscriptMetadata(metadata: MemoryStartTranscriptSessionRequest['metadata']): MemoryTranscriptSession['metadata'] | undefined {
        if (!metadata) {
            return undefined;
        }
        const redacted = this.redactionService.redactJson(metadata) as Record<string, unknown>;
        const result: MemoryTranscriptSession['metadata'] = {};
        for (const [key, value] of Object.entries(redacted)) {
            if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === undefined) {
                result[key] = value;
            }
        }
        return result;
    }

    protected transcriptRedactionSummary(findings: ReturnType<SecretScanner['scan']>['findings']): MemoryTranscriptMessage['redactionSummary'] {
        const severities: Record<string, number> = {};
        const kinds: Record<string, number> = {};
        for (const finding of findings) {
            severities[finding.severity] = (severities[finding.severity] ?? 0) + 1;
            kinds[finding.kind] = (kinds[finding.kind] ?? 0) + 1;
        }
        return {
            findingCount: findings.length,
            severities,
            kinds,
            fingerprints: findings.map(finding => finding.fingerprint)
        };
    }

    protected transcriptMatchesScope(
        message: MemoryTranscriptMessage,
        request: MemoryTranscriptSearchRequest,
        workspaceKey: string
    ): boolean {
        if (message.workspacePath && this.workspaceKey(message.workspacePath) !== workspaceKey) {
            return false;
        }
        if (!message.workspacePath && message.scope !== 'global') {
            return false;
        }
        if (request.scopes?.length && !request.scopes.includes(message.scope)) {
            return false;
        }
        if (request.transcriptSessionId && message.sessionId !== request.transcriptSessionId) {
            return false;
        }
        if (request.sessionId && message.sessionIdHint !== request.sessionId && message.sessionId !== request.sessionId) {
            return false;
        }
        if (request.taskId && message.taskId !== request.taskId) {
            return false;
        }
        if (request.roles?.length && !request.roles.includes(message.role)) {
            return false;
        }
        if (request.origins?.length && !request.origins.includes(message.origin)) {
            return false;
        }
        return true;
    }

    protected transcriptMatchesForgetRequest(
        message: MemoryTranscriptMessage,
        request: MemoryForgetTranscriptRequest,
        workspaceKey: string
    ): boolean {
        if (message.workspacePath && this.workspaceKey(message.workspacePath) !== workspaceKey) {
            return false;
        }
        if (!message.workspacePath && message.scope !== 'global') {
            return false;
        }
        if (request.scopes?.length && !request.scopes.includes(message.scope)) {
            return false;
        }
        if (request.transcriptSessionId && message.sessionId !== request.transcriptSessionId) {
            return false;
        }
        if (request.sessionId && message.sessionIdHint !== request.sessionId && message.sessionId !== request.sessionId) {
            return false;
        }
        if (request.taskId && message.taskId !== request.taskId) {
            return false;
        }
        if (request.retentionPolicy && message.retentionPolicy !== request.retentionPolicy) {
            return false;
        }
        return true;
    }

    protected transcriptSessionMatchesForgetRequest(
        session: MemoryTranscriptSession,
        request: MemoryForgetTranscriptRequest,
        workspaceKey: string
    ): boolean {
        if (session.workspacePath && this.workspaceKey(session.workspacePath) !== workspaceKey) {
            return false;
        }
        if (!session.workspacePath && session.scope !== 'global') {
            return false;
        }
        if (request.scopes?.length && !request.scopes.includes(session.scope)) {
            return false;
        }
        if (request.transcriptSessionId && session.id !== request.transcriptSessionId) {
            return false;
        }
        if (request.sessionId && session.id !== request.sessionId) {
            return false;
        }
        if (request.taskId) {
            return false;
        }
        if (request.retentionPolicy && session.retentionPolicy !== request.retentionPolicy) {
            return false;
        }
        return true;
    }

    protected transcriptSearchResult(
        message: MemoryTranscriptMessage,
        request: MemoryTranscriptSearchRequest,
        query: string,
        now: number
    ): MemoryTranscriptSearchResult | undefined {
        const redacted = this.scanner.scan({ content: message.redactedContent ?? message.content, sourceUri: message.workspacePath });
        const snippet = redacted.redactedContent.trim();
        if (!snippet) {
            return undefined;
        }
        const textScore = this.score([
            snippet,
            message.origin,
            message.role,
            message.scope,
            message.sessionId,
            message.sessionIdHint,
            message.taskId,
            message.metadata ? JSON.stringify(message.metadata) : undefined
        ].filter((value): value is string => typeof value === 'string').join('\n').toLowerCase(), query);
        const ageDays = Math.max(0, (now - Date.parse(message.createdAt)) / 86400000);
        const recencyScore = Math.max(0, 1 - Math.min(ageDays / 30, 1));
        const finalScore = query ? textScore + recencyScore * 0.15 : recencyScore;
        const redactionStatus = redacted.findings.length ? 'blocked' : message.redactionStatus;
        return {
            id: message.id,
            transcriptSessionId: message.sessionId,
            workspacePath: message.workspacePath,
            scope: message.scope,
            origin: message.origin,
            role: message.role,
            snippet,
            score: finalScore,
            estimatedTokens: this.tokenBudgetService.estimateTokens(snippet),
            createdAt: message.createdAt,
            updatedAt: message.updatedAt,
            redactionStatus,
            redactionSummary: redacted.findings.length ? this.transcriptRedactionSummary(redacted.findings) : message.redactionSummary,
            explanation: {
                source: 'pi_transcript_messages',
                scope: message.scope,
                evidence: `pi_transcript_messages:${message.sessionId}:${message.role}:${message.createdAt}`,
                matchedQuery: !query || textScore > 0,
                tokenBudgetApplied: false,
                redaction: redactionStatus,
                filters: {
                    workspacePath: request.workspacePath,
                    scopes: request.scopes,
                    transcriptSessionId: request.transcriptSessionId,
                    sessionId: request.sessionId,
                    taskId: request.taskId,
                    roles: request.roles,
                    origins: request.origins
                },
                ranking: {
                    textScore,
                    recencyScore,
                    finalScore
                }
            }
        };
    }

    protected transcriptSessionHasRedaction(
        session: MemoryTranscriptSession,
        request: MemoryStartTranscriptSessionRequest
    ): boolean {
        return session.origin !== (request.origin ?? 'mcp')
            || session.source !== request.source
            || session.title !== request.title
            || JSON.stringify(session.metadata ?? {}) !== JSON.stringify(request.metadata ?? {});
    }

    protected changedMemoryFields(previous: MemoryItem, updated: MemoryItem, requestedFields: string[]): string[] {
        return requestedFields.filter(field => {
            const key = field as keyof MemoryItem;
            return JSON.stringify(previous[key]) !== JSON.stringify(updated[key]);
        });
    }

    protected safeNumber(value: number): number {
        return Number(value.toFixed(6));
    }

    async forgetMemory(request: MemoryForgetMemoryRequest): Promise<boolean> {
        const store = await this.readStore();
        const key = this.workspaceKey(request.workspacePath);
        const memory = store.memories.find(item => item.id === request.id && (!item.workspacePath || this.workspaceKey(item.workspacePath) === key));
        if (!memory) {
            return false;
        }
        store.memories = store.memories.filter(item => item.id !== request.id);
        store.memoryVectors = store.memoryVectors.filter(vector => vector.memoryId !== request.id);
        for (const graph of store.knowledgeGraphs.filter(candidate => this.knowledgeGraphInWorkspace(candidate, request.workspacePath))) {
            const removedConceptIds = new Set(
                graph.concepts
                    .filter(concept => concept.sourceKind === 'project-memory' && concept.sourceId === request.id)
                    .map(concept => concept.id)
            );
            if (removedConceptIds.size) {
                graph.concepts = graph.concepts.filter(concept => !removedConceptIds.has(concept.id));
                graph.links = graph.links.filter(link => !removedConceptIds.has(link.sourceConceptId) && !removedConceptIds.has(link.targetConceptId));
                graph.updatedAt = new Date().toISOString();
            }
        }
        store.events.push({
            id: this.id('event'),
            workspacePath: request.workspacePath,
            eventType: 'memory.suggested',
            payload: JSON.stringify({
                action: 'forgotten',
                id: request.id,
                title: memory.title,
                scope: memory.scope,
                status: memory.status
            }),
            createdAt: new Date().toISOString()
        });
        this.recordMemoryAuditEvent(store, 'memory.deleted', memory, new Date().toISOString(), {
            removedVectors: true,
            removedDerivedKnowledgeLinks: true
        }, request.workspacePath);
        await this.writeStore(store);
        return true;
    }

    async forgetWorkspaceLearningData(request: MemoryForgetWorkspaceLearningRequest): Promise<MemoryForgetWorkspaceLearningResult> {
        const store = await this.readStore();
        const key = this.workspaceKey(request.workspacePath);
        const promptEvents = store.events.filter(event => this.workspaceKey(event.workspacePath) === key && event.eventType.startsWith('prompt.'));
        const promptEventIds = new Set(promptEvents.map(event => event.id));
        const promptSignatures = new Set(promptEvents.map(event => event.promptSignature).filter((value): value is string => !!value));
        const memoriesToDelete = store.memories.filter(memory => this.workspaceKey(memory.workspacePath ?? '') === key && this.isPromptDerivedMemory(memory, promptEventIds, promptSignatures));
        const memoryIds = new Set(memoriesToDelete.map(memory => memory.id));
        const memoryVectorsDeleted = store.memoryVectors.filter(vector => memoryIds.has(vector.memoryId)).length;
        const knowledgeRemoval = this.removeMemoryKnowledgeArtifacts(store, request.workspacePath, memoryIds);

        store.events = store.events.filter(event => !(this.workspaceKey(event.workspacePath) === key && event.eventType.startsWith('prompt.')));
        store.memories = store.memories.filter(memory => !memoryIds.has(memory.id));
        store.memoryVectors = store.memoryVectors.filter(vector => !memoryIds.has(vector.memoryId));
        const result: MemoryForgetWorkspaceLearningResult = {
            workspacePath: request.workspacePath,
            promptEventsDeleted: promptEvents.length,
            derivedMemoriesDeleted: memoryIds.size,
            memoryVectorsDeleted,
            knowledgeConceptsDeleted: knowledgeRemoval.concepts,
            knowledgeLinksDeleted: knowledgeRemoval.links
        };
        store.events.push({
            id: this.id('event'),
            workspacePath: request.workspacePath,
            eventType: 'memory.deleted',
            payload: JSON.stringify({
                action: 'workspace-learning-forgotten',
                promptEventsDeleted: result.promptEventsDeleted,
                derivedMemoriesDeleted: result.derivedMemoriesDeleted,
                memoryVectorsDeleted: result.memoryVectorsDeleted,
                knowledgeConceptsDeleted: result.knowledgeConceptsDeleted,
                knowledgeLinksDeleted: result.knowledgeLinksDeleted
            }),
            createdAt: new Date().toISOString()
        });
        await this.writeStore(store);
        return result;
    }

    protected isPromptDerivedMemory(memory: MemoryItem, promptEventIds: Set<string>, promptSignatures: Set<string>): boolean {
        const source = memory.source ?? '';
        if (source === 'event:prompt.submitted' || source === 'event:prompt.normalized' || source.startsWith('prompt:')) {
            return true;
        }
        for (const marker of memory.originMarkers ?? []) {
            if (promptEventIds.has(marker) || promptSignatures.has(marker) || marker.startsWith('event:prompt.')) {
                return true;
            }
        }
        if (memory.evidence) {
            try {
                const evidence = JSON.parse(memory.evidence) as Record<string, unknown>;
                const eventId = typeof evidence.eventId === 'string' ? evidence.eventId : undefined;
                const promptSignature = typeof evidence.promptSignature === 'string' ? evidence.promptSignature : undefined;
                return (!!eventId && promptEventIds.has(eventId)) || (!!promptSignature && promptSignatures.has(promptSignature));
            } catch {
                return promptEventIds.has(memory.evidence) || promptSignatures.has(memory.evidence);
            }
        }
        return false;
    }

    protected removeMemoryKnowledgeArtifacts(store: MemoryStore, workspacePath: string, memoryIds: Set<string>): { concepts: number; links: number } {
        let concepts = 0;
        let links = 0;
        if (!memoryIds.size) {
            return { concepts, links };
        }
        for (const graph of store.knowledgeGraphs.filter(candidate => this.knowledgeGraphInWorkspace(candidate, workspacePath))) {
            const removedConceptIds = new Set(
                graph.concepts
                    .filter(concept => concept.sourceKind === 'project-memory' && concept.sourceId && memoryIds.has(concept.sourceId))
                    .map(concept => concept.id)
            );
            if (!removedConceptIds.size) {
                continue;
            }
            const beforeLinks = graph.links.length;
            graph.concepts = graph.concepts.filter(concept => !removedConceptIds.has(concept.id));
            graph.links = graph.links.filter(link => !removedConceptIds.has(link.sourceConceptId) && !removedConceptIds.has(link.targetConceptId));
            concepts += removedConceptIds.size;
            links += beforeLinks - graph.links.length;
            graph.updatedAt = new Date().toISOString();
        }
        return { concepts, links };
    }

    async updateSkillCandidateStatus(id: string, status: MemorySkillCandidate['status']): Promise<MemorySkillCandidate | undefined> {
        const store = await this.readStore();
        const candidate = store.skillCandidates.find(item => item.id === id);
        if (!candidate) {
            return undefined;
        }
        if (candidate.status === 'blocked' && status === 'tracking') {
            candidate.rejectionCount = 0;
            candidate.rejectionReasons = [];
            candidate.statusReason = 'Block undone by the user.';
        }
        candidate.status = status;
        candidate.updatedAt = new Date().toISOString();
        await this.writeStore(store);
        return candidate;
    }

    async decideSkillCandidate(request: MemorySkillDecisionRequest): Promise<MemorySkillCandidate | undefined> {
        const store = await this.readStore();
        const key = this.workspaceKey(request.workspacePath);
        const candidate = store.skillCandidates.find(item => item.id === request.id && (!item.workspacePath || this.workspaceKey(item.workspacePath) === key));
        if (!candidate) {
            return undefined;
        }
        const now = new Date().toISOString();
        const previousStatus = candidate.status;
        if (request.status === 'rejected') {
            candidate.rejectionCount = (candidate.rejectionCount ?? 0) + 1;
            candidate.rejectionReasons = [...(candidate.rejectionReasons ?? []), this.skillDecisionReason('rejected')].slice(-10);
        }
        if (previousStatus === 'blocked' && request.status === 'tracking') {
            candidate.rejectionCount = 0;
            candidate.rejectionReasons = [];
            candidate.status = 'tracking';
            candidate.statusReason = request.reason ?? 'Block undone by the user.';
        }
        else if (request.status === 'rejected' && (candidate.rejectionCount ?? 0) >= 3) {
            candidate.status = 'blocked';
            candidate.statusReason = 'Rejected signal reached threshold 3; candidate silenced for this pattern.';
        } else {
            candidate.status = request.status;
            candidate.statusReason = request.status === 'rejected' ? this.skillDecisionReason('rejected') : request.reason ?? this.skillDecisionReason(request.status);
        }
        candidate.updatedAt = now;
        if (request.status === 'rejected') {
            store.feedbackRecords.push(this.feedbackService.normalize({
                workspacePath: request.workspacePath,
                promptSignature: candidate.signature,
                targetKind: 'skill',
                targetId: candidate.id,
                targetSourceKind: 'skill',
                feedback: 'rejected',
                reason: 'skill_suggestion_rejected_or_ignored',
                metadata: {
                    previousStatus,
                    nextStatus: candidate.status,
                    rejectionCount: candidate.rejectionCount ?? 0,
                    silenced: candidate.status === 'blocked'
                }
            }, this.id('feedback'), now));
        }
        store.events.push({
            id: this.id('event'),
            workspacePath: request.workspacePath,
            eventType: request.status === 'accepted' ? 'skill.accepted' : request.status === 'tracking' && previousStatus === 'blocked' ? 'skill.unblocked' : 'skill.rejected',
            payload: JSON.stringify({
                id: candidate.id,
                status: request.status,
                previousStatus,
                nextStatus: candidate.status,
                rejectionCount: candidate.rejectionCount ?? 0,
                silenced: candidate.status === 'blocked',
                hasReason: !!request.reason
            }),
            promptSignature: candidate.signature,
            createdAt: candidate.updatedAt
        });
        await this.writeStore(store);
        return candidate;
    }

    async exportWorkspaceData(request: string | { workspacePath: string; includeGlobalMemories?: boolean; includeEphemeralMemories?: boolean }): Promise<MemoryExportBundle> {
        const store = await this.readStore();
        const workspacePath = typeof request === 'string' ? request : request.workspacePath;
        const key = this.workspaceKey(workspacePath);
        const settings = this.normalizeSettings(workspacePath, store.settings[key]);
        const includeGlobalMemories = typeof request === 'string'
            ? settings.exportOptions?.includeGlobalMemories === true
            : request.includeGlobalMemories ?? settings.exportOptions?.includeGlobalMemories === true;
        const includeEphemeralMemories = typeof request === 'string' ? false : request.includeEphemeralMemories === true;
        const repositoryLocators = this.repositoryExportLocators(
            store.memories,
            key,
            store.memories.some(memory => memory.scope === 'repository')
                ? await this.repositoryIdentityForMemory({ scope: 'repository' }, workspacePath)
                : {}
        );
        const memoryBelongsInExport = (memory: { scope?: string; workspacePath?: string; repositoryUrl?: string; repositoryId?: string; sessionId?: string; taskId?: string }): boolean =>
            this.memoryScopeBelongsInWorkspaceExport(memory, {
                workspacePath,
                workspaceKey: key,
                includeGlobalMemories,
                includeEphemeralMemories,
                repositoryLocators
            });
        const exportedMemories = store.memories
            .filter(memory => memoryBelongsInExport(memory))
            .filter(memory => this.memoryService.isRetrievable(memory))
            .map(memory => this.normalizeExportedMemory(memory));
        const exportedMemoryIds = new Set(exportedMemories.map(memory => memory.id));
        const excludedMemoryIds = new Set(store.memories
            .filter(memory => !exportedMemoryIds.has(memory.id))
            .map(memory => memory.id));
        const bundle: MemoryExportBundle = {
            version: 2,
            exportedAt: new Date().toISOString(),
            workspacePath,
            settings,
            files: store.files[key] ?? [],
            symbols: store.symbols[key] ?? [],
            relations: store.relations[key] ?? [],
            codeChunks: store.codeChunks[key] ?? [],
            graphSnapshots: store.graphSnapshots.filter(snapshot => this.workspaceKey(snapshot.workspacePath) === key),
            changeImpacts: store.changeImpacts.filter(impact => this.workspaceKey(impact.workspacePath) === key),
            contextSuggestions: store.contextSuggestions.filter(suggestion => this.workspaceKey(suggestion.workspacePath) === key),
            memories: exportedMemories,
            memorySpaces: store.memorySpaces
                .filter(space => memoryBelongsInExport(space))
                .map(space => this.normalizeExportedMemorySpace(space)),
            memoryVectors: store.memoryVectors
                .filter(vector => exportedMemoryIds.has(vector.memoryId))
                .filter(vector => memoryBelongsInExport(vector))
                .filter(vector => this.memoryVectorIsRetrievable(vector))
                .map(vector => this.normalizeExportedMemoryVector(vector)),
            knowledgeGraphs: store.knowledgeGraphs
                .filter(graph => this.knowledgeGraphBelongsInWorkspaceExport(graph, workspacePath, includeGlobalMemories))
                .map(graph => this.normalizeExportedKnowledgeGraph(graph)),
            skillCandidates: store.skillCandidates.filter(candidate => !candidate.workspacePath || this.workspaceKey(candidate.workspacePath) === key),
            events: store.events
                .filter(event => this.workspaceKey(event.workspacePath) === key)
                .filter(event => this.eventBelongsInWorkspaceExport(event, excludedMemoryIds)),
            feedbackRecords: store.feedbackRecords.filter(record => this.workspaceKey(record.workspacePath) === key)
        };
        bundle.artifacts = [
            this.buildPortableMetadataArtifact(bundle, { includeGlobalMemories, includeEphemeralMemories }),
            this.buildPortableMemoriesArtifact(bundle),
            this.buildPortableContextPackArtifact(bundle),
            this.buildPortableReportArtifact(bundle),
            this.buildPortableGraphArtifact(bundle),
            this.buildProjectReportArtifact(bundle),
            this.buildStandaloneProjectGraphArtifact(bundle),
            this.buildGraphifyCompatibleGraphArtifact(bundle),
            this.buildStandaloneProjectGraphGraphmlArtifact(bundle),
            this.buildStandaloneProjectGraphHtmlArtifact(bundle),
            this.buildStandaloneProjectCallflowSvgArtifact(bundle)
        ];
        this.recordAuditEvent(store, workspacePath, 'export.created', {
            format: 'workspace-bundle',
            version: bundle.version,
            artifacts: bundle.artifacts.map(artifact => artifact.path),
            includeGlobalMemories,
            includeEphemeralMemories,
            fileCount: bundle.files.length,
            memoryCount: bundle.memories.length,
            memoryVectorCount: bundle.memoryVectors?.length ?? 0,
            knowledgeGraphCount: bundle.knowledgeGraphs.length,
            feedbackRecordCount: bundle.feedbackRecords.length
        }, bundle.exportedAt);
        await this.writeStore(store);
        return this.redactionService.redactJson(bundle);
    }

    async installPortableMemory(request: MemoryPortableInstallRequest): Promise<MemoryPortableInstallResult> {
        if (request.confirmed !== true) {
            throw new Error('Explicit user confirmation is required before installing portable Memory artifacts into the workspace.');
        }
        const workspacePath = path.resolve(request.workspacePath);
        const installPath = path.join(workspacePath, '.cybervinci', 'memory');
        const bundle = await this.exportWorkspaceData({
            workspacePath,
            includeGlobalMemories: request.includeGlobalMemories,
            includeEphemeralMemories: request.includeEphemeralMemories
        });
        const artifacts = bundle.artifacts ?? [];
        await fs.mkdir(installPath, { recursive: true });
        await fs.rm(path.join(installPath, this.portableIgnoreMarker), { force: true });
        const writtenFiles: string[] = [];
        await this.writePortableInstallFile(installPath, 'cybervinci-memory-bundle.json', `${JSON.stringify(bundle, undefined, 2)}\n`);
        writtenFiles.push('cybervinci-memory-bundle.json');
        for (const artifact of artifacts) {
            await this.writePortableInstallFile(installPath, artifact.path, artifact.content);
            writtenFiles.push(artifact.path);
        }
        const store = await this.readStore();
        const now = new Date().toISOString();
        this.recordAuditEvent(store, workspacePath, 'export.installed', {
            target: '.cybervinci/memory',
            fileCount: writtenFiles.length,
            artifactCount: artifacts.length,
            files: writtenFiles
        }, now);
        await this.writeStore(store);
        return {
            workspacePath,
            installPath,
            artifactCount: artifacts.length,
            files: writtenFiles
        };
    }

    async managePortableMemory(request: MemoryPortablePackageActionRequest): Promise<MemoryPortablePackageActionResult> {
        if (request.confirmed !== true) {
            throw new Error('Explicit user confirmation is required before changing portable Memory artifacts in the workspace.');
        }
        const workspacePath = path.resolve(request.workspacePath);
        const installPath = path.join(workspacePath, '.cybervinci', 'memory');
        if (request.action === 'regenerate') {
            const result = await this.installPortableMemory({
                workspacePath,
                includeGlobalMemories: request.includeGlobalMemories,
                includeEphemeralMemories: request.includeEphemeralMemories,
                confirmed: true
            });
            return {
                workspacePath,
                installPath,
                action: request.action,
                ignored: false,
                removed: false,
                regenerated: true,
                files: result.files
            };
        }
        if (request.action === 'ignore') {
            await fs.mkdir(installPath, { recursive: true });
            await this.writePortableInstallFile(installPath, this.portableIgnoreMarker, `${new Date().toISOString()}\n`);
            await this.recordPortableMaintenanceEvent(workspacePath, request.action, {
                target: '.cybervinci/memory',
                ignored: true
            });
            return {
                workspacePath,
                installPath,
                action: request.action,
                ignored: true,
                removed: false,
                regenerated: false,
                files: [this.portableIgnoreMarker]
            };
        }
        if (request.action === 'remove-local-reference') {
            await this.removePortableInstallDirectory(workspacePath, installPath);
            await this.recordPortableMaintenanceEvent(workspacePath, request.action, {
                target: '.cybervinci/memory',
                removed: true
            });
            return {
                workspacePath,
                installPath,
                action: request.action,
                ignored: false,
                removed: true,
                regenerated: false,
                files: []
            };
        }
        throw new Error(`Unsupported portable Memory action: ${request.action}`);
    }

    protected async removePortableInstallDirectory(workspacePath: string, installPath: string): Promise<void> {
        const workspaceRoot = path.resolve(workspacePath);
        const target = path.resolve(installPath);
        const expected = path.join(workspaceRoot, '.cybervinci', 'memory');
        if (target !== expected || (target !== workspaceRoot && !target.startsWith(`${workspaceRoot}${path.sep}`))) {
            throw new Error(`Refusing to remove portable Memory path outside the workspace: ${installPath}`);
        }
        await fs.rm(target, { recursive: true, force: true });
    }

    protected async recordPortableMaintenanceEvent(workspacePath: string, action: string, payload: Record<string, unknown>): Promise<void> {
        const store = await this.readStore();
        this.recordAuditEvent(store, workspacePath, 'export.portable-maintenance', {
            action,
            ...payload
        }, new Date().toISOString());
        await this.writeStore(store);
    }

    protected async writePortableInstallFile(installPath: string, relativePath: string, content: string): Promise<void> {
        const normalized = relativePath.replace(/\\/g, '/');
        if (!normalized || normalized.startsWith('/') || normalized.includes('..') || path.isAbsolute(normalized)) {
            throw new Error(`Invalid portable artifact path: ${relativePath}`);
        }
        const targetPath = path.resolve(installPath, normalized);
        const root = path.resolve(installPath);
        if (targetPath !== root && !targetPath.startsWith(`${root}${path.sep}`)) {
            throw new Error(`Portable artifact path escapes install directory: ${relativePath}`);
        }
        await fs.mkdir(path.dirname(targetPath), { recursive: true });
        await fs.writeFile(targetPath, content, 'utf8');
    }

    protected eventBelongsInWorkspaceExport(event: MemoryEvent, excludedMemoryIds: Set<string>): boolean {
        if (!excludedMemoryIds.size) {
            return true;
        }
        const payload = event.payload ?? '';
        for (const memoryId of excludedMemoryIds) {
            if (payload.includes(memoryId)) {
                return false;
            }
        }
        return true;
    }

    protected buildProjectReportArtifact(bundle: MemoryExportBundle): MemoryPortableArtifact {
        return {
            path: 'cybervinci-project-report.md',
            mediaType: 'text/markdown',
            content: this.redactionService.redactText(this.buildProjectReportMarkdown(bundle)) ?? ''
        };
    }

    protected buildStandaloneProjectGraphArtifact(bundle: MemoryExportBundle): MemoryPortableArtifact {
        const graph = this.buildStandaloneProjectGraph(bundle);
        const safeGraph = this.redactionService.redactJson(graph);
        return {
            path: 'cybervinci-project-graph.json',
            mediaType: 'application/json',
            content: `${JSON.stringify(safeGraph, undefined, 2)}\n`
        };
    }

    protected buildStandaloneProjectGraphGraphmlArtifact(bundle: MemoryExportBundle): MemoryPortableArtifact {
        const graph = this.redactionService.redactJson(this.buildStandaloneProjectGraph(bundle));
        return {
            path: 'cybervinci-project-graph.graphml',
            mediaType: 'application/graphml+xml',
            content: this.buildStandaloneProjectGraphGraphml(graph)
        };
    }

    protected buildGraphifyCompatibleGraphArtifact(bundle: MemoryExportBundle): MemoryPortableArtifact {
        const graph = this.omitStandaloneProjectGraphEvidence(this.redactionService.redactJson(this.buildStandaloneProjectGraph(bundle)));
        return {
            path: 'graphify-out/graph.json',
            mediaType: 'application/json',
            content: `${JSON.stringify(this.buildGraphifyCompatibleGraph(graph), undefined, 2)}\n`
        };
    }

    protected buildStandaloneProjectGraphHtmlArtifact(bundle: MemoryExportBundle): MemoryPortableArtifact {
        const graph = this.omitStandaloneProjectGraphEvidence(this.redactionService.redactJson(this.buildStandaloneProjectGraph(bundle)));
        return {
            path: 'cybervinci-project-graph.html',
            mediaType: 'text/html',
            content: this.buildStandaloneProjectGraphHtml(graph)
        };
    }

    protected buildStandaloneProjectCallflowSvgArtifact(bundle: MemoryExportBundle): MemoryPortableArtifact {
        const graph = this.omitStandaloneProjectGraphEvidence(this.redactionService.redactJson(this.buildStandaloneProjectGraph(bundle)));
        return {
            path: 'cybervinci-project-callflow.svg',
            mediaType: 'image/svg+xml',
            content: this.buildStandaloneProjectCallflowSvg(graph)
        };
    }

    protected buildPortableMetadataArtifact(
        bundle: MemoryExportBundle,
        options: { includeGlobalMemories: boolean; includeEphemeralMemories: boolean }
    ): MemoryPortableArtifact {
        const scopes = this.portableMemoryScopeCounts(bundle.memories);
        const metadata = {
            version: bundle.version,
            exportedAt: bundle.exportedAt,
            scope: {
                workspacePath: bundle.workspacePath,
                memoryScopes: scopes,
                includeGlobalMemories: options.includeGlobalMemories,
                includeEphemeralMemories: options.includeEphemeralMemories
            },
            policies: {
                localFirst: true,
                optInPortableInstall: true,
                globalMemoriesExcludedByDefault: true,
                ephemeralMemoriesExcludedByDefault: true,
                expiredEphemeralMemoriesExcluded: true,
                importedMemoriesRequireHumanReview: true,
                secretsRedacted: true,
                rawSourceContentExcludedFromGraphArtifacts: true
            },
            origin: {
                producer: 'cybervinci-memory',
                source: 'workspace-export',
                artifactPaths: [
                    'graph.json',
                    'graphify-out/graph.json',
                    'report.md',
                    'context-pack.md',
                    'memories.json',
                    'metadata.json'
                ]
            },
            counts: {
                files: bundle.files.length,
                symbols: bundle.symbols.length,
                relations: bundle.relations.length,
                codeChunks: bundle.codeChunks.length,
                graphSnapshots: bundle.graphSnapshots.length,
                changeImpacts: bundle.changeImpacts.length,
                contextSuggestions: bundle.contextSuggestions.length,
                memories: bundle.memories.length,
                memorySpaces: bundle.memorySpaces?.length ?? 0,
                memoryVectors: bundle.memoryVectors?.length ?? 0,
                knowledgeGraphs: bundle.knowledgeGraphs.length,
                skillCandidates: bundle.skillCandidates.length,
                events: bundle.events.length,
                feedbackRecords: bundle.feedbackRecords.length
            }
        };
        return {
            path: 'metadata.json',
            mediaType: 'application/json',
            content: `${JSON.stringify(this.redactionService.redactJson(metadata), undefined, 2)}\n`
        };
    }

    protected buildPortableMemoriesArtifact(bundle: MemoryExportBundle): MemoryPortableArtifact {
        const payload = {
            version: bundle.version,
            exportedAt: bundle.exportedAt,
            workspacePath: bundle.workspacePath,
            origin: 'cybervinci-memory',
            policies: {
                importedMemoriesRequireHumanReview: true,
                globalMemoriesExcludedUnlessRequested: true,
                expiredEphemeralMemoriesExcluded: true,
                secretsRedacted: true
            },
            memorySpaces: bundle.memorySpaces ?? [],
            memories: bundle.memories
        };
        return {
            path: 'memories.json',
            mediaType: 'application/json',
            content: `${JSON.stringify(this.redactionService.redactJson(payload), undefined, 2)}\n`
        };
    }

    protected buildPortableContextPackArtifact(bundle: MemoryExportBundle): MemoryPortableArtifact {
        const suggestions = bundle.contextSuggestions
            .filter(suggestion => suggestion.accepted !== false)
            .sort((left, right) => right.score - left.score)
            .slice(0, 25);
        const importantMemories = [...bundle.memories]
            .sort((left, right) =>
                (right.weight ?? 0) - (left.weight ?? 0) ||
                this.memoryImportanceRank(right.importance) - this.memoryImportanceRank(left.importance)
            )
            .slice(0, 20);
        const lines = [
            '# CyberVinci Portable Context Pack',
            '',
            `Version: ${bundle.version}`,
            `Exported at: ${bundle.exportedAt}`,
            `Workspace: ${bundle.workspacePath}`,
            'Origin: cybervinci-memory',
            '',
            '## Policies',
            '',
            '- Local-first export generated from already-exportable metadata.',
            '- Context is reviewable and must be explicitly approved before use with an LLM.',
            '- Secrets and sensitive values are redacted before serialization.',
            '- Expired session/task memories are excluded.',
            '',
            '## Suggested Context',
            '',
            ...(suggestions.length ? suggestions.map(suggestion => [
                `- ${suggestion.sourceKind}: ${suggestion.title}`,
                `  Score: ${suggestion.score}`,
                `  Reason: ${suggestion.reason ?? 'No ranking reason recorded.'}`,
                suggestion.rankingSignals?.scope ? `  Scope: ${suggestion.rankingSignals.scope}` : undefined,
                suggestion.rankingSignals?.staleStatus ? `  Stale: ${suggestion.rankingSignals.staleStatus}` : undefined,
                suggestion.rankingSignals?.importance !== undefined ? `  Importance: ${suggestion.rankingSignals.importance}` : undefined
            ].filter(Boolean).join('\n')) : ['- No reviewable context suggestions were exported.']),
            '',
            '## Memory Signals',
            '',
            ...(importantMemories.length ? importantMemories.map(memory => [
                `- ${memory.scope ?? 'workspace'}: ${memory.title}`,
                `  Status: ${memory.status ?? 'active'}`,
                memory.source ? `  Source: ${memory.source}` : undefined,
                memory.evidence ? `  Evidence: ${memory.evidence}` : undefined,
                memory.staleStatus ? `  Stale: ${memory.staleStatus}` : undefined,
                memory.importance !== undefined ? `  Importance: ${memory.importance}` : undefined,
                memory.weight !== undefined ? `  Weight: ${memory.weight}` : undefined
            ].filter(Boolean).join('\n')) : ['- No memories were exported for context review.'])
        ];
        return {
            path: 'context-pack.md',
            mediaType: 'text/markdown',
            content: this.redactionService.redactText(lines.join('\n')) ?? ''
        };
    }

    protected memoryImportanceRank(importance: MemoryItem['importance'] | undefined): number {
        switch (importance) {
            case 'critical': return 4;
            case 'high': return 3;
            case 'medium': return 2;
            case 'low': return 1;
            default: return 0;
        }
    }

    protected buildPortableReportArtifact(bundle: MemoryExportBundle): MemoryPortableArtifact {
        return {
            path: 'report.md',
            mediaType: 'text/markdown',
            content: this.redactionService.redactText(this.buildProjectReportMarkdown(bundle)) ?? ''
        };
    }

    protected buildPortableGraphArtifact(bundle: MemoryExportBundle): MemoryPortableArtifact {
        const graph = this.redactionService.redactJson(this.buildStandaloneProjectGraph(bundle));
        return {
            path: 'graph.json',
            mediaType: 'application/json',
            content: `${JSON.stringify(graph, undefined, 2)}\n`
        };
    }

    protected buildGraphifyCompatibleGraph(graph: MemoryStandaloneProjectGraph): Record<string, unknown> {
        const nodes = [
            ...graph.files.map(file => ({
                id: `file:${file.id}`,
                label: file.relativePath,
                type: 'file',
                path: file.relativePath,
                contentHash: file.contentHash,
                language: file.languageId,
                markers: file.classificationMarkers,
                originMarkers: file.originMarkers,
                sensitive: file.classificationMarkers.includes('sensitive-metadata-only'),
                generated: file.classificationMarkers.includes('generated'),
                ignored: file.classificationMarkers.includes('ignored')
            })),
            ...graph.symbols.map(symbol => ({
                id: `symbol:${symbol.id}`,
                label: symbol.fullName ?? symbol.name,
                type: symbol.symbolKind,
                kind: 'symbol',
                fileId: `file:${symbol.fileId}`,
                language: symbol.languageId,
                startLine: symbol.startLine,
                endLine: symbol.endLine,
                markers: symbol.classificationMarkers,
                originMarkers: symbol.originMarkers
            })),
            ...graph.concepts.map(concept => ({
                id: `concept:${concept.id}`,
                label: concept.title,
                type: concept.kind,
                kind: 'concept',
                description: concept.summary,
                status: concept.status,
                confidence: concept.confidenceScore,
                weight: concept.weight,
                tags: concept.tags,
                markers: concept.classificationMarkers,
                originMarkers: concept.originMarkers,
                sourceKind: concept.sourceKind,
                sourceId: concept.sourceId
            }))
        ];
        const nodeIds = new Set(nodes.map(node => node.id));
        const edges = [
            ...graph.symbols.map(symbol => ({
                source: `file:${symbol.fileId}`,
                target: `symbol:${symbol.id}`,
                type: 'declares',
                relation: 'declares',
                confidence: 1,
                originMarkers: ['source:language-analyzer']
            })),
            ...graph.relations.map(relation => ({
                id: `relation:${relation.id}`,
                source: `${relation.sourceKind}:${relation.sourceId}`,
                target: `${relation.targetKind}:${relation.targetId}`,
                type: relation.relationType,
                relation: relation.relationType,
                confidence: relation.confidenceScore,
                confidenceLevel: relation.confidenceLevel,
                markers: relation.classificationMarkers,
                originMarkers: relation.originMarkers,
                hasEvidence: relation.classificationMarkers.includes('has-evidence')
            })),
            ...graph.concepts
                .filter(concept => concept.sourceId)
                .map(concept => ({
                    source: `concept:${concept.id}`,
                    target: concept.sourceKind === 'project-memory' ? `concept:${concept.sourceId}` : `symbol:${concept.sourceId}`,
                    type: 'derived_from',
                    relation: 'derived_from',
                    confidence: concept.confidenceScore ?? concept.weight ?? 0.5,
                    originMarkers: concept.originMarkers
                })),
            ...graph.links.map(link => ({
                id: `knowledge-link:${link.id}`,
                source: `concept:${link.sourceConceptId}`,
                target: `concept:${link.targetConceptId}`,
                type: link.linkKind,
                relation: link.linkKind,
                label: link.label,
                confidence: link.confidenceScore,
                markers: link.classificationMarkers,
                originMarkers: link.originMarkers,
                hasEvidence: link.classificationMarkers.includes('has-evidence')
            }))
        ].filter(edge => nodeIds.has(edge.source) && nodeIds.has(edge.target));
        return {
            title: 'CyberVinci Memory export',
            version: graph.version,
            exportedAt: graph.exportedAt,
            source: 'cybervinci-memory',
            compatibility: {
                format: 'graphify-out/graph.json',
                graphifyRuntimeRequired: false,
                rawSourceContentIncluded: false,
                rawEvidenceIncluded: false,
                secretsRedacted: true
            },
            workspacePath: graph.workspacePath,
            nodes,
            edges,
            metadata: graph.metadata
        };
    }

    protected portableMemoryScopeCounts(memories: MemoryItem[]): Record<string, number> {
        const counts: Record<string, number> = {};
        for (const memory of memories) {
            const scope = memory.scope ?? 'workspace';
            counts[scope] = (counts[scope] ?? 0) + 1;
        }
        return counts;
    }

    protected omitStandaloneProjectGraphEvidence(graph: MemoryStandaloneProjectGraph): MemoryStandaloneProjectGraph {
        return {
            ...graph,
            relations: graph.relations.map(({ evidence, ...relation }) => relation),
            concepts: graph.concepts.map(({ evidence, ...concept }) => concept),
            links: graph.links.map(({ evidence, ...link }) => link)
        };
    }

    protected buildStandaloneProjectCallflowSvg(graph: MemoryStandaloneProjectGraph): string {
        const relevantRelationTypes = new Set<MemoryGraphRelationType>([
            'calls',
            'depends_on',
            'imports',
            'implements',
            'inherits',
            'uses_dependency',
            'communicates_with',
            'reads_from',
            'writes_to',
            'publishes',
            'subscribes_to',
            'blocks',
            'affects'
        ]);
        const nodeLabels = new Map<string, string>([
            ...graph.files.map(file => [`file:${file.id}`, file.relativePath] as [string, string]),
            ...graph.symbols.map(symbol => [`symbol:${symbol.id}`, symbol.fullName ?? symbol.name] as [string, string]),
            ...graph.concepts.map(concept => [`concept:${concept.id}`, concept.title] as [string, string])
        ]);
        const relations = graph.relations
            .filter(relation => relevantRelationTypes.has(relation.relationType))
            .filter(relation => nodeLabels.has(`${relation.sourceKind}:${relation.sourceId}`) && nodeLabels.has(`${relation.targetKind}:${relation.targetId}`))
            .sort((left, right) => {
                const criticality = (relation: MemoryStandaloneProjectGraphRelation): number =>
                    (relation.relationType === 'calls' ? 2 : 0) + relation.confidenceScore;
                return criticality(right) - criticality(left);
            })
            .slice(0, 16);
        const width = 1180;
        const rowHeight = 58;
        const headerHeight = 118;
        const height = Math.max(360, headerHeight + Math.max(relations.length, 1) * rowHeight + 46);
        const relationRows = relations.length ? relations.map((relation, index) => {
            const y = headerHeight + index * rowHeight;
            const source = this.truncateSvgLabel(nodeLabels.get(`${relation.sourceKind}:${relation.sourceId}`) ?? relation.sourceId, 48);
            const target = this.truncateSvgLabel(nodeLabels.get(`${relation.targetKind}:${relation.targetId}`) ?? relation.targetId, 48);
            const confidence = `${Math.round(relation.confidenceScore * 100)}%`;
            const markers = relation.classificationMarkers.filter(marker => marker !== 'has-evidence').slice(0, 4).join(' / ');
            const tone = relation.relationType === 'calls' ? '#0969da' : relation.relationType === 'blocks' ? '#cf222e' : '#57606a';
            return [
                `  <g class="row" transform="translate(0 ${y})">`,
                `    <rect x="28" y="0" width="${width - 56}" height="44" rx="6" fill="${index % 2 ? '#f6f8fa' : '#ffffff'}" stroke="#d0d7de"/>`,
                `    <text x="52" y="19" class="label">${this.escapeGraphmlText(source)}</text>`,
                `    <text x="52" y="35" class="meta">${this.escapeGraphmlText(relation.sourceKind)}</text>`,
                `    <line x1="396" y1="22" x2="764" y2="22" stroke="${tone}" stroke-width="2.4" marker-end="url(#arrow)"/>`,
                `    <text x="580" y="16" class="relation" text-anchor="middle" fill="${tone}">${this.escapeGraphmlText(relation.relationType)}</text>`,
                `    <text x="580" y="38" class="meta" text-anchor="middle">${this.escapeGraphmlText(confidence)} confidence</text>`,
                `    <text x="792" y="19" class="label">${this.escapeGraphmlText(target)}</text>`,
                `    <text x="792" y="35" class="meta">${this.escapeGraphmlText(relation.targetKind)}${markers ? ` - ${this.escapeGraphmlText(markers)}` : ''}</text>`,
                '  </g>'
            ].join('\n');
        }).join('\n') : [
            `  <rect x="28" y="${headerHeight}" width="${width - 56}" height="96" rx="6" fill="#ffffff" stroke="#d0d7de"/>`,
            `  <text x="${width / 2}" y="${headerHeight + 44}" class="label" text-anchor="middle">No critical callflow relations were exported.</text>`,
            `  <text x="${width / 2}" y="${headerHeight + 66}" class="meta" text-anchor="middle">Index call/dependency relations to populate this view.</text>`
        ].join('\n');
        return [
            '<?xml version="1.0" encoding="UTF-8"?>',
            `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">`,
            '  <title id="title">CyberVinci Project Callflow</title>',
            `  <desc id="desc">Critical paths and relevant relationships exported from ${this.escapeGraphmlText(graph.workspacePath)} without source content or raw evidence.</desc>`,
            '  <defs>',
            '    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">',
            '      <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke"/>',
            '    </marker>',
            '    <style>',
            '      .title{font:700 24px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;fill:#1f2328}',
            '      .subtitle,.meta{font:12px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;fill:#57606a}',
            '      .label{font:600 13px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;fill:#1f2328}',
            '      .relation{font:700 12px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;text-transform:uppercase}',
            '    </style>',
            '  </defs>',
            '  <rect width="100%" height="100%" fill="#f6f8fa"/>',
            '  <text x="28" y="42" class="title">CyberVinci Project Callflow</text>',
            `  <text x="28" y="66" class="subtitle">Critical paths and relevant relationships. Exported ${this.escapeGraphmlText(graph.exportedAt)}.</text>`,
            `  <text x="28" y="88" class="meta">Workspace: ${this.escapeGraphmlText(this.truncateSvgLabel(graph.workspacePath, 140))}</text>`,
            `  <text x="${width - 28}" y="42" class="meta" text-anchor="end">Relations shown: ${relations.length} of ${graph.metadata.relationCount}</text>`,
            `  <text x="${width - 28}" y="64" class="meta" text-anchor="end">Raw evidence and source content omitted</text>`,
            relationRows,
            '</svg>',
            ''
        ].join('\n');
    }

    protected buildStandaloneProjectGraphHtml(graph: MemoryStandaloneProjectGraph): string {
        const graphData = this.escapeHtmlScriptJson(graph);
        return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>CyberVinci Project Graph</title>
<style>
:root{color-scheme:light dark;--bg:#f7f8fa;--fg:#1f2328;--muted:#626b77;--panel:#ffffff;--line:#d0d7de;--accent:#0969da;--file:#2da44e;--symbol:#8250df;--concept:#bf8700}
@media (prefers-color-scheme:dark){:root{--bg:#0d1117;--fg:#e6edf3;--muted:#8b949e;--panel:#161b22;--line:#30363d;--accent:#58a6ff;--file:#3fb950;--symbol:#a371f7;--concept:#d29922}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:13px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
header{display:flex;gap:16px;align-items:flex-start;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--line);background:var(--panel)}
h1{margin:0 0 4px;font-size:18px;font-weight:650}.meta{color:var(--muted);font-size:12px}.stats{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.stat{border:1px solid var(--line);border-radius:6px;padding:4px 8px;background:var(--bg);white-space:nowrap}
main{display:grid;grid-template-columns:minmax(0,1fr) 320px;height:calc(100vh - 82px);min-height:560px}.graph-wrap{position:relative;min-width:0}.toolbar{position:absolute;left:12px;top:12px;z-index:1;display:flex;gap:8px;align-items:center;padding:8px;border:1px solid var(--line);border-radius:6px;background:color-mix(in srgb,var(--panel) 92%,transparent)}
button,input{font:inherit}button{border:1px solid var(--line);border-radius:5px;background:var(--panel);color:var(--fg);padding:4px 8px;cursor:pointer}button:hover{border-color:var(--accent)}input{width:220px;max-width:34vw;border:1px solid var(--line);border-radius:5px;background:var(--panel);color:var(--fg);padding:4px 8px}
svg{display:block;width:100%;height:100%;background:var(--bg)}.edge{stroke:var(--line);stroke-width:1.3;marker-end:url(#arrow)}.edge.dim,.node.dim{opacity:.16}.node circle{stroke:var(--panel);stroke-width:2}.node text{fill:var(--fg);font-size:11px;paint-order:stroke;stroke:var(--bg);stroke-width:3px;pointer-events:none}.node.file circle{fill:var(--file)}.node.symbol circle{fill:var(--symbol)}.node.concept circle{fill:var(--concept)}.node.selected circle{stroke:var(--accent);stroke-width:4}
aside{overflow:auto;border-left:1px solid var(--line);background:var(--panel);padding:16px}h2{font-size:14px;margin:0 0 10px}.detail{white-space:pre-wrap;overflow-wrap:anywhere;color:var(--muted)}.legend{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px}.legend span{display:inline-flex;align-items:center;gap:5px}.swatch{width:10px;height:10px;border-radius:50%;display:inline-block}.empty{color:var(--muted)}
@media (max-width:800px){main{grid-template-columns:1fr;height:auto}.graph-wrap{height:70vh}aside{border-left:0;border-top:1px solid var(--line)}header{display:block}.stats{justify-content:flex-start;margin-top:10px}}
</style>
</head>
<body>
<header>
<div>
<h1>CyberVinci Project Graph</h1>
<div class="meta">Exported <span id="exportedAt"></span> from <span id="workspacePath"></span>. Standalone local viewer; no IDE runtime or network scripts required.</div>
</div>
<div class="stats" id="stats"></div>
</header>
<main>
<section class="graph-wrap">
<div class="toolbar">
<input id="filter" type="search" placeholder="Filter nodes">
<button id="reset" type="button">Reset</button>
</div>
<svg id="graph" role="img" aria-label="CyberVinci project graph visualization"></svg>
</section>
<aside>
<div class="legend"><span><i class="swatch" style="background:var(--file)"></i>File</span><span><i class="swatch" style="background:var(--symbol)"></i>Symbol</span><span><i class="swatch" style="background:var(--concept)"></i>Concept</span></div>
<h2 id="detailTitle">Select a node</h2>
<div id="detail" class="detail empty">Click a node to inspect its source, markers, and connected edges.</div>
</aside>
</main>
<script id="cybervinci-project-graph-data" type="application/json">${graphData}</script>
<script>
(() => {
  const graph = JSON.parse(document.getElementById('cybervinci-project-graph-data').textContent);
  const svg = document.getElementById('graph');
  const detailTitle = document.getElementById('detailTitle');
  const detail = document.getElementById('detail');
  const filterInput = document.getElementById('filter');
  const stats = document.getElementById('stats');
  document.getElementById('exportedAt').textContent = graph.exportedAt;
  document.getElementById('workspacePath').textContent = graph.workspacePath;
  stats.innerHTML = [
    ['Files', graph.metadata.fileCount],
    ['Symbols', graph.metadata.symbolCount],
    ['Relations', graph.metadata.relationCount],
    ['Concepts', graph.metadata.conceptCount],
    ['Links', graph.metadata.linkCount]
  ].map(([label, value]) => '<span class="stat">' + label + ': ' + value + '</span>').join('');
  const nodes = [
    ...graph.files.map(file => ({ id: 'file:' + file.id, kind: 'file', label: file.relativePath, raw: file })),
    ...graph.symbols.map(symbol => ({ id: 'symbol:' + symbol.id, kind: 'symbol', label: symbol.fullName || symbol.name, raw: symbol })),
    ...graph.concepts.map(concept => ({ id: 'concept:' + concept.id, kind: 'concept', label: concept.title, raw: concept }))
  ];
  const nodeById = new Map(nodes.map(node => [node.id, node]));
  const edges = [
    ...graph.symbols.map(symbol => ({ source: 'file:' + symbol.fileId, target: 'symbol:' + symbol.id, kind: 'declares' })),
    ...graph.relations.map(relation => ({ source: relation.sourceKind + ':' + relation.sourceId, target: relation.targetKind + ':' + relation.targetId, kind: relation.relationType, raw: relation })),
    ...graph.concepts.filter(concept => concept.sourceId).map(concept => ({ source: 'concept:' + concept.id, target: (concept.sourceKind === 'project-memory' ? 'concept:' : 'symbol:') + concept.sourceId, kind: 'derived-from', raw: concept })),
    ...graph.links.map(link => ({ source: 'concept:' + link.sourceConceptId, target: 'concept:' + link.targetConceptId, kind: link.linkKind, raw: link }))
  ].filter(edge => nodeById.has(edge.source) && nodeById.has(edge.target));
  let width = 0, height = 0, selectedId = '', visible = new Set(nodes.map(node => node.id));
  function layout() {
    width = Math.max(640, svg.clientWidth || 640);
    height = Math.max(420, svg.clientHeight || 420);
    const rings = { file: Math.min(width, height) * 0.34, symbol: Math.min(width, height) * 0.24, concept: Math.min(width, height) * 0.14 };
    const center = { x: width / 2, y: height / 2 };
    const groups = { file: nodes.filter(n => n.kind === 'file'), symbol: nodes.filter(n => n.kind === 'symbol'), concept: nodes.filter(n => n.kind === 'concept') };
    Object.entries(groups).forEach(([kind, group], groupIndex) => {
      group.forEach((node, index) => {
        const angle = (Math.PI * 2 * index / Math.max(group.length, 1)) - Math.PI / 2 + groupIndex * 0.22;
        node.x = center.x + Math.cos(angle) * rings[kind];
        node.y = center.y + Math.sin(angle) * rings[kind];
      });
    });
  }
  function render() {
    layout();
    svg.innerHTML = '<defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor"></path></marker></defs>';
    for (const edge of edges) {
      const source = nodeById.get(edge.source), target = nodeById.get(edge.target);
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', source.x); line.setAttribute('y1', source.y); line.setAttribute('x2', target.x); line.setAttribute('y2', target.y);
      line.setAttribute('class', 'edge' + (visible.has(edge.source) && visible.has(edge.target) ? '' : ' dim'));
      svg.appendChild(line);
    }
    for (const node of nodes) {
      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      group.setAttribute('class', 'node ' + node.kind + (node.id === selectedId ? ' selected' : '') + (visible.has(node.id) ? '' : ' dim'));
      group.setAttribute('tabindex', '0');
      group.addEventListener('click', () => select(node.id));
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', node.x); circle.setAttribute('cy', node.y); circle.setAttribute('r', node.kind === 'file' ? 8 : 7);
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', node.x + 10); text.setAttribute('y', node.y + 4); text.textContent = node.label;
      group.append(circle, text); svg.appendChild(group);
    }
  }
  function select(id) {
    selectedId = id;
    const node = nodeById.get(id);
    const connected = edges.filter(edge => edge.source === id || edge.target === id).map(edge => edge.kind + ': ' + edge.source + ' -> ' + edge.target);
    detailTitle.textContent = node.label;
    detail.className = 'detail';
    detail.textContent = JSON.stringify({ kind: node.kind, id: node.id, data: node.raw, edges: connected }, null, 2);
    render();
  }
  function applyFilter() {
    const query = filterInput.value.trim().toLowerCase();
    visible = new Set(nodes.filter(node => !query || node.label.toLowerCase().includes(query) || JSON.stringify(node.raw).toLowerCase().includes(query)).map(node => node.id));
    render();
  }
  filterInput.addEventListener('input', applyFilter);
  document.getElementById('reset').addEventListener('click', () => { filterInput.value = ''; selectedId = ''; visible = new Set(nodes.map(node => node.id)); detailTitle.textContent = 'Select a node'; detail.className = 'detail empty'; detail.textContent = 'Click a node to inspect its source, markers, and connected edges.'; render(); });
  addEventListener('resize', render);
  render();
})();
</script>
</body>
</html>
`;
    }

    protected buildStandaloneProjectGraphGraphml(graph: MemoryStandaloneProjectGraph): string {
        const nodes = [
            ...graph.files.map(file => ({
                id: this.graphmlNodeId('file', file.id),
                kind: 'file',
                label: file.relativePath,
                properties: {
                    relativePath: file.relativePath,
                    fileName: file.fileName,
                    extension: file.extension,
                    languageId: file.languageId,
                    sizeBytes: file.sizeBytes,
                    contentHash: file.contentHash,
                    indexedAt: file.indexedAt,
                    classificationMarkers: file.classificationMarkers,
                    originMarkers: file.originMarkers,
                    ignoreReason: file.ignoreReason?.kind
                }
            })),
            ...graph.symbols.map(symbol => ({
                id: this.graphmlNodeId('symbol', symbol.id),
                kind: 'symbol',
                label: symbol.fullName ?? symbol.name,
                properties: {
                    fileId: symbol.fileId,
                    languageId: symbol.languageId,
                    symbolKind: symbol.symbolKind,
                    name: symbol.name,
                    fullName: symbol.fullName,
                    parentSymbolId: symbol.parentSymbolId,
                    signature: symbol.signature,
                    startLine: symbol.startLine,
                    endLine: symbol.endLine,
                    returnType: symbol.returnType,
                    classificationMarkers: symbol.classificationMarkers,
                    originMarkers: symbol.originMarkers
                }
            })),
            ...graph.concepts.map(concept => ({
                id: this.graphmlNodeId('concept', concept.id),
                kind: 'knowledge-concept',
                label: concept.title,
                properties: {
                    graphId: concept.graphId,
                    conceptKind: concept.kind,
                    title: concept.title,
                    status: concept.status,
                    sourceKind: concept.sourceKind,
                    sourceId: concept.sourceId,
                    uri: concept.uri,
                    confidenceScore: concept.confidenceScore,
                    weight: concept.weight,
                    tags: concept.tags,
                    createdAt: concept.createdAt,
                    updatedAt: concept.updatedAt,
                    classificationMarkers: concept.classificationMarkers,
                    originMarkers: concept.originMarkers
                }
            }))
        ];
        const nodeIds = new Set(nodes.map(node => node.id));
        const edges = [
            ...graph.symbols.map(symbol => ({
                id: this.graphmlEdgeId('file-symbol', `${symbol.fileId}-${symbol.id}`),
                source: this.graphmlNodeId('file', symbol.fileId),
                target: this.graphmlNodeId('symbol', symbol.id),
                kind: 'declares',
                properties: {
                    relationType: 'declares',
                    sourceKind: 'file',
                    targetKind: 'symbol',
                    originMarkers: ['source:language-analyzer']
                }
            })),
            ...graph.relations.map(relation => ({
                id: this.graphmlEdgeId('relation', relation.id),
                source: this.graphmlNodeId(relation.sourceKind, relation.sourceId),
                target: this.graphmlNodeId(relation.targetKind, relation.targetId),
                kind: relation.relationType,
                properties: {
                    relationType: relation.relationType,
                    sourceKind: relation.sourceKind,
                    targetKind: relation.targetKind,
                    confidenceLevel: relation.confidenceLevel,
                    confidenceScore: relation.confidenceScore,
                    hasEvidence: !!relation.evidence,
                    classificationMarkers: relation.classificationMarkers,
                    originMarkers: relation.originMarkers
                }
            })),
            ...graph.concepts
                .filter(concept => concept.sourceId && (concept.sourceKind === 'code-graph' || concept.sourceKind === 'knowledge-graph'))
                .filter(concept => nodeIds.has(this.graphmlNodeId('symbol', concept.sourceId ?? '')))
                .map(concept => ({
                    id: this.graphmlEdgeId('concept-source', `${concept.id}-${concept.sourceId}`),
                    source: this.graphmlNodeId('concept', concept.id),
                    target: this.graphmlNodeId('symbol', concept.sourceId ?? ''),
                    kind: 'derived-from',
                    properties: {
                        relationType: 'derived-from',
                        sourceKind: 'knowledge-concept',
                        targetKind: 'symbol',
                        originMarkers: concept.originMarkers
                    }
                })),
            ...graph.links.map(link => ({
                id: this.graphmlEdgeId('knowledge-link', link.id),
                source: this.graphmlNodeId('concept', link.sourceConceptId),
                target: this.graphmlNodeId('concept', link.targetConceptId),
                kind: link.linkKind,
                properties: {
                    relationType: link.linkKind,
                    graphId: link.graphId,
                    label: link.label,
                    confidenceScore: link.confidenceScore,
                    hasEvidence: !!link.evidence,
                    classificationMarkers: link.classificationMarkers,
                    originMarkers: link.originMarkers
                }
            }))
        ];
        const lines = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">',
            '  <key id="kind" for="all" attr.name="kind" attr.type="string"/>',
            '  <key id="label" for="all" attr.name="label" attr.type="string"/>',
            '  <key id="properties" for="all" attr.name="properties" attr.type="string"/>',
            '  <graph id="cybervinci-project-graph" edgedefault="directed">',
            ...nodes.flatMap(node => this.graphmlNodeLines(node.id, node.kind, node.label, node.properties)),
            ...edges.flatMap(edge => this.graphmlEdgeLines(edge.id, edge.source, edge.target, edge.kind, edge.properties)),
            '  </graph>',
            '</graphml>',
            ''
        ];
        return lines.join('\n');
    }

    protected buildStandaloneProjectGraph(bundle: MemoryExportBundle): MemoryStandaloneProjectGraph {
        const concepts = bundle.knowledgeGraphs.flatMap(graph => graph.concepts.map(concept => ({
            id: concept.id,
            graphId: concept.graphId ?? graph.id,
            kind: concept.kind,
            title: concept.title,
            summary: concept.summary,
            status: concept.status,
            sourceKind: concept.sourceKind,
            sourceId: concept.sourceId,
            uri: concept.uri,
            evidence: concept.evidence,
            confidenceScore: concept.weight,
            weight: concept.weight,
            tags: concept.tags,
            createdAt: concept.createdAt,
            updatedAt: concept.updatedAt,
            classificationMarkers: this.knowledgeConceptClassificationMarkers(concept),
            originMarkers: this.knowledgeConceptOriginMarkers(graph, concept)
        })));
        const links = bundle.knowledgeGraphs.flatMap(graph => graph.links.map(link => ({
            id: link.id,
            graphId: link.graphId ?? graph.id,
            sourceConceptId: link.sourceConceptId,
            targetConceptId: link.targetConceptId,
            linkKind: link.linkKind,
            label: link.label,
            evidence: link.evidence,
            confidenceScore: link.confidenceScore,
            createdAt: link.createdAt,
            updatedAt: link.updatedAt,
            classificationMarkers: this.knowledgeLinkClassificationMarkers(link),
            originMarkers: this.knowledgeLinkOriginMarkers(graph, link),
            metadata: link.metadata
        })));
        return {
            version: 1,
            exportedAt: bundle.exportedAt,
            workspacePath: bundle.workspacePath,
            source: 'cybervinci-memory',
            policies: {
                localFirst: true,
                importedMemoriesRequireHumanReview: true,
                secretsRedacted: true,
                rawSourceContentExcludedFromGraphArtifacts: true
            },
            files: bundle.files.map(file => ({
                id: file.id,
                relativePath: file.relativePath,
                fileName: file.fileName,
                extension: file.extension,
                languageId: file.languageId,
                sizeBytes: file.sizeBytes,
                contentHash: file.contentHash,
                indexedAt: file.indexedAt,
                classificationMarkers: this.fileClassificationMarkers(file),
                originMarkers: ['source:code-index'],
                ignoreReason: file.ignoreReason
            })),
            symbols: bundle.symbols.map(symbol => ({
                id: symbol.id,
                fileId: symbol.fileId,
                languageId: symbol.languageId,
                symbolKind: symbol.symbolKind,
                name: symbol.name,
                fullName: symbol.fullName,
                parentSymbolId: symbol.parentSymbolId,
                signature: symbol.signature,
                startLine: symbol.startLine,
                endLine: symbol.endLine,
                attributes: symbol.attributes,
                modifiers: symbol.modifiers,
                returnType: symbol.returnType,
                metadata: symbol.metadata,
                classificationMarkers: this.symbolClassificationMarkers(symbol),
                originMarkers: ['source:language-analyzer']
            })),
            relations: bundle.relations.map(relation => ({
                id: relation.id,
                sourceKind: relation.sourceKind,
                sourceId: relation.sourceId,
                targetKind: relation.targetKind,
                targetId: relation.targetId,
                relationType: relation.relationType,
                confidenceLevel: relation.confidenceLevel,
                confidenceScore: relation.confidenceScore,
                evidence: relation.evidence,
                metadata: relation.metadata,
                classificationMarkers: this.relationClassificationMarkers(relation),
                originMarkers: ['source:code-graph', `confidence:${relation.confidenceLevel}`]
            })),
            concepts,
            links,
            metadata: {
                fileCount: bundle.files.length,
                symbolCount: bundle.symbols.length,
                relationCount: bundle.relations.length,
                conceptCount: concepts.length,
                linkCount: links.length,
                knowledgeGraphCount: bundle.knowledgeGraphs.length
            }
        };
    }

    protected graphmlNodeLines(id: string, kind: string, label: string, properties: Record<string, unknown>): string[] {
        return [
            `    <node id="${this.escapeGraphmlAttribute(id)}">`,
            `      <data key="kind">${this.escapeGraphmlText(kind)}</data>`,
            `      <data key="label">${this.escapeGraphmlText(label)}</data>`,
            `      <data key="properties">${this.escapeGraphmlText(this.graphmlProperties(properties))}</data>`,
            '    </node>'
        ];
    }

    protected graphmlEdgeLines(id: string, source: string, target: string, kind: string, properties: Record<string, unknown>): string[] {
        return [
            `    <edge id="${this.escapeGraphmlAttribute(id)}" source="${this.escapeGraphmlAttribute(source)}" target="${this.escapeGraphmlAttribute(target)}">`,
            `      <data key="kind">${this.escapeGraphmlText(kind)}</data>`,
            `      <data key="label">${this.escapeGraphmlText(kind)}</data>`,
            `      <data key="properties">${this.escapeGraphmlText(this.graphmlProperties(properties))}</data>`,
            '    </edge>'
        ];
    }

    protected graphmlProperties(properties: Record<string, unknown>): string {
        return JSON.stringify(Object.fromEntries(Object.entries(properties).filter(([, value]) => value !== undefined)));
    }

    protected graphmlNodeId(kind: string, id: string): string {
        return `${kind}:${id}`;
    }

    protected graphmlEdgeId(kind: string, id: string): string {
        return `${kind}:${id}`;
    }

    protected escapeGraphmlAttribute(value: string): string {
        return this.escapeGraphmlText(value).replace(/"/g, '&quot;');
    }

    protected escapeGraphmlText(value: string): string {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    protected escapeHtmlScriptJson(value: unknown): string {
        return JSON.stringify(value)
            .replace(/</g, '\\u003c')
            .replace(/>/g, '\\u003e')
            .replace(/&/g, '\\u0026')
            .replace(/\u2028/g, '\\u2028')
            .replace(/\u2029/g, '\\u2029');
    }

    protected truncateSvgLabel(value: string, maxLength: number): string {
        return value.length > maxLength ? `${value.slice(0, Math.max(0, maxLength - 3))}...` : value;
    }

    protected fileClassificationMarkers(file: MemoryFile): string[] {
        return [
            file.isIgnored ? 'ignored' : 'indexed',
            file.isGenerated ? 'generated' : undefined,
            file.isBinary ? 'binary' : undefined,
            file.isSensitive ? 'sensitive-metadata-only' : undefined,
            file.ignoreReason ? `ignore:${file.ignoreReason.kind}` : undefined,
            file.languageId ? `language:${file.languageId}` : undefined
        ].filter((marker): marker is string => marker !== undefined);
    }

    protected symbolClassificationMarkers(symbol: MemorySymbol): string[] {
        return [
            `symbol:${symbol.symbolKind}`,
            `language:${symbol.languageId}`,
            symbol.attributes?.length ? 'has-attributes' : undefined,
            symbol.modifiers?.length ? 'has-modifiers' : undefined
        ].filter((marker): marker is string => marker !== undefined);
    }

    protected relationClassificationMarkers(relation: MemoryRelation): string[] {
        return [
            `relation:${relation.relationType}`,
            `confidence:${relation.confidenceLevel}`,
            relation.evidence ? 'has-evidence' : undefined
        ].filter((marker): marker is string => marker !== undefined);
    }

    protected knowledgeConceptClassificationMarkers(concept: MemoryKnowledgeConcept): string[] {
        return [
            this.knowledgeClassificationMarker(concept),
            `concept:${concept.kind}`,
            `status:${concept.status}`,
            concept.sourceKind ? `source:${concept.sourceKind}` : undefined,
            concept.evidence ? 'has-evidence' : undefined,
            concept.weight !== undefined ? 'has-confidence' : undefined
        ].filter((marker): marker is string => marker !== undefined);
    }

    protected knowledgeConceptOriginMarkers(graph: MemoryKnowledgeGraph, concept: MemoryKnowledgeConcept): string[] {
        return Array.from(new Set([
            ...this.knowledgeOriginMarkersFromMetadata(graph.metadata),
            ...this.knowledgeOriginMarkersFromMetadata(concept.metadata),
            'source:knowledge-graph',
            `graph:${graph.id}`,
            graph.scope ? `scope:${graph.scope}` : undefined,
            concept.sourceKind ? `source-kind:${concept.sourceKind}` : undefined,
            concept.sourceId ? `source-id:${concept.sourceId}` : undefined
        ].filter((marker): marker is string => marker !== undefined)));
    }

    protected knowledgeLinkClassificationMarkers(link: MemoryKnowledgeLink): string[] {
        return [
            this.knowledgeClassificationMarker(link),
            `link:${link.linkKind}`,
            link.evidence ? 'has-evidence' : undefined,
            link.confidenceScore >= 0.8 ? 'high-confidence' : link.confidenceScore < 0.5 ? 'low-confidence' : 'medium-confidence'
        ].filter((marker): marker is string => marker !== undefined);
    }

    protected knowledgeClassificationMarker(
        item: MemoryKnowledgeConcept | MemoryKnowledgeLink
    ): 'extracted' | 'inferred' | 'user-approved' | 'ambiguous' | 'conflict' {
        const metadata = item.metadata ?? {};
        const explicit = typeof metadata.classification === 'string' ? metadata.classification : undefined;
        if (explicit === 'extracted' || explicit === 'inferred' || explicit === 'user-approved' || explicit === 'ambiguous' || explicit === 'conflict') {
            return explicit;
        }
        if ('linkKind' in item && (item.linkKind === 'conflicts_with' || item.linkKind === 'blocks')) {
            return 'conflict';
        }
        const sourceKind = 'sourceKind' in item ? String(item.sourceKind ?? '') : '';
        if (metadata.userApproved === true || metadata.approved === true || sourceKind === 'manual') {
            return 'user-approved';
        }
        const confidence = 'confidenceScore' in item ? item.confidenceScore : item.weight;
        if (typeof confidence === 'number' && confidence < 0.5) {
            return 'ambiguous';
        }
        if (sourceKind === 'code' || sourceKind === 'code-text' || sourceKind === 'code-graph' || sourceKind === 'local-docs' || sourceKind === 'external-docs' || sourceKind === 'local-versioned-docs') {
            return 'extracted';
        }
        return 'inferred';
    }

    protected knowledgeLinkOriginMarkers(graph: MemoryKnowledgeGraph, link: MemoryKnowledgeLink): string[] {
        return Array.from(new Set([
            ...this.knowledgeOriginMarkersFromMetadata(graph.metadata),
            ...this.knowledgeOriginMarkersFromMetadata(link.metadata),
            'source:knowledge-graph',
            `graph:${graph.id}`,
            graph.scope ? `scope:${graph.scope}` : undefined,
            link.metadata?.sourceKind ? `source-kind:${link.metadata.sourceKind}` : undefined,
            link.metadata?.sourceId ? `source-id:${link.metadata.sourceId}` : undefined
        ].filter((marker): marker is string => marker !== undefined)));
    }

    protected knowledgeOriginMarkersFromMetadata(
        metadata: MemoryKnowledgeGraph['metadata'] | MemoryKnowledgeConcept['metadata'] | MemoryKnowledgeLink['metadata'] | undefined
    ): string[] {
        return Array.isArray(metadata?.originMarkers)
            ? metadata.originMarkers.filter((marker): marker is string => typeof marker === 'string' && !!marker.trim())
            : [];
    }

    protected buildProjectReportMarkdown(bundle: MemoryExportBundle): string {
        const activeFiles = bundle.files.filter(file => !file.isIgnored && !file.isBinary && !file.isSensitive);
        const languageCounts = this.countBy(activeFiles, file => file.languageId ?? file.extension ?? 'unknown');
        const symbolCounts = this.countBy(bundle.symbols, symbol => symbol.symbolKind);
        const prominentSymbols = bundle.symbols
            .filter(symbol => !!(symbol.fullName ?? symbol.name)?.trim())
            .slice(0, 15);
        const relationCounts = this.countBy(bundle.relations, relation => relation.relationType);
        const riskItems = [...bundle.changeImpacts]
            .sort((left, right) => right.riskScore - left.riskScore)
            .slice(0, 10);
        const godNodes = this.inferGodNodes(bundle).slice(0, 10);
        const untestedFiles = this.inferFilesWithoutTests(bundle).slice(0, 25);
        const decisions = this.reportConcepts(bundle, ['decision', 'constraint']).slice(0, 12);
        const conventions = this.reportConventionConcepts(bundle).slice(0, 12);
        const reviewableContext = bundle.contextSuggestions
            .filter(suggestion => suggestion.accepted !== false)
            .slice(-15)
            .reverse();
        const sections = [
            '# CyberVinci Project Report',
            '',
            `Generated at: ${bundle.exportedAt}`,
            `Workspace: ${bundle.workspacePath}`,
            '',
            '## Architectural Summary',
            '',
            `- Files indexed: ${bundle.files.length} (${activeFiles.length} active, ${bundle.files.length - activeFiles.length} ignored/metadata-only).`,
            `- Symbols indexed: ${bundle.symbols.length}.`,
            `- Relations indexed: ${bundle.relations.length}.`,
            `- Knowledge graphs: ${bundle.knowledgeGraphs.length}.`,
            `- Memories exported for review: ${bundle.memories.length}.`,
            '',
            '## Modules',
            '',
            ...this.markdownCountList(languageCounts, 'No module or language data available.'),
            '',
            '## Symbol Inventory',
            '',
            ...this.markdownCountList(symbolCounts, 'No symbols available.'),
            ...(prominentSymbols.length ? ['', '### Prominent Symbols', '', ...prominentSymbols.map(symbol => `- ${symbol.fullName ?? symbol.name} (${symbol.symbolKind})`)] : []),
            '',
            '## Relation Inventory',
            '',
            ...this.markdownCountList(relationCounts, 'No relations available.'),
            '',
            '## Risks',
            '',
            ...(riskItems.length ? riskItems.map(item => `- Risk source ${item.relativePath ?? item.sourceId ?? item.id}: ${item.summary} (risk ${item.riskScore})`) : ['- No stored risk analysis available.']),
            '',
            '## God Nodes',
            '',
            ...(godNodes.length ? godNodes.map(node => `- ${node.label} (${node.id}): degree ${node.degree}`) : ['- No high-degree graph nodes inferred from the exported graph data.']),
            '',
            '## Files Without Inferred Tests',
            '',
            ...(untestedFiles.length ? untestedFiles.map(file => `- ${file.relativePath}`) : ['- No untested source files inferred from naming and graph metadata.']),
            '',
            '## Relevant Decisions',
            '',
            ...this.markdownConceptList(decisions, 'No decision concepts available in exported knowledge graphs.'),
            '',
            '## Conventions',
            '',
            ...this.markdownConceptList(conventions, 'No convention concepts available in exported knowledge graphs.'),
            '',
            '## Suggested Questions',
            '',
            ...this.suggestContributorQuestions({
                workspacePath: bundle.workspacePath,
                files: bundle.files,
                symbols: bundle.symbols,
                relations: bundle.relations,
                codeChunks: bundle.codeChunks,
                memories: bundle.memories,
                knowledgeGraphs: bundle.knowledgeGraphs,
                changeImpacts: bundle.changeImpacts
            }).map(question => `- ${question.question} Source: ${question.source}. Evidence: ${question.evidence}.`),
            '',
            '## Reviewable Context',
            '',
            ...(reviewableContext.length ? reviewableContext.map(item => `- ${item.sourceKind}: ${item.title} (score ${item.score}). Reason: ${item.reason}`) : ['- No stored context suggestions available for review.'])
        ];
        return sections.join('\n');
    }

    protected countBy<T>(items: T[], keyOf: (item: T) => string): Array<{ label: string; count: number }> {
        const counts = new Map<string, number>();
        for (const item of items) {
            const key = keyOf(item);
            counts.set(key, (counts.get(key) ?? 0) + 1);
        }
        return [...counts.entries()]
            .map(([label, count]) => ({ label, count }))
            .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
    }

    protected markdownCountList(counts: Array<{ label: string; count: number }>, emptyMessage: string): string[] {
        return counts.length ? counts.map(item => `- ${item.label}: ${item.count}`) : [`- ${emptyMessage}`];
    }

    protected reportConcepts(bundle: MemoryExportBundle, kinds: MemoryKnowledgeConceptKind[]): MemoryKnowledgeConcept[] {
        const acceptedKinds = new Set(kinds);
        return bundle.knowledgeGraphs
            .flatMap(graph => graph.concepts ?? [])
            .filter(concept => acceptedKinds.has(concept.kind));
    }

    protected reportConventionConcepts(bundle: MemoryExportBundle): MemoryKnowledgeConcept[] {
        return bundle.knowledgeGraphs
            .flatMap(graph => graph.concepts ?? [])
            .filter(concept =>
                concept.tags?.some(tag => tag.toLowerCase() === 'convention') ||
                /convention|pattern|style|standard/i.test(`${concept.title} ${concept.summary}`)
            );
    }

    protected markdownConceptList(concepts: MemoryKnowledgeConcept[], emptyMessage: string): string[] {
        return concepts.length
            ? concepts.map(concept => `- ${concept.title}: ${concept.summary}${concept.evidence ? ` Evidence: ${concept.evidence}` : ''}`)
            : [`- ${emptyMessage}`];
    }

    protected inferGodNodes(bundle: MemoryExportBundle): Array<{ id: string; label: string; degree: number }> {
        return new GodNodeAnalyzer().analyze({
            files: bundle.files,
            symbols: bundle.symbols,
            relations: bundle.relations,
            minDegree: 5,
            limit: 25
        }).nodes.map(node => ({ id: node.id, label: node.label, degree: node.degree }));
    }

    protected inferFilesWithoutTests(bundle: MemoryExportBundle): MemoryFile[] {
        const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.cs', '.java', '.py', '.go', '.rs']);
        const testPattern = /(^|[\\/])(__tests__|tests?)([\\/]|$)|(\.|-)(spec|test)\.[^.]+$/i;
        const testedPathSeeds = new Set(bundle.files
            .filter(file => testPattern.test(file.relativePath))
            .map(file => this.testPathSeed(file.relativePath)));
        return bundle.files
            .filter(file => !file.isIgnored && !file.isGenerated && !file.isBinary && !file.isSensitive)
            .filter(file => sourceExtensions.has((file.extension ?? path.extname(file.relativePath)).toLowerCase()))
            .filter(file => !testPattern.test(file.relativePath))
            .filter(file => !testedPathSeeds.has(this.testPathSeed(file.relativePath)))
            .sort((left, right) => left.relativePath.localeCompare(right.relativePath));
    }

    protected testPathSeed(relativePath: string): string {
        const parsed = path.posix.parse(relativePath.replace(/\\/g, '/'));
        return path.join(parsed.dir.replace(/(^|\/)(__tests__|tests?)(\/|$)/gi, '/'), parsed.name.replace(/(\.|-)(spec|test)$/i, '')).replace(/\\/g, '/').toLowerCase();
    }

    protected suggestContributorQuestions(request: {
        workspacePath: string;
        files: MemoryFile[];
        symbols: MemorySymbol[];
        relations: MemoryRelation[];
        codeChunks: MemoryCodeChunk[];
        memories: MemoryItem[];
        knowledgeGraphs: MemoryKnowledgeGraph[];
        changeImpacts: MemoryChangeImpact[];
    }): MemorySuggestedQuestion[] {
        const bundle = {
            files: request.files,
            symbols: request.symbols,
            relations: request.relations,
            codeChunks: request.codeChunks,
            memories: request.memories,
            knowledgeGraphs: request.knowledgeGraphs,
            changeImpacts: request.changeImpacts
        } as MemoryExportBundle;
        const questions: MemorySuggestedQuestion[] = [];
        const add = (question: Omit<MemorySuggestedQuestion, 'id'>): void => {
            const id = this.idFromPath('question', request.workspacePath, `${question.source}:${question.question}:${question.evidence}`);
            if (!questions.some(existing => existing.id === id || existing.question === question.question)) {
                questions.push({ id, ...question });
            }
        };
        const activeMemories = request.memories
            .filter(memory => memory.status === 'active')
            .sort((left, right) => (right.weight ?? 0) - (left.weight ?? 0) || this.memoryImportanceRank(right.importance) - this.memoryImportanceRank(left.importance));
        const topDecisionMemory = activeMemories.find(memory => memory.memoryType === 'project_decision');
        if (topDecisionMemory) {
            add({
                question: `Why was "${topDecisionMemory.title}" chosen, and what tradeoffs should a new contributor preserve?`,
                source: 'project-memory',
                scope: topDecisionMemory.scope,
                evidence: topDecisionMemory.evidence ?? `memory:${topDecisionMemory.id}`,
                reason: `High-value ${topDecisionMemory.scope} decision memory with ${topDecisionMemory.staleStatus} stale status.`,
                priority: 0.95
            });
        }
        const decisionConcept = this.reportConcepts(bundle, ['decision', 'constraint'])
            .sort((left, right) => (right.weight ?? 0) - (left.weight ?? 0))[0];
        if (decisionConcept) {
            add({
                question: `Which implementation paths are constrained by "${decisionConcept.title}"?`,
                source: 'decision',
                scope: 'workspace',
                evidence: decisionConcept.evidence ?? `knowledge-concept:${decisionConcept.id}`,
                reason: 'Decision or constraint concept from the Knowledge Graph.',
                priority: 0.9,
                uri: decisionConcept.uri
            });
        }
        const riskMemory = activeMemories.find(memory => memory.memoryType === 'bug_history' || memory.memoryType === 'security_note');
        const topRisk = [...request.changeImpacts].sort((left, right) => right.riskScore - left.riskScore)[0];
        if (topRisk || riskMemory) {
            add({
                question: `What is the first mitigation a new contributor should check for ${topRisk?.relativePath ?? riskMemory?.title ?? 'the highest risk area'}?`,
                source: 'risk',
                scope: riskMemory?.scope ?? 'workspace',
                evidence: topRisk ? `change-impact:${topRisk.id}:risk=${topRisk.riskScore}` : riskMemory?.evidence ?? `memory:${riskMemory?.id}`,
                reason: topRisk ? 'Highest stored change-impact risk.' : 'Active risk memory.',
                priority: 0.88,
                uri: topRisk?.relativePath
            });
        }
        const godNode = this.inferGodNodes(bundle)[0];
        if (godNode) {
            add({
                question: `What responsibilities does "${godNode.label}" centralize, and where are its boundaries documented?`,
                source: 'code-graph',
                scope: 'workspace',
                evidence: `graph-node:${godNode.id}:degree=${godNode.degree}`,
                reason: 'High-degree code graph node may be a key onboarding landmark.',
                priority: 0.82
            });
        }
        const docChunk = request.codeChunks
            .filter(chunk => ['markdown-section', 'text-block', 'json-block', 'yaml-block'].includes(chunk.chunkKind))
            .sort((left, right) => (right.estimatedTokens ?? 0) - (left.estimatedTokens ?? 0))[0];
        if (docChunk) {
            add({
                question: `Which setup, workflow, or architecture facts from ${docChunk.relativePath} should be read before changing code?`,
                source: 'local-docs',
                scope: 'workspace',
                evidence: `local-docs:${docChunk.id}`,
                reason: 'Indexed local documentation is available for onboarding context.',
                priority: 0.72,
                uri: docChunk.relativePath
            });
        }
        const knowledgeLink = request.knowledgeGraphs
            .flatMap(graph => graph.links.map(link => ({ graph, link })))
            .sort((left, right) => right.link.confidenceScore - left.link.confidenceScore)[0];
        if (knowledgeLink) {
            const source = knowledgeLink.graph.concepts.find(concept => concept.id === knowledgeLink.link.sourceConceptId);
            const target = knowledgeLink.graph.concepts.find(concept => concept.id === knowledgeLink.link.targetConceptId);
            if (source && target) {
                add({
                    question: `How does "${source.title}" ${knowledgeLink.link.linkKind.replace(/_/g, ' ')} "${target.title}" in practice?`,
                    source: 'knowledge-graph',
                    scope: knowledgeLink.graph.scope === 'global' ? 'global' : 'workspace',
                    evidence: knowledgeLink.link.evidence ?? `knowledge-link:${knowledgeLink.link.id}`,
                    reason: 'High-confidence Knowledge Graph relation connects onboarding concepts.',
                    priority: 0.7
                });
            }
        }
        if (!questions.length) {
            add({
                question: 'Which project decisions, risks, local docs, and graph landmarks should be reviewed first?',
                source: 'project-memory',
                scope: 'workspace',
                evidence: 'fallback:no-onboarding-signals',
                reason: 'Fallback question used when no indexed onboarding signals exist yet.',
                priority: 0.1
            });
        }
        return questions.sort((left, right) => right.priority - left.priority || left.question.localeCompare(right.question)).slice(0, 8);
    }

    async importWorkspaceData(bundle: MemoryExportBundle): Promise<MemoryWorkspaceImportResult> {
        const store = await this.readStore();
        const key = this.workspaceKey(bundle.workspacePath);
        const reindexedGraph = {
            files: store.files[key] ?? [],
            symbols: store.symbols[key] ?? [],
            relations: store.relations[key] ?? []
        };
        const memoryImportDiff = this.diffImportedMemories(store.memories, bundle.memories ?? [], bundle.workspacePath, {
            reindexedGraph,
            portableGraph: {
                files: bundle.files ?? [],
                symbols: bundle.symbols ?? [],
                relations: bundle.relations ?? []
            }
        });
        if (!store.settings[key]) {
            store.settings[key] = this.defaultSettings(bundle.workspacePath);
        }
        const importableMemoryIds = new Set(memoryImportDiff
            .filter(entry => entry.importable && entry.memoryId)
            .map(entry => entry.memoryId!));
        const importedMemories = (bundle.memories ?? [])
            .filter(memory => importableMemoryIds.has(memory.id))
            .map(memory => this.normalizeImportedMemoryForReview(memory, bundle.workspacePath));
        const importedMemoryIds = new Set(importedMemories.map(memory => memory.id));
        store.memories = [
            ...store.memories.filter(memory => !this.importedMemoryReplacesWorkspaceMemory(memory, importedMemoryIds)),
            ...importedMemories
        ];
        const importedMemorySpaces = (bundle.memorySpaces ?? [])
            .map(space => this.normalizeImportedMemorySpace(space, bundle.workspacePath));
        const existingMemorySpaceIds = new Set(store.memorySpaces.map(space => space.id));
        store.memorySpaces = [
            ...store.memorySpaces,
            ...importedMemorySpaces.filter(space => !existingMemorySpaceIds.has(space.id))
        ];
        store.memoryVectors = [
            ...store.memoryVectors.filter(vector => !importedMemoryIds.has(vector.memoryId)),
            ...(bundle.memoryVectors ?? [])
                .filter(vector => importedMemoryIds.has(vector.memoryId))
                .map(vector => this.normalizeImportedMemoryVector(vector, bundle.workspacePath))
                .filter(vector => this.memoryVectorIsRetrievable(vector))
        ];
        const importedKnowledgeGraphs = this.normalizeImportedKnowledgeGraphsForReview(bundle.knowledgeGraphs ?? [], bundle.workspacePath, store.knowledgeGraphs);
        const importedKnowledgeConceptCandidates = importedKnowledgeGraphs.reduce((sum, graph) => sum + graph.concepts.length, 0);
        const importedKnowledgeLinkCandidates = importedKnowledgeGraphs.reduce((sum, graph) => sum + graph.links.length, 0);
        store.knowledgeGraphs = [
            ...store.knowledgeGraphs,
            ...importedKnowledgeGraphs
        ];
        const existingSkillCandidateIds = new Set(store.skillCandidates.map(candidate => candidate.id));
        store.skillCandidates = [
            ...store.skillCandidates,
            ...(bundle.skillCandidates ?? [])
                .filter(candidate => !existingSkillCandidateIds.has(candidate.id))
                .map(candidate => ({ ...candidate, workspacePath: candidate.workspacePath ?? bundle.workspacePath }))
        ];
        const existingEventIds = new Set(store.events.map(event => event.id));
        store.events = [
            ...store.events,
            ...(bundle.events ?? [])
                .filter(event => !existingEventIds.has(event.id))
                .map(event => ({ ...event, workspacePath: bundle.workspacePath }))
        ];
        const existingFeedbackRecordIds = new Set(store.feedbackRecords.map(record => record.id));
        store.feedbackRecords = [
            ...store.feedbackRecords,
            ...(bundle.feedbackRecords ?? [])
                .filter(record => !existingFeedbackRecordIds.has(record.id))
                .map(record => ({ ...record, workspacePath: bundle.workspacePath }))
        ];
        this.recordAuditEvent(store, bundle.workspacePath, 'import.completed', {
            format: 'workspace-bundle',
            version: bundle.version,
            importedMemories: importedMemories.length,
            skippedMemories: memoryImportDiff.length - importedMemories.length,
            importedFiles: 0,
            importedKnowledgeGraphs: importedKnowledgeGraphs.length,
            importedKnowledgeConceptCandidates,
            importedKnowledgeLinkCandidates,
            importedFeedbackRecords: bundle.feedbackRecords?.length ?? 0
        });
        await this.writeStore(store);
        return {
            importedMemories: importedMemories.length,
            skippedMemories: memoryImportDiff.length - importedMemories.length,
            memoryDiff: memoryImportDiff,
            importedKnowledgeConceptCandidates,
            importedKnowledgeLinkCandidates
        };
    }

    async importGraphifyGraph(request: MemoryGraphifyImportRequest): Promise<MemoryGraphifyImportResult> {
        const warnings: string[] = [];
        const content = request.graphJson ?? await fs.readFile(this.resolveGraphifyGraphPath(request), 'utf8');
        let payload: unknown;
        try {
            payload = JSON.parse(content);
        } catch (error) {
            throw new Error(`Invalid Graphify graph JSON: ${error instanceof Error ? error.message : String(error)}`);
        }
        const graph = this.graphifyPayloadToKnowledgeGraph(payload, request.workspacePath, warnings);
        if (!graph.concepts.length) {
            return {
                importedKnowledgeConceptCandidates: 0,
                importedKnowledgeLinkCandidates: 0,
                skippedNodes: Number(graph.metadata?.skippedNodes ?? 0),
                skippedEdges: Number(graph.metadata?.skippedEdges ?? 0),
                diff: [],
                warnings: [...warnings, 'No importable Graphify nodes were found.']
            };
        }
        const store = await this.readStore();
        const key = this.workspaceKey(request.workspacePath);
        const diff = this.diffGraphifyImport(graph, store, request.workspacePath);
        const importableConceptIds = new Set(diff
            .filter(entry => entry.itemKind === 'concept' && entry.importable && entry.itemId)
            .map(entry => entry.itemId!));
        const importableLinkIds = new Set(diff
            .filter(entry => entry.itemKind === 'link' && entry.importable && entry.itemId)
            .map(entry => entry.itemId!));
        const importableGraph: MemoryKnowledgeGraph = {
            ...graph,
            concepts: graph.concepts.filter(concept => importableConceptIds.has(concept.id)),
            links: graph.links.filter(link => importableLinkIds.has(link.id) && importableConceptIds.has(link.sourceConceptId) && importableConceptIds.has(link.targetConceptId)),
            metadata: {
                ...(graph.metadata ?? {}),
                graphifyDiffTotal: diff.length,
                graphifyDiffSkipped: diff.filter(entry => !entry.importable).length,
                reindexedFileCount: store.files[key]?.length ?? 0
            }
        };
        if (importableGraph.concepts.length) {
            store.knowledgeGraphs.push(importableGraph);
            store.graphSnapshots.push(this.graphifyKnowledgeGraphSnapshot(request.workspacePath, importableGraph));
        } else {
            warnings.push('Graphify graph diff did not contain importable new items.');
        }
        this.recordAuditEvent(store, request.workspacePath, 'import.completed', {
            format: 'graphify-graph-json',
            importedKnowledgeGraphs: importableGraph.concepts.length ? 1 : 0,
            importedGraphSnapshots: importableGraph.concepts.length ? 1 : 0,
            importedKnowledgeConceptCandidates: importableGraph.concepts.length,
            importedKnowledgeLinkCandidates: importableGraph.links.length,
            skippedNodes: graph.metadata?.skippedNodes ?? 0,
            skippedEdges: graph.metadata?.skippedEdges ?? 0,
            diffNew: diff.filter(entry => entry.classification === 'new').length,
            diffDuplicate: diff.filter(entry => entry.classification === 'duplicate').length,
            diffConflicting: diff.filter(entry => entry.classification === 'conflicting').length,
            diffObsolete: diff.filter(entry => entry.classification === 'obsolete').length,
            diffSensitive: diff.filter(entry => entry.classification === 'sensitive').length
        });
        await this.writeStore(store);
        return {
            graphId: importableGraph.concepts.length ? importableGraph.id : undefined,
            importedKnowledgeConceptCandidates: importableGraph.concepts.length,
            importedKnowledgeLinkCandidates: importableGraph.links.length,
            skippedNodes: Number(graph.metadata?.skippedNodes ?? 0),
            skippedEdges: Number(graph.metadata?.skippedEdges ?? 0),
            diff,
            warnings
        };
    }

    protected diffGraphifyImport(
        graph: MemoryKnowledgeGraph,
        store: MemoryStoreData,
        workspacePath: string
    ): MemoryGraphifyImportDiffEntry[] {
        const key = this.workspaceKey(workspacePath);
        const localFilesByPath = new Map((store.files[key] ?? []).map(file => [this.normalizePortableGraphPath(file.relativePath), file]));
        const existingConcepts = store.knowledgeGraphs
            .filter(existing => this.knowledgeGraphInWorkspace(existing, workspacePath))
            .flatMap(existing => existing.concepts);
        const existingBySignature = new Map(existingConcepts.map(concept => [this.knowledgeConceptSignature(concept), concept]));
        const existingBySourceId = new Map(existingConcepts
            .filter(concept => concept.sourceId)
            .map(concept => [concept.sourceId!, concept]));
        const conceptDiff = graph.concepts.map(concept => this.graphifyConceptDiff(concept, existingBySignature, existingBySourceId, localFilesByPath));
        const conceptDiffById = new Map(conceptDiff.map(entry => [entry.itemId, entry]));
        const existingLinks = store.knowledgeGraphs
            .filter(existing => this.knowledgeGraphInWorkspace(existing, workspacePath))
            .flatMap(existing => existing.links);
        const linkDiff = graph.links.map(link => this.graphifyLinkDiff(link, graph, existingLinks, conceptDiffById));
        return [...conceptDiff, ...linkDiff];
    }

    protected graphifyConceptDiff(
        concept: MemoryKnowledgeConcept,
        existingBySignature: Map<string, MemoryKnowledgeConcept>,
        existingBySourceId: Map<string, MemoryKnowledgeConcept>,
        localFilesByPath: Map<string, MemoryFile>
    ): MemoryGraphifyImportDiffEntry {
        if (concept.metadata?.sensitiveInput === true) {
            return this.graphifyImportDiff(concept, 'concept', 'sensitive', false, 'Import skipped because the raw Graphify concept contains secret-like content.', undefined, typeof concept.metadata.redactionCount === 'number' ? concept.metadata.redactionCount : undefined);
        }
        const secretScan = this.scanner.scan({
            content: [concept.title, concept.summary, concept.uri, concept.evidence].filter(Boolean).join('\n'),
            sourceUri: `graphify:${concept.sourceId ?? concept.id}`
        });
        if (secretScan.findings.length) {
            return this.graphifyImportDiff(concept, 'concept', 'sensitive', false, 'Import skipped because the Graphify concept contains secret-like content.', undefined, secretScan.findings.length);
        }
        const referencedPath = this.graphifyConceptReferencedPath(concept);
        if (referencedPath) {
            const localFile = localFilesByPath.get(referencedPath);
            if (!localFile) {
                return this.graphifyImportDiff(concept, 'concept', 'obsolete', false, `Import skipped because Graphify references ${referencedPath}, which is absent from the reindexed local graph.`);
            }
            const importedHash = this.graphifyConceptContentHash(concept);
            if (importedHash && importedHash !== localFile.contentHash) {
                return this.graphifyImportDiff(concept, 'concept', 'conflicting', false, `Import skipped because Graphify evidence for ${referencedPath} conflicts with the reindexed local graph.`, localFile.id);
            }
            if (localFile.isSensitive) {
                return this.graphifyImportDiff(concept, 'concept', 'sensitive', false, `Import skipped because Graphify evidence for ${referencedPath} is marked sensitive.`, localFile.id);
            }
        }
        const sourceMatch = concept.sourceId ? existingBySourceId.get(concept.sourceId) : undefined;
        if (sourceMatch) {
            return this.graphifyImportDiff(concept, 'concept', this.knowledgeConceptSignature(sourceMatch) === this.knowledgeConceptSignature(concept) ? 'duplicate' : 'conflicting', false, 'Import skipped because a Knowledge Graph concept with the same Graphify source already exists.', sourceMatch.id);
        }
        const duplicate = existingBySignature.get(this.knowledgeConceptSignature(concept));
        if (duplicate) {
            return this.graphifyImportDiff(concept, 'concept', 'duplicate', false, 'Import skipped because an equivalent Knowledge Graph concept already exists.', duplicate.id);
        }
        return this.graphifyImportDiff(concept, 'concept', 'new', true, 'Graphify concept can be imported as a review candidate.');
    }

    protected diffImportedMemories(
        existingMemories: readonly MemoryItem[],
        importedMemories: readonly MemoryItem[],
        workspacePath: string,
        graphComparison?: {
            reindexedGraph: Pick<MemoryExportBundle, 'files' | 'symbols' | 'relations'>;
            portableGraph: Pick<MemoryExportBundle, 'files' | 'symbols' | 'relations'>;
        }
    ): MemoryImportDiffEntry[] {
        const existingById = new Map(existingMemories.map(memory => [memory.id, memory]));
        const existingBySignature = new Map(existingMemories.map(memory => [this.memorySignature(memory), memory]));
        const existingByTitleScope = new Map(existingMemories.map(memory => [this.memoryTitleScopeSignature(memory), memory]));
        const seenImportSignatures = new Map<string, string>();
        return importedMemories.map(memory => {
            try {
                const normalized = this.normalizeImportedMemory(memory, workspacePath);
                const secretScan = this.scanner.scan({
                    content: `${normalized.title}\n${normalized.content}`,
                    sourceUri: `memory:${normalized.id}`
                });
                if (secretScan.findings.length) {
                    return this.memoryImportDiff(normalized, 'sensitive', false, 'Import skipped because the memory contains secret-like content.', undefined, secretScan.findings.length);
                }
                if (!this.memoryService.isRetrievable(normalized)) {
                    return this.memoryImportDiff(normalized, 'not_importable', false, 'Import skipped because the temporary memory is expired.');
                }
                if (normalized.supersededBy || normalized.status === 'archived' || normalized.status === 'rejected' || normalized.status === 'blocked' || normalized.staleStatus === 'stale') {
                    return this.memoryImportDiff(normalized, 'obsolete', false, 'Import skipped because the memory is obsolete or no longer active.');
                }
                const signature = this.memorySignature(normalized);
                const duplicateImport = seenImportSignatures.get(signature);
                if (duplicateImport) {
                    return this.memoryImportDiff(normalized, 'duplicate', false, 'Import skipped because the bundle contains an equivalent memory.', duplicateImport);
                }
                seenImportSignatures.set(signature, normalized.id);
                const existing = existingById.get(normalized.id);
                if (existing) {
                    if (this.memorySignature(existing) === signature) {
                        return this.memoryImportDiff(normalized, 'duplicate', false, 'Import skipped because an equivalent memory already exists.', existing.id);
                    }
                    return this.memoryImportDiff(normalized, 'conflicting', false, 'Import skipped because a memory with the same id already exists with different content.', existing.id);
                }
                const duplicate = existingBySignature.get(signature);
                if (duplicate) {
                    return this.memoryImportDiff(normalized, 'duplicate', false, 'Import skipped because an equivalent memory already exists.', duplicate.id);
                }
                const conflict = existingByTitleScope.get(this.memoryTitleScopeSignature(normalized));
                if (conflict) {
                    return this.memoryImportDiff(normalized, 'conflicting', false, 'Import skipped because a memory with the same scope and title already exists with different content.', conflict.id);
                }
                const graphDiff = graphComparison ? this.importedMemoryGraphDiff(normalized, graphComparison) : undefined;
                if (graphDiff) {
                    return this.memoryImportDiff(normalized, graphDiff.classification, false, graphDiff.reason, graphDiff.existingMemoryId);
                }
                return this.memoryImportDiff(normalized, 'new', true, 'Memory can be imported as a review candidate.');
            } catch (error) {
                return {
                    memoryId: memory.id,
                    title: memory.title,
                    classification: 'not_importable',
                    importable: false,
                    reason: error instanceof Error ? error.message : 'Import skipped because the memory is invalid.'
                };
            }
        });
    }

    protected importedMemoryGraphDiff(
        memory: MemoryItem,
        graphComparison: {
            reindexedGraph: Pick<MemoryExportBundle, 'files' | 'symbols' | 'relations'>;
            portableGraph: Pick<MemoryExportBundle, 'files' | 'symbols' | 'relations'>;
        }
    ): Pick<MemoryImportDiffEntry, 'classification' | 'reason' | 'existingMemoryId'> | undefined {
        const portableFilesByPath = new Map(graphComparison.portableGraph.files.map(file => [this.normalizePortableGraphPath(file.relativePath), file]));
        const reindexedFilesByPath = new Map(graphComparison.reindexedGraph.files.map(file => [this.normalizePortableGraphPath(file.relativePath), file]));
        const referencedPaths = this.memoryReferencedGraphPaths(memory, portableFilesByPath);
        for (const relativePath of referencedPaths) {
            const portableFile = portableFilesByPath.get(relativePath);
            const reindexedFile = reindexedFilesByPath.get(relativePath);
            if (!reindexedFile) {
                return {
                    classification: 'obsolete',
                    reason: `Import skipped because graph evidence references ${relativePath}, which is absent from the reindexed local graph.`
                };
            }
            if (portableFile && portableFile.contentHash !== reindexedFile.contentHash) {
                return {
                    classification: 'conflicting',
                    reason: `Import skipped because graph evidence for ${relativePath} conflicts with the reindexed local graph.`
                };
            }
            if (reindexedFile.isSensitive || portableFile?.isSensitive) {
                return {
                    classification: 'sensitive',
                    reason: `Import skipped because graph evidence for ${relativePath} is marked sensitive.`
                };
            }
        }
        return undefined;
    }

    protected memoryReferencedGraphPaths(
        memory: MemoryItem,
        portableFilesByPath: Map<string, MemoryFile>
    ): string[] {
        const searchable = `${memory.title}\n${memory.content}\n${memory.evidence ?? ''}`.toLowerCase();
        return [...portableFilesByPath.keys()].filter(relativePath => searchable.includes(relativePath.toLowerCase()));
    }

    protected normalizePortableGraphPath(relativePath: string): string {
        return relativePath.replace(/\\/g, '/').replace(/^\/+/, '').toLowerCase();
    }

    protected memoryImportDiff(
        memory: MemoryItem,
        classification: MemoryImportDiffEntry['classification'],
        importable: boolean,
        reason: string,
        existingMemoryId?: string,
        redactionCount?: number
    ): MemoryImportDiffEntry {
        return {
            memoryId: memory.id,
            title: memory.title,
            classification,
            importable,
            reason,
            existingMemoryId,
            redactionCount
        };
    }

    protected resolveGraphifyGraphPath(request: MemoryGraphifyImportRequest): string {
        const graphPath = request.graphPath
            ? path.resolve(request.workspacePath, request.graphPath)
            : path.join(request.workspacePath, 'graphify-out', 'graph.json');
        const workspaceRoot = path.resolve(request.workspacePath);
        const relative = path.relative(workspaceRoot, graphPath);
        if (relative.startsWith('..') || path.isAbsolute(relative)) {
            throw new Error('Graphify graph import path must stay inside the workspace.');
        }
        return graphPath;
    }

    protected graphifyPayloadToKnowledgeGraph(payload: unknown, workspacePath: string, warnings: string[]): MemoryKnowledgeGraph {
        const source = this.asRecord(payload);
        const rawNodes = this.asArray(source.nodes ?? source.vertices);
        const rawEdges = this.asArray(source.edges ?? source.links ?? source.relationships);
        const now = new Date().toISOString();
        const graphId = this.idFromPath('kg', 'graphify', [workspacePath, now, rawNodes.length, rawEdges.length].join(':'));
        const nodeIdMap = new Map<string, string>();
        let skippedNodes = 0;
        const concepts = rawNodes.flatMap((node, index): MemoryKnowledgeConcept[] => {
            const record = this.asRecord(node);
            const rawId = this.firstString(record.id, record.key, record.name, record.label) ?? `node-${index}`;
            const title = this.firstString(record.label, record.name, record.title, record.id);
            if (!title) {
                skippedNodes++;
                return [];
            }
            const conceptId = this.idFromPath('kg-concept', graphId, rawId);
            nodeIdMap.set(rawId, conceptId);
            const rawSummary = this.firstString(record.summary, record.description, record.detail, record.path, record.file) ?? title;
            const rawSecretScan = this.scanner.scan({
                content: [title, rawSummary, this.firstString(record.uri, record.url, record.path, record.file), this.firstString(record.evidence, record.source, record.reason)].filter(Boolean).join('\n'),
                sourceUri: `graphify:${rawId}`
            });
            const summary = this.redactionService.redactText(rawSummary) ?? title;
            return [{
                id: conceptId,
                graphId,
                kind: this.graphifyConceptKind(this.firstString(record.kind, record.type, record.category)),
                title: this.redactionService.redactText(title) ?? title,
                summary,
                status: 'candidate',
                sourceKind: 'knowledge-graph',
                sourceId: rawId,
                uri: this.redactionService.redactText(this.firstString(record.uri, record.url, record.path, record.file)),
                evidence: this.redactionService.redactText(this.firstString(record.evidence, record.source, record.reason)),
                tags: this.graphifyTags(record),
                weight: this.numberInRange(record.weight, 0, 1) ?? 0.5,
                metadata: {
                    importedFrom: 'graphify-out/graph.json',
                    originMarkers: ['imported-graphify', 'import:graphify-out/graph.json'],
                    reviewRequired: true,
                    originalId: rawId,
                    ...(rawSecretScan.findings.length ? { sensitiveInput: true, redactionCount: rawSecretScan.findings.length } : {}),
                    ...(this.firstString(record.path, record.file, record.relativePath) ? { path: this.firstString(record.path, record.file, record.relativePath)! } : {}),
                    ...(this.firstString(record.contentHash, record.hash, record.sha256) ? { contentHash: this.firstString(record.contentHash, record.hash, record.sha256)! } : {})
                },
                createdAt: now,
                updatedAt: now
            }];
        });
        let skippedEdges = 0;
        const links = rawEdges.flatMap((edge, index): MemoryKnowledgeLink[] => {
            const record = this.asRecord(edge);
            const sourceId = this.firstString(record.source, record.sourceId, record.from, record.src);
            const targetId = this.firstString(record.target, record.targetId, record.to, record.dst);
            const sourceConceptId = sourceId ? nodeIdMap.get(sourceId) : undefined;
            const targetConceptId = targetId ? nodeIdMap.get(targetId) : undefined;
            const originalRelation = this.firstString(record.id, record.key, record.kind, record.type, record.relation, record.relationship, record.label);
            if (!sourceConceptId || !targetConceptId) {
                skippedEdges++;
                return [];
            }
            const confidenceScore = this.numberInRange(record.confidence, 0, 1) ?? this.numberInRange(record.weight, 0, 1) ?? 0.5;
            return [{
                id: this.idFromPath('kg-link', graphId, [sourceId, targetId, index, originalRelation ?? 'related_to'].join(':')),
                graphId,
                sourceConceptId,
                targetConceptId,
                linkKind: this.graphifyLinkKind(this.firstString(record.kind, record.type, record.relation, record.relationship)),
                status: 'candidate',
                label: this.redactionService.redactText(this.firstString(record.label, record.name)),
                confidenceScore,
                evidence: this.redactionService.redactText(this.firstString(record.evidence, record.reason, record.source)),
                metadata: {
                    importedFrom: 'graphify-out/graph.json',
                    originMarkers: ['imported-graphify', 'import:graphify-out/graph.json'],
                    reviewRequired: true,
                    source: 'graphify',
                    originalRelation: this.redactionService.redactText(originalRelation) ?? 'related_to',
                    originalSourceId: sourceId ?? '',
                    originalTargetId: targetId ?? '',
                    importedConfidenceScore: confidenceScore
                },
                createdAt: now,
                updatedAt: now
            }];
        });
        if (!rawNodes.length) {
            warnings.push('Graphify graph JSON did not contain a nodes array.');
        }
        return {
            id: graphId,
            workspacePath,
            scope: 'workspace',
            title: this.redactionService.redactText(this.firstString(source.title, source.name) ?? 'Graphify Imported Graph') ?? 'Graphify Imported Graph',
            description: 'Review candidates imported from graphify-out/graph.json. Graphify is not required at runtime.',
            status: 'active',
            tags: ['graphify-import', 'review-candidates'],
            concepts,
            links,
            metadata: {
                importedFrom: 'graphify-out/graph.json',
                originMarkers: ['imported-graphify', 'import:graphify-out/graph.json'],
                reviewRequired: true,
                skippedNodes,
                skippedEdges
            },
            createdAt: now,
            updatedAt: now
        };
    }

    protected graphifyKnowledgeGraphSnapshot(workspacePath: string, graph: MemoryKnowledgeGraph): MemoryGraphSnapshot {
        const importedGraph = this.knowledgeGraphService.toGraph(graph);
        return this.graphSnapshot(workspacePath, 'Graphify Imported Graph', {
            ...importedGraph,
            id: `${graph.id}:snapshot`,
            kind: 'knowledge',
            scope: graph.scope,
            workspacePath,
            generatedAt: graph.updatedAt,
            metadata: {
                importedFrom: 'graphify-out/graph.json',
                originMarkers: ['imported-graphify', 'import:graphify-out/graph.json'],
                reviewRequired: true
            },
            edges: importedGraph.edges.map(edge => {
                const link = graph.links.find(candidate => candidate.id === edge.id);
                return {
                    ...edge,
                    label: link?.label,
                    metadata: {
                        ...(edge.metadata ?? {}),
                        importedFrom: 'graphify-out/graph.json',
                        originMarkers: ['imported-graphify', 'import:graphify-out/graph.json'],
                        originalRelation: String(link?.metadata?.originalRelation ?? link?.linkKind ?? edge.relationType),
                        source: 'graphify'
                    }
                };
            })
        }, graph.updatedAt);
    }

    protected graphifyLinkDiff(
        link: MemoryKnowledgeLink,
        graph: MemoryKnowledgeGraph,
        existingLinks: readonly MemoryKnowledgeLink[],
        conceptDiffById: Map<string | undefined, MemoryGraphifyImportDiffEntry>
    ): MemoryGraphifyImportDiffEntry {
        const title = this.graphifyLinkTitle(link, graph);
        const blockedEndpoint = [conceptDiffById.get(link.sourceConceptId), conceptDiffById.get(link.targetConceptId)]
            .find(entry => entry && !entry.importable);
        if (blockedEndpoint) {
            return {
                itemId: link.id,
                title,
                itemKind: 'link',
                classification: blockedEndpoint.classification,
                importable: false,
                reason: `Import skipped because linked Graphify concept is ${blockedEndpoint.classification}.`,
                existingItemId: blockedEndpoint.existingItemId,
                redactionCount: blockedEndpoint.redactionCount
            };
        }
        const secretScan = this.scanner.scan({
            content: [link.label, link.evidence, String(link.metadata?.originalRelation ?? '')].filter(Boolean).join('\n'),
            sourceUri: `graphify:${link.id}`
        });
        if (secretScan.findings.length) {
            return {
                itemId: link.id,
                title,
                itemKind: 'link',
                classification: 'sensitive',
                importable: false,
                reason: 'Import skipped because the Graphify link contains secret-like content.',
                redactionCount: secretScan.findings.length
            };
        }
        const signature = this.knowledgeLinkSignature(link);
        const duplicate = existingLinks.find(existing => this.knowledgeLinkSignature(existing) === signature);
        if (duplicate) {
            return {
                itemId: link.id,
                title,
                itemKind: 'link',
                classification: 'duplicate',
                importable: false,
                reason: 'Import skipped because an equivalent Knowledge Graph link already exists.',
                existingItemId: duplicate.id
            };
        }
        return {
            itemId: link.id,
            title,
            itemKind: 'link',
            classification: 'new',
            importable: true,
            reason: 'Graphify link can be imported as a review candidate.'
        };
    }

    protected graphifyImportDiff(
        concept: MemoryKnowledgeConcept,
        itemKind: 'concept',
        classification: MemoryGraphifyImportDiffEntry['classification'],
        importable: boolean,
        reason: string,
        existingItemId?: string,
        redactionCount?: number
    ): MemoryGraphifyImportDiffEntry {
        return {
            itemId: concept.id,
            title: concept.title,
            itemKind,
            classification,
            importable,
            reason,
            existingItemId,
            redactionCount
        };
    }

    protected knowledgeConceptSignature(concept: MemoryKnowledgeConcept): string {
        return [concept.kind, concept.title, concept.summary].map(value => String(value ?? '').trim().toLowerCase()).join('\u001f');
    }

    protected knowledgeLinkSignature(link: MemoryKnowledgeLink): string {
        return [link.sourceConceptId, link.targetConceptId, link.linkKind, link.label ?? ''].map(value => String(value ?? '').trim().toLowerCase()).join('\u001f');
    }

    protected graphifyConceptReferencedPath(concept: MemoryKnowledgeConcept): string | undefined {
        const metadataPath = this.firstString(concept.metadata?.path, concept.metadata?.file, concept.metadata?.relativePath);
        const candidate = metadataPath ?? concept.uri;
        if (!candidate) {
            return undefined;
        }
        const normalized = this.normalizePortableGraphPath(candidate.replace(/^file:\/\//, ''));
        return normalized.includes('.') ? normalized : undefined;
    }

    protected graphifyConceptContentHash(concept: MemoryKnowledgeConcept): string | undefined {
        return this.firstString(concept.metadata?.contentHash, concept.metadata?.hash, concept.metadata?.sha256);
    }

    protected graphifyLinkTitle(link: MemoryKnowledgeLink, graph: MemoryKnowledgeGraph): string {
        const source = graph.concepts.find(concept => concept.id === link.sourceConceptId)?.title ?? link.sourceConceptId;
        const target = graph.concepts.find(concept => concept.id === link.targetConceptId)?.title ?? link.targetConceptId;
        return `${source} ${link.linkKind} ${target}`;
    }

    protected asRecord(value: unknown): Record<string, unknown> {
        return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
    }

    protected asArray(value: unknown): unknown[] {
        return Array.isArray(value) ? value : [];
    }

    protected firstString(...values: unknown[]): string | undefined {
        return values.find((value): value is string => typeof value === 'string' && !!value.trim())?.trim();
    }

    protected numberInRange(value: unknown, min: number, max: number): number | undefined {
        return typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : undefined;
    }

    protected graphifyTags(record: Record<string, unknown>): string[] {
        const tags = this.asArray(record.tags).filter((tag): tag is string => typeof tag === 'string' && !!tag.trim());
        const type = this.firstString(record.kind, record.type, record.category);
        return [...new Set(['graphify-import', type, ...tags].filter((tag): tag is string => !!tag))];
    }

    protected graphifyConceptKind(value: string | undefined): MemoryKnowledgeConceptKind {
        const normalized = value?.toLowerCase().replace(/[-\s]+/g, '_');
        if (normalized === 'file' || normalized === 'component' || normalized === 'document' || normalized === 'decision' || normalized === 'constraint' || normalized === 'risk' || normalized === 'todo' || normalized === 'preference' || normalized === 'skill' || normalized === 'memory') {
            return normalized;
        }
        return 'concept';
    }

    protected graphifyLinkKind(value: string | undefined): MemoryKnowledgeLink['linkKind'] {
        const normalized = value?.toLowerCase().replace(/[-\s]+/g, '_');
        if (normalized === 'depends_on' || normalized === 'implements' || normalized === 'documents' || normalized === 'supports' || normalized === 'contradicts' || normalized === 'replaces' || normalized === 'conflicts_with' || normalized === 'blocks' || normalized === 'derived_from') {
            return normalized;
        }
        return 'related_to';
    }

    async importIcmData(request: MemoryIcmImportRequest): Promise<MemoryIcmImportResult> {
        const store = await this.readStore();
        const key = this.workspaceKey(request.workspacePath);
        const now = new Date().toISOString();
        const importedMemories = this.icmBridgeService.toMemoryItems({
            workspacePath: request.workspacePath,
            memories: request.data.memories ?? [],
            activate: request.activateMemories,
            now,
            idFactory: (prefix, seed) => this.idFromPath(prefix, 'icm', `${request.workspacePath}:${seed}`)
        }).map(memory => this.memoryService.normalize(memory));
        const existingMemorySignatures = new Set(store.memories
            .filter(memory => !memory.workspacePath || this.workspaceKey(memory.workspacePath) === key)
            .map(memory => this.memorySignature(memory)));
        const uniqueMemories = importedMemories.filter(memory => {
            const signature = this.memorySignature(memory);
            if (existingMemorySignatures.has(signature)) {
                return false;
            }
            existingMemorySignatures.add(signature);
            return true;
        });
        const importedGraphs = this.icmBridgeService.memoirsToKnowledgeGraphs({
            workspacePath: request.workspacePath,
            memoirs: request.data.memoirs ?? [],
            now,
            idFactory: (prefix, seed) => this.idFromPath(prefix, 'icm', `${request.workspacePath}:${seed}`)
        });
        store.memories.push(...uniqueMemories);
        store.knowledgeGraphs = [
            ...store.knowledgeGraphs.filter(graph => !importedGraphs.some(imported => imported.id === graph.id)),
            ...importedGraphs
        ];
        store.events.push({
            id: this.id('event'),
            workspacePath: request.workspacePath,
            eventType: 'memory.suggested',
            payload: JSON.stringify({
                source: 'icm',
                importedMemories: uniqueMemories.length,
                importedMemoirs: importedGraphs.length,
                activateMemories: !!request.activateMemories
            }),
            createdAt: now
        });
        this.recordAuditEvent(store, request.workspacePath, 'import.completed', {
            format: 'icm-bridge',
            importedMemories: uniqueMemories.length,
            importedMemoirs: importedGraphs.length,
            deduplicatedMemories: importedMemories.length - uniqueMemories.length,
            activateMemories: !!request.activateMemories
        }, now);
        await this.writeStore(store);
        return {
            importedMemories: uniqueMemories.length,
            importedMemoirs: importedGraphs.length,
            deduplicatedMemories: importedMemories.length - uniqueMemories.length,
            limits: [...this.icmBridgeServiceLimits()]
        };
    }

    async exportIcmData(request: MemoryIcmExportRequest): Promise<MemoryIcmBridgeBundle> {
        const store = await this.readStore();
        const key = this.workspaceKey(request.workspacePath);
        const memories = store.memories
            .filter(memory => !memory.workspacePath || this.workspaceKey(memory.workspacePath) === key)
            .filter(memory => request.includeArchived || memory.status === 'active' || memory.status === 'candidate');
        const graphs = store.knowledgeGraphs.filter(graph => this.knowledgeGraphInWorkspace(graph, request.workspacePath));
        const exportedAt = new Date().toISOString();
        const bundle = this.icmBridgeService.exportBundle({
            workspacePath: request.workspacePath,
            memories,
            graphs,
            exportedAt
        });
        this.recordAuditEvent(store, request.workspacePath, 'export.created', {
            format: 'icm-bridge',
            includeArchived: !!request.includeArchived,
            memoryCount: memories.length,
            memoirCount: graphs.length
        }, exportedAt);
        await this.writeStore(store);
        return bundle;
    }

    protected memorySignature(memory: MemoryItem): string {
        return [
            memory.scope,
            this.workspaceKey(memory.workspacePath ?? ''),
            memory.memoryType,
            memory.title.trim().toLowerCase(),
            memory.content.trim().toLowerCase()
        ].join('\n');
    }

    protected memoryTitleScopeSignature(memory: MemoryItem): string {
        return [
            memory.scope,
            this.workspaceKey(memory.workspacePath ?? ''),
            memory.memoryType,
            memory.title.trim().toLowerCase()
        ].join('\n');
    }

    protected icmBridgeServiceLimits(): readonly string[] {
        return MEMORY_ICM_LIMITS;
    }

    protected async recordMemoryRetrievalAccess(workspacePath: string, results: RetrievalResult[]): Promise<void> {
        const memoryIds = new Set(results
            .filter(result => result.sourceKind === 'project-memory' || result.sourceKind === 'repository-memory' || result.sourceKind === 'task-memory')
            .map(result => result.id));
        if (!memoryIds.size) {
            return;
        }
        const store = await this.readStore();
        let changed = false;
        store.memories = store.memories.map(memory => {
            if (!memoryIds.has(memory.id)) {
                return memory;
            }
            changed = true;
            const updated = this.memoryService.recordAccess(memory);
            this.recordMemoryAuditEvent(store, 'memory.accessed', updated, updated.updatedAt, {
                source: 'retrieval',
                previousAccessCount: memory.accessCount,
                nextAccessCount: updated.accessCount,
                previousWeight: this.safeNumber(memory.weight),
                nextWeight: this.safeNumber(updated.weight)
            }, workspacePath);
            return updated;
        });
        if (changed) {
            await this.writeStore(store);
        }
    }

    protected vectorStatus(store: MemoryStore, workspacePath: string): MemoryVectorStatus {
        const key = this.workspaceKey(workspacePath);
        const settings = this.normalizeSettings(workspacePath, store.settings[key]);
        const vectorSettings = settings.vectorSearch ?? this.defaultVectorSettings();
        const memories = this.vectorEligibleMemories(store, workspacePath);
        const vectors = store.memoryVectors.filter(vector =>
            this.vectorBelongsToWorkspace(vector, key)
            && vector.modelId === vectorSettings.localModelId
            && vector.dimensions === vectorSettings.dimensions
        );
        const vectorMemoryIds = new Set(vectors.map(vector => vector.memoryId));
        return {
            workspacePath,
            enabled: vectorSettings.enabled,
            consented: !!vectorSettings.userConsentAt,
            backend: typeof (this.repository as Partial<MemoryStoreRepository>).searchMemoryVectors === 'function' ? 'sqlite-local' : 'json',
            userConsentAt: vectorSettings.userConsentAt,
            localModelId: vectorSettings.localModelId,
            dimensions: vectorSettings.dimensions,
            backfillStatus: vectorSettings.backfillStatus,
            backfilledAt: vectorSettings.backfilledAt,
            lastError: vectorSettings.lastError,
            totalMemories: memories.length,
            totalVectors: vectors.length,
            pendingMemories: memories.filter(memory => !vectorMemoryIds.has(memory.id) || this.memoryVectorContentHash(memory) !== vectors.find(vector => vector.memoryId === memory.id)?.contentHash).length,
            updatedAt: settings.updatedAt
        };
    }

    protected vectorEligibleMemories(store: MemoryStore, workspacePath: string): MemoryItem[] {
        const key = this.workspaceKey(workspacePath);
        return store.memories
            .filter(memory => memory.status === 'active' || memory.status === 'candidate')
            .filter(memory => this.memoryService.isRetrievable(memory))
            .filter(memory => !memory.workspacePath || this.workspaceKey(memory.workspacePath) === key)
            .filter(memory => !this.memoryContainsSecret(memory));
    }

    protected buildMemoryVectors(store: MemoryStore, workspacePath: string, settings: MemoryVectorSettings, now: string): MemoryVector[] {
        const dimensions = this.vectorService.normalizeDimensions(settings.dimensions);
        return this.vectorEligibleMemories(store, workspacePath).map(memory => this.toMemoryVector(memory, settings.localModelId, dimensions, now));
    }

    protected upsertMemoryVectorIfEnabled(store: MemoryStore, memory: MemoryItem, fallbackWorkspacePath: string | undefined): void {
        const workspacePath = memory.workspacePath ?? fallbackWorkspacePath;
        if (!workspacePath) {
            return;
        }
        const key = this.workspaceKey(workspacePath);
        const settings = this.normalizeSettings(workspacePath, store.settings[key]).vectorSearch ?? this.defaultVectorSettings();
        store.memoryVectors = store.memoryVectors.filter(vector => vector.memoryId !== memory.id);
        if (!settings.enabled || !settings.userConsentAt || (memory.status !== 'active' && memory.status !== 'candidate') || !this.memoryService.isRetrievable(memory) || this.memoryContainsSecret(memory)) {
            return;
        }
        const now = new Date().toISOString();
        const vector = this.toMemoryVector(memory, settings.localModelId, this.vectorService.normalizeDimensions(settings.dimensions), now);
        store.memoryVectors.push(vector);
        this.recordAuditEvent(store, workspacePath, 'embedding.generated', {
            memoryId: memory.id,
            vectorId: vector.id,
            scope: memory.scope,
            modelId: vector.modelId,
            dimensions: vector.dimensions,
            contentHash: vector.contentHash
        }, now);
    }

    protected toMemoryVector(memory: MemoryItem, modelId: string, dimensions: number, now: string): MemoryVector {
        const embedding = this.vectorService.embedMemory(memory, dimensions);
        return {
            id: this.idFromPath('mem-vector', memory.id, `${modelId}:${dimensions}`),
            memoryId: memory.id,
            workspacePath: memory.workspacePath,
            scope: memory.scope,
            repositoryUrl: memory.repositoryUrl,
            repositoryId: memory.repositoryId,
            sessionId: memory.sessionId,
            taskId: memory.taskId,
            expiresAt: memory.expiresAt,
            modelId,
            dimensions,
            contentHash: this.memoryVectorContentHash(memory),
            vector: embedding.vector,
            createdAt: now,
            updatedAt: now
        };
    }

    protected memoryVectorContentHash(memory: MemoryItem): string {
        return this.vectorService.contentHash(this.vectorService.memoryContent(memory));
    }

    protected memoryContainsSecret(memory: MemoryItem): boolean {
        return this.scanner.scan({
            content: this.vectorService.memoryContent(memory),
            sourceUri: memory.workspacePath,
            maxFindings: 1
        }).findings.length > 0;
    }

    protected vectorBelongsToWorkspace(vector: MemoryVector, workspaceKey: string): boolean {
        return !vector.workspacePath || this.workspaceKey(vector.workspacePath) === workspaceKey;
    }

    protected memoryVectorIsRetrievable(vector: MemoryVector): boolean {
        if (vector.scope !== 'session' && vector.scope !== 'task') {
            return true;
        }
        if (!vector.expiresAt) {
            return true;
        }
        const expiresAt = Date.parse(vector.expiresAt);
        return Number.isNaN(expiresAt) || expiresAt > Date.now();
    }

    protected repositoryExportLocators(
        memories: MemoryItem[],
        workspaceKey: string,
        currentRepository?: { repositoryUrl?: string; repositoryId?: string }
    ): { repositoryUrls: Set<string>; repositoryIds: Set<string> } {
        const repositoryUrls = new Set<string>();
        const repositoryIds = new Set<string>();
        for (const memory of memories) {
            if (memory.scope !== 'repository' || !memory.workspacePath || this.workspaceKey(memory.workspacePath) !== workspaceKey) {
                continue;
            }
            if (memory.repositoryUrl) {
                repositoryUrls.add(memory.repositoryUrl);
            }
            if (memory.repositoryId) {
                repositoryIds.add(memory.repositoryId);
            }
        }
        if (currentRepository?.repositoryUrl) {
            repositoryUrls.add(currentRepository.repositoryUrl);
        }
        if (currentRepository?.repositoryId) {
            repositoryIds.add(currentRepository.repositoryId);
        }
        return { repositoryUrls, repositoryIds };
    }

    protected memoryScopeBelongsInWorkspaceExport(
        item: { scope?: string; workspacePath?: string; repositoryUrl?: string; repositoryId?: string; sessionId?: string; taskId?: string },
        options: {
            workspacePath: string;
            workspaceKey: string;
            includeGlobalMemories: boolean;
            includeEphemeralMemories: boolean;
            repositoryLocators: { repositoryUrls: Set<string>; repositoryIds: Set<string> };
        }
    ): boolean {
        switch (item.scope) {
            case 'global':
                return options.includeGlobalMemories;
            case 'repository':
                return (!!item.workspacePath && this.workspaceKey(item.workspacePath) === options.workspaceKey)
                    || (!!item.repositoryUrl && options.repositoryLocators.repositoryUrls.has(item.repositoryUrl))
                    || (!!item.repositoryId && options.repositoryLocators.repositoryIds.has(item.repositoryId));
            case 'session':
            case 'task':
                return options.includeEphemeralMemories
                    && !!item.workspacePath
                    && this.workspaceKey(item.workspacePath) === options.workspaceKey;
            case 'workspace':
            default:
                return !!item.workspacePath && this.workspaceKey(item.workspacePath) === options.workspaceKey;
        }
    }

    protected normalizeImportedMemory(memory: MemoryItem, workspacePath: string): MemoryItem {
        const workspaceScoped = memory.scope === 'workspace' || !memory.scope;
        return this.memoryService.normalize({
            ...memory,
            workspacePath: memory.scope === 'global'
                ? undefined
                : memory.scope === 'repository'
                    ? undefined
                : workspaceScoped
                    ? memory.workspacePath ?? workspacePath
                    : memory.workspacePath
        });
    }

    protected normalizeImportedMemoryForReview(memory: MemoryItem, workspacePath: string): MemoryItem {
        const normalized = this.normalizeImportedMemory(memory, workspacePath);
        return this.memoryService.normalize({
            ...normalized,
            status: 'candidate',
            staleStatus: normalized.staleStatus === 'stale' ? 'unknown' : normalized.staleStatus,
            originMarkers: [
                ...(normalized.originMarkers ?? []),
                'imported-portable',
                'import:portable-pack',
                `import:${normalized.scope}`
            ]
        });
    }

    protected normalizeImportedMemorySpace(space: MemorySpace, workspacePath: string): MemorySpace {
        const workspaceScoped = space.scope === 'workspace' || !space.scope;
        return {
            ...space,
            workspacePath: space.scope === 'global'
                ? undefined
                : space.scope === 'repository'
                    ? undefined
                : workspaceScoped
                    ? space.workspacePath ?? workspacePath
                    : space.workspacePath
        };
    }

    protected normalizeImportedMemoryVector(vector: MemoryVector, workspacePath: string): MemoryVector {
        const workspaceScoped = vector.scope === 'workspace' || !vector.scope;
        return {
            ...vector,
            workspacePath: vector.scope === 'global'
                ? undefined
                : vector.scope === 'repository'
                    ? undefined
                : workspaceScoped
                    ? vector.workspacePath ?? workspacePath
                : vector.workspacePath
        };
    }

    protected normalizeImportedKnowledgeGraphsForReview(
        graphs: MemoryKnowledgeGraph[],
        workspacePath: string,
        existingGraphs: MemoryKnowledgeGraph[]
    ): MemoryKnowledgeGraph[] {
        const usedGraphIds = new Set(existingGraphs.map(graph => graph.id));
        return graphs.map(graph => {
            const graphId = usedGraphIds.has(graph.id)
                ? this.idFromPath('kg_import', workspacePath, graph.id)
                : graph.id;
            usedGraphIds.add(graphId);
            return this.normalizeImportedKnowledgeGraphForReview(graph, workspacePath, graphId);
        });
    }

    protected normalizeImportedKnowledgeGraphForReview(graph: MemoryKnowledgeGraph, workspacePath: string, graphId = graph.id): MemoryKnowledgeGraph {
        const graphWorkspacePath = graph.scope === 'global' ? undefined : workspacePath;
        return {
            ...graph,
            id: graphId,
            workspacePath: graphWorkspacePath,
            metadata: this.importedKnowledgeMetadata(graph.metadata, graph.scope),
            concepts: (graph.concepts ?? []).map(concept => ({
                ...concept,
                graphId,
                status: 'candidate',
                metadata: this.importedKnowledgeMetadata(concept.metadata, graph.scope)
            })),
            links: (graph.links ?? []).map(link => ({
                ...link,
                graphId,
                status: 'candidate',
                metadata: this.importedKnowledgeMetadata(link.metadata, graph.scope)
            }))
        };
    }

    protected importedKnowledgeMetadata(
        metadata: MemoryKnowledgeGraph['metadata'] | MemoryKnowledgeConcept['metadata'] | MemoryKnowledgeLink['metadata'] | undefined,
        scope: MemoryKnowledgeGraph['scope']
    ): Record<string, string | number | boolean | string[]> {
        const originMarkers = Array.from(new Set([
            ...((metadata?.originMarkers as string[] | undefined) ?? []),
            'imported-portable',
            'import:portable-pack',
            `import:${scope}`
        ]));
        return {
            ...(metadata ?? {}),
            originMarkers,
            reviewRequired: true,
            reviewSource: 'portable-package'
        };
    }

    protected normalizeExportedMemory(memory: MemoryItem): MemoryItem {
        const normalized = memory.scope === 'repository'
            ? { ...memory, workspacePath: undefined }
            : memory;
        return this.redactExportedRecord(normalized) as MemoryItem;
    }

    protected normalizeExportedMemorySpace(space: MemorySpace): MemorySpace {
        return space.scope === 'repository'
            ? { ...space, workspacePath: undefined }
            : space;
    }

    protected normalizeExportedMemoryVector(vector: MemoryVector): MemoryVector {
        return vector.scope === 'repository'
            ? { ...vector, workspacePath: undefined }
            : vector;
    }

    protected normalizeExportedKnowledgeGraph(graph: MemoryKnowledgeGraph): MemoryKnowledgeGraph {
        return this.redactExportedRecord(graph) as MemoryKnowledgeGraph;
    }

    protected redactExportedRecord<T>(record: T): T {
        return this.redactionService.redactJson(this.scannerRedactJson(record)) as T;
    }

    protected scannerRedactJson(value: unknown): unknown {
        if (typeof value === 'string') {
            return this.redactHighEntropyText(this.scanner.scan({ content: value }).redactedContent);
        }
        if (Array.isArray(value)) {
            return value.map(item => this.scannerRedactJson(item));
        }
        if (value && typeof value === 'object') {
            const result: Record<string, unknown> = {};
            for (const [key, item] of Object.entries(value)) {
                result[key] = this.scannerRedactJson(item);
            }
            return result;
        }
        return value;
    }

    protected redactHighEntropyText(value: string): string {
        return value.replace(/(?=[A-Za-z0-9_=-]{32,})(?=[A-Za-z0-9_=-]*[0-9=])[A-Za-z0-9_=-]{32,}/g, token => `${token.slice(0, 6)}********${token.slice(-4)}`);
    }

    protected knowledgeGraphBelongsInWorkspaceExport(graph: MemoryKnowledgeGraph, workspacePath: string, includeGlobalKnowledge: boolean): boolean {
        if (graph.scope === 'global') {
            return includeGlobalKnowledge;
        }
        return this.workspaceKey(graph.workspacePath ?? '') === this.workspaceKey(workspacePath);
    }

    protected importedMemoryReplacesWorkspaceMemory(memory: MemoryItem, importedMemoryIds: Set<string>): boolean {
        return importedMemoryIds.has(memory.id);
    }

    protected promptSignatureFromEvent(request: MemoryEventRecordRequest): string | undefined {
        if (request.promptSignature) {
            return request.promptSignature;
        }
        if (request.eventType !== 'prompt.submitted' || !request.payload) {
            return undefined;
        }
        try {
            const payload = JSON.parse(request.payload) as { prompt?: string; promptSignature?: string; normalizedSignature?: string; signature?: string };
            return payload.promptSignature
                ?? payload.normalizedSignature
                ?? payload.signature
                ?? (payload.prompt ? this.promptNormalizer.normalize({ prompt: payload.prompt, workspaceRoot: request.workspacePath }).signature : undefined);
        } catch {
            return this.promptNormalizer.normalize({ prompt: request.payload, workspaceRoot: request.workspacePath }).signature;
        }
    }

    protected memoryProposalTextFromEvent(event: MemoryEvent): string | undefined {
        const canContainMemorySignal = event.eventType === 'prompt.submitted'
            || event.eventType === 'agent.completed'
            || event.eventType === 'terminal.command';
        if (!canContainMemorySignal || !event.payload) {
            return undefined;
        }
        try {
            const payload = JSON.parse(event.payload) as Record<string, unknown>;
            for (const key of ['prompt', 'text', 'content', 'message', 'command']) {
                const value = payload[key];
                if (typeof value === 'string' && value.trim()) {
                    return value;
                }
            }
            return event.payload;
        } catch {
            return event.payload;
        }
    }

    protected feedbackRequestFromEvent(event: MemoryEvent): MemoryFeedbackRequest | undefined {
        if (event.eventType !== 'context.accepted' && event.eventType !== 'context.rejected') {
            return undefined;
        }
        const payload = this.parseJsonObject(event.payload);
        const targetId = this.stringFromPayload(payload, 'id') ?? this.stringFromPayload(payload, 'itemId');
        if (!targetId) {
            return undefined;
        }
        const sourceKind = this.sourceKindFromPayload(payload, 'sourceKind');
        return {
            workspacePath: event.workspacePath,
            promptSignature: event.promptSignature,
            targetKind: 'context-suggestion',
            targetId,
            targetSourceKind: sourceKind,
            targetUri: this.stringFromPayload(payload, 'uri'),
            targetTitle: this.stringFromPayload(payload, 'title'),
            feedback: event.eventType === 'context.accepted' ? 'accepted' : 'rejected',
            reason: this.stringFromPayload(payload, 'reason') ?? this.stringFromPayload(payload, 'status'),
            evidence: this.stringFromPayload(payload, 'evidence') ?? event.payload,
            metadata: {
                estimatedTokens: this.numberFromPayload(payload, 'estimatedTokens') ?? 0,
                correction: this.stringFromPayload(payload, 'correction') ?? ''
            }
        };
    }

    protected normalizeFeedbackRequest(request: MemoryFeedbackRequest): MemoryFeedbackRequest {
        const payload = this.parseJsonObject((request as MemoryFeedbackRequest & { payload?: string }).payload);
        const compatibility = request as MemoryFeedbackRequest & {
            outcome?: string;
            sourceKind?: MemorySourceKind;
            correction?: string;
        };
        const feedback = request.feedback ?? (compatibility.outcome === 'accepted' || compatibility.outcome === 'rejected' ? compatibility.outcome : undefined);
        const estimatedTokens = this.numberFromPayload(payload, 'estimatedTokens');
        return {
            workspacePath: request.workspacePath,
            promptSignature: request.promptSignature,
            targetKind: request.targetKind ?? 'context-suggestion',
            targetId: request.targetId ?? 'unknown-feedback-target',
            targetSourceKind: request.targetSourceKind ?? compatibility.sourceKind,
            targetUri: request.targetUri ?? this.stringFromPayload(payload, 'uri'),
            targetTitle: request.targetTitle,
            feedback: feedback ?? 'rejected',
            reason: request.reason,
            evidence: request.evidence ?? this.stringFromPayload(payload, 'evidence'),
            metadata: {
                ...(request.metadata ?? {}),
                ...(estimatedTokens !== undefined ? { estimatedTokens } : {}),
                ...(compatibility.correction ? { correction: compatibility.correction } : {})
            }
        };
    }

    protected feedbackRequestFromMemoryUpdate(request: MemoryUpdateMemoryRequest, memory: MemoryItem): MemoryFeedbackRequest | undefined {
        if (request.patch.status === 'rejected') {
            return {
                workspacePath: request.workspacePath,
                targetKind: 'memory',
                targetId: memory.id,
                targetSourceKind: 'project-memory',
                targetTitle: memory.title,
                feedback: 'rejected',
                reason: 'Memory was rejected by the user.',
                evidence: memory.evidence
            };
        }
        if (request.patch.staleStatus === 'stale') {
            return {
                workspacePath: request.workspacePath,
                targetKind: 'memory',
                targetId: memory.id,
                targetSourceKind: 'project-memory',
                targetTitle: memory.title,
                feedback: 'stale',
                reason: 'Memory was marked stale.',
                evidence: memory.evidence
            };
        }
        return undefined;
    }

    protected updateContextSuggestionDecision(store: MemoryStore, feedback: MemoryFeedbackRequest): void {
        if (feedback.targetKind !== 'context-suggestion' || (feedback.feedback !== 'accepted' && feedback.feedback !== 'rejected')) {
            return;
        }
        const key = this.workspaceKey(feedback.workspacePath);
        store.contextSuggestions = store.contextSuggestions.map(suggestion => {
            if (this.workspaceKey(suggestion.workspacePath) !== key || suggestion.id !== feedback.targetId) {
                return suggestion;
            }
            if (feedback.promptSignature && suggestion.promptSignature !== feedback.promptSignature) {
                return suggestion;
            }
            return {
                ...suggestion,
                accepted: feedback.feedback === 'accepted'
            };
        });
    }

    protected parseJsonObject(value: string | undefined): Record<string, unknown> | undefined {
        if (!value) {
            return undefined;
        }
        try {
            const parsed = JSON.parse(value) as unknown;
            return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : undefined;
        } catch {
            return undefined;
        }
    }

    protected stringFromPayload(payload: Record<string, unknown> | undefined, key: string): string | undefined {
        const value = payload?.[key];
        return typeof value === 'string' && value.trim() ? value : undefined;
    }

    protected numberFromPayload(payload: Record<string, unknown> | undefined, key: string): number | undefined {
        const value = payload?.[key];
        return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
    }

    protected sourceKindFromPayload(payload: Record<string, unknown> | undefined, key: string): MemorySourceKind | undefined {
        const value = this.stringFromPayload(payload, key);
        switch (value) {
            case 'code':
            case 'code-graph':
            case 'local-docs':
            case 'project-memory':
            case 'repository-memory':
            case 'task-memory':
            case 'skill':
            case 'agent-event':
            case 'feedback-record':
                return value;
            default:
                return undefined;
        }
    }

    protected proposeMemoryCandidatesInStore(store: MemoryStore, request: MemoryCandidateProposalRequest, now: string, repositoryIdentity: MemoryRepositoryIdentity = {}): MemoryCandidateProposalResult {
        const extracted = this.memoryCandidateExtractor.extract(request);
        const result: MemoryCandidateProposalResult = {
            candidates: [],
            created: 0,
            deduplicated: 0,
            events: []
        };
        const existingByKey = new Map(store.memories.map(memory => [
            this.memoryService.dedupeKey(memory, memory.scope === 'global' ? undefined : this.workspaceKey(memory.workspacePath ?? '')),
            memory
        ]));
        for (const candidate of extracted) {
            const workspacePath = candidate.scope === 'global' ? undefined : request.workspacePath;
            const key = this.memoryService.dedupeKey(candidate, candidate.scope === 'global' ? undefined : this.workspaceKey(request.workspacePath));
            const existing = existingByKey.get(key);
            if (existing) {
                result.deduplicated++;
                if (existing.status === 'candidate') {
                    result.candidates.push(existing);
                }
                continue;
            }
            const eventId = this.id('event');
            const item = this.assignDefaultMemorySpace(this.memoryService.normalize({
                id: this.id('mem_candidate'),
                workspacePath,
                scope: candidate.scope,
                repositoryUrl: candidate.repositoryUrl ?? (candidate.scope === 'repository' ? repositoryIdentity.repositoryUrl : undefined),
                repositoryId: candidate.repositoryId ?? (candidate.scope === 'repository' ? repositoryIdentity.repositoryId : undefined),
                sessionId: candidate.sessionId,
                taskId: candidate.taskId,
                expiresAt: candidate.expiresAt,
                retentionPolicy: candidate.retentionPolicy,
                memoryType: candidate.memoryType,
                title: candidate.title,
                content: candidate.content,
                status: 'candidate',
                staleStatus: 'unknown',
                importance: candidate.importance,
                weight: candidate.weight,
                source: candidate.source,
                evidence: this.memoryCandidateEvidence(candidate.evidence, eventId),
                createdAt: now,
                updatedAt: now,
                acceptedCount: 0,
                rejectedCount: 0
            }));
            const event: MemoryEvent = {
                id: eventId,
                workspacePath: request.workspacePath,
                eventType: 'memory.suggested',
                relativePath: request.relativePath,
                payload: JSON.stringify(this.redactionService.redactJson({
                    memoryId: item.id,
                    title: item.title,
                    memoryType: item.memoryType,
                    scope: item.scope,
                    status: item.status,
                    source: item.source,
                    contentHash: this.hash(item.content),
                    evidence: candidate.evidence,
                    matchedPattern: candidate.matchedPattern,
                    sourceEventId: request.eventId
                })),
                createdAt: now
            };
            this.upsertDefaultMemorySpace(store, item, now);
            store.memories.push(item);
            store.events.push(event);
            existingByKey.set(key, item);
            result.candidates.push(item);
            result.events.push(event);
            result.created++;
        }
        return result;
    }

    protected memoryCandidateEvidence(evidence: string | undefined, eventId: string): string {
        return evidence ? `event:${eventId}\n${evidence}` : `event:${eventId}`;
    }

    protected memoryMatchesTopic(memory: MemoryItem, topic: string): boolean {
        const topicTokens = this.normalizedTopicTokens(topic);
        if (!topicTokens.length) {
            return false;
        }
        const haystack = this.normalizeSearchText(`${memory.title} ${memory.content} ${memory.source ?? ''} ${memory.evidence ?? ''}`);
        return topicTokens.every(token => haystack.includes(token));
    }

    protected normalizedTopicTokens(topic: string): string[] {
        return [...new Set(this.normalizeSearchText(topic)
            .split(' ')
            .filter(token => token.length >= 3))];
    }

    protected normalizeSearchText(value: string): string {
        return value
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    protected memoryHasSensitiveText(memory: MemoryItem): boolean {
        return this.scanner.scan({
            content: `${memory.title}\n${memory.content}`,
            sourceUri: memory.source
        }).findings.length > 0;
    }

    protected consolidatedMemoryType(memories: MemoryItem[]): MemoryItem['memoryType'] {
        const counts = new Map<MemoryItem['memoryType'], number>();
        for (const memory of memories) {
            counts.set(memory.memoryType, (counts.get(memory.memoryType) ?? 0) + 1);
        }
        return [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0]?.[0] ?? 'manual_note';
    }

    protected highestMemoryImportance(memories: MemoryItem[]): MemoryItem['importance'] {
        const rank: Record<MemoryItem['importance'], number> = {
            critical: 4,
            high: 3,
            medium: 2,
            low: 1
        };
        return memories
            .map(memory => memory.importance)
            .sort((left, right) => rank[right] - rank[left])[0] ?? 'medium';
    }

    protected consolidatedMemoryContent(topic: string, memories: MemoryItem[]): string {
        const lines = [
            `Consolidated memory candidate for topic "${topic}".`,
            'Review this candidate before activation; source memories are only marked superseded after approval.',
            '',
            ...memories.map(memory => `- ${memory.title}: ${this.singleLineSnippet(memory.content, 220)}`)
        ];
        return lines.join('\n');
    }

    protected singleLineSnippet(value: string, limit: number): string {
        const normalized = value.replace(/\s+/g, ' ').trim();
        return normalized.length > limit ? `${normalized.slice(0, limit - 3)}...` : normalized;
    }

    protected markSupersededMemoriesAfterReview(store: MemoryStore, consolidated: MemoryItem, workspacePath: string): void {
        const key = this.workspaceKey(workspacePath);
        const now = consolidated.updatedAt;
        const supersededIds = new Set(consolidated.supersedes ?? []);
        for (const memory of store.memories) {
            if (!supersededIds.has(memory.id) || memory.id === consolidated.id) {
                continue;
            }
            if (memory.workspacePath && this.workspaceKey(memory.workspacePath) !== key) {
                continue;
            }
            memory.supersededBy = consolidated.id;
            memory.updatedAt = now;
            this.recordMemoryAuditEvent(store, 'memory.superseded', memory, now, {
                supersededBy: consolidated.id
            }, workspacePath);
        }
        store.events.push({
            id: this.id('event'),
            workspacePath,
            eventType: 'memory.suggested',
            payload: JSON.stringify({
                action: 'consolidation-approved',
                memoryId: consolidated.id,
                supersedes: consolidated.supersedes
            }),
            createdAt: now
        });
    }

    protected proposeContradictionCandidatesInStore(store: MemoryStore, workspacePath: string | undefined, now: string): void {
        if (!workspacePath) {
            return;
        }
        const key = this.workspaceKey(workspacePath);
        const memories = store.memories.filter(memory =>
            memory.scope === 'global'
            || (!!memory.workspacePath && this.workspaceKey(memory.workspacePath) === key)
        );
        const codeChunks = store.codeChunks[key] ?? [];
        const candidates = this.contradictionDetector.detect({
            memories,
            codeChunks,
            existingCandidates: store.memories.filter(memory => memory.source === 'deterministic-contradiction-detector')
        });
        for (const candidate of candidates) {
            const item = this.assignDefaultMemorySpace(this.memoryService.normalize({
                id: this.id('mem_candidate'),
                workspacePath,
                scope: 'workspace',
                memoryType: 'manual_note',
                title: candidate.title,
                content: candidate.content,
                status: 'candidate',
                staleStatus: 'unknown',
                importance: 'medium',
                weight: candidate.confidence,
                source: 'deterministic-contradiction-detector',
                evidence: candidate.evidence,
                originMarkers: candidate.originMarkers,
                createdAt: now,
                updatedAt: now,
                acceptedCount: 0,
                rejectedCount: 0
            }));
            this.upsertDefaultMemorySpace(store, item, now);
            store.memories.push(item);
            store.events.push({
                id: this.id('event'),
                workspacePath,
                eventType: 'memory.suggested',
                payload: JSON.stringify({
                    memoryId: item.id,
                    title: item.title,
                    memoryType: item.memoryType,
                    scope: item.scope,
                    status: item.status,
                    source: item.source,
                    evidence: item.evidence,
                    originMarkers: item.originMarkers
                }),
                createdAt: now
            });
        }
    }

    protected updateSkillCandidateFromEvent(store: MemoryStore, event: MemoryEvent, signature: string): void {
        const key = this.workspaceKey(event.workspacePath);
        const index = store.skillCandidates.findIndex(candidate => candidate.signature === signature && (!candidate.workspacePath || this.workspaceKey(candidate.workspacePath) === key));
        const existing = index === -1 ? undefined : store.skillCandidates[index];
        const updated = this.skillSuggestionEngine.updateCandidateForPrompt(existing, {
            workspacePath: event.workspacePath,
            signature,
            prompt: event.payload,
            eventType: event.eventType === 'skill.accepted' ? 'skill.accepted' : event.eventType === 'skill.rejected' ? 'skill.rejected' : 'prompt.submitted',
            now: event.createdAt
        });
        if (index === -1) {
            store.skillCandidates.push(updated);
        } else {
            store.skillCandidates[index] = updated;
        }
        if (updated.status === 'suggested' && event.eventType === 'prompt.submitted') {
            store.events.push({
                id: this.id('event'),
                workspacePath: event.workspacePath,
                eventType: 'skill.suggested',
                payload: JSON.stringify({
                    id: updated.id,
                    title: updated.title,
                    triggerCount: updated.triggerCount,
                    generationSources: updated.generationSources ?? ['event'],
                    reason: updated.statusReason
                }),
                promptSignature: signature,
                createdAt: event.createdAt
            });
        }
    }

    protected skillSuggestionSourcesFromText(value: string): MemorySkillSuggestionSource[] {
        const text = value.toLowerCase();
        const sources = new Set<MemorySkillSuggestionSource>();
        if (/\b(code[-_ ]?graph|symbol|relation|blast radius|impact)\b/.test(text)) {
            sources.add('code-graph');
        }
        if (/\b(memory|memoria|memória|project-memory|repository-memory|task-memory)\b/.test(text)) {
            sources.add('memory');
        }
        if (/\b(doc|docs|documentation|local-docs|external-docs)\b/.test(text)) {
            sources.add('docs');
        }
        if (/\b(event|prompt|chat-learning|audit|terminal|build|test)\b/.test(text)) {
            sources.add('event');
        }
        if (/\b(skill|skills)\b/.test(text)) {
            sources.add('skill');
        }
        return sources.size ? [...sources] : ['event'];
    }

    protected skillDecisionReason(status: MemorySkillCandidate['status']): string {
        switch (status) {
            case 'accepted':
                return 'Approved by the user.';
            case 'blocked':
                return 'Blocked by the user and excluded from retrieval chips.';
            case 'delete_pending':
                return 'Marked for deletion review by the user.';
            case 'rejected':
                return 'Rejected or ignored by the user.';
            default:
                return `Status changed to ${status}.`;
        }
    }

    protected buildSnapshot(workspaceRoot: string, scannedAt: string, mode: MemoryScanRequest['mode'], files: MemoryFile[]): MemoryWorkspaceSnapshot {
        const summaries = files.map(file => this.fileSummary(file));
        const issues: MemoryScanIssue[] = files
            .filter(file => file.isSensitive)
            .map(file => ({
                id: this.idFromPath('issue', workspaceRoot, file.relativePath),
                severity: 'high',
                message: 'Sensitive file indexed as metadata only.',
                path: file.relativePath
            }));
        return {
            workspaceRoot,
            scanId: this.id('scan'),
            scannedAt,
            mode: mode ?? 'quick',
            totals: {
                files: files.length,
                indexedFiles: files.filter(file => !file.isIgnored).length,
                skippedFiles: files.filter(file => file.isIgnored).length,
                bytes: files.reduce((total, file) => total + file.sizeBytes, 0),
                lines: summaries.reduce((total, file) => total + file.lineCount, 0),
                secrets: issues.length
            },
            languages: this.languageStats(files),
            files: summaries,
            manifests: this.manifestSummaries(files),
            secretFindings: [],
            issues
        };
    }

    protected fileSummary(file: MemoryFile): MemoryFileSummary {
        return {
            path: file.relativePath,
            language: file.languageId,
            sizeBytes: file.sizeBytes,
            lineCount: 0,
            hash: file.contentHash,
            lastModifiedAt: file.indexedAt,
            tags: [
                file.isIgnored ? 'ignored' : undefined,
                file.ignoreReason?.kind,
                file.isGenerated ? 'generated' : undefined,
                file.isSensitive ? 'sensitive' : undefined,
                file.isBinary ? 'binary' : undefined
            ].filter((tag): tag is string => tag !== undefined)
        };
    }

    protected manifestSummaries(files: MemoryFile[]): MemoryManifestSummary[] {
        return files
            .filter(file => ['package.json', 'requirements.txt', 'go.mod', 'Cargo.toml', 'pom.xml', 'build.gradle', 'composer.json'].includes(file.fileName))
            .map(file => ({
                path: file.relativePath,
                kind: this.manifestKind(file.fileName),
                dependencies: [] as MemoryDependency[]
            }));
    }

    protected manifestKind(fileName: string): MemoryManifestSummary['kind'] {
        switch (fileName) {
            case 'package.json':
                return 'npm';
            case 'requirements.txt':
                return 'python';
            case 'go.mod':
                return 'go';
            case 'Cargo.toml':
                return 'rust';
            case 'pom.xml':
                return 'maven';
            case 'build.gradle':
                return 'gradle';
            case 'composer.json':
                return 'composer';
            default:
                return 'unknown';
        }
    }

    protected languageStats(files: MemoryFile[]): MemoryLanguageStat[] {
        const stats = new Map<string, MemoryLanguageStat>();
        for (const file of files) {
            const language = file.languageId ?? 'unknown';
            const current = stats.get(language) ?? { language, files: 0, bytes: 0 };
            current.files++;
            current.bytes += file.sizeBytes;
            stats.set(language, current);
        }
        return [...stats.values()].sort((left, right) => right.bytes - left.bytes || left.language.localeCompare(right.language));
    }

    protected toLegacyMemory(input: MemoryInput, existing: Memory | undefined, now: string): Memory {
        return {
            ...input,
            id: input.id ?? existing?.id ?? this.id('memory'),
            createdAt: existing?.createdAt ?? now,
            updatedAt: now
        };
    }

    protected toSkill(input: MemorySkillInput, existing: MemorySkill | undefined, now: string): MemorySkill {
        return {
            ...input,
            id: input.id ?? existing?.id ?? this.id('skill'),
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
            builtin: existing?.builtin
        };
    }

    protected toSourceKinds(sources: MemorySearchRequest['includeSources']): MemorySourceKind[] | undefined {
        if (!sources) {
            return undefined;
        }
        const mapped: MemorySourceKind[] = [];
        for (const source of sources) {
            switch (source) {
                case 'workspace':
                    mapped.push('code');
                    break;
                case 'memory':
                    mapped.push('project-memory', 'repository-memory', 'task-memory');
                    break;
                case 'skill':
                    mapped.push('skill');
                    break;
                case 'mock':
                    mapped.push('local-docs');
                    break;
                default:
                    break;
            }
        }
        return mapped.length ? mapped : undefined;
    }

    protected retrievalSources(): Array<CodeTextRetrievalSource | ProjectMemoryRetrievalSource | RepositoryMemoryRetrievalSource | TaskMemoryRetrievalSource | AgentEventRetrievalSource | SkillRetrievalSource | FeedbackRecordRetrievalSource | LocalDocsRetrievalSource> {
        return [
            new CodeTextRetrievalSource(this.repository),
            new ProjectMemoryRetrievalSource(this.repository),
            new RepositoryMemoryRetrievalSource(this.repository),
            new TaskMemoryRetrievalSource(this.repository),
            new AgentEventRetrievalSource(this.repository),
            new SkillRetrievalSource(this.repository),
            new FeedbackRecordRetrievalSource(this.repository),
            new LocalDocsRetrievalSource(this.libraryService, this.repository)
        ];
    }

    protected async searchCodeGraph(query: RetrievalQuery): Promise<RetrievalResult[]> {
        const store = await this.readStore();
        const key = this.workspaceKey(query.workspacePath);
        const needle = query.text.toLowerCase();
        const files = store.files[key] ?? [];
        const symbols = store.symbols[key] ?? [];
        const relations = store.relations[key] ?? [];
        const graphSignals = this.contextCartGraphSignals(store, query.workspacePath, files, symbols, relations);
        const results: RetrievalResult[] = [];
        for (const symbol of symbols) {
            const haystack = `${symbol.name} ${symbol.fullName ?? ''} ${symbol.symbolKind}`.toLowerCase();
            const lexicalBaseScore = needle ? this.score(haystack, needle) : 0.25;
            if (!needle || lexicalBaseScore > 0) {
                const file = files.find(candidate => candidate.id === symbol.fileId);
                const signals = graphSignals(symbol.id, symbol.fileId);
                const lexicalScore = needle ? lexicalBaseScore + 0.1 : 0.35;
                results.push({
                    id: symbol.id,
                    sourceKind: 'code-graph',
                    title: symbol.fullName ?? symbol.name,
                    snippet: `${symbol.symbolKind} in ${this.filePathForSymbol(files, symbol)}`,
                    score: Number(Math.max(lexicalScore, signals.graphScore).toFixed(6)),
                    uri: file ? `${path.join(query.workspacePath, file.relativePath)}${symbol.startLine ? `:${symbol.startLine}` : ''}` : undefined,
                    evidence: ['pi_symbols', ...signals.reasons].join('; '),
                    rankingSignals: {
                        bm25Score: lexicalBaseScore,
                        graphScore: signals.graphScore,
                        godNodeScore: signals.godNodeScore,
                        communityScore: signals.communityScore,
                        surprisingConnectionScore: signals.surprisingConnectionScore,
                        riskScore: signals.riskScore,
                        graphSignals: signals.reasons,
                        scopeBoost: 0.75,
                        scope: 'workspace'
                    }
                });
            }
        }
        const feedback = store.feedbackRecords.filter(record => this.workspaceKey(record.workspacePath) === key);
        return results
            .map(result => ({
                ...result,
                score: Number((result.score * this.feedbackService.rankingMultiplier(feedback, result)).toFixed(6)),
                rankingSignals: result.rankingSignals ? {
                    ...result.rankingSignals,
                    feedbackMultiplier: this.feedbackService.rankingMultiplier(feedback, result)
                } : undefined
            }))
            .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title))
            .slice(0, query.limit ?? 20);
    }

    protected contextCartGraphSignals(
        store: MemoryStore,
        workspacePath: string,
        files: readonly MemoryFile[],
        symbols: readonly MemorySymbol[],
        relations: readonly MemoryRelation[]
    ): (symbolId: string, fileId: string) => {
        graphScore: number;
        godNodeScore?: number;
        communityScore?: number;
        surprisingConnectionScore?: number;
        riskScore?: number;
        reasons: string[];
    } {
        const godNodes = new Map(new GodNodeAnalyzer().analyze({ files: [...files], symbols: [...symbols], relations: [...relations] }).nodes.map(node => [node.id, node]));
        const communities = new GraphCommunityAnalyzer().analyze({ files: [...files], symbols: [...symbols], relations: [...relations] }).communities;
        const communityByNode = new Map<string, { name: string; score: number }>();
        for (const community of communities) {
            for (const nodeId of community.nodeIds) {
                communityByNode.set(nodeId, { name: community.name, score: Math.min(1, community.score / 10) });
            }
        }
        const key = this.workspaceKey(workspacePath);
        const risksByFile = new Map(store.changeImpacts
            .filter(impact => this.workspaceKey(impact.workspacePath) === key)
            .flatMap(impact => {
                const file = files.find(candidate => candidate.relativePath === impact.relativePath || candidate.id === impact.sourceId);
                return file ? [[file.id, impact] as const] : [];
            }));
        const surpriseBySource = new Set(store.knowledgeGraphs
            .filter(graph => this.knowledgeGraphInWorkspace(graph, workspacePath))
            .flatMap(graph => graph.links
                .filter(link => link.linkKind === 'surprising_connection' && link.status !== 'rejected' && link.status !== 'archived')
                .flatMap(link => [link.sourceConceptId, link.targetConceptId]
                    .map(conceptId => graph.concepts.find(concept => concept.id === conceptId)?.sourceId)
                    .filter((sourceId): sourceId is string => !!sourceId))));
        return (symbolId, fileId) => {
            const godNode = godNodes.get(symbolId) ?? godNodes.get(fileId);
            const community = communityByNode.get(symbolId) ?? communityByNode.get(fileId);
            const risk = risksByFile.get(fileId);
            const surprisingConnectionScore = surpriseBySource.has(symbolId) || surpriseBySource.has(fileId) ? 0.74 : undefined;
            const godNodeScore = godNode ? Math.min(1, Number((godNode.score / 12).toFixed(2))) : undefined;
            const communityScore = community?.score;
            const riskScore = risk?.riskScore;
            const graphScore = Math.max(0.25, godNodeScore ?? 0, communityScore ?? 0, surprisingConnectionScore ?? 0, riskScore ?? 0);
            const reasons = [
                godNode ? `god-node:${godNode.label}:score=${godNodeScore}` : undefined,
                community ? `community:${community.name}:score=${communityScore}` : undefined,
                surprisingConnectionScore !== undefined ? `surprising-connection:score=${surprisingConnectionScore}` : undefined,
                risk ? `risk:${risk.relativePath ?? risk.sourceId ?? risk.id}:score=${risk.riskScore}` : undefined
            ].filter((reason): reason is string => !!reason);
            return { graphScore, godNodeScore, communityScore, surprisingConnectionScore, riskScore, reasons };
        };
    }

    protected async graphQuery(workspacePath: string | undefined): Promise<GraphQueryService> {
        const store = await this.readStore();
        const key = this.workspaceKey(workspacePath ?? '.');
        return new GraphQueryService(store.files[key] ?? [], store.symbols[key] ?? [], store.relations[key] ?? []);
    }

    protected async scanWorkspaceFiles(workspacePath: string, settings: MemoryWorkspaceSettings): Promise<MemoryFile[]> {
        const files: MemoryFile[] = [];
        await this.walk(workspacePath, workspacePath, files, [], settings);
        return files;
    }

    protected indexTargetsForScope(files: MemoryFile[], scope: MemoryIndexRequest['scope'], settings: MemoryWorkspaceSettings): MemoryFile[] {
        if (scope === 'local-docs') {
            return files.filter(file => LOCAL_DOC_EXTENSIONS.has(file.extension ?? '')
                || (settings.optIn?.pdfDocuments === true && file.extension === '.pdf')
                || (settings.optIn?.officeDocuments === true && OFFICE_DOCUMENT_EXTENSIONS.has(file.extension ?? ''))
                || (settings.optIn?.images === true && IMAGE_DOCUMENT_EXTENSIONS.has(file.extension ?? ''))
                || (settings.optIn?.diagrams === true && DIAGRAM_DOCUMENT_EXTENSIONS.has(file.extension ?? '')));
        }
        return files;
    }

    protected async walk(root: string, current: string, files: MemoryFile[], ignoreStack: WorkspaceIgnoreMatcher[], settings: MemoryWorkspaceSettings): Promise<void> {
        if (files.length >= 750) {
            return;
        }
        const activeIgnoreStack = await this.ignoreStackForDirectory(root, current, ignoreStack);
        let entries: Array<{ name: string; isDirectory(): boolean; isFile(): boolean }>;
        try {
            entries = await fs.readdir(current, { withFileTypes: true });
        } catch {
            return;
        }
        for (const entry of entries) {
            const absolute = path.join(current, entry.name);
            const relativePath = path.relative(root, absolute).replace(/\\/g, '/');
            const structuralIgnoreReason = this.structuralIgnoreReason(relativePath, entry.isDirectory(), activeIgnoreStack, settings);
            if (structuralIgnoreReason) {
                if (entry.isFile()) {
                    const stat = await fs.stat(absolute);
                    files.push(this.fileRecord(root, relativePath, entry.name, stat.size, `${stat.size}-${stat.mtimeMs}`, true, false, false, false, structuralIgnoreReason));
                }
                continue;
            }
            if (entry.isDirectory()) {
                await this.walk(root, absolute, files, activeIgnoreStack, settings);
                continue;
            }
            if (!entry.isFile()) {
                continue;
            }
            const extension = path.extname(entry.name).toLowerCase();
            const stat = await fs.stat(absolute);
            const isOptedInPdf = extension === '.pdf' && settings.optIn?.pdfDocuments === true;
            const isOptedInOfficeDocument = OFFICE_DOCUMENT_EXTENSIONS.has(extension) && settings.optIn?.officeDocuments === true;
            const isOptedInImage = IMAGE_DOCUMENT_EXTENSIONS.has(extension) && settings.optIn?.images === true;
            const isOptedInDiagram = DIAGRAM_DOCUMENT_EXTENSIONS.has(extension) && settings.optIn?.diagrams === true;
            const isBinary = !TEXT_EXTENSIONS.has(extension) && !isOptedInPdf && !isOptedInOfficeDocument && !isOptedInImage && !isOptedInDiagram;
            const isTooLarge = stat.size > 256_000;
            const isSensitivePath = this.isSensitivePath(relativePath);
            let isSensitive = isSensitivePath;
            let contentHash = `${stat.size}-${stat.mtimeMs}`;
            if (!isBinary && !isTooLarge && extension !== '.pdf' && !isOptedInOfficeDocument && !isOptedInImage) {
                const content = await fs.readFile(absolute, 'utf8');
                contentHash = this.hash(content);
                isSensitive = isSensitive || this.scanner.scan({ content, sourceUri: absolute, maxFindings: 1 }).findings.length > 0;
            }
            const isGenerated = this.isGeneratedPath(relativePath);
            const contentIgnoreReason = this.contentIgnoreReason(relativePath, isBinary, isTooLarge, isGenerated, isSensitive);
            files.push(this.fileRecord(root, relativePath, entry.name, stat.size, contentHash, !!contentIgnoreReason && contentIgnoreReason.kind !== 'generated', isGenerated, isBinary, isSensitive, contentIgnoreReason));
        }
    }

    protected fileRecord(
        root: string,
        relativePath: string,
        fileName: string,
        sizeBytes: number,
        contentHash: string,
        isIgnored: boolean,
        isGenerated: boolean,
        isBinary: boolean,
        isSensitive: boolean,
        ignoreReason?: MemoryFileIgnoreReason
    ): MemoryFile {
        const extension = path.extname(fileName).toLowerCase();
        return {
            id: this.idFromPath('file', root, relativePath),
            relativePath,
            fileName,
            extension,
            languageId: this.languageId(extension),
            sizeBytes,
            contentHash,
            isIgnored,
            isGenerated,
            isBinary,
            isSensitive,
            ignoreReason
        };
    }

    protected async ignoreStackForDirectory(root: string, current: string, parentStack: WorkspaceIgnoreMatcher[]): Promise<WorkspaceIgnoreMatcher[]> {
        const basePath = path.relative(root, current).replace(/\\/g, '/');
        const matchers: WorkspaceIgnoreMatcher[] = [];
        for (const ignoreFile of ['.gitignore', '.cvignore', '.cybervinciignore'] as const) {
            let content: string;
            try {
                content = await fs.readFile(path.join(current, ignoreFile), 'utf8');
            } catch {
                continue;
            }
            matchers.push({
                basePath,
                fileName: ignoreFile,
                sourcePath: path.relative(root, path.join(current, ignoreFile)).replace(/\\/g, '/'),
                kind: ignoreFile.slice(1) as WorkspaceIgnoreMatcher['kind'],
                matcher: ignore().add(content)
            });
        }
        return matchers.length ? [...parentStack, ...matchers] : parentStack;
    }

    protected structuralIgnoreReason(relativePath: string, isDirectory: boolean, ignoreStack: WorkspaceIgnoreMatcher[], settings: MemoryWorkspaceSettings): MemoryFileIgnoreReason | undefined {
        const useCyberVinciIgnore = settings.ignoreRules?.useCyberVinciIgnore !== false;
        const useGitignore = settings.ignoreRules?.useGitignore !== false;
        return (useCyberVinciIgnore ? this.isIgnoredByKind(relativePath, isDirectory, ignoreStack, 'cvignore') : undefined)
            ?? (useCyberVinciIgnore ? this.isIgnoredByKind(relativePath, isDirectory, ignoreStack, 'cybervinciignore') : undefined)
            ?? this.workspaceDenyReason(relativePath, isDirectory, settings)
            ?? (useGitignore ? this.isIgnoredByKind(relativePath, isDirectory, ignoreStack, 'gitignore') : undefined);
    }

    protected isIgnoredByKind(relativePath: string, isDirectory: boolean, ignoreStack: WorkspaceIgnoreMatcher[], kind: WorkspaceIgnoreMatcher['kind']): MemoryFileIgnoreReason | undefined {
        const normalizedPath = isDirectory && !relativePath.endsWith('/') ? `${relativePath}/` : relativePath;
        for (const { basePath, fileName, sourcePath, matcher } of ignoreStack.filter(item => item.kind === kind)) {
            if (!basePath) {
                if (matcher.ignores(normalizedPath)) {
                    return { kind, source: sourcePath, detail: `Matched ${fileName} rule for ${normalizedPath}` };
                }
                continue;
            }
            if (normalizedPath !== basePath && !normalizedPath.startsWith(`${basePath}/`)) {
                continue;
            }
            const localPath = normalizedPath.slice(basePath.length).replace(/^\//, '');
            if (localPath && matcher.ignores(localPath)) {
                return { kind, source: sourcePath, detail: `Matched ${fileName} rule for ${localPath}` };
            }
        }
        return undefined;
    }

    protected workspaceDenyReason(relativePath: string, isDirectory: boolean, settings: MemoryWorkspaceSettings): MemoryFileIgnoreReason | undefined {
        const allowlist = settings.allowlist ?? [];
        if (settings.restrictIndexingToAllowlist && !this.isWorkspaceAllowedByAllowlist(relativePath, isDirectory, allowlist)) {
            return { kind: 'allowlist', source: 'workspace settings', detail: 'Path is outside the explicit indexing allowlist.' };
        }
        if (this.matchesWorkspacePatterns(relativePath, isDirectory, allowlist)) {
            return undefined;
        }
        if (isDirectory && this.hasAllowlistDescendant(relativePath, allowlist)) {
            return undefined;
        }
        const denylist = settings.denylist ?? [...DEFAULT_DENYLIST];
        return this.matchesWorkspacePatterns(relativePath, isDirectory, denylist)
            ? { kind: 'denylist', source: 'workspace settings', detail: 'Path matched the workspace denylist.' }
            : undefined;
    }

    protected contentIgnoreReason(relativePath: string, isBinary: boolean, isTooLarge: boolean, isGenerated: boolean, isSensitive: boolean): MemoryFileIgnoreReason | undefined {
        if (isSensitive) {
            return { kind: 'secret', source: 'secret scanner', detail: 'Path or content matched sensitive/secret detection; content is metadata-only.' };
        }
        if (isBinary) {
            return { kind: 'binary', source: 'file type scanner', detail: 'File extension is not treated as text content.' };
        }
        if (isTooLarge) {
            return { kind: 'size', source: 'file size limit', detail: 'File exceeds the 256000 byte content indexing limit.' };
        }
        if (isGenerated) {
            return { kind: 'generated', source: 'generated path detector', detail: `Generated-file path pattern matched ${relativePath}.` };
        }
        return undefined;
    }

    protected isWorkspaceAllowedByAllowlist(relativePath: string, isDirectory: boolean, allowlist: readonly string[]): boolean {
        if (this.matchesWorkspacePatterns(relativePath, isDirectory, allowlist)) {
            return true;
        }
        return isDirectory && this.hasAllowlistDescendant(relativePath, allowlist);
    }

    protected matchesWorkspacePatterns(relativePath: string, isDirectory: boolean, patterns: readonly string[]): boolean {
        const cleaned = patterns.map(pattern => pattern.trim()).filter(Boolean);
        if (!cleaned.length) {
            return false;
        }
        const normalizedPath = isDirectory && !relativePath.endsWith('/') ? `${relativePath}/` : relativePath;
        if (ignore().add(cleaned).ignores(normalizedPath)) {
            return true;
        }
        const segments = normalizedPath.replace(/\/$/, '').split('/');
        return cleaned.some(pattern => {
            const normalizedPattern = pattern.replace(/\\/g, '/').replace(/\/$/, '');
            return segments.includes(normalizedPattern) || normalizedPath === normalizedPattern || normalizedPath.startsWith(`${normalizedPattern}/`);
        });
    }

    protected hasAllowlistDescendant(relativePath: string, allowlist: readonly string[]): boolean {
        const directoryPath = relativePath.replace(/\\/g, '/').replace(/\/$/, '');
        if (!directoryPath) {
            return false;
        }
        return allowlist
            .map(pattern => pattern.trim().replace(/\\/g, '/').replace(/\/$/, ''))
            .filter(Boolean)
            .some(pattern => pattern.startsWith(`${directoryPath}/`));
    }

    protected async extractSymbols(workspacePath: string, files: MemoryFile[]): Promise<MemorySymbol[]> {
        const results: LanguageAnalysisResult[] = [];
        for (const file of files.filter(candidate => this.languageAnalyzerFor(candidate) && !candidate.isSensitive && !candidate.isBinary)) {
            const absolute = path.join(workspacePath, file.relativePath);
            try {
                const content = await fs.readFile(absolute, 'utf8');
                const analyzer = this.languageAnalyzerFor(file);
                if (!analyzer) {
                    continue;
                }
                results.push(await analyzer.analyze({
                    workspacePath,
                    file,
                    content,
                    createSymbolId: seed => this.idFromPath('symbol', workspacePath, `${file.relativePath}:${seed}`),
                    createRelationId: seed => this.idFromPath('rel', workspacePath, `${file.relativePath}:${seed}`)
                }));
            } catch {
                continue;
            }
        }
        this.lastLanguageAnalysisResults = results;
        return results.flatMap(result => result.symbols);
    }

    protected languageAnalyzerFor(file: MemoryFile): RankedMemoryLanguageAnalyzer | undefined {
        const analyzers = this.languageAnalyzers.length ? this.languageAnalyzers : this.fallbackLanguageAnalyzers;
        return [...analyzers]
            .filter(analyzer => analyzer.canAnalyze(file))
            .sort((left, right) => (right.priority ?? 0) - (left.priority ?? 0))[0];
    }

    protected unchangedFileIds(previousFiles: MemoryFile[], nextFiles: MemoryFile[]): Set<string> {
        const previousById = new Map(previousFiles.map(file => [file.id, file]));
        return new Set(nextFiles
            .filter(file => {
                const previous = previousById.get(file.id);
                return previous?.contentHash === file.contentHash
                    && previous.isIgnored === file.isIgnored
                    && previous.isBinary === file.isBinary
                    && previous.isSensitive === file.isSensitive
                    && previous.isGenerated === file.isGenerated
                    && previous.ignoreReason?.kind === file.ignoreReason?.kind;
            })
            .map(file => file.id));
    }

    protected changedRelativePathSet(request: MemoryIndexRequest): Set<string> | undefined {
        const paths = (request.scope ?? 'changed-files') === 'changed-files'
            ? (request.changedRelativePaths ?? []).map(relativePath => this.normalizeReactiveRelativePath(relativePath)).filter(Boolean)
            : [];
        return paths.length ? new Set(paths) : undefined;
    }

    protected preservedFileIdsForIndex(
        previousFiles: MemoryFile[],
        scannedFiles: MemoryFile[],
        indexedFileIds: Set<string>,
        scope: MemoryIndexRequest['scope']
    ): Set<string> {
        const scannedFileIds = new Set(scannedFiles.map(file => file.id));
        return new Set(previousFiles
            .filter(file => !indexedFileIds.has(file.id) && (scope === 'changed-files' || scannedFileIds.has(file.id)))
            .map(file => file.id));
    }

    protected mergeIndexedFiles(
        previousFiles: MemoryFile[],
        scannedFiles: MemoryFile[],
        indexedFileIds: Set<string>,
        scope: MemoryIndexRequest['scope'],
        indexedAt: string
    ): MemoryFile[] {
        if (scope !== 'changed-files') {
            return scannedFiles.map(file => ({ ...file, indexedAt }));
        }
        const scannedById = new Map(scannedFiles.map(file => [file.id, file]));
        const merged = previousFiles
            .filter(file => scannedById.has(file.id) && !indexedFileIds.has(file.id))
            .map(file => scannedById.get(file.id)?.contentHash === file.contentHash ? file : { ...scannedById.get(file.id)!, indexedAt });
        const previousIds = new Set(previousFiles.map(file => file.id));
        for (const file of scannedFiles) {
            if (indexedFileIds.has(file.id) || !previousIds.has(file.id)) {
                merged.push({ ...file, indexedAt });
            }
        }
        return merged.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
    }

    protected preservedRelations(
        previousRelations: MemoryRelation[],
        previousSymbols: MemorySymbol[],
        unchangedFileIds: Set<string>
    ): MemoryRelation[] {
        const symbolFileIds = new Map(previousSymbols.map(symbol => [symbol.id, symbol.fileId]));
        return previousRelations.filter(relation => this.relationEndpointUnchanged(relation.sourceId, symbolFileIds, unchangedFileIds)
            && this.relationEndpointUnchanged(relation.targetId, symbolFileIds, unchangedFileIds));
    }

    protected relationEndpointUnchanged(id: string, symbolFileIds: Map<string, string>, unchangedFileIds: Set<string>): boolean {
        return unchangedFileIds.has(id) || unchangedFileIds.has(symbolFileIds.get(id) ?? '');
    }

    protected extractRelations(files: MemoryFile[], symbols: MemorySymbol[]): MemoryRelation[] {
        const relations: MemoryRelation[] = this.lastLanguageAnalysisResults.flatMap(result => result.relations);
        const symbolsByName = new Map<string, MemorySymbol[]>();
        const symbolsById = new Map(symbols.map(symbol => [symbol.id, symbol]));
        const symbolsBySemanticName = new Map<string, MemorySymbol[]>();
        for (const symbol of symbols) {
            for (const key of [symbol.name, symbol.fullName ?? ''].filter(Boolean)) {
                const normalized = key.toLowerCase();
                symbolsByName.set(normalized, [...symbolsByName.get(normalized) ?? [], symbol]);
            }
            const semanticFullName = typeof symbol.metadata?.semanticFullName === 'string' ? symbol.metadata.semanticFullName : undefined;
            if (semanticFullName) {
                const normalized = semanticFullName.toLowerCase();
                symbolsBySemanticName.set(normalized, [...symbolsBySemanticName.get(normalized) ?? [], symbol]);
            }
        }
        for (const result of this.lastLanguageAnalysisResults) {
            for (const call of result.callHints ?? []) {
                const target = (call.targetSymbolId ? symbolsById.get(call.targetSymbolId) : undefined)
                    ?? (call.targetSemanticFullName ? symbolsBySemanticName.get(call.targetSemanticFullName.toLowerCase())?.[0] : undefined)
                    ?? symbolsBySemanticName.get(call.targetName.toLowerCase())?.[0]
                    ?? symbolsByName.get(call.targetName.toLowerCase())?.[0]
                    ?? symbolsByName.get(this.shortTypeName(call.targetName).toLowerCase())?.[0];
                if (target && target.id !== call.sourceSymbolId) {
                    const semanticallyResolved = call.targetSymbolId !== undefined
                        || call.targetSemanticFullName !== undefined
                        || symbolsBySemanticName.has(call.targetName.toLowerCase());
                    relations.push({
                        id: this.idFromPath('rel', 'calls', `${call.sourceSymbolId}:${target.id}`),
                        sourceKind: 'symbol',
                        sourceId: call.sourceSymbolId,
                        targetKind: 'symbol',
                        targetId: target.id,
                        relationType: 'calls',
                        confidenceLevel: semanticallyResolved ? 'extracted' : 'inferred',
                        confidenceScore: semanticallyResolved ? 0.9 : 0.55,
                        evidence: call.evidence,
                        metadata: {
                            extractionSource: semanticallyResolved ? 'semantic' : 'heuristic'
                        }
                    });
                }
            }
            for (const dependency of result.dependencyHints ?? []) {
                const target = (dependency.targetSymbolId ? symbolsById.get(dependency.targetSymbolId) : undefined)
                    ?? (dependency.targetSemanticFullName ? symbolsBySemanticName.get(dependency.targetSemanticFullName.toLowerCase())?.[0] : undefined)
                    ?? symbolsByName.get(dependency.targetTypeName.toLowerCase())?.[0];
                if (target && target.id !== dependency.sourceSymbolId) {
                    const isDependencyInjection = dependency.sourceConstructorSymbolId !== undefined
                        || /\bAdd(?:Scoped|Transient|Singleton|DbContext)\b/.test(dependency.evidence ?? '');
                    const relationType = this.isDbContextSymbol(target)
                        ? 'uses_db_context'
                        : isDependencyInjection ? 'injects' : 'uses_dependency';
                    const semanticallyResolved = dependency.targetSymbolId !== undefined
                        || dependency.targetSemanticFullName !== undefined;
                    relations.push({
                        id: this.idFromPath('rel', relationType, `${dependency.sourceSymbolId}:${target.id}`),
                        sourceKind: 'symbol',
                        sourceId: dependency.sourceConstructorSymbolId ?? dependency.sourceSymbolId,
                        targetKind: 'symbol',
                        targetId: target.id,
                        relationType,
                        confidenceLevel: semanticallyResolved ? 'extracted' : 'inferred',
                        confidenceScore: semanticallyResolved ? 0.9 : 0.62,
                        evidence: dependency.evidence,
                        metadata: {
                            extractionSource: semanticallyResolved ? 'semantic' : 'heuristic'
                        }
                    });
                }
            }
            for (const imported of result.imports ?? []) {
                const target = symbols.find(symbol => symbol.symbolKind === 'namespace' && symbol.fullName === imported);
                if (target) {
                    relations.push({
                        id: this.idFromPath('rel', 'imports', `${result.fileId}:${target.id}`),
                        sourceKind: 'file',
                        sourceId: result.fileId,
                        targetKind: 'symbol',
                        targetId: target.id,
                        relationType: 'imports',
                        confidenceLevel: 'extracted',
                        confidenceScore: 0.8,
                        evidence: `using ${imported}`
                    });
                }
            }
        }
        for (const symbol of symbols) {
            const baseTypes = Array.isArray(symbol.metadata?.baseTypes) ? symbol.metadata.baseTypes.filter((value): value is string => typeof value === 'string') : [];
            for (const baseType of baseTypes) {
                const target = this.resolveSymbolByTypeName(baseType, symbolsByName, symbolsBySemanticName);
                if (target && target.id !== symbol.id) {
                    const relationType = target.symbolKind === 'interface' ? 'implements' : 'inherits';
                    const semanticallyResolved = symbolsBySemanticName.has(baseType.toLowerCase())
                        || (typeof symbol.metadata?.semanticFullName === 'string' && target.metadata?.semanticFullName !== undefined);
                    relations.push({
                        id: this.idFromPath('rel', relationType, `${symbol.id}:${target.id}`),
                        sourceKind: 'symbol',
                        sourceId: symbol.id,
                        targetKind: 'symbol',
                        targetId: target.id,
                        relationType,
                        confidenceLevel: semanticallyResolved ? 'extracted' : 'inferred',
                        confidenceScore: semanticallyResolved ? 0.9 : 0.7,
                        evidence: `${symbol.name} ${relationType === 'implements' ? 'implements' : 'inherits'} ${baseType}`,
                        metadata: {
                            extractionSource: semanticallyResolved ? 'semantic' : 'heuristic'
                        }
                    });
                }
            }
            if (symbol.symbolKind === 'endpoint' && symbol.parentSymbolId) {
                relations.push({
                    id: this.idFromPath('rel', 'maps_to_endpoint', `${symbol.parentSymbolId}:${symbol.id}`),
                    sourceKind: 'symbol',
                    sourceId: symbol.parentSymbolId,
                    targetKind: 'symbol',
                    targetId: symbol.id,
                    relationType: 'maps_to_endpoint',
                    confidenceLevel: 'extracted',
                    confidenceScore: 0.84,
                    evidence: this.endpointEvidence(symbol)
                });
            }
            const entitySymbolId = typeof symbol.metadata?.efEntitySymbolId === 'string' ? symbol.metadata.efEntitySymbolId : undefined;
            const entityName = typeof symbol.metadata?.efEntitySemanticFullName === 'string'
                ? symbol.metadata.efEntitySemanticFullName
                : typeof symbol.metadata?.efEntityFullName === 'string'
                    ? symbol.metadata.efEntityFullName
                    : typeof symbol.metadata?.efEntityType === 'string'
                        ? symbol.metadata.efEntityType
                        : undefined;
            const entity = (entitySymbolId ? symbolsById.get(entitySymbolId) : undefined)
                ?? (entityName ? this.resolveSymbolByTypeName(entityName, symbolsByName, symbolsBySemanticName) : undefined);
            if (entity && symbol.metadata?.isDbSet === true) {
                relations.push({
                    id: this.idFromPath('rel', 'uses_entity', `${symbol.id}:${entity.id}`),
                    sourceKind: 'symbol',
                    sourceId: symbol.id,
                    targetKind: 'symbol',
                    targetId: entity.id,
                    relationType: 'uses_entity',
                    confidenceLevel: 'extracted',
                    confidenceScore: 0.82,
                    evidence: `${symbol.name} maps entity ${entityName ?? entity.name}`
                });
                const parent = symbol.parentSymbolId ? symbolsById.get(symbol.parentSymbolId) : undefined;
                if (parent && this.isDbContextSymbol(parent)) {
                    relations.push({
                        id: this.idFromPath('rel', 'uses_entity', `${parent.id}:${entity.id}`),
                        sourceKind: 'symbol',
                        sourceId: parent.id,
                        targetKind: 'symbol',
                        targetId: entity.id,
                        relationType: 'uses_entity',
                        confidenceLevel: 'extracted',
                        confidenceScore: 0.86,
                        evidence: `${parent.name} exposes DbSet ${symbol.name} for ${entityName ?? entity.name}`
                    });
                }
            }
        }
        for (const symbol of symbols) {
            if (symbol.symbolKind === 'test_method') {
                const testBase = symbol.name.replace(/Tests?$|Should.*$/i, '').toLowerCase();
                const target = symbols.find(candidate => candidate.symbolKind === 'method' && candidate.name.toLowerCase().includes(testBase));
                if (target) {
                    relations.push({
                        id: this.idFromPath('rel', 'tests', `${symbol.id}:${target.id}`),
                        sourceKind: 'symbol',
                        sourceId: symbol.id,
                        targetKind: 'symbol',
                        targetId: target.id,
                        relationType: 'tests',
                        confidenceLevel: 'inferred',
                        confidenceScore: 0.55
                    });
                    relations.push({
                        id: this.idFromPath('rel', 'tested_by', `${target.id}:${symbol.id}`),
                        sourceKind: 'symbol',
                        sourceId: target.id,
                        targetKind: 'symbol',
                        targetId: symbol.id,
                        relationType: 'tested_by',
                        confidenceLevel: 'inferred',
                        confidenceScore: 0.55
                    });
                }
            }
        }
        for (const file of files) {
            const matchingTests = files.filter(candidate => candidate.relativePath.toLowerCase().includes(`${path.parse(file.fileName).name.toLowerCase()}tests`));
            for (const testFile of matchingTests) {
                relations.push({
                    id: this.idFromPath('rel', 'tests', `${testFile.id}:${file.id}`),
                    sourceKind: 'file',
                    sourceId: testFile.id,
                    targetKind: 'file',
                    targetId: file.id,
                    relationType: 'tests',
                    confidenceLevel: 'inferred',
                    confidenceScore: 0.5
                });
                relations.push({
                    id: this.idFromPath('rel', 'tested_by', `${file.id}:${testFile.id}`),
                    sourceKind: 'file',
                    sourceId: file.id,
                    targetKind: 'file',
                    targetId: testFile.id,
                    relationType: 'tested_by',
                    confidenceLevel: 'inferred',
                    confidenceScore: 0.5
                });
            }
        }
        return this.uniqueRelations(relations);
    }

    protected resolveSymbolByTypeName(
        typeName: string,
        symbolsByName: Map<string, MemorySymbol[]>,
        symbolsBySemanticName: Map<string, MemorySymbol[]>
    ): MemorySymbol | undefined {
        const normalized = typeName.toLowerCase();
        return symbolsBySemanticName.get(normalized)?.[0]
            ?? symbolsByName.get(normalized)?.[0]
            ?? symbolsByName.get(this.shortTypeName(typeName).toLowerCase())?.[0];
    }

    protected isDbContextSymbol(symbol: MemorySymbol): boolean {
        return symbol.metadata?.isDbContext === true
            || symbol.name === 'DbContext'
            || (typeof symbol.metadata?.semanticFullName === 'string' && symbol.metadata.semanticFullName.endsWith('.DbContext'));
    }

    protected endpointEvidence(symbol: MemorySymbol): string {
        const methods = Array.isArray(symbol.metadata?.httpMethods) ? symbol.metadata.httpMethods.join(',') : 'ANY';
        const route = typeof symbol.metadata?.route === 'string' && symbol.metadata.route ? symbol.metadata.route : symbol.name;
        return `${symbol.name} maps to ${methods} ${route}`;
    }

    protected shortTypeName(typeName: string): string {
        return typeName.replace(/\?.*$/, '').replace(/<.*$/, '').split('.').pop()?.trim() ?? typeName.trim();
    }

    protected uniqueRelations(relations: MemoryRelation[]): MemoryRelation[] {
        const seen = new Map<string, number>();
        const unique: MemoryRelation[] = [];
        for (const candidate of relations) {
            const relation = this.normalizeRelationConfidence(candidate);
            const key = `${relation.sourceKind}:${relation.sourceId}:${relation.relationType}:${relation.targetKind}:${relation.targetId}`;
            const existingIndex = seen.get(key);
            if (existingIndex === undefined) {
                seen.set(key, unique.length);
                unique.push(relation);
                continue;
            }
            if (this.relationResolutionRank(relation) > this.relationResolutionRank(unique[existingIndex])
                || (this.relationResolutionRank(relation) === this.relationResolutionRank(unique[existingIndex]) && relation.confidenceScore > unique[existingIndex].confidenceScore)) {
                unique[existingIndex] = relation;
            }
        }
        return unique;
    }

    protected normalizeRelationConfidence(relation: MemoryRelation): MemoryRelation {
        const rawScore = Number(relation.confidenceScore);
        if (Number.isFinite(rawScore)) {
            return {
                ...relation,
                confidenceScore: Math.max(0, Math.min(1, rawScore))
            };
        }
        const confidenceScore = relation.confidenceLevel === 'user_confirmed'
            ? 1
            : relation.confidenceLevel === 'extracted'
                ? 0.85
                : relation.confidenceLevel === 'ambiguous'
                    ? 0.45
                    : 0.6;
        return {
            ...relation,
            confidenceScore
        };
    }

    protected relationResolutionRank(relation: MemoryRelation): number {
        const source = relation.metadata?.extractionSource;
        const analysisMode = relation.metadata?.analysisMode;
        if (source === 'semantic' || (relation.confidenceLevel === 'extracted' && analysisMode !== 'structural-fallback')) {
            return 3;
        }
        if (relation.confidenceLevel === 'extracted') {
            return 2;
        }
        if (source === 'heuristic' || analysisMode === 'structural-fallback') {
            return 0;
        }
        return 1;
    }

    protected buildCodeGraph(files: MemoryFile[], symbols: MemorySymbol[], relations: MemoryRelation[]): MemoryGraph {
        const visibleFiles = files.filter(file => !file.isBinary).slice(0, 60);
        const visibleSymbols = symbols.slice(0, 120);
        const fileIds = new Set(visibleFiles.map(file => file.id));
        const symbolIds = new Set(visibleSymbols.map(symbol => symbol.id));
        return {
            title: 'Code Graph',
            nodes: [
                ...visibleFiles.map(file => ({
                    id: file.id,
                    kind: 'file' as const,
                    label: file.fileName,
                    detail: file.relativePath,
                    source: 'code' as const
                })),
                ...visibleSymbols.map(symbol => ({
                    id: symbol.id,
                    kind: 'symbol' as const,
                    label: symbol.name,
                    detail: symbol.symbolKind,
                    source: 'code-graph' as const
                }))
            ],
            edges: relations
                .filter(relation => fileIds.has(relation.sourceId) || symbolIds.has(relation.sourceId))
                .filter(relation => fileIds.has(relation.targetId) || symbolIds.has(relation.targetId))
                .slice(0, 180)
                .map(relation => ({
                    id: relation.id,
                    sourceId: relation.sourceId,
                    targetId: relation.targetId,
                    relationType: relation.relationType,
                    confidenceScore: relation.confidenceScore
            }))
        };
    }

    protected graphSnapshot(workspacePath: string, label: string, graph: MemoryGraph, createdAt: string): MemoryGraphSnapshot {
        return {
            id: this.id('graph-snapshot'),
            workspacePath,
            label,
            graphJson: JSON.stringify(graph),
            createdAt
        };
    }

    protected async buildDocumentsGraph(workspacePath: string): Promise<MemoryGraph> {
        const nodes = [{
            id: 'docs-root',
            kind: 'doc' as const,
            label: 'Local Versioned Docs',
            detail: 'SQLite/FTS5 documentation source',
            source: 'local-docs' as const
        }];
        const edges: MemoryGraph['edges'] = [];
        if (this.libraryService) {
            try {
                const packages = await this.libraryService.listInstalledPackages();
                for (const packageInfo of packages.slice(0, 30)) {
                    nodes.push({
                        id: `doc:${packageInfo.id}:${packageInfo.version}`,
                        kind: 'doc',
                        label: `${packageInfo.name} ${packageInfo.version}`,
                        detail: packageInfo.isLegacy ? 'legacy index' : 'versioned package',
                        source: 'local-docs'
                    });
                    edges.push({
                        id: this.id('doc-edge'),
                        sourceId: 'docs-root',
                        targetId: `doc:${packageInfo.id}:${packageInfo.version}`,
                        relationType: 'related_to_doc',
                        confidenceScore: 0.8
                    });
                }
            } catch {
                nodes[0].detail = `Docs service unavailable for ${workspacePath}`;
            }
        }
        return { title: 'Document Graph', nodes, edges };
    }

    protected buildMemoryGraph(memories: MemoryItem[], title: string): MemoryGraph {
        const rootId = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        return {
            title,
            nodes: [
                {
                    id: rootId,
                    kind: 'memory',
                    label: title,
                    source: 'project-memory'
                },
                ...memories.map(memory => ({
                    id: memory.id,
                    kind: 'memory' as const,
                    label: memory.title,
                    detail: memory.memoryType,
                    source: 'project-memory' as const,
                    staleStatus: memory.staleStatus
                }))
            ],
            edges: memories.map(memory => ({
                id: this.id('memory-edge'),
                sourceId: rootId,
                targetId: memory.id,
                relationType: 'related_to_memory' as const,
                confidenceScore: memory.status === 'active' ? 0.9 : 0.5
            }))
        };
    }

    protected buildKnowledgeGraphView(graphs: MemoryKnowledgeGraph[]): MemoryGraph {
        const defaultGraph = graphs.find(graph => graph.metadata?.defaultKind === 'project-decisions') ?? graphs[0];
        if (!defaultGraph) {
            return { title: 'Knowledge Graph', nodes: [], edges: [] };
        }
        return this.knowledgeGraphService.toGraph(defaultGraph);
    }

    protected ensureDefaultKnowledgeGraph(store: MemoryStore, workspacePath: string): boolean {
        const memories = this.activeKnowledgeMemories(store, workspacePath);
        if (!memories.length) {
            return false;
        }
        const now = new Date().toISOString();
        const existing = this.defaultKnowledgeGraph(store, workspacePath);
        if (existing) {
            const beforeConcepts = existing.concepts.length;
            const beforeLinks = existing.links.length;
            this.mergeMemoryConceptsIntoGraph(existing, memories, now);
            return existing.concepts.length !== beforeConcepts || existing.links.length !== beforeLinks;
        }
        const graph: MemoryKnowledgeGraph = {
            id: this.idFromPath('kg', workspacePath, 'project-decisions'),
            workspacePath,
            scope: 'workspace',
            title: 'Project Decisions',
            description: 'Derived from active Memory project memories.',
            status: 'active',
            tags: ['derived', 'memories'],
            concepts: [],
            links: [],
            metadata: {
                defaultKind: 'project-decisions'
            },
            createdAt: now,
            updatedAt: now
        };
        this.mergeMemoryConceptsIntoGraph(graph, memories, now);
        store.knowledgeGraphs.push(graph);
        return true;
    }

    protected mergeMemoryConceptsIntoGraph(graph: MemoryKnowledgeGraph, memories: MemoryItem[], now: string): void {
        const root = graph.concepts.find(concept => concept.metadata?.defaultRoot === true) ?? {
            id: this.idFromPath('kg-concept', graph.id, 'root'),
            graphId: graph.id,
            kind: 'concept' as const,
            title: graph.title,
            summary: graph.description ?? 'Project knowledge derived from local memories.',
            status: 'active' as const,
            sourceKind: 'knowledge-graph' as const,
            tags: ['root'],
            metadata: {
                defaultRoot: true
            },
            weight: 0.7,
            createdAt: now,
            updatedAt: now
        };
        if (!graph.concepts.some(concept => concept.id === root.id)) {
            graph.concepts.push(root);
        }
        for (const memory of memories) {
            const conceptId = this.idFromPath('kg-concept', graph.id, memory.id);
            if (!graph.concepts.some(concept => concept.id === conceptId)) {
                graph.concepts.push({
                    id: conceptId,
                    graphId: graph.id,
                    kind: this.knowledgeConceptKindForMemory(memory),
                    title: memory.title,
                    summary: memory.content,
                    status: memory.staleStatus === 'stale' ? 'stale' : 'active',
                    sourceKind: 'project-memory',
                    sourceId: memory.id,
                    evidence: memory.evidence,
                    tags: [memory.memoryType, memory.importance],
                    weight: memory.weight,
                    createdAt: now,
                    updatedAt: now
                });
            }
            const linkId = this.idFromPath('kg-link', graph.id, `${root.id}:${conceptId}`);
            if (!graph.links.some(link => link.id === linkId)) {
                graph.links.push({
                    id: linkId,
                    graphId: graph.id,
                    sourceConceptId: root.id,
                    targetConceptId: conceptId,
                    linkKind: 'documents',
                    confidenceScore: memory.status === 'active' ? 0.85 : 0.5,
                    evidence: `Derived from memory ${memory.id}.`,
                    createdAt: now,
                    updatedAt: now
                });
            }
        }
        for (const link of this.knowledgeGraphService.proposeSurprisingConnections(
            graph,
            (sourceConceptId, targetConceptId) => this.idFromPath('kg-link', graph.id, `surprising:${sourceConceptId}:${targetConceptId}`),
            now
        )) {
            if (!graph.links.some(existing => existing.id === link.id)) {
                graph.links.push(link);
            }
        }
        graph.updatedAt = now;
    }

    protected activeKnowledgeMemories(store: MemoryStore, workspacePath: string): MemoryItem[] {
        const key = this.workspaceKey(workspacePath);
        return store.memories
            .filter(memory => memory.status === 'active')
            .filter(memory => this.memoryService.isRetrievable(memory))
            .filter(memory => memory.scope === 'workspace' && this.workspaceKey(memory.workspacePath ?? '') === key)
            .filter(memory => [
                'project_decision',
                'project_convention',
                'architecture_note',
                'testing_note',
                'security_note',
                'manual_note'
            ].includes(memory.memoryType));
    }

    protected defaultKnowledgeGraph(store: MemoryStore, workspacePath: string): MemoryKnowledgeGraph | undefined {
        return store.knowledgeGraphs.find(graph => graph.metadata?.defaultKind === 'project-decisions' && this.knowledgeGraphInWorkspace(graph, workspacePath));
    }

    protected findKnowledgeGraph(store: MemoryStore, workspacePath: string, graphId: string): MemoryKnowledgeGraph | undefined {
        return store.knowledgeGraphs.find(graph => graph.id === graphId && this.knowledgeGraphInWorkspace(graph, workspacePath));
    }

    protected knowledgeGraphInWorkspace(graph: MemoryKnowledgeGraph, workspacePath: string): boolean {
        return graph.scope === 'global' || this.workspaceKey(graph.workspacePath ?? '') === this.workspaceKey(workspacePath);
    }

    protected knowledgeConceptKindForMemory(memory: MemoryItem): MemoryKnowledgeConceptKind {
        switch (memory.memoryType) {
            case 'project_decision':
                return 'decision';
            case 'project_convention':
            case 'architecture_note':
                return 'constraint';
            case 'user_preference':
                return 'preference';
            case 'bug_history':
            case 'security_note':
                return 'risk';
            case 'generated_skill_note':
                return 'skill';
            case 'file_location':
                return 'file';
            case 'command_note':
            case 'testing_note':
            case 'manual_note':
            default:
                return 'memory';
        }
    }

    protected async ensureSeedData(store: MemoryStore, workspacePath: string): Promise<void> {
        const key = this.workspaceKey(workspacePath);
        const now = new Date().toISOString();
        if (!store.memories.some(memory => this.workspaceKey(memory.workspacePath ?? '') === key)) {
            store.memories.push(this.memoryService.normalize({
                id: this.id('mem'),
                workspacePath,
                scope: 'workspace',
                memoryType: 'project_convention',
                title: 'Context approval is explicit',
                content: 'Memory suggests compact context packs, but the user approves context before it is sent to a provider.',
                status: 'active',
                staleStatus: 'fresh',
                createdAt: now,
                updatedAt: now,
                acceptedCount: 0,
                rejectedCount: 0
            }));
            store.memories.push(this.memoryService.normalize({
                id: this.id('mem'),
                scope: 'global',
                workspacePath: undefined,
                memoryType: 'user_preference',
                title: 'Prefer native local-first features',
                content: 'Avoid mandatory Python, Docker, external vector databases, or runtime dependencies for the Memory MVP.',
                status: 'active',
                staleStatus: 'fresh',
                createdAt: now,
                updatedAt: now,
                acceptedCount: 0,
                rejectedCount: 0
            }));
        }
        if (!store.skillCandidates.some(candidate => this.workspaceKey(candidate.workspacePath ?? '') === key)) {
            store.skillCandidates.push({
                id: this.id('skill'),
                workspacePath,
                signature: 'create_unit_test:csharp:method',
                title: 'Create C# service unit test',
                description: 'Candidate skill for repeated C# service method unit-test prompts.',
                triggerCount: 3,
                status: 'suggested',
                proposedSkillJson: JSON.stringify({
                    id: 'create-csharp-service-unit-test',
                    name: 'Create C# service unit test',
                    userApprovalRequired: true
                }),
                createdAt: now,
                updatedAt: now
            });
            store.skillCandidates.push({
                id: this.id('skill'),
                workspacePath,
                signature: 'obsolete:workspace-cleanup',
                title: 'Remove obsolete workspace cleanup skill',
                description: 'Skill candidate awaiting deletion because it was rejected repeatedly.',
                triggerCount: 1,
                status: 'delete_pending',
                createdAt: now,
                updatedAt: now
            });
        }
        this.ensureDefaultKnowledgeGraph(store, workspacePath);
    }

    protected async readStore(): Promise<MemoryStore> {
        return this.repository.read();
    }

    protected async writeStore(store: MemoryStore): Promise<void> {
        await this.repository.write(store);
    }

    protected async storePath(): Promise<string> {
        return this.repository.getStorePath();
    }

    protected defaultSettings(workspacePath: string): MemoryWorkspaceSettings {
        return {
            workspacePath,
            enabled: false,
            graphEnabled: false,
            memoryEnabled: false,
            skillSuggestionsEnabled: false,
            icmBridge: {
                enabled: false
            },
            vectorSearch: this.defaultVectorSettings(),
            chatLearningEnabled: false,
            chatInlineSuggestionsEnabled: false,
            chatAutoIndexEnabled: false,
            chatLearningLlmEnabled: false,
            chatLearningLlmFrequency: 0,
            chatLearningModelId: undefined,
            editorHoverEnabled: false,
            ignoreRules: {
                useGitignore: true,
                useCyberVinciIgnore: true
            },
            restrictIndexingToAllowlist: false,
            allowlist: [],
            denylist: [...DEFAULT_DENYLIST],
            exportOptions: {
                includeGlobalMemories: false
            },
            retentionPolicies: {
                sessionMemory: 'session',
                taskMemory: 'task',
                transcripts: 'manual',
                transcriptTtlDays: 30
            },
            externalDocCollections: [],
            optIn: {
                codeGraph: false,
                documentGraph: false,
                projectMemory: false,
                preferences: false,
                skills: false,
                contextCart: false,
                editorHover: false,
                vectorSearch: false,
                transcriptSearch: false,
                events: false,
                promptSnippets: false,
                pdfDocuments: false,
                officeDocuments: false,
                images: false,
                diagrams: false,
                audioVideo: false,
                remoteImageSemantics: false,
                remoteMediaTranscription: false,
                externalDocCollections: false
            },
            updatedAt: new Date().toISOString()
        };
    }

    protected normalizeSettings(workspacePath: string, settings: MemoryWorkspaceSettings | undefined): MemoryWorkspaceSettings {
        return {
            ...this.defaultSettings(workspacePath),
            ...settings,
            vectorSearch: {
                ...this.defaultVectorSettings(),
                ...settings?.vectorSearch,
                dimensions: this.vectorService.normalizeDimensions(settings?.vectorSearch?.dimensions ?? this.defaultVectorSettings().dimensions)
            },
            icmBridge: {
                enabled: false,
                ...settings?.icmBridge
            },
            ignoreRules: {
                ...this.defaultSettings(workspacePath).ignoreRules,
                ...settings?.ignoreRules
            },
            exportOptions: {
                ...this.defaultSettings(workspacePath).exportOptions,
                ...settings?.exportOptions
            },
            retentionPolicies: {
                ...this.defaultSettings(workspacePath).retentionPolicies,
                ...settings?.retentionPolicies,
                transcriptTtlDays: Math.max(1, Math.floor(settings?.retentionPolicies?.transcriptTtlDays ?? this.defaultSettings(workspacePath).retentionPolicies?.transcriptTtlDays ?? 30))
            },
            externalDocCollections: (settings?.externalDocCollections ?? [])
                .filter(collection => collection.id && collection.rootPath)
                .map(collection => ({
                    ...collection,
                    enabled: collection.enabled === true,
                    refreshPolicy: collection.refreshPolicy ?? 'manual',
                    maxFiles: Math.max(1, Math.floor(collection.maxFiles ?? 100))
                })),
            optIn: {
                ...this.defaultSettings(workspacePath).optIn,
                ...settings?.optIn
            }
        };
    }

    protected defaultVectorSettings(): MemoryVectorSettings {
        return {
            enabled: false,
            localModelId: this.vectorService.modelId,
            dimensions: this.vectorService.defaultDimensions,
            backfillStatus: 'not_started'
        };
    }

    protected consentAllowedSourceKinds(workspacePath: string, requested: readonly MemorySourceKind[] | undefined, store: MemoryStoreData): MemorySourceKind[] {
        const key = this.workspaceKey(workspacePath);
        const sourceKinds = requested ?? ['code', 'code-graph', 'project-memory', 'repository-memory', 'task-memory', 'skill', 'agent-event', 'local-docs', 'external-docs', 'feedback-record'];
        const rawSettings = store.settings[key];
        if (!rawSettings) {
            return [...sourceKinds];
        }
        const settings = this.normalizeSettings(workspacePath, rawSettings);
        const rawOptIn = rawSettings.optIn ?? {};
        const hasExplicitOptIn = (...keys: Array<keyof NonNullable<MemoryWorkspaceSettings['optIn']>>) =>
            keys.some(optInKey => Object.prototype.hasOwnProperty.call(rawOptIn, optInKey));
        const optInOrLegacy = (keys: Array<keyof NonNullable<MemoryWorkspaceSettings['optIn']>>, legacyEnabled: boolean): boolean =>
            hasExplicitOptIn(...keys) ? keys.some(optInKey => rawOptIn[optInKey] === true) : legacyEnabled;
        const enabled = settings.enabled === true
            || settings.graphEnabled === true
            || settings.memoryEnabled === true
            || settings.skillSuggestionsEnabled === true
            || settings.chatLearningEnabled === true
            || settings.chatInlineSuggestionsEnabled === true
            || settings.editorHoverEnabled === true
            || settings.vectorSearch?.enabled === true;
        if (!enabled) {
            return [];
        }
        return sourceKinds.filter(sourceKind => {
            switch (sourceKind) {
                case 'code':
                    return true;
                case 'code-graph':
                    return optInOrLegacy(['codeGraph'], settings.graphEnabled === true);
                case 'local-docs':
                    return optInOrLegacy(['documentGraph'], settings.graphEnabled === true);
                case 'external-docs':
                    return optInOrLegacy(['externalDocCollections'], settings.optIn?.externalDocCollections === true);
                case 'project-memory':
                case 'repository-memory':
                case 'task-memory':
                    return optInOrLegacy(['projectMemory', 'preferences', 'transcriptSearch'], settings.memoryEnabled === true || settings.vectorSearch?.enabled === true);
                case 'skill':
                    return optInOrLegacy(['skills'], settings.skillSuggestionsEnabled === true);
                case 'agent-event':
                    return optInOrLegacy(['events'], settings.chatLearningEnabled === true);
                case 'feedback-record':
                    return optInOrLegacy(['contextCart'], settings.chatInlineSuggestionsEnabled === true || settings.memoryEnabled === true);
                default:
                    return false;
            }
        });
    }

    protected workspaceKey(workspacePath: string): string {
        return this.repository.workspaceKey(workspacePath);
    }

    protected assignDefaultMemorySpace(memory: MemoryItem): MemoryItem {
        return {
            ...memory,
            memorySpaceId: memory.memorySpaceId ?? this.defaultMemorySpaceId(memory)
        };
    }

    protected upsertDefaultMemorySpace(store: MemoryStore, memory: MemoryItem, now: string): void {
        const id = memory.memorySpaceId ?? this.defaultMemorySpaceId(memory);
        const existing = store.memorySpaces.find(space => space.id === id);
        const space: MemorySpace = {
            id,
            scope: memory.scope,
            workspacePath: memory.scope === 'global' ? undefined : memory.workspacePath,
            repositoryUrl: memory.repositoryUrl,
            repositoryId: memory.repositoryId,
            sessionId: memory.sessionId,
            taskId: memory.taskId,
            retentionPolicy: memory.retentionPolicy,
            metadata: existing?.metadata ?? { kind: 'default' },
            createdAt: existing?.createdAt ?? memory.createdAt ?? now,
            updatedAt: now
        };
        store.memorySpaces = [
            ...store.memorySpaces.filter(candidate => candidate.id !== id),
            space
        ];
    }

    protected defaultMemorySpaceId(memory: Pick<MemoryItem, 'scope'> & Partial<MemoryItem>): string {
        switch (memory.scope) {
            case 'global':
                return 'default:global';
            case 'workspace':
                return `default:workspace:${memory.workspacePath ?? ''}`;
            case 'repository':
                return `default:repository:${memory.repositoryId ?? memory.repositoryUrl ?? ''}`;
            case 'session':
                return `default:session:${memory.sessionId ?? ''}`;
            case 'task':
                return `default:task:${memory.taskId ?? ''}`;
            default:
                return `default:${memory.scope}`;
        }
    }

    protected async repositoryIdentityForMemory(
        memory: Pick<MemoryItem, 'scope'> & Partial<Pick<MemoryItem, 'repositoryUrl' | 'repositoryId'>>,
        workspacePath: string | undefined
    ): Promise<MemoryRepositoryIdentity> {
        if (memory.scope !== 'repository' || memory.repositoryUrl || memory.repositoryId || !workspacePath) {
            return {};
        }
        return this.resolveRepositoryIdentity(workspacePath);
    }

    protected async resolveRepositoryIdentity(workspacePath: string): Promise<MemoryRepositoryIdentity> {
        const remoteUrl = await this.gitRemoteUrl(workspacePath);
        if (remoteUrl) {
            return {
                repositoryUrl: remoteUrl,
                repositoryId: this.repositoryIdFromRemote(remoteUrl)
            };
        }
        return {
            repositoryId: await this.repositoryIdFromWorkspacePath(workspacePath)
        };
    }

    protected async gitRemoteUrl(workspacePath: string): Promise<string | undefined> {
        try {
            const result = await execFileAsync('git', ['-C', workspacePath, 'config', '--get', 'remote.origin.url'], {
                timeout: 2000,
                windowsHide: true,
                maxBuffer: 1024 * 32
            });
            return result.stdout.trim() || undefined;
        } catch {
            return undefined;
        }
    }

    protected repositoryIdFromRemote(remoteUrl: string): string {
        const normalized = remoteUrl.trim()
            .replace(/^ssh:\/\/git@/i, '')
            .replace(/^https?:\/\/(?:[^@/]+@)?/i, '')
            .replace(/^git@([^:]+):/i, '$1/')
            .replace(/^([^@/]+@)?/, '')
            .replace(/\/+$/, '')
            .replace(/\.git$/i, '');
        return normalized.toLowerCase();
    }

    protected async repositoryIdFromWorkspacePath(workspacePath: string): Promise<string> {
        let resolvedPath = path.resolve(workspacePath || '.');
        try {
            resolvedPath = await fs.realpath(resolvedPath);
        } catch {
            // Keep the deterministic path fallback even when the workspace has not been created yet.
        }
        return `local:${createHash('sha256').update(resolvedPath.toLowerCase()).digest('hex').slice(0, 24)}`;
    }

    protected isSensitivePath(relativePath: string): boolean {
        const normalized = relativePath.toLowerCase();
        return normalized.includes('.env')
            || normalized.includes('secret')
            || normalized.includes('certificate')
            || normalized.endsWith('.pfx')
            || normalized.endsWith('.pem')
            || normalized.endsWith('.key')
            || normalized.endsWith('appsettings.production.json');
    }

    protected isGeneratedPath(relativePath: string): boolean {
        const normalized = relativePath.toLowerCase();
        return normalized.includes('/generated/') || normalized.endsWith('.g.cs') || normalized.endsWith('.designer.cs');
    }

    protected languageId(extension: string): string | undefined {
        switch (extension) {
            case '.cs':
                return 'csharp';
            case '.java':
                return 'java';
            case '.c':
                return 'c';
            case '.cc':
            case '.cpp':
            case '.cxx':
            case '.h':
            case '.hh':
            case '.hpp':
            case '.hxx':
                return 'cpp';
            case '.ts':
            case '.tsx':
                return 'typescript';
            case '.js':
            case '.jsx':
                return 'javascript';
            case '.md':
                return 'markdown';
            case '.json':
                return 'json';
            case '.yaml':
            case '.yml':
                return 'yaml';
            default:
                return extension ? extension.slice(1) : undefined;
        }
    }

    protected filePathForSymbol(files: MemoryFile[], symbol: MemorySymbol): string {
        return files.find(file => file.id === symbol.fileId)?.relativePath ?? 'unknown file';
    }

    protected isTestMethod(content: string, offset: number): boolean {
        const prefix = content.slice(Math.max(0, offset - 200), offset);
        return /\[(Fact|Theory|TestMethod|Test)\]/.test(prefix);
    }

    protected lineOf(content: string, offset: number): number {
        return content.slice(0, offset).split('\n').length;
    }

    protected score(haystack: string, needle: string): number {
        const normalizedHaystack = this.normalizeSearchText(haystack);
        const normalizedNeedle = this.normalizeSearchText(needle);
        if (!normalizedNeedle) {
            return 0;
        }
        const index = normalizedHaystack.indexOf(normalizedNeedle);
        if (index !== -1) {
            return 1 - Math.min(index / Math.max(normalizedHaystack.length, 1), 0.9);
        }
        const terms = this.searchTerms(normalizedNeedle);
        if (!terms.length) {
            return 0;
        }
        return terms.reduce((total, term) => total + (normalizedHaystack.includes(term) ? 1 : 0), 0) / terms.length;
    }

    protected searchTerms(text: string): string[] {
        return [...new Set(this.normalizeSearchText(text)
            .split(' ')
            .filter(token => token.length >= 2))].slice(0, 8);
    }

    protected id(prefix: string): string {
        return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    }

    protected idFromPath(prefix: string, root: string, relativePath: string): string {
        return `${prefix}_${this.hash(`${this.workspaceKey(root)}:${relativePath}`).slice(0, 20)}`;
    }

    protected async retrievalSourcesHash(workspacePath: string): Promise<string> {
        return this.repository.retrievalSourcesHash?.(workspacePath) ?? this.hash(`${this.workspaceKey(workspacePath)}:no-retrieval-source-hash`);
    }

    protected contextSuggestionCacheQueryKey(request: MemoryContextSuggestionRequest): string {
        return this.hash(JSON.stringify({
            workspaceKey: this.workspaceKey(request.workspacePath),
            prompt: request.prompt.trim().toLowerCase(),
            limit: request.limit ?? 12,
            tokenBudget: request.tokenBudget ?? 4000,
            sourceKinds: [...(request.sourceKinds ?? [])].sort(),
            sessionId: request.sessionId,
            taskId: request.taskId,
            rankingWeights: request.rankingWeights ? Object.entries(request.rankingWeights).sort(([left], [right]) => left.localeCompare(right)) : undefined
        }));
    }

    protected encodeContextSuggestionCache(result: MemoryContextSuggestionResult): RetrievalResult[] {
        return [{
            id: 'context-suggestion-result',
            sourceKind: result.suggestions[0]?.sourceKind ?? 'project-memory',
            title: 'Context suggestion cache result',
            snippet: JSON.stringify(result),
            score: 1,
            evidence: 'memory-retrieval-cache'
        }];
    }

    protected decodeContextSuggestionCache(results: RetrievalResult[]): MemoryContextSuggestionResult | undefined {
        try {
            const parsed = JSON.parse(results[0]?.snippet ?? '') as MemoryContextSuggestionResult;
            if (Array.isArray(parsed.suggestions) && typeof parsed.estimatedTokens === 'number' && typeof parsed.omittedCount === 'number') {
                return parsed;
            }
        } catch {
            // Ignore corrupt cache entries and recompute suggestions.
        }
        return undefined;
    }

    protected retrievalCacheQueryKey(query: RetrievalQuery): string {
        return this.hash(JSON.stringify({
            workspaceKey: this.workspaceKey(query.workspacePath),
            text: query.text.trim().toLowerCase(),
            limit: query.limit ?? 20,
            sourceKinds: [...(query.sourceKinds ?? [])].sort(),
            repositoryUrl: query.repositoryUrl,
            repositoryId: query.repositoryId,
            sessionId: query.sessionId,
            taskId: query.taskId
        }));
    }

    protected hash(value: string): string {
        let hash = 2166136261;
        for (let index = 0; index < value.length; index++) {
            hash ^= value.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
        }
        return (hash >>> 0).toString(16);
    }
}

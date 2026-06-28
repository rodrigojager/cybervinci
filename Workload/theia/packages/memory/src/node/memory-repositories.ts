// *****************************************************************************
// Copyright (C) 2026.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { createRequire } from 'module';
import { LibraryService } from '@cybervinci/library/lib/common/library-service';
import { inject, injectable, optional } from '@theia/core/shared/inversify';
import {
    MemoryServiceHelper,
    MemoryChangeImpact,
    MemoryCodeChunk,
    MemoryContextSuggestion,
    MemoryEvent,
    MemoryFeedbackRecord,
    MemoryFile,
    MemoryGraphSnapshot,
    MemoryKnowledgeConcept,
    MemoryKnowledgeGraph,
    MemoryKnowledgeLink,
    Memory,
    MemoryItem,
    MemorySpace,
    MemoryVector,
    MemoryBenchmarkReport,
    MemoryRetrievalCacheEntry,
    MemoryRelation,
    RetrievalResult,
    MemorySkill,
    MemorySkillCandidate,
    MemoryTranscriptMessage,
    MemoryTranscriptSession,
    MemoryWorkspaceSettings,
    MemoryWorkspaceSnapshot,
    SecretRedactionService
} from '../common';
import { MEMORY_SQLITE_MIGRATIONS } from '../common/memory-sqlite-migrations';

const nodeRequire = createRequire(__filename);

interface SqliteModule {
    DatabaseSync: new (databasePath: string, options?: { readOnly?: boolean }) => SqliteDatabase;
}

interface SqliteDatabase {
    exec(sql: string): void;
    prepare(sql: string): SqliteStatement;
    close(): void;
}

interface SqliteStatement {
    run(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
}

interface MemorySqliteMigration {
    id: string;
    description: string;
    statements: string[];
}

interface WorkspaceSectionInput {
    id: string;
    workspacePath: string;
    source: string;
    sourceId?: string;
    uri?: string;
    relativePath?: string;
    languageId?: string;
    sectionKind?: string;
    title: string;
    content: string;
    contentHash?: string;
    startLine?: number;
    endLine?: number;
    tokenCount?: number;
    indexedAt?: string;
    metadata?: Record<string, string | number | boolean | undefined>;
}

interface WorkspaceSectionSearchResult extends WorkspaceSectionInput {
    snippet: string;
    score: number;
}

interface WorkspaceSectionsDocsService {
    indexWorkspaceSections(request: {
        workspacePath: string;
        source: string;
        sections: WorkspaceSectionInput[];
        replace?: boolean;
    }): Promise<unknown>;
    searchWorkspaceSections(query: string, options?: {
        workspacePath?: string;
        source?: string;
        maxResults?: number;
    }): Promise<WorkspaceSectionSearchResult[]>;
}

export interface MemoryStoreData {
    settings: Record<string, MemoryWorkspaceSettings>;
    snapshots: Record<string, MemoryWorkspaceSnapshot>;
    files: Record<string, MemoryFile[]>;
    symbols: Record<string, import('../common').MemorySymbol[]>;
    relations: Record<string, MemoryRelation[]>;
    codeChunks: Record<string, MemoryCodeChunk[]>;
    graphSnapshots: MemoryGraphSnapshot[];
    changeImpacts: MemoryChangeImpact[];
    contextSuggestions: MemoryStoredContextSuggestion[];
    legacyMemories: Record<string, Memory[]>;
    skills: Record<string, MemorySkill[]>;
    memories: MemoryItem[];
    memorySpaces: MemorySpace[];
    memoryVectors: MemoryVector[];
    knowledgeGraphs: MemoryKnowledgeGraph[];
    skillCandidates: MemorySkillCandidate[];
    events: MemoryEvent[];
    feedbackRecords: MemoryFeedbackRecord[];
    transcriptSessions: MemoryTranscriptSession[];
    transcriptMessages: MemoryTranscriptMessage[];
    benchmarkReports: MemoryBenchmarkReport[];
}

export interface MemorySpaceFilter {
    scope?: MemorySpace['scope'];
    workspacePath?: string;
    repositoryUrl?: string;
    repositoryId?: string;
    sessionId?: string;
    taskId?: string;
    retentionPolicy?: MemorySpace['retentionPolicy'];
}

export interface MemoryVectorSearchRequest {
    workspacePath: string;
    queryVector: readonly number[];
    modelId: string;
    dimensions: number;
    limit?: number;
    repositoryUrl?: string;
    repositoryId?: string;
    sessionId?: string;
    taskId?: string;
}

export interface MemoryVectorSearchHit {
    vector: MemoryVector;
    memory: MemoryItem;
    score: number;
}

export type MemoryStoredContextSuggestion = MemoryContextSuggestion & {
    workspacePath: string;
    promptSignature: string;
    createdAt: string;
    accepted?: boolean;
};

export interface MemoryStoreRepository {
    getStorePath(): Promise<string>;
    read(): Promise<MemoryStoreData>;
    write(store: MemoryStoreData): Promise<void>;
    workspaceKey(workspacePath: string): string;
    replaceCodeChunks(workspacePath: string, chunks: MemoryCodeChunk[]): Promise<void>;
    searchCodeChunks(workspacePath: string, query: string, limit?: number): Promise<MemoryCodeChunk[]>;
    searchMemories?(workspacePath: string | undefined, query: string, limit?: number): Promise<MemoryItem[]>;
    searchMemoryVectors?(request: MemoryVectorSearchRequest): Promise<MemoryVectorSearchHit[]>;
    searchEvents?(workspacePath: string, query: string, limit?: number): Promise<MemoryEvent[]>;
    searchSkillCandidates?(workspacePath: string | undefined, query: string, limit?: number): Promise<MemorySkillCandidate[]>;
    listMemorySpaces?(filter?: MemorySpaceFilter): Promise<MemorySpace[]>;
    upsertMemorySpace?(space: MemorySpace): Promise<MemorySpace>;
    resolveMemorySpace?(filter: MemorySpaceFilter): Promise<MemorySpace | undefined>;
    rebuildCodeChunkIndex(): Promise<boolean>;
    rebuildFullTextIndexes?(): Promise<boolean>;
    retrievalSourcesHash?(workspacePath: string): Promise<string>;
    getRetrievalCache?(queryKey: string, workspacePath: string, sourcesHash: string): Promise<MemoryRetrievalCacheEntry | undefined>;
    setRetrievalCache?(entry: MemoryRetrievalCacheEntry): Promise<void>;
    invalidateRetrievalCache?(workspacePath: string, relativePaths?: readonly string[]): Promise<number>;
}

export const MemoryStoreRepository = Symbol('MemoryStoreRepository');

@injectable()
export class MemoryJsonStoreRepository implements MemoryStoreRepository {

    protected readonly memoryService = new MemoryServiceHelper();
    protected readonly redactionService = new SecretRedactionService();

    constructor(
        @inject(LibraryService) @optional()
        protected readonly libraryService: LibraryService | undefined
    ) { }

    async getStorePath(): Promise<string> {
        return path.join(os.homedir(), '.cybervinci', 'memory', 'store.json');
    }

    async read(): Promise<MemoryStoreData> {
        const storePath = await this.getStorePath();
        try {
            return this.normalize(JSON.parse(await fs.readFile(storePath, 'utf8')) as Partial<MemoryStoreData>);
        } catch {
            return this.normalize({});
        }
    }

    async write(store: MemoryStoreData): Promise<void> {
        const storePath = await this.getStorePath();
        await fs.mkdir(path.dirname(storePath), { recursive: true });
        await fs.writeFile(storePath, `${JSON.stringify(this.normalize(store), undefined, 2)}\n`, 'utf8');
    }

    async replaceCodeChunks(workspacePath: string, chunks: MemoryCodeChunk[]): Promise<void> {
        const store = await this.read();
        store.codeChunks[this.workspaceKey(workspacePath)] = chunks;
        await this.write(store);
        if (!await this.indexCodeChunksWithLibrary(workspacePath, chunks)) {
            await this.rebuildCodeChunkIndex();
        }
    }

    async searchCodeChunks(workspacePath: string, query: string, limit = 20): Promise<MemoryCodeChunk[]> {
        const docsResults = await this.searchCodeChunksWithLibrary(workspacePath, query, limit);
        if (docsResults) {
            return docsResults;
        }
        const sqliteResults = await this.trySearchCodeChunksSqlite(workspacePath, query, limit);
        if (sqliteResults) {
            return sqliteResults;
        }
        const store = await this.read();
        const key = this.workspaceKey(workspacePath);
        const terms = this.searchTerms(query);
        return (store.codeChunks[key] ?? [])
            .map(chunk => ({ chunk, score: this.chunkScore(chunk, terms) }))
            .filter(item => !terms.length || item.score > 0)
            .sort((left, right) => right.score - left.score || left.chunk.relativePath.localeCompare(right.chunk.relativePath))
            .slice(0, limit)
            .map(item => item.chunk);
    }

    async searchMemories(workspacePath: string | undefined, query: string, limit = 20): Promise<MemoryItem[]> {
        const store = await this.read();
        const workspaceKey = workspacePath ? this.workspaceKey(workspacePath) : undefined;
        const terms = this.searchTerms(query);
        return store.memories
            .filter(memory => this.matchesOptionalWorkspace(memory.workspacePath, workspaceKey))
            .filter(memory => this.memoryService.isRetrievable(memory))
            .map(memory => ({ memory, score: this.memoryScore(memory, terms) }))
            .filter(item => !terms.length || item.score > 0)
            .sort((left, right) => right.score - left.score || right.memory.weight - left.memory.weight || right.memory.updatedAt.localeCompare(left.memory.updatedAt))
            .slice(0, limit)
            .map(item => item.memory);
    }

    async listMemorySpaces(filter: MemorySpaceFilter = {}): Promise<MemorySpace[]> {
        const store = await this.read();
        return store.memorySpaces
            .filter(space => this.memorySpaceMatchesFilter(space, filter))
            .sort((left, right) => left.id.localeCompare(right.id));
    }

    async resolveMemorySpace(filter: MemorySpaceFilter): Promise<MemorySpace | undefined> {
        return (await this.listMemorySpaces(filter))[0];
    }

    async upsertMemorySpace(space: MemorySpace): Promise<MemorySpace> {
        const store = await this.read();
        const normalized = this.normalizeMemorySpace(space);
        store.memorySpaces = [
            ...store.memorySpaces.filter(candidate => candidate.id !== normalized.id),
            normalized
        ];
        await this.write(store);
        return normalized;
    }

    async searchEvents(workspacePath: string, query: string, limit = 20): Promise<MemoryEvent[]> {
        const store = await this.read();
        const workspaceKey = this.workspaceKey(workspacePath);
        const terms = this.searchTerms(query);
        return store.events
            .filter(event => this.workspaceKey(event.workspacePath) === workspaceKey)
            .map(event => ({ event, score: this.eventScore(event, terms) }))
            .filter(item => !terms.length || item.score > 0)
            .sort((left, right) => right.score - left.score || right.event.createdAt.localeCompare(left.event.createdAt))
            .slice(0, limit)
            .map(item => item.event);
    }

    async searchSkillCandidates(workspacePath: string | undefined, query: string, limit = 20): Promise<MemorySkillCandidate[]> {
        const store = await this.read();
        const workspaceKey = workspacePath ? this.workspaceKey(workspacePath) : undefined;
        const terms = this.searchTerms(query);
        return store.skillCandidates
            .filter(candidate => this.matchesOptionalWorkspace(candidate.workspacePath, workspaceKey))
            .map(candidate => ({ candidate, score: this.skillCandidateScore(candidate, terms) }))
            .filter(item => !terms.length || item.score > 0)
            .sort((left, right) => right.score - left.score || right.candidate.updatedAt.localeCompare(left.candidate.updatedAt))
            .slice(0, limit)
            .map(item => item.candidate);
    }

    async rebuildCodeChunkIndex(): Promise<boolean> {
        if (await this.rebuildCodeChunkIndexWithLibrary()) {
            return true;
        }
        const sqlite = this.getSqliteModule();
        if (!sqlite) {
            return false;
        }
        const store = await this.read();
        const databasePath = await this.codeChunkDatabasePath();
        try {
            await fs.mkdir(path.dirname(databasePath), { recursive: true });
            await fs.rm(databasePath, { force: true });
            const database = new sqlite.DatabaseSync(databasePath);
            database.exec([
                'CREATE VIRTUAL TABLE pi_code_chunks_fts USING fts5(',
                'id UNINDEXED, workspace_path UNINDEXED, file_id UNINDEXED,',
                'relative_path, language_id UNINDEXED, chunk_kind UNINDEXED,',
                'title, content, content_hash UNINDEXED, symbol_name,',
                'start_line UNINDEXED, end_line UNINDEXED, estimated_tokens UNINDEXED, indexed_at UNINDEXED',
                ')'
            ].join(' '));
            const insert = database.prepare([
                'INSERT INTO pi_code_chunks_fts (',
                'id, workspace_path, file_id, relative_path, language_id, chunk_kind, title, content, content_hash, symbol_name,',
                'start_line, end_line, estimated_tokens, indexed_at',
                ') VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            ].join(' '));
            for (const chunks of Object.values(store.codeChunks)) {
                for (const chunk of chunks) {
                    insert.run(
                        chunk.id,
                        this.workspaceKey(chunk.workspacePath),
                        chunk.fileId,
                        chunk.relativePath,
                        chunk.languageId ?? '',
                        chunk.chunkKind,
                        chunk.title,
                        chunk.content,
                        chunk.contentHash,
                        chunk.symbolName ?? '',
                        chunk.startLine,
                        chunk.endLine,
                        chunk.estimatedTokens,
                        chunk.indexedAt
                    );
                }
            }
            database.close();
            return true;
        } catch {
            return false;
        }
    }

    async getRetrievalCache(_queryKey: string, _workspacePath: string, _sourcesHash: string): Promise<MemoryRetrievalCacheEntry | undefined> {
        return undefined;
    }

    async setRetrievalCache(_entry: MemoryRetrievalCacheEntry): Promise<void> {
        // JSON storage relies on source hashes for cache invalidation and does not persist retrieval cache entries.
    }

    async invalidateRetrievalCache(_workspacePath: string, _relativePaths?: readonly string[]): Promise<number> {
        return 0;
    }

    workspaceKey(workspacePath: string): string {
        return path.resolve(workspacePath || '.').toLowerCase();
    }

    protected normalize(store: Partial<MemoryStoreData>): MemoryStoreData {
        const memories = this.memoryService.normalizeAll((store.memories ?? []) as MemoryItem[])
            .map(memory => this.assignDefaultMemorySpace(memory));
        const memorySpaces = new Map<string, MemorySpace>();
        for (const memory of memories) {
            const space = this.defaultMemorySpace(memory);
            memorySpaces.set(space.id, space);
        }
        for (const space of (store.memorySpaces ?? []).map(candidate => this.normalizeMemorySpace(candidate as MemorySpace))) {
            memorySpaces.set(space.id, space);
        }
        return {
            settings: store.settings ?? {},
            snapshots: store.snapshots ?? {},
            files: store.files ?? {},
            symbols: store.symbols ?? {},
            relations: store.relations ?? {},
            codeChunks: store.codeChunks ?? {},
            graphSnapshots: store.graphSnapshots ?? [],
            changeImpacts: store.changeImpacts ?? [],
            contextSuggestions: store.contextSuggestions ?? [],
            legacyMemories: store.legacyMemories ?? {},
            skills: store.skills ?? {},
            memories,
            memorySpaces: [...memorySpaces.values()],
            memoryVectors: store.memoryVectors ?? [],
            knowledgeGraphs: (store.knowledgeGraphs ?? []).map(graph => ({
                ...graph,
                concepts: graph.concepts ?? [],
                links: graph.links ?? []
            })),
            skillCandidates: store.skillCandidates ?? [],
            events: this.normalizeEvents(store.events ?? [], store.settings ?? {}),
            feedbackRecords: store.feedbackRecords ?? [],
            transcriptSessions: store.transcriptSessions ?? [],
            transcriptMessages: store.transcriptMessages ?? [],
            benchmarkReports: store.benchmarkReports ?? []
        };
    }

    protected normalizeMemorySpace(space: MemorySpace): MemorySpace {
        return {
            ...space,
            workspacePath: space.scope === 'global' ? undefined : space.workspacePath,
            metadata: this.normalizeScalarMetadata(space.metadata)
        };
    }

    protected assignDefaultMemorySpace(memory: MemoryItem): MemoryItem {
        return {
            ...memory,
            memorySpaceId: memory.memorySpaceId ?? this.defaultMemorySpaceId(memory)
        };
    }

    protected defaultMemorySpace(memory: MemoryItem): MemorySpace {
        return this.normalizeMemorySpace({
            id: memory.memorySpaceId ?? this.defaultMemorySpaceId(memory),
            scope: memory.scope,
            workspacePath: memory.scope === 'global' ? undefined : memory.workspacePath,
            repositoryUrl: memory.repositoryUrl,
            repositoryId: memory.repositoryId,
            sessionId: memory.sessionId,
            taskId: memory.taskId,
            retentionPolicy: memory.retentionPolicy,
            metadata: { kind: 'default' },
            createdAt: memory.createdAt,
            updatedAt: memory.updatedAt
        });
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

    protected normalizeScalarMetadata(
        metadata: MemorySpace['metadata']
    ): MemorySpace['metadata'] {
        if (!metadata) {
            return undefined;
        }
        const normalized: NonNullable<MemorySpace['metadata']> = {};
        for (const [key, value] of Object.entries(metadata)) {
            if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                normalized[key] = value;
            }
        }
        return Object.keys(normalized).length ? normalized : undefined;
    }

    protected normalizeEvents(
        events: MemoryEvent[],
        settings: MemoryStoreData['settings']
    ): MemoryEvent[] {
        return events.map(event => this.normalizeEvent(event, settings));
    }

    protected normalizeEvent(
        event: MemoryEvent,
        settings: MemoryStoreData['settings']
    ): MemoryEvent {
        return {
            ...event,
            payload: this.normalizeEventPayload(event, settings),
            relativePath: this.redactionService.redactText(event.relativePath),
            promptSignature: this.redactionService.redactText(event.promptSignature)
        };
    }

    protected normalizeEventPayload(
        event: MemoryEvent,
        settings: MemoryStoreData['settings']
    ): string | undefined {
        const redactedPayload = this.redactionService.redactText(event.payload);
        if (event.eventType !== 'prompt.submitted' || !redactedPayload) {
            return redactedPayload;
        }
        return this.minimizePromptEventPayload(redactedPayload, this.promptSnippetsEnabled(event.workspacePath, settings));
    }

    protected minimizePromptEventPayload(payload: string, includeRedactedSnippet: boolean): string | undefined {
        try {
            const parsed = JSON.parse(payload) as Record<string, unknown>;
            for (const key of ['prompt', 'text', 'content', 'message']) {
                delete parsed[key];
            }
            if (includeRedactedSnippet) {
                for (const key of ['promptSnippet', 'redactedPromptSnippet', 'promptSample', 'redactedPromptSample']) {
                    if (typeof parsed[key] === 'string') {
                        parsed[key] = this.redactPromptSnippetText(parsed[key] as string);
                    }
                }
            } else {
                for (const key of ['promptSnippet', 'redactedPromptSnippet', 'promptSample', 'redactedPromptSample']) {
                    delete parsed[key];
                }
            }
            return JSON.stringify(parsed);
        } catch {
            return undefined;
        }
    }

    protected promptSnippetsEnabled(
        workspacePath: string,
        settings: MemoryStoreData['settings']
    ): boolean {
        return settings[this.workspaceKey(workspacePath)]?.optIn?.promptSnippets === true;
    }

    protected redactPromptSnippetText(value: string): string {
        return (this.redactionService.redactText(value) ?? '')
            .replace(/(?=[A-Za-z0-9_=-]{32,})(?=[A-Za-z0-9_=-]*[0-9=])[A-Za-z0-9_=-]{32,}/g, token => `${token.slice(0, 6)}********${token.slice(-4)}`);
    }

    protected async codeChunkDatabasePath(): Promise<string> {
        return path.join(path.dirname(await this.getStorePath()), 'code-chunks.db');
    }

    protected async indexCodeChunksWithLibrary(workspacePath: string, chunks: MemoryCodeChunk[]): Promise<boolean> {
        const service = this.workspaceSectionService();
        if (!service) {
            return false;
        }
        try {
            await service.indexWorkspaceSections({
                workspacePath,
                source: 'memory',
                replace: true,
                sections: chunks.map(chunk => this.toWorkspaceSection(chunk))
            });
            return true;
        } catch {
            return false;
        }
    }

    protected async rebuildCodeChunkIndexWithLibrary(): Promise<boolean> {
        const service = this.workspaceSectionService();
        if (!service) {
            return false;
        }
        const store = await this.read();
        try {
            for (const chunks of Object.values(store.codeChunks)) {
                const workspacePath = chunks[0]?.workspacePath;
                if (!workspacePath) {
                    continue;
                }
                await service.indexWorkspaceSections({
                    workspacePath,
                    source: 'memory',
                    replace: true,
                    sections: chunks.map(chunk => this.toWorkspaceSection(chunk))
                });
            }
            return true;
        } catch {
            return false;
        }
    }

    protected async searchCodeChunksWithLibrary(workspacePath: string, query: string, limit: number): Promise<MemoryCodeChunk[] | undefined> {
        const service = this.workspaceSectionService();
        if (!service) {
            return undefined;
        }
        try {
            const sections = await service.searchWorkspaceSections(query, {
                workspacePath,
                source: 'memory',
                maxResults: limit
            });
            return sections.map(section => this.toCodeChunk(section, workspacePath));
        } catch {
            return undefined;
        }
    }

    protected workspaceSectionService(): WorkspaceSectionsDocsService | undefined {
        const candidate = this.libraryService as Partial<WorkspaceSectionsDocsService> | undefined;
        if (typeof candidate?.indexWorkspaceSections === 'function' && typeof candidate.searchWorkspaceSections === 'function') {
            return candidate as WorkspaceSectionsDocsService;
        }
        return undefined;
    }

    protected toWorkspaceSection(chunk: MemoryCodeChunk): WorkspaceSectionInput {
        return {
            id: chunk.id,
            workspacePath: chunk.workspacePath,
            source: 'memory',
            sourceId: chunk.fileId,
            uri: `${chunk.relativePath}:${chunk.startLine}`,
            relativePath: chunk.relativePath,
            languageId: chunk.languageId,
            sectionKind: chunk.chunkKind,
            title: chunk.title,
            content: chunk.content,
            contentHash: chunk.contentHash,
            startLine: chunk.startLine,
            endLine: chunk.endLine,
            tokenCount: chunk.estimatedTokens,
            indexedAt: chunk.indexedAt,
            metadata: {
                symbolName: chunk.symbolName
            }
        };
    }

    protected toCodeChunk(section: WorkspaceSectionSearchResult, fallbackWorkspacePath: string): MemoryCodeChunk {
        return {
            id: section.id,
            workspacePath: section.workspacePath || fallbackWorkspacePath,
            fileId: section.sourceId ?? '',
            relativePath: section.relativePath ?? section.uri?.split(':')[0] ?? '',
            languageId: section.languageId,
            chunkKind: this.toChunkKind(section.sectionKind),
            title: section.title,
            content: section.content,
            contentHash: section.contentHash ?? '',
            symbolName: typeof section.metadata?.symbolName === 'string' ? section.metadata.symbolName : undefined,
            startLine: section.startLine ?? 1,
            endLine: section.endLine ?? section.startLine ?? 1,
            estimatedTokens: section.tokenCount ?? this.estimateTokens(section.content),
            indexedAt: section.indexedAt ?? new Date().toISOString()
        };
    }

    protected async trySearchCodeChunksSqlite(workspacePath: string, query: string, limit: number): Promise<MemoryCodeChunk[] | undefined> {
        const sqlite = this.getSqliteModule();
        if (!sqlite) {
            return undefined;
        }
        const databasePath = await this.codeChunkDatabasePath();
        try {
            await fs.stat(databasePath);
            const terms = this.searchTerms(query);
            const database = new sqlite.DatabaseSync(databasePath, { readOnly: true });
            const rows = database.prepare([
                'SELECT id, workspace_path, file_id, relative_path, language_id, chunk_kind, title, content, content_hash, symbol_name,',
                'start_line, end_line, estimated_tokens, indexed_at, bm25(pi_code_chunks_fts) AS rank',
                'FROM pi_code_chunks_fts',
                'WHERE workspace_path = ?',
                terms.length ? 'AND pi_code_chunks_fts MATCH ?' : '',
                terms.length ? 'ORDER BY rank LIMIT ?' : 'LIMIT ?'
            ].join(' ')).all(...(terms.length ? [
                this.workspaceKey(workspacePath),
                terms.map(term => `"${term.replace(/"/g, '""')}"`).join(' OR '),
                limit
            ] : [
                this.workspaceKey(workspacePath),
                limit
            ])) as Array<Record<string, unknown>>;
            database.close();
            return rows.map(row => ({
                id: String(row.id),
                workspacePath,
                fileId: String(row.file_id),
                relativePath: String(row.relative_path),
                languageId: this.optionalString(row.language_id),
                chunkKind: String(row.chunk_kind) as MemoryCodeChunk['chunkKind'],
                title: String(row.title),
                content: String(row.content),
                contentHash: String(row.content_hash),
                symbolName: this.optionalString(row.symbol_name),
                startLine: Number(row.start_line),
                endLine: Number(row.end_line),
                estimatedTokens: Number(row.estimated_tokens),
                indexedAt: String(row.indexed_at)
            }));
        } catch {
            return undefined;
        }
    }

    protected getSqliteModule(): SqliteModule | undefined {
        try {
            return nodeRequire('node:sqlite') as SqliteModule;
        } catch {
            return undefined;
        }
    }

    protected searchTerms(query: string): string[] {
        return query.toLowerCase().match(/[a-z0-9_.$#-]{2,}/g)?.slice(0, 8) ?? [];
    }

    protected ftsMatchQuery(query: string): string | undefined {
        const terms = this.searchTerms(query).map(term => term.replace(/"/g, '""'));
        return terms.length ? terms.map(term => `"${term}"`).join(' OR ') : undefined;
    }

    protected chunkScore(chunk: MemoryCodeChunk, terms: string[]): number {
        if (!terms.length) {
            return 0.25;
        }
        const haystack = `${chunk.relativePath} ${chunk.title} ${chunk.symbolName ?? ''} ${chunk.content}`.toLowerCase();
        return terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0) / terms.length;
    }

    protected memoryScore(memory: MemoryItem, terms: string[]): number {
        const normalized = this.memoryService.normalize(memory);
        if (!terms.length) {
            return normalized.weight;
        }
        const haystack = [
            normalized.scope,
            normalized.memoryType,
            normalized.title,
            normalized.content,
            normalized.importance,
            normalized.source ?? '',
            normalized.evidence ?? ''
        ].join(' ').toLowerCase();
        const termScore = terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0) / terms.length;
        return termScore * Math.max(0.1, normalized.weight);
    }

    protected eventScore(event: MemoryEvent, terms: string[]): number {
        if (!terms.length) {
            return 0.25;
        }
        const haystack = [
            event.eventType,
            event.relativePath ?? '',
            event.promptSignature ?? '',
            event.payload ?? ''
        ].join(' ').toLowerCase();
        return terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0) / terms.length;
    }

    protected skillCandidateScore(candidate: MemorySkillCandidate, terms: string[]): number {
        if (!terms.length) {
            return 0.25;
        }
        const haystack = [
            candidate.signature,
            candidate.title,
            candidate.description,
            candidate.proposedSkillJson ?? '',
            candidate.statusReason ?? ''
        ].join(' ').toLowerCase();
        return terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0) / terms.length;
    }

    protected matchesOptionalWorkspace(workspacePath: string | undefined, workspaceKey: string | undefined): boolean {
        return !workspaceKey || !workspacePath || this.workspaceKey(workspacePath) === workspaceKey;
    }

    protected memorySpaceMatchesFilter(space: MemorySpace, filter: MemorySpaceFilter): boolean {
        if (filter.scope && space.scope !== filter.scope) {
            return false;
        }
        if (filter.workspacePath && (!space.workspacePath || this.workspaceKey(space.workspacePath) !== this.workspaceKey(filter.workspacePath))) {
            return false;
        }
        if (filter.repositoryUrl && space.repositoryUrl !== filter.repositoryUrl) {
            return false;
        }
        if (filter.repositoryId && space.repositoryId !== filter.repositoryId) {
            return false;
        }
        if (filter.sessionId && space.sessionId !== filter.sessionId) {
            return false;
        }
        if (filter.taskId && space.taskId !== filter.taskId) {
            return false;
        }
        if (filter.retentionPolicy && space.retentionPolicy !== filter.retentionPolicy) {
            return false;
        }
        return true;
    }

    protected toChunkKind(value: string | undefined): MemoryCodeChunk['chunkKind'] {
        switch (value) {
            case 'file':
            case 'symbol':
            case 'markdown-section':
            case 'json-block':
            case 'yaml-block':
            case 'text-block':
                return value;
            default:
                return 'text-block';
        }
    }

    protected estimateTokens(content: string): number {
        return Math.ceil(content.split(/\s+/).filter(Boolean).length * 1.3);
    }

    protected optionalString(value: unknown): string | undefined {
        const text = String(value ?? '');
        return text ? text : undefined;
    }
}

@injectable()
export class MemorySqliteStoreRepository extends MemoryJsonStoreRepository {

    protected readonly dataTables = [
        'pi_workspace_settings',
        'pi_workspace_snapshots',
        'pi_files',
        'pi_symbols',
        'pi_relations',
        'pi_code_chunks',
        'pi_graph_snapshots',
        'pi_change_impacts',
        'pi_context_suggestions',
        'pi_legacy_memories',
        'pi_skills',
        'pi_memory_items',
        'pi_memory_spaces',
        'pi_memory_vectors',
        'pi_memory_relations',
        'pi_knowledge_graphs',
        'pi_knowledge_concepts',
        'pi_knowledge_links',
        'pi_skill_candidates',
        'pi_events',
        'pi_feedback_records',
        'pi_transcript_sessions',
        'pi_transcript_messages',
        'pi_benchmark_reports',
        'pi_workspaces',
        'pi_retrieval_cache'
    ];

    protected readonly migrations: MemorySqliteMigration[] = MEMORY_SQLITE_MIGRATIONS;

    constructor(
        @inject(LibraryService) @optional()
        libraryService: LibraryService | undefined
    ) {
        super(libraryService);
    }

    override async getStorePath(): Promise<string> {
        return path.join(os.homedir(), '.cybervinci', 'memory', 'store.sqlite');
    }

    override async read(): Promise<MemoryStoreData> {
        const database = await this.openDatabase();
        if (!database) {
            return this.readJsonBackup();
        }
        try {
            await this.ensureJsonImported(database);
            return this.readDatabase(database);
        } finally {
            database.close();
        }
    }

    override async write(store: MemoryStoreData): Promise<void> {
        const normalized = this.normalize(store);
        const database = await this.openDatabase();
        if (!database) {
            await this.writeJsonBackup(normalized);
            return;
        }
        try {
            this.writeDatabase(database, normalized);
        } finally {
            database.close();
        }
        await this.writeJsonBackup(normalized);
    }

    override async replaceCodeChunks(workspacePath: string, chunks: MemoryCodeChunk[]): Promise<void> {
        const store = await this.read();
        store.codeChunks[this.workspaceKey(workspacePath)] = chunks;
        await this.write(store);
        await this.indexCodeChunksWithLibrary(workspacePath, chunks);
    }

    override async searchCodeChunks(workspacePath: string, query: string, limit = 20): Promise<MemoryCodeChunk[]> {
        const docsResults = await this.searchCodeChunksWithLibrary(workspacePath, query, limit);
        if (docsResults) {
            return docsResults;
        }
        const database = await this.openDatabase();
        if (!database) {
            return super.searchCodeChunks(workspacePath, query, limit);
        }
        try {
            await this.ensureJsonImported(database);
            const terms = this.searchTerms(query);
            const rows = database.prepare([
                'SELECT payload_json FROM pi_code_chunks',
                'WHERE workspace_key = ?',
                'ORDER BY relative_path, id'
            ].join(' ')).all(this.workspaceKey(workspacePath)) as Array<Record<string, unknown>>;
            return rows
                .map(row => this.parsePayload<MemoryCodeChunk>(row.payload_json))
                .filter((chunk): chunk is MemoryCodeChunk => !!chunk)
                .map(chunk => ({ chunk, score: this.chunkScore(chunk, terms) }))
                .filter(item => !terms.length || item.score > 0)
                .sort((left, right) => right.score - left.score || left.chunk.relativePath.localeCompare(right.chunk.relativePath))
                .slice(0, limit)
                .map(item => item.chunk);
        } finally {
            database.close();
        }
    }

    override async searchMemories(workspacePath: string | undefined, query: string, limit = 20): Promise<MemoryItem[]> {
        const database = await this.openDatabase();
        if (!database) {
            return super.searchMemories(workspacePath, query, limit);
        }
        try {
            await this.ensureJsonImported(database);
            const workspaceKey = workspacePath ? this.workspaceKey(workspacePath) : undefined;
            const matchQuery = this.ftsMatchQuery(query);
            const rows = matchQuery
                ? database.prepare([
                    'SELECT pi_memory_items.payload_json, bm25(pi_memory_fts, 2.5, 4.0, 1.0, 0.5) AS rank',
                    'FROM pi_memory_fts JOIN pi_memory_items ON pi_memory_items.rowid = pi_memory_fts.rowid',
                    'WHERE pi_memory_fts MATCH ?',
                    workspaceKey ? 'AND (pi_memory_items.workspace_key = ? OR pi_memory_items.workspace_key IS NULL)' : '',
                    'ORDER BY rank * MAX(pi_memory_items.weight, 0.1), pi_memory_items.updated_at DESC',
                    'LIMIT ?'
                ].join(' ')).all(...(workspaceKey ? [matchQuery, workspaceKey, limit] : [matchQuery, limit]))
                : database.prepare([
                    'SELECT payload_json FROM pi_memory_items',
                    workspaceKey ? 'WHERE workspace_key = ? OR workspace_key IS NULL' : '',
                    'ORDER BY weight DESC, updated_at DESC, id',
                    'LIMIT ?'
                ].join(' ')).all(...(workspaceKey ? [workspaceKey, limit] : [limit]));
            return this.parseRows<MemoryItem>(rows);
        } finally {
            database.close();
        }
    }

    override async searchEvents(workspacePath: string, query: string, limit = 20): Promise<MemoryEvent[]> {
        const database = await this.openDatabase();
        if (!database) {
            return super.searchEvents(workspacePath, query, limit);
        }
        try {
            await this.ensureJsonImported(database);
            const workspaceKey = this.workspaceKey(workspacePath);
            const matchQuery = this.ftsMatchQuery(query);
            const rows = matchQuery
                ? database.prepare([
                    'SELECT pi_events.payload_json, bm25(pi_event_fts, 2.5, 1.5, 1.5, 0.5) AS rank',
                    'FROM pi_event_fts JOIN pi_events ON pi_events.rowid = pi_event_fts.rowid',
                    'WHERE pi_event_fts MATCH ? AND pi_events.workspace_key = ?',
                    'ORDER BY rank, pi_events.created_at DESC',
                    'LIMIT ?'
                ].join(' ')).all(matchQuery, workspaceKey, limit)
                : database.prepare([
                    'SELECT payload_json FROM pi_events',
                    'WHERE workspace_key = ?',
                    'ORDER BY created_at DESC, id',
                    'LIMIT ?'
                ].join(' ')).all(workspaceKey, limit);
            return this.parseRows<MemoryEvent>(rows);
        } finally {
            database.close();
        }
    }

    override async searchSkillCandidates(workspacePath: string | undefined, query: string, limit = 20): Promise<MemorySkillCandidate[]> {
        const database = await this.openDatabase();
        if (!database) {
            return super.searchSkillCandidates(workspacePath, query, limit);
        }
        try {
            await this.ensureJsonImported(database);
            const workspaceKey = workspacePath ? this.workspaceKey(workspacePath) : undefined;
            const matchQuery = this.ftsMatchQuery(query);
            const rows = matchQuery
                ? database.prepare([
                    'SELECT pi_skill_candidates.payload_json, bm25(pi_skill_candidate_fts, 2.0, 3.0, 0.5) AS rank',
                    'FROM pi_skill_candidate_fts JOIN pi_skill_candidates ON pi_skill_candidates.rowid = pi_skill_candidate_fts.rowid',
                    'WHERE pi_skill_candidate_fts MATCH ?',
                    workspaceKey ? 'AND (pi_skill_candidates.workspace_key = ? OR pi_skill_candidates.workspace_key IS NULL)' : '',
                    'ORDER BY rank, pi_skill_candidates.updated_at DESC',
                    'LIMIT ?'
                ].join(' ')).all(...(workspaceKey ? [matchQuery, workspaceKey, limit] : [matchQuery, limit]))
                : database.prepare([
                    'SELECT payload_json FROM pi_skill_candidates',
                    workspaceKey ? 'WHERE workspace_key = ? OR workspace_key IS NULL' : '',
                    'ORDER BY updated_at DESC, id',
                    'LIMIT ?'
                ].join(' ')).all(...(workspaceKey ? [workspaceKey, limit] : [limit]));
            return this.parseRows<MemorySkillCandidate>(rows);
        } finally {
            database.close();
        }
    }

    override async rebuildCodeChunkIndex(): Promise<boolean> {
        if (await this.rebuildCodeChunkIndexWithLibrary()) {
            return true;
        }
        return !!await this.openAndCloseDatabase();
    }

    async rebuildFullTextIndexes(): Promise<boolean> {
        const database = await this.openDatabase();
        if (!database) {
            return false;
        }
        try {
            this.rebuildFullTextIndexesInDatabase(database);
            return true;
        } finally {
            database.close();
        }
    }

    override async getRetrievalCache(queryKey: string, workspacePath: string, sourcesHash: string): Promise<MemoryRetrievalCacheEntry | undefined> {
        const database = await this.openDatabase();
        if (!database) {
            return super.getRetrievalCache(queryKey, workspacePath, sourcesHash);
        }
        try {
            const rows = database.prepare([
                'SELECT id, workspace_path, query_key, scope_params_json, sources_hash, results_json, created_at, expires_at',
                'FROM pi_retrieval_cache',
                'WHERE workspace_key = ? AND query_key = ? AND sources_hash = ? AND expires_at > ?',
                'ORDER BY created_at DESC LIMIT 1'
            ].join(' ')).all(this.workspaceKey(workspacePath), queryKey, sourcesHash, new Date().toISOString()) as Array<Record<string, unknown>>;
            const row = rows[0];
            if (!row) {
                return undefined;
            }
            return {
                id: String(row.id),
                workspacePath: String(row.workspace_path),
                queryKey: String(row.query_key),
                scopeParams: this.parsePayload<MemoryRetrievalCacheEntry['scopeParams']>(row.scope_params_json) ?? {
                    workspacePath,
                    sourceKinds: [],
                    limit: 0
                },
                sourcesHash: String(row.sources_hash),
                results: this.parsePayload<RetrievalResult[]>(row.results_json) ?? [],
                createdAt: String(row.created_at),
                expiresAt: String(row.expires_at)
            };
        } catch {
            return undefined;
        } finally {
            database.close();
        }
    }

    override async setRetrievalCache(entry: MemoryRetrievalCacheEntry): Promise<void> {
        const database = await this.openDatabase();
        if (!database) {
            await super.setRetrievalCache(entry);
            return;
        }
        try {
            database.prepare([
                'INSERT INTO pi_retrieval_cache (id, workspace_key, workspace_path, query_key, scope_params_json, sources_hash, results_json, created_at, expires_at)',
                'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                'ON CONFLICT(workspace_path, query_key, sources_hash) DO UPDATE SET',
                'id = excluded.id, workspace_key = excluded.workspace_key, scope_params_json = excluded.scope_params_json,',
                'results_json = excluded.results_json, created_at = excluded.created_at, expires_at = excluded.expires_at'
            ].join(' ')).run(
                entry.id,
                this.workspaceKey(entry.workspacePath),
                entry.workspacePath,
                entry.queryKey,
                JSON.stringify(entry.scopeParams),
                entry.sourcesHash,
                JSON.stringify(entry.results),
                entry.createdAt,
                entry.expiresAt
            );
        } catch {
            // Cache persistence is opportunistic; retrieval still works when the cache table is unavailable.
        } finally {
            database.close();
        }
    }

    override async invalidateRetrievalCache(workspacePath: string, relativePaths: readonly string[] = []): Promise<number> {
        const database = await this.openDatabase();
        if (!database) {
            return super.invalidateRetrievalCache(workspacePath, relativePaths);
        }
        try {
            const workspaceKey = this.workspaceKey(workspacePath);
            const normalizedPaths = relativePaths.map(relativePath => relativePath.replace(/\\/g, '/').replace(/^\/+/, '').toLowerCase()).filter(Boolean);
            const rows = database.prepare('SELECT id, results_json FROM pi_retrieval_cache WHERE workspace_key = ?').all(workspaceKey) as Array<Record<string, unknown>>;
            const ids = normalizedPaths.length
                ? rows
                    .filter(row => this.cachedResultsReferencePaths(this.parsePayload<RetrievalResult[]>(row.results_json) ?? [], normalizedPaths))
                    .map(row => String(row.id))
                : rows.map(row => String(row.id));
            if (!ids.length) {
                return 0;
            }
            const deleteById = database.prepare('DELETE FROM pi_retrieval_cache WHERE id = ?');
            ids.forEach(id => deleteById.run(id));
            return ids.length;
        } catch {
            return 0;
        } finally {
            database.close();
        }
    }

    protected cachedResultsReferencePaths(results: readonly RetrievalResult[], normalizedPaths: readonly string[]): boolean {
        return results.some(result => {
            const haystack = [result.uri, result.evidence, result.title, result.snippet]
                .filter((value): value is string => typeof value === 'string')
                .map(value => value.replace(/\\/g, '/').toLowerCase())
                .join('\n');
            return normalizedPaths.some(relativePath => haystack.includes(relativePath));
        });
    }

    protected async openDatabase(): Promise<SqliteDatabase | undefined> {
        const sqlite = this.getSqliteModule();
        if (!sqlite) {
            return undefined;
        }
        try {
            const databasePath = await this.getStorePath();
            await fs.mkdir(path.dirname(databasePath), { recursive: true });
            const database = new sqlite.DatabaseSync(databasePath);
            try {
                this.configureDatabase(database);
                this.applyMigrations(database);
                return database;
            } catch {
                try {
                    database.close();
                } catch {
                    // Ignore close failures so callers can use the JSON fallback.
                }
                return undefined;
            }
        } catch {
            return undefined;
        }
    }

    protected async openAndCloseDatabase(): Promise<boolean> {
        const database = await this.openDatabase();
        if (!database) {
            return false;
        }
        database.close();
        return true;
    }

    protected configureDatabase(database: SqliteDatabase): void {
        database.exec('PRAGMA foreign_keys = ON');
        database.exec('PRAGMA journal_mode = WAL');
        database.exec('PRAGMA synchronous = NORMAL');
    }

    protected applyMigrations(database: SqliteDatabase): void {
        database.exec(`CREATE TABLE IF NOT EXISTS pi_migrations (
            id TEXT PRIMARY KEY,
            schema_version INTEGER NOT NULL,
            description TEXT NOT NULL,
            checksum TEXT NOT NULL,
            applied_at TEXT NOT NULL
        )`);
        const applied = new Set((database.prepare('SELECT id FROM pi_migrations').all() as Array<Record<string, unknown>>).map(row => String(row.id)));
        for (const migration of this.migrations) {
            if (applied.has(migration.id)) {
                continue;
            }
            database.exec('BEGIN IMMEDIATE');
            try {
                for (const statement of migration.statements) {
                    database.exec(statement);
                }
                database.prepare('INSERT INTO pi_migrations (id, schema_version, description, checksum, applied_at) VALUES (?, ?, ?, ?, ?)').run(
                    migration.id,
                    this.migrationVersion(migration.id),
                    migration.description,
                    this.migrationChecksum(migration),
                    new Date().toISOString()
                );
                database.exec('COMMIT');
            } catch (error) {
                this.rollback(database);
                throw error;
            }
        }
    }

    protected rebuildFullTextIndexesInDatabase(database: SqliteDatabase): void {
        database.exec("INSERT INTO pi_memory_fts(pi_memory_fts) VALUES ('rebuild')");
        database.exec("INSERT INTO pi_event_fts(pi_event_fts) VALUES ('rebuild')");
        database.exec("INSERT INTO pi_skill_candidate_fts(pi_skill_candidate_fts) VALUES ('rebuild')");
    }

    protected migrationVersion(id: string): number {
        return Number(id.match(/^\d+/)?.[0] ?? '1');
    }

    protected migrationChecksum(migration: MemorySqliteMigration): string {
        let hash = 2166136261;
        const value = `${migration.id}:${migration.description}:${migration.statements.join('\n')}`;
        for (let index = 0; index < value.length; index++) {
            hash ^= value.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
        }
        return (hash >>> 0).toString(16);
    }

    protected async ensureJsonImported(database: SqliteDatabase): Promise<void> {
        if (this.getMetadata(database, 'json_store_migrated_at')) {
            return;
        }
        const jsonPath = await this.getJsonStorePath();
        if (!await this.exists(jsonPath)) {
            this.setMetadata(database, 'json_store_migrated_at', new Date().toISOString());
            this.setMetadata(database, 'json_store_migration_result', 'no-json-store');
            return;
        }
        if (this.hasStoreData(database)) {
            this.setMetadata(database, 'json_store_migrated_at', new Date().toISOString());
            this.setMetadata(database, 'json_store_migration_result', 'skipped-existing-sqlite-data');
            return;
        }
        const store = await this.readJsonBackup();
        this.writeDatabase(database, store);
        this.setMetadata(database, 'json_store_migrated_at', new Date().toISOString());
        this.setMetadata(database, 'json_store_migration_result', 'imported');
        this.setMetadata(database, 'json_store_path', jsonPath);
    }

    protected readDatabase(database: SqliteDatabase): MemoryStoreData {
        const store = this.normalize({});
        store.settings = this.readRecordMap<MemoryWorkspaceSettings>(database, 'pi_workspace_settings');
        store.snapshots = this.readRecordMap<MemoryWorkspaceSnapshot>(database, 'pi_workspace_snapshots');
        store.files = this.readWorkspaceArrayMap<MemoryFile>(database, 'pi_files');
        store.symbols = this.readWorkspaceArrayMap<import('../common').MemorySymbol>(database, 'pi_symbols');
        store.relations = this.readWorkspaceArrayMap<MemoryRelation>(database, 'pi_relations');
        store.codeChunks = this.readWorkspaceArrayMap<MemoryCodeChunk>(database, 'pi_code_chunks');
        store.graphSnapshots = this.readArray<MemoryGraphSnapshot>(database, 'pi_graph_snapshots');
        store.changeImpacts = this.readArray<MemoryChangeImpact>(database, 'pi_change_impacts');
        store.contextSuggestions = this.readArray<MemoryStoredContextSuggestion>(database, 'pi_context_suggestions');
        store.legacyMemories = this.readWorkspaceArrayMap<Memory>(database, 'pi_legacy_memories');
        store.skills = this.readWorkspaceArrayMap<MemorySkill>(database, 'pi_skills');
        store.memories = this.readArray<MemoryItem>(database, 'pi_memory_items');
        store.memorySpaces = this.readArray<MemorySpace>(database, 'pi_memory_spaces');
        store.memoryVectors = this.readArray<MemoryVector>(database, 'pi_memory_vectors');
        store.knowledgeGraphs = this.readArray<MemoryKnowledgeGraph>(database, 'pi_knowledge_graphs');
        this.hydrateKnowledgeGraphRows(database, store.knowledgeGraphs);
        store.skillCandidates = this.readArray<MemorySkillCandidate>(database, 'pi_skill_candidates');
        store.events = this.readArray<MemoryEvent>(database, 'pi_events');
        store.feedbackRecords = this.readArray<MemoryFeedbackRecord>(database, 'pi_feedback_records');
        store.transcriptSessions = this.readArray<MemoryTranscriptSession>(database, 'pi_transcript_sessions');
        store.transcriptMessages = this.readArray<MemoryTranscriptMessage>(database, 'pi_transcript_messages');
        store.benchmarkReports = this.readArray<MemoryBenchmarkReport>(database, 'pi_benchmark_reports');
        return this.normalize(store);
    }

    protected writeDatabase(database: SqliteDatabase, store: MemoryStoreData): void {
        const normalized = this.normalize(store);
        const now = new Date().toISOString();
        database.exec('BEGIN IMMEDIATE');
        try {
            for (const table of this.dataTables) {
                database.exec(`DELETE FROM ${table}`);
            }
            this.insertSettings(database, normalized.settings, now);
            this.insertSnapshots(database, normalized.snapshots, now);
            this.insertFiles(database, normalized.files, now);
            this.insertSymbols(database, normalized.symbols, now);
            this.insertRelations(database, normalized.relations, now);
            this.insertCodeChunks(database, normalized.codeChunks, now);
            this.insertGraphSnapshots(database, normalized.graphSnapshots, now);
            this.insertChangeImpacts(database, normalized.changeImpacts, now);
            this.insertContextSuggestions(database, normalized.contextSuggestions, now);
            this.insertLegacyMemories(database, normalized.legacyMemories);
            this.insertSkills(database, normalized.skills);
            this.insertMemoryItems(database, normalized.memories);
            this.insertMemorySpaces(database, normalized.memorySpaces);
            this.insertMemoryVectors(database, normalized.memoryVectors);
            this.insertKnowledgeGraphs(database, normalized.knowledgeGraphs);
            this.insertKnowledgeRows(database, normalized.knowledgeGraphs);
            this.insertSkillCandidates(database, normalized.skillCandidates);
            this.insertEvents(database, normalized.events);
            this.insertFeedbackRecords(database, normalized.feedbackRecords);
            this.insertTranscriptSessions(database, normalized.transcriptSessions);
            this.insertTranscriptMessages(database, normalized.transcriptMessages);
            this.insertBenchmarkReports(database, normalized.benchmarkReports);
            this.setMetadataInTransaction(database, 'last_store_write_at', now);
            database.exec('COMMIT');
        } catch (error) {
            this.rollback(database);
            throw error;
        }
    }

    protected insertSettings(database: SqliteDatabase, settings: MemoryStoreData['settings'], now: string): void {
        const insert = database.prepare([
            'INSERT INTO pi_workspace_settings (workspace_key, workspace_path, payload_json, updated_at)',
            'VALUES (?, ?, ?, ?)'
        ].join(' '));
        for (const [workspaceKey, value] of Object.entries(settings)) {
            insert.run(workspaceKey, value.workspacePath, JSON.stringify(value), now);
        }
    }

    protected insertSnapshots(database: SqliteDatabase, snapshots: MemoryStoreData['snapshots'], now: string): void {
        const insert = database.prepare([
            'INSERT INTO pi_workspace_snapshots (workspace_key, workspace_path, payload_json, updated_at)',
            'VALUES (?, ?, ?, ?)'
        ].join(' '));
        for (const [workspaceKey, value] of Object.entries(snapshots)) {
            insert.run(workspaceKey, value.workspaceRoot, JSON.stringify(value), now);
        }
    }

    protected insertFiles(database: SqliteDatabase, files: MemoryStoreData['files'], now: string): void {
        const insert = database.prepare([
            'INSERT INTO pi_files (workspace_key, id, relative_path, language_id, content_hash, indexed_at, payload_json, updated_at)',
            'VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ].join(' '));
        for (const [workspaceKey, values] of Object.entries(files)) {
            for (const value of values) {
                insert.run(
                    workspaceKey,
                    value.id,
                    value.relativePath,
                    value.languageId ?? this.sqliteNull(),
                    value.contentHash,
                    value.indexedAt ?? this.sqliteNull(),
                    JSON.stringify(value),
                    now
                );
            }
        }
    }

    protected insertSymbols(database: SqliteDatabase, symbols: MemoryStoreData['symbols'], now: string): void {
        const insert = database.prepare([
            'INSERT INTO pi_symbols (workspace_key, id, file_id, language_id, symbol_kind, name, full_name, payload_json, updated_at)',
            'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ].join(' '));
        for (const [workspaceKey, values] of Object.entries(symbols)) {
            for (const value of values) {
                insert.run(
                    workspaceKey,
                    value.id,
                    value.fileId,
                    value.languageId,
                    value.symbolKind,
                    value.name,
                    value.fullName ?? this.sqliteNull(),
                    JSON.stringify(value),
                    now
                );
            }
        }
    }

    protected insertRelations(database: SqliteDatabase, relations: MemoryStoreData['relations'], now: string): void {
        const insert = database.prepare([
            'INSERT INTO pi_relations (workspace_key, id, source_kind, source_id, target_kind, target_id, relation_type, confidence_score, payload_json, updated_at)',
            'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ].join(' '));
        for (const [workspaceKey, values] of Object.entries(relations)) {
            for (const value of values) {
                insert.run(
                    workspaceKey,
                    value.id,
                    value.sourceKind,
                    value.sourceId,
                    value.targetKind,
                    value.targetId,
                    value.relationType,
                    value.confidenceScore,
                    JSON.stringify(value),
                    now
                );
            }
        }
    }

    protected insertCodeChunks(database: SqliteDatabase, chunks: MemoryStoreData['codeChunks'], now: string): void {
        const insert = database.prepare([
            'INSERT INTO pi_code_chunks (workspace_key, id, relative_path, language_id, chunk_kind, title, content, content_hash, symbol_name, indexed_at, payload_json, updated_at)',
            'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ].join(' '));
        for (const [workspaceKey, values] of Object.entries(chunks)) {
            for (const value of values) {
                insert.run(
                    workspaceKey,
                    value.id,
                    value.relativePath,
                    value.languageId ?? this.sqliteNull(),
                    value.chunkKind,
                    value.title,
                    value.content,
                    value.contentHash,
                    value.symbolName ?? this.sqliteNull(),
                    value.indexedAt,
                    JSON.stringify(value),
                    now
                );
            }
        }
    }

    protected insertGraphSnapshots(database: SqliteDatabase, snapshots: MemoryGraphSnapshot[], now: string): void {
        const insert = database.prepare([
            'INSERT INTO pi_graph_snapshots (id, workspace_key, workspace_path, created_at, content_hash, payload_json, updated_at)',
            'VALUES (?, ?, ?, ?, ?, ?, ?)'
        ].join(' '));
        for (const value of snapshots) {
            insert.run(
                value.id,
                this.workspaceKeyOrSqliteNull(value.workspacePath),
                value.workspacePath ?? this.sqliteNull(),
                value.createdAt ?? value.indexedAt ?? this.sqliteNull(),
                value.contentHash ?? this.sqliteNull(),
                JSON.stringify(value),
                now
            );
        }
    }

    protected insertChangeImpacts(database: SqliteDatabase, impacts: MemoryChangeImpact[], now: string): void {
        const insert = database.prepare([
            'INSERT INTO pi_change_impacts (id, workspace_key, workspace_path, relative_path, risk_score, created_at, payload_json, updated_at)',
            'VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ].join(' '));
        for (const value of impacts) {
            insert.run(
                value.id,
                this.workspaceKeyOrSqliteNull(value.workspacePath),
                value.workspacePath ?? this.sqliteNull(),
                value.relativePath ?? this.sqliteNull(),
                value.riskScore,
                value.createdAt,
                JSON.stringify(value),
                now
            );
        }
    }

    protected insertContextSuggestions(database: SqliteDatabase, suggestions: MemoryStoredContextSuggestion[], now: string): void {
        const insert = database.prepare([
            'INSERT INTO pi_context_suggestions (id, workspace_key, workspace_path, prompt_signature, source_kind, score, created_at, payload_json, updated_at)',
            'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ].join(' '));
        for (const value of suggestions) {
            insert.run(
                value.id,
                this.workspaceKey(value.workspacePath),
                value.workspacePath,
                value.promptSignature,
                value.sourceKind,
                value.score,
                value.createdAt,
                JSON.stringify(value),
                now
            );
        }
    }

    protected insertLegacyMemories(database: SqliteDatabase, memories: MemoryStoreData['legacyMemories']): void {
        const insert = database.prepare([
            'INSERT INTO pi_legacy_memories (workspace_key, id, kind, title, created_at, updated_at, payload_json, row_order)',
            'VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ].join(' '));
        for (const [workspaceKey, values] of Object.entries(memories)) {
            values.forEach((value, index) => insert.run(
                workspaceKey,
                value.id,
                value.kind,
                value.title,
                value.createdAt,
                value.updatedAt,
                JSON.stringify(value),
                index
            ));
        }
    }

    protected insertSkills(database: SqliteDatabase, skills: MemoryStoreData['skills']): void {
        const insert = database.prepare([
            'INSERT INTO pi_skills (workspace_key, id, kind, name, created_at, updated_at, payload_json, row_order)',
            'VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ].join(' '));
        for (const [workspaceKey, values] of Object.entries(skills)) {
            values.forEach((value, index) => insert.run(
                workspaceKey,
                value.id,
                value.kind,
                value.name,
                value.createdAt,
                value.updatedAt,
                JSON.stringify(value),
                index
            ));
        }
    }

    protected insertMemoryItems(database: SqliteDatabase, memories: MemoryItem[]): void {
        const insert = database.prepare([
            'INSERT INTO pi_memory_items (',
            'id, memory_space_id, workspace_key, workspace_path, scope, repository_url, repository_id, session_id, task_id, expires_at, retention_policy,',
            'memory_type, title, content, status, stale_status, importance, weight, last_accessed_at, access_count, source, superseded_by, supersedes_json, origin_markers_json,',
            'created_at, updated_at, accepted_count, rejected_count, payload_json',
            ') VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ].join(' '));
        for (const memory of memories) {
            const value = this.assignDefaultMemorySpace(this.memoryService.normalize(memory));
            insert.run(
                value.id,
                value.memorySpaceId ?? this.sqliteNull(),
                this.workspaceKeyOrSqliteNull(value.workspacePath),
                value.workspacePath ?? this.sqliteNull(),
                value.scope,
                value.repositoryUrl ?? this.sqliteNull(),
                value.repositoryId ?? this.sqliteNull(),
                value.sessionId ?? this.sqliteNull(),
                value.taskId ?? this.sqliteNull(),
                value.expiresAt ?? this.sqliteNull(),
                value.retentionPolicy ?? this.sqliteNull(),
                value.memoryType,
                value.title,
                value.content,
                value.status,
                value.staleStatus,
                value.importance,
                value.weight,
                value.lastAccessedAt,
                value.accessCount,
                value.source ?? this.sqliteNull(),
                value.supersededBy ?? this.sqliteNull(),
                value.supersedes ? JSON.stringify(value.supersedes) : this.sqliteNull(),
                value.originMarkers ? JSON.stringify(value.originMarkers) : this.sqliteNull(),
                value.createdAt,
                value.updatedAt,
                value.acceptedCount,
                value.rejectedCount,
                JSON.stringify(value)
            );
        }
    }

    protected insertMemorySpaces(database: SqliteDatabase, spaces: MemorySpace[]): void {
        const insert = database.prepare([
            'INSERT INTO pi_memory_spaces (',
            'id, workspace_key, workspace_path, scope, repository_url, repository_id, session_id, task_id, retention_policy, metadata_json, created_at, updated_at, payload_json',
            ') VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ].join(' '));
        for (const space of spaces) {
            const value = this.normalizeMemorySpace(space);
            insert.run(
                value.id,
                this.workspaceKeyOrSqliteNull(value.workspacePath),
                value.workspacePath ?? this.sqliteNull(),
                value.scope,
                value.repositoryUrl ?? this.sqliteNull(),
                value.repositoryId ?? this.sqliteNull(),
                value.sessionId ?? this.sqliteNull(),
                value.taskId ?? this.sqliteNull(),
                value.retentionPolicy ?? this.sqliteNull(),
                value.metadata ? JSON.stringify(value.metadata) : this.sqliteNull(),
                value.createdAt,
                value.updatedAt,
                JSON.stringify(value)
            );
        }
    }

    protected insertMemoryVectors(database: SqliteDatabase, vectors: MemoryVector[]): void {
        const insert = database.prepare([
            'INSERT INTO pi_memory_vectors (',
            'id, memory_id, workspace_key, workspace_path, scope, model_id, dimensions, content_hash, vector_json, created_at, updated_at, payload_json',
            ') VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ].join(' '));
        for (const value of vectors) {
            insert.run(
                value.id,
                value.memoryId,
                this.workspaceKeyOrSqliteNull(value.workspacePath),
                value.workspacePath ?? this.sqliteNull(),
                value.scope,
                value.modelId,
                value.dimensions,
                value.contentHash,
                JSON.stringify(value.vector),
                value.createdAt,
                value.updatedAt,
                JSON.stringify(value)
            );
        }
    }

    protected insertKnowledgeGraphs(database: SqliteDatabase, graphs: MemoryKnowledgeGraph[]): void {
        const insert = database.prepare([
            'INSERT INTO pi_knowledge_graphs (',
            'id, workspace_key, workspace_path, scope, title, status, concept_count, link_count, created_at, updated_at, payload_json',
            ') VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ].join(' '));
        for (const value of graphs) {
            insert.run(
                value.id,
                this.workspaceKeyOrSqliteNull(value.workspacePath),
                value.workspacePath ?? this.sqliteNull(),
                value.scope,
                value.title,
                value.status,
                value.concepts.length,
                value.links.length,
                value.createdAt,
                value.updatedAt,
                JSON.stringify(value)
            );
        }
    }

    protected insertKnowledgeRows(database: SqliteDatabase, graphs: MemoryKnowledgeGraph[]): void {
        const insertConcept = database.prepare([
            'INSERT INTO pi_knowledge_concepts (',
            'id, graph_id, workspace_key, workspace_path, scope, concept_type, title, description, source, evidence, confidence, created_at, updated_at, payload_json',
            ') VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ].join(' '));
        const insertLink = database.prepare([
            'INSERT INTO pi_knowledge_links (',
            'id, graph_id, workspace_key, workspace_path, scope, source_kind, source_id, target_kind, target_id, relation_type, confidence, source, evidence, created_at, updated_at, payload_json',
            ') VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ].join(' '));
        for (const graph of graphs) {
            for (const concept of graph.concepts ?? []) {
                insertConcept.run(
                    concept.id,
                    concept.graphId ?? graph.id,
                    this.workspaceKeyOrSqliteNull(graph.workspacePath),
                    graph.workspacePath ?? this.sqliteNull(),
                    graph.scope,
                    concept.kind,
                    concept.title,
                    concept.summary,
                    concept.sourceKind ?? this.sqliteNull(),
                    concept.evidence ?? this.sqliteNull(),
                    (concept as MemoryKnowledgeConcept & { confidenceScore?: number }).confidenceScore ?? concept.weight ?? 1,
                    concept.createdAt,
                    concept.updatedAt,
                    JSON.stringify({ ...concept, graphId: concept.graphId ?? graph.id })
                );
            }
            for (const link of graph.links ?? []) {
                const metadata = link.metadata ?? {};
                insertLink.run(
                    link.id,
                    link.graphId ?? graph.id,
                    this.workspaceKeyOrSqliteNull(graph.workspacePath),
                    graph.workspacePath ?? this.sqliteNull(),
                    graph.scope,
                    metadata.sourceKind ?? 'knowledge-concept',
                    link.sourceConceptId,
                    metadata.targetKind ?? 'knowledge-concept',
                    link.targetConceptId,
                    link.linkKind,
                    link.confidenceScore,
                    metadata.source ?? this.sqliteNull(),
                    link.evidence ?? this.sqliteNull(),
                    link.createdAt,
                    link.updatedAt,
                    JSON.stringify({ ...link, graphId: link.graphId ?? graph.id })
                );
            }
        }
    }

    protected hydrateKnowledgeGraphRows(database: SqliteDatabase, graphs: MemoryKnowledgeGraph[]): void {
        const conceptsByGraph = new Map<string, MemoryKnowledgeConcept[]>();
        const linksByGraph = new Map<string, MemoryKnowledgeLink[]>();
        const conceptRows = database.prepare('SELECT graph_id, payload_json FROM pi_knowledge_concepts ORDER BY id').all() as Array<Record<string, unknown>>;
        const linkRows = database.prepare('SELECT graph_id, payload_json FROM pi_knowledge_links ORDER BY id').all() as Array<Record<string, unknown>>;
        for (const row of conceptRows) {
            const graphId = String(row.graph_id ?? '');
            const concept = this.parsePayload<MemoryKnowledgeConcept>(row.payload_json);
            if (graphId && concept) {
                conceptsByGraph.set(graphId, [...(conceptsByGraph.get(graphId) ?? []), { ...concept, graphId: concept.graphId ?? graphId }]);
            }
        }
        for (const row of linkRows) {
            const graphId = String(row.graph_id ?? '');
            const link = this.parsePayload<MemoryKnowledgeLink>(row.payload_json);
            if (graphId && link) {
                linksByGraph.set(graphId, [...(linksByGraph.get(graphId) ?? []), { ...link, graphId: link.graphId ?? graphId }]);
            }
        }
        for (const graph of graphs) {
            const concepts = conceptsByGraph.get(graph.id);
            const links = linksByGraph.get(graph.id);
            if (concepts?.length) {
                graph.concepts = concepts;
            }
            if (links?.length) {
                graph.links = links.map(link => {
                    const existing = (graph.links ?? []).find(candidate => candidate.id === link.id);
                    return {
                        ...link,
                        metadata: {
                            ...(link.metadata ?? {}),
                            ...(existing?.metadata ?? {})
                        }
                    };
                });
            }
        }
    }

    protected insertSkillCandidates(database: SqliteDatabase, candidates: MemorySkillCandidate[]): void {
        const insert = database.prepare([
            'INSERT INTO pi_skill_candidates (',
            'id, workspace_key, workspace_path, signature, title, status, trigger_count, rejection_count, last_triggered_at, created_at, updated_at, payload_json',
            ') VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ].join(' '));
        for (const value of candidates) {
            insert.run(
                value.id,
                this.workspaceKeyOrSqliteNull(value.workspacePath),
                value.workspacePath ?? this.sqliteNull(),
                value.signature,
                value.title,
                value.status,
                value.triggerCount,
                value.rejectionCount ?? this.sqliteNull(),
                value.lastTriggeredAt ?? this.sqliteNull(),
                value.createdAt,
                value.updatedAt,
                JSON.stringify(value)
            );
        }
    }

    protected insertEvents(database: SqliteDatabase, events: MemoryEvent[]): void {
        const insert = database.prepare([
            'INSERT INTO pi_events (id, workspace_key, workspace_path, event_type, relative_path, prompt_signature, created_at, payload_json)',
            'VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ].join(' '));
        for (const value of events) {
            insert.run(
                value.id,
                this.workspaceKey(value.workspacePath),
                value.workspacePath,
                value.eventType,
                value.relativePath ?? this.sqliteNull(),
                value.promptSignature ?? this.sqliteNull(),
                value.createdAt,
                JSON.stringify(value)
            );
        }
    }

    protected insertFeedbackRecords(database: SqliteDatabase, records: MemoryFeedbackRecord[]): void {
        const insert = database.prepare([
            'INSERT INTO pi_feedback_records (',
            'id, workspace_key, workspace_path, prompt_signature, target_kind, target_id, target_source_kind, target_uri, target_title, feedback, reason, evidence, metadata_json, created_at, resolved_at, payload_json',
            ') VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ].join(' '));
        for (const value of records) {
            insert.run(
                value.id,
                this.workspaceKey(value.workspacePath),
                value.workspacePath,
                value.promptSignature ?? this.sqliteNull(),
                value.targetKind,
                value.targetId,
                value.targetSourceKind ?? this.sqliteNull(),
                value.targetUri ?? this.sqliteNull(),
                value.targetTitle ?? this.sqliteNull(),
                value.feedback,
                value.reason ?? this.sqliteNull(),
                value.evidence ?? this.sqliteNull(),
                value.metadata ? JSON.stringify(value.metadata) : this.sqliteNull(),
                value.createdAt,
                value.resolvedAt ?? this.sqliteNull(),
                JSON.stringify(value)
            );
        }
    }

    protected insertTranscriptSessions(database: SqliteDatabase, sessions: MemoryTranscriptSession[]): void {
        const insert = database.prepare([
            'INSERT INTO pi_transcript_sessions (',
            'id, workspace_key, workspace_path, scope, origin, source, title, started_at, ended_at, retention_policy, redaction_status, metadata_json, created_at, updated_at, payload_json',
            ') VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ].join(' '));
        for (const value of sessions) {
            insert.run(
                value.id,
                this.workspaceKeyOrSqliteNull(value.workspacePath),
                value.workspacePath ?? this.sqliteNull(),
                value.scope,
                value.origin,
                value.source ?? this.sqliteNull(),
                value.title ?? this.sqliteNull(),
                value.startedAt,
                value.endedAt ?? this.sqliteNull(),
                value.retentionPolicy ?? this.sqliteNull(),
                value.redactionStatus,
                value.metadata ? JSON.stringify(value.metadata) : this.sqliteNull(),
                value.createdAt,
                value.updatedAt,
                JSON.stringify(value)
            );
        }
    }

    protected insertTranscriptMessages(database: SqliteDatabase, messages: MemoryTranscriptMessage[]): void {
        const insert = database.prepare([
            'INSERT INTO pi_transcript_messages (',
            'id, session_id, workspace_key, workspace_path, scope, origin, role, content, redacted_content, redaction_status, redaction_summary_json, retention_policy, session_id_hint, task_id, created_at, updated_at, payload_json',
            ') VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ].join(' '));
        for (const value of messages) {
            insert.run(
                value.id,
                value.sessionId,
                this.workspaceKeyOrSqliteNull(value.workspacePath),
                value.workspacePath ?? this.sqliteNull(),
                value.scope,
                value.origin,
                value.role,
                value.content,
                value.redactedContent ?? this.sqliteNull(),
                value.redactionStatus,
                value.redactionSummary ? JSON.stringify(value.redactionSummary) : this.sqliteNull(),
                value.retentionPolicy ?? this.sqliteNull(),
                value.sessionIdHint ?? this.sqliteNull(),
                value.taskId ?? this.sqliteNull(),
                value.createdAt,
                value.updatedAt,
                JSON.stringify(value)
            );
        }
    }

    protected insertBenchmarkReports(database: SqliteDatabase, reports: MemoryBenchmarkReport[]): void {
        const insert = database.prepare([
            'INSERT INTO pi_benchmark_reports (id, workspace_key, workspace_path, suite_id, score, created_at, updated_at, payload_json)',
            'VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ].join(' '));
        for (const value of reports) {
            const reportId = `${this.workspaceKey(value.workspacePath)}:${value.generatedAt}`;
            insert.run(
                reportId,
                this.workspaceKeyOrSqliteNull(value.workspacePath),
                value.workspacePath ?? this.sqliteNull(),
                'default',
                value.recall,
                value.generatedAt,
                value.generatedAt,
                JSON.stringify(value)
            );
        }
    }

    protected readRecordMap<T>(database: SqliteDatabase, table: string): Record<string, T> {
        const rows = database.prepare(`SELECT workspace_key, payload_json FROM ${table} ORDER BY workspace_key`).all() as Array<Record<string, unknown>>;
        const result: Record<string, T> = {};
        for (const row of rows) {
            const payload = this.parsePayload<T>(row.payload_json);
            if (payload) {
                result[String(row.workspace_key)] = payload;
            }
        }
        return result;
    }

    protected readWorkspaceArrayMap<T>(database: SqliteDatabase, table: string): Record<string, T[]> {
        const rows = database.prepare(`SELECT workspace_key, payload_json FROM ${table} ORDER BY workspace_key, rowid`).all() as Array<Record<string, unknown>>;
        const result: Record<string, T[]> = {};
        for (const row of rows) {
            const payload = this.parsePayload<T>(row.payload_json);
            if (!payload) {
                continue;
            }
            const workspaceKey = String(row.workspace_key);
            result[workspaceKey] = [...(result[workspaceKey] ?? []), payload];
        }
        return result;
    }

    protected readArray<T>(database: SqliteDatabase, table: string): T[] {
        const rows = database.prepare(`SELECT payload_json FROM ${table} ORDER BY rowid`).all() as Array<Record<string, unknown>>;
        return this.parseRows<T>(rows);
    }

    protected parseRows<T>(rows: unknown[]): T[] {
        return (rows as Array<Record<string, unknown>>)
            .map(row => this.parsePayload<T>(row.payload_json))
            .filter((value): value is T => !!value);
    }

    protected parsePayload<T>(payloadJson: unknown): T | undefined {
        try {
            return JSON.parse(String(payloadJson)) as T;
        } catch {
            return undefined;
        }
    }

    protected getMetadata(database: SqliteDatabase, key: string): string | undefined {
        const rows = database.prepare('SELECT value FROM pi_metadata WHERE key = ?').all(key) as Array<Record<string, unknown>>;
        return rows[0] ? String(rows[0].value) : undefined;
    }

    protected setMetadata(database: SqliteDatabase, key: string, value: string): void {
        database.exec('BEGIN IMMEDIATE');
        try {
            this.setMetadataInTransaction(database, key, value);
            database.exec('COMMIT');
        } catch (error) {
            this.rollback(database);
            throw error;
        }
    }

    protected setMetadataInTransaction(database: SqliteDatabase, key: string, value: string): void {
        database.prepare([
            'INSERT INTO pi_metadata (key, value, updated_at) VALUES (?, ?, ?)',
            'ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at'
        ].join(' ')).run(key, value, new Date().toISOString());
    }

    protected hasStoreData(database: SqliteDatabase): boolean {
        for (const table of this.dataTables) {
            const rows = database.prepare(`SELECT COUNT(*) AS count FROM ${table}`).all() as Array<Record<string, unknown>>;
            if (Number(rows[0]?.count ?? 0) > 0) {
                return true;
            }
        }
        return false;
    }

    protected rollback(database: SqliteDatabase): void {
        try {
            database.exec('ROLLBACK');
        } catch {
            // Ignore rollback failures so the original SQLite error is preserved.
        }
    }

    protected workspaceKeyOrSqliteNull(workspacePath: string | undefined): unknown {
        return workspacePath ? this.workspaceKey(workspacePath) : this.sqliteNull();
    }

    protected sqliteNull(): unknown {
        return JSON.parse('null');
    }

    protected async readJsonBackup(): Promise<MemoryStoreData> {
        try {
            return this.normalize(JSON.parse(await fs.readFile(await this.getJsonStorePath(), 'utf8')) as Partial<MemoryStoreData>);
        } catch {
            return this.normalize({});
        }
    }

    protected async writeJsonBackup(store: MemoryStoreData): Promise<void> {
        const storePath = await this.getJsonStorePath();
        await fs.mkdir(path.dirname(storePath), { recursive: true });
        await fs.writeFile(storePath, `${JSON.stringify(this.normalize(store), undefined, 2)}\n`, 'utf8');
    }

    protected async getJsonStorePath(): Promise<string> {
        return path.join(path.dirname(await this.getStorePath()), 'store.json');
    }

    protected async exists(filePath: string): Promise<boolean> {
        try {
            await fs.stat(filePath);
            return true;
        } catch {
            return false;
        }
    }
}

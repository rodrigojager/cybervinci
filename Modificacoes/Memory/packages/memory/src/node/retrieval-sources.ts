// *****************************************************************************
// Copyright (C) 2026.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import * as path from 'path';
import { LibraryService } from '@cybervinci/library/lib/common/library-service';
import {
    FeedbackService,
    IRetrievalSource,
    MemoryServiceHelper,
    MemoryCodeChunk,
    MemoryFeedbackKind,
    MemoryFeedbackRecord,
    MemoryEvent,
    MemoryEventType,
    MemoryItem,
    MemoryVector,
    MemoryVectorService,
    MemorySkillCandidate,
    MemorySourceKind,
    RetrievalQuery,
    RetrievalResult
} from '../common';
import { MemoryStoreRepository } from './memory-repositories';

export type MemorySearchHit = MemoryItem & {
    score?: number;
    snippet?: string;
    evidence?: string;
};

export interface MemorySearchRepository {
    searchMemoryItems(workspacePath: string, ftsQuery: string, limit?: number): Promise<MemorySearchHit[]>;
}

export interface MemoryVectorSearchRepository {
    searchMemoryVectors(request: {
        workspacePath: string;
        queryVector: readonly number[];
        modelId: string;
        dimensions: number;
        limit?: number;
        repositoryUrl?: string;
        repositoryId?: string;
        sessionId?: string;
        taskId?: string;
    }): Promise<Array<{
        vector: MemoryVector;
        memory: MemoryItem;
        score: number;
    }>>;
}

export interface MemoryEventSearchRepository {
    searchEvents(workspacePath: string, query: string, limit?: number): Promise<MemoryEvent[]>;
}

abstract class JsonStoreRetrievalSource implements IRetrievalSource {

    abstract readonly sourceKind: MemorySourceKind;
    abstract search(query: RetrievalQuery): Promise<RetrievalResult[]>;
    protected readonly feedbackService = new FeedbackService();

    constructor(protected readonly repository: MemoryStoreRepository) { }

    protected score(haystack: string, needle: string): number {
        const normalizedHaystack = haystack.toLowerCase();
        const normalizedNeedle = needle.trim().toLowerCase();
        if (!normalizedNeedle) {
            return 0.25;
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
        return text.toLowerCase().match(/[a-z0-9_.$#-]{2,}/g)?.slice(0, 8) ?? [];
    }

    protected ftsQuery(text: string): string {
        const operators = new Set(['and', 'or', 'not', 'near']);
        return this.searchTerms(text)
            .filter(term => /[a-z0-9]/.test(term) && !operators.has(term))
            .map(term => `"${term.replace(/"/g, '""')}"`)
            .join(' OR ');
    }

    protected async applyFeedback(query: RetrievalQuery, results: RetrievalResult[]): Promise<RetrievalResult[]> {
        const store = await this.repository.read();
        const key = this.repository.workspaceKey(query.workspacePath);
        const feedback = store.feedbackRecords.filter(record => this.repository.workspaceKey(record.workspacePath) === key);
        return results
            .map(result => {
                const multiplier = this.feedbackService.rankingMultiplier(feedback, result);
                return {
                    ...result,
                    score: Number((result.score * multiplier).toFixed(6)),
                    rankingSignals: result.rankingSignals ? {
                        ...result.rankingSignals,
                        acceptanceScore: Math.max(result.rankingSignals.acceptanceScore ?? 0, multiplier > 1 ? 1 : multiplier),
                        stalePenalty: Math.max(result.rankingSignals.stalePenalty ?? 0, multiplier < 1 ? 1 - multiplier : 0),
                        feedbackMultiplier: multiplier
                    } : undefined
                };
            })
            .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title));
    }

    protected workspaceScore(query: RetrievalQuery, workspacePath: string | undefined): number {
        if (!workspacePath) {
            return 0;
        }
        return this.repository.workspaceKey(workspacePath) === this.repository.workspaceKey(query.workspacePath) ? 1 : 0;
    }

    protected sessionTaskScore(query: RetrievalQuery, item: { sessionId?: string; taskId?: string }): number {
        if (query.taskId && item.taskId === query.taskId) {
            return 1;
        }
        if (query.sessionId && item.sessionId === query.sessionId) {
            return 0.9;
        }
        if (item.taskId || item.sessionId) {
            return 0.35;
        }
        return 0;
    }

}

export class CodeTextRetrievalSource extends JsonStoreRetrievalSource {

    readonly sourceKind = 'code' as const;

    async search(query: RetrievalQuery): Promise<RetrievalResult[]> {
        const enabled = new Set(query.sourceKinds ?? []);
        const chunks = await this.searchChunks(query);
        return this.applyFeedback(query, chunks
            .filter(chunk => {
                const sourceKind = this.chunkSourceKind(chunk);
                if (!enabled.size) {
                    return true;
                }
                return enabled.has(sourceKind);
            })
            .map(chunk => {
                const sourceKind = this.chunkSourceKind(chunk);
                return {
                id: chunk.id,
                sourceKind,
                title: chunk.title,
                snippet: chunk.content,
                score: this.score(`${chunk.relativePath} ${chunk.title} ${chunk.symbolName ?? ''} ${chunk.content}`, query.text),
                uri: sourceKind === 'external-docs' ? chunk.origin : `${path.join(query.workspacePath, chunk.relativePath)}:${chunk.startLine}`,
                evidence: sourceKind === 'external-docs'
                    ? `external-docs:${chunk.externalCollectionId}:${chunk.origin ?? chunk.relativePath}`
                    : sourceKind === 'local-docs'
                        ? `local-docs:${chunk.id}`
                        : `LibraryService.searchWorkspaceSections:${chunk.chunkKind}`,
                estimatedTokens: chunk.estimatedTokens,
                rankingSignals: {
                    bm25Score: this.score(`${chunk.relativePath} ${chunk.title} ${chunk.symbolName ?? ''} ${chunk.content}`, query.text),
                    workspaceScore: 1,
                    scopeBoost: sourceKind === 'external-docs' ? 0.75 : sourceKind === 'local-docs' ? 0.6 : 1
                }
                };
            }));
    }

    protected async searchChunks(query: RetrievalQuery): Promise<MemoryCodeChunk[]> {
        const limit = query.limit ?? 20;
        const indexed = await this.repository.searchCodeChunks(query.workspacePath, query.text, limit);
        if (indexed.length || !query.text.trim()) {
            return indexed;
        }
        const store = await this.repository.read();
        const key = this.repository.workspaceKey(query.workspacePath);
        return (store.codeChunks[key] ?? [])
            .map(chunk => ({ chunk, score: this.score(`${chunk.relativePath} ${chunk.title} ${chunk.symbolName ?? ''} ${chunk.content}`, query.text) }))
            .filter(item => item.score > 0)
            .sort((left, right) => right.score - left.score || left.chunk.relativePath.localeCompare(right.chunk.relativePath))
            .slice(0, limit)
            .map(item => item.chunk);
    }

    protected chunkSourceKind(chunk: MemoryCodeChunk): MemorySourceKind {
        if (chunk.sourceKind) {
            return chunk.sourceKind;
        }
        if (
            chunk.chunkKind === 'markdown-section'
            || chunk.chunkKind === 'pdf-page'
            || chunk.chunkKind === 'office-document'
            || chunk.chunkKind === 'image-metadata'
            || chunk.chunkKind === 'diagram-document'
            || chunk.chunkKind === 'media-transcript'
            || chunk.chunkKind === 'media-metadata'
            || /^docs?\//i.test(chunk.relativePath)
            || /^readme(?:\.[^.]+)?$/i.test(path.basename(chunk.relativePath))
        ) {
            return 'local-docs';
        }
        return this.sourceKind;
    }
}

export class ProjectMemoryRetrievalSource extends JsonStoreRetrievalSource {

    readonly sourceKind: MemorySourceKind = 'project-memory';
    protected readonly vectorService = new MemoryVectorService();
    protected readonly memoryService = new MemoryServiceHelper();

    async search(query: RetrievalQuery): Promise<RetrievalResult[]> {
        const limit = query.limit ?? 20;
        const ftsQuery = this.ftsQuery(query.text);
        const searchRepository = this.memorySearchRepository();
        let textResults: RetrievalResult[] | undefined;
        if (searchRepository && ftsQuery) {
            try {
                const key = this.repository.workspaceKey(query.workspacePath);
                textResults = (await searchRepository.searchMemoryItems(query.workspacePath, ftsQuery, limit))
                    .filter(memory => this.memoryInScope(memory, query, key))
                    .filter(memory => this.memoryService.isRetrievable(memory))
                    .map(memory => this.memorySearchResult(memory, query))
                    .slice(0, limit);
            } catch {
                // Fall through to the JSON-compatible search path.
            }
        }
        if (!textResults) {
            const store = await this.repository.read();
            const key = this.repository.workspaceKey(query.workspacePath);
            const needle = query.text.toLowerCase();
            textResults = store.memories
                .filter(memory => this.memoryInScope(memory, query, key))
                .filter(memory => this.memoryService.isRetrievable(memory))
                .map(memory => this.memoryResult(memory, needle, query))
                .filter((result): result is RetrievalResult => result !== undefined)
                .sort((left, right) => right.score - left.score)
                .slice(0, limit);
        }
        return this.applyFeedback(query, (await this.combineVectorResults(query, textResults, limit)).slice(0, limit));
    }

    protected async combineVectorResults(query: RetrievalQuery, textResults: RetrievalResult[], limit: number): Promise<RetrievalResult[]> {
        if (!query.text.trim()) {
            return textResults;
        }
        const store = await this.repository.read();
        const key = this.repository.workspaceKey(query.workspacePath);
        const settings = store.settings[key]?.vectorSearch;
        if (!settings?.enabled || !settings.userConsentAt) {
            return textResults;
        }
        const dimensions = this.vectorService.normalizeDimensions(settings.dimensions);
        const modelId = settings.localModelId || this.vectorService.modelId;
        const queryVector = this.vectorService.embedText({ text: query.text, dimensions }).vector;
        const vectorSearchRepository = this.memoryVectorSearchRepository();
        if (vectorSearchRepository) {
            try {
                const vectorResults = (await vectorSearchRepository.searchMemoryVectors({
                    workspacePath: query.workspacePath,
                    queryVector,
                    modelId,
                    dimensions,
                    limit,
                    repositoryUrl: query.repositoryUrl,
                    repositoryId: query.repositoryId,
                    taskId: query.taskId
                }))
                    .map(hit => this.vectorSearchResult(hit.vector, hit.memory, queryVector, query, hit.score))
                    .filter((result): result is RetrievalResult => result !== undefined)
                    .sort((left, right) => right.score - left.score)
                    .slice(0, limit);
                return vectorResults.length ? this.mergeTextAndVectorResults(textResults, vectorResults) : textResults;
            } catch {
                return textResults;
            }
        }
        const memories = new Map(store.memories
            .filter(memory => this.memoryInScope(memory, query, key))
            .filter(memory => this.memoryService.isRetrievable(memory))
            .map(memory => [memory.id, memory] as const));
        const vectorResults = store.memoryVectors
            .filter(vector => vector.modelId === modelId && vector.dimensions === dimensions)
            .filter(vector => this.memoryVectorInScope(vector, query, key))
            .map(vector => this.vectorSearchResult(vector, memories.get(vector.memoryId), queryVector, query))
            .filter((result): result is RetrievalResult => result !== undefined)
            .sort((left, right) => right.score - left.score)
            .slice(0, limit);
        if (!vectorResults.length) {
            return textResults;
        }
        return this.mergeTextAndVectorResults(textResults, vectorResults);
    }

    protected memoryResult(memory: MemoryItem, needle: string, query: RetrievalQuery): RetrievalResult | undefined {
        const rankedMemory = this.rankableMemory(memory);
        const haystack = `${rankedMemory.title} ${rankedMemory.content} ${rankedMemory.memoryType}`.toLowerCase();
        const score = this.score(haystack, needle);
        if (needle && score <= 0) {
            return undefined;
        }
        return {
            id: rankedMemory.id,
            sourceKind: this.sourceKind,
            title: rankedMemory.title,
            snippet: rankedMemory.content,
            score: (score + 0.15) * this.memoryLifecycleMultiplier(rankedMemory),
            evidence: rankedMemory.evidence ? `${rankedMemory.evidence}; pi_memory_items:${rankedMemory.staleStatus}` : `pi_memory_items:${rankedMemory.staleStatus}`,
            rankingSignals: this.memoryRankingSignals(rankedMemory, query, {
                bm25Score: score
            })
        };
    }

    protected memorySearchResult(memory: MemorySearchHit, query: RetrievalQuery): RetrievalResult {
        const rankedMemory = this.rankableMemory(memory);
        const haystack = `${rankedMemory.title} ${rankedMemory.content} ${rankedMemory.memoryType}`.toLowerCase();
        return {
            id: rankedMemory.id,
            sourceKind: this.sourceKind,
            title: rankedMemory.title,
            snippet: memory.snippet ?? rankedMemory.content,
            score: (memory.score ?? this.score(haystack, '')) * this.memoryLifecycleMultiplier(rankedMemory),
            evidence: memory.evidence ?? `pi_memory_items_fts:${rankedMemory.staleStatus}`,
            rankingSignals: this.memoryRankingSignals(rankedMemory, query, {
                bm25Score: memory.score ?? this.score(haystack, '')
            })
        };
    }

    protected rankableMemory(memory: MemoryItem): MemoryItem {
        const normalized = this.memoryService.normalize(memory);
        return normalized.staleStatus === 'unknown'
            ? this.memoryService.markStaleness([normalized])[0]
            : normalized;
    }

    protected memoryRankingSignals(memory: MemoryItem, query: RetrievalQuery, signals: { bm25Score?: number; vectorScore?: number }): RetrievalResult['rankingSignals'] {
        return {
            ...signals,
            memoryWeight: memory.weight,
            recencyScore: this.memoryRecencyScore(memory),
            workspaceScore: this.workspaceScore(query, memory.workspacePath),
            sessionTaskScore: this.sessionTaskScore(query, memory),
            scopeBoost: this.memoryScopeBoost(memory),
            stalePenalty: this.memoryStalePenalty(memory),
            importance: memory.importance,
            weight: memory.weight,
            staleStatus: memory.staleStatus,
            scope: memory.scope
        };
    }

    protected memoryRecencyScore(memory: MemoryItem): number {
        const reference = memory.lastAccessedAt ?? memory.updatedAt ?? memory.createdAt;
        const ageMs = Date.now() - new Date(reference).getTime();
        if (!Number.isFinite(ageMs) || ageMs <= 0) {
            return 1;
        }
        const ageDays = ageMs / 86_400_000;
        return Math.max(0, Math.min(1, 1 - ageDays / 90));
    }

    protected memoryScopeBoost(memory: MemoryItem): number {
        switch (memory.scope) {
            case 'task':
                return 1;
            case 'session':
                return 0.9;
            case 'workspace':
            case 'repository':
                return 0.75;
            case 'global':
                return 0.5;
            default:
                return 0;
        }
    }

    protected memoryStalePenalty(memory: MemoryItem): number {
        switch (memory.staleStatus) {
            case 'stale':
                return 0.3;
            case 'possibly_stale':
                return 0.15;
            case 'unknown':
                return 0.05;
            default:
                return 0;
        }
    }

    protected memoryLifecycleMultiplier(memory: MemoryItem): number {
        if (memory.status === 'rejected' || memory.status === 'blocked') {
            return 0.1;
        }
        if (memory.staleStatus === 'stale') {
            return 0.7;
        }
        if (memory.staleStatus === 'possibly_stale') {
            return 0.85;
        }
        return 1;
    }

    protected memoryInScope(memory: MemoryItem, query: RetrievalQuery, workspaceKey: string): boolean {
        switch (memory.scope) {
            case 'global':
                return true;
            case 'repository':
                return false;
            case 'workspace':
            case 'session':
                return !!memory.workspacePath
                    && this.repository.workspaceKey(memory.workspacePath) === workspaceKey
                    && (memory.scope !== 'session' || !query.sessionId || memory.sessionId === query.sessionId);
            case 'task':
                return false;
            default:
                return false;
        }
    }

    protected memoryVectorInScope(vector: MemoryVector, query: RetrievalQuery, workspaceKey: string): boolean {
        switch (vector.scope) {
            case 'global':
                return true;
            case 'repository':
                return false;
            case 'workspace':
            case 'session':
                return !!vector.workspacePath
                    && this.repository.workspaceKey(vector.workspacePath) === workspaceKey
                    && (vector.scope !== 'session' || !query.sessionId || vector.sessionId === query.sessionId);
            case 'task':
                return false;
            default:
                return false;
        }
    }

    protected repositoryLocatorMatches(
        item: Pick<MemoryItem, 'repositoryUrl' | 'repositoryId'>,
        query: Pick<RetrievalQuery, 'repositoryUrl' | 'repositoryId'>
    ): boolean {
        return (!!item.repositoryId && !!query.repositoryId && item.repositoryId === query.repositoryId)
            || (!!item.repositoryUrl && !!query.repositoryUrl && item.repositoryUrl === query.repositoryUrl);
    }

    protected vectorSearchResult(vector: MemoryVector, memory: MemoryItem | undefined, queryVector: readonly number[], query: RetrievalQuery, precomputedSimilarity?: number): RetrievalResult | undefined {
        if (!memory) {
            return undefined;
        }
        const rankedMemory = this.rankableMemory(memory);
        const similarity = Math.max(0, precomputedSimilarity ?? this.vectorService.cosineSimilarity(queryVector, vector.vector));
        if (similarity <= 0) {
            return undefined;
        }
        return {
            id: rankedMemory.id,
            sourceKind: this.sourceKind,
            title: rankedMemory.title,
            snippet: rankedMemory.content,
            score: Number((similarity * this.memoryLifecycleMultiplier(rankedMemory) * Math.max(0.1, rankedMemory.weight)).toFixed(6)),
            evidence: `pi_memory_vectors:${vector.modelId}`,
            rankingSignals: this.memoryRankingSignals(rankedMemory, query, {
                vectorScore: similarity
            })
        };
    }

    protected mergeTextAndVectorResults(textResults: RetrievalResult[], vectorResults: RetrievalResult[]): RetrievalResult[] {
        const merged = new Map<string, RetrievalResult>();
        for (const result of textResults) {
            merged.set(result.id, {
                ...result,
                score: Number((result.score * 0.7).toFixed(6))
            });
        }
        for (const result of vectorResults) {
            const existing = merged.get(result.id);
            if (!existing) {
                merged.set(result.id, {
                    ...result,
                    score: Number((result.score * 0.75).toFixed(6))
                });
                continue;
            }
            merged.set(result.id, {
                ...existing,
                score: Number((existing.score + result.score * 0.45).toFixed(6)),
                evidence: `${existing.evidence ?? 'pi_memory_items'} + ${result.evidence}`,
                rankingSignals: {
                    ...existing.rankingSignals,
                    ...result.rankingSignals,
                    bm25Score: existing.rankingSignals?.bm25Score,
                    vectorScore: result.rankingSignals?.vectorScore
                }
            });
        }
        return [...merged.values()]
            .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title));
    }

    protected memorySearchRepository(): MemorySearchRepository | undefined {
        const candidate = this.repository as Partial<MemorySearchRepository>;
        return typeof candidate.searchMemoryItems === 'function' ? candidate as MemorySearchRepository : undefined;
    }

    protected memoryVectorSearchRepository(): MemoryVectorSearchRepository | undefined {
        const candidate = this.repository as Partial<MemoryVectorSearchRepository>;
        return typeof candidate.searchMemoryVectors === 'function' ? candidate as MemoryVectorSearchRepository : undefined;
    }
}

export class RepositoryMemoryRetrievalSource extends ProjectMemoryRetrievalSource {

    override readonly sourceKind = 'repository-memory' as const;

    protected override memoryInScope(memory: MemoryItem, query: RetrievalQuery, workspaceKey: string): boolean {
        if (memory.scope !== 'repository') {
            return false;
        }
        return this.repositoryLocatorMatches(memory, query)
            || this.repositoryWorkspaceFallback(memory, query, workspaceKey);
    }

    protected override memoryVectorInScope(vector: MemoryVector, query: RetrievalQuery, workspaceKey: string): boolean {
        if (vector.scope !== 'repository') {
            return false;
        }
        return this.repositoryLocatorMatches(vector, query)
            || this.repositoryWorkspaceFallback(vector, query, workspaceKey);
    }

    protected repositoryWorkspaceFallback(
        item: Pick<MemoryItem, 'workspacePath' | 'repositoryUrl' | 'repositoryId'>,
        query: Pick<RetrievalQuery, 'repositoryUrl' | 'repositoryId'>,
        workspaceKey: string
    ): boolean {
        if (query.repositoryId || query.repositoryUrl) {
            return false;
        }
        return !!item.workspacePath && this.repository.workspaceKey(item.workspacePath) === workspaceKey;
    }
}

export class TaskMemoryRetrievalSource extends ProjectMemoryRetrievalSource {

    override readonly sourceKind = 'task-memory' as const;

    protected override memoryInScope(memory: MemoryItem, query: RetrievalQuery, workspaceKey: string): boolean {
        return memory.scope === 'task'
            && !!query.taskId
            && memory.taskId === query.taskId
            && !!memory.retentionPolicy
            && !!memory.workspacePath
            && this.repository.workspaceKey(memory.workspacePath) === workspaceKey;
    }

    protected override memoryVectorInScope(vector: MemoryVector, query: RetrievalQuery, workspaceKey: string): boolean {
        return vector.scope === 'task'
            && !!query.taskId
            && vector.taskId === query.taskId
            && !!vector.workspacePath
            && this.repository.workspaceKey(vector.workspacePath) === workspaceKey;
    }
}

export class AgentEventRetrievalSource extends JsonStoreRetrievalSource {

    readonly sourceKind = 'agent-event' as const;
    protected readonly permittedEventTypes = new Set<MemoryEventType>([
        'prompt.submitted',
        'prompt.normalized',
        'tool.requested',
        'file.opened',
        'file.read',
        'file.created',
        'file.edited',
        'file.deleted',
        'file.saved',
        'file.renamed',
        'search.executed',
        'terminal.command',
        'task.started',
        'task.failed',
        'task.succeeded',
        'build.started',
        'build.failed',
        'build.succeeded',
        'test.started',
        'test.failed',
        'test.passed',
        'context.suggested',
        'context.accepted',
        'context.rejected',
        'context.inserted',
        'context.ignored',
        'memory.suggested',
        'memory.created',
        'memory.approved',
        'memory.edited',
        'memory.promoted',
        'memory.demoted',
        'memory.deleted',
        'memory.accessed',
        'memory.consolidated',
        'memory.superseded',
        'memory.decayed',
        'memory.pruning_proposed',
        'skill.suggested',
        'skill.accepted',
        'skill.rejected',
        'skill.unblocked',
        'agent.completed',
        'agent.failed'
    ]);

    async search(query: RetrievalQuery): Promise<RetrievalResult[]> {
        const limit = query.limit ?? 20;
        const searchRepository = this.eventSearchRepository();
        if (searchRepository) {
            const events = await searchRepository.searchEvents(query.workspacePath, query.text, limit);
            return this.applyFeedback(query, events
                .filter(event => this.isPermittedEvent(event))
                .map(event => this.eventResult(event, query.text.toLowerCase(), query))
                .filter((result): result is RetrievalResult => result !== undefined)
                .slice(0, limit));
        }
        const store = await this.repository.read();
        const key = this.repository.workspaceKey(query.workspacePath);
        const needle = query.text.toLowerCase();
        return this.applyFeedback(query, store.events
            .filter(event => this.repository.workspaceKey(event.workspacePath) === key)
            .filter(event => this.isPermittedEvent(event))
            .map(event => this.eventResult(event, needle, query))
            .filter((result): result is RetrievalResult => result !== undefined)
            .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title))
            .slice(0, limit));
    }

    protected isPermittedEvent(event: MemoryEvent): boolean {
        return this.permittedEventTypes.has(event.eventType);
    }

    protected eventResult(event: MemoryEvent, needle: string, query: RetrievalQuery): RetrievalResult | undefined {
        const payload = this.safePayloadText(event.payload);
        const eventScope = this.eventScope(event);
        const haystack = [
            event.eventType,
            event.relativePath ?? '',
            event.promptSignature ?? '',
            eventScope.sessionId ?? '',
            eventScope.taskId ?? '',
            payload
        ].join(' ').toLowerCase();
        const bm25Score = this.score(haystack, needle);
        if (needle && bm25Score <= 0) {
            return undefined;
        }
        const score = bm25Score + this.eventWeight(event);
        return {
            id: event.id,
            sourceKind: this.sourceKind,
            title: this.eventTitle(event),
            snippet: this.eventSnippet(event, payload),
            score: Number(score.toFixed(6)),
            uri: event.relativePath,
            evidence: `pi_events:${event.eventType}:${event.createdAt}`,
            estimatedTokens: this.estimatedTokens(event, payload),
            rankingSignals: {
                bm25Score,
                recencyScore: this.eventRecencyScore(event),
                eventType: event.eventType,
                eventTypeScore: this.eventTypeScore(event),
                workspaceScore: this.workspaceScore(query, event.workspacePath),
                sessionTaskScore: this.sessionTaskScore(query, eventScope),
                scopeBoost: 0.65
            }
        };
    }

    protected eventScope(event: MemoryEvent): { sessionId?: string; taskId?: string } {
        const payloadScope = this.payloadScope(event.payload);
        return {
            sessionId: event.sessionId ?? payloadScope.sessionId,
            taskId: event.taskId ?? payloadScope.taskId
        };
    }

    protected payloadScope(payload: string | undefined): { sessionId?: string; taskId?: string } {
        if (!payload) {
            return {};
        }
        try {
            const parsed = JSON.parse(payload) as Record<string, unknown>;
            return {
                sessionId: typeof parsed.sessionId === 'string' ? parsed.sessionId : undefined,
                taskId: typeof parsed.taskId === 'string' ? parsed.taskId : undefined
            };
        } catch {
            return {};
        }
    }

    protected eventTitle(event: MemoryEvent): string {
        return event.relativePath ? `${event.eventType}: ${event.relativePath}` : event.eventType;
    }

    protected eventSnippet(event: MemoryEvent, payload: string): string {
        return [
            `Type: ${event.eventType}`,
            `Created: ${event.createdAt}`,
            event.relativePath ? `Path: ${event.relativePath}` : undefined,
            event.promptSignature ? `Prompt signature: ${event.promptSignature}` : undefined,
            payload ? `Payload: ${payload}` : undefined
        ].filter((value): value is string => !!value).join('\n');
    }

    protected safePayloadText(payload: string | undefined): string {
        if (!payload) {
            return '';
        }
        try {
            const parsed = JSON.parse(payload) as Record<string, unknown>;
            const minimized = { ...parsed };
            for (const key of ['prompt', 'text', 'content', 'message', 'promptSnippet', 'redactedPromptSnippet', 'promptSample', 'redactedPromptSample']) {
                delete minimized[key];
            }
            return JSON.stringify(minimized);
        } catch {
            return payload;
        }
    }

    protected estimatedTokens(event: MemoryEvent, payload: string): number {
        return Math.max(8, Math.ceil(this.eventSnippet(event, payload).length / 4));
    }

    protected eventWeight(event: MemoryEvent): number {
        switch (event.eventType) {
            case 'agent.failed':
                return 0.25;
            case 'agent.completed':
                return 0.2;
            case 'prompt.submitted':
                return 0.15;
            default:
                return 0.1;
        }
    }

    protected eventTypeScore(event: MemoryEvent): number {
        switch (event.eventType) {
            case 'agent.failed':
            case 'build.failed':
            case 'test.failed':
                return 1;
            case 'agent.completed':
            case 'build.succeeded':
            case 'test.passed':
            case 'task.succeeded':
                return 0.85;
            case 'prompt.submitted':
            case 'tool.requested':
                return 0.75;
            case 'file.saved':
            case 'file.edited':
            case 'file.created':
            case 'file.deleted':
            case 'file.renamed':
            case 'search.executed':
                return 0.6;
            default:
                return 0.45;
        }
    }

    protected eventRecencyScore(event: MemoryEvent): number {
        const ageMs = Date.now() - new Date(event.createdAt).getTime();
        if (!Number.isFinite(ageMs) || ageMs <= 0) {
            return 1;
        }
        return Math.max(0, Math.min(1, 1 - (ageMs / 86_400_000) / 30));
    }

    protected eventSearchRepository(): MemoryEventSearchRepository | undefined {
        return typeof this.repository.searchEvents === 'function' ? this.repository as MemoryEventSearchRepository : undefined;
    }
}

export class SkillRetrievalSource extends JsonStoreRetrievalSource {

    readonly sourceKind = 'skill' as const;

    async search(query: RetrievalQuery): Promise<RetrievalResult[]> {
        const store = await this.repository.read();
        const key = this.repository.workspaceKey(query.workspacePath);
        const needle = query.text.toLowerCase();
        return this.applyFeedback(query, store.skillCandidates
            .filter(candidate => !candidate.workspacePath || this.repository.workspaceKey(candidate.workspacePath) === key)
            .map(candidate => this.skillResult(candidate, needle))
            .filter((result): result is RetrievalResult => result !== undefined)
            .sort((left, right) => right.score - left.score)
            .slice(0, query.limit ?? 20));
    }

    protected skillResult(candidate: MemorySkillCandidate, needle: string): RetrievalResult | undefined {
        const haystack = `${candidate.title} ${candidate.description} ${candidate.signature}`.toLowerCase();
        const bm25Score = this.score(haystack, needle);
        if (needle && bm25Score <= 0) {
            return undefined;
        }
        return {
            id: candidate.id,
            sourceKind: this.sourceKind,
            title: candidate.title,
            snippet: `${candidate.status}: ${candidate.description}`,
            score: bm25Score,
            evidence: 'pi_skill_candidates',
            rankingSignals: {
                bm25Score,
                scopeBoost: 0.5
            }
        };
    }
}

export class FeedbackRecordRetrievalSource extends JsonStoreRetrievalSource {

    readonly sourceKind = 'feedback-record' as const;

    async search(query: RetrievalQuery): Promise<RetrievalResult[]> {
        const store = await this.repository.read();
        const key = this.repository.workspaceKey(query.workspacePath);
        const needle = query.text.toLowerCase();
        return store.feedbackRecords
            .filter(record => this.repository.workspaceKey(record.workspacePath) === key)
            .filter(record => !record.resolvedAt)
            .map(record => this.feedbackResult(record, needle))
            .filter((result): result is RetrievalResult => result !== undefined)
            .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title))
            .slice(0, query.limit ?? 20);
    }

    protected feedbackResult(record: MemoryFeedbackRecord, needle: string): RetrievalResult | undefined {
        const correction = typeof record.metadata?.correction === 'string' ? record.metadata.correction : undefined;
        const haystack = [
            record.targetTitle,
            record.targetId,
            record.targetSourceKind,
            record.feedback,
            record.reason,
            record.evidence,
            correction
        ].filter((value): value is string => !!value).join(' ').toLowerCase();
        const bm25Score = this.score(haystack, needle);
        if (needle && bm25Score <= 0) {
            return undefined;
        }
        const score = bm25Score + this.feedbackWeight(record.feedback);
        const target = record.targetSourceKind ? `${record.targetSourceKind}:${record.targetId}` : record.targetId;
        return {
            id: record.id,
            sourceKind: this.sourceKind,
            title: `${this.feedbackLabel(record.feedback)} feedback: ${record.targetTitle ?? record.targetId}`,
            snippet: [
                `Feedback: ${record.feedback}`,
                `Target: ${target}`,
                record.reason ? `Reason: ${record.reason}` : undefined,
                correction ? `Correction: ${correction}` : undefined,
                record.evidence ? `Evidence: ${record.evidence}` : undefined
            ].filter((value): value is string => !!value).join('\n'),
            score: Number(score.toFixed(6)),
            uri: record.targetUri,
            evidence: `pi_feedback_records:${record.feedback}:unresolved:${record.createdAt}`,
            rankingSignals: {
                bm25Score,
                acceptanceScore: record.feedback === 'accepted' ? 1 : 0,
                recencyScore: this.feedbackRecencyScore(record),
                stalePenalty: record.feedback === 'stale' ? 0.2 : 0,
                scopeBoost: 0.7
            }
        };
    }

    protected feedbackRecencyScore(record: MemoryFeedbackRecord): number {
        const ageMs = Date.now() - new Date(record.createdAt).getTime();
        if (!Number.isFinite(ageMs) || ageMs <= 0) {
            return 1;
        }
        return Math.max(0, Math.min(1, 1 - (ageMs / 86_400_000) / 30));
    }

    protected feedbackWeight(feedback: MemoryFeedbackKind): number {
        switch (feedback) {
            case 'rejected':
                return 0.35;
            case 'stale':
                return 0.3;
            case 'accepted':
                return 0.15;
            default:
                return 0.1;
        }
    }

    protected feedbackLabel(feedback: MemoryFeedbackKind): string {
        switch (feedback) {
            case 'rejected':
                return 'Rejected';
            case 'stale':
                return 'Stale';
            case 'accepted':
                return 'Accepted';
            default:
                return 'Recorded';
        }
    }
}

export class LocalDocsRetrievalSource implements IRetrievalSource {

    readonly sourceKind = 'local-docs' as const;
    protected readonly feedbackService = new FeedbackService();

    constructor(
        protected readonly libraryService: LibraryService | undefined,
        protected readonly repository?: MemoryStoreRepository
    ) { }

    async search(query: RetrievalQuery): Promise<RetrievalResult[]> {
        if (!this.libraryService || !query.text.trim()) {
            return [];
        }
        try {
            const docs = await this.libraryService.searchDocs(query.text, { maxResults: query.limit ?? 5 });
            const results = docs.map(doc => ({
                id: `${doc.packageId}:${doc.title}:${doc.heading ?? ''}`,
                sourceKind: this.sourceKind,
                title: `${doc.packageName} ${doc.version}: ${doc.heading ?? doc.title}`,
                snippet: doc.snippet,
                score: doc.score,
                uri: doc.originalUrl ?? doc.localPath,
                evidence: 'LibraryService.searchDocs local versioned docs',
                rankingSignals: {
                    bm25Score: doc.score,
                    scopeBoost: 0.6
                }
            }));
            return this.applyFeedback(query, results);
        } catch {
            return [];
        }
    }

    protected async applyFeedback(query: RetrievalQuery, results: RetrievalResult[]): Promise<RetrievalResult[]> {
        const repository = this.repository;
        if (!repository) {
            return results;
        }
        const store = await repository.read();
        const key = repository.workspaceKey(query.workspacePath);
        const feedback = store.feedbackRecords.filter(record => repository.workspaceKey(record.workspacePath) === key);
        return results
            .map(result => {
                const multiplier = this.feedbackService.rankingMultiplier(feedback, result);
                return {
                    ...result,
                    score: Number((result.score * multiplier).toFixed(6)),
                    rankingSignals: result.rankingSignals ? {
                        ...result.rankingSignals,
                        acceptanceScore: Math.max(result.rankingSignals.acceptanceScore ?? 0, multiplier > 1 ? 1 : multiplier),
                        stalePenalty: Math.max(result.rankingSignals.stalePenalty ?? 0, multiplier < 1 ? 1 - multiplier : 0),
                        feedbackMultiplier: multiplier
                    } : undefined
                };
            })
            .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title));
    }

}

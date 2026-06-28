// *****************************************************************************
// Copyright (C) 2026.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import {
    IRetrievalSource,
    MemoryContextSuggestion,
    MemoryContextSuggestionRequest,
    MemoryContextSuggestionResult,
    MemoryRankingWeights,
    RetrievalResult
} from './memory-types';
import { TokenBudgetService } from './token-budget-service';

export const DEFAULT_MEMORY_RANKING_WEIGHTS: MemoryRankingWeights = {
    bm25Score: 0.30,
    vectorScore: 0.25,
    graphScore: 0.15,
    memoryWeight: 0.10,
    recencyScore: 0.10,
    eventTypeScore: 0.05,
    workspaceScore: 0.05,
    sessionTaskScore: 0.10,
    acceptanceScore: 0.05,
    scopeBoost: 0.05,
    stalePenalty: 1
};

export class ContextSuggestionService {

    protected readonly tokenBudgetService = new TokenBudgetService();

    constructor(protected readonly retrievalSources: readonly IRetrievalSource[] = []) { }

    async suggest(request: MemoryContextSuggestionRequest): Promise<MemoryContextSuggestionResult> {
        const requestedKinds = new Set(request.sourceKinds ?? this.retrievalSources.map(source => source.sourceKind));
        const weights = this.rankingWeights(request.rankingWeights);
        const results = (await Promise.all(this.retrievalSources
            .filter(source => requestedKinds.has(source.sourceKind) || (source.sourceKind === 'code' && (requestedKinds.has('local-docs') || requestedKinds.has('external-docs'))))
            .map(source => source.search({
                workspacePath: request.workspacePath,
                text: request.prompt,
                limit: request.limit ?? 12,
                sourceKinds: request.sourceKinds,
                sessionId: request.sessionId,
                taskId: request.taskId
            })))).flat();
        const ranked = results
            .map(result => this.rank(result, weights))
            .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title));
        const budget = this.tokenBudgetService.fit({
            budgetTokens: request.tokenBudget ?? 4000,
            items: ranked.map(result => ({
                id: result.id,
                text: result.snippet,
                priority: result.score
            }))
        });
        const selected = new Set(budget.selectedIds);
        const suggestions = ranked
            .filter(result => selected.has(result.id))
            .slice(0, request.limit ?? 12)
            .map(result => this.toSuggestion(result));
        return {
            suggestions,
            estimatedTokens: suggestions.reduce((total, suggestion) => total + suggestion.estimatedTokens, 0),
            omittedCount: ranked.length - suggestions.length
        };
    }

    protected rankingWeights(overrides: Partial<MemoryRankingWeights> | undefined): MemoryRankingWeights {
        return {
            ...DEFAULT_MEMORY_RANKING_WEIGHTS,
            ...overrides
        };
    }

    protected rank(result: RetrievalResult, weights: MemoryRankingWeights): RetrievalResult {
        if (!result.rankingSignals) {
            return result;
        }
        const signals = result.rankingSignals;
        const baseScore =
            weights.bm25Score * this.signal(signals.bm25Score)
            + weights.vectorScore * this.signal(signals.vectorScore)
            + weights.graphScore * this.signal(signals.graphScore)
            + weights.memoryWeight * this.signal(signals.memoryWeight ?? signals.weight)
            + weights.recencyScore * this.signal(signals.recencyScore)
            + weights.eventTypeScore * this.signal(signals.eventTypeScore)
            + weights.workspaceScore * this.signal(signals.workspaceScore)
            + weights.sessionTaskScore * this.signal(signals.sessionTaskScore)
            + weights.acceptanceScore * this.signal(signals.acceptanceScore)
            + weights.scopeBoost * this.signal(signals.scopeBoost)
            - weights.stalePenalty * this.signal(signals.stalePenalty);
        const score = Math.max(0, baseScore) * this.feedbackMultiplier(signals.feedbackMultiplier);
        return {
            ...result,
            score: Number(score.toFixed(6)),
            evidence: this.rankingReason(result)
        };
    }

    protected signal(value: number | undefined): number {
        return Math.max(0, Math.min(1, value ?? 0));
    }

    protected feedbackMultiplier(value: number | undefined): number {
        return Math.max(0.05, Math.min(1.2, value ?? 1));
    }

    protected rankingReason(result: RetrievalResult): string {
        const signals = result.rankingSignals;
        if (!signals) {
            return result.evidence ?? `Matched ${result.sourceKind}.`;
        }
        if (result.sourceKind === 'agent-event') {
            return this.agentEventRankingReason(result);
        }
        const parts = [
            result.evidence,
            signals.scope ? `scope=${signals.scope}` : undefined,
            signals.staleStatus ? `stale=${signals.staleStatus}` : undefined,
            signals.importance ? `importance=${signals.importance}` : undefined,
            signals.weight !== undefined ? `weight=${signals.weight}` : undefined,
            signals.eventType ? `eventType=${signals.eventType}` : undefined,
            signals.eventTypeScore !== undefined ? `eventTypeScore=${signals.eventTypeScore}` : undefined,
            signals.workspaceScore !== undefined ? `workspace=${signals.workspaceScore}` : undefined,
            signals.sessionTaskScore !== undefined ? `sessionTask=${signals.sessionTaskScore}` : undefined,
            signals.feedbackMultiplier !== undefined ? `feedback=${signals.feedbackMultiplier}` : undefined,
            signals.godNodeScore !== undefined ? `godNode=${signals.godNodeScore}` : undefined,
            signals.communityScore !== undefined ? `community=${signals.communityScore}` : undefined,
            signals.surprisingConnectionScore !== undefined ? `surprisingConnection=${signals.surprisingConnectionScore}` : undefined,
            signals.riskScore !== undefined ? `risk=${signals.riskScore}` : undefined,
            signals.graphSignals?.length ? `graphSignals=${signals.graphSignals.join(',')}` : undefined
        ].filter((part): part is string => !!part);
        return parts.length ? parts.join('; ') : `Matched ${result.sourceKind}.`;
    }

    protected agentEventRankingReason(result: RetrievalResult): string {
        const signals = result.rankingSignals;
        if (!signals) {
            return result.evidence ?? 'Matched agent event.';
        }
        const explanations = [
            signals.bm25Score !== undefined && signals.bm25Score > 0
                ? `matched the prompt text (bm25=${signals.bm25Score})`
                : undefined,
            signals.eventType
                ? `event type ${signals.eventType} contributed relevance${signals.eventTypeScore !== undefined ? ` (eventTypeScore=${signals.eventTypeScore})` : ''}`
                : undefined,
            signals.recencyScore !== undefined
                ? `recency contributed ${signals.recencyScore}`
                : undefined,
            signals.sessionTaskScore !== undefined && signals.sessionTaskScore > 0
                ? `matched the current session or task (sessionTask=${signals.sessionTaskScore})`
                : undefined,
            signals.workspaceScore !== undefined && signals.workspaceScore > 0
                ? `came from this workspace (workspace=${signals.workspaceScore})`
                : undefined,
            signals.feedbackMultiplier !== undefined && signals.feedbackMultiplier !== 1
                ? `prior feedback adjusted the rank (feedback=${signals.feedbackMultiplier})`
                : undefined
        ].filter((part): part is string => !!part);
        const details = [
            result.evidence,
            signals.eventType ? `eventType=${signals.eventType}` : undefined,
            signals.eventTypeScore !== undefined ? `eventTypeScore=${signals.eventTypeScore}` : undefined,
            signals.recencyScore !== undefined ? `recency=${signals.recencyScore}` : undefined,
            signals.workspaceScore !== undefined ? `workspace=${signals.workspaceScore}` : undefined,
            signals.sessionTaskScore !== undefined ? `sessionTask=${signals.sessionTaskScore}` : undefined,
            signals.feedbackMultiplier !== undefined ? `feedback=${signals.feedbackMultiplier}` : undefined
        ].filter((part): part is string => !!part);
        const why = explanations.length ? explanations.join('; ') : 'matched agent event ranking signals';
        return `Suggested event because it ${why}. ${details.join('; ')}`;
    }

    protected toSuggestion(result: RetrievalResult): MemoryContextSuggestion {
        const estimatedTokens = result.estimatedTokens ?? this.tokenBudgetService.estimateTokens(result.snippet);
        return {
            id: result.id,
            title: result.title,
            reason: result.evidence ?? `Matched ${result.sourceKind}.`,
            sourceKind: result.sourceKind,
            score: Number(result.score.toFixed(3)),
            estimatedTokens,
            uri: result.uri,
            rankingSignals: result.rankingSignals
        };
    }
}

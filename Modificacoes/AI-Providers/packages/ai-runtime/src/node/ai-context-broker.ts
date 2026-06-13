// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { inject, injectable, optional } from '@theia/core/shared/inversify';
import {
    ContextPack,
    MemoryContextSuggestionResult,
    MemoryService,
    RetrievalResult
} from '@cybervinci/memory/lib/common';
import {
    CyberVinciAiContextPolicy,
    CyberVinciAiContextReport,
    CyberVinciAiTaskRequest
} from '../common';

export interface CyberVinciAiPreparedContext {
    report: CyberVinciAiContextReport;
    promptSection?: string;
}

@injectable()
export class CyberVinciAiContextBroker {

    @inject(MemoryService) @optional()
    protected readonly memoryService?: MemoryService;

    async prepare(request: CyberVinciAiTaskRequest): Promise<CyberVinciAiPreparedContext> {
        const policy = request.context;
        const requested = policy?.mode !== undefined && policy.mode !== 'none';
        if (!requested) {
            return this.empty(false, 'Context policy disabled.');
        }
        if (!request.workspacePath) {
            return this.empty(true, 'Workspace path is required for memory context.');
        }
        if (!this.memoryService) {
            if (policy?.mode === 'memory') {
                return this.empty(true, 'CyberVinci Memory service is not available.');
            }
            return this.empty(true, 'CyberVinci Memory service is not available; continuing without context.');
        }

        try {
            const prompt = this.toContextPrompt(request);
            const suggestions = await this.memoryService.suggestContext({
                workspacePath: request.workspacePath,
                prompt,
                limit: policy?.maxItems ?? 8,
                tokenBudget: policy?.tokenBudget ?? 1400,
                sourceKinds: policy?.sourceKinds as never,
                sessionId: policy?.sessionId ?? request.sessionId,
                taskId: policy?.taskId ?? request.taskId
            });
            const pack = await this.memoryService.buildContextPack({
                workspacePath: request.workspacePath,
                prompt,
                retrievalResults: this.toRetrievalResults(suggestions),
                tokenBudget: policy?.tokenBudget ?? 1400
            });
            return {
                report: this.toReport(suggestions, pack),
                promptSection: this.toPromptSection(pack)
            };
        } catch (reason) {
            return this.empty(true, `Memory context failed: ${String((reason as Error)?.message ?? reason)}`);
        }
    }

    protected toContextPrompt(request: CyberVinciAiTaskRequest): string {
        return [
            request.surfaceId,
            request.action,
            request.userPrompt,
            ...(request.context?.queries ?? [])
        ].filter(Boolean).join('\n\n');
    }

    protected toRetrievalResults(result: MemoryContextSuggestionResult): RetrievalResult[] {
        return result.suggestions.map(suggestion => ({
            id: suggestion.id,
            sourceKind: suggestion.sourceKind,
            title: suggestion.title,
            snippet: suggestion.reason,
            score: suggestion.score,
            uri: suggestion.uri,
            estimatedTokens: suggestion.estimatedTokens,
            rankingSignals: suggestion.rankingSignals
        }));
    }

    protected toReport(suggestions: MemoryContextSuggestionResult, pack: ContextPack): CyberVinciAiContextReport {
        return {
            requested: true,
            used: pack.sections.length > 0,
            source: 'memory',
            estimatedTokens: pack.estimatedTokens,
            omittedCount: suggestions.omittedCount,
            suggestions: suggestions.suggestions.map(suggestion => ({
                id: suggestion.id,
                title: suggestion.title,
                reason: suggestion.reason,
                sourceKind: suggestion.sourceKind,
                score: suggestion.score,
                estimatedTokens: suggestion.estimatedTokens,
                uri: suggestion.uri
            })),
            citations: pack.citations.map(citation => ({
                resultId: citation.resultId,
                sourceKind: citation.sourceKind,
                title: citation.title,
                uri: citation.uri
            }))
        };
    }

    protected toPromptSection(pack: ContextPack): string | undefined {
        if (pack.sections.length === 0) {
            return undefined;
        }
        return [
            'Relevant CyberVinci Memory context:',
            ...pack.sections.map(section => `## ${section.title}\n${section.content}`)
        ].join('\n\n');
    }

    protected empty(requested: boolean, message: string): CyberVinciAiPreparedContext {
        return {
            report: {
                requested,
                used: false,
                source: 'none',
                estimatedTokens: 0,
                suggestions: [],
                citations: [],
                message
            }
        };
    }
}

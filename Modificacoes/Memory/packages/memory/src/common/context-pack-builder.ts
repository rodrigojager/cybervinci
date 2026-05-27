// *****************************************************************************
// Copyright (C) 2026.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { ContextPack, ContextPackRequest, PromptSection, RetrievalResult } from './memory-types';
import { PromptNormalizer } from './prompt-normalizer';
import { SecretRedactionService } from './secret-redaction';
import { TokenBudgetService } from './token-budget-service';

export class ContextPackBuilder {

    protected readonly normalizer = new PromptNormalizer();
    protected readonly redactionService = new SecretRedactionService();
    protected readonly tokenBudgetService = new TokenBudgetService();

    build(request: ContextPackRequest): ContextPack {
        const normalized = this.normalizer.normalize({
            prompt: request.prompt,
            workspaceRoot: request.workspacePath
        });
        const budget = this.tokenBudgetService.fit({
            budgetTokens: request.tokenBudget ?? 6000,
            reservedTokens: this.tokenBudgetService.estimateTokens(normalized.normalizedPrompt),
            items: request.retrievalResults.map(result => ({
                id: result.id,
                text: this.resultText(result),
                priority: result.score
            }))
        });
        const selected = new Set(budget.selectedIds);
        const contextSections: PromptSection[] = request.retrievalResults
            .filter(result => selected.has(result.id))
            .map(result => ({
                id: `context-${result.id}`,
                title: this.redact(`${result.sourceKind}: ${result.title}`),
                content: this.resultText(result)
            }));

        return {
            workspacePath: request.workspacePath,
            promptSignature: normalized.signature,
            estimatedTokens: budget.estimatedTokens + this.tokenBudgetService.estimateTokens(normalized.normalizedPrompt),
            sections: [...normalized.sections, ...contextSections],
            citations: request.retrievalResults
                .filter(result => selected.has(result.id))
                .map(result => ({
                    resultId: result.id,
                    sourceKind: result.sourceKind,
                    title: this.redact(result.title),
                    uri: this.redact(result.uri)
                }))
        };
    }

    protected resultText(result: RetrievalResult): string {
        return this.redact([
            result.title,
            result.uri ? `URI: ${result.uri}` : undefined,
            result.evidence ? `Evidence: ${result.evidence}` : undefined,
            result.snippet
        ].filter(Boolean).join('\n'));
    }

    protected redact(value: string | undefined): string {
        return this.redactionService.redactText(value) ?? '';
    }
}

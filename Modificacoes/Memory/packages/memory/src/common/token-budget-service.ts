// *****************************************************************************
// Copyright (C) 2026.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { TokenBudgetRequest, TokenBudgetResult } from './memory-types';

export class TokenBudgetService {

    estimateTokens(text: string): number {
        const normalized = text.replace(/\s+/g, ' ').trim();
        if (!normalized) {
            return 0;
        }
        return Math.max(1, Math.ceil(normalized.length / 4));
    }

    fit(request: TokenBudgetRequest): TokenBudgetResult {
        const available = Math.max(0, request.budgetTokens - (request.reservedTokens ?? 0));
        let estimatedTokens = 0;
        const selectedIds: string[] = [];
        const omittedIds: string[] = [];
        const ranked = [...request.items].sort((left, right) => (right.priority ?? 0) - (left.priority ?? 0) || left.id.localeCompare(right.id));

        for (const item of ranked) {
            const itemTokens = this.estimateTokens(item.text);
            if (estimatedTokens + itemTokens <= available) {
                selectedIds.push(item.id);
                estimatedTokens += itemTokens;
            } else {
                omittedIds.push(item.id);
            }
        }

        return {
            selectedIds,
            omittedIds,
            estimatedTokens,
            budgetTokens: request.budgetTokens
        };
    }
}

// *****************************************************************************
// Copyright (C) 2026.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import {
    MemoryFeedbackRecord,
    MemoryFeedbackRequest,
    MemoryFeedbackSearchRequest,
    MemorySourceKind,
    RetrievalResult
} from './memory-types';

export class FeedbackService {

    normalize(request: MemoryFeedbackRequest, id: string, now = new Date().toISOString()): MemoryFeedbackRecord {
        return {
            id,
            workspacePath: request.workspacePath,
            promptSignature: request.promptSignature,
            targetKind: request.targetKind,
            targetId: request.targetId,
            targetSourceKind: request.targetSourceKind,
            targetUri: request.targetUri,
            targetTitle: request.targetTitle,
            feedback: request.feedback,
            reason: request.reason,
            evidence: request.evidence,
            metadata: request.metadata,
            createdAt: now
        };
    }

    search(records: readonly MemoryFeedbackRecord[], request: MemoryFeedbackSearchRequest, workspaceKey: (workspacePath: string) => string): MemoryFeedbackRecord[] {
        const key = workspaceKey(request.workspacePath);
        const targetIds = new Set(request.targetIds ?? []);
        const sourceKinds = new Set<MemorySourceKind>(request.targetSourceKinds ?? []);
        const targetKinds = new Set(request.targetKinds ?? []);
        const feedbackKinds = new Set(request.feedback ?? []);
        return records
            .filter(record => workspaceKey(record.workspacePath) === key)
            .filter(record => !request.promptSignature || record.promptSignature === request.promptSignature)
            .filter(record => !targetIds.size || targetIds.has(record.targetId))
            .filter(record => !sourceKinds.size || (record.targetSourceKind !== undefined && sourceKinds.has(record.targetSourceKind)))
            .filter(record => !targetKinds.size || targetKinds.has(record.targetKind))
            .filter(record => !feedbackKinds.size || feedbackKinds.has(record.feedback))
            .filter(record => !request.unresolvedOnly || !record.resolvedAt)
            .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
            .slice(0, request.limit ?? 100);
    }

    resolve(records: readonly MemoryFeedbackRecord[], id: string, now = new Date().toISOString()): MemoryFeedbackRecord[] {
        return records.map(record => record.id === id ? { ...record, resolvedAt: record.resolvedAt ?? now } : record);
    }

    rankingMultiplier(records: readonly MemoryFeedbackRecord[], result: Pick<RetrievalResult, 'id' | 'sourceKind' | 'uri'>): number {
        const matching = records.filter(record => this.matchesResult(record, result) && !record.resolvedAt);
        if (!matching.length) {
            return 1;
        }
        const rejected = matching.filter(record => record.feedback === 'rejected').length;
        const stale = matching.filter(record => record.feedback === 'stale').length;
        const accepted = matching.filter(record => record.feedback === 'accepted').length;
        const penalty = Math.pow(0.45, rejected) * Math.pow(0.7, stale);
        const boost = accepted > rejected + stale ? 1.05 : 1;
        return Math.max(0.05, Math.min(1.05, penalty * boost));
    }

    protected matchesResult(record: MemoryFeedbackRecord, result: Pick<RetrievalResult, 'id' | 'sourceKind' | 'uri'>): boolean {
        if (record.targetSourceKind && record.targetSourceKind !== result.sourceKind) {
            return false;
        }
        if (record.targetId === result.id) {
            return true;
        }
        return !!record.targetUri && !!result.uri && record.targetUri === result.uri;
    }
}

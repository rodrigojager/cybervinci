// *****************************************************************************
// Copyright (C) 2026.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import {
    MemoryExport,
    MemoryHealth,
    MemoryImportResult,
    MemoryImportance,
    MemoryItem,
    MemoryPruningProposal,
    MemoryPruningReason
} from './memory-types';
import { SecretScanner } from './secret-scanner';

export class MemoryServiceHelper {

    protected readonly secretScanner = new SecretScanner();

    normalize(memory: Partial<MemoryItem> & Pick<MemoryItem, 'id' | 'scope' | 'memoryType' | 'title' | 'content' | 'status' | 'staleStatus' | 'createdAt' | 'updatedAt'>): MemoryItem {
        const importance = this.normalizeImportance(memory.importance);
        const scoped = this.normalizeScopeFields(memory);
        return {
            ...memory,
            ...scoped,
            importance,
            weight: this.normalizeWeight(memory.weight, importance),
            lastAccessedAt: memory.lastAccessedAt ?? memory.updatedAt ?? memory.createdAt,
            accessCount: Math.max(0, Math.floor(memory.accessCount ?? 0)),
            acceptedCount: Math.max(0, Math.floor(memory.acceptedCount ?? 0)),
            rejectedCount: Math.max(0, Math.floor(memory.rejectedCount ?? 0)),
            supersedes: this.normalizeStringArray(memory.supersedes),
            originMarkers: this.normalizeStringArray(memory.originMarkers)
        };
    }

    normalizeAll(memories: MemoryItem[]): MemoryItem[] {
        return memories.map(memory => this.normalize(memory));
    }

    recordAccess(memory: MemoryItem, now = new Date().toISOString()): MemoryItem {
        const normalized = this.normalize(memory);
        return {
            ...normalized,
            lastAccessedAt: now,
            accessCount: normalized.accessCount + 1,
            weight: Math.min(1, this.roundWeight(normalized.weight + 0.05))
        };
    }

    markStaleness(memories: MemoryItem[], now: Date = new Date()): MemoryItem[] {
        return memories.map(memory => {
            const normalized = this.normalize(memory);
            const staleStatus = this.detectStaleStatus(normalized, now);
            return {
                ...normalized,
                staleStatus
            };
        });
    }

    detectStaleStatus(memory: MemoryItem, now: Date = new Date()): MemoryItem['staleStatus'] {
        if (memory.status !== 'active') {
            return 'unknown';
        }
        const ageDays = this.ageDays(this.stalenessReferenceDate(memory), now);
        return ageDays > 180
            ? 'stale'
            : ageDays > 60
                ? 'possibly_stale'
                : 'fresh';
    }

    isStale(memory: MemoryItem, now: Date = new Date()): boolean {
        return this.detectStaleStatus(this.normalize(memory), now) === 'stale';
    }

    isExpired(memory: MemoryItem, now: Date = new Date()): boolean {
        if (memory.scope !== 'session' && memory.scope !== 'task') {
            return false;
        }
        if (!memory.expiresAt) {
            return false;
        }
        const expiresAt = Date.parse(memory.expiresAt);
        return !Number.isNaN(expiresAt) && expiresAt <= now.getTime();
    }

    isRetrievable(memory: MemoryItem, now: Date = new Date()): boolean {
        return !this.isExpired(this.normalize(memory), now);
    }

    decay(memories: MemoryItem[], now: Date = new Date()): MemoryItem[] {
        return memories.map(memory => {
            const normalized = this.normalize(memory);
            const ageDays = Math.max(0, this.ageDays(normalized.lastAccessedAt || normalized.updatedAt, now));
            const decayWindows = ageDays / 30;
            const rate = this.decayRate(normalized.importance);
            const floor = this.minimumWeight(normalized.importance);
            return {
                ...normalized,
                weight: this.roundWeight(Math.max(floor, normalized.weight * Math.pow(rate, decayWindows)))
            };
        });
    }

    prune(memories: MemoryItem[], now: Date = new Date(), minimumWeight = 0.15): MemoryItem[] {
        const decayed = this.decay(this.markStaleness(memories, now), now);
        return decayed.filter(memory => {
            if (memory.status === 'rejected' || memory.status === 'blocked') {
                return false;
            }
            if (memory.importance === 'critical') {
                return true;
            }
            return memory.staleStatus !== 'stale' || memory.weight >= minimumWeight;
        });
    }

    proposePruning(memories: MemoryItem[], now: Date = new Date(), minimumWeight = 0.15): MemoryPruningProposal[] {
        const normalized = this.decay(this.markStaleness(memories, now), now);
        const duplicateWinners = this.duplicateWinners(normalized);
        const proposals: MemoryPruningProposal[] = [];
        for (const memory of normalized) {
            if (memory.status === 'rejected' || memory.status === 'blocked') {
                continue;
            }
            const reasons: MemoryPruningReason[] = [];
            const duplicateOf = duplicateWinners.get(this.pruningDuplicateKey(memory));
            if (this.hasSensitiveContent(memory)) {
                reasons.push('sensitive');
            }
            if (duplicateOf && duplicateOf !== memory.id) {
                reasons.push('duplicate');
            }
            if (this.missingSource(memory)) {
                reasons.push('missing_source');
            }
            if (memory.importance !== 'critical' && memory.staleStatus === 'stale' && memory.weight < minimumWeight) {
                reasons.push('old');
            }
            if (this.oldCandidate(memory, now)) {
                reasons.push('old_candidate');
            }
            if (!reasons.length) {
                continue;
            }
            const uniqueReasons = [...new Set(reasons)];
            proposals.push({
                id: memory.id,
                scope: memory.scope,
                title: memory.title,
                action: uniqueReasons.includes('sensitive') ? 'remove' : 'archive',
                reasons: uniqueReasons,
                reviewRequired: true,
                evidence: this.pruningEvidence(memory, uniqueReasons, duplicateOf && duplicateOf !== memory.id ? duplicateOf : undefined),
                staleStatus: memory.staleStatus,
                importance: memory.importance,
                weight: memory.weight,
                lastAccessedAt: memory.lastAccessedAt,
                accessCount: memory.accessCount,
                duplicateOf: duplicateOf && duplicateOf !== memory.id ? duplicateOf : undefined
            });
        }
        return proposals.sort((left, right) => {
            const actionOrder = left.action.localeCompare(right.action);
            return actionOrder || left.title.localeCompare(right.title) || left.id.localeCompare(right.id);
        });
    }

    healthReport(memories: MemoryItem[], now: Date = new Date()): MemoryHealth {
        const rawGlobalWithWorkspace = memories.filter(memory => memory.scope === 'global' && this.normalizeOptionalString(memory.workspacePath)).length;
        const normalized = this.markStaleness(memories, now);
        const healthIssues = this.healthIssues(memories, normalized, now);
        const total = normalized.length;
        const byScope = {
            global: normalized.filter(memory => memory.scope === 'global').length,
            workspace: normalized.filter(memory => memory.scope === 'workspace').length,
            repository: normalized.filter(memory => memory.scope === 'repository').length,
            session: normalized.filter(memory => memory.scope === 'session').length,
            task: normalized.filter(memory => memory.scope === 'task').length
        };
        const active = normalized.filter(memory => memory.status === 'active').length;
        const stale = normalized.filter(memory => memory.staleStatus === 'stale').length;
        const possiblyStale = normalized.filter(memory => memory.staleStatus === 'possibly_stale').length;
        const unknown = normalized.filter(memory => memory.staleStatus === 'unknown').length;
        const critical = normalized.filter(memory => memory.importance === 'critical').length;
        const lowWeight = normalized.filter(memory => memory.weight < 0.2).length;
        const neverAccessed = normalized.filter(memory => memory.accessCount === 0).length;
        const averageWeight = total
            ? this.roundWeight(normalized.reduce((sum, memory) => sum + memory.weight, 0) / total)
            : 0;
        const oldestAccessedAt = normalized
            .map(memory => memory.lastAccessedAt)
            .filter(Boolean)
            .sort()[0];
        const staleCritical = normalized.some(memory => memory.importance === 'critical' && memory.staleStatus === 'stale');
        const sensitive = healthIssues.filter(issue => issue.kind === 'sensitive').length;
        const contradictions = healthIssues.filter(issue => issue.kind === 'contradiction').length;
        const duplicate = healthIssues.filter(issue => issue.kind === 'duplicate').length;
        const missingSource = healthIssues.filter(issue => issue.kind === 'missing_source').length;
        const oldCandidates = healthIssues.filter(issue => issue.kind === 'old_candidate').length;
        const status: MemoryHealth['status'] = sensitive > 0 || rawGlobalWithWorkspace > 0 || staleCritical || (total > 0 && stale / total > 0.3)
            ? 'critical'
            : stale > 0 || possiblyStale > 0 || lowWeight > 0 || duplicate > 0 || contradictions > 0 || missingSource > 0 || oldCandidates > 0
                ? 'attention'
                : 'healthy';
        return {
            status,
            summary: total
                ? `${active}/${total} active memories, ${stale} stale, ${healthIssues.length} health issues, average weight ${averageWeight}.`
                : 'No memories recorded.',
            total,
            byScope,
            active,
            stale,
            possiblyStale,
            unknown,
            critical,
            averageWeight,
            lowWeight,
            neverAccessed,
            oldestAccessedAt,
            duplicate,
            contradictions,
            missingSource,
            sensitive,
            globalWithWorkspace: rawGlobalWithWorkspace,
            oldCandidates,
            issues: healthIssues
        };
    }

    export(memories: MemoryItem[], workspacePath?: string): MemoryExport {
        return {
            exportedAt: new Date().toISOString(),
            workspacePath,
            memories: memories
                .filter(memory => !workspacePath || !memory.workspacePath || memory.workspacePath === workspacePath)
                .map(memory => this.normalize(memory))
        };
    }

    import(existing: MemoryItem[], payload: MemoryExport): MemoryImportResult {
        const byId = new Map(existing.map(memory => [memory.id, memory]));
        let imported = 0;
        let skipped = 0;
        for (const memory of payload.memories) {
            const current = byId.get(memory.id);
            if (current && current.updatedAt >= memory.updatedAt) {
                skipped++;
                continue;
            }
            byId.set(memory.id, {
                ...this.normalize(memory),
                workspacePath: memory.scope === 'global' ? undefined : memory.workspacePath ?? payload.workspacePath
            });
            imported++;
        }
        return {
            imported,
            skipped,
            memories: [...byId.values()].sort((left, right) => left.createdAt.localeCompare(right.createdAt))
        };
    }

    update(existing: MemoryItem, patch: Partial<MemoryItem>, now = new Date().toISOString()): MemoryItem {
        const normalized = this.normalize(existing);
        return this.normalize({
            ...normalized,
            ...patch,
            id: normalized.id,
            createdAt: normalized.createdAt,
            acceptedCount: patch.status === 'active' && normalized.status !== 'active'
                ? normalized.acceptedCount + 1
                : normalized.acceptedCount,
            rejectedCount: patch.status === 'rejected' && normalized.status !== 'rejected'
                ? normalized.rejectedCount + 1
                : normalized.rejectedCount,
            updatedAt: now
        });
    }

    dedupeKey(memory: Pick<MemoryItem, 'title' | 'content' | 'scope'> & Partial<Pick<MemoryItem, 'workspacePath'>>, workspaceKey: string | undefined): string {
        return [
            memory.scope,
            memory.scope === 'global' ? 'global' : workspaceKey ?? this.normalizeDedupeText(memory.workspacePath ?? ''),
            this.normalizeDedupeText(memory.title),
            this.normalizeDedupeText(memory.content)
        ].join(':');
    }

    protected ageDays(value: string, now: Date): number {
        const time = Date.parse(value);
        if (Number.isNaN(time)) {
            return Number.POSITIVE_INFINITY;
        }
        return (now.getTime() - time) / 86_400_000;
    }

    protected stalenessReferenceDate(memory: MemoryItem): string {
        const evidenceDate = this.latestDateFromText(`${memory.source ?? ''} ${memory.evidence ?? ''}`);
        return evidenceDate ?? memory.updatedAt;
    }

    protected latestDateFromText(text: string): string | undefined {
        const matches = text.match(/\b\d{4}-\d{2}-\d{2}(?:[T ][0-2]\d:[0-5]\d(?::[0-5]\d(?:\.\d{1,3})?)?(?:Z|[+-][0-2]\d:?[0-5]\d)?)?\b/g) ?? [];
        return matches
            .filter(value => !Number.isNaN(Date.parse(value)))
            .sort((left, right) => Date.parse(right) - Date.parse(left))[0];
    }

    protected normalizeImportance(value: MemoryImportance | undefined): MemoryImportance {
        switch (value) {
            case 'critical':
            case 'high':
            case 'medium':
            case 'low':
                return value;
            default:
                return 'medium';
        }
    }

    protected normalizeScopeFields(memory: Partial<MemoryItem> & Pick<MemoryItem, 'id'>): Pick<MemoryItem, 'scope' | 'workspacePath' | 'repositoryUrl' | 'repositoryId' | 'sessionId' | 'taskId' | 'expiresAt' | 'retentionPolicy'> {
        const workspacePath = this.normalizeOptionalString(memory.workspacePath);
        const repositoryUrl = this.normalizeOptionalString(memory.repositoryUrl);
        const repositoryId = this.normalizeOptionalString(memory.repositoryId);
        const sessionId = this.normalizeOptionalString(memory.sessionId);
        const taskId = this.normalizeOptionalString(memory.taskId);
        const expiresAt = this.normalizeOptionalString(memory.expiresAt);
        const retentionPolicy = memory.retentionPolicy;
        const scope = memory.scope ?? (workspacePath ? 'workspace' : 'global');

        switch (scope) {
            case 'global':
                return {
                    scope,
                    workspacePath: undefined,
                    repositoryUrl,
                    repositoryId,
                    sessionId,
                    taskId,
                    expiresAt,
                    retentionPolicy
                };
            case 'workspace':
                if (!workspacePath) {
                    throw new Error(`Workspace memory requires workspacePath: ${memory.id}`);
                }
                return {
                    scope,
                    workspacePath,
                    repositoryUrl,
                    repositoryId,
                    sessionId,
                    taskId,
                    expiresAt,
                    retentionPolicy
                };
            case 'repository':
                if (!repositoryUrl && !repositoryId) {
                    throw new Error(`Repository memory requires repositoryUrl or repositoryId: ${memory.id}`);
                }
                return {
                    scope,
                    workspacePath,
                    repositoryUrl,
                    repositoryId,
                    sessionId,
                    taskId,
                    expiresAt,
                    retentionPolicy
                };
            case 'session':
                if (!sessionId) {
                    throw new Error(`Session memory requires sessionId: ${memory.id}`);
                }
                return {
                    scope,
                    workspacePath,
                    repositoryUrl,
                    repositoryId,
                    sessionId,
                    taskId,
                    expiresAt,
                    retentionPolicy
                };
            case 'task':
                if (!taskId) {
                    throw new Error(`Task memory requires taskId: ${memory.id}`);
                }
                return {
                    scope,
                    workspacePath,
                    repositoryUrl,
                    repositoryId,
                    sessionId,
                    taskId,
                    expiresAt,
                    retentionPolicy
                };
            default:
                throw new Error(`Unsupported memory scope: ${String(scope)}`);
        }
    }

    protected normalizeWeight(value: number | undefined, importance: MemoryImportance): number {
        if (typeof value === 'number' && Number.isFinite(value)) {
            return this.roundWeight(Math.min(1, Math.max(0, value)));
        }
        switch (importance) {
            case 'critical':
                return 1;
            case 'high':
                return 0.85;
            case 'low':
                return 0.35;
            case 'medium':
            default:
                return 0.6;
        }
    }

    protected decayRate(importance: MemoryImportance): number {
        switch (importance) {
            case 'critical':
                return 0.98;
            case 'high':
                return 0.93;
            case 'low':
                return 0.72;
            case 'medium':
            default:
                return 0.85;
        }
    }

    protected minimumWeight(importance: MemoryImportance): number {
        switch (importance) {
            case 'critical':
                return 0.75;
            case 'high':
                return 0.5;
            case 'low':
                return 0.05;
            case 'medium':
            default:
                return 0.2;
        }
    }

    protected roundWeight(value: number): number {
        return Math.round(value * 10_000) / 10_000;
    }

    protected normalizeDedupeText(value: string): string {
        return value
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();
    }

    protected normalizeOptionalString(value: string | undefined): string | undefined {
        const normalized = value?.trim();
        return normalized ? normalized : undefined;
    }

    protected normalizeStringArray(value: readonly string[] | undefined): string[] | undefined {
        const normalized = [...new Set((value ?? [])
            .map(item => item.trim())
            .filter(Boolean))];
        return normalized.length ? normalized : undefined;
    }

    protected duplicateWinners(memories: MemoryItem[]): Map<string, string> {
        const winners = new Map<string, MemoryItem>();
        for (const memory of memories) {
            const key = this.pruningDuplicateKey(memory);
            const current = winners.get(key);
            if (!current || this.memoryPriority(memory) > this.memoryPriority(current)) {
                winners.set(key, memory);
            }
        }
        return new Map([...winners.entries()].map(([key, memory]) => [key, memory.id]));
    }

    protected pruningDuplicateKey(memory: MemoryItem): string {
        return [
            memory.scope,
            memory.repositoryId ?? memory.repositoryUrl ?? memory.workspacePath ?? memory.sessionId ?? memory.taskId ?? 'global',
            this.normalizeDedupeText(memory.title),
            this.normalizeDedupeText(memory.content)
        ].join(':');
    }

    protected memoryPriority(memory: MemoryItem): number {
        const access = Math.min(100, memory.accessCount) / 100;
        const updated = Date.parse(memory.updatedAt);
        return memory.weight + access + (Number.isNaN(updated) ? 0 : updated / 10_000_000_000_000);
    }

    protected hasSensitiveContent(memory: MemoryItem): boolean {
        return this.secretScanner.scan({
            content: `${memory.title}\n${memory.content}`,
            sourceUri: memory.source
        }).findings.length > 0;
    }

    protected missingSource(memory: MemoryItem): boolean {
        return memory.status === 'active' && !this.normalizeOptionalString(memory.source) && !this.normalizeOptionalString(memory.evidence);
    }

    protected pruningEvidence(memory: MemoryItem, reasons: MemoryPruningReason[], duplicateOf?: string): string {
        const details = reasons.map(reason => {
            switch (reason) {
                case 'sensitive':
                    return 'secret scanner matched memory title/content';
                case 'duplicate':
                    return `same normalized scope/title/content as ${duplicateOf}`;
                case 'missing_source':
                    return 'active memory has no source or evidence';
                case 'old':
                    return `stale memory weight ${memory.weight} is below pruning threshold`;
                case 'global_with_workspace':
                    return 'global memory has a workspacePath locator';
                case 'old_candidate':
                    return 'candidate has been waiting for review for more than 30 days';
            }
        });
        return details.join('; ');
    }

    protected healthIssues(rawMemories: MemoryItem[], normalized: MemoryItem[], now: Date): MemoryHealth['issues'] {
        const issues: MemoryHealth['issues'] = [];
        const duplicateWinners = this.duplicateWinners(normalized);
        const contradictionWinners = new Set<string>();
        for (const memory of normalized) {
            const duplicateOf = duplicateWinners.get(this.pruningDuplicateKey(memory));
            if (duplicateOf && duplicateOf !== memory.id) {
                issues.push(this.healthIssue(memory, 'duplicate', `same normalized scope/title/content as ${duplicateOf}`, duplicateOf));
            }
            if (this.missingSource(memory)) {
                issues.push(this.healthIssue(memory, 'missing_source', 'active memory has no source or evidence'));
            }
            if (this.hasSensitiveContent(memory)) {
                issues.push(this.healthIssue(memory, 'sensitive', 'secret scanner matched memory title/content'));
            }
            if (this.oldCandidate(memory, now)) {
                issues.push(this.healthIssue(memory, 'old_candidate', 'candidate has been waiting for review for more than 30 days'));
            }
            if (memory.weight < 0.2) {
                issues.push(this.healthIssue(memory, 'low_weight', `memory weight ${memory.weight} is below health threshold 0.2`));
            }
            if (memory.accessCount === 0) {
                issues.push(this.healthIssue(memory, 'never_accessed', 'memory has never been used in retrieval or context workflows'));
            }
        }
        rawMemories
            .filter(memory => memory.scope === 'global' && this.normalizeOptionalString(memory.workspacePath))
            .forEach(memory => issues.push(this.healthIssue(memory, 'global_with_workspace', 'global memory has a workspacePath locator')));
        for (const [left, right] of this.contradictoryPairs(normalized)) {
            const key = [left.id, right.id].sort().join(':');
            if (!contradictionWinners.has(key)) {
                contradictionWinners.add(key);
                issues.push(this.healthIssue(left, 'contradiction', `opposite polarity overlaps with ${right.id}`, right.id));
            }
        }
        return issues.sort((left, right) => left.kind.localeCompare(right.kind) || left.title.localeCompare(right.title) || left.memoryId.localeCompare(right.memoryId));
    }

    protected healthIssue(memory: MemoryItem, kind: MemoryHealth['issues'][number]['kind'], evidence: string, relatedMemoryId?: string): MemoryHealth['issues'][number] {
        return {
            kind,
            memoryId: memory.id,
            title: memory.title,
            scope: memory.scope,
            evidence,
            relatedMemoryId
        };
    }

    protected oldCandidate(memory: MemoryItem, now: Date): boolean {
        return memory.status === 'candidate' && this.ageDays(memory.updatedAt || memory.createdAt, now) > 30;
    }

    protected contradictoryPairs(memories: MemoryItem[]): Array<[MemoryItem, MemoryItem]> {
        const active = memories.filter(memory => memory.status === 'active' || memory.status === 'candidate');
        const pairs: Array<[MemoryItem, MemoryItem]> = [];
        for (let leftIndex = 0; leftIndex < active.length; leftIndex++) {
            for (let rightIndex = leftIndex + 1; rightIndex < active.length; rightIndex++) {
                const left = active[leftIndex];
                const right = active[rightIndex];
                if (this.memoryScopeLocator(left) === this.memoryScopeLocator(right) && this.contradictionSubject(left) === this.contradictionSubject(right) && this.polarity(left) * this.polarity(right) < 0) {
                    pairs.push([left, right]);
                }
            }
        }
        return pairs;
    }

    protected contradictionSubject(memory: MemoryItem): string {
        return this.normalizeDedupeText(memory.title)
            .replace(/\b(do not|dont|don't|never|avoid|no|not|disable|disabled|without|must not|should not|required|require|use|enable|enabled|with|must|should)\b/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    protected polarity(memory: MemoryItem): number {
        const text = this.normalizeDedupeText(`${memory.title} ${memory.content}`);
        const negative = /\b(do not|dont|don't|never|avoid|no|not|disable|disabled|without|must not|should not)\b/.test(text);
        const positive = /\b(required|require|use|enable|enabled|with|must|should)\b/.test(text);
        return negative ? -1 : positive ? 1 : 0;
    }

    protected memoryScopeLocator(memory: MemoryItem): string {
        return [
            memory.scope,
            memory.repositoryId ?? memory.repositoryUrl ?? memory.workspacePath ?? memory.sessionId ?? memory.taskId ?? 'global'
        ].join(':');
    }
}

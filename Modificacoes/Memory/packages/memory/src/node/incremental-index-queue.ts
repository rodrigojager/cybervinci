// *****************************************************************************
// Copyright (C) 2026.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { MemoryIndexRequest, MemoryIndexResult } from '../common';

export interface IncrementalIndexQueueOptions {
    debounceMs?: number;
    maxFilesPerRun?: number;
    maxConcurrentRuns?: number;
    audit?: IncrementalIndexQueueAuditSink;
}

export interface IncrementalIndexQueueStatus {
    workspacePath: string;
    pending: boolean;
    running: boolean;
    pendingCount: number;
    activeRuns: number;
    maxConcurrentRuns: number;
    lastEnqueuedAt?: string;
    lastStartedAt?: string;
    lastFinishedAt?: string;
    lastError?: string;
}

interface WorkspaceQueueState {
    pending?: MemoryIndexRequest;
    pendingCount: number;
    running: boolean;
    timer?: ReturnType<typeof setTimeout>;
    lastEnqueuedAt?: string;
    lastStartedAt?: string;
    lastFinishedAt?: string;
    lastError?: string;
    waiters: Array<{
        resolve: (result: MemoryIndexResult) => void;
        reject: (error: unknown) => void;
    }>;
    runningWaiters: Array<{
        resolve: (result: MemoryIndexResult) => void;
        reject: (error: unknown) => void;
    }>;
}

export type IncrementalIndexWorker = (request: MemoryIndexRequest) => Promise<MemoryIndexResult>;

export interface IncrementalIndexQueueAuditSink {
    completed?(event: IncrementalIndexQueueCompletedAuditEvent): Promise<void> | void;
    failed?(event: IncrementalIndexQueueFailedAuditEvent): Promise<void> | void;
}

export interface IncrementalIndexQueueCompletedAuditEvent {
    request: MemoryIndexRequest;
    result: MemoryIndexResult;
    startedAt: string;
    finishedAt: string;
    durationMs: number;
}

export interface IncrementalIndexQueueFailedAuditEvent {
    request: MemoryIndexRequest;
    error: unknown;
    startedAt: string;
    finishedAt: string;
    durationMs: number;
}

export class IncrementalIndexQueue {

    protected readonly states = new Map<string, WorkspaceQueueState>();
    protected readonly debounceMs: number;
    protected readonly maxFilesPerRun: number | undefined;
    protected readonly maxConcurrentRuns: number;
    protected readonly audit: IncrementalIndexQueueAuditSink | undefined;
    protected activeRuns = 0;
    protected readonly readyWorkspaces: string[] = [];

    constructor(
        protected readonly worker: IncrementalIndexWorker,
        options: IncrementalIndexQueueOptions = {}
    ) {
        this.debounceMs = options.debounceMs ?? 750;
        this.maxFilesPerRun = options.maxFilesPerRun;
        this.maxConcurrentRuns = Math.max(1, Math.floor(options.maxConcurrentRuns ?? 1));
        this.audit = options.audit;
    }

    enqueue(request: MemoryIndexRequest): Promise<MemoryIndexResult> {
        const workspacePath = this.normalizeWorkspacePath(request.workspacePath);
        const state = this.state(workspacePath);
        state.pending = this.mergeRequests(state.pending, { ...request, workspacePath });
        state.pendingCount++;
        state.lastEnqueuedAt = new Date().toISOString();
        state.lastError = undefined;
        if (state.timer) {
            clearTimeout(state.timer);
        }
        const promise = new Promise<MemoryIndexResult>((resolve, reject) => state.waiters.push({ resolve, reject }));
        state.timer = setTimeout(() => {
            state.timer = undefined;
            this.drain(workspacePath).catch(error => this.rejectWaiters(workspacePath, error));
        }, this.debounceMs);
        state.timer.unref?.();
        return promise;
    }

    status(workspacePath?: string): IncrementalIndexQueueStatus[] {
        const entries = workspacePath
            ? [[this.normalizeWorkspacePath(workspacePath), this.states.get(this.normalizeWorkspacePath(workspacePath))] as const]
            : [...this.states.entries()];
        return entries
            .filter((entry): entry is readonly [string, WorkspaceQueueState] => !!entry[1])
            .map(([key, state]) => ({
                workspacePath: key,
                pending: !!state.pending || !!state.timer,
                running: state.running,
                pendingCount: state.pendingCount,
                activeRuns: this.activeRuns,
                maxConcurrentRuns: this.maxConcurrentRuns,
                lastEnqueuedAt: state.lastEnqueuedAt,
                lastStartedAt: state.lastStartedAt,
                lastFinishedAt: state.lastFinishedAt,
                lastError: state.lastError
            }));
    }

    protected async drain(workspacePath: string): Promise<void> {
        const state = this.state(workspacePath);
        if (state.running) {
            return;
        }
        const request = state.pending;
        if (!request) {
            this.cleanup(workspacePath);
            return;
        }
        if (this.activeRuns >= this.maxConcurrentRuns) {
            this.markReady(workspacePath);
            return;
        }
        state.pending = undefined;
        state.pendingCount = 0;
        state.running = true;
        this.activeRuns++;
        state.runningWaiters = state.waiters.splice(0);
        state.lastStartedAt = new Date().toISOString();
        const startedAtMs = Date.now();
        try {
            const result = await this.worker(request);
            state.lastFinishedAt = new Date().toISOString();
            await this.auditCompleted({
                request,
                result,
                startedAt: state.lastStartedAt,
                finishedAt: state.lastFinishedAt,
                durationMs: Date.now() - startedAtMs
            });
            const waiters = state.runningWaiters.splice(0);
            waiters.forEach(waiter => waiter.resolve(result));
        } catch (error) {
            state.lastError = error instanceof Error ? error.message : String(error);
            const finishedAt = new Date().toISOString();
            state.lastFinishedAt = finishedAt;
            await this.auditFailed({
                request,
                error,
                startedAt: state.lastStartedAt,
                finishedAt,
                durationMs: Date.now() - startedAtMs
            });
            this.rejectWaiters(workspacePath, error);
        } finally {
            state.running = false;
            this.activeRuns = Math.max(0, this.activeRuns - 1);
            if (state.pending) {
                this.markReady(workspacePath);
            } else {
                this.cleanup(workspacePath);
            }
            this.pumpReadyWorkspaces();
        }
    }

    protected pumpReadyWorkspaces(): void {
        while (this.activeRuns < this.maxConcurrentRuns && this.readyWorkspaces.length) {
            const workspacePath = this.readyWorkspaces.shift()!;
            const state = this.states.get(workspacePath);
            if (!state?.pending || state.running) {
                continue;
            }
            this.drain(workspacePath).catch(error => this.rejectWaiters(workspacePath, error));
        }
    }

    protected markReady(workspacePath: string): void {
        if (!this.readyWorkspaces.includes(workspacePath)) {
            this.readyWorkspaces.push(workspacePath);
        }
    }

    protected mergeRequests(previous: MemoryIndexRequest | undefined, next: MemoryIndexRequest): MemoryIndexRequest {
        if (!previous) {
            return this.withQueueLimits(next);
        }
        return this.withQueueLimits({
            ...previous,
            ...next,
            scope: this.broaderScope(previous.scope, next.scope),
            maxFiles: this.minDefined(previous.maxFiles, next.maxFiles),
            changedRelativePaths: this.mergeIds(previous.changedRelativePaths, next.changedRelativePaths),
            backfillMemories: previous.backfillMemories === true || next.backfillMemories === true,
            refreshExternalDocs: previous.refreshExternalDocs === true || next.refreshExternalDocs === true,
            externalDocCollectionIds: this.mergeIds(previous.externalDocCollectionIds, next.externalDocCollectionIds)
        });
    }

    protected broaderScope(left: MemoryIndexRequest['scope'], right: MemoryIndexRequest['scope']): MemoryIndexRequest['scope'] {
        const rank = new Map<MemoryIndexRequest['scope'], number>([
            ['changed-files', 0],
            ['local-docs', 1],
            ['workspace', 2]
        ]);
        const leftScope = left ?? 'changed-files';
        const rightScope = right ?? 'changed-files';
        return (rank.get(rightScope) ?? 0) > (rank.get(leftScope) ?? 0) ? rightScope : leftScope;
    }

    protected minDefined(left: number | undefined, right: number | undefined): number | undefined {
        if (left === undefined) {
            return right;
        }
        if (right === undefined) {
            return left;
        }
        return Math.min(left, right);
    }

    protected mergeIds(left: string[] | undefined, right: string[] | undefined): string[] | undefined {
        if (!left?.length) {
            return right;
        }
        if (!right?.length) {
            return left;
        }
        return [...new Set([...left, ...right])];
    }

    protected withQueueLimits(request: MemoryIndexRequest): MemoryIndexRequest {
        if (request.maxFiles !== undefined || this.maxFilesPerRun === undefined) {
            return request;
        }
        return { ...request, maxFiles: this.maxFilesPerRun };
    }

    protected state(workspacePath: string): WorkspaceQueueState {
        const existing = this.states.get(workspacePath);
        if (existing) {
            return existing;
        }
        const created: WorkspaceQueueState = {
            pendingCount: 0,
            running: false,
            waiters: [],
            runningWaiters: []
        };
        this.states.set(workspacePath, created);
        return created;
    }

    protected rejectWaiters(workspacePath: string, error: unknown): void {
        const state = this.states.get(workspacePath);
        if (!state) {
            return;
        }
        const waiters = [...state.runningWaiters.splice(0), ...state.waiters.splice(0)];
        waiters.forEach(waiter => waiter.reject(error));
    }

    protected async auditCompleted(event: IncrementalIndexQueueCompletedAuditEvent): Promise<void> {
        try {
            await this.audit?.completed?.(event);
        } catch {
            // Audit failures must not make an indexing run look failed.
        }
    }

    protected async auditFailed(event: IncrementalIndexQueueFailedAuditEvent): Promise<void> {
        try {
            await this.audit?.failed?.(event);
        } catch {
            // Preserve the original indexing failure for callers.
        }
    }

    protected cleanup(workspacePath: string): void {
        const state = this.states.get(workspacePath);
        if (!state || state.running || state.pending || state.timer) {
            return;
        }
        if (!state.waiters.length && !state.runningWaiters.length) {
            this.states.delete(workspacePath);
        }
    }

    protected normalizeWorkspacePath(workspacePath: string): string {
        return workspacePath.replace(/\\/g, '/').replace(/\/+$/, '');
    }
}

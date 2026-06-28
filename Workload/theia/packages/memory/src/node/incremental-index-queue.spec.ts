// *****************************************************************************
// Copyright (C) 2026.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { expect } from 'chai';
import { MemoryIndexRequest, MemoryIndexResult } from '../common';
import { IncrementalIndexQueue } from './incremental-index-queue';

describe('IncrementalIndexQueue', () => {

    it('debounces and coalesces indexing requests per workspace', async () => {
        const requests: MemoryIndexRequest[] = [];
        const queue = new IncrementalIndexQueue(async request => {
            requests.push(request);
            return resultFixture(request);
        }, { debounceMs: 5, maxFilesPerRun: 25 });

        const first = queue.enqueue({ workspacePath: 'C:\\workspace', scope: 'changed-files', changedRelativePaths: ['src/a.ts'] });
        const second = queue.enqueue({ workspacePath: 'C:/workspace/', scope: 'workspace', externalDocCollectionIds: ['sdk'] });
        const third = queue.enqueue({ workspacePath: 'C:/workspace', scope: 'local-docs', changedRelativePaths: ['src/b.ts'], refreshExternalDocs: true });
        const results = await Promise.all([first, second, third]);

        expect(requests).to.have.length(1);
        expect(requests[0]).to.include({
            workspacePath: 'C:/workspace',
            scope: 'workspace',
            maxFiles: 25,
            refreshExternalDocs: true
        });
        expect(requests[0].changedRelativePaths).to.deep.equal(['src/a.ts', 'src/b.ts']);
        expect(requests[0].externalDocCollectionIds).to.deep.equal(['sdk']);
        expect(results.map(result => result.workspacePath)).to.deep.equal(['C:/workspace', 'C:/workspace', 'C:/workspace']);
        expect(queue.status('C:/workspace')).to.deep.equal([]);
    });

    it('keeps different workspaces independent', async () => {
        const requests: string[] = [];
        const queue = new IncrementalIndexQueue(async request => {
            requests.push(request.workspacePath);
            return resultFixture(request);
        }, { debounceMs: 5 });

        await Promise.all([
            queue.enqueue({ workspacePath: 'C:/one' }),
            queue.enqueue({ workspacePath: 'C:/two' })
        ]);

        expect(requests.sort()).to.deep.equal(['C:/one', 'C:/two']);
    });

    it('runs a second batch after the active batch when more changes arrive', async () => {
        const requests: MemoryIndexRequest[] = [];
        let releaseFirstRun: (() => void) | undefined;
        let markFirstRunStarted: (() => void) | undefined;
        const firstRunStarted = new Promise<void>(resolve => {
            markFirstRunStarted = resolve;
        });
        const queue = new IncrementalIndexQueue(async request => {
            requests.push(request);
            if (requests.length === 1) {
                markFirstRunStarted?.();
                await new Promise<void>(release => {
                    releaseFirstRun = release;
                });
            }
            return resultFixture(request);
        }, { debounceMs: 5 });
        const first = queue.enqueue({ workspacePath: 'C:/workspace', scope: 'changed-files' });

        await firstRunStarted;
        const second = queue.enqueue({ workspacePath: 'C:/workspace', scope: 'local-docs' });
        releaseFirstRun?.();
        await Promise.all([first, second]);

        expect(requests.map(request => request.scope)).to.deep.equal(['changed-files', 'local-docs']);
    });

    it('limits concurrent indexing runs across workspaces', async () => {
        const started: string[] = [];
        const finished: string[] = [];
        const releases = new Map<string, () => void>();
        const queue = new IncrementalIndexQueue(async request => {
            started.push(request.workspacePath);
            await new Promise<void>(resolve => releases.set(request.workspacePath, resolve));
            finished.push(request.workspacePath);
            return resultFixture(request);
        }, { debounceMs: 5, maxConcurrentRuns: 1 });

        const first = queue.enqueue({ workspacePath: 'C:/one' });
        const second = queue.enqueue({ workspacePath: 'C:/two' });

        await waitUntil(() => started.length === 1);
        expect(started).to.deep.equal(['C:/one']);
        expect(queue.status()).to.deep.include({
            workspacePath: 'C:/one',
            pending: false,
            running: true,
            pendingCount: 0,
            activeRuns: 1,
            maxConcurrentRuns: 1,
            lastEnqueuedAt: queue.status('C:/one')[0].lastEnqueuedAt,
            lastStartedAt: queue.status('C:/one')[0].lastStartedAt,
            lastFinishedAt: undefined,
            lastError: undefined
        });

        releases.get('C:/one')?.();
        await waitUntil(() => started.length === 2);
        expect(started).to.deep.equal(['C:/one', 'C:/two']);
        expect(finished).to.deep.equal(['C:/one']);

        releases.get('C:/two')?.();
        await Promise.all([first, second]);
        expect(finished).to.deep.equal(['C:/one', 'C:/two']);
    });

    it('emits a local audit event when incremental indexing completes', async () => {
        const completed: unknown[] = [];
        const queue = new IncrementalIndexQueue(async request => resultFixture(request), {
            debounceMs: 5,
            audit: {
                completed: event => {
                    completed.push(event);
                }
            }
        });

        await queue.enqueue({ workspacePath: 'C:/workspace', scope: 'changed-files', changedRelativePaths: ['src/a.ts'] });

        expect(completed).to.have.length(1);
        expect(completed[0]).to.deep.include({
            durationMs: (completed[0] as { durationMs: number }).durationMs,
            startedAt: (completed[0] as { startedAt: string }).startedAt,
            finishedAt: (completed[0] as { finishedAt: string }).finishedAt
        });
        expect((completed[0] as { request: MemoryIndexRequest }).request).to.include({
            workspacePath: 'C:/workspace',
            scope: 'changed-files'
        });
        expect((completed[0] as { result: MemoryIndexResult }).result.indexedFileCount).to.equal(1);
    });

    it('emits a local audit event when incremental indexing fails', async () => {
        const failed: unknown[] = [];
        const failure = new Error('Indexer failed.');
        const queue = new IncrementalIndexQueue(async () => {
            throw failure;
        }, {
            debounceMs: 5,
            audit: {
                failed: event => {
                    failed.push(event);
                }
            }
        });

        let rejected: unknown;
        try {
            await queue.enqueue({ workspacePath: 'C:/workspace', scope: 'changed-files' });
        } catch (error) {
            rejected = error;
        }

        expect(rejected).to.equal(failure);
        expect(failed).to.have.length(1);
        expect((failed[0] as { request: MemoryIndexRequest }).request.workspacePath).to.equal('C:/workspace');
        expect((failed[0] as { error: unknown }).error).to.equal(failure);
        expect((failed[0] as { durationMs: number }).durationMs).to.be.greaterThanOrEqual(0);
    });

    it('does not fail indexing when local audit recording fails', async () => {
        const queue = new IncrementalIndexQueue(async request => resultFixture(request), {
            debounceMs: 5,
            audit: {
                completed: () => {
                    throw new Error('Audit store unavailable.');
                }
            }
        });

        const result = await queue.enqueue({ workspacePath: 'C:/workspace', scope: 'changed-files' });

        expect(result.workspacePath).to.equal('C:/workspace');
    });
});

async function waitUntil(predicate: () => boolean): Promise<void> {
    const startedAt = Date.now();
    while (!predicate()) {
        if (Date.now() - startedAt > 1000) {
            throw new Error('Timed out waiting for condition.');
        }
        await new Promise(resolve => setTimeout(resolve, 5));
    }
}

function resultFixture(request: MemoryIndexRequest): MemoryIndexResult {
    return {
        workspacePath: request.workspacePath,
        fileCount: 1,
        changedFileCount: 1,
        indexedFileCount: 1,
        preservedChunkCount: 0,
        indexedChunkCount: 1,
        refreshedExternalDocCollectionCount: 0,
        backfillScope: request.scope ?? 'changed-files',
        symbolCount: 0,
        relationCount: 0,
        sensitiveFileCount: 0,
        indexingLatency: {
            workspacePath: request.workspacePath,
            indexedAt: '2026-01-01T00:00:00.000Z',
            durationMs: 1,
            fileCount: 1,
            indexedFileCount: 1,
            indexedChunkCount: 1,
            ignoredFileCount: 0,
            sensitiveFileCount: 0,
            largeFileCount: 0,
            generatedFileCount: 0,
            binaryFileCount: 0,
            multiLanguageFileCount: 0,
            languageCount: 1,
            filesPerSecond: 1,
            indexedFilesPerSecond: 1,
            chunksPerSecond: 1,
            ignoredBreakdown: {
                gitignore: 0,
                cvignore: 0,
                cybervinciignore: 0,
                denylist: 0,
                allowlist: 0,
                size: 0,
                secret: 0,
                sensitive: 0,
                large: 0,
                generated: 0,
                binary: 0
            },
            languageBreakdown: {},
            status: 'passed',
            summary: 'Indexed 1 file.'
        },
        indexedAt: '2026-01-01T00:00:00.000Z'
    };
}

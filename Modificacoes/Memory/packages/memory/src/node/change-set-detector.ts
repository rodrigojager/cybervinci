// *****************************************************************************
// Copyright (C) 2026.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { execFile } from 'child_process';
import { promisify } from 'util';
import {
    MemoryChangeSetRequest,
    MemoryChangeSetResult,
    MemoryEvent
} from '../common';

const execFileAsync = promisify(execFile);

export class ChangeSetDetector {

    async detect(request: MemoryChangeSetRequest): Promise<MemoryChangeSetResult> {
        const diagnostics: string[] = [];
        const gitPaths = await this.detectFromGit(request, diagnostics);
        if (gitPaths.length) {
            return {
                workspacePath: request.workspacePath,
                changedFilePaths: gitPaths,
                source: 'git-diff',
                diagnostics
            };
        }
        const eventPaths = this.detectFromEvents(request.events ?? [], request);
        return {
            workspacePath: request.workspacePath,
            changedFilePaths: eventPaths,
            source: eventPaths.length ? 'file-events' : 'none',
            diagnostics
        };
    }

    protected async detectFromGit(request: MemoryChangeSetRequest, diagnostics: string[]): Promise<string[]> {
        try {
            const paths = request.baseRef || request.compareRef
                ? await this.detectCommitRange(request)
                : await this.detectWorkingTree(request);
            return this.normalizePaths(paths);
        } catch (error) {
            diagnostics.push(error instanceof Error ? error.message : String(error));
            return [];
        }
    }

    protected async detectCommitRange(request: MemoryChangeSetRequest): Promise<string[]> {
        const range = request.baseRef && request.compareRef
            ? `${request.baseRef}...${request.compareRef}`
            : `${request.baseRef ?? 'HEAD'}...HEAD`;
        return this.gitDiff(request.workspacePath, ['diff', '--name-only', '--diff-filter=ACMRTUXB', range]);
    }

    protected async detectWorkingTree(request: MemoryChangeSetRequest): Promise<string[]> {
        const [unstaged, staged, untracked] = await Promise.all([
            this.gitDiff(request.workspacePath, ['diff', '--name-only', '--diff-filter=ACMRTUXB']),
            this.gitDiff(request.workspacePath, ['diff', '--cached', '--name-only', '--diff-filter=ACMRTUXB']),
            request.includeUntracked === false
                ? Promise.resolve([])
                : this.gitDiff(request.workspacePath, ['ls-files', '--others', '--exclude-standard'])
        ]);
        return [...unstaged, ...staged, ...untracked];
    }

    protected async gitDiff(workspacePath: string, args: string[]): Promise<string[]> {
        const { stdout } = await execFileAsync('git', args, {
            cwd: workspacePath,
            windowsHide: true,
            maxBuffer: 512_000
        });
        return stdout.split(/\r?\n/).filter(Boolean);
    }

    protected detectFromEvents(events: readonly MemoryEvent[], request: MemoryChangeSetRequest): string[] {
        const since = request.since ? Date.parse(request.since) : undefined;
        const paths = events
            .filter(event => this.isFileChangeEvent(event) && event.relativePath)
            .filter(event => this.sameWorkspace(event.workspacePath, request.workspacePath))
            .filter(event => since === undefined || Date.parse(event.createdAt) >= since)
            .flatMap(event => this.relativePathsFromFileChangeEvent(event));
        return this.normalizePaths(paths);
    }

    protected isFileChangeEvent(event: MemoryEvent): boolean {
        return event.eventType === 'file.created'
            || event.eventType === 'file.edited'
            || event.eventType === 'file.deleted'
            || event.eventType === 'file.renamed';
    }

    protected relativePathsFromFileChangeEvent(event: MemoryEvent): string[] {
        const paths = [event.relativePath as string];
        if (event.eventType === 'file.renamed') {
            const previousPath = this.previousRelativePathFromEvent(event);
            if (previousPath) {
                paths.push(previousPath);
            }
        }
        return paths;
    }

    protected previousRelativePathFromEvent(event: MemoryEvent): string | undefined {
        if (!event.payload) {
            return undefined;
        }
        try {
            const payload = JSON.parse(event.payload) as { fromRelativePath?: unknown };
            return typeof payload.fromRelativePath === 'string' ? payload.fromRelativePath : undefined;
        } catch {
            return undefined;
        }
    }

    protected sameWorkspace(left: string, right: string): boolean {
        return left.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase() === right.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
    }

    protected normalizePaths(paths: readonly string[]): string[] {
        const seen = new Set<string>();
        const normalized: string[] = [];
        for (const rawPath of paths) {
            const path = rawPath.trim().replace(/\\/g, '/');
            const key = path.toLowerCase();
            if (!path || seen.has(key)) {
                continue;
            }
            seen.add(key);
            normalized.push(path);
        }
        return normalized.sort((left, right) => left.localeCompare(right));
    }
}

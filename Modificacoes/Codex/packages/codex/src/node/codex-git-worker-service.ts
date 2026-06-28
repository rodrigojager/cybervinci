// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { inject, injectable } from '@theia/core/shared/inversify';
import * as fs from 'fs/promises';
import * as path from 'path';
import { promisify } from 'util';
import { execFile } from 'child_process';
import { parseCodexRpcParams } from '../common/codex-host-protocol';
import {
    CodexWorkerRequest,
    CodexWorkerResponseBody,
    codexWorkerError,
    codexWorkerOk
} from '../common/codex-worker-protocol';
import { CodexGitWorktreeService } from './codex-git-worktree-service';

const execFileAsync = promisify(execFile);

interface CodexGitCommandResult {
    success: boolean;
    stdout: string;
    stderr: string;
    error?: string;
}

interface CodexDiffFileSummary {
    path: string;
    previousPath: string | null;
    changeKind: string;
    additions: number | null;
    deletions: number | null;
    revision: string;
}

const EMPTY_DIFF_STATS = {
    filesChanged: 0,
    linesAdded: 0,
    linesRemoved: 0
};

@injectable()
export class CodexGitWorkerService {

    @inject(CodexGitWorktreeService)
    protected readonly worktrees: CodexGitWorktreeService;

    async handleRequest(request: CodexWorkerRequest): Promise<CodexWorkerResponseBody> {
        try {
            const value = await this.invokeMethod(request.method, request.params);
            return {
                id: request.id,
                method: request.method,
                result: codexWorkerOk(value)
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return {
                id: request.id,
                method: request.method,
                result: codexWorkerError(message)
            };
        }
    }

    handleCancel(_requestId: string | number): void {
        // git worker operations are short-lived; nothing to cancel
    }

    protected async invokeMethod(method: string, params: unknown): Promise<unknown> {
        const record = parseCodexRpcParams(params);
        const cwd = this.extractString(record, ['cwd', 'root', 'gitRoot']) ?? process.cwd();
        switch (method) {
            case 'stable-metadata':
                return this.stableMetadata(cwd);
            case 'list-worktrees':
                return { worktrees: await this.worktrees.listWorktrees(cwd) };
            case 'codex-worktrees':
                return this.worktrees.codexWorktrees(cwd);
            case 'current-branch':
                return { branch: await this.currentBranch(cwd) };
            case 'default-branch':
                return { branch: await this.defaultBranch(cwd) };
            case 'base-branch':
                return { branch: await this.baseBranch(cwd) };
            case 'upstream-branch':
                return { branch: await this.upstreamBranch(cwd) };
            case 'branch-ahead-count':
                return this.branchAheadCount(cwd);
            case 'recent-branches':
                return { branches: await this.recentBranches(cwd, this.extractLimit(record, 10, 100)) };
            case 'branch-exists':
                return { exists: await this.branchExists(cwd, this.extractString(record, ['branch', 'branchName', 'ref']) ?? '') };
            case 'branch-commits':
                return { commits: await this.branchCommits(cwd, record) };
            case 'search-branches':
                return {
                    branches: await this.searchBranches(
                        cwd,
                        this.extractString(record, ['query', 'search', 'prefix']) ?? '',
                        this.extractLimit(record, 20, 100)
                    )
                };
            case 'nearest-ancestor-branch':
                return {
                    branch: await this.nearestAncestorBranch(
                        cwd,
                        this.extractStringArray(record.candidates),
                        this.extractString(record, ['currentBranch', 'branch']) ?? await this.currentBranch(cwd)
                    )
                };
            case 'branch-metadata':
                return this.branchMetadata(cwd);
            case 'status-summary':
                return this.statusSummary(cwd);
            case 'branch-diff-stats':
                return this.branchDiffStats(cwd, record);
            case 'review-summary':
                return this.reviewSummary(cwd, record, true);
            case 'review-path-summary':
                return this.reviewSummary(cwd, record, false);
            case 'review-diff':
                return this.reviewDiff(cwd, record);
            case 'review-search':
                return this.reviewSearch(cwd, record);
            case 'review-patch':
                return this.reviewPatch(cwd, record);
            case 'commit-message-diff':
                return this.commitMessageDiff(cwd, record);
            case 'submodule-paths':
                return { paths: await this.submodulePaths(cwd) };
            case 'cat-file':
                return this.catFile(cwd, record);
            case 'blame-file':
                return this.blameFile(cwd, record);
            case 'synced-branch':
                return {
                    branch: null,
                    base: null,
                    hasConflicts: await this.hasMergeConflicts(cwd)
                };
            case 'synced-branch-state':
                return this.syncedBranchState(cwd);
            case 'index-info':
                return this.indexInfo(cwd);
            case 'config-value':
                return { value: await this.configValue(cwd, record) };
            case 'set-config-value':
                return { success: await this.setConfigValue(cwd, record) };
            case 'git-origins':
                return this.gitOrigins(record);
            case 'set-worktree-owner-thread':
                return { success: true };
            case 'worktree-snapshot-ref':
                return {
                    ref: await this.currentCommit(this.extractString(record, ['worktreePath', 'cwd', 'root', 'gitRoot']) ?? cwd)
                };
            case 'git-init-repo':
                return this.gitInitRepo(cwd);
            case 'commit':
                return this.commit(cwd, record);
            case 'watch-repo':
            case 'unwatch-repo':
            case 'invalidate-untracked-paths-cache':
            case 'invalidate-stable-metadata':
            case 'dispose-git-init-watch':
                return { ok: true };
            default:
                throw new Error(`Unknown git worker method: ${method}`);
        }
    }

    protected async stableMetadata(cwd: string): Promise<unknown> {
        const gitRoot = await this.resolveGitRoot(cwd);
        if (!gitRoot) {
            return {
                isRepo: false,
                gitRoot: null,
                branch: null,
                defaultBranch: null,
                upstreamBranch: null,
                aheadCount: 0,
                behindCount: 0
            };
        }
        const [branch, defaultBranch, upstreamBranch, aheadBehind] = await Promise.all([
            this.currentBranch(gitRoot),
            this.defaultBranch(gitRoot),
            this.upstreamBranch(gitRoot),
            this.branchAheadCount(gitRoot)
        ]);
        return {
            isRepo: true,
            gitRoot,
            branch,
            defaultBranch,
            upstreamBranch,
            aheadCount: aheadBehind.aheadCount,
            behindCount: aheadBehind.behindCount
        };
    }

    protected async currentBranch(cwd: string): Promise<string | null> {
        try {
            const { stdout } = await execFileAsync('git', ['-C', cwd, 'rev-parse', '--abbrev-ref', 'HEAD'], {
                windowsHide: true
            });
            const branch = stdout.trim();
            return branch.length > 0 && branch !== 'HEAD' ? branch : null;
        } catch {
            return null;
        }
    }

    protected async defaultBranch(cwd: string): Promise<string | null> {
        try {
            const { stdout } = await execFileAsync('git', ['-C', cwd, 'symbolic-ref', 'refs/remotes/origin/HEAD'], {
                windowsHide: true
            });
            const ref = stdout.trim();
            const prefix = 'refs/remotes/origin/';
            return ref.startsWith(prefix) ? ref.slice(prefix.length) : null;
        } catch {
            try {
                const { stdout } = await execFileAsync('git', ['-C', cwd, 'branch', '--show-current'], {
                    windowsHide: true
                });
                const branch = stdout.trim();
                return branch.length > 0 ? branch : 'main';
            } catch {
                return 'main';
            }
        }
    }

    protected async baseBranch(cwd: string): Promise<string | null> {
        return this.defaultBranch(cwd);
    }

    protected async upstreamBranch(cwd: string): Promise<string | null> {
        try {
            const { stdout } = await execFileAsync('git', ['-C', cwd, 'rev-parse', '--abbrev-ref', '@{upstream}'], {
                windowsHide: true
            });
            const branch = stdout.trim();
            return branch.length > 0 && branch !== '@{upstream}' ? branch : null;
        } catch {
            return null;
        }
    }

    protected async branchAheadCount(cwd: string): Promise<{ aheadCount: number; behindCount: number }> {
        try {
            const { stdout } = await execFileAsync('git', ['-C', cwd, 'rev-list', '--left-right', '--count', 'HEAD...@{upstream}'], {
                windowsHide: true
            });
            const [behindRaw, aheadRaw] = stdout.trim().split(/\s+/);
            return {
                aheadCount: Number.parseInt(aheadRaw ?? '0', 10) || 0,
                behindCount: Number.parseInt(behindRaw ?? '0', 10) || 0
            };
        } catch {
            return { aheadCount: 0, behindCount: 0 };
        }
    }

    protected async recentBranches(cwd: string, limit: number): Promise<string[]> {
        const result = await this.runGit(cwd, [
            'for-each-ref',
            `--count=${limit}`,
            '--sort=-committerdate',
            'refs/heads',
            '--format=%(refname:short)'
        ]);
        if (!result.success) {
            return [];
        }
        return this.uniqueLines(result.stdout);
    }

    protected async branchExists(cwd: string, branch: string): Promise<boolean> {
        if (!branch) {
            return false;
        }
        const candidates = [
            branch,
            `refs/heads/${branch}`,
            `refs/remotes/${branch}`
        ];
        for (const candidate of candidates) {
            const result = await this.runGit(cwd, ['rev-parse', '--verify', '--quiet', candidate]);
            if (result.success && result.stdout.trim()) {
                return true;
            }
        }
        return false;
    }

    protected async branchCommits(cwd: string, record: Record<string, unknown>): Promise<Record<string, unknown>[]> {
        const limit = this.extractLimit(record, 50, 200);
        const baseBranch = this.extractString(record, ['baseBranch', 'base', 'upstream']);
        const branch = this.extractString(record, ['branch', 'currentBranch', 'head']) ?? 'HEAD';
        const range = baseBranch ? `${baseBranch}..${branch}` : branch;
        const result = await this.runGit(cwd, [
            'log',
            `--max-count=${limit}`,
            '--format=%H%x00%h%x00%an%x00%ae%x00%aI%x00%s%x1e',
            range
        ]);
        if (!result.success || !result.stdout) {
            return [];
        }
        return result.stdout.split('\x1e')
            .map(entry => entry.trim())
            .filter(entry => entry.length > 0)
            .map(entry => {
                const [sha, shortSha, authorName, authorEmail, committedAt, subject] = entry.split('\x00');
                return {
                    sha,
                    shortSha,
                    authorName,
                    authorEmail,
                    committedAt,
                    subject: subject ?? ''
                };
            });
    }

    protected async searchBranches(cwd: string, query: string, limit: number): Promise<string[]> {
        const result = await this.runGit(cwd, [
            'for-each-ref',
            '--sort=-committerdate',
            'refs/heads',
            'refs/remotes',
            '--format=%(refname:short)'
        ]);
        if (!result.success) {
            return [];
        }
        const normalizedQuery = this.normalizeSearchText(query);
        const branches = this.uniqueLines(result.stdout)
            .map(branch => branch.replace(/^origin\//, ''))
            .filter(branch => branch !== 'HEAD' && !branch.endsWith('/HEAD'));
        const filtered = normalizedQuery
            ? branches.filter(branch => this.normalizeSearchText(branch).includes(normalizedQuery))
            : branches;
        return Array.from(new Set(filtered)).slice(0, limit);
    }

    protected async nearestAncestorBranch(cwd: string, candidates: string[], currentBranch: string | null): Promise<string | null> {
        let best: { branch: string; distance: number } | undefined;
        for (const candidate of candidates) {
            if (!candidate || candidate === currentBranch || !await this.branchExists(cwd, candidate)) {
                continue;
            }
            const mergeBase = await this.runGit(cwd, ['merge-base', 'HEAD', candidate]);
            if (!mergeBase.success || !mergeBase.stdout.trim()) {
                continue;
            }
            const distanceResult = await this.runGit(cwd, ['rev-list', '--count', `${mergeBase.stdout.trim()}..HEAD`]);
            const distance = Number.parseInt(distanceResult.stdout.trim(), 10);
            if (Number.isFinite(distance) && (!best || distance < best.distance)) {
                best = { branch: candidate, distance };
            }
        }
        return best?.branch ?? null;
    }

    protected async branchMetadata(cwd: string): Promise<Record<string, unknown>> {
        const gitRoot = await this.resolveGitRoot(cwd);
        const upstream = await this.upstreamBranch(cwd);
        const base = await this.baseBranch(cwd);
        const baseParts = upstream?.includes('/') ? upstream.split('/') : [];
        return {
            gitRoot,
            branch: await this.currentBranch(cwd),
            baseBranch: base,
            baseBranchRemote: baseParts.length > 1 ? baseParts[0] : 'origin'
        };
    }

    protected async statusSummary(cwd: string): Promise<Record<string, unknown>> {
        const result = await this.runGit(cwd, ['status', '--porcelain=v1', '-z']);
        if (!result.success) {
            return { type: 'error' };
        }
        let stagedCount = 0;
        let unstagedCount = 0;
        let untrackedCount = 0;
        const entries = result.stdout.split('\0').filter(entry => entry.length > 0);
        for (let index = 0; index < entries.length; index++) {
            const entry = entries[index] ?? '';
            const indexStatus = entry[0] ?? ' ';
            const worktreeStatus = entry[1] ?? ' ';
            if (indexStatus === '?' && worktreeStatus === '?') {
                untrackedCount++;
            } else {
                if (indexStatus !== ' ') {
                    stagedCount++;
                }
                if (worktreeStatus !== ' ') {
                    unstagedCount++;
                }
            }
            if ((indexStatus === 'R' || indexStatus === 'C' || worktreeStatus === 'R' || worktreeStatus === 'C') && index + 1 < entries.length) {
                index++;
            }
        }
        return { type: 'success', stagedCount, unstagedCount, untrackedCount };
    }

    protected async branchDiffStats(cwd: string, record: Record<string, unknown>): Promise<Record<string, unknown> | null> {
        const diffArgs = await this.buildDiffArgs(cwd, record, 'branch');
        if (!diffArgs) {
            return null;
        }
        const result = await this.runGit(cwd, ['diff', '--numstat', ...this.hideWhitespaceArgs(record), ...diffArgs]);
        if (!result.success) {
            return null;
        }
        const stats = this.parseNumstat(result.stdout);
        return {
            additions: stats.linesAdded,
            deletions: stats.linesRemoved,
            fileCount: stats.filesChanged
        };
    }

    protected async reviewSummary(cwd: string, record: Record<string, unknown>, includeStageCounts: boolean): Promise<Record<string, unknown>> {
        const source = this.extractString(record, ['source']) ?? 'branch';
        const files = await this.reviewFiles(cwd, record);
        if (!files) {
            return { type: 'error', source };
        }
        const response: Record<string, unknown> = {
            type: 'success',
            source,
            files
        };
        if (includeStageCounts) {
            const status = await this.statusSummary(cwd);
            response.stageCounts = status.type === 'success'
                ? {
                    stagedFileCount: status.stagedCount,
                    unstagedFileCount: status.unstagedCount,
                    untrackedFileCount: status.untrackedCount
                }
                : {
                    stagedFileCount: 0,
                    unstagedFileCount: 0,
                    untrackedFileCount: 0
                };
        }
        return response;
    }

    protected async reviewDiff(cwd: string, record: Record<string, unknown>): Promise<Record<string, unknown>> {
        const source = this.extractString(record, ['source']) ?? 'branch';
        const files = Array.isArray(record.files)
            ? record.files.filter((entry): entry is Record<string, unknown> => this.isRecord(entry))
            : [];
        const paths = files.map(file => this.extractString(file, ['path'])).filter((entry): entry is string => !!entry);
        const diffs: Record<string, unknown> = {};
        for (const file of files) {
            const filePath = this.extractString(file, ['path']);
            if (filePath) {
                diffs[filePath] = await this.singleFileDiff(cwd, record, filePath);
            }
        }
        if (files.length === 0) {
            for (const filePath of this.extractStringArray(record.paths)) {
                diffs[filePath] = await this.singleFileDiff(cwd, record, filePath);
            }
        }
        if (Object.keys(diffs).length === 0 && paths.length === 0) {
            return { source, diffs: {} };
        }
        return { source, diffs };
    }

    protected async reviewSearch(cwd: string, record: Record<string, unknown>): Promise<Record<string, unknown>> {
        const source = this.extractString(record, ['source']) ?? 'branch';
        const query = this.extractString(record, ['query']) ?? '';
        if (!query.trim()) {
            return { type: 'success', source, query, matches: [], totalMatches: 0, isCapped: false };
        }
        const files = await this.reviewFiles(cwd, record) ?? [];
        const matches: Record<string, unknown>[] = [];
        for (const file of files) {
            const filePath = String(file.path ?? '');
            const diff = await this.singleFileDiff(cwd, record, filePath);
            if (diff.type !== 'success' || typeof diff.diff !== 'string') {
                continue;
            }
            const lines = diff.diff.split(/\r?\n/);
            lines.forEach((line, index) => {
                if (line.toLowerCase().includes(query.toLowerCase())) {
                    matches.push({ path: filePath, lineNumber: index + 1, line });
                }
            });
        }
        return {
            type: 'success',
            source,
            query,
            matches: matches.slice(0, 200),
            totalMatches: matches.length,
            isCapped: matches.length > 200
        };
    }

    protected async reviewPatch(cwd: string, record: Record<string, unknown>): Promise<Record<string, unknown>> {
        const source = this.extractString(record, ['source']) ?? 'branch';
        const diffArgs = await this.buildDiffArgs(cwd, record, source);
        if (!diffArgs) {
            return { source, diff: { type: 'error', error: { type: 'unknown' } } };
        }
        const result = await this.runGit(cwd, ['diff', ...this.hideWhitespaceArgs(record), ...diffArgs]);
        return {
            source,
            diff: result.success
                ? {
                    type: 'success',
                    unifiedDiff: result.stdout,
                    unifiedDiffBytes: Buffer.byteLength(result.stdout, 'utf8')
                }
                : {
                    type: 'error',
                    error: { type: 'unknown' }
                }
        };
    }

    protected async commitMessageDiff(cwd: string, record: Record<string, unknown>): Promise<Record<string, unknown>> {
        const includeUnstaged = record.includeUnstaged === true;
        const parts: string[] = [];
        const staged = await this.runGit(cwd, ['diff', '--cached']);
        if (staged.success && staged.stdout.trim()) {
            parts.push(staged.stdout);
        }
        if (includeUnstaged) {
            const unstaged = await this.runGit(cwd, ['diff']);
            if (unstaged.success && unstaged.stdout.trim()) {
                parts.push(unstaged.stdout);
            }
        }
        const unifiedDiff = parts.join('\n');
        return {
            type: 'success',
            unifiedDiff,
            unifiedDiffBytes: Buffer.byteLength(unifiedDiff, 'utf8')
        };
    }

    protected async singleFileDiff(cwd: string, record: Record<string, unknown>, filePath: string): Promise<Record<string, unknown>> {
        const source = this.extractString(record, ['source']) ?? 'branch';
        const diffArgs = await this.buildDiffArgs(cwd, { ...record, paths: [filePath] }, source);
        if (!diffArgs) {
            return { type: 'error', error: { type: 'unknown' } };
        }
        const result = await this.runGit(cwd, ['diff', ...this.hideWhitespaceArgs(record), '--find-renames', ...diffArgs]);
        return result.success
            ? { type: 'success', diff: result.stdout, diffBytes: Buffer.byteLength(result.stdout, 'utf8') }
            : { type: 'error', error: { type: 'unknown' } };
    }

    protected async reviewFiles(cwd: string, record: Record<string, unknown>): Promise<CodexDiffFileSummary[] | null> {
        const source = this.extractString(record, ['source']) ?? 'branch';
        const diffArgs = await this.buildDiffArgs(cwd, record, source);
        if (!diffArgs) {
            return null;
        }
        const [nameStatus, numstat] = await Promise.all([
            this.runGit(cwd, ['diff', ...this.hideWhitespaceArgs(record), '--find-renames', '--name-status', '-z', ...diffArgs]),
            this.runGit(cwd, ['diff', ...this.hideWhitespaceArgs(record), '--find-renames', '--numstat', '-z', ...diffArgs])
        ]);
        if (!nameStatus.success || !numstat.success) {
            return null;
        }
        const files = this.parseNameStatus(nameStatus.stdout);
        const stats = new Map(this.parseNumstatEntries(numstat.stdout).map(entry => [this.diffFileKey(entry.path, entry.previousPath), entry]));
        return files.map(file => {
            const stat = stats.get(this.diffFileKey(file.path, file.previousPath));
            return {
                ...file,
                additions: stat?.additions ?? null,
                deletions: stat?.deletions ?? null,
                revision: `${source}:${file.changeKind}:${file.previousPath ?? ''}:${file.path}`
            };
        });
    }

    protected async buildDiffArgs(cwd: string, record: Record<string, unknown>, source: string): Promise<string[] | null> {
        const paths = this.extractStringArray(record.paths);
        const pathArgs = paths.length > 0 ? ['--', ...paths] : [];
        if (source === 'staged') {
            return ['--cached', ...pathArgs];
        }
        if (source === 'unstaged') {
            return [...pathArgs];
        }
        if (source === 'commit') {
            const commitSha = this.extractString(record, ['commitSha', 'commit', 'sha']);
            return commitSha ? [`${commitSha}^!`, ...pathArgs] : null;
        }
        const commitSha = this.extractString(record, ['commitSha', 'commit', 'sha']);
        if (commitSha) {
            return [`${commitSha}..HEAD`, ...pathArgs];
        }
        const baseBranch = this.extractString(record, ['baseBranch', 'base', 'upstream']) ?? await this.defaultBranch(cwd);
        return baseBranch ? [`${baseBranch}...HEAD`, ...pathArgs] : ['HEAD', ...pathArgs];
    }

    protected hideWhitespaceArgs(record: Record<string, unknown>): string[] {
        return record.hideWhitespace === true ? ['--ignore-all-space'] : [];
    }

    protected parseNameStatus(output: string): CodexDiffFileSummary[] {
        const entries = output.split('\0').filter(entry => entry.length > 0);
        const files: CodexDiffFileSummary[] = [];
        for (let index = 0; index < entries.length; index++) {
            const status = entries[index] ?? '';
            const code = status[0] ?? 'M';
            const changeKind = this.normalizeChangeKind(code);
            if (code === 'R' || code === 'C') {
                const previousPath = entries[index + 1];
                const filePath = entries[index + 2];
                if (previousPath && filePath) {
                    files.push({ path: filePath, previousPath, changeKind, additions: null, deletions: null, revision: '' });
                    index += 2;
                }
                continue;
            }
            const filePath = entries[index + 1];
            if (filePath) {
                files.push({ path: filePath, previousPath: null, changeKind, additions: null, deletions: null, revision: '' });
                index++;
            }
        }
        return files;
    }

    protected parseNumstatEntries(output: string): Array<{ path: string; previousPath: string | null; additions: number | null; deletions: number | null }> {
        const entries = output.split('\0').filter(entry => entry.length > 0);
        const stats: Array<{ path: string; previousPath: string | null; additions: number | null; deletions: number | null }> = [];
        for (let index = 0; index < entries.length; index++) {
            const entry = entries[index] ?? '';
            const [additionsRaw, deletionsRaw, filePath] = entry.split('\t');
            if (additionsRaw === undefined || deletionsRaw === undefined || filePath === undefined) {
                continue;
            }
            const additions = this.parseDiffCount(additionsRaw);
            const deletions = this.parseDiffCount(deletionsRaw);
            if (filePath.length > 0) {
                stats.push({ path: filePath, previousPath: null, additions, deletions });
                continue;
            }
            const previousPath = entries[index + 1];
            const nextPath = entries[index + 2];
            if (previousPath && nextPath) {
                stats.push({ path: nextPath, previousPath, additions, deletions });
                index += 2;
            }
        }
        return stats;
    }

    protected parseNumstat(output: string): typeof EMPTY_DIFF_STATS {
        const totals = { ...EMPTY_DIFF_STATS };
        const entries = output.includes('\0')
            ? this.parseNumstatEntries(output)
            : output.split(/\r?\n/)
                .map(line => {
                    const [additionsRaw, deletionsRaw, filePath] = line.split('\t');
                    return filePath
                        ? {
                            path: filePath,
                            previousPath: null,
                            additions: this.parseDiffCount(additionsRaw),
                            deletions: this.parseDiffCount(deletionsRaw)
                        }
                        : undefined;
                })
                .filter((entry): entry is { path: string; previousPath: null; additions: number | null; deletions: number | null } => !!entry);
        for (const entry of entries) {
            totals.filesChanged++;
            totals.linesAdded += entry.additions ?? 0;
            totals.linesRemoved += entry.deletions ?? 0;
        }
        return totals;
    }

    protected parseDiffCount(value: string | undefined): number | null {
        if (!value || value === '-') {
            return null;
        }
        const parsed = Number.parseInt(value, 10);
        return Number.isFinite(parsed) ? parsed : null;
    }

    protected diffFileKey(filePath: string, previousPath: string | null): string {
        return `${previousPath ?? ''}\0${filePath}`;
    }

    protected normalizeChangeKind(status: string): string {
        switch (status) {
            case 'A':
                return 'added';
            case 'D':
                return 'deleted';
            case 'R':
                return 'renamed';
            case 'C':
                return 'copied';
            case 'T':
                return 'type-changed';
            case 'U':
                return 'unmerged';
            default:
                return 'modified';
        }
    }

    protected async submodulePaths(cwd: string): Promise<string[]> {
        const result = await this.runGit(cwd, ['config', '--file', '.gitmodules', '--get-regexp', 'path']);
        if (!result.success) {
            return [];
        }
        return Array.from(new Set(result.stdout.split(/\r?\n/)
            .map(line => line.trim().split(/\s+/).pop() ?? '')
            .filter(entry => entry.length > 0)));
    }

    protected async catFile(cwd: string, record: Record<string, unknown>): Promise<Record<string, unknown>> {
        const oid = this.extractString(record, ['oid', 'sha', 'ref']) ?? 'HEAD';
        const filePath = this.extractString(record, ['path', 'filePath']);
        if (!filePath) {
            return { type: 'error', error: { type: 'not-found' } };
        }
        const result = await this.runGit(cwd, ['show', `${oid}:${filePath}`]);
        if (result.success) {
            return { type: 'success', contents: result.stdout, content: result.stdout };
        }
        if (record.fallbackToDisk === true) {
            try {
                const gitRoot = await this.resolveGitRoot(cwd) ?? cwd;
                const contents = await fs.readFile(path.join(gitRoot, filePath), 'utf8');
                return { type: 'success', contents, content: contents };
            } catch {
                // Keep the git error shape below.
            }
        }
        return { type: 'error', error: { type: 'not-found' } };
    }

    protected async blameFile(cwd: string, record: Record<string, unknown>): Promise<Record<string, unknown>> {
        const filePath = this.extractString(record, ['path', 'filePath']);
        if (!filePath) {
            return { type: 'error', error: { type: 'not-found' } };
        }
        const result = await this.runGit(cwd, ['blame', '--line-porcelain', '--', filePath]);
        if (!result.success) {
            return { type: 'error', error: { type: 'not-found' } };
        }
        return {
            type: 'success',
            lines: this.parseBlamePorcelain(result.stdout),
            repositoryWebUrl: await this.repositoryWebUrl(cwd)
        };
    }

    protected parseBlamePorcelain(output: string): Record<string, unknown>[] {
        const lines: Record<string, unknown>[] = [];
        let current: Record<string, unknown> | undefined;
        for (const rawLine of output.split(/\r?\n/)) {
            const header = /^([0-9a-f]{7,40})\s+\d+\s+(\d+)/i.exec(rawLine);
            if (header) {
                current = { sha: header[1], lineNumber: Number.parseInt(header[2], 10) };
                continue;
            }
            if (!current) {
                continue;
            }
            if (rawLine.startsWith('author ')) {
                current.author = rawLine.slice('author '.length);
            } else if (rawLine.startsWith('author-time ')) {
                const seconds = Number.parseInt(rawLine.slice('author-time '.length), 10);
                current.committedAt = Number.isFinite(seconds) ? new Date(seconds * 1000).toISOString() : null;
            } else if (rawLine.startsWith('summary ')) {
                current.subject = rawLine.slice('summary '.length);
            } else if (rawLine.startsWith('\t')) {
                current.text = rawLine.slice(1);
                lines.push(current);
                current = undefined;
            }
        }
        return lines;
    }

    protected async repositoryWebUrl(cwd: string): Promise<string | null> {
        const origin = (await this.runGit(cwd, ['config', '--get', 'remote.origin.url'])).stdout.trim();
        if (!origin) {
            return null;
        }
        const sshMatch = /^git@([^:]+):(.+?)(?:\.git)?$/.exec(origin);
        if (sshMatch) {
            return `https://${sshMatch[1]}/${sshMatch[2]}`;
        }
        return origin.replace(/\.git$/, '');
    }

    protected async hasMergeConflicts(cwd: string): Promise<boolean> {
        const result = await this.runGit(cwd, ['ls-files', '-u']);
        return result.success && result.stdout.trim().length > 0;
    }

    protected async syncedBranchState(cwd: string): Promise<Record<string, unknown>> {
        const head = await this.currentCommit(cwd);
        return {
            branch: null,
            worktreeSnapshot: {
                root: await this.resolveGitRoot(cwd),
                headCommitSha: head,
                workingTreeRef: undefined
            },
            branchSnapshot: {
                checkedOut: false,
                headCommitSha: null
            },
            localCommitsAhead: 0,
            worktreeCommitsAhead: 0,
            localUncommittedDiffStats: EMPTY_DIFF_STATS,
            worktreeUncommittedDiffStats: EMPTY_DIFF_STATS
        };
    }

    protected async indexInfo(cwd: string): Promise<{ lastModified: number }> {
        const gitRoot = await this.resolveGitRoot(cwd);
        if (!gitRoot) {
            return { lastModified: 0 };
        }
        const gitDirResult = await this.runGit(gitRoot, ['rev-parse', '--git-dir']);
        const gitDirRaw = gitDirResult.stdout.trim();
        const gitDir = path.isAbsolute(gitDirRaw) ? gitDirRaw : path.join(gitRoot, gitDirRaw);
        try {
            const stat = await fs.stat(path.join(gitDir, 'index'));
            return { lastModified: stat.mtimeMs };
        } catch {
            return { lastModified: 0 };
        }
    }

    protected async configValue(cwd: string, record: Record<string, unknown>): Promise<string | null> {
        const key = this.extractString(record, ['key']);
        if (!key) {
            return null;
        }
        const args = ['config'];
        const scope = this.extractString(record, ['scope']);
        if (scope === 'global') {
            args.push('--global');
        }
        args.push('--get', key);
        const result = await this.runGit(cwd, args);
        return result.success ? result.stdout.trim() || null : null;
    }

    protected async setConfigValue(cwd: string, record: Record<string, unknown>): Promise<boolean> {
        const key = this.extractString(record, ['key']);
        if (!key) {
            return false;
        }
        const value = record.value === undefined || record.value === null ? '' : String(record.value);
        const args = ['config'];
        const scope = this.extractString(record, ['scope']);
        if (scope === 'global') {
            args.push('--global');
        }
        args.push(key, value);
        return (await this.runGit(cwd, args)).success;
    }

    protected async gitOrigins(record: Record<string, unknown>): Promise<Record<string, unknown>> {
        const dirs = Array.isArray(record.dirs)
            ? record.dirs.filter((entry): entry is string => typeof entry === 'string')
            : [this.extractString(record, ['cwd', 'root', 'gitRoot']) ?? process.cwd()];
        const origins = [];
        for (const dir of dirs) {
            const root = await this.resolveGitRoot(dir);
            const originUrl = root ? (await this.runGit(root, ['config', '--get', 'remote.origin.url'])).stdout.trim() || null : null;
            origins.push({ dir, root, originUrl });
        }
        return { origins };
    }

    protected async gitInitRepo(cwd: string): Promise<Record<string, unknown>> {
        const result = await this.runGit(cwd, ['init']);
        return {
            success: result.success,
            stdout: result.stdout,
            stderr: result.stderr,
            error: result.error
        };
    }

    protected async commit(cwd: string, record: Record<string, unknown>): Promise<Record<string, unknown>> {
        const message = this.extractString(record, ['message']) ?? 'Update from Codex';
        if (record.includeUnstaged === true) {
            const add = await this.runGit(cwd, ['add', '-A']);
            if (!add.success) {
                return { status: 'error', error: add.error ?? add.stderr, execOutput: { output: add.stderr || add.stdout } };
            }
        }
        const commit = await this.runGit(cwd, ['commit', '-m', message]);
        if (!commit.success) {
            return { status: 'error', error: commit.error ?? commit.stderr, execOutput: { output: commit.stderr || commit.stdout } };
        }
        return {
            status: 'success',
            commitSha: await this.currentCommit(cwd)
        };
    }

    protected async currentCommit(cwd: string): Promise<string | null> {
        const result = await this.runGit(cwd, ['rev-parse', 'HEAD']);
        const sha = result.stdout.trim();
        return result.success && sha ? sha : null;
    }

    protected async runGit(cwd: string, args: string[]): Promise<CodexGitCommandResult> {
        try {
            const { stdout, stderr } = await execFileAsync('git', ['-C', cwd, ...args], {
                windowsHide: true,
                maxBuffer: 20 * 1024 * 1024
            });
            return { success: true, stdout: String(stdout), stderr: String(stderr) };
        } catch (error) {
            const execError = error as { stdout?: unknown; stderr?: unknown; message?: string };
            return {
                success: false,
                stdout: this.stringifyOutput(execError.stdout),
                stderr: this.stringifyOutput(execError.stderr),
                error: execError.message ?? String(error)
            };
        }
    }

    protected extractString(record: Record<string, unknown>, keys: string[]): string | undefined {
        for (const key of keys) {
            const value = record[key];
            if (typeof value === 'string' && value.length > 0) {
                return value;
            }
        }
        return undefined;
    }

    protected extractStringArray(value: unknown): string[] {
        return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
    }

    protected extractLimit(record: Record<string, unknown>, fallback: number, max: number): number {
        const value = typeof record.limit === 'number' ? record.limit : Number(record.limit);
        return Number.isFinite(value) ? Math.max(1, Math.min(Math.floor(value), max)) : fallback;
    }

    protected uniqueLines(output: string): string[] {
        return Array.from(new Set(output.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0)));
    }

    protected normalizeSearchText(value: string): string {
        return value.toLowerCase().replace(/[-_/.\s]+/g, ' ').trim();
    }

    protected isRecord(value: unknown): value is Record<string, unknown> {
        return !!value && typeof value === 'object' && !Array.isArray(value);
    }

    protected stringifyOutput(value: unknown): string {
        if (typeof value === 'string') {
            return value;
        }
        if (Buffer.isBuffer(value)) {
            return value.toString('utf8');
        }
        return value === undefined ? '' : String(value);
    }

    protected async resolveGitRoot(dir: string): Promise<string | null> {
        try {
            const { stdout } = await execFileAsync('git', ['-C', dir, 'rev-parse', '--show-toplevel'], {
                windowsHide: true
            });
            const root = stdout.trim();
            return root.length > 0 ? path.normalize(root) : null;
        } catch {
            return null;
        }
    }
}

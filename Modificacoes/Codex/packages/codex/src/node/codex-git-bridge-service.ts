// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { injectable } from '@theia/core/shared/inversify';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';
import { execFile } from 'child_process';
import { parseCodexRpcParams } from '../common/codex-host-protocol';

const execFileAsync = promisify(execFile);

export interface CodexGitOrigin {
    dir: string;
    root: string | null;
    originUrl: string | null;
}

export interface CodexCommandResult {
    success: boolean;
    stdout: string;
    stderr: string;
    error?: string;
}

@injectable()
export class CodexGitBridgeService {

    async gitOrigins(params: unknown): Promise<{ origins: CodexGitOrigin[]; homeDir: string }> {
        const record = parseCodexRpcParams(params);
        const dirs = Array.isArray(record.dirs)
            ? record.dirs.filter((dir): dir is string => typeof dir === 'string')
            : [process.cwd()];
        const origins: CodexGitOrigin[] = [];
        for (const dir of dirs) {
            const root = await this.resolveGitRoot(dir);
            origins.push({
                dir,
                root,
                originUrl: root ? await this.getOriginUrl(root) : null
            });
        }
        return { origins, homeDir: os.homedir() };
    }

    async gitMergeBase(params: unknown): Promise<{ mergeBaseSha: string | null }> {
        const record = parseCodexRpcParams(params);
        const gitRoot = typeof record.gitRoot === 'string' ? record.gitRoot : process.cwd();
        const baseBranch = typeof record.baseBranch === 'string' ? record.baseBranch : undefined;
        if (!baseBranch) {
            return { mergeBaseSha: null };
        }
        try {
            const { stdout } = await execFileAsync('git', ['-C', gitRoot, 'merge-base', 'HEAD', baseBranch], {
                windowsHide: true
            });
            const mergeBaseSha = stdout.trim();
            return { mergeBaseSha: mergeBaseSha.length > 0 ? mergeBaseSha : null };
        } catch {
            return { mergeBaseSha: null };
        }
    }

    async gitCreateBranch(params: unknown): Promise<{ success: boolean; branch?: string }> {
        const record = parseCodexRpcParams(params);
        const gitRoot = typeof record.gitRoot === 'string' ? record.gitRoot : process.cwd();
        const branchName = typeof record.branchName === 'string'
            ? record.branchName
            : typeof record.branch === 'string'
                ? record.branch
                : undefined;
        if (!branchName) {
            return { success: false };
        }
        try {
            await execFileAsync('git', ['-C', gitRoot, 'branch', branchName], { windowsHide: true });
            return { success: true, branch: branchName };
        } catch {
            return { success: false };
        }
    }

    async gitCheckoutBranch(params: unknown): Promise<{ success: boolean; branch?: string; error?: string }> {
        const record = parseCodexRpcParams(params);
        const gitRoot = this.extractString(record, ['gitRoot', 'cwd', 'root']) ?? process.cwd();
        const branchName = this.extractString(record, ['branchName', 'branch', 'ref']);
        if (!branchName) {
            return { success: false, error: 'Missing branch name' };
        }
        const result = await this.runCommand('git', ['-C', gitRoot, 'checkout', branchName]);
        return result.success
            ? { success: true, branch: branchName }
            : { success: false, branch: branchName, error: result.error ?? result.stderr };
    }

    async gitPush(params: unknown): Promise<{ success: boolean }> {
        const record = parseCodexRpcParams(params);
        const gitRoot = typeof record.gitRoot === 'string' ? record.gitRoot : process.cwd();
        const remote = typeof record.remote === 'string' ? record.remote : 'origin';
        const branch = typeof record.branch === 'string' ? record.branch : undefined;
        const args = ['-C', gitRoot, 'push', remote];
        if (branch) {
            args.push(branch);
        }
        try {
            await execFileAsync('git', args, { windowsHide: true });
            return { success: true };
        } catch {
            return { success: false };
        }
    }

    async applyPatch(params: unknown): Promise<Record<string, unknown>> {
        const record = parseCodexRpcParams(params);
        const patch = this.extractPatch(record);
        if (!patch) {
            return {
                success: false,
                appliedPaths: [],
                skippedPaths: [],
                conflictedPaths: [],
                error: 'Missing patch payload'
            };
        }

        const cwd = this.extractString(record, ['gitRoot', 'cwd', 'root']) ?? process.cwd();
        const gitRoot = await this.resolveGitRoot(cwd) ?? cwd;
        const patchPath = path.join(os.tmpdir(), `codex-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.patch`);
        const patchPaths = this.extractPatchPaths(patch);
        await fs.writeFile(patchPath, patch, 'utf8');
        try {
            const check = await this.runCommand('git', ['-C', gitRoot, 'apply', '--check', patchPath]);
            if (!check.success) {
                return this.buildPatchResult(false, [], patchPaths, [], check);
            }
            const apply = await this.runCommand('git', ['-C', gitRoot, 'apply', '--whitespace=nowarn', patchPath]);
            return apply.success
                ? this.buildPatchResult(true, patchPaths, [], [], apply)
                : this.buildPatchResult(false, [], patchPaths, [], apply);
        } finally {
            await fs.unlink(patchPath).catch(() => undefined);
        }
    }

    async ghCliStatus(params: unknown): Promise<Record<string, unknown>> {
        const record = parseCodexRpcParams(params);
        const cwd = this.extractString(record, ['cwd', 'gitRoot', 'root']);
        const version = await this.runCommand('gh', ['--version'], cwd);
        if (!version.success) {
            return {
                isInstalled: false,
                isAuthenticated: false,
                stdout: version.stdout,
                stderr: version.stderr,
                error: version.error
            };
        }
        const auth = await this.runCommand('gh', ['auth', 'status'], cwd);
        return {
            isInstalled: true,
            isAuthenticated: auth.success,
            stdout: `${version.stdout}${auth.stdout}`,
            stderr: auth.stderr,
            error: auth.success ? undefined : auth.error
        };
    }

    async ghCurrentUser(params: unknown): Promise<Record<string, unknown>> {
        const record = parseCodexRpcParams(params);
        const cwd = this.extractString(record, ['cwd', 'gitRoot', 'root']);
        const result = await this.runCommand('gh', ['api', 'user', '--jq', '.login'], cwd);
        return {
            success: result.success,
            login: result.success ? result.stdout.trim() : null,
            stdout: result.stdout,
            stderr: result.stderr,
            error: result.error
        };
    }

    async ghPrStatus(params: unknown): Promise<Record<string, unknown>> {
        const record = parseCodexRpcParams(params);
        const cwd = this.extractString(record, ['cwd', 'gitRoot', 'root']);
        const repo = this.extractRepo(record);
        const selector = this.extractPrSelector(record) ?? this.extractString(record, ['headBranch']);
        if (!selector) {
            return { status: 'not-found' };
        }
        const result = await this.runGhPrView(selector, cwd, repo, [
            'number',
            'title',
            'url',
            'state',
            'isDraft',
            'mergeable',
            'headRefName',
            'baseRefName',
            'statusCheckRollup',
            'author',
            'repository'
        ]);
        if (!result.success) {
            return { status: 'not-found', stdout: result.stdout, stderr: result.stderr, error: result.error };
        }
        const data = this.parseJsonRecord(result.stdout);
        const item = this.toPullRequestItem(data, record, repo);
        return {
            status: 'success',
            hasOpenPr: data.state !== 'CLOSED',
            ...item,
            canMerge: data.mergeable === 'MERGEABLE',
            mergeBlocker: data.mergeable === 'CONFLICTING' ? 'conflicts' : 'unknown',
            commentAttachments: [],
            activityItems: [],
            boardItem: item
        };
    }

    async ghPrBoard(params: unknown): Promise<Record<string, unknown>> {
        const record = parseCodexRpcParams(params);
        const repos = Array.isArray(record.repos)
            ? record.repos.filter(this.isRecord)
            : [record];
        const items: Record<string, unknown>[] = [];
        for (const repoRecord of repos) {
            const cwd = this.extractString(repoRecord, ['cwd', 'gitRoot', 'root']);
            const repo = this.extractRepo(repoRecord);
            const args = [
                'pr',
                'list',
                '--state',
                'all',
                '--limit',
                '100',
                '--json',
                'number,title,url,state,isDraft,mergeable,headRefName,baseRefName,statusCheckRollup,author,repository,updatedAt,createdAt'
            ];
            const searchQuery = this.extractString(record, ['searchQuery']);
            if (searchQuery) {
                args.push('--search', searchQuery);
            }
            if (repo) {
                args.push('--repo', repo);
            }
            const result = await this.runCommand('gh', args, cwd);
            if (!result.success) {
                continue;
            }
            const data = this.parseJsonArray(result.stdout);
            for (const entry of data) {
                items.push(this.toPullRequestItem(entry, repoRecord, repo));
            }
        }
        return { status: 'success', items };
    }

    async ghPrBody(params: unknown): Promise<string | null> {
        const record = parseCodexRpcParams(params);
        const selector = this.extractPrSelector(record);
        if (!selector) {
            return null;
        }
        const result = await this.runGhPrView(selector, this.extractString(record, ['cwd', 'gitRoot', 'root']), this.extractRepo(record), ['body']);
        if (!result.success) {
            return null;
        }
        const data = this.parseJsonRecord(result.stdout);
        return typeof data.body === 'string' ? data.body : null;
    }

    async ghPrChecks(params: unknown): Promise<Record<string, unknown>> {
        const record = parseCodexRpcParams(params);
        const selector = this.extractPrSelector(record);
        if (!selector) {
            return { checks: [], ciStatus: 'none' };
        }
        const result = await this.runGhPrView(selector, this.extractString(record, ['cwd', 'gitRoot', 'root']), this.extractRepo(record), ['statusCheckRollup']);
        if (!result.success) {
            return { checks: [], ciStatus: 'none', error: result.error ?? result.stderr };
        }
        const data = this.parseJsonRecord(result.stdout);
        const checks = this.normalizeChecks(data.statusCheckRollup);
        return { checks, ciStatus: this.computeCiStatus(checks) };
    }

    async ghPrComments(params: unknown): Promise<Record<string, unknown>> {
        const record = parseCodexRpcParams(params);
        const selector = this.extractPrSelector(record);
        if (!selector) {
            return { repo: this.extractRepo(record), activityItems: [] };
        }
        const result = await this.runGhPrView(selector, this.extractString(record, ['cwd', 'gitRoot', 'root']), this.extractRepo(record), [
            'comments',
            'reviews',
            'repository'
        ]);
        if (!result.success) {
            return { repo: this.extractRepo(record), activityItems: [], error: result.error ?? result.stderr };
        }
        const data = this.parseJsonRecord(result.stdout);
        return {
            repo: this.extractRepo(record) ?? this.extractRepositoryName(data.repository),
            activityItems: this.normalizeActivityItems(data)
        };
    }

    async ghPrDiff(params: unknown): Promise<Record<string, unknown>> {
        const record = parseCodexRpcParams(params);
        const selector = this.extractPrSelector(record);
        if (!selector) {
            return { diff: '', unifiedDiff: '' };
        }
        const args = ['pr', 'diff', selector];
        const repo = this.extractRepo(record);
        if (repo) {
            args.push('--repo', repo);
        }
        const result = await this.runCommand('gh', args, this.extractString(record, ['cwd', 'gitRoot', 'root']));
        return {
            success: result.success,
            diff: result.stdout,
            unifiedDiff: result.stdout,
            stdout: result.stdout,
            stderr: result.stderr,
            error: result.error
        };
    }

    async ghPrCreate(params: unknown): Promise<Record<string, unknown>> {
        const record = parseCodexRpcParams(params);
        const title = this.extractString(record, ['title']);
        if (!title) {
            return { success: false, error: 'Missing pull request title' };
        }
        const body = this.extractString(record, ['body', 'description']) ?? '';
        const result = await this.withTempBodyFile(body, async bodyPath => {
            const args = ['pr', 'create', '--title', title, '--body-file', bodyPath];
            this.appendOptionalArg(args, '--base', this.extractString(record, ['baseBranch', 'base']));
            this.appendOptionalArg(args, '--head', this.extractString(record, ['headBranch', 'head']));
            if (record.draft === true) {
                args.push('--draft');
            }
            this.appendOptionalArg(args, '--repo', this.extractRepo(record));
            return this.runCommand('gh', args, this.extractString(record, ['cwd', 'gitRoot', 'root']));
        });
        return this.commandResponse(result, { url: result.stdout.trim() || null });
    }

    async ghPrMerge(params: unknown): Promise<Record<string, unknown>> {
        const record = parseCodexRpcParams(params);
        const selector = this.extractPrSelector(record);
        if (!selector) {
            return { success: false, error: 'Missing pull request selector' };
        }
        const method = this.extractString(record, ['mergeMethod', 'method']) ?? 'merge';
        const args = ['pr', 'merge', selector, method === 'squash' ? '--squash' : method === 'rebase' ? '--rebase' : '--merge'];
        if (record.deleteBranch === true) {
            args.push('--delete-branch');
        }
        if (record.auto === true) {
            args.push('--auto');
        }
        this.appendOptionalArg(args, '--repo', this.extractRepo(record));
        const result = await this.runCommand('gh', args, this.extractString(record, ['cwd', 'gitRoot', 'root']));
        return this.commandResponse(result);
    }

    async ghPrUpdate(params: unknown): Promise<Record<string, unknown>> {
        const record = parseCodexRpcParams(params);
        const selector = this.extractPrSelector(record);
        if (!selector) {
            return { success: false, error: 'Missing pull request selector' };
        }
        const body = this.extractString(record, ['body', 'description']);
        const result = await this.withTempBodyFile(body ?? '', async bodyPath => {
            const args = ['pr', 'edit', selector];
            this.appendOptionalArg(args, '--title', this.extractString(record, ['title']));
            if (body !== undefined) {
                args.push('--body-file', bodyPath);
            }
            this.appendOptionalArg(args, '--base', this.extractString(record, ['baseBranch', 'base']));
            this.appendOptionalArg(args, '--repo', this.extractRepo(record));
            return this.runCommand('gh', args, this.extractString(record, ['cwd', 'gitRoot', 'root']));
        });
        return this.commandResponse(result);
    }

    async ghPrComment(params: unknown): Promise<Record<string, unknown>> {
        const record = parseCodexRpcParams(params);
        const selector = this.extractPrSelector(record);
        const body = this.extractString(record, ['body', 'comment', 'text']);
        if (!selector || !body) {
            return { success: false, error: 'Missing pull request selector or comment body' };
        }
        const result = await this.withTempBodyFile(body, async bodyPath => {
            const args = ['pr', 'comment', selector, '--body-file', bodyPath];
            this.appendOptionalArg(args, '--repo', this.extractRepo(record));
            return this.runCommand('gh', args, this.extractString(record, ['cwd', 'gitRoot', 'root']));
        });
        return this.commandResponse(result);
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

    protected async getOriginUrl(gitRoot: string): Promise<string | null> {
        const result = await this.runCommand('git', ['-C', gitRoot, 'config', '--get', 'remote.origin.url']);
        const originUrl = result.stdout.trim();
        return result.success && originUrl ? originUrl : null;
    }

    protected async runGhPrView(selector: string, cwd: string | undefined, repo: string | undefined, fields: string[]): Promise<CodexCommandResult> {
        const args = ['pr', 'view', selector, '--json', fields.join(',')];
        if (repo) {
            args.push('--repo', repo);
        }
        return this.runCommand('gh', args, cwd);
    }

    protected async runCommand(command: string, args: string[], cwd?: string): Promise<CodexCommandResult> {
        try {
            const { stdout, stderr } = await execFileAsync(command, args, {
                cwd,
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

    protected buildPatchResult(
        success: boolean,
        appliedPaths: string[],
        skippedPaths: string[],
        conflictedPaths: string[],
        result: CodexCommandResult
    ): Record<string, unknown> {
        const output = `${result.stdout}${result.stderr}`.trim();
        return {
            success,
            appliedPaths,
            skippedPaths,
            conflictedPaths,
            execOutput: { output },
            stdout: result.stdout,
            stderr: result.stderr,
            error: success ? undefined : result.error ?? result.stderr
        };
    }

    protected extractPatch(record: Record<string, unknown>): string | undefined {
        const direct = this.extractString(record, ['patch', 'unifiedDiff', 'diff', 'content']);
        if (direct) {
            return direct;
        }
        if (Array.isArray(record.patches)) {
            const patches = record.patches
                .map(entry => this.isRecord(entry) ? this.extractPatch(entry) : typeof entry === 'string' ? entry : undefined)
                .filter((entry): entry is string => typeof entry === 'string' && entry.length > 0);
            return patches.length > 0 ? patches.join('\n') : undefined;
        }
        return undefined;
    }

    protected extractPatchPaths(patch: string): string[] {
        const paths = new Set<string>();
        for (const rawLine of patch.split(/\r?\n/)) {
            if (rawLine.startsWith('+++ b/')) {
                const filePath = rawLine.slice('+++ b/'.length).trim();
                if (filePath && filePath !== '/dev/null') {
                    paths.add(filePath);
                }
                continue;
            }
            const match = /^diff --git a\/(.+) b\/(.+)$/.exec(rawLine);
            if (match?.[2]) {
                paths.add(match[2]);
            }
        }
        return Array.from(paths);
    }

    protected toPullRequestItem(data: Record<string, unknown>, params: Record<string, unknown>, fallbackRepo: string | undefined): Record<string, unknown> {
        const checks = this.normalizeChecks(data.statusCheckRollup);
        const ciStatus = this.computeCiStatus(checks);
        const isDraft = data.isDraft === true;
        const rawState = typeof data.state === 'string' ? data.state.toUpperCase() : 'OPEN';
        const state = rawState === 'MERGED'
            ? 'merged'
            : isDraft
                ? 'draft'
                : ciStatus === 'failing'
                    ? 'failing'
                    : ciStatus === 'pending'
                        ? 'in_progress'
                        : 'ready';
        const author = this.asRecord(data.author);
        return {
            cwd: this.extractString(params, ['cwd', 'gitRoot', 'root']) ?? process.cwd(),
            hostId: this.extractString(params, ['hostId']) ?? 'local',
            repo: fallbackRepo ?? this.extractRepositoryName(data.repository),
            number: this.extractNumber(data, ['number']),
            title: this.extractString(data, ['title']) ?? '',
            url: this.extractString(data, ['url']),
            state,
            isDraft,
            isAuthor: false,
            authorLogin: this.extractString(author, ['login']),
            authorAvatarUrl: this.extractString(author, ['avatarUrl']),
            headBranch: this.extractString(data, ['headRefName']) ?? '',
            baseBranch: this.extractString(data, ['baseRefName']) ?? '',
            canMerge: data.mergeable === 'MERGEABLE',
            mergeBlocker: data.mergeable === 'CONFLICTING' ? 'conflicts' : 'unknown',
            ciStatus,
            checks,
            commentAttachments: [],
            activityItems: [],
            updatedAt: this.extractString(data, ['updatedAt']),
            createdAt: this.extractString(data, ['createdAt'])
        };
    }

    protected normalizeChecks(value: unknown): Record<string, unknown>[] {
        if (!Array.isArray(value)) {
            return [];
        }
        return value.filter(this.isRecord).map(entry => {
            const conclusion = this.extractString(entry, ['conclusion'])?.toUpperCase();
            const status = this.extractString(entry, ['status'])?.toUpperCase();
            const normalizedStatus = conclusion === 'SUCCESS'
                ? 'passing'
                : conclusion === 'SKIPPED'
                    ? 'skipped'
                    : conclusion && conclusion !== 'SUCCESS'
                        ? 'failing'
                        : status && status !== 'COMPLETED'
                            ? 'pending'
                            : 'unknown';
            return {
                name: this.extractString(entry, ['name', 'workflowName']) ?? 'Check',
                status: normalizedStatus,
                link: this.extractString(entry, ['detailsUrl', 'url']),
                workflow: this.extractString(entry, ['workflowName'])
            };
        });
    }

    protected computeCiStatus(checks: Record<string, unknown>[]): string {
        if (checks.length === 0) {
            return 'none';
        }
        if (checks.some(check => check.status === 'failing')) {
            return 'failing';
        }
        if (checks.some(check => check.status === 'pending')) {
            return 'pending';
        }
        return 'passing';
    }

    protected normalizeActivityItems(data: Record<string, unknown>): Record<string, unknown>[] {
        const comments = Array.isArray(data.comments) ? data.comments.filter(this.isRecord) : [];
        const reviews = Array.isArray(data.reviews) ? data.reviews.filter(this.isRecord) : [];
        const commentItems = comments.map(comment => {
            const author = this.asRecord(comment.author);
            return {
                type: 'comment',
                id: this.extractString(comment, ['id']) ?? `${this.extractString(author, ['login']) ?? 'comment'}-${this.extractString(comment, ['createdAt']) ?? ''}`,
                authorLogin: this.extractString(author, ['login']),
                authorAvatarUrl: this.extractString(author, ['avatarUrl']),
                body: this.extractString(comment, ['body']) ?? '',
                createdAt: this.extractString(comment, ['createdAt']) ?? new Date().toISOString(),
                url: this.extractString(comment, ['url']),
                replies: []
            };
        });
        const reviewItems = reviews.map(review => {
            const author = this.asRecord(review.author);
            return {
                type: 'event',
                id: this.extractString(review, ['id']) ?? `${this.extractString(author, ['login']) ?? 'review'}-${this.extractString(review, ['submittedAt']) ?? ''}`,
                actorLogin: this.extractString(author, ['login']),
                event: this.normalizeReviewEvent(this.extractString(review, ['state'])),
                createdAt: this.extractString(review, ['submittedAt']) ?? new Date().toISOString()
            };
        }).filter(item => item.event !== null);
        return [...commentItems, ...reviewItems].sort((left, right) =>
            String(left.createdAt ?? '').localeCompare(String(right.createdAt ?? ''))
        );
    }

    protected normalizeReviewEvent(state: string | undefined): string | null {
        switch (state) {
            case 'APPROVED':
                return 'approved';
            case 'CHANGES_REQUESTED':
                return 'changes_requested';
            default:
                return null;
        }
    }

    protected commandResponse(result: CodexCommandResult, extra: Record<string, unknown> = {}): Record<string, unknown> {
        return {
            success: result.success,
            stdout: result.stdout,
            stderr: result.stderr,
            error: result.error,
            ...extra
        };
    }

    protected async withTempBodyFile(body: string, run: (bodyPath: string) => Promise<CodexCommandResult>): Promise<CodexCommandResult> {
        const bodyPath = path.join(os.tmpdir(), `codex-gh-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.md`);
        await fs.writeFile(bodyPath, body, 'utf8');
        try {
            return await run(bodyPath);
        } finally {
            await fs.unlink(bodyPath).catch(() => undefined);
        }
    }

    protected appendOptionalArg(args: string[], flag: string, value: string | undefined): void {
        if (value) {
            args.push(flag, value);
        }
    }

    protected extractPrSelector(record: Record<string, unknown>): string | undefined {
        const number = this.extractNumber(record, ['number', 'prNumber', 'pullRequestNumber']);
        if (number !== undefined) {
            return String(number);
        }
        const direct = this.extractString(record, ['url', 'prUrl', 'pullRequestUrl', 'selector']);
        if (direct) {
            return direct;
        }
        const item = this.asRecord(record.item) ?? this.asRecord(record.pr) ?? this.asRecord(record.pullRequest);
        return item ? this.extractPrSelector(item) : undefined;
    }

    protected extractRepo(record: Record<string, unknown>): string | undefined {
        const direct = this.extractString(record, ['repo']);
        if (direct) {
            return direct;
        }
        const repository = this.asRecord(record.repository);
        return repository ? this.extractRepositoryName(repository) : undefined;
    }

    protected extractRepositoryName(value: unknown): string | undefined {
        const record = this.asRecord(value);
        if (!record) {
            return undefined;
        }
        const nameWithOwner = this.extractString(record, ['nameWithOwner']);
        if (nameWithOwner) {
            return nameWithOwner;
        }
        const owner = this.asRecord(record.owner);
        const ownerName = this.extractString(owner ?? record, ['login', 'owner']);
        const repoName = this.extractString(record, ['name', 'repo', 'repoName']);
        return ownerName && repoName ? `${ownerName}/${repoName}` : undefined;
    }

    protected extractString(record: Record<string, unknown> | undefined, keys: string[]): string | undefined {
        if (!record) {
            return undefined;
        }
        for (const key of keys) {
            const value = record[key];
            if (typeof value === 'string' && value.length > 0) {
                return value;
            }
        }
        return undefined;
    }

    protected extractNumber(record: Record<string, unknown>, keys: string[]): number | undefined {
        for (const key of keys) {
            const value = record[key];
            if (typeof value === 'number' && Number.isInteger(value)) {
                return value;
            }
            if (typeof value === 'string') {
                const parsed = Number(value);
                if (Number.isInteger(parsed)) {
                    return parsed;
                }
            }
        }
        return undefined;
    }

    protected parseJsonRecord(value: string): Record<string, unknown> {
        try {
            const parsed = JSON.parse(value);
            return this.isRecord(parsed) ? parsed : {};
        } catch {
            return {};
        }
    }

    protected parseJsonArray(value: string): Record<string, unknown>[] {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed.filter(this.isRecord) : [];
        } catch {
            return [];
        }
    }

    protected asRecord(value: unknown): Record<string, unknown> | undefined {
        return this.isRecord(value) ? value : undefined;
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
}

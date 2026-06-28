// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { expect } from 'chai';
import { execFile } from 'child_process';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';
import { CodexGitWorkerService } from './codex-git-worker-service';
import { CodexGitWorktreeService } from './codex-git-worktree-service';
import { codexWorkerOk } from '../common/codex-worker-protocol';

const execFileAsync = promisify(execFile);

describe('CodexGitWorkerService', function () {
    this.timeout(10000);

    let worker: CodexGitWorkerService;
    let tempDirs: string[] = [];

    beforeEach(() => {
        const worktrees = new CodexGitWorktreeService();
        worker = new CodexGitWorkerService();
        (worker as unknown as { worktrees: CodexGitWorktreeService }).worktrees = worktrees;
    });

    afterEach(async () => {
        await Promise.all(tempDirs.map(dir => fs.rm(dir, { recursive: true, force: true })));
        tempDirs = [];
    });

    it('returns ok result envelope for stable-metadata', async () => {
        const response = await worker.handleRequest({
            id: 'req-1',
            method: 'stable-metadata',
            params: { params: { cwd: process.cwd() } }
        });
        expect(response.id).to.equal('req-1');
        expect(response.method).to.equal('stable-metadata');
        expect(response.result.type).to.equal('ok');
        const value = response.result.type === 'ok' ? response.result.value as { isRepo?: boolean } : undefined;
        expect(value).to.have.property('isRepo');
    });

    it('returns error for unknown git worker methods', async () => {
        const response = await worker.handleRequest({
            id: 'req-2',
            method: 'unknown-method',
            params: {}
        });
        expect(response.result.type).to.equal('error');
    });

    it('implements VS Code git status and review worker methods', async () => {
        const repo = await createTempGitRepo();
        await fs.writeFile(path.join(repo, 'file.txt'), 'changed\n', 'utf8');
        await fs.writeFile(path.join(repo, 'new.txt'), 'new\n', 'utf8');

        const status = await worker.handleRequest({
            id: 'status',
            method: 'status-summary',
            params: { cwd: repo }
        });
        expect(status.result.type).to.equal('ok');
        const statusValue = status.result.type === 'ok'
            ? status.result.value as { type: string; unstagedCount: number; untrackedCount: number }
            : undefined;
        expect(statusValue).to.include({ type: 'success', unstagedCount: 1, untrackedCount: 1 });

        const review = await worker.handleRequest({
            id: 'review',
            method: 'review-summary',
            params: { cwd: repo, source: 'unstaged' }
        });
        expect(review.result.type).to.equal('ok');
        const reviewValue = review.result.type === 'ok'
            ? review.result.value as { type: string; files: Array<{ path: string }> }
            : undefined;
        expect(reviewValue?.type).to.equal('success');
        expect(reviewValue?.files.map(file => file.path)).to.include('file.txt');

        const patch = await worker.handleRequest({
            id: 'patch',
            method: 'review-patch',
            params: { cwd: repo, source: 'unstaged' }
        });
        expect(patch.result.type).to.equal('ok');
        const patchValue = patch.result.type === 'ok'
            ? patch.result.value as { diff: { type: string; unifiedDiff: string } }
            : undefined;
        expect(patchValue?.diff.type).to.equal('success');
        expect(patchValue?.diff.unifiedDiff).to.contain('changed');
    });

    it('implements branch discovery methods used by the official webview', async () => {
        const repo = await createTempGitRepo();
        await runGit(repo, ['checkout', '-b', 'feature/codex-parity']);

        const recent = await worker.handleRequest({
            id: 'recent',
            method: 'recent-branches',
            params: { root: repo, limit: 5 }
        });
        expect(recent.result.type).to.equal('ok');
        const recentValue = recent.result.type === 'ok'
            ? recent.result.value as { branches: string[] }
            : undefined;
        expect(recentValue?.branches).to.include('feature/codex-parity');

        const exists = await worker.handleRequest({
            id: 'exists',
            method: 'branch-exists',
            params: { root: repo, branch: 'feature/codex-parity' }
        });
        expect(exists.result.type).to.equal('ok');
        const existsValue = exists.result.type === 'ok'
            ? exists.result.value as { exists: boolean }
            : undefined;
        expect(existsValue?.exists).to.equal(true);
    });

    async function createTempGitRepo(): Promise<string> {
        const repo = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-git-worker-'));
        tempDirs.push(repo);
        await runGit(repo, ['init', '-b', 'main']);
        await runGit(repo, ['config', 'user.email', 'codex@example.com']);
        await runGit(repo, ['config', 'user.name', 'Codex Test']);
        await fs.writeFile(path.join(repo, 'file.txt'), 'initial\n', 'utf8');
        await runGit(repo, ['add', 'file.txt']);
        await runGit(repo, ['commit', '-m', 'initial']);
        return repo;
    }

    async function runGit(cwd: string, args: string[]): Promise<void> {
        await execFileAsync('git', ['-C', cwd, ...args], { windowsHide: true });
    }
});

describe('codexWorkerOk', () => {
    it('wraps values in ok envelope', () => {
        expect(codexWorkerOk({ branch: 'main' })).to.deep.equal({
            type: 'ok',
            value: { branch: 'main' }
        });
    });
});

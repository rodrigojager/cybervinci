// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { expect } from 'chai';
import { CodexGitWorkerService } from './codex-git-worker-service';
import { CodexGitWorktreeService } from './codex-git-worktree-service';
import { codexWorkerOk } from '../common/codex-worker-protocol';

describe('CodexGitWorkerService', () => {
    let worker: CodexGitWorkerService;

    beforeEach(() => {
        const worktrees = new CodexGitWorktreeService();
        worker = new CodexGitWorkerService();
        (worker as unknown as { worktrees: CodexGitWorktreeService }).worktrees = worktrees;
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
});

describe('codexWorkerOk', () => {
    it('wraps values in ok envelope', () => {
        expect(codexWorkerOk({ branch: 'main' })).to.deep.equal({
            type: 'ok',
            value: { branch: 'main' }
        });
    });
});

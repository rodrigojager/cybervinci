// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { expect } from 'chai';
import { CodexGitWorktreeService } from './codex-git-worktree-service';

describe('CodexGitWorktreeService', () => {
    let service: CodexGitWorktreeService;

    beforeEach(() => {
        service = new CodexGitWorktreeService();
    });

    it('parses git worktree porcelain output', () => {
        const parsed = (service as unknown as {
            parseWorktreePorcelain(output: string): Array<{ path: string; branch: string | null }>;
        }).parseWorktreePorcelain([
            'worktree /tmp/repo',
            'HEAD abc123',
            'branch refs/heads/main',
            '',
            'worktree /tmp/repo-feature',
            'HEAD def456',
            'branch refs/heads/feature',
            ''
        ].join('\n'));
        expect(parsed).to.have.length(2);
        expect(parsed[0].branch).to.equal('main');
        expect(parsed[1].branch).to.equal('feature');
    });

    it('returns empty list for non-git directories', async () => {
        const worktrees = await service.listWorktrees('/non-existent-path');
        expect(worktrees).to.deep.equal([]);
    });
});

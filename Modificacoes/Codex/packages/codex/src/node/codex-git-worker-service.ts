// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { inject, injectable } from '@theia/core/shared/inversify';
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
        const cwd = typeof record.cwd === 'string' ? record.cwd : process.cwd();
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

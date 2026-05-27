// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { injectable } from '@theia/core/shared/inversify';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';
import { execFile } from 'child_process';
import { parseCodexRpcParams } from '../common/codex-host-protocol';

const execFileAsync = promisify(execFile);

export interface CodexGitOrigin {
    dir: string;
    root: string | null;
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
            origins.push({ dir, root: await this.resolveGitRoot(dir) });
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

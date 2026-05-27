// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { injectable } from '@theia/core/shared/inversify';
import * as path from 'path';
import { promisify } from 'util';
import { execFile } from 'child_process';

const execFileAsync = promisify(execFile);

export interface CodexGitWorktreeEntry {
    path: string;
    head: string;
    branch: string | null;
    bare: boolean;
    locked: boolean;
    prunable: boolean;
}

@injectable()
export class CodexGitWorktreeService {

    async listWorktrees(cwd: string): Promise<CodexGitWorktreeEntry[]> {
        try {
            const gitRoot = await this.resolveGitRoot(cwd);
            if (!gitRoot) {
                return [];
            }
            const { stdout } = await execFileAsync('git', ['-C', gitRoot, 'worktree', 'list', '--porcelain'], {
                windowsHide: true
            });
            return this.parseWorktreePorcelain(stdout);
        } catch {
            return [];
        }
    }

    async codexWorktrees(cwd: string): Promise<{ worktrees: CodexGitWorktreeEntry[] }> {
        const worktrees = await this.listWorktrees(cwd);
        return { worktrees };
    }

    protected parseWorktreePorcelain(output: string): CodexGitWorktreeEntry[] {
        const entries: CodexGitWorktreeEntry[] = [];
        let current: Partial<CodexGitWorktreeEntry> | undefined;
        for (const rawLine of output.split('\n')) {
            const line = rawLine.trim();
            if (line.startsWith('worktree ')) {
                if (current?.path) {
                    entries.push(this.finalizeWorktreeEntry(current));
                }
                current = { path: line.slice('worktree '.length), bare: false, locked: false, prunable: false };
                continue;
            }
            if (!current) {
                continue;
            }
            if (line.startsWith('HEAD ')) {
                current.head = line.slice('HEAD '.length);
            } else if (line.startsWith('branch ')) {
                const ref = line.slice('branch '.length);
                current.branch = ref.startsWith('refs/heads/') ? ref.slice('refs/heads/'.length) : ref;
            } else if (line === 'bare') {
                current.bare = true;
            } else if (line === 'locked') {
                current.locked = true;
            } else if (line === 'prunable') {
                current.prunable = true;
            }
        }
        if (current?.path) {
            entries.push(this.finalizeWorktreeEntry(current));
        }
        return entries;
    }

    protected finalizeWorktreeEntry(entry: Partial<CodexGitWorktreeEntry>): CodexGitWorktreeEntry {
        return {
            path: path.normalize(entry.path ?? ''),
            head: entry.head ?? '',
            branch: entry.branch ?? null,
            bare: entry.bare ?? false,
            locked: entry.locked ?? false,
            prunable: entry.prunable ?? false
        };
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

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

    async prepareWorktreeSnapshot(params: unknown): Promise<Record<string, unknown>> {
        const record = parseCodexRpcParams(params);
        const cwd = this.extractString(record, ['cwd', 'gitRoot', 'root']) ?? process.cwd();
        const gitRoot = await this.resolveGitRoot(cwd) ?? cwd;
        const repoName = path.basename(gitRoot);
        const filename = `${repoName}-${Date.now()}.tar.gz`;
        const tarballPath = path.join(os.tmpdir(), filename);
        const archive = await this.runCommand('git', ['-C', gitRoot, 'archive', '--format=tar.gz', '-o', tarballPath, 'HEAD']);
        if (!archive.success) {
            return {
                success: false,
                error: archive.error ?? archive.stderr,
                stdout: archive.stdout,
                stderr: archive.stderr
            };
        }
        const stat = await fs.stat(tarballPath);
        return {
            success: true,
            tarballPath,
            filePath: tarballPath,
            path: tarballPath,
            tarballFilename: filename,
            filename,
            tarballSize: stat.size,
            size: stat.size,
            contentType: 'application/gzip',
            repoName,
            gitRoot,
            branch: await this.currentBranch(gitRoot),
            commitSha: await this.currentCommit(gitRoot),
            remotes: await this.gitRemotes(gitRoot)
        };
    }

    async uploadWorktreeSnapshot(params: unknown): Promise<Record<string, unknown>> {
        const record = parseCodexRpcParams(params);
        const uploadUrl = this.extractString(record, ['uploadUrl', 'url']);
        const tarballPath = this.extractString(record, ['tarballPath', 'filePath', 'path']);
        if (!uploadUrl || !tarballPath) {
            return { success: false, error: 'Missing uploadUrl or tarballPath' };
        }
        const body = await fs.readFile(tarballPath);
        const headers: Record<string, string> = {
            'content-type': this.extractString(record, ['contentType']) ?? 'application/gzip'
        };
        const extraHeaders = this.isRecord(record.headers) ? record.headers : {};
        for (const [key, value] of Object.entries(extraHeaders)) {
            if (typeof value === 'string') {
                headers[key] = value;
            }
        }
        const response = await fetch(uploadUrl, {
            method: this.extractString(record, ['method']) ?? 'PUT',
            headers,
            body: new Uint8Array(body)
        });
        const responseBody = await response.text().catch(() => '');
        return {
            success: response.ok,
            status: response.status,
            statusText: response.statusText,
            body: responseBody
        };
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

    protected async currentBranch(gitRoot: string): Promise<string | null> {
        const result = await this.runCommand('git', ['-C', gitRoot, 'branch', '--show-current']);
        const branch = result.stdout.trim();
        return result.success && branch ? branch : null;
    }

    protected async currentCommit(gitRoot: string): Promise<string | null> {
        const result = await this.runCommand('git', ['-C', gitRoot, 'rev-parse', 'HEAD']);
        const commit = result.stdout.trim();
        return result.success && commit ? commit : null;
    }

    protected async gitRemotes(gitRoot: string): Promise<Array<{ name: string; url: string }>> {
        const result = await this.runCommand('git', ['-C', gitRoot, 'remote', '-v']);
        if (!result.success) {
            return [];
        }
        const remotes = new Map<string, string>();
        for (const rawLine of result.stdout.split(/\r?\n/)) {
            const match = /^(\S+)\s+(\S+)\s+\((fetch|push)\)$/.exec(rawLine.trim());
            if (match && !remotes.has(match[1])) {
                remotes.set(match[1], match[2]);
            }
        }
        return Array.from(remotes.entries()).map(([name, url]) => ({ name, url }));
    }

    protected async runCommand(command: string, args: string[]): Promise<{ success: boolean; stdout: string; stderr: string; error?: string }> {
        try {
            const { stdout, stderr } = await execFileAsync(command, args, {
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

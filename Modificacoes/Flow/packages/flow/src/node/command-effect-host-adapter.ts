import { spawn } from 'child_process';
import * as path from 'path';
import { FileUri } from '@theia/core/lib/common/file-uri';
import { injectable } from '@theia/core/shared/inversify';
import { decideFlowApprovalPolicy, redactFlowSecretsText } from '../common';

export const CommandEffectHostAdapter = Symbol('CommandEffectHostAdapter');

export interface CommandEffectRequest {
    command: string;
    cwd?: string;
    env?: Record<string, string | number | boolean | undefined>;
    allowedEnv?: string[];
    allowedCommands?: string[];
    timeoutMs?: number;
    approvalPolicy?: string;
}

export interface PreparedCommandEffect {
    command: string;
    args: string[];
    executable: string;
    workspaceRoot: string;
    cwd: string;
    relativeCwd: string;
    env: Record<string, string>;
    timeoutMs: number;
    approvalPolicy: string;
    requiresApproval: boolean;
    blocked: boolean;
    riskReasons: string[];
    reason?: string;
}

export interface AppliedCommandEffect extends PreparedCommandEffect {
    applied: boolean;
    status: 'proposed' | 'applied' | 'blocked' | 'failed';
    exitCode?: number | null;
    signal?: string | null;
    stdout: string;
    stderr: string;
    timedOut: boolean;
    startedAt?: string;
    completedAt?: string;
}

export interface CommandEffectHostAdapter {
    prepare(workspaceRootUri: string | undefined, effect: CommandEffectRequest): Promise<PreparedCommandEffect>;
    apply(workspaceRootUri: string | undefined, effect: CommandEffectRequest, approved?: boolean): Promise<AppliedCommandEffect>;
}

@injectable()
export class LocalCommandEffectHostAdapter implements CommandEffectHostAdapter {

    async prepare(workspaceRootUri: string | undefined, effect: CommandEffectRequest): Promise<PreparedCommandEffect> {
        const workspaceRoot = resolveWorkspaceRoot(workspaceRootUri);
        const parsed = parseCommandLine(effect.command);
        if (!parsed.length) {
            throw new Error('Command effect command is required.');
        }
        const cwd = resolveWorkspaceCwd(workspaceRoot, effect.cwd);
        const env = filterEnv(effect.env, effect.allowedEnv);
        const executable = parsed[0];
        const args = parsed.slice(1);
        const outsideCommandAllowlist = isOutsideCommandAllowlist(executable, effect.allowedCommands);
        const hasEnvOutsideAllowlist = Object.keys(effect.env || {}).some(key => !isAllowedEnvKey(key, effect.allowedEnv));
        const riskReasons = [
            outsideCommandAllowlist ? `command outside allowlist: ${executable}` : undefined,
            hasEnvOutsideAllowlist ? 'environment contains keys outside allowlist' : undefined
        ].filter((reason): reason is string => Boolean(reason));
        const policy = decideFlowApprovalPolicy({
            action: 'command_effect',
            requestedPolicy: effect.approvalPolicy,
            riskReasons,
            blockedReasons: outsideCommandAllowlist ? [`command outside allowlist: ${executable}`] : []
        });

        return {
            command: effect.command,
            executable,
            args,
            workspaceRoot,
            cwd: cwd.absolutePath,
            relativeCwd: cwd.relativePath,
            env,
            timeoutMs: normalizeTimeoutMs(effect.timeoutMs),
            approvalPolicy: policy.policy,
            requiresApproval: policy.requiresApproval,
            blocked: policy.blocked,
            riskReasons,
            reason: policy.message
        };
    }

    async apply(workspaceRootUri: string | undefined, effect: CommandEffectRequest, approved = false): Promise<AppliedCommandEffect> {
        const prepared = await this.prepare(workspaceRootUri, effect);
        if (prepared.blocked) {
            return commandResult(prepared, 'blocked', false, { stderr: prepared.reason || 'command blocked by policy' });
        }
        if (prepared.requiresApproval && !approved) {
            return commandResult(prepared, 'proposed', false, { stderr: `approval required by ${prepared.approvalPolicy}` });
        }
        return executePreparedCommand(prepared);
    }
}

function resolveWorkspaceRoot(workspaceRootUri: string | undefined): string {
    if (!workspaceRootUri) {
        throw new Error('workspaceRootUri is required to apply command effects.');
    }
    return path.resolve(FileUri.fsPath(workspaceRootUri));
}

function resolveWorkspaceCwd(workspaceRoot: string, requestedCwd: string | undefined): { absolutePath: string; relativePath: string } {
    const normalizedRequest = (requestedCwd || '.').replace(/\\/g, '/').trim() || '.';
    if (path.isAbsolute(normalizedRequest) || normalizedRequest.includes('\0')) {
        throw new Error(`Command effect cwd must be relative inside the workspace: ${requestedCwd}`);
    }
    const absolutePath = path.resolve(workspaceRoot, normalizedRequest);
    const relativeToWorkspace = path.relative(workspaceRoot, absolutePath);
    if (relativeToWorkspace.startsWith('..') || path.isAbsolute(relativeToWorkspace)) {
        throw new Error(`Command effect cwd escapes the workspace: ${requestedCwd}`);
    }
    return {
        absolutePath,
        relativePath: relativeToWorkspace.replace(/\\/g, '/') || '.'
    };
}

function filterEnv(env: CommandEffectRequest['env'], allowedEnv: string[] | undefined): Record<string, string> {
    const filtered: Record<string, string> = {};
    for (const [key, value] of Object.entries(env || {})) {
        if (!isAllowedEnvKey(key, allowedEnv) || value === undefined) {
            continue;
        }
        filtered[key] = String(value);
    }
    return filtered;
}

function isAllowedEnvKey(key: string, allowedEnv: string[] | undefined): boolean {
    const normalizedKey = key.trim();
    if (!normalizedKey || normalizedKey.includes('\0')) {
        return false;
    }
    if (!allowedEnv || allowedEnv.length === 0) {
        return false;
    }
    return allowedEnv.includes(normalizedKey);
}

function isOutsideCommandAllowlist(executable: string, allowedCommands: string[] | undefined): boolean {
    const allowed = (allowedCommands || []).map(command => command.trim()).filter(Boolean);
    if (!allowed.length) {
        return true;
    }
    return !allowed.includes(executable);
}

function normalizeTimeoutMs(timeoutMs: number | undefined): number {
    const parsed = Number.parseInt(String(timeoutMs ?? ''), 10);
    if (Number.isFinite(parsed) && parsed > 0) {
        return Math.min(parsed, 300000);
    }
    return 30000;
}

function executePreparedCommand(prepared: PreparedCommandEffect): Promise<AppliedCommandEffect> {
    const startedAt = new Date().toISOString();
    return new Promise(resolve => {
        const child = spawn(prepared.executable, prepared.args, {
            cwd: prepared.cwd,
            env: { ...process.env, ...prepared.env },
            shell: false,
            windowsHide: true
        });
        let stdout = '';
        let stderr = '';
        let timedOut = false;
        const timer = setTimeout(() => {
            timedOut = true;
            child.kill();
        }, prepared.timeoutMs);
        child.stdout?.on('data', chunk => stdout += String(chunk));
        child.stderr?.on('data', chunk => stderr += String(chunk));
        child.on('error', error => {
            clearTimeout(timer);
            resolve(commandResult(prepared, 'failed', true, {
                stderr: error.message,
                timedOut,
                startedAt,
                completedAt: new Date().toISOString()
            }));
        });
        child.on('close', (exitCode, signal) => {
            clearTimeout(timer);
            resolve(commandResult(prepared, exitCode === 0 && !timedOut ? 'applied' : 'failed', true, {
                exitCode,
                signal,
                stdout,
                stderr,
                timedOut,
                startedAt,
                completedAt: new Date().toISOString()
            }));
        });
    });
}

function commandResult(
    prepared: PreparedCommandEffect,
    status: AppliedCommandEffect['status'],
    applied: boolean,
    patch: Partial<AppliedCommandEffect>
): AppliedCommandEffect {
    return {
        ...prepared,
        applied,
        status,
        exitCode: patch.exitCode,
        signal: patch.signal,
        stdout: redactOutput(patch.stdout || ''),
        stderr: redactOutput(patch.stderr || ''),
        timedOut: Boolean(patch.timedOut),
        startedAt: patch.startedAt,
        completedAt: patch.completedAt
    };
}

function redactOutput(value: string): string {
    const redacted = redactFlowSecretsText(value) || '';
    if (redacted.length <= 12000) {
        return redacted;
    }
    return `${redacted.slice(0, 12000)}\n[truncated command output]`;
}

function parseCommandLine(value: string): string[] {
    const trimmed = value.trim();
    if (!trimmed) {
        return [];
    }
    if (trimmed.startsWith('[')) {
        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
                return parsed.map(String).filter(Boolean);
            }
        } catch {
            // fall through to shell-like split
        }
    }
    return shellSplit(trimmed);
}

function shellSplit(value: string): string[] {
    const tokens: string[] = [];
    let token = '';
    let quote: string | undefined;
    for (let i = 0; i < value.length; i++) {
        const char = value[i];
        if ((char === '"' || char === '\'') && quote === undefined) {
            quote = char;
            continue;
        }
        if (char === quote) {
            quote = undefined;
            continue;
        }
        if (char === '\\' && i + 1 < value.length && quote !== '\'') {
            token += value[i + 1];
            i++;
            continue;
        }
        if (/\s/.test(char) && quote === undefined) {
            if (token) {
                tokens.push(token);
                token = '';
            }
            continue;
        }
        token += char;
    }
    if (token) {
        tokens.push(token);
    }
    return tokens;
}

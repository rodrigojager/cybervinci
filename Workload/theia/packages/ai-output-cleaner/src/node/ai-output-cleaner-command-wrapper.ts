// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import * as path from 'path';
import { spawn } from 'child_process';
import { AIOutputCleanerService } from '../common/ai-output-cleaner-service';
import {
    OUTPUT_CLEANER_CODEX_ENV_MODE,
    OUTPUT_CLEANER_CODEX_ENV_ORIGINAL_PATH,
    OUTPUT_CLEANER_CODEX_ENV_SESSION,
    OUTPUT_CLEANER_CODEX_ENV_WRAPPER_BIN
} from '../common/ai-output-cleaner-codex-env-types';
import { AIOutputCleanerMode } from '../common/ai-output-cleaner-types';
import { AIOutputCleanerArtifactStore } from './ai-output-cleaner-artifact-store';
import { AIOutputCleanerStatusTracker } from './ai-output-cleaner-status-tracker';

interface WrapperCliOptions {
    command: string;
    args: string[];
}

export interface WrapperExecutionPlan {
    command: string;
    args: string[];
    shouldBufferOutput: boolean;
}

export function parseWrapperCliArgs(argv: string[]): WrapperCliOptions {
    const args = [...argv];
    if (args[0] !== '--command' || !args[1]) {
        throw new Error('Usage: ai-output-cleaner-command-wrapper.js --command <name> [args...]');
    }
    return {
        command: args[1],
        args: args.slice(2)
    };
}

export function createWrapperExecutionPlan(command: string, args: string[]): WrapperExecutionPlan {
    const normalizedCommand = command.toLowerCase();
    const subcommand = args[0]?.toLowerCase();
    const shouldBufferOutput = normalizedCommand === 'git'
        ? ['status', 'branch', 'remote', 'log'].includes(subcommand ?? '')
        : normalizedCommand === 'rg' || normalizedCommand === 'grep';
    return {
        command: normalizedCommand,
        args,
        shouldBufferOutput
    };
}

export async function runWrapperCommand(options: WrapperCliOptions): Promise<number> {
    const plan = createWrapperExecutionPlan(options.command, options.args);
    const executable = await resolveRealExecutable(plan.command);
    const store = new AIOutputCleanerArtifactStore();
    const statusTracker = new AIOutputCleanerStatusTracker();
    const startedAt = new Date().toISOString();
    const childEnv = createChildEnvironment();
    const child = spawn(executable, plan.args, {
        cwd: process.cwd(),
        env: childEnv,
        shell: false,
        windowsHide: true
    });

    let stdout = '';
    let stderr = '';
    let settled = false;

    await statusTracker.record({
        command: plan.command,
        args: plan.args,
        cwd: process.cwd(),
        origin: 'codex-provider-wrapper',
        sessionId: process.env[OUTPUT_CLEANER_CODEX_ENV_SESSION],
        pid: child.pid,
        status: 'running',
        startedAt,
        rawStdout: '',
        rawStderr: ''
    });

    return await new Promise<number>((resolve, reject) => {
        child.stdout.on('data', chunk => {
            const text = String(chunk);
            stdout += text;
            if (!plan.shouldBufferOutput) {
                process.stdout.write(text);
            }
        });
        child.stderr.on('data', chunk => {
            const text = String(chunk);
            stderr += text;
            if (!plan.shouldBufferOutput) {
                process.stderr.write(text);
            }
        });
        child.on('error', async error => {
            if (settled) {
                return;
            }
            settled = true;
            try {
                const completedAt = new Date().toISOString();
                const message = error instanceof Error ? error.message : String(error);
                stderr = stderr ? `${stderr}\n${message}` : message;
                const artifact = await store.saveArtifact({
                    command: plan.command,
                    args: plan.args,
                    cwd: process.cwd(),
                    origin: 'codex-provider-wrapper',
                    sessionId: process.env[OUTPUT_CLEANER_CODEX_ENV_SESSION],
                    exitCode: 1,
                    startedAt,
                    completedAt,
                    stdout,
                    stderr
                });
                await statusTracker.record({
                    command: plan.command,
                    args: plan.args,
                    cwd: process.cwd(),
                    origin: 'codex-provider-wrapper',
                    sessionId: process.env[OUTPUT_CLEANER_CODEX_ENV_SESSION],
                    pid: child.pid,
                    exitCode: 1,
                    status: 'failed',
                    startedAt,
                    completedAt,
                    rawStdout: stdout,
                    rawStderr: stderr
                }, artifact);
                reject(error);
            } catch (persistenceError) {
                reject(persistenceError);
            }
        });
        child.on('close', async code => {
            if (settled) {
                return;
            }
            settled = true;
            try {
                const exitCode = code ?? 1;
                const completedAt = new Date().toISOString();
                const cleaner = new AIOutputCleanerService({
                    enabled: true,
                    mode: readCleanerMode()
                });
                const cleanResult = cleaner.clean({
                    origin: 'codex-provider-wrapper',
                    command: plan.command,
                    args: [plan.command, ...plan.args],
                    stdout,
                    stderr,
                    exitCode,
                    status: exitCode === 0 ? 'completed' : 'failed'
                });

                const artifact = await store.saveArtifact({
                    command: plan.command,
                    args: plan.args,
                    cwd: process.cwd(),
                    origin: 'codex-provider-wrapper',
                    sessionId: process.env[OUTPUT_CLEANER_CODEX_ENV_SESSION],
                    exitCode,
                    startedAt,
                    completedAt,
                    filtersApplied: cleanResult.filtersApplied,
                    stdout,
                    stderr
                });
                await statusTracker.record({
                    command: plan.command,
                    args: plan.args,
                    cwd: process.cwd(),
                    origin: 'codex-provider-wrapper',
                    sessionId: process.env[OUTPUT_CLEANER_CODEX_ENV_SESSION],
                    pid: child.pid,
                    exitCode,
                    status: exitCode === 0 ? 'completed' : 'failed',
                    startedAt,
                    completedAt,
                    rawStdout: stdout,
                    rawStderr: stderr,
                    cleanedStdout: cleanResult.stdout,
                    cleanedStderr: cleanResult.stderr,
                    changed: cleanResult.changed,
                    filtersApplied: cleanResult.filtersApplied,
                    notice: cleanResult.notice
                }, artifact);

                if (plan.shouldBufferOutput) {
                    if (cleanResult.stdout) {
                        process.stdout.write(cleanResult.stdout);
                        if (!cleanResult.stdout.endsWith('\n')) {
                            process.stdout.write('\n');
                        }
                    }
                    if (cleanResult.notice) {
                        process.stdout.write(`${cleanResult.notice}\n`);
                    }
                    if (cleanResult.stderr) {
                        process.stderr.write(cleanResult.stderr);
                        if (!cleanResult.stderr.endsWith('\n')) {
                            process.stderr.write('\n');
                        }
                    }
                }
                resolve(exitCode);
            } catch (error) {
                reject(error);
            }
        });
    });
}

export async function resolveRealExecutable(command: string): Promise<string> {
    const wrapperBin = process.env[OUTPUT_CLEANER_CODEX_ENV_WRAPPER_BIN];
    const originalPath = process.env[OUTPUT_CLEANER_CODEX_ENV_ORIGINAL_PATH];
    const pathValue = originalPath || process.env.PATH || '';
    const searchEntries = pathValue
        .split(path.delimiter)
        .filter(entry => !!entry)
        .filter(entry => !wrapperBin || !isSamePath(entry, wrapperBin));

    const candidates = command.includes(path.sep) || command.includes('/')
        ? [command]
        : searchEntries.flatMap(entry => expandExecutableCandidates(entry, command));

    for (const candidate of candidates) {
        try {
            await import('fs/promises').then(fs => fs.access(candidate));
            return candidate;
        } catch {
            // Ignore and continue searching.
        }
    }

    throw new Error(`Unable to resolve real executable for '${command}'.`);
}

function expandExecutableCandidates(entry: string, command: string): string[] {
    const commandPath = path.join(entry, command);
    if (process.platform !== 'win32') {
        return [commandPath];
    }
    const pathext = (process.env.PATHEXT || '.COM;.EXE;.BAT;.CMD')
        .split(';')
        .filter(Boolean)
        .map(ext => ext.toLowerCase());
    if (path.extname(commandPath)) {
        return [commandPath];
    }
    return [commandPath, ...pathext.map(ext => `${commandPath}${ext}`)];
}

function createChildEnvironment(): NodeJS.ProcessEnv {
    const env: NodeJS.ProcessEnv = { ...process.env };
    const originalPath = process.env[OUTPUT_CLEANER_CODEX_ENV_ORIGINAL_PATH];
    if (originalPath) {
        const pathKey = findPathKey(env);
        env[pathKey] = originalPath;
    }
    return env;
}

function readCleanerMode(): AIOutputCleanerMode {
    const mode = process.env[OUTPUT_CLEANER_CODEX_ENV_MODE];
    switch (mode) {
        case 'off':
        case 'raw':
        case 'safe':
        case 'command-noise':
        case 'status-aware':
        case 'aggressive':
            return mode;
        default:
            return 'safe';
    }
}

function findPathKey(env: NodeJS.ProcessEnv): string {
    return Object.keys(env).find(key => key.toLowerCase() === 'path') || 'PATH';
}

function isSamePath(left: string, right: string): boolean {
    return process.platform === 'win32'
        ? path.resolve(left).toLowerCase() === path.resolve(right).toLowerCase()
        : path.resolve(left) === path.resolve(right);
}

if (require.main === module) {
    runWrapperCommand(parseWrapperCliArgs(process.argv.slice(2)))
        .then(exitCode => process.exit(exitCode))
        .catch(error => {
            process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
            process.exit(1);
        });
}

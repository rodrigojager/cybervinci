// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { injectable } from '@theia/core/shared/inversify';
import {
    AIOutputCleanerCodexHookArtifactsStatus,
    AIOutputCleanerCodexHooksCapabilityStatus,
    AIOutputCleanerCodexHooksReadiness,
    AIOutputCleanerCodexHooksStatus
} from '../common/ai-output-cleaner-codex-hooks-types';

@injectable()
export class AIOutputCleanerCodexHooksStatusService {
    protected static readonly BEGIN_MARKER = '# >>> CyberVinci AI Output Cleaner hooks >>>';
    protected static readonly END_MARKER = '# <<< CyberVinci AI Output Cleaner hooks <<<';
    protected static readonly MANAGED_EVENTS = [
        'SessionStart',
        'UserPromptSubmit',
        'PreToolUse',
        'PermissionRequest',
        'PostToolUse',
        'Stop'
    ];

    async getStatus(): Promise<AIOutputCleanerCodexHooksStatus> {
        const capability = await this.detectCapability();
        const artifacts = await this.prepareArtifacts();
        const readiness = this.resolveReadiness(capability, artifacts);
        return {
            readiness,
            available: capability.available,
            supported: capability.supported,
            configured: artifacts.configured,
            summary: this.buildSummary(readiness, capability, artifacts),
            capability: {
                ...capability,
                readiness
            },
            artifacts: {
                ...artifacts,
                readiness
            }
        };
    }

    async install(): Promise<AIOutputCleanerCodexHooksStatus> {
        const artifacts = await this.prepareArtifacts();
        await fs.mkdir(path.dirname(this.getCodexConfigPath()), { recursive: true });
        const current = await this.readConfigFile();
        const next = this.upsertManagedBlock(current, this.buildManagedConfigBlock(artifacts.helperScriptPath));
        await fs.writeFile(this.getCodexConfigPath(), next, 'utf8');
        await this.writeRuntimeState({ enabled: true, updatedAt: new Date().toISOString() });
        return this.getStatus();
    }

    async remove(): Promise<AIOutputCleanerCodexHooksStatus> {
        const current = await this.readConfigFile();
        const next = this.removeManagedBlock(current);
        if (next !== current) {
            await fs.mkdir(path.dirname(this.getCodexConfigPath()), { recursive: true });
            await fs.writeFile(this.getCodexConfigPath(), next, 'utf8');
        }
        await this.writeRuntimeState({ enabled: false, updatedAt: new Date().toISOString() });
        return this.getStatus();
    }

    async setRuntimeEnabled(enabled: boolean): Promise<AIOutputCleanerCodexHooksStatus> {
        await this.prepareArtifacts();
        await this.writeRuntimeState({ enabled, updatedAt: new Date().toISOString() });
        return this.getStatus();
    }

    protected async detectCapability(): Promise<AIOutputCleanerCodexHooksCapabilityStatus> {
        const checkedAt = new Date().toISOString();
        const executablePath = await this.resolveCodexExecutablePath();
        const helpOutput = executablePath ? await this.tryRun(executablePath, ['--help']) : undefined;
        const versionOutput = executablePath ? await this.tryRun(executablePath, ['--version']) : undefined;
        const binaryPath = executablePath ? await this.resolveCodexBinaryPath(executablePath) : undefined;
        const binaryContents = binaryPath ? await this.tryRead(binaryPath) : undefined;
        const helpMentionsHookTrustBypass = helpOutput?.includes('--dangerously-bypass-hook-trust') ?? false;
        const binaryMentionsConfigRequirementsHooks = binaryContents?.includes('configRequirements.read.hooks') ?? false;
        const configSyntaxDocumentedInHelp = this.hasHookConfigSyntax(helpOutput);
        const evidence: string[] = [];
        if (helpMentionsHookTrustBypass) {
            evidence.push('help exposes --dangerously-bypass-hook-trust');
        }
        if (binaryMentionsConfigRequirementsHooks) {
            evidence.push('native binary contains configRequirements.read.hooks');
        }
        if (helpOutput && !configSyntaxDocumentedInHelp) {
            evidence.push('help does not document hook config syntax');
        }
        if (!executablePath) {
            evidence.push('codex executable not found on PATH');
        }
        const available = Boolean(executablePath);
        const supported = available && (helpMentionsHookTrustBypass || binaryMentionsConfigRequirementsHooks);
        return {
            readiness: supported ? 'supported' : 'unknown',
            available,
            supported,
            postToolUseCanReplaceToolResult: true,
            codexVersion: versionOutput?.trim() || undefined,
            executablePath: executablePath || undefined,
            binaryPath,
            homePath: this.getCodexHomePath(),
            configPath: this.getCodexConfigPath(),
            helpMentionsHookTrustBypass,
            binaryMentionsConfigRequirementsHooks,
            configSyntaxDocumentedInHelp,
            evidence,
            checkedAt
        };
    }

    protected async prepareArtifacts(): Promise<AIOutputCleanerCodexHookArtifactsStatus> {
        const rootPath = this.getArtifactsRootPath();
        const helperScriptPath = path.join(rootPath, 'ai-output-cleaner-hook.cjs');
        const readmePath = path.join(rootPath, 'README.md');
        const eventLogPath = path.join(rootPath, 'hook-events.ndjson');
        const runtimeStatePath = path.join(rootPath, 'runtime-state.json');
        const errors: string[] = [];

        try {
            await fs.mkdir(rootPath, { recursive: true });
            await fs.writeFile(helperScriptPath, this.getHelperScriptContents(), 'utf8');
            await fs.writeFile(readmePath, this.getReadmeContents(helperScriptPath, eventLogPath, runtimeStatePath), 'utf8');
            await fs.writeFile(eventLogPath, '', { encoding: 'utf8', flag: 'a' });
            await this.ensureRuntimeState(runtimeStatePath);
        } catch (error) {
            errors.push(String(error));
        }

        const eventSummary = await this.readEventSummary(eventLogPath);
        const runtimeState = await this.readRuntimeState(runtimeStatePath);
        const managedBlockInstalled = await this.hasManagedBlockInConfig();
        return {
            readiness: errors.length === 0 ? 'prepared' : 'unknown',
            rootPath,
            helperScriptPath,
            readmePath,
            eventLogPath,
            runtimeStatePath,
            prepared: errors.length === 0,
            configured: managedBlockInstalled,
            runtimeEnabled: runtimeState.enabled,
            managedBlockInstalled,
            eventCount: eventSummary.count,
            installedEvents: managedBlockInstalled ? [...AIOutputCleanerCodexHooksStatusService.MANAGED_EVENTS] : [],
            lastEventAt: eventSummary.lastEventAt,
            lastEventPreview: eventSummary.lastEventPreview,
            errors
        };
    }

    protected resolveReadiness(
        capability: AIOutputCleanerCodexHooksCapabilityStatus,
        artifacts: AIOutputCleanerCodexHookArtifactsStatus
    ): AIOutputCleanerCodexHooksReadiness {
        if (artifacts.configured) {
            return 'configured';
        }
        if (artifacts.prepared) {
            return capability.supported ? 'prepared' : 'unknown';
        }
        return capability.supported ? 'supported' : 'unknown';
    }

    protected buildSummary(
        readiness: AIOutputCleanerCodexHooksReadiness,
        capability: AIOutputCleanerCodexHooksCapabilityStatus,
        artifacts: AIOutputCleanerCodexHookArtifactsStatus
    ): string {
        if (!capability.available) {
            return 'Codex Provider not found locally; hook support is unknown.';
        }
        if (!capability.supported) {
            return 'Codex Provider is present, but local hook support could not be confirmed safely.';
        }
        if (readiness === 'configured') {
            return artifacts.runtimeEnabled
                ? 'Codex hook support was detected and the AI Output Cleaner hook block is installed in ~/.codex/config.toml.'
                : 'Codex hook support was detected and the AI Output Cleaner hook block is installed, but runtime handling is disabled locally.';
        }
        if (readiness === 'prepared') {
            return artifacts.eventCount > 0
                ? 'Codex hook support was detected and AI Output Cleaner hook artifacts are prepared locally.'
                : 'Codex hook support was detected and AI Output Cleaner hook artifacts were prepared locally without modifying ~/.codex/config.toml.';
        }
        return 'Codex hook support was detected locally, but AI Output Cleaner did not confirm prepared artifacts.';
    }

    protected getCodexHomePath(): string {
        return process.env.CODEX_HOME?.trim() || path.join(os.homedir(), '.codex');
    }

    protected getCodexConfigPath(): string {
        return path.join(this.getCodexHomePath(), 'config.toml');
    }

    protected getArtifactsRootPath(): string {
        return path.join(os.homedir(), '.cybervinci', 'ai-output-cleaner', 'codex-hooks');
    }

    protected async ensureRuntimeState(runtimeStatePath: string): Promise<void> {
        try {
            await fs.access(runtimeStatePath);
        } catch {
            await this.writeRuntimeState({ enabled: true, updatedAt: new Date().toISOString() }, runtimeStatePath);
        }
    }

    protected async readRuntimeState(runtimeStatePath = path.join(this.getArtifactsRootPath(), 'runtime-state.json')): Promise<{ enabled: boolean; updatedAt?: string; }> {
        try {
            const contents = await fs.readFile(runtimeStatePath, 'utf8');
            const parsed = JSON.parse(contents) as { enabled?: boolean; updatedAt?: string; };
            return {
                enabled: parsed.enabled !== false,
                updatedAt: parsed.updatedAt
            };
        } catch {
            return { enabled: true };
        }
    }

    protected async writeRuntimeState(
        state: { enabled: boolean; updatedAt: string; },
        runtimeStatePath = path.join(this.getArtifactsRootPath(), 'runtime-state.json')
    ): Promise<void> {
        await fs.mkdir(path.dirname(runtimeStatePath), { recursive: true });
        await fs.writeFile(runtimeStatePath, JSON.stringify(state, undefined, 2), 'utf8');
    }

    protected async readConfigFile(): Promise<string> {
        try {
            return await fs.readFile(this.getCodexConfigPath(), 'utf8');
        } catch {
            return '';
        }
    }

    protected async hasManagedBlockInConfig(): Promise<boolean> {
        return this.readConfigFile().then(contents => contents.includes(AIOutputCleanerCodexHooksStatusService.BEGIN_MARKER));
    }

    protected upsertManagedBlock(contents: string, block: string): string {
        const withoutBlock = this.removeManagedBlock(contents).trimEnd();
        if (!withoutBlock) {
            return `${block}\n`;
        }
        return `${withoutBlock}\n\n${block}\n`;
    }

    protected removeManagedBlock(contents: string): string {
        const pattern = new RegExp(
            `${this.escapeForRegex(AIOutputCleanerCodexHooksStatusService.BEGIN_MARKER)}[\\s\\S]*?${this.escapeForRegex(AIOutputCleanerCodexHooksStatusService.END_MARKER)}\\r?\\n?`,
            'g'
        );
        return contents.replace(pattern, '').replace(/\n{3,}/g, '\n\n').trimEnd() + (contents.endsWith('\n') ? '\n' : '');
    }

    protected escapeForRegex(value: string): string {
        return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    protected buildManagedConfigBlock(helperScriptPath: string): string {
        const command = this.asTomlCommand(helperScriptPath);
        const sections = AIOutputCleanerCodexHooksStatusService.MANAGED_EVENTS.map(eventName => this.buildEventBlock(eventName, command));
        return [
            AIOutputCleanerCodexHooksStatusService.BEGIN_MARKER,
            '# Installed by the CyberVinci AI Output Cleaner. Remove via the matching UI command.',
            ...sections,
            AIOutputCleanerCodexHooksStatusService.END_MARKER
        ].join('\n');
    }

    protected buildEventBlock(eventName: string, command: string): string {
        const matcherLine = eventName === 'SessionStart'
            ? 'matcher = "^startup$|^resume$|^clear$"\n'
            : '';
        return `[[hooks.${eventName}]]
${matcherLine}[[hooks.${eventName}.hooks]]
type = "command"
command = '${command} ${eventName}'
timeout = 30
statusMessage = "CyberVinci AI Output Cleaner ${eventName}"`;
    }

    protected asTomlCommand(helperScriptPath: string): string {
        const normalizedPath = helperScriptPath.replace(/\\/g, '/').replace(/'/g, "\\'");
        return `node "${normalizedPath}"`;
    }

    protected hasHookConfigSyntax(helpOutput: string | undefined): boolean {
        if (!helpOutput) {
            return false;
        }
        return /hooks(\.|\[|=)/.test(helpOutput);
    }

    protected async resolveCodexExecutablePath(): Promise<string | undefined> {
        const locator = process.platform === 'win32' ? 'where.exe' : 'which';
        const output = await this.tryRun(locator, ['codex']);
        return output
            ?.split(/\r?\n/)
            .map(line => line.trim())
            .find(Boolean);
    }

    protected async resolveCodexBinaryPath(executablePath: string): Promise<string | undefined> {
        if (process.platform !== 'win32') {
            return executablePath;
        }
        const scriptDir = path.dirname(executablePath.replace(/\//g, path.sep));
        const packageRoot = path.join(scriptDir, 'node_modules', '@openai', 'codex');
        const binaryPath = path.join(
            packageRoot,
            'node_modules',
            '@openai',
            'codex-win32-x64',
            'vendor',
            'x86_64-pc-windows-msvc',
            'codex',
            'codex.exe'
        );
        try {
            await fs.access(binaryPath);
            return binaryPath;
        } catch {
            return undefined;
        }
    }

    protected async readEventSummary(eventLogPath: string): Promise<{ count: number; lastEventAt?: string; lastEventPreview?: string; }> {
        try {
            const contents = await fs.readFile(eventLogPath, 'utf8');
            const lines = contents
                .split(/\r?\n/)
                .map(line => line.trim())
                .filter(Boolean);
            if (lines.length === 0) {
                return { count: 0 };
            }
            const lastEntry = JSON.parse(lines[lines.length - 1]) as { recordedAt?: string; argv?: string[]; };
            return {
                count: lines.length,
                lastEventAt: lastEntry.recordedAt,
                lastEventPreview: Array.isArray(lastEntry.argv) && lastEntry.argv.length > 0
                    ? lastEntry.argv.join(' ')
                    : 'hook invocation recorded'
            };
        } catch {
            return { count: 0 };
        }
    }

    protected async tryRead(targetPath: string): Promise<string | undefined> {
        try {
            const buffer = await fs.readFile(targetPath);
            return buffer.toString('latin1');
        } catch {
            return undefined;
        }
    }

    protected async tryRun(command: string, args: string[]): Promise<string | undefined> {
        try {
            return await this.run(command, args);
        } catch {
            return undefined;
        }
    }

    protected run(command: string, args: string[]): Promise<string> {
        return new Promise((resolve, reject) => {
            const child = spawn(command, args, {
                stdio: ['ignore', 'pipe', 'pipe']
            });
            const stdout: Buffer[] = [];
            const stderr: Buffer[] = [];
            child.stdout.on('data', chunk => stdout.push(Buffer.from(chunk)));
            child.stderr.on('data', chunk => stderr.push(Buffer.from(chunk)));
            child.on('error', reject);
            child.on('close', code => {
                if (code === 0) {
                    resolve(Buffer.concat(stdout).toString('utf8'));
                    return;
                }
                reject(new Error(Buffer.concat(stderr).toString('utf8') || `Command failed with exit code ${code}`));
            });
        });
    }

    protected getHelperScriptContents(): string {
        return `#!/usr/bin/env node
const fs = require('fs/promises');
const os = require('os');
const path = require('path');

async function readStdin() {
    const chunks = [];
    for await (const chunk of process.stdin) {
        chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString('utf8');
}

async function main() {
    const root = process.env.CYBERVINCI_OUTPUT_CLEANER_HOOK_ROOT || path.join(os.homedir(), '.cybervinci', 'ai-output-cleaner', 'codex-hooks');
    const eventLogPath = path.join(root, 'hook-events.ndjson');
    const runtimeStatePath = path.join(root, 'runtime-state.json');
    await fs.mkdir(root, { recursive: true });
    let runtimeEnabled = true;
    try {
        const runtimeState = JSON.parse(await fs.readFile(runtimeStatePath, 'utf8'));
        runtimeEnabled = runtimeState.enabled !== false;
    } catch {
        runtimeEnabled = true;
    }
    if (!runtimeEnabled) {
        return;
    }
    const argv = process.argv.slice(2);
    const stdin = await readStdin();
    const payload = {
        recordedAt: new Date().toISOString(),
        argv,
        stdin
    };
    await fs.appendFile(eventLogPath, JSON.stringify(payload) + '\\n', 'utf8');
}

main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});
`;
    }

    protected getReadmeContents(helperScriptPath: string, eventLogPath: string, runtimeStatePath: string): string {
        return `# CyberVinci Codex hook groundwork

These files are prepared locally by the AI Output Cleaner.

- Helper script: \`${helperScriptPath}\`
- Event log: \`${eventLogPath}\`
- Runtime switch: \`${runtimeStatePath}\`

This helper follows the official Codex hooks documentation at <https://developers.openai.com/codex/hooks>.
The extension only installs a managed block in \`~/.codex/config.toml\` when explicitly asked.
Set \`enabled=false\` in the runtime switch file to disable hook handling without editing \`config.toml\`.
`;
    }
}

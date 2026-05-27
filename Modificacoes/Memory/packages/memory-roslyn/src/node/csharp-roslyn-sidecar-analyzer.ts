// *****************************************************************************
// Copyright (C) 2026.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { spawn } from 'child_process';
import { constants as fsConstants } from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
    LanguageAnalysisContext,
    LanguageAnalysisResult,
    MemoryFile,
    MemoryLanguageAnalyzer
} from '@cybervinci/memory/lib/common';
import { CSharpStructuralAnalyzer } from '@cybervinci/memory/lib/node/analysis/csharp-structural-analyzer';

export const CSHARP_ROSLYN_SIDECAR_CONTRACT_VERSION = 1;

export interface CSharpRoslynSidecarRequest {
    schemaVersion: typeof CSHARP_ROSLYN_SIDECAR_CONTRACT_VERSION;
    requestId?: string;
    languageId: 'csharp';
    workspacePath: string;
    workspaceFilePath?: string;
    file: MemoryFile;
    content: string;
}

export interface CSharpRoslynSidecarError {
    code?: string;
    message: string;
    detail?: string;
}

export interface CSharpRoslynSidecarResponse {
    schemaVersion: typeof CSHARP_ROSLYN_SIDECAR_CONTRACT_VERSION;
    requestId?: string;
    result?: LanguageAnalysisResult;
    diagnostics?: import('@cybervinci/memory/lib/common').MemoryScanIssue[];
    error?: CSharpRoslynSidecarError;
}

export const CSHARP_ROSLYN_ANALYZER_PATH_ENV = 'CYBERVINCI_ROSLYN_ANALYZER_PATH';
export const CSHARP_ROSLYN_ANALYZER_TIMEOUT_ENV = 'CYBERVINCI_ROSLYN_ANALYZER_TIMEOUT_MS';

export interface CSharpRoslynSidecarAnalyzerOptions {
    analyzerPath?: string;
    timeoutMs?: number;
    fallbackAnalyzer?: CSharpStructuralAnalyzer;
}

interface SidecarCommand {
    command: string;
    args: string[];
}

export class CSharpRoslynSidecarAnalyzer implements MemoryLanguageAnalyzer {

    readonly id = 'csharp-roslyn-sidecar';
    readonly languageId = 'csharp';
    readonly priority = 100;

    protected readonly fallbackAnalyzer: CSharpStructuralAnalyzer;
    protected readonly configuredAnalyzerPath: string | undefined;
    protected readonly timeoutMs: number;
    protected unavailableReason: string | undefined;
    protected discoveredAnalyzerPath: string | undefined;
    protected warned = false;

    constructor(options: CSharpRoslynSidecarAnalyzerOptions = {}) {
        this.fallbackAnalyzer = options.fallbackAnalyzer ?? new CSharpStructuralAnalyzer();
        this.configuredAnalyzerPath = options.analyzerPath ?? process.env[CSHARP_ROSLYN_ANALYZER_PATH_ENV];
        this.timeoutMs = options.timeoutMs ?? this.timeoutFromEnvironment() ?? 5000;
    }

    canAnalyze(file: MemoryFile): boolean {
        return this.fallbackAnalyzer.canAnalyze(file);
    }

    async analyze(context: LanguageAnalysisContext): Promise<LanguageAnalysisResult> {
        if (!this.unavailableReason) {
            const sidecarResult = await this.tryAnalyzeWithSidecar(context);
            if (sidecarResult) {
                return sidecarResult;
            }
        }
        const fallback = await this.fallbackAnalyzer.analyze(context);
        if (this.unavailableReason) {
            return {
                ...fallback,
                diagnostics: [
                    ...(fallback.diagnostics ?? []),
                    {
                        id: 'roslyn-fallback-mode',
                        severity: 'info',
                        message: `C# analysis is using structural fallback mode because Roslyn semantic analysis is unavailable. ${this.unavailableReason}`,
                        path: context.file.relativePath
                    },
                    {
                        id: 'roslyn-sidecar-unavailable',
                        severity: 'info',
                        message: `Roslyn analyzer unavailable; using C# structural fallback. ${this.unavailableReason}`,
                        path: context.file.relativePath
                    }
                ]
            };
        }
        return fallback;
    }

    protected async tryAnalyzeWithSidecar(context: LanguageAnalysisContext): Promise<LanguageAnalysisResult | undefined> {
        try {
            const command = await this.resolveCommand(context);
            if (!command) {
                return undefined;
            }
            const request: CSharpRoslynSidecarRequest = {
                schemaVersion: CSHARP_ROSLYN_SIDECAR_CONTRACT_VERSION,
                requestId: `${context.file.id}:${context.file.contentHash}`,
                languageId: 'csharp',
                workspacePath: context.workspacePath,
                workspaceFilePath: await this.findCSharpWorkspaceFile(context.workspacePath),
                file: context.file,
                content: context.content
            };
            const response = await this.invoke(command, request);
            return this.toAnalysisResult(response, context);
        } catch (error) {
            this.disableSidecar(error);
            return undefined;
        }
    }

    protected async resolveCommand(context?: LanguageAnalysisContext): Promise<SidecarCommand | undefined> {
        const analyzerPath = await this.resolveAnalyzerPath(context);
        if (!analyzerPath) {
            return undefined;
        }
        const configuredPath = analyzerPath.trim();
        if (!configuredPath) {
            return undefined;
        }
        try {
            await fs.access(configuredPath, fsConstants.F_OK);
        } catch {
            throw new Error(`Configured Roslyn analyzer was not found: ${configuredPath}`);
        }
        if (configuredPath.toLowerCase().endsWith('.dll')) {
            return {
                command: process.env.CYBERVINCI_DOTNET_PATH ?? 'dotnet',
                args: [configuredPath]
            };
        }
        return {
            command: configuredPath,
            args: []
        };
    }

    protected async resolveAnalyzerPath(context?: LanguageAnalysisContext): Promise<string | undefined> {
        const explicitPath = this.configuredAnalyzerPath?.trim();
        if (explicitPath) {
            return explicitPath;
        }
        if (this.discoveredAnalyzerPath) {
            return this.discoveredAnalyzerPath;
        }
        const sidecarRoot = await this.findBundledSidecarRoot();
        if (!sidecarRoot) {
            return undefined;
        }
        const discovered = await this.findBuiltSidecar(sidecarRoot);
        if (discovered) {
            this.discoveredAnalyzerPath = discovered;
            return discovered;
        }
        if (context && await this.isCSharpWorkspace(context.workspacePath)) {
            const projectPath = path.join(sidecarRoot, 'CyberVinci.Memory.RoslynSidecar.csproj');
            throw new Error(`No built Roslyn sidecar was found. Build it locally with: dotnet build "${projectPath}" -c Release`);
        }
        return undefined;
    }

    protected async findBundledSidecarRoot(): Promise<string | undefined> {
        for (const base of this.packageSearchRoots()) {
            const candidate = path.join(base, 'roslyn-sidecar');
            try {
                await fs.access(path.join(candidate, 'CyberVinci.Memory.RoslynSidecar.csproj'), fsConstants.F_OK);
                return candidate;
            } catch {
                // Keep searching parent/package layouts used by source and compiled builds.
            }
        }
        return undefined;
    }

    protected packageSearchRoots(): string[] {
        const roots = new Set<string>();
        let current = __dirname;
        for (let index = 0; index < 8; index++) {
            roots.add(current);
            roots.add(path.join(current, '..'));
            roots.add(path.join(current, '..', '..'));
            current = path.dirname(current);
        }
        return [...roots].map(root => path.resolve(root));
    }

    protected async findBuiltSidecar(sidecarRoot: string): Promise<string | undefined> {
        const binPath = path.join(sidecarRoot, 'bin');
        const candidates: string[] = [];
        await this.collectFiles(binPath, candidates, 5);
        return candidates
            .filter(candidate => path.basename(candidate) === 'CyberVinci.Memory.RoslynSidecar.dll')
            .sort((left, right) => this.sidecarPathRank(right) - this.sidecarPathRank(left) || right.localeCompare(left))[0];
    }

    protected sidecarPathRank(candidate: string): number {
        const normalized = candidate.replace(/\\/g, '/').toLowerCase();
        return (normalized.includes('/release/') ? 10 : 0) + (normalized.includes('/debug/') ? 1 : 0);
    }

    protected async collectFiles(directoryPath: string, result: string[], depth: number): Promise<void> {
        if (depth < 0) {
            return;
        }
        let entries: import('fs').Dirent[];
        try {
            entries = await fs.readdir(directoryPath, { withFileTypes: true });
        } catch {
            return;
        }
        for (const entry of entries) {
            const absolute = path.join(directoryPath, entry.name);
            if (entry.isDirectory()) {
                await this.collectFiles(absolute, result, depth - 1);
            } else if (entry.isFile()) {
                result.push(absolute);
            }
        }
    }

    protected async isCSharpWorkspace(workspacePath: string): Promise<boolean> {
        return !!await this.findCSharpWorkspaceFile(workspacePath);
    }

    protected async findCSharpWorkspaceFile(workspacePath: string): Promise<string | undefined> {
        const candidates = await this.collectCSharpWorkspaceFiles(workspacePath, 4);
        return candidates.sort((left, right) => this.workspaceFileRank(right) - this.workspaceFileRank(left) || left.localeCompare(right))[0];
    }

    protected workspaceFileRank(candidate: string): number {
        const extension = path.extname(candidate).toLowerCase();
        return extension === '.sln' || extension === '.slnx' ? 10 : extension === '.csproj' ? 5 : 0;
    }

    protected async collectCSharpWorkspaceFiles(directoryPath: string, depth: number): Promise<string[]> {
        if (depth < 0 || this.isIgnoredDirectory(path.basename(directoryPath))) {
            return [];
        }
        let entries: import('fs').Dirent[];
        try {
            entries = await fs.readdir(directoryPath, { withFileTypes: true });
        } catch {
            return [];
        }
        const result = entries
            .filter(entry => entry.isFile() && ['.csproj', '.sln', '.slnx'].includes(path.extname(entry.name).toLowerCase()))
            .map(entry => path.join(directoryPath, entry.name));
        for (const entry of entries) {
            if (entry.isDirectory()) {
                result.push(...await this.collectCSharpWorkspaceFiles(path.join(directoryPath, entry.name), depth - 1));
            }
        }
        return result;
    }

    protected isIgnoredDirectory(name: string): boolean {
        return ['.git', '.vs', 'bin', 'obj', 'node_modules', 'dist', 'build'].includes(name.toLowerCase());
    }

    protected invoke(command: SidecarCommand, request: CSharpRoslynSidecarRequest): Promise<CSharpRoslynSidecarResponse> {
        return new Promise((resolve, reject) => {
            const child = spawn(command.command, command.args, {
                cwd: request.workspacePath,
                env: process.env,
                stdio: ['pipe', 'pipe', 'pipe'],
                windowsHide: true
            });
            const stdout: Buffer[] = [];
            const stderr: Buffer[] = [];
            let completed = false;
            const timer = setTimeout(() => {
                if (!completed) {
                    completed = true;
                    child.kill();
                    reject(new Error(`Roslyn analyzer timed out after ${this.timeoutMs}ms`));
                }
            }, this.timeoutMs);

            child.stdout.on('data', chunk => stdout.push(Buffer.from(chunk)));
            child.stderr.on('data', chunk => stderr.push(Buffer.from(chunk)));
            child.on('error', error => {
                if (!completed) {
                    completed = true;
                    clearTimeout(timer);
                    reject(error);
                }
            });
            child.on('close', code => {
                if (completed) {
                    return;
                }
                completed = true;
                clearTimeout(timer);
                const output = Buffer.concat(stdout).toString('utf8').trim();
                const diagnostic = Buffer.concat(stderr).toString('utf8').trim();
                if (code !== 0) {
                    reject(new Error(`Roslyn analyzer exited with ${code}${diagnostic ? `: ${diagnostic}` : ''}`));
                    return;
                }
                try {
                    resolve(JSON.parse(output) as CSharpRoslynSidecarResponse);
                } catch (error) {
                    reject(new Error(`Roslyn analyzer returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`));
                }
            });

            child.stdin.end(`${JSON.stringify(request)}\n`, 'utf8');
        });
    }

    protected toAnalysisResult(response: CSharpRoslynSidecarResponse, context: LanguageAnalysisContext): LanguageAnalysisResult {
        if (!this.isObject(response) || response.schemaVersion !== CSHARP_ROSLYN_SIDECAR_CONTRACT_VERSION) {
            throw new Error('Roslyn analyzer returned an unsupported schemaVersion');
        }
        if (response.error) {
            throw new Error(`Roslyn analyzer error${response.error.code ? ` ${response.error.code}` : ''}: ${response.error.message}`);
        }
        const result = response.result;
        if (!this.isObject(result) || !Array.isArray(result.symbols) || !Array.isArray(result.relations)) {
            throw new Error('Roslyn analyzer response did not include a valid analysis result');
        }
        return {
            fileId: context.file.id,
            languageId: 'csharp',
            analyzerId: typeof result.analyzerId === 'string' && result.analyzerId ? result.analyzerId : this.id,
            symbols: result.symbols,
            relations: result.relations,
            imports: Array.isArray(result.imports) ? result.imports.filter((value): value is string => typeof value === 'string') : undefined,
            callHints: Array.isArray(result.callHints) ? result.callHints : undefined,
            dependencyHints: Array.isArray(result.dependencyHints) ? result.dependencyHints : undefined,
            diagnostics: [
                ...(Array.isArray(result.diagnostics) ? result.diagnostics : []),
                ...(Array.isArray(response.diagnostics) ? response.diagnostics : [])
            ]
        };
    }

    protected disableSidecar(error: unknown): void {
        this.unavailableReason = error instanceof Error ? error.message : String(error);
        if (!this.warned) {
            this.warned = true;
            // Keep indexing resilient: a missing, crashing, or incompatible sidecar only disables the optional path.
            console.warn(`[memory] Roslyn analyzer unavailable; using C# structural fallback. ${this.unavailableReason}`);
        }
    }

    protected timeoutFromEnvironment(): number | undefined {
        const raw = process.env[CSHARP_ROSLYN_ANALYZER_TIMEOUT_ENV];
        if (!raw) {
            return undefined;
        }
        const parsed = Number(raw);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
    }

    protected isObject(value: unknown): value is Record<string, unknown> {
        return typeof value === 'object' && value !== null;
    }
}

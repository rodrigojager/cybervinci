import * as childProcess from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { promisify } from 'util';
import { injectable } from '@theia/core/shared/inversify';
import { nls } from '@theia/core/lib/common';
import {
    GeneratedFile,
    ArenaArtifact,
    ArenaOutputType,
    ArenaRunRequest,
    ArenaRunResult
} from '../../common';
import { IArenaRunner, ArenaRunnerCancellationToken } from './arena-runner';

const execFile = promisify(childProcess.execFile);
const CODEX_TIMEOUT_MS = 20 * 60 * 1000;

@injectable()
export class CodexProviderArenaRunner implements IArenaRunner {

    readonly info = {
        id: 'codex-provider',
        name: nls.localize('theia/arena/runner/codexProvider/name', 'Codex Provider Runner'),
        description: nls.localize('theia/arena/runner/codexProvider/description', 'Runs Codex Provider non-interactively inside the candidate sandbox.'),
        available: true,
        capabilities: {
            supportsFilesystem: true,
            supportsModelSelection: true,
            supportsReasoningEffort: true,
            supportsDiff: true
        }
    };

    async run(request: ArenaRunRequest, cancellationToken?: ArenaRunnerCancellationToken): Promise<ArenaRunResult> {
        const started = Date.now();
        const logs: string[] = [];
        try {
            const executable = await this.findCodexExecutable();
            await this.prepareCliWorkspace(request.workspaceRoot);
            await this.git(request.workspaceRoot, ['init']);
            await this.git(request.workspaceRoot, ['add', '.playground']);
            await this.git(request.workspaceRoot, ['commit', '-m', nls.localize('theia/arena/codexBaselineCommit', 'Arena baseline'), '--no-gpg-sign'], true);

            const prompt = this.createPrompt(request);
            const outputLastMessagePath = path.join(request.workspaceRoot, 'output', '.arena-last-message.txt');
            const args = [
                'exec',
                '-C', request.workspaceRoot,
                '--skip-git-repo-check',
                '--ephemeral',
                '--ignore-rules',
                '-s', 'workspace-write',
                '-a', 'never',
                '--color', 'never',
                '-o', outputLastMessagePath
            ];
            if (request.model) {
                args.push('-m', request.model);
            }
            if (request.reasoningEffort) {
                args.push('-c', `model_reasoning_effort="${request.reasoningEffort}"`);
            }
            args.push('-');

            logs.push(nls.localize('theia/arena/executableLog', 'Executable: {0}', executable));
            logs.push(nls.localize('theia/arena/workspaceSandbox', 'Workspace sandbox: {0}', request.workspaceRoot));
            const result = await this.spawnCodex(executable, args, prompt, request.workspaceRoot, cancellationToken);
            logs.push(nls.localize('theia/arena/codexExitCode', 'Codex exit code: {0}', result.exitCode));
            if (result.stdout.trim()) {
                logs.push(`stdout:\n${result.stdout.trim().slice(0, 12000)}`);
            }
            if (result.stderr.trim()) {
                logs.push(`stderr:\n${result.stderr.trim().slice(0, 12000)}`);
            }

            await this.git(request.workspaceRoot, ['add', '-N', '.'], true);
            const gitDiff = await this.gitOutput(request.workspaceRoot, ['diff', '--', '.']);
            const changedPaths = await this.changedPaths(request.workspaceRoot);
            const unexpected = changedPaths.filter(candidate => !this.isAllowedChangedPath(candidate));
            const artifact = await this.collectArtifact(request.workspaceRoot, request.outputType, result.stdout);
            if (unexpected.length) {
                artifact.parsedSuccessfully = false;
                artifact.error = nls.localize('theia/arena/codexChangedOutsideOutput', 'Codex Provider changed files outside output/: {0}', unexpected.join(', '));
            }
            return {
                candidateLabel: request.candidateLabel,
                status: result.exitCode === 0 && !unexpected.length ? 'succeeded' : 'failed',
                artifact,
                logs,
                gitDiff,
                latencyMs: Date.now() - started,
                error: result.exitCode === 0 ? artifact.error ?? undefined : nls.localize('theia/arena/codexExitedWithCode', 'Codex Provider exited with code {0}', result.exitCode)
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return {
                candidateLabel: request.candidateLabel,
                status: 'failed',
                artifact: {
                    artifactType: request.outputType,
                    files: [],
                    rawOutput: '',
                    parsedSuccessfully: false,
                    error: message
                },
                logs: [...logs, message],
                latencyMs: Date.now() - started,
                error: message
            };
        }
    }

    protected createPrompt(request: ArenaRunRequest): string {
        return `SYSTEM / PLAYGROUND RULES:
Você está executando dentro da Arena.
Esta é uma disputa A/B/C de prompts.
Não mencione a disputa no resultado final.
Siga o contrato de saída.
Trabalhe apenas no workspace temporário.
Coloque o resultado final na pasta output/.
Não use caminhos absolutos.
Não tente acessar arquivos fora do workspace.
Se não conseguir cumprir, retorne erro claro.

AGENT PROMPT:
${request.agentMarkdown}

USER TASK:
${request.userTask}

OUTPUT TYPE:
${request.outputType}

OUTPUT CONTRACT:
- Grave o resultado final em output/.
- Para markdown/document, use output/result.md.
- Para webpage, use output/index.html.
- Para json, use output/result.json com JSON válido.
- Para code/generic, use arquivos claros sob output/.
- Não altere arquivos fora de output/, exceto arquivos temporários internos indispensáveis.`;
    }

    protected async findCodexExecutable(): Promise<string> {
        const command = process.platform === 'win32' ? 'where.exe' : 'command';
        const args = process.platform === 'win32' ? ['codex.cmd'] : ['-v', 'codex'];
        try {
            const result = await execFile(command, args, { windowsHide: true });
            const executable = result.stdout.split(/\r?\n/).map(line => line.trim()).find(Boolean);
            if (executable) {
                return executable;
            }
        } catch {
            // Fall through to plain executable name; spawn will produce the final error.
        }
        return process.platform === 'win32' ? 'codex.cmd' : 'codex';
    }

    protected async prepareCliWorkspace(workspaceRoot: string): Promise<void> {
        await fs.mkdir(path.join(workspaceRoot, '.home', 'AppData', 'Roaming'), { recursive: true });
        await fs.mkdir(path.join(workspaceRoot, '.home', 'AppData', 'Local'), { recursive: true });
        await fs.mkdir(path.join(workspaceRoot, '.tmp'), { recursive: true });
    }

    protected spawnCodex(
        executable: string,
        args: string[],
        stdin: string,
        workspaceRoot: string,
        cancellationToken?: ArenaRunnerCancellationToken
    ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
        return new Promise((resolve, reject) => {
            if (cancellationToken?.isCancellationRequested) {
                reject(new Error(nls.localize('theia/arena/codexRunCancelled', 'Codex Provider run cancelled.')));
                return;
            }
            const child = childProcess.spawn(executable, args, {
                cwd: workspaceRoot,
                env: this.createSafeEnv(workspaceRoot),
                windowsHide: true,
                stdio: ['pipe', 'pipe', 'pipe']
            });
            let stdout = '';
            let stderr = '';
            let failureReason: Error | undefined;
            const timer = setTimeout(() => {
                failureReason = new Error(nls.localize('theia/arena/codexTimedOut', 'Codex Provider timed out after {0}s.', CODEX_TIMEOUT_MS / 1000));
                this.killProcessTree(child.pid);
            }, CODEX_TIMEOUT_MS);
            cancellationToken?.onCancellationRequested(() => {
                failureReason = new Error(nls.localize('theia/arena/codexRunCancelled', 'Codex Provider run cancelled.'));
                this.killProcessTree(child.pid);
            });
            child.stdout.on('data', chunk => stdout += String(chunk));
            child.stderr.on('data', chunk => stderr += String(chunk));
            child.on('error', error => {
                clearTimeout(timer);
                reject(error);
            });
            child.on('close', code => {
                clearTimeout(timer);
                if (failureReason) {
                    reject(failureReason);
                    return;
                }
                resolve({ stdout, stderr, exitCode: code ?? -1 });
            });
            child.stdin.end(stdin);
        });
    }

    protected createSafeEnv(workspaceRoot: string): NodeJS.ProcessEnv {
        const home = path.join(workspaceRoot, '.home');
        const env: NodeJS.ProcessEnv = {
            PATH: process.env.PATH,
            Path: process.env.Path,
            SYSTEMROOT: process.env.SYSTEMROOT,
            SystemRoot: process.env.SystemRoot,
            COMSPEC: process.env.COMSPEC,
            PATHEXT: process.env.PATHEXT,
            HOME: home,
            USERPROFILE: home,
            APPDATA: path.join(home, 'AppData', 'Roaming'),
            LOCALAPPDATA: path.join(home, 'AppData', 'Local'),
            TEMP: path.join(workspaceRoot, '.tmp'),
            TMP: path.join(workspaceRoot, '.tmp'),
            CI: '1',
            NO_COLOR: '1'
        };
        const codexHome = process.env.CODEX_HOME || (process.env.USERPROFILE ? path.join(process.env.USERPROFILE, '.codex') : undefined);
        if (codexHome) {
            // Auth is intentionally shared; config/rules are disabled with CLI flags.
            env.CODEX_HOME = codexHome;
        }
        return env;
    }

    protected killProcessTree(pid: number | undefined): void {
        if (!pid) {
            return;
        }
        if (process.platform === 'win32') {
            childProcess.spawn('taskkill.exe', ['/PID', String(pid), '/T', '/F'], { windowsHide: true });
        } else {
            try {
                process.kill(-pid, 'SIGKILL');
            } catch {
                process.kill(pid, 'SIGKILL');
            }
        }
    }

    protected async collectArtifact(workspaceRoot: string, outputType: ArenaOutputType, fallbackRaw: string): Promise<ArenaArtifact> {
        const outputRoot = path.join(workspaceRoot, 'output');
        const files = await this.collectFiles(outputRoot, outputRoot);
        const rawOutput = files.find(file => !file.path.endsWith('.arena-last-message.txt'))?.content
            ?? files[0]?.content
            ?? fallbackRaw;
        return {
            artifactType: outputType,
            files: files.length ? files : [this.defaultFile(outputType, fallbackRaw)],
            rawOutput,
            parsedSuccessfully: files.length > 0,
            error: files.length ? null : nls.localize('theia/arena/codexNoOutputFiles', 'Codex Provider did not write any files under output/.')
        };
    }

    protected async collectFiles(outputRoot: string, directory: string): Promise<GeneratedFile[]> {
        let entries: { name: string; isDirectory(): boolean; isFile(): boolean }[];
        try {
            entries = await fs.readdir(directory, { withFileTypes: true });
        } catch {
            return [];
        }
        const files: GeneratedFile[] = [];
        for (const entry of entries) {
            const fullPath = path.join(directory, entry.name);
            if (entry.isDirectory()) {
                files.push(...await this.collectFiles(outputRoot, fullPath));
            } else if (entry.isFile()) {
                const content = await fs.readFile(fullPath, 'utf8');
                const relative = path.relative(outputRoot, fullPath).replace(/\\/g, '/');
                files.push({
                    path: `output/${relative}`,
                    content,
                    contentType: this.contentTypeFor(relative),
                    language: this.languageFor(relative),
                    sizeBytes: Buffer.byteLength(content, 'utf8')
                });
            }
        }
        return files;
    }

    protected defaultFile(outputType: ArenaOutputType, content: string): GeneratedFile {
        const filename = outputType === 'webpage' ? 'index.html' : outputType === 'json' ? 'result.json' : outputType === 'markdown' || outputType === 'document' ? 'result.md' : 'result.txt';
        return {
            path: `output/${filename}`,
            content,
            contentType: this.contentTypeFor(filename),
            language: this.languageFor(filename),
            sizeBytes: Buffer.byteLength(content, 'utf8')
        };
    }

    protected async changedPaths(workspaceRoot: string): Promise<string[]> {
        const status = await this.gitOutput(workspaceRoot, ['status', '--porcelain']);
        return status.split(/\r?\n/)
            .map(line => line.slice(3).trim().replace(/\\/g, '/'))
            .filter(Boolean);
    }

    protected isAllowedChangedPath(relativePath: string): boolean {
        return relativePath.startsWith('output/') ||
            relativePath.startsWith('.home/') ||
            relativePath.startsWith('.tmp/');
    }

    protected async git(cwd: string, args: string[], ignoreErrors: boolean = false): Promise<void> {
        try {
            await execFile('git', args, { cwd, windowsHide: true });
        } catch (error) {
            if (!ignoreErrors) {
                throw error;
            }
        }
    }

    protected async gitOutput(cwd: string, args: string[]): Promise<string> {
        try {
            const result = await execFile('git', args, { cwd, windowsHide: true, maxBuffer: 20 * 1024 * 1024 });
            return result.stdout;
        } catch (error) {
            return error instanceof Error ? error.message : String(error);
        }
    }

    protected contentTypeFor(relativePath: string): string {
        if (relativePath.endsWith('.html')) {
            return 'text/html';
        }
        if (relativePath.endsWith('.json')) {
            return 'application/json';
        }
        if (relativePath.endsWith('.md')) {
            return 'text/markdown';
        }
        return 'text/plain';
    }

    protected languageFor(relativePath: string): string {
        if (relativePath.endsWith('.html')) {
            return 'html';
        }
        if (relativePath.endsWith('.json')) {
            return 'json';
        }
        if (relativePath.endsWith('.md')) {
            return 'markdown';
        }
        if (relativePath.endsWith('.ts')) {
            return 'typescript';
        }
        if (relativePath.endsWith('.js')) {
            return 'javascript';
        }
        return 'text';
    }
}

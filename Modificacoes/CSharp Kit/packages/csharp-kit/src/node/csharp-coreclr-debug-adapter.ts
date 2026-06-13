import * as fs from 'fs';
import * as path from 'path';
import { CSharpDebugAdapterStatus } from '../common';

export const CSHARP_CORECLR_DEBUG_ADAPTER_ENV = 'CYBERVINCI_CORECLR_DEBUG_ADAPTER';
export const CSHARP_CORECLR_DEBUG_ADAPTER_ARGS_ENV = 'CYBERVINCI_CORECLR_DEBUG_ADAPTER_ARGS';
export const NETCOREDBG_PATH_ENV = 'NETCOREDBG_PATH';
export const NETCOREDBG_ARGS_ENV = 'NETCOREDBG_ARGS';
export const NETCOREDBG_DAP_ARGS = ['--interpreter=vscode'];

const SETUP_HINT = 'Install netcoredbg or vsdbg and put it on PATH, declare a workspace-local tool command named netcoredbg, set CYBERVINCI_CORECLR_DEBUG_ADAPTER plus optional CYBERVINCI_CORECLR_DEBUG_ADAPTER_ARGS, configure .cybervinci/csharp-kit.json, or install the VS Code C# extension and let C# Kit discover its external vsdbg runtime.';
const DOTNET_TOOL_MANIFEST_RELATIVE_PATHS = ['.config/dotnet-tools.json', 'dotnet-tools.json'];

export interface CSharpDebugAdapterCommandConfig {
    command?: string;
    args?: string[] | string;
}

export interface CSharpDebugAdapterWorkspaceConfig {
    debugAdapters?: {
        coreclr?: CSharpDebugAdapterCommandConfig;
        netcoredbg?: CSharpDebugAdapterCommandConfig;
    };
}

export function resolveCSharpDebugAdapterStatus(
    env: NodeJS.ProcessEnv = process.env,
    workspacePath?: string,
    config?: CSharpDebugAdapterWorkspaceConfig,
    configSource = '.cybervinci/csharp-kit.json'
): CSharpDebugAdapterStatus {
    const configured = (env[CSHARP_CORECLR_DEBUG_ADAPTER_ENV] ?? env[NETCOREDBG_PATH_ENV])?.trim();
    if (configured) {
        const command = findCommand(configured, env, workspacePath);
        const args = configuredDebugAdapterArgs(env);
        if (command) {
            return {
                mode: 'ready',
                adapter: debugAdapterId(command),
                command,
                args,
                envVar: env[CSHARP_CORECLR_DEBUG_ADAPTER_ENV] ? CSHARP_CORECLR_DEBUG_ADAPTER_ENV : NETCOREDBG_PATH_ENV,
                setupHint: SETUP_HINT,
                detail: `${configured} is available for CoreCLR debugging.`
            };
        }
        return {
            mode: 'configured-missing',
            adapter: debugAdapterId(configured),
            args,
            envVar: env[CSHARP_CORECLR_DEBUG_ADAPTER_ENV] ? CSHARP_CORECLR_DEBUG_ADAPTER_ENV : NETCOREDBG_PATH_ENV,
            setupHint: SETUP_HINT,
            detail: `${configured} was configured as the CoreCLR debug adapter, but it was not found.`
        };
    }

    const workspaceConfig = config?.debugAdapters?.coreclr ?? config?.debugAdapters?.netcoredbg;
    if (workspaceConfig) {
        const configuredCommand = workspaceConfig.command?.trim();
        if (configuredCommand) {
            const command = findCommand(configuredCommand, env, workspacePath);
            const args = normalizeConfiguredArgs(workspaceConfig.args);
            if (command) {
                return {
                    mode: 'ready',
                    adapter: debugAdapterId(command),
                    command,
                    args,
                    envVar: CSHARP_CORECLR_DEBUG_ADAPTER_ENV,
                    setupHint: SETUP_HINT,
                    detail: `${configuredCommand} is available for CoreCLR debugging from ${configSource}.`
                };
            }
            return {
                mode: 'configured-missing',
                adapter: debugAdapterId(configuredCommand),
                args,
                envVar: CSHARP_CORECLR_DEBUG_ADAPTER_ENV,
                setupHint: SETUP_HINT,
                detail: `${configuredCommand} was configured as the CoreCLR debug adapter in ${configSource}, but it was not found.`
            };
        }
    }

    const command = findCommand('netcoredbg', env, workspacePath);
    if (command) {
        return {
            mode: 'ready',
            adapter: 'netcoredbg',
            command,
            args: NETCOREDBG_DAP_ARGS,
            envVar: CSHARP_CORECLR_DEBUG_ADAPTER_ENV,
            setupHint: SETUP_HINT,
            detail: 'netcoredbg was found on PATH for CoreCLR debugging.'
        };
    }

    const dotnetToolAdapter = resolveWorkspaceDotnetToolDebugAdapter(env, workspacePath);
    if (dotnetToolAdapter) {
        return dotnetToolAdapter;
    }

    const vsdbgCommand = findCommand('vsdbg', env, workspacePath) ?? findVsCodeCSharpExtensionVsdbg(env);
    if (vsdbgCommand) {
        return {
            mode: 'ready',
            adapter: 'vsdbg',
            command: vsdbgCommand,
            args: NETCOREDBG_DAP_ARGS,
            envVar: CSHARP_CORECLR_DEBUG_ADAPTER_ENV,
            setupHint: SETUP_HINT,
            detail: vsdbgCommand.includes(`${path.sep}.vscode${path.sep}extensions${path.sep}`)
                ? 'vsdbg was found in the installed VS Code C# extension runtime for CoreCLR debugging.'
                : 'vsdbg was found on PATH for CoreCLR debugging.'
        };
    }

    return {
        mode: 'missing',
        adapter: 'coreclr-dap',
        args: NETCOREDBG_DAP_ARGS,
        envVar: CSHARP_CORECLR_DEBUG_ADAPTER_ENV,
        setupHint: SETUP_HINT,
        detail: 'No CoreCLR debug adapter was found. Breakpoint debugging requires netcoredbg, vsdbg or another DAP-compatible adapter.'
    };
}

function resolveWorkspaceDotnetToolDebugAdapter(env: NodeJS.ProcessEnv, workspacePath?: string): CSharpDebugAdapterStatus | undefined {
    if (!workspacePath || !workspaceDotnetToolManifestHasCommand(workspacePath, 'netcoredbg')) {
        return undefined;
    }
    const dotnet = findCommand('dotnet', env, workspacePath);
    if (!dotnet) {
        return undefined;
    }
    return {
        mode: 'ready',
        adapter: 'netcoredbg',
        command: dotnet,
        args: ['tool', 'run', 'netcoredbg', ...NETCOREDBG_DAP_ARGS],
        envVar: CSHARP_CORECLR_DEBUG_ADAPTER_ENV,
        setupHint: SETUP_HINT,
        detail: 'netcoredbg was found in a workspace dotnet-tools.json manifest and will run through dotnet tool run for CoreCLR debugging.'
    };
}

function debugAdapterId(command: string): CSharpDebugAdapterStatus['adapter'] {
    const normalized = path.basename(command).toLowerCase();
    if (normalized.startsWith('netcoredbg')) {
        return 'netcoredbg';
    }
    if (normalized.startsWith('vsdbg')) {
        return 'vsdbg';
    }
    return 'coreclr-dap';
}

function workspaceDotnetToolManifestHasCommand(workspacePath: string, command: string): boolean {
    for (const relativePath of DOTNET_TOOL_MANIFEST_RELATIVE_PATHS) {
        const manifestPath = path.join(workspacePath, ...relativePath.split('/'));
        try {
            const parsed = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as unknown;
            const tools = isRecord(parsed) && isRecord(parsed.tools) ? parsed.tools : {};
            if (Object.values(tools).some(tool => {
                if (!isRecord(tool) || !Array.isArray(tool.commands)) {
                    return false;
                }
                return tool.commands.some(entry => typeof entry === 'string' && entry.toLowerCase() === command.toLowerCase());
            })) {
                return true;
            }
        } catch {
            // Ignore missing or invalid local tool manifests during debug adapter discovery.
        }
    }
    return false;
}

function findVsCodeCSharpExtensionVsdbg(env: NodeJS.ProcessEnv): string | undefined {
    for (const extensionsRoot of vsCodeExtensionRoots(env)) {
        let extensionDirectories: string[];
        try {
            extensionDirectories = fs.readdirSync(extensionsRoot)
                .filter(entry => /^ms-dotnettools\.csharp-/i.test(entry))
                .map(entry => path.join(extensionsRoot, entry))
                .filter(entry => fs.statSync(entry).isDirectory())
                .sort((left, right) => right.localeCompare(left));
        } catch {
            continue;
        }
        for (const extensionDirectory of extensionDirectories) {
            const candidate = findVsdbgInDirectory(path.join(extensionDirectory, '.debugger'), 4);
            if (candidate) {
                return candidate;
            }
        }
    }
    return undefined;
}

function vsCodeExtensionRoots(env: NodeJS.ProcessEnv): string[] {
    const home = env.HOME ?? env.USERPROFILE;
    if (!home) {
        return [];
    }
    return [
        path.join(home, '.vscode', 'extensions'),
        path.join(home, '.vscode-insiders', 'extensions'),
        path.join(home, '.vscode-server', 'extensions'),
        path.join(home, '.vscode-server-insiders', 'extensions')
    ];
}

function findVsdbgInDirectory(directory: string, depth: number): string | undefined {
    if (depth < 0) {
        return undefined;
    }
    let entries: fs.Dirent[];
    try {
        entries = fs.readdirSync(directory, { withFileTypes: true });
    } catch {
        return undefined;
    }
    for (const entry of entries) {
        const absolute = path.join(directory, entry.name);
        if (entry.isFile() && /^vsdbg(?:\.exe)?$/i.test(entry.name)) {
            return existingExecutable(absolute);
        }
    }
    for (const entry of entries) {
        if (entry.isDirectory()) {
            const nested = findVsdbgInDirectory(path.join(directory, entry.name), depth - 1);
            if (nested) {
                return nested;
            }
        }
    }
    return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function findCommand(command: string, env: NodeJS.ProcessEnv, workspacePath?: string): string | undefined {
    if (isPathLike(command)) {
        const resolved = path.isAbsolute(command) || !workspacePath ? command : path.resolve(workspacePath, command);
        return existingExecutable(resolved);
    }
    for (const directory of pathDirectories(env)) {
        for (const candidate of commandCandidates(path.join(directory, command), env)) {
            const executable = existingExecutable(candidate);
            if (executable) {
                return executable;
            }
        }
    }
    return undefined;
}

function isPathLike(command: string): boolean {
    return path.isAbsolute(command) || command.includes('/') || command.includes('\\');
}

function existingExecutable(candidate: string): string | undefined {
    try {
        const stat = fs.statSync(candidate);
        return stat.isFile() ? candidate : undefined;
    } catch {
        return undefined;
    }
}

function pathDirectories(env: NodeJS.ProcessEnv): string[] {
    return (env.PATH ?? env.Path ?? '')
        .split(path.delimiter)
        .map(entry => entry.trim())
        .filter(Boolean);
}

function commandCandidates(candidate: string, env: NodeJS.ProcessEnv): string[] {
    if (path.extname(candidate)) {
        return [candidate];
    }
    const extensions = process.platform === 'win32'
        ? (env.PATHEXT ?? '.COM;.EXE;.BAT;.CMD').split(';').filter(Boolean)
        : [''];
    return extensions.map(extension => `${candidate}${extension.toLowerCase()}`);
}

function normalizeConfiguredArgs(value: CSharpDebugAdapterCommandConfig['args']): string[] {
    if (Array.isArray(value)) {
        return value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0);
    }
    return typeof value === 'string' ? splitCommandLine(value) : NETCOREDBG_DAP_ARGS;
}

function configuredDebugAdapterArgs(env: NodeJS.ProcessEnv): string[] {
    const raw = (env[CSHARP_CORECLR_DEBUG_ADAPTER_ARGS_ENV] ?? env[NETCOREDBG_ARGS_ENV])?.trim();
    return raw ? splitCommandLine(raw) : NETCOREDBG_DAP_ARGS;
}

function splitCommandLine(value: string): string[] {
    const result: string[] = [];
    const regex = /"([^"]*)"|'([^']*)'|(\S+)/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(value))) {
        result.push(match[1] ?? match[2] ?? match[3]);
    }
    return result;
}

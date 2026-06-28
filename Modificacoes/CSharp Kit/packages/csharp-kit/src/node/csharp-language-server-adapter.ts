import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import {
    CSHARP_LANGUAGE_SERVER_SEMANTIC_TOKEN_MODIFIERS,
    CSHARP_LANGUAGE_SERVER_SEMANTIC_TOKEN_TYPES,
    CSharpDiagnostic,
    CSharpIntelliSenseItem,
    CSharpIntelliSenseItemKind,
    CSharpLanguageServerCallHierarchyIncomingCall,
    CSharpLanguageServerCallHierarchyIncomingResult,
    CSharpLanguageServerCallHierarchyItem,
    CSharpLanguageServerCallHierarchyOutgoingCall,
    CSharpLanguageServerCallHierarchyOutgoingResult,
    CSharpLanguageServerCallHierarchyPrepareResult,
    CSharpLanguageServerCodeAction,
    CSharpLanguageServerCodeActionResolveResult,
    CSharpLanguageServerCodeActionResult,
    CSharpLanguageServerCodeActionTriggerKind,
    CSharpLanguageServerCodeLens,
    CSharpLanguageServerCodeLensResolveResult,
    CSharpLanguageServerCodeLensResult,
    CSharpLanguageServerColor,
    CSharpLanguageServerColorPresentation,
    CSharpLanguageServerColorPresentationResult,
    CSharpLanguageServerCompletionContext,
    CSharpLanguageServerAdapterStatus,
    CSharpLanguageServerCompletionItemResolveResult,
    CSharpLanguageServerCompletionResult,
    CSharpLanguageServerDefinitionLocation,
    CSharpLanguageServerDefinitionResult,
    CSharpLanguageServerDiagnostic,
    CSharpLanguageServerDiagnosticsResult,
    CSharpLanguageServerDocumentColor,
    CSharpLanguageServerDocumentColorResult,
    CSharpLanguageServerDocumentHighlight,
    CSharpLanguageServerDocumentHighlightResult,
    CSharpLanguageServerDocumentLink,
    CSharpLanguageServerDocumentLinkResolveResult,
    CSharpLanguageServerDocumentLinkResult,
    CSharpLanguageServerDocumentSymbol,
    CSharpLanguageServerDocumentSymbolResult,
    CSharpLanguageServerEvaluatableExpression,
    CSharpLanguageServerEvaluatableExpressionResult,
    CSharpLanguageServerExecuteCommandResult,
    CSharpLanguageServerFoldingRange,
    CSharpLanguageServerFoldingRangeResult,
    CSharpLanguageServerFormattingOptions,
    CSharpLanguageServerHoverResult,
    CSharpLanguageServerInlayHint,
    CSharpLanguageServerInlayHintResolveResult,
    CSharpLanguageServerInlayHintResult,
    CSharpLanguageServerInlineCompletion,
    CSharpLanguageServerInlineCompletionContext,
    CSharpLanguageServerInlineCompletionResult,
    CSharpLanguageServerInlineValue,
    CSharpLanguageServerInlineValueContext,
    CSharpLanguageServerInlineValueResult,
    CSharpLanguageServerLinkedEditingRangeResult,
    CSharpLanguageServerMoniker,
    CSharpLanguageServerMonikerKind,
    CSharpLanguageServerMonikerResult,
    CSharpLanguageServerMonikerUniquenessLevel,
    CSharpLanguageServerNewSymbolName,
    CSharpLanguageServerNewSymbolNameTriggerKind,
    CSharpLanguageServerNewSymbolNamesResult,
    CSharpLanguageServerPrepareRenameResult,
    CSharpLanguageServerProbe,
    CSharpLanguageServerReferencesResult,
    CSharpLanguageServerSelectionRangeResult,
    CSharpLanguageServerSemanticTokensEdit,
    CSharpLanguageServerSemanticTokensResult,
    CSharpLanguageServerSignatureHelpContext,
    CSharpLanguageServerSignatureHelpResult,
    CSharpLanguageServerSignatureHelpTriggerKind,
    CSharpLanguageServerSignatureInformation,
    CSharpLanguageServerTextEdit,
    CSharpLanguageServerTextEditResult,
    CSharpLanguageServerTypeHierarchyItem,
    CSharpLanguageServerTypeHierarchyPrepareResult,
    CSharpLanguageServerTypeHierarchyResult,
    CSharpLanguageServerWorkspaceSymbol,
    CSharpLanguageServerWorkspaceDiagnosticsResult,
    CSharpLanguageServerWorkspaceSymbolResolveResult,
    CSharpLanguageServerWorkspaceSymbolResult,
    CSharpLanguageServerWorkspaceEditResult,
    CSharpWorkspaceSymbolKind,
    CSharpWorkspaceSymbolRange
} from '../common';

export const CSHARP_LSP_COMMAND_ENV = 'CYBERVINCI_CSHARP_LSP_COMMAND';
export const CSHARP_LSP_ARGS_ENV = 'CYBERVINCI_CSHARP_LSP_ARGS';
export const CSHARP_LSP_PROBE_TIMEOUT_ENV = 'CYBERVINCI_CSHARP_LSP_PROBE_TIMEOUT_MS';
export const RAZOR_LSP_COMMAND_ENV = 'CYBERVINCI_RAZOR_LSP_COMMAND';
export const RAZOR_LSP_ARGS_ENV = 'CYBERVINCI_RAZOR_LSP_ARGS';
export const RAZOR_LSP_PROBE_TIMEOUT_ENV = 'CYBERVINCI_RAZOR_LSP_PROBE_TIMEOUT_MS';
export const DEFAULT_LSP_PROBE_TIMEOUT_MS = 7000;

const MIN_LSP_PROBE_TIMEOUT_MS = 1000;

const CSHARP_SETUP_HINT = 'Install csharp-ls, OmniSharp or the VS Code C# extension runtime and put it on PATH, add csharp-ls to a workspace dotnet tool manifest, set CYBERVINCI_CSHARP_LSP_COMMAND, or configure .cybervinci/csharp-kit.json.';
const RAZOR_SETUP_HINT = 'Install a Razor language server such as rzls, razor-ls or the VS Code C# extension Razor/Roslyn runtime and put it on PATH, declare a workspace-local tool command named rzls or razor-ls, set CYBERVINCI_RAZOR_LSP_COMMAND, or configure .cybervinci/csharp-kit.json.';
const DOTNET_TOOL_MANIFEST_RELATIVE_PATHS = ['.config/dotnet-tools.json', 'dotnet-tools.json'];
const VSCODE_CSHARP_EXTENSION_SOURCE = 'VS Code C# extension runtime';

export interface CSharpLanguageServerCommandConfig {
    id?: string;
    label?: string;
    command?: string;
    args?: string[] | string;
    probeTimeoutMs?: number | string;
}

export interface CSharpLanguageServerAdapterWorkspaceConfig {
    languageServers?: {
        csharp?: CSharpLanguageServerCommandConfig;
        razor?: CSharpLanguageServerCommandConfig;
    };
}

interface LanguageServerCandidate {
    id: string;
    label: string;
    command: string;
    args: string[];
    source: string;
}

interface JsonRpcMessage {
    jsonrpc: '2.0';
    id?: number | string;
    method?: string;
    params?: unknown;
    result?: unknown;
    error?: {
        code?: number;
        message?: string;
    };
}

export function resolveCSharpLanguageServerAdapterStatuses(
    env: NodeJS.ProcessEnv = process.env,
    workspacePath?: string,
    config?: CSharpLanguageServerAdapterWorkspaceConfig,
    configSource = '.cybervinci/csharp-kit.json'
): CSharpLanguageServerAdapterStatus[] {
    return [
        resolveLanguageServerAdapter({
            language: 'csharp',
            label: 'C# Language Server',
            envVar: CSHARP_LSP_COMMAND_ENV,
            argsEnvVar: CSHARP_LSP_ARGS_ENV,
            probeTimeoutEnvVar: CSHARP_LSP_PROBE_TIMEOUT_ENV,
            setupHint: CSHARP_SETUP_HINT,
            configuredId: 'configured-csharp-lsp',
            candidates: [
                { id: 'csharp-ls', label: 'csharp-ls', command: 'csharp-ls', args: [], source: 'PATH' },
                { id: 'omnisharp', label: 'OmniSharp language server', command: 'omnisharp', args: ['--languageserver'], source: 'PATH' },
                { id: 'omnisharp', label: 'OmniSharp language server', command: 'OmniSharp', args: ['--languageserver'], source: 'PATH' }
            ]
        }, env, workspacePath, config?.languageServers?.csharp, configSource),
        resolveLanguageServerAdapter({
            language: 'razor',
            label: 'Razor Language Server',
            envVar: RAZOR_LSP_COMMAND_ENV,
            argsEnvVar: RAZOR_LSP_ARGS_ENV,
            probeTimeoutEnvVar: RAZOR_LSP_PROBE_TIMEOUT_ENV,
            setupHint: RAZOR_SETUP_HINT,
            configuredId: 'configured-razor-lsp',
            candidates: [
                { id: 'rzls', label: 'Razor Language Server', command: 'rzls', args: [], source: 'PATH' },
                { id: 'razor-ls', label: 'Razor language server', command: 'razor-ls', args: [], source: 'PATH' }
            ]
        }, env, workspacePath, config?.languageServers?.razor, configSource)
    ];
}

export function probeCSharpLanguageServerAdapter(
    adapter: CSharpLanguageServerAdapterStatus,
    workspacePath: string,
    timeoutMs = adapter.probeTimeoutMs ?? DEFAULT_LSP_PROBE_TIMEOUT_MS
): Promise<CSharpLanguageServerProbe> {
    const startedAt = Date.now();
    const base = {
        id: adapter.id,
        label: adapter.label,
        language: adapter.language,
        command: adapter.command,
        args: adapter.args,
        probeTimeoutMs: timeoutMs,
        capabilityKeys: [] as string[]
    };
    if (adapter.mode !== 'ready' || !adapter.command) {
        const mode: CSharpLanguageServerProbe['mode'] = adapter.mode === 'configured-missing' ? 'configured-missing' : 'missing';
        return Promise.resolve({
            ...base,
            ok: false,
            mode,
            durationMs: 0,
            detail: adapter.detail
        });
    }

    return new Promise(resolve => {
        const stderr: string[] = [];
        const child = spawn(adapter.command!, adapter.args, {
            cwd: workspacePath,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: process.env
        });
        let stdoutBuffer: Buffer<ArrayBufferLike> = Buffer.alloc(0);
        let settled = false;
        let timer: NodeJS.Timeout;

        const finish = (partial: Pick<CSharpLanguageServerProbe, 'ok' | 'mode' | 'detail'> & Partial<CSharpLanguageServerProbe>): void => {
            if (settled) {
                return;
            }
            settled = true;
            clearTimeout(timer);
            try {
                if (child.stdin.writable) {
                    sendJsonRpc(child.stdin, { jsonrpc: '2.0', id: 2, method: 'shutdown', params: null });
                    sendJsonRpc(child.stdin, { jsonrpc: '2.0', method: 'exit' });
                }
            } catch {
                // Ignore shutdown framing errors when the probed server already exited.
            }
            const probe: CSharpLanguageServerProbe = {
                ...base,
                args: adapter.args,
                durationMs: Date.now() - startedAt,
                stderr: stderr.join('').trim() || undefined,
                capabilityKeys: partial.capabilityKeys ?? [],
                serverName: partial.serverName,
                serverVersion: partial.serverVersion,
                ok: partial.ok,
                mode: partial.mode,
                detail: partial.detail
            };
            let resolved = false;
            const resolveOnce = (): void => {
                if (resolved) {
                    return;
                }
                resolved = true;
                resolve(probe);
            };
            child.once('close', resolveOnce);
            const killTimer = setTimeout(() => {
                if (!child.killed) {
                    child.kill();
                }
            }, 50).unref();
            setTimeout(() => {
                clearTimeout(killTimer);
                resolveOnce();
            }, 1000).unref();
        };
        timer = setTimeout(() => finish({
            ok: false,
            mode: 'failed',
            detail: `${adapter.label} did not answer LSP initialize within ${timeoutMs}ms.`
        }), timeoutMs);

        child.on('error', error => finish({
            ok: false,
            mode: 'failed',
            detail: `${adapter.label} could not be started: ${error.message}`
        }));
        child.on('exit', code => {
            if (!settled) {
                finish({
                    ok: false,
                    mode: 'failed',
                    detail: `${adapter.label} exited before LSP initialize completed${code === null ? '' : ` (exit ${code})`}.`
                });
            }
        });
        child.stderr.on('data', chunk => stderr.push(Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk)));
        child.stdout.on('data', chunk => {
            const data = Buffer.isBuffer(chunk) ? Buffer.from(chunk) : Buffer.from(String(chunk));
            stdoutBuffer = Buffer.concat([stdoutBuffer, data]);
            const messages = readJsonRpcMessages(stdoutBuffer);
            stdoutBuffer = messages.remaining;
            for (const message of messages.messages) {
                if (message.id !== 1) {
                    continue;
                }
                if (message.error) {
                    finish({
                        ok: false,
                        mode: 'failed',
                        detail: `${adapter.label} rejected LSP initialize: ${message.error.message ?? message.error.code ?? 'unknown error'}.`
                    });
                    return;
                }
                const result = isRecord(message.result) ? message.result : {};
                const capabilities = isRecord(result.capabilities) ? result.capabilities : {};
                const serverInfo = isRecord(result.serverInfo) ? result.serverInfo : {};
                const capabilityKeys = Object.keys(capabilities).sort();
                finish({
                    ok: true,
                    mode: 'initialized',
                    serverName: stringValue(serverInfo.name),
                    serverVersion: stringValue(serverInfo.version),
                    capabilityKeys,
                    detail: `${adapter.label} completed LSP initialize with ${capabilityKeys.length} advertised capability key(s).`
                });
                return;
            }
        });

        sendJsonRpc(child.stdin, {
            jsonrpc: '2.0',
            id: 1,
            method: 'initialize',
            params: {
                processId: process.pid,
                rootUri: pathToFileURL(path.resolve(workspacePath)).toString(),
                workspaceFolders: [
                    {
                        uri: pathToFileURL(path.resolve(workspacePath)).toString(),
                        name: path.basename(workspacePath)
                    }
                ],
                capabilities: {},
                clientInfo: {
                    name: 'CyberVinci C# Kit',
                    version: '1.71.0'
                },
                trace: 'off'
            }
        });
    });
}

export function requestCSharpLanguageServerDocumentSymbols(
    adapter: CSharpLanguageServerAdapterStatus,
    workspacePath: string,
    documentPath: string,
    content: string,
    timeoutMs = adapter.probeTimeoutMs ?? DEFAULT_LSP_PROBE_TIMEOUT_MS
): Promise<CSharpLanguageServerDocumentSymbolResult> {
    const startedAt = Date.now();
    const base = {
        workspacePath,
        documentPath,
        adapterId: adapter.id,
        adapterLabel: adapter.label,
        symbols: [] as CSharpLanguageServerDocumentSymbol[]
    };
    if (adapter.mode !== 'ready' || !adapter.command) {
        return Promise.resolve({
            ...base,
            source: 'unavailable',
            durationMs: 0,
            detail: adapter.detail
        });
    }

    return new Promise(resolve => {
        const stderr: string[] = [];
        const documentUri = pathToFileURL(path.resolve(documentPath)).toString();
        const child = spawn(adapter.command!, adapter.args, {
            cwd: workspacePath,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: process.env
        });
        let stdoutBuffer: Buffer<ArrayBufferLike> = Buffer.alloc(0);
        let settled = false;
        let documentSymbolRequested = false;
        let documentOpened = false;
        let timer: NodeJS.Timeout | undefined;

        const finish = (
            partial: Pick<CSharpLanguageServerDocumentSymbolResult, 'source' | 'detail'> & Partial<CSharpLanguageServerDocumentSymbolResult>
        ): void => {
            if (settled) {
                return;
            }
            settled = true;
            if (timer) {
                clearTimeout(timer);
            }
            const result: CSharpLanguageServerDocumentSymbolResult = {
                ...base,
                durationMs: Date.now() - startedAt,
                stderr: undefined,
                source: partial.source,
                symbols: partial.symbols ?? [],
                detail: partial.detail
            };
            let resolved = false;
            const resolveOnce = (): void => {
                if (resolved) {
                    return;
                }
                resolved = true;
                result.stderr = stderr.join('').trim() || undefined;
                resolve(result);
            };
            child.once('close', resolveOnce);
            try {
                if (child.stdin.writable) {
                    if (documentOpened) {
                        sendJsonRpc(child.stdin, {
                            jsonrpc: '2.0',
                            method: 'textDocument/didClose',
                            params: {
                                textDocument: {
                                    uri: documentUri
                                }
                            }
                        });
                    }
                    sendJsonRpc(child.stdin, { jsonrpc: '2.0', id: 3, method: 'shutdown', params: null });
                    sendJsonRpc(child.stdin, { jsonrpc: '2.0', method: 'exit' });
                }
            } catch {
                // Ignore shutdown framing errors when the server already exited.
            }
            const killTimer = setTimeout(() => {
                if (!child.killed) {
                    child.kill();
                }
            }, 50).unref();
            setTimeout(() => {
                clearTimeout(killTimer);
                resolveOnce();
            }, 1000).unref();
        };

        timer = setTimeout(() => finish({
            source: 'unavailable',
            detail: `${adapter.label} did not answer textDocument/documentSymbol within ${timeoutMs}ms.`
        }), timeoutMs);

        child.on('error', error => finish({
            source: 'unavailable',
            detail: `${adapter.label} could not be started: ${error.message}`
        }));
        child.on('exit', code => {
            if (!settled) {
                finish({
                    source: 'unavailable',
                    detail: `${adapter.label} exited before textDocument/documentSymbol completed${code === null ? '' : ` (exit ${code})`}.`
                });
            }
        });
        child.stderr.on('data', chunk => stderr.push(Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk)));
        child.stdout.on('data', chunk => {
            const data = Buffer.isBuffer(chunk) ? Buffer.from(chunk) : Buffer.from(String(chunk));
            stdoutBuffer = Buffer.concat([stdoutBuffer, data]);
            const messages = readJsonRpcMessages(stdoutBuffer);
            stdoutBuffer = messages.remaining;
            for (const message of messages.messages) {
                if (message.id === 1 && !message.method) {
                    if (message.error) {
                        finish({
                            source: 'unavailable',
                            detail: `${adapter.label} rejected LSP initialize: ${message.error.message ?? message.error.code ?? 'unknown error'}.`
                        });
                        return;
                    }
                    if (!documentSymbolRequested) {
                        documentSymbolRequested = true;
                        sendJsonRpc(child.stdin, { jsonrpc: '2.0', method: 'initialized', params: {} });
                        documentOpened = true;
                        sendJsonRpc(child.stdin, {
                            jsonrpc: '2.0',
                            method: 'textDocument/didOpen',
                            params: {
                                textDocument: {
                                    uri: documentUri,
                                    languageId: adapter.language === 'razor' ? 'razor' : 'csharp',
                                    version: 1,
                                    text: content
                                }
                            }
                        });
                        sendJsonRpc(child.stdin, {
                            jsonrpc: '2.0',
                            id: 2,
                            method: 'textDocument/documentSymbol',
                            params: {
                                textDocument: {
                                    uri: documentUri
                                }
                            }
                        });
                    }
                    continue;
                }
                if (message.id === 2) {
                    if (message.error) {
                        finish({
                            source: 'unavailable',
                            detail: `${adapter.label} rejected textDocument/documentSymbol: ${message.error.message ?? message.error.code ?? 'unknown error'}.`
                        });
                        return;
                    }
                    const symbols = toDocumentSymbols(message.result, documentUri);
                    finish({
                        source: 'language-server',
                        symbols,
                        detail: `${adapter.label} returned ${symbols.length} document symbol(s) from textDocument/documentSymbol.`
                    });
                    return;
                }
            }
        });

        sendJsonRpc(child.stdin, {
            jsonrpc: '2.0',
            id: 1,
            method: 'initialize',
            params: {
                processId: process.pid,
                rootUri: pathToFileURL(path.resolve(workspacePath)).toString(),
                workspaceFolders: [
                    {
                        uri: pathToFileURL(path.resolve(workspacePath)).toString(),
                        name: path.basename(workspacePath)
                    }
                ],
                capabilities: {
                    textDocument: {
                        documentSymbol: {
                            hierarchicalDocumentSymbolSupport: true
                        }
                    }
                },
                clientInfo: {
                    name: 'CyberVinci C# Kit',
                    version: '1.71.0'
                },
                trace: 'off'
            }
        });
    });
}

export async function requestCSharpLanguageServerWorkspaceSymbols(
    adapter: CSharpLanguageServerAdapterStatus,
    workspacePath: string,
    query: string,
    timeoutMs = adapter.probeTimeoutMs ?? DEFAULT_LSP_PROBE_TIMEOUT_MS
): Promise<CSharpLanguageServerWorkspaceSymbolResult> {
    const raw = await requestCSharpLanguageServerTextDocumentFeature(
        adapter,
        workspacePath,
        workspacePath,
        '',
        {
            method: 'workspace/symbol',
            label: 'workspace/symbol',
            timeoutMs,
            capabilities: {},
            workspaceCapabilities: {
                symbol: {
                    dynamicRegistration: false,
                    symbolKind: {
                        valueSet: Array.from({ length: 26 }, (_, index) => index + 1)
                    },
                    tagSupport: {
                        valueSet: [1]
                    },
                    resolveSupport: {
                        properties: ['location.range']
                    }
                }
            },
            openDocument: false,
            params: () => ({
                query
            })
        }
    );
    if (raw.source !== 'language-server') {
        return {
            workspacePath,
            source: 'unavailable',
            adapterId: adapter.id,
            adapterLabel: adapter.label,
            durationMs: raw.durationMs,
            symbols: [],
            detail: raw.detail,
            stderr: raw.stderr
        };
    }
    const symbols = toWorkspaceSymbols(raw.result);
    return {
        workspacePath,
        source: 'language-server',
        adapterId: adapter.id,
        adapterLabel: adapter.label,
        durationMs: raw.durationMs,
        symbols,
        detail: `${adapter.label} returned ${symbols.length} workspace symbol(s) from workspace/symbol.`,
        stderr: raw.stderr
    };
}

export async function requestCSharpLanguageServerResolveWorkspaceSymbol(
    adapter: CSharpLanguageServerAdapterStatus,
    workspacePath: string,
    symbol: CSharpLanguageServerWorkspaceSymbol,
    timeoutMs = adapter.probeTimeoutMs ?? DEFAULT_LSP_PROBE_TIMEOUT_MS
): Promise<CSharpLanguageServerWorkspaceSymbolResolveResult> {
    const raw = await requestCSharpLanguageServerTextDocumentFeature(
        adapter,
        workspacePath,
        workspacePath,
        '',
        {
            method: 'workspaceSymbol/resolve',
            label: 'workspaceSymbol/resolve',
            timeoutMs,
            capabilities: {},
            workspaceCapabilities: {
                symbol: {
                    dynamicRegistration: false,
                    symbolKind: {
                        valueSet: Array.from({ length: 26 }, (_, index) => index + 1)
                    },
                    tagSupport: {
                        valueSet: [1]
                    },
                    resolveSupport: {
                        properties: ['location.range']
                    }
                }
            },
            openDocument: false,
            params: () => toLspWorkspaceSymbol(symbol)
        }
    );
    if (raw.source !== 'language-server') {
        return {
            workspacePath,
            source: 'unavailable',
            adapterId: adapter.id,
            adapterLabel: adapter.label,
            durationMs: raw.durationMs,
            detail: raw.detail,
            stderr: raw.stderr
        };
    }
    const resolved = workspaceSymbol(raw.result);
    return {
        workspacePath,
        source: 'language-server',
        adapterId: adapter.id,
        adapterLabel: adapter.label,
        durationMs: raw.durationMs,
        symbol: resolved,
        detail: resolved
            ? `${adapter.label} resolved workspace symbol ${resolved.name} from workspaceSymbol/resolve.`
            : `${adapter.label} resolved workspace symbol with an unsupported shape.`,
        stderr: raw.stderr
    };
}

export async function requestCSharpLanguageServerDocumentLinks(
    adapter: CSharpLanguageServerAdapterStatus,
    workspacePath: string,
    documentPath: string,
    content: string,
    timeoutMs = adapter.probeTimeoutMs ?? DEFAULT_LSP_PROBE_TIMEOUT_MS
): Promise<CSharpLanguageServerDocumentLinkResult> {
    const base = languageServerFeatureResultBase(adapter, workspacePath, documentPath);
    const raw = await requestCSharpLanguageServerTextDocumentFeature(
        adapter,
        workspacePath,
        documentPath,
        content,
        {
            method: 'textDocument/documentLink',
            label: 'textDocument/documentLink',
            timeoutMs,
            capabilities: {
                documentLink: {
                    dynamicRegistration: false,
                    tooltipSupport: true
                }
            },
            params: documentUri => ({
                textDocument: {
                    uri: documentUri
                }
            })
        }
    );
    if (raw.source !== 'language-server') {
        return {
            ...base,
            source: 'unavailable',
            durationMs: raw.durationMs,
            links: [],
            detail: raw.detail,
            stderr: raw.stderr
        };
    }
    const links = toDocumentLinks(raw.result);
    return {
        ...base,
        source: 'language-server',
        durationMs: raw.durationMs,
        links,
        detail: `${adapter.label} returned ${links.length} document link(s) from textDocument/documentLink.`,
        stderr: raw.stderr
    };
}

export async function requestCSharpLanguageServerResolveDocumentLink(
    adapter: CSharpLanguageServerAdapterStatus,
    workspacePath: string,
    documentPath: string,
    content: string,
    link: CSharpLanguageServerDocumentLink,
    timeoutMs = adapter.probeTimeoutMs ?? DEFAULT_LSP_PROBE_TIMEOUT_MS
): Promise<CSharpLanguageServerDocumentLinkResolveResult> {
    const base = languageServerFeatureResultBase(adapter, workspacePath, documentPath);
    const raw = await requestCSharpLanguageServerTextDocumentFeature(
        adapter,
        workspacePath,
        documentPath,
        content,
        {
            method: 'documentLink/resolve',
            label: 'documentLink/resolve',
            timeoutMs,
            capabilities: {
                documentLink: {
                    dynamicRegistration: false,
                    tooltipSupport: true
                }
            },
            params: () => toLspDocumentLink(link)
        }
    );
    if (raw.source !== 'language-server') {
        return {
            ...base,
            source: 'unavailable',
            durationMs: raw.durationMs,
            detail: raw.detail,
            stderr: raw.stderr
        };
    }
    const resolved = documentLink(raw.result);
    return {
        ...base,
        source: 'language-server',
        durationMs: raw.durationMs,
        link: resolved,
        detail: resolved?.target
            ? `${adapter.label} resolved document link ${resolved.target}.`
            : `${adapter.label} resolved document link without a target.`,
        stderr: raw.stderr
    };
}

export async function requestCSharpLanguageServerDocumentColors(
    adapter: CSharpLanguageServerAdapterStatus,
    workspacePath: string,
    documentPath: string,
    content: string,
    timeoutMs = adapter.probeTimeoutMs ?? DEFAULT_LSP_PROBE_TIMEOUT_MS
): Promise<CSharpLanguageServerDocumentColorResult> {
    const base = languageServerFeatureResultBase(adapter, workspacePath, documentPath);
    const raw = await requestCSharpLanguageServerTextDocumentFeature(
        adapter,
        workspacePath,
        documentPath,
        content,
        {
            method: 'textDocument/documentColor',
            label: 'textDocument/documentColor',
            timeoutMs,
            capabilities: {
                colorProvider: {
                    dynamicRegistration: false
                }
            },
            params: documentUri => ({
                textDocument: {
                    uri: documentUri
                }
            })
        }
    );
    if (raw.source !== 'language-server') {
        return {
            ...base,
            source: 'unavailable',
            durationMs: raw.durationMs,
            colors: [],
            detail: raw.detail,
            stderr: raw.stderr
        };
    }
    const colors = toDocumentColors(raw.result);
    return {
        ...base,
        source: 'language-server',
        durationMs: raw.durationMs,
        colors,
        detail: `${adapter.label} returned ${colors.length} document color(s) from textDocument/documentColor.`,
        stderr: raw.stderr
    };
}

export async function requestCSharpLanguageServerCodeLenses(
    adapter: CSharpLanguageServerAdapterStatus,
    workspacePath: string,
    documentPath: string,
    content: string,
    timeoutMs = adapter.probeTimeoutMs ?? DEFAULT_LSP_PROBE_TIMEOUT_MS
): Promise<CSharpLanguageServerCodeLensResult> {
    const base = languageServerFeatureResultBase(adapter, workspacePath, documentPath);
    const raw = await requestCSharpLanguageServerTextDocumentFeature(
        adapter,
        workspacePath,
        documentPath,
        content,
        {
            method: 'textDocument/codeLens',
            label: 'textDocument/codeLens',
            timeoutMs,
            capabilities: {
                codeLens: {
                    dynamicRegistration: false
                }
            },
            params: documentUri => ({
                textDocument: { uri: documentUri }
            })
        }
    );
    if (raw.source !== 'language-server') {
        return {
            ...base,
            source: 'unavailable',
            durationMs: raw.durationMs,
            lenses: [],
            detail: raw.detail,
            stderr: raw.stderr
        };
    }
    const lenses = toCodeLenses(raw.result);
    return {
        ...base,
        source: 'language-server',
        durationMs: raw.durationMs,
        lenses,
        detail: `${adapter.label} returned ${lenses.length} code lens(es) from textDocument/codeLens.`,
        stderr: raw.stderr
    };
}

export async function requestCSharpLanguageServerResolveCodeLens(
    adapter: CSharpLanguageServerAdapterStatus,
    workspacePath: string,
    documentPath: string,
    content: string,
    lens: CSharpLanguageServerCodeLens,
    timeoutMs = adapter.probeTimeoutMs ?? DEFAULT_LSP_PROBE_TIMEOUT_MS
): Promise<CSharpLanguageServerCodeLensResolveResult> {
    const base = languageServerFeatureResultBase(adapter, workspacePath, documentPath);
    const raw = await requestCSharpLanguageServerTextDocumentFeature(
        adapter,
        workspacePath,
        documentPath,
        content,
        {
            method: 'codeLens/resolve',
            label: 'codeLens/resolve',
            timeoutMs,
            capabilities: {
                codeLens: {
                    dynamicRegistration: false
                }
            },
            params: () => toLspCodeLens(lens)
        }
    );
    if (raw.source !== 'language-server') {
        return {
            ...base,
            source: 'unavailable',
            durationMs: raw.durationMs,
            detail: raw.detail,
            stderr: raw.stderr
        };
    }
    const resolved = codeLens(raw.result);
    return {
        ...base,
        source: 'language-server',
        durationMs: raw.durationMs,
        lens: resolved,
        detail: resolved?.command
            ? `${adapter.label} resolved code lens command ${resolved.command.command}.`
            : `${adapter.label} resolved code lens without a command.`,
        stderr: raw.stderr
    };
}

export async function requestCSharpLanguageServerLinkedEditingRanges(
    adapter: CSharpLanguageServerAdapterStatus,
    workspacePath: string,
    documentPath: string,
    content: string,
    position: { line: number; column: number },
    timeoutMs = adapter.probeTimeoutMs ?? DEFAULT_LSP_PROBE_TIMEOUT_MS
): Promise<CSharpLanguageServerLinkedEditingRangeResult> {
    const base = languageServerFeatureResultBase(adapter, workspacePath, documentPath);
    const raw = await requestCSharpLanguageServerTextDocumentFeature(
        adapter,
        workspacePath,
        documentPath,
        content,
        {
            method: 'textDocument/linkedEditingRange',
            label: 'textDocument/linkedEditingRange',
            timeoutMs,
            capabilities: {
                linkedEditingRange: {
                    dynamicRegistration: false
                }
            },
            params: documentUri => ({
                textDocument: { uri: documentUri },
                position: lspPosition(position)
            })
        }
    );
    if (raw.source !== 'language-server') {
        return {
            ...base,
            source: 'unavailable',
            durationMs: raw.durationMs,
            ranges: [],
            detail: raw.detail,
            stderr: raw.stderr
        };
    }
    const linkedEditingRanges = toLinkedEditingRanges(raw.result);
    return {
        ...base,
        source: 'language-server',
        durationMs: raw.durationMs,
        ranges: linkedEditingRanges.ranges,
        wordPattern: linkedEditingRanges.wordPattern,
        detail: `${adapter.label} returned ${linkedEditingRanges.ranges.length} linked editing range(s) from textDocument/linkedEditingRange.`,
        stderr: raw.stderr
    };
}

export async function requestCSharpLanguageServerMonikers(
    adapter: CSharpLanguageServerAdapterStatus,
    workspacePath: string,
    documentPath: string,
    content: string,
    position: { line: number; column: number },
    timeoutMs = adapter.probeTimeoutMs ?? DEFAULT_LSP_PROBE_TIMEOUT_MS
): Promise<CSharpLanguageServerMonikerResult> {
    const base = languageServerFeatureResultBase(adapter, workspacePath, documentPath);
    const raw = await requestCSharpLanguageServerTextDocumentFeature(
        adapter,
        workspacePath,
        documentPath,
        content,
        {
            method: 'textDocument/moniker',
            label: 'textDocument/moniker',
            timeoutMs,
            capabilities: {
                moniker: {
                    dynamicRegistration: false
                }
            },
            params: documentUri => ({
                textDocument: { uri: documentUri },
                position: lspPosition(position)
            })
        }
    );
    if (raw.source !== 'language-server') {
        return {
            ...base,
            source: 'unavailable',
            durationMs: raw.durationMs,
            monikers: [],
            detail: raw.detail,
            stderr: raw.stderr
        };
    }
    const monikers = toMonikers(raw.result);
    return {
        ...base,
        source: 'language-server',
        durationMs: raw.durationMs,
        monikers,
        detail: `${adapter.label} returned ${monikers.length} moniker(s) from textDocument/moniker.`,
        stderr: raw.stderr
    };
}

export async function requestCSharpLanguageServerInlineValues(
    adapter: CSharpLanguageServerAdapterStatus,
    workspacePath: string,
    documentPath: string,
    content: string,
    range: CSharpWorkspaceSymbolRange,
    context: CSharpLanguageServerInlineValueContext,
    timeoutMs = adapter.probeTimeoutMs ?? DEFAULT_LSP_PROBE_TIMEOUT_MS
): Promise<CSharpLanguageServerInlineValueResult> {
    const base = languageServerFeatureResultBase(adapter, workspacePath, documentPath);
    const raw = await requestCSharpLanguageServerTextDocumentFeature(
        adapter,
        workspacePath,
        documentPath,
        content,
        {
            method: 'textDocument/inlineValue',
            label: 'textDocument/inlineValue',
            timeoutMs,
            capabilities: {
                inlineValue: {
                    dynamicRegistration: false
                }
            },
            params: documentUri => ({
                textDocument: { uri: documentUri },
                range: toLspRange(range),
                context: toLspInlineValueContext(context)
            })
        }
    );
    if (raw.source !== 'language-server') {
        return {
            ...base,
            source: 'unavailable',
            durationMs: raw.durationMs,
            inlineValues: [],
            detail: raw.detail,
            stderr: raw.stderr
        };
    }
    const inlineValues = toInlineValues(raw.result);
    return {
        ...base,
        source: 'language-server',
        durationMs: raw.durationMs,
        inlineValues,
        detail: `${adapter.label} returned ${inlineValues.length} inline value(s) from textDocument/inlineValue.`,
        stderr: raw.stderr
    };
}

export async function requestCSharpLanguageServerEvaluatableExpression(
    adapter: CSharpLanguageServerAdapterStatus,
    workspacePath: string,
    documentPath: string,
    content: string,
    position: { line: number; column: number },
    timeoutMs = adapter.probeTimeoutMs ?? DEFAULT_LSP_PROBE_TIMEOUT_MS
): Promise<CSharpLanguageServerEvaluatableExpressionResult> {
    const base = languageServerFeatureResultBase(adapter, workspacePath, documentPath);
    const raw = await requestCSharpLanguageServerTextDocumentFeature(
        adapter,
        workspacePath,
        documentPath,
        content,
        {
            method: 'textDocument/evaluatableExpression',
            label: 'textDocument/evaluatableExpression',
            timeoutMs,
            capabilities: {
                evaluatableExpression: {
                    dynamicRegistration: false
                }
            },
            params: documentUri => ({
                textDocument: { uri: documentUri },
                position: lspPosition(position)
            })
        }
    );
    if (raw.source !== 'language-server') {
        return {
            ...base,
            source: 'unavailable',
            durationMs: raw.durationMs,
            detail: raw.detail,
            stderr: raw.stderr
        };
    }
    const expression = toEvaluatableExpression(raw.result);
    return {
        ...base,
        source: 'language-server',
        durationMs: raw.durationMs,
        ...(expression ? { expression } : {}),
        detail: expression
            ? `${adapter.label} returned an evaluatable expression from textDocument/evaluatableExpression.`
            : `${adapter.label} did not return an evaluatable expression from textDocument/evaluatableExpression.`,
        stderr: raw.stderr
    };
}

export async function requestCSharpLanguageServerSemanticTokens(
    adapter: CSharpLanguageServerAdapterStatus,
    workspacePath: string,
    documentPath: string,
    content: string,
    timeoutMs = adapter.probeTimeoutMs ?? DEFAULT_LSP_PROBE_TIMEOUT_MS,
    previousResultId?: string
): Promise<CSharpLanguageServerSemanticTokensResult> {
    const base = languageServerFeatureResultBase(adapter, workspacePath, documentPath);
    let requestDelta = false;
    const raw = await requestCSharpLanguageServerTextDocumentFeature(
        adapter,
        workspacePath,
        documentPath,
        content,
        {
            method: initializeResult => {
                requestDelta = Boolean(previousResultId && semanticTokensFullDeltaSupported(initializeResult));
                return requestDelta ? 'textDocument/semanticTokens/full/delta' : 'textDocument/semanticTokens/full';
            },
            label: previousResultId ? 'textDocument/semanticTokens/full/delta' : 'textDocument/semanticTokens/full',
            timeoutMs,
            capabilities: {
                semanticTokens: {
                    dynamicRegistration: false,
                    requests: {
                        full: {
                            delta: true
                        },
                        range: false
                    },
                    tokenTypes: CSHARP_LANGUAGE_SERVER_SEMANTIC_TOKEN_TYPES,
                    tokenModifiers: CSHARP_LANGUAGE_SERVER_SEMANTIC_TOKEN_MODIFIERS,
                    formats: ['relative'],
                    overlappingTokenSupport: false,
                    multilineTokenSupport: true,
                    serverCancelSupport: false,
                    augmentsSyntaxTokens: true
                }
            },
            params: documentUri => ({
                textDocument: { uri: documentUri },
                ...(requestDelta && previousResultId ? { previousResultId } : {})
            })
        }
    );
    if (raw.source !== 'language-server') {
        return {
            ...base,
            source: 'unavailable',
            durationMs: raw.durationMs,
            data: [],
            detail: raw.detail,
            stderr: raw.stderr
        };
    }
    const serverLegend = semanticTokensLegend(raw.initializeResult);
    const tokenDelta = requestDelta ? toSemanticTokenDelta(raw.result, serverLegend) : undefined;
    if (tokenDelta) {
        return {
            ...base,
            source: 'language-server',
            durationMs: raw.durationMs,
            resultId: tokenDelta.resultId,
            data: [],
            edits: tokenDelta.edits,
            detail: `${adapter.label} returned ${tokenDelta.edits.length} semantic token edit(s) from textDocument/semanticTokens/full/delta.`,
            stderr: raw.stderr
        };
    }
    const tokens = toSemanticTokens(raw.result, serverLegend);
    return {
        ...base,
        source: 'language-server',
        durationMs: raw.durationMs,
        resultId: tokens.resultId,
        data: tokens.data,
        detail: `${adapter.label} returned ${tokens.data.length / 5} semantic token(s) from textDocument/semanticTokens/full.`,
        stderr: raw.stderr
    };
}

export async function requestCSharpLanguageServerRangeSemanticTokens(
    adapter: CSharpLanguageServerAdapterStatus,
    workspacePath: string,
    documentPath: string,
    content: string,
    range: CSharpWorkspaceSymbolRange,
    timeoutMs = adapter.probeTimeoutMs ?? DEFAULT_LSP_PROBE_TIMEOUT_MS
): Promise<CSharpLanguageServerSemanticTokensResult> {
    const base = languageServerFeatureResultBase(adapter, workspacePath, documentPath);
    const raw = await requestCSharpLanguageServerTextDocumentFeature(
        adapter,
        workspacePath,
        documentPath,
        content,
        {
            method: 'textDocument/semanticTokens/range',
            label: 'textDocument/semanticTokens/range',
            timeoutMs,
            capabilities: {
                semanticTokens: {
                    dynamicRegistration: false,
                    requests: {
                        full: true,
                        range: true
                    },
                    tokenTypes: CSHARP_LANGUAGE_SERVER_SEMANTIC_TOKEN_TYPES,
                    tokenModifiers: CSHARP_LANGUAGE_SERVER_SEMANTIC_TOKEN_MODIFIERS,
                    formats: ['relative'],
                    overlappingTokenSupport: false,
                    multilineTokenSupport: true,
                    serverCancelSupport: false,
                    augmentsSyntaxTokens: true
                }
            },
            params: documentUri => ({
                textDocument: { uri: documentUri },
                range: toLspRange(range)
            })
        }
    );
    if (raw.source !== 'language-server') {
        return {
            ...base,
            source: 'unavailable',
            durationMs: raw.durationMs,
            data: [],
            detail: raw.detail,
            stderr: raw.stderr
        };
    }
    const tokens = toSemanticTokens(raw.result, semanticTokensLegend(raw.initializeResult));
    return {
        ...base,
        source: 'language-server',
        durationMs: raw.durationMs,
        resultId: tokens.resultId,
        data: tokens.data,
        detail: `${adapter.label} returned ${tokens.data.length / 5} semantic token(s) from textDocument/semanticTokens/range.`,
        stderr: raw.stderr
    };
}

export async function requestCSharpLanguageServerHover(
    adapter: CSharpLanguageServerAdapterStatus,
    workspacePath: string,
    documentPath: string,
    content: string,
    position: { line: number; column: number },
    timeoutMs = adapter.probeTimeoutMs ?? DEFAULT_LSP_PROBE_TIMEOUT_MS
): Promise<CSharpLanguageServerHoverResult> {
    const base = languageServerFeatureResultBase(adapter, workspacePath, documentPath);
    const raw = await requestCSharpLanguageServerTextDocumentFeature(
        adapter,
        workspacePath,
        documentPath,
        content,
        {
            method: 'textDocument/hover',
            label: 'textDocument/hover',
            timeoutMs,
            capabilities: {
                hover: {
                    contentFormat: ['markdown', 'plaintext']
                }
            },
            params: documentUri => ({
                textDocument: { uri: documentUri },
                position: lspPosition(position)
            })
        }
    );
    if (raw.source !== 'language-server') {
        return {
            ...base,
            source: 'unavailable',
            durationMs: raw.durationMs,
            contents: [],
            detail: raw.detail,
            stderr: raw.stderr
        };
    }
    const hover = toHover(raw.result);
    return {
        ...base,
        source: 'language-server',
        durationMs: raw.durationMs,
        contents: hover.contents,
        range: hover.range,
        detail: `${adapter.label} returned ${hover.contents.length} hover content item(s) from textDocument/hover.`,
        stderr: raw.stderr
    };
}

export async function requestCSharpLanguageServerFoldingRanges(
    adapter: CSharpLanguageServerAdapterStatus,
    workspacePath: string,
    documentPath: string,
    content: string,
    timeoutMs = adapter.probeTimeoutMs ?? DEFAULT_LSP_PROBE_TIMEOUT_MS
): Promise<CSharpLanguageServerFoldingRangeResult> {
    const base = languageServerFeatureResultBase(adapter, workspacePath, documentPath);
    const raw = await requestCSharpLanguageServerTextDocumentFeature(
        adapter,
        workspacePath,
        documentPath,
        content,
        {
            method: 'textDocument/foldingRange',
            label: 'textDocument/foldingRange',
            timeoutMs,
            capabilities: {
                foldingRange: {
                    dynamicRegistration: false,
                    lineFoldingOnly: true,
                    foldingRangeKind: {
                        valueSet: ['comment', 'imports', 'region']
                    }
                }
            },
            params: documentUri => ({
                textDocument: {
                    uri: documentUri
                }
            })
        }
    );
    if (raw.source !== 'language-server') {
        return {
            ...base,
            source: 'unavailable',
            durationMs: raw.durationMs,
            ranges: [],
            detail: raw.detail,
            stderr: raw.stderr
        };
    }
    const ranges = toFoldingRanges(raw.result);
    return {
        ...base,
        source: 'language-server',
        durationMs: raw.durationMs,
        ranges,
        detail: `${adapter.label} returned ${ranges.length} folding range(s) from textDocument/foldingRange.`,
        stderr: raw.stderr
    };
}

export async function requestCSharpLanguageServerSelectionRanges(
    adapter: CSharpLanguageServerAdapterStatus,
    workspacePath: string,
    documentPath: string,
    content: string,
    positions: Array<{ line: number; column: number }>,
    timeoutMs = adapter.probeTimeoutMs ?? DEFAULT_LSP_PROBE_TIMEOUT_MS
): Promise<CSharpLanguageServerSelectionRangeResult> {
    const base = languageServerFeatureResultBase(adapter, workspacePath, documentPath);
    const raw = await requestCSharpLanguageServerTextDocumentFeature(
        adapter,
        workspacePath,
        documentPath,
        content,
        {
            method: 'textDocument/selectionRange',
            label: 'textDocument/selectionRange',
            timeoutMs,
            capabilities: {
                selectionRange: {
                    dynamicRegistration: false
                }
            },
            params: documentUri => ({
                textDocument: {
                    uri: documentUri
                },
                positions: positions.map(lspPosition)
            })
        }
    );
    if (raw.source !== 'language-server') {
        return {
            ...base,
            source: 'unavailable',
            durationMs: raw.durationMs,
            ranges: [],
            detail: raw.detail,
            stderr: raw.stderr
        };
    }
    const ranges = toSelectionRangeChains(raw.result);
    return {
        ...base,
        source: 'language-server',
        durationMs: raw.durationMs,
        ranges,
        detail: `${adapter.label} returned ${ranges.length} selection range chain(s) from textDocument/selectionRange.`,
        stderr: raw.stderr
    };
}

export async function requestCSharpLanguageServerDocumentHighlights(
    adapter: CSharpLanguageServerAdapterStatus,
    workspacePath: string,
    documentPath: string,
    content: string,
    position: { line: number; column: number },
    timeoutMs = adapter.probeTimeoutMs ?? DEFAULT_LSP_PROBE_TIMEOUT_MS
): Promise<CSharpLanguageServerDocumentHighlightResult> {
    const base = languageServerFeatureResultBase(adapter, workspacePath, documentPath);
    const raw = await requestCSharpLanguageServerTextDocumentFeature(
        adapter,
        workspacePath,
        documentPath,
        content,
        {
            method: 'textDocument/documentHighlight',
            label: 'textDocument/documentHighlight',
            timeoutMs,
            capabilities: {
                documentHighlight: {
                    dynamicRegistration: false
                }
            },
            params: documentUri => ({
                textDocument: { uri: documentUri },
                position: lspPosition(position)
            })
        }
    );
    if (raw.source !== 'language-server') {
        return {
            ...base,
            source: 'unavailable',
            durationMs: raw.durationMs,
            highlights: [],
            detail: raw.detail,
            stderr: raw.stderr
        };
    }
    const highlights = toDocumentHighlights(raw.result);
    return {
        ...base,
        source: 'language-server',
        durationMs: raw.durationMs,
        highlights,
        detail: `${adapter.label} returned ${highlights.length} document highlight(s) from textDocument/documentHighlight.`,
        stderr: raw.stderr
    };
}

export async function requestCSharpLanguageServerDefinitions(
    adapter: CSharpLanguageServerAdapterStatus,
    workspacePath: string,
    documentPath: string,
    content: string,
    position: { line: number; column: number },
    timeoutMs = adapter.probeTimeoutMs ?? DEFAULT_LSP_PROBE_TIMEOUT_MS
): Promise<CSharpLanguageServerDefinitionResult> {
    const base = languageServerFeatureResultBase(adapter, workspacePath, documentPath);
    const raw = await requestCSharpLanguageServerTextDocumentFeature(
        adapter,
        workspacePath,
        documentPath,
        content,
        {
            method: 'textDocument/definition',
            label: 'textDocument/definition',
            timeoutMs,
            capabilities: {
                definition: {
                    linkSupport: true
                }
            },
            params: documentUri => ({
                textDocument: { uri: documentUri },
                position: lspPosition(position)
            })
        }
    );
    if (raw.source !== 'language-server') {
        return {
            ...base,
            source: 'unavailable',
            durationMs: raw.durationMs,
            locations: [],
            detail: raw.detail,
            stderr: raw.stderr
        };
    }
    const locations = toDefinitionLocations(raw.result);
    return {
        ...base,
        source: 'language-server',
        durationMs: raw.durationMs,
        locations,
        detail: `${adapter.label} returned ${locations.length} definition location(s) from textDocument/definition.`,
        stderr: raw.stderr
    };
}

export async function requestCSharpLanguageServerDeclarations(
    adapter: CSharpLanguageServerAdapterStatus,
    workspacePath: string,
    documentPath: string,
    content: string,
    position: { line: number; column: number },
    timeoutMs = adapter.probeTimeoutMs ?? DEFAULT_LSP_PROBE_TIMEOUT_MS
): Promise<CSharpLanguageServerDefinitionResult> {
    const base = languageServerFeatureResultBase(adapter, workspacePath, documentPath);
    const raw = await requestCSharpLanguageServerTextDocumentFeature(
        adapter,
        workspacePath,
        documentPath,
        content,
        {
            method: 'textDocument/declaration',
            label: 'textDocument/declaration',
            timeoutMs,
            capabilities: {
                declaration: {
                    linkSupport: true
                }
            },
            params: documentUri => ({
                textDocument: { uri: documentUri },
                position: lspPosition(position)
            })
        }
    );
    if (raw.source !== 'language-server') {
        return {
            ...base,
            source: 'unavailable',
            durationMs: raw.durationMs,
            locations: [],
            detail: raw.detail,
            stderr: raw.stderr
        };
    }
    const locations = toDefinitionLocations(raw.result);
    return {
        ...base,
        source: 'language-server',
        durationMs: raw.durationMs,
        locations,
        detail: `${adapter.label} returned ${locations.length} declaration location(s) from textDocument/declaration.`,
        stderr: raw.stderr
    };
}

export async function requestCSharpLanguageServerImplementations(
    adapter: CSharpLanguageServerAdapterStatus,
    workspacePath: string,
    documentPath: string,
    content: string,
    position: { line: number; column: number },
    timeoutMs = adapter.probeTimeoutMs ?? DEFAULT_LSP_PROBE_TIMEOUT_MS
): Promise<CSharpLanguageServerDefinitionResult> {
    const base = languageServerFeatureResultBase(adapter, workspacePath, documentPath);
    const raw = await requestCSharpLanguageServerTextDocumentFeature(
        adapter,
        workspacePath,
        documentPath,
        content,
        {
            method: 'textDocument/implementation',
            label: 'textDocument/implementation',
            timeoutMs,
            capabilities: {
                implementation: {
                    linkSupport: true
                }
            },
            params: documentUri => ({
                textDocument: { uri: documentUri },
                position: lspPosition(position)
            })
        }
    );
    if (raw.source !== 'language-server') {
        return {
            ...base,
            source: 'unavailable',
            durationMs: raw.durationMs,
            locations: [],
            detail: raw.detail,
            stderr: raw.stderr
        };
    }
    const locations = toDefinitionLocations(raw.result);
    return {
        ...base,
        source: 'language-server',
        durationMs: raw.durationMs,
        locations,
        detail: `${adapter.label} returned ${locations.length} implementation location(s) from textDocument/implementation.`,
        stderr: raw.stderr
    };
}

export async function requestCSharpLanguageServerTypeDefinitions(
    adapter: CSharpLanguageServerAdapterStatus,
    workspacePath: string,
    documentPath: string,
    content: string,
    position: { line: number; column: number },
    timeoutMs = adapter.probeTimeoutMs ?? DEFAULT_LSP_PROBE_TIMEOUT_MS
): Promise<CSharpLanguageServerDefinitionResult> {
    const base = languageServerFeatureResultBase(adapter, workspacePath, documentPath);
    const raw = await requestCSharpLanguageServerTextDocumentFeature(
        adapter,
        workspacePath,
        documentPath,
        content,
        {
            method: 'textDocument/typeDefinition',
            label: 'textDocument/typeDefinition',
            timeoutMs,
            capabilities: {
                typeDefinition: {
                    linkSupport: true
                }
            },
            params: documentUri => ({
                textDocument: { uri: documentUri },
                position: lspPosition(position)
            })
        }
    );
    if (raw.source !== 'language-server') {
        return {
            ...base,
            source: 'unavailable',
            durationMs: raw.durationMs,
            locations: [],
            detail: raw.detail,
            stderr: raw.stderr
        };
    }
    const locations = toDefinitionLocations(raw.result);
    return {
        ...base,
        source: 'language-server',
        durationMs: raw.durationMs,
        locations,
        detail: `${adapter.label} returned ${locations.length} type-definition location(s) from textDocument/typeDefinition.`,
        stderr: raw.stderr
    };
}

export async function requestCSharpLanguageServerPrepareCallHierarchy(
    adapter: CSharpLanguageServerAdapterStatus,
    workspacePath: string,
    documentPath: string,
    content: string,
    position: { line: number; column: number },
    timeoutMs = adapter.probeTimeoutMs ?? DEFAULT_LSP_PROBE_TIMEOUT_MS
): Promise<CSharpLanguageServerCallHierarchyPrepareResult> {
    const base = languageServerFeatureResultBase(adapter, workspacePath, documentPath);
    const raw = await requestCSharpLanguageServerTextDocumentFeature(
        adapter,
        workspacePath,
        documentPath,
        content,
        {
            method: 'textDocument/prepareCallHierarchy',
            label: 'textDocument/prepareCallHierarchy',
            timeoutMs,
            capabilities: {
                callHierarchy: {
                    dynamicRegistration: false
                }
            },
            params: documentUri => ({
                textDocument: { uri: documentUri },
                position: lspPosition(position)
            })
        }
    );
    if (raw.source !== 'language-server') {
        return {
            ...base,
            source: 'unavailable',
            durationMs: raw.durationMs,
            items: [],
            detail: raw.detail,
            stderr: raw.stderr
        };
    }
    const items = toCallHierarchyItems(raw.result);
    return {
        ...base,
        source: 'language-server',
        durationMs: raw.durationMs,
        items,
        detail: `${adapter.label} returned ${items.length} call hierarchy item(s) from textDocument/prepareCallHierarchy.`,
        stderr: raw.stderr
    };
}

export async function requestCSharpLanguageServerCallHierarchyIncomingCalls(
    adapter: CSharpLanguageServerAdapterStatus,
    workspacePath: string,
    documentPath: string,
    item: CSharpLanguageServerCallHierarchyItem,
    timeoutMs = adapter.probeTimeoutMs ?? DEFAULT_LSP_PROBE_TIMEOUT_MS
): Promise<CSharpLanguageServerCallHierarchyIncomingResult> {
    const base = languageServerFeatureResultBase(adapter, workspacePath, documentPath);
    const raw = await requestCSharpLanguageServerTextDocumentFeature(
        adapter,
        workspacePath,
        documentPath,
        '',
        {
            method: 'callHierarchy/incomingCalls',
            label: 'callHierarchy/incomingCalls',
            timeoutMs,
            capabilities: {
                callHierarchy: {
                    dynamicRegistration: false
                }
            },
            openDocument: false,
            params: () => ({
                item: toLspCallHierarchyItem(item)
            })
        }
    );
    if (raw.source !== 'language-server') {
        return {
            ...base,
            source: 'unavailable',
            durationMs: raw.durationMs,
            calls: [],
            detail: raw.detail,
            stderr: raw.stderr
        };
    }
    const calls = toCallHierarchyIncomingCalls(raw.result);
    return {
        ...base,
        source: 'language-server',
        durationMs: raw.durationMs,
        calls,
        detail: `${adapter.label} returned ${calls.length} incoming call(s) from callHierarchy/incomingCalls.`,
        stderr: raw.stderr
    };
}

export async function requestCSharpLanguageServerCallHierarchyOutgoingCalls(
    adapter: CSharpLanguageServerAdapterStatus,
    workspacePath: string,
    documentPath: string,
    item: CSharpLanguageServerCallHierarchyItem,
    timeoutMs = adapter.probeTimeoutMs ?? DEFAULT_LSP_PROBE_TIMEOUT_MS
): Promise<CSharpLanguageServerCallHierarchyOutgoingResult> {
    const base = languageServerFeatureResultBase(adapter, workspacePath, documentPath);
    const raw = await requestCSharpLanguageServerTextDocumentFeature(
        adapter,
        workspacePath,
        documentPath,
        '',
        {
            method: 'callHierarchy/outgoingCalls',
            label: 'callHierarchy/outgoingCalls',
            timeoutMs,
            capabilities: {
                callHierarchy: {
                    dynamicRegistration: false
                }
            },
            openDocument: false,
            params: () => ({
                item: toLspCallHierarchyItem(item)
            })
        }
    );
    if (raw.source !== 'language-server') {
        return {
            ...base,
            source: 'unavailable',
            durationMs: raw.durationMs,
            calls: [],
            detail: raw.detail,
            stderr: raw.stderr
        };
    }
    const calls = toCallHierarchyOutgoingCalls(raw.result);
    return {
        ...base,
        source: 'language-server',
        durationMs: raw.durationMs,
        calls,
        detail: `${adapter.label} returned ${calls.length} outgoing call(s) from callHierarchy/outgoingCalls.`,
        stderr: raw.stderr
    };
}

export async function requestCSharpLanguageServerPrepareTypeHierarchy(
    adapter: CSharpLanguageServerAdapterStatus,
    workspacePath: string,
    documentPath: string,
    content: string,
    position: { line: number; column: number },
    timeoutMs = adapter.probeTimeoutMs ?? DEFAULT_LSP_PROBE_TIMEOUT_MS
): Promise<CSharpLanguageServerTypeHierarchyPrepareResult> {
    const base = languageServerFeatureResultBase(adapter, workspacePath, documentPath);
    const raw = await requestCSharpLanguageServerTextDocumentFeature(
        adapter,
        workspacePath,
        documentPath,
        content,
        {
            method: 'textDocument/prepareTypeHierarchy',
            label: 'textDocument/prepareTypeHierarchy',
            timeoutMs,
            capabilities: {
                typeHierarchy: {
                    dynamicRegistration: false
                }
            },
            params: documentUri => ({
                textDocument: { uri: documentUri },
                position: lspPosition(position)
            })
        }
    );
    if (raw.source !== 'language-server') {
        return {
            ...base,
            source: 'unavailable',
            durationMs: raw.durationMs,
            items: [],
            detail: raw.detail,
            stderr: raw.stderr
        };
    }
    const items = toTypeHierarchyItems(raw.result);
    return {
        ...base,
        source: 'language-server',
        durationMs: raw.durationMs,
        items,
        detail: `${adapter.label} returned ${items.length} type hierarchy item(s) from textDocument/prepareTypeHierarchy.`,
        stderr: raw.stderr
    };
}

export async function requestCSharpLanguageServerTypeHierarchySupertypes(
    adapter: CSharpLanguageServerAdapterStatus,
    workspacePath: string,
    documentPath: string,
    item: CSharpLanguageServerTypeHierarchyItem,
    timeoutMs = adapter.probeTimeoutMs ?? DEFAULT_LSP_PROBE_TIMEOUT_MS
): Promise<CSharpLanguageServerTypeHierarchyResult> {
    const base = languageServerFeatureResultBase(adapter, workspacePath, documentPath);
    const raw = await requestCSharpLanguageServerTextDocumentFeature(
        adapter,
        workspacePath,
        documentPath,
        '',
        {
            method: 'typeHierarchy/supertypes',
            label: 'typeHierarchy/supertypes',
            timeoutMs,
            capabilities: {
                typeHierarchy: {
                    dynamicRegistration: false
                }
            },
            openDocument: false,
            params: () => ({
                item: toLspTypeHierarchyItem(item)
            })
        }
    );
    if (raw.source !== 'language-server') {
        return {
            ...base,
            source: 'unavailable',
            durationMs: raw.durationMs,
            items: [],
            detail: raw.detail,
            stderr: raw.stderr
        };
    }
    const items = toTypeHierarchyItems(raw.result);
    return {
        ...base,
        source: 'language-server',
        durationMs: raw.durationMs,
        items,
        detail: `${adapter.label} returned ${items.length} supertype item(s) from typeHierarchy/supertypes.`,
        stderr: raw.stderr
    };
}

export async function requestCSharpLanguageServerTypeHierarchySubtypes(
    adapter: CSharpLanguageServerAdapterStatus,
    workspacePath: string,
    documentPath: string,
    item: CSharpLanguageServerTypeHierarchyItem,
    timeoutMs = adapter.probeTimeoutMs ?? DEFAULT_LSP_PROBE_TIMEOUT_MS
): Promise<CSharpLanguageServerTypeHierarchyResult> {
    const base = languageServerFeatureResultBase(adapter, workspacePath, documentPath);
    const raw = await requestCSharpLanguageServerTextDocumentFeature(
        adapter,
        workspacePath,
        documentPath,
        '',
        {
            method: 'typeHierarchy/subtypes',
            label: 'typeHierarchy/subtypes',
            timeoutMs,
            capabilities: {
                typeHierarchy: {
                    dynamicRegistration: false
                }
            },
            openDocument: false,
            params: () => ({
                item: toLspTypeHierarchyItem(item)
            })
        }
    );
    if (raw.source !== 'language-server') {
        return {
            ...base,
            source: 'unavailable',
            durationMs: raw.durationMs,
            items: [],
            detail: raw.detail,
            stderr: raw.stderr
        };
    }
    const items = toTypeHierarchyItems(raw.result);
    return {
        ...base,
        source: 'language-server',
        durationMs: raw.durationMs,
        items,
        detail: `${adapter.label} returned ${items.length} subtype item(s) from typeHierarchy/subtypes.`,
        stderr: raw.stderr
    };
}

export async function requestCSharpLanguageServerReferences(
    adapter: CSharpLanguageServerAdapterStatus,
    workspacePath: string,
    documentPath: string,
    content: string,
    position: { line: number; column: number },
    includeDeclaration = true,
    timeoutMs = adapter.probeTimeoutMs ?? DEFAULT_LSP_PROBE_TIMEOUT_MS
): Promise<CSharpLanguageServerReferencesResult> {
    const base = languageServerFeatureResultBase(adapter, workspacePath, documentPath);
    const raw = await requestCSharpLanguageServerTextDocumentFeature(
        adapter,
        workspacePath,
        documentPath,
        content,
        {
            method: 'textDocument/references',
            label: 'textDocument/references',
            timeoutMs,
            capabilities: {
                references: {}
            },
            params: documentUri => ({
                textDocument: { uri: documentUri },
                position: lspPosition(position),
                context: {
                    includeDeclaration
                }
            })
        }
    );
    if (raw.source !== 'language-server') {
        return {
            ...base,
            source: 'unavailable',
            durationMs: raw.durationMs,
            locations: [],
            detail: raw.detail,
            stderr: raw.stderr
        };
    }
    const locations = toDefinitionLocations(raw.result);
    return {
        ...base,
        source: 'language-server',
        durationMs: raw.durationMs,
        locations,
        detail: `${adapter.label} returned ${locations.length} reference location(s) from textDocument/references.`,
        stderr: raw.stderr
    };
}

export async function requestCSharpLanguageServerRename(
    adapter: CSharpLanguageServerAdapterStatus,
    workspacePath: string,
    documentPath: string,
    content: string,
    position: { line: number; column: number },
    newName: string,
    timeoutMs = adapter.probeTimeoutMs ?? DEFAULT_LSP_PROBE_TIMEOUT_MS
): Promise<CSharpLanguageServerWorkspaceEditResult> {
    const base = languageServerFeatureResultBase(adapter, workspacePath, documentPath);
    const raw = await requestCSharpLanguageServerTextDocumentFeature(
        adapter,
        workspacePath,
        documentPath,
        content,
        {
            method: 'textDocument/rename',
            label: 'textDocument/rename',
            timeoutMs,
            capabilities: {
                rename: {
                    prepareSupport: false
                }
            },
            params: documentUri => ({
                textDocument: { uri: documentUri },
                position: lspPosition(position),
                newName
            })
        }
    );
    if (raw.source !== 'language-server') {
        return {
            ...base,
            source: 'unavailable',
            durationMs: raw.durationMs,
            edits: [],
            detail: raw.detail,
            stderr: raw.stderr
        };
    }
    const edits = toWorkspaceTextEdits(raw.result);
    return {
        ...base,
        source: 'language-server',
        durationMs: raw.durationMs,
        edits,
        detail: `${adapter.label} returned ${edits.length} text edit(s) from textDocument/rename.`,
        stderr: raw.stderr
    };
}

export async function requestCSharpLanguageServerPrepareRename(
    adapter: CSharpLanguageServerAdapterStatus,
    workspacePath: string,
    documentPath: string,
    content: string,
    position: { line: number; column: number },
    timeoutMs = adapter.probeTimeoutMs ?? DEFAULT_LSP_PROBE_TIMEOUT_MS
): Promise<CSharpLanguageServerPrepareRenameResult> {
    const base = languageServerFeatureResultBase(adapter, workspacePath, documentPath);
    const raw = await requestCSharpLanguageServerTextDocumentFeature(
        adapter,
        workspacePath,
        documentPath,
        content,
        {
            method: 'textDocument/prepareRename',
            label: 'textDocument/prepareRename',
            timeoutMs,
            capabilities: {
                rename: {
                    prepareSupport: true
                }
            },
            params: documentUri => ({
                textDocument: { uri: documentUri },
                position: lspPosition(position)
            })
        }
    );
    if (raw.source !== 'language-server') {
        return {
            ...base,
            source: 'unavailable',
            durationMs: raw.durationMs,
            detail: raw.detail,
            stderr: raw.stderr
        };
    }
    const prepared = toPrepareRename(raw.result);
    return {
        ...base,
        source: 'language-server',
        durationMs: raw.durationMs,
        ...prepared,
        detail: prepared.range || prepared.defaultBehavior
            ? `${adapter.label} returned a rename target from textDocument/prepareRename.`
            : `${adapter.label} did not return a rename target from textDocument/prepareRename.`,
        stderr: raw.stderr
    };
}

export async function requestCSharpLanguageServerNewSymbolNames(
    adapter: CSharpLanguageServerAdapterStatus,
    workspacePath: string,
    documentPath: string,
    content: string,
    range: CSharpWorkspaceSymbolRange,
    triggerKind: CSharpLanguageServerNewSymbolNameTriggerKind,
    timeoutMs = adapter.probeTimeoutMs ?? DEFAULT_LSP_PROBE_TIMEOUT_MS
): Promise<CSharpLanguageServerNewSymbolNamesResult> {
    const base = languageServerFeatureResultBase(adapter, workspacePath, documentPath);
    const raw = await requestCSharpLanguageServerTextDocumentFeature(
        adapter,
        workspacePath,
        documentPath,
        content,
        {
            method: 'textDocument/newSymbolNames',
            label: 'textDocument/newSymbolNames',
            timeoutMs,
            capabilities: {
                newSymbolNames: {
                    dynamicRegistration: false,
                    supportsAutomaticTriggerKind: true
                }
            },
            params: documentUri => ({
                textDocument: { uri: documentUri },
                range: toLspRange(range),
                triggerKind: triggerKind === 'automatic' ? 1 : 0
            })
        }
    );
    if (raw.source !== 'language-server') {
        return {
            ...base,
            source: 'unavailable',
            durationMs: raw.durationMs,
            names: [],
            detail: raw.detail,
            stderr: raw.stderr
        };
    }
    const names = toNewSymbolNames(raw.result);
    return {
        ...base,
        source: 'language-server',
        durationMs: raw.durationMs,
        names,
        detail: `${adapter.label} returned ${names.length} rename suggestion(s) from textDocument/newSymbolNames.`,
        stderr: raw.stderr
    };
}

export async function requestCSharpLanguageServerFormatting(
    adapter: CSharpLanguageServerAdapterStatus,
    workspacePath: string,
    documentPath: string,
    content: string,
    options: CSharpLanguageServerFormattingOptions = {},
    timeoutMs = adapter.probeTimeoutMs ?? DEFAULT_LSP_PROBE_TIMEOUT_MS
): Promise<CSharpLanguageServerTextEditResult> {
    const base = languageServerFeatureResultBase(adapter, workspacePath, documentPath);
    const raw = await requestCSharpLanguageServerTextDocumentFeature(
        adapter,
        workspacePath,
        documentPath,
        content,
        {
            method: 'textDocument/formatting',
            label: 'textDocument/formatting',
            timeoutMs,
            capabilities: {
                formatting: {
                    dynamicRegistration: false
                }
            },
            params: documentUri => ({
                textDocument: { uri: documentUri },
                options: formattingOptions(options)
            })
        }
    );
    if (raw.source !== 'language-server') {
        return {
            ...base,
            source: 'unavailable',
            durationMs: raw.durationMs,
            edits: [],
            detail: raw.detail,
            stderr: raw.stderr
        };
    }
    const documentUri = pathToFileURL(path.resolve(documentPath)).toString();
    const edits = toDocumentTextEdits(raw.result, documentUri);
    return {
        ...base,
        source: 'language-server',
        durationMs: raw.durationMs,
        edits,
        detail: `${adapter.label} returned ${edits.length} text edit(s) from textDocument/formatting.`,
        stderr: raw.stderr
    };
}

export async function requestCSharpLanguageServerRangeFormatting(
    adapter: CSharpLanguageServerAdapterStatus,
    workspacePath: string,
    documentPath: string,
    content: string,
    range: CSharpWorkspaceSymbolRange,
    options: CSharpLanguageServerFormattingOptions = {},
    timeoutMs = adapter.probeTimeoutMs ?? DEFAULT_LSP_PROBE_TIMEOUT_MS
): Promise<CSharpLanguageServerTextEditResult> {
    const base = languageServerFeatureResultBase(adapter, workspacePath, documentPath);
    const raw = await requestCSharpLanguageServerTextDocumentFeature(
        adapter,
        workspacePath,
        documentPath,
        content,
        {
            method: 'textDocument/rangeFormatting',
            label: 'textDocument/rangeFormatting',
            timeoutMs,
            capabilities: {
                rangeFormatting: {
                    dynamicRegistration: false
                }
            },
            params: documentUri => ({
                textDocument: { uri: documentUri },
                range: toLspRange(range),
                options: formattingOptions(options)
            })
        }
    );
    if (raw.source !== 'language-server') {
        return {
            ...base,
            source: 'unavailable',
            durationMs: raw.durationMs,
            edits: [],
            detail: raw.detail,
            stderr: raw.stderr
        };
    }
    const documentUri = pathToFileURL(path.resolve(documentPath)).toString();
    const edits = toDocumentTextEdits(raw.result, documentUri);
    return {
        ...base,
        source: 'language-server',
        durationMs: raw.durationMs,
        edits,
        detail: `${adapter.label} returned ${edits.length} text edit(s) from textDocument/rangeFormatting.`,
        stderr: raw.stderr
    };
}

export async function requestCSharpLanguageServerRangesFormatting(
    adapter: CSharpLanguageServerAdapterStatus,
    workspacePath: string,
    documentPath: string,
    content: string,
    ranges: CSharpWorkspaceSymbolRange[],
    options: CSharpLanguageServerFormattingOptions = {},
    timeoutMs = adapter.probeTimeoutMs ?? DEFAULT_LSP_PROBE_TIMEOUT_MS
): Promise<CSharpLanguageServerTextEditResult> {
    const base = languageServerFeatureResultBase(adapter, workspacePath, documentPath);
    const raw = await requestCSharpLanguageServerTextDocumentFeature(
        adapter,
        workspacePath,
        documentPath,
        content,
        {
            method: 'textDocument/rangesFormatting',
            label: 'textDocument/rangesFormatting',
            timeoutMs,
            capabilities: {
                rangesFormatting: {
                    dynamicRegistration: false
                },
                rangeFormatting: {
                    dynamicRegistration: false
                }
            },
            params: documentUri => ({
                textDocument: { uri: documentUri },
                ranges: ranges.map(toLspRange),
                options: formattingOptions(options)
            })
        }
    );
    if (raw.source !== 'language-server') {
        return {
            ...base,
            source: 'unavailable',
            durationMs: raw.durationMs,
            edits: [],
            detail: raw.detail,
            stderr: raw.stderr
        };
    }
    const documentUri = pathToFileURL(path.resolve(documentPath)).toString();
    const edits = toDocumentTextEdits(raw.result, documentUri);
    return {
        ...base,
        source: 'language-server',
        durationMs: raw.durationMs,
        edits,
        detail: `${adapter.label} returned ${edits.length} text edit(s) from textDocument/rangesFormatting.`,
        stderr: raw.stderr
    };
}

export async function requestCSharpLanguageServerOnTypeFormatting(
    adapter: CSharpLanguageServerAdapterStatus,
    workspacePath: string,
    documentPath: string,
    content: string,
    position: { line: number; column: number },
    ch: string,
    options: CSharpLanguageServerFormattingOptions = {},
    timeoutMs = adapter.probeTimeoutMs ?? DEFAULT_LSP_PROBE_TIMEOUT_MS
): Promise<CSharpLanguageServerTextEditResult> {
    const base = languageServerFeatureResultBase(adapter, workspacePath, documentPath);
    const raw = await requestCSharpLanguageServerTextDocumentFeature(
        adapter,
        workspacePath,
        documentPath,
        content,
        {
            method: 'textDocument/onTypeFormatting',
            label: 'textDocument/onTypeFormatting',
            timeoutMs,
            capabilities: {
                onTypeFormatting: {
                    dynamicRegistration: false
                }
            },
            params: documentUri => ({
                textDocument: { uri: documentUri },
                position: lspPosition(position),
                ch,
                options: formattingOptions(options)
            })
        }
    );
    if (raw.source !== 'language-server') {
        return {
            ...base,
            source: 'unavailable',
            durationMs: raw.durationMs,
            edits: [],
            detail: raw.detail,
            stderr: raw.stderr
        };
    }
    const documentUri = pathToFileURL(path.resolve(documentPath)).toString();
    const edits = toDocumentTextEdits(raw.result, documentUri);
    return {
        ...base,
        source: 'language-server',
        durationMs: raw.durationMs,
        edits,
        detail: `${adapter.label} returned ${edits.length} text edit(s) from textDocument/onTypeFormatting.`,
        stderr: raw.stderr
    };
}

export async function requestCSharpLanguageServerInlayHints(
    adapter: CSharpLanguageServerAdapterStatus,
    workspacePath: string,
    documentPath: string,
    content: string,
    range: CSharpWorkspaceSymbolRange,
    timeoutMs = adapter.probeTimeoutMs ?? DEFAULT_LSP_PROBE_TIMEOUT_MS
): Promise<CSharpLanguageServerInlayHintResult> {
    const base = languageServerFeatureResultBase(adapter, workspacePath, documentPath);
    const raw = await requestCSharpLanguageServerTextDocumentFeature(
        adapter,
        workspacePath,
        documentPath,
        content,
        {
            method: 'textDocument/inlayHint',
            label: 'textDocument/inlayHint',
            timeoutMs,
            capabilities: {
                inlayHint: {
                    dynamicRegistration: false,
                    resolveSupport: {
                        properties: ['tooltip', 'textEdits']
                    }
                }
            },
            params: documentUri => ({
                textDocument: { uri: documentUri },
                range: toLspRange(range)
            })
        }
    );
    if (raw.source !== 'language-server') {
        return {
            ...base,
            source: 'unavailable',
            durationMs: raw.durationMs,
            hints: [],
            detail: raw.detail,
            stderr: raw.stderr
        };
    }
    const documentUri = pathToFileURL(path.resolve(documentPath)).toString();
    const hints = toInlayHints(raw.result, documentUri);
    return {
        ...base,
        source: 'language-server',
        durationMs: raw.durationMs,
        hints,
        detail: `${adapter.label} returned ${hints.length} inlay hint(s) from textDocument/inlayHint.`,
        stderr: raw.stderr
    };
}

export async function requestCSharpLanguageServerResolveInlayHint(
    adapter: CSharpLanguageServerAdapterStatus,
    workspacePath: string,
    documentPath: string,
    content: string,
    hint: CSharpLanguageServerInlayHint,
    timeoutMs = adapter.probeTimeoutMs ?? DEFAULT_LSP_PROBE_TIMEOUT_MS
): Promise<CSharpLanguageServerInlayHintResolveResult> {
    const base = languageServerFeatureResultBase(adapter, workspacePath, documentPath);
    const raw = await requestCSharpLanguageServerTextDocumentFeature(
        adapter,
        workspacePath,
        documentPath,
        content,
        {
            method: 'inlayHint/resolve',
            label: 'inlayHint/resolve',
            timeoutMs,
            capabilities: {
                inlayHint: {
                    dynamicRegistration: false,
                    resolveSupport: {
                        properties: ['tooltip', 'textEdits']
                    }
                }
            },
            params: documentUri => toLspInlayHint(hint, documentUri)
        }
    );
    if (raw.source !== 'language-server') {
        return {
            ...base,
            source: 'unavailable',
            durationMs: raw.durationMs,
            detail: raw.detail,
            stderr: raw.stderr
        };
    }
    const documentUri = pathToFileURL(path.resolve(documentPath)).toString();
    const resolved = inlayHint(raw.result, documentUri);
    return {
        ...base,
        source: 'language-server',
        durationMs: raw.durationMs,
        hint: resolved,
        detail: resolved
            ? `${adapter.label} resolved inlay hint ${resolved.label}.`
            : `${adapter.label} resolved inlay hint with an unsupported shape.`,
        stderr: raw.stderr
    };
}

export async function requestCSharpLanguageServerColorPresentations(
    adapter: CSharpLanguageServerAdapterStatus,
    workspacePath: string,
    documentPath: string,
    content: string,
    range: CSharpWorkspaceSymbolRange,
    color: CSharpLanguageServerColor,
    timeoutMs = adapter.probeTimeoutMs ?? DEFAULT_LSP_PROBE_TIMEOUT_MS
): Promise<CSharpLanguageServerColorPresentationResult> {
    const base = languageServerFeatureResultBase(adapter, workspacePath, documentPath);
    const raw = await requestCSharpLanguageServerTextDocumentFeature(
        adapter,
        workspacePath,
        documentPath,
        content,
        {
            method: 'textDocument/colorPresentation',
            label: 'textDocument/colorPresentation',
            timeoutMs,
            capabilities: {
                colorProvider: {
                    dynamicRegistration: false
                }
            },
            params: documentUri => ({
                textDocument: { uri: documentUri },
                color: lspColor(color),
                range: toLspRange(range)
            })
        }
    );
    if (raw.source !== 'language-server') {
        return {
            ...base,
            source: 'unavailable',
            durationMs: raw.durationMs,
            presentations: [],
            detail: raw.detail,
            stderr: raw.stderr
        };
    }
    const documentUri = pathToFileURL(path.resolve(documentPath)).toString();
    const presentations = toColorPresentations(raw.result, documentUri);
    return {
        ...base,
        source: 'language-server',
        durationMs: raw.durationMs,
        presentations,
        detail: `${adapter.label} returned ${presentations.length} color presentation(s) from textDocument/colorPresentation.`,
        stderr: raw.stderr
    };
}

export async function requestCSharpLanguageServerCodeActions(
    adapter: CSharpLanguageServerAdapterStatus,
    workspacePath: string,
    documentPath: string,
    content: string,
    range: CSharpWorkspaceSymbolRange,
    only?: string,
    triggerKind: CSharpLanguageServerCodeActionTriggerKind = 'invoke',
    timeoutMs = adapter.probeTimeoutMs ?? DEFAULT_LSP_PROBE_TIMEOUT_MS,
    diagnostics: CSharpLanguageServerDiagnostic[] = []
): Promise<CSharpLanguageServerCodeActionResult> {
    const base = languageServerFeatureResultBase(adapter, workspacePath, documentPath);
    const raw = await requestCSharpLanguageServerTextDocumentFeature(
        adapter,
        workspacePath,
        documentPath,
        content,
        {
            method: 'textDocument/codeAction',
            label: 'textDocument/codeAction',
            timeoutMs,
            capabilities: {
                codeAction: {
                    dynamicRegistration: false,
                    codeActionLiteralSupport: {
                        codeActionKind: {
                            valueSet: [
                                '',
                                'quickfix',
                                'refactor',
                                'refactor.extract',
                                'refactor.inline',
                                'refactor.rewrite',
                                'source',
                                'source.organizeImports'
                            ]
                        }
                    },
                    isPreferredSupport: true,
                    disabledSupport: true,
                    dataSupport: true,
                    resolveSupport: {
                        properties: ['edit', 'command']
                    }
                }
            },
            params: documentUri => ({
                textDocument: { uri: documentUri },
                range: toLspRange(range),
                context: {
                    diagnostics: diagnostics.map(toLspDiagnostic),
                    only: only ? [only] : undefined,
                    triggerKind: triggerKind === 'auto' ? 2 : 1
                }
            })
        }
    );
    if (raw.source !== 'language-server') {
        return {
            ...base,
            source: 'unavailable',
            durationMs: raw.durationMs,
            actions: [],
            detail: raw.detail,
            stderr: raw.stderr
        };
    }
    const actions = toCodeActions(raw.result);
    return {
        ...base,
        source: 'language-server',
        durationMs: raw.durationMs,
        actions,
        detail: `${adapter.label} returned ${actions.length} code action(s) from textDocument/codeAction.`,
        stderr: raw.stderr
    };
}

export async function requestCSharpLanguageServerResolveCodeAction(
    adapter: CSharpLanguageServerAdapterStatus,
    workspacePath: string,
    documentPath: string,
    content: string,
    action: CSharpLanguageServerCodeAction,
    timeoutMs = adapter.probeTimeoutMs ?? DEFAULT_LSP_PROBE_TIMEOUT_MS
): Promise<CSharpLanguageServerCodeActionResolveResult> {
    const base = languageServerFeatureResultBase(adapter, workspacePath, documentPath);
    const raw = await requestCSharpLanguageServerTextDocumentFeature(
        adapter,
        workspacePath,
        documentPath,
        content,
        {
            method: 'codeAction/resolve',
            label: 'codeAction/resolve',
            timeoutMs,
            capabilities: {
                codeAction: {
                    dynamicRegistration: false,
                    codeActionLiteralSupport: {
                        codeActionKind: {
                            valueSet: [
                                '',
                                'quickfix',
                                'refactor',
                                'refactor.extract',
                                'refactor.inline',
                                'refactor.rewrite',
                                'source',
                                'source.organizeImports'
                            ]
                        }
                    },
                    isPreferredSupport: true,
                    disabledSupport: true,
                    dataSupport: true,
                    resolveSupport: {
                        properties: ['edit', 'command']
                    }
                }
            },
            params: () => toLspCodeAction(action)
        }
    );
    if (raw.source !== 'language-server') {
        return {
            ...base,
            source: 'unavailable',
            durationMs: raw.durationMs,
            detail: raw.detail,
            stderr: raw.stderr
        };
    }
    const resolved = codeAction(raw.result);
    return {
        ...base,
        source: 'language-server',
        durationMs: raw.durationMs,
        action: resolved,
        detail: resolved
            ? `${adapter.label} resolved code action ${resolved.title}.`
            : `${adapter.label} resolved code action without a usable edit or command.`,
        stderr: raw.stderr
    };
}

export async function requestCSharpLanguageServerCompletions(
    adapter: CSharpLanguageServerAdapterStatus,
    workspacePath: string,
    documentPath: string,
    content: string,
    position: { line: number; column: number },
    timeoutMs = adapter.probeTimeoutMs ?? DEFAULT_LSP_PROBE_TIMEOUT_MS,
    context?: CSharpLanguageServerCompletionContext
): Promise<CSharpLanguageServerCompletionResult> {
    const base = languageServerFeatureResultBase(adapter, workspacePath, documentPath);
    const raw = await requestCSharpLanguageServerTextDocumentFeature(
        adapter,
        workspacePath,
        documentPath,
        content,
        {
            method: 'textDocument/completion',
            label: 'textDocument/completion',
            timeoutMs,
            capabilities: {
                completion: {
                    contextSupport: true,
                    completionItem: {
                        snippetSupport: true,
                        documentationFormat: ['markdown', 'plaintext'],
                        deprecatedSupport: true,
                        preselectSupport: true,
                        labelDetailsSupport: true,
                        commitCharactersSupport: true,
                        insertReplaceSupport: true,
                        dataSupport: true,
                        resolveSupport: {
                            properties: ['documentation', 'detail', 'additionalTextEdits', 'command']
                        }
                    },
                    completionList: {
                        itemDefaults: ['commitCharacters', 'editRange', 'insertTextFormat', 'data']
                    }
                }
            },
            params: documentUri => ({
                textDocument: { uri: documentUri },
                position: lspPosition(position),
                context: toLspCompletionContext(context)
            })
        }
    );
    if (raw.source !== 'language-server') {
        return {
            ...base,
            source: 'unavailable',
            durationMs: raw.durationMs,
            items: [],
            detail: raw.detail,
            stderr: raw.stderr
        };
    }
    const documentUri = pathToFileURL(path.resolve(documentPath)).toString();
    const completion = toCompletionItems(raw.result, documentUri);
    return {
        ...base,
        source: 'language-server',
        durationMs: raw.durationMs,
        items: completion.items,
        isIncomplete: completion.isIncomplete,
        detail: `${adapter.label} returned ${completion.items.length} completion item(s) from textDocument/completion.`,
        stderr: raw.stderr
    };
}

export async function requestCSharpLanguageServerResolveCompletionItem(
    adapter: CSharpLanguageServerAdapterStatus,
    workspacePath: string,
    documentPath: string,
    content: string,
    item: CSharpIntelliSenseItem,
    timeoutMs = adapter.probeTimeoutMs ?? DEFAULT_LSP_PROBE_TIMEOUT_MS
): Promise<CSharpLanguageServerCompletionItemResolveResult> {
    const base = languageServerFeatureResultBase(adapter, workspacePath, documentPath);
    const raw = await requestCSharpLanguageServerTextDocumentFeature(
        adapter,
        workspacePath,
        documentPath,
        content,
        {
            method: 'completionItem/resolve',
            label: 'completionItem/resolve',
            timeoutMs,
            capabilities: {
                completion: {
                    completionItem: {
                        snippetSupport: true,
                        documentationFormat: ['markdown', 'plaintext'],
                        deprecatedSupport: true,
                        preselectSupport: true,
                        labelDetailsSupport: true,
                        commitCharactersSupport: true,
                        insertReplaceSupport: true,
                        dataSupport: true,
                        resolveSupport: {
                            properties: ['documentation', 'detail', 'additionalTextEdits', 'command']
                        }
                    }
                }
            },
            params: () => toLspCompletionItem(item)
        }
    );
    if (raw.source !== 'language-server') {
        return {
            ...base,
            source: 'unavailable',
            durationMs: raw.durationMs,
            detail: raw.detail,
            stderr: raw.stderr
        };
    }
    const documentUri = pathToFileURL(path.resolve(documentPath)).toString();
    const resolved = completionItem(raw.result, documentUri);
    return {
        ...base,
        source: 'language-server',
        durationMs: raw.durationMs,
        item: resolved,
        detail: resolved
            ? `${adapter.label} resolved completion item ${resolved.label}.`
            : `${adapter.label} resolved completion item without a usable label.`,
        stderr: raw.stderr
    };
}

export async function requestCSharpLanguageServerInlineCompletions(
    adapter: CSharpLanguageServerAdapterStatus,
    workspacePath: string,
    documentPath: string,
    content: string,
    position: { line: number; column: number },
    context: CSharpLanguageServerInlineCompletionContext | undefined,
    timeoutMs = adapter.probeTimeoutMs ?? DEFAULT_LSP_PROBE_TIMEOUT_MS
): Promise<CSharpLanguageServerInlineCompletionResult> {
    const base = languageServerFeatureResultBase(adapter, workspacePath, documentPath);
    const raw = await requestCSharpLanguageServerTextDocumentFeature(
        adapter,
        workspacePath,
        documentPath,
        content,
        {
            method: 'textDocument/inlineCompletion',
            label: 'textDocument/inlineCompletion',
            timeoutMs,
            capabilities: {
                inlineCompletion: {
                    dynamicRegistration: false
                }
            },
            params: documentUri => ({
                textDocument: { uri: documentUri },
                position: lspPosition(position),
                context: toLspInlineCompletionContext(context)
            })
        }
    );
    if (raw.source !== 'language-server') {
        return {
            ...base,
            source: 'unavailable',
            durationMs: raw.durationMs,
            items: [],
            detail: raw.detail,
            stderr: raw.stderr
        };
    }
    const documentUri = pathToFileURL(path.resolve(documentPath)).toString();
    const completions = toInlineCompletions(raw.result, documentUri);
    return {
        ...base,
        source: 'language-server',
        durationMs: raw.durationMs,
        items: completions.items,
        suppressSuggestions: completions.suppressSuggestions,
        detail: `${adapter.label} returned ${completions.items.length} inline completion(s) from textDocument/inlineCompletion.`,
        stderr: raw.stderr
    };
}

export async function requestCSharpLanguageServerExecuteCommand(
    adapter: CSharpLanguageServerAdapterStatus,
    workspacePath: string,
    documentPath: string,
    content: string,
    command: string,
    args: unknown[] = [],
    timeoutMs = adapter.probeTimeoutMs ?? DEFAULT_LSP_PROBE_TIMEOUT_MS
): Promise<CSharpLanguageServerExecuteCommandResult> {
    const base = languageServerFeatureResultBase(adapter, workspacePath, documentPath);
    const raw = await requestCSharpLanguageServerTextDocumentFeature(
        adapter,
        workspacePath,
        documentPath,
        content,
        {
            method: 'workspace/executeCommand',
            label: 'workspace/executeCommand',
            timeoutMs,
            capabilities: {},
            workspaceCapabilities: {
                executeCommand: {
                    dynamicRegistration: false
                },
                applyEdit: true,
                workspaceEdit: {
                    documentChanges: true,
                    resourceOperations: []
                }
            },
            params: () => ({
                command,
                arguments: args
            })
        }
    );
    if (raw.source !== 'language-server') {
        return {
            ...base,
            source: 'unavailable',
            durationMs: raw.durationMs,
            edits: [],
            detail: raw.detail,
            stderr: raw.stderr
        };
    }
    return {
        ...base,
        source: 'language-server',
        durationMs: raw.durationMs,
        result: raw.result,
        edits: raw.appliedEdits ?? [],
        detail: `${adapter.label} executed language-server command ${command}.`,
        stderr: raw.stderr
    };
}

export async function requestCSharpLanguageServerSignatureHelp(
    adapter: CSharpLanguageServerAdapterStatus,
    workspacePath: string,
    documentPath: string,
    content: string,
    position: { line: number; column: number },
    timeoutMs = adapter.probeTimeoutMs ?? DEFAULT_LSP_PROBE_TIMEOUT_MS,
    context?: CSharpLanguageServerSignatureHelpContext
): Promise<CSharpLanguageServerSignatureHelpResult> {
    const base = languageServerFeatureResultBase(adapter, workspacePath, documentPath);
    const raw = await requestCSharpLanguageServerTextDocumentFeature(
        adapter,
        workspacePath,
        documentPath,
        content,
        {
            method: 'textDocument/signatureHelp',
            label: 'textDocument/signatureHelp',
            timeoutMs,
            capabilities: {
                signatureHelp: {
                    signatureInformation: {
                        documentationFormat: ['markdown', 'plaintext'],
                        parameterInformation: {
                            labelOffsetSupport: true
                        },
                        activeParameterSupport: true
                    }
                }
            },
            params: documentUri => {
                const params: {
                    textDocument: { uri: string };
                    position: { line: number; character: number };
                    context?: ReturnType<typeof toLspSignatureHelpContext>;
                } = {
                    textDocument: { uri: documentUri },
                    position: lspPosition(position)
                };
                params.context = toLspSignatureHelpContext(context);
                return params;
            }
        }
    );
    if (raw.source !== 'language-server') {
        return {
            ...base,
            source: 'unavailable',
            durationMs: raw.durationMs,
            signatures: [],
            activeSignature: 0,
            activeParameter: 0,
            detail: raw.detail,
            stderr: raw.stderr
        };
    }
    const help = toSignatureHelp(raw.result);
    return {
        ...base,
        source: 'language-server',
        durationMs: raw.durationMs,
        signatures: help.signatures,
        activeSignature: help.activeSignature,
        activeParameter: help.activeParameter,
        detail: `${adapter.label} returned ${help.signatures.length} signature(s) from textDocument/signatureHelp.`,
        stderr: raw.stderr
    };
}

function toLspSignatureHelpContext(context?: CSharpLanguageServerSignatureHelpContext): { triggerKind: number; triggerCharacter?: string; isRetrigger: boolean } | undefined {
    if (!context) {
        return undefined;
    }
    const triggerKind = toLspSignatureHelpTriggerKind(context.triggerKind);
    return {
        triggerKind,
        triggerCharacter: triggerKind === 2 ? context.triggerCharacter : undefined,
        isRetrigger: !!context.isRetrigger
    };
}

function toLspSignatureHelpTriggerKind(triggerKind: CSharpLanguageServerSignatureHelpTriggerKind): number {
    switch (triggerKind) {
        case 'trigger-character':
            return 2;
        case 'content-change':
            return 3;
        case 'invoked':
        default:
            return 1;
    }
}

export async function requestCSharpLanguageServerDiagnostics(
    adapter: CSharpLanguageServerAdapterStatus,
    workspacePath: string,
    documentPath: string,
    content: string,
    timeoutMs = adapter.probeTimeoutMs ?? DEFAULT_LSP_PROBE_TIMEOUT_MS
): Promise<CSharpLanguageServerDiagnosticsResult> {
    const base = languageServerFeatureResultBase(adapter, workspacePath, documentPath);
    const raw = await requestCSharpLanguageServerTextDocumentFeature(
        adapter,
        workspacePath,
        documentPath,
        content,
        {
            label: 'textDocument/publishDiagnostics',
            timeoutMs,
            capabilities: {
                diagnostic: {
                    dynamicRegistration: false,
                    relatedDocumentSupport: false
                },
                publishDiagnostics: {
                    relatedInformation: true,
                    versionSupport: false,
                    codeDescriptionSupport: true,
                    dataSupport: true
                }
            },
            method: initializeResult => supportsPullDiagnostics(initializeResult) ? 'textDocument/diagnostic' : undefined,
            params: documentUri => ({
                textDocument: { uri: documentUri }
            }),
            finishOnDiagnostics: true
        }
    );
    if (raw.source !== 'language-server') {
        return {
            ...base,
            source: 'unavailable',
            durationMs: raw.durationMs,
            diagnostics: [],
            detail: raw.detail,
            stderr: raw.stderr
        };
    }
    const pullDiagnostics = diagnosticsFromPullReport(raw.result, documentPath);
    const diagnostics = pullDiagnostics ?? raw.diagnostics ?? [];
    return {
        ...base,
        source: 'language-server',
        durationMs: raw.durationMs,
        diagnostics,
        detail: pullDiagnostics
            ? `${adapter.label} returned ${diagnostics.length} diagnostic(s) from textDocument/diagnostic.`
            : `${adapter.label} published ${diagnostics.length} diagnostic(s) from textDocument/publishDiagnostics.`,
        stderr: raw.stderr
    };
}

export async function requestCSharpLanguageServerWorkspaceDiagnostics(
    adapter: CSharpLanguageServerAdapterStatus,
    workspacePath: string,
    timeoutMs = adapter.probeTimeoutMs ?? DEFAULT_LSP_PROBE_TIMEOUT_MS
): Promise<CSharpLanguageServerWorkspaceDiagnosticsResult> {
    const raw = await requestCSharpLanguageServerTextDocumentFeature(
        adapter,
        workspacePath,
        workspacePath,
        '',
        {
            label: 'workspace/diagnostic',
            timeoutMs,
            capabilities: {
                diagnostic: {
                    dynamicRegistration: false,
                    relatedDocumentSupport: true
                },
                publishDiagnostics: {
                    relatedInformation: true,
                    versionSupport: false,
                    codeDescriptionSupport: true,
                    dataSupport: true
                }
            },
            method: initializeResult => supportsWorkspaceDiagnostics(initializeResult) ? 'workspace/diagnostic' : undefined,
            openDocument: false,
            params: () => ({
                previousResultIds: []
            })
        }
    );
    if (raw.source !== 'language-server') {
        return {
            workspacePath,
            source: 'unavailable',
            adapterId: adapter.id,
            adapterLabel: adapter.label,
            durationMs: raw.durationMs,
            diagnostics: [],
            detail: raw.detail,
            stderr: raw.stderr
        };
    }
    const diagnostics = diagnosticsFromWorkspaceReport(raw.result, workspacePath);
    return {
        workspacePath,
        source: 'language-server',
        adapterId: adapter.id,
        adapterLabel: adapter.label,
        durationMs: raw.durationMs,
        diagnostics,
        detail: `${adapter.label} returned ${diagnostics.length} workspace diagnostic(s) from workspace/diagnostic.`,
        stderr: raw.stderr
    };
}

interface CSharpLanguageServerFeatureRawResult {
    source: 'language-server' | 'unavailable';
    durationMs: number;
    detail: string;
    result?: unknown;
    initializeResult?: unknown;
    diagnostics?: CSharpDiagnostic[];
    appliedEdits?: CSharpLanguageServerTextEdit[];
    stderr?: string;
}

interface CSharpCompletionItemDefaults {
    commitCharacters?: string[];
    editRange?: CSharpWorkspaceSymbolRange;
    insertTextFormat?: number;
    data?: unknown;
}

function requestCSharpLanguageServerTextDocumentFeature(
    adapter: CSharpLanguageServerAdapterStatus,
    workspacePath: string,
    documentPath: string,
    content: string,
    options: {
        label: string;
        timeoutMs: number;
        capabilities: Record<string, unknown>;
        workspaceCapabilities?: Record<string, unknown>;
        method?: string | ((initializeResult: unknown) => string | undefined);
        params?: (documentUri: string) => unknown;
        openDocument?: boolean;
        finishOnDiagnostics?: boolean;
    }
): Promise<CSharpLanguageServerFeatureRawResult> {
    const startedAt = Date.now();
    if (adapter.mode !== 'ready' || !adapter.command) {
        return Promise.resolve({
            source: 'unavailable',
            durationMs: 0,
            detail: adapter.detail
        });
    }

    return new Promise(resolve => {
        const stderr: string[] = [];
        const documentUri = pathToFileURL(path.resolve(documentPath)).toString();
        const child = spawn(adapter.command!, adapter.args, {
            cwd: workspacePath,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: process.env
        });
        let stdoutBuffer: Buffer<ArrayBufferLike> = Buffer.alloc(0);
        let settled = false;
        let featureRequested = false;
        let documentOpened = false;
        let initializeResult: unknown;
        let timer: NodeJS.Timeout | undefined;
        let diagnosticsTimer: NodeJS.Timeout | undefined;
        const diagnosticsByPath = new Map<string, CSharpDiagnostic[]>();
        const appliedEdits: CSharpLanguageServerTextEdit[] = [];

        const finish = (partial: Pick<CSharpLanguageServerFeatureRawResult, 'source' | 'detail'> & Partial<CSharpLanguageServerFeatureRawResult>): void => {
            if (settled) {
                return;
            }
            settled = true;
            if (timer) {
                clearTimeout(timer);
            }
            if (diagnosticsTimer) {
                clearTimeout(diagnosticsTimer);
            }
            const result: CSharpLanguageServerFeatureRawResult = {
                source: partial.source,
                durationMs: Date.now() - startedAt,
                result: partial.result,
                initializeResult: partial.initializeResult ?? initializeResult,
                diagnostics: partial.diagnostics ?? Array.from(diagnosticsByPath.values()).flat(),
                appliedEdits: partial.appliedEdits ?? appliedEdits,
                detail: partial.detail,
                stderr: undefined
            };
            let resolved = false;
            const resolveOnce = (): void => {
                if (resolved) {
                    return;
                }
                resolved = true;
                result.stderr = stderr.join('').trim() || undefined;
                resolve(result);
            };
            child.once('close', resolveOnce);
            try {
                if (child.stdin.writable) {
                    if (documentOpened) {
                        sendJsonRpc(child.stdin, {
                            jsonrpc: '2.0',
                            method: 'textDocument/didClose',
                            params: {
                                textDocument: {
                                    uri: documentUri
                                }
                            }
                        });
                    }
                    sendJsonRpc(child.stdin, { jsonrpc: '2.0', id: 3, method: 'shutdown', params: null });
                    sendJsonRpc(child.stdin, { jsonrpc: '2.0', method: 'exit' });
                }
            } catch {
                // Ignore shutdown framing errors when the server already exited.
            }
            const killTimer = setTimeout(() => {
                if (!child.killed) {
                    child.kill();
                }
            }, 50).unref();
            setTimeout(() => {
                clearTimeout(killTimer);
                resolveOnce();
            }, 1000).unref();
        };

        timer = setTimeout(() => finish({
            source: 'unavailable',
            detail: `${adapter.label} did not answer ${options.label} within ${options.timeoutMs}ms.`
        }), options.timeoutMs);

        child.on('error', error => finish({
            source: 'unavailable',
            detail: `${adapter.label} could not be started: ${error.message}`
        }));
        child.on('exit', code => {
            if (!settled) {
                finish({
                    source: 'unavailable',
                    detail: `${adapter.label} exited before ${options.label} completed${code === null ? '' : ` (exit ${code})`}.`
                });
            }
        });
        child.stderr.on('data', chunk => stderr.push(Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk)));
        child.stdout.on('data', chunk => {
            const data = Buffer.isBuffer(chunk) ? Buffer.from(chunk) : Buffer.from(String(chunk));
            stdoutBuffer = Buffer.concat([stdoutBuffer, data]);
            const messages = readJsonRpcMessages(stdoutBuffer);
            stdoutBuffer = messages.remaining;
            for (const message of messages.messages) {
                if (message.id === 1) {
                    if (message.error) {
                        finish({
                            source: 'unavailable',
                            detail: `${adapter.label} rejected LSP initialize: ${message.error.message ?? message.error.code ?? 'unknown error'}.`
                        });
                        return;
                    }
                    initializeResult = message.result;
                    if (!featureRequested) {
                        featureRequested = true;
                        sendJsonRpc(child.stdin, { jsonrpc: '2.0', method: 'initialized', params: {} });
                        if (options.openDocument !== false) {
                            documentOpened = true;
                            sendJsonRpc(child.stdin, {
                                jsonrpc: '2.0',
                                method: 'textDocument/didOpen',
                                params: {
                                    textDocument: {
                                        uri: documentUri,
                                        languageId: adapter.language === 'razor' ? 'razor' : 'csharp',
                                        version: 1,
                                        text: content
                                    }
                                }
                            });
                        }
                        const method = typeof options.method === 'function' ? options.method(initializeResult) : options.method;
                        if (method && options.params) {
                            sendJsonRpc(child.stdin, {
                                jsonrpc: '2.0',
                                id: 2,
                                method,
                                params: options.params(documentUri)
                            });
                        }
                    }
                    continue;
                }
                const publishedDiagnostics = publishedDiagnosticsFromMessage(message, documentPath);
                if (publishedDiagnostics) {
                    diagnosticsByPath.set(publishedDiagnostics.path, publishedDiagnostics.diagnostics);
                    if (options.finishOnDiagnostics && path.resolve(publishedDiagnostics.path) === path.resolve(documentPath)) {
                        if (diagnosticsTimer) {
                            clearTimeout(diagnosticsTimer);
                        }
                        diagnosticsTimer = setTimeout(() => finish({
                            source: 'language-server',
                            diagnostics: publishedDiagnostics.diagnostics,
                            detail: `${adapter.label} published diagnostics for ${path.basename(documentPath)}.`
                        }), 50);
                    }
                    continue;
                }
                const applyEditRequest = applyEditRequestFromMessage(message);
                if (applyEditRequest) {
                    appliedEdits.push(...applyEditRequest.edits);
                    sendJsonRpc(child.stdin, {
                        jsonrpc: '2.0',
                        id: message.id,
                        result: {
                            applied: true
                        }
                    });
                    continue;
                }
                const serverRequestResponse = serverRequestResponseFromMessage(message, workspacePath);
                if (serverRequestResponse) {
                    sendJsonRpc(child.stdin, serverRequestResponse);
                    continue;
                }
                if (message.id === 2 && !message.method) {
                    if (message.error) {
                        finish({
                            source: 'unavailable',
                            detail: `${adapter.label} rejected ${options.label}: ${message.error.message ?? message.error.code ?? 'unknown error'}.`
                        });
                        return;
                    }
                    finish({
                        source: 'language-server',
                        result: message.result,
                        detail: `${adapter.label} completed ${options.label}.`
                    });
                    return;
                }
            }
        });

        const capabilities: Record<string, unknown> = {
            textDocument: options.capabilities
        };
        if (options.workspaceCapabilities) {
            capabilities.workspace = options.workspaceCapabilities;
        }

        sendJsonRpc(child.stdin, {
            jsonrpc: '2.0',
            id: 1,
            method: 'initialize',
            params: {
                processId: process.pid,
                rootUri: pathToFileURL(path.resolve(workspacePath)).toString(),
                workspaceFolders: [
                    {
                        uri: pathToFileURL(path.resolve(workspacePath)).toString(),
                        name: path.basename(workspacePath)
                    }
                ],
                capabilities,
                clientInfo: {
                    name: 'CyberVinci C# Kit',
                    version: '1.71.0'
                },
                trace: 'off'
            }
        });
    });
}

function resolveLanguageServerAdapter(input: {
    language: CSharpLanguageServerAdapterStatus['language'];
    label: string;
    envVar: string;
    argsEnvVar: string;
    probeTimeoutEnvVar: string;
    setupHint: string;
    configuredId: string;
    candidates: LanguageServerCandidate[];
}, env: NodeJS.ProcessEnv, workspacePath: string | undefined, workspaceConfig: CSharpLanguageServerCommandConfig | undefined, configSource: string): CSharpLanguageServerAdapterStatus {
    const configured = env[input.envVar]?.trim();
    const probeTimeoutMs = resolveProbeTimeoutMs(env[input.probeTimeoutEnvVar], workspaceConfig?.probeTimeoutMs);
    if (configured) {
        const command = findCommand(configured, env, workspacePath);
        const args = splitCommandLine(env[input.argsEnvVar] ?? '');
        if (command) {
            return {
                id: input.configuredId,
                label: input.label,
                language: input.language,
                mode: 'ready',
                command,
                args,
                probeTimeoutMs,
                envVar: input.envVar,
                source: input.envVar,
                setupHint: input.setupHint,
                detail: `${configured} is available for ${input.label}.`
            };
        }
        return {
            id: input.configuredId,
            label: input.label,
            language: input.language,
            mode: 'configured-missing',
            args,
            probeTimeoutMs,
            envVar: input.envVar,
            source: input.envVar,
            setupHint: input.setupHint,
            detail: `${configured} was configured for ${input.label}, but it was not found.`
        };
    }

    if (workspaceConfig) {
        const configuredCommand = workspaceConfig.command?.trim();
        if (configuredCommand) {
            const command = findCommand(configuredCommand, env, workspacePath);
            const args = normalizeConfiguredArgs(workspaceConfig.args);
            const id = workspaceConfig.id?.trim() || input.configuredId;
            const label = workspaceConfig.label?.trim() || input.label;
            if (command) {
                return {
                    id,
                    label,
                    language: input.language,
                    mode: 'ready',
                    command,
                    args,
                    probeTimeoutMs,
                    envVar: input.envVar,
                    source: configSource,
                    setupHint: input.setupHint,
                    detail: `${configuredCommand} is available for ${label} from ${configSource}.`
                };
            }
            return {
                id,
                label,
                language: input.language,
                mode: 'configured-missing',
                args,
                probeTimeoutMs,
                envVar: input.envVar,
                source: configSource,
                setupHint: input.setupHint,
                detail: `${configuredCommand} was configured for ${label} in ${configSource}, but it was not found.`
            };
        }
    }

    for (const candidate of input.candidates) {
        const command = findCommand(candidate.command, env, workspacePath);
        if (command) {
            return {
                id: candidate.id,
                label: candidate.label,
                language: input.language,
                mode: 'ready',
                command,
                args: candidate.args,
                probeTimeoutMs,
                envVar: input.envVar,
                source: candidate.source,
                setupHint: input.setupHint,
                detail: `${candidate.label} was found on PATH for ${input.label}.`
            };
        }
    }

    const dotnetToolCandidate = resolveWorkspaceDotnetToolLanguageServer(input.language, env, workspacePath);
    if (dotnetToolCandidate) {
        return {
            id: dotnetToolCandidate.id,
            label: dotnetToolCandidate.label,
            language: input.language,
            mode: 'ready',
            command: dotnetToolCandidate.command,
            args: dotnetToolCandidate.args,
            probeTimeoutMs,
            envVar: input.envVar,
            source: dotnetToolCandidate.source,
            setupHint: input.setupHint,
            detail: `${dotnetToolCandidate.label} was found in ${dotnetToolCandidate.source} and will run through dotnet tool run.`
        };
    }

    const vscodeCSharpCandidate = resolveVsCodeCSharpExtensionLanguageServer(input.language, env);
    if (vscodeCSharpCandidate) {
        return {
            id: vscodeCSharpCandidate.id,
            label: vscodeCSharpCandidate.label,
            language: input.language,
            mode: 'ready',
            command: vscodeCSharpCandidate.command,
            args: vscodeCSharpCandidate.args,
            probeTimeoutMs,
            envVar: input.envVar,
            source: vscodeCSharpCandidate.source,
            setupHint: input.setupHint,
            detail: `${vscodeCSharpCandidate.label} was found in an installed VS Code C# extension runtime and will run as a decoupled external LSP adapter.`
        };
    }

    return {
        id: input.configuredId,
        label: input.label,
        language: input.language,
        mode: 'missing',
        args: [],
        probeTimeoutMs,
        envVar: input.envVar,
        source: 'PATH',
        setupHint: input.setupHint,
        detail: `No ${input.label} adapter was found. CyberVinci will use structural Monaco/Roslyn features until an external language server is configured.`
    };
}

function resolveVsCodeCSharpExtensionLanguageServer(
    language: CSharpLanguageServerAdapterStatus['language'],
    env: NodeJS.ProcessEnv
): LanguageServerCandidate | undefined {
    for (const extensionDirectory of vsCodeCSharpExtensionDirectories(env)) {
        const roslynDirectory = path.join(extensionDirectory, '.roslyn');
        const roslynServer = existingExecutable(path.join(roslynDirectory, process.platform === 'win32' ? 'Microsoft.CodeAnalysis.LanguageServer.exe' : 'Microsoft.CodeAnalysis.LanguageServer'));
        const command = roslynServer ?? existingExecutable(path.join(roslynDirectory, 'Microsoft.CodeAnalysis.LanguageServer.exe'));
        if (!command) {
            continue;
        }
        const args = vsCodeRoslynLanguageServerArgs(extensionDirectory);
        if (language === 'csharp') {
            return {
                id: 'vscode-csharp-roslyn-lsp',
                label: 'Roslyn C# Language Server (VS Code C# extension runtime)',
                command,
                args,
                source: VSCODE_CSHARP_EXTENSION_SOURCE
            };
        }
        if (hasVsCodeRazorExtensionRuntime(extensionDirectory)) {
            return {
                id: 'vscode-csharp-razor-roslyn-lsp',
                label: 'Razor Language Server (VS Code C# extension runtime)',
                command,
                args,
                source: VSCODE_CSHARP_EXTENSION_SOURCE
            };
        }
    }
    return undefined;
}

function vsCodeRoslynLanguageServerArgs(extensionDirectory: string): string[] {
    const args = ['--stdio', '--telemetryLevel', 'off', '--logLevel', 'Warning', '--autoLoadProjects'];
    const razorDirectory = path.join(extensionDirectory, '.razorExtension');
    const razorExtension = path.join(razorDirectory, 'Microsoft.VisualStudioCode.RazorExtension.dll');
    const razorSourceGenerator = path.join(razorDirectory, 'Microsoft.CodeAnalysis.Razor.Compiler.dll');
    const razorDesignTimePath = path.join(razorDirectory, 'Targets', 'Microsoft.NET.Sdk.Razor.DesignTime.targets');
    const csharpDesignTimePath = path.join(razorDirectory, 'Targets', 'Microsoft.CSharpExtension.DesignTime.targets');
    if (
        fs.existsSync(razorExtension)
        && fs.existsSync(razorSourceGenerator)
        && fs.existsSync(razorDesignTimePath)
        && fs.existsSync(csharpDesignTimePath)
    ) {
        args.push(
            '--razorSourceGenerator', razorSourceGenerator,
            '--razorDesignTimePath', razorDesignTimePath,
            '--csharpDesignTimePath', csharpDesignTimePath,
            '--extension', razorExtension
        );
    }
    return args;
}

function hasVsCodeRazorExtensionRuntime(extensionDirectory: string): boolean {
    const args = vsCodeRoslynLanguageServerArgs(extensionDirectory);
    return args.includes('--extension');
}

function vsCodeCSharpExtensionDirectories(env: NodeJS.ProcessEnv): string[] {
    const result: string[] = [];
    for (const extensionsRoot of vsCodeExtensionRoots(env)) {
        let entries: string[];
        try {
            entries = fs.readdirSync(extensionsRoot);
        } catch {
            continue;
        }
        result.push(...entries
            .filter(entry => /^ms-dotnettools\.csharp-/i.test(entry))
            .map(entry => path.join(extensionsRoot, entry))
            .filter(entry => {
                try {
                    return fs.statSync(entry).isDirectory();
                } catch {
                    return false;
                }
            })
        );
    }
    return result.sort((left, right) => right.localeCompare(left));
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

function resolveWorkspaceDotnetToolLanguageServer(
    language: CSharpLanguageServerAdapterStatus['language'],
    env: NodeJS.ProcessEnv,
    workspacePath: string | undefined
): LanguageServerCandidate | undefined {
    if (!workspacePath) {
        return undefined;
    }
    const dotnet = findCommand('dotnet', env, workspacePath);
    if (!dotnet) {
        return undefined;
    }
    const localTool = language === 'csharp'
        ? workspaceDotnetToolLanguageServer(workspacePath, [
            { command: 'csharp-ls', id: 'csharp-ls-dotnet-tool', label: 'csharp-ls (.NET local tool)' }
        ])
        : workspaceDotnetToolLanguageServer(workspacePath, [
            { command: 'rzls', id: 'rzls-dotnet-tool', label: 'Razor Language Server (.NET local tool)' },
            { command: 'razor-ls', id: 'razor-ls-dotnet-tool', label: 'Razor language server (.NET local tool)' }
        ]);
    if (!localTool) {
        return undefined;
    }
    return {
        id: localTool.id,
        label: localTool.label,
        command: dotnet,
        args: ['tool', 'run', localTool.command],
        source: 'dotnet-tools.json'
    };
}

function workspaceDotnetToolLanguageServer(
    workspacePath: string,
    candidates: Array<{ command: string; id: string; label: string }>
): { command: string; id: string; label: string } | undefined {
    return candidates.find(candidate => workspaceDotnetToolManifestHasCommand(workspacePath, candidate.command));
}

function workspaceDotnetToolManifestHasCommand(workspacePath: string, command: string): boolean {
    for (const relativePath of DOTNET_TOOL_MANIFEST_RELATIVE_PATHS) {
        const manifestPath = path.join(workspacePath, ...relativePath.split('/'));
        try {
            const parsed = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as unknown;
            const tools = isRecord(parsed) && isRecord(parsed.tools) ? parsed.tools : {};
            if (Object.entries(tools).some(([packageId, tool]) => {
                if (!isRecord(tool)) {
                    return false;
                }
                const commands = stringArray(tool.commands) ?? [];
                return packageId.toLowerCase() === command.toLowerCase()
                    || commands.some(entry => entry.toLowerCase() === command.toLowerCase());
            })) {
                return true;
            }
        } catch {
            // Ignore missing or invalid local tool manifests during adapter discovery.
        }
    }
    return false;
}

function resolveProbeTimeoutMs(envValue: string | undefined, workspaceValue: CSharpLanguageServerCommandConfig['probeTimeoutMs']): number {
    return normalizeProbeTimeoutMs(envValue)
        ?? normalizeProbeTimeoutMs(workspaceValue)
        ?? DEFAULT_LSP_PROBE_TIMEOUT_MS;
}

function normalizeProbeTimeoutMs(value: CSharpLanguageServerCommandConfig['probeTimeoutMs'] | null): number | undefined {
    if (value === undefined || value === null) {
        return undefined;
    }
    const numeric = typeof value === 'number' ? value : Number(value.trim());
    if (!Number.isFinite(numeric)) {
        return undefined;
    }
    const normalized = Math.trunc(numeric);
    return normalized >= MIN_LSP_PROBE_TIMEOUT_MS ? normalized : undefined;
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

function splitCommandLine(value: string): string[] {
    const result: string[] = [];
    const regex = /"([^"]*)"|'([^']*)'|(\S+)/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(value))) {
        result.push(match[1] ?? match[2] ?? match[3]);
    }
    return result;
}

function normalizeConfiguredArgs(value: CSharpLanguageServerCommandConfig['args']): string[] {
    if (Array.isArray(value)) {
        return value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0);
    }
    return typeof value === 'string' ? splitCommandLine(value) : [];
}

function sendJsonRpc(stream: NodeJS.WritableStream, message: JsonRpcMessage): void {
    const body = JSON.stringify(message);
    stream.write(`Content-Length: ${Buffer.byteLength(body, 'utf8')}\r\n\r\n${body}`);
}

function readJsonRpcMessages(buffer: Buffer<ArrayBufferLike>): { messages: JsonRpcMessage[]; remaining: Buffer<ArrayBufferLike> } {
    const messages: JsonRpcMessage[] = [];
    let remaining = buffer;
    while (remaining.length) {
        const headerEnd = remaining.indexOf('\r\n\r\n');
        if (headerEnd < 0) {
            break;
        }
        const header = remaining.subarray(0, headerEnd).toString('utf8');
        const lengthMatch = /Content-Length:\s*(\d+)/i.exec(header);
        if (!lengthMatch) {
            return { messages, remaining: Buffer.alloc(0) };
        }
        const contentLength = Number(lengthMatch[1]);
        const bodyStart = headerEnd + 4;
        const messageEnd = bodyStart + contentLength;
        if (remaining.length < messageEnd) {
            break;
        }
        try {
            messages.push(JSON.parse(remaining.subarray(bodyStart, messageEnd).toString('utf8')) as JsonRpcMessage);
        } catch {
            // Ignore malformed server output and continue parsing subsequent frames.
        }
        remaining = remaining.subarray(messageEnd);
    }
    return { messages, remaining };
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value : undefined;
}

function stringArray(value: unknown): string[] | undefined {
    return Array.isArray(value) && value.every(item => typeof item === 'string')
        ? value
        : undefined;
}

function numberArray(value: unknown): number[] | undefined {
    return Array.isArray(value) && value.every(item => typeof item === 'number' && Number.isFinite(item))
        ? value.map(item => Math.trunc(item))
        : undefined;
}

function languageServerFeatureResultBase(adapter: CSharpLanguageServerAdapterStatus, workspacePath: string, documentPath: string): {
    workspacePath: string;
    documentPath: string;
    adapterId: string;
    adapterLabel: string;
} {
    return {
        workspacePath,
        documentPath,
        adapterId: adapter.id,
        adapterLabel: adapter.label
    };
}

function lspPosition(position: { line: number; column: number }): { line: number; character: number } {
    return {
        line: Math.max(0, Math.trunc(position.line) - 1),
        character: Math.max(0, Math.trunc(position.column) - 1)
    };
}

function toLspRange(range: CSharpWorkspaceSymbolRange): {
    start: { line: number; character: number };
    end: { line: number; character: number };
} {
    return {
        start: lspPosition({ line: range.line, column: range.column }),
        end: lspPosition({ line: range.endLine, column: range.endColumn })
    };
}

function toLspInlineValueContext(context: CSharpLanguageServerInlineValueContext): {
    frameId: number;
    stoppedLocation: ReturnType<typeof toLspRange>;
} {
    return {
        frameId: Math.max(0, Math.trunc(context.frameId)),
        stoppedLocation: toLspRange(context.stoppedLocation)
    };
}

function toLspInlineCompletionContext(context: CSharpLanguageServerInlineCompletionContext | undefined): {
    triggerKind: number;
    selectedSuggestionInfo?: {
        range: ReturnType<typeof toLspRange>;
        text: string;
        completionKind?: number;
        isSnippetText?: boolean;
    };
    includeInlineCompletions: boolean;
    includeInlineEdits: boolean;
} {
    const selectedSuggestionInfo = context?.selectedSuggestion
        ? {
            range: toLspRange(context.selectedSuggestion.range),
            text: context.selectedSuggestion.text,
            completionKind: context.selectedSuggestion.completionKind,
            isSnippetText: context.selectedSuggestion.isSnippetText === true
        }
        : undefined;
    return {
        triggerKind: context?.triggerKind === 'explicit' ? 1 : 0,
        ...(selectedSuggestionInfo ? { selectedSuggestionInfo } : {}),
        includeInlineCompletions: context?.includeInlineCompletions !== false,
        includeInlineEdits: context?.includeInlineEdits === true
    };
}

function toLspCompletionContext(context: CSharpLanguageServerCompletionContext | undefined): {
    triggerKind: number;
    triggerCharacter?: string;
} | undefined {
    if (!context) {
        return undefined;
    }
    const triggerKind = toLspCompletionTriggerKind(context.triggerKind);
    return {
        triggerKind,
        triggerCharacter: triggerKind === 2 ? context.triggerCharacter : undefined
    };
}

function toLspCompletionTriggerKind(triggerKind: CSharpLanguageServerCompletionContext['triggerKind']): number {
    switch (triggerKind) {
        case 'trigger-character':
            return 2;
        case 'trigger-for-incomplete-completions':
            return 3;
        case 'invoked':
        default:
            return 1;
    }
}

function toLspDocumentLink(link: CSharpLanguageServerDocumentLink): {
    range: ReturnType<typeof toLspRange>;
    target?: string;
    tooltip?: string;
    data?: unknown;
} {
    return {
        range: toLspRange(link.range),
        target: link.target,
        tooltip: link.tooltip,
        data: link.data
    };
}

function toLspWorkspaceSymbol(symbol: CSharpLanguageServerWorkspaceSymbol): {
    name: string;
    kind: number;
    location: {
        uri: string;
        range: ReturnType<typeof toLspRange>;
    };
    containerName?: string;
    tags?: number[];
    data?: unknown;
} {
    return {
        name: symbol.name,
        kind: symbol.kind,
        location: {
            uri: symbol.uri,
            range: toLspRange(symbol.range)
        },
        containerName: symbol.containerName,
        tags: symbol.tags,
        data: symbol.data
    };
}

function toLspCallHierarchyItem(item: CSharpLanguageServerCallHierarchyItem): {
    name: string;
    kind: number;
    uri: string;
    range: ReturnType<typeof toLspRange>;
    selectionRange: ReturnType<typeof toLspRange>;
    detail?: string;
    tags?: number[];
    data?: unknown;
} {
    return {
        name: item.name,
        kind: item.kind,
        uri: item.uri,
        range: toLspRange(item.range),
        selectionRange: toLspRange(item.selectionRange),
        detail: item.detail,
        tags: item.tags,
        data: item.data
    };
}

function toLspTypeHierarchyItem(item: CSharpLanguageServerTypeHierarchyItem): {
    name: string;
    kind: number;
    uri: string;
    range: ReturnType<typeof toLspRange>;
    selectionRange: ReturnType<typeof toLspRange>;
    detail?: string;
    tags?: number[];
    data?: unknown;
} {
    return {
        name: item.name,
        kind: item.kind,
        uri: item.uri,
        range: toLspRange(item.range),
        selectionRange: toLspRange(item.selectionRange),
        detail: item.detail,
        tags: item.tags,
        data: item.data
    };
}

function toLspCodeLens(lens: CSharpLanguageServerCodeLens): {
    range: ReturnType<typeof toLspRange>;
    command?: {
        title: string;
        command: string;
        arguments?: unknown[];
    };
    data?: unknown;
} {
    return {
        range: toLspRange(lens.range),
        command: lens.command ? {
            title: lens.command.title,
            command: lens.command.command,
            arguments: lens.command.arguments
        } : undefined,
        data: lens.data
    };
}

function toLspCodeAction(action: CSharpLanguageServerCodeAction): {
    title: string;
    kind?: string;
    isPreferred?: boolean;
    disabled?: { reason: string };
    edit?: { changes: Record<string, Array<{ range: ReturnType<typeof toLspRange>; newText: string }>> };
    command?: {
        title: string;
        command: string;
        arguments?: unknown[];
    };
    data?: unknown;
} {
    return {
        title: action.title,
        kind: action.kind,
        isPreferred: action.isPreferred,
        disabled: action.disabled ? { reason: action.disabled } : undefined,
        edit: toLspWorkspaceEdit(action.edits),
        command: action.command,
        data: action.data
    };
}

function toLspWorkspaceEdit(edits: CSharpLanguageServerTextEdit[]): { changes: Record<string, Array<{ range: ReturnType<typeof toLspRange>; newText: string }>> } | undefined {
    if (!edits.length) {
        return undefined;
    }
    const changes: Record<string, Array<{ range: ReturnType<typeof toLspRange>; newText: string }>> = {};
    for (const edit of edits) {
        const target = changes[edit.uri] ?? [];
        target.push({
            range: toLspRange(edit.range),
            newText: edit.newText
        });
        changes[edit.uri] = target;
    }
    return { changes };
}

function toLspCompletionItem(item: CSharpIntelliSenseItem): {
    label: string;
    kind?: number;
    detail?: string;
    documentation?: string;
    sortText?: string;
    filterText?: string;
    preselect?: boolean;
    insertText?: string;
    textEdit?: { range: ReturnType<typeof toLspRange>; newText: string };
    insertTextFormat?: number;
    commitCharacters?: string[];
    additionalTextEdits?: Array<{ range: ReturnType<typeof toLspRange>; newText: string }>;
    command?: {
        title: string;
        command: string;
        arguments?: unknown[];
    };
    data?: unknown;
} {
    return {
        label: item.label,
        kind: item.lspKind ?? toLspCompletionItemKind(item.kind),
        detail: item.detail,
        documentation: item.documentation,
        sortText: item.sortText,
        filterText: item.filterText,
        preselect: item.preselect,
        insertText: item.insertText,
        textEdit: item.textEdit ? {
            range: toLspRange(item.textEdit.range),
            newText: item.textEdit.newText
        } : undefined,
        insertTextFormat: item.insertTextFormat,
        commitCharacters: item.commitCharacters,
        additionalTextEdits: item.additionalTextEdits?.map(edit => ({
            range: toLspRange(edit.range),
            newText: edit.newText
        })),
        command: item.command,
        data: item.data
    };
}

function toLspCompletionItemKind(kind: CSharpIntelliSenseItemKind): number {
    switch (kind) {
        case 'namespace':
            return 9;
        case 'class':
        case 'record':
            return 7;
        case 'interface':
            return 8;
        case 'struct':
            return 22;
        case 'enum':
            return 13;
        case 'method':
            return 2;
        case 'property':
            return 10;
        case 'package':
            return 18;
        case 'snippet':
            return 15;
        case 'keyword':
        default:
            return 14;
    }
}

function toLspDiagnostic(diagnostic: CSharpLanguageServerDiagnostic): {
    range: ReturnType<typeof toLspRange>;
    severity?: number;
    code?: string | number;
    source?: string;
    message: string;
} {
    return {
        range: toLspRange(diagnostic.range),
        severity: diagnostic.severity,
        code: diagnostic.code,
        source: diagnostic.source,
        message: diagnostic.message
    };
}

function publishedDiagnosticsFromMessage(message: JsonRpcMessage, fallbackDocumentPath: string): { path: string; diagnostics: CSharpDiagnostic[] } | undefined {
    if (message.method !== 'textDocument/publishDiagnostics' || !isRecord(message.params)) {
        return undefined;
    }
    const uri = stringValue(message.params.uri);
    const documentPath = uri ? pathFromLspUri(uri, fallbackDocumentPath) : fallbackDocumentPath;
    const diagnostics = Array.isArray(message.params.diagnostics)
        ? message.params.diagnostics
            .map(diagnostic => toCSharpDiagnosticFromLsp(diagnostic, documentPath))
            .filter((diagnostic): diagnostic is CSharpDiagnostic => !!diagnostic)
        : [];
    return { path: documentPath, diagnostics };
}

function supportsPullDiagnostics(initializeResult: unknown): boolean {
    const capabilities = isRecord(initializeResult) && isRecord(initializeResult.capabilities)
        ? initializeResult.capabilities
        : undefined;
    return !!capabilities && capabilities.diagnosticProvider !== undefined && capabilities.diagnosticProvider !== false;
}

function supportsWorkspaceDiagnostics(initializeResult: unknown): boolean {
    const capabilities = isRecord(initializeResult) && isRecord(initializeResult.capabilities)
        ? initializeResult.capabilities
        : undefined;
    const provider = capabilities?.diagnosticProvider;
    return isRecord(provider) && provider.workspaceDiagnostics === true;
}

function diagnosticsFromPullReport(value: unknown, documentPath: string): CSharpDiagnostic[] | undefined {
    if (!isRecord(value) || typeof value.kind !== 'string') {
        return undefined;
    }
    if (value.kind === 'unchanged') {
        return [];
    }
    if (value.kind !== 'full') {
        return undefined;
    }
    return Array.isArray(value.items)
        ? value.items
            .map(diagnostic => toCSharpDiagnosticFromLsp(diagnostic, documentPath))
            .filter((diagnostic): diagnostic is CSharpDiagnostic => !!diagnostic)
        : [];
}

function diagnosticsFromWorkspaceReport(value: unknown, workspacePath: string): CSharpDiagnostic[] {
    if (!isRecord(value) || !Array.isArray(value.items)) {
        return [];
    }
    const diagnostics: CSharpDiagnostic[] = [];
    for (const item of value.items) {
        diagnostics.push(...diagnosticsFromWorkspaceDocumentReport(item, workspacePath));
    }
    return diagnostics;
}

function diagnosticsFromWorkspaceDocumentReport(value: unknown, workspacePath: string): CSharpDiagnostic[] {
    if (!isRecord(value)) {
        return [];
    }
    const uri = stringValue(value.uri);
    const documentPath = uri ? pathFromLspUri(uri, workspacePath) : workspacePath;
    const diagnostics = value.kind === 'full' && Array.isArray(value.items)
        ? value.items
            .map(diagnostic => toCSharpDiagnosticFromLsp(diagnostic, documentPath))
            .filter((diagnostic): diagnostic is CSharpDiagnostic => !!diagnostic)
        : [];
    const related = isRecord(value.relatedDocuments)
        ? Object.entries(value.relatedDocuments).flatMap(([relatedUri, report]) => {
            const relatedPath = pathFromLspUri(relatedUri, workspacePath);
            return diagnosticsFromRelatedDocumentReport(report, relatedPath);
        })
        : [];
    return [...diagnostics, ...related];
}

function diagnosticsFromRelatedDocumentReport(value: unknown, documentPath: string): CSharpDiagnostic[] {
    if (!isRecord(value) || value.kind !== 'full' || !Array.isArray(value.items)) {
        return [];
    }
    return value.items
        .map(diagnostic => toCSharpDiagnosticFromLsp(diagnostic, documentPath))
        .filter((diagnostic): diagnostic is CSharpDiagnostic => !!diagnostic);
}

function applyEditRequestFromMessage(message: JsonRpcMessage): { edits: CSharpLanguageServerTextEdit[] } | undefined {
    if (message.method !== 'workspace/applyEdit' || message.id === undefined || !isRecord(message.params)) {
        return undefined;
    }
    return {
        edits: toWorkspaceTextEdits(message.params.edit)
    };
}

function serverRequestResponseFromMessage(message: JsonRpcMessage, workspacePath: string): JsonRpcMessage | undefined {
    if (message.id === undefined || !message.method) {
        return undefined;
    }
    switch (message.method) {
        case 'workspace/configuration':
            return {
                jsonrpc: '2.0',
                id: message.id,
                result: workspaceConfigurationResult(message.params)
            };
        case 'workspace/workspaceFolders':
            return {
                jsonrpc: '2.0',
                id: message.id,
                result: [{
                    uri: pathToFileURL(path.resolve(workspacePath)).toString(),
                    name: path.basename(workspacePath)
                }]
            };
        case 'client/registerCapability':
        case 'client/unregisterCapability':
        case 'window/showMessageRequest':
        case 'window/workDoneProgress/create':
        case 'workspace/semanticTokens/refresh':
        case 'workspace/codeLens/refresh':
        case 'workspace/inlayHint/refresh':
        case 'workspace/inlineValue/refresh':
        case 'workspace/inlineCompletion/refresh':
        case 'workspace/diagnostic/refresh':
            return {
                jsonrpc: '2.0',
                id: message.id,
                result: null
            };
        case 'window/showDocument':
            return {
                jsonrpc: '2.0',
                id: message.id,
                result: {
                    success: false
                }
            };
        default:
            return undefined;
    }
}

function workspaceConfigurationResult(params: unknown): unknown[] {
    if (!isRecord(params) || !Array.isArray(params.items)) {
        return [];
    }
    return params.items.map(() => ({}));
}

function pathFromLspUri(uri: string, fallbackDocumentPath: string): string {
    try {
        return fileURLToPath(uri);
    } catch {
        return fallbackDocumentPath;
    }
}

function toCSharpDiagnosticFromLsp(value: unknown, documentPath: string): CSharpDiagnostic | undefined {
    if (!isRecord(value)) {
        return undefined;
    }
    const range = lspRange(value.range);
    const message = stringValue(value.message);
    if (!range || !message) {
        return undefined;
    }
    return {
        path: documentPath,
        line: range.line,
        column: range.column,
        endLine: range.endLine,
        endColumn: range.endColumn,
        severity: csharpDiagnosticSeverity(value.severity),
        code: csharpDiagnosticCode(value.code),
        message
    };
}

function csharpDiagnosticSeverity(value: unknown): CSharpDiagnostic['severity'] {
    switch (value) {
        case 1:
            return 'error';
        case 2:
            return 'warning';
        case 3:
        case 4:
        default:
            return 'info';
    }
}

function csharpDiagnosticCode(value: unknown): string | undefined {
    if (typeof value === 'string' && value.trim()) {
        return value;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value);
    }
    return undefined;
}

function toLspInlayHint(hint: CSharpLanguageServerInlayHint, documentUri: string): {
    label: string;
    position: ReturnType<typeof lspPosition>;
    kind?: number;
    tooltip?: string;
    textEdits?: Array<{ range: ReturnType<typeof toLspRange>; newText: string }>;
    paddingLeft?: boolean;
    paddingRight?: boolean;
    data?: unknown;
} {
    return {
        label: hint.label,
        position: lspPosition(hint.position),
        kind: toLspInlayHintKind(hint.kind),
        tooltip: hint.tooltip,
        textEdits: hint.textEdits
            .filter(edit => edit.uri === documentUri)
            .map(edit => ({
                range: toLspRange(edit.range),
                newText: edit.newText
            })),
        paddingLeft: hint.paddingLeft,
        paddingRight: hint.paddingRight,
        data: hint.data
    };
}

function toLspInlayHintKind(kind: CSharpLanguageServerInlayHint['kind']): number | undefined {
    switch (kind) {
        case 'type':
            return 1;
        case 'parameter':
            return 2;
        default:
            return undefined;
    }
}

function formattingOptions(options: CSharpLanguageServerFormattingOptions): { tabSize: number; insertSpaces: boolean } {
    const tabSize = typeof options.tabSize === 'number' && Number.isFinite(options.tabSize)
        ? Math.max(1, Math.trunc(options.tabSize))
        : 4;
    return {
        tabSize,
        insertSpaces: options.insertSpaces !== false
    };
}

function lspColor(color: CSharpLanguageServerColor): CSharpLanguageServerColor {
    return {
        red: clampColor(color.red),
        green: clampColor(color.green),
        blue: clampColor(color.blue),
        alpha: clampColor(color.alpha)
    };
}

function clampColor(value: number): number {
    return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

function toDocumentSymbols(value: unknown, documentUri: string): CSharpLanguageServerDocumentSymbol[] {
    if (!Array.isArray(value)) {
        return [];
    }
    return value
        .map(entry => isSymbolInformation(entry) ? symbolInformationToDocumentSymbol(entry, documentUri) : documentSymbolFromLsp(entry))
        .filter((entry): entry is CSharpLanguageServerDocumentSymbol => Boolean(entry));
}

function documentSymbolFromLsp(value: unknown): CSharpLanguageServerDocumentSymbol | undefined {
    if (!isRecord(value)) {
        return undefined;
    }
    const name = stringValue(value.name);
    const range = lspRange(value.range);
    const selectionRange = lspRange(value.selectionRange) ?? range;
    if (!name || !range || !selectionRange) {
        return undefined;
    }
    const children = Array.isArray(value.children)
        ? value.children.map(documentSymbolFromLsp).filter((entry): entry is CSharpLanguageServerDocumentSymbol => Boolean(entry))
        : [];
    return {
        name,
        detail: stringValue(value.detail),
        kind: lspSymbolKind(value.kind),
        range,
        selectionRange,
        children
    };
}

function symbolInformationToDocumentSymbol(value: Record<string, unknown>, documentUri: string): CSharpLanguageServerDocumentSymbol | undefined {
    const location = isRecord(value.location) ? value.location : undefined;
    const uri = stringValue(location?.uri);
    if (uri && uri !== documentUri) {
        return undefined;
    }
    const name = stringValue(value.name);
    const range = lspRange(location?.range);
    if (!name || !range) {
        return undefined;
    }
    return {
        name,
        detail: stringValue(value.containerName),
        kind: lspSymbolKind(value.kind),
        range,
        selectionRange: range,
        children: []
    };
}

function isSymbolInformation(value: unknown): value is Record<string, unknown> {
    return isRecord(value) && isRecord(value.location);
}

function toDocumentLinks(value: unknown): CSharpLanguageServerDocumentLink[] {
    if (!Array.isArray(value)) {
        return [];
    }
    return value
        .map(documentLink)
        .filter((entry): entry is CSharpLanguageServerDocumentLink => Boolean(entry));
}

function documentLink(value: unknown): CSharpLanguageServerDocumentLink | undefined {
    if (!isRecord(value)) {
        return undefined;
    }
    const range = lspRange(value.range);
    const target = stringValue(value.target);
    if (!range) {
        return undefined;
    }
    return {
        range,
        target,
        tooltip: stringValue(value.tooltip),
        data: value.data
    };
}

function toDocumentColors(value: unknown): CSharpLanguageServerDocumentColor[] {
    if (!Array.isArray(value)) {
        return [];
    }
    return value
        .map(documentColor)
        .filter((entry): entry is CSharpLanguageServerDocumentColor => Boolean(entry));
}

function documentColor(value: unknown): CSharpLanguageServerDocumentColor | undefined {
    if (!isRecord(value)) {
        return undefined;
    }
    const range = lspRange(value.range);
    const color = colorValue(value.color);
    if (!range || !color) {
        return undefined;
    }
    return { range, color };
}

function toCodeLenses(value: unknown): CSharpLanguageServerCodeLens[] {
    if (!Array.isArray(value)) {
        return [];
    }
    return value
        .map(codeLens)
        .filter((entry): entry is CSharpLanguageServerCodeLens => Boolean(entry));
}

function codeLens(value: unknown): CSharpLanguageServerCodeLens | undefined {
    if (!isRecord(value)) {
        return undefined;
    }
    const range = lspRange(value.range);
    if (!range) {
        return undefined;
    }
    return {
        range,
        command: codeLensCommand(value.command),
        data: value.data
    };
}

function codeLensCommand(value: unknown): CSharpLanguageServerCodeLens['command'] | undefined {
    if (!isRecord(value)) {
        return undefined;
    }
    const title = stringValue(value.title);
    const command = stringValue(value.command);
    if (!title || !command) {
        return undefined;
    }
    return {
        title,
        command,
        arguments: Array.isArray(value.arguments) ? value.arguments : undefined
    };
}

function colorValue(value: unknown): CSharpLanguageServerColor | undefined {
    if (!isRecord(value)) {
        return undefined;
    }
    const red = numberValue(value.red);
    const green = numberValue(value.green);
    const blue = numberValue(value.blue);
    const alpha = numberValue(value.alpha);
    if (red === undefined || green === undefined || blue === undefined || alpha === undefined) {
        return undefined;
    }
    return {
        red: clampColor(red),
        green: clampColor(green),
        blue: clampColor(blue),
        alpha: clampColor(alpha)
    };
}

function toLinkedEditingRanges(value: unknown): Pick<CSharpLanguageServerLinkedEditingRangeResult, 'ranges' | 'wordPattern'> {
    if (!isRecord(value) || !Array.isArray(value.ranges)) {
        return { ranges: [] };
    }
    const ranges = value.ranges
        .map(lspRange)
        .filter((range): range is CSharpWorkspaceSymbolRange => Boolean(range));
    return {
        ranges,
        wordPattern: stringValue(value.wordPattern)
    };
}

function toMonikers(value: unknown): CSharpLanguageServerMoniker[] {
    if (!Array.isArray(value)) {
        return [];
    }
    return value
        .map(toMoniker)
        .filter((moniker): moniker is CSharpLanguageServerMoniker => Boolean(moniker));
}

function toMoniker(value: unknown): CSharpLanguageServerMoniker | undefined {
    if (!isRecord(value)) {
        return undefined;
    }
    const scheme = stringValue(value.scheme);
    const identifier = stringValue(value.identifier);
    const unique = monikerUniquenessLevel(value.unique);
    if (!scheme || !identifier || !unique) {
        return undefined;
    }
    const kind = monikerKind(value.kind);
    return {
        scheme,
        identifier,
        unique,
        ...(kind ? { kind } : {})
    };
}

function monikerKind(value: unknown): CSharpLanguageServerMonikerKind | undefined {
    switch (value) {
        case 'import':
        case 'export':
        case 'local':
            return value;
        default:
            return undefined;
    }
}

function monikerUniquenessLevel(value: unknown): CSharpLanguageServerMonikerUniquenessLevel | undefined {
    switch (value) {
        case 'document':
        case 'project':
        case 'group':
        case 'scheme':
        case 'global':
            return value;
        default:
            return undefined;
    }
}

function toInlineValues(value: unknown): CSharpLanguageServerInlineValue[] {
    if (!Array.isArray(value)) {
        return [];
    }
    return value
        .map(toInlineValue)
        .filter((inlineValue): inlineValue is CSharpLanguageServerInlineValue => Boolean(inlineValue));
}

function toInlineValue(value: unknown): CSharpLanguageServerInlineValue | undefined {
    if (!isRecord(value)) {
        return undefined;
    }
    const range = lspRange(value.range);
    if (!range) {
        return undefined;
    }
    const text = stringValue(value.text);
    if (text) {
        return {
            kind: 'text',
            range,
            text
        };
    }
    const variableName = stringValue(value.variableName);
    if (variableName || typeof value.caseSensitiveLookup === 'boolean') {
        return {
            kind: 'variable',
            range,
            ...(variableName ? { variableName } : {}),
            caseSensitiveLookup: typeof value.caseSensitiveLookup === 'boolean' ? value.caseSensitiveLookup : false
        };
    }
    const expression = stringValue(value.expression);
    return {
        kind: 'expression',
        range,
        ...(expression ? { expression } : {})
    };
}

function toEvaluatableExpression(value: unknown): CSharpLanguageServerEvaluatableExpression | undefined {
    if (!isRecord(value)) {
        return undefined;
    }
    const range = lspRange(value.range);
    if (!range) {
        return undefined;
    }
    const expression = stringValue(value.expression);
    return {
        range,
        ...(expression ? { expression } : {})
    };
}

interface CSharpSemanticTokenLegend {
    tokenTypes: string[];
    tokenModifiers: string[];
}

function semanticTokensLegend(value: unknown): CSharpSemanticTokenLegend {
    const capabilities = isRecord(value) && isRecord(value.capabilities) ? value.capabilities : undefined;
    const provider = isRecord(capabilities?.semanticTokensProvider) ? capabilities.semanticTokensProvider : undefined;
    const legend = isRecord(provider?.legend) ? provider.legend : undefined;
    return {
        tokenTypes: stringArray(legend?.tokenTypes) ?? [...CSHARP_LANGUAGE_SERVER_SEMANTIC_TOKEN_TYPES],
        tokenModifiers: stringArray(legend?.tokenModifiers) ?? [...CSHARP_LANGUAGE_SERVER_SEMANTIC_TOKEN_MODIFIERS]
    };
}

function semanticTokensFullDeltaSupported(value: unknown): boolean {
    const capabilities = isRecord(value) && isRecord(value.capabilities) ? value.capabilities : undefined;
    const provider = isRecord(capabilities?.semanticTokensProvider) ? capabilities.semanticTokensProvider : undefined;
    const full = provider?.full;
    return isRecord(full) && full.delta === true;
}

function toSemanticTokens(value: unknown, serverLegend: CSharpSemanticTokenLegend): Pick<CSharpLanguageServerSemanticTokensResult, 'resultId' | 'data'> {
    if (!isRecord(value) || !Array.isArray(value.data)) {
        return { data: [] };
    }
    return {
        resultId: stringValue(value.resultId),
        data: semanticTokenData(value.data, serverLegend)
    };
}

function toSemanticTokenDelta(value: unknown, serverLegend: CSharpSemanticTokenLegend): { resultId?: string; edits: CSharpLanguageServerSemanticTokensEdit[] } | undefined {
    if (!isRecord(value) || !Array.isArray(value.edits)) {
        return undefined;
    }
    const edits = value.edits
        .map(edit => semanticTokenEdit(edit, serverLegend))
        .filter((edit): edit is CSharpLanguageServerSemanticTokensEdit => Boolean(edit));
    return {
        resultId: stringValue(value.resultId),
        edits
    };
}

function semanticTokenEdit(value: unknown, serverLegend: CSharpSemanticTokenLegend): CSharpLanguageServerSemanticTokensEdit | undefined {
    if (!isRecord(value)) {
        return undefined;
    }
    const start = semanticTokenNumber(value.start);
    const deleteCount = semanticTokenNumber(value.deleteCount);
    if (start === undefined || deleteCount === undefined) {
        return undefined;
    }
    return {
        start,
        deleteCount,
        ...(Array.isArray(value.data) ? { data: semanticTokenData(value.data, serverLegend) } : {})
    };
}

function semanticTokenData(value: unknown[], serverLegend: CSharpSemanticTokenLegend): number[] {
    const data: number[] = [];
    for (let index = 0; index + 4 < value.length; index += 5) {
        const deltaLine = semanticTokenNumber(value[index]);
        const deltaStart = semanticTokenNumber(value[index + 1]);
        const length = semanticTokenNumber(value[index + 2]);
        const tokenType = semanticTokenNumber(value[index + 3]);
        const tokenModifiers = semanticTokenNumber(value[index + 4]);
        if (deltaLine === undefined || deltaStart === undefined || length === undefined || tokenType === undefined || tokenModifiers === undefined) {
            continue;
        }
        data.push(
            deltaLine,
            deltaStart,
            length,
            mapSemanticTokenType(tokenType, serverLegend.tokenTypes),
            mapSemanticTokenModifiers(tokenModifiers, serverLegend.tokenModifiers)
        );
    }
    return data;
}

function mapSemanticTokenType(tokenType: number, serverTokenTypes: string[]): number {
    const tokenTypeName = serverTokenTypes[tokenType] ?? CSHARP_LANGUAGE_SERVER_SEMANTIC_TOKEN_TYPES[tokenType];
    const mapped = CSHARP_LANGUAGE_SERVER_SEMANTIC_TOKEN_TYPES.indexOf(tokenTypeName as typeof CSHARP_LANGUAGE_SERVER_SEMANTIC_TOKEN_TYPES[number]);
    return mapped >= 0 ? mapped : CSHARP_LANGUAGE_SERVER_SEMANTIC_TOKEN_TYPES.indexOf('variable');
}

function mapSemanticTokenModifiers(tokenModifiers: number, serverTokenModifiers: string[]): number {
    let mapped = 0;
    for (let index = 0; index < serverTokenModifiers.length; index++) {
        if ((tokenModifiers & (1 << index)) === 0) {
            continue;
        }
        const modifier = serverTokenModifiers[index];
        const mappedIndex = CSHARP_LANGUAGE_SERVER_SEMANTIC_TOKEN_MODIFIERS.indexOf(modifier as typeof CSHARP_LANGUAGE_SERVER_SEMANTIC_TOKEN_MODIFIERS[number]);
        if (mappedIndex >= 0) {
            mapped |= 1 << mappedIndex;
        }
    }
    return mapped;
}

function semanticTokenNumber(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0
        ? Math.trunc(value)
        : undefined;
}

function toHover(value: unknown): { contents: string[]; range?: CSharpWorkspaceSymbolRange } {
    if (!isRecord(value)) {
        return { contents: [] };
    }
    return {
        contents: hoverContents(value.contents),
        range: lspRange(value.range)
    };
}

function toFoldingRanges(value: unknown): CSharpLanguageServerFoldingRange[] {
    if (!Array.isArray(value)) {
        return [];
    }
    return value
        .map(foldingRange)
        .filter((entry): entry is CSharpLanguageServerFoldingRange => Boolean(entry));
}

function foldingRange(value: unknown): CSharpLanguageServerFoldingRange | undefined {
    if (!isRecord(value)) {
        return undefined;
    }
    const startLine = lspLine(value.startLine);
    const endLine = lspLine(value.endLine);
    if (startLine === undefined || endLine === undefined || endLine < startLine) {
        return undefined;
    }
    return {
        startLine,
        endLine,
        kind: lspFoldingRangeKind(value.kind)
    };
}

function lspLine(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0
        ? Math.trunc(value) + 1
        : undefined;
}

function lspFoldingRangeKind(value: unknown): CSharpLanguageServerFoldingRange['kind'] {
    switch (value) {
        case 'comment':
        case 'imports':
        case 'region':
            return value;
        default:
            return undefined;
    }
}

function toSelectionRangeChains(value: unknown): CSharpWorkspaceSymbolRange[][] {
    if (!Array.isArray(value)) {
        return [];
    }
    return value
        .map(selectionRangeChain)
        .filter(chain => chain.length > 0);
}

function selectionRangeChain(value: unknown): CSharpWorkspaceSymbolRange[] {
    const ranges: CSharpWorkspaceSymbolRange[] = [];
    const seen = new Set<object>();
    let current = value;
    while (isRecord(current)) {
        if (seen.has(current)) {
            break;
        }
        seen.add(current);
        const range = lspRange(current.range);
        if (!range) {
            break;
        }
        ranges.push(range);
        current = current.parent;
    }
    return ranges;
}

function toDocumentHighlights(value: unknown): CSharpLanguageServerDocumentHighlight[] {
    if (!Array.isArray(value)) {
        return [];
    }
    return value
        .map(documentHighlight)
        .filter((entry): entry is CSharpLanguageServerDocumentHighlight => Boolean(entry));
}

function documentHighlight(value: unknown): CSharpLanguageServerDocumentHighlight | undefined {
    if (!isRecord(value)) {
        return undefined;
    }
    const range = lspRange(value.range);
    if (!range) {
        return undefined;
    }
    return {
        range,
        kind: lspDocumentHighlightKind(value.kind)
    };
}

function lspDocumentHighlightKind(value: unknown): CSharpLanguageServerDocumentHighlight['kind'] {
    switch (value) {
        case 2:
            return 'read';
        case 3:
            return 'write';
        default:
            return 'text';
    }
}

function hoverContents(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value.flatMap(hoverContents);
    }
    if (typeof value === 'string' && value.trim()) {
        return [value];
    }
    if (!isRecord(value)) {
        return [];
    }
    const content = stringValue(value.value);
    if (!content) {
        return [];
    }
    const language = stringValue(value.language);
    return language ? [`\`\`\`${language}\n${content}\n\`\`\``] : [content];
}

function toDefinitionLocations(value: unknown): CSharpLanguageServerDefinitionLocation[] {
    const values = Array.isArray(value) ? value : [value];
    return values
        .map(definitionLocation)
        .filter((entry): entry is CSharpLanguageServerDefinitionLocation => Boolean(entry));
}

function definitionLocation(value: unknown): CSharpLanguageServerDefinitionLocation | undefined {
    if (!isRecord(value)) {
        return undefined;
    }
    const uri = stringValue(value.uri) ?? stringValue(value.targetUri);
    const range = lspRange(value.range) ?? lspRange(value.targetSelectionRange) ?? lspRange(value.targetRange);
    if (!uri || !range) {
        return undefined;
    }
    return { uri, range };
}

function toWorkspaceSymbols(value: unknown): CSharpLanguageServerWorkspaceSymbol[] {
    if (!Array.isArray(value)) {
        return [];
    }
    return value
        .map(workspaceSymbol)
        .filter((entry): entry is CSharpLanguageServerWorkspaceSymbol => Boolean(entry));
}

function workspaceSymbol(value: unknown): CSharpLanguageServerWorkspaceSymbol | undefined {
    if (!isRecord(value)) {
        return undefined;
    }
    const name = stringValue(value.name);
    const kind = numberValue(value.kind);
    const location = isRecord(value.location) ? value.location : undefined;
    const locationUri = location ? stringValue(location.uri) : undefined;
    const directUri = stringValue(value.uri);
    const uri = locationUri ?? directUri;
    const range = (location ? lspRange(location.range) : lspRange(value.range)) ?? defaultWorkspaceSymbolRange();
    if (!name || kind === undefined || !uri) {
        return undefined;
    }
    return {
        name,
        kind: Math.trunc(kind),
        uri,
        range,
        containerName: stringValue(value.containerName),
        tags: numberArray(value.tags),
        data: value.data
    };
}

function defaultWorkspaceSymbolRange(): CSharpWorkspaceSymbolRange {
    return { line: 1, column: 1, endLine: 1, endColumn: 1 };
}

function toCallHierarchyItems(value: unknown): CSharpLanguageServerCallHierarchyItem[] {
    const values = Array.isArray(value) ? value : [value];
    return values
        .map(callHierarchyItem)
        .filter((entry): entry is CSharpLanguageServerCallHierarchyItem => Boolean(entry));
}

function callHierarchyItem(value: unknown): CSharpLanguageServerCallHierarchyItem | undefined {
    if (!isRecord(value)) {
        return undefined;
    }
    const name = stringValue(value.name);
    const kind = numberValue(value.kind);
    const uri = stringValue(value.uri);
    const range = lspRange(value.range);
    const selectionRange = lspRange(value.selectionRange) ?? range;
    if (!name || kind === undefined || !uri || !range || !selectionRange) {
        return undefined;
    }
    return {
        name,
        kind: Math.trunc(kind),
        uri,
        range,
        selectionRange,
        detail: stringValue(value.detail),
        tags: numberArray(value.tags),
        data: value.data
    };
}

function toTypeHierarchyItems(value: unknown): CSharpLanguageServerTypeHierarchyItem[] {
    const values = Array.isArray(value) ? value : [value];
    return values
        .map(typeHierarchyItem)
        .filter((entry): entry is CSharpLanguageServerTypeHierarchyItem => Boolean(entry));
}

function typeHierarchyItem(value: unknown): CSharpLanguageServerTypeHierarchyItem | undefined {
    if (!isRecord(value)) {
        return undefined;
    }
    const name = stringValue(value.name);
    const kind = numberValue(value.kind);
    const uri = stringValue(value.uri);
    const range = lspRange(value.range);
    const selectionRange = lspRange(value.selectionRange) ?? range;
    if (!name || kind === undefined || !uri || !range || !selectionRange) {
        return undefined;
    }
    return {
        name,
        kind: Math.trunc(kind),
        uri,
        range,
        selectionRange,
        detail: stringValue(value.detail),
        tags: numberArray(value.tags),
        data: value.data
    };
}

function toCallHierarchyIncomingCalls(value: unknown): CSharpLanguageServerCallHierarchyIncomingCall[] {
    if (!Array.isArray(value)) {
        return [];
    }
    return value
        .map(callHierarchyIncomingCall)
        .filter((entry): entry is CSharpLanguageServerCallHierarchyIncomingCall => Boolean(entry));
}

function callHierarchyIncomingCall(value: unknown): CSharpLanguageServerCallHierarchyIncomingCall | undefined {
    if (!isRecord(value)) {
        return undefined;
    }
    const from = callHierarchyItem(value.from);
    const fromRanges = toLspRanges(value.fromRanges);
    if (!from) {
        return undefined;
    }
    return { from, fromRanges };
}

function toCallHierarchyOutgoingCalls(value: unknown): CSharpLanguageServerCallHierarchyOutgoingCall[] {
    if (!Array.isArray(value)) {
        return [];
    }
    return value
        .map(callHierarchyOutgoingCall)
        .filter((entry): entry is CSharpLanguageServerCallHierarchyOutgoingCall => Boolean(entry));
}

function callHierarchyOutgoingCall(value: unknown): CSharpLanguageServerCallHierarchyOutgoingCall | undefined {
    if (!isRecord(value)) {
        return undefined;
    }
    const to = callHierarchyItem(value.to);
    const fromRanges = toLspRanges(value.fromRanges);
    if (!to) {
        return undefined;
    }
    return { to, fromRanges };
}

function toLspRanges(value: unknown): CSharpWorkspaceSymbolRange[] {
    if (!Array.isArray(value)) {
        return [];
    }
    return value
        .map(lspRange)
        .filter((range): range is CSharpWorkspaceSymbolRange => Boolean(range));
}

function toPrepareRename(value: unknown): Pick<CSharpLanguageServerPrepareRenameResult, 'range' | 'placeholder' | 'defaultBehavior'> {
    if (isRecord(value) && value.defaultBehavior === true) {
        return { defaultBehavior: true };
    }
    const range = isRecord(value) ? lspRange(value.range) ?? lspRange(value) : undefined;
    return range ? {
        range,
        placeholder: isRecord(value) ? stringValue(value.placeholder) : undefined
    } : {};
}

function toNewSymbolNames(value: unknown): CSharpLanguageServerNewSymbolName[] {
    if (!Array.isArray(value)) {
        return [];
    }
    return value
        .map(newSymbolName)
        .filter((entry): entry is CSharpLanguageServerNewSymbolName => Boolean(entry));
}

function newSymbolName(value: unknown): CSharpLanguageServerNewSymbolName | undefined {
    if (typeof value === 'string') {
        const name = value.trim();
        return name ? { newSymbolName: name } : undefined;
    }
    if (!isRecord(value)) {
        return undefined;
    }
    const name = stringValue(value.newSymbolName) ?? stringValue(value.name);
    if (!name) {
        return undefined;
    }
    const tags = newSymbolNameTags(value.tags);
    return {
        newSymbolName: name,
        ...(tags.length ? { tags } : {})
    };
}

function newSymbolNameTags(value: unknown): Array<'ai-generated'> {
    if (!Array.isArray(value)) {
        return [];
    }
    return value.some(tag => tag === 1 || tag === 'ai-generated' || tag === 'AIGenerated')
        ? ['ai-generated']
        : [];
}

function toInlayHints(value: unknown, documentUri: string): CSharpLanguageServerInlayHint[] {
    if (!Array.isArray(value)) {
        return [];
    }
    return value
        .map(entry => inlayHint(entry, documentUri))
        .filter((entry): entry is CSharpLanguageServerInlayHint => Boolean(entry));
}

function inlayHint(value: unknown, documentUri: string): CSharpLanguageServerInlayHint | undefined {
    if (!isRecord(value)) {
        return undefined;
    }
    const position = lspPositionFromServer(value.position);
    const label = inlayHintLabel(value.label);
    if (!position || !label) {
        return undefined;
    }
    return {
        label,
        position,
        kind: lspInlayHintKind(value.kind),
        tooltip: hoverContents(value.tooltip).join('\n\n') || undefined,
        textEdits: toDocumentTextEdits(value.textEdits, documentUri),
        paddingLeft: value.paddingLeft === true || undefined,
        paddingRight: value.paddingRight === true || undefined,
        data: value.data
    };
}

function inlayHintLabel(value: unknown): string | undefined {
    if (typeof value === 'string') {
        return value.trim() ? value : undefined;
    }
    if (!Array.isArray(value)) {
        return undefined;
    }
    const label = value
        .map(entry => isRecord(entry) ? stringValue(entry.label) : undefined)
        .filter((entry): entry is string => Boolean(entry))
        .join('');
    return label || undefined;
}

function lspPositionFromServer(value: unknown): { line: number; column: number } | undefined {
    if (!isRecord(value)) {
        return undefined;
    }
    const line = numberValue(value.line);
    const character = numberValue(value.character);
    if (line === undefined || character === undefined) {
        return undefined;
    }
    return {
        line: line + 1,
        column: character + 1
    };
}

function lspInlayHintKind(value: unknown): CSharpLanguageServerInlayHint['kind'] {
    switch (value) {
        case 1:
            return 'type';
        case 2:
            return 'parameter';
        default:
            return undefined;
    }
}

function toColorPresentations(value: unknown, documentUri: string): CSharpLanguageServerColorPresentation[] {
    if (!Array.isArray(value)) {
        return [];
    }
    return value
        .map(entry => colorPresentation(entry, documentUri))
        .filter((entry): entry is CSharpLanguageServerColorPresentation => Boolean(entry));
}

function colorPresentation(value: unknown, documentUri: string): CSharpLanguageServerColorPresentation | undefined {
    if (!isRecord(value)) {
        return undefined;
    }
    const label = stringValue(value.label);
    if (!label) {
        return undefined;
    }
    const textEdit = toDocumentTextEdits([value.textEdit], documentUri)[0];
    return {
        label,
        textEdit,
        additionalTextEdits: toDocumentTextEdits(value.additionalTextEdits, documentUri)
    };
}

function toCodeActions(value: unknown): CSharpLanguageServerCodeAction[] {
    if (!Array.isArray(value)) {
        return [];
    }
    return value
        .map(codeAction)
        .filter((entry): entry is CSharpLanguageServerCodeAction => Boolean(entry));
}

function codeAction(value: unknown): CSharpLanguageServerCodeAction | undefined {
    if (!isRecord(value)) {
        return undefined;
    }
    const title = stringValue(value.title);
    if (!title) {
        return undefined;
    }
    const edit = isRecord(value.edit) ? value.edit : undefined;
    const edits = edit ? toWorkspaceTextEdits(edit) : [];
    const command = languageServerCommand(value.command);
    if (!edits.length && !command && value.data === undefined) {
        return undefined;
    }
    const disabled = isRecord(value.disabled) ? stringValue(value.disabled.reason) : undefined;
    return {
        title,
        kind: stringValue(value.kind),
        isPreferred: value.isPreferred === true,
        disabled,
        edits,
        command,
        data: value.data
    };
}

function languageServerCommand(value: unknown): CSharpLanguageServerCodeAction['command'] {
    if (!isRecord(value)) {
        return undefined;
    }
    const title = stringValue(value.title);
    const command = stringValue(value.command);
    if (!title || !command) {
        return undefined;
    }
    return {
        title,
        command,
        arguments: Array.isArray(value.arguments) ? value.arguments : undefined
    };
}

function toWorkspaceTextEdits(value: unknown): CSharpLanguageServerTextEdit[] {
    if (!isRecord(value)) {
        return [];
    }
    const result: CSharpLanguageServerTextEdit[] = [];
    const changes = isRecord(value.changes) ? value.changes : undefined;
    if (changes) {
        for (const [uri, edits] of Object.entries(changes)) {
            appendWorkspaceTextEdits(result, uri, edits);
        }
    }
    if (Array.isArray(value.documentChanges)) {
        for (const documentChange of value.documentChanges) {
            if (!isRecord(documentChange) || !Array.isArray(documentChange.edits)) {
                continue;
            }
            const textDocument = isRecord(documentChange.textDocument) ? documentChange.textDocument : undefined;
            const uri = stringValue(textDocument?.uri);
            if (uri) {
                appendWorkspaceTextEdits(result, uri, documentChange.edits);
            }
        }
    }
    return result;
}

function appendWorkspaceTextEdits(target: CSharpLanguageServerTextEdit[], uri: string, value: unknown): void {
    if (!Array.isArray(value)) {
        return;
    }
    for (const edit of value) {
        if (!isRecord(edit)) {
            continue;
        }
        const range = lspRange(edit.range);
        const newText = typeof edit.newText === 'string' ? edit.newText : undefined;
        if (range && newText !== undefined) {
            target.push({ uri, range, newText });
        }
    }
}

function toDocumentTextEdits(value: unknown, documentUri: string): CSharpLanguageServerTextEdit[] {
    const result: CSharpLanguageServerTextEdit[] = [];
    appendWorkspaceTextEdits(result, documentUri, value);
    return result;
}

function toCompletionItems(value: unknown, documentUri: string): { items: CSharpIntelliSenseItem[]; isIncomplete?: boolean } {
    const result = isRecord(value) && Array.isArray(value.items)
        ? {
            items: value.items,
            isIncomplete: value.isIncomplete === true,
            itemDefaults: completionItemDefaults(value.itemDefaults)
        }
        : {
            items: Array.isArray(value) ? value : [],
            isIncomplete: undefined,
            itemDefaults: {}
        };
    return {
        items: result.items
            .map(entry => completionItem(entry, documentUri, result.itemDefaults))
            .filter((entry): entry is CSharpIntelliSenseItem => Boolean(entry)),
        isIncomplete: result.isIncomplete
    };
}

function completionItemDefaults(value: unknown): CSharpCompletionItemDefaults {
    if (!isRecord(value)) {
        return {};
    }
    return {
        commitCharacters: stringArray(value.commitCharacters),
        editRange: completionItemDefaultEditRange(value.editRange),
        insertTextFormat: numberValue(value.insertTextFormat),
        data: value.data
    };
}

function completionItemDefaultEditRange(value: unknown): CSharpWorkspaceSymbolRange | undefined {
    const directRange = lspRange(value);
    if (directRange) {
        return directRange;
    }
    if (!isRecord(value)) {
        return undefined;
    }
    return lspRange(value.replace) ?? lspRange(value.insert);
}

function toInlineCompletions(value: unknown, documentUri: string): { items: CSharpLanguageServerInlineCompletion[]; suppressSuggestions?: boolean } {
    const result = isRecord(value) && Array.isArray(value.items)
        ? { items: value.items, suppressSuggestions: value.suppressSuggestions === true }
        : {
            items: Array.isArray(value) ? value : isRecord(value) ? [value] : [],
            suppressSuggestions: undefined
        };
    return {
        items: result.items
            .map(entry => inlineCompletion(entry, documentUri))
            .filter((entry): entry is CSharpLanguageServerInlineCompletion => Boolean(entry)),
        suppressSuggestions: result.suppressSuggestions
    };
}

function inlineCompletion(value: unknown, documentUri: string): CSharpLanguageServerInlineCompletion | undefined {
    if (!isRecord(value)) {
        return undefined;
    }
    const insertText = inlineCompletionInsertText(value);
    if (!insertText) {
        return undefined;
    }
    const range = lspRange(value.range);
    const additionalTextEdits = toDocumentTextEdits(value.additionalTextEdits, documentUri);
    const command = languageServerCommand(value.command);
    return {
        insertText: insertText.text,
        insertTextFormat: insertText.format,
        filterText: stringValue(value.filterText),
        ...(range ? { range } : {}),
        additionalTextEdits,
        ...(command ? { command } : {}),
        completeBracketPairs: value.completeBracketPairs === true || undefined
    };
}

function inlineCompletionInsertText(value: Record<string, unknown>): { text: string; format: 'plain' | 'snippet' } | undefined {
    if (typeof value.insertText === 'string') {
        return value.insertText ? { text: value.insertText, format: 'plain' } : undefined;
    }
    if (isRecord(value.insertText) && typeof value.insertText.snippet === 'string' && value.insertText.snippet) {
        return { text: value.insertText.snippet, format: 'snippet' };
    }
    if (typeof value.text === 'string' && value.text) {
        return { text: value.text, format: 'plain' };
    }
    if (typeof value.newText === 'string' && value.newText) {
        return { text: value.newText, format: 'plain' };
    }
    return undefined;
}

function completionItem(value: unknown, documentUri: string, defaults: CSharpCompletionItemDefaults = {}): CSharpIntelliSenseItem | undefined {
    if (!isRecord(value)) {
        return undefined;
    }
    const label = stringValue(value.label);
    if (!label) {
        return undefined;
    }
    const insertText = completionInsertText(value, label);
    const textEdit = completionTextEdit(value, documentUri, defaults.editRange, insertText);
    const lspKind = numberValue(value.kind);
    const additionalTextEdits = toDocumentTextEdits(value.additionalTextEdits, documentUri);
    return {
        label,
        insertText: textEdit?.newText ?? insertText,
        kind: lspCompletionKind(value.kind),
        detail: stringValue(value.detail) ?? 'Language server completion',
        documentation: hoverContents(value.documentation).join('\n\n') || undefined,
        lspKind: lspKind === undefined ? undefined : Math.trunc(lspKind),
        sortText: stringValue(value.sortText),
        filterText: stringValue(value.filterText),
        preselect: value.preselect === true ? true : undefined,
        textEdit,
        commitCharacters: stringArray(value.commitCharacters) ?? defaults.commitCharacters,
        insertTextFormat: numberValue(value.insertTextFormat) ?? defaults.insertTextFormat,
        additionalTextEdits: additionalTextEdits.length ? additionalTextEdits : undefined,
        command: languageServerCommand(value.command),
        data: value.data === undefined ? defaults.data : value.data
    };
}

function completionInsertText(value: Record<string, unknown>, label: string): string {
    const textEdit = isRecord(value.textEdit) ? value.textEdit : undefined;
    return completionTextEditNewText(textEdit)
        ?? stringValue(value.insertText)
        ?? label;
}

function completionTextEdit(
    value: Record<string, unknown>,
    documentUri: string,
    defaultEditRange: CSharpWorkspaceSymbolRange | undefined,
    insertText: string
): CSharpLanguageServerTextEdit | undefined {
    const textEdit = isRecord(value.textEdit) ? value.textEdit : undefined;
    if (textEdit) {
        const range = lspRange(textEdit.range) ?? lspRange(textEdit.replace) ?? lspRange(textEdit.insert);
        const newText = completionTextEditNewText(textEdit);
        if (range && newText !== undefined) {
            return {
                uri: documentUri,
                range,
                newText
            };
        }
    }
    if (!defaultEditRange) {
        return undefined;
    }
    return {
        uri: documentUri,
        range: defaultEditRange,
        newText: insertText
    };
}

function completionTextEditNewText(value: unknown): string | undefined {
    return isRecord(value) && typeof value.newText === 'string' ? value.newText : undefined;
}

function toSignatureHelp(value: unknown): {
    signatures: CSharpLanguageServerSignatureInformation[];
    activeSignature: number;
    activeParameter: number;
} {
    if (!isRecord(value) || !Array.isArray(value.signatures)) {
        return { signatures: [], activeSignature: 0, activeParameter: 0 };
    }
    const signatures = value.signatures
        .map(signatureInformation)
        .filter((entry): entry is CSharpLanguageServerSignatureInformation => Boolean(entry));
    return {
        signatures,
        activeSignature: boundedIndex(value.activeSignature, signatures.length),
        activeParameter: Math.max(0, Math.trunc(numberValue(value.activeParameter) ?? 0))
    };
}

function signatureInformation(value: unknown): CSharpLanguageServerSignatureInformation | undefined {
    if (!isRecord(value)) {
        return undefined;
    }
    const label = stringValue(value.label);
    if (!label) {
        return undefined;
    }
    const parameters = Array.isArray(value.parameters)
        ? value.parameters.map(parameterInformation(label)).filter((entry): entry is string => Boolean(entry))
        : [];
    return {
        label,
        documentation: hoverContents(value.documentation).join('\n\n') || undefined,
        parameters
    };
}

function parameterInformation(signatureLabel: string): (value: unknown) => string | undefined {
    return value => {
        if (!isRecord(value)) {
            return undefined;
        }
        const label = value.label;
        if (typeof label === 'string' && label.trim()) {
            return label;
        }
        if (Array.isArray(label) && label.length === 2) {
            const start = numberValue(label[0]);
            const end = numberValue(label[1]);
            if (start !== undefined && end !== undefined && start >= 0 && end > start && end <= signatureLabel.length) {
                return signatureLabel.slice(start, end);
            }
        }
        return undefined;
    };
}

function boundedIndex(value: unknown, length: number): number {
    if (length <= 0) {
        return 0;
    }
    const numeric = Math.trunc(numberValue(value) ?? 0);
    return Math.min(Math.max(0, numeric), length - 1);
}

function lspRange(value: unknown): CSharpLanguageServerDocumentSymbol['range'] | undefined {
    if (!isRecord(value) || !isRecord(value.start) || !isRecord(value.end)) {
        return undefined;
    }
    const startLine = numberValue(value.start.line);
    const startCharacter = numberValue(value.start.character);
    const endLine = numberValue(value.end.line);
    const endCharacter = numberValue(value.end.character);
    if (startLine === undefined || startCharacter === undefined || endLine === undefined || endCharacter === undefined) {
        return undefined;
    }
    return {
        line: startLine + 1,
        column: startCharacter + 1,
        endLine: endLine + 1,
        endColumn: endCharacter + 1
    };
}

function numberValue(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function lspSymbolKind(value: unknown): CSharpWorkspaceSymbolKind {
    switch (value) {
        case 3:
            return 'namespace';
        case 5:
            return 'class';
        case 6:
        case 9:
        case 12:
            return 'method';
        case 7:
        case 8:
        case 13:
        case 14:
            return 'property';
        case 10:
            return 'enum';
        case 11:
            return 'interface';
        case 23:
            return 'struct';
        default:
            return 'property';
    }
}

function lspCompletionKind(value: unknown): CSharpIntelliSenseItemKind {
    switch (value) {
        case 2:
        case 3:
            return 'method';
        case 4:
        case 5:
        case 10:
            return 'property';
        case 7:
            return 'class';
        case 8:
            return 'interface';
        case 9:
            return 'namespace';
        case 12:
            return 'enum';
        case 13:
            return 'keyword';
        case 15:
            return 'snippet';
        case 22:
            return 'struct';
        default:
            return 'keyword';
    }
}

import { expect } from 'chai';
import * as fsp from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import {
    CSHARP_LSP_ARGS_ENV,
    CSHARP_LSP_COMMAND_ENV,
    CSHARP_LSP_PROBE_TIMEOUT_ENV,
    DEFAULT_LSP_PROBE_TIMEOUT_MS,
    RAZOR_LSP_COMMAND_ENV,
    RAZOR_LSP_PROBE_TIMEOUT_ENV,
    probeCSharpLanguageServerAdapter,
    requestCSharpLanguageServerCallHierarchyIncomingCalls,
    requestCSharpLanguageServerCallHierarchyOutgoingCalls,
    requestCSharpLanguageServerCodeActions,
    requestCSharpLanguageServerCodeLenses,
    requestCSharpLanguageServerColorPresentations,
    requestCSharpLanguageServerCompletions,
    requestCSharpLanguageServerDeclarations,
    requestCSharpLanguageServerDefinitions,
    requestCSharpLanguageServerDiagnostics,
    requestCSharpLanguageServerDocumentColors,
    requestCSharpLanguageServerDocumentHighlights,
    requestCSharpLanguageServerDocumentLinks,
    requestCSharpLanguageServerDocumentSymbols,
    requestCSharpLanguageServerEvaluatableExpression,
    requestCSharpLanguageServerExecuteCommand,
    requestCSharpLanguageServerFoldingRanges,
    requestCSharpLanguageServerFormatting,
    requestCSharpLanguageServerHover,
    requestCSharpLanguageServerImplementations,
    requestCSharpLanguageServerInlayHints,
    requestCSharpLanguageServerInlineCompletions,
    requestCSharpLanguageServerInlineValues,
    requestCSharpLanguageServerLinkedEditingRanges,
    requestCSharpLanguageServerMonikers,
    requestCSharpLanguageServerNewSymbolNames,
    requestCSharpLanguageServerOnTypeFormatting,
    requestCSharpLanguageServerPrepareCallHierarchy,
    requestCSharpLanguageServerPrepareTypeHierarchy,
    requestCSharpLanguageServerRangeSemanticTokens,
    requestCSharpLanguageServerPrepareRename,
    requestCSharpLanguageServerRangeFormatting,
    requestCSharpLanguageServerRangesFormatting,
    requestCSharpLanguageServerReferences,
    requestCSharpLanguageServerRename,
    requestCSharpLanguageServerResolveCodeAction,
    requestCSharpLanguageServerResolveCodeLens,
    requestCSharpLanguageServerResolveCompletionItem,
    requestCSharpLanguageServerResolveDocumentLink,
    requestCSharpLanguageServerResolveInlayHint,
    requestCSharpLanguageServerResolveWorkspaceSymbol,
    requestCSharpLanguageServerSelectionRanges,
    requestCSharpLanguageServerSemanticTokens,
    requestCSharpLanguageServerSignatureHelp,
    requestCSharpLanguageServerTypeHierarchySubtypes,
    requestCSharpLanguageServerTypeHierarchySupertypes,
    requestCSharpLanguageServerTypeDefinitions,
    requestCSharpLanguageServerWorkspaceSymbols,
    requestCSharpLanguageServerWorkspaceDiagnostics,
    resolveCSharpLanguageServerAdapterStatuses
} from './csharp-language-server-adapter';

describe('resolveCSharpLanguageServerAdapterStatuses', () => {
    let workspacePath: string;

    beforeEach(async () => {
        workspacePath = await fsp.mkdtemp(path.join(os.tmpdir(), 'cv-csharp-lsp-'));
    });

    afterEach(async () => {
        await fsp.rm(workspacePath, { recursive: true, force: true });
    });

    it('detects explicitly configured C# language server commands', async () => {
        const serverPath = path.join(workspacePath, process.platform === 'win32' ? 'csharp-ls.exe' : 'csharp-ls');
        await fsp.writeFile(serverPath, '', 'utf8');

        const statuses = resolveCSharpLanguageServerAdapterStatuses({
            [CSHARP_LSP_COMMAND_ENV]: serverPath,
            [CSHARP_LSP_ARGS_ENV]: '--stdio "--log-level=debug"',
            [CSHARP_LSP_PROBE_TIMEOUT_ENV]: '15000',
            PATH: ''
        });
        const csharp = statuses.find(status => status.language === 'csharp');

        expect(csharp?.mode).to.equal('ready');
        expect(csharp?.command).to.equal(serverPath);
        expect(csharp?.args).to.deep.equal(['--stdio', '--log-level=debug']);
        expect(csharp?.probeTimeoutMs).to.equal(15000);
        expect(csharp?.source).to.equal(CSHARP_LSP_COMMAND_ENV);
    });

    it('reports configured-missing language server commands', () => {
        const statuses = resolveCSharpLanguageServerAdapterStatuses({
            [RAZOR_LSP_COMMAND_ENV]: path.join(workspacePath, 'missing-rzls'),
            PATH: ''
        });
        const razor = statuses.find(status => status.language === 'razor');

        expect(razor?.mode).to.equal('configured-missing');
        expect(razor?.detail).to.contain('was configured');
    });

    it('detects workspace-configured language server commands', async () => {
        const toolsDirectory = path.join(workspacePath, '.tools');
        const serverName = process.platform === 'win32' ? 'workspace-csharp-ls.exe' : 'workspace-csharp-ls';
        const serverPath = path.join(toolsDirectory, serverName);
        await fsp.mkdir(toolsDirectory, { recursive: true });
        await fsp.writeFile(serverPath, '', 'utf8');

        const statuses = resolveCSharpLanguageServerAdapterStatuses({
            PATH: ''
        }, workspacePath, {
            languageServers: {
                csharp: {
                    id: 'workspace-csharp-lsp',
                    label: 'Workspace C# LSP',
                    command: `.tools/${serverName}`,
                    args: ['--stdio', '--log-level=debug'],
                    probeTimeoutMs: '12000'
                }
            }
        });
        const csharp = statuses.find(status => status.language === 'csharp');

        expect(csharp?.mode).to.equal('ready');
        expect(csharp?.id).to.equal('workspace-csharp-lsp');
        expect(csharp?.label).to.equal('Workspace C# LSP');
        expect(csharp?.command).to.equal(serverPath);
        expect(csharp?.args).to.deep.equal(['--stdio', '--log-level=debug']);
        expect(csharp?.probeTimeoutMs).to.equal(12000);
        expect(csharp?.source).to.equal('.cybervinci/csharp-kit.json');
    });

    it('falls back from invalid env probe timeouts to workspace-configured values', () => {
        const statuses = resolveCSharpLanguageServerAdapterStatuses({
            [RAZOR_LSP_PROBE_TIMEOUT_ENV]: '250',
            PATH: ''
        }, workspacePath, {
            languageServers: {
                razor: {
                    probeTimeoutMs: 13000
                }
            }
        });
        const razor = statuses.find(status => status.language === 'razor');

        expect(razor?.mode).to.equal('missing');
        expect(razor?.probeTimeoutMs).to.equal(13000);
    });

    it('detects csharp-ls on PATH', async () => {
        const serverName = process.platform === 'win32' ? 'csharp-ls.exe' : 'csharp-ls';
        const serverPath = path.join(workspacePath, serverName);
        await fsp.writeFile(serverPath, '', 'utf8');

        const statuses = resolveCSharpLanguageServerAdapterStatuses({
            PATH: workspacePath,
            PATHEXT: '.EXE'
        });
        const csharp = statuses.find(status => status.language === 'csharp');

        expect(csharp?.mode).to.equal('ready');
        expect(csharp?.id).to.equal('csharp-ls');
        expect(csharp?.command).to.equal(serverPath);
        expect(csharp?.probeTimeoutMs).to.equal(DEFAULT_LSP_PROBE_TIMEOUT_MS);
    });

    it('detects csharp-ls from a workspace dotnet tool manifest', async () => {
        const dotnetName = process.platform === 'win32' ? 'dotnet.exe' : 'dotnet';
        const dotnetPath = path.join(workspacePath, dotnetName);
        const manifestPath = path.join(workspacePath, 'dotnet-tools.json');
        await fsp.writeFile(dotnetPath, '', 'utf8');
        await fsp.writeFile(manifestPath, JSON.stringify({
            version: 1,
            isRoot: true,
            tools: {
                'csharp-ls': {
                    version: '0.18.0',
                    commands: ['csharp-ls']
                }
            }
        }), 'utf8');

        const statuses = resolveCSharpLanguageServerAdapterStatuses({
            PATH: workspacePath,
            PATHEXT: '.EXE'
        }, workspacePath);
        const csharp = statuses.find(status => status.language === 'csharp');

        expect(csharp?.mode).to.equal('ready');
        expect(csharp?.id).to.equal('csharp-ls-dotnet-tool');
        expect(csharp?.command).to.equal(dotnetPath);
        expect(csharp?.args).to.deep.equal(['tool', 'run', 'csharp-ls']);
        expect(csharp?.source).to.equal('dotnet-tools.json');
    });

    it('detects Razor LSP from a workspace dotnet tool manifest', async () => {
        const dotnetName = process.platform === 'win32' ? 'dotnet.exe' : 'dotnet';
        const dotnetPath = path.join(workspacePath, dotnetName);
        const manifestPath = path.join(workspacePath, '.config', 'dotnet-tools.json');
        await fsp.writeFile(dotnetPath, '', 'utf8');
        await fsp.mkdir(path.dirname(manifestPath), { recursive: true });
        await fsp.writeFile(manifestPath, JSON.stringify({
            version: 1,
            isRoot: true,
            tools: {
                'workspace-razor-lsp': {
                    version: '1.0.0',
                    commands: ['rzls']
                }
            }
        }), 'utf8');

        const statuses = resolveCSharpLanguageServerAdapterStatuses({
            PATH: workspacePath,
            PATHEXT: '.EXE'
        }, workspacePath);
        const razor = statuses.find(status => status.language === 'razor');

        expect(razor?.mode).to.equal('ready');
        expect(razor?.id).to.equal('rzls-dotnet-tool');
        expect(razor?.command).to.equal(dotnetPath);
        expect(razor?.args).to.deep.equal(['tool', 'run', 'rzls']);
        expect(razor?.source).to.equal('dotnet-tools.json');
    });

    it('detects C# and Razor Roslyn LSP adapters from an installed VS Code C# extension runtime', async () => {
        const extensionDirectory = path.join(workspacePath, '.vscode', 'extensions', 'ms-dotnettools.csharp-2.140.8-win32-x64');
        const roslynDirectory = path.join(extensionDirectory, '.roslyn');
        const razorDirectory = path.join(extensionDirectory, '.razorExtension');
        const serverName = process.platform === 'win32' ? 'Microsoft.CodeAnalysis.LanguageServer.exe' : 'Microsoft.CodeAnalysis.LanguageServer';
        const serverPath = path.join(roslynDirectory, serverName);
        await fsp.mkdir(roslynDirectory, { recursive: true });
        await fsp.mkdir(path.join(razorDirectory, 'Targets'), { recursive: true });
        await fsp.writeFile(serverPath, '', 'utf8');
        await fsp.writeFile(path.join(razorDirectory, 'Microsoft.VisualStudioCode.RazorExtension.dll'), '', 'utf8');
        await fsp.writeFile(path.join(razorDirectory, 'Microsoft.CodeAnalysis.Razor.Compiler.dll'), '', 'utf8');
        await fsp.writeFile(path.join(razorDirectory, 'Targets', 'Microsoft.NET.Sdk.Razor.DesignTime.targets'), '', 'utf8');
        await fsp.writeFile(path.join(razorDirectory, 'Targets', 'Microsoft.CSharpExtension.DesignTime.targets'), '', 'utf8');

        const statuses = resolveCSharpLanguageServerAdapterStatuses({
            PATH: '',
            USERPROFILE: workspacePath,
            HOME: workspacePath
        }, workspacePath);
        const csharp = statuses.find(status => status.language === 'csharp');
        const razor = statuses.find(status => status.language === 'razor');

        expect(csharp?.mode).to.equal('ready');
        expect(csharp?.id).to.equal('vscode-csharp-roslyn-lsp');
        expect(csharp?.command).to.equal(serverPath);
        expect(csharp?.source).to.equal('VS Code C# extension runtime');
        expect(csharp?.args).to.include.members(['--stdio', '--autoLoadProjects', '--extension']);
        expect(razor?.mode).to.equal('ready');
        expect(razor?.id).to.equal('vscode-csharp-razor-roslyn-lsp');
        expect(razor?.command).to.equal(serverPath);
        expect(razor?.args).to.deep.equal(csharp?.args);
    });

    it('probes configured language servers with an LSP initialize handshake', async () => {
        const serverPath = path.join(workspacePath, 'fake-lsp.js');
        await fsp.writeFile(serverPath, `
let buffer = Buffer.alloc(0);
function send(message) {
  const body = JSON.stringify(message);
  process.stdout.write('Content-Length: ' + Buffer.byteLength(body, 'utf8') + '\\r\\n\\r\\n' + body);
}
function readMessages() {
  while (buffer.length) {
    const headerEnd = buffer.indexOf('\\r\\n\\r\\n');
    if (headerEnd < 0) {
      return;
    }
    const header = buffer.subarray(0, headerEnd).toString('utf8');
    const match = /Content-Length:\\s*(\\d+)/i.exec(header);
    if (!match) {
      process.exit(2);
    }
    const bodyStart = headerEnd + 4;
    const bodyEnd = bodyStart + Number(match[1]);
    if (buffer.length < bodyEnd) {
      return;
    }
    const message = JSON.parse(buffer.subarray(bodyStart, bodyEnd).toString('utf8'));
    buffer = buffer.subarray(bodyEnd);
    if (message.method === 'initialize') {
      send({
        jsonrpc: '2.0',
        id: message.id,
        result: {
          serverInfo: { name: 'fake-csharp-lsp', version: '1.0.0' },
          capabilities: {
            textDocumentSync: 1,
            completionProvider: { triggerCharacters: ['.'], resolveProvider: true },
            definitionProvider: true
          }
        }
      });
    } else if (message.method === 'shutdown') {
      send({ jsonrpc: '2.0', id: message.id, result: null });
    } else if (message.method === 'exit') {
      process.exit(0);
    }
  }
}
process.stdin.on('data', chunk => {
  buffer = Buffer.concat([buffer, chunk]);
  readMessages();
});
`, 'utf8');
        const statuses = resolveCSharpLanguageServerAdapterStatuses({
            [CSHARP_LSP_COMMAND_ENV]: process.execPath,
            [CSHARP_LSP_ARGS_ENV]: `"${serverPath}"`,
            PATH: ''
        });
        const csharp = statuses.find(status => status.language === 'csharp');

        const probe = await probeCSharpLanguageServerAdapter(csharp!, workspacePath, 5000);

        expect(probe.ok).to.equal(true);
        expect(probe.mode).to.equal('initialized');
        expect(probe.probeTimeoutMs).to.equal(5000);
        expect(probe.serverName).to.equal('fake-csharp-lsp');
        expect(probe.serverVersion).to.equal('1.0.0');
        expect(probe.capabilityKeys).to.deep.equal(['completionProvider', 'definitionProvider', 'textDocumentSync']);
    });

    it('requests document symbols from configured language servers', async () => {
        const serverPath = path.join(workspacePath, 'fake-symbol-lsp.js');
        await fsp.writeFile(serverPath, `
let buffer = Buffer.alloc(0);
function send(message) {
  const body = JSON.stringify(message);
  process.stdout.write('Content-Length: ' + Buffer.byteLength(body, 'utf8') + '\\r\\n\\r\\n' + body);
}
function readMessages() {
  while (buffer.length) {
    const headerEnd = buffer.indexOf('\\r\\n\\r\\n');
    if (headerEnd < 0) {
      return;
    }
    const header = buffer.subarray(0, headerEnd).toString('utf8');
    const match = /Content-Length:\\s*(\\d+)/i.exec(header);
    if (!match) {
      process.exit(2);
    }
    const bodyStart = headerEnd + 4;
    const bodyEnd = bodyStart + Number(match[1]);
    if (buffer.length < bodyEnd) {
      return;
    }
    const message = JSON.parse(buffer.subarray(bodyStart, bodyEnd).toString('utf8'));
    buffer = buffer.subarray(bodyEnd);
    if (message.method === 'initialize') {
      send({
        jsonrpc: '2.0',
        id: message.id,
        result: {
          capabilities: {
            documentSymbolProvider: true
          }
        }
      });
    } else if (message.method === 'textDocument/documentSymbol') {
      send({
        jsonrpc: '2.0',
        id: message.id,
        result: [
          {
            name: 'OrdersController',
            detail: 'ASP.NET controller',
            kind: 5,
            range: { start: { line: 0, character: 0 }, end: { line: 5, character: 1 } },
            selectionRange: { start: { line: 0, character: 13 }, end: { line: 0, character: 29 } },
            children: [
              {
                name: 'Get',
                kind: 6,
                range: { start: { line: 2, character: 4 }, end: { line: 4, character: 5 } },
                selectionRange: { start: { line: 2, character: 18 }, end: { line: 2, character: 21 } }
              }
            ]
          }
        ]
      });
    } else if (message.method === 'shutdown') {
      send({ jsonrpc: '2.0', id: message.id, result: null });
    } else if (message.method === 'exit') {
      process.exit(0);
    }
  }
}
process.stdin.on('data', chunk => {
  buffer = Buffer.concat([buffer, chunk]);
  readMessages();
});
`, 'utf8');
        const documentPath = path.join(workspacePath, 'OrdersController.cs');
        await fsp.writeFile(documentPath, 'public sealed class OrdersController { }', 'utf8');
        const statuses = resolveCSharpLanguageServerAdapterStatuses({
            [CSHARP_LSP_COMMAND_ENV]: process.execPath,
            [CSHARP_LSP_ARGS_ENV]: `"${serverPath}"`,
            PATH: ''
        });
        const csharp = statuses.find(status => status.language === 'csharp');

        const result = await requestCSharpLanguageServerDocumentSymbols(
            csharp!,
            workspacePath,
            documentPath,
            'public sealed class OrdersController { }',
            5000
        );

        expect(result.source).to.equal('language-server');
        expect(result.symbols.map(symbol => symbol.name)).to.deep.equal(['OrdersController']);
        expect(result.symbols[0].kind).to.equal('class');
        expect(result.symbols[0].range).to.deep.equal({ line: 1, column: 1, endLine: 6, endColumn: 2 });
        expect(result.symbols[0].selectionRange).to.deep.equal({ line: 1, column: 14, endLine: 1, endColumn: 30 });
        expect(result.symbols[0].children.map(symbol => `${symbol.kind}:${symbol.name}`)).to.deep.equal(['method:Get']);
    });

    it('requests pull diagnostics from language servers that advertise diagnosticProvider', async function () {
        this.timeout(10000);
        const serverPath = path.join(workspacePath, 'fake-diagnostic-lsp.js');
        await fsp.writeFile(serverPath, `
let buffer = Buffer.alloc(0);
function send(message) {
  const body = JSON.stringify(message);
  process.stdout.write('Content-Length: ' + Buffer.byteLength(body, 'utf8') + '\\r\\n\\r\\n' + body);
}
function readMessages() {
  while (buffer.length) {
    const headerEnd = buffer.indexOf('\\r\\n\\r\\n');
    if (headerEnd < 0) {
      return;
    }
    const header = buffer.subarray(0, headerEnd).toString('utf8');
    const match = /Content-Length:\\s*(\\d+)/i.exec(header);
    if (!match) {
      process.exit(2);
    }
    const bodyStart = headerEnd + 4;
    const bodyEnd = bodyStart + Number(match[1]);
    if (buffer.length < bodyEnd) {
      return;
    }
    const message = JSON.parse(buffer.subarray(bodyStart, bodyEnd).toString('utf8'));
    buffer = buffer.subarray(bodyEnd);
    if (message.method === 'initialize') {
      send({
        jsonrpc: '2.0',
        id: message.id,
        result: {
          capabilities: {
            diagnosticProvider: {
              interFileDependencies: false,
              workspaceDiagnostics: false
            }
          }
        }
      });
    } else if (message.method === 'textDocument/diagnostic') {
      send({
        jsonrpc: '2.0',
        id: message.id,
        result: {
          kind: 'full',
          items: [
            {
              range: { start: { line: 0, character: 6 }, end: { line: 0, character: 12 } },
              severity: 2,
              code: 'CS0168',
              message: 'The variable is declared but never used.'
            }
          ]
        }
      });
    } else if (message.method === 'shutdown') {
      send({ jsonrpc: '2.0', id: message.id, result: null });
    } else if (message.method === 'exit') {
      process.exit(0);
    }
  }
}
process.stdin.on('data', chunk => {
  buffer = Buffer.concat([buffer, chunk]);
  readMessages();
});
`, 'utf8');
        const documentPath = path.join(workspacePath, 'Program.cs');
        const content = 'class Program { }';
        await fsp.writeFile(documentPath, content, 'utf8');
        const statuses = resolveCSharpLanguageServerAdapterStatuses({
            [CSHARP_LSP_COMMAND_ENV]: process.execPath,
            [CSHARP_LSP_ARGS_ENV]: `"${serverPath}"`,
            PATH: ''
        });
        const csharp = statuses.find(status => status.language === 'csharp');

        const result = await requestCSharpLanguageServerDiagnostics(csharp!, workspacePath, documentPath, content, 5000);

        expect(result.source).to.equal('language-server');
        expect(result.detail).to.contain('textDocument/diagnostic');
        expect(result.diagnostics).to.deep.equal([{
            path: documentPath,
            line: 1,
            column: 7,
            endLine: 1,
            endColumn: 13,
            severity: 'warning',
            code: 'CS0168',
            message: 'The variable is declared but never used.'
        }]);
    });

    it('requests workspace diagnostics from language servers that support workspace diagnostics', async function () {
        this.timeout(10000);
        const serverPath = path.join(workspacePath, 'fake-workspace-diagnostic-lsp.js');
        await fsp.writeFile(serverPath, `
let buffer = Buffer.alloc(0);
const { pathToFileURL } = require('url');
const path = require('path');
const programUri = pathToFileURL(path.join(process.cwd(), 'Program.cs')).toString();
const startupUri = pathToFileURL(path.join(process.cwd(), 'Startup.cs')).toString();
function send(message) {
  const body = JSON.stringify(message);
  process.stdout.write('Content-Length: ' + Buffer.byteLength(body, 'utf8') + '\\r\\n\\r\\n' + body);
}
function readMessages() {
  while (buffer.length) {
    const headerEnd = buffer.indexOf('\\r\\n\\r\\n');
    if (headerEnd < 0) {
      return;
    }
    const header = buffer.subarray(0, headerEnd).toString('utf8');
    const match = /Content-Length:\\s*(\\d+)/i.exec(header);
    if (!match) {
      process.exit(2);
    }
    const bodyStart = headerEnd + 4;
    const bodyEnd = bodyStart + Number(match[1]);
    if (buffer.length < bodyEnd) {
      return;
    }
    const message = JSON.parse(buffer.subarray(bodyStart, bodyEnd).toString('utf8'));
    buffer = buffer.subarray(bodyEnd);
    if (message.method === 'initialize') {
      send({
        jsonrpc: '2.0',
        id: message.id,
        result: {
          capabilities: {
            diagnosticProvider: {
              interFileDependencies: true,
              workspaceDiagnostics: true
            }
          }
        }
      });
    } else if (message.method === 'workspace/diagnostic') {
      send({
        jsonrpc: '2.0',
        id: message.id,
        result: {
          items: [
            {
              uri: programUri,
              kind: 'full',
              items: [
                {
                  range: { start: { line: 1, character: 4 }, end: { line: 1, character: 12 } },
                  severity: 1,
                  code: 'CS0103',
                  message: "The name 'missing' does not exist in the current context."
                }
              ],
              relatedDocuments: {
                [startupUri]: {
                  kind: 'full',
                  items: [
                    {
                      range: { start: { line: 3, character: 8 }, end: { line: 3, character: 16 } },
                      severity: 2,
                      code: 'CS0618',
                      message: 'Startup.Configure is obsolete.'
                    }
                  ]
                }
              }
            },
            {
              uri: startupUri,
              kind: 'unchanged'
            }
          ]
        }
      });
    } else if (message.method === 'shutdown') {
      send({ jsonrpc: '2.0', id: message.id, result: null });
    } else if (message.method === 'exit') {
      process.exit(0);
    }
  }
}
process.stdin.on('data', chunk => {
  buffer = Buffer.concat([buffer, chunk]);
  readMessages();
});
`, 'utf8');
        await fsp.writeFile(path.join(workspacePath, 'Program.cs'), 'class Program { }', 'utf8');
        await fsp.writeFile(path.join(workspacePath, 'Startup.cs'), 'class Startup { }', 'utf8');
        const statuses = resolveCSharpLanguageServerAdapterStatuses({
            [CSHARP_LSP_COMMAND_ENV]: process.execPath,
            [CSHARP_LSP_ARGS_ENV]: `"${serverPath}"`,
            PATH: ''
        });
        const csharp = statuses.find(status => status.language === 'csharp');

        const result = await requestCSharpLanguageServerWorkspaceDiagnostics(csharp!, workspacePath, 5000);

        expect(result.source).to.equal('language-server');
        expect(result.detail).to.contain('workspace/diagnostic');
        expect(result.diagnostics).to.deep.equal([
            {
                path: path.join(workspacePath, 'Program.cs'),
                line: 2,
                column: 5,
                endLine: 2,
                endColumn: 13,
                severity: 'error',
                code: 'CS0103',
                message: "The name 'missing' does not exist in the current context."
            },
            {
                path: path.join(workspacePath, 'Startup.cs'),
                line: 4,
                column: 9,
                endLine: 4,
                endColumn: 17,
                severity: 'warning',
                code: 'CS0618',
                message: 'Startup.Configure is obsolete.'
            }
        ]);
    });

    it('resolves lazy workspace symbols from configured language servers', async function () {
        this.timeout(10000);
        const serverPath = path.join(workspacePath, 'fake-workspace-symbol-lsp.js');
        await fsp.writeFile(serverPath, `
let buffer = Buffer.alloc(0);
const { pathToFileURL } = require('url');
const path = require('path');
const workspaceUri = pathToFileURL(path.join(process.cwd(), 'OrdersController.cs')).toString();
function send(message) {
  const body = JSON.stringify(message);
  process.stdout.write('Content-Length: ' + Buffer.byteLength(body, 'utf8') + '\\r\\n\\r\\n' + body);
}
function readMessages() {
  while (buffer.length) {
    const headerEnd = buffer.indexOf('\\r\\n\\r\\n');
    if (headerEnd < 0) {
      return;
    }
    const header = buffer.subarray(0, headerEnd).toString('utf8');
    const match = /Content-Length:\\s*(\\d+)/i.exec(header);
    if (!match) {
      process.exit(2);
    }
    const bodyStart = headerEnd + 4;
    const bodyEnd = bodyStart + Number(match[1]);
    if (buffer.length < bodyEnd) {
      return;
    }
    const message = JSON.parse(buffer.subarray(bodyStart, bodyEnd).toString('utf8'));
    buffer = buffer.subarray(bodyEnd);
    if (message.method === 'initialize') {
      send({
        jsonrpc: '2.0',
        id: message.id,
        result: {
          capabilities: {
            workspaceSymbolProvider: {
              resolveProvider: true
            }
          }
        }
      });
    } else if (message.method === 'workspace/symbol') {
      send({
        jsonrpc: '2.0',
        id: message.id,
        result: [
          {
            name: 'OrdersController',
            kind: 5,
            location: {
              uri: workspaceUri
            },
            containerName: 'Orders.Api',
            data: { id: 'orders-controller' }
          }
        ]
      });
    } else if (message.method === 'workspaceSymbol/resolve') {
      send({
        jsonrpc: '2.0',
        id: message.id,
        result: {
          ...message.params,
          location: {
            uri: message.params.location.uri,
            range: { start: { line: 2, character: 13 }, end: { line: 2, character: 29 } }
          }
        }
      });
    } else if (message.method === 'shutdown') {
      send({ jsonrpc: '2.0', id: message.id, result: null });
    } else if (message.method === 'exit') {
      process.exit(0);
    }
  }
}
process.stdin.on('data', chunk => {
  buffer = Buffer.concat([buffer, chunk]);
  readMessages();
});
`, 'utf8');
        const documentPath = path.join(workspacePath, 'OrdersController.cs');
        await fsp.writeFile(documentPath, 'public sealed class OrdersController { }', 'utf8');
        const statuses = resolveCSharpLanguageServerAdapterStatuses({
            [CSHARP_LSP_COMMAND_ENV]: process.execPath,
            [CSHARP_LSP_ARGS_ENV]: `"${serverPath}"`,
            PATH: ''
        });
        const csharp = statuses.find(status => status.language === 'csharp');

        const symbols = await requestCSharpLanguageServerWorkspaceSymbols(csharp!, workspacePath, 'Orders', 5000);
        const resolved = await requestCSharpLanguageServerResolveWorkspaceSymbol(csharp!, workspacePath, symbols.symbols[0], 5000);

        expect(symbols.source).to.equal('language-server');
        expect(symbols.symbols).to.deep.equal([{
            name: 'OrdersController',
            kind: 5,
            uri: symbols.symbols[0].uri,
            range: { line: 1, column: 1, endLine: 1, endColumn: 1 },
            containerName: 'Orders.Api',
            tags: undefined,
            data: { id: 'orders-controller' }
        }]);
        expect(resolved.source).to.equal('language-server');
        expect(resolved.detail).to.contain('workspaceSymbol/resolve');
        expect(resolved.symbol).to.deep.equal({
            name: 'OrdersController',
            kind: 5,
            uri: symbols.symbols[0].uri,
            range: { line: 3, column: 14, endLine: 3, endColumn: 30 },
            containerName: 'Orders.Api',
            tags: undefined,
            data: { id: 'orders-controller' }
        });
    });

    it('requests type hierarchy from configured language servers', async function () {
        this.timeout(10000);
        const serverPath = path.join(workspacePath, 'fake-type-hierarchy-lsp.js');
        await fsp.writeFile(serverPath, `
let buffer = Buffer.alloc(0);
function send(message) {
  const body = JSON.stringify(message);
  process.stdout.write('Content-Length: ' + Buffer.byteLength(body, 'utf8') + '\\r\\n\\r\\n' + body);
}
function readMessages() {
  while (buffer.length) {
    const headerEnd = buffer.indexOf('\\r\\n\\r\\n');
    if (headerEnd < 0) {
      return;
    }
    const header = buffer.subarray(0, headerEnd).toString('utf8');
    const match = /Content-Length:\\s*(\\d+)/i.exec(header);
    if (!match) {
      process.exit(2);
    }
    const bodyStart = headerEnd + 4;
    const bodyEnd = bodyStart + Number(match[1]);
    if (buffer.length < bodyEnd) {
      return;
    }
    const message = JSON.parse(buffer.subarray(bodyStart, bodyEnd).toString('utf8'));
    buffer = buffer.subarray(bodyEnd);
    if (message.method === 'initialize') {
      send({
        jsonrpc: '2.0',
        id: message.id,
        result: {
          capabilities: {
            typeHierarchyProvider: true
          }
        }
      });
    } else if (message.method === 'textDocument/prepareTypeHierarchy') {
      send({
        jsonrpc: '2.0',
        id: message.id,
        result: [
          {
            name: 'OrdersController',
            detail: 'controller',
            kind: 5,
            uri: message.params.textDocument.uri,
            range: { start: { line: 0, character: 0 }, end: { line: 4, character: 1 } },
            selectionRange: { start: { line: 0, character: 13 }, end: { line: 0, character: 29 } },
            data: { id: 'orders-controller' }
          }
        ]
      });
    } else if (message.method === 'typeHierarchy/supertypes') {
      send({
        jsonrpc: '2.0',
        id: message.id,
        result: [
          {
            name: 'ControllerBase',
            detail: 'base class',
            kind: 5,
            uri: message.params.item.uri,
            range: { start: { line: 7, character: 0 }, end: { line: 9, character: 1 } },
            selectionRange: { start: { line: 7, character: 13 }, end: { line: 7, character: 27 } },
            data: { id: 'controller-base' }
          }
        ]
      });
    } else if (message.method === 'typeHierarchy/subtypes') {
      send({
        jsonrpc: '2.0',
        id: message.id,
        result: [
          {
            name: 'SpecialOrdersController',
            detail: 'derived controller',
            kind: 5,
            uri: message.params.item.uri,
            range: { start: { line: 11, character: 0 }, end: { line: 13, character: 1 } },
            selectionRange: { start: { line: 11, character: 13 }, end: { line: 11, character: 36 } },
            data: { id: 'special-orders-controller' }
          }
        ]
      });
    } else if (message.method === 'shutdown') {
      send({ jsonrpc: '2.0', id: message.id, result: null });
    } else if (message.method === 'exit') {
      process.exit(0);
    }
  }
}
process.stdin.on('data', chunk => {
  buffer = Buffer.concat([buffer, chunk]);
  readMessages();
});
`, 'utf8');
        const documentPath = path.join(workspacePath, 'OrdersController.cs');
        const content = 'public sealed class OrdersController : ControllerBase { }';
        await fsp.writeFile(documentPath, content, 'utf8');
        const statuses = resolveCSharpLanguageServerAdapterStatuses({
            [CSHARP_LSP_COMMAND_ENV]: process.execPath,
            [CSHARP_LSP_ARGS_ENV]: `"${serverPath}"`,
            PATH: ''
        });
        const csharp = statuses.find(status => status.language === 'csharp');

        const prepare = await requestCSharpLanguageServerPrepareTypeHierarchy(csharp!, workspacePath, documentPath, content, { line: 1, column: 15 }, 5000);
        const supertypes = await requestCSharpLanguageServerTypeHierarchySupertypes(csharp!, workspacePath, documentPath, prepare.items[0], 5000);
        const subtypes = await requestCSharpLanguageServerTypeHierarchySubtypes(csharp!, workspacePath, documentPath, prepare.items[0], 5000);

        expect(prepare.source).to.equal('language-server');
        expect(prepare.detail).to.contain('textDocument/prepareTypeHierarchy');
        expect(prepare.items).to.deep.equal([{
            name: 'OrdersController',
            detail: 'controller',
            kind: 5,
            uri: prepare.items[0].uri,
            range: { line: 1, column: 1, endLine: 5, endColumn: 2 },
            selectionRange: { line: 1, column: 14, endLine: 1, endColumn: 30 },
            tags: undefined,
            data: { id: 'orders-controller' }
        }]);
        expect(supertypes.source).to.equal('language-server');
        expect(supertypes.detail).to.contain('typeHierarchy/supertypes');
        expect(supertypes.items.map(item => ({
            name: item.name,
            detail: item.detail,
            range: item.range,
            selectionRange: item.selectionRange,
            data: item.data
        }))).to.deep.equal([{
            name: 'ControllerBase',
            detail: 'base class',
            range: { line: 8, column: 1, endLine: 10, endColumn: 2 },
            selectionRange: { line: 8, column: 14, endLine: 8, endColumn: 28 },
            data: { id: 'controller-base' }
        }]);
        expect(subtypes.source).to.equal('language-server');
        expect(subtypes.detail).to.contain('typeHierarchy/subtypes');
        expect(subtypes.items.map(item => ({
            name: item.name,
            detail: item.detail,
            range: item.range,
            selectionRange: item.selectionRange,
            data: item.data
        }))).to.deep.equal([{
            name: 'SpecialOrdersController',
            detail: 'derived controller',
            range: { line: 12, column: 1, endLine: 14, endColumn: 2 },
            selectionRange: { line: 12, column: 14, endLine: 12, endColumn: 37 },
            data: { id: 'special-orders-controller' }
        }]);
    });

    it('requests editor language features and edit-backed actions from configured language servers', async function () {
        this.timeout(10000);
        const serverPath = path.join(workspacePath, 'fake-editor-lsp.js');
        await fsp.writeFile(serverPath, `
let buffer = Buffer.alloc(0);
let openedUri = '';
let closedUri = '';
let pendingExecuteCommandMessage;
let pendingCompletionMessage;
let configurationResponse;
let workspaceFoldersResponse;
let registerResponse;
let unregisterResponse;
let progressCreateResponse;
let semanticTokensRefreshResponse;
let codeLensRefreshResponse;
let inlayHintRefreshResponse;
let inlineValueRefreshResponse;
let inlineCompletionRefreshResponse;
let diagnosticRefreshResponse;
let showDocumentResponse;
const { pathToFileURL } = require('url');
const path = require('path');
const workspaceUri = pathToFileURL(path.join(process.cwd(), 'OrdersController.cs')).toString();
function send(message) {
  const body = JSON.stringify(message);
  process.stdout.write('Content-Length: ' + Buffer.byteLength(body, 'utf8') + '\\r\\n\\r\\n' + body);
}
function hasClientRequestResponses() {
  return configurationResponse !== undefined
    && workspaceFoldersResponse !== undefined
    && registerResponse !== undefined
    && unregisterResponse !== undefined
    && progressCreateResponse !== undefined
    && semanticTokensRefreshResponse !== undefined
    && codeLensRefreshResponse !== undefined
    && inlayHintRefreshResponse !== undefined
    && inlineValueRefreshResponse !== undefined
    && inlineCompletionRefreshResponse !== undefined
    && diagnosticRefreshResponse !== undefined
    && showDocumentResponse !== undefined;
}
function sendCompletion(message) {
  send({
    jsonrpc: '2.0',
    id: message.id,
    result: {
      isIncomplete: false,
      itemDefaults: {
        commitCharacters: [';', ')'],
        editRange: {
          insert: { start: { line: 0, character: 7 }, end: { line: 0, character: 13 } },
          replace: { start: { line: 0, character: 7 }, end: { line: 0, character: 19 } }
        },
        insertTextFormat: 2,
        data: { source: 'completion-list-defaults' }
      },
      items: [
        {
          label: 'OrdersController',
          kind: 7,
          insertTextFormat: 1,
          detail: 'controller class',
          documentation: { kind: 'markdown', value: 'ASP.NET controller completion' },
          textEdit: {
            range: { start: { line: 0, character: 13 }, end: { line: 0, character: 19 } },
            newText: 'OrdersController'
          },
          data: {
            configurationResponse,
            workspaceFoldersResponse,
            registerResponse,
            unregisterResponse,
            progressCreateResponse,
            semanticTokensRefreshResponse,
            codeLensRefreshResponse,
            inlayHintRefreshResponse,
            inlineValueRefreshResponse,
            inlineCompletionRefreshResponse,
            diagnosticRefreshResponse,
            showDocumentResponse,
            completionContext: message.params.context
          }
        },
        {
          label: 'Get',
          kind: 2,
          insertTextFormat: 1,
          insertText: 'Get()',
          data: { id: 'get-completion' }
        },
        {
          label: 'ListOrders',
          kind: 2,
          insertText: 'ListOrders($0)'
        }
      ]
    }
  });
}
function flushPendingCompletion() {
  if (pendingCompletionMessage && hasClientRequestResponses()) {
    sendCompletion(pendingCompletionMessage);
    pendingCompletionMessage = undefined;
  }
}
function readMessages() {
  while (buffer.length) {
    const headerEnd = buffer.indexOf('\\r\\n\\r\\n');
    if (headerEnd < 0) {
      return;
    }
    const header = buffer.subarray(0, headerEnd).toString('utf8');
    const match = /Content-Length:\\s*(\\d+)/i.exec(header);
    if (!match) {
      process.exit(2);
    }
    const bodyStart = headerEnd + 4;
    const bodyEnd = bodyStart + Number(match[1]);
    if (buffer.length < bodyEnd) {
      return;
    }
    const message = JSON.parse(buffer.subarray(bodyStart, bodyEnd).toString('utf8'));
    buffer = buffer.subarray(bodyEnd);
    if (message.id === 70) {
      configurationResponse = message.result;
      flushPendingCompletion();
    } else if (message.id === 71) {
      workspaceFoldersResponse = message.result;
      flushPendingCompletion();
    } else if (message.id === 72) {
      registerResponse = message.result;
      flushPendingCompletion();
    } else if (message.id === 73) {
      progressCreateResponse = message.result;
      flushPendingCompletion();
    } else if (message.id === 74) {
      semanticTokensRefreshResponse = message.result;
      flushPendingCompletion();
    } else if (message.id === 75) {
      codeLensRefreshResponse = message.result;
      flushPendingCompletion();
    } else if (message.id === 76) {
      inlayHintRefreshResponse = message.result;
      flushPendingCompletion();
    } else if (message.id === 77) {
      inlineValueRefreshResponse = message.result;
      flushPendingCompletion();
    } else if (message.id === 78) {
      inlineCompletionRefreshResponse = message.result;
      flushPendingCompletion();
    } else if (message.id === 79) {
      diagnosticRefreshResponse = message.result;
      flushPendingCompletion();
    } else if (message.id === 80) {
      showDocumentResponse = message.result;
      flushPendingCompletion();
    } else if (message.id === 81) {
      unregisterResponse = message.result;
      flushPendingCompletion();
    } else if (message.id === 99 && pendingExecuteCommandMessage) {
      send({
        jsonrpc: '2.0',
        id: pendingExecuteCommandMessage.id,
        result: {
          command: pendingExecuteCommandMessage.params.command,
          arguments: pendingExecuteCommandMessage.params.arguments,
          openedUri,
          applyEditResponse: message.result
        }
      });
      pendingExecuteCommandMessage = undefined;
    } else if (message.method === 'initialize') {
      send({
        jsonrpc: '2.0',
        id: message.id,
        result: {
          capabilities: {
            completionProvider: { triggerCharacters: ['.'] },
            signatureHelpProvider: { triggerCharacters: ['(', ','] },
            inlineCompletionProvider: true,
            hoverProvider: true,
            documentLinkProvider: { resolveProvider: true },
            documentHighlightProvider: true,
            selectionRangeProvider: true,
            foldingRangeProvider: true,
            declarationProvider: true,
            definitionProvider: true,
            implementationProvider: true,
            typeDefinitionProvider: true,
            callHierarchyProvider: true,
            workspaceSymbolProvider: true,
            referencesProvider: true,
            renameProvider: { prepareProvider: true },
            newSymbolNamesProvider: { supportsAutomaticTriggerKind: true },
            documentFormattingProvider: true,
            documentRangeFormattingProvider: true,
            documentRangesFormattingProvider: true,
            documentOnTypeFormattingProvider: {
              firstTriggerCharacter: '}',
              moreTriggerCharacter: [';', '\\n']
            },
            inlayHintProvider: { resolveProvider: true },
            evaluatableExpressionProvider: true,
            inlineValueProvider: true,
            linkedEditingRangeProvider: true,
            monikerProvider: true,
            semanticTokensProvider: {
              legend: {
                tokenTypes: ['class', 'method', 'customToken'],
                tokenModifiers: ['declaration', 'static', 'customModifier']
              },
              full: { delta: true },
              range: true
            },
            codeActionProvider: {
              resolveProvider: true,
              codeActionKinds: ['quickfix', 'refactor', 'source.organizeImports']
            },
            executeCommandProvider: {
              commands: ['csharp.applyExternalRefactor']
            },
            codeLensProvider: { resolveProvider: true },
            colorProvider: true
          }
        }
      });
    } else if (message.method === 'initialized') {
      send({
        jsonrpc: '2.0',
        id: 70,
        method: 'workspace/configuration',
        params: {
          items: [{ section: 'csharp' }]
        }
      });
      send({
        jsonrpc: '2.0',
        id: 71,
        method: 'workspace/workspaceFolders',
        params: null
      });
      send({
        jsonrpc: '2.0',
        id: 72,
        method: 'client/registerCapability',
        params: {
          registrations: []
        }
      });
      send({
        jsonrpc: '2.0',
        id: 73,
        method: 'window/workDoneProgress/create',
        params: {
          token: 'cv-progress'
        }
      });
      send({
        jsonrpc: '2.0',
        id: 74,
        method: 'workspace/semanticTokens/refresh',
        params: null
      });
      send({
        jsonrpc: '2.0',
        id: 75,
        method: 'workspace/codeLens/refresh',
        params: null
      });
      send({
        jsonrpc: '2.0',
        id: 76,
        method: 'workspace/inlayHint/refresh',
        params: null
      });
      send({
        jsonrpc: '2.0',
        id: 77,
        method: 'workspace/inlineValue/refresh',
        params: null
      });
      send({
        jsonrpc: '2.0',
        id: 78,
        method: 'workspace/inlineCompletion/refresh',
        params: null
      });
      send({
        jsonrpc: '2.0',
        id: 79,
        method: 'workspace/diagnostic/refresh',
        params: null
      });
      send({
        jsonrpc: '2.0',
        id: 80,
        method: 'window/showDocument',
        params: {
          uri: workspaceUri,
          external: false,
          takeFocus: false
        }
      });
      send({
        jsonrpc: '2.0',
        id: 81,
        method: 'client/unregisterCapability',
        params: {
          unregisterations: []
        }
      });
    } else if (message.method === 'workspace/symbol') {
      send({
        jsonrpc: '2.0',
        id: message.id,
        result: [
          {
            name: 'OrdersController',
            kind: 5,
            location: {
              uri: workspaceUri,
              range: { start: { line: 0, character: 13 }, end: { line: 0, character: 29 } }
            },
            containerName: 'Orders.Api',
            tags: [1],
            data: { id: 'orders-controller' }
          },
          {
            name: 'Get',
            kind: 6,
            uri: workspaceUri,
            range: { start: { line: 2, character: 18 }, end: { line: 2, character: 21 } },
            containerName: 'OrdersController'
          }
        ].filter(symbol => symbol.name.toLowerCase().includes(String(message.params.query || '').toLowerCase()))
      });
    } else if (message.method === 'textDocument/didOpen') {
      openedUri = message.params.textDocument.uri;
      send({
        jsonrpc: '2.0',
        method: 'textDocument/publishDiagnostics',
        params: {
          uri: openedUri,
          diagnostics: [
            {
              range: { start: { line: 0, character: 13 }, end: { line: 0, character: 29 } },
              severity: 1,
              code: 'CS0103',
              source: 'csharp-ls',
              message: "The name 'OrdersController' does not exist in the current context."
            }
          ]
        }
      });
    } else if (message.method === 'textDocument/didClose') {
      closedUri = message.params.textDocument.uri;
    } else if (message.method === 'textDocument/completion') {
      if (hasClientRequestResponses()) {
        sendCompletion(message);
      } else {
        pendingCompletionMessage = message;
      }
    } else if (message.method === 'completionItem/resolve') {
      send({
        jsonrpc: '2.0',
        id: message.id,
        result: {
          ...message.params,
          detail: 'resolved controller action',
          documentation: { kind: 'markdown', value: 'Resolved Get completion docs' },
          additionalTextEdits: [
            {
              range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
              newText: 'using Microsoft.AspNetCore.Mvc;\\n'
            }
          ],
          command: {
            title: 'Trigger parameter hints',
            command: 'editor.action.triggerParameterHints'
          }
        }
      });
    } else if (message.method === 'textDocument/inlineCompletion') {
      send({
        jsonrpc: '2.0',
        id: message.id,
        result: {
          suppressSuggestions: message.params.context.triggerKind === 1,
          items: [
            {
              insertText: ' => new Order(' + message.params.position.character + ')',
              range: { start: { line: 2, character: 21 }, end: { line: 2, character: 21 } },
              filterText: 'new Order',
              additionalTextEdits: [
                {
                  range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
                  newText: 'using Orders.Domain;\\n'
                }
              ],
              command: {
                title: 'Track inline completion',
                command: 'csharp.trackInlineCompletion',
                arguments: [message.params.context.selectedSuggestionInfo?.text || 'none']
              },
              completeBracketPairs: true
            },
            {
              insertText: {
                snippet: 'Get(\${1:id})'
              },
              range: { start: { line: 2, character: 18 }, end: { line: 2, character: 21 } }
            },
            {
              text: ''
            }
          ]
        }
      });
    } else if (message.method === 'textDocument/evaluatableExpression') {
      send({
        jsonrpc: '2.0',
        id: message.id,
        result: {
          range: { start: { line: 0, character: 13 }, end: { line: 0, character: 29 } },
          expression: 'OrdersController.FromDebugger(' + message.params.position.character + ')'
        }
      });
    } else if (message.method === 'textDocument/signatureHelp') {
      const context = message.params.context ?? {};
      send({
        jsonrpc: '2.0',
        id: message.id,
        result: {
          signatures: [
            {
              label: 'Get(int id, string region)',
              documentation: { kind: 'markdown', value: 'Finds an order. trigger=' + (context.triggerKind || 'none') + ' char=' + (context.triggerCharacter || 'none') + ' retrigger=' + (context.isRetrigger ? 'yes' : 'no') },
              parameters: [
                { label: [4, 10] },
                { label: 'string region' }
              ]
            }
          ],
          activeSignature: 0,
          activeParameter: 1
        }
      });
    } else if (message.method === 'textDocument/hover') {
      send({
        jsonrpc: '2.0',
        id: message.id,
        result: {
          contents: { kind: 'markdown', value: '**OrdersController**\\n\\nASP.NET controller' },
          range: { start: { line: 0, character: 13 }, end: { line: 0, character: 29 } }
        }
      });
    } else if (message.method === 'textDocument/documentLink') {
      send({
        jsonrpc: '2.0',
        id: message.id,
        result: [
          {
            range: { start: { line: 0, character: 7 }, end: { line: 0, character: 19 } },
            target: 'https://learn.microsoft.com/dotnet/csharp/',
            tooltip: 'C# language reference'
          },
          {
            range: { start: { line: 1, character: 21 }, end: { line: 1, character: 31 } },
            tooltip: 'Unresolved C# docs link',
            data: { id: 'resolved-doc-link' }
          }
        ]
      });
    } else if (message.method === 'documentLink/resolve') {
      send({
        jsonrpc: '2.0',
        id: message.id,
        result: {
          range: message.params.range,
          target: 'https://learn.microsoft.com/dotnet/csharp/resolved',
          tooltip: 'Resolved C# docs link',
          data: message.params.data
        }
      });
    } else if (message.method === 'textDocument/documentColor') {
      send({
        jsonrpc: '2.0',
        id: message.id,
        result: [
          {
            range: { start: { line: 0, character: 24 }, end: { line: 0, character: 31 } },
            color: { red: 0.2, green: 0.4, blue: 0.6, alpha: 1 }
          },
          {
            range: { start: { line: 1, character: 10 }, end: { line: 1, character: 17 } },
            color: { red: 1.2, green: -0.2, blue: 0.5, alpha: 0.75 }
          }
        ]
      });
    } else if (message.method === 'textDocument/colorPresentation') {
      send({
        jsonrpc: '2.0',
        id: message.id,
        result: [
          {
            label: '#336699',
            textEdit: {
              range: message.params.range,
              newText: '#336699'
            }
          },
          {
            label: 'rgba(51, 102, 153, 1)',
            additionalTextEdits: [
              {
                range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
                newText: '/* color */ '
              }
            ]
          }
        ]
      });
    } else if (message.method === 'textDocument/codeLens') {
      send({
        jsonrpc: '2.0',
        id: message.id,
        result: [
          {
            range: { start: { line: 0, character: 13 }, end: { line: 0, character: 29 } },
            command: {
              title: '2 references',
              command: 'editor.action.showReferences',
              arguments: [openedUri]
            },
            data: { id: 'orders-references' }
          },
          {
            range: { start: { line: 2, character: 18 }, end: { line: 2, character: 21 } },
            data: { id: 'orders-test' }
          }
        ]
      });
    } else if (message.method === 'codeLens/resolve') {
      send({
        jsonrpc: '2.0',
        id: message.id,
        result: {
          range: message.params.range,
          command: {
            title: 'Run test',
            command: 'cybervinci.csharpKit.runTest',
            arguments: ['OrdersController.Get']
          },
          data: message.params.data
        }
      });
    } else if (message.method === 'textDocument/linkedEditingRange') {
      send({
        jsonrpc: '2.0',
        id: message.id,
        result: {
          ranges: [
            { start: { line: 0, character: 1 }, end: { line: 0, character: 7 } },
            { start: { line: 2, character: 2 }, end: { line: 2, character: 8 } }
          ],
          wordPattern: '[A-Za-z_][A-Za-z0-9_]*'
        }
      });
    } else if (message.method === 'textDocument/moniker') {
      send({
        jsonrpc: '2.0',
        id: message.id,
        result: [
          {
            scheme: 'csharp',
            identifier: 'Orders.Api.OrdersController',
            unique: 'project',
            kind: 'export'
          },
          {
            scheme: 'metadata',
            identifier: 'M:Orders.Api.OrdersController.Get',
            unique: 'global'
          },
          {
            scheme: 'invalid',
            identifier: 'missing-unique'
          }
        ]
      });
    } else if (message.method === 'textDocument/inlineValue') {
      send({
        jsonrpc: '2.0',
        id: message.id,
        result: [
          {
            range: { start: { line: 0, character: 13 }, end: { line: 0, character: 29 } },
            text: 'frame=' + message.params.context.frameId + ' stopped=' + message.params.context.stoppedLocation.start.line
          },
          {
            range: { start: { line: 2, character: 18 }, end: { line: 2, character: 21 } },
            variableName: 'orderId',
            caseSensitiveLookup: true
          },
          {
            range: { start: { line: 3, character: 15 }, end: { line: 3, character: 31 } },
            expression: 'this.CurrentOrder.Total'
          },
          {
            range: { start: { line: 4, character: 8 }, end: { line: 4, character: 24 } },
            caseSensitiveLookup: false
          },
          {
            text: 'missing range'
          }
        ]
      });
    } else if (message.method === 'textDocument/semanticTokens/full/delta') {
      send({
        jsonrpc: '2.0',
        id: message.id,
        result: {
          resultId: 'semantic-2-' + message.params.previousResultId,
          edits: [
            {
              start: 5,
              deleteCount: 5,
              data: [0, 13, 16, 0, 1]
            },
            {
              start: 15,
              deleteCount: 0
            }
          ]
        }
      });
    } else if (message.method === 'textDocument/semanticTokens/full') {
      send({
        jsonrpc: '2.0',
        id: message.id,
        result: {
          resultId: 'semantic-1',
          data: [
            0, 13, 16, 0, 1,
            2, 18, 3, 1, 2,
            0, 4, 5, 2, 4
          ]
        }
      });
    } else if (message.method === 'textDocument/semanticTokens/range') {
      send({
        jsonrpc: '2.0',
        id: message.id,
        result: {
          resultId: 'semantic-range-1',
          data: [
            0, 2, 9, 0, 3,
            1, 4, 4, 1, 1
          ]
        }
      });
    } else if (message.method === 'textDocument/documentHighlight') {
      send({
        jsonrpc: '2.0',
        id: message.id,
        result: [
          {
            range: { start: { line: 0, character: 13 }, end: { line: 0, character: 29 } },
            kind: 1
          },
          {
            range: { start: { line: 2, character: 18 }, end: { line: 2, character: 34 } },
            kind: 2
          },
          {
            range: { start: { line: 4, character: 8 }, end: { line: 4, character: 24 } },
            kind: 3
          }
        ]
      });
    } else if (message.method === 'textDocument/selectionRange') {
      send({
        jsonrpc: '2.0',
        id: message.id,
        result: [
          {
            range: { start: { line: 0, character: 13 }, end: { line: 0, character: 29 } },
            parent: {
              range: { start: { line: 0, character: 0 }, end: { line: 0, character: 39 } }
            }
          },
          {
            range: { start: { line: 2, character: 18 }, end: { line: 2, character: 34 } },
            parent: {
              range: { start: { line: 2, character: 4 }, end: { line: 2, character: 45 } }
            }
          }
        ]
      });
    } else if (message.method === 'textDocument/foldingRange') {
      send({
        jsonrpc: '2.0',
        id: message.id,
        result: [
          { startLine: 0, endLine: 5, kind: 'region' },
          { startLine: 1, endLine: 2, kind: 'comment' },
          { startLine: 6, endLine: 8, kind: 'imports' },
          { startLine: 10, endLine: 10, kind: 'unknown' }
        ]
      });
    } else if (message.method === 'textDocument/definition') {
      send({
        jsonrpc: '2.0',
        id: message.id,
        result: [
          {
            targetUri: openedUri,
            targetRange: { start: { line: 0, character: 0 }, end: { line: 5, character: 1 } },
            targetSelectionRange: { start: { line: 0, character: 13 }, end: { line: 0, character: 29 } }
          }
        ]
      });
    } else if (message.method === 'textDocument/declaration') {
      send({
        jsonrpc: '2.0',
        id: message.id,
        result: [
          {
            uri: openedUri,
            range: { start: { line: 13, character: 4 }, end: { line: 15, character: 5 } }
          }
        ]
      });
    } else if (message.method === 'textDocument/implementation') {
      send({
        jsonrpc: '2.0',
        id: message.id,
        result: [
          {
            uri: openedUri,
            range: { start: { line: 6, character: 4 }, end: { line: 8, character: 5 } }
          }
        ]
      });
    } else if (message.method === 'textDocument/typeDefinition') {
      send({
        jsonrpc: '2.0',
        id: message.id,
        result: [
          {
            targetUri: openedUri,
            targetRange: { start: { line: 9, character: 0 }, end: { line: 12, character: 1 } },
            targetSelectionRange: { start: { line: 9, character: 13 }, end: { line: 9, character: 19 } }
          }
        ]
      });
    } else if (message.method === 'textDocument/prepareCallHierarchy') {
      send({
        jsonrpc: '2.0',
        id: message.id,
        result: [
          {
            name: 'OrdersController.Get',
            kind: 6,
            uri: openedUri,
            range: { start: { line: 2, character: 4 }, end: { line: 4, character: 5 } },
            selectionRange: { start: { line: 2, character: 18 }, end: { line: 2, character: 21 } },
            detail: 'Orders API action',
            tags: [1],
            data: { id: 'orders-get' }
          }
        ]
      });
    } else if (message.method === 'callHierarchy/incomingCalls') {
      const itemUri = message.params.item.uri || openedUri;
      send({
        jsonrpc: '2.0',
        id: message.id,
        result: [
          {
            from: {
              name: 'OrdersController.Index',
              kind: 6,
              uri: itemUri,
              range: { start: { line: 6, character: 4 }, end: { line: 8, character: 5 } },
              selectionRange: { start: { line: 6, character: 18 }, end: { line: 6, character: 23 } },
              detail: 'Calls Get',
              data: { id: 'orders-index' }
            },
            fromRanges: [
              { start: { line: 7, character: 11 }, end: { line: 7, character: 14 } }
            ]
          }
        ]
      });
    } else if (message.method === 'callHierarchy/outgoingCalls') {
      const itemUri = message.params.item.uri || openedUri;
      send({
        jsonrpc: '2.0',
        id: message.id,
        result: [
          {
            to: {
              name: 'OrderRepository.Find',
              kind: 6,
              uri: itemUri,
              range: { start: { line: 17, character: 4 }, end: { line: 19, character: 5 } },
              selectionRange: { start: { line: 17, character: 27 }, end: { line: 17, character: 31 } },
              detail: 'Repository lookup',
              data: { id: 'repository-find' }
            },
            fromRanges: [
              { start: { line: 3, character: 15 }, end: { line: 3, character: 19 } }
            ]
          }
        ]
      });
    } else if (message.method === 'textDocument/references') {
      send({
        jsonrpc: '2.0',
        id: message.id,
        result: [
          {
            uri: openedUri,
            range: { start: { line: 0, character: 13 }, end: { line: 0, character: 29 } }
          },
          {
            uri: openedUri,
            range: { start: { line: 2, character: 18 }, end: { line: 2, character: 34 } }
          }
        ]
      });
    } else if (message.method === 'textDocument/prepareRename') {
      send({
        jsonrpc: '2.0',
        id: message.id,
        result: {
          range: { start: { line: 0, character: 13 }, end: { line: 0, character: 29 } },
          placeholder: 'OrdersController'
        }
      });
    } else if (message.method === 'textDocument/newSymbolNames') {
      send({
        jsonrpc: '2.0',
        id: message.id,
        result: [
          {
            newSymbolName: 'CustomersController' + message.params.triggerKind,
            tags: [1]
          },
          {
            name: 'OrdersEndpoint' + message.params.range.start.character
          },
          '',
          {
            newSymbolName: ''
          }
        ]
      });
    } else if (message.method === 'textDocument/rename') {
      send({
        jsonrpc: '2.0',
        id: message.id,
        result: {
          changes: {
            [openedUri]: [
              {
                range: { start: { line: 0, character: 13 }, end: { line: 0, character: 29 } },
                newText: message.params.newName
              },
              {
                range: { start: { line: 2, character: 18 }, end: { line: 2, character: 34 } },
                newText: ''
              }
            ]
          },
          documentChanges: [
            {
              textDocument: { uri: openedUri, version: null },
              edits: [
                {
                  range: { start: { line: 4, character: 8 }, end: { line: 4, character: 24 } },
                  newText: message.params.newName + 'Async'
                }
              ]
            },
            {
              kind: 'rename',
              oldUri: openedUri,
              newUri: openedUri
            }
          ]
        }
      });
    } else if (message.method === 'textDocument/formatting') {
      send({
        jsonrpc: '2.0',
        id: message.id,
        result: [
          {
            range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
            newText: '// formatted tabSize=' + message.params.options.tabSize + ' insertSpaces=' + message.params.options.insertSpaces + '\\n'
          }
        ]
      });
    } else if (message.method === 'textDocument/rangeFormatting') {
      send({
        jsonrpc: '2.0',
        id: message.id,
        result: [
          {
            range: message.params.range,
            newText: '// range formatted tabSize=' + message.params.options.tabSize + ' insertSpaces=' + message.params.options.insertSpaces
          }
        ]
      });
    } else if (message.method === 'textDocument/rangesFormatting') {
      send({
        jsonrpc: '2.0',
        id: message.id,
        result: message.params.ranges.map((range, index) => ({
          range,
          newText: '// ranges formatted #' + index + ' tabSize=' + message.params.options.tabSize + ' insertSpaces=' + message.params.options.insertSpaces
        }))
      });
    } else if (message.method === 'textDocument/onTypeFormatting') {
      send({
        jsonrpc: '2.0',
        id: message.id,
        result: [
          {
            range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
            newText: '// on type ' + message.params.ch + ' tabSize=' + message.params.options.tabSize + ' insertSpaces=' + message.params.options.insertSpaces + '\\n'
          }
        ]
      });
    } else if (message.method === 'textDocument/inlayHint') {
      send({
        jsonrpc: '2.0',
        id: message.id,
        result: [
          {
            position: { line: 0, character: 32 },
            label: ': OrdersController',
            kind: 1,
            tooltip: { kind: 'markdown', value: 'Inferred controller type' },
            paddingLeft: true
          },
          {
            position: { line: 2, character: 22 },
            label: [{ label: 'id' }, { label: ': ' }],
            kind: 2,
            textEdits: [
              {
                range: { start: { line: 2, character: 18 }, end: { line: 2, character: 18 } },
                newText: 'id: '
              }
            ],
            paddingRight: true,
            data: { id: 'parameter-id-hint' }
          }
        ]
      });
    } else if (message.method === 'inlayHint/resolve') {
      send({
        jsonrpc: '2.0',
        id: message.id,
        result: {
          position: message.params.position,
          label: 'id: ',
          kind: 2,
          tooltip: 'Resolved parameter name',
          textEdits: [
            {
              range: { start: { line: 2, character: 18 }, end: { line: 2, character: 18 } },
              newText: 'resolvedId: '
            }
          ],
          paddingRight: true,
          data: message.params.data
        }
      });
    } else if (message.method === 'textDocument/codeAction') {
      send({
        jsonrpc: '2.0',
        id: message.id,
        result: [
          {
            title: 'Use CustomersController',
            kind: 'quickfix',
            isPreferred: true,
            data: {
              diagnosticCodes: message.params.context.diagnostics.map(diagnostic => diagnostic.code)
            },
            edit: {
              changes: {
                [openedUri]: [
                  {
                    range: message.params.range,
                    newText: 'CustomersController'
                  }
                ]
              }
            }
          },
          {
            title: 'Organize imports',
            kind: 'source.organizeImports',
            edit: {
              documentChanges: [
                {
                  textDocument: { uri: openedUri, version: null },
                  edits: [
                    {
                      range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
                      newText: 'using System;\\n'
                    }
                  ]
                }
              ]
            }
          },
          {
            title: 'External server command',
            kind: 'refactor',
            command: {
              title: 'External server command',
              command: 'csharp.applyExternalRefactor'
            }
          },
          {
            title: 'Add missing using',
            kind: 'quickfix',
            data: { id: 'missing-using' }
          }
        ]
      });
    } else if (message.method === 'codeAction/resolve') {
      send({
        jsonrpc: '2.0',
        id: message.id,
        result: {
          title: message.params.title,
          kind: message.params.kind,
          edit: {
            changes: {
              [openedUri]: [
                {
                  range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
                  newText: 'using System.Linq;\\n'
                }
              ]
            }
          },
          data: message.params.data
        }
      });
    } else if (message.method === 'workspace/executeCommand') {
      pendingExecuteCommandMessage = message;
      send({
        jsonrpc: '2.0',
        id: 99,
        method: 'workspace/applyEdit',
        params: {
          label: 'Apply external refactor',
          edit: {
            changes: {
              [openedUri]: [
                {
                  range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
                  newText: 'using External.Refactor;\\n'
                }
              ]
            }
          }
        }
      });
    } else if (message.method === 'shutdown') {
      if (openedUri && closedUri !== openedUri) {
        process.stderr.write('missing textDocument/didClose before shutdown\\n');
      }
      send({ jsonrpc: '2.0', id: message.id, result: null });
    } else if (message.method === 'exit') {
      process.exit(0);
    }
  }
}
process.stdin.on('data', chunk => {
  buffer = Buffer.concat([buffer, chunk]);
  readMessages();
});
`, 'utf8');
        const documentPath = path.join(workspacePath, 'OrdersController.cs');
        const content = 'public sealed class OrdersController { }';
        await fsp.writeFile(documentPath, content, 'utf8');
        const statuses = resolveCSharpLanguageServerAdapterStatuses({
            [CSHARP_LSP_COMMAND_ENV]: process.execPath,
            [CSHARP_LSP_ARGS_ENV]: `"${serverPath}"`,
            PATH: ''
        });
        const csharp = statuses.find(status => status.language === 'csharp');

        const lspDiagnostics = await requestCSharpLanguageServerDiagnostics(csharp!, workspacePath, documentPath, content, 5000);
        const completions = await requestCSharpLanguageServerCompletions(csharp!, workspacePath, documentPath, content, { line: 1, column: 15 }, 5000, {
            triggerKind: 'trigger-character',
            triggerCharacter: '.'
        });
        const resolvedCompletion = await requestCSharpLanguageServerResolveCompletionItem(csharp!, workspacePath, documentPath, content, completions.items[1], 5000);
        const inlineCompletions = await requestCSharpLanguageServerInlineCompletions(
            csharp!,
            workspacePath,
            documentPath,
            content,
            { line: 3, column: 22 },
            {
                triggerKind: 'explicit',
                selectedSuggestion: {
                    range: { line: 3, column: 19, endLine: 3, endColumn: 22 },
                    text: 'Get',
                    completionKind: 2,
                    isSnippetText: false
                },
                includeInlineCompletions: true,
                includeInlineEdits: false
            },
            5000
        );
        const signatureHelp = await requestCSharpLanguageServerSignatureHelp(csharp!, workspacePath, documentPath, content, { line: 1, column: 15 }, 5000, {
            triggerKind: 'trigger-character',
            triggerCharacter: ',',
            isRetrigger: true
        });
        const hover = await requestCSharpLanguageServerHover(csharp!, workspacePath, documentPath, content, { line: 1, column: 15 }, 5000);
        const documentLinks = await requestCSharpLanguageServerDocumentLinks(csharp!, workspacePath, documentPath, content, 5000);
        const resolvedDocumentLink = await requestCSharpLanguageServerResolveDocumentLink(csharp!, workspacePath, documentPath, content, documentLinks.links[1], 5000);
        const documentColors = await requestCSharpLanguageServerDocumentColors(csharp!, workspacePath, documentPath, content, 5000);
        const colorPresentations = await requestCSharpLanguageServerColorPresentations(csharp!, workspacePath, documentPath, content, { line: 1, column: 25, endLine: 1, endColumn: 32 }, { red: 0.2, green: 0.4, blue: 0.6, alpha: 1 }, 5000);
        const codeLenses = await requestCSharpLanguageServerCodeLenses(csharp!, workspacePath, documentPath, content, 5000);
        const resolvedCodeLens = await requestCSharpLanguageServerResolveCodeLens(csharp!, workspacePath, documentPath, content, codeLenses.lenses[1], 5000);
        const linkedEditingRanges = await requestCSharpLanguageServerLinkedEditingRanges(csharp!, workspacePath, documentPath, content, { line: 1, column: 3 }, 5000);
        const monikers = await requestCSharpLanguageServerMonikers(csharp!, workspacePath, documentPath, content, { line: 1, column: 15 }, 5000);
        const evaluatableExpression = await requestCSharpLanguageServerEvaluatableExpression(csharp!, workspacePath, documentPath, content, { line: 1, column: 15 }, 5000);
        const inlineValues = await requestCSharpLanguageServerInlineValues(
            csharp!,
            workspacePath,
            documentPath,
            content,
            { line: 1, column: 1, endLine: 5, endColumn: 40 },
            { frameId: 7, stoppedLocation: { line: 3, column: 5, endLine: 5, endColumn: 6 } },
            5000
        );
        const semanticTokens = await requestCSharpLanguageServerSemanticTokens(csharp!, workspacePath, documentPath, content, 5000);
        const semanticTokenDelta = await requestCSharpLanguageServerSemanticTokens(csharp!, workspacePath, documentPath, content, 5000, 'semantic-1');
        const rangeSemanticTokens = await requestCSharpLanguageServerRangeSemanticTokens(csharp!, workspacePath, documentPath, content, { line: 1, column: 1, endLine: 3, endColumn: 40 }, 5000);
        const highlights = await requestCSharpLanguageServerDocumentHighlights(csharp!, workspacePath, documentPath, content, { line: 1, column: 15 }, 5000);
        const selectionRanges = await requestCSharpLanguageServerSelectionRanges(csharp!, workspacePath, documentPath, content, [
            { line: 1, column: 15 },
            { line: 3, column: 20 }
        ], 5000);
        const foldingRanges = await requestCSharpLanguageServerFoldingRanges(csharp!, workspacePath, documentPath, content, 5000);
        const workspaceSymbols = await requestCSharpLanguageServerWorkspaceSymbols(csharp!, workspacePath, 'Orders', 5000);
        const definitions = await requestCSharpLanguageServerDefinitions(csharp!, workspacePath, documentPath, content, { line: 1, column: 15 }, 5000);
        const declarations = await requestCSharpLanguageServerDeclarations(csharp!, workspacePath, documentPath, content, { line: 1, column: 15 }, 5000);
        const implementations = await requestCSharpLanguageServerImplementations(csharp!, workspacePath, documentPath, content, { line: 1, column: 15 }, 5000);
        const typeDefinitions = await requestCSharpLanguageServerTypeDefinitions(csharp!, workspacePath, documentPath, content, { line: 1, column: 15 }, 5000);
        const callHierarchy = await requestCSharpLanguageServerPrepareCallHierarchy(csharp!, workspacePath, documentPath, content, { line: 3, column: 20 }, 5000);
        const incomingCalls = await requestCSharpLanguageServerCallHierarchyIncomingCalls(csharp!, workspacePath, documentPath, callHierarchy.items[0], 5000);
        const outgoingCalls = await requestCSharpLanguageServerCallHierarchyOutgoingCalls(csharp!, workspacePath, documentPath, callHierarchy.items[0], 5000);
        const references = await requestCSharpLanguageServerReferences(csharp!, workspacePath, documentPath, content, { line: 1, column: 15 }, false, 5000);
        const prepareRename = await requestCSharpLanguageServerPrepareRename(csharp!, workspacePath, documentPath, content, { line: 1, column: 15 }, 5000);
        const newSymbolNames = await requestCSharpLanguageServerNewSymbolNames(csharp!, workspacePath, documentPath, content, { line: 1, column: 14, endLine: 1, endColumn: 30 }, 'automatic', 5000);
        const rename = await requestCSharpLanguageServerRename(csharp!, workspacePath, documentPath, content, { line: 1, column: 15 }, 'CustomersController', 5000);
        const formatting = await requestCSharpLanguageServerFormatting(csharp!, workspacePath, documentPath, content, { tabSize: 2, insertSpaces: false }, 5000);
        const rangeFormatting = await requestCSharpLanguageServerRangeFormatting(csharp!, workspacePath, documentPath, content, { line: 1, column: 8, endLine: 1, endColumn: 30 }, { tabSize: 4, insertSpaces: true }, 5000);
        const rangesFormatting = await requestCSharpLanguageServerRangesFormatting(csharp!, workspacePath, documentPath, content, [
            { line: 1, column: 8, endLine: 1, endColumn: 30 },
            { line: 3, column: 19, endLine: 3, endColumn: 35 }
        ], { tabSize: 6, insertSpaces: false }, 5000);
        const onTypeFormatting = await requestCSharpLanguageServerOnTypeFormatting(csharp!, workspacePath, documentPath, content, { line: 1, column: 40 }, '}', { tabSize: 8, insertSpaces: true }, 5000);
        const inlayHints = await requestCSharpLanguageServerInlayHints(csharp!, workspacePath, documentPath, content, { line: 1, column: 1, endLine: 3, endColumn: 40 }, 5000);
        const resolvedInlayHint = await requestCSharpLanguageServerResolveInlayHint(csharp!, workspacePath, documentPath, content, inlayHints.hints[1], 5000);
        const codeActions = await requestCSharpLanguageServerCodeActions(
            csharp!,
            workspacePath,
            documentPath,
            content,
            { line: 1, column: 14, endLine: 1, endColumn: 30 },
            'quickfix',
            'invoke',
            5000,
            [{
                range: { line: 1, column: 14, endLine: 1, endColumn: 30 },
                severity: 1,
                code: 'CS0103',
                source: 'csharp-ls',
                message: "The name 'OrdersController' does not exist in the current context."
            }]
        );
        const resolvedCodeAction = await requestCSharpLanguageServerResolveCodeAction(csharp!, workspacePath, documentPath, content, codeActions.actions[3], 5000);
        const executeCommand = await requestCSharpLanguageServerExecuteCommand(
            csharp!,
            workspacePath,
            documentPath,
            content,
            'csharp.applyExternalRefactor',
            [{ id: 'orders-refactor' }],
            5000
        );

        expect(lspDiagnostics.source).to.equal('language-server');
        expect(lspDiagnostics.diagnostics).to.deep.equal([{
            path: documentPath,
            line: 1,
            column: 14,
            endLine: 1,
            endColumn: 30,
            severity: 'error',
            code: 'CS0103',
            message: "The name 'OrdersController' does not exist in the current context."
        }]);
        expect(completions.source).to.equal('language-server');
        expect(completions.stderr).to.equal(undefined);
        expect(completions.items.map(item => `${item.kind}:${item.label}:${item.insertText}`)).to.deep.equal([
            'class:OrdersController:OrdersController',
            'method:Get:Get()',
            'method:ListOrders:ListOrders($0)'
        ]);
        expect(completions.items[0].detail).to.equal('controller class');
        expect(completions.items[0].documentation).to.equal('ASP.NET controller completion');
        const clientRequestResponses = completions.items[0].data as {
            configurationResponse?: unknown;
            workspaceFoldersResponse?: Array<{ uri?: string; name?: string }>;
            registerResponse?: unknown;
            unregisterResponse?: unknown;
            progressCreateResponse?: unknown;
            semanticTokensRefreshResponse?: unknown;
            codeLensRefreshResponse?: unknown;
            inlayHintRefreshResponse?: unknown;
            inlineValueRefreshResponse?: unknown;
            inlineCompletionRefreshResponse?: unknown;
            diagnosticRefreshResponse?: unknown;
            showDocumentResponse?: { success?: boolean };
            completionContext?: { triggerKind?: number; triggerCharacter?: string };
        };
        expect(clientRequestResponses.configurationResponse).to.deep.equal([{}]);
        expect(clientRequestResponses.workspaceFoldersResponse?.[0]?.uri).to.match(/^file:/);
        expect(clientRequestResponses.registerResponse).to.equal(null);
        expect(clientRequestResponses.unregisterResponse).to.equal(null);
        expect(clientRequestResponses.progressCreateResponse).to.equal(null);
        expect(clientRequestResponses.semanticTokensRefreshResponse).to.equal(null);
        expect(clientRequestResponses.codeLensRefreshResponse).to.equal(null);
        expect(clientRequestResponses.inlayHintRefreshResponse).to.equal(null);
        expect(clientRequestResponses.inlineValueRefreshResponse).to.equal(null);
        expect(clientRequestResponses.inlineCompletionRefreshResponse).to.equal(null);
        expect(clientRequestResponses.diagnosticRefreshResponse).to.equal(null);
        expect(clientRequestResponses.showDocumentResponse).to.deep.equal({ success: false });
        expect(clientRequestResponses.completionContext).to.deep.equal({ triggerKind: 2, triggerCharacter: '.' });
        expect(completions.items[1].data).to.deep.equal({ id: 'get-completion' });
        expect(completions.items[2].textEdit && {
            uri: completions.items[2].textEdit.uri,
            range: completions.items[2].textEdit.range,
            newText: completions.items[2].textEdit.newText
        }).to.deep.equal({
            uri: completions.items[2].textEdit?.uri,
            range: { line: 1, column: 8, endLine: 1, endColumn: 20 },
            newText: 'ListOrders($0)'
        });
        expect(completions.items[2].textEdit?.uri).to.match(/^file:/);
        expect(completions.items[2].commitCharacters).to.deep.equal([';', ')']);
        expect(completions.items[2].insertTextFormat).to.equal(2);
        expect(completions.items[2].data).to.deep.equal({ source: 'completion-list-defaults' });
        expect(resolvedCompletion.source).to.equal('language-server');
        expect(resolvedCompletion.item && {
            label: resolvedCompletion.item.label,
            insertText: resolvedCompletion.item.insertText,
            kind: resolvedCompletion.item.kind,
            detail: resolvedCompletion.item.detail,
            documentation: resolvedCompletion.item.documentation,
            additionalTextEdits: resolvedCompletion.item.additionalTextEdits?.map(edit => ({ range: edit.range, newText: edit.newText })),
            command: resolvedCompletion.item.command,
            data: resolvedCompletion.item.data
        }).to.deep.equal({
            label: 'Get',
            insertText: 'Get()',
            kind: 'method',
            detail: 'resolved controller action',
            documentation: 'Resolved Get completion docs',
            additionalTextEdits: [
                { range: { line: 1, column: 1, endLine: 1, endColumn: 1 }, newText: 'using Microsoft.AspNetCore.Mvc;\n' }
            ],
            command: {
                title: 'Trigger parameter hints',
                command: 'editor.action.triggerParameterHints',
                arguments: undefined
            },
            data: { id: 'get-completion' }
        });
        expect(inlineCompletions.source).to.equal('language-server');
        expect(inlineCompletions.suppressSuggestions).to.equal(true);
        expect(inlineCompletions.items.map(item => ({
            insertText: item.insertText,
            insertTextFormat: item.insertTextFormat,
            filterText: item.filterText,
            range: item.range,
            additionalTextEdits: item.additionalTextEdits.map(edit => ({
                uriIsFile: /^file:/.test(edit.uri),
                range: edit.range,
                newText: edit.newText
            })),
            command: item.command,
            completeBracketPairs: item.completeBracketPairs
        }))).to.deep.equal([
            {
                insertText: ' => new Order(21)',
                insertTextFormat: 'plain',
                filterText: 'new Order',
                range: { line: 3, column: 22, endLine: 3, endColumn: 22 },
                additionalTextEdits: [
                    {
                        uriIsFile: true,
                        range: { line: 1, column: 1, endLine: 1, endColumn: 1 },
                        newText: 'using Orders.Domain;\n'
                    }
                ],
                command: {
                    title: 'Track inline completion',
                    command: 'csharp.trackInlineCompletion',
                    arguments: ['Get']
                },
                completeBracketPairs: true
            },
            {
                insertText: 'Get(${1:id})',
                insertTextFormat: 'snippet',
                filterText: undefined,
                range: { line: 3, column: 19, endLine: 3, endColumn: 22 },
                additionalTextEdits: [],
                command: undefined,
                completeBracketPairs: undefined
            }
        ]);
        expect(signatureHelp.source).to.equal('language-server');
        expect(signatureHelp.signatures).to.deep.equal([{
            label: 'Get(int id, string region)',
            documentation: 'Finds an order. trigger=2 char=, retrigger=yes',
            parameters: ['int id', 'string region']
        }]);
        expect(signatureHelp.activeSignature).to.equal(0);
        expect(signatureHelp.activeParameter).to.equal(1);
        expect(hover.source).to.equal('language-server');
        expect(hover.contents).to.deep.equal(['**OrdersController**\n\nASP.NET controller']);
        expect(hover.range).to.deep.equal({ line: 1, column: 14, endLine: 1, endColumn: 30 });
        expect(documentLinks.source).to.equal('language-server');
        expect(documentLinks.links).to.deep.equal([
            {
                range: { line: 1, column: 8, endLine: 1, endColumn: 20 },
                target: 'https://learn.microsoft.com/dotnet/csharp/',
                tooltip: 'C# language reference',
                data: undefined
            },
            {
                range: { line: 2, column: 22, endLine: 2, endColumn: 32 },
                target: undefined,
                tooltip: 'Unresolved C# docs link',
                data: { id: 'resolved-doc-link' }
            }
        ]);
        expect(resolvedDocumentLink.source).to.equal('language-server');
        expect(resolvedDocumentLink.link).to.deep.equal({
            range: { line: 2, column: 22, endLine: 2, endColumn: 32 },
            target: 'https://learn.microsoft.com/dotnet/csharp/resolved',
            tooltip: 'Resolved C# docs link',
            data: { id: 'resolved-doc-link' }
        });
        expect(documentColors.source).to.equal('language-server');
        expect(documentColors.colors).to.deep.equal([
            {
                range: { line: 1, column: 25, endLine: 1, endColumn: 32 },
                color: { red: 0.2, green: 0.4, blue: 0.6, alpha: 1 }
            },
            {
                range: { line: 2, column: 11, endLine: 2, endColumn: 18 },
                color: { red: 1, green: 0, blue: 0.5, alpha: 0.75 }
            }
        ]);
        expect(colorPresentations.source).to.equal('language-server');
        expect(colorPresentations.presentations.map(presentation => ({
            label: presentation.label,
            textEdit: presentation.textEdit ? { range: presentation.textEdit.range, newText: presentation.textEdit.newText } : undefined,
            additionalTextEdits: presentation.additionalTextEdits.map(edit => ({ range: edit.range, newText: edit.newText }))
        }))).to.deep.equal([
            {
                label: '#336699',
                textEdit: { range: { line: 1, column: 25, endLine: 1, endColumn: 32 }, newText: '#336699' },
                additionalTextEdits: []
            },
            {
                label: 'rgba(51, 102, 153, 1)',
                textEdit: undefined,
                additionalTextEdits: [
                    { range: { line: 1, column: 1, endLine: 1, endColumn: 1 }, newText: '/* color */ ' }
                ]
            }
        ]);
        expect(codeLenses.source).to.equal('language-server');
        expect(codeLenses.lenses.map(lens => ({
            range: lens.range,
            command: lens.command,
            data: lens.data
        }))).to.deep.equal([
            {
                range: { line: 1, column: 14, endLine: 1, endColumn: 30 },
                command: {
                    title: '2 references',
                    command: 'editor.action.showReferences',
                    arguments: [codeLenses.lenses[0].command?.arguments?.[0]]
                },
                data: { id: 'orders-references' }
            },
            {
                range: { line: 3, column: 19, endLine: 3, endColumn: 22 },
                command: undefined,
                data: { id: 'orders-test' }
            }
        ]);
        expect(String(codeLenses.lenses[0].command?.arguments?.[0])).to.match(/^file:/);
        expect(resolvedCodeLens.source).to.equal('language-server');
        expect(resolvedCodeLens.lens).to.deep.equal({
            range: { line: 3, column: 19, endLine: 3, endColumn: 22 },
            command: {
                title: 'Run test',
                command: 'cybervinci.csharpKit.runTest',
                arguments: ['OrdersController.Get']
            },
            data: { id: 'orders-test' }
        });
        expect(linkedEditingRanges.source).to.equal('language-server');
        expect(linkedEditingRanges.ranges).to.deep.equal([
            { line: 1, column: 2, endLine: 1, endColumn: 8 },
            { line: 3, column: 3, endLine: 3, endColumn: 9 }
        ]);
        expect(linkedEditingRanges.wordPattern).to.equal('[A-Za-z_][A-Za-z0-9_]*');
        expect(monikers.source).to.equal('language-server');
        expect(monikers.monikers).to.deep.equal([
            {
                scheme: 'csharp',
                identifier: 'Orders.Api.OrdersController',
                unique: 'project',
                kind: 'export'
            },
            {
                scheme: 'metadata',
                identifier: 'M:Orders.Api.OrdersController.Get',
                unique: 'global'
            }
        ]);
        expect(evaluatableExpression.source).to.equal('language-server');
        expect(evaluatableExpression.expression).to.deep.equal({
            range: { line: 1, column: 14, endLine: 1, endColumn: 30 },
            expression: 'OrdersController.FromDebugger(14)'
        });
        expect(inlineValues.source).to.equal('language-server');
        expect(inlineValues.inlineValues).to.deep.equal([
            {
                kind: 'text',
                range: { line: 1, column: 14, endLine: 1, endColumn: 30 },
                text: 'frame=7 stopped=2'
            },
            {
                kind: 'variable',
                range: { line: 3, column: 19, endLine: 3, endColumn: 22 },
                variableName: 'orderId',
                caseSensitiveLookup: true
            },
            {
                kind: 'expression',
                range: { line: 4, column: 16, endLine: 4, endColumn: 32 },
                expression: 'this.CurrentOrder.Total'
            },
            {
                kind: 'variable',
                range: { line: 5, column: 9, endLine: 5, endColumn: 25 },
                caseSensitiveLookup: false
            }
        ]);
        expect(semanticTokens.source).to.equal('language-server');
        expect(semanticTokens.resultId).to.equal('semantic-1');
        expect(semanticTokens.data).to.deep.equal([
            0, 13, 16, 2, 1,
            2, 18, 3, 13, 8,
            0, 4, 5, 8, 0
        ]);
        expect(semanticTokenDelta.source).to.equal('language-server');
        expect(semanticTokenDelta.resultId).to.equal('semantic-2-semantic-1');
        expect(semanticTokenDelta.data).to.deep.equal([]);
        expect(semanticTokenDelta.edits).to.deep.equal([
            {
                start: 5,
                deleteCount: 5,
                data: [0, 13, 16, 2, 1]
            },
            {
                start: 15,
                deleteCount: 0
            }
        ]);
        expect(rangeSemanticTokens.source).to.equal('language-server');
        expect(rangeSemanticTokens.resultId).to.equal('semantic-range-1');
        expect(rangeSemanticTokens.data).to.deep.equal([
            0, 2, 9, 2, 9,
            1, 4, 4, 13, 1
        ]);
        expect(highlights.source).to.equal('language-server');
        expect(highlights.highlights.map(highlight => ({ range: highlight.range, kind: highlight.kind }))).to.deep.equal([
            { range: { line: 1, column: 14, endLine: 1, endColumn: 30 }, kind: 'text' },
            { range: { line: 3, column: 19, endLine: 3, endColumn: 35 }, kind: 'read' },
            { range: { line: 5, column: 9, endLine: 5, endColumn: 25 }, kind: 'write' }
        ]);
        expect(selectionRanges.source).to.equal('language-server');
        expect(selectionRanges.ranges).to.deep.equal([
            [
                { line: 1, column: 14, endLine: 1, endColumn: 30 },
                { line: 1, column: 1, endLine: 1, endColumn: 40 }
            ],
            [
                { line: 3, column: 19, endLine: 3, endColumn: 35 },
                { line: 3, column: 5, endLine: 3, endColumn: 46 }
            ]
        ]);
        expect(foldingRanges.source).to.equal('language-server');
        expect(foldingRanges.ranges).to.deep.equal([
            { startLine: 1, endLine: 6, kind: 'region' },
            { startLine: 2, endLine: 3, kind: 'comment' },
            { startLine: 7, endLine: 9, kind: 'imports' },
            { startLine: 11, endLine: 11, kind: undefined }
        ]);
        expect(workspaceSymbols.source).to.equal('language-server');
        expect(workspaceSymbols.symbols.map(symbol => ({
            name: symbol.name,
            kind: symbol.kind,
            range: symbol.range,
            containerName: symbol.containerName,
            tags: symbol.tags,
            data: symbol.data
        }))).to.deep.equal([
            {
                name: 'OrdersController',
                kind: 5,
                range: { line: 1, column: 14, endLine: 1, endColumn: 30 },
                containerName: 'Orders.Api',
                tags: [1],
                data: { id: 'orders-controller' }
            }
        ]);
        expect(definitions.source).to.equal('language-server');
        expect(definitions.locations).to.have.length(1);
        expect(definitions.locations[0].uri).to.match(/^file:/);
        expect(definitions.locations[0].range).to.deep.equal({ line: 1, column: 14, endLine: 1, endColumn: 30 });
        expect(declarations.source).to.equal('language-server');
        expect(declarations.locations.map(location => location.range)).to.deep.equal([
            { line: 14, column: 5, endLine: 16, endColumn: 6 }
        ]);
        expect(implementations.source).to.equal('language-server');
        expect(implementations.locations.map(location => location.range)).to.deep.equal([
            { line: 7, column: 5, endLine: 9, endColumn: 6 }
        ]);
        expect(typeDefinitions.source).to.equal('language-server');
        expect(typeDefinitions.locations.map(location => location.range)).to.deep.equal([
            { line: 10, column: 14, endLine: 10, endColumn: 20 }
        ]);
        expect(callHierarchy.source).to.equal('language-server');
        expect(callHierarchy.items.map(item => ({
            name: item.name,
            kind: item.kind,
            range: item.range,
            selectionRange: item.selectionRange,
            detail: item.detail,
            tags: item.tags,
            data: item.data
        }))).to.deep.equal([
            {
                name: 'OrdersController.Get',
                kind: 6,
                range: { line: 3, column: 5, endLine: 5, endColumn: 6 },
                selectionRange: { line: 3, column: 19, endLine: 3, endColumn: 22 },
                detail: 'Orders API action',
                tags: [1],
                data: { id: 'orders-get' }
            }
        ]);
        expect(incomingCalls.source).to.equal('language-server');
        expect(incomingCalls.calls.map(call => ({
            from: call.from.name,
            range: call.from.range,
            fromRanges: call.fromRanges,
            data: call.from.data
        }))).to.deep.equal([
            {
                from: 'OrdersController.Index',
                range: { line: 7, column: 5, endLine: 9, endColumn: 6 },
                fromRanges: [{ line: 8, column: 12, endLine: 8, endColumn: 15 }],
                data: { id: 'orders-index' }
            }
        ]);
        expect(outgoingCalls.source).to.equal('language-server');
        expect(outgoingCalls.calls.map(call => ({
            to: call.to.name,
            range: call.to.range,
            fromRanges: call.fromRanges,
            data: call.to.data
        }))).to.deep.equal([
            {
                to: 'OrderRepository.Find',
                range: { line: 18, column: 5, endLine: 20, endColumn: 6 },
                fromRanges: [{ line: 4, column: 16, endLine: 4, endColumn: 20 }],
                data: { id: 'repository-find' }
            }
        ]);
        expect(references.source).to.equal('language-server');
        expect(references.locations.map(location => location.range)).to.deep.equal([
            { line: 1, column: 14, endLine: 1, endColumn: 30 },
            { line: 3, column: 19, endLine: 3, endColumn: 35 }
        ]);
        expect(prepareRename.source).to.equal('language-server');
        expect(prepareRename.range).to.deep.equal({ line: 1, column: 14, endLine: 1, endColumn: 30 });
        expect(prepareRename.placeholder).to.equal('OrdersController');
        expect(newSymbolNames.source).to.equal('language-server');
        expect(newSymbolNames.names).to.deep.equal([
            {
                newSymbolName: 'CustomersController1',
                tags: ['ai-generated']
            },
            {
                newSymbolName: 'OrdersEndpoint13'
            }
        ]);
        expect(rename.source).to.equal('language-server');
        expect(rename.edits.map(edit => edit.uri)).to.have.length(3);
        expect(rename.edits.every(edit => /^file:/.test(edit.uri))).to.equal(true);
        expect(rename.edits.map(edit => ({ range: edit.range, newText: edit.newText }))).to.deep.equal([
            { range: { line: 1, column: 14, endLine: 1, endColumn: 30 }, newText: 'CustomersController' },
            { range: { line: 3, column: 19, endLine: 3, endColumn: 35 }, newText: '' },
            { range: { line: 5, column: 9, endLine: 5, endColumn: 25 }, newText: 'CustomersControllerAsync' }
        ]);
        expect(formatting.source).to.equal('language-server');
        expect(formatting.edits.map(edit => ({ range: edit.range, newText: edit.newText }))).to.deep.equal([
            { range: { line: 1, column: 1, endLine: 1, endColumn: 1 }, newText: '// formatted tabSize=2 insertSpaces=false\n' }
        ]);
        expect(rangeFormatting.source).to.equal('language-server');
        expect(rangeFormatting.edits.map(edit => ({ range: edit.range, newText: edit.newText }))).to.deep.equal([
            { range: { line: 1, column: 8, endLine: 1, endColumn: 30 }, newText: '// range formatted tabSize=4 insertSpaces=true' }
        ]);
        expect(rangesFormatting.source).to.equal('language-server');
        expect(rangesFormatting.edits.map(edit => ({ range: edit.range, newText: edit.newText }))).to.deep.equal([
            { range: { line: 1, column: 8, endLine: 1, endColumn: 30 }, newText: '// ranges formatted #0 tabSize=6 insertSpaces=false' },
            { range: { line: 3, column: 19, endLine: 3, endColumn: 35 }, newText: '// ranges formatted #1 tabSize=6 insertSpaces=false' }
        ]);
        expect(onTypeFormatting.source).to.equal('language-server');
        expect(onTypeFormatting.edits.map(edit => ({ range: edit.range, newText: edit.newText }))).to.deep.equal([
            { range: { line: 1, column: 1, endLine: 1, endColumn: 1 }, newText: '// on type } tabSize=8 insertSpaces=true\n' }
        ]);
        expect(inlayHints.source).to.equal('language-server');
        expect(inlayHints.hints.map(hint => ({
            label: hint.label,
            position: hint.position,
            kind: hint.kind,
            tooltip: hint.tooltip,
            textEdits: hint.textEdits.map(edit => ({ range: edit.range, newText: edit.newText })),
            paddingLeft: hint.paddingLeft,
            paddingRight: hint.paddingRight,
            data: hint.data
        }))).to.deep.equal([
            {
                label: ': OrdersController',
                position: { line: 1, column: 33 },
                kind: 'type',
                tooltip: 'Inferred controller type',
                textEdits: [],
                paddingLeft: true,
                paddingRight: undefined,
                data: undefined
            },
            {
                label: 'id: ',
                position: { line: 3, column: 23 },
                kind: 'parameter',
                tooltip: undefined,
                textEdits: [
                    { range: { line: 3, column: 19, endLine: 3, endColumn: 19 }, newText: 'id: ' }
                ],
                paddingLeft: undefined,
                paddingRight: true,
                data: { id: 'parameter-id-hint' }
            }
        ]);
        expect(resolvedInlayHint.source).to.equal('language-server');
        expect(resolvedInlayHint.hint && {
            label: resolvedInlayHint.hint.label,
            position: resolvedInlayHint.hint.position,
            kind: resolvedInlayHint.hint.kind,
            tooltip: resolvedInlayHint.hint.tooltip,
            textEdits: resolvedInlayHint.hint.textEdits.map(edit => ({ range: edit.range, newText: edit.newText })),
            paddingRight: resolvedInlayHint.hint.paddingRight,
            data: resolvedInlayHint.hint.data
        }).to.deep.equal({
            label: 'id: ',
            position: { line: 3, column: 23 },
            kind: 'parameter',
            tooltip: 'Resolved parameter name',
            textEdits: [
                { range: { line: 3, column: 19, endLine: 3, endColumn: 19 }, newText: 'resolvedId: ' }
            ],
            paddingRight: true,
            data: { id: 'parameter-id-hint' }
        });
        expect(codeActions.source).to.equal('language-server');
        expect(codeActions.actions.map(action => `${action.kind}:${action.title}:${action.isPreferred}`)).to.deep.equal([
            'quickfix:Use CustomersController:true',
            'source.organizeImports:Organize imports:false',
            'refactor:External server command:false',
            'quickfix:Add missing using:false'
        ]);
        expect(codeActions.actions.map(action => action.edits.map(edit => ({ range: edit.range, newText: edit.newText })))).to.deep.equal([
            [
                { range: { line: 1, column: 14, endLine: 1, endColumn: 30 }, newText: 'CustomersController' }
            ],
            [
                { range: { line: 1, column: 1, endLine: 1, endColumn: 1 }, newText: 'using System;\n' }
            ],
            [],
            []
        ]);
        expect(codeActions.actions[0].data).to.deep.equal({ diagnosticCodes: ['CS0103'] });
        expect(codeActions.actions[2].command).to.deep.equal({
            title: 'External server command',
            command: 'csharp.applyExternalRefactor',
            arguments: undefined
        });
        expect(codeActions.actions[3].data).to.deep.equal({ id: 'missing-using' });
        expect(resolvedCodeAction.source).to.equal('language-server');
        expect(resolvedCodeAction.action && {
            title: resolvedCodeAction.action.title,
            kind: resolvedCodeAction.action.kind,
            edits: resolvedCodeAction.action.edits.map(edit => ({ range: edit.range, newText: edit.newText })),
            data: resolvedCodeAction.action.data
        }).to.deep.equal({
            title: 'Add missing using',
            kind: 'quickfix',
            edits: [
                { range: { line: 1, column: 1, endLine: 1, endColumn: 1 }, newText: 'using System.Linq;\n' }
            ],
            data: { id: 'missing-using' }
        });
        expect(executeCommand.source).to.equal('language-server');
        expect({
            command: (executeCommand.result as { command?: string }).command,
            arguments: (executeCommand.result as { arguments?: unknown[] }).arguments,
            applyEditResponse: (executeCommand.result as { applyEditResponse?: unknown }).applyEditResponse
        }).to.deep.equal({
            command: 'csharp.applyExternalRefactor',
            arguments: [{ id: 'orders-refactor' }],
            applyEditResponse: { applied: true }
        });
        expect(executeCommand.edits).to.deep.equal([{
            uri: String((executeCommand.result as { openedUri?: string }).openedUri),
            range: { line: 1, column: 1, endLine: 1, endColumn: 1 },
            newText: 'using External.Refactor;\n'
        }]);
        expect(String((executeCommand.result as { openedUri?: string }).openedUri)).to.match(/^file:/);
    });
});

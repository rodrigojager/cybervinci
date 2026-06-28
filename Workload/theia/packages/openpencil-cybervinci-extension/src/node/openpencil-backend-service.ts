import { injectable } from '@theia/core/shared/inversify';
import { execFile, spawn } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { pathToFileURL } from 'url';
import {
    OpenPencilBackendAiActivePageLayoutSummary,
    OpenPencilBackendAiGenerationRequest,
    OpenPencilBackendAiGenerationResult,
    OpenPencilBackendService,
    OpenPencilBackendStatus,
    OpenPencilBridgeCapability,
    OpenPencilBridgeJsonObject,
    OpenPencilBridgeJsonValue,
    OpenPencilBridgeOperationDescriptor,
    OpenPencilBridgeOperationErrorCode,
    OpenPencilBridgeOperationRequest,
    OpenPencilBridgeOperationResult,
    OpenPencilBridgeProcessStatus,
    OpenPencilIntegrationInfo,
    OpenPencilUpstreamPackage
} from '../common/openpencil-protocol';
import {
    OpenPencilDesignOperation,
    OpenPencilDocument,
    OpenPencilEffect,
    OpenPencilExportFormat,
    OpenPencilFill,
    OpenPencilNode,
    OpenPencilPage,
    OpenPencilStyledTextSegment,
    OPENPENCIL_FILE_EXTENSION
} from '../common/openpencil-types';
import {
    OpenPencilRuntimeDocument,
    toOpenPencilRuntimeDocument
} from '../common/openpencil-runtime-adapter';
import { OpenPencilDesignCommandServiceImpl } from '../browser/openpencil-design-command-service';
import { OpenPencilDocumentService } from '../common/openpencil-document-service';

type PenCodegenFramework = 'react' | 'html' | 'vue' | 'svelte' | 'react-native' | 'flutter' | 'swiftui' | 'compose';
type PenCodegenGenerator = (document: OpenPencilRuntimeDocument, activePageId?: string | null) => unknown | Promise<unknown>;
interface PenCodegenResolvedGenerator {
    exportName: string;
    generator: PenCodegenGenerator;
}
type PenCodegenModule = Record<string, unknown>;
type PenFigmaModule = Record<string, unknown>;
type OpenPencilImportFormat = 'auto' | 'figma-json' | 'figma-rest-json' | 'figma-copied-json' | 'figma-clipboard-html' | 'figma-fig-base64' | 'openpencil-json' | 'svg' | 'html';

interface CodexExecResult {
    stdout: string;
    stderr: string;
}

interface CodegenGenerationResult {
    adapter: string;
    content: OpenPencilBridgeJsonValue;
    framework?: PenCodegenFramework;
    fallbackReason?: string;
    html?: string;
    css?: string;
    upstreamFunction?: string;
}

interface ImportDocumentResult {
    adapter: string;
    document: OpenPencilDocument;
    warnings?: string[];
    fallbackReason?: string;
}

@injectable()
export class OpenPencilBackendServiceImpl implements OpenPencilBackendService {

    protected readonly designCommands = new OpenPencilDesignCommandServiceImpl();

    protected readonly documents = new OpenPencilDocumentService();

    protected readonly vendoredSnapshotRoot = 'vendor/openpencil';

    protected readonly exportFormats: OpenPencilExportFormat[] = [
        'openpencil-json',
        'openpencil-summary-json',
        'react-tailwind',
        'html-css',
        'svg',
        'vue',
        'svelte',
        'react-native',
        'flutter',
        'swiftui',
        'jetpack-compose'
    ];

    protected readonly upstreamPackages: OpenPencilUpstreamPackage[] = [
        {
            name: 'pen-types',
            path: 'packages/pen-types',
            vendorPath: 'vendor/openpencil/packages/pen-types',
            role: 'types',
            description: 'Type definitions for the PenDocument model.',
            readiness: 'planned',
            packageName: '@zseven-w/pen-types'
        },
        {
            name: 'pen-core',
            path: 'packages/pen-core',
            vendorPath: 'vendor/openpencil/packages/pen-core',
            role: 'core',
            description: 'Document tree operations, layout engine, variables, and boolean operations.',
            readiness: 'planned',
            packageName: '@zseven-w/pen-core'
        },
        {
            name: 'pen-engine',
            path: 'packages/pen-engine',
            vendorPath: 'vendor/openpencil/packages/pen-engine',
            role: 'engine',
            description: 'Headless design engine for document, selection, history, and viewport operations.',
            readiness: 'planned',
            packageName: '@zseven-w/pen-engine'
        },
        {
            name: 'pen-react',
            path: 'packages/pen-react',
            vendorPath: 'vendor/openpencil/packages/pen-react',
            role: 'react-ui',
            description: 'React UI SDK with provider, canvas, hooks, panels, and toolbar components.',
            readiness: 'planned',
            packageName: '@zseven-w/pen-react',
            notes: [
                'Source has been converted for React 18 compatibility.',
                'The Theia widget mounts the pen-react shell through the runtime adapter and keeps the local SVG editor as fallback.'
            ]
        },
        {
            name: 'pen-codegen',
            path: 'packages/pen-codegen',
            vendorPath: 'vendor/openpencil/packages/pen-codegen',
            role: 'codegen',
            description: 'Code generators for React, HTML, Vue, Flutter, and related export targets.',
            readiness: 'planned',
            packageName: '@zseven-w/pen-codegen',
            notes: ['Not present in the vendored source snapshot; code export falls back to the Theia local generators.']
        },
        {
            name: 'pen-figma',
            path: 'packages/pen-figma',
            vendorPath: 'vendor/openpencil/packages/pen-figma',
            role: 'figma',
            description: 'Figma .fig parser and converter.',
            readiness: 'planned',
            packageName: '@zseven-w/pen-figma',
            notes: [
                'Used in-process for decoded Figma JSON, Figma clipboard HTML, and base64 .fig payloads when the vendored source is importable.',
                'CyberVinci falls back to a structural Figma JSON importer when the source-only package cannot be loaded at runtime.'
            ]
        },
        {
            name: 'pen-renderer',
            path: 'packages/pen-renderer',
            vendorPath: 'vendor/openpencil/packages/pen-renderer',
            role: 'renderer',
            description: 'Standalone CanvasKit/Skia renderer.',
            readiness: 'planned',
            packageName: '@zseven-w/pen-renderer'
        },
        {
            name: 'pen-mcp',
            path: 'packages/pen-mcp',
            vendorPath: 'vendor/openpencil/packages/pen-mcp',
            role: 'mcp',
            description: 'MCP server tools, routes, and document manager.',
            readiness: 'planned',
            packageName: '@zseven-w/pen-mcp'
        },
        {
            name: 'pen-sdk',
            path: 'packages/pen-sdk',
            vendorPath: 'vendor/openpencil/packages/pen-sdk',
            role: 'sdk',
            description: 'Umbrella SDK that re-exports the reusable OpenPencil packages.',
            readiness: 'planned',
            packageName: '@zseven-w/pen-sdk'
        },
        {
            name: 'pen-ai-skills',
            path: 'packages/pen-ai-skills',
            vendorPath: 'vendor/openpencil/packages/pen-ai-skills',
            role: 'ai-skills',
            description: 'AI prompt skill engine with phase-driven prompt loading.',
            readiness: 'planned',
            packageName: '@zseven-w/pen-ai-skills'
        },
        {
            name: 'pen-acp',
            path: 'packages/pen-acp',
            vendorPath: 'vendor/openpencil/packages/pen-acp',
            role: 'acp',
            description: 'Agent Client Protocol bridge package for OpenPencil automation workflows.',
            readiness: 'planned',
            packageName: '@zseven-w/pen-acp'
        }
    ];

    protected readonly capabilities: OpenPencilBridgeCapability[] = [
        {
            id: 'openpencil.document-json',
            label: 'OpenPencil .op JSON document compatibility',
            readiness: 'available',
            notes: ['Handled locally by OpenPencilDocumentService.']
        },
        {
            id: 'openpencil.backend-rpc',
            label: 'Theia backend RPC service for integration discovery',
            readiness: 'available',
            notes: ['Provides deterministic status, capability metadata, and allowlisted bridge operation execution without starting external processes.']
        },
        {
            id: 'openpencil.vendored-source-snapshot',
            label: 'Vendored OpenPencil source snapshot',
            readiness: 'planned',
            notes: [`Reports source availability from ${this.vendoredSnapshotRoot} without starting external processes.`]
        },
        {
            id: 'openpencil.pen-engine-adapter',
            label: 'Internal adapter for pen-engine document operations',
            readiness: 'planned',
            sourcePackage: '@zseven-w/pen-engine',
            notes: ['TODO: resolve the package from the bundled extension or workspace dependency before replacing local mutations.']
        },
        {
            id: 'openpencil.pen-codegen-adapter',
            label: 'Internal adapter for OpenPencil code generation',
            readiness: 'blocked',
            sourcePackage: '@zseven-w/pen-codegen',
            notes: [
                'Uses @zseven-w/pen-codegen generate*FromDocument exports when the vendored package is present.',
                'Falls back to Theia local code generators when the package cannot be imported or an upstream generator call fails.'
            ]
        },
        {
            id: 'openpencil.mcp-internal-bridge',
            label: 'Internal MCP bridge for agent tools',
            readiness: 'available',
            sourcePackage: '@zseven-w/pen-mcp',
            notes: ['Provides in-process MCP-compatible discovery operations without requiring a global op install or shell execution.']
        },
        {
            id: 'openpencil.cli-internal-bridge',
            label: 'Internal CLI bridge for op-compatible commands',
            readiness: 'available',
            sourcePackage: '@zseven-w/openpencil',
            notes: ['Provides an allowlisted in-process command registry for op-compatible metadata; command execution remains limited to registered bridge operations.']
        },
        {
            id: 'openpencil.pen-react18-compatibility',
            label: 'React 18-compatible pen-react source',
            readiness: 'available',
            sourcePackage: '@zseven-w/pen-react',
            notes: ['pen-react source compatibility with Theia React 18 is available and no longer blocks source readiness.']
        },
        {
            id: 'openpencil.pen-react-adapter',
            label: 'Theia adapter for the pen-react canvas SDK',
            readiness: 'available',
            sourcePackage: '@zseven-w/pen-react',
            notes: [
                'The editor widget imports the vendored pen-react runtime and mounts DesignProvider, DesignCanvas, CoreToolbar, LayerPanel, and PropertyPanel.',
                'The local SVG canvas remains as a fallback if the runtime boundary fails or CanvasKit cannot initialize.'
            ]
        },
        {
            id: 'openpencil.pen-figma-import-adapter',
            label: 'Internal adapter for Figma/OpenPencil import',
            readiness: 'available',
            sourcePackage: '@zseven-w/pen-figma',
            notes: [
                'The backend calls allowlisted pen-figma conversion exports in-process when the vendored package can be loaded.',
                'Unsupported or unavailable direct adapter paths fall back to a structural Figma JSON importer and OpenPencilDocumentService normalization.'
            ]
        }
    ];

    protected readonly operationInputSchema: OpenPencilBridgeJsonObject = {
        type: 'object',
        additionalProperties: false,
        properties: {}
    };

    protected readonly bridgeOperations: OpenPencilBridgeOperationDescriptor[] = [
        {
            id: 'openpencil.backend.capabilities.list',
            label: 'List OpenPencil backend capabilities',
            kind: 'backend',
            readiness: 'available',
            requiresExternalProcess: false,
            inputSchema: this.operationInputSchema,
            notes: ['Returns the same capability metadata exposed by getCapabilities through the internal operation registry.']
        },
        {
            id: 'openpencil.backend.status.get',
            label: 'Get OpenPencil backend bridge status',
            kind: 'backend',
            readiness: 'available',
            requiresExternalProcess: false,
            inputSchema: this.operationInputSchema,
            notes: ['Returns backend status without starting MCP, CLI, or codegen subprocesses.']
        },
        {
            id: 'openpencil.mcp.tools.list',
            label: 'List MCP-compatible OpenPencil tools',
            kind: 'mcp',
            readiness: 'available',
            requiresExternalProcess: false,
            sourcePackage: '@zseven-w/pen-mcp',
            inputSchema: this.operationInputSchema,
            notes: ['Exposes bridge operation descriptors in an MCP-style shape for future agent integration.']
        },
        {
            id: 'openpencil.cli.commands.list',
            label: 'List allowlisted op-compatible commands',
            kind: 'cli',
            readiness: 'available',
            requiresExternalProcess: false,
            sourcePackage: '@zseven-w/openpencil',
            inputSchema: this.operationInputSchema,
            notes: ['Lists internal command mappings only; arbitrary shell commands and PATH lookup are intentionally unsupported.']
        },
        {
            id: 'openpencil.codegen.targets.list',
            label: 'List OpenPencil code generation targets',
            kind: 'codegen',
            readiness: 'available',
            requiresExternalProcess: false,
            sourcePackage: '@zseven-w/pen-codegen',
            inputSchema: this.operationInputSchema,
            notes: ['Reports supported export target metadata and selected adapter fallback status.']
        },
        {
            id: 'openpencil.codegen.adapter.status',
            label: 'Get OpenPencil codegen adapter status',
            kind: 'codegen',
            readiness: 'available',
            requiresExternalProcess: false,
            sourcePackage: '@zseven-w/pen-codegen',
            inputSchema: this.operationInputSchema,
            notes: ['Reports direct pen-codegen detection, MCP/CLI pipeline availability, and the selected adapter.']
        },
        {
            id: 'openpencil.codegen.generate',
            label: 'Generate code from an OpenPencil document',
            kind: 'codegen',
            readiness: 'available',
            requiresExternalProcess: false,
            inputSchema: {
                type: 'object',
                additionalProperties: false,
                required: ['document'],
                properties: {
                    document: { type: ['object', 'string'] },
                    format: { type: 'string', enum: this.exportFormats },
                    selection: { type: 'array', items: { type: 'string' } },
                    selectionOnly: { type: 'boolean' }
                }
            },
            notes: ['Uses direct @zseven-w/pen-codegen generators when available and falls back locally without starting external processes.']
        },
        {
            id: 'openpencil.codegen.generate.all',
            label: 'Generate every OpenPencil codegen target from a document',
            kind: 'codegen',
            readiness: 'available',
            requiresExternalProcess: false,
            inputSchema: {
                type: 'object',
                additionalProperties: false,
                required: ['document'],
                properties: {
                    document: { type: ['object', 'string'] },
                    selection: { type: 'array', items: { type: 'string' } },
                    selectionOnly: { type: 'boolean' }
                }
            },
            notes: ['Runs the allowlisted in-process generator surface for every codegen target and reports per-target adapters.']
        },
        {
            id: 'openpencil.ai.operations.list',
            label: 'List structured OpenPencil AI document operations',
            kind: 'backend',
            readiness: 'available',
            requiresExternalProcess: false,
            inputSchema: this.operationInputSchema,
            notes: ['Reports the in-process operation names accepted by OpenPencil command files and editor sessions.']
        },
        {
            id: 'openpencil.import.formats.list',
            label: 'List OpenPencil import formats',
            kind: 'backend',
            readiness: 'available',
            requiresExternalProcess: false,
            inputSchema: this.operationInputSchema,
            notes: ['Reports robust importers for .op JSON, selected node arrays, SVG, HTML, embedded OpenPencil JSON, Figma decoded JSON, Figma clipboard HTML, and base64 .fig payloads.']
        },
        {
            id: 'openpencil.document.validation.rules.list',
            label: 'List OpenPencil document validation rules',
            kind: 'backend',
            readiness: 'available',
            requiresExternalProcess: false,
            inputSchema: this.operationInputSchema,
            notes: ['Reports validation rules enforced by the local OpenPencil document service before serialization and command ingestion.']
        },
        {
            id: 'openpencil.document.import',
            label: 'Import OpenPencil-compatible source into a normalized document',
            kind: 'backend',
            readiness: 'available',
            requiresExternalProcess: false,
            inputSchema: {
                type: 'object',
                additionalProperties: false,
                required: ['source'],
                properties: {
                    source: { type: 'string' },
                    name: { type: 'string' },
                    format: {
                        type: 'string',
                        enum: ['auto', 'figma-json', 'figma-rest-json', 'figma-copied-json', 'figma-clipboard-html', 'figma-fig-base64', 'openpencil-json', 'svg', 'html']
                    }
                }
            },
            notes: ['Imports .op JSON, node-array JSON, SVG, HTML, embedded application/openpencil+json, or Figma/OpenPencil payloads without external processes.']
        },
        {
            id: 'openpencil.document.validate',
            label: 'Validate an OpenPencil document payload',
            kind: 'backend',
            readiness: 'available',
            requiresExternalProcess: false,
            inputSchema: {
                type: 'object',
                additionalProperties: false,
                required: ['document'],
                properties: {
                    document: { type: 'object' }
                }
            },
            notes: ['Runs local validation rules and returns controlled issue metadata.']
        },
        {
            id: 'openpencil.document.export',
            label: 'Export an OpenPencil document payload',
            kind: 'backend',
            readiness: 'available',
            requiresExternalProcess: false,
            inputSchema: {
                type: 'object',
                additionalProperties: false,
                required: ['document', 'format'],
                properties: {
                    document: { type: ['object', 'string'] },
                    format: { type: 'string', enum: this.exportFormats },
                    selection: { type: 'array', items: { type: 'string' } },
                    selectionOnly: { type: 'boolean' }
                }
            },
            notes: ['Exports through the same local fallback generators used by the embedded editor.']
        }
    ];

    protected readonly mcpStatus: OpenPencilBridgeProcessStatus = {
        enabled: true,
        readiness: 'available',
        sourcePackage: '@zseven-w/pen-mcp',
        transport: 'in-process',
        notes: [
            'No MCP server process is started by this backend service.',
            'MCP-compatible discovery is served through allowlisted in-process bridge operations.'
        ]
    };

    protected readonly cliStatus: OpenPencilBridgeProcessStatus = {
        enabled: true,
        readiness: 'available',
        sourcePackage: '@zseven-w/openpencil',
        transport: 'in-process',
        command: 'op',
        notes: [
            'No op CLI process is started by this backend service.',
            'Only registered in-process bridge operations are exposed; arbitrary command execution is unsupported.'
        ]
    };

    async getIntegrationInfo(): Promise<OpenPencilIntegrationInfo> {
        return {
            fileExtension: OPENPENCIL_FILE_EXTENSION,
            embedded: true,
            reactIsolation: 'pen-react',
            bridgeStatus: 'available'
        };
    }

    async getCapabilities(): Promise<OpenPencilBridgeCapability[]> {
        return this.resolveCapabilities(this.resolveUpstreamPackages());
    }

    async listBridgeOperations(): Promise<OpenPencilBridgeOperationDescriptor[]> {
        return this.resolveBridgeOperations();
    }

    async executeBridgeOperation(request: OpenPencilBridgeOperationRequest): Promise<OpenPencilBridgeOperationResult> {
        const operation = this.resolveBridgeOperations().find(entry => entry.id === request.operationId);
        if (!operation) {
            return this.createBridgeOperationError(request.operationId, 'unsupportedOperation', 'Unsupported OpenPencil bridge operation.');
        }
        if (operation.readiness !== 'available') {
            return this.createBridgeOperationError(operation.id, 'operationUnavailable', 'OpenPencil bridge operation is not available yet.', operation.readiness);
        }
        if (this.isNoParamOperation(operation.id) && !this.acceptsNoParams(request.params)) {
            return this.createBridgeOperationError(operation.id, 'invalidParams', 'This OpenPencil bridge operation does not accept parameters.');
        }

        try {
            switch (operation.id) {
                case 'openpencil.backend.capabilities.list':
                    return this.createBridgeOperationSuccess(operation, await this.getCapabilities());
                case 'openpencil.backend.status.get':
                    return this.createBridgeOperationSuccess(operation, await this.getStatus());
                case 'openpencil.mcp.tools.list':
                    return this.createBridgeOperationSuccess(operation, this.resolveMcpTools());
                case 'openpencil.cli.commands.list':
                    return this.createBridgeOperationSuccess(operation, this.resolveCliCommands());
                case 'openpencil.codegen.targets.list':
                    return this.createBridgeOperationSuccess(operation, this.resolveCodegenTargets());
                case 'openpencil.codegen.adapter.status':
                    return this.createBridgeOperationSuccess(operation, this.resolveCodegenAdapterStatus());
                case 'openpencil.codegen.generate':
                    return this.executeCodegenGenerateOperation(operation, request.params);
                case 'openpencil.codegen.generate.all':
                    return this.executeCodegenGenerateAllOperation(operation, request.params);
                case 'openpencil.ai.operations.list':
                    return this.createBridgeOperationSuccess(operation, this.resolveAiOperations());
                case 'openpencil.import.formats.list':
                    return this.createBridgeOperationSuccess(operation, this.resolveImportFormats());
                case 'openpencil.document.validation.rules.list':
                    return this.createBridgeOperationSuccess(operation, this.resolveValidationRules());
                case 'openpencil.document.import':
                    return this.executeDocumentImportOperation(operation, request.params);
                case 'openpencil.document.validate':
                    return this.executeDocumentValidateOperation(operation, request.params);
                case 'openpencil.document.export':
                    return this.executeDocumentExportOperation(operation, request.params);
                default:
                    return this.createBridgeOperationError(operation.id, 'unsupportedOperation', 'Unsupported OpenPencil bridge operation.');
            }
        } catch (error) {
            return this.createBridgeOperationError(operation.id, 'internalError', error instanceof Error ? error.message : 'OpenPencil bridge operation failed.');
        }
    }

    async getStatus(): Promise<OpenPencilBackendStatus> {
        const upstreamPackages = this.resolveUpstreamPackages();
        const capabilities = this.resolveCapabilities(upstreamPackages);
        return {
            fileExtension: OPENPENCIL_FILE_EXTENSION,
            embedded: true,
            reactIsolation: 'pen-react',
            externalProcessesStarted: false,
            upstreamPackages,
            capabilities,
            operations: this.resolveBridgeOperations(),
            mcp: this.mcpStatus,
            cli: this.cliStatus
        };
    }

    protected resolveCodexExecutable(): string {
        return process.platform === 'win32' ? 'codex.cmd' : 'codex';
    }

    protected buildCodexSpawnInfo(executable: string, args: string[]): { command: string; args: string[]; shell: boolean } {
        if (process.platform === 'win32' && executable.toLowerCase().endsWith('.ps1')) {
            return {
                command: 'powershell.exe',
                args: ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', executable, ...args],
                shell: false
            };
        }
        const hasPathSeparator = executable.includes(path.sep) || executable.includes('/') || executable.includes('\\');
        if (process.platform === 'win32' && (!hasPathSeparator || executable.toLowerCase().endsWith('.cmd') || executable.toLowerCase().endsWith('.bat'))) {
            return {
                command: 'cmd.exe',
                args: ['/d', '/c', executable, ...args],
                shell: false
            };
        }
        return {
            command: executable,
            args,
            shell: false
        };
    }

    protected canvasAiBackendDebug(marker: string, details: Record<string, unknown>): void {
        if (process.env.CYBERVINCI_CANVAS_AI_DEBUG !== '1') {
            return;
        }
        console.info(`[CanvasAI][backend] ${marker}`, details);
    }

    protected summarizeCodexArgs(args: string[]): { argsCount: number; firstArgs: string[] } {
        return {
            argsCount: args.length,
            firstArgs: args.slice(0, 4)
        };
    }

    protected summarizeCanvasAiError(error: unknown): { errorName: string; messageLength: number } {
        if (error instanceof Error) {
            return {
                errorName: error.name,
                messageLength: error.message.length
            };
        }
        return {
            errorName: typeof error,
            messageLength: String(error).length
        };
    }

    async generateAiOperations(request: OpenPencilBackendAiGenerationRequest): Promise<OpenPencilBackendAiGenerationResult> {
        const diagnostics: string[] = [];
        if (!request.prompt.trim()) {
            return { diagnostics: ['Canvas AI prompt is empty.'] };
        }
        const workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'cybervinci-openpencil-'));
        const schemaPath = path.join(workdir, 'openpencil-codex-output.schema.json');
        const outputPath = path.join(workdir, 'openpencil-codex-output.json');
        fs.writeFileSync(schemaPath, JSON.stringify(this.createCodexOpenPencilOutputSchema(), undefined, 2));
        const prompt = this.createCodexOpenPencilPrompt(request);
        const args = [
            'exec',
            '--skip-git-repo-check',
            '-s',
            'read-only',
            '--output-schema',
            schemaPath,
            '--output-last-message',
            outputPath,
        ];
        this.canvasAiBackendDebug('request-start', {
            cwd: workdir,
            command: this.resolveCodexExecutable(),
            ...this.summarizeCodexArgs(args),
            promptLength: request.prompt.length,
            selectionCount: request.selection?.length ?? 0
        });
        try {
            const result = await this.execCodexWithStdin(args, workdir, 180000, prompt);
            if (result.stderr.trim()) {
                diagnostics.push(`codex stderr: ${this.excerpt(result.stderr)}`);
            }
            const rawText = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, 'utf8') : result.stdout;
            const operations = this.parseCodexOpenPencilOperations(rawText);
            if (!operations.length) {
                diagnostics.push(`codex returned no OpenPencil operations. Response excerpt: ${this.excerpt(rawText)}`);
            }
            this.canvasAiBackendDebug('output-parsed', {
                cwd: workdir,
                command: this.resolveCodexExecutable(),
                stdoutLength: result.stdout.length,
                stderrLength: result.stderr.length,
                rawTextLength: rawText.length,
                operationsCount: operations.length,
                diagnosticsCount: diagnostics.length
            });
            return { operations, diagnostics, rawText };
        } catch (error) {
            this.canvasAiBackendDebug('error', {
                cwd: workdir,
                command: this.resolveCodexExecutable(),
                operationsCount: 0,
                diagnosticsCount: 1,
                ...this.summarizeCanvasAiError(error)
            });
            return {
                diagnostics: [`codex exec failed: ${error instanceof Error ? error.message : String(error)}`]
            };
        }
    }

    protected execCodex(args: string[], cwd: string, timeout: number): Promise<CodexExecResult> {
        return this.execCodexCommand(this.resolveCodexExecutable(), args, cwd, timeout);
    }

    protected execCodexCommand(command: string, args: string[], cwd: string, timeout: number): Promise<CodexExecResult> {
        const spawnInfo = this.buildCodexSpawnInfo(command, args);
        this.canvasAiBackendDebug('codex-spawn', {
            cwd,
            command: spawnInfo.command,
            ...this.summarizeCodexArgs(spawnInfo.args)
        });
        return new Promise((resolve, reject) => {
            execFile(spawnInfo.command, spawnInfo.args, {
                cwd,
                timeout,
                windowsHide: true,
                maxBuffer: 10 * 1024 * 1024
            }, (error, stdout, stderr) => {
                this.canvasAiBackendDebug('codex-exit', {
                    cwd,
                    command: spawnInfo.command,
                    exitCode: error?.code ?? 0,
                    stdoutLength: stdout.length,
                    stderrLength: stderr.length
                });
                if (error) {
                    const detail = [error.message, stderr.trim(), stdout.trim()].filter(Boolean).join('\n');
                    reject(new Error(detail));
                    return;
                }
                resolve({ stdout, stderr });
            });
        });
    }

    protected execCodexWithStdin(args: string[], cwd: string, timeout: number, stdinInput: string): Promise<CodexExecResult> {
        return this.execCodexCommandWithStdin(this.resolveCodexExecutable(), args, cwd, timeout, stdinInput);
    }

    protected execCodexCommandWithStdin(command: string, args: string[], cwd: string, timeout: number, stdinInput: string): Promise<CodexExecResult> {
        const spawnInfo = this.buildCodexSpawnInfo(command, args);
        this.canvasAiBackendDebug('codex-spawn', {
            cwd,
            command: spawnInfo.command,
            ...this.summarizeCodexArgs(spawnInfo.args)
        });
        return new Promise((resolve, reject) => {
            const child = spawn(spawnInfo.command, spawnInfo.args, {
                cwd,
                windowsHide: true,
                shell: spawnInfo.shell,
                stdio: ['pipe', 'pipe', 'pipe']
            });
            const timer = setTimeout(() => {
                this.canvasAiBackendDebug('error', {
                    cwd,
                    command: spawnInfo.command,
                    operationsCount: 0,
                    diagnosticsCount: 1,
                    reason: 'timeout',
                    timeoutSeconds: Math.round(timeout / 1000)
                });
                child.kill();
                reject(new Error(`codex timed out after ${Math.round(timeout / 1000)}s`));
            }, timeout);
            let stdout = '';
            let stderr = '';
            child.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
            child.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });
            child.on('error', error => {
                clearTimeout(timer);
                this.canvasAiBackendDebug('error', {
                    cwd,
                    command: spawnInfo.command,
                    operationsCount: 0,
                    diagnosticsCount: 1,
                    ...this.summarizeCanvasAiError(error)
                });
                reject(error);
            });
            child.on('close', code => {
                clearTimeout(timer);
                this.canvasAiBackendDebug('codex-exit', {
                    cwd,
                    command: spawnInfo.command,
                    exitCode: code,
                    stdoutLength: stdout.length,
                    stderrLength: stderr.length
                });
                if (code !== 0) {
                    const detail = [`Exit code ${code}`, stderr.trim(), stdout.trim()].filter(Boolean).join('\n');
                    reject(new Error(detail));
                    return;
                }
                resolve({ stdout, stderr });
            });
            child.stdin.write(stdinInput);
            child.stdin.end();
        });
    }

    protected createCodexOpenPencilPrompt(request: OpenPencilBackendAiGenerationRequest): string {
        const activePage = this.documents.getActivePage(request.document);
        const requestMode = request.mode ?? 'generation';
        const activePageLayout = request.activePageLayout ?? this.createCodexActivePageLayoutSummary(activePage);
        const documentSummary = {
            name: request.document.name ?? 'OpenPencil Design',
            activePageId: activePage.id,
            activePageName: activePage.name,
            pageWidth: activePage.width ?? 1200,
            pageHeight: activePage.height ?? 800,
            existingTopLevelNodes: activePage.children.map(node => ({ id: node.id, type: node.type, name: node.name }))
        };
        return [
            'You are CyberVinci Canvas AI. Generate a visible OpenPencil design as JSON only.',
            'Do not read files, write files, run commands, ask questions, or include prose.',
            'Return exactly the structured JSON requested by the response schema.',
            'Use only createNode operations.',
            ...(requestMode === 'continuation'
                ? [
                    'Continuation mode: preserve existing nodes and node IDs, add only new content, and do not recreate page content.',
                    'Continuation mode: place any new top-level content below contentBottom or in visible empty space from the active-page layout summary, and avoid covering existing top-level nodes.',
                    'Continuation mode: keep existing layout geometry intact unless a new top-level node is explicitly required by the request.'
                ]
                : [
                    'Generation or maintenance mode: create one fresh top-level frame with parentId null, then create child nodes whose parentId is that frame id.',
                    'Generation or maintenance mode: keep new content self-contained and do not reuse existing node IDs.'
                ]),
            'CyberVinci CanvasKit rendering treats children[0] as the front/top layer and renders it last. Output createNode/addNode siblings in front-to-back order.',
            'Use index:null or omit index for normal appends; if you must use indexes, use strictly increasing sibling indexes. Never reuse index:0 for siblings because repeated front insertion reverses the intended stacking order.',
            'Layer order: text, icons, buttons, badges, overlays, and foreground controls first; cards and fields next; decorative glows next; backgrounds and large frames last.',
            'Use lowercase OpenPencil node types: frame, rectangle, ellipse, line, polygon, path, text, image, icon_font, ref.',
            'Use node fields id,type,name,x,y,width,height,content,fill,stroke,cornerRadius,fontFamily,fontSize,fontWeight,textAlign,layout,gap,padding,opacity,visible.',
            'Use fill as [{type:"solid",color:"#hex",opacity:null}] for colored frames/rectangles and text fill. Do not use CSS property names.',
            'For known product/site styles, capture the visual structure and interaction patterns without copying trademarks or exact assets.',
            'For ecommerce pages, include header, search, categories, promotional banner, product cards, prices, and shipping/payment cues when relevant.',
            `Request mode: ${requestMode}`,
            `Active page layout summary: ${JSON.stringify(activePageLayout)}`,
            `User request: ${request.prompt}`,
            `Document context: ${JSON.stringify(documentSummary)}`,
            `Selection: ${JSON.stringify(request.selection ?? [])}`,
            `Target URI: ${request.uri ?? 'active OpenPencil editor'}`
        ].join('\n');
    }

    protected createCodexActivePageLayoutSummary(page: OpenPencilPage): OpenPencilBackendAiActivePageLayoutSummary {
        const maxTopLevelNodes = 24;
        return {
            id: page.id,
            name: page.name,
            bounds: {
                x: 0,
                y: 0,
                width: page.width,
                height: page.height
            },
            contentBottom: page.children.reduce((bottom, node) => Math.max(bottom, this.nodeBottom(node)), 0),
            topLevelNodeCount: page.children.length,
            topLevelNodes: page.children.slice(0, maxTopLevelNodes).map(node => this.createCodexLayoutNodeSummary(node))
        };
    }

    protected createCodexLayoutNodeSummary(node: OpenPencilNode): OpenPencilBackendAiActivePageLayoutSummary['topLevelNodes'][number] {
        return {
            id: node.id,
            type: node.type,
            name: node.name,
            role: node.role,
            contentExcerpt: this.createContentExcerpt(node.content),
            x: node.x,
            y: node.y,
            width: node.width,
            height: node.height,
            childCount: node.children?.length ?? 0
        };
    }

    protected createContentExcerpt(content: OpenPencilNode['content']): string | undefined {
        if (content === undefined) {
            return undefined;
        }
        const text = typeof content === 'string'
            ? content
            : content.map(segment => segment.text).join(' ');
        const compact = text.replace(/\s+/g, ' ').trim();
        return compact.length > 80 ? `${compact.slice(0, 77)}...` : compact;
    }

    protected nodeBottom(node: OpenPencilNode): number {
        const y = typeof node.y === 'number' ? node.y : 0;
        const height = typeof node.height === 'number' ? node.height : 0;
        return y + height;
    }

    protected createCodexOpenPencilOutputSchema(): object {
        const nullableNumber = { type: ['number', 'null'] };
        const nullableString = { type: ['string', 'null'] };
        return {
            type: 'object',
            additionalProperties: false,
            required: ['contract', 'operations'],
            properties: {
                contract: { type: 'string' },
                operations: {
                    type: 'array',
                    minItems: 1,
                    items: {
                        type: 'object',
                        additionalProperties: false,
                        required: ['operation', 'parentId', 'index', 'node'],
                        properties: {
                            operation: { type: 'string', enum: ['createNode'] },
                            parentId: { type: ['string', 'null'] },
                            index: { type: ['integer', 'null'] },
                            node: {
                                type: 'object',
                                additionalProperties: false,
                                required: [
                                    'id', 'type', 'name', 'x', 'y', 'width', 'height', 'content', 'fill', 'stroke', 'cornerRadius',
                                    'fontFamily', 'fontSize', 'fontWeight', 'textAlign', 'layout', 'gap', 'padding', 'opacity', 'visible'
                                ],
                                properties: {
                                    id: { type: 'string' },
                                    type: { type: 'string', enum: ['frame', 'group', 'rectangle', 'ellipse', 'line', 'polygon', 'path', 'text', 'image', 'icon_font', 'ref'] },
                                    name: { type: 'string' },
                                    x: { type: 'number' },
                                    y: { type: 'number' },
                                    width: { type: 'number' },
                                    height: { type: 'number' },
                                    content: nullableString,
                                    fill: {
                                        type: ['array', 'null'],
                                        items: {
                                            type: 'object',
                                            additionalProperties: false,
                                            required: ['type', 'color', 'opacity'],
                                            properties: {
                                                type: { type: 'string', enum: ['solid'] },
                                                color: { type: 'string' },
                                                opacity: nullableNumber
                                            }
                                        }
                                    },
                                    stroke: {
                                        type: ['object', 'null'],
                                        additionalProperties: false,
                                        required: ['color', 'width', 'opacity'],
                                        properties: {
                                            color: { type: 'string' },
                                            width: { type: 'number' },
                                            opacity: nullableNumber
                                        }
                                    },
                                    cornerRadius: nullableNumber,
                                    fontFamily: nullableString,
                                    fontSize: nullableNumber,
                                    fontWeight: nullableNumber,
                                    textAlign: { type: ['string', 'null'], enum: ['left', 'center', 'right', 'justify', null] },
                                    layout: { type: ['string', 'null'], enum: ['none', 'vertical', 'horizontal', null] },
                                    gap: nullableNumber,
                                    padding: nullableNumber,
                                    opacity: nullableNumber,
                                    visible: { type: ['boolean', 'null'] }
                                }
                            }
                        }
                    }
                }
            }
        };
    }

    protected parseCodexOpenPencilOperations(rawText: string): OpenPencilDesignOperation[] {
        const parsed = JSON.parse(rawText.trim()) as unknown;
        const operations: unknown[] = this.isRecord(parsed) && Array.isArray(parsed.operations) ? parsed.operations : [];
        return operations
            .map(operation => this.stripNullValues(operation))
            .filter((operation): operation is OpenPencilDesignOperation => this.isRecord(operation) && operation.operation === 'createNode' && this.isRecord(operation.node));
    }

    protected stripNullValues(value: unknown): unknown {
        if (Array.isArray(value)) {
            return value.map(entry => this.stripNullValues(entry)).filter(entry => entry !== undefined);
        }
        if (this.isRecord(value)) {
            const result: Record<string, unknown> = {};
            for (const [key, entry] of Object.entries(value)) {
                if (entry === null || entry === undefined) {
                    continue;
                }
                result[key] = this.stripNullValues(entry);
            }
            return result;
        }
        return value;
    }

    protected isRecord(value: unknown): value is Record<string, unknown> {
        return !!value && typeof value === 'object' && !Array.isArray(value);
    }

    protected excerpt(text: string, limit = 1000): string {
        const normalized = text.replace(/\s+/g, ' ').trim();
        return normalized.length > limit ? `${normalized.slice(0, limit)}...` : normalized;
    }

    protected resolveUpstreamPackages(): OpenPencilUpstreamPackage[] {
        return this.upstreamPackages.map(entry => {
            const vendored = this.isVendoredPackageAvailable(entry);
            const notes = [...(entry.notes ?? [])];
            if (vendored && entry.vendorPath) {
                notes.push(`Vendored source is available at ${entry.vendorPath}.`);
            }
            if (vendored && entry.name === 'pen-react') {
                notes.push('The React 18-compatible source is embedded and mounted as the primary Theia OpenPencil shell.');
            }
            if (!vendored && entry.name === 'pen-codegen') {
                notes.push('Direct pen-codegen source was not detected under vendor/openpencil/packages/pen-codegen.');
                notes.push('MCP/CLI codegen pipeline files are present separately but require a running OpenPencil App sync endpoint.');
            }
            if (vendored && entry.name === 'pen-codegen') {
                notes.push('Direct pen-codegen source is embedded and selected through the pen-codegen-direct adapter.');
            }
            return {
                ...entry,
                readiness: vendored ? 'available' : entry.readiness,
                vendored,
                notes: notes.length ? notes : undefined
            };
        });
    }

    protected resolveCapabilities(upstreamPackages: OpenPencilUpstreamPackage[]): OpenPencilBridgeCapability[] {
        const vendoredPackages = upstreamPackages.filter(entry => entry.vendored);
        return this.capabilities.map(entry => {
            if (entry.id === 'openpencil.vendored-source-snapshot') {
                return {
                    ...entry,
                    readiness: vendoredPackages.length ? 'available' : 'planned',
                    notes: vendoredPackages.length
                        ? [`Vendored source packages available: ${vendoredPackages.map(pkg => pkg.name).join(', ')}.`]
                        : entry.notes
                };
            }
            if (entry.id === 'openpencil.pen-react-adapter' && upstreamPackages.find(pkg => pkg.name === 'pen-react')?.vendored) {
                return {
                    ...entry,
                    notes: [
                        ...(entry.notes ?? []),
                        'Vendored pen-react source is present and wired into the widget through the runtime host.'
                    ]
                };
            }
            if (entry.id === 'openpencil.pen-codegen-adapter') {
                const penCodegen = upstreamPackages.find(pkg => pkg.name === 'pen-codegen');
                if (penCodegen?.vendored) {
                    return {
                        ...entry,
                        readiness: 'available',
                        notes: [
                            'Vendored pen-codegen source is present.',
                            'The backend selects pen-codegen-direct and calls generate*FromDocument exports, with local fallback on import or generator failure.'
                        ]
                    };
                }
            }
            return entry;
        });
    }

    protected resolveBridgeOperations(): OpenPencilBridgeOperationDescriptor[] {
        return this.bridgeOperations.map(entry => ({ ...entry }));
    }

    protected resolveMcpTools(): OpenPencilBridgeJsonObject[] {
        return this.resolveBridgeOperations()
            .filter(entry => entry.readiness === 'available')
            .map(entry => ({
                name: entry.id,
                description: entry.label,
                kind: entry.kind,
                inputSchema: entry.inputSchema ?? this.operationInputSchema,
                requiresExternalProcess: entry.requiresExternalProcess
            }));
    }

    protected resolveCliCommands(): OpenPencilBridgeJsonObject[] {
        return this.resolveBridgeOperations()
            .filter(entry => entry.readiness === 'available')
            .map(entry => ({
                command: entry.id.replace('openpencil.', 'op:'),
                operationId: entry.id,
                kind: entry.kind,
                requiresExternalProcess: entry.requiresExternalProcess
            }));
    }

    protected resolveCodegenTargets(): OpenPencilBridgeJsonObject[] {
        const adapterStatus = this.resolveCodegenAdapterStatus();
        const adapter = adapterStatus.selectedAdapter as string;
        return [
            { id: 'openpencil-json', label: 'OpenPencil JSON', adapter: 'local-serializer' },
            { id: 'openpencil-summary-json', label: 'OpenPencil Summary JSON', adapter: 'local-serializer' },
            { id: 'react-tailwind', label: 'React + Tailwind', adapter, fallbackAdapter: 'local-fallback', upstreamFramework: 'react', upstreamFunction: 'generateReactFromDocument' },
            { id: 'html-css', label: 'HTML + CSS', adapter, fallbackAdapter: 'local-fallback', upstreamFramework: 'html', upstreamFunction: 'generateHTMLFromDocument' },
            { id: 'svg', label: 'SVG', adapter: 'local-svg-fallback' },
            { id: 'vue', label: 'Vue', adapter, fallbackAdapter: 'local-fallback', upstreamFramework: 'vue', upstreamFunction: 'generateVueFromDocument' },
            { id: 'svelte', label: 'Svelte', adapter, fallbackAdapter: 'local-fallback', upstreamFramework: 'svelte', upstreamFunction: 'generateSvelteFromDocument' },
            { id: 'react-native', label: 'React Native', adapter, fallbackAdapter: 'local-fallback', upstreamFramework: 'react-native', upstreamFunction: 'generateReactNativeFromDocument' },
            { id: 'flutter', label: 'Flutter', adapter, fallbackAdapter: 'local-fallback', upstreamFramework: 'flutter', upstreamFunction: 'generateFlutterFromDocument' },
            { id: 'swiftui', label: 'SwiftUI', adapter, fallbackAdapter: 'local-fallback', upstreamFramework: 'swiftui', upstreamFunction: 'generateSwiftUIFromDocument' },
            { id: 'jetpack-compose', label: 'Jetpack Compose', adapter, fallbackAdapter: 'local-fallback', upstreamFramework: 'compose', upstreamFunction: 'generateComposeFromDocument' }
        ];
    }

    protected resolveCodegenAdapterStatus(): OpenPencilBridgeJsonObject {
        const directPackagePath = this.resolvePenCodegenPackagePath();
        const mcpRoutesPath = this.resolveExistingRelativePath('vendor/openpencil/packages/pen-mcp/src/routes/codegen-routes.ts');
        const cliCommandPath = this.resolveExistingRelativePath('vendor/openpencil/apps/cli/src/commands/codegen.ts');
        const codegenTypesPath = this.resolveExistingRelativePath('vendor/openpencil/packages/pen-types/src/codegen.ts');
        const directPackageAvailable = directPackagePath !== undefined;
        return {
            selectedAdapter: directPackageAvailable ? 'pen-codegen-direct' : 'local-fallback',
            directPenCodegen: {
                packageName: '@zseven-w/pen-codegen',
                available: directPackageAvailable,
                vendorPath: 'vendor/openpencil/packages/pen-codegen',
                resolvedPath: directPackagePath,
                resolvedEntrypoint: directPackagePath ? this.resolveVendoredPackageEntrypoint(directPackagePath, ['dist/index.js', 'src/index.ts', 'index.js']) : undefined,
                adapter: 'pen-codegen-direct',
                functions: [
                    'generateReactFromDocument',
                    'generateHTMLFromDocument',
                    'generateVueFromDocument',
                    'generateSvelteFromDocument',
                    'generateReactNativeFromDocument',
                    'generateFlutterFromDocument',
                    'generateSwiftUIFromDocument',
                    'generateComposeFromDocument'
                ],
                reason: directPackageAvailable
                    ? 'Vendored source exists; direct generate*FromDocument calls are enabled for upstream codegen formats.'
                    : 'No vendored pen-codegen package exists in the upstream snapshot.'
            },
            codegenTypes: {
                available: codegenTypesPath !== undefined,
                vendorPath: 'vendor/openpencil/packages/pen-types/src/codegen.ts',
                runtimeExport: 'FRAMEWORKS'
            },
            mcpPipeline: {
                available: mcpRoutesPath !== undefined,
                vendorPath: 'vendor/openpencil/packages/pen-mcp/src/routes/codegen-routes.ts',
                embeddableDirectGenerator: false,
                requiresRunningOpenPencilApp: true,
                tools: ['read_nodes', 'codegen_plan', 'codegen_submit_chunk', 'codegen_assemble', 'codegen_clean']
            },
            cliPipeline: {
                available: cliCommandPath !== undefined,
                vendorPath: 'vendor/openpencil/apps/cli/src/commands/codegen.ts',
                embeddableDirectGenerator: false,
                requiresRunningOpenPencilApp: true,
                commands: ['codegen:plan', 'codegen:submit', 'codegen:assemble', 'codegen:clean']
            },
            fallback: {
                available: true,
                adapter: 'Theia OpenPencilDesignCommandService local exporters',
                formats: this.exportFormats
            }
        };
    }

    protected resolveAiOperations(): OpenPencilBridgeJsonObject[] {
        return [
            { operation: 'createNode', category: 'create', aliasOf: 'addNode' },
            { operation: 'addNode', category: 'create' },
            { operation: 'updateNode', category: 'update' },
            { operation: 'deleteNode', category: 'delete', aliasOf: 'removeNode' },
            { operation: 'removeNode', category: 'delete' },
            { operation: 'replaceNode', category: 'update' },
            { operation: 'moveNode', category: 'layout' },
            { operation: 'moveToParent', category: 'layout' },
            { operation: 'nudgeNodes', category: 'layout' },
            { operation: 'alignNodes', category: 'layout' },
            { operation: 'distributeNodes', category: 'layout' },
            { operation: 'groupNodes', category: 'group' },
            { operation: 'ungroupNode', category: 'group' },
            { operation: 'addPage', category: 'page' },
            { operation: 'updatePage', category: 'page' },
            { operation: 'removePage', category: 'page' },
            { operation: 'setActivePage', category: 'page' },
            { operation: 'setVariable', category: 'variables' },
            { operation: 'updateVariable', category: 'variables' },
            { operation: 'removeVariable', category: 'variables' },
            { operation: 'setThemes', category: 'theme' },
            { operation: 'updateThemeAxis', category: 'theme' },
            { operation: 'removeThemeAxis', category: 'theme' },
            { operation: 'setNodeTheme', category: 'theme' },
            { operation: 'clearNodeTheme', category: 'theme' },
            { operation: 'setNodeLayout', category: 'layout' },
            { operation: 'autoLayoutNode', category: 'layout' },
            { operation: 'setSelection', category: 'selection' }
        ];
    }

    protected resolveImportFormats(): OpenPencilBridgeJsonObject[] {
        return [
            { id: 'openpencil-json', extensions: ['.op'], adapter: 'local-document-service' },
            { id: 'openpencil-node-array-json', extensions: ['.json'], adapter: 'local-document-service' },
            { id: 'figma-json', extensions: ['.json'], adapter: 'pen-figma-direct', fallbackAdapter: 'figma-structural-json' },
            { id: 'figma-rest-json', extensions: ['.json'], adapter: 'figma-structural-json', shapes: ['GET /v1/files/:key', 'GET /v1/files/:key/nodes'] },
            { id: 'figma-copied-json', extensions: ['.json', '.html'], adapter: 'figma-structural-json', shapes: ['node array', 'clipboard HTML with embedded JSON/data attributes'] },
            { id: 'figma-clipboard-html', extensions: ['.html'], adapter: 'pen-figma-direct', fallbackAdapter: 'figma-structural-json' },
            { id: 'figma-fig-base64', extensions: ['.fig.txt', '.json'], adapter: 'pen-figma-direct', fallbackAdapter: 'decoded-json-required' },
            { id: 'svg', extensions: ['.svg'], adapter: 'local-markup-importer' },
            { id: 'html', extensions: ['.html', '.htm'], adapter: 'local-markup-importer' },
            { id: 'embedded-openpencil-json', selector: 'script[type="application/openpencil+json"]', adapter: 'local-document-service' }
        ];
    }

    protected resolveValidationRules(): OpenPencilBridgeJsonObject[] {
        return [
            { id: 'document-has-pages', severity: 'error' },
            { id: 'active-page-exists', severity: 'error' },
            { id: 'page-ids-present-and-unique', severity: 'error' },
            { id: 'node-ids-present-and-unique', severity: 'error' },
            { id: 'known-node-types', severity: 'error' },
            { id: 'theme-axes-and-values-non-empty', severity: 'error' },
            { id: 'variables-include-values', severity: 'error' },
            { id: 'version-normalized-on-save', severity: 'warning' }
        ];
    }

    protected async executeDocumentImportOperation(operation: OpenPencilBridgeOperationDescriptor, params: OpenPencilBridgeOperationRequest['params']): Promise<OpenPencilBridgeOperationResult> {
        if (!this.isBridgeJsonObject(params) || typeof params.source !== 'string') {
            return this.createBridgeOperationError(operation.id, 'invalidParams', 'Expected params.source to be a string.');
        }
        const name = typeof params.name === 'string' ? params.name : undefined;
        const format = this.resolveImportFormatParam(params.format);
        if (!format) {
            return this.createBridgeOperationError(operation.id, 'invalidParams', 'Expected params.format to be auto, figma-json, figma-rest-json, figma-copied-json, figma-clipboard-html, figma-fig-base64, openpencil-json, svg, or html when provided.');
        }
        const imported = await this.importDocumentSource(params.source, name, format);
        if (!imported) {
            return this.createBridgeOperationError(operation.id, 'invalidParams', this.createImportFailureMessage(format, params.source));
        }
        const validation = this.designCommands.validateDocument(imported.document);
        const output: OpenPencilBridgeJsonObject = {
            adapter: imported.adapter,
            document: imported.document as unknown as OpenPencilBridgeJsonObject,
            validation: validation as unknown as OpenPencilBridgeJsonObject
        };
        if (imported.warnings?.length) {
            output.warnings = imported.warnings;
        }
        if (imported.fallbackReason) {
            output.fallbackReason = imported.fallbackReason;
        }
        return this.createBridgeOperationSuccess(operation, {
            ...output
        });
    }

    protected createImportFailureMessage(format: OpenPencilImportFormat, source: string): string {
        if (format === 'figma-fig-base64') {
            return 'Could not import base64 .fig payload. The in-process @zseven-w/pen-figma parser is unavailable or rejected the payload; structural fallback can only read decoded Figma JSON, REST JSON, copied node JSON, or clipboard HTML with embedded JSON metadata.';
        }
        if (format === 'figma-clipboard-html' || /figmeta|data-buffer|<!--\(figma\)/i.test(source)) {
            return 'Could not import Figma clipboard HTML. The direct pen-figma clipboard parser is unavailable or rejected the payload, and no embedded decoded Figma JSON/data-buffer metadata could be extracted for structural fallback.';
        }
        if (format === 'figma-json' || format === 'figma-rest-json' || format === 'figma-copied-json') {
            return 'Could not import Figma JSON. Expected decoded .fig nodeChanges, Figma REST file JSON, Figma REST nodes JSON, copied Figma node JSON, or an array of Figma nodes.';
        }
        return 'Could not import params.source as OpenPencil JSON, node-array JSON, SVG, HTML, embedded OpenPencil JSON, Figma JSON, Figma clipboard HTML, or base64 .fig payload.';
    }

    protected async importDocumentSource(source: string, name: string | undefined, format: OpenPencilImportFormat): Promise<ImportDocumentResult | undefined> {
        const autoDetectedFigma = format === 'auto' && this.looksLikeFigmaSource(source);
        if (format === 'figma-json' || format === 'figma-rest-json' || format === 'figma-copied-json' || format === 'figma-clipboard-html' || format === 'figma-fig-base64' || autoDetectedFigma) {
            const direct = await this.tryImportWithPenFigma(source, name, format);
            if (direct) {
                return direct;
            }
            const structural = this.tryImportFigmaStructurally(source, name);
            if (structural) {
                return {
                    ...structural,
                    fallbackReason: 'Direct @zseven-w/pen-figma import was unavailable or did not support this payload; used structural Figma JSON fallback.'
                };
            }
            return undefined;
        }
        const document = this.tryImportDocument(source, name);
        return document ? { adapter: 'local-document-service', document } : undefined;
    }

    protected resolveImportFormatParam(value: OpenPencilBridgeJsonValue | undefined): OpenPencilImportFormat | undefined {
        if (value === undefined || value === null) {
            return 'auto';
        }
        return typeof value === 'string' && this.isImportFormat(value) ? value : undefined;
    }

    protected isImportFormat(value: string): value is OpenPencilImportFormat {
        return [
            'auto',
            'figma-json',
            'figma-rest-json',
            'figma-copied-json',
            'figma-clipboard-html',
            'figma-fig-base64',
            'openpencil-json',
            'svg',
            'html'
        ].includes(value);
    }

    protected looksLikeFigmaSource(source: string): boolean {
        const trimmed = source.trim();
        if (!trimmed) {
            return false;
        }
        if (/figmeta|data-buffer|<!--\(figma\)/i.test(trimmed)) {
            return true;
        }
        return this.resolveFigmaJsonCandidates(trimmed).some(candidate => this.isFigmaJsonLike(candidate));
    }

    protected async tryImportWithPenFigma(source: string, name: string | undefined, format: OpenPencilImportFormat): Promise<ImportDocumentResult | undefined> {
        if (!this.resolvePenFigmaPackagePath()) {
            return undefined;
        }
        const module = await this.loadPenFigmaModule();
        if (!module) {
            return undefined;
        }
        const trimmed = source.trim();
        const fileName = name ?? 'Imported Figma Design';
        if (format === 'figma-clipboard-html' || (format === 'auto' && typeof module.isFigmaClipboardHtml === 'function' && (module.isFigmaClipboardHtml as (html: string) => boolean)(trimmed))) {
            return this.tryImportFigmaClipboardHtml(module, trimmed, fileName);
        }
        if (format === 'figma-fig-base64') {
            return this.tryImportFigmaBase64(module, trimmed, fileName);
        }
        const parsed = this.tryParseJson(trimmed);
        if (parsed !== undefined) {
            if (Array.isArray(parsed)) {
                const nodes = this.tryImportFigmaNodeChangesWithPenFigma(module, parsed, fileName);
                if (nodes) {
                    return nodes;
                }
            }
            const decoded = this.toFigmaDecodedFile(parsed);
            if (decoded) {
                return this.tryImportFigmaDecodedJson(module, decoded, fileName);
            }
        }
        return undefined;
    }

    protected tryImportFigmaDecodedJson(module: PenFigmaModule, decoded: OpenPencilBridgeJsonObject, name: string): ImportDocumentResult | undefined {
        const converter = module.figmaAllPagesToPenDocument;
        if (typeof converter !== 'function') {
            return undefined;
        }
        try {
            const result = converter(decoded, name, 'openpencil') as unknown;
            return this.normalizePenFigmaDocumentResult(result, name, 'pen-figma-direct');
        } catch {
            return undefined;
        }
    }

    protected tryImportFigmaNodeChangesWithPenFigma(module: PenFigmaModule, nodeChanges: OpenPencilBridgeJsonValue[], name: string): ImportDocumentResult | undefined {
        const converter = module.figmaNodeChangesToPenNodes;
        if (typeof converter !== 'function') {
            return undefined;
        }
        try {
            const result = converter({ nodeChanges, blobs: [], imageFiles: new Map<string, Uint8Array>() }, 'openpencil') as unknown;
            if (!this.isBridgeJsonObject(result) || !Array.isArray(result.nodes) || !result.nodes.length) {
                return undefined;
            }
            const document = this.documents.normalize({
                ...this.documents.createDesign(name),
                name,
                children: [],
                pages: [{
                    ...this.documents.createPage('Figma Selection'),
                    children: result.nodes as OpenPencilNode[]
                }]
            });
            return {
                adapter: 'pen-figma-direct',
                document,
                warnings: this.resolveStringArray(result.warnings)
            };
        } catch {
            return undefined;
        }
    }

    protected tryImportFigmaClipboardHtml(module: PenFigmaModule, html: string, name: string): ImportDocumentResult | undefined {
        const extract = module.extractFigmaClipboardData;
        const convert = module.figmaClipboardToNodes;
        if (typeof extract !== 'function' || typeof convert !== 'function') {
            return undefined;
        }
        try {
            const clipboard = extract(html) as unknown;
            if (!this.isBridgeJsonObject(clipboard) || !(clipboard.buffer instanceof ArrayBuffer)) {
                return undefined;
            }
            const result = convert(clipboard.buffer, html) as unknown;
            if (!this.isBridgeJsonObject(result) || !Array.isArray(result.nodes)) {
                return undefined;
            }
            const document = this.documents.normalize({
                ...this.documents.createDesign(name),
                name,
                children: result.nodes as OpenPencilNode[],
                pages: [{
                    ...this.documents.createPage('Figma Clipboard'),
                    children: result.nodes as OpenPencilNode[]
                }]
            });
            return {
                adapter: 'pen-figma-direct',
                document,
                warnings: this.resolveStringArray(result.warnings)
            };
        } catch {
            return undefined;
        }
    }

    protected tryImportFigmaBase64(module: PenFigmaModule, source: string, name: string): ImportDocumentResult | undefined {
        const parse = module.parseFigFile;
        if (typeof parse !== 'function') {
            return undefined;
        }
        try {
            const decoded = parse(this.toExactArrayBuffer(this.decodeBase64Payload(source))) as unknown;
            if (!this.isBridgeJsonObject(decoded)) {
                return undefined;
            }
            return this.tryImportFigmaDecodedJson(module, decoded, name);
        } catch {
            return undefined;
        }
    }

    protected normalizePenFigmaDocumentResult(result: unknown, name: string, adapter: string): ImportDocumentResult | undefined {
        if (!this.isBridgeJsonObject(result) || !this.isBridgeJsonObject(result.document)) {
            return undefined;
        }
        const document = this.documents.normalize({
            ...result.document,
            name: typeof result.document.name === 'string' ? result.document.name : name
        } as unknown as OpenPencilDocument);
        return {
            adapter,
            document,
            warnings: this.resolveStringArray(result.warnings)
        };
    }

    protected tryImportFigmaStructurally(source: string, name: string | undefined): ImportDocumentResult | undefined {
        for (const parsed of this.resolveFigmaJsonCandidates(source)) {
            const documentName = name ?? this.resolveFigmaName(parsed) ?? 'Imported Figma Design';
            const decoded = this.toFigmaDecodedFile(parsed);
            if (decoded && Array.isArray(decoded.nodeChanges)) {
                const document = this.importFigmaNodeChanges(decoded.nodeChanges, documentName);
                if (document) {
                    return {
                        adapter: 'figma-structural-json',
                        document,
                        warnings: ['Imported decoded Figma nodeChanges structurally; vector paths and binary image blobs may be lossy, but layout, constraints, paints, effects, images, and text metadata are preserved when present.']
                    };
                }
            }
            if (Array.isArray(parsed) && parsed.some(item => this.isBridgeJsonObject(item) && !!this.resolveFigmaType(item))) {
                const document = this.importFigmaNodeArray(parsed.filter(this.isBridgeJsonObject), documentName);
                if (document) {
                    return {
                        adapter: 'figma-structural-json',
                        document,
                        warnings: ['Imported copied Figma node JSON structurally; component instances are preserved as references and raw Figma metadata is retained under node.figma.']
                    };
                }
            }
            const restNodes = this.resolveFigmaRestNodes(parsed);
            if (restNodes.length) {
                const document = this.importFigmaNodeArray(restNodes, documentName);
                if (document) {
                    return {
                        adapter: 'figma-structural-json',
                        document,
                        warnings: ['Imported Figma REST nodes JSON structurally; node-level layout, constraints, fills, strokes, images, effects, and text metadata are preserved.']
                    };
                }
            }
            if (this.isBridgeJsonObject(parsed) && this.resolveFigmaType(parsed) && !['DOCUMENT', 'CANVAS'].includes(this.resolveFigmaType(parsed)!)) {
                const document = this.importFigmaNodeArray([parsed], documentName);
                if (document) {
                    return {
                        adapter: 'figma-structural-json',
                        document,
                        warnings: ['Imported copied Figma node JSON structurally; raw Figma metadata is retained under node.figma.']
                    };
                }
            }
            const restDocument = this.resolveFigmaRestDocument(parsed);
            if (restDocument) {
                const document = this.importFigmaRestDocument(restDocument, documentName);
                if (document) {
                    return {
                        adapter: 'figma-structural-json',
                        document,
                        warnings: ['Imported Figma REST file JSON structurally; node-level layout, constraints, fills, strokes, images, effects, and text metadata are preserved.']
                    };
                }
            }
        }
        return undefined;
    }

    protected resolveFigmaJsonCandidates(source: string): unknown[] {
        const candidates: unknown[] = [];
        const seen = new Set<string>();
        const addCandidate = (raw: string | undefined) => {
            if (!raw) {
                return;
            }
            const decoded = this.decodeHtml(raw.trim());
            const uriDecoded = this.tryDecodeUriComponent(decoded);
            for (const text of [decoded, uriDecoded, this.tryDecodeBase64JsonText(decoded), uriDecoded ? this.tryDecodeBase64JsonText(uriDecoded) : undefined]) {
                if (!text) {
                    continue;
                }
                const parsed = this.tryParseJson(text.trim());
                if (parsed !== undefined) {
                    const key = JSON.stringify(parsed);
                    if (!seen.has(key)) {
                        seen.add(key);
                        candidates.push(parsed);
                    }
                }
            }
        };

        addCandidate(source);
        for (const match of source.matchAll(/<!--\(figma\)([\s\S]*?)-->/gi)) {
            addCandidate(match[1]);
        }
        for (const match of source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
            addCandidate(match[1]);
        }
        for (const match of source.matchAll(/\bdata-(?:buffer|figma|figmeta|metadata|clipboard|content)=["']([^"']+)["']/gi)) {
            addCandidate(match[1]);
        }
        for (const match of source.matchAll(/\b(?:figmeta|figmaData|clipboardData)\s*[:=]\s*["']([^"']+)["']/gi)) {
            addCandidate(match[1]);
        }
        return candidates;
    }

    protected tryDecodeUriComponent(value: string): string | undefined {
        if (!/%[0-9a-f]{2}/i.test(value)) {
            return undefined;
        }
        try {
            return decodeURIComponent(value);
        } catch {
            return undefined;
        }
    }

    protected tryDecodeBase64JsonText(value: string): string | undefined {
        const normalized = value.replace(/^data:[^,]+,/, '').replace(/\s/g, '').replace(/-/g, '+').replace(/_/g, '/');
        if (!/^[a-z0-9+/]+={0,2}$/i.test(normalized) || normalized.length < 8) {
            return undefined;
        }
        try {
            const decoded = Buffer.from(normalized, 'base64').toString('utf8').trim();
            return decoded.startsWith('{') || decoded.startsWith('[') ? decoded : undefined;
        } catch {
            return undefined;
        }
    }

    protected importFigmaNodeChanges(nodeChanges: OpenPencilBridgeJsonValue[], name: string): OpenPencilDocument | undefined {
        const nodes = nodeChanges.filter(this.isBridgeJsonObject);
        if (!nodes.length) {
            return undefined;
        }
        const nodeById = new Map<string, OpenPencilBridgeJsonObject>();
        const childrenByParent = new Map<string, OpenPencilBridgeJsonObject[]>();
        for (const node of nodes) {
            const id = this.resolveFigmaNodeId(node);
            if (!id) {
                continue;
            }
            nodeById.set(id, node);
            const parent = this.resolveFigmaParentId(node);
            if (parent) {
                const children = childrenByParent.get(parent) ?? [];
                children.push(node);
                childrenByParent.set(parent, children);
            }
        }
        const canvases = nodes.filter(node => this.resolveFigmaType(node) === 'CANVAS');
        const pages = canvases.map((canvas, index) => {
            const canvasId = this.resolveFigmaNodeId(canvas);
            const children = canvasId ? this.importFigmaChildNodes(childrenByParent.get(canvasId) ?? [], childrenByParent) : [];
            return {
                id: `figma-page-${index}`,
                name: typeof canvas.name === 'string' ? canvas.name : `Page ${index + 1}`,
                width: this.resolveFigmaSize(canvas, 'width') ?? this.estimatePageSize(children, 'width') ?? 900,
                height: this.resolveFigmaSize(canvas, 'height') ?? this.estimatePageSize(children, 'height') ?? 620,
                background: '#ffffff',
                gridSize: 20,
                showGrid: true,
                snapToGrid: false,
                children
            };
        });
        if (!pages.length) {
            const rootNodes = nodes.filter(node => {
                const id = this.resolveFigmaNodeId(node);
                const parent = this.resolveFigmaParentId(node);
                return !!id && (!parent || !nodeById.has(parent));
            });
            const children = this.importFigmaChildNodes(rootNodes, childrenByParent);
            pages.push({
                id: 'figma-page-0',
                name: 'Page 1',
                width: this.estimatePageSize(children, 'width') ?? 900,
                height: this.estimatePageSize(children, 'height') ?? 620,
                background: '#ffffff',
                gridSize: 20,
                showGrid: true,
                snapToGrid: false,
                children
            });
        }
        return this.documents.normalize({
            version: '0.7.6',
            name,
            activePageId: pages[0].id,
            children: [],
            pages
        });
    }

    protected importFigmaNodeArray(nodes: OpenPencilBridgeJsonObject[], name: string): OpenPencilDocument | undefined {
        const figmaNodes = nodes.filter(node => !!this.resolveFigmaType(node));
        if (!figmaNodes.length) {
            return undefined;
        }
        const children = this.importFigmaRestChildren(figmaNodes);
        return this.documents.normalize({
            version: '0.7.6',
            name,
            activePageId: 'figma-page-0',
            children: [],
            pages: [{
                id: 'figma-page-0',
                name: 'Imported Selection',
                width: this.estimatePageSize(children, 'width') ?? 900,
                height: this.estimatePageSize(children, 'height') ?? 620,
                background: '#ffffff',
                gridSize: 20,
                showGrid: true,
                snapToGrid: false,
                children
            }]
        });
    }

    protected importFigmaRestDocument(document: OpenPencilBridgeJsonObject, name: string): OpenPencilDocument | undefined {
        const rootChildren = Array.isArray(document.children) ? document.children.filter(this.isBridgeJsonObject) : [];
        const canvasNodes = this.resolveFigmaType(document) === 'DOCUMENT'
            ? rootChildren.filter(node => this.resolveFigmaType(node) === 'CANVAS')
            : [document];
        const pages = canvasNodes.map((canvas, index) => {
            const children = Array.isArray(canvas.children) ? this.importFigmaRestChildren(canvas.children.filter(this.isBridgeJsonObject)) : [];
            return {
                id: this.sanitizeId(typeof canvas.id === 'string' ? canvas.id : `figma-page-${index}`, `figma-page-${index}`),
                name: typeof canvas.name === 'string' ? canvas.name : `Page ${index + 1}`,
                width: this.resolveFigmaSize(canvas, 'width') ?? this.estimatePageSize(children, 'width') ?? 900,
                height: this.resolveFigmaSize(canvas, 'height') ?? this.estimatePageSize(children, 'height') ?? 620,
                background: '#ffffff',
                gridSize: 20,
                showGrid: true,
                snapToGrid: false,
                children
            };
        });
        if (!pages.length) {
            return undefined;
        }
        return this.documents.normalize({
            version: '0.7.6',
            name,
            activePageId: pages[0].id,
            children: [],
            pages
        });
    }

    protected importFigmaRestChildren(nodes: OpenPencilBridgeJsonObject[]): OpenPencilNode[] {
        return nodes.map(node => {
            const children = Array.isArray(node.children) ? this.importFigmaRestChildren(node.children.filter(this.isBridgeJsonObject)) : undefined;
            return this.createStructuralFigmaNode(node, children);
        });
    }

    protected importFigmaChildNodes(nodes: OpenPencilBridgeJsonObject[], childrenByParent: Map<string, OpenPencilBridgeJsonObject[]>): OpenPencilNode[] {
        return nodes.map(node => {
            const id = this.resolveFigmaNodeId(node);
            const children = id ? this.importFigmaChildNodes(childrenByParent.get(id) ?? [], childrenByParent) : undefined;
            return this.createStructuralFigmaNode(node, children);
        });
    }

    protected createStructuralFigmaNode(node: OpenPencilBridgeJsonObject, children: OpenPencilNode[] | undefined): OpenPencilNode {
        const figmaType = this.resolveFigmaType(node);
        const imagePaint = this.resolveFigmaImagePaint(node);
        const type = imagePaint ? 'image' : this.mapFigmaNodeType(figmaType);
        const fill = this.resolveFigmaFill(node);
        const stroke = this.resolveFigmaStroke(node);
        const effects = this.resolveFigmaEffects(node);
        const size = this.resolveFigmaSizeVector(node);
        const transform = this.isBridgeJsonObject(node.absoluteBoundingBox)
            ? node.absoluteBoundingBox
            : this.isBridgeJsonObject(node.absoluteRenderBounds)
                ? node.absoluteRenderBounds
                : undefined;
        const layout = this.resolveFigmaLayout(node);
        const textStyle = this.resolveFigmaTextStyle(node);
        const metadata = this.resolveFigmaMetadata(node);
        const result: OpenPencilNode = {
            id: this.sanitizeId(this.resolveFigmaNodeId(node) ?? (typeof node.id === 'string' ? node.id : undefined), 'figma-node'),
            type,
            name: typeof node.name === 'string' ? node.name : undefined,
            x: this.resolveFigmaX(node, transform),
            y: this.resolveFigmaY(node, transform),
            width: this.resolveFigmaNumber(transform?.width) ?? size.width ?? 120,
            height: this.resolveFigmaNumber(transform?.height) ?? size.height ?? (type === 'text' ? 32 : 80),
            rotation: this.resolveFigmaRotation(node),
            visible: typeof node.visible === 'boolean' ? node.visible : undefined,
            opacity: typeof node.opacity === 'number' ? node.opacity : undefined,
            locked: typeof node.locked === 'boolean' ? node.locked : undefined,
            clipContent: typeof node.clipsContent === 'boolean' ? node.clipsContent : undefined,
            ...(fill ? { fill } : {}),
            ...(stroke ? { stroke } : {}),
            ...(effects ? { effects } : {}),
            ...(layout ? layout : {}),
            ...(metadata ? { figma: metadata } : {}),
            ...(this.isBridgeJsonObject(node.constraints) ? { constraints: this.cloneJsonObject(node.constraints) } : {}),
            ...(children?.length ? { children } : {})
        };
        if (type === 'text') {
            result.content = this.resolveFigmaTextContent(node);
            Object.assign(result, textStyle);
        }
        if (type === 'image') {
            result.src = this.resolveFigmaImageSource(imagePaint);
            result.objectFit = this.resolveFigmaObjectFit(imagePaint);
        }
        const cornerRadius = this.resolveFigmaCornerRadius(node);
        if (cornerRadius !== undefined) {
            result.cornerRadius = cornerRadius;
        }
        return result;
    }

    protected mapFigmaNodeType(type: string | undefined): OpenPencilNode['type'] {
        switch (type) {
            case 'DOCUMENT':
            case 'CANVAS':
            case 'FRAME':
            case 'COMPONENT':
            case 'COMPONENT_SET':
            case 'SECTION':
                return 'frame';
            case 'GROUP':
            case 'BOOLEAN_OPERATION':
                return 'group';
            case 'TEXT':
                return 'text';
            case 'ELLIPSE':
                return 'ellipse';
            case 'LINE':
                return 'line';
            case 'REGULAR_POLYGON':
            case 'STAR':
                return 'polygon';
            case 'VECTOR':
                return 'path';
            case 'INSTANCE':
                return 'ref';
            default:
                return 'rectangle';
        }
    }

    protected resolveFigmaFill(node: OpenPencilBridgeJsonObject): OpenPencilFill[] | undefined {
        const paints = Array.isArray(node.fills)
            ? node.fills
            : Array.isArray(node.fillPaints)
                ? node.fillPaints
                : Array.isArray(node.backgroundPaints)
                    ? node.backgroundPaints
                    : undefined;
        if (!paints) {
            return undefined;
        }
        const fills = paints.filter(this.isBridgeJsonObject).map(paint => this.resolveFigmaPaint(paint)).filter((fill): fill is OpenPencilFill => !!fill);
        return fills.length ? fills : undefined;
    }

    protected resolveFigmaPaint(paint: OpenPencilBridgeJsonObject): OpenPencilFill | undefined {
        if (paint.visible === false) {
            return undefined;
        }
        if (paint.type === 'IMAGE') {
            return {
                type: 'image',
                color: '#e5e7eb',
                src: this.resolveFigmaImageSource(paint),
                mode: this.resolveFigmaFillMode(paint),
                opacity: this.resolveFigmaPaintOpacity(paint),
                blendMode: typeof paint.blendMode === 'string' ? paint.blendMode : undefined,
                explain: 'Figma image paint metadata preserved; binary image blob was not present in structural JSON import.'
            };
        }
        if (typeof paint.type === 'string' && paint.type.toUpperCase().includes('GRADIENT')) {
            const stops = Array.isArray(paint.gradientStops)
                ? paint.gradientStops.filter(this.isBridgeJsonObject).map(stop => ({
                    offset: this.resolveFigmaNumber(stop.position) ?? this.resolveFigmaNumber(stop.offset),
                    color: this.isBridgeJsonObject(stop.color) ? this.figmaColorToHex(stop.color, undefined, false) : undefined
                }))
                : undefined;
            return {
                type: paint.type.toLowerCase(),
                colors: stops,
                stops,
                opacity: this.resolveFigmaPaintOpacity(paint),
                blendMode: typeof paint.blendMode === 'string' ? paint.blendMode : undefined
            };
        }
        const color = this.isBridgeJsonObject(paint.color) ? this.figmaColorToHex(paint.color, undefined, false) : undefined;
        return color ? {
            type: 'solid',
            color,
            opacity: this.resolveFigmaPaintOpacity(paint),
            blendMode: typeof paint.blendMode === 'string' ? paint.blendMode : undefined
        } : undefined;
    }

    protected resolveFigmaStroke(node: OpenPencilBridgeJsonObject): OpenPencilNode['stroke'] | undefined {
        const paints = Array.isArray(node.strokes)
            ? node.strokes
            : Array.isArray(node.strokePaints)
                ? node.strokePaints
                : undefined;
        const firstPaint = paints?.filter(this.isBridgeJsonObject).map(paint => this.resolveFigmaPaint(paint)).find(Boolean);
        const width = this.resolveFigmaStrokeWidth(node);
        if (!firstPaint && width === undefined) {
            return undefined;
        }
        return {
            color: firstPaint?.color ?? '#000000',
            width: width ?? 1,
            opacity: firstPaint?.opacity,
            align: this.resolveFigmaStrokeAlign(node),
            cap: this.resolveFigmaStrokeCap(node),
            join: this.resolveFigmaStrokeJoin(node),
            dashPattern: Array.isArray(node.dashPattern) ? node.dashPattern.filter((entry): entry is number => typeof entry === 'number') : undefined,
            ...(firstPaint ? { fill: [firstPaint] } : {})
        };
    }

    protected resolveFigmaImagePaint(node: OpenPencilBridgeJsonObject): OpenPencilBridgeJsonObject | undefined {
        const fills = Array.isArray(node.fills)
            ? node.fills
            : Array.isArray(node.fillPaints)
                ? node.fillPaints
                : undefined;
        return fills?.filter(this.isBridgeJsonObject).find(paint => paint.visible !== false && paint.type === 'IMAGE');
    }

    protected resolveFigmaImageSource(paint: OpenPencilBridgeJsonObject | undefined): string | undefined {
        if (!paint) {
            return undefined;
        }
        for (const key of ['src', 'url', 'imageRef', 'imageHash', 'hash']) {
            const value = paint[key];
            if (typeof value === 'string' && value.trim()) {
                return key === 'src' || key === 'url' ? value : `figma:image:${value}`;
            }
        }
        return undefined;
    }

    protected resolveFigmaObjectFit(paint: OpenPencilBridgeJsonObject | undefined): OpenPencilNode['objectFit'] {
        const scaleMode = typeof paint?.scaleMode === 'string' ? paint.scaleMode.toUpperCase() : undefined;
        if (scaleMode === 'FIT') {
            return 'contain';
        }
        if (scaleMode === 'CROP') {
            return 'crop';
        }
        if (scaleMode === 'TILE') {
            return 'tile';
        }
        return 'cover';
    }

    protected resolveFigmaFillMode(paint: OpenPencilBridgeJsonObject | undefined): OpenPencilFill['mode'] {
        const scaleMode = typeof paint?.scaleMode === 'string' ? paint.scaleMode.toUpperCase() : undefined;
        if (scaleMode === 'FIT') {
            return 'fit';
        }
        if (scaleMode === 'CROP') {
            return 'crop';
        }
        if (scaleMode === 'TILE') {
            return 'tile';
        }
        return 'fill';
    }

    protected resolveFigmaPaintOpacity(paint: OpenPencilBridgeJsonObject): number | undefined {
        const paintOpacity = typeof paint.opacity === 'number' ? paint.opacity : 1;
        const colorOpacity = this.isBridgeJsonObject(paint.color) && typeof paint.color.a === 'number' ? paint.color.a : 1;
        const opacity = paintOpacity * colorOpacity;
        return opacity >= 0 && opacity < 1 ? opacity : undefined;
    }

    protected resolveFigmaStrokeWidth(node: OpenPencilBridgeJsonObject): number | undefined {
        if (typeof node.strokeWeight === 'number') {
            return node.strokeWeight;
        }
        if (this.isBridgeJsonObject(node.individualStrokeWeights)) {
            const values = Object.values(node.individualStrokeWeights).filter((entry): entry is number => typeof entry === 'number');
            return values.length ? Math.max(...values) : undefined;
        }
        return undefined;
    }

    protected resolveFigmaStrokeAlign(node: OpenPencilBridgeJsonObject): NonNullable<OpenPencilNode['stroke']>['align'] | undefined {
        const align = typeof node.strokeAlign === 'string' ? node.strokeAlign.toUpperCase() : undefined;
        if (align === 'INSIDE') {
            return 'inside';
        }
        if (align === 'OUTSIDE') {
            return 'outside';
        }
        return align ? 'center' : undefined;
    }

    protected resolveFigmaStrokeCap(node: OpenPencilBridgeJsonObject): NonNullable<OpenPencilNode['stroke']>['cap'] | undefined {
        const cap = typeof node.strokeCap === 'string' ? node.strokeCap.toUpperCase() : undefined;
        if (cap === 'ROUND') {
            return 'round';
        }
        if (cap === 'SQUARE') {
            return 'square';
        }
        return cap ? 'none' : undefined;
    }

    protected resolveFigmaStrokeJoin(node: OpenPencilBridgeJsonObject): NonNullable<OpenPencilNode['stroke']>['join'] | undefined {
        const join = typeof node.strokeJoin === 'string' ? node.strokeJoin.toUpperCase() : undefined;
        if (join === 'ROUND') {
            return 'round';
        }
        if (join === 'BEVEL') {
            return 'bevel';
        }
        return join ? 'miter' : undefined;
    }

    protected resolveFigmaEffects(node: OpenPencilBridgeJsonObject): OpenPencilEffect[] | undefined {
        if (!Array.isArray(node.effects)) {
            return undefined;
        }
        const effects = node.effects.filter(this.isBridgeJsonObject).map((effect): OpenPencilEffect | undefined => {
            if (effect.visible === false) {
                return undefined;
            }
            const type = typeof effect.type === 'string' ? effect.type.toUpperCase() : '';
            if (type === 'DROP_SHADOW' || type === 'INNER_SHADOW') {
                const offset: OpenPencilBridgeJsonObject = this.isBridgeJsonObject(effect.offset) ? effect.offset : {};
                return {
                    type: 'shadow',
                    inner: type === 'INNER_SHADOW',
                    offsetX: this.resolveFigmaNumber(offset.x) ?? 0,
                    offsetY: this.resolveFigmaNumber(offset.y) ?? 0,
                    blur: this.resolveFigmaNumber(effect.radius) ?? 0,
                    spread: this.resolveFigmaNumber(effect.spread) ?? 0,
                    color: this.isBridgeJsonObject(effect.color) ? this.figmaColorToHex(effect.color, undefined) : '#000000'
                } satisfies OpenPencilEffect;
            }
            if (type === 'LAYER_BLUR' || type === 'BACKGROUND_BLUR') {
                return {
                    type: type === 'BACKGROUND_BLUR' ? 'background_blur' : 'blur',
                    radius: this.resolveFigmaNumber(effect.radius) ?? 0
                } satisfies OpenPencilEffect;
            }
            return undefined;
        }).filter((effect): effect is OpenPencilEffect => !!effect);
        return effects.length ? effects : undefined;
    }

    protected resolveFigmaLayout(node: OpenPencilBridgeJsonObject): Partial<OpenPencilNode> | undefined {
        const layoutMode = typeof node.layoutMode === 'string' ? node.layoutMode.toUpperCase() : undefined;
        const layout = layoutMode === 'HORIZONTAL'
            ? 'horizontal'
            : layoutMode === 'VERTICAL'
                ? 'vertical'
                : undefined;
        const result: Partial<OpenPencilNode> = {};
        if (layout) {
            result.layout = layout;
        }
        const gap = this.resolveFigmaNumber(node.itemSpacing) ?? this.resolveFigmaNumber(node.counterAxisSpacing);
        if (gap !== undefined) {
            result.gap = gap;
        }
        const padding = this.resolveFigmaPadding(node);
        if (padding !== undefined) {
            result.padding = padding;
        }
        const justifyContent = this.resolveFigmaJustifyContent(node);
        if (justifyContent) {
            result.justifyContent = justifyContent;
        }
        const alignItems = this.resolveFigmaAlignItems(node);
        if (alignItems) {
            result.alignItems = alignItems;
        }
        const widthSizing = this.resolveFigmaSizing(node.layoutSizingHorizontal ?? node.primaryAxisSizingMode);
        const heightSizing = this.resolveFigmaSizing(node.layoutSizingVertical ?? node.counterAxisSizingMode);
        if (widthSizing) {
            result.width = widthSizing;
        }
        if (heightSizing) {
            result.height = heightSizing;
        }
        if (typeof node.layoutAlign === 'string') {
            result.layoutAlign = node.layoutAlign;
        }
        if (typeof node.layoutGrow === 'number') {
            result.layoutGrow = node.layoutGrow;
        }
        return Object.keys(result).length ? result : undefined;
    }

    protected resolveFigmaPadding(node: OpenPencilBridgeJsonObject): OpenPencilNode['padding'] | undefined {
        const top = this.resolveFigmaNumber(node.paddingTop);
        const right = this.resolveFigmaNumber(node.paddingRight);
        const bottom = this.resolveFigmaNumber(node.paddingBottom);
        const left = this.resolveFigmaNumber(node.paddingLeft);
        if ([top, right, bottom, left].every(value => value === undefined)) {
            return undefined;
        }
        return [top ?? 0, right ?? 0, bottom ?? 0, left ?? 0];
    }

    protected resolveFigmaJustifyContent(node: OpenPencilBridgeJsonObject): OpenPencilNode['justifyContent'] | undefined {
        const value = typeof node.primaryAxisAlignItems === 'string' ? node.primaryAxisAlignItems.toUpperCase() : undefined;
        if (value === 'CENTER') {
            return 'center';
        }
        if (value === 'MAX') {
            return 'end';
        }
        if (value === 'SPACE_BETWEEN') {
            return 'space_between';
        }
        return value ? 'start' : undefined;
    }

    protected resolveFigmaAlignItems(node: OpenPencilBridgeJsonObject): OpenPencilNode['alignItems'] | undefined {
        const value = typeof node.counterAxisAlignItems === 'string' ? node.counterAxisAlignItems.toUpperCase() : undefined;
        if (value === 'CENTER') {
            return 'center';
        }
        if (value === 'MAX') {
            return 'end';
        }
        return value ? 'start' : undefined;
    }

    protected resolveFigmaSizing(value: OpenPencilBridgeJsonValue | undefined): OpenPencilNode['width'] | undefined {
        if (typeof value !== 'string') {
            return undefined;
        }
        const sizing = value.toUpperCase();
        if (sizing === 'HUG' || sizing === 'AUTO') {
            return 'fit_content';
        }
        if (sizing === 'FILL') {
            return 'fill_container';
        }
        return undefined;
    }

    protected resolveFigmaTextStyle(node: OpenPencilBridgeJsonObject): Partial<OpenPencilNode> {
        const textData = this.isBridgeJsonObject(node.textData) ? node.textData : undefined;
        const style: OpenPencilBridgeJsonObject = this.isBridgeJsonObject(node.style)
            ? node.style
            : textData && this.isBridgeJsonObject(textData.style)
                ? textData.style
                : {};
        const result: Partial<OpenPencilNode> = {};
        const fontSize = this.resolveFigmaNumber(node.fontSize) ?? this.resolveFigmaNumber(style.fontSize);
        if (fontSize !== undefined) {
            result.fontSize = fontSize;
        }
        if (typeof style.fontFamily === 'string') {
            result.fontFamily = style.fontFamily;
        }
        if (typeof style.fontWeight === 'number') {
            result.fontWeight = style.fontWeight;
        }
        if (typeof style.fontStyle === 'string') {
            result.fontStyle = style.fontStyle.toLowerCase().includes('italic') ? 'italic' : 'normal';
        }
        const letterSpacing = this.resolveFigmaNumber(style.letterSpacing);
        if (letterSpacing !== undefined) {
            result.letterSpacing = letterSpacing;
        }
        const lineHeight = this.resolveFigmaNumber(style.lineHeightPx) ?? this.resolveFigmaNumber(style.lineHeightPercentFontSize);
        if (lineHeight !== undefined) {
            result.lineHeight = lineHeight;
        }
        result.textAlign = this.resolveFigmaTextAlign(style.textAlignHorizontal);
        result.textAlignVertical = this.resolveFigmaTextAlignVertical(style.textAlignVertical);
        if (typeof style.textDecoration === 'string') {
            const decoration = style.textDecoration.toUpperCase();
            result.underline = decoration.includes('UNDERLINE') || undefined;
            result.strikethrough = decoration.includes('STRIKETHROUGH') || undefined;
        }
        return result;
    }

    protected resolveFigmaTextContent(node: OpenPencilBridgeJsonObject): string | OpenPencilStyledTextSegment[] {
        const textData = this.isBridgeJsonObject(node.textData) ? node.textData : undefined;
        const characters = typeof node.characters === 'string'
            ? node.characters
            : textData && typeof textData.characters === 'string'
                ? textData.characters
                : typeof node.name === 'string'
                    ? node.name
                    : 'Text';
        const overrides = Array.isArray(node.characterStyleOverrides) ? node.characterStyleOverrides : undefined;
        const styleTable = this.isBridgeJsonObject(node.styleOverrideTable) ? node.styleOverrideTable : undefined;
        if (!overrides?.length || !styleTable) {
            return characters;
        }
        const segments: OpenPencilStyledTextSegment[] = [];
        let start = 0;
        let current = overrides[0];
        for (let index = 1; index <= characters.length; index++) {
            if (index === characters.length || overrides[index] !== current) {
                const text = characters.slice(start, index);
                const style = typeof current === 'number' || typeof current === 'string' ? styleTable[String(current)] : undefined;
                segments.push({
                    text,
                    ...this.resolveFigmaStyledTextSegment(style)
                });
                start = index;
                current = overrides[index];
            }
        }
        return segments.length ? segments : characters;
    }

    protected resolveFigmaStyledTextSegment(style: OpenPencilBridgeJsonValue | undefined): Omit<OpenPencilStyledTextSegment, 'text'> {
        if (!this.isBridgeJsonObject(style)) {
            return {};
        }
        const segment: Omit<OpenPencilStyledTextSegment, 'text'> = {};
        if (typeof style.fontFamily === 'string') {
            segment.fontFamily = style.fontFamily;
        }
        if (typeof style.fontSize === 'number') {
            segment.fontSize = style.fontSize;
        }
        if (typeof style.fontWeight === 'number') {
            segment.fontWeight = style.fontWeight;
        }
        if (typeof style.fontStyle === 'string') {
            segment.fontStyle = style.fontStyle.toLowerCase().includes('italic') ? 'italic' : 'normal';
        }
        const fills = Array.isArray(style.fills) ? style.fills : undefined;
        const firstFill = fills?.find(this.isBridgeJsonObject);
        const fill = firstFill
            ? this.resolveFigmaPaint(firstFill)?.color
            : undefined;
        if (fill) {
            segment.fill = fill;
        }
        return segment;
    }

    protected resolveFigmaTextAlign(value: OpenPencilBridgeJsonValue | undefined): OpenPencilNode['textAlign'] | undefined {
        const align = typeof value === 'string' ? value.toUpperCase() : undefined;
        if (align === 'CENTER') {
            return 'center';
        }
        if (align === 'RIGHT') {
            return 'right';
        }
        if (align === 'JUSTIFIED') {
            return 'justify';
        }
        return align ? 'left' : undefined;
    }

    protected resolveFigmaTextAlignVertical(value: OpenPencilBridgeJsonValue | undefined): OpenPencilNode['textAlignVertical'] | undefined {
        const align = typeof value === 'string' ? value.toUpperCase() : undefined;
        if (align === 'CENTER') {
            return 'middle';
        }
        if (align === 'BOTTOM') {
            return 'bottom';
        }
        return align ? 'top' : undefined;
    }

    protected resolveFigmaCornerRadius(node: OpenPencilBridgeJsonObject): OpenPencilNode['cornerRadius'] | undefined {
        if (typeof node.cornerRadius === 'number') {
            return node.cornerRadius;
        }
        const radii = ['topLeftRadius', 'topRightRadius', 'bottomRightRadius', 'bottomLeftRadius'].map(key => this.resolveFigmaNumber(node[key]));
        return radii.some(value => value !== undefined)
            ? [radii[0] ?? 0, radii[1] ?? 0, radii[2] ?? 0, radii[3] ?? 0]
            : undefined;
    }

    protected resolveFigmaMetadata(node: OpenPencilBridgeJsonObject): OpenPencilBridgeJsonObject | undefined {
        const keys = [
            'id',
            'key',
            'type',
            'componentId',
            'componentPropertyReferences',
            'componentProperties',
            'constraints',
            'layoutMode',
            'layoutAlign',
            'layoutGrow',
            'layoutPositioning',
            'layoutSizingHorizontal',
            'layoutSizingVertical',
            'primaryAxisSizingMode',
            'counterAxisSizingMode',
            'styles',
            'style',
            'styleOverrideTable',
            'characterStyleOverrides',
            'exportSettings',
            'blendMode',
            'preserveRatio',
            'reactions',
            'prototypeStartNodeID'
        ];
        const metadata: OpenPencilBridgeJsonObject = {};
        for (const key of keys) {
            const value = node[key];
            if (value !== undefined) {
                metadata[key] = this.cloneJsonValue(value);
            }
        }
        return Object.keys(metadata).length ? metadata : undefined;
    }

    protected resolveFigmaRestDocument(value: unknown): OpenPencilBridgeJsonObject | undefined {
        if (!this.isBridgeJsonObject(value)) {
            return undefined;
        }
        if (this.isBridgeJsonObject(value.document)) {
            return value.document;
        }
        if (this.isBridgeJsonObject(value.file) && this.isBridgeJsonObject(value.file.document)) {
            return value.file.document;
        }
        if (this.isBridgeJsonObject(value.data) && this.isBridgeJsonObject(value.data.document)) {
            return value.data.document;
        }
        if (this.resolveFigmaType(value)) {
            return value;
        }
        if (this.isBridgeJsonObject(value.nodes)) {
            const firstNode = Object.values(value.nodes).find(this.isBridgeJsonObject);
            if (this.isBridgeJsonObject(firstNode?.document)) {
                return firstNode.document;
            }
        }
        return undefined;
    }

    protected resolveFigmaRestNodes(value: unknown): OpenPencilBridgeJsonObject[] {
        if (!this.isBridgeJsonObject(value) || !this.isBridgeJsonObject(value.nodes)) {
            return [];
        }
        return Object.values(value.nodes)
            .filter(this.isBridgeJsonObject)
            .map(entry => this.isBridgeJsonObject(entry.document) ? entry.document : entry)
            .filter(this.isBridgeJsonObject)
            .filter(node => !!this.resolveFigmaType(node));
    }

    protected toFigmaDecodedFile(value: unknown): OpenPencilBridgeJsonObject | undefined {
        if (!this.isBridgeJsonObject(value)) {
            return undefined;
        }
        const nodeChanges = Array.isArray(value.nodeChanges)
            ? value.nodeChanges
            : Array.isArray(value.nodes)
                ? value.nodes
                : undefined;
        if (!nodeChanges) {
            return undefined;
        }
        return {
            ...value,
            nodeChanges,
            blobs: Array.isArray(value.blobs) ? value.blobs : [],
            imageFiles: new Map<string, Uint8Array>() as unknown as OpenPencilBridgeJsonValue
        };
    }

    protected isFigmaJsonLike(value: unknown): boolean {
        if (Array.isArray(value)) {
            return value.some(item => this.isBridgeJsonObject(item) && !!this.resolveFigmaType(item));
        }
        if (!this.isBridgeJsonObject(value)) {
            return false;
        }
        if (Array.isArray(value.nodeChanges)) {
            return true;
        }
        if (this.resolveFigmaRestNodes(value).length) {
            return true;
        }
        const restDocument = this.resolveFigmaRestDocument(value);
        return !!restDocument && !!this.resolveFigmaType(restDocument);
    }

    protected resolveFigmaName(value: unknown): string | undefined {
        if (!this.isBridgeJsonObject(value)) {
            return undefined;
        }
        return typeof value.name === 'string'
            ? value.name
            : this.isBridgeJsonObject(value.document) && typeof value.document.name === 'string'
                ? value.document.name
                : undefined;
    }

    protected resolveFigmaType(node: OpenPencilBridgeJsonObject): string | undefined {
        return typeof node.type === 'string' ? node.type.toUpperCase().replace(/[\s-]/g, '_') : undefined;
    }

    protected resolveFigmaNodeId(node: OpenPencilBridgeJsonObject): string | undefined {
        if (typeof node.id === 'string') {
            return node.id;
        }
        if (this.isBridgeJsonObject(node.guid)) {
            const sessionID = node.guid.sessionID;
            const localID = node.guid.localID;
            if (typeof sessionID === 'number' && typeof localID === 'number') {
                return `${sessionID}:${localID}`;
            }
        }
        return undefined;
    }

    protected resolveFigmaParentId(node: OpenPencilBridgeJsonObject): string | undefined {
        const parent = node.parentIndex;
        if (!this.isBridgeJsonObject(parent) || !this.isBridgeJsonObject(parent.guid)) {
            return undefined;
        }
        const sessionID = parent.guid.sessionID;
        const localID = parent.guid.localID;
        return typeof sessionID === 'number' && typeof localID === 'number' ? `${sessionID}:${localID}` : undefined;
    }

    protected resolveFigmaSizeVector(node: OpenPencilBridgeJsonObject): { width?: number; height?: number } {
        if (this.isBridgeJsonObject(node.size)) {
            return {
                width: this.resolveFigmaNumber(node.size.x),
                height: this.resolveFigmaNumber(node.size.y)
            };
        }
        if (this.isBridgeJsonObject(node.absoluteBoundingBox)) {
            return {
                width: this.resolveFigmaNumber(node.absoluteBoundingBox.width),
                height: this.resolveFigmaNumber(node.absoluteBoundingBox.height)
            };
        }
        if (this.isBridgeJsonObject(node.absoluteRenderBounds)) {
            return {
                width: this.resolveFigmaNumber(node.absoluteRenderBounds.width),
                height: this.resolveFigmaNumber(node.absoluteRenderBounds.height)
            };
        }
        return {};
    }

    protected resolveFigmaSize(node: OpenPencilBridgeJsonObject, axis: 'width' | 'height'): number | undefined {
        const size = this.resolveFigmaSizeVector(node);
        return axis === 'width' ? size.width : size.height;
    }

    protected resolveFigmaX(node: OpenPencilBridgeJsonObject, transform: OpenPencilBridgeJsonObject | undefined): number {
        const absoluteX = this.resolveFigmaNumber(transform?.x);
        if (absoluteX !== undefined) {
            return absoluteX;
        }
        const matrix = Array.isArray(node.relativeTransform)
            ? node.relativeTransform
            : Array.isArray(node.transform)
                ? node.transform
                : undefined;
        const row = Array.isArray(matrix?.[0]) ? matrix[0] : undefined;
        return typeof row?.[2] === 'number' ? row[2] : 0;
    }

    protected resolveFigmaY(node: OpenPencilBridgeJsonObject, transform: OpenPencilBridgeJsonObject | undefined): number {
        const absoluteY = this.resolveFigmaNumber(transform?.y);
        if (absoluteY !== undefined) {
            return absoluteY;
        }
        const matrix = Array.isArray(node.relativeTransform)
            ? node.relativeTransform
            : Array.isArray(node.transform)
                ? node.transform
                : undefined;
        const row = Array.isArray(matrix?.[1]) ? matrix[1] : undefined;
        return typeof row?.[2] === 'number' ? row[2] : 0;
    }

    protected resolveFigmaRotation(node: OpenPencilBridgeJsonObject): number | undefined {
        if (typeof node.rotation === 'number') {
            return node.rotation;
        }
        const matrix = Array.isArray(node.relativeTransform)
            ? node.relativeTransform
            : Array.isArray(node.transform)
                ? node.transform
                : undefined;
        const row = Array.isArray(matrix?.[0]) ? matrix[0] : undefined;
        const nextRow = Array.isArray(matrix?.[1]) ? matrix[1] : undefined;
        if (typeof row?.[0] === 'number' && typeof nextRow?.[0] === 'number') {
            const degrees = Math.atan2(nextRow[0], row[0]) * 180 / Math.PI;
            return Math.abs(degrees) > 0.001 ? Math.round(degrees * 1000) / 1000 : undefined;
        }
        return undefined;
    }

    protected resolveFigmaNumber(value: OpenPencilBridgeJsonValue | undefined): number | undefined {
        return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
    }

    protected figmaColorToHex(color: OpenPencilBridgeJsonObject, opacity: number | undefined, includeEmbeddedAlpha = true): string {
        const r = this.normalizeColorChannel(color.r);
        const g = this.normalizeColorChannel(color.g);
        const b = this.normalizeColorChannel(color.b);
        const alpha = includeEmbeddedAlpha && typeof color.a === 'number' ? color.a : opacity;
        const hex = `#${this.hexByte(r)}${this.hexByte(g)}${this.hexByte(b)}`;
        return typeof alpha === 'number' && alpha >= 0 && alpha < 1 ? `${hex}${this.hexByte(alpha)}` : hex;
    }

    protected normalizeColorChannel(value: OpenPencilBridgeJsonValue | undefined): number {
        if (typeof value !== 'number' || !Number.isFinite(value)) {
            return 0;
        }
        return value <= 1 ? Math.round(value * 255) : Math.round(value);
    }

    protected hexByte(value: number): string {
        return Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0');
    }

    protected estimatePageSize(nodes: OpenPencilNode[], axis: 'width' | 'height'): number | undefined {
        if (!nodes.length) {
            return undefined;
        }
        const max = Math.max(...nodes.map(node => {
            const position = axis === 'width' ? node.x : node.y;
            const size = axis === 'width' ? node.width : node.height;
            return (typeof position === 'number' ? position : 0) + (typeof size === 'number' ? size : 0);
        }));
        return Math.max(axis === 'width' ? 900 : 620, Math.ceil(max + 80));
    }

    protected sanitizeId(value: string | undefined, fallback: string): string {
        const base = value?.trim() || fallback;
        return base.replace(/[^a-zA-Z0-9_.:-]/g, '-');
    }

    protected tryParseJson(value: string): unknown {
        try {
            return JSON.parse(value);
        } catch {
            return undefined;
        }
    }

    protected decodeHtml(value: string): string {
        return value
            .replace(/&quot;/g, '"')
            .replace(/&#34;/g, '"')
            .replace(/&#x22;/gi, '"')
            .replace(/&apos;/g, "'")
            .replace(/&#39;/g, "'")
            .replace(/&#x27;/gi, "'")
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&');
    }

    protected cloneJsonValue(value: OpenPencilBridgeJsonValue | undefined): OpenPencilBridgeJsonValue | undefined {
        if (value === undefined) {
            return undefined;
        }
        return JSON.parse(JSON.stringify(value)) as OpenPencilBridgeJsonValue;
    }

    protected cloneJsonObject(value: OpenPencilBridgeJsonObject): OpenPencilBridgeJsonObject {
        return this.cloneJsonValue(value) as OpenPencilBridgeJsonObject;
    }

    protected resolveStringArray(value: unknown): string[] | undefined {
        return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : undefined;
    }

    protected decodeBase64Payload(source: string): Uint8Array {
        const base64 = source.trim().replace(/^data:[^,]+,/, '').replace(/\s/g, '');
        return Buffer.from(base64, 'base64');
    }

    protected toExactArrayBuffer(bytes: Uint8Array): ArrayBuffer {
        const buffer = new ArrayBuffer(bytes.byteLength);
        new Uint8Array(buffer).set(bytes);
        return buffer;
    }

    protected executeDocumentValidateOperation(operation: OpenPencilBridgeOperationDescriptor, params: OpenPencilBridgeOperationRequest['params']): OpenPencilBridgeOperationResult {
        if (!this.isBridgeJsonObject(params) || !this.isBridgeJsonObject(params.document)) {
            return this.createBridgeOperationError(operation.id, 'invalidParams', 'Expected params.document to be an object.');
        }
        const validation = this.designCommands.validateDocument(params.document as unknown as OpenPencilDocument);
        return this.createBridgeOperationSuccess(operation, {
            adapter: 'local-document-service',
            validation: validation as unknown as OpenPencilBridgeJsonObject
        });
    }

    protected async executeDocumentExportOperation(operation: OpenPencilBridgeOperationDescriptor, params: OpenPencilBridgeOperationRequest['params']): Promise<OpenPencilBridgeOperationResult> {
        if (!this.isBridgeJsonObject(params)) {
            return this.createBridgeOperationError(operation.id, 'invalidParams', 'Expected an object params payload.');
        }
        const format = params.format;
        if (!this.isExportFormat(format)) {
            return this.createBridgeOperationError(operation.id, 'invalidParams', `Expected params.format to be one of: ${this.exportFormats.join(', ')}.`);
        }
        const document = this.resolveDocumentParam(params.document);
        if (!document) {
            return this.createBridgeOperationError(operation.id, 'invalidParams', 'Expected params.document to be an OpenPencil document object or JSON string.');
        }
        const selection = this.resolveSelectionParam(params.selection);
        if (!selection) {
            return this.createBridgeOperationError(operation.id, 'invalidParams', 'Expected params.selection to be an array of strings when provided.');
        }
        return this.createBridgeOperationSuccess(operation, await this.createExportOperationOutput(
            document,
            format,
            selection,
            params.selectionOnly === true,
            'document-export'
        ));
    }

    protected async executeCodegenGenerateOperation(operation: OpenPencilBridgeOperationDescriptor, params: OpenPencilBridgeOperationRequest['params']): Promise<OpenPencilBridgeOperationResult> {
        if (!this.isBridgeJsonObject(params)) {
            return this.createBridgeOperationError(operation.id, 'invalidParams', 'Expected an object params payload.');
        }
        const format = params.format ?? 'react-tailwind';
        if (!this.isExportFormat(format) || format === 'openpencil-json' || format === 'openpencil-summary-json') {
            return this.createBridgeOperationError(operation.id, 'invalidParams', `Expected params.format to be a code generation format: ${this.exportFormats.filter(entry => !entry.startsWith('openpencil-')).join(', ')}.`);
        }
        const document = this.resolveDocumentParam(params.document);
        if (!document) {
            return this.createBridgeOperationError(operation.id, 'invalidParams', 'Expected params.document to be an OpenPencil document object or JSON string.');
        }
        const selection = this.resolveSelectionParam(params.selection);
        if (!selection) {
            return this.createBridgeOperationError(operation.id, 'invalidParams', 'Expected params.selection to be an array of strings when provided.');
        }
        return this.createBridgeOperationSuccess(operation, await this.createExportOperationOutput(
            document,
            format,
            selection,
            params.selectionOnly === true,
            'codegen-generate'
        ));
    }

    protected async executeCodegenGenerateAllOperation(operation: OpenPencilBridgeOperationDescriptor, params: OpenPencilBridgeOperationRequest['params']): Promise<OpenPencilBridgeOperationResult> {
        if (!this.isBridgeJsonObject(params)) {
            return this.createBridgeOperationError(operation.id, 'invalidParams', 'Expected an object params payload.');
        }
        const document = this.resolveDocumentParam(params.document);
        if (!document) {
            return this.createBridgeOperationError(operation.id, 'invalidParams', 'Expected params.document to be an OpenPencil document object or JSON string.');
        }
        const selection = this.resolveSelectionParam(params.selection);
        if (!selection) {
            return this.createBridgeOperationError(operation.id, 'invalidParams', 'Expected params.selection to be an array of strings when provided.');
        }
        const outputs: OpenPencilBridgeJsonObject[] = [];
        const formats = this.exportFormats.filter((format): format is OpenPencilExportFormat => !format.startsWith('openpencil-'));
        for (const format of formats) {
            outputs.push(await this.createExportOperationOutput(
                document,
                format,
                selection,
                params.selectionOnly === true,
                'codegen-generate-all'
            ));
        }
        return this.createBridgeOperationSuccess(operation, {
            mode: 'codegen-generate-all',
            externalProcessesStarted: false,
            adapterStatus: this.resolveCodegenAdapterStatus(),
            targets: this.resolveCodegenTargets().filter(target => !String(target.id).startsWith('openpencil-')),
            outputs
        });
    }

    protected async createExportOperationOutput(
        document: OpenPencilDocument,
        format: OpenPencilExportFormat,
        selection: string[],
        selectionOnly: boolean,
        mode: string
    ): Promise<OpenPencilBridgeJsonObject> {
        const validation = this.designCommands.validateDocument(document);
        const generation = await this.generateExportContent(document, format, selection, selectionOnly);
        const upstreamCodegen = this.resolveCodegenAdapterStatus();
        const output: OpenPencilBridgeJsonObject = {
            mode,
            format,
            adapter: generation.adapter,
            upstreamCodegen,
            selection,
            selectionOnly,
            validation: validation as unknown as OpenPencilBridgeJsonObject,
            content: generation.content
        };
        if (generation.framework) {
            output.upstreamFramework = generation.framework;
        }
        if (generation.upstreamFunction) {
            output.upstreamFunction = generation.upstreamFunction;
        }
        if (generation.fallbackReason) {
            output.fallbackReason = generation.fallbackReason;
        }
        if (generation.html !== undefined) {
            output.html = generation.html;
        }
        if (generation.css !== undefined) {
            output.css = generation.css;
        }
        return output;
    }

    protected async generateExportContent(
        document: OpenPencilDocument,
        format: OpenPencilExportFormat,
        selection: string[],
        selectionOnly: boolean
    ): Promise<CodegenGenerationResult> {
        if (format === 'openpencil-json' || format === 'openpencil-summary-json') {
            return {
                adapter: 'local-serializer',
                content: this.designCommands.exportDocument(document, selection, format, selectionOnly)
            };
        }
        if (format === 'svg') {
            return {
                adapter: 'local-svg-fallback',
                content: this.designCommands.exportDocument(document, selection, format, selectionOnly)
            };
        }

        const upstream = await this.tryGenerateWithPenCodegen(document, format, selection, selectionOnly);
        if (upstream) {
            return upstream;
        }
        return {
            adapter: 'local-fallback',
            content: this.designCommands.exportDocument(document, selection, format, selectionOnly),
            framework: this.resolvePenCodegenFramework(format),
            fallbackReason: 'Direct @zseven-w/pen-codegen import or generate*FromDocument call failed; used Theia local fallback exporter.'
        };
    }

    protected async tryGenerateWithPenCodegen(
        document: OpenPencilDocument,
        format: OpenPencilExportFormat,
        selection: string[],
        selectionOnly: boolean
    ): Promise<CodegenGenerationResult | undefined> {
        const framework = this.resolvePenCodegenFramework(format);
        if (!framework) {
            return undefined;
        }
        if (!this.resolvePenCodegenPackagePath()) {
            return undefined;
        }
        const codegenModule = await this.loadPenCodegenModule();
        if (!codegenModule) {
            return undefined;
        }
        const generator = this.resolvePenCodegenGenerator(codegenModule, framework);
        if (!generator) {
            return undefined;
        }
        try {
            const codegenDocument = this.createPenCodegenDocument(document, selection, selectionOnly);
            const result = await generator.generator(codegenDocument, codegenDocument.activePageId ?? null);
            return this.normalizePenCodegenResult(result, framework, generator.exportName);
        } catch {
            return undefined;
        }
    }

    protected async loadPenCodegenModule(): Promise<PenCodegenModule | undefined> {
        for (const specifier of this.resolvePenCodegenModuleSpecifiers()) {
            const loaded = await this.tryLoadModuleSpecifier(specifier) as PenCodegenModule | undefined;
            if (loaded) {
                return loaded;
            }
        }
        return undefined;
    }

    protected async loadPenFigmaModule(): Promise<PenFigmaModule | undefined> {
        for (const specifier of this.resolvePenFigmaModuleSpecifiers()) {
            const loaded = await this.tryLoadModuleSpecifier(specifier) as PenFigmaModule | undefined;
            if (loaded) {
                return loaded;
            }
        }
        return undefined;
    }

    protected resolvePenCodegenModuleSpecifiers(): string[] {
        const specifiers = ['@zseven-w/pen-codegen'];
        const packagePath = this.resolvePenCodegenPackagePath();
        const entrypoint = packagePath ? this.resolveVendoredPackageEntrypoint(packagePath, ['dist/index.js', 'src/index.ts', 'index.js']) : undefined;
        if (entrypoint) {
            specifiers.push(entrypoint);
        }
        return specifiers;
    }

    protected resolvePenFigmaModuleSpecifiers(): string[] {
        const specifiers = ['@zseven-w/pen-figma'];
        const packagePath = this.resolvePenFigmaPackagePath();
        const entrypoint = packagePath ? this.resolveVendoredPackageEntrypoint(packagePath, ['dist/index.js', 'src/index.ts', 'index.js']) : undefined;
        if (entrypoint) {
            specifiers.push(entrypoint);
        }
        return specifiers;
    }

    protected async tryLoadModuleSpecifier(specifier: string): Promise<Record<string, unknown> | undefined> {
        try {
            return require(specifier) as Record<string, unknown>;
        } catch {
            try {
                const dynamicImport = new Function('specifier', 'return import(specifier)') as (specifier: string) => Promise<Record<string, unknown>>;
                const importSpecifier = path.isAbsolute(specifier) ? pathToFileURL(specifier).href : specifier;
                return await dynamicImport(importSpecifier);
            } catch {
                return undefined;
            }
        }
    }

    protected resolvePenCodegenGenerator(module: PenCodegenModule, framework: PenCodegenFramework): PenCodegenResolvedGenerator | undefined {
        for (const exportName of this.resolvePenCodegenExportNames(framework)) {
            const candidate = module[exportName];
            if (typeof candidate === 'function') {
                return {
                    exportName,
                    generator: candidate as PenCodegenGenerator
                };
            }
        }
        return undefined;
    }

    protected resolvePenCodegenExportNames(framework: PenCodegenFramework): string[] {
        switch (framework) {
            case 'react':
                return ['generateReactFromDocument'];
            case 'html':
                return ['generateHTMLFromDocument'];
            case 'vue':
                return ['generateVueFromDocument'];
            case 'svelte':
                return ['generateSvelteFromDocument'];
            case 'react-native':
                return ['generateReactNativeFromDocument'];
            case 'flutter':
                return ['generateFlutterFromDocument'];
            case 'swiftui':
                return ['generateSwiftUIFromDocument'];
            case 'compose':
                return ['generateComposeFromDocument', 'generateJetpackComposeFromDocument'];
        }
    }

    protected resolvePenCodegenFramework(format: OpenPencilExportFormat): PenCodegenFramework | undefined {
        switch (format) {
            case 'react-tailwind':
                return 'react';
            case 'html-css':
                return 'html';
            case 'vue':
            case 'svelte':
            case 'react-native':
            case 'flutter':
            case 'swiftui':
                return format;
            case 'jetpack-compose':
                return 'compose';
            default:
                return undefined;
        }
    }

    protected normalizePenCodegenResult(result: unknown, framework: PenCodegenFramework, upstreamFunction: string): CodegenGenerationResult | undefined {
        if (typeof result === 'string') {
            return {
                adapter: 'pen-codegen-direct',
                content: result,
                framework,
                upstreamFunction
            };
        }
        if (!this.isBridgeJsonObject(result)) {
            return undefined;
        }
        const html = typeof result.html === 'string' ? result.html : undefined;
        const css = typeof result.css === 'string' ? result.css : undefined;
        if (framework === 'html' && html !== undefined) {
            return {
                adapter: 'pen-codegen-direct',
                content: this.composeHtmlCssContent(html, css),
                framework,
                upstreamFunction,
                html,
                css
            };
        }
        const content = typeof result.code === 'string'
            ? result.code
            : typeof result.content === 'string'
                ? result.content
                : undefined;
        if (content !== undefined) {
            return {
                adapter: 'pen-codegen-direct',
                content,
                framework,
                upstreamFunction
            };
        }
        return undefined;
    }

    protected composeHtmlCssContent(html: string, css: string | undefined): string {
        if (!css) {
            return html;
        }
        return `${html}\n\n<style>\n${css}\n</style>`;
    }

    protected createPenCodegenDocument(document: OpenPencilDocument, selection: string[], selectionOnly: boolean): OpenPencilRuntimeDocument {
        const cloned = this.cloneJson(document);
        const activePage = this.resolveActivePage(cloned);
        if (!selectionOnly || !selection.length) {
            return toOpenPencilRuntimeDocument(cloned, activePage.id);
        }
        const selectedNodes = this.collectSelectedNodes(activePage.children, selection);
        activePage.children = selectedNodes;
        cloned.children = selectedNodes;
        return toOpenPencilRuntimeDocument(cloned, activePage.id);
    }

    protected resolveActivePage(document: OpenPencilDocument): OpenPencilPage {
        const activePage = document.pages?.find(page => page.id === document.activePageId) ?? document.pages?.[0];
        if (activePage) {
            return activePage;
        }
        return {
            id: document.activePageId ?? 'page-1',
            name: 'Page 1',
            children: document.children
        };
    }

    protected collectSelectedNodes(nodes: OpenPencilNode[], selection: string[]): OpenPencilNode[] {
        const selected = new Set(selection);
        const result: OpenPencilNode[] = [];
        const visit = (items: OpenPencilNode[]) => {
            for (const item of items) {
                if (selected.has(item.id)) {
                    result.push(this.cloneJson(item));
                    continue;
                }
                if (Array.isArray(item.children)) {
                    visit(item.children);
                }
            }
        };
        visit(nodes);
        return result;
    }

    protected cloneJson<T>(value: T): T {
        return JSON.parse(JSON.stringify(value)) as T;
    }

    protected resolveDocumentParam(value: OpenPencilBridgeJsonValue | undefined): OpenPencilDocument | undefined {
        if (typeof value === 'string') {
            return this.tryImportDocument(value);
        }
        if (this.isBridgeJsonObject(value)) {
            return this.tryImportDocument(JSON.stringify(value));
        }
        return undefined;
    }

    protected tryImportDocument(source: string, name?: string): OpenPencilDocument | undefined {
        try {
            return this.designCommands.importDocument(source, name);
        } catch {
            return undefined;
        }
    }

    protected resolveSelectionParam(value: OpenPencilBridgeJsonValue | undefined): string[] | undefined {
        if (value === undefined || value === null) {
            return [];
        }
        return Array.isArray(value) && value.every(item => typeof item === 'string') ? value : undefined;
    }

    protected isExportFormat(value: unknown): value is OpenPencilExportFormat {
        return typeof value === 'string' && this.exportFormats.includes(value as OpenPencilExportFormat);
    }

    protected isNoParamOperation(operationId: string): boolean {
        return [
            'openpencil.backend.capabilities.list',
            'openpencil.backend.status.get',
            'openpencil.mcp.tools.list',
            'openpencil.cli.commands.list',
            'openpencil.codegen.targets.list',
            'openpencil.codegen.adapter.status',
            'openpencil.ai.operations.list',
            'openpencil.import.formats.list',
            'openpencil.document.validation.rules.list'
        ].includes(operationId);
    }

    protected acceptsNoParams(params: OpenPencilBridgeOperationRequest['params']): boolean {
        if (params === undefined || params === null) {
            return true;
        }
        return !Array.isArray(params) && Object.keys(params).length === 0;
    }

    protected isBridgeJsonObject(value: unknown): value is OpenPencilBridgeJsonObject {
        return typeof value === 'object' && value !== null && !Array.isArray(value);
    }

    protected createBridgeOperationSuccess(operation: OpenPencilBridgeOperationDescriptor, output: OpenPencilBridgeOperationResult['output']): OpenPencilBridgeOperationResult {
        return {
            operationId: operation.id,
            ok: true,
            readiness: operation.readiness,
            externalProcessStarted: false,
            output
        };
    }

    protected createBridgeOperationError(
        operationId: string,
        code: OpenPencilBridgeOperationErrorCode,
        message: string,
        readiness: OpenPencilBridgeOperationResult['readiness'] = 'blocked'
    ): OpenPencilBridgeOperationResult {
        return {
            operationId,
            ok: false,
            readiness,
            externalProcessStarted: false,
            error: { code, message }
        };
    }

    protected isVendoredPackageAvailable(entry: OpenPencilUpstreamPackage): boolean {
        return !!entry.vendorPath && this.resolveExistingRelativePath(entry.vendorPath) !== undefined;
    }

    protected resolvePenCodegenPackagePath(): string | undefined {
        const penCodegen = this.upstreamPackages.find(entry => entry.name === 'pen-codegen');
        if (!penCodegen?.vendorPath) {
            return undefined;
        }
        if (!this.isVendoredPackageAvailable(penCodegen)) {
            return undefined;
        }
        return this.resolveExistingRelativePath(penCodegen.vendorPath)
            ?? penCodegen.vendorPath;
    }

    protected resolvePenFigmaPackagePath(): string | undefined {
        const penFigma = this.upstreamPackages.find(entry => entry.name === 'pen-figma');
        if (!penFigma?.vendorPath) {
            return undefined;
        }
        if (!this.isVendoredPackageAvailable(penFigma)) {
            return undefined;
        }
        return this.resolveExistingRelativePath(penFigma.vendorPath)
            ?? penFigma.vendorPath;
    }

    protected resolveVendoredPackageEntrypoint(packagePath: string, candidates: string[]): string | undefined {
        for (const candidate of candidates) {
            const entrypoint = path.resolve(packagePath, candidate);
            if (fs.existsSync(entrypoint)) {
                return entrypoint;
            }
        }
        return undefined;
    }

    protected resolveExistingRelativePath(relativePath: string): string | undefined {
        const visited = new Set<string>();
        for (const searchRoot of [process.cwd(), __dirname]) {
            let current = path.resolve(searchRoot);
            while (!visited.has(current)) {
                visited.add(current);
                const candidate = path.resolve(current, relativePath);
                if (fs.existsSync(candidate)) {
                    return candidate;
                }
                const parent = path.dirname(current);
                if (parent === current) {
                    break;
                }
                current = parent;
            }
        }
        return undefined;
    }
}

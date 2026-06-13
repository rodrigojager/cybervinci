import { execFile, ExecFileException } from 'child_process';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as https from 'https';
import * as os from 'os';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import { injectable } from '@theia/core/shared/inversify';
import {
    LanguageAnalysisContext,
    LanguageAnalysisResult,
    LanguageCallHint,
    LanguageDependencyHint,
    MemoryFile,
    MemoryRelation,
    MemorySymbol
} from '@cybervinci/memory/lib/common';
import { CSharpRoslynSidecarAnalyzer } from '@cybervinci/memory-roslyn/lib/node/csharp-roslyn-sidecar-analyzer';
import {
    CSHARP_MICROSOFT_EXTENSION_MAPPINGS,
    CSharpCapability,
    CSharpCapabilityState,
    CSharpCentralPackageVersion,
    CSharpCodeContextRequest,
    CSharpCodeContextResult,
    CSharpCodeContextSection,
    CSharpCodeContextSignal,
    CSharpCodeContextSuggestion,
    CSharpCommandResult,
    CSharpCreateProjectItemRequest,
    CSharpCreateProjectItemResult,
    CSharpCreateProjectRequest,
    CSharpCreateProjectResult,
    CSharpCreateSolutionRequest,
    CSharpCreateSolutionResult,
    CSharpDebugAdapterStatus,
    CSharpDiagnostic,
    CSharpDiagnosticRequest,
    CSharpDiagnosticsResult,
    CSharpDotnetInfo,
    CSharpDotnetToolManifestSummary,
    CSharpEditorConfigSummary,
    CSharpGlobalJsonSummary,
    CSharpIntelliSenseItem,
    CSharpIntelliSenseRequest,
    CSharpIntelliSenseResult,
    CSharpKitWorkspaceConfigStatus,
    CSharpKitService,
    CSharpLanguageServerAdapterStatus,
    CSharpLanguageServerCallHierarchyIncomingResult,
    CSharpLanguageServerCallHierarchyItemRequest,
    CSharpLanguageServerCallHierarchyOutgoingResult,
    CSharpLanguageServerCallHierarchyPrepareResult,
    CSharpLanguageServerCodeActionRequest,
    CSharpLanguageServerCodeActionResolveRequest,
    CSharpLanguageServerCodeActionResolveResult,
    CSharpLanguageServerCodeActionResult,
    CSharpLanguageServerCodeLensResolveRequest,
    CSharpLanguageServerCodeLensResolveResult,
    CSharpLanguageServerCodeLensResult,
    CSharpLanguageServerColorPresentationRequest,
    CSharpLanguageServerColorPresentationResult,
    CSharpLanguageServerCompletionItemResolveRequest,
    CSharpLanguageServerCompletionItemResolveResult,
    CSharpLanguageServerCompletionResult,
    CSharpLanguageServerDefinitionResult,
    CSharpLanguageServerDiagnosticsResult,
    CSharpLanguageServerDocumentColorResult,
    CSharpLanguageServerDocumentHighlightResult,
    CSharpLanguageServerDocumentLinkResolveRequest,
    CSharpLanguageServerDocumentLinkResolveResult,
    CSharpLanguageServerDocumentLinkResult,
    CSharpLanguageServerDocumentSymbolRequest,
    CSharpLanguageServerDocumentSymbolResult,
    CSharpLanguageServerEvaluatableExpressionResult,
    CSharpLanguageServerExecuteCommandRequest,
    CSharpLanguageServerExecuteCommandResult,
    CSharpLanguageServerFoldingRangeResult,
    CSharpLanguageServerFormattingRequest,
    CSharpLanguageServerHoverResult,
    CSharpLanguageServerInlayHintRequest,
    CSharpLanguageServerInlayHintResolveRequest,
    CSharpLanguageServerInlayHintResolveResult,
    CSharpLanguageServerInlayHintResult,
    CSharpLanguageServerInlineCompletionRequest,
    CSharpLanguageServerInlineCompletionResult,
    CSharpLanguageServerInlineValueRequest,
    CSharpLanguageServerInlineValueResult,
    CSharpLanguageServerLinkedEditingRangeResult,
    CSharpLanguageServerMonikerResult,
    CSharpLanguageServerNewSymbolNamesRequest,
    CSharpLanguageServerNewSymbolNamesResult,
    CSharpLanguageServerOnTypeFormattingRequest,
    CSharpLanguageServerPrepareRenameResult,
    CSharpLanguageServerProbeResult,
    CSharpLanguageServerRangeFormattingRequest,
    CSharpLanguageServerRangesFormattingRequest,
    CSharpLanguageServerRangeSemanticTokensRequest,
    CSharpLanguageServerReferencesResult,
    CSharpLanguageServerRenameRequest,
    CSharpLanguageServerSelectionRangeRequest,
    CSharpLanguageServerSelectionRangeResult,
    CSharpLanguageServerSemanticTokensRequest,
    CSharpLanguageServerSemanticTokensResult,
    CSharpLanguageServerSignatureHelpResult,
    CSharpLanguageServerTextEditResult,
    CSharpLanguageServerTextDocumentPositionRequest,
    CSharpLanguageServerTypeHierarchyItemRequest,
    CSharpLanguageServerTypeHierarchyPrepareResult,
    CSharpLanguageServerTypeHierarchyResult,
    CSharpLanguageServerWorkspaceEditResult,
    CSharpLanguageServerWorkspaceDiagnosticsRequest,
    CSharpLanguageServerWorkspaceDiagnosticsResult,
    CSharpLanguageServerWorkspaceSymbolResolveRequest,
    CSharpLanguageServerWorkspaceSymbolResolveResult,
    CSharpLanguageServerWorkspaceSymbolRequest,
    CSharpLanguageServerWorkspaceSymbolResult,
    CSharpLaunchProfile,
    CSharpMsBuildFileSummary,
    CSharpNuGetConfigSummary,
    CSharpNuGetSearchPackage,
    CSharpNuGetSearchRequest,
    CSharpNuGetSearchResult,
    CSharpPackageCommandRequest,
    CSharpPackageHealthIssue,
    CSharpPackageHealthIssueKind,
    CSharpPackageHealthResult,
    CSharpPackageListResult,
    CSharpPublishProfile,
    CSharpPackageUpdateResult,
    CSharpProjectFile,
    CSharpProjectItemTemplate,
    CSharpProjectItemTemplateId,
    CSharpProjectRequest,
    CSharpProjectReferenceCommandRequest,
    CSharpProjectSummary,
    CSharpProjectTemplate,
    CSharpProjectTemplateId,
    CSharpRazorImportSummary,
    CSharpRazorFileSummary,
    CSharpRazorInjection,
    CSharpRunSettingsSummary,
    CSharpRoslynStatus,
    CSharpSemanticDiagnostic,
    CSharpSemanticHint,
    CSharpSemanticInventoryResult,
    CSharpSemanticRelation,
    CSharpSemanticSymbol,
    CSharpSolutionSummary,
    CSharpSolutionCommandRequest,
    CSharpTestCase,
    CSharpTestDebugSession,
    CSharpTestDebugSessionRequest,
    CSharpTestDiscoveryResult,
    CSharpTestFramework,
    CSharpTestOutcome,
    CSharpTestResultCaptureRequest,
    CSharpTestResult,
    CSharpTestRunRequest,
    CSharpTestRunResult,
    CSharpWorkspaceFilesRequest,
    CSharpWorkspaceFilesResult,
    CSharpWorkspaceConfigFileResult,
    CSharpWorkspaceInspection,
    CSharpWorkspaceRequest,
    CSharpWorkspaceSymbol,
    CSharpWorkspaceSymbolKind,
    CSharpWorkspaceSymbolRange,
    CSharpWorkspaceSymbolResult,
    csharpProjectDisplayName
} from '../common';
import {
    parseCentralPackageVersions,
    parseCsproj,
    parseDotnetBuildDiagnostics,
    parseDotnetInfo,
    parseDotnetPackageHealthOutput,
    parseDotnetPackageOutdatedOutput,
    parseDotnetPackageListOutput,
    parseDotnetTestListOutput,
    parseDotnetTestTrx,
    parseDotnetToolManifest,
    parseEditorConfig,
    parseGlobalAnalyzerConfig,
    parseGlobalJson,
    parseLaunchSettings,
    parseMsBuildFile,
    parseNuGetConfig,
    parsePublishProfile,
    parseRazorFileSummary,
    parseRunSettings
} from '../common/csharp-kit-parser';
import { CSHARP_CORECLR_DEBUG_ADAPTER_ENV, CSharpDebugAdapterWorkspaceConfig, resolveCSharpDebugAdapterStatus } from './csharp-coreclr-debug-adapter';
import {
    CSHARP_LSP_COMMAND_ENV,
    CSharpLanguageServerAdapterWorkspaceConfig,
    RAZOR_LSP_COMMAND_ENV,
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
    requestCSharpLanguageServerPrepareRename,
    requestCSharpLanguageServerPrepareCallHierarchy,
    requestCSharpLanguageServerPrepareTypeHierarchy,
    requestCSharpLanguageServerRangeFormatting,
    requestCSharpLanguageServerRangesFormatting,
    requestCSharpLanguageServerRangeSemanticTokens,
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
    requestCSharpLanguageServerWorkspaceDiagnostics,
    requestCSharpLanguageServerWorkspaceSymbols,
    resolveCSharpLanguageServerAdapterStatuses
} from './csharp-language-server-adapter';
import { CSHARP_KIT_CONFIG_RELATIVE_PATH, createCSharpKitConfigTemplate } from '../common/csharp-kit-config-schema';

const execFileAsync = promisify(execFile);
const MAX_SCAN_RESULTS = 300;
const MAX_SCAN_DEPTH = 12;
const MAX_PROJECT_FILES = 240;
const MAX_INTELLISENSE_FILES = 160;
const MAX_INTELLISENSE_FILE_BYTES = 256 * 1024;
const MAX_INTELLISENSE_ITEMS = 1000;
const MAX_WORKSPACE_SYMBOLS = 2500;
const MAX_SEMANTIC_FILES = 80;
const MAX_SEMANTIC_ITEMS = 1200;
const MAX_CODE_CONTEXT_SYMBOLS = 80;
const MAX_CODE_CONTEXT_SUGGESTIONS = 12;
const DOTNET_TIMEOUT_MS = 30000;
const DOTNET_MAX_BUFFER = 12 * 1024 * 1024;
const NUGET_SEARCH_URL = 'https://azuresearch-usnc.nuget.org/query';
const NUGET_SEARCH_TIMEOUT_MS = 15000;
const ROSLYN_ANALYZER_PATH_ENV = 'CYBERVINCI_ROSLYN_ANALYZER_PATH';
const ROSLYN_ANALYZER_TIMEOUT_ENV = 'CYBERVINCI_ROSLYN_ANALYZER_TIMEOUT_MS';
interface CSharpRoslynWorkspaceConfig {
    roslyn?: {
        analyzerPath?: string;
        timeoutMs?: number | string;
    };
}
type CSharpKitWorkspaceConfig = CSharpLanguageServerAdapterWorkspaceConfig & CSharpDebugAdapterWorkspaceConfig & CSharpRoslynWorkspaceConfig;

interface CSharpKitWorkspaceConfigReadResult {
    config?: CSharpKitWorkspaceConfig;
    status: CSharpKitWorkspaceConfigStatus;
}

interface CSharpProjectItemFile {
    relativePath: string;
    content: string;
}

interface CSharpRoslynAnalyzerAdapter {
    analyze(context: LanguageAnalysisContext): Promise<LanguageAnalysisResult> | LanguageAnalysisResult;
}

interface CSharpMethodDeclaration {
    match: RegExpExecArray;
    attributes: string;
    returnType: string;
    name: string;
    parameters: string;
    signature: string;
}

const CSHARP_PROJECT_TEMPLATES: readonly CSharpProjectTemplate[] = [
    {
        id: 'console',
        label: 'Console Application',
        dotnetTemplate: 'console',
        description: 'Command-line .NET app.',
        kind: 'console'
    },
    {
        id: 'webapi',
        label: 'ASP.NET Core Web API',
        dotnetTemplate: 'webapi',
        description: 'HTTP API project using ASP.NET Core.',
        kind: 'web'
    },
    {
        id: 'mvc',
        label: 'ASP.NET Core MVC',
        dotnetTemplate: 'mvc',
        description: 'MVC web application with controllers and views.',
        kind: 'web'
    },
    {
        id: 'razor',
        label: 'ASP.NET Core Razor Pages',
        dotnetTemplate: 'webapp',
        description: 'Razor Pages web application.',
        kind: 'web'
    },
    {
        id: 'worker',
        label: 'Worker Service',
        dotnetTemplate: 'worker',
        description: 'Background worker service.',
        kind: 'worker'
    },
    {
        id: 'classlib',
        label: 'Class Library',
        dotnetTemplate: 'classlib',
        description: 'Reusable .NET library.',
        kind: 'library'
    },
    {
        id: 'xunit',
        label: 'xUnit Test Project',
        dotnetTemplate: 'xunit',
        description: 'Unit test project using xUnit.',
        kind: 'test'
    },
    {
        id: 'nunit',
        label: 'NUnit Test Project',
        dotnetTemplate: 'nunit',
        description: 'Unit test project using NUnit.',
        kind: 'test'
    },
    {
        id: 'mstest',
        label: 'MSTest Test Project',
        dotnetTemplate: 'mstest',
        description: 'Unit test project using MSTest.',
        kind: 'test'
    }
];
const CSHARP_PROJECT_ITEM_TEMPLATES: readonly CSharpProjectItemTemplate[] = [
    {
        id: 'class',
        label: 'Class',
        description: 'C# class file.',
        defaultDirectory: ''
    },
    {
        id: 'interface',
        label: 'Interface',
        description: 'C# interface file.',
        defaultDirectory: ''
    },
    {
        id: 'record',
        label: 'Record',
        description: 'C# immutable record file.',
        defaultDirectory: ''
    },
    {
        id: 'enum',
        label: 'Enum',
        description: 'C# enum file.',
        defaultDirectory: ''
    },
    {
        id: 'controller',
        label: 'API Controller',
        description: 'ASP.NET Core API controller.',
        defaultDirectory: 'Controllers'
    },
    {
        id: 'razor-page',
        label: 'Razor Page',
        description: 'Razor Page with code-behind model.',
        defaultDirectory: 'Pages'
    },
    {
        id: 'xunit-test',
        label: 'xUnit Test Class',
        description: 'xUnit test class.',
        defaultDirectory: 'Tests'
    },
    {
        id: 'nunit-test',
        label: 'NUnit Test Class',
        description: 'NUnit test class.',
        defaultDirectory: 'Tests'
    },
    {
        id: 'mstest-test',
        label: 'MSTest Test Class',
        description: 'MSTest test class.',
        defaultDirectory: 'Tests'
    }
];
const EXCLUDED_DIRECTORIES = new Set([
    '.git',
    '.hg',
    '.svn',
    '.vs',
    '.vscode',
    'bin',
    'obj',
    'node_modules',
    'lib',
    'coverage',
    'dist',
    'out'
]);

@injectable()
export class CSharpKitServiceImpl implements CSharpKitService {

    async inspectWorkspace(request: CSharpWorkspaceRequest): Promise<CSharpWorkspaceInspection> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const csharpKitConfigResult = this.readCSharpKitWorkspaceConfigFile(workspacePath);
        const csharpKitConfig = csharpKitConfigResult.config;
        const dotnet = await this.getDotnetInfo();
        const roslyn = await this.getRoslynStatus(workspacePath, csharpKitConfig);
        const debugAdapter = resolveCSharpDebugAdapterStatus(process.env, workspacePath, csharpKitConfig, CSHARP_KIT_CONFIG_RELATIVE_PATH);
        const languageServers = this.getLanguageServerAdapters(workspacePath, csharpKitConfig);
        const files = await this.findWorkspaceFiles(workspacePath);
        const solutions = await Promise.all(files.solutions.map(solutionPath => this.readSolution(solutionPath)));
        const projects = await Promise.all(files.projects.map(projectPath => this.readProject(projectPath, workspacePath)));
        const globalJsons = await this.readGlobalJsons(workspacePath, files.globalJsons, dotnet);
        const editorConfigs = await this.readEditorConfigs(workspacePath, files.editorConfigs);
        const globalConfigs = await this.readGlobalAnalyzerConfigs(workspacePath, files.globalConfigs);
        const toolManifests = await this.readDotnetToolManifests(workspacePath, files.toolManifests);
        const runSettings = await this.readRunSettings(workspacePath, files.runSettings);
        const nugetConfigs = await this.readNuGetConfigs(workspacePath, files.nugetConfigs);
        return {
            workspacePath,
            csharpKitConfig: csharpKitConfigResult.status,
            dotnet,
            roslyn,
            debugAdapter,
            languageServers,
            solutions,
            projects,
            globalJsons,
            editorConfigs,
            globalConfigs,
            toolManifests,
            runSettings,
            nugetConfigs,
            capabilities: this.capabilities(dotnet, csharpKitConfigResult.status, roslyn, debugAdapter, languageServers, solutions, projects, files.razorFiles.length, globalJsons, editorConfigs, globalConfigs, toolManifests, runSettings, nugetConfigs),
            microsoftMappings: [...CSHARP_MICROSOFT_EXTENSION_MAPPINGS],
            recommendations: this.recommendations(dotnet, csharpKitConfigResult.status, roslyn, debugAdapter, languageServers, solutions, projects, files.razorFiles.length, globalJsons, editorConfigs, globalConfigs, toolManifests, runSettings, nugetConfigs)
        };
    }

    async getProjectTemplates(): Promise<CSharpProjectTemplate[]> {
        return [...CSHARP_PROJECT_TEMPLATES];
    }

    async createProject(request: CSharpCreateProjectRequest): Promise<CSharpCreateProjectResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const template = this.projectTemplate(request.templateId);
        const projectName = this.validateProjectName(request.projectName);
        const outputDirectory = request.outputDirectory?.trim() || this.defaultTemplateDirectory(template);
        const outputRoot = this.resolveInsideWorkspace(workspacePath, outputDirectory);
        const projectDirectory = this.resolveInsideWorkspace(workspacePath, path.join(outputRoot, projectName));
        await this.assertEmptyOrMissingDirectory(projectDirectory);

        const commandResults: CSharpCommandResult[] = [];
        const newProjectArgs = ['new', template.dotnetTemplate, '--name', projectName, '--output', projectDirectory];
        if (request.framework?.trim()) {
            newProjectArgs.push('--framework', request.framework.trim());
        }
        commandResults.push(await this.runDotnet(workspacePath, newProjectArgs, 120000));

        const projectPath = await this.findCreatedProjectFile(projectDirectory, projectName);
        let solutionPath: string | undefined;
        if (request.createSolution || request.solutionPath) {
            solutionPath = await this.ensureSolutionPath(workspacePath, request, projectName, commandResults);
            if (solutionPath) {
                commandResults.push(await this.runDotnet(workspacePath, ['sln', solutionPath, 'add', projectPath], 60000));
            }
        }

        return {
            ok: commandResults.every(result => result.ok),
            projectPath,
            projectDirectory,
            solutionPath,
            addedToSolution: !!solutionPath,
            commandResults,
            rawOutput: commandResults.map(result => `${result.stdout}\n${result.stderr}`.trim()).filter(Boolean).join('\n\n')
        };
    }

    async getProjectItemTemplates(): Promise<CSharpProjectItemTemplate[]> {
        return [...CSHARP_PROJECT_ITEM_TEMPLATES];
    }

    async createProjectItem(request: CSharpCreateProjectItemRequest): Promise<CSharpCreateProjectItemResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const projectPath = this.resolveInsideWorkspace(workspacePath, request.projectPath);
        const project = await this.readProject(projectPath, workspacePath);
        const projectDirectory = path.dirname(project.path);
        const template = this.projectItemTemplate(request.templateId);
        const itemName = this.validateProjectItemName(request.itemName);
        const outputDirectory = request.outputDirectory?.trim() || template.defaultDirectory || '.';
        const outputRoot = this.resolveInsideProject(projectDirectory, outputDirectory);
        const relativeOutputDirectory = path.relative(projectDirectory, outputRoot).replace(/\\/g, '/') || '.';
        const namespaceName = this.namespaceForProjectItem(project, relativeOutputDirectory, request.namespace);
        const itemFiles = this.projectItemFiles(template.id, itemName, relativeOutputDirectory, namespaceName);
        const createdFiles: string[] = [];
        const skippedFiles: string[] = [];

        for (const itemFile of itemFiles) {
            const filePath = this.resolveInsideProject(projectDirectory, itemFile.relativePath);
            if (fs.existsSync(filePath) && !request.overwrite) {
                skippedFiles.push(filePath);
                continue;
            }
            await fsp.mkdir(path.dirname(filePath), { recursive: true });
            await fsp.writeFile(filePath, itemFile.content, 'utf8');
            createdFiles.push(filePath);
        }

        return {
            ok: true,
            projectPath: project.path,
            createdFiles,
            skippedFiles,
            changed: createdFiles.length > 0,
            rawOutput: [
                ...createdFiles.map(filePath => `created ${filePath}`),
                ...skippedFiles.map(filePath => `skipped ${filePath}`)
            ].join('\n')
        };
    }

    async createSolution(request: CSharpCreateSolutionRequest): Promise<CSharpCreateSolutionResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const solutionName = this.validateProjectName(request.solutionName);
        const outputDirectory = this.resolveInsideWorkspace(workspacePath, request.outputDirectory?.trim() || '.');
        await fsp.mkdir(outputDirectory, { recursive: true });
        const commandResult = await this.runDotnet(workspacePath, ['new', 'sln', '--name', solutionName, '--output', outputDirectory], 60000);
        const solutionPath = await this.findSolutionFile(outputDirectory, solutionName) ?? path.join(outputDirectory, `${solutionName}.sln`);
        return {
            ok: commandResult.ok,
            solutionPath,
            commandResult
        };
    }

    async addProjectToSolution(request: CSharpSolutionCommandRequest): Promise<CSharpCommandResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const solutionPath = this.resolveInsideWorkspace(workspacePath, request.solutionPath);
        const projectPath = this.resolveInsideWorkspace(workspacePath, request.projectPath);
        return this.runDotnet(workspacePath, ['sln', solutionPath, 'add', projectPath], 60000);
    }

    async removeProjectFromSolution(request: CSharpSolutionCommandRequest): Promise<CSharpCommandResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const solutionPath = this.resolveInsideWorkspace(workspacePath, request.solutionPath);
        const projectPath = this.resolveInsideWorkspace(workspacePath, request.projectPath);
        return this.runDotnet(workspacePath, ['sln', solutionPath, 'remove', projectPath], 60000);
    }

    async addProjectReference(request: CSharpProjectReferenceCommandRequest): Promise<CSharpCommandResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const projectPath = this.resolveInsideWorkspace(workspacePath, request.projectPath);
        const referenceProjectPath = this.resolveInsideWorkspace(workspacePath, request.referenceProjectPath);
        return this.runDotnet(workspacePath, ['add', projectPath, 'reference', referenceProjectPath], 60000);
    }

    async removeProjectReference(request: CSharpProjectReferenceCommandRequest): Promise<CSharpCommandResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const projectPath = this.resolveInsideWorkspace(workspacePath, request.projectPath);
        const referenceProjectPath = this.resolveInsideWorkspace(workspacePath, request.referenceProjectPath);
        return this.runDotnet(workspacePath, ['remove', projectPath, 'reference', referenceProjectPath], 60000);
    }

    async writeWorkspaceFiles(request: CSharpWorkspaceFilesRequest): Promise<CSharpWorkspaceFilesResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const projectPath = this.resolveInsideWorkspace(workspacePath, request.projectPath);
        const project = await this.readProject(projectPath, workspacePath);
        const vscodePath = path.join(workspacePath, '.vscode');
        const csharpKitConfigDirectory = path.join(workspacePath, '.cybervinci');
        await fsp.mkdir(vscodePath, { recursive: true });
        await fsp.mkdir(csharpKitConfigDirectory, { recursive: true });

        const launchJsonPath = path.join(vscodePath, 'launch.json');
        const tasksJsonPath = path.join(vscodePath, 'tasks.json');
        const csharpKitConfigPath = path.join(csharpKitConfigDirectory, 'csharp-kit.json');
        const taskLabels = [
            `C# Kit: restore ${project.name}`,
            `C# Kit: build ${project.name}`,
            `C# Kit: clean ${project.name}`,
            `C# Kit: rebuild ${project.name}`,
            `C# Kit: format ${project.name}`,
            `C# Kit: publish ${project.name}`,
            `C# Kit: test ${project.name}`,
            `C# Kit: run ${project.name}`,
            `C# Kit: watch ${project.name}`
        ];
        if (project.isAspNetCore) {
            taskLabels.push(
                `C# Kit: user-secrets init ${project.name}`,
                `C# Kit: user-secrets list ${project.name}`,
                'C# Kit: dev-certs https trust'
            );
        }
        const launchConfigurationName = `C# Kit: Debug ${project.name}`;
        const launchConfigurations = this.launchConfigurations(workspacePath, project, launchConfigurationName);
        const launchConfigurationNames = launchConfigurations.map(configuration => String(configuration.name));
        const taskConfigurations = await this.taskConfigurations(workspacePath, project);
        const taskInputs = this.taskInputs(project);
        const generatedTaskLabels = taskConfigurations.map(task => String(task.label));
        const launchChanged = await this.upsertJsonArrayFile(
            launchJsonPath,
            'configurations',
            launchConfigurations,
            'name',
            request.overwrite === true
        );
        const tasksChanged = await this.upsertJsonArrayFile(
            tasksJsonPath,
            'tasks',
            taskConfigurations,
            'label',
            request.overwrite === true
        );
        const taskInputsChanged = taskInputs.length
            ? await this.upsertJsonArrayFile(
                tasksJsonPath,
                'inputs',
                taskInputs,
                'id',
                request.overwrite === true
            )
            : false;
        const configChanged = await this.writeCSharpKitConfigTemplate(csharpKitConfigPath);

        return {
            launchJsonPath,
            tasksJsonPath,
            csharpKitConfigPath,
            launchConfigurationName,
            launchConfigurationNames,
            taskLabels: generatedTaskLabels.length ? generatedTaskLabels : taskLabels,
            configChanged,
            changed: launchChanged || tasksChanged || taskInputsChanged || configChanged
        };
    }

    async writeWorkspaceConfig(request: CSharpWorkspaceRequest): Promise<CSharpWorkspaceConfigFileResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const configPath = path.join(workspacePath, ...CSHARP_KIT_CONFIG_RELATIVE_PATH.split('/'));
        await fsp.mkdir(path.dirname(configPath), { recursive: true });
        const changed = await this.writeCSharpKitConfigTemplate(configPath);
        return {
            configPath,
            changed
        };
    }

    protected projectTemplate(templateId: CSharpProjectTemplateId): CSharpProjectTemplate {
        const template = CSHARP_PROJECT_TEMPLATES.find(candidate => candidate.id === templateId);
        if (!template) {
            throw new Error(`Unsupported C# project template: ${templateId}`);
        }
        return template;
    }

    protected projectItemTemplate(templateId: CSharpProjectItemTemplateId): CSharpProjectItemTemplate {
        const template = CSHARP_PROJECT_ITEM_TEMPLATES.find(candidate => candidate.id === templateId);
        if (!template) {
            throw new Error(`Unsupported C# project item template: ${templateId}`);
        }
        return template;
    }

    protected validateProjectItemName(itemName: string): string {
        const trimmed = itemName.trim().replace(/(\.cshtml\.cs|\.cshtml|\.razor|\.cs)$/i, '');
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(trimmed)) {
            throw new Error('Item name must be a valid C# identifier.');
        }
        return trimmed;
    }

    protected projectItemFiles(
        templateId: CSharpProjectItemTemplateId,
        itemName: string,
        outputDirectory: string,
        namespaceName: string
    ): CSharpProjectItemFile[] {
        switch (templateId) {
            case 'class':
                return [this.csharpFile(outputDirectory, itemName, this.classContent(namespaceName, itemName))];
            case 'interface': {
                const interfaceName = this.interfaceName(itemName);
                return [this.csharpFile(outputDirectory, interfaceName, this.interfaceContent(namespaceName, interfaceName))];
            }
            case 'record':
                return [this.csharpFile(outputDirectory, itemName, this.recordContent(namespaceName, itemName))];
            case 'enum':
                return [this.csharpFile(outputDirectory, itemName, this.enumContent(namespaceName, itemName))];
            case 'controller': {
                const controllerName = this.controllerName(itemName);
                return [this.csharpFile(outputDirectory, controllerName, this.controllerContent(namespaceName, controllerName))];
            }
            case 'razor-page':
                return this.razorPageFiles(outputDirectory, itemName, namespaceName);
            case 'xunit-test':
                return [this.csharpFile(outputDirectory, itemName, this.xunitTestContent(namespaceName, itemName))];
            case 'nunit-test':
                return [this.csharpFile(outputDirectory, itemName, this.nunitTestContent(namespaceName, itemName))];
            case 'mstest-test':
                return [this.csharpFile(outputDirectory, itemName, this.mstestTestContent(namespaceName, itemName))];
            default:
                throw new Error(`Unsupported C# project item template: ${templateId}`);
        }
    }

    protected csharpFile(outputDirectory: string, typeName: string, content: string): CSharpProjectItemFile {
        return {
            relativePath: path.join(outputDirectory, `${typeName}.cs`),
            content
        };
    }

    protected classContent(namespaceName: string, typeName: string): string {
        return [
            `namespace ${namespaceName};`,
            '',
            `public sealed class ${typeName}`,
            '{',
            '}',
            ''
        ].join('\n');
    }

    protected interfaceContent(namespaceName: string, typeName: string): string {
        return [
            `namespace ${namespaceName};`,
            '',
            `public interface ${typeName}`,
            '{',
            '}',
            ''
        ].join('\n');
    }

    protected recordContent(namespaceName: string, typeName: string): string {
        return [
            `namespace ${namespaceName};`,
            '',
            `public sealed record ${typeName};`,
            ''
        ].join('\n');
    }

    protected enumContent(namespaceName: string, typeName: string): string {
        return [
            `namespace ${namespaceName};`,
            '',
            `public enum ${typeName}`,
            '{',
            '}',
            ''
        ].join('\n');
    }

    protected controllerContent(namespaceName: string, typeName: string): string {
        return [
            'using Microsoft.AspNetCore.Mvc;',
            '',
            `namespace ${namespaceName};`,
            '',
            '[ApiController]',
            '[Route("api/[controller]")]',
            `public sealed class ${typeName} : ControllerBase`,
            '{',
            '    [HttpGet]',
            '    public ActionResult<string> Get()',
            '    {',
            `        return Ok(nameof(${typeName}));`,
            '    }',
            '}',
            ''
        ].join('\n');
    }

    protected razorPageFiles(outputDirectory: string, itemName: string, namespaceName: string): CSharpProjectItemFile[] {
        const modelName = this.razorPageModelName(itemName);
        return [
            {
                relativePath: path.join(outputDirectory, `${itemName}.cshtml`),
                content: [
                    '@page',
                    `@model ${namespaceName}.${modelName}`,
                    '',
                    `<h1>${itemName}</h1>`,
                    ''
                ].join('\n')
            },
            {
                relativePath: path.join(outputDirectory, `${itemName}.cshtml.cs`),
                content: [
                    'using Microsoft.AspNetCore.Mvc.RazorPages;',
                    '',
                    `namespace ${namespaceName};`,
                    '',
                    `public sealed class ${modelName} : PageModel`,
                    '{',
                    '    public void OnGet()',
                    '    {',
                    '    }',
                    '}',
                    ''
                ].join('\n')
            }
        ];
    }

    protected xunitTestContent(namespaceName: string, typeName: string): string {
        return [
            'using Xunit;',
            '',
            `namespace ${namespaceName};`,
            '',
            `public sealed class ${typeName}`,
            '{',
            '    [Fact]',
            '    public void Test1()',
            '    {',
            '        Assert.True(true);',
            '    }',
            '}',
            ''
        ].join('\n');
    }

    protected nunitTestContent(namespaceName: string, typeName: string): string {
        return [
            'using NUnit.Framework;',
            '',
            `namespace ${namespaceName};`,
            '',
            '[TestFixture]',
            `public sealed class ${typeName}`,
            '{',
            '    [Test]',
            '    public void Test1()',
            '    {',
            '        Assert.Pass();',
            '    }',
            '}',
            ''
        ].join('\n');
    }

    protected mstestTestContent(namespaceName: string, typeName: string): string {
        return [
            'using Microsoft.VisualStudio.TestTools.UnitTesting;',
            '',
            `namespace ${namespaceName};`,
            '',
            '[TestClass]',
            `public sealed class ${typeName}`,
            '{',
            '    [TestMethod]',
            '    public void Test1()',
            '    {',
            '        Assert.IsTrue(true);',
            '    }',
            '}',
            ''
        ].join('\n');
    }

    protected interfaceName(itemName: string): string {
        return /^I[A-Z]/.test(itemName) ? itemName : `I${itemName}`;
    }

    protected controllerName(itemName: string): string {
        return itemName.endsWith('Controller') ? itemName : `${itemName}Controller`;
    }

    protected razorPageModelName(itemName: string): string {
        return itemName.endsWith('Model') ? itemName : `${itemName}Model`;
    }

    protected namespaceForProjectItem(project: CSharpProjectSummary, outputDirectory: string, namespaceOverride?: string): string {
        const override = namespaceOverride?.trim();
        if (override) {
            if (!this.isValidNamespace(override)) {
                throw new Error('Namespace override must be a valid C# namespace.');
            }
            return override;
        }
        const namespaceName = [
            ...this.namespaceSegments(project.assemblyName || project.name),
            ...this.namespaceSegments(outputDirectory)
        ].join('.');
        return namespaceName || 'CyberVinci.Generated';
    }

    protected namespaceSegments(value: string): string[] {
        return value
            .split(/[\\/.]+/)
            .map(segment => segment.trim())
            .filter(segment => segment && segment !== '.')
            .map(segment => segment.replace(/[^A-Za-z0-9_]/g, '_'))
            .filter(Boolean)
            .map(segment => /^[A-Za-z_]/.test(segment) ? segment : `_${segment}`);
    }

    protected isValidNamespace(value: string): boolean {
        return /^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*$/.test(value);
    }

    protected validateProjectName(projectName: string): string {
        const trimmed = projectName.trim();
        if (!/^[A-Za-z_][A-Za-z0-9_.-]*$/.test(trimmed)) {
            throw new Error('Project name must start with a letter or underscore and contain only letters, numbers, dot, dash or underscore.');
        }
        return trimmed;
    }

    protected defaultTemplateDirectory(template: CSharpProjectTemplate): string {
        return template.kind === 'test' ? 'tests' : 'src';
    }

    protected async assertEmptyOrMissingDirectory(directoryPath: string): Promise<void> {
        try {
            const entries = await fsp.readdir(directoryPath);
            if (entries.length > 0) {
                throw new Error(`Project directory already exists and is not empty: ${directoryPath}`);
            }
        } catch (error) {
            const code = (error as NodeJS.ErrnoException).code;
            if (code !== 'ENOENT') {
                throw error;
            }
        }
    }

    protected async findCreatedProjectFile(projectDirectory: string, projectName: string): Promise<string> {
        const preferred = path.join(projectDirectory, `${projectName}.csproj`);
        if (fs.existsSync(preferred)) {
            return preferred;
        }
        const projects: string[] = [];
        await this.collectFilesByExtension(projectDirectory, '.csproj', projects, 4);
        if (!projects.length) {
            throw new Error(`dotnet new did not create a .csproj under ${projectDirectory}`);
        }
        return projects.sort((left, right) => left.length - right.length || left.localeCompare(right))[0];
    }

    protected async collectFilesByExtension(directoryPath: string, extension: string, result: string[], depth: number): Promise<void> {
        if (depth < 0) {
            return;
        }
        let entries: fs.Dirent[];
        try {
            entries = await fsp.readdir(directoryPath, { withFileTypes: true });
        } catch {
            return;
        }
        for (const entry of entries) {
            const absolute = path.join(directoryPath, entry.name);
            if (entry.isDirectory()) {
                await this.collectFilesByExtension(absolute, extension, result, depth - 1);
            } else if (entry.isFile() && path.extname(entry.name).toLowerCase() === extension) {
                result.push(absolute);
            }
        }
    }

    protected async ensureSolutionPath(
        workspacePath: string,
        request: CSharpCreateProjectRequest,
        fallbackName: string,
        commandResults: CSharpCommandResult[]
    ): Promise<string | undefined> {
        if (request.solutionPath) {
            return this.resolveInsideWorkspace(workspacePath, request.solutionPath);
        }
        if (!request.createSolution) {
            return undefined;
        }
        const solutionName = this.validateProjectName(request.solutionName?.trim() || fallbackName);
        const existingSolutionPath = await this.findSolutionFile(workspacePath, solutionName);
        if (existingSolutionPath) {
            return existingSolutionPath;
        }
        const fallbackSolutionPath = path.join(workspacePath, `${solutionName}.sln`);
        if (!fs.existsSync(fallbackSolutionPath)) {
            commandResults.push(await this.runDotnet(workspacePath, ['new', 'sln', '--name', solutionName, '--output', workspacePath], 60000));
        }
        return await this.findSolutionFile(workspacePath, solutionName) ?? fallbackSolutionPath;
    }

    protected async findSolutionFile(directoryPath: string, solutionName: string): Promise<string | undefined> {
        const candidates = [
            path.join(directoryPath, `${solutionName}.sln`),
            path.join(directoryPath, `${solutionName}.slnx`)
        ].filter(candidate => fs.existsSync(candidate));
        if (candidates.length === 0) {
            return undefined;
        }
        if (candidates.length === 1) {
            return candidates[0];
        }
        return this.latestFileByModifiedTime(candidates) ?? candidates[0];
    }

    async listPackages(request: CSharpProjectRequest): Promise<CSharpPackageListResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const projectPath = this.resolveInsideWorkspace(workspacePath, request.projectPath);
        const result = await this.runDotnet(workspacePath, ['list', projectPath, 'package', '--include-transitive']);
        return {
            projectPath,
            packages: parseDotnetPackageListOutput(result.stdout),
            rawOutput: result.stdout || result.stderr
        };
    }

    async listPackageUpdates(request: CSharpProjectRequest): Promise<CSharpPackageUpdateResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const projectPath = this.resolveInsideWorkspace(workspacePath, request.projectPath);
        let result = await this.runDotnet(workspacePath, ['list', projectPath, 'package', '--outdated', '--include-transitive', '--format', 'json'], 60000);
        let rawOutput = result.stdout || result.stderr;
        let updates = parseDotnetPackageOutdatedOutput(rawOutput, projectPath);
        if (!updates.length && !result.ok && /(?:unrecognized|unknown).*(?:--format|format)/i.test(rawOutput)) {
            result = await this.runDotnet(workspacePath, ['list', projectPath, 'package', '--outdated', '--include-transitive'], 60000);
            rawOutput = result.stdout || result.stderr;
            updates = parseDotnetPackageOutdatedOutput(rawOutput, projectPath);
        }
        return {
            projectPath,
            updates,
            rawOutput
        };
    }

    async listPackageHealth(request: CSharpProjectRequest): Promise<CSharpPackageHealthResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const projectPath = this.resolveInsideWorkspace(workspacePath, request.projectPath);
        const vulnerable = await this.listPackageHealthByKind(workspacePath, projectPath, 'vulnerable');
        const deprecated = await this.listPackageHealthByKind(workspacePath, projectPath, 'deprecated');
        return {
            projectPath,
            issues: [...vulnerable.issues, ...deprecated.issues],
            rawOutput: [vulnerable.rawOutput, deprecated.rawOutput].filter(Boolean).join('\n\n')
        };
    }

    protected async listPackageHealthByKind(
        workspacePath: string,
        projectPath: string,
        kind: CSharpPackageHealthIssueKind
    ): Promise<{ issues: CSharpPackageHealthIssue[]; rawOutput: string }> {
        const flag = kind === 'vulnerable' ? '--vulnerable' : '--deprecated';
        let result = await this.runDotnet(workspacePath, ['list', projectPath, 'package', flag, '--include-transitive', '--format', 'json'], 60000);
        let rawOutput = result.stdout || result.stderr;
        let issues = parseDotnetPackageHealthOutput(rawOutput, kind, projectPath);
        if (!issues.length && !result.ok && /(?:unrecognized|unknown).*(?:--format|format)/i.test(rawOutput)) {
            result = await this.runDotnet(workspacePath, ['list', projectPath, 'package', flag, '--include-transitive'], 60000);
            rawOutput = result.stdout || result.stderr;
            issues = parseDotnetPackageHealthOutput(rawOutput, kind, projectPath);
        }
        return { issues, rawOutput };
    }

    async searchPackages(request: CSharpNuGetSearchRequest): Promise<CSharpNuGetSearchResult> {
        this.resolveExistingDirectory(request.workspacePath);
        const query = request.query.trim();
        if (!query) {
            throw new Error('NuGet search query cannot be empty.');
        }
        const take = Math.min(Math.max(Math.floor(request.take ?? 20), 1), 50);
        const url = new URL(NUGET_SEARCH_URL);
        url.searchParams.set('q', query);
        url.searchParams.set('take', String(take));
        url.searchParams.set('prerelease', request.prerelease ? 'true' : 'false');
        const rawOutput = await this.fetchNuGetSearch(url);
        return {
            query,
            source: NUGET_SEARCH_URL,
            packages: this.parseNuGetSearchPackages(rawOutput),
            rawOutput
        };
    }

    async addPackage(request: CSharpPackageCommandRequest): Promise<CSharpCommandResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const projectPath = this.resolveInsideWorkspace(workspacePath, request.projectPath);
        const args = ['add', projectPath, 'package', request.packageId];
        if (request.version) {
            args.push('--version', request.version);
        }
        return this.runDotnet(workspacePath, args);
    }

    async updatePackage(request: CSharpPackageCommandRequest): Promise<CSharpCommandResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const projectPath = this.resolveInsideWorkspace(workspacePath, request.projectPath);
        const args = ['add', projectPath, 'package', request.packageId];
        if (request.version) {
            args.push('--version', request.version);
        }
        return this.runDotnet(workspacePath, args);
    }

    async removePackage(request: CSharpPackageCommandRequest): Promise<CSharpCommandResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const projectPath = this.resolveInsideWorkspace(workspacePath, request.projectPath);
        return this.runDotnet(workspacePath, ['remove', projectPath, 'package', request.packageId]);
    }

    async discoverTests(request: CSharpProjectRequest): Promise<CSharpTestDiscoveryResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const projectPath = this.resolveInsideWorkspace(workspacePath, request.projectPath);
        const project = await this.readProject(projectPath, workspacePath);
        const testFramework = project.testFramework ?? this.testFrameworkFromPackages(project.packageReferences);
        const runner = await this.dotnetTestRunnerForTarget(workspacePath, projectPath);
        const result = await this.runDotnet(workspacePath, [
            ...this.dotnetTestTargetArgs(projectPath, 'project', runner),
            '--list-tests',
            '--no-restore'
        ], 60000);
        return {
            projectPath,
            tests: this.applyTestProjectMetadata(
                parseDotnetTestListOutput(`${result.stdout}\n${result.stderr}`, projectPath),
                testFramework
            ),
            rawOutput: result.stdout || result.stderr
        };
    }

    async runTests(request: CSharpTestRunRequest): Promise<CSharpTestRunResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const projectPath = this.resolveInsideWorkspace(workspacePath, request.projectPath);
        const names = request.testNames?.filter(Boolean) ?? [];
        const selectedNames = names.length ? names : [''];
        const results: CSharpTestResult[] = [];
        const rawOutput: string[] = [];

        for (const testName of selectedNames) {
            const trxDirectory = await this.createTestResultsDirectory();
            const runner = await this.dotnetTestRunnerForTarget(workspacePath, projectPath);
            const args = this.dotnetTestTargetArgs(projectPath, 'project', runner);
            if (request.noRestore !== false) {
                args.push('--no-restore');
            }
            args.push(...this.dotnetTestConsoleArgs(runner));
            args.push(...this.dotnetTestTrxArgs(runner, trxDirectory));
            if (testName) {
                args.push('--filter', `FullyQualifiedName=${testName}`);
            }
            try {
                const result = await this.runDotnet(workspacePath, args, 120000);
                const output = `${result.stdout}\n${result.stderr}`.trim();
                rawOutput.push(output);
                const trxResults = await this.readTrxTestResults(trxDirectory, projectPath, result);
                if (trxResults.length) {
                    results.push(...trxResults);
                } else {
                    results.push({
                        name: testName || csharpProjectDisplayName(projectPath),
                        projectPath,
                        outcome: this.testOutcome(result, output),
                        stdout: result.stdout,
                        stderr: result.stderr,
                        exitCode: result.exitCode,
                        durationMs: result.durationMs
                    });
                }
            } finally {
                await fsp.rm(trxDirectory, { recursive: true, force: true });
            }
        }

        return {
            projectPath,
            ok: results.every(result => result.outcome === 'passed' || result.outcome === 'skipped'),
            results,
            rawOutput: rawOutput.join('\n\n')
        };
    }

    async prepareTestDebugSession(request: CSharpTestDebugSessionRequest): Promise<CSharpTestDebugSession> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const projectPath = this.resolveInsideWorkspace(workspacePath, request.projectPath);
        const resultsDirectory = await this.createTestResultsDirectory();
        const runner = await this.dotnetTestRunnerForTarget(workspacePath, projectPath);
        const args = this.dotnetTestTargetArgs(projectPath, 'project', runner);
        if (request.noRestore !== false) {
            args.push('--no-restore');
        }
        args.push(...this.dotnetTestConsoleArgs(runner));
        args.push(...this.dotnetTestTrxArgs(runner, resultsDirectory));
        const testName = request.testName?.trim();
        if (testName) {
            args.push('--filter', `FullyQualifiedName=${testName}`);
        }
        return {
            projectPath,
            resultsDirectory,
            cwd: path.dirname(projectPath),
            args
        };
    }

    async collectTestResults(request: CSharpTestResultCaptureRequest): Promise<CSharpTestRunResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const projectPath = this.resolveInsideWorkspace(workspacePath, request.projectPath);
        const resultsDirectory = this.resolveTestResultsDirectory(request.resultsDirectory);
        const commandResult: CSharpCommandResult = {
            ok: true,
            command: 'dotnet test',
            cwd: workspacePath,
            stdout: '',
            stderr: '',
            exitCode: 0,
            durationMs: 0
        };
        try {
            const results = await this.readTrxTestResults(resultsDirectory, projectPath, commandResult);
            const rawOutput = results.length ? '' : `No TRX test results found in ${resultsDirectory}.`;
            return {
                projectPath,
                ok: results.length > 0 && results.every(result => result.outcome === 'passed' || result.outcome === 'skipped'),
                results,
                rawOutput
            };
        } finally {
            if (request.deleteResultsDirectory !== false) {
                await fsp.rm(resultsDirectory, { recursive: true, force: true });
            }
        }
    }

    async getDiagnostics(request: CSharpDiagnosticRequest): Promise<CSharpDiagnosticsResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const projectPath = request.projectPath ? this.resolveInsideWorkspace(workspacePath, request.projectPath) : undefined;
        const args = [
            'build',
            projectPath ?? workspacePath,
            '/property:GenerateFullPaths=true',
            '/consoleloggerparameters:NoSummary'
        ];
        if (request.noRestore) {
            args.push('--no-restore');
        }
        const commandResult = await this.runDotnet(workspacePath, args, 120000);
        const rawOutput = `${commandResult.stdout}\n${commandResult.stderr}`.trim();
        return {
            workspacePath,
            projectPath,
            diagnostics: parseDotnetBuildDiagnostics(rawOutput, projectPath).map(diagnostic =>
                this.resolveDiagnosticPaths(workspacePath, diagnostic, projectPath)
            ),
            rawOutput,
            commandResult
        };
    }

    async getLanguageServerDiagnostics(request: CSharpLanguageServerDocumentSymbolRequest): Promise<CSharpLanguageServerDiagnosticsResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const documentPath = this.resolveInsideWorkspace(workspacePath, request.documentPath);
        const language = request.language ?? this.languageServerLanguageForPath(documentPath);
        const adapter = this.getLanguageServerAdapters(workspacePath).find(candidate => candidate.language === language);
        if (!adapter || adapter.mode !== 'ready') {
            return {
                workspacePath,
                documentPath,
                source: 'unavailable',
                adapterId: adapter?.id,
                adapterLabel: adapter?.label,
                durationMs: 0,
                diagnostics: [],
                detail: adapter?.detail ?? `No ${language} language-server adapter is available.`
            };
        }
        return requestCSharpLanguageServerDiagnostics(
            adapter,
            workspacePath,
            documentPath,
            request.content,
            adapter.probeTimeoutMs
        );
    }

    async getLanguageServerWorkspaceDiagnostics(request: CSharpLanguageServerWorkspaceDiagnosticsRequest): Promise<CSharpLanguageServerWorkspaceDiagnosticsResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const language = request.language ?? 'csharp';
        const adapter = this.getLanguageServerAdapters(workspacePath).find(candidate => candidate.language === language);
        if (!adapter || adapter.mode !== 'ready') {
            return {
                workspacePath,
                source: 'unavailable',
                adapterId: adapter?.id,
                adapterLabel: adapter?.label,
                durationMs: 0,
                diagnostics: [],
                detail: adapter?.detail ?? `No ${language} language-server adapter is available.`
            };
        }
        return requestCSharpLanguageServerWorkspaceDiagnostics(
            adapter,
            workspacePath,
            adapter.probeTimeoutMs
        );
    }

    async probeLanguageServers(request: CSharpWorkspaceRequest): Promise<CSharpLanguageServerProbeResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const adapters = this.getLanguageServerAdapters(workspacePath);
        return {
            workspacePath,
            probes: await Promise.all(adapters.map(adapter => probeCSharpLanguageServerAdapter(adapter, workspacePath, adapter.probeTimeoutMs)))
        };
    }

    async getLanguageServerWorkspaceSymbols(request: CSharpLanguageServerWorkspaceSymbolRequest): Promise<CSharpLanguageServerWorkspaceSymbolResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const language = request.language ?? 'csharp';
        const adapter = this.getLanguageServerAdapters(workspacePath).find(candidate => candidate.language === language);
        if (!adapter || adapter.mode !== 'ready') {
            return {
                workspacePath,
                source: 'unavailable',
                adapterId: adapter?.id,
                adapterLabel: adapter?.label,
                durationMs: 0,
                symbols: [],
                detail: adapter?.detail ?? `No ${language} language-server adapter is available.`
            };
        }
        return requestCSharpLanguageServerWorkspaceSymbols(adapter, workspacePath, request.query, adapter.probeTimeoutMs);
    }

    async resolveLanguageServerWorkspaceSymbol(request: CSharpLanguageServerWorkspaceSymbolResolveRequest): Promise<CSharpLanguageServerWorkspaceSymbolResolveResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const language = request.language ?? this.languageServerLanguageForPath(this.filePathFromUri(request.symbol.uri));
        const adapter = this.getLanguageServerAdapters(workspacePath).find(candidate => candidate.language === language);
        if (!adapter || adapter.mode !== 'ready') {
            return {
                workspacePath,
                source: 'unavailable',
                adapterId: adapter?.id,
                adapterLabel: adapter?.label,
                durationMs: 0,
                detail: adapter?.detail ?? `No ${language} language-server adapter is available.`
            };
        }
        return requestCSharpLanguageServerResolveWorkspaceSymbol(adapter, workspacePath, request.symbol, adapter.probeTimeoutMs);
    }

    async getLanguageServerDocumentSymbols(request: CSharpLanguageServerDocumentSymbolRequest): Promise<CSharpLanguageServerDocumentSymbolResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const documentPath = this.resolveInsideWorkspace(workspacePath, request.documentPath);
        const language = request.language ?? this.languageServerLanguageForPath(documentPath);
        const adapter = this.getLanguageServerAdapters(workspacePath).find(candidate => candidate.language === language);
        if (!adapter || adapter.mode !== 'ready') {
            return {
                workspacePath,
                documentPath,
                source: 'unavailable',
                adapterId: adapter?.id,
                adapterLabel: adapter?.label,
                durationMs: 0,
                symbols: [],
                detail: adapter?.detail ?? `No ${language} language-server adapter is available.`
            };
        }
        return requestCSharpLanguageServerDocumentSymbols(adapter, workspacePath, documentPath, request.content, adapter.probeTimeoutMs);
    }

    async getLanguageServerDocumentLinks(request: CSharpLanguageServerDocumentSymbolRequest): Promise<CSharpLanguageServerDocumentLinkResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const documentPath = this.resolveInsideWorkspace(workspacePath, request.documentPath);
        const language = request.language ?? this.languageServerLanguageForPath(documentPath);
        const adapter = this.getLanguageServerAdapters(workspacePath).find(candidate => candidate.language === language);
        if (!adapter || adapter.mode !== 'ready') {
            return {
                workspacePath,
                documentPath,
                source: 'unavailable',
                adapterId: adapter?.id,
                adapterLabel: adapter?.label,
                durationMs: 0,
                links: [],
                detail: adapter?.detail ?? `No ${language} language-server adapter is available.`
            };
        }
        return requestCSharpLanguageServerDocumentLinks(adapter, workspacePath, documentPath, request.content, adapter.probeTimeoutMs);
    }

    async resolveLanguageServerDocumentLink(request: CSharpLanguageServerDocumentLinkResolveRequest): Promise<CSharpLanguageServerDocumentLinkResolveResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const documentPath = this.resolveInsideWorkspace(workspacePath, request.documentPath);
        const language = request.language ?? this.languageServerLanguageForPath(documentPath);
        const adapter = this.getLanguageServerAdapters(workspacePath).find(candidate => candidate.language === language);
        if (!adapter || adapter.mode !== 'ready') {
            return {
                workspacePath,
                documentPath,
                source: 'unavailable',
                adapterId: adapter?.id,
                adapterLabel: adapter?.label,
                durationMs: 0,
                detail: adapter?.detail ?? `No ${language} language-server adapter is available.`
            };
        }
        return requestCSharpLanguageServerResolveDocumentLink(
            adapter,
            workspacePath,
            documentPath,
            request.content,
            request.link,
            adapter.probeTimeoutMs
        );
    }

    async getLanguageServerDocumentColors(request: CSharpLanguageServerDocumentSymbolRequest): Promise<CSharpLanguageServerDocumentColorResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const documentPath = this.resolveInsideWorkspace(workspacePath, request.documentPath);
        const language = request.language ?? this.languageServerLanguageForPath(documentPath);
        const adapter = this.getLanguageServerAdapters(workspacePath).find(candidate => candidate.language === language);
        if (!adapter || adapter.mode !== 'ready') {
            return {
                workspacePath,
                documentPath,
                source: 'unavailable',
                adapterId: adapter?.id,
                adapterLabel: adapter?.label,
                durationMs: 0,
                colors: [],
                detail: adapter?.detail ?? `No ${language} language-server adapter is available.`
            };
        }
        return requestCSharpLanguageServerDocumentColors(adapter, workspacePath, documentPath, request.content, adapter.probeTimeoutMs);
    }

    async getLanguageServerCodeLenses(request: CSharpLanguageServerDocumentSymbolRequest): Promise<CSharpLanguageServerCodeLensResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const documentPath = this.resolveInsideWorkspace(workspacePath, request.documentPath);
        const language = request.language ?? this.languageServerLanguageForPath(documentPath);
        const adapter = this.getLanguageServerAdapters(workspacePath).find(candidate => candidate.language === language);
        if (!adapter || adapter.mode !== 'ready') {
            return {
                workspacePath,
                documentPath,
                source: 'unavailable',
                adapterId: adapter?.id,
                adapterLabel: adapter?.label,
                durationMs: 0,
                lenses: [],
                detail: adapter?.detail ?? `No ${language} language-server adapter is available.`
            };
        }
        return requestCSharpLanguageServerCodeLenses(adapter, workspacePath, documentPath, request.content, adapter.probeTimeoutMs);
    }

    async resolveLanguageServerCodeLens(request: CSharpLanguageServerCodeLensResolveRequest): Promise<CSharpLanguageServerCodeLensResolveResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const documentPath = this.resolveInsideWorkspace(workspacePath, request.documentPath);
        const language = request.language ?? this.languageServerLanguageForPath(documentPath);
        const adapter = this.getLanguageServerAdapters(workspacePath).find(candidate => candidate.language === language);
        if (!adapter || adapter.mode !== 'ready') {
            return {
                workspacePath,
                documentPath,
                source: 'unavailable',
                adapterId: adapter?.id,
                adapterLabel: adapter?.label,
                durationMs: 0,
                detail: adapter?.detail ?? `No ${language} language-server adapter is available.`
            };
        }
        return requestCSharpLanguageServerResolveCodeLens(adapter, workspacePath, documentPath, request.content, request.lens, adapter.probeTimeoutMs);
    }

    async getLanguageServerColorPresentations(request: CSharpLanguageServerColorPresentationRequest): Promise<CSharpLanguageServerColorPresentationResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const documentPath = this.resolveInsideWorkspace(workspacePath, request.documentPath);
        const language = request.language ?? this.languageServerLanguageForPath(documentPath);
        const adapter = this.getLanguageServerAdapters(workspacePath).find(candidate => candidate.language === language);
        if (!adapter || adapter.mode !== 'ready') {
            return {
                workspacePath,
                documentPath,
                source: 'unavailable',
                adapterId: adapter?.id,
                adapterLabel: adapter?.label,
                durationMs: 0,
                presentations: [],
                detail: adapter?.detail ?? `No ${language} language-server adapter is available.`
            };
        }
        return requestCSharpLanguageServerColorPresentations(
            adapter,
            workspacePath,
            documentPath,
            request.content,
            request.range,
            request.color,
            adapter.probeTimeoutMs
        );
    }

    async getLanguageServerLinkedEditingRanges(request: CSharpLanguageServerTextDocumentPositionRequest): Promise<CSharpLanguageServerLinkedEditingRangeResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const documentPath = this.resolveInsideWorkspace(workspacePath, request.documentPath);
        const language = request.language ?? this.languageServerLanguageForPath(documentPath);
        const adapter = this.getLanguageServerAdapters(workspacePath).find(candidate => candidate.language === language);
        if (!adapter || adapter.mode !== 'ready') {
            return {
                workspacePath,
                documentPath,
                source: 'unavailable',
                adapterId: adapter?.id,
                adapterLabel: adapter?.label,
                durationMs: 0,
                ranges: [],
                detail: adapter?.detail ?? `No ${language} language-server adapter is available.`
            };
        }
        return requestCSharpLanguageServerLinkedEditingRanges(
            adapter,
            workspacePath,
            documentPath,
            request.content,
            { line: request.line, column: request.column },
            adapter.probeTimeoutMs
        );
    }

    async getLanguageServerMonikers(request: CSharpLanguageServerTextDocumentPositionRequest): Promise<CSharpLanguageServerMonikerResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const documentPath = this.resolveInsideWorkspace(workspacePath, request.documentPath);
        const language = request.language ?? this.languageServerLanguageForPath(documentPath);
        const adapter = this.getLanguageServerAdapters(workspacePath).find(candidate => candidate.language === language);
        if (!adapter || adapter.mode !== 'ready') {
            return {
                workspacePath,
                documentPath,
                source: 'unavailable',
                adapterId: adapter?.id,
                adapterLabel: adapter?.label,
                durationMs: 0,
                monikers: [],
                detail: adapter?.detail ?? `No ${language} language-server adapter is available.`
            };
        }
        return requestCSharpLanguageServerMonikers(
            adapter,
            workspacePath,
            documentPath,
            request.content,
            { line: request.line, column: request.column },
            adapter.probeTimeoutMs
        );
    }

    async getLanguageServerEvaluatableExpression(request: CSharpLanguageServerTextDocumentPositionRequest): Promise<CSharpLanguageServerEvaluatableExpressionResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const documentPath = this.resolveInsideWorkspace(workspacePath, request.documentPath);
        const language = request.language ?? this.languageServerLanguageForPath(documentPath);
        const adapter = this.getLanguageServerAdapters(workspacePath).find(candidate => candidate.language === language);
        if (!adapter || adapter.mode !== 'ready') {
            return {
                workspacePath,
                documentPath,
                source: 'unavailable',
                adapterId: adapter?.id,
                adapterLabel: adapter?.label,
                durationMs: 0,
                detail: adapter?.detail ?? `No ${language} language-server adapter is available.`
            };
        }
        return requestCSharpLanguageServerEvaluatableExpression(
            adapter,
            workspacePath,
            documentPath,
            request.content,
            { line: request.line, column: request.column },
            adapter.probeTimeoutMs
        );
    }

    async getLanguageServerInlineValues(request: CSharpLanguageServerInlineValueRequest): Promise<CSharpLanguageServerInlineValueResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const documentPath = this.resolveInsideWorkspace(workspacePath, request.documentPath);
        const language = request.language ?? this.languageServerLanguageForPath(documentPath);
        const adapter = this.getLanguageServerAdapters(workspacePath).find(candidate => candidate.language === language);
        if (!adapter || adapter.mode !== 'ready') {
            return {
                workspacePath,
                documentPath,
                source: 'unavailable',
                adapterId: adapter?.id,
                adapterLabel: adapter?.label,
                durationMs: 0,
                inlineValues: [],
                detail: adapter?.detail ?? `No ${language} language-server adapter is available.`
            };
        }
        return requestCSharpLanguageServerInlineValues(
            adapter,
            workspacePath,
            documentPath,
            request.content,
            request.range,
            request.context,
            adapter.probeTimeoutMs
        );
    }

    async getLanguageServerSemanticTokens(request: CSharpLanguageServerSemanticTokensRequest): Promise<CSharpLanguageServerSemanticTokensResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const documentPath = this.resolveInsideWorkspace(workspacePath, request.documentPath);
        const language = request.language ?? this.languageServerLanguageForPath(documentPath);
        const adapter = this.getLanguageServerAdapters(workspacePath).find(candidate => candidate.language === language);
        if (!adapter || adapter.mode !== 'ready') {
            return {
                workspacePath,
                documentPath,
                source: 'unavailable',
                adapterId: adapter?.id,
                adapterLabel: adapter?.label,
                durationMs: 0,
                data: [],
                detail: adapter?.detail ?? `No ${language} language-server adapter is available.`
            };
        }
        return requestCSharpLanguageServerSemanticTokens(
            adapter,
            workspacePath,
            documentPath,
            request.content,
            adapter.probeTimeoutMs,
            request.previousResultId
        );
    }

    async getLanguageServerRangeSemanticTokens(request: CSharpLanguageServerRangeSemanticTokensRequest): Promise<CSharpLanguageServerSemanticTokensResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const documentPath = this.resolveInsideWorkspace(workspacePath, request.documentPath);
        const language = request.language ?? this.languageServerLanguageForPath(documentPath);
        const adapter = this.getLanguageServerAdapters(workspacePath).find(candidate => candidate.language === language);
        if (!adapter || adapter.mode !== 'ready') {
            return {
                workspacePath,
                documentPath,
                source: 'unavailable',
                adapterId: adapter?.id,
                adapterLabel: adapter?.label,
                durationMs: 0,
                data: [],
                detail: adapter?.detail ?? `No ${language} language-server adapter is available.`
            };
        }
        return requestCSharpLanguageServerRangeSemanticTokens(
            adapter,
            workspacePath,
            documentPath,
            request.content,
            request.range,
            adapter.probeTimeoutMs
        );
    }

    async getLanguageServerFoldingRanges(request: CSharpLanguageServerDocumentSymbolRequest): Promise<CSharpLanguageServerFoldingRangeResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const documentPath = this.resolveInsideWorkspace(workspacePath, request.documentPath);
        const language = request.language ?? this.languageServerLanguageForPath(documentPath);
        const adapter = this.getLanguageServerAdapters(workspacePath).find(candidate => candidate.language === language);
        if (!adapter || adapter.mode !== 'ready') {
            return {
                workspacePath,
                documentPath,
                source: 'unavailable',
                adapterId: adapter?.id,
                adapterLabel: adapter?.label,
                durationMs: 0,
                ranges: [],
                detail: adapter?.detail ?? `No ${language} language-server adapter is available.`
            };
        }
        return requestCSharpLanguageServerFoldingRanges(adapter, workspacePath, documentPath, request.content, adapter.probeTimeoutMs);
    }

    async getLanguageServerSelectionRanges(request: CSharpLanguageServerSelectionRangeRequest): Promise<CSharpLanguageServerSelectionRangeResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const documentPath = this.resolveInsideWorkspace(workspacePath, request.documentPath);
        const language = request.language ?? this.languageServerLanguageForPath(documentPath);
        const adapter = this.getLanguageServerAdapters(workspacePath).find(candidate => candidate.language === language);
        if (!adapter || adapter.mode !== 'ready') {
            return {
                workspacePath,
                documentPath,
                source: 'unavailable',
                adapterId: adapter?.id,
                adapterLabel: adapter?.label,
                durationMs: 0,
                ranges: [],
                detail: adapter?.detail ?? `No ${language} language-server adapter is available.`
            };
        }
        return requestCSharpLanguageServerSelectionRanges(
            adapter,
            workspacePath,
            documentPath,
            request.content,
            request.positions,
            adapter.probeTimeoutMs
        );
    }

    async getLanguageServerHover(request: CSharpLanguageServerTextDocumentPositionRequest): Promise<CSharpLanguageServerHoverResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const documentPath = this.resolveInsideWorkspace(workspacePath, request.documentPath);
        const language = request.language ?? this.languageServerLanguageForPath(documentPath);
        const adapter = this.getLanguageServerAdapters(workspacePath).find(candidate => candidate.language === language);
        if (!adapter || adapter.mode !== 'ready') {
            return {
                workspacePath,
                documentPath,
                source: 'unavailable',
                adapterId: adapter?.id,
                adapterLabel: adapter?.label,
                durationMs: 0,
                contents: [],
                detail: adapter?.detail ?? `No ${language} language-server adapter is available.`
            };
        }
        return requestCSharpLanguageServerHover(
            adapter,
            workspacePath,
            documentPath,
            request.content,
            { line: request.line, column: request.column },
            adapter.probeTimeoutMs
        );
    }

    async getLanguageServerDocumentHighlights(request: CSharpLanguageServerTextDocumentPositionRequest): Promise<CSharpLanguageServerDocumentHighlightResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const documentPath = this.resolveInsideWorkspace(workspacePath, request.documentPath);
        const language = request.language ?? this.languageServerLanguageForPath(documentPath);
        const adapter = this.getLanguageServerAdapters(workspacePath).find(candidate => candidate.language === language);
        if (!adapter || adapter.mode !== 'ready') {
            return {
                workspacePath,
                documentPath,
                source: 'unavailable',
                adapterId: adapter?.id,
                adapterLabel: adapter?.label,
                durationMs: 0,
                highlights: [],
                detail: adapter?.detail ?? `No ${language} language-server adapter is available.`
            };
        }
        return requestCSharpLanguageServerDocumentHighlights(
            adapter,
            workspacePath,
            documentPath,
            request.content,
            { line: request.line, column: request.column },
            adapter.probeTimeoutMs
        );
    }

    async getLanguageServerDefinitions(request: CSharpLanguageServerTextDocumentPositionRequest): Promise<CSharpLanguageServerDefinitionResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const documentPath = this.resolveInsideWorkspace(workspacePath, request.documentPath);
        const language = request.language ?? this.languageServerLanguageForPath(documentPath);
        const adapter = this.getLanguageServerAdapters(workspacePath).find(candidate => candidate.language === language);
        if (!adapter || adapter.mode !== 'ready') {
            return {
                workspacePath,
                documentPath,
                source: 'unavailable',
                adapterId: adapter?.id,
                adapterLabel: adapter?.label,
                durationMs: 0,
                locations: [],
                detail: adapter?.detail ?? `No ${language} language-server adapter is available.`
            };
        }
        return requestCSharpLanguageServerDefinitions(
            adapter,
            workspacePath,
            documentPath,
            request.content,
            { line: request.line, column: request.column },
            adapter.probeTimeoutMs
        );
    }

    async getLanguageServerDeclarations(request: CSharpLanguageServerTextDocumentPositionRequest): Promise<CSharpLanguageServerDefinitionResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const documentPath = this.resolveInsideWorkspace(workspacePath, request.documentPath);
        const language = request.language ?? this.languageServerLanguageForPath(documentPath);
        const adapter = this.getLanguageServerAdapters(workspacePath).find(candidate => candidate.language === language);
        if (!adapter || adapter.mode !== 'ready') {
            return {
                workspacePath,
                documentPath,
                source: 'unavailable',
                adapterId: adapter?.id,
                adapterLabel: adapter?.label,
                durationMs: 0,
                locations: [],
                detail: adapter?.detail ?? `No ${language} language-server adapter is available.`
            };
        }
        return requestCSharpLanguageServerDeclarations(
            adapter,
            workspacePath,
            documentPath,
            request.content,
            { line: request.line, column: request.column },
            adapter.probeTimeoutMs
        );
    }

    async getLanguageServerImplementations(request: CSharpLanguageServerTextDocumentPositionRequest): Promise<CSharpLanguageServerDefinitionResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const documentPath = this.resolveInsideWorkspace(workspacePath, request.documentPath);
        const language = request.language ?? this.languageServerLanguageForPath(documentPath);
        const adapter = this.getLanguageServerAdapters(workspacePath).find(candidate => candidate.language === language);
        if (!adapter || adapter.mode !== 'ready') {
            return {
                workspacePath,
                documentPath,
                source: 'unavailable',
                adapterId: adapter?.id,
                adapterLabel: adapter?.label,
                durationMs: 0,
                locations: [],
                detail: adapter?.detail ?? `No ${language} language-server adapter is available.`
            };
        }
        return requestCSharpLanguageServerImplementations(
            adapter,
            workspacePath,
            documentPath,
            request.content,
            { line: request.line, column: request.column },
            adapter.probeTimeoutMs
        );
    }

    async getLanguageServerTypeDefinitions(request: CSharpLanguageServerTextDocumentPositionRequest): Promise<CSharpLanguageServerDefinitionResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const documentPath = this.resolveInsideWorkspace(workspacePath, request.documentPath);
        const language = request.language ?? this.languageServerLanguageForPath(documentPath);
        const adapter = this.getLanguageServerAdapters(workspacePath).find(candidate => candidate.language === language);
        if (!adapter || adapter.mode !== 'ready') {
            return {
                workspacePath,
                documentPath,
                source: 'unavailable',
                adapterId: adapter?.id,
                adapterLabel: adapter?.label,
                durationMs: 0,
                locations: [],
                detail: adapter?.detail ?? `No ${language} language-server adapter is available.`
            };
        }
        return requestCSharpLanguageServerTypeDefinitions(
            adapter,
            workspacePath,
            documentPath,
            request.content,
            { line: request.line, column: request.column },
            adapter.probeTimeoutMs
        );
    }

    async prepareLanguageServerCallHierarchy(request: CSharpLanguageServerTextDocumentPositionRequest): Promise<CSharpLanguageServerCallHierarchyPrepareResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const documentPath = this.resolveInsideWorkspace(workspacePath, request.documentPath);
        const language = request.language ?? this.languageServerLanguageForPath(documentPath);
        const adapter = this.getLanguageServerAdapters(workspacePath).find(candidate => candidate.language === language);
        if (!adapter || adapter.mode !== 'ready') {
            return {
                workspacePath,
                documentPath,
                source: 'unavailable',
                adapterId: adapter?.id,
                adapterLabel: adapter?.label,
                durationMs: 0,
                items: [],
                detail: adapter?.detail ?? `No ${language} language-server adapter is available.`
            };
        }
        return requestCSharpLanguageServerPrepareCallHierarchy(
            adapter,
            workspacePath,
            documentPath,
            request.content,
            { line: request.line, column: request.column },
            adapter.probeTimeoutMs
        );
    }

    async getLanguageServerCallHierarchyIncomingCalls(request: CSharpLanguageServerCallHierarchyItemRequest): Promise<CSharpLanguageServerCallHierarchyIncomingResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const documentPath = this.resolveInsideWorkspace(workspacePath, this.filePathFromUri(request.item.uri));
        const language = request.language ?? this.languageServerLanguageForPath(documentPath);
        const adapter = this.getLanguageServerAdapters(workspacePath).find(candidate => candidate.language === language);
        if (!adapter || adapter.mode !== 'ready') {
            return {
                workspacePath,
                documentPath,
                source: 'unavailable',
                adapterId: adapter?.id,
                adapterLabel: adapter?.label,
                durationMs: 0,
                calls: [],
                detail: adapter?.detail ?? `No ${language} language-server adapter is available.`
            };
        }
        return requestCSharpLanguageServerCallHierarchyIncomingCalls(
            adapter,
            workspacePath,
            documentPath,
            request.item,
            adapter.probeTimeoutMs
        );
    }

    async getLanguageServerCallHierarchyOutgoingCalls(request: CSharpLanguageServerCallHierarchyItemRequest): Promise<CSharpLanguageServerCallHierarchyOutgoingResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const documentPath = this.resolveInsideWorkspace(workspacePath, this.filePathFromUri(request.item.uri));
        const language = request.language ?? this.languageServerLanguageForPath(documentPath);
        const adapter = this.getLanguageServerAdapters(workspacePath).find(candidate => candidate.language === language);
        if (!adapter || adapter.mode !== 'ready') {
            return {
                workspacePath,
                documentPath,
                source: 'unavailable',
                adapterId: adapter?.id,
                adapterLabel: adapter?.label,
                durationMs: 0,
                calls: [],
                detail: adapter?.detail ?? `No ${language} language-server adapter is available.`
            };
        }
        return requestCSharpLanguageServerCallHierarchyOutgoingCalls(
            adapter,
            workspacePath,
            documentPath,
            request.item,
            adapter.probeTimeoutMs
        );
    }

    async prepareLanguageServerTypeHierarchy(request: CSharpLanguageServerTextDocumentPositionRequest): Promise<CSharpLanguageServerTypeHierarchyPrepareResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const documentPath = this.resolveInsideWorkspace(workspacePath, request.documentPath);
        const language = request.language ?? this.languageServerLanguageForPath(documentPath);
        const adapter = this.getLanguageServerAdapters(workspacePath).find(candidate => candidate.language === language);
        if (!adapter || adapter.mode !== 'ready') {
            return {
                workspacePath,
                documentPath,
                source: 'unavailable',
                adapterId: adapter?.id,
                adapterLabel: adapter?.label,
                durationMs: 0,
                items: [],
                detail: adapter?.detail ?? `No ${language} language-server adapter is available.`
            };
        }
        return requestCSharpLanguageServerPrepareTypeHierarchy(
            adapter,
            workspacePath,
            documentPath,
            request.content,
            { line: request.line, column: request.column },
            adapter.probeTimeoutMs
        );
    }

    async getLanguageServerTypeHierarchySupertypes(request: CSharpLanguageServerTypeHierarchyItemRequest): Promise<CSharpLanguageServerTypeHierarchyResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const documentPath = this.resolveInsideWorkspace(workspacePath, this.filePathFromUri(request.item.uri));
        const language = request.language ?? this.languageServerLanguageForPath(documentPath);
        const adapter = this.getLanguageServerAdapters(workspacePath).find(candidate => candidate.language === language);
        if (!adapter || adapter.mode !== 'ready') {
            return {
                workspacePath,
                documentPath,
                source: 'unavailable',
                adapterId: adapter?.id,
                adapterLabel: adapter?.label,
                durationMs: 0,
                items: [],
                detail: adapter?.detail ?? `No ${language} language-server adapter is available.`
            };
        }
        return requestCSharpLanguageServerTypeHierarchySupertypes(
            adapter,
            workspacePath,
            documentPath,
            request.item,
            adapter.probeTimeoutMs
        );
    }

    async getLanguageServerTypeHierarchySubtypes(request: CSharpLanguageServerTypeHierarchyItemRequest): Promise<CSharpLanguageServerTypeHierarchyResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const documentPath = this.resolveInsideWorkspace(workspacePath, this.filePathFromUri(request.item.uri));
        const language = request.language ?? this.languageServerLanguageForPath(documentPath);
        const adapter = this.getLanguageServerAdapters(workspacePath).find(candidate => candidate.language === language);
        if (!adapter || adapter.mode !== 'ready') {
            return {
                workspacePath,
                documentPath,
                source: 'unavailable',
                adapterId: adapter?.id,
                adapterLabel: adapter?.label,
                durationMs: 0,
                items: [],
                detail: adapter?.detail ?? `No ${language} language-server adapter is available.`
            };
        }
        return requestCSharpLanguageServerTypeHierarchySubtypes(
            adapter,
            workspacePath,
            documentPath,
            request.item,
            adapter.probeTimeoutMs
        );
    }

    async getLanguageServerReferences(request: CSharpLanguageServerTextDocumentPositionRequest): Promise<CSharpLanguageServerReferencesResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const documentPath = this.resolveInsideWorkspace(workspacePath, request.documentPath);
        const language = request.language ?? this.languageServerLanguageForPath(documentPath);
        const adapter = this.getLanguageServerAdapters(workspacePath).find(candidate => candidate.language === language);
        if (!adapter || adapter.mode !== 'ready') {
            return {
                workspacePath,
                documentPath,
                source: 'unavailable',
                adapterId: adapter?.id,
                adapterLabel: adapter?.label,
                durationMs: 0,
                locations: [],
                detail: adapter?.detail ?? `No ${language} language-server adapter is available.`
            };
        }
        return requestCSharpLanguageServerReferences(
            adapter,
            workspacePath,
            documentPath,
            request.content,
            { line: request.line, column: request.column },
            request.includeDeclaration ?? true,
            adapter.probeTimeoutMs
        );
    }

    async getLanguageServerPrepareRename(request: CSharpLanguageServerTextDocumentPositionRequest): Promise<CSharpLanguageServerPrepareRenameResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const documentPath = this.resolveInsideWorkspace(workspacePath, request.documentPath);
        const language = request.language ?? this.languageServerLanguageForPath(documentPath);
        const adapter = this.getLanguageServerAdapters(workspacePath).find(candidate => candidate.language === language);
        if (!adapter || adapter.mode !== 'ready') {
            return {
                workspacePath,
                documentPath,
                source: 'unavailable',
                adapterId: adapter?.id,
                adapterLabel: adapter?.label,
                durationMs: 0,
                detail: adapter?.detail ?? `No ${language} language-server adapter is available.`
            };
        }
        return requestCSharpLanguageServerPrepareRename(
            adapter,
            workspacePath,
            documentPath,
            request.content,
            { line: request.line, column: request.column },
            adapter.probeTimeoutMs
        );
    }

    async getLanguageServerRenameEdits(request: CSharpLanguageServerRenameRequest): Promise<CSharpLanguageServerWorkspaceEditResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const documentPath = this.resolveInsideWorkspace(workspacePath, request.documentPath);
        const language = request.language ?? this.languageServerLanguageForPath(documentPath);
        const adapter = this.getLanguageServerAdapters(workspacePath).find(candidate => candidate.language === language);
        if (!adapter || adapter.mode !== 'ready') {
            return {
                workspacePath,
                documentPath,
                source: 'unavailable',
                adapterId: adapter?.id,
                adapterLabel: adapter?.label,
                durationMs: 0,
                edits: [],
                detail: adapter?.detail ?? `No ${language} language-server adapter is available.`
            };
        }
        return requestCSharpLanguageServerRename(
            adapter,
            workspacePath,
            documentPath,
            request.content,
            { line: request.line, column: request.column },
            request.newName,
            adapter.probeTimeoutMs
        );
    }

    async getLanguageServerNewSymbolNames(request: CSharpLanguageServerNewSymbolNamesRequest): Promise<CSharpLanguageServerNewSymbolNamesResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const documentPath = this.resolveInsideWorkspace(workspacePath, request.documentPath);
        const language = request.language ?? this.languageServerLanguageForPath(documentPath);
        const adapter = this.getLanguageServerAdapters(workspacePath).find(candidate => candidate.language === language);
        if (!adapter || adapter.mode !== 'ready') {
            return {
                workspacePath,
                documentPath,
                source: 'unavailable',
                adapterId: adapter?.id,
                adapterLabel: adapter?.label,
                durationMs: 0,
                names: [],
                detail: adapter?.detail ?? `No ${language} language-server adapter is available.`
            };
        }
        return requestCSharpLanguageServerNewSymbolNames(
            adapter,
            workspacePath,
            documentPath,
            request.content,
            request.range,
            request.triggerKind,
            adapter.probeTimeoutMs
        );
    }

    async getLanguageServerFormattingEdits(request: CSharpLanguageServerFormattingRequest): Promise<CSharpLanguageServerTextEditResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const documentPath = this.resolveInsideWorkspace(workspacePath, request.documentPath);
        const language = request.language ?? this.languageServerLanguageForPath(documentPath);
        const adapter = this.getLanguageServerAdapters(workspacePath).find(candidate => candidate.language === language);
        if (!adapter || adapter.mode !== 'ready') {
            return {
                workspacePath,
                documentPath,
                source: 'unavailable',
                adapterId: adapter?.id,
                adapterLabel: adapter?.label,
                durationMs: 0,
                edits: [],
                detail: adapter?.detail ?? `No ${language} language-server adapter is available.`
            };
        }
        return requestCSharpLanguageServerFormatting(
            adapter,
            workspacePath,
            documentPath,
            request.content,
            request.options,
            adapter.probeTimeoutMs
        );
    }

    async getLanguageServerRangeFormattingEdits(request: CSharpLanguageServerRangeFormattingRequest): Promise<CSharpLanguageServerTextEditResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const documentPath = this.resolveInsideWorkspace(workspacePath, request.documentPath);
        const language = request.language ?? this.languageServerLanguageForPath(documentPath);
        const adapter = this.getLanguageServerAdapters(workspacePath).find(candidate => candidate.language === language);
        if (!adapter || adapter.mode !== 'ready') {
            return {
                workspacePath,
                documentPath,
                source: 'unavailable',
                adapterId: adapter?.id,
                adapterLabel: adapter?.label,
                durationMs: 0,
                edits: [],
                detail: adapter?.detail ?? `No ${language} language-server adapter is available.`
            };
        }
        return requestCSharpLanguageServerRangeFormatting(
            adapter,
            workspacePath,
            documentPath,
            request.content,
            request.range,
            request.options,
            adapter.probeTimeoutMs
        );
    }

    async getLanguageServerRangesFormattingEdits(request: CSharpLanguageServerRangesFormattingRequest): Promise<CSharpLanguageServerTextEditResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const documentPath = this.resolveInsideWorkspace(workspacePath, request.documentPath);
        const language = request.language ?? this.languageServerLanguageForPath(documentPath);
        const adapter = this.getLanguageServerAdapters(workspacePath).find(candidate => candidate.language === language);
        if (!adapter || adapter.mode !== 'ready') {
            return {
                workspacePath,
                documentPath,
                source: 'unavailable',
                adapterId: adapter?.id,
                adapterLabel: adapter?.label,
                durationMs: 0,
                edits: [],
                detail: adapter?.detail ?? `No ${language} language-server adapter is available.`
            };
        }
        return requestCSharpLanguageServerRangesFormatting(
            adapter,
            workspacePath,
            documentPath,
            request.content,
            request.ranges,
            request.options,
            adapter.probeTimeoutMs
        );
    }

    async getLanguageServerOnTypeFormattingEdits(request: CSharpLanguageServerOnTypeFormattingRequest): Promise<CSharpLanguageServerTextEditResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const documentPath = this.resolveInsideWorkspace(workspacePath, request.documentPath);
        const language = request.language ?? this.languageServerLanguageForPath(documentPath);
        const adapter = this.getLanguageServerAdapters(workspacePath).find(candidate => candidate.language === language);
        if (!adapter || adapter.mode !== 'ready') {
            return {
                workspacePath,
                documentPath,
                source: 'unavailable',
                adapterId: adapter?.id,
                adapterLabel: adapter?.label,
                durationMs: 0,
                edits: [],
                detail: adapter?.detail ?? `No ${language} language-server adapter is available.`
            };
        }
        return requestCSharpLanguageServerOnTypeFormatting(
            adapter,
            workspacePath,
            documentPath,
            request.content,
            { line: request.line, column: request.column },
            request.ch,
            request.options,
            adapter.probeTimeoutMs
        );
    }

    async getLanguageServerInlayHints(request: CSharpLanguageServerInlayHintRequest): Promise<CSharpLanguageServerInlayHintResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const documentPath = this.resolveInsideWorkspace(workspacePath, request.documentPath);
        const language = request.language ?? this.languageServerLanguageForPath(documentPath);
        const adapter = this.getLanguageServerAdapters(workspacePath).find(candidate => candidate.language === language);
        if (!adapter || adapter.mode !== 'ready') {
            return {
                workspacePath,
                documentPath,
                source: 'unavailable',
                adapterId: adapter?.id,
                adapterLabel: adapter?.label,
                durationMs: 0,
                hints: [],
                detail: adapter?.detail ?? `No ${language} language-server adapter is available.`
            };
        }
        return requestCSharpLanguageServerInlayHints(
            adapter,
            workspacePath,
            documentPath,
            request.content,
            request.range,
            adapter.probeTimeoutMs
        );
    }

    async resolveLanguageServerInlayHint(request: CSharpLanguageServerInlayHintResolveRequest): Promise<CSharpLanguageServerInlayHintResolveResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const documentPath = this.resolveInsideWorkspace(workspacePath, request.documentPath);
        const language = request.language ?? this.languageServerLanguageForPath(documentPath);
        const adapter = this.getLanguageServerAdapters(workspacePath).find(candidate => candidate.language === language);
        if (!adapter || adapter.mode !== 'ready') {
            return {
                workspacePath,
                documentPath,
                source: 'unavailable',
                adapterId: adapter?.id,
                adapterLabel: adapter?.label,
                durationMs: 0,
                detail: adapter?.detail ?? `No ${language} language-server adapter is available.`
            };
        }
        return requestCSharpLanguageServerResolveInlayHint(
            adapter,
            workspacePath,
            documentPath,
            request.content,
            request.hint,
            adapter.probeTimeoutMs
        );
    }

    async getLanguageServerCodeActions(request: CSharpLanguageServerCodeActionRequest): Promise<CSharpLanguageServerCodeActionResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const documentPath = this.resolveInsideWorkspace(workspacePath, request.documentPath);
        const language = request.language ?? this.languageServerLanguageForPath(documentPath);
        const adapter = this.getLanguageServerAdapters(workspacePath).find(candidate => candidate.language === language);
        if (!adapter || adapter.mode !== 'ready') {
            return {
                workspacePath,
                documentPath,
                source: 'unavailable',
                adapterId: adapter?.id,
                adapterLabel: adapter?.label,
                durationMs: 0,
                actions: [],
                detail: adapter?.detail ?? `No ${language} language-server adapter is available.`
            };
        }
        return requestCSharpLanguageServerCodeActions(
            adapter,
            workspacePath,
            documentPath,
            request.content,
            request.range,
            request.only,
            request.triggerKind ?? 'invoke',
            adapter.probeTimeoutMs,
            request.diagnostics
        );
    }

    async resolveLanguageServerCodeAction(request: CSharpLanguageServerCodeActionResolveRequest): Promise<CSharpLanguageServerCodeActionResolveResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const documentPath = this.resolveInsideWorkspace(workspacePath, request.documentPath);
        const language = request.language ?? this.languageServerLanguageForPath(documentPath);
        const adapter = this.getLanguageServerAdapters(workspacePath).find(candidate => candidate.language === language);
        if (!adapter || adapter.mode !== 'ready') {
            return {
                workspacePath,
                documentPath,
                source: 'unavailable',
                adapterId: adapter?.id,
                adapterLabel: adapter?.label,
                durationMs: 0,
                detail: adapter?.detail ?? `No ${language} language-server adapter is available.`
            };
        }
        return requestCSharpLanguageServerResolveCodeAction(
            adapter,
            workspacePath,
            documentPath,
            request.content,
            request.action,
            adapter.probeTimeoutMs
        );
    }

    async getLanguageServerCompletions(request: CSharpLanguageServerTextDocumentPositionRequest): Promise<CSharpLanguageServerCompletionResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const documentPath = this.resolveInsideWorkspace(workspacePath, request.documentPath);
        const language = request.language ?? this.languageServerLanguageForPath(documentPath);
        const adapter = this.getLanguageServerAdapters(workspacePath).find(candidate => candidate.language === language);
        if (!adapter || adapter.mode !== 'ready') {
            return {
                workspacePath,
                documentPath,
                source: 'unavailable',
                adapterId: adapter?.id,
                adapterLabel: adapter?.label,
                durationMs: 0,
                items: [],
                detail: adapter?.detail ?? `No ${language} language-server adapter is available.`
            };
        }
        return requestCSharpLanguageServerCompletions(
            adapter,
            workspacePath,
            documentPath,
            request.content,
            { line: request.line, column: request.column },
            adapter.probeTimeoutMs,
            request.completionContext
        );
    }

    async resolveLanguageServerCompletionItem(request: CSharpLanguageServerCompletionItemResolveRequest): Promise<CSharpLanguageServerCompletionItemResolveResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const documentPath = this.resolveInsideWorkspace(workspacePath, request.documentPath);
        const language = request.language ?? this.languageServerLanguageForPath(documentPath);
        const adapter = this.getLanguageServerAdapters(workspacePath).find(candidate => candidate.language === language);
        if (!adapter || adapter.mode !== 'ready') {
            return {
                workspacePath,
                documentPath,
                source: 'unavailable',
                adapterId: adapter?.id,
                adapterLabel: adapter?.label,
                durationMs: 0,
                detail: adapter?.detail ?? `No ${language} language-server adapter is available.`
            };
        }
        return requestCSharpLanguageServerResolveCompletionItem(
            adapter,
            workspacePath,
            documentPath,
            request.content,
            request.item,
            adapter.probeTimeoutMs
        );
    }

    async getLanguageServerInlineCompletions(request: CSharpLanguageServerInlineCompletionRequest): Promise<CSharpLanguageServerInlineCompletionResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const documentPath = this.resolveInsideWorkspace(workspacePath, request.documentPath);
        const language = request.language ?? this.languageServerLanguageForPath(documentPath);
        const adapter = this.getLanguageServerAdapters(workspacePath).find(candidate => candidate.language === language);
        if (!adapter || adapter.mode !== 'ready') {
            return {
                workspacePath,
                documentPath,
                source: 'unavailable',
                adapterId: adapter?.id,
                adapterLabel: adapter?.label,
                durationMs: 0,
                items: [],
                detail: adapter?.detail ?? `No ${language} language-server adapter is available.`
            };
        }
        return requestCSharpLanguageServerInlineCompletions(
            adapter,
            workspacePath,
            documentPath,
            request.content,
            { line: request.line, column: request.column },
            request.inlineCompletionContext,
            adapter.probeTimeoutMs
        );
    }

    async executeLanguageServerCommand(request: CSharpLanguageServerExecuteCommandRequest): Promise<CSharpLanguageServerExecuteCommandResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const documentPath = this.resolveInsideWorkspace(workspacePath, request.documentPath);
        const language = request.language ?? this.languageServerLanguageForPath(documentPath);
        const adapter = this.getLanguageServerAdapters(workspacePath).find(candidate => candidate.language === language);
        if (!adapter || adapter.mode !== 'ready') {
            return {
                workspacePath,
                documentPath,
                source: 'unavailable',
                adapterId: adapter?.id,
                adapterLabel: adapter?.label,
                durationMs: 0,
                edits: [],
                detail: adapter?.detail ?? `No ${language} language-server adapter is available.`
            };
        }
        return requestCSharpLanguageServerExecuteCommand(
            adapter,
            workspacePath,
            documentPath,
            request.content,
            request.command,
            request.arguments,
            adapter.probeTimeoutMs
        );
    }

    async getLanguageServerSignatureHelp(request: CSharpLanguageServerTextDocumentPositionRequest): Promise<CSharpLanguageServerSignatureHelpResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const documentPath = this.resolveInsideWorkspace(workspacePath, request.documentPath);
        const language = request.language ?? this.languageServerLanguageForPath(documentPath);
        const adapter = this.getLanguageServerAdapters(workspacePath).find(candidate => candidate.language === language);
        if (!adapter || adapter.mode !== 'ready') {
            return {
                workspacePath,
                documentPath,
                source: 'unavailable',
                adapterId: adapter?.id,
                adapterLabel: adapter?.label,
                durationMs: 0,
                signatures: [],
                activeSignature: 0,
                activeParameter: 0,
                detail: adapter?.detail ?? `No ${language} language-server adapter is available.`
            };
        }
        return requestCSharpLanguageServerSignatureHelp(
            adapter,
            workspacePath,
            documentPath,
            request.content,
            { line: request.line, column: request.column },
            adapter.probeTimeoutMs,
            request.signatureHelpContext
        );
    }

    async getIntelliSense(request: CSharpIntelliSenseRequest): Promise<CSharpIntelliSenseResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const roslyn = await this.getRoslynStatus(workspacePath);
        const files = await this.findWorkspaceFiles(workspacePath);
        const projects = await Promise.all(files.projects.map(projectPath => this.readProject(projectPath, workspacePath)));
        const items = new Map<string, CSharpIntelliSenseItem>();
        const add = (item: CSharpIntelliSenseItem): void => {
            const key = `${item.kind}:${item.label}:${item.insertText}:${item.sourcePath ?? ''}`;
            if (!items.has(key)) {
                items.set(key, item);
            }
        };

        this.frameworkIntelliSenseItems().forEach(add);
        for (const project of projects) {
            add({
                label: project.name,
                insertText: project.name,
                kind: 'namespace',
                detail: `${project.kind} project`,
                sourcePath: project.path
            });
            for (const reference of project.packageReferences) {
                add({
                    label: reference.id,
                    insertText: reference.id,
                    kind: 'package',
                    detail: reference.version ? `NuGet ${reference.version}` : 'NuGet package',
                    sourcePath: project.path
                });
            }
        }

        const csharpFiles = projects
            .flatMap(project => project.files.filter(file => file.kind === 'csharp').map(file => file.path))
            .slice(0, MAX_INTELLISENSE_FILES);
        for (const filePath of csharpFiles) {
            try {
                const stat = await fsp.stat(filePath);
                if (stat.size > MAX_INTELLISENSE_FILE_BYTES) {
                    continue;
                }
                const text = await fsp.readFile(filePath, 'utf8');
                this.parseCSharpIntelliSenseItems(filePath, text).forEach(add);
            } catch {
                // Ignore files that disappear or cannot be read while the provider refreshes.
            }
        }

        const sortedItems = [...items.values()]
            .sort((left, right) => left.kind.localeCompare(right.kind) || left.label.localeCompare(right.label))
            .slice(0, MAX_INTELLISENSE_ITEMS);
        return {
            workspacePath,
            source: roslyn.mode === 'semantic-ready' ? 'workspace-index-and-roslyn-ready' : 'workspace-index',
            items: sortedItems
        };
    }

    async getWorkspaceSymbols(request: CSharpWorkspaceRequest): Promise<CSharpWorkspaceSymbolResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const files = await this.findWorkspaceFiles(workspacePath);
        const projects = await Promise.all(files.projects.map(projectPath => this.readProject(projectPath, workspacePath)));
        const symbols: CSharpWorkspaceSymbol[] = [];
        const csharpFiles = projects
            .flatMap(project => project.files.filter(file => file.kind === 'csharp').map(file => file.path))
            .slice(0, MAX_INTELLISENSE_FILES);

        for (const filePath of csharpFiles) {
            if (symbols.length >= MAX_WORKSPACE_SYMBOLS) {
                break;
            }
            try {
                const stat = await fsp.stat(filePath);
                if (stat.size > MAX_INTELLISENSE_FILE_BYTES) {
                    continue;
                }
                const text = await fsp.readFile(filePath, 'utf8');
                symbols.push(...this.parseCSharpWorkspaceSymbols(filePath, text));
            } catch {
                // Ignore files that disappear or cannot be read while the symbol index refreshes.
            }
        }

        const razorFiles = projects
            .flatMap(project => project.files.filter(file => file.kind === 'razor').map(file => file.path))
            .slice(0, MAX_INTELLISENSE_FILES);
        for (const filePath of razorFiles) {
            if (symbols.length >= MAX_WORKSPACE_SYMBOLS) {
                break;
            }
            try {
                const stat = await fsp.stat(filePath);
                if (stat.size > MAX_INTELLISENSE_FILE_BYTES) {
                    continue;
                }
                const text = await fsp.readFile(filePath, 'utf8');
                symbols.push(...this.parseRazorWorkspaceSymbols(filePath, text));
            } catch {
                // Ignore files that disappear or cannot be read while the symbol index refreshes.
            }
        }

        return {
            workspacePath,
            symbols: symbols
                .sort((left, right) => left.path.localeCompare(right.path) || left.line - right.line || left.column - right.column)
                .slice(0, MAX_WORKSPACE_SYMBOLS)
        };
    }

    async getCodeContext(request: CSharpCodeContextRequest): Promise<CSharpCodeContextResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const solutionPath = request.solutionPath ? this.resolveInsideWorkspace(workspacePath, request.solutionPath) : undefined;
        const projectPath = request.projectPath ? this.resolveInsideWorkspace(workspacePath, request.projectPath) : undefined;
        const documentPath = request.documentPath ? this.resolveInsideWorkspace(workspacePath, request.documentPath) : undefined;
        const files = await this.findWorkspaceFiles(workspacePath);
        const solutions = await Promise.all(files.solutions.map(candidate => this.readSolution(candidate)));
        const projects = await Promise.all(files.projects.map(candidate => this.readProject(candidate, workspacePath)));
        const solution = this.solutionForCodeContext(solutions, solutionPath);
        const project = this.projectForCodeContext(projects, projectPath, documentPath, solution);
        const contextProjects = this.projectsForCodeContext(projects, project, documentPath, solution);
        const workspaceSymbols = (await this.getWorkspaceSymbols({ workspacePath })).symbols;
        const symbols = this.codeContextSymbols(workspaceSymbols, project, documentPath, contextProjects, solution);
        const semantic = await this.getSemanticInventory({ workspacePath });
        const semanticSymbols = this.codeContextSemanticSymbols(semantic, project, documentPath, contextProjects, solution);
        const signals = this.codeContextSignals(contextProjects, project, symbols, semantic, solution);
        const suggestions = this.codeContextSuggestions(workspacePath, contextProjects, project, symbols, semantic, solution);
        const sections = this.codeContextSections(project, solution, contextProjects, symbols, semantic, semanticSymbols);
        const summary = this.codeContextSummary(project, solution, contextProjects, symbols);
        return {
            workspacePath,
            solutionPath: solution?.path,
            projectPath: project?.path,
            documentPath,
            summary,
            signals,
            suggestions: suggestions.slice(0, MAX_CODE_CONTEXT_SUGGESTIONS),
            sections,
            prompt: this.codeContextPrompt(summary, signals, sections, suggestions),
            semanticMode: semantic.mode,
            symbolCount: symbols.length
        };
    }

    async getSemanticInventory(request: CSharpWorkspaceRequest): Promise<CSharpSemanticInventoryResult> {
        const workspacePath = this.resolveExistingDirectory(request.workspacePath);
        const roslyn = await this.getRoslynStatus(workspacePath);
        if (roslyn.mode !== 'semantic-ready') {
            return this.emptySemanticInventory(workspacePath, 'unavailable', roslyn.detail);
        }

        const files = await this.findWorkspaceFiles(workspacePath);
        const projects = await Promise.all(files.projects.map(projectPath => this.readProject(projectPath, workspacePath)));
        const csharpFiles = projects
            .flatMap(project => project.files.filter(file => file.kind === 'csharp').map(file => file.path))
            .slice(0, MAX_SEMANTIC_FILES);
        const analyzer = this.createRoslynAnalyzer(roslyn.analyzerPath, roslyn.timeoutMs);
        const results: LanguageAnalysisResult[] = [];
        const filePathById = new Map<string, string>();

        for (const filePath of csharpFiles) {
            try {
                const stat = await fsp.stat(filePath);
                if (stat.size > MAX_INTELLISENSE_FILE_BYTES) {
                    continue;
                }
                const content = await fsp.readFile(filePath, 'utf8');
                const context = this.semanticAnalysisContext(workspacePath, filePath, content);
                filePathById.set(context.file.id, filePath);
                results.push(await analyzer.analyze(context));
            } catch {
                // Keep the semantic inventory resilient while files change during refresh.
            }
        }

        const diagnostics = results.flatMap(result => this.semanticDiagnostics(result));
        const mode = this.semanticMode(results, diagnostics);
        const symbols = results
            .flatMap(result => result.symbols.map(symbol => this.semanticSymbol(symbol, filePathById)))
            .slice(0, MAX_SEMANTIC_ITEMS);
        const relations = results
            .flatMap(result => result.relations.map(relation => this.semanticRelation(relation)))
            .slice(0, MAX_SEMANTIC_ITEMS);
        const callHints = results
            .flatMap(result => result.callHints ?? [])
            .map(hint => this.semanticCallHint(hint))
            .slice(0, MAX_SEMANTIC_ITEMS);
        const dependencyHints = results
            .flatMap(result => result.dependencyHints ?? [])
            .map(hint => this.semanticDependencyHint(hint))
            .slice(0, MAX_SEMANTIC_ITEMS);
        const analyzerIds = sortPaths(results.map(result => result.analyzerId).filter(Boolean));

        return {
            workspacePath,
            mode,
            detail: this.semanticInventoryDetail(mode, results.length, symbols.length, relations.length),
            analyzedFiles: results.length,
            analyzerIds,
            symbols,
            relations,
            diagnostics,
            callHints,
            dependencyHints,
            summary: {
                symbolCount: symbols.length,
                relationCount: relations.length,
                endpointCount: symbols.filter(symbol => symbol.kind === 'endpoint' || symbol.metadata?.normalizedSymbolKind === 'controller_action').length,
                testMethodCount: symbols.filter(symbol => symbol.kind === 'test_method' || symbol.metadata?.normalizedSymbolKind === 'test_method').length,
                dbContextCount: symbols.filter(symbol => symbol.metadata?.isDbContext === true || symbol.metadata?.normalizedSymbolKind === 'db_context').length,
                dependencyHintCount: dependencyHints.length,
                callHintCount: callHints.length
            }
        };
    }

    protected async getDotnetInfo(): Promise<CSharpDotnetInfo> {
        const result = await this.runExecutable('dotnet', ['--info'], process.cwd(), 10000);
        if (result.ok) {
            return parseDotnetInfo(result.stdout, 'dotnet');
        }
        {
            return {
                available: false,
                executable: 'dotnet',
                sdks: [],
                runtimes: [],
                error: result.stderr || result.stdout || 'dotnet --info failed'
            };
        }
    }

    protected async getRoslynStatus(workspacePath?: string, config?: CSharpKitWorkspaceConfig): Promise<CSharpRoslynStatus> {
        const workspaceConfig = config ?? (workspacePath ? this.readCSharpKitWorkspaceConfig(workspacePath) : undefined);
        const configuredPath = process.env[ROSLYN_ANALYZER_PATH_ENV]?.trim();
        const configuredWorkspacePath = !configuredPath ? workspaceConfig?.roslyn?.analyzerPath?.trim() : undefined;
        const timeoutMs = this.roslynTimeout(workspaceConfig);
        if (configuredPath) {
            if (fs.existsSync(configuredPath)) {
                return {
                    mode: 'semantic-ready',
                    analyzerPath: configuredPath,
                    timeoutMs,
                    detail: `${ROSLYN_ANALYZER_PATH_ENV} points to an existing Roslyn sidecar.`
                };
            }
            return {
                mode: 'configured-missing',
                analyzerPath: configuredPath,
                timeoutMs,
                detail: `${ROSLYN_ANALYZER_PATH_ENV} is set, but the configured sidecar was not found.`
            };
        }
        if (configuredWorkspacePath) {
            const analyzerPath = this.resolveWorkspaceConfiguredPath(workspacePath, configuredWorkspacePath);
            if (fs.existsSync(analyzerPath)) {
                return {
                    mode: 'semantic-ready',
                    analyzerPath,
                    timeoutMs,
                    detail: `${CSHARP_KIT_CONFIG_RELATIVE_PATH} points to an existing Roslyn sidecar.`
                };
            }
            return {
                mode: 'configured-missing',
                analyzerPath,
                timeoutMs,
                detail: `${CSHARP_KIT_CONFIG_RELATIVE_PATH} configures a Roslyn sidecar path, but it was not found.`
            };
        }

        const sidecarRoot = await this.findRoslynSidecarRoot();
        if (!sidecarRoot) {
            return {
                mode: 'not-installed',
                timeoutMs,
                detail: '@cybervinci/memory-roslyn sidecar source was not found next to the installed Theia packages.'
            };
        }

        const analyzerPath = await this.findBuiltRoslynSidecar(sidecarRoot);
        if (analyzerPath) {
            return {
                mode: 'semantic-ready',
                analyzerPath,
                sidecarProjectPath: path.join(sidecarRoot, 'CyberVinci.Memory.RoslynSidecar.csproj'),
                timeoutMs,
                detail: 'A built CyberVinci Memory Roslyn sidecar was detected.'
            };
        }

        const sidecarProjectPath = path.join(sidecarRoot, 'CyberVinci.Memory.RoslynSidecar.csproj');
        return {
            mode: 'build-required',
            sidecarProjectPath,
            buildCommand: `dotnet build "${sidecarProjectPath}" -c Release`,
            timeoutMs,
            detail: 'Roslyn sidecar source is installed, but no built sidecar DLL was found.'
        };
    }

    protected getLanguageServerAdapters(workspacePath?: string, config?: CSharpKitWorkspaceConfig): CSharpLanguageServerAdapterStatus[] {
        return resolveCSharpLanguageServerAdapterStatuses(
            process.env,
            workspacePath,
            config ?? (workspacePath ? this.readCSharpKitWorkspaceConfig(workspacePath) : undefined),
            CSHARP_KIT_CONFIG_RELATIVE_PATH
        );
    }

    protected languageServerLanguageForPath(documentPath: string): CSharpLanguageServerAdapterStatus['language'] {
        const extension = path.extname(documentPath).toLowerCase();
        return extension === '.razor' || extension === '.cshtml' ? 'razor' : 'csharp';
    }

    protected readCSharpKitWorkspaceConfig(workspacePath: string): CSharpKitWorkspaceConfig | undefined {
        return this.readCSharpKitWorkspaceConfigFile(workspacePath).config;
    }

    protected readCSharpKitWorkspaceConfigFile(workspacePath: string): CSharpKitWorkspaceConfigReadResult {
        const configPath = path.join(workspacePath, ...CSHARP_KIT_CONFIG_RELATIVE_PATH.split('/'));
        const relativePath = CSHARP_KIT_CONFIG_RELATIVE_PATH;
        if (!fs.existsSync(configPath)) {
            return {
                status: {
                    path: configPath,
                    relativePath,
                    state: 'absent',
                    exists: false,
                    valid: false,
                    configuredRoslyn: false,
                    configuredDebugAdapters: [],
                    configuredLanguageServers: []
                }
            };
        }
        try {
            const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
                return {
                    status: {
                        path: configPath,
                        relativePath,
                        state: 'invalid',
                        exists: true,
                        valid: false,
                        error: 'Expected a JSON object.',
                        configuredRoslyn: false,
                        configuredDebugAdapters: [],
                        configuredLanguageServers: []
                    }
                };
            }
            const config = parsed as CSharpKitWorkspaceConfig;
            return {
                config,
                status: {
                    path: configPath,
                    relativePath,
                    state: 'valid',
                    exists: true,
                    valid: true,
                    configuredRoslyn: this.hasConfiguredRoslyn(config),
                    configuredDebugAdapters: this.configuredDebugAdapters(config),
                    configuredLanguageServers: this.configuredLanguageServers(config)
                }
            };
        } catch (error) {
            return {
                status: {
                    path: configPath,
                    relativePath,
                    state: 'invalid',
                    exists: true,
                    valid: false,
                    error: error instanceof Error ? error.message : String(error),
                    configuredRoslyn: false,
                    configuredDebugAdapters: [],
                    configuredLanguageServers: []
                }
            };
        }
    }

    protected hasConfiguredRoslyn(config: CSharpKitWorkspaceConfig): boolean {
        return Boolean(config.roslyn && (
            config.roslyn.analyzerPath?.trim()
            || config.roslyn.timeoutMs !== undefined
        ));
    }

    protected configuredDebugAdapters(config: CSharpKitWorkspaceConfig): string[] {
        return [
            config.debugAdapters?.coreclr?.command?.trim() ? 'coreclr' : undefined,
            config.debugAdapters?.netcoredbg?.command?.trim() ? 'netcoredbg' : undefined
        ].filter((adapter): adapter is string => Boolean(adapter));
    }

    protected configuredLanguageServers(config: CSharpKitWorkspaceConfig): CSharpKitWorkspaceConfigStatus['configuredLanguageServers'] {
        return [
            config.languageServers?.csharp?.command?.trim() ? 'csharp' as const : undefined,
            config.languageServers?.razor?.command?.trim() ? 'razor' as const : undefined
        ].filter((language): language is CSharpKitWorkspaceConfigStatus['configuredLanguageServers'][number] => Boolean(language));
    }

    protected createRoslynAnalyzer(analyzerPath: string | undefined, timeoutMs?: number): CSharpRoslynAnalyzerAdapter {
        return new CSharpRoslynSidecarAnalyzer({
            analyzerPath,
            timeoutMs
        });
    }

    protected semanticAnalysisContext(workspacePath: string, filePath: string, content: string): LanguageAnalysisContext {
        const relativePath = path.relative(workspacePath, filePath).replace(/\\/g, '/');
        const file: MemoryFile = {
            id: this.semanticId('file', relativePath),
            relativePath,
            fileName: path.basename(filePath),
            extension: path.extname(filePath),
            languageId: 'csharp',
            sizeBytes: Buffer.byteLength(content, 'utf8'),
            contentHash: this.sha256(content),
            isIgnored: false,
            isGenerated: false,
            isBinary: false,
            isSensitive: false
        };
        return {
            workspacePath,
            file,
            content,
            createSymbolId: seed => this.semanticId('symbol', `${relativePath}:${seed}`),
            createRelationId: seed => this.semanticId('relation', `${relativePath}:${seed}`)
        };
    }

    protected semanticMode(results: LanguageAnalysisResult[], diagnostics: CSharpSemanticDiagnostic[]): CSharpSemanticInventoryResult['mode'] {
        if (results.length === 0) {
            return 'unavailable';
        }
        const diagnosticIds = new Set(diagnostics.map(diagnostic => diagnostic.id));
        if (diagnosticIds.has('roslyn-semantic-mode')) {
            return 'semantic';
        }
        if (diagnosticIds.has('roslyn-parse-only-mode')) {
            return 'parse-only';
        }
        if (diagnosticIds.has('roslyn-fallback-mode') || diagnosticIds.has('roslyn-sidecar-unavailable') || results.some(result => result.analyzerId.includes('fallback'))) {
            return 'structural-fallback';
        }
        return results.some(result => result.analyzerId === 'csharp-roslyn-sidecar') ? 'parse-only' : 'structural-fallback';
    }

    protected semanticInventoryDetail(
        mode: CSharpSemanticInventoryResult['mode'],
        analyzedFiles: number,
        symbolCount: number,
        relationCount: number
    ): string {
        if (mode === 'semantic') {
            return `Roslyn semantic inventory analyzed ${analyzedFiles} file(s), ${symbolCount} symbol(s) and ${relationCount} relation(s).`;
        }
        if (mode === 'parse-only') {
            return `Roslyn ran in parse-only mode for ${analyzedFiles} file(s); build/restore the workspace for full semantic relations.`;
        }
        if (mode === 'structural-fallback') {
            return `Roslyn sidecar fell back to structural C# analysis for ${analyzedFiles} file(s).`;
        }
        return 'Roslyn semantic inventory is unavailable.';
    }

    protected emptySemanticInventory(
        workspacePath: string,
        mode: CSharpSemanticInventoryResult['mode'],
        detail: string
    ): CSharpSemanticInventoryResult {
        return {
            workspacePath,
            mode,
            detail,
            analyzedFiles: 0,
            analyzerIds: [],
            symbols: [],
            relations: [],
            diagnostics: [],
            callHints: [],
            dependencyHints: [],
            summary: {
                symbolCount: 0,
                relationCount: 0,
                endpointCount: 0,
                testMethodCount: 0,
                dbContextCount: 0,
                dependencyHintCount: 0,
                callHintCount: 0
            }
        };
    }

    protected semanticDiagnostics(result: LanguageAnalysisResult): CSharpSemanticDiagnostic[] {
        return (result.diagnostics ?? []).map(diagnostic => ({
            id: diagnostic.id,
            severity: diagnostic.severity,
            message: diagnostic.message,
            path: diagnostic.path,
            detail: diagnostic.detail
        }));
    }

    protected semanticSymbol(symbol: MemorySymbol, filePathById: Map<string, string>): CSharpSemanticSymbol {
        return {
            id: symbol.id,
            name: symbol.name,
            kind: symbol.symbolKind,
            fileId: symbol.fileId,
            path: filePathById.get(symbol.fileId),
            fullName: symbol.fullName,
            parentSymbolId: symbol.parentSymbolId,
            signature: symbol.signature,
            startLine: symbol.startLine,
            endLine: symbol.endLine,
            returnType: symbol.returnType,
            detail: [
                symbol.fullName ?? symbol.name,
                symbol.returnType ? `: ${symbol.returnType}` : undefined,
                symbol.signature
            ].filter(Boolean).join(' '),
            metadata: symbol.metadata
        };
    }

    protected semanticRelation(relation: MemoryRelation): CSharpSemanticRelation {
        return {
            id: relation.id,
            type: String(relation.relationType),
            sourceId: relation.sourceId,
            targetId: relation.targetId,
            confidenceScore: relation.confidenceScore,
            evidence: relation.evidence
        };
    }

    protected semanticCallHint(hint: LanguageCallHint): CSharpSemanticHint {
        return {
            sourceSymbolId: hint.sourceSymbolId,
            targetName: hint.targetName,
            targetSymbolId: hint.targetSymbolId,
            targetSemanticFullName: hint.targetSemanticFullName,
            evidence: hint.evidence
        };
    }

    protected semanticDependencyHint(hint: LanguageDependencyHint): CSharpSemanticHint {
        return {
            sourceSymbolId: hint.sourceSymbolId,
            targetName: hint.targetTypeName,
            targetSymbolId: hint.targetSymbolId,
            targetSemanticFullName: hint.targetSemanticFullName,
            evidence: hint.evidence
        };
    }

    protected solutionForCodeContext(
        solutions: CSharpSolutionSummary[],
        solutionPath: string | undefined
    ): CSharpSolutionSummary | undefined {
        return solutionPath ? solutions.find(solution => this.samePath(solution.path, solutionPath)) : undefined;
    }

    protected projectForCodeContext(
        projects: CSharpProjectSummary[],
        projectPath: string | undefined,
        documentPath: string | undefined,
        solution: CSharpSolutionSummary | undefined
    ): CSharpProjectSummary | undefined {
        if (projectPath) {
            return projects.find(project => this.samePath(project.path, projectPath));
        }
        if (documentPath) {
            return projects
                .filter(project => this.isInsideOrEqual(project.directory, documentPath))
                .sort((left, right) => right.directory.length - left.directory.length)[0];
        }
        return solution ? undefined : projects[0];
    }

    protected projectsForCodeContext(
        projects: CSharpProjectSummary[],
        project: CSharpProjectSummary | undefined,
        documentPath: string | undefined,
        solution: CSharpSolutionSummary | undefined
    ): CSharpProjectSummary[] {
        if (project) {
            return [project];
        }
        if (documentPath) {
            return [];
        }
        if (solution) {
            return projects.filter(candidate => solution.projectPaths.some(projectPath => this.samePath(projectPath, candidate.path)));
        }
        return projects;
    }

    protected codeContextSymbols(
        symbols: CSharpWorkspaceSymbol[],
        project: CSharpProjectSummary | undefined,
        documentPath: string | undefined,
        contextProjects: CSharpProjectSummary[],
        solution: CSharpSolutionSummary | undefined
    ): CSharpWorkspaceSymbol[] {
        return symbols
            .filter(symbol => {
                if (documentPath) {
                    return this.samePath(symbol.path, documentPath);
                }
                if (project) {
                    return this.isInsideOrEqual(project.directory, symbol.path);
                }
                if (contextProjects.length) {
                    return contextProjects.some(candidate => this.isInsideOrEqual(candidate.directory, symbol.path));
                }
                return solution ? false : true;
            })
            .sort((left, right) => this.codeContextSymbolRank(right) - this.codeContextSymbolRank(left)
                || left.path.localeCompare(right.path)
                || left.line - right.line
                || left.name.localeCompare(right.name))
            .slice(0, MAX_CODE_CONTEXT_SYMBOLS);
    }

    protected codeContextSemanticSymbols(
        semantic: CSharpSemanticInventoryResult,
        project: CSharpProjectSummary | undefined,
        documentPath: string | undefined,
        contextProjects: CSharpProjectSummary[],
        solution: CSharpSolutionSummary | undefined
    ): CSharpSemanticSymbol[] {
        return semantic.symbols
            .filter(symbol => {
                if (!symbol.path) {
                    return false;
                }
                if (documentPath) {
                    return this.samePath(symbol.path, documentPath);
                }
                if (project) {
                    return this.isInsideOrEqual(project.directory, symbol.path);
                }
                if (contextProjects.length) {
                    return contextProjects.some(candidate => this.isInsideOrEqual(candidate.directory, symbol.path!));
                }
                return solution ? false : true;
            })
            .sort((left, right) => (right.startLine ?? 0) - (left.startLine ?? 0))
            .slice(0, MAX_CODE_CONTEXT_SYMBOLS);
    }

    protected codeContextSymbolRank(symbol: CSharpWorkspaceSymbol): number {
        switch (symbol.kind) {
            case 'aspnet-endpoint':
                return 80;
            case 'test-method':
                return 70;
            case 'class':
            case 'record':
            case 'interface':
                return 60;
            case 'method':
                return 50;
            case 'property':
                return 40;
            default:
                return 10;
        }
    }

    protected codeContextSignals(
        projects: CSharpProjectSummary[],
        project: CSharpProjectSummary | undefined,
        symbols: CSharpWorkspaceSymbol[],
        semantic: CSharpSemanticInventoryResult,
        solution: CSharpSolutionSummary | undefined
    ): CSharpCodeContextSignal[] {
        return [
            { label: 'Projects', value: String(projects.length) },
            solution ? { label: 'Solution', value: solution.name, detail: `${solution.format} ${projects.length}/${solution.projectPaths.length} loaded project(s)` } : undefined,
            project ? { label: 'Selected', value: project.name, detail: `${project.kind} ${project.targetFrameworks.join(', ') || 'unknown target'}` } : undefined,
            project ? { label: 'Packages', value: String(project.packageReferences.length) } : undefined,
            project?.isAspNetCore ? { label: 'ASP.NET', value: 'yes', detail: `${project.launchProfiles.length} launch profile(s)` } : undefined,
            project?.isTestProject ? { label: 'Tests', value: project.testFramework ?? 'test project', detail: project.testRunner } : undefined,
            { label: 'Symbols', value: String(symbols.length) },
            { label: 'Endpoints', value: String(symbols.filter(symbol => symbol.kind === 'aspnet-endpoint').length) },
            { label: 'Test Methods', value: String(symbols.filter(symbol => symbol.kind === 'test-method').length) },
            { label: 'Semantic', value: semantic.mode, detail: semantic.detail },
            semantic.summary.dependencyHintCount ? { label: 'DI Hints', value: String(semantic.summary.dependencyHintCount) } : undefined
        ].filter((signal): signal is CSharpCodeContextSignal => Boolean(signal));
    }

    protected codeContextSuggestions(
        workspacePath: string,
        projects: CSharpProjectSummary[],
        project: CSharpProjectSummary | undefined,
        symbols: CSharpWorkspaceSymbol[],
        semantic: CSharpSemanticInventoryResult,
        solution: CSharpSolutionSummary | undefined
    ): CSharpCodeContextSuggestion[] {
        const suggestions: CSharpCodeContextSuggestion[] = [{
            id: 'ai-context-pack',
            kind: 'ai-context',
            title: 'Use this C# context pack with Codex or CyberVinci Memory',
            detail: 'The prompt summarizes project shape, important symbols, semantic hints and likely next work without using Microsoft IntelliCode models.',
            evidence: [project?.path ?? solution?.path ?? 'workspace', `${symbols.length} relevant symbol(s)`, `semantic ${semantic.mode}`]
        }];
        if (solution?.format === 'slnf') {
            suggestions.push({
                id: 'solution-filter-context',
                kind: 'architecture',
                title: 'Keep AI changes scoped to this solution filter',
                detail: 'The context pack is limited to projects included by the .slnf filter, matching the focused solution view.',
                evidence: [solution.path, `${projects.length}/${solution.projectPaths.length} loaded project(s)`]
            });
        }
        const endpointSymbols = symbols.filter(symbol => symbol.kind === 'aspnet-endpoint');
        const testSymbols = symbols.filter(symbol => symbol.kind === 'test-method');
        if (project && !project.isTestProject && !projects.some(candidate => candidate.isTestProject && candidate.name.toLowerCase().includes(project.name.toLowerCase()))) {
            suggestions.push({
                id: 'add-tests',
                kind: 'test',
                title: 'Add or link a test project for this project',
                detail: 'No matching test project was detected by workspace naming and project metadata.',
                evidence: [project.name, `${projects.filter(candidate => candidate.isTestProject).length} test project(s) in workspace`]
            });
        }
        if (project?.isAspNetCore && endpointSymbols.length) {
            suggestions.push({
                id: 'endpoint-tests',
                kind: 'endpoint',
                title: 'Use endpoint symbols as API test and documentation anchors',
                detail: 'ASP.NET endpoint symbols can seed request examples, integration tests or route documentation.',
                evidence: endpointSymbols.slice(0, 5).map(symbol => symbol.detail)
            });
        }
        if (testSymbols.length) {
            suggestions.push({
                id: 'test-focus',
                kind: 'test',
                title: 'Focus generated changes around discovered test methods',
                detail: 'The context pack includes test symbols that can guide targeted fixes and selected-test debug runs.',
                evidence: testSymbols.slice(0, 5).map(symbol => symbol.signature ?? symbol.name)
            });
        }
        if (semantic.dependencyHints.length) {
            suggestions.push({
                id: 'dependency-hints',
                kind: 'dependency',
                title: 'Review semantic dependency hints before refactoring',
                detail: 'Roslyn/Memory dependency hints identify constructor and service relationships that affect blast radius.',
                evidence: semantic.dependencyHints.slice(0, 5).map(hint => hint.evidence ?? hint.targetName)
            });
        }
        if (project?.packageReferences.length) {
            suggestions.push({
                id: 'package-context',
                kind: 'package',
                title: 'Include package references in AI-assisted changes',
                detail: 'Package references and central package metadata help choose compatible APIs and test runners.',
                evidence: project.packageReferences.slice(0, 8).map(reference => reference.version ? `${reference.id} ${reference.version}` : reference.id)
            });
        }
        if (project?.isAspNetCore && project.launchProfiles.length === 0) {
            suggestions.push({
                id: 'launch-profile',
                kind: 'configuration',
                title: 'Generate launch/task files for ASP.NET workflows',
                detail: 'No launchSettings profile was detected for this ASP.NET Core project.',
                evidence: [project.path]
            });
        }
        if (!this.getLanguageServerAdapters(workspacePath).some(adapter => adapter.mode === 'ready')) {
            suggestions.push({
                id: 'lsp-probe',
                kind: 'configuration',
                title: 'Configure and probe a decoupled C#/Razor language server',
                detail: 'A ready external LSP command gives stronger editing support while keeping Microsoft VSIX packaging out of the kit.',
                evidence: [CSHARP_LSP_COMMAND_ENV, RAZOR_LSP_COMMAND_ENV, CSHARP_KIT_CONFIG_RELATIVE_PATH]
            });
        }
        return suggestions;
    }

    protected codeContextSections(
        project: CSharpProjectSummary | undefined,
        solution: CSharpSolutionSummary | undefined,
        projects: CSharpProjectSummary[],
        symbols: CSharpWorkspaceSymbol[],
        semantic: CSharpSemanticInventoryResult,
        semanticSymbols: CSharpSemanticSymbol[]
    ): CSharpCodeContextSection[] {
        return [
            solution ? {
                id: 'solution',
                label: 'Solution',
                items: [
                    `${solution.name} (${solution.format})`,
                    solution.sourceSolutionName ? `Source: ${solution.sourceSolutionName}` : undefined,
                    `Loaded projects: ${projects.length}/${solution.projectPaths.length}`,
                    `Projects: ${projects.map(candidate => candidate.name).join(', ') || 'none loaded'}`
                ].filter((item): item is string => Boolean(item))
            } : undefined,
            project ? {
                id: 'project',
                label: 'Project',
                items: [
                    `${project.name} (${project.kind})`,
                    `Targets: ${project.targetFrameworks.join(', ') || 'unknown'}`,
                    `SDK: ${project.sdk ?? 'unknown'}`,
                    `Packages: ${project.packageReferences.slice(0, 12).map(reference => reference.id).join(', ') || 'none'}`,
                    `Files: ${project.files.length}; Razor: ${project.razorFiles.length}; Launch profiles: ${project.launchProfiles.length}`
                ]
            } : undefined,
            {
                id: 'symbols',
                label: 'Important Symbols',
                items: symbols.slice(0, 20).map(symbol => [
                    symbol.kind,
                    symbol.containerName ? `${symbol.containerName}.` : '',
                    symbol.name,
                    symbol.signature ? ` - ${symbol.signature}` : '',
                    ` (${symbol.path}:${symbol.line})`
                ].join(''))
            },
            {
                id: 'semantic',
                label: 'Semantic/Memory',
                items: [
                    `Mode: ${semantic.mode}`,
                    ...semanticSymbols.slice(0, 10).map(symbol => `${symbol.kind}: ${symbol.fullName ?? symbol.name}`),
                    ...semantic.dependencyHints.slice(0, 10).map(hint => `DI: ${hint.evidence ?? hint.targetName}`),
                    ...semantic.callHints.slice(0, 10).map(hint => `Call: ${hint.evidence ?? hint.targetName}`)
                ]
            }
        ].filter((section): section is CSharpCodeContextSection => section !== undefined && section.items.length > 0);
    }

    protected codeContextSummary(
        project: CSharpProjectSummary | undefined,
        solution: CSharpSolutionSummary | undefined,
        projects: CSharpProjectSummary[],
        symbols: CSharpWorkspaceSymbol[]
    ): string {
        if (project) {
            return `C# AI/Memory context for ${project.name}: ${project.kind}, ${project.targetFrameworks.join(', ') || 'unknown target'}, ${symbols.length} relevant symbol(s).`;
        }
        if (solution) {
            return `C# AI/Memory context for ${solution.name}: ${solution.format}, ${projects.length}/${solution.projectPaths.length} loaded project(s), ${symbols.length} relevant symbol(s).`;
        }
        return `C# AI/Memory context for workspace: ${projects.length} project(s), ${symbols.length} symbol(s).`;
    }

    protected codeContextPrompt(
        summary: string,
        signals: CSharpCodeContextSignal[],
        sections: CSharpCodeContextSection[],
        suggestions: CSharpCodeContextSuggestion[]
    ): string {
        return [
            '# CyberVinci C# Context',
            summary,
            '',
            '## Signals',
            ...signals.map(signal => `- ${signal.label}: ${signal.value}${signal.detail ? ` (${signal.detail})` : ''}`),
            '',
            ...sections.flatMap(section => [
                `## ${section.label}`,
                ...section.items.slice(0, 20).map(item => `- ${item}`),
                ''
            ]),
            '## Suggested Use',
            ...suggestions.slice(0, MAX_CODE_CONTEXT_SUGGESTIONS).map(suggestion => `- ${suggestion.title}: ${suggestion.detail}`)
        ].join('\n').trim();
    }

    protected semanticId(kind: string, seed: string): string {
        return `${kind}_${this.sha256(seed).slice(0, 24)}`;
    }

    protected sha256(value: string): string {
        return createHash('sha256').update(value).digest('hex');
    }

    protected frameworkIntelliSenseItems(): CSharpIntelliSenseItem[] {
        return [
            ...[
                'System',
                'System.Collections.Generic',
                'System.Linq',
                'System.Threading',
                'System.Threading.Tasks',
                'Microsoft.AspNetCore.Builder',
                'Microsoft.AspNetCore.Http',
                'Microsoft.AspNetCore.Mvc',
                'Microsoft.Extensions.DependencyInjection',
                'Microsoft.Extensions.Hosting',
                'Microsoft.EntityFrameworkCore',
                'Xunit',
                'NUnit.Framework',
                'Microsoft.VisualStudio.TestTools.UnitTesting'
            ].map(namespaceName => ({
                label: namespaceName,
                insertText: namespaceName,
                kind: 'namespace' as const,
                detail: 'Common .NET namespace'
            })),
            {
                label: 'ASP.NET Minimal API endpoint',
                insertText: 'app.MapGet("/${1:route}", (${2}) => ${3:Results.Ok()});',
                kind: 'snippet',
                detail: 'C# Kit snippet',
                documentation: 'Adds a minimal API GET endpoint.'
            },
            {
                label: 'ASP.NET Controller action',
                insertText: '[HttpGet("${1:route}")]\npublic IActionResult ${2:ActionName}()\n{\n    return Ok(${3});\n}',
                kind: 'snippet',
                detail: 'C# Kit snippet',
                documentation: 'Adds a controller action returning IActionResult.'
            },
            {
                label: 'Console main body',
                insertText: 'Console.WriteLine("${1:Hello from CyberVinci}");',
                kind: 'snippet',
                detail: 'C# Kit snippet',
                documentation: 'Adds a console output line.'
            },
            {
                label: 'xUnit Fact',
                insertText: '[Fact]\npublic void ${1:TestName}()\n{\n    ${2:// arrange}\n\n    ${3:// act}\n\n    ${4:// assert}\n}',
                kind: 'snippet',
                detail: 'C# Kit snippet',
                documentation: 'Adds an xUnit test method.'
            },
            {
                label: 'NUnit Test',
                insertText: '[Test]\npublic void ${1:TestName}()\n{\n    ${2:// arrange}\n\n    ${3:// act}\n\n    ${4:// assert}\n}',
                kind: 'snippet',
                detail: 'C# Kit snippet',
                documentation: 'Adds an NUnit test method.'
            },
            {
                label: 'Record DTO',
                insertText: 'public sealed record ${1:Name}(${2:string Value});',
                kind: 'snippet',
                detail: 'C# Kit snippet',
                documentation: 'Adds an immutable record DTO.'
            }
        ];
    }

    protected parseCSharpIntelliSenseItems(filePath: string, text: string): CSharpIntelliSenseItem[] {
        const items: CSharpIntelliSenseItem[] = [];
        const add = (
            label: string,
            kind: CSharpIntelliSenseItem['kind'],
            detail: string,
            signature?: string,
            returnType?: string
        ): void => {
            if (!label || this.isCSharpKeyword(label)) {
                return;
            }
            items.push({
                label,
                insertText: label,
                kind,
                detail,
                documentation: signature,
                signature,
                returnType,
                sourcePath: filePath
            });
        };

        let match: RegExpExecArray | null;
        const usingRegex = /^\s*using\s+(?:static\s+)?([A-Za-z_][\w.]*)\s*;/gm;
        while ((match = usingRegex.exec(text))) {
            add(match[1], 'namespace', 'Using namespace');
        }

        const namespaceRegex = /\bnamespace\s+([A-Za-z_][\w.]*)\s*(?:[;{])/g;
        while ((match = namespaceRegex.exec(text))) {
            add(match[1], 'namespace', 'Workspace namespace');
        }

        const typeRegex = /\b(?:public|internal|private|protected)?\s*(?:static\s+|sealed\s+|abstract\s+|partial\s+)*\b(class|interface|record|struct|enum)\s+([A-Za-z_]\w*)/g;
        while ((match = typeRegex.exec(text))) {
            add(match[2], match[1] as CSharpIntelliSenseItem['kind'], `Workspace ${match[1]}`);
        }

        for (const declaration of this.csharpMethodDeclarations(text)) {
            const testFramework = this.testFrameworkFromAttributes(declaration.attributes);
            add(
                declaration.name,
                'method',
                testFramework ? `${testFramework} test method: ${declaration.signature}` : `Workspace method: ${declaration.signature}`,
                declaration.signature,
                declaration.returnType
            );
        }

        const propertyRegex = /((?:\s*\[[^\]]+\]\s*)*)\b(?:public|internal|private|protected)\s+(?:static\s+|virtual\s+|override\s+|sealed\s+)*(?<type>[A-Za-z_][\w.<>\[\],?]*)\s+(?<name>[A-Za-z_]\w*)\s*\{\s*(?:get|init|set)\b/g;
        while ((match = propertyRegex.exec(text))) {
            const type = match.groups?.type ?? '';
            const name = match.groups?.name ?? '';
            add(name, 'property', type ? `Workspace property: ${type} ${name}` : 'Workspace property', undefined, type);
        }

        return items;
    }

    protected parseCSharpWorkspaceSymbols(filePath: string, text: string): CSharpWorkspaceSymbol[] {
        const symbols: CSharpWorkspaceSymbol[] = [];
        const addSymbol = (
            name: string,
            kind: CSharpWorkspaceSymbolKind,
            detail: string,
            startOffset: number,
            endOffset: number,
            selectionStartOffset: number,
            selectionEndOffset: number,
            containerName?: string,
            signature?: string,
            returnType?: string
        ): void => {
            if (!name || this.isCSharpKeyword(name)) {
                return;
            }
            const range = this.rangeFromOffsets(text, startOffset, endOffset);
            const selection = this.rangeFromOffsets(text, selectionStartOffset, selectionEndOffset);
            symbols.push({
                id: `${filePath}:${kind}:${name}:${selection.line}:${selection.column}`,
                name,
                kind,
                path: filePath,
                line: range.line,
                column: range.column,
                endLine: range.endLine,
                endColumn: range.endColumn,
                selectionLine: selection.line,
                selectionColumn: selection.column,
                selectionEndLine: selection.endLine,
                selectionEndColumn: selection.endColumn,
                containerName,
                signature,
                returnType,
                detail
            });
        };
        const addFromMatch = (
            match: RegExpExecArray,
            name: string,
            kind: CSharpWorkspaceSymbolKind,
            detail: string,
            containerName?: string,
            signature?: string,
            returnType?: string,
            selectionName = name
        ): void => {
            const relativeNameOffset = match[0].lastIndexOf(selectionName);
            const nameOffset = match.index + Math.max(0, relativeNameOffset);
            addSymbol(
                name,
                kind,
                detail,
                match.index,
                match.index + match[0].length,
                nameOffset,
                nameOffset + selectionName.length,
                containerName,
                signature,
                returnType
            );
        };

        let match: RegExpExecArray | null;
        const namespaceOffsets: Array<{ name: string; offset: number }> = [];
        const namespaceRegex = /\bnamespace\s+([A-Za-z_][\w.]*)\s*(?:[;{])/g;
        while ((match = namespaceRegex.exec(text))) {
            namespaceOffsets.push({ name: match[1], offset: match.index });
            addFromMatch(match, match[1], 'namespace', 'Workspace namespace');
        }

        const typeSymbols: Array<{ name: string; offset: number }> = [];
        const typeRegex = /\b(?:public|internal|private|protected)?\s*(?:static\s+|sealed\s+|abstract\s+|partial\s+)*\b(class|interface|record|struct|enum)\s+([A-Za-z_]\w*)/g;
        while ((match = typeRegex.exec(text))) {
            const containerName = this.containerBeforeOffset(namespaceOffsets, match.index);
            typeSymbols.push({ name: match[2], offset: match.index });
            addFromMatch(match, match[2], match[1] as CSharpWorkspaceSymbolKind, `Workspace ${match[1]}`, containerName);
        }

        for (const declaration of this.csharpMethodDeclarations(text)) {
            const containerName = this.containerBeforeOffset(typeSymbols, declaration.match.index);
            const testFramework = this.testFrameworkFromAttributes(declaration.attributes);
            const methodKind: CSharpWorkspaceSymbolKind = testFramework ? 'test-method' : 'method';
            addFromMatch(
                declaration.match,
                declaration.name,
                methodKind,
                testFramework ? `${testFramework} test method: ${declaration.signature}` : `Workspace method: ${declaration.signature}`,
                containerName,
                declaration.signature,
                declaration.returnType
            );
            const endpoint = this.controllerEndpointFromAttributes(declaration.attributes, declaration.name);
            if (endpoint) {
                addFromMatch(
                    declaration.match,
                    endpoint.name,
                    'aspnet-endpoint',
                    endpoint.detail,
                    containerName,
                    declaration.signature,
                    declaration.returnType,
                    declaration.name
                );
            }
        }

        const propertyRegex = /((?:\s*\[[^\]]+\]\s*)*)\b(?:public|internal|private|protected)\s+(?:static\s+|virtual\s+|override\s+|sealed\s+)*(?<type>[A-Za-z_][\w.<>\[\],?]*)\s+(?<name>[A-Za-z_]\w*)\s*\{\s*(?:get|init|set)\b/g;
        while ((match = propertyRegex.exec(text))) {
            const type = match.groups?.type ?? '';
            const name = match.groups?.name ?? '';
            addFromMatch(
                match,
                name,
                'property',
                type ? `Workspace property: ${type} ${name}` : 'Workspace property',
                this.containerBeforeOffset(typeSymbols, match.index),
                undefined,
                type
            );
        }

        const minimalApiRegex = /\b([A-Za-z_]\w*)\.(MapGet|MapPost|MapPut|MapDelete|MapPatch|MapMethods|MapFallback)\s*\(\s*(['"])([^'"]*)\3/g;
        while ((match = minimalApiRegex.exec(text))) {
            const httpMethod = this.minimalApiHttpMethod(match[2]);
            const route = match[4] || '/';
            const name = `${httpMethod} ${route}`;
            const routeOffset = match.index + match[0].lastIndexOf(match[4]);
            addSymbol(
                name,
                'aspnet-endpoint',
                `ASP.NET Minimal API endpoint: ${match[1]}.${match[2]}("${route}")`,
                match.index,
                match.index + match[0].length,
                routeOffset,
                routeOffset + route.length
            );
        }

        return symbols;
    }

    protected csharpMethodDeclarations(text: string): CSharpMethodDeclaration[] {
        const declarations: CSharpMethodDeclaration[] = [];
        const methodRegex = /((?:\s*\[[^\]]+\]\s*)*)\b(?:public|internal|private|protected)\s+(?:static\s+|async\s+|virtual\s+|override\s+|sealed\s+|partial\s+)*(?<returnType>[A-Za-z_][\w.<>\[\],?]*)\s+(?<name>[A-Za-z_]\w*)\s*\((?<parameters>[^)]*)\)/g;
        let match: RegExpExecArray | null;
        while ((match = methodRegex.exec(text))) {
            const returnType = match.groups?.returnType?.trim() ?? '';
            const name = match.groups?.name?.trim() ?? '';
            const parameters = this.normalizeParameterList(match.groups?.parameters ?? '');
            if (!name || this.isCSharpKeyword(name)) {
                continue;
            }
            declarations.push({
                match,
                attributes: match[1] ?? '',
                returnType,
                name,
                parameters,
                signature: `${returnType} ${name}(${parameters})`.trim()
            });
        }
        return declarations;
    }

    protected normalizeParameterList(parameters: string): string {
        return parameters
            .replace(/\s+/g, ' ')
            .replace(/\s*,\s*/g, ', ')
            .trim();
    }

    protected testFrameworkFromAttributes(attributes: string): string | undefined {
        if (/\[(?:Fact|Theory)\b/i.test(attributes)) {
            return 'xUnit';
        }
        if (/\[(?:Test|TestCase|TestFixture)\b/i.test(attributes)) {
            return 'NUnit';
        }
        if (/\[(?:TestMethod|DataTestMethod)\b/i.test(attributes)) {
            return 'MSTest';
        }
        return undefined;
    }

    protected applyTestProjectMetadata(tests: CSharpTestCase[], testFramework: CSharpTestFramework | undefined): CSharpTestCase[] {
        if (!testFramework) {
            return tests;
        }
        return tests.map(test => ({
            ...test,
            testFramework
        }));
    }

    protected testFrameworkFromPackages(packageReferences: CSharpProjectSummary['packageReferences']): CSharpTestFramework | undefined {
        const packageIds = packageReferences.map(reference => reference.id);
        if (packageIds.some(id => /^xunit(?:\.|$)/i.test(id))) {
            return 'xUnit';
        }
        if (packageIds.some(id => /^(NUnit|NUnit3TestAdapter)(?:\.|$)/i.test(id))) {
            return 'NUnit';
        }
        if (packageIds.some(id => /^MSTest(?:\.|$)/i.test(id))) {
            return 'MSTest';
        }
        return undefined;
    }

    protected controllerEndpointFromAttributes(attributes: string, actionName: string): { name: string; detail: string } | undefined {
        const httpAttribute = /\[(HttpGet|HttpPost|HttpPut|HttpDelete|HttpPatch|HttpHead|HttpOptions|Route)\b(?:\(\s*(['"])(.*?)\2\s*\))?/i.exec(attributes);
        if (!httpAttribute) {
            return undefined;
        }
        const method = this.controllerHttpMethod(httpAttribute[1]);
        const route = httpAttribute[3]?.trim() || actionName;
        return {
            name: `${method} ${route}`,
            detail: `ASP.NET controller endpoint: [${httpAttribute[1]}${httpAttribute[3] ? `("${route}")` : ''}] ${actionName}()`
        };
    }

    protected controllerHttpMethod(attributeName: string): string {
        switch (attributeName.toLowerCase()) {
            case 'httppost':
                return 'POST';
            case 'httpput':
                return 'PUT';
            case 'httpdelete':
                return 'DELETE';
            case 'httppatch':
                return 'PATCH';
            case 'httphead':
                return 'HEAD';
            case 'httpoptions':
                return 'OPTIONS';
            case 'route':
                return 'ROUTE';
            case 'httpget':
            default:
                return 'GET';
        }
    }

    protected minimalApiHttpMethod(mapMethod: string): string {
        switch (mapMethod.toLowerCase()) {
            case 'mappost':
                return 'POST';
            case 'mapput':
                return 'PUT';
            case 'mapdelete':
                return 'DELETE';
            case 'mappatch':
                return 'PATCH';
            case 'mapmethods':
                return 'METHODS';
            case 'mapfallback':
                return 'FALLBACK';
            case 'mapget':
            default:
                return 'GET';
        }
    }

    protected parseRazorWorkspaceSymbols(filePath: string, text: string): CSharpWorkspaceSymbol[] {
        const summary = parseRazorFileSummary(filePath, path.basename(filePath), text);
        const symbols: CSharpWorkspaceSymbol[] = [];
        for (const directive of summary.directives) {
            const name = this.razorDirectiveSymbolName(directive.kind, directive.value, directive.name);
            if (!name) {
                continue;
            }
            const selectionColumn = directive.value
                ? Math.max(directive.column, directive.column + directive.kind.length + 2)
                : directive.column + 1;
            const endColumn = Math.max(selectionColumn + name.length, directive.column + directive.kind.length + directive.value.length + 2);
            const kind = directive.kind === 'page'
                ? 'razor-page'
                : directive.kind === 'model'
                    ? 'razor-model'
                    : directive.kind === 'inject'
                        ? 'razor-inject'
                        : 'razor-directive';
            symbols.push({
                id: `${filePath}:razor:${directive.kind}:${directive.line}:${directive.column}`,
                name,
                kind,
                path: filePath,
                line: directive.line,
                column: directive.column,
                endLine: directive.line,
                endColumn,
                selectionLine: directive.line,
                selectionColumn,
                selectionEndLine: directive.line,
                selectionEndColumn: Math.max(selectionColumn + 1, selectionColumn + name.length),
                detail: `Razor @${directive.kind}${directive.value ? ` ${directive.value}` : ''}`
            });
        }

        let match: RegExpExecArray | null;
        const componentRegex = /(?:^|[^A-Za-z0-9_])<([A-Z][A-Za-z0-9_.]*)(?:\s|>|\/)/g;
        while ((match = componentRegex.exec(text))) {
            const tagOffset = match.index + match[0].indexOf('<');
            const range = this.rangeFromOffsets(text, tagOffset, tagOffset + match[0].length - match[0].indexOf('<'));
            const selection = this.rangeFromOffsets(text, tagOffset + 1, tagOffset + 1 + match[1].length);
            symbols.push({
                id: `${filePath}:razor-component:${match[1]}:${selection.line}:${selection.column}`,
                name: match[1],
                kind: 'razor-component',
                path: filePath,
                line: range.line,
                column: range.column,
                endLine: range.endLine,
                endColumn: range.endColumn,
                selectionLine: selection.line,
                selectionColumn: selection.column,
                selectionEndLine: selection.endLine,
                selectionEndColumn: selection.endColumn,
                detail: 'Razor component tag'
            });
        }

        return symbols;
    }

    protected razorDirectiveSymbolName(kind: string, value: string, name?: string): string | undefined {
        if (kind === 'inject') {
            return name;
        }
        if (value) {
            return value.replace(/^['"](.+)['"]$/, '$1');
        }
        return kind === 'code' || kind === 'functions' ? `@${kind}` : undefined;
    }

    protected containerBeforeOffset(candidates: Array<{ name: string; offset: number }>, offset: number): string | undefined {
        let result: string | undefined;
        for (const candidate of candidates) {
            if (candidate.offset > offset) {
                break;
            }
            result = candidate.name;
        }
        return result;
    }

    protected rangeFromOffsets(text: string, startOffset: number, endOffset: number): CSharpWorkspaceSymbolRange {
        const start = this.positionAt(text, startOffset);
        const end = this.positionAt(text, endOffset);
        return {
            line: start.line,
            column: start.column,
            endLine: Math.max(start.line, end.line),
            endColumn: end.line === start.line ? Math.max(start.column + 1, end.column) : end.column
        };
    }

    protected positionAt(text: string, offset: number): { line: number; column: number } {
        const lines = text.slice(0, Math.max(0, offset)).split(/\r\n|\r|\n/);
        return {
            line: lines.length,
            column: lines[lines.length - 1].length + 1
        };
    }

    protected isCSharpKeyword(value: string): boolean {
        return [
            'if', 'else', 'switch', 'for', 'foreach', 'while', 'do', 'return', 'throw',
            'class', 'interface', 'record', 'struct', 'enum', 'namespace', 'public', 'private',
            'protected', 'internal', 'static', 'async', 'await', 'new', 'var', 'void'
        ].includes(value);
    }

    protected async findRoslynSidecarRoot(): Promise<string | undefined> {
        for (const base of this.packageSearchRoots()) {
            for (const candidate of [
                path.join(base, 'memory-roslyn', 'roslyn-sidecar'),
                path.join(base, 'packages', 'memory-roslyn', 'roslyn-sidecar'),
                path.join(base, '..', 'memory-roslyn', 'roslyn-sidecar'),
                path.join(base, '..', 'Memory', 'packages', 'memory-roslyn', 'roslyn-sidecar')
            ]) {
                if (fs.existsSync(path.join(candidate, 'CyberVinci.Memory.RoslynSidecar.csproj'))) {
                    return path.resolve(candidate);
                }
            }
        }
        return undefined;
    }

    protected packageSearchRoots(): string[] {
        const roots = new Set<string>();
        let current = __dirname;
        for (let index = 0; index < 9; index++) {
            roots.add(current);
            roots.add(path.join(current, '..'));
            roots.add(path.join(current, '..', '..'));
            current = path.dirname(current);
        }
        return [...roots].map(root => path.resolve(root));
    }

    protected async findBuiltRoslynSidecar(sidecarRoot: string): Promise<string | undefined> {
        const candidates: string[] = [];
        await this.collectRoslynSidecarDlls(path.join(sidecarRoot, 'bin'), candidates, 6);
        return candidates
            .filter(candidate => path.basename(candidate) === 'CyberVinci.Memory.RoslynSidecar.dll')
            .sort((left, right) => this.roslynSidecarPathRank(right) - this.roslynSidecarPathRank(left) || right.localeCompare(left))[0];
    }

    protected async collectRoslynSidecarDlls(directoryPath: string, result: string[], depth: number): Promise<void> {
        if (depth < 0) {
            return;
        }
        let entries: fs.Dirent[];
        try {
            entries = await fsp.readdir(directoryPath, { withFileTypes: true });
        } catch {
            return;
        }
        for (const entry of entries) {
            const absolute = path.join(directoryPath, entry.name);
            if (entry.isDirectory()) {
                await this.collectRoslynSidecarDlls(absolute, result, depth - 1);
            } else if (entry.isFile() && entry.name === 'CyberVinci.Memory.RoslynSidecar.dll') {
                result.push(absolute);
            }
        }
    }

    protected roslynSidecarPathRank(candidate: string): number {
        const normalized = candidate.replace(/\\/g, '/').toLowerCase();
        return (normalized.includes('/release/') ? 10 : 0) + (normalized.includes('/sidecar/') ? 5 : 0) + (normalized.includes('/debug/') ? 1 : 0);
    }

    protected roslynTimeoutFromEnvironment(): number | undefined {
        const raw = process.env[ROSLYN_ANALYZER_TIMEOUT_ENV];
        if (!raw) {
            return undefined;
        }
        const parsed = Number(raw);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
    }

    protected roslynTimeout(config?: CSharpKitWorkspaceConfig): number | undefined {
        const environmentTimeout = this.roslynTimeoutFromEnvironment();
        if (environmentTimeout) {
            return environmentTimeout;
        }
        const raw = config?.roslyn?.timeoutMs;
        const parsed = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : undefined;
        return parsed !== undefined && Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
    }

    protected resolveWorkspaceConfiguredPath(workspacePath: string | undefined, configuredPath: string): string {
        if (path.isAbsolute(configuredPath) || !workspacePath) {
            return configuredPath;
        }
        return path.resolve(workspacePath, configuredPath);
    }

    protected async readProject(projectPath: string, workspacePath?: string): Promise<CSharpProjectSummary> {
        const launchProfiles = await this.readLaunchProfiles(projectPath);
        const centralPackages = await this.readCentralPackageVersions(projectPath, workspacePath);
        const msBuildFiles = await this.readDirectoryBuildFiles(projectPath, workspacePath);
        const xml = await fsp.readFile(projectPath, 'utf8');
        const project = parseCsproj(projectPath, xml, launchProfiles, centralPackages.versions);
        const files = await this.listProjectFiles(projectPath);
        return {
            ...project,
            centralPackageVersionPath: centralPackages.path,
            centralPackageVersions: centralPackages.versions,
            msBuildFiles,
            files,
            publishProfiles: await this.readPublishProfiles(projectPath),
            razorFiles: await this.readRazorFiles(projectPath, files)
        };
    }

    protected async readPublishProfiles(projectPath: string): Promise<CSharpPublishProfile[]> {
        const projectDirectory = path.dirname(projectPath);
        const profileDirectory = path.join(projectDirectory, 'Properties', 'PublishProfiles');
        let entries: fs.Dirent[];
        try {
            entries = await fsp.readdir(profileDirectory, { withFileTypes: true });
        } catch {
            return [];
        }
        const profiles: CSharpPublishProfile[] = [];
        for (const entry of entries) {
            if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.pubxml')) {
                continue;
            }
            const profilePath = path.join(profileDirectory, entry.name);
            try {
                const xml = await fsp.readFile(profilePath, 'utf8');
                profiles.push(parsePublishProfile(
                    profilePath,
                    path.relative(projectDirectory, profilePath).replace(/\\/g, '/'),
                    xml
                ));
            } catch {
                // Ignore publish profiles that disappear or cannot be read during inspection.
            }
        }
        return profiles.sort((left, right) => left.name.localeCompare(right.name));
    }

    protected async readCentralPackageVersions(
        projectPath: string,
        workspacePath?: string
    ): Promise<{ path?: string; versions: CSharpCentralPackageVersion[] }> {
        const centralPackagePath = await this.findNearestFile(path.dirname(projectPath), 'Directory.Packages.props', workspacePath);
        if (!centralPackagePath) {
            return { versions: [] };
        }
        try {
            const xml = await fsp.readFile(centralPackagePath, 'utf8');
            return {
                path: centralPackagePath,
                versions: parseCentralPackageVersions(centralPackagePath, xml)
            };
        } catch {
            return { versions: [] };
        }
    }

    protected async readGlobalJsons(workspacePath: string, globalJsonPaths: string[], dotnet: CSharpDotnetInfo): Promise<CSharpGlobalJsonSummary[]> {
        const installedSdks = new Set(this.dotnetSdkVersions(dotnet));
        const summaries: CSharpGlobalJsonSummary[] = [];
        for (const globalJsonPath of globalJsonPaths) {
            const relativePath = path.relative(workspacePath, globalJsonPath).replace(/\\/g, '/');
            try {
                const text = await fsp.readFile(globalJsonPath, 'utf8');
                const summary = parseGlobalJson(globalJsonPath, relativePath, text);
                summaries.push({
                    ...summary,
                    sdkInstalled: summary.sdkVersion ? installedSdks.has(summary.sdkVersion) : undefined
                });
            } catch (error) {
                summaries.push({
                    path: globalJsonPath,
                    relativePath,
                    paths: [],
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
        return summaries.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
    }

    protected async readEditorConfigs(workspacePath: string, editorConfigPaths: string[]): Promise<CSharpEditorConfigSummary[]> {
        const summaries: CSharpEditorConfigSummary[] = [];
        for (const editorConfigPath of editorConfigPaths) {
            try {
                const text = await fsp.readFile(editorConfigPath, 'utf8');
                summaries.push(parseEditorConfig(
                    editorConfigPath,
                    path.relative(workspacePath, editorConfigPath).replace(/\\/g, '/'),
                    text
                ));
            } catch {
                // Ignore .editorconfig files that disappear or cannot be read while the workspace is inspected.
            }
        }
        return summaries.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
    }

    protected async readGlobalAnalyzerConfigs(workspacePath: string, globalConfigPaths: string[]): Promise<CSharpEditorConfigSummary[]> {
        const summaries: CSharpEditorConfigSummary[] = [];
        for (const globalConfigPath of globalConfigPaths) {
            try {
                const text = await fsp.readFile(globalConfigPath, 'utf8');
                summaries.push(parseGlobalAnalyzerConfig(
                    globalConfigPath,
                    path.relative(workspacePath, globalConfigPath).replace(/\\/g, '/'),
                    text
                ));
            } catch {
                // Ignore .globalconfig files that disappear or cannot be read while the workspace is inspected.
            }
        }
        return summaries.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
    }

    protected async readDotnetToolManifests(workspacePath: string, manifestPaths: string[]): Promise<CSharpDotnetToolManifestSummary[]> {
        const summaries: CSharpDotnetToolManifestSummary[] = [];
        for (const manifestPath of manifestPaths) {
            try {
                const text = await fsp.readFile(manifestPath, 'utf8');
                summaries.push(parseDotnetToolManifest(
                    manifestPath,
                    path.relative(workspacePath, manifestPath).replace(/\\/g, '/'),
                    text
                ));
            } catch {
                // Ignore dotnet local tool manifests that disappear or cannot be read during inspection.
            }
        }
        return summaries.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
    }

    protected async readRunSettings(workspacePath: string, runSettingsPaths: string[]): Promise<CSharpRunSettingsSummary[]> {
        const summaries: CSharpRunSettingsSummary[] = [];
        for (const runSettingsPath of runSettingsPaths) {
            try {
                const text = await fsp.readFile(runSettingsPath, 'utf8');
                summaries.push(parseRunSettings(
                    runSettingsPath,
                    path.relative(workspacePath, runSettingsPath).replace(/\\/g, '/'),
                    text
                ));
            } catch {
                // Ignore .runsettings files that disappear or cannot be read while the workspace is inspected.
            }
        }
        return summaries.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
    }

    protected async readDirectoryBuildFiles(projectPath: string, workspacePath?: string): Promise<CSharpMsBuildFileSummary[]> {
        const projectDirectory = path.dirname(projectPath);
        const files: CSharpMsBuildFileSummary[] = [];
        for (const [fileName, kind] of [
            ['Directory.Build.props', 'props'],
            ['Directory.Build.targets', 'targets']
        ] as const) {
            const filePath = await this.findNearestFile(projectDirectory, fileName, workspacePath);
            if (!filePath) {
                continue;
            }
            try {
                const xml = await fsp.readFile(filePath, 'utf8');
                const relativeRoot = workspacePath ? path.resolve(workspacePath) : projectDirectory;
                files.push(parseMsBuildFile(
                    filePath,
                    path.relative(relativeRoot, filePath).replace(/\\/g, '/'),
                    kind,
                    xml
                ));
            } catch {
                // Ignore Directory.Build files that disappear or cannot be read during inspection.
            }
        }
        return files.sort((left, right) => left.kind.localeCompare(right.kind) || left.relativePath.localeCompare(right.relativePath));
    }

    protected dotnetSdkVersions(dotnet: CSharpDotnetInfo): string[] {
        return dotnet.sdks
            .map(sdk => /^\s*([0-9]+\.[0-9]+\.[^\s[]+)/.exec(sdk)?.[1])
            .filter((version): version is string => !!version);
    }

    protected async readNuGetConfigs(workspacePath: string, configPaths: string[]): Promise<CSharpNuGetConfigSummary[]> {
        const summaries: CSharpNuGetConfigSummary[] = [];
        for (const configPath of configPaths) {
            try {
                const text = await fsp.readFile(configPath, 'utf8');
                const relativePath = path.relative(workspacePath, configPath).replace(/\\/g, '/');
                summaries.push(parseNuGetConfig(configPath, relativePath, text));
            } catch {
                // Ignore NuGet.config files that disappear or cannot be read while the workspace is inspected.
            }
        }
        return summaries.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
    }

    protected async findNearestFile(startDirectory: string, fileName: string, workspacePath?: string): Promise<string | undefined> {
        let current = path.resolve(startDirectory);
        const stopDirectory = workspacePath ? path.resolve(workspacePath) : path.parse(current).root;
        while (this.isInsideOrEqual(stopDirectory, current)) {
            const candidate = path.join(current, fileName);
            if (fs.existsSync(candidate)) {
                return candidate;
            }
            if (this.samePath(current, stopDirectory)) {
                break;
            }
            const parent = path.dirname(current);
            if (this.samePath(parent, current)) {
                break;
            }
            current = parent;
        }
        return undefined;
    }

    protected async readRazorFiles(projectPath: string, files: CSharpProjectFile[]): Promise<CSharpRazorFileSummary[]> {
        const projectDirectory = path.dirname(projectPath);
        const summaries: CSharpRazorFileSummary[] = [];
        for (const file of files.filter(candidate => candidate.kind === 'razor')) {
            try {
                const stat = await fsp.stat(file.path);
                if (stat.size > MAX_INTELLISENSE_FILE_BYTES) {
                    continue;
                }
                const text = await fsp.readFile(file.path, 'utf8');
                summaries.push(parseRazorFileSummary(file.path, path.relative(projectDirectory, file.path).replace(/\\/g, '/'), text));
            } catch {
                // Ignore Razor files that disappear or cannot be read while the project is inspected.
            }
        }
        return this.applyRazorImports(projectDirectory, summaries)
            .sort((left, right) => left.relativePath.localeCompare(right.relativePath));
    }

    protected applyRazorImports(projectDirectory: string, summaries: CSharpRazorFileSummary[]): CSharpRazorFileSummary[] {
        const importFiles = summaries.filter(summary => this.isRazorImportFile(summary));
        return summaries.map(summary => {
            const applicableImports = importFiles
                .filter(importFile => importFile.path !== summary.path && this.isRazorImportApplicable(importFile, summary))
                .sort((left, right) => this.razorImportDepth(projectDirectory, left) - this.razorImportDepth(projectDirectory, right)
                    || left.relativePath.localeCompare(right.relativePath));
            if (!applicableImports.length) {
                return summary;
            }
            return this.withRazorImports(summary, applicableImports);
        });
    }

    protected withRazorImports(summary: CSharpRazorFileSummary, importFiles: CSharpRazorFileSummary[]): CSharpRazorFileSummary {
        const importedFiles = importFiles.map(importFile => this.razorImportSummary(importFile));
        const importedUsings = importFiles.flatMap(importFile => importFile.effectiveUsings);
        const importedInjections = importFiles.flatMap(importFile => importFile.effectiveInjections);
        const importNamespaces = importFiles.map(importFile => importFile.effectiveNamespace).filter((value): value is string => !!value);
        const importLayouts = importFiles.map(importFile => importFile.effectiveLayout).filter((value): value is string => !!value);
        const importPrefixes = importFiles.map(importFile => importFile.effectiveTagHelperPrefix).filter((value): value is string => !!value);
        const removeTagHelpers = new Set([...importFiles.flatMap(importFile => importFile.removeTagHelpers), ...summary.removeTagHelpers]);
        const effectiveTagHelpers = uniqueStrings([...importFiles.flatMap(importFile => importFile.effectiveTagHelpers), ...summary.tagHelpers])
            .filter(tagHelper => !removeTagHelpers.has(tagHelper));

        return {
            ...summary,
            importedFiles,
            effectiveNamespace: summary.namespace ?? importNamespaces[importNamespaces.length - 1],
            effectiveLayout: summary.layout ?? importLayouts[importLayouts.length - 1],
            effectiveUsings: uniqueStrings([...importedUsings, ...summary.usings]),
            effectiveInjections: this.uniqueRazorInjections([...importedInjections, ...summary.injections]),
            effectiveTagHelpers,
            effectiveTagHelperPrefix: summary.tagHelperPrefix ?? importPrefixes[importPrefixes.length - 1]
        };
    }

    protected razorImportSummary(importFile: CSharpRazorFileSummary): CSharpRazorImportSummary {
        return {
            path: importFile.path,
            relativePath: importFile.relativePath,
            namespace: importFile.effectiveNamespace,
            layout: importFile.effectiveLayout,
            usings: importFile.effectiveUsings,
            injections: importFile.effectiveInjections,
            tagHelpers: importFile.effectiveTagHelpers,
            removeTagHelpers: importFile.removeTagHelpers,
            tagHelperPrefix: importFile.effectiveTagHelperPrefix
        };
    }

    protected isRazorImportFile(summary: CSharpRazorFileSummary): boolean {
        const fileName = path.basename(summary.path).toLowerCase();
        return fileName === '_viewimports.cshtml' || fileName === '_imports.razor';
    }

    protected isRazorImportApplicable(importFile: CSharpRazorFileSummary, summary: CSharpRazorFileSummary): boolean {
        const importFileName = path.basename(importFile.path).toLowerCase();
        if (summary.kind === 'cshtml' && importFileName !== '_viewimports.cshtml') {
            return false;
        }
        if (summary.kind === 'razor' && importFileName !== '_imports.razor') {
            return false;
        }
        return this.isInsideOrEqual(path.dirname(importFile.path), path.dirname(summary.path));
    }

    protected razorImportDepth(projectDirectory: string, summary: CSharpRazorFileSummary): number {
        return path.relative(projectDirectory, path.dirname(summary.path))
            .split(/[\\/]+/)
            .filter(Boolean).length;
    }

    protected uniqueRazorInjections(injections: CSharpRazorInjection[]): CSharpRazorInjection[] {
        const result = new Map<string, CSharpRazorInjection>();
        for (const injection of injections) {
            result.set(`${injection.name}:${injection.type}`, injection);
        }
        return [...result.values()];
    }

    protected async readLaunchProfiles(projectPath: string) {
        const launchSettingsPath = path.join(path.dirname(projectPath), 'Properties', 'launchSettings.json');
        try {
            const text = await fsp.readFile(launchSettingsPath, 'utf8');
            return parseLaunchSettings(text);
        } catch {
            return [];
        }
    }

    protected async readSolution(solutionPath: string): Promise<CSharpSolutionSummary> {
        const text = await fsp.readFile(solutionPath, 'utf8');
        const lowerPath = solutionPath.toLowerCase();
        if (lowerPath.endsWith('.slnf')) {
            const solutionFilter = this.parseSlnfSolution(solutionPath, text);
            return {
                path: solutionPath,
                name: path.basename(solutionPath),
                format: 'slnf',
                sourceSolutionPath: solutionFilter.sourceSolutionPath,
                sourceSolutionName: solutionFilter.sourceSolutionPath ? path.basename(solutionFilter.sourceSolutionPath) : undefined,
                projectPaths: solutionFilter.projectPaths
            };
        }
        const format = lowerPath.endsWith('.slnx') ? 'slnx' : 'sln';
        const projectPaths = format === 'sln'
            ? this.parseSlnProjectPaths(solutionPath, text)
            : this.parseSlnxProjectPaths(solutionPath, text);
        return {
            path: solutionPath,
            name: path.basename(solutionPath),
            format,
            projectPaths
        };
    }

    protected parseSlnfSolution(solutionFilterPath: string, text: string): { sourceSolutionPath?: string; projectPaths: string[] } {
        let parsed: unknown;
        try {
            parsed = JSON.parse(text);
        } catch {
            return { projectPaths: [] };
        }
        if (!this.isJsonObject(parsed) || !this.isJsonObject(parsed.solution)) {
            return { projectPaths: [] };
        }
        const solutionPath = typeof parsed.solution.path === 'string' && parsed.solution.path.trim()
            ? this.resolveSolutionEntryPath(path.dirname(solutionFilterPath), parsed.solution.path)
            : undefined;
        const solutionDirectory = solutionPath ? path.dirname(solutionPath) : path.dirname(solutionFilterPath);
        const projects = Array.isArray(parsed.solution.projects) ? parsed.solution.projects : [];
        return {
            sourceSolutionPath: solutionPath,
            projectPaths: uniqueResolvedPaths(projects
                .filter((projectPath): projectPath is string => typeof projectPath === 'string' && !!projectPath.trim())
                .map(projectPath => this.resolveSolutionEntryPath(solutionDirectory, projectPath))
                .filter(projectPath => /\.csproj$/i.test(projectPath)))
        };
    }

    protected parseSlnProjectPaths(solutionPath: string, text: string): string[] {
        const result: string[] = [];
        const solutionDir = path.dirname(solutionPath);
        const regex = /Project\("[^"]+"\)\s*=\s*"[^"]+",\s*"([^"]+\.csproj)"/gi;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(text))) {
            result.push(this.resolveSolutionEntryPath(solutionDir, match[1]));
        }
        return uniqueResolvedPaths(result);
    }

    protected parseSlnxProjectPaths(solutionPath: string, text: string): string[] {
        const result: string[] = [];
        const solutionDir = path.dirname(solutionPath);
        const projectRegex = /<(?:[A-Za-z_][\w.-]*:)?Project\b([^>]*)>/gi;
        let match: RegExpExecArray | null;
        while ((match = projectRegex.exec(text))) {
            const attributes = this.xmlAttributes(match[1]);
            const projectPath = attributes.path ?? attributes.file ?? attributes.include;
            if (projectPath && /\.csproj$/i.test(projectPath)) {
                result.push(this.resolveSolutionEntryPath(solutionDir, projectPath));
            }
        }
        return uniqueResolvedPaths(result);
    }

    protected resolveSolutionEntryPath(baseDirectory: string, entryPath: string): string {
        const normalized = entryPath.replace(/\\/g, path.sep);
        return path.isAbsolute(normalized) ? path.resolve(normalized) : path.resolve(baseDirectory, normalized);
    }

    protected isJsonObject(value: unknown): value is Record<string, unknown> {
        return typeof value === 'object' && value !== null && !Array.isArray(value);
    }

    protected xmlAttributes(text: string): Record<string, string> {
        const attributes: Record<string, string> = {};
        const regex = /([A-Za-z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(text))) {
            attributes[match[1].toLowerCase()] = decodeXml(match[2] ?? match[3] ?? '');
        }
        return attributes;
    }

    protected async findWorkspaceFiles(workspacePath: string): Promise<{ solutions: string[]; projects: string[]; razorFiles: string[]; globalJsons: string[]; editorConfigs: string[]; globalConfigs: string[]; toolManifests: string[]; runSettings: string[]; nugetConfigs: string[] }> {
        const solutions: string[] = [];
        const projects: string[] = [];
        const razorFiles: string[] = [];
        const globalJsons: string[] = [];
        const editorConfigs: string[] = [];
        const globalConfigs: string[] = [];
        const toolManifests: string[] = [];
        const runSettings: string[] = [];
        const nugetConfigs: string[] = [];
        const scanCount = (): number => solutions.length + projects.length + razorFiles.length + globalJsons.length + editorConfigs.length + globalConfigs.length + toolManifests.length + runSettings.length + nugetConfigs.length;

        const visit = async (directory: string, depth: number): Promise<void> => {
            if (depth < 0 || scanCount() >= MAX_SCAN_RESULTS) {
                return;
            }
            let entries: fs.Dirent[];
            try {
                entries = await fsp.readdir(directory, { withFileTypes: true });
            } catch {
                return;
            }
            for (const entry of entries) {
                const fullPath = path.join(directory, entry.name);
                if (entry.isDirectory()) {
                    if (!EXCLUDED_DIRECTORIES.has(entry.name)) {
                        await visit(fullPath, depth - 1);
                    }
                    continue;
                }
                if (!entry.isFile()) {
                    continue;
                }
                const lower = entry.name.toLowerCase();
                if (lower.endsWith('.sln') || lower.endsWith('.slnx') || lower.endsWith('.slnf')) {
                    solutions.push(fullPath);
                } else if (lower.endsWith('.csproj')) {
                    projects.push(fullPath);
                } else if (lower.endsWith('.cshtml') || lower.endsWith('.razor')) {
                    razorFiles.push(fullPath);
                } else if (lower === 'global.json') {
                    globalJsons.push(fullPath);
                } else if (lower === '.editorconfig') {
                    editorConfigs.push(fullPath);
                } else if (lower.endsWith('.globalconfig')) {
                    globalConfigs.push(fullPath);
                } else if (lower === 'dotnet-tools.json') {
                    toolManifests.push(fullPath);
                } else if (lower.endsWith('.runsettings')) {
                    runSettings.push(fullPath);
                } else if (lower === 'nuget.config') {
                    nugetConfigs.push(fullPath);
                }
                if (scanCount() >= MAX_SCAN_RESULTS) {
                    return;
                }
            }
        };

        await visit(workspacePath, MAX_SCAN_DEPTH);
        return {
            solutions: sortPaths(solutions),
            projects: sortPaths(projects),
            razorFiles: sortPaths(razorFiles),
            globalJsons: sortPaths(globalJsons),
            editorConfigs: sortPaths(editorConfigs),
            globalConfigs: sortPaths(globalConfigs),
            toolManifests: sortPaths(toolManifests),
            runSettings: sortPaths(runSettings),
            nugetConfigs: sortPaths(nugetConfigs)
        };
    }

    protected async listProjectFiles(projectPath: string): Promise<CSharpProjectFile[]> {
        const projectDirectory = path.dirname(projectPath);
        const files: CSharpProjectFile[] = [];

        const visit = async (directory: string, depth: number): Promise<void> => {
            if (depth < 0 || files.length >= MAX_PROJECT_FILES) {
                return;
            }
            let entries: fs.Dirent[];
            try {
                entries = await fsp.readdir(directory, { withFileTypes: true });
            } catch {
                return;
            }
            for (const entry of entries) {
                const fullPath = path.join(directory, entry.name);
                if (entry.isDirectory()) {
                    if (!EXCLUDED_DIRECTORIES.has(entry.name)) {
                        await visit(fullPath, depth - 1);
                    }
                    continue;
                }
                if (!entry.isFile() || !this.isProjectSystemFile(fullPath)) {
                    continue;
                }
                files.push({
                    path: fullPath,
                    relativePath: path.relative(projectDirectory, fullPath).replace(/\\/g, '/'),
                    kind: this.projectFileKind(fullPath)
                });
                if (files.length >= MAX_PROJECT_FILES) {
                    return;
                }
            }
        };

        await visit(projectDirectory, MAX_SCAN_DEPTH);
        return files.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
    }

    protected isProjectSystemFile(filePath: string): boolean {
        const fileName = path.basename(filePath).toLowerCase();
        const extension = path.extname(fileName);
        if (fileName === '.editorconfig' || fileName.endsWith('.globalconfig')) {
            return true;
        }
        if (['.cs', '.cshtml', '.razor', '.resx', '.proto', '.props', '.targets', '.config', '.pubxml', '.runsettings'].includes(extension)) {
            return true;
        }
        if (extension === '.json') {
            return fileName === 'appsettings.json'
                || fileName.startsWith('appsettings.')
                || fileName === 'launchsettings.json'
                || fileName === 'global.json';
        }
        return false;
    }

    protected projectFileKind(filePath: string): CSharpProjectFile['kind'] {
        const fileName = path.basename(filePath).toLowerCase();
        if (fileName === '.editorconfig' || fileName.endsWith('.globalconfig')) {
            return 'config';
        }
        const extension = path.extname(filePath).toLowerCase();
        if (extension === '.cs') {
            return 'csharp';
        }
        if (extension === '.razor' || extension === '.cshtml') {
            return 'razor';
        }
        if (extension === '.resx') {
            return 'resource';
        }
        if (extension === '.proto') {
            return 'proto';
        }
        if (extension === '.json' || extension === '.config' || extension === '.props' || extension === '.targets' || extension === '.pubxml' || extension === '.runsettings') {
            return 'config';
        }
        return 'other';
    }

    protected nuGetSourceCount(configs: CSharpNuGetConfigSummary[]): number {
        return configs.reduce((count, config) => count + config.packageSources.length, 0);
    }

    protected enabledNuGetSourceCount(configs: CSharpNuGetConfigSummary[]): number {
        return configs.reduce((count, config) => count + config.packageSources.filter(source => !source.disabled).length, 0);
    }

    protected nuGetMappingCount(configs: CSharpNuGetConfigSummary[]): number {
        return configs.reduce((count, config) => count + config.packageSourceMappings.length, 0);
    }

    protected dotnetLocalToolCount(manifests: CSharpDotnetToolManifestSummary[]): number {
        return manifests.reduce((count, manifest) => count + manifest.tools.length, 0);
    }

    protected hasDotnetLocalTool(manifests: CSharpDotnetToolManifestSummary[], packageOrCommand: string): boolean {
        return manifests.some(manifest => manifest.tools.some(tool =>
            tool.packageId.toLowerCase() === packageOrCommand.toLowerCase()
            || tool.commands.some(command => command.toLowerCase() === packageOrCommand.toLowerCase())
        ));
    }

    protected isKnownDotnetTestRunner(value: string | undefined): boolean {
        return this.isVSTestRunner(value) || this.isMicrosoftTestingPlatformRunner(value);
    }

    protected isVSTestRunner(value: string | undefined): boolean {
        return /^VSTest$/i.test(value ?? '');
    }

    protected isMicrosoftTestingPlatformRunner(value: string | undefined): boolean {
        return /^Microsoft\.Testing\.Platform$/i.test(value ?? '');
    }

    protected sdkMajor(version: string | undefined): number | undefined {
        const match = /^(\d+)\./.exec(version ?? '');
        if (!match) {
            return undefined;
        }
        const major = Number(match[1]);
        return Number.isFinite(major) ? major : undefined;
    }

    protected async dotnetTestRunnerForTarget(workspacePath: string, targetPath: string): Promise<'mtp' | 'vstest'> {
        const files = await this.findWorkspaceFiles(workspacePath);
        const globalJsons: CSharpGlobalJsonSummary[] = [];
        for (const globalJsonPath of files.globalJsons) {
            try {
                const text = await fsp.readFile(globalJsonPath, 'utf8');
                globalJsons.push(parseGlobalJson(
                    globalJsonPath,
                    path.relative(workspacePath, globalJsonPath).replace(/\\/g, '/'),
                    text
                ));
            } catch {
                // Ignore global.json files that disappear or cannot be parsed while composing dotnet test arguments.
            }
        }
        const candidate = this.nearestGlobalJsonForTarget(globalJsons, targetPath);
        return this.isMicrosoftTestingPlatformRunner(candidate?.testRunner) ? 'mtp' : 'vstest';
    }

    protected nearestGlobalJsonForTarget(globalJsons: CSharpGlobalJsonSummary[], targetPath: string): CSharpGlobalJsonSummary | undefined {
        const targetDirectory = path.extname(targetPath) ? path.dirname(targetPath) : targetPath;
        return globalJsons
            .filter(globalJson => this.isInsideOrEqual(path.dirname(globalJson.path), targetDirectory))
            .sort((left, right) => path.dirname(right.path).length - path.dirname(left.path).length)[0];
    }

    protected dotnetTestTargetArgs(targetPath: string, targetKind: 'project' | 'solution', runner: 'mtp' | 'vstest'): string[] {
        if (runner === 'mtp') {
            return ['test', targetKind === 'project' ? '--project' : '--solution', targetPath];
        }
        return ['test', targetPath];
    }

    protected dotnetTestConsoleArgs(runner: 'mtp' | 'vstest'): string[] {
        return runner === 'mtp' ? [] : ['--logger', 'console;verbosity=normal'];
    }

    protected dotnetTestTrxArgs(runner: 'mtp' | 'vstest', resultsDirectory: string): string[] {
        return runner === 'mtp'
            ? ['--report-trx', '--report-trx-filename', 'csharp-kit.trx', '--results-directory', resultsDirectory]
            : ['--logger', 'trx;LogFileName=csharp-kit.trx', '--results-directory', resultsDirectory];
    }

    protected capabilities(
        dotnet: CSharpDotnetInfo,
        csharpKitConfig: CSharpKitWorkspaceConfigStatus,
        roslyn: CSharpRoslynStatus,
        debugAdapter: CSharpDebugAdapterStatus,
        languageServers: CSharpLanguageServerAdapterStatus[],
        solutions: CSharpSolutionSummary[],
        projects: CSharpProjectSummary[],
        razorFileCount: number,
        globalJsons: CSharpGlobalJsonSummary[],
        editorConfigs: CSharpEditorConfigSummary[],
        globalConfigs: CSharpEditorConfigSummary[],
        toolManifests: CSharpDotnetToolManifestSummary[],
        runSettings: CSharpRunSettingsSummary[],
        nugetConfigs: CSharpNuGetConfigSummary[]
    ): CSharpCapability[] {
        const hasTests = projects.some(project => project.isTestProject);
        const hasWeb = projects.some(project => project.isAspNetCore);
        const efCoreProjects = projects.filter(project => this.hasEntityFrameworkCoreReference(project));
        const userSecretsProjects = projects.filter(project => project.userSecretsId);
        const publishProfileCount = projects.reduce((count, project) => count + project.publishProfiles.length, 0);
        const projectFileCount = projects.reduce((count, project) => count + project.files.length, 0);
        const solutionFilterCount = solutions.filter(solution => solution.format === 'slnf').length;
        const msBuildFileCount = projects.reduce((count, project) => count + project.msBuildFiles.length, 0);
        const msBuildPropertyCount = projects.reduce((count, project) => count + project.msBuildFiles.reduce((propertyCount, file) => propertyCount + file.properties.length, 0), 0);
        const invalidGlobalJsons = globalJsons.filter(globalJson => globalJson.error);
        const missingPinnedSdkGlobalJsons = globalJsons.filter(globalJson => globalJson.sdkVersion && globalJson.sdkInstalled === false);
        const configuredTestRunnerGlobalJsons = globalJsons.filter(globalJson => globalJson.testRunner);
        const invalidTestRunnerGlobalJsons = configuredTestRunnerGlobalJsons.filter(globalJson => !this.isKnownDotnetTestRunner(globalJson.testRunner));
        const mtpRunnerGlobalJsons = configuredTestRunnerGlobalJsons.filter(globalJson => this.isMicrosoftTestingPlatformRunner(globalJson.testRunner));
        const mtpRunnerSdkMismatches = mtpRunnerGlobalJsons.filter(globalJson => this.sdkMajor(globalJson.sdkVersion ?? dotnet.version) !== undefined && (this.sdkMajor(globalJson.sdkVersion ?? dotnet.version) ?? 0) < 10);
        const analyzerConfigs = [...editorConfigs, ...globalConfigs];
        const editorConfigSectionCount = analyzerConfigs.reduce((count, config) => count + config.sections.length, 0);
        const editorConfigAnalyzerRuleCount = analyzerConfigs.reduce((count, config) => count + config.analyzerRuleCount, 0);
        const editorConfigStylePropertyCount = analyzerConfigs.reduce((count, config) => count + config.csharpPropertyCount + config.dotnetPropertyCount, 0);
        const localToolCount = this.dotnetLocalToolCount(toolManifests);
        const hasDotnetEfLocalTool = this.hasDotnetLocalTool(toolManifests, 'dotnet-ef');
        const runSettingsDataCollectorCount = runSettings.reduce((count, settings) => count + settings.dataCollectors.length, 0);
        const runSettingsParameterCount = runSettings.reduce((count, settings) => count + settings.testRunParameters.length, 0);
        const nugetSourceCount = this.nuGetSourceCount(nugetConfigs);
        const enabledNuGetSourceCount = this.enabledNuGetSourceCount(nugetConfigs);
        const nugetMappingCount = this.nuGetMappingCount(nugetConfigs);
        const readyLanguageServers = languageServers.filter(adapter => adapter.mode === 'ready');
        const csharpLanguageServerReady = languageServers.some(adapter => adapter.language === 'csharp' && adapter.mode === 'ready');
        const razorLanguageServerReady = languageServers.some(adapter => adapter.language === 'razor' && adapter.mode === 'ready');
        const runtimeReadinessBlockers = this.runtimeReadinessBlockers(
            dotnet,
            debugAdapter,
            csharpLanguageServerReady,
            razorLanguageServerReady,
            razorFileCount
        );
        const runtimeReadinessState: CSharpCapabilityState = !dotnet.available
            ? 'missing'
            : runtimeReadinessBlockers.length ? 'partial' : 'ready';
        return [
            {
                id: 'dotnet-sdk',
                label: '.NET SDK',
                state: dotnet.available ? 'ready' : 'missing',
                source: dotnet.available ? dotnet.executable : 'system PATH',
                detail: dotnet.available ? `Detected ${dotnet.version ?? 'unknown version'}` : dotnet.error ?? 'dotnet was not found'
            },
            {
                id: 'csharp-runtime-readiness',
                label: 'C# runtime readiness',
                state: runtimeReadinessState,
                source: 'dotnet + decoupled adapter discovery',
                detail: this.runtimeReadinessDetail(dotnet, debugAdapter, readyLanguageServers, runtimeReadinessBlockers, razorFileCount)
            },
            {
                id: 'dotnet-sdk-selection',
                label: '.NET SDK selection',
                state: globalJsons.length
                    ? invalidGlobalJsons.length || missingPinnedSdkGlobalJsons.length ? 'partial' : dotnet.available ? 'ready' : 'missing'
                    : 'external',
                source: 'global.json + dotnet --info',
                detail: globalJsons.length
                    ? `${globalJsons.length} global.json file(s) detected. ${missingPinnedSdkGlobalJsons.length} pinned SDK version(s) are not installed exactly; ${invalidGlobalJsons.length} file(s) could not be parsed.`
                    : 'No global.json SDK selection file detected; dotnet will use its normal SDK resolution.'
            },
            {
                id: 'dotnet-test-runner',
                label: 'dotnet test runner',
                state: configuredTestRunnerGlobalJsons.length
                    ? invalidTestRunnerGlobalJsons.length || mtpRunnerSdkMismatches.length ? 'partial' : dotnet.available ? 'ready' : 'missing'
                    : hasTests ? 'external' : 'missing',
                source: 'global.json test.runner + dotnet test',
                detail: configuredTestRunnerGlobalJsons.length
                    ? `Detected ${configuredTestRunnerGlobalJsons.length} global.json test runner setting(s): ${sortPaths(configuredTestRunnerGlobalJsons.map(globalJson => globalJson.testRunner ?? '')).join(', ')}. ${invalidTestRunnerGlobalJsons.length} unknown runner value(s); ${mtpRunnerSdkMismatches.length} Microsoft.Testing.Platform SDK compatibility warning(s).`
                    : hasTests
                        ? 'No global.json test.runner configured; dotnet test uses its default VSTest-compatible mode for this SDK.'
                        : 'Requires at least one test project or global.json test.runner setting.'
            },
            {
                id: 'csharp-kit-config',
                label: 'C# Kit adapter config',
                state: csharpKitConfig.state === 'invalid'
                    ? 'partial'
                    : csharpKitConfig.exists
                        ? 'ready'
                        : projects.length ? 'external' : 'missing',
                source: CSHARP_KIT_CONFIG_RELATIVE_PATH,
                detail: this.csharpKitConfigCapabilityDetail(csharpKitConfig)
            },
            {
                id: 'solution-project-system',
                label: 'Solutions and projects',
                state: projects.length ? 'ready' : 'missing',
                source: '@cybervinci/csharp-kit',
                detail: `${solutions.length} solution/filter file(s), including ${solutionFilterCount} .slnf filter(s), ${projects.length} project(s), ${projectFileCount} C# project file(s). Create solutions, add/remove projects and manage project references through dotnet CLI commands.`
            },
            {
                id: 'msbuild-configuration',
                label: 'MSBuild configuration',
                state: msBuildFileCount ? 'ready' : projects.length ? 'external' : 'missing',
                source: 'Directory.Build.props/targets + @cybervinci/csharp-kit',
                detail: msBuildFileCount
                    ? `Detected ${msBuildFileCount} inherited Directory.Build.props/targets file reference(s) with ${msBuildPropertyCount} simple MSBuild properties across project summaries.`
                    : projects.length
                        ? 'No inherited Directory.Build.props or Directory.Build.targets files were detected for the current projects.'
                        : 'Requires at least one C# project.'
            },
            {
                id: 'editorconfig-style',
                label: 'Code style and analyzers',
                state: analyzerConfigs.length ? 'ready' : projects.length ? 'external' : 'missing',
                source: '.editorconfig/.globalconfig + @cybervinci/csharp-kit',
                detail: analyzerConfigs.length
                    ? `Detected ${editorConfigs.length} .editorconfig file(s), ${globalConfigs.length} .globalconfig file(s), ${editorConfigSectionCount} section(s), ${editorConfigStylePropertyCount} C#/dotnet setting(s) and ${editorConfigAnalyzerRuleCount} analyzer severity rule(s).`
                    : projects.length
                        ? 'No .editorconfig or .globalconfig file detected; Roslyn and dotnet format will use default code-style and analyzer settings.'
                        : 'Requires at least one C# project.'
            },
            {
                id: 'dotnet-local-tools',
                label: '.NET local tools',
                state: toolManifests.length ? dotnet.available ? 'ready' : 'missing' : projects.length ? 'external' : 'missing',
                source: 'dotnet-tools.json + dotnet tool restore',
                detail: toolManifests.length
                    ? `Detected ${toolManifests.length} dotnet local tool manifest(s) with ${localToolCount} tool(s). ${hasDotnetEfLocalTool ? 'dotnet-ef is declared locally.' : 'dotnet-ef is not declared locally.'}`
                    : projects.length
                        ? 'No dotnet local tool manifest detected; commands such as dotnet-ef must be available globally or installed separately.'
                        : 'Requires at least one C# project.'
            },
            {
                id: 'project-templates',
                label: 'C# templates',
                state: dotnet.available ? 'ready' : 'missing',
                source: 'dotnet new + @cybervinci/csharp-kit',
                detail: `Create console, ASP.NET Core, worker, library and test projects from ${CSHARP_PROJECT_TEMPLATES.length} project templates, plus class/interface/controller/Razor/test items from ${CSHARP_PROJECT_ITEM_TEMPLATES.length} item templates.`
            },
            {
                id: 'roslyn-semantic-memory',
                label: 'Roslyn semantic inventory',
                state: roslyn.mode === 'semantic-ready' ? 'ready' : projects.length ? 'partial' : 'missing',
                source: '@cybervinci/memory-roslyn/env/workspace config',
                detail: projects.length ? roslyn.detail : 'Requires a .csproj/.sln workspace.'
            },
            {
                id: 'ai-memory-context',
                label: 'AI/Memory context',
                state: projects.length ? 'ready' : 'missing',
                source: '@cybervinci/csharp-kit + @cybervinci/memory',
                detail: projects.length
                    ? 'C# Kit can build prompt-ready context packs from project metadata, symbols, package references and Roslyn/Memory hints for decoupled assistant workflows.'
                    : 'Requires at least one C# project.'
            },
            {
                id: 'csharp-monaco-intellisense',
                label: 'C# IntelliSense',
                state: csharpLanguageServerReady ? 'ready' : projects.length ? 'partial' : 'missing',
                source: '@cybervinci/csharp-kit + Monaco',
                detail: projects.length
                    ? csharpLanguageServerReady
                        ? 'A C# language server adapter is available and can be probed with LSP initialize alongside workspace completions, signature help, symbol hover, outline, go-to-definition and C# snippets.'
                        : 'Workspace completions, signature help, symbol hover, outline, go-to-definition and C# snippets are registered for .cs, .razor and .cshtml files. Full LSP remains a pluggable adapter boundary with command discovery and initialize probing.'
                    : 'Requires a .csproj/.sln workspace.'
            },
            {
                id: 'language-server-adapters',
                label: 'Language server adapters',
                state: readyLanguageServers.length ? 'ready' : projects.length ? 'partial' : 'missing',
                source: 'csharp-ls/OmniSharp/Razor LSP adapter boundary',
                detail: readyLanguageServers.length
                    ? `Detected ${readyLanguageServers.map(adapter => adapter.label).join(', ')} for full LSP-style editing; use the C# Kit language-server probe command to validate initialize capabilities.`
                    : 'No external C# or Razor language server command was detected. Configure CYBERVINCI_CSHARP_LSP_COMMAND, CYBERVINCI_RAZOR_LSP_COMMAND or .cybervinci/csharp-kit.json to attach decoupled LSP servers without Microsoft VSIX packaging.'
            },
            {
                id: 'build-diagnostics',
                label: 'Build diagnostics',
                state: dotnet.available && projects.length ? 'ready' : 'missing',
                source: 'dotnet build + Theia Problems',
                detail: dotnet.available && projects.length
                    ? 'C# Kit can parse MSBuild errors/warnings and publish them as editor/Problems diagnostics.'
                    : 'Requires dotnet and at least one C# project.'
            },
            {
                id: 'publish-workflow',
                label: 'Publish workflow',
                state: dotnet.available && projects.length ? 'ready' : 'missing',
                source: 'dotnet publish + @cybervinci/csharp-kit',
                detail: dotnet.available && projects.length
                    ? `C# Kit can publish selected projects with Release configuration or publish-profile tasks. Detected ${publishProfileCount} .pubxml publish profile(s).`
                    : 'Requires dotnet and at least one C# project.'
            },
            {
                id: 'debug-launch',
                label: 'Debug launch profiles',
                state: dotnet.available && projects.length && debugAdapter.mode === 'ready' ? 'ready' : dotnet.available && projects.length ? 'partial' : 'missing',
                source: '@cybervinci/csharp-kit + netcoredbg/vsdbg/env/workspace config/dotnet tool manifest',
                detail: dotnet.available && projects.length
                    ? debugAdapter.detail
                    : 'Requires dotnet and at least one project.'
            },
            {
                id: 'aspnet-server-ready',
                label: 'ASP.NET Core server ready action',
                state: hasWeb ? 'ready' : 'external',
                source: '@cybervinci/csharp-kit',
                detail: hasWeb
                    ? 'Generated launch profiles include Project and Executable launchSettings debug configurations, ASPNETCORE_URLS, working directories, hot reload/native debugging metadata, run/watch profile tasks, integrated launch URL opening and serverReadyAction for browser opening.'
                    : 'No ASP.NET Core project detected.'
            },
            {
                id: 'aspnet-local-settings',
                label: 'ASP.NET local settings',
                state: hasWeb ? dotnet.available ? 'ready' : 'missing' : 'external',
                source: 'dotnet user-secrets + dotnet dev-certs',
                detail: hasWeb
                    ? `C# Kit can initialize/list/set/remove user secrets and trust the ASP.NET Core HTTPS development certificate. ${userSecretsProjects.length} ASP.NET project(s) already define UserSecretsId.`
                    : 'No ASP.NET Core project detected.'
            },
            {
                id: 'test-explorer-workflow',
                label: 'Test workflow',
                state: hasTests ? 'ready' : 'external',
                source: '@cybervinci/csharp-kit',
                detail: hasTests
                    ? `Detected test projects. Theia Test Explorer can discover, run and launch CoreCLR debug sessions for xUnit, NUnit and MSTest tests, including MSTest.Sdk/Microsoft.Testing.Platform projects. ${runSettings.length} .runsettings file(s) detected.`
                    : 'No xUnit/NUnit/MSTest project detected.'
            },
            {
                id: 'test-runsettings',
                label: 'Test run settings',
                state: runSettings.length ? 'ready' : hasTests ? 'external' : 'missing',
                source: '.runsettings + dotnet test --settings',
                detail: runSettings.length
                    ? `Detected ${runSettings.length} .runsettings file(s), ${runSettingsDataCollectorCount} data collector(s) and ${runSettingsParameterCount} test parameter(s). Generated test tasks can run with --settings.`
                    : hasTests
                        ? 'No .runsettings file detected; generated dotnet test tasks will run without explicit test settings.'
                        : 'Requires at least one test project.'
            },
            {
                id: 'nuget',
                label: 'NuGet packages',
                state: dotnet.available && projects.length ? 'ready' : 'missing',
                source: 'nuget.org search + dotnet CLI',
                detail: nugetConfigs.length
                    ? `Search nuget.org, list installed packages, check outdated/vulnerable/deprecated references, add/update/remove package references and restore through dotnet CLI commands. Detected ${enabledNuGetSourceCount}/${nugetSourceCount} enabled source(s) and ${nugetMappingCount} package source mapping group(s) from ${nugetConfigs.length} NuGet.config file(s).`
                    : 'Search nuget.org, list installed packages, check outdated/vulnerable/deprecated references, add/update/remove package references and restore through dotnet CLI commands. No workspace NuGet.config files detected; dotnet will also use user and machine defaults.'
            },
            {
                id: 'ef-core-workflow',
                label: 'EF Core workflow',
                state: efCoreProjects.length ? dotnet.available ? 'ready' : 'missing' : 'external',
                source: 'dotnet ef + @cybervinci/csharp-kit',
                detail: efCoreProjects.length
                    ? `Detected EF Core references in ${efCoreProjects.length} project(s). C# Kit can list migrations, add migrations and update databases through dotnet ef terminal commands and generated tasks. ${hasDotnetEfLocalTool ? 'A local dotnet-ef tool manifest is present.' : 'No local dotnet-ef tool manifest was detected.'}`
                    : 'No Microsoft.EntityFrameworkCore package references detected.'
            },
            {
                id: 'razor',
                label: 'Razor/cshtml inventory',
                state: razorLanguageServerReady ? 'ready' : razorFileCount > 0 ? 'partial' : 'external',
                source: '@cybervinci/csharp-kit + Razor Visual Editor',
                detail: razorLanguageServerReady
                    ? `${razorFileCount} Razor file(s) detected and a Razor language server adapter is available.`
                    : razorFileCount > 0
                        ? `${razorFileCount} Razor file(s) detected. C# Kit extracts directives, tag helpers, inherited import context, component tags and outline symbols; Razor LSP remains an adapter boundary.`
                    : 'Install/open Razor Visual Editor for visual .cshtml workflows.'
            }
        ];
    }

    protected runtimeReadinessBlockers(
        dotnet: CSharpDotnetInfo,
        debugAdapter: CSharpDebugAdapterStatus,
        csharpLanguageServerReady: boolean,
        razorLanguageServerReady: boolean,
        razorFileCount: number
    ): string[] {
        return [
            !dotnet.available ? '.NET SDK' : undefined,
            !csharpLanguageServerReady ? 'C# language server adapter' : undefined,
            debugAdapter.mode !== 'ready' ? 'CoreCLR debug adapter' : undefined,
            razorFileCount > 0 && !razorLanguageServerReady ? 'Razor language server adapter' : undefined
        ].filter((entry): entry is string => Boolean(entry));
    }

    protected runtimeReadinessDetail(
        dotnet: CSharpDotnetInfo,
        debugAdapter: CSharpDebugAdapterStatus,
        readyLanguageServers: CSharpLanguageServerAdapterStatus[],
        blockers: string[],
        razorFileCount: number
    ): string {
        const readyAdapters = readyLanguageServers.length
            ? readyLanguageServers.map(adapter => adapter.label).join(', ')
            : 'no language-server adapters';
        const razorScope = razorFileCount > 0
            ? `${razorFileCount} Razor file(s) require Razor LSP for full Razor editing.`
            : 'Razor LSP is only required when the workspace contains Razor files.';
        if (!dotnet.available) {
            return `dotnet is missing; configure a .NET SDK before generated build, test, run, debug and package workflows can run. ${blockers.length ? `Also missing: ${blockers.filter(blocker => blocker !== '.NET SDK').join(', ') || 'none'}.` : ''}`;
        }
        if (blockers.length) {
            return `dotnet ${dotnet.version ?? 'SDK'} is available, but full runtime readiness is partial: missing ${blockers.join(', ')}. Ready adapters: ${readyAdapters}. ${debugAdapter.detail} ${razorScope}`;
        }
        return `dotnet ${dotnet.version ?? 'SDK'}, ${debugAdapter.adapter} and ${readyAdapters} are ready. C# Kit can use build/test/run/debug workflows and full decoupled LSP-style editing for this workspace. ${razorScope}`;
    }

    protected csharpKitConfigCapabilityDetail(config: CSharpKitWorkspaceConfigStatus): string {
        if (config.state === 'absent') {
            return `No ${config.relativePath} file is present. Generate workspace files to create a non-overwriting template for Roslyn, CoreCLR and language-server adapter commands.`;
        }
        if (config.state === 'invalid') {
            return `${config.relativePath} exists but could not be parsed as a JSON object${config.error ? `: ${config.error}` : '.'}`;
        }
        const configured = [
            config.configuredRoslyn ? 'Roslyn sidecar settings' : undefined,
            ...config.configuredDebugAdapters.map(adapter => `${adapter} debug adapter`),
            ...config.configuredLanguageServers.map(language => `${language} language server`)
        ].filter((entry): entry is string => Boolean(entry));
        return configured.length
            ? `${config.relativePath} is valid and configures ${configured.join(', ')}.`
            : `${config.relativePath} is valid; fill in adapter commands when this workspace needs local sidecars beyond PATH/env discovery.`;
    }

    protected recommendations(
        dotnet: CSharpDotnetInfo,
        csharpKitConfig: CSharpKitWorkspaceConfigStatus,
        roslyn: CSharpRoslynStatus,
        debugAdapter: CSharpDebugAdapterStatus,
        languageServers: CSharpLanguageServerAdapterStatus[],
        solutions: CSharpSolutionSummary[],
        projects: CSharpProjectSummary[],
        razorFileCount: number,
        globalJsons: CSharpGlobalJsonSummary[],
        editorConfigs: CSharpEditorConfigSummary[],
        globalConfigs: CSharpEditorConfigSummary[],
        toolManifests: CSharpDotnetToolManifestSummary[],
        runSettings: CSharpRunSettingsSummary[],
        nugetConfigs: CSharpNuGetConfigSummary[]
    ): string[] {
        const recommendations: string[] = [];
        if (!dotnet.available) {
            recommendations.push('Install a supported .NET SDK or configure dotnet on PATH.');
        }
        if (csharpKitConfig.state === 'invalid') {
            recommendations.push(`Review ${csharpKitConfig.relativePath}; C# Kit could not parse the workspace adapter/sidecar configuration${csharpKitConfig.error ? `: ${csharpKitConfig.error}` : '.'}`);
        }
        for (const globalJson of globalJsons.filter(candidate => candidate.error)) {
            recommendations.push(`Review ${globalJson.relativePath}; C# Kit could not parse this global.json file.`);
        }
        for (const globalJson of globalJsons.filter(candidate => candidate.sdkVersion && candidate.sdkInstalled === false)) {
            recommendations.push(`Install .NET SDK ${globalJson.sdkVersion} or update ${globalJson.relativePath}; this workspace pins an SDK version that dotnet --info did not report.`);
        }
        for (const globalJson of globalJsons.filter(candidate => candidate.testRunner && !this.isKnownDotnetTestRunner(candidate.testRunner))) {
            recommendations.push(`Review ${globalJson.relativePath}; ${globalJson.testRunner} is not a recognized dotnet test runner value.`);
        }
        for (const globalJson of globalJsons.filter(candidate =>
            this.isMicrosoftTestingPlatformRunner(candidate.testRunner)
            && this.sdkMajor(candidate.sdkVersion ?? dotnet.version) !== undefined
            && (this.sdkMajor(candidate.sdkVersion ?? dotnet.version) ?? 0) < 10
        )) {
            recommendations.push(`Review ${globalJson.relativePath}; Microsoft.Testing.Platform mode for dotnet test requires a .NET 10 SDK and Microsoft.Testing.Platform 1.7 or later.`);
        }
        if (projects.length && editorConfigs.length === 0 && globalConfigs.length === 0) {
            recommendations.push('Add a workspace .editorconfig or .globalconfig if this solution needs shared Roslyn analyzer severity, C# code-style or dotnet format settings.');
        }
        if (toolManifests.length) {
            recommendations.push('Run C# Kit: Generate Launch/Tasks to add a dotnet tool restore task for local .NET tools.');
        }
        if (!projects.length) {
            recommendations.push('Open a workspace that contains a .csproj, .sln, .slnx or .slnf file, or use C# Kit: New Project to create one.');
        }
        if (projects.length && csharpKitConfig.state === 'absent') {
            recommendations.push(`Run C# Kit: Generate Launch/Tasks to create ${CSHARP_KIT_CONFIG_RELATIVE_PATH} for workspace-local decoupled adapters and sidecars.`);
        }
        if (projects.length && roslyn.mode === 'build-required' && roslyn.buildCommand) {
            recommendations.push(`Build the Roslyn sidecar for semantic C# analysis: ${roslyn.buildCommand}`);
        }
        if (projects.length && roslyn.mode === 'configured-missing') {
            recommendations.push(`Fix ${ROSLYN_ANALYZER_PATH_ENV} or ${CSHARP_KIT_CONFIG_RELATIVE_PATH}; the configured Roslyn sidecar path does not exist.`);
        }
        if (projects.length && roslyn.mode === 'not-installed') {
            recommendations.push('Install @cybervinci/memory-roslyn with C# Kit to enable semantic Roslyn analysis.');
        }
        if (projects.length && debugAdapter.mode === 'missing') {
            recommendations.push(debugAdapter.setupHint);
        }
        if (projects.length && debugAdapter.mode === 'configured-missing') {
            recommendations.push(`Fix ${CSHARP_CORECLR_DEBUG_ADAPTER_ENV} or ${CSHARP_KIT_CONFIG_RELATIVE_PATH}; the configured CoreCLR debug adapter was not found.`);
        }
        if (projects.length && !languageServers.some(adapter => adapter.language === 'csharp' && adapter.mode === 'ready')) {
            recommendations.push(`Configure a decoupled C# language server with ${CSHARP_LSP_COMMAND_ENV}, ${CSHARP_KIT_CONFIG_RELATIVE_PATH}, a workspace dotnet tool manifest that declares csharp-ls, or csharp-ls/OmniSharp on PATH for full LSP editing.`);
            recommendations.push('Run C# Kit: Generate Launch/Tasks, then run C# Kit: install csharp-ls local tool to bootstrap a workspace-local C# language-server adapter.');
        }
        if (!solutions.length && projects.length > 1) {
            recommendations.push('Create or open a solution file so project relationships behave like Visual Studio Solution Explorer.');
        }
        if (projects.some(project => project.isAspNetCore && project.launchProfiles.length === 0)) {
            recommendations.push('Generate launch.json/tasks.json for ASP.NET Core projects to enable F5 and serverReadyAction.');
        }
        if (projects.some(project => project.isAspNetCore && !project.userSecretsId)) {
            recommendations.push('Initialize user secrets for ASP.NET Core projects that need local secrets, then use C# Kit set/list/remove secret commands.');
        }
        if (projects.some(project => project.isTestProject)) {
            recommendations.push('Refresh Test Explorer to discover C# tests, or use C# Kit: Discover Tests for the panel view.');
            if (runSettings.length) {
                recommendations.push('Use generated C# Kit test tasks with .runsettings files when this workspace needs data collectors, run parameters or MSTest settings.');
            }
        }
        if (projects.some(project => this.hasEntityFrameworkCoreReference(project))) {
            recommendations.push('Use C# Kit EF Core commands for migrations/database updates; install dotnet-ef as a global or local tool if the CLI command is not available.');
            if (toolManifests.length && !this.hasDotnetLocalTool(toolManifests, 'dotnet-ef')) {
                recommendations.push('Add dotnet-ef to a workspace dotnet-tools.json manifest when this workspace expects EF Core migrations to use restored local tools.');
            }
        }
        if (razorFileCount > 0) {
            recommendations.push('Use the Razor Visual Editor feature for visual .cshtml editing; C# Kit keeps Razor directives, routes, import context and component tags in the .NET workspace inventory.');
        }
        if (razorFileCount > 0 && !languageServers.some(adapter => adapter.language === 'razor' && adapter.mode === 'ready')) {
            recommendations.push(`Configure a Razor language server with ${RAZOR_LSP_COMMAND_ENV}, ${CSHARP_KIT_CONFIG_RELATIVE_PATH}, a workspace dotnet tool manifest that declares rzls/razor-ls, or PATH for full Razor LSP completion/diagnostics beyond the structural inventory.`);
        }
        if (nugetConfigs.length && this.enabledNuGetSourceCount(nugetConfigs) === 0 && nugetConfigs.some(config => config.clearPackageSources || config.packageSources.length)) {
            recommendations.push('Review NuGet.config; no enabled package sources were detected in workspace-level config files.');
        }
        return recommendations;
    }

    protected launchConfigurations(workspacePath: string, project: CSharpProjectSummary, baseName: string): Record<string, unknown>[] {
        const configurations = [this.launchConfiguration(workspacePath, project, baseName)];
        for (const profile of this.debugLaunchProfiles(project)) {
            configurations.push(this.launchConfiguration(workspacePath, project, `${baseName} (${profile.name})`, profile));
        }
        return configurations;
    }

    protected launchConfiguration(
        workspacePath: string,
        project: CSharpProjectSummary,
        name: string,
        profile?: CSharpLaunchProfile
    ): Record<string, unknown> {
        const projectDir = path.dirname(project.path);
        const relativeProjectDir = this.relativeForVsCode(workspacePath, projectDir);
        const targetFramework = project.targetFrameworks[0] ?? 'net9.0';
        const program = ['${workspaceFolder}', relativeProjectDir, 'bin', 'Debug', targetFramework, `${project.assemblyName}.dll`]
            .filter(Boolean)
            .join('/');
        const configuration: Record<string, unknown> = {
            name,
            type: 'coreclr',
            request: 'launch',
            preLaunchTask: `C# Kit: build ${project.name}`,
            program: this.launchProgram(workspacePath, project, program, profile),
            args: this.launchProfileArgs(profile),
            cwd: this.launchWorkingDirectory(workspacePath, project, relativeProjectDir, profile),
            console: 'integratedTerminal',
            stopAtEntry: false,
            env: this.launchEnvironment(project, profile)
        };
        if (profile) {
            configuration.launchProfile = profile.name;
            configuration.launchSettingsProfile = profile.name;
        }
        if (profile?.hotReloadEnabled !== undefined) {
            configuration.hotReloadEnabled = profile.hotReloadEnabled;
        }
        if (profile?.nativeDebugging !== undefined) {
            configuration.nativeDebugging = profile.nativeDebugging;
        }
        if (profile?.inspectUri) {
            configuration.inspectUri = profile.inspectUri;
        }
        if ((project.isAspNetCore || profile?.applicationUrl || profile?.browserUrl) && profile?.launchBrowser !== false) {
            configuration.serverReadyAction = {
                action: 'openExternally',
                pattern: '\\bNow listening on:\\s+(https?://\\S+)',
                uriFormat: this.launchUriFormat(profile)
            };
        }
        return configuration;
    }

    protected async taskConfigurations(workspacePath: string, project: CSharpProjectSummary): Promise<Record<string, unknown>[]> {
        const projectPath = this.relativeForVsCode(workspacePath, project.path);
        const workspaceFiles = await this.findWorkspaceFiles(workspacePath);
        const toolManifests = await this.readDotnetToolManifests(workspacePath, workspaceFiles.toolManifests);
        const runSettings = await this.readRunSettings(workspacePath, workspaceFiles.runSettings);
        const testRunner = await this.dotnetTestRunnerForTarget(workspacePath, project.path);
        const tasks = [
            this.dotnetTask(`C# Kit: restore ${project.name}`, ['restore', projectPath], 'build'),
            this.dotnetTask(`C# Kit: build ${project.name}`, ['build', projectPath, '/property:GenerateFullPaths=true', '/consoleloggerparameters:NoSummary'], 'build', '$msCompile'),
            this.dotnetTask(`C# Kit: clean ${project.name}`, ['clean', projectPath]),
            this.dotnetTask(`C# Kit: rebuild ${project.name}`, ['msbuild', projectPath, '/t:Rebuild', '/property:GenerateFullPaths=true', '/consoleloggerparameters:NoSummary'], 'build', '$msCompile'),
            this.dotnetTask(`C# Kit: format ${project.name}`, ['format', projectPath]),
            this.dotnetTask(`C# Kit: publish ${project.name}`, ['publish', projectPath, '--configuration', 'Release', '/property:GenerateFullPaths=true', '/consoleloggerparameters:NoSummary'], 'build', '$msCompile'),
            this.dotnetTask(`C# Kit: test ${project.name}`, [
                ...this.dotnetTestTargetArgs(projectPath, 'project', testRunner),
                ...this.dotnetTestConsoleArgs(testRunner)
            ], 'test', '$msCompile'),
            this.dotnetTask(`C# Kit: run ${project.name}`, ['run', '--project', projectPath], undefined, '$msCompile'),
            this.dotnetTask(`C# Kit: watch ${project.name}`, ['watch', '--project', projectPath, 'run'], undefined, '$msCompile')
        ];
        if (workspaceFiles.toolManifests.length) {
            tasks.unshift(this.dotnetTask('C# Kit: tool restore', ['tool', 'restore'], 'build'));
        }
        if (!this.hasDotnetLocalTool(toolManifests, 'csharp-ls')) {
            tasks.unshift(this.dotnetTask('C# Kit: install csharp-ls local tool', ['tool', 'install', 'csharp-ls', '--create-manifest-if-needed'], 'build'));
        }
        for (const settings of runSettings) {
            tasks.push(this.dotnetTask(
                `C# Kit: test ${project.name} (${settings.name})`,
                [
                    ...this.dotnetTestTargetArgs(projectPath, 'project', testRunner),
                    '--settings',
                    this.relativeForVsCode(workspacePath, settings.path),
                    ...this.dotnetTestConsoleArgs(testRunner)
                ],
                'test',
                '$msCompile'
            ));
        }
        for (const profile of project.publishProfiles) {
            tasks.push(this.dotnetTask(
                `C# Kit: publish ${project.name} (${profile.name})`,
                ['publish', projectPath, `/p:PublishProfile=${profile.name}`, '/property:GenerateFullPaths=true', '/consoleloggerparameters:NoSummary'],
                'build',
                '$msCompile'
            ));
        }
        if (project.isAspNetCore) {
            tasks.push(
                this.dotnetTask(`C# Kit: user-secrets init ${project.name}`, ['user-secrets', 'init', '--project', projectPath]),
                this.dotnetTask(`C# Kit: user-secrets list ${project.name}`, ['user-secrets', 'list', '--project', projectPath]),
                this.dotnetTask('C# Kit: dev-certs https trust', ['dev-certs', 'https', '--trust'])
            );
        }
        if (this.hasEntityFrameworkCoreReference(project)) {
            const migrationInputId = this.efMigrationInputId(project);
            tasks.push(
                this.dotnetTask(`C# Kit: ef migrations list ${project.name}`, ['ef', 'migrations', 'list', '--project', projectPath]),
                this.dotnetTask(`C# Kit: ef migrations add ${project.name}`, ['ef', 'migrations', 'add', `\${input:${migrationInputId}}`, '--project', projectPath]),
                this.dotnetTask(`C# Kit: ef database update ${project.name}`, ['ef', 'database', 'update', '--project', projectPath])
            );
        }
        for (const profile of this.projectLaunchProfiles(project)) {
            tasks.push(
                this.dotnetTask(`C# Kit: run ${project.name} (${profile.name})`, ['run', '--project', projectPath, '--launch-profile', profile.name], undefined, '$msCompile'),
                this.dotnetTask(`C# Kit: watch ${project.name} (${profile.name})`, ['watch', '--project', projectPath, 'run', '--launch-profile', profile.name], undefined, '$msCompile')
            );
        }
        tasks.push(...await this.solutionTaskConfigurations(workspacePath, project.path));
        return tasks;
    }

    protected taskInputs(project: CSharpProjectSummary): Record<string, unknown>[] {
        if (!this.hasEntityFrameworkCoreReference(project)) {
            return [];
        }
        return [{
            id: this.efMigrationInputId(project),
            type: 'promptString',
            description: `EF Core migration name for ${project.name}`,
            default: 'InitialCreate'
        }];
    }

    protected hasEntityFrameworkCoreReference(project: CSharpProjectSummary): boolean {
        return project.packageReferences.some(reference => /^Microsoft\.EntityFrameworkCore(?:\.|$)/i.test(reference.id));
    }

    protected efMigrationInputId(project: CSharpProjectSummary): string {
        return `csharpKit.efMigrationName.${project.name.replace(/[^A-Za-z0-9_.-]+/g, '-')}`;
    }

    protected async solutionTaskConfigurations(workspacePath: string, projectPath: string): Promise<Record<string, unknown>[]> {
        const files = await this.findWorkspaceFiles(workspacePath);
        if (!files.solutions.length) {
            return [];
        }
        const solutions = await Promise.all(files.solutions.map(solutionPath => this.readSolution(solutionPath)));
        const runSettings = await this.readRunSettings(workspacePath, files.runSettings);
        const tasks: Record<string, unknown>[] = [];
        for (const solution of solutions.filter(candidate => candidate.projectPaths.some(solutionProjectPath => this.samePath(solutionProjectPath, projectPath)))) {
            const solutionPath = this.relativeForVsCode(workspacePath, solution.path);
            tasks.push(
                this.dotnetTask(`C# Kit: restore ${solution.name}`, this.solutionRestoreArgs(solution, solutionPath), 'build'),
                this.dotnetTask(`C# Kit: build ${solution.name}`, this.solutionBuildArgs(solution, solutionPath), 'build', '$msCompile'),
                this.dotnetTask(`C# Kit: clean ${solution.name}`, this.solutionCleanArgs(solution, solutionPath)),
                this.dotnetTask(`C# Kit: rebuild ${solution.name}`, ['msbuild', solutionPath, '/t:Rebuild', '/property:GenerateFullPaths=true', '/consoleloggerparameters:NoSummary'], 'build', '$msCompile')
            );
            if (solution.format !== 'slnf') {
                const testRunner = await this.dotnetTestRunnerForTarget(workspacePath, solution.path);
                tasks.push(
                    this.dotnetTask(`C# Kit: format ${solution.name}`, ['format', solutionPath]),
                    this.dotnetTask(`C# Kit: test ${solution.name}`, [
                        ...this.dotnetTestTargetArgs(solutionPath, 'solution', testRunner),
                        ...this.dotnetTestConsoleArgs(testRunner)
                    ], 'test', '$msCompile')
                );
                for (const settings of runSettings) {
                    tasks.push(this.dotnetTask(
                        `C# Kit: test ${solution.name} (${settings.name})`,
                        [
                            ...this.dotnetTestTargetArgs(solutionPath, 'solution', testRunner),
                            '--settings',
                            this.relativeForVsCode(workspacePath, settings.path),
                            ...this.dotnetTestConsoleArgs(testRunner)
                        ],
                        'test',
                        '$msCompile'
                    ));
                }
            }
        }
        return tasks;
    }

    protected solutionRestoreArgs(solution: CSharpSolutionSummary, solutionPath: string): string[] {
        return solution.format === 'slnf' ? ['msbuild', solutionPath, '/t:Restore'] : ['restore', solutionPath];
    }

    protected solutionBuildArgs(solution: CSharpSolutionSummary, solutionPath: string): string[] {
        return solution.format === 'slnf'
            ? ['msbuild', solutionPath, '/property:GenerateFullPaths=true', '/consoleloggerparameters:NoSummary']
            : ['build', solutionPath, '/property:GenerateFullPaths=true', '/consoleloggerparameters:NoSummary'];
    }

    protected solutionCleanArgs(solution: CSharpSolutionSummary, solutionPath: string): string[] {
        return solution.format === 'slnf' ? ['msbuild', solutionPath, '/t:Clean'] : ['clean', solutionPath];
    }

    protected dotnetTask(label: string, args: string[], group?: 'build' | 'test', problemMatcher?: string): Record<string, unknown> {
        const task: Record<string, unknown> = {
            label,
            type: 'shell',
            command: 'dotnet',
            args,
            options: {
                cwd: '${workspaceFolder}'
            },
            presentation: {
                reveal: 'always',
                panel: 'dedicated',
                clear: true
            }
        };
        if (group) {
            task.group = {
                kind: group,
                isDefault: true
            };
        }
        if (problemMatcher) {
            task.problemMatcher = problemMatcher;
        }
        return task;
    }

    protected launchEnvironment(project: CSharpProjectSummary, profile?: CSharpLaunchProfile): Record<string, string> {
        const aspNetProfile = profile ?? project.launchProfiles.find(candidate => candidate.commandName === 'Project') ?? project.launchProfiles[0];
        return {
            ASPNETCORE_ENVIRONMENT: 'Development',
            ...(aspNetProfile?.applicationUrl ? { ASPNETCORE_URLS: aspNetProfile.applicationUrl } : {}),
            ...(aspNetProfile?.environmentVariables ?? {})
        };
    }

    protected projectLaunchProfiles(project: CSharpProjectSummary): CSharpLaunchProfile[] {
        return project.launchProfiles.filter(profile => !profile.commandName || profile.commandName === 'Project');
    }

    protected debugLaunchProfiles(project: CSharpProjectSummary): CSharpLaunchProfile[] {
        return project.launchProfiles.filter(profile => this.isProjectLaunchProfile(profile) || this.isExecutableLaunchProfile(profile));
    }

    protected isProjectLaunchProfile(profile: CSharpLaunchProfile): boolean {
        return !profile.commandName || profile.commandName === 'Project';
    }

    protected isExecutableLaunchProfile(profile: CSharpLaunchProfile): boolean {
        return profile.commandName === 'Executable' && !!profile.executablePath;
    }

    protected launchProgram(
        workspacePath: string,
        project: CSharpProjectSummary,
        defaultProgram: string,
        profile?: CSharpLaunchProfile
    ): string {
        if (profile?.executablePath) {
            return this.launchPath(workspacePath, project, profile.executablePath);
        }
        return defaultProgram;
    }

    protected launchWorkingDirectory(
        workspacePath: string,
        project: CSharpProjectSummary,
        relativeProjectDir: string,
        profile?: CSharpLaunchProfile
    ): string {
        if (profile?.workingDirectory) {
            return this.launchPath(workspacePath, project, profile.workingDirectory);
        }
        return ['${workspaceFolder}', relativeProjectDir].filter(Boolean).join('/');
    }

    protected launchPath(workspacePath: string, project: CSharpProjectSummary, inputPath: string): string {
        if (path.isAbsolute(inputPath)) {
            return inputPath;
        }
        const projectRelative = path.relative(workspacePath, path.resolve(path.dirname(project.path), inputPath)).replace(/\\/g, '/');
        return ['${workspaceFolder}', projectRelative].filter(Boolean).join('/');
    }

    protected launchProfileArgs(profile: CSharpLaunchProfile | undefined): string[] {
        return profile?.commandLineArgs ? this.splitCommandLine(profile.commandLineArgs) : [];
    }

    protected launchUriFormat(profile: CSharpLaunchProfile | undefined): string {
        if (!profile) {
            return '%s';
        }
        if (profile.browserUrl) {
            return profile.browserUrl;
        }
        const launchUrl = profile.launchUrl?.replace(/^\/+/, '');
        if (!launchUrl) {
            return '%s';
        }
        if (/^https?:\/\//i.test(launchUrl)) {
            return launchUrl;
        }
        return `%s/${launchUrl}`;
    }

    protected splitCommandLine(value: string): string[] {
        const result: string[] = [];
        const regex = /"([^"]*)"|'([^']*)'|(\S+)/g;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(value))) {
            result.push(match[1] ?? match[2] ?? match[3]);
        }
        return result;
    }

    protected async upsertJsonArrayFile(
        filePath: string,
        propertyName: string,
        entries: Record<string, unknown> | Record<string, unknown>[],
        identityProperty: string,
        overwrite: boolean
    ): Promise<boolean> {
        const nextEntries = Array.isArray(entries) ? entries : [entries];
        const current = await this.readJsonObject(filePath);
        if (!current.version) {
            current.version = propertyName === 'tasks' ? '2.0.0' : '0.2.0';
        }
        const list = Array.isArray(current[propertyName]) ? current[propertyName] as Record<string, unknown>[] : [];
        let changed = false;
        for (const entry of nextEntries) {
            const identity = entry[identityProperty];
            const index = list.findIndex(item => item[identityProperty] === identity);
            if (index >= 0) {
                if (overwrite) {
                    list[index] = entry;
                    changed = true;
                }
            } else {
                list.push(entry);
                changed = true;
            }
        }
        current[propertyName] = list;
        if (changed || !fs.existsSync(filePath)) {
            await fsp.writeFile(filePath, `${JSON.stringify(current, undefined, 4)}\n`, 'utf8');
            return true;
        }
        return false;
    }

    protected async writeCSharpKitConfigTemplate(filePath: string): Promise<boolean> {
        if (fs.existsSync(filePath)) {
            return false;
        }
        const template = createCSharpKitConfigTemplate();
        await fsp.writeFile(filePath, `${JSON.stringify(template, undefined, 4)}\n`, 'utf8');
        return true;
    }

    protected async readJsonObject(filePath: string): Promise<Record<string, unknown>> {
        try {
            const text = await fsp.readFile(filePath, 'utf8');
            const parsed = JSON.parse(text);
            return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed : {};
        } catch {
            return {};
        }
    }

    protected async runDotnet(cwd: string, args: string[], timeoutMs = DOTNET_TIMEOUT_MS): Promise<CSharpCommandResult> {
        return this.runExecutable('dotnet', args, cwd, timeoutMs);
    }

    protected async createTestResultsDirectory(): Promise<string> {
        return fsp.mkdtemp(path.join(os.tmpdir(), 'cv-csharp-kit-trx-'));
    }

    protected resolveTestResultsDirectory(inputPath: string): string {
        const resolved = path.resolve(inputPath);
        const tempRoot = path.resolve(os.tmpdir());
        const relative = path.relative(tempRoot, resolved);
        if (relative.startsWith('..') || path.isAbsolute(relative) || !path.basename(resolved).startsWith('cv-csharp-kit-trx-')) {
            throw new Error(`Refusing to read test results outside a C# Kit temporary result directory: ${inputPath}`);
        }
        return resolved;
    }

    protected async readTrxTestResults(
        directoryPath: string,
        projectPath: string,
        commandResult: CSharpCommandResult
    ): Promise<CSharpTestResult[]> {
        const trxFiles: string[] = [];
        await this.collectFilesByExtension(directoryPath, '.trx', trxFiles, 4);
        if (!trxFiles.length) {
            return [];
        }
        const latest = await this.latestFileByModifiedTime(trxFiles);
        if (!latest) {
            return [];
        }
        const trxXml = await fsp.readFile(latest, 'utf8');
        return parseDotnetTestTrx(trxXml, projectPath, commandResult.stdout, commandResult.stderr, commandResult.exitCode);
    }

    protected async latestFileByModifiedTime(filePaths: string[]): Promise<string | undefined> {
        const stats = await Promise.all(filePaths.map(async filePath => {
            try {
                return { filePath, mtimeMs: (await fsp.stat(filePath)).mtimeMs };
            } catch {
                return undefined;
            }
        }));
        return stats
            .filter((entry): entry is { filePath: string; mtimeMs: number } => !!entry)
            .sort((left, right) => right.mtimeMs - left.mtimeMs || right.filePath.localeCompare(left.filePath))[0]?.filePath;
    }

    protected testOutcome(result: CSharpCommandResult, output: string): CSharpTestOutcome {
        if (/No test matches the given testcase filter/i.test(output) || /No test is available/i.test(output)) {
            return 'skipped';
        }
        if (result.ok) {
            return 'passed';
        }
        if (/Test Run Failed/i.test(output) || /Failed!|Failed:/i.test(output)) {
            return 'failed';
        }
        return 'errored';
    }

    protected resolveDiagnosticPaths(workspacePath: string, diagnostic: CSharpDiagnostic, fallbackProjectPath?: string): CSharpDiagnostic {
        return {
            ...diagnostic,
            path: this.resolveDiagnosticPath(workspacePath, diagnostic.path, fallbackProjectPath),
            projectPath: diagnostic.projectPath
                ? this.resolveDiagnosticPath(workspacePath, diagnostic.projectPath, fallbackProjectPath)
                : fallbackProjectPath
        };
    }

    protected resolveDiagnosticPath(workspacePath: string, inputPath: string, fallbackProjectPath?: string): string {
        const trimmed = inputPath.trim();
        if (!trimmed || /^[A-Za-z]+$/.test(trimmed)) {
            return fallbackProjectPath ?? workspacePath;
        }
        return path.isAbsolute(trimmed) ? path.resolve(trimmed) : path.resolve(workspacePath, trimmed);
    }

    protected parseNuGetSearchPackages(rawOutput: string): CSharpNuGetSearchPackage[] {
        const parsed = JSON.parse(rawOutput) as { data?: Array<Record<string, unknown>> };
        const packages = Array.isArray(parsed.data) ? parsed.data : [];
        return packages.map(item => ({
            id: String(item.id ?? ''),
            version: String(item.version ?? ''),
            description: typeof item.description === 'string' ? item.description : undefined,
            authors: Array.isArray(item.authors) ? item.authors.map(author => String(author)) : undefined,
            totalDownloads: typeof item.totalDownloads === 'number' ? item.totalDownloads : undefined,
            verified: typeof item.verified === 'boolean' ? item.verified : undefined,
            projectUrl: typeof item.projectUrl === 'string' ? item.projectUrl : undefined,
            iconUrl: typeof item.iconUrl === 'string' ? item.iconUrl : undefined,
            source: NUGET_SEARCH_URL
        })).filter(item => item.id && item.version);
    }

    protected fetchNuGetSearch(url: URL): Promise<string> {
        return new Promise((resolve, reject) => {
            const request = https.get(url, {
                timeout: NUGET_SEARCH_TIMEOUT_MS,
                headers: {
                    'User-Agent': 'CyberVinci-CSharp-Kit'
                }
            }, response => {
                const chunks: Buffer[] = [];
                response.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
                response.on('end', () => {
                    const body = Buffer.concat(chunks).toString('utf8');
                    if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) {
                        resolve(body);
                    } else {
                        reject(new Error(`NuGet search failed with HTTP ${response.statusCode ?? 'unknown'}: ${body.slice(0, 500)}`));
                    }
                });
            });
            request.on('timeout', () => {
                request.destroy(new Error('NuGet search timed out.'));
            });
            request.on('error', reject);
        });
    }

    protected async runExecutable(command: string, args: string[], cwd: string, timeoutMs: number): Promise<CSharpCommandResult> {
        const startedAt = Date.now();
        try {
            const { stdout, stderr } = await execFileAsync(command, args, {
                cwd,
                windowsHide: true,
                timeout: timeoutMs,
                maxBuffer: DOTNET_MAX_BUFFER
            });
            return {
                ok: true,
                command: [command, ...args].join(' '),
                cwd,
                stdout,
                stderr,
                exitCode: 0,
                durationMs: Date.now() - startedAt
            };
        } catch (error) {
            const execError = error as ExecFileException & { stdout?: string; stderr?: string };
            return {
                ok: false,
                command: [command, ...args].join(' '),
                cwd,
                stdout: execError.stdout ?? '',
                stderr: execError.stderr ?? execError.message,
                exitCode: typeof execError.code === 'number' ? execError.code : undefined,
                durationMs: Date.now() - startedAt
            };
        }
    }

    protected resolveExistingDirectory(inputPath: string): string {
        const resolved = path.resolve(inputPath);
        if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
            throw new Error(`Workspace path does not exist: ${inputPath}`);
        }
        return resolved;
    }

    protected resolveInsideWorkspace(workspacePath: string, inputPath: string): string {
        const resolved = path.isAbsolute(inputPath) ? path.resolve(inputPath) : path.resolve(workspacePath, inputPath);
        const relative = path.relative(workspacePath, resolved);
        if (relative.startsWith('..') || path.isAbsolute(relative)) {
            throw new Error(`Path is outside the workspace: ${inputPath}`);
        }
        return resolved;
    }

    protected filePathFromUri(uri: string): string {
        return /^file:/i.test(uri) ? fileURLToPath(uri) : uri;
    }

    protected resolveInsideProject(projectDirectory: string, inputPath: string): string {
        const resolved = path.isAbsolute(inputPath) ? path.resolve(inputPath) : path.resolve(projectDirectory, inputPath);
        const relative = path.relative(projectDirectory, resolved);
        if (relative.startsWith('..') || path.isAbsolute(relative)) {
            throw new Error(`Path is outside the project directory: ${inputPath}`);
        }
        return resolved;
    }

    protected isInsideOrEqual(parentDirectory: string, candidatePath: string): boolean {
        const relative = path.relative(path.resolve(parentDirectory), path.resolve(candidatePath));
        return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
    }

    protected samePath(left: string, right: string): boolean {
        const resolvedLeft = path.resolve(left);
        const resolvedRight = path.resolve(right);
        return process.platform === 'win32'
            ? resolvedLeft.toLowerCase() === resolvedRight.toLowerCase()
            : resolvedLeft === resolvedRight;
    }

    protected relativeForVsCode(workspacePath: string, targetPath: string): string {
        const relative = path.relative(workspacePath, targetPath).replace(/\\/g, '/');
        return relative === '.' ? '' : relative;
    }
}

function sortPaths(values: string[]): string[] {
    return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function uniqueStrings(values: string[]): string[] {
    return [...new Set(values.filter(Boolean))];
}

function uniqueResolvedPaths(values: string[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const value of values) {
        const normalized = normalizePathKey(value);
        if (!seen.has(normalized)) {
            seen.add(normalized);
            result.push(value);
        }
    }
    return result;
}

function normalizePathKey(value: string): string {
    const normalized = path.resolve(value);
    return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

function decodeXml(value: string): string {
    return value
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
}

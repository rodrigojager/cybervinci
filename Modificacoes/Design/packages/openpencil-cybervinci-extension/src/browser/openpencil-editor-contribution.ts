import URI from '@theia/core/lib/common/uri';
import { Command, CommandContribution, CommandRegistry, DisposableCollection, MenuContribution, MenuModelRegistry, MessageService, ProgressService, UriSelection } from '@theia/core/lib/common';
import { FileUri } from '@theia/core/lib/common/file-uri';
import {
    codicon,
    CommonMenus,
    FrontendApplicationContribution,
    KeybindingContribution,
    KeybindingRegistry,
    NavigatableWidgetOpenHandler,
    open,
    OpenerService,
    OpenWithService,
    QuickInputService,
    WebSocketConnectionProvider
} from '@theia/core/lib/browser';
import { LabelProviderContribution, URIIconReference } from '@theia/core/lib/browser/label-provider';
import { UriAwareCommandHandler } from '@theia/core/lib/common/uri-command-handler';
import { SelectionService } from '@theia/core/lib/common/selection-service';
import { EditorManager } from '@theia/editor/lib/browser';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { FileDialogService } from '@theia/filesystem/lib/browser/file-dialog/file-dialog-service';
import { inject, injectable, optional } from '@theia/core/shared/inversify';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { BinaryBuffer } from '@theia/core/lib/common/buffer';
import { EnvVariablesServer } from '@theia/core/lib/common/env-variables';
import {
    CyberVinciAiExecutionSelection,
    CyberVinciAiModelMetadata,
    CyberVinciAiProviderDescriptor,
    CyberVinciAiRuntimeService
} from '@cybervinci/ai-runtime/lib/common';
import { cybervinciCanvasCommandLabel, cybervinciCanvasProductLabel, CYBERVINCI_MENU_ITEMS, CyberVinciMenus } from '@cybervinci/branding/lib/common';
import { OPENPENCIL_BACKEND_PATH, OpenPencilBackendService, OpenPencilBridgeOperationResult } from '../common/openpencil-protocol';
import { OpenPencilDocumentService } from '../common/openpencil-document-service';
import { OPENPENCIL_FILE_EXTENSION, OpenPencilDesignOperation, OpenPencilDocument, OpenPencilNode, OpenPencilStructuredCommandInput } from '../common/openpencil-types';
import { OpenPencilTemplateService } from '../common/openpencil-template-service';
import { createOpenPencilAiReviewModel, OpenPencilAiReviewModel } from './openpencil-ai-review-model';
import { OpenPencilAiReviewService } from './openpencil-ai-review-widget';
import { OpenPencilAiDesignRequest, OpenPencilAiDesignResult, OpenPencilAiImagePolicy, OpenPencilApplyOperationsOptions, OpenPencilDesignCommandService } from './openpencil-design-command-service';
import { OpenPencilAiPromptDialogAnchorRect, OpenPencilAiPromptDialogResult, OpenPencilAiPromptProviderState, OpenPencilAiVisualReferencePolicy, openOpenPencilAiPromptDialog } from './openpencil-ai-prompt-dialog';
import { OpenPencilAiStatus, OpenPencilEditorWidget, OpenPencilProgressiveApplyResult } from './openpencil-editor-widget';

export namespace OpenPencilCommands {
    export const NEW_DESIGN: Command = {
        id: 'openpencil.newDesign',
        label: cybervinciCanvasCommandLabel('New Design'),
        iconClass: codicon('new-file')
    };
    export const IMPORT_FIGMA_JSON: Command = {
        id: 'openpencil.importFigmaJson',
        label: cybervinciCanvasCommandLabel('Import Figma JSON'),
        iconClass: codicon('file-submodule')
    };
    export const FOCUS_EDITOR: Command = {
        id: 'openpencil.focusEditor',
        label: cybervinciCanvasCommandLabel('Focus Visual Editor'),
        iconClass: codicon('symbol-color')
    };
    export const OPEN_VISUAL_EDITOR: Command = {
        id: 'openpencil.openVisualEditor',
        label: cybervinciCanvasCommandLabel('Open Visual Editor'),
        iconClass: codicon('symbol-color')
    };
    export const OPEN_AS_JSON: Command = {
        id: 'openpencil.openAsJson',
        label: cybervinciCanvasCommandLabel('Open as JSON'),
        iconClass: codicon('json')
    };
    export const EXPORT_SELECTION: Command = {
        id: 'openpencil.exportSelectionToCode',
        label: cybervinciCanvasCommandLabel('Export Selection to Code'),
        iconClass: codicon('export')
    };
    export const EXPORT_DOCUMENT: Command = {
        id: 'openpencil.exportDocumentToCode',
        label: cybervinciCanvasCommandLabel('Export Document to Code'),
        iconClass: codicon('file-code')
    };
    export const EXPORT_SVG: Command = {
        id: 'openpencil.exportDocumentToSvg',
        label: cybervinciCanvasCommandLabel('Export Document to SVG'),
        iconClass: codicon('file-media')
    };
    export const CREATE_UI_KIT: Command = {
        id: 'openpencil.createUIKit',
        label: cybervinciCanvasCommandLabel('Create UI Kit'),
        iconClass: codicon('new-file')
    };
    export const EXPORT_UI_KIT: Command = {
        id: 'openpencil.exportUIKit',
        label: cybervinciCanvasCommandLabel('Export UI Kit'),
        iconClass: codicon('symbol-structure')
    };
    export const GENERATE_WITH_AI: Command = {
        id: 'openpencil.generateWithAi',
        label: cybervinciCanvasCommandLabel('Generate with AI'),
        iconClass: codicon('sparkle')
    };
    export const PROMPT_TO_DESIGN: Command = {
        id: 'openpencil.promptToDesign',
        label: cybervinciCanvasCommandLabel('Prompt to Design'),
        iconClass: codicon('sparkle')
    };
    export const CONTINUE_DESIGN_WITH_AI: Command = {
        id: 'openpencil.continueDesignWithAi',
        label: cybervinciCanvasCommandLabel('Continue Design with AI'),
        iconClass: codicon('sparkle')
    };
    export const EDIT_SELECTED_NODE_WITH_AI: Command = {
        id: 'openpencil.editSelectedNodeWithAi',
        label: cybervinciCanvasCommandLabel('Edit Selected Node with AI'),
        iconClass: codicon('sparkle')
    };
    export const APPLY_STRUCTURED_COMMAND: Command = {
        id: 'openpencil.applyStructuredCommand',
        label: cybervinciCanvasCommandLabel('Apply Structured Command'),
        iconClass: codicon('terminal')
    };
    export const APPLY_AI_EDIT_JSON: Command = {
        id: 'openpencil.applyAiEditJson',
        label: cybervinciCanvasCommandLabel('Apply AI Edit JSON'),
        iconClass: codicon('sparkle')
    };
    export const PREVIEW_AI_EDIT_SUMMARY: Command = {
        id: 'openpencil.previewAiEditSummary',
        label: cybervinciCanvasCommandLabel('Preview AI Edit Summary'),
        iconClass: codicon('preview')
    };
    export const SHOW_DOCUMENT_SUMMARY: Command = {
        id: 'openpencil.showDocumentSummary',
        label: cybervinciCanvasCommandLabel('Show Document Summary'),
        iconClass: codicon('list-tree')
    };
    export const CREATE_COMMAND_FILE: Command = {
        id: 'openpencil.createCommandFile',
        label: cybervinciCanvasCommandLabel('Create Command File'),
        iconClass: codicon('new-file')
    };
    export const CREATE_AI_EDIT_COMMAND_FILE: Command = {
        id: 'openpencil.createAiEditCommandFile',
        label: cybervinciCanvasCommandLabel('Create AI Edit Command File'),
        iconClass: codicon('new-file')
    };
    export const APPLY_COMMAND_FILE: Command = {
        id: 'openpencil.applyCommandFile',
        label: cybervinciCanvasCommandLabel('Apply Commands from File'),
        iconClass: codicon('run')
    };
    export const SHOW_BACKEND_STATUS: Command = {
        id: 'openpencil.showBackendStatus',
        label: cybervinciCanvasCommandLabel('Show Bridge Status'),
        iconClass: codicon('pulse')
    };
    export const LIST_CODEGEN_TARGETS: Command = {
        id: 'openpencil.listCodegenTargets',
        label: cybervinciCanvasCommandLabel('List Codegen Targets'),
        iconClass: codicon('symbol-enum')
    };
    export const LIST_MCP_TOOLS: Command = {
        id: 'openpencil.listMcpTools',
        label: cybervinciCanvasCommandLabel('List MCP-Compatible Tools'),
        iconClass: codicon('tools')
    };
    export const LIST_CLI_COMMANDS: Command = {
        id: 'openpencil.listCliCommands',
        label: cybervinciCanvasCommandLabel('List CLI-Compatible Commands'),
        iconClass: codicon('terminal')
    };
}

export namespace OpenPencilMenus {
    export const CYBERVINCI = CyberVinciMenus.CYBERVINCI;
    export const OPENPENCIL = CyberVinciMenus.OPENPENCIL;
    export const FILE_NAVIGATOR = ['navigator-context-menu', 'navigation', 'openpencil'];
}

const OPENPENCIL_AI_AUTO_APPLY_KEY = 'openpencil.ai.autoApply';
const OPENPENCIL_AI_INCREMENTAL_KEY = 'openpencil.ai.incremental';
const OPENPENCIL_AI_PROVIDER_STREAMING_KEY = 'openpencil.ai.providerStreaming';
const CYBERVINCI_CANVAS_AI_DEBUG_STORAGE_KEY = 'cybervinci.canvasAiDebug';
const OPENPENCIL_AI_PROVIDER_STATE_CACHE_KEY = 'openpencil.aiProviderStateCache.v1';
const OPENPENCIL_AI_PROVIDER_STATE_CACHE_MAX_AGE_MS = 12 * 60 * 60 * 1000;
const OPENPENCIL_AI_PROGRESSIVE_APPLY_DELAY_MS = 80;
const OPENPENCIL_AI_PROGRESSIVE_MAX_BATCH_SIZE = 4;
const OPENPENCIL_AI_COMPLETENESS_MAX_STREAMING_PASSES = 8;
const OPENPENCIL_AI_COMPLETENESS_MAX_BATCH_PASSES = 5;
const OPENPENCIL_AI_COMPLETENESS_MIN_SCORE_GAIN = 0.035;

type OpenPencilProgressHandle = Awaited<ReturnType<ProgressService['showProgress']>>;

type OpenPencilAiCompletenessIntent = 'reference' | 'page' | 'screen' | 'component' | 'edit';
type OpenPencilAiCompletenessDensity = 'fast' | 'normal' | 'rich' | 'detailed';
type OpenPencilAiCompositionProfile = 'web-page' | 'app-screen' | 'component' | 'poster' | 'banner' | 'social' | 'wireframe' | 'diagram' | 'reference-board' | 'edit';
type OpenPencilAiCanvasChangeOutcome = 'changed' | 'fallback-applied' | 'unchanged';

interface OpenPencilAiCompletenessGoal {
    readonly intent: OpenPencilAiCompletenessIntent;
    readonly profile: OpenPencilAiCompositionProfile;
    readonly density: OpenPencilAiCompletenessDensity;
    readonly targetScore: number;
    readonly targetLayoutHealth: number;
    readonly maxStreamingPasses: number;
    readonly maxBatchPasses: number;
    readonly minScoreGain: number;
    readonly targetNodeCount: number;
    readonly targetSectionCount: number;
    readonly targetTextCount: number;
    readonly targetVisualCount: number;
    readonly targetCardLikeCount: number;
    readonly targetTopLevelCount: number;
    readonly targetVerticalCoverage: number;
    readonly targetAreaCoverage: number;
    readonly targetMinHeight: number;
    readonly preservePageWidth: boolean;
}

interface OpenPencilAiCompletenessScoreParts {
    readonly node: number;
    readonly section: number;
    readonly text: number;
    readonly visual: number;
    readonly card: number;
    readonly topLevel: number;
    readonly vertical: number;
    readonly area: number;
    readonly layout: number;
}

interface OpenPencilAiCompletenessMetrics {
    readonly score: number;
    readonly nodeCount: number;
    readonly contentNodeCount: number;
    readonly sectionCount: number;
    readonly textCount: number;
    readonly visualCount: number;
    readonly cardLikeCount: number;
    readonly topLevelCount: number;
    readonly maxBottom: number;
    readonly usefulMaxBottom: number;
    readonly pageWidth: number;
    readonly pageHeight: number;
    readonly verticalCoverage: number;
    readonly usefulVerticalCoverage: number;
    readonly areaCoverage: number;
    readonly layoutHealth: number;
    readonly validationIssueCount: number;
}

interface OpenPencilAiCompletenessReport {
    readonly goal: OpenPencilAiCompletenessGoal;
    readonly metrics: OpenPencilAiCompletenessMetrics;
    readonly complete: boolean;
    readonly deficiencies: string[];
}

interface OpenPencilAiExecutionChoice {
    execution?: CyberVinciAiExecutionSelection;
    visualExecution?: CyberVinciAiExecutionSelection;
    workspacePath?: string;
    imagePolicy?: OpenPencilAiImagePolicy;
    visualReference?: OpenPencilAiVisualReferencePolicy;
    modelMetadata?: CyberVinciAiModelMetadata;
    visualModelMetadata?: CyberVinciAiModelMetadata;
}

interface OpenPencilAiVisualComparisonReport {
    similarityScore?: number;
    summary?: string;
    issues?: string[];
    fixes?: string[];
}

interface OpenPencilAiVisualImprovementResult {
    readonly applied: number;
    readonly selection?: string[];
    readonly compared: boolean;
    readonly score?: number;
    readonly targetScore?: number;
    readonly metTarget?: boolean;
    readonly report?: OpenPencilAiVisualComparisonReport;
}

interface OpenPencilAiProviderCompletionRecoveryResult {
    readonly applied: number;
    readonly selection?: string[];
    readonly document?: OpenPencilDocument;
    readonly completeness: OpenPencilAiCompletenessReport;
}

interface OpenPencilAiPromptRequest {
    prompt: string;
    executionChoice: OpenPencilAiExecutionChoice;
}

interface OpenPencilAiCompletionRoot {
    readonly node: OpenPencilNode;
    readonly pageWidth: number;
    readonly rootWidth: number;
    readonly rootHeight: number;
    readonly contentBottom: number;
}

type OpenPencilAiRepairPageKind = 'landing' | 'content' | 'generic';

interface CachedOpenPencilAiPromptProviderState extends OpenPencilAiPromptProviderState {
    readonly workspacePath?: string;
    readonly timestamp: number;
}

interface OpenPencilAiIncrementalStage {
    id: string;
    label: string;
    required: boolean;
    mode?: OpenPencilAiDesignRequest['mode'];
    prompt: string;
}

declare global {
    interface Window {
        cyberVinciCanvasAiDebug?: boolean;
    }
}

function isCanvasAiFrontendDebugEnabled(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }
    try {
        return window.cyberVinciCanvasAiDebug === true || window.localStorage.getItem(CYBERVINCI_CANVAS_AI_DEBUG_STORAGE_KEY) === 'true';
    } catch {
        return window.cyberVinciCanvasAiDebug === true;
    }
}

function canvasAiFrontendDebug(marker: string, details: Record<string, unknown>): void {
    if (!isCanvasAiFrontendDebugEnabled()) {
        return;
    }
    console.info(`[CanvasAI][frontend] ${marker}`, details);
}

@injectable()
export class OpenPencilEditorContribution extends NavigatableWidgetOpenHandler<OpenPencilEditorWidget> implements FrontendApplicationContribution, CommandContribution, MenuContribution, KeybindingContribution {

    override readonly id = OpenPencilEditorWidget.ID;
    readonly label = OpenPencilEditorWidget.LABEL;

    protected readonly toDispose = new DisposableCollection();
    protected readonly documents = new OpenPencilDocumentService();
    protected readonly templates = new OpenPencilTemplateService();

    @inject(EditorManager)
    protected readonly editorManager: EditorManager;

    @inject(FileService)
    protected readonly fileService: FileService;

    @inject(EnvVariablesServer)
    protected readonly environments: EnvVariablesServer;

    @inject(MessageService)
    protected readonly messages: MessageService;

    @inject(ProgressService)
    protected readonly progressService: ProgressService;

    @inject(OpenerService)
    protected readonly openerService: OpenerService;

    @inject(OpenWithService)
    protected readonly openWithService: OpenWithService;

    @inject(SelectionService)
    protected readonly selectionService: SelectionService;

    @inject(WorkspaceService)
    protected readonly workspaceService: WorkspaceService;

    @inject(OpenPencilDesignCommandService)
    protected readonly commandService: OpenPencilDesignCommandService;

    @inject(CyberVinciAiRuntimeService) @optional()
    protected readonly aiRuntimeService: CyberVinciAiRuntimeService | undefined;

    @inject(OpenPencilAiReviewService)
    protected readonly aiReviewService: OpenPencilAiReviewService;

    @inject(QuickInputService) @optional()
    protected readonly quickInputService: QuickInputService | undefined;

    @inject(FileDialogService) @optional()
    protected readonly fileDialogService: FileDialogService | undefined;

    @inject(WebSocketConnectionProvider)
    protected readonly connectionProvider: WebSocketConnectionProvider;

    protected backendService: OpenPencilBackendService | undefined;
    protected commandRegistry: CommandRegistry | undefined;

    canHandle(uri: URI): number {
        return this.documents.isOpenPencilFile(uri.path.toString()) ? 200000 : 0;
    }

    onStart(): void {
        this.toDispose.push(this.openWithService.registerHandler({
            id: OpenPencilEditorWidget.ID,
            label: `${cybervinciCanvasProductLabel} Visual Editor`,
            providerName: cybervinciCanvasProductLabel,
            iconClass: codicon('symbol-color'),
            canHandle: uri => this.canHandle(uri),
            getOrder: uri => this.canHandle(uri),
            open: uri => this.open(uri)
        }));
    }

    onStop(): void {
        this.toDispose.dispose();
    }

    registerCommands(registry: CommandRegistry): void {
        this.commandRegistry = registry;
        registry.registerCommand(OpenPencilCommands.NEW_DESIGN, {
            execute: () => this.newDesign()
        });
        registry.registerCommand(OpenPencilCommands.IMPORT_FIGMA_JSON, {
            execute: () => this.importFigmaJson()
        });
        registry.registerCommand(OpenPencilCommands.FOCUS_EDITOR, {
            execute: () => this.focusEditor(),
            isEnabled: () => !!this.activeOpenPencilWidget() || this.selectedOpenPencilUri() !== undefined,
            isVisible: () => !!this.activeOpenPencilWidget() || this.selectedOpenPencilUri() !== undefined
        });
        registry.registerCommand(OpenPencilCommands.OPEN_VISUAL_EDITOR, UriAwareCommandHandler.MonoSelect(this.selectionService, {
            execute: uri => this.safeRun('open the Canvas visual editor', () => this.open(uri)),
            isEnabled: uri => !!uri && this.canHandle(uri) > 0,
            isVisible: uri => !!uri && this.canHandle(uri) > 0
        }));
        registry.registerCommand(OpenPencilCommands.OPEN_AS_JSON, {
            execute: uri => this.openAsJson(this.resolveOpenPencilUri(uri)),
            isEnabled: uri => this.resolveOpenPencilUri(uri) !== undefined,
            isVisible: uri => this.resolveOpenPencilUri(uri) !== undefined
        });
        registry.registerCommand(OpenPencilCommands.EXPORT_SELECTION, {
            execute: () => this.exportActive(true),
            isEnabled: () => !!this.activeOpenPencilWidget(),
            isVisible: () => !!this.activeOpenPencilWidget()
        });
        registry.registerCommand(OpenPencilCommands.EXPORT_DOCUMENT, {
            execute: () => this.exportActive(false),
            isEnabled: () => !!this.activeOpenPencilWidget(),
            isVisible: () => !!this.activeOpenPencilWidget()
        });
        registry.registerCommand(OpenPencilCommands.EXPORT_SVG, {
            execute: () => this.exportSvgActive(),
            isEnabled: () => !!this.activeOpenPencilWidget(),
            isVisible: () => !!this.activeOpenPencilWidget()
        });
        registry.registerCommand(OpenPencilCommands.CREATE_UI_KIT, {
            execute: () => this.createUIKit()
        });
        registry.registerCommand(OpenPencilCommands.EXPORT_UI_KIT, {
            execute: () => this.exportUIKitActive(),
            isEnabled: () => !!this.activeOpenPencilWidget(),
            isVisible: () => !!this.activeOpenPencilWidget()
        });
        registry.registerCommand(OpenPencilCommands.GENERATE_WITH_AI, {
            execute: (uri, anchorRect) => this.generateWithAi(uri, anchorRect),
            isEnabled: () => !!this.activeOpenPencilWidget(),
            isVisible: () => !!this.activeOpenPencilWidget()
        });
        registry.registerCommand(OpenPencilCommands.PROMPT_TO_DESIGN, {
            execute: (uri, anchorRect) => this.promptToDesign(uri, anchorRect),
            isEnabled: () => !!this.activeOpenPencilWidget(),
            isVisible: () => !!this.activeOpenPencilWidget()
        });
        registry.registerCommand(OpenPencilCommands.CONTINUE_DESIGN_WITH_AI, {
            execute: (uri, anchorRect) => this.continueDesignWithAi(uri, anchorRect),
            isEnabled: () => !!this.activeOpenPencilWidget(),
            isVisible: () => !!this.activeOpenPencilWidget()
        });
        registry.registerCommand(OpenPencilCommands.EDIT_SELECTED_NODE_WITH_AI, {
            execute: (uri, anchorRect) => this.editSelectedNodeWithAi(uri, anchorRect),
            isEnabled: () => !!this.activeOpenPencilWidget()?.getSelection().length,
            isVisible: () => !!this.activeOpenPencilWidget()
        });
        registry.registerCommand(OpenPencilCommands.APPLY_STRUCTURED_COMMAND, {
            execute: () => this.applyStructuredCommand(),
            isEnabled: () => !!this.activeOpenPencilWidget(),
            isVisible: () => !!this.activeOpenPencilWidget()
        });
        registry.registerCommand(OpenPencilCommands.APPLY_AI_EDIT_JSON, {
            execute: () => this.applyStructuredCommand({
                title: cybervinciCanvasCommandLabel('Apply AI Edit JSON'),
                prompt: 'Paste AI-generated Canvas operations JSON for the active design',
                successPrefix: 'Canvas applied AI edit'
            }),
            isEnabled: () => !!this.activeOpenPencilWidget(),
            isVisible: () => !!this.activeOpenPencilWidget()
        });
        registry.registerCommand(OpenPencilCommands.PREVIEW_AI_EDIT_SUMMARY, {
            execute: () => this.previewAiEditSummary(),
            isEnabled: () => !!this.activeOpenPencilWidget(),
            isVisible: () => !!this.activeOpenPencilWidget()
        });
        registry.registerCommand(OpenPencilCommands.SHOW_DOCUMENT_SUMMARY, {
            execute: () => this.showDocumentSummary(),
            isEnabled: () => !!this.activeOpenPencilWidget(),
            isVisible: () => !!this.activeOpenPencilWidget()
        });
        registry.registerCommand(OpenPencilCommands.CREATE_COMMAND_FILE, {
            execute: () => this.createCommandFile(),
            isEnabled: () => !!this.activeOpenPencilWidget(),
            isVisible: () => !!this.activeOpenPencilWidget()
        });
        registry.registerCommand(OpenPencilCommands.CREATE_AI_EDIT_COMMAND_FILE, {
            execute: () => this.createCommandFile({
                title: cybervinciCanvasCommandLabel('Create AI Edit Command File'),
                fileSuffix: '.openpencil-ai-edit.json',
                source: 'ai-edit'
            }),
            isEnabled: () => !!this.activeOpenPencilWidget(),
            isVisible: () => !!this.activeOpenPencilWidget()
        });
        registry.registerCommand(OpenPencilCommands.APPLY_COMMAND_FILE, UriAwareCommandHandler.MonoSelect(this.selectionService, {
            execute: uri => this.applyCommandFile(uri),
            isEnabled: uri => !!uri && this.isOpenPencilCommandFile(uri),
            isVisible: uri => !!uri && this.isOpenPencilCommandFile(uri)
        }));
        registry.registerCommand(OpenPencilCommands.SHOW_BACKEND_STATUS, {
            execute: () => this.showBackendBridgeStatus()
        });
        registry.registerCommand(OpenPencilCommands.LIST_CODEGEN_TARGETS, {
            execute: () => this.showBackendBridgeOperationReport('openpencil.codegen.targets.list', 'Canvas Codegen Targets', 'openpencil-codegen-targets')
        });
        registry.registerCommand(OpenPencilCommands.LIST_MCP_TOOLS, {
            execute: () => this.showBackendBridgeOperationReport('openpencil.mcp.tools.list', 'Canvas MCP-Compatible Tools', 'openpencil-mcp-tools')
        });
        registry.registerCommand(OpenPencilCommands.LIST_CLI_COMMANDS, {
            execute: () => this.showBackendBridgeOperationReport('openpencil.cli.commands.list', 'Canvas CLI-Compatible Commands', 'openpencil-cli-commands')
        });
    }

    registerMenus(menus: MenuModelRegistry): void {
        menus.registerSubmenu(OpenPencilMenus.OPENPENCIL, CYBERVINCI_MENU_ITEMS.OPENPENCIL.label, {
            icon: CYBERVINCI_MENU_ITEMS.OPENPENCIL.iconClass
        });
        menus.registerMenuAction(CommonMenus.FILE_NEW_CONTRIBUTIONS, {
            commandId: OpenPencilCommands.NEW_DESIGN.id,
            label: `${cybervinciCanvasProductLabel} Design`,
            order: 'openpencil-1'
        });
        menus.registerMenuAction(CommonMenus.FILE_NEW_CONTRIBUTIONS, {
            commandId: OpenPencilCommands.CREATE_UI_KIT.id,
            label: `${cybervinciCanvasProductLabel} UI Kit`,
            order: 'openpencil-2'
        });
        menus.registerMenuAction(OpenPencilMenus.OPENPENCIL, {
            commandId: OpenPencilCommands.FOCUS_EDITOR.id,
            order: '0'
        });
        menus.registerMenuAction(OpenPencilMenus.OPENPENCIL, {
            commandId: OpenPencilCommands.NEW_DESIGN.id,
            order: '1'
        });
        menus.registerMenuAction(OpenPencilMenus.OPENPENCIL, {
            commandId: OpenPencilCommands.IMPORT_FIGMA_JSON.id,
            order: '2'
        });
        menus.registerMenuAction(OpenPencilMenus.OPENPENCIL, {
            commandId: OpenPencilCommands.EXPORT_DOCUMENT.id,
            order: '3'
        });
        menus.registerMenuAction(OpenPencilMenus.OPENPENCIL, {
            commandId: OpenPencilCommands.EXPORT_SELECTION.id,
            order: '4'
        });
        menus.registerMenuAction(OpenPencilMenus.OPENPENCIL, {
            commandId: OpenPencilCommands.EXPORT_SVG.id,
            order: '5'
        });
        menus.registerMenuAction(OpenPencilMenus.OPENPENCIL, {
            commandId: OpenPencilCommands.OPEN_AS_JSON.id,
            order: '6'
        });
        menus.registerMenuAction(OpenPencilMenus.OPENPENCIL, {
            commandId: OpenPencilCommands.PROMPT_TO_DESIGN.id,
            order: '6.5'
        });
        menus.registerMenuAction(OpenPencilMenus.OPENPENCIL, {
            commandId: OpenPencilCommands.CONTINUE_DESIGN_WITH_AI.id,
            order: '6.55'
        });
        menus.registerMenuAction(OpenPencilMenus.OPENPENCIL, {
            commandId: OpenPencilCommands.EDIT_SELECTED_NODE_WITH_AI.id,
            order: '6.6'
        });
        menus.registerMenuAction(OpenPencilMenus.OPENPENCIL, {
            commandId: OpenPencilCommands.APPLY_AI_EDIT_JSON.id,
            order: '7'
        });
        menus.registerMenuAction(OpenPencilMenus.OPENPENCIL, {
            commandId: OpenPencilCommands.PREVIEW_AI_EDIT_SUMMARY.id,
            order: '8'
        });
        menus.registerMenuAction(OpenPencilMenus.OPENPENCIL, {
            commandId: OpenPencilCommands.CREATE_AI_EDIT_COMMAND_FILE.id,
            order: '9'
        });
        menus.registerMenuAction(OpenPencilMenus.OPENPENCIL, {
            commandId: OpenPencilCommands.SHOW_DOCUMENT_SUMMARY.id,
            order: '10'
        });
        menus.registerMenuAction(OpenPencilMenus.OPENPENCIL, {
            commandId: OpenPencilCommands.SHOW_BACKEND_STATUS.id,
            order: '11'
        });
        menus.registerMenuAction(OpenPencilMenus.OPENPENCIL, {
            commandId: OpenPencilCommands.LIST_CODEGEN_TARGETS.id,
            order: '12'
        });
        menus.registerMenuAction(OpenPencilMenus.OPENPENCIL, {
            commandId: OpenPencilCommands.LIST_MCP_TOOLS.id,
            order: '13'
        });
        menus.registerMenuAction(OpenPencilMenus.OPENPENCIL, {
            commandId: OpenPencilCommands.LIST_CLI_COMMANDS.id,
            order: '14'
        });
        menus.registerSubmenu(OpenPencilMenus.FILE_NAVIGATOR, cybervinciCanvasProductLabel);
        menus.registerMenuAction(OpenPencilMenus.FILE_NAVIGATOR, {
            commandId: OpenPencilCommands.OPEN_VISUAL_EDITOR.id,
            label: 'Open Visual Editor',
            order: '0'
        });
        menus.registerMenuAction(OpenPencilMenus.FILE_NAVIGATOR, {
            commandId: OpenPencilCommands.OPEN_AS_JSON.id,
            label: 'Open as JSON',
            order: '1'
        });
        menus.registerMenuAction(OpenPencilMenus.FILE_NAVIGATOR, {
            commandId: OpenPencilCommands.APPLY_COMMAND_FILE.id,
            label: 'Apply Commands from File',
            order: '2'
        });
    }

    registerKeybindings(registry: KeybindingRegistry): void {
        registry.registerKeybinding({
            command: OpenPencilCommands.FOCUS_EDITOR.id,
            keybinding: 'ctrlcmd+alt+p'
        });
        registry.registerKeybinding({
            command: OpenPencilCommands.EXPORT_DOCUMENT.id,
            keybinding: 'ctrlcmd+alt+e'
        });
        registry.registerKeybinding({
            command: OpenPencilCommands.OPEN_AS_JSON.id,
            keybinding: 'ctrlcmd+alt+j'
        });
    }

    protected async newDesign(): Promise<void> {
        await this.safeRun('create an Canvas design', async () => {
            const roots = this.workspaceService.tryGetRoots();
            const root = await this.resolveWritableDesignRoot(roots.map(candidate => candidate.resource));
            const uri = await this.promptNewDesignUri(root);
            if (!uri) {
                return;
            }
            const parent = uri.parent;
            if (!await this.fileService.exists(parent)) {
                await this.fileService.createFolder(parent);
            }
            const document = this.commandService.createDesign(uri.path.name);
            await this.fileService.writeFile(uri, BinaryBuffer.fromString(this.documents.serialize(document)));
            await this.open(uri, { mode: 'activate', widgetOptions: { area: 'main' } });
            this.messages.info(`Canvas design created: ${uri.path.base}`);
        });
    }

    protected async promptNewDesignUri(root: URI): Promise<URI | undefined> {
        if (this.quickInputService) {
            const fileName = await this.quickInputService.input({
                title: 'New Canvas Design',
                prompt: `File name (${OPENPENCIL_FILE_EXTENSION})`,
                value: 'design.op'
            });
            if (fileName === undefined || !fileName.trim()) {
                return undefined;
            }
            const normalized = fileName.endsWith(OPENPENCIL_FILE_EXTENSION) ? fileName : `${fileName}${OPENPENCIL_FILE_EXTENSION}`;
            return root.resolve(normalized);
        }
        if (this.fileDialogService) {
            const folder = await this.fileService.resolve(root);
            const selected = await this.fileDialogService.showSaveDialog({
                title: 'New Canvas Design',
                filters: { 'Canvas Design': [OPENPENCIL_FILE_EXTENSION.slice(1)] }
            }, folder);
            if (!selected) {
                return undefined;
            }
            if (selected.path.ext === OPENPENCIL_FILE_EXTENSION) {
                return selected;
            }
            return selected.withPath(`${selected.path.toString()}${OPENPENCIL_FILE_EXTENSION}`);
        }
        return undefined;
    }

    protected async importFigmaJson(): Promise<void> {
        await this.safeRun('import the Figma JSON into an Canvas design', async () => {
            const root = await this.resolveWritableDesignRoot(this.workspaceService.tryGetRoots().map(candidate => candidate.resource));
            const fileName = await this.quickInputService?.input({
                title: cybervinciCanvasCommandLabel('Import Figma JSON'),
                prompt: `Output file name (${OPENPENCIL_FILE_EXTENSION})`,
                value: 'figma-import.op'
            }) ?? 'figma-import.op';
            if (!fileName.trim()) {
                return;
            }
            const source = await this.quickInputService?.input({
                title: cybervinciCanvasCommandLabel('Import Figma JSON'),
                prompt: 'Paste Figma REST JSON, decoded .fig JSON, clipboard HTML, or base64 .fig payload',
                value: ''
            });
            if (!source?.trim()) {
                return;
            }
            const normalizedName = fileName.endsWith(OPENPENCIL_FILE_EXTENSION) ? fileName : `${fileName}${OPENPENCIL_FILE_EXTENSION}`;
            const result = await this.getBackendService().executeBridgeOperation({
                operationId: 'openpencil.document.import',
                params: {
                    source,
                    name: normalizedName.slice(0, -OPENPENCIL_FILE_EXTENSION.length),
                    format: 'auto'
                }
            });
            if (!result.ok || !this.isRecord(result.output) || !this.isRecord(result.output.document)) {
                throw new Error(result.error?.message ?? 'Figma import did not return a Canvas document.');
            }
            const validation = this.isRecord(result.output.validation) ? result.output.validation : undefined;
            if (validation?.valid === false) {
                throw new Error('Figma import returned an invalid Canvas document.');
            }
            const target = await this.nextAvailableUri(root, normalizedName);
            await this.fileService.createFile(target, BinaryBuffer.fromString(this.documents.serialize(result.output.document as unknown as OpenPencilDocument)), { overwrite: false });
            await open(this.openerService, target);
            const adapter = typeof result.output.adapter === 'string' ? result.output.adapter : 'unknown';
            const warningCount = Array.isArray(result.output.warnings) ? result.output.warnings.length : 0;
            this.messages.info(`Canvas Figma import created: ${target.path.base}; adapter: ${adapter}${warningCount ? `; warnings: ${warningCount}` : ''}.`);
        });
    }

    protected async resolveWritableDesignRoot(roots: URI[]): Promise<URI> {
        const workspaceRoot = roots.find(root => !this.isFilesystemRoot(root));
        if (workspaceRoot) {
            return workspaceRoot;
        }
        const configRoot = new URI(await this.environments.getConfigDirUri()).resolve('openpencil');
        if (!await this.fileService.exists(configRoot)) {
            await this.fileService.createFolder(configRoot);
        }
        return configRoot;
    }

    protected isFilesystemRoot(uri: URI): boolean {
        const fsPath = uri.path.fsPath().replace(/\\/g, '/');
        return fsPath === '/' || /^[a-zA-Z]:\/?$/.test(fsPath);
    }

    protected async nextAvailableUri(root: URI, fileName: string, extension = OPENPENCIL_FILE_EXTENSION): Promise<URI> {
        const base = fileName.endsWith(extension) ? fileName.slice(0, -extension.length) : fileName;
        let candidate = root.resolve(fileName);
        let index = 1;
        while (await this.fileService.exists(candidate)) {
            candidate = root.resolve(`${base}-${index++}${extension}`);
        }
        return candidate;
    }

    protected async openAsJson(uri: URI | undefined): Promise<void> {
        if (uri) {
            await this.safeRun('open the Canvas document as JSON', () => this.editorManager.open(uri, { mode: 'activate' }));
        }
    }

    protected async showBackendBridgeStatus(): Promise<void> {
        await this.safeRun('show the Canvas bridge status', async () => {
            const status = await this.getBackendService().getStatus();
            await this.writeBackendBridgeReport('Canvas Bridge Status', 'openpencil-bridge-status', status);
            const adapterStatus = await this.runBackendBridgeOperation('openpencil.codegen.adapter.status');
            const selectedAdapter = this.isRecord(adapterStatus.output) && typeof adapterStatus.output.selectedAdapter === 'string'
                ? adapterStatus.output.selectedAdapter
                : 'unknown';
            this.messages.info(`Canvas bridge is ${status.embedded ? 'embedded' : 'remote'}; codegen adapter: ${selectedAdapter}; external processes started: ${status.externalProcessesStarted}.`);
        });
    }

    protected async showBackendBridgeOperationReport(operationId: string, title: string, fileBase: string): Promise<void> {
        await this.safeRun(`show ${title}`, async () => {
            const result = await this.runBackendBridgeOperation(operationId);
            await this.writeBackendBridgeReport(title, fileBase, {
                title,
                operationId,
                externalProcessStarted: result.externalProcessStarted,
                output: result.output
            });
            const count = Array.isArray(result.output) ? result.output.length : 1;
            this.messages.info(`${title}: ${count} item${count === 1 ? '' : 's'} discovered in-process.`);
        });
    }

    protected async runBackendBridgeOperation(operationId: string): Promise<OpenPencilBridgeOperationResult> {
        const result = await this.getBackendService().executeBridgeOperation({ operationId });
        if (!result.ok) {
            throw new Error(result.error?.message ?? `Canvas bridge operation failed: ${operationId}`);
        }
        return result;
    }

    protected getBackendService(): OpenPencilBackendService {
        if (!this.backendService) {
            this.backendService = this.connectionProvider.createProxy<OpenPencilBackendService>(OPENPENCIL_BACKEND_PATH);
        }
        return this.backendService;
    }

    protected async writeBackendBridgeReport(title: string, fileBase: string, payload: unknown): Promise<void> {
        const root = await this.resolveWritableDesignRoot(this.workspaceService.tryGetRoots().map(candidate => candidate.resource));
        const target = await this.nextAvailableUri(root, `${fileBase}.json`, '.json');
        const content = {
            title,
            generatedBy: 'CyberVinci Canvas in-process bridge',
            externalProcessesStarted: false,
            payload
        };
        await this.fileService.createFile(target, BinaryBuffer.fromString(`${JSON.stringify(content, undefined, 2)}\n`), { overwrite: false });
        await this.editorManager.open(target, { mode: 'activate' });
    }

    protected async exportActive(selectionOnly: boolean): Promise<void> {
        await this.safeRun(selectionOnly ? 'export the Canvas selection' : 'export the Canvas document', async () => {
            const widget = this.activeOpenPencilWidget();
            const document = widget?.getDocument();
            if (!widget || !document) {
                this.messages.error('Open a Canvas visual editor before exporting.');
                return;
            }
            if (selectionOnly && !widget.getSelection().length) {
                this.messages.error('Select at least one Canvas node before exporting the selection.');
                return;
            }
            const format = selectionOnly ? 'react-tailwind' : 'html-css';
            const extension = selectionOnly ? '.tsx' : '.html';
            const content = this.commandService.exportDocument(document, widget.getSelection(), format, selectionOnly);
            const target = widget.uri.parent.resolve(`${widget.uri.path.name}${selectionOnly ? '.selection' : ''}${extension}`);
            await this.fileService.writeFile(target, BinaryBuffer.fromString(content));
            await this.editorManager.open(target, { mode: 'activate' });
            this.messages.info(`Canvas export created: ${target.path.base}`);
        });
    }

    protected async exportSvgActive(): Promise<void> {
        await this.safeRun('export the Canvas document to SVG', async () => {
            const widget = this.activeOpenPencilWidget();
            const document = widget?.getDocument();
            if (!widget || !document) {
                this.messages.error('Open a Canvas visual editor before exporting SVG.');
                return;
            }
            const content = this.commandService.exportDocument(document, widget.getSelection(), 'svg', false);
            const target = widget.uri.parent.resolve(`${widget.uri.path.name}.svg`);
            await this.fileService.writeFile(target, BinaryBuffer.fromString(content));
            await this.editorManager.open(target, { mode: 'activate' });
            this.messages.info(`OpenPencil SVG export created: ${target.path.base}`);
        });
    }

    protected async createUIKit(): Promise<void> {
        const roots = this.workspaceService.tryGetRoots();
        if (!roots.length) {
            this.messages.error('Open a workspace folder before creating a Canvas UI kit.');
            return;
        }
        const root = roots[0].resource;
        const fileName = await this.quickInputService?.input({
            title: 'New Canvas UI Kit',
            prompt: 'File name (.pen)',
            value: 'openpencil-ui-kit.pen'
        }) ?? 'openpencil-ui-kit.pen';
        if (!fileName.trim()) {
            return;
        }
        const normalized = fileName.toLowerCase().endsWith('.pen') ? fileName : `${fileName}.pen`;
        const uri = await this.nextAvailableUri(root, normalized, '.pen');
        await this.fileService.createFile(uri, BinaryBuffer.fromString(this.templates.serializeBuiltinUIKit()), { overwrite: false });
        await this.editorManager.open(uri, { mode: 'activate' });
        this.messages.info(`Canvas UI kit created: ${uri.path.base}`);
    }

    protected async exportUIKitActive(): Promise<void> {
        const widget = this.activeOpenPencilWidget();
        const document = widget?.getDocument();
        if (!widget || !document) {
            this.messages.error('Open a Canvas visual editor before using AI.');
            return;
        }
        const cloned = this.documents.cloneDocument(document);
        const selection = widget.getSelection();
        const nodes = selection.length
            ? selection.map(id => this.documents.findNode(cloned, id)).filter((node): node is OpenPencilNode => !!node)
            : this.documents.getActivePage(cloned).children;
        if (!nodes.length) {
            this.messages.error('Select at least one node, or add nodes to the active page before exporting a UI kit.');
            return;
        }
        const componentName = selection.length ? `${widget.uri.path.name} selection` : document.name ?? widget.uri.path.name;
        const kit = this.templates.createUIKitDocument(`${document.name ?? widget.uri.path.name} UI Kit`, [{
            id: `${widget.uri.path.name}-component`,
            name: componentName,
            nodes
        }]);
        const target = widget.uri.parent.resolve(`${widget.uri.path.name}.pen`);
        await this.fileService.writeFile(target, BinaryBuffer.fromString(this.templates.serializeUIKitDocument(kit)));
        await this.editorManager.open(target, { mode: 'activate' });
        this.messages.info(`Canvas UI kit export created: ${target.path.base}`);
    }

    protected async generateWithAi(target?: unknown, anchorRect?: OpenPencilAiPromptDialogAnchorRect): Promise<void> {
        await this.runAiPromptFlow({
            title: cybervinciCanvasCommandLabel('Generate with AI'),
            prompt: 'Describe the structured Canvas edit to generate',
            value: 'Automatize seus processos com IA',
            selection: widget => widget.getSelection(),
            target,
            anchorRect
        });
    }

    protected async promptToDesign(target?: unknown, anchorRect?: OpenPencilAiPromptDialogAnchorRect): Promise<void> {
        await this.runAiPromptFlow({
            title: cybervinciCanvasCommandLabel('Prompt to Design'),
            prompt: 'Describe the complete Canvas screen, page, or design section to generate',
            value: 'Create a mobile banking login screen with dark blue gradient, card, email field, password field, and primary button',
            selection: () => [],
            target,
            anchorRect
        });
    }

    protected async continueDesignWithAi(target?: unknown, anchorRect?: OpenPencilAiPromptDialogAnchorRect): Promise<void> {
        await this.runAiPromptFlow({
            title: cybervinciCanvasCommandLabel('Continue Design with AI'),
            prompt: 'Describe how to continue and complete the current Canvas design without replacing existing content',
            value: 'Continue and complete this design by adding the missing sections below the existing content',
            selection: () => [],
            requestMode: 'continuation',
            target,
            anchorRect
        });
    }

    protected async editSelectedNodeWithAi(target?: unknown, anchorRect?: OpenPencilAiPromptDialogAnchorRect): Promise<void> {
        await this.runAiPromptFlow({
            title: cybervinciCanvasCommandLabel('Edit Selected Node with AI'),
            prompt: 'Describe how to edit the selected Canvas node',
            value: 'Atualize para uma promessa mais direta em verde',
            selection: widget => widget.getSelection(),
            requireSelection: true,
            target,
            anchorRect
        });
    }

    protected async runAiPromptFlow(options: {
        title: string;
        prompt: string;
        value: string;
        selection: (widget: OpenPencilEditorWidget) => string[];
        requireSelection?: boolean;
        requestMode?: OpenPencilAiDesignRequest['mode'];
        target?: unknown;
        anchorRect?: OpenPencilAiPromptDialogAnchorRect;
    }): Promise<void> {
        const widget = await this.resolveOpenPencilWidget(options.target);
        const document = widget?.getDocument();
        if (!widget || !document) {
            this.messages.error('Open a Canvas visual editor before using AI.');
            return;
        }
        const selection = options.selection(widget);
        if (options.requireSelection && !selection.length) {
            this.messages.error('Select at least one Canvas node before editing the selection with AI.');
            return;
        }
        const promptRequest = await this.readAiPromptRequest(options.title, `${options.prompt}; current selection: ${this.formatSelection(selection)}`, options.value, options.anchorRect);
        if (!promptRequest) {
            return;
        }
        await this.executeAiPromptWithFeedback(widget, document, selection, promptRequest.prompt, options.requestMode, promptRequest.executionChoice);
    }

    protected async readAiPromptRequest(title: string, prompt: string, value: string, anchorRect?: OpenPencilAiPromptDialogAnchorRect): Promise<OpenPencilAiPromptRequest | undefined> {
        const workspacePath = this.resolveWorkspacePath();
        const cachedProviderState = this.readCachedAiPromptProviderState(workspacePath);
        const providerState = this.aiRuntimeService ? undefined : this.loadAiPromptDialogProviderState(workspacePath);
        const dialogResult = await openOpenPencilAiPromptDialog({
            title,
            prompt,
            value,
            providers: cachedProviderState?.providers,
            defaultExecution: cachedProviderState?.defaultExecution,
            providerState,
            runtimeService: this.aiRuntimeService,
            workspacePath,
            configureProvider: provider => this.configureAiPromptProvider(provider, workspacePath),
            anchorRect
        });
        if (!dialogResult?.prompt.trim()) {
            return undefined;
        }
        return {
            prompt: dialogResult.prompt.trim(),
            executionChoice: this.createAiExecutionChoice(
                dialogResult,
                dialogResult.provider ? [dialogResult.provider] : cachedProviderState?.providers ?? [],
                dialogResult.defaultExecution ?? cachedProviderState?.defaultExecution,
                workspacePath
            )
        };
    }

    protected async readAiExecutionChoice(): Promise<OpenPencilAiExecutionChoice | undefined> {
        const workspacePath = this.resolveWorkspacePath();
        if (!this.aiRuntimeService) {
            return { workspacePath };
        }
        try {
            return {
                workspacePath,
                execution: await this.aiRuntimeService.getDefaultExecution({ workspacePath, includeUnavailable: true })
            };
        } catch (error) {
            this.messages.warn(`Canvas AI Runtime provider selection failed; using fallback providers. ${error instanceof Error ? error.message : String(error)}`);
            return { workspacePath };
        }
    }

    protected async loadAiPromptDialogProviderState(workspacePath: string | undefined): Promise<{
        providers: CyberVinciAiProviderDescriptor[];
        defaultExecution?: CyberVinciAiExecutionSelection;
    }> {
        if (!this.aiRuntimeService) {
            return { providers: [] };
        }
        try {
            const [providers, defaultExecution] = await Promise.all([
                this.aiRuntimeService.listProviders({ workspacePath, includeUnavailable: true }),
                this.aiRuntimeService.getDefaultExecution({ workspacePath, includeUnavailable: true })
            ]);
            this.writeCachedAiPromptProviderState(workspacePath, { providers, defaultExecution });
            return { providers, defaultExecution };
        } catch (error) {
            this.messages.warn(`Canvas AI Runtime provider list failed; using fallback providers. ${error instanceof Error ? error.message : String(error)}`);
            return { providers: [] };
        }
    }

    protected async configureAiPromptProvider(provider: CyberVinciAiProviderDescriptor, workspacePath: string | undefined): Promise<OpenPencilAiPromptProviderState | undefined> {
        if (!this.commandRegistry) {
            this.messages.warn('Canvas AI provider configuration is not available yet.');
            return undefined;
        }
        await this.commandRegistry.executeCommand('chat:ai-providers-configure', {
            providerId: provider.id,
            runtime: provider.runtime,
            modelProvider: provider.modelProvider,
            mode: 'credentials'
        });
        return this.loadAiPromptDialogProviderState(workspacePath);
    }

    protected readCachedAiPromptProviderState(workspacePath: string | undefined): OpenPencilAiPromptProviderState | undefined {
        try {
            const raw = window.localStorage.getItem(OPENPENCIL_AI_PROVIDER_STATE_CACHE_KEY);
            if (!raw) {
                return undefined;
            }
            const cached = JSON.parse(raw) as CachedOpenPencilAiPromptProviderState;
            if (cached.workspacePath !== workspacePath || Date.now() - cached.timestamp > OPENPENCIL_AI_PROVIDER_STATE_CACHE_MAX_AGE_MS) {
                return undefined;
            }
            return {
                providers: Array.isArray(cached.providers) ? cached.providers : [],
                defaultExecution: cached.defaultExecution
            };
        } catch {
            return undefined;
        }
    }

    protected writeCachedAiPromptProviderState(workspacePath: string | undefined, state: OpenPencilAiPromptProviderState): void {
        try {
            window.localStorage.setItem(OPENPENCIL_AI_PROVIDER_STATE_CACHE_KEY, JSON.stringify({
                ...state,
                workspacePath,
                timestamp: Date.now()
            } satisfies CachedOpenPencilAiPromptProviderState));
        } catch {
            // Local storage may be unavailable in restricted browser contexts.
        }
    }

    protected createAiExecutionChoice(
        dialogResult: OpenPencilAiPromptDialogResult,
        providers: CyberVinciAiProviderDescriptor[],
        defaultExecution: CyberVinciAiExecutionSelection | undefined,
        workspacePath: string | undefined
    ): OpenPencilAiExecutionChoice {
        const provider = dialogResult.providerId ? providers.find(candidate => candidate.id === dialogResult.providerId) : undefined;
        const imageNeedsSearch = dialogResult.imagePolicy.mode === 'search' || dialogResult.imagePolicy.mode === 'auto';
        const selectedModel = dialogResult.model ?? defaultExecution?.model;
        const modelMetadata = selectedModel ? provider?.modelMetadata?.find(model => model.id === selectedModel) : undefined;
        const visualProvider = dialogResult.visualReference.visualModelEnabled
            ? dialogResult.visualReference.visualProvider
                ?? (dialogResult.visualReference.visualProviderId ? providers.find(candidate => candidate.id === dialogResult.visualReference.visualProviderId) : undefined)
                ?? provider
            : undefined;
        const visualModel = dialogResult.visualReference.visualModelEnabled ? dialogResult.visualReference.visualModel : undefined;
        const visualModelMetadata = visualModel ? visualProvider?.modelMetadata?.find(model => model.id === visualModel) : undefined;
        const execution: CyberVinciAiExecutionSelection | undefined = provider || defaultExecution
            ? {
                ...(provider ? {} : defaultExecution),
                providerId: provider?.id ?? defaultExecution?.providerId,
                runtime: provider?.runtime ?? defaultExecution?.runtime,
                modelProvider: provider?.modelProvider ?? defaultExecution?.modelProvider,
                label: provider?.label ?? defaultExecution?.label,
                executablePath: provider?.executablePath ?? defaultExecution?.executablePath,
                model: selectedModel,
                reasoningPolicy: dialogResult.reasoningEffort === 'none' ? 'off' : 'auto',
                reasoningEffort: dialogResult.reasoningEffort,
                webSearch: imageNeedsSearch ? 'live' : defaultExecution?.webSearch,
                webSearchContextSize: imageNeedsSearch ? 'medium' : defaultExecution?.webSearchContextSize
            }
            : undefined;
        const visualExecution: CyberVinciAiExecutionSelection | undefined = execution && visualProvider
            ? {
                providerId: visualProvider.id,
                runtime: visualProvider.runtime,
                modelProvider: visualProvider.modelProvider,
                label: visualProvider.label,
                executablePath: visualProvider.executablePath,
                model: visualModel ?? visualProvider.defaultModel,
                reasoningPolicy: 'auto',
                reasoningEffort: dialogResult.reasoningEffort,
                webSearch: 'live',
                webSearchContextSize: 'medium'
            }
            : undefined;
        return {
            workspacePath,
            execution,
            visualExecution,
            imagePolicy: dialogResult.imagePolicy,
            visualReference: dialogResult.visualReference,
            modelMetadata,
            visualModelMetadata
        };
    }

    protected resolveWorkspacePath(): string | undefined {
        const root = this.workspaceService.tryGetRoots()[0]?.resource;
        return root ? FileUri.fsPath(root) : undefined;
    }

    protected async executeAiPromptWithFeedback(widget: OpenPencilEditorWidget, document: OpenPencilDocument, selection: string[], prompt: string, requestMode: OpenPencilAiDesignRequest['mode'] | undefined, executionChoice: OpenPencilAiExecutionChoice): Promise<void> {
        const beforeSerialized = this.serializeAiWidgetDocument(widget);
        if (this.isAiIncrementalEnabled()) {
            await this.executeIncrementalAiPromptWithFeedback(widget, document, selection, prompt, requestMode, executionChoice);
        } else {
            await this.executeAiPromptBatchWithFeedback(widget, document, selection, prompt, requestMode, executionChoice);
        }
        await this.ensureAiPromptChangedCanvas(widget, prompt, selection, requestMode, beforeSerialized);
        await this.ensureAiPromptCompleteAfterExecution(widget, prompt, selection, requestMode, executionChoice, {
            preferLocalRepairFirst: false,
            skipProviderContinuationAfterLocalRepair: false
        });
    }

    protected serializeAiWidgetDocument(widget: OpenPencilEditorWidget): string | undefined {
        const current = widget.getDocument();
        return current ? this.documents.serialize(current) : undefined;
    }

    protected async ensureAiPromptChangedCanvas(
        widget: OpenPencilEditorWidget,
        prompt: string,
        selection: string[],
        requestMode: OpenPencilAiDesignRequest['mode'] | undefined,
        beforeSerialized: string | undefined
    ): Promise<OpenPencilAiCanvasChangeOutcome> {
        if (!beforeSerialized) {
            return 'changed';
        }
        const afterSerialized = this.serializeAiWidgetDocument(widget);
        if (afterSerialized && afterSerialized !== beforeSerialized) {
            return 'changed';
        }
        const currentDocument = widget.getDocument();
        canvasAiFrontendDebug('no-document-change-after-ai-prompt', {
            uri: widget.uri.toString(),
            promptLength: prompt.length,
            selectionCount: selection.length,
            requestMode,
            hasCurrentDocument: !!currentDocument,
            hasVisibleContent: currentDocument ? this.hasVisibleUserCanvasContent(currentDocument) : false
        });
        if (currentDocument && this.shouldApplyEmergencyAiFallback(currentDocument, prompt, selection, requestMode)) {
            return await this.applyEmergencyAiFallback(widget, prompt, selection, requestMode, beforeSerialized)
                ? 'fallback-applied'
                : 'unchanged';
        }
        this.reportAiStatus(widget, undefined, this.createAiStatus('error', 'No change', 'Canvas AI finished without changing the canvas.'));
        this.messages.warn('Canvas AI did not change the canvas: the selected model/provider did not return usable OpenPencil operations. See the previous Canvas AI notification for the provider reason, then retry or switch to a stronger model.');
        return 'unchanged';
    }

    protected shouldApplyEmergencyAiFallback(_document: OpenPencilDocument, _prompt: string, _selection: string[], _requestMode: OpenPencilAiDesignRequest['mode'] | undefined): boolean {
        return false;
    }

    protected async ensureAiPromptCompleteAfterExecution(
        widget: OpenPencilEditorWidget,
        prompt: string,
        selection: string[],
        requestMode: OpenPencilAiDesignRequest['mode'] | undefined,
        executionChoice: OpenPencilAiExecutionChoice,
        options: { readonly preferLocalRepairFirst?: boolean; readonly skipProviderContinuationAfterLocalRepair?: boolean } = {}
    ): Promise<void> {
        if (selection.length || requestMode === 'maintenance') {
            return;
        }
        let currentDocument = widget.getDocument();
        if (!currentDocument || !this.hasVisibleUserCanvasContent(currentDocument)) {
            return;
        }
        let completeness = this.evaluateAiCompleteness(currentDocument, prompt, [], requestMode, executionChoice);
        if (!this.shouldRunAiCompletenessContinuation(completeness, true)) {
            return;
        }
        const pageLike = completeness.goal.profile === 'web-page' || completeness.goal.intent === 'reference' || completeness.goal.intent === 'page';
        if (!pageLike && this.meetsAiCompletenessHardMinimums(completeness.goal, completeness.metrics)) {
            return;
        }

        let progress: OpenPencilProgressHandle | undefined = await this.progressService.showProgress({
            text: 'Canvas AI is completing the design...',
            options: {
                location: 'notification'
            }
        });
        let appliedTotal = 0;
        let currentSelection: string[] = [];
        let currentPrompt = prompt;
        const applyStreamedOperations = async (streamed: OpenPencilAiDesignResult): Promise<{ document: OpenPencilDocument; selection: string[]; applied: number } | undefined> => {
            this.reportAiStatus(widget, progress, this.createAiStatus('applying', 'Completing page', `Canvas AI is applying completion change ${appliedTotal + 1}...`));
            const result = await this.applyGeneratedAiOperations(widget, streamed.operations, progress, currentSelection, 'continuation', {
                quiet: true,
                batchSize: 1,
                applyOptions: this.createAiApplyOptions(prompt, 'continuation'),
                allowTemporaryLayoutQualityIssues: true
            });
            if (!result?.completed) {
                return undefined;
            }
            appliedTotal += result.applied;
            currentSelection = result.selection;
            const latestDocument = widget.getDocument();
            return latestDocument
                ? { document: latestDocument, selection: result.selection, applied: result.applied }
                : undefined;
        };

        try {
            if (this.shouldCompleteAiLocallyBeforeModelContinuation(completeness, options.preferLocalRepairFirst === true)) {
                const repair = await this.applyDeterministicAiCompletenessRepair(widget, prompt, requestMode, executionChoice, progress, completeness);
                appliedTotal += repair.applied;
                if (repair.document) {
                    currentDocument = repair.document;
                    completeness = this.evaluateAiCompleteness(currentDocument, prompt, [], requestMode, executionChoice);
                }
                if (appliedTotal > 0 && completeness.complete) {
                    this.reportAiStatus(widget, progress, this.createAiStatus('complete', 'Completed', `Canvas AI completed the page locally with ${appliedTotal} repair change${appliedTotal === 1 ? '' : 's'}.`));
                    return;
                }
                if (options.skipProviderContinuationAfterLocalRepair === true) {
                    const summary = completeness.deficiencies.slice(0, 2).join('; ') || `score ${completeness.metrics.score.toFixed(2)}/${completeness.goal.targetScore.toFixed(2)}`;
                    const phase: OpenPencilAiStatus['phase'] = appliedTotal > 0 ? 'complete' : 'error';
                    const title = appliedTotal > 0 ? 'Local repair applied' : 'Incomplete';
                    this.reportAiStatus(widget, progress, this.createAiStatus(phase, title, appliedTotal > 0
                        ? `Canvas AI applied local repair after the provider returned no usable operations; result still needs review: ${summary}.`
                        : `Canvas AI stopped before the design met completeness checks: ${summary}.`));
                    if (appliedTotal > 0) {
                        this.messages.warn(`Canvas AI applied local repair after the selected provider returned no usable operations, but the result still needs review: ${summary}.`);
                    } else {
                        this.messages.warn(`Canvas AI stopped before the design met completeness checks: ${summary}.`);
                    }
                    return;
                }
            }
            const maxPasses = completeness.goal.maxStreamingPasses;
            let weakPasses = 0;
            for (let pass = 1; pass <= maxPasses && !completeness.complete; pass++) {
                currentDocument = widget.getDocument();
                if (!currentDocument) {
                    break;
                }
                const beforeScore = completeness.metrics.score;
                const beforeApplied = appliedTotal;
                currentPrompt = this.createAiCompletenessContinuationPrompt(prompt, pass, maxPasses, completeness);
                this.reportAiStatus(widget, progress, this.createAiStatus('preparing', 'Completing page', `Canvas AI is completing missing design sections (${pass}/${maxPasses}, score ${beforeScore.toFixed(2)}/${completeness.goal.targetScore.toFixed(2)})...`));
                const continuation = await this.withCanvasAiFrontendTimeout(this.commandService.streamAiOperations({
                    prompt: currentPrompt,
                    document: currentDocument,
                    selection: [],
                    uri: widget.uri.toString(),
                    mode: 'continuation',
                    workspacePath: executionChoice.workspacePath,
                    execution: executionChoice.execution,
                    imagePolicy: executionChoice.imagePolicy
                }, applyStreamedOperations), this.resolveCanvasAiFrontendStreamTimeoutMs(executionChoice), `Canvas AI streaming completion pass ${pass} did not finish in time.`);
                currentDocument = widget.getDocument();
                completeness = currentDocument ? this.evaluateAiCompleteness(currentDocument, prompt, [], requestMode, executionChoice) : completeness;
                const scoreGain = completeness.metrics.score - beforeScore;
                canvasAiFrontendDebug('post-execution-completeness-result', {
                    pass,
                    operationsCount: continuation.operations.length,
                    appliedTotal,
                    score: completeness.metrics.score,
                    targetScore: completeness.goal.targetScore,
                    scoreGain,
                    complete: completeness.complete,
                    deficiencies: completeness.deficiencies.slice(0, 4)
                });
                if (!continuation.operations.length || appliedTotal === beforeApplied) {
                    weakPasses++;
                    if (continuation.source !== 'provider') {
                        break;
                    }
                    if (this.shouldRetryNoProgressAiCompletenessPass(completeness, pass, maxPasses, true)) {
                        continue;
                    }
                    break;
                }
                weakPasses = scoreGain < completeness.goal.minScoreGain ? weakPasses + 1 : 0;
                if (this.shouldStopWeakAiCompletenessLoop(completeness, weakPasses)) {
                    break;
                }
            }
            if (!completeness.complete) {
                const recovery = await this.runAiProviderCompletionRecoveryLoop(
                    widget,
                    prompt,
                    requestMode,
                    executionChoice,
                    progress,
                    completeness,
                    true,
                    currentSelection
                );
                appliedTotal += recovery.applied;
                currentSelection = recovery.selection ?? currentSelection;
                currentDocument = recovery.document ?? widget.getDocument() ?? currentDocument;
                completeness = recovery.completeness;
            }
            currentDocument = await this.normalizeFinalAiLayoutBeforeCompletion(widget, progress, prompt, requestMode) ?? currentDocument;
            completeness = currentDocument ? this.evaluateAiCompleteness(currentDocument, prompt, [], requestMode, executionChoice) : completeness;
            if (appliedTotal > 0 && completeness.complete) {
                this.reportAiStatus(widget, progress, this.createAiStatus('complete', 'Completed', `Canvas AI added ${appliedTotal} completion change${appliedTotal === 1 ? '' : 's'}.`));
            } else if (!completeness.complete) {
                const summary = completeness.deficiencies.slice(0, 2).join('; ') || `score ${completeness.metrics.score.toFixed(2)}/${completeness.goal.targetScore.toFixed(2)}`;
                this.reportAiStatus(widget, progress, this.createAiStatus('error', 'Incomplete', `Canvas AI stopped before the design met completeness checks: ${summary}.`));
                this.messages.warn(`Canvas AI stopped before the design met completeness checks: ${summary}. Try a stronger model or run AI Edit/AI again to continue.`);
            }
        } catch (error) {
            this.reportAiStatus(widget, progress, this.createAiStatus('error', 'Completion failed', 'Canvas AI could not complete the design after the first pass.'));
            this.messages.warn(`Canvas AI could not complete the design after the first pass: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            progress?.cancel();
        }
    }

    protected async applyDeterministicAiCompletenessRepair(
        widget: OpenPencilEditorWidget,
        prompt: string,
        requestMode: OpenPencilAiDesignRequest['mode'] | undefined,
        executionChoice: OpenPencilAiExecutionChoice,
        progress: OpenPencilProgressHandle | undefined,
        report: OpenPencilAiCompletenessReport
    ): Promise<{ applied: number; selection: string[]; document?: OpenPencilDocument }> {
        const operations = this.createDeterministicAiCompletenessRepairOperations(widget, prompt, report);
        if (!operations.length) {
            return { applied: 0, selection: [] };
        }
        canvasAiFrontendDebug('deterministic-completeness-repair', {
            operationsCount: operations.length,
            score: report.metrics.score,
            targetScore: report.goal.targetScore,
            profile: report.goal.profile,
            intent: report.goal.intent,
            deficiencies: report.deficiencies.slice(0, 4)
        });
        this.reportAiStatus(widget, progress, this.createAiStatus('applying', 'Completing structure', 'Canvas AI is applying a deterministic completion repair inside the existing design frame...'));
        const result = await this.applyGeneratedAiOperations(widget, operations, progress, [], 'continuation', {
            quiet: true,
            batchSize: 1,
            applyOptions: this.createAiApplyOptions(prompt, 'continuation'),
            allowTemporaryLayoutQualityIssues: true
        });
        if (!result?.completed || !result.changed) {
            canvasAiFrontendDebug('deterministic-completeness-repair-skipped', {
                message: result?.message,
                applied: result?.applied ?? 0,
                total: result?.total ?? operations.length
            });
            return { applied: 0, selection: [] };
        }
        return {
            applied: result.applied,
            selection: result.selection,
            document: widget.getDocument()
        };
    }

    protected shouldCompleteAiLocallyBeforeModelContinuation(report: OpenPencilAiCompletenessReport, preferLocalRepairFirst: boolean): boolean {
        if (report.complete || report.goal.profile === 'edit') {
            return false;
        }
        return preferLocalRepairFirst;
    }

    protected createDeterministicAiCompletenessRepairOperations(
        widget: OpenPencilEditorWidget,
        prompt: string,
        report: OpenPencilAiCompletenessReport
    ): OpenPencilDesignOperation[] {
        return [];
    }

    protected shouldAvoidDeterministicAiContentRepair(report: OpenPencilAiCompletenessReport): boolean {
        return report.goal.profile === 'web-page'
            || report.goal.intent === 'page'
            || report.goal.intent === 'reference';
    }

    protected createDeterministicWebPageCompletionRepairOperations(
        document: OpenPencilDocument,
        prompt: string,
        report: OpenPencilAiCompletenessReport
    ): OpenPencilDesignOperation[] {
        const page = this.documents.getActivePage(document);
        const root = this.findAiCompletionRoot(document, report.goal);
        if (!root) {
            return this.createDeterministicWebPageRootRepairOperations(document, prompt, report);
        }
        const idFor = this.createAiRepairIdFactory(document, prompt);
        const pageKind = this.detectAiRepairPageKind(prompt);
        const width = report.goal.preservePageWidth ? Math.max(1200, root.rootWidth) : Math.max(720, root.rootWidth);
        const outerPadding = width >= 1120 ? 82 : Math.max(24, Math.round(width * 0.06));
        const contentX = Math.min(outerPadding, Math.max(24, Math.floor((width - 560) / 2)));
        const contentWidth = Math.max(520, width - contentX * 2);
        const gap = 24;
        let y = Math.max(120, Math.round(root.contentBottom + gap));
        const sections: OpenPencilNode[] = [];
        const addSection = (node: OpenPencilNode): void => {
            sections.push(node);
            y += this.numericAiDimension(node.height, 180) + gap;
        };
        const sectionNeed = Math.max(2, Math.min(6, Math.ceil(report.goal.targetSectionCount - report.metrics.sectionCount)));
        const needsCards = report.metrics.cardLikeCount < report.goal.targetCardLikeCount || report.metrics.nodeCount < report.goal.targetNodeCount;

        addSection(this.createAiRepairFeatureSection(idFor, contentX, y, contentWidth, prompt, pageKind));
        if (needsCards || sectionNeed > 2) {
            addSection(this.createAiRepairCardGridSection(idFor, contentX, y, contentWidth, prompt, pageKind));
        }
        addSection(this.createAiRepairPromoSection(idFor, contentX, y, contentWidth, prompt, 'cta', this.aiRepairLabel(prompt, 'Proxima acao clara', 'Clear next action'), this.aiRepairLabel(prompt, 'Um bloco de conversao fecha a narrativa visual sem quebrar a composicao.', 'A conversion block closes the visual story without breaking the composition.')));
        if (pageKind === 'content' || sectionNeed > 4) {
            addSection(this.createAiRepairCardGridSection(idFor, contentX, y, contentWidth, prompt, 'content'));
        }
        addSection(this.createAiRepairFooterSection(idFor, contentX, y, contentWidth, prompt, pageKind));

        const sectionLimit = Math.min(sections.length, Math.max(sectionNeed, needsCards ? 4 : 3));
        const selectedSections = sections.slice(0, sectionLimit);
        if (!selectedSections.length) {
            return [];
        }
        const finalBottom = selectedSections.reduce((bottom, section) => Math.max(bottom, this.numericAiDimension(section.y, 0) + this.numericAiDimension(section.height, 0)), 0);
        const rootHeight = Math.max(root.rootHeight, finalBottom + 48);
        const operations: OpenPencilDesignOperation[] = [
            {
                operation: 'updatePage',
                pageId: page.id,
                changes: {
                    width: Math.max(this.numericAiDimension(page.width, width), root.pageWidth, width),
                    height: Math.max(this.numericAiDimension(page.height, rootHeight), this.numericAiDimension(root.node.y, 0) + rootHeight + 80),
                    background: typeof page.background === 'string' ? page.background : '#eeeeee'
                }
            },
            {
                operation: 'updateNode',
                nodeId: root.node.id,
                changes: {
                    width,
                    height: rootHeight,
                    clipContent: false
                }
            },
            ...selectedSections.map((section): OpenPencilDesignOperation => ({
                operation: 'createNode',
                parentId: root.node.id,
                node: section
            })),
            { operation: 'setSelection', nodeIds: [selectedSections[selectedSections.length - 1].id] }
        ];
        return operations;
    }

    protected createDeterministicWebPageRootRepairOperations(
        document: OpenPencilDocument,
        prompt: string,
        report: OpenPencilAiCompletenessReport
    ): OpenPencilDesignOperation[] {
        const page = this.documents.getActivePage(document);
        const idFor = this.createAiRepairIdFactory(document, prompt);
        const width = report.goal.preservePageWidth ? 1200 : Math.max(900, Math.min(1200, this.numericAiDimension(page.width, 960)));
        const x = Math.max(0, Math.round((this.numericAiDimension(page.width, width) - width) / 2));
        const rootId = idFor('page-root');
        const pageKind = this.detectAiRepairPageKind(prompt);
        const outerPadding = width >= 1120 ? 82 : Math.max(24, Math.round(width * 0.06));
        const contentX = Math.min(outerPadding, Math.max(24, Math.floor((width - 560) / 2)));
        const contentWidth = Math.max(520, width - contentX * 2);
        const initialSections = [
            this.createAiRepairPageHeaderSection(idFor, 0, 0, width, prompt, pageKind),
            this.createAiRepairPageHeroSection(idFor, contentX, 118, contentWidth, prompt, pageKind)
        ];
        const initialBottom = initialSections.reduce((bottom, section) => Math.max(bottom, this.numericAiDimension(section.y, 0) + this.numericAiDimension(section.height, 0)), 0);
        const root: OpenPencilNode = this.createAiRepairFrame(rootId, 'Canvas AI completed page', 'page', x, 0, width, initialBottom + 24, '#eeeeee', 0, initialSections);
        const rootDocument: OpenPencilDocument = {
            ...document,
            pages: (document.pages ?? []).map(candidate => candidate.id === page.id
                ? {
                    ...candidate,
                    children: [root]
                }
                : candidate)
        };
        const sectionOperations = this.createDeterministicWebPageCompletionRepairOperations(rootDocument, prompt, {
            ...report,
            metrics: {
                ...report.metrics,
                sectionCount: 0,
                cardLikeCount: 0,
                nodeCount: 0
            }
        });
        const createRoot = sectionOperations.find((operation): operation is Extract<OpenPencilDesignOperation, { operation: 'updateNode' }> =>
            operation.operation === 'updateNode' && operation.nodeId === rootId);
        const rootHeight = createRoot ? this.numericAiDimension(createRoot.changes.height, report.goal.targetMinHeight) : report.goal.targetMinHeight;
        const rootNode = {
            ...root,
            height: rootHeight
        };
        const placeholderRemovals = this.documents.flattenNodes(document)
            .filter(node => this.isInternalCanvasPlaceholderNode(node))
            .map((node): OpenPencilDesignOperation => ({ operation: 'removeNode', nodeId: node.id }));
        return [
            {
                operation: 'updatePage',
                pageId: page.id,
                changes: {
                    width: Math.max(this.numericAiDimension(page.width, width), width),
                    height: Math.max(this.numericAiDimension(page.height, rootHeight), rootHeight + 80),
                    background: '#eeeeee'
                }
            },
            ...placeholderRemovals,
            {
                operation: 'createNode',
                parentId: null,
                node: rootNode
            },
            ...sectionOperations.filter(operation => operation.operation !== 'updatePage' && !(operation.operation === 'updateNode' && operation.nodeId === rootId)),
            { operation: 'setSelection', nodeIds: [rootId] }
        ];
    }

    protected createAiRepairPageHeaderSection(
        idFor: (suffix: string) => string,
        x: number,
        y: number,
        width: number,
        prompt: string,
        kind: OpenPencilAiRepairPageKind
    ): OpenPencilNode {
        const fill = '#ffffff';
        const brand = this.aiRepairBrandNameFromPrompt(prompt, this.aiRepairLabel(prompt, 'Pagina principal', 'Main page'));
        const inset = width >= 1120 ? 82 : Math.max(24, Math.round(width * 0.07));
        const rowWidth = Math.max(520, width - inset * 2);
        const brandWidth = Math.max(150, Math.min(190, Math.round(rowWidth * 0.18)));
        const accountWidth = Math.max(128, Math.min(180, Math.round(rowWidth * 0.17)));
        const primaryGap = 24;
        const searchWidth = Math.max(320, rowWidth - brandWidth - accountWidth - primaryGap * 2);
        const secondaryGap = 34;
        const locationWidth = Math.min(190, Math.max(150, Math.round(rowWidth * 0.18)));
        const navWidth = Math.max(260, rowWidth - locationWidth - secondaryGap);
        const searchPlaceholder = this.aiRepairLabel(prompt, 'Buscar nesta experiencia...', 'Search this experience...');
        const locationLabel = this.aiRepairLabel(prompt, 'Entrada principal', 'Primary entry');
        return this.createAiRepairFrame(idFor('header-section'), 'Completion header section', 'section', x, y, width, 108, fill, 0, [
            this.createAiRepairFrame(idFor('header-primary-row'), 'Completion header primary section', 'section', inset, 12, rowWidth, 44, fill, 0, [
                this.createAiRepairFrame(idFor('header-brand-box'), 'Completion header brand section', 'section', 0, 0, brandWidth, 44, fill, 0, [
                    this.createAiRepairText(idFor('header-brand'), brand, 0, 10, brandWidth, 24, 18, 900, '#111827')
                ], { transparent: true }),
                this.createAiRepairFrame(idFor('header-search'), 'Completion header search section', 'section', brandWidth + primaryGap, 3, searchWidth, 38, '#ffffff', 6, [
                    this.createAiRepairText(idFor('header-search-placeholder'), searchPlaceholder, 18, 10, Math.max(180, searchWidth - 36), 18, 13, 500, '#64748b')
                ], { stroke: '#d1d5db' }),
                this.createAiRepairFrame(idFor('header-account-box'), 'Completion header account section', 'section', brandWidth + primaryGap + searchWidth + primaryGap, 0, accountWidth, 44, fill, 0, [
                    this.createAiRepairText(idFor('header-account'), this.aiRepairLabel(prompt, 'Entre  Compras', 'Sign in  Orders'), 0, 12, accountWidth, 20, 13, 700, '#111827', 'right')
                ], { transparent: true })
            ], { transparent: true }),
            this.createAiRepairFrame(idFor('header-secondary-row'), 'Completion header secondary section', 'section', inset, 64, rowWidth, 30, fill, 0, [
                this.createAiRepairFrame(idFor('header-location-box'), 'Completion header location section', 'section', 0, 0, locationWidth, 30, fill, 0, [
                    this.createAiRepairText(idFor('header-location'), locationLabel, 0, 7, locationWidth, 18, 12, 600, '#374151')
                ], { transparent: true }),
                this.createAiRepairFrame(idFor('header-nav-box'), 'Completion header navigation section', 'section', locationWidth + secondaryGap, 0, navWidth, 30, fill, 0, [
                    this.createAiRepairText(idFor('header-nav'), this.aiRepairLabel(prompt, 'Recursos    Solucoes    Precos    Suporte', 'Features    Solutions    Pricing    Support'), 0, 7, navWidth, 18, 12, 600, '#374151')
                ], { transparent: true })
            ], { transparent: true })
        ]);
    }

    protected createAiRepairPageHeroSection(
        idFor: (suffix: string) => string,
        x: number,
        y: number,
        width: number,
        prompt: string,
        kind: OpenPencilAiRepairPageKind
    ): OpenPencilNode {
        const title = this.aiRepairLabel(prompt, 'Experiencia principal clara', 'Clear primary experience');
        const copy = this.aiRepairLabel(prompt, 'Um bloco principal estabelece a promessa visual antes dos detalhes.', 'A primary block establishes the visual promise before details.');
        const textWidth = Math.max(260, Math.min(Math.round(width * 0.52), width - 360));
        const visualWidth = Math.max(180, Math.min(290, width - textWidth - 96));
        const visualX = Math.max(textWidth + 68, width - visualWidth - 34);
        return this.createAiRepairFrame(idFor('hero-section'), 'Completion hero section', 'section', x, y, width, 260, '#1f2937', 14, [
            this.createAiRepairFrame(idFor('hero-copy-group'), 'Completion hero copy section', 'section', 34, 34, textWidth, 206, '#1f2937', 0, [
                this.createAiRepairText(idFor('hero-eyebrow'), this.aiRepairLabel(prompt, 'DESTAQUE', 'HIGHLIGHT'), 0, 0, Math.min(280, textWidth), 20, 12, 900, '#dbeafe'),
                this.createAiRepairText(idFor('hero-title'), title, 0, 38, textWidth, 58, 36, 900, '#ffffff'),
                this.createAiRepairText(idFor('hero-copy'), copy, 0, 110, textWidth, 42, 16, 600, '#e0f2fe'),
                this.createAiRepairFrame(idFor('hero-action'), 'Hero action', 'button', 0, 168, 128, 38, '#2563eb', 8, [
                    this.createAiRepairText(idFor('hero-action-label'), this.aiRepairLabel(prompt, 'Explorar', 'Explore'), 16, 10, 96, 18, 13, 800, '#ffffff', 'center')
                ])
            ], { transparent: true }),
            this.createAiRepairVisual(idFor('hero-visual'), visualX, 38, visualWidth, 174, '#dbeafe')
        ], { shadow: true });
    }

    protected createDeterministicBoundedCompositionCompletionRepairOperations(
        document: OpenPencilDocument,
        prompt: string,
        report: OpenPencilAiCompletenessReport
    ): OpenPencilDesignOperation[] {
        const page = this.documents.getActivePage(document);
        const root = this.findAiCompletionRoot(document, report.goal);
        if (!root) {
            return [];
        }
        const idFor = this.createAiRepairIdFactory(document, prompt);
        const width = Math.max(320, root.rootWidth);
        const padding = Math.max(24, Math.round(width * 0.07));
        let y = Math.max(padding, Math.round(root.contentBottom + 22));
        const availableWidth = Math.max(240, width - padding * 2);
        const modules: OpenPencilNode[] = [
            this.createAiRepairFrame(idFor('bounded-detail-panel'), 'Completion detail panel', 'section', padding, y, availableWidth, 130, '#ffffff', 18, [
                this.createAiRepairText(idFor('bounded-detail-title'), this.aiRepairLabel(prompt, 'Detalhe principal', 'Primary detail'), 24, 24, availableWidth - 48, 30, 22, 800, '#111827'),
                this.createAiRepairText(idFor('bounded-detail-copy'), this.aiRepairLabel(prompt, 'Conteudo complementar para fechar a hierarquia visual solicitada.', 'Supporting content completes the requested visual hierarchy.'), 24, 64, availableWidth - 48, 44, 15, 500, '#475569')
            ])
        ];
        y += 154;
        modules.push(this.createAiRepairFrame(idFor('bounded-support-row'), 'Completion support row', 'section', padding, y, availableWidth, 110, '#f8fafc', 16, [
            this.createAiRepairVisual(idFor('bounded-support-visual-one'), 22, 24, Math.round((availableWidth - 72) / 2), 62, '#dbeafe'),
            this.createAiRepairVisual(idFor('bounded-support-visual-two'), Math.round((availableWidth + 24) / 2), 24, Math.round((availableWidth - 72) / 2), 62, '#dcfce7')
        ]));
        const finalBottom = modules.reduce((bottom, section) => Math.max(bottom, this.numericAiDimension(section.y, 0) + this.numericAiDimension(section.height, 0)), 0);
        const rootHeight = Math.max(root.rootHeight, finalBottom + padding);
        return [
            {
                operation: 'updatePage',
                pageId: page.id,
                changes: {
                    height: Math.max(this.numericAiDimension(page.height, rootHeight), this.numericAiDimension(root.node.y, 0) + rootHeight + 64)
                }
            },
            {
                operation: 'updateNode',
                nodeId: root.node.id,
                changes: {
                    height: rootHeight,
                    clipContent: false
                }
            },
            ...modules.map((node): OpenPencilDesignOperation => ({ operation: 'createNode', parentId: root.node.id, node })),
            { operation: 'setSelection', nodeIds: [modules[modules.length - 1].id] }
        ];
    }

    protected findAiCompletionRoot(document: OpenPencilDocument, goal: OpenPencilAiCompletenessGoal): OpenPencilAiCompletionRoot | undefined {
        const page = this.documents.getActivePage(document);
        const pageWidth = this.numericAiDimension(page.width, goal.preservePageWidth ? 1200 : 900);
        const candidates = (page.children ?? [])
            .filter(node => node.visible !== false && node.type === 'frame')
            .map(node => {
                const width = this.numericAiDimension(node.width, pageWidth);
                const height = this.numericAiDimension(node.height, this.estimatedAiNodeHeight(node));
                const role = String(node.role ?? '').toLowerCase();
                const name = String(node.name ?? '').toLowerCase();
                const children = this.flattenAiNodeChildren(node).length;
                const pageRole = /\b(page|home|screen|artboard|composition)\b/i.test(`${role} ${name}`) ? 24 : 0;
                const widthFit = this.clamp(width / Math.max(1, pageWidth), 0, 1.3) * 18;
                const childScore = Math.min(children, 80) * 0.35;
                const heightScore = Math.min(height / 80, 18);
                return {
                    node,
                    width,
                    height,
                    score: pageRole + widthFit + childScore + heightScore
                };
            })
            .sort((left, right) => right.score - left.score);
        const selected = candidates[0];
        if (!selected) {
            return undefined;
        }
        return {
            node: selected.node,
            pageWidth,
            rootWidth: selected.width,
            rootHeight: selected.height,
            contentBottom: this.aiNodeContentBottom(selected.node.children ?? [], 0)
        };
    }

    protected flattenAiNodeChildren(node: OpenPencilNode): OpenPencilNode[] {
        return (node.children ?? []).flatMap(child => [child, ...this.flattenAiNodeChildren(child)]);
    }

    protected aiNodeContentBottom(nodes: OpenPencilNode[], offsetY: number): number {
        return nodes.reduce((bottom, node) => {
            if (node.visible === false) {
                return bottom;
            }
            const y = offsetY + this.numericAiDimension(node.y, 0);
            const height = this.numericAiDimension(node.height, this.estimatedAiNodeHeight(node));
            const childBottom = node.children?.length ? this.aiNodeContentBottom(node.children, y) : 0;
            const ownBottom = this.shouldCountAiRepairOwnBottom(node, y, height, childBottom)
                ? y + height
                : 0;
            return Math.max(bottom, ownBottom, childBottom);
        }, 0);
    }

    protected shouldCountAiRepairOwnBottom(node: OpenPencilNode, y: number, height: number, childBottom: number): boolean {
        if (node.type === 'text') {
            return !!this.aiTextContent(node).trim();
        }
        if (!node.children?.length) {
            return this.isAiCompletenessVisualNode(node) || this.numericAiDimension(node.width, 0) > 0 && height > 0;
        }
        const label = `${node.name ?? ''} ${node.role ?? ''}`.toLowerCase();
        if (/\b(page|root|document|canvas|artboard)\b/.test(label)) {
            return false;
        }
        const usefulChildSpan = Math.max(0, childBottom - y);
        if (usefulChildSpan <= 0) {
            return false;
        }
        return height <= Math.max(420, usefulChildSpan + 240);
    }

    protected createAiRepairIdFactory(document: OpenPencilDocument, prompt: string): (suffix: string) => string {
        const seed = prompt.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32) || 'canvas-ai';
        const existing = new Set(this.documents.flattenNodes(document).map(node => node.id));
        let base = `ai-repair-${seed}`;
        let baseIndex = 2;
        while ([...existing].some(id => id === base || id.startsWith(`${base}-`))) {
            base = `ai-repair-${seed}-${baseIndex++}`;
        }
        const used = new Set(existing);
        return (suffix: string): string => {
            const normalized = suffix.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'node';
            const candidateBase = `${base}-${normalized}`;
            let candidate = candidateBase;
            let index = 2;
            while (used.has(candidate)) {
                candidate = `${candidateBase}-${index++}`;
            }
            used.add(candidate);
            return candidate;
        };
    }

    protected detectAiRepairPageKind(prompt: string): OpenPencilAiRepairPageKind {
        const lower = prompt.toLowerCase();
        if (/\b(blog|news|noticias|notícias|conte[uú]do|magazine|media|portal|curso|educa[cç][aã]o|newsletter)\b/i.test(lower)) {
            return 'content';
        }
        if (/\b(landing|saas|startup|servi[cç]o|service|produto digital|pricing|pre[cç]os|conversion|lead)\b/i.test(lower)) {
            return 'landing';
        }
        return 'generic';
    }

    protected aiRepairLabel(prompt: string, pt: string, en: string): string {
        return /\b(um|uma|com|para|p[aá]gina|inicial|oferta|produto|loja|voce|você|gratis|gr[aá]tis|benef[ií]cio|compra|crie|faca|fa[cç]a)\b/i.test(prompt)
            ? pt
            : en;
    }

    protected aiRepairBrandNameFromPrompt(prompt: string, fallback: string): string {
        const patterns = [
            /\b(?:com\s+o\s+nome|com\s+a\s+marca|nome|marca|chamado|chamada|called|named|with\s+the\s+name)\s+["']?([A-Za-z0-9À-ÖØ-öø-ÿ&+.' -]{2,48})/i,
            /\b(?:p[aá]gina\s+inicial|homepage|home\s+page|site|website)\s+(?:do|da|de|of|for)\s+["']?([A-Za-z0-9À-ÖØ-öø-ÿ&+.' -]{2,48})/i,
            /\b(?:copy|clone|c[oó]pia|recria[cç][aã]o|refer[eê]ncia)\s+(?:do|da|de|of|for)?\s*["']?([A-Za-z0-9À-ÖØ-öø-ÿ&+.' -]{2,48})/i
        ];
        for (const pattern of patterns) {
            const match = pattern.exec(prompt);
            const cleaned = this.cleanAiRepairBrandName(match?.[1]);
            if (cleaned) {
                return cleaned;
            }
        }
        return fallback;
    }

    protected cleanAiRepairBrandName(value: string | undefined): string | undefined {
        if (!value) {
            return undefined;
        }
        const cleaned = value
            .replace(/[.,;:!?].*$/, '')
            .replace(/\s+(?:com|with|como|as|que|that|para|for|e|and)\b.*$/i, '')
            .replace(/^["'“”]+|["'“”]+$/g, '')
            .replace(/\s{2,}/g, ' ')
            .trim();
        if (!cleaned || cleaned.length < 2 || /^(um|uma|a|the|pagina|página|site|homepage|marketplace|loja)$/i.test(cleaned)) {
            return undefined;
        }
        return cleaned.slice(0, 48).trim();
    }

    protected createAiRepairFeatureSection(idFor: (suffix: string) => string, x: number, y: number, width: number, prompt: string, kind: OpenPencilAiRepairPageKind): OpenPencilNode {
        const title = kind === 'content'
            ? this.aiRepairLabel(prompt, 'Conteudos em destaque', 'Featured content')
            : this.aiRepairLabel(prompt, 'Destaques principais', 'Primary highlights');
        const cardWidth = Math.floor((width - 32) / 3);
        const cards = [0, 1, 2].map(index => {
            const resolvedCardWidth = index === 2 ? width - (cardWidth + 16) * 2 : cardWidth;
            const label = [
                this.aiRepairLabel(prompt, 'Valor claro', 'Clear value'),
                this.aiRepairLabel(prompt, 'Fluxo simples', 'Simple flow'),
                this.aiRepairLabel(prompt, 'Suporte visivel', 'Visible support')
            ][index];
            const copy = this.aiRepairLabel(prompt, 'Texto curto para completar a narrativa visual.', 'Short copy completes the visual story.');
            return this.createAiRepairFeatureCard(idFor, index, label, copy, index * (cardWidth + 16), 0, resolvedCardWidth);
        });
        return this.createAiRepairFrame(idFor('feature-section'), 'Completion feature section', 'section', x, y, width, 316, '#ffffff', 14, [
            this.createAiRepairText(idFor('feature-title'), title, 0, 0, 420, 34, 26, 800, '#111827'),
            this.createAiRepairFrame(idFor('feature-row'), 'Completion feature row section', 'section', 0, 58, width, 230, '#ffffff', 0,
                cards,
                { transparent: true, layout: 'none' })
        ], { layout: 'none' });
    }

    protected createAiRepairFeatureCard(
        idFor: (suffix: string) => string,
        index: number,
        title: string,
        copy: string,
        x: number,
        y: number,
        width: number
    ): OpenPencilNode {
        const cardId = `feature-card-${index + 1}`;
        const palette = ['#dbeafe', '#dcfce7', '#fef3c7'];
        const compact = width < 240;
        const inset = compact ? 18 : 22;
        const titleFontSize = compact ? 15 : 17;
        if (compact) {
            const textWidth = Math.max(90, width - inset * 2);
            return this.createAiRepairFrame(idFor(cardId), `Feature ${index + 1}`, 'card', x, y, width, 230, '#f8fafc', 14, [
                this.createAiRepairVisual(idFor(`${cardId}-visual`), inset, 20, 44, 44, palette[index]),
                this.createAiRepairText(idFor(`${cardId}-title`), title, inset, 78, textWidth, 52, titleFontSize, 800, '#111827'),
                this.createAiRepairText(idFor(`${cardId}-copy`), copy, inset, 140, textWidth, 66, 13, 500, '#64748b')
            ], { layout: 'none' });
        }
        const visualSize = 46;
        const textX = inset + visualSize + 20;
        const textWidth = Math.max(140, width - textX - inset);
        return this.createAiRepairFrame(idFor(cardId), `Feature ${index + 1}`, 'card', x, y, width, 230, '#f8fafc', 14, [
            this.createAiRepairVisual(idFor(`${cardId}-visual`), inset, 34, visualSize, visualSize, palette[index]),
            this.createAiRepairText(idFor(`${cardId}-title`), title, textX, 28, textWidth, 52, titleFontSize, 800, '#111827'),
            this.createAiRepairText(idFor(`${cardId}-copy`), copy, textX, 96, textWidth, 86, 13, 500, '#64748b')
        ], { layout: 'none' });
    }

    protected createAiRepairCardGridSection(idFor: (suffix: string) => string, x: number, y: number, width: number, prompt: string, kind: OpenPencilAiRepairPageKind): OpenPencilNode {
        const labels = kind === 'content'
            ? [this.aiRepairLabel(prompt, 'Guia rapido', 'Quick guide'), this.aiRepairLabel(prompt, 'Analise', 'Analysis'), this.aiRepairLabel(prompt, 'Novidades', 'Updates')]
            : [this.aiRepairLabel(prompt, 'Modulo um', 'Module one'), this.aiRepairLabel(prompt, 'Modulo dois', 'Module two'), this.aiRepairLabel(prompt, 'Modulo tres', 'Module three')];
        const cardWidth = Math.floor((width - 28) / 3);
        return this.createAiRepairFrame(idFor(`${kind}-grid-section`), 'Completion card grid section', 'section', x, y, width, 285, '#ffffff', 14, [
            this.createAiRepairText(idFor(`${kind}-grid-title`), this.aiRepairLabel(prompt, 'Mais para explorar', 'More to explore'), 0, 0, 360, 32, 24, 800, '#111827'),
            this.createAiRepairFrame(idFor(`${kind}-grid-row`), `Completion ${kind} grid row section`, 'section', 0, 54, width, 206, '#ffffff', 0,
                labels.map((label, index) => {
                    const resolvedCardWidth = index === 2 ? width - (cardWidth + 14) * 2 : cardWidth;
                    return this.createAiRepairFrame(idFor(`${kind}-grid-card-${index + 1}`), label, 'card', index * (cardWidth + 14), 0, resolvedCardWidth, 206, '#ffffff', 8, [
                        this.createAiRepairVisual(idFor(`${kind}-grid-card-${index + 1}-visual`), 14, 14, resolvedCardWidth - 28, 82, ['#e0f2fe', '#ede9fe', '#dcfce7'][index]),
                        this.createAiRepairText(idFor(`${kind}-grid-card-${index + 1}-title`), label, 16, 112, resolvedCardWidth - 32, 26, 17, 800, '#111827'),
                        this.createAiRepairText(idFor(`${kind}-grid-card-${index + 1}-copy`), this.aiRepairLabel(prompt, 'Descricao breve com acao clara.', 'Brief description with a clear action.'), 16, 144, resolvedCardWidth - 32, 42, 13, 500, '#64748b')
                    ], { stroke: '#e5e7eb', shadow: true, layout: 'none' });
                }),
                { transparent: true, layout: 'none' })
        ], { layout: 'none' });
    }

    protected createAiRepairPromoSection(idFor: (suffix: string) => string, x: number, y: number, width: number, prompt: string, key: string, title: string, copy: string): OpenPencilNode {
        return this.createAiRepairFrame(idFor(`${key}-promo`), 'Completion promo banner', 'section', x, y, width, 154, '#1f2937', 14, [
            this.createAiRepairText(idFor(`${key}-promo-eyebrow`), this.aiRepairLabel(prompt, 'BENEFICIOS EXCLUSIVOS', 'EXCLUSIVE BENEFITS'), 34, 30, 320, 18, 11, 800, '#fde68a'),
            this.createAiRepairText(idFor(`${key}-promo-title`), title, 34, 56, Math.round(width * 0.58), 38, 28, 800, '#ffffff'),
            this.createAiRepairText(idFor(`${key}-promo-copy`), copy, 34, 102, Math.round(width * 0.58), 30, 14, 500, '#e5e7eb'),
            this.createAiRepairFrame(idFor(`${key}-promo-button`), 'Promo action', 'button', width - 218, 52, 170, 46, '#fff159', 8, [
                this.createAiRepairText(idFor(`${key}-promo-button-label`), this.aiRepairLabel(prompt, 'Conhecer', 'Learn more'), 18, 14, 134, 18, 13, 800, '#111827', 'center')
            ])
        ]);
    }

    protected createAiRepairFooterSection(idFor: (suffix: string) => string, x: number, y: number, width: number, prompt: string, kind: OpenPencilAiRepairPageKind): OpenPencilNode {
        const title = this.aiRepairLabel(prompt, 'Fechamento da experiencia', 'Experience close');
        return this.createAiRepairFrame(idFor('footer-section'), 'Completion footer section', 'section', x, y, width, 230, '#ffffff', 10, [
            this.createAiRepairText(idFor('footer-title'), title, 0, 0, 420, 32, 24, 800, '#111827'),
            this.createAiRepairFrame(idFor('footer-row'), 'Completion footer row section', 'section', 0, 58, width, 138, '#ffffff', 0,
                [0, 1, 2].map(index => {
                    const columnWidth = Math.floor((width - 48) / 3);
                    const labels = [
                        [this.aiRepairLabel(prompt, 'Explorar', 'Explore'), this.aiRepairLabel(prompt, 'Visao geral\nRecursos\nProximos passos', 'Overview\nFeatures\nNext steps')],
                        [this.aiRepairLabel(prompt, 'Conteudo', 'Content'), this.aiRepairLabel(prompt, 'Detalhes\nFluxos\nExemplos', 'Details\nFlows\nExamples')],
                        [this.aiRepairLabel(prompt, 'Suporte', 'Support'), this.aiRepairLabel(prompt, 'Ajuda\nContato\nDocumentacao', 'Help\nContact\nDocs')]
                    ][index];
                    return this.createAiRepairFrame(idFor(`footer-column-${index + 1}`), labels[0], 'section', index * (columnWidth + 24), 0, index === 2 ? width - (columnWidth + 24) * 2 : columnWidth, 138, '#f8fafc', 10, [
                        this.createAiRepairText(idFor(`footer-column-${index + 1}-title`), labels[0], 22, 20, columnWidth - 44, 24, 16, 800, '#111827'),
                        this.createAiRepairText(idFor(`footer-column-${index + 1}-links`), labels[1], 22, 54, columnWidth - 44, 62, 13, 500, '#475569')
                    ]);
                }),
                { transparent: true })
        ]);
    }

    protected createAiRepairFrame(
        id: string,
        name: string,
        role: string,
        x: number,
        y: number,
        width: number,
        height: number,
        color: string,
        radius: number,
        children: OpenPencilNode[] = [],
        options: {
            stroke?: string;
            shadow?: boolean;
            layout?: OpenPencilNode['layout'];
            gap?: OpenPencilNode['gap'];
            padding?: OpenPencilNode['padding'];
            alignItems?: OpenPencilNode['alignItems'];
            justifyContent?: OpenPencilNode['justifyContent'];
            clipContent?: boolean;
            transparent?: boolean;
        } = {}
    ): OpenPencilNode {
        const repairSection = /^Completion .*(?:section|shelf|strip|banner)$/i.test(name)
            || /^Completion footer section$/i.test(name);
        const semanticRole = role === 'card' || role === 'button' || role === 'row' || role === 'grid';
        const resolvedRole = role === 'page' || semanticRole || (role === 'section' && repairSection) ? role : 'overlay';
        return {
            id,
            type: 'frame',
            name,
            role: resolvedRole,
            x,
            y,
            width,
            height,
            cornerRadius: radius,
            fill: options.transparent ? undefined : [{ type: 'solid', color }],
            stroke: options.transparent ? undefined : options.stroke ? { color: options.stroke, width: 1 } : color === '#ffffff' ? { color: '#e5e7eb', width: 1 } : undefined,
            effects: options.shadow ? [{ type: 'shadow', offsetX: 0, offsetY: 10, blur: 22, spread: 0, color: 'rgba(15, 23, 42, 0.10)' }] : undefined,
            layout: options.layout ?? 'none',
            gap: options.gap,
            padding: options.padding,
            alignItems: options.alignItems,
            justifyContent: options.justifyContent,
            clipContent: options.clipContent,
            children
        };
    }

    protected createAiRepairVisual(id: string, x: number, y: number, width: number, height: number, color: string): OpenPencilNode {
        return {
            id,
            type: 'image',
            name: 'Completion visual placeholder',
            role: 'overlay',
            x,
            y,
            width,
            height,
            cornerRadius: 8,
            layout: 'none',
            fill: [{ type: 'solid', color }],
            stroke: { color: '#cbd5e1', width: 1 }
        };
    }

    protected createAiRepairText(
        id: string,
        content: string,
        x: number,
        y: number,
        width: number,
        height: number,
        fontSize: number,
        fontWeight: number,
        color: string,
        textAlign: OpenPencilNode['textAlign'] = 'left'
    ): OpenPencilNode {
        return {
            id,
            type: 'text',
            name: content.slice(0, 48),
            role: 'overlay',
            x,
            y,
            width,
            height,
            content,
            layout: 'none',
            fontSize,
            fontWeight,
            lineHeight: 1.25,
            textAlign,
            textGrowth: 'fixed-width',
            fill: [{ type: 'solid', color }]
        };
    }

    protected async applyEmergencyAiFallback(
        _widget: OpenPencilEditorWidget,
        _prompt: string,
        _selection: string[],
        _requestMode: OpenPencilAiDesignRequest['mode'] | undefined,
        _beforeSerialized: string
    ): Promise<boolean> {
        // Canvas AI must rely only on the selected model/provider. Deterministic local
        // fallbacks fabricated generic skeletons ("Navegacao Conteudo Suporte", grey bands,
        // tiny pages) that masked real model failures, so they are disabled. When the model
        // genuinely produces no usable canvas changes, callers fall through to the explicit
        // "no change" error messaging instead of applying synthetic local content.
        canvasAiFrontendDebug('emergency-fallback-disabled', {});
        return false;
    }

    protected createEmergencyAiFallbackOperations(widget: OpenPencilEditorWidget, prompt: string): OpenPencilDesignOperation[] {
        const document = widget.getDocument();
        if (!document) {
            return [];
        }
        const report = this.evaluateAiCompleteness(document, prompt, [], undefined);
        if (report.goal.profile === 'web-page') {
            return this.createDeterministicWebPageRootRepairOperations(document, prompt, report);
        }
        const page = this.documents.getActivePage(document);
        const baseId = this.createEmergencyAiFallbackIdBase(prompt, document);
        const isWebPage = this.shouldPreserveAiPageWidth(prompt);
        const pageKind = isWebPage ? this.detectAiRepairPageKind(prompt) : 'generic';
        const pageWidth = isWebPage ? 1200 : Math.max(720, Math.min(1120, Number(page.width) || 960));
        const rootWidth = isWebPage ? 1200 : 760;
        const rootHeight = isWebPage ? 840 : 520;
        const root = this.createEmergencyAiFallbackRoot(baseId, prompt, isWebPage, rootWidth, rootHeight, pageKind);
        return [
            {
                operation: 'updatePage',
                pageId: page.id,
                changes: {
                    width: Math.max(Number(page.width) || 0, pageWidth),
                    height: Math.max(Number(page.height) || 0, rootHeight + 80),
                    background: isWebPage ? '#eeeeee' : '#f8fafc'
                }
            },
            {
                operation: 'createNode',
                parentId: null,
                node: root
            },
            { operation: 'setSelection', nodeIds: [root.id] }
        ];
    }

    protected createEmergencyAiFallbackRoot(baseId: string, prompt: string, isWebPage: boolean, width: number, height: number, kind: OpenPencilAiRepairPageKind = 'generic'): OpenPencilNode {
        const headline = this.emergencyAiFallbackHeadline(prompt);
        const body = this.emergencyAiFallbackBody(prompt);
        if (isWebPage) {
            const headerFill = '#ffffff';
            const navText = this.aiRepairLabel(prompt, 'Navegacao   Conteudo   Suporte', 'Navigation   Content   Support');
            return {
                id: `${baseId}-root`,
                type: 'frame',
                name: 'Canvas AI fallback page',
                role: 'page',
                x: 0,
                y: 0,
                width,
                height,
                fill: [{ type: 'solid', color: '#eeeeee' }],
                children: [
                    this.fallbackFrame(`${baseId}-nav`, 'Fallback navigation', 'navigation', 0, 0, width, 96, headerFill, 0, [
                        this.fallbackText(`${baseId}-brand`, headline, 82, 30, 260, 28, 22, 800, '#333333'),
                        this.fallbackFrame(`${baseId}-search`, 'Fallback search field', 'search', 360, 24, 560, 42, '#ffffff', 6),
                        this.fallbackText(`${baseId}-nav-link`, navText, 82, 68, 360, 20, 13, 500, '#333333')
                    ]),
                    this.fallbackFrame(`${baseId}-hero`, 'Fallback hero section', 'hero', 82, 132, 1036, 220, '#ffffff', 14, [
                        this.fallbackText(`${baseId}-hero-title`, headline, 38, 42, 520, 48, 34, 800, '#111827'),
                        this.fallbackText(`${baseId}-hero-copy`, body, 38, 108, 520, 52, 16, 500, '#475569'),
                        this.fallbackFrame(`${baseId}-hero-visual`, 'Fallback hero visual', 'image', 700, 34, 280, 152, '#e2e8f0', 14)
                    ]),
                    this.fallbackFrame(`${baseId}-cards`, 'Fallback content cards', 'section', 82, 390, 1036, 300, '#ffffff', 10, [
                        this.fallbackText(`${baseId}-cards-title`, 'Estrutura inicial', 26, 24, 260, 28, 22, 700, '#111827'),
                        this.fallbackCard(`${baseId}-card-one`, 'Modulo principal', 26, 74, 310),
                        this.fallbackCard(`${baseId}-card-two`, 'Conteudo secundario', 363, 74, 310),
                        this.fallbackCard(`${baseId}-card-three`, 'Proxima secao', 700, 74, 310)
                    ])
                ]
            };
        }
        return {
            id: `${baseId}-root`,
            type: 'frame',
            name: 'Canvas AI fallback composition',
            role: 'composition',
            x: 0,
            y: 0,
            width,
            height,
            cornerRadius: 18,
            fill: [{ type: 'solid', color: '#ffffff' }],
            stroke: { color: '#cbd5e1', width: 1 },
            effects: [{ type: 'shadow', offsetX: 0, offsetY: 18, blur: 40, spread: 0, color: 'rgba(15, 23, 42, 0.14)' }],
            children: [
                this.fallbackText(`${baseId}-title`, headline, 42, 42, width - 84, 52, 34, 800, '#111827'),
                this.fallbackText(`${baseId}-copy`, body, 42, 110, width - 84, 48, 16, 500, '#475569'),
                this.fallbackFrame(`${baseId}-visual`, 'Fallback visual area', 'image', 42, 190, width - 84, 190, '#e2e8f0', 16),
                this.fallbackFrame(`${baseId}-action`, 'Fallback primary action', 'button', 42, 418, 180, 52, '#2563eb', 12)
            ]
        };
    }

    protected fallbackCard(id: string, title: string, x: number, y: number, width: number): OpenPencilNode {
        return this.fallbackFrame(id, title, 'card', x, y, width, 178, '#ffffff', 8, [
            this.fallbackFrame(`${id}-visual`, `${title} visual`, 'image', 18, 18, width - 36, 76, '#e2e8f0', 8),
            this.fallbackText(`${id}-title`, title, 18, 112, width - 36, 24, 16, 700, '#111827'),
            this.fallbackText(`${id}-copy`, 'Aguardando detalhes do modelo.', 18, 140, width - 36, 20, 12, 500, '#64748b')
        ]);
    }

    protected fallbackFrame(id: string, name: string, role: string, x: number, y: number, width: number, height: number, color: string, radius: number, children: OpenPencilNode[] = []): OpenPencilNode {
        return {
            id,
            type: 'frame',
            name,
            role,
            x,
            y,
            width,
            height,
            cornerRadius: radius,
            layout: 'none',
            fill: [{ type: 'solid', color }],
            stroke: color === '#ffffff' ? { color: '#e5e7eb', width: 1 } : undefined,
            children
        };
    }

    protected fallbackText(id: string, content: string, x: number, y: number, width: number, height: number, fontSize: number, fontWeight: number, color: string): OpenPencilNode {
        return {
            id,
            type: 'text',
            name: content.slice(0, 48),
            role: 'text',
            x,
            y,
            width,
            height,
            content,
            layout: 'none',
            fontSize,
            fontWeight,
            lineHeight: 1.2,
            textGrowth: 'fixed-width',
            fill: [{ type: 'solid', color }]
        };
    }

    protected createEmergencyAiFallbackIdBase(prompt: string, document: OpenPencilDocument): string {
        const seed = prompt.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 36) || 'canvas-ai';
        const existing = new Set(this.documents.flattenNodes(document).map(node => node.id));
        let candidate = `ai-fallback-${seed}`;
        let suffix = 2;
        while (existing.has(`${candidate}-root`)) {
            candidate = `ai-fallback-${seed}-${suffix++}`;
        }
        return candidate;
    }

    protected emergencyAiFallbackHeadline(prompt: string): string {
        const named = /\b(?:com\s+o\s+nome|chamado|nome|name(?:d)?)\s+["']?([A-Za-z0-9][A-Za-z0-9 ]{1,38}?)(?:["']?[\n.,;:]|$)/i.exec(prompt);
        if (named?.[1]) {
            return named[1].trim().replace(/\s+/g, ' ');
        }
        const cleaned = prompt.replace(/\s+/g, ' ').trim();
        return cleaned.length > 54 ? `${cleaned.slice(0, 51).trim()}...` : cleaned || 'Canvas AI fallback';
    }

    protected emergencyAiFallbackBody(prompt: string): string {
        if (/\b(clone|clonar|copy|copia|c[oó]pia|recrie|parecido|igual|refer[eê]ncia)\b/i.test(prompt)) {
            return 'Estrutura visual inicial criada localmente porque o provider nao aplicou operacoes no canvas.';
        }
        return 'Esqueleto inicial criado localmente para evitar que a geracao termine sem alteracoes visiveis.';
    }

    protected hasVisibleUserCanvasContent(document: OpenPencilDocument): boolean {
        return this.documents.flattenNodes(document).some(node => this.isVisibleUserCanvasNode(node));
    }

    protected isOnlyInternalCanvasPlaceholderContent(document: OpenPencilDocument): boolean {
        const visibleNodes = this.documents.flattenNodes(document).filter(node => this.isVisibleCanvasRenderableNode(node));
        return visibleNodes.length > 0 && visibleNodes.every(node => this.isInternalCanvasPlaceholderNode(node));
    }

    protected isVisibleUserCanvasNode(node: OpenPencilNode): boolean {
        if (node.visible === false || node.enabled === false || node.enabled === 'false' || node.opacity === 0 || node.opacity === '0') {
            return false;
        }
        if (this.isInternalCanvasPlaceholderNode(node)) {
            return false;
        }
        if (node.type === 'text') {
            return typeof node.content === 'string' ? !!node.content.trim() : Array.isArray(node.content) && node.content.some(segment => !!segment.text.trim());
        }
        return this.numericAiNodeSize(node.width) > 0 && this.numericAiNodeSize(node.height) > 0;
    }

    protected isVisibleCanvasRenderableNode(node: OpenPencilNode): boolean {
        if (node.visible === false || node.enabled === false || node.enabled === 'false' || node.opacity === 0 || node.opacity === '0') {
            return false;
        }
        if (node.type === 'text') {
            return typeof node.content === 'string' ? !!node.content.trim() : Array.isArray(node.content) && node.content.some(segment => !!segment.text.trim());
        }
        return this.numericAiNodeSize(node.width) > 0 && this.numericAiNodeSize(node.height) > 0;
    }

    protected isInternalCanvasPlaceholderNode(node: OpenPencilNode): boolean {
        if (node.id === 'hero-card'
            && node.type === 'rectangle'
            && node.name === 'Hero card'
            && this.numericAiNodeSize(node.width) === 520
            && this.numericAiNodeSize(node.height) === 260) {
            return true;
        }
        if (node.type !== 'text' || typeof node.content !== 'string') {
            return false;
        }
        const normalized = node.content.trim().replace(/\s+/g, ' ').toLowerCase();
        return (node.id === 'hero-title' && normalized === 'openpencil design')
            || (node.id === 'hero-copy' && normalized === 'edit this embedded .op design inside theia.');
    }

    protected numericAiNodeSize(value: unknown): number {
        if (typeof value === 'number') {
            return Number.isFinite(value) ? value : 0;
        }
        if (typeof value === 'string') {
            const parsed = Number.parseFloat(value);
            return Number.isFinite(parsed) ? parsed : 0;
        }
        return 0;
    }

    protected resolveCanvasAiFrontendGenerateTimeoutMs(executionChoice: OpenPencilAiExecutionChoice): number {
        const provider = `${executionChoice.execution?.modelProvider ?? ''} ${executionChoice.execution?.providerId ?? ''}`.toLowerCase();
        const model = `${executionChoice.execution?.model ?? ''}`.toLowerCase();
        const slowerRouterModel = /\b(opencode|openrouter|router)\b/.test(provider)
            || /\b(free|flash|mini|mimo|qwen|deepseek|kimi)\b/.test(model);
        return slowerRouterModel ? 260000 : 320000;
    }

    protected withCanvasAiFrontendTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            const timeout = globalThis.setTimeout(() => reject(new Error(message)), timeoutMs);
            promise.then(
                value => {
                    globalThis.clearTimeout(timeout);
                    resolve(value);
                },
                error => {
                    globalThis.clearTimeout(timeout);
                    reject(error);
                }
            );
        });
    }

    protected resolveCanvasAiFrontendStreamTimeoutMs(executionChoice: OpenPencilAiExecutionChoice): number {
        const provider = `${executionChoice.execution?.modelProvider ?? ''} ${executionChoice.execution?.providerId ?? ''}`.toLowerCase();
        const model = `${executionChoice.execution?.model ?? ''}`.toLowerCase();
        const router = /\b(opencode|openrouter|router)\b/.test(provider);
        const slowerModel = /\b(free|flash|mini|mimo|qwen|deepseek|kimi|minimax|nemotron)\b/.test(model);
        return router || slowerModel ? 450000 : 300000;
    }

    protected async executeAiPromptBatchWithFeedback(widget: OpenPencilEditorWidget, document: OpenPencilDocument, selection: string[], prompt: string, requestMode: OpenPencilAiDesignRequest['mode'] | undefined, executionChoice: OpenPencilAiExecutionChoice): Promise<void> {
        canvasAiFrontendDebug('prompt-submit', {
            uri: widget.uri.toString(),
            promptLength: prompt.length,
            selectionCount: selection.length
        });
        widget.setAiStatus(this.createAiStatus('preparing', 'Preparing', 'Canvas AI is preparing changes...'));
        let progress: OpenPencilProgressHandle | undefined = await this.progressService.showProgress({
            text: 'Canvas AI is preparing changes...',
            options: {
                location: 'notification'
            }
        });
        try {
            let generated: OpenPencilAiDesignResult;
            try {
                generated = await this.withCanvasAiFrontendTimeout(this.commandService.generateAiOperations({
                    prompt,
                    document,
                    selection,
                    uri: widget.uri.toString(),
                    mode: requestMode,
                    workspacePath: executionChoice.workspacePath,
                    execution: executionChoice.execution,
                    imagePolicy: executionChoice.imagePolicy
                }), this.resolveCanvasAiFrontendGenerateTimeoutMs(executionChoice), 'Canvas AI batch generation did not finish in time.');
            } catch (error) {
                const beforeSerialized = this.serializeAiWidgetDocument(widget);
                const latestDocument = widget.getDocument();
                if (latestDocument
                    && beforeSerialized
                    && this.isOnlyInternalCanvasPlaceholderContent(latestDocument)
                    && this.isPageLevelAiPrompt(prompt)
                    && await this.applyEmergencyAiFallback(widget, prompt, selection, requestMode, beforeSerialized)) {
                    return;
                }
                throw error;
            }
            canvasAiFrontendDebug('provider-result', {
                source: generated.source,
                providerId: generated.providerId,
                providerLabel: generated.providerLabel,
                operationsCount: generated.operations.length,
                diagnosticsCount: generated.diagnostics?.length ?? 0
            });
            if (!generated.operations.length) {
                canvasAiFrontendDebug('no-operations', {
                    source: generated.source,
                    providerId: generated.providerId,
                    diagnosticsCount: generated.diagnostics?.length ?? 0
                });
                const beforeSerialized = this.serializeAiWidgetDocument(widget);
                const latestDocument = widget.getDocument();
                if (latestDocument
                    && beforeSerialized
                    && this.isOnlyInternalCanvasPlaceholderContent(latestDocument)
                    && this.isPageLevelAiPrompt(prompt)
                    && await this.applyEmergencyAiFallback(widget, prompt, selection, requestMode, beforeSerialized)) {
                    return;
                }
                this.reportAiStatus(widget, progress, this.createAiStatus('error', 'No AI available', 'Canvas AI could not generate a design.'));
                const summary = generated.diagnostics?.length
                    ? generated.diagnostics.slice(0, 3).join(' ')
                    : 'No AI provider returned usable operations.';
                this.messages.warn(`Canvas AI: ${summary}`);
                return;
            }
            this.reportAiStatus(widget, progress, this.createAiStatus('validating', 'Validating', 'Canvas AI is validating the preview...'));
            const preview = await this.createAiPreviewFile(widget, document, generated, prompt, selection, requestMode);
            if (!preview.changed) {
                canvasAiFrontendDebug('apply-rejected', {
                    reason: 'preview-unchanged',
                    operationsCount: generated.operations.length,
                    diagnosticsCount: generated.diagnostics?.length ?? 0
                });
                this.reportAiStatus(widget, progress, this.createAiStatus('error', 'Error', 'Canvas AI preview did not change the design.'));
                this.messages.warn(`Canvas AI generated ${generated.operations.length} operation${generated.operations.length === 1 ? '' : 's'}, but the preview did not change the design${preview.message ? `: ${preview.message}` : '.'}`);
                await this.openAiReviewPanel(widget, generated.operations, preview.reviewModel, preview.target, true, selection, requestMode, this.createAiApplyOptions(prompt, requestMode));
                return;
            }
            if (!preview.valid) {
                canvasAiFrontendDebug('apply-rejected', {
                    reason: 'preview-invalid',
                    operationsCount: generated.operations.length,
                    diagnosticsCount: generated.diagnostics?.length ?? 0
                });
                this.reportAiStatus(widget, progress, this.createAiStatus('error', 'Error', 'Canvas AI preview validation failed.'));
                this.messages.warn(`Canvas AI preview was not applied because validation failed${preview.validationMessage ? `: ${preview.validationMessage}` : '.'}`);
                await this.openAiReviewPanel(widget, generated.operations, preview.reviewModel, preview.target, true, selection, requestMode, this.createAiApplyOptions(prompt, requestMode));
                return;
            }
            const source = generated.source === 'provider'
                ? generated.providerLabel ?? 'configured CyberVinci provider'
                : 'in-process deterministic adapter';
            if (this.isAiAutoApplyEnabled() || this.shouldAutoApplyAiResult(generated, selection, prompt)) {
                await this.applyGeneratedAiOperations(widget, generated.operations, progress, selection, requestMode, {
                    applyOptions: this.createAiApplyOptions(prompt, requestMode)
                });
                return;
            }
            this.reportAiStatus(widget, progress, this.createAiStatus('validating', 'Ready', 'Canvas AI preview is ready.'));
            progress.cancel();
            progress = undefined;
            const action = await this.messages.info(
                `Canvas AI prepared ${generated.operations.length} change${generated.operations.length === 1 ? '' : 's'} via ${source}. Apply to the open design?`,
                'Apply',
                'Always Apply',
                'Review Changes',
                'Keep'
            );
            if (action === 'Review Changes') {
                await this.openAiReviewPanel(widget, generated.operations, preview.reviewModel, preview.target, true, selection, requestMode, this.createAiApplyOptions(prompt, requestMode));
                return;
            }
            if (action !== 'Apply' && action !== 'Always Apply') {
                canvasAiFrontendDebug('apply-rejected', {
                    reason: 'user-declined',
                    operationsCount: generated.operations.length
                });
                return;
            }
            if (action === 'Always Apply') {
                this.setAiAutoApply(true);
            }
            progress = await this.progressService.showProgress({
                text: 'Canvas AI is applying changes...',
                options: {
                    location: 'notification'
                }
            });
            await this.applyGeneratedAiOperations(widget, generated.operations, progress, selection, requestMode, {
                applyOptions: this.createAiApplyOptions(prompt, requestMode)
            });
        } catch (error) {
            canvasAiFrontendDebug('error', {
                errorName: error instanceof Error ? error.name : typeof error,
                messageLength: error instanceof Error ? error.message.length : String(error).length
            });
            this.reportAiStatus(widget, progress, this.createAiStatus('error', 'Error', 'Canvas AI did not finish.'));
            this.messages.error(`Canvas AI did not finish: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            progress?.cancel();
            widget.clearAiStatusSoon();
        }
    }

    protected async applyLocalCompletionAfterStreamingNoOp(
        widget: OpenPencilEditorWidget,
        prompt: string,
        selection: string[],
        requestMode: OpenPencilAiDesignRequest['mode'] | undefined,
        executionChoice: OpenPencilAiExecutionChoice
    ): Promise<boolean> {
        return false;
    }

    protected async executeIncrementalAiPromptWithFeedback(
        widget: OpenPencilEditorWidget,
        document: OpenPencilDocument,
        selection: string[],
        prompt: string,
        requestMode: OpenPencilAiDesignRequest['mode'] | undefined,
        executionChoice: OpenPencilAiExecutionChoice
    ): Promise<void> {
        if (this.isAiProviderStreamingEnabled()) {
            if (await this.executeStreamingAiPromptWithFeedback(widget, document, selection, prompt, requestMode, executionChoice)) {
                return;
            }
            if (await this.applyLocalCompletionAfterStreamingNoOp(widget, prompt, selection, requestMode, executionChoice)) {
                return;
            }
            const latestDocument = widget.getDocument();
            const beforeSerialized = this.serializeAiWidgetDocument(widget);
            if (latestDocument
                && beforeSerialized
                && this.isOnlyInternalCanvasPlaceholderContent(latestDocument)
                && this.isPageLevelAiPrompt(prompt)
                && await this.applyEmergencyAiFallback(widget, prompt, selection, requestMode, beforeSerialized)) {
                return;
            }
            if (this.shouldSkipBatchFallbackAfterStreamingFailure(executionChoice)) {
                this.messages.warn('Canvas AI did not receive streamed OpenPencil operations from the selected slow/free router model. Batch retry was skipped to avoid another long no-op timeout; choose a stronger structured-output model or retry after switching models.');
                return;
            }
        }
        const stages = this.createAiIncrementalStages(prompt, selection, requestMode);
        const rollbackSnapshot = widget.createAiRollbackSnapshot();
        let progress: OpenPencilProgressHandle | undefined = await this.progressService.showProgress({
            text: 'Canvas AI is starting incremental design...',
            options: {
                location: 'notification'
            }
        });
        let appliedTotal = 0;
        let currentSelection = [...selection];
        const diagnostics: string[] = [];
        try {
            for (const [index, stage] of stages.entries()) {
                const latestDocument = widget.getDocument();
                if (!latestDocument) {
                    throw new Error('Canvas document is not loaded.');
                }
                this.reportAiStatus(widget, progress, this.createAiStatus('preparing', stage.label, `Canvas AI is running ${stage.label.toLowerCase()} (${index + 1}/${stages.length})...`));
                let generated: OpenPencilAiDesignResult;
                try {
                    generated = await this.withCanvasAiFrontendTimeout(this.commandService.generateAiOperations({
                        prompt: stage.prompt,
                        document: latestDocument,
                        selection: currentSelection,
                        uri: widget.uri.toString(),
                        mode: stage.mode,
                        workspacePath: executionChoice.workspacePath,
                        execution: executionChoice.execution,
                        imagePolicy: executionChoice.imagePolicy
                    }), this.resolveCanvasAiFrontendGenerateTimeoutMs(executionChoice), `Canvas AI stage '${stage.label}' did not finish in time.`);
                } catch (error) {
                    canvasAiFrontendDebug('incremental-stage-timeout', {
                        stageId: stage.id,
                        stageIndex: index,
                        message: error instanceof Error ? error.message : String(error)
                    });
                    if (stage.required && appliedTotal === 0) {
                        progress.cancel();
                        progress = undefined;
                        const beforeSerialized = this.serializeAiWidgetDocument(widget);
                        const fallbackDocument = widget.getDocument();
                        if (fallbackDocument
                            && beforeSerialized
                            && this.isOnlyInternalCanvasPlaceholderContent(fallbackDocument)
                            && this.isPageLevelAiPrompt(prompt)
                            && await this.applyEmergencyAiFallback(widget, prompt, selection, requestMode, beforeSerialized)) {
                            return;
                        }
                        await this.executeAiPromptBatchWithFeedback(widget, document, selection, prompt, requestMode, executionChoice);
                        return;
                    }
                    if (stage.required) {
                        throw error;
                    }
                    continue;
                }
                diagnostics.push(...(generated.diagnostics ?? []));
                canvasAiFrontendDebug('incremental-stage-result', {
                    stageId: stage.id,
                    stageIndex: index,
                    source: generated.source,
                    providerId: generated.providerId,
                    operationsCount: generated.operations.length,
                    diagnosticsCount: generated.diagnostics?.length ?? 0
                });
                if (!generated.operations.length) {
                    if (stage.required && appliedTotal === 0) {
                        progress.cancel();
                        progress = undefined;
                        await this.executeAiPromptBatchWithFeedback(widget, document, selection, prompt, requestMode, executionChoice);
                        return;
                    }
                    continue;
                }
                const result = await this.applyGeneratedAiOperations(widget, generated.operations, progress, currentSelection, stage.mode, {
                    quiet: true,
                    batchSize: 1,
                    applyOptions: this.createAiApplyOptions(prompt, stage.mode),
                    allowTemporaryLayoutQualityIssues: true
                });
                if (!result?.completed || !result.changed) {
                    if (stage.required) {
                        throw new Error(result?.message ?? `Canvas AI could not apply a visible change for required stage '${stage.label}'.`);
                    }
                    continue;
                }
                appliedTotal += result.applied;
                currentSelection = result.selection;
            }

            if (!appliedTotal) {
                progress.cancel();
                progress = undefined;
                await this.executeAiPromptBatchWithFeedback(widget, document, selection, prompt, requestMode, executionChoice);
                return;
            }

            const firstCompletenessDocument = widget.getDocument();
            let completeness = firstCompletenessDocument ? this.evaluateAiCompleteness(firstCompletenessDocument, prompt, selection, requestMode, executionChoice) : undefined;
            if (completeness && this.shouldRunAiCompletenessContinuation(completeness, false)) {
                let weakPasses = 0;
                const maxPasses = completeness.goal.maxBatchPasses;
                for (let pass = 1; pass <= maxPasses && !completeness.complete; pass++) {
                    const latestDocument = widget.getDocument();
                    if (!latestDocument) {
                        break;
                    }
                    const beforeScore = completeness.metrics.score;
                    const beforePassApplied = appliedTotal;
                    const completionPrompt = this.createAiCompletenessContinuationPrompt(prompt, pass, maxPasses, completeness);
                    this.reportAiStatus(widget, progress, this.createAiStatus('preparing', 'Improving completeness', `Canvas AI is improving design completeness (${pass}/${maxPasses}, score ${completeness.metrics.score.toFixed(2)}/${completeness.goal.targetScore.toFixed(2)})...`));
                    const generated = await this.withCanvasAiFrontendTimeout(this.commandService.generateAiOperations({
                        prompt: completionPrompt,
                        document: latestDocument,
                        selection: [],
                        uri: widget.uri.toString(),
                        mode: 'continuation',
                        workspacePath: executionChoice.workspacePath,
                        execution: executionChoice.execution,
                        imagePolicy: executionChoice.imagePolicy
                    }), this.resolveCanvasAiFrontendGenerateTimeoutMs(executionChoice), `Canvas AI completeness pass ${pass} did not finish in time.`);
                    diagnostics.push(...(generated.diagnostics ?? []));
                    if (!generated.operations.length) {
                        weakPasses++;
                        if (generated.source !== 'provider') {
                            break;
                        }
                        if (this.shouldRetryNoProgressAiCompletenessPass(completeness, pass, maxPasses, false)) {
                            continue;
                        }
                        break;
                    }
                    const result = await this.applyGeneratedAiOperations(widget, generated.operations, progress, [], 'continuation', {
                        quiet: true,
                        batchSize: 1,
                        applyOptions: this.createAiApplyOptions(prompt, 'continuation'),
                        allowTemporaryLayoutQualityIssues: true
                    });
                    if (!result?.completed || !result.changed) {
                        break;
                    }
                    appliedTotal += result.applied;
                    currentSelection = result.selection;
                    const afterDocument = widget.getDocument();
                    completeness = afterDocument ? this.evaluateAiCompleteness(afterDocument, prompt, selection, requestMode, executionChoice) : completeness;
                    const scoreGain = completeness.metrics.score - beforeScore;
                    canvasAiFrontendDebug('incremental-completeness-result', {
                        pass,
                        operationsCount: generated.operations.length,
                        appliedTotal,
                        score: completeness.metrics.score,
                        targetScore: completeness.goal.targetScore,
                        scoreGain,
                        complete: completeness.complete,
                        deficiencies: completeness.deficiencies.slice(0, 4)
                    });
                    if (appliedTotal === beforePassApplied) {
                        weakPasses++;
                        if (this.shouldRetryNoProgressAiCompletenessPass(completeness, pass, maxPasses, false)) {
                            continue;
                        }
                        break;
                    }
                    weakPasses = scoreGain < completeness.goal.minScoreGain ? weakPasses + 1 : 0;
                    if (this.shouldStopWeakAiCompletenessLoop(completeness, weakPasses)) {
                        break;
                    }
                }
            }

            const visualImprovement = await this.runAiVisualReferenceImprovementLoop(widget, prompt, requestMode, executionChoice, progress, async visualPrompt => {
                const latestDocument = widget.getDocument();
                if (!latestDocument) {
                    return { changed: false, applied: 0 };
                }
                const generated = await this.withCanvasAiFrontendTimeout(this.commandService.generateAiOperations({
                    prompt: visualPrompt,
                    document: latestDocument,
                    selection: [],
                    uri: widget.uri.toString(),
                    mode: 'continuation',
                    workspacePath: executionChoice.workspacePath,
                    execution: executionChoice.execution,
                    imagePolicy: executionChoice.imagePolicy
                }), this.resolveCanvasAiFrontendGenerateTimeoutMs(executionChoice), 'Canvas AI visual refinement did not finish in time.');
                diagnostics.push(...(generated.diagnostics ?? []));
                if (!generated.operations.length) {
                    return { changed: false, applied: 0 };
                }
                const result = await this.applyGeneratedAiOperations(widget, generated.operations, progress, [], 'continuation', {
                    quiet: true,
                    batchSize: 1,
                    applyOptions: this.createAiApplyOptions(prompt, 'continuation'),
                    allowTemporaryLayoutQualityIssues: true
                });
                return {
                    changed: !!result?.completed && !!result.changed,
                    applied: result?.applied ?? 0,
                    selection: result?.selection
                };
            });
            appliedTotal += visualImprovement.applied;
            currentSelection = visualImprovement.selection ?? currentSelection;
            if (visualImprovement.compared && visualImprovement.metTarget === false && this.isAiReferenceClonePrompt(prompt)) {
                const score = visualImprovement.score ?? 0;
                const target = visualImprovement.targetScore ?? 0.9;
                const summary = visualImprovement.report?.summary ? ` ${visualImprovement.report.summary}` : '';
                this.reportAiStatus(widget, progress, this.createAiStatus('error', 'Needs refinement', `Canvas AI visual similarity is ${score.toFixed(2)}/${target.toFixed(2)}.${summary}`));
                this.messages.warn(`Canvas AI applied ${appliedTotal} change${appliedTotal === 1 ? '' : 's'}, but visual reference similarity is still ${score.toFixed(2)}/${target.toFixed(2)}.${summary}`);
                return;
            }

            let finalDocument = widget.getDocument();
            let finalCompleteness = finalDocument ? this.evaluateAiCompleteness(finalDocument, prompt, selection, requestMode, executionChoice) : undefined;
            if (finalCompleteness && !finalCompleteness.complete && this.shouldRunAiCompletenessContinuation(finalCompleteness, false)) {
                const recovery = await this.runAiProviderCompletionRecoveryLoop(
                    widget,
                    prompt,
                    requestMode,
                    executionChoice,
                    progress,
                    finalCompleteness,
                    false,
                    currentSelection
                );
                appliedTotal += recovery.applied;
                currentSelection = recovery.selection ?? currentSelection;
                finalDocument = recovery.document ?? widget.getDocument();
                finalCompleteness = recovery.completeness;
            }
            finalDocument = await this.normalizeFinalAiLayoutBeforeCompletion(widget, progress, prompt, requestMode) ?? finalDocument;
            finalCompleteness = finalDocument ? this.evaluateAiCompleteness(finalDocument, prompt, selection, requestMode, executionChoice) : finalCompleteness;
            if (finalCompleteness && !finalCompleteness.complete && finalCompleteness.goal.profile === 'web-page') {
                const summary = finalCompleteness.deficiencies.slice(0, 2).join('; ') || `score ${finalCompleteness.metrics.score.toFixed(2)}/${finalCompleteness.goal.targetScore.toFixed(2)}`;
                this.reportAiStatus(widget, progress, this.createAiStatus('error', 'Incomplete', `Canvas AI stopped before the design met completeness checks: ${summary}.`));
                this.messages.warn(`Canvas AI stopped before the design met completeness checks: ${summary}.`);
                return;
            }
            const validation = finalDocument ? this.commandService.validateDocument(finalDocument) : undefined;
            const layoutQuality = finalDocument ? this.commandService.validateAiLayoutQuality(finalDocument, this.createAiApplyOptions(prompt, requestMode)) : undefined;
            if (!validation?.valid || !layoutQuality?.valid) {
                const issues = validation?.valid === false ? validation.issues : layoutQuality?.issues;
                const detail = issues?.slice(0, 3).map(issue => `${issue.path}: ${issue.message}`).join('; ') ?? 'unknown validation error';
                this.reportAiStatus(widget, progress, this.createAiStatus('error', 'Needs review', 'Canvas AI generated an incremental design with validation issues.'));
                const action = await this.messages.warn(
                    `Canvas AI applied ${appliedTotal} incremental change${appliedTotal === 1 ? '' : 's'}, but final validation reported issues: ${detail}`,
                    'Rollback',
                    'Keep'
                );
                if (action === 'Rollback' && rollbackSnapshot) {
                    widget.restoreAiRollbackSnapshot(rollbackSnapshot);
                    this.reportAiStatus(widget, progress, this.createAiStatus('complete', 'Rolled back', 'Canvas AI changes were rolled back.'));
                }
                return;
            }

            this.reportAiStatus(widget, progress, this.createAiStatus('complete', 'Done', `Canvas AI incrementally applied ${appliedTotal} change${appliedTotal === 1 ? '' : 's'}.`));
            this.messages.info(`Canvas AI incrementally updated the design using the selected provider/model; save when satisfied. Selection: ${this.formatSelection(currentSelection)}.`);
        } catch (error) {
            canvasAiFrontendDebug('incremental-error', {
                appliedTotal,
                errorName: error instanceof Error ? error.name : typeof error,
                messageLength: error instanceof Error ? error.message.length : String(error).length
            });
            if (appliedTotal && !selection.length && requestMode !== 'maintenance' && this.isPageLevelAiPrompt(prompt)) {
                this.reportAiStatus(widget, progress, this.createAiStatus('preparing', 'Completing partial design', 'Canvas AI received partial incremental changes and will continue completeness checks instead of leaving the canvas incomplete.'));
                return;
            }
            this.reportAiStatus(widget, progress, this.createAiStatus('error', 'Error', 'Canvas AI incremental generation stopped.'));
            if (appliedTotal && rollbackSnapshot) {
                const action = await this.messages.error(
                    `Canvas AI stopped after applying ${appliedTotal} incremental change${appliedTotal === 1 ? '' : 's'}: ${error instanceof Error ? error.message : String(error)}`,
                    'Rollback',
                    'Keep'
                );
                if (action === 'Rollback') {
                    widget.restoreAiRollbackSnapshot(rollbackSnapshot);
                }
            } else {
                this.messages.error(`Canvas AI did not finish: ${error instanceof Error ? error.message : String(error)}`);
            }
            if (diagnostics.length) {
                canvasAiFrontendDebug('incremental-diagnostics', {
                    diagnosticsCount: diagnostics.length,
                    diagnostics: diagnostics.slice(0, 5)
                });
            }
        } finally {
            progress?.cancel();
            widget.clearAiStatusSoon();
        }
    }

    protected async executeStreamingAiPromptWithFeedback(
        widget: OpenPencilEditorWidget,
        document: OpenPencilDocument,
        selection: string[],
        prompt: string,
        requestMode: OpenPencilAiDesignRequest['mode'] | undefined,
        executionChoice: OpenPencilAiExecutionChoice
    ): Promise<boolean> {
        const rollbackSnapshot = widget.createAiRollbackSnapshot();
        let progress: OpenPencilProgressHandle | undefined = await this.progressService.showProgress({
            text: 'Canvas AI is streaming design changes...',
            options: {
                location: 'notification'
            }
        });
        let appliedTotal = 0;
        let currentSelection = [...selection];
        let currentApplyMode = requestMode;
        let currentStreamPrompt = prompt;
        try {
            this.reportAiStatus(widget, progress, this.createAiStatus('preparing', 'Streaming', 'Canvas AI is streaming changes from the selected provider...'));
            const applyStreamedOperations = async (streamed: OpenPencilAiDesignResult): Promise<{ document: OpenPencilDocument; selection: string[]; applied: number } | undefined> => {
                const modeForBatch = currentApplyMode;
                this.reportAiStatus(widget, progress, this.createAiStatus('applying', 'Applying stream', `Canvas AI is applying streamed change ${appliedTotal + 1}...`));
                const result = await this.applyGeneratedAiOperations(widget, streamed.operations, progress, currentSelection, modeForBatch, {
                    quiet: true,
                    batchSize: 1,
                    applyOptions: this.createAiApplyOptions(prompt, modeForBatch),
                    allowTemporaryLayoutQualityIssues: true
                });
                if (!result?.completed) {
                    return undefined;
                }
                appliedTotal += result.applied;
                currentSelection = result.selection;
                currentApplyMode = modeForBatch === 'continuation' ? 'continuation' : 'maintenance';
                const latestDocument = widget.getDocument();
                return latestDocument
                    ? { document: latestDocument, selection: result.selection, applied: result.applied }
                    : undefined;
            };
            const generated = await this.withCanvasAiFrontendTimeout(this.commandService.streamAiOperations({
                prompt,
                document,
                selection,
                uri: widget.uri.toString(),
                mode: requestMode,
                workspacePath: executionChoice.workspacePath,
                execution: executionChoice.execution,
                imagePolicy: executionChoice.imagePolicy
            }, applyStreamedOperations), this.resolveCanvasAiFrontendStreamTimeoutMs(executionChoice), 'Canvas AI streaming did not finish in time.');
            let totalStreamedOperations = generated.operations.length;

            canvasAiFrontendDebug('streaming-result', {
                source: generated.source,
                providerId: generated.providerId,
                providerLabel: generated.providerLabel,
                operationsCount: generated.operations.length,
                appliedTotal,
                diagnosticsCount: generated.diagnostics?.length ?? 0
            });

            if (!generated.operations.length || !appliedTotal) {
                progress.cancel();
                progress = undefined;
                return false;
            }

            const firstCompletenessDocument = widget.getDocument();
            let completeness = firstCompletenessDocument ? this.evaluateAiCompleteness(firstCompletenessDocument, prompt, selection, requestMode, executionChoice) : undefined;
            if (completeness && this.shouldRunAiCompletenessContinuation(completeness, true)) {
                let weakPasses = 0;
                const providerReturnedInitialDesign = generated.source === 'provider';
                const maxPasses = completeness.goal.maxStreamingPasses;
                for (let pass = 1; pass <= maxPasses && !completeness.complete; pass++) {
                    const latestDocument = widget.getDocument();
                    if (!latestDocument) {
                        break;
                    }
                    const beforeScore = completeness.metrics.score;
                    const beforePassApplied = appliedTotal;
                    currentSelection = [];
                    currentApplyMode = 'continuation';
                    currentStreamPrompt = this.createAiCompletenessContinuationPrompt(prompt, pass, maxPasses, completeness);
                    this.reportAiStatus(widget, progress, this.createAiStatus('preparing', 'Improving completeness', `Canvas AI is improving design completeness (${pass}/${maxPasses}, score ${completeness.metrics.score.toFixed(2)}/${completeness.goal.targetScore.toFixed(2)})...`));
                    const continuation = await this.withCanvasAiFrontendTimeout(this.commandService.streamAiOperations({
                        prompt: currentStreamPrompt,
                        document: latestDocument,
                        selection: [],
                        uri: widget.uri.toString(),
                        mode: 'continuation',
                        workspacePath: executionChoice.workspacePath,
                        execution: executionChoice.execution,
                        imagePolicy: executionChoice.imagePolicy
                    }, applyStreamedOperations), this.resolveCanvasAiFrontendStreamTimeoutMs(executionChoice), `Canvas AI streaming completeness pass ${pass} did not finish in time.`);
                    totalStreamedOperations += continuation.operations.length;
                    canvasAiFrontendDebug('streaming-continuation-result', {
                        pass,
                        operationsCount: continuation.operations.length,
                        appliedTotal,
                        diagnosticsCount: continuation.diagnostics?.length ?? 0,
                        beforeScore
                    });
                    const afterDocument = widget.getDocument();
                    completeness = afterDocument ? this.evaluateAiCompleteness(afterDocument, prompt, selection, requestMode, executionChoice) : completeness;
                    const scoreGain = completeness.metrics.score - beforeScore;
                    canvasAiFrontendDebug('streaming-completeness-result', {
                        pass,
                        score: completeness.metrics.score,
                        targetScore: completeness.goal.targetScore,
                        scoreGain,
                        complete: completeness.complete,
                        deficiencies: completeness.deficiencies.slice(0, 4)
                    });
                    if (!continuation.operations.length || appliedTotal === beforePassApplied) {
                        weakPasses++;
                        if (!providerReturnedInitialDesign) {
                            break;
                        }
                        if (this.shouldRetryNoProgressAiCompletenessPass(completeness, pass, maxPasses, true)) {
                            continue;
                        }
                        break;
                    }
                    weakPasses = scoreGain < completeness.goal.minScoreGain ? weakPasses + 1 : 0;
                    if (this.shouldStopWeakAiCompletenessLoop(completeness, weakPasses)) {
                        break;
                    }
                }
            }

            const visualImprovement = await this.runAiVisualReferenceImprovementLoop(widget, prompt, requestMode, executionChoice, progress, async visualPrompt => {
                const latestDocument = widget.getDocument();
                if (!latestDocument) {
                    return { changed: false, applied: 0 };
                }
                const beforeApplied = appliedTotal;
                currentSelection = [];
                currentApplyMode = 'continuation';
                currentStreamPrompt = visualPrompt;
                const continuation = await this.withCanvasAiFrontendTimeout(this.commandService.streamAiOperations({
                    prompt: visualPrompt,
                    document: latestDocument,
                    selection: [],
                    uri: widget.uri.toString(),
                    mode: 'continuation',
                    workspacePath: executionChoice.workspacePath,
                    execution: executionChoice.execution,
                    imagePolicy: executionChoice.imagePolicy
                }, applyStreamedOperations), this.resolveCanvasAiFrontendStreamTimeoutMs(executionChoice), 'Canvas AI streaming visual refinement did not finish in time.');
                totalStreamedOperations += continuation.operations.length;
                return {
                    changed: appliedTotal > beforeApplied,
                    applied: appliedTotal - beforeApplied,
                    selection: currentSelection
                };
            });
            currentSelection = visualImprovement.selection ?? currentSelection;
            if (visualImprovement.compared && visualImprovement.metTarget === false && this.isAiReferenceClonePrompt(prompt)) {
                const score = visualImprovement.score ?? 0;
                const target = visualImprovement.targetScore ?? 0.9;
                const summary = visualImprovement.report?.summary ? ` ${visualImprovement.report.summary}` : '';
                this.reportAiStatus(widget, progress, this.createAiStatus('error', 'Needs refinement', `Canvas AI visual similarity is ${score.toFixed(2)}/${target.toFixed(2)}.${summary}`));
                this.messages.warn(`Canvas AI streamed ${appliedTotal} change${appliedTotal === 1 ? '' : 's'}, but visual reference similarity is still ${score.toFixed(2)}/${target.toFixed(2)}.${summary}`);
                return true;
            }

            let finalDocument = widget.getDocument();
            let finalCompleteness = finalDocument ? this.evaluateAiCompleteness(finalDocument, prompt, selection, requestMode, executionChoice) : undefined;
            if (finalCompleteness && !finalCompleteness.complete && this.shouldRunAiCompletenessContinuation(finalCompleteness, true)) {
                const recovery = await this.runAiProviderCompletionRecoveryLoop(
                    widget,
                    prompt,
                    requestMode,
                    executionChoice,
                    progress,
                    finalCompleteness,
                    true,
                    currentSelection
                );
                appliedTotal += recovery.applied;
                currentSelection = recovery.selection ?? currentSelection;
                finalDocument = recovery.document ?? widget.getDocument();
                finalCompleteness = recovery.completeness;
            }
            finalDocument = await this.normalizeFinalAiLayoutBeforeCompletion(widget, progress, prompt, requestMode) ?? finalDocument;
            finalCompleteness = finalDocument ? this.evaluateAiCompleteness(finalDocument, prompt, selection, requestMode, executionChoice) : finalCompleteness;
            if (finalCompleteness && !finalCompleteness.complete && finalCompleteness.goal.profile === 'web-page') {
                const summary = finalCompleteness.deficiencies.slice(0, 2).join('; ') || `score ${finalCompleteness.metrics.score.toFixed(2)}/${finalCompleteness.goal.targetScore.toFixed(2)}`;
                this.reportAiStatus(widget, progress, this.createAiStatus('error', 'Incomplete', `Canvas AI stopped before the design met completeness checks: ${summary}.`));
                this.messages.warn(`Canvas AI stopped before the design met completeness checks: ${summary}.`);
                return true;
            }
            const validation = finalDocument ? this.commandService.validateDocument(finalDocument) : undefined;
            const layoutQuality = finalDocument ? this.commandService.validateAiLayoutQuality(finalDocument, this.createAiApplyOptions(prompt, requestMode)) : undefined;
            if (!validation?.valid || !layoutQuality?.valid) {
                const issues = validation?.valid === false ? validation.issues : layoutQuality?.issues;
                const detail = issues?.slice(0, 3).map(issue => `${issue.path}: ${issue.message}`).join('; ') ?? 'unknown validation error';
                this.reportAiStatus(widget, progress, this.createAiStatus('error', 'Needs review', 'Canvas AI streamed changes with validation issues.'));
                const action = await this.messages.warn(
                    `Canvas AI streamed ${appliedTotal} change${appliedTotal === 1 ? '' : 's'}, but final validation reported issues: ${detail}`,
                    'Rollback',
                    'Keep'
                );
                if (action === 'Rollback' && rollbackSnapshot) {
                    widget.restoreAiRollbackSnapshot(rollbackSnapshot);
                    this.reportAiStatus(widget, progress, this.createAiStatus('complete', 'Rolled back', 'Canvas AI streamed changes were rolled back.'));
                }
                return true;
            }

            this.reportAiStatus(widget, progress, this.createAiStatus('complete', 'Done', `Canvas AI streamed and applied ${appliedTotal} change${appliedTotal === 1 ? '' : 's'}.`));
            this.messages.info(`Canvas AI streamed ${appliedTotal} design change${appliedTotal === 1 ? '' : 's'} (${totalStreamedOperations} operation${totalStreamedOperations === 1 ? '' : 's'} received) using the selected provider/model; save when satisfied. Selection: ${this.formatSelection(currentSelection)}.`);
            return true;
        } catch (error) {
            canvasAiFrontendDebug('streaming-error', {
                appliedTotal,
                errorName: error instanceof Error ? error.name : typeof error,
                messageLength: error instanceof Error ? error.message.length : String(error).length
            });
            if (!appliedTotal) {
                progress?.cancel();
                progress = undefined;
                return false;
            }
            if (!selection.length && requestMode !== 'maintenance' && this.isPageLevelAiPrompt(prompt)) {
                canvasAiFrontendDebug('streaming-partial-will-run-completeness', {
                    appliedTotal,
                    errorName: error instanceof Error ? error.name : typeof error
                });
                this.reportAiStatus(widget, progress, this.createAiStatus('preparing', 'Completing partial stream', 'Canvas AI received partial streamed changes and will continue completeness checks instead of leaving the canvas incomplete.'));
                return true;
            }
            this.reportAiStatus(widget, progress, this.createAiStatus('error', 'Error', 'Canvas AI streaming stopped.'));
            const action = await this.messages.error(
                `Canvas AI streaming stopped after applying ${appliedTotal} change${appliedTotal === 1 ? '' : 's'}: ${error instanceof Error ? error.message : String(error)}`,
                'Rollback',
                'Keep'
            );
            if (action === 'Rollback' && rollbackSnapshot) {
                widget.restoreAiRollbackSnapshot(rollbackSnapshot);
            }
            return true;
        } finally {
            progress?.cancel();
            widget.clearAiStatusSoon();
        }
    }

    protected async runAiProviderCompletionRecoveryLoop(
        widget: OpenPencilEditorWidget,
        prompt: string,
        requestMode: OpenPencilAiDesignRequest['mode'] | undefined,
        executionChoice: OpenPencilAiExecutionChoice,
        progress: OpenPencilProgressHandle | undefined,
        initialCompleteness: OpenPencilAiCompletenessReport,
        afterStreaming: boolean,
        initialSelection: string[] = []
    ): Promise<OpenPencilAiProviderCompletionRecoveryResult> {
        let completeness = initialCompleteness;
        let appliedTotal = 0;
        let selection = [...initialSelection];
        const maxPasses = Math.max(1, Math.min(
            OPENPENCIL_AI_COMPLETENESS_MAX_BATCH_PASSES + (afterStreaming ? 1 : 0),
            completeness.goal.maxBatchPasses + (afterStreaming ? 1 : 0)
        ));
        let weakPasses = 0;
        for (let pass = 1; pass <= maxPasses && !completeness.complete; pass++) {
            const latestDocument = widget.getDocument();
            if (!latestDocument || !this.shouldRunAiCompletenessContinuation(completeness, false)) {
                break;
            }
            const beforeScore = completeness.metrics.score;
            const beforeApplied = appliedTotal;
            const recoveryPrompt = this.createAiProviderCompletionRecoveryPrompt(prompt, pass, maxPasses, completeness, latestDocument, afterStreaming);
            this.reportAiStatus(widget, progress, this.createAiStatus('preparing', 'Recovering completeness', `Canvas AI is asking the selected provider to repair incomplete structure (${pass}/${maxPasses}, score ${beforeScore.toFixed(2)}/${completeness.goal.targetScore.toFixed(2)})...`));
            let generated: OpenPencilAiDesignResult;
            try {
                generated = await this.withCanvasAiFrontendTimeout(this.commandService.generateAiOperations({
                    prompt: recoveryPrompt,
                    document: latestDocument,
                    selection: [],
                    uri: widget.uri.toString(),
                    mode: 'continuation',
                    workspacePath: executionChoice.workspacePath,
                    execution: executionChoice.execution,
                    imagePolicy: executionChoice.imagePolicy
                }), this.resolveCanvasAiFrontendGenerateTimeoutMs(executionChoice), `Canvas AI provider recovery pass ${pass} did not finish in time.`);
            } catch (error) {
                canvasAiFrontendDebug('provider-completeness-recovery-error', {
                    pass,
                    errorName: error instanceof Error ? error.name : typeof error,
                    messageLength: error instanceof Error ? error.message.length : String(error).length
                });
                weakPasses++;
                if (!this.shouldRetryNoProgressAiCompletenessPass(completeness, pass, maxPasses, false)) {
                    break;
                }
                continue;
            }

            canvasAiFrontendDebug('provider-completeness-recovery-result', {
                pass,
                source: generated.source,
                providerId: generated.providerId,
                operationsCount: generated.operations.length,
                diagnosticsCount: generated.diagnostics?.length ?? 0,
                score: completeness.metrics.score,
                targetScore: completeness.goal.targetScore,
                deficiencies: completeness.deficiencies.slice(0, 4)
            });
            if (generated.source !== 'provider' || !generated.operations.length) {
                weakPasses++;
                if (this.shouldRetryNoProgressAiCompletenessPass(completeness, pass, maxPasses, false)) {
                    continue;
                }
                break;
            }

            const result = await this.applyGeneratedAiOperations(widget, generated.operations, progress, [], 'continuation', {
                quiet: true,
                batchSize: 1,
                applyOptions: this.createAiApplyOptions(prompt, 'continuation'),
                allowTemporaryLayoutQualityIssues: false
            });
            const afterDocument = widget.getDocument();
            completeness = afterDocument ? this.evaluateAiCompleteness(afterDocument, prompt, [], requestMode, executionChoice) : completeness;
            if (!result?.completed || !result.changed || !afterDocument) {
                weakPasses++;
                if (this.shouldRetryNoProgressAiCompletenessPass(completeness, pass, maxPasses, false)) {
                    continue;
                }
                break;
            }

            appliedTotal += result.applied;
            selection = result.selection;
            const scoreGain = completeness.metrics.score - beforeScore;
            canvasAiFrontendDebug('provider-completeness-recovery-applied', {
                pass,
                appliedTotal,
                passApplied: appliedTotal - beforeApplied,
                score: completeness.metrics.score,
                targetScore: completeness.goal.targetScore,
                scoreGain,
                complete: completeness.complete,
                deficiencies: completeness.deficiencies.slice(0, 4)
            });
            weakPasses = scoreGain < completeness.goal.minScoreGain ? weakPasses + 1 : 0;
            if (this.shouldStopWeakAiCompletenessLoop(completeness, weakPasses)) {
                break;
            }
        }
        return {
            applied: appliedTotal,
            selection,
            document: widget.getDocument(),
            completeness
        };
    }

    protected createAiProviderCompletionRecoveryPrompt(
        originalPrompt: string,
        pass: number,
        totalPasses: number,
        report: OpenPencilAiCompletenessReport,
        document: OpenPencilDocument,
        afterStreaming: boolean
    ): string {
        const ids = this.documents.flattenNodes(document)
            .map(node => node.id)
            .filter(id => typeof id === 'string' && !!id)
            .slice(0, 180);
        const base = this.createAiCompletenessContinuationPrompt(originalPrompt, pass, totalPasses, report);
        return [
            base,
            '',
            'Provider-driven structured recovery requirements:',
            afterStreaming
                ? 'The streaming path already produced an incomplete or sparse canvas. Continue from the current document; do not restart or return a placeholder.'
                : 'The current canvas is incomplete after the previous provider pass. Continue from the current document; do not restart or return a placeholder.',
            ids.length ? `Existing node IDs that may be referenced: ${ids.join(', ')}` : 'There are no reusable node IDs yet; create parent nodes before children and before any references.',
            'Return exactly one JSON object using contract "openpencil.design-operations.v1" with a non-empty operations array.',
            'Do not return prose, Markdown, HTML, CSS, explanations, diagnostics-only output, or a lower-quality fallback.',
            'Never reference an ID outside the inventory above unless the same operation set creates that ID first.',
            'Every new parent/container must be created before child nodes use it. Coordinates for child nodes are relative to their parent frame.',
            'Apply a high-quality correction that increases useful visible content, fixes missing regions, and repairs layout quality at the same time.',
            'For web pages, keep one bounded page/root frame, stack major sections vertically inside the same width, and reserve horizontal layout for rows/grids/cards inside a section.',
            'For non-page artifacts, complete the bounded composition implied by the prompt without adding unrelated website sections.',
            'The result must validate with no missing IDs, no visible text overlaps, no lateral runaway, no off-parent children, no editor placeholder text, and no generic filler labels.'
        ].join('\n');
    }

    protected async runAiVisualReferenceImprovementLoop(
        widget: OpenPencilEditorWidget,
        prompt: string,
        requestMode: OpenPencilAiDesignRequest['mode'] | undefined,
        executionChoice: OpenPencilAiExecutionChoice,
        progress: OpenPencilProgressHandle | undefined,
        applyImprovementPrompt: (visualPrompt: string, pass: number) => Promise<{ changed: boolean; applied: number; selection?: string[] }>
    ): Promise<OpenPencilAiVisualImprovementResult> {
        const referenceUrl = this.resolveAiVisualReferenceUrl(prompt, executionChoice);
        const implicitKnownReference = !referenceUrl && this.isAiReferenceClonePrompt(prompt);
        if ((!referenceUrl && !implicitKnownReference) || !this.canRunAiVisualReferenceComparison(executionChoice)) {
            return { applied: 0, compared: false };
        }
        const maxPasses = Math.max(1, Math.min(4, executionChoice.visualReference?.maxPasses ?? (this.isAiReferenceClonePrompt(prompt) ? 3 : 2)));
        const targetScore = Math.max(0.6, Math.min(0.95, executionChoice.visualReference?.targetScore ?? (this.isAiReferenceClonePrompt(prompt) ? 0.90 : 0.82)));
        let appliedTotal = 0;
        let selection: string[] | undefined;
        let lastScore = -1;
        let weakPasses = 0;
        let compared = false;
        let latestScore: number | undefined;
        let latestReport: OpenPencilAiVisualComparisonReport | undefined;
        for (let pass = 1; pass <= maxPasses; pass++) {
            const latestDocument = widget.getDocument();
            if (!latestDocument) {
                break;
            }
            this.reportAiStatus(widget, progress, this.createAiStatus('validating', 'Visual compare', `Canvas AI is comparing the current design with the reference (${pass}/${maxPasses})...`));
            const report = await this.evaluateAiVisualReference(latestDocument, prompt, referenceUrl, executionChoice);
            if (!report) {
                break;
            }
            compared = true;
            latestReport = report;
            const score = this.normalizeAiVisualScore(report.similarityScore);
            latestScore = score;
            canvasAiFrontendDebug('visual-reference-comparison', {
                pass,
                score,
                targetScore,
                issueCount: report.issues?.length ?? 0,
                fixCount: report.fixes?.length ?? 0
            });
            if (score >= targetScore) {
                break;
            }
            if (score <= lastScore + 0.02) {
                weakPasses++;
            } else {
                weakPasses = 0;
            }
            if (weakPasses >= 2) {
                break;
            }
            lastScore = score;
            const visualPrompt = this.createAiVisualReferenceImprovementPrompt(prompt, referenceUrl, report, pass, maxPasses, targetScore, requestMode);
            this.reportAiStatus(widget, progress, this.createAiStatus('preparing', 'Visual refinement', `Canvas AI is correcting visual differences (${pass}/${maxPasses}, score ${score.toFixed(2)}/${targetScore.toFixed(2)})...`));
            const result = await applyImprovementPrompt(visualPrompt, pass);
            if (!result.changed || !result.applied) {
                break;
            }
            appliedTotal += result.applied;
            selection = result.selection ?? selection;
        }
        return {
            applied: appliedTotal,
            selection,
            compared,
            score: latestScore,
            targetScore,
            metTarget: latestScore !== undefined ? latestScore >= targetScore : undefined,
            report: latestReport
        };
    }

    protected isAiReferenceClonePrompt(prompt: string): boolean {
        return /\b(clone|clonar|copy|copia|cópia|copie|copiar|igual|parecido|similar|refer[eê]ncia|reference|print|screenshot|captura|recrie|recreate|mimic|imite)\b/i.test(prompt);
    }

    protected canRunAiVisualReferenceComparison(executionChoice: OpenPencilAiExecutionChoice): boolean {
        const visualMetadata = this.resolveAiVisualModelMetadata(executionChoice);
        return !!this.aiRuntimeService
            && !!executionChoice.execution
            && executionChoice.visualReference?.mode !== 'off'
            && (this.modelMetadataSupportsInputModality(visualMetadata, 'image')
                || (!!executionChoice.visualExecution && !visualMetadata));
    }

    protected resolveAiVisualModelMetadata(executionChoice: OpenPencilAiExecutionChoice): CyberVinciAiModelMetadata | undefined {
        return executionChoice.visualExecution ? executionChoice.visualModelMetadata : executionChoice.modelMetadata;
    }

    protected resolveAiVisualExecution(executionChoice: OpenPencilAiExecutionChoice, referenceUrl: string | undefined): CyberVinciAiExecutionSelection | undefined {
        const execution = executionChoice.visualExecution ?? executionChoice.execution;
        if (!execution) {
            return undefined;
        }
        return {
            ...execution,
            webSearch: referenceUrl ? 'disabled' : 'live',
            webSearchContextSize: referenceUrl ? execution.webSearchContextSize : 'medium'
        };
    }

    protected resolveAiVisualReferenceUrl(prompt: string, executionChoice: OpenPencilAiExecutionChoice): string | undefined {
        const configured = executionChoice.visualReference?.referenceUrl?.trim();
        if (configured) {
            return configured;
        }
        return this.extractAiReferenceImageUrl(prompt);
    }

    protected extractAiReferenceImageUrl(prompt: string): string | undefined {
        const dataUrl = /data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=]+/i.exec(prompt)?.[0];
        if (dataUrl) {
            return dataUrl;
        }
        const urls = prompt.match(/\bhttps?:\/\/[^\s<>"')]+/gi) ?? [];
        return urls.map(url => url.replace(/[.,;:!?]+$/g, '')).find(url => /\.(png|jpe?g|webp|gif)(\?|#|$)/i.test(url));
    }

    protected async evaluateAiVisualReference(
        document: OpenPencilDocument,
        prompt: string,
        referenceUrl: string | undefined,
        executionChoice: OpenPencilAiExecutionChoice
    ): Promise<OpenPencilAiVisualComparisonReport | undefined> {
        const visualExecution = this.resolveAiVisualExecution(executionChoice, referenceUrl);
        if (!this.aiRuntimeService || !visualExecution) {
            return undefined;
        }
        const currentCanvasUrl = await this.renderOpenPencilDocumentToPngDataUrl(document);
        if (!currentCanvasUrl) {
            return undefined;
        }
        try {
            const visualCompareRequest = {
                surfaceId: 'openpencil',
                action: 'openpencil-design-visual-compare',
                workspacePath: executionChoice.workspacePath,
                userPrompt: 'Compare the visual reference with the current OpenPencil canvas export.',
                systemPrompt: [
                    'You are a strict visual QA evaluator for OpenPencil canvas designs.',
                    referenceUrl
                        ? 'The first image is the visual reference. The second image is the current canvas export.'
                        : 'No explicit reference image was provided. If the prompt names a known website, product, app, or brand pattern, use web search and your visual knowledge to establish the expected static reference before judging the current canvas export.',
                    'The reference may be a website, app screen, dashboard, marketing page, product composition, poster, Figma-style layout, or any other static design.',
                    'Judge visual similarity by composition, proportions, reading order, spacing, containment, overlap, z-order, density, colors, typography hierarchy, and whether major visible regions are missing.',
                    'Do not require exact brand assets or real product photography unless the original request explicitly asks for them.',
                    'Return compact JSON only.'
                ].join('\n'),
                input: {
                    originalPrompt: prompt,
                    scoring: '0 means unrelated or broken; 1 means highly similar and production-usable.'
                },
                inputItems: [
                    {
                        type: 'text' as const,
                        text: [
                            referenceUrl
                                ? 'Compare these two images.'
                                : 'Evaluate whether the current OpenPencil canvas delivered the known visual target implied by the original prompt.',
                            referenceUrl ? 'Image 1: reference.' : 'Use the original prompt as the reference request and obtain the known-site/product visual structure when the target is recognizable.',
                            referenceUrl ? 'Image 2: current OpenPencil canvas.' : 'Image 1: current OpenPencil canvas.',
                            'Return JSON with similarityScore number from 0 to 1, summary string, issues string[], fixes string[].',
                            'Prioritize fixes that remove overlap, keep content inside the canvas/frame, restore expected columns/rows, and add missing major regions.'
                        ].join('\n'),
                        text_elements: []
                    },
                    ...(referenceUrl ? [{ type: 'image' as const, url: referenceUrl }] : []),
                    { type: 'image' as const, url: currentCanvasUrl }
                ],
                output: {
                    mode: 'json' as const,
                    schemaName: 'openpencil.visual-comparison.v1',
                    instructions: 'Return only JSON shaped as {"similarityScore":0.0,"summary":"","issues":[],"fixes":[]}.'
                },
                effectPolicy: {
                    previewOnly: true,
                    workspaceWrites: 'forbidden' as const,
                    shellExecution: 'forbidden' as const,
                    requireUserConfirmation: false
                },
                execution: {
                    ...visualExecution
                }
            };
            const result = await this.aiRuntimeService.runTask<Record<string, unknown>, OpenPencilAiVisualComparisonReport>(visualCompareRequest);
            return this.normalizeAiVisualComparisonReport(result.structured, result.text);
        } catch (error) {
            canvasAiFrontendDebug('visual-reference-compare-failed', {
                errorName: error instanceof Error ? error.name : typeof error,
                messageLength: error instanceof Error ? error.message.length : String(error).length
            });
            return undefined;
        }
    }

    protected async renderOpenPencilDocumentToPngDataUrl(document: OpenPencilDocument): Promise<string | undefined> {
        const svg = this.commandService.exportDocument(document, [], 'svg', false);
        if (!svg.trim()) {
            return undefined;
        }
        const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        try {
            const image = await new Promise<HTMLImageElement>((resolve, reject) => {
                const element = new Image();
                element.onload = () => resolve(element);
                element.onerror = () => reject(new Error('Canvas SVG export could not be rasterized for visual comparison.'));
                element.src = url;
            });
            const naturalWidth = image.naturalWidth || image.width || 1;
            const naturalHeight = image.naturalHeight || image.height || 1;
            const maxDimension = 2200;
            const scale = Math.min(1, maxDimension / Math.max(naturalWidth, naturalHeight));
            const canvas = window.document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(naturalWidth * scale));
            canvas.height = Math.max(1, Math.round(naturalHeight * scale));
            const context = canvas.getContext('2d');
            if (!context) {
                return undefined;
            }
            context.fillStyle = '#ffffff';
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.imageSmoothingEnabled = true;
            context.imageSmoothingQuality = 'high';
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            return canvas.toDataURL('image/png');
        } catch {
            return undefined;
        } finally {
            URL.revokeObjectURL(url);
        }
    }

    protected normalizeAiVisualComparisonReport(structured: OpenPencilAiVisualComparisonReport | undefined, text: string): OpenPencilAiVisualComparisonReport | undefined {
        const report = structured ?? this.parseAiVisualComparisonText(text);
        if (!report) {
            return undefined;
        }
        return {
            similarityScore: this.normalizeAiVisualScore(report.similarityScore),
            summary: typeof report.summary === 'string' ? report.summary : undefined,
            issues: Array.isArray(report.issues) ? report.issues.filter((issue): issue is string => typeof issue === 'string' && !!issue.trim()).slice(0, 8) : [],
            fixes: Array.isArray(report.fixes) ? report.fixes.filter((fix): fix is string => typeof fix === 'string' && !!fix.trim()).slice(0, 8) : []
        };
    }

    protected parseAiVisualComparisonText(text: string): OpenPencilAiVisualComparisonReport | undefined {
        const trimmed = text.trim();
        if (!trimmed) {
            return undefined;
        }
        try {
            const parsed = JSON.parse(trimmed) as OpenPencilAiVisualComparisonReport;
            return parsed && typeof parsed === 'object' ? parsed : undefined;
        } catch {
            const start = trimmed.indexOf('{');
            const end = trimmed.lastIndexOf('}');
            if (start >= 0 && end > start) {
                try {
                    return JSON.parse(trimmed.slice(start, end + 1)) as OpenPencilAiVisualComparisonReport;
                } catch {
                    return undefined;
                }
            }
            return undefined;
        }
    }

    protected normalizeAiVisualScore(score: unknown): number {
        if (typeof score !== 'number' || !Number.isFinite(score)) {
            return 0;
        }
        return Math.max(0, Math.min(1, score > 1 ? score / 100 : score));
    }

    protected createAiVisualReferenceImprovementPrompt(
        originalPrompt: string,
        referenceUrl: string | undefined,
        report: OpenPencilAiVisualComparisonReport,
        pass: number,
        maxPasses: number,
        targetScore: number,
        requestMode: OpenPencilAiDesignRequest['mode'] | undefined
    ): string {
        const issues = (report.issues ?? []).slice(0, 6).map((issue, index) => `${index + 1}. ${issue}`).join('\n') || 'No specific issues were returned; improve visual similarity conservatively.';
        const fixes = (report.fixes ?? []).slice(0, 6).map((fix, index) => `${index + 1}. ${fix}`).join('\n') || 'Refine spacing, containment, hierarchy, and missing major regions.';
        return [
            `Original user request: ${originalPrompt}`,
            `Visual reference improvement pass ${pass}/${maxPasses}. Target similarity score: ${targetScore.toFixed(2)}. Current score: ${this.normalizeAiVisualScore(report.similarityScore).toFixed(2)}.`,
            referenceUrl
                ? `Reference image URL/data URL: ${referenceUrl}`
                : 'Reference source: implicit known-site or known-product visual target from the original request. Use web/search knowledge from the visual QA report; do not require the user to provide a reference URL.',
            requestMode ? `Original request mode: ${requestMode}.` : undefined,
            report.summary ? `Visual comparison summary: ${report.summary}` : undefined,
            'Observed visual issues:',
            issues,
            'Required fixes:',
            fixes,
            'Apply a high-quality incremental correction to the current OpenPencil document.',
            'Preserve existing good structure and z-order. Do not recreate the entire design unless the canvas is structurally empty.',
            'Never reference a node id that is not present in the current document. If a new id is needed, create that node before updating, selecting, grouping, or parenting it.',
            'Keep every visible child inside its intended parent/frame; fix overflow, overlap, lateral runaway, hidden content, and accidental background image placeholders.',
            'Use the current document dimensions and visible containers as constraints. For grids/shelves/cards, distribute items inside the available width instead of pushing them outside the page.',
            'Return only ordered OpenPencil operations through the normal Canvas AI contract.'
        ].filter(Boolean).join('\n');
    }

    protected modelMetadataSupportsInputModality(metadata: CyberVinciAiModelMetadata | undefined, modality: string): boolean {
        const expected = modality.toLowerCase();
        return metadata?.inputModalities?.some(value => value.toLowerCase() === expected) ?? false;
    }

    protected createAiIncrementalStages(prompt: string, selection: string[], requestMode?: OpenPencilAiDesignRequest['mode']): OpenPencilAiIncrementalStage[] {
        const originalRequest = `Original user request: ${prompt}`;
        if (selection.length || requestMode === 'maintenance') {
            return [
                {
                    id: 'selected-edit',
                    label: 'Editing selection',
                    required: true,
                    mode: 'maintenance',
                    prompt: [
                        originalRequest,
                        'Incremental stage 1/2: edit the selected node(s) now.',
                        'Return the smallest ordered set of operations that visibly performs the requested edit.',
                        'Preserve selected node IDs unless a replaceNode operation is necessary.'
                    ].join('\n')
                },
                {
                    id: 'selected-refine',
                    label: 'Refining selection',
                    required: false,
                    mode: 'maintenance',
                    prompt: [
                        originalRequest,
                        'Incremental stage 2/2: inspect the current selected edit and refine spacing, contrast, copy, and visual consistency.',
                        'Return only operations that improve the current canvas. Return no unrelated changes.'
                    ].join('\n')
                }
            ];
        }
        if (requestMode === 'continuation') {
            return [
                {
                    id: 'continuation-structure',
                    label: 'Adding structure',
                    required: true,
                    mode: 'continuation',
                    prompt: [
                        originalRequest,
                        'Incremental stage 1/3: add only the missing top-level section containers below existing content or inside visible empty space.',
                        'Do not delete, replace, or recreate existing nodes. Make the structure visible immediately.'
                    ].join('\n')
                },
                {
                    id: 'continuation-content',
                    label: 'Adding content',
                    required: false,
                    mode: 'maintenance',
                    prompt: [
                        originalRequest,
                        'Incremental stage 2/3: populate the newly added section containers with concrete text, controls, cards, icons, or imagery placeholders.',
                        'Preserve all existing IDs and add elements one logical element at a time in visual order.'
                    ].join('\n')
                },
                {
                    id: 'continuation-refine',
                    label: 'Refining',
                    required: false,
                    mode: 'maintenance',
                    prompt: [
                        originalRequest,
                        'Incremental stage 3/3: refine the current continuation for spacing, contrast, alignment, hierarchy, and final selection.',
                        'Return only operations that improve the existing canvas.'
                    ].join('\n')
                }
            ];
        }
        return [
                {
                    id: 'generation-foundation',
                    label: 'Creating foundation',
                    required: true,
                    mode: 'generation',
                    prompt: [
                        originalRequest,
                        'Incremental stage 1/3: create the root view frame and the first meaningful populated regions of the requested artifact.',
                        'Do not return a bare skeleton. The canvas should immediately show the intended artifact type, visual hierarchy, representative content, and at least one substantial body/module region when the request implies a full page or reference.',
                        'Prefer one top-level frame with bounded child sections; include visible text, controls/cards/images/placeholders, fill/stroke/background, and enough parent bounds so nothing is clipped or outside the frame.',
                        'Keep the result generic to the user request. Do not use a fixed website or marketplace template unless the prompt explicitly asks for that kind of surface.'
                    ].join('\n')
                },
                {
                    id: 'generation-content',
                    label: 'Adding elements',
                    required: false,
                    mode: 'maintenance',
                    prompt: [
                        originalRequest,
                        'Incremental stage 2/3: expand and populate the existing composition according to the original request.',
                        'Add the next missing text, buttons, cards, input fields, icons, images/placeholders, supporting shapes, modules, or states one logical element at a time.',
                        'Preserve existing IDs. Do not recreate the root frame or major sections. Add below/inside existing bounded regions so the composition remains coherent while streaming.'
                    ].join('\n')
                },
            {
                id: 'generation-refine',
                label: 'Refining',
                required: false,
                mode: 'maintenance',
                prompt: [
                    originalRequest,
                    'Incremental stage 3/3: refine the current design for spacing, contrast, typography, alignment, layer order, and final selection.',
                    'Return only operations that improve the existing canvas, not a replacement design.'
                ].join('\n')
            }
        ];
    }

    protected async createAiPreviewFile(widget: OpenPencilEditorWidget, document: OpenPencilDocument, generated: OpenPencilAiDesignResult, prompt: string, selection: string[], requestMode?: OpenPencilAiDesignRequest['mode']): Promise<{
        changed: boolean;
        valid: boolean;
        validationMessage?: string;
        message?: string;
        target: URI;
        reviewModel: OpenPencilAiReviewModel;
    }> {
        const preview = this.commandService.applyOperationsToDocument(
            this.documents.cloneDocument(document),
            selection,
            generated.operations,
            this.createAiApplyOptions(prompt, requestMode)
        );
        const validation = this.commandService.validateDocument(preview.document);
        const validationMessage = validation.issues
            .filter(issue => issue.severity === 'error')
            .slice(0, 3)
            .map(issue => `${issue.path}: ${issue.message}`)
            .join('; ');
        const sourceLabel = generated.source === 'provider'
            ? 'CyberVinci provider'
            : 'Canvas deterministic adapter';
        const providerLabel = generated.providerLabel ?? generated.providerId;
        const target = widget.uri.parent.resolve(`${widget.uri.path.name}.openpencil-ai-preview.json`);
        const reviewModel = createOpenPencilAiReviewModel({
            target: widget.uri.path.base,
            prompt,
            sourceLabel,
            providerLabel,
            diagnostics: generated.diagnostics,
            changed: preview.changed,
            message: preview.message,
            validation,
            currentSelection: selection,
            previewSelection: preview.selection,
            operations: generated.operations,
            beforeDocument: document,
            afterDocument: preview.document,
            previewArtifact: target.path.base
        });
        const content = {
            target: widget.uri.path.base,
            promptLength: prompt.length,
            source: generated.source,
            provider: generated.providerLabel ?? generated.providerId,
            diagnostics: generated.diagnostics,
            applied: preview.changed,
            message: preview.message,
            validation,
            currentSelection: selection,
            previewSelection: preview.selection,
            operationContract: generated.context.responseContract,
            skills: generated.context.skills,
            operations: this.summarizeOperations(generated.operations),
            before: this.commandService.getDocumentSummary(document),
            after: this.commandService.getDocumentSummary(preview.document)
        };
        await this.fileService.writeFile(target, BinaryBuffer.fromString(`${JSON.stringify(content, undefined, 2)}\n`));
        canvasAiFrontendDebug('preview-created', {
            artifact: target.path.base,
            changed: preview.changed,
            valid: validation.valid,
            operationsCount: generated.operations.length,
            diagnosticsCount: generated.diagnostics?.length ?? 0
        });
        return {
            changed: preview.changed,
            valid: validation.valid,
            validationMessage,
            message: preview.message,
            target,
            reviewModel
        };
    }

    protected async openAiReviewPanel(
        widget: OpenPencilEditorWidget,
        operations: OpenPencilDesignOperation[],
        reviewModel: OpenPencilAiReviewModel,
        previewArtifact: URI,
        canAlwaysApply: boolean,
        selection?: string[],
        requestMode?: OpenPencilAiDesignRequest['mode'],
        applyOptions?: OpenPencilApplyOperationsOptions
    ): Promise<void> {
        const apply = async () => {
            const progress = await this.progressService.showProgress({
                text: 'Canvas AI is applying changes...',
                options: {
                    location: 'notification'
                }
            });
            try {
                await this.applyGeneratedAiOperations(widget, operations, progress, selection, requestMode, { applyOptions });
            } finally {
                progress.cancel();
                widget.clearAiStatusSoon();
            }
        };
        const reviewSession = {
            model: reviewModel,
            canAlwaysApply,
            apply,
            openArtifact: () => this.editorManager.open(previewArtifact, { mode: 'activate' }).then(() => undefined)
        };
        if (canAlwaysApply) {
            Object.assign(reviewSession, {
                alwaysApply: async () => {
                    this.setAiAutoApply(true);
                    await apply();
                }
            });
        }
        await this.aiReviewService.openReview(reviewSession);
    }

    protected async applyGeneratedAiOperations(
        widget: OpenPencilEditorWidget,
        operations: OpenPencilDesignOperation[],
        progress?: OpenPencilProgressHandle,
        selection?: string[],
        requestMode?: OpenPencilAiDesignRequest['mode'],
        options: { quiet?: boolean; batchSize?: number; delayMs?: number; applyOptions?: OpenPencilApplyOperationsOptions; allowTemporaryLayoutQualityIssues?: boolean } = {}
    ): Promise<OpenPencilProgressiveApplyResult | undefined> {
        const latestDocument = widget.getDocument();
        if (!latestDocument) {
            canvasAiFrontendDebug('apply-rejected', {
                reason: 'missing-document',
                operationsCount: operations.length
            });
            return undefined;
        }
        const baseSelection = selection ?? widget.getSelection();
        canvasAiFrontendDebug('apply-start', {
            uri: widget.uri.toString(),
            operationsCount: operations.length,
            selectionCount: baseSelection.length
        });
        const applyOptions = options.applyOptions ?? {
            mode: requestMode,
            normalizeVisibleBounds: true
        };
        const stabilized = this.commandService.stabilizeAiOperationsForDocument(latestDocument, baseSelection, operations, applyOptions);
        const operationsToApply = stabilized.operations;
        if (stabilized.reordered || stabilized.skipped || stabilized.diagnostics.length) {
            canvasAiFrontendDebug('apply-stabilized', {
                originalOperationsCount: operations.length,
                operationsCount: operationsToApply.length,
                reordered: stabilized.reordered,
                skipped: stabilized.skipped,
                diagnosticsCount: stabilized.diagnostics.length,
                diagnostics: stabilized.diagnostics.slice(0, 5)
            });
        }
        if (!operationsToApply.length) {
            const message = stabilized.diagnostics[0] ?? 'Canvas AI generated only operations whose targets were not available.';
            this.reportAiStatus(widget, progress, this.createAiStatus('error', 'Error', 'Canvas AI could not apply any valid operations.'));
            this.messages.warn(`Canvas AI edit was not applied because no generated operation could be applied: ${message}`);
            return {
                document: latestDocument,
                selection: baseSelection,
                changed: false,
                applied: 0,
                total: operations.length,
                completed: false,
                message
            };
        }
        this.reportAiStatus(widget, progress, this.createAiStatus('validating', 'Validating', 'Canvas AI is validating the active design...'));
        let applyPreview = this.commandService.applyOperationsToDocument(this.documents.cloneDocument(latestDocument), baseSelection, operationsToApply, applyOptions);
        let applyValidation = this.commandService.validateDocument(applyPreview.document);
        let layoutQuality = this.commandService.validateAiLayoutQuality(applyPreview.document, {
            ...applyOptions,
            requireVisibleContent: !baseSelection.length
        });
        if (
            (!applyPreview.changed || !applyValidation.valid || (!layoutQuality.valid && !options.allowTemporaryLayoutQualityIssues))
            && await this.repairActiveAiLayoutBeforeApplyRetry(widget, progress, baseSelection, applyOptions, options.allowTemporaryLayoutQualityIssues === true)
        ) {
            const repairedDocument = widget.getDocument();
            if (repairedDocument) {
                applyPreview = this.commandService.applyOperationsToDocument(this.documents.cloneDocument(repairedDocument), baseSelection, operationsToApply, applyOptions);
                applyValidation = this.commandService.validateDocument(applyPreview.document);
                layoutQuality = this.commandService.validateAiLayoutQuality(applyPreview.document, {
                    ...applyOptions,
                    requireVisibleContent: !baseSelection.length
                });
            }
        }
        if (!applyPreview.changed || !applyValidation.valid || (!layoutQuality.valid && !options.allowTemporaryLayoutQualityIssues)) {
            const issues = !applyValidation.valid ? applyValidation.issues : layoutQuality.issues;
            canvasAiFrontendDebug('apply-rejected', {
                reason: !applyPreview.changed ? 'active-preview-unchanged' : !applyValidation.valid ? 'active-preview-invalid' : 'active-layout-quality-invalid',
                originalOperationsCount: operations.length,
                operationsCount: operationsToApply.length,
                diagnosticsCount: issues.length,
                diagnostics: issues.slice(0, 8).map(issue => `${issue.path}: ${issue.message}`).join(' | ')
            });
            this.reportAiStatus(widget, progress, this.createAiStatus('error', 'Error', 'Canvas AI could not validate the active design.'));
            const detail = issues.slice(0, 3).map(issue => `${issue.path}: ${issue.message}`).join('; ');
            this.messages.warn(`Canvas AI edit was not applied because the active design no longer validates the preview${applyPreview.message ? `: ${applyPreview.message}` : detail ? `: ${detail}` : '.'}`);
            return undefined;
        }
        if (!layoutQuality.valid && options.allowTemporaryLayoutQualityIssues) {
            canvasAiFrontendDebug('apply-temporary-layout-quality-accepted', {
                originalOperationsCount: operations.length,
                operationsCount: operationsToApply.length,
                diagnosticsCount: layoutQuality.issues.length,
                diagnostics: layoutQuality.issues.slice(0, 5).map(issue => `${issue.path}: ${issue.message}`).join(' | ')
            });
        }
        this.reportAiStatus(widget, progress, this.createAiApplyingStatus(0, operationsToApply.length));
        const result = await widget.applyOperationsProgressively(operationsToApply, {
            selection: baseSelection,
            applyOptions,
            batchSize: options.batchSize ?? this.aiProgressiveBatchSize(operationsToApply.length),
            delayMs: options.delayMs ?? OPENPENCIL_AI_PROGRESSIVE_APPLY_DELAY_MS,
            onProgress: applyProgress => {
                this.reportAiStatus(widget, progress, this.createAiApplyingStatus(applyProgress.applied, applyProgress.total));
            }
        });
        if (!result.completed || result.message || !result.changed) {
            const message = result.message ?? (!result.changed ? 'no visible canvas changes were applied' : 'unknown error');
            canvasAiFrontendDebug('apply-rejected', {
                reason: !result.changed ? 'progressive-apply-no-visible-change' : 'progressive-apply-incomplete',
                applied: result.applied,
                total: result.total,
                hasMessage: !!result.message
            });
            this.reportAiStatus(widget, progress, this.createAiStatus('error', 'Error', `Canvas AI stopped after applying ${result.applied}/${result.total} changes.`));
            this.messages.warn(`Canvas AI edit stopped after applying ${result.applied}/${result.total} operation${result.total === 1 ? '' : 's'}: ${message}`);
            return {
                ...result,
                completed: false,
                message
            };
        } else {
            canvasAiFrontendDebug('applied', {
                applied: result.applied,
                total: result.total,
                originalTotal: operations.length,
                skipped: stabilized.skipped,
                reordered: stabilized.reordered,
                selectionCount: result.selection.length
            });
            const suffix = stabilized.skipped ? ` (${stabilized.skipped} skipped)` : '';
            this.reportAiStatus(widget, progress, this.createAiStatus('complete', 'Done', `Canvas AI applied ${result.applied}/${operations.length} changes${suffix}.`));
            if (!options.quiet && stabilized.skipped && stabilized.diagnostics.length) {
                this.messages.warn(`Canvas AI skipped ${stabilized.skipped} generated operation${stabilized.skipped === 1 ? '' : 's'} whose target was unavailable: ${stabilized.diagnostics[0]}`);
            }
            if (!options.quiet) {
                this.messages.info(`Canvas AI edit applied to the open design; save when satisfied. Selection: ${this.formatSelection(result.selection)}.`);
            }
        }
        return result;
    }

    protected async normalizeFinalAiLayoutBeforeCompletion(
        widget: OpenPencilEditorWidget,
        progress: OpenPencilProgressHandle | undefined,
        prompt: string,
        requestMode: OpenPencilAiDesignRequest['mode'] | undefined
    ): Promise<OpenPencilDocument | undefined> {
        const currentDocument = widget.getDocument();
        if (!currentDocument) {
            return undefined;
        }
        const applyOptions = {
            ...this.createAiApplyOptions(prompt, requestMode),
            removeAiPlaceholderSkeletons: true
        };
        if (!applyOptions.normalizeVisibleBounds) {
            return currentDocument;
        }
        const normalized = this.commandService.applyOperationsToDocument(this.documents.cloneDocument(currentDocument), [], [], applyOptions);
        if (!normalized.changed || normalized.message) {
            return currentDocument;
        }
        const validation = this.commandService.validateDocument(normalized.document);
        if (!validation.valid) {
            canvasAiFrontendDebug('final-layout-normalization-rejected', {
                reason: 'validation',
                issues: validation.issues.slice(0, 5).map(issue => `${issue.path}: ${issue.message}`)
            });
            return currentDocument;
        }
        this.reportAiStatus(widget, progress, this.createAiStatus('validating', 'Finalizing layout', 'Canvas AI is normalizing the final layout before completion...'));
        const result = await widget.applyOperationsProgressively([], {
            selection: [],
            applyOptions,
            batchSize: 1,
            delayMs: 0
        });
        canvasAiFrontendDebug('final-layout-normalization-result', {
            changed: result.changed,
            completed: result.completed,
            message: result.message
        });
        return widget.getDocument() ?? normalized.document;
    }

    protected async repairActiveAiLayoutBeforeApplyRetry(
        widget: OpenPencilEditorWidget,
        progress: OpenPencilProgressHandle | undefined,
        selection: string[],
        applyOptions: OpenPencilApplyOperationsOptions,
        allowTemporaryLayoutQualityIssues: boolean
    ): Promise<boolean> {
        const currentDocument = widget.getDocument();
        if (!currentDocument || !applyOptions.normalizeVisibleBounds) {
            return false;
        }
        const normalized = this.commandService.applyOperationsToDocument(this.documents.cloneDocument(currentDocument), selection, [], applyOptions);
        if (!normalized.changed || normalized.message) {
            return false;
        }
        const validation = this.commandService.validateDocument(normalized.document);
        const layoutQuality = this.commandService.validateAiLayoutQuality(normalized.document, {
            ...applyOptions,
            requireVisibleContent: !selection.length
        });
        if (!validation.valid || (!layoutQuality.valid && !allowTemporaryLayoutQualityIssues)) {
            canvasAiFrontendDebug('apply-layout-repair-rejected', {
                validationIssues: validation.issues.slice(0, 5).map(issue => `${issue.path}: ${issue.message}`),
                layoutIssues: layoutQuality.issues.slice(0, 5).map(issue => `${issue.path}: ${issue.message}`)
            });
            return false;
        }
        this.reportAiStatus(widget, progress, this.createAiStatus('validating', 'Repairing layout', 'Canvas AI is normalizing the active layout before applying changes...'));
        const result = await widget.applyOperationsProgressively([], {
            selection,
            applyOptions,
            batchSize: 1,
            delayMs: 0
        });
        const applied = result.completed && result.changed && !result.message;
        canvasAiFrontendDebug(applied ? 'apply-layout-repair-applied' : 'apply-layout-repair-skipped', {
            changed: result.changed,
            completed: result.completed,
            hasMessage: !!result.message
        });
        return applied;
    }

    protected shouldAutoApplyAiResult(generated: OpenPencilAiDesignResult, selection: string[], prompt: string): boolean {
        return selection.length === 0 && this.isPageLevelAiPrompt(prompt);
    }

    protected evaluateAiCompleteness(document: OpenPencilDocument, prompt: string, selection: string[], requestMode: OpenPencilAiDesignRequest['mode'] | undefined, executionChoice?: OpenPencilAiExecutionChoice): OpenPencilAiCompletenessReport {
        const goal = this.createAiCompletenessGoal(prompt, selection, requestMode, executionChoice);
        const metrics = this.collectAiCompletenessMetrics(document, goal);
        const deficiencies = this.describeAiCompletenessDeficiencies(goal, metrics);
        return {
            goal,
            metrics,
            deficiencies,
            complete: this.meetsAiCompletenessHardMinimums(goal, metrics)
                && metrics.score >= goal.targetScore
                && metrics.layoutHealth >= goal.targetLayoutHealth
                && (deficiencies.length <= (goal.profile === 'web-page' ? 1 : 2)
                    || this.allowsAiCompletenessSoftDeficiencies(goal, metrics))
        };
    }

    protected allowsAiCompletenessSoftDeficiencies(goal: OpenPencilAiCompletenessGoal, metrics: OpenPencilAiCompletenessMetrics): boolean {
        if (!this.meetsAiCompletenessHardMinimums(goal, metrics) || metrics.layoutHealth < goal.targetLayoutHealth) {
            return false;
        }
        const scoreMargin = goal.profile === 'web-page' ? 0.035 : 0.05;
        if (metrics.score < Math.min(0.96, goal.targetScore + scoreMargin)) {
            return false;
        }
        if (goal.profile === 'web-page') {
            return metrics.sectionCount >= Math.min(goal.targetSectionCount, 6)
                && metrics.textCount >= Math.min(goal.targetTextCount, 14)
                && metrics.visualCount >= Math.min(goal.targetVisualCount, 8)
                && metrics.contentNodeCount >= Math.min(goal.targetNodeCount, 42)
                && metrics.usefulMaxBottom >= Math.max(1080, Math.round(goal.targetMinHeight * 0.62));
        }
        return metrics.nodeCount >= Math.min(goal.targetNodeCount, Math.max(10, Math.round(goal.targetNodeCount * 0.72)));
    }

    protected createAiCompletenessGoal(prompt: string, selection: string[], requestMode: OpenPencilAiDesignRequest['mode'] | undefined, executionChoice?: OpenPencilAiExecutionChoice): OpenPencilAiCompletenessGoal {
        const lower = prompt.toLowerCase();
        const referenceIntent = /\b(clone|clonar|copy|copia|cópia|copie|copiar|igual|parecido|refer[eê]ncia|reference|print|screenshot|captura|recrie|recreate|mimic|imite)\b/i.test(lower);
        const pageIntent = this.isWebPageAiPrompt(lower);
        const screenIntent = /\b(screen|tela|dashboard|app|mobile|desktop|form|formul[aá]rio|editor|ide|crm|admin|sistema|interface)\b/i.test(lower);
        const editIntent = !!selection.length || requestMode === 'maintenance';
        const profile = editIntent ? 'edit' : this.detectAiCompositionProfile(lower, referenceIntent, pageIntent, screenIntent);
        const intent: OpenPencilAiCompletenessIntent = editIntent
            ? 'edit'
            : referenceIntent
                ? 'reference'
                : pageIntent
                    ? 'page'
                    : screenIntent
                        ? 'screen'
                        : 'component';
        const density: OpenPencilAiCompletenessDensity = /\b(r[aá]pido|simple|simples|minimal|minimalista|draft|rascunho)\b/i.test(lower)
            ? 'fast'
            : referenceIntent || /\b(fiel|detalhad[ao]|detailed|complete|completo|completa|inteir[ao]|full|rico|rich|polished|profissional)\b/i.test(lower)
                ? 'detailed'
                : /\b(robusto|substantial|cheio|dens[ao]|varia[cç][oõ]es|several|v[aá]rios|varias|várias)\b/i.test(lower)
                    ? 'rich'
                    : 'normal';

        const base = this.baseAiCompletenessTargets(profile);
        const densityScale = density === 'fast' ? 0.72 : density === 'rich' ? 1.22 : density === 'detailed' ? 1.45 : 1;
        const economicalProviderBonus = this.isEconomicalAiExecution(executionChoice?.execution) ? 1 : 0;
        const referencePassBonus = (intent === 'reference' || density === 'detailed') && profile !== 'edit' ? 2 : 0;
        return {
            intent,
            profile,
            density,
            targetScore: this.clamp(base.targetScore + (density === 'detailed' ? 0.03 : density === 'rich' ? 0.015 : density === 'fast' ? -0.04 : 0), 0.62, 0.92),
            targetLayoutHealth: base.targetLayoutHealth,
            maxStreamingPasses: Math.min(OPENPENCIL_AI_COMPLETENESS_MAX_STREAMING_PASSES, base.maxStreamingPasses + economicalProviderBonus + referencePassBonus),
            maxBatchPasses: Math.min(OPENPENCIL_AI_COMPLETENESS_MAX_BATCH_PASSES, base.maxBatchPasses + economicalProviderBonus + Math.min(1, referencePassBonus)),
            minScoreGain: density === 'fast' ? OPENPENCIL_AI_COMPLETENESS_MIN_SCORE_GAIN * 1.5 : OPENPENCIL_AI_COMPLETENESS_MIN_SCORE_GAIN,
            targetNodeCount: Math.max(1, Math.round(base.targetNodeCount * densityScale)),
            targetSectionCount: Math.max(1, Math.round(base.targetSectionCount * densityScale)),
            targetTextCount: Math.max(1, Math.round(base.targetTextCount * densityScale)),
            targetVisualCount: Math.max(1, Math.round(base.targetVisualCount * densityScale)),
            targetCardLikeCount: Math.max(0, Math.round(base.targetCardLikeCount * densityScale)),
            targetTopLevelCount: Math.max(1, Math.round(base.targetTopLevelCount * Math.min(1.25, densityScale))),
            targetVerticalCoverage: this.clamp(base.targetVerticalCoverage + (density === 'detailed' ? 0.08 : density === 'rich' ? 0.04 : density === 'fast' ? -0.12 : 0), 0.22, 0.95),
            targetAreaCoverage: this.clamp(base.targetAreaCoverage + (density === 'detailed' ? 0.05 : density === 'rich' ? 0.03 : density === 'fast' ? -0.06 : 0), 0.06, 0.7),
            targetMinHeight: Math.round(base.targetMinHeight * (density === 'detailed' ? 1.22 : density === 'rich' ? 1.12 : density === 'fast' ? 0.78 : 1)),
            preservePageWidth: profile === 'web-page' && this.shouldPreserveAiPageWidth(prompt)
        };
    }

    protected detectAiCompositionProfile(lowerPrompt: string, referenceIntent: boolean, pageIntent: boolean, screenIntent: boolean): OpenPencilAiCompositionProfile {
        const posterIntent = /\b(poster|cartaz|flyer|panfleto|one[- ]?pager|key visual|visual principal|capa|cover|an[uú]ncio impresso|print ad)\b/i.test(lowerPrompt);
        const bannerIntent = /\b(banner|outdoor|billboard|leaderboard|display ad|hero graphic|header graphic|capa horizontal)\b/i.test(lowerPrompt);
        const socialIntent = /\b(instagram|story|stories|post social|social media|rede social|thumbnail|youtube thumb|linkedin post|facebook post|tiktok|feed post)\b/i.test(lowerPrompt);
        const wireframeIntent = /\b(wireframe|low[- ]?fi|lo[- ]?fi|baixa fidelidade|estrutura|esqueleto|graybox|greybox)\b/i.test(lowerPrompt);
        const diagramIntent = /\b(diagrama|diagram|flowchart|fluxograma|jornada|journey map|sitemap|mapa mental|mind map|arquitetura|organograma)\b/i.test(lowerPrompt);
        const componentIntent = /\b(component|componente|card|modal|dialog|popover|widget|toolbar|navbar|sidebar|form field|input|button|bot[aã]o|toast|empty state|estado vazio)\b/i.test(lowerPrompt);
        const referenceBoardIntent = referenceIntent && /\b(figma|dribbble|behance|moodboard|mood board|style frame|reference board|board|mockup|refer[eê]ncia visual|design de refer[eê]ncia)\b/i.test(lowerPrompt);

        if (pageIntent) {
            return 'web-page';
        }
        if (wireframeIntent) {
            return 'wireframe';
        }
        if (diagramIntent) {
            return 'diagram';
        }
        if (socialIntent) {
            return 'social';
        }
        if (bannerIntent) {
            return 'banner';
        }
        if (posterIntent) {
            return 'poster';
        }
        if (screenIntent) {
            return 'app-screen';
        }
        if (componentIntent) {
            return 'component';
        }
        if (referenceBoardIntent || referenceIntent) {
            return 'reference-board';
        }
        return 'component';
    }

    protected baseAiCompletenessTargets(profile: OpenPencilAiCompositionProfile): Omit<OpenPencilAiCompletenessGoal, 'intent' | 'profile' | 'density' | 'minScoreGain' | 'preservePageWidth'> {
        switch (profile) {
            case 'web-page':
                return { targetScore: 0.82, targetLayoutHealth: 0.72, maxStreamingPasses: 4, maxBatchPasses: 3, targetNodeCount: 78, targetSectionCount: 6, targetTextCount: 18, targetVisualCount: 16, targetCardLikeCount: 7, targetTopLevelCount: 5, targetVerticalCoverage: 0.72, targetAreaCoverage: 0.22, targetMinHeight: 1450 };
            case 'app-screen':
                return { targetScore: 0.78, targetLayoutHealth: 0.74, maxStreamingPasses: 3, maxBatchPasses: 2, targetNodeCount: 48, targetSectionCount: 4, targetTextCount: 11, targetVisualCount: 10, targetCardLikeCount: 4, targetTopLevelCount: 4, targetVerticalCoverage: 0.58, targetAreaCoverage: 0.24, targetMinHeight: 920 };
            case 'poster':
                return { targetScore: 0.78, targetLayoutHealth: 0.76, maxStreamingPasses: 3, maxBatchPasses: 2, targetNodeCount: 38, targetSectionCount: 3, targetTextCount: 8, targetVisualCount: 12, targetCardLikeCount: 0, targetTopLevelCount: 3, targetVerticalCoverage: 0.62, targetAreaCoverage: 0.28, targetMinHeight: 900 };
            case 'banner':
                return { targetScore: 0.76, targetLayoutHealth: 0.76, maxStreamingPasses: 3, maxBatchPasses: 2, targetNodeCount: 24, targetSectionCount: 2, targetTextCount: 5, targetVisualCount: 8, targetCardLikeCount: 0, targetTopLevelCount: 2, targetVerticalCoverage: 0.54, targetAreaCoverage: 0.30, targetMinHeight: 360 };
            case 'social':
                return { targetScore: 0.78, targetLayoutHealth: 0.76, maxStreamingPasses: 3, maxBatchPasses: 2, targetNodeCount: 32, targetSectionCount: 3, targetTextCount: 6, targetVisualCount: 10, targetCardLikeCount: 0, targetTopLevelCount: 3, targetVerticalCoverage: 0.62, targetAreaCoverage: 0.30, targetMinHeight: 900 };
            case 'wireframe':
                return { targetScore: 0.74, targetLayoutHealth: 0.78, maxStreamingPasses: 3, maxBatchPasses: 2, targetNodeCount: 34, targetSectionCount: 5, targetTextCount: 10, targetVisualCount: 5, targetCardLikeCount: 3, targetTopLevelCount: 4, targetVerticalCoverage: 0.58, targetAreaCoverage: 0.18, targetMinHeight: 760 };
            case 'diagram':
                return { targetScore: 0.76, targetLayoutHealth: 0.76, maxStreamingPasses: 3, maxBatchPasses: 2, targetNodeCount: 36, targetSectionCount: 2, targetTextCount: 8, targetVisualCount: 12, targetCardLikeCount: 0, targetTopLevelCount: 3, targetVerticalCoverage: 0.52, targetAreaCoverage: 0.20, targetMinHeight: 700 };
            case 'reference-board':
                return { targetScore: 0.80, targetLayoutHealth: 0.76, maxStreamingPasses: 4, maxBatchPasses: 3, targetNodeCount: 44, targetSectionCount: 4, targetTextCount: 10, targetVisualCount: 14, targetCardLikeCount: 2, targetTopLevelCount: 4, targetVerticalCoverage: 0.60, targetAreaCoverage: 0.28, targetMinHeight: 900 };
            case 'component':
                return { targetScore: 0.72, targetLayoutHealth: 0.76, maxStreamingPasses: 2, maxBatchPasses: 1, targetNodeCount: 24, targetSectionCount: 2, targetTextCount: 5, targetVisualCount: 5, targetCardLikeCount: 1, targetTopLevelCount: 2, targetVerticalCoverage: 0.36, targetAreaCoverage: 0.12, targetMinHeight: 560 };
            case 'edit':
            default:
                return { targetScore: 0.66, targetLayoutHealth: 0.72, maxStreamingPasses: 0, maxBatchPasses: 0, targetNodeCount: 8, targetSectionCount: 1, targetTextCount: 2, targetVisualCount: 2, targetCardLikeCount: 0, targetTopLevelCount: 1, targetVerticalCoverage: 0.18, targetAreaCoverage: 0.06, targetMinHeight: 360 };
        }
    }

    protected collectAiCompletenessMetrics(document: OpenPencilDocument, goal: OpenPencilAiCompletenessGoal): OpenPencilAiCompletenessMetrics {
        const page = this.documents.getActivePage(document);
        const pageWidth = this.numericAiDimension(page.width, goal.preservePageWidth ? 1200 : 900);
        const pageHeight = this.numericAiDimension(page.height, goal.targetMinHeight);
        const targetHeight = Math.max(goal.targetMinHeight, Math.min(Math.max(pageHeight, 360), goal.targetMinHeight * 1.4));
        const totals = {
            nodeCount: 0,
            contentNodeCount: 0,
            sectionCount: 0,
            textCount: 0,
            visualCount: 0,
            cardLikeCount: 0,
            topLevelCount: 0,
            maxBottom: 0,
            usefulMaxBottom: 0,
            topLevelArea: 0
        };

        const visit = (nodes: OpenPencilNode[], offsetX: number, offsetY: number, depth: number): void => {
            for (const node of nodes) {
                if (node.visible === false) {
                    continue;
                }
                const width = this.numericAiDimension(node.width, Math.max(80, pageWidth * (depth === 0 ? 0.65 : 0.2)));
                const height = this.numericAiDimension(node.height, this.estimatedAiNodeHeight(node));
                const x = offsetX + this.numericAiDimension(node.x, 0);
                const y = offsetY + this.numericAiDimension(node.y, 0);
                const bottom = y + height;
                const renderable = this.isRenderableAiCompletenessNode(node, width, height);
                const pageContainer = renderable && this.isAiCompletenessPageContainerNode(goal, node, width, height, pageWidth, depth);
                if (renderable) {
                    if (!pageContainer) {
                        totals.nodeCount++;
                        totals.maxBottom = Math.max(totals.maxBottom, bottom);
                        if (this.isAiCompletenessContentfulNode(goal, node, width, height, pageWidth, depth)) {
                            totals.contentNodeCount++;
                            totals.usefulMaxBottom = Math.max(totals.usefulMaxBottom, bottom);
                        }
                    }
                    if (this.isAiCompletenessPrimaryCoverageNode(goal, node, width, height, pageWidth, depth, pageContainer)) {
                        totals.topLevelCount++;
                        totals.topLevelArea += Math.min(Math.max(width, 0), pageWidth) * Math.max(height, 0);
                    }
                    if (!pageContainer && this.isAiCompletenessSectionNode(node, width, height, pageWidth)) {
                        totals.sectionCount++;
                    }
                    if (!pageContainer && node.type === 'text' && this.isMeaningfulAiCompletenessText(this.aiTextContent(node))) {
                        totals.textCount++;
                    }
                    if (!pageContainer && this.isAiCompletenessVisualNode(node)) {
                        totals.visualCount++;
                    }
                    if (!pageContainer && this.isAiCompletenessCardLikeNode(node, width, height)) {
                        totals.cardLikeCount++;
                    }
                }
                if (node.children?.length) {
                    visit(node.children, x, y, depth + 1);
                }
            }
        };
        visit(page.children ?? [], 0, 0, 0);

        const validation = this.commandService.validateAiLayoutQuality(document, {
            normalizeVisibleBounds: true,
            preservePageWidth: goal.preservePageWidth,
            targetPageWidth: goal.preservePageWidth ? 1200 : undefined,
            requireVisibleContent: true
        });
        const errors = validation.issues.filter(issue => issue.severity === 'error').length;
        const warnings = validation.issues.length - errors;
        const layoutHealth = this.clamp(1 - errors * 0.24 - warnings * 0.06, 0, 1);
        const verticalCoverage = this.clamp(totals.maxBottom / Math.max(1, targetHeight), 0, 1);
        const usefulVerticalCoverage = this.clamp(totals.usefulMaxBottom / Math.max(1, targetHeight), 0, 1);
        const areaCoverage = this.clamp(totals.topLevelArea / Math.max(1, pageWidth * targetHeight), 0, 1);
        const score = this.scoreAiCompleteness(goal, {
            node: this.scorePart(totals.nodeCount, goal.targetNodeCount),
            section: this.scorePart(totals.sectionCount, goal.targetSectionCount),
            text: this.scorePart(totals.textCount, goal.targetTextCount),
            visual: this.scorePart(totals.visualCount, goal.targetVisualCount),
            card: this.scorePart(totals.cardLikeCount, goal.targetCardLikeCount),
            topLevel: this.scorePart(totals.topLevelCount, goal.targetTopLevelCount),
            vertical: this.scorePart(goal.profile === 'web-page' ? usefulVerticalCoverage : verticalCoverage, goal.targetVerticalCoverage),
            area: this.scorePart(areaCoverage, goal.targetAreaCoverage),
            layout: layoutHealth
        });

        return {
            score,
            nodeCount: totals.nodeCount,
            contentNodeCount: totals.contentNodeCount,
            sectionCount: totals.sectionCount,
            textCount: totals.textCount,
            visualCount: totals.visualCount,
            cardLikeCount: totals.cardLikeCount,
            topLevelCount: totals.topLevelCount,
            maxBottom: Math.round(totals.maxBottom),
            usefulMaxBottom: Math.round(totals.usefulMaxBottom),
            pageWidth: Math.round(pageWidth),
            pageHeight: Math.round(pageHeight),
            verticalCoverage,
            usefulVerticalCoverage,
            areaCoverage,
            layoutHealth,
            validationIssueCount: validation.issues.length
        };
    }

    protected scoreAiCompleteness(goal: OpenPencilAiCompletenessGoal, parts: OpenPencilAiCompletenessScoreParts): number {
        const weights: OpenPencilAiCompletenessScoreParts = (() => {
            switch (goal.profile) {
                case 'web-page':
                    return { node: 0.20, section: 0.15, text: 0.14, visual: 0.13, card: 0.10, topLevel: 0.06, vertical: 0.12, area: 0.04, layout: 0.06 };
                case 'app-screen':
                    return { node: 0.18, section: 0.12, text: 0.14, visual: 0.14, card: 0.08, topLevel: 0.06, vertical: 0.10, area: 0.12, layout: 0.06 };
                case 'poster':
                case 'social':
                    return { node: 0.14, section: 0.08, text: 0.16, visual: 0.22, card: 0.02, topLevel: 0.06, vertical: 0.10, area: 0.17, layout: 0.05 };
                case 'banner':
                    return { node: 0.14, section: 0.06, text: 0.18, visual: 0.22, card: 0.02, topLevel: 0.08, vertical: 0.08, area: 0.17, layout: 0.05 };
                case 'wireframe':
                    return { node: 0.20, section: 0.18, text: 0.18, visual: 0.08, card: 0.08, topLevel: 0.08, vertical: 0.10, area: 0.05, layout: 0.05 };
                case 'diagram':
                    return { node: 0.18, section: 0.08, text: 0.20, visual: 0.22, card: 0.02, topLevel: 0.06, vertical: 0.08, area: 0.11, layout: 0.05 };
                case 'reference-board':
                    return { node: 0.16, section: 0.10, text: 0.14, visual: 0.20, card: 0.06, topLevel: 0.06, vertical: 0.08, area: 0.15, layout: 0.05 };
                case 'component':
                    return { node: 0.18, section: 0.08, text: 0.15, visual: 0.18, card: 0.05, topLevel: 0.08, vertical: 0.05, area: 0.18, layout: 0.05 };
                case 'edit':
                default:
                    return { node: 0.22, section: 0.08, text: 0.16, visual: 0.16, card: 0.02, topLevel: 0.08, vertical: 0.04, area: 0.14, layout: 0.10 };
            }
        })();
        return this.clamp(
            parts.node * weights.node +
            parts.section * weights.section +
            parts.text * weights.text +
            parts.visual * weights.visual +
            parts.card * weights.card +
            parts.topLevel * weights.topLevel +
            parts.vertical * weights.vertical +
            parts.area * weights.area +
            parts.layout * weights.layout,
            0,
            1
        );
    }

    protected describeAiCompletenessDeficiencies(goal: OpenPencilAiCompletenessGoal, metrics: OpenPencilAiCompletenessMetrics): string[] {
        const deficiencies: string[] = [];
        deficiencies.push(...this.describeAiHardMinimumDeficiencies(goal, metrics));
        if (metrics.nodeCount < goal.targetNodeCount) {
            deficiencies.push(`increase useful visible element density from ${metrics.nodeCount} toward ${goal.targetNodeCount}`);
        }
        if (goal.profile === 'web-page' && metrics.contentNodeCount < Math.min(goal.targetNodeCount, goal.density === 'fast' ? 24 : 42)) {
            deficiencies.push(`add meaningful page content instead of background/placeholder structure; useful content nodes are ${metrics.contentNodeCount}`);
        }
        if (metrics.sectionCount < goal.targetSectionCount) {
            deficiencies.push(`add or enrich major ${this.aiCompositionRegionLabel(goal.profile)} from ${metrics.sectionCount} toward ${goal.targetSectionCount}`);
        }
        if (metrics.textCount < goal.targetTextCount) {
            deficiencies.push(`add meaningful labels, titles, descriptions, prices, metadata, or controls from ${metrics.textCount} toward ${goal.targetTextCount}`);
        }
        if (metrics.visualCount < goal.targetVisualCount) {
            deficiencies.push(`add bounded image/icon/shape visuals from ${metrics.visualCount} toward ${goal.targetVisualCount}`);
        }
        if (metrics.cardLikeCount < goal.targetCardLikeCount) {
            deficiencies.push(`add repeated cards/list items/modules from ${metrics.cardLikeCount} toward ${goal.targetCardLikeCount}`);
        }
        const verticalCoverage = goal.profile === 'web-page' ? metrics.usefulVerticalCoverage : metrics.verticalCoverage;
        if (verticalCoverage < goal.targetVerticalCoverage) {
            deficiencies.push(this.aiVerticalCoverageDeficiency(goal, metrics));
        }
        if (metrics.areaCoverage < goal.targetAreaCoverage) {
            deficiencies.push(`improve artboard/frame occupancy; current covered area score is ${Math.round(metrics.areaCoverage * 100)}% and target is ${Math.round(goal.targetAreaCoverage * 100)}%`);
        }
        if (metrics.layoutHealth < goal.targetLayoutHealth) {
            deficiencies.push(`repair layout quality before adding more content; validation issues: ${metrics.validationIssueCount}`);
        }
        return deficiencies.slice(0, 6);
    }

    protected meetsAiCompletenessHardMinimums(goal: OpenPencilAiCompletenessGoal, metrics: OpenPencilAiCompletenessMetrics): boolean {
        if (goal.profile !== 'web-page' || (goal.intent !== 'page' && goal.intent !== 'reference')) {
            return true;
        }
        const fast = goal.density === 'fast';
        const demandingPage = goal.intent === 'reference' || goal.density === 'detailed' || goal.density === 'rich';
        const nodeMinimum = fast ? 30 : demandingPage ? 92 : 58;
        const sectionMinimum = fast ? 4 : demandingPage ? 7 : 5;
        const textMinimum = fast ? 8 : demandingPage ? 22 : 14;
        const visualMinimum = fast ? 4 : demandingPage ? 12 : 8;
        const cardMinimum = fast ? 2 : demandingPage ? 6 : 4;
        const contentMinimum = fast ? 24 : demandingPage ? 68 : 42;
        const bottomMinimum = Math.max(
            fast ? 820 : demandingPage ? 1600 : 1080,
            Math.round(goal.targetMinHeight * (fast ? 0.44 : demandingPage ? 0.70 : 0.62))
        );
        return metrics.nodeCount >= Math.min(goal.targetNodeCount, nodeMinimum)
            && metrics.contentNodeCount >= Math.min(goal.targetNodeCount, contentMinimum)
            && metrics.sectionCount >= Math.min(goal.targetSectionCount, sectionMinimum)
            && metrics.textCount >= Math.min(goal.targetTextCount, textMinimum)
            && metrics.visualCount >= Math.min(goal.targetVisualCount, visualMinimum)
            && metrics.cardLikeCount >= Math.min(goal.targetCardLikeCount, cardMinimum)
            && metrics.usefulMaxBottom >= bottomMinimum
            && metrics.usefulVerticalCoverage >= Math.min(goal.targetVerticalCoverage, fast ? 0.42 : demandingPage ? 0.68 : 0.58)
            && metrics.areaCoverage >= Math.min(goal.targetAreaCoverage, fast ? 0.08 : demandingPage ? 0.16 : 0.12);
    }

    protected describeAiHardMinimumDeficiencies(goal: OpenPencilAiCompletenessGoal, metrics: OpenPencilAiCompletenessMetrics): string[] {
        if (this.meetsAiCompletenessHardMinimums(goal, metrics)) {
            return [];
        }
        if (goal.profile !== 'web-page') {
            return ['complete the bounded artifact before finishing; current content is still below deterministic minimums'];
        }
        return [
            'continue beyond the header/hero: page-level clone/reference prompts require body sections, repeated groups/modules when relevant, supporting/detail regions, and closing/help content before finishing'
        ];
    }

    protected aiCompositionRegionLabel(profile: OpenPencilAiCompositionProfile): string {
        switch (profile) {
            case 'web-page':
                return 'page regions/sections';
            case 'app-screen':
                return 'screen regions, panels, or states';
            case 'poster':
            case 'social':
                return 'visual hierarchy groups';
            case 'banner':
                return 'banner zones';
            case 'wireframe':
                return 'wireframe blocks';
            case 'diagram':
                return 'diagram clusters or flows';
            case 'reference-board':
                return 'reference composition groups';
            case 'component':
                return 'component subregions';
            case 'edit':
            default:
                return 'composition regions';
        }
    }

    protected aiVerticalCoverageDeficiency(goal: OpenPencilAiCompletenessGoal, metrics: OpenPencilAiCompletenessMetrics): string {
        const target = Math.round(goal.targetVerticalCoverage * 100);
        if (goal.profile === 'web-page') {
            return `extend or fill the vertical page structure with useful content; useful bottom is ${metrics.usefulMaxBottom}px and target coverage is ${target}%`;
        }
        if (goal.profile === 'banner') {
            return `fill the intended banner height without turning it into a long page; current bottom is ${metrics.maxBottom}px and target coverage is ${target}%`;
        }
        return `fill the intended artboard/composition bounds instead of appending homepage sections; current bottom is ${metrics.maxBottom}px and target coverage is ${target}%`;
    }

    protected aiCompositionProfileInstruction(goal: OpenPencilAiCompletenessGoal): string {
        switch (goal.profile) {
            case 'web-page':
                return 'Composition profile: web page. Continue as a centered vertical page/feed only when the original prompt asks for a site, homepage, marketplace, landing page, or e-commerce surface.';
            case 'app-screen':
                return 'Composition profile: app/screen. Complete one bounded interface screen with panels, controls, states, and visual hierarchy. Do not add website footer/navigation unless requested.';
            case 'poster':
                return 'Composition profile: poster/flyer/key visual. Complete a bounded artboard with strong hierarchy, imagery, headline/supporting copy, and balanced negative space. Do not append page sections.';
            case 'banner':
                return 'Composition profile: banner/ad/cover. Complete one horizontal or compact bounded composition with clear message, visual anchor, and CTA/detail area. Do not make it a vertical homepage.';
            case 'social':
                return 'Composition profile: social/thumbnail. Complete one bounded social creative with focal visual, readable headline, supporting copy/badges, and balanced margins. Do not add site scaffolding.';
            case 'wireframe':
                return 'Composition profile: wireframe. Improve structural fidelity, layout blocks, labels, placeholders, and flow clarity. Keep visual styling intentionally restrained.';
            case 'diagram':
                return 'Composition profile: diagram/flow. Add bounded nodes, connectors, labels, grouping, and directional clarity. Do not add decorative page sections.';
            case 'reference-board':
                return 'Composition profile: reference board or Figma-style design reference. Match the requested visual structure and density as a bounded composition, not as a default website.';
            case 'component':
                return 'Composition profile: component. Complete the isolated component/widget/card/modal with its internal states and visual hierarchy. Do not expand it into a full screen unless requested.';
            case 'edit':
            default:
                return 'Composition profile: edit. Preserve the existing artifact and make only the requested bounded improvements.';
        }
    }

    protected aiCompositionPlacementInstruction(goal: OpenPencilAiCompletenessGoal): string {
        if (goal.profile === 'web-page') {
            return 'Add or refine content in bounded regions inside the existing page width. Keep major page sections vertically stacked with a shared left/right alignment; if a section is laterally outside the page frame, move it back inside the same root instead of widening the page. If adding new page content, place it below the current content or inside clearly sparse existing containers.';
        }
        return 'Add or refine content inside the main artboard/frame or clearly sparse existing containers. Keep coordinates relative to the parent frame, not the global canvas, and do not append unrelated homepage sections below the design unless the original prompt explicitly asks for a page.';
    }

    protected createAiCompletenessContinuationPrompt(originalPrompt: string, pass: number, totalPasses: number, report: OpenPencilAiCompletenessReport): string {
        const goal = report.goal;
        const metrics = report.metrics;
        return [
            `Original user request: ${originalPrompt}`,
            `Generic composition completeness pass ${pass}/${totalPasses}.`,
            `Current deterministic completeness score: ${metrics.score.toFixed(2)}; target: ${goal.targetScore.toFixed(2)}; intent: ${goal.intent}; profile: ${goal.profile}; density: ${goal.density}.`,
            `Current metrics: ${metrics.nodeCount} nodes, ${metrics.contentNodeCount} useful content nodes, ${metrics.sectionCount} regions, ${metrics.textCount} text nodes, ${metrics.visualCount} visual nodes, ${metrics.cardLikeCount} repeated/card-like modules, useful bottom ${metrics.usefulMaxBottom}px.`,
            `Detected gaps: ${report.deficiencies.length ? report.deficiencies.join('; ') : 'continue only if the design still looks sparse or incomplete for the original request'}.`,
            this.aiCompositionProfileInstruction(goal),
            this.aiPageReferenceCompletionInstruction(goal, originalPrompt),
            goal.intent === 'reference'
                ? 'The original request appears to be a clone/reference task. Improve structural similarity, visual density, proportions, repeated groups, and coverage implied by the prompt/reference. Use the detected profile; do not assume a website unless the prompt asks for a website.'
                : 'This is a from-scratch completion pass. Add the next useful content/state/section/module implied by the prompt rather than a fixed template.',
            'Preserve all existing nodes and IDs. Do not recreate, delete, replace, cover, or move existing content unless explicitly needed to fix layout quality.',
            'Never reference an ID that is not already present in the current document unless you create that node earlier in the same operation set.',
            this.aiCompositionPlacementInstruction(goal),
            'Do not satisfy vertical coverage by only resizing a parent/root/background frame. Add visible sections, cards, text, controls, and visuals inside the existing composition.',
            'Keep layer order correct: use OpenPencil front-to-back child order, with foreground text/icons/controls before cards/media and cards/media before backgrounds/containers. Do not create overlapping text or off-page elements.',
            'Return visible changes through the normal Canvas AI operation contract for this request. Finish this pass only after addressing the listed gaps.'
        ].join('\n');
    }

    protected shouldRunAiCompletenessContinuation(report: OpenPencilAiCompletenessReport, streaming: boolean): boolean {
        const maxPasses = streaming ? report.goal.maxStreamingPasses : report.goal.maxBatchPasses;
        const hardMinimumsMet = this.meetsAiCompletenessHardMinimums(report.goal, report.metrics);
        const scoreBelowTarget = report.metrics.score < report.goal.targetScore;
        const layoutBelowTarget = report.metrics.layoutHealth < report.goal.targetLayoutHealth;
        const pageOrReference = report.goal.profile === 'web-page' || report.goal.intent === 'reference' || report.goal.intent === 'page';
        return maxPasses > 0
            && !report.complete
            && (!hardMinimumsMet || scoreBelowTarget || layoutBelowTarget)
            && (report.metrics.layoutHealth >= 0.35 || !hardMinimumsMet || pageOrReference);
    }

    protected shouldRetryNoProgressAiCompletenessPass(report: OpenPencilAiCompletenessReport, pass: number, maxPasses: number, streaming: boolean): boolean {
        if (pass >= maxPasses || report.complete) {
            return false;
        }
        if (report.goal.profile !== 'web-page' && report.goal.intent !== 'reference') {
            return false;
        }
        const hardMinimumsMet = this.meetsAiCompletenessHardMinimums(report.goal, report.metrics);
        const targetGap = report.metrics.score < report.goal.targetScore
            || report.metrics.layoutHealth < report.goal.targetLayoutHealth;
        const allowedNoProgressPasses = streaming ? 3 : 2;
        return pass <= allowedNoProgressPasses
            && (!hardMinimumsMet || targetGap);
    }

    protected shouldStopWeakAiCompletenessLoop(report: OpenPencilAiCompletenessReport, weakPasses: number): boolean {
        if (weakPasses < 2 || !this.meetsAiCompletenessHardMinimums(report.goal, report.metrics)) {
            return false;
        }
        const pageOrReference = report.goal.profile === 'web-page' || report.goal.intent === 'reference' || report.goal.intent === 'page';
        if (!pageOrReference) {
            return true;
        }
        return report.metrics.score >= report.goal.targetScore
            && report.metrics.layoutHealth >= report.goal.targetLayoutHealth;
    }

    protected aiPageReferenceCompletionInstruction(goal: OpenPencilAiCompletenessGoal, originalPrompt: string): string {
        if (goal.profile !== 'web-page') {
            return 'Do not finish only because one visible region exists; complete the requested bounded artifact to the deterministic target.';
        }
        return [
            'Reference/page requirement: do not finish at only the first visible region, header, navigation, hero, or sparse shell.',
            'Infer the requested artifact type from the prompt and current canvas. Complete that type: e-commerce/marketplace pages need bounded shelves/cards/promos when requested; SaaS/landing pages need feature/proof/detail/CTA regions; media/content pages need feeds/grids/recommendations; app or Figma-style references need the remaining panels/states inside the bounded composition.',
            'If the current canvas is sparse, create the next missing body/section/module below or inside the existing composition immediately, without forcing a marketplace template unless the prompt asks for one.'
        ].join(' ');
    }

    protected isEconomicalAiExecution(execution: CyberVinciAiExecutionSelection | undefined): boolean {
        const model = (execution?.model ?? '').toLowerCase();
        const provider = (execution?.modelProvider ?? execution?.providerId ?? '').toLowerCase();
        return provider.includes('opencode')
            || provider.includes('openrouter')
            || model.includes('deepseek')
            || model.includes('flash')
            || model.includes('mini')
            || model.includes('free')
            || model.includes('qwen')
            || model.includes('minimax');
    }

    protected shouldSkipBatchFallbackAfterStreamingFailure(executionChoice: OpenPencilAiExecutionChoice): boolean {
        return false;
    }

    protected numericAiDimension(value: unknown, fallback: number): number {
        if (typeof value === 'number' && Number.isFinite(value)) {
            return value;
        }
        if (typeof value === 'string') {
            const parsed = Number.parseFloat(value);
            if (Number.isFinite(parsed)) {
                return parsed;
            }
        }
        return fallback;
    }

    protected estimatedAiNodeHeight(node: OpenPencilNode): number {
        if (node.type === 'text') {
            const text = this.aiTextContent(node);
            const lines = Math.max(1, Math.ceil(text.length / 42));
            const fontSize = this.numericAiDimension(node.fontSize, 14);
            const rawLineHeight = this.numericAiDimension(node.lineHeight, 1.25);
            const lineHeightPx = rawLineHeight > 0 && rawLineHeight <= 4
                ? Math.max(fontSize, rawLineHeight * fontSize)
                : Math.max(fontSize, rawLineHeight);
            return Math.max(18, lines * lineHeightPx);
        }
        if (node.children?.length) {
            return 120;
        }
        return node.type === 'image' ? 120 : 48;
    }

    protected isRenderableAiCompletenessNode(node: OpenPencilNode, width: number, height: number): boolean {
        if (this.isGeneratedAiPlaceholderCompletenessNode(node)) {
            return false;
        }
        return node.type === 'text'
            ? !!this.aiTextContent(node).trim()
            : width > 0 && height > 0 && node.opacity !== 0;
    }

    protected isGeneratedAiPlaceholderCompletenessNode(node: OpenPencilNode): boolean {
        const label = `${node.id} ${node.name ?? ''} ${node.role ?? ''}`.toLowerCase();
        if (/\b(ai page skeleton|canvas ai completed page|generated skeleton|skeleton brand)\b/.test(label)) {
            return true;
        }
        if (/\bgeneric-(?:nav|navigation|card|footer|section|block|panel|hero)\b/.test(label)) {
            return true;
        }
        if (node.type === 'text') {
            const content = this.aiTextContent(node).trim().replace(/\s+/g, ' ').toLowerCase();
            return content === 'openpencil design'
                || content === 'edit this embedded .op design inside theia.'
                || /\b(generated skeleton|skeleton brand|texto curto para completar a narrativa visual)\b/.test(content);
        }
        return false;
    }

    protected isAiCompletenessContentfulNode(goal: OpenPencilAiCompletenessGoal, node: OpenPencilNode, width: number, height: number, pageWidth: number, depth: number): boolean {
        if (node.type === 'text') {
            return this.isMeaningfulAiCompletenessText(this.aiTextContent(node));
        }
        if (node.type === 'image' || node.type === 'icon_font') {
            return width >= 12 && height >= 12;
        }
        if (node.type === 'ellipse' || node.type === 'polygon' || node.type === 'path' || node.type === 'line') {
            return width >= 10 && height >= 10;
        }
        if (node.type === 'rectangle') {
            const name = `${node.name ?? ''} ${node.role ?? ''}`.toLowerCase();
            if (/\b(background|bg|fundo|spacer|space|gap|container|root|page)\b/i.test(name)) {
                return false;
            }
            return width <= pageWidth * 0.72 && height <= Math.max(280, goal.targetMinHeight * 0.24);
        }
        if (node.type === 'frame' || node.type === 'group') {
            const children = node.children?.filter(child => child.visible !== false) ?? [];
            if (children.length < 2) {
                return false;
            }
            return this.isAiCompletenessCardLikeNode(node, width, height)
                || this.isAiCompletenessSectionNode(node, width, height, pageWidth)
                || (depth > 0 && children.length >= 3);
        }
        return false;
    }

    protected isMeaningfulAiCompletenessText(text: string): boolean {
        const normalized = text.replace(/\s+/g, ' ').trim();
        if (normalized.length < 2) {
            return false;
        }
        return !/\b(Edit this embedded \.op design inside Theia|OpenPencil Design|Canvas AI completed page|AI generated|generated skeleton|placeholder|Texto curto para completar a narrativa visual)\b/i.test(normalized);
    }

    protected isAiCompletenessSectionNode(node: OpenPencilNode, width: number, height: number, pageWidth: number): boolean {
        const name = `${node.name ?? ''} ${node.role ?? ''}`.toLowerCase();
        return (node.type === 'frame' || node.type === 'group')
            && (width >= pageWidth * 0.42 || height >= 140 || (node.children?.length ?? 0) >= 3 || /\b(section|grupo|grid|row|linha|banner|panel|painel|card|list|lista|shelf|prateleira)\b/.test(name));
    }

    protected isAiCompletenessPageContainerNode(goal: OpenPencilAiCompletenessGoal, node: OpenPencilNode, width: number, height: number, pageWidth: number, depth: number): boolean {
        if (goal.profile !== 'web-page' || depth !== 0 || (node.type !== 'frame' && node.type !== 'group') || !(node.children?.length)) {
            return false;
        }
        if (width < pageWidth * 0.72 || height < Math.max(600, goal.targetMinHeight * 0.45)) {
            return false;
        }
        const label = `${node.id} ${node.name ?? ''} ${node.role ?? ''}`.toLowerCase();
        const pageLike = /\b(page|homepage|home|website|site|marketplace|e-?commerce|catalog|landing|content|main|root|pagina|página|document)\b/.test(label);
        const sectionChildren = (node.children ?? []).filter(child => {
            const childWidth = this.numericAiDimension(child.width, pageWidth);
            const childHeight = this.numericAiDimension(child.height, this.estimatedAiNodeHeight(child));
            return this.isAiCompletenessSectionNode(child, childWidth, childHeight, pageWidth);
        }).length;
        return pageLike || sectionChildren >= 2;
    }

    protected isAiCompletenessPrimaryCoverageNode(goal: OpenPencilAiCompletenessGoal, node: OpenPencilNode, width: number, height: number, pageWidth: number, depth: number, pageContainer: boolean): boolean {
        if (pageContainer) {
            return false;
        }
        if (goal.profile !== 'web-page') {
            return depth === 0;
        }
        return depth === 0 || (depth === 1 && this.isAiCompletenessSectionNode(node, width, height, pageWidth));
    }

    protected isAiCompletenessVisualNode(node: OpenPencilNode): boolean {
        return node.type === 'image'
            || node.type === 'icon_font'
            || node.type === 'ellipse'
            || node.type === 'polygon'
            || node.type === 'path'
            || node.type === 'line'
            || (node.type === 'rectangle' && (!!node.fill?.length || !!node.stroke || !!node.effects?.length));
    }

    protected isAiCompletenessCardLikeNode(node: OpenPencilNode, width: number, height: number): boolean {
        const name = `${node.name ?? ''} ${node.role ?? ''}`.toLowerCase();
        return (node.type === 'frame' || node.type === 'group' || node.type === 'rectangle')
            && width >= 110
            && height >= 70
            && ((node.children?.length ?? 0) >= 2 || /\b(card|item|tile|produto|product|offer|oferta|module|m[oó]dulo)\b/.test(name));
    }

    protected aiTextContent(node: OpenPencilNode): string {
        if (typeof node.content === 'string') {
            return node.content;
        }
        if (Array.isArray(node.content)) {
            return node.content.map(segment => segment.text).join('');
        }
        return '';
    }

    protected scorePart(value: number, target: number): number {
        return target <= 0 ? 1 : this.clamp(value / target, 0, 1);
    }

    protected clamp(value: number, min: number, max: number): number {
        return Math.min(max, Math.max(min, value));
    }

    protected isPageLevelAiPrompt(prompt: string): boolean {
        const lower = prompt.toLowerCase();
        return this.isWebPageAiPrompt(lower)
            || /\b(screen|dashboard|app|hero|interface|tela|poster|cartaz|flyer|banner|social|thumbnail|capa|cover|component|componente|card|modal|widget|wireframe|diagrama|diagram|figma|mockup|refer[eê]ncia visual|design de refer[eê]ncia)\b/i.test(lower);
    }

    protected createAiApplyOptions(prompt: string, requestMode?: OpenPencilAiDesignRequest['mode']): OpenPencilApplyOperationsOptions {
        const preservePageWidth = this.shouldPreserveAiPageWidth(prompt);
        return {
            mode: requestMode,
            normalizeVisibleBounds: true,
            preservePageWidth,
            targetPageWidth: preservePageWidth ? 1200 : undefined
        };
    }

    protected shouldPreserveAiPageWidth(prompt: string): boolean {
        const lower = prompt.toLowerCase();
        if (/\b(side[- ]by[- ]side|lado a lado|desktop e mobile|mobile e desktop|multiple views|múltiplas telas|multiplas telas)\b/i.test(lower)) {
            return false;
        }
        return this.isWebPageAiPrompt(lower);
    }

    protected isWebPageAiPrompt(lowerPrompt: string): boolean {
        const explicitNonPageArtifact = /\b(figma|moodboard|mood board|style frame|poster|cartaz|flyer|banner|social|thumbnail|capa|cover|component|componente|card|modal|widget|wireframe|diagrama|diagram|fluxograma|app screen|tela de app|mobile screen|design de refer[eê]ncia)\b/i.test(lowerPrompt);
        const explicitPage = /\b(homepage|home page|home\b|p[aá]gina inicial|landing|landing page|site|website|webpage|web page|e-?commerce|loja virtual|marketplace|feed de produtos|p[aá]gina web|full page|p[aá]gina completa)\b/i.test(lowerPrompt);
        const cloneIntent = /\b(copy|copia|cópia|copie|copiar|clone|clonar|recrie|recreate|mimic|imite|igual|parecido|similar|refer[eê]ncia|reference)\b/i.test(lowerPrompt);
        const pageSurfaceIntent = /\b(homepage|home page|home\b|p[aá]gina|site|website|web|loja|marketplace|e-?commerce|feed|landing)\b/i.test(lowerPrompt);
        return explicitPage || (cloneIntent && (pageSurfaceIntent || this.isKnownWebSurfaceReference(lowerPrompt)) && !explicitNonPageArtifact);
    }

    protected isKnownWebSurfaceReference(lowerPrompt: string): boolean {
        if (/\b(?:https?:\/\/|www\.|[a-z0-9-]+\.(?:com|com\.br|io|app|dev|ai|net|org)\b)/i.test(lowerPrompt)) {
            return true;
        }
        const cloneIntent = /\b(copy|copia|c[oó]pia|copie|copiar|clone|clonar|recrie|recreate|mimic|imite|igual|parecido|similar|refer[eê]ncia|reference)\b/i.test(lowerPrompt);
        const surfaceHint = /\b(p[aá]gina\s+inicial|homepage|home\s+page|site|website|web|app|aplicativo|loja|store|marketplace|e-?commerce|landing|screen|tela)\b/i.test(lowerPrompt);
        const namedSurface = /\b(?:p[aá]gina\s+inicial|homepage|home\s+page|site|website|app|aplicativo|loja|store)\s+(?:do|da|de|of|for)\s+[a-z0-9à-öø-ÿ]/i.test(lowerPrompt);
        return namedSurface || (cloneIntent && surfaceHint);
    }

    protected createAiStatus(phase: OpenPencilAiStatus['phase'], label: string, detail: string): OpenPencilAiStatus {
        return { phase, label, detail };
    }

    protected createAiApplyingStatus(applied: number, total: number): OpenPencilAiStatus {
        return this.createAiStatus('applying', `Applying ${applied}/${total}`, `Canvas AI is applying ${applied}/${total} changes...`);
    }

    protected reportAiStatus(widget: OpenPencilEditorWidget, progress: OpenPencilProgressHandle | undefined, status: OpenPencilAiStatus): void {
        widget.setAiStatus(status);
        progress?.report({ message: status.detail ?? status.label });
    }

    protected aiProgressiveBatchSize(total: number): number {
        if (total <= 12) {
            return 1;
        }
        return Math.min(OPENPENCIL_AI_PROGRESSIVE_MAX_BATCH_SIZE, Math.ceil(total / 12));
    }

    protected isAiAutoApplyEnabled(): boolean {
        try {
            return typeof window !== 'undefined' && window.localStorage?.getItem(OPENPENCIL_AI_AUTO_APPLY_KEY) === 'true';
        } catch {
            return false;
        }
    }

    protected isAiIncrementalEnabled(): boolean {
        try {
            return typeof window === 'undefined' || window.localStorage?.getItem(OPENPENCIL_AI_INCREMENTAL_KEY) !== 'false';
        } catch {
            return true;
        }
    }

    protected isAiProviderStreamingEnabled(): boolean {
        try {
            if (typeof window === 'undefined') {
                return true;
            }
            // Streaming is the normal Canvas AI path; keep an explicit escape hatch only for local debugging.
            return window.localStorage?.getItem(OPENPENCIL_AI_PROVIDER_STREAMING_KEY) !== 'debug-disabled';
        } catch {
            return true;
        }
    }

    protected setAiAutoApply(enabled: boolean): void {
        try {
            if (typeof window !== 'undefined') {
                window.localStorage?.setItem(OPENPENCIL_AI_AUTO_APPLY_KEY, String(enabled));
            }
        } catch {
            // Ignore storage failures; applying the current edit still works.
        }
    }

    protected async applyStructuredCommand(options: {
        title?: string;
        prompt?: string;
        successPrefix?: string;
    } = {}): Promise<void> {
        const widget = this.activeOpenPencilWidget();
        if (!widget) {
            return;
        }
        const selection = widget.getSelection();
        const value = await this.quickInputService?.input({
            title: options.title ?? cybervinciCanvasCommandLabel('Apply Structured Command'),
            prompt: `${options.prompt ?? 'Paste one operation or an array of operations as JSON'}; current selection: ${this.formatSelection(selection)}`,
            value: '{"operation":"updateNode","nodeId":"hero-title","changes":{"content":"Automatize seus processos com IA","fontSize":48}}'
        });
        if (!value) {
            return;
        }
        const operations = this.parseStructuredOperations(value);
        if (!operations) {
            return;
        }
        const document = widget.getDocument();
        if (document) {
            const preview = this.commandService.applyOperationsToDocument(this.documents.cloneDocument(document), selection, operations);
            const validation = this.commandService.validateDocument(preview.document);
            if (!validation.valid) {
                this.messages.error(`Canvas structured command was not applied because validation failed: ${this.formatValidationIssues(validation)}`);
                return;
            }
        }
        const result = await widget.applyOperations(operations);
        if (result.message) {
            this.messages.warn(`Canvas edit did not fully apply: ${result.message}`);
        } else {
            this.messages.info(`${options.successPrefix ?? 'Canvas applied'} ${operations.length} structured operation${operations.length === 1 ? '' : 's'}; selection: ${this.formatSelection(result.selection)}.`);
        }
    }

    protected async previewAiEditSummary(): Promise<void> {
        const widget = this.activeOpenPencilWidget();
        const document = widget?.getDocument();
        if (!widget || !document) {
            return;
        }
        const value = await this.quickInputService?.input({
            title: cybervinciCanvasCommandLabel('Preview AI Edit Summary'),
            prompt: `Paste AI-generated Canvas operations JSON to preview; current selection: ${this.formatSelection(widget.getSelection())}`,
            value: '{"operation":"updateNode","nodeId":"hero-title","changes":{"content":"Automatize seus processos com IA","fontSize":48}}'
        });
        if (!value) {
            return;
        }
        const operations = this.parseStructuredOperations(value);
        if (!operations) {
            return;
        }
        const preview = this.commandService.applyOperationsToDocument(this.documents.cloneDocument(document), widget.getSelection(), operations);
        const validation = this.commandService.validateDocument(preview.document);
        const target = widget.uri.parent.resolve(`${widget.uri.path.name}.openpencil-ai-preview.json`);
        const reviewModel = createOpenPencilAiReviewModel({
            target: widget.uri.path.base,
            sourceLabel: 'Manual AI edit JSON',
            changed: preview.changed,
            message: preview.message,
            validation,
            currentSelection: widget.getSelection(),
            previewSelection: preview.selection,
            operations,
            beforeDocument: document,
            afterDocument: preview.document,
            previewArtifact: target.path.base
        });
        const content = {
            target: widget.uri.path.base,
            applied: preview.changed,
            message: preview.message,
            validation,
            currentSelection: widget.getSelection(),
            previewSelection: preview.selection,
            operations: this.summarizeOperations(operations),
            before: this.commandService.getDocumentSummary(document),
            after: this.commandService.getDocumentSummary(preview.document)
        };
        await this.fileService.writeFile(target, BinaryBuffer.fromString(`${JSON.stringify(content, undefined, 2)}\n`));
        await this.openAiReviewPanel(widget, operations, reviewModel, target, false);
        this.messages.info(`Canvas AI edit review created without changing the design: ${target.path.base}`);
    }

    protected async showDocumentSummary(): Promise<void> {
        const widget = this.activeOpenPencilWidget();
        const document = widget?.getDocument();
        if (!widget || !document) {
            return;
        }
        const summary = {
            ...this.commandService.getDocumentSummary(document),
            selection: widget.getSelection()
        };
        const target = widget.uri.parent.resolve(`${widget.uri.path.name}.openpencil-summary.json`);
        await this.fileService.writeFile(target, BinaryBuffer.fromString(`${JSON.stringify(summary, undefined, 2)}\n`));
        await this.editorManager.open(target, { mode: 'activate' });
        this.messages.info(`Canvas summary created: ${target.path.base}`);
    }

    protected async createCommandFile(options: {
        title?: string;
        fileSuffix?: string;
        source?: string;
    } = {}): Promise<void> {
        const widget = this.activeOpenPencilWidget();
        const document = widget?.getDocument();
        if (!widget) {
            return;
        }
        const target = widget.uri.parent.resolve(`${widget.uri.path.name}${options.fileSuffix ?? '.openpencil-commands.json'}`);
        const content = {
            version: '1',
            target: widget.uri.path.base,
            source: options.source ?? 'structured-command',
            currentSelection: widget.getSelection(),
            documentSummary: document ? this.commandService.getDocumentSummary(document) : undefined,
            instructions: [
                'Paste this file into Canvas: Apply AI Edit JSON or apply it from Explorer.',
                'Keep operations structured; do not use DOM selectors, HTML patches, JavaScript snippets, CLI commands, or MCP calls.'
            ],
            operations: [
                {
                    operation: 'createNode',
                    parentId: null,
                    node: {
                        id: 'ai-generated-benefit-card',
                        type: 'frame',
                        name: 'AI generated benefit card',
                        role: 'card',
                        x: 96,
                        y: 360,
                        width: 420,
                        height: 132,
                        layout: 'vertical',
                        gap: 8,
                        padding: 20,
                        fill: [{ type: 'solid', color: '#f8fafc' }],
                        stroke: [{ type: 'solid', color: '#cbd5e1' }],
                        children: [
                            {
                                id: 'ai-generated-benefit-title',
                                type: 'text',
                                content: 'Fluxos automatizados',
                                width: 320,
                                height: 28,
                                fontSize: 22,
                                fontWeight: 700
                            },
                            {
                                id: 'ai-generated-benefit-copy',
                                type: 'text',
                                content: 'Reduza tarefas repetitivas com uma experiencia visual editavel.',
                                width: 340,
                                height: 44,
                                fontSize: 16
                            }
                        ]
                    }
                },
                {
                    operation: 'updateNode',
                    nodeId: 'hero-title',
                    changes: {
                        content: 'Automatize seus processos com IA',
                        fontSize: 48
                    }
                },
                {
                    operation: 'setSelection',
                    nodeIds: ['hero-title', 'ai-generated-benefit-card']
                }
            ]
        };
        await this.fileService.writeFile(target, BinaryBuffer.fromString(`${JSON.stringify(content, undefined, 2)}\n`));
        await this.editorManager.open(target, { mode: 'activate' });
        this.messages.info(`${options.title ?? 'Canvas command file'} created: ${target.path.base}`);
    }

    protected async applyCommandFile(uri: URI | undefined): Promise<void> {
        if (!uri) {
            return;
        }
        await this.safeRun('apply the Canvas command file', async () => {
            const content = (await this.fileService.read(uri)).value;
            const operations = this.parseStructuredOperations(content);
            if (!operations) {
                return;
            }
            const targetUri = this.getCommandFileTargetUri(uri, content);
            const widget = targetUri ? await this.open(targetUri) : this.activeOpenPencilWidget();
            if (!widget) {
                this.messages.error('Open a Canvas visual editor before applying a command file without a target.');
                return;
            }
            const result = await widget.applyOperations(operations);
            if (result.message) {
                this.messages.warn(`Canvas command file did not fully apply: ${result.message}`);
            } else {
                this.messages.info(`Canvas applied ${operations.length} operation${operations.length === 1 ? '' : 's'} from ${uri.path.base}; selection: ${this.formatSelection(result.selection)}.`);
            }
        });
    }

    protected parseStructuredOperations(value: string): OpenPencilDesignOperation[] | undefined {
        let parsed: OpenPencilStructuredCommandInput;
        try {
            parsed = JSON.parse(value) as OpenPencilStructuredCommandInput;
        } catch (error) {
            this.messages.error(`Invalid Canvas command JSON: ${error instanceof Error ? error.message : String(error)}`);
            return undefined;
        }
        const operations = this.isStructuredCommandFile(parsed) ? parsed.operations : Array.isArray(parsed) ? parsed : [parsed];
        if (!operations.length || operations.some(operation => !this.isDesignOperation(operation))) {
            this.messages.error('Canvas structured command must be an operation object or an array of operation objects.');
            return undefined;
        }
        return operations;
    }

    protected getCommandFileTargetUri(uri: URI, value: string): URI | undefined {
        try {
            const parsed = JSON.parse(value) as OpenPencilStructuredCommandInput;
            if (this.isStructuredCommandFile(parsed) && parsed.target) {
                return uri.parent.resolve(parsed.target);
            }
        } catch {
            // The parse error is reported by parseStructuredOperations.
        }
        return undefined;
    }

    protected isStructuredCommandFile(value: unknown): value is { target?: string; operations: OpenPencilDesignOperation[] } {
        return this.isRecord(value)
            && Array.isArray(value.operations)
            && (value.target === undefined || typeof value.target === 'string');
    }

    protected isDesignOperation(value: unknown): value is OpenPencilDesignOperation {
        if (!this.isRecord(value) || typeof value.operation !== 'string') {
            return false;
        }
        switch (value.operation) {
            case 'addNode':
            case 'createNode':
                return this.isRecord(value.node) && (value.node.type === undefined || typeof value.node.type === 'string');
            case 'updateNode':
                return typeof value.nodeId === 'string' && this.isRecord(value.changes);
            case 'removeNode':
            case 'deleteNode':
            case 'duplicateNode':
            case 'ungroupNode':
            case 'bringForward':
            case 'sendBackward':
            case 'bringToFront':
            case 'sendToBack':
                return typeof value.nodeId === 'string';
            case 'reorderNode':
                return typeof value.nodeId === 'string' && typeof value.index === 'number';
            case 'replaceNode':
                return typeof value.nodeId === 'string' && this.isRecord(value.node);
            case 'moveNode':
                return typeof value.nodeId === 'string' && typeof value.x === 'number' && typeof value.y === 'number';
            case 'resizeNode':
                return typeof value.nodeId === 'string'
                    && (value.x === undefined || typeof value.x === 'number')
                    && (value.y === undefined || typeof value.y === 'number')
                    && typeof value.width === 'number'
                    && typeof value.height === 'number';
            case 'moveToParent':
                return typeof value.nodeId === 'string'
                    && (value.parentId === undefined || value.parentId === null || typeof value.parentId === 'string')
                    && (value.index === undefined || typeof value.index === 'number');
            case 'nudgeNodes':
                return Array.isArray(value.nodeIds)
                    && value.nodeIds.every(id => typeof id === 'string')
                    && typeof value.dx === 'number'
                    && typeof value.dy === 'number';
            case 'alignNodes':
                return Array.isArray(value.nodeIds)
                    && value.nodeIds.every(id => typeof id === 'string')
                    && (value.alignment === 'left'
                        || value.alignment === 'center'
                        || value.alignment === 'right'
                        || value.alignment === 'top'
                        || value.alignment === 'middle'
                        || value.alignment === 'bottom');
            case 'distributeNodes':
                return Array.isArray(value.nodeIds)
                    && value.nodeIds.every(id => typeof id === 'string')
                    && (value.direction === 'horizontal' || value.direction === 'vertical');
            case 'groupNodes':
                return Array.isArray(value.nodeIds) && value.nodeIds.every(id => typeof id === 'string');
            case 'booleanNodes':
                return Array.isArray(value.nodeIds)
                    && value.nodeIds.every(id => typeof id === 'string')
                    && (value.booleanOperation === 'union'
                        || value.booleanOperation === 'subtract'
                        || value.booleanOperation === 'intersect'
                        || value.booleanOperation === 'exclude');
            case 'convertToPath':
                return Array.isArray(value.nodeIds) && value.nodeIds.every(id => typeof id === 'string');
            case 'updatePathAnchors':
                return typeof value.nodeId === 'string'
                    && Array.isArray(value.anchors)
                    && value.anchors.every(anchor => this.isPathAnchorLike(anchor))
                    && (value.closed === undefined || typeof value.closed === 'boolean');
            case 'updatePathAnchor':
                return typeof value.nodeId === 'string'
                    && typeof value.anchorIndex === 'number'
                    && this.isPathAnchorLike(value.anchor)
                    && (value.closed === undefined || typeof value.closed === 'boolean');
            case 'updatePathHandle':
                return typeof value.nodeId === 'string'
                    && typeof value.anchorIndex === 'number'
                    && (value.handle === 'in' || value.handle === 'out')
                    && (value.value === null || this.isPathHandleLike(value.value))
                    && (value.mirror === undefined || typeof value.mirror === 'boolean')
                    && (value.closed === undefined || typeof value.closed === 'boolean');
            case 'insertPathAnchor':
                return typeof value.nodeId === 'string'
                    && typeof value.anchorIndex === 'number'
                    && this.isPathAnchorLike(value.anchor);
            case 'removePathAnchor':
                return typeof value.nodeId === 'string' && typeof value.anchorIndex === 'number';
            case 'addPage':
                return value.page === undefined || this.isRecord(value.page);
            case 'updatePage':
                return typeof value.pageId === 'string' && this.isRecord(value.changes);
            case 'removePage':
            case 'setActivePage':
                return typeof value.pageId === 'string';
            case 'setVariable':
                return typeof value.name === 'string' && this.isRecord(value.variable) && 'value' in value.variable;
            case 'updateVariable':
                return typeof value.name === 'string' && this.isRecord(value.changes);
            case 'removeVariable':
                return typeof value.name === 'string';
            case 'setThemes':
                return this.isStringArrayRecord(value.themes);
            case 'updateThemeAxis':
                return typeof value.axis === 'string'
                    && Array.isArray(value.values)
                    && value.values.every(item => typeof item === 'string');
            case 'removeThemeAxis':
                return typeof value.axis === 'string';
            case 'setNodeTheme':
                return typeof value.nodeId === 'string' && this.isStringRecord(value.theme);
            case 'clearNodeTheme':
                return typeof value.nodeId === 'string'
                    && (value.axes === undefined || (Array.isArray(value.axes) && value.axes.every(item => typeof item === 'string')));
            case 'setNodeLayout':
                return typeof value.nodeId === 'string' && this.isRecord(value.layout);
            case 'autoLayoutNode':
                return typeof value.nodeId === 'string'
                    && (value.direction === undefined || value.direction === 'vertical' || value.direction === 'horizontal');
            case 'setSelection':
                return Array.isArray(value.nodeIds) && value.nodeIds.every(id => typeof id === 'string');
            default:
                return false;
        }
    }

    protected isRecord(value: unknown): value is Record<string, unknown> {
        return typeof value === 'object' && value !== null && !Array.isArray(value);
    }

    protected isStringRecord(value: unknown): value is Record<string, string> {
        return this.isRecord(value) && Object.values(value).every(item => typeof item === 'string');
    }

    protected isStringArrayRecord(value: unknown): value is Record<string, string[]> {
        return this.isRecord(value)
            && Object.values(value).every(item => Array.isArray(item) && item.every(entry => typeof entry === 'string'));
    }

    protected isPathAnchorLike(value: unknown): boolean {
        if (!this.isRecord(value) || typeof value.x !== 'number' || typeof value.y !== 'number') {
            return false;
        }
        return (value.handleIn === undefined || value.handleIn === null || this.isPathHandleLike(value.handleIn))
            && (value.handleOut === undefined || value.handleOut === null || this.isPathHandleLike(value.handleOut));
    }

    protected isPathHandleLike(value: unknown): boolean {
        return this.isRecord(value) && typeof value.x === 'number' && typeof value.y === 'number';
    }

    protected formatValidationIssues(validation: ReturnType<OpenPencilDesignCommandService['validateDocument']>): string {
        return validation.issues
            .filter(issue => issue.severity === 'error')
            .slice(0, 3)
            .map(issue => `${issue.path}: ${issue.message}`)
            .join('; ') || 'unknown validation error';
    }

    protected isOpenPencilCommandFile(uri: URI): boolean {
        const base = uri.path.base.toLowerCase();
        return base.endsWith('.openpencil-commands.json') || base.endsWith('.openpencil-ai-edit.json');
    }

    protected summarizeOperations(operations: OpenPencilDesignOperation[]): Array<{ operation: string; target?: string }> {
        return operations.map(operation => {
            if ('nodeId' in operation) {
                return { operation: operation.operation, target: operation.nodeId };
            }
            if ('nodeIds' in operation) {
                return { operation: operation.operation, target: operation.nodeIds.join(', ') };
            }
            if ('pageId' in operation) {
                return { operation: operation.operation, target: operation.pageId };
            }
            if ('name' in operation) {
                return { operation: operation.operation, target: operation.name };
            }
            return { operation: operation.operation };
        });
    }

    protected formatSelection(selection: string[]): string {
        return selection.length ? selection.join(', ') : 'none';
    }

    protected async focusEditor(): Promise<void> {
        const active = this.activeOpenPencilWidget();
        if (active) {
            await this.shell.activateWidget(active.id);
            active.node.focus();
            return;
        }
        const uri = this.selectedOpenPencilUri();
        if (uri) {
            const widget = await this.open(uri);
            await this.shell.activateWidget(widget.id);
            widget.node.focus();
            return;
        }
        this.messages.error('Open or select a Canvas .op file before focusing the visual editor.');
    }

    protected selectedOpenPencilUri(): URI | undefined {
        const uri = UriSelection.getUri(this.selectionService.selection);
        return uri && this.canHandle(uri) > 0 ? uri : undefined;
    }

    protected resolveOpenPencilUri(candidate: unknown): URI | undefined {
        if (candidate instanceof URI && this.canHandle(candidate) > 0) {
            return candidate;
        }
        return this.activeOpenPencilWidget()?.uri ?? this.selectedOpenPencilUri();
    }

    protected async resolveOpenPencilWidget(candidate: unknown): Promise<OpenPencilEditorWidget | undefined> {
        const current = this.activeOpenPencilWidget();
        const targetUri = this.resolveOpenPencilUri(candidate);
        if (!targetUri) {
            return current;
        }
        if (current?.uri.toString() === targetUri.toString()) {
            return current;
        }
        return this.open(targetUri);
    }

    protected async safeRun<T>(action: string, task: () => Promise<T>): Promise<T | undefined> {
        try {
            return await task();
        } catch (error) {
            this.messages.error(`Could not ${action}: ${error instanceof Error ? error.message : String(error)}`);
            return undefined;
        }
    }

    protected activeOpenPencilWidget(): OpenPencilEditorWidget | undefined {
        const current = this.shell.currentWidget;
        return current instanceof OpenPencilEditorWidget ? current : undefined;
    }
}

@injectable()
export class OpenPencilLabelProviderContribution implements LabelProviderContribution {

    protected readonly documents = new OpenPencilDocumentService();

    canHandle(element: object): number {
        const uri = this.getUri(element);
        return uri && this.documents.isOpenPencilFile(uri.path.toString()) ? 100 : 0;
    }

    getIcon(element: object): string | undefined {
        return this.getUri(element) ? codicon('symbol-color') : undefined;
    }

    getDetails(element: object): string | undefined {
        return this.getUri(element) ? 'Canvas design' : undefined;
    }

    protected getUri(element: object): URI | undefined {
        if (element instanceof URI) {
            return element;
        }
        if (URIIconReference.is(element)) {
            return element.uri;
        }
        return undefined;
    }
}

import URI from '@theia/core/lib/common/uri';
import { Command, CommandContribution, CommandRegistry, DisposableCollection, MenuContribution, MenuModelRegistry, MessageService, ProgressService, UriSelection } from '@theia/core/lib/common';
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
import { cybervinciCanvasCommandLabel, cybervinciCanvasProductLabel, CYBERVINCI_MENU_ITEMS, CyberVinciMenus } from '@cybervinci/branding/lib/common';
import { OPENPENCIL_BACKEND_PATH, OpenPencilBackendService, OpenPencilBridgeOperationResult } from '../common/openpencil-protocol';
import { OpenPencilDocumentService } from '../common/openpencil-document-service';
import { OPENPENCIL_FILE_EXTENSION, OpenPencilDesignOperation, OpenPencilDocument, OpenPencilNode, OpenPencilStructuredCommandInput } from '../common/openpencil-types';
import { OpenPencilTemplateService } from '../common/openpencil-template-service';
import { createOpenPencilAiReviewModel, OpenPencilAiReviewModel } from './openpencil-ai-review-model';
import { OpenPencilAiReviewService } from './openpencil-ai-review-widget';
import { OpenPencilAiDesignRequest, OpenPencilAiDesignResult, OpenPencilDesignCommandService } from './openpencil-design-command-service';
import { OpenPencilAiStatus, OpenPencilEditorWidget } from './openpencil-editor-widget';

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
const CYBERVINCI_CANVAS_AI_DEBUG_STORAGE_KEY = 'cybervinci.canvasAiDebug';
const OPENPENCIL_AI_PROGRESSIVE_APPLY_DELAY_MS = 80;
const OPENPENCIL_AI_PROGRESSIVE_MAX_BATCH_SIZE = 4;

type OpenPencilProgressHandle = Awaited<ReturnType<ProgressService['showProgress']>>;

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

    @inject(OpenPencilAiReviewService)
    protected readonly aiReviewService: OpenPencilAiReviewService;

    @inject(QuickInputService) @optional()
    protected readonly quickInputService: QuickInputService | undefined;

    @inject(FileDialogService) @optional()
    protected readonly fileDialogService: FileDialogService | undefined;

    @inject(WebSocketConnectionProvider)
    protected readonly connectionProvider: WebSocketConnectionProvider;

    protected backendService: OpenPencilBackendService | undefined;

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
            execute: uri => this.generateWithAi(uri),
            isEnabled: () => !!this.activeOpenPencilWidget(),
            isVisible: () => !!this.activeOpenPencilWidget()
        });
        registry.registerCommand(OpenPencilCommands.PROMPT_TO_DESIGN, {
            execute: uri => this.promptToDesign(uri),
            isEnabled: () => !!this.activeOpenPencilWidget(),
            isVisible: () => !!this.activeOpenPencilWidget()
        });
        registry.registerCommand(OpenPencilCommands.CONTINUE_DESIGN_WITH_AI, {
            execute: uri => this.continueDesignWithAi(uri),
            isEnabled: () => !!this.activeOpenPencilWidget(),
            isVisible: () => !!this.activeOpenPencilWidget()
        });
        registry.registerCommand(OpenPencilCommands.EDIT_SELECTED_NODE_WITH_AI, {
            execute: uri => this.editSelectedNodeWithAi(uri),
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

    protected async generateWithAi(target?: unknown): Promise<void> {
        await this.runAiPromptFlow({
            title: cybervinciCanvasCommandLabel('Generate with AI'),
            prompt: 'Describe the structured Canvas edit to generate',
            value: 'Automatize seus processos com IA',
            selection: widget => widget.getSelection(),
            target
        });
    }

    protected async promptToDesign(target?: unknown): Promise<void> {
        await this.runAiPromptFlow({
            title: cybervinciCanvasCommandLabel('Prompt to Design'),
            prompt: 'Describe the complete Canvas screen, page, or design section to generate',
            value: 'Create a mobile banking login screen with dark blue gradient, card, email field, password field, and primary button',
            selection: () => [],
            target
        });
    }

    protected async continueDesignWithAi(target?: unknown): Promise<void> {
        await this.runAiPromptFlow({
            title: cybervinciCanvasCommandLabel('Continue Design with AI'),
            prompt: 'Describe how to continue and complete the current Canvas design without replacing existing content',
            value: 'Continue and complete this design by adding the missing sections below the existing content',
            selection: () => [],
            requestMode: 'continuation',
            target
        });
    }

    protected async editSelectedNodeWithAi(target?: unknown): Promise<void> {
        await this.runAiPromptFlow({
            title: cybervinciCanvasCommandLabel('Edit Selected Node with AI'),
            prompt: 'Describe how to edit the selected Canvas node',
            value: 'Atualize para uma promessa mais direta em verde',
            selection: widget => widget.getSelection(),
            requireSelection: true,
            target
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
        const prompt = await this.readAiPrompt(options.title, `${options.prompt}; current selection: ${this.formatSelection(selection)}`, options.value);
        if (!prompt?.trim()) {
            return;
        }
        await this.executeAiPromptWithFeedback(widget, document, selection, prompt.trim(), options.requestMode);
    }

    protected async readAiPrompt(title: string, prompt: string, value: string): Promise<string | undefined> {
        if (this.quickInputService) {
            return this.quickInputService.input({ title, prompt, value });
        }
        return window.prompt(`${title}\n${prompt}`, value) ?? undefined;
    }

    protected async executeAiPromptWithFeedback(widget: OpenPencilEditorWidget, document: OpenPencilDocument, selection: string[], prompt: string, requestMode?: OpenPencilAiDesignRequest['mode']): Promise<void> {
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
            const generated = await this.commandService.generateAiOperations({
                prompt,
                document,
                selection,
                uri: widget.uri.toString(),
                mode: requestMode
            });
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
                await this.openAiReviewPanel(widget, generated.operations, preview.reviewModel, preview.target, true, selection, requestMode);
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
                await this.openAiReviewPanel(widget, generated.operations, preview.reviewModel, preview.target, true, selection, requestMode);
                return;
            }
            const source = generated.source === 'provider'
                ? generated.providerLabel ?? 'configured CyberVinci provider'
                : 'in-process deterministic adapter';
            if (this.isAiAutoApplyEnabled() || this.shouldAutoApplyAiResult(generated, selection, prompt)) {
                await this.applyGeneratedAiOperations(widget, generated.operations, progress, selection, requestMode);
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
                await this.openAiReviewPanel(widget, generated.operations, preview.reviewModel, preview.target, true, selection, requestMode);
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
            await this.applyGeneratedAiOperations(widget, generated.operations, progress, selection, requestMode);
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

    protected async createAiPreviewFile(widget: OpenPencilEditorWidget, document: OpenPencilDocument, generated: OpenPencilAiDesignResult, prompt: string, selection: string[], requestMode?: OpenPencilAiDesignRequest['mode']): Promise<{
        changed: boolean;
        valid: boolean;
        validationMessage?: string;
        message?: string;
        target: URI;
        reviewModel: OpenPencilAiReviewModel;
    }> {
        const preview = this.commandService.applyOperationsToDocument(this.documents.cloneDocument(document), selection, generated.operations, { mode: requestMode });
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
        requestMode?: OpenPencilAiDesignRequest['mode']
    ): Promise<void> {
        const apply = async () => {
            const progress = await this.progressService.showProgress({
                text: 'Canvas AI is applying changes...',
                options: {
                    location: 'notification'
                }
            });
            try {
                await this.applyGeneratedAiOperations(widget, operations, progress, selection, requestMode);
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

    protected async applyGeneratedAiOperations(widget: OpenPencilEditorWidget, operations: OpenPencilDesignOperation[], progress?: OpenPencilProgressHandle, selection?: string[], requestMode?: OpenPencilAiDesignRequest['mode']): Promise<void> {
        const latestDocument = widget.getDocument();
        if (!latestDocument) {
            canvasAiFrontendDebug('apply-rejected', {
                reason: 'missing-document',
                operationsCount: operations.length
            });
            return;
        }
        const baseSelection = selection ?? widget.getSelection();
        canvasAiFrontendDebug('apply-start', {
            uri: widget.uri.toString(),
            operationsCount: operations.length,
            selectionCount: baseSelection.length
        });
        this.reportAiStatus(widget, progress, this.createAiStatus('validating', 'Validating', 'Canvas AI is validating the active design...'));
        const applyPreview = this.commandService.applyOperationsToDocument(this.documents.cloneDocument(latestDocument), baseSelection, operations, { mode: requestMode });
        const applyValidation = this.commandService.validateDocument(applyPreview.document);
        if (!applyPreview.changed || !applyValidation.valid) {
            canvasAiFrontendDebug('apply-rejected', {
                reason: applyPreview.changed ? 'active-preview-invalid' : 'active-preview-unchanged',
                operationsCount: operations.length,
                diagnosticsCount: applyValidation.issues.length
            });
            this.reportAiStatus(widget, progress, this.createAiStatus('error', 'Error', 'Canvas AI could not validate the active design.'));
            this.messages.warn(`Canvas AI edit was not applied because the active design no longer validates the preview${applyPreview.message ? `: ${applyPreview.message}` : '.'}`);
            return;
        }
        this.reportAiStatus(widget, progress, this.createAiApplyingStatus(0, operations.length));
        const result = await widget.applyOperationsProgressively(operations, {
            selection: baseSelection,
            batchSize: this.aiProgressiveBatchSize(operations.length),
            delayMs: OPENPENCIL_AI_PROGRESSIVE_APPLY_DELAY_MS,
            onProgress: applyProgress => {
                this.reportAiStatus(widget, progress, this.createAiApplyingStatus(applyProgress.applied, applyProgress.total));
            }
        });
        if (!result.completed || result.message) {
            canvasAiFrontendDebug('apply-rejected', {
                reason: 'progressive-apply-incomplete',
                applied: result.applied,
                total: result.total,
                hasMessage: !!result.message
            });
            this.reportAiStatus(widget, progress, this.createAiStatus('error', 'Error', `Canvas AI stopped after applying ${result.applied}/${result.total} changes.`));
            this.messages.warn(`Canvas AI edit stopped after applying ${result.applied}/${result.total} operation${result.total === 1 ? '' : 's'}: ${result.message ?? 'unknown error'}`);
        } else {
            canvasAiFrontendDebug('applied', {
                applied: result.applied,
                total: result.total,
                selectionCount: result.selection.length
            });
            this.reportAiStatus(widget, progress, this.createAiStatus('complete', 'Done', `Canvas AI applied ${result.applied}/${result.total} changes.`));
            this.messages.info(`Canvas AI edit applied to the open design; save when satisfied. Selection: ${this.formatSelection(result.selection)}.`);
        }
    }

    protected shouldAutoApplyAiResult(generated: OpenPencilAiDesignResult, selection: string[], prompt: string): boolean {
        return selection.length === 0 && this.isPageLevelAiPrompt(prompt);
    }

    protected isPageLevelAiPrompt(prompt: string): boolean {
        return /\b(landing|page|screen|dashboard|site|app|hero|interface|tela|pagina|página)\b/i.test(prompt);
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

import URI from '@theia/core/lib/common/uri';
import { BinaryBuffer } from '@theia/core/lib/common/buffer';
import { CommandRegistry, DisposableCollection, Emitter, Event, MessageService } from '@theia/core/lib/common';
import { ReactWidget, Saveable, SaveableSource, Navigatable, Message, QuickInputService, addEventListener, codicon } from '@theia/core/lib/browser';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { inject, injectable, optional, postConstruct } from '@theia/core/shared/inversify';
import * as React from '@theia/core/shared/react';
import {
    BookOpen,
    Braces,
    ChevronDown,
    Circle,
    Code2,
    Copy,
    Download,
    Figma,
    Folder,
    Frame,
    Group,
    Hand,
    ImagePlus,
    Layers,
    LayoutGrid,
    Minus,
    MousePointer2,
    PenTool,
    Plus,
    Redo2,
    Save,
    Square,
    Trash2,
    Triangle,
    Type,
    Undo2
} from 'lucide-react';
import { cybervinciCanvasCommandLabel, cybervinciCanvasProductLabel } from '@cybervinci/branding/lib/common';
import { OpenPencilDocumentService } from '../common/openpencil-document-service';
import { OpenPencilTemplateId, OpenPencilTemplateService } from '../common/openpencil-template-service';
import {
    OpenPencilBooleanOperation,
    OpenPencilCommandResult,
    OpenPencilDesignOperation,
    OpenPencilDocument,
    OpenPencilDocumentStateSnapshot,
    OpenPencilExportFormat,
    OpenPencilNode,
    OpenPencilPage,
    OpenPencilPathAnchor,
    OpenPencilPathHandleSide
} from '../common/openpencil-types';
import { OpenPencilApplyOperationsOptions, OpenPencilDesignCommandService, OpenPencilDesignSession } from './openpencil-design-command-service';
import { OpenPencilReactRuntimeHost } from './openpencil-react-runtime-host';

export const OpenPencilEditorWidgetOptions = Symbol('OpenPencilEditorWidgetOptions');
export interface OpenPencilEditorWidgetOptions {
    uri: string;
}

interface DragState {
    mode: 'move';
    nodeId: string;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
    nodes: Array<{ nodeId: string; startX: number; startY: number }>;
}

type ResizeHandle = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

interface ResizeState {
    mode: 'resize';
    nodeId: string;
    handle: ResizeHandle;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
}

interface PathAnchorDragState {
    mode: 'path-anchor';
    nodeId: string;
    anchorIndex: number;
    handle?: OpenPencilPathHandleSide;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
}

interface MarqueeState {
    mode: 'marquee';
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    append: boolean;
}

interface PanState {
    mode: 'pan';
    startClientX: number;
    startClientY: number;
    startScrollLeft: number;
    startScrollTop: number;
}

type InteractionState = DragState | ResizeState | PathAnchorDragState | MarqueeState | PanState;

interface PanelResizeState {
    panel: 'layers' | 'properties';
    startClientX: number;
    startWidth: number;
}

type OpenPencilExportScope = 'document' | 'selection';

interface OpenPencilExportTarget {
    format: OpenPencilExportFormat;
    label: string;
    extension: string;
    adapter: 'pen-codegen-direct' | 'local-serializer' | 'local-svg-fallback';
}

export type OpenPencilAiStatusPhase = 'preparing' | 'validating' | 'applying' | 'complete' | 'error';

export interface OpenPencilAiStatus {
    phase: OpenPencilAiStatusPhase;
    label: string;
    detail?: string;
}

export interface OpenPencilProgressiveApplyProgress {
    applied: number;
    total: number;
    operation?: OpenPencilDesignOperation;
    result: OpenPencilCommandResult;
}

export interface OpenPencilProgressiveApplyOptions {
    batchSize?: number;
    delayMs?: number;
    selection?: string[];
    applyOptions?: OpenPencilApplyOperationsOptions;
    onProgress?: (progress: OpenPencilProgressiveApplyProgress) => void | Promise<void>;
}

export interface OpenPencilProgressiveApplyResult extends OpenPencilCommandResult {
    applied: number;
    total: number;
    completed: boolean;
}

const DEFAULT_OPENPENCIL_EXPORT_TARGET: OpenPencilExportTarget = { format: 'html-css', label: 'HTML + CSS', extension: '.html', adapter: 'pen-codegen-direct' };

const OPENPENCIL_EXPORT_TARGETS: OpenPencilExportTarget[] = [
    DEFAULT_OPENPENCIL_EXPORT_TARGET,
    { format: 'react-tailwind', label: 'React + Tailwind', extension: '.tsx', adapter: 'pen-codegen-direct' },
    { format: 'vue', label: 'Vue', extension: '.vue', adapter: 'pen-codegen-direct' },
    { format: 'svelte', label: 'Svelte', extension: '.svelte', adapter: 'pen-codegen-direct' },
    { format: 'react-native', label: 'React Native', extension: '.tsx', adapter: 'pen-codegen-direct' },
    { format: 'flutter', label: 'Flutter', extension: '.dart', adapter: 'pen-codegen-direct' },
    { format: 'swiftui', label: 'SwiftUI', extension: '.swift', adapter: 'pen-codegen-direct' },
    { format: 'jetpack-compose', label: 'Jetpack Compose', extension: '.kt', adapter: 'pen-codegen-direct' },
    { format: 'svg', label: 'SVG', extension: '.svg', adapter: 'local-svg-fallback' },
    { format: 'openpencil-json', label: 'Canvas JSON', extension: '.op.json', adapter: 'local-serializer' },
    { format: 'openpencil-summary-json', label: 'Canvas Summary JSON', extension: '.openpencil-summary.json', adapter: 'local-serializer' }
];

const OPENPENCIL_OPEN_AS_JSON_COMMAND = 'openpencil.openAsJson';
const OPENPENCIL_EXPORT_UI_KIT_COMMAND = 'openpencil.exportUIKit';
const OPENPENCIL_PROMPT_TO_DESIGN_COMMAND = 'openpencil.promptToDesign';
const OPENPENCIL_CONTINUE_DESIGN_WITH_AI_COMMAND = 'openpencil.continueDesignWithAi';
const OPENPENCIL_EDIT_SELECTED_NODE_WITH_AI_COMMAND = 'openpencil.editSelectedNodeWithAi';
const OPENPENCIL_IMPORT_FIGMA_JSON_COMMAND = 'openpencil.importFigmaJson';

@injectable()
export class OpenPencilEditorWidget extends ReactWidget implements Navigatable, SaveableSource, OpenPencilDesignSession {

    static readonly ID = 'openpencil.editor';
    static readonly LABEL = cybervinciCanvasProductLabel;

    readonly uri: URI;
    readonly saveable: Saveable;

    protected readonly documents = new OpenPencilDocumentService();
    protected readonly templates = new OpenPencilTemplateService();
    protected readonly onDirtyChangedEmitter = new Emitter<void>();
    protected readonly onContentChangedEmitter = new Emitter<void>();
    protected readonly sessionDisposables = new DisposableCollection();

    protected document: OpenPencilDocument | undefined;
    protected selectedIds: string[] = [];
    protected suppressNextNodeClick = false;
    protected dirty = false;
    protected loadError: string | undefined;
    protected lastSavedContent: string | undefined;
    protected undoStack: OpenPencilDocumentStateSnapshot[] = [];
    protected redoStack: OpenPencilDocumentStateSnapshot[] = [];
    protected interactionState: InteractionState | undefined;
    protected clipboardNodes: OpenPencilNode[] = [];
    protected pasteCount = 0;
    protected canvasZoom = 1;
    protected spacePressed = false;
    protected layerFilter = '';
    protected exportFormat: OpenPencilExportFormat = 'html-css';
    protected exportScope: OpenPencilExportScope = 'document';
    protected aiStatus: OpenPencilAiStatus | undefined;
    protected aiStatusVersion = 0;
    protected layerPanelWidth = 224;
    protected propertiesPanelWidth = 256;
    protected panelResizeState: PanelResizeState | undefined;
    protected readonly canvasWrapRef = React.createRef<HTMLElement>();

    @inject(FileService)
    protected readonly fileService: FileService;

    @inject(MessageService)
    protected readonly messages: MessageService;

    @inject(CommandRegistry)
    protected readonly commandRegistry: CommandRegistry;

    @inject(OpenPencilDesignCommandService)
    protected readonly commandService: OpenPencilDesignCommandService;

    @inject(QuickInputService) @optional()
    protected readonly quickInputService: QuickInputService | undefined;

    constructor(@inject(OpenPencilEditorWidgetOptions) protected readonly options: OpenPencilEditorWidgetOptions) {
        super();
        this.uri = new URI(options.uri);
        const self = this;
        this.saveable = {
            get dirty(): boolean {
                return self.dirty;
            },
            get onDirtyChanged(): Event<void> {
                return self.onDirtyChangedEmitter.event;
            },
            get onContentChanged(): Event<void> {
                return self.onContentChangedEmitter.event;
            },
            save: () => self.save(),
            revert: () => self.revert(),
            filters: () => ({ [`${cybervinciCanvasProductLabel} Design`]: ['op'] })
        };
    }

    @postConstruct()
    protected init(): void {
        this.id = `${OpenPencilEditorWidget.ID}:${this.uri.toString()}`;
        this.title.label = this.uri.path.base;
        this.title.caption = this.uri.toString();
        this.title.iconClass = codicon('symbol-color');
        this.title.closable = true;
        this.node.tabIndex = 0;
        this.addClass('openpencil-editor-widget');
        this.toDispose.push(addEventListener(this.node, 'keydown', event => this.handleKeyDown(event)));
        this.toDispose.push(addEventListener(this.node, 'keyup', event => this.handleKeyUp(event)));
        const onPanelResizeMove = (event: MouseEvent) => this.onPanelResizeMove(event);
        const onPanelResizeEnd = () => this.finishPanelResize();
        const onPanelResizePointerMove = (event: PointerEvent) => this.onPanelResizeMove(event);
        const onPanelResizePointerEnd = () => this.finishPanelResize();
        window.addEventListener('mousemove', onPanelResizeMove);
        window.addEventListener('mouseup', onPanelResizeEnd);
        window.addEventListener('pointermove', onPanelResizePointerMove);
        window.addEventListener('pointerup', onPanelResizePointerEnd);
        this.toDispose.push({
            dispose: () => {
                window.removeEventListener('mousemove', onPanelResizeMove);
                window.removeEventListener('mouseup', onPanelResizeEnd);
                window.removeEventListener('pointermove', onPanelResizePointerMove);
                window.removeEventListener('pointerup', onPanelResizePointerEnd);
            }
        });
        this.toDispose.push(this.onDirtyChangedEmitter);
        this.toDispose.push(this.onContentChangedEmitter);
        this.toDispose.push(this.sessionDisposables);
        this.sessionDisposables.push(this.commandService.registerSession(this));
        this.load();
    }

    getUri(): URI {
        return this.uri;
    }

    getResourceUri(): URI | undefined {
        return this.uri;
    }

    createMoveToUri(resourceUri: URI): URI | undefined {
        return this.uri.withPath(resourceUri.path);
    }

    getDocument(): OpenPencilDocument | undefined {
        return this.document;
    }

    getSelection(): string[] {
        return [...this.selectedIds];
    }

    createAiRollbackSnapshot(): OpenPencilDocumentStateSnapshot | undefined {
        return this.document ? this.createSnapshot() : undefined;
    }

    restoreAiRollbackSnapshot(snapshot: OpenPencilDocumentStateSnapshot): void {
        this.restoreSnapshot(snapshot);
        this.updateDirtyState(true);
        this.update();
    }

    setAiStatus(status: OpenPencilAiStatus | string | undefined): void {
        this.aiStatus = typeof status === 'string'
            ? { phase: 'preparing', label: status, detail: status }
            : status;
        this.aiStatusVersion++;
        this.update();
    }

    clearAiStatusSoon(delayMs = 2400): void {
        const version = this.aiStatusVersion;
        setTimeout(() => {
            if (this.aiStatusVersion === version) {
                this.setAiStatus(undefined);
            }
        }, delayMs);
    }

    async applyOperation(operation: OpenPencilDesignOperation): Promise<OpenPencilCommandResult> {
        return this.doApplyOperation(operation);
    }

    async applyOperations(operations: OpenPencilDesignOperation[]): Promise<OpenPencilCommandResult> {
        if (!this.document) {
            throw new Error('Canvas document is not loaded.');
        }
        const result = this.commandService.applyOperationsToDocument(this.document, this.selectedIds, operations);
        if (result.changed) {
            this.applyDocument(result.document, result.selection);
        } else {
            this.selectedIds = result.selection;
            this.update();
        }
        return result;
    }

    async applyOperationsProgressively(operations: OpenPencilDesignOperation[], options: OpenPencilProgressiveApplyOptions = {}): Promise<OpenPencilProgressiveApplyResult> {
        if (!this.document) {
            throw new Error('Canvas document is not loaded.');
        }
        const total = operations.length;
        const initialSelection = this.filterSelection(options.selection ?? this.selectedIds, this.document);
        if (!total) {
            return {
                document: this.document,
                selection: initialSelection,
                changed: false,
                applied: 0,
                total: 0,
                completed: true
            };
        }

        const batchSize = Math.max(1, Math.round(options.batchSize ?? 1));
        const delayMs = Math.max(0, Math.round(options.delayMs ?? 80));
        const initialSnapshot = this.createSnapshot();
        let undoCaptured = false;
        let applied = 0;
        let changed = false;
        let currentSelection = initialSelection;
        let lastResult: OpenPencilCommandResult = {
            document: this.document,
            selection: currentSelection,
            changed: false
        };

        while (applied < total) {
            const batchEnd = Math.min(total, applied + batchSize);
            for (; applied < batchEnd; applied++) {
                const operation = operations[applied];
                let result: OpenPencilCommandResult;
                try {
                    result = this.commandService.applyOperationsToDocument(this.document, currentSelection, [operation], options.applyOptions);
                } catch (error) {
                    const failure = this.progressiveApplyFailure(applied, total, changed, error instanceof Error ? error.message : String(error));
                    await options.onProgress?.({ applied, total, operation, result: failure });
                    return failure;
                }
                if (result.message) {
                    const failure = this.progressiveApplyFailure(applied, total, changed, result.message);
                    await options.onProgress?.({ applied, total, operation, result: failure });
                    return failure;
                }
                if (result.changed) {
                    if (!undoCaptured) {
                        this.undoStack.push(initialSnapshot);
                        this.redoStack = [];
                        undoCaptured = true;
                    }
                    this.document = result.document;
                    this.selectedIds = this.filterSelection(result.selection, result.document);
                    currentSelection = [...this.selectedIds];
                    this.updateDirtyState(true);
                    this.update();
                } else {
                    this.selectedIds = this.filterSelection(result.selection, this.document);
                    currentSelection = [...this.selectedIds];
                    this.update();
                }
                changed = changed || result.changed;
                lastResult = {
                    document: this.document,
                    selection: [...this.selectedIds],
                    changed
                };
            }
            await options.onProgress?.({ applied, total, result: lastResult });
            await this.waitForProgressiveApplyFrame(delayMs);
        }

        return {
            ...lastResult,
            document: this.document,
            selection: [...this.selectedIds],
            changed,
            applied,
            total,
            completed: true
        };
    }

    protected async doApplyOperation(operation: OpenPencilDesignOperation, transient = false): Promise<OpenPencilCommandResult> {
        if (!this.document) {
            throw new Error('Canvas document is not loaded.');
        }
        const result = this.commandService.applyToDocument(this.document, this.selectedIds, operation);
        if (result.changed) {
            if (transient) {
                this.document = result.document;
                this.selectedIds = result.selection;
                this.updateDirtyState(true);
                this.update();
            } else {
                this.applyDocument(result.document, result.selection);
            }
        } else {
            this.selectedIds = result.selection;
            this.update();
        }
        return result;
    }

    protected async load(): Promise<void> {
        try {
            const content = (await this.fileService.read(this.uri)).value;
            this.document = this.documents.deserialize(content);
            this.lastSavedContent = this.documents.serialize(this.document);
            this.loadError = undefined;
            this.undoStack = [];
            this.redoStack = [];
            this.selectedIds = this.filterSelection(this.selectedIds, this.document);
            this.setDirty(false);
        } catch (error) {
            this.document = undefined;
            this.loadError = error instanceof Error ? error.message : String(error);
            this.setDirty(false);
        }
        this.update();
    }

    protected async save(): Promise<void> {
        if (!this.document) {
            return;
        }
        const serialized = this.documents.serialize(this.document);
        await this.fileService.writeFile(this.uri, BinaryBuffer.fromString(serialized));
        this.lastSavedContent = serialized;
        this.setDirty(false);
    }

    protected async revert(): Promise<void> {
        if (this.lastSavedContent !== undefined) {
            const document = this.documents.deserialize(this.lastSavedContent);
            this.document = document;
            this.selectedIds = this.filterSelection(this.selectedIds, document);
            this.undoStack = [];
            this.redoStack = [];
            this.loadError = undefined;
            this.setDirty(false);
            this.update();
        } else {
            await this.load();
        }
    }

    protected override onActivateRequest(msg: Message): void {
        super.onActivateRequest(msg);
        this.node.focus();
    }

    protected render(): React.ReactNode {
        if (this.loadError) {
            return <div className='openpencil-error'>
                <h2>Canvas parse error</h2>
                <p>{this.loadError}</p>
                <p>Use "{cybervinciCanvasCommandLabel('Open as JSON')}" to inspect and repair the file.</p>
            </div>;
        }
        if (!this.document) {
            return <div className='openpencil-loading'>Loading Canvas design...</div>;
        }
        const document = this.document;
        const page = this.documents.getActivePage(document);
        const nodes = page.children;
        const selected = this.selectedIds[0] ? this.documents.findNode(document, this.selectedIds[0]) : undefined;
        const fallback = this.renderFallbackShell(document, page, nodes, selected);
        if (this.shouldUseLocalFallback()) {
            return fallback;
        }
        return <OpenPencilReactRuntimeHost
            document={document}
            page={page}
            zoom={this.canvasZoom}
            selectedIds={this.selectedIds}
            dirty={this.dirty}
            resourceName={this.uri.path.base}
            fallback={fallback}
            toolbarTrailing={this.renderRuntimeToolbarTrailing()}
            canvasToolbarTrailing={this.renderRuntimeCanvasToolbarTrailing()}
            onDocumentChange={nextDocument => this.applyRuntimeDocument(nextDocument)}
            onSelectionChange={nextSelection => this.setSelection(nextSelection)}
            onCanvasInteraction={event => {
                if (event.type === 'viewport' && typeof event.viewport?.zoom === 'number') {
                    const nextZoom = this.clampCanvasZoom(event.viewport.zoom);
                    if (nextZoom !== this.canvasZoom) {
                        this.canvasZoom = nextZoom;
                        this.update();
                    }
                }
            }}
        />;
    }

    protected shouldUseLocalFallback(): boolean {
        if (typeof window === 'undefined') {
            return false;
        }
        try {
            const forcedByWindow = (window as typeof window & { openPencilForceLocalFallback?: boolean }).openPencilForceLocalFallback === true;
            return forcedByWindow || window.localStorage.getItem('openpencil.forceLocalFallback') === 'true';
        } catch {
            return false;
        }
    }

    protected renderFallbackShell(document: OpenPencilDocument, page: OpenPencilPage, nodes: OpenPencilNode[], selected?: OpenPencilNode): React.ReactNode {
        return <div className='openpencil-shell' data-testid='openpencil-local-shell'>
            {this.renderTopBar(document, page)}
            <div className='openpencil-main'>
                <aside className='openpencil-layers' style={{ width: this.layerPanelWidth }}>
                    <div
                        className='openpencil-panel-resize-handle openpencil-panel-resize-handle-right'
                        onPointerDown={event => this.startPanelResize(event, 'layers')}
                    />
                    {this.renderPageStrip()}
                    {this.renderLayerPanel(nodes)}
                </aside>
                <section
                    ref={this.canvasWrapRef}
                    className={`openpencil-canvas-wrap ${this.spacePressed ? 'pan-ready' : ''} ${this.interactionState?.mode === 'pan' ? 'panning' : ''}`}
                    data-testid='openpencil-canvas-wrap'
                    onMouseDown={event => this.startPan(event)}
                    onMouseMove={event => this.onCanvasWrapMouseMove(event)}
                    onMouseUp={() => this.finishInteraction()}
                    onMouseLeave={() => this.finishInteraction()}
                    onWheel={event => this.onCanvasWheel(event)}>
                    {this.renderToolbar()}
                    {this.renderBooleanToolbar()}
                    {this.renderSelectionToolbar()}
                    {this.renderCanvas(page, nodes)}
                    <footer className='openpencil-status'>
                        <div className='openpencil-status-details'>
                            <span>{this.uri.path.base}</span>
                            <span>{page.name} - {page.width ?? 900}x{page.height ?? 620}</span>
                            <span>{this.selectionStatusLabel(page)}</span>
                            <span>{this.dirty ? 'Unsaved changes' : 'Saved'}</span>
                        </div>
                        {this.renderZoomControls()}
                    </footer>
                </section>
                <aside className='openpencil-properties' style={{ width: this.propertiesPanelWidth }}>
                    <div
                        className='openpencil-panel-resize-handle openpencil-panel-resize-handle-left'
                        onPointerDown={event => this.startPanelResize(event, 'properties')}
                    />
                    <div className='openpencil-properties-header'>
                        <h3>Properties</h3>
                        <small>{selected ? selected.type : 'Page'}</small>
                    </div>
                    {selected ? this.renderProperties(selected) : this.renderPageProperties(page)}
                </aside>
            </div>
        </div>;
    }

    protected renderTopBar(document: OpenPencilDocument, page: OpenPencilPage): React.ReactNode {
        return <header className='openpencil-topbar'>
            <div className='openpencil-topbar-left'>
                <button className='theia-button' title='Layers panel'>
                    <Layers size={15} strokeWidth={1.5} />
                </button>
                <span className='openpencil-topbar-separator' />
                <details className='openpencil-file-menu-shell'>
                    <summary className='theia-button openpencil-file-menu-trigger' title='File menu'>
                        <Folder size={15} strokeWidth={1.5} />
                        <ChevronDown size={10} strokeWidth={1.5} />
                    </summary>
                    <div className='openpencil-menu openpencil-file-menu'>
                        <button type='button' onClick={() => this.save()} disabled={!this.dirty}>
                            <Save size={14} strokeWidth={1.5} />
                            <span>Save</span>
                            <kbd>Ctrl+S</kbd>
                        </button>
                        <button type='button' onClick={() => this.executeOpenPencilCommand(OPENPENCIL_OPEN_AS_JSON_COMMAND, this.uri)}>
                            <Code2 size={14} strokeWidth={1.5} />
                            <span>Open JSON</span>
                        </button>
                        <button type='button' onClick={() => this.executeOpenPencilCommand(OPENPENCIL_IMPORT_FIGMA_JSON_COMMAND)}>
                            <Figma size={14} strokeWidth={1.5} />
                            <span>Import Figma</span>
                        </button>
                        <span className='openpencil-menu-separator' />
                        <button type='button' onClick={() => this.exportCurrentDocument('html-css')}>
                            <Download size={14} strokeWidth={1.5} />
                            <span>Export HTML</span>
                        </button>
                        <button type='button' onClick={() => this.exportCurrentDocument('react-tailwind', true)} disabled={!this.selectedIds.length}>
                            <Code2 size={14} strokeWidth={1.5} />
                            <span>Export React Selection</span>
                        </button>
                        <button type='button' onClick={() => this.exportCurrentDocument('svg')}>
                            <ImagePlus size={14} strokeWidth={1.5} />
                            <span>Export SVG</span>
                        </button>
                    </div>
                </details>
                <span className='openpencil-topbar-separator' />
                <button
                    className='theia-button'
                    title='Import Figma JSON, copied data, clipboard HTML, or base64 .fig payload'
                    onClick={() => this.executeOpenPencilCommand(OPENPENCIL_IMPORT_FIGMA_JSON_COMMAND)}>
                    <Figma size={15} strokeWidth={1.5} />
                </button>
            </div>
            <div className='openpencil-topbar-title'>
                <span>{this.uri.path.base || document.name || cybervinciCanvasProductLabel}</span>
                {this.dirty && <small>Edited</small>}
                <small>{page.name}</small>
            </div>
            <div className='openpencil-topbar-actions'>
                <div className='openpencil-toolbar-group openpencil-ai-actions'>
                    {this.renderQuickAiButtons()}
                    {this.renderQuickTextEditButton()}
                </div>
                <div className='openpencil-toolbar-group openpencil-design-actions'>
                    {this.renderDesignInteropButtons()}
                </div>
                <div className='openpencil-toolbar-group openpencil-quick-export-actions'>
                    {this.renderQuickExportButtons()}
                </div>
                {this.renderExportControls()}
            </div>
        </header>;
    }

    protected renderToolbar(): React.ReactNode {
        return <div className='openpencil-toolbar'>
            <button className='theia-button selected' title='Select tool' onClick={() => this.setSelection(this.selectedIds)}>
                <MousePointer2 size={20} strokeWidth={1.5} />
            </button>
            <details className='openpencil-tool-dropdown'>
                <summary className='theia-button openpencil-shape-trigger' title='Shape tools'>
                    <Square size={20} strokeWidth={1.5} />
                    <ChevronDown size={12} strokeWidth={2.2} />
                </summary>
                <div className='openpencil-menu openpencil-shape-menu'>
                    <button type='button' onClick={() => this.addRectangle()}><Square size={18} strokeWidth={1.5} /><span>Rectangle</span></button>
                    <button type='button' onClick={() => this.addEllipse()}><Circle size={18} strokeWidth={1.5} /><span>Ellipse</span></button>
                    <button type='button' onClick={() => this.addPolygon()}><Triangle size={18} strokeWidth={1.5} /><span>Polygon</span></button>
                    <button type='button' onClick={() => this.addLine()}><Minus size={18} strokeWidth={1.5} /><span>Line</span></button>
                    <button type='button' onClick={() => this.addPath()}><PenTool size={18} strokeWidth={1.5} /><span>Pen</span></button>
                    <button type='button' onClick={() => this.addImage()}><ImagePlus size={18} strokeWidth={1.5} /><span>Image</span></button>
                </div>
            </details>
            <button className='theia-button' title='Add text' onClick={() => this.addText()}>
                <Type size={20} strokeWidth={1.5} />
            </button>
            <button className='theia-button' title='Add frame' onClick={() => this.addFrame()}>
                <Frame size={20} strokeWidth={1.5} />
            </button>
            <button className='theia-button' title='Pan canvas'>
                <Hand size={20} strokeWidth={1.5} />
            </button>
            <span className='openpencil-toolbar-separator'></span>
            <button className='theia-button' title='Undo' disabled={!this.undoStack.length} onClick={() => this.undo()}>
                <Undo2 size={18} strokeWidth={1.5} />
            </button>
            <button className='theia-button' title='Redo' disabled={!this.redoStack.length} onClick={() => this.redo()}>
                <Redo2 size={18} strokeWidth={1.5} />
            </button>
            <span className='openpencil-toolbar-separator'></span>
            {this.renderToolbarMoreMenu()}
        </div>;
    }

    protected renderToolbarMoreMenu(): React.ReactNode {
        const selectedNode = this.getPrimarySelectedNode();
        return <details className='openpencil-tool-dropdown openpencil-more-tools'>
            <summary className='theia-button' title='More tools'>
                <LayoutGrid size={18} strokeWidth={1.5} />
            </summary>
            <div className='openpencil-menu openpencil-more-menu'>
                <button type='button' onClick={() => this.insertHeroBlock()}><LayoutGrid size={14} strokeWidth={1.5} /><span>Insert hero block</span></button>
                <button type='button' onClick={() => this.insertLoginForm()}><Braces size={14} strokeWidth={1.5} /><span>Insert login form</span></button>
                <button type='button' onClick={() => this.insertMetricCard()}><BookOpen size={14} strokeWidth={1.5} /><span>Insert metric card</span></button>
                <span className='openpencil-menu-separator' />
                <button type='button' disabled={!this.selectedIds.length} onClick={() => this.duplicateSelection()}><Copy size={14} strokeWidth={1.5} /><span>Duplicate selection</span></button>
                <button type='button' disabled={!this.selectedIds.length} onClick={() => this.copySelection()}><Copy size={14} strokeWidth={1.5} /><span>Copy selection</span></button>
                <button type='button' disabled={!this.clipboardNodes.length} onClick={() => this.pasteClipboard()}><Plus size={14} strokeWidth={1.5} /><span>Paste</span></button>
                <button type='button' disabled={!this.selectedIds.length} onClick={() => this.deleteSelection()}><Trash2 size={14} strokeWidth={1.5} /><span>Delete selection</span></button>
                <button type='button' disabled={this.selectedIds.length < 2} onClick={() => this.groupSelection()}><Group size={14} strokeWidth={1.5} /><span>Group selection</span></button>
                <button type='button' disabled={selectedNode?.type !== 'group'} onClick={() => this.ungroupSelection()}><Group size={14} strokeWidth={1.5} /><span>Ungroup selection</span></button>
                <button type='button' disabled={!this.selectedIds.length} onClick={() => this.convertSelectionToPath()}><PenTool size={14} strokeWidth={1.5} /><span>Convert to path</span></button>
            </div>
        </details>;
    }

    protected renderBooleanToolbar(): React.ReactNode {
        const canBoolean = this.selectedIds.length >= 2;
        if (!canBoolean) {
            return undefined;
        }
        return <div className='openpencil-boolean-toolbar'>
            <button className='theia-button' title='Union selected shapes' onClick={() => this.applyBooleanOperation('union')}>
                <span className='openpencil-tool-text'>U</span>
            </button>
            <button className='theia-button' title='Subtract selected shapes' onClick={() => this.applyBooleanOperation('subtract')}>
                <span className='openpencil-tool-text'>-</span>
            </button>
            <button className='theia-button' title='Intersect selected shapes' onClick={() => this.applyBooleanOperation('intersect')}>
                <span className='openpencil-tool-text'>I</span>
            </button>
            <button className='theia-button' title='Exclude selected shapes' onClick={() => this.applyBooleanOperation('exclude')}>
                <span className='openpencil-tool-text'>X</span>
            </button>
        </div>;
    }

    protected renderSelectionToolbar(): React.ReactNode {
        const selectedNode = this.getPrimarySelectedNode();
        if (!this.selectedIds.length) {
            return undefined;
        }
        return <div className='openpencil-selection-toolbar'>
            <button className='theia-button' title='Group selection' disabled={this.selectedIds.length < 2} onClick={() => this.groupSelection()}>
                <Group size={16} strokeWidth={1.5} />
            </button>
            <button className='theia-button' title='Ungroup selection' disabled={selectedNode?.type !== 'group'} onClick={() => this.ungroupSelection()}>
                <Group size={16} strokeWidth={1.5} />
            </button>
            <button className='theia-button' title='Bring to front' onClick={() => this.bringToFront()}>
                <i className={codicon('arrow-small-up')}></i>
            </button>
            <button className='theia-button' title='Send to back' onClick={() => this.sendToBack()}>
                <i className={codicon('arrow-small-down')}></i>
            </button>
            <button className='theia-button' title='Align left' disabled={this.selectedIds.length < 2} onClick={() => this.alignSelection('left')}>
                <i className={codicon('layout-sidebar-left')}></i>
            </button>
            <button className='theia-button' title='Align right' disabled={this.selectedIds.length < 2} onClick={() => this.alignSelection('right')}>
                <i className={codicon('layout-sidebar-right')}></i>
            </button>
        </div>;
    }

    protected renderRuntimeToolbarTrailing(): React.ReactNode {
        return <div className='openpencil-runtime-export-toolbar'>
            <div className='openpencil-toolbar-group openpencil-ai-actions'>
                {this.renderQuickAiButtons()}
                {this.renderQuickTextEditButton()}
            </div>
            <div className='openpencil-toolbar-group openpencil-design-actions'>
                {this.renderDesignInteropButtons()}
            </div>
            <div className='openpencil-toolbar-group openpencil-quick-export-actions'>
                {this.renderQuickExportButtons()}
            </div>
            {this.renderExportControls()}
        </div>;
    }

    protected renderRuntimeCanvasToolbarTrailing(): React.ReactNode {
        return <>
            <button
                type='button'
                className='openpencil-runtime-history-button'
                aria-label='Undo'
                title='Undo'
                disabled={!this.undoStack.length}
                onClick={event => {
                    event.stopPropagation();
                    this.undo();
                }}>
                <Undo2 size={18} strokeWidth={1.5} />
            </button>
            <button
                type='button'
                className='openpencil-runtime-history-button'
                aria-label='Redo'
                title='Redo'
                disabled={!this.redoStack.length}
                onClick={event => {
                    event.stopPropagation();
                    this.redo();
                }}>
                <Redo2 size={18} strokeWidth={1.5} />
            </button>
        </>;
    }

    protected renderQuickAiButtons(): React.ReactNode {
        const aiBusy = !!this.aiStatus && this.aiStatus.phase !== 'complete' && this.aiStatus.phase !== 'error';
        const aiLabel = this.aiStatus?.label ?? 'AI';
        const aiDetail = this.aiStatus?.detail ?? this.aiStatus?.label;
        const aiIcon = this.aiStatus?.phase === 'complete'
            ? 'check'
            : this.aiStatus?.phase === 'error'
                ? 'error'
                : aiBusy
                    ? 'loading'
                    : 'sparkle';
        return <>
            <button className='theia-button openpencil-ai-run' title={aiDetail ?? 'Prompt to design with AI'} disabled={aiBusy} onClick={() => this.executeOpenPencilCommand(OPENPENCIL_PROMPT_TO_DESIGN_COMMAND, this.uri)}>
                <i className={codicon(aiIcon) + (aiBusy ? ' theia-animation-spin' : '')}></i>
                <span>{aiLabel}</span>
            </button>
            <button className='theia-button openpencil-ai-run' title={aiDetail ?? 'Continue design with AI'} disabled={aiBusy} onClick={() => this.executeOpenPencilCommand(OPENPENCIL_CONTINUE_DESIGN_WITH_AI_COMMAND, this.uri)}>
                <i className={codicon(aiIcon) + (aiBusy ? ' theia-animation-spin' : '')}></i>
                <span>{this.aiStatus ? aiLabel : 'Continue'}</span>
            </button>
            <button className='theia-button openpencil-ai-run' title={aiDetail ?? 'Edit selected layer with AI'} disabled={aiBusy || !this.selectedIds.length} onClick={() => this.executeOpenPencilCommand(OPENPENCIL_EDIT_SELECTED_NODE_WITH_AI_COMMAND, this.uri)}>
                <i className={codicon(aiIcon) + (aiBusy ? ' theia-animation-spin' : '')}></i>
                <span>{this.aiStatus ? aiLabel : 'AI Edit'}</span>
            </button>
        </>;
    }

    protected renderQuickTextEditButton(): React.ReactNode {
        const targetCount = this.editableTextTargetsForSelection().length;
        return <button
            className='theia-button openpencil-text-edit-run'
            title={targetCount
                ? 'Edit text in the selected layer'
                : 'Select a text layer, or a layer containing text, to edit its text'}
            disabled={!targetCount}
            onClick={() => this.editSelectedText()}>
            <i className={codicon('edit')}></i>
            <span>Text</span>
        </button>;
    }

    protected renderQuickExportButtons(): React.ReactNode {
        return <>
            <button className='theia-button' title='Export document to HTML' onClick={() => this.exportCurrentDocument('html-css')}>
                <i className={codicon('export')}></i>
            </button>
            <button className='theia-button' title='Export selection to React' disabled={!this.selectedIds.length} onClick={() => this.exportCurrentDocument('react-tailwind', true)}>
                <i className={codicon('code')}></i>
            </button>
            <button className='theia-button' title='Export document to SVG' onClick={() => this.exportCurrentDocument('svg')}>
                <i className={codicon('file-media')}></i>
            </button>
        </>;
    }

    protected renderDesignInteropButtons(): React.ReactNode {
        return <>
            <button
                className='theia-button openpencil-design-json-run'
                title='Open Design-as-Code JSON for this design'
                aria-label='Open Design-as-Code JSON'
                onClick={() => this.executeOpenPencilCommand(OPENPENCIL_OPEN_AS_JSON_COMMAND, this.uri)}>
                <span className='openpencil-tool-text openpencil-json-glyph'>{'{}'}</span>
            </button>
            <button
                className='theia-button openpencil-components-run'
                title='Export selection or page as a Components UI kit'
                aria-label='Export Components UI kit'
                onClick={() => this.executeOpenPencilCommand(OPENPENCIL_EXPORT_UI_KIT_COMMAND)}>
                <i className={codicon('extensions')}></i>
            </button>
        </>;
    }

    protected async executeOpenPencilCommand(commandId: string, ...args: unknown[]): Promise<void> {
        try {
            await this.commandRegistry.executeCommand(commandId, ...args);
        } catch (error) {
            this.messages.error(error instanceof Error ? error.message : String(error));
        }
    }

    protected async editSelectedText(): Promise<void> {
        const target = this.editableTextTargetsForSelection()[0];
        if (!target) {
            this.messages.info('Select a text layer, or a layer containing text, before editing text.');
            return;
        }
        const currentText = this.nodeTextContent(target);
        const value = this.quickInputService
            ? await this.quickInputService.input({
                title: 'Edit Canvas text',
                value: currentText,
                prompt: target.name ? `Editing ${target.name}` : `Editing ${target.id}`,
                placeHolder: 'Text content'
            })
            : window.prompt('Edit Canvas text', currentText) ?? undefined;
        if (value === undefined) {
            return;
        }
        this.updateNode(target.id, { content: value });
    }

    protected renderExportControls(): React.ReactNode {
        const target = this.getExportTarget(this.exportFormat);
        const selectionUnavailable = !this.selectedIds.length;
        const exportDisabled = this.exportScope === 'selection' && selectionUnavailable;
        return <div className='openpencil-export-controls' aria-label='Canvas export and code generation'>
            <label className='openpencil-export-field'>
                <span>Target</span>
                <select
                    value={this.exportFormat}
                    title='Export target'
                    aria-label='Export target'
                    onChange={event => this.setExportFormat(event.currentTarget.value as OpenPencilExportFormat)}>
                    {OPENPENCIL_EXPORT_TARGETS.map(entry => <option key={entry.format} value={entry.format} data-export-format={entry.format}>
                        {entry.label}
                    </option>)}
                </select>
            </label>
            <label className='openpencil-export-field openpencil-export-scope'>
                <span>Scope</span>
                <select
                    value={this.exportScope}
                    title='Export scope'
                    aria-label='Export scope'
                    onChange={event => this.setExportScope(event.currentTarget.value as OpenPencilExportScope)}>
                    <option value='document'>Document</option>
                    <option value='selection' disabled={selectionUnavailable}>Selection only</option>
                </select>
            </label>
            <span className='openpencil-export-meta' title={`Extension ${target.extension}`}>
                {target.extension}
            </span>
            <span className='openpencil-export-adapter' title={`Adapter ${target.adapter}`}>
                {target.adapter}
            </span>
            <button
                className='theia-button openpencil-export-run'
                title={exportDisabled ? 'Select at least one node to export selection only' : `Export ${target.label}`}
                disabled={exportDisabled}
                onClick={() => this.exportCurrentDocument(this.exportFormat, this.exportScope === 'selection')}>
                <i className={codicon('export')}></i>
                <span>Export</span>
            </button>
        </div>;
    }

    protected renderPageStrip(): React.ReactNode {
        if (!this.document) {
            return undefined;
        }
        const pages = this.document.pages ?? [];
        const activePageId = this.documents.getActivePage(this.document).id;
        return <div className='openpencil-page-strip'>
            <div className='openpencil-page-tabs'>
                {pages.map(page => <button
                    key={page.id}
                    className={`openpencil-page-tab ${page.id === activePageId ? 'selected' : ''}`}
                    title={page.name}
                    onClick={() => this.setActivePage(page.id)}>
                    {page.name}
                </button>)}
            </div>
            <button className='theia-button' title='Add page' onClick={() => this.addPage()}>
                <i className={codicon('add')}></i>
            </button>
            <button className='theia-button' title='Delete active page' disabled={pages.length <= 1} onClick={() => this.deleteActivePage()}>
                <i className={codicon('trash')}></i>
            </button>
        </div>;
    }

    protected renderZoomControls(): React.ReactNode {
        return <div className='openpencil-zoom-controls'>
            <button className='theia-button' title='Zoom out' onClick={() => this.setCanvasZoom(this.canvasZoom - 0.1)}>
                <i className={codicon('zoom-out')}></i>
            </button>
            <span className='openpencil-zoom-label'>{Math.round(this.canvasZoom * 100)}%</span>
            <button className='theia-button' title='Zoom in' onClick={() => this.setCanvasZoom(this.canvasZoom + 0.1)}>
                <i className={codicon('zoom-in')}></i>
            </button>
            <button className='theia-button' title='Reset zoom' onClick={() => this.setCanvasZoom(1)}>
                <i className={codicon('screen-normal')}></i>
            </button>
            <button className='theia-button' title='Fit page' onClick={() => this.fitPage()}>
                <i className={codicon('screen-full')}></i>
            </button>
            <button className='theia-button' title='Fit selection' disabled={!this.selectedIds.length} onClick={() => this.fitSelection()}>
                <i className={codicon('selection')}></i>
            </button>
        </div>;
    }

    protected renderLayerPanel(nodes: OpenPencilNode[]): React.ReactNode {
        const filter = this.normalizedLayerFilter();
        const visibleIds = this.collectLayerIds(nodes, filter);
        return <>
            <div className='openpencil-layers-header'>
                <h3>Layers</h3>
                <small>{visibleIds.length}/{this.collectLayerIds(nodes, '').length}</small>
            </div>
            <div className='openpencil-layer-tools'>
                <input
                    className='theia-input'
                    value={this.layerFilter}
                    placeholder='Filter layers'
                    onChange={event => {
                        this.layerFilter = event.currentTarget.value;
                        this.update();
                    }}
                />
                <button className='theia-button' title='Select visible layers' disabled={!visibleIds.length} onClick={() => this.setSelection(visibleIds)}>
                    <i className={codicon('check-all')}></i>
                </button>
                <button className='theia-button' title='Clear layer filter and selection' disabled={!this.layerFilter && !this.selectedIds.length} onClick={() => this.clearLayerPanel()}>
                    <i className={codicon('clear-all')}></i>
                </button>
            </div>
            {nodes.length
                ? visibleIds.length ? this.renderLayers(nodes, 0, filter) : this.renderPanelEmptyState('No matching layers', 'Clear the filter to show every layer on this page.', 'search')
                : this.renderPanelEmptyState('No layers', 'Use the toolbar to add shapes, text, frames, or images.', 'list-tree')}
        </>;
    }

    protected renderLayers(nodes: OpenPencilNode[], depth = 0, filter = ''): React.ReactNode {
        return nodes.map(node => {
            const children = node.children ? this.renderLayers(node.children, depth + 1, filter) : undefined;
            if (filter && !this.layerMatches(node, filter) && !this.hasMatchingLayer(node.children ?? [], filter)) {
                return undefined;
            }
            return <React.Fragment key={node.id}>
            <div
                className={`openpencil-layer ${this.selectedIds.includes(node.id) ? 'selected' : ''} ${node.visible === false ? 'hidden' : ''}`}
                data-layer-id={node.id}
                data-layer-type={node.type}
                data-layer-visible={node.visible !== false}
                data-layer-locked={!!node.locked}>
                <button
                    className='openpencil-layer-select'
                    style={{ paddingLeft: `${8 + depth * 14}px` }}
                    title={node.name || node.id}
                    onClick={event => this.selectFromEvent(event, node.id)}>
                    <i className={`openpencil-layer-type ${codicon(this.layerIcon(node))}`}></i>
                    <span>{node.name || node.id}</span>
                    <small>{node.type}</small>
                </button>
                <div className='openpencil-layer-actions'>
                    <button
                        className='theia-button'
                        title={node.visible === false ? 'Show layer' : 'Hide layer'}
                        data-layer-action='visibility'
                        data-layer-id={node.id}
                        onClick={() => this.updateNode(node.id, { visible: node.visible === false })}>
                        <i className={codicon(node.visible === false ? 'eye-closed' : 'eye')}></i>
                    </button>
                    <button
                        className='theia-button'
                        title={node.locked ? 'Unlock layer' : 'Lock layer'}
                        data-layer-action='lock'
                        data-layer-id={node.id}
                        onClick={() => this.updateNode(node.id, { locked: !node.locked })}>
                        <i className={codicon(node.locked ? 'lock' : 'unlock')}></i>
                    </button>
                </div>
            </div>
            {children}
            </React.Fragment>;
        });
    }

    protected renderCanvas(page: OpenPencilPage, nodes: OpenPencilNode[]): React.ReactNode {
        const width = page.width ?? 900;
        const height = page.height ?? 620;
        const background = page.background ?? '#ffffff';
        const gridSize = this.pageGridSize(page);
        const gridId = this.gridPatternId(page);
        return <svg
            className='openpencil-canvas'
            data-testid='openpencil-local-canvas'
            viewBox={`0 0 ${width} ${height}`}
            style={{
                width: `${Math.max(1, width * this.canvasZoom)}px`,
                height: `${Math.max(1, height * this.canvasZoom)}px`
            }}
            onMouseMove={event => this.onCanvasMouseMove(event)}
            onMouseDown={event => this.startMarquee(event, page)}
            onMouseUp={() => this.finishInteraction()}
            onMouseLeave={() => this.finishInteraction()}>
            {page.showGrid !== false && <defs>
                <pattern id={gridId} width={gridSize} height={gridSize} patternUnits='userSpaceOnUse'>
                    <path d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} className='openpencil-grid-line' />
                </pattern>
            </defs>}
            <rect x={0} y={0} width={width} height={height} fill={background} className='openpencil-canvas-bg' />
            {page.showGrid !== false && <rect x={0} y={0} width={width} height={height} fill={`url(#${gridId})`} className='openpencil-grid-fill' />}
            {!nodes.length && this.renderCanvasEmptyState(width, height)}
            {this.nodesInPaintOrder(nodes).map(node => this.renderNode(node))}
            {this.renderMarquee()}
        </svg>;
    }

    protected nodesInPaintOrder(nodes: OpenPencilNode[]): OpenPencilNode[] {
        return [...nodes].reverse();
    }

    protected renderNode(node: OpenPencilNode): React.ReactNode {
        if (node.visible === false) {
            return undefined;
        }
        const selected = this.selectedIds.includes(node.id);
        const x = this.numberValue(node.x, 0);
        const y = this.numberValue(node.y, 0);
        const width = this.numberValue(node.width, 160);
        const height = this.numberValue(node.height, node.type === 'text' ? 40 : 120);
        const fill = node.fill?.[0]?.color ?? (node.type === 'text' ? '#111827' : '#e5e7eb');
        const stroke = selected ? '#2563eb' : node.stroke?.color ?? '#94a3b8';
        const strokeWidth = selected ? 2 : node.stroke?.width ?? 1;
        const selectionWidth = Math.max(8, width);
        const selectionHeight = Math.max(8, height);
        const common = {
            'data-node-id': node.id,
            'data-node-type': node.type,
            onMouseDown: (event: React.MouseEvent<SVGElement>) => this.startDrag(event, node),
            onClick: (event: React.MouseEvent<SVGElement>) => {
                event.stopPropagation();
                if (this.suppressNextNodeClick) {
                    this.suppressNextNodeClick = false;
                    return;
                }
                this.selectFromEvent(event, node.id);
            }
        };
        if (node.type === 'text') {
            const textAlign = node.textAlign ?? 'left';
            return <g key={node.id} opacity={this.opacityValue(node)} transform={this.rotationTransform(node, x, y, width, height)}>
                <text {...common} x={this.textX(x, width, textAlign)} y={y + (node.fontSize ?? 16)} fill={fill} fontSize={node.fontSize ?? 16} fontWeight={node.fontWeight ?? 400} textAnchor={this.textAnchor(textAlign)}>
                    {this.nodeTextContent(node)}
                </text>
                {selected && this.renderSelection(node.id, x, y, selectionWidth, selectionHeight)}
            </g>;
        }
        if (node.type === 'ellipse') {
            return <g key={node.id} opacity={this.opacityValue(node)} transform={this.rotationTransform(node, x, y, width, height)}>
                <ellipse {...common} cx={x + width / 2} cy={y + height / 2} rx={width / 2} ry={height / 2} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
                {selected && this.renderSelection(node.id, x, y, selectionWidth, selectionHeight)}
            </g>;
        }
        if (node.type === 'line') {
            return <g key={node.id} opacity={this.opacityValue(node)} transform={this.rotationTransform(node, x, y, width, height)}>
                <line {...common} x1={x} y1={y} x2={x + width} y2={y + height} stroke={stroke} strokeWidth={Math.max(1, strokeWidth)} strokeLinecap='round' />
                {selected && this.renderSelection(node.id, Math.min(x, x + width), Math.min(y, y + height), Math.abs(width) || 8, Math.abs(height) || 8)}
            </g>;
        }
        if (node.type === 'image') {
            return <g key={node.id} opacity={this.opacityValue(node)} transform={this.rotationTransform(node, x, y, width, height)}>
                {node.src
                    ? <image {...common} href={node.src} x={x} y={y} width={width} height={height} preserveAspectRatio='xMidYMid slice' />
                    : <>
                        <rect {...common} x={x} y={y} width={width} height={height} fill='#f8fafc' stroke={stroke} strokeWidth={strokeWidth} />
                        <text x={x + width / 2} y={y + height / 2} textAnchor='middle' dominantBaseline='middle' fill='#64748b' fontSize={14}>Image</text>
                    </>}
                {selected && this.renderSelection(node.id, x, y, selectionWidth, selectionHeight)}
            </g>;
        }
        if (node.type === 'polygon') {
            const points = this.polygonPoints(node, x, y, width, height);
            return <g key={node.id} opacity={this.opacityValue(node)} transform={this.rotationTransform(node, x, y, width, height)}>
                <polygon {...common} points={points} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
                {selected && this.renderSelection(node.id, x, y, selectionWidth, selectionHeight)}
            </g>;
        }
        if (node.type === 'path') {
            const d = node.d || `M 0 ${height} C ${width * 0.25} 0 ${width * 0.75} 0 ${width} ${height}`;
            const pathFill = node.fill?.[0]?.color ?? 'none';
            return <g key={node.id} opacity={this.opacityValue(node)} transform={this.rotationTransform(node, x, y, width, height)}>
                <path {...common} d={d} transform={`translate(${x} ${y})`} fill={pathFill} fillRule={node.fillRule ?? 'nonzero'} stroke={stroke} strokeWidth={Math.max(1, strokeWidth)} />
                {selected && this.renderPathAnchors(node, x, y)}
                {selected && this.renderSelection(node.id, x, y, selectionWidth, selectionHeight)}
            </g>;
        }
        return <g key={node.id} opacity={this.opacityValue(node)} transform={this.rotationTransform(node, x, y, width, height)}>
            <rect {...common} x={x} y={y} width={width} height={height} rx={typeof node.cornerRadius === 'number' ? node.cornerRadius : 0} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
            {this.nodesInPaintOrder(node.children ?? []).map(child => this.renderNode({ ...child, x: (child.x ?? 0) + x, y: (child.y ?? 0) + y }))}
            {selected && this.renderSelection(node.id, x, y, selectionWidth, selectionHeight)}
        </g>;
    }

    protected renderSelection(nodeId: string, x: number, y: number, width: number, height: number): React.ReactNode {
        const handles: Array<{ handle: ResizeHandle; x: number; y: number; cursor: string }> = [
            { handle: 'nw', x: x - 6, y: y - 6, cursor: 'nwse-resize' },
            { handle: 'n', x: x + width / 2 - 4, y: y - 6, cursor: 'ns-resize' },
            { handle: 'ne', x: x + width - 2, y: y - 6, cursor: 'nesw-resize' },
            { handle: 'e', x: x + width + 2, y: y + height / 2 - 4, cursor: 'ew-resize' },
            { handle: 'se', x: x + width + 2, y: y + height + 2, cursor: 'nwse-resize' },
            { handle: 's', x: x + width / 2 - 4, y: y + height + 2, cursor: 'ns-resize' },
            { handle: 'sw', x: x - 6, y: y + height + 2, cursor: 'nesw-resize' },
            { handle: 'w', x: x - 6, y: y + height / 2 - 4, cursor: 'ew-resize' }
        ];
        return <g>
            <rect x={x - 4} y={y - 4} width={width + 8} height={height + 8} className='openpencil-selection' data-node-id={nodeId} />
            {handles.map(handle => <rect
                key={handle.handle}
                x={handle.x}
                y={handle.y}
                width={8}
                height={8}
                className='openpencil-resize-handle'
                data-node-id={nodeId}
                data-resize-handle={handle.handle}
                style={{ cursor: handle.cursor }}
                onMouseDown={event => this.startResize(event, nodeId, handle.handle)}
            />)}
        </g>;
    }

    protected renderPathAnchors(node: OpenPencilNode, offsetX: number, offsetY: number): React.ReactNode {
        if (!node.anchors?.length) {
            return undefined;
        }
        return <g className='openpencil-path-anchors'>
            {node.anchors.map((anchor, index) => {
                const anchorX = offsetX + anchor.x;
                const anchorY = offsetY + anchor.y;
                const handleInX = anchor.handleIn ? anchorX + anchor.handleIn.x : undefined;
                const handleInY = anchor.handleIn ? anchorY + anchor.handleIn.y : undefined;
                const handleOutX = anchor.handleOut ? anchorX + anchor.handleOut.x : undefined;
                const handleOutY = anchor.handleOut ? anchorY + anchor.handleOut.y : undefined;
                return <g key={`${node.id}-anchor-${index}`}>
                    {anchor.handleIn && handleInX !== undefined && handleInY !== undefined && <>
                        <line x1={anchorX} y1={anchorY} x2={handleInX} y2={handleInY} className='openpencil-path-handle-line' />
                        <circle
                            cx={handleInX}
                            cy={handleInY}
                            r={3}
                            className='openpencil-path-handle'
                            data-node-id={node.id}
                            data-anchor-index={index}
                            data-path-handle='in'
                            onMouseDown={event => this.startPathHandleDrag(event, node.id, index, 'in')}
                        />
                    </>}
                    {anchor.handleOut && handleOutX !== undefined && handleOutY !== undefined && <>
                        <line x1={anchorX} y1={anchorY} x2={handleOutX} y2={handleOutY} className='openpencil-path-handle-line' />
                        <circle
                            cx={handleOutX}
                            cy={handleOutY}
                            r={3}
                            className='openpencil-path-handle'
                            data-node-id={node.id}
                            data-anchor-index={index}
                            data-path-handle='out'
                            onMouseDown={event => this.startPathHandleDrag(event, node.id, index, 'out')}
                        />
                    </>}
                    <circle
                        cx={anchorX}
                        cy={anchorY}
                        r={index === 0 ? 4 : 3}
                        className='openpencil-path-anchor'
                        data-node-id={node.id}
                        data-anchor-index={index}
                        onMouseDown={event => this.startPathAnchorDrag(event, node.id, index)}
                    />
                </g>;
            })}
        </g>;
    }

    protected renderProperties(node: OpenPencilNode): React.ReactNode {
        const fill = this.colorInputValue(node.fill?.[0]?.color, '#e5e7eb');
        const stroke = this.colorInputValue(node.stroke?.color, '#94a3b8');
        const fillOpacity = this.numberValue(node.fill?.[0]?.opacity, 1);
        const strokeOpacity = this.numberValue(node.stroke?.opacity, 1);
        const isContainer = node.type === 'frame' || node.type === 'group' || node.type === 'rectangle';
        return <div className='openpencil-property-grid'>
            <div className='openpencil-property-meta openpencil-property-wide'>
                <span>{node.type}</span>
                <code title={node.id}>{node.id}</code>
            </div>
            <div className='openpencil-property-wide'>
                {this.renderTextInput('Name', node.name ?? '', value => this.updateSelected({ name: value }))}
            </div>
            <div className='openpencil-property-wide'>
                {this.renderTextInput('Role', node.role ?? '', value => this.updateSelected({ role: value || undefined }))}
            </div>
            {this.renderNumberInput('X', Number(node.x ?? 0), value => this.updateSelected({ x: value }))}
            {this.renderNumberInput('Y', Number(node.y ?? 0), value => this.updateSelected({ y: value }))}
            {this.renderSizeValueInput('Width', node.width ?? 160, value => this.updateSelected({ width: value }))}
            {this.renderSizeValueInput('Height', node.height ?? 80, value => this.updateSelected({ height: value }))}
            {this.renderNumberInput('Opacity', this.numberValue(node.opacity, 1), value => this.updateSelected({ opacity: Math.max(0, Math.min(1, value)) }))}
            {this.renderNumberInput('Rotation', Number(node.rotation ?? 0), value => this.updateSelected({ rotation: value }))}
            <label>
                <span>Visible</span>
                <input type='checkbox' checked={node.visible !== false} onChange={event => this.updateSelected({ visible: event.currentTarget.checked })} />
            </label>
            <label>
                <span>Locked</span>
                <input type='checkbox' checked={!!node.locked} onChange={event => this.updateSelected({ locked: event.currentTarget.checked })} />
            </label>
            <label>
                <span>Enabled</span>
                <input type='checkbox' checked={node.enabled !== false} onChange={event => this.updateSelected({ enabled: event.currentTarget.checked })} />
            </label>
            <label>
                <span>Flip X</span>
                <input type='checkbox' checked={!!node.flipX} onChange={event => this.updateSelected({ flipX: event.currentTarget.checked })} />
            </label>
            <label>
                <span>Flip Y</span>
                <input type='checkbox' checked={!!node.flipY} onChange={event => this.updateSelected({ flipY: event.currentTarget.checked })} />
            </label>
            <label>
                <span>Fill</span>
                <input type='color' value={fill} onChange={event => this.updateSelected({ fill: [{ ...(node.fill?.[0] ?? { type: 'solid' }), color: event.currentTarget.value }] })} />
            </label>
            {this.renderNumberInput('Fill opacity', fillOpacity, value => this.updateSelected({ fill: [{ ...(node.fill?.[0] ?? { type: 'solid', color: fill }), opacity: Math.max(0, Math.min(1, value)) }] }))}
            <label>
                <span>Stroke</span>
                <input type='color' value={stroke} onChange={event => this.updateSelected({ stroke: { ...(node.stroke ?? {}), color: event.currentTarget.value } })} />
            </label>
            {this.renderNumberInput('Stroke width', node.stroke?.width ?? 1, value => this.updateSelected({ stroke: { ...(node.stroke ?? { color: stroke }), width: value } }))}
            {this.renderNumberInput('Stroke opacity', strokeOpacity, value => this.updateSelected({ stroke: { ...(node.stroke ?? { color: stroke }), opacity: Math.max(0, Math.min(1, value)) } }))}
            {this.supportsCornerRadius(node) && this.renderNumberInput('Corner radius', this.cornerRadiusValue(node), value => this.updateSelected({ cornerRadius: Math.max(0, value) }))}
            {isContainer && <>
                <div className='openpencil-property-section openpencil-property-wide'>Layout</div>
                {this.renderSelectInput<NonNullable<OpenPencilNode['layout']>>('Direction', node.layout ?? 'none', ['none', 'vertical', 'horizontal'], value => this.updateSelected({ layout: value }))}
                {this.renderSelectInput<NonNullable<OpenPencilNode['justifyContent']>>('Justify', node.justifyContent ?? 'start', ['start', 'center', 'end', 'space_between', 'space_around'], value => this.updateSelected({ justifyContent: value }))}
                {this.renderSelectInput<NonNullable<OpenPencilNode['alignItems']>>('Align', node.alignItems ?? 'start', ['start', 'center', 'end'], value => this.updateSelected({ alignItems: value }))}
                {this.renderSizeValueInput('Gap', node.gap ?? 0, value => this.updateSelected({ gap: value }))}
                <label className='openpencil-property-wide'>
                    <span>Padding</span>
                    <input className='theia-input' value={this.spacingValue(node.padding)} onChange={event => this.updateSelected({ padding: this.parseSpacingValue(event.currentTarget.value) })} />
                </label>
                <label>
                    <span>Clip content</span>
                    <input type='checkbox' checked={!!node.clipContent} onChange={event => this.updateSelected({ clipContent: event.currentTarget.checked })} />
                </label>
            </>}
            {node.type === 'text' && <>
                <div className='openpencil-property-section openpencil-property-wide'>Text</div>
                <label className='openpencil-property-wide'>
                    <span>Text</span>
                    <textarea className='theia-input' value={this.nodeTextContent(node)} onChange={event => this.updateSelected({ content: event.currentTarget.value })} />
                </label>
                <label className='openpencil-property-wide'>
                    <span>Font family</span>
                    <input className='theia-input' value={node.fontFamily ?? ''} onChange={event => this.updateSelected({ fontFamily: event.currentTarget.value || undefined })} />
                </label>
                {this.renderNumberInput('Font size', node.fontSize ?? 16, value => this.updateSelected({ fontSize: value }))}
                {this.renderSelectInput('Font weight', String(node.fontWeight ?? 400), ['300', '400', '500', '600', '700', '800'], value => this.updateSelected({ fontWeight: Number(value) }))}
                {this.renderSelectInput<NonNullable<OpenPencilNode['textAlign']>>('Text align', node.textAlign ?? 'left', ['left', 'center', 'right', 'justify'], value => this.updateSelected({ textAlign: value }))}
                {this.renderSelectInput<NonNullable<OpenPencilNode['textAlignVertical']>>('Vertical align', node.textAlignVertical ?? 'top', ['top', 'middle', 'bottom'], value => this.updateSelected({ textAlignVertical: value }))}
                {this.renderSelectInput<NonNullable<OpenPencilNode['fontStyle']>>('Font style', node.fontStyle ?? 'normal', ['normal', 'italic'], value => this.updateSelected({ fontStyle: value }))}
                {this.renderNumberInput('Line height', node.lineHeight ?? 1.2, value => this.updateSelected({ lineHeight: value }))}
                {this.renderNumberInput('Letter spacing', node.letterSpacing ?? 0, value => this.updateSelected({ letterSpacing: value }))}
                {this.renderSelectInput<NonNullable<OpenPencilNode['textGrowth']>>('Text growth', node.textGrowth ?? 'auto', ['auto', 'fixed-width', 'fixed-width-height'], value => this.updateSelected({ textGrowth: value }))}
                <label>
                    <span>Underline</span>
                    <input type='checkbox' checked={!!node.underline} onChange={event => this.updateSelected({ underline: event.currentTarget.checked })} />
                </label>
                <label>
                    <span>Strike</span>
                    <input type='checkbox' checked={!!node.strikethrough} onChange={event => this.updateSelected({ strikethrough: event.currentTarget.checked })} />
                </label>
            </>}
            {node.type !== 'text' && this.renderContainedTextProperties(node)}
            {node.type === 'image' && <label className='openpencil-property-wide'>
                <span>Image source</span>
                <input className='theia-input' value={node.src ?? ''} onChange={event => this.updateSelected({ src: event.currentTarget.value })} />
            </label>}
            {node.type === 'image' && this.renderSelectInput<NonNullable<OpenPencilNode['objectFit']>>('Object fit', node.objectFit ?? 'cover', ['fill', 'fit', 'crop', 'tile', 'cover', 'contain'], value => this.updateSelected({ objectFit: value }))}
            {node.type === 'path' && <>
                <label className='openpencil-property-wide'>
                    <span>Path data</span>
                    <textarea className='theia-input' value={node.d ?? ''} onChange={event => this.updateSelected({ d: event.currentTarget.value })} />
                </label>
                <label className='openpencil-property-wide'>
                    <span>Anchors JSON</span>
                    <textarea className='theia-input' value={JSON.stringify(node.anchors ?? [], undefined, 2)} onChange={event => this.applyOperation({ operation: 'updatePathAnchors', nodeId: node.id, anchors: this.parsePathAnchors(event.currentTarget.value, node.anchors), closed: node.closed })} />
                </label>
                <label>
                    <span>Closed path</span>
                    <input type='checkbox' checked={!!node.closed} onChange={event => this.applyOperation({ operation: 'updatePathAnchors', nodeId: node.id, anchors: node.anchors ?? [], closed: event.currentTarget.checked })} />
                </label>
                {this.renderSelectInput<NonNullable<OpenPencilNode['fillRule']>>('Fill rule', node.fillRule ?? 'nonzero', ['nonzero', 'evenodd'], value => this.updateSelected({ fillRule: value }))}
            </>}
            {node.type === 'polygon' && <label className='openpencil-property-wide'>
                <span>Points JSON</span>
                <textarea className='theia-input' value={JSON.stringify(node.points ?? [], undefined, 2)} onChange={event => this.updateSelected({ points: this.parsePoints(event.currentTarget.value, node.points) })} />
            </label>}
            <label className='openpencil-property-wide'>
                <span>Effects JSON</span>
                <textarea className='theia-input' value={JSON.stringify(node.effects ?? [], undefined, 2)} onChange={event => this.updateSelected({ effects: this.parseEffects(event.currentTarget.value, node.effects) })} />
            </label>
            <label className='openpencil-property-wide'>
                <span>Description</span>
                <textarea className='theia-input' value={node.explain ?? ''} onChange={event => this.updateSelected({ explain: event.currentTarget.value || undefined })} />
            </label>
        </div>;
    }

    protected renderContainedTextProperties(node: OpenPencilNode): React.ReactNode {
        const textNodes = this.collectTextDescendants(node);
        if (!textNodes.length) {
            return undefined;
        }
        return <>
            <div className='openpencil-property-section openpencil-property-wide'>Contained Text</div>
            {textNodes.slice(0, 6).map(textNode => <label key={textNode.id} className='openpencil-property-wide'>
                <span>{textNode.name ?? textNode.id}</span>
                <textarea
                    className='theia-input'
                    value={this.nodeTextContent(textNode)}
                    onChange={event => this.updateNode(textNode.id, { content: event.currentTarget.value })}
                />
            </label>)}
        </>;
    }

    protected renderPageProperties(page: OpenPencilPage): React.ReactNode {
        return <div className='openpencil-property-grid'>
            <label className='openpencil-property-wide'>
                <span>Page name</span>
                <input className='theia-input' value={page.name} onChange={event => this.updatePage(page.id, { name: event.currentTarget.value })} />
            </label>
            {this.renderNumberInput('Width', page.width ?? 900, value => this.updatePage(page.id, { width: Math.max(1, value) }))}
            {this.renderNumberInput('Height', page.height ?? 620, value => this.updatePage(page.id, { height: Math.max(1, value) }))}
            {this.renderNumberInput('Grid size', page.gridSize ?? 20, value => this.updatePage(page.id, { gridSize: Math.max(2, value) }))}
            <label>
                <span>Show grid</span>
                <input type='checkbox' checked={page.showGrid !== false} onChange={event => this.updatePage(page.id, { showGrid: event.currentTarget.checked })} />
            </label>
            <label>
                <span>Snap to grid</span>
                <input type='checkbox' checked={!!page.snapToGrid} onChange={event => this.updatePage(page.id, { snapToGrid: event.currentTarget.checked })} />
            </label>
            <label className='openpencil-property-wide'>
                <span>Background</span>
                <input type='color' value={page.background ?? '#ffffff'} onChange={event => this.updatePage(page.id, { background: event.currentTarget.value })} />
            </label>
            <div className='openpencil-empty openpencil-property-wide'>
                <i className={codicon('symbol-misc')}></i>
                <strong>Select a layer</strong>
                <span>Edit node position, appearance, layout, and export settings here.</span>
            </div>
        </div>;
    }

    protected renderPanelEmptyState(title: string, detail: string, icon: string): React.ReactNode {
        return <div className='openpencil-empty'>
            <i className={codicon(icon)}></i>
            <strong>{title}</strong>
            <span>{detail}</span>
        </div>;
    }

    protected renderCanvasEmptyState(width: number, height: number): React.ReactNode {
        const cardWidth = Math.min(360, Math.max(220, width * 0.52));
        const cardHeight = 118;
        const x = Math.max(24, (width - cardWidth) / 2);
        const y = Math.max(24, (height - cardHeight) / 2);
        return <g className='openpencil-canvas-empty'>
            <rect x={x} y={y} width={cardWidth} height={cardHeight} rx={8} />
            <text x={width / 2} y={y + 45} textAnchor='middle'>Empty page</text>
            <text x={width / 2} y={y + 72} textAnchor='middle'>Add a shape, frame, text, or image from the toolbar.</text>
        </g>;
    }

    protected layerIcon(node: OpenPencilNode): string {
        switch (node.type) {
            case 'ellipse':
                return 'circle-large-outline';
            case 'text':
                return 'symbol-string';
            case 'line':
                return 'remove';
            case 'frame':
                return 'layout';
            case 'group':
                return 'folder';
            case 'polygon':
                return 'triangle-right';
            case 'path':
                return 'symbol-method';
            case 'image':
                return 'file-media';
            case 'icon_font':
                return 'symbol-color';
            case 'ref':
                return 'references';
            default:
                return 'symbol-misc';
        }
    }

    protected renderTextInput(label: string, value: string, onChange: (value: string) => void): React.ReactNode {
        return <label>
            <span>{label}</span>
            <input className='theia-input' value={value} onChange={event => onChange(event.currentTarget.value)} />
        </label>;
    }

    protected renderNumberInput(label: string, value: number, onChange: (value: number) => void): React.ReactNode {
        return <label>
            <span>{label}</span>
            <input className='theia-input' type='number' value={value} onChange={event => onChange(Number(event.currentTarget.value))} />
        </label>;
    }

    protected renderSizeValueInput(label: string, value: number | string | undefined, onChange: (value: number | string) => void): React.ReactNode {
        return <label>
            <span>{label}</span>
            <input className='theia-input' value={value ?? ''} onChange={event => onChange(this.parseSpacingValue(event.currentTarget.value))} />
        </label>;
    }

    protected renderSelectInput<T extends string>(label: string, value: T, options: T[], onChange: (value: T) => void): React.ReactNode {
        return <label>
            <span>{label}</span>
            <select className='theia-input' value={value} onChange={event => onChange(event.currentTarget.value as T)}>
                {options.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
        </label>;
    }

    protected addRectangle(): void {
        this.applyOperation({
            operation: 'addNode',
            node: {
                id: this.documents.generateId('rectangle'),
                type: 'rectangle',
                name: 'Rectangle',
                x: 180,
                y: 180,
                width: 180,
                height: 120,
                fill: [{ type: 'solid', color: '#dbeafe' }],
                stroke: { color: '#2563eb', width: 1 },
                cornerRadius: 8
            }
        });
    }

    protected addEllipse(): void {
        this.applyOperation({
            operation: 'addNode',
            node: {
                id: this.documents.generateId('ellipse'),
                type: 'ellipse',
                name: 'Ellipse',
                x: 220,
                y: 180,
                width: 160,
                height: 120,
                fill: [{ type: 'solid', color: '#dcfce7' }],
                stroke: { color: '#16a34a', width: 1 }
            }
        });
    }

    protected addPolygon(): void {
        this.applyOperation({
            operation: 'addNode',
            node: {
                id: this.documents.generateId('polygon'),
                type: 'polygon',
                name: 'Polygon',
                x: 240,
                y: 180,
                width: 160,
                height: 140,
                points: [
                    { x: 80, y: 0 },
                    { x: 160, y: 140 },
                    { x: 0, y: 140 }
                ],
                fill: [{ type: 'solid', color: '#fef3c7' }],
                stroke: { color: '#d97706', width: 1 }
            }
        });
    }

    protected addLine(): void {
        this.applyOperation({
            operation: 'addNode',
            node: {
                id: this.documents.generateId('line'),
                type: 'line',
                name: 'Line',
                x: 220,
                y: 260,
                width: 240,
                height: 72,
                stroke: { color: '#334155', width: 3 }
            }
        });
    }

    protected addPath(): void {
        const anchors: OpenPencilPathAnchor[] = [
            { x: 0, y: 80, handleIn: null, handleOut: { x: 42, y: -80 } },
            { x: 160, y: 80, handleIn: { x: -42, y: -80 }, handleOut: null }
        ];
        this.applyOperation({
            operation: 'addNode',
            node: {
                id: this.documents.generateId('path'),
                type: 'path',
                name: 'Path',
                x: 220,
                y: 220,
                width: 160,
                height: 96,
                anchors,
                closed: false,
                d: 'M 0 80 C 42 0 118 0 160 80',
                fill: [{ type: 'solid', color: 'transparent' }],
                stroke: { color: '#7c3aed', width: 3 }
            }
        });
    }

    protected addText(): void {
        this.applyOperation({
            operation: 'addNode',
            node: {
                id: this.documents.generateId('text'),
                type: 'text',
                name: 'Text',
                x: 220,
                y: 220,
                width: 240,
                height: 48,
                content: 'New text',
                fontSize: 24,
                fill: [{ type: 'solid', color: '#111827' }]
            }
        });
    }

    protected addFrame(): void {
        this.applyOperation({
            operation: 'addNode',
            node: {
                id: this.documents.generateId('frame'),
                type: 'frame',
                name: 'Frame',
                x: 160,
                y: 140,
                width: 320,
                height: 220,
                fill: [{ type: 'solid', color: '#ffffff' }],
                stroke: { color: '#94a3b8', width: 1 },
                cornerRadius: 12,
                children: []
            }
        });
    }

    protected addImage(): void {
        this.applyOperation({
            operation: 'addNode',
            node: {
                id: this.documents.generateId('image'),
                type: 'image',
                name: 'Image',
                x: 240,
                y: 180,
                width: 220,
                height: 140,
                src: '',
                fill: [{ type: 'solid', color: '#f8fafc' }],
                stroke: { color: '#94a3b8', width: 1 }
            }
        });
    }

    protected insertHeroBlock(): void {
        this.insertTemplate('hero');
    }

    protected insertLoginForm(): void {
        this.insertTemplate('login-form');
    }

    protected insertMetricCard(): void {
        this.insertTemplate('metric-card');
    }

    protected insertTemplate(templateId: OpenPencilTemplateId): void {
        const template = this.templates.createTemplate(templateId, prefix => this.documents.generateId(prefix));
        this.insertGroupedNodes(template.nodes, template.nodeIds);
    }

    protected insertGroupedNodes(nodes: OpenPencilNode[], nodeIds: string[]): void {
        this.applyOperations([
            ...nodes.map(node => ({
                operation: 'addNode',
                node
            }) as OpenPencilDesignOperation),
            {
                operation: 'groupNodes',
                nodeIds
            }
        ]);
    }

    protected duplicateSelection(): void {
        const [nodeId] = this.selectedIds;
        if (nodeId) {
            this.applyOperation({ operation: 'duplicateNode', nodeId });
        }
    }

    protected copySelection(): void {
        if (!this.document || !this.selectedIds.length) {
            return;
        }
        this.clipboardNodes = this.selectedIds
            .map(nodeId => this.documents.findNode(this.document!, nodeId))
            .filter((node): node is OpenPencilNode => !!node)
            .map(node => this.clonePlainNode(node));
        this.pasteCount = 0;
        this.update();
    }

    protected pasteClipboard(): void {
        if (!this.clipboardNodes.length) {
            return;
        }
        this.pasteCount++;
        const offset = 24 * this.pasteCount;
        const nodes = this.clipboardNodes.map(node => this.cloneNodeForPaste(node, offset));
        this.applyOperations([
            ...nodes.map(node => ({
            operation: 'addNode',
            node
            }) as OpenPencilDesignOperation),
            { operation: 'setSelection', nodeIds: nodes.map(node => node.id) }
        ]);
    }

    protected groupSelection(): void {
        if (this.selectedIds.length > 1) {
            this.applyOperation({ operation: 'groupNodes', nodeIds: this.selectedIds });
        }
    }

    protected ungroupSelection(): void {
        const [nodeId] = this.selectedIds;
        if (nodeId) {
            this.applyOperation({ operation: 'ungroupNode', nodeId });
        }
    }

    protected convertSelectionToPath(): void {
        if (this.selectedIds.length) {
            this.applyOperation({ operation: 'convertToPath', nodeIds: this.selectedIds });
        }
    }

    protected applyBooleanOperation(booleanOperation: OpenPencilBooleanOperation): void {
        if (this.selectedIds.length > 1) {
            this.applyOperation({ operation: 'booleanNodes', nodeIds: this.selectedIds, booleanOperation });
        }
    }

    protected bringForward(): void {
        const [nodeId] = this.selectedIds;
        if (nodeId) {
            this.applyOperation({ operation: 'bringForward', nodeId });
        }
    }

    protected sendBackward(): void {
        const [nodeId] = this.selectedIds;
        if (nodeId) {
            this.applyOperation({ operation: 'sendBackward', nodeId });
        }
    }

    protected bringToFront(): void {
        const [nodeId] = this.selectedIds;
        if (nodeId) {
            this.applyOperation({ operation: 'bringToFront', nodeId });
        }
    }

    protected sendToBack(): void {
        const [nodeId] = this.selectedIds;
        if (nodeId) {
            this.applyOperation({ operation: 'sendToBack', nodeId });
        }
    }

    protected alignSelection(alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'): void {
        if (this.selectedIds.length > 1) {
            this.applyOperation({ operation: 'alignNodes', nodeIds: this.selectedIds, alignment });
        }
    }

    protected distributeSelection(direction: 'horizontal' | 'vertical'): void {
        if (this.selectedIds.length > 2) {
            this.applyOperation({ operation: 'distributeNodes', nodeIds: this.selectedIds, direction });
        }
    }

    protected addPage(): void {
        const nextIndex = this.document?.pages?.length ? this.document.pages.length + 1 : 1;
        this.applyOperation({
            operation: 'addPage',
            page: {
                name: `Page ${nextIndex}`
            },
            makeActive: true
        });
    }

    protected setActivePage(pageId: string): void {
        if (this.document?.activePageId !== pageId) {
            this.applyOperation({ operation: 'setActivePage', pageId });
        }
    }

    protected deleteActivePage(): void {
        if (!this.document) {
            return;
        }
        const page = this.documents.getActivePage(this.document);
        this.applyOperation({ operation: 'removePage', pageId: page.id });
    }

    protected updatePage(pageId: string, changes: Partial<Pick<OpenPencilPage, 'name' | 'width' | 'height' | 'background' | 'gridSize' | 'showGrid' | 'snapToGrid' | 'children'>>): void {
        this.applyOperation({ operation: 'updatePage', pageId, changes });
    }

    protected async deleteSelection(): Promise<void> {
        const ids = [...this.selectedIds];
        if (ids.length) {
            this.captureUndoSnapshot();
            for (const nodeId of ids) {
                await this.doApplyOperation({ operation: 'removeNode', nodeId }, true);
            }
            this.setSelection([]);
        }
    }

    protected updateSelected(changes: Partial<OpenPencilNode>): void {
        const [nodeId] = this.selectedIds;
        if (nodeId) {
            this.updateNode(nodeId, changes);
        }
    }

    protected updateNode(nodeId: string, changes: Partial<OpenPencilNode>): void {
        this.applyOperation({ operation: 'updateNode', nodeId, changes });
    }

    protected async exportCurrentDocument(format: OpenPencilExportFormat, selectionOnly = false): Promise<void> {
        if (!this.document) {
            return;
        }
        const extension = this.getExportTarget(format).extension;
        const suffix = selectionOnly ? '.selection' : '';
        const target = this.uri.parent.resolve(`${this.uri.path.name}${suffix}${extension}`);
        const content = this.commandService.exportDocument(this.document, this.selectedIds, format, selectionOnly);
        await this.fileService.writeFile(target, BinaryBuffer.fromString(content));
        this.messages.info(`Canvas export created: ${target.path.base}`);
    }

    protected async createDocumentSummary(): Promise<void> {
        if (!this.document) {
            return;
        }
        const summary = {
            ...this.commandService.getDocumentSummary(this.document),
            selection: this.getSelection()
        };
        const target = this.uri.parent.resolve(`${this.uri.path.name}.openpencil-summary.json`);
        await this.fileService.writeFile(target, BinaryBuffer.fromString(`${JSON.stringify(summary, undefined, 2)}\n`));
        this.messages.info(`Canvas summary created: ${target.path.base}`);
    }

    protected getExportTarget(format: OpenPencilExportFormat): OpenPencilExportTarget {
        return OPENPENCIL_EXPORT_TARGETS.find(entry => entry.format === format) ?? DEFAULT_OPENPENCIL_EXPORT_TARGET;
    }

    protected setExportFormat(format: OpenPencilExportFormat): void {
        this.exportFormat = format;
        this.update();
    }

    protected setExportScope(scope: OpenPencilExportScope): void {
        this.exportScope = scope;
        this.update();
    }

    protected setSelection(nodeIds: string[]): void {
        this.selectedIds = [...nodeIds];
        this.update();
    }

    protected clearLayerPanel(): void {
        this.layerFilter = '';
        this.setSelection([]);
    }

    protected normalizedLayerFilter(): string {
        return this.layerFilter.trim().toLowerCase();
    }

    protected layerMatches(node: OpenPencilNode, filter: string): boolean {
        if (!filter) {
            return true;
        }
        return (node.name ?? '').toLowerCase().includes(filter)
            || node.id.toLowerCase().includes(filter)
            || node.type.toLowerCase().includes(filter);
    }

    protected hasMatchingLayer(nodes: OpenPencilNode[], filter: string): boolean {
        return nodes.some(node => this.layerMatches(node, filter) || this.hasMatchingLayer(node.children ?? [], filter));
    }

    protected collectLayerIds(nodes: OpenPencilNode[], filter: string): string[] {
        const ids: string[] = [];
        const visit = (items: OpenPencilNode[]) => {
            for (const item of items) {
                if (this.layerMatches(item, filter)) {
                    ids.push(item.id);
                }
                if (item.children) {
                    visit(item.children);
                }
            }
        };
        visit(nodes);
        return ids;
    }

    protected selectFromEvent(event: React.MouseEvent, nodeId: string): void {
        if (event.ctrlKey || event.metaKey || event.shiftKey) {
            const selected = new Set(this.selectedIds);
            if (selected.has(nodeId)) {
                selected.delete(nodeId);
            } else {
                selected.add(nodeId);
            }
            this.setSelection(Array.from(selected));
        } else {
            this.setSelection([nodeId]);
        }
    }

    protected getPrimarySelectedNode(): OpenPencilNode | undefined {
        const [nodeId] = this.selectedIds;
        return this.document && nodeId ? this.documents.findNode(this.document, nodeId) : undefined;
    }

    protected editableTextTargetsForSelection(): OpenPencilNode[] {
        if (!this.document || !this.selectedIds.length) {
            return [];
        }
        const seen = new Set<string>();
        const targets: OpenPencilNode[] = [];
        for (const nodeId of this.selectedIds) {
            const node = this.documents.findNode(this.document, nodeId);
            if (!node) {
                continue;
            }
            const textNodes = node.type === 'text' ? [node] : this.collectTextDescendants(node);
            for (const textNode of textNodes) {
                if (!seen.has(textNode.id)) {
                    seen.add(textNode.id);
                    targets.push(textNode);
                }
            }
        }
        return targets;
    }

    protected collectTextDescendants(node: OpenPencilNode): OpenPencilNode[] {
        const results: OpenPencilNode[] = [];
        const visit = (candidate: OpenPencilNode) => {
            for (const child of candidate.children ?? []) {
                if (child.type === 'text') {
                    results.push(child);
                }
                visit(child);
            }
        };
        visit(node);
        return results;
    }

    protected startDrag(event: React.MouseEvent<SVGElement>, node: OpenPencilNode): void {
        event.stopPropagation();
        if (event.button !== 0) {
            return;
        }
        if (event.ctrlKey || event.metaKey || event.shiftKey) {
            this.selectFromEvent(event, node.id);
            this.suppressNextNodeClick = true;
            return;
        }
        if (!this.selectedIds.includes(node.id)) {
            this.setSelection([node.id]);
        }
        if (node.locked) {
            return;
        }
        const nodes = this.selectedIds
            .map(nodeId => {
                const selectedNode = this.document ? this.documents.findNode(this.document, nodeId) : undefined;
                if (!selectedNode || selectedNode.locked) {
                    return undefined;
                }
                return {
                    nodeId,
                    startX: Number(selectedNode.x ?? 0),
                    startY: Number(selectedNode.y ?? 0)
                };
            })
            .filter((value): value is { nodeId: string; startX: number; startY: number } => !!value);
        if (!nodes.length) {
            return;
        }
        this.suppressNextNodeClick = false;
        this.captureUndoSnapshot();
        this.interactionState = {
            mode: 'move',
            nodeId: node.id,
            startClientX: event.clientX,
            startClientY: event.clientY,
            startX: Number(node.x ?? 0),
            startY: Number(node.y ?? 0),
            nodes
        };
    }

    protected startResize(event: React.MouseEvent<SVGElement>, nodeId: string, handle: ResizeHandle): void {
        event.stopPropagation();
        const node = this.document ? this.documents.findNode(this.document, nodeId) : undefined;
        if (!node || node.locked) {
            return;
        }
        this.setSelection([node.id]);
        this.captureUndoSnapshot();
        this.interactionState = {
            mode: 'resize',
            nodeId: node.id,
            handle,
            startClientX: event.clientX,
            startClientY: event.clientY,
            startX: Number(node.x ?? 0),
            startY: Number(node.y ?? 0),
            startWidth: Number(node.width ?? 160),
            startHeight: Number(node.height ?? (node.type === 'text' ? 40 : 120))
        };
    }

    protected startPathAnchorDrag(event: React.MouseEvent<SVGElement>, nodeId: string, anchorIndex: number): void {
        event.stopPropagation();
        const node = this.document ? this.documents.findNode(this.document, nodeId) : undefined;
        const anchor = node?.type === 'path' ? node.anchors?.[anchorIndex] : undefined;
        if (!node || !anchor || node.locked) {
            return;
        }
        this.setSelection([node.id]);
        this.captureUndoSnapshot();
        this.interactionState = {
            mode: 'path-anchor',
            nodeId: node.id,
            anchorIndex,
            startClientX: event.clientX,
            startClientY: event.clientY,
            startX: anchor.x,
            startY: anchor.y
        };
    }

    protected startPathHandleDrag(event: React.MouseEvent<SVGElement>, nodeId: string, anchorIndex: number, handle: OpenPencilPathHandleSide): void {
        event.stopPropagation();
        const node = this.document ? this.documents.findNode(this.document, nodeId) : undefined;
        const anchor = node?.type === 'path' ? node.anchors?.[anchorIndex] : undefined;
        const pathHandle = handle === 'in' ? anchor?.handleIn : anchor?.handleOut;
        if (!node || !anchor || !pathHandle || node.locked) {
            return;
        }
        this.setSelection([node.id]);
        this.captureUndoSnapshot();
        this.interactionState = {
            mode: 'path-anchor',
            nodeId: node.id,
            anchorIndex,
            handle,
            startClientX: event.clientX,
            startClientY: event.clientY,
            startX: pathHandle.x,
            startY: pathHandle.y
        };
    }

    protected startMarquee(event: React.MouseEvent<SVGSVGElement>, page: OpenPencilPage): void {
        if (event.button !== 0 || this.spacePressed) {
            return;
        }
        this.node.focus();
        const point = this.canvasPoint(event, page);
        this.interactionState = {
            mode: 'marquee',
            startX: point.x,
            startY: point.y,
            currentX: point.x,
            currentY: point.y,
            append: event.ctrlKey || event.metaKey || event.shiftKey
        };
    }

    protected startPan(event: React.MouseEvent<HTMLElement>): void {
        if (event.button !== 1 && !(event.button === 0 && this.spacePressed)) {
            return;
        }
        event.preventDefault();
        this.node.focus();
        this.interactionState = {
            mode: 'pan',
            startClientX: event.clientX,
            startClientY: event.clientY,
            startScrollLeft: event.currentTarget.scrollLeft,
            startScrollTop: event.currentTarget.scrollTop
        };
        this.update();
    }

    protected startPanelResize(event: React.PointerEvent<HTMLElement>, panel: PanelResizeState['panel']): void {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.setPointerCapture?.(event.pointerId);
        this.panelResizeState = {
            panel,
            startClientX: event.clientX,
            startWidth: panel === 'layers' ? this.layerPanelWidth : this.propertiesPanelWidth
        };
        document.body.classList.add('openpencil-panel-resizing');
    }

    protected onPanelResizeMove(event: MouseEvent): void {
        if (!this.panelResizeState) {
            return;
        }
        const delta = event.clientX - this.panelResizeState.startClientX;
        if (this.panelResizeState.panel === 'layers') {
            this.layerPanelWidth = this.clampPanelWidth(this.panelResizeState.startWidth + delta, 176, 360);
        } else {
            this.propertiesPanelWidth = this.clampPanelWidth(this.panelResizeState.startWidth - delta, 224, 420);
        }
        this.update();
    }

    protected finishPanelResize(): void {
        if (!this.panelResizeState) {
            return;
        }
        this.panelResizeState = undefined;
        document.body.classList.remove('openpencil-panel-resizing');
    }

    protected clampPanelWidth(width: number, min: number, max: number): number {
        return Math.min(max, Math.max(min, Math.round(width)));
    }

    protected onCanvasWrapMouseMove(event: React.MouseEvent<HTMLElement>): void {
        if (this.interactionState?.mode !== 'pan') {
            return;
        }
        event.currentTarget.scrollLeft = this.interactionState.startScrollLeft - (event.clientX - this.interactionState.startClientX);
        event.currentTarget.scrollTop = this.interactionState.startScrollTop - (event.clientY - this.interactionState.startClientY);
    }

    protected onCanvasWheel(event: React.WheelEvent<HTMLElement>): void {
        if (!event.ctrlKey && !event.metaKey) {
            return;
        }
        event.preventDefault();
        const wrap = event.currentTarget;
        const previousZoom = this.canvasZoom;
        const nextZoom = this.clampCanvasZoom(previousZoom + (event.deltaY < 0 ? 0.1 : -0.1));
        if (nextZoom === previousZoom) {
            return;
        }
        const rect = wrap.getBoundingClientRect();
        const cursorX = event.clientX - rect.left + wrap.scrollLeft;
        const cursorY = event.clientY - rect.top + wrap.scrollTop;
        const ratio = nextZoom / previousZoom;
        this.canvasZoom = nextZoom;
        this.update();
        requestAnimationFrame(() => {
            wrap.scrollLeft = cursorX * ratio - (event.clientX - rect.left);
            wrap.scrollTop = cursorY * ratio - (event.clientY - rect.top);
        });
    }

    protected onCanvasMouseMove(event: React.MouseEvent<SVGSVGElement>): void {
        if (!this.interactionState) {
            return;
        }
        const page = this.document ? this.documents.getActivePage(this.document) : undefined;
        if (this.interactionState.mode === 'pan') {
            return;
        }
        if (this.interactionState.mode === 'marquee') {
            if (page) {
                const point = this.canvasPoint(event, page);
                this.interactionState = {
                    ...this.interactionState,
                    currentX: point.x,
                    currentY: point.y
                };
                this.update();
            }
            return;
        }
        const dx = (event.clientX - this.interactionState.startClientX) / this.canvasZoom;
        const dy = (event.clientY - this.interactionState.startClientY) / this.canvasZoom;
        if (this.interactionState.mode === 'move') {
            if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
                this.suppressNextNodeClick = true;
            }
            const nodes = this.interactionState.nodes.length
                ? this.interactionState.nodes
                : [{
                    nodeId: this.interactionState.nodeId,
                    startX: this.interactionState.startX,
                    startY: this.interactionState.startY
                }];
            for (const item of nodes) {
                this.doApplyOperation({
                    operation: 'moveNode',
                    nodeId: item.nodeId,
                    x: this.snapCanvasValue(Math.round(item.startX + dx), page),
                    y: this.snapCanvasValue(Math.round(item.startY + dy), page)
                }, true);
            }
            return;
        }
        if (this.interactionState.mode === 'path-anchor') {
            const node = this.document ? this.documents.findNode(this.document, this.interactionState.nodeId) : undefined;
            const anchor = node?.anchors?.[this.interactionState.anchorIndex];
            if (!node || !anchor) {
                return;
            }
            const nextX = this.snapCanvasValue(Math.round(this.interactionState.startX + dx), page);
            const nextY = this.snapCanvasValue(Math.round(this.interactionState.startY + dy), page);
            if (this.interactionState.handle) {
                this.doApplyOperation({
                    operation: 'updatePathHandle',
                    nodeId: this.interactionState.nodeId,
                    anchorIndex: this.interactionState.anchorIndex,
                    handle: this.interactionState.handle,
                    value: { x: nextX, y: nextY },
                    mirror: event.shiftKey,
                    closed: node.closed
                }, true);
                return;
            }
            this.doApplyOperation({
                operation: 'updatePathAnchor',
                nodeId: this.interactionState.nodeId,
                anchorIndex: this.interactionState.anchorIndex,
                anchor: {
                    ...anchor,
                    x: nextX,
                    y: nextY
                },
                closed: node?.closed
            }, true);
            return;
        }
        const resized = this.resizedBounds(this.interactionState, dx, dy, page);
        this.doApplyOperation({
            operation: 'resizeNode',
            nodeId: this.interactionState.nodeId,
            ...resized
        }, true);
    }

    protected resizedBounds(state: ResizeState, dx: number, dy: number, page: OpenPencilPage | undefined): { x: number; y: number; width: number; height: number } {
        const minSize = 8;
        const startRight = state.startX + state.startWidth;
        const startBottom = state.startY + state.startHeight;
        let x = state.startX;
        let y = state.startY;
        let width = state.startWidth;
        let height = state.startHeight;
        if (state.handle.includes('w')) {
            x = this.snapCanvasValue(Math.round(state.startX + dx), page);
            width = startRight - x;
            if (width < minSize) {
                width = minSize;
                x = startRight - minSize;
            }
        }
        if (state.handle.includes('e')) {
            width = this.snapCanvasValue(Math.round(state.startWidth + dx), page);
        }
        if (state.handle.includes('n')) {
            y = this.snapCanvasValue(Math.round(state.startY + dy), page);
            height = startBottom - y;
            if (height < minSize) {
                height = minSize;
                y = startBottom - minSize;
            }
        }
        if (state.handle.includes('s')) {
            height = this.snapCanvasValue(Math.round(state.startHeight + dy), page);
        }
        return {
            x,
            y,
            width: Math.max(minSize, Math.round(width)),
            height: Math.max(minSize, Math.round(height))
        };
    }

    protected finishInteraction(): void {
        if (this.interactionState?.mode === 'marquee') {
            const state = this.interactionState;
            const page = this.document ? this.documents.getActivePage(this.document) : undefined;
            const selected = page ? this.nodesInMarquee(page, state) : [];
            this.interactionState = undefined;
            if (state.append) {
                this.setSelection(Array.from(new Set([...this.selectedIds, ...selected])));
            } else {
                this.setSelection(selected);
            }
            return;
        }
        const wasPanning = this.interactionState?.mode === 'pan';
        const wasDocumentInteraction = this.interactionState?.mode === 'move' || this.interactionState?.mode === 'resize' || this.interactionState?.mode === 'path-anchor';
        this.interactionState = undefined;
        if (wasDocumentInteraction) {
            this.discardUnchangedUndoSnapshot();
            this.update();
        }
        if (wasPanning) {
            this.update();
        }
    }

    protected undo(): void {
        if (!this.document || !this.undoStack.length) {
            return;
        }
        const snapshot = this.undoStack.pop();
        if (!snapshot) {
            return;
        }
        this.redoStack.push(this.createSnapshot());
        this.restoreSnapshot(snapshot);
        this.updateDirtyState(true);
        this.update();
    }

    protected redo(): void {
        if (!this.document || !this.redoStack.length) {
            return;
        }
        const snapshot = this.redoStack.pop();
        if (!snapshot) {
            return;
        }
        this.undoStack.push(this.createSnapshot());
        this.restoreSnapshot(snapshot);
        this.updateDirtyState(true);
        this.update();
    }

    protected applyDocument(next: OpenPencilDocument, selection: string[]): void {
        const nextSerialized = this.documents.serialize(next);
        if (this.document && nextSerialized === this.documents.serialize(this.document)) {
            this.selectedIds = this.filterSelection(selection, next);
            this.update();
            return;
        }
        this.captureUndoSnapshot();
        this.document = next;
        this.selectedIds = this.filterSelection(selection, next);
        this.updateDirtyState(true);
        this.update();
    }

    protected applyRuntimeDocument(next: OpenPencilDocument): void {
        if (!this.document || next === this.document) {
            return;
        }
        const currentSerialized = this.documents.serialize(this.document);
        const nextSerialized = this.documents.serialize(next);
        if (currentSerialized === nextSerialized) {
            return;
        }
        const normalized = this.documents.deserialize(nextSerialized);
        this.captureUndoSnapshot();
        this.document = normalized;
        this.selectedIds = this.filterSelection(this.selectedIds, normalized);
        this.updateDirtyState(true);
        this.update();
    }

    protected captureUndoSnapshot(): void {
        if (this.document) {
            const snapshot = this.createSnapshot();
            const previous = this.undoStack[this.undoStack.length - 1];
            if (previous?.serialized === snapshot.serialized && this.sameSelection(previous.selection, snapshot.selection)) {
                return;
            }
            this.undoStack.push(snapshot);
            this.redoStack = [];
        }
    }

    protected discardUnchangedUndoSnapshot(): void {
        if (!this.document) {
            return;
        }
        const previous = this.undoStack[this.undoStack.length - 1];
        if (previous?.serialized === this.documents.serialize(this.document)) {
            this.undoStack.pop();
        }
    }

    protected createSnapshot(): OpenPencilDocumentStateSnapshot {
        if (!this.document) {
            throw new Error('Canvas document is not loaded.');
        }
        return {
            document: this.documents.cloneDocument(this.document),
            selection: [...this.selectedIds],
            serialized: this.documents.serialize(this.document)
        };
    }

    protected restoreSnapshot(snapshot: OpenPencilDocumentStateSnapshot): void {
        const document = this.documents.cloneDocument(snapshot.document);
        this.document = document;
        this.selectedIds = this.filterSelection(snapshot.selection, document);
    }

    protected progressiveApplyFailure(applied: number, total: number, changed: boolean, message: string): OpenPencilProgressiveApplyResult {
        if (!this.document) {
            throw new Error('Canvas document is not loaded.');
        }
        return {
            document: this.document,
            selection: [...this.selectedIds],
            changed,
            message: `Operation ${applied + 1}/${total} failed: ${message}`,
            applied,
            total,
            completed: false
        };
    }

    protected async waitForProgressiveApplyFrame(delayMs: number): Promise<void> {
        await new Promise<void>(resolve => {
            requestAnimationFrame(() => {
                if (delayMs > 0) {
                    setTimeout(resolve, delayMs);
                } else {
                    resolve();
                }
            });
        });
    }

    protected filterSelection(selection: string[], document: OpenPencilDocument): string[] {
        return selection.filter(id => !!this.documents.findNode(document, id));
    }

    protected sameSelection(left: string[], right: string[]): boolean {
        return left.length === right.length && left.every((id, index) => id === right[index]);
    }

    protected updateDirtyState(contentChanged = false): void {
        if (!this.document || this.lastSavedContent === undefined) {
            this.setDirty(!!this.document, contentChanged);
            return;
        }
        this.setDirty(this.documents.serialize(this.document) !== this.lastSavedContent, contentChanged);
    }

    protected handleKeyDown(event: KeyboardEvent): void {
        if (event.defaultPrevented) {
            return;
        }
        if (event.code === 'Space' && !this.isTextInputTarget(event.target)) {
            event.preventDefault();
            if (!this.spacePressed) {
                this.spacePressed = true;
                this.update();
            }
        }
        const commandKey = event.ctrlKey || event.metaKey;
        const key = event.key.toLowerCase();
        if (this.isTextInputTarget(event.target)) {
            if (commandKey && key === 's') {
                event.preventDefault();
                this.save();
            }
            return;
        }
        if (commandKey && key === 's') {
            event.preventDefault();
            this.save();
        } else if (commandKey && key === 'c') {
            event.preventDefault();
            this.copySelection();
        } else if (commandKey && key === 'v') {
            event.preventDefault();
            this.pasteClipboard();
        } else if (commandKey && key === 'd') {
            event.preventDefault();
            this.duplicateSelection();
        } else if (commandKey && key === 'z' && event.shiftKey) {
            event.preventDefault();
            this.redo();
        } else if (commandKey && key === 'z') {
            event.preventDefault();
            this.undo();
        } else if (commandKey && key === 'y') {
            event.preventDefault();
            this.redo();
        } else if (commandKey && event.shiftKey && event.key === ']') {
            event.preventDefault();
            this.bringToFront();
        } else if (commandKey && event.shiftKey && event.key === '[') {
            event.preventDefault();
            this.sendToBack();
        } else if (commandKey && event.key === ']') {
            event.preventDefault();
            this.bringForward();
        } else if (commandKey && event.key === '[') {
            event.preventDefault();
            this.sendBackward();
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault();
            const amount = event.shiftKey ? 10 : 1;
            const dx = event.key === 'ArrowLeft' ? -amount : event.key === 'ArrowRight' ? amount : 0;
            const dy = event.key === 'ArrowUp' ? -amount : event.key === 'ArrowDown' ? amount : 0;
            this.nudgeSelection(dx, dy);
        } else if (event.key === 'Delete' || event.key === 'Backspace') {
            event.preventDefault();
            this.deleteSelection();
        }
    }

    protected handleKeyUp(event: KeyboardEvent): void {
        if (event.code === 'Space') {
            this.spacePressed = false;
            this.update();
        }
    }

    protected setDirty(dirty: boolean, contentChanged = false): void {
        if (this.dirty !== dirty) {
            this.dirty = dirty;
            this.onDirtyChangedEmitter.fire();
        }
        if (dirty || contentChanged) {
            this.onContentChangedEmitter.fire();
        }
    }

    protected numberValue(value: number | string | undefined, fallback: number): number {
        const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
        return Number.isFinite(parsed) ? parsed : fallback;
    }

    protected opacityValue(node: OpenPencilNode): number {
        return Math.max(0, Math.min(1, this.numberValue(node.opacity, 1)));
    }

    protected cornerRadiusValue(node: OpenPencilNode): number {
        return Array.isArray(node.cornerRadius) ? node.cornerRadius[0] ?? 0 : this.numberValue(node.cornerRadius, 0);
    }

    protected supportsCornerRadius(node: OpenPencilNode): boolean {
        return node.type === 'frame' || node.type === 'group' || node.type === 'rectangle' || node.type === 'icon_font' || node.type === 'ref';
    }

    protected rotationTransform(node: OpenPencilNode, x: number, y: number, width: number, height: number): string | undefined {
        const rotation = this.numberValue(node.rotation, 0);
        return rotation ? `rotate(${rotation} ${x + width / 2} ${y + height / 2})` : undefined;
    }

    protected textAnchor(textAlign: OpenPencilNode['textAlign']): 'start' | 'middle' | 'end' {
        if (textAlign === 'center') {
            return 'middle';
        }
        if (textAlign === 'right') {
            return 'end';
        }
        return 'start';
    }

    protected textX(x: number, width: number, textAlign: OpenPencilNode['textAlign']): number {
        if (textAlign === 'center') {
            return x + width / 2;
        }
        if (textAlign === 'right') {
            return x + width;
        }
        return x;
    }

    protected polygonPoints(node: OpenPencilNode, x: number, y: number, width: number, height: number): string {
        const points = node.points?.length ? node.points : [
            { x: width / 2, y: 0 },
            { x: width, y: height },
            { x: 0, y: height }
        ];
        return points.map(point => `${x + point.x},${y + point.y}`).join(' ');
    }

    protected renderMarquee(): React.ReactNode {
        if (this.interactionState?.mode !== 'marquee') {
            return undefined;
        }
        const rect = this.marqueeRect(this.interactionState);
        if (rect.width < 2 && rect.height < 2) {
            return undefined;
        }
        return <rect
            x={rect.x}
            y={rect.y}
            width={rect.width}
            height={rect.height}
            className='openpencil-marquee'
        />;
    }

    protected canvasPoint(event: React.MouseEvent<SVGSVGElement>, page: OpenPencilPage): { x: number; y: number } {
        const bounds = event.currentTarget.getBoundingClientRect();
        const width = page.width ?? 900;
        const height = page.height ?? 620;
        const x = bounds.width > 0 ? ((event.clientX - bounds.left) / bounds.width) * width : 0;
        const y = bounds.height > 0 ? ((event.clientY - bounds.top) / bounds.height) * height : 0;
        return {
            x: Math.round(x),
            y: Math.round(y)
        };
    }

    protected marqueeRect(state: MarqueeState): { x: number; y: number; width: number; height: number } {
        const x = Math.min(state.startX, state.currentX);
        const y = Math.min(state.startY, state.currentY);
        return {
            x,
            y,
            width: Math.abs(state.currentX - state.startX),
            height: Math.abs(state.currentY - state.startY)
        };
    }

    protected nodesInMarquee(page: OpenPencilPage, state: MarqueeState): string[] {
        const marquee = this.marqueeRect(state);
        if (marquee.width < 2 && marquee.height < 2) {
            return [];
        }
        const selected: string[] = [];
        const visit = (nodes: OpenPencilNode[], offsetX = 0, offsetY = 0) => {
            for (const node of nodes) {
                if (node.visible === false) {
                    continue;
                }
                const x = offsetX + this.numberValue(node.x, 0);
                const y = offsetY + this.numberValue(node.y, 0);
                const width = Math.max(1, Math.abs(this.numberValue(node.width, 160)));
                const height = Math.max(1, Math.abs(this.numberValue(node.height, node.type === 'text' ? 40 : 120)));
                if (this.rectsIntersect(marquee, { x, y, width, height })) {
                    selected.push(node.id);
                }
                if (node.children) {
                    visit(node.children, x, y);
                }
            }
        };
        visit(page.children);
        return selected;
    }

    protected rectsIntersect(left: { x: number; y: number; width: number; height: number }, right: { x: number; y: number; width: number; height: number }): boolean {
        return left.x <= right.x + right.width
            && left.x + left.width >= right.x
            && left.y <= right.y + right.height
            && left.y + left.height >= right.y;
    }

    protected fitPage(): void {
        if (!this.document) {
            return;
        }
        const page = this.documents.getActivePage(this.document);
        this.fitBounds({
            x: 0,
            y: 0,
            width: page.width ?? 900,
            height: page.height ?? 620
        });
    }

    protected fitSelection(): void {
        if (!this.document || !this.selectedIds.length) {
            return;
        }
        const page = this.documents.getActivePage(this.document);
        const bounds = this.selectionBounds(page);
        if (bounds) {
            this.fitBounds(bounds);
        }
    }

    protected fitBounds(bounds: { x: number; y: number; width: number; height: number }): void {
        const wrap = this.canvasWrapRef.current;
        if (!wrap) {
            return;
        }
        const padding = 48;
        const availableWidth = Math.max(1, wrap.clientWidth - padding * 2);
        const availableHeight = Math.max(1, wrap.clientHeight - padding * 2);
        const nextZoom = this.clampCanvasZoom(Math.min(availableWidth / Math.max(1, bounds.width), availableHeight / Math.max(1, bounds.height)));
        this.canvasZoom = nextZoom;
        this.update();
        requestAnimationFrame(() => {
            wrap.scrollLeft = Math.max(0, bounds.x * nextZoom - padding);
            wrap.scrollTop = Math.max(0, bounds.y * nextZoom - padding);
        });
    }

    protected selectionBounds(page: OpenPencilPage): { x: number; y: number; width: number; height: number } | undefined {
        const selected = new Set(this.selectedIds);
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        const visit = (nodes: OpenPencilNode[], offsetX = 0, offsetY = 0) => {
            for (const node of nodes) {
                const x = offsetX + this.numberValue(node.x, 0);
                const y = offsetY + this.numberValue(node.y, 0);
                const width = Math.max(1, Math.abs(this.numberValue(node.width, 160)));
                const height = Math.max(1, Math.abs(this.numberValue(node.height, node.type === 'text' ? 40 : 120)));
                if (selected.has(node.id)) {
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x + width);
                    maxY = Math.max(maxY, y + height);
                }
                if (node.children) {
                    visit(node.children, x, y);
                }
            }
        };
        visit(page.children);
        return Number.isFinite(minX) ? { x: minX, y: minY, width: maxX - minX, height: maxY - minY } : undefined;
    }

    protected selectionStatusLabel(page: OpenPencilPage): string {
        if (!this.selectedIds.length) {
            return 'No selection';
        }
        const bounds = this.selectionBounds(page);
        const primary = this.selectedIds[0] && this.document ? this.documents.findNode(this.document, this.selectedIds[0]) : undefined;
        const name = primary?.name ?? primary?.type ?? this.selectedIds[0];
        const geometry = bounds
            ? `X ${Math.round(bounds.x)} Y ${Math.round(bounds.y)} / W ${Math.round(bounds.width)} H ${Math.round(bounds.height)}`
            : this.selectedIds.join(', ');
        return `${this.selectedIds.length} selected: ${name} (${geometry})`;
    }

    protected nodeTextContent(node: OpenPencilNode): string {
        const content = node.content;
        if (Array.isArray(content)) {
            return content.map(segment => segment.text).join('');
        }
        return content ?? '';
    }

    protected parsePoints(value: string, fallback: OpenPencilNode['points']): OpenPencilNode['points'] {
        try {
            const parsed = JSON.parse(value) as unknown;
            if (Array.isArray(parsed) && parsed.every(point => typeof point?.x === 'number' && typeof point?.y === 'number')) {
                return parsed;
            }
        } catch {
            // Keep the previous value while the user is editing invalid JSON.
        }
        return fallback;
    }

    protected parsePathAnchors(value: string, fallback: OpenPencilPathAnchor[] | undefined): OpenPencilPathAnchor[] {
        try {
            const parsed = JSON.parse(value) as unknown;
            if (Array.isArray(parsed)) {
                return parsed
                    .filter(anchor => typeof anchor?.x === 'number' && typeof anchor?.y === 'number')
                    .map(anchor => ({
                        x: anchor.x,
                        y: anchor.y,
                        handleIn: this.parsePathHandle(anchor.handleIn),
                        handleOut: this.parsePathHandle(anchor.handleOut)
                    }));
            }
        } catch {
            // Keep the previous value while the user is editing invalid JSON.
        }
        return fallback ?? [];
    }

    protected parsePathHandle(value: unknown): { x: number; y: number } | null {
        if (!value || typeof value !== 'object') {
            return null;
        }
        const handle = value as { x?: unknown; y?: unknown };
        return typeof handle.x === 'number' && typeof handle.y === 'number'
            ? { x: handle.x, y: handle.y }
            : null;
    }

    protected parseEffects(value: string, fallback: OpenPencilNode['effects']): OpenPencilNode['effects'] {
        try {
            const parsed = JSON.parse(value) as unknown;
            if (Array.isArray(parsed) && parsed.every(effect => typeof effect === 'object' && effect !== null && 'type' in effect)) {
                return parsed as OpenPencilNode['effects'];
            }
        } catch {
            // Keep the previous value while the user is editing invalid JSON.
        }
        return fallback;
    }

    protected parseSpacingValue(value: string): number | string {
        const trimmed = value.trim();
        if (!trimmed) {
            return '';
        }
        const parsed = Number(trimmed);
        return Number.isFinite(parsed) ? parsed : trimmed;
    }

    protected spacingValue(value: OpenPencilNode['padding']): string {
        return Array.isArray(value) ? JSON.stringify(value) : value === undefined ? '' : String(value);
    }

    protected colorInputValue(value: string | undefined, fallback: string): string {
        const candidate = value ?? fallback;
        return /^#[0-9a-f]{6}$/i.test(candidate) ? candidate : fallback;
    }

    protected nudgeSelection(dx: number, dy: number): void {
        if (this.selectedIds.length) {
            this.applyOperation({ operation: 'nudgeNodes', nodeIds: this.selectedIds, dx, dy });
        }
    }

    protected pageGridSize(page: OpenPencilPage | undefined): number {
        return Math.max(2, Math.round(page?.gridSize ?? 20));
    }

    protected snapCanvasValue(value: number, page: OpenPencilPage | undefined): number {
        if (!page?.snapToGrid) {
            return value;
        }
        const gridSize = this.pageGridSize(page);
        return Math.round(value / gridSize) * gridSize;
    }

    protected gridPatternId(page: OpenPencilPage): string {
        return `openpencil-grid-${page.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
    }

    protected cloneNodeForPaste(node: OpenPencilNode, offset: number): OpenPencilNode {
        const clone = this.clonePlainNode(node);
        const assign = (item: OpenPencilNode) => {
            item.id = this.documents.generateId(item.type);
            item.name = item.name ? `${item.name} copy` : undefined;
            item.children?.forEach(assign);
        };
        assign(clone);
        clone.x = this.numberValue(clone.x, 0) + offset;
        clone.y = this.numberValue(clone.y, 0) + offset;
        return clone;
    }

    protected clonePlainNode(node: OpenPencilNode): OpenPencilNode {
        return JSON.parse(JSON.stringify(node)) as OpenPencilNode;
    }

    protected isTextInputTarget(target: EventTarget | null): boolean {
        return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
    }

    protected setCanvasZoom(zoom: number): void {
        this.canvasZoom = this.clampCanvasZoom(zoom);
        this.update();
    }

    protected clampCanvasZoom(zoom: number): number {
        return Math.max(0.25, Math.min(3, Math.round(zoom * 10) / 10));
    }
}

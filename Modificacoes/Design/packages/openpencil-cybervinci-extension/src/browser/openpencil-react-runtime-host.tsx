import * as React from '@theia/core/shared/react';
import { ChevronDown, Folder, Layers } from 'lucide-react';
import {
    fromOpenPencilRuntimeSelectionChange,
    fromOpenPencilRuntimeDocument,
    OpenPencilRuntimeInteractionEvent,
    OpenPencilRuntimeDocument,
    OpenPencilRuntimeNode,
    OpenPencilRuntimeSelectionState,
    toOpenPencilRuntimeDocument,
    toOpenPencilRuntimeInteractionEvent,
    toOpenPencilRuntimeSelectionState
} from '../common/openpencil-runtime-adapter';
import { OpenPencilDocument, OpenPencilPage } from '../common/openpencil-types';

type OpenPencilReactComponent<P = {}> = React.ComponentType<P> | React.ExoticComponent<P>;

interface OpenPencilRuntimeEngine {
    readonly zoom?: number;
    readonly panX?: number;
    readonly panY?: number;
    getDocument?: () => OpenPencilRuntimeDocument;
    getActivePage?: () => string;
    getSelection?: () => string[];
    getNodeById?: (id: string) => OpenPencilRuntimeNode | undefined;
    getParentOf?: (id: string) => OpenPencilRuntimeNode | undefined;
    select?: (ids: string[]) => void;
    setActivePage?: (pageId: string) => void;
    setViewport?: (zoom: number, panX: number, panY: number) => void;
    setZoom?: (zoom: number) => void;
    on?: (event: string, callback: (...args: unknown[]) => void) => (() => void) | void;
}

export interface OpenPencilPenReactRuntime {
    readonly DesignProvider: OpenPencilReactComponent<{
        children?: React.ReactNode;
        document?: OpenPencilRuntimeDocument;
        initialDocument?: OpenPencilRuntimeDocument;
        onDocumentChange?: (document: OpenPencilRuntimeDocument) => void;
        options?: Record<string, unknown>;
    }>;
    readonly DesignCanvas: React.ComponentType<{
        className?: string;
        canvasKitPath?: string | ((file: string) => string);
        loadingFallback?: React.ReactNode;
        onReady?: (engine: unknown) => void;
    }>;
    readonly CoreToolbar: OpenPencilReactComponent<{
        trailing?: React.ReactNode;
        shapeTrailing?: React.ReactNode;
        className?: string;
    }>;
    readonly LayerPanel: OpenPencilReactComponent;
    readonly PropertyPanel: OpenPencilReactComponent<{
        embedded?: boolean;
    }>;
    readonly BooleanToolbar?: OpenPencilReactComponent;
    readonly StatusBar?: OpenPencilReactComponent<{
        className?: string;
    }>;
    readonly useDesignEngine?: () => OpenPencilRuntimeEngine;
    readonly useSelection?: () => string[];
    readonly useViewport?: () => { zoom: number; panX: number; panY: number };
    readonly runtimeName?: string;
}

export interface OpenPencilReactRuntimeHostProps {
    readonly document: OpenPencilDocument;
    readonly page: OpenPencilPage;
    readonly zoom: number;
    readonly selectedIds?: readonly string[];
    readonly dirty?: boolean;
    readonly resourceName?: string;
    readonly fallback: React.ReactNode;
    readonly toolbarTrailing?: React.ReactNode;
    readonly canvasToolbarTrailing?: React.ReactNode;
    readonly onDocumentChange: (document: OpenPencilDocument) => void;
    readonly onSelectionChange?: (selectedIds: string[]) => void;
    readonly onCanvasInteraction?: (event: OpenPencilRuntimeInteractionEvent) => void;
}

interface OpenPencilRuntimeBoundaryProps {
    readonly children?: React.ReactNode;
    readonly fallback: React.ReactNode;
    readonly runtimeName: string;
}

interface OpenPencilRuntimeBoundaryState {
    readonly failed: boolean;
}

declare global {
    interface Window {
        openPencilPenReactRuntime?: OpenPencilPenReactRuntime;
        __OPENPENCIL_PEN_REACT__?: OpenPencilPenReactRuntime;
        __OPENPENCIL_RUNTIME_ENGINE__?: OpenPencilRuntimeEngine;
        __OPENPENCIL_EXPOSE_RUNTIME_ENGINE__?: boolean;
    }
}

const bundledPenReactModule = require('@zseven-w/pen-react') as Partial<OpenPencilPenReactRuntime>;
const canvasKitWasmUrl = require('canvaskit-wasm/bin/canvaskit.wasm') as string;
const bundledPenReactRuntime: OpenPencilPenReactRuntime | undefined =
    isCompletePenReactRuntime(bundledPenReactModule)
        ? {
            DesignProvider: bundledPenReactModule.DesignProvider,
            DesignCanvas: bundledPenReactModule.DesignCanvas,
            CoreToolbar: bundledPenReactModule.CoreToolbar,
            LayerPanel: bundledPenReactModule.LayerPanel,
            PropertyPanel: bundledPenReactModule.PropertyPanel,
            BooleanToolbar: bundledPenReactModule.BooleanToolbar,
            StatusBar: bundledPenReactModule.StatusBar,
            useDesignEngine: bundledPenReactModule.useDesignEngine,
            useSelection: bundledPenReactModule.useSelection,
            useViewport: bundledPenReactModule.useViewport,
            runtimeName: '@zseven-w/pen-react'
        }
        : undefined;

class OpenPencilRuntimeBoundary extends React.Component<OpenPencilRuntimeBoundaryProps, OpenPencilRuntimeBoundaryState> {

    override state: OpenPencilRuntimeBoundaryState = { failed: false };

    static getDerivedStateFromError(): OpenPencilRuntimeBoundaryState {
        return { failed: true };
    }

    override componentDidCatch(error: Error): void {
        console.warn(`OpenPencil ${this.props.runtimeName} runtime failed; using local fallback.`, error);
    }

    override componentDidUpdate(previous: OpenPencilRuntimeBoundaryProps): void {
        if (this.state.failed && previous.runtimeName !== this.props.runtimeName) {
            this.setState({ failed: false });
        }
    }

    override render(): React.ReactNode {
        if (this.state.failed) {
            return <>{this.props.fallback}</>;
        }
        return this.props.children;
    }
}

export function OpenPencilReactRuntimeHost({
    document,
    page,
    zoom,
    selectedIds = [],
    fallback,
    toolbarTrailing,
    canvasToolbarTrailing,
    onDocumentChange,
    onSelectionChange,
    onCanvasInteraction,
    dirty = false,
    resourceName
}: OpenPencilReactRuntimeHostProps): React.ReactElement {
    const runtime = resolveOpenPencilPenReactRuntime();
    if (!runtime) {
        return <>{fallback}</>;
    }
    const { BooleanToolbar, CoreToolbar, DesignCanvas, DesignProvider, LayerPanel, PropertyPanel, StatusBar, useDesignEngine, useSelection, useViewport } = runtime;
    const runtimeDocument = React.useMemo(() => toOpenPencilRuntimeDocument(document, page.id), [document, page.id]);
    const runtimeDocumentRef = React.useRef(runtimeDocument);
    const runtimeEngineRef = React.useRef<OpenPencilRuntimeEngine | undefined>();
    const runtimeDisposablesRef = React.useRef<Array<() => void>>([]);
    const runtimeSelection = React.useMemo(() => toOpenPencilRuntimeSelectionState(selectedIds, {
        activeId: selectedIds[0] ?? null,
        document: runtimeDocument
    }), [runtimeDocument, selectedIds]);
    runtimeDocumentRef.current = runtimeDocument;
    const handleRuntimeDocumentChange = React.useCallback((next: OpenPencilRuntimeDocument) => {
        const activePageId = resolveRuntimeActivePageId(runtimeEngineRef.current, next, page.id);
        onDocumentChange(fromOpenPencilRuntimeDocument(next, activePageId, document));
    }, [document, onDocumentChange, page.id]);
    const handleRuntimePageChange = React.useCallback((pageId: string) => {
        const runtimeDocument = runtimeEngineRef.current?.getDocument?.() ?? runtimeDocumentRef.current;
        onSelectionChange?.([]);
        onCanvasInteraction?.(toOpenPencilRuntimeInteractionEvent('selection', []));
        onDocumentChange(fromOpenPencilRuntimeDocument(runtimeDocument, pageId, document));
    }, [document, onCanvasInteraction, onDocumentChange, onSelectionChange]);
    const emitRuntimeSelection = React.useCallback((selection: unknown) => {
        const nextSelection = fromOpenPencilRuntimeSelectionChange(
            normalizeRuntimeSelectionPayload(selection),
            runtimeDocumentRef.current
        );
        onSelectionChange?.(nextSelection);
        onCanvasInteraction?.(toOpenPencilRuntimeInteractionEvent('selection', nextSelection));
    }, [onCanvasInteraction, onSelectionChange]);
    const handleCanvasReady = React.useCallback((engine: unknown) => {
        const runtimeEngine = engine as OpenPencilRuntimeEngine;
        ensureRuntimeEngineCompatibility(runtimeEngine);
        runtimeEngineRef.current = runtimeEngine;
        if (shouldExposeRuntimeEngine()) {
            window.__OPENPENCIL_RUNTIME_ENGINE__ = runtimeEngine;
        }
        disposeRuntimeSubscriptions(runtimeDisposablesRef.current);
        syncRuntimeActivePage(runtimeEngine, page.id);
        runtimeDisposablesRef.current = subscribeRuntimeEngine(runtimeEngine, {
            onSelectionChange: emitRuntimeSelection,
            onActivePageChange: handleRuntimePageChange,
            onCanvasInteraction
        });
        syncRuntimeSelection(runtimeEngine, runtimeSelection);
        syncRuntimeZoom(runtimeEngine, zoom);
        onCanvasInteraction?.(toOpenPencilRuntimeInteractionEvent('viewport', {
            zoom: runtimeEngine.zoom,
            panX: runtimeEngine.panX,
            panY: runtimeEngine.panY
        }));
    }, [emitRuntimeSelection, handleRuntimePageChange, onCanvasInteraction, page.id, runtimeSelection, zoom]);
    React.useEffect(() => () => {
        disposeRuntimeSubscriptions(runtimeDisposablesRef.current);
        if (window.__OPENPENCIL_RUNTIME_ENGINE__ === runtimeEngineRef.current) {
            delete window.__OPENPENCIL_RUNTIME_ENGINE__;
        }
    }, []);
    React.useEffect(() => {
        if (runtimeEngineRef.current) {
            syncRuntimeActivePage(runtimeEngineRef.current, page.id);
        }
    }, [page.id]);
    React.useEffect(() => {
        if (runtimeEngineRef.current) {
            syncRuntimeSelection(runtimeEngineRef.current, runtimeSelection);
        }
    }, [runtimeSelection]);
    React.useEffect(() => {
        if (runtimeEngineRef.current) {
            syncRuntimeZoom(runtimeEngineRef.current, zoom);
        }
    }, [zoom]);
    const runtimeName = runtime.runtimeName ?? 'pen-react';
    return <OpenPencilRuntimeBoundary fallback={fallback} runtimeName={runtimeName}>
        <div
            className='openpencil-sdk-shell'
            data-openpencil-runtime={runtimeName}>
            <DesignProvider document={runtimeDocument} onDocumentChange={handleRuntimeDocumentChange}>
                <div className='openpencil-sdk-app'>
                    <header className='openpencil-sdk-topbar'>
                        <div className='openpencil-sdk-topbar-left'>
                            <button type='button' title='Layers panel'>
                                <Layers size={15} strokeWidth={1.5} />
                            </button>
                            <span />
                            <button type='button' title='File menu'>
                                <Folder size={15} strokeWidth={1.5} />
                                <ChevronDown size={10} strokeWidth={1.5} />
                            </button>
                        </div>
                        <div className='openpencil-sdk-topbar-title'>
                            <span>{resourceName ?? document.name ?? 'OpenPencil'}</span>
                            {dirty ? <small>Edited</small> : undefined}
                            <small>{page.name}</small>
                        </div>
                        <div className='openpencil-sdk-topbar-actions'>
                            {toolbarTrailing}
                        </div>
                    </header>
                    <div className='openpencil-sdk-workspace'>
                        <LayerPanel />
                        <main className='openpencil-sdk-stage'>
                            <CoreToolbar className='openpencil-sdk-toolbar' trailing={canvasToolbarTrailing} />
                            {BooleanToolbar ? <BooleanToolbar /> : undefined}
                            <DesignCanvas
                                className='openpencil-sdk-canvas openpencil-runtime-canvas'
                                canvasKitPath={resolveCanvasKitFile}
                                loadingFallback={<div className='openpencil-runtime-loading'>Loading canvas...</div>}
                                onReady={handleCanvasReady}
                            />
                            <div className='openpencil-sdk-status-cluster'>
                                <div className='openpencil-sdk-status-detail-wrap'>
                                    {useDesignEngine && useSelection && useViewport
                                        ? <OpenPencilRuntimeStatusDetails
                                            dirty={dirty}
                                            fallbackPage={page}
                                            resourceName={resourceName}
                                            useDesignEngine={useDesignEngine}
                                            useSelection={useSelection}
                                            useViewport={useViewport}
                                        />
                                        : <OpenPencilRuntimeStatusFallback dirty={dirty} page={page} resourceName={resourceName} selectedIds={selectedIds} zoom={zoom} />}
                                </div>
                                {StatusBar ? <StatusBar className='openpencil-sdk-status' /> : undefined}
                            </div>
                        </main>
                        <PropertyPanel />
                    </div>
                </div>
            </DesignProvider>
        </div>
    </OpenPencilRuntimeBoundary>;
}

export function resolveOpenPencilPenReactRuntime(): OpenPencilPenReactRuntime | undefined {
    if (typeof window !== 'undefined') {
        const candidate = window.openPencilPenReactRuntime ?? window.__OPENPENCIL_PEN_REACT__;
        if (candidate && isCompletePenReactRuntime(candidate)) {
            return candidate;
        }
    }
    return resolveBundledPenReactRuntime();
}

function OpenPencilRuntimeStatusDetails({
    dirty,
    fallbackPage,
    resourceName,
    useDesignEngine,
    useSelection,
    useViewport
}: {
    readonly dirty: boolean;
    readonly fallbackPage: OpenPencilPage;
    readonly resourceName?: string;
    readonly useDesignEngine: () => OpenPencilRuntimeEngine;
    readonly useSelection: () => string[];
    readonly useViewport: () => { zoom: number; panX: number; panY: number };
}): React.ReactElement {
    const engine = useDesignEngine();
    const selectedIds = useSelection();
    const viewport = useViewport();
    const activePageId = engine.getActivePage?.() ?? fallbackPage.id;
    const document = engine.getDocument?.();
    const activePage = document?.pages?.find(candidate => candidate.id === activePageId);
    const selectedNodes = selectedIds.map(id => engine.getNodeById?.(id)).filter((node): node is OpenPencilRuntimeNode => !!node);
    const primary = selectedNodes[0];
    const selectionLabel = selectedIds.length
        ? `${selectedIds.length} selected${primary ? `: ${primary.name ?? primary.type}` : ''}`
        : 'No selection';
    const geometry = primary ? formatRuntimeNodeGeometry(primary) : undefined;
    return <div className='openpencil-sdk-status-detail' title={selectedIds.join(', ')}>
        <span>{resourceName ?? document?.name ?? 'OpenPencil'}</span>
        <span>{activePage?.name ?? fallbackPage.name}</span>
        <span>{selectionLabel}</span>
        {geometry ? <span>{geometry}</span> : undefined}
        <span>{Math.round(viewport.zoom * 100)}%</span>
        <span>{dirty ? 'Unsaved changes' : 'Saved'}</span>
    </div>;
}

function OpenPencilRuntimeStatusFallback({
    dirty,
    page,
    resourceName,
    selectedIds,
    zoom
}: {
    readonly dirty: boolean;
    readonly page: OpenPencilPage;
    readonly resourceName?: string;
    readonly selectedIds: readonly string[];
    readonly zoom: number;
}): React.ReactElement {
    return <div className='openpencil-sdk-status-detail' title={selectedIds.join(', ')}>
        <span>{resourceName ?? 'OpenPencil'}</span>
        <span>{page.name}</span>
        <span>{selectedIds.length ? `${selectedIds.length} selected` : 'No selection'}</span>
        <span>{Math.round(zoom * 100)}%</span>
        <span>{dirty ? 'Unsaved changes' : 'Saved'}</span>
    </div>;
}

function formatRuntimeNodeGeometry(node: OpenPencilRuntimeNode): string | undefined {
    const x = typeof node.x === 'number' ? Math.round(node.x) : undefined;
    const y = typeof node.y === 'number' ? Math.round(node.y) : undefined;
    const width = typeof node.width === 'number' ? Math.round(node.width) : undefined;
    const height = typeof node.height === 'number' ? Math.round(node.height) : undefined;
    const position = x !== undefined && y !== undefined ? `X ${x} Y ${y}` : undefined;
    const size = width !== undefined && height !== undefined ? `W ${width} H ${height}` : undefined;
    return [position, size].filter(Boolean).join(' / ') || undefined;
}

function resolveBundledPenReactRuntime(): OpenPencilPenReactRuntime | undefined {
    return bundledPenReactRuntime;
}

function shouldExposeRuntimeEngine(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }
    if (window.__OPENPENCIL_EXPOSE_RUNTIME_ENGINE__ === true) {
        return true;
    }
    try {
        return window.localStorage?.getItem('openpencil.exposeRuntimeEngine') === 'true';
    } catch {
        return false;
    }
}

function resolveCanvasKitFile(file: string): string {
    return file.endsWith('.wasm') ? canvasKitWasmUrl : file;
}

function isCompletePenReactRuntime(candidate: Partial<OpenPencilPenReactRuntime>): candidate is OpenPencilPenReactRuntime {
    return isReactComponent(candidate.DesignProvider)
        && isReactComponent(candidate.DesignCanvas)
        && isReactComponent(candidate.CoreToolbar)
        && isReactComponent(candidate.LayerPanel)
        && isReactComponent(candidate.PropertyPanel);
}

function isReactComponent(candidate: unknown): boolean {
    if (typeof candidate === 'function') {
        return true;
    }
    if (typeof candidate !== 'object' || candidate === null) {
        return false;
    }
    const reactType = (candidate as { $$typeof?: symbol }).$$typeof;
    return typeof reactType === 'symbol' || 'render' in candidate || 'type' in candidate;
}

function subscribeRuntimeEngine(
    engine: OpenPencilRuntimeEngine,
    handlers: {
        onSelectionChange: (selectedIds: string[]) => void;
        onActivePageChange: (pageId: string) => void;
        onCanvasInteraction?: (event: OpenPencilRuntimeInteractionEvent) => void;
    }
): Array<() => void> {
    const disposables: Array<() => void> = [];
    const subscribe = (event: string, callback: (...args: unknown[]) => void): void => {
        const disposable = engine.on?.(event, callback);
        if (typeof disposable === 'function') {
            disposables.push(disposable);
        }
    };
    subscribe('selection:change', ids => handlers.onSelectionChange(Array.isArray(ids) ? ids as string[] : []));
    subscribe('page:change', pageId => {
        if (typeof pageId === 'string') {
            handlers.onActivePageChange(pageId);
        }
    });
    subscribe('node:hover', id => handlers.onCanvasInteraction?.(toOpenPencilRuntimeInteractionEvent('hover', id)));
    subscribe('viewport:change', viewport => handlers.onCanvasInteraction?.(toOpenPencilRuntimeInteractionEvent('viewport', viewport)));
    subscribe('render', () => handlers.onCanvasInteraction?.(toOpenPencilRuntimeInteractionEvent('render', undefined)));
    return disposables;
}

function disposeRuntimeSubscriptions(disposables: Array<() => void>): void {
    while (disposables.length) {
        disposables.pop()?.();
    }
}

function syncRuntimeSelection(engine: OpenPencilRuntimeEngine, selection: OpenPencilRuntimeSelectionState): void {
    const current = engine.getSelection?.() ?? [];
    if (!sameIds(current, selection.selectedIds)) {
        engine.select?.(selection.selectedIds);
    }
}

function syncRuntimeActivePage(engine: OpenPencilRuntimeEngine, pageId: string): void {
    if (typeof engine.setActivePage !== 'function') {
        return;
    }
    if (engine.getActivePage?.() !== pageId) {
        engine.setActivePage(pageId);
    }
}

function syncRuntimeZoom(engine: OpenPencilRuntimeEngine, zoom: number): void {
    if (!Number.isFinite(zoom) || typeof engine.setViewport !== 'function') {
        return;
    }
    const panX = typeof engine.panX === 'number' ? engine.panX : 0;
    const panY = typeof engine.panY === 'number' ? engine.panY : 0;
    if (engine.zoom !== zoom) {
        engine.setViewport(zoom, panX, panY);
    }
}

function sameIds(left: readonly string[], right: readonly string[]): boolean {
    return left.length === right.length && left.every((id, index) => id === right[index]);
}

function ensureRuntimeEngineCompatibility(engine: OpenPencilRuntimeEngine): void {
    if (typeof engine.setZoom !== 'function' && typeof engine.setViewport === 'function') {
        engine.setZoom = (zoom: number) => {
            if (!Number.isFinite(zoom)) {
                return;
            }
            engine.setViewport?.(zoom, numberOrZero(engine.panX), numberOrZero(engine.panY));
        };
    }
    if (typeof engine.getParentOf !== 'function' && typeof engine.getDocument === 'function') {
        engine.getParentOf = (id: string) => findRuntimeParent(engine.getDocument?.(), id);
    }
}

function resolveRuntimeActivePageId(
    engine: OpenPencilRuntimeEngine | undefined,
    document: OpenPencilRuntimeDocument,
    fallbackPageId: string
): string {
    const enginePageId = engine?.getActivePage?.();
    if (enginePageId && document.pages?.some(page => page.id === enginePageId)) {
        return enginePageId;
    }
    return document.activePageId && document.pages?.some(page => page.id === document.activePageId)
        ? document.activePageId
        : fallbackPageId;
}

function normalizeRuntimeSelectionPayload(selection: unknown): OpenPencilRuntimeSelectionState | string[] {
    if (Array.isArray(selection)) {
        return selection as string[];
    }
    if (typeof selection === 'object' && selection !== null) {
        return selection as OpenPencilRuntimeSelectionState;
    }
    return [];
}

function findRuntimeParent(document: OpenPencilRuntimeDocument | undefined, id: string): OpenPencilRuntimeNode | undefined {
    if (!document) {
        return undefined;
    }
    const visit = (nodes: OpenPencilRuntimeNode[], parent?: OpenPencilRuntimeNode): OpenPencilRuntimeNode | undefined => {
        for (const node of nodes) {
            if (node.id === id) {
                return parent;
            }
            const match = node.children ? visit(node.children, node) : undefined;
            if (match) {
                return match;
            }
        }
        return undefined;
    };
    for (const page of document.pages ?? []) {
        const parent = visit(page.children);
        if (parent) {
            return parent;
        }
    }
    return visit(document.children);
}

function numberOrZero(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

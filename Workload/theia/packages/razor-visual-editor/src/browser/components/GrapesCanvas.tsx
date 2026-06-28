import * as React from '@theia/core/shared/react';
import type { Component, Editor } from 'grapesjs';
import { GrapesEditorFactory } from '../grapes/grapes-editor-factory';
import { RazorVisualViewport } from '../types/editor-document';

type HistoryAction = 'undo' | 'redo';

export interface GrapesCanvasProps {
    html: string;
    css: string[];
    scriptsEnabled: boolean;
    viewportClass: string;
    viewport: RazorVisualViewport;
    factory: GrapesEditorFactory;
    blocksContainer?: HTMLElement;
    layersContainer?: HTMLElement;
    selectorsContainer?: HTMLElement;
    traitsContainer?: HTMLElement;
    stylesContainer?: HTMLElement;
    onDirty(): void;
    onEditorReady(editor: Editor): void;
    onSelectionChange(component: Component | undefined): void;
}

export function GrapesCanvas(props: GrapesCanvasProps): React.ReactElement {
    const hostRef = React.useRef<HTMLDivElement | null>(null);
    const editorRef = React.useRef<Editor | undefined>(undefined);

    React.useEffect(() => {
        const host = hostRef.current;
        if (!host || !props.blocksContainer || !props.layersContainer || !props.selectorsContainer || !props.traitsContainer || !props.stylesContainer) {
            return undefined;
        }
        host.innerHTML = '';
        props.blocksContainer.innerHTML = '';
        props.layersContainer.innerHTML = '';
        props.selectorsContainer.innerHTML = '';
        props.traitsContainer.innerHTML = '';
        props.stylesContainer.innerHTML = '';
        const editor = props.factory.create({
            container: host,
            html: props.html,
            css: props.css,
            scriptsEnabled: props.scriptsEnabled,
            blocksContainer: props.blocksContainer,
            layersContainer: props.layersContainer,
            selectorsContainer: props.selectorsContainer,
            traitsContainer: props.traitsContainer,
            stylesContainer: props.stylesContainer,
            onDirty: props.onDirty
        });
        editorRef.current = editor;
        editor.setDevice(deviceName(props.viewport));
        const emitSelection = (): void => props.onSelectionChange(editor.getSelected());
        editor.on('component:selected', emitSelection);
        editor.on('component:update', emitSelection);
        editor.on('component:styleUpdate', emitSelection);
        editor.on('component:deselected', () => props.onSelectionChange(undefined));
        editor.on('rte:disable', emitSelection);
        const disposeHistoryShortcuts = installHistoryShortcuts(editor, host, props.onDirty);
        props.onEditorReady(editor);
        return () => {
            disposeHistoryShortcuts();
            props.onSelectionChange(undefined);
            editorRef.current = undefined;
            editor.destroy();
        };
    }, [props.html, props.css, props.scriptsEnabled, props.factory, props.blocksContainer, props.layersContainer, props.selectorsContainer, props.traitsContainer, props.stylesContainer]);

    React.useEffect(() => {
        editorRef.current?.setDevice(deviceName(props.viewport));
    }, [props.viewport]);

    return <div className={`cv-razor-canvas-shell ${props.viewportClass}`}>
        <div className='cv-razor-grapes-host' ref={hostRef} />
    </div>;
}

function deviceName(viewport: RazorVisualViewport): string {
    switch (viewport) {
        case 'tablet':
            return 'Tablet';
        case 'mobile':
            return 'Mobile';
        case 'custom':
        case 'desktop':
        default:
            return 'Desktop';
    }
}

function installHistoryShortcuts(editor: Editor, host: HTMLElement, onDirty: () => void): () => void {
    const disposables: Array<() => void> = [];
    const root = host.closest('.cv-razor-editor') ?? host;
    const ownerDocument = host.ownerDocument;

    const handleParentKeydown = (event: KeyboardEvent): void => {
        const activeElement = ownerDocument.activeElement;
        const eventBelongsToEditor = isEventInside(root, event.target)
            || isEventInside(root, activeElement)
            || (isDocumentShellTarget(ownerDocument, event.target) && isVisibleVisualEditor(root));
        if (!eventBelongsToEditor || shouldUseNativeTextEditing(event.target) || shouldUseNativeTextEditing(activeElement)) {
            return;
        }
        handleHistoryShortcut(event, editor, onDirty);
    };

    ownerDocument.addEventListener('keydown', handleParentKeydown, true);
    disposables.push(() => ownerDocument.removeEventListener('keydown', handleParentKeydown, true));

    const frameDocuments = new Set<Document>();
    const attachFrameDocument = (frameDocument: Document | null | undefined): void => {
        if (!frameDocument || frameDocuments.has(frameDocument)) {
            return;
        }
        frameDocuments.add(frameDocument);
        const handleFrameKeydown = (event: KeyboardEvent): void => {
            if (shouldUseNativeTextEditing(event.target)) {
                return;
            }
            handleHistoryShortcut(event, editor, onDirty);
        };
        frameDocument.addEventListener('keydown', handleFrameKeydown, true);
        disposables.push(() => frameDocument.removeEventListener('keydown', handleFrameKeydown, true));
    };

    const handleFrameLoad = (event: { window?: Window }): void => attachFrameDocument(event.window?.document);
    attachFrameDocument(editor.Canvas.getDocument());
    editor.on('canvas:frame:load', handleFrameLoad);
    editor.on('canvas:frame:load:body', handleFrameLoad);
    disposables.push(() => {
        editor.off('canvas:frame:load', handleFrameLoad);
        editor.off('canvas:frame:load:body', handleFrameLoad);
    });

    return () => disposables.splice(0).forEach(dispose => dispose());
}

function handleHistoryShortcut(event: KeyboardEvent, editor: Editor, onDirty: () => void): void {
    const action = getHistoryAction(event);
    if (!action) {
        return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const manager = editor.UndoManager;
    const available = action === 'undo'
        ? manager.hasUndo()
        : manager.hasRedo();
    if (!available) {
        return;
    }

    if (action === 'undo') {
        manager.undo();
    } else {
        manager.redo();
    }
    onDirty();
}

function getHistoryAction(event: KeyboardEvent): HistoryAction | undefined {
    if (event.altKey || !(event.ctrlKey || event.metaKey)) {
        return undefined;
    }

    const key = event.key.toLowerCase();
    if (key === 'z') {
        return event.shiftKey ? 'redo' : 'undo';
    }
    if (key === 'y' && !event.shiftKey) {
        return 'redo';
    }
    return undefined;
}

function isEventInside(root: Element, target: EventTarget | null): boolean {
    return Boolean(target && (target === root || root.contains(target as Node)));
}

function isDocumentShellTarget(document: Document, target: EventTarget | null): boolean {
    return target === document || target === document.body || target === document.documentElement;
}

function isVisibleVisualEditor(root: Element): boolean {
    const widget = root.closest('.cv-razor-widget') ?? root;
    return !widget.closest('.lm-mod-hidden') && widget.getClientRects().length > 0;
}

function shouldUseNativeTextEditing(target: EventTarget | null): boolean {
    if (!isElementLike(target)) {
        return false;
    }

    const editable = target.closest('input, textarea, select, [role="textbox"], [contenteditable]');
    if (!editable) {
        return false;
    }

    return editable.getAttribute('contenteditable') !== 'false';
}

function isElementLike(target: EventTarget | null): target is Element {
    return Boolean(target && typeof (target as Element).closest === 'function');
}

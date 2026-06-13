import * as React from '@theia/core/shared/react';
import type { Component, Editor } from 'grapesjs';
import { GrapesEditorFactory } from '../grapes/grapes-editor-factory';
import { createSelectedElementSnapshot, updateSelectedElementAttribute, updateSelectedElementStyle, updateSelectedElementText } from '../grapes/grapes-selection';
import { findComponentForSourceLine, findSourceLineForSelection, formatSourceHtml, highlightComponentElement } from '../grapes/source-code-mapping';
import { EditorDocument, RazorVisualEditorMode, RazorVisualViewport } from '../types/editor-document';
import { SelectedElementSnapshot } from '../types/selected-element';
import { EditorToolbar } from './EditorToolbar';
import { GrapesCanvas } from './GrapesCanvas';
import { AssetWarningsPanel } from './AssetWarningsPanel';
import { ElementPropertiesPanel } from './ElementPropertiesPanel';
import { EditorStructurePanel } from './EditorStructurePanel';
import { GlobalVariablesPanel } from './GlobalVariablesPanel';
import { CssForceState, CssRuleEditRequest, SourceCodePanel } from './SourceCodePanel';
import { VisualAiPanel, VisualAiPanelRunOptions } from './VisualAiPanel';
import { analyzeCssVariables } from '../assets/css-variable-analyzer';
import { applyCssVariableOverride, applyCssVariableOverrides, initialCssVariableValues } from '../grapes/grapes-css-variables';
import { CssVariableDefinition, CssVariableSaveChange } from '../types/css-variable';
import { RazorVisualAiService } from '../services/visual-ai-service';
import { VisualAiProviderDescriptor } from '../types/visual-ai';

export interface RazorVisualEditorAppProps {
    document?: EditorDocument;
    dirty: boolean;
    loading: boolean;
    error?: string;
    mode: RazorVisualEditorMode;
    viewport: RazorVisualViewport;
    diffText: string;
    grapesFactory: GrapesEditorFactory;
    visualAiService: RazorVisualAiService;
    onSave(): void;
    onSaveAs(): void;
    onReload(): void;
    onShowDiff(): void;
    onShowTokens(): void;
    onModeChange(mode: RazorVisualEditorMode): void;
    onViewportChange(viewport: RazorVisualViewport): void;
    onDirty(): void;
    onCssVariablesChange(changes: CssVariableSaveChange[]): void;
    onEditorReady(editor: Editor): void;
}

export function RazorVisualEditorApp(props: RazorVisualEditorAppProps): React.ReactElement {
    const selectedComponentRef = React.useRef<Component | undefined>(undefined);
    const editorRef = React.useRef<Editor | undefined>(undefined);
    const sourceHoverCleanupRef = React.useRef<() => void>(() => undefined);
    const [selectedElement, setSelectedElement] = React.useState<SelectedElementSnapshot | undefined>(undefined);
    const [leftPanelWidth, setLeftPanelWidth] = React.useState(initialLeftPanelWidth);
    const [sourcePanelHeight, setSourcePanelHeight] = React.useState(initialSourcePanelHeight);
    const [cssVariableValues, setCssVariableValues] = React.useState<Record<string, string>>({});
    const [sourceDraft, setSourceDraft] = React.useState('');
    const [forcedState, setForcedState] = React.useState<CssForceState>('');
    const [blocksContainer, setBlocksContainer] = React.useState<HTMLElement | undefined>(undefined);
    const [layersContainer, setLayersContainer] = React.useState<HTMLElement | undefined>(undefined);
    const [selectorsContainer, setSelectorsContainer] = React.useState<HTMLElement | undefined>(undefined);
    const [traitsContainer, setTraitsContainer] = React.useState<HTMLElement | undefined>(undefined);
    const [stylesContainer, setStylesContainer] = React.useState<HTMLElement | undefined>(undefined);
    const [aiOpen, setAiOpen] = React.useState(false);
    const [aiProviders, setAiProviders] = React.useState<VisualAiProviderDescriptor[]>([]);
    const [aiProvidersLoading, setAiProvidersLoading] = React.useState(false);
    const [aiRunning, setAiRunning] = React.useState(false);
    const [aiError, setAiError] = React.useState<string | undefined>(undefined);
    const [aiSummary, setAiSummary] = React.useState<string | undefined>(undefined);

    const refreshSelectedElement = React.useCallback(() => {
        setSelectedElement(createSelectedElementSnapshot(selectedComponentRef.current));
    }, []);

    const handleSelectionChange = React.useCallback((component: Component | undefined) => {
        selectedComponentRef.current = component;
        setSelectedElement(createSelectedElementSnapshot(component));
    }, []);

    const cssVariables = React.useMemo(() => {
        return props.document ? analyzeCssVariables(props.document.assetResolution) : [];
    }, [props.document]);

    React.useEffect(() => {
        selectedComponentRef.current = undefined;
        setSelectedElement(undefined);
    }, [props.document?.uri.toString()]);

    React.useEffect(() => {
        setCssVariableValues(initialCssVariableValues(cssVariables));
        props.onCssVariablesChange([]);
    }, [props.document?.uri.toString(), cssVariables]);

    React.useEffect(() => {
        if (props.mode === 'source') {
            setSourceDraft(formatSourceHtml(editorRef.current?.getHtml() ?? props.document?.processedHtml ?? ''));
        }
    }, [props.mode, props.document?.uri.toString()]);

    React.useEffect(() => () => sourceHoverCleanupRef.current(), []);

    const refreshAiProviders = React.useCallback(async () => {
        setAiProvidersLoading(true);
        try {
            setAiProviders(await props.visualAiService.listProviders());
        } catch (error) {
            setAiError(error instanceof Error ? error.message : String(error));
        } finally {
            setAiProvidersLoading(false);
        }
    }, [props.visualAiService]);

    React.useEffect(() => {
        if (aiOpen) {
            refreshAiProviders();
        }
    }, [aiOpen, refreshAiProviders]);

    const selectedSourceLine = React.useMemo(() => {
        return props.mode === 'source' ? findSourceLineForSelection(sourceDraft, selectedElement) : undefined;
    }, [props.mode, selectedElement, sourceDraft]);

    React.useEffect(() => {
        if (editorRef.current) {
            applyCssVariableOverrides(editorRef.current, cssVariables, cssVariableValues);
        }
    }, [cssVariables, cssVariableValues]);

    const updateAttribute = React.useCallback((name: string, value: string) => {
        updateSelectedElementAttribute(selectedComponentRef.current, name, value);
        props.onDirty();
        refreshSelectedElement();
    }, [props.onDirty, refreshSelectedElement]);

    const updateText = React.useCallback((value: string) => {
        updateSelectedElementText(selectedComponentRef.current, value);
        props.onDirty();
        refreshSelectedElement();
    }, [props.onDirty, refreshSelectedElement]);

    const updateForcedState = React.useCallback((state: CssForceState) => {
        setForcedState(state);
        setGrapesSelectorState(editorRef.current, state);
    }, []);

    const applyCssRuleEdit = React.useCallback((request: CssRuleEditRequest) => {
        const editor = editorRef.current;
        if (!editor) {
            return;
        }
        if (request.inline || request.selector === 'element.style') {
            if (request.previousProperty && request.previousProperty !== request.property) {
                updateSelectedElementStyle(selectedComponentRef.current, request.previousProperty, '');
            }
            updateSelectedElementStyle(selectedComponentRef.current, request.property, request.value);
        } else {
            applyProjectCssDeclaration(editor, request);
        }
        props.onDirty();
        refreshSelectedElement();
    }, [props.onDirty, refreshSelectedElement]);

    const updateCssVariable = React.useCallback((name: string, value: string) => {
        const variable = cssVariables.find(item => item.name === name);
        if (!variable) {
            return;
        }
        setCssVariableValues(current => {
            const next = { ...current, [name]: value };
            props.onCssVariablesChange(cssVariableSaveChanges(cssVariables, next));
            return next;
        });
        if (editorRef.current) {
            applyCssVariableOverride(editorRef.current, variable, value);
            props.onDirty();
        }
    }, [cssVariables, props.onDirty]);

    const resetCssVariable = React.useCallback((name: string) => {
        const variable = cssVariables.find(item => item.name === name);
        if (variable) {
            updateCssVariable(name, variable.value);
        }
    }, [cssVariables, updateCssVariable]);

    const handleEditorReady = React.useCallback((editor: Editor) => {
        editorRef.current = editor;
        applyCssVariableOverrides(editor, cssVariables, cssVariableValues);
        props.onEditorReady(editor);
    }, [cssVariables, cssVariableValues, props]);

    const applySourceDraft = React.useCallback(() => {
        const editor = editorRef.current;
        if (!editor) {
            return;
        }
        editor.setComponents(sourceDraft);
        setSourceDraft(formatSourceHtml(editor.getHtml()));
        selectedComponentRef.current = undefined;
        setSelectedElement(undefined);
        props.onDirty();
    }, [props.onDirty, sourceDraft]);

    const runVisualAi = React.useCallback(async (options: VisualAiPanelRunOptions) => {
        const editor = editorRef.current;
        if (!editor || !props.document) {
            return;
        }
        setAiRunning(true);
        setAiError(undefined);
        setAiSummary(undefined);
        try {
            const result = await props.visualAiService.run({
                providerId: options.providerId,
                model: options.model,
                instruction: options.instruction,
                fileUri: props.document.uri.toString(),
                html: editor.getHtml(),
                css: editor.getCss() ?? '',
                isRazor: props.document.isRazor,
                selectedElement,
                protectedTokens: (props.document.sourceMap?.tokens ?? []).map(token => ({
                    id: token.id,
                    kind: token.kind
                })),
                assetWarnings: props.document.assetResolution.warnings
            });
            editor.setComponents(result.html);
            if (result.css !== undefined) {
                editor.setStyle(result.css);
            }
            if (props.mode === 'source') {
                setSourceDraft(formatSourceHtml(editor.getHtml()));
            }
            selectedComponentRef.current = undefined;
            setSelectedElement(undefined);
            setAiSummary(result.summary);
            for (const warning of result.warnings) {
                console.warn(`[CyberVinci Visual AI] ${warning}`);
            }
            props.onDirty();
        } catch (error) {
            setAiError(error instanceof Error ? error.message : String(error));
        } finally {
            setAiRunning(false);
        }
    }, [props.document, props.mode, props.onDirty, props.visualAiService, selectedElement]);

    const clearSourceHover = React.useCallback(() => {
        sourceHoverCleanupRef.current();
        sourceHoverCleanupRef.current = () => undefined;
    }, []);

    const handleSourceLineHover = React.useCallback((lineNumber: number | undefined) => {
        clearSourceHover();
        if (!lineNumber) {
            return;
        }
        const component = findComponentForSourceLine(editorRef.current, sourceDraft, lineNumber);
        sourceHoverCleanupRef.current = highlightComponentElement(component);
    }, [clearSourceHover, sourceDraft]);

    const handleSourceLineSelect = React.useCallback((lineNumber: number) => {
        clearSourceHover();
        const editor = editorRef.current;
        const component = findComponentForSourceLine(editor, sourceDraft, lineNumber);
        if (!editor || !component) {
            return;
        }
        editor.select(component);
        selectedComponentRef.current = component;
        setSelectedElement(createSelectedElementSnapshot(component));
        sourceHoverCleanupRef.current = highlightComponentElement(component);
    }, [clearSourceHover, sourceDraft]);

    const startLeftPanelResize = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        event.preventDefault();
        const startX = event.clientX;
        const startWidth = leftPanelWidth;
        const bodyCursor = document.body.style.cursor;
        const bodyUserSelect = document.body.style.userSelect;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        const onPointerMove = (moveEvent: PointerEvent): void => {
            setLeftPanelWidth(clampLeftPanelWidth(startWidth + moveEvent.clientX - startX));
        };
        const onPointerUp = (upEvent: PointerEvent): void => {
            const finalWidth = clampLeftPanelWidth(startWidth + upEvent.clientX - startX);
            setLeftPanelWidth(finalWidth);
            storeLeftPanelWidth(finalWidth);
            document.body.style.cursor = bodyCursor;
            document.body.style.userSelect = bodyUserSelect;
            document.removeEventListener('pointermove', onPointerMove);
            document.removeEventListener('pointerup', onPointerUp);
        };

        document.addEventListener('pointermove', onPointerMove);
        document.addEventListener('pointerup', onPointerUp, { once: true });
    }, [leftPanelWidth]);

    const startSourcePanelResize = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        event.preventDefault();
        const stackHeight = event.currentTarget.parentElement?.clientHeight ?? window.innerHeight;
        const maxHeight = Math.max(220, stackHeight - 160);
        const startY = event.clientY;
        const startHeight = sourcePanelHeight;
        const bodyCursor = document.body.style.cursor;
        const bodyUserSelect = document.body.style.userSelect;
        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';

        const onPointerMove = (moveEvent: PointerEvent): void => {
            setSourcePanelHeight(clampSourcePanelHeight(startHeight + startY - moveEvent.clientY, maxHeight));
        };
        const onPointerUp = (upEvent: PointerEvent): void => {
            const finalHeight = clampSourcePanelHeight(startHeight + startY - upEvent.clientY, maxHeight);
            setSourcePanelHeight(finalHeight);
            storeSourcePanelHeight(finalHeight);
            document.body.style.cursor = bodyCursor;
            document.body.style.userSelect = bodyUserSelect;
            document.removeEventListener('pointermove', onPointerMove);
            document.removeEventListener('pointerup', onPointerUp);
        };

        document.addEventListener('pointermove', onPointerMove);
        document.addEventListener('pointerup', onPointerUp, { once: true });
    }, [sourcePanelHeight]);

    const handleBlocksContainerChange = React.useCallback((container: HTMLElement | undefined) => {
        setBlocksContainer(container);
    }, []);

    const handleLayersContainerChange = React.useCallback((container: HTMLElement | undefined) => {
        setLayersContainer(container);
    }, []);

    const handleSelectorsContainerChange = React.useCallback((container: HTMLElement | undefined) => {
        setSelectorsContainer(container);
    }, []);

    const handleTraitsContainerChange = React.useCallback((container: HTMLElement | undefined) => {
        setTraitsContainer(container);
    }, []);

    const handleStylesContainerChange = React.useCallback((container: HTMLElement | undefined) => {
        setStylesContainer(container);
    }, []);

    if (props.loading) {
        return <div className='cv-razor-status'>Loading visual editor...</div>;
    }
    if (props.error || !props.document) {
        return <div className='cv-razor-status error'>{props.error ?? 'No document loaded.'}</div>;
    }

    const tokens = props.document.sourceMap?.tokens ?? [];
    const scriptsEnabled = props.mode === 'preview-scripts';

    const editorStyle = {
        '--cv-left-panel-width': `${leftPanelWidth}px`,
        '--cv-source-panel-height': `${sourcePanelHeight}px`
    } as React.CSSProperties;

    return <div className='cv-razor-editor' style={editorStyle}>
        <EditorToolbar
            dirty={props.dirty}
            mode={props.mode}
            viewport={props.viewport}
            isRazor={props.document.isRazor}
            tokenCount={tokens.length}
            assetWarningCount={props.document.assetResolution.warnings.length}
            onSave={props.onSave}
            onSaveAs={props.onSaveAs}
            onReload={props.onReload}
            onShowDiff={props.onShowDiff}
            onShowTokens={props.onShowTokens}
            aiOpen={aiOpen}
            onToggleAi={() => setAiOpen(current => !current)}
            onModeChange={props.onModeChange}
            onViewportChange={props.onViewportChange}
        />
        {aiOpen && <VisualAiPanel
            providers={aiProviders}
            loadingProviders={aiProvidersLoading}
            running={aiRunning}
            summary={aiSummary}
            error={aiError}
            onRun={runVisualAi}
            onRefreshProviders={refreshAiProviders}
            onClose={() => setAiOpen(false)}
        />}
        <main className='cv-razor-main'>
            <EditorStructurePanel
                onBlocksContainerChange={handleBlocksContainerChange}
                onLayersContainerChange={handleLayersContainerChange}
            />
            <div
                className='cv-razor-left-resizer'
                role='separator'
                aria-orientation='vertical'
                aria-label='Resize components panel'
                onPointerDown={startLeftPanelResize}
            />
            <section className='cv-razor-workbench'>
                {props.mode === 'diff' && <pre className='cv-razor-diff-view'>{props.diffText || 'No diff generated yet.'}</pre>}
                {props.mode !== 'diff' && <div className={`cv-razor-workbench-stack ${props.mode === 'source' ? 'with-source' : ''}`}>
                    <div className='cv-razor-canvas-region'>
                        <GrapesCanvas
                            html={props.document.processedHtml}
                            css={props.document.assetResolution.css}
                            scriptsEnabled={scriptsEnabled}
                            viewportClass={`viewport-${props.viewport}`}
                            viewport={props.viewport}
                            factory={props.grapesFactory}
                            blocksContainer={blocksContainer}
                            layersContainer={layersContainer}
                            selectorsContainer={selectorsContainer}
                            traitsContainer={traitsContainer}
                            stylesContainer={stylesContainer}
                            onDirty={props.onDirty}
                            onEditorReady={handleEditorReady}
                            onSelectionChange={handleSelectionChange}
                        />
                    </div>
                    {props.mode === 'source' && <>
                        <div
                            className='cv-source-resizer'
                            role='separator'
                            aria-orientation='horizontal'
                            aria-label='Resize source and stylesheet panel'
                            onPointerDown={startSourcePanelResize}
                        />
                        <SourceCodePanel
                            value={sourceDraft}
                            selection={selectedElement}
                            selectedLine={selectedSourceLine}
                            forcedState={forcedState}
                            onChange={setSourceDraft}
                            onApply={applySourceDraft}
                            onClose={() => props.onModeChange('editor')}
                            onLineHover={handleSourceLineHover}
                            onLineSelect={handleSourceLineSelect}
                            onForcedStateChange={updateForcedState}
                            onCreateCssRule={applyCssRuleEdit}
                            onUpdateCssDeclaration={applyCssRuleEdit}
                        />
                    </>}
                </div>}
            </section>
            <aside className='cv-razor-side-panel'>
                <GlobalVariablesPanel
                    variables={cssVariables}
                    values={cssVariableValues}
                    onChange={updateCssVariable}
                    onReset={resetCssVariable}
                />
                <ElementPropertiesPanel
                    selection={selectedElement}
                    onAttributeChange={updateAttribute}
                    onTextChange={updateText}
                    onSelectorsContainerChange={handleSelectorsContainerChange}
                    onTraitsContainerChange={handleTraitsContainerChange}
                    onStylesContainerChange={handleStylesContainerChange}
                />
                <AssetWarningsPanel assetResolution={props.document.assetResolution} />
                <section className='cv-razor-side-section'>
                    <h3>Diagnostics</h3>
                    {props.document.diagnostics.length === 0
                        ? <p className='cv-razor-muted'>No diagnostics.</p>
                        : <ul>{props.document.diagnostics.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul>}
                </section>
            </aside>
        </main>
    </div>;
}

function cssVariableSaveChanges(variables: CssVariableDefinition[], values: Record<string, string>): CssVariableSaveChange[] {
    return variables
        .map(variable => ({
            name: variable.name,
            value: values[variable.name] ?? variable.value,
            originalValue: variable.value,
            source: variable.source,
            sourceUri: variable.sourceUri,
            selector: variable.selector
        }))
        .filter(change => change.value !== change.originalValue);
}

interface GrapesCssRuleLike {
    getStyle?(): Record<string, unknown>;
}

interface GrapesCssManagerLike {
    getRule?(selector: string, options?: Record<string, string>): GrapesCssRuleLike | undefined;
    setRule?(selector: string, style: Record<string, string>, options?: Record<string, string>): unknown;
}

function setGrapesSelectorState(editor: Editor | undefined, state: CssForceState): void {
    const selectorManager = (editor as unknown as { SelectorManager?: { setState?(state: string): void } } | undefined)?.SelectorManager;
    selectorManager?.setState?.(state);
}

function applyProjectCssDeclaration(editor: Editor, request: CssRuleEditRequest): void {
    const property = request.property.trim();
    if (!property || !request.selector.trim()) {
        return;
    }
    const cssManager = ((editor as unknown as { Css?: GrapesCssManagerLike; CssComposer?: GrapesCssManagerLike }).Css
        ?? (editor as unknown as { CssComposer?: GrapesCssManagerLike }).CssComposer);
    const options = cssRuleOptions(request.mediaText);
    const value = cssValueWithPriority(request.value.trim(), request.priority);

    if (cssManager?.setRule) {
        const existingRule = cssManager.getRule?.(request.selector, options);
        const styles = stringifyStyleRecord(existingRule?.getStyle?.() ?? {});
        if (request.previousProperty && request.previousProperty !== property) {
            delete styles[request.previousProperty];
        }
        if (request.value.trim()) {
            styles[property] = value;
        } else {
            delete styles[property];
        }
        cssManager.setRule(request.selector, styles, options);
        editor.trigger('update');
        return;
    }

    editor.setStyle(appendCssDeclaration(editor.getCss() ?? '', {
        ...request,
        property,
        value
    }));
}

function stringifyStyleRecord(value: Record<string, unknown>): Record<string, string> {
    return Object.fromEntries(Object.entries(value)
        .filter(([, entry]) => entry !== undefined && entry !== null)
        .map(([name, entry]) => [name, String(entry)]));
}

function cssRuleOptions(mediaText: string | undefined): Record<string, string> | undefined {
    const params = mediaText?.replace(/^@media\s+/i, '').trim();
    return params ? { atRuleType: 'media', atRuleParams: params } : undefined;
}

function cssValueWithPriority(value: string, priority: string | undefined): string {
    if (!priority || !value || /!important\s*$/i.test(value)) {
        return value;
    }
    return `${value} !${priority}`;
}

function appendCssDeclaration(css: string, request: CssRuleEditRequest): string {
    if (!request.value.trim()) {
        return css;
    }
    const rule = `${request.selector} {\n  ${request.property}: ${request.value};\n}`;
    const mediaParams = request.mediaText?.replace(/^@media\s+/i, '').trim();
    const nextRule = mediaParams ? `@media ${mediaParams} {\n${indentCss(rule)}\n}` : rule;
    return `${css.trim()}\n\n${nextRule}\n`;
}

function indentCss(css: string): string {
    return css.split('\n').map(line => `  ${line}`).join('\n');
}

const LEFT_PANEL_WIDTH_STORAGE_KEY = 'cybervinci.razorVisualEditor.leftPanelWidth';
const SOURCE_PANEL_HEIGHT_STORAGE_KEY = 'cybervinci.razorVisualEditor.sourcePanelHeight';

function initialLeftPanelWidth(): number {
    try {
        const stored = window.localStorage.getItem(LEFT_PANEL_WIDTH_STORAGE_KEY);
        return stored ? clampLeftPanelWidth(Number(stored)) : 260;
    } catch {
        return 260;
    }
}

function storeLeftPanelWidth(width: number): void {
    try {
        window.localStorage.setItem(LEFT_PANEL_WIDTH_STORAGE_KEY, String(width));
    } catch {
        // Ignore unavailable storage in constrained webviews.
    }
}

function clampLeftPanelWidth(width: number): number {
    if (!Number.isFinite(width)) {
        return 260;
    }
    return Math.max(220, Math.min(420, Math.round(width)));
}

function initialSourcePanelHeight(): number {
    try {
        const stored = window.localStorage.getItem(SOURCE_PANEL_HEIGHT_STORAGE_KEY);
        return stored ? clampSourcePanelHeight(Number(stored)) : 320;
    } catch {
        return 320;
    }
}

function storeSourcePanelHeight(height: number): void {
    try {
        window.localStorage.setItem(SOURCE_PANEL_HEIGHT_STORAGE_KEY, String(height));
    } catch {
        // Ignore unavailable storage in constrained webviews.
    }
}

function clampSourcePanelHeight(height: number, maxHeight = 640): number {
    if (!Number.isFinite(height)) {
        return 320;
    }
    return Math.max(180, Math.min(maxHeight, Math.round(height)));
}

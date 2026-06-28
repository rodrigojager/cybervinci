import * as React from '@theia/core/shared/react';
import * as monaco from '@theia/monaco-editor-core';
import { MatchedCssDeclaration, MatchedCssRule } from '../types/css-variable';
import { SelectedElementSnapshot } from '../types/selected-element';

export type CssForceState = '' | 'hover' | 'active' | 'focus' | 'focus-visible';

export interface CssRuleEditRequest {
    selector: string;
    property: string;
    value: string;
    previousProperty?: string;
    priority?: string;
    mediaText?: string;
    inline?: boolean;
}

export interface SourceCodePanelProps {
    value: string;
    selection?: SelectedElementSnapshot;
    selectedLine?: number;
    forcedState: CssForceState;
    onChange(value: string): void;
    onApply(): void;
    onClose(): void;
    onLineSelect(lineNumber: number): void;
    onLineHover(lineNumber: number | undefined): void;
    onForcedStateChange(state: CssForceState): void;
    onCreateCssRule(request: CssRuleEditRequest): void;
    onUpdateCssDeclaration(request: CssRuleEditRequest): void;
}

export function SourceCodePanel(props: SourceCodePanelProps): React.ReactElement {
    const hostRef = React.useRef<HTMLDivElement | null>(null);
    const editorRef = React.useRef<monaco.editor.IStandaloneCodeEditor | undefined>(undefined);
    const decorationsRef = React.useRef<string[]>([]);
    const hoverLineRef = React.useRef<number | undefined>(undefined);
    const applyingExternalValue = React.useRef(false);
    const onChangeRef = React.useRef(props.onChange);
    const onLineSelectRef = React.useRef(props.onLineSelect);
    const onLineHoverRef = React.useRef(props.onLineHover);

    React.useEffect(() => {
        onChangeRef.current = props.onChange;
        onLineSelectRef.current = props.onLineSelect;
        onLineHoverRef.current = props.onLineHover;
    }, [props.onChange, props.onLineSelect, props.onLineHover]);

    React.useEffect(() => {
        const host = hostRef.current;
        if (!host) {
            return undefined;
        }
        const editor = monaco.editor.create(host, {
            value: props.value,
            language: 'html',
            automaticLayout: true,
            minimap: { enabled: false },
            lineNumbers: 'on',
            folding: true,
            glyphMargin: false,
            scrollBeyondLastLine: false,
            tabSize: 2,
            insertSpaces: true,
            wordWrap: 'on',
            renderWhitespace: 'selection',
            renderLineHighlight: 'line',
            fixedOverflowWidgets: true
        });
        editorRef.current = editor;
        const contentDisposable = editor.onDidChangeModelContent(() => {
            if (!applyingExternalValue.current) {
                onChangeRef.current(editor.getValue());
            }
        });
        const mouseDownDisposable = editor.onMouseDown(event => {
            const lineNumber = event.target.position?.lineNumber;
            if (lineNumber) {
                onLineSelectRef.current(lineNumber);
            }
        });
        const mouseMoveDisposable = editor.onMouseMove(event => {
            const lineNumber = event.target.position?.lineNumber;
            if (hoverLineRef.current !== lineNumber) {
                hoverLineRef.current = lineNumber;
                onLineHoverRef.current(lineNumber);
            }
        });
        const mouseLeave = (): void => {
            hoverLineRef.current = undefined;
            onLineHoverRef.current(undefined);
        };
        host.addEventListener('mouseleave', mouseLeave);
        return () => {
            contentDisposable.dispose();
            mouseDownDisposable.dispose();
            mouseMoveDisposable.dispose();
            host.removeEventListener('mouseleave', mouseLeave);
            editor.dispose();
            editorRef.current = undefined;
        };
    }, []);

    React.useEffect(() => {
        const model = editorRef.current?.getModel();
        if (model && model.getValue() !== props.value) {
            applyingExternalValue.current = true;
            model.setValue(props.value);
            applyingExternalValue.current = false;
        }
        editorRef.current?.layout();
    }, [props.value]);

    React.useEffect(() => {
        const editor = editorRef.current;
        if (!editor) {
            return;
        }
        decorationsRef.current = editor.deltaDecorations(decorationsRef.current, props.selectedLine ? [{
            range: new monaco.Range(props.selectedLine, 1, props.selectedLine, 1),
            options: {
                isWholeLine: true,
                className: 'cv-source-selected-line',
                linesDecorationsClassName: 'cv-source-selected-line-glyph'
            }
        }] : []);
        if (props.selectedLine) {
            editor.revealLineInCenterIfOutsideViewport(props.selectedLine);
        }
    }, [props.selectedLine]);

    return <section className='cv-source-panel'>
        <header>
            <div>
                <h3>HTML</h3>
                <span>Processed HTML with Razor placeholders</span>
            </div>
            <div className='cv-source-actions'>
                <button type='button' onClick={props.onApply} title='Apply source to canvas'>
                    <i className='fa fa-check' /> Apply
                </button>
                <button type='button' onClick={props.onClose} title='Close source panel' aria-label='Close source panel'>
                    <i className='fa fa-times' />
                </button>
            </div>
        </header>
        <div className='cv-source-body'>
            <div className='cv-source-monaco-editor' ref={hostRef} />
            <CssCascadePanel
                selection={props.selection}
                forcedState={props.forcedState}
                onForcedStateChange={props.onForcedStateChange}
                onCreateCssRule={props.onCreateCssRule}
                onUpdateCssDeclaration={props.onUpdateCssDeclaration}
            />
        </div>
    </section>;
}

type StyleToolbarMenu = 'create' | 'force' | 'show' | undefined;

interface StyleTargetOption {
    id: string;
    label: string;
    selector: string;
    inline?: boolean;
}

interface CssCascadePanelProps {
    selection?: SelectedElementSnapshot;
    forcedState: CssForceState;
    onForcedStateChange(state: CssForceState): void;
    onCreateCssRule(request: CssRuleEditRequest): void;
    onUpdateCssDeclaration(request: CssRuleEditRequest): void;
}

function CssCascadePanel(props: CssCascadePanelProps): React.ReactElement {
    const selection = props.selection;
    const [openMenu, setOpenMenu] = React.useState<StyleToolbarMenu>(undefined);
    const [showOverridden, setShowOverridden] = React.useState(true);
    const [showInline, setShowInline] = React.useState(true);
    const [searchOpen, setSearchOpen] = React.useState(false);
    const [searchText, setSearchText] = React.useState('');
    const [createTargetId, setCreateTargetId] = React.useState('');
    const [createProperty, setCreateProperty] = React.useState('color');
    const [createValue, setCreateValue] = React.useState('');

    const targetOptions = React.useMemo(() => styleTargetOptions(selection, props.forcedState), [selection, props.forcedState]);
    React.useEffect(() => {
        if (!targetOptions.some(option => option.id === createTargetId)) {
            setCreateTargetId(targetOptions[0]?.id ?? '');
        }
    }, [createTargetId, targetOptions]);

    const visibleRules = React.useMemo(() => {
        return filterMatchedRules(selection?.matchedRules ?? [], {
            showInline,
            showOverridden,
            searchText
        });
    }, [searchText, selection?.matchedRules, showInline, showOverridden]);

    const submitCreateRule = React.useCallback((event: React.FormEvent) => {
        event.preventDefault();
        const target = targetOptions.find(option => option.id === createTargetId);
        const property = createProperty.trim();
        if (!target || !property) {
            return;
        }
        props.onCreateCssRule({
            selector: target.selector,
            property,
            value: createValue.trim(),
            inline: target.inline
        });
        setCreateValue('');
        setOpenMenu(undefined);
    }, [createProperty, createTargetId, createValue, props.onCreateCssRule, targetOptions]);

    return <aside className='cv-source-cascade-panel'>
        <header className='cv-style-panel-title'>
            <h3>Styles</h3>
            <button type='button' title='Undock styles panel' aria-label='Undock styles panel'>
                <i className='fa fa-clone' />
            </button>
        </header>
        <div className='cv-style-toolbar'>
            <div className='cv-style-menu-anchor'>
                <button
                    type='button'
                    aria-expanded={openMenu === 'create'}
                    disabled={!selection}
                    onClick={() => setOpenMenu(openMenu === 'create' ? undefined : 'create')}
                >
                    Create <i className='fa fa-caret-down' />
                </button>
                {openMenu === 'create' && <form className='cv-style-popover cv-style-create-popover' onSubmit={submitCreateRule}>
                    <label>
                        <span>Selector</span>
                        <select value={createTargetId} onChange={event => setCreateTargetId(event.currentTarget.value)}>
                            {targetOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
                        </select>
                    </label>
                    <label>
                        <span>Property</span>
                        <input value={createProperty} onChange={event => setCreateProperty(event.currentTarget.value)} placeholder='eg. color' />
                    </label>
                    <label>
                        <span>Value</span>
                        <input value={createValue} onChange={event => setCreateValue(event.currentTarget.value)} placeholder='eg. #0f6cbd' />
                    </label>
                    <button type='submit' disabled={!createProperty.trim() || !createTargetId}>
                        <i className='fa fa-plus' /> Add declaration
                    </button>
                </form>}
            </div>
            <div className='cv-style-menu-anchor'>
                <button
                    type='button'
                    aria-expanded={openMenu === 'force'}
                    disabled={!selection}
                    onClick={() => setOpenMenu(openMenu === 'force' ? undefined : 'force')}
                >
                    Force State{props.forcedState ? ` :${props.forcedState}` : ''} <i className='fa fa-caret-down' />
                </button>
                {openMenu === 'force' && <div className='cv-style-popover cv-style-menu-list'>
                    {FORCE_STATE_OPTIONS.map(option => <button
                        key={option.value || 'none'}
                        type='button'
                        className={props.forcedState === option.value ? 'active' : ''}
                        onClick={() => {
                            props.onForcedStateChange(option.value);
                            setOpenMenu(undefined);
                        }}
                    >
                        {option.label}
                    </button>)}
                </div>}
            </div>
            <div className='cv-style-menu-anchor'>
                <button
                    type='button'
                    aria-expanded={openMenu === 'show'}
                    onClick={() => setOpenMenu(openMenu === 'show' ? undefined : 'show')}
                >
                    Show <i className='fa fa-caret-down' />
                </button>
                {openMenu === 'show' && <div className='cv-style-popover cv-style-show-popover'>
                    <label>
                        <input type='checkbox' checked={showOverridden} onChange={event => setShowOverridden(event.currentTarget.checked)} />
                        <span>Overridden declarations</span>
                    </label>
                    <label>
                        <input type='checkbox' checked={showInline} onChange={event => setShowInline(event.currentTarget.checked)} />
                        <span>Inline styles</span>
                    </label>
                </div>}
            </div>
            <button
                type='button'
                className={searchOpen ? 'active' : ''}
                title='Search selectors'
                aria-label='Search selectors'
                onClick={() => setSearchOpen(current => !current)}
            >
                <i className='fa fa-search' />
            </button>
        </div>
        {searchOpen && <div className='cv-style-search-row'>
            <input
                value={searchText}
                autoFocus
                placeholder='Filter selector, property, value, or source'
                onChange={event => setSearchText(event.currentTarget.value)}
            />
            {searchText && <button type='button' aria-label='Clear style search' onClick={() => setSearchText('')}>
                <i className='fa fa-times' />
            </button>}
        </div>}
        <div className='cv-style-rules'>
            {!selection && <p className='cv-razor-muted'>Select an element in the canvas to inspect matched CSS rules.</p>}
            {selection && selection.matchedRules.length === 0 && <p className='cv-razor-muted'>No CSS selector rules matched this element.</p>}
            {selection && selection.matchedRules.length > 0 && visibleRules.length === 0 && <p className='cv-razor-muted'>No rules match the current filters.</p>}
            {selection && visibleRules.length > 0 && visibleRules.map((rule, index) => <article
                className={`cv-matched-rule cv-style-rule-card ${rule.inline ? 'inline' : ''}`}
                key={`${rule.selector}-${index}`}
            >
                {rule.mediaText && <div className='cv-style-media-row'>
                    <code>{rule.mediaText}</code>
                    <i className='fa fa-caret-down' />
                </div>}
                <header>
                    <div>
                        <code className={rule.inline ? 'cv-style-inline-selector' : 'cv-style-selector'}>{rule.selector}</code>
                        <span>{' {'}</span>
                    </div>
                    <button type='button' title='Rule actions' aria-label='Rule actions'>
                        <i className='fa fa-ellipsis-v' />
                    </button>
                </header>
                <div className='cv-rule-declarations'>
                    {rule.declarations.length === 0 && <span className='cv-style-empty-rule'>&nbsp;</span>}
                    {rule.declarations.map((declaration, declarationIndex) => <CssDeclarationEditor
                        declaration={declaration}
                        key={`${rule.selector}-${declaration.property}-${declarationIndex}`}
                        rule={rule}
                        onCommit={props.onUpdateCssDeclaration}
                    />)}
                </div>
                <footer>
                    <span>{'}'}</span>
                    <span>{rule.source}</span>
                </footer>
            </article>)}
        </div>
        <footer className='cv-style-computed'>
            <strong>Computed</strong>
            <i className='fa fa-caret-right' />
        </footer>
    </aside>;
}

function CssDeclarationEditor(props: {
    rule: MatchedCssRule;
    declaration: MatchedCssDeclaration;
    onCommit(request: CssRuleEditRequest): void;
}): React.ReactElement {
    const { declaration, rule } = props;
    const [property, setProperty] = React.useState(declaration.property);
    const [value, setValue] = React.useState(declaration.value);

    React.useEffect(() => {
        setProperty(declaration.property);
        setValue(declaration.value);
    }, [declaration.property, declaration.value]);

    const commit = React.useCallback(() => {
        const nextProperty = property.trim();
        const nextValue = value.trim();
        if (!nextProperty || nextProperty === declaration.property && nextValue === declaration.value) {
            return;
        }
        props.onCommit({
            selector: rule.selector,
            mediaText: rule.mediaText,
            inline: rule.inline,
            previousProperty: declaration.property,
            property: nextProperty,
            value: nextValue,
            priority: declaration.priority
        });
    }, [declaration.priority, declaration.property, declaration.value, property, props.onCommit, rule.inline, rule.mediaText, rule.selector, value]);

    const onKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            commit();
            event.currentTarget.blur();
        }
        if (event.key === 'Escape') {
            setProperty(declaration.property);
            setValue(declaration.value);
            event.currentTarget.blur();
        }
    }, [commit, declaration.property, declaration.value]);

    return <div className={`cv-rule-declaration ${declaration.active ? 'active' : 'overridden'}`}>
        <input
            className='cv-rule-property cv-rule-input'
            aria-label='CSS property'
            value={property}
            spellCheck={false}
            onChange={event => setProperty(event.currentTarget.value)}
            onBlur={commit}
            onKeyDown={onKeyDown}
        />
        <span>:</span>
        <textarea
            className='cv-rule-value cv-rule-input'
            aria-label='CSS value'
            value={value}
            rows={Math.min(6, Math.max(1, Math.ceil(value.length / 42)))}
            spellCheck={false}
            onChange={event => setValue(event.currentTarget.value)}
            onBlur={commit}
            onKeyDown={onKeyDown}
        />
        {declaration.priority && <strong>!{declaration.priority}</strong>}
        {declaration.overridden && <i className='fa fa-exclamation-circle' title='Overridden declaration' />}
    </div>;
}

const FORCE_STATE_OPTIONS: Array<{ value: CssForceState; label: string }> = [
    { value: '', label: 'None' },
    { value: 'hover', label: ':hover' },
    { value: 'active', label: ':active' },
    { value: 'focus', label: ':focus' },
    { value: 'focus-visible', label: ':focus-visible' }
];

function filterMatchedRules(rules: MatchedCssRule[], options: { showInline: boolean; showOverridden: boolean; searchText: string }): MatchedCssRule[] {
    const needle = options.searchText.trim().toLowerCase();
    return rules
        .filter(rule => options.showInline || !rule.inline)
        .map(rule => ({
            ...rule,
            declarations: options.showOverridden ? rule.declarations : rule.declarations.filter(declaration => declaration.active)
        }))
        .filter(rule => {
            if (rule.declarations.length === 0 && !options.showOverridden) {
                return false;
            }
            if (!needle) {
                return true;
            }
            return [
                rule.selector,
                rule.source,
                rule.mediaText ?? '',
                ...rule.declarations.flatMap(declaration => [declaration.property, declaration.value])
            ].some(value => value.toLowerCase().includes(needle));
        });
}

function styleTargetOptions(selection: SelectedElementSnapshot | undefined, forcedState: CssForceState): StyleTargetOption[] {
    if (!selection) {
        return [];
    }
    const state = forcedState ? `:${forcedState}` : '';
    const options: StyleTargetOption[] = [];
    const id = selection.attributes.id?.trim();
    if (id) {
        options.push({ id: `id:${id}`, label: `#${id}${state}`, selector: `#${escapeCssIdentifier(id)}${state}` });
    }
    for (const className of selection.classes) {
        options.push({
            id: `class:${className}`,
            label: `.${className}${state}`,
            selector: `.${escapeCssIdentifier(className)}${state}`
        });
    }
    if (selection.tagName) {
        options.push({ id: `tag:${selection.tagName}`, label: `${selection.tagName}${state}`, selector: `${selection.tagName}${state}` });
    }
    options.push({ id: 'inline', label: 'element.style', selector: 'element.style', inline: true });
    return options;
}

function escapeCssIdentifier(value: string): string {
    const css = globalThis.CSS as { escape?(value: string): string } | undefined;
    if (css?.escape) {
        return css.escape(value);
    }
    return value.replace(/[^A-Za-z0-9_-]/g, match => `\\${match}`);
}

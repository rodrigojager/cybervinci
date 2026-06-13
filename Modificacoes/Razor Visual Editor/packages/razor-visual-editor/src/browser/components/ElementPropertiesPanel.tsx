import * as React from '@theia/core/shared/react';
import { SelectedElementSnapshot } from '../types/selected-element';

const COMMON_ATTRIBUTES = [
    'id', 'class', 'href', 'src', 'alt', 'title', 'target', 'rel', 'name', 'type', 'placeholder', 'value',
    'role', 'aria-label', 'data-testid', 'action', 'method', 'autocomplete', 'for', 'rows', 'cols',
    'width', 'height', 'loading', 'disabled', 'required', 'readonly', 'checked', 'selected',
    'asp-controller', 'asp-action', 'asp-route-id', 'asp-for', 'asp-validation-for', 'asp-items', 'asp-area'
];

export interface ElementPropertiesPanelProps {
    selection?: SelectedElementSnapshot;
    onAttributeChange(name: string, value: string): void;
    onTextChange(value: string): void;
    onSelectorsContainerChange(container: HTMLElement | undefined): void;
    onTraitsContainerChange(container: HTMLElement | undefined): void;
    onStylesContainerChange(container: HTMLElement | undefined): void;
}

export function ElementPropertiesPanel(props: ElementPropertiesPanelProps): React.ReactElement {
    const selection = props.selection;
    const [textDraft, setTextDraft] = React.useState('');
    const [classDraft, setClassDraft] = React.useState('');
    const [classToAdd, setClassToAdd] = React.useState('');
    const setSelectorsContainer = React.useCallback((element: HTMLDivElement | null) => {
        props.onSelectorsContainerChange(element ?? undefined);
    }, [props.onSelectorsContainerChange]);
    const setTraitsContainer = React.useCallback((element: HTMLDivElement | null) => {
        props.onTraitsContainerChange(element ?? undefined);
    }, [props.onTraitsContainerChange]);
    const setStylesContainer = React.useCallback((element: HTMLDivElement | null) => {
        props.onStylesContainerChange(element ?? undefined);
    }, [props.onStylesContainerChange]);

    React.useEffect(() => {
        setTextDraft(selection?.text ?? '');
    }, [selection?.id, selection?.text]);

    React.useEffect(() => {
        setClassDraft(selection?.classes.join(' ') ?? '');
        setClassToAdd('');
    }, [selection?.id, selection?.classes.join(' ')]);

    const applyClassDraft = React.useCallback(() => {
        props.onAttributeChange('class', normalizeClasses(classDraft).join(' '));
    }, [classDraft, props.onAttributeChange]);

    const addClass = React.useCallback(() => {
        const next = Array.from(new Set([...normalizeClasses(classDraft), ...normalizeClasses(classToAdd)]));
        const value = next.join(' ');
        setClassDraft(value);
        setClassToAdd('');
        props.onAttributeChange('class', value);
    }, [classDraft, classToAdd, props.onAttributeChange]);

    const removeClass = React.useCallback((className: string) => {
        const value = normalizeClasses(classDraft).filter(item => item !== className).join(' ');
        setClassDraft(value);
        props.onAttributeChange('class', value);
    }, [classDraft, props.onAttributeChange]);

    return <section className='cv-razor-side-section cv-element-properties'>
        <h3>Properties</h3>
        {!selection && <p className='cv-razor-muted'>Select an element in the canvas to edit attributes, classes, text, and visual styles.</p>}
        {selection && <>
            <header className='cv-element-summary'>
                <strong>{selection.label}</strong>
                <span>{selection.tagName ? `<${selection.tagName}>` : selection.type}</span>
            </header>
            {selection.razorTokenId && <article className='cv-selected-razor-note'>
                <strong>Protected Razor token</strong>
                <span>{selection.razorTokenId} {selection.razorKind}</span>
                <p>Razor placeholders are locked and restored during save.</p>
            </article>}
            {!selection.locked && <>
                <div className='cv-property-group cv-class-editor'>
                    <h4>Classes</h4>
                    <label className='cv-class-input-row'>
                        <span>class</span>
                        <input
                            value={classDraft}
                            onChange={event => setClassDraft(event.currentTarget.value)}
                            onBlur={applyClassDraft}
                            onKeyDown={event => {
                                if (event.key === 'Enter') {
                                    event.preventDefault();
                                    applyClassDraft();
                                }
                            }}
                        />
                    </label>
                    <div className='cv-class-chips'>
                        {selection.classes.length === 0
                            ? <span className='cv-razor-muted'>No classes applied.</span>
                            : selection.classes.map(className => <button
                                key={className}
                                type='button'
                                className='cv-class-chip'
                                title={`Remove .${className}`}
                                onClick={() => removeClass(className)}
                            >
                                <span>.{className}</span>
                                <i className='fa fa-times' />
                            </button>)}
                    </div>
                    <div className='cv-class-add-row'>
                        <input
                            value={classToAdd}
                            placeholder='Add class'
                            onChange={event => setClassToAdd(event.currentTarget.value)}
                            onKeyDown={event => {
                                if (event.key === 'Enter') {
                                    event.preventDefault();
                                    addClass();
                                }
                            }}
                        />
                        <button type='button' className='cv-property-action' onClick={addClass} disabled={normalizeClasses(classToAdd).length === 0}>
                            <i className='fa fa-plus' /> Add
                        </button>
                    </div>
                </div>
                <div className='cv-property-group'>
                    <h4>Content</h4>
                    {selection.textEditable
                        ? <>
                            <textarea
                                value={textDraft}
                                onChange={event => setTextDraft(event.currentTarget.value)}
                                rows={4}
                            />
                            <button type='button' className='cv-property-action' onClick={() => props.onTextChange(textDraft)}>
                                Update text
                            </button>
                        </>
                        : <p className='cv-razor-muted'>Text editing is enabled for simple text elements without nested elements or Razor tokens.</p>}
                </div>
                <details className='cv-property-details'>
                    <summary>Quick attributes</summary>
                    <div className='cv-property-group'>
                        {attributeNames(selection).map(name => <label key={name}>
                            <span>{name}</span>
                            <input
                                value={selection.attributes[name] ?? ''}
                                onChange={event => props.onAttributeChange(name, event.currentTarget.value)}
                            />
                        </label>)}
                    </div>
                </details>
            </>}
        </>}
        <div className='cv-grapes-native-panel cv-grapes-classes-panel'>
            <header>
                <h4>Classes</h4>
            </header>
            <div className='cv-grapes-selectors-host' ref={setSelectorsContainer} />
        </div>
        <div className='cv-grapes-native-panel'>
            <header>
                <h4>Attributes</h4>
            </header>
            <div className='cv-grapes-traits-host' ref={setTraitsContainer} />
        </div>
        <div className='cv-grapes-native-panel'>
            <header>
                <h4>Styles</h4>
            </header>
            <div className='cv-grapes-styles-host' ref={setStylesContainer} />
        </div>
    </section>;
}

function attributeNames(selection: SelectedElementSnapshot): string[] {
    const present = Object.keys(selection.attributes);
    return Array.from(new Set([...COMMON_ATTRIBUTES, ...present]))
        .filter(name => !name.startsWith('data-cv-razor') && name !== 'contenteditable');
}

function normalizeClasses(value: string): string[] {
    return value.split(/\s+/)
        .map(item => item.trim().replace(/^\./, ''))
        .filter(Boolean);
}

import type { Editor, TraitProperties } from 'grapesjs';
import { RAZOR_TAG_HELPER_TRAITS } from '../razor/razor-rules';
import { componentRegistry } from './grapes-components';

type TraitDefinition = string | TraitProperties;

const COMMON_TRAITS: TraitDefinition[] = [
    'id',
    'class',
    'title',
    'role',
    'aria-label',
    'data-testid'
];

const GLOBAL_CONTENT_TRAITS: TraitDefinition[] = [
    'lang',
    'dir'
];

const TAG_TRAITS: Record<string, TraitDefinition[]> = {
    a: [
        'href',
        selectTrait('target', ['', '_self', '_blank', '_parent', '_top']),
        'title',
        'rel',
        checkboxTrait('download'),
        'asp-controller',
        'asp-action',
        'asp-route-id',
        'asp-area'
    ],
    article: ['aria-labelledby'],
    aside: ['aria-labelledby'],
    audio: [checkboxTrait('controls'), checkboxTrait('autoplay'), checkboxTrait('loop'), checkboxTrait('muted'), 'preload', 'src'],
    button: [
        selectTrait('type', ['button', 'submit', 'reset']),
        'name',
        'value',
        checkboxTrait('disabled'),
        'form',
        'asp-action',
        'asp-controller',
        'asp-route-id'
    ],
    caption: GLOBAL_CONTENT_TRAITS,
    details: [checkboxTrait('open')],
    fieldset: ['name', checkboxTrait('disabled')],
    form: [
        'action',
        selectTrait('method', ['get', 'post', 'dialog']),
        selectTrait('enctype', ['', 'application/x-www-form-urlencoded', 'multipart/form-data', 'text/plain']),
        selectTrait('target', ['', '_self', '_blank', '_parent', '_top']),
        selectTrait('autocomplete', ['', 'on', 'off']),
        checkboxTrait('novalidate'),
        'asp-action',
        'asp-controller',
        'asp-area'
    ],
    footer: ['aria-labelledby'],
    h1: GLOBAL_CONTENT_TRAITS,
    h2: GLOBAL_CONTENT_TRAITS,
    h3: GLOBAL_CONTENT_TRAITS,
    h4: GLOBAL_CONTENT_TRAITS,
    h5: GLOBAL_CONTENT_TRAITS,
    h6: GLOBAL_CONTENT_TRAITS,
    header: ['aria-labelledby'],
    iframe: ['src', 'title', 'width', 'height', 'loading', 'allow', checkboxTrait('allowfullscreen')],
    img: ['src', 'alt', 'width', 'height', selectTrait('loading', ['', 'lazy', 'eager']), selectTrait('decoding', ['', 'async', 'sync', 'auto']), 'srcset', 'sizes'],
    input: [
        selectTrait('type', [
            'text', 'email', 'password', 'number', 'tel', 'url', 'search', 'date', 'datetime-local',
            'time', 'month', 'week', 'checkbox', 'radio', 'file', 'hidden', 'submit', 'button'
        ]),
        'name',
        'placeholder',
        'value',
        checkboxTrait('checked'),
        checkboxTrait('required'),
        checkboxTrait('disabled'),
        checkboxTrait('readonly'),
        'min',
        'max',
        'step',
        'pattern',
        'maxlength',
        selectTrait('autocomplete', ['', 'on', 'off', 'name', 'email', 'username', 'current-password', 'new-password']),
        'asp-for'
    ],
    label: ['for', 'asp-for'],
    legend: GLOBAL_CONTENT_TRAITS,
    li: ['value'],
    link: ['href', selectTrait('rel', ['stylesheet', 'preload', 'preconnect', 'dns-prefetch', 'icon']), 'media', 'type', 'crossorigin'],
    main: ['aria-labelledby'],
    nav: ['aria-label', 'aria-labelledby'],
    ol: [selectTrait('type', ['', '1', 'a', 'A', 'i', 'I']), 'start', checkboxTrait('reversed')],
    option: ['value', checkboxTrait('selected'), checkboxTrait('disabled')],
    p: GLOBAL_CONTENT_TRAITS,
    script: ['src', selectTrait('type', ['', 'module', 'text/javascript', 'application/json']), checkboxTrait('async'), checkboxTrait('defer'), 'crossorigin'],
    section: ['aria-label', 'aria-labelledby'],
    select: ['name', checkboxTrait('multiple'), checkboxTrait('required'), checkboxTrait('disabled'), 'asp-for', 'asp-items'],
    source: ['src', 'srcset', 'type', 'media', 'sizes'],
    span: ['asp-validation-for', ...GLOBAL_CONTENT_TRAITS],
    table: ['summary'],
    tbody: [],
    td: ['colspan', 'rowspan', 'headers'],
    textarea: ['name', 'placeholder', 'rows', 'cols', checkboxTrait('required'), checkboxTrait('disabled'), checkboxTrait('readonly'), 'maxlength', 'asp-for'],
    tfoot: [],
    th: ['colspan', 'rowspan', selectTrait('scope', ['', 'col', 'row', 'colgroup', 'rowgroup']), 'headers'],
    thead: [],
    tr: [],
    ul: [],
    video: ['src', 'poster', 'width', 'height', checkboxTrait('controls'), checkboxTrait('autoplay'), checkboxTrait('loop'), checkboxTrait('muted'), checkboxTrait('playsinline'), 'preload']
};
const TEXT_TRAIT_TAGS = new Set([
    'a', 'button', 'caption', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'label', 'legend', 'li', 'p', 'span', 'td', 'th'
]);

export function registerGrapesTraits(editor: Editor): void {
    const registry = componentRegistry(editor);
    for (const [tagName, traits] of Object.entries(TAG_TRAITS)) {
        const definition: {
            extend?: string;
            isComponent(element: Element): false | { type: string; tagName: string };
            model: { defaults: Record<string, unknown> };
        } = {
            isComponent: (element: Element) => {
                if (element.tagName?.toLowerCase() !== tagName) {
                    return false;
                }
                if (element.hasAttribute?.('data-cv-razor-token')) {
                    return false;
                }
                if (TEXT_TRAIT_TAGS.has(tagName) && hasNestedElementOrRazor(element)) {
                    return false;
                }
                return { type: `cv-${tagName}-traits`, tagName };
            },
            model: {
                defaults: {
                    traits: mergeTraits(COMMON_TRAITS, traits, RAZOR_TAG_HELPER_TRAITS),
                    ...(TEXT_TRAIT_TAGS.has(tagName) ? { editable: true, droppable: false } : {})
                }
            }
        };
        if (TEXT_TRAIT_TAGS.has(tagName)) {
            definition.extend = 'text';
        }
        registry.addType(`cv-${tagName}-traits`, definition);
    }
}

function checkboxTrait(name: string): TraitProperties {
    return {
        type: 'checkbox',
        name,
        label: name,
        valueTrue: name,
        valueFalse: ''
    };
}

function selectTrait(name: string, values: string[]): TraitProperties {
    return {
        type: 'select',
        name,
        label: name,
        options: values.map(value => ({
            id: value,
            label: value || 'default'
        }))
    };
}

function mergeTraits(...groups: Array<readonly TraitDefinition[]>): TraitDefinition[] {
    const seen = new Set<string>();
    const merged: TraitDefinition[] = [];
    for (const trait of groups.flat()) {
        const name = traitName(trait);
        if (name && seen.has(name)) {
            continue;
        }
        if (name) {
            seen.add(name);
        }
        merged.push(trait);
    }
    return merged;
}

function traitName(trait: TraitDefinition): string {
    return typeof trait === 'string' ? trait : String(trait.name ?? trait.id ?? '');
}

function hasNestedElementOrRazor(element: Element): boolean {
    if (element.querySelector?.('[data-cv-razor-token]')) {
        return true;
    }
    return Array.from(element.children ?? []).length > 0;
}

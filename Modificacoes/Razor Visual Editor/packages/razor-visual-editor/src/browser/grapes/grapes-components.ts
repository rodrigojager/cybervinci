import type { Editor } from 'grapesjs';

interface ComponentRegistry {
    addType(type: string, definition: unknown): void;
}

interface RazorAwareEditor {
    Components?: ComponentRegistry;
    DomComponents?: ComponentRegistry;
}

interface GrapesComponentLike {
    getAttributes?(): Record<string, string>;
    addAttributes?(attributes: Record<string, string>): void;
    set?(property: string | Record<string, unknown>, value?: unknown): void;
}

const EDITABLE_TEXT_TAGS = new Set([
    'a', 'button', 'caption', 'dd', 'dt', 'em', 'figcaption', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'label', 'legend', 'li', 'p', 'small', 'span', 'strong', 'td', 'th'
]);

export function registerRazorGrapesComponents(editor: Editor): void {
    const registry = componentRegistry(editor);
    registry.addType('cv-razor-token', {
        isComponent: (element: Element) => element.hasAttribute?.('data-cv-razor-token'),
        model: {
            defaults: {
                editable: false,
                draggable: false,
                droppable: false,
                selectable: true,
                highlightable: true,
                copyable: false,
                removable: false,
                traits: [
                    { type: 'text', name: 'data-cv-razor-kind', label: 'Tipo Razor', changeProp: false },
                    { type: 'text', name: 'data-cv-razor-token', label: 'Token', changeProp: false }
                ]
            }
        }
    });

    registry.addType('cv-editable-text', {
        extend: 'text',
        isComponent: (element: Element) => {
            const tagName = element.tagName?.toLowerCase();
            if (!tagName || element.hasAttribute?.('data-cv-razor-token') || element.querySelector?.('[data-cv-razor-token]')) {
                return false;
            }
            const hasElementChildren = Array.from(element.children).length > 0;
            if (EDITABLE_TEXT_TAGS.has(tagName) && !hasElementChildren) {
                return { type: 'cv-editable-text', tagName };
            }
            if (tagName === 'div' && !hasElementChildren && element.textContent?.trim()) {
                return { type: 'cv-editable-text', tagName };
            }
            return false;
        },
        model: {
            defaults: {
                editable: true,
                droppable: false
            }
        }
    });

    editor.on('component:add component:update component:selected', candidate => {
        const component = candidate as GrapesComponentLike;
        const attrs = component.getAttributes?.();
        if (!attrs?.['data-cv-razor-token']) {
            return;
        }
        component.set?.({
            editable: false,
            copyable: false,
            removable: false,
            draggable: attrs['data-cv-razor-kind'] === 'InlineExpression'
        });
        component.addAttributes?.({
            contenteditable: 'false',
            'data-cv-razor-token': attrs['data-cv-razor-token'],
            'data-cv-razor-kind': attrs['data-cv-razor-kind'],
            'data-cv-razor-checksum': attrs['data-cv-razor-checksum']
        });
    });
}

export function componentRegistry(editor: Editor): ComponentRegistry {
    const candidate = editor as unknown as RazorAwareEditor;
    const registry = candidate.Components ?? candidate.DomComponents;
    if (!registry) {
        throw new Error('GrapesJS component registry is not available.');
    }
    return registry;
}

import type { Editor, EditorConfig } from 'grapesjs';

type StyleSectors = NonNullable<NonNullable<EditorConfig['styleManager']>['sectors']>;

interface StyleManagerLike {
    getSector?(id: string, options?: { warn?: boolean }): unknown;
    addSector(id: string, sector: unknown, options?: unknown): void;
}

export function createCyberVinciStyleSectors(): StyleSectors {
    return [
        {
            id: 'layout',
            name: 'Layout',
            open: true,
            buildProps: [
                'display', 'position', 'top', 'right', 'bottom', 'left', 'float', 'clear',
                'width', 'min-width', 'max-width', 'height', 'min-height', 'max-height',
                'overflow', 'overflow-x', 'overflow-y', 'box-sizing', 'z-index'
            ]
        },
        {
            id: 'spacing',
            name: 'Spacing',
            open: true,
            buildProps: [
                'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
                'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left'
            ]
        },
        {
            id: 'typography',
            name: 'Typography',
            open: false,
            buildProps: [
                'font-family', 'font-size', 'font-weight', 'font-style', 'color', 'text-align',
                'text-decoration', 'text-transform', 'line-height', 'letter-spacing', 'white-space',
                'word-break', 'overflow-wrap'
            ]
        },
        {
            id: 'background',
            name: 'Background',
            open: false,
            buildProps: [
                'background', 'background-color', 'background-image', 'background-size',
                'background-position', 'background-repeat', 'background-attachment'
            ]
        },
        {
            id: 'border-effects',
            name: 'Border & Effects',
            open: false,
            buildProps: [
                'border', 'border-width', 'border-style', 'border-color', 'border-radius',
                'box-shadow', 'opacity', 'outline', 'outline-offset'
            ]
        },
        {
            id: 'flex-grid',
            name: 'Flex/Grid',
            open: false,
            buildProps: [
                'flex-direction', 'flex-wrap', 'justify-content', 'align-items', 'align-content',
                'align-self', 'flex', 'flex-grow', 'flex-shrink', 'flex-basis', 'order', 'gap',
                'row-gap', 'column-gap', 'grid-template-columns', 'grid-template-rows',
                'grid-column', 'grid-row', 'place-items', 'place-content'
            ]
        },
        {
            id: 'transform',
            name: 'Transform',
            open: false,
            buildProps: [
                'transform', 'transform-origin', 'transition', 'cursor', 'pointer-events',
                'object-fit', 'object-position', 'vertical-align'
            ]
        }
    ];
}

export function configureGrapesStyleManager(editor: Editor): void {
    const styleManager = editor.StyleManager as unknown as StyleManagerLike;

    for (const sector of createCyberVinciStyleSectors()) {
        const id = sector.id;
        if (!id || styleManager.getSector?.(id, { warn: false })) {
            continue;
        }
        styleManager.addSector(id, sector);
    }
}

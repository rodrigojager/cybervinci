import { expect } from 'chai';
import { OpenPencilDocumentService } from './openpencil-document-service';
import { OPENPENCIL_FILE_EXTENSION } from './openpencil-types';

describe('OpenPencilDocumentService', () => {

    const service = new OpenPencilDocumentService();

    it('creates .op documents with a page and editable nodes', () => {
        const document = service.createDesign('Test');

        expect(document.version).to.be.a('string');
        expect(document.pages).to.have.length(1);
        expect(document.activePageId).to.equal(document.pages![0].id);
        expect(document.pages![0].width).to.equal(900);
        expect(document.pages![0].height).to.equal(620);
        expect(document.pages![0].background).to.equal('#ffffff');
        expect(document.pages![0].gridSize).to.equal(20);
        expect(document.pages![0].showGrid).to.equal(true);
        expect(document.pages![0].snapToGrid).to.equal(false);
        expect(document.pages![0].children.map(node => node.id)).to.include('hero-title');
    });

    it('serializes and deserializes OpenPencil JSON', () => {
        const original = service.createDesign('Round trip');
        const serialized = service.serialize(original);
        const parsed = service.deserialize(serialized);

        expect(parsed.name).to.equal('Round trip');
        expect(service.findNode(parsed, 'hero-title')?.type).to.equal('text');
    });

    it('repairs common JSON issues before normalizing .op documents', () => {
        const parsed = service.deserialize(`\uFEFF{
            // OpenPencil files are sometimes hand-edited.
            "version": "0.7.6",
            "activePageId": "page-b",
            "pages": [
                {
                    "id": "page-a",
                    "name": "A",
                    "children": [],
                },
                {
                    "id": "page-b",
                    "name": "B",
                    "children": [
                        { "id": "node-1", "type": "TEXT", "text": "http://example.test//kept", },
                    ],
                },
            ],
        }`);

        expect(parsed.activePageId).to.equal('page-b');
        expect(parsed.pages).to.have.length(2);
        expect(parsed.pages![1].children[0].type).to.equal('text');
        expect(parsed.pages![1].children[0].content).to.equal('http://example.test//kept');
    });

    it('detects the official OpenPencil file extension', () => {
        expect(service.isOpenPencilFile(`design${OPENPENCIL_FILE_EXTENSION}`)).to.equal(true);
        expect(service.isOpenPencilFile('design.json')).to.equal(false);
    });

    it('detects OpenPencil UIKit file extensions without changing editor ownership', () => {
        expect(service.isOpenPencilFile('kit.pen')).to.equal(false);
        expect(service.isOpenPencilUIKitFile('kit.op')).to.equal(true);
        expect(service.isOpenPencilUIKitFile('kit.pen')).to.equal(true);
        expect(service.isOpenPencilUIKitFile('kit.json')).to.equal(false);
    });

    it('migrates legacy root children into a page', () => {
        const parsed = service.deserialize(JSON.stringify({
            version: '0.7.6',
            children: [{ id: 'node-1', type: 'rectangle' }]
        }));

        expect(parsed.pages).to.have.length(1);
        expect(parsed.activePageId).to.equal(parsed.pages![0].id);
        expect(parsed.pages![0].width).to.equal(900);
        expect(parsed.pages![0].height).to.equal(620);
        expect(parsed.pages![0].background).to.equal('#ffffff');
        expect(parsed.pages![0].gridSize).to.equal(20);
        expect(parsed.pages![0].showGrid).to.equal(true);
        expect(parsed.pages![0].snapToGrid).to.equal(false);
        expect(parsed.pages![0].children[0].id).to.equal('node-1');
    });

    it('normalizes invalid active pages to the first page', () => {
        const parsed = service.deserialize(JSON.stringify({
            version: '0.7.6',
            activePageId: 'missing',
            pages: [
                { id: 'page-a', name: 'A', children: [] },
                { id: 'page-b', name: 'B', children: [] }
            ],
            children: []
        }));

        expect(parsed.activePageId).to.equal('page-a');
    });

    it('uses root children as the first page children when pages omit children', () => {
        const parsed = service.deserialize(JSON.stringify({
            version: '0.7.6',
            children: [{ id: 'node-1', type: 'TEXT', text: 'From root' }],
            pages: [{ id: 'page-a', name: 'A' }]
        }));

        expect(parsed.pages).to.have.length(1);
        expect(parsed.pages![0].children[0].id).to.equal('node-1');
        expect(parsed.pages![0].children[0].type).to.equal('text');
        expect(parsed.pages![0].children[0].content).to.equal('From root');
    });

    it('normalizes upstream node aliases, simple styles, duplicate ids, and preserves metadata', () => {
        const parsed = service.deserialize(JSON.stringify({
            version: '0.7.6',
            name: 'Compat',
            activePageId: 'page-a',
            extraDocumentMeta: { source: 'upstream' },
            root: {
                children: [{ id: 'root-title', type: 'TEXT', text: 'Root title', fill: '#111111' }]
            },
            pages: [{
                id: 'page-a',
                name: 'A',
                extraPageMeta: 'keep',
                children: [{
                    id: 'dup',
                    type: 'FRAME',
                    extraNodeMeta: { reusable: true },
                    children: [
                        {
                            id: 'dup',
                            type: 'RECT',
                            fill: '#ff0000',
                            stroke: { thickness: 2, fill: [{ type: 'SOLID', color: '#00ff00' }] },
                            custom: 'preserved'
                        },
                        { id: 'label', type: 'TEXT', text: 'Hello', fill: { color: '#123456' } },
                        { id: 'search-icon', type: 'ICON', iconName: 'search' }
                    ]
                }]
            }]
        }));

        const frame = parsed.pages![0].children[0];
        const rect = frame.children![0];
        const label = frame.children![1];
        const icon = frame.children![2];

        expect(parsed.extraDocumentMeta).to.deep.equal({ source: 'upstream' });
        expect(parsed.children[0].type).to.equal('text');
        expect(parsed.children[0].content).to.equal('Root title');
        expect(parsed.pages![0].extraPageMeta).to.equal('keep');
        expect(frame.type).to.equal('frame');
        expect(frame.extraNodeMeta).to.deep.equal({ reusable: true });
        expect(rect.id).to.equal('dup-2');
        expect(rect.type).to.equal('rectangle');
        expect(rect.fill).to.deep.equal([{ type: 'solid', color: '#ff0000' }]);
        expect(rect.stroke?.color).to.equal('#00ff00');
        expect(rect.stroke?.width).to.equal(2);
        expect(rect.stroke?.thickness).to.equal(2);
        expect(rect.custom).to.equal('preserved');
        expect(label.type).to.equal('text');
        expect(label.content).to.equal('Hello');
        expect(label.fill).to.deep.equal([{ type: 'solid', color: '#123456' }]);
        expect(icon.type).to.equal('icon_font');
        expect(icon.iconFontName).to.equal('search');
    });

    it('normalizes Figma-style node aliases, bounds, and text content', () => {
        const parsed = service.deserialize(JSON.stringify({
            version: '0.7.6',
            pages: [{
                id: 'figma-page',
                name: 'Figma',
                children: [{
                    id: 'figma-frame',
                    type: 'FRAME',
                    absoluteBoundingBox: { x: 12, y: 24, width: 300, height: 180 },
                    children: [{
                        id: 'figma-title',
                        type: 'TEXT',
                        characters: 'Figma text',
                        absoluteBoundingBox: { x: 32, y: 48, width: 220, height: 36 }
                    }]
                }]
            }]
        }));

        const frame = parsed.pages![0].children[0];
        const title = frame.children![0];

        expect(frame.type).to.equal('frame');
        expect(frame.x).to.equal(12);
        expect(frame.width).to.equal(300);
        expect(title.type).to.equal('text');
        expect(title.content).to.equal('Figma text');
        expect(title.y).to.equal(48);
        expect(title.height).to.equal(36);
    });

    it('corrects duplicate page ids predictably', () => {
        const parsed = service.deserialize(JSON.stringify({
            version: '0.7.6',
            pages: [
                { id: 'page-a', name: 'A', children: [] },
                { id: 'page-a', name: 'B', children: [] },
                { id: 'page-a-2', name: 'C', children: [] }
            ],
            children: []
        }));

        expect(parsed.pages!.map(page => page.id)).to.deep.equal(['page-a', 'page-a-2', 'page-a-2-2']);
    });

    it('normalizes and resolves upstream-style variables with themes', () => {
        const parsed = service.deserialize(JSON.stringify({
            version: '0.7.6',
            themes: { Mode: ['Light', 'Dark'] },
            variables: {
                cardColor: {
                    type: 'color',
                    value: [
                        { value: '#ffffff', theme: { Mode: 'Light' } },
                        { value: '#111827', theme: { Mode: 'Dark' } }
                    ]
                },
                spacing: { type: 'number', value: 24 },
                enabledFlag: true
            },
            children: [{
                id: 'card',
                type: 'frame',
                layout: 'vertical',
                gap: '$spacing',
                padding: '$spacing',
                fill: [{ type: 'solid', color: '$cardColor' }],
                enabled: '$enabledFlag',
                children: []
            }]
        }));

        const resolved = service.resolveNodeVariables(parsed.children[0], parsed.variables, { Mode: 'Dark' });

        expect(parsed.variables?.enabledFlag).to.deep.equal({ type: 'boolean', value: true });
        expect(resolved.gap).to.equal(24);
        expect(resolved.padding).to.equal(24);
        expect(resolved.enabled).to.equal(true);
        expect(resolved.fill?.[0].color).to.equal('#111827');
    });

    it('normalizes theme axes and reports validation issues', () => {
        const parsed = service.deserialize(JSON.stringify({
            version: '0.7.6',
            themes: {
                Mode: ['Light', 'Dark', 'Dark'],
                Empty: ['', '   ']
            },
            pages: [{
                id: 'page-a',
                name: 'A',
                children: [{ id: 'node-1', type: 'text', content: 'Valid' }]
            }]
        }));
        const invalid = service.validateDocument({
            version: '0.7.6',
            activePageId: 'missing',
            children: [],
            pages: [{
                id: 'page-a',
                name: 'A',
                children: [
                    { id: 'dup', type: 'text' },
                    { id: 'dup', type: 'unknown' as never }
                ]
            }]
        });

        expect(parsed.themes).to.deep.equal({ Mode: ['Light', 'Dark'] });
        expect(invalid.valid).to.equal(false);
        expect(invalid.issues.map(issue => issue.path)).to.include('/activePageId');
        expect(invalid.issues.map(issue => issue.message).join(' ')).to.contain("Duplicate node id 'dup'");
        expect(invalid.issues.map(issue => issue.message).join(' ')).to.contain("Unknown node type 'unknown'");
    });
});

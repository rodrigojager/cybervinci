import { expect } from 'chai';
import { OpenPencilTemplateService } from './openpencil-template-service';

describe('OpenPencilTemplateService', () => {

    const service = new OpenPencilTemplateService();

    it('lists the built-in UI kit templates', () => {
        expect(service.templates.map(template => template.id)).to.deep.equal(['hero', 'login-form', 'metric-card']);
    });

    it('creates deterministic template nodes through the supplied id generator', () => {
        let index = 0;
        const template = service.createTemplate('login-form', prefix => `${prefix}-${++index}`);

        expect(template.nodes).to.have.length(8);
        expect(template.nodeIds).to.have.members(template.nodes.map(node => node.id));
        expect(new Set(template.nodeIds).size).to.equal(template.nodeIds.length);
        expect(template.nodes.find(node => node.name === 'Login title')?.content).to.equal('Welcome back');
        expect(template.nodes.every(node => typeof node.x === 'number' && typeof node.y === 'number')).to.equal(true);
    });

    it('serializes the built-in templates as reusable .pen components', () => {
        let index = 0;
        const content = service.serializeBuiltinUIKit(prefix => `${prefix}-${++index}`);
        const document = JSON.parse(content);

        expect(document.version).to.equal('2.10');
        expect(document.children).to.have.length(3);
        expect(document.children.map((node: { id: string }) => node.id)).to.deep.equal(['hero', 'login-form', 'metric-card']);
        expect(document.children.every((node: { reusable: boolean; type: string }) => node.reusable === true && node.type === 'frame')).to.equal(true);
        expect(document.children[1].children.some((node: { name: string }) => node.name === 'Login title')).to.equal(true);
        expect(document.children[1].children[0].fill).to.equal('#ffffff');
        expect(document.children[1].children[0].stroke).to.deep.include({ fill: '#cbd5e1', thickness: 1 });
    });

    it('deserializes .pen JSON and extracts reusable components', () => {
        const result = service.deserializeUIKit(JSON.stringify({
            version: '2.10',
            name: 'Imported Kit',
            children: [{
                id: 'button',
                type: 'frame',
                name: 'Primary button',
                reusable: true,
                x: 0,
                y: 0,
                width: 120,
                height: 40,
                children: [{
                    id: 'label',
                    type: 'text',
                    text: 'Save',
                    fill: '#ffffff'
                }]
            }]
        }));

        expect(result.name).to.equal('Imported Kit');
        expect(result.components).to.have.length(1);
        expect(result.components[0].id).to.equal('button');
        expect(result.components[0].nodeIds).to.deep.equal(['button', 'label']);
        expect(result.components[0].node.children?.[0].content).to.equal('Save');
        expect(result.components[0].node.children?.[0].fill?.[0].color).to.equal('#ffffff');
    });

    it('deserializes .op JSON and extracts reusable nodes from pages', () => {
        const result = service.deserializeUIKit(JSON.stringify({
            version: '0.7.6',
            name: 'Design With Components',
            activePageId: 'page-1',
            children: [],
            pages: [{
                id: 'page-1',
                name: 'Page 1',
                children: [{
                    id: 'card-component',
                    type: 'group',
                    name: 'Card component',
                    reusable: true,
                    children: [{
                        id: 'card-surface',
                        type: 'rect',
                        fill: '#ffffff'
                    }]
                }]
            }]
        }));

        expect(result.components).to.have.length(1);
        expect(result.components[0].id).to.equal('card-component');
        expect(result.components[0].node.children?.[0].type).to.equal('rectangle');
    });

    it('imports a small SVG as a group of path nodes', () => {
        let index = 0;
        const imported = service.importSvg(`
            <svg width="24" height="24" viewBox="0 0 24 24">
                <g id="icon" transform="translate(2 3)">
                    <path id="mark" d="M1 1 L10 10" fill="none" stroke="#111827" stroke-width="2" />
                </g>
            </svg>
        `, prefix => `${prefix}-${++index}`, 'Check icon');

        expect(imported.nodes).to.have.length(1);
        expect(imported.nodes[0].type).to.equal('group');
        expect(imported.nodes[0].width).to.equal(24);
        expect(imported.nodes[0].children?.[0].type).to.equal('group');
        expect(imported.nodes[0].children?.[0].x).to.equal(2);
        expect(imported.nodes[0].children?.[0].children?.[0].type).to.equal('path');
        expect(imported.nodes[0].children?.[0].children?.[0].d).to.equal('M1 1 L10 10');
        expect(imported.nodes[0].children?.[0].children?.[0].stroke?.color).to.equal('#111827');
    });
});

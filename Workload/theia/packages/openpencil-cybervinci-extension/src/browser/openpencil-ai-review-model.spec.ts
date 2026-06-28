import { expect } from 'chai';
import { createOpenPencilAiReviewModel } from './openpencil-ai-review-model';
import { OpenPencilDesignOperation, OpenPencilDocument, OpenPencilNode } from '../common/openpencil-types';

describe('OpenPencil AI review model', () => {

    it('summarizes created, changed, removed, operation targets, and selection deltas', () => {
        const before = document([
            textNode('hero-title', 'Hero title', 'Launch faster', 32),
            frameNode('old-card', 'Old card')
        ]);
        const after = document([
            textNode('hero-title', 'Hero title', 'Automate launches', 40),
            frameNode('ai-card', 'AI card')
        ]);
        const operations: OpenPencilDesignOperation[] = [
            { operation: 'updateNode', nodeId: 'hero-title', changes: { content: 'Automate launches', fontSize: 40 } },
            { operation: 'createNode', parentId: null, node: { id: 'ai-card', type: 'frame', name: 'AI card' } },
            { operation: 'deleteNode', nodeId: 'old-card' },
            { operation: 'setSelection', nodeIds: ['hero-title', 'ai-card'] }
        ];

        const model = createOpenPencilAiReviewModel({
            target: 'landing.op',
            sourceLabel: 'CyberVinci provider',
            changed: true,
            validation: { valid: true, issues: [] },
            currentSelection: ['hero-title'],
            previewSelection: ['hero-title', 'ai-card'],
            operations,
            beforeDocument: before,
            afterDocument: after,
            previewArtifact: 'landing.openpencil-ai-preview.json'
        });

        expect(model.canApply).to.equal(true);
        expect(model.selectionChanged).to.equal(true);
        expect(model.impact.created.map(entry => entry.id)).to.deep.equal(['ai-card']);
        expect(model.impact.removed.map(entry => entry.id)).to.deep.equal(['old-card']);
        expect(model.impact.updated.map(entry => entry.node.id)).to.deep.equal(['hero-title']);
        expect(model.impact.updated[0].changes.map(change => change.property)).to.include.members(['content', 'fontSize']);
        expect(model.previewSelection.map(entry => entry.id)).to.deep.equal(['hero-title', 'ai-card']);
        expect(model.operations[0].targets[0].label).to.contain('Hero title');
        expect(model.operations[0].propertyChanges.find(change => change.property === 'content')).to.include({
            before: 'Launch faster',
            after: 'Automate launches'
        });
        expect(model.operations[1].summary).to.equal('Create AI card frame (ai-card) under root');
        expect(model.operations[2].targets[0]).to.include({ id: 'old-card', status: 'removed' });
        expect(model.operations[3].effect).to.equal('selection');
    });

    it('surfaces validation failures and provider diagnostics without allowing apply', () => {
        const source = document([textNode('hero-title', 'Hero title', 'Launch faster', 32)]);
        const operations: OpenPencilDesignOperation[] = [
            { operation: 'updateNode', nodeId: 'missing-node', changes: { content: 'Ignored' } }
        ];

        const model = createOpenPencilAiReviewModel({
            target: 'landing.op',
            diagnostics: ['Provider returned one operation that did not affect the preview.'],
            changed: false,
            message: 'Node missing-node was not found.',
            validation: {
                valid: false,
                issues: [{ severity: 'error', path: 'pages[0].children', message: 'Expected at least one root node.' }]
            },
            currentSelection: [],
            previewSelection: [],
            operations,
            beforeDocument: source,
            afterDocument: source
        });

        expect(model.canApply).to.equal(false);
        expect(model.validationSummary.errors).to.equal(1);
        expect(model.diagnostics).to.deep.equal(['Provider returned one operation that did not affect the preview.']);
        expect(model.operations[0].targets[0]).to.include({ id: 'missing-node', status: 'missing' });
    });
});

function document(children: OpenPencilNode[]): OpenPencilDocument {
    return {
        version: '0.7.6',
        name: 'Landing',
        activePageId: 'page-1',
        pages: [{
            id: 'page-1',
            name: 'Page 1',
            children
        }],
        children: []
    };
}

function textNode(id: string, name: string, content: string, fontSize: number): OpenPencilNode {
    return {
        id,
        name,
        type: 'text',
        content,
        fontSize,
        x: 24,
        y: 24,
        width: 320,
        height: 48
    };
}

function frameNode(id: string, name: string): OpenPencilNode {
    return {
        id,
        name,
        type: 'frame',
        x: 24,
        y: 96,
        width: 240,
        height: 120,
        children: []
    };
}

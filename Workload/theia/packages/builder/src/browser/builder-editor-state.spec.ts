import { expect } from 'chai';
import { createBuilderDocument, serializeBuilderDocumentJson } from '@cybervinci/builder-schema';
import { BuilderEditorState } from './builder-editor-state';

describe('BuilderEditorState', () => {

    it('keeps JSON, document, selection, and property draft synchronized', () => {
        const document = createBuilderDocument({ id: 'shared-state' });
        document.tree.children = [{
            id: 'headline',
            type: 'Title',
            props: {
                children: 'Original'
            }
        }];

        const state = new BuilderEditorState({ sourceName: 'shared-state.builder.json' });
        state.loadJson(serializeBuilderDocumentJson(document));
        state.selectNode('headline');

        expect(state.snapshot.selectedNode?.id).to.equal('headline');
        expect(state.snapshot.propsDraft).to.equal(JSON.stringify({ children: 'Original' }, undefined, 2));

        state.setPropsDraft(JSON.stringify({ children: 'Updated' }));
        const updated = state.applyPropsDraft();

        expect(updated.dirty).to.equal(true);
        expect(updated.selectedNode?.props).to.deep.equal({ children: 'Updated' });
        expect(JSON.parse(updated.json).tree.children[0].props).to.deep.equal({ children: 'Updated' });
    });

    it('updates selected node props immutably only when the resulting document is valid', () => {
        const document = createBuilderDocument({ id: 'validated-props' });
        document.tree.children = [{
            id: 'headline',
            type: 'Title',
            props: {
                children: 'Original'
            }
        }];

        const state = new BuilderEditorState({
            validateDocument: candidate => {
                const headline = candidate.tree.children?.[0];
                return typeof headline?.props?.children === 'string'
                    ? []
                    : [{
                        path: '$.tree.children[0].props.children',
                        message: 'children must be a string.',
                        nodeId: 'headline',
                        componentType: 'Title'
                    }];
            }
        });
        state.loadJson(serializeBuilderDocumentJson(document));
        state.selectNode('headline');

        const valid = state.updateSelectedProps({ children: 'Live update' });
        const previousDocument = valid.document;
        const invalid = state.updateSelectedProps({ children: 42 });

        expect(valid.selectedNode?.props).to.deep.equal({ children: 'Live update' });
        expect(document.tree.children[0].props).to.deep.equal({ children: 'Original' });
        expect(valid.document).to.not.equal(document);
        expect(invalid.document).to.equal(previousDocument);
        expect(invalid.selectedNode?.props).to.deep.equal({ children: 'Live update' });
        expect(JSON.parse(invalid.json).tree.children[0].props).to.deep.equal({ children: 'Live update' });
        expect(invalid.propsError).to.equal('Path: $.tree.children[0].props.children | Component: Title | nodeId: headline | Error: children must be a string.');
    });

    it('falls back to the root selection when JSON removes the selected node', () => {
        const document = createBuilderDocument({ id: 'selection-fallback' });
        document.tree.children = [{
            id: 'copy',
            type: 'Text',
            props: {
                children: 'Body'
            }
        }];

        const state = new BuilderEditorState();
        state.loadJson(serializeBuilderDocumentJson(document));
        state.selectNode('copy');

        document.tree.children = [];
        const snapshot = state.setJson(serializeBuilderDocumentJson(document));

        expect(snapshot.selectedNodeId).to.equal('copy');
        expect(snapshot.selectedNode?.type).to.equal('Text');
        expect(snapshot.hasUnappliedJsonChanges).to.equal(true);

        const applied = state.applyJsonDraft();

        expect(applied.selectedNodeId).to.equal('selection-fallback-root');
        expect(applied.selectedNode?.type).to.equal('Page');
        expect(applied.hasUnappliedJsonChanges).to.equal(false);
    });

    it('keeps the last valid document in the preview state when JSON parse fails', () => {
        const state = new BuilderEditorState({ sourceName: 'invalid.builder.json' });
        const document = createBuilderDocument({ id: 'last-valid' });
        state.loadJson(serializeBuilderDocumentJson(document));

        const snapshot = state.setJson('{ "schemaVersion": ');

        expect(snapshot.document?.metadata.id).to.equal('last-valid');
        expect(snapshot.parseError).to.contain('Invalid Builder JSON in invalid.builder.json.');
        expect(snapshot.dirty).to.equal(true);
        expect(snapshot.hasUnappliedJsonChanges).to.equal(true);
    });

    it('reports Builder schema errors without applying the invalid document', () => {
        const state = new BuilderEditorState();
        const document = createBuilderDocument({ id: 'valid-document' });
        state.loadJson(serializeBuilderDocumentJson(document));

        const invalidDocument = {
            ...document,
            metadata: {
                ...document.metadata,
                id: ''
            }
        };
        const snapshot = state.setJson(JSON.stringify(invalidDocument, undefined, 2));

        expect(snapshot.document?.metadata.id).to.equal('valid-document');
        expect(snapshot.parseError).to.equal(undefined);
        expect(snapshot.hasUnappliedJsonChanges).to.equal(true);
        expect(snapshot.validationMessages).to.deep.equal([
            "Path: $.metadata.id | Error: Required Builder field 'id' must be a non-empty string."
        ]);
    });

    it('formats the current parseable JSON without replacing schema-invalid content with the last valid document', () => {
        const state = new BuilderEditorState();
        const document = createBuilderDocument({ id: 'format-current' });
        state.loadJson(serializeBuilderDocumentJson(document));

        const invalidDocument = {
            ...document,
            metadata: {
                ...document.metadata,
                id: ''
            }
        };
        state.setJson(JSON.stringify(invalidDocument));
        const snapshot = state.formatJson();

        expect(JSON.parse(snapshot.json).metadata.id).to.equal('');
        expect(snapshot.json).to.equal(`${JSON.stringify(invalidDocument, undefined, 2)}\n`);
        expect(snapshot.document?.metadata.id).to.equal('format-current');
        expect(snapshot.hasUnappliedJsonChanges).to.equal(true);
        expect(snapshot.validationMessages).to.deep.equal([
            "Path: $.metadata.id | Error: Required Builder field 'id' must be a non-empty string."
        ]);
    });

    it('leaves invalid JSON untouched when formatting cannot parse the draft', () => {
        const state = new BuilderEditorState();
        const document = createBuilderDocument({ id: 'format-invalid-json' });
        state.loadJson(serializeBuilderDocumentJson(document));

        const draft = '{ "schemaVersion": ';
        const snapshot = state.setJson(draft);
        const formatted = state.formatJson();

        expect(snapshot.parseError).to.not.equal(undefined);
        expect(formatted.json).to.equal(draft);
        expect(formatted.document?.metadata.id).to.equal('format-invalid-json');
        expect(formatted.hasUnappliedJsonChanges).to.equal(true);
    });

    it('keeps validator errors realtime without applying the invalid document', () => {
        const state = new BuilderEditorState({
            validateDocument: candidate => candidate.tree.type === 'Page'
                ? []
                : [{ path: '$.tree.type', message: 'Unknown component type.', nodeId: candidate.tree.id, componentType: candidate.tree.type }]
        });
        const document = createBuilderDocument({ id: 'valid-registry' });
        state.loadJson(serializeBuilderDocumentJson(document));

        const invalidDocument = {
            ...document,
            tree: {
                ...document.tree,
                type: 'UnknownComponent'
            }
        };
        const snapshot = state.setJson(JSON.stringify(invalidDocument, undefined, 2));

        expect(snapshot.document?.tree.type).to.equal('Page');
        expect(snapshot.hasUnappliedJsonChanges).to.equal(true);
        expect(snapshot.validationMessages).to.deep.equal([
            'Path: $.tree.type | Component: UnknownComponent | nodeId: valid-registry-root | Error: Unknown component type.'
        ]);
    });

    it('applies a valid JSON draft to the canonical document only when requested', () => {
        const state = new BuilderEditorState();
        const document = createBuilderDocument({ id: 'manual-apply' });
        state.loadJson(serializeBuilderDocumentJson(document));

        const editedDocument = {
            ...document,
            page: {
                ...document.page,
                title: 'Edited manually'
            }
        };
        const draft = state.setJson(JSON.stringify(editedDocument, undefined, 2));

        expect(draft.document?.page.title).to.equal(document.page.title);
        expect(draft.validationMessages).to.deep.equal([]);
        expect(draft.hasUnappliedJsonChanges).to.equal(true);

        const applied = state.applyJsonDraft();

        expect(applied.document?.page.title).to.equal('Edited manually');
        expect(applied.hasUnappliedJsonChanges).to.equal(false);
    });

    it('does not sync invalid JSON drafts to the preview document when apply is requested', () => {
        const state = new BuilderEditorState({
            sourceName: 'preview-sync.builder.json',
            validateDocument: candidate => candidate.tree.type === 'Page'
                ? []
                : [{ path: '$.tree.type', message: 'Unknown component type.', nodeId: candidate.tree.id, componentType: candidate.tree.type }]
        });
        const document = createBuilderDocument({ id: 'preview-sync' });
        document.page.title = 'Preview title';
        state.loadJson(serializeBuilderDocumentJson(document));

        const invalidJson = state.setJson('{ "schemaVersion": ');
        const afterInvalidJsonApply = state.applyJsonDraft();

        expect(invalidJson.parseError).to.contain('Invalid Builder JSON in preview-sync.builder.json.');
        expect(afterInvalidJsonApply.document?.page.title).to.equal('Preview title');
        expect(afterInvalidJsonApply.hasUnappliedJsonChanges).to.equal(true);

        const invalidSchemaDocument = {
            ...document,
            page: {
                ...document.page,
                title: 'Should not reach preview'
            },
            tree: {
                ...document.tree,
                type: 'UnknownComponent'
            }
        };
        const invalidSchema = state.setJson(JSON.stringify(invalidSchemaDocument, undefined, 2));
        const afterInvalidSchemaApply = state.applyJsonDraft();

        expect(invalidSchema.parseError).to.equal(undefined);
        expect(afterInvalidSchemaApply.validationMessages).to.deep.equal([
            'Path: $.tree.type | Component: UnknownComponent | nodeId: preview-sync-root | Error: Unknown component type.'
        ]);
        expect(afterInvalidSchemaApply.document?.tree.type).to.equal('Page');
        expect(afterInvalidSchemaApply.document?.page.title).to.equal('Preview title');
        expect(afterInvalidSchemaApply.hasUnappliedJsonChanges).to.equal(true);
    });

    it('restores the last valid applied document over an invalid JSON draft', () => {
        const state = new BuilderEditorState({ sourceName: 'restore.builder.json' });
        const document = createBuilderDocument({ id: 'restore-last-applied' });
        state.loadJson(serializeBuilderDocumentJson(document));
        const loadedVersion = state.snapshot.lastAppliedVersion;

        const editedDocument = {
            ...document,
            page: {
                ...document.page,
                title: 'Applied title'
            }
        };
        state.setJson(JSON.stringify(editedDocument, undefined, 2));
        const applied = state.applyJsonDraft();

        const invalidDraft = '{ "schemaVersion": ';
        const invalid = state.setJson(invalidDraft);

        expect(loadedVersion?.version).to.equal(1);
        expect(applied.lastAppliedVersion?.version).to.equal(2);
        expect(invalid.lastAppliedVersion?.version).to.equal(2);
        expect(invalid.parseError).to.contain('Invalid Builder JSON in restore.builder.json.');
        expect(invalid.document?.page.title).to.equal('Applied title');
        expect(invalid.hasUnappliedJsonChanges).to.equal(true);

        const restored = state.restoreLastAppliedDocument();

        expect(restored.parseError).to.equal(undefined);
        expect(restored.validationMessages).to.deep.equal([]);
        expect(restored.lastAppliedVersion?.version).to.equal(2);
        expect(restored.document?.page.title).to.equal('Applied title');
        expect(JSON.parse(restored.json).page.title).to.equal('Applied title');
        expect(restored.hasUnappliedJsonChanges).to.equal(false);
    });

    it('does not create a new local version for invalid schema drafts', () => {
        const state = new BuilderEditorState();
        const document = createBuilderDocument({ id: 'invalid-version' });
        state.loadJson(serializeBuilderDocumentJson(document));

        const invalidDocument = {
            ...document,
            metadata: {
                ...document.metadata,
                id: ''
            }
        };
        state.setJson(JSON.stringify(invalidDocument, undefined, 2));
        const invalid = state.applyJsonDraft();

        expect(invalid.validationMessages).to.deep.equal([
            "Path: $.metadata.id | Error: Required Builder field 'id' must be a non-empty string."
        ]);
        expect(invalid.lastAppliedVersion?.version).to.equal(1);
        expect(invalid.document?.metadata.id).to.equal('invalid-version');
        expect(invalid.hasUnappliedJsonChanges).to.equal(true);
    });

    it('tracks save boundaries so saved JSON reopens cleanly', () => {
        const document = createBuilderDocument({ id: 'save-cycle' });
        document.tree.children = [{
            id: 'copy',
            type: 'Text',
            props: {
                children: 'Draft'
            }
        }];

        const state = new BuilderEditorState({ sourceName: 'save-cycle.builder.json' });
        state.loadJson(serializeBuilderDocumentJson(document));
        state.selectNode('copy');
        state.setPropsDraft(JSON.stringify({ children: 'Saved copy' }));
        const dirty = state.applyPropsDraft();

        expect(dirty.dirty).to.equal(true);

        const formattedJson = `${dirty.json.trim()}\n`;
        const saved = state.markSaved(formattedJson);
        const reopened = new BuilderEditorState({ sourceName: 'save-cycle.builder.json' }).loadJson(saved.json);

        expect(saved.dirty).to.equal(false);
        expect(reopened.parseError).to.equal(undefined);
        expect(reopened.document?.tree.children?.[0].props).to.deep.equal({ children: 'Saved copy' });
    });

    it('syncs externally applied documents to JSON and props without losing the selected node', () => {
        const document = createBuilderDocument({ id: 'external-sync' });
        document.tree.children = [{
            id: 'headline',
            type: 'Title',
            props: {
                children: 'Original'
            }
        }];

        const state = new BuilderEditorState({ sourceName: 'external-sync.builder.json' });
        state.loadJson(serializeBuilderDocumentJson(document));
        state.selectNode('headline');

        const nextDocument = {
            ...document,
            tree: {
                ...document.tree,
                children: [{
                    ...document.tree.children![0],
                    props: {
                        children: 'Changed outside properties panel',
                        order: 1
                    }
                }]
            }
        };
        const snapshot = state.applyDocument(nextDocument);

        expect(snapshot.selectedNodeId).to.equal('headline');
        expect(snapshot.selectedNode?.props).to.deep.equal({
            children: 'Changed outside properties panel',
            order: 1
        });
        expect(snapshot.propsDraft).to.equal(JSON.stringify({
            children: 'Changed outside properties panel',
            order: 1
        }, undefined, 2));
        expect(JSON.parse(snapshot.json).tree.children[0].props).to.deep.equal({
            children: 'Changed outside properties panel',
            order: 1
        });
    });

    it('removes the selected node and falls back to its parent selection', () => {
        const document = createBuilderDocument({ id: 'remove-selected' });
        document.tree.children = [{
            id: 'section',
            type: 'Section',
            children: [{ id: 'copy', type: 'Text' }]
        }];

        const state = new BuilderEditorState();
        state.loadJson(serializeBuilderDocumentJson(document));
        state.selectNode('copy');
        const snapshot = state.removeSelectedNode();

        expect(snapshot.selectedNodeId).to.equal('section');
        expect(snapshot.document?.tree.children?.[0].children).to.deep.equal([]);
        expect(JSON.parse(snapshot.json).tree.children[0].children).to.deep.equal([]);
    });

    it('duplicates the selected node with a fresh id and selects the duplicate', () => {
        const document = createBuilderDocument({ id: 'duplicate-selected' });
        document.tree.children = [{
            id: 'section',
            type: 'Section',
            children: [{ id: 'copy', type: 'Text' }]
        }];

        const state = new BuilderEditorState();
        state.loadJson(serializeBuilderDocumentJson(document));
        state.selectNode('copy');
        const snapshot = state.duplicateSelectedNode();

        expect(snapshot.selectedNodeId).to.equal('copy-copy');
        expect(snapshot.selectedNode?.id).to.equal('copy-copy');
        expect(snapshot.document?.tree.children?.[0].children?.map(node => node.id)).to.deep.equal(['copy', 'copy-copy']);
    });

    it('renames the selected node by storing an editor label in node meta', () => {
        const document = createBuilderDocument({ id: 'rename-selected' });
        document.tree.children = [{
            id: 'hero',
            type: 'HeroSection'
        }];

        const state = new BuilderEditorState();
        state.loadJson(serializeBuilderDocumentJson(document));
        state.selectNode('hero');

        const renamed = state.renameSelectedNode('Main hero');
        expect(renamed.selectedNode?.meta?.label).to.equal('Main hero');
        expect(JSON.parse(renamed.json).tree.children[0].meta.label).to.equal('Main hero');

        const cleared = state.renameSelectedNode('   ');
        expect(cleared.selectedNode?.meta?.label).to.equal(undefined);
        expect(JSON.parse(cleared.json).tree.children[0].meta).to.deep.equal({});
    });

    it('moves the selected node among siblings and keeps it selected', () => {
        const document = createBuilderDocument({ id: 'move-selected' });
        document.tree.children = [
            { id: 'first', type: 'Text' },
            { id: 'second', type: 'Text' },
            { id: 'third', type: 'Text' }
        ];

        const state = new BuilderEditorState();
        state.loadJson(serializeBuilderDocumentJson(document));
        state.selectNode('second');

        const movedDown = state.moveSelectedNode(1);
        expect(movedDown.selectedNodeId).to.equal('second');
        expect(movedDown.document?.tree.children?.map(node => node.id)).to.deep.equal(['first', 'third', 'second']);

        const movedUp = state.moveSelectedNode(-1);
        expect(movedUp.selectedNodeId).to.equal('second');
        expect(movedUp.document?.tree.children?.map(node => node.id)).to.deep.equal(['first', 'second', 'third']);
    });
});

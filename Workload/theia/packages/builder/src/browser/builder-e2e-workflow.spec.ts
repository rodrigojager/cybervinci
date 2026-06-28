import { expect } from 'chai';
import { applyBuilderAiPatch, previewBuilderAiPatch } from '@cybervinci/builder-ai';
import { htmlRenderer } from '@cybervinci/builder-export-html';
import {
    createDefaultBuilderActionRegistry,
    createDefaultBuilderComponentRegistry,
    createDefaultBuilderDataSourceRegistry,
    validateBuilderDocumentActionsAgainstRegistry,
    validateBuilderDocumentDataSourcesAgainstRegistry,
    validateBuilderDocumentTypesAgainstRegistry
} from '@cybervinci/builder-registry';
import {
    deserializeBuilderDocumentJson,
    insertNode,
    serializeBuilderDocumentJson,
    validateBuilderDocumentStructure,
    type BuilderDocument
} from '@cybervinci/builder-schema';
import { BinaryBuffer } from '@theia/core/lib/common/buffer';
import URI from '@theia/core/lib/common/uri';
import { BuilderServiceImpl } from '../node/builder-service';
import { BuilderEditorState, type BuilderEditorValidationIssue } from './builder-editor-state';
import { persistBuilderJsonFile, toBuilderFileVersion, type BuilderFilePersistenceService, type BuilderFileStat } from './builder-file-persistence';

interface StoredFile {
    content: string;
    stat: BuilderFileStat;
}

class MemoryBuilderFileService implements BuilderFilePersistenceService {

    readonly files = new Map<string, StoredFile>();
    protected clock = 1;

    async writeFile(resource: URI, content: BinaryBuffer): Promise<void> {
        this.put(resource, content.toString());
    }

    async stat(resource: URI): Promise<BuilderFileStat> {
        return this.get(resource).stat;
    }

    async resolve(resource: URI): Promise<BuilderFileStat> {
        return this.stat(resource);
    }

    async move(source: URI, target: URI): Promise<void> {
        const sourceFile = this.get(source);
        this.put(target, sourceFile.content);
        this.files.delete(source.toString());
    }

    async read(resource: URI): Promise<{ value: BinaryBuffer } & BuilderFileStat> {
        const file = this.get(resource);
        return {
            ...file.stat,
            value: BinaryBuffer.fromString(file.content)
        };
    }

    put(resource: URI, content: string): void {
        this.files.set(resource.toString(), {
            content,
            stat: {
                mtime: this.clock++,
                size: content.length,
                etag: `etag-${this.clock}-${content.length}`
            }
        });
    }

    protected get(resource: URI): StoredFile {
        const file = this.files.get(resource.toString());
        if (!file) {
            throw new Error(`Missing file ${resource.toString()}`);
        }
        return file;
    }
}

describe('Builder Builder automated E2E workflow', () => {

    const componentRegistry = createDefaultBuilderComponentRegistry();
    const actionRegistry = createDefaultBuilderActionRegistry();
    const dataSourceRegistry = createDefaultBuilderDataSourceRegistry();
    const service = new BuilderServiceImpl();

    const validateDocument = (document: BuilderDocument): BuilderEditorValidationIssue[] => [
        ...validateBuilderDocumentTypesAgainstRegistry(document, componentRegistry).errors,
        ...validateBuilderDocumentActionsAgainstRegistry(document, actionRegistry).errors.map(error => ({
            path: error.path,
            message: error.message
        })),
        ...validateBuilderDocumentDataSourcesAgainstRegistry(document, dataSourceRegistry).errors.map(error => ({
            path: error.path,
            message: error.message
        }))
    ];

    it('covers manual creation, JSON edit, property edit, visual edit, mocked AI generation, acceptance, save, and HTML export', async () => {
        const fileService = new MemoryBuilderFileService();
        const pageUri = new URI('file:///workspace/pages/product-launch.builder.json');

        const created = await service.createDocument({
            id: 'product-launch',
            name: 'Product Launch',
            title: 'Product Launch',
            route: '/product-launch',
            createdBy: 'Builder E2E'
        });
        await persistBuilderJsonFile(fileService, pageUri, created.json);

        const opened = await fileService.read(pageUri);
        const editor = new BuilderEditorState({
            sourceName: pageUri.path.base,
            validateDocument
        });
        const loaded = editor.loadJson(opened.value.toString());
        expect(loaded.parseError).to.equal(undefined);
        expect(loaded.document?.page.title).to.equal('Product Launch');

        const jsonEdited = deserializeBuilderDocumentJson(loaded.json);
        jsonEdited.page.title = 'Product Launch JSON Draft';
        jsonEdited.tree.children = [{
            id: 'hero',
            type: 'HeroSection',
            props: {
                eyebrow: 'Manual JSON',
                title: 'Launch faster',
                subtitle: 'The first section was authored directly in canonical Builder JSON.',
                primaryActionLabel: 'Start'
            }
        }];

        const draft = editor.setJson(`${serializeBuilderDocumentJson(jsonEdited, { space: 2 })}\n`);
        expect(draft.hasUnappliedJsonChanges).to.equal(true);
        expect(draft.document?.page.title).to.equal('Product Launch');

        const appliedJson = editor.applyJsonDraft();
        expect(appliedJson.hasUnappliedJsonChanges).to.equal(false);
        expect(appliedJson.document?.page.title).to.equal('Product Launch JSON Draft');

        editor.selectNode('hero');
        const propertyEdited = editor.updateSelectedProps({
            eyebrow: 'Property panel',
            title: 'Launch from properties',
            subtitle: 'The selected component was updated through the property workflow.',
            primaryActionLabel: 'Request demo'
        });
        expect(propertyEdited.propsError).to.equal(undefined);
        expect(propertyEdited.document?.tree.children?.[0].props?.title).to.equal('Launch from properties');

        const visualDocument = insertNode(propertyEdited.document!, {
            parentId: propertyEdited.document!.tree.id,
            index: 1,
            node: componentRegistry.createDefaultNode('FeatureGrid', {
                id: 'visual-feature-grid',
                existingTree: propertyEdited.document!.tree
            })
        });
        visualDocument.tree.children![1].props = {
            title: 'Visual editor additions',
            description: 'This section represents a drag-and-drop insertion.',
            features: [
                { title: 'Schema canonical', description: 'Puck-style visual edits are persisted as Builder nodes.' }
            ]
        };
        const visualEdited = editor.applyDocument(visualDocument);
        expect(visualEdited.document?.tree.children?.map(node => node.id)).to.deep.equal(['hero', 'visual-feature-grid']);

        const aiResult = await service.generateUiWithAi({
            prompt: 'Create a polished launch landing page for the product',
            currentJson: visualEdited.json
        });
        const preview = previewBuilderAiPatch(aiResult.patch, {
            currentDocument: visualEdited.document!,
            componentRegistry,
            actionRegistry,
            dataSourceRegistry
        });
        expect(preview.requiresAcceptance).to.equal(true);
        expect(preview.diff.length).to.be.greaterThan(0);
        expect(visualEdited.document?.tree.children?.map(node => node.id)).to.deep.equal(['hero', 'visual-feature-grid']);

        const accepted = applyBuilderAiPatch(aiResult.patch, {
            currentDocument: visualEdited.document!,
            componentRegistry,
            actionRegistry,
            dataSourceRegistry
        });
        const aiEdited = editor.applyDocument(accepted.document);
        expect(aiEdited.document?.tree.children?.map(node => node.id)).to.deep.equal([
            'ai-landing-hero',
            'ai-landing-features',
            'ai-landing-cta'
        ]);

        const structural = validateBuilderDocumentStructure(aiEdited.document!);
        const componentValidation = validateBuilderDocumentTypesAgainstRegistry(aiEdited.document!, componentRegistry);
        expect(structural).to.deep.equal({ valid: true, errors: [] });
        expect(componentValidation).to.deep.equal({ valid: true, errors: [] });

        await persistBuilderJsonFile(fileService, pageUri, aiEdited.json, {
            expectedVersion: toBuilderFileVersion(opened)
        });
        const saved = deserializeBuilderDocumentJson((await fileService.read(pageUri)).value.toString());
        expect(saved.tree.children?.[0].id).to.equal('ai-landing-hero');

        const exported = htmlRenderer(saved, { registry: componentRegistry });
        expect(exported.files).to.have.keys(['index.html', 'styles.css']);
        expect(exported.files['index.html']).to.contain('<title>Create a polished launch landing page for the product</title>');
        expect(exported.files['index.html']).to.contain('AI generated draft');
        expect(exported.files['styles.css']).to.contain('.builder-button');
    });
});

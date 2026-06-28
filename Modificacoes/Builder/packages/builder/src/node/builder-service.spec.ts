import { expect } from 'chai';
import { deserializeBuilderDocumentJson, serializeBuilderDocumentJson } from '@cybervinci/builder-schema';
import { BuilderServiceImpl } from './builder-service';

describe('BuilderServiceImpl', () => {

    it('creates a valid .builder.json document for a new UI page', async () => {
        const service = new BuilderServiceImpl();

        const result = await service.createDocument({
            id: 'customer-dashboard',
            name: 'Customer Dashboard',
            title: 'Customer Dashboard',
            route: '/customer-dashboard',
            createdBy: 'spec'
        });
        const document = deserializeBuilderDocumentJson(result.json, {
            sourceName: 'customer-dashboard.builder.json'
        });

        expect(result.json.endsWith('\n')).to.equal(true);
        expect(document.metadata.id).to.equal('customer-dashboard');
        expect(document.metadata.name).to.equal('Customer Dashboard');
        expect(document.metadata.createdBy).to.equal('spec');
        expect(document.page.route).to.equal('/customer-dashboard');
        expect(document.tree.type).to.equal('Page');
    });

    it('rejects invalid documents before export', async () => {
        const service = new BuilderServiceImpl();

        try {
            await service.exportHtml({ json: '{ "schemaVersion": ' });
            expect.fail('Expected exportHtml to reject invalid JSON.');
        } catch (error) {
            expect(error).to.be.instanceOf(Error);
            expect((error as Error).message).to.contain('Invalid Builder JSON in Builder Builder export request.');
        }
    });

    it('exports a valid document as the initial static HTML artifact set', async () => {
        const service = new BuilderServiceImpl();
        const created = await service.createDocument({
            id: 'exportable-page',
            title: 'Exportable Page'
        });

        const result = await service.exportHtml({ json: created.json });

        expect(Object.keys(result.files)).to.have.members(['index.html', 'styles.css']);
        expect(result.files['index.html']).to.contain('Exportable Page');
        expect(result.files['index.html']).to.contain('styles.css');
    });

    it('validates current JSON before returning a structured AI patch', async () => {
        const service = new BuilderServiceImpl();
        const created = await service.createDocument({
            id: 'ai-page'
        });

        const result = await service.generateUiWithAi({
            prompt: 'Create a landing page',
            currentJson: serializeBuilderDocumentJson(deserializeBuilderDocumentJson(created.json))
        });

        expect(result.patch.requiresAcceptance).to.equal(true);
        const [operation] = result.patch.operations;
        expect(operation.type).to.equal('replacePage');
        if (operation.type !== 'replacePage') {
            expect.fail('Expected a replacePage operation.');
        }
        expect(operation.payload.document.page.title).to.equal('Create a landing page');
        expect(operation.payload.document.tree.children?.map(node => node.type)).to.deep.equal(['HeroSection', 'FeatureGrid', 'CTASection']);
    });

    it('returns a selected-component updateNodeProps AI patch when a node is selected', async () => {
        const service = new BuilderServiceImpl();
        const created = await service.createDocument({
            id: 'selected-ai'
        });
        const document = deserializeBuilderDocumentJson(created.json);
        document.tree.children = [{
            id: 'headline',
            type: 'Title',
            props: {
                children: 'Original'
            }
        }];

        const result = await service.generateUiWithAi({
            prompt: 'Make this headline clearer',
            currentJson: serializeBuilderDocumentJson(document),
            selectedNodeId: 'headline',
            operationScope: 'selectedComponent'
        });

        expect(result.patch.requiresAcceptance).to.equal(true);
        expect(result.patch.operations).to.have.length(1);
        const [operation] = result.patch.operations;
        expect(operation.type).to.equal('updateNodeProps');
        if (operation.type !== 'updateNodeProps') {
            expect.fail('Expected an updateNodeProps operation.');
        }
        expect(operation.payload.nodeId).to.equal('headline');
        expect(operation.payload.props.children).to.equal('Make this headline clearer');
    });

    it('returns a selected-component insertNode AI patch for insertion requests', async () => {
        const service = new BuilderServiceImpl();
        const created = await service.createDocument({
            id: 'insert-ai'
        });

        const result = await service.generateUiWithAi({
            prompt: 'add a button',
            currentJson: created.json,
            selectedNodeId: 'insert-ai-root',
            operationScope: 'selectedComponent'
        });

        const [operation] = result.patch.operations;
        expect(operation.type).to.equal('insertNode');
        if (operation.type !== 'insertNode') {
            expect.fail('Expected an insertNode operation.');
        }
        expect(operation.payload.parentNodeId).to.equal('insert-ai-root');
        expect(operation.payload.node.type).to.equal('Button');
    });

    it('stores page drafts as tenant-scoped immutable versions without requiring a database', async () => {
        const service = new BuilderServiceImpl();
        const first = await service.createDocument({ id: 'landing', title: 'Landing v1' });
        const saved = await service.savePage({
            tenantId: 'tenant-a',
            workspaceId: 'workspace-a',
            pageId: 'landing',
            json: first.json,
            actor: { id: 'author' },
            changeSummary: 'Initial draft'
        });
        const secondDocument = deserializeBuilderDocumentJson(first.json);
        secondDocument.page.title = 'Landing v2';
        const updated = await service.savePage({
            tenantId: 'tenant-a',
            workspaceId: 'workspace-a',
            pageId: 'landing',
            json: serializeBuilderDocumentJson(secondDocument),
            expectedCurrentVersionId: saved.version.versionId,
            actor: { id: 'author' },
            changeSummary: 'Rename page'
        });

        expect(saved.version.versionId).to.equal('v1');
        expect(updated.version.versionId).to.equal('v2');
        expect(updated.page.currentVersionId).to.equal('v2');
        expect(updated.page.status).to.equal('draft');
        expect((await service.getPage({
            tenantId: 'tenant-a',
            workspaceId: 'workspace-a',
            pageId: 'landing',
            versionId: 'v1'
        })).version.json).to.contain('Landing v1');
        expect((await service.listPages({
            tenantId: 'tenant-a',
            workspaceId: 'workspace-a'
        })).pages.map(page => page.pageId)).to.deep.equal(['landing']);
        expect((await service.listPages({
            tenantId: 'tenant-b',
            workspaceId: 'workspace-a'
        })).pages).to.deep.equal([]);
    });

    it('rejects stale saves using the expected current version contract', async () => {
        const service = new BuilderServiceImpl();
        const created = await service.createDocument({ id: 'conflict' });
        await service.savePage({
            tenantId: 'tenant-a',
            pageId: 'conflict',
            json: created.json
        });

        try {
            await service.savePage({
                tenantId: 'tenant-a',
                pageId: 'conflict',
                json: created.json,
                expectedCurrentVersionId: 'missing'
            });
            expect.fail('Expected a stale version save to fail.');
        } catch (error) {
            expect((error as Error).message).to.contain('current version changed');
        }
    });

    it('publishes and unpublishes pages while preserving version history', async () => {
        const service = new BuilderServiceImpl();
        const created = await service.createDocument({ id: 'publishable', title: 'Publishable' });
        const saved = await service.savePage({
            tenantId: 'tenant-a',
            pageId: 'publishable',
            json: created.json,
            actor: { id: 'editor' }
        });
        const published = await service.publishPage({
            tenantId: 'tenant-a',
            pageId: 'publishable',
            versionId: saved.version.versionId,
            actor: { id: 'publisher' },
            message: 'Go live'
        });

        expect(published.page.status).to.equal('published');
        expect(published.page.publishedVersionId).to.equal('v1');
        expect((await service.getPage({
            tenantId: 'tenant-a',
            pageId: 'publishable',
            published: true
        })).version.versionId).to.equal('v1');

        const unpublished = await service.unpublishPage({
            tenantId: 'tenant-a',
            pageId: 'publishable',
            actor: { id: 'publisher' },
            message: 'Take down'
        });
        const history = await service.listPageHistory({
            tenantId: 'tenant-a',
            pageId: 'publishable'
        });

        expect(unpublished.page.status).to.equal('unpublished');
        expect(unpublished.page.publishedVersionId).to.equal(undefined);
        expect(history.entries.map(entry => entry.eventType)).to.deep.equal(['unpublished', 'published', 'created']);
    });
});

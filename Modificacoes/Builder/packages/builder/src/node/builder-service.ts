import { createEmptyHtmlExport } from '@cybervinci/builder-export-html';
import { createDefaultBuilderComponentRegistry } from '@cybervinci/builder-registry';
import { createBuilderDocument, deserializeBuilderDocumentJson, findNodeById, serializeBuilderDocumentJson, type BuilderDocument, type BuilderJsonValue, type BuilderNode } from '@cybervinci/builder-schema';
import { injectable } from '@theia/core/shared/inversify';
import {
    BuilderService,
    BuilderCreateDocumentRequest,
    BuilderCreateDocumentResult,
    BuilderExportHtmlRequest,
    BuilderExportHtmlResult,
    BuilderGenerateUiWithAiRequest,
    BuilderGenerateUiWithAiResult,
    BuilderGetPageRequest,
    BuilderGetPageResult,
    BuilderListPagesRequest,
    BuilderListPagesResult,
    BuilderPageHistoryEntry,
    BuilderPageHistoryRequest,
    BuilderPageHistoryResult,
    BuilderPersistenceActor,
    BuilderPublishPageRequest,
    BuilderPublishPageResult,
    BuilderSavePageRequest,
    BuilderSavePageResult,
    BuilderStoredPageSummary,
    BuilderStoredPageVersion,
    BuilderUnpublishPageRequest,
    BuilderUnpublishPageResult
} from '../common';

interface BuilderStoredPageRecord {
    page: BuilderStoredPageSummary;
    versions: BuilderStoredPageVersion[];
    history: BuilderPageHistoryEntry[];
}

@injectable()
export class BuilderServiceImpl implements BuilderService {

    protected readonly pages = new Map<string, BuilderStoredPageRecord>();
    protected readonly componentRegistry = createDefaultBuilderComponentRegistry();

    async createDocument(request: BuilderCreateDocumentRequest): Promise<BuilderCreateDocumentResult> {
        const document = createBuilderDocument({
            id: request.id,
            name: request.name,
            title: request.title,
            route: request.route,
            createdBy: request.createdBy ?? 'CyberVinci UI Builder'
        });

        return {
            json: `${serializeBuilderDocumentJson(document, { space: 2 })}\n`
        };
    }

    async exportHtml(request: BuilderExportHtmlRequest): Promise<BuilderExportHtmlResult> {
        const document = deserializeBuilderDocumentJson(request.json, {
            sourceName: 'Builder Builder export request'
        });
        const result = createEmptyHtmlExport(document);
        return {
            files: result.files
        };
    }

    async generateUiWithAi(request: BuilderGenerateUiWithAiRequest): Promise<BuilderGenerateUiWithAiResult> {
        const prompt = request.prompt.trim();
        if (!prompt) {
            throw new Error('A prompt is required to generate UI with AI.');
        }
        const currentDocument = request.currentJson
            ? deserializeBuilderDocumentJson(request.currentJson, {
                sourceName: 'Builder Builder AI request'
            })
            : createBuilderDocument({
                id: 'ai-generated-page',
                title: prompt
            });
        if (request.operationScope === 'selectedComponent') {
            return this.generateSelectedComponentPatch(prompt, currentDocument, request.selectedNodeId);
        }
        const title = prompt.length > 80 ? `${prompt.slice(0, 77)}...` : prompt;
        const document: BuilderDocument = {
            ...currentDocument,
            metadata: {
                ...currentDocument.metadata,
                updatedAt: new Date().toISOString()
            },
            page: {
                ...currentDocument.page,
                title
            },
            tree: {
                ...currentDocument.tree,
                props: {
                    ...(currentDocument.tree.props ?? {}),
                    title,
                    description: 'AI generated landing page draft'
                },
                children: [{
                    id: 'ai-landing-hero',
                    type: 'HeroSection',
                    props: {
                        eyebrow: 'AI generated draft',
                        title,
                        subtitle: 'A structured Builder landing page generated from your prompt. Review the preview, inspect the diff, then accept to save it as canonical JSON.',
                        primaryActionLabel: 'Get started',
                        secondaryActionLabel: 'Learn more',
                        align: 'left'
                    }
                }, {
                    id: 'ai-landing-features',
                    type: 'FeatureGrid',
                    props: {
                        title: 'Why this page works',
                        description: 'Key sections are generated as Builder Schema components, not JSX or raw HTML.',
                        columns: 3,
                        features: [
                            {
                                title: 'Clear offer',
                                description: 'The hero communicates the main value proposition quickly.'
                            },
                            {
                                title: 'Structured content',
                                description: 'Every block is editable through JSON, properties, and visual tools.'
                            },
                            {
                                title: 'Safe workflow',
                                description: 'The AI output is validated and requires acceptance before saving.'
                            }
                        ]
                    }
                }, {
                    id: 'ai-landing-cta',
                    type: 'CTASection',
                    props: {
                        title: 'Ready to publish the first draft?',
                        description: 'Accept this patch to save the generated landing page as Builder JSON.',
                        primaryActionLabel: 'Accept draft',
                        secondaryActionLabel: 'Refine prompt',
                        align: 'center'
                    }
                }]
            }
        };
        return {
            patch: {
                operations: [{
                    type: 'replacePage',
                    payload: {
                        document,
                        reason: `Generated landing page from prompt: ${prompt}`
                    }
                }],
                summary: `Generated landing page draft for: ${prompt}`,
                requiresAcceptance: true
            }
        };
    }

    protected generateSelectedComponentPatch(
        prompt: string,
        currentDocument: BuilderDocument,
        selectedNodeId: string | undefined
    ): BuilderGenerateUiWithAiResult {
        if (!selectedNodeId) {
            throw new Error('A selected component is required for this AI change.');
        }
        const selected = findNodeById(currentDocument.tree, selectedNodeId)?.node;
        if (!selected) {
            throw new Error(`Selected Builder node '${selectedNodeId}' was not found.`);
        }

        if (this.isInsertPrompt(prompt)) {
            const type = this.inferComponentType(prompt);
            const node = this.componentRegistry.createDefaultNode(type, {
                id: this.createGeneratedNodeId(currentDocument, selectedNodeId, type),
                existingTree: currentDocument.tree
            });
            return {
                patch: {
                    operations: [{
                        type: 'insertNode',
                        payload: {
                            parentNodeId: selectedNodeId,
                            node
                        }
                    }],
                    summary: `Insert ${type} inside ${selected.type}.`,
                    requiresAcceptance: true
                }
            };
        }

        return {
            patch: {
                operations: [{
                    type: 'updateNodeProps',
                    payload: {
                        nodeId: selectedNodeId,
                        props: this.createUpdatedPropsForPrompt(selected.type, selected.props, prompt)
                    }
                }],
                summary: `Update selected ${selected.type} props.`,
                requiresAcceptance: true
            }
        };
    }

    protected createUpdatedPropsForPrompt(type: string, props: Record<string, BuilderJsonValue> | undefined, prompt: string): Record<string, BuilderJsonValue> {
        const currentProps = props ?? {};
        if (type === 'HeroSection') {
            return {
                ...currentProps,
                subtitle: prompt
            };
        }
        if (type === 'Button') {
            return {
                ...currentProps,
                children: prompt.length > 40 ? prompt.slice(0, 40) : prompt
            };
        }
        if (type === 'Title' || type === 'Text' || type === 'Badge' || type === 'Anchor') {
            return {
                ...currentProps,
                children: prompt
            };
        }
        if (type === 'MetricCard' || type === 'StatCard') {
            return {
                ...currentProps,
                label: prompt
            };
        }
        return {
            ...currentProps,
            title: prompt
        };
    }

    protected isInsertPrompt(prompt: string): boolean {
        return /\b(add|insert|create|append|include|adicionar|inserir|criar|inclua|colocar)\b/i.test(prompt);
    }

    protected inferComponentType(prompt: string): string {
        if (/\b(button|botao|botão|cta)\b/i.test(prompt)) {
            return 'Button';
        }
        if (/\b(title|titulo|título|heading|headline)\b/i.test(prompt)) {
            return 'Title';
        }
        if (/\b(card|cartao|cartão)\b/i.test(prompt)) {
            return 'Card';
        }
        return 'Text';
    }

    protected createGeneratedNodeId(document: BuilderDocument, parentId: string, type: string): string {
        const existingIds = new Set<string>();
        const collect = (node: BuilderNode): void => {
            existingIds.add(node.id);
            node.children?.forEach(collect);
            Object.values(node.slots ?? {}).forEach(nodes => nodes.forEach(collect));
        };
        collect(document.tree);

        const base = `${parentId}-${type}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'ai-node';
        let candidate = base;
        let suffix = 2;
        while (existingIds.has(candidate)) {
            candidate = `${base}-${suffix++}`;
        }
        return candidate;
    }

    async savePage(request: BuilderSavePageRequest): Promise<BuilderSavePageResult> {
        this.assertScopedPageRequest(request);
        const document = deserializeBuilderDocumentJson(request.json, {
            sourceName: 'Builder Builder save request'
        });
        const now = new Date().toISOString();
        const key = this.pageKey(request);
        const existing = this.pages.get(key);

        if (existing && request.expectedCurrentVersionId && existing.page.currentVersionId !== request.expectedCurrentVersionId) {
            throw new Error(`Cannot save Builder page '${request.pageId}' because the current version changed.`);
        }

        const versionNumber = existing ? existing.versions.length + 1 : 1;
        const version: BuilderStoredPageVersion = {
            tenantId: request.tenantId,
            workspaceId: request.workspaceId,
            pageId: request.pageId,
            versionId: `v${versionNumber}`,
            versionNumber,
            json: `${serializeBuilderDocumentJson(document, { space: 2 })}\n`,
            schemaVersion: document.schemaVersion,
            createdAt: now,
            createdBy: request.actor,
            changeSummary: request.changeSummary
        };
        const page: BuilderStoredPageSummary = {
            tenantId: request.tenantId,
            workspaceId: request.workspaceId,
            pageId: request.pageId,
            title: document.page.title,
            route: document.page.route,
            status: existing?.page.status ?? 'draft',
            currentVersionId: version.versionId,
            publishedVersionId: existing?.page.publishedVersionId,
            schemaVersion: document.schemaVersion,
            createdAt: existing?.page.createdAt ?? now,
            updatedAt: now,
            createdBy: existing?.page.createdBy ?? request.actor,
            updatedBy: request.actor
        };
        const record: BuilderStoredPageRecord = existing ?? { page, versions: [], history: [] };
        record.page = page;
        record.versions = [...record.versions, version];
        record.history = [...record.history, this.createHistoryEntry(page, version, existing ? 'updated' : 'created', request.actor, request.changeSummary)];
        this.pages.set(key, record);

        return { page, version };
    }

    async getPage(request: BuilderGetPageRequest): Promise<BuilderGetPageResult> {
        const record = this.getRecord(request);
        const versionId = request.published ? record.page.publishedVersionId : request.versionId ?? record.page.currentVersionId;
        if (!versionId) {
            throw new Error(`Builder page '${request.pageId}' has no published version.`);
        }
        const version = this.getVersion(record, request.pageId, versionId);
        return { page: record.page, version };
    }

    async listPages(request: BuilderListPagesRequest): Promise<BuilderListPagesResult> {
        this.assertTenantScope(request);
        const pages = [...this.pages.values()]
            .map(record => record.page)
            .filter(page => page.tenantId === request.tenantId && page.workspaceId === request.workspaceId)
            .filter(page => request.status === undefined || page.status === request.status)
            .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
        return { pages };
    }

    async publishPage(request: BuilderPublishPageRequest): Promise<BuilderPublishPageResult> {
        const record = this.getRecord(request);
        const version = this.getVersion(record, request.pageId, request.versionId ?? record.page.currentVersionId);
        record.page = {
            ...record.page,
            status: 'published',
            publishedVersionId: version.versionId,
            updatedAt: new Date().toISOString(),
            updatedBy: request.actor
        };
        record.history = [...record.history, this.createHistoryEntry(record.page, version, 'published', request.actor, request.message)];
        return { page: record.page, publishedVersion: version };
    }

    async unpublishPage(request: BuilderUnpublishPageRequest): Promise<BuilderUnpublishPageResult> {
        const record = this.getRecord(request);
        const version = this.getVersion(record, request.pageId, record.page.currentVersionId);
        record.page = {
            ...record.page,
            status: 'unpublished',
            publishedVersionId: undefined,
            updatedAt: new Date().toISOString(),
            updatedBy: request.actor
        };
        record.history = [...record.history, this.createHistoryEntry(record.page, version, 'unpublished', request.actor, request.message)];
        return { page: record.page };
    }

    async listPageHistory(request: BuilderPageHistoryRequest): Promise<BuilderPageHistoryResult> {
        const record = this.getRecord(request);
        const entries = [...record.history].reverse();
        return {
            entries: request.limit === undefined ? entries : entries.slice(0, Math.max(0, request.limit))
        };
    }

    protected createHistoryEntry(
        page: BuilderStoredPageSummary,
        version: BuilderStoredPageVersion,
        eventType: BuilderPageHistoryEntry['eventType'],
        actor: BuilderPersistenceActor | undefined,
        message: string | undefined
    ): BuilderPageHistoryEntry {
        return {
            tenantId: page.tenantId,
            workspaceId: page.workspaceId,
            pageId: page.pageId,
            versionId: version.versionId,
            eventType,
            versionNumber: version.versionNumber,
            timestamp: new Date().toISOString(),
            actor,
            message
        };
    }

    protected getRecord(request: { tenantId: string; workspaceId?: string; pageId: string }): BuilderStoredPageRecord {
        this.assertScopedPageRequest(request);
        const record = this.pages.get(this.pageKey(request));
        if (!record) {
            throw new Error(`Builder page '${request.pageId}' was not found for tenant '${request.tenantId}'.`);
        }
        return record;
    }

    protected getVersion(record: BuilderStoredPageRecord, pageId: string, versionId: string): BuilderStoredPageVersion {
        const version = record.versions.find(candidate => candidate.versionId === versionId);
        if (!version) {
            throw new Error(`Builder page '${pageId}' version '${versionId}' was not found.`);
        }
        return version;
    }

    protected pageKey(request: { tenantId: string; workspaceId?: string; pageId: string }): string {
        return `${request.tenantId}\u0000${request.workspaceId ?? ''}\u0000${request.pageId}`;
    }

    protected assertScopedPageRequest(request: { tenantId: string; pageId: string }): void {
        this.assertTenantScope(request);
        if (!request.pageId.trim()) {
            throw new Error('A pageId is required for Builder page persistence.');
        }
    }

    protected assertTenantScope(request: { tenantId: string }): void {
        if (!request.tenantId.trim()) {
            throw new Error('A tenantId is required for Builder page persistence.');
        }
    }
}

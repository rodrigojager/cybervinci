import type { BuilderAiPatch } from '@cybervinci/builder-ai';

export const BUILDER_EXTENSION_ID = 'cybervinci.builder';
export const Builder_FILE_EXTENSION = '.cvpage.json';
export const BUILDER_LEGACY_FILE_EXTENSION = '.builder.json';
export const BUILDER_V0_FILE_EXTENSION = '.cvui.json';
export const BUILDER_FILE_EXTENSIONS = [Builder_FILE_EXTENSION, BUILDER_LEGACY_FILE_EXTENSION, BUILDER_V0_FILE_EXTENSION] as const;
export const BUILDER_SERVICE_PATH = '/services/cybervinci/builder';

export function isBuilderFileName(path: string): boolean {
    return BUILDER_FILE_EXTENSIONS.some(extension => path.endsWith(extension));
}

export const BuilderService = Symbol('BuilderService');

export interface BuilderService {
    createDocument(request: BuilderCreateDocumentRequest): Promise<BuilderCreateDocumentResult>;
    exportHtml(request: BuilderExportHtmlRequest): Promise<BuilderExportHtmlResult>;
    generateUiWithAi(request: BuilderGenerateUiWithAiRequest): Promise<BuilderGenerateUiWithAiResult>;
    savePage(request: BuilderSavePageRequest): Promise<BuilderSavePageResult>;
    getPage(request: BuilderGetPageRequest): Promise<BuilderGetPageResult>;
    listPages(request: BuilderListPagesRequest): Promise<BuilderListPagesResult>;
    publishPage(request: BuilderPublishPageRequest): Promise<BuilderPublishPageResult>;
    unpublishPage(request: BuilderUnpublishPageRequest): Promise<BuilderUnpublishPageResult>;
    listPageHistory(request: BuilderPageHistoryRequest): Promise<BuilderPageHistoryResult>;
}

export interface BuilderCreateDocumentRequest {
    id?: string;
    name?: string;
    title?: string;
    route?: string;
    createdBy?: string;
}

export interface BuilderCreateDocumentResult {
    json: string;
}

export interface BuilderExportHtmlRequest {
    json: string;
}

export interface BuilderExportHtmlResult {
    files: Record<string, string>;
}

export interface BuilderGenerateUiWithAiRequest {
    prompt: string;
    currentJson?: string;
    selectedNodeId?: string;
    operationScope?: 'selectedComponent';
}

export interface BuilderGenerateUiWithAiResult {
    patch: BuilderAiPatch;
}

export type BuilderPageLifecycleStatus = 'draft' | 'published' | 'unpublished' | 'archived';
export type BuilderPageHistoryEventType = 'created' | 'updated' | 'published' | 'unpublished' | 'archived';

export interface BuilderTenantScope {
    tenantId: string;
    workspaceId?: string;
}

export interface BuilderPageIdentity extends BuilderTenantScope {
    pageId: string;
}

export interface BuilderPageVersionIdentity extends BuilderPageIdentity {
    versionId: string;
}

export interface BuilderPersistenceActor {
    id: string;
    displayName?: string;
}

export interface BuilderStoredPageSummary extends BuilderPageIdentity {
    title: string;
    route?: string;
    status: BuilderPageLifecycleStatus;
    currentVersionId: string;
    publishedVersionId?: string;
    schemaVersion: string;
    createdAt: string;
    updatedAt: string;
    createdBy?: BuilderPersistenceActor;
    updatedBy?: BuilderPersistenceActor;
}

export interface BuilderStoredPageVersion extends BuilderPageVersionIdentity {
    versionNumber: number;
    json: string;
    schemaVersion: string;
    createdAt: string;
    createdBy?: BuilderPersistenceActor;
    changeSummary?: string;
}

export interface BuilderPageHistoryEntry extends BuilderPageVersionIdentity {
    eventType: BuilderPageHistoryEventType;
    versionNumber: number;
    timestamp: string;
    actor?: BuilderPersistenceActor;
    message?: string;
}

export interface BuilderSavePageRequest extends BuilderPageIdentity {
    json: string;
    actor?: BuilderPersistenceActor;
    expectedCurrentVersionId?: string;
    changeSummary?: string;
}

export interface BuilderSavePageResult {
    page: BuilderStoredPageSummary;
    version: BuilderStoredPageVersion;
}

export interface BuilderGetPageRequest extends BuilderPageIdentity {
    versionId?: string;
    published?: boolean;
}

export interface BuilderGetPageResult {
    page: BuilderStoredPageSummary;
    version: BuilderStoredPageVersion;
}

export interface BuilderListPagesRequest extends BuilderTenantScope {
    status?: BuilderPageLifecycleStatus;
}

export interface BuilderListPagesResult {
    pages: BuilderStoredPageSummary[];
}

export interface BuilderPublishPageRequest extends BuilderPageIdentity {
    actor?: BuilderPersistenceActor;
    versionId?: string;
    message?: string;
}

export interface BuilderPublishPageResult {
    page: BuilderStoredPageSummary;
    publishedVersion: BuilderStoredPageVersion;
}

export interface BuilderUnpublishPageRequest extends BuilderPageIdentity {
    actor?: BuilderPersistenceActor;
    message?: string;
}

export interface BuilderUnpublishPageResult {
    page: BuilderStoredPageSummary;
}

export interface BuilderPageHistoryRequest extends BuilderPageIdentity {
    limit?: number;
}

export interface BuilderPageHistoryResult {
    entries: BuilderPageHistoryEntry[];
}

export namespace BuilderCommands {
    export const OPEN = {
        id: 'builder.open',
        label: 'CyberVinci: Open Page Builder'
    };

    export const NEW_PAGE = {
        id: 'cybervinci.newUiPage',
        label: 'CyberVinci: New Page'
    };

    export const OPEN_PAGE_JSON = {
        id: 'builder.openPageJson',
        label: 'CyberVinci: Open Page JSON'
    };

    export const SAVE_PAGE = {
        id: 'builder.savePage',
        label: 'CyberVinci: Save Page'
    };

    export const PREVIEW_PAGE = {
        id: 'builder.previewPage',
        label: 'CyberVinci: Preview Page'
    };

    export const EXPORT_HTML = {
        id: 'builder.exportHtml',
        label: 'CyberVinci: Export UI to HTML'
    };

    export const EXPORT_REACT = {
        id: 'builder.exportReact',
        label: 'CyberVinci: Export React Component'
    };

    export const GENERATE_UI_WITH_AI = {
        id: 'builder.generateUiWithAi',
        label: 'CyberVinci: Generate UI with AI'
    };

    export namespace Legacy {
        export const CVUI_OPEN = { id: 'cvui-builder.open' };
        export const CVUI_EXPORT_HTML = { id: 'cvui-builder.exportHtml' };
        export const CVUI_GENERATE_UI_WITH_AI = { id: 'cvui-builder.generateUiWithAi' };
    }
}

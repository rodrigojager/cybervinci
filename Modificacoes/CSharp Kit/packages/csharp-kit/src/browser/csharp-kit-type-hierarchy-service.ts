import { CancellationToken, Disposable } from '@theia/core';
import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { FileUri } from '@theia/core/lib/common/file-uri';
import URI from '@theia/core/lib/common/uri';
import { inject, injectable } from '@theia/core/shared/inversify';
import { DocumentUri, Position, Range, SymbolKind, SymbolTag } from '@theia/core/shared/vscode-languageserver-protocol';
import { LanguageSelector } from '@theia/editor/lib/common/language-selector';
import * as monaco from '@theia/monaco-editor-core';
import { TypeHierarchyItem as ServiceTypeHierarchyItem } from '@theia/typehierarchy/lib/browser/typehierarchy';
import { TypeHierarchyService, TypeHierarchySession } from '@theia/typehierarchy/lib/browser/typehierarchy-service';
import {
    ResolveTypeHierarchyItemParams,
    TypeHierarchyDirection,
    TypeHierarchyItem as ProviderTypeHierarchyItem,
    TypeHierarchyParams,
    TypeHierarchyProvider,
    TypeHierarchyRegistry
} from '@theia/typehierarchy/lib/browser/typehierarchy-provider';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import {
    CSharpKitService,
    CSharpLanguageServerAdapterLanguage,
    CSharpLanguageServerTypeHierarchyItem,
    CSharpWorkspaceSymbolRange
} from '../common';

interface CSharpKitTypeHierarchySession {
    items: Map<string, CSharpLanguageServerTypeHierarchyItem>;
}

@injectable()
export class CSharpKitTypeHierarchyService implements TypeHierarchyService, FrontendApplicationContribution {

    readonly selector: LanguageSelector = [
        { language: 'csharp', scheme: 'file' },
        { language: 'razor', scheme: 'file' },
        { pattern: '**/*.cshtml', scheme: 'file' },
        { pattern: '**/*.razor', scheme: 'file' }
    ];

    @inject(CSharpKitService)
    protected readonly service: CSharpKitService;

    @inject(WorkspaceService)
    protected readonly workspaceService: WorkspaceService;

    @inject(TypeHierarchyRegistry)
    protected readonly registry: TypeHierarchyRegistry;

    protected sessionCounter = 0;
    protected itemCounter = 0;
    protected readonly sessions = new Map<string, CSharpKitTypeHierarchySession>();
    protected readonly registryDisposables: Disposable[] = [];

    initialize(): void {
        this.registryDisposables.push(
            this.registry.register(this.createProvider('csharp')),
            this.registry.register(this.createProvider('razor'))
        );
    }

    async prepareSession(uri: DocumentUri, position: Position, cancellationToken: CancellationToken): Promise<TypeHierarchySession | undefined> {
        if (cancellationToken.isCancellationRequested) {
            return undefined;
        }
        const items = await this.prepare(uri, position, this.languageServerLanguage(uri));
        if (!items?.length || cancellationToken.isCancellationRequested) {
            return undefined;
        }
        const sessionId = `csharp-kit-type-hierarchy-${++this.sessionCounter}`;
        this.sessions.set(sessionId, { items: new Map() });
        return {
            items: this.cacheSessionItems(sessionId, items),
            dispose: () => {
                this.sessions.delete(sessionId);
            }
        };
    }

    async provideSuperTypes(sessionId: string, itemId: string, cancellationToken: CancellationToken): Promise<ServiceTypeHierarchyItem[] | undefined> {
        if (cancellationToken.isCancellationRequested) {
            return undefined;
        }
        const item = this.sessions.get(sessionId)?.items.get(itemId);
        if (!item) {
            return undefined;
        }
        const items = await this.relatedItems(item, TypeHierarchyDirection.Parents, this.languageServerLanguage(item.uri));
        return items && !cancellationToken.isCancellationRequested ? this.cacheSessionItems(sessionId, items) : undefined;
    }

    async provideSubTypes(sessionId: string, itemId: string, cancellationToken: CancellationToken): Promise<ServiceTypeHierarchyItem[] | undefined> {
        if (cancellationToken.isCancellationRequested) {
            return undefined;
        }
        const item = this.sessions.get(sessionId)?.items.get(itemId);
        if (!item) {
            return undefined;
        }
        const items = await this.relatedItems(item, TypeHierarchyDirection.Children, this.languageServerLanguage(item.uri));
        return items && !cancellationToken.isCancellationRequested ? this.cacheSessionItems(sessionId, items) : undefined;
    }

    protected createProvider(languageId: CSharpLanguageServerAdapterLanguage): TypeHierarchyProvider {
        return {
            languageId,
            get: params => this.getProviderItem(params, languageId),
            resolve: params => this.resolveProviderItem(params, languageId),
            dispose: () => undefined
        };
    }

    protected async getProviderItem(params: TypeHierarchyParams, language: CSharpLanguageServerAdapterLanguage): Promise<ProviderTypeHierarchyItem | undefined> {
        const items = await this.prepare(params.textDocument.uri, params.position, language);
        if (!items?.length) {
            return undefined;
        }
        const item = this.toProviderItem(items[0]);
        return params.resolve && params.direction !== undefined
            ? this.resolveProviderItem({ item, resolve: params.resolve, direction: params.direction }, language)
            : item;
    }

    protected async resolveProviderItem(params: ResolveTypeHierarchyItemParams, language: CSharpLanguageServerAdapterLanguage): Promise<ProviderTypeHierarchyItem | undefined> {
        if (!params.resolve) {
            return params.item;
        }
        const source = this.toCSharpTypeHierarchyItem(params.item);
        const resolved = this.toProviderItem(source);
        if (params.direction === TypeHierarchyDirection.Parents || params.direction === TypeHierarchyDirection.Both) {
            const parents = await this.relatedItems(source, TypeHierarchyDirection.Parents, language);
            if (!parents) {
                return undefined;
            }
            resolved.parents = parents.map(item => this.toProviderItem(item));
        }
        if (params.direction === TypeHierarchyDirection.Children || params.direction === TypeHierarchyDirection.Both) {
            const children = await this.relatedItems(source, TypeHierarchyDirection.Children, language);
            if (!children) {
                return undefined;
            }
            resolved.children = children.map(item => this.toProviderItem(item));
        }
        return resolved;
    }

    protected async prepare(uri: DocumentUri, position: Position, language: CSharpLanguageServerAdapterLanguage): Promise<CSharpLanguageServerTypeHierarchyItem[] | undefined> {
        const workspacePath = await this.workspacePath();
        if (!workspacePath) {
            return undefined;
        }
        const documentUri = monaco.Uri.parse(uri);
        const model = monaco.editor.getModel(documentUri);
        if (!model || documentUri.scheme !== 'file') {
            return undefined;
        }
        try {
            const result = await this.service.prepareLanguageServerTypeHierarchy({
                workspacePath,
                documentPath: FileUri.fsPath(uri),
                content: model.getValue(),
                line: position.line + 1,
                column: position.character + 1,
                language
            });
            return result.source === 'language-server' ? result.items : undefined;
        } catch {
            return undefined;
        }
    }

    protected async relatedItems(
        item: CSharpLanguageServerTypeHierarchyItem,
        direction: TypeHierarchyDirection.Children | TypeHierarchyDirection.Parents,
        language: CSharpLanguageServerAdapterLanguage
    ): Promise<CSharpLanguageServerTypeHierarchyItem[] | undefined> {
        const workspacePath = await this.workspacePath();
        if (!workspacePath) {
            return undefined;
        }
        try {
            const result = direction === TypeHierarchyDirection.Parents
                ? await this.service.getLanguageServerTypeHierarchySupertypes({ workspacePath, item, language })
                : await this.service.getLanguageServerTypeHierarchySubtypes({ workspacePath, item, language });
            return result.source === 'language-server' ? result.items : undefined;
        } catch {
            return undefined;
        }
    }

    protected cacheSessionItems(sessionId: string, items: CSharpLanguageServerTypeHierarchyItem[]): ServiceTypeHierarchyItem[] {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return [];
        }
        return items.map(item => {
            const itemId = (++this.itemCounter).toString(36);
            session.items.set(itemId, item);
            return this.toServiceItem(item, sessionId, itemId);
        });
    }

    protected toServiceItem(item: CSharpLanguageServerTypeHierarchyItem, sessionId: string, itemId: string): ServiceTypeHierarchyItem {
        return {
            _sessionId: sessionId,
            _itemId: itemId,
            kind: this.toSymbolKind(item.kind),
            tags: item.tags?.map(tag => tag as SymbolTag),
            name: item.name,
            detail: item.detail,
            uri: new URI(item.uri).toComponents(),
            range: this.toLspRange(item.range),
            selectionRange: this.toLspRange(item.selectionRange)
        };
    }

    protected toProviderItem(item: CSharpLanguageServerTypeHierarchyItem): ProviderTypeHierarchyItem {
        return {
            name: item.name,
            detail: item.detail,
            kind: this.toSymbolKind(item.kind),
            uri: item.uri,
            range: this.toLspRange(item.range),
            selectionRange: this.toLspRange(item.selectionRange),
            data: item.data
        };
    }

    protected toCSharpTypeHierarchyItem(item: ProviderTypeHierarchyItem): CSharpLanguageServerTypeHierarchyItem {
        return {
            name: item.name,
            kind: item.kind,
            uri: item.uri,
            range: this.fromLspRange(item.range),
            selectionRange: this.fromLspRange(item.selectionRange),
            detail: item.detail,
            data: item.data
        };
    }

    protected toLspRange(range: CSharpWorkspaceSymbolRange): Range {
        return {
            start: {
                line: Math.max(0, range.line - 1),
                character: Math.max(0, range.column - 1)
            },
            end: {
                line: Math.max(0, range.endLine - 1),
                character: Math.max(0, range.endColumn - 1)
            }
        };
    }

    protected fromLspRange(range: Range): CSharpWorkspaceSymbolRange {
        return {
            line: range.start.line + 1,
            column: range.start.character + 1,
            endLine: range.end.line + 1,
            endColumn: range.end.character + 1
        };
    }

    protected toSymbolKind(kind: number): SymbolKind {
        return Number.isFinite(kind) && kind >= SymbolKind.File && kind <= SymbolKind.TypeParameter
            ? kind as SymbolKind
            : SymbolKind.Property;
    }

    protected languageServerLanguage(uri: string): CSharpLanguageServerAdapterLanguage {
        const lower = uri.toLowerCase();
        return lower.endsWith('.cshtml') || lower.endsWith('.razor') ? 'razor' : 'csharp';
    }

    protected async workspacePath(): Promise<string | undefined> {
        const roots = await this.workspaceService.roots;
        return roots[0] ? FileUri.fsPath(roots[0].resource.toString()) : undefined;
    }
}

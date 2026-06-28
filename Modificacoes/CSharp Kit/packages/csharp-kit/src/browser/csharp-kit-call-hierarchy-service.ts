import { CancellationToken } from '@theia/core';
import { FileUri } from '@theia/core/lib/common/file-uri';
import URI from '@theia/core/lib/common/uri';
import { inject, injectable } from '@theia/core/shared/inversify';
import { DocumentUri, Position, Range, SymbolKind, SymbolTag } from '@theia/core/shared/vscode-languageserver-protocol';
import { LanguageSelector } from '@theia/editor/lib/common/language-selector';
import * as monaco from '@theia/monaco-editor-core';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { CallHierarchyIncomingCall, CallHierarchyItem, CallHierarchyOutgoingCall } from '@theia/callhierarchy/lib/browser/callhierarchy';
import { CallHierarchyService, CallHierarchySession } from '@theia/callhierarchy/lib/browser/callhierarchy-service';
import {
    CSharpKitService,
    CSharpLanguageServerAdapterLanguage,
    CSharpLanguageServerCallHierarchyIncomingCall,
    CSharpLanguageServerCallHierarchyItem,
    CSharpLanguageServerCallHierarchyOutgoingCall,
    CSharpWorkspaceSymbolRange
} from '../common';

@injectable()
export class CSharpKitCallHierarchyService implements CallHierarchyService {

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

    async getRootDefinition(uri: DocumentUri, position: Position, _cancellationToken: CancellationToken): Promise<CallHierarchySession | undefined> {
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
            const result = await this.service.prepareLanguageServerCallHierarchy({
                workspacePath,
                documentPath: FileUri.fsPath(uri),
                content: model.getValue(),
                line: position.line + 1,
                column: position.character + 1,
                language: this.languageServerLanguage(uri)
            });
            if (result.source !== 'language-server' || !result.items.length) {
                return undefined;
            }
            return {
                items: result.items.map(item => this.toCallHierarchyItem(item)),
                dispose: () => undefined
            };
        } catch {
            return undefined;
        }
    }

    async getCallers(definition: CallHierarchyItem, _cancellationToken: CancellationToken): Promise<CallHierarchyIncomingCall[] | undefined> {
        const workspacePath = await this.workspacePath();
        if (!workspacePath) {
            return undefined;
        }
        try {
            const uri = URI.fromComponents(definition.uri).toString();
            const result = await this.service.getLanguageServerCallHierarchyIncomingCalls({
                workspacePath,
                item: this.toCSharpCallHierarchyItem(definition),
                language: this.languageServerLanguage(uri)
            });
            if (result.source !== 'language-server') {
                return undefined;
            }
            return result.calls.map(call => this.toIncomingCall(call));
        } catch {
            return undefined;
        }
    }

    async getCallees(definition: CallHierarchyItem, _cancellationToken: CancellationToken): Promise<CallHierarchyOutgoingCall[] | undefined> {
        const workspacePath = await this.workspacePath();
        if (!workspacePath) {
            return undefined;
        }
        try {
            const uri = URI.fromComponents(definition.uri).toString();
            const result = await this.service.getLanguageServerCallHierarchyOutgoingCalls({
                workspacePath,
                item: this.toCSharpCallHierarchyItem(definition),
                language: this.languageServerLanguage(uri)
            });
            if (result.source !== 'language-server') {
                return undefined;
            }
            return result.calls.map(call => this.toOutgoingCall(call));
        } catch {
            return undefined;
        }
    }

    protected toIncomingCall(call: CSharpLanguageServerCallHierarchyIncomingCall): CallHierarchyIncomingCall {
        return {
            from: this.toCallHierarchyItem(call.from),
            fromRanges: call.fromRanges.map(range => this.toLspRange(range))
        };
    }

    protected toOutgoingCall(call: CSharpLanguageServerCallHierarchyOutgoingCall): CallHierarchyOutgoingCall {
        return {
            to: this.toCallHierarchyItem(call.to),
            fromRanges: call.fromRanges.map(range => this.toLspRange(range))
        };
    }

    protected toCallHierarchyItem(item: CSharpLanguageServerCallHierarchyItem): CallHierarchyItem {
        return {
            kind: this.toSymbolKind(item.kind),
            name: item.name,
            detail: item.detail,
            uri: new URI(item.uri).toComponents(),
            range: this.toLspRange(item.range),
            selectionRange: this.toLspRange(item.selectionRange),
            tags: item.tags?.map(tag => tag as SymbolTag),
            data: item.data
        };
    }

    protected toCSharpCallHierarchyItem(item: CallHierarchyItem): CSharpLanguageServerCallHierarchyItem {
        return {
            name: item.name,
            kind: item.kind,
            uri: URI.fromComponents(item.uri).toString(),
            range: this.fromLspRange(item.range),
            selectionRange: this.fromLspRange(item.selectionRange),
            detail: item.detail,
            tags: item.tags?.map(tag => tag as number),
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

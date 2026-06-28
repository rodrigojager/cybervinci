import { CommandContribution, CommandRegistry, CommandService, DisposableCollection, MessageService, nls } from '@theia/core/lib/common';
import { FileUri } from '@theia/core/lib/common/file-uri';
import { FrontendApplication, FrontendApplicationContribution } from '@theia/core/lib/browser';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { FileChange, FileChangeType, FileOperation, FileOperationEvent } from '@theia/filesystem/lib/common/files';
import { inject, injectable, preDestroy } from '@theia/core/shared/inversify';
import { MonacoWorkspace } from '@theia/monaco/lib/browser/monaco-workspace';
import * as monaco from '@theia/monaco-editor-core';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import {
    MemoryDashboard,
    MemoryRelation,
    MemoryService,
    MemorySymbol,
    MemoryWorkspaceSettings
} from '../common';
import { MemoryCommands } from './memory-commands';

@injectable()
export class MemoryEditorContribution implements FrontendApplicationContribution, CommandContribution {

    protected static readonly ADD_CONTEXT_VARIABLE_COMMAND = 'add-context-variable';

    @inject(MemoryService)
    protected readonly memoryService: MemoryService;

    @inject(WorkspaceService)
    protected readonly workspaceService: WorkspaceService;

    @inject(CommandService)
    protected readonly commandService: CommandService;

    @inject(MessageService)
    protected readonly messageService: MessageService;

    @inject(MonacoWorkspace)
    protected readonly monacoWorkspace: MonacoWorkspace;

    @inject(FileService)
    protected readonly fileService: FileService;

    protected readonly toDispose = new DisposableCollection();
    protected readonly lastEditedEvent = new Map<string, number>();
    protected readonly lastFileSystemEvent = new Map<string, number>();

    onStart(_app: FrontendApplication): void {
        this.toDispose.push(monaco.languages.registerHoverProvider('csharp', {
            provideHover: (model, position) => this.provideCSharpHover(model, position)
        }));
        this.toDispose.push(this.monacoWorkspace.onDidOpenTextDocument(model => {
            const uri = model.uri;
            this.recordFileEvent('file.opened', uri);
            this.recordFileEvent('file.read', uri);
        }));
        this.toDispose.push(this.monacoWorkspace.onDidChangeTextDocument(event => {
            const uri = event.model.uri;
            const now = Date.now();
            const last = this.lastEditedEvent.get(uri) ?? 0;
            if (now - last < 5000) {
                return;
            }
            this.lastEditedEvent.set(uri, now);
            this.recordFileEvent('file.edited', uri);
        }));
        this.toDispose.push(this.monacoWorkspace.onDidSaveTextDocument(model => {
            this.recordFileEvent('file.saved', model.uri);
        }));
        this.toDispose.push(this.fileService.onDidRunOperation(event => {
            this.recordFileOperationEvent(event);
        }));
        this.toDispose.push(this.fileService.onDidFilesChange(event => {
            for (const change of event.changes) {
                this.recordFileChangeEvent(change);
            }
        }));
    }

    @preDestroy()
    protected dispose(): void {
        this.toDispose.dispose();
    }

    registerCommands(registry: CommandRegistry): void {
        registry.registerCommand(MemoryCommands.ADD_FILE_TO_CONTEXT, {
            execute: (relativePath?: string) => this.addFileToContext(relativePath)
        });
        registry.registerCommand(MemoryCommands.ADD_CURRENT_SELECTION_TO_CONTEXT, {
            execute: () => this.addCurrentEditorFileToContext()
        });
        registry.registerCommand(MemoryCommands.SHOW_SYMBOL_RELATIONS, {
            execute: async (symbolName?: string) => {
                await this.commandService.executeCommand(MemoryCommands.OPEN_CODE_GRAPH.id);
                if (symbolName) {
                    this.messageService.info(nls.localize('theia/memory/symbolRelationsOpened', 'Showing Memory graph for {0}.', symbolName));
                }
            }
        });
    }

    protected async provideCSharpHover(model: monaco.editor.ITextModel, position: monaco.Position): Promise<monaco.languages.Hover | undefined> {
        const word = model.getWordAtPosition(position);
        if (!word?.word) {
            return undefined;
        }
        const workspacePath = await this.getWorkspacePath();
        if (!workspacePath) {
            return undefined;
        }
        const dashboard = await this.memoryService.getDashboard(workspacePath);
        if (dashboard.settings.editorHoverEnabled === false || dashboard.settings.optIn?.editorHover === false) {
            return undefined;
        }
        const relativePath = this.relativePath(workspacePath, FileUri.fsPath(model.uri.toString()));
        const symbols = dashboard.symbols.filter(symbol => symbol.name === word.word && this.symbolPath(symbol, dashboard) === relativePath);
        const symbol = symbols[0] ?? dashboard.symbols.find(candidate => candidate.name === word.word);
        if (!symbol) {
            return undefined;
        }
        const relations = this.symbolRelations(symbol, dashboard).slice(0, 5);
        const memories = dashboard.memories
            .filter(memory => `${memory.title} ${memory.content}`.toLowerCase().includes(symbol.name.toLowerCase()))
            .slice(0, 3);
        const relationLine = relations.length
            ? relations.map(relation => `${relation.relationType} ${this.otherRelationLabel(symbol, relation, dashboard)}`).join(', ')
            : 'No direct graph relations indexed.';
        const memoryLine = memories.length ? memories.map(memory => memory.title).join(', ') : 'No related memories indexed.';
        const commandArg = encodeURIComponent(JSON.stringify(relativePath));
        const symbolArg = encodeURIComponent(JSON.stringify(symbol.name));
        return {
            range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
            contents: [
                { value: `**Memory: ${symbol.name}**` },
                { value: `${symbol.symbolKind}${symbol.signature ? ` - ${symbol.signature}` : ''}` },
                { value: `Relations: ${relationLine}` },
                { value: `Memories: ${memoryLine}` },
                {
                    value: `[Open graph](command:${MemoryCommands.SHOW_SYMBOL_RELATIONS.id}?${symbolArg})  [Add file to Context Cart](command:${MemoryCommands.ADD_FILE_TO_CONTEXT.id}?${commandArg})`,
                    isTrusted: true
                }
            ]
        };
    }

    protected async addCurrentEditorFileToContext(): Promise<void> {
        const editor = monaco.editor.getEditors().find(candidate => candidate.hasTextFocus());
        const model = editor?.getModel();
        const workspacePath = await this.getWorkspacePath();
        if (!model || !workspacePath) {
            return;
        }
        await this.addFileToContext(this.relativePath(workspacePath, FileUri.fsPath(model.uri.toString())));
    }

    protected async addFileToContext(relativePath?: string): Promise<void> {
        if (!relativePath) {
            return;
        }
        try {
            await this.commandService.executeCommand(MemoryEditorContribution.ADD_CONTEXT_VARIABLE_COMMAND, 'file', relativePath);
        } catch {
            // The event is the fallback for builds without the chat Context Cart command.
        }
        window.dispatchEvent(new CustomEvent('memory:add-context', {
            detail: {
                kind: 'file',
                relativePath,
                source: 'memory-editor'
            }
        }));
        const workspacePath = await this.getWorkspacePath();
        if (workspacePath) {
            this.memoryService.recordEvent({
                workspacePath,
                eventType: 'context.accepted',
                relativePath,
                payload: JSON.stringify({ source: 'memory-editor', status: 'accepted' })
            }).catch(() => undefined);
            this.memoryService.recordEvent({
                workspacePath,
                eventType: 'file.read',
                relativePath,
                payload: JSON.stringify({ source: 'memory-editor-context' })
            }).catch(() => undefined);
        }
        this.messageService.info(nls.localize('theia/memory/contextAdded', 'Added {0} to the Context Cart.', relativePath));
    }

    protected async recordFileEvent(eventType: 'file.opened' | 'file.read' | 'file.edited' | 'file.saved', uri: string): Promise<void> {
        const workspacePath = await this.getWorkspacePath();
        if (!workspacePath || !uri.startsWith('file:')) {
            return;
        }
        const settings = await this.memoryService.getSettings(workspacePath);
        if (!this.canRecordFileEvent(eventType, settings)) {
            return;
        }
        const relativePath = this.relativePath(workspacePath, FileUri.fsPath(uri));
        if (!relativePath || relativePath === FileUri.fsPath(uri)) {
            return;
        }
        this.memoryService.recordEvent({
            workspacePath,
            eventType,
            relativePath,
            payload: JSON.stringify({ source: 'monaco-workspace' })
        }).catch(() => undefined);
    }

    protected async recordFileOperationEvent(event: FileOperationEvent): Promise<void> {
        switch (event.operation) {
            case FileOperation.CREATE:
                if (!event.target) {
                    return;
                }
                await this.recordFileSystemEvent('file.created', event.target.resource.toString(), {
                    source: 'file-service-operation',
                    operation: 'create',
                    sizeBytes: event.target.size
                });
                break;
            case FileOperation.DELETE:
                await this.recordFileSystemEvent('file.deleted', event.resource.toString(), {
                    source: 'file-service-operation',
                    operation: 'delete'
                });
                break;
            case FileOperation.MOVE:
                if (!event.target) {
                    return;
                }
                await this.recordFileSystemEvent('file.renamed', event.target.resource.toString(), {
                    source: 'file-service-operation',
                    operation: 'move',
                    fromRelativePath: await this.relativePathForUri(event.resource.toString()),
                    sizeBytes: event.target.size
                });
                break;
            default:
                break;
        }
    }

    protected async recordFileChangeEvent(change: FileChange): Promise<void> {
        const eventType = this.fileChangeEventType(change.type);
        if (!eventType) {
            return;
        }
        await this.recordFileSystemEvent(eventType, change.resource.toString(), {
            source: 'file-service-watch',
            changeType: this.fileChangeTypeLabel(change.type)
        }, 1500);
    }

    protected fileChangeTypeLabel(type: FileChangeType): 'UPDATED' | 'ADDED' | 'DELETED' | 'UNKNOWN' {
        switch (type) {
            case FileChangeType.UPDATED:
                return 'UPDATED';
            case FileChangeType.ADDED:
                return 'ADDED';
            case FileChangeType.DELETED:
                return 'DELETED';
            default:
                return 'UNKNOWN';
        }
    }

    protected fileChangeEventType(type: FileChangeType): 'file.created' | 'file.edited' | 'file.deleted' | undefined {
        switch (type) {
            case FileChangeType.ADDED:
                return 'file.created';
            case FileChangeType.UPDATED:
                return 'file.edited';
            case FileChangeType.DELETED:
                return 'file.deleted';
            default:
                return undefined;
        }
    }

    protected async recordFileSystemEvent(
        eventType: 'file.created' | 'file.edited' | 'file.deleted' | 'file.renamed',
        uri: string,
        payload: Record<string, unknown>,
        dedupeWindowMs = 500
    ): Promise<void> {
        const workspacePath = await this.getWorkspacePath();
        const relativePath = await this.relativePathForUri(uri, workspacePath);
        if (!workspacePath || !relativePath) {
            return;
        }
        const settings = await this.memoryService.getSettings(workspacePath);
        if (!this.canRecordFileEvent(eventType, settings)) {
            return;
        }
        const dedupeKey = `${eventType}:${workspacePath}:${relativePath}`;
        const now = Date.now();
        const last = this.lastFileSystemEvent.get(dedupeKey) ?? 0;
        if (now - last < dedupeWindowMs) {
            return;
        }
        this.lastFileSystemEvent.set(dedupeKey, now);
        this.memoryService.recordEvent({
            workspacePath,
            eventType,
            relativePath,
            payload: JSON.stringify(payload)
        }).catch(() => undefined);
    }

    protected canRecordFileEvent(
        eventType: 'file.opened' | 'file.read' | 'file.edited' | 'file.saved' | 'file.created' | 'file.deleted' | 'file.renamed',
        settings: MemoryWorkspaceSettings
    ): boolean {
        if (settings.enabled !== true) {
            return false;
        }
        if (settings.optIn?.events === true) {
            return true;
        }
        return settings.optIn?.codeGraph === true
            && (eventType === 'file.created'
                || eventType === 'file.edited'
                || eventType === 'file.saved'
                || eventType === 'file.deleted'
                || eventType === 'file.renamed');
    }

    protected async relativePathForUri(uri: string, workspacePath?: string): Promise<string | undefined> {
        const resolvedWorkspacePath = workspacePath ?? await this.getWorkspacePath();
        if (!resolvedWorkspacePath || !uri.startsWith('file:')) {
            return undefined;
        }
        const absolutePath = FileUri.fsPath(uri);
        const relativePath = this.relativePath(resolvedWorkspacePath, absolutePath);
        return relativePath && relativePath !== absolutePath ? relativePath : undefined;
    }

    protected symbolRelations(symbol: MemorySymbol, dashboard: MemoryDashboard): MemoryRelation[] {
        return dashboard.relations.filter(relation => relation.sourceId === symbol.id || relation.targetId === symbol.id);
    }

    protected otherRelationLabel(symbol: MemorySymbol, relation: MemoryRelation, dashboard: MemoryDashboard): string {
        const otherId = relation.sourceId === symbol.id ? relation.targetId : relation.sourceId;
        const relatedSymbol = dashboard.symbols.find(candidate => candidate.id === otherId);
        if (relatedSymbol) {
            return relatedSymbol.name;
        }
        const relatedFile = dashboard.files.find(candidate => candidate.id === otherId);
        return relatedFile?.fileName ?? otherId;
    }

    protected symbolPath(symbol: MemorySymbol, dashboard: MemoryDashboard): string | undefined {
        return dashboard.files.find(file => file.id === symbol.fileId)?.relativePath;
    }

    protected async getWorkspacePath(): Promise<string | undefined> {
        const roots = await this.workspaceService.roots;
        return roots[0] ? FileUri.fsPath(roots[0].resource.toString()) : undefined;
    }

    protected relativePath(workspacePath: string, absolutePath: string): string {
        const normalizedWorkspace = workspacePath.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
        const normalizedPath = absolutePath.replace(/\\/g, '/');
        const lowerPath = normalizedPath.toLowerCase();
        if (lowerPath.startsWith(`${normalizedWorkspace}/`)) {
            return normalizedPath.slice(normalizedWorkspace.length + 1);
        }
        return normalizedPath;
    }
}

// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { inject, injectable } from '@theia/core/shared/inversify';
import { FileUri } from '@theia/core/lib/common/file-uri';
import URI from '@theia/core/lib/common/uri';
import { OpenerService, open } from '@theia/core/lib/browser/opener-service';
import { EditorManager } from '@theia/editor/lib/browser';
import { FileDialogService, OpenFileDialogProps } from '@theia/filesystem/lib/browser';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import * as path from 'path';
import {
    CodexPickedFile,
    parseCodexRpcParams
} from '../common/codex-host-protocol';

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp'];

@injectable()
export class CodexFrontendRpcService {

    @inject(FileDialogService)
    protected readonly fileDialogService: FileDialogService;

    @inject(WorkspaceService)
    protected readonly workspaceService: WorkspaceService;

    @inject(EditorManager)
    protected readonly editorManager: EditorManager;

    @inject(OpenerService)
    protected readonly openerService: OpenerService;

    async invoke(webviewId: string, method: string, params: unknown, postToWebview: (message: unknown) => void): Promise<unknown> {
        switch (method) {
            case 'pick-files':
                return this.pickFiles(params);
            case 'pick-file':
                return this.pickFile(params);
            case 'ide-context':
                return this.getIdeContext(params);
            case 'add-context-file':
                return this.addContextFile(webviewId, params, postToWebview);
            case 'open-file':
                return this.openFile(params);
            default:
                throw new Error(`Unsupported frontend RPC method: ${method}`);
        }
    }

    protected async pickFiles(params: unknown): Promise<{ files: CodexPickedFile[] }> {
        const record = parseCodexRpcParams(params);
        const imagesOnly = record.imagesOnly === true;
        const pickerTitle = typeof record.pickerTitle === 'string' ? record.pickerTitle : 'Select files';
        const files = await this.showOpenDialog({ allowMultiple: true, imagesOnly, title: pickerTitle });
        return { files };
    }

    protected async pickFile(params: unknown): Promise<{ file: CodexPickedFile | null }> {
        const record = parseCodexRpcParams(params);
        const pickerTitle = typeof record.pickerTitle === 'string' ? record.pickerTitle : 'Select file';
        const files = await this.showOpenDialog({ allowMultiple: false, imagesOnly: false, title: pickerTitle });
        return { file: files[0] ?? null };
    }

    protected async showOpenDialog(options: { allowMultiple: boolean; imagesOnly: boolean; title: string }): Promise<CodexPickedFile[]> {
        const roots = this.workspaceService.tryGetRoots();
        const props: OpenFileDialogProps = {
            title: options.title,
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: options.allowMultiple
        };
        if (options.imagesOnly) {
            props.filters = { Images: IMAGE_EXTENSIONS };
        }
        const selection = options.allowMultiple
            ? await this.fileDialogService.showOpenDialog({ ...props, canSelectMany: true }, roots[0])
            : await this.fileDialogService.showOpenDialog(props, roots[0]);
        if (!selection) {
            return [];
        }
        const uris = Array.isArray(selection) ? selection : [selection];
        return uris.map(uri => this.toPickedFile(uri));
    }

    protected toPickedFile(uri: URI): CodexPickedFile {
        const fsPath = FileUri.fsPath(uri);
        return {
            label: path.basename(fsPath),
            path: fsPath,
            fsPath
        };
    }

    protected async getIdeContext(params: unknown): Promise<{ ideContext: unknown }> {
        const record = parseCodexRpcParams(params);
        const workspaceRoot = typeof record.workspaceRoot === 'string' ? record.workspaceRoot : undefined;
        const editor = this.editorManager.currentEditor;
        const workspaceFolders = this.workspaceService.tryGetRoots().map(root => FileUri.fsPath(root.resource));
        const activeUri = editor?.editor.uri;
        return {
            ideContext: {
                workspaceRoot: workspaceRoot ?? workspaceFolders[0] ?? undefined,
                workspaceFolders,
                activeFile: activeUri ? FileUri.fsPath(activeUri) : undefined,
                selection: editor?.editor.selection
                    ? {
                        startLine: editor.editor.selection.start.line + 1,
                        startColumn: editor.editor.selection.start.character + 1,
                        endLine: editor.editor.selection.end.line + 1,
                        endColumn: editor.editor.selection.end.character + 1
                    }
                    : undefined
            }
        };
    }

    protected async addContextFile(
        _webviewId: string,
        params: unknown,
        postToWebview: (message: unknown) => void
    ): Promise<{ success: boolean }> {
        const record = parseCodexRpcParams(params);
        const filePath = typeof record.path === 'string' ? record.path : undefined;
        if (!filePath) {
            return { success: false };
        }
        const file: CodexPickedFile = {
            label: path.basename(filePath),
            path: filePath,
            fsPath: filePath
        };
        postToWebview({ type: 'add-context-file', file });
        return { success: true };
    }

    protected async openFile(params: unknown): Promise<{ success: boolean }> {
        const record = parseCodexRpcParams(params);
        const filePath = typeof record.path === 'string'
            ? record.path
            : typeof record.uri === 'string'
                ? record.uri
                : undefined;
        if (!filePath) {
            return { success: false };
        }
        const uri = filePath.includes('://') ? new URI(filePath) : FileUri.create(filePath);
        await open(this.openerService, uri);
        return { success: true };
    }
}

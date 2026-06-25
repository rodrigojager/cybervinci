import URI from '@theia/core/lib/common/uri';
import { Emitter, Event, MessageService } from '@theia/core/lib/common';
import { codicon, Message, Navigatable, ReactWidget, Saveable, SaveableSource, SaveOptions, SaveReason, setDirty } from '@theia/core/lib/browser';
import { FileDialogService } from '@theia/filesystem/lib/browser';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import * as React from '@theia/core/shared/react';
import type { Editor } from 'grapesjs';
import { EditorManager } from '@theia/editor/lib/browser';
import { GrapesEditorFactory } from './grapes/grapes-editor-factory';
import { RazorVisualEditorApp } from './components/RazorVisualEditorApp';
import { EditorDocument, RazorVisualEditorMode, RazorVisualViewport } from './types/editor-document';
import { RazorVisualFileOpenService } from './services/file-open-service';
import { RazorVisualFileSaveService } from './services/file-save-service';
import { RazorVisualTextEditorSyncService } from './services/text-editor-sync-service';
import { RazorVisualAiService } from './services/visual-ai-service';
import { CssVariableSaveChange } from './types/css-variable';
import { SaveResult } from './types/save-result';

export const RazorVisualEditorWidgetOptions = Symbol('RazorVisualEditorWidgetOptions');

export interface RazorVisualEditorWidgetOptions {
    uri: string;
}

@injectable()
export class RazorVisualEditorWidget extends ReactWidget implements Navigatable, SaveableSource {
    static readonly ID = 'cybervinci.razorVisualEditor.widget';
    static readonly LABEL = 'Visual HTML/Razor Editor';

    readonly uri: URI;
    readonly saveable: Saveable;

    protected document: EditorDocument | undefined;
    protected editor: Editor | undefined;
    protected loadPromise: Promise<void> | undefined;
    protected loading = true;
    protected error: string | undefined;
    protected dirty = false;
    protected mode: RazorVisualEditorMode = 'editor';
    protected viewport: RazorVisualViewport = 'desktop';
    protected diffText = '';
    protected cssVariableChanges: CssVariableSaveChange[] = [];
    protected requireRazorDiff = true;
    protected readonly onDirtyChangedEmitter = new Emitter<void>();
    protected readonly onContentChangedEmitter = new Emitter<void>();

    @inject(RazorVisualFileOpenService)
    protected readonly fileOpenService: RazorVisualFileOpenService;

    @inject(RazorVisualFileSaveService)
    protected readonly fileSaveService: RazorVisualFileSaveService;

    @inject(GrapesEditorFactory)
    protected readonly grapesFactory: GrapesEditorFactory;

    @inject(MessageService)
    protected readonly messages: MessageService;

    @inject(FileDialogService)
    protected readonly fileDialogService: FileDialogService;

    @inject(FileService)
    protected readonly fileService: FileService;

    @inject(RazorVisualTextEditorSyncService)
    protected readonly textEditorSyncService: RazorVisualTextEditorSyncService;

    @inject(RazorVisualAiService)
    protected readonly visualAiService: RazorVisualAiService;

    @inject(EditorManager)
    protected readonly editorManager: EditorManager;

    constructor(@inject(RazorVisualEditorWidgetOptions) protected readonly options: RazorVisualEditorWidgetOptions) {
        super();
        this.uri = new URI(options.uri);
        const self = this;
        this.saveable = {
            get dirty(): boolean {
                return self.dirty;
            },
            get onDirtyChanged(): Event<void> {
                return self.onDirtyChangedEmitter.event;
            },
            get onContentChanged(): Event<void> {
                return self.onContentChangedEmitter.event;
            },
            save: options => self.save(options),
            saveAs: options => self.saveAs(options),
            revert: () => self.reload(),
            filters: () => ({
                'HTML/Razor': ['html', 'htm', 'cshtml'],
                'All Files': ['*']
            })
        };
    }

    @postConstruct()
    protected init(): void {
        this.id = `${RazorVisualEditorWidget.ID}:${this.uri.toString()}`;
        this.title.label = this.uri.path.base;
        this.title.caption = this.uri.toString();
        this.title.iconClass = `${codicon('open-preview')} cv-razor-visual-open-icon`;
        this.title.closable = true;
        this.addClass('cv-razor-widget');
        this.toDispose.push(this.onDirtyChangedEmitter);
        this.toDispose.push(this.onContentChangedEmitter);
        this.loadPromise = this.load();
    }

    getUri(): URI {
        return this.uri;
    }

    getResourceUri(): URI | undefined {
        return this.uri;
    }

    createMoveToUri(resourceUri: URI): URI | undefined {
        return this.uri.withPath(resourceUri.path);
    }

    override onActivateRequest(msg: Message): void {
        super.onActivateRequest(msg);
        this.node.focus();
    }

    protected override render(): React.ReactNode {
        return <RazorVisualEditorApp
            document={this.document}
            dirty={this.dirty}
            loading={this.loading}
            error={this.error}
            mode={this.mode}
            viewport={this.viewport}
            diffText={this.diffText}
            grapesFactory={this.grapesFactory}
            visualAiService={this.visualAiService}
            onSave={() => this.save({ saveReason: SaveReason.Manual })}
            onSaveAs={() => this.saveAs()}
            onOpenCodeEditor={() => this.openCodeEditor()}
            onReload={() => this.reload()}
            onShowDiff={() => this.showDiff()}
            onShowTokens={() => this.showTokens()}
            onModeChange={mode => this.setMode(mode)}
            onViewportChange={viewport => this.setViewport(viewport)}
            onDirty={() => this.markDirty()}
            onCssVariablesChange={changes => this.cssVariableChanges = changes}
            onEditorReady={editor => this.editor = editor}
        />;
    }

    async load(): Promise<void> {
        this.loading = true;
        this.error = undefined;
        this.update();
        try {
            this.document = await this.fileOpenService.open(this.uri);
            this.diffText = '';
            this.cssVariableChanges = [];
            this.setDirty(false);
        } catch (error) {
            this.error = error instanceof Error ? error.message : String(error);
        } finally {
            this.loading = false;
            this.update();
        }
    }

    async save(options?: SaveOptions): Promise<void> {
        await this.loadPromise;
        if (!this.document) {
            return;
        }
        const isAutoSave = options?.saveReason !== undefined && !SaveReason.isManual(options.saveReason);
        if (isAutoSave && this.document.isRazor) {
            return;
        }
        try {
            this.textEditorSyncService.assertAllClean(this.affectedSaveUris(this.uri));
            const result = await this.fileSaveService.save({
                document: this.document,
                html: this.currentHtml(),
                css: this.currentCssForSave(),
                cssVariableChanges: this.cssVariableChanges,
                requireDiff: this.document.isRazor && this.requireRazorDiff && !isAutoSave
            });
            if (!result.saved) {
                return;
            }
            this.requireRazorDiff = false;
            if (result.disableFutureDiffPrompt) {
                this.requireRazorDiff = false;
            }
            const refreshedEditors = await this.reloadTextEditorsAfterSave(result, this.uri);
            this.messages.info(`Saved visual changes to ${this.uri.path.base}. Backup: ${result.backupUri}${this.refreshedEditorsMessage(refreshedEditors)}`);
            for (const warning of result.warnings) {
                this.messages.warn(warning);
            }
            await this.load();
        } catch (error) {
            this.messages.error(error instanceof Error ? error.message : String(error));
        }
    }

    async saveAs(_options?: SaveOptions): Promise<void> {
        await this.loadPromise;
        if (!this.document) {
            return;
        }
        const folder = await this.fileService.resolve(this.uri.parent);
        const targetUri = await this.fileDialogService.showSaveDialog({
            title: 'Save Visual HTML/Razor As',
            saveLabel: 'Save',
            inputValue: this.uri.path.base
        }, folder);
        if (!targetUri) {
            return;
        }
        try {
            this.textEditorSyncService.assertAllClean(this.affectedSaveUris(targetUri));
            const result = await this.fileSaveService.save({
                document: this.document,
                html: this.currentHtml(),
                css: this.currentCssForSave(),
                cssVariableChanges: this.cssVariableChanges,
                targetUri,
                requireDiff: this.document.isRazor
            });
            if (result.saved) {
                const refreshedEditors = await this.reloadTextEditorsAfterSave(result, targetUri);
                this.messages.info(`Saved visual changes as ${targetUri.path.toString()}. Backup: ${result.backupUri}${this.refreshedEditorsMessage(refreshedEditors)}`);
                for (const warning of result.warnings) {
                    this.messages.warn(warning);
                }
            }
        } catch (error) {
            this.messages.error(error instanceof Error ? error.message : String(error));
        }
    }

    async reload(): Promise<void> {
        this.loadPromise = this.load();
        await this.loadPromise;
    }

    async openCodeEditor(): Promise<void> {
        await this.editorManager.open(this.uri, { mode: 'activate' });
        if (this.dirty) {
            this.messages.info(`Opened ${this.uri.path.base} in the code editor. Save visual changes first if you want that editor to include the current visual draft.`);
        }
    }

    showTokens(): void {
        if (!this.document?.sourceMap?.tokens.length) {
            this.messages.info('No Razor tokens were found in this file.');
            return;
        }
        this.scrollRazorToken(this.document.sourceMap.tokens[0].id);
    }

    showDiff(): void {
        if (!this.document) {
            return;
        }
        const finalHtml = this.currentHtmlWithCss();
        this.diffText = this.fileSaveService.createDiff(this.document.processedHtml, finalHtml);
        this.mode = 'diff';
        this.update();
    }

    protected setMode(mode: RazorVisualEditorMode): void {
        this.mode = mode;
        if (mode === 'diff') {
            this.showDiff();
        } else {
            this.update();
        }
    }

    protected setViewport(viewport: RazorVisualViewport): void {
        this.viewport = viewport;
        this.update();
    }

    protected scrollRazorToken(tokenId: string): void {
        const frame = this.node.querySelector('iframe');
        const frameDocument = frame instanceof HTMLIFrameElement ? frame.contentDocument : undefined;
        const element = frameDocument?.querySelector(`[data-cv-razor-token="${tokenId}"]`);
        element?.scrollIntoView({ block: 'center', inline: 'center' });
    }

    protected markDirty(): void {
        this.setDirty(true);
        this.onContentChangedEmitter.fire();
    }

    protected setDirty(dirty: boolean): void {
        if (this.dirty === dirty) {
            return;
        }
        this.dirty = dirty;
        setDirty(this, dirty);
        this.onDirtyChangedEmitter.fire();
    }

    protected currentHtml(): string {
        return this.editor?.getHtml() ?? this.document?.processedHtml ?? '';
    }

    protected currentCss(): string {
        return this.editor?.getCss() ?? '';
    }

    protected currentCssForSave(): string {
        return stripPersistedCssVariables(this.currentCss(), this.cssVariableChanges);
    }

    protected currentHtmlWithCss(): string {
        const css = this.currentCssForSave().trim();
        return css ? `${this.currentHtml()}\n<style data-cv-grapes-css="true">\n${css}\n</style>\n` : this.currentHtml();
    }

    protected affectedSaveUris(targetUri: URI): URI[] {
        return [targetUri, ...this.cssVariableSourceUris()];
    }

    protected async reloadTextEditorsAfterSave(result: SaveResult, fallbackUri: URI): Promise<number> {
        const savedUri = result.savedUri ? new URI(result.savedUri) : fallbackUri;
        const assetUris = (result.updatedAssetUris ?? []).map(uri => new URI(uri));
        return this.textEditorSyncService.reloadCleanEditors([savedUri, ...assetUris]);
    }

    protected refreshedEditorsMessage(count: number): string {
        if (count <= 0) {
            return '';
        }
        const suffix = count === 1 ? 'tab' : 'tabs';
        return ` Refreshed ${count} open text editor ${suffix}.`;
    }

    protected cssVariableSourceUris(): URI[] {
        const uris: URI[] = [];
        for (const change of this.cssVariableChanges) {
            if (!change.sourceUri) {
                continue;
            }
            const uri = new URI(change.sourceUri);
            if (!uris.some(candidate => candidate.withoutFragment().isEqual(uri.withoutFragment(), false))) {
                uris.push(uri);
            }
        }
        return uris;
    }
}

function stripPersistedCssVariables(css: string, changes: CssVariableSaveChange[]): string {
    const persistedNames = changes
        .filter(change => Boolean(change.sourceUri))
        .map(change => change.name);
    if (persistedNames.length === 0) {
        return css;
    }
    let stripped = css;
    for (const name of persistedNames) {
        stripped = stripped.replace(new RegExp(`\\s*${escapeRegExp(name)}\\s*:\\s*[^;{}]+;?`, 'g'), '');
    }
    return stripped.replace(/[^{}]+\{\s*\}/g, '').trim();
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

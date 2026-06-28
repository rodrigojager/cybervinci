import URI from '@theia/core/lib/common/uri';
import { injectable, inject } from '@theia/core/shared/inversify';
import { EditorManager, EditorWidget } from '@theia/editor/lib/browser';

@injectable()
export class RazorVisualTextEditorSyncService {
    @inject(EditorManager)
    protected readonly editorManager: EditorManager;

    findOpenTextEditors(uri: URI): EditorWidget[] {
        return this.editorManager.all.filter(widget => this.isSameResource(widget, uri));
    }

    assertClean(uri: URI): void {
        const dirtyEditors = this.findOpenTextEditors(uri).filter(widget => widget.editor.document.dirty);
        if (dirtyEditors.length > 0) {
            throw new Error(`The text editor for ${uri.path.base} has unsaved changes. Save or revert that tab before saving visual changes.`);
        }
    }

    assertAllClean(uris: URI[]): void {
        for (const uri of this.uniqueUris(uris)) {
            this.assertClean(uri);
        }
    }

    async reloadCleanEditors(uris: URI[]): Promise<number> {
        let refreshed = 0;
        for (const uri of this.uniqueUris(uris)) {
            for (const widget of this.findOpenTextEditors(uri)) {
                if (widget.editor.document.dirty) {
                    continue;
                }
                const revert = widget.editor.document.revert;
                if (!revert) {
                    continue;
                }
                await revert.call(widget.editor.document);
                widget.editor.refresh?.();
                refreshed++;
            }
        }
        return refreshed;
    }

    protected isSameResource(widget: EditorWidget, uri: URI): boolean {
        const resourceUri = widget.getResourceUri();
        return Boolean(resourceUri?.withoutFragment().isEqual(uri.withoutFragment(), false));
    }

    protected uniqueUris(uris: URI[]): URI[] {
        const unique: URI[] = [];
        for (const uri of uris) {
            if (!unique.some(candidate => candidate.withoutFragment().isEqual(uri.withoutFragment(), false))) {
                unique.push(uri);
            }
        }
        return unique;
    }
}

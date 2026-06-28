import { expect } from 'chai';
import { BinaryBuffer } from '@theia/core/lib/common/buffer';
import URI from '@theia/core/lib/common/uri';
import { createBuilderDocument, deserializeBuilderDocumentJson, serializeBuilderDocumentJson } from '@cybervinci/builder-schema';
import { BuilderEditorState } from './builder-editor-state';
import {
    BuilderSaveConflictError,
    persistBuilderJsonFile,
    toBuilderFileVersion,
    type BuilderFilePersistenceService,
    type BuilderFileStat
} from './builder-file-persistence';

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

describe('Builder file persistence workflow', () => {

    const target = new URI('file:///workspace/pages/home.builder.json');

    it('creates a new .builder.json file, saves local edits, and reloads the saved document', async () => {
        const fileService = new MemoryBuilderFileService();
        const initialDocument = createBuilderDocument({ id: 'home', title: 'Home' });
        initialDocument.tree.children = [{ id: 'headline', type: 'Title', props: { children: 'Initial' } }];
        const initialJson = `${serializeBuilderDocumentJson(initialDocument)}\n`;

        await persistBuilderJsonFile(fileService, target, initialJson);

        const opened = await fileService.read(target);
        const editor = new BuilderEditorState({ sourceName: target.path.base });
        editor.loadJson(opened.value.toString());
        editor.selectNode('headline');
        const edited = editor.updateSelectedProps({ children: 'Saved from properties' });

        await persistBuilderJsonFile(fileService, target, edited.json, {
            expectedVersion: toBuilderFileVersion(opened)
        });

        const reloaded = await fileService.read(target);
        const reopened = new BuilderEditorState({ sourceName: target.path.base }).loadJson(reloaded.value.toString());

        expect(reopened.parseError).to.equal(undefined);
        expect(reopened.dirty).to.equal(false);
        expect(reopened.document?.metadata.id).to.equal('home');
        expect(reopened.document?.tree.children?.[0].props).to.deep.equal({ children: 'Saved from properties' });
    });

    it('keeps manual JSON edits as a draft until apply, then saves and reloads the applied Builder document', async () => {
        const fileService = new MemoryBuilderFileService();
        const initialDocument = createBuilderDocument({ id: 'json-flow', title: 'JSON Flow' });
        initialDocument.tree.children = [{ id: 'headline', type: 'Title', props: { children: 'Initial JSON title' } }];
        const initialJson = `${serializeBuilderDocumentJson(initialDocument)}\n`;

        await persistBuilderJsonFile(fileService, target, initialJson);

        const opened = await fileService.read(target);
        const editor = new BuilderEditorState({ sourceName: target.path.base });
        editor.loadJson(opened.value.toString());

        const editedDocument = deserializeBuilderDocumentJson(opened.value.toString());
        editedDocument.page.title = 'Applied from JSON tab';
        editedDocument.tree.children![0].props = { children: 'Applied JSON title' };

        const draft = editor.setJson(`${serializeBuilderDocumentJson(editedDocument, { space: 2 })}\n`);

        expect(draft.hasUnappliedJsonChanges).to.equal(true);
        expect(draft.document?.page.title).to.equal('JSON Flow');
        expect(draft.document?.tree.children?.[0].props).to.deep.equal({ children: 'Initial JSON title' });

        const applied = editor.applyJsonDraft();

        expect(applied.hasUnappliedJsonChanges).to.equal(false);
        expect(applied.document?.page.title).to.equal('Applied from JSON tab');
        expect(applied.document?.tree.children?.[0].props).to.deep.equal({ children: 'Applied JSON title' });

        await persistBuilderJsonFile(fileService, target, applied.json, {
            expectedVersion: toBuilderFileVersion(opened)
        });

        const reopened = new BuilderEditorState({ sourceName: target.path.base })
            .loadJson((await fileService.read(target)).value.toString());

        expect(reopened.parseError).to.equal(undefined);
        expect(reopened.dirty).to.equal(false);
        expect(reopened.document?.page.title).to.equal('Applied from JSON tab');
        expect(reopened.document?.tree.children?.[0].props).to.deep.equal({ children: 'Applied JSON title' });
    });

    it('detects an external conflict and can restore the local editor version by saving over the latest disk version', async () => {
        const fileService = new MemoryBuilderFileService();
        const initialDocument = createBuilderDocument({ id: 'conflicted-page', title: 'Original' });
        const initialJson = `${serializeBuilderDocumentJson(initialDocument)}\n`;
        await persistBuilderJsonFile(fileService, target, initialJson);

        const opened = await fileService.read(target);
        const editor = new BuilderEditorState({ sourceName: target.path.base });
        editor.loadJson(opened.value.toString());

        const localDocument = deserializeBuilderDocumentJson(opened.value.toString());
        localDocument.page.title = 'Local draft';
        const localSnapshot = editor.applyDocument(localDocument);

        const externalDocument = deserializeBuilderDocumentJson(opened.value.toString());
        externalDocument.page.title = 'External disk edit';
        fileService.put(target, `${serializeBuilderDocumentJson(externalDocument)}\n`);

        try {
            await persistBuilderJsonFile(fileService, target, localSnapshot.json, {
                expectedVersion: toBuilderFileVersion(opened)
            });
            expect.fail('Expected stale save to report an external conflict.');
        } catch (error) {
            expect(error).to.be.instanceOf(BuilderSaveConflictError);
        }

        const latestDisk = await fileService.read(target);
        expect(deserializeBuilderDocumentJson(latestDisk.value.toString()).page.title).to.equal('External disk edit');

        await persistBuilderJsonFile(fileService, target, localSnapshot.lastAppliedVersion!.json, {
            expectedVersion: toBuilderFileVersion(latestDisk)
        });

        const restored = deserializeBuilderDocumentJson((await fileService.read(target)).value.toString());
        expect(restored.page.title).to.equal('Local draft');
    });
});

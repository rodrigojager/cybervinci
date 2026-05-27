import { expect } from 'chai';
import { BinaryBuffer } from '@theia/core/lib/common/buffer';
import URI from '@theia/core/lib/common/uri';
import {
    createBuilderCopyUri,
    createBuilderTextDiffSummary,
    BuilderSaveConflictError,
    persistBuilderJsonFile,
    type BuilderFilePersistenceService,
    type BuilderFileStat
} from './builder-file-persistence';

class FakeFileService implements BuilderFilePersistenceService {

    readonly writes: string[] = [];
    readonly moves: Array<{ source: string; target: string; overwrite: boolean | undefined }> = [];
    readonly deleted: string[] = [];
    readonly files = new Map<string, string>();
    readonly stats = new Map<string, BuilderFileStat>();
    failMove = false;

    async writeFile(resource: URI, content: BinaryBuffer): Promise<void> {
        this.writes.push(resource.toString());
        const value = content.toString();
        this.files.set(resource.toString(), value);
        this.stats.set(resource.toString(), {
            mtime: Date.now(),
            size: value.length,
            etag: `${Date.now()}-${value.length}`
        });
    }

    async stat(resource: URI): Promise<BuilderFileStat> {
        const stat = this.stats.get(resource.toString());
        if (!stat) {
            throw new Error('missing stat');
        }
        return stat;
    }

    async move(source: URI, target: URI, options?: { overwrite?: boolean }): Promise<void> {
        this.moves.push({ source: source.toString(), target: target.toString(), overwrite: options?.overwrite });
        if (this.failMove) {
            throw new Error('move unavailable');
        }
        const value = this.files.get(source.toString());
        if (value === undefined) {
            throw new Error('missing source');
        }
        this.files.set(target.toString(), value);
        this.stats.set(target.toString(), {
            mtime: Date.now(),
            size: value.length,
            etag: `${Date.now()}-${value.length}`
        });
        this.files.delete(source.toString());
        this.stats.delete(source.toString());
    }

    async delete(resource: URI): Promise<void> {
        this.deleted.push(resource.toString());
        this.files.delete(resource.toString());
        this.stats.delete(resource.toString());
    }
}

describe('persistBuilderJsonFile', () => {

    const target = new URI('file:///workspace/home.builder.json');

    it('persists .builder.json files through temp file move when move is available', async () => {
        const fileService = new FakeFileService();

        await persistBuilderJsonFile(fileService, target, '{"schemaVersion":"1.0.0"}\n');

        expect(fileService.writes).to.have.length(1);
        expect(fileService.writes[0]).to.contain('/workspace/.home.builder.json.');
        expect(fileService.moves).to.deep.include({
            source: fileService.writes[0],
            target: target.toString(),
            overwrite: true
        });
        expect(fileService.files.get(target.toString())).to.equal('{"schemaVersion":"1.0.0"}\n');
    });

    it('falls back to direct write when atomic move is unavailable', async () => {
        const fileService = new FakeFileService();
        fileService.failMove = true;

        await persistBuilderJsonFile(fileService, target, '{"schemaVersion":"1.0.0"}\n');

        expect(fileService.moves).to.have.length(1);
        expect(fileService.deleted).to.deep.equal([fileService.writes[0]]);
        expect(fileService.writes).to.deep.equal([fileService.writes[0], target.toString()]);
        expect(fileService.files.get(target.toString())).to.equal('{"schemaVersion":"1.0.0"}\n');
    });

    it('rejects non-Builder filenames before writing', async () => {
        const fileService = new FakeFileService();

        try {
            await persistBuilderJsonFile(fileService, new URI('file:///workspace/home.json'), '{}\n');
            expect.fail('Expected persistBuilderJsonFile to reject a non-Builder filename.');
        } catch (error) {
            expect(error).to.be.instanceOf(Error);
            expect((error as Error).message).to.contain('.builder.json');
        }
        expect(fileService.writes).to.deep.equal([]);
    });

    it('saves when the expected disk version still matches', async () => {
        const fileService = new FakeFileService();
        fileService.stats.set(target.toString(), { mtime: 10, size: 4, etag: 'initial' });

        await persistBuilderJsonFile(fileService, target, '{"schemaVersion":"1.0.0"}\n', {
            expectedVersion: { mtime: 10, size: 4, etag: 'initial' }
        });

        expect(fileService.moves).to.have.length(1);
        expect(fileService.files.get(target.toString())).to.equal('{"schemaVersion":"1.0.0"}\n');
    });

    it('rejects saves when the disk version changed after the editor opened', async () => {
        const fileService = new FakeFileService();
        fileService.stats.set(target.toString(), { mtime: 11, size: 5, etag: 'changed' });

        try {
            await persistBuilderJsonFile(fileService, target, '{"schemaVersion":"1.0.0"}\n', {
                expectedVersion: { mtime: 10, size: 4, etag: 'initial' }
            });
            expect.fail('Expected persistBuilderJsonFile to reject a stale disk version.');
        } catch (error) {
            expect(error).to.be.instanceOf(BuilderSaveConflictError);
        }
        expect(fileService.writes).to.deep.equal([]);
        expect(fileService.moves).to.deep.equal([]);
    });
});

describe('createBuilderTextDiffSummary', () => {

    it('summarizes added and removed disk lines against memory text', () => {
        const diff = createBuilderTextDiffSummary(
            '{\n  "title": "Memory",\n  "keep": true\n}\n',
            '{\n  "title": "Disk",\n  "keep": true,\n  "new": 1\n}\n'
        );

        expect(diff.changed).to.equal(true);
        expect(diff.added).to.equal(3);
        expect(diff.removed).to.equal(2);
        expect(diff.preview).to.contain('-   "title": "Memory",');
        expect(diff.preview).to.contain('+   "title": "Disk",');
        expect(diff.preview).to.contain('+   "new": 1');
    });

    it('limits preview lines and reports omitted changes', () => {
        const diff = createBuilderTextDiffSummary('a\nb\nc\n', 'x\ny\nz\n', { maxLines: 2 });

        expect(diff.preview.split('\n')).to.have.length(3);
        expect(diff.preview).to.contain('... 4 more changed lines');
    });

    it('returns an unchanged summary for equal text', () => {
        const diff = createBuilderTextDiffSummary('same\n', 'same\n');

        expect(diff).to.deep.equal({
            added: 0,
            removed: 0,
            changed: false,
            preview: ''
        });
    });
});

describe('createBuilderCopyUri', () => {

    it('creates a timestamped .builder.json sibling path', () => {
        const copyUri = createBuilderCopyUri(
            new URI('file:///workspace/home.builder.json'),
            new Date('2026-05-20T12:34:56.000Z')
        );

        expect(copyUri.toString()).to.equal('file:///workspace/home.copy-20260520T123456Z.builder.json');
    });
});

import { expect } from 'chai';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { FileUri } from '@theia/core/lib/common/file-uri';
import { LocalFileEffectHostAdapter } from './file-effect-host-adapter';

describe('LocalFileEffectHostAdapter', () => {
    let workspaceRoot: string;
    let workspaceRootUri: string;
    let adapter: LocalFileEffectHostAdapter;

    beforeEach(async () => {
        workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'flow-file-effect-'));
        workspaceRootUri = FileUri.create(workspaceRoot).toString();
        adapter = new LocalFileEffectHostAdapter();
    });

    afterEach(async () => {
        await fs.rm(workspaceRoot, { recursive: true, force: true });
    });

    it('generates a diff before applying a file creation', async () => {
        const prepared = await adapter.prepare(workspaceRootUri, {
            type: 'file.created',
            path: 'src/notes.md',
            content: '# Notes\n'
        });

        expect(prepared.relativePath).to.equal('src/notes.md');
        expect(prepared.patch).to.contain('--- a/src/notes.md');
        expect(prepared.patch).to.contain('+++ b/src/notes.md');
        expect(prepared.patch).to.contain('+# Notes');
        expect(prepared.requiresApproval).to.equal(false);

        await expectRejected(fs.readFile(path.join(workspaceRoot, 'src', 'notes.md'), 'utf8'));
        const applied = await adapter.apply(workspaceRootUri, {
            type: 'file.created',
            path: 'src/notes.md',
            content: '# Notes\n'
        });
        expect(applied.applied).to.equal(true);
        expect(await fs.readFile(path.join(workspaceRoot, 'src', 'notes.md'), 'utf8')).to.equal('# Notes\n');
    });

    it('blocks path traversal and absolute paths', async () => {
        const outside = path.join(path.dirname(workspaceRoot), 'outside.md');
        await expectRejected(adapter.prepare(workspaceRootUri, {
            type: 'file.created',
            path: '../outside.md',
            content: 'outside'
        }));
        await expectRejected(adapter.prepare(workspaceRootUri, {
            type: 'file.created',
            path: path.join(workspaceRoot, 'absolute.md'),
            content: 'outside'
        }));
        await expectRejected(adapter.apply(workspaceRootUri, {
            type: 'file.created',
            path: 'safe/../../outside.md',
            content: 'outside'
        }, true));
        await expectRejected(fs.readFile(outside, 'utf8'));
    });

    it('requires approval for destructive edits and does not write until approved', async () => {
        const target = path.join(workspaceRoot, 'docs', 'guide.md');
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, 'line one\nline two\n', 'utf8');

        const skipped = await adapter.apply(workspaceRootUri, {
            type: 'file.edited',
            path: 'docs/guide.md',
            content: 'line one\n',
            approvalPolicy: 'auto_apply'
        });

        expect(skipped.applied).to.equal(false);
        expect(skipped.requiresApproval).to.equal(true);
        expect(skipped.approvalPolicy).to.equal('human_gate_required');
        expect(skipped.riskReasons).to.include('destructive file effect');
        expect(skipped.reason).to.contain('approval required');
        expect(await fs.readFile(target, 'utf8')).to.equal('line one\nline two\n');

        const applied = await adapter.apply(workspaceRootUri, {
            type: 'file.edited',
            path: 'docs/guide.md',
            content: 'line one\n'
        }, true);
        expect(applied.applied).to.equal(true);
        expect(await fs.readFile(target, 'utf8')).to.equal('line one\n');
    });

    it('requires approval for destructive deletes and does not delete until approved', async () => {
        const target = path.join(workspaceRoot, 'docs', 'obsolete.md');
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, 'remove me\n', 'utf8');

        const skipped = await adapter.apply(workspaceRootUri, {
            type: 'file.deleted',
            path: 'docs/obsolete.md',
            approvalPolicy: 'auto_apply'
        });

        expect(skipped.applied).to.equal(false);
        expect(skipped.requiresApproval).to.equal(true);
        expect(skipped.approvalPolicy).to.equal('human_gate_required');
        expect(skipped.riskReasons).to.include('destructive file effect');
        expect(await fs.readFile(target, 'utf8')).to.equal('remove me\n');

        const applied = await adapter.apply(workspaceRootUri, {
            type: 'file.deleted',
            path: 'docs/obsolete.md'
        }, true);

        expect(applied.applied).to.equal(true);
        await expectRejected(fs.readFile(target, 'utf8'));
    });

    it('requires approval when a file effect targets a path outside the allowlist', async () => {
        const skipped = await adapter.apply(workspaceRootUri, {
            type: 'file.created',
            path: 'src/app.ts',
            content: 'export const value = 1;\n',
            allowedPaths: ['docs/report.md'],
            approvalPolicy: 'auto_apply'
        });

        expect(skipped.applied).to.equal(false);
        expect(skipped.requiresApproval).to.equal(true);
        expect(skipped.approvalPolicy).to.equal('human_gate_required');
        expect(skipped.riskReasons).to.include('path outside allowlist: src/app.ts');
        await expectRejected(fs.readFile(path.join(workspaceRoot, 'src', 'app.ts'), 'utf8'));

        const applied = await adapter.apply(workspaceRootUri, {
            type: 'file.created',
            path: 'src/app.ts',
            content: 'export const value = 1;\n',
            allowedPaths: ['docs/report.md'],
            approvalPolicy: 'auto_apply'
        }, true);

        expect(applied.applied).to.equal(true);
        expect(await fs.readFile(path.join(workspaceRoot, 'src', 'app.ts'), 'utf8')).to.equal('export const value = 1;\n');
    });

    it('blocks denied file effect paths even when they are otherwise allowed', async () => {
        const blocked = await adapter.apply(workspaceRootUri, {
            type: 'file.created',
            path: 'secrets/token.txt',
            content: 'secret\n',
            allowedPaths: ['secrets/'],
            deniedPaths: ['secrets/'],
            approvalPolicy: 'auto_apply'
        }, true);

        expect(blocked.applied).to.equal(false);
        expect(blocked.blocked).to.equal(true);
        expect(blocked.approvalPolicy).to.equal('blocked');
        expect(blocked.reason).to.contain('path denied by policy: secrets/token.txt');
        await expectRejected(fs.readFile(path.join(workspaceRoot, 'secrets', 'token.txt'), 'utf8'));
    });

    it('blocks writes into Theia and Flow internal storage', async () => {
        const blocked = await adapter.apply(workspaceRootUri, {
            type: 'file.created',
            path: '.theia/flow/runs/other-run/report.md',
            content: 'cross-run write\n',
            approvalPolicy: 'auto_apply'
        }, true);

        expect(blocked.applied).to.equal(false);
        expect(blocked.blocked).to.equal(true);
        expect(blocked.approvalPolicy).to.equal('blocked');
        expect(blocked.reason).to.contain('path targets internal Theia/Flow storage');
        await expectRejected(fs.readFile(path.join(workspaceRoot, '.theia', 'flow', 'runs', 'other-run', 'report.md'), 'utf8'));
    });

    it('blocks file effects that cross a workspace symlink boundary', async () => {
        const outsideRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'flow-file-effect-outside-'));
        const outsideTarget = path.join(outsideRoot, 'escaped.md');
        const linkPath = path.join(workspaceRoot, 'linked');
        try {
            await fs.symlink(outsideRoot, linkPath, 'dir');

            const blocked = await adapter.apply(workspaceRootUri, {
                type: 'file.created',
                path: 'linked/escaped.md',
                content: 'escaped\n',
                approvalPolicy: 'auto_apply'
            }, true);

            expect(blocked.applied).to.equal(false);
            expect(blocked.blocked).to.equal(true);
            expect(blocked.approvalPolicy).to.equal('blocked');
            expect(blocked.reason).to.contain('path crosses a symbolic link inside the workspace: linked');
            await expectRejected(fs.readFile(outsideTarget, 'utf8'));
        } finally {
            await fs.rm(outsideRoot, { recursive: true, force: true });
        }
    });

    it('requires approval when hashBefore conflicts', async () => {
        const target = path.join(workspaceRoot, 'src', 'app.ts');
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, 'const value = 1;\n', 'utf8');

        const skipped = await adapter.apply(workspaceRootUri, {
            type: 'file.edited',
            path: 'src/app.ts',
            content: 'const value = 2;\n',
            hashBefore: 'sha256:not-the-current-hash',
            approvalPolicy: 'auto_apply'
        });

        expect(skipped.applied).to.equal(false);
        expect(skipped.blocked).to.equal(false);
        expect(skipped.requiresApproval).to.equal(true);
        expect(skipped.approvalPolicy).to.equal('human_gate_required');
        expect(skipped.riskReasons).to.include('hashBefore mismatch for src/app.ts');
        expect(skipped.reason).to.contain('approval required');
        expect(await fs.readFile(target, 'utf8')).to.equal('const value = 1;\n');

        const applied = await adapter.apply(workspaceRootUri, {
            type: 'file.edited',
            path: 'src/app.ts',
            content: 'const value = 2;\n',
            hashBefore: 'sha256:not-the-current-hash',
            approvalPolicy: 'auto_apply'
        }, true);

        expect(applied.applied).to.equal(true);
        expect(await fs.readFile(target, 'utf8')).to.equal('const value = 2;\n');
    });
});

async function expectRejected(action: Promise<unknown>): Promise<void> {
    try {
        await action;
    } catch {
        return;
    }
    throw new Error('Expected promise to be rejected.');
}

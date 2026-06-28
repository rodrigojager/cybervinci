import { expect } from 'chai';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { FileUri } from '@theia/core/lib/common/file-uri';
import { LocalImageEffectHostAdapter } from './image-effect-host-adapter';

describe('LocalImageEffectHostAdapter', () => {
    let workspaceRoot: string;
    let workspaceRootUri: string;
    let adapter: LocalImageEffectHostAdapter;
    let previousProvider: string | undefined;

    beforeEach(async () => {
        workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'flow-image-effect-'));
        workspaceRootUri = FileUri.create(workspaceRoot).toString();
        adapter = new LocalImageEffectHostAdapter();
        previousProvider = process.env.FLOW_IMAGE_PROVIDER_COMMAND;
        delete process.env.FLOW_IMAGE_PROVIDER_COMMAND;
    });

    afterEach(async () => {
        if (previousProvider === undefined) {
            delete process.env.FLOW_IMAGE_PROVIDER_COMMAND;
        } else {
            process.env.FLOW_IMAGE_PROVIDER_COMMAND = previousProvider;
        }
        await fs.rm(workspaceRoot, { recursive: true, force: true });
    });

    it('blocks image effects when no provider is configured', async () => {
        const result = await adapter.apply(workspaceRootUri, 'run-1', 'workload-1', {
            type: 'image.generate',
            prompt: 'A compact UI mockup.',
            artifactPath: 'images/mockup.png',
            approvalPolicy: 'auto_apply'
        }, true);

        expect(result.applied).to.equal(false);
        expect(result.status).to.equal('blocked');
        expect(result.reason).to.contain('Image provider is not configured');
        await expectRejected(fs.access(path.join(workspaceRoot, '.theia', 'flow', 'runs', 'run-1', 'artifacts', 'images', 'mockup.png')));
    });

    it('runs a configured mock provider and writes the image artifact after approval', async () => {
        process.env.FLOW_IMAGE_PROVIDER_COMMAND = `"${process.execPath}" -e "process.stdin.resume();process.stdin.on('end',()=>console.log(JSON.stringify({base64:Buffer.from('mock-image').toString('base64')})))"`;

        const proposed = await adapter.apply(workspaceRootUri, 'run-1', 'workload-1', {
            type: 'image.generate',
            prompt: 'A compact UI mockup.',
            artifactPath: 'images/mockup.png'
        });
        expect(proposed.applied).to.equal(false);
        expect(proposed.status).to.equal('proposed');
        expect(proposed.requiresApproval).to.equal(true);

        const applied = await adapter.apply(workspaceRootUri, 'run-1', 'workload-1', {
            type: 'image.generate',
            prompt: 'A compact UI mockup.',
            artifactPath: 'images/mockup.png'
        }, true);

        expect(applied.applied).to.equal(true);
        expect(applied.status).to.equal('applied');
        expect(applied.mimeType).to.equal('image/png');
        expect(applied.bytes).to.equal(Buffer.byteLength('mock-image'));
        expect(await fs.readFile(path.join(workspaceRoot, '.theia', 'flow', 'runs', 'run-1', 'artifacts', 'images', 'mockup.png'), 'utf8')).to.equal('mock-image');
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

import { expect } from 'chai';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { FileUri } from '@theia/core/lib/common/file-uri';
import { LocalCommandEffectHostAdapter } from './command-effect-host-adapter';

describe('LocalCommandEffectHostAdapter', () => {
    let workspaceRoot: string;
    let workspaceRootUri: string;
    let adapter: LocalCommandEffectHostAdapter;

    beforeEach(async () => {
        workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'flow-command-effect-'));
        workspaceRootUri = FileUri.create(workspaceRoot).toString();
        adapter = new LocalCommandEffectHostAdapter();
    });

    afterEach(async () => {
        await fs.rm(workspaceRoot, { recursive: true, force: true });
    });

    it('executes an allowlisted command with allowed env and redacted stdout', async () => {
        const result = await adapter.apply(workspaceRootUri, {
            command: JSON.stringify([process.execPath, '-e', "console.log(process.env.VISIBLE + ' token=secret-value')"]),
            env: {
                VISIBLE: 'ok',
                HIDDEN: 'no'
            },
            allowedEnv: ['VISIBLE'],
            allowedCommands: [process.execPath],
            approvalPolicy: 'auto_apply',
            timeoutMs: 5000
        }, true);

        expect(result.status).to.equal('applied');
        expect(result.applied).to.equal(true);
        expect(result.exitCode).to.equal(0);
        expect(result.stdout).to.contain('ok');
        expect(result.stdout).to.contain('token=[REDACTED]');
        expect(result.env).to.deep.equal({ VISIBLE: 'ok' });
    });

    it('blocks commands outside the allowlist without executing them', async () => {
        const marker = path.join(workspaceRoot, 'blocked-marker.txt');
        const result = await adapter.apply(workspaceRootUri, {
            command: JSON.stringify([process.execPath, '-e', `require('fs').writeFileSync(${JSON.stringify(marker)}, 'ran')`]),
            allowedCommands: ['not-node'],
            approvalPolicy: 'auto_apply'
        }, true);

        expect(result.status).to.equal('blocked');
        expect(result.applied).to.equal(false);
        expect(result.stderr).to.contain('command outside allowlist');
        await expectRejected(fs.readFile(marker, 'utf8'));
    });

    it('treats missing approval as rejected and does not execute the command', async () => {
        const marker = path.join(workspaceRoot, 'approval-marker.txt');
        const result = await adapter.apply(workspaceRootUri, {
            command: JSON.stringify([process.execPath, '-e', `require('fs').writeFileSync(${JSON.stringify(marker)}, 'ran')`]),
            allowedCommands: [process.execPath],
            approvalPolicy: 'human_gate_required'
        });

        expect(result.status).to.equal('proposed');
        expect(result.applied).to.equal(false);
        expect(result.stderr).to.contain('approval required');
        await expectRejected(fs.readFile(marker, 'utf8'));
    });

    it('rejects cwd traversal outside the workspace', async () => {
        await expectRejected(adapter.prepare(workspaceRootUri, {
            command: `${process.execPath} -v`,
            cwd: '..',
            allowedCommands: [process.execPath]
        }));
    });

    it('fails timed out commands and records timeout metadata', async () => {
        const result = await adapter.apply(workspaceRootUri, {
            command: JSON.stringify([process.execPath, '-e', 'setTimeout(() => undefined, 1000)']),
            allowedCommands: [process.execPath],
            approvalPolicy: 'auto_apply',
            timeoutMs: 50
        }, true);

        expect(result.status).to.equal('failed');
        expect(result.applied).to.equal(true);
        expect(result.timedOut).to.equal(true);
        expect(result.timeoutMs).to.equal(50);
        expect(result.completedAt).to.be.a('string');
    });

    it('truncates large stdout while preserving redaction', async () => {
        const result = await adapter.apply(workspaceRootUri, {
            command: JSON.stringify([process.execPath, '-e', "process.stdout.write('token=secret-value\\n' + 'x'.repeat(13000))"]),
            allowedCommands: [process.execPath],
            approvalPolicy: 'auto_apply',
            timeoutMs: 5000
        }, true);

        expect(result.status).to.equal('applied');
        expect(result.stdout).to.contain('token=[REDACTED]');
        expect(result.stdout).to.have.length.greaterThan(12000);
        expect(result.stdout).to.contain('[truncated command output]');
        expect(result.stdout).to.not.contain('secret-value');
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

import { expect } from 'chai';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { FileUri } from '@theia/core/lib/common/file-uri';
import { AgentMarkdownStore } from './agent-markdown-store';

class WorkspaceOnlyAgentMarkdownStore extends AgentMarkdownStore {
    protected override listCatalogAgents(): Promise<[]> {
        return Promise.resolve([]);
    }
}

describe('AgentMarkdownStore', () => {

    let tempDir: string;
    let workspaceRootUri: string;
    let store: AgentMarkdownStore;

    beforeEach(async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'flow-agent-store-'));
        workspaceRootUri = FileUri.create(tempDir).toString();
        store = new WorkspaceOnlyAgentMarkdownStore();
    });

    afterEach(async () => {
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('writes and reads Markdown agents from the workspace store', async () => {
        const written = await store.writeAgent(workspaceRootUri, 'specialists/builder.md', '# Builder\n\nBuild the feature.');

        const read = await store.readAgent(workspaceRootUri, 'specialists/builder.md');

        expect(read?.content).to.equal('# Builder\n\nBuild the feature.\n');
        expect(read?.relativePath).to.equal('specialists/builder.md');
        expect(normalizePath(written.path)).to.equal(normalizePath(agentPath('specialists', 'builder.md')));
        expect(written.uri).to.equal(FileUri.create(agentPath('specialists', 'builder.md')).toString());
    });

    it('lists Markdown agents recursively in relative path order', async () => {
        await store.writeAgent(workspaceRootUri, 'reviewer.md', '# Reviewer');
        await store.writeAgent(workspaceRootUri, 'specialists/builder.md', '# Builder');
        await fs.writeFile(agentPath('notes.txt'), 'ignore me', 'utf8');

        const agents = await store.listAgents(workspaceRootUri);

        expect(agents.map(agent => agent.relativePath)).to.deep.equal([
            'reviewer.md',
            'specialists/builder.md'
        ]);
        expect(agents.every(agent => normalizePath(agent.path).startsWith(normalizePath(path.join(tempDir, '.theia', 'flow', 'agents'))))).to.equal(true);
    });

    it('can create a default Markdown template for a missing referenced agent', async () => {
        const agent = await store.readAgent(workspaceRootUri, 'planner.md', { createIfMissing: true });

        expect(agent?.content).to.contain('# Planner');
        expect(agent?.content).to.contain('## Instructions');
        expect(agent?.content).to.contain('Workflow structure, transitions, guards, joins, loops, gates, and orchestration rules stay in the workflow file and Flow Kernel.');
        expect(await fs.readFile(agentPath('planner.md'), 'utf8')).to.equal(agent?.content);
    });

    it('creates a new Markdown agent and refuses to overwrite an existing file', async () => {
        const agent = await store.createAgent(workspaceRootUri, 'specialists/designer.md', { title: 'Product Designer' });

        expect(agent.relativePath).to.equal('specialists/designer.md');
        expect(agent.content).to.contain('# Product Designer');
        await expectAnyRejected(() => store.createAgent(workspaceRootUri, 'specialists/designer.md'), 'already exists');
    });

    it('edits an existing Markdown agent without changing its relative path', async () => {
        await store.createAgent(workspaceRootUri, 'specialists/reviewer.md', { title: 'Reviewer' });

        const edited = await store.writeAgent(workspaceRootUri, 'specialists/reviewer.md', '# Reviewer\n\nValidate contract changes.');

        expect(edited.relativePath).to.equal('specialists/reviewer.md');
        expect(edited.content).to.equal('# Reviewer\n\nValidate contract changes.\n');
        expect((await store.readAgent(workspaceRootUri, 'specialists/reviewer.md'))?.content).to.equal(edited.content);
    });

    it('duplicates an existing Markdown agent into a new safe path', async () => {
        await store.writeAgent(workspaceRootUri, 'builder.md', '# Builder\n\nBuild the feature.');

        const duplicate = await store.duplicateAgent(workspaceRootUri, 'builder.md', 'copies/builder-copy.md', { title: 'Builder Copy' });

        expect(duplicate.relativePath).to.equal('copies/builder-copy.md');
        expect(duplicate.content).to.contain('# Builder Copy');
        expect(duplicate.content).to.contain('Build the feature.');
        await expectRejected(() => store.duplicateAgent(workspaceRootUri, '../builder.md', 'copy.md'));
        await expectRejected(() => store.duplicateAgent(workspaceRootUri, 'builder.md', '../copy.md'));
    });

    it('renames an existing Markdown agent into a new safe path', async () => {
        await store.writeAgent(workspaceRootUri, 'drafts/reviewer.md', '# Reviewer');

        const renamed = await store.renameAgent(workspaceRootUri, 'drafts/reviewer.md', 'reviewer.md');

        expect(renamed.relativePath).to.equal('reviewer.md');
        expect(await store.readAgent(workspaceRootUri, 'drafts/reviewer.md')).to.equal(undefined);
        expect((await store.readAgent(workspaceRootUri, 'reviewer.md'))?.content).to.equal('# Reviewer\n');
        await expectRejected(() => store.renameAgent(workspaceRootUri, 'reviewer.md', '../../outside.md'));
    });

    it('rejects path traversal outside the workspace agent store', async () => {
        await expectRejected(() => store.writeAgent(workspaceRootUri, '../outside.md', '# Outside'));
        await expectRejected(() => store.readAgent(workspaceRootUri, 'nested/../../outside.md'));
        await expectRejected(() => store.writeAgent(workspaceRootUri, path.join(tempDir, 'absolute.md'), '# Absolute'));
    });

    function agentPath(...segments: string[]): string {
        return path.join(tempDir, '.theia', 'flow', 'agents', ...segments);
    }
});

async function expectRejected(action: () => Promise<unknown>): Promise<void> {
    await expectAnyRejected(action, 'Agent path');
}

async function expectAnyRejected(action: () => Promise<unknown>, message: string): Promise<void> {
    try {
        await action();
        throw new Error('Expected operation to fail.');
    } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.contain(message);
    }
}

function normalizePath(value: string): string {
    return path.normalize(value).toLowerCase();
}

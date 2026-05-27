import { expect } from 'chai';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { FileUri } from '@theia/core/lib/common/file-uri';
import { FlowRun, FlowWorkflow } from '../common';
import { MarkdownWorkloadStore } from './markdown-workload-store';

describe('MarkdownWorkloadStore', () => {

    let tempDir: string;
    let workspaceRootUri: string;
    let store: MarkdownWorkloadStore;

    beforeEach(async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'flow-workload-store-'));
        workspaceRootUri = FileUri.create(tempDir).toString();
        store = new MarkdownWorkloadStore();
    });

    afterEach(async () => {
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('materializes workload input and output envelopes outside the Theia package', async () => {
        const run = await store.materializeRun(workspaceRootUri, workflow, sampleRun());
        const workload = run.workloads[0];
        const workloadDir = path.join(tempDir, '.theia', 'flow', 'runs', run.id, 'workloads', workload.id);

        const result = JSON.parse(await fs.readFile(path.join(workloadDir, 'output', 'result.json'), 'utf8'));
        const report = await fs.readFile(path.join(workloadDir, 'output', 'report.md'), 'utf8');
        const workOrder = await fs.readFile(path.join(workloadDir, 'input', 'work-order.md'), 'utf8');
        const auditLinks = JSON.parse(await fs.readFile(path.join(workloadDir, 'output', 'audit-links.json'), 'utf8'));

        expect(result.status).to.equal('completed');
        expect(result.artifacts.map((artifact: { path: string }) => artifact.path)).to.deep.equal(['reports/build.md']);
        expect(report).to.contain('Status: completed');
        expect(report).to.contain('## Audit links');
        expect(workOrder).to.contain('agents/builder.md');
        expect(run.artifacts.some(artifact => artifact.uri.startsWith(FileUri.create(workloadDir).toString()))).to.equal(true);
        expect(run.artifacts.some(artifact => artifact.summary === 'Audit links for build.')).to.equal(true);
        expect(workload.reportUri).to.contain('/output/report.md');
        expect(workload.effectIds.some(effectId => effectId.includes('workload-envelope'))).to.equal(true);
        expect(auditLinks.schemaVersion).to.equal('flow.workload.audit-links/v1');
        expect(auditLinks.links.map((link: { kind: string }) => link.kind)).to.include.members([
            'prompt',
            'context_pack',
            'work_order',
            'result',
            'report',
            'effects',
            'issues',
            'memory_candidates',
            'artifact'
        ]);
        expect(auditLinks.links.find((link: { kind: string }) => link.kind === 'prompt')).to.include({
            path: 'input/prompt.md',
            source: 'run.prompt'
        });
        expect(auditLinks.links.find((link: { kind: string }) => link.kind === 'artifact')).to.include({
            path: 'output/artifacts/reports/build.md',
            source: 'reports/build.md'
        });
    });

    it('aggregates workload issues by normalized severity and dedupes repeated findings', async () => {
        const run = await store.materializeRun(workspaceRootUri, workflow, issueRun());
        const issuesDir = path.join(tempDir, '.theia', 'flow', 'runs', run.id, 'issues');

        const blocking = await readJsonLines(path.join(issuesDir, 'blocking.jsonl'));
        const nonBlocking = await readJsonLines(path.join(issuesDir, 'non_blocking.jsonl'));
        const followup = await readJsonLines(path.join(issuesDir, 'followup.jsonl'));
        const summary = JSON.parse(await fs.readFile(path.join(issuesDir, 'summary.json'), 'utf8'));

        expect(blocking).to.have.length(1);
        expect(blocking[0]).to.include({
            severity: 'blocking',
            sourceSeverity: 'critical',
            summary: 'Contract route is missing.'
        });
        expect(nonBlocking.map(issue => issue.summary)).to.deep.equal(['Minor copy issue.']);
        expect(followup.map(issue => issue.summary)).to.deep.equal(['Add visual regression coverage.']);
        expect(summary.counts).to.deep.equal({
            all: 3,
            blocking: 1,
            non_blocking: 1,
            followup: 1
        });
    });

    it('rejects artifact output paths that escape the workload artifact directory', async () => {
        const run = sampleRun();
        run.workloads[0] = {
            ...run.workloads[0],
            outputEnvelope: {
                status: 'completed',
                result: {
                    status: 'completed',
                    summary: 'Bad artifact.',
                    artifacts: [{ id: 'bad', path: '../outside.md', type: 'report' }],
                    signals: {},
                    issues: []
                },
                artifacts: [{ id: 'bad', path: '../outside.md', type: 'report' }],
                effects: [],
                signals: {},
                issues: [],
                report: 'Bad artifact.'
            }
        };

        await expectRejected(store.materializeRun(workspaceRootUri, workflow, run));
        await expectRejected(fs.readFile(path.join(tempDir, '.theia', 'flow', 'runs', run.id, 'workloads', 'outside.md'), 'utf8'));
    });

    it('redacts secrets from visible workload prompts, reports, envelopes, and context packs', async () => {
        const source = sampleRun();
        source.prompt = 'Build with token=secret-value';
        source.contextPack = {
            ...source.contextPack!,
            summary: 'Context password=verysecretvalue'
        };
        source.workloads[0].outputEnvelope = {
            status: 'completed',
            result: {
                status: 'completed',
                summary: 'Summary API_KEY=abcdefghijklmnop',
                artifacts: [],
                signals: {},
                issues: [{ severity: 'high', type: 'secret', summary: 'Found token=abcdefghijklmnopqrst' }]
            },
            artifacts: [],
            effects: [{ type: 'command', summary: 'stdout password=verysecretvalue', stdout: 'token=abcdefghijklmnopqrst' }],
            signals: {},
            issues: [{ severity: 'high', type: 'secret', summary: 'Found token=abcdefghijklmnopqrst' }],
            report: 'Report token=abcdefghijklmnopqrst'
        };

        const run = await store.materializeRun(workspaceRootUri, workflow, source);
        const workloadDir = path.join(tempDir, '.theia', 'flow', 'runs', run.id, 'workloads', run.workloads[0].id);
        const prompt = await fs.readFile(path.join(workloadDir, 'input', 'prompt.md'), 'utf8');
        const context = await fs.readFile(path.join(workloadDir, 'input', 'context-pack.md'), 'utf8');
        const report = await fs.readFile(path.join(workloadDir, 'output', 'report.md'), 'utf8');
        const result = await fs.readFile(path.join(workloadDir, 'output', 'result.json'), 'utf8');
        const effects = await fs.readFile(path.join(workloadDir, 'output', 'effects.json'), 'utf8');
        const issues = await fs.readFile(path.join(workloadDir, 'output', 'issues.jsonl'), 'utf8');

        for (const content of [prompt, context, report, result, effects, issues]) {
            expect(content).to.contain('[REDACTED]');
            expect(content).to.not.contain('secret-value');
            expect(content).to.not.contain('verysecretvalue');
            expect(content).to.not.contain('abcdefghijklmnopqrst');
        }
    });

    it('refreshes materialized workload output when effects change after the first materialization', async () => {
        const source = sampleRun();
        source.workloads[0].outputEnvelope = {
            status: 'completed',
            result: {
                status: 'completed',
                summary: 'Effect proposed.',
                artifacts: [],
                signals: {},
                issues: []
            },
            artifacts: [],
            effects: [{ type: 'file.edited', path: 'src/index.ts', summary: 'Updated source.', status: 'proposed' }],
            signals: {},
            issues: [],
            report: 'Effect proposed.'
        };

        const first = await store.materializeRun(workspaceRootUri, workflow, source);
        first.workloads[0].outputEnvelope!.effects = [{ type: 'file.edited', path: 'src/index.ts', summary: 'Updated source.', status: 'applied' }];
        first.workloads[0].outputEnvelope!.result.summary = 'Effect applied.';
        await store.materializeRun(workspaceRootUri, workflow, first);

        const workloadDir = path.join(tempDir, '.theia', 'flow', 'runs', first.id, 'workloads', first.workloads[0].id);
        const effects = JSON.parse(await fs.readFile(path.join(workloadDir, 'output', 'effects.json'), 'utf8'));
        const report = await fs.readFile(path.join(workloadDir, 'output', 'report.md'), 'utf8');

        expect(effects[0].status).to.equal('applied');
        expect(report).to.contain('Effect applied.');
    });
});

const workflow: FlowWorkflow = {
    version: 'flow.workflow/v1',
    id: 'markdown_runtime',
    name: 'Markdown Runtime',
    agents: {
        builder: 'agents/builder.md'
    },
    states: {
        build: {
            type: 'agent',
            agent: 'builder',
            input: { include: ['request.md'] },
            outputs: ['reports/build.md']
        }
    },
    transitions: []
};

function sampleRun(): FlowRun {
    return {
        id: 'run-1',
        workflowId: workflow.id,
        prompt: 'Build it',
        status: 'running',
        createdAt: '2026-05-19T00:00:00.000Z',
        updatedAt: '2026-05-19T00:00:01.000Z',
        currentStateIds: ['build'],
        stateStatuses: { build: 'done' },
        workloads: [{
            id: 'workload-1',
            runId: 'run-1',
            stateId: 'build',
            agent: 'builder',
            status: 'done',
            inputArtifacts: ['request.md'],
            outputArtifacts: [],
            issues: [],
            effectIds: [],
            createdAt: '2026-05-19T00:00:00.000Z',
            updatedAt: '2026-05-19T00:00:01.000Z'
        }],
        events: [],
        artifacts: [],
        effects: [],
        signals: [{
            key: 'build.status',
            value: 'completed',
            stateId: 'build',
            runId: 'run-1',
            createdAt: '2026-05-19T00:00:01.000Z'
        }],
        gates: [],
        contextPack: {
            summary: 'Focused context.',
            workflow: {
                id: workflow.id,
                name: workflow.name,
                stateCount: 1,
                transitionCount: 0,
                agentIds: ['builder']
            },
            files: [],
            symbols: [],
            signals: []
        },
        tick: 1
    };
}

function issueRun(): FlowRun {
    const run = sampleRun();
    return {
        ...run,
        id: 'run-issues',
        workloads: [{
            ...run.workloads[0],
            id: 'backend-workload',
            runId: 'run-issues',
            outputEnvelope: outputEnvelope([
                { severity: 'critical', type: 'contract', summary: 'Contract route is missing.', impact: 'API cannot be called.' },
                { severity: 'low', type: 'copy', summary: 'Minor copy issue.' }
            ])
        }, {
            ...run.workloads[0],
            id: 'frontend-workload',
            runId: 'run-issues',
            outputEnvelope: outputEnvelope([
                { severity: 'blocker', type: 'contract', summary: 'Contract route is missing.', impact: 'API cannot be called.' },
                { severity: 'info', type: 'qa_followup', summary: 'Add visual regression coverage.' }
            ])
        }]
    };
}

function outputEnvelope(issues: Array<{ severity: string; type: string; summary: string; impact?: string }>): FlowRun['workloads'][number]['outputEnvelope'] {
    return {
        status: 'completed',
        result: {
            status: 'completed',
            summary: 'Completed with findings.',
            artifacts: [],
            signals: {},
            issues
        },
        artifacts: [],
        effects: [],
        signals: {},
        issues,
        report: 'Completed with findings.'
    };
}

async function readJsonLines(file: string): Promise<Array<Record<string, string>>> {
    const content = await fs.readFile(file, 'utf8');
    return content.split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => JSON.parse(line));
}

async function expectRejected(action: Promise<unknown>): Promise<void> {
    try {
        await action;
    } catch {
        return;
    }
    throw new Error('Expected promise to be rejected.');
}

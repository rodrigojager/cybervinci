import { enableJSDOM } from '@theia/core/lib/browser/test/jsdom';
const disableJSDOM = enableJSDOM();

import { FrontendApplicationConfigProvider } from '@theia/core/lib/browser/frontend-application-config-provider';
FrontendApplicationConfigProvider.set({});

import { expect } from 'chai';
import { artifactUriToOpenUri } from './flow-artifacts';
import { FlowClientImpl } from './flow-client';
import { FlowWidget } from './flow-widget';
import { FLOW_CAPABILITIES } from '../common/flow-capabilities';
import { FlowService } from '../common/flow-protocol';
import { deriveFlowCanvasModel, deriveFlowKanbanColumns } from '../common/flow-derivation';
import { filterFlowEvents, normalizeFlowEvents } from '../common/flow-events';
import {
    FlowEvent,
    FlowRun,
    FlowWorkflow,
    FlowWorkload
} from '../common/flow-types';

describe('Flow browser integration', () => {

    after(() => disableJSDOM());

    it('resolves flow artifact URIs to materialized workspace files', () => {
        const uri = artifactUriToOpenUri(
            'flow://run-1/frontend/reports/final.md',
            'file:///workspace/project'
        );

        expect(uri.toString()).to.equal('file:///workspace/project/.theia/flow/runs/run-1/frontend/output/artifacts/reports/final.md');
    });

    it('keeps external and relative artifact URIs openable', () => {
        expect(artifactUriToOpenUri('https://example.com/report.md', 'file:///workspace/project').toString())
            .to.equal('https://example.com/report.md');
        expect(artifactUriToOpenUri('reports/local.md', 'file:///workspace/project').toString())
            .to.equal('file:///workspace/project/reports/local.md');
    });

    it('streams run updates through the browser client and refreshes canvas and kanban projections', () => {
        const client = new FlowClientImpl();
        const workflow = workflowFixture();
        const updates: FlowRun[] = [];
        const dispose = client.onRunUpdate(update => updates.push({
            ...update.run,
            events: normalizeFlowEvents(update.run.events)
        }));

        client.onRunUpdated({ workspaceRootUri: 'file:///workspace/project', run: pendingRun(), reason: 'started' });
        client.onRunUpdated({ workspaceRootUri: 'file:///workspace/project', run: runningRun(), reason: 'tick' });
        dispose();
        client.onRunUpdated({ workspaceRootUri: 'file:///workspace/project', run: completedRun(), reason: 'tick' });

        expect(updates).to.have.length(2);
        expect(updates[1].events.map(event => event.id)).to.deep.equal(['1', '2', '3', '4', '5']);
        expect(updates[1].events[2].message).to.equal('frontend produced report');

        const canvas = deriveFlowCanvasModel(workflow, updates[1]);
        expect(canvas.nodes.find(node => node.id === 'frontend')?.status).to.equal('running');
        expect(canvas.nodes.find(node => node.id === 'intake')?.status).to.equal('done');

        const kanban = deriveFlowKanbanColumns(updates[1].workloads);
        expect(kanban.find(column => column.id === 'running')?.workloads.map(workload => workload.id)).to.deep.equal(['frontend-work']);
        expect(kanban.find(column => column.id === 'done')?.workloads.map(workload => workload.id)).to.deep.equal(['intake-work']);
    });

    it('applies streamed run updates to the widget state used by canvas, kanban, inspector, events, effects, and artifacts', () => {
        const widget = new TestFlowWidget();
        const initialRun = pendingRun();
        const streamedRun = runFixture({
            currentStateIds: ['frontend'],
            stateStatuses: { intake: 'done', frontend: 'running' },
            workloads: [
                workload('intake-work', 'intake', 'done'),
                {
                    ...workload('frontend-work', 'frontend', 'running', ['flow://run-1/frontend/reports/final.md']),
                    effectIds: ['effect-1']
                }
            ],
            artifacts: [{
                id: 'artifact-1',
                runId: 'run-1',
                stateId: 'frontend',
                uri: 'flow://run-1/frontend/reports/final.md',
                kind: 'report',
                summary: 'Frontend report',
                createdAt: '2026-05-20T10:04:00.000Z'
            }],
            effects: [{
                id: 'effect-1',
                runId: 'run-1',
                stateId: 'frontend',
                kind: 'file',
                type: 'file.edited',
                path: 'src/frontend.tsx',
                status: 'proposed',
                summary: 'Frontend file edit'
            }],
            events: runningRun().events
        });
        widget.injectForTest({
            approveMemoryCandidate: async request => ({ ...initialRun, prompt: request.content || initialRun.prompt })
        }, 'file:///workspace/project', initialRun);

        widget.applyRunUpdateForTest(streamedRun);
        const activeRun = widget.activeRunForTest();

        expect(activeRun?.currentStateIds).to.deep.equal(['frontend']);
        expect(activeRun?.workloads.find(item => item.id === 'frontend-work')?.status).to.equal('running');
        expect(activeRun?.artifacts.map(artifact => artifact.id)).to.deep.equal(['artifact-1']);
        expect(activeRun?.effects.map(effect => effect.id)).to.deep.equal(['effect-1']);
        expect(activeRun?.events.map(event => event.id)).to.deep.equal(['1', '2', '3', '4', '5']);
        expect(widget.selectedArtifactIdForTest()).to.equal('artifact-1');
    });

    it('filters streamed events by type, state, artifact, effect, and severity after dedupe', () => {
        const events = normalizeFlowEvents(runningRun().events);

        expect(filterFlowEvents(events, { eventType: 'artifact.created' }).map(event => event.id)).to.deep.equal(['3']);
        expect(filterFlowEvents(events, { stateId: 'frontend' }).map(event => event.id)).to.deep.equal(['2', '3', '4']);
        expect(filterFlowEvents(events, { artifact: 'reports/final.md' }).map(event => event.id)).to.deep.equal(['3']);
        expect(filterFlowEvents(events, { effect: 'effect-1' }).map(event => event.id)).to.deep.equal(['4']);
        expect(filterFlowEvents(events, { severity: 'high' }).map(event => event.id)).to.deep.equal(['5']);
    });

    it('sends memory approval UI decisions with edited content, scope, and target', async () => {
        const widget = new TestFlowWidget();
        const activeRun = memoryRun();
        const approvals: unknown[] = [];
        widget.injectForTest({
            approveMemoryCandidate: async request => {
                approvals.push(request);
                return {
                    ...activeRun,
                    memoryCandidates: activeRun.memoryCandidates?.map(candidate => ({ ...candidate, status: 'written' as const }))
                };
            }
        }, 'file:///workspace/project', activeRun);

        await widget.decideMemoryCandidateForTest(
            'candidate-1',
            'approved',
            'Remember the edited Memory note.',
            'project',
            'repo-main'
        );

        expect(approvals).to.deep.equal([{
            workspaceRootUri: 'file:///workspace/project',
            runId: 'run-1',
            candidateId: 'candidate-1',
            decision: 'approved',
            content: 'Remember the edited Memory note.',
            scope: 'project',
            target: 'repo-main'
        }]);
        expect(widget.activeRunForTest()?.memoryCandidates?.[0].status).to.equal('written');
    });
});

class TestFlowWidget extends FlowWidget {
    injectForTest(service: Pick<FlowService, 'approveMemoryCandidate'>, workspaceRootUri: string, activeRun: FlowRun): void {
        Object.defineProperty(this, 'flowService', { value: service });
        Object.defineProperty(this, 'workspaceService', {
            value: {
                roots: Promise.resolve([{ resource: { toString: () => workspaceRootUri } }])
            }
        });
        this.state = {
            ...this.state,
            snapshot: {
                workflows: [],
                activeRun,
                capabilities: FLOW_CAPABILITIES
            }
        };
    }

    decideMemoryCandidateForTest(
        candidateId: string,
        decision: 'approved' | 'rejected',
        content: string,
        scope?: 'ide' | 'workspace' | 'project' | 'workflow' | 'run' | 'agent',
        target?: string
    ): Promise<void> {
        return this.decideMemoryCandidate(candidateId, decision, content, scope, target);
    }

    activeRunForTest(): FlowRun | undefined {
        return this.state.snapshot?.activeRun;
    }

    selectedArtifactIdForTest(): string | undefined {
        return this.state.selectedArtifactId;
    }

    applyRunUpdateForTest(run: FlowRun): void {
        this.applyRunUpdate(run);
    }
}

function workflowFixture(): FlowWorkflow {
    return {
        version: 'flow.workflow/v1',
        id: 'contracted_delivery',
        name: 'Contracted Delivery',
        states: {
            intake: { type: 'input' },
            frontend: { type: 'agent', agent: 'frontend' }
        },
        transitions: [
            { id: 'intake_to_frontend', from: 'intake', to: 'frontend', on: 'workload.completed' }
        ]
    };
}

function pendingRun(): FlowRun {
    return runFixture({
        currentStateIds: ['intake'],
        stateStatuses: { intake: 'running', frontend: 'pending' },
        workloads: [workload('intake-work', 'intake', 'running')],
        events: [
            event({ id: '1', type: 'run.started', stateId: 'intake', message: 'started' })
        ]
    });
}

function runningRun(): FlowRun {
    return runFixture({
        currentStateIds: ['frontend'],
        stateStatuses: { intake: 'done', frontend: 'running' },
        workloads: [
            workload('intake-work', 'intake', 'done'),
            workload('frontend-work', 'frontend', 'running', ['flow://run-1/frontend/reports/final.md'])
        ],
        events: [
            event({ id: '3', timestamp: '2026-05-20T10:03:00.000Z', type: 'artifact.created', stateId: 'frontend', workloadId: 'frontend-work', message: 'duplicate artifact', payload: { seq: 3, path: 'reports/old.md' } }),
            event({ id: '1', timestamp: '2026-05-20T10:01:00.000Z', type: 'run.started', stateId: 'intake', message: 'started', payload: { seq: 1 } }),
            event({ id: '2', timestamp: '2026-05-20T10:02:00.000Z', type: 'workload.started', stateId: 'frontend', workloadId: 'frontend-work', message: 'frontend started', payload: { seq: 2 } }),
            event({ id: '3', timestamp: '2026-05-20T10:04:00.000Z', type: 'artifact.created', stateId: 'frontend', workloadId: 'frontend-work', message: 'frontend produced report', payload: { seq: 3, path: 'reports/final.md' } }),
            event({ id: '4', timestamp: '2026-05-20T10:05:00.000Z', type: 'effect.applied', stateId: 'frontend', workloadId: 'frontend-work', message: 'file edited', payload: { effectId: 'effect-1', type: 'file.edited' } }),
            event({ id: '5', timestamp: '2026-05-20T10:06:00.000Z', type: 'workload.failed', stateId: 'qa', message: 'qa failed', payload: { severity: 'high' } })
        ]
    });
}

function completedRun(): FlowRun {
    return runFixture({
        status: 'completed',
        currentStateIds: [],
        stateStatuses: { intake: 'done', frontend: 'done' },
        workloads: [
            workload('intake-work', 'intake', 'done'),
            workload('frontend-work', 'frontend', 'done', ['flow://run-1/frontend/reports/final.md'])
        ],
        events: runningRun().events
    });
}

function memoryRun(): FlowRun {
    return runFixture({
        currentStateIds: ['memory'],
        stateStatuses: { memory: 'running' },
        memoryCandidates: [{
            id: 'candidate-1',
            runId: 'run-1',
            stateId: 'memory',
            source: 'effect',
            kind: 'summary',
            content: 'Original memory candidate.',
            reason: 'Memory memory review.',
            confidence: 0.9,
            status: 'candidate',
            createdAt: '2026-05-20T10:00:00.000Z'
        }]
    });
}

function runFixture(partial: Partial<FlowRun>): FlowRun {
    return {
        id: 'run-1',
        workflowId: 'contracted_delivery',
        prompt: 'ship feature',
        status: partial.status || 'running',
        createdAt: '2026-05-20T10:00:00.000Z',
        updatedAt: '2026-05-20T10:00:00.000Z',
        currentStateIds: partial.currentStateIds || [],
        stateStatuses: partial.stateStatuses || {},
        workloads: partial.workloads || [],
        events: partial.events || [],
        artifacts: partial.artifacts || [],
        effects: partial.effects || [],
        signals: [],
        gates: [],
        tick: 1,
        memoryCandidates: partial.memoryCandidates
    };
}

function workload(id: string, stateId: string, status: FlowWorkload['status'], outputArtifacts: string[] = []): FlowWorkload {
    return {
        id,
        runId: 'run-1',
        stateId,
        status,
        inputArtifacts: [],
        outputArtifacts,
        issues: [],
        effectIds: [],
        createdAt: '2026-05-20T10:00:00.000Z',
        updatedAt: '2026-05-20T10:00:00.000Z'
    };
}

function event(partial: Partial<FlowEvent>): FlowEvent {
    return {
        id: partial.id || 'event',
        type: partial.type || 'run.started',
        timestamp: partial.timestamp || '2026-05-20T10:00:00.000Z',
        stateId: partial.stateId,
        workloadId: partial.workloadId,
        gateId: partial.gateId,
        message: partial.message || 'event',
        payload: partial.payload
    };
}

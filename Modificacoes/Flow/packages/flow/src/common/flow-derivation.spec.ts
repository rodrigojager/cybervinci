import { expect } from 'chai';
import {
    addFlowParallelBranch,
    addFlowWorkflowState,
    addFlowWorkflowTransition,
    flowWorkflowStateReferences,
    deriveFlowCanvasModel,
    deriveFlowFlowDraft,
    deriveFlowKanbanColumns,
    removeFlowWorkflowState,
    validateFlowWorkflow
} from './index';
import { FlowRun, FlowWorkflow, FlowWorkload } from './flow-types';

describe('Flow common contracts', () => {

    it('validates workflow transition references', () => {
        const workflow: FlowWorkflow = {
            version: 'flow.workflow/v1',
            id: 'invalid',
            name: 'Invalid',
            states: {
                intake: { type: 'input' }
            },
            transitions: [
                { from: 'intake', to: 'missing', on: 'run.started' }
            ]
        };

        const result = validateFlowWorkflow(workflow);

        expect(result.valid).to.equal(false);
        expect(result.errors.map(error => error.code)).to.contain('transition.to.invalid');
    });

    it('validates branch states and allows transitions to branch ids', () => {
        const workflow: FlowWorkflow = {
            version: 'flow.workflow/v1',
            id: 'parallel',
            name: 'Parallel',
            states: {
                intake: { type: 'input' },
                delivery: {
                    type: 'parallel',
                    branches: {
                        backend: { type: 'agent', agent: 'backend' },
                        frontend: { type: 'agent', agent: 'frontend' }
                    }
                },
                join: { type: 'join', waitFor: ['backend', 'frontend'] }
            },
            transitions: [
                { from: 'intake', to: 'delivery', on: 'workload.completed' },
                { from: 'backend', to: 'join', on: 'workload.completed' },
                { from: 'frontend', to: 'join', on: 'workload.completed' }
            ]
        };

        const result = validateFlowWorkflow(workflow);

        expect(result.valid, result.errors.map(error => error.message).join('\n')).to.equal(true);
        expect(result.errors).to.deep.equal([]);
    });

    it('rejects join waitFor references to deleted or missing states', () => {
        const workflow: FlowWorkflow = {
            version: 'flow.workflow/v1',
            id: 'broken_join',
            name: 'Broken Join',
            states: {
                delivery: { type: 'parallel', branches: { backend: { type: 'agent', agent: 'backend' } } },
                join: { type: 'join', waitFor: ['backend', 'frontend'] }
            },
            transitions: [
                { from: 'backend', to: 'join', on: 'workload.completed' }
            ]
        };

        const result = validateFlowWorkflow(workflow);

        expect(result.valid).to.equal(false);
        expect(result.errors.map(error => error.code)).to.contain('state.join.wait_for.invalid');
    });

    it('derives canvas nodes, saved layout, and guarded transition labels from workflow JSON', () => {
        const workflow = sampleWorkflow();
        const run: FlowRun = {
            id: 'run-1',
            workflowId: workflow.id,
            prompt: 'ship feature',
            status: 'running',
            createdAt: '2026-05-19T00:00:00.000Z',
            updatedAt: '2026-05-19T00:00:00.000Z',
            currentStateIds: ['build'],
            stateStatuses: {
                intake: 'done',
                build: 'running'
            },
            workloads: [],
            events: [],
            artifacts: [],
            effects: [],
            signals: [],
            gates: [],
            tick: 1
        };

        const canvas = deriveFlowCanvasModel(workflow, run);

        expect(canvas.nodes.map(node => node.id)).to.deep.equal(['intake', 'build']);
        expect(canvas.nodes.find(node => node.id === 'build')?.status).to.equal('running');
        expect(canvas.nodes.find(node => node.id === 'build')?.x).to.equal(320);
        expect(canvas.nodes.find(node => node.id === 'build')?.y).to.equal(140);
        expect(canvas.edges[0].guardSummary).to.equal('artifact.exists');
    });

    it('proves Barn-style flow reuse stays visual and state-machine based', () => {
        const workflow = parallelJoinWorkflow();

        const draft = deriveFlowFlowDraft(workflow);

        expect(draft.nodes.map(node => node.data.stateId)).to.deep.equal(['intake', 'parallel', 'backend', 'frontend', 'join', 'approval', 'qa']);
        expect(draft.nodes.every(node => node.type === 'flowState')).to.equal(true);
        expect(draft.nodes.find(node => node.id === 'backend')?.data).to.include({ stateType: 'agent', agent: 'backend' });
        expect(draft.edges.find(edge => edge.id === 'backend_to_join')).to.deep.include({
            source: 'backend',
            target: 'join'
        });
        expect(draft.edges.find(edge => edge.id === 'qa_repair_loop')?.data.guardSummary).to.equal('loop.count_lt');
        expect(draft.edges.find(edge => edge.id === 'qa_repair_loop')?.label).to.equal('condition.failed / loop.count_lt');
        expect(draft.viewport.width).to.be.greaterThan(640);
        expect(draft.viewport.height).to.be.greaterThan(360);
    });

    it('groups workloads into stable kanban columns', () => {
        const workloads: FlowWorkload[] = [
            workload('a', 'running'),
            workload('b', 'done'),
            workload('c', 'running')
        ];

        const columns = deriveFlowKanbanColumns(workloads);

        expect(columns.map(column => column.id)).to.deep.equal(['pending', 'ready', 'running', 'waiting', 'review', 'done', 'failed']);
        expect(columns.find(column => column.id === 'running')?.workloads.map(item => item.id)).to.deep.equal(['a', 'c']);
    });

    it('mutates workflow by adding states and connecting them with stable transition ids', () => {
        let workflow = emptyWorkflow();

        const intake = addFlowWorkflowState(workflow, 'input');
        workflow = intake.workflow;
        const agent = addFlowWorkflowState(workflow, 'agent');
        workflow = agent.workflow;
        const duplicateAgent = addFlowWorkflowState(workflow, 'agent');
        workflow = duplicateAgent.workflow;
        const connected = addFlowWorkflowTransition(workflow, intake.stateId, agent.stateId);
        workflow = connected.workflow;

        expect(intake.stateId).to.equal('input');
        expect(agent.stateId).to.equal('agent');
        expect(duplicateAgent.stateId).to.equal('agent_2');
        expect(connected.transition).to.include({ id: 'input_to_agent', from: 'input', to: 'agent', on: 'workload.completed' });
        expect(validateFlowWorkflow(workflow).valid).to.equal(true);
    });

    it('does not connect unknown workflow states', () => {
        const workflow = sampleWorkflow();

        const result = addFlowWorkflowTransition(workflow, 'intake', 'missing');

        expect(result.transition).to.equal(undefined);
        expect(result.workflow.transitions).to.deep.equal(workflow.transitions);
    });

    it('deletes unreferenced top-level and branch states without leaving visual nodes behind', () => {
        let workflow = emptyWorkflow();
        workflow = addFlowWorkflowState(workflow, 'input').workflow;
        workflow = addFlowWorkflowState(workflow, 'parallel').workflow;
        const branch = addFlowParallelBranch(workflow, 'parallel', 'agent');
        workflow = branch.workflow;
        workflow = addFlowWorkflowState(workflow, 'report').workflow;

        workflow = removeFlowWorkflowState(workflow, branch.branchId!);
        workflow = removeFlowWorkflowState(workflow, 'report');

        const canvas = deriveFlowCanvasModel(workflow);
        expect(workflow.states).to.have.keys(['input', 'parallel']);
        expect(workflow.states.parallel.branches).to.equal(undefined);
        expect(canvas.nodes.map(node => node.id)).to.deep.equal(['input', 'parallel']);
        expect(validateFlowWorkflow(workflow).valid).to.equal(true);
    });

    it('reports delete blockers for transitions and join waitFor references', () => {
        const workflow = parallelJoinWorkflow();

        expect(flowWorkflowStateReferences(workflow, 'backend')).to.deep.equal([
            'transition backend_to_join',
            'state join.waitFor'
        ]);
    });

    it('derives and validates a parallel branch, join, gate, and bounded loop visually', () => {
        const workflow = parallelJoinWorkflow();
        const result = validateFlowWorkflow(workflow);
        const canvas = deriveFlowCanvasModel(workflow);

        expect(result.valid, result.errors.map(error => error.message).join('\n')).to.equal(true);
        expect(result.warnings.map(warning => warning.code)).to.not.contain('transition.loop.guard.missing');
        expect(canvas.nodes.map(node => node.id)).to.deep.equal(['intake', 'parallel', 'backend', 'frontend', 'join', 'approval', 'qa']);
        expect(canvas.nodes.find(node => node.id === 'parallel')?.type).to.equal('parallel');
        expect(canvas.nodes.find(node => node.id === 'join')?.type).to.equal('join');
        expect(canvas.nodes.find(node => node.id === 'approval')?.type).to.equal('gate');
        expect(canvas.edges.find(edge => edge.id === 'qa_repair_loop')?.guardSummary).to.equal('loop.count_lt');
        expect(canvas.edges.every(edge => edge.points.length === 2)).to.equal(true);
        expect(canvas.width).to.be.greaterThan(640);
        expect(canvas.height).to.be.greaterThan(360);
    });
});

function sampleWorkflow(): FlowWorkflow {
    return {
        version: 'flow.workflow/v1',
        id: 'sample',
        name: 'Sample',
        states: {
            intake: { type: 'input' },
            build: { type: 'agent', agent: 'frontend', layout: { x: 320, y: 140 } }
        },
        transitions: [
            { from: 'intake', to: 'build', on: 'run.started', guard: { 'artifact.exists': 'request.md' } }
        ]
    };
}

function emptyWorkflow(): FlowWorkflow {
    return {
        version: 'flow.workflow/v1',
        id: 'empty',
        name: 'Empty',
        states: {},
        transitions: []
    };
}

function parallelJoinWorkflow(): FlowWorkflow {
    return {
        version: 'flow.workflow/v1',
        id: 'parallel_join_gate_loop',
        name: 'Parallel Join Gate Loop',
        states: {
            intake: { type: 'input' },
            parallel: {
                type: 'parallel',
                branches: {
                    backend: { type: 'agent', agent: 'backend' },
                    frontend: { type: 'agent', agent: 'frontend' }
                }
            },
            join: { type: 'join', waitFor: ['backend', 'frontend'] },
            approval: {
                type: 'gate',
                gates: [{ id: 'approval_gate', title: 'Approve delivery', stateId: 'approval' }]
            },
            qa: {
                type: 'condition',
                retry: { max: 2, counter: 'qa_repair_count' },
                input: { signals: ['qa.status'] }
            }
        },
        transitions: [
            { id: 'intake_to_parallel', from: 'intake', to: 'parallel', on: 'workload.completed' },
            { id: 'backend_to_join', from: 'backend', to: 'join', on: 'workload.completed' },
            { id: 'frontend_to_join', from: 'frontend', to: 'join', on: 'workload.completed' },
            { id: 'join_to_approval', from: 'join', to: 'approval', on: 'workload.completed' },
            { id: 'approval_to_qa', from: 'approval', to: 'qa', on: 'gate.approved' },
            { id: 'qa_repair_loop', from: 'qa', to: 'qa', on: 'condition.failed', guard: { 'loop.count_lt': 2 } }
        ]
    };
}

function workload(id: string, status: FlowWorkload['status']): FlowWorkload {
    return {
        id,
        runId: 'run-1',
        stateId: id,
        status,
        inputArtifacts: [],
        outputArtifacts: [],
        issues: [],
        effectIds: [],
        createdAt: '2026-05-19T00:00:00.000Z',
        updatedAt: '2026-05-19T00:00:00.000Z'
    };
}

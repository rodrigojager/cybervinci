"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var index_1 = require("./index");
describe('Flow common contracts', function () {
    it('validates workflow transition references', function () {
        var workflow = {
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
        var result = (0, index_1.validateFlowWorkflow)(workflow);
        (0, chai_1.expect)(result.valid).to.equal(false);
        (0, chai_1.expect)(result.errors.map(function (error) { return error.code; })).to.contain('transition.to.invalid');
    });
    it('validates branch states and allows transitions to branch ids', function () {
        var workflow = {
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
        var result = (0, index_1.validateFlowWorkflow)(workflow);
        (0, chai_1.expect)(result.valid, result.errors.map(function (error) { return error.message; }).join('\n')).to.equal(true);
        (0, chai_1.expect)(result.errors).to.deep.equal([]);
    });
    it('rejects join waitFor references to deleted or missing states', function () {
        var workflow = {
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
        var result = (0, index_1.validateFlowWorkflow)(workflow);
        (0, chai_1.expect)(result.valid).to.equal(false);
        (0, chai_1.expect)(result.errors.map(function (error) { return error.code; })).to.contain('state.join.wait_for.invalid');
    });
    it('accepts configurable agent node runtime fields when deliverables match outputs', function () {
        var workflow = {
            version: 'flow.workflow/v1',
            id: 'configurable_agent',
            name: 'Configurable Agent',
            states: {
                intake: { type: 'input' },
                build: {
                    type: 'agent',
                    agent: 'builder',
                    provider: {
                        providerId: 'openai',
                        modelId: 'gpt-5',
                        options: { temperature: 0.2 }
                    },
                    systemPrompt: 'You are a focused build agent.',
                    taskPrompt: 'Produce the implementation summary.',
                    outputs: ['reports/build.md'],
                    deliverables: [
                        {
                            path: 'reports/build.md',
                            description: 'Build summary',
                            required: true,
                            kind: 'markdown'
                        }
                    ]
                }
            },
            transitions: [
                { from: 'intake', to: 'build', on: 'run.started' }
            ]
        };
        var result = (0, index_1.validateFlowWorkflow)(workflow);
        (0, chai_1.expect)(result.valid, result.errors.map(function (error) { return error.message; }).join('\n')).to.equal(true);
        (0, chai_1.expect)(result.errors).to.deep.equal([]);
    });
    it('rejects invalid provider configuration on agent nodes', function () {
        var workflow = {
            version: 'flow.workflow/v1',
            id: 'invalid_provider',
            name: 'Invalid Provider',
            states: {
                intake: { type: 'input' },
                build: {
                    type: 'agent',
                    provider: {
                        providerId: '',
                        modelId: ''
                    }
                }
            },
            transitions: [
                { from: 'intake', to: 'build', on: 'run.started' }
            ]
        };
        var result = (0, index_1.validateFlowWorkflow)(workflow);
        (0, chai_1.expect)(result.valid).to.equal(false);
        (0, chai_1.expect)(result.errors.map(function (error) { return error.code; })).to.include.members([
            'state.provider.id.required',
            'state.provider.model.invalid'
        ]);
    });
    it('rejects invalid deliverables and mismatched outputs on agent nodes', function () {
        var workflow = {
            version: 'flow.workflow/v1',
            id: 'invalid_deliverables',
            name: 'Invalid Deliverables',
            states: {
                intake: { type: 'input' },
                build: {
                    type: 'agent',
                    outputs: ['reports/build.md'],
                    deliverables: [
                        { path: 'reports/build.md' },
                        { path: 'reports/build.md' },
                        { path: '/absolute/path.md' },
                        { path: '../escape.md' },
                        { path: 'reports/missing.md' }
                    ]
                }
            },
            transitions: [
                { from: 'intake', to: 'build', on: 'run.started' }
            ]
        };
        var result = (0, index_1.validateFlowWorkflow)(workflow);
        (0, chai_1.expect)(result.valid).to.equal(false);
        (0, chai_1.expect)(result.errors.map(function (error) { return error.code; })).to.include.members([
            'state.deliverable.path.duplicate',
            'state.deliverable.path.invalid',
            'state.deliverable.output.missing'
        ]);
    });
    it('derives canvas nodes, saved layout, and guarded transition labels from workflow JSON', function () {
        var _a, _b, _c;
        var workflow = sampleWorkflow();
        var run = {
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
        var canvas = (0, index_1.deriveFlowCanvasModel)(workflow, run);
        (0, chai_1.expect)(canvas.nodes.map(function (node) { return node.id; })).to.deep.equal(['intake', 'build']);
        (0, chai_1.expect)((_a = canvas.nodes.find(function (node) { return node.id === 'build'; })) === null || _a === void 0 ? void 0 : _a.status).to.equal('running');
        (0, chai_1.expect)((_b = canvas.nodes.find(function (node) { return node.id === 'build'; })) === null || _b === void 0 ? void 0 : _b.x).to.equal(320);
        (0, chai_1.expect)((_c = canvas.nodes.find(function (node) { return node.id === 'build'; })) === null || _c === void 0 ? void 0 : _c.y).to.equal(140);
        (0, chai_1.expect)(canvas.edges[0].guardSummary).to.equal('artifact.exists');
    });
    it('proves Barn-style flow reuse stays visual and state-machine based', function () {
        var _a, _b, _c;
        var workflow = parallelJoinWorkflow();
        var draft = (0, index_1.deriveFlowFlowDraft)(workflow);
        (0, chai_1.expect)(draft.nodes.map(function (node) { return node.data.stateId; })).to.deep.equal(['intake', 'parallel', 'backend', 'frontend', 'join', 'approval', 'qa']);
        (0, chai_1.expect)(draft.nodes.every(function (node) { return node.type === 'flowState'; })).to.equal(true);
        (0, chai_1.expect)((_a = draft.nodes.find(function (node) { return node.id === 'backend'; })) === null || _a === void 0 ? void 0 : _a.data).to.include({ stateType: 'agent', agent: 'backend' });
        (0, chai_1.expect)(draft.edges.find(function (edge) { return edge.id === 'backend_to_join'; })).to.deep.include({
            source: 'backend',
            target: 'join'
        });
        (0, chai_1.expect)((_b = draft.edges.find(function (edge) { return edge.id === 'qa_repair_loop'; })) === null || _b === void 0 ? void 0 : _b.data.guardSummary).to.equal('loop.count_lt');
        (0, chai_1.expect)((_c = draft.edges.find(function (edge) { return edge.id === 'qa_repair_loop'; })) === null || _c === void 0 ? void 0 : _c.label).to.equal('condition.failed / loop.count_lt');
        (0, chai_1.expect)(draft.viewport.width).to.be.greaterThan(640);
        (0, chai_1.expect)(draft.viewport.height).to.be.greaterThan(360);
    });
    it('groups workloads into stable kanban columns', function () {
        var _a;
        var workloads = [
            workload('a', 'running'),
            workload('b', 'done'),
            workload('c', 'running')
        ];
        var columns = (0, index_1.deriveFlowKanbanColumns)(workloads);
        (0, chai_1.expect)(columns.map(function (column) { return column.id; })).to.deep.equal(['pending', 'ready', 'running', 'waiting', 'review', 'done', 'failed']);
        (0, chai_1.expect)((_a = columns.find(function (column) { return column.id === 'running'; })) === null || _a === void 0 ? void 0 : _a.workloads.map(function (item) { return item.id; })).to.deep.equal(['a', 'c']);
    });
    it('mutates workflow by adding states and connecting them with stable transition ids', function () {
        var workflow = emptyWorkflow();
        var intake = (0, index_1.addFlowWorkflowState)(workflow, 'input');
        workflow = intake.workflow;
        var agent = (0, index_1.addFlowWorkflowState)(workflow, 'agent');
        workflow = agent.workflow;
        var duplicateAgent = (0, index_1.addFlowWorkflowState)(workflow, 'agent');
        workflow = duplicateAgent.workflow;
        var connected = (0, index_1.addFlowWorkflowTransition)(workflow, intake.stateId, agent.stateId);
        workflow = connected.workflow;
        (0, chai_1.expect)(intake.stateId).to.equal('input');
        (0, chai_1.expect)(agent.stateId).to.equal('agent');
        (0, chai_1.expect)(duplicateAgent.stateId).to.equal('agent_2');
        (0, chai_1.expect)(connected.transition).to.include({ id: 'input_to_agent', from: 'input', to: 'agent', on: 'workload.completed' });
        (0, chai_1.expect)((0, index_1.validateFlowWorkflow)(workflow).valid).to.equal(true);
    });
    it('does not connect unknown workflow states', function () {
        var workflow = sampleWorkflow();
        var result = (0, index_1.addFlowWorkflowTransition)(workflow, 'intake', 'missing');
        (0, chai_1.expect)(result.transition).to.equal(undefined);
        (0, chai_1.expect)(result.workflow.transitions).to.deep.equal(workflow.transitions);
    });
    it('deletes unreferenced top-level and branch states without leaving visual nodes behind', function () {
        var workflow = emptyWorkflow();
        workflow = (0, index_1.addFlowWorkflowState)(workflow, 'input').workflow;
        workflow = (0, index_1.addFlowWorkflowState)(workflow, 'parallel').workflow;
        var branch = (0, index_1.addFlowParallelBranch)(workflow, 'parallel', 'agent');
        workflow = branch.workflow;
        workflow = (0, index_1.addFlowWorkflowState)(workflow, 'report').workflow;
        workflow = (0, index_1.removeFlowWorkflowState)(workflow, branch.branchId);
        workflow = (0, index_1.removeFlowWorkflowState)(workflow, 'report');
        var canvas = (0, index_1.deriveFlowCanvasModel)(workflow);
        (0, chai_1.expect)(workflow.states).to.have.keys(['input', 'parallel']);
        (0, chai_1.expect)(workflow.states.parallel.branches).to.equal(undefined);
        (0, chai_1.expect)(canvas.nodes.map(function (node) { return node.id; })).to.deep.equal(['input', 'parallel']);
        (0, chai_1.expect)((0, index_1.validateFlowWorkflow)(workflow).valid).to.equal(true);
    });
    it('reports delete blockers for transitions and join waitFor references', function () {
        var workflow = parallelJoinWorkflow();
        (0, chai_1.expect)((0, index_1.flowWorkflowStateReferences)(workflow, 'backend')).to.deep.equal([
            'transition backend_to_join',
            'state join.waitFor'
        ]);
    });
    it('derives and validates a parallel branch, join, gate, and bounded loop visually', function () {
        var _a, _b, _c, _d;
        var workflow = parallelJoinWorkflow();
        var result = (0, index_1.validateFlowWorkflow)(workflow);
        var canvas = (0, index_1.deriveFlowCanvasModel)(workflow);
        (0, chai_1.expect)(result.valid, result.errors.map(function (error) { return error.message; }).join('\n')).to.equal(true);
        (0, chai_1.expect)(result.warnings.map(function (warning) { return warning.code; })).to.not.contain('transition.loop.guard.missing');
        (0, chai_1.expect)(canvas.nodes.map(function (node) { return node.id; })).to.deep.equal(['intake', 'parallel', 'backend', 'frontend', 'join', 'approval', 'qa']);
        (0, chai_1.expect)((_a = canvas.nodes.find(function (node) { return node.id === 'parallel'; })) === null || _a === void 0 ? void 0 : _a.type).to.equal('parallel');
        (0, chai_1.expect)((_b = canvas.nodes.find(function (node) { return node.id === 'join'; })) === null || _b === void 0 ? void 0 : _b.type).to.equal('join');
        (0, chai_1.expect)((_c = canvas.nodes.find(function (node) { return node.id === 'approval'; })) === null || _c === void 0 ? void 0 : _c.type).to.equal('gate');
        (0, chai_1.expect)((_d = canvas.edges.find(function (edge) { return edge.id === 'qa_repair_loop'; })) === null || _d === void 0 ? void 0 : _d.guardSummary).to.equal('loop.count_lt');
        (0, chai_1.expect)(canvas.edges.every(function (edge) { return edge.points.length === 2; })).to.equal(true);
        (0, chai_1.expect)(canvas.width).to.be.greaterThan(640);
        (0, chai_1.expect)(canvas.height).to.be.greaterThan(360);
    });
});
function sampleWorkflow() {
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
function emptyWorkflow() {
    return {
        version: 'flow.workflow/v1',
        id: 'empty',
        name: 'Empty',
        states: {},
        transitions: []
    };
}
function parallelJoinWorkflow() {
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
function workload(id, status) {
    return {
        id: id,
        runId: 'run-1',
        stateId: id,
        status: status,
        inputArtifacts: [],
        outputArtifacts: [],
        issues: [],
        effectIds: [],
        createdAt: '2026-05-19T00:00:00.000Z',
        updatedAt: '2026-05-19T00:00:00.000Z'
    };
}

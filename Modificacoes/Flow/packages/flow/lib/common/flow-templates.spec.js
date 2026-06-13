"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var flow_derivation_1 = require("./flow-derivation");
var flow_templates_1 = require("./flow-templates");
var flow_validation_1 = require("./flow-validation");
describe('Flow workflow templates', function () {
    it('provides the initial deterministic template library', function () {
        var templates = (0, flow_templates_1.listFlowWorkflowTemplates)();
        (0, chai_1.expect)(templates.map(function (template) { return template.id; })).to.deep.equal([
            'simple_specialist',
            'linear_chain',
            'review_loop',
            'contracted_parallel_delivery',
            'content_factory',
            'conditional_contract',
            'human_approval_gate',
            'memory_consolidation'
        ]);
    });
    var _loop_1 = function (template) {
        it("validates and derives a canvas for ".concat(template.id), function () {
            var _a;
            var validation = (0, flow_validation_1.validateFlowWorkflow)(template.workflow);
            var canvas = (0, flow_derivation_1.deriveFlowCanvasModel)(template.workflow);
            var agentStates = allStates(template.workflow.states).filter(function (state) { return state.type === 'agent'; });
            (0, chai_1.expect)(validation.valid, validation.errors.map(function (error) { return error.message; }).join('\n')).to.equal(true);
            (0, chai_1.expect)(template.workflow.version).to.equal('flow.workflow/v1');
            (0, chai_1.expect)(canvas.nodes.length).to.be.greaterThan(0);
            (0, chai_1.expect)(canvas.edges.length).to.equal(template.workflow.transitions.length);
            (0, chai_1.expect)(agentStates.length).to.be.greaterThan(0);
            (0, chai_1.expect)(Object.values(template.workflow.agents || {})).to.satisfy(function (paths) { return paths.every(function (path) { return path.endsWith('.md'); }); });
            (0, chai_1.expect)(agentStates.map(function (state) { return state.agent; })).to.satisfy(function (agentIds) { return agentIds.every(Boolean); });
            (0, chai_1.expect)((_a = template.workflow.requires) === null || _a === void 0 ? void 0 : _a.capabilities).to.satisfy(function (capabilities) { return Array.isArray(capabilities) && capabilities.length > 0; });
        });
    };
    for (var _i = 0, _a = (0, flow_templates_1.listFlowWorkflowTemplates)(); _i < _a.length; _i++) {
        var template = _a[_i];
        _loop_1(template);
    }
    it('declares required host capabilities for templates that use agents, gates, effects, or Memory', function () {
        var requiredCapabilities = Object.fromEntries((0, flow_templates_1.listFlowWorkflowTemplates)().map(function (template) {
            var _a;
            return [
                template.id,
                (_a = template.workflow.requires) === null || _a === void 0 ? void 0 : _a.capabilities
            ];
        }));
        (0, chai_1.expect)(requiredCapabilities).to.deep.equal({
            simple_specialist: ['llm.agent.execute', 'filesystem.artifacts'],
            linear_chain: ['llm.agent.execute', 'filesystem.artifacts'],
            review_loop: ['llm.agent.execute', 'filesystem.artifacts'],
            contracted_parallel_delivery: [
                'llm.agent.execute',
                'memory.context',
                'human.approval',
                'filesystem.edit',
                'image.generate',
                'filesystem.artifacts'
            ],
            content_factory: ['llm.agent.execute', 'filesystem.artifacts'],
            conditional_contract: ['llm.agent.execute', 'filesystem.edit', 'filesystem.artifacts'],
            human_approval_gate: ['llm.agent.execute', 'human.approval', 'filesystem.edit', 'filesystem.artifacts'],
            memory_consolidation: [
                'llm.agent.execute',
                'memory.context',
                'human.approval',
                'memory.write.explicit',
                'memory.write.provider',
                'filesystem.artifacts'
            ]
        });
    });
    it('keeps conditional contract routing explicit and guard driven', function () {
        var _a, _b, _c;
        var template = (0, flow_templates_1.getFlowWorkflowTemplate)('conditional_contract');
        (0, chai_1.expect)((_a = template === null || template === void 0 ? void 0 : template.workflow.states.contract_design) === null || _a === void 0 ? void 0 : _a.outputs).to.include.members([
            'contracts/work-orders/backend.md',
            'contracts/work-orders/frontend.md',
            'contracts/work-orders/designer.md',
            'contracts/work-orders/qa.md'
        ]);
        (0, chai_1.expect)((_b = template === null || template === void 0 ? void 0 : template.workflow.transitions.find(function (transition) { return transition.id === 'planning_to_contract_design'; })) === null || _b === void 0 ? void 0 : _b.guard).to.deep.equal({
            'signal.equals': { key: 'planning.needs_parallel_contract', value: true }
        });
        (0, chai_1.expect)((_c = template === null || template === void 0 ? void 0 : template.workflow.transitions.find(function (transition) { return transition.id === 'planning_to_implementation'; })) === null || _c === void 0 ? void 0 : _c.guard).to.deep.equal({
            'signal.equals': { key: 'planning.needs_parallel_contract', value: false }
        });
    });
    it('keeps contract design mandatory only for the dependent parallel delivery template', function () {
        var _a, _b, _c, _d, _e, _f, _g;
        var template = (0, flow_templates_1.getFlowWorkflowTemplate)('contracted_parallel_delivery');
        (0, chai_1.expect)((_a = template === null || template === void 0 ? void 0 : template.workflow.states.contract_design) === null || _a === void 0 ? void 0 : _a.type).to.equal('agent');
        (0, chai_1.expect)((_b = template === null || template === void 0 ? void 0 : template.workflow.states.parallel_delivery) === null || _b === void 0 ? void 0 : _b.type).to.equal('parallel');
        (0, chai_1.expect)(template === null || template === void 0 ? void 0 : template.workflow.transitions.find(function (transition) { return transition.id === 'architecture_to_contract_design'; })).to.deep.include({
            from: 'architecture',
            to: 'contract_design',
            on: 'workload.completed'
        });
        (0, chai_1.expect)((_c = template === null || template === void 0 ? void 0 : template.workflow.transitions.find(function (transition) { return transition.id === 'contract_design_to_contract_gate'; })) === null || _c === void 0 ? void 0 : _c.guard).to.deep.equal({
            all: [
                { 'artifact.exists': 'contracts/contracts.json' },
                { 'artifact.validates': { path: 'contracts/contracts.json', schema: 'contracts.schema.json' } }
            ]
        });
        (0, chai_1.expect)((_e = (_d = template === null || template === void 0 ? void 0 : template.workflow.states.qa) === null || _d === void 0 ? void 0 : _d.input) === null || _e === void 0 ? void 0 : _e.include).to.include.members([
            'contracts/contracts.json',
            'contracts/work-orders/qa.md'
        ]);
        (0, chai_1.expect)((_g = (_f = (0, flow_templates_1.getFlowWorkflowTemplate)('conditional_contract')) === null || _f === void 0 ? void 0 : _f.workflow.transitions.find(function (transition) { return transition.id === 'planning_to_contract_design'; })) === null || _g === void 0 ? void 0 : _g.guard).to.deep.equal({
            'signal.equals': { key: 'planning.needs_parallel_contract', value: true }
        });
    });
    it('bounds review and repair loops with explicit guards', function () {
        var _a, _b;
        var reviewLoop = (0, flow_templates_1.getFlowWorkflowTemplate)('review_loop');
        var parallelDelivery = (0, flow_templates_1.getFlowWorkflowTemplate)('contracted_parallel_delivery');
        (0, chai_1.expect)((_a = reviewLoop === null || reviewLoop === void 0 ? void 0 : reviewLoop.workflow.transitions.find(function (transition) { return transition.id === 'reviewer_failed_to_repair'; })) === null || _a === void 0 ? void 0 : _a.guard).to.deep.equal({
            all: [
                { 'signal.equals': { key: 'review.status', value: 'failed' } },
                { 'loop.lt': { counter: 'repair', max: 2 } }
            ]
        });
        (0, chai_1.expect)((_b = parallelDelivery === null || parallelDelivery === void 0 ? void 0 : parallelDelivery.workflow.transitions.find(function (transition) { return transition.id === 'qa_failed_to_repair_loop'; })) === null || _b === void 0 ? void 0 : _b.guard).to.deep.equal({
            all: [
                { 'signal.equals': { key: 'qa.status', value: 'failed' } },
                { 'loop.lt': { counter: 'qa_repair', max: 1 } }
            ]
        });
    });
    it('instantiates templates with a new workflow id and name without mutating the source', function () {
        var workflow = (0, flow_templates_1.instantiateFlowWorkflowTemplate)('simple_specialist', {
            id: 'custom_workflow',
            name: 'Custom Workflow',
            description: 'Custom description'
        });
        workflow.states.input.outputs = ['changed.md'];
        var source = (0, flow_templates_1.getFlowWorkflowTemplate)('simple_specialist');
        (0, chai_1.expect)(workflow.id).to.equal('custom_workflow');
        (0, chai_1.expect)(workflow.name).to.equal('Custom Workflow');
        (0, chai_1.expect)(workflow.description).to.equal('Custom description');
        (0, chai_1.expect)(source === null || source === void 0 ? void 0 : source.workflow.states.input.outputs).to.deep.equal(['input/request.md']);
    });
});
function allStates(states) {
    return Object.values(states).flatMap(function (state) { return __spreadArray([state], Object.values(state.branches || {}), true); });
}

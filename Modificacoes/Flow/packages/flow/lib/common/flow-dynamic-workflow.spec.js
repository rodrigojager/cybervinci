"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var flow_dynamic_workflow_1 = require("./flow-dynamic-workflow");
var flow_patterns_1 = require("./flow-patterns");
var flow_validation_1 = require("./flow-validation");
describe('Flow dynamic workflow planner', function () {
    it('prefers a matching saved workflow when confidence is high enough', function () {
        var plan = (0, flow_dynamic_workflow_1.planDynamicWorkflow)({
            prompt: 'execute architecture review with adversarial verification',
            workflows: [workflow('architecture_review', 'Architecture Review', 'Adversarial verification for architecture decisions.')],
            patterns: (0, flow_patterns_1.listFlowWorkflowPatterns)()
        });
        (0, chai_1.expect)(plan.kind).to.equal('saved_workflow');
        (0, chai_1.expect)(plan.workflowId).to.equal('architecture_review');
    });
    it('falls back to a tournament pattern for comparison tasks', function () {
        var plan = (0, flow_dynamic_workflow_1.planDynamicWorkflow)({
            prompt: 'compare three implementation strategies and choose the best winner',
            workflows: [],
            patterns: (0, flow_patterns_1.listFlowWorkflowPatterns)()
        });
        (0, chai_1.expect)(plan.kind).to.equal('pattern');
        (0, chai_1.expect)(plan.patternId).to.equal('simple_tournament');
    });
    it('can generate a starter workflow when the prompt asks for a custom flow', function () {
        var _a, _b, _c, _d, _e;
        var plan = (0, flow_dynamic_workflow_1.planDynamicWorkflow)({
            prompt: 'crie um novo flow personalizado para planejar, executar e revisar uma tarefa complexa',
            workflows: [],
            patterns: (0, flow_patterns_1.listFlowWorkflowPatterns)()
        });
        (0, chai_1.expect)(plan.kind).to.equal('generated_workflow');
        (0, chai_1.expect)(plan.workflow).to.exist;
        (0, chai_1.expect)((_c = (_b = (_a = plan.workflow) === null || _a === void 0 ? void 0 : _a.states.planner.modelExecution) === null || _b === void 0 ? void 0 : _b.virtualReasoning) === null || _c === void 0 ? void 0 : _c.mode).to.equal('balanced');
        (0, chai_1.expect)((_e = (_d = plan.workflow) === null || _d === void 0 ? void 0 : _d.states.verifier.modelExecution) === null || _e === void 0 ? void 0 : _e.profileId).to.equal('critical_judge');
        (0, chai_1.expect)((0, flow_validation_1.validateFlowWorkflow)(plan.workflow).valid).to.equal(true);
    });
});
function workflow(id, name, description) {
    return {
        version: 'flow.workflow/v1',
        id: id,
        name: name,
        description: description,
        states: {
            input: { type: 'input' }
        },
        transitions: []
    };
}

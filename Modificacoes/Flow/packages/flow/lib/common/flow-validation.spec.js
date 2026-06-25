"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var flow_validation_1 = require("./flow-validation");
describe('Flow workflow validation', function () {
    it('accepts playbook states with a playbook id and structured input', function () {
        var workflow = workflowWithState({
            type: 'playbook',
            playbookId: 'canvas-design-qa',
            prompt: 'Check this Canvas design.',
            playbookInput: {
                mode: 'qa'
            },
            outputs: ['playbook/result.json']
        });
        var validation = (0, flow_validation_1.validateFlowWorkflow)(workflow);
        (0, chai_1.expect)(validation.valid).to.equal(true);
        (0, chai_1.expect)(validation.errors).to.deep.equal([]);
    });
    it('rejects playbook states without an id or with non-object input', function () {
        var workflow = workflowWithState({
            type: 'playbook',
            playbookInput: ['bad']
        });
        var validation = (0, flow_validation_1.validateFlowWorkflow)(workflow);
        (0, chai_1.expect)(validation.valid).to.equal(false);
        (0, chai_1.expect)(validation.errors.map(function (error) { return error.code; })).to.include('state.playbook.required');
        (0, chai_1.expect)(validation.errors.map(function (error) { return error.code; })).to.include('state.playbook_input.invalid');
    });
});
function workflowWithState(state) {
    return {
        version: 'flow.workflow/v1',
        id: 'playbook_validation',
        name: 'Playbook Validation',
        states: {
            run_playbook: state
        },
        transitions: []
    };
}

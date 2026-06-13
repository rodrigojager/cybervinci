"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var flow_presets_1 = require("./flow-presets");
var flow_validation_1 = require("./flow-validation");
describe('Flow pipeline presets', function () {
    it('validates the built-in Sisyphus ultrawork coordinator preset', function () {
        var _a;
        var presets = (0, flow_presets_1.listBuiltInFlowPipelinePresets)();
        var preset = (0, flow_presets_1.getBuiltInFlowPipelinePreset)(flow_presets_1.SISYPHUS_ULTRAWORK_COORDINATOR_PRESET_ID);
        (0, chai_1.expect)(presets.map(function (candidate) { return candidate.id; })).to.include(flow_presets_1.SISYPHUS_ULTRAWORK_COORDINATOR_PRESET_ID);
        (0, chai_1.expect)(preset).not.to.equal(undefined);
        if (!preset) {
            throw new Error('Sisyphus preset was not found.');
        }
        var presetValidation = (0, flow_presets_1.validateFlowPipelinePreset)(preset);
        var workflowValidation = (0, flow_validation_1.validateFlowWorkflow)(preset.workflow);
        var agentStates = Object.values(preset.workflow.states).filter(function (state) { return state.type === 'agent'; });
        (0, chai_1.expect)(presetValidation.valid, presetValidation.errors.map(function (error) { return error.message; }).join('\n')).to.equal(true);
        (0, chai_1.expect)(workflowValidation.valid, workflowValidation.errors.map(function (error) { return error.message; }).join('\n')).to.equal(true);
        (0, chai_1.expect)(Object.keys(preset.workflow.states)).to.deep.equal([
            'input',
            'sisyphus_coordinator',
            'plan_gate',
            'sisyphus_ultraworker',
            'sisyphus_reviewer',
            'final_report'
        ]);
        (0, chai_1.expect)(agentStates).to.have.length(3);
        (0, chai_1.expect)(agentStates.every(function (state) { return state.provider === undefined; })).to.equal(true);
        (0, chai_1.expect)(agentStates.every(function (state) { return typeof state.systemPrompt === 'string' && state.systemPrompt.length > 0; })).to.equal(true);
        (0, chai_1.expect)(agentStates.every(function (state) { return typeof state.taskPrompt === 'string' && state.taskPrompt.length > 0; })).to.equal(true);
        (0, chai_1.expect)(agentStates.every(function (state) { return Array.isArray(state.outputs) && state.outputs.length > 0; })).to.equal(true);
        (0, chai_1.expect)(agentStates.every(function (state) { return Array.isArray(state.deliverables) && state.deliverables.length > 0; })).to.equal(true);
        (0, chai_1.expect)((_a = preset.agentMarkdown) === null || _a === void 0 ? void 0 : _a.map(function (agent) { return agent.relativePath; })).to.deep.equal([
            'sisyphus/coordinator.md',
            'sisyphus/ultraworker.md',
            'sisyphus/reviewer.md'
        ]);
    });
    it('returns clones so callers cannot mutate the built-in preset source', function () {
        var _a, _b;
        var first = (0, flow_presets_1.getBuiltInFlowPipelinePreset)(flow_presets_1.SISYPHUS_ULTRAWORK_COORDINATOR_PRESET_ID);
        if (!first) {
            throw new Error('Sisyphus preset was not found.');
        }
        first.workflow.states.input.outputs = ['mutated.md'];
        if ((_a = first.agentMarkdown) === null || _a === void 0 ? void 0 : _a[0]) {
            first.agentMarkdown[0].content = '# Mutated';
        }
        var second = (0, flow_presets_1.getBuiltInFlowPipelinePreset)(flow_presets_1.SISYPHUS_ULTRAWORK_COORDINATOR_PRESET_ID);
        (0, chai_1.expect)(second === null || second === void 0 ? void 0 : second.workflow.states.input.outputs).to.deep.equal(['input/request.md']);
        (0, chai_1.expect)((_b = second === null || second === void 0 ? void 0 : second.agentMarkdown) === null || _b === void 0 ? void 0 : _b[0].content).to.contain('# Sisyphus Coordinator');
    });
});

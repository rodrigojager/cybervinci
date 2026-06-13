"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var flow_patterns_1 = require("./flow-patterns");
var flow_model_profiles_1 = require("./flow-model-profiles");
var flow_validation_1 = require("./flow-validation");
describe('Flow workflow patterns', function () {
    it('lists built-in workflow patterns and model profiles for UI and AI authoring', function () {
        (0, chai_1.expect)((0, flow_patterns_1.listFlowWorkflowPatterns)().map(function (pattern) { return pattern.id; })).to.deep.equal([
            'classify_and_act',
            'adversarial_verification',
            'generate_and_filter',
            'simple_tournament',
            'bounded_loop_until_done',
            'fanout_and_synthesize_fixed'
        ]);
        (0, chai_1.expect)((0, flow_model_profiles_1.listFlowModelProfiles)().map(function (profile) { return profile.id; })).to.include.members([
            'inherit',
            'fast',
            'balanced',
            'critical_judge'
        ]);
        for (var _i = 0, _a = (0, flow_patterns_1.listFlowWorkflowPatterns)(); _i < _a.length; _i++) {
            var pattern = _a[_i];
            (0, chai_1.expect)(pattern.agenticStages, pattern.id).to.be.an('array').that.is.not.empty;
        }
    });
    var _loop_1 = function (pattern) {
        it("compiles a valid editable workflow for ".concat(pattern.id), function () {
            var _a;
            var workflow = (0, flow_patterns_1.compileFlowWorkflowPattern)({
                patternId: pattern.id,
                workflowId: "test_".concat(pattern.id),
                parameters: Object.fromEntries(pattern.parameters
                    .filter(function (parameter) { return parameter.defaultValue !== undefined; })
                    .map(function (parameter) { return [parameter.id, parameter.defaultValue]; }))
            });
            var validation = (0, flow_validation_1.validateFlowWorkflow)(workflow);
            (0, chai_1.expect)(validation.valid, validation.errors.map(function (error) { return error.message; }).join('\n')).to.equal(true);
            (0, chai_1.expect)(workflow.templateId).to.equal("pattern:".concat(pattern.id));
            (0, chai_1.expect)((_a = workflow.requires) === null || _a === void 0 ? void 0 : _a.capabilities).to.include('llm.agent.execute');
            (0, chai_1.expect)(Object.values(workflow.states).some(function (state) { return state.type === 'agent' || state.type === 'parallel' || state.type === 'report'; })).to.equal(true);
        });
    };
    for (var _i = 0, _a = (0, flow_patterns_1.listFlowWorkflowPatterns)(); _i < _a.length; _i++) {
        var pattern = _a[_i];
        _loop_1(pattern);
    }
    it('applies model profiles to generated agent roles', function () {
        var _a, _b, _c, _d;
        var workflow = (0, flow_patterns_1.compileFlowWorkflowPattern)({
            patternId: 'adversarial_verification',
            workflowId: 'profiled_adversarial',
            parameters: {
                executorProfile: 'fast',
                criticProfile: 'critical_judge',
                verifierProfile: 'critical_judge'
            }
        });
        (0, chai_1.expect)((_a = workflow.states.draft_executor.modelExecution) === null || _a === void 0 ? void 0 : _a.profileId).to.equal('fast');
        (0, chai_1.expect)((_b = workflow.states.adversary.modelExecution) === null || _b === void 0 ? void 0 : _b.profileId).to.equal('critical_judge');
        (0, chai_1.expect)((_d = (_c = workflow.states.verifier.modelExecution) === null || _c === void 0 ? void 0 : _c.nativeReasoning) === null || _d === void 0 ? void 0 : _d.effort).to.equal('high');
    });
    it('applies per-stage role overrides as the base model profile', function () {
        var _a, _b;
        var workflow = (0, flow_patterns_1.compileFlowWorkflowPattern)({
            patternId: 'adversarial_verification',
            workflowId: 'overridden_adversarial',
            parameters: {
                executorProfile: 'fast',
                criticProfile: 'critical_judge',
                verifierProfile: 'critical_judge'
            },
            roleOverrides: {
                draft_executor: {
                    profileId: 'smart',
                    provider: { providerId: 'codex-provider', modelId: 'smart-model' },
                    modelExecution: {
                        reasoningPolicy: 'virtual',
                        virtualReasoning: { enabled: true, mode: 'balanced' }
                    }
                }
            }
        });
        (0, chai_1.expect)((_a = workflow.states.draft_executor.modelExecution) === null || _a === void 0 ? void 0 : _a.profileId).to.equal('smart');
        (0, chai_1.expect)(workflow.states.draft_executor.provider).to.deep.equal({ providerId: 'codex-provider', modelId: 'smart-model' });
        (0, chai_1.expect)((_b = workflow.states.draft_executor.modelExecution) === null || _b === void 0 ? void 0 : _b.reasoningPolicy).to.equal('virtual');
    });
});

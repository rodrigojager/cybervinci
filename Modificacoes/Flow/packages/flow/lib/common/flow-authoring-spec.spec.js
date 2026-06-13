"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var flow_authoring_spec_1 = require("./flow-authoring-spec");
describe('Flow AI authoring spec', function () {
    it('exposes internal JSON/YAML formats while keeping Markdown as the human prompt surface', function () {
        var spec = (0, flow_authoring_spec_1.getFlowAiAuthoringSpec)();
        (0, chai_1.expect)(spec.version).to.equal(flow_authoring_spec_1.FLOW_AI_AUTHORING_SPEC_VERSION);
        (0, chai_1.expect)(spec.internalFormats).to.deep.equal(['json', 'yaml']);
        (0, chai_1.expect)(spec.humanEditableFormats).to.deep.equal(['markdown']);
        (0, chai_1.expect)(spec.systemPrompt).to.contain('user must never be asked to manually edit JSON or YAML');
    });
    it('includes the built-in workflow patterns and UI control mapping', function () {
        var spec = (0, flow_authoring_spec_1.getFlowAiAuthoringSpec)();
        (0, chai_1.expect)(spec.patterns.map(function (pattern) { return pattern.id; })).to.include.members([
            'classify_and_act',
            'adversarial_verification',
            'generate_and_filter',
            'simple_tournament',
            'bounded_loop_until_done',
            'fanout_and_synthesize_fixed'
        ]);
        (0, chai_1.expect)(spec.uiControls.map(function (control) { return control.control; })).to.include.members([
            'provider_picker',
            'model_picker',
            'reasoning_picker',
            'state_canvas',
            'markdown'
        ]);
    });
});

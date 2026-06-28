import { expect } from 'chai';
import { FLOW_AI_AUTHORING_SPEC_VERSION, getFlowAiAuthoringSpec } from './flow-authoring-spec';

describe('Flow AI authoring spec', () => {
    it('exposes internal JSON/YAML formats while keeping Markdown as the human prompt surface', () => {
        const spec = getFlowAiAuthoringSpec();

        expect(spec.version).to.equal(FLOW_AI_AUTHORING_SPEC_VERSION);
        expect(spec.internalFormats).to.deep.equal(['json', 'yaml']);
        expect(spec.humanEditableFormats).to.deep.equal(['markdown']);
        expect(spec.systemPrompt).to.contain('user must never be asked to manually edit JSON or YAML');
        expect(spec.skillMarkdown).to.contain('name: cybervinci-flow-author');
        expect(spec.skillMarkdown).to.contain('JSON and YAML are internal machine-readable formats');
        expect(spec.skillMarkdown).to.contain('Users may manually edit Markdown prompt text only');
    });

    it('includes the built-in workflow patterns and UI control mapping', () => {
        const spec = getFlowAiAuthoringSpec();

        expect(spec.patterns.map(pattern => pattern.id)).to.include.members([
            'classify_and_act',
            'adversarial_verification',
            'generate_and_filter',
            'simple_tournament',
            'bounded_loop_until_done',
            'fanout_and_synthesize_fixed'
        ]);
        expect(spec.uiControls.map(control => control.control)).to.include.members([
            'provider_picker',
            'model_picker',
            'reasoning_picker',
            'state_canvas',
            'markdown'
        ]);
    });
});

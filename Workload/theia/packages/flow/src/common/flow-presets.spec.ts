import { expect } from 'chai';
import {
    getBuiltInFlowPipelinePreset,
    listBuiltInFlowPipelinePresets,
    SISYPHUS_ULTRAWORK_COORDINATOR_PRESET_ID,
    validateFlowPipelinePreset
} from './flow-presets';
import { FlowWorkflowState } from './flow-types';
import { validateFlowWorkflow } from './flow-validation';

describe('Flow pipeline presets', () => {

    it('validates the built-in Sisyphus ultrawork coordinator preset', () => {
        const presets = listBuiltInFlowPipelinePresets();
        const preset = getBuiltInFlowPipelinePreset(SISYPHUS_ULTRAWORK_COORDINATOR_PRESET_ID);

        expect(presets.map(candidate => candidate.id)).to.include(SISYPHUS_ULTRAWORK_COORDINATOR_PRESET_ID);
        expect(preset).not.to.equal(undefined);
        if (!preset) {
            throw new Error('Sisyphus preset was not found.');
        }

        const presetValidation = validateFlowPipelinePreset(preset);
        const workflowValidation = validateFlowWorkflow(preset.workflow);
        const agentStates = Object.values(preset.workflow.states).filter((state): state is FlowWorkflowState => state.type === 'agent');

        expect(presetValidation.valid, presetValidation.errors.map(error => error.message).join('\n')).to.equal(true);
        expect(workflowValidation.valid, workflowValidation.errors.map(error => error.message).join('\n')).to.equal(true);
        expect(Object.keys(preset.workflow.states)).to.deep.equal([
            'input',
            'sisyphus_coordinator',
            'plan_gate',
            'sisyphus_ultraworker',
            'sisyphus_reviewer',
            'final_report'
        ]);
        expect(agentStates).to.have.length(3);
        expect(agentStates.every(state => state.provider === undefined)).to.equal(true);
        expect(agentStates.every(state => typeof state.systemPrompt === 'string' && state.systemPrompt.length > 0)).to.equal(true);
        expect(agentStates.every(state => typeof state.taskPrompt === 'string' && state.taskPrompt.length > 0)).to.equal(true);
        expect(agentStates.every(state => Array.isArray(state.outputs) && state.outputs.length > 0)).to.equal(true);
        expect(agentStates.every(state => Array.isArray(state.deliverables) && state.deliverables.length > 0)).to.equal(true);
        expect(preset.agentMarkdown?.map(agent => agent.relativePath)).to.deep.equal([
            'sisyphus/coordinator.md',
            'sisyphus/ultraworker.md',
            'sisyphus/reviewer.md'
        ]);
    });

    it('returns clones so callers cannot mutate the built-in preset source', () => {
        const first = getBuiltInFlowPipelinePreset(SISYPHUS_ULTRAWORK_COORDINATOR_PRESET_ID);
        if (!first) {
            throw new Error('Sisyphus preset was not found.');
        }
        first.workflow.states.input.outputs = ['mutated.md'];
        if (first.agentMarkdown?.[0]) {
            first.agentMarkdown[0].content = '# Mutated';
        }

        const second = getBuiltInFlowPipelinePreset(SISYPHUS_ULTRAWORK_COORDINATOR_PRESET_ID);

        expect(second?.workflow.states.input.outputs).to.deep.equal(['input/request.md']);
        expect(second?.agentMarkdown?.[0].content).to.contain('# Sisyphus Coordinator');
    });
});

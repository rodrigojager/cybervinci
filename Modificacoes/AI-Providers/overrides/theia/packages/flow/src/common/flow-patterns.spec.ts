import { expect } from 'chai';
import {
    compileFlowWorkflowPattern,
    listFlowWorkflowPatterns
} from './flow-patterns';
import { listFlowModelProfiles } from './flow-model-profiles';
import { validateFlowWorkflow } from './flow-validation';

describe('Flow workflow patterns', () => {
    it('lists built-in workflow patterns and model profiles for UI and AI authoring', () => {
        expect(listFlowWorkflowPatterns().map(pattern => pattern.id)).to.deep.equal([
            'classify_and_act',
            'adversarial_verification',
            'generate_and_filter',
            'simple_tournament',
            'bounded_loop_until_done',
            'fanout_and_synthesize_fixed'
        ]);
        expect(listFlowModelProfiles().map(profile => profile.id)).to.include.members([
            'inherit',
            'fast',
            'balanced',
            'critical_judge',
            'code_reviewer',
            'research'
        ]);
        for (const pattern of listFlowWorkflowPatterns()) {
            expect(pattern.agenticStages, pattern.id).to.be.an('array').that.is.not.empty;
        }
    });

    for (const pattern of listFlowWorkflowPatterns()) {
        it(`compiles a valid editable workflow for ${pattern.id}`, () => {
            const workflow = compileFlowWorkflowPattern({
                patternId: pattern.id,
                workflowId: `test_${pattern.id}`,
                parameters: Object.fromEntries(pattern.parameters
                    .filter(parameter => parameter.defaultValue !== undefined)
                    .map(parameter => [parameter.id, parameter.defaultValue]))
            });

            const validation = validateFlowWorkflow(workflow);

            expect(validation.valid, validation.errors.map(error => error.message).join('\n')).to.equal(true);
            expect(workflow.templateId).to.equal(`pattern:${pattern.id}`);
            expect(workflow.requires?.capabilities).to.include('llm.agent.execute');
            expect(Object.values(workflow.states).some(state => state.type === 'agent' || state.type === 'parallel' || state.type === 'report')).to.equal(true);
        });
    }

    it('applies model profiles to generated agent roles', () => {
        const workflow = compileFlowWorkflowPattern({
            patternId: 'adversarial_verification',
            workflowId: 'profiled_adversarial',
            parameters: {
                executorProfile: 'fast',
                criticProfile: 'critical_judge',
                verifierProfile: 'critical_judge'
            }
        });

        expect(workflow.states.draft_executor.modelExecution?.profileId).to.equal('fast');
        expect(workflow.states.adversary.modelExecution?.profileId).to.equal('critical_judge');
        expect(workflow.states.verifier.modelExecution?.nativeReasoning?.effort).to.equal('high');
    });

    it('applies per-stage role overrides as the base model profile', () => {
        const workflow = compileFlowWorkflowPattern({
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

        expect(workflow.states.draft_executor.modelExecution?.profileId).to.equal('smart');
        expect(workflow.states.draft_executor.provider).to.deep.equal({ providerId: 'codex-provider', modelId: 'smart-model' });
        expect(workflow.states.draft_executor.modelExecution?.reasoningPolicy).to.equal('virtual');
    });
});

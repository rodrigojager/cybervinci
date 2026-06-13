import { expect } from 'chai';
import { planDynamicWorkflow } from './flow-dynamic-workflow';
import { listFlowWorkflowPatterns } from './flow-patterns';
import { FlowWorkflow } from './flow-types';
import { validateFlowWorkflow } from './flow-validation';

describe('Flow dynamic workflow planner', () => {
    it('prefers a matching saved workflow when confidence is high enough', () => {
        const plan = planDynamicWorkflow({
            prompt: 'execute architecture review with adversarial verification',
            workflows: [workflow('architecture_review', 'Architecture Review', 'Adversarial verification for architecture decisions.')],
            patterns: listFlowWorkflowPatterns()
        });

        expect(plan.kind).to.equal('saved_workflow');
        expect(plan.workflowId).to.equal('architecture_review');
    });

    it('falls back to a tournament pattern for comparison tasks', () => {
        const plan = planDynamicWorkflow({
            prompt: 'compare three implementation strategies and choose the best winner',
            workflows: [],
            patterns: listFlowWorkflowPatterns()
        });

        expect(plan.kind).to.equal('pattern');
        expect(plan.patternId).to.equal('simple_tournament');
    });

    it('can generate a starter workflow when the prompt asks for a custom flow', () => {
        const plan = planDynamicWorkflow({
            prompt: 'crie um novo flow personalizado para planejar, executar e revisar uma tarefa complexa',
            workflows: [],
            patterns: listFlowWorkflowPatterns()
        });

        expect(plan.kind).to.equal('generated_workflow');
        expect(plan.workflow).to.exist;
        expect(plan.workflow?.states.planner.modelExecution?.virtualReasoning?.mode).to.equal('balanced');
        expect(plan.workflow?.states.verifier.modelExecution?.profileId).to.equal('critical_judge');
        expect(validateFlowWorkflow(plan.workflow!).valid).to.equal(true);
    });
});

function workflow(id: string, name: string, description: string): FlowWorkflow {
    return {
        version: 'flow.workflow/v1',
        id,
        name,
        description,
        states: {
            input: { type: 'input' }
        },
        transitions: []
    };
}

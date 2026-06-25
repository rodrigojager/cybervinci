import { expect } from 'chai';
import { validateFlowWorkflow } from './flow-validation';
import { FlowWorkflow } from './flow-types';

describe('Flow workflow validation', () => {

    it('accepts playbook states with a playbook id and structured input', () => {
        const workflow = workflowWithState({
            type: 'playbook',
            playbookId: 'canvas-design-qa',
            prompt: 'Check this Canvas design.',
            playbookInput: {
                mode: 'qa'
            },
            outputs: ['playbook/result.json']
        });

        const validation = validateFlowWorkflow(workflow);

        expect(validation.valid).to.equal(true);
        expect(validation.errors).to.deep.equal([]);
    });

    it('rejects playbook states without an id or with non-object input', () => {
        const workflow = workflowWithState({
            type: 'playbook',
            playbookInput: ['bad'] as unknown as Record<string, unknown>
        });

        const validation = validateFlowWorkflow(workflow);

        expect(validation.valid).to.equal(false);
        expect(validation.errors.map(error => error.code)).to.include('state.playbook.required');
        expect(validation.errors.map(error => error.code)).to.include('state.playbook_input.invalid');
    });
});

function workflowWithState(state: FlowWorkflow['states'][string]): FlowWorkflow {
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

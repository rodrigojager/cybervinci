import { expect } from 'chai';
import { decideFlowApprovalPolicy } from './flow-approval-policy';

describe('Flow approval policy', () => {
    it('auto applies low-risk file effects', () => {
        const decision = decideFlowApprovalPolicy({ action: 'file_effect' });

        expect(decision.policy).to.equal('auto_apply');
        expect(decision.requiresApproval).to.equal(false);
        expect(decision.approved).to.equal(true);
        expect(decision.status).to.equal('approved');
    });

    it('requires human approval for risky effects', () => {
        const decision = decideFlowApprovalPolicy({
            action: 'command_effect',
            requestedPolicy: 'auto_apply',
            riskReasons: ['environment contains keys outside allowlist']
        });

        expect(decision.policy).to.equal('human_gate_required');
        expect(decision.requiresApproval).to.equal(true);
        expect(decision.approved).to.equal(false);
        expect(decision.status).to.equal('proposed');
    });

    it('blocks explicitly denied actions', () => {
        const decision = decideFlowApprovalPolicy({
            action: 'command_effect',
            requestedPolicy: 'blocked',
            approved: true
        });

        expect(decision.policy).to.equal('blocked');
        expect(decision.blocked).to.equal(true);
        expect(decision.approved).to.equal(false);
        expect(decision.status).to.equal('blocked');
    });

    it('always requires explicit approval for memory, second run, cancel and image actions', () => {
        for (const action of ['memory_write', 'second_run', 'cancel_run', 'image_effect'] as const) {
            const proposed = decideFlowApprovalPolicy({ action });
            const approved = decideFlowApprovalPolicy({ action, approved: true });

            expect(proposed.policy).to.equal('human_gate_required');
            expect(proposed.status).to.equal('proposed');
            expect(approved.status).to.equal('approved');
        }
    });
});

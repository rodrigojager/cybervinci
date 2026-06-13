"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var flow_approval_policy_1 = require("./flow-approval-policy");
describe('Flow approval policy', function () {
    it('auto applies low-risk file effects', function () {
        var decision = (0, flow_approval_policy_1.decideFlowApprovalPolicy)({ action: 'file_effect' });
        (0, chai_1.expect)(decision.policy).to.equal('auto_apply');
        (0, chai_1.expect)(decision.requiresApproval).to.equal(false);
        (0, chai_1.expect)(decision.approved).to.equal(true);
        (0, chai_1.expect)(decision.status).to.equal('approved');
    });
    it('requires human approval for risky effects', function () {
        var decision = (0, flow_approval_policy_1.decideFlowApprovalPolicy)({
            action: 'command_effect',
            requestedPolicy: 'auto_apply',
            riskReasons: ['environment contains keys outside allowlist']
        });
        (0, chai_1.expect)(decision.policy).to.equal('human_gate_required');
        (0, chai_1.expect)(decision.requiresApproval).to.equal(true);
        (0, chai_1.expect)(decision.approved).to.equal(false);
        (0, chai_1.expect)(decision.status).to.equal('proposed');
    });
    it('blocks explicitly denied actions', function () {
        var decision = (0, flow_approval_policy_1.decideFlowApprovalPolicy)({
            action: 'command_effect',
            requestedPolicy: 'blocked',
            approved: true
        });
        (0, chai_1.expect)(decision.policy).to.equal('blocked');
        (0, chai_1.expect)(decision.blocked).to.equal(true);
        (0, chai_1.expect)(decision.approved).to.equal(false);
        (0, chai_1.expect)(decision.status).to.equal('blocked');
    });
    it('always requires explicit approval for memory, second run, cancel and image actions', function () {
        for (var _i = 0, _a = ['memory_write', 'second_run', 'cancel_run', 'image_effect']; _i < _a.length; _i++) {
            var action = _a[_i];
            var proposed = (0, flow_approval_policy_1.decideFlowApprovalPolicy)({ action: action });
            var approved = (0, flow_approval_policy_1.decideFlowApprovalPolicy)({ action: action, approved: true });
            (0, chai_1.expect)(proposed.policy).to.equal('human_gate_required');
            (0, chai_1.expect)(proposed.status).to.equal('proposed');
            (0, chai_1.expect)(approved.status).to.equal('approved');
        }
    });
});

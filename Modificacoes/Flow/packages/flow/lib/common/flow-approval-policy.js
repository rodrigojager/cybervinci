"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decideFlowApprovalPolicy = decideFlowApprovalPolicy;
var explicitHumanPolicies = new Set([
    'human_gate_required',
    'approval_required',
    'manual_approval',
    'manual',
    'strict_human_gate'
]);
var explicitAutoPolicies = new Set([
    'auto_apply',
    'auto',
    'allow'
]);
var explicitBlockPolicies = new Set([
    'blocked',
    'deny',
    'never'
]);
var alwaysApprovalActions = new Set([
    'image_effect',
    'memory_write',
    'second_run',
    'cancel_run'
]);
function decideFlowApprovalPolicy(input) {
    var riskReasons = uniqueStrings(input.riskReasons || []);
    var blockedReasons = uniqueStrings(input.blockedReasons || []);
    var requested = normalizePolicy(input.requestedPolicy);
    var blocked = blockedReasons.length > 0 || explicitBlockPolicies.has(requested);
    var requiresApproval = !blocked && (alwaysApprovalActions.has(input.action)
        || riskReasons.length > 0
        || explicitHumanPolicies.has(requested));
    var policy = blocked
        ? 'blocked'
        : requiresApproval
            ? 'human_gate_required'
            : 'auto_apply';
    var approved = !blocked && (!requiresApproval || Boolean(input.approved));
    var status = blocked
        ? 'blocked'
        : approved
            ? 'approved'
            : 'proposed';
    var reasons = __spreadArray(__spreadArray([], blockedReasons, true), riskReasons, true);
    var message = blocked
        ? reasons.join('; ') || "Approval policy blocked ".concat(input.action, ".")
        : requiresApproval && !approved
            ? "approval required by ".concat(policy)
            : reasons.join('; ') || undefined;
    return {
        action: input.action,
        policy: policy,
        requiresApproval: requiresApproval,
        blocked: blocked,
        approved: approved,
        status: status,
        reasons: reasons,
        message: message
    };
}
function normalizePolicy(value) {
    var normalized = value === null || value === void 0 ? void 0 : value.trim().toLowerCase();
    if (!normalized) {
        return '';
    }
    if (explicitAutoPolicies.has(normalized)) {
        return 'auto_apply';
    }
    return normalized;
}
function uniqueStrings(values) {
    return __spreadArray([], new Set(values.map(function (value) { return value.trim(); }).filter(Boolean)), true);
}

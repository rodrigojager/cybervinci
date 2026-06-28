export type FlowApprovalAction =
    | 'file_effect'
    | 'command_effect'
    | 'image_effect'
    | 'memory_write'
    | 'second_run'
    | 'cancel_run';

export type FlowApprovalDecision = 'auto_apply' | 'human_gate_required' | 'blocked';

export interface FlowApprovalPolicyInput {
    action: FlowApprovalAction;
    requestedPolicy?: string;
    riskReasons?: string[];
    blockedReasons?: string[];
    approved?: boolean;
}

export interface FlowApprovalPolicyDecision {
    action: FlowApprovalAction;
    policy: FlowApprovalDecision;
    requiresApproval: boolean;
    blocked: boolean;
    approved: boolean;
    status: 'approved' | 'proposed' | 'blocked';
    reasons: string[];
    message?: string;
}

const explicitHumanPolicies = new Set([
    'human_gate_required',
    'approval_required',
    'manual_approval',
    'manual',
    'strict_human_gate'
]);

const explicitAutoPolicies = new Set([
    'auto_apply',
    'auto',
    'allow'
]);

const explicitBlockPolicies = new Set([
    'blocked',
    'deny',
    'never'
]);

const alwaysApprovalActions = new Set<FlowApprovalAction>([
    'image_effect',
    'memory_write',
    'second_run',
    'cancel_run'
]);

export function decideFlowApprovalPolicy(input: FlowApprovalPolicyInput): FlowApprovalPolicyDecision {
    const riskReasons = uniqueStrings(input.riskReasons || []);
    const blockedReasons = uniqueStrings(input.blockedReasons || []);
    const requested = normalizePolicy(input.requestedPolicy);
    const blocked = blockedReasons.length > 0 || explicitBlockPolicies.has(requested);
    const requiresApproval = !blocked && (
        alwaysApprovalActions.has(input.action)
        || riskReasons.length > 0
        || explicitHumanPolicies.has(requested)
    );
    const policy: FlowApprovalDecision = blocked
        ? 'blocked'
        : requiresApproval
            ? 'human_gate_required'
            : 'auto_apply';
    const approved = !blocked && (!requiresApproval || Boolean(input.approved));
    const status: FlowApprovalPolicyDecision['status'] = blocked
        ? 'blocked'
        : approved
            ? 'approved'
            : 'proposed';
    const reasons = [...blockedReasons, ...riskReasons];
    const message = blocked
        ? reasons.join('; ') || `Approval policy blocked ${input.action}.`
        : requiresApproval && !approved
            ? `approval required by ${policy}`
            : reasons.join('; ') || undefined;

    return {
        action: input.action,
        policy,
        requiresApproval,
        blocked,
        approved,
        status,
        reasons,
        message
    };
}

function normalizePolicy(value: string | undefined): string {
    const normalized = value?.trim().toLowerCase();
    if (!normalized) {
        return '';
    }
    if (explicitAutoPolicies.has(normalized)) {
        return 'auto_apply';
    }
    return normalized;
}

function uniqueStrings(values: string[]): string[] {
    return [...new Set(values.map(value => value.trim()).filter(Boolean))];
}

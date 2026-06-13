export type FlowApprovalAction = 'file_effect' | 'command_effect' | 'image_effect' | 'memory_write' | 'second_run' | 'cancel_run';
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
export declare function decideFlowApprovalPolicy(input: FlowApprovalPolicyInput): FlowApprovalPolicyDecision;

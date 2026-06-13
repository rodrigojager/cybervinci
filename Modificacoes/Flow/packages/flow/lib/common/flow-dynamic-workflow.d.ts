import { FlowWorkflow } from './flow-types';
import { FlowWorkflowPattern } from './flow-patterns';
export type FlowDynamicWorkflowDecisionKind = 'saved_workflow' | 'pattern' | 'generated_workflow';
export interface FlowDynamicWorkflowPlan {
    kind: FlowDynamicWorkflowDecisionKind;
    reason: string;
    workflowId?: string;
    patternId?: string;
    workflow?: FlowWorkflow;
    confidence: number;
    parameters?: Record<string, unknown>;
}
export interface FlowDynamicWorkflowPlanningInput {
    prompt: string;
    workflows: FlowWorkflow[];
    patterns: FlowWorkflowPattern[];
    preferSaved?: boolean;
}
export declare function planDynamicWorkflow(input: FlowDynamicWorkflowPlanningInput): FlowDynamicWorkflowPlan;

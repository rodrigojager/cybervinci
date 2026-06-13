import { FlowStateType, FlowWorkflow, FlowWorkflowState, FlowWorkflowTransition } from './flow-types';
export declare function createFlowWorkflowState(stateType: FlowStateType, stateId: string): FlowWorkflowState;
export declare function addFlowWorkflowState(workflow: FlowWorkflow, stateType: FlowStateType): {
    workflow: FlowWorkflow;
    stateId: string;
};
export declare function addFlowWorkflowTransition(workflow: FlowWorkflow, from: string, to: string): {
    workflow: FlowWorkflow;
    transition?: FlowWorkflowTransition;
};
export declare function addFlowParallelBranch(workflow: FlowWorkflow, parallelStateId: string, branchType: FlowStateType): {
    workflow: FlowWorkflow;
    branchId?: string;
};
export declare function removeFlowWorkflowState(workflow: FlowWorkflow, stateId: string): FlowWorkflow;
export declare function findFlowWorkflowState(workflow: FlowWorkflow, stateId: string): {
    state: FlowWorkflowState;
    parentId?: string;
} | undefined;
export declare function replaceFlowWorkflowState(workflow: FlowWorkflow, stateId: string, state: FlowWorkflowState): FlowWorkflow;
export declare function flowWorkflowStateReferences(workflow: FlowWorkflow, stateId: string): string[];
export declare function flowWorkflowStateIds(workflow: FlowWorkflow): string[];
export declare function nextFlowWorkflowStateId(workflow: FlowWorkflow, stateType: FlowStateType): string;
export declare function nextFlowWorkflowTransitionId(workflow: FlowWorkflow, from: string, to: string): string;
export declare function compactFlowState(state: FlowWorkflowState): FlowWorkflowState;

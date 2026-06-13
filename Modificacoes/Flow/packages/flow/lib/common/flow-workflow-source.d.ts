import { FlowWorkflow } from './flow-types';
export interface FlowWorkflowStructuralDiff {
    fromWorkflowId: string;
    toWorkflowId: string;
    items: FlowWorkflowStructuralDiffItem[];
}
export interface FlowWorkflowStructuralDiffItem {
    kind: 'state' | 'transition' | 'metadata' | 'agent' | 'guard' | 'capability' | 'template';
    change: 'added' | 'removed' | 'changed';
    id: string;
    summary: string;
}
export declare function formatWorkflowSource(workflow: FlowWorkflow): string;
export declare function parseWorkflowSource(source: string, currentWorkflow: FlowWorkflow): FlowWorkflow;
export declare function stripWorkflowFileMetadata(workflow: FlowWorkflow): Omit<FlowWorkflow, 'file'>;
export declare function workflowSourceFormatLabel(workflow: FlowWorkflow): 'YAML' | 'JSON';
export declare function compareFlowWorkflowStructure(fileWorkflow: FlowWorkflow, canvasWorkflow: FlowWorkflow): FlowWorkflowStructuralDiff;

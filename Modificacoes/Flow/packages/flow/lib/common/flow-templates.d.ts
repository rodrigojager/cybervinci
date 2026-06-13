import { FlowWorkflow } from './flow-types';
export type FlowWorkflowTemplateId = 'simple_specialist' | 'linear_chain' | 'review_loop' | 'contracted_parallel_delivery' | 'content_factory' | 'conditional_contract' | 'human_approval_gate' | 'memory_consolidation';
export interface FlowWorkflowTemplate {
    id: FlowWorkflowTemplateId;
    name: string;
    description: string;
    workflow: FlowWorkflow;
}
export interface InstantiateFlowWorkflowTemplateOptions {
    id: string;
    name: string;
    description?: string;
}
export declare function listFlowWorkflowTemplates(): FlowWorkflowTemplate[];
export declare function getFlowWorkflowTemplate(id: FlowWorkflowTemplateId | string): FlowWorkflowTemplate | undefined;
export declare function instantiateFlowWorkflowTemplate(templateId: FlowWorkflowTemplateId | string, options: InstantiateFlowWorkflowTemplateOptions): FlowWorkflow;

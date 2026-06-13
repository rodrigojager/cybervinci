import { FlowCanvasModel, FlowFlowDraft, FlowKanbanColumn, FlowRun, FlowStateRuntimeStatus, FlowWorkflow, FlowWorkload } from './flow-types';
export declare function deriveFlowCanvasModel(workflow: FlowWorkflow, run?: FlowRun): FlowCanvasModel;
export declare function deriveFlowFlowDraft(workflow: FlowWorkflow, run?: FlowRun): FlowFlowDraft;
export declare function deriveFlowKanbanColumns(workloads: FlowWorkload[]): FlowKanbanColumn[];
export declare function summarizeGuard(guard: unknown): string | undefined;
export declare function nextRuntimeStatus(status: FlowStateRuntimeStatus): FlowStateRuntimeStatus;

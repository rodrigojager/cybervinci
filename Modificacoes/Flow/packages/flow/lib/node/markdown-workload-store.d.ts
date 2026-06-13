import { FlowArtifact, FlowEffect, FlowRun, FlowWorkflow, FlowWorkflowState, FlowWorkload, FlowWorkloadOutputEnvelope } from '../common';
export declare class MarkdownWorkloadStore {
    materializeRun(workspaceRootUri: string | undefined, workflow: FlowWorkflow, run: FlowRun): Promise<FlowRun>;
    protected writeInputEnvelope(workloadDir: string, workflow: FlowWorkflow, run: FlowRun, workload: FlowWorkload): Promise<void>;
    protected writeOutputEnvelope(workloadDir: string, workflow: FlowWorkflow, run: FlowRun, workload: FlowWorkload, state: FlowWorkflowState | undefined): Promise<FlowWorkloadOutputEnvelope>;
    protected writeAuditLinks(workloadDir: string, workflow: FlowWorkflow, run: FlowRun, workload: FlowWorkload, outputEnvelope: FlowWorkloadOutputEnvelope, artifacts: Map<string, FlowArtifact>): Promise<void>;
    protected registerOutputArtifacts(workloadDir: string, run: FlowRun, workload: FlowWorkload, outputEnvelope: FlowWorkloadOutputEnvelope, artifacts: Map<string, FlowArtifact>): void;
    protected registerEnvelopeEffect(workload: FlowWorkload, run: FlowRun, effects: Map<string, FlowEffect>): void;
    protected writeAggregatedIssues(root: string, runId: string, workloads: FlowWorkload[]): Promise<void>;
}

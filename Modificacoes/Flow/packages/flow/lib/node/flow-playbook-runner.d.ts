import { FlowWorkloadResultIssue } from '../common';
export declare const FlowPlaybookRunner: any;
export interface FlowPlaybookRunRequest {
    workspaceRootUri?: string;
    workflowId: string;
    runId: string;
    stateId: string;
    workloadId: string;
    playbookId: string;
    prompt: string;
    input: Record<string, unknown>;
}
export interface FlowPlaybookRunArtifact {
    path: string;
    content?: string;
    type?: string;
    hash?: string;
}
export interface FlowPlaybookRunResult {
    ok: boolean;
    stop?: boolean;
    message?: string;
    value?: unknown;
    artifacts?: FlowPlaybookRunArtifact[];
    signals?: Record<string, string | number | boolean>;
    issues?: FlowWorkloadResultIssue[];
    diagnostics?: unknown[];
}
export interface FlowPlaybookRunner {
    available?(): boolean | Promise<boolean>;
    runPlaybook(request: FlowPlaybookRunRequest): Promise<FlowPlaybookRunResult>;
}

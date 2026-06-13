import { FlowClient, FlowRunUpdate } from '../common/flow-protocol';
type RunUpdateListener = (update: FlowRunUpdate) => void;
type RunErrorListener = (error: {
    workspaceRootUri?: string;
    runId: string;
    message: string;
}) => void;
export declare class FlowClientImpl implements FlowClient {
    protected readonly runUpdateListeners: any;
    protected readonly runErrorListeners: any;
    onRunUpdated(update: FlowRunUpdate): void;
    onRunStreamError(error: {
        workspaceRootUri?: string;
        runId: string;
        message: string;
    }): void;
    onRunUpdate(listener: RunUpdateListener): () => void;
    onRunError(listener: RunErrorListener): () => void;
}
export {};

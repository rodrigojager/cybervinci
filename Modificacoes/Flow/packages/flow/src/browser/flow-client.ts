import { injectable } from '@theia/core/shared/inversify';
import { FlowClient, FlowRunUpdate } from '../common/flow-protocol';

type RunUpdateListener = (update: FlowRunUpdate) => void;
type RunErrorListener = (error: { workspaceRootUri?: string; runId: string; message: string }) => void;

@injectable()
export class FlowClientImpl implements FlowClient {
    protected readonly runUpdateListeners = new Set<RunUpdateListener>();
    protected readonly runErrorListeners = new Set<RunErrorListener>();

    onRunUpdated(update: FlowRunUpdate): void {
        for (const listener of this.runUpdateListeners) {
            listener(update);
        }
    }

    onRunStreamError(error: { workspaceRootUri?: string; runId: string; message: string }): void {
        for (const listener of this.runErrorListeners) {
            listener(error);
        }
    }

    onRunUpdate(listener: RunUpdateListener): () => void {
        this.runUpdateListeners.add(listener);
        return () => this.runUpdateListeners.delete(listener);
    }

    onRunError(listener: RunErrorListener): () => void {
        this.runErrorListeners.add(listener);
        return () => this.runErrorListeners.delete(listener);
    }
}

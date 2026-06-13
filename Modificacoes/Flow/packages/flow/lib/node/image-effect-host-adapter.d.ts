export declare const ImageEffectHostAdapter: any;
export interface ImageEffectRequest {
    type: string;
    prompt?: string;
    path?: string;
    artifactPath?: string;
    mimeType?: string;
    provider?: string;
    summary?: string;
    approvalPolicy?: string;
}
export interface AppliedImageEffect {
    applied: boolean;
    status: 'proposed' | 'applied' | 'blocked' | 'failed';
    provider: string;
    prompt: string;
    artifactPath: string;
    absolutePath: string;
    uri?: string;
    mimeType: string;
    bytes?: number;
    stdout?: string;
    stderr?: string;
    reason?: string;
    approvalPolicy?: string;
    requiresApproval?: boolean;
}
export interface ImageEffectHostAdapter {
    apply(workspaceRootUri: string | undefined, runId: string, workloadId: string, effect: ImageEffectRequest, approved?: boolean): Promise<AppliedImageEffect>;
}
export declare class LocalImageEffectHostAdapter implements ImageEffectHostAdapter {
    apply(workspaceRootUri: string | undefined, runId: string, workloadId: string, effect: ImageEffectRequest, approved?: boolean): Promise<AppliedImageEffect>;
}

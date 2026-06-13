export declare const FileEffectHostAdapter: any;
export type FileEffectType = 'file.created' | 'file.edited' | 'file.deleted';
export interface FileEffectRequest {
    type: FileEffectType | string;
    path: string;
    content?: string;
    hashBefore?: string;
    approvalPolicy?: string;
    allowedPaths?: string[];
    deniedPaths?: string[];
}
export interface PreparedFileEffect {
    type: FileEffectType;
    workspaceRoot: string;
    relativePath: string;
    absolutePath: string;
    existedBefore: boolean;
    contentBefore: string;
    contentAfter: string;
    hashBefore: string;
    hashAfter: string;
    patch: string;
    approvalPolicy: string;
    requiresApproval: boolean;
    blocked: boolean;
    riskReasons: string[];
    reason?: string;
}
export interface AppliedFileEffect extends PreparedFileEffect {
    applied: boolean;
}
export interface FileEffectHostAdapter {
    prepare(workspaceRootUri: string | undefined, effect: FileEffectRequest): Promise<PreparedFileEffect>;
    apply(workspaceRootUri: string | undefined, effect: FileEffectRequest, approved?: boolean): Promise<AppliedFileEffect>;
}
export declare class LocalFileEffectHostAdapter implements FileEffectHostAdapter {
    prepare(workspaceRootUri: string | undefined, effect: FileEffectRequest): Promise<PreparedFileEffect>;
    apply(workspaceRootUri: string | undefined, effect: FileEffectRequest, approved?: boolean): Promise<AppliedFileEffect>;
}

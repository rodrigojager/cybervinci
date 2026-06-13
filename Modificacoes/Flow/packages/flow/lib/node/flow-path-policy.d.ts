export interface FlowPathPolicy {
    allowedPaths?: string[];
    deniedPaths?: string[];
    denyInternalPaths?: boolean;
}
export interface ResolvedFlowWorkspacePath {
    absolutePath: string;
    relativePath: string;
}
export declare function resolveFlowWorkspacePath(workspaceRoot: string, requestedPath: string, policy?: FlowPathPolicy): ResolvedFlowWorkspacePath;
export declare function normalizeFlowRelativePath(requestedPath: string): string;
export declare function assertFlowPathPolicy(relativePath: string, policy?: FlowPathPolicy): void;
export declare function isOutsideFlowAllowlist(relativePath: string, allowedPaths: string[] | undefined): boolean;
export declare function isDeniedFlowPath(relativePath: string, deniedPaths: string[] | undefined): boolean;
export declare function splitFlowRelativePath(relativePath: string): string[];
export declare function isFlowInternalPath(relativePath: string): boolean;
export declare function sanitizeFlowPathSegment(value: string, fallback?: string): string;
export declare function resolveFlowRunDirectory(workspaceRoot: string, runId: string): string;

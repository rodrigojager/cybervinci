import * as path from 'path';

export interface FlowPathPolicy {
    allowedPaths?: string[];
    deniedPaths?: string[];
    denyInternalPaths?: boolean;
}

export interface ResolvedFlowWorkspacePath {
    absolutePath: string;
    relativePath: string;
}

export function resolveFlowWorkspacePath(workspaceRoot: string, requestedPath: string, policy: FlowPathPolicy = {}): ResolvedFlowWorkspacePath {
    const relativePath = normalizeFlowRelativePath(requestedPath);
    assertFlowPathPolicy(relativePath, policy);
    const resolvedRoot = path.resolve(workspaceRoot);
    const absolutePath = path.resolve(resolvedRoot, relativePath);
    const relativeToWorkspace = path.relative(resolvedRoot, absolutePath);
    if (!relativeToWorkspace || relativeToWorkspace.startsWith('..') || path.isAbsolute(relativeToWorkspace)) {
        throw new Error(`Path escapes the workspace: ${requestedPath}`);
    }
    return {
        absolutePath,
        relativePath: relativeToWorkspace.replace(/\\/g, '/')
    };
}

export function normalizeFlowRelativePath(requestedPath: string): string {
    const normalizedRequest = requestedPath.replace(/\\/g, '/').trim();
    if (!normalizedRequest || normalizedRequest.includes('\0') || path.isAbsolute(normalizedRequest) || /^[a-z][a-z0-9+.-]*:/i.test(normalizedRequest)) {
        throw new Error(`Path must be relative and inside the workspace: ${requestedPath}`);
    }
    const normalized = path.posix.normalize(normalizedRequest).replace(/^\/+/, '');
    if (!normalized || normalized === '.' || normalized.split('/').some(segment => segment === '..')) {
        throw new Error(`Path escapes the workspace: ${requestedPath}`);
    }
    return normalized;
}

export function assertFlowPathPolicy(relativePath: string, policy: FlowPathPolicy = {}): void {
    const normalizedRelativePath = normalizeFlowRelativePath(relativePath);
    if (policy.denyInternalPaths && isFlowInternalPath(normalizedRelativePath)) {
        throw new Error(`Path targets an internal Theia/Flow directory: ${normalizedRelativePath}`);
    }
    const denied = normalizePolicyPaths(policy.deniedPaths);
    const deniedBy = denied.find(candidate => matchesPolicyPath(normalizedRelativePath, candidate));
    if (deniedBy) {
        throw new Error(`Path is denied by Flow path policy: ${normalizedRelativePath}`);
    }
    const allowed = normalizePolicyPaths(policy.allowedPaths);
    if (allowed.length > 0 && !allowed.some(candidate => matchesPolicyPath(normalizedRelativePath, candidate))) {
        throw new Error(`Path is outside Flow allowlist: ${normalizedRelativePath}`);
    }
}

export function isOutsideFlowAllowlist(relativePath: string, allowedPaths: string[] | undefined): boolean {
    const allowed = normalizePolicyPaths(allowedPaths);
    if (allowed.length === 0) {
        return false;
    }
    const normalizedRelativePath = normalizeFlowRelativePath(relativePath);
    return !allowed.some(candidate => matchesPolicyPath(normalizedRelativePath, candidate));
}

export function isDeniedFlowPath(relativePath: string, deniedPaths: string[] | undefined): boolean {
    const denied = normalizePolicyPaths(deniedPaths);
    if (denied.length === 0) {
        return false;
    }
    const normalizedRelativePath = normalizeFlowRelativePath(relativePath);
    return denied.some(candidate => matchesPolicyPath(normalizedRelativePath, candidate));
}

export function splitFlowRelativePath(relativePath: string): string[] {
    return normalizeFlowRelativePath(relativePath).split('/').filter(Boolean);
}

export function isFlowInternalPath(relativePath: string): boolean {
    const normalizedRelativePath = normalizeFlowRelativePath(relativePath).toLowerCase();
    return normalizedRelativePath === '.theia'
        || normalizedRelativePath.startsWith('.theia/')
        || normalizedRelativePath === '.flow-runs'
        || normalizedRelativePath.startsWith('.flow-runs/');
}

export function sanitizeFlowPathSegment(value: string, fallback = 'item'): string {
    const sanitized = value.trim().replace(/[^a-zA-Z0-9._-]/g, '_').replace(/^\.+$/, '');
    return sanitized || fallback;
}

export function resolveFlowRunDirectory(workspaceRoot: string, runId: string): string {
    const storageRoot = path.resolve(workspaceRoot, '.theia', 'flow');
    const runsRoot = path.resolve(storageRoot, 'runs');
    const runDir = path.resolve(runsRoot, sanitizeFlowPathSegment(runId, 'run'));
    const relativeToRuns = path.relative(runsRoot, runDir);
    if (!relativeToRuns || relativeToRuns === '..' || relativeToRuns.startsWith(`..${path.sep}`) || path.isAbsolute(relativeToRuns)) {
        throw new Error(`Run directory escapes Flow run storage: ${runId}`);
    }
    return runDir;
}

function normalizePolicyPaths(paths: string[] | undefined): string[] {
    return (paths || []).map(value => {
        try {
            const wantsDirectory = value.replace(/\\/g, '/').trim().endsWith('/');
            const normalized = normalizeFlowRelativePath(value);
            return wantsDirectory ? `${normalized.replace(/\/+$/, '')}/` : normalized;
        } catch {
            return undefined;
        }
    }).filter((value): value is string => Boolean(value));
}

function matchesPolicyPath(relativePath: string, policyPath: string): boolean {
    const directory = policyPath.endsWith('/');
    const normalizedPolicyPath = directory ? policyPath.slice(0, -1) : policyPath;
    return relativePath === normalizedPolicyPath || (directory && relativePath.startsWith(`${normalizedPolicyPath}/`));
}

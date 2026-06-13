"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveFlowWorkspacePath = resolveFlowWorkspacePath;
exports.normalizeFlowRelativePath = normalizeFlowRelativePath;
exports.assertFlowPathPolicy = assertFlowPathPolicy;
exports.isOutsideFlowAllowlist = isOutsideFlowAllowlist;
exports.isDeniedFlowPath = isDeniedFlowPath;
exports.splitFlowRelativePath = splitFlowRelativePath;
exports.isFlowInternalPath = isFlowInternalPath;
exports.sanitizeFlowPathSegment = sanitizeFlowPathSegment;
exports.resolveFlowRunDirectory = resolveFlowRunDirectory;
var path = require("path");
function resolveFlowWorkspacePath(workspaceRoot, requestedPath, policy) {
    if (policy === void 0) { policy = {}; }
    var relativePath = normalizeFlowRelativePath(requestedPath);
    assertFlowPathPolicy(relativePath, policy);
    var resolvedRoot = path.resolve(workspaceRoot);
    var absolutePath = path.resolve(resolvedRoot, relativePath);
    var relativeToWorkspace = path.relative(resolvedRoot, absolutePath);
    if (!relativeToWorkspace || relativeToWorkspace.startsWith('..') || path.isAbsolute(relativeToWorkspace)) {
        throw new Error("Path escapes the workspace: ".concat(requestedPath));
    }
    return {
        absolutePath: absolutePath,
        relativePath: relativeToWorkspace.replace(/\\/g, '/')
    };
}
function normalizeFlowRelativePath(requestedPath) {
    var normalizedRequest = requestedPath.replace(/\\/g, '/').trim();
    if (!normalizedRequest || normalizedRequest.includes('\0') || path.isAbsolute(normalizedRequest) || /^[a-z][a-z0-9+.-]*:/i.test(normalizedRequest)) {
        throw new Error("Path must be relative and inside the workspace: ".concat(requestedPath));
    }
    var normalized = path.posix.normalize(normalizedRequest).replace(/^\/+/, '');
    if (!normalized || normalized === '.' || normalized.split('/').some(function (segment) { return segment === '..'; })) {
        throw new Error("Path escapes the workspace: ".concat(requestedPath));
    }
    return normalized;
}
function assertFlowPathPolicy(relativePath, policy) {
    if (policy === void 0) { policy = {}; }
    var normalizedRelativePath = normalizeFlowRelativePath(relativePath);
    if (policy.denyInternalPaths && isFlowInternalPath(normalizedRelativePath)) {
        throw new Error("Path targets an internal Theia/Flow directory: ".concat(normalizedRelativePath));
    }
    var denied = normalizePolicyPaths(policy.deniedPaths);
    var deniedBy = denied.find(function (candidate) { return matchesPolicyPath(normalizedRelativePath, candidate); });
    if (deniedBy) {
        throw new Error("Path is denied by Flow path policy: ".concat(normalizedRelativePath));
    }
    var allowed = normalizePolicyPaths(policy.allowedPaths);
    if (allowed.length > 0 && !allowed.some(function (candidate) { return matchesPolicyPath(normalizedRelativePath, candidate); })) {
        throw new Error("Path is outside Flow allowlist: ".concat(normalizedRelativePath));
    }
}
function isOutsideFlowAllowlist(relativePath, allowedPaths) {
    var allowed = normalizePolicyPaths(allowedPaths);
    if (allowed.length === 0) {
        return false;
    }
    var normalizedRelativePath = normalizeFlowRelativePath(relativePath);
    return !allowed.some(function (candidate) { return matchesPolicyPath(normalizedRelativePath, candidate); });
}
function isDeniedFlowPath(relativePath, deniedPaths) {
    var denied = normalizePolicyPaths(deniedPaths);
    if (denied.length === 0) {
        return false;
    }
    var normalizedRelativePath = normalizeFlowRelativePath(relativePath);
    return denied.some(function (candidate) { return matchesPolicyPath(normalizedRelativePath, candidate); });
}
function splitFlowRelativePath(relativePath) {
    return normalizeFlowRelativePath(relativePath).split('/').filter(Boolean);
}
function isFlowInternalPath(relativePath) {
    var normalizedRelativePath = normalizeFlowRelativePath(relativePath).toLowerCase();
    return normalizedRelativePath === '.theia'
        || normalizedRelativePath.startsWith('.theia/')
        || normalizedRelativePath === '.flow-runs'
        || normalizedRelativePath.startsWith('.flow-runs/');
}
function sanitizeFlowPathSegment(value, fallback) {
    if (fallback === void 0) { fallback = 'item'; }
    var sanitized = value.trim().replace(/[^a-zA-Z0-9._-]/g, '_').replace(/^\.+$/, '');
    return sanitized || fallback;
}
function resolveFlowRunDirectory(workspaceRoot, runId) {
    var storageRoot = path.resolve(workspaceRoot, '.theia', 'flow');
    var runsRoot = path.resolve(storageRoot, 'runs');
    var runDir = path.resolve(runsRoot, sanitizeFlowPathSegment(runId, 'run'));
    var relativeToRuns = path.relative(runsRoot, runDir);
    if (!relativeToRuns || relativeToRuns === '..' || relativeToRuns.startsWith("..".concat(path.sep)) || path.isAbsolute(relativeToRuns)) {
        throw new Error("Run directory escapes Flow run storage: ".concat(runId));
    }
    return runDir;
}
function normalizePolicyPaths(paths) {
    return (paths || []).map(function (value) {
        try {
            var wantsDirectory = value.replace(/\\/g, '/').trim().endsWith('/');
            var normalized = normalizeFlowRelativePath(value);
            return wantsDirectory ? "".concat(normalized.replace(/\/+$/, ''), "/") : normalized;
        }
        catch (_a) {
            return undefined;
        }
    }).filter(function (value) { return Boolean(value); });
}
function matchesPolicyPath(relativePath, policyPath) {
    var directory = policyPath.endsWith('/');
    var normalizedPolicyPath = directory ? policyPath.slice(0, -1) : policyPath;
    return relativePath === normalizedPolicyPath || (directory && relativePath.startsWith("".concat(normalizedPolicyPath, "/")));
}

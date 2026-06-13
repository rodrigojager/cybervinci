"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.artifactUriToOpenUri = artifactUriToOpenUri;
var uri_1 = require("@theia/core/lib/common/uri");
function artifactUriToOpenUri(artifactUri, workspaceRootUri) {
    if (artifactUri.startsWith('flow://')) {
        var flowUri = new uri_1.default(artifactUri);
        var runId = flowUri.authority;
        var parts = flowUri.path.toString().split('/').filter(Boolean).map(decodeURIComponent);
        if (workspaceRootUri && runId && parts.length >= 2) {
            var stateId = parts[0], artifactPath = parts.slice(1);
            return resolveWorkspacePath(workspaceRootUri, __spreadArray(['.theia', 'flow', 'runs', runId, stateId, 'output', 'artifacts'], safeRelativePathParts(artifactPath.join('/')), true));
        }
        return flowUri;
    }
    if (/^[a-z][a-z0-9+.-]*:/i.test(artifactUri)) {
        return new uri_1.default(artifactUri);
    }
    if (workspaceRootUri) {
        return resolveWorkspacePath(workspaceRootUri, safeRelativePathParts(artifactUri));
    }
    return new uri_1.default(artifactUri);
}
function resolveWorkspacePath(workspaceRootUri, parts) {
    return parts.reduce(function (uri, part) { return uri.resolve(part); }, new uri_1.default(workspaceRootUri));
}
function safeRelativePathParts(relativePath) {
    return relativePath
        .split(/[\\/]+/)
        .filter(function (part) { return part && part !== '.' && part !== '..'; });
}

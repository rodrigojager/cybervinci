import URI from '@theia/core/lib/common/uri';

export function artifactUriToOpenUri(artifactUri: string, workspaceRootUri?: string): URI {
    if (artifactUri.startsWith('flow://')) {
        const flowUri = new URI(artifactUri);
        const runId = flowUri.authority;
        const parts = flowUri.path.toString().split('/').filter(Boolean).map(decodeURIComponent);
        if (workspaceRootUri && runId && parts.length >= 2) {
            const [stateId, ...artifactPath] = parts;
            return resolveWorkspacePath(workspaceRootUri, ['.theia', 'flow', 'runs', runId, stateId, 'output', 'artifacts', ...safeRelativePathParts(artifactPath.join('/'))]);
        }
        return flowUri;
    }
    if (/^[a-z][a-z0-9+.-]*:/i.test(artifactUri)) {
        return new URI(artifactUri);
    }
    if (workspaceRootUri) {
        return resolveWorkspacePath(workspaceRootUri, safeRelativePathParts(artifactUri));
    }
    return new URI(artifactUri);
}

function resolveWorkspacePath(workspaceRootUri: string, parts: string[]): URI {
    return parts.reduce((uri, part) => uri.resolve(part), new URI(workspaceRootUri));
}

function safeRelativePathParts(relativePath: string): string[] {
    return relativePath
        .split(/[\\/]+/)
        .filter(part => part && part !== '.' && part !== '..');
}

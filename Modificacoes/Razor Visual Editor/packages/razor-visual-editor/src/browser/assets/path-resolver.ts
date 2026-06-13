import URI from '@theia/core/lib/common/uri';
import { injectable } from '@theia/core/shared/inversify';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { WorkspaceService } from '@theia/workspace/lib/browser';

@injectable()
export class RazorVisualPathResolver {
    async resolveWorkspaceAsset(requestedPath: string, sourceUri: URI, workspaceService: WorkspaceService, fileService: FileService): Promise<URI | undefined> {
        const root = this.workspaceRootFor(sourceUri, workspaceService) ?? sourceUri.parent;
        const candidates = this.candidates(requestedPath, root, sourceUri);
        for (const candidate of candidates) {
            if (await fileService.exists(candidate)) {
                return candidate;
            }
        }
        return undefined;
    }

    workspaceRootFor(sourceUri: URI, workspaceService: WorkspaceService): URI | undefined {
        return workspaceService.getWorkspaceRootUri(sourceUri) ?? workspaceService.tryGetRoots()[0]?.resource;
    }

    protected candidates(requestedPath: string, workspaceRoot: URI, sourceUri: URI): URI[] {
        const normalized = requestedPath.trim().replace(/\\/g, '/');
        if (!normalized || /^(https?:)?\/\//i.test(normalized) || normalized.startsWith('data:')) {
            return [];
        }
        if (normalized.startsWith('~/')) {
            return [workspaceRoot.resolve(normalized.slice(2))];
        }
        if (normalized.startsWith('/Content/') || normalized.startsWith('/Scripts/')) {
            return [workspaceRoot.resolve(normalized.slice(1))];
        }
        if (normalized.startsWith('/css/') || normalized.startsWith('/js/')) {
            return [
                workspaceRoot.resolve(`wwwroot${normalized}`),
                workspaceRoot.resolve(normalized.slice(1))
            ];
        }
        if (normalized.startsWith('/')) {
            return [workspaceRoot.resolve(normalized.slice(1))];
        }
        return [
            sourceUri.parent.resolve(normalized),
            workspaceRoot.resolve(normalized)
        ];
    }
}

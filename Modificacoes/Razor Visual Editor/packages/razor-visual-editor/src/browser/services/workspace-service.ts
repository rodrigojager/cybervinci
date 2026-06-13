import URI from '@theia/core/lib/common/uri';
import { injectable } from '@theia/core/shared/inversify';
import { WorkspaceService } from '@theia/workspace/lib/browser';

@injectable()
export class RazorVisualWorkspaceService {
    getWorkspaceRoot(uri: URI, workspaceService: WorkspaceService): URI | undefined {
        return workspaceService.getWorkspaceRootUri(uri) ?? workspaceService.tryGetRoots()[0]?.resource;
    }

    getRelativePath(uri: URI, workspaceService: WorkspaceService): string {
        const root = this.getWorkspaceRoot(uri, workspaceService);
        return root?.relative(uri)?.toString() ?? uri.path.toString();
    }
}

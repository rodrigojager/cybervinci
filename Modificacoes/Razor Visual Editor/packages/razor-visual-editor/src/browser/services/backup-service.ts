import URI from '@theia/core/lib/common/uri';
import { BinaryBuffer } from '@theia/core/lib/common/buffer';
import { injectable } from '@theia/core/shared/inversify';
import { FileService } from '@theia/filesystem/lib/browser/file-service';

@injectable()
export class RazorVisualBackupService {
    async createSiblingBackup(uri: URI, content: string, fileService: FileService): Promise<URI> {
        const backupUri = uri.parent.resolve(`${uri.path.base}.cvbak`);
        await fileService.writeFile(backupUri, BinaryBuffer.fromString(content));
        return backupUri;
    }
}

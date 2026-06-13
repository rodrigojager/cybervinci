import URI from '@theia/core/lib/common/uri';
import { injectable } from '@theia/core/shared/inversify';
import { FileService } from '@theia/filesystem/lib/browser/file-service';

@injectable()
export class RazorVisualCssLoader {
    async readCss(uri: URI, fileService: FileService): Promise<string> {
        return (await fileService.read(uri)).value.toString();
    }
}

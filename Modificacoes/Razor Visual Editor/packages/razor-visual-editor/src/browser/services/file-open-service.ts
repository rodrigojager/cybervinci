import URI from '@theia/core/lib/common/uri';
import { inject, injectable } from '@theia/core/shared/inversify';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { isRazorFileName } from '../../common';
import { RazorVisualAssetResolver } from '../assets/asset-resolver';
import { EditorDocument } from '../types/editor-document';
import { RazorSourceMap } from '../types/razor-token';
import { RazorProtector } from '../razor/razor-protector';
import { stableHash } from '../razor/razor-source-map';

@injectable()
export class RazorVisualFileOpenService {
    @inject(FileService)
    protected readonly fileService: FileService;

    @inject(RazorProtector)
    protected readonly razorProtector: RazorProtector;

    @inject(RazorVisualAssetResolver)
    protected readonly assetResolver: RazorVisualAssetResolver;

    async open(uri: URI): Promise<EditorDocument> {
        const file = await this.fileService.read(uri);
        const originalContent = file.value.toString();
        const isRazor = isRazorFileName(uri.path.toString());
        const diagnostics: string[] = [];
        let processedHtml = originalContent;
        let sourceMap: RazorSourceMap | undefined;

        if (isRazor) {
            const protection = this.razorProtector.protect(originalContent, uri.path.toString());
            processedHtml = protection.processedHtml;
            sourceMap = protection.sourceMap;
            diagnostics.push(`Razor tokens: ${protection.sourceMap.tokens.length}`);
            diagnostics.push(`Razor parse time: ${protection.elapsedMs}ms`);
            diagnostics.push(...protection.warnings);
        }

        const assetResolution = await this.assetResolver.resolve(originalContent, uri);
        diagnostics.push(...assetResolution.warnings);

        return {
            uri,
            originalContent,
            processedHtml,
            originalHash: stableHash(originalContent),
            fileMtime: file.mtime,
            fileEtag: file.etag,
            isRazor,
            sourceMap,
            assetResolution,
            diagnostics
        };
    }
}

import { injectable } from '@theia/core/shared/inversify';
import { RazorProtectionResult, RazorRestoreResult, RazorSourceMap } from '../types/razor-token';
import { createRazorSourceMap } from './razor-source-map';
import { RazorTokenizer } from './razor-tokenizer';
import { restoreRazorTokens } from './razor-restore';

@injectable()
export class RazorProtector {
    protected readonly tokenizer = new RazorTokenizer();

    protect(content: string, filePath: string): RazorProtectionResult {
        const startedAt = Date.now();
        const result = this.tokenizer.tokenize(content);
        const sourceMap = createRazorSourceMap(filePath, content, result.processedHtml, result.tokens);
        return {
            processedHtml: result.processedHtml,
            sourceMap,
            warnings: result.warnings,
            elapsedMs: Date.now() - startedAt
        };
    }

    restore(processedHtml: string, sourceMap: RazorSourceMap): RazorRestoreResult {
        return restoreRazorTokens(processedHtml, sourceMap);
    }
}

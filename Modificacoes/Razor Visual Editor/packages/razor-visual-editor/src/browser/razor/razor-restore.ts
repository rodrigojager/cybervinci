import { RazorRestoreResult, RazorSourceMap } from '../types/razor-token';
import { parseHtmlFragment, validateRazorPlaceholders } from './razor-validation';

export function restoreRazorTokens(html: string, sourceMap: RazorSourceMap): RazorRestoreResult {
    const issues = validateRazorPlaceholders(html, sourceMap);
    if (issues.some(issue => issue.severity === 'error')) {
        return { html, issues };
    }

    const document = parseHtmlFragment(html);
    for (const token of sourceMap.tokens) {
        const element = document.querySelector(`[data-cv-razor-token="${token.id}"]`);
        if (!element) {
            continue;
        }
        element.replaceWith(document.createComment(`CV_RAZOR_RESTORE_${token.id}`));
    }

    let restored = document.body.innerHTML;
    for (const token of sourceMap.tokens) {
        restored = restored.replace(`<!--CV_RAZOR_RESTORE_${token.id}-->`, token.originalText);
    }

    return { html: restored, issues };
}

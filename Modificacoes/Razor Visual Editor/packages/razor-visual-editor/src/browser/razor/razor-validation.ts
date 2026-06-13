import { RazorSourceMap, RazorValidationIssue } from '../types/razor-token';

export function validateRazorPlaceholders(html: string, sourceMap: RazorSourceMap): RazorValidationIssue[] {
    const document = parseHtmlFragment(html);
    const issues: RazorValidationIssue[] = [];
    const knownIds = new Set(sourceMap.tokens.map(token => token.id));

    for (const token of sourceMap.tokens) {
        const elements = Array.from(document.querySelectorAll(`[data-cv-razor-token="${token.id}"]`));
        if (elements.length === 0) {
            issues.push({
                tokenId: token.id,
                severity: 'error',
                message: `Razor token ${token.id} disappeared from the visual document.`
            });
            continue;
        }
        if (elements.length > 1) {
            issues.push({
                tokenId: token.id,
                severity: 'error',
                message: `Razor token ${token.id} was duplicated.`
            });
        }
        const element = elements[0];
        if (element.getAttribute('data-cv-razor-kind') !== token.kind) {
            issues.push({
                tokenId: token.id,
                severity: 'error',
                message: `Razor token ${token.id} changed kind.`
            });
        }
        if (element.getAttribute('data-cv-razor-checksum') !== token.checksum) {
            issues.push({
                tokenId: token.id,
                severity: 'error',
                message: `Razor token ${token.id} failed checksum validation.`
            });
        }
    }

    for (const element of Array.from(document.querySelectorAll('[data-cv-razor-token]'))) {
        const tokenId = element.getAttribute('data-cv-razor-token');
        if (tokenId && !knownIds.has(tokenId)) {
            issues.push({
                tokenId,
                severity: 'error',
                message: `Unknown Razor token ${tokenId} is present in the visual document.`
            });
        }
    }

    if (html.trim().length === 0) {
        issues.push({
            severity: 'error',
            message: 'The visual editor exported an empty HTML document.'
        });
    }

    return issues;
}

export function parseHtmlFragment(html: string): Document {
    return new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
}

import { AssetResolutionResult } from '../types/asset-reference';
import { CssVariableDefinition, CssVariableKind } from '../types/css-variable';

const DECLARATION_PATTERN = /([^{}]+)\{([^{}]*)\}/g;
const VARIABLE_PATTERN = /(--[A-Za-z0-9_-]+)\s*:\s*([^;]+);?/g;

export function analyzeCssVariables(assetResolution: AssetResolutionResult): CssVariableDefinition[] {
    const variables = new Map<string, CssVariableDefinition>();
    const cssSources = assetResolution.assets
        .filter(asset => (asset.kind === 'css' || asset.kind === 'bundle') && asset.content)
        .map(asset => ({
            label: asset.requestedPath,
            sourceUri: asset.resolvedUri?.toString(),
            css: asset.content ?? ''
        }));

    if (cssSources.length === 0) {
        cssSources.push(...assetResolution.css.map((css, index) => ({ label: `CSS ${index + 1}`, sourceUri: undefined, css })));
    }

    for (const source of cssSources) {
        for (const block of source.css.matchAll(DECLARATION_PATTERN)) {
            const selector = block[1].trim().replace(/\s+/g, ' ');
            const body = block[2];
            for (const variable of body.matchAll(VARIABLE_PATTERN)) {
                const name = variable[1].trim();
                const value = variable[2].trim();
                variables.set(name, {
                    name,
                    value,
                    kind: variableKind(name, value),
                    source: source.label,
                    sourceUri: source.sourceUri,
                    selector
                });
            }
        }
    }

    return Array.from(variables.values()).sort((left, right) => {
        const kindOrder = kindRank(left.kind) - kindRank(right.kind);
        return kindOrder || left.name.localeCompare(right.name);
    });
}

function variableKind(name: string, value: string): CssVariableKind {
    const normalized = `${name} ${value}`.toLowerCase();
    if (/\b(radius|round|rounded|corner)\b/.test(normalized)) {
        return 'radius';
    }
    if (isColorValue(value) || /\b(color|colour|primary|secondary|tertiary|accent|surface|background|foreground|text|border)\b/.test(normalized)) {
        return 'color';
    }
    return 'other';
}

function isColorValue(value: string): boolean {
    return /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value.trim())
        || /^(?:rgb|rgba|hsl|hsla|oklch|lab|lch)\(/i.test(value.trim())
        || /^(?:transparent|currentcolor|black|white|red|green|blue|gray|grey)$/i.test(value.trim());
}

function kindRank(kind: CssVariableKind): number {
    switch (kind) {
        case 'color': return 0;
        case 'radius': return 1;
        default: return 2;
    }
}

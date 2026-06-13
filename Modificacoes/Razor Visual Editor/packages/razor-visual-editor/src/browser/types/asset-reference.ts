import URI from '@theia/core/lib/common/uri';

export type AssetReferenceKind = 'css' | 'script' | 'bundle';

export interface AssetReference {
    kind: AssetReferenceKind;
    requestedPath: string;
    resolvedUri?: URI;
    content?: string;
    source: 'link' | 'script' | 'bundle';
    warning?: string;
}

export interface AssetResolutionResult {
    assets: AssetReference[];
    css: string[];
    warnings: string[];
}

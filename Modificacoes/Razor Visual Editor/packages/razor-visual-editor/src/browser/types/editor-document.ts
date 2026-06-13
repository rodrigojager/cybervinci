import URI from '@theia/core/lib/common/uri';
import { AssetResolutionResult } from './asset-reference';
import { RazorSourceMap } from './razor-token';

export type RazorVisualEditorMode = 'editor' | 'preview' | 'preview-scripts' | 'source' | 'diff';
export type RazorVisualViewport = 'desktop' | 'tablet' | 'mobile' | 'custom';

export interface EditorDocument {
    uri: URI;
    originalContent: string;
    processedHtml: string;
    originalHash: string;
    fileMtime: number;
    fileEtag: string;
    isRazor: boolean;
    sourceMap?: RazorSourceMap;
    assetResolution: AssetResolutionResult;
    diagnostics: string[];
}

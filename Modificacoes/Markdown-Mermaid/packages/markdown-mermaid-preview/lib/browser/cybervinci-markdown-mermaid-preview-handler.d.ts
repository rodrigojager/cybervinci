import URI from '@theia/core/lib/common/uri';
import * as markdownit from '@theia/core/shared/markdown-it';
import { MarkdownPreviewHandler } from '@theia/preview/lib/browser/markdown';
import { RenderContentParams } from '@theia/preview/lib/browser/preview-handler';
export declare class CyberVinciMarkdownMermaidPreviewHandler extends MarkdownPreviewHandler {
    protected static readonly PRIORITY = 650;
    protected fenceRendererInstalled: boolean;
    protected renderSequence: number;
    canHandle(uri: URI): number;
    renderContent(params: RenderContentParams): HTMLElement;
    protected getEngine(): markdownit;
    protected renderMermaidBlocks(contentElement: HTMLElement): void;
    protected renderMermaidBlock(target: HTMLElement, source: string): Promise<void>;
    protected getMermaidTheme(): 'default' | 'dark';
    protected renderMermaidError(target: HTMLElement, source: string, error: unknown): void;
}
//# sourceMappingURL=cybervinci-markdown-mermaid-preview-handler.d.ts.map
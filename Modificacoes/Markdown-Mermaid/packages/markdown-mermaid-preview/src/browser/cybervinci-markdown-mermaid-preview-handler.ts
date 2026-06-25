// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import URI from '@theia/core/lib/common/uri';
import { injectable } from '@theia/core/shared/inversify';
import * as DOMPurify from '@theia/core/shared/dompurify';
import * as markdownit from '@theia/core/shared/markdown-it';
import { MarkdownPreviewHandler } from '@theia/preview/lib/browser/markdown';
import { RenderContentParams } from '@theia/preview/lib/browser/preview-handler';

@injectable()
export class CyberVinciMarkdownMermaidPreviewHandler extends MarkdownPreviewHandler {

    protected static readonly PRIORITY = 650;

    protected fenceRendererInstalled = false;
    protected renderSequence = 0;

    override canHandle(uri: URI): number {
        return super.canHandle(uri) > 0 ? CyberVinciMarkdownMermaidPreviewHandler.PRIORITY : 0;
    }

    override renderContent(params: RenderContentParams): HTMLElement {
        const contentElement = super.renderContent(params);
        contentElement.classList.add('cybervinci-markdown-mermaid-enabled');
        this.renderMermaidBlocks(contentElement);
        return contentElement;
    }

    protected override getEngine(): markdownit {
        const engine = super.getEngine();
        if (!this.fenceRendererInstalled) {
            this.fenceRendererInstalled = true;
            const originalFenceRenderer = engine.renderer.rules.fence;
            engine.renderer.rules.fence = (tokens, index, options, env, self) => {
                const token = tokens[index];
                const language = token.info.trim().split(/\s+/)[0].toLowerCase();
                if (language === 'mermaid') {
                    const line = token.map?.[0];
                    const lineAttributes = typeof line === 'number'
                        ? ` class="line cybervinci-mermaid-source" data-line="${line}"`
                        : ' class="cybervinci-mermaid-source"';
                    return `<pre${lineAttributes}><code>${engine.utils.escapeHtml(token.content)}</code></pre>`;
                }
                return originalFenceRenderer
                    ? originalFenceRenderer(tokens, index, options, env, self)
                    : self.renderToken(tokens, index, options);
            };
        }
        return engine;
    }

    protected renderMermaidBlocks(contentElement: HTMLElement): void {
        const sourceBlocks = Array.from(contentElement.querySelectorAll<HTMLElement>('pre.cybervinci-mermaid-source'));
        for (const sourceBlock of sourceBlocks) {
            const source = sourceBlock.textContent ?? '';
            const previewBlock = document.createElement('div');
            previewBlock.classList.add('cybervinci-mermaid-preview');
            const line = sourceBlock.getAttribute('data-line');
            if (line !== null) {
                previewBlock.classList.add('line');
                previewBlock.setAttribute('data-line', line);
            }
            sourceBlock.replaceWith(previewBlock);
            this.renderMermaidBlock(previewBlock, source);
        }
    }

    protected async renderMermaidBlock(target: HTMLElement, source: string): Promise<void> {
        const renderId = `cybervinci-mermaid-${Date.now()}-${this.renderSequence++}`;
        target.classList.add('cybervinci-mermaid-rendering');
        try {
            const mermaidModule = await import('mermaid');
            const mermaid = mermaidModule.default;
            mermaid.initialize({
                startOnLoad: false,
                securityLevel: 'strict',
                theme: this.getMermaidTheme(),
                htmlLabels: false,
                flowchart: {
                    htmlLabels: false
                }
            });
            const result = await mermaid.render(renderId, source);
            target.classList.remove('cybervinci-mermaid-rendering', 'cybervinci-mermaid-error');
            target.innerHTML = DOMPurify.sanitize(result.svg);
            result.bindFunctions?.(target);
        } catch (error) {
            this.renderMermaidError(target, source, error);
        }
    }

    protected getMermaidTheme(): 'default' | 'dark' {
        const body = document.body;
        return body.classList.contains('theia-dark') || body.classList.contains('hc-black')
            ? 'dark'
            : 'default';
    }

    protected renderMermaidError(target: HTMLElement, source: string, error: unknown): void {
        target.classList.remove('cybervinci-mermaid-rendering');
        target.classList.add('cybervinci-mermaid-error');
        const label = document.createElement('div');
        label.classList.add('cybervinci-mermaid-error-label');
        label.textContent = 'Mermaid render failed.';
        if (error instanceof Error) {
            label.title = error.message;
        }
        const code = document.createElement('pre');
        code.classList.add('hljs');
        const codeContent = document.createElement('code');
        codeContent.textContent = source;
        code.appendChild(codeContent);
        target.replaceChildren(label, code);
    }
}

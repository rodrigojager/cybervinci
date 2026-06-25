"use strict";
// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************
var CyberVinciMarkdownMermaidPreviewHandler_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CyberVinciMarkdownMermaidPreviewHandler = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const DOMPurify = require("@theia/core/shared/dompurify");
const markdown_1 = require("@theia/preview/lib/browser/markdown");
let CyberVinciMarkdownMermaidPreviewHandler = class CyberVinciMarkdownMermaidPreviewHandler extends markdown_1.MarkdownPreviewHandler {
    constructor() {
        super(...arguments);
        this.fenceRendererInstalled = false;
        this.renderSequence = 0;
    }
    static { CyberVinciMarkdownMermaidPreviewHandler_1 = this; }
    static { this.PRIORITY = 650; }
    canHandle(uri) {
        return super.canHandle(uri) > 0 ? CyberVinciMarkdownMermaidPreviewHandler_1.PRIORITY : 0;
    }
    renderContent(params) {
        const contentElement = super.renderContent(params);
        contentElement.classList.add('cybervinci-markdown-mermaid-enabled');
        this.renderMermaidBlocks(contentElement);
        return contentElement;
    }
    getEngine() {
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
    renderMermaidBlocks(contentElement) {
        const sourceBlocks = Array.from(contentElement.querySelectorAll('pre.cybervinci-mermaid-source'));
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
    async renderMermaidBlock(target, source) {
        const renderId = `cybervinci-mermaid-${Date.now()}-${this.renderSequence++}`;
        target.classList.add('cybervinci-mermaid-rendering');
        try {
            const mermaidModule = await Promise.resolve().then(() => require('mermaid'));
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
        }
        catch (error) {
            this.renderMermaidError(target, source, error);
        }
    }
    getMermaidTheme() {
        const body = document.body;
        return body.classList.contains('theia-dark') || body.classList.contains('hc-black')
            ? 'dark'
            : 'default';
    }
    renderMermaidError(target, source, error) {
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
};
exports.CyberVinciMarkdownMermaidPreviewHandler = CyberVinciMarkdownMermaidPreviewHandler;
exports.CyberVinciMarkdownMermaidPreviewHandler = CyberVinciMarkdownMermaidPreviewHandler = CyberVinciMarkdownMermaidPreviewHandler_1 = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], CyberVinciMarkdownMermaidPreviewHandler);
//# sourceMappingURL=cybervinci-markdown-mermaid-preview-handler.js.map
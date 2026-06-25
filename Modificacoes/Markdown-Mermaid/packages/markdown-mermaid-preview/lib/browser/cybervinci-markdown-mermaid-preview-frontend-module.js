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
Object.defineProperty(exports, "__esModule", { value: true });
const inversify_1 = require("@theia/core/shared/inversify");
const preview_handler_1 = require("@theia/preview/lib/browser/preview-handler");
const cybervinci_markdown_mermaid_preview_handler_1 = require("./cybervinci-markdown-mermaid-preview-handler");
require("../../src/browser/style/markdown-mermaid-preview.css");
exports.default = new inversify_1.ContainerModule(bind => {
    bind(cybervinci_markdown_mermaid_preview_handler_1.CyberVinciMarkdownMermaidPreviewHandler).toSelf().inSingletonScope();
    bind(preview_handler_1.PreviewHandler).toService(cybervinci_markdown_mermaid_preview_handler_1.CyberVinciMarkdownMermaidPreviewHandler);
});
//# sourceMappingURL=cybervinci-markdown-mermaid-preview-frontend-module.js.map
// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { ContainerModule } from '@theia/core/shared/inversify';
import { PreviewHandler } from '@theia/preview/lib/browser/preview-handler';
import { CyberVinciMarkdownMermaidPreviewHandler } from './cybervinci-markdown-mermaid-preview-handler';

import '../../src/browser/style/markdown-mermaid-preview.css';

export default new ContainerModule(bind => {
    bind(CyberVinciMarkdownMermaidPreviewHandler).toSelf().inSingletonScope();
    bind(PreviewHandler).toService(CyberVinciMarkdownMermaidPreviewHandler);
});

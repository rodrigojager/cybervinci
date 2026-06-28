// *****************************************************************************
// Copyright (C) 2026.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { ContainerModule } from '@theia/core/shared/inversify';
import { MemoryLanguageAnalyzerContribution } from '@cybervinci/memory/lib/node/memory-language-analyzer';
import { CSharpRoslynSidecarAnalyzer } from './csharp-roslyn-sidecar-analyzer';

export default new ContainerModule(bind => {
    bind(CSharpRoslynSidecarAnalyzer).toSelf().inSingletonScope();
    bind(MemoryLanguageAnalyzerContribution).toService(CSharpRoslynSidecarAnalyzer);
});

// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { ConnectionHandler, RpcConnectionHandler, bindContributionProvider } from '@theia/core';
import { BackendApplicationContribution } from '@theia/core/lib/node';
import { ContainerModule } from '@theia/core/shared/inversify';
import { CODEX_CLI_SERVICE_PATH, CodexProviderClient, CodexProviderService } from '../common/ai-providers-service';
import { CodexProviderSpawnEnvironmentContribution } from './ai-providers-spawn-environment';
import { CodexProviderServiceImpl } from './ai-providers-service-impl';

export default new ContainerModule(bind => {
    bindContributionProvider(bind, CodexProviderSpawnEnvironmentContribution);
    bind(CodexProviderServiceImpl).toSelf().inSingletonScope();
    bind(CodexProviderService).toService(CodexProviderServiceImpl);
    bind(BackendApplicationContribution).toService(CodexProviderServiceImpl);

    bind(ConnectionHandler).toDynamicValue(ctx =>
        new RpcConnectionHandler<CodexProviderClient>(CODEX_CLI_SERVICE_PATH, client => {
            const server = ctx.container.get<CodexProviderServiceImpl>(CodexProviderService);
            server.setClient(client);
            return server;
        })
    ).inSingletonScope();
});

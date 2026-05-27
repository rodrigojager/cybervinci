// *****************************************************************************
// Copyright (C) 2026 TypeFox GmbH.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { ConnectionHandler, PreferenceContribution, RpcConnectionHandler } from '@theia/core';
import { ConnectionContainerModule } from '@theia/core/lib/node/messaging/connection-container-module';
import { ContainerModule } from '@theia/core/shared/inversify';
import { MCPBackendContribution } from '@theia/ai-mcp-server/lib/node/mcp-theia-server';
import { LibraryPreferenceSchema } from '../common/library-preferences';
import { LibraryService, LibraryServicePath } from '../common/library-service';
import { LibraryMcpContribution } from './library-mcp-contribution';
import { LibraryServiceImpl } from './library-service-impl';

const libraryConnectionModule = ConnectionContainerModule.create(({ bind }) => {
    bind(LibraryServiceImpl).toSelf().inSingletonScope();
    bind(LibraryService).toService(LibraryServiceImpl);
    bind(ConnectionHandler).toDynamicValue(ctx =>
        new RpcConnectionHandler(LibraryServicePath, () => ctx.container.get<LibraryService>(LibraryService))
    ).inSingletonScope();
});

export default new ContainerModule(bind => {
    bind(PreferenceContribution).toConstantValue({ schema: LibraryPreferenceSchema });
    bind(LibraryServiceImpl).toSelf().inSingletonScope();
    bind(LibraryService).toService(LibraryServiceImpl);
    bind(LibraryMcpContribution).toSelf().inSingletonScope();
    bind(MCPBackendContribution).toService(LibraryMcpContribution);
    bind(ConnectionContainerModule).toConstantValue(libraryConnectionModule);
});

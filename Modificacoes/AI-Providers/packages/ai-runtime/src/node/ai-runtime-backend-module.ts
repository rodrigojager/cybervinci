// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { ConnectionHandler, RpcConnectionHandler } from '@theia/core';
import { ContainerModule } from '@theia/core/shared/inversify';
import {
    CYBERVINCI_AI_RUNTIME_SERVICE_PATH,
    CyberVinciAiRuntimeClient,
    CyberVinciAiRuntimeService
} from '../common';
import { CyberVinciAiContextBroker } from './ai-context-broker';
import { CyberVinciAiRuntimeServiceImpl } from './ai-runtime-service';

export default new ContainerModule(bind => {
    bind(CyberVinciAiContextBroker).toSelf().inSingletonScope();
    bind(CyberVinciAiRuntimeServiceImpl).toSelf().inSingletonScope();
    bind(CyberVinciAiRuntimeService).toService(CyberVinciAiRuntimeServiceImpl);
    bind(ConnectionHandler).toDynamicValue(ctx =>
        new RpcConnectionHandler<CyberVinciAiRuntimeClient>(CYBERVINCI_AI_RUNTIME_SERVICE_PATH, client => {
            const server = ctx.container.get<CyberVinciAiRuntimeService>(CyberVinciAiRuntimeService);
            server.setClient(client);
            return server;
        })
    ).inSingletonScope();
});

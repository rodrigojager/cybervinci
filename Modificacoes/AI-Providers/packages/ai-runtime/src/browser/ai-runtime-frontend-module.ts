// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { RemoteConnectionProvider, ServiceConnectionProvider } from '@theia/core/lib/browser';
import { ContainerModule } from '@theia/core/shared/inversify';
import {
    CYBERVINCI_AI_RUNTIME_SERVICE_PATH,
    CyberVinciAiRuntimeClient,
    CyberVinciAiRuntimeService
} from '../common';
import { CyberVinciAiRuntimeFrontendService } from './ai-runtime-frontend-service';
import '../../src/browser/style/cybervinci-ai-runtime.css';

export default new ContainerModule(bind => {
    bind(CyberVinciAiRuntimeClient).toConstantValue({});
    bind(CyberVinciAiRuntimeFrontendService).toSelf().inSingletonScope();
    bind(CyberVinciAiRuntimeService).toDynamicValue(ctx => {
        const connection = ctx.container.get<ServiceConnectionProvider>(RemoteConnectionProvider);
        const client = ctx.container.get<CyberVinciAiRuntimeClient>(CyberVinciAiRuntimeClient);
        return connection.createProxy<CyberVinciAiRuntimeService>(CYBERVINCI_AI_RUNTIME_SERVICE_PATH, client);
    }).inSingletonScope();
});

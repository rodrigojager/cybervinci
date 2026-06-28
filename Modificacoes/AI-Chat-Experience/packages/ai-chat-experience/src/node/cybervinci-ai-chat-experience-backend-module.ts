// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { ConnectionHandler, RpcConnectionHandler } from '@theia/core/lib/common/messaging';
import { ContainerModule } from '@theia/core/shared/inversify';
import { FlowPlaybookRunner } from '@cybervinci/flow/lib/node/flow-playbook-runner';
import {
    CYBERVINCI_AI_CHAT_EXPERIENCE_SERVICE_PATH,
    CyberVinciAiChatExperienceClient,
    CyberVinciAiChatExperienceService
} from '../common';
import { CyberVinciAgencyAgentService } from './cybervinci-agency-agent-service';
import { CyberVinciFlowPlaybookRunner } from './cybervinci-flow-playbook-runner';

export default new ContainerModule((bind, _unbind, isBound) => {
    bind(CyberVinciAgencyAgentService).toSelf().inSingletonScope();
    bind(CyberVinciFlowPlaybookRunner).toSelf().inSingletonScope();
    if (!isBound(FlowPlaybookRunner)) {
        bind(FlowPlaybookRunner).toService(CyberVinciFlowPlaybookRunner);
    }
    bind(CyberVinciAiChatExperienceService).toService(CyberVinciAgencyAgentService);
    bind(ConnectionHandler).toDynamicValue(ctx =>
        new RpcConnectionHandler<CyberVinciAiChatExperienceClient>(CYBERVINCI_AI_CHAT_EXPERIENCE_SERVICE_PATH, client => {
            const service = ctx.container.get<CyberVinciAgencyAgentService>(CyberVinciAgencyAgentService);
            service.setClient(client);
            return service;
        })
    ).inSingletonScope();
});

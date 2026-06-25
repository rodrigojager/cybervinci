"use strict";
// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************
Object.defineProperty(exports, "__esModule", { value: true });
var messaging_1 = require("@theia/core/lib/common/messaging");
var inversify_1 = require("@theia/core/shared/inversify");
var flow_playbook_runner_1 = require("@cybervinci/flow/lib/node/flow-playbook-runner");
var common_1 = require("../common");
var cybervinci_agency_agent_service_1 = require("./cybervinci-agency-agent-service");
var cybervinci_flow_playbook_runner_1 = require("./cybervinci-flow-playbook-runner");
exports.default = new inversify_1.ContainerModule(function (bind, _unbind, isBound) {
    bind(cybervinci_agency_agent_service_1.CyberVinciAgencyAgentService).toSelf().inSingletonScope();
    bind(cybervinci_flow_playbook_runner_1.CyberVinciFlowPlaybookRunner).toSelf().inSingletonScope();
    if (!isBound(flow_playbook_runner_1.FlowPlaybookRunner)) {
        bind(flow_playbook_runner_1.FlowPlaybookRunner).toService(cybervinci_flow_playbook_runner_1.CyberVinciFlowPlaybookRunner);
    }
    bind(common_1.CyberVinciAiChatExperienceService).toService(cybervinci_agency_agent_service_1.CyberVinciAgencyAgentService);
    bind(messaging_1.ConnectionHandler).toDynamicValue(function (ctx) {
        return new messaging_1.RpcConnectionHandler(common_1.CYBERVINCI_AI_CHAT_EXPERIENCE_SERVICE_PATH, function (client) {
            var service = ctx.container.get(cybervinci_agency_agent_service_1.CyberVinciAgencyAgentService);
            service.setClient(client);
            return service;
        });
    }).inSingletonScope();
});

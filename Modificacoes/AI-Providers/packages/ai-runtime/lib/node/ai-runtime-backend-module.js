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
const core_1 = require("@theia/core");
const inversify_1 = require("@theia/core/shared/inversify");
const common_1 = require("../common");
const ai_context_broker_1 = require("./ai-context-broker");
const ai_runtime_service_1 = require("./ai-runtime-service");
exports.default = new inversify_1.ContainerModule(bind => {
    bind(ai_context_broker_1.CyberVinciAiContextBroker).toSelf().inSingletonScope();
    bind(ai_runtime_service_1.CyberVinciAiRuntimeServiceImpl).toSelf().inSingletonScope();
    bind(common_1.CyberVinciAiRuntimeService).toService(ai_runtime_service_1.CyberVinciAiRuntimeServiceImpl);
    bind(core_1.ConnectionHandler).toDynamicValue(ctx => new core_1.RpcConnectionHandler(common_1.CYBERVINCI_AI_RUNTIME_SERVICE_PATH, client => {
        const server = ctx.container.get(common_1.CyberVinciAiRuntimeService);
        server.setClient(client);
        return server;
    })).inSingletonScope();
});
//# sourceMappingURL=ai-runtime-backend-module.js.map
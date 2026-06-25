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
const browser_1 = require("@theia/core/lib/browser");
const inversify_1 = require("@theia/core/shared/inversify");
const common_1 = require("../common");
const ai_runtime_frontend_service_1 = require("./ai-runtime-frontend-service");
require("../../src/browser/style/cybervinci-ai-runtime.css");
exports.default = new inversify_1.ContainerModule(bind => {
    bind(common_1.CyberVinciAiRuntimeClient).toConstantValue({});
    bind(ai_runtime_frontend_service_1.CyberVinciAiRuntimeBackendService).toDynamicValue(ctx => {
        const connection = ctx.container.get(browser_1.RemoteConnectionProvider);
        const client = ctx.container.get(common_1.CyberVinciAiRuntimeClient);
        return connection.createProxy(common_1.CYBERVINCI_AI_RUNTIME_SERVICE_PATH, client);
    }).inSingletonScope();
    bind(ai_runtime_frontend_service_1.CyberVinciAiRuntimeFrontendService).toSelf().inSingletonScope();
    bind(common_1.CyberVinciAiRuntimeService).toService(ai_runtime_frontend_service_1.CyberVinciAiRuntimeFrontendService);
});
//# sourceMappingURL=ai-runtime-frontend-module.js.map
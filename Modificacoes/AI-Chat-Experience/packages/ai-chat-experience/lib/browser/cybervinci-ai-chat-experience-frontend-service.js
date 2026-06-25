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
exports.createCyberVinciAiChatExperienceService = createCyberVinciAiChatExperienceService;
var browser_1 = require("@theia/core/lib/browser");
var common_1 = require("../common");
function createCyberVinciAiChatExperienceService(container, client) {
    var provider = container.get(browser_1.RemoteConnectionProvider);
    return provider.createProxy(common_1.CYBERVINCI_AI_CHAT_EXPERIENCE_SERVICE_PATH, client);
}

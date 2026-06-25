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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CyberVinciAiChatExperienceService = exports.CYBERVINCI_AI_CHAT_EXPERIENCE_SERVICE_PATH = void 0;
__exportStar(require("./cybervinci-agent-definition"), exports);
__exportStar(require("./cybervinci-tool-definition"), exports);
__exportStar(require("./cybervinci-playbook-definition"), exports);
__exportStar(require("./cybervinci-agent-catalog-protocol"), exports);
exports.CYBERVINCI_AI_CHAT_EXPERIENCE_SERVICE_PATH = '/services/cybervinci-ai-chat-experience';
exports.CyberVinciAiChatExperienceService = Symbol('CyberVinciAiChatExperienceService');

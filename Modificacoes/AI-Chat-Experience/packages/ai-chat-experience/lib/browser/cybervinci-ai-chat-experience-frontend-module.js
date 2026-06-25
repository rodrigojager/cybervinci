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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var chat_input_widget_1 = require("@theia/ai-chat-ui/lib/browser/chat-input-widget");
var core_1 = require("@theia/core");
var browser_1 = require("@theia/core/lib/browser");
var preferences_1 = require("@theia/core/lib/common/preferences");
var inversify_1 = require("@theia/core/shared/inversify");
var common_1 = require("../common");
var cybervinci_chat_input_options_contribution_1 = require("./cybervinci-chat-input-options-contribution");
var cybervinci_ai_chat_input_widget_1 = require("./cybervinci-ai-chat-input-widget");
var cybervinci_declarative_chat_agent_contribution_1 = require("./cybervinci-declarative-chat-agent-contribution");
var cybervinci_declarative_chat_agent_1 = require("./cybervinci-declarative-chat-agent");
var cybervinci_playbook_runtime_1 = require("./cybervinci-playbook-runtime");
var cybervinci_tool_registry_1 = require("./cybervinci-tool-registry");
var cybervinci_ai_chat_experience_frontend_service_1 = require("./cybervinci-ai-chat-experience-frontend-service");
var cybervinci_ai_chat_experience_preferences_1 = require("./cybervinci-ai-chat-experience-preferences");
require("../../src/browser/style/cybervinci-ai-chat-experience.css");
exports.default = new inversify_1.ContainerModule(function (bind, _unbind, isBound, rebind) {
    bind(common_1.CyberVinciAiChatExperienceService).toDynamicValue(function (ctx) {
        var client = {
            runPlaybookFromFlow: function (request) { return __awaiter(void 0, void 0, void 0, function () {
                var runtime, result;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            if (request.playbookId === common_1.CYBERVINCI_FRONTEND_BRIDGE_SMOKE_PLAYBOOK_ID) {
                                return [2 /*return*/, {
                                        ok: true,
                                        message: 'CyberVinci frontend bridge smoke completed.',
                                        value: {
                                            marker: request.input.marker,
                                            playbookId: request.playbookId,
                                            prompt: request.prompt
                                        },
                                        diagnostics: [],
                                        issues: [],
                                        signals: {
                                            'cybervinci.playbook.id': request.playbookId,
                                            'cybervinci.playbook.frontend': true,
                                            'cybervinci.playbook.frontendSmoke': true
                                        }
                                    }];
                            }
                            runtime = ctx.container.get(cybervinci_playbook_runtime_1.CyberVinciPlaybookRuntime);
                            return [4 /*yield*/, runtime.runPlaybookById(request.playbookId, request.prompt, request.input)];
                        case 1:
                            result = _b.sent();
                            return [2 /*return*/, {
                                    ok: result.ok,
                                    stop: result.stop,
                                    message: result.message,
                                    value: result.value,
                                    diagnostics: result.diagnostics,
                                    issues: ((_a = result.diagnostics) !== null && _a !== void 0 ? _a : []).map(function (summary) { return ({
                                        severity: 'blocking',
                                        type: 'playbook.frontend',
                                        summary: summary,
                                        producer: 'cybervinci-ai-chat-experience-client'
                                    }); }),
                                    signals: {
                                        'cybervinci.playbook.id': request.playbookId,
                                        'cybervinci.playbook.frontend': true
                                    }
                                }];
                    }
                });
            }); }
        };
        var service = (0, cybervinci_ai_chat_experience_frontend_service_1.createCyberVinciAiChatExperienceService)(ctx.container, client);
        if (typeof window !== 'undefined') {
            window.__cyberVinciAiChatExperienceDiagnostics = {
                getRuntimeDiagnostics: function () { return service.getRuntimeDiagnostics(); },
                runFrontendBridgeSmoke: function () { return service.runFrontendBridgeSmoke(); },
                runRunInspectorObservabilitySmoke: function () { return ctx.container.get(cybervinci_declarative_chat_agent_contribution_1.CyberVinciDeclarativeChatAgentContribution).runRunInspectorObservabilitySmoke(); },
                startPlaybookPersistenceReloadSmoke: function () { return ctx.container.get(cybervinci_declarative_chat_agent_contribution_1.CyberVinciDeclarativeChatAgentContribution).startPlaybookPersistenceReloadSmoke(); },
                finishPlaybookPersistenceReloadSmoke: function (requestId) { return ctx.container.get(cybervinci_declarative_chat_agent_contribution_1.CyberVinciDeclarativeChatAgentContribution).finishPlaybookPersistenceReloadSmoke(requestId); },
                runCatalogManagerEditingSmoke: function () { return ctx.container.get(cybervinci_declarative_chat_agent_contribution_1.CyberVinciDeclarativeChatAgentContribution).runCatalogManagerEditingSmoke(); },
                runCanvasDesignQaRealEditorSmoke: function (options) { return ctx.container.get(cybervinci_declarative_chat_agent_contribution_1.CyberVinciDeclarativeChatAgentContribution).runCanvasDesignQaRealEditorSmoke(options); }
            };
        }
        return service;
    }).inSingletonScope();
    bind(preferences_1.PreferenceContribution).toConstantValue(cybervinci_ai_chat_experience_preferences_1.cyberVinciAiChatExperiencePreferenceContribution);
    bind(cybervinci_chat_input_options_contribution_1.CyberVinciChatInputOptionsContribution).toSelf().inSingletonScope();
    bind(chat_input_widget_1.AIChatInputOptionsContribution).toService(cybervinci_chat_input_options_contribution_1.CyberVinciChatInputOptionsContribution);
    bind(cybervinci_declarative_chat_agent_1.CyberVinciDeclarativePromptChatAgent).toSelf();
    bind(cybervinci_declarative_chat_agent_contribution_1.CyberVinciDeclarativePromptChatAgentFactory).toFactory(function (ctx) { return function () {
        return ctx.container.get(cybervinci_declarative_chat_agent_1.CyberVinciDeclarativePromptChatAgent);
    }; });
    bind(cybervinci_declarative_chat_agent_contribution_1.CyberVinciDeclarativeChatAgentContribution).toSelf().inSingletonScope();
    bind(browser_1.FrontendApplicationContribution).toService(cybervinci_declarative_chat_agent_contribution_1.CyberVinciDeclarativeChatAgentContribution);
    bind(core_1.CommandContribution).toService(cybervinci_declarative_chat_agent_contribution_1.CyberVinciDeclarativeChatAgentContribution);
    bind(cybervinci_tool_registry_1.CyberVinciToolRegistry).toSelf().inSingletonScope();
    bind(cybervinci_playbook_runtime_1.CyberVinciPlaybookRuntime).toSelf().inSingletonScope();
    bind(cybervinci_ai_chat_input_widget_1.CyberVinciAIChatInputWidget).toSelf();
    if (isBound(chat_input_widget_1.AIChatInputWidget)) {
        rebind(chat_input_widget_1.AIChatInputWidget).to(cybervinci_ai_chat_input_widget_1.CyberVinciAIChatInputWidget);
    }
    else {
        bind(chat_input_widget_1.AIChatInputWidget).to(cybervinci_ai_chat_input_widget_1.CyberVinciAIChatInputWidget);
    }
});

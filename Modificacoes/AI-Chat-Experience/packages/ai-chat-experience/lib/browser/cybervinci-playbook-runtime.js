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
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
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
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CyberVinciPlaybookRuntime = exports.CYBERVINCI_PLAYBOOK_RUN_HISTORY_STORAGE_KEY = exports.CYBERVINCI_NATIVE_AGENT_PLAYBOOK_PREFIX = exports.CYBERVINCI_NATIVE_AGENT_DELEGATE_PLAYBOOK_ID = exports.CYBERVINCI_AI_CHAT_FLOW_ROUTE_PLAYBOOK_ID = exports.CYBERVINCI_DIRECT_CHAT_PLAYBOOK_ID = void 0;
var core_1 = require("@theia/core");
var ai_runtime_frontend_service_1 = require("@cybervinci/ai-runtime/lib/browser/ai-runtime-frontend-service");
var ai_providers_preferences_1 = require("@cybervinci/ai-providers/lib/common/ai-providers-preferences");
var chat_model_1 = require("@theia/ai-chat/lib/common/chat-model");
var preferences_1 = require("@theia/core/lib/common/preferences");
var quick_pick_service_1 = require("@theia/core/lib/common/quick-pick-service");
var inversify_1 = require("@theia/core/shared/inversify");
var common_1 = require("../common");
var cybervinci_ai_chat_experience_preferences_1 = require("./cybervinci-ai-chat-experience-preferences");
var cybervinci_tool_registry_1 = require("./cybervinci-tool-registry");
exports.CYBERVINCI_DIRECT_CHAT_PLAYBOOK_ID = 'direct-chat';
exports.CYBERVINCI_AI_CHAT_FLOW_ROUTE_PLAYBOOK_ID = 'ai-chat-flow-route';
exports.CYBERVINCI_NATIVE_AGENT_DELEGATE_PLAYBOOK_ID = 'native-agent-delegate';
exports.CYBERVINCI_NATIVE_AGENT_PLAYBOOK_PREFIX = 'native-agent.';
var MAX_PLAYBOOK_STEPS = 64;
var MAX_RUN_HISTORY = 100;
exports.CYBERVINCI_PLAYBOOK_RUN_HISTORY_STORAGE_KEY = 'cybervinci.aiChat.playbookRunHistory.v1';
var CyberVinciPlaybookRuntime = function () {
    var _classDecorators = [(0, inversify_1.injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _service_decorators;
    var _service_initializers = [];
    var _service_extraInitializers = [];
    var _toolRegistry_decorators;
    var _toolRegistry_initializers = [];
    var _toolRegistry_extraInitializers = [];
    var _preferenceService_decorators;
    var _preferenceService_initializers = [];
    var _preferenceService_extraInitializers = [];
    var _messageService_decorators;
    var _messageService_initializers = [];
    var _messageService_extraInitializers = [];
    var _logger_decorators;
    var _logger_initializers = [];
    var _logger_extraInitializers = [];
    var _quickPickService_decorators;
    var _quickPickService_initializers = [];
    var _quickPickService_extraInitializers = [];
    var _aiRuntime_decorators;
    var _aiRuntime_initializers = [];
    var _aiRuntime_extraInitializers = [];
    var _init_decorators;
    var CyberVinciPlaybookRuntime = _classThis = /** @class */ (function () {
        function CyberVinciPlaybookRuntime_1() {
            this.service = (__runInitializers(this, _instanceExtraInitializers), __runInitializers(this, _service_initializers, void 0));
            this.toolRegistry = (__runInitializers(this, _service_extraInitializers), __runInitializers(this, _toolRegistry_initializers, void 0));
            this.preferenceService = (__runInitializers(this, _toolRegistry_extraInitializers), __runInitializers(this, _preferenceService_initializers, void 0));
            this.messageService = (__runInitializers(this, _preferenceService_extraInitializers), __runInitializers(this, _messageService_initializers, void 0));
            this.logger = (__runInitializers(this, _messageService_extraInitializers), __runInitializers(this, _logger_initializers, void 0));
            this.quickPickService = (__runInitializers(this, _logger_extraInitializers), __runInitializers(this, _quickPickService_initializers, void 0));
            this.aiRuntime = (__runInitializers(this, _quickPickService_extraInitializers), __runInitializers(this, _aiRuntime_initializers, void 0));
            this.runHistory = (__runInitializers(this, _aiRuntime_extraInitializers), []);
        }
        CyberVinciPlaybookRuntime_1.prototype.init = function () {
            var _this = this;
            this.loadRunHistory();
            this.toolRegistry.setPlaybookRunner(function (playbookId, context) { return _this.runPlaybookAsTool(playbookId, context); });
            this.toolRegistry.setPlaybookResumer(function (requestId, context) { return _this.resumeRunAsTool(requestId, context); });
        };
        CyberVinciPlaybookRuntime_1.prototype.withCurrentExecutionInput = function (overrides) {
            if (overrides === void 0) { overrides = {}; }
            var execution = this.currentExecutionSelection(overrides);
            return {
                execution: execution,
                providerId: this.firstString(overrides.providerId, overrides.provider, execution.providerId),
                model: this.firstString(overrides.model, execution.model),
                runtime: this.firstString(overrides.runtime, execution.runtime),
                modelProvider: this.firstString(overrides.modelProvider, execution.modelProvider),
                reasoningEffort: this.firstString(overrides.reasoningEffort, execution.reasoningEffort),
                reasoningVariant: this.firstString(overrides.reasoningVariant, execution.reasoningVariant),
                serviceTier: this.firstString(overrides.serviceTier, execution.serviceTier)
            };
        };
        CyberVinciPlaybookRuntime_1.prototype.currentExecutionSelection = function (overrides) {
            var _a, _b;
            if (overrides === void 0) { overrides = {}; }
            var configured = this.executionSelectionFromPreferences();
            var explicit = this.asExecutionSelection(overrides.execution);
            var accessPolicy = this.currentExecutionAccessPolicy();
            var runtime = this.firstString(overrides.runtime, explicit === null || explicit === void 0 ? void 0 : explicit.runtime, configured.runtime);
            var modelProvider = this.firstString(overrides.modelProvider, explicit === null || explicit === void 0 ? void 0 : explicit.modelProvider, configured.modelProvider);
            var providerId = this.firstString(overrides.providerId, overrides.provider, explicit === null || explicit === void 0 ? void 0 : explicit.providerId, configured.providerId, runtime && modelProvider ? "".concat(runtime, ":").concat(modelProvider) : undefined);
            return __assign(__assign(__assign({}, configured), explicit), { providerId: providerId, runtime: runtime, modelProvider: modelProvider, model: this.firstString(overrides.model, explicit === null || explicit === void 0 ? void 0 : explicit.model, configured.model), reasoningEffort: this.firstString(overrides.reasoningEffort, explicit === null || explicit === void 0 ? void 0 : explicit.reasoningEffort, configured.reasoningEffort), reasoningVariant: this.firstString(overrides.reasoningVariant, explicit === null || explicit === void 0 ? void 0 : explicit.reasoningVariant, configured.reasoningVariant), reasoningVariantOptions: this.firstRecord(overrides.reasoningVariantOptions, explicit === null || explicit === void 0 ? void 0 : explicit.reasoningVariantOptions, configured.reasoningVariantOptions), serviceTier: this.firstString(overrides.serviceTier, explicit === null || explicit === void 0 ? void 0 : explicit.serviceTier, configured.serviceTier), reasoningPolicy: (_b = (_a = explicit === null || explicit === void 0 ? void 0 : explicit.reasoningPolicy) !== null && _a !== void 0 ? _a : configured.reasoningPolicy) !== null && _b !== void 0 ? _b : 'auto', approvalPolicy: this.firstString(overrides.approvalPolicy, explicit === null || explicit === void 0 ? void 0 : explicit.approvalPolicy, configured.approvalPolicy, accessPolicy.approvalPolicy), sandboxMode: this.firstString(overrides.sandboxMode, explicit === null || explicit === void 0 ? void 0 : explicit.sandboxMode, configured.sandboxMode, accessPolicy.sandboxMode), collaborationMode: this.firstString(overrides.collaborationMode, explicit === null || explicit === void 0 ? void 0 : explicit.collaborationMode, configured.collaborationMode, accessPolicy.collaborationMode) });
        };
        CyberVinciPlaybookRuntime_1.prototype.executionSelectionFromPreferences = function () {
            var _a;
            var runtime = this.preferenceService.get(ai_providers_preferences_1.CODEX_CLI_RUNTIME_PREF, 'codex-app-server');
            var modelProvider = this.preferenceService.get(ai_providers_preferences_1.CODEX_CLI_MODEL_PROVIDER_PREF, 'codex');
            var accessPolicy = this.currentExecutionAccessPolicy();
            return {
                providerId: runtime && modelProvider ? "".concat(runtime, ":").concat(modelProvider) : undefined,
                runtime: runtime,
                modelProvider: modelProvider,
                model: this.preferenceService.get(ai_providers_preferences_1.CODEX_CLI_MODEL_PREF, undefined),
                reasoningEffort: this.preferenceService.get(ai_providers_preferences_1.CODEX_CLI_REASONING_EFFORT_PREF, undefined),
                reasoningVariant: (_a = this.preferenceService.get(ai_providers_preferences_1.CODEX_CLI_REASONING_VARIANT_PREF, undefined)) !== null && _a !== void 0 ? _a : 'default',
                reasoningVariantOptions: this.preferenceService.get(ai_providers_preferences_1.CODEX_CLI_REASONING_VARIANT_OPTIONS_PREF, undefined),
                serviceTier: this.preferenceService.get(ai_providers_preferences_1.CODEX_CLI_SERVICE_TIER_PREF, undefined),
                executablePath: this.preferenceService.get(ai_providers_preferences_1.CODEX_CLI_EXECUTABLE_PATH_PREF, undefined),
                profile: this.preferenceService.get(ai_providers_preferences_1.CODEX_CLI_PROFILE_PREF, undefined),
                openRouterApiKey: this.preferenceService.get(ai_providers_preferences_1.CODEX_CLI_OPENROUTER_API_KEY_PREF, undefined),
                openCodeApiKey: this.preferenceService.get(ai_providers_preferences_1.CODEX_CLI_OPENCODE_API_KEY_PREF, undefined),
                openCodeExecutablePath: this.preferenceService.get(ai_providers_preferences_1.CODEX_CLI_OPENCODE_EXECUTABLE_PATH_PREF, undefined),
                openCodeAgent: this.preferenceService.get(ai_providers_preferences_1.CODEX_CLI_OPENCODE_AGENT_PREF, undefined),
                openCodeVariant: this.preferenceService.get(ai_providers_preferences_1.CODEX_CLI_OPENCODE_VARIANT_PREF, undefined),
                geminiExecutablePath: this.preferenceService.get(ai_providers_preferences_1.CODEX_CLI_GEMINI_EXECUTABLE_PATH_PREF, undefined),
                claudeExecutablePath: this.preferenceService.get(ai_providers_preferences_1.CODEX_CLI_CLAUDE_EXECUTABLE_PATH_PREF, undefined),
                claudeAgent: this.preferenceService.get(ai_providers_preferences_1.CODEX_CLI_CLAUDE_AGENT_PREF, undefined),
                cursorExecutablePath: this.preferenceService.get(ai_providers_preferences_1.CODEX_CLI_CURSOR_EXECUTABLE_PATH_PREF, undefined),
                cursorMode: this.preferenceService.get(ai_providers_preferences_1.CODEX_CLI_CURSOR_MODE_PREF, undefined),
                reasoningPolicy: 'auto',
                approvalPolicy: accessPolicy.approvalPolicy,
                sandboxMode: accessPolicy.sandboxMode,
                collaborationMode: accessPolicy.collaborationMode
            };
        };
        CyberVinciPlaybookRuntime_1.prototype.currentChatMode = function () {
            var value = this.preferenceService.get(cybervinci_ai_chat_experience_preferences_1.CYBERVINCI_AI_CHAT_MODE_PREF, 'chat');
            return typeof value === 'string' && value.trim() ? value.trim().toLocaleLowerCase() : 'chat';
        };
        CyberVinciPlaybookRuntime_1.prototype.currentExecutionAccessPolicy = function () {
            switch (this.currentChatMode()) {
                case 'fullaccess':
                    return {
                        approvalPolicy: 'never',
                        sandboxMode: 'danger-full-access',
                        collaborationMode: 'default'
                    };
                case 'workspace':
                case 'edit':
                    return {
                        approvalPolicy: 'on-request',
                        sandboxMode: 'workspace-write',
                        collaborationMode: 'default'
                    };
                case 'plan':
                    return {
                        approvalPolicy: 'never',
                        sandboxMode: 'read-only',
                        collaborationMode: 'plan'
                    };
                case 'readonly':
                case 'agent-next':
                case 'chat':
                default:
                    return {
                        approvalPolicy: 'never',
                        sandboxMode: 'read-only',
                        collaborationMode: 'default'
                    };
            }
        };
        CyberVinciPlaybookRuntime_1.prototype.currentChatEffectPolicy = function () {
            switch (this.currentChatMode()) {
                case 'fullaccess':
                    return {
                        previewOnly: false,
                        workspaceWrites: 'allowed',
                        shellExecution: 'allowed',
                        requireUserConfirmation: false
                    };
                case 'workspace':
                case 'edit':
                    return {
                        previewOnly: false,
                        workspaceWrites: 'allowed',
                        shellExecution: 'allow-with-approval',
                        requireUserConfirmation: false
                    };
                case 'plan':
                case 'readonly':
                case 'agent-next':
                case 'chat':
                default:
                    return {
                        previewOnly: true,
                        workspaceWrites: 'forbidden',
                        shellExecution: 'forbidden',
                        requireUserConfirmation: false
                    };
            }
        };
        CyberVinciPlaybookRuntime_1.prototype.asExecutionSelection = function (value) {
            return value && typeof value === 'object' && !Array.isArray(value)
                ? value
                : undefined;
        };
        CyberVinciPlaybookRuntime_1.prototype.firstString = function () {
            var values = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                values[_i] = arguments[_i];
            }
            for (var _a = 0, values_1 = values; _a < values_1.length; _a++) {
                var value = values_1[_a];
                if (typeof value === 'string' && value.trim()) {
                    return value.trim();
                }
            }
            return undefined;
        };
        CyberVinciPlaybookRuntime_1.prototype.firstRecord = function () {
            var values = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                values[_i] = arguments[_i];
            }
            for (var _a = 0, values_2 = values; _a < values_2.length; _a++) {
                var value = values_2[_a];
                if (value && typeof value === 'object' && !Array.isArray(value)) {
                    return value;
                }
            }
            return undefined;
        };
        CyberVinciPlaybookRuntime_1.prototype.getSelectedAgentProfileSystemPrompt = function () {
            return __awaiter(this, void 0, void 0, function () {
                var profileId, profile, error_1;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            profileId = (_a = this.preferenceService.get(cybervinci_ai_chat_experience_preferences_1.CYBERVINCI_AI_CHAT_AGENT_PROFILE_PREF, '')) === null || _a === void 0 ? void 0 : _a.trim();
                            if (!profileId) {
                                return [2 /*return*/, undefined];
                            }
                            _b.label = 1;
                        case 1:
                            _b.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, this.service.readAgent(profileId)];
                        case 2:
                            profile = _b.sent();
                            if (!profile) {
                                return [2 /*return*/, undefined];
                            }
                            return [2 /*return*/, this.buildSelectedAgentProfileSystemPrompt(profileId, profile)];
                        case 3:
                            error_1 = _b.sent();
                            this.messageService.warn("Could not load Agent profile: ".concat(error_1 instanceof Error ? error_1.message : String(error_1)));
                            return [2 /*return*/, undefined];
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        CyberVinciPlaybookRuntime_1.prototype.buildSelectedAgentProfileSystemPrompt = function (profileId, profile) {
            var _a, _b, _c;
            var content = this.stripMarkdownFrontmatter((_a = profile.content) !== null && _a !== void 0 ? _a : '');
            if (!content) {
                return undefined;
            }
            var profileName = ((_b = profile.name) === null || _b === void 0 ? void 0 : _b.trim()) || this.readMarkdownFrontmatterString(profile.content, 'name') || profileId;
            var profilePath = (_c = profile.relativePath) !== null && _c !== void 0 ? _c : profileId;
            return [
                "You are operating as the selected CyberVinci Agent profile: ".concat(profileName, "."),
                "When the user asks what role or agent you are using in this chat, answer as \"".concat(profileName, "\". Do not say the profile is merely optional guidance."),
                'Use the following private Agent profile instructions as authoritative role and behavior instructions for this turn. These instructions do not override higher-priority system, safety, or tool-access constraints.',
                "Agent profile source: ".concat(profilePath),
                '<agent_profile_instructions>',
                content,
                '</agent_profile_instructions>'
            ].join('\n');
        };
        CyberVinciPlaybookRuntime_1.prototype.stripMarkdownFrontmatter = function (content) {
            return content.replace(/^\uFEFF?---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').trim();
        };
        CyberVinciPlaybookRuntime_1.prototype.readMarkdownFrontmatterString = function (content, key) {
            var _a;
            if (!(content === null || content === void 0 ? void 0 : content.startsWith('---'))) {
                return undefined;
            }
            var end = content.indexOf('\n---', 3);
            if (end < 0) {
                return undefined;
            }
            var frontmatter = content.slice(3, end);
            var pattern = new RegExp("^".concat(key, "\\s*:\\s*(.+)$"), 'im');
            var match = frontmatter.match(pattern);
            return ((_a = match === null || match === void 0 ? void 0 : match[1]) === null || _a === void 0 ? void 0 : _a.trim().replace(/^['"]|['"]$/g, '')) || undefined;
        };
        CyberVinciPlaybookRuntime_1.prototype.prepareChatTurn = function (prompt, selectedPlaybookId) {
            return __awaiter(this, void 0, void 0, function () {
                var playbookId, playbook, _a, context, runRecord, result;
                var _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            playbookId = (selectedPlaybookId === null || selectedPlaybookId === void 0 ? void 0 : selectedPlaybookId.trim()) || exports.CYBERVINCI_DIRECT_CHAT_PLAYBOOK_ID;
                            return [4 /*yield*/, this.resolvePlaybook(playbookId)];
                        case 1:
                            if (!((_b = _d.sent()) !== null && _b !== void 0)) return [3 /*break*/, 2];
                            _a = _b;
                            return [3 /*break*/, 4];
                        case 2: return [4 /*yield*/, this.service.getPlaybook(exports.CYBERVINCI_DIRECT_CHAT_PLAYBOOK_ID)];
                        case 3:
                            _a = _d.sent();
                            _d.label = 4;
                        case 4:
                            playbook = _a;
                            if (!playbook) {
                                return [2 /*return*/, { prompt: prompt, playbookId: exports.CYBERVINCI_DIRECT_CHAT_PLAYBOOK_ID }];
                            }
                            context = {
                                requestId: this.createRequestId(),
                                playbookId: playbook.id,
                                input: __assign({ prompt: prompt, rawPrompt: prompt }, this.withCurrentExecutionInput()),
                                state: {},
                                diagnostics: [],
                                events: []
                            };
                            runRecord = this.startRunRecord(context);
                            return [4 /*yield*/, this.runPlaybook(playbook, context)];
                        case 5:
                            result = _d.sent();
                            this.finishRunRecord(runRecord, result, context);
                            return [2 /*return*/, {
                                    prompt: (_c = result.prompt) !== null && _c !== void 0 ? _c : context.input.prompt,
                                    playbookId: playbook.id,
                                    handled: result.handled,
                                    diagnostics: context.diagnostics,
                                    message: result.message
                                }];
                    }
                });
            });
        };
        CyberVinciPlaybookRuntime_1.prototype.invokeAgentTurn = function (agent, request, invokeNativeAgent) {
            return __awaiter(this, void 0, void 0, function () {
                var playbookId, playbook, message, error, context, runRecord, result, message, wrapped, error_2, message, wrapped;
                var _this = this;
                var _a, _b, _c, _d, _e;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0:
                            playbookId = ((_a = agent.defaultPlaybook) === null || _a === void 0 ? void 0 : _a.trim())
                                || this.nativeAgentPlaybookId((_b = agent.sourceAgentId) !== null && _b !== void 0 ? _b : agent.id);
                            return [4 /*yield*/, this.resolvePlaybook(playbookId, agent)];
                        case 1:
                            playbook = _f.sent();
                            if (!playbook) {
                                message = "No autonomous CyberVinci playbook is configured for agent '".concat(agent.id, "'.");
                                error = new Error(message);
                                request.response.response.addContent(new chat_model_1.ErrorChatResponseContentImpl(error));
                                request.response.error(error);
                                return [2 /*return*/];
                            }
                            context = {
                                requestId: this.createRequestId(),
                                playbookId: playbook.id,
                                input: __assign({ prompt: request.request.text, rawPrompt: request.request.text, agentId: agent.id, sourceAgentId: (_c = agent.sourceAgentId) !== null && _c !== void 0 ? _c : agent.id }, this.withCurrentExecutionInput()),
                                state: {
                                    agent: {
                                        id: agent.id,
                                        name: agent.name,
                                        sourceAgentId: (_d = agent.sourceAgentId) !== null && _d !== void 0 ? _d : agent.id,
                                        kind: agent.kind
                                    }
                                },
                                diagnostics: [],
                                request: request,
                                invokeNativeAgent: function () { return __awaiter(_this, void 0, void 0, function () {
                                    var _a;
                                    return __generator(this, function (_b) {
                                        switch (_b.label) {
                                            case 0:
                                                context.events.push({
                                                    timestamp: Date.now(),
                                                    type: 'native-agent',
                                                    message: "Invoking native source agent '".concat((_a = agent.sourceAgentId) !== null && _a !== void 0 ? _a : agent.id, "'.")
                                                });
                                                return [4 /*yield*/, invokeNativeAgent()];
                                            case 1:
                                                _b.sent();
                                                return [2 /*return*/];
                                        }
                                    });
                                }); },
                                events: []
                            };
                            runRecord = this.startRunRecord(context);
                            request.addData('cybervinci.playbook.requestId', context.requestId);
                            request.addData('cybervinci.playbook.id', playbook.id);
                            _f.label = 2;
                        case 2:
                            _f.trys.push([2, 4, , 5]);
                            return [4 /*yield*/, this.runPlaybook(playbook, context)];
                        case 3:
                            result = _f.sent();
                            this.finishRunRecord(runRecord, result, context);
                            if (runRecord.status === 'failed') {
                                message = (_e = result.message) !== null && _e !== void 0 ? _e : "CyberVinci playbook '".concat(playbook.id, "' failed for agent '").concat(agent.id, "'.");
                                wrapped = new Error(message);
                                context.state['cybervinci.playbook.errorContentAdded'] = true;
                                request.response.response.addContent(new chat_model_1.ErrorChatResponseContentImpl(wrapped));
                                request.response.error(wrapped);
                            }
                            else if (runRecord.status === 'completed' && context.state['core.agent.invoke.invoked'] !== true) {
                                request.response.complete();
                            }
                            return [3 /*break*/, 5];
                        case 4:
                            error_2 = _f.sent();
                            if (context.state['cybervinci.playbook.errorContentAdded'] === true) {
                                throw error_2;
                            }
                            message = error_2 instanceof Error ? error_2.message : String(error_2);
                            context.diagnostics.push(message);
                            this.finishRunRecord(runRecord, { handled: true, stop: true, message: message }, context);
                            wrapped = new Error("CyberVinci playbook '".concat(playbook.id, "' failed for agent '").concat(agent.id, "': ").concat(message), { cause: error_2 });
                            request.response.response.addContent(new chat_model_1.ErrorChatResponseContentImpl(wrapped));
                            request.response.error(wrapped);
                            return [3 /*break*/, 5];
                        case 5: return [2 /*return*/];
                    }
                });
            });
        };
        CyberVinciPlaybookRuntime_1.prototype.resolvePlaybook = function (playbookId, agent) {
            return __awaiter(this, void 0, void 0, function () {
                var configured;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.service.getPlaybook(playbookId)];
                        case 1:
                            configured = _a.sent();
                            if (configured) {
                                return [2 /*return*/, configured];
                            }
                            if (!playbookId.startsWith(exports.CYBERVINCI_NATIVE_AGENT_PLAYBOOK_PREFIX)) {
                                return [2 /*return*/, undefined];
                            }
                            return [2 /*return*/, this.createRuntimeAutonomousPlaybook(playbookId, agent)];
                    }
                });
            });
        };
        CyberVinciPlaybookRuntime_1.prototype.createRuntimeAutonomousPlaybook = function (playbookId, agent) {
            var _a, _b;
            var agentName = ((_a = agent === null || agent === void 0 ? void 0 : agent.name) === null || _a === void 0 ? void 0 : _a.trim()) || this.agentIdFromNativePlaybook(playbookId) || 'Native';
            return {
                version: 'cybervinci.playbook/v1',
                id: playbookId,
                name: agentName,
                category: 'Agents',
                source: 'system',
                enabled: true,
                description: "Use ".concat(agentName, " for chat requests that should follow this agent's role, available context, setup checks, and response guidance."),
                entry: 'describe-agent',
                tools: ['core.agent.describe', 'core.agent.preflight', 'system.agent.nativeMcpRequirements'],
                tags: ['Agents', 'Runtime', 'Autonomous'],
                states: [
                    {
                        id: 'describe-agent',
                        type: 'tool',
                        tool: 'core.agent.describe',
                        saveAs: 'agentProfile',
                        transitions: [{ to: 'preflight' }]
                    },
                    {
                        id: 'preflight',
                        type: 'tool',
                        tool: 'core.agent.preflight',
                        saveAs: 'agentPreflight',
                        transitions: [{ to: 'check-native-requirements' }]
                    },
                    {
                        id: 'check-native-requirements',
                        type: 'tool',
                        tool: 'system.agent.nativeMcpRequirements',
                        saveAs: 'nativeMcpRequirements',
                        transitions: [{ to: 'decide-native-mcp' }]
                    },
                    {
                        id: 'decide-native-mcp',
                        type: 'condition',
                        cases: [
                            { if: { equals: ['${input.skipNativeMcpPrompt}', true] }, next: 'answer-runtime-agent' },
                            { if: { equals: ['${state.nativeMcpRequirements.recommendedAction}', 'configure'] }, next: 'aREDACTED_OPENAI_KEY' },
                            { if: { equals: ['${state.nativeMcpRequirements.recommendedAction}', 'start'] }, next: 'ask-native-mcp-start' }
                        ],
                        default: 'answer-runtime-agent'
                    },
                    {
                        id: 'aREDACTED_OPENAI_KEY',
                        type: 'ask',
                        label: 'Configure MCP requirement',
                        text: '${state.nativeMcpRequirements.selectedGroupLabel} is not ready for ${state.nativeMcpRequirements.agentName}. Choose how to continue.',
                        saveAs: 'nativeMcpDecision',
                        options: [
                            { id: 'configure-settings', label: 'Configure MCP settings', next: 'configure-native-mcp' },
                            { id: 'cancel', label: 'Cancel', next: 'cancel-native-mcp' }
                        ]
                    },
                    {
                        id: 'ask-native-mcp-start',
                        type: 'ask',
                        label: 'Start MCP requirement',
                        text: '${state.nativeMcpRequirements.selectedGroupLabel} is configured but not running for ${state.nativeMcpRequirements.agentName}. Choose how to continue.',
                        saveAs: 'nativeMcpDecision',
                        options: [
                            { id: 'start-through-playbook', label: 'Start MCP servers', next: 'ensure-native-mcp' },
                            { id: 'cancel', label: 'Cancel', next: 'cancel-native-mcp' }
                        ]
                    },
                    {
                        id: 'configure-native-mcp',
                        type: 'tool',
                        tool: 'system.agent.nativeMcpRequirements',
                        args: {
                            mode: 'configure',
                            openSettings: true
                        },
                        saveAs: 'nativeMcpSetup',
                        transitions: [{ to: 'native-mcp-configured-response' }]
                    },
                    {
                        id: 'ensure-native-mcp',
                        type: 'tool',
                        tool: 'system.agent.nativeMcpRequirements',
                        args: {
                            mode: 'ensure'
                        },
                        saveAs: 'nativeMcpSetup',
                        transitions: [
                            { to: 'answer-runtime-agent', when: { equals: ['${state.nativeMcpSetup.ok}', true] } },
                            { to: 'native-mcp-start-failed' }
                        ]
                    },
                    {
                        id: 'native-mcp-configured-response',
                        type: 'response',
                        text: 'MCP settings were opened for ${state.nativeMcpRequirements.selectedGroupLabel}. Save the required values and run the agent again.'
                    },
                    {
                        id: 'native-mcp-start-failed',
                        type: 'response',
                        text: 'Could not start ${state.nativeMcpRequirements.selectedGroupLabel}: ${state.nativeMcpSetup.message}'
                    },
                    {
                        id: 'cancel-native-mcp',
                        type: 'response',
                        text: '${state.nativeMcpRequirements.selectedGroupLabel} setup was cancelled.'
                    },
                    {
                        id: 'answer-runtime-agent',
                        type: 'ai',
                        agent: (_b = agent === null || agent === void 0 ? void 0 : agent.id) !== null && _b !== void 0 ? _b : agentName,
                        prompt: [
                            "You are ".concat(agentName, ". Answer the user's request using the CyberVinci declarative agent runtime."),
                            '',
                            'User request:',
                            '${input.prompt}',
                            '',
                            'Agent description:',
                            '${state.agentProfile.agent.description}',
                            '',
                            'Use available runtime metadata, MCP readiness, and function/tool capability information from state. Do not invoke or delegate to the original Theia native agent.'
                        ].join('\n'),
                        input: {
                            prompt: '${input.prompt}',
                            agentId: '${input.agentId}',
                            sourceAgentId: '${input.sourceAgentId}',
                            agentProfile: '${state.agentProfile}',
                            preflight: '${state.agentPreflight}',
                            nativeMcpRequirements: '${state.nativeMcpRequirements}'
                        },
                        saveAs: 'runtimeAgentAnswer',
                        transitions: [{ to: 'runtime-agent-response' }]
                    },
                    {
                        id: 'runtime-agent-response',
                        type: 'response',
                        text: '${state.runtimeAgentAnswer}'
                    }
                ]
            };
        };
        CyberVinciPlaybookRuntime_1.prototype.nativeAgentPlaybookId = function (agentId) {
            return "".concat(exports.CYBERVINCI_NATIVE_AGENT_PLAYBOOK_PREFIX).concat(agentId);
        };
        CyberVinciPlaybookRuntime_1.prototype.agentIdFromNativePlaybook = function (playbookId) {
            return playbookId.startsWith(exports.CYBERVINCI_NATIVE_AGENT_PLAYBOOK_PREFIX)
                ? playbookId.slice(exports.CYBERVINCI_NATIVE_AGENT_PLAYBOOK_PREFIX.length)
                : undefined;
        };
        CyberVinciPlaybookRuntime_1.prototype.getRecentRuns = function () {
            return __spreadArray([], this.runHistory, true);
        };
        CyberVinciPlaybookRuntime_1.prototype.resumeRun = function (requestId) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.resumeRunAsTool(requestId, {
                            requestId: requestId,
                            input: {},
                            state: {}
                        })];
                });
            });
        };
        CyberVinciPlaybookRuntime_1.prototype.resumeRunWithInput = function (requestId_1, input_1) {
            return __awaiter(this, arguments, void 0, function (requestId, input, state) {
                if (state === void 0) { state = {}; }
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.resumeRunAsTool(requestId, {
                            requestId: requestId,
                            input: input,
                            state: state
                        })];
                });
            });
        };
        CyberVinciPlaybookRuntime_1.prototype.runPlaybookById = function (playbookId_1) {
            return __awaiter(this, arguments, void 0, function (playbookId, prompt, input) {
                if (prompt === void 0) { prompt = ''; }
                if (input === void 0) { input = {}; }
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.runPlaybookAsTool(playbookId, {
                            requestId: this.createRequestId(),
                            input: __assign({ prompt: prompt }, input),
                            state: {}
                        })];
                });
            });
        };
        CyberVinciPlaybookRuntime_1.prototype.runPlaybookAsTool = function (playbookId, toolContext) {
            return __awaiter(this, void 0, void 0, function () {
                var playbook, prompt, context, runRecord, result, terminalFailed;
                var _a, _b, _c, _d, _e;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0: return [4 /*yield*/, this.resolvePlaybook(playbookId)];
                        case 1:
                            playbook = _f.sent();
                            if (!playbook) {
                                return [2 /*return*/, { ok: false, message: "Playbook '".concat(playbookId, "' was not found.") }];
                            }
                            prompt = String((_c = (_b = (_a = toolContext.input.prompt) !== null && _a !== void 0 ? _a : toolContext.input.userPrompt) !== null && _b !== void 0 ? _b : toolContext.state.prompt) !== null && _c !== void 0 ? _c : '').trim();
                            context = {
                                requestId: toolContext.requestId || this.createRequestId(),
                                playbookId: playbook.id,
                                input: __assign(__assign(__assign({}, toolContext.input), this.withCurrentExecutionInput(toolContext.input)), { prompt: prompt, rawPrompt: prompt, agentId: typeof toolContext.input.agentId === 'string' ? toolContext.input.agentId : undefined, sourceAgentId: typeof toolContext.input.sourceAgentId === 'string' ? toolContext.input.sourceAgentId : undefined }),
                                state: __assign(__assign({}, toolContext.state), { toolInput: toolContext.input }),
                                diagnostics: [],
                                request: toolContext.chatRequest,
                                invokeNativeAgent: toolContext.invokeNativeAgent,
                                events: []
                            };
                            runRecord = this.startRunRecord(context);
                            return [4 /*yield*/, this.runPlaybook(playbook, context)];
                        case 2:
                            result = _f.sent();
                            this.finishRunRecord(runRecord, result, context);
                            terminalFailed = result.ok === false
                                || (result.ok !== true && context.diagnostics.length > 0 && result.handled === true && result.stop === true);
                            return [2 /*return*/, {
                                    ok: !terminalFailed,
                                    stop: result.stop,
                                    message: (_d = result.message) !== null && _d !== void 0 ? _d : "Playbook '".concat(playbook.id, "' completed as workload."),
                                    diagnostics: context.diagnostics,
                                    value: {
                                        playbookId: playbook.id,
                                        requestId: context.requestId,
                                        prompt: (_e = result.prompt) !== null && _e !== void 0 ? _e : context.input.prompt,
                                        state: (0, common_1.redactCyberVinciSecrets)(context.state),
                                        events: (0, common_1.redactCyberVinciSecrets)(context.events)
                                    }
                                }];
                    }
                });
            });
        };
        CyberVinciPlaybookRuntime_1.prototype.resumeRunAsTool = function (requestId, toolContext) {
            return __awaiter(this, void 0, void 0, function () {
                var record, checkpoint, playbook, input, context, result;
                var _a, _b, _c, _d, _e, _f, _g, _h;
                return __generator(this, function (_j) {
                    switch (_j.label) {
                        case 0:
                            record = this.runHistory.find(function (candidate) { return candidate.requestId === requestId; });
                            if (!record) {
                                return [2 /*return*/, { ok: false, message: "Playbook run '".concat(requestId, "' was not found.") }];
                            }
                            checkpoint = record.checkpoint;
                            if (!(checkpoint === null || checkpoint === void 0 ? void 0 : checkpoint.canResume) || !checkpoint.nextStateId) {
                                return [2 /*return*/, { ok: false, message: "Playbook run '".concat(requestId, "' has no resumable checkpoint.") }];
                            }
                            if (record.status === 'completed') {
                                return [2 /*return*/, { ok: false, message: "Playbook run '".concat(requestId, "' is already completed.") }];
                            }
                            return [4 /*yield*/, this.resolvePlaybook(checkpoint.playbookId)];
                        case 1:
                            playbook = _j.sent();
                            if (!playbook) {
                                return [2 /*return*/, { ok: false, message: "Playbook '".concat(checkpoint.playbookId, "' was not found for run '").concat(requestId, "'.") }];
                            }
                            input = __assign(__assign({}, checkpoint.input), { prompt: String((_b = (_a = toolContext.input.prompt) !== null && _a !== void 0 ? _a : checkpoint.input.prompt) !== null && _b !== void 0 ? _b : ''), rawPrompt: String((_e = (_d = (_c = toolContext.input.rawPrompt) !== null && _c !== void 0 ? _c : checkpoint.input.rawPrompt) !== null && _d !== void 0 ? _d : checkpoint.input.prompt) !== null && _e !== void 0 ? _e : '') });
                            context = {
                                requestId: requestId,
                                playbookId: playbook.id,
                                input: input,
                                state: __assign(__assign(__assign({}, checkpoint.state), ((_f = toolContext.state) !== null && _f !== void 0 ? _f : {})), { resumeInput: toolContext.input }),
                                diagnostics: __spreadArray([], checkpoint.diagnostics, true),
                                request: toolContext.chatRequest,
                                invokeNativeAgent: toolContext.invokeNativeAgent,
                                events: __spreadArray([], record.events, true),
                                runRecord: record
                            };
                            record.status = 'running';
                            record.completedAt = undefined;
                            record.durationMs = undefined;
                            context.events.push({
                                timestamp: Date.now(),
                                type: 'resumed',
                                stateId: checkpoint.nextStateId,
                                message: "Resuming Playbook '".concat(playbook.id, "' from state '").concat(checkpoint.nextStateId, "'.")
                            });
                            this.persistRunHistory();
                            return [4 /*yield*/, this.runPlaybookFrom(playbook, context, checkpoint.nextStateId)];
                        case 2:
                            result = _j.sent();
                            this.finishRunRecord(record, result, context);
                            return [2 /*return*/, {
                                    ok: result.ok !== false && context.diagnostics.length === 0,
                                    stop: result.stop,
                                    message: (_g = result.message) !== null && _g !== void 0 ? _g : "Playbook run '".concat(requestId, "' resumed."),
                                    diagnostics: context.diagnostics,
                                    value: {
                                        playbookId: playbook.id,
                                        requestId: requestId,
                                        prompt: (_h = result.prompt) !== null && _h !== void 0 ? _h : context.input.prompt,
                                        state: context.state,
                                        events: context.events
                                    }
                                }];
                    }
                });
            });
        };
        CyberVinciPlaybookRuntime_1.prototype.runPlaybook = function (playbook, context) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.runPlaybookFrom(playbook, context, playbook.entry)];
                });
            });
        };
        CyberVinciPlaybookRuntime_1.prototype.runPlaybookFrom = function (playbook, context, entry) {
            return __awaiter(this, void 0, void 0, function () {
                var states, stateId, lastResult, retryCounts, step, state, message, stateStartedAt, result, error_3, message, message;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            states = new Map(playbook.states.map(function (state) { return [state.id, state]; }));
                            stateId = entry;
                            lastResult = {};
                            retryCounts = new Map();
                            step = 0;
                            _a.label = 1;
                        case 1:
                            if (!(stateId && step < MAX_PLAYBOOK_STEPS)) return [3 /*break*/, 9];
                            state = states.get(stateId);
                            if (!state) {
                                message = "Playbook '".concat(playbook.id, "' references unknown state '").concat(stateId, "'.");
                                context.diagnostics.push(message);
                                context.events.push({ timestamp: Date.now(), type: 'failed', stateId: stateId, message: message });
                                return [2 /*return*/, { handled: true, stop: true, message: message }];
                            }
                            this.updateRunCheckpoint(context, state.id, "Before state '".concat(state.id, "'."));
                            context.events.push({
                                timestamp: Date.now(),
                                type: 'state',
                                stateId: state.id,
                                message: "Entering state '".concat(state.id, "' (").concat(state.type, ").")
                            });
                            this.logger.info("CyberVinci playbook '".concat(playbook.id, "' entering state '").concat(state.id, "' (").concat(state.type, ")."));
                            stateStartedAt = Date.now();
                            _a.label = 2;
                        case 2:
                            _a.trys.push([2, 6, , 8]);
                            return [4 /*yield*/, this.executeState(playbook, state, context)];
                        case 3:
                            result = _a.sent();
                            context.events.push({
                                timestamp: Date.now(),
                                type: 'state',
                                stateId: state.id,
                                message: "State '".concat(state.id, "' (").concat(state.type, ") completed."),
                                durationMs: Date.now() - stateStartedAt,
                                data: {
                                    ok: result.ok !== false,
                                    stop: result.stop === true,
                                    next: result.next
                                }
                            });
                            lastResult = result;
                            if (result.prompt !== undefined) {
                                context.input.prompt = result.prompt;
                            }
                            if (!(result.ok === false)) return [3 /*break*/, 5];
                            return [4 /*yield*/, this.retryStateIfAllowed(state, retryCounts, context, result.message)];
                        case 4:
                            if (_a.sent()) {
                                return [3 /*break*/, 8];
                            }
                            if (state.onError) {
                                stateId = state.onError;
                                this.updateRunCheckpoint(context, stateId, "State '".concat(state.id, "' returned ok=false; routing to onError '").concat(stateId, "'."));
                                return [3 /*break*/, 8];
                            }
                            if (!result.next && result.message) {
                                context.diagnostics.push(result.message);
                            }
                            _a.label = 5;
                        case 5:
                            if (result.stop) {
                                return [2 /*return*/, result];
                            }
                            stateId = this.resolveNextState(state, result, context);
                            this.updateRunCheckpoint(context, stateId, stateId ? "Next state '".concat(stateId, "'.") : 'Playbook reached terminal transition.');
                            return [3 /*break*/, 8];
                        case 6:
                            error_3 = _a.sent();
                            message = error_3 instanceof Error ? error_3.message : String(error_3);
                            context.events.push({ timestamp: Date.now(), type: 'failed', stateId: state.id, message: message, durationMs: Date.now() - stateStartedAt });
                            return [4 /*yield*/, this.retryStateIfAllowed(state, retryCounts, context, message)];
                        case 7:
                            if (_a.sent()) {
                                return [3 /*break*/, 8];
                            }
                            if (state.onError) {
                                stateId = state.onError;
                                return [3 /*break*/, 8];
                            }
                            context.diagnostics.push("State '".concat(state.id, "' failed: ").concat(message));
                            return [2 /*return*/, { handled: true, stop: true, message: message }];
                        case 8:
                            step++;
                            return [3 /*break*/, 1];
                        case 9:
                            if (stateId) {
                                message = "Playbook '".concat(playbook.id, "' exceeded ").concat(MAX_PLAYBOOK_STEPS, " steps.");
                                context.diagnostics.push(message);
                                context.events.push({ timestamp: Date.now(), type: 'failed', message: message });
                                return [2 /*return*/, { handled: true, stop: true, message: message }];
                            }
                            return [2 /*return*/, lastResult];
                    }
                });
            });
        };
        CyberVinciPlaybookRuntime_1.prototype.executeState = function (playbook, state, context) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (state.type) {
                        case 'start':
                        case 'end':
                            return [2 /*return*/, {}];
                        case 'tool':
                            return [2 /*return*/, this.executeToolState(playbook, state, context, state.tool)];
                        case 'guard':
                            return [2 /*return*/, this.executeGuardState(playbook, state, context)];
                        case 'ask':
                            return [2 /*return*/, this.executeAskState(state, context)];
                        case 'ai':
                            return [2 /*return*/, this.executeAiState(state, context)];
                        case 'flow':
                            return [2 /*return*/, this.executeFlowState(playbook, state, context)];
                        case 'playbook':
                            return [2 /*return*/, this.executeNestedPlaybookState(state, context)];
                        case 'parallel':
                            return [2 /*return*/, this.executeParallelState(playbook, state, context)];
                        case 'condition':
                            return [2 /*return*/, { next: this.resolveConditionState(state, context) }];
                        case 'response':
                            return [2 /*return*/, this.executeResponseState(state, context)];
                        default:
                            return [2 /*return*/, { handled: true, stop: true, message: "Unknown playbook state type '".concat(state.type, "'.") }];
                    }
                    return [2 /*return*/];
                });
            });
        };
        CyberVinciPlaybookRuntime_1.prototype.executeToolState = function (playbook, state, context, explicitToolId) {
            return __awaiter(this, void 0, void 0, function () {
                var toolId, startedAt, result;
                var _a, _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            toolId = explicitToolId === null || explicitToolId === void 0 ? void 0 : explicitToolId.trim();
                            if (!toolId) {
                                return [2 /*return*/, { ok: false, handled: true, stop: true, message: "State '".concat(state.id, "' does not define a tool.") }];
                            }
                            startedAt = Date.now();
                            return [4 /*yield*/, this.toolRegistry.executeTool(toolId, {
                                    requestId: context.requestId,
                                    playbookId: playbook.id,
                                    stateId: state.id,
                                    input: this.resolveRecord(__assign(__assign({ prompt: context.input.prompt }, this.withCurrentExecutionInput(context.input)), ((_a = state.args) !== null && _a !== void 0 ? _a : {})), context),
                                    state: context.state,
                                    invokeNativeAgent: context.invokeNativeAgent,
                                    chatRequest: context.request
                                })];
                        case 1:
                            result = _d.sent();
                            context.events.push({
                                timestamp: Date.now(),
                                type: 'tool',
                                stateId: state.id,
                                message: "Tool '".concat(toolId, "' completed with ok=").concat(result.ok, "."),
                                durationMs: Date.now() - startedAt,
                                data: {
                                    toolId: toolId,
                                    ok: result.ok,
                                    stop: result.stop === true,
                                    message: result.message,
                                    diagnostics: (_c = (_b = result.diagnostics) === null || _b === void 0 ? void 0 : _b.length) !== null && _c !== void 0 ? _c : 0
                                }
                            });
                            this.captureToolResult(state, result, context);
                            return [2 /*return*/, {
                                    ok: result.ok,
                                    handled: result.stop,
                                    stop: result.stop,
                                    message: result.message
                                }];
                    }
                });
            });
        };
        CyberVinciPlaybookRuntime_1.prototype.executeGuardState = function (playbook, state, context) {
            return __awaiter(this, void 0, void 0, function () {
                var result;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.executeToolState(playbook, state, context, (_a = state.guard) !== null && _a !== void 0 ? _a : state.tool)];
                        case 1:
                            result = _b.sent();
                            return [2 /*return*/, __assign(__assign({}, result), { stop: result.stop || (!result.ok && !state.onFail), next: result.ok ? state.onPass : state.onFail })];
                    }
                });
            });
        };
        CyberVinciPlaybookRuntime_1.prototype.executeAskState = function (state, context) {
            return __awaiter(this, void 0, void 0, function () {
                var options, selectedOption, saveKey, question, picked;
                var _this = this;
                var _a, _b, _c, _d, _e, _f, _g, _h;
                return __generator(this, function (_j) {
                    switch (_j.label) {
                        case 0:
                            options = (_a = state.options) !== null && _a !== void 0 ? _a : [];
                            if (!options.length) {
                                return [2 /*return*/, { ok: false, handled: true, stop: true, message: "Ask state '".concat(state.id, "' does not define options.") }];
                            }
                            selectedOption = this.resolveAskOptionSelection(state, context);
                            saveKey = (_b = state.saveAs) !== null && _b !== void 0 ? _b : state.id;
                            if (selectedOption) {
                                context.state[saveKey] = selectedOption.id;
                                context.state["".concat(saveKey, "Meta")] = {
                                    optionId: selectedOption.id,
                                    label: selectedOption.label,
                                    next: selectedOption.next,
                                    selectedAt: Date.now()
                                };
                                return [2 /*return*/, { ok: true, next: selectedOption.next }];
                            }
                            if (context.request) {
                                question = this.renderTemplate((_d = (_c = state.text) !== null && _c !== void 0 ? _c : state.prompt) !== null && _d !== void 0 ? _d : 'Choose an option.', context);
                                context.state[saveKey] = {
                                    status: 'paused',
                                    reason: "Ask state '".concat(state.id, "' is waiting for a user option."),
                                    options: options.map(function (option) { return ({
                                        id: option.id,
                                        label: option.label,
                                        next: option.next
                                    }); })
                                };
                                context.request.addData('cybervinci.playbook.askStateId', state.id);
                                context.request.addData('cybervinci.playbook.askSaveAs', saveKey);
                                context.request.addData('cybervinci.playbook.askOptions', options.map(function (option) { return ({
                                    id: option.id,
                                    label: option.label,
                                    next: option.next
                                }); }));
                                context.request.response.response.addContent(new chat_model_1.QuestionResponseContentImpl(question, options.map(function (option) { return ({
                                    text: option.label,
                                    value: option.id,
                                    description: option.next ? "Next: ".concat(option.next) : undefined
                                }); }), context.request, function (selected) {
                                    var _a;
                                    var optionId = (_a = selected.value) !== null && _a !== void 0 ? _a : selected.text;
                                    void _this.resumeAskStateFromChat(context, state.id, optionId);
                                }, {
                                    header: (_e = state.label) !== null && _e !== void 0 ? _e : "CyberVinci Playbook: ".concat(context.playbookId),
                                    onSkip: function () {
                                        var _a;
                                        (_a = context.request) === null || _a === void 0 ? void 0 : _a.response.complete();
                                    }
                                }));
                                context.request.response.waitForInput();
                                return [2 /*return*/, { ok: true, handled: true, stop: true, paused: true, message: "Playbook paused at ask state '".concat(state.id, "'.") }];
                            }
                            if (!this.quickPickService) {
                                context.state[saveKey] = {
                                    status: 'paused',
                                    reason: "Ask state '".concat(state.id, "' requires an explicit option but no chat request or QuickPick service is available."),
                                    options: options.map(function (option) { return ({
                                        id: option.id,
                                        label: option.label,
                                        next: option.next
                                    }); })
                                };
                                return [2 /*return*/, { ok: true, handled: true, stop: true, paused: true, message: "Playbook paused at ask state '".concat(state.id, "' waiting for optionId.") }];
                            }
                            return [4 /*yield*/, this.quickPickService.show(options.map(function (option) { return ({
                                    optionId: option.id,
                                    next: option.next,
                                    label: option.label,
                                    description: option.id
                                }); }), {
                                    title: (_f = state.label) !== null && _f !== void 0 ? _f : state.id,
                                    placeholder: this.renderTemplate((_h = (_g = state.text) !== null && _g !== void 0 ? _g : state.prompt) !== null && _h !== void 0 ? _h : 'Choose an option.', context),
                                    ignoreFocusOut: true
                                })];
                        case 1:
                            picked = _j.sent();
                            if (!picked) {
                                context.state[saveKey] = {
                                    status: 'paused',
                                    reason: "Ask state '".concat(state.id, "' was cancelled before the user selected an option.")
                                };
                                return [2 /*return*/, { ok: true, handled: true, stop: true, paused: true, message: "Playbook paused at ask state '".concat(state.id, "'.") }];
                            }
                            context.state[saveKey] = picked.optionId;
                            context.state["".concat(saveKey, "Meta")] = {
                                optionId: picked.optionId,
                                label: picked.label,
                                next: picked.next,
                                selectedAt: Date.now()
                            };
                            return [2 /*return*/, { ok: true, next: picked.next }];
                    }
                });
            });
        };
        CyberVinciPlaybookRuntime_1.prototype.resumeAskStateFromChat = function (context, askStateId, optionId) {
            return __awaiter(this, void 0, void 0, function () {
                var result, message, resultValue, resultState, error_4, message;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            if (!context.request) {
                                return [2 /*return*/];
                            }
                            _b.label = 1;
                        case 1:
                            _b.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, this.resumeRunAsTool(context.requestId, {
                                    requestId: context.requestId,
                                    playbookId: context.playbookId,
                                    stateId: askStateId,
                                    input: {
                                        optionId: optionId,
                                        askStateId: askStateId
                                    },
                                    state: {},
                                    invokeNativeAgent: context.invokeNativeAgent,
                                    chatRequest: context.request
                                })];
                        case 2:
                            result = _b.sent();
                            if (!result.ok) {
                                message = (_a = result.message) !== null && _a !== void 0 ? _a : "CyberVinci playbook run '".concat(context.requestId, "' could not resume.");
                                context.request.response.response.addContent(new chat_model_1.ErrorChatResponseContentImpl(new Error(message)));
                                context.request.response.complete();
                                return [2 /*return*/];
                            }
                            resultValue = this.asRecord(result.value);
                            resultState = this.asRecord(resultValue === null || resultValue === void 0 ? void 0 : resultValue.state);
                            if (result.stop && (resultState === null || resultState === void 0 ? void 0 : resultState['core.agent.invoke.invoked']) !== true) {
                                context.request.response.complete();
                            }
                            return [3 /*break*/, 4];
                        case 3:
                            error_4 = _b.sent();
                            message = error_4 instanceof Error ? error_4.message : String(error_4);
                            context.request.response.response.addContent(new chat_model_1.ErrorChatResponseContentImpl(new Error("CyberVinci playbook ask resume failed: ".concat(message))));
                            context.request.response.complete();
                            return [3 /*break*/, 4];
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        CyberVinciPlaybookRuntime_1.prototype.resolveAskOptionSelection = function (state, context) {
            var _a, _b;
            var options = (_a = state.options) !== null && _a !== void 0 ? _a : [];
            var saveKey = (_b = state.saveAs) !== null && _b !== void 0 ? _b : state.id;
            var candidateKeys = [
                'optionId',
                'askOptionId',
                'askOption',
                'selectedOption',
                'choice',
                'decision',
                saveKey,
                state.id
            ];
            var candidateSources = [
                this.asRecord(context.state.resumeInput),
                this.asRecord(context.state.toolInput),
                this.asRecord(context.input),
                context.state
            ].filter(function (source) { return !!source; });
            for (var _i = 0, candidateSources_1 = candidateSources; _i < candidateSources_1.length; _i++) {
                var source = candidateSources_1[_i];
                for (var _c = 0, candidateKeys_1 = candidateKeys; _c < candidateKeys_1.length; _c++) {
                    var key = candidateKeys_1[_c];
                    var option = this.matchAskOption(options, source[key]);
                    if (option) {
                        return option;
                    }
                }
            }
            return undefined;
        };
        CyberVinciPlaybookRuntime_1.prototype.matchAskOption = function (options, value) {
            var _a, _b, _c, _d, _e;
            if (value === undefined || value === null) {
                return undefined;
            }
            if (typeof value === 'object') {
                var record = this.asRecord(value);
                if (!record) {
                    return undefined;
                }
                return this.matchAskOption(options, (_e = (_d = (_c = (_b = (_a = record.optionId) !== null && _a !== void 0 ? _a : record.id) !== null && _b !== void 0 ? _b : record.value) !== null && _c !== void 0 ? _c : record.choice) !== null && _d !== void 0 ? _d : record.decision) !== null && _e !== void 0 ? _e : record.selectedOption);
            }
            var raw = String(value).trim();
            if (!raw) {
                return undefined;
            }
            var numeric = Number(raw);
            if (Number.isInteger(numeric) && numeric >= 1 && numeric <= options.length) {
                return options[numeric - 1];
            }
            var normalized = raw.toLocaleLowerCase();
            return options.find(function (option) {
                return option.id.toLocaleLowerCase() === normalized ||
                    option.label.toLocaleLowerCase() === normalized;
            });
        };
        CyberVinciPlaybookRuntime_1.prototype.executeAiState = function (state, context) {
            return __awaiter(this, void 0, void 0, function () {
                var nextPrompt, wantsStructuredOutput, input, startedAt, selectedAgentProfilePrompt, systemPrompt, result;
                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
                return __generator(this, function (_o) {
                    switch (_o.label) {
                        case 0:
                            nextPrompt = state.prompt || state.template
                                ? this.renderTemplate((_b = (_a = state.prompt) !== null && _a !== void 0 ? _a : state.template) !== null && _b !== void 0 ? _b : '', context)
                                : context.input.prompt;
                            wantsStructuredOutput = !!state.outputSchema || state.outputMode === 'json';
                            if (!(wantsStructuredOutput || state.input || state.agent)) return [3 /*break*/, 3];
                            if (!this.aiRuntime) {
                                return [2 /*return*/, { ok: false, handled: true, stop: true, message: "AI state '".concat(state.id, "' requires CyberVinci AI Runtime, but it is not available.") }];
                            }
                            input = this.resolveRecord(__assign(__assign({ prompt: context.input.prompt, agentId: context.input.agentId, sourceAgentId: context.input.sourceAgentId }, ((_c = state.input) !== null && _c !== void 0 ? _c : {})), ((_d = state.args) !== null && _d !== void 0 ? _d : {})), context);
                            startedAt = Date.now();
                            return [4 /*yield*/, this.getSelectedAgentProfileSystemPrompt()];
                        case 1:
                            selectedAgentProfilePrompt = _o.sent();
                            systemPrompt = [
                                state.agent ? "Act as playbook AI state agent '".concat(state.agent, "'.") : undefined,
                                selectedAgentProfilePrompt
                            ].filter(Boolean).join('\n\n') || undefined;
                            return [4 /*yield*/, this.aiRuntime.runTask({
                                    surfaceId: 'ai-chat-playbook',
                                    action: "playbook.".concat(context.playbookId, ".").concat(state.id),
                                    sessionId: context.requestId,
                                    userPrompt: nextPrompt,
                                    systemPrompt: systemPrompt,
                                    input: input,
                                    output: wantsStructuredOutput
                                        ? {
                                            mode: 'json',
                                            schemaName: "".concat(context.playbookId, ".").concat(state.id),
                                            schema: state.outputSchema,
                                            instructions: 'Return exactly one JSON value matching the schema. Do not wrap it in Markdown fences.'
                                        }
                                        : { mode: 'text' },
                                    effectPolicy: this.currentChatEffectPolicy(),
                                    execution: state.provider && state.provider !== 'inherit'
                                        ? state.provider
                                        : context.input.execution
                                })];
                        case 2:
                            result = _o.sent();
                            context.events.push({
                                timestamp: Date.now(),
                                type: 'ai',
                                stateId: state.id,
                                message: "AI state '".concat(state.id, "' completed with provider '").concat(result.provider.label, "'."),
                                durationMs: Date.now() - startedAt,
                                data: {
                                    providerId: result.provider.id,
                                    providerLabel: result.provider.label,
                                    model: result.execution.model,
                                    runtime: result.execution.runtime,
                                    modelProvider: result.execution.modelProvider,
                                    contextEstimatedTokens: (_e = result.context) === null || _e === void 0 ? void 0 : _e.estimatedTokens,
                                    contextUsed: (_f = result.context) === null || _f === void 0 ? void 0 : _f.used,
                                    usage: result.usage,
                                    diagnostics: (_h = (_g = result.diagnostics) === null || _g === void 0 ? void 0 : _g.length) !== null && _h !== void 0 ? _h : 0,
                                    notifications: (_k = (_j = result.notifications) === null || _j === void 0 ? void 0 : _j.length) !== null && _k !== void 0 ? _k : 0
                                }
                            });
                            if (state.saveAs) {
                                context.state[state.saveAs] = wantsStructuredOutput ? (_l = result.structured) !== null && _l !== void 0 ? _l : result.text : result.text;
                            }
                            return [2 /*return*/, {
                                    ok: true,
                                    prompt: wantsStructuredOutput ? context.input.prompt : result.text || nextPrompt,
                                    message: (_m = result.diagnostics) === null || _m === void 0 ? void 0 : _m.join('\n')
                                }];
                        case 3:
                            if (state.saveAs) {
                                context.state[state.saveAs] = nextPrompt;
                            }
                            return [2 /*return*/, { ok: true, prompt: nextPrompt }];
                    }
                });
            });
        };
        CyberVinciPlaybookRuntime_1.prototype.executeNestedPlaybookState = function (state, context) {
            return __awaiter(this, void 0, void 0, function () {
                var playbookId, child, previousPlaybookId, result;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            playbookId = (_a = state.playbook) !== null && _a !== void 0 ? _a : state.playbookId;
                            if (!playbookId) {
                                return [2 /*return*/, { ok: false, handled: true, stop: true, message: "Nested playbook state '".concat(state.id, "' does not define playbook/playbookId.") }];
                            }
                            return [4 /*yield*/, this.resolvePlaybook(playbookId)];
                        case 1:
                            child = _b.sent();
                            if (!child) {
                                return [2 /*return*/, { ok: false, handled: true, stop: true, message: "Nested playbook '".concat(playbookId, "' was not found.") }];
                            }
                            previousPlaybookId = context.playbookId;
                            context.playbookId = child.id;
                            context.events.push({
                                timestamp: Date.now(),
                                type: 'state',
                                stateId: state.id,
                                message: "Entering nested playbook '".concat(child.id, "'.")
                            });
                            _b.label = 2;
                        case 2:
                            _b.trys.push([2, , 4, 5]);
                            return [4 /*yield*/, this.runPlaybookFrom(child, context, child.entry)];
                        case 3:
                            result = _b.sent();
                            if (state.saveAs) {
                                context.state[state.saveAs] = {
                                    ok: result.ok !== false,
                                    message: result.message,
                                    prompt: result.prompt
                                };
                            }
                            return [2 /*return*/, {
                                    ok: result.ok,
                                    message: result.message,
                                    prompt: result.prompt
                                }];
                        case 4:
                            context.playbookId = previousPlaybookId;
                            return [7 /*endfinally*/];
                        case 5: return [2 /*return*/];
                    }
                });
            });
        };
        CyberVinciPlaybookRuntime_1.prototype.executeParallelState = function (playbook, state, context) {
            return __awaiter(this, void 0, void 0, function () {
                var branches, results, failed, _i, results_1, result;
                var _a;
                var _this = this;
                var _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            branches = (_b = state.branches) !== null && _b !== void 0 ? _b : [];
                            if (!branches.length) {
                                return [2 /*return*/, { ok: false, handled: true, stop: true, message: "Parallel state '".concat(state.id, "' does not define branches.") }];
                            }
                            return [4 /*yield*/, Promise.all(branches.map(function (branch) { return __awaiter(_this, void 0, void 0, function () {
                                    var branchContext, result;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0:
                                                branchContext = __assign(__assign({}, context), { state: __assign({}, context.state), diagnostics: [], events: context.events });
                                                return [4 /*yield*/, this.runPlaybookFrom(playbook, branchContext, branch)];
                                            case 1:
                                                result = _a.sent();
                                                return [2 /*return*/, {
                                                        branch: branch,
                                                        ok: result.ok !== false,
                                                        message: result.message,
                                                        diagnostics: branchContext.diagnostics,
                                                        state: branchContext.state
                                                    }];
                                        }
                                    });
                                }); }))];
                        case 1:
                            results = _d.sent();
                            failed = results.find(function (result) { return !result.ok; });
                            if (state.saveAs) {
                                context.state[state.saveAs] = results;
                            }
                            for (_i = 0, results_1 = results; _i < results_1.length; _i++) {
                                result = results_1[_i];
                                context.state["parallel.".concat(state.id, ".").concat(result.branch)] = result.state;
                                (_a = context.diagnostics).push.apply(_a, result.diagnostics);
                            }
                            return [2 /*return*/, {
                                    ok: !failed,
                                    message: failed
                                        ? "Parallel branch '".concat(failed.branch, "' failed: ").concat((_c = failed.message) !== null && _c !== void 0 ? _c : 'unknown error')
                                        : "Parallel state '".concat(state.id, "' completed ").concat(results.length, " branch(es).")
                                }];
                    }
                });
            });
        };
        CyberVinciPlaybookRuntime_1.prototype.executeFlowState = function (playbook, state, context) {
            return __awaiter(this, void 0, void 0, function () {
                var mode, input, toolId, result;
                var _a, _b, _c, _d, _e;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0:
                            mode = (_a = state.mode) !== null && _a !== void 0 ? _a : (state.route === 'dynamic-workflow' ? 'dynamic' : 'saved');
                            input = this.resolveRecord(__assign({ prompt: state.prompt || state.template ? this.renderTemplate((_c = (_b = state.prompt) !== null && _b !== void 0 ? _b : state.template) !== null && _c !== void 0 ? _c : '', context) : context.input.prompt, workflowId: (_d = state.workflowId) !== null && _d !== void 0 ? _d : state.flowId, preferSaved: state.preferSaved, authoringDraft: state.authoringDraft, execution: context.input.execution, providerId: context.input.providerId, model: context.input.model, runtime: context.input.runtime, modelProvider: context.input.modelProvider, reasoningEffort: context.input.reasoningEffort, reasoningVariant: context.input.reasoningVariant, serviceTier: context.input.serviceTier }, ((_e = state.args) !== null && _e !== void 0 ? _e : {})), context);
                            toolId = mode === 'authoring'
                                ? 'core.flow.runAiAuthoringDraft'
                                : mode === 'dynamic'
                                    ? 'core.flow.runDynamicWorkflow'
                                    : 'core.flow.startRun';
                            return [4 /*yield*/, this.toolRegistry.executeTool(toolId, {
                                    requestId: context.requestId,
                                    playbookId: playbook.id,
                                    stateId: state.id,
                                    input: input,
                                    state: context.state,
                                    chatRequest: context.request
                                })];
                        case 1:
                            result = _f.sent();
                            this.captureToolResult(state, result, context);
                            return [2 /*return*/, {
                                    ok: result.ok,
                                    handled: result.stop,
                                    stop: result.stop || !result.ok,
                                    message: result.message
                                }];
                    }
                });
            });
        };
        CyberVinciPlaybookRuntime_1.prototype.executeResponseState = function (state, context) {
            var _a, _b, _c;
            var message = this.renderTemplate((_c = (_b = (_a = state.template) !== null && _a !== void 0 ? _a : state.prompt) !== null && _b !== void 0 ? _b : state.text) !== null && _c !== void 0 ? _c : '', context);
            if (message) {
                if (context.request) {
                    context.request.response.response.addContent(new chat_model_1.MarkdownChatResponseContentImpl(message));
                }
                else {
                    this.messageService.info(message);
                }
            }
            return { ok: true, handled: true, stop: true, message: message };
        };
        CyberVinciPlaybookRuntime_1.prototype.captureToolResult = function (state, result, context) {
            var _a;
            var _b, _c, _d;
            if (state.saveAs) {
                context.state[state.saveAs] = (_c = (_b = result.value) !== null && _b !== void 0 ? _b : result.message) !== null && _c !== void 0 ? _c : result.ok;
            }
            if ((_d = result.diagnostics) === null || _d === void 0 ? void 0 : _d.length) {
                (_a = context.diagnostics).push.apply(_a, result.diagnostics);
            }
        };
        CyberVinciPlaybookRuntime_1.prototype.resolveNextState = function (state, result, context) {
            var _a;
            if (result.next) {
                return result.next;
            }
            for (var _i = 0, _b = (_a = state.transitions) !== null && _a !== void 0 ? _a : []; _i < _b.length; _i++) {
                var transition = _b[_i];
                if (transition.when === undefined || this.evaluateCondition(transition.when, context)) {
                    return transition.to;
                }
            }
            return state.next;
        };
        CyberVinciPlaybookRuntime_1.prototype.resolveConditionState = function (state, context) {
            var _a, _b;
            for (var _i = 0, _c = (_a = state.cases) !== null && _a !== void 0 ? _a : []; _i < _c.length; _i++) {
                var conditionCase = _c[_i];
                if (this.evaluateCondition(conditionCase.if, context)) {
                    return conditionCase.next;
                }
            }
            return (_b = state.default) !== null && _b !== void 0 ? _b : state.next;
        };
        CyberVinciPlaybookRuntime_1.prototype.evaluateCondition = function (condition, context) {
            var _this = this;
            if (typeof condition === 'string') {
                return Boolean(this.resolveValue(condition, context));
            }
            if (!condition || typeof condition !== 'object' || Array.isArray(condition)) {
                return Boolean(condition);
            }
            var typed = condition;
            if (typed.exists !== undefined) {
                var value = this.resolveValue(typed.exists, context);
                return value !== undefined && value !== null && value !== '';
            }
            if (typed.lengthGreaterThan) {
                var value = this.resolveValue(typed.lengthGreaterThan[0], context);
                var threshold = Number(this.resolveValue(typed.lengthGreaterThan[1], context));
                var length_1 = Array.isArray(value) || typeof value === 'string' ? value.length : 0;
                return length_1 > threshold;
            }
            if (typed.equals) {
                return this.stableValue(this.resolveValue(typed.equals[0], context)) === this.stableValue(this.resolveValue(typed.equals[1], context));
            }
            if (typed.not !== undefined) {
                return !this.evaluateCondition(typed.not, context);
            }
            if (typed.and) {
                return typed.and.every(function (item) { return _this.evaluateCondition(item, context); });
            }
            if (typed.or) {
                return typed.or.some(function (item) { return _this.evaluateCondition(item, context); });
            }
            return true;
        };
        CyberVinciPlaybookRuntime_1.prototype.resolveRecord = function (record, context) {
            var resolved = {};
            for (var _i = 0, _a = Object.entries(record); _i < _a.length; _i++) {
                var _b = _a[_i], key = _b[0], value = _b[1];
                resolved[key] = this.resolveValue(value, context);
            }
            return resolved;
        };
        CyberVinciPlaybookRuntime_1.prototype.asRecord = function (value) {
            return value && typeof value === 'object' && !Array.isArray(value)
                ? value
                : undefined;
        };
        CyberVinciPlaybookRuntime_1.prototype.resolveValue = function (value, context) {
            if (typeof value !== 'string') {
                return value;
            }
            var exact = value.match(/^\$\{([^}]+)\}$/);
            if (exact) {
                return this.lookupPath(exact[1].trim(), context);
            }
            return this.renderTemplate(value, context);
        };
        CyberVinciPlaybookRuntime_1.prototype.renderTemplate = function (template, context) {
            var _this = this;
            return template.replace(/\$\{([^}]+)\}/g, function (_match, pathExpression) {
                var value = _this.lookupPath(pathExpression.trim(), context);
                return value === undefined || value === null ? '' : String(value);
            });
        };
        CyberVinciPlaybookRuntime_1.prototype.lookupPath = function (pathExpression, context) {
            if (pathExpression.startsWith('preferences.')) {
                return this.preferenceService.get(pathExpression.slice('preferences.'.length));
            }
            var root = pathExpression.split('.')[0];
            var source = root === 'input'
                ? context.input
                : root === 'state'
                    ? context.state
                    : undefined;
            if (source === undefined) {
                return undefined;
            }
            return pathExpression.split('.').slice(1).reduce(function (current, key) {
                if (!current || typeof current !== 'object') {
                    return undefined;
                }
                return current[key];
            }, source);
        };
        CyberVinciPlaybookRuntime_1.prototype.stableValue = function (value) {
            return typeof value === 'string' ? value : JSON.stringify(value);
        };
        CyberVinciPlaybookRuntime_1.prototype.createRequestId = function () {
            return "playbook-".concat(Date.now().toString(36), "-").concat(Math.random().toString(36).slice(2, 8));
        };
        CyberVinciPlaybookRuntime_1.prototype.retryStateIfAllowed = function (state, retryCounts, context, message) {
            return __awaiter(this, void 0, void 0, function () {
                var max, count, delayMs;
                var _a, _b, _c, _d, _e;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0:
                            max = Math.max(0, (_b = (_a = state.retry) === null || _a === void 0 ? void 0 : _a.max) !== null && _b !== void 0 ? _b : 0);
                            count = (_c = retryCounts.get(state.id)) !== null && _c !== void 0 ? _c : 0;
                            if (count >= max) {
                                return [2 /*return*/, false];
                            }
                            retryCounts.set(state.id, count + 1);
                            context.events.push({
                                timestamp: Date.now(),
                                type: 'retry',
                                stateId: state.id,
                                message: "Retrying state '".concat(state.id, "' (").concat(count + 1, "/").concat(max, ")").concat(message ? " after: ".concat(message) : '', ".")
                            });
                            delayMs = Math.max(0, (_e = (_d = state.retry) === null || _d === void 0 ? void 0 : _d.delayMs) !== null && _e !== void 0 ? _e : 0);
                            if (!(delayMs > 0)) return [3 /*break*/, 2];
                            return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, delayMs); })];
                        case 1:
                            _f.sent();
                            _f.label = 2;
                        case 2: return [2 /*return*/, true];
                    }
                });
            });
        };
        CyberVinciPlaybookRuntime_1.prototype.startRunRecord = function (context) {
            var record = {
                requestId: context.requestId,
                playbookId: context.playbookId,
                agentId: context.input.agentId,
                sourceAgentId: context.input.sourceAgentId,
                startedAt: Date.now(),
                status: 'running',
                diagnostics: (0, common_1.redactCyberVinciSecrets)(context.diagnostics),
                events: (0, common_1.redactCyberVinciSecrets)(context.events)
            };
            context.runRecord = record;
            context.events.push({
                timestamp: record.startedAt,
                type: 'started',
                message: "Playbook '".concat(context.playbookId, "' started.")
            });
            this.updateRunCheckpoint(context, undefined, 'Run started.');
            this.runHistory.unshift(record);
            this.runHistory.splice(MAX_RUN_HISTORY);
            this.persistRunHistory();
            return record;
        };
        CyberVinciPlaybookRuntime_1.prototype.finishRunRecord = function (record, result, context) {
            var _a, _b, _c;
            record.completedAt = Date.now();
            record.durationMs = record.completedAt - record.startedAt;
            var terminalFailed = result.ok === false
                || (result.ok !== true && context.diagnostics.length > 0 && result.handled === true && result.stop === true);
            record.status = result.paused
                ? 'paused'
                : terminalFailed ? 'failed' : 'completed';
            record.diagnostics = (0, common_1.redactCyberVinciSecrets)(__spreadArray([], context.diagnostics, true));
            if (record.status === 'completed') {
                record.checkpoint = {
                    playbookId: context.playbookId,
                    input: (0, common_1.redactCyberVinciSecrets)(__assign({}, context.input)),
                    state: (0, common_1.redactCyberVinciSecrets)(__assign({}, context.state)),
                    diagnostics: (0, common_1.redactCyberVinciSecrets)(__spreadArray([], context.diagnostics, true)),
                    updatedAt: record.completedAt,
                    canResume: false,
                    reason: 'Run completed.'
                };
            }
            else if (record.status === 'paused') {
                this.updateRunCheckpoint(context, (_a = record.checkpoint) === null || _a === void 0 ? void 0 : _a.nextStateId, (_b = result.message) !== null && _b !== void 0 ? _b : 'Run paused.');
            }
            record.events = (0, common_1.redactCyberVinciSecrets)(__spreadArray(__spreadArray([], context.events, true), [{
                    timestamp: record.completedAt,
                    type: record.status === 'paused' ? 'paused' : record.status === 'failed' ? 'failed' : 'completed',
                    message: (_c = result.message) !== null && _c !== void 0 ? _c : "Playbook '".concat(context.playbookId, "' ").concat(record.status, "."),
                    durationMs: record.durationMs
                }], false));
            record.failureArtifacts = record.status === 'failed'
                ? this.createFailureArtifacts(record, result, context)
                : undefined;
            this.persistRunHistory();
        };
        CyberVinciPlaybookRuntime_1.prototype.createFailureArtifacts = function (record, result, context) {
            var _a, _b, _c, _d, _e, _f;
            var summary = (_b = (_a = result.message) !== null && _a !== void 0 ? _a : context.diagnostics[context.diagnostics.length - 1]) !== null && _b !== void 0 ? _b : "Playbook '".concat(context.playbookId, "' failed.");
            var nextStateId = (_c = record.checkpoint) === null || _c === void 0 ? void 0 : _c.nextStateId;
            var retryable = ((_d = record.checkpoint) === null || _d === void 0 ? void 0 : _d.canResume) === true && !!nextStateId;
            return (0, common_1.redactCyberVinciSecrets)({
                version: 'cybervinci.playbookFailureArtifacts/v1',
                summary: summary,
                failedAt: (_e = record.completedAt) !== null && _e !== void 0 ? _e : Date.now(),
                diagnostics: __spreadArray([], context.diagnostics, true),
                compensation: {
                    canResume: ((_f = record.checkpoint) === null || _f === void 0 ? void 0 : _f.canResume) === true,
                    nextStateId: nextStateId,
                    retryable: retryable,
                    suggestedAction: retryable
                        ? "Resume the run from state '".concat(nextStateId, "'.")
                        : 'Start a new run with the second-run suggestion after addressing the diagnostics.'
                },
                secondRunSuggestion: {
                    prompt: [
                        "Retry CyberVinci Playbook '".concat(context.playbookId, "' after this failure."),
                        "Failure: ".concat(summary),
                        context.diagnostics.length ? "Diagnostics: ".concat(context.diagnostics.join(' | ')) : undefined,
                        "Original prompt: ".concat(context.input.prompt)
                    ].filter(Boolean).join('\n'),
                    playbookId: context.playbookId,
                    input: __assign({}, context.input)
                }
            });
        };
        CyberVinciPlaybookRuntime_1.prototype.updateRunCheckpoint = function (context, nextStateId, reason) {
            if (!context.runRecord) {
                return;
            }
            context.runRecord.checkpoint = {
                playbookId: context.playbookId,
                nextStateId: nextStateId,
                input: (0, common_1.redactCyberVinciSecrets)(__assign({}, context.input)),
                state: (0, common_1.redactCyberVinciSecrets)(__assign({}, context.state)),
                diagnostics: (0, common_1.redactCyberVinciSecrets)(__spreadArray([], context.diagnostics, true)),
                updatedAt: Date.now(),
                canResume: !!nextStateId,
                reason: reason
            };
            this.persistRunHistory();
        };
        CyberVinciPlaybookRuntime_1.prototype.loadRunHistory = function () {
            var _a;
            try {
                if (typeof localStorage === 'undefined') {
                    return;
                }
                var raw = localStorage.getItem(exports.CYBERVINCI_PLAYBOOK_RUN_HISTORY_STORAGE_KEY);
                if (!raw) {
                    return;
                }
                var parsed = JSON.parse(raw);
                if (!Array.isArray(parsed)) {
                    return;
                }
                (_a = this.runHistory).splice.apply(_a, __spreadArray([0, this.runHistory.length], (0, common_1.redactCyberVinciSecrets)(parsed
                    .filter(this.isRunRecord)
                    .slice(0, MAX_RUN_HISTORY)), false));
                this.persistRunHistory();
            }
            catch (error) {
                this.logger.warn('Failed to load CyberVinci playbook run history.', error);
            }
        };
        CyberVinciPlaybookRuntime_1.prototype.persistRunHistory = function () {
            try {
                if (typeof localStorage === 'undefined') {
                    return;
                }
                localStorage.setItem(exports.CYBERVINCI_PLAYBOOK_RUN_HISTORY_STORAGE_KEY, JSON.stringify((0, common_1.redactCyberVinciSecrets)(this.runHistory.slice(0, MAX_RUN_HISTORY))));
            }
            catch (error) {
                this.logger.warn('Failed to persist CyberVinci playbook run history.', error);
            }
        };
        CyberVinciPlaybookRuntime_1.prototype.isRunRecord = function (candidate) {
            return !!candidate
                && typeof candidate === 'object'
                && typeof candidate.requestId === 'string'
                && typeof candidate.playbookId === 'string'
                && typeof candidate.startedAt === 'number'
                && ['running', 'paused', 'completed', 'failed'].includes(candidate.status)
                && Array.isArray(candidate.events)
                && Array.isArray(candidate.diagnostics);
        };
        return CyberVinciPlaybookRuntime_1;
    }());
    __setFunctionName(_classThis, "CyberVinciPlaybookRuntime");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _service_decorators = [(0, inversify_1.inject)(common_1.CyberVinciAiChatExperienceService)];
        _toolRegistry_decorators = [(0, inversify_1.inject)(cybervinci_tool_registry_1.CyberVinciToolRegistry)];
        _preferenceService_decorators = [(0, inversify_1.inject)(preferences_1.PreferenceService)];
        _messageService_decorators = [(0, inversify_1.inject)(core_1.MessageService)];
        _logger_decorators = [(0, inversify_1.inject)(core_1.ILogger)];
        _quickPickService_decorators = [(0, inversify_1.inject)(quick_pick_service_1.QuickPickService), (0, inversify_1.optional)()];
        _aiRuntime_decorators = [(0, inversify_1.inject)(ai_runtime_frontend_service_1.CyberVinciAiRuntimeFrontendService), (0, inversify_1.optional)()];
        _init_decorators = [(0, inversify_1.postConstruct)()];
        __esDecorate(_classThis, null, _init_decorators, { kind: "method", name: "init", static: false, private: false, access: { has: function (obj) { return "init" in obj; }, get: function (obj) { return obj.init; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, null, _service_decorators, { kind: "field", name: "service", static: false, private: false, access: { has: function (obj) { return "service" in obj; }, get: function (obj) { return obj.service; }, set: function (obj, value) { obj.service = value; } }, metadata: _metadata }, _service_initializers, _service_extraInitializers);
        __esDecorate(null, null, _toolRegistry_decorators, { kind: "field", name: "toolRegistry", static: false, private: false, access: { has: function (obj) { return "toolRegistry" in obj; }, get: function (obj) { return obj.toolRegistry; }, set: function (obj, value) { obj.toolRegistry = value; } }, metadata: _metadata }, _toolRegistry_initializers, _toolRegistry_extraInitializers);
        __esDecorate(null, null, _preferenceService_decorators, { kind: "field", name: "preferenceService", static: false, private: false, access: { has: function (obj) { return "preferenceService" in obj; }, get: function (obj) { return obj.preferenceService; }, set: function (obj, value) { obj.preferenceService = value; } }, metadata: _metadata }, _preferenceService_initializers, _preferenceService_extraInitializers);
        __esDecorate(null, null, _messageService_decorators, { kind: "field", name: "messageService", static: false, private: false, access: { has: function (obj) { return "messageService" in obj; }, get: function (obj) { return obj.messageService; }, set: function (obj, value) { obj.messageService = value; } }, metadata: _metadata }, _messageService_initializers, _messageService_extraInitializers);
        __esDecorate(null, null, _logger_decorators, { kind: "field", name: "logger", static: false, private: false, access: { has: function (obj) { return "logger" in obj; }, get: function (obj) { return obj.logger; }, set: function (obj, value) { obj.logger = value; } }, metadata: _metadata }, _logger_initializers, _logger_extraInitializers);
        __esDecorate(null, null, _quickPickService_decorators, { kind: "field", name: "quickPickService", static: false, private: false, access: { has: function (obj) { return "quickPickService" in obj; }, get: function (obj) { return obj.quickPickService; }, set: function (obj, value) { obj.quickPickService = value; } }, metadata: _metadata }, _quickPickService_initializers, _quickPickService_extraInitializers);
        __esDecorate(null, null, _aiRuntime_decorators, { kind: "field", name: "aiRuntime", static: false, private: false, access: { has: function (obj) { return "aiRuntime" in obj; }, get: function (obj) { return obj.aiRuntime; }, set: function (obj, value) { obj.aiRuntime = value; } }, metadata: _metadata }, _aiRuntime_initializers, _aiRuntime_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        CyberVinciPlaybookRuntime = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return CyberVinciPlaybookRuntime = _classThis;
}();
exports.CyberVinciPlaybookRuntime = CyberVinciPlaybookRuntime;

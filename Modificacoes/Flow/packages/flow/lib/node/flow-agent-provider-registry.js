"use strict";
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
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlowAgentProviderRegistry = exports.FlowAgentProviderResolver = void 0;
exports.customProviderCommandEnvName = customProviderCommandEnvName;
var inversify_1 = require("@theia/core/shared/inversify");
exports.FlowAgentProviderResolver = Symbol('FlowAgentProviderResolver');
var FlowAgentProviderRegistry = function () {
    var _classDecorators = [(0, inversify_1.injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var FlowAgentProviderRegistry = _classThis = /** @class */ (function () {
        function FlowAgentProviderRegistry_1(languageModelRegistry, languageModelService, codexProviderService) {
            this.languageModelRegistry = languageModelRegistry;
            this.languageModelService = languageModelService;
            this.codexProviderService = codexProviderService;
        }
        FlowAgentProviderRegistry_1.prototype.resolveProvider = function (context) {
            return __awaiter(this, void 0, void 0, function () {
                var providerId, inheritedProvider, command, codexRuntimeProvider, customCommand;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            providerId = this.resolveProviderId(context);
                            if (!!providerId) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.resolveInheritedProvider(context)];
                        case 1:
                            inheritedProvider = _a.sent();
                            if (inheritedProvider) {
                                return [2 /*return*/, inheritedProvider];
                            }
                            return [2 /*return*/, this.resolveMissingProvider(context)];
                        case 2:
                            if (isE2eMockProviderId(providerId)) {
                                if (e2eMockLlmProviderEnabled()) {
                                    return [2 /*return*/, { mock: 'e2e', providerId: providerId }];
                                }
                                throw new Error(this.unsupportedProviderMessage(context, providerId, 'Set FLOW_AGENT_PROVIDER=e2e-mock to enable the test-only mock provider.'));
                            }
                            if (providerId === 'command') {
                                command = resolveConfiguredCommand();
                                if (command) {
                                    return [2 /*return*/, { command: command, providerId: providerId }];
                                }
                                throw new Error(this.unsupportedProviderMessage(context, providerId, 'Set FLOW_AGENT_LLM_COMMAND or FLOW_AGENT_COMMAND to an executable provider command.'));
                            }
                            if (providerId === 'theia' || providerId === 'theia-language-model') {
                                return [2 /*return*/, this.resolveTheiaProvider(context, providerId)];
                            }
                            codexRuntimeProvider = parseCodexRuntimeProviderId(providerId);
                            if (providerId === 'codex' || providerId === 'codex-provider' || codexRuntimeProvider) {
                                return [2 /*return*/, this.resolveCodexProvider(context, providerId, codexRuntimeProvider)];
                            }
                            customCommand = process.env[customProviderCommandEnvName(providerId)];
                            if (customCommand === null || customCommand === void 0 ? void 0 : customCommand.trim()) {
                                return [2 /*return*/, { command: customCommand, providerId: providerId }];
                            }
                            throw new Error(this.unsupportedProviderMessage(context, providerId, "Set ".concat(customProviderCommandEnvName(providerId), " to an executable command-backed provider, or choose one of: theia, theia-language-model, command.")));
                    }
                });
            });
        };
        FlowAgentProviderRegistry_1.prototype.resolveInheritedProvider = function (_context) {
            return __awaiter(this, void 0, void 0, function () {
                var inheritedTheiaProvider;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.resolveInheritedTheiaProvider()];
                        case 1:
                            inheritedTheiaProvider = _a.sent();
                            if (inheritedTheiaProvider) {
                                return [2 /*return*/, inheritedTheiaProvider];
                            }
                            return [2 /*return*/, undefined];
                    }
                });
            });
        };
        FlowAgentProviderRegistry_1.prototype.resolveProviderId = function (context) {
            var _a, _b, _c;
            var stateProviderId = (_b = (_a = context.state.provider) === null || _a === void 0 ? void 0 : _a.providerId) === null || _b === void 0 ? void 0 : _b.trim().toLowerCase();
            if (stateProviderId) {
                return normalizeLegacyProviderAlias(stateProviderId);
            }
            var envProvider = (_c = process.env.FLOW_AGENT_PROVIDER) === null || _c === void 0 ? void 0 : _c.trim().toLowerCase();
            if (envProvider && envProvider !== 'auto') {
                return normalizeLegacyProviderAlias(envProvider);
            }
            if (e2eMockLlmProviderEnabled()) {
                return 'e2e-mock';
            }
            if (resolveConfiguredCommand()) {
                return 'command';
            }
            if (resolveConfiguredModelId()) {
                return 'theia';
            }
            return undefined;
        };
        FlowAgentProviderRegistry_1.prototype.resolveMissingProvider = function (context) {
            throw new Error("Flow agent provider is missing for state \"".concat(stateIdForMessage(context), "\". ")
                + 'Configure state.provider.providerId, set FLOW_AGENT_PROVIDER, or set FLOW_AGENT_LLM_COMMAND/FLOW_AGENT_COMMAND for a command-backed provider. '
                + 'Deterministic production fallback is disabled.');
        };
        FlowAgentProviderRegistry_1.prototype.resolveTheiaProvider = function (context, providerId) {
            return __awaiter(this, void 0, void 0, function () {
                var hints, model, selected;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!this.languageModelRegistry || !this.languageModelService) {
                                throw new Error(this.unsupportedProviderMessage(context, providerId, 'The Theia LanguageModelRegistry and LanguageModelService are not available in this backend container.'));
                            }
                            hints = resolveTheiaHints(context);
                            if (!hints.modelId) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.languageModelRegistry.getLanguageModel(hints.modelId)];
                        case 1:
                            model = _a.sent();
                            if ((model === null || model === void 0 ? void 0 : model.status.status) === 'ready') {
                                return [2 /*return*/, { model: model, agentId: hints.agentId, purpose: hints.purpose, providerId: providerId }];
                            }
                            throw new Error(this.unsupportedProviderMessage(context, providerId, "The requested modelId \"".concat(hints.modelId, "\" is not available or not ready in the Theia language model registry.")));
                        case 2: return [4 /*yield*/, this.resolveSelectedTheiaModel([{ agentId: hints.agentId, purpose: hints.purpose }])];
                        case 3:
                            selected = _a.sent();
                            if (selected) {
                                return [2 /*return*/, { model: selected.model, agentId: selected.agentId, purpose: selected.purpose, providerId: providerId }];
                            }
                            throw new Error(this.unsupportedProviderMessage(context, providerId, 'No ready Theia language model is available. Configure state.provider.modelId or install/authenticate a Theia language model provider.'));
                    }
                });
            });
        };
        FlowAgentProviderRegistry_1.prototype.resolveInheritedTheiaProvider = function () {
            return __awaiter(this, void 0, void 0, function () {
                var selected;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!this.languageModelRegistry || !this.languageModelService) {
                                return [2 /*return*/, undefined];
                            }
                            return [4 /*yield*/, this.resolveSelectedTheiaModel(defaultTheiaSelections())];
                        case 1:
                            selected = _a.sent();
                            return [2 /*return*/, selected ? __assign(__assign({}, selected), { providerId: 'theia' }) : undefined];
                    }
                });
            });
        };
        FlowAgentProviderRegistry_1.prototype.resolveSelectedTheiaModel = function (selections) {
            return __awaiter(this, void 0, void 0, function () {
                var _i, selections_1, selection, model;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!this.languageModelRegistry) {
                                return [2 /*return*/, undefined];
                            }
                            _i = 0, selections_1 = selections;
                            _a.label = 1;
                        case 1:
                            if (!(_i < selections_1.length)) return [3 /*break*/, 4];
                            selection = selections_1[_i];
                            return [4 /*yield*/, this.languageModelRegistry.selectLanguageModel({ agent: selection.agentId, purpose: selection.purpose })];
                        case 2:
                            model = _a.sent();
                            if ((model === null || model === void 0 ? void 0 : model.status.status) === 'ready') {
                                return [2 /*return*/, { model: model, agentId: selection.agentId, purpose: selection.purpose }];
                            }
                            _a.label = 3;
                        case 3:
                            _i++;
                            return [3 /*break*/, 1];
                        case 4: return [2 /*return*/, undefined];
                    }
                });
            });
        };
        FlowAgentProviderRegistry_1.prototype.resolveCodexProvider = function (context, providerId, runtimeProvider) {
            return __awaiter(this, void 0, void 0, function () {
                var modelId, optionRequest, request, status_1, error_1;
                var _a, _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            modelId = resolveModelId(context);
                            if (!this.codexProviderService) {
                                throw new Error(this.unsupportedProviderMessage(context, providerId, 'CodexProviderService is not available in this backend container.'));
                            }
                            optionRequest = codexProviderRequestOptions((_a = context.state.provider) === null || _a === void 0 ? void 0 : _a.options);
                            request = __assign(__assign({}, optionRequest), { runtime: (_b = runtimeProvider === null || runtimeProvider === void 0 ? void 0 : runtimeProvider.runtime) !== null && _b !== void 0 ? _b : optionRequest.runtime, modelProvider: (_c = runtimeProvider === null || runtimeProvider === void 0 ? void 0 : runtimeProvider.modelProvider) !== null && _c !== void 0 ? _c : optionRequest.modelProvider });
                            _d.label = 1;
                        case 1:
                            _d.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, this.codexProviderService.getStatus(__assign({ cwd: process.cwd(), model: modelId }, request))];
                        case 2:
                            status_1 = _d.sent();
                            if (status_1.available && status_1.authenticated !== false) {
                                return [2 /*return*/, { codexProvider: this.codexProviderService, providerId: providerId, modelId: modelId, request: request }];
                            }
                            throw new Error('Codex provider is not available or authenticated.');
                        case 3:
                            error_1 = _d.sent();
                            throw new Error(this.unsupportedProviderMessage(context, providerId, "".concat(errorToMessage(error_1), " Ensure the Codex provider is installed, available, and authenticated.")));
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        FlowAgentProviderRegistry_1.prototype.unsupportedProviderMessage = function (context, providerId, hint) {
            return "Unsupported or unavailable Flow agent provider for state \"".concat(stateIdForMessage(context), "\": \"").concat(providerId, "\". ").concat(hint);
        };
        return FlowAgentProviderRegistry_1;
    }());
    __setFunctionName(_classThis, "FlowAgentProviderRegistry");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        FlowAgentProviderRegistry = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return FlowAgentProviderRegistry = _classThis;
}();
exports.FlowAgentProviderRegistry = FlowAgentProviderRegistry;
function resolveTheiaHints(context) {
    var _a;
    var options = (_a = context.state.provider) === null || _a === void 0 ? void 0 : _a.options;
    return {
        modelId: resolveModelId(context),
        agentId: stringOption(options, 'agentId') || stringOption(options, 'agent') || (process.env.FLOW_AGENT_CHAT_AGENT_ID || process.env.FLOW_AGENT_CHAT_AGENT || process.env.FLOW_AGENT_ID || 'Flow').trim(),
        purpose: stringOption(options, 'purpose') || (process.env.FLOW_AGENT_CHAT_PURPOSE || process.env.FLOW_AGENT_PURPOSE || 'agent').trim()
    };
}
function resolveModelId(context) {
    var _a, _b;
    return ((_b = (_a = context.state.provider) === null || _a === void 0 ? void 0 : _a.modelId) === null || _b === void 0 ? void 0 : _b.trim()) || resolveConfiguredModelId();
}
function resolveConfiguredModelId() {
    return (process.env.FLOW_AGENT_MODEL_ID || process.env.FLOW_AGENT_LLM_MODEL_ID || '').trim() || undefined;
}
function resolveConfiguredCommand() {
    return (process.env.FLOW_AGENT_LLM_COMMAND || process.env.FLOW_AGENT_COMMAND || '').trim() || undefined;
}
function defaultTheiaSelections() {
    return [
        { agentId: 'OpenCoder', purpose: 'chat' },
        { agentId: 'Coder', purpose: 'chat' },
        { agentId: 'OpenPencil', purpose: 'openpencil-design' },
        { agentId: 'OpenPencil', purpose: 'chat' },
        { agentId: 'Flow', purpose: 'agent' },
        { agentId: 'Universal', purpose: 'chat' }
    ];
}
function stringOption(options, key) {
    var value = options === null || options === void 0 ? void 0 : options[key];
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
function codexProviderRequestOptions(options) {
    return {
        runtime: codexRuntimeOption(options, 'runtime'),
        modelProvider: stringOption(options, 'modelProvider'),
        executablePath: stringOption(options, 'executablePath'),
        profile: stringOption(options, 'profile'),
        openRouterApiKey: stringOption(options, 'openRouterApiKey'),
        openCodeApiKey: stringOption(options, 'openCodeApiKey'),
        openCodeExecutablePath: stringOption(options, 'openCodeExecutablePath'),
        openCodeAgent: stringOption(options, 'openCodeAgent'),
        openCodeVariant: stringOption(options, 'openCodeVariant'),
        geminiExecutablePath: stringOption(options, 'geminiExecutablePath'),
        claudeExecutablePath: stringOption(options, 'claudeExecutablePath'),
        claudeAgent: stringOption(options, 'claudeAgent'),
        cursorExecutablePath: stringOption(options, 'cursorExecutablePath'),
        cursorMode: stringOption(options, 'cursorMode')
    };
}
function codexRuntimeOption(options, key) {
    var value = stringOption(options, key);
    return value && isCodexProviderRuntime(value) ? value : undefined;
}
function parseCodexRuntimeProviderId(providerId) {
    var separator = providerId.indexOf(':');
    if (separator <= 0) {
        return undefined;
    }
    var runtime = providerId.slice(0, separator);
    var modelProvider = providerId.slice(separator + 1);
    if (!isCodexProviderRuntime(runtime) || !modelProvider) {
        return undefined;
    }
    return { runtime: runtime, modelProvider: modelProvider };
}
function isCodexProviderRuntime(value) {
    return value === 'codex-app-server'
        || value === 'direct-http'
        || value === 'opencode-cli'
        || value === 'gemini-cli'
        || value === 'claude-code-cli'
        || value === 'cursor-cli';
}
function normalizeLegacyProviderAlias(providerId) {
    if (providerId === 'chat' || providerId === 'llm') {
        return 'theia';
    }
    if (providerId === 'provider' || providerId === 'cli') {
        return 'command';
    }
    if (providerId === 'codex_cli') {
        return 'codex';
    }
    return providerId;
}
function isE2eMockProviderId(providerId) {
    return providerId === 'e2e-mock' || providerId === 'mock-llm' || providerId === 'mock-llm-provider';
}
function e2eMockLlmProviderEnabled() {
    var provider = (process.env.FLOW_AGENT_PROVIDER || '').trim().toLowerCase();
    return isE2eMockProviderId(provider);
}
function customProviderCommandEnvName(providerId) {
    var sanitized = providerId.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    return "FLOW_AGENT_PROVIDER_".concat(sanitized || 'CUSTOM', "_COMMAND");
}
function stateIdForMessage(context) {
    return context.state.id || context.workload.stateId;
}
function errorToMessage(error) {
    return error instanceof Error ? error.message : String(error);
}

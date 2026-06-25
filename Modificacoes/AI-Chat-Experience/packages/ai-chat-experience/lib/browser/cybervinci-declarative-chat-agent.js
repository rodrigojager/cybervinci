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
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
exports.CyberVinciDelegatingChatAgent = exports.CyberVinciDeclarativePromptChatAgent = void 0;
var common_1 = require("@theia/ai-chat/lib/common");
var ai_core_1 = require("@theia/ai-core");
var chat_model_1 = require("@theia/ai-chat/lib/common/chat-model");
var inversify_1 = require("@theia/core/shared/inversify");
var cybervinci_native_agent_adapter_1 = require("./cybervinci-native-agent-adapter");
var cybervinci_playbook_runtime_1 = require("./cybervinci-playbook-runtime");
var DEFAULT_LANGUAGE_MODEL_REQUIREMENT = {
    purpose: 'chat',
    identifier: 'default/code'
};
var CyberVinciDeclarativePromptChatAgent = function () {
    var _classDecorators = [(0, inversify_1.injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _classSuper = common_1.AbstractStreamParsingChatAgent;
    var _toolInvocationRegistry_decorators;
    var _toolInvocationRegistry_initializers = [];
    var _toolInvocationRegistry_extraInitializers = [];
    var CyberVinciDeclarativePromptChatAgent = _classThis = /** @class */ (function (_super) {
        __extends(CyberVinciDeclarativePromptChatAgent_1, _super);
        function CyberVinciDeclarativePromptChatAgent_1() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.toolInvocationRegistry = __runInitializers(_this, _toolInvocationRegistry_initializers, void 0);
            _this.id = (__runInitializers(_this, _toolInvocationRegistry_extraInitializers), 'CyberVinciDeclarativePromptAgent');
            _this.name = 'CyberVinci Declarative Prompt Agent';
            _this.description = '';
            _this.iconClass = 'codicon codicon-copilot';
            _this.tags = ['Chat', 'CyberVinci'];
            _this.locations = common_1.ChatAgentLocation.ALL;
            _this.variables = [];
            _this.functions = [];
            _this.agentSpecificVariables = [];
            _this.languageModelRequirements = [DEFAULT_LANGUAGE_MODEL_REQUIREMENT];
            _this.defaultLanguageModelPurpose = 'chat';
            _this.modeDefinitions = [];
            _this.configuredToolIds = [];
            _this.promptVariantIds = [];
            return _this;
        }
        CyberVinciDeclarativePromptChatAgent_1.prototype.configure = function (definition, agencyProfileContent) {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j;
            this.id = definition.id;
            this.name = definition.name;
            this.description = (_a = definition.description) !== null && _a !== void 0 ? _a : '';
            this.iconClass = (_b = definition.iconClass) !== null && _b !== void 0 ? _b : this.iconClass;
            this.tags = (_c = definition.tags) !== null && _c !== void 0 ? _c : this.tags;
            this.locations = normalizeLocations(definition.locations);
            this.languageModelRequirements = normalizeLanguageModelRequirements(definition.languageModelRequirements);
            this.variables = (_d = definition.variables) !== null && _d !== void 0 ? _d : [];
            this.functions = (_f = (_e = definition.functions) !== null && _e !== void 0 ? _e : definition.tools) !== null && _f !== void 0 ? _f : [];
            this.configuredToolIds = (_g = definition.tools) !== null && _g !== void 0 ? _g : [];
            this.systemPromptId = "".concat(definition.id, ".system");
            var promptSet = this.toPromptSet(definition, agencyProfileContent);
            this.prompts = [promptSet];
            this.defaultPromptVariantId = promptSet.defaultVariant.id;
            this.promptVariantIds = __spreadArray([
                promptSet.defaultVariant.id
            ], ((_h = promptSet.variants) !== null && _h !== void 0 ? _h : []).map(function (variant) { return variant.id; }), true);
            this.modeDefinitions = (_j = definition.modes) !== null && _j !== void 0 ? _j : this.toModes(definition.promptVariants, promptSet.defaultVariant.id);
        };
        Object.defineProperty(CyberVinciDeclarativePromptChatAgent_1.prototype, "modes", {
            get: function () {
                var effective = this.getEffectiveVariantIdWithMode(undefined);
                return this.modeDefinitions.map(function (mode) { return (__assign(__assign({}, mode), { isDefault: mode.id === effective })); });
            },
            enumerable: false,
            configurable: true
        });
        CyberVinciDeclarativePromptChatAgent_1.prototype.toPromptSet = function (definition, agencyProfileContent) {
            var _this = this;
            var _a, _b;
            var promptVariants = ((_a = definition.promptVariants) === null || _a === void 0 ? void 0 : _a.length) ? definition.promptVariants : undefined;
            if (!promptVariants) {
                var template = this.decorateTemplate(definition.prompt || definition.description || "You are ".concat(definition.name, "."), agencyProfileContent);
                return {
                    id: this.systemPromptId,
                    defaultVariant: {
                        id: "".concat(definition.id, ".system.default"),
                        name: definition.name,
                        description: definition.description,
                        template: template
                    }
                };
            }
            var defaultVariant = (_b = promptVariants.find(function (variant) { return variant.isDefault; })) !== null && _b !== void 0 ? _b : promptVariants[0];
            return {
                id: this.systemPromptId,
                defaultVariant: this.toBasePromptVariant(defaultVariant, agencyProfileContent),
                variants: promptVariants
                    .filter(function (variant) { return variant.id !== defaultVariant.id; })
                    .map(function (variant) { return _this.toBasePromptVariant(variant, agencyProfileContent); })
            };
        };
        CyberVinciDeclarativePromptChatAgent_1.prototype.toBasePromptVariant = function (variant, agencyProfileContent) {
            return {
                id: variant.id,
                name: variant.name,
                description: variant.description,
                template: this.decorateTemplate(variant.template, agencyProfileContent)
            };
        };
        CyberVinciDeclarativePromptChatAgent_1.prototype.decorateTemplate = function (template, agencyProfileContent) {
            var sections = [];
            if (agencyProfileContent === null || agencyProfileContent === void 0 ? void 0 : agencyProfileContent.trim()) {
                sections.push(this.buildAgentProfileInstructionBlock(agencyProfileContent));
            }
            sections.push(template.trim());
            if (this.configuredToolIds.length > 0) {
                sections.push(__spreadArray([
                    'The following CyberVinci tools are available when relevant:'
                ], this.configuredToolIds.map(function (toolId) { return "~{".concat(toolId, "}"); }), true).join('\n'));
            }
            return sections.filter(Boolean).join('\n\n');
        };
        CyberVinciDeclarativePromptChatAgent_1.prototype.buildAgentProfileInstructionBlock = function (agencyProfileContent) {
            var _a;
            var profileName = (_a = this.readMarkdownFrontmatterString(agencyProfileContent, 'name')) !== null && _a !== void 0 ? _a : 'selected CyberVinci Agent profile';
            var content = this.stripMarkdownFrontmatter(agencyProfileContent);
            return [
                "You are operating as the selected CyberVinci Agent profile: ".concat(profileName, "."),
                "When the user asks what role or agent you are using in this chat, answer as \"".concat(profileName, "\". Do not say the profile is merely optional guidance."),
                'Use the following private Agent profile instructions as authoritative role and behavior instructions for this turn. These instructions do not override higher-priority system, safety, or tool-access constraints.',
                '<agent_profile_instructions>',
                content,
                '</agent_profile_instructions>'
            ].join('\n');
        };
        CyberVinciDeclarativePromptChatAgent_1.prototype.stripMarkdownFrontmatter = function (content) {
            return content.replace(/^\uFEFF?---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').trim();
        };
        CyberVinciDeclarativePromptChatAgent_1.prototype.readMarkdownFrontmatterString = function (content, key) {
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
        CyberVinciDeclarativePromptChatAgent_1.prototype.toModes = function (variants, defaultVariantId) {
            if (!(variants === null || variants === void 0 ? void 0 : variants.length)) {
                return [];
            }
            return variants.map(function (variant) {
                var _a;
                return ({
                    id: variant.id,
                    name: (_a = variant.name) !== null && _a !== void 0 ? _a : variant.id,
                    isDefault: variant.id === defaultVariantId
                });
            });
        };
        CyberVinciDeclarativePromptChatAgent_1.prototype.getSystemMessageDescription = function (context) {
            return __awaiter(this, void 0, void 0, function () {
                var modeId, fragmentId, variantInfo, resolvedPrompt, functionDescriptions, _i, _a, toolId, tool;
                var _b, _c, _d, _e, _f;
                return __generator(this, function (_g) {
                    switch (_g.label) {
                        case 0:
                            modeId = common_1.ChatSessionContext.is(context) ? (_b = context.request) === null || _b === void 0 ? void 0 : _b.request.modeId : undefined;
                            fragmentId = this.getEffectiveVariantIdWithMode(modeId);
                            if (!fragmentId) {
                                return [2 /*return*/, undefined];
                            }
                            variantInfo = this.promptService.getPromptVariantInfo(this.systemPromptId, modeId);
                            return [4 /*yield*/, this.promptService.getResolvedPromptFragment(fragmentId, undefined, context)];
                        case 1:
                            resolvedPrompt = _g.sent();
                            if (!resolvedPrompt) {
                                return [2 /*return*/, undefined];
                            }
                            functionDescriptions = new Map((_c = resolvedPrompt.functionDescriptions) !== null && _c !== void 0 ? _c : []);
                            for (_i = 0, _a = this.configuredToolIds; _i < _a.length; _i++) {
                                toolId = _a[_i];
                                tool = (_d = this.toolInvocationRegistry) === null || _d === void 0 ? void 0 : _d.getFunction(toolId);
                                if (tool) {
                                    functionDescriptions.set(tool.id, tool);
                                }
                            }
                            return [2 /*return*/, {
                                    text: resolvedPrompt.text,
                                    functionDescriptions: functionDescriptions.size > 0 ? functionDescriptions : undefined,
                                    promptVariantId: (_e = variantInfo === null || variantInfo === void 0 ? void 0 : variantInfo.variantId) !== null && _e !== void 0 ? _e : fragmentId,
                                    isPromptVariantCustomized: (_f = variantInfo === null || variantInfo === void 0 ? void 0 : variantInfo.isCustomized) !== null && _f !== void 0 ? _f : false
                                }];
                    }
                });
            });
        };
        CyberVinciDeclarativePromptChatAgent_1.prototype.getEffectiveVariantIdWithMode = function (modeId) {
            if (modeId && this.promptVariantIds.includes(modeId)) {
                return modeId;
            }
            var selected = this.systemPromptId ? this.promptService.getEffectiveVariantId(this.systemPromptId) : undefined;
            return selected !== null && selected !== void 0 ? selected : this.defaultPromptVariantId;
        };
        return CyberVinciDeclarativePromptChatAgent_1;
    }(_classSuper));
    __setFunctionName(_classThis, "CyberVinciDeclarativePromptChatAgent");
    (function () {
        var _a;
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create((_a = _classSuper[Symbol.metadata]) !== null && _a !== void 0 ? _a : null) : void 0;
        _toolInvocationRegistry_decorators = [(0, inversify_1.inject)(ai_core_1.ToolInvocationRegistry), (0, inversify_1.optional)()];
        __esDecorate(null, null, _toolInvocationRegistry_decorators, { kind: "field", name: "toolInvocationRegistry", static: false, private: false, access: { has: function (obj) { return "toolInvocationRegistry" in obj; }, get: function (obj) { return obj.toolInvocationRegistry; }, set: function (obj, value) { obj.toolInvocationRegistry = value; } }, metadata: _metadata }, _toolInvocationRegistry_initializers, _toolInvocationRegistry_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        CyberVinciDeclarativePromptChatAgent = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return CyberVinciDeclarativePromptChatAgent = _classThis;
}();
exports.CyberVinciDeclarativePromptChatAgent = CyberVinciDeclarativePromptChatAgent;
var CyberVinciDelegatingChatAgent = /** @class */ (function () {
    function CyberVinciDelegatingChatAgent(definition, getSourceAgent, playbookRuntime) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        this.getSourceAgent = getSourceAgent;
        this.playbookRuntime = playbookRuntime;
        this.agentSpecificVariables = [];
        this.prompts = [];
        this.nativeAdapter = new cybervinci_native_agent_adapter_1.CyberVinciNativeTheiaAgentAdapter(getSourceAgent);
        this.id = definition.id;
        this.name = definition.name;
        this.sourceAgentId = (_a = definition.sourceAgentId) !== null && _a !== void 0 ? _a : definition.id;
        this.defaultPlaybook = (_b = definition.defaultPlaybook) !== null && _b !== void 0 ? _b : nativeAgentPlaybookId(this.sourceAgentId);
        this.playbooks = (_c = definition.playbooks) !== null && _c !== void 0 ? _c : [this.defaultPlaybook];
        var source = this.getSourceAgent(this.sourceAgentId);
        this.description = (_e = (_d = definition.description) !== null && _d !== void 0 ? _d : source === null || source === void 0 ? void 0 : source.description) !== null && _e !== void 0 ? _e : '';
        this.iconClass = (_f = definition.iconClass) !== null && _f !== void 0 ? _f : source === null || source === void 0 ? void 0 : source.iconClass;
        this.locations = normalizeLocations(definition.locations, source === null || source === void 0 ? void 0 : source.locations);
        this.tags = (_g = definition.tags) !== null && _g !== void 0 ? _g : source === null || source === void 0 ? void 0 : source.tags;
        this.variables = (_j = (_h = definition.variables) !== null && _h !== void 0 ? _h : source === null || source === void 0 ? void 0 : source.variables) !== null && _j !== void 0 ? _j : [];
        this.functions = (_l = (_k = definition.functions) !== null && _k !== void 0 ? _k : source === null || source === void 0 ? void 0 : source.functions) !== null && _l !== void 0 ? _l : [];
        this.languageModelRequirements = normalizeLanguageModelRequirements(definition.languageModelRequirements, source === null || source === void 0 ? void 0 : source.languageModelRequirements);
        this.modes = (_m = definition.modes) !== null && _m !== void 0 ? _m : source === null || source === void 0 ? void 0 : source.modes;
    }
    CyberVinciDelegatingChatAgent.prototype.invoke = function (request) {
        return __awaiter(this, void 0, void 0, function () {
            var cause_1, error;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 5, , 6]);
                        if (!this.playbookRuntime) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.playbookRuntime.invokeAgentTurn({
                                version: 'cybervinci.agent/v1',
                                id: this.id,
                                kind: 'delegate',
                                name: this.name,
                                sourceAgentId: this.sourceAgentId,
                                defaultPlaybook: this.defaultPlaybook,
                                playbooks: this.playbooks
                            }, request, function () { return _this.nativeAdapter.invoke({ request: request, sourceAgentId: _this.sourceAgentId }); })];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 2: return [4 /*yield*/, this.nativeAdapter.invoke({ request: request, sourceAgentId: this.sourceAgentId })];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4: return [3 /*break*/, 6];
                    case 5:
                        cause_1 = _a.sent();
                        error = new Error("Source chat agent '".concat(this.sourceAgentId, "' is not available for '").concat(this.id, "'."), { cause: cause_1 });
                        request.response.response.addContent(new chat_model_1.ErrorChatResponseContentImpl(error));
                        request.response.error(error);
                        return [3 /*break*/, 6];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    return CyberVinciDelegatingChatAgent;
}());
exports.CyberVinciDelegatingChatAgent = CyberVinciDelegatingChatAgent;
function nativeAgentPlaybookId(agentId) {
    return "".concat(cybervinci_playbook_runtime_1.CYBERVINCI_NATIVE_AGENT_PLAYBOOK_PREFIX).concat(agentId);
}
function normalizeLocations(rawLocations, fallback) {
    if (!(rawLocations === null || rawLocations === void 0 ? void 0 : rawLocations.length)) {
        return fallback !== null && fallback !== void 0 ? fallback : common_1.ChatAgentLocation.ALL;
    }
    return rawLocations.map(function (location) { return common_1.ChatAgentLocation.fromRaw(location); });
}
function normalizeLanguageModelRequirements(requirements, fallback) {
    if (!(requirements === null || requirements === void 0 ? void 0 : requirements.length)) {
        return fallback !== null && fallback !== void 0 ? fallback : [DEFAULT_LANGUAGE_MODEL_REQUIREMENT];
    }
    return requirements.map(function (requirement) { return ({
        purpose: requirement.purpose,
        identifier: requirement.identifier,
        name: requirement.name,
        vendor: requirement.vendor,
        version: requirement.version,
        family: requirement.family,
        tokens: requirement.tokens
    }); });
}

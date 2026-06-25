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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
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
exports.CyberVinciToolRegistry = void 0;
var common_1 = require("@cybervinci/flow/lib/common");
var common_2 = require("@cybervinci/memory/lib/common");
var ai_runtime_frontend_service_1 = require("@cybervinci/ai-runtime/lib/browser/ai-runtime-frontend-service");
var common_3 = require("@theia/ai-chat/lib/common");
var chat_model_1 = require("@theia/ai-chat/lib/common/chat-model");
var ai_core_1 = require("@theia/ai-core");
var mcp_server_manager_1 = require("@theia/ai-mcp/lib/common/mcp-server-manager");
var mcp_preferences_1 = require("@theia/ai-mcp/lib/common/mcp-preferences");
var openpencil_design_command_service_1 = require("@cybervinci/openpencil-extension/lib/browser/openpencil-design-command-service");
var browser_1 = require("@theia/core/lib/browser");
var core_1 = require("@theia/core");
var quick_pick_service_1 = require("@theia/core/lib/common/quick-pick-service");
var common_4 = require("@theia/core/lib/common");
var file_uri_1 = require("@theia/core/lib/common/file-uri");
var preferences_1 = require("@theia/core/lib/common/preferences");
var uri_1 = require("@theia/core/lib/common/uri");
var browser_2 = require("@theia/workspace/lib/browser");
var inversify_1 = require("@theia/core/shared/inversify");
var common_5 = require("../common");
var cybervinci_ai_chat_experience_preferences_1 = require("./cybervinci-ai-chat-experience-preferences");
var FLOW_START_WORKFLOW_COMMAND = 'cybervinci.flow.startWorkflow';
var FLOW_RUN_DYNAMIC_WORKFLOW_COMMAND = 'cybervinci.flow.runDynamicWorkflow';
var NATIVE_AGENT_PLAYBOOK_PREFIX = 'native-agent.';
var CyberVinciToolRegistry = function () {
    var _classDecorators = [(0, inversify_1.injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _service_decorators;
    var _service_initializers = [];
    var _service_extraInitializers = [];
    var _commandService_decorators;
    var _commandService_initializers = [];
    var _commandService_extraInitializers = [];
    var _preferenceService_decorators;
    var _preferenceService_initializers = [];
    var _preferenceService_extraInitializers = [];
    var _logger_decorators;
    var _logger_initializers = [];
    var _logger_extraInitializers = [];
    var _flowService_decorators;
    var _flowService_initializers = [];
    var _flowService_extraInitializers = [];
    var _memoryService_decorators;
    var _memoryService_initializers = [];
    var _memoryService_extraInitializers = [];
    var _aiRuntime_decorators;
    var _aiRuntime_initializers = [];
    var _aiRuntime_extraInitializers = [];
    var _toolInvocationRegistry_decorators;
    var _toolInvocationRegistry_initializers = [];
    var _toolInvocationRegistry_extraInitializers = [];
    var _chatAgentService_decorators;
    var _chatAgentService_initializers = [];
    var _chatAgentService_extraInitializers = [];
    var _mcpService_decorators;
    var _mcpService_initializers = [];
    var _mcpService_extraInitializers = [];
    var _openPencilDesignCommandService_decorators;
    var _openPencilDesignCommandService_initializers = [];
    var _openPencilDesignCommandService_extraInitializers = [];
    var _shell_decorators;
    var _shell_initializers = [];
    var _shell_extraInitializers = [];
    var _workspaceService_decorators;
    var _workspaceService_initializers = [];
    var _workspaceService_extraInitializers = [];
    var _quickPickService_decorators;
    var _quickPickService_initializers = [];
    var _quickPickService_extraInitializers = [];
    var CyberVinciToolRegistry = _classThis = /** @class */ (function () {
        function CyberVinciToolRegistry_1() {
            this.service = __runInitializers(this, _service_initializers, void 0);
            this.commandService = (__runInitializers(this, _service_extraInitializers), __runInitializers(this, _commandService_initializers, void 0));
            this.preferenceService = (__runInitializers(this, _commandService_extraInitializers), __runInitializers(this, _preferenceService_initializers, void 0));
            this.logger = (__runInitializers(this, _preferenceService_extraInitializers), __runInitializers(this, _logger_initializers, void 0));
            this.flowService = (__runInitializers(this, _logger_extraInitializers), __runInitializers(this, _flowService_initializers, void 0));
            this.memoryService = (__runInitializers(this, _flowService_extraInitializers), __runInitializers(this, _memoryService_initializers, void 0));
            this.aiRuntime = (__runInitializers(this, _memoryService_extraInitializers), __runInitializers(this, _aiRuntime_initializers, void 0));
            this.toolInvocationRegistry = (__runInitializers(this, _aiRuntime_extraInitializers), __runInitializers(this, _toolInvocationRegistry_initializers, void 0));
            this.chatAgentService = (__runInitializers(this, _toolInvocationRegistry_extraInitializers), __runInitializers(this, _chatAgentService_initializers, void 0));
            this.mcpService = (__runInitializers(this, _chatAgentService_extraInitializers), __runInitializers(this, _mcpService_initializers, void 0));
            this.openPencilDesignCommandService = (__runInitializers(this, _mcpService_extraInitializers), __runInitializers(this, _openPencilDesignCommandService_initializers, void 0));
            this.shell = (__runInitializers(this, _openPencilDesignCommandService_extraInitializers), __runInitializers(this, _shell_initializers, void 0));
            this.workspaceService = (__runInitializers(this, _shell_extraInitializers), __runInitializers(this, _workspaceService_initializers, void 0));
            this.quickPickService = (__runInitializers(this, _workspaceService_extraInitializers), __runInitializers(this, _quickPickService_initializers, void 0));
            this.toolsById = __runInitializers(this, _quickPickService_extraInitializers);
        }
        CyberVinciToolRegistry_1.prototype.setPlaybookRunner = function (runner) {
            this.playbookRunner = runner;
        };
        CyberVinciToolRegistry_1.prototype.setPlaybookResumer = function (resumer) {
            this.playbookResumer = resumer;
        };
        CyberVinciToolRegistry_1.prototype.getTool = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getToolsById()];
                        case 1: return [2 /*return*/, (_a.sent()).get(id)];
                    }
                });
            });
        };
        CyberVinciToolRegistry_1.prototype.executeTool = function (toolId, context) {
            return __awaiter(this, void 0, void 0, function () {
                var tool, approval;
                var _a, _b, _c, _d, _e, _f;
                return __generator(this, function (_g) {
                    switch (_g.label) {
                        case 0: return [4 /*yield*/, this.getTool(toolId)];
                        case 1:
                            tool = _g.sent();
                            if (!tool) {
                                if ((_a = this.toolInvocationRegistry) === null || _a === void 0 ? void 0 : _a.getFunction(toolId)) {
                                    return [2 /*return*/, this.executeTheiaTool(toolId, context)];
                                }
                                return [2 /*return*/, { ok: false, message: "Tool '".concat(toolId, "' is not configured.") }];
                            }
                            return [4 /*yield*/, this.ensureToolPolicyApproved(tool, context)];
                        case 2:
                            approval = _g.sent();
                            if (!approval.ok) {
                                return [2 /*return*/, approval];
                            }
                            if (tool.implementation === 'composite' || ((_b = tool.entry) === null || _b === void 0 ? void 0 : _b.type) === 'composite' || ((_c = tool.steps) === null || _c === void 0 ? void 0 : _c.length)) {
                                return [2 /*return*/, this.executeCompositeTool(tool, context)];
                            }
                            if (tool.implementation === 'theia-tool' || tool.theiaToolId) {
                                return [2 /*return*/, this.executeTheiaTool((_f = (_d = tool.theiaToolId) !== null && _d !== void 0 ? _d : (_e = tool.entry) === null || _e === void 0 ? void 0 : _e.ref) !== null && _f !== void 0 ? _f : tool.id, context)];
                            }
                            if (tool.implementation === 'command' || tool.command) {
                                return [2 /*return*/, this.executeCommandTool(tool.id, context)];
                            }
                            return [2 /*return*/, this.executeHostTool(tool.id, context)];
                    }
                });
            });
        };
        CyberVinciToolRegistry_1.prototype.getToolsById = function () {
            return __awaiter(this, void 0, void 0, function () {
                var tools;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!!this.toolsById) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.service.listTools()];
                        case 1:
                            tools = _a.sent();
                            this.toolsById = new Map(tools.map(function (tool) { return [tool.id, tool]; }));
                            _a.label = 2;
                        case 2: return [2 /*return*/, this.toolsById];
                    }
                });
            });
        };
        CyberVinciToolRegistry_1.prototype.executeHostTool = function (toolId, context) {
            return __awaiter(this, void 0, void 0, function () {
                var _a;
                var _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            _a = toolId;
                            switch (_a) {
                                case 'core.agent.invoke': return [3 /*break*/, 1];
                                case 'system.agent.native.invoke': return [3 /*break*/, 1];
                                case 'system.chat.direct': return [3 /*break*/, 1];
                                case 'core.agent.describe': return [3 /*break*/, 4];
                                case 'system.agent.describe': return [3 /*break*/, 4];
                                case 'core.agent.preflight': return [3 /*break*/, 5];
                                case 'system.agent.preflight': return [3 /*break*/, 5];
                                case 'system.agent.nativeMcpRequirements': return [3 /*break*/, 6];
                                case 'core.chat.respond': return [3 /*break*/, 7];
                                case 'core.chat.stop': return [3 /*break*/, 8];
                                case 'core.playbook.list': return [3 /*break*/, 9];
                                case 'core.playbook.run': return [3 /*break*/, 10];
                                case 'core.playbook.resume': return [3 /*break*/, 11];
                                case 'core.playbook.compileToFlowDraft': return [3 /*break*/, 12];
                                case 'core.playbook.createFlowFromPlaybook': return [3 /*break*/, 13];
                                case 'core.provider.status': return [3 /*break*/, 14];
                                case 'system.provider.ready': return [3 /*break*/, 14];
                                case 'core.preferences.get': return [3 /*break*/, 15];
                                case 'core.preferences.set': return [3 /*break*/, 16];
                                case 'core.flow.listWorkflows': return [3 /*break*/, 17];
                                case 'core.flow.listPendingGates': return [3 /*break*/, 18];
                                case 'system.flow.gates.pending': return [3 /*break*/, 18];
                                case 'core.flow.approveGate': return [3 /*break*/, 19];
                                case 'system.flow.gate.decide': return [3 /*break*/, 19];
                                case 'core.flow.startRun': return [3 /*break*/, 20];
                                case 'system.flow.saved.available': return [3 /*break*/, 20];
                                case 'core.flow.runDynamicWorkflow': return [3 /*break*/, 21];
                                case 'system.flow.dynamic.run': return [3 /*break*/, 21];
                                case 'core.flow.runAiAuthoredDynamicWorkflow': return [3 /*break*/, 22];
                                case 'system.flow.aiAuthoring.runWorkflow': return [3 /*break*/, 22];
                                case 'core.flow.runAiAuthoringDraft': return [3 /*break*/, 23];
                                case 'system.flow.aiAuthoringDraft.run': return [3 /*break*/, 23];
                                case 'core.flow.createWorkflowFromAiAuthoringDraft': return [3 /*break*/, 24];
                                case 'system.flow.aiAuthoringDraft.createWorkflow': return [3 /*break*/, 24];
                                case 'core.flow.getAiAuthoringSpec': return [3 /*break*/, 25];
                                case 'system.flow.aiAuthoringSpec': return [3 /*break*/, 25];
                                case 'core.memory.searchContext': return [3 /*break*/, 26];
                                case 'system.memory.searchContext': return [3 /*break*/, 26];
                                case 'core.memory.proposeCandidate': return [3 /*break*/, 27];
                                case 'system.memory.proposeCandidate': return [3 /*break*/, 27];
                                case 'core.memory.requestWriteApproval': return [3 /*break*/, 28];
                                case 'system.memory.requestWriteApproval': return [3 /*break*/, 28];
                                case 'core.memory.writeApproved': return [3 /*break*/, 29];
                                case 'system.memory.writeApproved': return [3 /*break*/, 29];
                                case 'core.theiaTool.list': return [3 /*break*/, 30];
                                case 'system.theiaTool.list': return [3 /*break*/, 30];
                                case 'core.theiaTool.invoke': return [3 /*break*/, 31];
                                case 'system.theiaTool.invoke': return [3 /*break*/, 31];
                                case 'system.mcp.hasServer': return [3 /*break*/, 32];
                                case 'system.mcp.isServerStarted': return [3 /*break*/, 33];
                                case 'system.mcp.configureServer': return [3 /*break*/, 34];
                                case 'system.mcp.ensureServersStarted': return [3 /*break*/, 35];
                                case 'system.canvas.captureCurrentDocument': return [3 /*break*/, 36];
                                case 'system.canvas.captureScreenshot': return [3 /*break*/, 37];
                                case 'system.canvas.collectLayoutDiagnostics': return [3 /*break*/, 38];
                                case 'system.canvas.detectOverlaps': return [3 /*break*/, 39];
                                case 'system.canvas.detectOffCanvasNodes': return [3 /*break*/, 40];
                                case 'system.canvas.detectTextOverflow': return [3 /*break*/, 41];
                                case 'system.canvas.validateFooterPresence': return [3 /*break*/, 42];
                                case 'system.canvas.validateCloneCompleteness': return [3 /*break*/, 43];
                                case 'system.canvas.applyOperations': return [3 /*break*/, 44];
                                case 'system.canvas.resizeToFit': return [3 /*break*/, 45];
                                case 'system.canvas.reorderLayers': return [3 /*break*/, 46];
                                case 'system.canvas.getReferenceFromKnownSite': return [3 /*break*/, 47];
                                case 'system.vision.judge': return [3 /*break*/, 48];
                            }
                            return [3 /*break*/, 49];
                        case 1:
                            if (!context.invokeNativeAgent) return [3 /*break*/, 3];
                            return [4 /*yield*/, context.invokeNativeAgent()];
                        case 2:
                            _d.sent();
                            context.state['core.agent.invoke.invoked'] = true;
                            return [2 /*return*/, { ok: true, stop: true, value: { route: 'native-agent', invoked: true } }];
                        case 3: return [2 /*return*/, { ok: true, value: { route: 'agent' } }];
                        case 4: return [2 /*return*/, this.describeAgent(context)];
                        case 5: return [2 /*return*/, this.preflightAgent(context)];
                        case 6: return [2 /*return*/, this.nativeAgentMcpRequirements(context)];
                        case 7: return [2 /*return*/, this.respondInChat(context)];
                        case 8: return [2 /*return*/, { ok: true, stop: true, message: 'Chat turn stopped by playbook.' }];
                        case 9: return [2 /*return*/, this.listPlaybooks()];
                        case 10: return [2 /*return*/, this.runPlaybookTool(context)];
                        case 11: return [2 /*return*/, this.resumePlaybookTool(context)];
                        case 12: return [2 /*return*/, this.compilePlaybookToFlowDraft(context)];
                        case 13: return [2 /*return*/, this.createFlowFromPlaybook(context)];
                        case 14: return [2 /*return*/, this.providerStatus(context)];
                        case 15: return [2 /*return*/, {
                                ok: true,
                                value: this.preferenceService.get(String((_b = context.input.key) !== null && _b !== void 0 ? _b : ''), context.input.defaultValue)
                            }];
                        case 16: return [2 /*return*/, this.setPreference(context)];
                        case 17: return [2 /*return*/, this.listFlowWorkflows(context)];
                        case 18: return [2 /*return*/, this.listPendingFlowGates(context)];
                        case 19: return [2 /*return*/, this.approveFlowGate(context)];
                        case 20: return [2 /*return*/, this.startFlowRun(context)];
                        case 21: return [2 /*return*/, this.runDynamicWorkflow(context)];
                        case 22: return [2 /*return*/, this.runAiAuthoredDynamicWorkflow(context)];
                        case 23: return [2 /*return*/, this.runAiAuthoringDraft(context)];
                        case 24: return [2 /*return*/, this.createWorkflowFromAiAuthoringDraft(context)];
                        case 25: return [2 /*return*/, this.getFlowAiAuthoringSpec()];
                        case 26: return [2 /*return*/, this.searchMemoryContext(context)];
                        case 27: return [2 /*return*/, this.proposeMemoryCandidate(context)];
                        case 28: return [2 /*return*/, this.requestMemoryWriteApproval(context)];
                        case 29: return [2 /*return*/, this.writeApprovedMemory(context)];
                        case 30: return [2 /*return*/, this.listTheiaTools()];
                        case 31: return [2 /*return*/, this.executeTheiaTool(String((_c = context.input.toolId) !== null && _c !== void 0 ? _c : '').trim(), context)];
                        case 32: return [2 /*return*/, this.mcpHasServer(context)];
                        case 33: return [2 /*return*/, this.mcpIsServerStarted(context)];
                        case 34: return [2 /*return*/, this.mcpConfigureServers(context, false)];
                        case 35: return [2 /*return*/, this.mcpConfigureServers(context, true)];
                        case 36: return [2 /*return*/, this.captureCanvasDocument(context)];
                        case 37: return [2 /*return*/, this.captureCanvasVisualSnapshot(context)];
                        case 38: return [2 /*return*/, this.collectCanvasLayoutDiagnostics(context)];
                        case 39: return [2 /*return*/, this.collectCanvasLayoutDiagnostics(context, ['overlap'])];
                        case 40: return [2 /*return*/, this.collectCanvasLayoutDiagnostics(context, ['off-canvas'])];
                        case 41: return [2 /*return*/, this.collectCanvasLayoutDiagnostics(context, ['text-overflow'])];
                        case 42: return [2 /*return*/, this.collectCanvasLayoutDiagnostics(context, ['footer'])];
                        case 43: return [2 /*return*/, this.collectCanvasLayoutDiagnostics(context, ['clone-completeness'])];
                        case 44: return [2 /*return*/, this.applyCanvasOperations(context)];
                        case 45: return [2 /*return*/, this.resizeCanvasNodesToFit(context)];
                        case 46: return [2 /*return*/, this.reorderCanvasLayers(context)];
                        case 47: return [2 /*return*/, this.getCanvasKnownSiteReference(context)];
                        case 48: return [2 /*return*/, this.runVisionJudge(context)];
                        case 49: return [2 /*return*/, this.executeSystemStub(toolId)];
                    }
                });
            });
        };
        CyberVinciToolRegistry_1.prototype.describeAgent = function (context) {
            return __awaiter(this, void 0, void 0, function () {
                var agents, agent, runtimeAgent, runtimeCapabilityProfile, capabilityProfile, functionBridge, playbookId, value, diagnostics;
                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
                return __generator(this, function (_p) {
                    switch (_p.label) {
                        case 0: return [4 /*yield*/, this.service.getDeclarativeChatAgentManifest()];
                        case 1:
                            agents = (_a = (_p.sent()).agents) !== null && _a !== void 0 ? _a : [];
                            agent = this.resolveAgentFromContext(agents, context);
                            runtimeAgent = this.resolveRuntimeChatAgent(agent, context);
                            runtimeCapabilityProfile = this.runtimeAgentCapabilityProfile(runtimeAgent);
                            capabilityProfile = agent
                                ? this.agentCapabilityProfile(agent, runtimeCapabilityProfile)
                                : runtimeCapabilityProfile;
                            functionBridge = this.functionBridgeStatus(capabilityProfile.functions);
                            playbookId = String((_d = (_c = (_b = context.input.playbookId) !== null && _b !== void 0 ? _b : context.playbookId) !== null && _c !== void 0 ? _c : agent === null || agent === void 0 ? void 0 : agent.defaultPlaybook) !== null && _d !== void 0 ? _d : '').trim();
                            value = {
                                agent: agent ? {
                                    id: agent.id,
                                    name: agent.name,
                                    kind: agent.kind,
                                    category: agent.category,
                                    source: agent.source,
                                    sourceAgentId: agent.sourceAgentId,
                                    description: agent.description,
                                    defaultPlaybook: agent.defaultPlaybook,
                                    playbooks: (_e = agent.playbooks) !== null && _e !== void 0 ? _e : [],
                                    tools: (_f = agent.tools) !== null && _f !== void 0 ? _f : [],
                                    variables: (_g = agent.variables) !== null && _g !== void 0 ? _g : [],
                                    functions: (_h = agent.functions) !== null && _h !== void 0 ? _h : [],
                                    modes: ((_j = agent.modes) !== null && _j !== void 0 ? _j : []).map(function (mode) { return mode.id; }),
                                    preserveNative: agent.preserveNative,
                                    capabilityProfile: capabilityProfile,
                                    runtimeAgent: this.runtimeAgentSummary(runtimeAgent),
                                    theiaFunctionBridge: functionBridge,
                                    migrationStatus: this.agentMigrationStatus(agent, capabilityProfile, playbookId, runtimeAgent)
                                } : undefined,
                                request: {
                                    requestId: context.requestId,
                                    playbookId: playbookId,
                                    stateId: context.stateId,
                                    promptLength: String((_k = context.input.prompt) !== null && _k !== void 0 ? _k : '').length
                                }
                            };
                            diagnostics = !agent && this.expectsAgentInContext(context)
                                ? ['No selected agent was found in the CyberVinci declarative agent catalog.']
                                : [];
                            return [2 /*return*/, {
                                    ok: true,
                                    value: value,
                                    diagnostics: diagnostics,
                                    message: agent
                                        ? "Resolved agent '".concat(agent.name, "' for playbook '").concat(playbookId || '<none>', "' with ").concat(((_l = capabilityProfile.functions) !== null && _l !== void 0 ? _l : []).length, " function(s), ").concat(((_m = capabilityProfile.promptSets) !== null && _m !== void 0 ? _m : []).length, " prompt set(s), and ").concat(((_o = capabilityProfile.modes) !== null && _o !== void 0 ? _o : []).length, " mode(s).")
                                        : 'No selected agent was resolved for this playbook run.'
                                }];
                    }
                });
            });
        };
        CyberVinciToolRegistry_1.prototype.agentMigrationStatus = function (agent, capabilityProfile, playbookId, runtimeAgent) {
            var _a, _b, _c, _d, _e, _f;
            var nativeLike = agent.kind === 'native' || !!agent.sourceAgentId;
            if (!nativeLike) {
                return {
                    strategy: 'declarative',
                    autonomousPlaybook: true,
                    nativeDelegate: false,
                    deterministicCoverage: ['playbook']
                };
            }
            var hasMcpRequirementRefs = ((_a = capabilityProfile.mcpPromptRefs) !== null && _a !== void 0 ? _a : []).length > 0;
            var explicitMigrationStatus = agent.migrationStatus;
            if (explicitMigrationStatus && typeof explicitMigrationStatus === 'object' && !Array.isArray(explicitMigrationStatus)) {
                return __assign(__assign({}, explicitMigrationStatus), { selectedPlaybook: (_b = explicitMigrationStatus.selectedPlaybook) !== null && _b !== void 0 ? _b : (playbookId || agent.defaultPlaybook), sourceAgentId: (_d = (_c = explicitMigrationStatus.sourceAgentId) !== null && _c !== void 0 ? _c : agent.sourceAgentId) !== null && _d !== void 0 ? _d : agent.id, sourceAgentAvailable: !!runtimeAgent });
            }
            return {
                strategy: 'playbook-autonomous',
                autonomousPlaybook: true,
                nativeDelegate: false,
                nativeDelegateFallback: false,
                selectedPlaybook: playbookId || agent.defaultPlaybook,
                preservesNativeInvoke: ((_e = agent.preserveNative) === null || _e === void 0 ? void 0 : _e.invoke) === true,
                sourceAgentId: (_f = agent.sourceAgentId) !== null && _f !== void 0 ? _f : agent.id,
                sourceAgentAvailable: !!runtimeAgent,
                deterministicCoverage: __spreadArray(__spreadArray([
                    'agent.describe',
                    'agent.preflight',
                    'agent.nativeMcpRequirements'
                ], (hasMcpRequirementRefs ? ['mcp.configureOrStartDecision'] : []), true), [
                    'ai.autonomousResponse'
                ], false),
                migrationReady: {
                    editableUserCopy: true,
                    capabilityProfile: true,
                    replacementStillUsesNativeDelegate: false,
                    fallbackStillUsesNativeDelegate: false
                }
            };
        };
        CyberVinciToolRegistry_1.prototype.preflightAgent = function (context) {
            return __awaiter(this, void 0, void 0, function () {
                var diagnostics, agents, agent, expectsAgent, runtimeAgent, capabilityProfile, functionBridge, mcpFunctionRefs, missingNonMcpFunctions, playbookId, playbookResolution, _a, preserve, _i, _b, key, provider, toolCount, ready;
                var _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
                return __generator(this, function (_q) {
                    switch (_q.label) {
                        case 0:
                            diagnostics = [];
                            return [4 /*yield*/, this.service.getDeclarativeChatAgentManifest()];
                        case 1:
                            agents = (_c = (_q.sent()).agents) !== null && _c !== void 0 ? _c : [];
                            agent = this.resolveAgentFromContext(agents, context);
                            expectsAgent = this.expectsAgentInContext(context);
                            runtimeAgent = this.resolveRuntimeChatAgent(agent, context);
                            capabilityProfile = agent
                                ? this.agentCapabilityProfile(agent, this.runtimeAgentCapabilityProfile(runtimeAgent))
                                : this.runtimeAgentCapabilityProfile(runtimeAgent);
                            functionBridge = this.functionBridgeStatus(capabilityProfile.functions);
                            mcpFunctionRefs = new Set((_d = capabilityProfile.mcpPromptRefs) !== null && _d !== void 0 ? _d : []);
                            missingNonMcpFunctions = functionBridge.missingFunctions.filter(function (id) { return !id.startsWith('mcp_') && !mcpFunctionRefs.has(id); });
                            if (!agent && expectsAgent) {
                                diagnostics.push('Agent preflight could not resolve the selected declarative/native agent.');
                            }
                            playbookId = String((_g = (_f = (_e = context.input.playbookId) !== null && _e !== void 0 ? _e : context.playbookId) !== null && _f !== void 0 ? _f : agent === null || agent === void 0 ? void 0 : agent.defaultPlaybook) !== null && _g !== void 0 ? _g : '').trim();
                            if (!playbookId) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.resolvePreflightPlaybook(playbookId)];
                        case 2:
                            _a = _q.sent();
                            return [3 /*break*/, 4];
                        case 3:
                            _a = undefined;
                            _q.label = 4;
                        case 4:
                            playbookResolution = _a;
                            if (playbookId && !(playbookResolution === null || playbookResolution === void 0 ? void 0 : playbookResolution.playbook)) {
                                diagnostics.push("Agent preflight could not find playbook '".concat(playbookId, "'."));
                            }
                            if ((agent === null || agent === void 0 ? void 0 : agent.kind) === 'native') {
                                preserve = (_h = agent.preserveNative) !== null && _h !== void 0 ? _h : {};
                                for (_i = 0, _b = ['modes', 'prompts', 'variables', 'functions', 'languageModelRequirements']; _i < _b.length; _i++) {
                                    key = _b[_i];
                                    if (preserve[key] !== true) {
                                        diagnostics.push("Native agent '".concat(agent.id, "' does not declare preserveNative.").concat(key, "=true."));
                                    }
                                }
                            }
                            if ((agent === null || agent === void 0 ? void 0 : agent.kind) === 'native' && !runtimeAgent) {
                                diagnostics.push("Native source agent '".concat((_j = agent.sourceAgentId) !== null && _j !== void 0 ? _j : agent.id, "' is not registered in Theia ChatAgentService."));
                            }
                            if (functionBridge.declaredFunctions.length > 0 && !functionBridge.available) {
                                diagnostics.push('Theia ToolInvocationRegistry is not available for native agent function checks.');
                            }
                            if (missingNonMcpFunctions.length > 0) {
                                diagnostics.push("Native agent '".concat((_l = (_k = agent === null || agent === void 0 ? void 0 : agent.id) !== null && _k !== void 0 ? _k : playbookId) !== null && _l !== void 0 ? _l : '<unknown>', "' references missing Theia function(s): ").concat(missingNonMcpFunctions.join(', '), "."));
                            }
                            return [4 /*yield*/, this.providerStatus(context)];
                        case 5:
                            provider = _q.sent();
                            if (!provider.ok && provider.message) {
                                diagnostics.push(provider.message);
                            }
                            toolCount = this.toolInvocationRegistry ? this.toolInvocationRegistry.getAllFunctions().length : 0;
                            ready = diagnostics.length === 0;
                            return [2 /*return*/, {
                                    ok: ready,
                                    value: {
                                        ready: ready,
                                        agentId: agent === null || agent === void 0 ? void 0 : agent.id,
                                        sourceAgentId: agent === null || agent === void 0 ? void 0 : agent.sourceAgentId,
                                        playbookId: playbookId,
                                        playbookResolution: playbookResolution ? {
                                            id: (_m = playbookResolution.playbook) === null || _m === void 0 ? void 0 : _m.id,
                                            generated: playbookResolution.generated,
                                            fallbackPlaybookId: playbookResolution.fallbackPlaybookId
                                        } : undefined,
                                        runtimeAgent: this.runtimeAgentSummary(runtimeAgent),
                                        capabilityProfile: capabilityProfile,
                                        theiaFunctionBridge: functionBridge,
                                        nativeCapabilityCheck: {
                                            ok: missingNonMcpFunctions.length === 0 && (functionBridge.declaredFunctions.length === 0 || functionBridge.available),
                                            missingNonMcpFunctions: missingNonMcpFunctions,
                                            mcpFunctionRefs: __spreadArray([], mcpFunctionRefs, true),
                                            mcpMissingFunctions: functionBridge.missingFunctions.filter(function (id) { return id.startsWith('mcp_') || mcpFunctionRefs.has(id); })
                                        },
                                        provider: provider.value,
                                        theiaToolBridge: {
                                            available: !!this.toolInvocationRegistry,
                                            toolCount: toolCount
                                        }
                                    },
                                    diagnostics: diagnostics,
                                    message: ready
                                        ? "Agent preflight passed for '".concat((_p = (_o = agent === null || agent === void 0 ? void 0 : agent.name) !== null && _o !== void 0 ? _o : playbookId) !== null && _p !== void 0 ? _p : 'chat', "' with ").concat(functionBridge.registeredFunctions.length, "/").concat(functionBridge.declaredFunctions.length, " declared function(s) registered.")
                                        : "Agent preflight found ".concat(diagnostics.length, " issue(s).")
                                }];
                    }
                });
            });
        };
        CyberVinciToolRegistry_1.prototype.resolvePreflightPlaybook = function (playbookId) {
            return __awaiter(this, void 0, void 0, function () {
                var playbook;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.service.getPlaybook(playbookId)];
                        case 1:
                            playbook = _a.sent();
                            if (playbook) {
                                return [2 /*return*/, { playbook: playbook, generated: false }];
                            }
                            if (!playbookId.startsWith(NATIVE_AGENT_PLAYBOOK_PREFIX)) {
                                return [2 /*return*/, { generated: false }];
                            }
                            return [2 /*return*/, {
                                    playbook: this.createRuntimeAutonomousPlaybook(playbookId),
                                    generated: true,
                                    fallbackPlaybookId: undefined
                                }];
                    }
                });
            });
        };
        CyberVinciToolRegistry_1.prototype.createRuntimeAutonomousPlaybook = function (playbookId) {
            var _a;
            var agentName = (_a = this.agentIdFromNativePlaybook(playbookId)) !== null && _a !== void 0 ? _a : 'Native';
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
                states: [
                    { id: 'describe-agent', type: 'tool', tool: 'core.agent.describe', transitions: [{ to: 'preflight' }] },
                    { id: 'preflight', type: 'tool', tool: 'core.agent.preflight', transitions: [{ to: 'check-native-requirements' }] },
                    { id: 'check-native-requirements', type: 'tool', tool: 'system.agent.nativeMcpRequirements', transitions: [{ to: 'answer-runtime-agent' }] },
                    {
                        id: 'answer-runtime-agent',
                        type: 'ai',
                        agent: agentName,
                        prompt: "You are ".concat(agentName, ". Answer the user's request through the CyberVinci autonomous playbook runtime. Do not invoke or delegate to the original Theia native agent.\n\nUser request:\n").concat('${input.prompt}'),
                        input: {
                            prompt: '${input.prompt}',
                            agentId: '${input.agentId}',
                            sourceAgentId: '${input.sourceAgentId}'
                        },
                        saveAs: 'runtimeAgentAnswer',
                        transitions: [{ to: 'runtime-agent-response' }]
                    },
                    { id: 'runtime-agent-response', type: 'response', text: '${state.runtimeAgentAnswer}' }
                ]
            };
        };
        CyberVinciToolRegistry_1.prototype.nativeAgentMcpRequirements = function (context) {
            return __awaiter(this, void 0, void 0, function () {
                var agents, agent, runtimeAgent, capabilityProfile, requirement, selectedGroup, statuses, requiresConfiguration, requiresUserConfiguration, requiresStart, recommendedAction, canAutoEnsure, mode, result;
                var _a, _b, _c, _d, _e, _f, _g;
                return __generator(this, function (_h) {
                    switch (_h.label) {
                        case 0: return [4 /*yield*/, this.service.getDeclarativeChatAgentManifest()];
                        case 1:
                            agents = (_a = (_h.sent()).agents) !== null && _a !== void 0 ? _a : [];
                            agent = this.resolveAgentFromContext(agents, context);
                            runtimeAgent = this.resolveRuntimeChatAgent(agent, context);
                            capabilityProfile = agent
                                ? this.agentCapabilityProfile(agent, this.runtimeAgentCapabilityProfile(runtimeAgent))
                                : this.runtimeAgentCapabilityProfile(runtimeAgent);
                            requirement = this.nativeMcpRequirementForAgent(agent, capabilityProfile, context);
                            if (!requirement || !requirement.groups.length) {
                                return [2 /*return*/, {
                                        ok: true,
                                        value: {
                                            agentId: agent === null || agent === void 0 ? void 0 : agent.id,
                                            sourceAgentId: agent === null || agent === void 0 ? void 0 : agent.sourceAgentId,
                                            groups: [],
                                            selectedGroupId: undefined,
                                            requirements: [],
                                            requiresConfiguration: false,
                                            requiresStart: false
                                        },
                                        message: "No known native MCP requirements for '".concat((_c = (_b = agent === null || agent === void 0 ? void 0 : agent.name) !== null && _b !== void 0 ? _b : context.playbookId) !== null && _c !== void 0 ? _c : 'chat', "'.")
                                    }];
                            }
                            selectedGroup = this.selectNativeMcpRequirementGroup(requirement.groups, context);
                            return [4 /*yield*/, this.readMcpRequirementStatuses(selectedGroup.servers)];
                        case 2:
                            statuses = _h.sent();
                            requiresConfiguration = statuses.some(function (status) { return !status.configured; });
                            requiresUserConfiguration = selectedGroup.requiresUserSecret === true
                                && statuses.some(function (status) { return !status.configured || status.hasPlaceholderSecret; });
                            requiresStart = statuses.some(function (status) { return !status.started; });
                            recommendedAction = requiresUserConfiguration
                                ? 'configure'
                                : requiresStart
                                    ? 'start'
                                    : 'none';
                            canAutoEnsure = !requiresUserConfiguration;
                            mode = String((_e = (_d = context.input.mode) !== null && _d !== void 0 ? _d : context.input.action) !== null && _e !== void 0 ? _e : 'report').trim().toLowerCase();
                            if (!(mode === 'configure' || mode === 'ensure' || mode === 'start')) return [3 /*break*/, 6];
                            if ((mode === 'ensure' || mode === 'start') && !canAutoEnsure) {
                                return [2 /*return*/, {
                                        ok: false,
                                        value: {
                                            ok: false,
                                            agentId: agent === null || agent === void 0 ? void 0 : agent.id,
                                            sourceAgentId: agent === null || agent === void 0 ? void 0 : agent.sourceAgentId,
                                            selectedGroupId: selectedGroup.id,
                                            selectedGroupLabel: selectedGroup.label,
                                            requirements: statuses,
                                            recommendedAction: recommendedAction,
                                            requiresConfiguration: requiresConfiguration,
                                            requiresUserConfiguration: requiresUserConfiguration,
                                            requiresStart: requiresStart,
                                            canAutoEnsure: canAutoEnsure
                                        },
                                        message: "".concat(selectedGroup.label, " requires user configuration before it can be started.")
                                    }];
                            }
                            return [4 /*yield*/, this.mcpConfigureServers(__assign(__assign({}, context), { input: __assign(__assign({}, context.input), { servers: selectedGroup.servers }) }), mode !== 'configure')];
                        case 3:
                            result = _h.sent();
                            if (!(mode === 'configure' && context.input.openSettings !== false)) return [3 /*break*/, 5];
                            return [4 /*yield*/, this.openMcpSettingsPreference()];
                        case 4:
                            _h.sent();
                            _h.label = 5;
                        case 5: return [2 /*return*/, __assign(__assign({}, result), { value: {
                                    ok: result.ok,
                                    agentId: agent === null || agent === void 0 ? void 0 : agent.id,
                                    sourceAgentId: agent === null || agent === void 0 ? void 0 : agent.sourceAgentId,
                                    selectedGroupId: selectedGroup.id,
                                    selectedGroupLabel: selectedGroup.label,
                                    before: statuses,
                                    configured: (_f = result.value) === null || _f === void 0 ? void 0 : _f.configured,
                                    started: (_g = result.value) === null || _g === void 0 ? void 0 : _g.started,
                                    recommendedAction: recommendedAction,
                                    requiresConfiguration: requiresConfiguration,
                                    requiresUserConfiguration: requiresUserConfiguration,
                                    requiresStart: requiresStart,
                                    canAutoEnsure: canAutoEnsure
                                } })];
                        case 6: return [2 /*return*/, {
                                ok: true,
                                value: {
                                    agentId: agent === null || agent === void 0 ? void 0 : agent.id,
                                    sourceAgentId: agent === null || agent === void 0 ? void 0 : agent.sourceAgentId,
                                    agentName: requirement.agentName,
                                    available: !!this.mcpService,
                                    groups: requirement.groups.map(function (group) {
                                        var _a;
                                        return ({
                                            id: group.id,
                                            label: group.label,
                                            default: group.default === true,
                                            requiresUserSecret: group.requiresUserSecret === true,
                                            promptVariantId: group.promptVariantId,
                                            promptRefs: (_a = group.promptRefs) !== null && _a !== void 0 ? _a : [],
                                            servers: group.servers.map(function (server) { return server.name; })
                                        });
                                    }),
                                    selectedGroupId: selectedGroup.id,
                                    selectedGroupLabel: selectedGroup.label,
                                    requirements: statuses,
                                    requiresConfiguration: requiresConfiguration,
                                    requiresUserConfiguration: requiresUserConfiguration,
                                    requiresStart: requiresStart,
                                    recommendedAction: recommendedAction,
                                    canAutoEnsure: canAutoEnsure
                                },
                                message: "Native MCP requirements for '".concat(requirement.agentName, "': configured ").concat(statuses.filter(function (status) { return status.configured; }).length, "/").concat(statuses.length, ", started ").concat(statuses.filter(function (status) { return status.started; }).length, "/").concat(statuses.length, ".")
                            }];
                    }
                });
            });
        };
        CyberVinciToolRegistry_1.prototype.nativeMcpRequirementForAgent = function (agent, capabilityProfile, context) {
            var _this = this;
            var _a, _b, _c, _d, _e, _f, _g;
            var agentId = String((_d = (_c = (_b = (_a = agent === null || agent === void 0 ? void 0 : agent.sourceAgentId) !== null && _a !== void 0 ? _a : agent === null || agent === void 0 ? void 0 : agent.id) !== null && _b !== void 0 ? _b : context.input.sourceAgentId) !== null && _c !== void 0 ? _c : context.input.agentId) !== null && _d !== void 0 ? _d : '').trim();
            var promptRefs = (_e = capabilityProfile.mcpPromptRefs) !== null && _e !== void 0 ? _e : [];
            var groups = new Map();
            var addGroup = function (group) {
                var _a, _b;
                var previous = groups.get(group.id);
                if (!previous) {
                    groups.set(group.id, group);
                    return;
                }
                groups.set(group.id, __assign(__assign(__assign({}, previous), group), { promptRefs: _this.uniqueStrings(__spreadArray(__spreadArray([], ((_a = previous.promptRefs) !== null && _a !== void 0 ? _a : []), true), ((_b = group.promptRefs) !== null && _b !== void 0 ? _b : []), true)), servers: __spreadArray(__spreadArray([], previous.servers, true), group.servers, true).filter(function (server, index, servers) {
                        return servers.findIndex(function (candidate) { return candidate.name === server.name; }) === index;
                    }) }));
            };
            for (var _i = 0, promptRefs_1 = promptRefs; _i < promptRefs_1.length; _i++) {
                var promptRef = promptRefs_1[_i];
                var group = this.nativeMcpRequirementGroupForPromptRef(promptRef);
                if (group) {
                    addGroup(group);
                }
            }
            if (agentId === 'GitHub') {
                addGroup(this.githubMcpRequirementGroup());
            }
            if (agentId === 'AppTester') {
                addGroup(this.chromeDevToolsMcpRequirementGroup());
                addGroup(this.playwrightMcpRequirementGroup());
            }
            var resolvedGroups = __spreadArray([], groups.values(), true);
            if (!resolvedGroups.length) {
                return undefined;
            }
            return {
                agentId: (_f = agent === null || agent === void 0 ? void 0 : agent.id) !== null && _f !== void 0 ? _f : agentId,
                agentName: (_g = agent === null || agent === void 0 ? void 0 : agent.name) !== null && _g !== void 0 ? _g : agentId,
                sourceAgentId: agent === null || agent === void 0 ? void 0 : agent.sourceAgentId,
                groups: resolvedGroups
            };
        };
        CyberVinciToolRegistry_1.prototype.nativeMcpRequirementGroupForPromptRef = function (promptRef) {
            switch (promptRef) {
                case 'mcp_github_tools':
                    return this.githubMcpRequirementGroup();
                case 'mcp_chrome-devtools_tools':
                    return this.chromeDevToolsMcpRequirementGroup();
                case 'mcp_playwright_tools':
                case 'mcp_playwright-visual_tools':
                    return this.playwrightMcpRequirementGroup();
                default:
                    return undefined;
            }
        };
        CyberVinciToolRegistry_1.prototype.githubMcpRequirementGroup = function () {
            return {
                id: 'github',
                label: 'GitHub MCP',
                default: true,
                requiresUserSecret: true,
                promptRefs: ['mcp_github_tools'],
                servers: [{
                        name: 'github',
                        serverUrl: 'https://api.githubcopilot.com/mcp/',
                        serverAuthToken: 'your_github_token_here'
                    }]
            };
        };
        CyberVinciToolRegistry_1.prototype.chromeDevToolsMcpRequirementGroup = function () {
            return {
                id: 'chrome-devtools',
                label: 'Chrome DevTools MCP',
                default: true,
                promptRefs: ['mcp_chrome-devtools_tools'],
                servers: [{
                        name: 'chrome-devtools',
                        command: 'npx',
                        args: ['-y', 'chrome-devtools-mcp@latest', '--cdp-endpoint', 'http://127.0.0.1:9222', '--no-usage-statistics']
                    }]
            };
        };
        CyberVinciToolRegistry_1.prototype.playwrightMcpRequirementGroup = function () {
            return {
                id: 'playwright',
                label: 'Playwright MCP',
                promptVariantId: 'app-tester-system-playwright',
                promptRefs: ['mcp_playwright_tools', 'mcp_playwright-visual_tools'],
                servers: [
                    {
                        name: 'playwright',
                        command: 'npx',
                        args: ['-y', '@playwright/mcp@latest', '--cdp-endpoint', 'http://localhost:9222/']
                    },
                    {
                        name: 'playwright-visual',
                        command: 'npx',
                        args: ['-y', '@playwright/mcp@latest', '--vision', '--cdp-endpoint', 'http://localhost:9222/']
                    }
                ]
            };
        };
        CyberVinciToolRegistry_1.prototype.selectNativeMcpRequirementGroup = function (groups, context) {
            var _a, _b, _c, _d, _e, _f;
            var requested = String((_d = (_c = (_b = (_a = context.input.groupId) !== null && _a !== void 0 ? _a : context.input.mcpGroupId) !== null && _b !== void 0 ? _b : context.input.promptVariantId) !== null && _c !== void 0 ? _c : context.input.variantId) !== null && _d !== void 0 ? _d : '').trim();
            return (_f = (_e = groups.find(function (group) {
                var _a;
                return group.id === requested
                    || group.promptVariantId === requested
                    || ((_a = group.promptRefs) !== null && _a !== void 0 ? _a : []).includes(requested);
            })) !== null && _e !== void 0 ? _e : groups.find(function (group) { return group.default; })) !== null && _f !== void 0 ? _f : groups[0];
        };
        CyberVinciToolRegistry_1.prototype.readMcpRequirementStatuses = function (servers) {
            return __awaiter(this, void 0, void 0, function () {
                var statuses, _i, servers_1, server, configured, started, _a, stored, serverPreference, authToken;
                var _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            if (!this.mcpService) {
                                return [2 /*return*/, servers.map(function (server) { return ({
                                        name: server.name,
                                        configured: false,
                                        started: false
                                    }); })];
                            }
                            statuses = [];
                            _i = 0, servers_1 = servers;
                            _c.label = 1;
                        case 1:
                            if (!(_i < servers_1.length)) return [3 /*break*/, 7];
                            server = servers_1[_i];
                            return [4 /*yield*/, this.mcpService.hasServer(server.name)];
                        case 2:
                            configured = _c.sent();
                            if (!configured) return [3 /*break*/, 4];
                            return [4 /*yield*/, this.mcpService.isServerStarted(server.name)];
                        case 3:
                            _a = _c.sent();
                            return [3 /*break*/, 5];
                        case 4:
                            _a = false;
                            _c.label = 5;
                        case 5:
                            started = _a;
                            stored = (_b = this.preferenceService.get(mcp_preferences_1.MCP_SERVERS_PREF, {})) !== null && _b !== void 0 ? _b : {};
                            serverPreference = stored[server.name];
                            authToken = typeof (serverPreference === null || serverPreference === void 0 ? void 0 : serverPreference.serverAuthToken) === 'string'
                                ? serverPreference.serverAuthToken
                                : typeof server.serverAuthToken === 'string'
                                    ? String(server.serverAuthToken)
                                    : undefined;
                            statuses.push({
                                name: server.name,
                                configured: configured,
                                started: started,
                                hasPlaceholderSecret: this.isPlaceholderMcpSecret(authToken)
                            });
                            _c.label = 6;
                        case 6:
                            _i++;
                            return [3 /*break*/, 1];
                        case 7: return [2 /*return*/, statuses];
                    }
                });
            });
        };
        CyberVinciToolRegistry_1.prototype.isPlaceholderMcpSecret = function (value) {
            if (!value) {
                return false;
            }
            return /your_.*token_here|<.*token.*>|github-pat-or-app-token/i.test(value);
        };
        CyberVinciToolRegistry_1.prototype.openMcpSettingsPreference = function () {
            return __awaiter(this, void 0, void 0, function () {
                var error_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, this.commandService.executeCommand('preferences:open', mcp_preferences_1.MCP_SERVERS_PREF)];
                        case 1:
                            _a.sent();
                            return [3 /*break*/, 3];
                        case 2:
                            error_1 = _a.sent();
                            this.logger.debug("Failed to open MCP settings preference '".concat(mcp_preferences_1.MCP_SERVERS_PREF, "'."), error_1);
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            });
        };
        CyberVinciToolRegistry_1.prototype.providerStatus = function (context) {
            return __awaiter(this, void 0, void 0, function () {
                var workspacePath, _a, defaultExecution, providers, requestedExecution, selectedExecution_1, _i, _b, _c, key, value, requestedProviderId_1, requestedModel, provider, modelIds, modelReady, ready, error_2, message;
                var _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
                return __generator(this, function (_p) {
                    switch (_p.label) {
                        case 0:
                            if (!this.aiRuntime) {
                                return [2 /*return*/, {
                                        ok: false,
                                        value: { ready: false, reason: 'ai-runtime-unavailable' },
                                        message: 'CyberVinci AI Runtime is not available.'
                                    }];
                            }
                            _p.label = 1;
                        case 1:
                            _p.trys.push([1, 3, , 4]);
                            workspacePath = (_f = (_e = (_d = this.workspaceService) === null || _d === void 0 ? void 0 : _d.workspace) === null || _e === void 0 ? void 0 : _e.resource) === null || _f === void 0 ? void 0 : _f.path.fsPath();
                            return [4 /*yield*/, Promise.all([
                                    this.aiRuntime.getDefaultExecution({ workspacePath: workspacePath, includeUnavailable: true }),
                                    this.aiRuntime.listProviders({ workspacePath: workspacePath, includeUnavailable: true })
                                ])];
                        case 2:
                            _a = _p.sent(), defaultExecution = _a[0], providers = _a[1];
                            requestedExecution = this.readAiExecutionSelection(context);
                            selectedExecution_1 = __assign({}, defaultExecution);
                            for (_i = 0, _b = Object.entries(requestedExecution); _i < _b.length; _i++) {
                                _c = _b[_i], key = _c[0], value = _c[1];
                                if (value !== undefined && (typeof value !== 'string' || value.trim())) {
                                    selectedExecution_1[key] = value;
                                }
                            }
                            if (!selectedExecution_1.providerId && selectedExecution_1.runtime && selectedExecution_1.modelProvider) {
                                selectedExecution_1.providerId = "".concat(selectedExecution_1.runtime, ":").concat(selectedExecution_1.modelProvider);
                            }
                            requestedProviderId_1 = String((_g = selectedExecution_1.providerId) !== null && _g !== void 0 ? _g : '').trim();
                            requestedModel = String((_h = selectedExecution_1.model) !== null && _h !== void 0 ? _h : '').trim();
                            provider = (_j = providers.find(function (candidate) {
                                return candidate.id === requestedProviderId_1
                                    || (!!selectedExecution_1.runtime && !!selectedExecution_1.modelProvider
                                        && candidate.runtime === selectedExecution_1.runtime
                                        && candidate.modelProvider === selectedExecution_1.modelProvider);
                            })) !== null && _j !== void 0 ? _j : providers.find(function (candidate) { return candidate.available; });
                            modelIds = new Set(__spreadArray(__spreadArray([], ((_k = provider === null || provider === void 0 ? void 0 : provider.models) !== null && _k !== void 0 ? _k : []), true), ((_l = provider === null || provider === void 0 ? void 0 : provider.modelMetadata) !== null && _l !== void 0 ? _l : []).map(function (model) { return model.id; }).filter(Boolean), true));
                            modelReady = !requestedModel || !modelIds.size || modelIds.has(requestedModel);
                            ready = !!(provider === null || provider === void 0 ? void 0 : provider.available) && modelReady;
                            return [2 /*return*/, {
                                    ok: ready,
                                    value: {
                                        ready: ready,
                                        selected: selectedExecution_1,
                                        requestedProviderId: requestedProviderId_1,
                                        requestedModel: requestedModel,
                                        provider: provider ? {
                                            id: provider.id,
                                            label: provider.label,
                                            runtime: provider.runtime,
                                            modelProvider: provider.modelProvider,
                                            available: provider.available,
                                            authenticated: provider.authenticated,
                                            defaultModel: provider.defaultModel,
                                            configurationRequired: (_m = provider.configurationRequired) !== null && _m !== void 0 ? _m : [],
                                            message: provider.message
                                        } : undefined,
                                        providerCount: providers.length,
                                        modelReady: modelReady
                                    },
                                    message: ready
                                        ? "Provider '".concat((_o = provider === null || provider === void 0 ? void 0 : provider.label) !== null && _o !== void 0 ? _o : requestedProviderId_1, "' is ready.")
                                        : "Provider/model is not ready".concat(provider ? " for '".concat(provider.label, "'") : '', ".")
                                }];
                        case 3:
                            error_2 = _p.sent();
                            message = error_2 instanceof Error ? error_2.message : String(error_2);
                            return [2 /*return*/, {
                                    ok: false,
                                    value: { ready: false, reason: message },
                                    message: message
                                }];
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        CyberVinciToolRegistry_1.prototype.respondInChat = function (context) {
            var _a, _b, _c;
            var message = String((_c = (_b = (_a = context.input.message) !== null && _a !== void 0 ? _a : context.input.text) !== null && _b !== void 0 ? _b : context.input.prompt) !== null && _c !== void 0 ? _c : '').trim();
            var request = this.asChatRequest(context.chatRequest);
            if (message && request) {
                request.response.response.addContent(new chat_model_1.MarkdownChatResponseContentImpl(message));
            }
            return {
                ok: true,
                stop: true,
                value: message,
                message: message
            };
        };
        CyberVinciToolRegistry_1.prototype.resolveAgentFromContext = function (agents, context) {
            var candidates = this.contextAgentHints(context);
            var _loop_1 = function (id) {
                var agent = agents.find(function (candidate) {
                    return candidate.id === id
                        || candidate.sourceAgentId === id
                        || candidate.defaultPlaybook === context.playbookId;
                });
                if (agent) {
                    return { value: agent };
                }
            };
            for (var _i = 0, candidates_1 = candidates; _i < candidates_1.length; _i++) {
                var id = candidates_1[_i];
                var state_1 = _loop_1(id);
                if (typeof state_1 === "object")
                    return state_1.value;
            }
            if (candidates.length > 0) {
                var runtimeAgent = this.resolveRuntimeChatAgent(undefined, context);
                if (runtimeAgent) {
                    return this.toRuntimeNativeAgentDefinition(runtimeAgent);
                }
            }
            if (context.playbookId) {
                var agent = agents.find(function (candidate) { var _a; return candidate.defaultPlaybook === context.playbookId || ((_a = candidate.playbooks) !== null && _a !== void 0 ? _a : []).includes(context.playbookId); });
                if (agent) {
                    return agent;
                }
            }
            var runtimeAgentByPlaybook = this.resolveRuntimeChatAgent(undefined, context);
            if (runtimeAgentByPlaybook) {
                return this.toRuntimeNativeAgentDefinition(runtimeAgentByPlaybook);
            }
            return undefined;
        };
        CyberVinciToolRegistry_1.prototype.contextAgentHints = function (context) {
            var stateAgent = typeof context.state.agent === 'object' && context.state.agent !== null
                ? context.state.agent
                : {};
            return this.uniqueStrings([
                context.input.agentId,
                context.input.sourceAgentId,
                this.agentIdFromNativePlaybook(context.playbookId),
                stateAgent.id,
                stateAgent.sourceAgentId
            ]);
        };
        CyberVinciToolRegistry_1.prototype.expectsAgentInContext = function (context) {
            var _a;
            return this.contextAgentHints(context).length > 0 || !!((_a = context.playbookId) === null || _a === void 0 ? void 0 : _a.startsWith(NATIVE_AGENT_PLAYBOOK_PREFIX));
        };
        CyberVinciToolRegistry_1.prototype.resolveRuntimeChatAgent = function (agent, context) {
            if (!this.chatAgentService) {
                return undefined;
            }
            var ids = this.uniqueStrings(__spreadArray([
                agent === null || agent === void 0 ? void 0 : agent.sourceAgentId,
                agent === null || agent === void 0 ? void 0 : agent.id,
                this.agentIdFromNativePlaybook(context.playbookId)
            ], this.contextAgentHints(context), true));
            var allAgents = this.chatAgentService.getAllAgents();
            var _loop_2 = function (id) {
                var runtimeAgent = allAgents.find(function (candidate) { return candidate.id === id; });
                if (runtimeAgent) {
                    return { value: runtimeAgent };
                }
            };
            for (var _i = 0, ids_1 = ids; _i < ids_1.length; _i++) {
                var id = ids_1[_i];
                var state_2 = _loop_2(id);
                if (typeof state_2 === "object")
                    return state_2.value;
            }
            return undefined;
        };
        CyberVinciToolRegistry_1.prototype.agentIdFromNativePlaybook = function (playbookId) {
            if (!(playbookId === null || playbookId === void 0 ? void 0 : playbookId.startsWith(NATIVE_AGENT_PLAYBOOK_PREFIX))) {
                return undefined;
            }
            return playbookId.slice(NATIVE_AGENT_PLAYBOOK_PREFIX.length);
        };
        CyberVinciToolRegistry_1.prototype.toRuntimeNativeAgentDefinition = function (agent) {
            var _a, _b, _c, _d;
            var defaultPlaybook = this.nativeAgentPlaybookId(agent.id);
            return {
                version: 'cybervinci.agent/v1',
                kind: 'native',
                source: 'runtime',
                id: agent.id,
                sourceAgentId: agent.id,
                name: agent.name,
                description: agent.description,
                iconClass: agent.iconClass,
                locations: (_b = (_a = agent.locations) === null || _a === void 0 ? void 0 : _a.map(function (location) { return String(location); })) !== null && _b !== void 0 ? _b : undefined,
                tags: agent.tags,
                variables: agent.variables,
                functions: agent.functions,
                defaultPlaybook: defaultPlaybook,
                playbooks: [defaultPlaybook],
                tools: ['core.agent.describe', 'core.agent.preflight', 'system.agent.nativeMcpRequirements'],
                modes: (_c = agent.modes) === null || _c === void 0 ? void 0 : _c.map(function (mode) { return ({
                    id: mode.id,
                    name: mode.name,
                    isDefault: mode.isDefault
                }); }),
                languageModelRequirements: (_d = agent.languageModelRequirements) === null || _d === void 0 ? void 0 : _d.map(function (requirement) { return ({
                    purpose: requirement.purpose,
                    identifier: requirement.identifier,
                    name: requirement.name,
                    vendor: requirement.vendor,
                    version: requirement.version,
                    family: requirement.family,
                    tokens: requirement.tokens
                }); }),
                preserveNative: {
                    invoke: false,
                    modes: true,
                    prompts: true,
                    variables: true,
                    functions: true,
                    languageModelRequirements: true
                }
            };
        };
        CyberVinciToolRegistry_1.prototype.nativeAgentPlaybookId = function (agentId) {
            return "".concat(NATIVE_AGENT_PLAYBOOK_PREFIX).concat(agentId);
        };
        CyberVinciToolRegistry_1.prototype.agentCapabilityProfile = function (agent, runtimeProfile) {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4;
            if (runtimeProfile === void 0) { runtimeProfile = {}; }
            var explicitTools = (_b = (_a = agent.capabilityProfile) === null || _a === void 0 ? void 0 : _a.tools) !== null && _b !== void 0 ? _b : [];
            var declaredTools = ((_c = agent.tools) !== null && _c !== void 0 ? _c : []).map(function (id) { return ({ id: id, source: 'catalog' }); });
            var declaredFunctionTools = this.functionToolCapabilities((_d = agent.functions) !== null && _d !== void 0 ? _d : [], 'theia');
            var byId = new Map();
            for (var _i = 0, _5 = __spreadArray(__spreadArray(__spreadArray([], declaredTools, true), declaredFunctionTools, true), explicitTools, true); _i < _5.length; _i++) {
                var tool = _5[_i];
                byId.set(tool.id, __assign(__assign({}, byId.get(tool.id)), tool));
            }
            var staticProfile = {
                tools: __spreadArray([], byId.values(), true),
                guards: (_f = (_e = agent.capabilityProfile) === null || _e === void 0 ? void 0 : _e.guards) !== null && _f !== void 0 ? _f : [],
                variables: (_j = (_h = (_g = agent.capabilityProfile) === null || _g === void 0 ? void 0 : _g.variables) !== null && _h !== void 0 ? _h : agent.variables) !== null && _j !== void 0 ? _j : [],
                agentSpecificVariables: (_l = (_k = agent.capabilityProfile) === null || _k === void 0 ? void 0 : _k.agentSpecificVariables) !== null && _l !== void 0 ? _l : [],
                functions: (_p = (_o = (_m = agent.capabilityProfile) === null || _m === void 0 ? void 0 : _m.functions) !== null && _o !== void 0 ? _o : agent.functions) !== null && _p !== void 0 ? _p : [],
                promptFunctionRefs: (_r = (_q = agent.capabilityProfile) === null || _q === void 0 ? void 0 : _q.promptFunctionRefs) !== null && _r !== void 0 ? _r : [],
                mcpPromptRefs: (_t = (_s = agent.capabilityProfile) === null || _s === void 0 ? void 0 : _s.mcpPromptRefs) !== null && _t !== void 0 ? _t : [],
                modes: (_v = (_u = agent.capabilityProfile) === null || _u === void 0 ? void 0 : _u.modes) !== null && _v !== void 0 ? _v : ((_w = agent.modes) !== null && _w !== void 0 ? _w : []).map(function (mode) { return mode.id; }),
                prompts: (_y = (_x = agent.capabilityProfile) === null || _x === void 0 ? void 0 : _x.prompts) !== null && _y !== void 0 ? _y : ((_z = agent.promptVariants) !== null && _z !== void 0 ? _z : []).map(function (prompt) { return prompt.id; }),
                promptSets: (_1 = (_0 = agent.capabilityProfile) === null || _0 === void 0 ? void 0 : _0.promptSets) !== null && _1 !== void 0 ? _1 : [],
                languageModels: (_3 = (_2 = agent.capabilityProfile) === null || _2 === void 0 ? void 0 : _2.languageModels) !== null && _3 !== void 0 ? _3 : ((_4 = agent.languageModelRequirements) !== null && _4 !== void 0 ? _4 : []).map(function (requirement) { var _a, _b; return (_b = (_a = requirement.name) !== null && _a !== void 0 ? _a : requirement.identifier) !== null && _b !== void 0 ? _b : requirement.purpose; })
            };
            return this.mergeAgentCapabilityProfiles(staticProfile, runtimeProfile);
        };
        CyberVinciToolRegistry_1.prototype.runtimeAgentCapabilityProfile = function (agent) {
            var _this = this;
            var _a, _b, _c, _d;
            if (!agent) {
                return {};
            }
            var promptSets = this.runtimePromptSets(agent);
            var promptFunctionRefs = this.runtimePromptFunctionRefs(agent);
            var mcpPromptRefs = this.runtimeMcpPromptRefs(agent);
            var functionIds = this.uniqueStrings(__spreadArray(__spreadArray([], ((_a = agent.functions) !== null && _a !== void 0 ? _a : []), true), promptFunctionRefs, true));
            return {
                variables: this.uniqueStrings((_b = agent.variables) !== null && _b !== void 0 ? _b : []),
                agentSpecificVariables: this.runtimeAgentSpecificVariables(agent),
                tools: this.functionToolCapabilities(functionIds, 'theia'),
                functions: functionIds,
                promptFunctionRefs: promptFunctionRefs,
                mcpPromptRefs: mcpPromptRefs,
                modes: this.uniqueStrings(((_c = agent.modes) !== null && _c !== void 0 ? _c : []).map(function (mode) { return mode.id; })),
                prompts: promptSets.map(function (promptSet) { return promptSet.id; }),
                promptSets: promptSets,
                languageModels: this.uniqueStrings(((_d = agent.languageModelRequirements) !== null && _d !== void 0 ? _d : []).map(function (requirement) { return _this.languageModelRequirementLabel(requirement); }))
            };
        };
        CyberVinciToolRegistry_1.prototype.functionToolCapabilities = function (functionIds, source) {
            var _a, _b;
            if (!functionIds.length) {
                return [];
            }
            var allFunctions = (_b = (_a = this.toolInvocationRegistry) === null || _a === void 0 ? void 0 : _a.getAllFunctions()) !== null && _b !== void 0 ? _b : [];
            var byId = new Map(allFunctions.map(function (tool) { return [tool.id, tool]; }));
            return this.uniqueStrings(functionIds).map(function (id) {
                var _a, _b;
                var tool = byId.get(id);
                return {
                    id: id,
                    kind: 'tool',
                    source: source,
                    required: true,
                    description: (_b = (_a = tool === null || tool === void 0 ? void 0 : tool.description) !== null && _a !== void 0 ? _a : tool === null || tool === void 0 ? void 0 : tool.name) !== null && _b !== void 0 ? _b : "Theia ToolInvocationRegistry function '".concat(id, "'.")
                };
            });
        };
        CyberVinciToolRegistry_1.prototype.runtimeAgentSummary = function (agent) {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
            if (!agent) {
                return { available: false };
            }
            return {
                available: true,
                id: agent.id,
                name: agent.name,
                description: agent.description,
                iconClass: agent.iconClass,
                tags: (_a = agent.tags) !== null && _a !== void 0 ? _a : [],
                locations: ((_b = agent.locations) !== null && _b !== void 0 ? _b : []).map(function (location) { return String(location); }),
                variables: (_d = (_c = agent.variables) === null || _c === void 0 ? void 0 : _c.length) !== null && _d !== void 0 ? _d : 0,
                agentSpecificVariables: (_f = (_e = agent.agentSpecificVariables) === null || _e === void 0 ? void 0 : _e.length) !== null && _f !== void 0 ? _f : 0,
                functions: (_h = (_g = agent.functions) === null || _g === void 0 ? void 0 : _g.length) !== null && _h !== void 0 ? _h : 0,
                promptSets: (_k = (_j = agent.prompts) === null || _j === void 0 ? void 0 : _j.length) !== null && _k !== void 0 ? _k : 0,
                modes: (_m = (_l = agent.modes) === null || _l === void 0 ? void 0 : _l.length) !== null && _m !== void 0 ? _m : 0,
                languageModelRequirements: (_p = (_o = agent.languageModelRequirements) === null || _o === void 0 ? void 0 : _o.length) !== null && _p !== void 0 ? _p : 0
            };
        };
        CyberVinciToolRegistry_1.prototype.runtimePromptSets = function (agent) {
            var _this = this;
            var _a;
            return ((_a = agent.prompts) !== null && _a !== void 0 ? _a : []).map(function (promptSet) {
                var _a;
                return ({
                    id: promptSet.id,
                    defaultVariant: _this.promptFragmentId(promptSet.defaultVariant),
                    variants: _this.uniqueStrings(((_a = promptSet.variants) !== null && _a !== void 0 ? _a : []).map(function (variant) { return _this.promptFragmentId(variant); }))
                });
            });
        };
        CyberVinciToolRegistry_1.prototype.runtimePromptFunctionRefs = function (agent) {
            var _this = this;
            var _a;
            return this.uniqueStrings(((_a = agent.prompts) !== null && _a !== void 0 ? _a : []).flatMap(function (promptSet) {
                var _a, _b;
                var templates = __spreadArray([
                    (_a = promptSet.defaultVariant) === null || _a === void 0 ? void 0 : _a.template
                ], ((_b = promptSet.variants) !== null && _b !== void 0 ? _b : []).map(function (variant) { return variant.template; }), true);
                return templates.flatMap(function (template) { return _this.extractPromptFunctionRefs(template); });
            }));
        };
        CyberVinciToolRegistry_1.prototype.runtimeMcpPromptRefs = function (agent) {
            var _this = this;
            var _a;
            return this.uniqueStrings(((_a = agent.prompts) !== null && _a !== void 0 ? _a : []).flatMap(function (promptSet) {
                var _a, _b;
                var templates = __spreadArray([
                    (_a = promptSet.defaultVariant) === null || _a === void 0 ? void 0 : _a.template
                ], ((_b = promptSet.variants) !== null && _b !== void 0 ? _b : []).map(function (variant) { return variant.template; }), true);
                return templates.flatMap(function (template) { return _this.extractMcpPromptRefs(template); });
            }));
        };
        CyberVinciToolRegistry_1.prototype.extractPromptFunctionRefs = function (template) {
            if (!template) {
                return [];
            }
            var refs = [];
            var refPattern = /~\{([^}]+)\}/g;
            var match = refPattern.exec(template);
            while (match) {
                refs.push(match[1]);
                match = refPattern.exec(template);
            }
            return refs;
        };
        CyberVinciToolRegistry_1.prototype.extractMcpPromptRefs = function (template) {
            if (!template) {
                return [];
            }
            var refs = [];
            var refPattern = /\{\{\s*prompt:(mcp_[^}\s]+_tools)\s*\}\}/g;
            var match = refPattern.exec(template);
            while (match) {
                refs.push(match[1]);
                match = refPattern.exec(template);
            }
            return refs;
        };
        CyberVinciToolRegistry_1.prototype.runtimeAgentSpecificVariables = function (agent) {
            var _a;
            return ((_a = agent.agentSpecificVariables) !== null && _a !== void 0 ? _a : []).map(function (variable) { return ({
                id: variable.name,
                description: variable.description,
                usedInPrompt: variable.usedInPrompt
            }); });
        };
        CyberVinciToolRegistry_1.prototype.promptFragmentId = function (fragment) {
            return typeof (fragment === null || fragment === void 0 ? void 0 : fragment.id) === 'string' ? fragment.id : undefined;
        };
        CyberVinciToolRegistry_1.prototype.languageModelRequirementLabel = function (requirement) {
            if (!requirement || typeof requirement !== 'object') {
                return String(requirement !== null && requirement !== void 0 ? requirement : '');
            }
            var record = requirement;
            return this.uniqueStrings([
                record.purpose,
                record.name,
                record.identifier,
                record.vendor,
                record.family,
                record.version
            ]).join(':');
        };
        CyberVinciToolRegistry_1.prototype.functionBridgeStatus = function (functionIds) {
            var _a, _b;
            var declaredFunctions = this.uniqueStrings(functionIds !== null && functionIds !== void 0 ? functionIds : []);
            var allFunctions = (_b = (_a = this.toolInvocationRegistry) === null || _a === void 0 ? void 0 : _a.getAllFunctions()) !== null && _b !== void 0 ? _b : [];
            var byId = new Map(allFunctions.map(function (tool) { return [tool.id, tool]; }));
            var functions = declaredFunctions.map(function (id) {
                var tool = byId.get(id);
                return {
                    id: id,
                    registered: !!tool,
                    name: tool === null || tool === void 0 ? void 0 : tool.name,
                    providerName: tool === null || tool === void 0 ? void 0 : tool.providerName
                };
            });
            return {
                available: !!this.toolInvocationRegistry,
                toolCount: allFunctions.length,
                declaredFunctions: declaredFunctions,
                registeredFunctions: functions.filter(function (item) { return item.registered; }).map(function (item) { return item.id; }),
                missingFunctions: functions.filter(function (item) { return !item.registered; }).map(function (item) { return item.id; }),
                functions: functions
            };
        };
        CyberVinciToolRegistry_1.prototype.mergeAgentCapabilityProfiles = function () {
            var profiles = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                profiles[_i] = arguments[_i];
            }
            var promptFunctionRefs = this.uniqueStrings(profiles.flatMap(function (profile) { var _a; return (_a = profile.promptFunctionRefs) !== null && _a !== void 0 ? _a : []; }));
            var mcpPromptRefs = this.uniqueStrings(profiles.flatMap(function (profile) { var _a; return (_a = profile.mcpPromptRefs) !== null && _a !== void 0 ? _a : []; }));
            return {
                tools: this.mergeToolCapabilities.apply(this, profiles.map(function (profile) { var _a; return (_a = profile.tools) !== null && _a !== void 0 ? _a : []; })),
                guards: this.mergeToolCapabilities.apply(this, profiles.map(function (profile) { var _a; return (_a = profile.guards) !== null && _a !== void 0 ? _a : []; })),
                variables: this.uniqueStrings(profiles.flatMap(function (profile) { var _a; return (_a = profile.variables) !== null && _a !== void 0 ? _a : []; })),
                agentSpecificVariables: this.mergeVariableCapabilities.apply(this, profiles.map(function (profile) { var _a; return (_a = profile.agentSpecificVariables) !== null && _a !== void 0 ? _a : []; })),
                functions: this.uniqueStrings(__spreadArray(__spreadArray([], profiles.flatMap(function (profile) { var _a; return (_a = profile.functions) !== null && _a !== void 0 ? _a : []; }), true), promptFunctionRefs, true)),
                promptFunctionRefs: promptFunctionRefs,
                mcpPromptRefs: mcpPromptRefs,
                modes: this.uniqueStrings(profiles.flatMap(function (profile) { var _a; return (_a = profile.modes) !== null && _a !== void 0 ? _a : []; })),
                prompts: this.uniqueStrings(profiles.flatMap(function (profile) { var _a; return (_a = profile.prompts) !== null && _a !== void 0 ? _a : []; })),
                promptSets: this.mergePromptCapabilities.apply(this, profiles.map(function (profile) { var _a; return (_a = profile.promptSets) !== null && _a !== void 0 ? _a : []; })),
                languageModels: this.uniqueStrings(profiles.flatMap(function (profile) { var _a; return (_a = profile.languageModels) !== null && _a !== void 0 ? _a : []; }))
            };
        };
        CyberVinciToolRegistry_1.prototype.mergeToolCapabilities = function () {
            var groups = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                groups[_i] = arguments[_i];
            }
            var byId = new Map();
            for (var _a = 0, _b = groups.flat(); _a < _b.length; _a++) {
                var tool = _b[_a];
                if (!tool.id) {
                    continue;
                }
                byId.set(tool.id, __assign(__assign({}, byId.get(tool.id)), tool));
            }
            return __spreadArray([], byId.values(), true);
        };
        CyberVinciToolRegistry_1.prototype.mergeVariableCapabilities = function () {
            var groups = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                groups[_i] = arguments[_i];
            }
            var byId = new Map();
            for (var _a = 0, _b = groups.flat(); _a < _b.length; _a++) {
                var variable = _b[_a];
                if (!variable.id) {
                    continue;
                }
                byId.set(variable.id, __assign(__assign({}, byId.get(variable.id)), variable));
            }
            return __spreadArray([], byId.values(), true);
        };
        CyberVinciToolRegistry_1.prototype.mergePromptCapabilities = function () {
            var _a, _b;
            var groups = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                groups[_i] = arguments[_i];
            }
            var byId = new Map();
            for (var _c = 0, _d = groups.flat(); _c < _d.length; _c++) {
                var prompt_1 = _d[_c];
                if (!prompt_1.id) {
                    continue;
                }
                var previous = byId.get(prompt_1.id);
                byId.set(prompt_1.id, __assign(__assign(__assign({}, previous), prompt_1), { variants: this.uniqueStrings(__spreadArray(__spreadArray([], ((_a = previous === null || previous === void 0 ? void 0 : previous.variants) !== null && _a !== void 0 ? _a : []), true), ((_b = prompt_1.variants) !== null && _b !== void 0 ? _b : []), true)) }));
            }
            return __spreadArray([], byId.values(), true);
        };
        CyberVinciToolRegistry_1.prototype.uniqueStrings = function (values) {
            return __spreadArray([], new Set(values
                .filter(function (value) { return typeof value === 'string'; })
                .map(function (value) { return value.trim(); })
                .filter(Boolean)), true);
        };
        CyberVinciToolRegistry_1.prototype.listPlaybooks = function () {
            return __awaiter(this, void 0, void 0, function () {
                var playbooks;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.service.listPlaybooks()];
                        case 1:
                            playbooks = _a.sent();
                            return [2 /*return*/, {
                                    ok: true,
                                    value: { playbooks: playbooks },
                                    message: "Found ".concat(playbooks.length, " CyberVinci Playbook(s).")
                                }];
                    }
                });
            });
        };
        CyberVinciToolRegistry_1.prototype.runPlaybookTool = function (context) {
            return __awaiter(this, void 0, void 0, function () {
                var playbookId;
                var _a, _b, _c;
                return __generator(this, function (_d) {
                    playbookId = String((_c = (_b = (_a = context.input.playbookId) !== null && _a !== void 0 ? _a : context.input.playbook) !== null && _b !== void 0 ? _b : context.input.id) !== null && _c !== void 0 ? _c : '').trim();
                    if (!playbookId) {
                        return [2 /*return*/, { ok: false, message: 'core.playbook.run requires playbookId, playbook, or id.' }];
                    }
                    if (!this.playbookRunner) {
                        return [2 /*return*/, { ok: false, message: 'CyberVinci Playbook runner is not registered.' }];
                    }
                    return [2 /*return*/, this.playbookRunner(playbookId, context)];
                });
            });
        };
        CyberVinciToolRegistry_1.prototype.resumePlaybookTool = function (context) {
            return __awaiter(this, void 0, void 0, function () {
                var requestId;
                var _a, _b, _c;
                return __generator(this, function (_d) {
                    requestId = String((_c = (_b = (_a = context.input.requestId) !== null && _a !== void 0 ? _a : context.input.runId) !== null && _b !== void 0 ? _b : context.requestId) !== null && _c !== void 0 ? _c : '').trim();
                    if (!requestId) {
                        return [2 /*return*/, { ok: false, message: 'core.playbook.resume requires requestId or runId.' }];
                    }
                    if (!this.playbookResumer) {
                        return [2 /*return*/, { ok: false, message: 'CyberVinci Playbook resumer is not registered.' }];
                    }
                    return [2 /*return*/, this.playbookResumer(requestId, context)];
                });
            });
        };
        CyberVinciToolRegistry_1.prototype.compilePlaybookToFlowDraft = function (context) {
            return __awaiter(this, void 0, void 0, function () {
                var playbookId, playbook, prompt, workflow, draft;
                var _a, _b, _c, _d, _e, _f;
                return __generator(this, function (_g) {
                    switch (_g.label) {
                        case 0:
                            playbookId = String((_d = (_c = (_b = (_a = context.input.playbookId) !== null && _a !== void 0 ? _a : context.input.playbook) !== null && _b !== void 0 ? _b : context.input.id) !== null && _c !== void 0 ? _c : context.playbookId) !== null && _d !== void 0 ? _d : '').trim();
                            if (!playbookId) {
                                return [2 /*return*/, { ok: false, message: 'core.playbook.compileToFlowDraft requires playbookId, playbook, or id.' }];
                            }
                            return [4 /*yield*/, this.service.getPlaybook(playbookId)];
                        case 1:
                            playbook = _g.sent();
                            if (!playbook) {
                                return [2 /*return*/, { ok: false, message: "Playbook '".concat(playbookId, "' was not found.") }];
                            }
                            prompt = String((_f = (_e = context.input.prompt) !== null && _e !== void 0 ? _e : context.state.prompt) !== null && _f !== void 0 ? _f : '').trim();
                            workflow = this.playbookToFlowWorkflow(playbook, prompt);
                            draft = {
                                version: common_1.FLOW_AI_AUTHORING_SPEC_VERSION,
                                action: 'create_workflow',
                                confidence: 1,
                                reason: "Compiled from CyberVinci Playbook '".concat(playbook.id, "'."),
                                promptMarkdown: prompt || playbook.description || playbook.name,
                                workflow: workflow
                            };
                            return [2 /*return*/, {
                                    ok: true,
                                    value: { draft: draft, workflow: workflow },
                                    message: "Compiled Playbook '".concat(playbook.id, "' to flow.ai-authoring/v1 draft.")
                                }];
                    }
                });
            });
        };
        CyberVinciToolRegistry_1.prototype.createFlowFromPlaybook = function (context) {
            return __awaiter(this, void 0, void 0, function () {
                var compiled, value, workflow, _a, _b;
                var _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            if (!this.flowService) {
                                return [2 /*return*/, { ok: false, message: 'Flow service is not available.' }];
                            }
                            return [4 /*yield*/, this.compilePlaybookToFlowDraft(context)];
                        case 1:
                            compiled = _d.sent();
                            value = compiled.value;
                            if (!compiled.ok || !(value === null || value === void 0 ? void 0 : value.draft)) {
                                return [2 /*return*/, compiled];
                            }
                            _b = (_a = this.flowService).createWorkflowFromAiAuthoringDraft;
                            _c = {};
                            return [4 /*yield*/, this.resolveWorkspaceRootUri(context)];
                        case 2: return [4 /*yield*/, _b.apply(_a, [(_c.workspaceRootUri = _d.sent(),
                                    _c.draft = value.draft,
                                    _c)])];
                        case 3:
                            workflow = _d.sent();
                            return [2 /*return*/, {
                                    ok: true,
                                    value: { workflow: workflow, draft: value.draft },
                                    message: "Created Flow workflow '".concat(workflow.id, "' from Playbook.")
                                }];
                    }
                });
            });
        };
        CyberVinciToolRegistry_1.prototype.executeCommandTool = function (toolId, context) {
            return __awaiter(this, void 0, void 0, function () {
                var tool, result, error_3;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _b.trys.push([0, 3, , 4]);
                            return [4 /*yield*/, this.getTool(toolId)];
                        case 1:
                            tool = _b.sent();
                            if ((tool === null || tool === void 0 ? void 0 : tool.shell) && ((_a = tool.policy) === null || _a === void 0 ? void 0 : _a.allowShell) !== true) {
                                return [2 /*return*/, {
                                        ok: false,
                                        message: "Declarative tool '".concat(toolId, "' requests shell execution but policy.allowShell is not enabled.")
                                    }];
                            }
                            return [4 /*yield*/, this.service.executeDeclarativeTool(toolId, JSON.stringify({
                                    input: context.input,
                                    state: context.state,
                                    requestId: context.requestId,
                                    playbookId: context.playbookId,
                                    stateId: context.stateId
                                }))];
                        case 2:
                            result = _b.sent();
                            return [2 /*return*/, {
                                    ok: result.exitCode === 0 || result.exitCode === null,
                                    value: result.stdout,
                                    message: result.stderr || result.stdout,
                                    diagnostics: result.stderr ? [result.stderr] : undefined
                                }];
                        case 3:
                            error_3 = _b.sent();
                            return [2 /*return*/, {
                                    ok: false,
                                    message: error_3 instanceof Error ? error_3.message : String(error_3)
                                }];
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        CyberVinciToolRegistry_1.prototype.executeCompositeTool = function (tool, context) {
            return __awaiter(this, void 0, void 0, function () {
                var steps, results, localState, _i, _a, _b, index, step, stepId, args, result;
                var _c, _d, _e, _f, _g, _h, _j;
                return __generator(this, function (_k) {
                    switch (_k.label) {
                        case 0:
                            steps = (_c = tool.steps) !== null && _c !== void 0 ? _c : [];
                            if (!steps.length) {
                                return [2 /*return*/, { ok: false, message: "Composite tool '".concat(tool.id, "' does not define steps.") }];
                            }
                            results = [];
                            localState = context.state;
                            _i = 0, _a = steps.entries();
                            _k.label = 1;
                        case 1:
                            if (!(_i < _a.length)) return [3 /*break*/, 4];
                            _b = _a[_i], index = _b[0], step = _b[1];
                            stepId = (_d = step.id) !== null && _d !== void 0 ? _d : "step-".concat(index + 1);
                            args = this.resolveToolArgs((_e = step.args) !== null && _e !== void 0 ? _e : {}, __assign(__assign({}, context), { state: localState }));
                            return [4 /*yield*/, this.executeTool(step.tool, __assign(__assign({}, context), { state: localState, stateId: "".concat((_f = context.stateId) !== null && _f !== void 0 ? _f : tool.id, ":").concat(stepId), input: __assign(__assign({}, context.input), args) }))];
                        case 2:
                            result = _k.sent();
                            if (step.saveAs) {
                                localState[step.saveAs] = (_h = (_g = result.value) !== null && _g !== void 0 ? _g : result.message) !== null && _h !== void 0 ? _h : result.ok;
                            }
                            results.push({
                                id: stepId,
                                tool: step.tool,
                                ok: result.ok,
                                message: result.message,
                                value: result.value
                            });
                            if (!result.ok && step.stopOnFail !== false) {
                                return [2 /*return*/, {
                                        ok: false,
                                        value: { results: results },
                                        message: (_j = result.message) !== null && _j !== void 0 ? _j : "Composite tool '".concat(tool.id, "' stopped at '").concat(stepId, "'."),
                                        diagnostics: result.diagnostics
                                    }];
                            }
                            if (result.stop) {
                                return [2 /*return*/, {
                                        ok: result.ok,
                                        stop: true,
                                        value: { results: results },
                                        message: result.message
                                    }];
                            }
                            _k.label = 3;
                        case 3:
                            _i++;
                            return [3 /*break*/, 1];
                        case 4: return [2 /*return*/, {
                                ok: true,
                                value: { results: results },
                                message: "Composite tool '".concat(tool.id, "' completed ").concat(results.length, " step(s).")
                            }];
                    }
                });
            });
        };
        CyberVinciToolRegistry_1.prototype.executeTheiaTool = function (toolId, context) {
            return __awaiter(this, void 0, void 0, function () {
                var tool, args, result, hasError, error_4;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            if (!toolId) {
                                return [2 /*return*/, { ok: false, message: 'Theia toolId is required.' }];
                            }
                            tool = (_a = this.toolInvocationRegistry) === null || _a === void 0 ? void 0 : _a.getFunction(toolId);
                            if (!tool) {
                                return [2 /*return*/, { ok: false, message: "Theia tool '".concat(toolId, "' is not registered.") }];
                            }
                            _b.label = 1;
                        case 1:
                            _b.trys.push([1, 3, , 4]);
                            args = this.readTheiaToolArgs(context);
                            return [4 /*yield*/, tool.handler(args, this.createTheiaToolContext(context, tool))];
                        case 2:
                            result = _b.sent();
                            hasError = this.hasToolCallError(result);
                            return [2 /*return*/, {
                                    ok: !hasError,
                                    value: result,
                                    message: this.stringifyToolResult(result),
                                    diagnostics: hasError ? [this.stringifyToolResult(result)] : undefined
                                }];
                        case 3:
                            error_4 = _b.sent();
                            return [2 /*return*/, {
                                    ok: false,
                                    message: error_4 instanceof Error ? error_4.message : String(error_4)
                                }];
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        CyberVinciToolRegistry_1.prototype.listTheiaTools = function () {
            if (!this.toolInvocationRegistry) {
                return { ok: false, message: 'Theia ToolInvocationRegistry is not available.' };
            }
            return {
                ok: true,
                value: this.toolInvocationRegistry.getAllFunctions().map(function (tool) { return ({
                    id: tool.id,
                    name: tool.name,
                    providerName: tool.providerName,
                    description: tool.description,
                    parameters: tool.parameters,
                    confirmAlwaysAllow: tool.confirmAlwaysAllow
                }); })
            };
        };
        CyberVinciToolRegistry_1.prototype.readTheiaToolArgs = function (context) {
            var _a, _b;
            var explicitArgs = (_b = (_a = context.input.args) !== null && _a !== void 0 ? _a : context.input.argString) !== null && _b !== void 0 ? _b : context.input.arguments;
            if (typeof explicitArgs === 'string') {
                return explicitArgs;
            }
            if (explicitArgs && typeof explicitArgs === 'object') {
                return JSON.stringify(explicitArgs);
            }
            var _c = context.input, _toolId = _c.toolId, _args = _c.args, _argString = _c.argString, _arguments = _c.arguments, input = __rest(_c, ["toolId", "args", "argString", "arguments"]);
            return JSON.stringify(input);
        };
        CyberVinciToolRegistry_1.prototype.createTheiaToolContext = function (context, tool) {
            var _a, _b;
            var toolCallId = "".concat((_a = context.playbookId) !== null && _a !== void 0 ? _a : 'playbook', ":").concat((_b = context.stateId) !== null && _b !== void 0 ? _b : tool.id, ":").concat(Date.now().toString(36));
            var request = this.asChatRequest(context.chatRequest);
            if (request) {
                return {
                    request: request,
                    toolCallId: toolCallId,
                    cancellationToken: request.response.cancellationToken,
                    rootSessionId: request.session.rootSessionId,
                    get response() {
                        return request.response;
                    }
                };
            }
            return ai_core_1.ToolInvocationContext.create(toolCallId);
        };
        CyberVinciToolRegistry_1.prototype.asChatRequest = function (candidate) {
            if (candidate && typeof candidate === 'object' && 'response' in candidate && 'session' in candidate) {
                return candidate;
            }
            return undefined;
        };
        CyberVinciToolRegistry_1.prototype.hasToolCallError = function (result) {
            return !!result && typeof result === 'object' && 'content' in result && Array.isArray(result.content)
                && result.content.some(function (item) { return !!item && typeof item === 'object'
                    && item.type === 'error'; });
        };
        CyberVinciToolRegistry_1.prototype.stringifyToolResult = function (result) {
            if (result === undefined) {
                return '';
            }
            if (typeof result === 'string') {
                return result;
            }
            try {
                return JSON.stringify(result);
            }
            catch (_a) {
                return String(result);
            }
        };
        CyberVinciToolRegistry_1.prototype.setPreference = function (context) {
            return __awaiter(this, void 0, void 0, function () {
                var key;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            key = String((_a = context.input.key) !== null && _a !== void 0 ? _a : '');
                            if (!key) {
                                return [2 /*return*/, { ok: false, message: 'Preference key is required.' }];
                            }
                            return [4 /*yield*/, this.preferenceService.set(key, context.input.value)];
                        case 1:
                            _b.sent();
                            return [2 /*return*/, { ok: true, value: { key: key, value: context.input.value } }];
                    }
                });
            });
        };
        CyberVinciToolRegistry_1.prototype.listFlowWorkflows = function (context) {
            return __awaiter(this, void 0, void 0, function () {
                var workflows, _a, _b;
                var _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            if (!this.flowService) {
                                return [2 /*return*/, { ok: false, message: 'Flow service is not available.' }];
                            }
                            _b = (_a = this.flowService).listWorkflows;
                            _c = {};
                            return [4 /*yield*/, this.resolveWorkspaceRootUri(context)];
                        case 1: return [4 /*yield*/, _b.apply(_a, [(_c.workspaceRootUri = _d.sent(), _c)])];
                        case 2:
                            workflows = _d.sent();
                            return [2 /*return*/, { ok: true, value: workflows }];
                    }
                });
            });
        };
        CyberVinciToolRegistry_1.prototype.listPendingFlowGates = function (context) {
            return __awaiter(this, void 0, void 0, function () {
                var runId, run, _a, _b, pendingGates;
                var _c;
                var _d, _e;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0:
                            if (!this.flowService) {
                                return [2 /*return*/, { ok: false, message: 'Flow service is not available.' }];
                            }
                            runId = String((_e = (_d = context.input.runId) !== null && _d !== void 0 ? _d : context.input.id) !== null && _e !== void 0 ? _e : '').trim();
                            if (!runId) {
                                return [2 /*return*/, { ok: false, message: 'Flow runId is required.' }];
                            }
                            _b = (_a = this.flowService).getRun;
                            _c = {};
                            return [4 /*yield*/, this.resolveWorkspaceRootUri(context)];
                        case 1: return [4 /*yield*/, _b.apply(_a, [(_c.workspaceRootUri = _f.sent(),
                                    _c.runId = runId,
                                    _c)])];
                        case 2:
                            run = _f.sent();
                            pendingGates = (run.gates || []).filter(function (gate) { return gate.status === 'pending'; });
                            return [2 /*return*/, {
                                    ok: true,
                                    value: {
                                        runId: run.id,
                                        workflowId: run.workflowId,
                                        status: run.status,
                                        pendingGates: pendingGates
                                    },
                                    message: pendingGates.length
                                        ? "Flow run '".concat(run.id, "' is waiting for ").concat(pendingGates.length, " gate decision(s).")
                                        : "Flow run '".concat(run.id, "' has no pending gates.")
                                }];
                    }
                });
            });
        };
        CyberVinciToolRegistry_1.prototype.approveFlowGate = function (context) {
            return __awaiter(this, void 0, void 0, function () {
                var runId, gateId, decision, run, _a, _b;
                var _c;
                var _d, _e, _f, _g, _h, _j, _k;
                return __generator(this, function (_l) {
                    switch (_l.label) {
                        case 0:
                            if (!this.flowService) {
                                return [2 /*return*/, { ok: false, message: 'Flow service is not available.' }];
                            }
                            runId = String((_e = (_d = context.input.runId) !== null && _d !== void 0 ? _d : context.input.id) !== null && _e !== void 0 ? _e : '').trim();
                            gateId = String((_g = (_f = context.input.gateId) !== null && _f !== void 0 ? _f : context.input.gate) !== null && _g !== void 0 ? _g : '').trim();
                            if (!runId || !gateId) {
                                return [2 /*return*/, { ok: false, message: 'Flow runId and gateId are required.' }];
                            }
                            decision = normalizeFlowGateDecision((_j = (_h = context.input.decision) !== null && _h !== void 0 ? _h : context.input.status) !== null && _j !== void 0 ? _j : context.input.outcome);
                            _b = (_a = this.flowService).approveGate;
                            _c = {};
                            return [4 /*yield*/, this.resolveWorkspaceRootUri(context)];
                        case 1: return [4 /*yield*/, _b.apply(_a, [(_c.workspaceRootUri = _l.sent(),
                                    _c.runId = runId,
                                    _c.gateId = gateId,
                                    _c.decision = decision,
                                    _c.decisionId = toOptionalString(context.input.decisionId),
                                    _c.targetStateId = toOptionalString((_k = context.input.targetStateId) !== null && _k !== void 0 ? _k : context.input.to),
                                    _c.note = toOptionalString(context.input.note),
                                    _c.approvedBy = 'AI Chat',
                                    _c)])];
                        case 2:
                            run = _l.sent();
                            return [2 /*return*/, {
                                    ok: true,
                                    stop: run.status === 'completed' || run.status === 'failed' || run.status === 'cancelled',
                                    value: run,
                                    message: "Flow gate '".concat(gateId, "' decided as '").concat(decision, "'. Run status: ").concat(run.status, ".")
                                }];
                    }
                });
            });
        };
        CyberVinciToolRegistry_1.prototype.startFlowRun = function (context) {
            return __awaiter(this, void 0, void 0, function () {
                var workflowId, prompt, run, _a, _b;
                var _c;
                var _d, _e, _f;
                return __generator(this, function (_g) {
                    switch (_g.label) {
                        case 0:
                            workflowId = String((_e = (_d = context.input.workflowId) !== null && _d !== void 0 ? _d : context.input.flowId) !== null && _e !== void 0 ? _e : '').trim();
                            prompt = String((_f = context.input.prompt) !== null && _f !== void 0 ? _f : '').trim();
                            if (!workflowId) {
                                return [2 /*return*/, { ok: false, message: 'Flow workflowId is required.' }];
                            }
                            if (!prompt) {
                                return [2 /*return*/, { ok: false, message: 'Flow prompt is required.' }];
                            }
                            if (!this.flowService) return [3 /*break*/, 3];
                            _b = (_a = this.flowService).startRun;
                            _c = {};
                            return [4 /*yield*/, this.resolveWorkspaceRootUri(context)];
                        case 1: return [4 /*yield*/, _b.apply(_a, [(_c.workspaceRootUri = _g.sent(),
                                    _c.workflowId = workflowId,
                                    _c.prompt = prompt,
                                    _c)])];
                        case 2:
                            run = _g.sent();
                            return [2 /*return*/, { ok: true, stop: true, value: run, message: "Started Flow run '".concat(run.id, "'.") }];
                        case 3: return [4 /*yield*/, this.commandService.executeCommand(FLOW_START_WORKFLOW_COMMAND, { workflowId: workflowId, prompt: prompt })];
                        case 4:
                            _g.sent();
                            return [2 /*return*/, { ok: true, stop: true, value: { workflowId: workflowId, prompt: prompt } }];
                    }
                });
            });
        };
        CyberVinciToolRegistry_1.prototype.runDynamicWorkflow = function (context) {
            return __awaiter(this, void 0, void 0, function () {
                var prompt, preferSaved, run, _a, _b;
                var _c;
                var _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            prompt = String((_d = context.input.prompt) !== null && _d !== void 0 ? _d : '').trim();
                            if (!prompt) {
                                return [2 /*return*/, { ok: false, message: 'Dynamic workflow prompt is required.' }];
                            }
                            preferSaved = context.input.preferSaved !== false;
                            if (context.input.aiAuthoring !== false && this.flowService && this.aiRuntime) {
                                return [2 /*return*/, this.runAiAuthoredDynamicWorkflow(context)];
                            }
                            if (!this.flowService) return [3 /*break*/, 3];
                            _b = (_a = this.flowService).runDynamicWorkflow;
                            _c = {};
                            return [4 /*yield*/, this.resolveWorkspaceRootUri(context)];
                        case 1: return [4 /*yield*/, _b.apply(_a, [(_c.workspaceRootUri = _e.sent(),
                                    _c.prompt = prompt,
                                    _c.preferSaved = preferSaved,
                                    _c)])];
                        case 2:
                            run = _e.sent();
                            return [2 /*return*/, { ok: true, stop: true, value: run, message: "Started dynamic Flow run '".concat(run.id, "'.") }];
                        case 3: return [4 /*yield*/, this.commandService.executeCommand(FLOW_RUN_DYNAMIC_WORKFLOW_COMMAND, { prompt: prompt, preferSaved: preferSaved })];
                        case 4:
                            _e.sent();
                            return [2 /*return*/, { ok: true, stop: true, value: { prompt: prompt, preferSaved: preferSaved } }];
                    }
                });
            });
        };
        CyberVinciToolRegistry_1.prototype.runAiAuthoringDraft = function (context) {
            return __awaiter(this, void 0, void 0, function () {
                var prompt, authoringDraft, run, _a, _b;
                var _c;
                var _d, _e;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0:
                            prompt = String((_d = context.input.prompt) !== null && _d !== void 0 ? _d : '').trim();
                            authoringDraft = (_e = context.input.authoringDraft) !== null && _e !== void 0 ? _e : context.input.draft;
                            if (!prompt) {
                                return [2 /*return*/, { ok: false, message: 'AI authoring draft prompt is required.' }];
                            }
                            if (!authoringDraft || typeof authoringDraft !== 'object') {
                                return [2 /*return*/, { ok: false, message: 'AI authoring draft is required. Use flow.ai-authoring/v1 output as authoringDraft.' }];
                            }
                            if (!this.flowService) {
                                return [2 /*return*/, { ok: false, message: 'Flow service is not available.' }];
                            }
                            _b = (_a = this.flowService).runDynamicWorkflow;
                            _c = {};
                            return [4 /*yield*/, this.resolveWorkspaceRootUri(context)];
                        case 1: return [4 /*yield*/, _b.apply(_a, [(_c.workspaceRootUri = _f.sent(),
                                    _c.prompt = prompt,
                                    _c.preferSaved = context.input.preferSaved !== false,
                                    _c.authoringDraft = authoringDraft,
                                    _c)])];
                        case 2:
                            run = _f.sent();
                            return [2 /*return*/, { ok: true, stop: true, value: run, message: "Started AI-authored Flow run '".concat(run.id, "'.") }];
                    }
                });
            });
        };
        CyberVinciToolRegistry_1.prototype.runAiAuthoredDynamicWorkflow = function (context) {
            return __awaiter(this, void 0, void 0, function () {
                var prompt, workspaceRootUri, workspacePath, _a, authoringSpec, workflows, workflowPatterns, modelProfiles, pipelinePresets, aiProviders, capabilities, activeWorkflowId, activeWorkflow, input, execution, result, draft, question, run;
                var _this = this;
                var _b, _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            prompt = String((_b = context.input.prompt) !== null && _b !== void 0 ? _b : '').trim();
                            if (!prompt) {
                                return [2 /*return*/, { ok: false, message: 'AI-authored dynamic workflow prompt is required.' }];
                            }
                            if (!this.flowService) {
                                return [2 /*return*/, { ok: false, message: 'Flow service is not available.' }];
                            }
                            if (!this.aiRuntime) {
                                return [2 /*return*/, this.runDynamicWorkflow(__assign(__assign({}, context), { input: __assign(__assign({}, context.input), { aiAuthoring: false }) }))];
                            }
                            return [4 /*yield*/, this.resolveWorkspaceRootUri(context)];
                        case 1:
                            workspaceRootUri = _e.sent();
                            return [4 /*yield*/, this.resolveWorkspacePath(context)];
                        case 2:
                            workspacePath = _e.sent();
                            return [4 /*yield*/, Promise.all([
                                    this.flowService.getAiAuthoringSpec(),
                                    this.flowService.listWorkflows({ workspaceRootUri: workspaceRootUri }),
                                    this.flowService.listWorkflowPatterns(),
                                    this.flowService.listModelProfiles(),
                                    this.flowService.listPipelinePresets({ workspaceRootUri: workspaceRootUri }),
                                    this.aiRuntime.listProviders({ workspacePath: workspacePath, includeUnavailable: true }),
                                    this.flowService.getCapabilities()
                                ])];
                        case 3:
                            _a = _e.sent(), authoringSpec = _a[0], workflows = _a[1], workflowPatterns = _a[2], modelProfiles = _a[3], pipelinePresets = _a[4], aiProviders = _a[5], capabilities = _a[6];
                            activeWorkflowId = String((_c = context.input.activeWorkflowId) !== null && _c !== void 0 ? _c : '').trim();
                            activeWorkflow = activeWorkflowId
                                ? workflows.find(function (workflow) { return workflow.id === activeWorkflowId; })
                                : workflows[0];
                            input = {
                                authoringSpec: authoringSpec,
                                activeWorkflow: activeWorkflow ? (0, common_1.redactFlowSecretsValue)(activeWorkflow) : undefined,
                                workflowSummaries: workflows.map(function (workflow) { return _this.toFlowWorkflowSummaryForAi(workflow); }),
                                workflowPatterns: workflowPatterns,
                                modelProfiles: modelProfiles,
                                pipelinePresets: pipelinePresets,
                                aiProviders: aiProviders,
                                languageModels: this.toLanguageModelOptions(aiProviders),
                                capabilities: capabilities,
                                selectedPatternId: typeof context.input.selectedPatternId === 'string' ? context.input.selectedPatternId : undefined,
                                selectedPipelinePresetId: typeof context.input.selectedPipelinePresetId === 'string' ? context.input.selectedPipelinePresetId : undefined
                            };
                            execution = this.readAiExecutionSelection(context);
                            return [4 /*yield*/, this.aiRuntime.runTask({
                                    surfaceId: 'ai-chat',
                                    action: 'flow.authorWorkflow',
                                    workspacePath: workspacePath,
                                    sessionId: context.requestId,
                                    userPrompt: prompt,
                                    systemPrompt: authoringSpec.systemPrompt,
                                    input: input,
                                    context: {
                                        mode: 'memory-if-available',
                                        maxItems: 8,
                                        tokenBudget: 1600
                                    },
                                    output: {
                                        mode: 'json',
                                        schemaName: 'FlowAiAuthoringDraft',
                                        schema: authoringSpec.outputSchema,
                                        instructions: 'Return exactly one FlowAiAuthoringDraft. Use ask_user only when required information is missing.'
                                    },
                                    effectPolicy: {
                                        previewOnly: false,
                                        workspaceWrites: 'allow-with-approval',
                                        shellExecution: 'forbidden',
                                        requireUserConfirmation: true
                                    },
                                    execution: __assign(__assign({}, execution), { collaborationMode: (_d = execution.collaborationMode) !== null && _d !== void 0 ? _d : 'default' })
                                })];
                        case 4:
                            result = _e.sent();
                            draft = this.coerceFlowAiAuthoringDraft(result.structured);
                            if (draft.action === 'ask_user') {
                                question = draft.questionMarkdown || draft.reason || 'Flow AI needs more detail before it can build the workflow.';
                                return [2 /*return*/, {
                                        ok: true,
                                        stop: true,
                                        value: { draft: draft, provider: result.provider, execution: result.execution },
                                        message: question
                                    }];
                            }
                            return [4 /*yield*/, this.flowService.runDynamicWorkflow({
                                    workspaceRootUri: workspaceRootUri,
                                    prompt: prompt,
                                    preferSaved: context.input.preferSaved !== false,
                                    authoringDraft: draft
                                })];
                        case 5:
                            run = _e.sent();
                            return [2 /*return*/, {
                                    ok: true,
                                    stop: true,
                                    value: {
                                        run: run,
                                        draft: draft,
                                        provider: result.provider,
                                        execution: result.execution,
                                        diagnostics: result.diagnostics
                                    },
                                    diagnostics: result.diagnostics,
                                    message: "Started AI-authored Flow run '".concat(run.id, "'.")
                                }];
                    }
                });
            });
        };
        CyberVinciToolRegistry_1.prototype.createWorkflowFromAiAuthoringDraft = function (context) {
            return __awaiter(this, void 0, void 0, function () {
                var draft, workflow, _a, _b;
                var _c;
                var _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            draft = (_d = context.input.authoringDraft) !== null && _d !== void 0 ? _d : context.input.draft;
                            if (!draft || typeof draft !== 'object') {
                                return [2 /*return*/, { ok: false, message: 'AI authoring draft is required. Use flow.ai-authoring/v1 output as draft.' }];
                            }
                            if (!this.flowService) {
                                return [2 /*return*/, { ok: false, message: 'Flow service is not available.' }];
                            }
                            _b = (_a = this.flowService).createWorkflowFromAiAuthoringDraft;
                            _c = {};
                            return [4 /*yield*/, this.resolveWorkspaceRootUri(context)];
                        case 1: return [4 /*yield*/, _b.apply(_a, [(_c.workspaceRootUri = _e.sent(),
                                    _c.draft = draft,
                                    _c)])];
                        case 2:
                            workflow = _e.sent();
                            return [2 /*return*/, { ok: true, value: workflow, message: "Created Flow workflow '".concat(workflow.id, "' from AI authoring draft.") }];
                    }
                });
            });
        };
        CyberVinciToolRegistry_1.prototype.getFlowAiAuthoringSpec = function () {
            return __awaiter(this, void 0, void 0, function () {
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            if (!this.flowService) {
                                return [2 /*return*/, { ok: false, message: 'Flow service is not available.' }];
                            }
                            _a = { ok: true };
                            return [4 /*yield*/, this.flowService.getAiAuthoringSpec()];
                        case 1: return [2 /*return*/, (_a.value = _b.sent(), _a)];
                    }
                });
            });
        };
        CyberVinciToolRegistry_1.prototype.searchMemoryContext = function (context) {
            return __awaiter(this, void 0, void 0, function () {
                var workspacePath, text, limit, sourceKinds, retrievalResults, tokenBudget, contextPack, _a;
                var _b, _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            if (!this.memoryService) {
                                return [2 /*return*/, { ok: false, message: 'Memory service is not available.' }];
                            }
                            return [4 /*yield*/, this.resolveWorkspacePath(context)];
                        case 1:
                            workspacePath = _e.sent();
                            if (!workspacePath) {
                                return [2 /*return*/, { ok: false, message: 'Workspace path is required for Memory context search.' }];
                            }
                            text = String((_d = (_c = (_b = context.input.query) !== null && _b !== void 0 ? _b : context.input.text) !== null && _c !== void 0 ? _c : context.input.prompt) !== null && _d !== void 0 ? _d : '').trim();
                            if (!text) {
                                return [2 /*return*/, { ok: false, message: 'Memory search query is required.' }];
                            }
                            limit = this.readNumberInput(context.input.limit, 8);
                            sourceKinds = this.readStringArray(context.input.sourceKinds);
                            return [4 /*yield*/, this.memoryService.search({
                                    workspacePath: workspacePath,
                                    text: text,
                                    limit: limit,
                                    sourceKinds: sourceKinds,
                                    sessionId: typeof context.input.sessionId === 'string' ? context.input.sessionId : undefined,
                                    taskId: typeof context.input.taskId === 'string' ? context.input.taskId : undefined
                                })];
                        case 2:
                            retrievalResults = _e.sent();
                            tokenBudget = this.readNumberInput(context.input.tokenBudget, 1600);
                            if (!(context.input.buildContextPack === false)) return [3 /*break*/, 3];
                            _a = undefined;
                            return [3 /*break*/, 5];
                        case 3: return [4 /*yield*/, this.memoryService.buildContextPack({
                                workspacePath: workspacePath,
                                prompt: text,
                                retrievalResults: retrievalResults,
                                tokenBudget: tokenBudget
                            })];
                        case 4:
                            _a = _e.sent();
                            _e.label = 5;
                        case 5:
                            contextPack = _a;
                            return [2 /*return*/, {
                                    ok: true,
                                    value: { retrievalResults: retrievalResults, contextPack: contextPack },
                                    message: "Memory returned ".concat(retrievalResults.length, " retrieval result(s).")
                                }];
                    }
                });
            });
        };
        CyberVinciToolRegistry_1.prototype.proposeMemoryCandidate = function (context) {
            return __awaiter(this, void 0, void 0, function () {
                var workspacePath, text, result;
                var _a, _b, _c, _d, _e;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0:
                            if (!this.memoryService) {
                                return [2 /*return*/, { ok: false, message: 'Memory service is not available.' }];
                            }
                            return [4 /*yield*/, this.resolveWorkspacePath(context)];
                        case 1:
                            workspacePath = _f.sent();
                            if (!workspacePath) {
                                return [2 /*return*/, { ok: false, message: 'Workspace path is required for Memory candidate proposal.' }];
                            }
                            text = String((_c = (_b = (_a = context.input.text) !== null && _a !== void 0 ? _a : context.input.content) !== null && _b !== void 0 ? _b : context.input.prompt) !== null && _c !== void 0 ? _c : '').trim();
                            if (!text) {
                                return [2 /*return*/, { ok: false, message: 'Memory candidate text is required.' }];
                            }
                            return [4 /*yield*/, this.memoryService.proposeMemoryCandidate({
                                    workspacePath: workspacePath,
                                    text: text,
                                    source: typeof context.input.source === 'string' ? context.input.source : 'ai-chat-playbook',
                                    evidence: typeof context.input.evidence === 'string' ? context.input.evidence : "Playbook ".concat((_d = context.playbookId) !== null && _d !== void 0 ? _d : 'unknown', " state ").concat((_e = context.stateId) !== null && _e !== void 0 ? _e : 'unknown', "."),
                                    eventId: typeof context.input.eventId === 'string' ? context.input.eventId : undefined,
                                    relativePath: typeof context.input.relativePath === 'string' ? context.input.relativePath : undefined,
                                    maxCandidates: this.readNumberInput(context.input.maxCandidates, 3)
                                })];
                        case 2:
                            result = _f.sent();
                            return [2 /*return*/, {
                                    ok: true,
                                    value: result,
                                    message: "Memory proposed ".concat(result.candidates.length, " candidate(s), ").concat(result.created, " created.")
                                }];
                    }
                });
            });
        };
        CyberVinciToolRegistry_1.prototype.requestMemoryWriteApproval = function (context) {
            return __awaiter(this, void 0, void 0, function () {
                var content, picked;
                var _a, _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            content = String((_c = (_b = (_a = context.input.content) !== null && _a !== void 0 ? _a : context.input.text) !== null && _b !== void 0 ? _b : context.input.prompt) !== null && _c !== void 0 ? _c : '').trim();
                            if (!content) {
                                return [2 /*return*/, { ok: false, message: 'Memory write content is required.' }];
                            }
                            if (!this.quickPickService) {
                                return [2 /*return*/, {
                                        ok: false,
                                        value: { approvalRequired: true, content: content },
                                        message: 'Memory write approval UI is not available.'
                                    }];
                            }
                            return [4 /*yield*/, this.quickPickService.show([
                                    {
                                        label: 'Approve Memory Write',
                                        description: this.readMemoryTitle(context.input, content),
                                        detail: content,
                                        decision: 'approve'
                                    },
                                    {
                                        label: 'Reject Memory Write',
                                        description: 'Do not persist this candidate.',
                                        detail: content,
                                        decision: 'reject'
                                    }
                                ], {
                                    title: 'CyberVinci Memory Approval',
                                    placeholder: 'Approve this Playbook memory write?'
                                })];
                        case 1:
                            picked = _d.sent();
                            if (!picked) {
                                return [2 /*return*/, { ok: false, message: 'Memory write approval was cancelled.' }];
                            }
                            if (picked.decision !== 'approve') {
                                return [2 /*return*/, { ok: true, value: { status: 'rejected', content: content }, message: 'Memory write rejected.' }];
                            }
                            return [2 /*return*/, this.writeApprovedMemory(__assign(__assign({}, context), { input: __assign(__assign({}, context.input), { approved: true }) }))];
                    }
                });
            });
        };
        CyberVinciToolRegistry_1.prototype.writeApprovedMemory = function (context) {
            return __awaiter(this, void 0, void 0, function () {
                var content, workspacePath, scope, memory;
                var _a, _b, _c, _d, _e;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0:
                            if (!this.memoryService) {
                                return [2 /*return*/, { ok: false, message: 'Memory service is not available.' }];
                            }
                            if (context.input.approved !== true) {
                                return [2 /*return*/, { ok: false, message: 'Memory writes require explicit approved=true.' }];
                            }
                            content = String((_c = (_b = (_a = context.input.content) !== null && _a !== void 0 ? _a : context.input.text) !== null && _b !== void 0 ? _b : context.input.prompt) !== null && _c !== void 0 ? _c : '').trim();
                            if (!content) {
                                return [2 /*return*/, { ok: false, message: 'Memory write content is required.' }];
                            }
                            return [4 /*yield*/, this.resolveWorkspacePath(context)];
                        case 1:
                            workspacePath = _f.sent();
                            scope = this.readMemoryScope(context.input.scope);
                            if (scope === 'workspace' && !workspacePath) {
                                return [2 /*return*/, { ok: false, message: 'Workspace path is required for workspace-scoped Memory writes.' }];
                            }
                            return [4 /*yield*/, this.memoryService.addMemory({
                                    scope: scope,
                                    workspacePath: scope === 'workspace' ? workspacePath : undefined,
                                    memoryType: this.readMemoryType(context.input.memoryType),
                                    title: this.readMemoryTitle(context.input, content),
                                    content: content,
                                    source: typeof context.input.source === 'string' ? context.input.source : 'ai-chat-playbook',
                                    evidence: typeof context.input.evidence === 'string' ? context.input.evidence : "Approved from Playbook ".concat((_d = context.playbookId) !== null && _d !== void 0 ? _d : 'unknown', " state ").concat((_e = context.stateId) !== null && _e !== void 0 ? _e : 'unknown', "."),
                                    taskId: typeof context.input.taskId === 'string' ? context.input.taskId : undefined,
                                    sessionId: typeof context.input.sessionId === 'string' ? context.input.sessionId : undefined
                                })];
                        case 2:
                            memory = _f.sent();
                            return [2 /*return*/, {
                                    ok: true,
                                    value: memory,
                                    message: "Memory '".concat(memory.title, "' written.")
                                }];
                    }
                });
            });
        };
        CyberVinciToolRegistry_1.prototype.mcpHasServer = function (context) {
            return __awaiter(this, void 0, void 0, function () {
                var name, configured;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            name = this.readMcpServerName(context);
                            if (!name) {
                                return [2 /*return*/, { ok: false, message: 'MCP server name is required.' }];
                            }
                            if (!this.mcpService) {
                                return [2 /*return*/, { ok: false, message: 'MCP frontend service is not available.' }];
                            }
                            return [4 /*yield*/, this.mcpService.hasServer(name)];
                        case 1:
                            configured = _a.sent();
                            return [2 /*return*/, { ok: configured, value: { name: name, configured: configured }, message: configured ? undefined : "MCP server '".concat(name, "' is not configured.") }];
                    }
                });
            });
        };
        CyberVinciToolRegistry_1.prototype.mcpIsServerStarted = function (context) {
            return __awaiter(this, void 0, void 0, function () {
                var name, started;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            name = this.readMcpServerName(context);
                            if (!name) {
                                return [2 /*return*/, { ok: false, message: 'MCP server name is required.' }];
                            }
                            if (!this.mcpService) {
                                return [2 /*return*/, { ok: false, message: 'MCP frontend service is not available.' }];
                            }
                            return [4 /*yield*/, this.mcpService.isServerStarted(name)];
                        case 1:
                            started = _a.sent();
                            return [2 /*return*/, { ok: started, value: { name: name, started: started }, message: started ? undefined : "MCP server '".concat(name, "' is not running.") }];
                    }
                });
            });
        };
        CyberVinciToolRegistry_1.prototype.mcpConfigureServers = function (context, start) {
            return __awaiter(this, void 0, void 0, function () {
                var servers, configured, started, _i, servers_2, server, currentServers, name_1, serverWithoutName, _a;
                var _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            if (!this.mcpService) {
                                return [2 /*return*/, { ok: false, message: 'MCP frontend service is not available.' }];
                            }
                            servers = this.readMcpServers(context);
                            if (!servers.length) {
                                return [2 /*return*/, { ok: false, message: 'At least one MCP server definition is required.' }];
                            }
                            configured = [];
                            started = [];
                            _i = 0, servers_2 = servers;
                            _c.label = 1;
                        case 1:
                            if (!(_i < servers_2.length)) return [3 /*break*/, 10];
                            server = servers_2[_i];
                            if (!server.name) {
                                return [2 /*return*/, { ok: false, message: 'Every MCP server definition must include a name.' }];
                            }
                            return [4 /*yield*/, this.mcpService.hasServer(server.name)];
                        case 2:
                            if (!!(_c.sent())) return [3 /*break*/, 5];
                            currentServers = this.preferenceService.get(mcp_preferences_1.MCP_SERVERS_PREF, {});
                            name_1 = server.name, serverWithoutName = __rest(server, ["name"]);
                            return [4 /*yield*/, this.preferenceService.set(mcp_preferences_1.MCP_SERVERS_PREF, __assign(__assign({}, currentServers), (_b = {}, _b[name_1] = serverWithoutName, _b)), common_4.PreferenceScope.User)];
                        case 3:
                            _c.sent();
                            return [4 /*yield*/, this.mcpService.addOrUpdateServer(server)];
                        case 4:
                            _c.sent();
                            configured.push(server.name);
                            _c.label = 5;
                        case 5:
                            _a = start;
                            if (!_a) return [3 /*break*/, 7];
                            return [4 /*yield*/, this.mcpService.isServerStarted(server.name)];
                        case 6:
                            _a = !(_c.sent());
                            _c.label = 7;
                        case 7:
                            if (!_a) return [3 /*break*/, 9];
                            return [4 /*yield*/, this.mcpService.startServer(server.name)];
                        case 8:
                            _c.sent();
                            started.push(server.name);
                            _c.label = 9;
                        case 9:
                            _i++;
                            return [3 /*break*/, 1];
                        case 10: return [2 /*return*/, {
                                ok: true,
                                value: { configured: configured, started: started },
                                message: start
                                    ? "MCP servers ready: ".concat(servers.map(function (server) { return server.name; }).join(', '), ".")
                                    : "MCP servers configured: ".concat(servers.map(function (server) { return server.name; }).join(', '), ".")
                            }];
                    }
                });
            });
        };
        CyberVinciToolRegistry_1.prototype.readMcpServerName = function (context) {
            var _a, _b, _c;
            var server = context.input.server;
            var serverName = server && typeof server === 'object' && 'name' in server
                ? server.name
                : undefined;
            return String((_c = (_b = (_a = context.input.name) !== null && _a !== void 0 ? _a : context.input.serverName) !== null && _b !== void 0 ? _b : serverName) !== null && _c !== void 0 ? _c : '').trim();
        };
        CyberVinciToolRegistry_1.prototype.readMcpServers = function (context) {
            var servers = context.input.servers;
            if (Array.isArray(servers)) {
                return servers.filter(function (server) { return !!server && typeof server === 'object'; });
            }
            var server = context.input.server;
            if (server && typeof server === 'object') {
                return [server];
            }
            var name = this.readMcpServerName(context);
            return name ? [{ name: name }] : [];
        };
        CyberVinciToolRegistry_1.prototype.captureCanvasDocument = function (context) {
            var sessionResult = this.getCanvasSession(context);
            if (!this.isCanvasSessionResult(sessionResult)) {
                return sessionResult;
            }
            var session = sessionResult.session;
            var document = session.getDocument();
            if (!document) {
                return { ok: false, message: 'Canvas document is not loaded.' };
            }
            var page = this.getActiveCanvasPage(document);
            var summary = this.summarizeCanvasDocument(document, page);
            return {
                ok: true,
                value: {
                    uri: session.uri.toString(),
                    document: this.cloneJson(document),
                    selection: session.getSelection(),
                    summary: summary
                }
            };
        };
        CyberVinciToolRegistry_1.prototype.captureCanvasVisualSnapshot = function (context) {
            var _a;
            var sessionResult = this.getCanvasSession(context);
            if (!this.isCanvasSessionResult(sessionResult)) {
                return sessionResult;
            }
            var widget = this.getActiveCanvasWidget(sessionResult.session.uri);
            var svg = (_a = widget === null || widget === void 0 ? void 0 : widget.node) === null || _a === void 0 ? void 0 : _a.querySelector('svg');
            if (!svg) {
                return {
                    ok: false,
                    message: 'Canvas SVG viewport was not found for the active design widget.'
                };
            }
            var bounds = svg.getBoundingClientRect();
            return {
                ok: true,
                value: {
                    kind: 'svg-snapshot',
                    uri: sessionResult.session.uri.toString(),
                    bounds: {
                        x: bounds.x,
                        y: bounds.y,
                        width: bounds.width,
                        height: bounds.height
                    },
                    svg: svg.outerHTML
                }
            };
        };
        CyberVinciToolRegistry_1.prototype.collectCanvasLayoutDiagnostics = function (context, categories) {
            var sessionResult = this.getCanvasSession(context);
            if (!this.isCanvasSessionResult(sessionResult)) {
                return sessionResult;
            }
            var document = sessionResult.session.getDocument();
            if (!document) {
                return { ok: false, message: 'Canvas document is not loaded.' };
            }
            var diagnostics = this.computeCanvasDiagnostics(document, categories);
            var errors = diagnostics.filter(function (diagnostic) { return diagnostic.severity === 'error'; });
            return {
                ok: errors.length === 0,
                value: {
                    uri: sessionResult.session.uri.toString(),
                    diagnostics: diagnostics,
                    summary: this.summarizeCanvasDocument(document, this.getActiveCanvasPage(document))
                },
                diagnostics: diagnostics.map(function (diagnostic) { return diagnostic.message; }),
                message: diagnostics.length
                    ? "".concat(diagnostics.length, " Canvas diagnostic(s) found.")
                    : 'No Canvas layout diagnostics found.'
            };
        };
        CyberVinciToolRegistry_1.prototype.applyCanvasOperations = function (context) {
            return __awaiter(this, void 0, void 0, function () {
                var sessionResult, operations, document, selection, stabilized, results, _i, _a, operation, _b, _c, failures;
                var _d, _e;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0:
                            sessionResult = this.getCanvasSession(context);
                            if (!this.isCanvasSessionResult(sessionResult)) {
                                return [2 /*return*/, sessionResult];
                            }
                            operations = this.readCanvasOperations(context);
                            if (!operations.length) {
                                return [2 /*return*/, { ok: false, message: 'Canvas operations are required.' }];
                            }
                            document = sessionResult.session.getDocument();
                            selection = sessionResult.session.getSelection();
                            stabilized = document && this.openPencilDesignCommandService
                                ? this.openPencilDesignCommandService.stabilizeAiOperationsForDocument(document, selection, operations, this.readCanvasApplyOptions(context))
                                : { operations: operations, diagnostics: [], skipped: 0, reordered: false, skippedOperations: [] };
                            results = [];
                            _i = 0, _a = stabilized.operations;
                            _f.label = 1;
                        case 1:
                            if (!(_i < _a.length)) return [3 /*break*/, 4];
                            operation = _a[_i];
                            _c = (_b = results).push;
                            return [4 /*yield*/, sessionResult.session.applyOperation(operation)];
                        case 2:
                            _c.apply(_b, [_f.sent()]);
                            _f.label = 3;
                        case 3:
                            _i++;
                            return [3 /*break*/, 1];
                        case 4:
                            failures = results.filter(function (result) { return !result.changed && result.message; });
                            return [2 /*return*/, {
                                    ok: failures.length === 0,
                                    value: {
                                        applied: results.length,
                                        requested: operations.length,
                                        skipped: stabilized.skipped,
                                        reordered: stabilized.reordered,
                                        diagnostics: stabilized.diagnostics,
                                        results: results
                                    },
                                    diagnostics: stabilized.diagnostics,
                                    message: (_e = (_d = failures[0]) === null || _d === void 0 ? void 0 : _d.message) !== null && _e !== void 0 ? _e : "Applied ".concat(results.length, " Canvas operation(s).")
                                }];
                    }
                });
            });
        };
        CyberVinciToolRegistry_1.prototype.resizeCanvasNodesToFit = function (context) {
            return __awaiter(this, void 0, void 0, function () {
                var sessionResult, document, operations;
                return __generator(this, function (_a) {
                    sessionResult = this.getCanvasSession(context);
                    if (!this.isCanvasSessionResult(sessionResult)) {
                        return [2 /*return*/, sessionResult];
                    }
                    document = sessionResult.session.getDocument();
                    if (!document) {
                        return [2 /*return*/, { ok: false, message: 'Canvas document is not loaded.' }];
                    }
                    operations = this.createResizeToFitOperations(document);
                    if (context.input.apply === false) {
                        return [2 /*return*/, { ok: true, value: { operations: operations }, message: "".concat(operations.length, " resize operation(s) suggested.") }];
                    }
                    if (!operations.length) {
                        return [2 /*return*/, { ok: true, value: { operations: operations }, message: 'No resize-to-fit operations were needed.' }];
                    }
                    return [2 /*return*/, this.applyCanvasOperations(__assign(__assign({}, context), { input: __assign(__assign({}, context.input), { operations: operations }) }))];
                });
            });
        };
        CyberVinciToolRegistry_1.prototype.reorderCanvasLayers = function (context) {
            return __awaiter(this, void 0, void 0, function () {
                var operationName, nodeId, operations;
                var _a, _b, _c;
                return __generator(this, function (_d) {
                    operationName = String((_b = (_a = context.input.operation) !== null && _a !== void 0 ? _a : context.input.layerOperation) !== null && _b !== void 0 ? _b : '').trim();
                    nodeId = String((_c = context.input.nodeId) !== null && _c !== void 0 ? _c : '').trim();
                    operations = this.readCanvasOperations(context);
                    if (!operations.length && operationName && nodeId) {
                        operations.push({ operation: operationName, nodeId: nodeId });
                    }
                    if (!operations.length) {
                        return [2 /*return*/, { ok: false, message: 'Layer reorder requires operations or operation/nodeId.' }];
                    }
                    return [2 /*return*/, this.applyCanvasOperations(__assign(__assign({}, context), { input: __assign(__assign({}, context.input), { operations: operations }) }))];
                });
            });
        };
        CyberVinciToolRegistry_1.prototype.getCanvasKnownSiteReference = function (context) {
            var _a, _b, _c;
            var prompt = String((_b = (_a = context.input.prompt) !== null && _a !== void 0 ? _a : context.state.prompt) !== null && _b !== void 0 ? _b : '').toLowerCase();
            var site = String((_c = context.input.site) !== null && _c !== void 0 ? _c : '').toLowerCase();
            var key = site || prompt;
            var references = [
                {
                    match: /\bamazon\b|\bsaara\b/,
                    site: 'Amazon-style marketplace homepage',
                    modules: ['global header', 'logo', 'delivery/location area', 'search input with submit button', 'account/orders/cart nav', 'category nav', 'hero/deal region', 'product/category cards', 'support/service strips', 'multi-column footer'],
                    notes: ['Search must remain an input/button row, not oversized cards.', 'Complete clone requests should include footer and multiple body modules.']
                },
                {
                    match: /\bmercado\s*livre\b|\bmercado\s*privado\b|\bmercado\s*regulado\b/,
                    site: 'Mercado Livre-style marketplace homepage',
                    modules: ['yellow header', 'logo', 'large search bar', 'location row', 'navigation links', 'promo hero', 'payments/benefits row', 'product/deal cards', 'footer'],
                    notes: ['Keep a centered marketplace feed with explicit card widths and no placeholder-only content.']
                }
            ];
            var reference = references.find(function (item) { return item.match.test(key); });
            if (!reference) {
                return {
                    ok: false,
                    message: 'No built-in known-site reference matched the prompt/site.',
                    value: { prompt: context.input.prompt, site: context.input.site }
                };
            }
            return { ok: true, value: reference, message: "Matched ".concat(reference.site, ".") };
        };
        CyberVinciToolRegistry_1.prototype.runVisionJudge = function (context) {
            return __awaiter(this, void 0, void 0, function () {
                var visionJudgeMode, prompt, workspacePath, documentResult, snapshotResult, diagnosticsResult, knownReferenceResult, visualSnapshot, documentCapture, layoutDiagnostics, knownReference, explicitReference, inputItems, input, result, structured, passed;
                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
                return __generator(this, function (_l) {
                    switch (_l.label) {
                        case 0:
                            if (context.input.enabled === false) {
                                return [2 /*return*/, { ok: true, value: { skipped: true, reason: 'Vision Judge disabled for this run.' } }];
                            }
                            visionJudgeMode = String((_b = (_a = context.input.visionJudgeMode) !== null && _a !== void 0 ? _a : context.input.mode) !== null && _b !== void 0 ? _b : '').trim().toLowerCase();
                            prompt = String((_e = (_d = (_c = context.input.prompt) !== null && _c !== void 0 ? _c : context.state.prompt) !== null && _d !== void 0 ? _d : context.input.userPrompt) !== null && _e !== void 0 ? _e : '').trim();
                            if (visionJudgeMode === 'deterministic' || context.input.deterministic === true) {
                                return [2 /*return*/, this.runDeterministicVisionJudge(context, prompt, 'Deterministic Vision Judge mode was requested.')];
                            }
                            if (!this.aiRuntime) {
                                return [2 /*return*/, this.runDeterministicVisionJudge(context, prompt, 'CyberVinci AI Runtime service is not available.')];
                            }
                            return [4 /*yield*/, this.resolveWorkspacePath(context)];
                        case 1:
                            workspacePath = _l.sent();
                            documentResult = this.captureCanvasDocument(context);
                            snapshotResult = this.captureCanvasVisualSnapshot(context);
                            diagnosticsResult = this.collectCanvasLayoutDiagnostics(context);
                            knownReferenceResult = this.getCanvasKnownSiteReference(context);
                            visualSnapshot = this.readResultRecord(snapshotResult);
                            documentCapture = this.readResultRecord(documentResult);
                            layoutDiagnostics = this.readResultRecord(diagnosticsResult);
                            knownReference = knownReferenceResult.ok ? knownReferenceResult.value : undefined;
                            explicitReference = (_g = (_f = context.input.reference) !== null && _f !== void 0 ? _f : context.input.referenceUrl) !== null && _g !== void 0 ? _g : context.input.referenceImage;
                            inputItems = this.visionJudgeInputItems(context, visualSnapshot);
                            input = {
                                prompt: prompt,
                                requestedOutcome: (_h = context.input.requestedOutcome) !== null && _h !== void 0 ? _h : context.input.acceptanceCriteria,
                                reference: explicitReference !== null && explicitReference !== void 0 ? explicitReference : knownReference,
                                document: (documentCapture === null || documentCapture === void 0 ? void 0 : documentCapture.summary) ? { summary: documentCapture.summary, selection: documentCapture.selection } : documentCapture,
                                layoutDiagnostics: layoutDiagnostics,
                                visualSnapshot: visualSnapshot
                                    ? {
                                        kind: visualSnapshot.kind,
                                        uri: visualSnapshot.uri,
                                        bounds: visualSnapshot.bounds,
                                        svgLength: typeof visualSnapshot.svg === 'string' ? visualSnapshot.svg.length : undefined
                                    }
                                    : undefined
                            };
                            return [4 /*yield*/, this.aiRuntime.runTask({
                                    surfaceId: 'ai-chat',
                                    action: 'vision.judge',
                                    workspacePath: workspacePath,
                                    sessionId: context.requestId,
                                    userPrompt: prompt || 'Judge whether the current Canvas output matches the requested design.',
                                    systemPrompt: [
                                        'You are CyberVinci Vision Judge.',
                                        'Evaluate whether the current Canvas/design output actually satisfies the user request.',
                                        'Compare the visual snapshot, Canvas document summary, deterministic layout diagnostics, and any known-site/reference guidance.',
                                        'Focus on visible delivery: missing requested modules, bad clone fidelity, broken search bars, oversized controls, incoherent overlaps, clipping, off-canvas elements, missing footer, and wrong visual hierarchy.',
                                        'Do not propose unrelated redesigns. When repair is needed, suggest concise Canvas operations or concrete layout changes.',
                                        'Return only the JSON object requested by the schema.'
                                    ].join('\n'),
                                    input: input,
                                    inputItems: inputItems,
                                    output: {
                                        mode: 'json',
                                        schemaName: 'CyberVinciVisionJudgeResult',
                                        schema: {
                                            type: 'object',
                                            additionalProperties: true,
                                            properties: {
                                                passed: { type: 'boolean' },
                                                score: { type: 'number', minimum: 0, maximum: 1 },
                                                summary: { type: 'string' },
                                                needsRepair: { type: 'boolean' },
                                                issues: { type: 'array' },
                                                suggestedOperations: { type: 'array' }
                                            }
                                        },
                                        instructions: 'Return JSON with passed, score, summary, needsRepair, issues, and suggestedOperations. Set passed=false when the prompt was not visually delivered.'
                                    },
                                    effectPolicy: {
                                        previewOnly: true,
                                        workspaceWrites: 'forbidden',
                                        shellExecution: 'forbidden',
                                        requireUserConfirmation: false
                                    },
                                    execution: this.readVisionExecutionSelection(context)
                                })];
                        case 2:
                            result = _l.sent();
                            structured = (_j = result.structured) !== null && _j !== void 0 ? _j : {};
                            passed = structured.passed === true || (structured.passed !== false && structured.needsRepair !== true && ((_k = structured.score) !== null && _k !== void 0 ? _k : 1) >= 0.72);
                            return [2 /*return*/, {
                                    ok: passed,
                                    value: __assign(__assign({}, structured), { provider: result.provider, execution: result.execution, diagnostics: result.diagnostics }),
                                    diagnostics: __spreadArray(__spreadArray([], (result.diagnostics || []), true), ((structured.issues || [])
                                        .map(function (issue) { return issue.message || issue.recommendation || ''; })
                                        .filter(Boolean)), true),
                                    message: structured.summary || (passed ? 'Vision Judge passed.' : 'Vision Judge found visual delivery issues.')
                                }];
                    }
                });
            });
        };
        CyberVinciToolRegistry_1.prototype.runDeterministicVisionJudge = function (context, prompt, reason) {
            var _this = this;
            var documentResult = this.captureCanvasDocument(context);
            if (!documentResult.ok) {
                return documentResult;
            }
            var documentCapture = this.readResultRecord(documentResult);
            var document = documentCapture === null || documentCapture === void 0 ? void 0 : documentCapture.document;
            if (!document) {
                return { ok: false, message: 'Canvas document capture did not include a document payload.' };
            }
            var diagnosticsResult = this.collectCanvasLayoutDiagnostics(context);
            var layoutDiagnostics = this.readResultRecord(diagnosticsResult);
            var diagnostics = Array.isArray(layoutDiagnostics === null || layoutDiagnostics === void 0 ? void 0 : layoutDiagnostics.diagnostics)
                ? layoutDiagnostics.diagnostics
                : [];
            var knownReferenceResult = this.getCanvasKnownSiteReference(context);
            var suggestedOperations = this.createCanvasDiagnosticRepairOperations(document, diagnostics);
            var issues = diagnostics
                .filter(function (diagnostic) { return diagnostic.severity !== 'info'; })
                .map(function (diagnostic) { return ({
                severity: diagnostic.severity,
                message: diagnostic.message,
                nodeId: diagnostic.nodeId,
                recommendation: _this.canvasDiagnosticRecommendation(diagnostic)
            }); });
            var needsRepair = issues.length > 0;
            var score = needsRepair ? Math.max(0.2, 0.86 - Math.min(issues.length, 8) * 0.08) : 0.94;
            var knownReference = knownReferenceResult.ok ? knownReferenceResult.value : undefined;
            var summary = needsRepair
                ? "Deterministic Canvas QA found ".concat(issues.length, " issue(s) and suggested ").concat(suggestedOperations.length, " repair operation(s).")
                : 'Deterministic Canvas QA passed with no blocking layout diagnostics.';
            return {
                ok: !needsRepair,
                value: {
                    passed: !needsRepair,
                    score: score,
                    summary: summary,
                    needsRepair: needsRepair,
                    issues: issues,
                    suggestedOperations: suggestedOperations,
                    deterministic: true,
                    fallbackReason: reason,
                    prompt: prompt,
                    reference: knownReference,
                    layoutDiagnostics: layoutDiagnostics
                },
                diagnostics: issues.map(function (issue) { return issue.message; }),
                message: summary
            };
        };
        CyberVinciToolRegistry_1.prototype.createCanvasDiagnosticRepairOperations = function (document, diagnostics) {
            var _a, _b, _c, _d, _e, _f;
            var page = this.getActiveCanvasPage(document);
            var pageWidth = typeof page.width === 'number' ? page.width : 900;
            var pageHeight = typeof page.height === 'number' ? page.height : 620;
            var boxes = this.flattenCanvasBoxes(page.children);
            var boxById = new Map(boxes.map(function (box) { return [box.id, box]; }));
            var updates = new Map();
            var operations = [];
            var addUpdate = function (nodeId, changes) {
                var _a;
                if (!nodeId || !Object.keys(changes).length) {
                    return;
                }
                updates.set(nodeId, __assign(__assign({}, ((_a = updates.get(nodeId)) !== null && _a !== void 0 ? _a : {})), changes));
            };
            for (var _i = 0, _g = this.createResizeToFitOperations(document); _i < _g.length; _i++) {
                var operation = _g[_i];
                if (operation.operation === 'updateNode') {
                    addUpdate(operation.nodeId, operation.changes);
                }
                else {
                    operations.push(operation);
                }
            }
            for (var _h = 0, diagnostics_1 = diagnostics; _h < diagnostics_1.length; _h++) {
                var diagnostic = diagnostics_1[_h];
                if (diagnostic.category === 'overlap') {
                    var left = (_b = this.recordFromUnknown((_a = diagnostic.details) === null || _a === void 0 ? void 0 : _a.left)) !== null && _b !== void 0 ? _b : boxById.get((_c = diagnostic.nodeId) !== null && _c !== void 0 ? _c : '');
                    var right = (_e = this.recordFromUnknown((_d = diagnostic.details) === null || _d === void 0 ? void 0 : _d.right)) !== null && _e !== void 0 ? _e : boxById.get((_f = diagnostic.otherNodeId) !== null && _f !== void 0 ? _f : '');
                    var leftBox = this.coerceCanvasBox(left);
                    var rightBox = this.coerceCanvasBox(right);
                    var target = this.chooseOverlapRepairTarget(leftBox, rightBox);
                    var anchor = (target === null || target === void 0 ? void 0 : target.id) === (leftBox === null || leftBox === void 0 ? void 0 : leftBox.id) ? rightBox : leftBox;
                    if (target && anchor) {
                        var targetWidth = Math.min(Math.max(96, this.numberValue(target.width, 120)), Math.max(96, pageWidth * 0.18));
                        var targetHeight = Math.min(Math.max(32, this.numberValue(anchor.height, target.height)), 52);
                        var rightOfAnchor = this.numberValue(anchor.x, 0) + this.numberValue(anchor.width, 0) + 8;
                        var belowAnchor = this.numberValue(anchor.y, 0) + this.numberValue(anchor.height, 0) + 8;
                        var x = rightOfAnchor + targetWidth <= pageWidth
                            ? rightOfAnchor
                            : Math.max(0, Math.min(pageWidth - targetWidth, this.numberValue(target.x, 0)));
                        var y = rightOfAnchor + targetWidth <= pageWidth
                            ? this.numberValue(anchor.y, this.numberValue(target.y, 0))
                            : Math.min(Math.max(0, belowAnchor), Math.max(0, pageHeight - targetHeight));
                        addUpdate(target.id, {
                            x: x,
                            y: y,
                            width: targetWidth,
                            height: targetHeight
                        });
                    }
                }
            }
            if (diagnostics.some(function (diagnostic) { var _a; return diagnostic.category === 'footer' || (diagnostic.category === 'clone-completeness' && ((_a = diagnostic.details) === null || _a === void 0 ? void 0 : _a.missing) === 'footer'); })) {
                operations.push(this.createCanvasFooterOperation(document));
            }
            if (diagnostics.some(function (diagnostic) { var _a; return diagnostic.category === 'clone-completeness' && ((_a = diagnostic.details) === null || _a === void 0 ? void 0 : _a.missing) === 'cart'; })) {
                operations.push(this.createCanvasCartOperation(document));
            }
            operations.unshift.apply(operations, __spreadArray([], updates.entries(), true).map(function (_a) {
                var nodeId = _a[0], changes = _a[1];
                return ({
                    operation: 'updateNode',
                    nodeId: nodeId,
                    changes: changes
                });
            }));
            var seen = new Set();
            return operations.filter(function (operation) {
                var key = JSON.stringify(operation);
                if (seen.has(key)) {
                    return false;
                }
                seen.add(key);
                return true;
            });
        };
        CyberVinciToolRegistry_1.prototype.chooseOverlapRepairTarget = function (left, right) {
            var _this = this;
            var _a;
            var candidates = [left, right].filter(function (box) { return !!box; });
            var editableCandidates = candidates.filter(function (box) { return !_this.isCanvasStructuralContainerBox(box); });
            var prioritized = editableCandidates.length ? editableCandidates : candidates;
            return (_a = prioritized.find(function (box) { var _a, _b; return /button|submit|card|cta|bot[aã]o/i.test("".concat(box.id, " ").concat((_a = box.name) !== null && _a !== void 0 ? _a : '', " ").concat((_b = box.text) !== null && _b !== void 0 ? _b : '')); })) !== null && _a !== void 0 ? _a : prioritized.sort(function (a, b) { return (b.width * b.height) - (a.width * a.height); })[0];
        };
        CyberVinciToolRegistry_1.prototype.recordFromUnknown = function (value) {
            return value && typeof value === 'object' && !Array.isArray(value)
                ? value
                : undefined;
        };
        CyberVinciToolRegistry_1.prototype.coerceCanvasBox = function (value) {
            if (!value || typeof value.id !== 'string' || typeof value.type !== 'string') {
                return undefined;
            }
            return {
                id: value.id,
                name: typeof value.name === 'string' ? value.name : undefined,
                type: value.type,
                x: this.numberValue(value.x, 0),
                y: this.numberValue(value.y, 0),
                width: this.numberValue(value.width, 0),
                height: this.numberValue(value.height, 0),
                parentId: typeof value.parentId === 'string' ? value.parentId : undefined,
                depth: this.numberValue(value.depth, 0),
                text: typeof value.text === 'string' ? value.text : undefined
            };
        };
        CyberVinciToolRegistry_1.prototype.createCanvasFooterOperation = function (document) {
            var page = this.getActiveCanvasPage(document);
            var pageWidth = typeof page.width === 'number' ? page.width : 900;
            var pageHeight = typeof page.height === 'number' ? page.height : 620;
            var footerHeight = 96;
            var footerY = Math.max(0, pageHeight - footerHeight);
            var suffix = Date.now().toString(36);
            return {
                operation: 'addNode',
                parentId: page.id,
                node: {
                    id: "canvas-qa-footer-".concat(suffix),
                    type: 'frame',
                    name: 'Canvas QA footer',
                    x: 0,
                    y: footerY,
                    width: pageWidth,
                    height: footerHeight,
                    fill: [{ type: 'solid', color: '#111827' }],
                    children: [
                        {
                            id: "canvas-qa-footer-title-".concat(suffix),
                            type: 'text',
                            name: 'Footer legal copy',
                            x: 32,
                            y: 28,
                            width: Math.max(220, pageWidth - 64),
                            height: 24,
                            content: 'Saara footer, support links, legal and company information',
                            fontSize: 14,
                            fontWeight: 600,
                            fill: [{ type: 'solid', color: '#ffffff' }]
                        },
                        {
                            id: "canvas-qa-footer-copy-".concat(suffix),
                            type: 'text',
                            name: 'Footer support copy',
                            x: 32,
                            y: 56,
                            width: Math.max(220, pageWidth - 64),
                            height: 20,
                            content: 'Ajuda | Pagamentos | Privacidade | Copyright',
                            fontSize: 12,
                            fill: [{ type: 'solid', color: '#cbd5e1' }]
                        }
                    ]
                }
            };
        };
        CyberVinciToolRegistry_1.prototype.createCanvasCartOperation = function (document) {
            var page = this.getActiveCanvasPage(document);
            var pageWidth = typeof page.width === 'number' ? page.width : 900;
            var suffix = Date.now().toString(36);
            return {
                operation: 'addNode',
                parentId: page.id,
                node: {
                    id: "canvas-qa-cart-".concat(suffix),
                    type: 'text',
                    name: 'Cart nav item',
                    x: Math.max(16, pageWidth - 146),
                    y: 36,
                    width: 110,
                    height: 24,
                    content: 'Carrinho',
                    fontSize: 13,
                    fontWeight: 600,
                    fill: [{ type: 'solid', color: '#111827' }]
                }
            };
        };
        CyberVinciToolRegistry_1.prototype.canvasDiagnosticRecommendation = function (diagnostic) {
            switch (diagnostic.category) {
                case 'overlap':
                    return 'Separate the overlapping nodes or reduce the oversized control.';
                case 'off-canvas':
                    return 'Resize or move the node so it fits inside the page bounds.';
                case 'text-overflow':
                    return 'Increase the text node height or reduce the text size/copy length.';
                case 'footer':
                case 'clone-completeness':
                    return 'Add the missing page module before final approval.';
                default:
                    return 'Review and repair this Canvas diagnostic before approval.';
            }
        };
        CyberVinciToolRegistry_1.prototype.getCanvasSession = function (context) {
            if (!this.openPencilDesignCommandService) {
                return { ok: false, message: 'Canvas design command service is not available.' };
            }
            var explicitUri = typeof context.input.uri === 'string' && context.input.uri.trim()
                ? new uri_1.default(context.input.uri)
                : undefined;
            var widgetUri = explicitUri !== null && explicitUri !== void 0 ? explicitUri : this.getActiveCanvasWidgetUri();
            if (!widgetUri) {
                return { ok: false, message: 'No active Canvas design widget or Canvas URI was found.' };
            }
            var session = this.openPencilDesignCommandService.getSession(widgetUri);
            if (!session) {
                return { ok: false, message: "No Canvas design session is registered for '".concat(widgetUri.toString(), "'.") };
            }
            return { ok: true, session: session };
        };
        CyberVinciToolRegistry_1.prototype.isCanvasSessionResult = function (candidate) {
            return candidate.ok === true && 'session' in candidate;
        };
        CyberVinciToolRegistry_1.prototype.getActiveCanvasWidgetUri = function () {
            var _a, _b, _c, _d, _e;
            var widget = (_a = this.shell) === null || _a === void 0 ? void 0 : _a.currentWidget;
            return (_e = (_c = (_b = widget === null || widget === void 0 ? void 0 : widget.getResourceUri) === null || _b === void 0 ? void 0 : _b.call(widget)) !== null && _c !== void 0 ? _c : (_d = widget === null || widget === void 0 ? void 0 : widget.getUri) === null || _d === void 0 ? void 0 : _d.call(widget)) !== null && _e !== void 0 ? _e : widget === null || widget === void 0 ? void 0 : widget.uri;
        };
        CyberVinciToolRegistry_1.prototype.getActiveCanvasWidget = function (uri) {
            var _a, _b;
            var widgets = [
                (_a = this.shell) === null || _a === void 0 ? void 0 : _a.currentWidget,
                (_b = this.shell) === null || _b === void 0 ? void 0 : _b.activeWidget
            ].filter(Boolean);
            return widgets.find(function (widget) {
                var _a, _b, _c, _d;
                var widgetUri = (_d = (_b = (_a = widget.getResourceUri) === null || _a === void 0 ? void 0 : _a.call(widget)) !== null && _b !== void 0 ? _b : (_c = widget.getUri) === null || _c === void 0 ? void 0 : _c.call(widget)) !== null && _d !== void 0 ? _d : widget.uri;
                return (widgetUri === null || widgetUri === void 0 ? void 0 : widgetUri.toString()) === uri.toString();
            });
        };
        CyberVinciToolRegistry_1.prototype.readCanvasOperations = function (context) {
            var _a;
            var value = (_a = context.input.operations) !== null && _a !== void 0 ? _a : context.input.operation;
            if (Array.isArray(value)) {
                return value.filter(function (item) { return item && typeof item === 'object'; });
            }
            if (value && typeof value === 'object') {
                return [value];
            }
            return [];
        };
        CyberVinciToolRegistry_1.prototype.readCanvasApplyOptions = function (context) {
            var options = context.input.options;
            return options && typeof options === 'object'
                ? options
                : {
                    normalizeVisibleBounds: true,
                    preservePageWidth: true,
                    requireVisibleContent: true,
                    removeAiPlaceholderSkeletons: true
                };
        };
        CyberVinciToolRegistry_1.prototype.computeCanvasDiagnostics = function (document, categories) {
            var _this = this;
            var selected = categories ? new Set(categories) : undefined;
            var include = function (category) { return !selected || selected.has(category); };
            var diagnostics = [];
            var page = this.getActiveCanvasPage(document);
            var boxes = this.flattenCanvasBoxes(page.children);
            if (include('document') && this.openPencilDesignCommandService) {
                var validation = this.openPencilDesignCommandService.validateDocument(document);
                diagnostics.push.apply(diagnostics, validation.issues.map(function (issue) { return _this.canvasValidationIssueToDiagnostic(issue); }));
                var quality = this.openPencilDesignCommandService.validateAiLayoutQuality(document, {
                    normalizeVisibleBounds: true,
                    preservePageWidth: true,
                    removeAiPlaceholderSkeletons: true
                });
                diagnostics.push.apply(diagnostics, quality.issues.map(function (issue) { return _this.canvasValidationIssueToDiagnostic(issue, 'layout-quality'); }));
            }
            if (include('off-canvas')) {
                diagnostics.push.apply(diagnostics, this.detectCanvasOffCanvasNodes(boxes, page));
            }
            if (include('overlap')) {
                diagnostics.push.apply(diagnostics, this.detectCanvasOverlaps(boxes));
            }
            if (include('text-overflow')) {
                diagnostics.push.apply(diagnostics, this.detectCanvasTextOverflow(boxes));
            }
            if (include('footer')) {
                diagnostics.push.apply(diagnostics, this.detectCanvasFooterPresence(boxes, page));
            }
            if (include('clone-completeness')) {
                diagnostics.push.apply(diagnostics, this.detectCanvasCloneCompleteness(document, boxes));
            }
            return diagnostics;
        };
        CyberVinciToolRegistry_1.prototype.canvasValidationIssueToDiagnostic = function (issue, category) {
            if (category === void 0) { category = 'document'; }
            return {
                category: category,
                severity: issue.severity === 'error' ? 'error' : 'warning',
                message: issue.message,
                details: { path: issue.path }
            };
        };
        CyberVinciToolRegistry_1.prototype.detectCanvasOffCanvasNodes = function (boxes, page) {
            var pageWidth = typeof page.width === 'number' ? page.width : 900;
            var pageHeight = typeof page.height === 'number' ? page.height : 620;
            return boxes
                .filter(function (box) { return box.x < -1 || box.y < -1 || box.x + box.width > pageWidth + 1 || box.y + box.height > pageHeight + 1; })
                .map(function (box) {
                var _a;
                return ({
                    category: 'off-canvas',
                    severity: 'error',
                    nodeId: box.id,
                    message: "Node '".concat((_a = box.name) !== null && _a !== void 0 ? _a : box.id, "' exceeds page bounds."),
                    details: { box: box, pageWidth: pageWidth, pageHeight: pageHeight }
                });
            });
        };
        CyberVinciToolRegistry_1.prototype.detectCanvasOverlaps = function (boxes) {
            var _a, _b;
            var diagnostics = [];
            var leafBoxes = boxes.filter(function (box) { return box.width > 2 && box.height > 2; });
            for (var index = 0; index < leafBoxes.length; index++) {
                for (var otherIndex = index + 1; otherIndex < leafBoxes.length; otherIndex++) {
                    var left = leafBoxes[index];
                    var right = leafBoxes[otherIndex];
                    if (left.parentId !== right.parentId || this.isLikelyIntentionalOverlap(left, right)) {
                        continue;
                    }
                    var area = this.intersectionArea(left, right);
                    var smaller = Math.min(left.width * left.height, right.width * right.height);
                    if (smaller > 0 && area / smaller > 0.35) {
                        diagnostics.push({
                            category: 'overlap',
                            severity: 'warning',
                            nodeId: left.id,
                            otherNodeId: right.id,
                            message: "Nodes '".concat((_a = left.name) !== null && _a !== void 0 ? _a : left.id, "' and '").concat((_b = right.name) !== null && _b !== void 0 ? _b : right.id, "' overlap substantially."),
                            details: { overlapRatio: area / smaller, left: left, right: right }
                        });
                    }
                }
            }
            return diagnostics;
        };
        CyberVinciToolRegistry_1.prototype.detectCanvasTextOverflow = function (boxes) {
            var _this = this;
            return boxes
                .filter(function (box) { return box.text && _this.estimatedTextHeight(box.text, box.width) > box.height + 4; })
                .map(function (box) {
                var _a;
                return ({
                    category: 'text-overflow',
                    severity: 'warning',
                    nodeId: box.id,
                    message: "Text node '".concat((_a = box.name) !== null && _a !== void 0 ? _a : box.id, "' may not have enough height for its content."),
                    details: {
                        box: box,
                        estimatedHeight: _this.estimatedTextHeight(box.text, box.width)
                    }
                });
            });
        };
        CyberVinciToolRegistry_1.prototype.detectCanvasFooterPresence = function (boxes, page) {
            var pageHeight = typeof page.height === 'number' ? page.height : 620;
            var hasFooter = boxes.some(function (box) {
                var _a, _b;
                return /footer|rodap[eé]|legal|copyright|links/i.test("".concat(box.id, " ").concat((_a = box.name) !== null && _a !== void 0 ? _a : '', " ").concat((_b = box.text) !== null && _b !== void 0 ? _b : ''))
                    || box.y > pageHeight * 0.78 && box.height > 40;
            });
            return hasFooter ? [] : [{
                    category: 'footer',
                    severity: 'warning',
                    message: 'No footer-like section was detected near the bottom of the Canvas page.'
                }];
        };
        CyberVinciToolRegistry_1.prototype.detectCanvasCloneCompleteness = function (document, boxes) {
            var _a;
            var text = "".concat((_a = document.name) !== null && _a !== void 0 ? _a : '', " ").concat(boxes.map(function (box) { var _a, _b; return "".concat(box.id, " ").concat((_a = box.name) !== null && _a !== void 0 ? _a : '', " ").concat((_b = box.text) !== null && _b !== void 0 ? _b : ''); }).join(' ')).toLowerCase();
            var looksMarketplace = /\bamazon\b|\bsaara\b|mercado|shop|cart|oferta|produto|categoria|compras/.test(text);
            if (!looksMarketplace) {
                return [];
            }
            var required = [
                { key: 'search', label: 'search input/header search', pattern: /search|busca|buscar|pesquisa/ },
                { key: 'cart', label: 'cart or checkout area', pattern: /cart|carrinho|checkout|compras/ },
                { key: 'cards', label: 'product/category cards', pattern: /card|produto|oferta|categoria|deal/ },
                { key: 'footer', label: 'footer', pattern: /footer|rodap[eé]|copyright|legal/ }
            ];
            return required
                .filter(function (item) { return !item.pattern.test(text); })
                .map(function (item) { return ({
                category: 'clone-completeness',
                severity: 'warning',
                message: "Marketplace clone appears to be missing ".concat(item.label, "."),
                details: { missing: item.key }
            }); });
        };
        CyberVinciToolRegistry_1.prototype.createResizeToFitOperations = function (document) {
            var _this = this;
            var page = this.getActiveCanvasPage(document);
            var pageWidth = typeof page.width === 'number' ? page.width : 900;
            var pageHeight = typeof page.height === 'number' ? page.height : 620;
            return this.flattenCanvasBoxes(page.children).flatMap(function (box) {
                var _a;
                var changes = {};
                if (box.x < 0) {
                    changes.x = 0;
                }
                if (box.y < 0) {
                    changes.y = 0;
                }
                if (box.x + box.width > pageWidth) {
                    changes.width = Math.max(8, pageWidth - Math.max(0, box.x));
                }
                if (box.y + box.height > pageHeight) {
                    changes.height = Math.max(8, pageHeight - Math.max(0, box.y));
                }
                if (box.text) {
                    var estimatedHeight = _this.estimatedTextHeight(box.text, box.width);
                    if (estimatedHeight > box.height + 4) {
                        changes.height = Math.max(Number((_a = changes.height) !== null && _a !== void 0 ? _a : box.height), estimatedHeight);
                    }
                }
                return Object.keys(changes).length
                    ? [{ operation: 'updateNode', nodeId: box.id, changes: changes }]
                    : [];
            });
        };
        CyberVinciToolRegistry_1.prototype.getActiveCanvasPage = function (document) {
            var _a, _b, _c, _d;
            var page = (_b = (_a = document.pages) === null || _a === void 0 ? void 0 : _a.find(function (item) { return item.id === document.activePageId; })) !== null && _b !== void 0 ? _b : (_c = document.pages) === null || _c === void 0 ? void 0 : _c[0];
            return page !== null && page !== void 0 ? page : { id: 'root', name: 'Page 1', width: 900, height: 620, children: (_d = document.children) !== null && _d !== void 0 ? _d : [] };
        };
        CyberVinciToolRegistry_1.prototype.summarizeCanvasDocument = function (document, page) {
            var boxes = this.flattenCanvasBoxes(page.children);
            return {
                name: document.name,
                activePageId: page.id,
                activePageName: page.name,
                pageWidth: page.width,
                pageHeight: page.height,
                nodeCount: boxes.length,
                contentBottom: boxes.reduce(function (bottom, box) { return Math.max(bottom, box.y + box.height); }, 0),
                topLevelNodeCount: page.children.length,
                topLevelNodes: page.children.map(function (node) {
                    var _a, _b;
                    return ({
                        id: node.id,
                        type: node.type,
                        name: node.name,
                        x: node.x,
                        y: node.y,
                        width: node.width,
                        height: node.height,
                        childCount: (_b = (_a = node.children) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0
                    });
                })
            };
        };
        CyberVinciToolRegistry_1.prototype.flattenCanvasBoxes = function (nodes, parentId, depth) {
            if (depth === void 0) { depth = 0; }
            var boxes = [];
            for (var _i = 0, _a = nodes !== null && nodes !== void 0 ? nodes : []; _i < _a.length; _i++) {
                var node = _a[_i];
                var width = this.numberValue(node.width, 0);
                var height = this.numberValue(node.height, 0);
                boxes.push({
                    id: node.id,
                    name: node.name,
                    type: node.type,
                    x: this.numberValue(node.x, 0),
                    y: this.numberValue(node.y, 0),
                    width: width,
                    height: height,
                    parentId: parentId,
                    depth: depth,
                    text: typeof node.content === 'string' ? node.content : undefined
                });
                boxes.push.apply(boxes, this.flattenCanvasBoxes(node.children, node.id, depth + 1));
            }
            return boxes;
        };
        CyberVinciToolRegistry_1.prototype.numberValue = function (value, fallback) {
            var parsed = typeof value === 'number'
                ? value
                : typeof value === 'string'
                    ? Number.parseFloat(value)
                    : NaN;
            return Number.isFinite(parsed) ? parsed : fallback;
        };
        CyberVinciToolRegistry_1.prototype.intersectionArea = function (left, right) {
            var x = Math.max(0, Math.min(left.x + left.width, right.x + right.width) - Math.max(left.x, right.x));
            var y = Math.max(0, Math.min(left.y + left.height, right.y + right.height) - Math.max(left.y, right.y));
            return x * y;
        };
        CyberVinciToolRegistry_1.prototype.isLikelyIntentionalOverlap = function (left, right) {
            var _a, _b;
            if (left.depth !== right.depth) {
                return true;
            }
            if (this.isCanvasStructuralContainerBox(left) !== this.isCanvasStructuralContainerBox(right)) {
                var structural = this.isCanvasStructuralContainerBox(left) ? left : right;
                var other = structural.id === left.id ? right : left;
                return structural.width * structural.height >= other.width * other.height;
            }
            var labels = "".concat(left.type, " ").concat(right.type, " ").concat((_a = left.name) !== null && _a !== void 0 ? _a : '', " ").concat((_b = right.name) !== null && _b !== void 0 ? _b : '').toLowerCase();
            return /icon|badge|avatar|overlay|shadow|background|bg|image/.test(labels);
        };
        CyberVinciToolRegistry_1.prototype.isCanvasStructuralContainerBox = function (box) {
            var _a;
            var label = "".concat(box.id, " ").concat((_a = box.name) !== null && _a !== void 0 ? _a : '', " ").concat(box.type).toLowerCase();
            return /header|footer|section|container|background|hero|nav/.test(label) && /frame|group|rectangle/.test(box.type.toLowerCase());
        };
        CyberVinciToolRegistry_1.prototype.estimatedTextHeight = function (text, width) {
            var usableWidth = Math.max(24, width);
            var averageCharWidth = 7.5;
            var charsPerLine = Math.max(1, Math.floor(usableWidth / averageCharWidth));
            var explicitLines = text.split(/\r?\n/);
            var lines = explicitLines.reduce(function (count, line) { return count + Math.max(1, Math.ceil(line.length / charsPerLine)); }, 0);
            return lines * 18;
        };
        CyberVinciToolRegistry_1.prototype.cloneJson = function (value) {
            return JSON.parse(JSON.stringify(value));
        };
        CyberVinciToolRegistry_1.prototype.readResultRecord = function (result) {
            return result.value && typeof result.value === 'object' && !Array.isArray(result.value)
                ? result.value
                : undefined;
        };
        CyberVinciToolRegistry_1.prototype.visionJudgeInputItems = function (context, visualSnapshot) {
            var items = [];
            var imageValues = [
                context.input.imageUrl,
                context.input.referenceImageUrl,
                context.input.referenceImage
            ];
            for (var _i = 0, imageValues_1 = imageValues; _i < imageValues_1.length; _i++) {
                var value = imageValues_1[_i];
                if (typeof value === 'string' && value.trim()) {
                    items.push({ type: 'image', url: value.trim() });
                }
            }
            if (Array.isArray(context.input.images)) {
                for (var _a = 0, _b = context.input.images; _a < _b.length; _a++) {
                    var value = _b[_a];
                    if (typeof value === 'string' && value.trim()) {
                        items.push({ type: 'image', url: value.trim() });
                    }
                }
            }
            var svg = visualSnapshot === null || visualSnapshot === void 0 ? void 0 : visualSnapshot.svg;
            if (typeof svg === 'string' && svg.trim()) {
                items.push({ type: 'image', url: this.svgToDataUrl(svg) });
            }
            return items;
        };
        CyberVinciToolRegistry_1.prototype.svgToDataUrl = function (svg) {
            var bytes = new TextEncoder().encode(svg);
            var binary = '';
            var chunkSize = 0x8000;
            for (var index = 0; index < bytes.length; index += chunkSize) {
                binary += String.fromCharCode.apply(String, bytes.slice(index, index + chunkSize));
            }
            return "data:image/svg+xml;base64,".concat(btoa(binary));
        };
        CyberVinciToolRegistry_1.prototype.readVisionExecutionSelection = function (context) {
            var useIndependentVisionModel = this.preferenceService.get(cybervinci_ai_chat_experience_preferences_1.CYBERVINCI_AI_CHAT_VISION_JUDGE_ENABLED_PREF, false);
            var execution = __assign(__assign(__assign({}, this.readAiExecutionSelection(context)), this.readObjectInput(context.input.visionExecution)), this.readObjectInput(context.input.visualExecution));
            var providerId = this.readFirstStringInput(context.input, ['visionProviderId', 'visualProviderId'])
                || (useIndependentVisionModel ? this.preferenceService.get(cybervinci_ai_chat_experience_preferences_1.CYBERVINCI_AI_CHAT_VISION_JUDGE_PROVIDER_PREF, '') : undefined);
            var model = this.readFirstStringInput(context.input, ['visionModel', 'visualModel'])
                || (useIndependentVisionModel ? this.preferenceService.get(cybervinci_ai_chat_experience_preferences_1.CYBERVINCI_AI_CHAT_VISION_JUDGE_MODEL_PREF, '') : undefined);
            var runtime = this.readFirstStringInput(context.input, ['visionRuntime', 'visualRuntime']);
            var modelProvider = this.readFirstStringInput(context.input, ['visionModelProvider', 'visualModelProvider']);
            return __assign(__assign({}, execution), { providerId: providerId || execution.providerId, model: model || execution.model, runtime: runtime || execution.runtime, modelProvider: modelProvider || execution.modelProvider });
        };
        CyberVinciToolRegistry_1.prototype.readAiExecutionSelection = function (context) {
            var execution = this.readObjectInput(context.input.execution);
            var providerId = this.readFirstStringInput(context.input, ['providerId']);
            var model = this.readFirstStringInput(context.input, ['model']);
            var runtime = this.readFirstStringInput(context.input, ['runtime']);
            var modelProvider = this.readFirstStringInput(context.input, ['modelProvider']);
            var reasoningEffort = this.readFirstStringInput(context.input, ['reasoningEffort']);
            var reasoningVariant = this.readFirstStringInput(context.input, ['reasoningVariant']);
            var serviceTier = this.readFirstStringInput(context.input, ['serviceTier']);
            return __assign(__assign({}, execution), { providerId: providerId || execution.providerId, model: model || execution.model, runtime: runtime || execution.runtime, modelProvider: modelProvider || execution.modelProvider, reasoningEffort: reasoningEffort || execution.reasoningEffort, reasoningVariant: reasoningVariant || execution.reasoningVariant, serviceTier: serviceTier || execution.serviceTier });
        };
        CyberVinciToolRegistry_1.prototype.readObjectInput = function (value) {
            return value && typeof value === 'object' && !Array.isArray(value)
                ? value
                : {};
        };
        CyberVinciToolRegistry_1.prototype.readFirstStringInput = function (input, keys) {
            for (var _i = 0, keys_1 = keys; _i < keys_1.length; _i++) {
                var key = keys_1[_i];
                var value = input[key];
                if (typeof value === 'string' && value.trim()) {
                    return value.trim();
                }
            }
            return undefined;
        };
        CyberVinciToolRegistry_1.prototype.resolveToolArgs = function (args, context) {
            var resolved = {};
            for (var _i = 0, _a = Object.entries(args); _i < _a.length; _i++) {
                var _b = _a[_i], key = _b[0], value = _b[1];
                resolved[key] = this.resolveToolValue(value, context);
            }
            return resolved;
        };
        CyberVinciToolRegistry_1.prototype.resolveToolValue = function (value, context) {
            var _this = this;
            if (typeof value !== 'string') {
                return value;
            }
            var exact = value.match(/^\$\{([^}]+)\}$/);
            if (exact) {
                return this.lookupToolPath(exact[1].trim(), context);
            }
            return value.replace(/\$\{([^}]+)\}/g, function (_match, expression) {
                var resolved = _this.lookupToolPath(expression.trim(), context);
                return resolved === undefined || resolved === null ? '' : String(resolved);
            });
        };
        CyberVinciToolRegistry_1.prototype.lookupToolPath = function (pathExpression, context) {
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
        CyberVinciToolRegistry_1.prototype.toFlowWorkflowSummaryForAi = function (workflow) {
            var _a;
            return {
                id: workflow.id,
                name: workflow.name,
                description: workflow.description,
                stateCount: Object.keys(workflow.states || {}).length,
                transitionCount: workflow.transitions.length,
                editable: ((_a = workflow.file) === null || _a === void 0 ? void 0 : _a.editable) !== false
            };
        };
        CyberVinciToolRegistry_1.prototype.toLanguageModelOptions = function (providers) {
            return providers.flatMap(function (provider) {
                var _a;
                var models = ((_a = provider.models) === null || _a === void 0 ? void 0 : _a.length) ? provider.models : provider.defaultModel ? [provider.defaultModel] : [];
                if (!models.length) {
                    return [{
                            id: provider.id,
                            label: provider.label,
                            status: provider.available ? 'ready' : 'unavailable'
                        }];
                }
                return models.map(function (model) { return ({
                    id: "".concat(provider.id, ":").concat(model),
                    label: "".concat(provider.label, " / ").concat(model),
                    status: provider.available ? 'ready' : 'unavailable'
                }); });
            });
        };
        CyberVinciToolRegistry_1.prototype.coerceFlowAiAuthoringDraft = function (value) {
            if (!value || typeof value !== 'object' || Array.isArray(value)) {
                throw new Error('Flow AI response must be a FlowAiAuthoringDraft object.');
            }
            var draft = value;
            if (typeof draft.version !== 'string' || typeof draft.action !== 'string') {
                throw new Error('Flow AI response must include version and action.');
            }
            if (!['run_saved_workflow', 'instantiate_pattern', 'create_workflow', 'ask_user'].includes(draft.action)) {
                throw new Error("Flow AI returned unsupported authoring action: ".concat(draft.action));
            }
            return draft;
        };
        CyberVinciToolRegistry_1.prototype.ensureToolPolicyApproved = function (tool, context) {
            return __awaiter(this, void 0, void 0, function () {
                var approval, requiresApproval, picked;
                var _a, _b, _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            approval = (_a = tool.policy) === null || _a === void 0 ? void 0 : _a.approval;
                            requiresApproval = approval === 'always'
                                || ((_b = tool.policy) === null || _b === void 0 ? void 0 : _b.requiresApproval) === true
                                || ((_c = tool.policy) === null || _c === void 0 ? void 0 : _c.requiresConfirmation) === true;
                            if (!requiresApproval) {
                                return [2 /*return*/, { ok: true }];
                            }
                            if (!this.quickPickService) {
                                return [2 /*return*/, {
                                        ok: false,
                                        value: { approvalRequired: true, toolId: tool.id, playbookId: context.playbookId, stateId: context.stateId },
                                        message: "Tool '".concat(tool.id, "' requires approval, but the approval UI is not available.")
                                    }];
                            }
                            return [4 /*yield*/, this.quickPickService.show([
                                    {
                                        label: "Approve ".concat(tool.name),
                                        description: tool.id,
                                        detail: tool.description,
                                        approved: true
                                    },
                                    {
                                        label: "Reject ".concat(tool.name),
                                        description: tool.id,
                                        detail: "Requested by ".concat((_d = context.playbookId) !== null && _d !== void 0 ? _d : 'unknown playbook').concat(context.stateId ? " / ".concat(context.stateId) : '', "."),
                                        approved: false
                                    }
                                ], {
                                    title: 'CyberVinci Tool Approval',
                                    placeholder: "Approve tool '".concat(tool.id, "'?")
                                })];
                        case 1:
                            picked = _e.sent();
                            if (!(picked === null || picked === void 0 ? void 0 : picked.approved)) {
                                return [2 /*return*/, { ok: false, message: "Tool '".concat(tool.id, "' was not approved.") }];
                            }
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        CyberVinciToolRegistry_1.prototype.playbookToFlowWorkflow = function (playbook, prompt) {
            var _a, _b, _c;
            var states = {};
            var transitions = [];
            var index = 0;
            for (var _i = 0, _d = playbook.states; _i < _d.length; _i++) {
                var playbookState = _d[_i];
                var state = playbookState;
                var id = String((_a = state.id) !== null && _a !== void 0 ? _a : "state_".concat(index + 1));
                var type = String((_b = state.type) !== null && _b !== void 0 ? _b : 'tool');
                states[id] = {
                    id: id,
                    type: this.playbookStateToFlowStateType(type),
                    agent: typeof state.agent === 'string' ? state.agent : undefined,
                    taskPrompt: this.playbookStatePrompt(state),
                    outputs: typeof state.saveAs === 'string' ? ["playbook/".concat(id, "-").concat(state.saveAs, ".json")] : undefined,
                    layout: {
                        x: 80 + (index % 4) * 260,
                        y: 80 + Math.floor(index / 4) * 180
                    },
                    playbookState: {
                        type: type,
                        tool: state.tool,
                        guard: state.guard,
                        mode: state.mode,
                        workflowId: state.workflowId,
                        route: state.route
                    }
                };
                for (var _e = 0, _f = this.playbookStateTransitions(state); _e < _f.length; _e++) {
                    var transition = _f[_e];
                    transitions.push({
                        id: "".concat(id, "_to_").concat(transition.to, "_").concat(transitions.length + 1).replace(/[^A-Za-z0-9_-]+/g, '_'),
                        from: id,
                        to: transition.to,
                        on: transition.on,
                        guard: transition.guard ? { playbook: transition.guard } : undefined
                    });
                }
                index++;
            }
            return {
                version: 'flow.workflow/v1',
                id: "playbook_".concat(playbook.id).replace(/[^A-Za-z0-9_-]+/g, '_'),
                name: "".concat(playbook.name, " Flow"),
                description: (_c = playbook.description) !== null && _c !== void 0 ? _c : "Compiled from CyberVinci Playbook '".concat(playbook.id, "'."),
                requires: {
                    capabilities: ['llm.agent.execute', 'run.event_stream']
                },
                states: states,
                transitions: transitions,
                agents: {
                    playbook: playbook.id
                }
            };
        };
        CyberVinciToolRegistry_1.prototype.playbookStateToFlowStateType = function (type) {
            switch (type) {
                case 'ai':
                    return 'agent';
                case 'ask':
                    return 'gate';
                case 'condition':
                    return 'condition';
                case 'parallel':
                    return 'parallel';
                case 'response':
                case 'end':
                    return 'report';
                case 'tool':
                case 'guard':
                case 'flow':
                case 'playbook':
                case 'start':
                default:
                    return 'command';
            }
        };
        CyberVinciToolRegistry_1.prototype.playbookStatePrompt = function (state) {
            var _a;
            var prompt = typeof state.prompt === 'string'
                ? state.prompt
                : typeof state.template === 'string'
                    ? state.template
                    : typeof state.text === 'string'
                        ? state.text
                        : '';
            var type = String((_a = state.type) !== null && _a !== void 0 ? _a : 'state');
            var tool = typeof state.tool === 'string' ? " Tool: ".concat(state.tool, ".") : '';
            var guard = typeof state.guard === 'string' ? " Guard: ".concat(state.guard, ".") : '';
            return [prompt, "CyberVinci Playbook state type: ".concat(type, ".").concat(tool).concat(guard)].filter(Boolean).join('\n\n');
        };
        CyberVinciToolRegistry_1.prototype.playbookStateTransitions = function (state) {
            var _a;
            var transitions = [];
            var push = function (to, on, guard) {
                if (typeof to === 'string' && to.trim()) {
                    transitions.push({ to: to.trim(), on: on, guard: guard });
                }
            };
            push(state.next, 'playbook.next');
            push(state.onPass, 'condition.passed');
            push(state.onFail, 'condition.failed');
            push(state.onError, 'workload.failed');
            for (var _i = 0, _b = Array.isArray(state.transitions) ? state.transitions : []; _i < _b.length; _i++) {
                var transition = _b[_i];
                if (transition && typeof transition === 'object') {
                    var typed = transition;
                    push(typed.to, 'transition.evaluated', typeof typed.label === 'string' ? typed.label : undefined);
                }
            }
            for (var _c = 0, _d = Array.isArray(state.options) ? state.options : []; _c < _d.length; _c++) {
                var option = _d[_c];
                if (option && typeof option === 'object') {
                    var typed = option;
                    push(typed.next, 'gate.approved', typeof typed.label === 'string' ? typed.label : undefined);
                }
            }
            for (var _e = 0, _f = Array.isArray(state.cases) ? state.cases : []; _e < _f.length; _e++) {
                var conditionCase = _f[_e];
                if (conditionCase && typeof conditionCase === 'object') {
                    var typed = conditionCase;
                    push(typed.next, 'transition.evaluated', JSON.stringify((_a = typed.if) !== null && _a !== void 0 ? _a : 'case'));
                }
            }
            for (var _g = 0, _h = Array.isArray(state.branches) ? state.branches : []; _g < _h.length; _g++) {
                var branch = _h[_g];
                push(branch, 'workload.created', 'parallel.branch');
            }
            return transitions;
        };
        CyberVinciToolRegistry_1.prototype.readNumberInput = function (value, fallback) {
            var parsed = typeof value === 'number'
                ? value
                : typeof value === 'string'
                    ? Number.parseInt(value, 10)
                    : NaN;
            return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
        };
        CyberVinciToolRegistry_1.prototype.readStringArray = function (value) {
            if (Array.isArray(value)) {
                var items = value.filter(function (item) { return typeof item === 'string' && !!item.trim(); }).map(function (item) { return item.trim(); });
                return items.length ? items : undefined;
            }
            if (typeof value === 'string' && value.trim()) {
                return value.split(',').map(function (item) { return item.trim(); }).filter(Boolean);
            }
            return undefined;
        };
        CyberVinciToolRegistry_1.prototype.readMemoryScope = function (value) {
            return value === 'global' || value === 'repository' || value === 'session' || value === 'task' || value === 'workspace'
                ? value
                : 'workspace';
        };
        CyberVinciToolRegistry_1.prototype.readMemoryType = function (value) {
            var allowed = [
                'user_preference',
                'project_decision',
                'project_convention',
                'file_location',
                'architecture_note',
                'bug_history',
                'command_note',
                'testing_note',
                'security_note',
                'generated_skill_note',
                'manual_note'
            ];
            return typeof value === 'string' && allowed.includes(value) ? value : 'manual_note';
        };
        CyberVinciToolRegistry_1.prototype.readMemoryTitle = function (input, content) {
            var _a;
            if (typeof input.title === 'string' && input.title.trim()) {
                return input.title.trim();
            }
            return ((_a = content.split(/\r?\n/).find(function (line) { return line.trim(); })) === null || _a === void 0 ? void 0 : _a.trim().slice(0, 80)) || 'CyberVinci Playbook Memory';
        };
        CyberVinciToolRegistry_1.prototype.executeSystemStub = function (toolId) {
            this.logger.warn("CyberVinci tool '".concat(toolId, "' is registered but has no browser host implementation."));
            return { ok: false, message: "Tool '".concat(toolId, "' has no host implementation.") };
        };
        CyberVinciToolRegistry_1.prototype.readWorkspaceRootUri = function (context) {
            var _a;
            var value = (_a = context.input.workspaceRootUri) !== null && _a !== void 0 ? _a : context.state.workspaceRootUri;
            return typeof value === 'string' && value.trim() ? value : undefined;
        };
        CyberVinciToolRegistry_1.prototype.resolveWorkspaceRootUri = function (context) {
            return __awaiter(this, void 0, void 0, function () {
                var explicit, roots;
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            explicit = this.readWorkspaceRootUri(context);
                            if (explicit) {
                                return [2 /*return*/, explicit];
                            }
                            return [4 /*yield*/, ((_a = this.workspaceService) === null || _a === void 0 ? void 0 : _a.roots)];
                        case 1:
                            roots = _c.sent();
                            return [2 /*return*/, (_b = roots === null || roots === void 0 ? void 0 : roots[0]) === null || _b === void 0 ? void 0 : _b.resource.toString()];
                    }
                });
            });
        };
        CyberVinciToolRegistry_1.prototype.resolveWorkspacePath = function (context) {
            return __awaiter(this, void 0, void 0, function () {
                var explicit, workspaceRootUri;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            explicit = (_a = context.input.workspacePath) !== null && _a !== void 0 ? _a : context.state.workspacePath;
                            if (typeof explicit === 'string' && explicit.trim()) {
                                return [2 /*return*/, explicit.trim()];
                            }
                            return [4 /*yield*/, this.resolveWorkspaceRootUri(context)];
                        case 1:
                            workspaceRootUri = _b.sent();
                            if (!workspaceRootUri) {
                                return [2 /*return*/, undefined];
                            }
                            try {
                                return [2 /*return*/, file_uri_1.FileUri.fsPath(workspaceRootUri)];
                            }
                            catch (_c) {
                                return [2 /*return*/, undefined];
                            }
                            return [2 /*return*/];
                    }
                });
            });
        };
        return CyberVinciToolRegistry_1;
    }());
    __setFunctionName(_classThis, "CyberVinciToolRegistry");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _service_decorators = [(0, inversify_1.inject)(common_5.CyberVinciAiChatExperienceService)];
        _commandService_decorators = [(0, inversify_1.inject)(core_1.CommandService)];
        _preferenceService_decorators = [(0, inversify_1.inject)(preferences_1.PreferenceService)];
        _logger_decorators = [(0, inversify_1.inject)(core_1.ILogger)];
        _flowService_decorators = [(0, inversify_1.inject)(common_1.FlowService), (0, inversify_1.optional)()];
        _memoryService_decorators = [(0, inversify_1.inject)(common_2.MemoryService), (0, inversify_1.optional)()];
        _aiRuntime_decorators = [(0, inversify_1.inject)(ai_runtime_frontend_service_1.CyberVinciAiRuntimeFrontendService), (0, inversify_1.optional)()];
        _toolInvocationRegistry_decorators = [(0, inversify_1.inject)(ai_core_1.ToolInvocationRegistry), (0, inversify_1.optional)()];
        _chatAgentService_decorators = [(0, inversify_1.inject)(common_3.ChatAgentService), (0, inversify_1.optional)()];
        _mcpService_decorators = [(0, inversify_1.inject)(mcp_server_manager_1.MCPFrontendService), (0, inversify_1.optional)()];
        _openPencilDesignCommandService_decorators = [(0, inversify_1.inject)(openpencil_design_command_service_1.OpenPencilDesignCommandService), (0, inversify_1.optional)()];
        _shell_decorators = [(0, inversify_1.inject)(browser_1.ApplicationShell), (0, inversify_1.optional)()];
        _workspaceService_decorators = [(0, inversify_1.inject)(browser_2.WorkspaceService), (0, inversify_1.optional)()];
        _quickPickService_decorators = [(0, inversify_1.inject)(quick_pick_service_1.QuickPickService), (0, inversify_1.optional)()];
        __esDecorate(null, null, _service_decorators, { kind: "field", name: "service", static: false, private: false, access: { has: function (obj) { return "service" in obj; }, get: function (obj) { return obj.service; }, set: function (obj, value) { obj.service = value; } }, metadata: _metadata }, _service_initializers, _service_extraInitializers);
        __esDecorate(null, null, _commandService_decorators, { kind: "field", name: "commandService", static: false, private: false, access: { has: function (obj) { return "commandService" in obj; }, get: function (obj) { return obj.commandService; }, set: function (obj, value) { obj.commandService = value; } }, metadata: _metadata }, _commandService_initializers, _commandService_extraInitializers);
        __esDecorate(null, null, _preferenceService_decorators, { kind: "field", name: "preferenceService", static: false, private: false, access: { has: function (obj) { return "preferenceService" in obj; }, get: function (obj) { return obj.preferenceService; }, set: function (obj, value) { obj.preferenceService = value; } }, metadata: _metadata }, _preferenceService_initializers, _preferenceService_extraInitializers);
        __esDecorate(null, null, _logger_decorators, { kind: "field", name: "logger", static: false, private: false, access: { has: function (obj) { return "logger" in obj; }, get: function (obj) { return obj.logger; }, set: function (obj, value) { obj.logger = value; } }, metadata: _metadata }, _logger_initializers, _logger_extraInitializers);
        __esDecorate(null, null, _flowService_decorators, { kind: "field", name: "flowService", static: false, private: false, access: { has: function (obj) { return "flowService" in obj; }, get: function (obj) { return obj.flowService; }, set: function (obj, value) { obj.flowService = value; } }, metadata: _metadata }, _flowService_initializers, _flowService_extraInitializers);
        __esDecorate(null, null, _memoryService_decorators, { kind: "field", name: "memoryService", static: false, private: false, access: { has: function (obj) { return "memoryService" in obj; }, get: function (obj) { return obj.memoryService; }, set: function (obj, value) { obj.memoryService = value; } }, metadata: _metadata }, _memoryService_initializers, _memoryService_extraInitializers);
        __esDecorate(null, null, _aiRuntime_decorators, { kind: "field", name: "aiRuntime", static: false, private: false, access: { has: function (obj) { return "aiRuntime" in obj; }, get: function (obj) { return obj.aiRuntime; }, set: function (obj, value) { obj.aiRuntime = value; } }, metadata: _metadata }, _aiRuntime_initializers, _aiRuntime_extraInitializers);
        __esDecorate(null, null, _toolInvocationRegistry_decorators, { kind: "field", name: "toolInvocationRegistry", static: false, private: false, access: { has: function (obj) { return "toolInvocationRegistry" in obj; }, get: function (obj) { return obj.toolInvocationRegistry; }, set: function (obj, value) { obj.toolInvocationRegistry = value; } }, metadata: _metadata }, _toolInvocationRegistry_initializers, _toolInvocationRegistry_extraInitializers);
        __esDecorate(null, null, _chatAgentService_decorators, { kind: "field", name: "chatAgentService", static: false, private: false, access: { has: function (obj) { return "chatAgentService" in obj; }, get: function (obj) { return obj.chatAgentService; }, set: function (obj, value) { obj.chatAgentService = value; } }, metadata: _metadata }, _chatAgentService_initializers, _chatAgentService_extraInitializers);
        __esDecorate(null, null, _mcpService_decorators, { kind: "field", name: "mcpService", static: false, private: false, access: { has: function (obj) { return "mcpService" in obj; }, get: function (obj) { return obj.mcpService; }, set: function (obj, value) { obj.mcpService = value; } }, metadata: _metadata }, _mcpService_initializers, _mcpService_extraInitializers);
        __esDecorate(null, null, _openPencilDesignCommandService_decorators, { kind: "field", name: "openPencilDesignCommandService", static: false, private: false, access: { has: function (obj) { return "openPencilDesignCommandService" in obj; }, get: function (obj) { return obj.openPencilDesignCommandService; }, set: function (obj, value) { obj.openPencilDesignCommandService = value; } }, metadata: _metadata }, _openPencilDesignCommandService_initializers, _openPencilDesignCommandService_extraInitializers);
        __esDecorate(null, null, _shell_decorators, { kind: "field", name: "shell", static: false, private: false, access: { has: function (obj) { return "shell" in obj; }, get: function (obj) { return obj.shell; }, set: function (obj, value) { obj.shell = value; } }, metadata: _metadata }, _shell_initializers, _shell_extraInitializers);
        __esDecorate(null, null, _workspaceService_decorators, { kind: "field", name: "workspaceService", static: false, private: false, access: { has: function (obj) { return "workspaceService" in obj; }, get: function (obj) { return obj.workspaceService; }, set: function (obj, value) { obj.workspaceService = value; } }, metadata: _metadata }, _workspaceService_initializers, _workspaceService_extraInitializers);
        __esDecorate(null, null, _quickPickService_decorators, { kind: "field", name: "quickPickService", static: false, private: false, access: { has: function (obj) { return "quickPickService" in obj; }, get: function (obj) { return obj.quickPickService; }, set: function (obj, value) { obj.quickPickService = value; } }, metadata: _metadata }, _quickPickService_initializers, _quickPickService_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        CyberVinciToolRegistry = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return CyberVinciToolRegistry = _classThis;
}();
exports.CyberVinciToolRegistry = CyberVinciToolRegistry;
function normalizeFlowGateDecision(value) {
    var normalized = String(value || 'approved').trim().toLowerCase();
    if (normalized === 'rejected' || normalized === 'reject' || normalized === 'failed' || normalized === 'fail') {
        return 'rejected';
    }
    if (normalized === 'revision_requested' || normalized === 'changes_requested' || normalized === 'review' || normalized === 'repair') {
        return 'revision_requested';
    }
    return 'approved';
}
function toOptionalString(value) {
    var text = typeof value === 'string' ? value.trim() : value === undefined || value === null ? '' : String(value).trim();
    return text || undefined;
}

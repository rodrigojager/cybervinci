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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CyberVinciFlowPlaybookRunner = void 0;
var inversify_1 = require("@theia/core/shared/inversify");
var common_1 = require("../common");
var cybervinci_agency_agent_service_1 = require("./cybervinci-agency-agent-service");
var MAX_FLOW_PLAYBOOK_STEPS = 64;
var CyberVinciFlowPlaybookRunner = function () {
    var _classDecorators = [(0, inversify_1.injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _service_decorators;
    var _service_initializers = [];
    var _service_extraInitializers = [];
    var CyberVinciFlowPlaybookRunner = _classThis = /** @class */ (function () {
        function CyberVinciFlowPlaybookRunner_1() {
            this.service = __runInitializers(this, _service_initializers, void 0);
            __runInitializers(this, _service_extraInitializers);
        }
        CyberVinciFlowPlaybookRunner_1.prototype.available = function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, true];
                });
            });
        };
        CyberVinciFlowPlaybookRunner_1.prototype.runPlaybook = function (request) {
            return __awaiter(this, void 0, void 0, function () {
                var delegated, message, playbook, delegated, message, context, result, ok;
                var _this = this;
                var _a, _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            if (!(request.playbookId === common_1.CYBERVINCI_FRONTEND_BRIDGE_SMOKE_PLAYBOOK_ID)) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.service.runPlaybookFromFlowOnClient(request)];
                        case 1:
                            delegated = _d.sent();
                            if (delegated) {
                                return [2 /*return*/, delegated];
                            }
                            message = "Playbook '".concat(request.playbookId, "' requires the frontend Playbook runtime, but no frontend client is connected.");
                            return [2 /*return*/, {
                                    ok: false,
                                    message: message,
                                    issues: [this.issue(message)],
                                    diagnostics: [message]
                                }];
                        case 2: return [4 /*yield*/, this.service.getPlaybook(request.playbookId)];
                        case 3:
                            playbook = _d.sent();
                            if (!playbook) {
                                return [2 /*return*/, {
                                        ok: false,
                                        message: "Playbook '".concat(request.playbookId, "' was not found."),
                                        issues: [this.issue("Playbook '".concat(request.playbookId, "' was not found."))]
                                    }];
                            }
                            return [4 /*yield*/, this.shouldUseFrontendRuntime(playbook)];
                        case 4:
                            if (!_d.sent()) return [3 /*break*/, 6];
                            return [4 /*yield*/, this.service.runPlaybookFromFlowOnClient(request)];
                        case 5:
                            delegated = _d.sent();
                            if (delegated) {
                                return [2 /*return*/, delegated];
                            }
                            message = "Playbook '".concat(playbook.id, "' requires the frontend Playbook runtime, but no frontend client is connected.");
                            return [2 /*return*/, {
                                    ok: false,
                                    message: message,
                                    issues: [this.issue(message)],
                                    diagnostics: [message]
                                }];
                        case 6:
                            context = {
                                requestId: "flow-".concat(request.runId, "-").concat(request.workloadId),
                                playbookId: playbook.id,
                                prompt: request.prompt,
                                input: __assign(__assign({}, request.input), { prompt: request.prompt, rawPrompt: request.prompt, flow: __assign(__assign({}, (isRecord(request.input.flow) ? request.input.flow : {})), { workflowId: request.workflowId, runId: request.runId, stateId: request.stateId, workloadId: request.workloadId }) }),
                                state: {},
                                diagnostics: [],
                                events: []
                            };
                            context.events.push({
                                timestamp: Date.now(),
                                type: 'started',
                                message: "Flow started CyberVinci Playbook '".concat(playbook.id, "'.")
                            });
                            return [4 /*yield*/, this.runPlaybookFrom(playbook, context, playbook.entry)];
                        case 7:
                            result = _d.sent();
                            ok = result.ok !== false && context.diagnostics.length === 0;
                            context.events.push({
                                timestamp: Date.now(),
                                type: ok ? 'completed' : 'failed',
                                message: (_a = result.message) !== null && _a !== void 0 ? _a : "Playbook '".concat(playbook.id, "' ").concat(ok ? 'completed' : 'failed', ".")
                            });
                            return [2 /*return*/, {
                                    ok: ok,
                                    stop: result.stop,
                                    message: (_b = result.message) !== null && _b !== void 0 ? _b : "Playbook '".concat(playbook.id, "' completed from Flow."),
                                    value: {
                                        playbookId: playbook.id,
                                        requestId: context.requestId,
                                        prompt: (_c = result.prompt) !== null && _c !== void 0 ? _c : context.prompt,
                                        state: context.state,
                                        events: context.events
                                    },
                                    signals: {
                                        'cybervinci.playbook.id': playbook.id,
                                        'cybervinci.playbook.requestId': context.requestId
                                    },
                                    issues: context.diagnostics.map(function (message) { return _this.issue(message); }),
                                    diagnostics: context.diagnostics
                                }];
                    }
                });
            });
        };
        CyberVinciFlowPlaybookRunner_1.prototype.shouldUseFrontendRuntime = function (playbook_1) {
            return __awaiter(this, arguments, void 0, function (playbook, visited) {
                var tools, _a, _i, _b, state, toolId, tool, childPlaybookId, child, _c;
                var _d, _e, _f, _g;
                if (visited === void 0) { visited = new Set(); }
                return __generator(this, function (_h) {
                    switch (_h.label) {
                        case 0:
                            if (visited.has(playbook.id)) {
                                return [2 /*return*/, false];
                            }
                            visited.add(playbook.id);
                            _a = Map.bind;
                            return [4 /*yield*/, this.service.listTools()];
                        case 1:
                            tools = new (_a.apply(Map, [void 0, (_h.sent()).map(function (tool) { return [tool.id, tool]; })]))();
                            _i = 0, _b = playbook.states;
                            _h.label = 2;
                        case 2:
                            if (!(_i < _b.length)) return [3 /*break*/, 7];
                            state = _b[_i];
                            if (state.type === 'ask' || state.type === 'flow') {
                                return [2 /*return*/, true];
                            }
                            if (state.type === 'ai' && (!!state.outputSchema || state.outputMode === 'json' || Boolean(state.input) || Boolean(state.agent))) {
                                return [2 /*return*/, true];
                            }
                            if (state.type === 'tool' || state.type === 'guard') {
                                toolId = (_d = state.tool) !== null && _d !== void 0 ? _d : state.guard;
                                tool = toolId ? tools.get(toolId) : undefined;
                                if (!tool || tool.implementation === 'host' || ((_e = tool.entry) === null || _e === void 0 ? void 0 : _e.type) === 'core' || ((_f = tool.entry) === null || _f === void 0 ? void 0 : _f.type) === 'theia-tool') {
                                    return [2 /*return*/, true];
                                }
                            }
                            childPlaybookId = state.type === 'playbook' ? (_g = state.playbook) !== null && _g !== void 0 ? _g : state.playbookId : undefined;
                            if (!childPlaybookId) return [3 /*break*/, 6];
                            return [4 /*yield*/, this.service.getPlaybook(childPlaybookId)];
                        case 3:
                            child = _h.sent();
                            _c = !child;
                            if (_c) return [3 /*break*/, 5];
                            return [4 /*yield*/, this.shouldUseFrontendRuntime(child, visited)];
                        case 4:
                            _c = (_h.sent());
                            _h.label = 5;
                        case 5:
                            if (_c) {
                                return [2 /*return*/, true];
                            }
                            _h.label = 6;
                        case 6:
                            _i++;
                            return [3 /*break*/, 2];
                        case 7: return [2 /*return*/, false];
                    }
                });
            });
        };
        CyberVinciFlowPlaybookRunner_1.prototype.runPlaybookFrom = function (playbook, context, entry) {
            return __awaiter(this, void 0, void 0, function () {
                var states, stateId, lastResult, step, state, startedAt, result;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            states = new Map(playbook.states.map(function (state) { return [state.id, state]; }));
                            stateId = entry;
                            lastResult = {};
                            step = 0;
                            _a.label = 1;
                        case 1:
                            if (!(stateId && step < MAX_FLOW_PLAYBOOK_STEPS)) return [3 /*break*/, 4];
                            state = states.get(stateId);
                            if (!state) {
                                return [2 /*return*/, this.fail(context, stateId, "Playbook '".concat(playbook.id, "' references unknown state '").concat(stateId, "'."))];
                            }
                            startedAt = Date.now();
                            context.events.push({
                                timestamp: startedAt,
                                type: 'state',
                                stateId: state.id,
                                message: "Entering state '".concat(state.id, "' (").concat(state.type, ").")
                            });
                            return [4 /*yield*/, this.executeState(playbook, state, context)];
                        case 2:
                            result = _a.sent();
                            context.events.push({
                                timestamp: Date.now(),
                                type: 'state',
                                stateId: state.id,
                                message: "State '".concat(state.id, "' (").concat(state.type, ") completed."),
                                durationMs: Date.now() - startedAt,
                                data: {
                                    ok: result.ok !== false,
                                    stop: result.stop === true,
                                    next: result.next
                                }
                            });
                            lastResult = result;
                            if (result.prompt !== undefined) {
                                context.prompt = result.prompt;
                            }
                            if (result.ok === false) {
                                stateId = state.onError;
                                if (stateId) {
                                    return [3 /*break*/, 3];
                                }
                                return [2 /*return*/, result];
                            }
                            if (result.stop || result.paused) {
                                return [2 /*return*/, result];
                            }
                            stateId = this.resolveNextState(state, result, context);
                            _a.label = 3;
                        case 3:
                            step++;
                            return [3 /*break*/, 1];
                        case 4:
                            if (stateId) {
                                return [2 /*return*/, this.fail(context, stateId, "Playbook '".concat(playbook.id, "' exceeded ").concat(MAX_FLOW_PLAYBOOK_STEPS, " steps."))];
                            }
                            return [2 /*return*/, lastResult];
                    }
                });
            });
        };
        CyberVinciFlowPlaybookRunner_1.prototype.executeState = function (playbook, state, context) {
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
                        case 'condition':
                            return [2 /*return*/, { next: this.resolveConditionState(state, context) }];
                        case 'response':
                            return [2 /*return*/, this.executeResponseState(state, context)];
                        case 'ai':
                            return [2 /*return*/, this.executeAiState(state, context)];
                        case 'ask':
                            return [2 /*return*/, this.executeAskState(state, context)];
                        case 'playbook':
                            return [2 /*return*/, this.executeNestedPlaybookState(state, context)];
                        case 'parallel':
                            return [2 /*return*/, this.executeParallelState(playbook, state, context)];
                        case 'flow':
                            return [2 /*return*/, {
                                    ok: false,
                                    stop: true,
                                    message: "Flow state '".concat(state.id, "' cannot be executed inside the backend Flow Playbook runner to avoid recursive Flow execution.")
                                }];
                        default:
                            return [2 /*return*/, { ok: false, stop: true, message: "Unknown playbook state type '".concat(state.type, "'.") }];
                    }
                    return [2 /*return*/];
                });
            });
        };
        CyberVinciFlowPlaybookRunner_1.prototype.executeToolState = function (playbook, state, context, explicitToolId) {
            return __awaiter(this, void 0, void 0, function () {
                var toolId, tool, input, startedAt, execution, result;
                var _a, _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            toolId = explicitToolId === null || explicitToolId === void 0 ? void 0 : explicitToolId.trim();
                            if (!toolId) {
                                return [2 /*return*/, { ok: false, stop: true, message: "State '".concat(state.id, "' does not define a tool.") }];
                            }
                            return [4 /*yield*/, this.service.listTools()];
                        case 1:
                            tool = (_d.sent()).find(function (candidate) { return candidate.id === toolId; });
                            if ((tool === null || tool === void 0 ? void 0 : tool.implementation) === 'host' || ((_a = tool === null || tool === void 0 ? void 0 : tool.entry) === null || _a === void 0 ? void 0 : _a.type) === 'core' || ((_b = tool === null || tool === void 0 ? void 0 : tool.entry) === null || _b === void 0 ? void 0 : _b.type) === 'theia-tool') {
                                return [2 /*return*/, {
                                        ok: false,
                                        stop: true,
                                        message: "Tool '".concat(toolId, "' requires the frontend Playbook runtime or Theia tool bridge and cannot run in backend Flow context.")
                                    }];
                            }
                            input = this.resolveRecord(__assign({ prompt: context.prompt }, ((_c = state.args) !== null && _c !== void 0 ? _c : {})), context);
                            startedAt = Date.now();
                            return [4 /*yield*/, this.service.executeDeclarativeTool(toolId, JSON.stringify(input))];
                        case 2:
                            execution = _d.sent();
                            result = this.commandToolResult(execution);
                            context.events.push({
                                timestamp: Date.now(),
                                type: 'tool',
                                stateId: state.id,
                                message: "Tool '".concat(toolId, "' completed with ok=").concat(result.ok, "."),
                                durationMs: Date.now() - startedAt,
                                data: {
                                    toolId: toolId,
                                    exitCode: execution.exitCode
                                }
                            });
                            this.captureToolResult(state, result, context);
                            return [2 /*return*/, {
                                    ok: result.ok,
                                    stop: result.stop,
                                    message: result.message
                                }];
                    }
                });
            });
        };
        CyberVinciFlowPlaybookRunner_1.prototype.executeGuardState = function (playbook, state, context) {
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
        CyberVinciFlowPlaybookRunner_1.prototype.executeAskState = function (state, context) {
            var _a, _b, _c;
            var options = (_a = state.options) !== null && _a !== void 0 ? _a : [];
            var selected = this.resolveAskOptionSelection(state, context);
            if (selected) {
                var saveKey = (_b = state.saveAs) !== null && _b !== void 0 ? _b : state.id;
                context.state[saveKey] = selected.id;
                context.state["".concat(saveKey, "Meta")] = {
                    optionId: selected.id,
                    label: selected.label,
                    next: selected.next,
                    selectedAt: Date.now()
                };
                return { ok: true, next: selected.next };
            }
            context.state[(_c = state.saveAs) !== null && _c !== void 0 ? _c : state.id] = {
                status: 'paused',
                reason: "Ask state '".concat(state.id, "' needs an explicit optionId in Flow playbookInput."),
                options: options.map(function (option) { return ({ id: option.id, label: option.label, next: option.next }); })
            };
            return {
                ok: false,
                stop: true,
                paused: true,
                message: "Ask state '".concat(state.id, "' needs an explicit optionId in Flow playbookInput.")
            };
        };
        CyberVinciFlowPlaybookRunner_1.prototype.executeAiState = function (state, context) {
            var _a, _b;
            var nextPrompt = state.prompt || state.template
                ? this.renderTemplate((_b = (_a = state.prompt) !== null && _a !== void 0 ? _a : state.template) !== null && _b !== void 0 ? _b : '', context)
                : context.prompt;
            var wantsStructuredOutput = !!state.outputSchema || state.outputMode === 'json';
            if (wantsStructuredOutput || state.input || state.agent) {
                return {
                    ok: false,
                    stop: true,
                    message: "AI state '".concat(state.id, "' requires CyberVinci AI Runtime frontend execution and cannot run in backend Flow context.")
                };
            }
            if (state.saveAs) {
                context.state[state.saveAs] = nextPrompt;
            }
            return { ok: true, prompt: nextPrompt };
        };
        CyberVinciFlowPlaybookRunner_1.prototype.executeNestedPlaybookState = function (state, context) {
            return __awaiter(this, void 0, void 0, function () {
                var playbookId, child, previousPlaybookId, result;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            playbookId = (_a = state.playbook) !== null && _a !== void 0 ? _a : state.playbookId;
                            if (!playbookId) {
                                return [2 /*return*/, { ok: false, stop: true, message: "Nested playbook state '".concat(state.id, "' does not define playbook/playbookId.") }];
                            }
                            return [4 /*yield*/, this.service.getPlaybook(playbookId)];
                        case 1:
                            child = _b.sent();
                            if (!child) {
                                return [2 /*return*/, { ok: false, stop: true, message: "Nested playbook '".concat(playbookId, "' was not found.") }];
                            }
                            previousPlaybookId = context.playbookId;
                            context.playbookId = child.id;
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
                            return [2 /*return*/, result];
                        case 4:
                            context.playbookId = previousPlaybookId;
                            return [7 /*endfinally*/];
                        case 5: return [2 /*return*/];
                    }
                });
            });
        };
        CyberVinciFlowPlaybookRunner_1.prototype.executeParallelState = function (playbook, state, context) {
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
                                return [2 /*return*/, { ok: false, stop: true, message: "Parallel state '".concat(state.id, "' does not define branches.") }];
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
        CyberVinciFlowPlaybookRunner_1.prototype.executeResponseState = function (state, context) {
            var _a, _b, _c;
            return {
                ok: true,
                stop: true,
                message: this.renderTemplate((_c = (_b = (_a = state.template) !== null && _a !== void 0 ? _a : state.prompt) !== null && _b !== void 0 ? _b : state.text) !== null && _c !== void 0 ? _c : '', context)
            };
        };
        CyberVinciFlowPlaybookRunner_1.prototype.commandToolResult = function (result) {
            var parsed = parseJsonValue(result.stdout.trim());
            return {
                ok: result.exitCode === 0,
                value: parsed !== null && parsed !== void 0 ? parsed : {
                    stdout: result.stdout,
                    stderr: result.stderr,
                    exitCode: result.exitCode
                },
                message: result.stderr || result.stdout || "Command exited with ".concat(result.exitCode, "."),
                diagnostics: result.exitCode === 0 || !result.stderr ? [] : [result.stderr],
                stop: result.exitCode !== 0
            };
        };
        CyberVinciFlowPlaybookRunner_1.prototype.captureToolResult = function (state, result, context) {
            var _a;
            var _b, _c, _d;
            if (state.saveAs) {
                context.state[state.saveAs] = (_c = (_b = result.value) !== null && _b !== void 0 ? _b : result.message) !== null && _c !== void 0 ? _c : result.ok;
            }
            if ((_d = result.diagnostics) === null || _d === void 0 ? void 0 : _d.length) {
                (_a = context.diagnostics).push.apply(_a, result.diagnostics);
            }
        };
        CyberVinciFlowPlaybookRunner_1.prototype.resolveNextState = function (state, result, context) {
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
        CyberVinciFlowPlaybookRunner_1.prototype.resolveConditionState = function (state, context) {
            var _a, _b;
            for (var _i = 0, _c = (_a = state.cases) !== null && _a !== void 0 ? _a : []; _i < _c.length; _i++) {
                var conditionCase = _c[_i];
                if (this.evaluateCondition(conditionCase.if, context)) {
                    return conditionCase.next;
                }
            }
            return (_b = state.default) !== null && _b !== void 0 ? _b : state.next;
        };
        CyberVinciFlowPlaybookRunner_1.prototype.evaluateCondition = function (condition, context) {
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
        CyberVinciFlowPlaybookRunner_1.prototype.resolveAskOptionSelection = function (state, context) {
            var _a, _b;
            var options = (_a = state.options) !== null && _a !== void 0 ? _a : [];
            var saveKey = (_b = state.saveAs) !== null && _b !== void 0 ? _b : state.id;
            var candidateKeys = ['optionId', 'askOptionId', 'askOption', 'selectedOption', 'choice', 'decision', saveKey, state.id];
            var candidateSources = [context.input, context.state].filter(function (source) { return isRecord(source); });
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
        CyberVinciFlowPlaybookRunner_1.prototype.matchAskOption = function (options, value) {
            var _a, _b, _c, _d, _e;
            if (value === undefined || value === null) {
                return undefined;
            }
            if (isRecord(value)) {
                return this.matchAskOption(options, (_e = (_d = (_c = (_b = (_a = value.optionId) !== null && _a !== void 0 ? _a : value.id) !== null && _b !== void 0 ? _b : value.value) !== null && _c !== void 0 ? _c : value.choice) !== null && _d !== void 0 ? _d : value.decision) !== null && _e !== void 0 ? _e : value.selectedOption);
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
            return options.find(function (option) { return option.id.toLocaleLowerCase() === normalized || option.label.toLocaleLowerCase() === normalized; });
        };
        CyberVinciFlowPlaybookRunner_1.prototype.resolveRecord = function (record, context) {
            var _this = this;
            return Object.fromEntries(Object.entries(record).map(function (_a) {
                var key = _a[0], value = _a[1];
                return [key, _this.resolveValue(value, context)];
            }));
        };
        CyberVinciFlowPlaybookRunner_1.prototype.resolveValue = function (value, context) {
            if (typeof value !== 'string') {
                return value;
            }
            var exact = value.match(/^\$\{([^}]+)\}$/);
            if (exact) {
                return this.lookupPath(exact[1].trim(), context);
            }
            return this.renderTemplate(value, context);
        };
        CyberVinciFlowPlaybookRunner_1.prototype.renderTemplate = function (template, context) {
            var _this = this;
            return template.replace(/\$\{([^}]+)\}/g, function (_match, pathExpression) {
                var value = _this.lookupPath(pathExpression.trim(), context);
                return value === undefined || value === null ? '' : String(value);
            });
        };
        CyberVinciFlowPlaybookRunner_1.prototype.lookupPath = function (pathExpression, context) {
            if (pathExpression === 'prompt') {
                return context.prompt;
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
            var parts = pathExpression.split('.').slice(1);
            return parts.reduce(function (current, key) {
                if (!current || typeof current !== 'object') {
                    return undefined;
                }
                return current[key];
            }, source);
        };
        CyberVinciFlowPlaybookRunner_1.prototype.stableValue = function (value) {
            return typeof value === 'string' ? value : JSON.stringify(value);
        };
        CyberVinciFlowPlaybookRunner_1.prototype.fail = function (context, stateId, message) {
            context.diagnostics.push(message);
            context.events.push({
                timestamp: Date.now(),
                type: 'failed',
                stateId: stateId,
                message: message
            });
            return { ok: false, stop: true, message: message };
        };
        CyberVinciFlowPlaybookRunner_1.prototype.issue = function (summary) {
            return {
                severity: 'blocking',
                type: 'playbook',
                summary: summary,
                producer: 'cybervinci-flow-playbook-runner'
            };
        };
        return CyberVinciFlowPlaybookRunner_1;
    }());
    __setFunctionName(_classThis, "CyberVinciFlowPlaybookRunner");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _service_decorators = [(0, inversify_1.inject)(cybervinci_agency_agent_service_1.CyberVinciAgencyAgentService)];
        __esDecorate(null, null, _service_decorators, { kind: "field", name: "service", static: false, private: false, access: { has: function (obj) { return "service" in obj; }, get: function (obj) { return obj.service; }, set: function (obj, value) { obj.service = value; } }, metadata: _metadata }, _service_initializers, _service_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        CyberVinciFlowPlaybookRunner = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return CyberVinciFlowPlaybookRunner = _classThis;
}();
exports.CyberVinciFlowPlaybookRunner = CyberVinciFlowPlaybookRunner;
function isRecord(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
function parseJsonValue(text) {
    if (!text) {
        return undefined;
    }
    try {
        return JSON.parse(text);
    }
    catch (_a) {
        return undefined;
    }
}

"use strict";
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
exports.FlowWidget = void 0;
exports.textToDeliverables = textToDeliverables;
exports.deliverablesToText = deliverablesToText;
var browser_1 = require("@theia/core/lib/browser");
var common_1 = require("@theia/core/lib/common");
var uri_1 = require("@theia/core/lib/common/uri");
var inversify_1 = require("@theia/core/shared/inversify");
var React = require("@theia/core/shared/react");
var browser_2 = require("@theia/workspace/lib/browser");
var flow_artifacts_1 = require("./flow-artifacts");
var common_2 = require("../common");
var FlowWidget = function () {
    var _classDecorators = [(0, inversify_1.injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _classSuper = browser_1.ReactWidget;
    var _instanceExtraInitializers = [];
    var _flowService_decorators;
    var _flowService_initializers = [];
    var _flowService_extraInitializers = [];
    var _flowClient_decorators;
    var _flowClient_initializers = [];
    var _flowClient_extraInitializers = [];
    var _workspaceService_decorators;
    var _workspaceService_initializers = [];
    var _workspaceService_extraInitializers = [];
    var _openerService_decorators;
    var _openerService_initializers = [];
    var _openerService_extraInitializers = [];
    var _init_decorators;
    var FlowWidget = _classThis = /** @class */ (function (_super) {
        __extends(FlowWidget_1, _super);
        function FlowWidget_1() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.flowService = (__runInitializers(_this, _instanceExtraInitializers), __runInitializers(_this, _flowService_initializers, void 0));
            _this.flowClient = (__runInitializers(_this, _flowService_extraInitializers), __runInitializers(_this, _flowClient_initializers, void 0));
            _this.workspaceService = (__runInitializers(_this, _flowClient_extraInitializers), __runInitializers(_this, _workspaceService_initializers, void 0));
            _this.openerService = (__runInitializers(_this, _workspaceService_extraInitializers), __runInitializers(_this, _openerService_initializers, void 0));
            _this.state = (__runInitializers(_this, _openerService_extraInitializers), {
                templates: [],
                workflowPatterns: [],
                modelProfiles: [],
                pipelinePresets: [],
                agents: [],
                agentSearch: '',
                patternParameters: {},
                patternRoleOverrides: {},
                selectedKind: 'state',
                workflowUndoStack: [],
                workflowRedoStack: [],
                workflowSourceVisible: false,
                runHistory: [],
                runHistoryVisible: false,
                prompt: 'Build the next CyberVinci feature with explicit artifacts and a human review gate.',
                busy: false
            });
            _this.streamDisposers = [];
            _this.refresh = function () { return __awaiter(_this, void 0, void 0, function () {
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.withBusy(function () { return __awaiter(_this, void 0, void 0, function () {
                                var workspaceRootUri, _a, snapshot, templates, workflowPatterns, modelProfiles, pipelinePresets, agents, selectedPatternId, selectedPattern;
                                var _b, _c, _d;
                                return __generator(this, function (_e) {
                                    switch (_e.label) {
                                        case 0: return [4 /*yield*/, this.workspaceRootUri()];
                                        case 1:
                                            workspaceRootUri = _e.sent();
                                            return [4 /*yield*/, Promise.all([
                                                    this.flowService.getSnapshot({ workspaceRootUri: workspaceRootUri }),
                                                    this.flowService.listWorkflowTemplates(),
                                                    this.flowService.listWorkflowPatterns(),
                                                    this.flowService.listModelProfiles(),
                                                    this.flowService.listPipelinePresets({ workspaceRootUri: workspaceRootUri }),
                                                    this.flowService.listAgentMarkdownFiles({ workspaceRootUri: workspaceRootUri })
                                                ])];
                                        case 2:
                                            _a = _e.sent(), snapshot = _a[0], templates = _a[1], workflowPatterns = _a[2], modelProfiles = _a[3], pipelinePresets = _a[4], agents = _a[5];
                                            selectedPatternId = this.state.selectedPatternId || ((_b = workflowPatterns[0]) === null || _b === void 0 ? void 0 : _b.id);
                                            selectedPattern = workflowPatterns.find(function (pattern) { return pattern.id === selectedPatternId; });
                                            this.state = __assign(__assign({}, this.state), { snapshot: normalizeFlowSnapshotEvents(snapshot), templates: templates, workflowPatterns: workflowPatterns, modelProfiles: modelProfiles, pipelinePresets: pipelinePresets, agents: agents, selectedTemplateId: this.state.selectedTemplateId || ((_c = templates[0]) === null || _c === void 0 ? void 0 : _c.id), selectedPatternId: selectedPatternId, patternParameters: __assign(__assign({}, initialPatternParameterValues(selectedPattern)), this.state.patternParameters), patternRoleOverrides: this.state.patternRoleOverrides, selectedPipelinePresetId: this.state.selectedPipelinePresetId || ((_d = pipelinePresets[0]) === null || _d === void 0 ? void 0 : _d.id), selectedId: this.state.selectedId || (snapshot.activeWorkflow ? Object.keys(snapshot.activeWorkflow.states)[0] : undefined), workflowUndoStack: [], workflowRedoStack: [], workflowSourceText: undefined, workflowSourceError: undefined, workflowSourceVisible: false, workflowSavePreview: undefined, error: undefined });
                                            return [2 /*return*/];
                                    }
                                });
                            }); })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); };
            _this.handleTopMenuPointerDown = function (event) {
                if (!_this.state.openMenu && !_this.state.runHistoryVisible) {
                    return;
                }
                var target = event.target;
                if (!(target instanceof Element)) {
                    return;
                }
                if (target.closest('.flow__top-menus, .flow__run-history')) {
                    return;
                }
                _this.closeTopMenus();
            };
            _this.handleTopMenuKeyDown = function (event) {
                if (event.key === 'Escape' && (_this.state.openMenu || _this.state.runHistoryVisible)) {
                    _this.closeTopMenus();
                }
            };
            _this.toggleTopMenu = function (openMenu) {
                var nextOpenMenu = _this.state.openMenu === openMenu ? undefined : openMenu;
                _this.state = __assign(__assign({}, _this.state), { openMenu: nextOpenMenu, runHistoryVisible: false });
                _this.update();
            };
            _this.setSelectedPattern = function (selectedPatternId) {
                var pattern = _this.state.workflowPatterns.find(function (candidate) { return candidate.id === selectedPatternId; });
                _this.state = __assign(__assign({}, _this.state), { selectedPatternId: selectedPatternId, patternParameters: initialPatternParameterValues(pattern), patternRoleOverrides: {} });
                _this.update();
            };
            _this.updatePatternParameter = function (parameterId, value) {
                var _a;
                _this.state = __assign(__assign({}, _this.state), { patternParameters: __assign(__assign({}, _this.state.patternParameters), (_a = {}, _a[parameterId] = value, _a)) });
                _this.update();
            };
            _this.updatePatternRoleOverride = function (roleId, override) {
                var next = __assign({}, _this.state.patternRoleOverrides);
                if (!override || isEmptyPatternRoleOverride(override)) {
                    delete next[roleId];
                }
                else {
                    next[roleId] = override;
                }
                _this.state = __assign(__assign({}, _this.state), { patternRoleOverrides: next });
                _this.update();
            };
            _this.setAgentSearch = function (agentSearch) {
                _this.state = __assign(__assign({}, _this.state), { agentSearch: agentSearch });
                _this.update();
            };
            _this.toggleWorkflowSourcePanel = function () {
                _this.state = __assign(__assign({}, _this.state), { workflowSourceVisible: !_this.state.workflowSourceVisible });
                _this.update();
            };
            _this.createAgentMarkdown = function () { return __awaiter(_this, void 0, void 0, function () {
                var relativePath, title;
                var _this = this;
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            relativePath = (_a = window.prompt('New agent Markdown path', 'agents/new-agent.md')) === null || _a === void 0 ? void 0 : _a.trim();
                            if (!relativePath) {
                                return [2 /*return*/];
                            }
                            title = ((_b = window.prompt('Agent title', pathTitle(relativePath))) === null || _b === void 0 ? void 0 : _b.trim()) || pathTitle(relativePath);
                            return [4 /*yield*/, this.withBusy(function () { return __awaiter(_this, void 0, void 0, function () {
                                    var workspaceRootUri, agent, agents;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, this.workspaceRootUri()];
                                            case 1:
                                                workspaceRootUri = _a.sent();
                                                return [4 /*yield*/, this.flowService.createAgentMarkdownFile({ workspaceRootUri: workspaceRootUri, relativePath: relativePath, title: title })];
                                            case 2:
                                                agent = _a.sent();
                                                return [4 /*yield*/, this.flowService.listAgentMarkdownFiles({ workspaceRootUri: workspaceRootUri })];
                                            case 3:
                                                agents = _a.sent();
                                                this.state = __assign(__assign({}, this.state), { agents: agents, agentSearch: relativePath, error: undefined });
                                                return [4 /*yield*/, (0, browser_1.open)(this.openerService, new uri_1.default(agent.uri))];
                                            case 4:
                                                _a.sent();
                                                return [2 /*return*/];
                                        }
                                    });
                                }); })];
                        case 1:
                            _c.sent();
                            return [2 /*return*/];
                    }
                });
            }); };
            _this.duplicateAgentMarkdown = function (sourceRelativePath) { return __awaiter(_this, void 0, void 0, function () {
                var targetRelativePath;
                var _this = this;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            targetRelativePath = (_a = window.prompt('Duplicate agent Markdown path', copyPath(sourceRelativePath))) === null || _a === void 0 ? void 0 : _a.trim();
                            if (!targetRelativePath) {
                                return [2 /*return*/];
                            }
                            return [4 /*yield*/, this.withBusy(function () { return __awaiter(_this, void 0, void 0, function () {
                                    var workspaceRootUri, agent, agents;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, this.workspaceRootUri()];
                                            case 1:
                                                workspaceRootUri = _a.sent();
                                                return [4 /*yield*/, this.flowService.duplicateAgentMarkdownFile({
                                                        workspaceRootUri: workspaceRootUri,
                                                        sourceRelativePath: sourceRelativePath,
                                                        targetRelativePath: targetRelativePath,
                                                        title: pathTitle(targetRelativePath)
                                                    })];
                                            case 2:
                                                agent = _a.sent();
                                                return [4 /*yield*/, this.flowService.listAgentMarkdownFiles({ workspaceRootUri: workspaceRootUri })];
                                            case 3:
                                                agents = _a.sent();
                                                this.state = __assign(__assign({}, this.state), { agents: agents, agentSearch: targetRelativePath, error: undefined });
                                                return [4 /*yield*/, (0, browser_1.open)(this.openerService, new uri_1.default(agent.uri))];
                                            case 4:
                                                _a.sent();
                                                return [2 /*return*/];
                                        }
                                    });
                                }); })];
                        case 1:
                            _b.sent();
                            return [2 /*return*/];
                    }
                });
            }); };
            _this.renameAgentMarkdown = function (sourceRelativePath) { return __awaiter(_this, void 0, void 0, function () {
                var targetRelativePath;
                var _this = this;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            targetRelativePath = (_a = window.prompt('Rename agent Markdown path', sourceRelativePath)) === null || _a === void 0 ? void 0 : _a.trim();
                            if (!targetRelativePath || targetRelativePath === sourceRelativePath) {
                                return [2 /*return*/];
                            }
                            return [4 /*yield*/, this.withBusy(function () { return __awaiter(_this, void 0, void 0, function () {
                                    var workspaceRootUri, agent, agents;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, this.workspaceRootUri()];
                                            case 1:
                                                workspaceRootUri = _a.sent();
                                                return [4 /*yield*/, this.flowService.renameAgentMarkdownFile({ workspaceRootUri: workspaceRootUri, sourceRelativePath: sourceRelativePath, targetRelativePath: targetRelativePath })];
                                            case 2:
                                                agent = _a.sent();
                                                return [4 /*yield*/, this.flowService.listAgentMarkdownFiles({ workspaceRootUri: workspaceRootUri })];
                                            case 3:
                                                agents = _a.sent();
                                                this.state = __assign(__assign({}, this.state), { agents: agents, agentSearch: targetRelativePath, error: undefined });
                                                return [4 /*yield*/, (0, browser_1.open)(this.openerService, new uri_1.default(agent.uri))];
                                            case 4:
                                                _a.sent();
                                                return [2 /*return*/];
                                        }
                                    });
                                }); })];
                        case 1:
                            _b.sent();
                            return [2 /*return*/];
                    }
                });
            }); };
            _this.updateWorkflowSourceDraft = function (workflowSourceText) { return __awaiter(_this, void 0, void 0, function () {
                var snapshot, currentWorkflow, workflow, validation;
                return __generator(this, function (_a) {
                    snapshot = this.state.snapshot;
                    currentWorkflow = snapshot === null || snapshot === void 0 ? void 0 : snapshot.activeWorkflow;
                    if (!snapshot || !currentWorkflow) {
                        return [2 /*return*/];
                    }
                    try {
                        workflow = (0, common_2.parseWorkflowSource)(workflowSourceText, currentWorkflow);
                        validation = (0, common_2.validateFlowWorkflow)(workflow);
                        this.state = __assign(__assign({}, this.state), { workflowSourceText: workflowSourceText, workflowSourceError: undefined, snapshot: __assign(__assign({}, snapshot), { validation: validation }), error: undefined });
                    }
                    catch (error) {
                        this.state = __assign(__assign({}, this.state), { workflowSourceText: workflowSourceText, workflowSourceError: error instanceof Error ? error.message : String(error), error: undefined });
                    }
                    this.update();
                    return [2 /*return*/];
                });
            }); };
            _this.applyWorkflowSourceDraft = function () { return __awaiter(_this, void 0, void 0, function () {
                var snapshot, currentWorkflow, workflowSourceText, activeWorkflow, validation;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            snapshot = this.state.snapshot;
                            currentWorkflow = snapshot === null || snapshot === void 0 ? void 0 : snapshot.activeWorkflow;
                            workflowSourceText = this.state.workflowSourceText;
                            if (!snapshot || !currentWorkflow || !workflowSourceText) {
                                return [2 /*return*/];
                            }
                            try {
                                activeWorkflow = (0, common_2.parseWorkflowSource)(workflowSourceText, currentWorkflow);
                            }
                            catch (error) {
                                this.state = __assign(__assign({}, this.state), { workflowSourceError: error instanceof Error ? error.message : String(error) });
                                this.update();
                                return [2 /*return*/];
                            }
                            validation = (0, common_2.validateFlowWorkflow)(activeWorkflow);
                            if (!validation.valid) {
                                this.state = __assign(__assign({}, this.state), { snapshot: __assign(__assign({}, snapshot), { validation: validation }), workflowSourceError: undefined, error: "Workflow source was not applied because it has ".concat(validation.errors.length, " validation error").concat(validation.errors.length === 1 ? '' : 's', ".") });
                                this.update();
                                return [2 /*return*/];
                            }
                            return [4 /*yield*/, this.setActiveWorkflow(activeWorkflow, this.state.selectedKind, this.state.selectedId, true)];
                        case 1:
                            _a.sent();
                            this.state = __assign(__assign({}, this.state), { workflowSourceText: (0, common_2.formatWorkflowSource)(activeWorkflow), workflowSourceError: undefined });
                            this.update();
                            return [2 /*return*/];
                    }
                });
            }); };
            _this.selectValidationIssue = function (issue) {
                var _a;
                var workflow = (_a = _this.state.snapshot) === null || _a === void 0 ? void 0 : _a.activeWorkflow;
                if (!workflow) {
                    return;
                }
                var target = validationIssueTarget(workflow, issue);
                if (target) {
                    _this.select(target.kind, target.id);
                }
            };
            _this.addWorkflowState = function (stateType) { return __awaiter(_this, void 0, void 0, function () {
                var snapshot, workflow, _a, activeWorkflow, stateId;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            snapshot = this.state.snapshot;
                            workflow = snapshot === null || snapshot === void 0 ? void 0 : snapshot.activeWorkflow;
                            if (!snapshot || !workflow) {
                                return [2 /*return*/, undefined];
                            }
                            _a = (0, common_2.addFlowWorkflowState)(workflow, stateType), activeWorkflow = _a.workflow, stateId = _a.stateId;
                            return [4 /*yield*/, this.replaceActiveWorkflow(activeWorkflow, 'state', stateId)];
                        case 1:
                            _b.sent();
                            return [2 /*return*/, stateId];
                    }
                });
            }); };
            _this.updateWorkflowState = function (stateId, statePatch) { return __awaiter(_this, void 0, void 0, function () {
                var snapshot, workflow, existingState, updatedState;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            snapshot = this.state.snapshot;
                            workflow = snapshot === null || snapshot === void 0 ? void 0 : snapshot.activeWorkflow;
                            existingState = workflow ? (0, common_2.findFlowWorkflowState)(workflow, stateId) : undefined;
                            if (!snapshot || !workflow || !existingState) {
                                return [2 /*return*/];
                            }
                            updatedState = (0, common_2.compactFlowState)(__assign(__assign({}, existingState.state), statePatch));
                            return [4 /*yield*/, this.replaceActiveWorkflow((0, common_2.replaceFlowWorkflowState)(workflow, stateId, updatedState), 'state', stateId)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); };
            _this.moveWorkflowState = function (stateId, position) { return __awaiter(_this, void 0, void 0, function () {
                var snapshot, workflow, existingState, updatedState;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            snapshot = this.state.snapshot;
                            workflow = snapshot === null || snapshot === void 0 ? void 0 : snapshot.activeWorkflow;
                            existingState = workflow ? (0, common_2.findFlowWorkflowState)(workflow, stateId) : undefined;
                            if (!snapshot || !workflow || !existingState) {
                                return [2 /*return*/];
                            }
                            updatedState = (0, common_2.compactFlowState)(__assign(__assign({}, existingState.state), { layout: __assign(__assign({}, (existingState.state.layout || {})), { x: Math.round(Math.max(0, position.x)), y: Math.round(Math.max(0, position.y)) }) }));
                            return [4 /*yield*/, this.replaceActiveWorkflow((0, common_2.replaceFlowWorkflowState)(workflow, stateId, updatedState), 'state', stateId)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); };
            _this.addParallelBranch = function (parallelStateId, branchType) { return __awaiter(_this, void 0, void 0, function () {
                var snapshot, workflow, parallelState, _a, activeWorkflow, branchId;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            snapshot = this.state.snapshot;
                            workflow = snapshot === null || snapshot === void 0 ? void 0 : snapshot.activeWorkflow;
                            parallelState = workflow ? (0, common_2.findFlowWorkflowState)(workflow, parallelStateId) : undefined;
                            if (!snapshot || !workflow || !parallelState || parallelState.state.type !== 'parallel') {
                                return [2 /*return*/, undefined];
                            }
                            _a = (0, common_2.addFlowParallelBranch)(workflow, parallelStateId, branchType), activeWorkflow = _a.workflow, branchId = _a.branchId;
                            if (!branchId) {
                                return [2 /*return*/, undefined];
                            }
                            return [4 /*yield*/, this.replaceActiveWorkflow(activeWorkflow, 'state', branchId)];
                        case 1:
                            _b.sent();
                            return [2 /*return*/, branchId];
                    }
                });
            }); };
            _this.deleteWorkflowState = function (stateId) { return __awaiter(_this, void 0, void 0, function () {
                var snapshot, workflow, existingState, references, activeWorkflow, nextStateId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            snapshot = this.state.snapshot;
                            workflow = snapshot === null || snapshot === void 0 ? void 0 : snapshot.activeWorkflow;
                            existingState = workflow ? (0, common_2.findFlowWorkflowState)(workflow, stateId) : undefined;
                            if (!snapshot || !workflow || !existingState) {
                                return [2 /*return*/];
                            }
                            references = (0, common_2.flowWorkflowStateReferences)(workflow, stateId);
                            if (references.length > 0) {
                                this.state = __assign(__assign({}, this.state), { error: "Cannot delete state \"".concat(stateId, "\" because it is still referenced by ").concat(references.join(', '), ". Remove those references first.") });
                                this.update();
                                return [2 /*return*/];
                            }
                            activeWorkflow = (0, common_2.removeFlowWorkflowState)(workflow, stateId);
                            nextStateId = (0, common_2.flowWorkflowStateIds)(activeWorkflow)[0];
                            return [4 /*yield*/, this.replaceActiveWorkflow(activeWorkflow, nextStateId ? 'state' : 'transition', nextStateId)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); };
            _this.addWorkflowTransition = function (from, to) { return __awaiter(_this, void 0, void 0, function () {
                var snapshot, workflow, _a, activeWorkflow, transition;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            snapshot = this.state.snapshot;
                            workflow = snapshot === null || snapshot === void 0 ? void 0 : snapshot.activeWorkflow;
                            if (!snapshot || !workflow) {
                                return [2 /*return*/, undefined];
                            }
                            _a = (0, common_2.addFlowWorkflowTransition)(workflow, from, to), activeWorkflow = _a.workflow, transition = _a.transition;
                            if (!transition) {
                                return [2 /*return*/, undefined];
                            }
                            return [4 /*yield*/, this.replaceActiveWorkflow(activeWorkflow, 'transition', transition.id)];
                        case 1:
                            _b.sent();
                            return [2 /*return*/, transition.id];
                    }
                });
            }); };
            _this.updateWorkflowTransition = function (transitionId, transitionPatch) { return __awaiter(_this, void 0, void 0, function () {
                var snapshot, workflow, transitionIndex, updatedTransition, transitions, activeWorkflow;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            snapshot = this.state.snapshot;
                            workflow = snapshot === null || snapshot === void 0 ? void 0 : snapshot.activeWorkflow;
                            transitionIndex = (_a = workflow === null || workflow === void 0 ? void 0 : workflow.transitions.findIndex(function (transition) { return transitionKey(transition) === transitionId; })) !== null && _a !== void 0 ? _a : -1;
                            if (!snapshot || !workflow || transitionIndex < 0) {
                                return [2 /*return*/];
                            }
                            updatedTransition = compactTransition(__assign(__assign({}, workflow.transitions[transitionIndex]), transitionPatch));
                            transitions = workflow.transitions.slice();
                            transitions[transitionIndex] = updatedTransition;
                            activeWorkflow = __assign(__assign({}, workflow), { transitions: transitions });
                            return [4 /*yield*/, this.replaceActiveWorkflow(activeWorkflow, 'transition', transitionKey(updatedTransition))];
                        case 1:
                            _b.sent();
                            return [2 /*return*/];
                    }
                });
            }); };
            _this.deleteWorkflowTransition = function (transitionId) { return __awaiter(_this, void 0, void 0, function () {
                var snapshot, workflow, transitions, activeWorkflow;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            snapshot = this.state.snapshot;
                            workflow = snapshot === null || snapshot === void 0 ? void 0 : snapshot.activeWorkflow;
                            if (!snapshot || !workflow) {
                                return [2 /*return*/];
                            }
                            transitions = (workflow.transitions || []).filter(function (transition) { return transitionKey(transition) !== transitionId; });
                            if (transitions.length === (workflow.transitions || []).length) {
                                return [2 /*return*/];
                            }
                            activeWorkflow = __assign(__assign({}, workflow), { transitions: transitions });
                            return [4 /*yield*/, this.replaceActiveWorkflow(activeWorkflow, 'state', (0, common_2.flowWorkflowStateIds)(activeWorkflow)[0])];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); };
            _this.undoWorkflowEdit = function () { return __awaiter(_this, void 0, void 0, function () {
                var snapshot, currentWorkflow, previous;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            snapshot = this.state.snapshot;
                            currentWorkflow = snapshot === null || snapshot === void 0 ? void 0 : snapshot.activeWorkflow;
                            previous = this.state.workflowUndoStack[this.state.workflowUndoStack.length - 1];
                            if (!snapshot || !currentWorkflow || !previous || ((_a = currentWorkflow.file) === null || _a === void 0 ? void 0 : _a.editable) === false) {
                                return [2 /*return*/];
                            }
                            this.state = __assign(__assign({}, this.state), { workflowUndoStack: this.state.workflowUndoStack.slice(0, -1), workflowRedoStack: pushWorkflowHistory(this.state.workflowRedoStack, {
                                    workflow: currentWorkflow,
                                    selectedKind: this.state.selectedKind,
                                    selectedId: this.state.selectedId
                                }) });
                            return [4 /*yield*/, this.setActiveWorkflow(previous.workflow, previous.selectedKind, previous.selectedId, false)];
                        case 1:
                            _b.sent();
                            return [2 /*return*/];
                    }
                });
            }); };
            _this.redoWorkflowEdit = function () { return __awaiter(_this, void 0, void 0, function () {
                var snapshot, currentWorkflow, next;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            snapshot = this.state.snapshot;
                            currentWorkflow = snapshot === null || snapshot === void 0 ? void 0 : snapshot.activeWorkflow;
                            next = this.state.workflowRedoStack[this.state.workflowRedoStack.length - 1];
                            if (!snapshot || !currentWorkflow || !next || ((_a = currentWorkflow.file) === null || _a === void 0 ? void 0 : _a.editable) === false) {
                                return [2 /*return*/];
                            }
                            this.state = __assign(__assign({}, this.state), { workflowUndoStack: pushWorkflowHistory(this.state.workflowUndoStack, {
                                    workflow: currentWorkflow,
                                    selectedKind: this.state.selectedKind,
                                    selectedId: this.state.selectedId
                                }), workflowRedoStack: this.state.workflowRedoStack.slice(0, -1) });
                            return [4 /*yield*/, this.setActiveWorkflow(next.workflow, next.selectedKind, next.selectedId, false)];
                        case 1:
                            _b.sent();
                            return [2 /*return*/];
                    }
                });
            }); };
            _this.startRun = function () { return __awaiter(_this, void 0, void 0, function () {
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.withBusy(function () { return __awaiter(_this, void 0, void 0, function () {
                                var snapshot, workflow, activeRun, _a, _b;
                                var _c;
                                var _d;
                                return __generator(this, function (_e) {
                                    switch (_e.label) {
                                        case 0:
                                            snapshot = this.state.snapshot;
                                            workflow = (_d = this.state.snapshot) === null || _d === void 0 ? void 0 : _d.activeWorkflow;
                                            if (!workflow || !snapshot) {
                                                return [2 /*return*/];
                                            }
                                            _b = (_a = this.flowService).startRun;
                                            _c = {};
                                            return [4 /*yield*/, this.workspaceRootUri()];
                                        case 1: return [4 /*yield*/, _b.apply(_a, [(_c.workspaceRootUri = _e.sent(),
                                                    _c.workflowId = workflow.id,
                                                    _c.prompt = this.state.prompt,
                                                    _c)])];
                                        case 2:
                                            activeRun = _e.sent();
                                            this.state = __assign(__assign({}, this.state), { snapshot: __assign(__assign({}, snapshot), { activeRun: activeRun }), executionModeHint: activeRun.executionMode, executionModeHintMessage: activeRun.executionModeMessage, selectedKind: 'state', selectedId: activeRun.currentStateIds[0] || this.state.selectedId, error: undefined });
                                            return [4 /*yield*/, this.subscribeActiveRunStream(activeRun.id)];
                                        case 3:
                                            _e.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); }, function (error) { return classifyExecutionModeFromError(error); })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); };
            _this.chooseWorkflow = function (workflowId) { return __awaiter(_this, void 0, void 0, function () {
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!workflowId) {
                                return [2 /*return*/];
                            }
                            return [4 /*yield*/, this.withBusy(function () { return __awaiter(_this, void 0, void 0, function () {
                                    var workspaceRootUri, activeWorkflow, workflows, validation, previousSnapshot, capabilities, _a, activeRun;
                                    var _b;
                                    return __generator(this, function (_c) {
                                        switch (_c.label) {
                                            case 0: return [4 /*yield*/, this.workspaceRootUri()];
                                            case 1:
                                                workspaceRootUri = _c.sent();
                                                return [4 /*yield*/, this.flowService.getWorkflow({ workspaceRootUri: workspaceRootUri, workflowId: workflowId })];
                                            case 2:
                                                activeWorkflow = _c.sent();
                                                return [4 /*yield*/, this.flowService.listWorkflows({ workspaceRootUri: workspaceRootUri })];
                                            case 3:
                                                workflows = _c.sent();
                                                return [4 /*yield*/, this.flowService.validateWorkflow(activeWorkflow)];
                                            case 4:
                                                validation = _c.sent();
                                                previousSnapshot = this.state.snapshot;
                                                _a = (previousSnapshot === null || previousSnapshot === void 0 ? void 0 : previousSnapshot.capabilities);
                                                if (_a) return [3 /*break*/, 6];
                                                return [4 /*yield*/, this.flowService.getCapabilities()];
                                            case 5:
                                                _a = (_c.sent());
                                                _c.label = 6;
                                            case 6:
                                                capabilities = _a;
                                                activeRun = ((_b = previousSnapshot === null || previousSnapshot === void 0 ? void 0 : previousSnapshot.activeRun) === null || _b === void 0 ? void 0 : _b.workflowId) === workflowId ? previousSnapshot.activeRun : undefined;
                                                this.state = __assign(__assign({}, this.state), { snapshot: {
                                                        workflows: workflows,
                                                        activeWorkflow: activeWorkflow,
                                                        activeRun: activeRun,
                                                        capabilities: capabilities,
                                                        validation: validation
                                                    }, selectedKind: 'state', selectedId: Object.keys(activeWorkflow.states)[0], workflowUndoStack: [], workflowRedoStack: [], workflowSourceText: undefined, workflowSourceError: undefined, workflowSavePreview: undefined, error: undefined });
                                                return [2 /*return*/];
                                        }
                                    });
                                }); })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); };
            _this.createWorkflowFromTemplate = function () { return __awaiter(_this, void 0, void 0, function () {
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.withBusy(function () { return __awaiter(_this, void 0, void 0, function () {
                                var templateId, workspaceRootUri, activeWorkflow, workflows, validation, previousSnapshot, capabilities, _a;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0:
                                            templateId = this.state.selectedTemplateId;
                                            if (!templateId) {
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, this.workspaceRootUri()];
                                        case 1:
                                            workspaceRootUri = _b.sent();
                                            return [4 /*yield*/, this.flowService.createWorkflowFromTemplate({
                                                    workspaceRootUri: workspaceRootUri,
                                                    templateId: templateId
                                                })];
                                        case 2:
                                            activeWorkflow = _b.sent();
                                            return [4 /*yield*/, this.flowService.listWorkflows({ workspaceRootUri: workspaceRootUri })];
                                        case 3:
                                            workflows = _b.sent();
                                            return [4 /*yield*/, this.flowService.validateWorkflow(activeWorkflow)];
                                        case 4:
                                            validation = _b.sent();
                                            previousSnapshot = this.state.snapshot;
                                            _a = (previousSnapshot === null || previousSnapshot === void 0 ? void 0 : previousSnapshot.capabilities);
                                            if (_a) return [3 /*break*/, 6];
                                            return [4 /*yield*/, this.flowService.getCapabilities()];
                                        case 5:
                                            _a = (_b.sent());
                                            _b.label = 6;
                                        case 6:
                                            capabilities = _a;
                                            this.state = __assign(__assign({}, this.state), { snapshot: {
                                                    workflows: workflows,
                                                    activeWorkflow: activeWorkflow,
                                                    activeRun: previousSnapshot === null || previousSnapshot === void 0 ? void 0 : previousSnapshot.activeRun,
                                                    capabilities: capabilities,
                                                    validation: validation
                                                }, selectedKind: 'state', selectedId: Object.keys(activeWorkflow.states)[0], workflowUndoStack: [], workflowRedoStack: [], workflowSourceText: undefined, workflowSourceError: undefined, workflowSavePreview: undefined, error: undefined });
                                            return [2 /*return*/];
                                    }
                                });
                            }); })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); };
            _this.reloadWorkflowFile = function () { return __awaiter(_this, void 0, void 0, function () {
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.withBusy(function () { return __awaiter(_this, void 0, void 0, function () {
                                var snapshot, workflow, activeWorkflow, _a, _b, _c, _d, _e;
                                var _f, _g, _h;
                                var _j;
                                return __generator(this, function (_k) {
                                    switch (_k.label) {
                                        case 0:
                                            snapshot = this.state.snapshot;
                                            workflow = snapshot === null || snapshot === void 0 ? void 0 : snapshot.activeWorkflow;
                                            if (!workflow || !snapshot) {
                                                return [2 /*return*/];
                                            }
                                            _b = (_a = this.flowService).reloadWorkflow;
                                            _f = {};
                                            return [4 /*yield*/, this.workspaceRootUri()];
                                        case 1: return [4 /*yield*/, _b.apply(_a, [(_f.workspaceRootUri = _k.sent(),
                                                    _f.workflowId = workflow.id,
                                                    _f)])];
                                        case 2:
                                            activeWorkflow = _k.sent();
                                            _c = this;
                                            _d = [__assign({}, this.state)];
                                            _g = {};
                                            _e = [__assign({}, snapshot)];
                                            _h = { workflows: snapshot.workflows.map(function (candidate) { return candidate.id === activeWorkflow.id ? activeWorkflow : candidate; }), activeWorkflow: activeWorkflow };
                                            return [4 /*yield*/, this.flowService.validateWorkflow(activeWorkflow)];
                                        case 3:
                                            _c.state = __assign.apply(void 0, _d.concat([(_g.snapshot = __assign.apply(void 0, _e.concat([(_h.validation = _k.sent(), _h)])), _g.selectedId = this.state.selectedId || Object.keys(activeWorkflow.states)[0], _g.workflowUndoStack = [], _g.workflowRedoStack = [], _g.workflowSourceText = undefined, _g.workflowSourceError = undefined, _g.workflowSavePreview = undefined, _g.error = undefined, _g)]));
                                            return [4 /*yield*/, this.subscribeActiveRunStream((_j = snapshot.activeRun) === null || _j === void 0 ? void 0 : _j.id)];
                                        case 4:
                                            _k.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); };
            _this.createWorkflowFromPreset = function () { return __awaiter(_this, void 0, void 0, function () {
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.withBusy(function () { return __awaiter(_this, void 0, void 0, function () {
                                var presetId, workspaceRootUri, activeWorkflow, workflows, validation, previousSnapshot, capabilities, _a;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0:
                                            presetId = this.state.selectedPipelinePresetId;
                                            if (!presetId) {
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, this.workspaceRootUri()];
                                        case 1:
                                            workspaceRootUri = _b.sent();
                                            return [4 /*yield*/, this.flowService.createWorkflowFromPreset({
                                                    workspaceRootUri: workspaceRootUri,
                                                    presetId: presetId
                                                })];
                                        case 2:
                                            activeWorkflow = _b.sent();
                                            return [4 /*yield*/, this.flowService.listWorkflows({ workspaceRootUri: workspaceRootUri })];
                                        case 3:
                                            workflows = _b.sent();
                                            return [4 /*yield*/, this.flowService.validateWorkflow(activeWorkflow)];
                                        case 4:
                                            validation = _b.sent();
                                            previousSnapshot = this.state.snapshot;
                                            _a = (previousSnapshot === null || previousSnapshot === void 0 ? void 0 : previousSnapshot.capabilities);
                                            if (_a) return [3 /*break*/, 6];
                                            return [4 /*yield*/, this.flowService.getCapabilities()];
                                        case 5:
                                            _a = (_b.sent());
                                            _b.label = 6;
                                        case 6:
                                            capabilities = _a;
                                            this.state = __assign(__assign({}, this.state), { snapshot: {
                                                    workflows: workflows,
                                                    activeWorkflow: activeWorkflow,
                                                    activeRun: previousSnapshot === null || previousSnapshot === void 0 ? void 0 : previousSnapshot.activeRun,
                                                    capabilities: capabilities,
                                                    validation: validation
                                                }, selectedKind: 'state', selectedId: Object.keys(activeWorkflow.states)[0], workflowUndoStack: [], workflowRedoStack: [], workflowSourceText: undefined, workflowSourceError: undefined, workflowSavePreview: undefined, error: undefined });
                                            return [2 /*return*/];
                                    }
                                });
                            }); })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); };
            _this.createWorkflowFromPattern = function () { return __awaiter(_this, void 0, void 0, function () {
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.withBusy(function () { return __awaiter(_this, void 0, void 0, function () {
                                var patternId, workspaceRootUri, activeWorkflow, workflows, validation, previousSnapshot, capabilities, _a;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0:
                                            patternId = this.state.selectedPatternId;
                                            if (!patternId) {
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, this.workspaceRootUri()];
                                        case 1:
                                            workspaceRootUri = _b.sent();
                                            return [4 /*yield*/, this.flowService.createWorkflowFromPattern({
                                                    workspaceRootUri: workspaceRootUri,
                                                    patternId: patternId,
                                                    parameters: this.state.patternParameters,
                                                    roleOverrides: patternRoleOverridesOrUndefined(this.state.patternRoleOverrides)
                                                })];
                                        case 2:
                                            activeWorkflow = _b.sent();
                                            return [4 /*yield*/, this.flowService.listWorkflows({ workspaceRootUri: workspaceRootUri })];
                                        case 3:
                                            workflows = _b.sent();
                                            return [4 /*yield*/, this.flowService.validateWorkflow(activeWorkflow)];
                                        case 4:
                                            validation = _b.sent();
                                            previousSnapshot = this.state.snapshot;
                                            _a = (previousSnapshot === null || previousSnapshot === void 0 ? void 0 : previousSnapshot.capabilities);
                                            if (_a) return [3 /*break*/, 6];
                                            return [4 /*yield*/, this.flowService.getCapabilities()];
                                        case 5:
                                            _a = (_b.sent());
                                            _b.label = 6;
                                        case 6:
                                            capabilities = _a;
                                            this.state = __assign(__assign({}, this.state), { snapshot: {
                                                    workflows: workflows,
                                                    activeWorkflow: activeWorkflow,
                                                    activeRun: previousSnapshot === null || previousSnapshot === void 0 ? void 0 : previousSnapshot.activeRun,
                                                    capabilities: capabilities,
                                                    validation: validation
                                                }, selectedKind: 'state', selectedId: Object.keys(activeWorkflow.states)[0], workflowUndoStack: [], workflowRedoStack: [], workflowSourceText: undefined, workflowSourceError: undefined, workflowSavePreview: undefined, error: undefined });
                                            return [2 /*return*/];
                                    }
                                });
                            }); })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); };
            _this.runWorkflowPattern = function () { return __awaiter(_this, void 0, void 0, function () {
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.withBusy(function () { return __awaiter(_this, void 0, void 0, function () {
                                var patternId, workspaceRootUri, activeRun, activeWorkflow, workflows, validation, previousSnapshot, capabilities, _a;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0:
                                            patternId = this.state.selectedPatternId;
                                            if (!patternId) {
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, this.workspaceRootUri()];
                                        case 1:
                                            workspaceRootUri = _b.sent();
                                            return [4 /*yield*/, this.flowService.runWorkflowPattern({
                                                    workspaceRootUri: workspaceRootUri,
                                                    patternId: patternId,
                                                    parameters: this.state.patternParameters,
                                                    roleOverrides: patternRoleOverridesOrUndefined(this.state.patternRoleOverrides),
                                                    prompt: this.state.prompt
                                                })];
                                        case 2:
                                            activeRun = _b.sent();
                                            return [4 /*yield*/, this.flowService.getWorkflow({ workspaceRootUri: workspaceRootUri, workflowId: activeRun.workflowId })];
                                        case 3:
                                            activeWorkflow = _b.sent();
                                            return [4 /*yield*/, this.flowService.listWorkflows({ workspaceRootUri: workspaceRootUri })];
                                        case 4:
                                            workflows = _b.sent();
                                            return [4 /*yield*/, this.flowService.validateWorkflow(activeWorkflow)];
                                        case 5:
                                            validation = _b.sent();
                                            previousSnapshot = this.state.snapshot;
                                            _a = (previousSnapshot === null || previousSnapshot === void 0 ? void 0 : previousSnapshot.capabilities);
                                            if (_a) return [3 /*break*/, 7];
                                            return [4 /*yield*/, this.flowService.getCapabilities()];
                                        case 6:
                                            _a = (_b.sent());
                                            _b.label = 7;
                                        case 7:
                                            capabilities = _a;
                                            this.state = __assign(__assign({}, this.state), { snapshot: {
                                                    workflows: workflows,
                                                    activeWorkflow: activeWorkflow,
                                                    activeRun: activeRun,
                                                    capabilities: capabilities,
                                                    validation: validation
                                                }, executionModeHint: activeRun.executionMode, executionModeHintMessage: activeRun.executionModeMessage, selectedKind: 'state', selectedId: activeRun.currentStateIds[0] || Object.keys(activeWorkflow.states)[0], workflowUndoStack: [], workflowRedoStack: [], workflowSourceText: undefined, workflowSourceError: undefined, workflowSavePreview: undefined, error: undefined });
                                            return [4 /*yield*/, this.subscribeActiveRunStream(activeRun.id)];
                                        case 8:
                                            _b.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); }, function (error) { return classifyExecutionModeFromError(error); })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); };
            _this.runDynamicWorkflowFromPrompt = function () { return __awaiter(_this, void 0, void 0, function () {
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.withBusy(function () { return __awaiter(_this, void 0, void 0, function () {
                                var workspaceRootUri, activeRun, activeWorkflow, workflows, validation, previousSnapshot, capabilities, _a;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0: return [4 /*yield*/, this.workspaceRootUri()];
                                        case 1:
                                            workspaceRootUri = _b.sent();
                                            return [4 /*yield*/, this.flowService.runDynamicWorkflow({
                                                    workspaceRootUri: workspaceRootUri,
                                                    prompt: this.state.prompt,
                                                    preferSaved: true
                                                })];
                                        case 2:
                                            activeRun = _b.sent();
                                            return [4 /*yield*/, this.flowService.getWorkflow({ workspaceRootUri: workspaceRootUri, workflowId: activeRun.workflowId })];
                                        case 3:
                                            activeWorkflow = _b.sent();
                                            return [4 /*yield*/, this.flowService.listWorkflows({ workspaceRootUri: workspaceRootUri })];
                                        case 4:
                                            workflows = _b.sent();
                                            return [4 /*yield*/, this.flowService.validateWorkflow(activeWorkflow)];
                                        case 5:
                                            validation = _b.sent();
                                            previousSnapshot = this.state.snapshot;
                                            _a = (previousSnapshot === null || previousSnapshot === void 0 ? void 0 : previousSnapshot.capabilities);
                                            if (_a) return [3 /*break*/, 7];
                                            return [4 /*yield*/, this.flowService.getCapabilities()];
                                        case 6:
                                            _a = (_b.sent());
                                            _b.label = 7;
                                        case 7:
                                            capabilities = _a;
                                            this.state = __assign(__assign({}, this.state), { snapshot: {
                                                    workflows: workflows,
                                                    activeWorkflow: activeWorkflow,
                                                    activeRun: activeRun,
                                                    capabilities: capabilities,
                                                    validation: validation
                                                }, executionModeHint: activeRun.executionMode, executionModeHintMessage: activeRun.executionModeMessage, selectedKind: 'state', selectedId: activeRun.currentStateIds[0] || Object.keys(activeWorkflow.states)[0], workflowUndoStack: [], workflowRedoStack: [], workflowSourceText: undefined, workflowSourceError: undefined, workflowSavePreview: undefined, error: undefined });
                                            return [4 /*yield*/, this.subscribeActiveRunStream(activeRun.id)];
                                        case 8:
                                            _b.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); }, function (error) { return classifyExecutionModeFromError(error); })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); };
            _this.saveCurrentWorkflowAsPreset = function () { return __awaiter(_this, void 0, void 0, function () {
                var workflow, defaultId, id, name, description;
                var _this = this;
                var _a, _b, _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            workflow = (_a = this.state.snapshot) === null || _a === void 0 ? void 0 : _a.activeWorkflow;
                            if (!workflow) {
                                return [2 /*return*/];
                            }
                            defaultId = "".concat(workflow.id, "-preset");
                            id = (_b = window.prompt('Pipeline preset id', defaultId)) === null || _b === void 0 ? void 0 : _b.trim();
                            if (!id) {
                                return [2 /*return*/];
                            }
                            name = ((_c = window.prompt('Pipeline preset name', workflow.name)) === null || _c === void 0 ? void 0 : _c.trim()) || workflow.name;
                            description = ((_d = window.prompt('Pipeline preset description', workflow.description || '')) === null || _d === void 0 ? void 0 : _d.trim()) || workflow.description || '';
                            return [4 /*yield*/, this.withBusy(function () { return __awaiter(_this, void 0, void 0, function () {
                                    var workspaceRootUri, pipelinePresets;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, this.workspaceRootUri()];
                                            case 1:
                                                workspaceRootUri = _a.sent();
                                                return [4 /*yield*/, this.flowService.savePipelinePreset({
                                                        workspaceRootUri: workspaceRootUri,
                                                        id: id,
                                                        name: name,
                                                        description: description,
                                                        workflow: workflow,
                                                        overwrite: true
                                                    })];
                                            case 2:
                                                _a.sent();
                                                return [4 /*yield*/, this.flowService.listPipelinePresets({ workspaceRootUri: workspaceRootUri })];
                                            case 3:
                                                pipelinePresets = _a.sent();
                                                this.state = __assign(__assign({}, this.state), { pipelinePresets: pipelinePresets, selectedPipelinePresetId: id, error: undefined });
                                                return [2 /*return*/];
                                        }
                                    });
                                }); })];
                        case 1:
                            _e.sent();
                            return [2 /*return*/];
                    }
                });
            }); };
            _this.openAgentMarkdown = function (agentIdOrPath) { return __awaiter(_this, void 0, void 0, function () {
                var workflow, relativePath;
                var _this = this;
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            workflow = (_a = this.state.snapshot) === null || _a === void 0 ? void 0 : _a.activeWorkflow;
                            if (!workflow || !agentIdOrPath) {
                                return [2 /*return*/];
                            }
                            relativePath = ((_b = workflow.agents) === null || _b === void 0 ? void 0 : _b[agentIdOrPath]) || agentIdOrPath;
                            return [4 /*yield*/, this.withBusy(function () { return __awaiter(_this, void 0, void 0, function () {
                                    var agent, _a, _b;
                                    var _c;
                                    return __generator(this, function (_d) {
                                        switch (_d.label) {
                                            case 0:
                                                _b = (_a = this.flowService).getAgentMarkdownFile;
                                                _c = {};
                                                return [4 /*yield*/, this.workspaceRootUri()];
                                            case 1: return [4 /*yield*/, _b.apply(_a, [(_c.workspaceRootUri = _d.sent(),
                                                        _c.relativePath = relativePath,
                                                        _c.title = agentIdOrPath,
                                                        _c.createIfMissing = true,
                                                        _c)])];
                                            case 2:
                                                agent = _d.sent();
                                                return [4 /*yield*/, (0, browser_1.open)(this.openerService, new uri_1.default(agent.uri))];
                                            case 3:
                                                _d.sent();
                                                return [2 /*return*/];
                                        }
                                    });
                                }); })];
                        case 1:
                            _c.sent();
                            return [2 /*return*/];
                    }
                });
            }); };
            _this.openArtifact = function (artifactUri) { return __awaiter(_this, void 0, void 0, function () {
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!artifactUri) {
                                return [2 /*return*/];
                            }
                            return [4 /*yield*/, this.withBusy(function () { return __awaiter(_this, void 0, void 0, function () {
                                    var workspaceRootUri, uri;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, this.workspaceRootUri()];
                                            case 1:
                                                workspaceRootUri = _a.sent();
                                                uri = (0, flow_artifacts_1.artifactUriToOpenUri)(artifactUri, workspaceRootUri);
                                                return [4 /*yield*/, (0, browser_1.open)(this.openerService, uri)];
                                            case 2:
                                                _a.sent();
                                                return [2 /*return*/];
                                        }
                                    });
                                }); })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); };
            _this.selectArtifact = function (artifactId) {
                _this.state = __assign(__assign({}, _this.state), { selectedArtifactId: artifactId });
                _this.update();
            };
            _this.toggleRunHistory = function () { return __awaiter(_this, void 0, void 0, function () {
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (this.state.runHistoryVisible) {
                                this.state = __assign(__assign({}, this.state), { openMenu: undefined, runHistoryVisible: false });
                                this.update();
                                return [2 /*return*/];
                            }
                            if (this.state.openMenu) {
                                this.state = __assign(__assign({}, this.state), { openMenu: undefined, runHistoryVisible: false });
                                this.update();
                            }
                            return [4 /*yield*/, this.withBusy(function () { return __awaiter(_this, void 0, void 0, function () {
                                    var workspaceRootUri, runHistory;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, this.workspaceRootUri()];
                                            case 1:
                                                workspaceRootUri = _a.sent();
                                                return [4 /*yield*/, this.flowService.listRuns({ workspaceRootUri: workspaceRootUri })];
                                            case 2:
                                                runHistory = _a.sent();
                                                this.state = __assign(__assign({}, this.state), { runHistory: runHistory.map(normalizeFlowRunEvents), openMenu: 'history', runHistoryVisible: true, error: undefined });
                                                return [2 /*return*/];
                                        }
                                    });
                                }); })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); };
            _this.openRunFromHistory = function (runId) { return __awaiter(_this, void 0, void 0, function () {
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.withBusy(function () { return __awaiter(_this, void 0, void 0, function () {
                                var workspaceRootUri, activeRun, _a, snapshot;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0: return [4 /*yield*/, this.workspaceRootUri()];
                                        case 1:
                                            workspaceRootUri = _b.sent();
                                            _a = normalizeFlowRunEvents;
                                            return [4 /*yield*/, this.flowService.getRun({ workspaceRootUri: workspaceRootUri, runId: runId })];
                                        case 2:
                                            activeRun = _a.apply(void 0, [_b.sent()]);
                                            snapshot = this.state.snapshot;
                                            if (!snapshot) {
                                                return [2 /*return*/];
                                            }
                                            this.state = __assign(__assign({}, this.state), { snapshot: __assign(__assign({}, snapshot), { activeRun: activeRun }), selectedKind: activeRun.currentStateIds[0] ? 'state' : this.state.selectedKind, selectedId: activeRun.currentStateIds[0] || this.state.selectedId, selectedArtifactId: resolveSelectedArtifactId(activeRun, this.state.selectedArtifactId), openMenu: undefined, runHistoryVisible: false, error: undefined });
                                            return [2 /*return*/];
                                    }
                                });
                            }); })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); };
            _this.saveWorkflowFile = function () { return __awaiter(_this, void 0, void 0, function () {
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.withBusy(function () { return __awaiter(_this, void 0, void 0, function () {
                                var snapshot, workflow, localValidation, workspaceRootUri, fileWorkflow, diff;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            snapshot = this.state.snapshot;
                                            workflow = snapshot === null || snapshot === void 0 ? void 0 : snapshot.activeWorkflow;
                                            if (!workflow || !snapshot) {
                                                return [2 /*return*/];
                                            }
                                            localValidation = (0, common_2.validateFlowWorkflow)(workflow);
                                            if (!localValidation.valid) {
                                                this.state = __assign(__assign({}, this.state), { snapshot: __assign(__assign({}, snapshot), { validation: localValidation }), error: "Workflow was not saved because it has ".concat(localValidation.errors.length, " validation error").concat(localValidation.errors.length === 1 ? '' : 's', ".") });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, this.workspaceRootUri()];
                                        case 1:
                                            workspaceRootUri = _a.sent();
                                            return [4 /*yield*/, this.flowService.reloadWorkflow({ workspaceRootUri: workspaceRootUri, workflowId: workflow.id })];
                                        case 2:
                                            fileWorkflow = _a.sent();
                                            diff = (0, common_2.compareFlowWorkflowStructure)(fileWorkflow, workflow);
                                            if (diff.items.length > 0) {
                                                this.state = __assign(__assign({}, this.state), { snapshot: __assign(__assign({}, snapshot), { validation: localValidation }), workflowSavePreview: diff, error: undefined });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, this.writeWorkflowFile(workflow, snapshot, localValidation)];
                                        case 3:
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); };
            _this.confirmSaveWorkflowFile = function () { return __awaiter(_this, void 0, void 0, function () {
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.withBusy(function () { return __awaiter(_this, void 0, void 0, function () {
                                var snapshot, workflow, localValidation;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            snapshot = this.state.snapshot;
                                            workflow = snapshot === null || snapshot === void 0 ? void 0 : snapshot.activeWorkflow;
                                            if (!workflow || !snapshot) {
                                                return [2 /*return*/];
                                            }
                                            localValidation = (0, common_2.validateFlowWorkflow)(workflow);
                                            if (!localValidation.valid) {
                                                this.state = __assign(__assign({}, this.state), { snapshot: __assign(__assign({}, snapshot), { validation: localValidation }), workflowSavePreview: undefined, error: "Workflow was not saved because it has ".concat(localValidation.errors.length, " validation error").concat(localValidation.errors.length === 1 ? '' : 's', ".") });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, this.writeWorkflowFile(workflow, snapshot, localValidation)];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); };
            _this.cancelSaveWorkflowPreview = function () {
                _this.state = __assign(__assign({}, _this.state), { workflowSavePreview: undefined });
                _this.update();
            };
            _this.importWorkflow = function () { return __awaiter(_this, void 0, void 0, function () {
                var source;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            source = window.prompt('Workflow export path, run.json path, or workflow file URI');
                            if (!(source === null || source === void 0 ? void 0 : source.trim())) {
                                return [2 /*return*/];
                            }
                            return [4 /*yield*/, this.withBusy(function () { return __awaiter(_this, void 0, void 0, function () {
                                    var workspaceRootUri, workflow, snapshot;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, this.workspaceRootUri()];
                                            case 1:
                                                workspaceRootUri = _a.sent();
                                                return [4 /*yield*/, this.flowService.importWorkflow({
                                                        workspaceRootUri: workspaceRootUri,
                                                        filePath: source.trim()
                                                    })];
                                            case 2:
                                                workflow = _a.sent();
                                                return [4 /*yield*/, this.flowService.getSnapshot({ workspaceRootUri: workspaceRootUri })];
                                            case 3:
                                                snapshot = _a.sent();
                                                this.state = __assign(__assign({}, this.state), { snapshot: __assign(__assign({}, snapshot), { activeWorkflow: workflow, validation: (0, common_2.validateFlowWorkflow)(workflow) }), workflowUndoStack: [], workflowRedoStack: [], workflowSourceText: (0, common_2.formatWorkflowSource)(workflow), workflowSourceError: undefined, workflowSavePreview: undefined, selectedKind: 'state', selectedId: Object.keys(workflow.states || {})[0], error: undefined });
                                                return [2 /*return*/];
                                        }
                                    });
                                }); })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); };
            _this.importRun = function () { return __awaiter(_this, void 0, void 0, function () {
                var source;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            source = window.prompt('Run export directory or run.json path');
                            if (!(source === null || source === void 0 ? void 0 : source.trim())) {
                                return [2 /*return*/];
                            }
                            return [4 /*yield*/, this.withBusy(function () { return __awaiter(_this, void 0, void 0, function () {
                                    var workspaceRootUri, activeRun, snapshot;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, this.workspaceRootUri()];
                                            case 1:
                                                workspaceRootUri = _a.sent();
                                                return [4 /*yield*/, this.flowService.importRun({
                                                        workspaceRootUri: workspaceRootUri,
                                                        filePath: source.trim()
                                                    })];
                                            case 2:
                                                activeRun = _a.sent();
                                                return [4 /*yield*/, this.flowService.getSnapshot({ workspaceRootUri: workspaceRootUri })];
                                            case 3:
                                                snapshot = _a.sent();
                                                this.state = __assign(__assign({}, this.state), { snapshot: __assign(__assign({}, snapshot), { activeRun: normalizeFlowRunEvents(activeRun) }), selectedKind: activeRun.currentStateIds[0] ? 'state' : this.state.selectedKind, selectedId: activeRun.currentStateIds[0] || this.state.selectedId, error: undefined });
                                                return [4 /*yield*/, this.unsubscribeActiveRunStream()];
                                            case 4:
                                                _a.sent();
                                                return [2 /*return*/];
                                        }
                                    });
                                }); })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); };
            _this.exportWorkflow = function () { return __awaiter(_this, void 0, void 0, function () {
                var workflow, target;
                var _this = this;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            workflow = (_a = this.state.snapshot) === null || _a === void 0 ? void 0 : _a.activeWorkflow;
                            if (!workflow) {
                                return [2 /*return*/];
                            }
                            target = window.prompt('Workflow export directory (leave empty for default package location)', '');
                            if (target === null) {
                                return [2 /*return*/];
                            }
                            return [4 /*yield*/, this.withBusy(function () { return __awaiter(_this, void 0, void 0, function () {
                                    var workspaceRootUri, exported, missing;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, this.workspaceRootUri()];
                                            case 1:
                                                workspaceRootUri = _a.sent();
                                                return [4 /*yield*/, this.flowService.exportWorkflow({
                                                        workspaceRootUri: workspaceRootUri,
                                                        workflowId: workflow.id,
                                                        targetPath: (target === null || target === void 0 ? void 0 : target.trim()) || undefined
                                                    })];
                                            case 2:
                                                exported = _a.sent();
                                                missing = [
                                                    exported.missingAgents.length ? "".concat(exported.missingAgents.length, " missing agent(s)") : undefined,
                                                    exported.missingContracts.length ? "".concat(exported.missingContracts.length, " missing contract/schema file(s)") : undefined
                                                ].filter(Boolean).join('; ');
                                                this.state = __assign(__assign({}, this.state), { error: missing ? "Workflow exported to ".concat(exported.path, "; ").concat(missing, ".") : undefined });
                                                return [4 /*yield*/, (0, browser_1.open)(this.openerService, new uri_1.default(exported.uri))];
                                            case 3:
                                                _a.sent();
                                                return [2 /*return*/];
                                        }
                                    });
                                }); })];
                        case 1:
                            _b.sent();
                            return [2 /*return*/];
                    }
                });
            }); };
            _this.exportRun = function () { return __awaiter(_this, void 0, void 0, function () {
                var run, target;
                var _this = this;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            run = (_a = this.state.snapshot) === null || _a === void 0 ? void 0 : _a.activeRun;
                            if (!run) {
                                return [2 /*return*/];
                            }
                            target = window.prompt('Run export directory (leave empty for default package location)', '');
                            if (target === null) {
                                return [2 /*return*/];
                            }
                            return [4 /*yield*/, this.withBusy(function () { return __awaiter(_this, void 0, void 0, function () {
                                    var workspaceRootUri, exported;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, this.workspaceRootUri()];
                                            case 1:
                                                workspaceRootUri = _a.sent();
                                                return [4 /*yield*/, this.flowService.exportRun({
                                                        workspaceRootUri: workspaceRootUri,
                                                        runId: run.id,
                                                        targetPath: (target === null || target === void 0 ? void 0 : target.trim()) || undefined
                                                    })];
                                            case 2:
                                                exported = _a.sent();
                                                this.state = __assign(__assign({}, this.state), { error: exported.missingArtifacts.length
                                                        ? "Run exported to ".concat(exported.path, "; ").concat(exported.missingArtifacts.length, " artifact file(s) could not be copied.")
                                                        : undefined });
                                                return [4 /*yield*/, (0, browser_1.open)(this.openerService, new uri_1.default(exported.uri))];
                                            case 3:
                                                _a.sent();
                                                return [2 /*return*/];
                                        }
                                    });
                                }); })];
                        case 1:
                            _b.sent();
                            return [2 /*return*/];
                    }
                });
            }); };
            _this.showWorkflowHistory = function () { return __awaiter(_this, void 0, void 0, function () {
                var workflow;
                var _this = this;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            workflow = (_a = this.state.snapshot) === null || _a === void 0 ? void 0 : _a.activeWorkflow;
                            if (!workflow) {
                                return [2 /*return*/];
                            }
                            return [4 /*yield*/, this.withBusy(function () { return __awaiter(_this, void 0, void 0, function () {
                                    var versions, _a, _b;
                                    var _c;
                                    return __generator(this, function (_d) {
                                        switch (_d.label) {
                                            case 0:
                                                _b = (_a = this.flowService).listWorkflowVersions;
                                                _c = {};
                                                return [4 /*yield*/, this.workspaceRootUri()];
                                            case 1: return [4 /*yield*/, _b.apply(_a, [(_c.workspaceRootUri = _d.sent(),
                                                        _c.workflowId = workflow.id,
                                                        _c)])];
                                            case 2:
                                                versions = _d.sent();
                                                window.alert(renderWorkflowVersions(versions));
                                                return [2 /*return*/];
                                        }
                                    });
                                }); })];
                        case 1:
                            _b.sent();
                            return [2 /*return*/];
                    }
                });
            }); };
            _this.restoreWorkflowVersion = function () { return __awaiter(_this, void 0, void 0, function () {
                var snapshot, workflow, versionId;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            snapshot = this.state.snapshot;
                            workflow = snapshot === null || snapshot === void 0 ? void 0 : snapshot.activeWorkflow;
                            if (!workflow || !snapshot) {
                                return [2 /*return*/];
                            }
                            versionId = window.prompt('Workflow version id to restore');
                            if (!(versionId === null || versionId === void 0 ? void 0 : versionId.trim())) {
                                return [2 /*return*/];
                            }
                            return [4 /*yield*/, this.withBusy(function () { return __awaiter(_this, void 0, void 0, function () {
                                    var workspaceRootUri, activeWorkflow, workflows, _a, _b, _c;
                                    var _d, _e;
                                    return __generator(this, function (_f) {
                                        switch (_f.label) {
                                            case 0: return [4 /*yield*/, this.workspaceRootUri()];
                                            case 1:
                                                workspaceRootUri = _f.sent();
                                                return [4 /*yield*/, this.flowService.restoreWorkflowVersion({
                                                        workspaceRootUri: workspaceRootUri,
                                                        workflowId: workflow.id,
                                                        versionId: versionId.trim(),
                                                        message: 'Restored from Flow UI'
                                                    })];
                                            case 2:
                                                activeWorkflow = _f.sent();
                                                return [4 /*yield*/, this.flowService.listWorkflows({ workspaceRootUri: workspaceRootUri })];
                                            case 3:
                                                workflows = _f.sent();
                                                _a = this;
                                                _b = [__assign({}, this.state)];
                                                _d = {};
                                                _c = [__assign({}, snapshot)];
                                                _e = { workflows: workflows, activeWorkflow: activeWorkflow };
                                                return [4 /*yield*/, this.flowService.validateWorkflow(activeWorkflow)];
                                            case 4:
                                                _a.state = __assign.apply(void 0, _b.concat([(_d.snapshot = __assign.apply(void 0, _c.concat([(_e.validation = _f.sent(), _e)])), _d.selectedKind = 'state', _d.selectedId = Object.keys(activeWorkflow.states || {})[0], _d.workflowUndoStack = [], _d.workflowRedoStack = [], _d.workflowSourceText = (0, common_2.formatWorkflowSource)(activeWorkflow), _d.workflowSourceError = undefined, _d.workflowSavePreview = undefined, _d.error = undefined, _d)]));
                                                return [2 /*return*/];
                                        }
                                    });
                                }); })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); };
            _this.tickRun = function () { return __awaiter(_this, void 0, void 0, function () {
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.withBusy(function () { return __awaiter(_this, void 0, void 0, function () {
                                var snapshot, activeRun, updatedRun, _a, _b;
                                var _c;
                                var _d;
                                return __generator(this, function (_e) {
                                    switch (_e.label) {
                                        case 0:
                                            snapshot = this.state.snapshot;
                                            activeRun = (_d = this.state.snapshot) === null || _d === void 0 ? void 0 : _d.activeRun;
                                            if (!activeRun || !snapshot) {
                                                return [2 /*return*/];
                                            }
                                            _b = (_a = this.flowService).tickRun;
                                            _c = {};
                                            return [4 /*yield*/, this.workspaceRootUri()];
                                        case 1: return [4 /*yield*/, _b.apply(_a, [(_c.workspaceRootUri = _e.sent(),
                                                    _c.runId = activeRun.id,
                                                    _c)])];
                                        case 2:
                                            updatedRun = _e.sent();
                                            this.applyRunUpdate(updatedRun);
                                            return [4 /*yield*/, this.subscribeActiveRunStream(updatedRun.id)];
                                        case 3:
                                            _e.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); };
            _this.pauseRun = function () { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.runLifecycleAction('pauseRun', 'Paused from Flow UI.')];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); };
            _this.resumeRun = function () { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.runLifecycleAction('resumeRun', 'Resumed from Flow UI.')];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); };
            _this.cancelRun = function () { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.runLifecycleAction('cancelRun', 'Cancelled from Flow UI.')];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); };
            _this.finalizeRun = function () { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.runLifecycleAction('finalizeRun', 'Finalized from Flow UI.')];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); };
            _this.approveGate = function (gateId, decision) { return __awaiter(_this, void 0, void 0, function () {
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.withBusy(function () { return __awaiter(_this, void 0, void 0, function () {
                                var snapshot, activeRun, updatedRun, _a, _b;
                                var _c;
                                var _d;
                                return __generator(this, function (_e) {
                                    switch (_e.label) {
                                        case 0:
                                            snapshot = this.state.snapshot;
                                            activeRun = (_d = this.state.snapshot) === null || _d === void 0 ? void 0 : _d.activeRun;
                                            if (!activeRun || !snapshot) {
                                                return [2 /*return*/];
                                            }
                                            _b = (_a = this.flowService).approveGate;
                                            _c = {};
                                            return [4 /*yield*/, this.workspaceRootUri()];
                                        case 1: return [4 /*yield*/, _b.apply(_a, [(_c.workspaceRootUri = _e.sent(),
                                                    _c.runId = activeRun.id,
                                                    _c.gateId = gateId,
                                                    _c.decision = decision,
                                                    _c)])];
                                        case 2:
                                            updatedRun = _e.sent();
                                            this.applyRunUpdate(updatedRun);
                                            return [4 /*yield*/, this.subscribeActiveRunStream(updatedRun.id)];
                                        case 3:
                                            _e.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); };
            _this.decideMemoryCandidate = function (candidateId, decision, content, scope, target) { return __awaiter(_this, void 0, void 0, function () {
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.withBusy(function () { return __awaiter(_this, void 0, void 0, function () {
                                var snapshot, activeRun, updatedRun, _a, _b;
                                var _c;
                                var _d;
                                return __generator(this, function (_e) {
                                    switch (_e.label) {
                                        case 0:
                                            snapshot = this.state.snapshot;
                                            activeRun = (_d = this.state.snapshot) === null || _d === void 0 ? void 0 : _d.activeRun;
                                            if (!activeRun || !snapshot) {
                                                return [2 /*return*/];
                                            }
                                            _b = (_a = this.flowService).approveMemoryCandidate;
                                            _c = {};
                                            return [4 /*yield*/, this.workspaceRootUri()];
                                        case 1: return [4 /*yield*/, _b.apply(_a, [(_c.workspaceRootUri = _e.sent(),
                                                    _c.runId = activeRun.id,
                                                    _c.candidateId = candidateId,
                                                    _c.decision = decision,
                                                    _c.content = content,
                                                    _c.scope = scope,
                                                    _c.target = target,
                                                    _c)])];
                                        case 2:
                                            updatedRun = _e.sent();
                                            this.applyRunUpdate(updatedRun);
                                            return [2 /*return*/];
                                    }
                                });
                            }); })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); };
            _this.decideEffect = function (effectId, decision, note) { return __awaiter(_this, void 0, void 0, function () {
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.withBusy(function () { return __awaiter(_this, void 0, void 0, function () {
                                var snapshot, activeRun, updatedRun, _a, _b;
                                var _c;
                                var _d;
                                return __generator(this, function (_e) {
                                    switch (_e.label) {
                                        case 0:
                                            snapshot = this.state.snapshot;
                                            activeRun = (_d = this.state.snapshot) === null || _d === void 0 ? void 0 : _d.activeRun;
                                            if (!activeRun || !snapshot) {
                                                return [2 /*return*/];
                                            }
                                            _b = (_a = this.flowService).decideEffect;
                                            _c = {};
                                            return [4 /*yield*/, this.workspaceRootUri()];
                                        case 1: return [4 /*yield*/, _b.apply(_a, [(_c.workspaceRootUri = _e.sent(),
                                                    _c.runId = activeRun.id,
                                                    _c.effectId = effectId,
                                                    _c.decision = decision,
                                                    _c.note = note,
                                                    _c.approvedBy = 'Flow UI',
                                                    _c)])];
                                        case 2:
                                            updatedRun = _e.sent();
                                            this.applyRunUpdate(updatedRun);
                                            return [2 /*return*/];
                                    }
                                });
                            }); })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); };
            _this.approveSecondRunSuggestion = function (suggestionId) { return __awaiter(_this, void 0, void 0, function () {
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.withBusy(function () { return __awaiter(_this, void 0, void 0, function () {
                                var snapshot, activeRun, newRun, _a, _b, workflows, _c, _d, activeWorkflow, _e, _f, _g, _h, _j;
                                var _k, _l, _m, _o, _p;
                                return __generator(this, function (_q) {
                                    switch (_q.label) {
                                        case 0:
                                            snapshot = this.state.snapshot;
                                            activeRun = snapshot === null || snapshot === void 0 ? void 0 : snapshot.activeRun;
                                            if (!activeRun || !snapshot) {
                                                return [2 /*return*/];
                                            }
                                            _b = (_a = this.flowService).approveSecondRunSuggestion;
                                            _k = {};
                                            return [4 /*yield*/, this.workspaceRootUri()];
                                        case 1: return [4 /*yield*/, _b.apply(_a, [(_k.workspaceRootUri = _q.sent(),
                                                    _k.runId = activeRun.id,
                                                    _k.suggestionId = suggestionId,
                                                    _k.approvedBy = 'Flow UI',
                                                    _k)])];
                                        case 2:
                                            newRun = _q.sent();
                                            _d = (_c = this.flowService).listWorkflows;
                                            _l = {};
                                            return [4 /*yield*/, this.workspaceRootUri()];
                                        case 3: return [4 /*yield*/, _d.apply(_c, [(_l.workspaceRootUri = _q.sent(), _l)])];
                                        case 4:
                                            workflows = _q.sent();
                                            _f = (_e = this.flowService).getWorkflow;
                                            _m = {};
                                            return [4 /*yield*/, this.workspaceRootUri()];
                                        case 5: return [4 /*yield*/, _f.apply(_e, [(_m.workspaceRootUri = _q.sent(),
                                                    _m.workflowId = newRun.workflowId,
                                                    _m)])];
                                        case 6:
                                            activeWorkflow = _q.sent();
                                            _g = this;
                                            _h = [__assign({}, this.state)];
                                            _o = {};
                                            _j = [__assign({}, snapshot)];
                                            _p = { workflows: workflows, activeWorkflow: activeWorkflow, activeRun: normalizeFlowRunEvents(newRun) };
                                            return [4 /*yield*/, this.flowService.validateWorkflow(activeWorkflow)];
                                        case 7:
                                            _g.state = __assign.apply(void 0, _h.concat([(_o.snapshot = __assign.apply(void 0, _j.concat([(_p.validation = _q.sent(), _p)])), _o.selectedKind = 'state', _o.selectedId = newRun.currentStateIds[0] || Object.keys(activeWorkflow.states)[0], _o.error = undefined, _o)]));
                                            return [4 /*yield*/, this.subscribeActiveRunStream(newRun.id)];
                                        case 8:
                                            _q.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); };
            _this.dismissSecondRunSuggestion = function (suggestionId) { return __awaiter(_this, void 0, void 0, function () {
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.withBusy(function () { return __awaiter(_this, void 0, void 0, function () {
                                var snapshot, activeRun, updatedRun, _a, _b;
                                var _c;
                                return __generator(this, function (_d) {
                                    switch (_d.label) {
                                        case 0:
                                            snapshot = this.state.snapshot;
                                            activeRun = snapshot === null || snapshot === void 0 ? void 0 : snapshot.activeRun;
                                            if (!activeRun || !snapshot) {
                                                return [2 /*return*/];
                                            }
                                            _b = (_a = this.flowService).decideSecondRunSuggestion;
                                            _c = {};
                                            return [4 /*yield*/, this.workspaceRootUri()];
                                        case 1: return [4 /*yield*/, _b.apply(_a, [(_c.workspaceRootUri = _d.sent(),
                                                    _c.runId = activeRun.id,
                                                    _c.suggestionId = suggestionId,
                                                    _c.decision = 'dismissed',
                                                    _c.approvedBy = 'Flow UI',
                                                    _c)])];
                                        case 2:
                                            updatedRun = _d.sent();
                                            this.state = __assign(__assign({}, this.state), { snapshot: __assign(__assign({}, snapshot), { activeRun: normalizeFlowRunEvents(updatedRun) }), error: undefined });
                                            return [2 /*return*/];
                                    }
                                });
                            }); })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); };
            return _this;
        }
        FlowWidget_1.prototype.init = function () {
            this.id = FlowWidget.ID;
            this.title.label = FlowWidget.LABEL;
            this.title.caption = FlowWidget.LABEL;
            this.title.closable = true;
            this.addClass('flow-widget');
            this.registerRunStreamClient();
            document.addEventListener('pointerdown', this.handleTopMenuPointerDown);
            document.addEventListener('keydown', this.handleTopMenuKeyDown);
            this.refresh();
        };
        FlowWidget_1.prototype.dispose = function () {
            document.removeEventListener('pointerdown', this.handleTopMenuPointerDown);
            document.removeEventListener('keydown', this.handleTopMenuKeyDown);
            for (var _i = 0, _a = this.streamDisposers.splice(0); _i < _a.length; _i++) {
                var dispose = _a[_i];
                dispose();
            }
            void this.unsubscribeActiveRunStream();
            _super.prototype.dispose.call(this);
        };
        FlowWidget_1.prototype.registerRunStreamClient = function () {
            var _this = this;
            var _a, _b, _c, _d;
            var disposeUpdate = (_b = (_a = this.flowClient).onRunUpdate) === null || _b === void 0 ? void 0 : _b.call(_a, function (update) {
                var snapshot = _this.state.snapshot;
                if (!(snapshot === null || snapshot === void 0 ? void 0 : snapshot.activeRun) || snapshot.activeRun.id !== update.run.id) {
                    return;
                }
                _this.applyRunUpdate(update.run);
            });
            var disposeError = (_d = (_c = this.flowClient).onRunError) === null || _d === void 0 ? void 0 : _d.call(_c, function (error) {
                var _a, _b;
                if (((_b = (_a = _this.state.snapshot) === null || _a === void 0 ? void 0 : _a.activeRun) === null || _b === void 0 ? void 0 : _b.id) !== error.runId) {
                    return;
                }
                _this.state = __assign(__assign({}, _this.state), { error: "Run stream failed: ".concat(error.message) });
                _this.update();
            });
            if (disposeUpdate) {
                this.streamDisposers.push(disposeUpdate);
            }
            if (disposeError) {
                this.streamDisposers.push(disposeError);
            }
        };
        FlowWidget_1.prototype.render = function () {
            var _this = this;
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
            var snapshot = this.state.snapshot;
            var run = snapshot === null || snapshot === void 0 ? void 0 : snapshot.activeRun;
            var runWorkflow = (_a = run === null || run === void 0 ? void 0 : run.audit) === null || _a === void 0 ? void 0 : _a.workflow;
            var activeWorkflow = snapshot === null || snapshot === void 0 ? void 0 : snapshot.activeWorkflow;
            var workflow = runWorkflow && (!activeWorkflow || run.workflowId === activeWorkflow.id) ? runWorkflow : activeWorkflow;
            var validation = runWorkflow && (workflow === null || workflow === void 0 ? void 0 : workflow.id) === runWorkflow.id ? (0, common_2.validateFlowWorkflow)(runWorkflow) : snapshot === null || snapshot === void 0 ? void 0 : snapshot.validation;
            var canvas = workflow ? (0, common_2.deriveFlowCanvasModel)(workflow, run) : undefined;
            var workflowSourceText = (_b = this.state.workflowSourceText) !== null && _b !== void 0 ? _b : (workflow ? (0, common_2.formatWorkflowSource)(workflow) : '');
            var capabilities = snapshot === null || snapshot === void 0 ? void 0 : snapshot.capabilities;
            var executionMode = resolveExecutionMode(run === null || run === void 0 ? void 0 : run.executionMode, this.state.executionModeHint, snapshot === null || snapshot === void 0 ? void 0 : snapshot.capabilities.kernelBridge);
            var executionModeMessage = (run === null || run === void 0 ? void 0 : run.executionModeMessage) || this.state.executionModeHintMessage;
            var lifecycleControls = (snapshot === null || snapshot === void 0 ? void 0 : snapshot.capabilities.runLifecycleControls) === true;
            var manualTickFallback = !(capabilities === null || capabilities === void 0 ? void 0 : capabilities.runEventStream) || executionMode !== 'kernel_external';
            var runTerminal = run ? isTerminalRunStatus(run.status) : false;
            var runReadOnly = isReadOnlyRun(run);
            var canPauseRun = lifecycleControls && Boolean(run) && !runReadOnly && !runTerminal && (run === null || run === void 0 ? void 0 : run.status) !== 'paused';
            var canResumeRun = lifecycleControls && !runReadOnly && (run === null || run === void 0 ? void 0 : run.status) === 'paused';
            var canCancelRun = lifecycleControls && Boolean(run) && !runReadOnly && !runTerminal;
            var canFinalizeRun = lifecycleControls && Boolean(run) && !runReadOnly && runTerminal;
            var selectedWorkflowState = workflow && this.state.selectedKind === 'state' && this.state.selectedId ? (0, common_2.findFlowWorkflowState)(workflow, this.state.selectedId) : undefined;
            var selectedState = selectedWorkflowState === null || selectedWorkflowState === void 0 ? void 0 : selectedWorkflowState.state;
            var selectedTransition = workflow && this.state.selectedKind === 'transition' && this.state.selectedId
                ? workflow.transitions.find(function (transition) { return (transition.id || "".concat(transition.from, "-").concat(transition.to)) === _this.state.selectedId; })
                : undefined;
            var selectedPattern = this.state.workflowPatterns.find(function (pattern) { return pattern.id === _this.state.selectedPatternId; });
            var canUndoWorkflow = ((_c = workflow === null || workflow === void 0 ? void 0 : workflow.file) === null || _c === void 0 ? void 0 : _c.editable) !== false && this.state.workflowUndoStack.length > 0;
            var canRedoWorkflow = ((_d = workflow === null || workflow === void 0 ? void 0 : workflow.file) === null || _d === void 0 ? void 0 : _d.editable) !== false && this.state.workflowRedoStack.length > 0;
            var workflowStateCount = workflow ? Object.keys(workflow.states || {}).length : 0;
            var workflowTransitionCount = (workflow === null || workflow === void 0 ? void 0 : workflow.transitions.length) || 0;
            var validationSummary = validation
                ? validation.valid ? 'Validado' : "".concat(validation.errors.length, " erros / ").concat(validation.warnings.length, " avisos")
                : 'Sem validacao';
            return <div className='flow'>
            <header className='flow__header'>
                <div className='flow__title-block'>
                    <h2>{(workflow === null || workflow === void 0 ? void 0 : workflow.name) || 'Flow'}</h2>
                    <div className='flow__meta-line'>
                        <span>{(workflow === null || workflow === void 0 ? void 0 : workflow.id) || 'No workflow loaded'}</span>
                        <span>{workflowStateCount} blocos</span>
                        <span>{workflowTransitionCount} ligacoes</span>
                        <span>{validationSummary}</span>
                    </div>
                </div>
                <nav className='flow__top-menus' aria-label='Flow menus'>
                    <div className={"flow__menu ".concat(this.state.openMenu === 'workflow' ? 'flow__menu--open' : '')}>
                        <button type='button' className='flow__menu-trigger' aria-haspopup='menu' aria-expanded={this.state.openMenu === 'workflow'} onClick={function () { return _this.toggleTopMenu('workflow'); }}>
                            <i className='codicon codicon-type-hierarchy-sub'/> Workflow
                        </button>
                        {this.state.openMenu === 'workflow' && <div className='flow__menu-panel flow__menu-panel--workflow'>
                            <label className='flow__factory-field'>
                                <span>Workflow atual</span>
                                <select value={(workflow === null || workflow === void 0 ? void 0 : workflow.id) || ''} onChange={function (event) { return _this.chooseWorkflow(event.currentTarget.value); }} disabled={this.state.busy || !(snapshot === null || snapshot === void 0 ? void 0 : snapshot.workflows.length)} aria-label='Escolher workflow'>
                                    {((snapshot === null || snapshot === void 0 ? void 0 : snapshot.workflows) || []).map(function (item) { return <option key={item.id} value={item.id}>{item.name}</option>; })}
                                </select>
                            </label>
                            <div className='flow__menu-row'>
                                <label className='flow__factory-field'>
                                    <span>Template</span>
                                    <select value={this.state.selectedTemplateId || ''} onChange={function (event) { return _this.setSelectedTemplate(event.currentTarget.value); }} disabled={this.state.busy || this.state.templates.length === 0} title='Workflow template' aria-label='Workflow template'>
                                        {this.state.templates.map(function (template) { return <option key={template.id} value={template.id}>{template.name}</option>; })}
                                    </select>
                                </label>
                                <button title='Create workflow from template' onClick={function () { return _this.runMenuCommand(_this.createWorkflowFromTemplate); }} disabled={this.state.busy || !this.state.selectedTemplateId}>
                                    <i className='codicon codicon-add'/> Criar
                                </button>
                            </div>
                            <div className='flow__menu-row'>
                                <label className='flow__factory-field'>
                                    <span>Preset</span>
                                    <select value={this.state.selectedPipelinePresetId || ''} onChange={function (event) { return _this.setSelectedPipelinePreset(event.currentTarget.value); }} disabled={this.state.busy || this.state.pipelinePresets.length === 0} title='Pipeline preset' aria-label='Pipeline preset'>
                                        {this.state.pipelinePresets.map(function (preset) { return <option key={preset.id} value={preset.id}>{preset.name} ({preset.source || 'workspace'})</option>; })}
                                    </select>
                                </label>
                                <button title='Create workflow from preset' onClick={function () { return _this.runMenuCommand(_this.createWorkflowFromPreset); }} disabled={this.state.busy || !this.state.selectedPipelinePresetId}>
                                    <i className='codicon codicon-run'/> Usar
                                </button>
                            </div>
                            <button title='Save current workflow as pipeline preset' onClick={function () { return _this.runMenuCommand(_this.saveCurrentWorkflowAsPreset); }} disabled={this.state.busy || !workflow}>
                                <i className='codicon codicon-save-as'/> Salvar como preset
                            </button>
                            <PatternFactory patterns={this.state.workflowPatterns} selectedPattern={selectedPattern} selectedPatternId={this.state.selectedPatternId} parameters={this.state.patternParameters} roleOverrides={this.state.patternRoleOverrides} modelProfiles={this.state.modelProfiles} busy={this.state.busy} onSelect={this.setSelectedPattern} onUpdateParameter={this.updatePatternParameter} onUpdateRoleOverride={this.updatePatternRoleOverride} onCreate={function () { return _this.runMenuCommand(_this.createWorkflowFromPattern); }} onRun={function () { return _this.runMenuCommand(_this.runWorkflowPattern); }}/>
                        </div>}
                    </div>
                    <div className={"flow__menu flow__menu--file ".concat(this.state.openMenu === 'file' ? 'flow__menu--open' : '')}>
                        <button type='button' className='flow__menu-trigger' aria-haspopup='menu' aria-expanded={this.state.openMenu === 'file'} onClick={function () { return _this.toggleTopMenu('file'); }}>
                            <i className='codicon codicon-file-code'/> File
                        </button>
                        {this.state.openMenu === 'file' && <div className='flow__menu-panel flow__menu-panel--file'>
                            <div className='flow__menu-grid'>
                                <button title='Refresh snapshot' onClick={function () { return _this.runMenuCommand(_this.refresh); }} disabled={this.state.busy}>
                                    <i className='codicon codicon-refresh'/> Atualizar
                                </button>
                                <button title='Reload workflow file' onClick={function () { return _this.runMenuCommand(_this.reloadWorkflowFile); }} disabled={this.state.busy || !workflow || ((_e = workflow.file) === null || _e === void 0 ? void 0 : _e.editable) === false}>
                                    <i className='codicon codicon-discard'/> Recarregar
                                </button>
                                <button title='Save workflow file' onClick={function () { return _this.runMenuCommand(_this.saveWorkflowFile); }} disabled={this.state.busy || !workflow || ((_f = workflow.file) === null || _f === void 0 ? void 0 : _f.editable) === false}>
                                    <i className='codicon codicon-save'/> Salvar
                                </button>
                                <button title='Import workflow export' onClick={function () { return _this.runMenuCommand(_this.importWorkflow); }} disabled={this.state.busy}>
                                    <i className='codicon codicon-cloud-upload'/> Importar workflow
                                </button>
                                <button title='Export complete workflow package' onClick={function () { return _this.runMenuCommand(_this.exportWorkflow); }} disabled={this.state.busy || !workflow}>
                                    <i className='codicon codicon-cloud-download'/> Exportar workflow
                                </button>
                                <button title='Show workflow version history' onClick={function () { return _this.runMenuCommand(_this.showWorkflowHistory); }} disabled={this.state.busy || !workflow}>
                                    <i className='codicon codicon-history'/> Versoes
                                </button>
                                <button title='Restore workflow version' onClick={function () { return _this.runMenuCommand(_this.restoreWorkflowVersion); }} disabled={this.state.busy || !workflow || ((_g = workflow.file) === null || _g === void 0 ? void 0 : _g.editable) === false}>
                                    <i className='codicon codicon-versions'/> Restaurar versao
                                </button>
                                <button title='Import run export as read-only audit' onClick={function () { return _this.runMenuCommand(_this.importRun); }} disabled={this.state.busy}>
                                    <i className='codicon codicon-archive'/> Importar run
                                </button>
                                <button title='Export complete run audit package' onClick={function () { return _this.runMenuCommand(_this.exportRun); }} disabled={this.state.busy || !run}>
                                    <i className='codicon codicon-export'/> Exportar run
                                </button>
                                <button title='Editar fonte JSON/YAML do workflow' onClick={function () { return _this.runMenuCommand(_this.toggleWorkflowSourcePanel); }} disabled={this.state.busy || !workflow}>
                                    <i className='codicon codicon-json'/> {this.state.workflowSourceVisible ? 'Ocultar fonte' : 'Editar fonte'}
                                </button>
                            </div>
                        </div>}
                    </div>
                    <div className={"flow__menu flow__menu--agents ".concat(this.state.openMenu === 'agents' ? 'flow__menu--open' : '')}>
                        <button type='button' className='flow__menu-trigger' aria-haspopup='menu' aria-expanded={this.state.openMenu === 'agents'} onClick={function () { return _this.toggleTopMenu('agents'); }}>
                            <i className='codicon codicon-hubot'/> Agents
                        </button>
                        {this.state.openMenu === 'agents' && <div className='flow__menu-panel flow__menu-panel--agents'>
                            <AgentLibrary agents={this.state.agents} search={this.state.agentSearch} busy={this.state.busy} onSearch={this.setAgentSearch} onOpen={function (relativePath) { return _this.runMenuCommand(function () { return _this.openAgentMarkdown(relativePath); }); }} onCreate={function () { return _this.runMenuCommand(_this.createAgentMarkdown); }} onDuplicate={function (sourceRelativePath) { return _this.runMenuCommand(function () { return _this.duplicateAgentMarkdown(sourceRelativePath); }); }} onRename={function (sourceRelativePath) { return _this.runMenuCommand(function () { return _this.renameAgentMarkdown(sourceRelativePath); }); }}/>
                        </div>}
                    </div>
                    <button className={this.state.runHistoryVisible ? 'flow__history-button flow__history-button--open' : 'flow__history-button'} title='Historico de runs' onClick={this.toggleRunHistory} disabled={this.state.busy}>
                        <i className='codicon codicon-history'/> Historico
                    </button>
                </nav>
                <div className='flow__run-controls' aria-label='Run controls'>
                    <button title='Undo local workflow edit' onClick={this.undoWorkflowEdit} disabled={this.state.busy || !canUndoWorkflow}>
                        <i className='codicon codicon-arrow-left'/>
                    </button>
                    <button title='Redo local workflow edit' onClick={this.redoWorkflowEdit} disabled={this.state.busy || !canRedoWorkflow}>
                        <i className='codicon codicon-redo'/>
                    </button>
                    <button title='Start run' onClick={this.startRun} disabled={this.state.busy || !workflow || ((_h = workflow.file) === null || _h === void 0 ? void 0 : _h.editable) === false}>
                        <i className='codicon codicon-debug-start'/>
                    </button>
                    <button title='Run dynamic workflow from current prompt' onClick={this.runDynamicWorkflowFromPrompt} disabled={this.state.busy || !this.state.prompt.trim()}>
                        <i className='codicon codicon-symbol-event'/>
                    </button>
                    <button title={manualTickFallback ? 'Tick run manually (fallback)' : 'Tick disabled while kernel event stream is active'} onClick={this.tickRun} disabled={this.state.busy || !run || runReadOnly || !manualTickFallback}>
                        <i className='codicon codicon-debug-step-over'/>
                    </button>
                    <button title='Pause run' onClick={this.pauseRun} disabled={this.state.busy || !canPauseRun}>
                        <i className='codicon codicon-debug-pause'/>
                    </button>
                    <button title='Resume run' onClick={this.resumeRun} disabled={this.state.busy || !canResumeRun}>
                        <i className='codicon codicon-debug-continue'/>
                    </button>
                    <button title='Cancel run' onClick={this.cancelRun} disabled={this.state.busy || !canCancelRun}>
                        <i className='codicon codicon-debug-stop'/>
                    </button>
                    <button title='Finalize run with report' onClick={this.finalizeRun} disabled={this.state.busy || !canFinalizeRun}>
                        <i className='codicon codicon-file-text'/>
                    </button>
                </div>
            </header>

            <section className='flow__prompt'>
                <label className='flow__prompt-field'>
                    <span>Prompt da run</span>
                    <textarea rows={3} value={this.state.prompt} onChange={function (event) { return _this.setPrompt(event.currentTarget.value); }} placeholder='Descreva objetivo, entradas, restricoes e entregaveis esperados.' aria-label='Run prompt'/>
                </label>
            </section>

            {this.state.error && <div className='flow__error'>{this.state.error}</div>}
            {((_j = workflow === null || workflow === void 0 ? void 0 : workflow.file) === null || _j === void 0 ? void 0 : _j.unsupportedReason) && <div className='flow__validation'><span>{workflow.file.unsupportedReason}</span></div>}
            {validation && !validation.valid && <ValidationIssues issues={validation.errors}/>}
            {this.state.workflowSavePreview && <WorkflowSavePreview diff={this.state.workflowSavePreview} onConfirm={this.confirmSaveWorkflowFile} onCancel={this.cancelSaveWorkflowPreview} busy={this.state.busy}/>}
            {this.state.workflowSourceVisible && workflow && <section className='flow__workflow-source-panel'>
                <WorkflowSourceEditor workflow={workflow} value={workflowSourceText} validation={validation} parseError={this.state.workflowSourceError} editable={((_k = workflow.file) === null || _k === void 0 ? void 0 : _k.editable) !== false} selectedKind={this.state.selectedKind} selectedId={this.state.selectedId} onChange={this.updateWorkflowSourceDraft} onApply={this.applyWorkflowSourceDraft} onSelectIssue={this.selectValidationIssue}/>
            </section>}

            {this.state.runHistoryVisible && <RunHistoryPanel runs={this.state.runHistory} activeRunId={run === null || run === void 0 ? void 0 : run.id} busy={this.state.busy} onOpen={this.openRunFromHistory} onClose={function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                    return [2 /*return*/, this.closeTopMenus()];
                }); }); }}/>}

            <main className='flow__main'>
                <section className='flow__canvas-pane'>
                    {workflow && canvas && <WorkflowCanvas workflow={workflow} nodes={canvas.nodes} edges={canvas.edges} width={canvas.width} height={canvas.height} selectedId={this.state.selectedId} onSelectState={function (id) { return _this.select('state', id); }} onSelectTransition={function (id) { return _this.select('transition', id); }} onAddState={this.addWorkflowState} onAddTransition={this.addWorkflowTransition} onMoveState={this.moveWorkflowState} onDeleteState={this.deleteWorkflowState} onDeleteTransition={this.deleteWorkflowTransition} onUndo={this.undoWorkflowEdit} onRedo={this.redoWorkflowEdit} canUndo={canUndoWorkflow} canRedo={canRedoWorkflow} validation={validation} editable={((_l = workflow.file) === null || _l === void 0 ? void 0 : _l.editable) !== false}/>}
                </section>
                <aside className='flow__inspector'>
                    <Inspector workflow={workflow} run={run} selectedStateId={this.state.selectedKind === 'state' ? this.state.selectedId : undefined} selectedState={selectedState} selectedTransition={selectedTransition} modelProfiles={this.state.modelProfiles} gates={(run === null || run === void 0 ? void 0 : run.gates) || []} validation={validation} onUpdateState={this.updateWorkflowState} onOpenAgent={this.openAgentMarkdown} onAddBranch={this.addParallelBranch} onDeleteState={this.deleteWorkflowState} onUpdateTransition={this.updateWorkflowTransition} onDeleteTransition={this.deleteWorkflowTransition} onSaveWorkflow={this.saveWorkflowFile} onApproveGate={this.approveGate} onOpenArtifact={this.openArtifact} readOnlyRun={runReadOnly}/>
                </aside>
            </main>

            <section className='flow__ops'>
                <Kanban run={run} onOpenArtifact={this.openArtifact}/>
                <RunObservability run={run} selectedArtifactId={this.state.selectedArtifactId} onSelectArtifact={this.selectArtifact} onOpenArtifact={this.openArtifact} onDecideMemoryCandidate={this.decideMemoryCandidate} onDecideEffect={this.decideEffect} onApproveSecondRunSuggestion={this.approveSecondRunSuggestion} onDismissSecondRunSuggestion={this.dismissSecondRunSuggestion} busy={this.state.busy} readOnly={runReadOnly}/>
                <EventLog events={(run === null || run === void 0 ? void 0 : run.events) || []}/>
            </section>

            {capabilities && <footer className='flow__statusbar'>
                <CapabilityStatus capabilities={capabilities} workflow={workflow} executionMode={executionMode} executionModeMessage={executionModeMessage}/>
            </footer>}
        </div>;
        };
        FlowWidget_1.prototype.setPrompt = function (prompt) {
            this.state = __assign(__assign({}, this.state), { prompt: prompt });
            this.update();
        };
        FlowWidget_1.prototype.closeTopMenus = function () {
            if (!this.state.openMenu && !this.state.runHistoryVisible) {
                return;
            }
            this.state = __assign(__assign({}, this.state), { openMenu: undefined, runHistoryVisible: false });
            this.update();
        };
        FlowWidget_1.prototype.runMenuCommand = function (command) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            this.closeTopMenus();
                            return [4 /*yield*/, command()];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        FlowWidget_1.prototype.setSelectedTemplate = function (selectedTemplateId) {
            this.state = __assign(__assign({}, this.state), { selectedTemplateId: selectedTemplateId });
            this.update();
        };
        FlowWidget_1.prototype.setSelectedPipelinePreset = function (selectedPipelinePresetId) {
            this.state = __assign(__assign({}, this.state), { selectedPipelinePresetId: selectedPipelinePresetId });
            this.update();
        };
        FlowWidget_1.prototype.select = function (selectedKind, selectedId) {
            this.state = __assign(__assign({}, this.state), { selectedKind: selectedKind, selectedId: selectedId });
            this.update();
        };
        FlowWidget_1.prototype.replaceActiveWorkflow = function (activeWorkflow, selectedKind, selectedId) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.setActiveWorkflow(activeWorkflow, selectedKind, selectedId, true)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        FlowWidget_1.prototype.setActiveWorkflow = function (activeWorkflow, selectedKind, selectedId, pushHistory) {
            return __awaiter(this, void 0, void 0, function () {
                var snapshot, previousWorkflow, workflowUndoStack, optimisticValidation, validation, latestSnapshot, error_1;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            snapshot = this.state.snapshot;
                            if (!snapshot) {
                                return [2 /*return*/];
                            }
                            previousWorkflow = snapshot.activeWorkflow;
                            workflowUndoStack = pushHistory && previousWorkflow
                                ? pushWorkflowHistory(this.state.workflowUndoStack, {
                                    workflow: previousWorkflow,
                                    selectedKind: this.state.selectedKind,
                                    selectedId: this.state.selectedId
                                })
                                : this.state.workflowUndoStack;
                            optimisticValidation = (0, common_2.validateFlowWorkflow)(activeWorkflow);
                            this.state = __assign(__assign({}, this.state), { selectedKind: selectedKind, selectedId: selectedId, workflowUndoStack: workflowUndoStack, workflowRedoStack: pushHistory ? [] : this.state.workflowRedoStack, snapshot: __assign(__assign({}, snapshot), { workflows: snapshot.workflows.map(function (candidate) { return candidate.id === activeWorkflow.id ? activeWorkflow : candidate; }), activeWorkflow: activeWorkflow, validation: optimisticValidation }), workflowSourceText: (0, common_2.formatWorkflowSource)(activeWorkflow), workflowSourceError: undefined, workflowSavePreview: undefined, error: undefined });
                            this.update();
                            _b.label = 1;
                        case 1:
                            _b.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, this.flowService.validateWorkflow(activeWorkflow)];
                        case 2:
                            validation = _b.sent();
                            latestSnapshot = this.state.snapshot;
                            if (((_a = latestSnapshot === null || latestSnapshot === void 0 ? void 0 : latestSnapshot.activeWorkflow) === null || _a === void 0 ? void 0 : _a.id) === activeWorkflow.id) {
                                this.state = __assign(__assign({}, this.state), { snapshot: __assign(__assign({}, latestSnapshot), { validation: validation }), error: undefined });
                                this.update();
                            }
                            return [3 /*break*/, 4];
                        case 3:
                            error_1 = _b.sent();
                            this.state = __assign(__assign({}, this.state), { error: error_1 instanceof Error ? error_1.message : String(error_1) });
                            this.update();
                            return [3 /*break*/, 4];
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        FlowWidget_1.prototype.runWorkflowFromExternalPrompt = function () {
            return __awaiter(this, arguments, void 0, function (options) {
                var _this = this;
                if (options === void 0) { options = {}; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.withBusy(function () { return __awaiter(_this, void 0, void 0, function () {
                                var workspaceRootUri, _a, prompt, workflow, _b, activeRun;
                                var _c;
                                return __generator(this, function (_d) {
                                    switch (_d.label) {
                                        case 0:
                                            _a = options.workspaceRootUri;
                                            if (_a) return [3 /*break*/, 2];
                                            return [4 /*yield*/, this.workspaceRootUri()];
                                        case 1:
                                            _a = (_d.sent());
                                            _d.label = 2;
                                        case 2:
                                            workspaceRootUri = _a;
                                            prompt = externalPromptText(options) || this.state.prompt;
                                            if (!options.workflowId) return [3 /*break*/, 4];
                                            return [4 /*yield*/, this.flowService.getWorkflow({ workspaceRootUri: workspaceRootUri, workflowId: options.workflowId })];
                                        case 3:
                                            _b = _d.sent();
                                            return [3 /*break*/, 5];
                                        case 4:
                                            _b = (_c = this.state.snapshot) === null || _c === void 0 ? void 0 : _c.activeWorkflow;
                                            _d.label = 5;
                                        case 5:
                                            workflow = _b;
                                            if (!workflow) {
                                                throw new Error('No Flow workflow is selected.');
                                            }
                                            return [4 /*yield*/, this.flowService.startRun({
                                                    workspaceRootUri: workspaceRootUri,
                                                    workflowId: workflow.id,
                                                    prompt: prompt
                                                })];
                                        case 6:
                                            activeRun = _d.sent();
                                            return [4 /*yield*/, this.applyExternalRunState(workspaceRootUri, workflow.id, activeRun, prompt)];
                                        case 7:
                                            _d.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); }, function (error) { return classifyExecutionModeFromError(error); })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        FlowWidget_1.prototype.runDynamicWorkflowFromExternalPrompt = function () {
            return __awaiter(this, arguments, void 0, function (options) {
                var _this = this;
                if (options === void 0) { options = {}; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.withBusy(function () { return __awaiter(_this, void 0, void 0, function () {
                                var workspaceRootUri, _a, prompt, activeRun;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0:
                                            _a = options.workspaceRootUri;
                                            if (_a) return [3 /*break*/, 2];
                                            return [4 /*yield*/, this.workspaceRootUri()];
                                        case 1:
                                            _a = (_b.sent());
                                            _b.label = 2;
                                        case 2:
                                            workspaceRootUri = _a;
                                            prompt = externalPromptText(options) || this.state.prompt;
                                            return [4 /*yield*/, this.flowService.runDynamicWorkflow({
                                                    workspaceRootUri: workspaceRootUri,
                                                    prompt: prompt,
                                                    preferSaved: options.preferSaved !== false,
                                                    parameters: options.parameters,
                                                    roleOverrides: options.roleOverrides,
                                                    authoringDraft: options.authoringDraft || options.draft
                                                })];
                                        case 3:
                                            activeRun = _b.sent();
                                            return [4 /*yield*/, this.applyExternalRunState(workspaceRootUri, activeRun.workflowId, activeRun, prompt)];
                                        case 4:
                                            _b.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); }, function (error) { return classifyExecutionModeFromError(error); })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        FlowWidget_1.prototype.applyExternalRunState = function (workspaceRootUri, workflowId, activeRun, prompt) {
            return __awaiter(this, void 0, void 0, function () {
                var activeWorkflow, workflows, validation, previousSnapshot, capabilities, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.flowService.getWorkflow({ workspaceRootUri: workspaceRootUri, workflowId: workflowId })];
                        case 1:
                            activeWorkflow = _b.sent();
                            return [4 /*yield*/, this.flowService.listWorkflows({ workspaceRootUri: workspaceRootUri })];
                        case 2:
                            workflows = _b.sent();
                            return [4 /*yield*/, this.flowService.validateWorkflow(activeWorkflow)];
                        case 3:
                            validation = _b.sent();
                            previousSnapshot = this.state.snapshot;
                            _a = (previousSnapshot === null || previousSnapshot === void 0 ? void 0 : previousSnapshot.capabilities);
                            if (_a) return [3 /*break*/, 5];
                            return [4 /*yield*/, this.flowService.getCapabilities()];
                        case 4:
                            _a = (_b.sent());
                            _b.label = 5;
                        case 5:
                            capabilities = _a;
                            this.state = __assign(__assign({}, this.state), { prompt: prompt, snapshot: {
                                    workflows: workflows,
                                    activeWorkflow: activeWorkflow,
                                    activeRun: activeRun,
                                    capabilities: capabilities,
                                    validation: validation
                                }, executionModeHint: activeRun.executionMode, executionModeHintMessage: activeRun.executionModeMessage, selectedKind: 'state', selectedId: activeRun.currentStateIds[0] || Object.keys(activeWorkflow.states)[0], workflowUndoStack: [], workflowRedoStack: [], workflowSourceText: undefined, workflowSourceError: undefined, workflowSavePreview: undefined, error: undefined });
                            return [4 /*yield*/, this.subscribeActiveRunStream(activeRun.id)];
                        case 6:
                            _b.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        FlowWidget_1.prototype.applyRunUpdate = function (run) {
            var snapshot = this.state.snapshot;
            if (!snapshot) {
                return;
            }
            var activeRun = normalizeFlowRunEvents(run);
            this.state = __assign(__assign({}, this.state), { snapshot: __assign(__assign({}, snapshot), { activeRun: activeRun }), selectedKind: activeRun.currentStateIds[0] ? 'state' : this.state.selectedKind, selectedId: activeRun.currentStateIds[0] || this.state.selectedId, selectedArtifactId: resolveSelectedArtifactId(activeRun, this.state.selectedArtifactId), error: undefined });
            this.update();
        };
        FlowWidget_1.prototype.writeWorkflowFile = function (workflow, snapshot, fallbackValidation) {
            return __awaiter(this, void 0, void 0, function () {
                var workspaceRootUri, validation, activeWorkflow, _a;
                var _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0: return [4 /*yield*/, this.workspaceRootUri()];
                        case 1:
                            workspaceRootUri = _c.sent();
                            return [4 /*yield*/, this.flowService.saveWorkflowFile({
                                    workspaceRootUri: workspaceRootUri,
                                    workflow: workflow,
                                    filePath: (_b = workflow.file) === null || _b === void 0 ? void 0 : _b.path,
                                    origin: 'save',
                                    message: 'Saved from Flow UI'
                                })];
                        case 2:
                            validation = _c.sent();
                            if (!validation.valid) return [3 /*break*/, 4];
                            return [4 /*yield*/, this.flowService.reloadWorkflow({ workspaceRootUri: workspaceRootUri, workflowId: workflow.id })];
                        case 3:
                            _a = _c.sent();
                            return [3 /*break*/, 5];
                        case 4:
                            _a = workflow;
                            _c.label = 5;
                        case 5:
                            activeWorkflow = _a;
                            this.state = __assign(__assign({}, this.state), { snapshot: __assign(__assign({}, snapshot), { workflows: snapshot.workflows.map(function (candidate) { return candidate.id === activeWorkflow.id ? activeWorkflow : candidate; }), activeWorkflow: activeWorkflow, validation: validation || fallbackValidation }), workflowUndoStack: [], workflowRedoStack: [], workflowSourceText: (0, common_2.formatWorkflowSource)(activeWorkflow), workflowSourceError: undefined, workflowSavePreview: undefined, error: undefined });
                            return [2 /*return*/];
                    }
                });
            });
        };
        FlowWidget_1.prototype.runLifecycleAction = function (action, reason) {
            return __awaiter(this, void 0, void 0, function () {
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.withBusy(function () { return __awaiter(_this, void 0, void 0, function () {
                                var snapshot, activeRun, updatedRun, _a, _b;
                                var _c;
                                var _d;
                                return __generator(this, function (_e) {
                                    switch (_e.label) {
                                        case 0:
                                            snapshot = this.state.snapshot;
                                            activeRun = (_d = this.state.snapshot) === null || _d === void 0 ? void 0 : _d.activeRun;
                                            if (!activeRun || !snapshot) {
                                                return [2 /*return*/];
                                            }
                                            _b = (_a = this.flowService)[action];
                                            _c = {};
                                            return [4 /*yield*/, this.workspaceRootUri()];
                                        case 1: return [4 /*yield*/, _b.apply(_a, [(_c.workspaceRootUri = _e.sent(),
                                                    _c.runId = activeRun.id,
                                                    _c.reason = reason,
                                                    _c)])];
                                        case 2:
                                            updatedRun = _e.sent();
                                            this.applyRunUpdate(updatedRun);
                                            if (!(action === 'resumeRun')) return [3 /*break*/, 4];
                                            return [4 /*yield*/, this.subscribeActiveRunStream(updatedRun.id)];
                                        case 3:
                                            _e.sent();
                                            return [3 /*break*/, 6];
                                        case 4: return [4 /*yield*/, this.unsubscribeActiveRunStream()];
                                        case 5:
                                            _e.sent();
                                            _e.label = 6;
                                        case 6: return [2 /*return*/];
                                    }
                                });
                            }); })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        FlowWidget_1.prototype.withBusy = function (task, onError) {
            return __awaiter(this, void 0, void 0, function () {
                var error_2, hint;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            this.state = __assign(__assign({}, this.state), { busy: true, error: undefined, executionModeHint: undefined, executionModeHintMessage: undefined });
                            this.update();
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, 4, 5]);
                            return [4 /*yield*/, task()];
                        case 2:
                            _a.sent();
                            return [3 /*break*/, 5];
                        case 3:
                            error_2 = _a.sent();
                            hint = onError === null || onError === void 0 ? void 0 : onError(error_2);
                            this.state = __assign(__assign({}, this.state), { error: error_2 instanceof Error ? error_2.message : String(error_2), executionModeHint: hint === null || hint === void 0 ? void 0 : hint.executionModeHint, executionModeHintMessage: hint === null || hint === void 0 ? void 0 : hint.executionModeHintMessage });
                            return [3 /*break*/, 5];
                        case 4:
                            this.state = __assign(__assign({}, this.state), { busy: false });
                            this.update();
                            return [7 /*endfinally*/];
                        case 5: return [2 /*return*/];
                    }
                });
            });
        };
        FlowWidget_1.prototype.workspaceRootUri = function () {
            return __awaiter(this, void 0, void 0, function () {
                var roots;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.workspaceService.roots];
                        case 1:
                            roots = _b.sent();
                            return [2 /*return*/, (_a = roots[0]) === null || _a === void 0 ? void 0 : _a.resource.toString()];
                    }
                });
            });
        };
        FlowWidget_1.prototype.subscribeActiveRunStream = function (runId) {
            return __awaiter(this, void 0, void 0, function () {
                var workspaceRootUri, activeRun, snapshot;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            if (!runId || this.activeRunStreamId === runId) {
                                return [2 /*return*/];
                            }
                            return [4 /*yield*/, this.unsubscribeActiveRunStream()];
                        case 1:
                            _b.sent();
                            this.activeRunStreamId = runId;
                            return [4 /*yield*/, this.workspaceRootUri()];
                        case 2:
                            workspaceRootUri = _b.sent();
                            return [4 /*yield*/, this.flowService.subscribeRunEvents({ workspaceRootUri: workspaceRootUri, runId: runId, intervalMs: 1500 })];
                        case 3:
                            activeRun = _b.sent();
                            snapshot = this.state.snapshot;
                            if (((_a = snapshot === null || snapshot === void 0 ? void 0 : snapshot.activeRun) === null || _a === void 0 ? void 0 : _a.id) === activeRun.id) {
                                this.applyRunUpdate(activeRun);
                            }
                            return [2 /*return*/];
                    }
                });
            });
        };
        FlowWidget_1.prototype.unsubscribeActiveRunStream = function () {
            return __awaiter(this, void 0, void 0, function () {
                var runId, _a, _b;
                var _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            runId = this.activeRunStreamId;
                            if (!runId) {
                                return [2 /*return*/];
                            }
                            this.activeRunStreamId = undefined;
                            _b = (_a = this.flowService).unsubscribeRunEvents;
                            _c = {};
                            return [4 /*yield*/, this.workspaceRootUri()];
                        case 1: return [4 /*yield*/, _b.apply(_a, [(_c.workspaceRootUri = _d.sent(),
                                    _c.runId = runId,
                                    _c)])];
                        case 2:
                            _d.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        return FlowWidget_1;
    }(_classSuper));
    __setFunctionName(_classThis, "FlowWidget");
    (function () {
        var _a;
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create((_a = _classSuper[Symbol.metadata]) !== null && _a !== void 0 ? _a : null) : void 0;
        _flowService_decorators = [(0, inversify_1.inject)(common_2.FlowService)];
        _flowClient_decorators = [(0, inversify_1.inject)(common_2.FlowClient)];
        _workspaceService_decorators = [(0, inversify_1.inject)(browser_2.WorkspaceService)];
        _openerService_decorators = [(0, inversify_1.inject)(browser_1.OpenerService)];
        _init_decorators = [(0, inversify_1.postConstruct)()];
        __esDecorate(_classThis, null, _init_decorators, { kind: "method", name: "init", static: false, private: false, access: { has: function (obj) { return "init" in obj; }, get: function (obj) { return obj.init; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, null, _flowService_decorators, { kind: "field", name: "flowService", static: false, private: false, access: { has: function (obj) { return "flowService" in obj; }, get: function (obj) { return obj.flowService; }, set: function (obj, value) { obj.flowService = value; } }, metadata: _metadata }, _flowService_initializers, _flowService_extraInitializers);
        __esDecorate(null, null, _flowClient_decorators, { kind: "field", name: "flowClient", static: false, private: false, access: { has: function (obj) { return "flowClient" in obj; }, get: function (obj) { return obj.flowClient; }, set: function (obj, value) { obj.flowClient = value; } }, metadata: _metadata }, _flowClient_initializers, _flowClient_extraInitializers);
        __esDecorate(null, null, _workspaceService_decorators, { kind: "field", name: "workspaceService", static: false, private: false, access: { has: function (obj) { return "workspaceService" in obj; }, get: function (obj) { return obj.workspaceService; }, set: function (obj, value) { obj.workspaceService = value; } }, metadata: _metadata }, _workspaceService_initializers, _workspaceService_extraInitializers);
        __esDecorate(null, null, _openerService_decorators, { kind: "field", name: "openerService", static: false, private: false, access: { has: function (obj) { return "openerService" in obj; }, get: function (obj) { return obj.openerService; }, set: function (obj, value) { obj.openerService = value; } }, metadata: _metadata }, _openerService_initializers, _openerService_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        FlowWidget = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
    })();
    _classThis.ID = 'flow.widget';
    _classThis.LABEL = 'Flow';
    (function () {
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return FlowWidget = _classThis;
}();
exports.FlowWidget = FlowWidget;
function AgentLibrary(props) {
    var query = props.search.trim().toLowerCase();
    var agents = query
        ? props.agents.filter(function (agent) { return agent.relativePath.toLowerCase().includes(query); })
        : props.agents;
    return <section className='flow__agent-library' aria-label='Agent Markdown library'>
        <div className='flow__agent-library-header'>
            <div>
                <h3>Agentes Markdown</h3>
                <span>{agents.length} de {props.agents.length}</span>
            </div>
            <button title='Create agent Markdown' onClick={props.onCreate} disabled={props.busy}>
                <i className='codicon codicon-add'/> Novo
            </button>
        </div>
        <div className='flow__agent-library-search'>
            <i className='codicon codicon-search'/>
            <input value={props.search} onChange={function (event) { return props.onSearch(event.currentTarget.value); }} placeholder='Buscar por caminho' aria-label='Buscar agentes Markdown'/>
        </div>
        <div className='flow__agent-library-list'>
            {agents.length === 0 && <p>Nenhum agente Markdown encontrado.</p>}
            {agents.map(function (agent) { return <article key={agent.relativePath} className='flow__agent-library-item'>
                <button className='flow__agent-library-open' title='Open agent Markdown' onClick={function () { return props.onOpen(agent.relativePath); }} disabled={props.busy}>
                    <i className='codicon codicon-file-code'/>
                    <span>{agent.relativePath}</span>
                </button>
                <time dateTime={agent.updatedAt}>{formatTimestamp(agent.updatedAt)}</time>
                <div>
                    <button title='Duplicate agent Markdown' onClick={function () { return props.onDuplicate(agent.relativePath); }} disabled={props.busy}>
                        <i className='codicon codicon-copy'/>
                    </button>
                    <button title='Rename agent Markdown' onClick={function () { return props.onRename(agent.relativePath); }} disabled={props.busy}>
                        <i className='codicon codicon-edit'/>
                    </button>
                </div>
            </article>; })}
        </div>
    </section>;
}
function PatternFactory(props) {
    var pattern = props.selectedPattern;
    return <section className='flow__pattern-factory' aria-label='Workflow pattern factory'>
        <div className='flow__section-heading'>
            <h4>Patterns</h4>
            <span>{props.patterns.length}</span>
        </div>
        <label className='flow__factory-field'>
            <span>Pattern</span>
            <select value={props.selectedPatternId || ''} onChange={function (event) { return props.onSelect(event.currentTarget.value); }} disabled={props.busy || props.patterns.length === 0} aria-label='Workflow pattern'>
                {props.patterns.map(function (candidate) { return <option key={candidate.id} value={candidate.id}>{candidate.name}</option>; })}
            </select>
        </label>
        {(pattern === null || pattern === void 0 ? void 0 : pattern.description) && <p className='flow__pattern-description'>{pattern.description}</p>}
        {pattern && <div className='flow__pattern-fields'>
            {pattern.parameters.map(function (parameter) {
                var _a, _b;
                return <PatternParameterControl key={parameter.id} parameter={parameter} value={(_b = (_a = props.parameters[parameter.id]) !== null && _a !== void 0 ? _a : parameter.defaultValue) !== null && _b !== void 0 ? _b : ''} modelProfiles={props.modelProfiles} disabled={props.busy} onUpdate={function (value) { return props.onUpdateParameter(parameter.id, value); }}/>;
            })}
        </div>}
        {(pattern === null || pattern === void 0 ? void 0 : pattern.agenticStages) && pattern.agenticStages.length > 0 && <PatternRoleOverridesEditor pattern={pattern} parameters={props.parameters} roleOverrides={props.roleOverrides} modelProfiles={props.modelProfiles} disabled={props.busy} onUpdateRoleOverride={props.onUpdateRoleOverride}/>}
        <div className='flow__menu-row'>
            <button title='Create editable workflow from pattern' onClick={props.onCreate} disabled={props.busy || !pattern}>
                <i className='codicon codicon-add'/> Criar flow
            </button>
            <button title='Create and start workflow from the current prompt' onClick={props.onRun} disabled={props.busy || !pattern}>
                <i className='codicon codicon-run'/> Rodar agora
            </button>
        </div>
    </section>;
}
function PatternParameterControl(props) {
    var parameter = props.parameter;
    if (parameter.type === 'number') {
        return <label className='flow__factory-field'>
            <span>{parameter.label}</span>
            <input type='number' min={parameter.min} max={parameter.max} value={typeof props.value === 'number' ? props.value : Number(props.value || parameter.defaultValue || 0)} disabled={props.disabled} title={parameter.description} onChange={function (event) { var _a; return props.onUpdate((_a = numberOrUndefined(event.currentTarget.value)) !== null && _a !== void 0 ? _a : Number(parameter.defaultValue || 0)); }}/>
        </label>;
    }
    if (parameter.type === 'boolean') {
        return <label className='flow__factory-toggle'>
            <input type='checkbox' checked={Boolean(props.value)} disabled={props.disabled} title={parameter.description} onChange={function (event) { return props.onUpdate(event.currentTarget.checked); }}/>
            <span>{parameter.label}</span>
        </label>;
    }
    if (parameter.type === 'model_profile') {
        var options = props.modelProfiles.length
            ? props.modelProfiles.map(function (profile) { return ({ value: profile.id, label: profile.name }); })
            : (parameter.options || []).map(function (option) { return ({ value: String(option.value), label: option.label }); });
        return <label className='flow__factory-field'>
            <span>{parameter.label}</span>
            <select value={String(props.value || parameter.defaultValue || '')} disabled={props.disabled} title={parameter.description} onChange={function (event) { return props.onUpdate(event.currentTarget.value); }}>
                {options.map(function (option) { return <option key={option.value} value={option.value}>{option.label}</option>; })}
            </select>
        </label>;
    }
    if (parameter.type === 'select' || parameter.type === 'reasoning_mode') {
        return <label className='flow__factory-field'>
            <span>{parameter.label}</span>
            <select value={String(props.value || parameter.defaultValue || '')} disabled={props.disabled} title={parameter.description} onChange={function (event) { return props.onUpdate(event.currentTarget.value); }}>
                {(parameter.options || []).map(function (option) { return <option key={String(option.value)} value={String(option.value)}>{option.label}</option>; })}
            </select>
        </label>;
    }
    if (parameter.type === 'markdown') {
        return <label className='flow__factory-field flow__factory-field--wide'>
            <span>{parameter.label}</span>
            <textarea rows={3} value={String(props.value || parameter.defaultValue || '')} disabled={props.disabled} title={parameter.description} onChange={function (event) { return props.onUpdate(event.currentTarget.value); }}/>
        </label>;
    }
    return <label className='flow__factory-field'>
        <span>{parameter.label}</span>
        <input value={String(props.value || parameter.defaultValue || '')} disabled={props.disabled} title={parameter.description} onChange={function (event) { return props.onUpdate(event.currentTarget.value); }}/>
    </label>;
}
function PatternRoleOverridesEditor(props) {
    var stages = props.pattern.agenticStages || [];
    return <section className='flow__pattern-stage-overrides' aria-label='Agentic stage model settings'>
        <div className='flow__section-heading'>
            <h4>Agentic stages</h4>
            <span>{stages.length}</span>
        </div>
        <div className='flow__pattern-stage-grid'>
            <div className='flow__pattern-stage-header'>Stage</div>
            <div className='flow__pattern-stage-header'>Profile</div>
            <div className='flow__pattern-stage-header'>Provider</div>
            <div className='flow__pattern-stage-header'>Model</div>
            <div className='flow__pattern-stage-header'>Policy</div>
            <div className='flow__pattern-stage-header'>Native</div>
            <div className='flow__pattern-stage-header'>Virtual</div>
            {stages.map(function (stage) { return <PatternRoleOverrideRow key={stage.id} stage={stage} defaultProfileId={patternStageDefaultProfileId(props.pattern, props.parameters, stage)} override={props.roleOverrides[stage.id]} modelProfiles={props.modelProfiles} disabled={props.disabled} onUpdate={function (override) { return props.onUpdateRoleOverride(stage.id, override); }}/>; })}
        </div>
    </section>;
}
function PatternRoleOverrideRow(props) {
    var _a, _b, _c, _d;
    var override = props.override || {};
    var execution = override.modelExecution || {};
    var profileOptions = props.modelProfiles.length ? props.modelProfiles : [];
    var currentProfileId = override.profileId || execution.profileId || '';
    var currentModelId = ((_a = override.provider) === null || _a === void 0 ? void 0 : _a.modelId) || '';
    var modelOptions = uniqueStrings(__spreadArray(__spreadArray([
        ''
    ], props.modelProfiles.map(function (profile) { var _a; return (_a = profile.provider) === null || _a === void 0 ? void 0 : _a.modelId; }).filter(function (value) { return Boolean(value); }), true), [
        currentModelId
    ], false));
    var updateOverride = function (patch) {
        return props.onUpdate(patternRoleOverrideOrUndefined(__assign(__assign({}, override), patch)));
    };
    var updateExecution = function (patch) {
        return updateOverride({ modelExecution: modelExecutionOrUndefined(__assign(__assign({}, execution), patch)) });
    };
    var updateNativeEffort = function (effort) {
        if (effort === 'inherit') {
            var next = __assign({}, (execution.nativeReasoning || {}));
            delete next.effort;
            delete next.enabled;
            updateExecution({ nativeReasoning: Object.keys(next).length > 0 ? next : undefined });
            return;
        }
        updateExecution({
            nativeReasoning: __assign(__assign({}, (execution.nativeReasoning || {})), { enabled: effort !== 'none', effort: effort })
        });
    };
    var updateVirtualMode = function (mode) {
        if (mode === 'inherit') {
            var next = __assign({}, (execution.virtualReasoning || {}));
            delete next.mode;
            delete next.enabled;
            updateExecution({ virtualReasoning: Object.keys(next).length > 0 ? next : undefined });
            return;
        }
        updateExecution({
            virtualReasoning: __assign(__assign({}, (execution.virtualReasoning || {})), { enabled: mode !== 'off', mode: mode })
        });
    };
    return <>
        <div className='flow__pattern-stage-name'>
            <strong>{props.stage.label}</strong>
            <span>{props.stage.repeated ? "".concat(props.stage.role, " / repeated") : props.stage.role}</span>
        </div>
        <select value={currentProfileId} disabled={props.disabled} title={"Default: ".concat(props.defaultProfileId)} onChange={function (event) { return updateOverride({ profileId: event.currentTarget.value || undefined }); }}>
            <option value=''>Default: {profileLabel(props.modelProfiles, props.defaultProfileId)}</option>
            {profileOptions.map(function (profile) { return <option key={profile.id} value={profile.id}>{profile.name}</option>; })}
        </select>
        <select value={((_b = override.provider) === null || _b === void 0 ? void 0 : _b.providerId) || ''} disabled={props.disabled} onChange={function (event) {
            var _a, _b;
            return updateOverride({
                provider: providerSelectionOrUndefined(event.currentTarget.value || undefined, (_a = override.provider) === null || _a === void 0 ? void 0 : _a.modelId, (_b = override.provider) === null || _b === void 0 ? void 0 : _b.options)
            });
        }}>
            <option value=''>Default provider</option>
            <option value='theia-language-model'>Theia language model</option>
            <option value='codex-provider'>Codex provider</option>
            <option value='command'>Command provider</option>
            <option value='e2e-mock'>E2E mock</option>
        </select>
        <select value={currentModelId} disabled={props.disabled} onChange={function (event) {
            var _a, _b;
            return updateOverride({
                provider: providerSelectionOrUndefined((_a = override.provider) === null || _a === void 0 ? void 0 : _a.providerId, event.currentTarget.value, (_b = override.provider) === null || _b === void 0 ? void 0 : _b.options)
            });
        }}>
            {modelOptions.map(function (modelId) { return <option key={modelId || 'default'} value={modelId}>{modelId || 'Default model'}</option>; })}
        </select>
        <select value={execution.reasoningPolicy || 'inherit'} disabled={props.disabled} onChange={function (event) { return updateExecution({
            reasoningPolicy: event.currentTarget.value === 'inherit'
                ? undefined
                : event.currentTarget.value
        }); }}>
            <option value='inherit'>Default</option>
            <option value='off'>Off</option>
            <option value='auto'>Auto</option>
            <option value='native'>Native</option>
            <option value='virtual'>Virtual</option>
            <option value='native_plus_virtual_light'>Native + light virtual</option>
        </select>
        <select value={((_c = execution.nativeReasoning) === null || _c === void 0 ? void 0 : _c.effort) || 'inherit'} disabled={props.disabled} onChange={function (event) { return updateNativeEffort(event.currentTarget.value); }}>
            <option value='inherit'>Default</option>
            <option value='none'>None</option>
            <option value='low'>Low</option>
            <option value='medium'>Medium</option>
            <option value='high'>High</option>
        </select>
        <select value={((_d = execution.virtualReasoning) === null || _d === void 0 ? void 0 : _d.mode) || 'inherit'} disabled={props.disabled} onChange={function (event) { return updateVirtualMode(event.currentTarget.value); }}>
            <option value='inherit'>Default</option>
            <option value='off'>Off</option>
            <option value='auto'>Auto</option>
            <option value='fast'>Fast</option>
            <option value='balanced'>Balanced</option>
            <option value='deep'>Deep</option>
            <option value='coding'>Coding</option>
        </select>
    </>;
}
function WorkflowCanvas(props) {
    var _this = this;
    var _a = React.useState({ x: 16, y: 16, zoom: 1 }), viewport = _a[0], setViewport = _a[1];
    var _b = React.useState({ width: 0, height: 0 }), viewportSize = _b[0], setViewportSize = _b[1];
    var _c = React.useState(), drag = _c[0], setDrag = _c[1];
    var _d = React.useState({}), layoutOverrides = _d[0], setLayoutOverrides = _d[1];
    var _e = React.useState(), connectionSource = _e[0], setConnectionSource = _e[1];
    var _f = React.useState(), connectionTarget = _f[0], setConnectionTarget = _f[1];
    var canvasRef = React.useRef(null);
    var positionedNodes = props.nodes.map(function (node) { return (__assign(__assign({}, node), (layoutOverrides[node.id] || {}))); });
    var nodeById = new Map(positionedNodes.map(function (node) { return [node.id, node]; }));
    var edges = props.edges.map(function (edge) {
        var from = nodeById.get(edge.from);
        var to = nodeById.get(edge.to);
        return __assign(__assign({}, edge), { points: from && to ? [
                { x: from.x + from.width, y: from.y + from.height / 2 },
                { x: to.x, y: to.y + to.height / 2 }
            ] : edge.points });
    });
    var width = Math.max.apply(Math, __spreadArray([props.width], positionedNodes.map(function (node) { return node.x + node.width + 32; }), false));
    var height = Math.max.apply(Math, __spreadArray([props.height], positionedNodes.map(function (node) { return node.y + node.height + 32; }), false));
    var zoomPercent = Math.round(viewport.zoom * 100);
    var canvasIssues = props.validation ? __spreadArray(__spreadArray([], props.validation.errors, true), props.validation.warnings, true) : [];
    React.useEffect(function () {
        var element = canvasRef.current;
        if (!element) {
            return;
        }
        var updateSize = function () { return setViewportSize({ width: element.clientWidth, height: element.clientHeight }); };
        updateSize();
        var resizeObserver = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(updateSize);
        resizeObserver === null || resizeObserver === void 0 ? void 0 : resizeObserver.observe(element);
        window.addEventListener('resize', updateSize);
        return function () {
            resizeObserver === null || resizeObserver === void 0 ? void 0 : resizeObserver.disconnect();
            window.removeEventListener('resize', updateSize);
        };
    }, []);
    var fitView = React.useCallback(function () {
        var availableWidth = Math.max(1, viewportSize.width - 48);
        var availableHeight = Math.max(1, viewportSize.height - 48);
        var nextZoom = clamp(Math.min(availableWidth / width, availableHeight / height), 0.5, 1.8);
        setViewport({
            x: Math.round((viewportSize.width - width * nextZoom) / 2),
            y: Math.round((viewportSize.height - height * nextZoom) / 2),
            zoom: nextZoom
        });
    }, [height, viewportSize.height, viewportSize.width, width]);
    var updateZoom = function (delta) {
        setViewport(function (current) {
            var zoom = clamp(current.zoom + delta, 0.5, 1.8);
            var centerX = viewportSize.width / 2;
            var centerY = viewportSize.height / 2;
            var worldX = (centerX - current.x) / current.zoom;
            var worldY = (centerY - current.y) / current.zoom;
            return {
                x: centerX - worldX * zoom,
                y: centerY - worldY * zoom,
                zoom: zoom
            };
        });
    };
    var resetView = function () {
        setViewport({ x: 16, y: 16, zoom: 1 });
        setLayoutOverrides({});
    };
    var onPaletteDragStart = function (event, stateType) {
        if (!props.editable) {
            event.preventDefault();
            return;
        }
        event.dataTransfer.effectAllowed = 'copy';
        event.dataTransfer.setData('application/x-flow-state-type', stateType);
        event.dataTransfer.setData('text/plain', stateType);
    };
    var onDropNewState = function (event) { return __awaiter(_this, void 0, void 0, function () {
        var stateType, rect, worldX, worldY, stateId;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    stateType = event.dataTransfer.getData('application/x-flow-state-type');
                    if (!props.editable || !stateType || !AGENCY_CANVAS_STATE_TYPES.includes(stateType)) {
                        return [2 /*return*/];
                    }
                    event.preventDefault();
                    rect = (_a = canvasRef.current) === null || _a === void 0 ? void 0 : _a.getBoundingClientRect();
                    worldX = rect ? (event.clientX - rect.left - viewport.x) / viewport.zoom : 0;
                    worldY = rect ? (event.clientY - rect.top - viewport.y) / viewport.zoom : 0;
                    return [4 /*yield*/, props.onAddState(stateType)];
                case 1:
                    stateId = _b.sent();
                    if (stateId) {
                        setLayoutOverrides(function (current) {
                            var _a;
                            return (__assign(__assign({}, current), (_a = {}, _a[stateId] = {
                                x: Math.max(0, worldX - 118),
                                y: Math.max(0, worldY - 48)
                            }, _a)));
                        });
                    }
                    return [2 /*return*/];
            }
        });
    }); };
    var onDragOverNewState = function (event) {
        if (event.dataTransfer.types.includes('application/x-flow-state-type')) {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'copy';
        }
    };
    var onWheel = function (event) {
        if (!event.ctrlKey && !event.metaKey) {
            setViewport(function (current) { return (__assign(__assign({}, current), { x: current.x - event.deltaX, y: current.y - event.deltaY })); });
            return;
        }
        event.preventDefault();
        updateZoom(event.deltaY > 0 ? -0.1 : 0.1);
    };
    var selectRelativeNode = function (offset) {
        if (positionedNodes.length === 0) {
            return;
        }
        var selectedIndex = positionedNodes.findIndex(function (node) { return node.id === props.selectedId; });
        var nextIndex = selectedIndex < 0 ? 0 : (selectedIndex + offset + positionedNodes.length) % positionedNodes.length;
        props.onSelectState(positionedNodes[nextIndex].id);
    };
    var onKeyDown = function (event) {
        var panStep = event.shiftKey ? 80 : 32;
        if (event.key === 'Escape' && connectionSource) {
            event.preventDefault();
            setConnectionSource(undefined);
            setConnectionTarget(undefined);
        }
        else if (event.key === 'ArrowRight' && event.altKey) {
            event.preventDefault();
            selectRelativeNode(1);
        }
        else if (event.key === 'ArrowLeft' && event.altKey) {
            event.preventDefault();
            selectRelativeNode(-1);
        }
        else if (event.key === 'ArrowRight') {
            event.preventDefault();
            setViewport(function (current) { return (__assign(__assign({}, current), { x: current.x - panStep })); });
        }
        else if (event.key === 'ArrowLeft') {
            event.preventDefault();
            setViewport(function (current) { return (__assign(__assign({}, current), { x: current.x + panStep })); });
        }
        else if (event.key === 'ArrowDown') {
            event.preventDefault();
            setViewport(function (current) { return (__assign(__assign({}, current), { y: current.y - panStep })); });
        }
        else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setViewport(function (current) { return (__assign(__assign({}, current), { y: current.y + panStep })); });
        }
        else if (event.key === '+' || event.key === '=') {
            event.preventDefault();
            updateZoom(0.1);
        }
        else if (event.key === '-') {
            event.preventDefault();
            updateZoom(-0.1);
        }
        else if (event.key === '0') {
            event.preventDefault();
            resetView();
        }
        else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !event.shiftKey) {
            event.preventDefault();
            if (props.editable) {
                props.onUndo();
            }
        }
        else if ((event.ctrlKey || event.metaKey) && (event.key.toLowerCase() === 'y' || (event.key.toLowerCase() === 'z' && event.shiftKey))) {
            event.preventDefault();
            if (props.editable) {
                props.onRedo();
            }
        }
        else if (event.key.toLowerCase() === 'f') {
            event.preventDefault();
            fitView();
        }
        else if ((event.key === 'Delete' || event.key === 'Backspace') && props.selectedId) {
            event.preventDefault();
            if (!props.editable) {
                return;
            }
            if (props.nodes.some(function (node) { return node.id === props.selectedId; })) {
                props.onDeleteState(props.selectedId);
            }
            else if (props.edges.some(function (edge) { return edge.id === props.selectedId; })) {
                props.onDeleteTransition(props.selectedId);
            }
        }
    };
    var startPan = function (event) {
        if (event.button !== 0 || event.target.closest('.flow__flow-node')) {
            return;
        }
        if (connectionSource) {
            setConnectionSource(undefined);
            setConnectionTarget(undefined);
            return;
        }
        event.currentTarget.setPointerCapture(event.pointerId);
        setDrag({ kind: 'pan', pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: viewport.x, originY: viewport.y });
    };
    var startNodeDrag = function (event, node) {
        if (!props.editable) {
            props.onSelectState(node.id);
            return;
        }
        if (connectionSource) {
            event.stopPropagation();
            return;
        }
        if (event.button !== 0 || event.target.closest('.flow__flow-node-link-handle')) {
            return;
        }
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        props.onSelectState(node.id);
        setDrag({ kind: 'node', pointerId: event.pointerId, nodeId: node.id, startX: event.clientX, startY: event.clientY, originX: node.x, originY: node.y });
    };
    var pointFromPointer = function (event) {
        var _a;
        var rect = (_a = canvasRef.current) === null || _a === void 0 ? void 0 : _a.getBoundingClientRect();
        if (!rect) {
            return undefined;
        }
        return {
            x: (event.clientX - rect.left - viewport.x) / viewport.zoom,
            y: (event.clientY - rect.top - viewport.y) / viewport.zoom
        };
    };
    var startConnectionFromNode = function (nodeId) {
        setConnectionSource(nodeId);
        var node = nodeById.get(nodeId);
        setConnectionTarget(node ? { x: node.x + node.width, y: node.y + node.height / 2 } : undefined);
        props.onSelectState(nodeId);
    };
    var addConnectionToNode = function (nodeId) { return __awaiter(_this, void 0, void 0, function () {
        var transitionId;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!connectionSource) {
                        return [2 /*return*/];
                    }
                    if (connectionSource === nodeId) {
                        setConnectionSource(undefined);
                        setConnectionTarget(undefined);
                        props.onSelectState(nodeId);
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, props.onAddTransition(connectionSource, nodeId)];
                case 1:
                    transitionId = _a.sent();
                    setConnectionSource(undefined);
                    setConnectionTarget(undefined);
                    if (transitionId) {
                        props.onSelectTransition(transitionId);
                    }
                    return [2 /*return*/];
            }
        });
    }); };
    var onOutputConnectorClick = function (event, nodeId) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    event.preventDefault();
                    event.stopPropagation();
                    if (!props.editable) {
                        props.onSelectState(nodeId);
                        return [2 /*return*/];
                    }
                    if (!connectionSource) {
                        startConnectionFromNode(nodeId);
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, addConnectionToNode(nodeId)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); };
    var onInputConnectorClick = function (event, nodeId) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    event.preventDefault();
                    event.stopPropagation();
                    if (!props.editable || !connectionSource) {
                        props.onSelectState(nodeId);
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, addConnectionToNode(nodeId)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); };
    var onNodeClick = function (event, nodeId) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    event.stopPropagation();
                    if (!(connectionSource && props.editable)) return [3 /*break*/, 2];
                    return [4 /*yield*/, addConnectionToNode(nodeId)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
                case 2:
                    props.onSelectState(nodeId);
                    return [2 /*return*/];
            }
        });
    }); };
    var onPointerMove = function (event) {
        if (connectionSource && !drag) {
            setConnectionTarget(pointFromPointer(event));
        }
        if (!drag || drag.pointerId !== event.pointerId) {
            return;
        }
        var dx = event.clientX - drag.startX;
        var dy = event.clientY - drag.startY;
        if (drag.kind === 'pan') {
            setViewport(function (current) { return (__assign(__assign({}, current), { x: drag.originX + dx, y: drag.originY + dy })); });
            return;
        }
        setLayoutOverrides(function (current) {
            var _a;
            return (__assign(__assign({}, current), (_a = {}, _a[drag.nodeId] = {
                x: Math.max(0, drag.originX + dx / viewport.zoom),
                y: Math.max(0, drag.originY + dy / viewport.zoom)
            }, _a)));
        });
    };
    var finishPointerDrag = function (event) { return __awaiter(_this, void 0, void 0, function () {
        var completedDrag, positionedNode;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!drag || drag.pointerId !== event.pointerId) {
                        return [2 /*return*/];
                    }
                    completedDrag = drag;
                    setDrag(undefined);
                    if (completedDrag.kind !== 'node' || !props.editable) {
                        return [2 /*return*/];
                    }
                    positionedNode = positionedNodes.find(function (node) { return node.id === completedDrag.nodeId; });
                    if (!positionedNode) return [3 /*break*/, 2];
                    return [4 /*yield*/, props.onMoveState(completedDrag.nodeId, { x: positionedNode.x, y: positionedNode.y })];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2: return [2 /*return*/];
            }
        });
    }); };
    var connectionPreviewEdge = connectionSource && connectionTarget && nodeById.get(connectionSource)
        ? {
            id: 'flow-connection-preview',
            from: connectionSource,
            to: '',
            event: '',
            guardSummary: undefined,
            points: [
                {
                    x: nodeById.get(connectionSource).x + nodeById.get(connectionSource).width,
                    y: nodeById.get(connectionSource).y + nodeById.get(connectionSource).height / 2
                },
                connectionTarget
            ]
        }
        : undefined;
    return <div className='flow__flow' role='application' aria-label={"".concat(props.workflow.name, " workflow canvas")} tabIndex={0} onKeyDown={onKeyDown}>
        <header className='flow__flow-header'>
            <div>
                <h3>Canvas</h3>
                <span>{props.nodes.length} blocos / {props.edges.length} ligacoes</span>
            </div>
            <span>{props.selectedId ? "Selecionado: ".concat(props.selectedId) : 'Nada selecionado'}</span>
        </header>
        <div className='flow__flow-stage'>
        <div className='flow__flow-toolbar' aria-label='Canvas controls'>
            <button title='Zoom out' onClick={function () { return updateZoom(-0.1); }}><i className='codicon codicon-zoom-out'/></button>
            <span>{zoomPercent}%</span>
            <button title='Zoom in' onClick={function () { return updateZoom(0.1); }}><i className='codicon codicon-zoom-in'/></button>
            <button title='Fit view' onClick={fitView}><i className='codicon codicon-screen-full'/></button>
            <button title='Reset canvas view' onClick={resetView}><i className='codicon codicon-discard'/></button>
            <button title='Undo local workflow edit' disabled={!props.canUndo} onClick={props.onUndo}><i className='codicon codicon-arrow-left'/></button>
            <button title='Redo local workflow edit' disabled={!props.canRedo} onClick={props.onRedo}><i className='codicon codicon-redo'/></button>
            <button title='Delete selected state or transition' disabled={!props.selectedId || !props.editable} onClick={function () {
            if (!props.selectedId) {
                return;
            }
            if (props.nodes.some(function (node) { return node.id === props.selectedId; })) {
                props.onDeleteState(props.selectedId);
            }
            else {
                props.onDeleteTransition(props.selectedId);
            }
        }}>
                <i className='codicon codicon-trash'/>
            </button>
        </div>
        <div className='flow__flow-palette' aria-label='New workflow states'>
            <span className='flow__flow-palette-title'>Blocos</span>
            {AGENCY_CANVAS_STATE_TYPES.map(function (stateType) { return <button key={stateType} draggable={props.editable} disabled={!props.editable} title={"Drag to add ".concat(stateType, " state")} onDragStart={function (event) { return onPaletteDragStart(event, stateType); }} onClick={function () { return props.editable ? props.onAddState(stateType) : undefined; }}>
                <i className={"codicon ".concat(stateTypeIcon(stateType))}/>
                <span>{stateTypeLabel(stateType)}</span>
            </button>; })}
        </div>
        <div className={"flow__flow-viewport ".concat(connectionSource ? 'flow__flow-viewport--connecting' : '')} ref={canvasRef} onPointerDown={startPan} onPointerMove={onPointerMove} onPointerUp={finishPointerDrag} onPointerCancel={finishPointerDrag} onWheel={onWheel} onDragOver={onDragOverNewState} onDrop={onDropNewState} onPointerLeave={function () { return connectionSource ? setConnectionTarget(undefined) : undefined; }} aria-label='Workflow viewport. Drag empty space to pan, use Control plus mouse wheel to zoom, Alt plus left or right arrow to move selection.'>
            <div className='flow__flow-world' style={{ width: width, height: height, transform: "translate(".concat(viewport.x, "px, ").concat(viewport.y, "px) scale(").concat(viewport.zoom, ")") }}>
                <svg className='flow__flow-edges' width={width} height={height}>
                    <defs>
                        <marker id='flow-flow-arrow' markerWidth='10' markerHeight='8' refX='9' refY='4' orient='auto'>
                            <path d='M 0 0 L 10 4 L 0 8 z'/>
                        </marker>
                    </defs>
                    {edges.map(function (edge) {
            var issueSeverity = validationIssueSeverity(canvasIssues.filter(function (issue) { var _a; return ((_a = validationIssueTarget(props.workflow, issue)) === null || _a === void 0 ? void 0 : _a.id) === edge.id; }));
            return <g key={edge.id} className={"flow__flow-edge ".concat(props.selectedId === edge.id ? 'flow__flow-edge--selected' : '', " ").concat(issueSeverity ? "flow__flow-edge--".concat(issueSeverity) : '')} onClick={function () { return props.onSelectTransition(edge.id); }} onKeyDown={function (event) {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        props.onSelectTransition(edge.id);
                    }
                }} role='button' tabIndex={0} aria-label={"Transition ".concat(edge.from, " to ").concat(edge.to, " on ").concat(edge.event)}>
                        <path d={edgePath(edge)} markerEnd='url(#flow-flow-arrow)'/>
                        <text x={edgeMidpoint(edge, 'x')} y={edgeMidpoint(edge, 'y')}>{edge.event}</text>
                        {edge.guardSummary && <text className='flow__flow-edge-guard' x={edgeMidpoint(edge, 'x')} y={edgeMidpoint(edge, 'y') + 16}>{edge.guardSummary}</text>}
                        {issueSeverity && <text className='flow__flow-issue-marker' x={edgeMidpoint(edge, 'x')} y={edgeMidpoint(edge, 'y') + 30}>!</text>}
                    </g>;
        })}
                    {connectionPreviewEdge && <g className='flow__flow-edge flow__flow-edge--pending' aria-hidden='true'>
                        <path d={edgePath(connectionPreviewEdge)} markerEnd='url(#flow-flow-arrow)'/>
                    </g>}
                </svg>
                {positionedNodes.map(function (node) {
            var issueSeverity = validationIssueSeverity(canvasIssues.filter(function (issue) { var _a; return ((_a = validationIssueTarget(props.workflow, issue)) === null || _a === void 0 ? void 0 : _a.id) === node.id; }));
            var nodeIdentity = nodeIdentityLabel(node.agent);
            var isConnectionTarget = Boolean(connectionSource && connectionSource !== node.id);
            var connectionActionLabel = connectionSource
                ? connectionSource === node.id
                    ? "Cancel transition from ".concat(node.id)
                    : "Create transition from ".concat(connectionSource, " to ").concat(node.id)
                : undefined;
            return <div key={node.id} className={"flow__flow-node flow__flow-node--type-".concat(node.type, " flow__flow-node--").concat(node.status, " ").concat(props.selectedId === node.id ? 'flow__flow-node--selected' : '', " ").concat(connectionSource === node.id ? 'flow__flow-node--connecting' : '', " ").concat(isConnectionTarget ? 'flow__flow-node--connection-target' : '', " ").concat(issueSeverity ? "flow__flow-node--".concat(issueSeverity) : '')} style={{ left: node.x, top: node.y, width: node.width, height: node.height }} onPointerDown={function (event) { return startNodeDrag(event, node); }} onClick={function (event) { return void onNodeClick(event, node.id); }} onKeyDown={function (event) {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        if (connectionSource && props.editable) {
                            void addConnectionToNode(node.id);
                        }
                        else {
                            props.onSelectState(node.id);
                        }
                    }
                }} title={"".concat(node.id, ": ").concat(node.type)} role='button' tabIndex={0} aria-selected={props.selectedId === node.id}>
                    <button type='button' className='flow__flow-node-link-handle flow__flow-node-handle flow__flow-node-handle--input' title={connectionActionLabel || "Input connector for ".concat(node.id)} aria-label={connectionActionLabel || "Input connector for ".concat(node.id)} disabled={!props.editable} onClick={function (event) { return onInputConnectorClick(event, node.id); }}/>
                    <div className='flow__flow-node-icon' aria-hidden='true'>
                        <i className={"codicon ".concat(stateTypeIcon(node.type))}/>
                    </div>
                    <div className='flow__flow-node-body'>
                        <strong>{node.label}</strong>
                        {nodeIdentity && <span>{nodeIdentity}</span>}
                        <small>{node.status}</small>
                    </div>
                    {issueSeverity && <span className='flow__flow-node-issue' title={"".concat(issueSeverity, " validation issue")}>!</span>}
                    <button type='button' className='flow__flow-node-link-handle flow__flow-node-connector' title={connectionActionLabel || "Start transition from ".concat(node.id)} aria-label={connectionActionLabel || "Start transition from ".concat(node.id)} disabled={!props.editable} onClick={function (event) { return onOutputConnectorClick(event, node.id); }}>
                        <i className={"codicon ".concat(connectionSource ? 'codicon-debug-step-into' : 'codicon-arrow-right')}/>
                    </button>
                </div>;
        })}
            </div>
        </div>
        <CanvasMinimap nodes={positionedNodes} width={width} height={height} viewport={viewport} viewportSize={viewportSize}/>
        </div>
    </div>;
}
function WorkflowSourceEditor(props) {
    var _a, _b, _c;
    var issues = props.validation ? __spreadArray(__spreadArray([], props.validation.errors, true), props.validation.warnings, true) : [];
    var selectedPath = props.selectedId ? workflowSourcePathForSelection(props.workflow, props.selectedKind, props.selectedId) : undefined;
    var sourceFormat = (0, common_2.workflowSourceFormatLabel)(props.workflow);
    return <section className='flow__workflow-json' aria-label={"Workflow ".concat(sourceFormat, " editor")}>
        <div className='flow__workflow-json-header'>
            <h3>Workflow {sourceFormat}</h3>
            <span>{((_a = props.validation) === null || _a === void 0 ? void 0 : _a.valid) ? 'valid' : "".concat(((_b = props.validation) === null || _b === void 0 ? void 0 : _b.errors.length) || 0, " errors / ").concat(((_c = props.validation) === null || _c === void 0 ? void 0 : _c.warnings.length) || 0, " warnings")}</span>
            <button onClick={props.onApply} disabled={!props.editable || Boolean(props.parseError) || Boolean(props.validation && !props.validation.valid)} title={"Apply ".concat(sourceFormat, " to workflow")}>
                <i className='codicon codicon-check'/> Apply
            </button>
        </div>
        {selectedPath && <div className='flow__workflow-json-selection'>
            <span>Selection</span>
            <code>{selectedPath}</code>
        </div>}
        {props.parseError && <div className='flow__inline-validation flow__inline-validation--error'>
            <span>{props.parseError}</span>
        </div>}
        {issues.length > 0 && <div className='flow__workflow-json-issues'>
            {issues.map(function (issue, index) {
                var _a;
                var target = validationIssueTarget(props.workflow, issue);
                return <button key={"".concat(issue.code, "-").concat(issue.path || index)} className={"flow__workflow-json-issue flow__workflow-json-issue--".concat(((_a = props.validation) === null || _a === void 0 ? void 0 : _a.errors.includes(issue)) ? 'error' : 'warning')} onClick={function () { return props.onSelectIssue(issue); }} disabled={!target} title={target ? "Select ".concat(target.kind, " ").concat(target.id) : issue.path || issue.code}>
                    <code>{issue.path || issue.code}</code>
                    <span>{issue.message}</span>
                </button>;
            })}
        </div>}
        <textarea spellCheck={false} value={props.value} disabled={!props.editable} placeholder='Workflow schema' onChange={function (event) { return props.onChange(event.currentTarget.value); }} aria-label={"Workflow ".concat(sourceFormat, " source")}/>
    </section>;
}
function WorkflowSavePreview(props) {
    var grouped = groupWorkflowStructuralDiff(props.diff.items);
    return <section className='flow__save-preview' aria-label='Workflow structural save preview'>
        <div className='flow__save-preview-header'>
            <div>
                <h3>Structural changes before save</h3>
                <span>{props.diff.fromWorkflowId} file -&gt; {props.diff.toWorkflowId} canvas</span>
            </div>
            <div className='flow__save-preview-actions'>
                <button onClick={props.onCancel} disabled={props.busy}>
                    <i className='codicon codicon-close'/> Cancel
                </button>
                <button onClick={props.onConfirm} disabled={props.busy}>
                    <i className='codicon codicon-save'/> Save changes
                </button>
            </div>
        </div>
        {grouped.map(function (group) { return <section key={group.kind} className='flow__save-preview-group'>
            <h4>{group.kind}</h4>
            {group.items.map(function (item) { return <article key={"".concat(item.kind, "-").concat(item.change, "-").concat(item.id, "-").concat(item.summary)} className={"flow__save-preview-item flow__save-preview-item--".concat(item.change)}>
                <strong>{item.change}</strong>
                <code>{item.id}</code>
                <span>{item.summary}</span>
            </article>; })}
        </section>; })}
    </section>;
}
function Inspector(props) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    if (!props.workflow) {
        return <Panel title='Inspector'><p>No workflow loaded.</p></Panel>;
    }
    if (props.selectedTransition) {
        var transition_1 = props.selectedTransition;
        var evaluated = lastTransitionEvent(((_a = props.run) === null || _a === void 0 ? void 0 : _a.events) || [], transition_1, 'transition.evaluated');
        var fired = lastTransitionEvent(((_b = props.run) === null || _b === void 0 ? void 0 : _b.events) || [], transition_1, 'transition.fired');
        return <Panel title='Transition'>
            <KeyValue label='From' value={transition_1.from}/>
            <KeyValue label='To' value={transition_1.to}/>
            <KeyValue label='Event' value={transition_1.on}/>
            <KeyValue label='Priority' value={((_c = transition_1.priority) === null || _c === void 0 ? void 0 : _c.toString()) || 'default'}/>
            <JsonBlock title='Guard' value={transition_1.guard || {}}/>
            <TransitionEditor transitionId={transitionKey(transition_1)} transition={transition_1} stateIds={(0, common_2.flowWorkflowStateIds)(props.workflow)} editable={((_d = props.workflow.file) === null || _d === void 0 ? void 0 : _d.editable) !== false} issues={(props.validation ? __spreadArray(__spreadArray([], props.validation.errors, true), props.validation.warnings, true) : []).filter(function (issue) { var _a; return ((_a = issue.path) === null || _a === void 0 ? void 0 : _a.includes('transitions')) && (issue.message.includes(transition_1.from) || issue.message.includes(transition_1.to)); })} onUpdateTransition={props.onUpdateTransition} onDeleteTransition={props.onDeleteTransition} onSaveWorkflow={props.onSaveWorkflow}/>
            <EventSummary title='Last evaluation' event={evaluated}/>
            <EventSummary title='Last firing' event={fired}/>
            {((evaluated === null || evaluated === void 0 ? void 0 : evaluated.payload) || (fired === null || fired === void 0 ? void 0 : fired.payload)) && <JsonBlock title='Guard payload / reason' value={{
                    evaluated: evaluated === null || evaluated === void 0 ? void 0 : evaluated.payload,
                    fired: fired === null || fired === void 0 ? void 0 : fired.payload
                }}/>}
        </Panel>;
    }
    var state = props.selectedState;
    if (!state || !props.selectedStateId) {
        return <Panel title='Inspector'><p>Select a state or transition.</p></Panel>;
    }
    var selectedStateId = props.selectedStateId;
    var stateGates = props.gates.filter(function (gate) { return gate.stateId === selectedStateId; });
    var stateWorkloads = ((_e = props.run) === null || _e === void 0 ? void 0 : _e.workloads.filter(function (workload) { return workload.stateId === selectedStateId; })) || [];
    var artifacts = ((_f = props.run) === null || _f === void 0 ? void 0 : _f.artifacts.filter(function (artifact) { return artifact.stateId === selectedStateId; })) || [];
    var effects = ((_g = props.run) === null || _g === void 0 ? void 0 : _g.effects.filter(function (effect) { return effect.stateId === selectedStateId; })) || [];
    var signals = ((_h = props.run) === null || _h === void 0 ? void 0 : _h.signals.filter(function (signal) { return signal.stateId === selectedStateId; })) || [];
    var events = relevantStateEvents(((_j = props.run) === null || _j === void 0 ? void 0 : _j.events) || [], selectedStateId, stateWorkloads.map(function (workload) { return workload.id; }), stateGates.map(function (gate) { return gate.id; }));
    var validationIssues = props.validation ? __spreadArray(__spreadArray([], props.validation.errors, true), props.validation.warnings, true).filter(function (issue) { var _a; return ((_a = issue.path) === null || _a === void 0 ? void 0 : _a.includes("states.".concat(selectedStateId))) || issue.message.includes(selectedStateId); }) : [];
    return <Panel title='State'>
        <KeyValue label='Id' value={selectedStateId}/>
        <KeyValue label='Type' value={state.type}/>
        <KeyValue label='Agent' value={state.agent || 'none'}/>
        {state.type === 'agent' && <KeyValue label='Provider / model' value={providerSummary(state.provider)}/>}
        {state.agent && <AgentMarkdownActions workflow={props.workflow} agentIdOrPath={state.agent} onOpenAgent={props.onOpenAgent}/>}
        <KeyValue label='Inputs' value={(((_k = state.input) === null || _k === void 0 ? void 0 : _k.include) || []).join(', ') || 'none'}/>
        <KeyValue label='Outputs' value={(state.outputs || []).join(', ') || 'none'}/>
        <KeyValue label='Signals' value={(((_l = state.input) === null || _l === void 0 ? void 0 : _l.signals) || []).join(', ') || signals.map(function (signal) { return signal.key; }).join(', ') || 'none'}/>
        <KeyValue label='Timeout' value={state.timeoutMs ? "".concat(state.timeoutMs, " ms") : 'none'}/>
        <KeyValue label='Retry' value={state.retry ? "max ".concat(state.retry.max).concat(state.retry.counter ? " / ".concat(state.retry.counter) : '') : 'none'}/>
        <KeyValue label='Workloads' value={stateWorkloads.length.toString()}/>
        {state.waitFor && <KeyValue label='Wait for' value={state.waitFor.join(', ') || 'none'}/>}
        {state.branches && <KeyValue label='Branches' value={Object.keys(state.branches).join(', ') || 'none'}/>}
        <StateEditor workflow={props.workflow} stateId={selectedStateId} state={state} editable={((_m = props.workflow.file) === null || _m === void 0 ? void 0 : _m.editable) !== false} issues={validationIssues} modelProfiles={props.modelProfiles} onUpdateState={props.onUpdateState} onOpenAgent={props.onOpenAgent} onAddBranch={props.onAddBranch} onDeleteState={props.onDeleteState} onSaveWorkflow={props.onSaveWorkflow}/>
        <RunList title='Artifacts' empty='No artifacts for this state.' items={artifacts.map(function (artifact) { return ({
            id: artifact.id,
            title: artifact.uri,
            meta: "".concat(artifact.kind).concat(artifact.summary ? " / ".concat(artifact.summary) : ''),
            onOpen: function () { return props.onOpenArtifact(artifact.uri); }
        }); })}/>
        <RunList title='Effects' empty='No effects for this state.' items={effects.map(function (effect) { return ({
            id: effect.id,
            title: "".concat(effect.kind, " / ").concat(effect.status),
            meta: effect.summary
        }); })}/>
        <RunList title='Signals' empty='No signals for this state.' items={signals.map(function (signal) { return ({
            id: signal.key,
            title: signal.key,
            meta: String(signal.value)
        }); })}/>
        <RunList title='Workload details' empty='No workloads for this state.' items={stateWorkloads.map(function (workload) { return ({
            id: workload.id,
            title: "".concat(workload.id, " / ").concat(workload.status),
            meta: [
                workload.agent || 'system',
                workload.branchId ? "branch ".concat(workload.branchId) : undefined,
                workload.inputArtifacts.length ? "in ".concat(workload.inputArtifacts.join(', ')) : undefined,
                workload.outputArtifacts.length ? "out ".concat(workload.outputArtifacts.join(', ')) : undefined,
                workload.effectIds.length ? "effects ".concat(workload.effectIds.join(', ')) : undefined,
                workload.reportUri ? "report ".concat(workload.reportUri) : undefined,
                workload.issues.length ? "issues ".concat(workload.issues.join(', ')) : undefined
            ].filter(Boolean).join(' / ')
        }); })}/>
        {stateGates.map(function (gate) { return <div className='flow__gate' key={gate.id}>
            <strong>{gate.title}</strong>
            <span>{gate.status}</span>
            {gate.prompt && <small>{gate.prompt}</small>}
            {gate.status === 'pending' && !props.readOnlyRun && <div className='flow__gate-actions'>
                <button onClick={function () { return props.onApproveGate(gate.id, 'approved'); }}>Approve</button>
                <button onClick={function () { return props.onApproveGate(gate.id, 'revision_requested'); }}>Review</button>
                <button onClick={function () { return props.onApproveGate(gate.id, 'rejected'); }}>Reject</button>
            </div>}
        </div>; })}
        <RunList title='Relevant events' empty='No events for this state.' items={events.map(function (event) { return ({
            id: event.id,
            title: "".concat(event.type, " / ").concat(new Date(event.timestamp).toLocaleTimeString()),
            meta: event.message
        }); })}/>
    </Panel>;
}
function StateEditor(props) {
    var _a, _b, _c, _d, _e, _f;
    var updateInput = function (patch) {
        return props.onUpdateState(props.stateId, { input: compactObject(__assign(__assign({}, (props.state.input || {})), patch)) });
    };
    return <section className='flow__state-editor' aria-label='State editor'>
        <div className='flow__section-heading'>
            <h4>Workflow fields</h4>
            <button onClick={props.onSaveWorkflow} disabled={!props.editable} title='Save workflow file'>
                <i className='codicon codicon-save'/> Save
            </button>
            <button onClick={function () { return props.onDeleteState(props.stateId); }} disabled={!props.editable} title='Delete state'>
                <i className='codicon codicon-trash'/> Delete
            </button>
        </div>
        {props.issues.length > 0 && <div className='flow__inline-validation'>
            {props.issues.map(function (issue) { return <span key={"".concat(issue.code, "-").concat(issue.path || issue.message)}>{issue.message}</span>; })}
        </div>}
        <div className='flow__form-section'>
            <h5>Agente</h5>
            <label>
                <span>Agent</span>
                <div className='flow__agent-field'>
                    <input value={props.state.agent || ''} disabled={!props.editable} placeholder='ex: frontend ou agents/frontend.md' onChange={function (event) { return props.onUpdateState(props.stateId, { agent: emptyToUndefined(event.currentTarget.value) }); }}/>
                    <button disabled={!props.state.agent} title='Open agent Markdown in Theia editor' onClick={function () { return props.state.agent && props.onOpenAgent(props.state.agent); }}>
                        <i className='codicon codicon-edit'/>
                    </button>
                </div>
            </label>
            {props.state.type === 'agent' && <>
            <ModelExecutionEditor state={props.state} modelProfiles={props.modelProfiles} editable={props.editable} onUpdate={function (patch) { return props.onUpdateState(props.stateId, patch); }}/>
            <label>
                <span>System prompt</span>
                <textarea rows={4} value={props.state.systemPrompt || ''} disabled={!props.editable} placeholder='Papel, limites e criterios do agente' onChange={function (event) { return props.onUpdateState(props.stateId, { systemPrompt: emptyToUndefined(event.currentTarget.value) }); }}/>
            </label>
            <label>
                <span>Task prompt</span>
                <textarea rows={4} value={props.state.taskPrompt || ''} disabled={!props.editable} placeholder='Tarefa especifica deste bloco' onChange={function (event) { return props.onUpdateState(props.stateId, { taskPrompt: emptyToUndefined(event.currentTarget.value) }); }}/>
            </label>
            <label>
                <span>Deliverables</span>
                <textarea rows={4} value={deliverablesToText(props.state.deliverables)} disabled={!props.editable} placeholder='path | description | kind | required' onChange={function (event) { return props.onUpdateState(props.stateId, { deliverables: textToDeliverables(event.currentTarget.value) }); }}/>
            </label>
            </>}
        </div>
        <div className='flow__form-section'>
            <h5>Entrada e saida</h5>
            <label>
                <span>Input includes</span>
                <textarea rows={3} value={listToText((_a = props.state.input) === null || _a === void 0 ? void 0 : _a.include)} disabled={!props.editable} placeholder='artifact:reports/spec.md' onChange={function (event) { return updateInput({ include: textToList(event.currentTarget.value) }); }}/>
            </label>
            <label>
                <span>Input signals</span>
                <textarea rows={2} value={listToText((_b = props.state.input) === null || _b === void 0 ? void 0 : _b.signals)} disabled={!props.editable} placeholder='design.approved' onChange={function (event) { return updateInput({ signals: textToList(event.currentTarget.value) }); }}/>
            </label>
            <label>
                <span>Outputs</span>
                <textarea rows={3} value={listToText(props.state.outputs)} disabled={!props.editable} placeholder={'report\npatch'} onChange={function (event) { return props.onUpdateState(props.stateId, { outputs: textToList(event.currentTarget.value) }); }}/>
            </label>
        </div>
        <div className='flow__form-section'>
            <h5>Execucao</h5>
            <div className='flow__editor-grid'>
                <label>
                    <span>Timeout ms</span>
                    <input type='number' min='0' value={(_c = props.state.timeoutMs) !== null && _c !== void 0 ? _c : ''} disabled={!props.editable} placeholder='600000' onChange={function (event) { return props.onUpdateState(props.stateId, { timeoutMs: numberOrUndefined(event.currentTarget.value) }); }}/>
                </label>
                <label>
                    <span>Retry max</span>
                    <input type='number' min='0' value={(_e = (_d = props.state.retry) === null || _d === void 0 ? void 0 : _d.max) !== null && _e !== void 0 ? _e : ''} disabled={!props.editable} placeholder='0' onChange={function (event) {
            var _a;
            return props.onUpdateState(props.stateId, {
                retry: retryOrUndefined(numberOrUndefined(event.currentTarget.value), (_a = props.state.retry) === null || _a === void 0 ? void 0 : _a.counter)
            });
        }}/>
                </label>
                <label>
                    <span>Retry counter</span>
                    <input value={((_f = props.state.retry) === null || _f === void 0 ? void 0 : _f.counter) || ''} disabled={!props.editable} placeholder='state_retry_count' onChange={function (event) {
            var _a;
            return props.onUpdateState(props.stateId, {
                retry: retryOrUndefined((_a = props.state.retry) === null || _a === void 0 ? void 0 : _a.max, emptyToUndefined(event.currentTarget.value))
            });
        }}/>
                </label>
            </div>
        </div>
        {props.state.type === 'parallel' && <section className='flow__branch-editor' aria-label='Parallel branches'>
            <div className='flow__section-heading'>
                <h4>Branches</h4>
                <span>{Object.keys(props.state.branches || {}).length}</span>
            </div>
            <div className='flow__branch-list'>
                {Object.entries(props.state.branches || {}).map(function (_a) {
                var branchId = _a[0], branch = _a[1];
                return <span key={branchId}>
                    <i className={"codicon ".concat(stateTypeIcon(branch.type))}/> {branchId} / {branch.type}
                </span>;
            })}
                {Object.keys(props.state.branches || {}).length === 0 && <span>No branches.</span>}
            </div>
            <div className='flow__branch-actions'>
                {AGENCY_CANVAS_BRANCH_TYPES.map(function (stateType) { return <button key={stateType} disabled={!props.editable} title={"Add ".concat(stateType, " branch")} onClick={function () { return props.onAddBranch(props.stateId, stateType); }}>
                    <i className={"codicon ".concat(stateTypeIcon(stateType))}/>
                    <span>{stateTypeLabel(stateType)}</span>
                </button>; })}
            </div>
        </section>}
        {props.state.type === 'dynamic_parallel' && <DynamicParallelEditor workflow={props.workflow} state={props.state} editable={props.editable} onUpdate={function (patch) { return props.onUpdateState(props.stateId, patch); }}/>}
        {props.state.type === 'tournament' && <TournamentEditor workflow={props.workflow} state={props.state} editable={props.editable} onUpdate={function (patch) { return props.onUpdateState(props.stateId, patch); }}/>}
    </section>;
}
function DynamicParallelEditor(props) {
    var _a, _b;
    var config = props.state.dynamicParallel || { itemsFrom: '', worker: { type: 'agent', agent: 'worker' } };
    var update = function (patch) {
        return props.onUpdate({ dynamicParallel: compactObject(__assign(__assign({}, config), patch)) });
    };
    return <section className='flow__super-node-editor' aria-label='Dynamic parallel editor'>
        <div className='flow__section-heading'>
            <h4>Dynamic fan-out</h4>
            <span>{config.joinStrategy || 'collect'}</span>
        </div>
        <div className='flow__editor-grid flow__editor-grid--two'>
            <label>
                <span>Items source</span>
                <OutputSourceSelect value={config.itemsFrom} workflow={props.workflow} disabled={!props.editable} onChange={function (itemsFrom) { return update({ itemsFrom: itemsFrom }); }}/>
            </label>
            <label>
                <span>Item variable</span>
                <input value={config.itemVariable || ''} disabled={!props.editable} placeholder='item' onChange={function (event) { return update({ itemVariable: emptyToUndefined(event.currentTarget.value) }); }}/>
            </label>
            <label>
                <span>Concurrency</span>
                <input type='number' min='1' value={(_a = config.concurrency) !== null && _a !== void 0 ? _a : ''} disabled={!props.editable} onChange={function (event) { return update({ concurrency: numberOrUndefined(event.currentTarget.value) }); }}/>
            </label>
            <label>
                <span>Max items</span>
                <input type='number' min='1' value={(_b = config.maxItems) !== null && _b !== void 0 ? _b : ''} disabled={!props.editable} onChange={function (event) { return update({ maxItems: numberOrUndefined(event.currentTarget.value) }); }}/>
            </label>
            <label>
                <span>Failure policy</span>
                <select value={config.failurePolicy || 'best_effort'} disabled={!props.editable} onChange={function (event) { return update({ failurePolicy: event.currentTarget.value }); }}>
                    <option value='fail_fast'>Fail fast</option>
                    <option value='best_effort'>Best effort</option>
                    <option value='threshold'>Threshold</option>
                </select>
            </label>
            <label>
                <span>Join strategy</span>
                <select value={config.joinStrategy || 'collect'} disabled={!props.editable} onChange={function (event) { return update({ joinStrategy: event.currentTarget.value }); }}>
                    <option value='collect'>Collect all</option>
                    <option value='best_effort'>Best effort</option>
                    <option value='require_all'>Require all</option>
                </select>
            </label>
        </div>
    </section>;
}
function TournamentEditor(props) {
    var _a;
    var config = props.state.tournament || { candidatesFrom: '', judge: { type: 'agent', agent: 'judge' } };
    var update = function (patch) {
        return props.onUpdate({ tournament: compactObject(__assign(__assign({}, config), patch)) });
    };
    return <section className='flow__super-node-editor' aria-label='Tournament editor'>
        <div className='flow__section-heading'>
            <h4>Tournament</h4>
            <span>{config.strategy || 'single_round'}</span>
        </div>
        <div className='flow__editor-grid flow__editor-grid--two'>
            <label>
                <span>Candidates source</span>
                <OutputSourceSelect value={config.candidatesFrom} workflow={props.workflow} disabled={!props.editable} onChange={function (candidatesFrom) { return update({ candidatesFrom: candidatesFrom }); }}/>
            </label>
            <label>
                <span>Strategy</span>
                <select value={config.strategy || 'single_round'} disabled={!props.editable} onChange={function (event) { return update({ strategy: event.currentTarget.value }); }}>
                    <option value='single_round'>Single round</option>
                    <option value='bracket'>Bracket</option>
                    <option value='round_robin'>Round robin</option>
                </select>
            </label>
            <label>
                <span>Winner count</span>
                <input type='number' min='1' value={(_a = config.winnerCount) !== null && _a !== void 0 ? _a : ''} disabled={!props.editable} onChange={function (event) { return update({ winnerCount: numberOrUndefined(event.currentTarget.value) }); }}/>
            </label>
            <label>
                <span>Tie breaker</span>
                <select value={config.tieBreaker || 'judge_again'} disabled={!props.editable} onChange={function (event) { return update({ tieBreaker: event.currentTarget.value }); }}>
                    <option value='judge_again'>Judge again</option>
                    <option value='score_total'>Score total</option>
                    <option value='first_candidate'>First candidate</option>
                </select>
            </label>
        </div>
        <label>
            <span>Criteria</span>
            <textarea rows={3} value={(config.criteria || []).join('\n')} disabled={!props.editable} onChange={function (event) { return update({ criteria: textToList(event.currentTarget.value) }); }}/>
        </label>
    </section>;
}
function OutputSourceSelect(props) {
    var options = uniqueStrings(__spreadArray([props.value || ''], workflowOutputSourceOptions(props.workflow), true)).filter(Boolean);
    return <select value={props.value || ''} disabled={props.disabled} onChange={function (event) { return props.onChange(event.currentTarget.value); }}>
        {options.length === 0 && <option value=''>No outputs available</option>}
        {options.map(function (option) { return <option key={option} value={option}>{option}</option>; })}
    </select>;
}
function ModelExecutionEditor(props) {
    var _a, _b, _c, _d, _e, _f;
    var execution = props.state.modelExecution || {};
    var profileId = execution.profileId || 'inherit';
    var currentModelId = ((_a = props.state.provider) === null || _a === void 0 ? void 0 : _a.modelId) || '';
    var modelOptions = uniqueStrings(__spreadArray(__spreadArray([
        ''
    ], props.modelProfiles.map(function (profile) { var _a; return (_a = profile.provider) === null || _a === void 0 ? void 0 : _a.modelId; }).filter(function (value) { return Boolean(value); }), true), [
        currentModelId
    ], false));
    var updateExecution = function (patch) {
        return props.onUpdate({ modelExecution: modelExecutionOrUndefined(__assign(__assign({}, execution), patch)) });
    };
    return <section className='flow__model-execution' aria-label='Model execution'>
        <div className='flow__section-heading'>
            <h4>Model execution</h4>
            <span>{profileId}</span>
        </div>
        <div className='flow__editor-grid flow__editor-grid--two'>
            <label>
                <span>Profile</span>
                <select value={profileId} disabled={!props.editable} onChange={function (event) {
            var profile = props.modelProfiles.find(function (candidate) { return candidate.id === event.currentTarget.value; });
            void props.onUpdate({
                provider: profile === null || profile === void 0 ? void 0 : profile.provider,
                modelExecution: profile ? __assign(__assign({}, profile.execution), { profileId: profile.id }) : undefined
            });
        }}>
                    {props.modelProfiles.map(function (profile) { return <option key={profile.id} value={profile.id}>{profile.name}</option>; })}
                </select>
            </label>
            <label>
                <span>Provider</span>
                <select value={((_b = props.state.provider) === null || _b === void 0 ? void 0 : _b.providerId) || 'inherit'} disabled={!props.editable} onChange={function (event) {
            var _a, _b;
            return props.onUpdate({
                provider: providerSelectionOrUndefined(event.currentTarget.value === 'inherit' ? undefined : event.currentTarget.value, (_a = props.state.provider) === null || _a === void 0 ? void 0 : _a.modelId, (_b = props.state.provider) === null || _b === void 0 ? void 0 : _b.options)
            });
        }}>
                    <option value='inherit'>Use profile/default</option>
                    <option value='theia-language-model'>Theia language model</option>
                    <option value='codex-provider'>Codex provider</option>
                    <option value='command'>Command provider</option>
                    <option value='e2e-mock'>E2E mock</option>
                </select>
            </label>
            <label>
                <span>Model</span>
                <select value={currentModelId} disabled={!props.editable} onChange={function (event) {
            var _a, _b;
            return props.onUpdate({
                provider: providerSelectionOrUndefined((_a = props.state.provider) === null || _a === void 0 ? void 0 : _a.providerId, event.currentTarget.value, (_b = props.state.provider) === null || _b === void 0 ? void 0 : _b.options)
            });
        }}>
                    {modelOptions.map(function (modelId) { return <option key={modelId || 'default'} value={modelId}>{modelId || 'Provider default / selected chat model'}</option>; })}
                </select>
            </label>
            <label>
                <span>Reasoning policy</span>
                <select value={execution.reasoningPolicy || 'off'} disabled={!props.editable} onChange={function (event) { return updateExecution({ reasoningPolicy: event.currentTarget.value }); }}>
                    <option value='off'>Off</option>
                    <option value='auto'>Auto</option>
                    <option value='native'>Native</option>
                    <option value='virtual'>Virtual</option>
                    <option value='native_plus_virtual_light'>Native + light virtual</option>
                </select>
            </label>
            <label>
                <span>Native effort</span>
                <select value={((_c = execution.nativeReasoning) === null || _c === void 0 ? void 0 : _c.effort) || 'none'} disabled={!props.editable} onChange={function (event) { return updateExecution({
            nativeReasoning: __assign(__assign({}, (execution.nativeReasoning || {})), { enabled: event.currentTarget.value !== 'none', effort: event.currentTarget.value })
        }); }}>
                    <option value='none'>None</option>
                    <option value='low'>Low</option>
                    <option value='medium'>Medium</option>
                    <option value='high'>High</option>
                </select>
            </label>
            <label>
                <span>Virtual reasoning</span>
                <select value={((_d = execution.virtualReasoning) === null || _d === void 0 ? void 0 : _d.mode) || 'off'} disabled={!props.editable} onChange={function (event) { return updateExecution({
            virtualReasoning: __assign(__assign({}, (execution.virtualReasoning || {})), { enabled: event.currentTarget.value !== 'off', mode: event.currentTarget.value })
        }); }}>
                    <option value='off'>Off</option>
                    <option value='auto'>Auto</option>
                    <option value='fast'>Fast</option>
                    <option value='balanced'>Balanced</option>
                    <option value='deep'>Deep</option>
                    <option value='coding'>Coding</option>
                </select>
            </label>
            <label>
                <span>Temperature</span>
                <input type='range' min='0' max='1' step='0.05' value={(_e = execution.temperature) !== null && _e !== void 0 ? _e : 0.2} disabled={!props.editable} onChange={function (event) { return updateExecution({ temperature: numberOrUndefined(event.currentTarget.value) }); }}/>
            </label>
            <label>
                <span>Max output tokens</span>
                <input type='number' min='0' value={(_f = execution.maxTokens) !== null && _f !== void 0 ? _f : ''} disabled={!props.editable} placeholder='default' onChange={function (event) { return updateExecution({ maxTokens: numberOrUndefined(event.currentTarget.value) }); }}/>
            </label>
        </div>
    </section>;
}
function AgentMarkdownActions(props) {
    var _a;
    var relativePath = ((_a = props.workflow.agents) === null || _a === void 0 ? void 0 : _a[props.agentIdOrPath]) || props.agentIdOrPath;
    return <section className='flow__agent-markdown' aria-label='Agent Markdown'>
        <div className='flow__section-heading'>
            <h4>Agent Markdown</h4>
            <button onClick={function () { return props.onOpenAgent(props.agentIdOrPath); }} title='Open agent Markdown in Theia editor'>
                <i className='codicon codicon-edit'/> Open
            </button>
        </div>
        <code>{relativePath}</code>
        <p>Agents describe role, instructions, inputs, and output format only. Workflow flow control remains in the workflow file and kernel.</p>
    </section>;
}
function TransitionEditor(props) {
    var _a;
    var _b = React.useState(formatGuard(props.transition.guard)), guardText = _b[0], setGuardText = _b[1];
    var _c = React.useState(), guardError = _c[0], setGuardError = _c[1];
    React.useEffect(function () {
        setGuardText(formatGuard(props.transition.guard));
        setGuardError(undefined);
    }, [props.transitionId, props.transition.guard]);
    var updateGuard = function (value) {
        setGuardText(value);
        var trimmed = value.trim();
        if (!trimmed) {
            setGuardError(undefined);
            props.onUpdateTransition(props.transitionId, { guard: undefined });
            return;
        }
        try {
            var guard = JSON.parse(trimmed);
            if (!isPlainObject(guard)) {
                setGuardError('Guard must be a JSON object.');
                return;
            }
            setGuardError(undefined);
            props.onUpdateTransition(props.transitionId, { guard: guard });
        }
        catch (error) {
            setGuardError(error instanceof Error ? error.message : String(error));
        }
    };
    return <section className='flow__transition-editor' aria-label='Transition editor'>
        <div className='flow__section-heading'>
            <h4>Transition fields</h4>
            <button onClick={props.onSaveWorkflow} disabled={!props.editable} title='Save workflow file'>
                <i className='codicon codicon-save'/> Save
            </button>
            <button onClick={function () { return props.onDeleteTransition(props.transitionId); }} disabled={!props.editable} title='Delete transition'>
                <i className='codicon codicon-trash'/> Delete
            </button>
        </div>
        {props.issues.length > 0 && <div className='flow__inline-validation'>
            {props.issues.map(function (issue) { return <span key={"".concat(issue.code, "-").concat(issue.path || issue.message)}>{issue.message}</span>; })}
        </div>}
        <div className='flow__form-section'>
            <h5>Roteamento</h5>
            <div className='flow__editor-grid flow__editor-grid--two'>
                <label>
                    <span>From</span>
                    <select value={props.transition.from} disabled={!props.editable} onChange={function (event) { return props.onUpdateTransition(props.transitionId, { from: event.currentTarget.value }); }}>
                        {props.stateIds.map(function (stateId) { return <option key={stateId} value={stateId}>{stateId}</option>; })}
                    </select>
                </label>
                <label>
                    <span>To</span>
                    <select value={props.transition.to} disabled={!props.editable} onChange={function (event) { return props.onUpdateTransition(props.transitionId, { to: event.currentTarget.value }); }}>
                        {props.stateIds.map(function (stateId) { return <option key={stateId} value={stateId}>{stateId}</option>; })}
                    </select>
                </label>
            </div>
            <div className='flow__editor-grid flow__editor-grid--two'>
                <label>
                    <span>On</span>
                    <input value={props.transition.on} disabled={!props.editable} placeholder='workload.completed' onChange={function (event) { return props.onUpdateTransition(props.transitionId, { on: event.currentTarget.value }); }}/>
                </label>
                <label>
                    <span>Priority</span>
                    <input type='number' value={(_a = props.transition.priority) !== null && _a !== void 0 ? _a : ''} disabled={!props.editable} placeholder='0' onChange={function (event) { return props.onUpdateTransition(props.transitionId, { priority: numberOrUndefined(event.currentTarget.value) }); }}/>
                </label>
            </div>
        </div>
        <div className='flow__form-section'>
            <h5>Condicao</h5>
            <label>
                <span>Guard JSON</span>
                <textarea rows={5} value={guardText} disabled={!props.editable} placeholder={'{\n  "status": "done"\n}'} onChange={function (event) { return updateGuard(event.currentTarget.value); }}/>
            </label>
            {guardError && <div className='flow__inline-validation'><span>{guardError}</span></div>}
        </div>
    </section>;
}
function Kanban(props) {
    var _a;
    var columns = (0, common_2.deriveFlowKanbanColumns)(((_a = props.run) === null || _a === void 0 ? void 0 : _a.workloads) || []);
    return <section className='flow__kanban' aria-label='Workloads'>
        {columns.map(function (column) { return <div className='flow__kanban-column' key={column.id}>
            <h3>{column.label}</h3>
            {column.workloads.map(function (workload) { return <article className='flow__workload' key={workload.id}>
                <strong>{workload.stateId}</strong>
                <span>{workload.agent || 'system'}</span>
                <small>{workload.outputArtifacts.length} artifacts / {workload.effectIds.length} effects</small>
                {workload.outputArtifacts.length > 0 && <div className='flow__workload-artifacts'>
                    {workload.outputArtifacts.map(function (artifactUri) { return <button key={artifactUri} type='button' title={"Open ".concat(artifactUri)} onClick={function () { return props.onOpenArtifact(artifactUri); }}>
                        <i className='codicon codicon-file'/>
                        <span>{artifactLabel(artifactUri)}</span>
                    </button>; })}
                </div>}
            </article>; })}
        </div>; })}
    </section>;
}
function RunHistoryPanel(props) {
    return <section className='flow__run-history' aria-label='Historico de runs'>
        <div className='flow__section-heading'>
            <h3>Historico de runs</h3>
            <button type='button' title='Fechar historico' onClick={props.onClose}>
                <i className='codicon codicon-close'/>
            </button>
        </div>
        {props.runs.length === 0 && <p>Nenhuma run registrada.</p>}
        <div className='flow__run-history-list'>
            {props.runs.map(function (run) { return <button key={run.id} type='button' className={run.id === props.activeRunId ? 'flow__run-history-item flow__run-history-item--active' : 'flow__run-history-item'} disabled={props.busy} title={"Abrir run ".concat(run.id)} onClick={function () { return props.onOpen(run.id); }}>
                <strong>{run.workflowId}</strong>
                <span>{run.status}</span>
                <small>{formatTimestamp(run.updatedAt || run.createdAt)}</small>
                <code>{run.id}</code>
            </button>; })}
        </div>
    </section>;
}
function RunObservability(props) {
    var _a;
    var run = props.run;
    var selectedArtifact = (run === null || run === void 0 ? void 0 : run.artifacts.find(function (artifact) { return artifact.id === props.selectedArtifactId; })) || (run === null || run === void 0 ? void 0 : run.artifacts[0]);
    return <section className='flow__run-observability' aria-label='Run observability'>
        <h3>{common_1.nls.localize('theia/flow/observability', 'Run')}</h3>
        {!run && <p>No active run.</p>}
        {run && <>
            <KeyValue label='Status' value={run.status}/>
            <KeyValue label='Modo de execucao' value={executionModeLabel(run.executionMode)}/>
            {run.executionModeMessage && <RunList title='Detalhes do modo' empty='Sem detalhes.' items={[{
                        id: 'run-execution-mode-message',
                        title: run.executionModeMessage
                    }]}/>}
            <KeyValue label='Tick' value={run.tick.toString()}/>
            <KeyValue label='Current' value={run.currentStateIds.join(', ') || 'none'}/>
            {((_a = run.audit) === null || _a === void 0 ? void 0 : _a.readOnly) && <RunAuditSummary run={run}/>}
            <FinalReportSummary run={run}/>
            {run.secondRunSuggestion && <SecondRunSuggestion suggestion={run.secondRunSuggestion} busy={props.busy || props.readOnly} onApprove={props.onApproveSecondRunSuggestion} onDismiss={props.onDismissSecondRunSuggestion}/>}
            <ArtifactBrowser run={run} selectedArtifact={selectedArtifact} onSelectArtifact={props.onSelectArtifact} onOpenArtifact={props.onOpenArtifact}/>
            <EffectReview effects={run.effects} busy={props.busy || props.readOnly} onDecide={props.onDecideEffect}/>
            <MemoryCandidateReview candidates={run.memoryCandidates || []} busy={props.busy || props.readOnly} onDecide={props.onDecideMemoryCandidate}/>
            {run.memoryWrites && <RunList title='Memory writes' empty='No memory writes.' items={run.memoryWrites.map(function (write) { return ({
                    id: write.id,
                    title: "".concat(write.status, " / ").concat(write.target || 'default'),
                    meta: write.error ? "".concat(write.content, " / ").concat(write.error) : write.content
                }); })}/>}
            {run.contextPack && <div className='flow__context-pack'>
                <h4>Context pack</h4>
                <KeyValue label='Summary' value={run.contextPack.summary}/>
                <KeyValue label='Workflow' value={"".concat(run.contextPack.workflow.stateCount, " states / ").concat(run.contextPack.workflow.transitionCount, " transitions")}/>
                <KeyValue label='Agents' value={run.contextPack.workflow.agentIds.join(', ') || 'none'}/>
                {run.contextPack.missingService && <KeyValue label='Provider' value={run.contextPack.missingService}/>}
                <RunList title='Files' empty='No files.' items={run.contextPack.files.map(function (file) { return ({
                    id: file.uri,
                    title: file.uri,
                    meta: file.reason
                }); })}/>
                <RunList title='Signals' empty='No context signals.' items={run.contextPack.signals.map(function (signal) { return ({
                    id: signal.key,
                    title: signal.key,
                    meta: "".concat(signal.value).concat(signal.stateId ? " / ".concat(signal.stateId) : '')
                }); })}/>
            </div>}
        </>}
    </section>;
}
function FinalReportSummary(props) {
    var summary = deriveFinalReportSummary(props.run);
    return <section className='flow__final-report-summary'>
        <div className='flow__section-heading'>
            <h4>Relatorio final</h4>
            <span>{summary.reportArtifactCount} report artifact{summary.reportArtifactCount === 1 ? '' : 's'}</span>
        </div>
        <p>{summary.summary}</p>
        <div className='flow__report-metrics' aria-label='Final report metrics'>
            <KeyValue label='Workloads' value={"".concat(summary.completedWorkloads, "/").concat(props.run.workloads.length, " done")}/>
            <KeyValue label='Artifacts' value={props.run.artifacts.length.toString()}/>
            <KeyValue label='Effects' value={props.run.effects.length.toString()}/>
            <KeyValue label='Issues' value={"".concat(summary.blockingIssues.length, " blocking / ").concat(summary.followupIssues.length, " follow-up")}/>
        </div>
        <RunList title='Issues bloqueantes' empty='Nenhuma issue bloqueante.' items={summary.blockingIssues.map(function (issue, index) { return issueToRunListItem(issue, index); })}/>
        <RunList title='Follow-ups' empty='Nenhum follow-up registrado.' items={summary.followupIssues.map(function (issue, index) { return issueToRunListItem(issue, index); })}/>
    </section>;
}
function RunAuditSummary(props) {
    var _a, _b, _c, _d;
    var manifest = (_a = props.run.audit) === null || _a === void 0 ? void 0 : _a.manifest;
    var manifestItems = manifest ? Object.entries(manifest).map(function (_a) {
        var key = _a[0], value = _a[1];
        return ({
            id: key,
            title: key,
            meta: typeof value === 'string' ? value : JSON.stringify(value)
        });
    }) : [];
    return <div className='flow__audit-summary'>
        <h4>Audit import</h4>
        <KeyValue label='Mode' value='Read-only'/>
        <KeyValue label='Imported' value={((_b = props.run.audit) === null || _b === void 0 ? void 0 : _b.importedAt) || ''}/>
        <KeyValue label='Source' value={((_c = props.run.audit) === null || _c === void 0 ? void 0 : _c.sourcePath) || ''}/>
        {((_d = props.run.audit) === null || _d === void 0 ? void 0 : _d.packagePath) && <KeyValue label='Package' value={props.run.audit.packagePath}/>}
        <RunList title='Manifest' empty='No manifest.json was imported.' items={manifestItems}/>
    </div>;
}
function EffectReview(props) {
    var _a = React.useState({}), notes = _a[0], setNotes = _a[1];
    var noteFor = function (effectId) { return notes[effectId] || ''; };
    var setNote = function (effectId, note) { return setNotes(function (current) {
        var _a;
        return (__assign(__assign({}, current), (_a = {}, _a[effectId] = note, _a)));
    }); };
    return <section className='flow__effect-review' aria-label='Effect review'>
        <div className='flow__section-heading'>
            <h4>Effects</h4>
            <span>{props.effects.length} recorded</span>
        </div>
        {props.effects.length === 0 && <p>No effects yet.</p>}
        {props.effects.map(function (effect) {
            var terminal = ['applied', 'rejected', 'blocked', 'failed'].includes(effect.status);
            var note = noteFor(effect.id);
            var blockReason = effectBlockReason(effect);
            var canApply = (isFileEffectForReview(effect) || isImageEffectForReview(effect)) && !terminal && effect.status !== 'blocked';
            return <article key={effect.id} className={"flow__effect-card flow__effect-card--".concat(effect.status)}>
                <header>
                    <div>
                        <strong>{effect.kind} / {effect.status}</strong>
                        <span>{effect.summary}</span>
                    </div>
                    <code>{effect.id}</code>
                </header>
                <div className='flow__effect-metadata'>
                    <KeyValue label='Path' value={effect.path || effect.artifactPath || 'none'}/>
                    <KeyValue label='State' value={effect.stateId}/>
                    <KeyValue label='Policy' value={effect.approvalPolicy || 'unspecified'}/>
                    {effect.provider && <KeyValue label='Provider' value={effect.provider}/>}
                    {effect.mimeType && <KeyValue label='MIME' value={effect.mimeType}/>}
                    {typeof effect.bytes === 'number' && <KeyValue label='Bytes' value={effect.bytes.toString()}/>}
                    <KeyValue label='Hash before' value={effect.hashBefore || 'none'}/>
                    <KeyValue label='Hash after' value={effect.hashAfter || 'none'}/>
                    {effect.command && <KeyValue label='Command' value={effect.command}/>}
                    {effect.cwd && <KeyValue label='CWD' value={effect.cwd}/>}
                    {typeof effect.exitCode === 'number' && <KeyValue label='Exit' value={effect.exitCode.toString()}/>}
                </div>
                {blockReason && <p className='flow__effect-blocked'>Blocked: {blockReason}</p>}
                {!isFileEffectForReview(effect) && !isImageEffectForReview(effect) && !terminal && <p className='flow__effect-blocked'>Apply is available for file and image effects; this effect can be rejected here and handled by its capability adapter.</p>}
                {effect.patch && <PatchViewer patch={effect.patch}/>}
                {!effect.patch && effect.stdout && <LogViewer effect={effect}/>}
                <textarea rows={2} value={note} disabled={props.busy || terminal} placeholder='Approval/rejection note' onChange={function (event) { return setNote(effect.id, event.currentTarget.value); }}/>
                <div className='flow__effect-actions'>
                    <button type='button' disabled={props.busy || terminal} onClick={function () { return props.onDecide(effect.id, 'rejected', note); }}>
                        Reject
                    </button>
                    <button type='button' disabled={props.busy || !canApply} onClick={function () { return props.onDecide(effect.id, 'applied', note); }}>
                        Apply
                    </button>
                </div>
            </article>;
        })}
    </section>;
}
function normalizeFlowSnapshotEvents(snapshot) {
    return snapshot.activeRun
        ? __assign(__assign({}, snapshot), { activeRun: normalizeFlowRunEvents(snapshot.activeRun) }) : snapshot;
}
function normalizeFlowRunEvents(run) {
    var redacted = (0, common_2.redactFlowRunForDisplay)(run);
    return __assign(__assign({}, redacted), { events: (0, common_2.normalizeFlowEvents)(redacted.events || []) });
}
function resolveSelectedArtifactId(run, selectedArtifactId) {
    var _a;
    if (selectedArtifactId && run.artifacts.some(function (artifact) { return artifact.id === selectedArtifactId; })) {
        return selectedArtifactId;
    }
    return (_a = run.artifacts[0]) === null || _a === void 0 ? void 0 : _a.id;
}
function deriveFinalReportSummary(run) {
    var _a;
    var completedWorkloads = run.workloads.filter(function (workload) { return workload.status === 'done'; }).length;
    var reportArtifactCount = run.artifacts.filter(function (artifact) { return artifact.kind === 'report'; }).length;
    var workloadReports = run.workloads
        .map(function (workload) { var _a, _b, _c; return ((_a = workload.outputEnvelope) === null || _a === void 0 ? void 0 : _a.report) || ((_c = (_b = workload.outputEnvelope) === null || _b === void 0 ? void 0 : _b.result) === null || _c === void 0 ? void 0 : _c.summary); })
        .filter(function (report) { return Boolean(report && report.trim()); });
    var summary = firstParagraph(workloadReports[workloadReports.length - 1])
        || terminalEventSummary(run)
        || "".concat(run.status, " run with ").concat(completedWorkloads, " completed workload").concat(completedWorkloads === 1 ? '' : 's', ".");
    var issues = collectRunIssues(run);
    return {
        summary: summary,
        completedWorkloads: completedWorkloads,
        reportArtifactCount: reportArtifactCount,
        blockingIssues: issues.filter(isBlockingIssue),
        followupIssues: mergeIssueLists(issues.filter(isFollowupIssue), ((_a = run.secondRunSuggestion) === null || _a === void 0 ? void 0 : _a.issues) || [])
    };
}
function collectRunIssues(run) {
    var _a;
    var issues = [];
    for (var _i = 0, _b = run.workloads; _i < _b.length; _i++) {
        var workload = _b[_i];
        issues.push.apply(issues, (((_a = workload.outputEnvelope) === null || _a === void 0 ? void 0 : _a.issues) || []));
        for (var _c = 0, _d = workload.issues; _c < _d.length; _c++) {
            var issue = _d[_c];
            issues.push({ severity: 'blocking', type: 'workload_issue', summary: issue });
        }
    }
    return mergeIssueLists(issues, []);
}
function issueToRunListItem(issue, index) {
    return (0, common_2.redactFlowSecretsValue)({
        id: "".concat(issue.severity, "-").concat(issue.type, "-").concat(issue.summary, "-").concat(index),
        title: "".concat(issue.severity || 'issue', " / ").concat(issue.type || 'general'),
        meta: issue.suggestedFollowup ? "".concat(issue.summary, " / ").concat(issue.suggestedFollowup) : issue.summary
    });
}
function isBlockingIssue(issue) {
    var severity = (issue.severity || '').toLowerCase();
    return ['blocking', 'blocker', 'critical', 'fatal', 'high', 'error', 'failed', 'failure'].includes(severity);
}
function isFollowupIssue(issue) {
    var severity = (issue.severity || '').toLowerCase();
    var text = [issue.type, issue.summary, issue.suggestedFollowup].join(' ').toLowerCase();
    return ['followup', 'follow_up', 'non_blocking', 'warning', 'minor', 'info'].includes(severity)
        || text.includes('followup')
        || text.includes('follow-up')
        || text.includes('out-of-scope')
        || text.includes('out of scope')
        || text.includes('fora de escopo')
        || text.includes('melhoria')
        || text.includes('improvement')
        || text.includes('second run')
        || text.includes('segunda run');
}
function mergeIssueLists(primary, secondary) {
    var seen = new Set();
    var out = [];
    for (var _i = 0, _a = __spreadArray(__spreadArray([], primary, true), secondary, true); _i < _a.length; _i++) {
        var issue = _a[_i];
        var key = "".concat(issue.severity, ":").concat(issue.type, ":").concat(issue.summary, ":").concat(issue.suggestedFollowup || '');
        if (!seen.has(key)) {
            seen.add(key);
            out.push(issue);
        }
    }
    return out;
}
function terminalEventSummary(run) {
    var _a;
    return (_a = run.events
        .slice()
        .reverse()
        .find(function (event) { return event.type === 'run.completed' || event.type === 'run.failed' || event.type === 'run.cancelled'; })) === null || _a === void 0 ? void 0 : _a.message;
}
function firstParagraph(value) {
    var paragraph = value === null || value === void 0 ? void 0 : value.split(/\n\s*\n/).map(function (part) { return part.trim(); }).find(Boolean);
    return paragraph && paragraph.length > 240 ? "".concat(paragraph.slice(0, 237), "...") : paragraph;
}
function EventLog(props) {
    var _a = React.useState({}), filter = _a[0], setFilter = _a[1];
    var filteredEvents = (0, common_2.filterFlowEvents)(props.events, filter);
    var hasFilter = (0, common_2.hasFlowEventLogFilter)(filter);
    var setFilterValue = function (key, value) {
        setFilter(function (current) {
            var _a;
            return (__assign(__assign({}, current), (_a = {}, _a[key] = value || undefined, _a)));
        });
    };
    var options = {
        stateId: eventOptionValues(props.events, function (event) { return event.stateId; }),
        workloadId: eventOptionValues(props.events, function (event) { return event.workloadId; }),
        eventType: eventOptionValues(props.events, function (event) { return event.type; }),
        gateId: eventOptionValues(props.events, function (event) { return event.gateId; }),
        artifact: eventOptionValues(props.events, function (event) { return eventPayloadValues(event, ['artifactId', 'artifact', 'path', 'artifactPath', 'targetPath']); }),
        effect: eventOptionValues(props.events, function (event) { return eventPayloadValues(event, ['effectId', 'effect', 'effectType', 'type']); }),
        severity: eventOptionValues(props.events, function (event) { return eventPayloadValues(event, ['severity']); })
    };
    return <section className='flow__events' aria-label='Run events'>
        <div className='flow__events-header'>
            <h3>{common_1.nls.localize('theia/flow/events', 'Events')}</h3>
            <span>{filteredEvents.length} / {props.events.length}</span>
        </div>
        <div className='flow__event-filters' aria-label='Event filters'>
            <EventFilterSelect label='State' value={filter.stateId} values={options.stateId} onChange={function (value) { return setFilterValue('stateId', value); }}/>
            <EventFilterSelect label='Workload' value={filter.workloadId} values={options.workloadId} onChange={function (value) { return setFilterValue('workloadId', value); }}/>
            <EventFilterSelect label='Type' value={filter.eventType} values={options.eventType} onChange={function (value) { return setFilterValue('eventType', value); }}/>
            <EventFilterSelect label='Gate' value={filter.gateId} values={options.gateId} onChange={function (value) { return setFilterValue('gateId', value); }}/>
            <EventFilterSelect label='Artifact' value={filter.artifact} values={options.artifact} onChange={function (value) { return setFilterValue('artifact', value); }}/>
            <EventFilterSelect label='Effect' value={filter.effect} values={options.effect} onChange={function (value) { return setFilterValue('effect', value); }}/>
            <EventFilterSelect label='Severity' value={filter.severity} values={options.severity} onChange={function (value) { return setFilterValue('severity', value); }}/>
            <button type='button' title='Clear event filters' disabled={!hasFilter} onClick={function () { return setFilter({}); }}>
                <i className='codicon codicon-clear-all'/>
            </button>
        </div>
        <div>
            {filteredEvents.length === 0 && <p>No events match the current filters.</p>}
            {filteredEvents.slice().reverse().map(function (event) { return <article key={event.id}>
                <time>{new Date(event.timestamp).toLocaleTimeString()}</time>
                <strong>{event.type}</strong>
                <span>{(0, common_2.redactFlowSecretsText)(event.message)}</span>
            </article>; })}
        </div>
    </section>;
}
function SecondRunSuggestion(props) {
    var suggestion = props.suggestion;
    var accepted = suggestion.status === 'accepted';
    var dismissed = suggestion.status === 'dismissed';
    return <section className='flow__second-run-suggestion'>
        <div className='flow__section-heading'>
            <h4>{suggestion.title}</h4>
            <div className='flow__second-run-actions'>
                <button type='button' title={dismissed ? 'Second run suggestion dismissed' : 'Dismiss suggested second run'} disabled={props.busy || suggestion.status !== 'suggested'} onClick={function () { return props.onDismiss(suggestion.id); }}>
                    <i className='codicon codicon-close'/>
                    {dismissed ? 'Dispensada' : 'Dispensar'}
                </button>
                <button type='button' title={accepted ? 'Second run already approved' : 'Approve suggested second run'} disabled={props.busy || suggestion.status !== 'suggested'} onClick={function () { return props.onApprove(suggestion.id); }}>
                    <i className={accepted ? 'codicon codicon-check' : 'codicon codicon-run'}/>
                    {accepted ? 'Aprovada' : 'Aprovar segunda run'}
                </button>
            </div>
        </div>
        <p>{suggestion.reason}</p>
        {accepted && <p>Nova run: {suggestion.approvedRunId || 'registrada'} / Workflow: {suggestion.approvedWorkflowId || 'registrado'}</p>}
        {dismissed && <p>Sugestao dispensada; nenhuma nova run sera criada para estes follow-ups.</p>}
        <RunList title='Follow-ups' empty='No follow-ups.' items={suggestion.issues.map(function (issue, index) { return ({
            id: "".concat(issue.type, "-").concat(index),
            title: "".concat(issue.severity, " / ").concat(issue.type),
            meta: issue.suggestedFollowup ? "".concat(issue.summary, " / ").concat(issue.suggestedFollowup) : issue.summary
        }); })}/>
        <details>
            <summary>Prompt sugerido</summary>
            <pre>{(0, common_2.redactFlowSecretsText)(suggestion.prompt)}</pre>
        </details>
    </section>;
}
function EventFilterSelect(props) {
    return <label>
        <span>{props.label}</span>
        <select value={props.value || ''} onChange={function (event) { return props.onChange(event.currentTarget.value); }}>
            <option value=''>All</option>
            {props.values.map(function (value) { return <option key={value} value={value}>{value}</option>; })}
        </select>
    </label>;
}
function eventOptionValues(events, getter) {
    var values = new Set();
    for (var _i = 0, events_1 = events; _i < events_1.length; _i++) {
        var event_1 = events_1[_i];
        var value = getter(event_1);
        var entries = Array.isArray(value) ? value : [value];
        for (var _a = 0, entries_1 = entries; _a < entries_1.length; _a++) {
            var entry = entries_1[_a];
            if (entry) {
                values.add(entry);
            }
        }
    }
    return __spreadArray([], values, true).sort(function (left, right) { return left.localeCompare(right); });
}
function eventPayloadValues(event, keys) {
    var payload = event.payload || {};
    var values = new Set();
    for (var _i = 0, keys_1 = keys; _i < keys_1.length; _i++) {
        var key = keys_1[_i];
        collectEventPayloadValue(values, payload[key]);
    }
    return __spreadArray([], values, true);
}
function collectEventPayloadValue(values, value) {
    if (typeof value === 'string' && value.trim()) {
        values.add(value);
        return;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
        values.add(String(value));
        return;
    }
    if (Array.isArray(value)) {
        for (var _i = 0, value_1 = value; _i < value_1.length; _i++) {
            var item = value_1[_i];
            collectEventPayloadValue(values, item);
        }
        return;
    }
    if (value && typeof value === 'object') {
        var record = value;
        for (var _a = 0, _b = ['id', 'artifactId', 'effectId', 'path', 'artifactPath', 'type', 'severity']; _a < _b.length; _a++) {
            var key = _b[_a];
            collectEventPayloadValue(values, record[key]);
        }
    }
}
var MEMORY_SCOPES = ['workspace', 'project', 'workflow', 'run', 'agent', 'ide'];
function MemoryCandidateReview(props) {
    var _a = React.useState({}), drafts = _a[0], setDrafts = _a[1];
    var draftFor = function (candidate) {
        return drafts[candidate.id] || { content: candidate.content, scope: candidate.scope, target: '', reviewing: false };
    };
    var updateDraft = function (candidate, patch) {
        setDrafts(function (current) {
            var _a;
            return (__assign(__assign({}, current), (_a = {}, _a[candidate.id] = __assign(__assign({}, draftFor(candidate)), patch), _a)));
        });
    };
    return <section className='flow__memory-review'>
        <h4>Memory candidates</h4>
        {props.candidates.length === 0 && <p>No memory candidates.</p>}
        {props.candidates.map(function (candidate) {
            var draft = draftFor(candidate);
            var terminal = candidate.status === 'written' || candidate.status === 'rejected';
            var content = draft.content.trim();
            return <article className={"flow__memory-candidate flow__memory-candidate--".concat(candidate.status)} key={candidate.id}>
                <header>
                    <strong>{candidate.kind} / {candidate.status}</strong>
                    <span>{candidate.source}{candidate.stateId ? " / ".concat(candidate.stateId) : ''} / confidence {candidate.confidence}</span>
                </header>
                <textarea rows={draft.reviewing ? 5 : 3} value={draft.content} disabled={props.busy || terminal || !draft.reviewing} onChange={function (event) { return updateDraft(candidate, { content: event.currentTarget.value }); }} aria-label={"Memory candidate ".concat(candidate.id, " content")}/>
                <p>{candidate.reason}</p>
                <div className='flow__memory-controls'>
                    <label>
                        <span>Scope</span>
                        <select value={draft.scope || ''} disabled={props.busy || terminal} onChange={function (event) { return updateDraft(candidate, { scope: (event.currentTarget.value || undefined) }); }}>
                            <option value=''>Default</option>
                            {MEMORY_SCOPES.map(function (scope) { return <option key={scope} value={scope}>{scope}</option>; })}
                        </select>
                    </label>
                    <label>
                        <span>Target</span>
                        <input value={draft.target} disabled={props.busy || terminal} onChange={function (event) { return updateDraft(candidate, { target: event.currentTarget.value }); }} placeholder='Memory target'/>
                    </label>
                </div>
                <div className='flow__memory-actions'>
                    <button type='button' disabled={props.busy || terminal} onClick={function () { return updateDraft(candidate, { reviewing: !draft.reviewing }); }}>
                        {draft.reviewing ? 'Preview' : 'Review'}
                    </button>
                    <button type='button' disabled={props.busy || terminal} onClick={function () { return props.onDecide(candidate.id, 'rejected', content || candidate.content, draft.scope, draft.target || undefined); }}>
                        Reject
                    </button>
                    <button type='button' disabled={props.busy || terminal || !content} onClick={function () { return props.onDecide(candidate.id, 'approved', content, draft.scope, draft.target || undefined); }}>
                        Write
                    </button>
                </div>
            </article>;
        })}
    </section>;
}
function RunList(props) {
    return <section className='flow__run-list'>
        <h4>{props.title}</h4>
        {props.items.length === 0 && <p>{props.empty}</p>}
        {props.items.map(function (item) { return <article key={item.id}>
            {item.onOpen
                ? <button type='button' className='flow__link-button' title={"Open ".concat(item.title)} onClick={item.onOpen}>
                    <i className='codicon codicon-go-to-file'/>
                    <strong>{(0, common_2.redactFlowSecretsText)(item.title)}</strong>
                </button>
                : <strong>{(0, common_2.redactFlowSecretsText)(item.title)}</strong>}
            {item.meta && <span>{(0, common_2.redactFlowSecretsText)(item.meta)}</span>}
        </article>; })}
    </section>;
}
function ArtifactBrowser(props) {
    return <section className='flow__artifact-browser'>
        <h4>Artifacts</h4>
        {props.run.artifacts.length === 0 && <p>No artifacts yet.</p>}
        {props.run.artifacts.length > 0 && <div className='flow__artifact-selector'>
            {props.run.artifacts.map(function (artifact) {
                var _a;
                return <button key={artifact.id} type='button' className={artifact.id === ((_a = props.selectedArtifact) === null || _a === void 0 ? void 0 : _a.id) ? 'flow__artifact-selector-item flow__artifact-selector-item--selected' : 'flow__artifact-selector-item'} title={"Preview ".concat(artifact.uri)} onClick={function () { return props.onSelectArtifact(artifact.id); }}>
                <i className={"codicon ".concat(artifactIcon(artifact))}/>
                <span>{artifactLabel(artifact.uri)}</span>
                <small>{artifactViewerLabel(artifact)}</small>
            </button>;
            })}
        </div>}
        {props.selectedArtifact && <ArtifactViewer run={props.run} artifact={props.selectedArtifact} onOpenArtifact={props.onOpenArtifact}/>}
    </section>;
}
function ArtifactViewer(props) {
    var workload = props.run.workloads.find(function (candidate) { return candidate.stateId === props.artifact.stateId; });
    var envelope = workload === null || workload === void 0 ? void 0 : workload.outputEnvelope;
    var outputPath = artifactOutputPath(props.artifact.uri);
    var effect = props.run.effects.find(function (candidate) { return candidate.artifactPath === outputPath || candidate.path === outputPath || candidate.id === props.artifact.id; });
    var viewer = artifactViewerKind(props.artifact);
    return <article className='flow__artifact-viewer'>
        <header>
            <div>
                <strong>{artifactLabel(props.artifact.uri)}</strong>
                <span>{props.artifact.uri}</span>
            </div>
            <button type='button' title={"Open ".concat(props.artifact.uri)} onClick={function () { return props.onOpenArtifact(props.artifact.uri); }}>
                <i className='codicon codicon-go-to-file'/>
            </button>
        </header>
        {viewer === 'markdown' && <MarkdownReportViewer report={(envelope === null || envelope === void 0 ? void 0 : envelope.report) || props.artifact.summary || ''}/>}
        {viewer === 'json-result' && <JsonResultViewer value={envelope || effect || props.artifact}/>}
        {viewer === 'jsonl-issues' && <JsonlIssuesViewer issues={(envelope === null || envelope === void 0 ? void 0 : envelope.issues) || []}/>}
        {viewer === 'patch' && <PatchViewer patch={(effect === null || effect === void 0 ? void 0 : effect.patch) || props.artifact.summary || ''}/>}
        {viewer === 'log' && <LogViewer effect={effect} summary={props.artifact.summary}/>}
        {viewer === 'image' && <ImageArtifactViewer artifact={props.artifact} effect={effect}/>}
        {viewer === 'contract' && <ContractViewer envelope={envelope} artifact={props.artifact}/>}
    </article>;
}
function JsonBlock(props) {
    return <section className='flow__json-block'>
        <h4>{props.title}</h4>
        <pre>{JSON.stringify((0, common_2.redactFlowSecretsValue)(props.value), undefined, 2)}</pre>
    </section>;
}
function EventSummary(props) {
    return <section className='flow__event-summary'>
        <h4>{props.title}</h4>
        {props.event ? <>
            <KeyValue label='Time' value={new Date(props.event.timestamp).toLocaleTimeString()}/>
            <KeyValue label='Message' value={props.event.message}/>
        </> : <p>Not observed.</p>}
    </section>;
}
function Panel(props) {
    return <section className='flow__panel'>
        <h3>{props.title}</h3>
        {props.children}
    </section>;
}
function KeyValue(props) {
    return <div className='flow__kv'>
        <span>{props.label}</span>
        <strong>{(0, common_2.redactFlowSecretsText)(props.value)}</strong>
    </div>;
}
function ValidationIssues(props) {
    return <div className='flow__validation'>
        {props.issues.map(function (issue) { return <span key={"".concat(issue.code, "-").concat(issue.path || issue.message)}>{issue.message}</span>; })}
    </div>;
}
function CanvasMinimap(props) {
    var scale = Math.min(142 / props.width, 86 / props.height);
    var visibleWorld = {
        x: clamp(-props.viewport.x / props.viewport.zoom, 0, props.width),
        y: clamp(-props.viewport.y / props.viewport.zoom, 0, props.height),
        width: clamp(props.viewportSize.width / props.viewport.zoom, 0, props.width),
        height: clamp(props.viewportSize.height / props.viewport.zoom, 0, props.height)
    };
    return <div className='flow__flow-minimap' aria-hidden='true'>
        {props.nodes.map(function (node) { return <span key={node.id} className={"flow__flow-minimap-node flow__flow-minimap-node--".concat(node.status)} style={{
                left: node.x * scale,
                top: node.y * scale,
                width: Math.max(6, node.width * scale),
                height: Math.max(4, node.height * scale)
            }}/>; })}
        <span className='flow__flow-minimap-viewport' style={{
            left: visibleWorld.x * scale,
            top: visibleWorld.y * scale,
            width: Math.max(8, visibleWorld.width * scale),
            height: Math.max(6, visibleWorld.height * scale)
        }}/>
    </div>;
}
function edgeMidpoint(edge, axis) {
    if (edge.points.length < 2) {
        return 0;
    }
    return (edge.points[0][axis] + edge.points[1][axis]) / 2;
}
function edgePath(edge) {
    var from = edge.points[0] || { x: 0, y: 0 };
    var to = edge.points[1] || from;
    var curve = Math.max(48, Math.abs(to.x - from.x) * 0.45);
    return "M ".concat(from.x, " ").concat(from.y, " C ").concat(from.x + curve, " ").concat(from.y, ", ").concat(to.x - curve, " ").concat(to.y, ", ").concat(to.x, " ").concat(to.y);
}
var AGENCY_CANVAS_STATE_TYPES = [
    'input',
    'context',
    'agent',
    'parallel',
    'dynamic_parallel',
    'tournament',
    'join',
    'condition',
    'gate',
    'command',
    'memory_write',
    'report'
];
var AGENCY_CANVAS_BRANCH_TYPES = [
    'agent',
    'condition',
    'command',
    'memory_write',
    'report'
];
var WORKFLOW_HISTORY_LIMIT = 50;
function pushWorkflowHistory(stack, entry) {
    return __spreadArray(__spreadArray([], stack, true), [entry], false).slice(-WORKFLOW_HISTORY_LIMIT);
}
function initialPatternParameterValues(pattern) {
    if (!pattern) {
        return {};
    }
    return Object.fromEntries(pattern.parameters
        .filter(function (parameter) { return parameter.defaultValue !== undefined; })
        .map(function (parameter) { return [parameter.id, parameter.defaultValue]; }));
}
function patternStageDefaultProfileId(pattern, parameters, stage) {
    var parameterId = stage.profileParameterId;
    if (parameterId) {
        var configured = parameters[parameterId];
        if (typeof configured === 'string' && configured.trim()) {
            return configured.trim();
        }
        var parameter = pattern.parameters.find(function (candidate) { return candidate.id === parameterId; });
        if (typeof (parameter === null || parameter === void 0 ? void 0 : parameter.defaultValue) === 'string') {
            return parameter.defaultValue;
        }
    }
    return 'inherit';
}
function profileLabel(profiles, profileId) {
    var _a;
    return ((_a = profiles.find(function (profile) { return profile.id === profileId; })) === null || _a === void 0 ? void 0 : _a.name) || profileId || 'inherit';
}
function MarkdownReportViewer(props) {
    var blocks = parseMarkdownBlocks((0, common_2.redactFlowSecretsText)(props.report) || 'No report content available in the workload envelope.');
    return <div className='flow__artifact-markdown'>
        {blocks.map(function (block, index) {
            if (block.kind === 'heading') {
                return <h5 key={index}>{block.text}</h5>;
            }
            if (block.kind === 'list') {
                return <ul key={index}>{block.items.map(function (item, itemIndex) { return <li key={itemIndex}>{item}</li>; })}</ul>;
            }
            if (block.kind === 'code') {
                return <pre key={index}>{block.text}</pre>;
            }
            return <p key={index}>{block.text}</p>;
        })}
    </div>;
}
function JsonResultViewer(props) {
    return <div className='flow__artifact-json'>
        <pre>{JSON.stringify((0, common_2.redactFlowSecretsValue)(props.value), undefined, 2)}</pre>
    </div>;
}
function JsonlIssuesViewer(props) {
    var issues = (0, common_2.redactFlowSecretsValue)(props.issues);
    return <div className='flow__artifact-issues'>
        {issues.length === 0 && <p>No issues recorded.</p>}
        {issues.map(function (issue, index) { return <article key={"".concat(issue.type, "-").concat(index)}>
            <strong>{issue.severity} / {issue.type}</strong>
            <span>{issue.summary}</span>
            {(issue.producer || issue.impact) && <small>{[issue.producer, issue.impact].filter(Boolean).join(' / ')}</small>}
        </article>; })}
    </div>;
}
function PatchViewer(props) {
    var lines = ((0, common_2.redactFlowSecretsText)(props.patch) || 'No patch content available in the run data.').split(/\r?\n/);
    return <pre className='flow__artifact-patch'>
        {lines.map(function (line, index) { return <span key={index} className={patchLineClass(line)}>{line || ' '}</span>; })}
    </pre>;
}
function LogViewer(props) {
    var effect = (0, common_2.redactFlowSecretsValue)(props.effect);
    var stdout = (effect === null || effect === void 0 ? void 0 : effect.stdout) || '';
    var stderr = (effect === null || effect === void 0 ? void 0 : effect.stderr) || '';
    var text = [
        (0, common_2.redactFlowSecretsText)(props.summary),
        (effect === null || effect === void 0 ? void 0 : effect.command) ? "$ ".concat(effect.command) : undefined,
        stdout ? "stdout:\n".concat(stdout) : undefined,
        stderr ? "stderr:\n".concat(stderr) : undefined
    ].filter(Boolean).join('\n\n') || 'No log output available in the run data.';
    return <pre className='flow__artifact-log'>{(0, common_2.redactFlowSecretsText)(text)}</pre>;
}
function ImageArtifactViewer(props) {
    var _a, _b;
    var canEmbed = /^(https?:|file:)/i.test(props.artifact.uri);
    var error = ((_a = props.effect) === null || _a === void 0 ? void 0 : _a.status) === 'blocked' || ((_b = props.effect) === null || _b === void 0 ? void 0 : _b.status) === 'failed'
        ? effectBlockReason(props.effect)
        : undefined;
    return <div className='flow__artifact-image'>
        {canEmbed ? <img src={props.artifact.uri} alt={artifactLabel(props.artifact.uri)}/> : <p>Image preview requires opening the materialized artifact.</p>}
        {error && <p className='flow__artifact-image-error'>Image effect error: {error}</p>}
        {props.effect && <div className='flow__artifact-image-meta'>
            <KeyValue label='Provider' value={props.effect.provider || 'missing'}/>
            <KeyValue label='MIME' value={props.effect.mimeType || 'unknown'}/>
            <KeyValue label='Bytes' value={typeof props.effect.bytes === 'number' ? props.effect.bytes.toString() : 'unknown'}/>
        </div>}
        {props.artifact.summary && <span>{(0, common_2.redactFlowSecretsText)(props.artifact.summary)}</span>}
    </div>;
}
function ContractViewer(props) {
    var _a, _b, _c;
    var contracts = ((_a = props.envelope) === null || _a === void 0 ? void 0 : _a.artifacts.filter(function (artifact) { return /contract|work-order/i.test(artifact.path); })) || [];
    return <div className='flow__artifact-contract'>
        <KeyValue label='Artifact' value={props.artifact.uri}/>
        <KeyValue label='Kind' value={props.artifact.kind}/>
        {((_c = (_b = props.envelope) === null || _b === void 0 ? void 0 : _b.result) === null || _c === void 0 ? void 0 : _c.summary) && <KeyValue label='Summary' value={props.envelope.result.summary}/>}
        {contracts.length > 0 && <ul>
            {contracts.map(function (contract) { return <li key={contract.id}>{contract.path}{contract.type ? " / ".concat(contract.type) : ''}</li>; })}
        </ul>}
        {contracts.length === 0 && <p>No contract package metadata available in the workload envelope.</p>}
    </div>;
}
function validationIssueTarget(workflow, issue) {
    var _a, _b, _c;
    var branchMatch = (_a = issue.path) === null || _a === void 0 ? void 0 : _a.match(/^states\.[^.]+\.branches\.([^.]+)/);
    if (branchMatch) {
        return { kind: 'state', id: branchMatch[1] };
    }
    var stateMatch = (_b = issue.path) === null || _b === void 0 ? void 0 : _b.match(/^states\.([^.]+)/);
    if (stateMatch) {
        return { kind: 'state', id: stateMatch[1] };
    }
    var transitionMatch = (_c = issue.path) === null || _c === void 0 ? void 0 : _c.match(/^transitions\.(\d+)/);
    if (transitionMatch) {
        var transition = workflow.transitions[Number(transitionMatch[1])];
        if (transition) {
            return { kind: 'transition', id: transitionKey(transition) };
        }
    }
    return undefined;
}
function validationIssueSeverity(issues) {
    if (issues.some(function (issue) { return issue.code.includes('invalid') || issue.code.includes('required'); })) {
        return 'error';
    }
    return issues.length > 0 ? 'warning' : undefined;
}
function groupWorkflowStructuralDiff(items) {
    var order = ['metadata', 'template', 'agent', 'capability', 'guard', 'state', 'transition'];
    return order
        .map(function (kind) { return ({ kind: kind, items: items.filter(function (item) { return item.kind === kind; }) }); })
        .filter(function (group) { return group.items.length > 0; });
}
function workflowSourcePathForSelection(workflow, selectedKind, selectedId) {
    var _a;
    if (selectedKind === 'state') {
        var directState = workflow.states[selectedId];
        if (directState) {
            return "states.".concat(selectedId);
        }
        for (var _i = 0, _b = Object.entries(workflow.states); _i < _b.length; _i++) {
            var _c = _b[_i], stateId = _c[0], state = _c[1];
            if ((_a = state.branches) === null || _a === void 0 ? void 0 : _a[selectedId]) {
                return "states.".concat(stateId, ".branches.").concat(selectedId);
            }
        }
    }
    var transitionIndex = workflow.transitions.findIndex(function (transition) { return transitionKey(transition) === selectedId; });
    return transitionIndex >= 0 ? "transitions.".concat(transitionIndex) : undefined;
}
function transitionKey(transition) {
    return transition.id || "".concat(transition.from, "-").concat(transition.to);
}
function stateTypeLabel(stateType) {
    return stateType.replace(/_/g, ' ');
}
var AGENT_IDENTITY_LABELS = {
    architect: 'Arquitect',
    backend: 'Backend',
    frontend: 'Frontend',
    qa: 'QA',
    security: 'Security',
    reviewer: 'Reviewer'
};
function nodeIdentityLabel(agent) {
    var normalized = agent === null || agent === void 0 ? void 0 : agent.trim();
    if (!normalized) {
        return undefined;
    }
    var mapped = AGENT_IDENTITY_LABELS[normalized.toLowerCase()];
    if (mapped) {
        return mapped;
    }
    return normalized
        .replace(/[_-]+/g, ' ')
        .split(/\s+/)
        .filter(Boolean)
        .map(function (word) { return word.length <= 3 && word === word.toUpperCase()
        ? word
        : "".concat(word.charAt(0).toUpperCase()).concat(word.slice(1).toLowerCase()); })
        .join(' ');
}
function stateTypeIcon(stateType) {
    switch (stateType) {
        case 'input':
            return 'codicon-inbox';
        case 'context':
            return 'codicon-library';
        case 'agent':
            return 'codicon-hubot';
        case 'parallel':
            return 'codicon-git-branch';
        case 'dynamic_parallel':
            return 'codicon-extensions';
        case 'tournament':
            return 'codicon-symbol-event';
        case 'join':
            return 'codicon-git-merge';
        case 'condition':
            return 'codicon-symbol-boolean';
        case 'gate':
            return 'codicon-pass';
        case 'command':
            return 'codicon-terminal';
        case 'memory_write':
            return 'codicon-database';
        case 'report':
            return 'codicon-file-text';
        default:
            return 'codicon-circle-large-outline';
    }
}
function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
function providerSummary(provider) {
    if (!(provider === null || provider === void 0 ? void 0 : provider.providerId)) {
        return 'default provider / default model';
    }
    return "".concat(provider.providerId, " / ").concat(provider.modelId || 'default model');
}
function providerSelectionOrUndefined(providerId, modelId, options) {
    var trimmedProviderId = providerId === null || providerId === void 0 ? void 0 : providerId.trim();
    var trimmedModelId = modelId === null || modelId === void 0 ? void 0 : modelId.trim();
    if (!trimmedProviderId && !trimmedModelId && !options) {
        return undefined;
    }
    return compactObject({
        providerId: trimmedProviderId || 'theia-language-model',
        modelId: trimmedModelId,
        options: options
    });
}
function externalPromptText(options) {
    for (var _i = 0, _a = [options.prompt, options.message, options.input]; _i < _a.length; _i++) {
        var value = _a[_i];
        if (typeof value === 'string' && value.trim()) {
            return value.trim();
        }
    }
    return undefined;
}
function modelExecutionOrUndefined(modelExecution) {
    var compacted = compactObject(modelExecution);
    return Object.keys(compacted).length > 0 ? compacted : undefined;
}
function patternRoleOverrideOrUndefined(override) {
    var compacted = compactObject(override);
    return isEmptyPatternRoleOverride(compacted) ? undefined : compacted;
}
function patternRoleOverridesOrUndefined(overrides) {
    var compacted = {};
    for (var _i = 0, _a = Object.entries(overrides); _i < _a.length; _i++) {
        var _b = _a[_i], roleId = _b[0], override = _b[1];
        var compactOverride = patternRoleOverrideOrUndefined(override);
        if (compactOverride) {
            compacted[roleId] = compactOverride;
        }
    }
    return Object.keys(compacted).length > 0 ? compacted : undefined;
}
function isEmptyPatternRoleOverride(override) {
    return !override.profileId && !override.provider && !override.modelExecution;
}
function uniqueStrings(values) {
    return __spreadArray([], new Set(values), true);
}
function workflowOutputSourceOptions(workflow) {
    var options = ['input/request.md'];
    var visit = function (state) {
        for (var _i = 0, _a = state.outputs || []; _i < _a.length; _i++) {
            var output = _a[_i];
            options.push(output);
        }
        for (var _b = 0, _c = Object.values(state.branches || {}); _b < _c.length; _b++) {
            var branch = _c[_b];
            visit(branch);
        }
    };
    for (var _i = 0, _a = Object.values(workflow.states || {}); _i < _a.length; _i++) {
        var state = _a[_i];
        visit(state);
    }
    return options;
}
function textToDeliverables(value) {
    var deliverables = value
        .split(/\r?\n/)
        .map(function (line) { return line.trim(); })
        .filter(Boolean)
        .map(function (line) {
        var _a = line.split('|').map(function (part) { return part.trim(); }), path = _a[0], description = _a[1], kind = _a[2], required = _a[3];
        return compactObject({
            path: path,
            description: description,
            kind: kind,
            required: requiredToBoolean(required)
        });
    })
        .filter(function (deliverable) { return Boolean(deliverable.path); });
    return deliverables.length ? deliverables : undefined;
}
function deliverablesToText(value) {
    return (value || []).map(function (deliverable) { return [
        deliverable.path,
        deliverable.description,
        deliverable.kind,
        deliverable.required === undefined ? undefined : String(deliverable.required)
    ].filter(function (entry) { return entry !== undefined && entry !== ''; }).join(' | '); }).join('\n');
}
function requiredToBoolean(value) {
    if (!value) {
        return undefined;
    }
    var normalized = value.trim().toLowerCase();
    if (['true', 'required', 'yes', 'y', '1'].includes(normalized)) {
        return true;
    }
    if (['false', 'optional', 'no', 'n', '0'].includes(normalized)) {
        return false;
    }
    return undefined;
}
function textToList(value) {
    var items = value.split(/\r?\n|,/).map(function (item) { return item.trim(); }).filter(Boolean);
    return items.length ? items : undefined;
}
function listToText(value) {
    return (value || []).join('\n');
}
function emptyToUndefined(value) {
    var trimmed = value.trim();
    return trimmed || undefined;
}
function numberOrUndefined(value) {
    if (value.trim() === '') {
        return undefined;
    }
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}
function retryOrUndefined(max, counter) {
    if (max === undefined && !counter) {
        return undefined;
    }
    return { max: max !== null && max !== void 0 ? max : 0, counter: counter };
}
function compactTransition(transition) {
    return compactObject(transition);
}
function formatGuard(guard) {
    return guard ? JSON.stringify(guard, undefined, 2) : '';
}
function compactObject(value) {
    var compacted = {};
    for (var _i = 0, _a = Object.entries(value); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], entry = _b[1];
        if (entry === undefined || entry === '') {
            continue;
        }
        if (Array.isArray(entry) && entry.length === 0) {
            continue;
        }
        if (isPlainObject(entry)) {
            var nested = compactObject(entry);
            if (Object.keys(nested).length === 0) {
                continue;
            }
            compacted[key] = nested;
            continue;
        }
        compacted[key] = entry;
    }
    return compacted;
}
function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
function isTerminalRunStatus(status) {
    return status === 'completed' || status === 'failed' || status === 'cancelled';
}
function isReadOnlyRun(run) {
    var _a;
    return ((_a = run === null || run === void 0 ? void 0 : run.audit) === null || _a === void 0 ? void 0 : _a.readOnly) === true;
}
function relevantStateEvents(events, stateId, workloadIds, gateIds) {
    return events
        .filter(function (event) { return event.stateId === stateId || Boolean(event.workloadId && workloadIds.includes(event.workloadId)) || Boolean(event.gateId && gateIds.includes(event.gateId)); })
        .slice()
        .reverse();
}
function lastTransitionEvent(events, transition, type) {
    return events.slice().reverse().find(function (event) { return event.type === type && matchesTransitionEvent(event, transition); });
}
function matchesTransitionEvent(event, transition) {
    var transitionId = transition.id || "".concat(transition.from, "-").concat(transition.to);
    if (event.transitionId === transitionId || event.transitionId === transition.id) {
        return true;
    }
    var payload = event.payload || {};
    return payload.from === transition.from && payload.to === transition.to || payload.transitionId === transitionId;
}
function artifactLabel(artifactUri) {
    var path = artifactUri.replace(/^flow:\/\/[^/]+\//, '').replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
    return path.split(/[\\/]/).filter(Boolean).pop() || artifactUri;
}
function effectBlockReason(effect) {
    var _a;
    if (effect.status !== 'blocked' && effect.status !== 'failed') {
        return undefined;
    }
    var candidates = [
        effect.stderr,
        effect.stdout,
        effect.summary,
        effect.approvalPolicy ? "Approval policy: ".concat(effect.approvalPolicy) : undefined
    ];
    return (_a = candidates.find(function (value) { return Boolean(value && value.trim()); })) === null || _a === void 0 ? void 0 : _a.trim();
}
function isFileEffectForReview(effect) {
    return effect.kind === 'file' || effect.kind === 'file_write' || Boolean(effect.type && effect.type.startsWith('file.'));
}
function isImageEffectForReview(effect) {
    return effect.kind === 'image' || effect.type === 'image.generate' || effect.type === 'image.generated' || effect.type === 'image';
}
function artifactViewerKind(artifact) {
    var path = artifactOutputPath(artifact.uri).toLowerCase();
    if (artifact.kind === 'contract' || artifact.kind === 'work_order' || path.includes('contract') || path.includes('work-order')) {
        return 'contract';
    }
    if (artifact.kind === 'patch' || /\.(patch|diff)$/i.test(path)) {
        return 'patch';
    }
    if (artifact.kind === 'log' || /\.(log|out|err)$/i.test(path)) {
        return 'log';
    }
    if (/\.jsonl$/i.test(path) || path.endsWith('issues.jsonl')) {
        return 'jsonl-issues';
    }
    if (/\.json$/i.test(path)) {
        return 'json-result';
    }
    if (/\.(png|jpe?g|gif|webp|svg)$/i.test(path)) {
        return 'image';
    }
    return 'markdown';
}
function artifactViewerLabel(artifact) {
    switch (artifactViewerKind(artifact)) {
        case 'markdown':
            return 'Markdown report';
        case 'json-result':
            return 'JSON result';
        case 'jsonl-issues':
            return 'JSONL issues';
        case 'patch':
            return 'Diff/patch';
        case 'log':
            return 'Logs';
        case 'image':
            return 'Image';
        case 'contract':
            return 'Contract';
    }
}
function artifactIcon(artifact) {
    switch (artifactViewerKind(artifact)) {
        case 'image':
            return 'codicon-file-media';
        case 'patch':
            return 'codicon-diff';
        case 'log':
            return 'codicon-terminal';
        case 'json-result':
        case 'jsonl-issues':
            return 'codicon-json';
        case 'contract':
            return 'codicon-law';
        case 'markdown':
            return 'codicon-markdown';
    }
}
function artifactOutputPath(artifactUri) {
    return artifactUri.replace(/^flow:\/\/[^/]+\//, '').replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
}
function patchLineClass(line) {
    if (line.startsWith('+') && !line.startsWith('+++')) {
        return 'flow__artifact-patch-added';
    }
    if (line.startsWith('-') && !line.startsWith('---')) {
        return 'flow__artifact-patch-removed';
    }
    if (line.startsWith('@@')) {
        return 'flow__artifact-patch-hunk';
    }
    return '';
}
function parseMarkdownBlocks(markdown) {
    var blocks = [];
    var list = [];
    var code;
    var flushList = function () {
        if (list.length > 0) {
            blocks.push({ kind: 'list', items: list });
            list = [];
        }
    };
    for (var _i = 0, _a = markdown.split(/\r?\n/); _i < _a.length; _i++) {
        var line = _a[_i];
        if (line.trim().startsWith('```')) {
            if (code) {
                blocks.push({ kind: 'code', text: code.join('\n') });
                code = undefined;
            }
            else {
                flushList();
                code = [];
            }
            continue;
        }
        if (code) {
            code.push(line);
            continue;
        }
        var heading = line.match(/^#{1,5}\s+(.+)$/);
        if (heading) {
            flushList();
            blocks.push({ kind: 'heading', text: heading[1] });
            continue;
        }
        var item = line.match(/^\s*[-*]\s+(.+)$/);
        if (item) {
            list.push(item[1]);
            continue;
        }
        flushList();
        if (line.trim()) {
            blocks.push({ kind: 'paragraph', text: line.trim() });
        }
    }
    flushList();
    if (code) {
        blocks.push({ kind: 'code', text: code.join('\n') });
    }
    return blocks;
}
function pathTitle(relativePath) {
    var fileName = relativePath.split(/[\\/]/).pop() || relativePath;
    return fileName.replace(/\.(markdown|md)$/i, '').replace(/[-_]+/g, ' ').replace(/\b\w/g, function (match) { return match.toUpperCase(); });
}
function copyPath(relativePath) {
    var extensionMatch = relativePath.match(/(\.markdown|\.md)$/i);
    var extension = (extensionMatch === null || extensionMatch === void 0 ? void 0 : extensionMatch[1]) || '.md';
    return "".concat(relativePath.slice(0, relativePath.length - extension.length), "-copy").concat(extension);
}
function formatTimestamp(value) {
    try {
        return new Date(value).toLocaleString();
    }
    catch (_a) {
        return value;
    }
}
function renderWorkflowVersions(versions) {
    if (versions.length === 0) {
        return 'No workflow versions recorded yet.';
    }
    return versions.map(function (version) {
        var diff = version.diff.length
            ? version.diff.map(function (item) { return "  - ".concat(item.kind, "/").concat(item.change, " ").concat(item.id, ": ").concat(item.summary); }).join('\n')
            : '  - No structural changes';
        return [
            "".concat(version.id),
            "  Created: ".concat(formatTimestamp(version.createdAt)),
            "  Author: ".concat(version.author),
            "  Origin: ".concat(version.origin),
            version.message ? "  Message: ".concat(version.message) : undefined,
            diff
        ].filter(Boolean).join('\n');
    }).join('\n\n');
}
function resolveExecutionMode(runMode, hintMode, kernelBridge) {
    return runMode || hintMode || (kernelBridge === 'external' ? 'kernel_external' : 'kernel_simulated');
}
function executionModeLabel(mode) {
    switch (mode) {
        case 'kernel_external':
            return 'Kernel externo';
        case 'kernel_simulated':
            return 'Kernel simulado';
        case 'kernel_simulated_fallback_error':
            return 'Fallback por erro';
        case 'capability_missing':
            return 'Capability ausente';
        default:
            return 'Desconhecido';
    }
}
function executionModeClassName(mode) {
    switch (mode) {
        case 'kernel_external':
            return 'external';
        case 'kernel_simulated':
            return 'simulated';
        case 'kernel_simulated_fallback_error':
            return 'fallback-error';
        case 'capability_missing':
            return 'capability-missing';
        default:
            return 'unknown';
    }
}
function CapabilityStatus(props) {
    var capabilities = props.capabilities, workflow = props.workflow, executionMode = props.executionMode, executionModeMessage = props.executionModeMessage;
    var capabilityRows = capabilityStatusRows(capabilities);
    var missingRequiredCapabilities = workflow
        ? (0, common_2.resolveFlowWorkflowCapabilities)(workflow, capabilities).missing
        : [];
    var modeRows = [
        {
            label: 'Kernel',
            value: executionModeLabel(executionMode),
            tone: executionModeClassName(executionMode),
            detail: executionModeMessage
        },
        {
            label: 'Host',
            value: demoModeLabel(capabilities.demoMode),
            tone: capabilities.demoMode === 'off' ? 'available' : 'mock',
            detail: capabilities.deterministicFallback && capabilities.deterministicFallbackReason ? capabilities.deterministicFallbackReason : undefined
        },
        {
            label: 'Modelo',
            value: providerAvailabilityLabel(capabilities.llmAgentProvider),
            tone: providerAvailabilityTone(capabilities.llmAgentProvider)
        },
        {
            label: 'Atualizacao',
            value: capabilities.runEventStream ? 'Tempo real' : 'Manual',
            tone: capabilities.runEventStream ? 'available' : 'mock',
            detail: capabilities.runEventStream
                ? 'Canvas, kanban e eventos acompanham as atualizacoes do kernel.'
                : 'Atualizar ou executar tick manualmente e o fallback sem eventos do kernel.'
        }
    ];
    return <section className='flow__runtime-status' aria-label='Flow runtime status'>
        <div className='flow__runtime-status-grid'>
            {modeRows.map(function (row) { return <StatusPill key={row.label} {...row}/>; })}
            {capabilityRows.map(function (row) { return <StatusPill key={row.label} {...row}/>; })}
        </div>
        {missingRequiredCapabilities.length > 0 && <div className='flow__runtime-status-warning'>
            <strong>Faltando:</strong> {missingRequiredCapabilities.join('; ')}
        </div>}
    </section>;
}
function StatusPill(props) {
    return <div className={"flow__status-pill flow__status-pill--".concat(props.tone)} title={props.detail || "".concat(props.label, ": ").concat(props.value)}>
        <span>{props.label}</span>
        <strong>{props.value}</strong>
    </div>;
}
function capabilityStatusRows(capabilities) {
    return [
        {
            label: 'Agentes',
            value: capabilityAvailabilityLabel(capabilities.llmAgentExecution),
            tone: capabilityAvailabilityTone(capabilities.llmAgentExecution)
        },
        {
            label: 'Arquivos',
            value: "".concat(capabilityAvailabilityLabel(capabilities.filesystemEdit), " / ").concat(policyAvailabilityLabel(capabilities.filesystemEditPolicy)),
            tone: capabilityAndPolicyTone(capabilities.filesystemEdit, capabilities.filesystemEditPolicy)
        },
        {
            label: 'Imagens',
            value: "".concat(capabilityAvailabilityLabel(capabilities.imageGeneration), " / ").concat(providerAvailabilityLabel(capabilities.imageProvider)),
            tone: capabilityAndProviderTone(capabilities.imageGeneration, capabilities.imageProvider)
        },
        {
            label: 'Comandos',
            value: "".concat(capabilities.commandExecution ? 'OK' : 'Bloqueado', " / ").concat(policyAvailabilityLabel(capabilities.commandExecutionPolicy)),
            tone: capabilities.commandExecution && capabilities.commandExecutionPolicy === 'configured' ? 'available' : 'blocked'
        },
        {
            label: 'Memoria',
            value: capabilities.memoryProvider,
            tone: capabilities.memoryProvider === 'missing' ? 'missing' : 'available'
        },
        {
            label: 'Eventos',
            value: capabilities.runEventStream ? 'Tempo real' : 'Manual',
            tone: capabilities.runEventStream ? 'available' : 'mock'
        }
    ];
}
function demoModeLabel(mode) {
    switch (mode) {
        case 'demo':
            return 'Demo';
        case 'e2e':
            return 'E2E';
        default:
            return 'Normal';
    }
}
function capabilityAvailabilityLabel(value) {
    switch (value) {
        case 'available':
            return 'OK';
        case 'mock':
            return 'Mock';
        case 'blocked':
            return 'Bloqueado';
        default:
            return 'Ausente';
    }
}
function providerAvailabilityLabel(value) {
    switch (value) {
        case 'configured':
            return 'Configurado';
        case 'mock':
            return 'Mock';
        default:
            return 'Ausente';
    }
}
function policyAvailabilityLabel(value) {
    switch (value) {
        case 'configured':
            return 'Permitido';
        case 'blocked':
            return 'Bloqueado';
        case 'missing':
            return 'Ausente';
        default:
            return value;
    }
}
function capabilityAvailabilityTone(value) {
    if (value === 'available') {
        return 'available';
    }
    if (value === 'mock') {
        return 'mock';
    }
    return value === 'blocked' ? 'blocked' : 'missing';
}
function providerAvailabilityTone(value) {
    if (value === 'configured') {
        return 'available';
    }
    return value === 'mock' ? 'mock' : 'missing';
}
function capabilityAndProviderTone(capability, provider) {
    if (capability === 'available' && provider === 'configured') {
        return 'available';
    }
    if (capability === 'mock' || provider === 'mock') {
        return 'mock';
    }
    return capability === 'blocked' ? 'blocked' : 'missing';
}
function capabilityAndPolicyTone(capability, policy) {
    if (capability === 'available' && policy === 'configured') {
        return 'available';
    }
    if (capability === 'mock') {
        return 'mock';
    }
    if (capability === 'blocked' || policy === 'blocked') {
        return 'blocked';
    }
    return 'missing';
}
function classifyExecutionModeFromError(error) {
    var message = error instanceof Error ? error.message : String(error);
    if (!message) {
        return undefined;
    }
    if (message.includes('Missing Flow host capability')) {
        return {
            executionModeHint: 'capability_missing',
            executionModeHintMessage: 'Capability ausente para o workflow.'
        };
    }
    return undefined;
}

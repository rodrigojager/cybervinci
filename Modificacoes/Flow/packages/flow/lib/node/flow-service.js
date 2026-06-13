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
exports.FlowServiceImpl = void 0;
var inversify_1 = require("@theia/core/shared/inversify");
var ai_core_1 = require("@theia/ai-core");
var codex_provider_service_1 = require("@cybervinci/codex-provider/lib/common/codex-provider-service");
var common_1 = require("../common");
var flow_approval_policy_1 = require("../common/flow-approval-policy");
var flow_kernel_bridge_1 = require("./flow-kernel-bridge");
var agent_markdown_store_1 = require("./agent-markdown-store");
var flow_store_1 = require("./flow-store");
var markdown_workload_store_1 = require("./markdown-workload-store");
var memory_adapter_1 = require("./memory-adapter");
var file_effect_host_adapter_1 = require("./file-effect-host-adapter");
var image_effect_host_adapter_1 = require("./image-effect-host-adapter");
var FlowServiceImpl = function () {
    var _classDecorators = [(0, inversify_1.injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _store_decorators;
    var _store_initializers = [];
    var _store_extraInitializers = [];
    var _workloadStore_decorators;
    var _workloadStore_initializers = [];
    var _workloadStore_extraInitializers = [];
    var _agentMarkdownStore_decorators;
    var _agentMarkdownStore_initializers = [];
    var _agentMarkdownStore_extraInitializers = [];
    var _kernelBridge_decorators;
    var _kernelBridge_initializers = [];
    var _kernelBridge_extraInitializers = [];
    var _memory_decorators;
    var _memory_initializers = [];
    var _memory_extraInitializers = [];
    var _fileEffectHostAdapter_decorators;
    var _fileEffectHostAdapter_initializers = [];
    var _fileEffectHostAdapter_extraInitializers = [];
    var _imageEffectHostAdapter_decorators;
    var _imageEffectHostAdapter_initializers = [];
    var _imageEffectHostAdapter_extraInitializers = [];
    var _languageModelRegistry_decorators;
    var _languageModelRegistry_initializers = [];
    var _languageModelRegistry_extraInitializers = [];
    var _codexProviderService_decorators;
    var _codexProviderService_initializers = [];
    var _codexProviderService_extraInitializers = [];
    var FlowServiceImpl = _classThis = /** @class */ (function () {
        function FlowServiceImpl_1() {
            this.runStreams = new Map();
            this.openingRunStreams = new Set();
            this.store = __runInitializers(this, _store_initializers, void 0);
            this.workloadStore = (__runInitializers(this, _store_extraInitializers), __runInitializers(this, _workloadStore_initializers, void 0));
            this.agentMarkdownStore = (__runInitializers(this, _workloadStore_extraInitializers), __runInitializers(this, _agentMarkdownStore_initializers, void 0));
            this.kernelBridge = (__runInitializers(this, _agentMarkdownStore_extraInitializers), __runInitializers(this, _kernelBridge_initializers, void 0));
            this.memory = (__runInitializers(this, _kernelBridge_extraInitializers), __runInitializers(this, _memory_initializers, void 0));
            this.fileEffectHostAdapter = (__runInitializers(this, _memory_extraInitializers), __runInitializers(this, _fileEffectHostAdapter_initializers, void 0));
            this.imageEffectHostAdapter = (__runInitializers(this, _fileEffectHostAdapter_extraInitializers), __runInitializers(this, _imageEffectHostAdapter_initializers, void 0));
            this.languageModelRegistry = (__runInitializers(this, _imageEffectHostAdapter_extraInitializers), __runInitializers(this, _languageModelRegistry_initializers, void 0));
            this.codexProviderService = (__runInitializers(this, _languageModelRegistry_extraInitializers), __runInitializers(this, _codexProviderService_initializers, void 0));
            __runInitializers(this, _codexProviderService_extraInitializers);
        }
        FlowServiceImpl_1.prototype.setClient = function (client) {
            this.client = client;
        };
        FlowServiceImpl_1.prototype.dispose = function () {
            for (var _i = 0, _a = this.runStreams.values(); _i < _a.length; _i++) {
                var dispose = _a[_i];
                dispose();
            }
            this.runStreams.clear();
            this.openingRunStreams.clear();
        };
        FlowServiceImpl_1.prototype.getCapabilities = function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.getRuntimeCapabilities()];
                });
            });
        };
        FlowServiceImpl_1.prototype.getAiAuthoringSpec = function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, (0, common_1.getFlowAiAuthoringSpec)()];
                });
            });
        };
        FlowServiceImpl_1.prototype.getSnapshot = function (request) {
            return __awaiter(this, void 0, void 0, function () {
                var workflows, runs, activeWorkflow, capabilities, syncedActiveRun, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.ensureWorkflows(request.workspaceRootUri)];
                        case 1:
                            workflows = _b.sent();
                            return [4 /*yield*/, this.store.listRuns(request.workspaceRootUri)];
                        case 2:
                            runs = _b.sent();
                            activeWorkflow = workflows[0];
                            return [4 /*yield*/, this.getRuntimeCapabilities()];
                        case 3:
                            capabilities = _b.sent();
                            if (!runs[0]) return [3 /*break*/, 5];
                            return [4 /*yield*/, this.refreshRunFromKernel(request.workspaceRootUri, runs[0])];
                        case 4:
                            _a = _b.sent();
                            return [3 /*break*/, 6];
                        case 5:
                            _a = undefined;
                            _b.label = 6;
                        case 6:
                            syncedActiveRun = _a;
                            return [2 /*return*/, {
                                    workflows: workflows,
                                    activeWorkflow: activeWorkflow,
                                    activeRun: syncedActiveRun,
                                    validation: activeWorkflow ? (0, common_1.validateFlowWorkflow)(activeWorkflow) : undefined,
                                    capabilities: capabilities
                                }];
                    }
                });
            });
        };
        FlowServiceImpl_1.prototype.listWorkflows = function (request) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.ensureWorkflows(request.workspaceRootUri)];
                });
            });
        };
        FlowServiceImpl_1.prototype.listRuns = function (request) {
            return __awaiter(this, void 0, void 0, function () {
                var runs;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.store.listRuns(request.workspaceRootUri)];
                        case 1:
                            runs = _a.sent();
                            return [2 /*return*/, runs.map(function (run) { return (0, common_1.redactFlowRunForDisplay)(run); })];
                    }
                });
            });
        };
        FlowServiceImpl_1.prototype.listWorkflowTemplates = function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, (0, common_1.listFlowWorkflowTemplates)()];
                });
            });
        };
        FlowServiceImpl_1.prototype.listWorkflowPatterns = function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, (0, common_1.listFlowWorkflowPatterns)()];
                });
            });
        };
        FlowServiceImpl_1.prototype.listModelProfiles = function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, (0, common_1.listFlowModelProfiles)()];
                });
            });
        };
        FlowServiceImpl_1.prototype.listPipelinePresets = function (request) {
            return __awaiter(this, void 0, void 0, function () {
                var includeBuiltIn, includeWorkspace, builtIn, workspace, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            includeBuiltIn = request.includeBuiltIn !== false;
                            includeWorkspace = request.includeWorkspace !== false;
                            builtIn = includeBuiltIn ? (0, common_1.listBuiltInFlowPipelinePresets)() : [];
                            if (!includeWorkspace) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.store.listWorkspacePipelinePresets(request.workspaceRootUri)];
                        case 1:
                            _a = _b.sent();
                            return [3 /*break*/, 3];
                        case 2:
                            _a = [];
                            _b.label = 3;
                        case 3:
                            workspace = _a;
                            return [2 /*return*/, __spreadArray(__spreadArray([], builtIn, true), workspace, true)];
                    }
                });
            });
        };
        FlowServiceImpl_1.prototype.listAgentMarkdownFiles = function (request) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.agentMarkdownStore.listAgents(request.workspaceRootUri)];
                });
            });
        };
        FlowServiceImpl_1.prototype.getAgentMarkdownFile = function (request) {
            return __awaiter(this, void 0, void 0, function () {
                var file;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.agentMarkdownStore.readAgent(request.workspaceRootUri, request.relativePath, {
                                createIfMissing: request.createIfMissing,
                                title: request.title
                            })];
                        case 1:
                            file = _a.sent();
                            if (!file) {
                                throw new Error("Agent markdown \"".concat(request.relativePath, "\" was not found."));
                            }
                            return [2 /*return*/, file];
                    }
                });
            });
        };
        FlowServiceImpl_1.prototype.createAgentMarkdownFile = function (request) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.agentMarkdownStore.createAgent(request.workspaceRootUri, request.relativePath, {
                            title: request.title,
                            content: request.content
                        })];
                });
            });
        };
        FlowServiceImpl_1.prototype.duplicateAgentMarkdownFile = function (request) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.agentMarkdownStore.duplicateAgent(request.workspaceRootUri, request.sourceRelativePath, request.targetRelativePath, {
                            title: request.title
                        })];
                });
            });
        };
        FlowServiceImpl_1.prototype.renameAgentMarkdownFile = function (request) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.agentMarkdownStore.renameAgent(request.workspaceRootUri, request.sourceRelativePath, request.targetRelativePath)];
                });
            });
        };
        FlowServiceImpl_1.prototype.createWorkflowFromTemplate = function (request) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.store.createWorkflowFromTemplate(request.workspaceRootUri, request.templateId, {
                            workflowId: request.workflowId,
                            name: request.name,
                            description: request.description
                        })];
                });
            });
        };
        FlowServiceImpl_1.prototype.createWorkflowFromPreset = function (request) {
            return __awaiter(this, void 0, void 0, function () {
                var preset;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getPipelinePreset(request.workspaceRootUri, request.presetId)];
                        case 1:
                            preset = _a.sent();
                            return [4 /*yield*/, this.materializePresetAgents(request.workspaceRootUri, preset)];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, this.store.createWorkflowFromPreset(request.workspaceRootUri, preset, {
                                    workflowId: request.workflowId,
                                    name: request.name,
                                    description: request.description,
                                    agentNodeOverrides: request.agentNodeOverrides
                                })];
                    }
                });
            });
        };
        FlowServiceImpl_1.prototype.createWorkflowFromPattern = function (request) {
            return __awaiter(this, void 0, void 0, function () {
                var workflow, saved;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            workflow = (0, common_1.compileFlowWorkflowPattern)(request);
                            return [4 /*yield*/, this.store.createWorkflowFromPattern(request.workspaceRootUri, workflow, request.patternId)];
                        case 1:
                            saved = _a.sent();
                            return [4 /*yield*/, this.materializeWorkflowAgents(request.workspaceRootUri, saved)];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, saved];
                    }
                });
            });
        };
        FlowServiceImpl_1.prototype.createWorkflowFromAiAuthoringDraft = function (request) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.materializeAiAuthoringDraft(request.workspaceRootUri, request.draft)];
                });
            });
        };
        FlowServiceImpl_1.prototype.runWorkflowPattern = function (request) {
            return __awaiter(this, void 0, void 0, function () {
                var workflow;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.createWorkflowFromPattern(request)];
                        case 1:
                            workflow = _a.sent();
                            return [2 /*return*/, this.startRun({
                                    workspaceRootUri: request.workspaceRootUri,
                                    workflowId: workflow.id,
                                    prompt: request.prompt
                                })];
                    }
                });
            });
        };
        FlowServiceImpl_1.prototype.planDynamicWorkflow = function (request) {
            return __awaiter(this, void 0, void 0, function () {
                var workflows;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.listWorkflows(request)];
                        case 1:
                            workflows = _a.sent();
                            return [2 /*return*/, planDynamicWorkflow({
                                    prompt: request.prompt,
                                    workflows: workflows,
                                    patterns: (0, common_1.listFlowWorkflowPatterns)(),
                                    preferSaved: request.preferSaved
                                })];
                    }
                });
            });
        };
        FlowServiceImpl_1.prototype.runDynamicWorkflow = function (request) {
            return __awaiter(this, void 0, void 0, function () {
                var plan, workflow;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (request.authoringDraft) {
                                return [2 /*return*/, this.runAiAuthoringDraft(request)];
                            }
                            return [4 /*yield*/, this.planDynamicWorkflow(request)];
                        case 1:
                            plan = _a.sent();
                            if (plan.kind === 'saved_workflow' && plan.workflowId) {
                                return [2 /*return*/, this.startRun({
                                        workspaceRootUri: request.workspaceRootUri,
                                        workflowId: plan.workflowId,
                                        prompt: request.prompt
                                    })];
                            }
                            if (!(plan.kind === 'generated_workflow' && plan.workflow)) return [3 /*break*/, 4];
                            return [4 /*yield*/, this.store.createWorkflowFromGeneratedWorkflow(request.workspaceRootUri, plan.workflow, plan.reason)];
                        case 2:
                            workflow = _a.sent();
                            return [4 /*yield*/, this.materializeWorkflowAgents(request.workspaceRootUri, workflow)];
                        case 3:
                            _a.sent();
                            return [2 /*return*/, this.startRun({
                                    workspaceRootUri: request.workspaceRootUri,
                                    workflowId: workflow.id,
                                    prompt: request.prompt
                                })];
                        case 4:
                            if (!plan.patternId) {
                                throw new Error("Dynamic workflow planner did not select an executable workflow for prompt: ".concat(plan.reason));
                            }
                            return [2 /*return*/, this.runWorkflowPattern({
                                    workspaceRootUri: request.workspaceRootUri,
                                    patternId: plan.patternId,
                                    parameters: __assign(__assign({}, (plan.parameters || {})), (request.parameters || {})),
                                    roleOverrides: request.roleOverrides,
                                    prompt: request.prompt
                                })];
                    }
                });
            });
        };
        FlowServiceImpl_1.prototype.runAiAuthoringDraft = function (request) {
            return __awaiter(this, void 0, void 0, function () {
                var draft, prompt, workflow;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            draft = request.authoringDraft;
                            if (!draft) {
                                throw new Error('Dynamic workflow run is missing an AI authoring draft.');
                            }
                            prompt = draft.promptMarkdown || request.prompt;
                            if (draft.action === 'run_saved_workflow') {
                                if (!draft.savedWorkflowId) {
                                    throw new Error('AI authoring draft action "run_saved_workflow" requires savedWorkflowId.');
                                }
                                return [2 /*return*/, this.startRun({
                                        workspaceRootUri: request.workspaceRootUri,
                                        workflowId: draft.savedWorkflowId,
                                        prompt: prompt
                                    })];
                            }
                            return [4 /*yield*/, this.materializeAiAuthoringDraft(request.workspaceRootUri, draft)];
                        case 1:
                            workflow = _a.sent();
                            return [2 /*return*/, this.startRun({
                                    workspaceRootUri: request.workspaceRootUri,
                                    workflowId: workflow.id,
                                    prompt: prompt
                                })];
                    }
                });
            });
        };
        FlowServiceImpl_1.prototype.materializeAiAuthoringDraft = function (workspaceRootUri, draft) {
            return __awaiter(this, void 0, void 0, function () {
                var workflow, saved;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            if (draft.action === 'run_saved_workflow') {
                                if (!draft.savedWorkflowId) {
                                    throw new Error('AI authoring draft action "run_saved_workflow" requires savedWorkflowId.');
                                }
                                return [2 /*return*/, this.getWorkflow({ workspaceRootUri: workspaceRootUri, workflowId: draft.savedWorkflowId })];
                            }
                            if (draft.action === 'instantiate_pattern') {
                                if (!((_a = draft.pattern) === null || _a === void 0 ? void 0 : _a.patternId)) {
                                    throw new Error('AI authoring draft action "instantiate_pattern" requires pattern.patternId.');
                                }
                                return [2 /*return*/, this.createWorkflowFromPattern(__assign(__assign({}, draft.pattern), { workspaceRootUri: workspaceRootUri }))];
                            }
                            if (!(draft.action === 'create_workflow')) return [3 /*break*/, 3];
                            if (!draft.workflow) {
                                throw new Error('AI authoring draft action "create_workflow" requires workflow.');
                            }
                            workflow = normalizeAiAuthoredWorkflow(draft.workflow, draft.reason);
                            return [4 /*yield*/, this.store.createWorkflowFromGeneratedWorkflow(workspaceRootUri, workflow, draft.reason || draft.workflow.id || draft.workflow.name || 'dynamic_workflow')];
                        case 1:
                            saved = _b.sent();
                            return [4 /*yield*/, this.materializeWorkflowAgents(workspaceRootUri, saved)];
                        case 2:
                            _b.sent();
                            return [2 /*return*/, saved];
                        case 3:
                            if (draft.action === 'ask_user') {
                                throw new Error("AI authoring draft needs user input: ".concat(draft.questionMarkdown || draft.reason || 'No question provided.'));
                            }
                            throw new Error("Unsupported AI authoring draft action \"".concat(draft.action, "\"."));
                    }
                });
            });
        };
        FlowServiceImpl_1.prototype.savePipelinePreset = function (request) {
            return __awaiter(this, void 0, void 0, function () {
                var id, preset, validation;
                return __generator(this, function (_a) {
                    id = request.id || request.workflow.id;
                    if (id === common_1.SISYPHUS_ULTRAWORK_COORDINATOR_PRESET_ID) {
                        throw new Error("Pipeline preset \"".concat(id, "\" is built in and cannot be overwritten."));
                    }
                    preset = {
                        id: id,
                        name: request.name || request.workflow.name,
                        description: request.description || request.workflow.description || "Reusable Flow pipeline preset for ".concat(request.workflow.name, "."),
                        version: common_1.FLOW_PIPELINE_PRESET_VERSION,
                        source: 'workspace',
                        workflow: __assign(__assign({}, request.workflow), { id: id, name: request.name || request.workflow.name, description: request.description || request.workflow.description }),
                        agentMarkdown: request.agentMarkdown,
                        tags: request.tags
                    };
                    validation = (0, common_1.validateFlowPipelinePreset)(preset);
                    if (!validation.valid) {
                        throw new Error("Pipeline preset \"".concat(id, "\" is invalid: ").concat(validation.errors.map(function (error) { return error.message; }).join('; ')));
                    }
                    return [2 /*return*/, this.store.savePipelinePreset(request.workspaceRootUri, preset, { overwrite: request.overwrite })];
                });
            });
        };
        FlowServiceImpl_1.prototype.getWorkflow = function (request) {
            return __awaiter(this, void 0, void 0, function () {
                var workflow;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.store.getWorkflow(request.workspaceRootUri, request.workflowId)];
                        case 1:
                            workflow = _a.sent();
                            if (!workflow) {
                                throw new Error("Workflow \"".concat(request.workflowId, "\" was not found."));
                            }
                            return [2 /*return*/, workflow];
                    }
                });
            });
        };
        FlowServiceImpl_1.prototype.openWorkflowFile = function (request) {
            return __awaiter(this, void 0, void 0, function () {
                var file;
                return __generator(this, function (_a) {
                    file = request.fileUri || request.filePath;
                    if (file) {
                        return [2 /*return*/, this.store.openWorkflowFile(file)];
                    }
                    if (request.workflowId) {
                        return [2 /*return*/, this.getWorkflow({ workspaceRootUri: request.workspaceRootUri, workflowId: request.workflowId })];
                    }
                    throw new Error('A workflow file path, URI, or workflow id is required.');
                });
            });
        };
        FlowServiceImpl_1.prototype.importWorkflow = function (request) {
            return __awaiter(this, void 0, void 0, function () {
                var file, workflow, validation;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            file = request.fileUri || request.filePath;
                            if (!file) {
                                throw new Error('A workflow export file, URI, or directory is required.');
                            }
                            return [4 /*yield*/, this.store.importWorkflow(request.workspaceRootUri, file)];
                        case 1:
                            workflow = _a.sent();
                            validation = (0, common_1.validateFlowWorkflow)(workflow);
                            if (!validation.valid) {
                                throw new Error("Imported workflow \"".concat(workflow.id, "\" is invalid: ").concat(validation.errors.map(function (error) { return error.message; }).join('; ')));
                            }
                            return [2 /*return*/, workflow];
                    }
                });
            });
        };
        FlowServiceImpl_1.prototype.exportWorkflow = function (request) {
            return __awaiter(this, void 0, void 0, function () {
                var workflow;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getWorkflow(request)];
                        case 1:
                            workflow = _a.sent();
                            return [2 /*return*/, this.store.exportWorkflow(request.workspaceRootUri, workflow, request.targetUri || request.targetPath)];
                    }
                });
            });
        };
        FlowServiceImpl_1.prototype.exportRun = function (request) {
            return __awaiter(this, void 0, void 0, function () {
                var run, workflow, _a;
                var _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0: return [4 /*yield*/, this.getRun(request)];
                        case 1:
                            run = _c.sent();
                            _a = ((_b = run.audit) === null || _b === void 0 ? void 0 : _b.workflow);
                            if (_a) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.getWorkflow(__assign(__assign({}, request), { workflowId: run.workflowId }))];
                        case 2:
                            _a = (_c.sent());
                            _c.label = 3;
                        case 3:
                            workflow = _a;
                            return [2 /*return*/, this.store.exportRun(request.workspaceRootUri, workflow, run, request.targetUri || request.targetPath)];
                    }
                });
            });
        };
        FlowServiceImpl_1.prototype.importRun = function (request) {
            return __awaiter(this, void 0, void 0, function () {
                var file, run;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            file = request.fileUri || request.filePath;
                            if (!file) {
                                throw new Error('A run export directory, URI, or run.json path is required.');
                            }
                            return [4 /*yield*/, this.store.importRun(request.workspaceRootUri, file)];
                        case 1:
                            run = _a.sent();
                            this.publishRunUpdate(request.workspaceRootUri, run, 'snapshot');
                            return [2 /*return*/, run];
                    }
                });
            });
        };
        FlowServiceImpl_1.prototype.reloadWorkflow = function (request) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.getWorkflow(request)];
                });
            });
        };
        FlowServiceImpl_1.prototype.saveWorkflow = function (request) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.saveWorkflowFile(request)];
                });
            });
        };
        FlowServiceImpl_1.prototype.saveWorkflowFile = function (request) {
            return __awaiter(this, void 0, void 0, function () {
                var validation;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            validation = (0, common_1.validateFlowWorkflow)(request.workflow);
                            if (!validation.valid) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.store.saveWorkflow(request.workspaceRootUri, request.workflow, request.fileUri || request.filePath, {
                                    author: request.author,
                                    origin: request.origin,
                                    message: request.message
                                })];
                        case 1:
                            _a.sent();
                            _a.label = 2;
                        case 2: return [2 /*return*/, validation];
                    }
                });
            });
        };
        FlowServiceImpl_1.prototype.listWorkflowVersions = function (request) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getWorkflow(request)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, this.store.listWorkflowVersions(request.workspaceRootUri, request.workflowId)];
                    }
                });
            });
        };
        FlowServiceImpl_1.prototype.restoreWorkflowVersion = function (request) {
            return __awaiter(this, void 0, void 0, function () {
                var workflow, validation;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.store.restoreWorkflowVersion(request.workspaceRootUri, request.workflowId, request.versionId, {
                                author: request.author,
                                message: request.message
                            })];
                        case 1:
                            workflow = _a.sent();
                            validation = (0, common_1.validateFlowWorkflow)(workflow);
                            if (!validation.valid) {
                                throw new Error("Restored workflow \"".concat(workflow.id, "\" is invalid: ").concat(validation.errors.map(function (error) { return error.message; }).join('; ')));
                            }
                            return [2 /*return*/, workflow];
                    }
                });
            });
        };
        FlowServiceImpl_1.prototype.validateWorkflow = function (workflow) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, (0, common_1.validateFlowWorkflow)(workflow)];
                });
            });
        };
        FlowServiceImpl_1.prototype.getPipelinePreset = function (workspaceRootUri, presetId) {
            return __awaiter(this, void 0, void 0, function () {
                var builtIn, workspace;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            builtIn = (0, common_1.getBuiltInFlowPipelinePreset)(presetId);
                            if (builtIn) {
                                return [2 /*return*/, builtIn];
                            }
                            return [4 /*yield*/, this.store.getWorkspacePipelinePreset(workspaceRootUri, presetId)];
                        case 1:
                            workspace = _a.sent();
                            if (workspace) {
                                return [2 /*return*/, workspace];
                            }
                            throw new Error("Pipeline preset \"".concat(presetId, "\" was not found."));
                    }
                });
            });
        };
        FlowServiceImpl_1.prototype.materializePresetAgents = function (workspaceRootUri, preset) {
            return __awaiter(this, void 0, void 0, function () {
                var _i, _a, agent, existing;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _i = 0, _a = preset.agentMarkdown || [];
                            _b.label = 1;
                        case 1:
                            if (!(_i < _a.length)) return [3 /*break*/, 5];
                            agent = _a[_i];
                            return [4 /*yield*/, this.agentMarkdownStore.readAgent(workspaceRootUri, agent.relativePath)];
                        case 2:
                            existing = _b.sent();
                            if (!!existing) return [3 /*break*/, 4];
                            return [4 /*yield*/, this.agentMarkdownStore.writeAgent(workspaceRootUri, agent.relativePath, agent.content)];
                        case 3:
                            _b.sent();
                            _b.label = 4;
                        case 4:
                            _i++;
                            return [3 /*break*/, 1];
                        case 5: return [2 /*return*/];
                    }
                });
            });
        };
        FlowServiceImpl_1.prototype.materializeWorkflowAgents = function (workspaceRootUri, workflow) {
            return __awaiter(this, void 0, void 0, function () {
                var _i, _a, agent, existing;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _i = 0, _a = collectWorkflowAgentMarkdownPaths(workflow);
                            _b.label = 1;
                        case 1:
                            if (!(_i < _a.length)) return [3 /*break*/, 5];
                            agent = _a[_i];
                            return [4 /*yield*/, this.agentMarkdownStore.readAgent(workspaceRootUri, agent.relativePath)];
                        case 2:
                            existing = _b.sent();
                            if (!!existing) return [3 /*break*/, 4];
                            return [4 /*yield*/, this.agentMarkdownStore.writeAgent(workspaceRootUri, agent.relativePath, defaultGeneratedAgentMarkdown(agent))];
                        case 3:
                            _b.sent();
                            _b.label = 4;
                        case 4:
                            _i++;
                            return [3 /*break*/, 1];
                        case 5: return [2 /*return*/];
                    }
                });
            });
        };
        FlowServiceImpl_1.prototype.startRun = function (request) {
            return __awaiter(this, void 0, void 0, function () {
                var workflow, contextPack, run, _a, materializedRun;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.getWorkflow(request)];
                        case 1:
                            workflow = _b.sent();
                            return [4 /*yield*/, this.assertHostCapabilities(workflow)];
                        case 2:
                            _b.sent();
                            return [4 /*yield*/, this.memory.buildContextPack(request.workspaceRootUri, workflow)];
                        case 3:
                            contextPack = _b.sent();
                            return [4 /*yield*/, this.kernelBridge.startRun(workflow, request.prompt, contextPack.summary, request.workspaceRootUri)];
                        case 4:
                            run = _b.sent();
                            run.contextPack = contextPack;
                            _a = run;
                            return [4 /*yield*/, this.memory.collectMemoryCandidates(run)];
                        case 5:
                            _a.memoryCandidates = _b.sent();
                            return [4 /*yield*/, this.workloadStore.materializeRun(request.workspaceRootUri, workflow, run)];
                        case 6:
                            materializedRun = _b.sent();
                            return [4 /*yield*/, this.store.saveRun(request.workspaceRootUri, materializedRun)];
                        case 7:
                            _b.sent();
                            this.publishRunUpdate(request.workspaceRootUri, materializedRun, 'started');
                            this.ensureRunStream({ workspaceRootUri: request.workspaceRootUri, runId: materializedRun.id });
                            return [2 /*return*/, materializedRun];
                    }
                });
            });
        };
        FlowServiceImpl_1.prototype.getRun = function (request) {
            return __awaiter(this, void 0, void 0, function () {
                var run;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.store.getRun(request.workspaceRootUri, request.runId)];
                        case 1:
                            run = _a.sent();
                            if (!run) {
                                throw new Error("Run \"".concat(request.runId, "\" was not found."));
                            }
                            return [2 /*return*/, this.refreshRunFromKernel(request.workspaceRootUri, run)];
                    }
                });
            });
        };
        FlowServiceImpl_1.prototype.tickRun = function (request) {
            return __awaiter(this, void 0, void 0, function () {
                var run, workflow, updated, _a, _b, _c, materializedRun;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0: return [4 /*yield*/, this.getRun(request)];
                        case 1:
                            run = _d.sent();
                            return [4 /*yield*/, this.getWorkflow(__assign(__assign({}, request), { workflowId: run.workflowId }))];
                        case 2:
                            workflow = _d.sent();
                            return [4 /*yield*/, this.kernelBridge.tickRun(workflow, run, request.workspaceRootUri)];
                        case 3:
                            updated = _d.sent();
                            _a = updated;
                            _b = mergeMemoryCandidates;
                            _c = [updated.memoryCandidates];
                            return [4 /*yield*/, this.memory.collectMemoryCandidates(updated)];
                        case 4:
                            _a.memoryCandidates = _b.apply(void 0, _c.concat([_d.sent()]));
                            return [4 /*yield*/, this.workloadStore.materializeRun(request.workspaceRootUri, workflow, updated)];
                        case 5:
                            materializedRun = _d.sent();
                            return [4 /*yield*/, this.store.saveRun(request.workspaceRootUri, materializedRun)];
                        case 6:
                            _d.sent();
                            this.publishRunUpdate(request.workspaceRootUri, materializedRun, 'tick');
                            return [2 /*return*/, materializedRun];
                    }
                });
            });
        };
        FlowServiceImpl_1.prototype.pauseRun = function (request) {
            return __awaiter(this, void 0, void 0, function () {
                var _this = this;
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.updateRunLifecycle(request, function (workflow, run) { return _this.kernelBridge.pauseRun(workflow, run, request.reason); }, false)];
                });
            });
        };
        FlowServiceImpl_1.prototype.resumeRun = function (request) {
            return __awaiter(this, void 0, void 0, function () {
                var _this = this;
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.updateRunLifecycle(request, function (workflow, run) { return _this.kernelBridge.resumeRun(workflow, run, request.reason); }, true)];
                });
            });
        };
        FlowServiceImpl_1.prototype.cancelRun = function (request) {
            return __awaiter(this, void 0, void 0, function () {
                var _this = this;
                return __generator(this, function (_a) {
                    assertApprovalAllowed('cancel_run', true);
                    return [2 /*return*/, this.updateRunLifecycle(request, function (workflow, run) { return _this.kernelBridge.cancelRun(workflow, run, request.reason); }, false)];
                });
            });
        };
        FlowServiceImpl_1.prototype.finalizeRun = function (request) {
            return __awaiter(this, void 0, void 0, function () {
                var run, finalized;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getRun(request)];
                        case 1:
                            run = _a.sent();
                            return [4 /*yield*/, this.attachFinalReport(request.workspaceRootUri, run, request.reason)];
                        case 2:
                            finalized = _a.sent();
                            return [4 /*yield*/, this.store.saveRun(request.workspaceRootUri, finalized)];
                        case 3:
                            _a.sent();
                            this.publishRunUpdate(request.workspaceRootUri, finalized, 'lifecycle');
                            return [4 /*yield*/, this.unsubscribeRunEvents(request)];
                        case 4:
                            _a.sent();
                            return [2 /*return*/, finalized];
                    }
                });
            });
        };
        FlowServiceImpl_1.prototype.approveGate = function (request) {
            return __awaiter(this, void 0, void 0, function () {
                var run, workflow, updated, _a, _b, _c, materializedRun;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0: return [4 /*yield*/, this.getRun(request)];
                        case 1:
                            run = _d.sent();
                            return [4 /*yield*/, this.getWorkflow(__assign(__assign({}, request), { workflowId: run.workflowId }))];
                        case 2:
                            workflow = _d.sent();
                            return [4 /*yield*/, this.kernelBridge.approveGate(workflow, run, request, request.workspaceRootUri)];
                        case 3:
                            updated = _d.sent();
                            _a = updated;
                            _b = mergeMemoryCandidates;
                            _c = [updated.memoryCandidates];
                            return [4 /*yield*/, this.memory.collectMemoryCandidates(updated)];
                        case 4:
                            _a.memoryCandidates = _b.apply(void 0, _c.concat([_d.sent()]));
                            return [4 /*yield*/, this.workloadStore.materializeRun(request.workspaceRootUri, workflow, updated)];
                        case 5:
                            materializedRun = _d.sent();
                            return [4 /*yield*/, this.store.saveRun(request.workspaceRootUri, materializedRun)];
                        case 6:
                            _d.sent();
                            this.publishRunUpdate(request.workspaceRootUri, materializedRun, 'approval');
                            this.ensureRunStream({ workspaceRootUri: request.workspaceRootUri, runId: materializedRun.id });
                            return [2 /*return*/, materializedRun];
                    }
                });
            });
        };
        FlowServiceImpl_1.prototype.decideEffect = function (request) {
            return __awaiter(this, void 0, void 0, function () {
                var run, effect, source, reason, applied, workload, applied;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getRun(request)];
                        case 1:
                            run = _a.sent();
                            effect = run.effects.find(function (item) { return item.id === request.effectId; });
                            if (!effect) {
                                throw new Error("Effect \"".concat(request.effectId, "\" was not found in run \"").concat(run.id, "\"."));
                            }
                            if (effect.status !== 'proposed' && effect.status !== 'approved') {
                                throw new Error("Effect \"".concat(request.effectId, "\" is already ").concat(effect.status, "."));
                            }
                            if (!(request.decision === 'rejected')) return [3 /*break*/, 3];
                            effect.status = 'rejected';
                            this.recordEffectDecision(run, effect, 'rejected', request.note, request.approvedBy);
                            return [4 /*yield*/, this.store.saveRun(request.workspaceRootUri, run)];
                        case 2:
                            _a.sent();
                            this.publishRunUpdate(request.workspaceRootUri, run, 'approval');
                            return [2 /*return*/, run];
                        case 3:
                            source = findSourceEffect(run, effect);
                            if (!source) {
                                throw new Error("Original workload effect payload for \"".concat(request.effectId, "\" was not found."));
                            }
                            if (request.decision === 'approved') {
                                effect.status = 'approved';
                                this.recordEffectDecision(run, effect, 'approved', request.note, request.approvedBy);
                            }
                            if (!(request.decision === 'applied')) return [3 /*break*/, 9];
                            reason = void 0;
                            if (!isFileEffect(effect)) return [3 /*break*/, 5];
                            if (!this.fileEffectHostAdapter) {
                                throw new Error('File effect host adapter is not available.');
                            }
                            return [4 /*yield*/, this.fileEffectHostAdapter.apply(request.workspaceRootUri, {
                                    type: source.type,
                                    path: source.path || effect.path || '',
                                    content: sourceContent(source),
                                    hashBefore: source.hashBefore || effect.hashBefore,
                                    approvalPolicy: source.approvalPolicy || effect.approvalPolicy,
                                    allowedPaths: source.allowedPaths || effect.allowedPaths,
                                    deniedPaths: source.deniedPaths || effect.deniedPaths
                                }, true)];
                        case 4:
                            applied = _a.sent();
                            effect.path = applied.relativePath || effect.path;
                            effect.hashBefore = applied.hashBefore || effect.hashBefore;
                            effect.hashAfter = applied.hashAfter || effect.hashAfter;
                            effect.patch = applied.patch || effect.patch;
                            effect.approvalPolicy = applied.approvalPolicy || effect.approvalPolicy;
                            effect.status = applied.applied ? 'applied' : applied.blocked ? 'blocked' : 'failed';
                            effect.stderr = applied.applied ? effect.stderr : applied.reason;
                            reason = applied.reason;
                            return [3 /*break*/, 8];
                        case 5:
                            if (!isImageEffect(effect)) return [3 /*break*/, 7];
                            if (!this.imageEffectHostAdapter) {
                                throw new Error('Image effect host adapter is not available.');
                            }
                            workload = run.workloads.find(function (item) { return item.effectIds.includes(effect.id); });
                            return [4 /*yield*/, this.imageEffectHostAdapter.apply(request.workspaceRootUri, run.id, (workload === null || workload === void 0 ? void 0 : workload.id) || effect.stateId, {
                                    type: source.type,
                                    prompt: source.prompt || effect.prompt,
                                    path: source.path || effect.path,
                                    artifactPath: source.artifactPath || effect.artifactPath,
                                    mimeType: source.mimeType || effect.mimeType,
                                    provider: source.provider || effect.provider,
                                    summary: source.summary || effect.summary,
                                    approvalPolicy: source.approvalPolicy || effect.approvalPolicy
                                }, true)];
                        case 6:
                            applied = _a.sent();
                            effect.path = applied.uri || effect.path;
                            effect.artifactPath = applied.artifactPath || effect.artifactPath;
                            effect.mimeType = applied.mimeType || effect.mimeType;
                            effect.provider = applied.provider || effect.provider;
                            effect.bytes = applied.bytes || effect.bytes;
                            effect.approvalPolicy = applied.approvalPolicy || effect.approvalPolicy;
                            effect.stdout = applied.stdout || effect.stdout;
                            effect.stderr = applied.applied ? effect.stderr : applied.reason || applied.stderr;
                            effect.status = applied.applied ? 'applied' : applied.status === 'blocked' ? 'blocked' : 'failed';
                            reason = applied.reason;
                            return [3 /*break*/, 8];
                        case 7: throw new Error("Effect \"".concat(request.effectId, "\" cannot be applied by the effect decision API."));
                        case 8:
                            this.recordEffectDecision(run, effect, effect.status, request.note || reason, request.approvedBy);
                            _a.label = 9;
                        case 9:
                            run.updatedAt = timestamp();
                            return [4 /*yield*/, this.store.saveRun(request.workspaceRootUri, run)];
                        case 10:
                            _a.sent();
                            this.publishRunUpdate(request.workspaceRootUri, run, 'approval');
                            return [2 /*return*/, run];
                    }
                });
            });
        };
        FlowServiceImpl_1.prototype.approveMemoryCandidate = function (request) {
            return __awaiter(this, void 0, void 0, function () {
                var run, candidate, revisedContent, approval, approvedAt, approved, written;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getRun(request)];
                        case 1:
                            run = _a.sent();
                            candidate = (run.memoryCandidates || []).find(function (item) { return item.id === request.candidateId; });
                            if (!candidate) {
                                throw new Error("Memory candidate \"".concat(request.candidateId, "\" was not found in run \"").concat(run.id, "\"."));
                            }
                            if (candidate.status === 'rejected' || candidate.status === 'written') {
                                throw new Error("Memory candidate \"".concat(request.candidateId, "\" is already ").concat(candidate.status, "."));
                            }
                            if (request.content !== undefined) {
                                revisedContent = request.content.trim();
                                if (!revisedContent) {
                                    throw new Error("Memory candidate \"".concat(request.candidateId, "\" cannot be written with empty content."));
                                }
                                candidate.content = revisedContent;
                            }
                            if (!(request.decision === 'rejected')) return [3 /*break*/, 3];
                            candidate.status = 'rejected';
                            run.events.push({
                                id: stableId('event', run.id, candidate.id, 'rejected'),
                                runId: run.id,
                                workflowId: run.workflowId,
                                type: 'memory_write.rejected',
                                timestamp: timestamp(),
                                stateId: candidate.stateId,
                                message: "Memory candidate \"".concat(candidate.id, "\" rejected."),
                                payload: { candidateId: candidate.id, scope: request.scope || candidate.scope, target: request.target }
                            });
                            run.updatedAt = timestamp();
                            return [4 /*yield*/, this.store.saveRun(request.workspaceRootUri, run)];
                        case 2:
                            _a.sent();
                            this.publishRunUpdate(request.workspaceRootUri, run, 'memory');
                            return [2 /*return*/, run];
                        case 3:
                            approval = assertApprovalAllowed('memory_write', true);
                            approvedAt = timestamp();
                            candidate.status = 'approved';
                            approved = {
                                id: stableId('memory-write', run.id, candidate.id),
                                runId: run.id,
                                candidateId: candidate.id,
                                status: 'approved',
                                content: candidate.content,
                                approvedAt: approvedAt,
                                approvedBy: request.approvedBy,
                                scope: request.scope || candidate.scope,
                                target: request.target
                            };
                            run.events.push(memoryWriteEvent(run, candidate, approved, 'approved', approvedAt, approval.policy));
                            return [4 /*yield*/, this.memory.writeApprovedMemory(approved, request.workspaceRootUri)];
                        case 4:
                            written = _a.sent();
                            candidate.status = written.status === 'written' ? 'written' : 'approved';
                            run.memoryWrites = upsertMemoryWrite(run.memoryWrites, written);
                            if (written.status === 'written' || written.status === 'failed') {
                                run.events.push(memoryWriteEvent(run, candidate, written, written.status, timestamp(), approval.policy));
                            }
                            run.updatedAt = timestamp();
                            return [4 /*yield*/, this.store.saveRun(request.workspaceRootUri, run)];
                        case 5:
                            _a.sent();
                            this.publishRunUpdate(request.workspaceRootUri, run, 'memory');
                            return [2 /*return*/, run];
                    }
                });
            });
        };
        FlowServiceImpl_1.prototype.approveSecondRunSuggestion = function (request) {
            return __awaiter(this, void 0, void 0, function () {
                var sourceRun, suggestion, approval, sourceWorkflow, now, secondWorkflow, savedWorkflow, contextPack, prompt, newRun, _a, materializedRun;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.getRun(request)];
                        case 1:
                            sourceRun = _b.sent();
                            suggestion = sourceRun.secondRunSuggestion;
                            if (!suggestion || suggestion.id !== request.suggestionId) {
                                throw new Error("Second run suggestion \"".concat(request.suggestionId, "\" was not found in run \"").concat(sourceRun.id, "\"."));
                            }
                            if (suggestion.status !== 'suggested') {
                                throw new Error("Second run suggestion \"".concat(request.suggestionId, "\" is already ").concat(suggestion.status, "."));
                            }
                            approval = assertApprovalAllowed('second_run', true);
                            return [4 /*yield*/, this.getWorkflow(__assign(__assign({}, request), { workflowId: sourceRun.workflowId }))];
                        case 2:
                            sourceWorkflow = _b.sent();
                            now = timestamp();
                            secondWorkflow = __assign(__assign({}, cloneJson(sourceWorkflow)), { id: stableId('workflow', sourceWorkflow.id, 'second-run', sourceRun.id, now), name: "".concat(sourceWorkflow.name, " - segunda run"), description: [
                                    sourceWorkflow.description,
                                    "Second run approved from ".concat(sourceRun.id, " at ").concat(now, ".")
                                ].filter(Boolean).join('\n\n'), file: undefined });
                            return [4 /*yield*/, this.store.saveWorkflow(request.workspaceRootUri, secondWorkflow)];
                        case 3:
                            _b.sent();
                            return [4 /*yield*/, this.getWorkflow({ workspaceRootUri: request.workspaceRootUri, workflowId: secondWorkflow.id })];
                        case 4:
                            savedWorkflow = _b.sent();
                            return [4 /*yield*/, this.memory.buildContextPack(request.workspaceRootUri, savedWorkflow)];
                        case 5:
                            contextPack = _b.sent();
                            prompt = renderSecondRunPrompt(sourceRun, suggestion);
                            return [4 /*yield*/, this.kernelBridge.startRun(savedWorkflow, prompt, contextPack.summary, request.workspaceRootUri)];
                        case 6:
                            newRun = _b.sent();
                            newRun.contextPack = appendSecondRunContext(contextPack, sourceRun, suggestion);
                            _a = newRun;
                            return [4 /*yield*/, this.memory.collectMemoryCandidates(newRun)];
                        case 7:
                            _a.memoryCandidates = _b.sent();
                            newRun.events.push({
                                id: stableId('event', newRun.id, 'second-run-approved', sourceRun.id),
                                runId: newRun.id,
                                workflowId: newRun.workflowId,
                                type: 'second_run.approved',
                                timestamp: now,
                                message: "Second run approved from source run \"".concat(sourceRun.id, "\"."),
                                payload: {
                                    sourceRunId: sourceRun.id,
                                    sourceWorkflowId: sourceRun.workflowId,
                                    suggestionId: suggestion.id,
                                    sourceIssueCount: suggestion.issues.length,
                                    approvedBy: request.approvedBy,
                                    approvalPolicy: approval.policy
                                }
                            });
                            return [4 /*yield*/, this.workloadStore.materializeRun(request.workspaceRootUri, savedWorkflow, newRun)];
                        case 8:
                            materializedRun = _b.sent();
                            return [4 /*yield*/, this.store.saveRun(request.workspaceRootUri, materializedRun)];
                        case 9:
                            _b.sent();
                            sourceRun.secondRunSuggestion = __assign(__assign({}, suggestion), { status: 'accepted', approvedRunId: materializedRun.id, approvedWorkflowId: savedWorkflow.id, approvedAt: now });
                            sourceRun.events.push({
                                id: stableId('event', sourceRun.id, 'second-run-approved', materializedRun.id),
                                runId: sourceRun.id,
                                workflowId: sourceRun.workflowId,
                                type: 'second_run.approved',
                                timestamp: now,
                                message: "Second run \"".concat(materializedRun.id, "\" approved from suggestion \"").concat(suggestion.id, "\"."),
                                payload: {
                                    suggestionId: suggestion.id,
                                    approvedRunId: materializedRun.id,
                                    approvedWorkflowId: savedWorkflow.id,
                                    approvedBy: request.approvedBy,
                                    approvalPolicy: approval.policy
                                }
                            });
                            sourceRun.updatedAt = now;
                            return [4 /*yield*/, this.store.saveRun(request.workspaceRootUri, sourceRun)];
                        case 10:
                            _b.sent();
                            this.publishRunUpdate(request.workspaceRootUri, sourceRun, 'approval');
                            this.publishRunUpdate(request.workspaceRootUri, materializedRun, 'started');
                            this.ensureRunStream({ workspaceRootUri: request.workspaceRootUri, runId: materializedRun.id });
                            return [2 /*return*/, materializedRun];
                    }
                });
            });
        };
        FlowServiceImpl_1.prototype.decideSecondRunSuggestion = function (request) {
            return __awaiter(this, void 0, void 0, function () {
                var sourceRun, suggestion, now;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (request.decision === 'approved') {
                                return [2 /*return*/, this.approveSecondRunSuggestion(request)];
                            }
                            return [4 /*yield*/, this.getRun(request)];
                        case 1:
                            sourceRun = _a.sent();
                            suggestion = sourceRun.secondRunSuggestion;
                            if (!suggestion || suggestion.id !== request.suggestionId) {
                                throw new Error("Second run suggestion \"".concat(request.suggestionId, "\" was not found in run \"").concat(sourceRun.id, "\"."));
                            }
                            if (suggestion.status !== 'suggested') {
                                throw new Error("Second run suggestion \"".concat(request.suggestionId, "\" is already ").concat(suggestion.status, "."));
                            }
                            now = timestamp();
                            sourceRun.secondRunSuggestion = __assign(__assign({}, suggestion), { status: 'dismissed', approvedAt: now });
                            sourceRun.events.push({
                                id: stableId('event', sourceRun.id, 'second-run-dismissed', suggestion.id),
                                runId: sourceRun.id,
                                workflowId: sourceRun.workflowId,
                                type: 'second_run.dismissed',
                                timestamp: now,
                                message: "Second run suggestion \"".concat(suggestion.id, "\" dismissed."),
                                payload: {
                                    suggestionId: suggestion.id,
                                    status: 'dismissed',
                                    approvedBy: request.approvedBy,
                                    note: request.note
                                }
                            });
                            sourceRun.updatedAt = now;
                            return [4 /*yield*/, this.store.saveRun(request.workspaceRootUri, sourceRun)];
                        case 2:
                            _a.sent();
                            this.publishRunUpdate(request.workspaceRootUri, sourceRun, 'approval');
                            return [2 /*return*/, sourceRun];
                    }
                });
            });
        };
        FlowServiceImpl_1.prototype.subscribeRunEvents = function (request) {
            return __awaiter(this, void 0, void 0, function () {
                var run;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getRun(request)];
                        case 1:
                            run = _a.sent();
                            this.publishRunUpdate(request.workspaceRootUri, run, 'snapshot');
                            this.ensureRunStream(request);
                            return [2 /*return*/, run];
                    }
                });
            });
        };
        FlowServiceImpl_1.prototype.unsubscribeRunEvents = function (request) {
            return __awaiter(this, void 0, void 0, function () {
                var key, dispose;
                return __generator(this, function (_a) {
                    key = streamKey(request.workspaceRootUri, request.runId);
                    dispose = this.runStreams.get(key);
                    if (dispose) {
                        dispose();
                        this.runStreams.delete(key);
                    }
                    this.openingRunStreams.delete(key);
                    return [2 /*return*/];
                });
            });
        };
        FlowServiceImpl_1.prototype.updateRunLifecycle = function (request, update, streamAfterUpdate) {
            return __awaiter(this, void 0, void 0, function () {
                var run, workflow, updated, _a, _b, _c, materializedRun;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0: return [4 /*yield*/, this.getRun(request)];
                        case 1:
                            run = _d.sent();
                            return [4 /*yield*/, this.getWorkflow(__assign(__assign({}, request), { workflowId: run.workflowId }))];
                        case 2:
                            workflow = _d.sent();
                            return [4 /*yield*/, update(workflow, run)];
                        case 3:
                            updated = _d.sent();
                            _a = updated;
                            _b = mergeMemoryCandidates;
                            _c = [updated.memoryCandidates];
                            return [4 /*yield*/, this.memory.collectMemoryCandidates(updated)];
                        case 4:
                            _a.memoryCandidates = _b.apply(void 0, _c.concat([_d.sent()]));
                            return [4 /*yield*/, this.workloadStore.materializeRun(request.workspaceRootUri, workflow, updated)];
                        case 5:
                            materializedRun = _d.sent();
                            return [4 /*yield*/, this.store.saveRun(request.workspaceRootUri, materializedRun)];
                        case 6:
                            _d.sent();
                            this.publishRunUpdate(request.workspaceRootUri, materializedRun, 'lifecycle');
                            if (!(streamAfterUpdate && !isTerminalRun(materializedRun))) return [3 /*break*/, 7];
                            this.ensureRunStream({ workspaceRootUri: request.workspaceRootUri, runId: materializedRun.id });
                            return [3 /*break*/, 9];
                        case 7: return [4 /*yield*/, this.unsubscribeRunEvents(request)];
                        case 8:
                            _d.sent();
                            _d.label = 9;
                        case 9: return [2 /*return*/, materializedRun];
                    }
                });
            });
        };
        FlowServiceImpl_1.prototype.attachFinalReport = function (workspaceRootUri, run, note) {
            return __awaiter(this, void 0, void 0, function () {
                var now, content, reportUri, report;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            now = timestamp();
                            content = renderFinalReport(run, note);
                            return [4 /*yield*/, this.store.writeRunReport(workspaceRootUri, run.id, 'report.md', content)];
                        case 1:
                            reportUri = _a.sent();
                            report = {
                                id: stableId('artifact', run.id, 'final-report'),
                                runId: run.id,
                                stateId: 'final_report',
                                uri: reportUri,
                                kind: 'report',
                                summary: "Final report for run ".concat(run.id, "."),
                                createdAt: now
                            };
                            if (!run.artifacts.some(function (artifact) { return artifact.id === report.id || artifact.uri === report.uri; })) {
                                run.artifacts = __spreadArray(__spreadArray([], run.artifacts, true), [report], false);
                            }
                            run.events.push({
                                id: stableId('event', run.id, 'final-report', now),
                                runId: run.id,
                                workflowId: run.workflowId,
                                type: run.status === 'completed' ? 'run.completed' : run.status === 'cancelled' ? 'run.cancelled' : 'run.failed',
                                timestamp: now,
                                stateId: 'final_report',
                                message: note || "Run finalized with ".concat(run.artifacts.length, " artifacts, ").concat(run.effects.length, " effects, and ").concat(run.events.length, " events."),
                                payload: {
                                    reportUri: report.uri,
                                    artifactCount: run.artifacts.length,
                                    effectCount: run.effects.length,
                                    issueCount: run.workloads.reduce(function (count, workload) { return count + workload.issues.length; }, 0)
                                }
                            });
                            run.updatedAt = now;
                            return [2 /*return*/, run];
                    }
                });
            });
        };
        FlowServiceImpl_1.prototype.ensureWorkflows = function (workspaceRootUri) {
            return __awaiter(this, void 0, void 0, function () {
                var workflows, sample;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.store.listWorkflows(workspaceRootUri)];
                        case 1:
                            workflows = _a.sent();
                            if (workflows.length > 0) {
                                return [2 /*return*/, workflows];
                            }
                            sample = createSampleWorkflow();
                            return [4 /*yield*/, this.store.saveWorkflow(workspaceRootUri, sample)];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, this.getWorkflow({ workspaceRootUri: workspaceRootUri, workflowId: sample.id })];
                        case 3: return [2 /*return*/, [_a.sent()]];
                    }
                });
            });
        };
        FlowServiceImpl_1.prototype.getRuntimeCapabilities = function () {
            return __awaiter(this, void 0, void 0, function () {
                var runtimeKernelBridge, runEventStream, _a, memoryReport, codexProvider, llmProvider, filesystemEdit, imageProviderConfigured, commandPolicyConfigured;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.resolveKernelBridgeMode()];
                        case 1:
                            runtimeKernelBridge = _b.sent();
                            _a = runtimeKernelBridge === 'external';
                            if (!_a) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.resolveRunEventStreamCapability()];
                        case 2:
                            _a = (_b.sent());
                            _b.label = 3;
                        case 3:
                            runEventStream = _a;
                            return [4 /*yield*/, this.resolveMemoryReport()];
                        case 4:
                            memoryReport = _b.sent();
                            return [4 /*yield*/, this.resolveCodexProviderRuntimeReport()];
                        case 5:
                            codexProvider = _b.sent();
                            return [4 /*yield*/, this.resolveLlmAgentProvider(codexProvider)];
                        case 6:
                            llmProvider = _b.sent();
                            filesystemEdit = this.resolveFilesystemEditCapability();
                            imageProviderConfigured = this.hasConfiguredImageProvider() || (this.isExplicitCodexProvider() && codexProvider.imageGeneration);
                            commandPolicyConfigured = this.hasConfiguredCommandPolicy();
                            return [2 /*return*/, __assign(__assign({}, common_1.FLOW_CAPABILITIES), { runEventStream: runEventStream, llmAgentExecution: llmProvider.llmAgentExecution, llmAgentProvider: llmProvider.llmAgentProvider, filesystemEdit: filesystemEdit.available ? 'available' : 'blocked', filesystemEditPolicy: filesystemEdit.available ? 'configured' : 'missing', imageGeneration: imageProviderConfigured ? 'available' : 'unavailable', imageProvider: imageProviderConfigured ? 'configured' : 'missing', commandExecution: commandPolicyConfigured, commandExecutionPolicy: commandPolicyConfigured ? 'configured' : 'blocked', memoryAdapter: memoryReport.available, memoryProvider: memoryReport.provider, demoMode: llmProvider.demoMode, kernelBridge: runtimeKernelBridge, deterministicFallback: runtimeKernelBridge !== 'external', deterministicFallbackReason: runtimeKernelBridge === 'external'
                                        ? undefined
                                        : common_1.FLOW_CAPABILITIES.deterministicFallbackReason })];
                    }
                });
            });
        };
        FlowServiceImpl_1.prototype.resolveRunEventStreamCapability = function () {
            return __awaiter(this, void 0, void 0, function () {
                var _a;
                var _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            _d.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, ((_c = (_b = this.kernelBridge).supportsRunEventStream) === null || _c === void 0 ? void 0 : _c.call(_b))];
                        case 1: return [2 /*return*/, (_d.sent()) === true];
                        case 2:
                            _a = _d.sent();
                            return [2 /*return*/, false];
                        case 3: return [2 /*return*/];
                    }
                });
            });
        };
        FlowServiceImpl_1.prototype.resolveLlmAgentProvider = function () {
            return __awaiter(this, arguments, void 0, function (codexProvider) {
                var provider, _a;
                if (codexProvider === void 0) { codexProvider = { available: false, imageGeneration: false }; }
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            provider = (process.env.FLOW_AGENT_PROVIDER || 'auto').trim().toLowerCase();
                            if (provider === 'e2e-mock' || provider === 'mock-llm' || provider === 'mock-llm-provider') {
                                return [2 /*return*/, { llmAgentExecution: 'mock', llmAgentProvider: 'mock', demoMode: 'e2e' }];
                            }
                            if (provider === 'none' || provider === 'simulate' || provider === 'mock' || provider === 'off') {
                                return [2 /*return*/, { llmAgentExecution: 'unavailable', llmAgentProvider: 'missing', demoMode: provider === 'mock' ? 'demo' : 'off' }];
                            }
                            if (this.hasConfiguredAgentCommandProvider()) {
                                return [2 /*return*/, { llmAgentExecution: 'available', llmAgentProvider: 'configured', demoMode: 'off' }];
                            }
                            if (provider === 'command' || provider === 'provider' || provider === 'cli') {
                                return [2 /*return*/, { llmAgentExecution: 'unavailable', llmAgentProvider: 'missing', demoMode: 'off' }];
                            }
                            if (this.isExplicitCodexProvider()) {
                                if (codexProvider.available) {
                                    return [2 /*return*/, { llmAgentExecution: 'available', llmAgentProvider: 'configured', demoMode: 'off' }];
                                }
                                return [2 /*return*/, { llmAgentExecution: 'unavailable', llmAgentProvider: 'missing', demoMode: 'off' }];
                            }
                            _a = provider === 'auto';
                            if (!_a) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.hasConfiguredTheiaLanguageModel(provider)];
                        case 1:
                            _a = (_b.sent());
                            _b.label = 2;
                        case 2:
                            if (_a) {
                                return [2 /*return*/, { llmAgentExecution: 'available', llmAgentProvider: 'configured', demoMode: 'off' }];
                            }
                            return [4 /*yield*/, this.hasConfiguredTheiaLanguageModel(provider)];
                        case 3:
                            if (_b.sent()) {
                                return [2 /*return*/, { llmAgentExecution: 'available', llmAgentProvider: 'configured', demoMode: 'off' }];
                            }
                            return [2 /*return*/, { llmAgentExecution: 'unavailable', llmAgentProvider: 'missing', demoMode: 'off' }];
                    }
                });
            });
        };
        FlowServiceImpl_1.prototype.resolveCodexProviderRuntimeReport = function () {
            return __awaiter(this, void 0, void 0, function () {
                var status_1, available, _a;
                var _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            if (!this.codexProviderService) {
                                return [2 /*return*/, { available: false, imageGeneration: false }];
                            }
                            _c.label = 1;
                        case 1:
                            _c.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, this.codexProviderService.getStatus({ cwd: process.cwd() })];
                        case 2:
                            status_1 = _c.sent();
                            available = status_1.available && status_1.authenticated !== false;
                            return [2 /*return*/, {
                                    available: available,
                                    imageGeneration: available && ((_b = status_1.capabilities) === null || _b === void 0 ? void 0 : _b.imageGeneration) === true
                                }];
                        case 3:
                            _a = _c.sent();
                            return [2 /*return*/, { available: false, imageGeneration: false }];
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        FlowServiceImpl_1.prototype.hasConfiguredAgentCommandProvider = function () {
            return Boolean((process.env.FLOW_AGENT_LLM_COMMAND || process.env.FLOW_AGENT_COMMAND || '').trim());
        };
        FlowServiceImpl_1.prototype.hasConfiguredTheiaLanguageModel = function (provider) {
            return __awaiter(this, void 0, void 0, function () {
                var modelId, _a, _b, models, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            if (!this.languageModelRegistry || provider === 'command' || provider === 'provider' || provider === 'cli') {
                                return [2 /*return*/, false];
                            }
                            _d.label = 1;
                        case 1:
                            _d.trys.push([1, 6, , 7]);
                            if (!(process.env.FLOW_AGENT_MODEL_ID || process.env.FLOW_AGENT_LLM_MODEL_ID)) return [3 /*break*/, 4];
                            modelId = (process.env.FLOW_AGENT_MODEL_ID || process.env.FLOW_AGENT_LLM_MODEL_ID || '').trim();
                            _a = Boolean;
                            _b = modelId;
                            if (!_b) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.languageModelRegistry.getLanguageModel(modelId)];
                        case 2:
                            _b = (_d.sent());
                            _d.label = 3;
                        case 3: return [2 /*return*/, _a.apply(void 0, [_b])];
                        case 4: return [4 /*yield*/, this.languageModelRegistry.getLanguageModels()];
                        case 5:
                            models = _d.sent();
                            return [2 /*return*/, models.length > 0];
                        case 6:
                            _c = _d.sent();
                            return [2 /*return*/, false];
                        case 7: return [2 /*return*/];
                    }
                });
            });
        };
        FlowServiceImpl_1.prototype.resolveFilesystemEditCapability = function () {
            return { available: Boolean(this.fileEffectHostAdapter) && !this.isDisabledEnv('FLOW_FILE_EFFECTS') };
        };
        FlowServiceImpl_1.prototype.hasConfiguredImageProvider = function () {
            if (Boolean((process.env.FLOW_IMAGE_PROVIDER_COMMAND || '').trim())) {
                return true;
            }
            return Object.keys(process.env).some(function (key) {
                var _a;
                return /^FLOW_IMAGE_PROVIDER_[A-Z0-9_]+_COMMAND$/.test(key)
                    && Boolean((_a = process.env[key]) === null || _a === void 0 ? void 0 : _a.trim());
            });
        };
        FlowServiceImpl_1.prototype.isExplicitCodexProvider = function () {
            var provider = (process.env.FLOW_AGENT_PROVIDER || 'auto').trim().toLowerCase();
            return provider === 'codex' || provider === 'codex-provider' || provider === 'codex_cli';
        };
        FlowServiceImpl_1.prototype.hasConfiguredCommandPolicy = function () {
            return parseConfiguredCommandAllowlist().length > 0;
        };
        FlowServiceImpl_1.prototype.isDisabledEnv = function (name) {
            var _a;
            var value = (_a = process.env[name]) === null || _a === void 0 ? void 0 : _a.trim().toLowerCase();
            return value === '0' || value === 'false' || value === 'off' || value === 'disabled';
        };
        FlowServiceImpl_1.prototype.resolveKernelBridgeMode = function () {
            return __awaiter(this, void 0, void 0, function () {
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _b.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, this.kernelBridge.getBridgeMode()];
                        case 1: return [2 /*return*/, _b.sent()];
                        case 2:
                            _a = _b.sent();
                            return [2 /*return*/, 'simulated'];
                        case 3: return [2 /*return*/];
                    }
                });
            });
        };
        FlowServiceImpl_1.prototype.resolveMemoryReport = function () {
            return __awaiter(this, void 0, void 0, function () {
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _b.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, this.memory.report()];
                        case 1: return [2 /*return*/, _b.sent()];
                        case 2:
                            _a = _b.sent();
                            return [2 /*return*/, {
                                    provider: 'missing',
                                    available: false,
                                    missingService: 'Memory adapter report failed.'
                                }];
                        case 3: return [2 /*return*/];
                    }
                });
            });
        };
        FlowServiceImpl_1.prototype.refreshRunFromKernel = function (workspaceRootUri, run) {
            return __awaiter(this, void 0, void 0, function () {
                var workflow, refreshed, _a, metadata;
                var _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            if ((_b = run.audit) === null || _b === void 0 ? void 0 : _b.readOnly) {
                                return [2 /*return*/, run];
                            }
                            if (!this.isKernelBackedRun(run)) {
                                return [2 /*return*/, run];
                            }
                            _c.label = 1;
                        case 1:
                            _c.trys.push([1, 5, , 8]);
                            return [4 /*yield*/, this.getWorkflow({ workspaceRootUri: workspaceRootUri, workflowId: run.workflowId })];
                        case 2:
                            workflow = _c.sent();
                            return [4 /*yield*/, this.kernelBridge.refreshRun(workflow, run)];
                        case 3:
                            refreshed = _c.sent();
                            if (!refreshed.file && run.file) {
                                refreshed.file = run.file;
                            }
                            return [4 /*yield*/, this.store.saveRun(workspaceRootUri, refreshed)];
                        case 4:
                            _c.sent();
                            return [2 /*return*/, refreshed];
                        case 5:
                            _a = _c.sent();
                            metadata = this.legacyKernelMetadata(run);
                            if (!(metadata && !run.externalKernelMetadata)) return [3 /*break*/, 7];
                            run.externalKernelMetadata = metadata;
                            return [4 /*yield*/, this.store.saveRun(workspaceRootUri, run)];
                        case 6:
                            _c.sent();
                            _c.label = 7;
                        case 7: return [2 /*return*/, run];
                        case 8: return [2 /*return*/];
                    }
                });
            });
        };
        FlowServiceImpl_1.prototype.legacyKernelMetadata = function (run) {
            var _a;
            for (var _i = 0, _b = run.events; _i < _b.length; _i++) {
                var event_1 = _b[_i];
                var kernel = (_a = event_1.payload) === null || _a === void 0 ? void 0 : _a.kernel;
                if ((kernel === null || kernel === void 0 ? void 0 : kernel.kernelRunId) && kernel.storeDir) {
                    return {
                        kernelRunId: kernel.kernelRunId,
                        storeDir: kernel.storeDir,
                        workflowFile: kernel.workflowFile,
                        projectSummary: kernel.projectSummary
                    };
                }
            }
            return undefined;
        };
        FlowServiceImpl_1.prototype.isKernelBackedRun = function (run) {
            var _a;
            if (run.executionMode === 'kernel_external') {
                return true;
            }
            if (((_a = run.externalKernelMetadata) === null || _a === void 0 ? void 0 : _a.kernelRunId) && run.externalKernelMetadata.storeDir) {
                return true;
            }
            var metadata = this.legacyKernelMetadata(run);
            if (!metadata) {
                return false;
            }
            run.externalKernelMetadata = metadata;
            return true;
        };
        FlowServiceImpl_1.prototype.ensureRunStream = function (request) {
            var _this = this;
            var key = streamKey(request.workspaceRootUri, request.runId);
            if (this.runStreams.has(key) || this.openingRunStreams.has(key)) {
                return;
            }
            this.openingRunStreams.add(key);
            this.openRunStream(request).catch(function (error) {
                var _a;
                (_a = _this.client) === null || _a === void 0 ? void 0 : _a.onRunStreamError({
                    workspaceRootUri: request.workspaceRootUri,
                    runId: request.runId,
                    message: error instanceof Error ? error.message : String(error)
                });
            }).finally(function () {
                _this.openingRunStreams.delete(key);
            });
        };
        FlowServiceImpl_1.prototype.openRunStream = function (request) {
            return __awaiter(this, void 0, void 0, function () {
                var key, run, workflow, dispose;
                var _this = this;
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            key = streamKey(request.workspaceRootUri, request.runId);
                            return [4 /*yield*/, this.getRun(request)];
                        case 1:
                            run = _c.sent();
                            if (isTerminalRun(run)) {
                                this.publishRunUpdate(request.workspaceRootUri, run, 'snapshot');
                                return [2 /*return*/];
                            }
                            return [4 /*yield*/, this.getWorkflow(__assign(__assign({}, request), { workflowId: run.workflowId }))];
                        case 2:
                            workflow = _c.sent();
                            return [4 /*yield*/, ((_b = (_a = this.kernelBridge).subscribeRunEvents) === null || _b === void 0 ? void 0 : _b.call(_a, workflow, run, request.workspaceRootUri, function (updated) { return __awaiter(_this, void 0, void 0, function () {
                                    var _a, _b, _c, materializedRun, error_1;
                                    var _d;
                                    return __generator(this, function (_e) {
                                        switch (_e.label) {
                                            case 0:
                                                _e.trys.push([0, 6, , 7]);
                                                _a = updated;
                                                _b = mergeMemoryCandidates;
                                                _c = [updated.memoryCandidates];
                                                return [4 /*yield*/, this.memory.collectMemoryCandidates(updated)];
                                            case 1:
                                                _a.memoryCandidates = _b.apply(void 0, _c.concat([_e.sent()]));
                                                return [4 /*yield*/, this.workloadStore.materializeRun(request.workspaceRootUri, workflow, updated)];
                                            case 2:
                                                materializedRun = _e.sent();
                                                return [4 /*yield*/, this.store.saveRun(request.workspaceRootUri, materializedRun)];
                                            case 3:
                                                _e.sent();
                                                this.publishRunUpdate(request.workspaceRootUri, materializedRun, 'stream');
                                                if (!isTerminalRun(materializedRun)) return [3 /*break*/, 5];
                                                return [4 /*yield*/, this.unsubscribeRunEvents(request)];
                                            case 4:
                                                _e.sent();
                                                _e.label = 5;
                                            case 5: return [3 /*break*/, 7];
                                            case 6:
                                                error_1 = _e.sent();
                                                (_d = this.client) === null || _d === void 0 ? void 0 : _d.onRunStreamError({
                                                    workspaceRootUri: request.workspaceRootUri,
                                                    runId: request.runId,
                                                    message: error_1 instanceof Error ? error_1.message : String(error_1)
                                                });
                                                return [3 /*break*/, 7];
                                            case 7: return [2 /*return*/];
                                        }
                                    });
                                }); }, function (error) {
                                    var _a;
                                    (_a = _this.client) === null || _a === void 0 ? void 0 : _a.onRunStreamError({
                                        workspaceRootUri: request.workspaceRootUri,
                                        runId: request.runId,
                                        message: error.message
                                    });
                                }))];
                        case 3:
                            dispose = _c.sent();
                            if (!dispose) {
                                this.publishRunUpdate(request.workspaceRootUri, run, 'snapshot');
                                return [2 /*return*/];
                            }
                            this.runStreams.set(key, dispose);
                            this.publishRunUpdate(request.workspaceRootUri, run, 'snapshot');
                            return [2 /*return*/];
                    }
                });
            });
        };
        FlowServiceImpl_1.prototype.publishRunUpdate = function (workspaceRootUri, run, reason) {
            var _a;
            (_a = this.client) === null || _a === void 0 ? void 0 : _a.onRunUpdated({ workspaceRootUri: workspaceRootUri, run: (0, common_1.redactFlowRunForDisplay)(run), reason: reason });
        };
        FlowServiceImpl_1.prototype.recordEffectDecision = function (run, effect, status, note, approvedBy) {
            var workload = run.workloads.find(function (item) { return item.effectIds.includes(effect.id); });
            var now = timestamp();
            var artifactId = stableId('artifact', run.id, (workload === null || workload === void 0 ? void 0 : workload.id) || effect.stateId, effect.id, status);
            var artifactUri = effect.kind === 'image' && status === 'applied' && effect.path
                ? effect.path
                : "flow://".concat(run.id, "/").concat(effect.stateId, "/effects/").concat(effect.id, "-").concat(status, ".").concat(effect.kind === 'file' || effect.kind === 'file_write' ? 'diff' : 'json');
            run.artifacts = upsertRunArtifact(run.artifacts, {
                id: artifactId,
                runId: run.id,
                stateId: effect.stateId,
                uri: artifactUri,
                kind: effect.kind === 'file' || effect.kind === 'file_write' ? 'patch' : 'other',
                summary: "".concat(effect.kind === 'image' ? 'Image effect' : 'Effect', " ").concat(status, ": ").concat(effect.artifactPath || effect.path || effect.summary),
                createdAt: now
            });
            if (workload) {
                workload.outputArtifacts = addUniqueCopy(workload.outputArtifacts, artifactUri);
            }
            run.events.push({
                id: stableId('event', run.id, effect.id, status, String(run.events.length)),
                runId: run.id,
                workflowId: run.workflowId,
                type: "effect.".concat(status),
                timestamp: now,
                stateId: effect.stateId,
                workloadId: workload === null || workload === void 0 ? void 0 : workload.id,
                message: "Effect ".concat(status, " for \"").concat(effect.path || effect.stateId, "\"."),
                payload: {
                    effectId: effect.id,
                    effectType: effect.type,
                    status: status,
                    path: effect.path,
                    artifactId: artifactId,
                    artifactUri: artifactUri,
                    artifactPath: effect.artifactPath,
                    mimeType: effect.mimeType,
                    bytes: effect.bytes,
                    provider: effect.provider,
                    hashBefore: effect.hashBefore,
                    hashAfter: effect.hashAfter,
                    patch: effect.patch,
                    approvalPolicy: effect.approvalPolicy,
                    approvedBy: approvedBy,
                    note: note
                }
            });
            run.updatedAt = now;
        };
        FlowServiceImpl_1.prototype.assertHostCapabilities = function (workflow) {
            return __awaiter(this, void 0, void 0, function () {
                var capabilities, resolution;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getRuntimeCapabilities()];
                        case 1:
                            capabilities = _a.sent();
                            resolution = (0, common_1.resolveFlowWorkflowCapabilities)(workflow, capabilities);
                            if (resolution.missing.length > 0) {
                                throw new Error((0, common_1.formatMissingCapabilities)(resolution.missing, {
                                    workflow: workflow,
                                    host: "CyberVinci (".concat(capabilities.kernelBridge, " kernel bridge)"),
                                    executionMode: [
                                        "kernel_".concat(capabilities.kernelBridge),
                                        "demo=".concat(capabilities.demoMode),
                                        "deterministicFallback=".concat(capabilities.deterministicFallback ? 'on' : 'off')
                                    ].join('; ')
                                }));
                            }
                            return [2 /*return*/];
                    }
                });
            });
        };
        return FlowServiceImpl_1;
    }());
    __setFunctionName(_classThis, "FlowServiceImpl");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _store_decorators = [(0, inversify_1.inject)(flow_store_1.FlowStore)];
        _workloadStore_decorators = [(0, inversify_1.inject)(markdown_workload_store_1.MarkdownWorkloadStore)];
        _agentMarkdownStore_decorators = [(0, inversify_1.inject)(agent_markdown_store_1.AgentMarkdownStore)];
        _kernelBridge_decorators = [(0, inversify_1.inject)(flow_kernel_bridge_1.FlowKernelBridge)];
        _memory_decorators = [(0, inversify_1.inject)(memory_adapter_1.MemoryAdapter)];
        _fileEffectHostAdapter_decorators = [(0, inversify_1.inject)(file_effect_host_adapter_1.FileEffectHostAdapter), (0, inversify_1.optional)()];
        _imageEffectHostAdapter_decorators = [(0, inversify_1.inject)(image_effect_host_adapter_1.ImageEffectHostAdapter), (0, inversify_1.optional)()];
        _languageModelRegistry_decorators = [(0, inversify_1.inject)(ai_core_1.LanguageModelRegistry), (0, inversify_1.optional)()];
        _codexProviderService_decorators = [(0, inversify_1.inject)(codex_provider_service_1.CodexProviderService), (0, inversify_1.optional)()];
        __esDecorate(null, null, _store_decorators, { kind: "field", name: "store", static: false, private: false, access: { has: function (obj) { return "store" in obj; }, get: function (obj) { return obj.store; }, set: function (obj, value) { obj.store = value; } }, metadata: _metadata }, _store_initializers, _store_extraInitializers);
        __esDecorate(null, null, _workloadStore_decorators, { kind: "field", name: "workloadStore", static: false, private: false, access: { has: function (obj) { return "workloadStore" in obj; }, get: function (obj) { return obj.workloadStore; }, set: function (obj, value) { obj.workloadStore = value; } }, metadata: _metadata }, _workloadStore_initializers, _workloadStore_extraInitializers);
        __esDecorate(null, null, _agentMarkdownStore_decorators, { kind: "field", name: "agentMarkdownStore", static: false, private: false, access: { has: function (obj) { return "agentMarkdownStore" in obj; }, get: function (obj) { return obj.agentMarkdownStore; }, set: function (obj, value) { obj.agentMarkdownStore = value; } }, metadata: _metadata }, _agentMarkdownStore_initializers, _agentMarkdownStore_extraInitializers);
        __esDecorate(null, null, _kernelBridge_decorators, { kind: "field", name: "kernelBridge", static: false, private: false, access: { has: function (obj) { return "kernelBridge" in obj; }, get: function (obj) { return obj.kernelBridge; }, set: function (obj, value) { obj.kernelBridge = value; } }, metadata: _metadata }, _kernelBridge_initializers, _kernelBridge_extraInitializers);
        __esDecorate(null, null, _memory_decorators, { kind: "field", name: "memory", static: false, private: false, access: { has: function (obj) { return "memory" in obj; }, get: function (obj) { return obj.memory; }, set: function (obj, value) { obj.memory = value; } }, metadata: _metadata }, _memory_initializers, _memory_extraInitializers);
        __esDecorate(null, null, _fileEffectHostAdapter_decorators, { kind: "field", name: "fileEffectHostAdapter", static: false, private: false, access: { has: function (obj) { return "fileEffectHostAdapter" in obj; }, get: function (obj) { return obj.fileEffectHostAdapter; }, set: function (obj, value) { obj.fileEffectHostAdapter = value; } }, metadata: _metadata }, _fileEffectHostAdapter_initializers, _fileEffectHostAdapter_extraInitializers);
        __esDecorate(null, null, _imageEffectHostAdapter_decorators, { kind: "field", name: "imageEffectHostAdapter", static: false, private: false, access: { has: function (obj) { return "imageEffectHostAdapter" in obj; }, get: function (obj) { return obj.imageEffectHostAdapter; }, set: function (obj, value) { obj.imageEffectHostAdapter = value; } }, metadata: _metadata }, _imageEffectHostAdapter_initializers, _imageEffectHostAdapter_extraInitializers);
        __esDecorate(null, null, _languageModelRegistry_decorators, { kind: "field", name: "languageModelRegistry", static: false, private: false, access: { has: function (obj) { return "languageModelRegistry" in obj; }, get: function (obj) { return obj.languageModelRegistry; }, set: function (obj, value) { obj.languageModelRegistry = value; } }, metadata: _metadata }, _languageModelRegistry_initializers, _languageModelRegistry_extraInitializers);
        __esDecorate(null, null, _codexProviderService_decorators, { kind: "field", name: "codexProviderService", static: false, private: false, access: { has: function (obj) { return "codexProviderService" in obj; }, get: function (obj) { return obj.codexProviderService; }, set: function (obj, value) { obj.codexProviderService = value; } }, metadata: _metadata }, _codexProviderService_initializers, _codexProviderService_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        FlowServiceImpl = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return FlowServiceImpl = _classThis;
}();
exports.FlowServiceImpl = FlowServiceImpl;
function mergeMemoryCandidates(existing, collected) {
    if (existing === void 0) { existing = []; }
    if (collected === void 0) { collected = []; }
    var byId = new Map(existing.map(function (candidate) { return [candidate.id, candidate]; }));
    for (var _i = 0, collected_1 = collected; _i < collected_1.length; _i++) {
        var candidate = collected_1[_i];
        if (!byId.has(candidate.id)) {
            byId.set(candidate.id, candidate);
        }
    }
    return __spreadArray([], byId.values(), true);
}
function isFileEffect(effect) {
    return effect.kind === 'file' || effect.kind === 'file_write' || effect.type === 'file.created' || effect.type === 'file.edited' || effect.type === 'file.deleted';
}
function isImageEffect(effect) {
    return effect.kind === 'image' || effect.type === 'image.generate' || effect.type === 'image.generated' || effect.type === 'image';
}
function findSourceEffect(run, effect) {
    var _a;
    var workload = run.workloads.find(function (item) { return item.effectIds.includes(effect.id); });
    if (!((_a = workload === null || workload === void 0 ? void 0 : workload.outputEnvelope) === null || _a === void 0 ? void 0 : _a.effects)) {
        return undefined;
    }
    return workload.outputEnvelope.effects.find(function (candidate) {
        var candidatePath = candidate.path || '';
        return candidate.type === effect.type
            && candidatePath === (effect.path || candidatePath)
            && (candidate.summary || '') === (effect.summary || candidate.summary || '');
    }) || workload.outputEnvelope.effects.find(function (candidate) { return candidate.type === effect.type && (candidate.path || '') === (effect.path || ''); });
}
function sourceContent(effect) {
    return effect.content;
}
function parseConfiguredCommandAllowlist() {
    var raw = (process.env.FLOW_COMMAND_ALLOWLIST || process.env.FLOW_ALLOWED_COMMANDS || '').trim();
    if (!raw) {
        return [];
    }
    if (raw.startsWith('[')) {
        try {
            var parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                return parsed.map(String).map(function (item) { return item.trim(); }).filter(Boolean);
            }
        }
        catch (_a) {
            return [];
        }
    }
    return raw.split(/[,;\n]/).map(function (item) { return item.trim(); }).filter(Boolean);
}
function upsertRunArtifact(artifacts, artifact) {
    var index = artifacts.findIndex(function (item) { return item.id === artifact.id; });
    if (index === -1) {
        return __spreadArray(__spreadArray([], artifacts, true), [artifact], false);
    }
    var next = __spreadArray([], artifacts, true);
    next[index] = artifact;
    return next;
}
function addUniqueCopy(values, value) {
    return values.includes(value) ? values : __spreadArray(__spreadArray([], values, true), [value], false);
}
function upsertMemoryWrite(existing, write) {
    if (existing === void 0) { existing = []; }
    var byId = new Map(existing.map(function (item) { return [item.id, item]; }));
    byId.set(write.id, write);
    return __spreadArray([], byId.values(), true);
}
function memoryWriteEvent(run, candidate, memoryWrite, status, eventTimestamp, approvalPolicy) {
    var messages = {
        approved: "Memory candidate \"".concat(candidate.id, "\" approved for explicit write."),
        written: "Memory candidate \"".concat(candidate.id, "\" written to Memory memory."),
        failed: "Memory candidate \"".concat(candidate.id, "\" could not be written.")
    };
    return {
        id: stableId('event', run.id, memoryWrite.id, status),
        runId: run.id,
        workflowId: run.workflowId,
        type: "memory_write.".concat(status),
        timestamp: eventTimestamp,
        stateId: candidate.stateId,
        message: messages[status],
        payload: {
            candidateId: candidate.id,
            memoryWriteId: memoryWrite.id,
            scope: memoryWrite.scope,
            target: memoryWrite.target,
            status: status,
            error: memoryWrite.error,
            approvalPolicy: approvalPolicy,
            memoryWrite: memoryWrite
        }
    };
}
function assertApprovalAllowed(action, approved) {
    var decision = (0, flow_approval_policy_1.decideFlowApprovalPolicy)({ action: action, approved: approved });
    if (decision.blocked || !decision.approved) {
        throw new Error(decision.message || "Approval required for ".concat(action, "."));
    }
    return decision;
}
function streamKey(workspaceRootUri, runId) {
    return "".concat(workspaceRootUri || '', "::").concat(runId);
}
function isTerminalRun(run) {
    return run.status === 'completed' || run.status === 'failed' || run.status === 'cancelled';
}
function renderFinalReport(run, note) {
    var redactedRun = (0, common_1.redactFlowRunForDisplay)(run);
    var issueCount = run.workloads.reduce(function (count, workload) { return count + workload.issues.length; }, 0);
    return (0, common_1.redactFlowSecretsText)(__spreadArray(__spreadArray(__spreadArray([
        "# Flow Final Report",
        '',
        "Run: ".concat(redactedRun.id),
        "Workflow: ".concat(redactedRun.workflowId),
        "Status: ".concat(redactedRun.status),
        "Updated: ".concat(redactedRun.updatedAt),
        note ? "Note: ".concat(note) : undefined,
        '',
        '## Summary',
        '',
        "- Artifacts: ".concat(run.artifacts.length),
        "- Effects: ".concat(run.effects.length),
        "- Issues: ".concat(issueCount),
        "- Events: ".concat(run.events.length),
        '',
        '## Artifacts',
        ''
    ], (redactedRun.artifacts.length ? redactedRun.artifacts.map(function (artifact) { return "- ".concat(artifact.kind, ": ").concat(artifact.summary || artifact.uri); }) : ['- None']), true), [
        '',
        '## Effects',
        ''
    ], false), (redactedRun.effects.length ? redactedRun.effects.map(function (effect) { return "- ".concat(effect.kind, "/").concat(effect.status, ": ").concat(effect.summary); }) : ['- None']), true).filter(function (line) { return line !== undefined; }).join('\n')) || '';
}
function renderSecondRunPrompt(sourceRun, suggestion) {
    var issueLines = suggestion.issues.length
        ? suggestion.issues.map(function (issue, index) { return [
            "".concat(index + 1, ". ").concat(issue.severity, " / ").concat(issue.type, ": ").concat(issue.summary),
            issue.impact ? "   Impact: ".concat(issue.impact) : undefined,
            issue.suggestedFollowup ? "   Follow-up: ".concat(issue.suggestedFollowup) : undefined
        ].filter(Boolean).join('\n'); })
        : ['No source issues were attached.'];
    return (0, common_1.redactFlowSecretsText)(__spreadArray([
        suggestion.prompt,
        '',
        '## Source Run Context',
        '',
        "Source run: ".concat(sourceRun.id),
        "Source workflow: ".concat(sourceRun.workflowId),
        "Source status: ".concat(sourceRun.status),
        "Source prompt: ".concat(sourceRun.prompt),
        '',
        '## Relevant Issues',
        ''
    ], issueLines, true).join('\n')) || '';
}
function appendSecondRunContext(contextPack, sourceRun, suggestion) {
    return __assign(__assign({}, contextPack), { sections: __spreadArray(__spreadArray([], (contextPack.sections || []), true), [
            {
                id: 'second_run_source',
                title: 'Second Run Source',
                items: __spreadArray([
                    {
                        title: "Source run ".concat(sourceRun.id),
                        content: (0, common_1.redactFlowSecretsText)("Workflow ".concat(sourceRun.workflowId, "; status ").concat(sourceRun.status, "; prompt: ").concat(sourceRun.prompt)) || '',
                        source: 'flow.second-run'
                    }
                ], suggestion.issues.map(function (issue, index) { return ({
                    title: "".concat(issue.severity, " / ").concat(issue.type),
                    content: [issue.summary, issue.impact, issue.suggestedFollowup].filter(Boolean).join('\n'),
                    source: "flow.second-run.issue.".concat(index + 1)
                }); }), true)
            }
        ], false), signals: __spreadArray(__spreadArray([], contextPack.signals, true), [
            { key: 'second_run.source_run_id', value: sourceRun.id },
            { key: 'second_run.source_issue_count', value: suggestion.issues.length }
        ], false) });
}
function collectWorkflowAgentMarkdownPaths(workflow) {
    var byPath = new Map();
    var visit = function (state) {
        var _a, _b, _c, _d;
        var agentId = (_a = state.agent) === null || _a === void 0 ? void 0 : _a.trim();
        if (agentId) {
            var relativePath = ((_b = workflow.agents) === null || _b === void 0 ? void 0 : _b[agentId]) || agentId;
            if (isMarkdownAgentPath(relativePath) && !byPath.has(relativePath)) {
                byPath.set(relativePath, {
                    relativePath: relativePath,
                    agentId: agentId,
                    role: state.agentRole || agentId
                });
            }
        }
        Object.values(state.branches || {}).forEach(visit);
        if ((_c = state.dynamicParallel) === null || _c === void 0 ? void 0 : _c.worker) {
            visit(state.dynamicParallel.worker);
        }
        if ((_d = state.tournament) === null || _d === void 0 ? void 0 : _d.judge) {
            visit(state.tournament.judge);
        }
    };
    Object.values(workflow.states || {}).forEach(visit);
    return __spreadArray([], byPath.values(), true);
}
function isMarkdownAgentPath(relativePath) {
    return /\.(md|markdown)$/i.test(relativePath);
}
function defaultGeneratedAgentMarkdown(agent) {
    var title = titleCase(agent.agentId.replace(/[-_]+/g, ' '));
    return [
        "# ".concat(title),
        '',
        '## Role',
        '',
        "Act as the ".concat(agent.role, " stage in a CyberVinci Flow workflow."),
        '',
        '## Instructions',
        '',
        '- Follow the workflow state systemPrompt and taskPrompt.',
        '- Use the provided input artifacts and produce the declared outputs.',
        '- Keep internal reasoning private; write concise decisions, evidence, and results into the requested artifacts.',
        '- Prefer Markdown for narrative outputs and valid JSON only when the workflow output path requires JSON.'
    ].join('\n');
}
function titleCase(value) {
    return value.replace(/\b\w/g, function (match) { return match.toUpperCase(); });
}
function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
}
function normalizeAiAuthoredWorkflow(workflow, fallbackName) {
    var _a;
    var cloned = cloneJson(workflow);
    var name = ((_a = cloned.name) === null || _a === void 0 ? void 0 : _a.trim()) || (fallbackName === null || fallbackName === void 0 ? void 0 : fallbackName.trim()) || 'AI Authored Workflow';
    return __assign(__assign({}, cloned), { version: cloned.version || 'flow.workflow/v1', id: sanitizeWorkflowId(cloned.id || name || 'ai_authored_workflow'), name: name, states: cloned.states || {}, transitions: cloned.transitions || [] });
}
function sanitizeWorkflowId(value) {
    return value.trim().replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase() || 'ai_authored_workflow';
}
function stableId(prefix) {
    var parts = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        parts[_i - 1] = arguments[_i];
    }
    return "".concat(prefix, "-").concat(parts.join('-').replace(/[^a-zA-Z0-9._-]/g, '_'));
}
function timestamp() {
    return new Date().toISOString();
}
function createSampleWorkflow() {
    return {
        version: 'flow.workflow/v1',
        id: 'flow_studio_sample',
        name: 'Flow Sample',
        description: 'A removable UI sample workflow with a human approval gate.',
        agents: {
            architect: 'agents/solution-architect.md',
            frontend: 'agents/frontend-specialist.md',
            qa: 'agents/qa-specialist.md'
        },
        states: {
            intake: {
                type: 'input',
                outputs: ['request.md']
            },
            architecture: {
                type: 'agent',
                agent: 'architect',
                input: { include: ['request.md'] },
                outputs: ['architecture/plan.md']
            },
            frontend_work: {
                type: 'agent',
                agent: 'frontend',
                input: { include: ['architecture/plan.md'] },
                outputs: ['ui/implementation-notes.md'],
                gates: [{
                        id: 'frontend_review_gate',
                        title: 'Review frontend plan',
                        prompt: 'Approve the simulated frontend workload before QA starts.'
                    }]
            },
            qa: {
                type: 'agent',
                agent: 'qa',
                outputs: ['qa/report.md']
            },
            final_report: {
                type: 'report',
                outputs: ['final/report.md']
            }
        },
        transitions: [
            { from: 'intake', to: 'architecture', on: 'run.started' },
            { from: 'architecture', to: 'frontend_work', on: 'workload.completed', guard: { 'artifact.exists': 'architecture/plan.md' } },
            { from: 'frontend_work', to: 'qa', on: 'gate.approved' },
            { from: 'qa', to: 'final_report', on: 'workload.completed', guard: { 'signal.equals': { key: 'qa.status', value: 'passed' } } }
        ]
    };
}

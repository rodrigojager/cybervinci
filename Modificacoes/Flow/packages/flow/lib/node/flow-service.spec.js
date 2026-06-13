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
var chai_1 = require("chai");
var fs = require("fs/promises");
var os = require("os");
var path = require("path");
var file_uri_1 = require("@theia/core/lib/common/file-uri");
var common_1 = require("../common");
var flow_service_1 = require("./flow-service");
var flow_store_1 = require("./flow-store");
var agent_markdown_store_1 = require("./agent-markdown-store");
var TestFlowService = /** @class */ (function (_super) {
    __extends(TestFlowService, _super);
    function TestFlowService(workflow, capabilities) {
        if (capabilities === void 0) { capabilities = common_1.FLOW_CAPABILITIES; }
        var _this = _super.call(this) || this;
        _this.workflow = workflow;
        _this.capabilities = capabilities;
        return _this;
    }
    TestFlowService.prototype.getWorkflow = function () {
        return Promise.resolve(this.workflow);
    };
    TestFlowService.prototype.getRuntimeCapabilities = function () {
        return Promise.resolve(this.capabilities);
    };
    return TestFlowService;
}(flow_service_1.FlowServiceImpl));
var RuntimeCapabilitiesFlowService = /** @class */ (function (_super) {
    __extends(RuntimeCapabilitiesFlowService, _super);
    function RuntimeCapabilitiesFlowService() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    RuntimeCapabilitiesFlowService.prototype.readCapabilities = function () {
        return this.getRuntimeCapabilities();
    };
    return RuntimeCapabilitiesFlowService;
}(flow_service_1.FlowServiceImpl));
var MemoryAuditFlowService = /** @class */ (function (_super) {
    __extends(MemoryAuditFlowService, _super);
    function MemoryAuditFlowService(run, memory) {
        var _this = _super.call(this) || this;
        _this.run = run;
        Object.defineProperty(_this, 'memory', { value: memory });
        Object.defineProperty(_this, 'store', {
            value: {
                saveRun: function (_workspaceRootUri, updatedRun) { return __awaiter(_this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        Object.assign(this.run, updatedRun);
                        return [2 /*return*/];
                    });
                }); }
            }
        });
        return _this;
    }
    MemoryAuditFlowService.prototype.getRun = function () {
        return Promise.resolve(this.run);
    };
    return MemoryAuditFlowService;
}(flow_service_1.FlowServiceImpl));
var EffectDecisionFlowService = /** @class */ (function (_super) {
    __extends(EffectDecisionFlowService, _super);
    function EffectDecisionFlowService(run) {
        var _this = _super.call(this) || this;
        _this.run = run;
        Object.defineProperty(_this, 'store', {
            value: {
                saveRun: function (_workspaceRootUri, updatedRun) { return __awaiter(_this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        Object.assign(this.run, updatedRun);
                        return [2 /*return*/];
                    });
                }); }
            }
        });
        Object.defineProperty(_this, 'fileEffectHostAdapter', {
            value: {
                apply: function () { return __awaiter(_this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        return [2 /*return*/, ({
                                type: 'file.edited',
                                workspaceRoot: '/workspace',
                                relativePath: 'src/app.ts',
                                absolutePath: '/workspace/src/app.ts',
                                existedBefore: true,
                                contentBefore: 'old',
                                contentAfter: 'new',
                                hashBefore: 'sha256:old',
                                hashAfter: 'sha256:new',
                                patch: '--- a/src/app.ts\n+++ b/src/app.ts\n-old\n+new\n',
                                approvalPolicy: 'human_gate_required',
                                requiresApproval: true,
                                blocked: false,
                                riskReasons: ['destructive file effect'],
                                applied: true
                            })];
                    });
                }); }
            }
        });
        return _this;
    }
    EffectDecisionFlowService.prototype.getRun = function () {
        return Promise.resolve(this.run);
    };
    return EffectDecisionFlowService;
}(flow_service_1.FlowServiceImpl));
var SecondRunFlowService = /** @class */ (function (_super) {
    __extends(SecondRunFlowService, _super);
    function SecondRunFlowService(sourceRun, sourceWorkflow) {
        var _this = _super.call(this) || this;
        _this.sourceRun = sourceRun;
        _this.sourceWorkflow = sourceWorkflow;
        _this.savedRuns = [];
        _this.savedWorkflows = [];
        Object.defineProperty(_this, 'store', {
            value: {
                saveWorkflow: function (_workspaceRootUri, workflow) { return __awaiter(_this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        this.savedWorkflows.push(workflow);
                        return [2 /*return*/];
                    });
                }); },
                saveRun: function (_workspaceRootUri, run) { return __awaiter(_this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        this.savedRuns.push(run);
                        if (run.id === this.sourceRun.id) {
                            Object.assign(this.sourceRun, run);
                        }
                        return [2 /*return*/];
                    });
                }); }
            }
        });
        Object.defineProperty(_this, 'kernelBridge', {
            value: {
                startRun: function (workflow, prompt) { return __awaiter(_this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        return [2 /*return*/, ({
                                id: 'run-2',
                                workflowId: workflow.id,
                                prompt: prompt,
                                status: 'running',
                                createdAt: '2026-05-20T10:01:00.000Z',
                                updatedAt: '2026-05-20T10:01:00.000Z',
                                currentStateIds: ['intake'],
                                stateStatuses: { intake: 'running' },
                                workloads: [],
                                events: [],
                                artifacts: [],
                                effects: [],
                                signals: [],
                                gates: [],
                                tick: 0
                            })];
                    });
                }); }
            }
        });
        Object.defineProperty(_this, 'memory', {
            value: {
                buildContextPack: function (_workspaceRootUri, workflow) { return __awaiter(_this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        return [2 /*return*/, ({
                                summary: 'test context',
                                workflow: {
                                    id: workflow.id,
                                    name: workflow.name,
                                    stateCount: Object.keys(workflow.states).length,
                                    transitionCount: workflow.transitions.length,
                                    agentIds: []
                                },
                                files: [],
                                symbols: [],
                                signals: []
                            })];
                    });
                }); },
                collectMemoryCandidates: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                    return [2 /*return*/, []];
                }); }); }
            }
        });
        Object.defineProperty(_this, 'workloadStore', {
            value: {
                materializeRun: function (_workspaceRootUri, _workflow, run) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                    return [2 /*return*/, run];
                }); }); }
            }
        });
        return _this;
    }
    SecondRunFlowService.prototype.getRun = function () {
        return Promise.resolve(this.sourceRun);
    };
    SecondRunFlowService.prototype.getWorkflow = function () {
        return Promise.resolve(this.savedWorkflows[0] || this.sourceWorkflow);
    };
    return SecondRunFlowService;
}(flow_service_1.FlowServiceImpl));
var PresetFlowService = /** @class */ (function (_super) {
    __extends(PresetFlowService, _super);
    function PresetFlowService(store, agentMarkdownStore) {
        var _this = _super.call(this) || this;
        Object.defineProperty(_this, 'store', { value: store });
        Object.defineProperty(_this, 'agentMarkdownStore', { value: agentMarkdownStore });
        return _this;
    }
    return PresetFlowService;
}(flow_service_1.FlowServiceImpl));
var AiAuthoringDraftFlowService = /** @class */ (function (_super) {
    __extends(AiAuthoringDraftFlowService, _super);
    function AiAuthoringDraftFlowService(store, agentMarkdownStore) {
        var _this = _super.call(this) || this;
        Object.defineProperty(_this, 'store', { value: store });
        Object.defineProperty(_this, 'agentMarkdownStore', { value: agentMarkdownStore });
        return _this;
    }
    AiAuthoringDraftFlowService.prototype.startRun = function (request) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, {
                        id: 'run-ai-authoring',
                        workflowId: request.workflowId,
                        prompt: request.prompt,
                        status: 'running',
                        createdAt: '2026-06-05T00:00:00.000Z',
                        updatedAt: '2026-06-05T00:00:00.000Z',
                        currentStateIds: ['input'],
                        stateStatuses: { input: 'running' },
                        workloads: [],
                        events: [],
                        artifacts: [],
                        effects: [],
                        signals: [],
                        gates: [],
                        tick: 0
                    }];
            });
        });
    };
    return AiAuthoringDraftFlowService;
}(flow_service_1.FlowServiceImpl));
describe('FlowServiceImpl capability gates', function () {
    var tempDir;
    var workspaceRootUri;
    beforeEach(function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fs.mkdtemp(path.join(os.tmpdir(), 'flow-service-'))];
                case 1:
                    tempDir = _a.sent();
                    workspaceRootUri = file_uri_1.FileUri.create(tempDir).toString();
                    return [2 /*return*/];
            }
        });
    }); });
    afterEach(function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fs.rm(tempDir, { recursive: true, force: true })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('blocks command.execute workflows when the host does not declare command execution', function () { return __awaiter(void 0, void 0, void 0, function () {
        var service, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    service = new TestFlowService({
                        version: 'flow.workflow/v1',
                        id: 'command_workflow',
                        name: 'Command Workflow',
                        requires: {
                            capabilities: ['command.execute']
                        },
                        states: {
                            command_step: {
                                type: 'command',
                                command: 'npm test'
                            }
                        },
                        transitions: []
                    });
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, service.startRun({
                            workspaceRootUri: 'file:///workspace',
                            workflowId: 'command_workflow',
                            prompt: 'run commands'
                        })];
                case 2:
                    _a.sent();
                    throw new Error('startRun unexpectedly succeeded.');
                case 3:
                    error_1 = _a.sent();
                    (0, chai_1.expect)(error_1).to.be.instanceOf(Error);
                    (0, chai_1.expect)(error_1.message).to.equal('Missing Flow host capability: command.execute '
                        + '(states: command_step; host: CyberVinci (simulated kernel bridge); '
                        + 'execution mode: kernel_simulated; demo=off; deterministicFallback=on; '
                        + 'action: configure command execution policy with allowlisted commands/env/cwd, timeout, output redaction, and approvals).');
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); });
    it('lists pipeline presets and materializes built-in preset agents when creating workflows', function () { return __awaiter(void 0, void 0, void 0, function () {
        var store, agentMarkdownStore, service, presets, workflow, coordinatorAgent, coordinatorState;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    store = new flow_store_1.FlowStore();
                    agentMarkdownStore = new agent_markdown_store_1.AgentMarkdownStore();
                    service = new PresetFlowService(store, agentMarkdownStore);
                    return [4 /*yield*/, service.listPipelinePresets({ workspaceRootUri: workspaceRootUri })];
                case 1:
                    presets = _b.sent();
                    return [4 /*yield*/, service.createWorkflowFromPreset({
                            workspaceRootUri: workspaceRootUri,
                            presetId: common_1.SISYPHUS_ULTRAWORK_COORDINATOR_PRESET_ID,
                            workflowId: 'sisyphus_created'
                        })];
                case 2:
                    workflow = _b.sent();
                    return [4 /*yield*/, agentMarkdownStore.readAgent(workspaceRootUri, 'sisyphus/coordinator.md')];
                case 3:
                    coordinatorAgent = _b.sent();
                    coordinatorState = workflow.states.sisyphus_coordinator;
                    (0, chai_1.expect)(presets.map(function (preset) { return preset.id; })).to.include(common_1.SISYPHUS_ULTRAWORK_COORDINATOR_PRESET_ID);
                    (0, chai_1.expect)(workflow.id).to.equal('sisyphus_created');
                    (0, chai_1.expect)(coordinatorAgent === null || coordinatorAgent === void 0 ? void 0 : coordinatorAgent.content).to.contain('# Sisyphus Coordinator');
                    (0, chai_1.expect)(coordinatorState.provider).to.equal(undefined);
                    (0, chai_1.expect)(coordinatorState.systemPrompt).to.contain('Sisyphus coordinator');
                    (0, chai_1.expect)(coordinatorState.taskPrompt).to.contain('plan/plan.md');
                    (0, chai_1.expect)((_a = coordinatorState.deliverables) === null || _a === void 0 ? void 0 : _a.map(function (deliverable) { return deliverable.path; })).to.deep.equal([
                        'plan/plan.md',
                        'plan/acceptance-criteria.md',
                        'plan/work-order.md'
                    ]);
                    return [2 /*return*/];
            }
        });
    }); });
    it('materializes and runs AI-authored dynamic workflows without manual JSON editing', function () { return __awaiter(void 0, void 0, void 0, function () {
        var store, agentMarkdownStore, service, run, workflow, agent;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    store = new flow_store_1.FlowStore();
                    agentMarkdownStore = new agent_markdown_store_1.AgentMarkdownStore();
                    service = new AiAuthoringDraftFlowService(store, agentMarkdownStore);
                    return [4 /*yield*/, service.runDynamicWorkflow({
                            workspaceRootUri: workspaceRootUri,
                            prompt: 'Create a focused reporting workflow.',
                            authoringDraft: {
                                version: 'flow.ai-authoring/v1',
                                action: 'create_workflow',
                                reason: 'No saved workflow or built-in pattern is specific enough.',
                                promptMarkdown: 'Create a focused reporting workflow.',
                                workflow: {
                                    version: 'flow.workflow/v1',
                                    id: 'AI Generated Report',
                                    name: 'AI Generated Report',
                                    agents: {
                                        reviewer: 'ai/reviewer.md'
                                    },
                                    states: {
                                        input: { type: 'input', outputs: ['input/request.md'] },
                                        reviewer: {
                                            type: 'agent',
                                            agent: 'reviewer',
                                            agentRole: 'verifier',
                                            systemPrompt: 'Review the user request before the report is finalized.',
                                            taskPrompt: 'Produce a concise review artifact.',
                                            outputs: ['review/review.md']
                                        },
                                        final_report: { type: 'report', input: { include: ['input/request.md', 'review/review.md'] }, outputs: ['final/report.md'] }
                                    },
                                    transitions: [
                                        { id: 'input_to_reviewer', from: 'input', to: 'reviewer', on: 'run.started' },
                                        { id: 'reviewer_to_final', from: 'reviewer', to: 'final_report', on: 'workload.completed' }
                                    ]
                                }
                            }
                        })];
                case 1:
                    run = _b.sent();
                    return [4 /*yield*/, store.getWorkflow(workspaceRootUri, run.workflowId)];
                case 2:
                    workflow = _b.sent();
                    return [4 /*yield*/, agentMarkdownStore.readAgent(workspaceRootUri, 'ai/reviewer.md')];
                case 3:
                    agent = _b.sent();
                    (0, chai_1.expect)(run.workflowId).to.equal('ai_generated_report');
                    (0, chai_1.expect)(run.prompt).to.equal('Create a focused reporting workflow.');
                    (0, chai_1.expect)(workflow === null || workflow === void 0 ? void 0 : workflow.name).to.equal('AI Generated Report');
                    (0, chai_1.expect)((_a = workflow === null || workflow === void 0 ? void 0 : workflow.file) === null || _a === void 0 ? void 0 : _a.format).to.equal('json');
                    (0, chai_1.expect)(agent === null || agent === void 0 ? void 0 : agent.content).to.contain('Act as the verifier stage');
                    return [2 /*return*/];
            }
        });
    }); });
    it('reflects the Memory provider reported by the adapter', function () { return __awaiter(void 0, void 0, void 0, function () {
        var service, capabilities;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    service = new RuntimeCapabilitiesFlowService();
                    Object.defineProperty(service, 'memory', {
                        value: {
                            report: function () { return __awaiter(void 0, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    return [2 /*return*/, ({
                                            provider: 'external',
                                            available: true
                                        })];
                                });
                            }); }
                        }
                    });
                    return [4 /*yield*/, service.readCapabilities()];
                case 1:
                    capabilities = _a.sent();
                    (0, chai_1.expect)(capabilities.memoryAdapter).to.equal(true);
                    (0, chai_1.expect)(capabilities.memoryProvider).to.equal('external');
                    return [2 /*return*/];
            }
        });
    }); });
    it('reports Memory as unavailable when the adapter is missing', function () { return __awaiter(void 0, void 0, void 0, function () {
        var service, capabilities;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    service = new RuntimeCapabilitiesFlowService();
                    return [4 /*yield*/, service.readCapabilities()];
                case 1:
                    capabilities = _a.sent();
                    (0, chai_1.expect)(capabilities.memoryAdapter).to.equal(false);
                    (0, chai_1.expect)(capabilities.memoryProvider).to.equal('missing');
                    return [2 /*return*/];
            }
        });
    }); });
    it('promotes real runtime capabilities only when providers and policies are configured', function () { return __awaiter(void 0, void 0, void 0, function () {
        var previousEnv, service, capabilities;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    previousEnv = snapshotFlowCapabilityEnv();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, , 3, 4]);
                    process.env.FLOW_AGENT_LLM_COMMAND = 'node ./agent-provider.js';
                    process.env.FLOW_IMAGE_PROVIDER_COMMAND = 'node ./image-provider.js';
                    process.env.FLOW_COMMAND_ALLOWLIST = 'npm,node';
                    service = new RuntimeCapabilitiesFlowService();
                    Object.defineProperty(service, 'fileEffectHostAdapter', {
                        value: {
                            prepare: function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, undefined];
                            }); }); },
                            apply: function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, undefined];
                            }); }); }
                        }
                    });
                    return [4 /*yield*/, service.readCapabilities()];
                case 2:
                    capabilities = _a.sent();
                    (0, chai_1.expect)(capabilities.llmAgentExecution).to.equal('available');
                    (0, chai_1.expect)(capabilities.llmAgentProvider).to.equal('configured');
                    (0, chai_1.expect)(capabilities.filesystemEdit).to.equal('available');
                    (0, chai_1.expect)(capabilities.filesystemEditPolicy).to.equal('configured');
                    (0, chai_1.expect)(capabilities.imageGeneration).to.equal('available');
                    (0, chai_1.expect)(capabilities.imageProvider).to.equal('configured');
                    (0, chai_1.expect)(capabilities.commandExecution).to.equal(true);
                    (0, chai_1.expect)(capabilities.commandExecutionPolicy).to.equal('configured');
                    return [3 /*break*/, 4];
                case 3:
                    restoreFlowCapabilityEnv(previousEnv);
                    return [7 /*endfinally*/];
                case 4: return [2 /*return*/];
            }
        });
    }); });
    it('does not advertise Codex as configured when FLOW_AGENT_PROVIDER is unset or auto', function () { return __awaiter(void 0, void 0, void 0, function () {
        var previousEnv, service, capabilities, autoCapabilities;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    previousEnv = snapshotFlowCapabilityEnv();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, , 4, 5]);
                    delete process.env.FLOW_AGENT_PROVIDER;
                    delete process.env.FLOW_AGENT_LLM_COMMAND;
                    delete process.env.FLOW_AGENT_COMMAND;
                    service = new RuntimeCapabilitiesFlowService();
                    Object.defineProperty(service, 'codexProviderService', {
                        value: {
                            getStatus: function () { return __awaiter(void 0, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    return [2 /*return*/, ({
                                            available: true,
                                            authenticated: true,
                                            executablePath: 'codex',
                                            capabilities: { imageGeneration: true }
                                        })];
                                });
                            }); }
                        }
                    });
                    return [4 /*yield*/, service.readCapabilities()];
                case 2:
                    capabilities = _a.sent();
                    (0, chai_1.expect)(capabilities.llmAgentExecution).to.equal('unavailable');
                    (0, chai_1.expect)(capabilities.llmAgentProvider).to.equal('missing');
                    (0, chai_1.expect)(capabilities.imageGeneration).to.equal('unavailable');
                    (0, chai_1.expect)(capabilities.imageProvider).to.equal('missing');
                    process.env.FLOW_AGENT_PROVIDER = 'auto';
                    return [4 /*yield*/, service.readCapabilities()];
                case 3:
                    autoCapabilities = _a.sent();
                    (0, chai_1.expect)(autoCapabilities.llmAgentExecution).to.equal('unavailable');
                    (0, chai_1.expect)(autoCapabilities.llmAgentProvider).to.equal('missing');
                    (0, chai_1.expect)(autoCapabilities.imageGeneration).to.equal('unavailable');
                    (0, chai_1.expect)(autoCapabilities.imageProvider).to.equal('missing');
                    return [3 /*break*/, 5];
                case 4:
                    restoreFlowCapabilityEnv(previousEnv);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); });
    it('reports Codex capabilities only when FLOW_AGENT_PROVIDER=codex-provider is set explicitly', function () { return __awaiter(void 0, void 0, void 0, function () {
        var previousEnv, service, capabilities;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    previousEnv = snapshotFlowCapabilityEnv();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, , 3, 4]);
                    process.env.FLOW_AGENT_PROVIDER = 'codex-provider';
                    service = new RuntimeCapabilitiesFlowService();
                    Object.defineProperty(service, 'codexProviderService', {
                        value: {
                            getStatus: function () { return __awaiter(void 0, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    return [2 /*return*/, ({
                                            available: true,
                                            authenticated: true,
                                            executablePath: 'codex',
                                            capabilities: { imageGeneration: true }
                                        })];
                                });
                            }); }
                        }
                    });
                    return [4 /*yield*/, service.readCapabilities()];
                case 2:
                    capabilities = _a.sent();
                    (0, chai_1.expect)(capabilities.llmAgentExecution).to.equal('available');
                    (0, chai_1.expect)(capabilities.llmAgentProvider).to.equal('configured');
                    (0, chai_1.expect)(capabilities.imageGeneration).to.equal('available');
                    (0, chai_1.expect)(capabilities.imageProvider).to.equal('configured');
                    (0, chai_1.expect)(capabilities.demoMode).to.equal('off');
                    return [3 /*break*/, 4];
                case 3:
                    restoreFlowCapabilityEnv(previousEnv);
                    return [7 /*endfinally*/];
                case 4: return [2 /*return*/];
            }
        });
    }); });
    it('keeps e2e mock LLM separate from real agent execution', function () { return __awaiter(void 0, void 0, void 0, function () {
        var previousEnv, service, capabilities;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    previousEnv = snapshotFlowCapabilityEnv();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, , 3, 4]);
                    process.env.FLOW_AGENT_PROVIDER = 'e2e-mock';
                    delete process.env.FLOW_AGENT_LLM_COMMAND;
                    delete process.env.FLOW_AGENT_COMMAND;
                    service = new RuntimeCapabilitiesFlowService();
                    return [4 /*yield*/, service.readCapabilities()];
                case 2:
                    capabilities = _a.sent();
                    (0, chai_1.expect)(capabilities.llmAgentExecution).to.equal('mock');
                    (0, chai_1.expect)(capabilities.llmAgentProvider).to.equal('mock');
                    (0, chai_1.expect)(capabilities.demoMode).to.equal('e2e');
                    return [3 /*break*/, 4];
                case 3:
                    restoreFlowCapabilityEnv(previousEnv);
                    return [7 /*endfinally*/];
                case 4: return [2 /*return*/];
            }
        });
    }); });
    it('does not advertise command execution without an explicit command allowlist', function () { return __awaiter(void 0, void 0, void 0, function () {
        var previousEnv, service, capabilities;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    previousEnv = snapshotFlowCapabilityEnv();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, , 3, 4]);
                    process.env.FLOW_COMMAND_POLICY = 'configured';
                    delete process.env.FLOW_COMMAND_ALLOWLIST;
                    delete process.env.FLOW_ALLOWED_COMMANDS;
                    service = new RuntimeCapabilitiesFlowService();
                    return [4 /*yield*/, service.readCapabilities()];
                case 2:
                    capabilities = _a.sent();
                    (0, chai_1.expect)(capabilities.commandExecution).to.equal(false);
                    (0, chai_1.expect)(capabilities.commandExecutionPolicy).to.equal('blocked');
                    return [3 /*break*/, 4];
                case 3:
                    restoreFlowCapabilityEnv(previousEnv);
                    return [7 /*endfinally*/];
                case 4: return [2 /*return*/];
            }
        });
    }); });
    it('audits approved and written memory writes as separate events', function () { return __awaiter(void 0, void 0, void 0, function () {
        var run, service, updated;
        var _a, _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    run = memoryRunFixture();
                    service = new MemoryAuditFlowService(run, {
                        writeApprovedMemory: function (memoryWrite) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, (__assign(__assign({}, memoryWrite), { status: 'written' }))];
                        }); }); }
                    });
                    return [4 /*yield*/, service.approveMemoryCandidate({
                            workspaceRootUri: 'file:///workspace',
                            runId: run.id,
                            candidateId: 'candidate-1',
                            decision: 'approved',
                            approvedBy: 'tester',
                            scope: 'workspace'
                        })];
                case 1:
                    updated = _e.sent();
                    (0, chai_1.expect)((_a = updated.memoryWrites) === null || _a === void 0 ? void 0 : _a[0].status).to.equal('written');
                    (0, chai_1.expect)((_b = updated.memoryCandidates) === null || _b === void 0 ? void 0 : _b[0].status).to.equal('written');
                    (0, chai_1.expect)(updated.events.map(function (event) { return event.type; })).to.include.members(['memory_write.approved', 'memory_write.written']);
                    (0, chai_1.expect)((_d = (_c = updated.events.find(function (event) { return event.type === 'memory_write.approved'; })) === null || _c === void 0 ? void 0 : _c.payload) === null || _d === void 0 ? void 0 : _d.memoryWriteId).to.equal('memory-write-run-1-candidate-1');
                    return [2 /*return*/];
            }
        });
    }); });
    it('audits failed memory writes after approval', function () { return __awaiter(void 0, void 0, void 0, function () {
        var run, service, updated;
        var _a, _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    run = memoryRunFixture();
                    service = new MemoryAuditFlowService(run, {
                        writeApprovedMemory: function (memoryWrite) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, (__assign(__assign({}, memoryWrite), { status: 'failed', error: 'provider unavailable' }))];
                        }); }); }
                    });
                    return [4 /*yield*/, service.approveMemoryCandidate({
                            workspaceRootUri: 'file:///workspace',
                            runId: run.id,
                            candidateId: 'candidate-1',
                            decision: 'approved'
                        })];
                case 1:
                    updated = _e.sent();
                    (0, chai_1.expect)((_a = updated.memoryWrites) === null || _a === void 0 ? void 0 : _a[0].status).to.equal('failed');
                    (0, chai_1.expect)((_b = updated.memoryCandidates) === null || _b === void 0 ? void 0 : _b[0].status).to.equal('approved');
                    (0, chai_1.expect)(updated.events.map(function (event) { return event.type; })).to.include.members(['memory_write.approved', 'memory_write.failed']);
                    (0, chai_1.expect)((_d = (_c = updated.events.find(function (event) { return event.type === 'memory_write.failed'; })) === null || _c === void 0 ? void 0 : _c.payload) === null || _d === void 0 ? void 0 : _d.error).to.equal('provider unavailable');
                    return [2 /*return*/];
            }
        });
    }); });
    it('rejects a pending effect through the service API with an audit event', function () { return __awaiter(void 0, void 0, void 0, function () {
        var run, service, updated;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    run = effectRunFixture();
                    service = new EffectDecisionFlowService(run);
                    return [4 /*yield*/, service.decideEffect({
                            workspaceRootUri: 'file:///workspace',
                            runId: run.id,
                            effectId: 'effect-1',
                            decision: 'rejected',
                            note: 'needs smaller patch',
                            approvedBy: 'tester'
                        })];
                case 1:
                    updated = _b.sent();
                    (0, chai_1.expect)(updated.effects[0].status).to.equal('rejected');
                    (0, chai_1.expect)(updated.events.map(function (event) { return event.type; })).to.include('effect.rejected');
                    (0, chai_1.expect)((_a = updated.events[0].payload) === null || _a === void 0 ? void 0 : _a.note).to.equal('needs smaller patch');
                    return [2 /*return*/];
            }
        });
    }); });
    it('applies an approved pending file effect through the secure adapter', function () { return __awaiter(void 0, void 0, void 0, function () {
        var run, service, updated;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    run = effectRunFixture();
                    service = new EffectDecisionFlowService(run);
                    return [4 /*yield*/, service.decideEffect({
                            workspaceRootUri: 'file:///workspace',
                            runId: run.id,
                            effectId: 'effect-1',
                            decision: 'applied',
                            approvedBy: 'tester'
                        })];
                case 1:
                    updated = _a.sent();
                    (0, chai_1.expect)(updated.effects[0].status).to.equal('applied');
                    (0, chai_1.expect)(updated.effects[0].hashAfter).to.equal('sha256:new');
                    (0, chai_1.expect)(updated.effects[0].patch).to.contain('+new');
                    (0, chai_1.expect)(updated.events.map(function (event) { return event.type; })).to.include('effect.applied');
                    (0, chai_1.expect)(updated.artifacts[0].kind).to.equal('patch');
                    return [2 /*return*/];
            }
        });
    }); });
    it('approves a suggested second run with copied context and source issues', function () { return __awaiter(void 0, void 0, void 0, function () {
        var run, service, newRun;
        var _a, _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    run = secondRunFixture();
                    service = new SecondRunFlowService(run, workflowFixture());
                    return [4 /*yield*/, service.approveSecondRunSuggestion({
                            workspaceRootUri: 'file:///workspace',
                            runId: run.id,
                            suggestionId: 'second-run-1',
                            approvedBy: 'tester'
                        })];
                case 1:
                    newRun = _e.sent();
                    (0, chai_1.expect)(newRun.id).to.equal('run-2');
                    (0, chai_1.expect)(newRun.workflowId).to.not.equal(run.workflowId);
                    (0, chai_1.expect)(newRun.prompt).to.contain('Source run: run-1');
                    (0, chai_1.expect)(newRun.prompt).to.contain('Follow-up: run scoped implementation separately');
                    (0, chai_1.expect)((_b = (_a = newRun.contextPack) === null || _a === void 0 ? void 0 : _a.sections) === null || _b === void 0 ? void 0 : _b[0].id).to.equal('second_run_source');
                    (0, chai_1.expect)(newRun.events.map(function (event) { return event.type; })).to.include('second_run.approved');
                    (0, chai_1.expect)((_c = run.secondRunSuggestion) === null || _c === void 0 ? void 0 : _c.status).to.equal('accepted');
                    (0, chai_1.expect)((_d = run.secondRunSuggestion) === null || _d === void 0 ? void 0 : _d.approvedRunId).to.equal('run-2');
                    return [2 /*return*/];
            }
        });
    }); });
    it('dismisses a suggested second run without creating a new run', function () { return __awaiter(void 0, void 0, void 0, function () {
        var run, service, updated;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    run = secondRunFixture();
                    service = new SecondRunFlowService(run, workflowFixture());
                    return [4 /*yield*/, service.decideSecondRunSuggestion({
                            workspaceRootUri: 'file:///workspace',
                            runId: run.id,
                            suggestionId: 'second-run-1',
                            decision: 'dismissed',
                            approvedBy: 'tester',
                            note: 'defer for now'
                        })];
                case 1:
                    updated = _c.sent();
                    (0, chai_1.expect)(updated.id).to.equal('run-1');
                    (0, chai_1.expect)((_a = updated.secondRunSuggestion) === null || _a === void 0 ? void 0 : _a.status).to.equal('dismissed');
                    (0, chai_1.expect)(updated.events.map(function (event) { return event.type; })).to.include('second_run.dismissed');
                    (0, chai_1.expect)((_b = updated.events[0].payload) === null || _b === void 0 ? void 0 : _b.status).to.equal('dismissed');
                    (0, chai_1.expect)(service.savedRuns.some(function (saved) { return saved.id === 'run-2'; })).to.equal(false);
                    return [2 /*return*/];
            }
        });
    }); });
});
function workflowFixture() {
    return {
        version: 'flow.workflow/v1',
        id: 'workflow-1',
        name: 'Workflow 1',
        states: {
            intake: { type: 'input' }
        },
        transitions: []
    };
}
var capabilityEnvKeys = [
    'FLOW_AGENT_PROVIDER',
    'FLOW_AGENT_LLM_COMMAND',
    'FLOW_AGENT_COMMAND',
    'FLOW_AGENT_MODEL_ID',
    'FLOW_AGENT_LLM_MODEL_ID',
    'FLOW_FILE_EFFECTS',
    'FLOW_IMAGE_PROVIDER_COMMAND',
    'FLOW_IMAGE_PROVIDER_TEST_COMMAND',
    'FLOW_COMMAND_ALLOWLIST',
    'FLOW_ALLOWED_COMMANDS',
    'FLOW_COMMAND_POLICY'
];
function snapshotFlowCapabilityEnv() {
    return Object.fromEntries(capabilityEnvKeys.map(function (key) { return [key, process.env[key]]; }));
}
function restoreFlowCapabilityEnv(snapshot) {
    for (var _i = 0, capabilityEnvKeys_1 = capabilityEnvKeys; _i < capabilityEnvKeys_1.length; _i++) {
        var key = capabilityEnvKeys_1[_i];
        var value = snapshot[key];
        if (value === undefined) {
            delete process.env[key];
        }
        else {
            process.env[key] = value;
        }
    }
}
function secondRunFixture() {
    return __assign(__assign({}, memoryRunFixture()), { secondRunSuggestion: {
            id: 'second-run-1',
            status: 'suggested',
            reason: 'Out-of-scope issue requires a separate run.',
            title: 'Segunda run sugerida',
            sourceRunId: 'run-1',
            sourceIssueCount: 1,
            issues: [{
                    severity: 'high',
                    type: 'out_of_scope',
                    summary: 'Need a scoped follow-up implementation.',
                    suggestedFollowup: 'run scoped implementation separately'
                }],
            prompt: 'Continue only with approved follow-up scope.',
            createdAt: '2026-05-20T10:00:00.000Z'
        } });
}
function memoryRunFixture() {
    return {
        id: 'run-1',
        workflowId: 'workflow-1',
        prompt: 'remember this',
        status: 'running',
        createdAt: '2026-05-20T10:00:00.000Z',
        updatedAt: '2026-05-20T10:00:00.000Z',
        currentStateIds: ['memory'],
        stateStatuses: { memory: 'running' },
        workloads: [],
        events: [],
        artifacts: [],
        effects: [],
        signals: [],
        gates: [],
        tick: 1,
        memoryCandidates: [{
                id: 'candidate-1',
                runId: 'run-1',
                stateId: 'memory',
                source: 'effect',
                kind: 'summary',
                content: 'Persist this Flow decision.',
                reason: 'Test candidate.',
                confidence: 0.9,
                status: 'candidate',
                createdAt: '2026-05-20T10:00:00.000Z'
            }]
    };
}
function effectRunFixture() {
    return {
        id: 'run-1',
        workflowId: 'workflow-1',
        prompt: 'apply this',
        status: 'running',
        createdAt: '2026-05-20T10:00:00.000Z',
        updatedAt: '2026-05-20T10:00:00.000Z',
        currentStateIds: ['frontend'],
        stateStatuses: { frontend: 'running' },
        workloads: [{
                id: 'workload-1',
                runId: 'run-1',
                stateId: 'frontend',
                status: 'done',
                inputArtifacts: [],
                outputArtifacts: [],
                issues: [],
                effectIds: ['effect-1'],
                createdAt: '2026-05-20T10:00:00.000Z',
                updatedAt: '2026-05-20T10:00:00.000Z',
                outputEnvelope: {
                    status: 'completed',
                    result: { status: 'completed', summary: 'done', artifacts: [], signals: {}, issues: [] },
                    artifacts: [],
                    effects: [{
                            type: 'file.edited',
                            path: 'src/app.ts',
                            summary: 'Edit app file',
                            status: 'proposed',
                            approvalPolicy: 'human_gate_required',
                            hashBefore: 'sha256:old',
                            content: 'new'
                        }],
                    signals: {},
                    issues: [],
                    report: 'done'
                }
            }],
        events: [],
        artifacts: [],
        effects: [{
                id: 'effect-1',
                runId: 'run-1',
                stateId: 'frontend',
                kind: 'file',
                type: 'file.edited',
                path: 'src/app.ts',
                hashBefore: 'sha256:old',
                approvalPolicy: 'human_gate_required',
                status: 'proposed',
                summary: 'Edit app file'
            }],
        signals: [],
        gates: [],
        tick: 1
    };
}

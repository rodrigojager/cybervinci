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
var chai_1 = require("chai");
var crypto = require("crypto");
var fs = require("fs/promises");
var http = require("http");
var os = require("os");
var path = require("path");
var file_uri_1 = require("@theia/core/lib/common/file-uri");
var ai_providers_service_impl_1 = require("@cybervinci/ai-providers/lib/node/ai-providers-service-impl");
var common_1 = require("../common");
var flow_capabilities_1 = require("../common/flow-capabilities");
var flow_capability_resolution_1 = require("../common/flow-capability-resolution");
var flow_templates_1 = require("../common/flow-templates");
var flow_kernel_bridge_1 = require("./flow-kernel-bridge");
var agent_markdown_store_1 = require("./agent-markdown-store");
var flow_workload_executor_1 = require("./flow-workload-executor");
var StateMappedMockLlmExecutor = /** @class */ (function (_super) {
    __extends(StateMappedMockLlmExecutor, _super);
    function StateMappedMockLlmExecutor(responses) {
        var _this = _super.call(this, {
            readAgent: function (agentId) { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, ({
                            path: "agents/".concat(agentId, ".md"),
                            uri: "agents/".concat(agentId, ".md"),
                            relativePath: "agents/".concat(agentId, ".md"),
                            content: [
                                "# ".concat(agentId),
                                '',
                                '## Role',
                                'Execute the assigned workload.',
                                '',
                                '## Output Format',
                                'Return the Flow workload-output JSON envelope.'
                            ].join('\n'),
                            updatedAt: '2026-05-20T00:00:00.000Z'
                        })];
                });
            }); }
        }) || this;
        _this.calls = [];
        _this.responses = Object.fromEntries(Object.entries(responses).map(function (_a) {
            var key = _a[0], value = _a[1];
            return [key, __spreadArray([], value, true)];
        }));
        return _this;
    }
    StateMappedMockLlmExecutor.prototype.resolveLlmProvider = function () {
        return Promise.resolve({ command: 'mock-llm-provider' });
    };
    StateMappedMockLlmExecutor.prototype.invokeLlmProvider = function (context) {
        var stateId = context.workload.stateId;
        this.calls.push(stateId);
        var queue = this.responses[stateId];
        var response = queue === null || queue === void 0 ? void 0 : queue.shift();
        if (!response) {
            return Promise.reject(new Error("No mocked LLM response configured for ".concat(stateId, ".")));
        }
        return Promise.resolve(response);
    };
    return StateMappedMockLlmExecutor;
}(flow_workload_executor_1.ProviderBackedFlowWorkloadExecutor));
function summarizeRunForFailure(run) {
    var events = (run.events || []).slice(-8).map(function (event) { return "".concat(event.type).concat(event.stateId ? " state=".concat(event.stateId) : '').concat(event.message ? ": ".concat(event.message) : ''); });
    var workloads = (run.workloads || []).map(function (workload) { var _a; return "".concat(workload.stateId, "/").concat(workload.id, "=").concat(workload.status).concat(workload.summary ? " ".concat(workload.summary) : '').concat(((_a = workload.issues) === null || _a === void 0 ? void 0 : _a.length) ? " issues=".concat(workload.issues.join(' | ')) : ''); });
    return __spreadArray(__spreadArray(["status=".concat(run.status)], workloads, true), events, true).join('\n');
}
function createNoopLogger() {
    return {
        debug: function () { return undefined; },
        info: function () { return undefined; },
        warn: function () { return undefined; },
        error: function () { return undefined; },
        trace: function () { return undefined; }
    };
}
function configureHelloWorldSisyphusSmokeWorkflow(workflow) {
    var ultraworker = workflow.states.sisyphus_ultraworker;
    if (ultraworker === undefined) {
        return;
    }
    if (ultraworker.outputs === undefined) {
        ultraworker.outputs = [];
    }
    if (!ultraworker.outputs.includes('hello-world.txt')) {
        ultraworker.outputs = __spreadArray(__spreadArray([], ultraworker.outputs, true), ['hello-world.txt'], false);
    }
    if (ultraworker.deliverables === undefined) {
        ultraworker.deliverables = [];
    }
    if (!ultraworker.deliverables.some(function (deliverable) { return deliverable.path === 'hello-world.txt'; })) {
        ultraworker.deliverables = __spreadArray(__spreadArray([], ultraworker.deliverables, true), [
            { path: 'hello-world.txt', description: 'Deterministic hello-world artifact', required: true, kind: 'text' }
        ], false);
    }
}
describe('SimulatedFlowKernelBridge', function () {
    it('emits structured workload and gate events', function () { return __awaiter(void 0, void 0, void 0, function () {
        var bridge, workflow, started, afterIntake, waiting, gate, request, approved;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    bridge = new flow_kernel_bridge_1.SimulatedFlowKernelBridge(new StateMappedMockLlmExecutor({
                        review: [workloadOutput('completed', 'Review ready.', [{ path: 'report.md', content: 'Review ready.' }])]
                    }));
                    workflow = sampleWorkflow();
                    return [4 /*yield*/, bridge.startRun(workflow, 'review this', 'empty context')];
                case 1:
                    started = _a.sent();
                    return [4 /*yield*/, bridge.tickRun(workflow, started)];
                case 2:
                    afterIntake = _a.sent();
                    return [4 /*yield*/, bridge.tickRun(workflow, afterIntake)];
                case 3:
                    waiting = _a.sent();
                    gate = waiting.gates[0];
                    (0, chai_1.expect)(waiting.status).to.equal('waiting_gate');
                    (0, chai_1.expect)(waiting.events.map(function (event) { return event.type; })).to.contain('gate.created');
                    request = {
                        runId: waiting.id,
                        gateId: gate.id,
                        decision: 'approved'
                    };
                    return [4 /*yield*/, bridge.approveGate(workflow, waiting, request)];
                case 4:
                    approved = _a.sent();
                    (0, chai_1.expect)(approved.status).to.equal('running');
                    (0, chai_1.expect)(approved.events.map(function (event) { return event.type; })).to.contain('gate.approved');
                    return [2 /*return*/];
            }
        });
    }); });
    it('runs contracted parallel delivery through contract gate, parallel branches, QA repair, passing QA, and final report with mocked LLM', function () { return __awaiter(void 0, void 0, void 0, function () {
        var workspaceRootDir, workspaceRootUri, workflow, capabilityResolution, executor, bridge, run, i, gate;
        var _a, _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0: return [4 /*yield*/, fs.mkdtemp(path.join(os.tmpdir(), 'flow-llm-integration-'))];
                case 1:
                    workspaceRootDir = _e.sent();
                    workspaceRootUri = file_uri_1.FileUri.create(workspaceRootDir).toString();
                    _e.label = 2;
                case 2:
                    _e.trys.push([2, , 9, 11]);
                    workflow = (0, flow_templates_1.instantiateFlowWorkflowTemplate)('contracted_parallel_delivery', {
                        id: 'mocked_contracted_parallel_delivery',
                        name: 'Mocked Contracted Parallel Delivery'
                    });
                    workflow.states.delivery_join = __assign(__assign({}, workflow.states.delivery_join), { type: 'report', outputs: ['delivery/join-summary.md'] });
                    capabilityResolution = (0, flow_capability_resolution_1.resolveFlowWorkflowCapabilities)(workflow, __assign(__assign({}, flow_capabilities_1.FLOW_CAPABILITIES), { llmAgentExecution: 'available', llmAgentProvider: 'configured', filesystemEdit: 'available', filesystemEditPolicy: 'configured', imageGeneration: 'available', imageProvider: 'configured', memoryProvider: 'local', deterministicFallback: false }));
                    (0, chai_1.expect)(capabilityResolution.missing).to.deep.equal([]);
                    (0, chai_1.expect)(capabilityResolution.provided).to.include.members([
                        'llm.agent.execute',
                        'memory.context',
                        'human.approval',
                        'filesystem.edit',
                        'image.generate',
                        'filesystem.artifacts'
                    ]);
                    executor = new StateMappedMockLlmExecutor({
                        architecture: [workloadOutput('completed', 'Architecture ready.', [{ path: 'architecture/plan.md', content: '# Plan\n\nUse contract-first delivery.' }])],
                        contract_design: [workloadOutput('completed', 'Contract ready.', [
                                { path: 'contracts/shared.md', content: '# Shared Contract\n\nUse the approved API, asset, and work orders.' },
                                { path: 'contracts/contracts.json', content: JSON.stringify(validContractPackage()) },
                                { path: 'contracts/work-orders/backend.md', content: 'Implement the contracted backend API.' },
                                { path: 'contracts/work-orders/frontend.md', content: 'Implement the contracted frontend integration.' },
                                { path: 'contracts/work-orders/designer.md', content: 'Generate the contracted design asset.' },
                                { path: 'contracts/work-orders/qa.md', content: 'Validate all deliveries against the contract.' },
                                { path: 'schemas/api.json', content: '{"type":"object"}' },
                                { path: 'schemas/assets.json', content: '{"type":"object"}' }
                            ], { 'contract.status': 'ready' })],
                        backend_work: [workloadOutput('completed', 'Backend delivered.', [
                                { path: 'delivery/backend.md', content: 'Backend exposes GET /feature for FeatureRequest.' },
                                { path: 'issues/backend.json', content: '[]' }
                            ])],
                        frontend_work: [workloadOutput('completed', 'Frontend delivered.', [
                                { path: 'delivery/frontend.md', content: 'Frontend calls GET /feature with FeatureRequest fields.' },
                                { path: 'issues/frontend.json', content: '[]' }
                            ])],
                        designer_work: [workloadOutput('completed', 'Design delivered.', [
                                { path: 'delivery/design-assets.md', content: 'Designer delivered public/assets/login-hero.png.' },
                                { path: 'public/assets/login-hero.png', content: 'mock image bytes' },
                                { path: 'issues/designer.json', content: '[]' }
                            ])],
                        qa: [
                            workloadOutput('failed', 'QA failed before repair.', [{ path: 'qa/report.md', content: '# QA\n\nStatus: failed\nMissing repaired integration note.' }], { 'qa.status': 'failed' }),
                            workloadOutput('completed', 'QA passed after repair.', [{ path: 'qa/report.md', content: '# QA\n\nStatus: passed\nAll contract checks pass.\n\nFollow-up: billing migration remains outside scope.' }], { 'qa.status': 'passed' }, [{
                                    severity: 'non_blocking',
                                    type: 'out_of_scope_followup',
                                    summary: 'Billing migration remains outside the approved contract scope.',
                                    suggestedFollowup: 'Create a second run for the billing migration after this CPD run completes.'
                                }])
                        ],
                        repair_loop: [workloadOutput('completed', 'Repair applied.', [{ path: 'delivery/repair-notes.md', content: '# Repair\n\nAdded integration evidence for QA.' }])]
                    });
                    bridge = new flow_kernel_bridge_1.SimulatedFlowKernelBridge(executor);
                    return [4 /*yield*/, bridge.startRun(workflow, 'deliver feature with contract and QA repair', 'mock context', workspaceRootUri)];
                case 3:
                    run = _e.sent();
                    i = 0;
                    _e.label = 4;
                case 4:
                    if (!(i < 20 && run.status !== 'completed')) return [3 /*break*/, 8];
                    return [4 /*yield*/, bridge.tickRun(workflow, run, workspaceRootUri)];
                case 5:
                    run = _e.sent();
                    if (!(run.status === 'waiting_gate')) return [3 /*break*/, 7];
                    gate = run.gates.find(function (candidate) { return candidate.status === 'pending'; });
                    (0, chai_1.expect)(gate === null || gate === void 0 ? void 0 : gate.id).to.equal('contract_approval');
                    return [4 /*yield*/, bridge.approveGate(workflow, run, {
                            runId: run.id,
                            gateId: gate.id,
                            decision: 'approved',
                            note: 'Contract approved by integration test.'
                        })];
                case 6:
                    run = _e.sent();
                    _e.label = 7;
                case 7:
                    i += 1;
                    return [3 /*break*/, 4];
                case 8:
                    (0, chai_1.expect)(run.status, summarizeRunForFailure(run)).to.equal('completed');
                    (0, chai_1.expect)((_a = run.gates.find(function (gate) { return gate.id === 'contract_approval'; })) === null || _a === void 0 ? void 0 : _a.status).to.equal('approved');
                    (0, chai_1.expect)(executor.calls).to.include.members(['architecture', 'contract_design', 'backend_work', 'frontend_work', 'designer_work', 'qa', 'repair_loop']);
                    (0, chai_1.expect)(executor.calls.filter(function (call) { return call === 'qa'; })).to.have.length(2);
                    (0, chai_1.expect)(run.stateStatuses.parallel_delivery).to.equal('done');
                    (0, chai_1.expect)(run.stateStatuses.backend_work).to.equal('done');
                    (0, chai_1.expect)(run.stateStatuses.frontend_work).to.equal('done');
                    (0, chai_1.expect)(run.stateStatuses.designer_work).to.equal('done');
                    (0, chai_1.expect)(run.stateStatuses.delivery_join).to.equal('done');
                    (0, chai_1.expect)(run.stateStatuses.repair_loop).to.equal('done');
                    (0, chai_1.expect)(run.stateStatuses.final_report).to.equal('done');
                    (0, chai_1.expect)((_b = run.secondRunSuggestion) === null || _b === void 0 ? void 0 : _b.status).to.equal('suggested');
                    (0, chai_1.expect)((_c = run.secondRunSuggestion) === null || _c === void 0 ? void 0 : _c.reason).to.contain('fora de escopo');
                    (0, chai_1.expect)((_d = run.secondRunSuggestion) === null || _d === void 0 ? void 0 : _d.issues.map(function (issue) { return issue.summary; })).to.include('Billing migration remains outside the approved contract scope.');
                    (0, chai_1.expect)(run.signals.some(function (signal) { return signal.key === 'qa.status' && signal.value === 'failed'; })).to.equal(true);
                    (0, chai_1.expect)(run.signals.some(function (signal) { return signal.key === 'qa.status' && signal.value === 'passed'; })).to.equal(true);
                    (0, chai_1.expect)(run.events.map(function (event) { return event.type; })).to.include.members(['gate.created', 'gate.approved', 'state.completed', 'run.completed']);
                    (0, chai_1.expect)(run.events.map(function (event) { return event.transitionId; })).to.include.members([
                        'contract_gate_to_parallel_delivery',
                        'parallel_delivery_to_delivery_join',
                        'qa_failed_to_repair_loop',
                        'repair_loop_to_qa',
                        'qa_passed_to_final_report'
                    ]);
                    (0, chai_1.expect)(run.artifacts.some(function (artifact) { var _a; return artifact.kind === 'contract' && ((_a = artifact.summary) === null || _a === void 0 ? void 0 : _a.includes('contracts/contracts.json')); })).to.equal(true);
                    (0, chai_1.expect)(run.artifacts.some(function (artifact) { return artifact.kind === 'report' && artifact.stateId === 'final_report'; })).to.equal(true);
                    (0, chai_1.expect)(run.workloads.some(function (workload) { return workload.stateId === 'qa' && workload.issues.includes('Billing migration remains outside the approved contract scope.'); })).to.equal(true);
                    return [3 /*break*/, 11];
                case 9: return [4 /*yield*/, fs.rm(workspaceRootDir, { recursive: true, force: true })];
                case 10:
                    _e.sent();
                    return [7 /*endfinally*/];
                case 11: return [2 /*return*/];
            }
        });
    }); });
    it('maps external kernel snapshots into Flow runs', function () {
        var workflow = sampleWorkflow();
        var run = (0, flow_kernel_bridge_1.mapKernelRunToFlowRun)(workflow, 'review this', {
            id: 'run_external',
            workflowId: workflow.id,
            workflow: workflow,
            status: 'completed',
            createdAt: '2026-05-19T08:00:00.000Z',
            updatedAt: '2026-05-19T08:01:00.000Z',
            activeStates: {},
            completedStates: { intake: true, review: true, report: true },
            workloads: {
                wl_0001: {
                    id: 'wl_0001',
                    runId: 'run_external',
                    stateId: 'review',
                    agent: 'reviewer',
                    status: 'completed',
                    input: { include: ['request.md'] },
                    outputs: ['review.md'],
                    createdAt: '2026-05-19T08:00:10.000Z',
                    completedAt: '2026-05-19T08:00:20.000Z'
                }
            },
            artifacts: {
                'review.md': {
                    id: 'review.md',
                    path: 'review.md',
                    stateId: 'review',
                    workloadId: 'wl_0001',
                    createdAt: '2026-05-19T08:00:20.000Z'
                }
            },
            effects: [],
            signals: { 'review.status': 'completed' }
        }, [
            {
                seq: 1,
                time: '2026-05-19T08:00:00.000Z',
                type: 'run.started',
                runId: 'run_external',
                message: 'run started'
            },
            {
                seq: 2,
                time: '2026-05-19T08:00:20.000Z',
                type: 'transition.fired',
                runId: 'run_external',
                stateId: 'review',
                message: 'transition fired'
            }
        ], {
            kernelRunId: 'run_external',
            storeDir: 'C:/tmp/kernel-store',
            workflowFile: 'C:/tmp/workflow.json'
        });
        (0, chai_1.expect)(run.status).to.equal('completed');
        (0, chai_1.expect)(run.workloads[0].status).to.equal('done');
        (0, chai_1.expect)(run.artifacts[0].uri).to.equal('review.md');
        (0, chai_1.expect)(run.signals[0].key).to.equal('review.status');
        (0, chai_1.expect)(run.events.map(function (event) { return event.type; })).to.contain('transition.fired');
        (0, chai_1.expect)(run.externalKernelMetadata).to.deep.equal({
            kernelRunId: 'run_external',
            storeDir: 'C:/tmp/kernel-store',
            workflowFile: 'C:/tmp/workflow.json'
        });
    });
});
describe('FlowKernelBridge external transport', function () {
    it('executa startRun contra daemon HTTP mockado', function () { return __awaiter(void 0, void 0, void 0, function () {
        var workflow, server, endpoint, previousEndpoint, previousMode, external_1, run;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    workflow = sampleWorkflow();
                    server = new MockKernelHttpServer({
                        validate_workflow: function (request) {
                            (0, chai_1.expect)(request.workflow.transitions[0].guard).to.deep.equal(workflow.transitions[0].guard);
                            return { type: 'validate_workflow.ok', valid: true, workflowId: workflow.id };
                        },
                        start_run: function () { return ({
                            type: 'start_run.ok',
                            run: {
                                id: 'kernel-run-live',
                                workflowId: workflow.id,
                                workflow: workflow,
                                status: 'running',
                                createdAt: '2026-05-19T10:00:00.000Z',
                                updatedAt: '2026-05-19T10:00:00.000Z'
                            }
                        }); },
                        list_events: function () { return ({
                            type: 'list_events.ok',
                            events: [
                                {
                                    seq: 1,
                                    time: '2026-05-19T10:00:00.100Z',
                                    type: 'run.started',
                                    runId: 'kernel-run-live',
                                    message: 'run started'
                                },
                                {
                                    seq: 2,
                                    time: '2026-05-19T10:00:01.000Z',
                                    type: 'state.entered',
                                    runId: 'kernel-run-live',
                                    stateId: 'intake',
                                    message: 'entered intake'
                                },
                                {
                                    seq: 3,
                                    time: '2026-05-19T10:00:02.000Z',
                                    type: 'transition.fired',
                                    runId: 'kernel-run-live',
                                    stateId: 'intake',
                                    message: 'to review'
                                }
                            ]
                        }); }
                    });
                    return [4 /*yield*/, server.start()];
                case 1:
                    endpoint = _a.sent();
                    previousEndpoint = process.env.FLOW_KERNEL_HTTP;
                    previousMode = process.env.FLOW_KERNEL_MODE;
                    process.env.FLOW_KERNEL_HTTP = endpoint;
                    process.env.FLOW_KERNEL_MODE = 'external';
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, , 4, 6]);
                    external_1 = new flow_kernel_bridge_1.ExternalFlowKernelBridge();
                    return [4 /*yield*/, external_1.startRun(workflow, 'review this', 'project summary')];
                case 3:
                    run = _a.sent();
                    (0, chai_1.expect)(run.status).to.equal('running');
                    (0, chai_1.expect)(run.externalKernelMetadata).to.deep.include({ kernelRunId: 'kernel-run-live' });
                    (0, chai_1.expect)(run.events.map(function (event) { return event.type; })).to.include('state.entered');
                    (0, chai_1.expect)(server.requestTypes()).to.deep.equal(['validate_workflow', 'start_run', 'list_events']);
                    (0, chai_1.expect)(run.events.map(function (event) { return event.id; })).to.include('3');
                    return [3 /*break*/, 6];
                case 4:
                    setEnv('FLOW_KERNEL_HTTP', previousEndpoint);
                    setEnv('FLOW_KERNEL_MODE', previousMode);
                    return [4 /*yield*/, server.stop()];
                case 5:
                    _a.sent();
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); });
    it('auto-detecta e executa o Flow Kernel Go local via stdio', function () {
        return __awaiter(this, void 0, void 0, function () {
            var workflow, repositoryRoot, kernelMain, previousCwd, previousEndpoint, previousCli, previousMode, bridge, run;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        this.timeout(20000);
                        workflow = {
                            version: 'flow.workflow/v1',
                            id: 'local_kernel_smoke',
                            name: 'Local Kernel Smoke',
                            states: {
                                intake: { type: 'input' },
                                report: { type: 'report', outputs: ['final.md'] }
                            },
                            transitions: [
                                { from: 'intake', to: 'report', on: 'run.started' }
                            ]
                        };
                        repositoryRoot = path.resolve(__dirname, '..', '..', '..', '..');
                        kernelMain = path.join(repositoryRoot, 'flow-kernel', 'cmd', 'flow-kernel', 'main.go');
                        previousCwd = process.cwd();
                        previousEndpoint = process.env.FLOW_KERNEL_HTTP;
                        previousCli = process.env.FLOW_KERNEL_CLI;
                        previousMode = process.env.FLOW_KERNEL_MODE;
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, , 4, 6]);
                        return [4 /*yield*/, fs.access(kernelMain)];
                    case 2:
                        _b.sent();
                        process.chdir(repositoryRoot);
                        setEnv('FLOW_KERNEL_HTTP', undefined);
                        setEnv('FLOW_KERNEL_CLI', undefined);
                        process.env.FLOW_KERNEL_MODE = 'external';
                        bridge = new flow_kernel_bridge_1.ExternalFlowKernelBridge();
                        return [4 /*yield*/, bridge.startRun(workflow, 'produce final report', 'project summary')];
                    case 3:
                        run = _b.sent();
                        (0, chai_1.expect)(run.status, summarizeRunForFailure(run)).to.equal('completed');
                        (0, chai_1.expect)((_a = run.externalKernelMetadata) === null || _a === void 0 ? void 0 : _a.kernelRunId).to.match(/^run_/);
                        (0, chai_1.expect)(run.artifacts.map(function (artifact) { return artifact.uri; })).to.include('final.md');
                        (0, chai_1.expect)(run.events.map(function (event) { return event.type; })).to.include.members(['run.started', 'run.completed']);
                        return [3 /*break*/, 6];
                    case 4: return [4 /*yield*/, (bridge === null || bridge === void 0 ? void 0 : bridge.shutdownKernelProcess())];
                    case 5:
                        _b.sent();
                        process.chdir(previousCwd);
                        setEnv('FLOW_KERNEL_HTTP', previousEndpoint);
                        setEnv('FLOW_KERNEL_CLI', previousCli);
                        setEnv('FLOW_KERNEL_MODE', previousMode);
                        return [7 /*endfinally*/];
                    case 6: return [2 /*return*/];
                }
            });
        });
    });
    it('auto-detecta o Flow Kernel Go local a partir do cwd aninhado do app', function () {
        return __awaiter(this, void 0, void 0, function () {
            var repositoryRoot, kernelMain, nestedAppCwd, previousCwd, previousEndpoint, previousCli, previousMode, bridge, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        this.timeout(20000);
                        repositoryRoot = path.resolve(__dirname, '..', '..', '..', '..');
                        kernelMain = path.join(repositoryRoot, 'flow-kernel', 'cmd', 'flow-kernel', 'main.go');
                        nestedAppCwd = path.join(repositoryRoot, 'examples', 'browser');
                        previousCwd = process.cwd();
                        previousEndpoint = process.env.FLOW_KERNEL_HTTP;
                        previousCli = process.env.FLOW_KERNEL_CLI;
                        previousMode = process.env.FLOW_KERNEL_MODE;
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, , 6, 8]);
                        return [4 /*yield*/, fs.access(kernelMain)];
                    case 2:
                        _b.sent();
                        return [4 /*yield*/, fs.access(nestedAppCwd)];
                    case 3:
                        _b.sent();
                        process.chdir(nestedAppCwd);
                        setEnv('FLOW_KERNEL_HTTP', undefined);
                        setEnv('FLOW_KERNEL_CLI', undefined);
                        process.env.FLOW_KERNEL_MODE = 'external';
                        bridge = new flow_kernel_bridge_1.ExternalFlowKernelBridge();
                        (0, chai_1.expect)(bridge.available()).to.equal(true);
                        return [4 /*yield*/, bridge.checkKernelHealth()];
                    case 4:
                        _b.sent();
                        _a = chai_1.expect;
                        return [4 /*yield*/, bridge.getBridgeMode()];
                    case 5:
                        _a.apply(void 0, [_b.sent()]).to.equal('external');
                        return [3 /*break*/, 8];
                    case 6: return [4 /*yield*/, (bridge === null || bridge === void 0 ? void 0 : bridge.shutdownKernelProcess())];
                    case 7:
                        _b.sent();
                        process.chdir(previousCwd);
                        setEnv('FLOW_KERNEL_HTTP', previousEndpoint);
                        setEnv('FLOW_KERNEL_CLI', previousCli);
                        setEnv('FLOW_KERNEL_MODE', previousMode);
                        return [7 /*endfinally*/];
                    case 8: return [2 /*return*/];
                }
            });
        });
    });
    it('auto-detecta e executa o Sisyphus ultraworker hello-world smoke via stdio', function () {
        return __awaiter(this, void 0, void 0, function () {
            var repositoryRoot, kernelMain, preset, workflow, workspaceRootDir, workspaceRootUri, previousCwd, previousEndpoint, previousCli, previousMode, bridge, executor, run, i, gate, artifactUris, helloWorldArtifact, helloWorldContent;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        this.timeout(30000);
                        repositoryRoot = path.resolve(__dirname, '..', '..', '..', '..');
                        kernelMain = path.join(repositoryRoot, 'flow-kernel', 'cmd', 'flow-kernel', 'main.go');
                        preset = (0, common_1.getBuiltInFlowPipelinePreset)(common_1.SISYPHUS_ULTRAWORK_COORDINATOR_PRESET_ID);
                        (0, chai_1.expect)(preset).to.not.equal(undefined);
                        workflow = (0, common_1.instantiateFlowPipelinePreset)(preset, {
                            id: 'sisyphus_hello_world_smoke',
                            name: 'Sisyphus Hello World Smoke'
                        });
                        configureHelloWorldSisyphusSmokeWorkflow(workflow);
                        return [4 /*yield*/, fs.mkdtemp(path.join(os.tmpdir(), 'sisyphus-hello-world-smoke-'))];
                    case 1:
                        workspaceRootDir = _b.sent();
                        workspaceRootUri = file_uri_1.FileUri.create(workspaceRootDir).toString();
                        previousCwd = process.cwd();
                        previousEndpoint = process.env.FLOW_KERNEL_HTTP;
                        previousCli = process.env.FLOW_KERNEL_CLI;
                        previousMode = process.env.FLOW_KERNEL_MODE;
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, , 11, 14]);
                        return [4 /*yield*/, fs.access(kernelMain)];
                    case 3:
                        _b.sent();
                        process.chdir(repositoryRoot);
                        setEnv('FLOW_KERNEL_HTTP', undefined);
                        setEnv('FLOW_KERNEL_CLI', undefined);
                        process.env.FLOW_KERNEL_MODE = 'external';
                        executor = new StateMappedMockLlmExecutor({
                            sisyphus_coordinator: [workloadOutput('completed', 'Sisyphus plan prepared.', [
                                    { path: 'plan/plan.md', content: '# Plan\n\n1. Approve the work order.\n2. Create hello-world.txt with `Hello, world!`.\n3. Review the result.' },
                                    { path: 'plan/acceptance-criteria.md', content: '# Acceptance Criteria\n\n- plan/plan.md exists.\n- plan/work-order.md instructs creation of hello-world.txt.\n- hello-world.txt contains `Hello, world!`.\n- The reviewer passes.' },
                                    { path: 'plan/work-order.md', content: '# Work Order\n\nCreate `hello-world.txt` containing `Hello, world!` and record the evidence in the work artifacts.' }
                                ])],
                            sisyphus_ultraworker: [workloadOutput('completed', 'Hello world implementation completed.', [
                                    { path: 'work/summary.md', content: '# Summary\n\nCreated the requested hello-world artifact.' },
                                    { path: 'work/changes.md', content: '# Changes\n\n- Added hello-world.txt\n' },
                                    { path: 'work/evidence.md', content: '# Evidence\n\n- hello-world.txt created with the expected content.\n' },
                                    { path: 'hello-world.txt', content: 'Hello, world!\n' }
                                ], {
                                    'work.status': 'completed'
                                })],
                            sisyphus_reviewer: [workloadOutput('completed', 'Review passed.', [
                                    { path: 'review/review.md', content: '# Review\n\nStatus: passed\n\nThe ultraworker produced the requested hello-world artifact.' },
                                    { path: 'review/status.json', content: '{"status":"passed"}' }
                                ], {
                                    'review.status': 'passed'
                                })]
                        });
                        bridge = new flow_kernel_bridge_1.ExternalFlowKernelBridge(executor);
                        return [4 /*yield*/, bridge.startRun(workflow, 'Create a deterministic hello-world artifact.', 'Mock project summary for the Sisyphus smoke.', workspaceRootUri)];
                    case 4:
                        run = _b.sent();
                        i = 0;
                        _b.label = 5;
                    case 5:
                        if (!(i < 20 && run.status !== 'completed')) return [3 /*break*/, 9];
                        return [4 /*yield*/, bridge.tickRun(workflow, run, workspaceRootUri)];
                    case 6:
                        run = _b.sent();
                        if (!(run.status === 'waiting_gate')) return [3 /*break*/, 8];
                        gate = run.gates.find(function (candidate) { return candidate.id === 'sisyphus_plan_approval'; });
                        (0, chai_1.expect)(gate === null || gate === void 0 ? void 0 : gate.status).to.equal('pending');
                        return [4 /*yield*/, bridge.approveGate(workflow, run, {
                                runId: run.id,
                                gateId: gate.id,
                                decision: 'approved',
                                note: 'Approved deterministically in smoke test.'
                            })];
                    case 7:
                        run = _b.sent();
                        _b.label = 8;
                    case 8:
                        i += 1;
                        return [3 /*break*/, 5];
                    case 9:
                        (0, chai_1.expect)(run.status, summarizeRunForFailure(run)).to.equal('completed');
                        (0, chai_1.expect)(executor.calls).to.include.members(['sisyphus_coordinator', 'sisyphus_ultraworker', 'sisyphus_reviewer']);
                        (0, chai_1.expect)((_a = run.gates.find(function (gate) { return gate.id === 'sisyphus_plan_approval'; })) === null || _a === void 0 ? void 0 : _a.status).to.equal('approved');
                        artifactUris = run.artifacts.map(function (artifact) { return artifact.uri; });
                        (0, chai_1.expect)(artifactUris.some(function (uri) { return uri.includes('plan/plan.md'); })).to.equal(true);
                        (0, chai_1.expect)(artifactUris.some(function (uri) { return uri.includes('work/summary.md'); })).to.equal(true);
                        (0, chai_1.expect)(artifactUris.some(function (uri) { return uri.includes('work/evidence.md'); })).to.equal(true);
                        (0, chai_1.expect)(artifactUris.some(function (uri) { return uri.includes('review/review.md'); })).to.equal(true);
                        (0, chai_1.expect)(artifactUris.some(function (uri) { return uri.includes('final/report.md'); })).to.equal(true);
                        (0, chai_1.expect)(artifactUris.some(function (uri) { return uri.includes('hello-world.txt'); })).to.equal(true);
                        helloWorldArtifact = run.artifacts.find(function (artifact) { return artifact.uri.includes('hello-world.txt'); });
                        (0, chai_1.expect)(helloWorldArtifact).to.not.equal(undefined);
                        return [4 /*yield*/, fs.readFile(file_uri_1.FileUri.fsPath(helloWorldArtifact.uri), 'utf8')];
                    case 10:
                        helloWorldContent = _b.sent();
                        (0, chai_1.expect)(helloWorldContent.trim()).to.equal('Hello, world!');
                        (0, chai_1.expect)(run.events.map(function (event) { return event.type; })).to.include.members(['gate.created', 'gate.approved', 'run.completed']);
                        return [3 /*break*/, 14];
                    case 11: return [4 /*yield*/, (bridge === null || bridge === void 0 ? void 0 : bridge.shutdownKernelProcess())];
                    case 12:
                        _b.sent();
                        process.chdir(previousCwd);
                        setEnv('FLOW_KERNEL_HTTP', previousEndpoint);
                        setEnv('FLOW_KERNEL_CLI', previousCli);
                        setEnv('FLOW_KERNEL_MODE', previousMode);
                        return [4 /*yield*/, fs.rm(workspaceRootDir, { recursive: true, force: true })];
                    case 13:
                        _b.sent();
                        return [7 /*endfinally*/];
                    case 14: return [2 /*return*/];
                }
            });
        });
    });
    it('manual opt-in @real-codex-smoke for the Sisyphus hello-world pipeline', function () {
        return __awaiter(this, void 0, void 0, function () {
            var repositoryRoot, kernelMain, preset, workflow, workspaceRootDir, workspaceRootUri, previousCwd, previousKernelHttp, previousKernelCli, previousKernelMode, previousProvider, previousModelId, previousLegacyModelId, previousCommand, previousLegacyCommand, bridge, codexProviderService, removeWorkspaceRootDir, agentMarkdownStore, _i, _a, agent, status_1, executor, run, i, gate, artifactUris, helloWorldArtifact, helloWorldContent;
            var _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (process.env.FLOW_REAL_CODEX_SMOKE !== '1') {
                            this.skip();
                        }
                        this.timeout(300000);
                        repositoryRoot = path.resolve(__dirname, '..', '..', '..', '..');
                        kernelMain = path.join(repositoryRoot, 'flow-kernel', 'cmd', 'flow-kernel', 'main.go');
                        preset = (0, common_1.getBuiltInFlowPipelinePreset)(common_1.SISYPHUS_ULTRAWORK_COORDINATOR_PRESET_ID);
                        (0, chai_1.expect)(preset).to.not.equal(undefined);
                        workflow = (0, common_1.instantiateFlowPipelinePreset)(preset, {
                            id: 'sisyphus_real_codex_hello_world_smoke',
                            name: 'Sisyphus Real Codex Hello World Smoke'
                        });
                        configureHelloWorldSisyphusSmokeWorkflow(workflow);
                        return [4 /*yield*/, fs.mkdtemp(path.join(os.tmpdir(), 'sisyphus-real-codex-smoke-'))];
                    case 1:
                        workspaceRootDir = _c.sent();
                        workspaceRootUri = file_uri_1.FileUri.create(workspaceRootDir).toString();
                        previousCwd = process.cwd();
                        previousKernelHttp = process.env.FLOW_KERNEL_HTTP;
                        previousKernelCli = process.env.FLOW_KERNEL_CLI;
                        previousKernelMode = process.env.FLOW_KERNEL_MODE;
                        previousProvider = process.env.FLOW_AGENT_PROVIDER;
                        previousModelId = process.env.FLOW_AGENT_MODEL_ID;
                        previousLegacyModelId = process.env.FLOW_AGENT_LLM_MODEL_ID;
                        previousCommand = process.env.FLOW_AGENT_COMMAND;
                        previousLegacyCommand = process.env.FLOW_AGENT_LLM_COMMAND;
                        removeWorkspaceRootDir = true;
                        _c.label = 2;
                    case 2:
                        _c.trys.push([2, , 16, 20]);
                        return [4 /*yield*/, fs.access(kernelMain)];
                    case 3:
                        _c.sent();
                        process.chdir(repositoryRoot);
                        setEnv('FLOW_KERNEL_HTTP', undefined);
                        setEnv('FLOW_KERNEL_CLI', undefined);
                        process.env.FLOW_KERNEL_MODE = 'external';
                        process.env.FLOW_AGENT_PROVIDER = 'ai-providers';
                        setEnv('FLOW_AGENT_MODEL_ID', undefined);
                        setEnv('FLOW_AGENT_LLM_MODEL_ID', undefined);
                        setEnv('FLOW_AGENT_COMMAND', undefined);
                        setEnv('FLOW_AGENT_LLM_COMMAND', undefined);
                        agentMarkdownStore = new agent_markdown_store_1.AgentMarkdownStore();
                        _i = 0, _a = preset.agentMarkdown || [];
                        _c.label = 4;
                    case 4:
                        if (!(_i < _a.length)) return [3 /*break*/, 7];
                        agent = _a[_i];
                        return [4 /*yield*/, agentMarkdownStore.writeAgent(workspaceRootUri, agent.relativePath, agent.content)];
                    case 5:
                        _c.sent();
                        _c.label = 6;
                    case 6:
                        _i++;
                        return [3 /*break*/, 4];
                    case 7:
                        codexProviderService = new ai_providers_service_impl_1.CodexProviderServiceImpl();
                        codexProviderService.logger = createNoopLogger();
                        return [4 /*yield*/, codexProviderService.getStatus({ cwd: workspaceRootDir })];
                    case 8:
                        status_1 = _c.sent();
                        (0, chai_1.expect)(status_1.available, status_1.message || 'Codex provider must be available for the manual smoke test.').to.equal(true);
                        executor = new flow_workload_executor_1.ProviderBackedFlowWorkloadExecutor(agentMarkdownStore, undefined, undefined, undefined, undefined, undefined, codexProviderService);
                        bridge = new flow_kernel_bridge_1.ExternalFlowKernelBridge(executor);
                        return [4 /*yield*/, bridge.startRun(workflow, 'Create a deterministic hello-world artifact through the real Codex provider.', 'Mock project summary for the real Codex smoke.', workspaceRootUri)];
                    case 9:
                        run = _c.sent();
                        i = 0;
                        _c.label = 10;
                    case 10:
                        if (!(i < 30 && run.status !== 'completed')) return [3 /*break*/, 14];
                        return [4 /*yield*/, bridge.tickRun(workflow, run, workspaceRootUri)];
                    case 11:
                        run = _c.sent();
                        if (!(run.status === 'waiting_gate')) return [3 /*break*/, 13];
                        gate = run.gates.find(function (candidate) { return candidate.id === 'sisyphus_plan_approval'; });
                        (0, chai_1.expect)(gate === null || gate === void 0 ? void 0 : gate.status).to.equal('pending');
                        return [4 /*yield*/, bridge.approveGate(workflow, run, {
                                runId: run.id,
                                gateId: gate.id,
                                decision: 'approved',
                                note: 'Approved manually in the real-Codex smoke test.'
                            }, workspaceRootUri)];
                    case 12:
                        run = _c.sent();
                        _c.label = 13;
                    case 13:
                        i += 1;
                        return [3 /*break*/, 10];
                    case 14:
                        if (run.status !== 'completed') {
                            removeWorkspaceRootDir = false;
                            throw new Error('Real Codex Sisyphus smoke did not complete. Workspace preserved at ' + workspaceRootDir + '.\n' + summarizeRunForFailure(run));
                        }
                        (0, chai_1.expect)(run.status).to.equal('completed');
                        (0, chai_1.expect)((_b = run.gates.find(function (gate) { return gate.id === 'sisyphus_plan_approval'; })) === null || _b === void 0 ? void 0 : _b.status).to.equal('approved');
                        artifactUris = run.artifacts.map(function (artifact) { return artifact.uri; });
                        (0, chai_1.expect)(artifactUris.some(function (uri) { return uri.includes('plan/plan.md'); })).to.equal(true);
                        (0, chai_1.expect)(artifactUris.some(function (uri) { return uri.includes('work/summary.md'); })).to.equal(true);
                        (0, chai_1.expect)(artifactUris.some(function (uri) { return uri.includes('work/evidence.md'); })).to.equal(true);
                        (0, chai_1.expect)(artifactUris.some(function (uri) { return uri.includes('review/review.md'); })).to.equal(true);
                        (0, chai_1.expect)(artifactUris.some(function (uri) { return uri.includes('final/report.md'); })).to.equal(true);
                        (0, chai_1.expect)(artifactUris.some(function (uri) { return uri.includes('hello-world.txt'); })).to.equal(true);
                        helloWorldArtifact = run.artifacts.find(function (artifact) { return artifact.uri.includes('hello-world.txt'); });
                        (0, chai_1.expect)(helloWorldArtifact).to.not.equal(undefined);
                        return [4 /*yield*/, fs.readFile(file_uri_1.FileUri.fsPath(helloWorldArtifact.uri), 'utf8')];
                    case 15:
                        helloWorldContent = _c.sent();
                        (0, chai_1.expect)(helloWorldContent).to.contain('Hello, world');
                        (0, chai_1.expect)(run.events.map(function (event) { return event.type; })).to.include.members(['gate.created', 'gate.approved', 'run.completed']);
                        return [3 /*break*/, 20];
                    case 16:
                        codexProviderService === null || codexProviderService === void 0 ? void 0 : codexProviderService.dispose();
                        return [4 /*yield*/, (bridge === null || bridge === void 0 ? void 0 : bridge.shutdownKernelProcess())];
                    case 17:
                        _c.sent();
                        process.chdir(previousCwd);
                        setEnv('FLOW_KERNEL_HTTP', previousKernelHttp);
                        setEnv('FLOW_KERNEL_CLI', previousKernelCli);
                        setEnv('FLOW_KERNEL_MODE', previousKernelMode);
                        setEnv('FLOW_AGENT_PROVIDER', previousProvider);
                        setEnv('FLOW_AGENT_MODEL_ID', previousModelId);
                        setEnv('FLOW_AGENT_LLM_MODEL_ID', previousLegacyModelId);
                        setEnv('FLOW_AGENT_COMMAND', previousCommand);
                        setEnv('FLOW_AGENT_LLM_COMMAND', previousLegacyCommand);
                        if (!removeWorkspaceRootDir) return [3 /*break*/, 19];
                        return [4 /*yield*/, fs.rm(workspaceRootDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 250 })];
                    case 18:
                        _c.sent();
                        _c.label = 19;
                    case 19: return [7 /*endfinally*/];
                    case 20: return [2 /*return*/];
                }
            });
        });
    });
    it('executa startRun contra daemon WebSocket mockado quando o endpoint usa ws:', function () { return __awaiter(void 0, void 0, void 0, function () {
        var workflow, server, endpoint, previousEndpoint, previousMode, run;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    workflow = sampleWorkflow();
                    server = new MockKernelWebSocketServer({
                        validate_workflow: function (request) {
                            (0, chai_1.expect)(request.workflow.id).to.equal(workflow.id);
                            return { type: 'validate_workflow.ok', valid: true, workflowId: workflow.id };
                        },
                        start_run: function () { return ({
                            type: 'start_run.ok',
                            run: {
                                id: 'kernel-run-ws',
                                workflowId: workflow.id,
                                workflow: workflow,
                                status: 'running',
                                createdAt: '2026-05-20T11:00:00.000Z',
                                updatedAt: '2026-05-20T11:00:00.000Z'
                            }
                        }); },
                        list_events: function () { return ({
                            type: 'list_events.ok',
                            events: [{
                                    seq: 1,
                                    time: '2026-05-20T11:00:00.100Z',
                                    type: 'run.started',
                                    runId: 'kernel-run-ws',
                                    message: 'run started over websocket'
                                }]
                        }); }
                    });
                    return [4 /*yield*/, server.start()];
                case 1:
                    endpoint = _a.sent();
                    previousEndpoint = process.env.FLOW_KERNEL_HTTP;
                    previousMode = process.env.FLOW_KERNEL_MODE;
                    process.env.FLOW_KERNEL_HTTP = endpoint;
                    process.env.FLOW_KERNEL_MODE = 'external';
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, , 4, 6]);
                    return [4 /*yield*/, new flow_kernel_bridge_1.ExternalFlowKernelBridge().startRun(workflow, 'review this over ws', 'project summary')];
                case 3:
                    run = _a.sent();
                    (0, chai_1.expect)(run.status).to.equal('running');
                    (0, chai_1.expect)(run.externalKernelMetadata).to.deep.include({ kernelRunId: 'kernel-run-ws' });
                    (0, chai_1.expect)(run.events.map(function (event) { return event.type; })).to.include('run.started');
                    (0, chai_1.expect)(server.requestTypes()).to.deep.equal(['validate_workflow', 'start_run', 'list_events']);
                    return [3 /*break*/, 6];
                case 4:
                    setEnv('FLOW_KERNEL_HTTP', previousEndpoint);
                    setEnv('FLOW_KERNEL_MODE', previousMode);
                    return [4 /*yield*/, server.stop()];
                case 5:
                    _a.sent();
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); });
    it('reconecta stream WebSocket e preserva ordering/dedupe dos eventos', function () { return __awaiter(void 0, void 0, void 0, function () {
        var workflow, kernelRun, events, server, endpoint, previousEndpoint, previousMode, bridge, run, updates_1, dispose, latest;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    workflow = sampleWorkflow();
                    kernelRun = {
                        id: 'kernel-run-ws-reconnect',
                        workflowId: workflow.id,
                        workflow: workflow,
                        status: 'running',
                        createdAt: '2026-05-20T11:10:00.000Z',
                        updatedAt: '2026-05-20T11:10:00.000Z'
                    };
                    events = [{
                            seq: 1,
                            time: '2026-05-20T11:10:00.100Z',
                            type: 'run.started',
                            runId: kernelRun.id,
                            message: 'started'
                        }];
                    server = new MockKernelWebSocketServer({
                        validate_workflow: function () { return ({ type: 'validate_workflow.ok', valid: true, workflowId: workflow.id }); },
                        start_run: function () { return ({ type: 'start_run.ok', run: kernelRun }); },
                        get_run: function () { return ({ type: 'get_run.ok', run: kernelRun }); },
                        list_events: function () { return ({ type: 'list_events.ok', events: events }); }
                    });
                    return [4 /*yield*/, server.start()];
                case 1:
                    endpoint = _b.sent();
                    previousEndpoint = process.env.FLOW_KERNEL_HTTP;
                    previousMode = process.env.FLOW_KERNEL_MODE;
                    process.env.FLOW_KERNEL_HTTP = endpoint;
                    process.env.FLOW_KERNEL_MODE = 'external';
                    _b.label = 2;
                case 2:
                    _b.trys.push([2, , 8, 10]);
                    bridge = new flow_kernel_bridge_1.ExternalFlowKernelBridge();
                    return [4 /*yield*/, bridge.startRun(workflow, 'review this over ws reconnect', 'project summary')];
                case 3:
                    run = _b.sent();
                    updates_1 = [];
                    return [4 /*yield*/, ((_a = bridge.subscribeRunEvents) === null || _a === void 0 ? void 0 : _a.call(bridge, workflow, run, undefined, function (updated) {
                            updates_1.push(updated.events.map(function (event) { return "".concat(event.id, ":").concat(event.message); }));
                        }))];
                case 4:
                    dispose = _b.sent();
                    events.push({
                        seq: 3,
                        time: '2026-05-20T11:10:03.000Z',
                        type: 'artifact.created',
                        runId: kernelRun.id,
                        message: 'old duplicate'
                    }, {
                        seq: 2,
                        time: '2026-05-20T11:10:02.000Z',
                        type: 'workload.started',
                        runId: kernelRun.id,
                        message: 'workload started'
                    });
                    server.push({ type: 'events', events: [events[1], events[2]] });
                    return [4 /*yield*/, waitFor(function () { return updates_1.length >= 1; })];
                case 5:
                    _b.sent();
                    server.closeConnections();
                    return [4 /*yield*/, waitFor(function () { return server.upgradePaths().length >= 2; })];
                case 6:
                    _b.sent();
                    events.push({
                        seq: 3,
                        time: '2026-05-20T11:10:03.500Z',
                        type: 'artifact.created',
                        runId: kernelRun.id,
                        message: 'new duplicate'
                    });
                    server.push({ type: 'events', events: [events[3]] });
                    return [4 /*yield*/, waitFor(function () { return updates_1.some(function (update) { return update.includes('3:new duplicate'); }); })];
                case 7:
                    _b.sent();
                    latest = updates_1[updates_1.length - 1].filter(function (item) { return /^\d+:/.test(item); });
                    (0, chai_1.expect)(latest).to.deep.equal(['1:started', '2:workload started', '3:new duplicate']);
                    dispose === null || dispose === void 0 ? void 0 : dispose();
                    return [3 /*break*/, 10];
                case 8:
                    setEnv('FLOW_KERNEL_HTTP', previousEndpoint);
                    setEnv('FLOW_KERNEL_MODE', previousMode);
                    return [4 /*yield*/, server.stop()];
                case 9:
                    _b.sent();
                    return [7 /*endfinally*/];
                case 10: return [2 /*return*/];
            }
        });
    }); });
    it('normaliza ws sem path para /ws em vez de rejeitar o endpoint', function () { return __awaiter(void 0, void 0, void 0, function () {
        var workflow, server, endpoint, rootEndpoint, previousEndpoint, previousMode, run;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    workflow = sampleWorkflow();
                    server = new MockKernelWebSocketServer({
                        validate_workflow: function () { return ({ type: 'validate_workflow.ok', valid: true, workflowId: workflow.id }); },
                        start_run: function () { return ({
                            type: 'start_run.ok',
                            run: {
                                id: 'kernel-run-ws-default-path',
                                workflowId: workflow.id,
                                workflow: workflow,
                                status: 'running',
                                createdAt: '2026-05-20T11:30:00.000Z',
                                updatedAt: '2026-05-20T11:30:00.000Z'
                            }
                        }); },
                        list_events: function () { return ({ type: 'list_events.ok', events: [] }); }
                    });
                    return [4 /*yield*/, server.start()];
                case 1:
                    endpoint = _b.sent();
                    rootEndpoint = endpoint.replace(/\/ws$/, '');
                    previousEndpoint = process.env.FLOW_KERNEL_HTTP;
                    previousMode = process.env.FLOW_KERNEL_MODE;
                    process.env.FLOW_KERNEL_HTTP = rootEndpoint;
                    process.env.FLOW_KERNEL_MODE = 'external';
                    _b.label = 2;
                case 2:
                    _b.trys.push([2, , 4, 6]);
                    return [4 /*yield*/, new flow_kernel_bridge_1.ExternalFlowKernelBridge().startRun(workflow, 'review this over ws root', 'project summary')];
                case 3:
                    run = _b.sent();
                    (0, chai_1.expect)((_a = run.externalKernelMetadata) === null || _a === void 0 ? void 0 : _a.kernelRunId).to.equal('kernel-run-ws-default-path');
                    (0, chai_1.expect)(server.upgradePaths()).to.deep.equal(['/ws']);
                    return [3 /*break*/, 6];
                case 4:
                    setEnv('FLOW_KERNEL_HTTP', previousEndpoint);
                    setEnv('FLOW_KERNEL_MODE', previousMode);
                    return [4 /*yield*/, server.stop()];
                case 5:
                    _b.sent();
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); });
    it('registra request_artifact_open como disponibilidade sem autoabrir artifact', function () { return __awaiter(void 0, void 0, void 0, function () {
        var workflow, initialRun, server, endpoint, previousEndpoint, previousMode;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    workflow = sampleWorkflow();
                    initialRun = {
                        id: 'kernel-run-artifact-open',
                        workflowId: workflow.id,
                        workflow: workflow,
                        status: 'running',
                        createdAt: '2026-05-20T10:00:00.000Z',
                        updatedAt: '2026-05-20T10:00:00.000Z',
                        workloads: {},
                        artifacts: {
                            'artifact-1': {
                                id: 'artifact-1',
                                path: 'out/report.md',
                                stateId: 'report',
                                createdAt: '2026-05-20T10:00:00.000Z'
                            }
                        },
                        effects: [],
                        signals: {},
                        requests: [{
                                id: 'artifact-1',
                                type: 'request_artifact_open',
                                requestId: 'artifact-1',
                                runId: 'kernel-run-artifact-open',
                                artifactId: 'artifact-1',
                                path: 'out/report.md'
                            }]
                    };
                    server = new MockKernelHttpServer({
                        validate_workflow: function () { return ({ type: 'validate_workflow.ok', valid: true, workflowId: workflow.id }); },
                        start_run: function () { return ({ type: 'start_run.ok', run: initialRun, requests: initialRun.requests }); },
                        list_events: function () { return ({ type: 'list_events.ok', events: [] }); },
                        signal_recorded: function (request) {
                            (0, chai_1.expect)(request.key).to.equal('artifact.artifact-1.open.available');
                            (0, chai_1.expect)(request.value).to.deep.equal({
                                artifactId: 'artifact-1',
                                target: 'out/report.md',
                                available: true,
                                autoOpen: false,
                                requiresUserAction: true,
                                disposition: 'available_for_user_requested_open'
                            });
                            return { type: 'signal_recorded.ok', run: __assign(__assign({}, initialRun), { requests: [] }) };
                        }
                    });
                    return [4 /*yield*/, server.start()];
                case 1:
                    endpoint = _a.sent();
                    previousEndpoint = process.env.FLOW_KERNEL_HTTP;
                    previousMode = process.env.FLOW_KERNEL_MODE;
                    process.env.FLOW_KERNEL_HTTP = endpoint;
                    process.env.FLOW_KERNEL_MODE = 'external';
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, , 4, 6]);
                    return [4 /*yield*/, new flow_kernel_bridge_1.ExternalFlowKernelBridge().startRun(workflow, 'open report when requested', 'summary')];
                case 3:
                    _a.sent();
                    (0, chai_1.expect)(server.requestTypes()).to.deep.equal([
                        'validate_workflow',
                        'start_run',
                        'signal_recorded',
                        'list_events'
                    ]);
                    return [3 /*break*/, 6];
                case 4:
                    setEnv('FLOW_KERNEL_HTTP', previousEndpoint);
                    setEnv('FLOW_KERNEL_MODE', previousMode);
                    return [4 /*yield*/, server.stop()];
                case 5:
                    _a.sent();
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); });
    it('encaminha request_human_gate pela UI como callback gate_approved sem decidir transicao no frontend', function () { return __awaiter(void 0, void 0, void 0, function () {
        var workflow, waitingRun, approvedRun, events, server, endpoint, previousEndpoint, previousMode, bridge, waiting, approved;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    workflow = sampleWorkflow();
                    waitingRun = {
                        id: 'kernel-run-gate',
                        workflowId: workflow.id,
                        workflow: workflow,
                        status: 'waiting',
                        createdAt: '2026-05-20T10:00:00.000Z',
                        updatedAt: '2026-05-20T10:00:00.000Z',
                        activeStates: { review: true },
                        completedStates: { intake: true },
                        workloads: {},
                        artifacts: {},
                        effects: [],
                        signals: {},
                        requests: [{
                                id: 'gate-review',
                                type: 'request_human_gate',
                                requestId: 'gate-review',
                                runId: 'kernel-run-gate',
                                stateId: 'review',
                                gateId: 'gate-review'
                            }]
                    };
                    approvedRun = __assign(__assign({}, waitingRun), { status: 'running', updatedAt: '2026-05-20T10:01:00.000Z', activeStates: { execution: true }, completedStates: { intake: true, review: true }, requests: [] });
                    events = [{
                            seq: 1,
                            time: '2026-05-20T10:00:00.000Z',
                            type: 'gate.waiting',
                            runId: 'kernel-run-gate',
                            stateId: 'review',
                            gateId: 'gate-review',
                            message: 'Approve review'
                        }];
                    server = new MockKernelHttpServer({
                        validate_workflow: function () { return ({ type: 'validate_workflow.ok', valid: true, workflowId: workflow.id }); },
                        start_run: function () { return ({ type: 'start_run.ok', run: waitingRun, requests: waitingRun.requests }); },
                        list_events: function () { return ({ type: 'list_events.ok', events: events }); },
                        gate_approved: function (request) {
                            (0, chai_1.expect)(request.gateId).to.equal('gate-review');
                            (0, chai_1.expect)(request.note).to.equal('approved in UI');
                            events = __spreadArray(__spreadArray([], events, true), [
                                {
                                    seq: 2,
                                    time: '2026-05-20T10:01:00.000Z',
                                    type: 'gate.approved',
                                    runId: 'kernel-run-gate',
                                    stateId: 'review',
                                    gateId: 'gate-review',
                                    message: 'gate approved'
                                },
                                {
                                    seq: 3,
                                    time: '2026-05-20T10:01:00.100Z',
                                    type: 'transition.fired',
                                    runId: 'kernel-run-gate',
                                    stateId: 'review',
                                    transitionId: 'review_to_execution',
                                    message: 'kernel fired transition'
                                }
                            ], false);
                            return { type: 'gate_approved.ok', run: approvedRun, requests: [] };
                        }
                    });
                    return [4 /*yield*/, server.start()];
                case 1:
                    endpoint = _a.sent();
                    previousEndpoint = process.env.FLOW_KERNEL_HTTP;
                    previousMode = process.env.FLOW_KERNEL_MODE;
                    process.env.FLOW_KERNEL_HTTP = endpoint;
                    process.env.FLOW_KERNEL_MODE = 'external';
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, , 5, 7]);
                    bridge = new flow_kernel_bridge_1.ExternalFlowKernelBridge();
                    return [4 /*yield*/, bridge.startRun(workflow, 'needs approval', 'summary')];
                case 3:
                    waiting = _a.sent();
                    (0, chai_1.expect)(waiting.status).to.equal('waiting_gate');
                    (0, chai_1.expect)(waiting.gates[0]).to.include({ id: 'gate-review', status: 'pending' });
                    return [4 /*yield*/, bridge.approveGate(workflow, waiting, {
                            runId: waiting.id,
                            gateId: 'gate-review',
                            decision: 'approved',
                            note: 'approved in UI'
                        })];
                case 4:
                    approved = _a.sent();
                    (0, chai_1.expect)(approved.gates[0]).to.include({ id: 'gate-review', status: 'approved' });
                    (0, chai_1.expect)(approved.currentStateIds).to.deep.equal(['execution']);
                    (0, chai_1.expect)(approved.events.map(function (event) { return event.type; })).to.include('transition.fired');
                    (0, chai_1.expect)(server.requestTypes()).to.deep.equal([
                        'validate_workflow',
                        'start_run',
                        'list_events',
                        'gate_approved',
                        'list_events'
                    ]);
                    return [3 /*break*/, 7];
                case 5:
                    setEnv('FLOW_KERNEL_HTTP', previousEndpoint);
                    setEnv('FLOW_KERNEL_MODE', previousMode);
                    return [4 /*yield*/, server.stop()];
                case 6:
                    _a.sent();
                    return [7 /*endfinally*/];
                case 7: return [2 /*return*/];
            }
        });
    }); });
    it('encaminha rejeicao de gate externo como callback gate_rejected', function () { return __awaiter(void 0, void 0, void 0, function () {
        var workflow, waitingRun, events, rejectedRun, server, endpoint, previousEndpoint, previousMode, bridge, waiting, rejected;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    workflow = sampleWorkflow();
                    waitingRun = {
                        id: 'kernel-run-gate-reject',
                        workflowId: workflow.id,
                        workflow: workflow,
                        status: 'waiting',
                        createdAt: '2026-05-20T10:00:00.000Z',
                        updatedAt: '2026-05-20T10:00:00.000Z',
                        activeStates: { review: true },
                        completedStates: { intake: true },
                        workloads: {},
                        artifacts: {},
                        effects: [],
                        signals: {},
                        requests: []
                    };
                    events = [{
                            seq: 1,
                            time: '2026-05-20T10:00:00.000Z',
                            type: 'gate.waiting',
                            runId: 'kernel-run-gate-reject',
                            stateId: 'review',
                            gateId: 'gate-review',
                            message: 'Approve review'
                        }];
                    rejectedRun = __assign(__assign({}, waitingRun), { status: 'failed', updatedAt: '2026-05-20T10:01:00.000Z', activeStates: {}, requests: [] });
                    server = new MockKernelHttpServer({
                        validate_workflow: function () { return ({ type: 'validate_workflow.ok', valid: true, workflowId: workflow.id }); },
                        start_run: function () { return ({ type: 'start_run.ok', run: waitingRun, requests: [] }); },
                        list_events: function () { return ({ type: 'list_events.ok', events: events }); },
                        gate_rejected: function (request) {
                            (0, chai_1.expect)(request.gateId).to.equal('gate-review');
                            events = __spreadArray(__spreadArray([], events, true), [{
                                    seq: 2,
                                    time: '2026-05-20T10:01:00.000Z',
                                    type: 'gate.rejected',
                                    runId: 'kernel-run-gate-reject',
                                    stateId: 'review',
                                    gateId: 'gate-review',
                                    message: 'gate rejected'
                                }], false);
                            return { type: 'gate_rejected.ok', run: rejectedRun, requests: [] };
                        }
                    });
                    return [4 /*yield*/, server.start()];
                case 1:
                    endpoint = _a.sent();
                    previousEndpoint = process.env.FLOW_KERNEL_HTTP;
                    previousMode = process.env.FLOW_KERNEL_MODE;
                    process.env.FLOW_KERNEL_HTTP = endpoint;
                    process.env.FLOW_KERNEL_MODE = 'external';
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, , 5, 7]);
                    bridge = new flow_kernel_bridge_1.ExternalFlowKernelBridge();
                    return [4 /*yield*/, bridge.startRun(workflow, 'needs approval', 'summary')];
                case 3:
                    waiting = _a.sent();
                    return [4 /*yield*/, bridge.approveGate(workflow, waiting, {
                            runId: waiting.id,
                            gateId: 'gate-review',
                            decision: 'rejected'
                        })];
                case 4:
                    rejected = _a.sent();
                    (0, chai_1.expect)(rejected.status).to.equal('failed');
                    (0, chai_1.expect)(rejected.gates[0]).to.include({ id: 'gate-review', status: 'rejected' });
                    (0, chai_1.expect)(server.requestTypes()).to.deep.equal([
                        'validate_workflow',
                        'start_run',
                        'list_events',
                        'gate_rejected',
                        'list_events'
                    ]);
                    return [3 /*break*/, 7];
                case 5:
                    setEnv('FLOW_KERNEL_HTTP', previousEndpoint);
                    setEnv('FLOW_KERNEL_MODE', previousMode);
                    return [4 /*yield*/, server.stop()];
                case 6:
                    _a.sent();
                    return [7 /*endfinally*/];
                case 7: return [2 /*return*/];
            }
        });
    }); });
    it('executa workloads paralelos do kernel pelo executor de host sem compartilhar contexto entre agentes', function () { return __awaiter(void 0, void 0, void 0, function () {
        var workflow, initialRun, executions, inFlight, maxInFlight, executor, server, endpoint, previousEndpoint, previousMode;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    workflow = {
                        version: 'flow.workflow/v1',
                        id: 'parallel-real-host',
                        name: 'Parallel Real Host',
                        agents: {
                            backend: 'agents/backend.md',
                            frontend: 'agents/frontend.md',
                            designer: 'agents/designer.md'
                        },
                        states: {
                            parallel_delivery: {
                                type: 'parallel',
                                branches: {
                                    backend_work: { type: 'agent', agent: 'backend', outputs: ['delivery/backend.md'] },
                                    frontend_work: { type: 'agent', agent: 'frontend', outputs: ['delivery/frontend.md'] },
                                    designer_work: { type: 'agent', agent: 'designer', outputs: ['delivery/designer.md'] }
                                }
                            },
                            done: { type: 'report', outputs: ['final.md'] }
                        },
                        transitions: [
                            { from: 'parallel_delivery', to: 'done', on: 'state.completed' }
                        ]
                    };
                    initialRun = {
                        id: 'kernel-run-parallel',
                        workflowId: workflow.id,
                        workflow: workflow,
                        status: 'waiting',
                        createdAt: '2026-05-20T10:00:00.000Z',
                        updatedAt: '2026-05-20T10:00:00.000Z',
                        activeStates: { parallel_delivery: true },
                        completedStates: {},
                        workloads: {
                            wl_0001: kernelWorkload('wl_0001', 'backend_work', 'backend'),
                            wl_0002: kernelWorkload('wl_0002', 'frontend_work', 'frontend'),
                            wl_0003: kernelWorkload('wl_0003', 'designer_work', 'designer')
                        },
                        artifacts: {},
                        effects: [],
                        signals: {},
                        requests: [
                            hostWorkloadRequest('wl_0001', 'backend_work', 'backend'),
                            hostWorkloadRequest('wl_0002', 'frontend_work', 'frontend'),
                            hostWorkloadRequest('wl_0003', 'designer_work', 'designer')
                        ]
                    };
                    executions = [];
                    inFlight = 0;
                    maxInFlight = 0;
                    executor = {
                        execute: function (context) { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        executions.push(context.workload.stateId);
                                        inFlight += 1;
                                        maxInFlight = Math.max(maxInFlight, inFlight);
                                        (0, chai_1.expect)(context.run.workloads.filter(function (workload) { return workload.status === 'done'; })).to.have.length(0);
                                        return [4 /*yield*/, Promise.resolve()];
                                    case 1:
                                        _a.sent();
                                        inFlight -= 1;
                                        context.workload.status = 'done';
                                        context.workload.outputArtifacts = ["file:///tmp/".concat(context.workload.stateId, ".md")];
                                        context.run.artifacts.push({
                                            id: "".concat(context.workload.id, "-artifact"),
                                            runId: context.run.id,
                                            stateId: context.workload.stateId,
                                            uri: context.workload.outputArtifacts[0],
                                            kind: 'report',
                                            summary: context.workload.outputArtifacts[0],
                                            createdAt: '2026-05-20T10:00:01.000Z'
                                        });
                                        context.run.signals.push({
                                            key: "".concat(context.workload.stateId, ".status"),
                                            value: 'completed',
                                            stateId: context.workload.stateId,
                                            runId: context.run.id,
                                            createdAt: '2026-05-20T10:00:01.000Z'
                                        });
                                        return [2 /*return*/, {}];
                                }
                            });
                        }); },
                        executeAgentWorkload: function (context) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, executor.execute(context)];
                        }); }); },
                        executeContextWorkload: function (context) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, executor.execute(context)];
                        }); }); },
                        executeCommandWorkload: function (context) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, executor.execute(context)];
                        }); }); },
                        executeMemoryWriteWorkload: function (context) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, executor.execute(context)];
                        }); }); },
                        executeReportWorkload: function (context) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, executor.execute(context)];
                        }); }); }
                    };
                    server = new MockKernelHttpServer({
                        validate_workflow: function () { return ({ type: 'validate_workflow.ok', valid: true, workflowId: workflow.id }); },
                        start_run: function () { return ({ type: 'start_run.ok', run: initialRun, requests: initialRun.requests }); },
                        list_events: function () { return ({ type: 'list_events.ok', events: [] }); },
                        workload_started: function () { return ({ type: 'workload_started.ok', run: initialRun }); },
                        artifact_created: function () { return ({ type: 'artifact_created.ok', run: initialRun }); },
                        signal_recorded: function () { return ({ type: 'signal_recorded.ok', run: initialRun }); },
                        workload_completed: function () { return ({ type: 'workload_completed.ok', run: __assign(__assign({}, initialRun), { requests: [] }) }); }
                    });
                    return [4 /*yield*/, server.start()];
                case 1:
                    endpoint = _a.sent();
                    previousEndpoint = process.env.FLOW_KERNEL_HTTP;
                    previousMode = process.env.FLOW_KERNEL_MODE;
                    process.env.FLOW_KERNEL_HTTP = endpoint;
                    process.env.FLOW_KERNEL_MODE = 'external';
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, , 4, 6]);
                    return [4 /*yield*/, new flow_kernel_bridge_1.ExternalFlowKernelBridge(executor).startRun(workflow, 'build it', 'summary', 'file:///workspace')];
                case 3:
                    _a.sent();
                    (0, chai_1.expect)(executions).to.have.members(['backend_work', 'frontend_work', 'designer_work']);
                    (0, chai_1.expect)(maxInFlight).to.be.greaterThan(1);
                    (0, chai_1.expect)(server.requestTypes().filter(function (type) { return type === 'workload_started'; })).to.have.length(3);
                    (0, chai_1.expect)(server.requestTypes().filter(function (type) { return type === 'workload_completed'; })).to.have.length(3);
                    return [3 /*break*/, 6];
                case 4:
                    setEnv('FLOW_KERNEL_HTTP', previousEndpoint);
                    setEnv('FLOW_KERNEL_MODE', previousMode);
                    return [4 /*yield*/, server.stop()];
                case 5:
                    _a.sent();
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); });
    it('trata request_context_pack via MemoryAdapter e confirma no kernel', function () { return __awaiter(void 0, void 0, void 0, function () {
        var workflow, initialRun, completedRun, buildCalls, memory, server, endpoint, previousEndpoint, previousMode;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    workflow = sampleWorkflow();
                    initialRun = {
                        id: 'kernel-run-context',
                        workflowId: workflow.id,
                        workflow: workflow,
                        status: 'running',
                        createdAt: '2026-05-20T10:00:00.000Z',
                        updatedAt: '2026-05-20T10:00:00.000Z',
                        workloads: {
                            wl_context: {
                                id: 'wl_context',
                                runId: 'kernel-run-context',
                                stateId: 'context',
                                agent: 'context.md',
                                type: 'context',
                                status: 'waiting_for_host',
                                input: { include: [] },
                                outputs: [],
                                createdAt: '2026-05-20T10:00:00.000Z'
                            }
                        },
                        artifacts: {},
                        effects: [],
                        signals: {},
                        requests: [{
                                id: 'ctx-1',
                                type: 'request_context_pack',
                                requestId: 'ctx-1',
                                runId: 'kernel-run-context',
                                workloadId: 'wl_context',
                                stateId: 'context'
                            }]
                    };
                    completedRun = __assign(__assign({}, initialRun), { requests: [] });
                    buildCalls = [];
                    memory = {
                        buildContextPack: function (workspaceRootUri, requestedWorkflow, workload) { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                buildCalls.push({ workspaceRootUri: workspaceRootUri, workflowId: requestedWorkflow.id, workload: workload });
                                return [2 /*return*/, {
                                        workspaceRootUri: workspaceRootUri,
                                        summary: 'Context pack from Memory.',
                                        workflow: { id: requestedWorkflow.id, name: requestedWorkflow.name, stateCount: requestedWorkflow.states.length, transitionCount: requestedWorkflow.transitions.length, agentIds: [] },
                                        files: [{ uri: 'file:///workspace/src/app.ts', reason: 'Relevant source' }],
                                        symbols: ['App'],
                                        signals: [{ key: 'context.ready', value: true }]
                                    }];
                            });
                        }); }
                    };
                    server = new MockKernelHttpServer({
                        validate_workflow: function () { return ({ type: 'validate_workflow.ok', valid: true, workflowId: workflow.id }); },
                        start_run: function () { return ({ type: 'start_run.ok', run: initialRun, requests: initialRun.requests }); },
                        list_events: function () { return ({ type: 'list_events.ok', events: [] }); },
                        workload_started: function () { return ({ type: 'workload_started.ok', run: initialRun }); },
                        artifact_created: function (request) {
                            (0, chai_1.expect)(request.artifactType).to.equal('other');
                            (0, chai_1.expect)(String(request.path || '')).to.contain('context-pack-kernel-run-context-wl_context');
                            return { type: 'artifact_created.ok', run: initialRun };
                        },
                        signal_recorded: function (request) {
                            (0, chai_1.expect)(request.key).to.equal('memory.context_pack.built');
                            return { type: 'signal_recorded.ok', run: initialRun };
                        },
                        workload_completed: function (request) {
                            (0, chai_1.expect)(request.workloadId).to.equal('wl_context');
                            return { type: 'workload_completed.ok', run: completedRun };
                        }
                    });
                    return [4 /*yield*/, server.start()];
                case 1:
                    endpoint = _a.sent();
                    previousEndpoint = process.env.FLOW_KERNEL_HTTP;
                    previousMode = process.env.FLOW_KERNEL_MODE;
                    process.env.FLOW_KERNEL_HTTP = endpoint;
                    process.env.FLOW_KERNEL_MODE = 'external';
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, , 4, 6]);
                    return [4 /*yield*/, new flow_kernel_bridge_1.ExternalFlowKernelBridge(new flow_workload_executor_1.ProviderBackedFlowWorkloadExecutor(), memory)
                            .startRun(workflow, 'build context', 'summary', 'file:///workspace')];
                case 3:
                    _a.sent();
                    (0, chai_1.expect)(buildCalls).to.have.length(1);
                    (0, chai_1.expect)(server.requestTypes()).to.include.members(['workload_started', 'artifact_created', 'signal_recorded', 'workload_completed']);
                    return [3 /*break*/, 6];
                case 4:
                    setEnv('FLOW_KERNEL_HTTP', previousEndpoint);
                    setEnv('FLOW_KERNEL_MODE', previousMode);
                    return [4 /*yield*/, server.stop()];
                case 5:
                    _a.sent();
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); });
    it('trata request_memory_write como candidato explicito sem persistir memoria automaticamente', function () { return __awaiter(void 0, void 0, void 0, function () {
        var workflow, initialRun, executorCalled, executor, server, endpoint, previousEndpoint, previousMode;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    workflow = sampleWorkflow();
                    initialRun = {
                        id: 'kernel-run-memory',
                        workflowId: workflow.id,
                        workflow: workflow,
                        status: 'running',
                        createdAt: '2026-05-20T10:00:00.000Z',
                        updatedAt: '2026-05-20T10:00:00.000Z',
                        workloads: {
                            wl_memory: {
                                id: 'wl_memory',
                                runId: 'kernel-run-memory',
                                stateId: 'memory_review',
                                agent: 'memory.md',
                                type: 'memory_write',
                                status: 'waiting_for_host',
                                input: { include: [] },
                                outputs: [],
                                createdAt: '2026-05-20T10:00:00.000Z'
                            }
                        },
                        artifacts: {},
                        effects: [],
                        signals: {},
                        requests: [{
                                id: 'mem-1',
                                type: 'request_memory_write',
                                requestId: 'mem-1',
                                runId: 'kernel-run-memory',
                                workloadId: 'wl_memory',
                                stateId: 'memory_review'
                            }]
                    };
                    executorCalled = false;
                    executor = {
                        execute: function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                executorCalled = true;
                                return [2 /*return*/, {}];
                            });
                        }); },
                        executeAgentWorkload: function (context) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, executor.execute(context)];
                        }); }); },
                        executeContextWorkload: function (context) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, executor.execute(context)];
                        }); }); },
                        executeCommandWorkload: function (context) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, executor.execute(context)];
                        }); }); },
                        executeMemoryWriteWorkload: function (context) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, executor.execute(context)];
                        }); }); },
                        executeReportWorkload: function (context) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, executor.execute(context)];
                        }); }); }
                    };
                    server = new MockKernelHttpServer({
                        validate_workflow: function () { return ({ type: 'validate_workflow.ok', valid: true, workflowId: workflow.id }); },
                        start_run: function () { return ({ type: 'start_run.ok', run: initialRun, requests: initialRun.requests }); },
                        list_events: function () { return ({ type: 'list_events.ok', events: [] }); },
                        workload_started: function () { return ({ type: 'workload_started.ok', run: initialRun }); },
                        effect_recorded: function (request) {
                            (0, chai_1.expect)(request.effectType).to.equal('memory.write');
                            (0, chai_1.expect)(request.status).to.equal('proposed');
                            (0, chai_1.expect)(request.approvalPolicy).to.equal('human_gate_required');
                            return { type: 'effect_recorded.ok', run: initialRun };
                        },
                        signal_recorded: function (request) {
                            (0, chai_1.expect)(request.key).to.equal('memory_write.candidate_proposed');
                            return { type: 'signal_recorded.ok', run: initialRun };
                        },
                        workload_completed: function (request) {
                            (0, chai_1.expect)(request.workloadId).to.equal('wl_memory');
                            return { type: 'workload_completed.ok', run: __assign(__assign({}, initialRun), { requests: [] }) };
                        }
                    });
                    return [4 /*yield*/, server.start()];
                case 1:
                    endpoint = _a.sent();
                    previousEndpoint = process.env.FLOW_KERNEL_HTTP;
                    previousMode = process.env.FLOW_KERNEL_MODE;
                    process.env.FLOW_KERNEL_HTTP = endpoint;
                    process.env.FLOW_KERNEL_MODE = 'external';
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, , 4, 6]);
                    return [4 /*yield*/, new flow_kernel_bridge_1.ExternalFlowKernelBridge(executor).startRun(workflow, 'review memory', 'summary', 'file:///workspace')];
                case 3:
                    _a.sent();
                    (0, chai_1.expect)(executorCalled).to.equal(false);
                    (0, chai_1.expect)(server.requestTypes()).to.include.members(['workload_started', 'effect_recorded', 'signal_recorded', 'workload_completed']);
                    return [3 /*break*/, 6];
                case 4:
                    setEnv('FLOW_KERNEL_HTTP', previousEndpoint);
                    setEnv('FLOW_KERNEL_MODE', previousMode);
                    return [4 /*yield*/, server.stop()];
                case 5:
                    _a.sent();
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); });
    it('trata request_command_execution pelo CommandEffectHostAdapter e audita o resultado no kernel', function () { return __awaiter(void 0, void 0, void 0, function () {
        var workflow, initialRun, commandCalls, commandAdapter, server, endpoint, previousEndpoint, previousMode;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    workflow = __assign(__assign({}, sampleWorkflow()), { states: {
                            command_step: {
                                type: 'command',
                                command: 'node -e "console.log(process.env.SAFE_TOKEN)"',
                                cwd: 'tools',
                                env: { SAFE_TOKEN: 'secret-token-value', UNSAFE_TOKEN: 'blocked' },
                                allowedEnv: ['SAFE_TOKEN'],
                                allowedCommands: ['node'],
                                timeoutMs: 1234,
                                approvalPolicy: 'auto'
                            }
                        }, transitions: [] });
                    initialRun = {
                        id: 'kernel-run-command',
                        workflowId: workflow.id,
                        workflow: workflow,
                        status: 'running',
                        createdAt: '2026-05-20T10:00:00.000Z',
                        updatedAt: '2026-05-20T10:00:00.000Z',
                        workloads: {
                            wl_command: {
                                id: 'wl_command',
                                runId: 'kernel-run-command',
                                stateId: 'command_step',
                                agent: 'command.md',
                                type: 'command',
                                status: 'waiting_for_host',
                                input: { include: [] },
                                outputs: [],
                                createdAt: '2026-05-20T10:00:00.000Z'
                            }
                        },
                        artifacts: {},
                        effects: [],
                        signals: {},
                        requests: [{
                                id: 'cmd-1',
                                type: 'request_command_execution',
                                requestId: 'cmd-1',
                                runId: 'kernel-run-command',
                                workloadId: 'wl_command',
                                stateId: 'command_step'
                            }]
                    };
                    commandCalls = [];
                    commandAdapter = {
                        prepare: function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                throw new Error('prepare should not be called directly');
                            });
                        }); },
                        apply: function (workspaceRootUri, effect) { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                commandCalls.push({ workspaceRootUri: workspaceRootUri, effect: effect });
                                return [2 /*return*/, {
                                        command: effect.command,
                                        executable: 'node',
                                        args: ['-e', 'console.log(process.env.SAFE_TOKEN)'],
                                        workspaceRoot: '/workspace',
                                        cwd: '/workspace/tools',
                                        relativeCwd: 'tools',
                                        env: { SAFE_TOKEN: 'secret-token-value' },
                                        timeoutMs: 1234,
                                        approvalPolicy: 'auto',
                                        requiresApproval: false,
                                        blocked: false,
                                        riskReasons: [],
                                        applied: true,
                                        status: 'applied',
                                        exitCode: 0,
                                        stdout: '[REDACTED]',
                                        stderr: '',
                                        timedOut: false
                                    }];
                            });
                        }); }
                    };
                    server = new MockKernelHttpServer({
                        validate_workflow: function () { return ({ type: 'validate_workflow.ok', valid: true, workflowId: workflow.id }); },
                        start_run: function () { return ({ type: 'start_run.ok', run: initialRun, requests: initialRun.requests }); },
                        list_events: function () { return ({ type: 'list_events.ok', events: [] }); },
                        workload_started: function () { return ({ type: 'workload_started.ok', run: initialRun }); },
                        effect_recorded: function (request) {
                            (0, chai_1.expect)(request.effectType).to.equal('command.executed');
                            (0, chai_1.expect)(request.command).to.equal('node -e "console.log(process.env.SAFE_TOKEN)"');
                            (0, chai_1.expect)(request.status).to.equal('applied');
                            (0, chai_1.expect)(request.effect.env).to.deep.equal({ SAFE_TOKEN: 'secret-token-value' });
                            (0, chai_1.expect)(request.effect.stdout).to.equal('[REDACTED]');
                            return { type: 'effect_recorded.ok', run: initialRun };
                        },
                        signal_recorded: function (request) {
                            (0, chai_1.expect)(request.key).to.equal('command_execution.status');
                            (0, chai_1.expect)(request.value).to.equal('applied');
                            return { type: 'signal_recorded.ok', run: initialRun };
                        },
                        workload_completed: function (request) {
                            (0, chai_1.expect)(request.workloadId).to.equal('wl_command');
                            return { type: 'workload_completed.ok', run: __assign(__assign({}, initialRun), { requests: [] }) };
                        }
                    });
                    return [4 /*yield*/, server.start()];
                case 1:
                    endpoint = _a.sent();
                    previousEndpoint = process.env.FLOW_KERNEL_HTTP;
                    previousMode = process.env.FLOW_KERNEL_MODE;
                    process.env.FLOW_KERNEL_HTTP = endpoint;
                    process.env.FLOW_KERNEL_MODE = 'external';
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, , 4, 6]);
                    return [4 /*yield*/, new flow_kernel_bridge_1.ExternalFlowKernelBridge(new flow_workload_executor_1.ProviderBackedFlowWorkloadExecutor(), undefined, commandAdapter)
                            .startRun(workflow, 'run command', 'summary', 'file:///workspace')];
                case 3:
                    _a.sent();
                    (0, chai_1.expect)(commandCalls).to.deep.equal([{
                            workspaceRootUri: 'file:///workspace',
                            effect: {
                                command: 'node -e "console.log(process.env.SAFE_TOKEN)"',
                                cwd: 'tools',
                                env: { SAFE_TOKEN: 'secret-token-value', UNSAFE_TOKEN: 'blocked' },
                                allowedEnv: ['SAFE_TOKEN'],
                                allowedCommands: ['node'],
                                timeoutMs: 1234,
                                approvalPolicy: 'auto'
                            }
                        }]);
                    (0, chai_1.expect)(server.requestTypes()).to.include.members(['workload_started', 'effect_recorded', 'signal_recorded', 'workload_completed']);
                    return [3 /*break*/, 6];
                case 4:
                    setEnv('FLOW_KERNEL_HTTP', previousEndpoint);
                    setEnv('FLOW_KERNEL_MODE', previousMode);
                    return [4 /*yield*/, server.stop()];
                case 5:
                    _a.sent();
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); });
    it('confirma workload_failed no kernel quando o executor de host falha um workload', function () { return __awaiter(void 0, void 0, void 0, function () {
        var workflow, initialRun, failedRun, executor, server, endpoint, previousEndpoint, previousMode, run;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    workflow = sampleWorkflow();
                    initialRun = {
                        id: 'kernel-run-workload-failure',
                        workflowId: workflow.id,
                        workflow: workflow,
                        status: 'running',
                        createdAt: '2026-05-20T10:00:00.000Z',
                        updatedAt: '2026-05-20T10:00:00.000Z',
                        workloads: {
                            wl_review: {
                                id: 'wl_review',
                                runId: 'kernel-run-workload-failure',
                                stateId: 'review',
                                agent: 'reviewer',
                                status: 'waiting_for_host',
                                input: { include: [] },
                                outputs: [],
                                createdAt: '2026-05-20T10:00:00.000Z'
                            }
                        },
                        artifacts: {},
                        effects: [],
                        signals: {},
                        requests: [{
                                id: 'wl_review',
                                type: 'execute_workload',
                                requestId: 'wl_review',
                                runId: 'kernel-run-workload-failure',
                                workloadId: 'wl_review',
                                stateId: 'review'
                            }]
                    };
                    failedRun = __assign(__assign({}, initialRun), { status: 'failed', updatedAt: '2026-05-20T10:01:00.000Z', requests: [] });
                    executor = {
                        execute: function (context) { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                context.workload.status = 'failed';
                                context.workload.issues.push('Reviewer agent failed contract validation.');
                                return [2 /*return*/, {}];
                            });
                        }); },
                        executeAgentWorkload: function (context) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, executor.execute(context)];
                        }); }); },
                        executeContextWorkload: function (context) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, executor.execute(context)];
                        }); }); },
                        executeCommandWorkload: function (context) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, executor.execute(context)];
                        }); }); },
                        executeMemoryWriteWorkload: function (context) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, executor.execute(context)];
                        }); }); },
                        executeReportWorkload: function (context) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, executor.execute(context)];
                        }); }); }
                    };
                    server = new MockKernelHttpServer({
                        validate_workflow: function () { return ({ type: 'validate_workflow.ok', valid: true, workflowId: workflow.id }); },
                        start_run: function () { return ({ type: 'start_run.ok', run: initialRun, requests: initialRun.requests }); },
                        list_events: function () { return ({ type: 'list_events.ok', events: [] }); },
                        workload_started: function (request) {
                            (0, chai_1.expect)(request.workloadId).to.equal('wl_review');
                            return { type: 'workload_started.ok', run: initialRun };
                        },
                        artifact_created: function (request) {
                            (0, chai_1.expect)(request.artifactType).to.equal('input');
                            return { type: 'artifact_created.ok', run: initialRun };
                        },
                        issue_recorded: function (request) {
                            (0, chai_1.expect)(request.workloadId).to.equal('wl_review');
                            (0, chai_1.expect)(request.issue).to.deep.equal({
                                severity: 'non_blocking',
                                type: 'workload_issue',
                                summary: 'Reviewer agent failed contract validation.'
                            });
                            return { type: 'issue_recorded.ok', run: initialRun };
                        },
                        workload_failed: function (request) {
                            (0, chai_1.expect)(request.workloadId).to.equal('wl_review');
                            (0, chai_1.expect)(request.error).to.equal('Reviewer agent failed contract validation.');
                            return { type: 'workload_failed.ok', run: failedRun };
                        }
                    });
                    return [4 /*yield*/, server.start()];
                case 1:
                    endpoint = _a.sent();
                    previousEndpoint = process.env.FLOW_KERNEL_HTTP;
                    previousMode = process.env.FLOW_KERNEL_MODE;
                    process.env.FLOW_KERNEL_HTTP = endpoint;
                    process.env.FLOW_KERNEL_MODE = 'external';
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, , 4, 6]);
                    return [4 /*yield*/, new flow_kernel_bridge_1.ExternalFlowKernelBridge(executor)
                            .startRun(workflow, 'review this', 'summary', 'file:///workspace')];
                case 3:
                    run = _a.sent();
                    (0, chai_1.expect)(run.status).to.equal('failed');
                    (0, chai_1.expect)(server.requestTypes()).to.deep.equal([
                        'validate_workflow',
                        'start_run',
                        'workload_started',
                        'list_events',
                        'artifact_created',
                        'issue_recorded',
                        'workload_failed',
                        'list_events'
                    ]);
                    return [3 /*break*/, 6];
                case 4:
                    setEnv('FLOW_KERNEL_HTTP', previousEndpoint);
                    setEnv('FLOW_KERNEL_MODE', previousMode);
                    return [4 /*yield*/, server.stop()];
                case 5:
                    _a.sent();
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); });
    it('deduplica eventos duplicados do kernel por seq', function () { return __awaiter(void 0, void 0, void 0, function () {
        var workflow, server, endpoint, previousEndpoint, previousMode, run, duplicated;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    workflow = sampleWorkflow();
                    server = new MockKernelHttpServer({
                        validate_workflow: function () { return ({ type: 'validate_workflow.ok', valid: true, workflowId: workflow.id }); },
                        start_run: function () { return ({
                            type: 'start_run.ok',
                            run: {
                                id: 'kernel-run-dup',
                                workflowId: workflow.id,
                                workflow: workflow,
                                status: 'running',
                                createdAt: '2026-05-19T10:10:00.000Z',
                                updatedAt: '2026-05-19T10:10:00.000Z'
                            }
                        }); },
                        list_events: function () { return ({
                            type: 'list_events.ok',
                            events: [
                                {
                                    seq: 10,
                                    time: '2026-05-19T10:10:00.100Z',
                                    type: 'run.started',
                                    runId: 'kernel-run-dup',
                                    message: 'initial started'
                                },
                                {
                                    seq: 11,
                                    time: '2026-05-19T10:10:01.000Z',
                                    type: 'transition.fired',
                                    runId: 'kernel-run-dup',
                                    stateId: 'intake',
                                    message: 'first transition'
                                },
                                {
                                    seq: 12,
                                    time: '2026-05-19T10:10:02.000Z',
                                    type: 'artifact.created',
                                    runId: 'kernel-run-dup',
                                    workloadId: 'workload',
                                    message: 'first artifact'
                                },
                                {
                                    seq: 12,
                                    time: '2026-05-19T10:10:02.200Z',
                                    type: 'artifact.created',
                                    runId: 'kernel-run-dup',
                                    workloadId: 'workload',
                                    message: 'deduped override'
                                }
                            ]
                        }); }
                    });
                    return [4 /*yield*/, server.start()];
                case 1:
                    endpoint = _a.sent();
                    previousEndpoint = process.env.FLOW_KERNEL_HTTP;
                    previousMode = process.env.FLOW_KERNEL_MODE;
                    process.env.FLOW_KERNEL_HTTP = endpoint;
                    process.env.FLOW_KERNEL_MODE = 'external';
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, , 4, 6]);
                    return [4 /*yield*/, new flow_kernel_bridge_1.ExternalFlowKernelBridge().startRun(workflow, 'review this', 'project summary')];
                case 3:
                    run = _a.sent();
                    duplicated = run.events.filter(function (event) { return event.id === '12'; });
                    (0, chai_1.expect)(duplicated).to.have.length(1);
                    (0, chai_1.expect)(duplicated[0].message).to.equal('deduped override');
                    (0, chai_1.expect)(server.requestTypes()).to.deep.equal(['validate_workflow', 'start_run', 'list_events']);
                    return [3 /*break*/, 6];
                case 4:
                    setEnv('FLOW_KERNEL_HTTP', previousEndpoint);
                    setEnv('FLOW_KERNEL_MODE', previousMode);
                    return [4 /*yield*/, server.stop()];
                case 5:
                    _a.sent();
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); });
    it('falha claramente quando o kernel externo falha sem fallback para simulacao', function () { return __awaiter(void 0, void 0, void 0, function () {
        var workflow, externalCalls, bridge, previousMode, failure, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    workflow = sampleWorkflow();
                    externalCalls = 0;
                    bridge = new flow_kernel_bridge_1.HybridFlowKernelBridge();
                    bridge.external = {
                        available: function () { return true; },
                        getBridgeMode: function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, 'external'];
                        }); }); },
                        startRun: function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                externalCalls += 1;
                                throw new Error('Kernel unavailable');
                            });
                        }); },
                        tickRun: function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                throw new Error('Kernel unavailable');
                            });
                        }); },
                        approveGate: function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                throw new Error('Kernel unavailable');
                            });
                        }); },
                        pauseRun: function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                throw new Error('Kernel unavailable');
                            });
                        }); },
                        resumeRun: function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                throw new Error('Kernel unavailable');
                            });
                        }); },
                        cancelRun: function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                throw new Error('Kernel unavailable');
                            });
                        }); },
                        refreshRun: function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                throw new Error('Kernel unavailable');
                            });
                        }); }
                    };
                    previousMode = process.env.FLOW_KERNEL_MODE;
                    process.env.FLOW_KERNEL_MODE = 'external';
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, , 6, 7]);
                    failure = void 0;
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, bridge.startRun(workflow, 'review this', 'project summary')];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 5];
                case 4:
                    error_1 = _a.sent();
                    failure = error_1 instanceof Error ? error_1 : new Error(String(error_1));
                    return [3 /*break*/, 5];
                case 5:
                    (0, chai_1.expect)(externalCalls).to.equal(1);
                    (0, chai_1.expect)(failure === null || failure === void 0 ? void 0 : failure.message).to.contain('External Flow Kernel startRun failed: Kernel unavailable');
                    (0, chai_1.expect)(failure === null || failure === void 0 ? void 0 : failure.message).to.contain('Simulated fallback is disabled');
                    return [3 /*break*/, 7];
                case 6:
                    setEnv('FLOW_KERNEL_MODE', previousMode);
                    return [7 /*endfinally*/];
                case 7: return [2 /*return*/];
            }
        });
    }); });
    it('recupera da perda de processo do transport com restart e reconexao', function () { return __awaiter(void 0, void 0, void 0, function () {
        var transport, external, run;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    transport = new FlakyStdioTransport();
                    external = new flow_kernel_bridge_1.ExternalFlowKernelBridge();
                    external.transport = transport;
                    return [4 /*yield*/, external.startRun(sampleWorkflow(), 'retry this', 'project summary')];
                case 1:
                    run = _b.sent();
                    (0, chai_1.expect)(transport.calls).to.deep.equal(['validate_workflow', 'start_run', 'start_run', 'list_events']);
                    (0, chai_1.expect)(transport.restartCount).to.equal(1);
                    (0, chai_1.expect)((_a = run.externalKernelMetadata) === null || _a === void 0 ? void 0 : _a.kernelRunId).to.equal('kernel-run-recovered');
                    (0, chai_1.expect)(run.events.map(function (event) { return event.type; })).to.include('run.started');
                    return [2 /*return*/];
            }
        });
    }); });
    it('alterna capability simulated apenas em modo explicito e falha sem kernel externo no padrao', function () { return __awaiter(void 0, void 0, void 0, function () {
        var externalAvailable, externalModeChecks, workflow, fakeExternal, bridge, previousMode, _a, _b, _c, defaultFailure, error_2, autoModeFailure, error_3;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    externalAvailable = true;
                    externalModeChecks = 0;
                    workflow = sampleWorkflow();
                    fakeExternal = {
                        available: function () { return externalAvailable; },
                        getBridgeMode: function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                externalModeChecks += 1;
                                return [2 /*return*/, 'external'];
                            });
                        }); },
                        startRun: function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                throw new Error('should not be called');
                            });
                        }); },
                        tickRun: function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                throw new Error('should not be called');
                            });
                        }); },
                        approveGate: function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                throw new Error('should not be called');
                            });
                        }); },
                        pauseRun: function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                throw new Error('should not be called');
                            });
                        }); },
                        resumeRun: function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                throw new Error('should not be called');
                            });
                        }); },
                        cancelRun: function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                throw new Error('should not be called');
                            });
                        }); },
                        refreshRun: function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                throw new Error('should not be called');
                            });
                        }); }
                    };
                    bridge = new flow_kernel_bridge_1.HybridFlowKernelBridge();
                    bridge.external = fakeExternal;
                    previousMode = process.env.FLOW_KERNEL_MODE;
                    _d.label = 1;
                case 1:
                    _d.trys.push([1, , 13, 14]);
                    process.env.FLOW_KERNEL_MODE = 'simulated';
                    _a = chai_1.expect;
                    return [4 /*yield*/, bridge.getBridgeMode()];
                case 2:
                    _a.apply(void 0, [_d.sent()]).to.equal('simulated');
                    (0, chai_1.expect)(externalModeChecks).to.equal(0);
                    _b = chai_1.expect;
                    return [4 /*yield*/, bridge.startRun(workflow, 'x', 'y').then(function () { return 0; })];
                case 3:
                    _b.apply(void 0, [(_d.sent())]).to.equal(0);
                    (0, chai_1.expect)(externalModeChecks).to.equal(0);
                    process.env.FLOW_KERNEL_MODE = 'auto';
                    _c = chai_1.expect;
                    return [4 /*yield*/, bridge.getBridgeMode()];
                case 4:
                    _c.apply(void 0, [_d.sent()]).to.equal('external');
                    (0, chai_1.expect)(externalModeChecks).to.equal(1);
                    externalAvailable = false;
                    setEnv('FLOW_KERNEL_MODE', undefined);
                    defaultFailure = void 0;
                    _d.label = 5;
                case 5:
                    _d.trys.push([5, 7, , 8]);
                    return [4 /*yield*/, bridge.startRun(workflow, 'x', 'y')];
                case 6:
                    _d.sent();
                    return [3 /*break*/, 8];
                case 7:
                    error_2 = _d.sent();
                    defaultFailure = error_2 instanceof Error ? error_2 : new Error(String(error_2));
                    return [3 /*break*/, 8];
                case 8:
                    (0, chai_1.expect)(defaultFailure === null || defaultFailure === void 0 ? void 0 : defaultFailure.message).to.contain('External Flow Kernel startRun is unavailable');
                    (0, chai_1.expect)(defaultFailure === null || defaultFailure === void 0 ? void 0 : defaultFailure.message).to.contain('Simulated fallback is disabled');
                    process.env.FLOW_KERNEL_MODE = 'auto';
                    autoModeFailure = void 0;
                    _d.label = 9;
                case 9:
                    _d.trys.push([9, 11, , 12]);
                    return [4 /*yield*/, bridge.getBridgeMode()];
                case 10:
                    _d.sent();
                    return [3 /*break*/, 12];
                case 11:
                    error_3 = _d.sent();
                    autoModeFailure = error_3 instanceof Error ? error_3 : new Error(String(error_3));
                    return [3 /*break*/, 12];
                case 12:
                    (0, chai_1.expect)(autoModeFailure === null || autoModeFailure === void 0 ? void 0 : autoModeFailure.message).to.contain('External Flow Kernel getBridgeMode is unavailable');
                    (0, chai_1.expect)(autoModeFailure === null || autoModeFailure === void 0 ? void 0 : autoModeFailure.message).to.contain('Simulated fallback is disabled');
                    (0, chai_1.expect)(externalModeChecks).to.equal(1);
                    return [3 /*break*/, 14];
                case 13:
                    setEnv('FLOW_KERNEL_MODE', previousMode);
                    return [7 /*endfinally*/];
                case 14: return [2 /*return*/];
            }
        });
    }); });
    function setEnv(name, value) {
        if (value === undefined) {
            delete process.env[name];
            return;
        }
        process.env[name] = value;
    }
});
function kernelWorkload(id, stateId, agent) {
    return {
        id: id,
        runId: 'kernel-run-parallel',
        stateId: stateId,
        parentState: 'parallel_delivery',
        agent: agent,
        type: 'agent',
        status: 'waiting_for_host',
        input: { include: [] },
        outputs: ["delivery/".concat(stateId, ".md")],
        createdAt: '2026-05-20T10:00:00.000Z'
    };
}
function hostWorkloadRequest(workloadId, stateId, agent) {
    return {
        id: workloadId,
        type: 'execute_workload',
        requestId: workloadId,
        runId: 'kernel-run-parallel',
        workloadId: workloadId,
        stateId: stateId,
        agent: agent,
        inputArtifacts: [],
        outputContract: 'schemas/workload-output.schema.json'
    };
}
function workloadOutput(status, summary, artifacts, signals, extraIssues) {
    if (signals === void 0) { signals = {}; }
    if (extraIssues === void 0) { extraIssues = []; }
    var issues = __spreadArray(__spreadArray([], (status === 'failed'
        ? [{ severity: 'blocking', type: 'contract_validation', summary: summary }]
        : []), true), extraIssues, true);
    return JSON.stringify({
        result: {
            status: status,
            summary: summary,
            artifacts: artifacts,
            signals: signals,
            issues: issues
        },
        report: summary,
        artifacts: artifacts,
        signals: signals,
        issues: issues
    });
}
function validContractPackage() {
    return {
        packageId: 'contracts-integration',
        schemaVersion: 'flow.contracts/v1',
        sharedMd: {
            path: 'contracts/shared.md',
            deliveryObjective: 'Deliver a feature through parallel branches.',
            approvedScope: ['backend endpoint', 'frontend screen', 'design asset'],
            outOfScope: ['billing migration'],
            decisions: ['Use Contracted Parallel Delivery.'],
            canonicalNames: ['FeatureRequest'],
            knownRisks: [{
                    id: 'risk-parallel-drift',
                    severity: 'medium',
                    description: 'Parallel branches can drift.',
                    impact: 'QA may fail the first pass.',
                    mitigation: 'Run repair once and revalidate.'
                }],
            changeRules: {
                approvalPolicy: 'human_gate_for_scope_or_contract_schema',
                requiresHumanGateForContractMutation: true,
                outOfScopeAction: 'second_run_required',
                maxRevisionAttempts: 1
            }
        },
        api: [{ id: 'feature_read', method: 'GET', path: '/feature', statusCodes: [200] }],
        assets: [{ id: 'feature_icon', path: 'public/assets/feature-icon.png', format: 'png', description: 'Feature icon.', usage: 'header' }],
        workOrders: [
            { id: 'backend', agentRole: 'backend', path: 'contracts/work-orders/backend.md', scope: ['Implement API'], instructions: 'Build the API contract.', requiredInputs: ['contracts/shared.md'], acceptanceCriteria: ['Endpoint matches contract.'] },
            { id: 'frontend', agentRole: 'frontend', path: 'contracts/work-orders/frontend.md', scope: ['Implement UI'], instructions: 'Build the screen.', requiredInputs: ['contracts/shared.md'], acceptanceCriteria: ['Screen calls API.'] },
            { id: 'designer', agentRole: 'designer', path: 'contracts/work-orders/designer.md', scope: ['Prepare assets'], instructions: 'Create required assets.', requiredInputs: ['contracts/shared.md'], acceptanceCriteria: ['Assets match contract.'] },
            { id: 'qa', agentRole: 'qa', path: 'contracts/work-orders/qa.md', scope: ['Validate delivery'], instructions: 'Validate all branches.', requiredInputs: ['contracts/contracts.json'], acceptanceCriteria: ['All contract checks pass.'] }
        ],
        schemas: {
            api: [{ path: 'schemas/api.json', category: 'api', version: '1.0.0' }],
            assets: [{ path: 'schemas/assets.json', category: 'asset', version: '1.0.0' }]
        },
        approvedScope: ['backend endpoint', 'frontend screen', 'design asset'],
        outOfScope: ['billing migration'],
        risks: [{
                id: 'risk-parallel-drift',
                severity: 'medium',
                description: 'Parallel branches can drift.',
                impact: 'QA may fail the first pass.',
                mitigation: 'Run repair once and revalidate.'
            }],
        changeRules: {
            approvalPolicy: 'human_gate_for_scope_or_contract_schema',
            requiresHumanGateForContractMutation: true,
            outOfScopeAction: 'second_run_required',
            maxRevisionAttempts: 1
        }
    };
}
var MockKernelHttpServer = /** @class */ (function () {
    function MockKernelHttpServer(handlers) {
        this.handlers = handlers;
        this.requestLog = [];
    }
    MockKernelHttpServer.prototype.start = function () {
        return __awaiter(this, void 0, void 0, function () {
            var address;
            var _this = this;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        this.server = http.createServer(function (request, response) {
                            var raw = '';
                            request.setEncoding('utf8');
                            request.on('data', function (chunk) {
                                raw += chunk;
                            });
                            request.on('end', function () {
                                var payload;
                                try {
                                    payload = raw ? JSON.parse(raw) : {};
                                }
                                catch (_a) {
                                    response.statusCode = 500;
                                    response.end(JSON.stringify({ type: 'request.parse_error', error: 'invalid json payload' }));
                                    return;
                                }
                                _this.requestLog.push(payload);
                                var type = String(payload.type || '');
                                var handler = _this.handlers[type] || _this.defaultHandler(type);
                                if (!handler) {
                                    response.statusCode = 400;
                                    response.end(JSON.stringify({ type: "".concat(type, ".error"), error: "no mock handler for ".concat(type) }));
                                    return;
                                }
                                var responsePayload = handler(payload);
                                response.setHeader('content-type', 'application/json');
                                response.end(JSON.stringify(responsePayload));
                            });
                        });
                        return [4 /*yield*/, new Promise(function (resolve, reject) {
                                var _a, _b;
                                (_a = _this.server) === null || _a === void 0 ? void 0 : _a.listen(0, '127.0.0.1', function () { return resolve(); });
                                (_b = _this.server) === null || _b === void 0 ? void 0 : _b.on('error', reject);
                            })];
                    case 1:
                        _b.sent();
                        address = (_a = this.server) === null || _a === void 0 ? void 0 : _a.address();
                        if (!address || typeof address === 'string') {
                            throw new Error('Unable to determine mocked kernel endpoint.');
                        }
                        return [2 /*return*/, "http://127.0.0.1:".concat(address.port)];
                }
            });
        });
    };
    MockKernelHttpServer.prototype.requestTypes = function () {
        return this.requestLog
            .map(function (request) { return String(request.type || ''); })
            .filter(function (type) { return type !== 'handshake' && type !== 'status'; });
    };
    MockKernelHttpServer.prototype.defaultHandler = function (type) {
        switch (type) {
            case 'handshake':
                return function () { return ({ type: 'handshake.ok', protocol: 'flow-kernel/stdio/v1', version: 'flow.workflow/v1' }); };
            case 'status':
                return function () { return ({ type: 'status.ok', status: 'ready' }); };
            default:
                return undefined;
        }
    };
    MockKernelHttpServer.prototype.stop = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.server) {
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, new Promise(function (resolve, reject) {
                                var _a;
                                (_a = _this.server) === null || _a === void 0 ? void 0 : _a.close(function (error) {
                                    if (error) {
                                        reject(error);
                                        return;
                                    }
                                    resolve();
                                });
                            })];
                    case 1:
                        _a.sent();
                        this.server = undefined;
                        return [2 /*return*/];
                }
            });
        });
    };
    return MockKernelHttpServer;
}());
var MockKernelWebSocketServer = /** @class */ (function () {
    function MockKernelWebSocketServer(handlers) {
        this.handlers = handlers;
        this.requestLog = [];
        this.paths = [];
        this.sockets = new Set();
    }
    MockKernelWebSocketServer.prototype.start = function () {
        return __awaiter(this, void 0, void 0, function () {
            var address;
            var _this = this;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        this.server = http.createServer();
                        this.server.on('upgrade', function (request, socket) {
                            _this.paths.push(request.url || '');
                            if (request.url !== '/ws') {
                                socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
                                socket.destroy();
                                return;
                            }
                            var key = request.headers['sec-websocket-key'];
                            if (typeof key !== 'string') {
                                socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
                                socket.destroy();
                                return;
                            }
                            _this.sockets.add(socket);
                            socket.on('close', function () { return _this.sockets.delete(socket); });
                            socket.write([
                                'HTTP/1.1 101 Switching Protocols',
                                'Upgrade: websocket',
                                'Connection: Upgrade',
                                "Sec-WebSocket-Accept: ".concat(webSocketAcceptKey(key)),
                                '\r\n'
                            ].join('\r\n'));
                            socket.on('data', function (chunk) {
                                var message = decodeWebSocketTextFrame(chunk);
                                if (!message) {
                                    return;
                                }
                                var responsePayload = _this.handleMessage(message);
                                socket.write(encodeWebSocketTextFrame(JSON.stringify(responsePayload)));
                            });
                        });
                        return [4 /*yield*/, new Promise(function (resolve, reject) {
                                var _a, _b;
                                (_a = _this.server) === null || _a === void 0 ? void 0 : _a.listen(0, '127.0.0.1', function () { return resolve(); });
                                (_b = _this.server) === null || _b === void 0 ? void 0 : _b.on('error', reject);
                            })];
                    case 1:
                        _b.sent();
                        address = (_a = this.server) === null || _a === void 0 ? void 0 : _a.address();
                        if (!address || typeof address === 'string') {
                            throw new Error('Unable to determine mocked kernel WebSocket endpoint.');
                        }
                        return [2 /*return*/, "ws://127.0.0.1:".concat(address.port, "/ws")];
                }
            });
        });
    };
    MockKernelWebSocketServer.prototype.requestTypes = function () {
        return this.requestLog
            .map(function (request) { return String(request.type || ''); })
            .filter(function (type) { return type !== 'handshake' && type !== 'status'; });
    };
    MockKernelWebSocketServer.prototype.upgradePaths = function () {
        return __spreadArray([], this.paths, true);
    };
    MockKernelWebSocketServer.prototype.push = function (message) {
        var frame = encodeWebSocketTextFrame(JSON.stringify(message));
        for (var _i = 0, _a = this.sockets; _i < _a.length; _i++) {
            var socket = _a[_i];
            socket.write(frame);
        }
    };
    MockKernelWebSocketServer.prototype.closeConnections = function () {
        for (var _i = 0, _a = __spreadArray([], this.sockets, true); _i < _a.length; _i++) {
            var socket = _a[_i];
            socket.destroy();
        }
    };
    MockKernelWebSocketServer.prototype.stop = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _i, _a, socket;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        for (_i = 0, _a = this.sockets; _i < _a.length; _i++) {
                            socket = _a[_i];
                            socket.destroy();
                        }
                        this.sockets.clear();
                        if (!this.server) {
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, new Promise(function (resolve, reject) {
                                var _a;
                                (_a = _this.server) === null || _a === void 0 ? void 0 : _a.close(function (error) {
                                    if (error) {
                                        reject(error);
                                        return;
                                    }
                                    resolve();
                                });
                            })];
                    case 1:
                        _b.sent();
                        this.server = undefined;
                        return [2 /*return*/];
                }
            });
        });
    };
    MockKernelWebSocketServer.prototype.handleMessage = function (raw) {
        var payload;
        try {
            payload = JSON.parse(raw);
        }
        catch (_a) {
            return { type: 'request.parse_error', error: 'invalid json payload' };
        }
        this.requestLog.push(payload);
        var type = String(payload.type || '');
        var handler = this.handlers[type] || this.defaultHandler(type);
        if (!handler) {
            return { type: "".concat(type, ".error"), error: "no mock handler for ".concat(type), id: payload.id };
        }
        return __assign({ id: payload.id }, handler(payload));
    };
    MockKernelWebSocketServer.prototype.defaultHandler = function (type) {
        switch (type) {
            case 'handshake':
                return function () { return ({ type: 'handshake.ok', protocol: 'flow-kernel/stdio/v1', version: 'flow.workflow/v1' }); };
            case 'status':
                return function () { return ({ type: 'status.ok', status: 'ready' }); };
            default:
                return undefined;
        }
    };
    return MockKernelWebSocketServer;
}());
function webSocketAcceptKey(key) {
    return crypto
        .createHash('sha1')
        .update("".concat(key, "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"))
        .digest('base64');
}
function decodeWebSocketTextFrame(frame) {
    if (frame.length < 2) {
        return undefined;
    }
    var opcode = frame[0] & 0x0f;
    if (opcode === 0x8) {
        return undefined;
    }
    var masked = (frame[1] & 0x80) !== 0;
    var length = frame[1] & 0x7f;
    var offset = 2;
    if (length === 126) {
        length = frame.readUInt16BE(offset);
        offset += 2;
    }
    else if (length === 127) {
        var longLength = frame.readBigUInt64BE(offset);
        if (longLength > BigInt(Number.MAX_SAFE_INTEGER)) {
            throw new Error('Mock WebSocket frame is too large.');
        }
        length = Number(longLength);
        offset += 8;
    }
    var mask;
    if (masked) {
        mask = frame.subarray(offset, offset + 4);
        offset += 4;
    }
    var payload = Buffer.from(frame.subarray(offset, offset + length));
    if (mask) {
        for (var index = 0; index < payload.length; index += 1) {
            payload[index] = payload[index] ^ mask[index % 4];
        }
    }
    return payload.toString('utf8');
}
function encodeWebSocketTextFrame(message) {
    var payload = Buffer.from(message, 'utf8');
    if (payload.length < 126) {
        return Buffer.concat([Buffer.from([0x81, payload.length]), payload]);
    }
    if (payload.length <= 0xffff) {
        var header_1 = Buffer.alloc(4);
        header_1[0] = 0x81;
        header_1[1] = 126;
        header_1.writeUInt16BE(payload.length, 2);
        return Buffer.concat([header_1, payload]);
    }
    var header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(payload.length), 2);
    return Buffer.concat([header, payload]);
}
var FlakyStdioTransport = /** @class */ (function () {
    function FlakyStdioTransport() {
        this.calls = [];
        this.restartCount = 0;
        this.startRunCalls = 0;
    }
    FlakyStdioTransport.prototype.request = function (message) {
        var requestType = String(message.type || '');
        this.calls.push(requestType);
        if (requestType === 'start_run' && this.startRunCalls < 1) {
            this.startRunCalls += 1;
            return Promise.reject(new Error('mocked process loss'));
        }
        if (requestType === 'validate_workflow') {
            return Promise.resolve({ type: 'validate_workflow.ok', valid: true, workflowId: 'gate_flow' });
        }
        if (requestType === 'start_run') {
            return Promise.resolve({
                type: 'start_run.ok',
                run: {
                    id: 'kernel-run-recovered',
                    workflowId: 'gate_flow',
                    workflow: sampleWorkflow(),
                    status: 'running',
                    createdAt: '2026-05-19T12:00:00.000Z',
                    updatedAt: '2026-05-19T12:00:00.000Z'
                }
            });
        }
        if (requestType === 'list_events') {
            return Promise.resolve({
                type: 'list_events.ok',
                events: [
                    {
                        seq: 1,
                        time: '2026-05-19T12:00:00.100Z',
                        type: 'run.started',
                        runId: 'kernel-run-recovered',
                        message: 'run resumed'
                    },
                    {
                        seq: 2,
                        time: '2026-05-19T12:00:00.200Z',
                        type: 'state.entered',
                        runId: 'kernel-run-recovered',
                        stateId: 'intake',
                        message: 'resumed intake'
                    }
                ]
            });
        }
        if (requestType === 'status') {
            return Promise.resolve({ type: 'status.ok' });
        }
        return Promise.reject(new Error("Unexpected request \"".concat(requestType, "\"")));
    };
    FlakyStdioTransport.prototype.restart = function () {
        this.restartCount += 1;
        return Promise.resolve();
    };
    return FlakyStdioTransport;
}());
function waitFor(assertion_1) {
    return __awaiter(this, arguments, void 0, function (assertion, timeoutMs) {
        var start;
        if (timeoutMs === void 0) { timeoutMs = 2000; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    start = Date.now();
                    _a.label = 1;
                case 1:
                    if (!(Date.now() - start < timeoutMs)) return [3 /*break*/, 3];
                    if (assertion()) {
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 25); })];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 1];
                case 3: throw new Error('Timed out waiting for condition.');
            }
        });
    });
}
function sampleWorkflow() {
    return {
        version: 'flow.workflow/v1',
        id: 'gate_flow',
        name: 'Gate Flow',
        states: {
            intake: { type: 'input' },
            review: {
                type: 'agent',
                agent: 'reviewer',
                gates: [{ id: 'review_gate', title: 'Review Gate' }]
            },
            report: { type: 'report' }
        },
        transitions: [
            { from: 'intake', to: 'review', on: 'workload.completed' },
            { from: 'review', to: 'report', on: 'gate.approved' }
        ]
    };
}

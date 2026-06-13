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
var fs = require("fs/promises");
var os = require("os");
var path = require("path");
var file_uri_1 = require("@theia/core/lib/common/file-uri");
var flow_workload_executor_1 = require("./flow-workload-executor");
var MockLlmProviderExecutor = /** @class */ (function (_super) {
    __extends(MockLlmProviderExecutor, _super);
    function MockLlmProviderExecutor(agentMarkdown, responses) {
        var _this = _super.call(this, {
            readAgent: function () { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, ({
                            path: 'agents/reviewer.md',
                            uri: 'agents/reviewer.md',
                            relativePath: 'agents/reviewer.md',
                            content: agentMarkdown,
                            updatedAt: '2026-05-19T00:00:00.000Z'
                        })];
                });
            }); }
        }) || this;
        _this.calls = 0;
        _this.providerPayloads = [];
        _this.responses = __spreadArray([], responses, true);
        return _this;
    }
    MockLlmProviderExecutor.prototype.resolveLlmProvider = function (_context) {
        return Promise.resolve({
            command: 'mock-llm-provider',
            providerId: 'command'
        });
    };
    MockLlmProviderExecutor.prototype.invokeLlmProvider = function (_context, _providerPayload, _provider, _workloadDir) {
        return __awaiter(this, void 0, void 0, function () {
            var next;
            return __generator(this, function (_a) {
                this.calls += 1;
                this.providerPayloads.push(_providerPayload);
                next = this.responses.shift();
                if (!next) {
                    throw new Error('No mocked LLM response configured for this attempt.');
                }
                if (next instanceof Error) {
                    throw next;
                }
                return [2 /*return*/, next];
            });
        });
    };
    return MockLlmProviderExecutor;
}(flow_workload_executor_1.ProviderBackedFlowWorkloadExecutor));
var MemoryWriteExecutor = /** @class */ (function (_super) {
    __extends(MemoryWriteExecutor, _super);
    function MemoryWriteExecutor(memoryAdapter) {
        return _super.call(this, undefined, undefined, undefined, undefined, undefined, undefined, undefined, memoryAdapter) || this;
    }
    return MemoryWriteExecutor;
}(flow_workload_executor_1.ProviderBackedFlowWorkloadExecutor));
function createExecutionContext(workspaceRootUri, statePatch) {
    var _a, _b;
    if (statePatch === void 0) { statePatch = {}; }
    var state = __assign({ id: 'agent', type: 'agent', agent: 'reviewer', outputs: ['report.md'] }, statePatch);
    var workflow = {
        version: 'flow.workflow/v1',
        id: 'workload_executor_test',
        name: 'Workload executor test',
        agents: {
            reviewer: 'agents/reviewer.md'
        },
        states: (_a = {},
            _a[state.id || 'agent'] = state,
            _a),
        transitions: []
    };
    var run = {
        id: 'run-1',
        workflowId: workflow.id,
        prompt: 'run this task',
        status: 'running',
        createdAt: '2026-05-19T00:00:00.000Z',
        updatedAt: '2026-05-19T00:00:00.000Z',
        currentStateIds: [state.id || 'agent'],
        stateStatuses: (_b = {}, _b[state.id || 'agent'] = 'running', _b),
        workloads: [],
        events: [],
        artifacts: [],
        effects: [],
        signals: [],
        gates: [],
        memoryCandidates: [],
        contextPack: {
            summary: 'Execution context pack.',
            workflow: {
                id: workflow.id,
                name: workflow.name,
                stateCount: 1,
                transitionCount: 0,
                agentIds: ['reviewer']
            },
            files: [],
            symbols: [],
            signals: []
        },
        tick: 1
    };
    var workload = {
        id: 'workload-1',
        runId: run.id,
        stateId: state.id || 'agent',
        agent: 'reviewer',
        status: 'running',
        inputArtifacts: [],
        outputArtifacts: [],
        issues: [],
        effectIds: [],
        createdAt: '2026-05-19T00:00:00.000Z',
        updatedAt: '2026-05-19T00:00:00.000Z'
    };
    run.workloads.push(workload);
    return {
        workflow: workflow,
        run: run,
        state: state,
        workload: workload,
        workspaceRootUri: workspaceRootUri
    };
}
function toJsonFailureMessage(raw) {
    if (raw === void 0) { raw = 'invalid json'; }
    return raw;
}
function validMockProviderResult(patch) {
    if (patch === void 0) { patch = {}; }
    return JSON.stringify(__assign({ result: {
            status: 'completed',
            summary: 'Mocked execution completed.',
            artifacts: [
                {
                    path: 'report.md',
                    content: '# Report\n\nEverything is green.'
                }
            ],
            signals: {
                'agent.signal': true
            },
            issues: [
                {
                    severity: 'non_blocking',
                    type: 'workload_issue',
                    summary: 'Minor issue found during execution.'
                }
            ]
        }, report: 'Execution finished.', effects: [
            {
                type: 'file_write',
                path: 'notes.md',
                summary: 'Updated generated notes.'
            }
        ], memoryCandidates: [
            'Persist this architecture decision in long-term memory.'
        ] }, patch));
}
function validArtifactProviderResult(artifactPath, content, signals) {
    if (signals === void 0) { signals = {}; }
    return validMockProviderResult({
        result: {
            status: 'completed',
            summary: "Generated ".concat(artifactPath, "."),
            artifacts: [{ path: artifactPath, content: content }],
            signals: signals,
            issues: []
        },
        report: content,
        effects: [],
        memoryCandidates: []
    });
}
function validContractPackage() {
    return {
        packageId: 'contracts-run-1',
        schemaVersion: 'flow.contracts/v1',
        sharedMd: {
            path: 'contracts/shared.md',
            deliveryObjective: 'Deliver the requested feature safely.',
            approvedScope: ['backend endpoint', 'frontend screen', 'design asset'],
            outOfScope: ['billing migration'],
            decisions: ['Use contract-first parallel delivery.'],
            canonicalNames: ['FeatureRequest'],
            knownRisks: [{
                    id: 'risk-1',
                    severity: 'medium',
                    description: 'Parallel branches may drift.',
                    impact: 'QA may find integration mismatch.',
                    mitigation: 'Validate against shared contract.'
                }],
            changeRules: {
                approvalPolicy: 'human_gate_for_scope_or_contract_schema',
                requiresHumanGateForContractMutation: true,
                outOfScopeAction: 'second_run_required',
                maxRevisionAttempts: 2
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
                id: 'risk-1',
                severity: 'medium',
                description: 'Parallel branches may drift.',
                impact: 'QA may find integration mismatch.',
                mitigation: 'Validate against shared contract.'
            }],
        changeRules: {
            approvalPolicy: 'human_gate_for_scope_or_contract_schema',
            requiresHumanGateForContractMutation: true,
            outOfScopeAction: 'second_run_required',
            maxRevisionAttempts: 2
        }
    };
}
function addRunArtifact(context_1, workspaceRootDir_1, artifactPath_1, content_1) {
    return __awaiter(this, arguments, void 0, function (context, workspaceRootDir, artifactPath, content, stateId) {
        var filePath;
        if (stateId === void 0) { stateId = 'delivery'; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    filePath = path.join.apply(path, __spreadArray([workspaceRootDir, 'seed-artifacts'], artifactPath.split('/'), false));
                    return [4 /*yield*/, fs.mkdir(path.dirname(filePath), { recursive: true })];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, fs.writeFile(filePath, content, 'utf8')];
                case 2:
                    _a.sent();
                    context.run.artifacts.push({
                        id: "artifact-".concat(artifactPath.replace(/[^a-zA-Z0-9]/g, '-')),
                        runId: context.run.id,
                        stateId: stateId,
                        uri: file_uri_1.FileUri.create(filePath).toString(),
                        kind: artifactPath.includes('contract') ? 'contract' : 'report',
                        summary: artifactPath,
                        createdAt: '2026-05-19T00:00:00.000Z'
                    });
                    return [2 /*return*/];
            }
        });
    });
}
describe('ProviderBackedFlowWorkloadExecutor with mocked LLM provider', function () {
    var workspaceRootDir;
    var workspaceRootUri;
    var agentMarkdown = [
        '# Reviewer',
        '',
        '## Role',
        'You are a mockable reviewer.',
        '',
        '## Quality Criteria',
        '1. Preserve compatibility.',
        '',
        '## Output Format',
        'Return JSON in the schema expected by the executor.'
    ].join('\n');
    beforeEach(function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fs.mkdtemp(path.join(os.tmpdir(), 'flow-workload-executor-'))];
                case 1:
                    workspaceRootDir = _a.sent();
                    workspaceRootUri = file_uri_1.FileUri.create(workspaceRootDir).toString();
                    return [2 /*return*/];
            }
        });
    }); });
    afterEach(function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fs.rm(workspaceRootDir, { recursive: true, force: true })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('runs Fast Virtual Reasoning as draft, critique, and revise only', function () { return __awaiter(void 0, void 0, void 0, function () {
        var stages, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    stages = [];
                    return [4 /*yield*/, (0, flow_workload_executor_1.runVirtualReasoningHarness)({
                            mode: 'fast',
                            basePayload: { request: 'solve' },
                            invoke: function (payload) { return __awaiter(void 0, void 0, void 0, function () {
                                var stage;
                                return __generator(this, function (_a) {
                                    stage = payload.virtualReasoning.stage;
                                    stages.push(stage);
                                    return [2 /*return*/, "result:".concat(stage)];
                                });
                            }); }
                        })];
                case 1:
                    result = _a.sent();
                    (0, chai_1.expect)(stages).to.deep.equal(['draft', 'critique', 'revise']);
                    (0, chai_1.expect)(result).to.equal('result:revise');
                    return [2 /*return*/];
            }
        });
    }); });
    it('runs Balanced Virtual Reasoning within the six-call MVP budget', function () { return __awaiter(void 0, void 0, void 0, function () {
        var stages, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    stages = [];
                    return [4 /*yield*/, (0, flow_workload_executor_1.runVirtualReasoningHarness)({
                            mode: 'balanced',
                            basePayload: { request: 'solve' },
                            invoke: function (payload) { return __awaiter(void 0, void 0, void 0, function () {
                                var stage;
                                return __generator(this, function (_a) {
                                    stage = payload.virtualReasoning.stage;
                                    stages.push(stage);
                                    return [2 /*return*/, "result:".concat(stage)];
                                });
                            }); }
                        })];
                case 1:
                    result = _a.sent();
                    (0, chai_1.expect)(stages).to.deep.equal(['classify', 'plan', 'draft', 'critique', 'revise', 'verify']);
                    (0, chai_1.expect)(result).to.equal('result:revise');
                    return [2 /*return*/];
            }
        });
    }); });
    it('falls back to the best available Virtual Reasoning draft on later-stage failure', function () { return __awaiter(void 0, void 0, void 0, function () {
        var stages, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    stages = [];
                    return [4 /*yield*/, (0, flow_workload_executor_1.runVirtualReasoningHarness)({
                            mode: 'balanced',
                            basePayload: { request: 'solve' },
                            invoke: function (payload) { return __awaiter(void 0, void 0, void 0, function () {
                                var stage;
                                return __generator(this, function (_a) {
                                    stage = payload.virtualReasoning.stage;
                                    stages.push(stage);
                                    if (stage === 'critique') {
                                        throw new Error('critic failed');
                                    }
                                    return [2 /*return*/, "result:".concat(stage)];
                                });
                            }); }
                        })];
                case 1:
                    result = _a.sent();
                    (0, chai_1.expect)(stages).to.deep.equal(['classify', 'plan', 'draft', 'critique']);
                    (0, chai_1.expect)(result).to.equal('result:draft');
                    return [2 /*return*/];
            }
        });
    }); });
    it('executa agente com sucesso e registra issues, signals e memory candidates', function () { return __awaiter(void 0, void 0, void 0, function () {
        var context, executor, result, artifact, _a, resultJsonPath, resultJson, _b, _c;
        var _d, _e, _f, _g, _h;
        return __generator(this, function (_j) {
            switch (_j.label) {
                case 0:
                    context = createExecutionContext(workspaceRootUri);
                    executor = new MockLlmProviderExecutor(agentMarkdown, [validMockProviderResult()]);
                    return [4 /*yield*/, executor.executeAgentWorkload(context)];
                case 1:
                    result = _j.sent();
                    (0, chai_1.expect)(result.artifactUri).to.contain('report.md');
                    (0, chai_1.expect)(context.run.workloads[0].status).to.equal('done');
                    (0, chai_1.expect)(context.run.workloads[0].outputEnvelope).to.not.be.undefined;
                    (0, chai_1.expect)((_e = (_d = context.run.workloads[0].outputEnvelope) === null || _d === void 0 ? void 0 : _d.result) === null || _e === void 0 ? void 0 : _e.status).to.equal('completed');
                    (0, chai_1.expect)(context.run.workloads[0].issues).to.deep.equal(['Minor issue found during execution.']);
                    (0, chai_1.expect)(context.run.signals.some(function (signal) { return signal.key === 'agent.issue' && signal.value === 'Minor issue found during execution.'; })).to.equal(true);
                    (0, chai_1.expect)(context.run.signals.some(function (signal) { return signal.key === 'agent.signal' && signal.value === true; })).to.equal(true);
                    (0, chai_1.expect)(context.run.signals.some(function (signal) { return signal.key === 'agent.status' && signal.value === 'completed'; })).to.equal(true);
                    (0, chai_1.expect)(context.run.effects.some(function (effect) { return effect.kind === 'file_write' && effect.summary === 'Updated generated notes.'; })).to.equal(true);
                    (0, chai_1.expect)((_f = context.run.workloads[0].outputEnvelope) === null || _f === void 0 ? void 0 : _f.effects[0]).to.deep.include({
                        type: 'file_write',
                        path: 'notes.md',
                        status: 'proposed'
                    });
                    (0, chai_1.expect)((_g = context.run.memoryCandidates) === null || _g === void 0 ? void 0 : _g.map(function (candidate) { return candidate.content; }))
                        .to.deep.equal(['Persist this architecture decision in long-term memory.']);
                    (0, chai_1.expect)((_h = context.run.memoryCandidates) === null || _h === void 0 ? void 0 : _h.every(function (candidate) { return candidate.status === 'candidate'; })).to.equal(true);
                    artifact = context.run.artifacts.find(function (item) { var _a; return (_a = item.summary) === null || _a === void 0 ? void 0 : _a.includes('report.md'); });
                    (0, chai_1.expect)(artifact === null || artifact === void 0 ? void 0 : artifact.kind).to.equal('report');
                    (0, chai_1.expect)(context.run.workloads[0].outputArtifacts).to.include(artifact === null || artifact === void 0 ? void 0 : artifact.uri);
                    (0, chai_1.expect)(context.run.events.some(function (event) { return event.type === 'artifact.created' && event.workloadId === context.run.workloads[0].id; })).to.equal(true);
                    _a = chai_1.expect;
                    return [4 /*yield*/, fs.readFile(path.join(workspaceRootDir, '.theia', 'flow', 'runs', context.run.id, 'workloads', context.run.workloads[0].id, 'output', 'artifacts', 'report.md'), 'utf8')];
                case 2:
                    _a.apply(void 0, [_j.sent()])
                        .to.equal('# Report\n\nEverything is green.\n');
                    (0, chai_1.expect)(context.run.events.some(function (event) { return event.type === 'workload.completed'; })).to.equal(true);
                    (0, chai_1.expect)(context.run.events.some(function (event) { return event.type === 'effect.proposed'; })).to.equal(true);
                    (0, chai_1.expect)(context.run.events.filter(function (event) { return event.type === 'workload.retry'; })).to.have.length(0);
                    resultJsonPath = path.join(workspaceRootDir, '.theia', 'flow', 'runs', context.run.id, 'workloads', context.run.workloads[0].id, 'output', 'result.json');
                    _c = (_b = JSON).parse;
                    return [4 /*yield*/, fs.readFile(resultJsonPath, 'utf8')];
                case 3:
                    resultJson = _c.apply(_b, [_j.sent()]);
                    (0, chai_1.expect)(resultJson.result.status).to.equal('completed');
                    (0, chai_1.expect)(resultJson.artifacts[0]).to.deep.include({ path: 'report.md', type: 'report' });
                    (0, chai_1.expect)(context.run.workloads[0].outputArtifacts.some(function (uri) { return uri.endsWith('/output/result.json'); })).to.equal(true);
                    return [2 /*return*/];
            }
        });
    }); });
    it('executa dynamic_parallel como subworkloads agregados', function () { return __awaiter(void 0, void 0, void 0, function () {
        var context, executor, aggregatePath, aggregate, _a, _b;
        var _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    context = createExecutionContext(workspaceRootUri, {
                        id: 'fanout',
                        type: 'dynamic_parallel',
                        outputs: ['dynamic-parallel/fanout/results.json'],
                        dynamicParallel: {
                            itemsFrom: 'items.json',
                            maxItems: 2,
                            concurrency: 2,
                            failurePolicy: 'best_effort',
                            worker: {
                                type: 'agent',
                                agent: 'reviewer',
                                outputs: ['report.md']
                            }
                        }
                    });
                    return [4 /*yield*/, addRunArtifact(context, workspaceRootDir, 'items.json', JSON.stringify(['alpha', 'beta']), 'input')];
                case 1:
                    _d.sent();
                    executor = new MockLlmProviderExecutor(agentMarkdown, [
                        validArtifactProviderResult('report.md', '# Alpha\n\nDone.', { 'worker.status': 'done' }),
                        validArtifactProviderResult('report.md', '# Beta\n\nDone.', { 'worker.status': 'done' })
                    ]);
                    return [4 /*yield*/, executor.execute(context)];
                case 2:
                    _d.sent();
                    (0, chai_1.expect)(executor.calls).to.equal(2);
                    (0, chai_1.expect)(context.workload.status).to.equal('done');
                    (0, chai_1.expect)(context.run.workloads.filter(function (workload) { return workload.branchId === 'fanout'; })).to.have.length(2);
                    (0, chai_1.expect)(context.run.signals.some(function (signal) { return signal.key === 'fanout.dynamic_parallel.item_count' && signal.value === 2; })).to.equal(true);
                    (0, chai_1.expect)((_c = context.workload.outputEnvelope) === null || _c === void 0 ? void 0 : _c.result.status).to.equal('completed');
                    aggregatePath = path.join(workspaceRootDir, '.theia', 'flow', 'runs', context.run.id, 'workloads', context.workload.id, 'output', 'artifacts', 'dynamic-parallel', 'fanout', 'results.json');
                    _b = (_a = JSON).parse;
                    return [4 /*yield*/, fs.readFile(aggregatePath, 'utf8')];
                case 3:
                    aggregate = _b.apply(_a, [_d.sent()]);
                    (0, chai_1.expect)(aggregate.itemCount).to.equal(2);
                    (0, chai_1.expect)(aggregate.successCount).to.equal(2);
                    return [2 /*return*/];
            }
        });
    }); });
    it('executa tournament com juiz configurado', function () { return __awaiter(void 0, void 0, void 0, function () {
        var context, executor, aggregatePath, aggregate, _a, _b;
        var _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    context = createExecutionContext(workspaceRootUri, {
                        id: 'contest',
                        type: 'tournament',
                        outputs: ['tournament/contest/result.json'],
                        tournament: {
                            candidatesFrom: 'candidates.json',
                            winnerCount: 1,
                            criteria: ['correctness', 'clarity'],
                            judge: {
                                type: 'agent',
                                agent: 'reviewer',
                                outputs: ['ranking.json']
                            }
                        }
                    });
                    return [4 /*yield*/, addRunArtifact(context, workspaceRootDir, 'candidates.json', JSON.stringify([{ id: 'a' }, { id: 'b' }]), 'input')];
                case 1:
                    _d.sent();
                    executor = new MockLlmProviderExecutor(agentMarkdown, [
                        validArtifactProviderResult('ranking.json', '{ "winner": "a" }', { 'tournament.status': 'decided' })
                    ]);
                    return [4 /*yield*/, executor.execute(context)];
                case 2:
                    _d.sent();
                    (0, chai_1.expect)(executor.calls).to.equal(1);
                    (0, chai_1.expect)(context.workload.status).to.equal('done');
                    (0, chai_1.expect)(context.run.workloads.some(function (workload) { return workload.stateId === 'contest.judge'; })).to.equal(true);
                    (0, chai_1.expect)(context.run.signals.some(function (signal) { return signal.key === 'contest.tournament.item_count' && signal.value === 2; })).to.equal(true);
                    (0, chai_1.expect)((_c = context.workload.outputEnvelope) === null || _c === void 0 ? void 0 : _c.result.status).to.equal('completed');
                    aggregatePath = path.join(workspaceRootDir, '.theia', 'flow', 'runs', context.run.id, 'workloads', context.workload.id, 'output', 'artifacts', 'tournament', 'contest', 'result.json');
                    _b = (_a = JSON).parse;
                    return [4 /*yield*/, fs.readFile(aggregatePath, 'utf8')];
                case 3:
                    aggregate = _b.apply(_a, [_d.sent()]);
                    (0, chai_1.expect)(aggregate.candidateCount).to.equal(2);
                    (0, chai_1.expect)(aggregate.strategy).to.equal('single_round');
                    return [2 /*return*/];
            }
        });
    }); });
    it('falha agent workload quando provider nao esta configurado', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, withCleanAgentProviderEnv(function () { return __awaiter(void 0, void 0, void 0, function () {
                        var context, executor;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    context = createExecutionContext(workspaceRootUri);
                                    executor = new flow_workload_executor_1.ProviderBackedFlowWorkloadExecutor();
                                    return [4 /*yield*/, executor.executeAgentWorkload(context)];
                                case 1:
                                    _a.sent();
                                    (0, chai_1.expect)(context.run.workloads[0].status).to.equal('failed');
                                    (0, chai_1.expect)(context.run.stateStatuses.agent).to.equal('failed');
                                    (0, chai_1.expect)(context.run.events.some(function (event) { return event.type === 'workload.failed'; })).to.equal(true);
                                    (0, chai_1.expect)(context.run.effects.some(function (effect) { return effect.summary.includes('provider is missing'); })).to.equal(true);
                                    (0, chai_1.expect)(context.run.effects.some(function (effect) { return effect.summary.includes('Deterministic production fallback is disabled'); })).to.equal(true);
                                    return [2 /*return*/];
                            }
                        });
                    }); })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('falha agent workload com provider sem suporte e hint de comando customizado', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, withCleanAgentProviderEnv(function () { return __awaiter(void 0, void 0, void 0, function () {
                        var context, executor;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    context = createExecutionContext(workspaceRootUri, {
                                        provider: {
                                            providerId: 'openrouter'
                                        }
                                    });
                                    executor = new flow_workload_executor_1.ProviderBackedFlowWorkloadExecutor();
                                    return [4 /*yield*/, executor.executeAgentWorkload(context)];
                                case 1:
                                    _a.sent();
                                    (0, chai_1.expect)(context.run.workloads[0].status).to.equal('failed');
                                    (0, chai_1.expect)(context.run.effects.some(function (effect) { return effect.summary.includes('"openrouter"'); })).to.equal(true);
                                    (0, chai_1.expect)(context.run.effects.some(function (effect) { return effect.summary.includes('FLOW_AGENT_PROVIDER_OPENROUTER_COMMAND'); })).to.equal(true);
                                    return [2 /*return*/];
                            }
                        });
                    }); })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('falha context workload sem request externo de provedor de contexto', function () { return __awaiter(void 0, void 0, void 0, function () {
        var context, executor;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    context = createExecutionContext(workspaceRootUri, {
                        id: 'context_pack',
                        type: 'context'
                    });
                    executor = new flow_workload_executor_1.ProviderBackedFlowWorkloadExecutor();
                    return [4 /*yield*/, executor.executeContextWorkload(context)];
                case 1:
                    _a.sent();
                    (0, chai_1.expect)(context.run.workloads[0].status).to.equal('failed');
                    (0, chai_1.expect)(context.run.stateStatuses.context_pack).to.equal('failed');
                    (0, chai_1.expect)(context.run.events.some(function (event) { return event.type === 'workload.failed'; })).to.equal(true);
                    (0, chai_1.expect)(context.run.effects.some(function (effect) { return effect.summary.includes('cannot execute without an external context provider request'); })).to.equal(true);
                    return [2 /*return*/];
            }
        });
    }); });
    it('falha command workload sem comando configurado', function () { return __awaiter(void 0, void 0, void 0, function () {
        var context, executor;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    context = createExecutionContext(workspaceRootUri, {
                        id: 'command_step',
                        type: 'command'
                    });
                    executor = new flow_workload_executor_1.ProviderBackedFlowWorkloadExecutor();
                    return [4 /*yield*/, executor.executeCommandWorkload(context)];
                case 1:
                    _a.sent();
                    (0, chai_1.expect)(context.run.workloads[0].status).to.equal('failed');
                    (0, chai_1.expect)(context.run.stateStatuses.command_step).to.equal('failed');
                    (0, chai_1.expect)(context.run.events.some(function (event) { return event.type === 'workload.failed'; })).to.equal(true);
                    (0, chai_1.expect)(context.run.effects.some(function (effect) { return effect.summary.includes('has no command configured'); })).to.equal(true);
                    return [2 /*return*/];
            }
        });
    }); });
    it('falha tipos de workload sem suporte em vez de fallback deterministico', function () { return __awaiter(void 0, void 0, void 0, function () {
        var context, executor;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    context = createExecutionContext(workspaceRootUri, {
                        id: 'unsupported_step'
                    });
                    Object.assign(context.state, { type: 'unsupported_workload' });
                    executor = new flow_workload_executor_1.ProviderBackedFlowWorkloadExecutor();
                    return [4 /*yield*/, executor.execute(context)];
                case 1:
                    _a.sent();
                    (0, chai_1.expect)(context.run.workloads[0].status).to.equal('failed');
                    (0, chai_1.expect)(context.run.stateStatuses.unsupported_step).to.equal('failed');
                    (0, chai_1.expect)(context.run.events.some(function (event) { return event.type === 'workload.failed'; })).to.equal(true);
                    (0, chai_1.expect)(context.run.effects.some(function (effect) { return effect.summary.includes('Unsupported Flow workload type'); })).to.equal(true);
                    (0, chai_1.expect)(context.run.effects.some(function (effect) { return effect.summary.includes('Deterministic fallback'); })).to.equal(false);
                    return [2 /*return*/];
            }
        });
    }); });
    it('envia prompts e deliverables configurados ao provider e ao work order', function () { return __awaiter(void 0, void 0, void 0, function () {
        var context, executor, payload, instructions, expectedOutput, deliverables, contextPayload, inputArtifacts, workOrder;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    context = createExecutionContext(workspaceRootUri, {
                        systemPrompt: 'Act as the implementation coordinator.',
                        taskPrompt: 'Produce the implementation evidence.',
                        outputs: ['work/summary.md'],
                        deliverables: [
                            { path: 'work/summary.md', description: 'Implementation summary', required: true, kind: 'markdown' },
                            { path: 'work/evidence.md', description: 'Verification evidence', required: true, kind: 'markdown' }
                        ]
                    });
                    context.workload.inputArtifacts = ['request.md'];
                    return [4 /*yield*/, addRunArtifact(context, workspaceRootDir, 'request.md', '# Request\n\nImplement the feature.')];
                case 1:
                    _a.sent();
                    executor = new MockLlmProviderExecutor(agentMarkdown, [validMockProviderResult({
                            result: {
                                status: 'completed',
                                summary: 'Configured execution completed.',
                                artifacts: [
                                    { path: 'work/summary.md', content: '# Summary' },
                                    { path: 'work/evidence.md', content: '# Evidence' }
                                ],
                                signals: {},
                                issues: []
                            }
                        })]);
                    return [4 /*yield*/, executor.executeAgentWorkload(context)];
                case 2:
                    _a.sent();
                    payload = executor.providerPayloads[0];
                    instructions = payload.instructions;
                    expectedOutput = payload.expectedOutput;
                    deliverables = expectedOutput.deliverables;
                    contextPayload = payload.context;
                    inputArtifacts = contextPayload.inputArtifacts;
                    (0, chai_1.expect)(instructions.systemPrompt).to.equal('Act as the implementation coordinator.');
                    (0, chai_1.expect)(instructions.taskPrompt).to.equal('Produce the implementation evidence.');
                    (0, chai_1.expect)(expectedOutput.allowedPaths).to.deep.equal(['work/summary.md', 'work/evidence.md']);
                    (0, chai_1.expect)(deliverables).to.deep.include({
                        path: 'work/evidence.md',
                        description: 'Verification evidence',
                        required: true,
                        kind: 'markdown'
                    });
                    (0, chai_1.expect)(inputArtifacts).to.deep.equal([
                        {
                            path: 'request.md',
                            content: '# Request\n\nImplement the feature.'
                        }
                    ]);
                    return [4 /*yield*/, fs.readFile(path.join(workspaceRootDir, '.theia', 'flow', 'runs', context.run.id, 'workloads', context.workload.id, 'input', 'work-order.md'), 'utf8')];
                case 3:
                    workOrder = _a.sent();
                    (0, chai_1.expect)(workOrder).to.contain('## System Prompt');
                    (0, chai_1.expect)(workOrder).to.contain('Act as the implementation coordinator.');
                    (0, chai_1.expect)(workOrder).to.contain('## Task Prompt');
                    (0, chai_1.expect)(workOrder).to.contain('Produce the implementation evidence.');
                    (0, chai_1.expect)(workOrder).to.contain('- work/evidence.md (required; kind: markdown; Verification evidence)');
                    return [2 /*return*/];
            }
        });
    }); });
    it('falha antes de invocar provider quando input artifact requerido nao existe', function () { return __awaiter(void 0, void 0, void 0, function () {
        var context, executor;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    context = createExecutionContext(workspaceRootUri);
                    context.workload.inputArtifacts = ['missing/request.md'];
                    executor = new MockLlmProviderExecutor(agentMarkdown, [validMockProviderResult()]);
                    return [4 /*yield*/, executor.executeAgentWorkload(context)];
                case 1:
                    _a.sent();
                    (0, chai_1.expect)(executor.calls).to.equal(0);
                    (0, chai_1.expect)(executor.providerPayloads).to.have.length(0);
                    (0, chai_1.expect)(context.run.workloads[0].status).to.equal('failed');
                    (0, chai_1.expect)(context.run.events.some(function (event) { return event.type === 'workload.failed'; })).to.equal(true);
                    (0, chai_1.expect)(context.run.effects.some(function (effect) { return effect.summary.includes('Required input artifact "missing/request.md" could not be resolved'); })).to.equal(true);
                    return [2 /*return*/];
            }
        });
    }); });
    it('descreve artifacts gerados com path e content no formato default do provider', function () { return __awaiter(void 0, void 0, void 0, function () {
        var context, defaultFormatAgentMarkdown, executor, payload, expectedOutput, outputFormat;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    context = createExecutionContext(workspaceRootUri);
                    defaultFormatAgentMarkdown = [
                        '# Reviewer',
                        '',
                        '## Role',
                        'You are a mockable reviewer.',
                        '',
                        '## Quality Criteria',
                        '1. Preserve compatibility.'
                    ].join('\\n');
                    executor = new MockLlmProviderExecutor(defaultFormatAgentMarkdown, [validMockProviderResult()]);
                    return [4 /*yield*/, executor.executeAgentWorkload(context)];
                case 1:
                    _a.sent();
                    payload = executor.providerPayloads[0];
                    expectedOutput = payload.expectedOutput;
                    outputFormat = String(expectedOutput.format);
                    (0, chai_1.expect)(outputFormat).to.contain('"artifacts": [ { "path": "string", "content": "string" } ]');
                    (0, chai_1.expect)(outputFormat).to.not.contain('backward compatibility');
                    (0, chai_1.expect)(outputFormat).to.not.contain('"path": "string", "type"');
                    return [2 /*return*/];
            }
        });
    }); });
    it('rebaixa memory candidates importados como written para candidate review', function () { return __awaiter(void 0, void 0, void 0, function () {
        var context, providerResult, executor;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    context = createExecutionContext(workspaceRootUri);
                    providerResult = validMockProviderResult({
                        memoryCandidates: [{
                                id: 'imported-written-candidate',
                                runId: 'external-run',
                                stateId: 'external-state',
                                source: 'artifact',
                                kind: 'fact',
                                content: 'Imported artifacts must be reviewed before memory write.',
                                reason: 'Imported from workload output.',
                                confidence: 0.9,
                                status: 'written',
                                createdAt: '2026-05-19T00:00:00.000Z'
                            }]
                    });
                    executor = new MockLlmProviderExecutor(agentMarkdown, [providerResult]);
                    return [4 /*yield*/, executor.executeAgentWorkload(context)];
                case 1:
                    _b.sent();
                    (0, chai_1.expect)(context.run.memoryCandidates).to.have.length(1);
                    (0, chai_1.expect)((_a = context.run.memoryCandidates) === null || _a === void 0 ? void 0 : _a[0]).to.deep.include({
                        id: 'imported-written-candidate',
                        runId: context.run.id,
                        stateId: 'external-state',
                        source: 'artifact',
                        status: 'candidate'
                    });
                    (0, chai_1.expect)(context.run.memoryWrites).to.equal(undefined);
                    return [2 /*return*/];
            }
        });
    }); });
    it('isola diretorio de workload mesmo com run id malicioso', function () { return __awaiter(void 0, void 0, void 0, function () {
        var context, executor, isolatedReport, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    context = createExecutionContext(workspaceRootUri);
                    context.run.id = '../other-run';
                    context.workload.runId = context.run.id;
                    executor = new MockLlmProviderExecutor(agentMarkdown, [validMockProviderResult()]);
                    return [4 /*yield*/, executor.executeAgentWorkload(context)];
                case 1:
                    _b.sent();
                    isolatedReport = path.join(workspaceRootDir, '.theia', 'flow', 'runs', '.._other-run', 'workloads', context.workload.id, 'output', 'artifacts', 'report.md');
                    _a = chai_1.expect;
                    return [4 /*yield*/, fs.readFile(isolatedReport, 'utf8')];
                case 2:
                    _a.apply(void 0, [_b.sent()]).to.equal('# Report\n\nEverything is green.\n');
                    return [4 /*yield*/, expectRejected(fs.access(path.join(workspaceRootDir, '.theia', 'flow', 'other-run', 'workloads', context.workload.id, 'output', 'artifacts', 'report.md')))];
                case 3:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('gera pacote contratual validado para contract_designer com work orders e schemas', function () { return __awaiter(void 0, void 0, void 0, function () {
        var context, contracts, executor, outputRoot, _a, _b, _c, _d, backendWorkOrder, frontendWorkOrder, designerWorkOrder, qaWorkOrder, _e, _f, _g;
        return __generator(this, function (_h) {
            switch (_h.label) {
                case 0:
                    context = createExecutionContext(workspaceRootUri, {
                        id: 'contract_design',
                        agent: 'contract_designer',
                        outputs: [
                            'contracts/shared.md',
                            'contracts/contracts.json',
                            'contracts/work-orders/backend.md',
                            'contracts/work-orders/frontend.md',
                            'contracts/work-orders/designer.md',
                            'contracts/work-orders/qa.md',
                            'schemas/api.json',
                            'schemas/assets.json'
                        ]
                    });
                    context.workload.stateId = 'contract_design';
                    context.workload.agent = 'contract_designer';
                    context.run.stateStatuses = { contract_design: 'running' };
                    context.workflow.agents = { contract_designer: 'agents/contract-designer.md' };
                    context.workflow.states = { contract_design: context.state };
                    contracts = {
                        packageId: 'contracts-run-1',
                        schemaVersion: 'flow.contracts/v1',
                        sharedMd: {
                            path: 'contracts/shared.md',
                            deliveryObjective: 'Deliver the requested feature safely.',
                            approvedScope: ['backend endpoint', 'frontend screen', 'design asset'],
                            outOfScope: ['billing migration'],
                            decisions: ['Use contract-first parallel delivery.'],
                            canonicalNames: ['FeatureRequest'],
                            knownRisks: [{
                                    id: 'risk-1',
                                    severity: 'medium',
                                    description: 'Parallel branches may drift.',
                                    impact: 'QA may find integration mismatch.',
                                    mitigation: 'Validate against shared contract.'
                                }],
                            changeRules: {
                                approvalPolicy: 'human_gate_for_scope_or_contract_schema',
                                requiresHumanGateForContractMutation: true,
                                outOfScopeAction: 'second_run_required',
                                maxRevisionAttempts: 2
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
                                id: 'risk-1',
                                severity: 'medium',
                                description: 'Parallel branches may drift.',
                                impact: 'QA may find integration mismatch.',
                                mitigation: 'Validate against shared contract.'
                            }],
                        changeRules: {
                            approvalPolicy: 'human_gate_for_scope_or_contract_schema',
                            requiresHumanGateForContractMutation: true,
                            outOfScopeAction: 'second_run_required',
                            maxRevisionAttempts: 2
                        }
                    };
                    executor = new MockLlmProviderExecutor(agentMarkdown, [JSON.stringify({
                            result: {
                                status: 'completed',
                                summary: 'Contract package generated.',
                                artifacts: [{ path: 'contracts/contracts.json', content: JSON.stringify(contracts) }],
                                signals: {},
                                issues: []
                            }
                        })]);
                    return [4 /*yield*/, executor.executeAgentWorkload(context)];
                case 1:
                    _h.sent();
                    outputRoot = path.join(workspaceRootDir, '.theia', 'flow', 'runs', context.run.id, 'workloads', context.workload.id, 'output', 'artifacts');
                    _a = chai_1.expect;
                    _c = (_b = JSON).parse;
                    return [4 /*yield*/, fs.readFile(path.join(outputRoot, 'contracts', 'contracts.json'), 'utf8')];
                case 2:
                    _a.apply(void 0, [_c.apply(_b, [_h.sent()]).schemaVersion]).to.equal('flow.contracts/v1');
                    _d = chai_1.expect;
                    return [4 /*yield*/, fs.readFile(path.join(outputRoot, 'contracts', 'shared.md'), 'utf8')];
                case 3:
                    _d.apply(void 0, [_h.sent()]).to.contain('Shared Contract');
                    return [4 /*yield*/, fs.readFile(path.join(outputRoot, 'contracts', 'work-orders', 'backend.md'), 'utf8')];
                case 4:
                    backendWorkOrder = _h.sent();
                    return [4 /*yield*/, fs.readFile(path.join(outputRoot, 'contracts', 'work-orders', 'frontend.md'), 'utf8')];
                case 5:
                    frontendWorkOrder = _h.sent();
                    return [4 /*yield*/, fs.readFile(path.join(outputRoot, 'contracts', 'work-orders', 'designer.md'), 'utf8')];
                case 6:
                    designerWorkOrder = _h.sent();
                    return [4 /*yield*/, fs.readFile(path.join(outputRoot, 'contracts', 'work-orders', 'qa.md'), 'utf8')];
                case 7:
                    qaWorkOrder = _h.sent();
                    (0, chai_1.expect)(backendWorkOrder).to.contain('Role: backend');
                    (0, chai_1.expect)(backendWorkOrder).to.contain('API feature_read: GET /feature');
                    (0, chai_1.expect)(frontendWorkOrder).to.contain('Asset feature_icon: public/assets/feature-icon.png');
                    (0, chai_1.expect)(designerWorkOrder).to.contain('Preserve required dimensions, formats, usage, and naming.');
                    (0, chai_1.expect)(qaWorkOrder).to.contain('Validate backend, frontend, and design outputs against contracts/contracts.json.');
                    (0, chai_1.expect)(qaWorkOrder).to.contain('Schema api: schemas/api.json v1.0.0');
                    _e = chai_1.expect;
                    _g = (_f = JSON).parse;
                    return [4 /*yield*/, fs.readFile(path.join(outputRoot, 'schemas', 'api.json'), 'utf8')];
                case 8:
                    _e.apply(void 0, [_g.apply(_f, [_h.sent()]).title]).to.equal('Flow API Contract');
                    (0, chai_1.expect)(context.run.signals.some(function (signal) { return signal.key === 'contract.status' && signal.value === 'ready'; })).to.equal(true);
                    (0, chai_1.expect)(context.run.artifacts.filter(function (artifact) { return artifact.kind === 'contract'; })).to.have.length.greaterThan(0);
                    (0, chai_1.expect)(context.run.artifacts.filter(function (artifact) { return artifact.kind === 'work_order'; })).to.have.length.greaterThan(0);
                    return [2 /*return*/];
            }
        });
    }); });
    it('falha contract package gerado pelo agente quando nao valida contra contracts.schema.json', function () { return __awaiter(void 0, void 0, void 0, function () {
        var context, contracts, executor;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    context = createExecutionContext(workspaceRootUri, {
                        id: 'contract_design',
                        agent: 'contract_designer',
                        outputs: [
                            'contracts/shared.md',
                            'contracts/contracts.json',
                            'contracts/work-orders/backend.md',
                            'contracts/work-orders/frontend.md',
                            'contracts/work-orders/designer.md',
                            'contracts/work-orders/qa.md'
                        ]
                    });
                    context.workload.stateId = 'contract_design';
                    context.workload.agent = 'contract_designer';
                    context.run.stateStatuses = { contract_design: 'running' };
                    context.workflow.agents = { contract_designer: 'agents/contract-designer.md' };
                    context.workflow.states = { contract_design: context.state };
                    contracts = __assign(__assign({}, validContractPackage()), { schemaVersion: 'flow.contracts/v0' });
                    executor = new MockLlmProviderExecutor(agentMarkdown, [JSON.stringify({
                            result: {
                                status: 'completed',
                                summary: 'Contract package generated.',
                                artifacts: [{ path: 'contracts/contracts.json', content: JSON.stringify(contracts) }],
                                signals: {},
                                issues: []
                            }
                        })]);
                    return [4 /*yield*/, executor.executeAgentWorkload(context)];
                case 1:
                    _a.sent();
                    (0, chai_1.expect)(context.run.workloads[0].status).to.equal('failed');
                    (0, chai_1.expect)(context.run.events.some(function (event) {
                        var _a;
                        return event.type === 'workload.failed'
                            && String(((_a = event.payload) === null || _a === void 0 ? void 0 : _a.error) || '').includes('failed flow contract schema validation');
                    })).to.equal(true);
                    (0, chai_1.expect)(context.run.signals.some(function (signal) { return signal.key === 'contract.status' && signal.value === 'ready'; })).to.equal(false);
                    return [2 /*return*/];
            }
        });
    }); });
    it('materializa work orders e schemas para contract_designer mesmo quando outputs legados listam apenas contracts.json', function () { return __awaiter(void 0, void 0, void 0, function () {
        var context, executor, outputRoot, _a, _b, _c, _d, _e, _f;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    context = createExecutionContext(workspaceRootUri, {
                        id: 'contract_design',
                        agent: 'contract_designer',
                        outputs: ['contracts/shared.md', 'contracts/contracts.json']
                    });
                    context.workload.stateId = 'contract_design';
                    context.workload.agent = 'contract_designer';
                    context.run.stateStatuses = { contract_design: 'running' };
                    context.workflow.agents = { contract_designer: 'agents/contract-designer.md' };
                    context.workflow.states = { contract_design: context.state };
                    executor = new MockLlmProviderExecutor(agentMarkdown, [JSON.stringify({
                            result: {
                                status: 'completed',
                                summary: 'Contract package generated.',
                                artifacts: [{ path: 'contracts/contracts.json', content: JSON.stringify(validContractPackage()) }],
                                signals: {},
                                issues: []
                            }
                        })]);
                    return [4 /*yield*/, executor.executeAgentWorkload(context)];
                case 1:
                    _g.sent();
                    outputRoot = path.join(workspaceRootDir, '.theia', 'flow', 'runs', context.run.id, 'workloads', context.workload.id, 'output', 'artifacts');
                    return [4 /*yield*/, fs.access(path.join(outputRoot, 'contracts', 'work-orders', 'backend.md'))];
                case 2:
                    _g.sent();
                    return [4 /*yield*/, fs.access(path.join(outputRoot, 'contracts', 'work-orders', 'frontend.md'))];
                case 3:
                    _g.sent();
                    return [4 /*yield*/, fs.access(path.join(outputRoot, 'contracts', 'work-orders', 'designer.md'))];
                case 4:
                    _g.sent();
                    return [4 /*yield*/, fs.access(path.join(outputRoot, 'contracts', 'work-orders', 'qa.md'))];
                case 5:
                    _g.sent();
                    _a = chai_1.expect;
                    _c = (_b = JSON).parse;
                    return [4 /*yield*/, fs.readFile(path.join(outputRoot, 'schemas', 'api.json'), 'utf8')];
                case 6:
                    _a.apply(void 0, [_c.apply(_b, [_g.sent()]).title]).to.equal('Flow API Contract');
                    _d = chai_1.expect;
                    _f = (_e = JSON).parse;
                    return [4 /*yield*/, fs.readFile(path.join(outputRoot, 'schemas', 'assets.json'), 'utf8')];
                case 7:
                    _d.apply(void 0, [_f.apply(_e, [_g.sent()]).title]).to.equal('Flow Asset Contract');
                    return [2 /*return*/];
            }
        });
    }); });
    it('falha contract package aprovado quando falta work order requerida pelo workflow', function () { return __awaiter(void 0, void 0, void 0, function () {
        var context, contracts, executor;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    context = createExecutionContext(workspaceRootUri, {
                        id: 'contract_design',
                        agent: 'contract_designer',
                        outputs: [
                            'contracts/shared.md',
                            'contracts/contracts.json',
                            'contracts/work-orders/backend.md',
                            'contracts/work-orders/frontend.md',
                            'contracts/work-orders/designer.md',
                            'contracts/work-orders/qa.md'
                        ]
                    });
                    context.workload.stateId = 'contract_design';
                    context.workload.agent = 'contract_designer';
                    context.run.stateStatuses = { contract_design: 'running' };
                    context.workflow.agents = { contract_designer: 'agents/contract-designer.md' };
                    context.workflow.states = { contract_design: context.state };
                    contracts = {
                        packageId: 'contracts-run-1',
                        schemaVersion: 'flow.contracts/v1',
                        sharedMd: {
                            path: 'contracts/shared.md',
                            deliveryObjective: 'Deliver the requested feature safely.',
                            approvedScope: ['backend endpoint'],
                            outOfScope: ['billing migration'],
                            decisions: ['Use contract-first parallel delivery.'],
                            canonicalNames: ['FeatureRequest'],
                            knownRisks: [{
                                    id: 'risk-1',
                                    severity: 'medium',
                                    description: 'Parallel branches may drift.',
                                    impact: 'QA may find integration mismatch.',
                                    mitigation: 'Validate against shared contract.'
                                }],
                            changeRules: {
                                approvalPolicy: 'human_gate_for_scope_or_contract_schema',
                                requiresHumanGateForContractMutation: true,
                                outOfScopeAction: 'second_run_required',
                                maxRevisionAttempts: 2
                            }
                        },
                        api: [{ id: 'feature_read', method: 'GET', path: '/feature', statusCodes: [200] }],
                        assets: [{ id: 'feature_icon', path: 'public/assets/feature-icon.png', format: 'png', description: 'Feature icon.', usage: 'header' }],
                        workOrders: [
                            { id: 'backend', agentRole: 'backend', path: 'contracts/work-orders/backend.md', scope: ['Implement API'], instructions: 'Build the API contract.', requiredInputs: ['contracts/shared.md'], acceptanceCriteria: ['Endpoint matches contract.'] },
                            { id: 'frontend', agentRole: 'frontend', path: 'contracts/work-orders/frontend.md', scope: ['Implement UI'], instructions: 'Build the screen.', requiredInputs: ['contracts/shared.md'], acceptanceCriteria: ['Screen calls API.'] },
                            { id: 'designer', agentRole: 'designer', path: 'contracts/work-orders/designer.md', scope: ['Prepare assets'], instructions: 'Create required assets.', requiredInputs: ['contracts/shared.md'], acceptanceCriteria: ['Assets match contract.'] }
                        ],
                        schemas: {
                            api: [{ path: 'schemas/api.json', category: 'api', version: '1.0.0' }],
                            assets: [{ path: 'schemas/assets.json', category: 'asset', version: '1.0.0' }]
                        },
                        approvedScope: ['backend endpoint'],
                        outOfScope: ['billing migration'],
                        risks: [{
                                id: 'risk-1',
                                severity: 'medium',
                                description: 'Parallel branches may drift.',
                                impact: 'QA may find integration mismatch.',
                                mitigation: 'Validate against shared contract.'
                            }],
                        changeRules: {
                            approvalPolicy: 'human_gate_for_scope_or_contract_schema',
                            requiresHumanGateForContractMutation: true,
                            outOfScopeAction: 'second_run_required',
                            maxRevisionAttempts: 2
                        }
                    };
                    executor = new MockLlmProviderExecutor(agentMarkdown, [JSON.stringify({
                            result: {
                                status: 'completed',
                                summary: 'Contract package generated.',
                                artifacts: [{ path: 'contracts/contracts.json', content: JSON.stringify(contracts) }],
                                signals: {},
                                issues: []
                            }
                        })]);
                    return [4 /*yield*/, executor.executeAgentWorkload(context)];
                case 1:
                    _a.sent();
                    (0, chai_1.expect)(context.run.workloads[0].status).to.equal('failed');
                    (0, chai_1.expect)(context.run.events.some(function (event) {
                        var _a;
                        return event.type === 'workload.failed'
                            && String(((_a = event.payload) === null || _a === void 0 ? void 0 : _a.error) || '').includes('missing workOrders for: qa');
                    })).to.equal(true);
                    return [2 /*return*/];
            }
        });
    }); });
    it('imports LLM memory candidates as candidates even when the payload marks them written', function () { return __awaiter(void 0, void 0, void 0, function () {
        var context, executor;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    context = createExecutionContext(workspaceRootUri);
                    executor = new MockLlmProviderExecutor(agentMarkdown, [JSON.stringify({
                            result: {
                                status: 'completed',
                                summary: 'Mocked execution completed.',
                                artifacts: [{ path: 'report.md', content: '# Report' }],
                                signals: {},
                                issues: []
                            },
                            memoryCandidates: [{
                                    source: 'artifact',
                                    kind: 'decision',
                                    content: 'Never persist imported Flow memory automatically.',
                                    reason: 'Imported from an artifact-like LLM payload.',
                                    status: 'written'
                                }]
                        })]);
                    return [4 /*yield*/, executor.executeAgentWorkload(context)];
                case 1:
                    _b.sent();
                    (0, chai_1.expect)(context.run.memoryCandidates).to.have.length(1);
                    (0, chai_1.expect)((_a = context.run.memoryCandidates) === null || _a === void 0 ? void 0 : _a[0]).to.include({
                        source: 'artifact',
                        kind: 'decision',
                        status: 'candidate'
                    });
                    (0, chai_1.expect)(context.run.memoryWrites).to.equal(undefined);
                    return [2 /*return*/];
            }
        });
    }); });
    it('executes real memory_write workloads for approved candidates through MemoryAdapter', function () { return __awaiter(void 0, void 0, void 0, function () {
        var context, writes, executor;
        var _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    context = createExecutionContext(workspaceRootUri, {
                        id: 'memory_write',
                        type: 'memory_write',
                        scope: 'workflow'
                    });
                    context.run.memoryCandidates = [{
                            id: 'candidate-workflow',
                            runId: context.run.id,
                            stateId: 'memory_review',
                            source: 'artifact',
                            kind: 'decision',
                            content: 'Use explicit memory writes only after approval.',
                            reason: 'Approved during memory review.',
                            confidence: 0.9,
                            status: 'approved',
                            createdAt: '2026-05-19T00:00:00.000Z'
                        }, {
                            id: 'candidate-pending',
                            runId: context.run.id,
                            stateId: 'memory_review',
                            source: 'artifact',
                            kind: 'fact',
                            content: 'Do not write this yet.',
                            reason: 'Still pending review.',
                            confidence: 0.5,
                            status: 'candidate',
                            createdAt: '2026-05-19T00:00:00.000Z'
                        }];
                    writes = [];
                    executor = new MemoryWriteExecutor({
                        report: function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, ({ available: true, provider: 'local' })];
                        }); }); },
                        buildContextPack: function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, context.run.contextPack];
                        }); }); },
                        collectMemoryCandidates: function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, []];
                        }); }); },
                        writeApprovedMemory: function (memoryWrite) { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                writes.push(memoryWrite);
                                return [2 /*return*/, __assign(__assign({}, memoryWrite), { status: 'written' })];
                            });
                        }); }
                    });
                    return [4 /*yield*/, executor.executeMemoryWriteWorkload(context)];
                case 1:
                    _d.sent();
                    (0, chai_1.expect)(writes).to.have.length(1);
                    (0, chai_1.expect)(writes[0]).to.include({
                        candidateId: 'candidate-workflow',
                        scope: 'workflow',
                        target: context.workflow.id,
                        status: 'approved'
                    });
                    (0, chai_1.expect)((_b = (_a = context.run.memoryCandidates) === null || _a === void 0 ? void 0 : _a.find(function (candidate) { return candidate.id === 'candidate-workflow'; })) === null || _b === void 0 ? void 0 : _b.status).to.equal('written');
                    (0, chai_1.expect)((_c = context.run.memoryWrites) === null || _c === void 0 ? void 0 : _c[0]).to.include({ status: 'written', scope: 'workflow', target: context.workflow.id });
                    (0, chai_1.expect)(context.run.events.map(function (event) { return event.type; })).to.include.members(['memory_write.approved', 'memory_write.written']);
                    (0, chai_1.expect)(context.run.workloads[0].status).to.equal('done');
                    return [2 /*return*/];
            }
        });
    }); });
    it('respects ide workspace project workflow run and agent scopes in memory_write workloads', function () { return __awaiter(void 0, void 0, void 0, function () {
        var scopes, writes, _loop_1, _i, scopes_1, scope;
        var _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    scopes = ['ide', 'workspace', 'project', 'workflow', 'run', 'agent'];
                    writes = [];
                    _loop_1 = function (scope) {
                        var context, executor;
                        return __generator(this, function (_e) {
                            switch (_e.label) {
                                case 0:
                                    context = createExecutionContext(workspaceRootUri, {
                                        id: "memory_".concat(scope),
                                        type: 'memory_write',
                                        scope: scope,
                                        agent: scope === 'agent' ? 'reviewer' : undefined
                                    });
                                    context.run.memoryCandidates = [{
                                            id: "candidate-".concat(scope),
                                            runId: context.run.id,
                                            stateId: 'memory_review',
                                            source: 'artifact',
                                            kind: 'decision',
                                            content: "Approved ".concat(scope, " memory."),
                                            reason: 'Scope coverage.',
                                            confidence: 0.8,
                                            status: 'approved',
                                            createdAt: '2026-05-19T00:00:00.000Z'
                                        }];
                                    executor = new MemoryWriteExecutor({
                                        report: function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                            return [2 /*return*/, ({ available: true, provider: 'local' })];
                                        }); }); },
                                        buildContextPack: function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                            return [2 /*return*/, context.run.contextPack];
                                        }); }); },
                                        collectMemoryCandidates: function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                            return [2 /*return*/, []];
                                        }); }); },
                                        writeApprovedMemory: function (memoryWrite) { return __awaiter(void 0, void 0, void 0, function () {
                                            return __generator(this, function (_a) {
                                                writes.push(memoryWrite);
                                                return [2 /*return*/, __assign(__assign({}, memoryWrite), { status: 'written' })];
                                            });
                                        }); }
                                    });
                                    return [4 /*yield*/, executor.executeMemoryWriteWorkload(context)];
                                case 1:
                                    _e.sent();
                                    return [2 /*return*/];
                            }
                        });
                    };
                    _i = 0, scopes_1 = scopes;
                    _d.label = 1;
                case 1:
                    if (!(_i < scopes_1.length)) return [3 /*break*/, 4];
                    scope = scopes_1[_i];
                    return [5 /*yield**/, _loop_1(scope)];
                case 2:
                    _d.sent();
                    _d.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4:
                    (0, chai_1.expect)(writes.map(function (write) { return write.scope; })).to.deep.equal(__spreadArray([], scopes, true));
                    (0, chai_1.expect)((_a = writes.find(function (write) { return write.scope === 'workflow'; })) === null || _a === void 0 ? void 0 : _a.target).to.equal('workload_executor_test');
                    (0, chai_1.expect)((_b = writes.find(function (write) { return write.scope === 'run'; })) === null || _b === void 0 ? void 0 : _b.target).to.equal('run-1');
                    (0, chai_1.expect)((_c = writes.find(function (write) { return write.scope === 'agent'; })) === null || _c === void 0 ? void 0 : _c.target).to.equal('reviewer');
                    return [2 /*return*/];
            }
        });
    }); });
    it('fails approved memory_write workloads when Memory is absent', function () { return __awaiter(void 0, void 0, void 0, function () {
        var context, executor;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    context = createExecutionContext(workspaceRootUri, {
                        id: 'memory_write',
                        type: 'memory_write',
                        scope: 'project'
                    });
                    context.run.memoryCandidates = [{
                            id: 'candidate-project',
                            runId: context.run.id,
                            stateId: 'memory_review',
                            source: 'artifact',
                            kind: 'decision',
                            content: 'Persist this only if Memory is available.',
                            reason: 'Approved during memory review.',
                            confidence: 0.9,
                            status: 'approved',
                            createdAt: '2026-05-19T00:00:00.000Z'
                        }];
                    executor = new MemoryWriteExecutor();
                    return [4 /*yield*/, executor.executeMemoryWriteWorkload(context)];
                case 1:
                    _c.sent();
                    (0, chai_1.expect)((_a = context.run.memoryWrites) === null || _a === void 0 ? void 0 : _a[0]).to.include({ status: 'failed', scope: 'project' });
                    (0, chai_1.expect)((_b = context.run.memoryWrites) === null || _b === void 0 ? void 0 : _b[0].error).to.contain('Memory adapter is not available');
                    (0, chai_1.expect)(context.run.events.some(function (event) { return event.type === 'memory_write.failed'; })).to.equal(true);
                    (0, chai_1.expect)(context.run.workloads[0].status).to.equal('failed');
                    return [2 /*return*/];
            }
        });
    }); });
    it('registra evento e artifact auditavel para file effect gerado pelo agente', function () { return __awaiter(void 0, void 0, void 0, function () {
        var context, executor, effect, _a;
        var _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    context = createExecutionContext(workspaceRootUri);
                    executor = new MockLlmProviderExecutor(agentMarkdown, [JSON.stringify({
                            result: {
                                status: 'completed',
                                summary: 'Mocked execution completed.',
                                artifacts: [{ path: 'report.md', content: '# Report' }],
                                signals: {},
                                issues: []
                            },
                            report: 'Execution finished.',
                            effects: [{
                                    type: 'file.edited',
                                    path: 'src/app.ts',
                                    summary: 'Updated app source.',
                                    content: 'export const value = 2;\n',
                                    hashBefore: 'sha256:before',
                                    hashAfter: 'sha256:after',
                                    patch: '--- a/src/app.ts\n+++ b/src/app.ts\n@@\n-old\n+new\n',
                                    approvalPolicy: 'human_gate_required',
                                    status: 'approved'
                                }]
                        })]);
                    return [4 /*yield*/, executor.executeAgentWorkload(context)];
                case 1:
                    _d.sent();
                    effect = context.run.effects.find(function (item) { return item.type === 'file.edited'; });
                    (0, chai_1.expect)(effect === null || effect === void 0 ? void 0 : effect.status).to.equal('applied');
                    (0, chai_1.expect)(effect === null || effect === void 0 ? void 0 : effect.hashBefore).to.match(/^sha256:/);
                    (0, chai_1.expect)(effect === null || effect === void 0 ? void 0 : effect.hashAfter).to.match(/^sha256:/);
                    (0, chai_1.expect)(context.run.events.some(function (event) { var _a; return event.type === 'effect.proposed' && ((_a = event.payload) === null || _a === void 0 ? void 0 : _a.effectId) === (effect === null || effect === void 0 ? void 0 : effect.id); })).to.equal(true);
                    (0, chai_1.expect)(context.run.events.some(function (event) { var _a; return event.type === 'effect.approved' && ((_a = event.payload) === null || _a === void 0 ? void 0 : _a.effectId) === (effect === null || effect === void 0 ? void 0 : effect.id); })).to.equal(true);
                    (0, chai_1.expect)(context.run.events.some(function (event) { var _a; return event.type === 'effect.applied' && ((_a = event.payload) === null || _a === void 0 ? void 0 : _a.effectId) === (effect === null || effect === void 0 ? void 0 : effect.id); })).to.equal(true);
                    (0, chai_1.expect)(context.run.artifacts.some(function (artifact) { return artifact.kind === 'patch' && artifact.uri.endsWith('-proposed.diff'); })).to.equal(true);
                    (0, chai_1.expect)(context.run.artifacts.some(function (artifact) { return artifact.kind === 'patch' && artifact.uri.endsWith('-approved.diff'); })).to.equal(true);
                    (0, chai_1.expect)(context.run.artifacts.some(function (artifact) { var _a; return artifact.kind === 'patch' && ((_a = artifact.summary) === null || _a === void 0 ? void 0 : _a.includes('File effect applied: src/app.ts')) && artifact.uri.endsWith('-applied.diff'); })).to.equal(true);
                    (0, chai_1.expect)((_c = (_b = context.run.events.find(function (event) { var _a; return event.type === 'effect.applied' && ((_a = event.payload) === null || _a === void 0 ? void 0 : _a.effectId) === (effect === null || effect === void 0 ? void 0 : effect.id); })) === null || _b === void 0 ? void 0 : _b.payload) === null || _c === void 0 ? void 0 : _c.patch).to.contain('+++ b/src/app.ts');
                    _a = chai_1.expect;
                    return [4 /*yield*/, fs.readFile(path.join(workspaceRootDir, 'src', 'app.ts'), 'utf8')];
                case 2:
                    _a.apply(void 0, [_d.sent()]).to.equal('export const value = 2;\n');
                    return [2 /*return*/];
            }
        });
    }); });
    it('registra file effect bloqueado com estado separado, evento e diff artifact', function () { return __awaiter(void 0, void 0, void 0, function () {
        var context, executor, effect;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    context = createExecutionContext(workspaceRootUri);
                    executor = new MockLlmProviderExecutor(agentMarkdown, [JSON.stringify({
                            result: {
                                status: 'completed',
                                summary: 'Mocked execution completed.',
                                artifacts: [{ path: 'report.md', content: '# Report' }],
                                signals: {},
                                issues: []
                            },
                            report: 'Execution finished.',
                            effects: [{
                                    type: 'file.created',
                                    path: 'secrets/token.txt',
                                    summary: 'Attempted internal write.',
                                    content: 'blocked\n',
                                    hashAfter: 'sha256:after',
                                    patch: '--- a/secrets/token.txt\n+++ b/secrets/token.txt\n@@\n+blocked\n',
                                    deniedPaths: ['secrets/'],
                                    approvalPolicy: 'auto_apply',
                                    status: 'approved'
                                }]
                        })]);
                    return [4 /*yield*/, executor.executeAgentWorkload(context)];
                case 1:
                    _a.sent();
                    effect = context.run.effects.find(function (item) { return item.type === 'file.created'; });
                    (0, chai_1.expect)(effect === null || effect === void 0 ? void 0 : effect.status).to.equal('blocked');
                    (0, chai_1.expect)(context.run.events.some(function (event) { var _a; return event.type === 'effect.proposed' && ((_a = event.payload) === null || _a === void 0 ? void 0 : _a.effectId) === (effect === null || effect === void 0 ? void 0 : effect.id); })).to.equal(true);
                    (0, chai_1.expect)(context.run.events.some(function (event) { var _a; return event.type === 'effect.blocked' && ((_a = event.payload) === null || _a === void 0 ? void 0 : _a.effectId) === (effect === null || effect === void 0 ? void 0 : effect.id); })).to.equal(true);
                    (0, chai_1.expect)(context.run.artifacts.some(function (artifact) { return artifact.kind === 'patch' && artifact.uri.endsWith('-blocked.diff'); })).to.equal(true);
                    (0, chai_1.expect)(context.run.workloads[0].status).to.equal('failed');
                    return [2 /*return*/];
            }
        });
    }); });
    it('gera image effect via provider configurado e salva artifact auditavel', function () { return __awaiter(void 0, void 0, void 0, function () {
        var previousProvider, context, executor, effect_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    previousProvider = process.env.FLOW_IMAGE_PROVIDER_COMMAND;
                    process.env.FLOW_IMAGE_PROVIDER_COMMAND = "\"".concat(process.execPath, "\" -e \"process.stdin.resume();process.stdin.on('end',()=>console.log(JSON.stringify({base64:Buffer.from('png').toString('base64')})))\"");
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, , 4, 5]);
                    context = createExecutionContext(workspaceRootUri);
                    executor = new MockLlmProviderExecutor(agentMarkdown, [JSON.stringify({
                            result: {
                                status: 'completed',
                                summary: 'Mocked execution completed.',
                                artifacts: [{ path: 'report.md', content: '# Report' }],
                                signals: {},
                                issues: []
                            },
                            report: 'Execution finished.',
                            effects: [{
                                    type: 'image.generate',
                                    prompt: 'A compact product mockup.',
                                    artifactPath: 'images/mockup.png',
                                    summary: 'Generated product mockup.',
                                    status: 'approved'
                                }]
                        })]);
                    return [4 /*yield*/, executor.executeAgentWorkload(context)];
                case 2:
                    _a.sent();
                    effect_1 = context.run.effects.find(function (item) { return item.type === 'image.generate'; });
                    (0, chai_1.expect)(effect_1 === null || effect_1 === void 0 ? void 0 : effect_1.kind).to.equal('image');
                    (0, chai_1.expect)(effect_1 === null || effect_1 === void 0 ? void 0 : effect_1.status).to.equal('applied');
                    (0, chai_1.expect)(effect_1 === null || effect_1 === void 0 ? void 0 : effect_1.path).to.contain('mockup.png');
                    (0, chai_1.expect)(context.run.events.some(function (event) { var _a; return event.type === 'effect.applied' && ((_a = event.payload) === null || _a === void 0 ? void 0 : _a.effectId) === (effect_1 === null || effect_1 === void 0 ? void 0 : effect_1.id); })).to.equal(true);
                    (0, chai_1.expect)(context.run.artifacts.some(function (artifact) { var _a; return (_a = artifact.summary) === null || _a === void 0 ? void 0 : _a.includes('Image effect applied: images/mockup.png'); })).to.equal(true);
                    return [4 /*yield*/, fs.access(path.join(workspaceRootDir, '.theia', 'flow', 'runs', context.run.id, 'artifacts', 'images', 'mockup.png'))];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 5];
                case 4:
                    if (previousProvider === undefined) {
                        delete process.env.FLOW_IMAGE_PROVIDER_COMMAND;
                    }
                    else {
                        process.env.FLOW_IMAGE_PROVIDER_COMMAND = previousProvider;
                    }
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); });
    it('bloqueia image effect sem provider e marca workload como failed', function () { return __awaiter(void 0, void 0, void 0, function () {
        var previousProvider, context, executor, effect_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    previousProvider = process.env.FLOW_IMAGE_PROVIDER_COMMAND;
                    delete process.env.FLOW_IMAGE_PROVIDER_COMMAND;
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, , 3, 4]);
                    context = createExecutionContext(workspaceRootUri);
                    executor = new MockLlmProviderExecutor(agentMarkdown, [JSON.stringify({
                            result: {
                                status: 'completed',
                                summary: 'Mocked execution completed.',
                                artifacts: [{ path: 'report.md', content: '# Report' }],
                                signals: {},
                                issues: []
                            },
                            report: 'Execution finished.',
                            effects: [{
                                    type: 'image.generate',
                                    prompt: 'A compact product mockup.',
                                    artifactPath: 'images/mockup.png',
                                    summary: 'Generated product mockup.'
                                }]
                        })]);
                    return [4 /*yield*/, executor.executeAgentWorkload(context)];
                case 2:
                    _a.sent();
                    effect_2 = context.run.effects.find(function (item) { return item.type === 'image.generate'; });
                    (0, chai_1.expect)(effect_2 === null || effect_2 === void 0 ? void 0 : effect_2.kind).to.equal('image');
                    (0, chai_1.expect)(effect_2 === null || effect_2 === void 0 ? void 0 : effect_2.status).to.equal('blocked');
                    (0, chai_1.expect)(effect_2 === null || effect_2 === void 0 ? void 0 : effect_2.stderr).to.contain('Image provider is not configured');
                    (0, chai_1.expect)(context.run.workloads[0].status).to.equal('failed');
                    (0, chai_1.expect)(context.run.stateStatuses.agent).to.equal('failed');
                    (0, chai_1.expect)(context.run.workloads[0].issues.some(function (issue) { return issue.includes('Image effect "Generated product mockup." was blocked'); })).to.equal(true);
                    (0, chai_1.expect)(context.run.events.some(function (event) { var _a; return event.type === 'effect.failed' && ((_a = event.payload) === null || _a === void 0 ? void 0 : _a.effectId) === (effect_2 === null || effect_2 === void 0 ? void 0 : effect_2.id); })).to.equal(true);
                    (0, chai_1.expect)(context.run.events.some(function (event) { return event.type === 'workload.failed'; })).to.equal(true);
                    (0, chai_1.expect)(context.run.events.some(function (event) { return event.type === 'workload.completed'; })).to.equal(false);
                    (0, chai_1.expect)(context.run.artifacts.some(function (artifact) { var _a; return (_a = artifact.summary) === null || _a === void 0 ? void 0 : _a.includes('Image effect blocked: Generated product mockup.'); })).to.equal(true);
                    return [3 /*break*/, 4];
                case 3:
                    if (previousProvider === undefined) {
                        delete process.env.FLOW_IMAGE_PROVIDER_COMMAND;
                    }
                    else {
                        process.env.FLOW_IMAGE_PROVIDER_COMMAND = previousProvider;
                    }
                    return [7 /*endfinally*/];
                case 4: return [2 /*return*/];
            }
        });
    }); });
    it('QA real valida contratos contra artifacts, rotas, assets, nomes e file effects', function () { return __awaiter(void 0, void 0, void 0, function () {
        var context, executor, reportPath, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    context = createExecutionContext(workspaceRootUri, {
                        id: 'qa',
                        agent: 'qa',
                        outputs: ['qa/report.md'],
                        input: { include: ['contracts/contracts.json', 'delivery/join-summary.md'] }
                    });
                    context.workload.stateId = 'qa';
                    context.workload.agent = 'qa';
                    context.workload.inputArtifacts = ['contracts/contracts.json', 'delivery/join-summary.md'];
                    context.run.stateStatuses = { qa: 'running' };
                    context.workflow.agents = { qa: 'agents/qa-specialist.md' };
                    context.workflow.states = { qa: context.state };
                    return [4 /*yield*/, addRunArtifact(context, workspaceRootDir, 'contracts/contracts.json', JSON.stringify(validContractPackage()), 'contract_design')];
                case 1:
                    _b.sent();
                    return [4 /*yield*/, addRunArtifact(context, workspaceRootDir, 'delivery/join-summary.md', [
                            '# Delivery',
                            'Backend exposes GET /feature for FeatureRequest.',
                            'Frontend consumes GET /feature with FeatureRequest fields.',
                            'Designer delivered public/assets/feature-icon.png.'
                        ].join('\n'))];
                case 2:
                    _b.sent();
                    context.run.effects.push({
                        id: 'effect-route',
                        runId: context.run.id,
                        stateId: 'backend',
                        kind: 'file',
                        type: 'file.edited',
                        path: 'src/routes/feature.ts',
                        status: 'applied',
                        summary: 'Implemented GET /feature for FeatureRequest.'
                    });
                    executor = new MockLlmProviderExecutor(agentMarkdown, [JSON.stringify({
                            result: {
                                status: 'completed',
                                summary: 'QA agent reviewed delivery.',
                                artifacts: [{ path: 'qa/report.md', content: '# QA\n\nAgent report.' }],
                                signals: {},
                                issues: []
                            }
                        })]);
                    return [4 /*yield*/, executor.executeAgentWorkload(context)];
                case 3:
                    _b.sent();
                    (0, chai_1.expect)(context.run.workloads[0].status).to.equal('done');
                    (0, chai_1.expect)(context.run.signals.some(function (signal) { return signal.key === 'qa.status' && signal.value === 'passed'; })).to.equal(true);
                    (0, chai_1.expect)(context.run.signals.some(function (signal) { return signal.key === 'qa.blocking_issue_count' && signal.value === 0; })).to.equal(true);
                    (0, chai_1.expect)(context.run.workloads[0].issues).to.deep.equal([]);
                    reportPath = path.join(workspaceRootDir, '.theia', 'flow', 'runs', context.run.id, 'workloads', context.workload.id, 'output', 'artifacts', 'qa', 'report.md');
                    _a = chai_1.expect;
                    return [4 /*yield*/, fs.readFile(reportPath, 'utf8')];
                case 4:
                    _a.apply(void 0, [_b.sent()]).to.contain('Status: passed');
                    return [2 /*return*/];
            }
        });
    }); });
    it('QA real falha quando faltam evidencias contratuais e ha issue compartilhada aberta', function () { return __awaiter(void 0, void 0, void 0, function () {
        var context, executor, qaWorkload;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    context = createExecutionContext(workspaceRootUri, {
                        id: 'qa',
                        agent: 'qa',
                        outputs: ['qa/report.md'],
                        input: { include: ['contracts/contracts.json', 'delivery/join-summary.md'] }
                    });
                    context.workload.stateId = 'qa';
                    context.workload.agent = 'qa';
                    context.workload.inputArtifacts = ['contracts/contracts.json', 'delivery/join-summary.md'];
                    context.run.stateStatuses = { qa: 'running' };
                    context.workflow.agents = { qa: 'agents/qa-specialist.md' };
                    context.workflow.states = { qa: context.state };
                    context.run.workloads.unshift({
                        id: 'workload-backend',
                        runId: context.run.id,
                        stateId: 'backend',
                        agent: 'backend',
                        status: 'done',
                        inputArtifacts: [],
                        outputArtifacts: [],
                        issues: ['Backend route implementation is incomplete.'],
                        effectIds: [],
                        createdAt: '2026-05-19T00:00:00.000Z',
                        updatedAt: '2026-05-19T00:00:00.000Z'
                    });
                    return [4 /*yield*/, addRunArtifact(context, workspaceRootDir, 'contracts/contracts.json', JSON.stringify(validContractPackage()), 'contract_design')];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, addRunArtifact(context, workspaceRootDir, 'delivery/join-summary.md', '# Delivery\n\nOnly partial UI notes.', 'delivery')];
                case 2:
                    _a.sent();
                    context.run.effects.push({
                        id: 'effect-blocked',
                        runId: context.run.id,
                        stateId: 'designer',
                        kind: 'file',
                        type: 'file.edited',
                        path: 'public/assets/feature-icon.png',
                        status: 'blocked',
                        summary: 'Asset write requires approval.'
                    });
                    executor = new MockLlmProviderExecutor(agentMarkdown, [JSON.stringify({
                            result: {
                                status: 'completed',
                                summary: 'QA agent reviewed delivery.',
                                artifacts: [{ path: 'qa/report.md', content: '# QA\n\nAgent report.' }],
                                signals: {},
                                issues: []
                            }
                        })]);
                    return [4 /*yield*/, executor.executeAgentWorkload(context)];
                case 3:
                    _a.sent();
                    qaWorkload = context.run.workloads.find(function (workload) { return workload.stateId === 'qa'; });
                    (0, chai_1.expect)(qaWorkload === null || qaWorkload === void 0 ? void 0 : qaWorkload.status).to.equal('failed');
                    (0, chai_1.expect)(context.run.signals.some(function (signal) { return signal.key === 'qa.status' && signal.value === 'failed'; })).to.equal(true);
                    (0, chai_1.expect)(qaWorkload === null || qaWorkload === void 0 ? void 0 : qaWorkload.issues.some(function (issue) { return issue.includes('Missing route evidence for contract API GET /feature'); })).to.equal(true);
                    (0, chai_1.expect)(qaWorkload === null || qaWorkload === void 0 ? void 0 : qaWorkload.issues.some(function (issue) { return issue.includes('Missing canonical field/name evidence for FeatureRequest'); })).to.equal(true);
                    (0, chai_1.expect)(qaWorkload === null || qaWorkload === void 0 ? void 0 : qaWorkload.issues.some(function (issue) { return issue.includes('Unsafe or unapplied effect remains'); })).to.equal(true);
                    (0, chai_1.expect)(qaWorkload === null || qaWorkload === void 0 ? void 0 : qaWorkload.issues.some(function (issue) { return issue.includes('Shared delivery issue remains open'); })).to.equal(true);
                    (0, chai_1.expect)(context.run.events.some(function (event) { return event.type === 'workload.failed'; })).to.equal(true);
                    return [2 /*return*/];
            }
        });
    }); });
    it('QA real falha com issue bloqueante aberta registrada no event log', function () { return __awaiter(void 0, void 0, void 0, function () {
        var context, executor, qaWorkload;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    context = createExecutionContext(workspaceRootUri, {
                        id: 'qa',
                        agent: 'qa',
                        outputs: ['qa/report.md'],
                        input: { include: ['contracts/contracts.json', 'delivery/join-summary.md'] }
                    });
                    context.workload.stateId = 'qa';
                    context.workload.agent = 'qa';
                    context.workload.inputArtifacts = ['contracts/contracts.json', 'delivery/join-summary.md'];
                    context.run.stateStatuses = { qa: 'running' };
                    context.workflow.agents = { qa: 'agents/qa-specialist.md' };
                    context.workflow.states = { qa: context.state };
                    return [4 /*yield*/, addRunArtifact(context, workspaceRootDir, 'contracts/contracts.json', JSON.stringify(validContractPackage()), 'contract_design')];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, addRunArtifact(context, workspaceRootDir, 'delivery/join-summary.md', [
                            '# Delivery',
                            'Backend exposes GET /feature for FeatureRequest.',
                            'Frontend consumes GET /feature with FeatureRequest fields.',
                            'Designer delivered public/assets/feature-icon.png.'
                        ].join('\n'), 'delivery')];
                case 2:
                    _a.sent();
                    context.run.events.push({
                        id: 'blocking-issue',
                        runId: context.run.id,
                        type: 'issue.recorded',
                        timestamp: '2026-05-19T00:00:00.000Z',
                        stateId: 'backend',
                        workloadId: 'workload-backend',
                        message: 'Issue recorded.',
                        payload: {
                            severity: 'blocking',
                            type: 'contract_validation',
                            summary: 'Backend contract validation is still open.'
                        }
                    });
                    executor = new MockLlmProviderExecutor(agentMarkdown, [JSON.stringify({
                            result: {
                                status: 'completed',
                                summary: 'QA agent reviewed delivery.',
                                artifacts: [{ path: 'qa/report.md', content: '# QA\n\nAgent report.' }],
                                signals: {},
                                issues: []
                            }
                        })]);
                    return [4 /*yield*/, executor.executeAgentWorkload(context)];
                case 3:
                    _a.sent();
                    qaWorkload = context.run.workloads.find(function (workload) { return workload.stateId === 'qa'; });
                    (0, chai_1.expect)(qaWorkload === null || qaWorkload === void 0 ? void 0 : qaWorkload.status).to.equal('failed');
                    (0, chai_1.expect)(context.run.signals.some(function (signal) { return signal.key === 'qa.status' && signal.value === 'failed'; })).to.equal(true);
                    (0, chai_1.expect)(qaWorkload === null || qaWorkload === void 0 ? void 0 : qaWorkload.issues.some(function (issue) { return issue.includes('Shared delivery issue remains open: Backend contract validation is still open.'); })).to.equal(true);
                    return [2 /*return*/];
            }
        });
    }); });
    it('envia aos papeis paralelos somente work order e contexto escopados ao workload', function () { return __awaiter(void 0, void 0, void 0, function () {
        var context, executor, providerContext, payloadContextPack, workloadInputContextPack;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    context = createExecutionContext(workspaceRootUri, {
                        id: 'backend_work',
                        agent: 'backend',
                        outputs: ['backend/delivery.md'],
                        input: { include: ['contracts/shared.md', 'contracts/work-orders/backend.md'] }
                    });
                    context.workload.id = 'workload-backend';
                    context.workload.stateId = 'backend_work';
                    context.workload.agent = 'backend';
                    context.workload.inputArtifacts = ['contracts/shared.md', 'contracts/work-orders/backend.md'];
                    context.workflow.agents = {
                        backend: 'agents/backend.md',
                        frontend: 'agents/frontend.md',
                        designer: 'agents/designer.md'
                    };
                    context.workflow.states = {
                        backend_work: context.state,
                        frontend_work: {
                            id: 'frontend_work',
                            type: 'agent',
                            agent: 'frontend',
                            input: { include: ['contracts/shared.md', 'contracts/work-orders/frontend.md'] },
                            outputs: ['frontend/delivery.md']
                        },
                        designer_work: {
                            id: 'designer_work',
                            type: 'agent',
                            agent: 'designer',
                            input: { include: ['contracts/shared.md', 'contracts/work-orders/designer.md'] },
                            outputs: ['public/assets/login-hero.png']
                        }
                    };
                    context.run.contextPack = {
                        summary: 'Full plan: backend, frontend, designer and QA must all receive the entire delivery plan.',
                        workflow: {
                            id: context.workflow.id,
                            name: context.workflow.name,
                            stateCount: 3,
                            transitionCount: 2,
                            agentIds: ['backend', 'frontend', 'designer']
                        },
                        files: [
                            { uri: 'agents/backend.md', reason: 'backend agent' },
                            { uri: 'agents/frontend.md', reason: 'frontend agent' },
                            { uri: 'contracts/work-orders/backend.md', reason: 'backend work order' },
                            { uri: 'contracts/work-orders/frontend.md', reason: 'frontend work order' },
                            { uri: 'public/assets/login-hero.png', reason: 'designer output' }
                        ],
                        symbols: [],
                        signals: [
                            { key: 'backend.contract.ready', value: true },
                            { key: 'frontend.contract.ready', value: true }
                        ],
                        sections: [{
                                id: 'retrieval',
                                title: 'Retrieval',
                                items: [
                                    { title: 'contracts/work-orders/backend.md', content: 'Backend route and schema details.', uri: 'contracts/work-orders/backend.md' },
                                    { title: 'contracts/work-orders/frontend.md', content: 'Frontend page plan that backend must not receive.', uri: 'contracts/work-orders/frontend.md' },
                                    { title: 'Full Contracted Parallel Delivery Plan', content: 'backend, frontend, designer and QA plan in one document.' }
                                ]
                            }]
                    };
                    return [4 /*yield*/, addRunArtifact(context, workspaceRootDir, 'contracts/shared.md', '# Shared Contract\n\nUse the approved API and assets.', 'contract_design')];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, addRunArtifact(context, workspaceRootDir, 'contracts/work-orders/backend.md', '# Backend Work Order\n\nImplement the backend route.', 'contract_design')];
                case 2:
                    _a.sent();
                    executor = new MockLlmProviderExecutor(agentMarkdown, [JSON.stringify({
                            result: {
                                status: 'completed',
                                summary: 'Backend done.',
                                artifacts: [{ path: 'backend/delivery.md', content: '# Backend' }],
                                signals: {},
                                issues: []
                            }
                        })]);
                    return [4 /*yield*/, executor.executeAgentWorkload(context)];
                case 3:
                    _a.sent();
                    providerContext = executor.providerPayloads[0].context;
                    payloadContextPack = providerContext.contextPack;
                    (0, chai_1.expect)(payloadContextPack).to.contain('Scoped context for workload "workload-backend"');
                    (0, chai_1.expect)(payloadContextPack).to.contain('contracts/work-orders/backend.md');
                    (0, chai_1.expect)(payloadContextPack).to.not.contain('contracts/work-orders/frontend.md');
                    (0, chai_1.expect)(payloadContextPack).to.not.contain('Full Contracted Parallel Delivery Plan');
                    (0, chai_1.expect)(payloadContextPack).to.not.contain('public/assets/login-hero.png');
                    return [4 /*yield*/, fs.readFile(path.join(workspaceRootDir, '.theia', 'flow', 'runs', context.run.id, 'workloads', context.workload.id, 'input', 'context-pack.md'), 'utf8')];
                case 4:
                    workloadInputContextPack = _a.sent();
                    (0, chai_1.expect)(workloadInputContextPack).to.equal(payloadContextPack);
                    return [2 /*return*/];
            }
        });
    }); });
    it('gera report workload estruturado agregando run, workflow, efeitos e pendencias', function () { return __awaiter(void 0, void 0, void 0, function () {
        var context, executor, reportPath, report, _a, _b;
        var _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    context = createExecutionContext(workspaceRootUri, {
                        id: 'final_report',
                        type: 'report',
                        outputs: ['final/report.json', 'final/report.md']
                    });
                    context.workload.stateId = 'final_report';
                    context.workflow.requires = { capabilities: ['llm.agent.execute', 'filesystem.edit'] };
                    context.workflow.states = {
                        start: { id: 'start', type: 'input', outputs: ['input/prompt.md'] },
                        review_gate: { id: 'review_gate', type: 'gate', gates: [{ id: 'scope_gate', title: 'Approve scope', status: 'approved' }] },
                        repair: { id: 'repair', type: 'agent', agent: 'reviewer', retry: { max: 1 } },
                        final_report: context.state
                    };
                    context.workflow.transitions = [
                        { id: 'start_to_gate', from: 'start', to: 'review_gate', on: 'state.completed' },
                        { id: 'gate_to_repair', from: 'review_gate', to: 'repair', on: 'gate.approved' },
                        { id: 'repair_to_final', from: 'repair', to: 'final_report', on: 'workload.completed' }
                    ];
                    context.run.stateStatuses = {
                        start: 'done',
                        review_gate: 'done',
                        repair: 'done',
                        final_report: 'running'
                    };
                    context.run.workloads.unshift({
                        id: 'workload-repair-2',
                        runId: context.run.id,
                        stateId: 'repair',
                        agent: 'reviewer',
                        attempt: 2,
                        previousWorkloadId: 'workload-repair-1',
                        status: 'done',
                        inputArtifacts: ['qa/report.md'],
                        outputArtifacts: ['file:///repair/report.md'],
                        issues: ['QA failed before repair.'],
                        effectIds: ['effect-file'],
                        outputEnvelope: {
                            status: 'completed',
                            result: { status: 'completed', summary: 'Repair done.', artifacts: [], signals: {}, issues: [{ severity: 'blocking', type: 'qa', summary: 'QA failed before repair.' }] },
                            artifacts: [],
                            effects: [],
                            signals: {},
                            issues: [{ severity: 'blocking', type: 'qa', summary: 'QA failed before repair.' }],
                            report: 'Repair done.'
                        },
                        createdAt: '2026-05-19T00:00:00.000Z',
                        updatedAt: '2026-05-19T00:00:00.000Z'
                    });
                    context.run.gates.push({ id: 'scope_gate', title: 'Approve scope', stateId: 'review_gate', status: 'approved' });
                    context.run.artifacts.push({
                        id: 'artifact-contract',
                        runId: context.run.id,
                        stateId: 'contract',
                        uri: 'file:///contracts/contracts.json',
                        kind: 'contract',
                        summary: 'contracts/contracts.json',
                        createdAt: '2026-05-19T00:00:00.000Z'
                    });
                    context.run.effects.push({
                        id: 'effect-file',
                        runId: context.run.id,
                        stateId: 'repair',
                        kind: 'file',
                        type: 'file.edited',
                        path: 'src/feature.ts',
                        status: 'blocked',
                        approvalPolicy: 'human',
                        summary: 'Repair patch requires approval.'
                    });
                    context.run.memoryCandidates = [{
                            id: 'memory-candidate-1',
                            runId: context.run.id,
                            stateId: 'repair',
                            source: 'artifact',
                            kind: 'decision',
                            content: 'Use contract-first delivery.',
                            reason: 'Captured during repair.',
                            confidence: 0.8,
                            status: 'candidate',
                            createdAt: '2026-05-19T00:00:00.000Z'
                        }];
                    context.run.memoryWrites = [{
                            id: 'memory-write-1',
                            runId: context.run.id,
                            candidateId: 'memory-candidate-1',
                            status: 'written',
                            content: 'Use contract-first delivery.',
                            approvedAt: '2026-05-19T00:00:00.000Z',
                            scope: 'workflow'
                        }];
                    context.run.events.push({ id: 'transition-fired', runId: context.run.id, type: 'transition.fired', timestamp: '2026-05-19T00:00:00.000Z', stateId: 'repair', transitionId: 'repair_to_final', message: 'Transition fired.' }, { id: 'issue-recorded', runId: context.run.id, type: 'issue.recorded', timestamp: '2026-05-19T00:00:00.000Z', stateId: 'repair', workloadId: 'workload-repair-2', message: 'Issue recorded.', payload: { severity: 'blocking', summary: 'QA failed before repair.' } });
                    executor = new flow_workload_executor_1.ProviderBackedFlowWorkloadExecutor();
                    return [4 /*yield*/, executor.executeReportWorkload(context)];
                case 1:
                    _d.sent();
                    (0, chai_1.expect)((_c = context.run.workloads.find(function (workload) { return workload.id === 'workload-1'; })) === null || _c === void 0 ? void 0 : _c.status).to.equal('done');
                    (0, chai_1.expect)(context.run.artifacts.some(function (artifact) { return artifact.kind === 'report' && artifact.uri.endsWith('/final/report.json'); })).to.equal(true);
                    reportPath = path.join(workspaceRootDir, '.theia', 'flow', 'runs', context.run.id, 'workloads', context.workload.id, 'output', 'artifacts', 'final', 'report.json');
                    _b = (_a = JSON).parse;
                    return [4 /*yield*/, fs.readFile(reportPath, 'utf8')];
                case 2:
                    report = _b.apply(_a, [_d.sent()]);
                    (0, chai_1.expect)(report.run.prompt).to.equal('run this task');
                    (0, chai_1.expect)(report.workflow.capabilities).to.deep.equal(['filesystem.edit', 'llm.agent.execute']);
                    (0, chai_1.expect)(report.workflow.transitions.some(function (transition) { return transition.id === 'repair_to_final' && transition.fired === true; })).to.equal(true);
                    (0, chai_1.expect)(report.workloads.some(function (workload) { return workload.id === 'workload-repair-2' && workload.previousWorkloadId === 'workload-repair-1'; })).to.equal(true);
                    (0, chai_1.expect)(report.gates.some(function (gate) { return gate.id === 'scope_gate' && gate.status === 'approved'; })).to.equal(true);
                    (0, chai_1.expect)(report.artifacts.some(function (artifact) { return artifact.id === 'artifact-contract'; })).to.equal(true);
                    (0, chai_1.expect)(report.effects.some(function (effect) { return effect.id === 'effect-file' && effect.status === 'blocked'; })).to.equal(true);
                    (0, chai_1.expect)(report.issues.some(function (issue) { return issue.summary === 'QA failed before repair.'; })).to.equal(true);
                    (0, chai_1.expect)(report.repairs.some(function (repair) { return repair.stateId === 'repair' && repair.attempts === 2; })).to.equal(true);
                    (0, chai_1.expect)(report.memoryWrites.some(function (write) { return write.id === 'memory-write-1'; })).to.equal(true);
                    (0, chai_1.expect)(report.pending.some(function (item) { return item.kind === 'effect' && item.id === 'effect-file'; })).to.equal(true);
                    (0, chai_1.expect)(report.eventLog.length).to.be.greaterThan(0);
                    return [2 /*return*/];
            }
        });
    }); });
    it('executa command workload com politica, saidas redigidas e auditoria', function () { return __awaiter(void 0, void 0, void 0, function () {
        var context, executor, effect;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    context = createExecutionContext(workspaceRootUri, {
                        type: 'command',
                        command: JSON.stringify([process.execPath, '-e', "console.log('token=secret-value'); console.error('done')"]),
                        allowedCommands: [process.execPath],
                        approvalPolicy: 'auto_apply',
                        timeoutMs: 5000
                    });
                    executor = new flow_workload_executor_1.ProviderBackedFlowWorkloadExecutor();
                    return [4 /*yield*/, executor.executeCommandWorkload(context)];
                case 1:
                    _a.sent();
                    effect = context.run.effects.find(function (item) { return item.kind === 'command' && item.type === 'command.executed'; });
                    (0, chai_1.expect)(effect === null || effect === void 0 ? void 0 : effect.status).to.equal('applied');
                    (0, chai_1.expect)(effect === null || effect === void 0 ? void 0 : effect.stdout).to.contain('token=[REDACTED]');
                    (0, chai_1.expect)(effect === null || effect === void 0 ? void 0 : effect.stderr).to.contain('done');
                    (0, chai_1.expect)(effect === null || effect === void 0 ? void 0 : effect.timeoutMs).to.equal(5000);
                    (0, chai_1.expect)(context.run.events.some(function (event) { var _a; return event.type === 'effect.applied' && ((_a = event.payload) === null || _a === void 0 ? void 0 : _a.effectId) === (effect === null || effect === void 0 ? void 0 : effect.id); })).to.equal(true);
                    (0, chai_1.expect)(context.run.artifacts.some(function (artifact) { var _a; return artifact.kind === 'log' && ((_a = artifact.summary) === null || _a === void 0 ? void 0 : _a.includes('Command effect applied')); })).to.equal(true);
                    return [2 /*return*/];
            }
        });
    }); });
    it('falha command workload bloqueado por allowlist sem executar', function () { return __awaiter(void 0, void 0, void 0, function () {
        var marker, context, executor, effect;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    marker = path.join(workspaceRootDir, 'blocked-command.txt');
                    context = createExecutionContext(workspaceRootUri, {
                        type: 'command',
                        command: JSON.stringify([process.execPath, '-e', "require('fs').writeFileSync(".concat(JSON.stringify(marker), ", 'ran')")]),
                        allowedCommands: ['not-node'],
                        approvalPolicy: 'auto_apply'
                    });
                    executor = new flow_workload_executor_1.ProviderBackedFlowWorkloadExecutor();
                    return [4 /*yield*/, executor.executeCommandWorkload(context)];
                case 1:
                    _a.sent();
                    effect = context.run.effects.find(function (item) { return item.kind === 'command' && item.type === 'command.executed'; });
                    (0, chai_1.expect)(effect === null || effect === void 0 ? void 0 : effect.status).to.equal('blocked');
                    (0, chai_1.expect)(effect === null || effect === void 0 ? void 0 : effect.stderr).to.contain('command outside allowlist');
                    (0, chai_1.expect)(context.run.workloads[0].status).to.equal('failed');
                    return [4 /*yield*/, expectRejected(fs.access(marker))];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('registra timeout e stdout grande em command workloads', function () { return __awaiter(void 0, void 0, void 0, function () {
        var timeoutContext, stdoutContext, executor, timeoutEffect, stdoutEffect;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    timeoutContext = createExecutionContext(workspaceRootUri, {
                        type: 'command',
                        command: JSON.stringify([process.execPath, '-e', 'setTimeout(() => undefined, 1000)']),
                        allowedCommands: [process.execPath],
                        approvalPolicy: 'auto_apply',
                        timeoutMs: 50
                    });
                    stdoutContext = createExecutionContext(workspaceRootUri, {
                        type: 'command',
                        command: JSON.stringify([process.execPath, '-e', "process.stdout.write('token=secret-value\\n' + 'x'.repeat(13000))"]),
                        allowedCommands: [process.execPath],
                        approvalPolicy: 'auto_apply',
                        timeoutMs: 5000
                    });
                    executor = new flow_workload_executor_1.ProviderBackedFlowWorkloadExecutor();
                    return [4 /*yield*/, executor.executeCommandWorkload(timeoutContext)];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, executor.executeCommandWorkload(stdoutContext)];
                case 2:
                    _a.sent();
                    timeoutEffect = timeoutContext.run.effects.find(function (item) { return item.kind === 'command' && item.type === 'command.executed'; });
                    (0, chai_1.expect)(timeoutEffect === null || timeoutEffect === void 0 ? void 0 : timeoutEffect.status).to.equal('failed');
                    (0, chai_1.expect)(timeoutEffect === null || timeoutEffect === void 0 ? void 0 : timeoutEffect.timedOut).to.equal(true);
                    (0, chai_1.expect)(timeoutContext.run.workloads[0].status).to.equal('failed');
                    stdoutEffect = stdoutContext.run.effects.find(function (item) { return item.kind === 'command' && item.type === 'command.executed'; });
                    (0, chai_1.expect)(stdoutEffect === null || stdoutEffect === void 0 ? void 0 : stdoutEffect.status).to.equal('applied');
                    (0, chai_1.expect)(stdoutEffect === null || stdoutEffect === void 0 ? void 0 : stdoutEffect.stdout).to.contain('token=[REDACTED]');
                    (0, chai_1.expect)(stdoutEffect === null || stdoutEffect === void 0 ? void 0 : stdoutEffect.stdout).to.contain('[truncated command output]');
                    (0, chai_1.expect)(stdoutEffect === null || stdoutEffect === void 0 ? void 0 : stdoutEffect.stdout).to.not.contain('secret-value');
                    return [2 /*return*/];
            }
        });
    }); });
    it('falha com JSON inválido e marca workload como failed', function () { return __awaiter(void 0, void 0, void 0, function () {
        var context, executor, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    context = createExecutionContext(workspaceRootUri);
                    executor = new MockLlmProviderExecutor(agentMarkdown, [toJsonFailureMessage('this is not json')]);
                    return [4 /*yield*/, executor.executeAgentWorkload(context)];
                case 1:
                    result = _a.sent();
                    (0, chai_1.expect)(result.artifactUri).to.contain('flow://');
                    (0, chai_1.expect)(context.run.workloads[0].status).to.equal('failed');
                    (0, chai_1.expect)(context.run.stateStatuses.agent).to.equal('failed');
                    (0, chai_1.expect)(context.run.events.some(function (event) { return event.type === 'workload.failed'; })).to.equal(true);
                    (0, chai_1.expect)(context.run.effects.some(function (effect) { return effect.summary.includes('failed after 1 attempts'); })).to.equal(true);
                    (0, chai_1.expect)(context.run.workloads[0].outputEnvelope).to.be.undefined;
                    return [2 /*return*/];
            }
        });
    }); });
    it('bloqueia completion quando result.json nao valida contra workload-output.schema.json', function () { return __awaiter(void 0, void 0, void 0, function () {
        var context, executor;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    context = createExecutionContext(workspaceRootUri);
                    executor = new MockLlmProviderExecutor(agentMarkdown, [JSON.stringify({
                            result: {
                                status: 'completed',
                                summary: 'Invalid envelope should not complete.',
                                artifacts: [{ path: 'report.md', content: '# Report' }],
                                signals: {},
                                issues: []
                            },
                            report: 'Execution finished.',
                            effects: [{
                                    type: 42,
                                    summary: 'Notification effects need a path or command in the workload output contract.'
                                }]
                        })]);
                    return [4 /*yield*/, executor.executeAgentWorkload(context)];
                case 1:
                    _a.sent();
                    (0, chai_1.expect)(context.run.workloads[0].status).to.equal('failed');
                    (0, chai_1.expect)(context.run.events.some(function (event) { return event.type === 'workload.failed'; })).to.equal(true);
                    (0, chai_1.expect)(context.run.events.some(function (event) { return event.type === 'workload.completed'; })).to.equal(false);
                    (0, chai_1.expect)(context.run.workloads[0].outputArtifacts.some(function (uri) { return uri.endsWith('/output/result.json'); })).to.equal(false);
                    return [4 /*yield*/, expectRejected(fs.access(path.join(workspaceRootDir, '.theia', 'flow', 'runs', context.run.id, 'workloads', context.run.workloads[0].id, 'output', 'result.json')))];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('rejeita result.artifacts sem content e nao gera fallback', function () { return __awaiter(void 0, void 0, void 0, function () {
        var context, executor;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    context = createExecutionContext(workspaceRootUri);
                    executor = new MockLlmProviderExecutor(agentMarkdown, [JSON.stringify({
                            result: {
                                status: 'completed',
                                summary: 'Missing content should fail.',
                                artifacts: [{ path: 'report.md' }],
                                signals: {},
                                issues: []
                            },
                            report: 'Execution finished.',
                            effects: []
                        })]);
                    return [4 /*yield*/, executor.executeAgentWorkload(context)];
                case 1:
                    _a.sent();
                    (0, chai_1.expect)(context.run.workloads[0].status).to.equal('failed');
                    (0, chai_1.expect)(context.run.events.some(function (event) { return event.type === 'workload.failed'; })).to.equal(true);
                    (0, chai_1.expect)(context.run.effects.some(function (effect) { return effect.summary.includes('result.artifacts[0].content must be a non-empty string'); })).to.equal(true);
                    (0, chai_1.expect)(context.run.workloads[0].outputArtifacts).to.deep.equal([]);
                    return [4 /*yield*/, expectRejected(fs.access(path.join(workspaceRootDir, '.theia', 'flow', 'runs', context.run.id, 'workloads', context.run.workloads[0].id, 'output', 'artifacts', 'report.md')))];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('rejeita artifacts top-level sem content e nao gera fallback', function () { return __awaiter(void 0, void 0, void 0, function () {
        var context, executor;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    context = createExecutionContext(workspaceRootUri);
                    executor = new MockLlmProviderExecutor(agentMarkdown, [JSON.stringify({
                            result: {
                                status: 'completed',
                                summary: 'Top-level artifacts should also fail.',
                                artifacts: [{ path: 'report.md', content: '# Report' }],
                                signals: {},
                                issues: []
                            },
                            report: 'Execution finished.',
                            artifacts: [{ path: 'report.md' }],
                            effects: []
                        })]);
                    return [4 /*yield*/, executor.executeAgentWorkload(context)];
                case 1:
                    _a.sent();
                    (0, chai_1.expect)(context.run.workloads[0].status).to.equal('failed');
                    (0, chai_1.expect)(context.run.events.some(function (event) { return event.type === 'workload.failed'; })).to.equal(true);
                    (0, chai_1.expect)(context.run.effects.some(function (effect) { return effect.summary.includes('artifacts[0].content must be a non-empty string'); })).to.equal(true);
                    (0, chai_1.expect)(context.run.workloads[0].outputArtifacts).to.deep.equal([]);
                    return [4 /*yield*/, expectRejected(fs.access(path.join(workspaceRootDir, '.theia', 'flow', 'runs', context.run.id, 'workloads', context.run.workloads[0].id, 'output', 'artifacts', 'report.md')))];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('rejeita JSON sem artifacts e nao sintetiza report como fallback', function () { return __awaiter(void 0, void 0, void 0, function () {
        var context, executor;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    context = createExecutionContext(workspaceRootUri);
                    executor = new MockLlmProviderExecutor(agentMarkdown, [JSON.stringify({
                            result: {
                                status: 'completed',
                                summary: 'Report-only output should fail.',
                                signals: {},
                                issues: []
                            },
                            report: 'This report must not become report.md.',
                            effects: []
                        })]);
                    return [4 /*yield*/, executor.executeAgentWorkload(context)];
                case 1:
                    _a.sent();
                    (0, chai_1.expect)(context.run.workloads[0].status).to.equal('failed');
                    (0, chai_1.expect)(context.run.events.some(function (event) { return event.type === 'workload.failed'; })).to.equal(true);
                    (0, chai_1.expect)(context.run.effects.some(function (effect) { return effect.summary.includes('result.artifacts must include at least one generated artifact with path and content'); })).to.equal(true);
                    (0, chai_1.expect)(context.run.workloads[0].outputArtifacts).to.deep.equal([]);
                    return [4 /*yield*/, expectRejected(fs.access(path.join(workspaceRootDir, '.theia', 'flow', 'runs', context.run.id, 'workloads', context.run.workloads[0].id, 'output', 'artifacts', 'report.md')))];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('rejeita artifacts vazios e nao sintetiza expected outputs ausentes', function () { return __awaiter(void 0, void 0, void 0, function () {
        var context, executor;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    context = createExecutionContext(workspaceRootUri, {
                        outputs: ['work/summary.md', 'work/evidence.md']
                    });
                    executor = new MockLlmProviderExecutor(agentMarkdown, [JSON.stringify({
                            result: {
                                status: 'completed',
                                summary: 'Partial outputs should fail.',
                                artifacts: [{ path: 'work/summary.md', content: '# Summary' }],
                                signals: {},
                                issues: []
                            },
                            report: 'This report must not fill work/evidence.md.',
                            effects: []
                        })]);
                    return [4 /*yield*/, executor.executeAgentWorkload(context)];
                case 1:
                    _a.sent();
                    (0, chai_1.expect)(context.run.workloads[0].status).to.equal('failed');
                    (0, chai_1.expect)(context.run.events.some(function (event) { return event.type === 'workload.failed'; })).to.equal(true);
                    (0, chai_1.expect)(context.run.effects.some(function (effect) { return effect.summary.includes('missing generated artifacts for expected outputs: work/evidence.md'); })).to.equal(true);
                    (0, chai_1.expect)(context.run.workloads[0].outputArtifacts).to.deep.equal([]);
                    return [4 /*yield*/, expectRejected(fs.access(path.join(workspaceRootDir, '.theia', 'flow', 'runs', context.run.id, 'workloads', context.run.workloads[0].id, 'output', 'artifacts', 'work', 'evidence.md')))];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('falha em timeout quando não há retry sem fallback deterministico', function () { return __awaiter(void 0, void 0, void 0, function () {
        var context, executor, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    context = createExecutionContext(workspaceRootUri);
                    executor = new MockLlmProviderExecutor(agentMarkdown, [new Error('LLM command provider timed out after 120000ms.')]);
                    return [4 /*yield*/, executor.executeAgentWorkload(context)];
                case 1:
                    result = _a.sent();
                    (0, chai_1.expect)(result.artifactUri).to.contain('flow://');
                    (0, chai_1.expect)(context.run.workloads[0].status).to.equal('failed');
                    (0, chai_1.expect)(context.run.effects.some(function (effect) { return effect.summary.includes('LLM command provider timed out'); })).to.equal(true);
                    (0, chai_1.expect)(context.run.effects.some(function (effect) { return effect.summary.includes('used deterministic fallback'); })).to.equal(false);
                    (0, chai_1.expect)(context.run.events.some(function (event) { return event.type === 'workload.retry'; })).to.equal(false);
                    (0, chai_1.expect)(context.run.events.some(function (event) { return event.type === 'workload.failed'; })).to.equal(true);
                    return [2 /*return*/];
            }
        });
    }); });
    it('reexecuta após retry em erro temporário e conclui com sucesso', function () { return __awaiter(void 0, void 0, void 0, function () {
        var context, executor, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    context = createExecutionContext(workspaceRootUri, {
                        retry: {
                            max: 1
                        }
                    });
                    executor = new MockLlmProviderExecutor(agentMarkdown, [
                        new Error('LLM command provider timed out after 120000ms.'),
                        validMockProviderResult()
                    ]);
                    return [4 /*yield*/, executor.executeAgentWorkload(context)];
                case 1:
                    result = _a.sent();
                    (0, chai_1.expect)(executor.calls).to.equal(2);
                    (0, chai_1.expect)(result.artifactUri).to.contain('report.md');
                    (0, chai_1.expect)(context.run.events.filter(function (event) { return event.type === 'workload.retry'; })).to.have.length(1);
                    (0, chai_1.expect)(context.run.workloads[0].status).to.equal('done');
                    (0, chai_1.expect)(context.run.stateStatuses.agent).to.equal('done');
                    (0, chai_1.expect)(context.run.events.some(function (event) { return event.type === 'workload.failed'; })).to.equal(false);
                    return [2 /*return*/];
            }
        });
    }); });
    it('finaliza com falha após atingir limite de retry', function () { return __awaiter(void 0, void 0, void 0, function () {
        var context, executor, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    context = createExecutionContext(workspaceRootUri, {
                        retry: {
                            max: 1
                        }
                    });
                    executor = new MockLlmProviderExecutor(agentMarkdown, [
                        new Error('Temporary provider issue.'),
                        new Error('Persistent provider issue.')
                    ]);
                    return [4 /*yield*/, executor.executeAgentWorkload(context)];
                case 1:
                    result = _a.sent();
                    (0, chai_1.expect)(executor.calls).to.equal(2);
                    (0, chai_1.expect)(result.artifactUri).to.contain('flow://');
                    (0, chai_1.expect)(context.run.workloads[0].status).to.equal('failed');
                    (0, chai_1.expect)(context.run.stateStatuses.agent).to.equal('failed');
                    (0, chai_1.expect)(context.run.events.filter(function (event) { return event.type === 'workload.retry'; })).to.have.length(1);
                    (0, chai_1.expect)(context.run.events.some(function (event) { return event.type === 'workload.failed'; })).to.equal(true);
                    (0, chai_1.expect)(context.run.events.some(function (event) { return event.type === 'effect.proposed'; })).to.equal(true);
                    return [2 /*return*/];
            }
        });
    }); });
});
function expectRejected(action) {
    return __awaiter(this, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, action];
                case 1:
                    _b.sent();
                    return [3 /*break*/, 3];
                case 2:
                    _a = _b.sent();
                    return [2 /*return*/];
                case 3: throw new Error('Expected promise to be rejected.');
            }
        });
    });
}
function withCleanAgentProviderEnv(action) {
    return __awaiter(this, void 0, void 0, function () {
        var keys, snapshot, _i, keys_1, key, _a, keys_2, key, value;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    keys = [
                        'FLOW_AGENT_PROVIDER',
                        'FLOW_AGENT_LLM_COMMAND',
                        'FLOW_AGENT_COMMAND',
                        'FLOW_AGENT_MODEL_ID',
                        'FLOW_AGENT_LLM_MODEL_ID',
                        'FLOW_AGENT_PROVIDER_OPENROUTER_COMMAND'
                    ];
                    snapshot = Object.fromEntries(keys.map(function (key) { return [key, process.env[key]]; }));
                    for (_i = 0, keys_1 = keys; _i < keys_1.length; _i++) {
                        key = keys_1[_i];
                        delete process.env[key];
                    }
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, , 3, 4]);
                    return [4 /*yield*/, action()];
                case 2:
                    _b.sent();
                    return [3 /*break*/, 4];
                case 3:
                    for (_a = 0, keys_2 = keys; _a < keys_2.length; _a++) {
                        key = keys_2[_a];
                        value = snapshot[key];
                        if (value === undefined) {
                            delete process.env[key];
                        }
                        else {
                            process.env[key] = value;
                        }
                    }
                    return [7 /*endfinally*/];
                case 4: return [2 /*return*/];
            }
        });
    });
}

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
var memory_adapter_1 = require("./memory-adapter");
describe('LocalMemoryAdapter', function () {
    var originalMemoryProvider = process.env.FLOW_MEMORY_PROVIDER;
    var originalMemoryFallback = process.env.FLOW_MEMORY_FALLBACK;
    afterEach(function () {
        if (originalMemoryProvider === undefined) {
            delete process.env.FLOW_MEMORY_PROVIDER;
        }
        else {
            process.env.FLOW_MEMORY_PROVIDER = originalMemoryProvider;
        }
        if (originalMemoryFallback === undefined) {
            delete process.env.FLOW_MEMORY_FALLBACK;
        }
        else {
            process.env.FLOW_MEMORY_FALLBACK = originalMemoryFallback;
        }
    });
    it('rejects local context fallback when Memory is missing and fallback is not explicit', function () { return __awaiter(void 0, void 0, void 0, function () {
        var adapter;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    adapter = new memory_adapter_1.LocalMemoryAdapter();
                    return [4 /*yield*/, expectRejected(adapter.buildContextPack('file:///workspace', sampleWorkflow()), 'Memory service is not bound in Flow yet.')];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('builds a lean local context pack only when fallback is explicit', function () { return __awaiter(void 0, void 0, void 0, function () {
        var adapter, pack;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    process.env.FLOW_MEMORY_FALLBACK = 'true';
                    adapter = new memory_adapter_1.LocalMemoryAdapter();
                    return [4 /*yield*/, adapter.buildContextPack('file:///workspace', sampleWorkflow())];
                case 1:
                    pack = _a.sent();
                    (0, chai_1.expect)(pack.workspaceRootUri).to.equal('file:///workspace');
                    (0, chai_1.expect)(pack.workflow).to.deep.equal({
                        id: 'memory_flow',
                        name: 'Memory Flow',
                        stateCount: 2,
                        transitionCount: 1,
                        agentIds: ['architect']
                    });
                    (0, chai_1.expect)(pack.files.map(function (file) { return file.uri; })).to.deep.equal([
                        'agents/architect.md',
                        'memory/finding.md',
                        'request.md'
                    ]);
                    (0, chai_1.expect)(pack.symbols).to.deep.equal([]);
                    (0, chai_1.expect)(pack.missingService).to.contain('Memory service is not bound');
                    return [2 /*return*/];
            }
        });
    }); });
    it('collects memory candidates from effects and signals without auto-persisting memory writes', function () { return __awaiter(void 0, void 0, void 0, function () {
        var adapter, run, candidates;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    adapter = new memory_adapter_1.LocalMemoryAdapter();
                    run = __assign(__assign({}, sampleRun()), { signals: [{
                                key: 'project.memory.decision',
                                value: 'Remember signal content only after review.',
                                stateId: 'remember',
                                runId: 'run-1',
                                createdAt: '2026-05-19T00:01:00.000Z'
                            }] });
                    return [4 /*yield*/, adapter.collectMemoryCandidates(run)];
                case 1:
                    candidates = _a.sent();
                    (0, chai_1.expect)(candidates).to.have.length(2);
                    (0, chai_1.expect)(candidates[0]).to.include({
                        runId: run.id,
                        stateId: 'remember',
                        source: 'effect',
                        status: 'candidate'
                    });
                    (0, chai_1.expect)(candidates[1]).to.include({
                        source: 'signal',
                        status: 'candidate'
                    });
                    (0, chai_1.expect)(run.memoryWrites).to.equal(undefined);
                    return [2 /*return*/];
            }
        });
    }); });
    it('imports memory-related artifacts as candidates for review only', function () { return __awaiter(void 0, void 0, void 0, function () {
        var adapter, run, candidates;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    adapter = new memory_adapter_1.LocalMemoryAdapter();
                    run = __assign(__assign({}, sampleRun()), { effects: [], artifacts: [{
                                id: 'artifact-memory-1',
                                runId: 'run-1',
                                stateId: 'remember',
                                uri: 'flow://run-1/remember/memory-summary.md',
                                kind: 'report',
                                summary: 'Remember this artifact content only after review.',
                                createdAt: '2026-05-19T00:02:00.000Z'
                            }] });
                    return [4 /*yield*/, adapter.collectMemoryCandidates(run)];
                case 1:
                    candidates = _a.sent();
                    (0, chai_1.expect)(candidates).to.have.length(1);
                    (0, chai_1.expect)(candidates[0]).to.include({
                        runId: run.id,
                        stateId: 'remember',
                        source: 'artifact',
                        status: 'candidate',
                        content: 'Remember this artifact content only after review.'
                    });
                    (0, chai_1.expect)(run.memoryWrites).to.equal(undefined);
                    return [2 /*return*/];
            }
        });
    }); });
    it('refuses to persist memory without explicit approval metadata', function () { return __awaiter(void 0, void 0, void 0, function () {
        var adapter, service, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    adapter = new memory_adapter_1.LocalMemoryAdapter();
                    service = new MockMemoryService();
                    Object.defineProperty(adapter, 'memoryService', { value: service });
                    return [4 /*yield*/, adapter.writeApprovedMemory({
                            id: 'write-1',
                            runId: 'run-1',
                            candidateId: 'candidate-1',
                            status: 'failed',
                            content: 'This came from an imported candidate.',
                            approvedAt: '2026-05-19T00:00:00.000Z'
                        }, 'file:///workspace')];
                case 1:
                    result = _a.sent();
                    (0, chai_1.expect)(result.status).to.equal('failed');
                    (0, chai_1.expect)(result.error).to.contain('explicitly approved');
                    (0, chai_1.expect)(service.memories).to.have.length(0);
                    return [2 /*return*/];
            }
        });
    }); });
    it('uses the public Memory service when it is bound', function () { return __awaiter(void 0, void 0, void 0, function () {
        var adapter, service, report, pack;
        var _a, _b, _c, _d, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    adapter = new memory_adapter_1.LocalMemoryAdapter();
                    service = new MockMemoryService();
                    Object.defineProperty(adapter, 'memoryService', { value: service });
                    return [4 /*yield*/, adapter.report()];
                case 1:
                    report = _f.sent();
                    return [4 /*yield*/, adapter.buildContextPack('file:///workspace', sampleWorkflow())];
                case 2:
                    pack = _f.sent();
                    (0, chai_1.expect)(report).to.deep.equal({
                        provider: 'local',
                        available: true,
                        detail: 'Memory is provided by the local CyberVinci service.'
                    });
                    (0, chai_1.expect)(service.searchRequests[0]).to.include({
                        workspacePath: '\\workspace'
                    });
                    (0, chai_1.expect)(pack.summary).to.contain('Memory context pack');
                    (0, chai_1.expect)(pack.files.map(function (file) { return file.uri; })).to.include('src/service.ts');
                    (0, chai_1.expect)(pack.files.map(function (file) { return file.uri; })).to.include('package.json');
                    (0, chai_1.expect)(pack.symbols).to.deep.equal(['MemoryService', 'Service']);
                    (0, chai_1.expect)((_a = pack.sections) === null || _a === void 0 ? void 0 : _a.map(function (section) { return section.id; })).to.include.members([
                        'retrieval',
                        'user_preferences',
                        'decisions',
                        'workspace_patterns',
                        'repository_stack',
                        'relevant_files',
                        'global_memories'
                    ]);
                    (0, chai_1.expect)((_c = (_b = pack.sections) === null || _b === void 0 ? void 0 : _b.find(function (section) { return section.id === 'user_preferences'; })) === null || _c === void 0 ? void 0 : _c.items[0].content).to.contain('concise');
                    (0, chai_1.expect)((_e = (_d = pack.sections) === null || _d === void 0 ? void 0 : _d.find(function (section) { return section.id === 'repository_stack'; })) === null || _e === void 0 ? void 0 : _e.items.map(function (item) { return item.title; })).to.include('typescript');
                    (0, chai_1.expect)(pack.missingService).to.equal(undefined);
                    return [2 /*return*/];
            }
        });
    }); });
    it('does not mask Memory provider failures unless fallback is explicit', function () { return __awaiter(void 0, void 0, void 0, function () {
        var adapter, service;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    adapter = new memory_adapter_1.LocalMemoryAdapter();
                    service = new MockMemoryService();
                    service.searchError = new Error('index unavailable');
                    Object.defineProperty(adapter, 'memoryService', { value: service });
                    return [4 /*yield*/, expectRejected(adapter.buildContextPack('file:///workspace', sampleWorkflow()), 'Memory context failed and local fallback is not explicitly enabled: index unavailable')];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('uses explicit local fallback when the Memory provider fails', function () { return __awaiter(void 0, void 0, void 0, function () {
        var adapter, service, pack;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    process.env.FLOW_MEMORY_PROVIDER = 'local-fallback';
                    adapter = new memory_adapter_1.LocalMemoryAdapter();
                    service = new MockMemoryService();
                    service.searchError = new Error('index unavailable');
                    Object.defineProperty(adapter, 'memoryService', { value: service });
                    return [4 /*yield*/, adapter.buildContextPack('file:///workspace', sampleWorkflow())];
                case 1:
                    pack = _a.sent();
                    (0, chai_1.expect)(pack.summary).to.contain('Workflow "Memory Flow"');
                    (0, chai_1.expect)(pack.missingService).to.equal('Memory context failed: index unavailable');
                    return [2 /*return*/];
            }
        });
    }); });
    it('builds a focused context pack for one parallel workload', function () { return __awaiter(void 0, void 0, void 0, function () {
        var adapter, service, pack;
        var _a, _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    adapter = new memory_adapter_1.LocalMemoryAdapter();
                    service = new MockMemoryService();
                    Object.defineProperty(adapter, 'memoryService', { value: service });
                    return [4 /*yield*/, adapter.buildContextPack('file:///workspace', parallelWorkflow(), sampleWorkload())];
                case 1:
                    pack = _e.sent();
                    (0, chai_1.expect)(pack.workflow.agentIds).to.deep.equal(['backend']);
                    (0, chai_1.expect)(pack.files.map(function (file) { return file.uri; })).to.include.members([
                        'agents/backend.md',
                        'contracts/shared.md',
                        'backend/report.md',
                        'src/service.ts'
                    ]);
                    (0, chai_1.expect)(pack.files.map(function (file) { return file.uri; })).to.not.include('agents/frontend.md');
                    (0, chai_1.expect)(pack.files.map(function (file) { return file.uri; })).to.not.include('ui/mockup.tsx');
                    (0, chai_1.expect)(service.searchRequests[0]).to.deep.include({
                        limit: 5
                    });
                    (0, chai_1.expect)(service.contextPackRequests[0]).to.deep.include({
                        tokenBudget: 2500
                    });
                    (0, chai_1.expect)((_b = (_a = pack.sections) === null || _a === void 0 ? void 0 : _a.find(function (section) { return section.id === 'relevant_files'; })) === null || _b === void 0 ? void 0 : _b.items.map(function (item) { return item.uri; })).to.deep.equal(['src/service.ts']);
                    (0, chai_1.expect)((_d = (_c = pack.sections) === null || _c === void 0 ? void 0 : _c.find(function (section) { return section.id === 'retrieval'; })) === null || _d === void 0 ? void 0 : _d.items).to.have.length(2);
                    return [2 /*return*/];
            }
        });
    }); });
    it('reports an external Memory provider when the bound service declares one', function () { return __awaiter(void 0, void 0, void 0, function () {
        var adapter, service, report;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    adapter = new memory_adapter_1.LocalMemoryAdapter();
                    service = new MockMemoryService();
                    service.providerKind = 'external';
                    Object.defineProperty(adapter, 'memoryService', { value: service });
                    return [4 /*yield*/, adapter.report()];
                case 1:
                    report = _a.sent();
                    (0, chai_1.expect)(report).to.deep.equal({
                        provider: 'external',
                        available: true,
                        detail: 'Memory is provided by an external host adapter.'
                    });
                    return [2 /*return*/];
            }
        });
    }); });
    it('reports Memory as missing when explicitly disabled', function () { return __awaiter(void 0, void 0, void 0, function () {
        var adapter, service, report;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    process.env.FLOW_MEMORY_PROVIDER = 'none';
                    adapter = new memory_adapter_1.LocalMemoryAdapter();
                    service = new MockMemoryService();
                    Object.defineProperty(adapter, 'memoryService', { value: service });
                    return [4 /*yield*/, adapter.report()];
                case 1:
                    report = _a.sent();
                    (0, chai_1.expect)(report).to.deep.equal({
                        provider: 'missing',
                        available: false,
                        missingService: 'Memory provider is explicitly disabled for Flow.'
                    });
                    return [2 /*return*/];
            }
        });
    }); });
    it('writes approved memories through the public Memory service', function () { return __awaiter(void 0, void 0, void 0, function () {
        var adapter, service, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    adapter = new memory_adapter_1.LocalMemoryAdapter();
                    service = new MockMemoryService();
                    Object.defineProperty(adapter, 'memoryService', { value: service });
                    return [4 /*yield*/, adapter.writeApprovedMemory({
                            id: 'write-1',
                            runId: 'run-1',
                            candidateId: 'candidate-1',
                            status: 'approved',
                            content: 'Keep Flow memory writes explicit.',
                            approvedAt: '2026-05-19T00:00:00.000Z'
                        }, 'file:///workspace')];
                case 1:
                    result = _a.sent();
                    (0, chai_1.expect)(result.status).to.equal('written');
                    (0, chai_1.expect)(service.memories).to.have.length(1);
                    (0, chai_1.expect)(service.memories[0]).to.include({
                        scope: 'workspace',
                        workspacePath: '\\workspace',
                        memoryType: 'manual_note',
                        content: 'Keep Flow memory writes explicit.',
                        source: 'flow'
                    });
                    return [2 /*return*/];
            }
        });
    }); });
    it('returns failed memory writes when the Memory provider rejects the write', function () { return __awaiter(void 0, void 0, void 0, function () {
        var adapter, service, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    adapter = new memory_adapter_1.LocalMemoryAdapter();
                    service = new MockMemoryService();
                    service.addMemoryError = new Error('memory store is read-only');
                    Object.defineProperty(adapter, 'memoryService', { value: service });
                    return [4 /*yield*/, adapter.writeApprovedMemory(memoryWrite({ id: 'write-failure' }), 'file:///workspace')];
                case 1:
                    result = _a.sent();
                    (0, chai_1.expect)(result).to.include({
                        id: 'write-failure',
                        status: 'failed',
                        error: 'memory store is read-only'
                    });
                    (0, chai_1.expect)(service.memories).to.have.length(0);
                    return [2 /*return*/];
            }
        });
    }); });
    it('maps Flow memory scopes to Memory memory scopes', function () { return __awaiter(void 0, void 0, void 0, function () {
        var adapter, service;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    adapter = new memory_adapter_1.LocalMemoryAdapter();
                    service = new MockMemoryService();
                    Object.defineProperty(adapter, 'memoryService', { value: service });
                    return [4 /*yield*/, adapter.writeApprovedMemory(memoryWrite({ id: 'write-ide', scope: 'ide' }), 'file:///workspace')];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, adapter.writeApprovedMemory(memoryWrite({ id: 'write-workspace', scope: 'workspace' }), 'file:///workspace')];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, adapter.writeApprovedMemory(memoryWrite({ id: 'write-project', scope: 'project' }), 'file:///workspace')];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, adapter.writeApprovedMemory(memoryWrite({ id: 'write-workflow', scope: 'workflow', target: 'workflow-target' }), 'file:///workspace')];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, adapter.writeApprovedMemory(memoryWrite({ id: 'write-run', scope: 'run', target: 'run-target' }), 'file:///workspace')];
                case 5:
                    _a.sent();
                    return [4 /*yield*/, adapter.writeApprovedMemory(memoryWrite({ id: 'write-agent', scope: 'agent', target: 'agent-target' }), 'file:///workspace')];
                case 6:
                    _a.sent();
                    (0, chai_1.expect)(service.memories[0]).to.deep.include({
                        scope: 'global'
                    });
                    (0, chai_1.expect)(service.memories[0]).to.not.have.property('workspacePath');
                    (0, chai_1.expect)(service.memories[1]).to.deep.include({
                        scope: 'workspace',
                        workspacePath: '\\workspace'
                    });
                    (0, chai_1.expect)(service.memories[2]).to.deep.include({
                        scope: 'repository',
                        workspacePath: '\\workspace',
                        repositoryId: 'flow-project-workspace'
                    });
                    (0, chai_1.expect)(service.memories[3]).to.deep.include({
                        scope: 'task',
                        workspacePath: '\\workspace',
                        taskId: 'flow-workflow-workflow-target',
                        retentionPolicy: 'permanent'
                    });
                    (0, chai_1.expect)(service.memories[4]).to.deep.include({
                        scope: 'task',
                        workspacePath: '\\workspace',
                        taskId: 'flow-run-run-target',
                        retentionPolicy: 'manual'
                    });
                    (0, chai_1.expect)(service.memories[5]).to.deep.include({
                        scope: 'task',
                        workspacePath: '\\workspace',
                        taskId: 'flow-agent-agent-target',
                        retentionPolicy: 'permanent'
                    });
                    return [2 /*return*/];
            }
        });
    }); });
});
function memoryWrite(partial) {
    return __assign({ id: 'write-1', runId: 'run-1', candidateId: 'candidate-1', status: 'approved', content: 'Keep scoped memory explicit.', approvedAt: '2026-05-19T00:00:00.000Z' }, partial);
}
function expectRejected(promise, message) {
    return __awaiter(this, void 0, void 0, function () {
        var error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, promise];
                case 1:
                    _a.sent();
                    return [3 /*break*/, 3];
                case 2:
                    error_1 = _a.sent();
                    (0, chai_1.expect)(error_1).to.be.instanceOf(Error);
                    (0, chai_1.expect)(error_1.message).to.contain(message);
                    return [2 /*return*/];
                case 3: throw new Error("Expected promise to reject with \"".concat(message, "\"."));
            }
        });
    });
}
function sampleWorkflow() {
    return {
        version: 'flow.workflow/v1',
        id: 'memory_flow',
        name: 'Memory Flow',
        agents: {
            architect: 'agents/architect.md'
        },
        states: {
            intake: {
                type: 'input',
                input: { include: ['request.md'] }
            },
            remember: {
                type: 'memory_write',
                outputs: ['memory/finding.md']
            }
        },
        transitions: [
            { from: 'intake', to: 'remember', on: 'workload.completed' }
        ]
    };
}
function sampleRun() {
    return {
        id: 'run-1',
        workflowId: 'memory_flow',
        prompt: 'remember this',
        status: 'running',
        createdAt: '2026-05-19T00:00:00.000Z',
        updatedAt: '2026-05-19T00:00:00.000Z',
        currentStateIds: ['remember'],
        stateStatuses: { remember: 'running' },
        workloads: [],
        events: [],
        artifacts: [],
        effects: [{
                id: 'effect-1',
                runId: 'run-1',
                stateId: 'remember',
                kind: 'memory_write',
                status: 'proposed',
                summary: 'Remember that the adapter must require explicit approval.'
            }],
        signals: [],
        gates: [],
        tick: 0
    };
}
function parallelWorkflow() {
    return {
        version: 'flow.workflow/v1',
        id: 'parallel_delivery',
        name: 'Parallel Delivery',
        agents: {
            backend: 'agents/backend.md',
            frontend: 'agents/frontend.md'
        },
        states: {
            backend_work: {
                type: 'agent',
                agent: 'backend',
                input: { include: ['contracts/shared.md'] },
                outputs: ['backend/report.md']
            },
            frontend_work: {
                type: 'agent',
                agent: 'frontend',
                input: { include: ['contracts/shared.md'] },
                outputs: ['frontend/report.md']
            }
        },
        transitions: []
    };
}
function sampleWorkload() {
    return {
        id: 'backend-workload',
        runId: 'run-1',
        stateId: 'backend_work',
        agent: 'backend',
        status: 'running',
        inputArtifacts: ['contracts/shared.md'],
        outputArtifacts: [],
        issues: [],
        effectIds: [],
        createdAt: '2026-05-19T00:00:00.000Z',
        updatedAt: '2026-05-19T00:00:00.000Z'
    };
}
var MockMemoryService = /** @class */ (function () {
    function MockMemoryService() {
        this.searchRequests = [];
        this.contextPackRequests = [];
        this.memories = [];
    }
    MockMemoryService.prototype.search = function (request) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (this.searchError) {
                    throw this.searchError;
                }
                this.searchRequests.push(request);
                return [2 /*return*/, [{
                            id: 'result-1',
                            sourceKind: 'code',
                            title: 'Service',
                            snippet: 'service excerpt',
                            score: 0.9,
                            uri: 'src/service.ts'
                        }]];
            });
        });
    };
    MockMemoryService.prototype.buildContextPack = function (request) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.contextPackRequests.push(request);
                return [2 /*return*/, {
                        workspacePath: 'C:\\workspace',
                        promptSignature: 'signature',
                        estimatedTokens: 42,
                        sections: [{ id: 'section-1', title: 'Relevant context', content: 'service excerpt' }],
                        citations: [{ resultId: 'result-1', sourceKind: 'code', title: 'Service', uri: 'src/service.ts' }]
                    }];
            });
        });
    };
    MockMemoryService.prototype.getDashboard = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, {
                        settings: {
                            enabled: true,
                            memoryEnabled: true,
                            graphEnabled: true
                        },
                        files: [
                            { path: 'package.json', language: 'json', lineCount: 40, tags: ['npm'] },
                            { path: 'src/service.ts', language: 'typescript', lineCount: 120, tags: ['theia'] }
                        ],
                        symbols: [
                            { name: 'MemoryService', fullName: 'MemoryService', languageId: 'typescript' }
                        ],
                        memories: [
                            {
                                title: 'Prefer concise implementation notes',
                                content: 'The user prefers concise implementation notes with concrete verification.',
                                scope: 'global',
                                memoryType: 'preference',
                                tags: ['preference']
                            },
                            {
                                title: 'Flow keeps workflow file authoritative',
                                content: 'Canvas edits must update the workflow file instead of owning orchestration logic.',
                                scope: 'workspace',
                                memoryType: 'decision',
                                tags: ['adr']
                            },
                            {
                                title: 'Global tool memory',
                                content: 'Use repository scripts when available.',
                                scope: 'global',
                                memoryType: 'manual_note',
                                tags: ['tooling']
                            }
                        ],
                        skills: [
                            {
                                name: 'Theia extension conventions',
                                description: 'Keep extensions removable.',
                                guidance: ['Use narrow adapter boundaries.']
                            }
                        ],
                        graphs: {
                            preferences: {
                                nodes: [{ label: 'Concise communication', detail: 'Prefer compact status updates.' }]
                            },
                            projectMemories: {
                                nodes: [{ label: 'Adapter boundary', detail: 'Memory remains behind an adapter.' }]
                            },
                            code: {
                                nodes: []
                            }
                        }
                    }];
            });
        });
    };
    MockMemoryService.prototype.addMemory = function (memory) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (this.addMemoryError) {
                    throw this.addMemoryError;
                }
                this.memories.push(memory);
                return [2 /*return*/, __assign({ id: 'memory-1', status: 'active', staleStatus: 'fresh', createdAt: '2026-05-19T00:00:00.000Z', updatedAt: '2026-05-19T00:00:00.000Z', acceptedCount: 0, rejectedCount: 0 }, memory)];
            });
        });
    };
    return MockMemoryService;
}());

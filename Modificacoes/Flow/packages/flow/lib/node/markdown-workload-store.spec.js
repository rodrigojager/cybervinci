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
var markdown_workload_store_1 = require("./markdown-workload-store");
describe('MarkdownWorkloadStore', function () {
    var tempDir;
    var workspaceRootUri;
    var store;
    beforeEach(function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fs.mkdtemp(path.join(os.tmpdir(), 'flow-workload-store-'))];
                case 1:
                    tempDir = _a.sent();
                    workspaceRootUri = file_uri_1.FileUri.create(tempDir).toString();
                    store = new markdown_workload_store_1.MarkdownWorkloadStore();
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
    it('materializes workload input and output envelopes outside the Theia package', function () { return __awaiter(void 0, void 0, void 0, function () {
        var run, workload, workloadDir, result, _a, _b, report, workOrder, auditLinks, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0: return [4 /*yield*/, store.materializeRun(workspaceRootUri, workflow, sampleRun())];
                case 1:
                    run = _e.sent();
                    workload = run.workloads[0];
                    workloadDir = path.join(tempDir, '.theia', 'flow', 'runs', run.id, 'workloads', workload.id);
                    _b = (_a = JSON).parse;
                    return [4 /*yield*/, fs.readFile(path.join(workloadDir, 'output', 'result.json'), 'utf8')];
                case 2:
                    result = _b.apply(_a, [_e.sent()]);
                    return [4 /*yield*/, fs.readFile(path.join(workloadDir, 'output', 'report.md'), 'utf8')];
                case 3:
                    report = _e.sent();
                    return [4 /*yield*/, fs.readFile(path.join(workloadDir, 'input', 'work-order.md'), 'utf8')];
                case 4:
                    workOrder = _e.sent();
                    _d = (_c = JSON).parse;
                    return [4 /*yield*/, fs.readFile(path.join(workloadDir, 'output', 'audit-links.json'), 'utf8')];
                case 5:
                    auditLinks = _d.apply(_c, [_e.sent()]);
                    (0, chai_1.expect)(result.status).to.equal('completed');
                    (0, chai_1.expect)(result.artifacts.map(function (artifact) { return artifact.path; })).to.deep.equal(['reports/build.md']);
                    (0, chai_1.expect)(report).to.contain('Status: completed');
                    (0, chai_1.expect)(report).to.contain('## Audit links');
                    (0, chai_1.expect)(workOrder).to.contain('agents/builder.md');
                    (0, chai_1.expect)(run.artifacts.some(function (artifact) { return artifact.uri.startsWith(file_uri_1.FileUri.create(workloadDir).toString()); })).to.equal(true);
                    (0, chai_1.expect)(run.artifacts.some(function (artifact) { return artifact.summary === 'Audit links for build.'; })).to.equal(true);
                    (0, chai_1.expect)(workload.reportUri).to.contain('/output/report.md');
                    (0, chai_1.expect)(workload.effectIds.some(function (effectId) { return effectId.includes('workload-envelope'); })).to.equal(true);
                    (0, chai_1.expect)(auditLinks.schemaVersion).to.equal('flow.workload.audit-links/v1');
                    (0, chai_1.expect)(auditLinks.links.map(function (link) { return link.kind; })).to.include.members([
                        'prompt',
                        'context_pack',
                        'work_order',
                        'result',
                        'report',
                        'effects',
                        'issues',
                        'memory_candidates',
                        'artifact'
                    ]);
                    (0, chai_1.expect)(auditLinks.links.find(function (link) { return link.kind === 'prompt'; })).to.include({
                        path: 'input/prompt.md',
                        source: 'run.prompt'
                    });
                    (0, chai_1.expect)(auditLinks.links.find(function (link) { return link.kind === 'artifact'; })).to.include({
                        path: 'output/artifacts/reports/build.md',
                        source: 'reports/build.md'
                    });
                    return [2 /*return*/];
            }
        });
    }); });
    it('materializes included input artifact contents into input/artifacts', function () { return __awaiter(void 0, void 0, void 0, function () {
        var run, materialized, workload, workloadDir, inputArtifact;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    run = sampleRun();
                    return [4 /*yield*/, addRunArtifact(run, tempDir, 'request.md', '# Request\n\nImplement the feature.')];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, store.materializeRun(workspaceRootUri, workflow, run)];
                case 2:
                    materialized = _a.sent();
                    workload = materialized.workloads[0];
                    workloadDir = path.join(tempDir, '.theia', 'flow', 'runs', materialized.id, 'workloads', workload.id);
                    return [4 /*yield*/, fs.readFile(path.join(workloadDir, 'input', 'artifacts', 'request.md'), 'utf8')];
                case 3:
                    inputArtifact = _a.sent();
                    (0, chai_1.expect)(inputArtifact).to.equal('# Request\n\nImplement the feature.');
                    return [2 /*return*/];
            }
        });
    }); });
    it('aggregates workload issues by normalized severity and dedupes repeated findings', function () { return __awaiter(void 0, void 0, void 0, function () {
        var run, issuesDir, blocking, nonBlocking, followup, summary, _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, store.materializeRun(workspaceRootUri, workflow, issueRun())];
                case 1:
                    run = _c.sent();
                    issuesDir = path.join(tempDir, '.theia', 'flow', 'runs', run.id, 'issues');
                    return [4 /*yield*/, readJsonLines(path.join(issuesDir, 'blocking.jsonl'))];
                case 2:
                    blocking = _c.sent();
                    return [4 /*yield*/, readJsonLines(path.join(issuesDir, 'non_blocking.jsonl'))];
                case 3:
                    nonBlocking = _c.sent();
                    return [4 /*yield*/, readJsonLines(path.join(issuesDir, 'followup.jsonl'))];
                case 4:
                    followup = _c.sent();
                    _b = (_a = JSON).parse;
                    return [4 /*yield*/, fs.readFile(path.join(issuesDir, 'summary.json'), 'utf8')];
                case 5:
                    summary = _b.apply(_a, [_c.sent()]);
                    (0, chai_1.expect)(blocking).to.have.length(1);
                    (0, chai_1.expect)(blocking[0]).to.include({
                        severity: 'blocking',
                        sourceSeverity: 'critical',
                        summary: 'Contract route is missing.'
                    });
                    (0, chai_1.expect)(nonBlocking.map(function (issue) { return issue.summary; })).to.deep.equal(['Minor copy issue.']);
                    (0, chai_1.expect)(followup.map(function (issue) { return issue.summary; })).to.deep.equal(['Add visual regression coverage.']);
                    (0, chai_1.expect)(summary.counts).to.deep.equal({
                        all: 3,
                        blocking: 1,
                        non_blocking: 1,
                        followup: 1
                    });
                    return [2 /*return*/];
            }
        });
    }); });
    it('rejects artifact output paths that escape the workload artifact directory', function () { return __awaiter(void 0, void 0, void 0, function () {
        var run;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    run = sampleRun();
                    run.workloads[0] = __assign(__assign({}, run.workloads[0]), { outputEnvelope: {
                            status: 'completed',
                            result: {
                                status: 'completed',
                                summary: 'Bad artifact.',
                                artifacts: [{ id: 'bad', path: '../outside.md', type: 'report' }],
                                signals: {},
                                issues: []
                            },
                            artifacts: [{ id: 'bad', path: '../outside.md', type: 'report' }],
                            effects: [],
                            signals: {},
                            issues: [],
                            report: 'Bad artifact.'
                        } });
                    return [4 /*yield*/, expectRejected(store.materializeRun(workspaceRootUri, workflow, run))];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, expectRejected(fs.readFile(path.join(tempDir, '.theia', 'flow', 'runs', run.id, 'workloads', 'outside.md'), 'utf8'))];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('redacts secrets from visible workload prompts, reports, envelopes, and context packs', function () { return __awaiter(void 0, void 0, void 0, function () {
        var source, run, workloadDir, prompt, context, report, result, effects, issues, _i, _a, content;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    source = sampleRun();
                    source.prompt = 'Build with token=secret-value';
                    source.contextPack = __assign(__assign({}, source.contextPack), { summary: 'Context password=verysecretvalue' });
                    source.workloads[0].outputEnvelope = {
                        status: 'completed',
                        result: {
                            status: 'completed',
                            summary: 'Summary API_KEY=abcdefghijklmnop',
                            artifacts: [],
                            signals: {},
                            issues: [{ severity: 'high', type: 'secret', summary: 'Found token=abcdefghijklmnopqrst' }]
                        },
                        artifacts: [],
                        effects: [{ type: 'command', summary: 'stdout password=verysecretvalue', stdout: 'token=abcdefghijklmnopqrst' }],
                        signals: {},
                        issues: [{ severity: 'high', type: 'secret', summary: 'Found token=abcdefghijklmnopqrst' }],
                        report: 'Report token=abcdefghijklmnopqrst'
                    };
                    return [4 /*yield*/, store.materializeRun(workspaceRootUri, workflow, source)];
                case 1:
                    run = _b.sent();
                    workloadDir = path.join(tempDir, '.theia', 'flow', 'runs', run.id, 'workloads', run.workloads[0].id);
                    return [4 /*yield*/, fs.readFile(path.join(workloadDir, 'input', 'prompt.md'), 'utf8')];
                case 2:
                    prompt = _b.sent();
                    return [4 /*yield*/, fs.readFile(path.join(workloadDir, 'input', 'context-pack.md'), 'utf8')];
                case 3:
                    context = _b.sent();
                    return [4 /*yield*/, fs.readFile(path.join(workloadDir, 'output', 'report.md'), 'utf8')];
                case 4:
                    report = _b.sent();
                    return [4 /*yield*/, fs.readFile(path.join(workloadDir, 'output', 'result.json'), 'utf8')];
                case 5:
                    result = _b.sent();
                    return [4 /*yield*/, fs.readFile(path.join(workloadDir, 'output', 'effects.json'), 'utf8')];
                case 6:
                    effects = _b.sent();
                    return [4 /*yield*/, fs.readFile(path.join(workloadDir, 'output', 'issues.jsonl'), 'utf8')];
                case 7:
                    issues = _b.sent();
                    for (_i = 0, _a = [prompt, context, report, result, effects, issues]; _i < _a.length; _i++) {
                        content = _a[_i];
                        (0, chai_1.expect)(content).to.contain('[REDACTED]');
                        (0, chai_1.expect)(content).to.not.contain('secret-value');
                        (0, chai_1.expect)(content).to.not.contain('verysecretvalue');
                        (0, chai_1.expect)(content).to.not.contain('abcdefghijklmnopqrst');
                    }
                    return [2 /*return*/];
            }
        });
    }); });
    it('refreshes materialized workload output when effects change after the first materialization', function () { return __awaiter(void 0, void 0, void 0, function () {
        var source, first, workloadDir, effects, _a, _b, report;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    source = sampleRun();
                    source.workloads[0].outputEnvelope = {
                        status: 'completed',
                        result: {
                            status: 'completed',
                            summary: 'Effect proposed.',
                            artifacts: [],
                            signals: {},
                            issues: []
                        },
                        artifacts: [],
                        effects: [{ type: 'file.edited', path: 'src/index.ts', summary: 'Updated source.', status: 'proposed' }],
                        signals: {},
                        issues: [],
                        report: 'Effect proposed.'
                    };
                    return [4 /*yield*/, store.materializeRun(workspaceRootUri, workflow, source)];
                case 1:
                    first = _c.sent();
                    first.workloads[0].outputEnvelope.effects = [{ type: 'file.edited', path: 'src/index.ts', summary: 'Updated source.', status: 'applied' }];
                    first.workloads[0].outputEnvelope.result.summary = 'Effect applied.';
                    return [4 /*yield*/, store.materializeRun(workspaceRootUri, workflow, first)];
                case 2:
                    _c.sent();
                    workloadDir = path.join(tempDir, '.theia', 'flow', 'runs', first.id, 'workloads', first.workloads[0].id);
                    _b = (_a = JSON).parse;
                    return [4 /*yield*/, fs.readFile(path.join(workloadDir, 'output', 'effects.json'), 'utf8')];
                case 3:
                    effects = _b.apply(_a, [_c.sent()]);
                    return [4 /*yield*/, fs.readFile(path.join(workloadDir, 'output', 'report.md'), 'utf8')];
                case 4:
                    report = _c.sent();
                    (0, chai_1.expect)(effects[0].status).to.equal('applied');
                    (0, chai_1.expect)(report).to.contain('Effect applied.');
                    return [2 /*return*/];
            }
        });
    }); });
});
var workflow = {
    version: 'flow.workflow/v1',
    id: 'markdown_runtime',
    name: 'Markdown Runtime',
    agents: {
        builder: 'agents/builder.md'
    },
    states: {
        build: {
            type: 'agent',
            agent: 'builder',
            input: { include: ['request.md'] },
            outputs: ['reports/build.md']
        }
    },
    transitions: []
};
function sampleRun() {
    return {
        id: 'run-1',
        workflowId: workflow.id,
        prompt: 'Build it',
        status: 'running',
        createdAt: '2026-05-19T00:00:00.000Z',
        updatedAt: '2026-05-19T00:00:01.000Z',
        currentStateIds: ['build'],
        stateStatuses: { build: 'done' },
        workloads: [{
                id: 'workload-1',
                runId: 'run-1',
                stateId: 'build',
                agent: 'builder',
                status: 'done',
                inputArtifacts: ['request.md'],
                outputArtifacts: [],
                issues: [],
                effectIds: [],
                createdAt: '2026-05-19T00:00:00.000Z',
                updatedAt: '2026-05-19T00:00:01.000Z'
            }],
        events: [],
        artifacts: [],
        effects: [],
        signals: [{
                key: 'build.status',
                value: 'completed',
                stateId: 'build',
                runId: 'run-1',
                createdAt: '2026-05-19T00:00:01.000Z'
            }],
        gates: [],
        contextPack: {
            summary: 'Focused context.',
            workflow: {
                id: workflow.id,
                name: workflow.name,
                stateCount: 1,
                transitionCount: 0,
                agentIds: ['builder']
            },
            files: [],
            symbols: [],
            signals: []
        },
        tick: 1
    };
}
function issueRun() {
    var run = sampleRun();
    return __assign(__assign({}, run), { id: 'run-issues', workloads: [__assign(__assign({}, run.workloads[0]), { id: 'backend-workload', runId: 'run-issues', outputEnvelope: outputEnvelope([
                    { severity: 'critical', type: 'contract', summary: 'Contract route is missing.', impact: 'API cannot be called.' },
                    { severity: 'low', type: 'copy', summary: 'Minor copy issue.' }
                ]) }), __assign(__assign({}, run.workloads[0]), { id: 'frontend-workload', runId: 'run-issues', outputEnvelope: outputEnvelope([
                    { severity: 'blocker', type: 'contract', summary: 'Contract route is missing.', impact: 'API cannot be called.' },
                    { severity: 'info', type: 'qa_followup', summary: 'Add visual regression coverage.' }
                ]) })] });
}
function outputEnvelope(issues) {
    return {
        status: 'completed',
        result: {
            status: 'completed',
            summary: 'Completed with findings.',
            artifacts: [],
            signals: {},
            issues: issues
        },
        artifacts: [],
        effects: [],
        signals: {},
        issues: issues,
        report: 'Completed with findings.'
    };
}
function addRunArtifact(run, workspaceDir, artifactPath, content) {
    return __awaiter(this, void 0, void 0, function () {
        var filePath;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    filePath = path.join.apply(path, __spreadArray([workspaceDir, 'seed-artifacts'], artifactPath.split('/'), false));
                    return [4 /*yield*/, fs.mkdir(path.dirname(filePath), { recursive: true })];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, fs.writeFile(filePath, content, 'utf8')];
                case 2:
                    _a.sent();
                    run.artifacts.push({
                        id: "artifact-".concat(artifactPath.replace(/[^a-zA-Z0-9]/g, '-')),
                        runId: run.id,
                        stateId: 'build',
                        uri: file_uri_1.FileUri.create(filePath).toString(),
                        kind: 'report',
                        summary: artifactPath,
                        createdAt: '2026-05-19T00:00:00.000Z'
                    });
                    return [2 /*return*/];
            }
        });
    });
}
function readJsonLines(file) {
    return __awaiter(this, void 0, void 0, function () {
        var content;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fs.readFile(file, 'utf8')];
                case 1:
                    content = _a.sent();
                    return [2 /*return*/, content.split(/\r?\n/)
                            .map(function (line) { return line.trim(); })
                            .filter(Boolean)
                            .map(function (line) { return JSON.parse(line); })];
            }
        });
    });
}
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

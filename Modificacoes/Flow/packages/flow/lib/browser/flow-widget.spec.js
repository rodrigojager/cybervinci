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
var jsdom_1 = require("@theia/core/lib/browser/test/jsdom");
var disableJSDOM = (0, jsdom_1.enableJSDOM)();
var frontend_application_config_provider_1 = require("@theia/core/lib/browser/frontend-application-config-provider");
frontend_application_config_provider_1.FrontendApplicationConfigProvider.set({});
var chai_1 = require("chai");
var flow_artifacts_1 = require("./flow-artifacts");
var flow_client_1 = require("./flow-client");
var flow_widget_1 = require("./flow-widget");
var flow_capabilities_1 = require("../common/flow-capabilities");
var flow_derivation_1 = require("../common/flow-derivation");
var flow_events_1 = require("../common/flow-events");
describe('Flow browser integration', function () {
    after(function () { return disableJSDOM(); });
    it('resolves flow artifact URIs to materialized workspace files', function () {
        var uri = (0, flow_artifacts_1.artifactUriToOpenUri)('flow://run-1/frontend/reports/final.md', 'file:///workspace/project');
        (0, chai_1.expect)(uri.toString()).to.equal('file:///workspace/project/.theia/flow/runs/run-1/frontend/output/artifacts/reports/final.md');
    });
    it('keeps external and relative artifact URIs openable', function () {
        (0, chai_1.expect)((0, flow_artifacts_1.artifactUriToOpenUri)('https://example.com/report.md', 'file:///workspace/project').toString())
            .to.equal('https://example.com/report.md');
        (0, chai_1.expect)((0, flow_artifacts_1.artifactUriToOpenUri)('reports/local.md', 'file:///workspace/project').toString())
            .to.equal('file:///workspace/project/reports/local.md');
    });
    it('streams run updates through the browser client and refreshes canvas and kanban projections', function () {
        var _a, _b, _c, _d;
        var client = new flow_client_1.FlowClientImpl();
        var workflow = workflowFixture();
        var updates = [];
        var dispose = client.onRunUpdate(function (update) { return updates.push(__assign(__assign({}, update.run), { events: (0, flow_events_1.normalizeFlowEvents)(update.run.events) })); });
        client.onRunUpdated({ workspaceRootUri: 'file:///workspace/project', run: pendingRun(), reason: 'started' });
        client.onRunUpdated({ workspaceRootUri: 'file:///workspace/project', run: runningRun(), reason: 'tick' });
        dispose();
        client.onRunUpdated({ workspaceRootUri: 'file:///workspace/project', run: completedRun(), reason: 'tick' });
        (0, chai_1.expect)(updates).to.have.length(2);
        (0, chai_1.expect)(updates[1].events.map(function (event) { return event.id; })).to.deep.equal(['1', '2', '3', '4', '5']);
        (0, chai_1.expect)(updates[1].events[2].message).to.equal('frontend produced report');
        var canvas = (0, flow_derivation_1.deriveFlowCanvasModel)(workflow, updates[1]);
        (0, chai_1.expect)((_a = canvas.nodes.find(function (node) { return node.id === 'frontend'; })) === null || _a === void 0 ? void 0 : _a.status).to.equal('running');
        (0, chai_1.expect)((_b = canvas.nodes.find(function (node) { return node.id === 'intake'; })) === null || _b === void 0 ? void 0 : _b.status).to.equal('done');
        var kanban = (0, flow_derivation_1.deriveFlowKanbanColumns)(updates[1].workloads);
        (0, chai_1.expect)((_c = kanban.find(function (column) { return column.id === 'running'; })) === null || _c === void 0 ? void 0 : _c.workloads.map(function (workload) { return workload.id; })).to.deep.equal(['frontend-work']);
        (0, chai_1.expect)((_d = kanban.find(function (column) { return column.id === 'done'; })) === null || _d === void 0 ? void 0 : _d.workloads.map(function (workload) { return workload.id; })).to.deep.equal(['intake-work']);
    });
    it('applies streamed run updates to the widget state used by canvas, kanban, inspector, events, effects, and artifacts', function () {
        var _a;
        var widget = new TestFlowWidget();
        var initialRun = pendingRun();
        var streamedRun = runFixture({
            currentStateIds: ['frontend'],
            stateStatuses: { intake: 'done', frontend: 'running' },
            workloads: [
                workload('intake-work', 'intake', 'done'),
                __assign(__assign({}, workload('frontend-work', 'frontend', 'running', ['flow://run-1/frontend/reports/final.md'])), { effectIds: ['effect-1'] })
            ],
            artifacts: [{
                    id: 'artifact-1',
                    runId: 'run-1',
                    stateId: 'frontend',
                    uri: 'flow://run-1/frontend/reports/final.md',
                    kind: 'report',
                    summary: 'Frontend report',
                    createdAt: '2026-05-20T10:04:00.000Z'
                }],
            effects: [{
                    id: 'effect-1',
                    runId: 'run-1',
                    stateId: 'frontend',
                    kind: 'file',
                    type: 'file.edited',
                    path: 'src/frontend.tsx',
                    status: 'proposed',
                    summary: 'Frontend file edit'
                }],
            events: runningRun().events
        });
        widget.injectForTest({
            approveMemoryCandidate: function (request) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/, (__assign(__assign({}, initialRun), { prompt: request.content || initialRun.prompt }))];
            }); }); }
        }, 'file:///workspace/project', initialRun);
        widget.applyRunUpdateForTest(streamedRun);
        var activeRun = widget.activeRunForTest();
        (0, chai_1.expect)(activeRun === null || activeRun === void 0 ? void 0 : activeRun.currentStateIds).to.deep.equal(['frontend']);
        (0, chai_1.expect)((_a = activeRun === null || activeRun === void 0 ? void 0 : activeRun.workloads.find(function (item) { return item.id === 'frontend-work'; })) === null || _a === void 0 ? void 0 : _a.status).to.equal('running');
        (0, chai_1.expect)(activeRun === null || activeRun === void 0 ? void 0 : activeRun.artifacts.map(function (artifact) { return artifact.id; })).to.deep.equal(['artifact-1']);
        (0, chai_1.expect)(activeRun === null || activeRun === void 0 ? void 0 : activeRun.effects.map(function (effect) { return effect.id; })).to.deep.equal(['effect-1']);
        (0, chai_1.expect)(activeRun === null || activeRun === void 0 ? void 0 : activeRun.events.map(function (event) { return event.id; })).to.deep.equal(['1', '2', '3', '4', '5']);
        (0, chai_1.expect)(widget.selectedArtifactIdForTest()).to.equal('artifact-1');
    });
    it('filters streamed events by type, state, artifact, effect, and severity after dedupe', function () {
        var events = (0, flow_events_1.normalizeFlowEvents)(runningRun().events);
        (0, chai_1.expect)((0, flow_events_1.filterFlowEvents)(events, { eventType: 'artifact.created' }).map(function (event) { return event.id; })).to.deep.equal(['3']);
        (0, chai_1.expect)((0, flow_events_1.filterFlowEvents)(events, { stateId: 'frontend' }).map(function (event) { return event.id; })).to.deep.equal(['2', '3', '4']);
        (0, chai_1.expect)((0, flow_events_1.filterFlowEvents)(events, { artifact: 'reports/final.md' }).map(function (event) { return event.id; })).to.deep.equal(['3']);
        (0, chai_1.expect)((0, flow_events_1.filterFlowEvents)(events, { effect: 'effect-1' }).map(function (event) { return event.id; })).to.deep.equal(['4']);
        (0, chai_1.expect)((0, flow_events_1.filterFlowEvents)(events, { severity: 'high' }).map(function (event) { return event.id; })).to.deep.equal(['5']);
    });
    it('converts agent deliverable text to workflow deliverables and back', function () {
        var deliverables = (0, flow_widget_1.textToDeliverables)([
            'reports/final.md | Final report | report | required',
            'patches/ui.diff | UI changes | patch | false',
            'logs/run.log'
        ].join('\n'));
        (0, chai_1.expect)(deliverables).to.deep.equal([
            { path: 'reports/final.md', description: 'Final report', kind: 'report', required: true },
            { path: 'patches/ui.diff', description: 'UI changes', kind: 'patch', required: false },
            { path: 'logs/run.log' }
        ]);
        (0, chai_1.expect)((0, flow_widget_1.deliverablesToText)(deliverables)).to.equal([
            'reports/final.md | Final report | report | true',
            'patches/ui.diff | UI changes | patch | false',
            'logs/run.log'
        ].join('\n'));
        (0, chai_1.expect)((0, flow_widget_1.textToDeliverables)('')).to.equal(undefined);
    });
    it('sends memory approval UI decisions with edited content, scope, and target', function () { return __awaiter(void 0, void 0, void 0, function () {
        var widget, activeRun, approvals;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    widget = new TestFlowWidget();
                    activeRun = memoryRun();
                    approvals = [];
                    widget.injectForTest({
                        approveMemoryCandidate: function (request) { return __awaiter(void 0, void 0, void 0, function () {
                            var _a;
                            return __generator(this, function (_b) {
                                approvals.push(request);
                                return [2 /*return*/, __assign(__assign({}, activeRun), { memoryCandidates: (_a = activeRun.memoryCandidates) === null || _a === void 0 ? void 0 : _a.map(function (candidate) { return (__assign(__assign({}, candidate), { status: 'written' })); }) })];
                            });
                        }); }
                    }, 'file:///workspace/project', activeRun);
                    return [4 /*yield*/, widget.decideMemoryCandidateForTest('candidate-1', 'approved', 'Remember the edited Memory note.', 'project', 'repo-main')];
                case 1:
                    _c.sent();
                    (0, chai_1.expect)(approvals).to.deep.equal([{
                            workspaceRootUri: 'file:///workspace/project',
                            runId: 'run-1',
                            candidateId: 'candidate-1',
                            decision: 'approved',
                            content: 'Remember the edited Memory note.',
                            scope: 'project',
                            target: 'repo-main'
                        }]);
                    (0, chai_1.expect)((_b = (_a = widget.activeRunForTest()) === null || _a === void 0 ? void 0 : _a.memoryCandidates) === null || _b === void 0 ? void 0 : _b[0].status).to.equal('written');
                    return [2 /*return*/];
            }
        });
    }); });
});
var TestFlowWidget = /** @class */ (function (_super) {
    __extends(TestFlowWidget, _super);
    function TestFlowWidget() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    TestFlowWidget.prototype.injectForTest = function (service, workspaceRootUri, activeRun) {
        Object.defineProperty(this, 'flowService', { value: service });
        Object.defineProperty(this, 'workspaceService', {
            value: {
                roots: Promise.resolve([{ resource: { toString: function () { return workspaceRootUri; } } }])
            }
        });
        this.state = __assign(__assign({}, this.state), { snapshot: {
                workflows: [],
                activeRun: activeRun,
                capabilities: flow_capabilities_1.FLOW_CAPABILITIES
            } });
    };
    TestFlowWidget.prototype.decideMemoryCandidateForTest = function (candidateId, decision, content, scope, target) {
        return this.decideMemoryCandidate(candidateId, decision, content, scope, target);
    };
    TestFlowWidget.prototype.activeRunForTest = function () {
        var _a;
        return (_a = this.state.snapshot) === null || _a === void 0 ? void 0 : _a.activeRun;
    };
    TestFlowWidget.prototype.selectedArtifactIdForTest = function () {
        return this.state.selectedArtifactId;
    };
    TestFlowWidget.prototype.applyRunUpdateForTest = function (run) {
        this.applyRunUpdate(run);
    };
    return TestFlowWidget;
}(flow_widget_1.FlowWidget));
function workflowFixture() {
    return {
        version: 'flow.workflow/v1',
        id: 'contracted_delivery',
        name: 'Contracted Delivery',
        states: {
            intake: { type: 'input' },
            frontend: { type: 'agent', agent: 'frontend' }
        },
        transitions: [
            { id: 'intake_to_frontend', from: 'intake', to: 'frontend', on: 'workload.completed' }
        ]
    };
}
function pendingRun() {
    return runFixture({
        currentStateIds: ['intake'],
        stateStatuses: { intake: 'running', frontend: 'pending' },
        workloads: [workload('intake-work', 'intake', 'running')],
        events: [
            event({ id: '1', type: 'run.started', stateId: 'intake', message: 'started' })
        ]
    });
}
function runningRun() {
    return runFixture({
        currentStateIds: ['frontend'],
        stateStatuses: { intake: 'done', frontend: 'running' },
        workloads: [
            workload('intake-work', 'intake', 'done'),
            workload('frontend-work', 'frontend', 'running', ['flow://run-1/frontend/reports/final.md'])
        ],
        events: [
            event({ id: '3', timestamp: '2026-05-20T10:03:00.000Z', type: 'artifact.created', stateId: 'frontend', workloadId: 'frontend-work', message: 'duplicate artifact', payload: { seq: 3, path: 'reports/old.md' } }),
            event({ id: '1', timestamp: '2026-05-20T10:01:00.000Z', type: 'run.started', stateId: 'intake', message: 'started', payload: { seq: 1 } }),
            event({ id: '2', timestamp: '2026-05-20T10:02:00.000Z', type: 'workload.started', stateId: 'frontend', workloadId: 'frontend-work', message: 'frontend started', payload: { seq: 2 } }),
            event({ id: '3', timestamp: '2026-05-20T10:04:00.000Z', type: 'artifact.created', stateId: 'frontend', workloadId: 'frontend-work', message: 'frontend produced report', payload: { seq: 3, path: 'reports/final.md' } }),
            event({ id: '4', timestamp: '2026-05-20T10:05:00.000Z', type: 'effect.applied', stateId: 'frontend', workloadId: 'frontend-work', message: 'file edited', payload: { effectId: 'effect-1', type: 'file.edited' } }),
            event({ id: '5', timestamp: '2026-05-20T10:06:00.000Z', type: 'workload.failed', stateId: 'qa', message: 'qa failed', payload: { severity: 'high' } })
        ]
    });
}
function completedRun() {
    return runFixture({
        status: 'completed',
        currentStateIds: [],
        stateStatuses: { intake: 'done', frontend: 'done' },
        workloads: [
            workload('intake-work', 'intake', 'done'),
            workload('frontend-work', 'frontend', 'done', ['flow://run-1/frontend/reports/final.md'])
        ],
        events: runningRun().events
    });
}
function memoryRun() {
    return runFixture({
        currentStateIds: ['memory'],
        stateStatuses: { memory: 'running' },
        memoryCandidates: [{
                id: 'candidate-1',
                runId: 'run-1',
                stateId: 'memory',
                source: 'effect',
                kind: 'summary',
                content: 'Original memory candidate.',
                reason: 'Memory memory review.',
                confidence: 0.9,
                status: 'candidate',
                createdAt: '2026-05-20T10:00:00.000Z'
            }]
    });
}
function runFixture(partial) {
    return {
        id: 'run-1',
        workflowId: 'contracted_delivery',
        prompt: 'ship feature',
        status: partial.status || 'running',
        createdAt: '2026-05-20T10:00:00.000Z',
        updatedAt: '2026-05-20T10:00:00.000Z',
        currentStateIds: partial.currentStateIds || [],
        stateStatuses: partial.stateStatuses || {},
        workloads: partial.workloads || [],
        events: partial.events || [],
        artifacts: partial.artifacts || [],
        effects: partial.effects || [],
        signals: [],
        gates: [],
        tick: 1,
        memoryCandidates: partial.memoryCandidates
    };
}
function workload(id, stateId, status, outputArtifacts) {
    if (outputArtifacts === void 0) { outputArtifacts = []; }
    return {
        id: id,
        runId: 'run-1',
        stateId: stateId,
        status: status,
        inputArtifacts: [],
        outputArtifacts: outputArtifacts,
        issues: [],
        effectIds: [],
        createdAt: '2026-05-20T10:00:00.000Z',
        updatedAt: '2026-05-20T10:00:00.000Z'
    };
}
function event(partial) {
    return {
        id: partial.id || 'event',
        type: partial.type || 'run.started',
        timestamp: partial.timestamp || '2026-05-20T10:00:00.000Z',
        stateId: partial.stateId,
        workloadId: partial.workloadId,
        gateId: partial.gateId,
        message: partial.message || 'event',
        payload: partial.payload
    };
}

"use strict";
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
var browser_1 = require("@theia/core/lib/browser");
var inversify_1 = require("@theia/core/shared/inversify");
var common_1 = require("../common");
var flow_client_1 = require("./flow-client");
var flow_contribution_1 = require("./flow-contribution");
var flow_widget_1 = require("./flow-widget");
require("../../src/browser/style/index.css");
exports.default = new inversify_1.ContainerModule(function (bind) {
    bind(flow_client_1.FlowClientImpl).toSelf().inSingletonScope();
    bind(common_1.FlowClient).toService(flow_client_1.FlowClientImpl);
    bind(common_1.FlowService).toDynamicValue(function (ctx) {
        var provider = ctx.container.get(browser_1.RemoteConnectionProvider);
        var client = ctx.container.get(common_1.FlowClient);
        var service = provider.createProxy(common_1.FLOW_SERVICE_PATH, client);
        if (typeof window !== 'undefined') {
            window.__cyberVinciFlowDiagnostics = {
                runPlaybookBridgeSmoke: function () { return runPlaybookBridgeSmoke(service); },
                createHumanGateSmokeRun: function () { return createHumanGateSmokeRun(service); }
            };
        }
        return service;
    }).inSingletonScope();
    (0, browser_1.bindViewContribution)(bind, flow_contribution_1.FlowContribution);
    bind(browser_1.FrontendApplicationContribution).toService(flow_contribution_1.FlowContribution);
    bind(flow_widget_1.FlowWidget).toSelf();
    bind(browser_1.WidgetFactory).toDynamicValue(function (ctx) { return ({
        id: flow_widget_1.FlowWidget.ID,
        createWidget: function () { return ctx.container.get(flow_widget_1.FlowWidget); }
    }); }).inSingletonScope();
});
function createHumanGateSmokeRun(service) {
    return __awaiter(this, void 0, void 0, function () {
        var workflowId, workflow, validation, run, panel, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 4, , 5]);
                    workflowId = 'cybervinci_flow_human_gate_smoke';
                    workflow = {
                        version: 'flow.workflow/v1',
                        id: workflowId,
                        name: 'CyberVinci Flow Human Gate Smoke',
                        description: 'Internal runtime smoke for AI Chat human gate rendering and decision routing.',
                        requires: { capabilities: ['human.approval', 'filesystem.artifacts'] },
                        states: {
                            input: {
                                id: 'input',
                                type: 'input',
                                outputs: ['input/request.md'],
                                outcomes: { success: 'approval_gate' }
                            },
                            approval_gate: {
                                id: 'approval_gate',
                                type: 'gate',
                                gates: [{
                                        id: 'smoke_approval',
                                        title: 'Approve smoke run',
                                        prompt: 'Confirm that the AI Chat inline gate panel can route this Flow run.',
                                        decisions: [
                                            { id: 'approved', label: 'Approve', outcome: 'approved', to: 'final_report' },
                                            { id: 'revision_requested', label: 'Request rework', outcome: 'revision_requested', action: 'wait', allowTargetSelection: true, requireNote: true },
                                            { id: 'rejected', label: 'Reject', outcome: 'rejected', action: 'fail', requireNote: true }
                                        ]
                                    }],
                                outcomes: {
                                    approved: 'final_report',
                                    revision_requested: { action: 'wait' },
                                    rejected: { action: 'fail' }
                                }
                            },
                            final_report: {
                                id: 'final_report',
                                type: 'report',
                                input: { include: ['input/request.md'] },
                                outputs: ['final/report.md']
                            }
                        },
                        transitions: []
                    };
                    return [4 /*yield*/, service.saveWorkflow({
                            workflow: workflow,
                            origin: 'cybervinci.flow.diagnostics',
                            message: 'Update Flow human gate smoke workflow.'
                        })];
                case 1:
                    validation = _a.sent();
                    if (!validation.valid) {
                        return [2 /*return*/, { ok: false, stage: 'saveWorkflow', validation: validation }];
                    }
                    return [4 /*yield*/, service.startRun({
                            workflowId: workflowId,
                            prompt: 'CyberVinci Flow human gate smoke'
                        })];
                case 2:
                    run = _a.sent();
                    return [4 /*yield*/, waitForHumanGatePanel()];
                case 3:
                    panel = _a.sent();
                    return [2 /*return*/, {
                            ok: run.status === 'waiting_gate' && panel.visible,
                            workflowId: workflowId,
                            runId: run.id,
                            status: run.status,
                            gateIds: run.gates.map(function (gate) { return gate.id; }),
                            stateStatuses: run.stateStatuses,
                            panel: panel
                        }];
                case 4:
                    error_1 = _a.sent();
                    return [2 /*return*/, {
                            ok: false,
                            stage: 'exception',
                            message: error_1 instanceof Error ? error_1.message : String(error_1)
                        }];
                case 5: return [2 /*return*/];
            }
        });
    });
}
function waitForHumanGatePanel() {
    return __awaiter(this, void 0, void 0, function () {
        var attempt, panels;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    attempt = 0;
                    _a.label = 1;
                case 1:
                    if (!(attempt < 12)) return [3 /*break*/, 4];
                    return [4 /*yield*/, delay(500)];
                case 2:
                    _a.sent();
                    panels = Array.from(document.querySelectorAll('.cybervinci-flow-gate-panel'));
                    if (panels.length > 0) {
                        return [2 /*return*/, {
                                visible: true,
                                text: panels[0].innerText,
                                panelCount: panels.length
                            }];
                    }
                    _a.label = 3;
                case 3:
                    attempt++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/, {
                        visible: false,
                        panelCount: document.querySelectorAll('.cybervinci-flow-gate-panel').length
                    }];
            }
        });
    });
}
function delay(ms) {
    return new Promise(function (resolve) { return window.setTimeout(resolve, ms); });
}
function runPlaybookBridgeSmoke(service) {
    return __awaiter(this, void 0, void 0, function () {
        var workflowId, workflow, validation, run, attempt, frontendSignal, playbookSignal, error_2;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 7, , 8]);
                    workflowId = 'cybervinci_flow_playbook_bridge_smoke';
                    workflow = {
                        version: 'flow.workflow/v1',
                        id: workflowId,
                        name: 'CyberVinci Flow Playbook Bridge Smoke',
                        description: 'Internal runtime smoke for Flow state playbook delegation into the AI Chat Experience frontend runtime.',
                        requires: { capabilities: ['playbook.run'] },
                        states: {
                            run_playbook: {
                                id: 'run_playbook',
                                type: 'playbook',
                                playbookId: '__cybervinci.frontend-rpc-smoke',
                                prompt: 'CyberVinci Flow UI playbook bridge smoke',
                                playbookInput: {
                                    marker: 'flow-ui-playbook-bridge',
                                    source: 'Flow frontend diagnostics'
                                },
                                outputs: ['playbook/result.json']
                            }
                        },
                        transitions: []
                    };
                    return [4 /*yield*/, service.saveWorkflow({
                            workflow: workflow,
                            origin: 'cybervinci.flow.diagnostics',
                            message: 'Update Flow Playbook bridge smoke workflow.'
                        })];
                case 1:
                    validation = _c.sent();
                    if (!validation.valid) {
                        return [2 /*return*/, { ok: false, stage: 'saveWorkflow', validation: validation }];
                    }
                    return [4 /*yield*/, service.startRun({
                            workflowId: workflowId,
                            prompt: 'CyberVinci Flow UI playbook bridge smoke'
                        })];
                case 2:
                    run = _c.sent();
                    attempt = 0;
                    _c.label = 3;
                case 3:
                    if (!(attempt < 8)) return [3 /*break*/, 6];
                    if (run.status === 'completed' || run.status === 'failed') {
                        return [3 /*break*/, 6];
                    }
                    return [4 /*yield*/, service.tickRun({ runId: run.id })];
                case 4:
                    run = _c.sent();
                    _c.label = 5;
                case 5:
                    attempt++;
                    return [3 /*break*/, 3];
                case 6:
                    frontendSignal = (_a = run.signals) === null || _a === void 0 ? void 0 : _a.find(function (signal) { return signal.key === 'cybervinci.playbook.frontend'; });
                    playbookSignal = (_b = run.signals) === null || _b === void 0 ? void 0 : _b.find(function (signal) { return signal.key === 'cybervinci.playbook.id'; });
                    return [2 /*return*/, {
                            ok: run.status === 'completed' && (frontendSignal === null || frontendSignal === void 0 ? void 0 : frontendSignal.value) === true,
                            workflowId: workflowId,
                            runId: run.id,
                            status: run.status,
                            stateStatuses: run.stateStatuses,
                            workloadStatuses: run.workloads.map(function (workload) { return ({
                                id: workload.id,
                                stateId: workload.stateId,
                                status: workload.status,
                                outputs: workload.outputArtifacts
                            }); }),
                            signals: run.signals,
                            frontendSignal: frontendSignal,
                            playbookSignal: playbookSignal,
                            issueCount: run.workloads.reduce(function (count, workload) { return count + workload.issues.length; }, 0)
                        }];
                case 7:
                    error_2 = _c.sent();
                    return [2 /*return*/, {
                            ok: false,
                            stage: 'exception',
                            message: error_2 instanceof Error ? error_2.message : String(error_2)
                        }];
                case 8: return [2 /*return*/];
            }
        });
    });
}

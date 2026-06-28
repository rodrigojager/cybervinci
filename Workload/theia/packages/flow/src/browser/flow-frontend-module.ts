import { FrontendApplicationContribution, RemoteConnectionProvider, ServiceConnectionProvider, WidgetFactory, bindViewContribution } from '@theia/core/lib/browser';
import { ContainerModule } from '@theia/core/shared/inversify';
import { FLOW_SERVICE_PATH, FlowClient, FlowService, FlowWorkflow } from '../common';
import { FlowClientImpl } from './flow-client';
import { FlowContribution } from './flow-contribution';
import { FlowWidget } from './flow-widget';
import '../../src/browser/style/index.css';

export default new ContainerModule(bind => {
    bind(FlowClientImpl).toSelf().inSingletonScope();
    bind(FlowClient).toService(FlowClientImpl);
    bind(FlowService).toDynamicValue(ctx => {
        const provider = ctx.container.get<ServiceConnectionProvider>(RemoteConnectionProvider);
        const client = ctx.container.get<FlowClient>(FlowClient);
        const service = provider.createProxy<FlowService>(FLOW_SERVICE_PATH, client);
        if (typeof window !== 'undefined') {
            (window as unknown as {
                __cyberVinciFlowDiagnostics?: {
                    runPlaybookBridgeSmoke: () => Promise<unknown>;
                    createHumanGateSmokeRun: () => Promise<unknown>;
                };
            }).__cyberVinciFlowDiagnostics = {
                runPlaybookBridgeSmoke: () => runPlaybookBridgeSmoke(service),
                createHumanGateSmokeRun: () => createHumanGateSmokeRun(service)
            };
        }
        return service;
    }).inSingletonScope();

    bindViewContribution(bind, FlowContribution);
    bind(FrontendApplicationContribution).toService(FlowContribution);

    bind(FlowWidget).toSelf();
    bind(WidgetFactory).toDynamicValue(ctx => ({
        id: FlowWidget.ID,
        createWidget: () => ctx.container.get(FlowWidget)
    })).inSingletonScope();
});

async function createHumanGateSmokeRun(service: FlowService): Promise<unknown> {
    try {
        const workflowId = 'cybervinci_flow_human_gate_smoke';
        const workflow: FlowWorkflow = {
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
        const validation = await service.saveWorkflow({
            workflow,
            origin: 'cybervinci.flow.diagnostics',
            message: 'Update Flow human gate smoke workflow.'
        });
        if (!validation.valid) {
            return { ok: false, stage: 'saveWorkflow', validation };
        }
        const run = await service.startRun({
            workflowId,
            prompt: 'CyberVinci Flow human gate smoke'
        });
        const panel = await waitForHumanGatePanel();
        return {
            ok: run.status === 'waiting_gate' && panel.visible,
            workflowId,
            runId: run.id,
            status: run.status,
            gateIds: run.gates.map(gate => gate.id),
            stateStatuses: run.stateStatuses,
            panel
        };
    } catch (error) {
        return {
            ok: false,
            stage: 'exception',
            message: error instanceof Error ? error.message : String(error)
        };
    }
}

async function waitForHumanGatePanel(): Promise<{ visible: boolean; text?: string; panelCount: number }> {
    for (let attempt = 0; attempt < 12; attempt++) {
        await delay(500);
        const panels = Array.from(document.querySelectorAll<HTMLElement>('.cybervinci-flow-gate-panel'));
        if (panels.length > 0) {
            return {
                visible: true,
                text: panels[0].innerText,
                panelCount: panels.length
            };
        }
    }
    return {
        visible: false,
        panelCount: document.querySelectorAll('.cybervinci-flow-gate-panel').length
    };
}

function delay(ms: number): Promise<void> {
    return new Promise(resolve => window.setTimeout(resolve, ms));
}

async function runPlaybookBridgeSmoke(service: FlowService): Promise<unknown> {
    try {
        const workflowId = 'cybervinci_flow_playbook_bridge_smoke';
        const workflow: FlowWorkflow = {
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
        const validation = await service.saveWorkflow({
            workflow,
            origin: 'cybervinci.flow.diagnostics',
            message: 'Update Flow Playbook bridge smoke workflow.'
        });
        if (!validation.valid) {
            return { ok: false, stage: 'saveWorkflow', validation };
        }
        let run = await service.startRun({
            workflowId,
            prompt: 'CyberVinci Flow UI playbook bridge smoke'
        });
        for (let attempt = 0; attempt < 8; attempt++) {
            if (run.status === 'completed' || run.status === 'failed') {
                break;
            }
            run = await service.tickRun({ runId: run.id });
        }
        const frontendSignal = run.signals?.find(signal => signal.key === 'cybervinci.playbook.frontend');
        const playbookSignal = run.signals?.find(signal => signal.key === 'cybervinci.playbook.id');
        return {
            ok: run.status === 'completed' && frontendSignal?.value === true,
            workflowId,
            runId: run.id,
            status: run.status,
            stateStatuses: run.stateStatuses,
            workloadStatuses: run.workloads.map(workload => ({
                id: workload.id,
                stateId: workload.stateId,
                status: workload.status,
                outputs: workload.outputArtifacts
            })),
            signals: run.signals,
            frontendSignal,
            playbookSignal,
            issueCount: run.workloads.reduce((count, workload) => count + workload.issues.length, 0)
        };
    } catch (error) {
        return {
            ok: false,
            stage: 'exception',
            message: error instanceof Error ? error.message : String(error)
        };
    }
}

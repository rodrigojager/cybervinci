import { expect } from 'chai';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as http from 'http';
import * as os from 'os';
import * as path from 'path';
import { Duplex } from 'stream';
import { FileUri } from '@theia/core/lib/common/file-uri';
import { CodexProviderServiceImpl } from '@cybervinci/ai-providers/lib/node/ai-providers-service-impl';
import {
    FlowGateDecisionRequest,
    FlowWorkflow,
    getBuiltInFlowPipelinePreset,
    instantiateFlowPipelinePreset,
    SISYPHUS_ULTRAWORK_COORDINATOR_PRESET_ID
} from '../common';
import { FLOW_CAPABILITIES } from '../common/flow-capabilities';
import { resolveFlowWorkflowCapabilities } from '../common/flow-capability-resolution';
import { instantiateFlowWorkflowTemplate } from '../common/flow-templates';
import {
    FlowKernelBridge,
    ExternalFlowKernelBridge,
    HybridFlowKernelBridge,
    mapKernelRunToFlowRun,
    SimulatedFlowKernelBridge
} from './flow-kernel-bridge';
import { AgentMarkdownStore } from './agent-markdown-store';
import { FlowWorkloadExecutor, FlowWorkloadExecutionContext, ProviderBackedFlowWorkloadExecutor } from './flow-workload-executor';
import { CommandEffectHostAdapter } from './command-effect-host-adapter';

class StateMappedMockLlmExecutor extends ProviderBackedFlowWorkloadExecutor {
    public readonly calls: string[] = [];
    private readonly responses: Record<string, string[]>;

    constructor(responses: Record<string, string[]>) {
        super({
            readAgent: async (agentId: string) => ({
                path: `agents/${agentId}.md`,
                uri: `agents/${agentId}.md`,
                relativePath: `agents/${agentId}.md`,
                content: [
                    `# ${agentId}`,
                    '',
                    '## Role',
                    'Execute the assigned workload.',
                    '',
                    '## Output Format',
                    'Return the Flow workload-output JSON envelope.'
                ].join('\n'),
                updatedAt: '2026-05-20T00:00:00.000Z'
            })
        } as unknown as AgentMarkdownStore);
        this.responses = Object.fromEntries(Object.entries(responses).map(([key, value]) => [key, [...value]]));
    }

    protected override resolveLlmProvider(): Promise<any> {
        return Promise.resolve({ command: 'mock-llm-provider' });
    }

    protected override invokeLlmProvider(context: FlowWorkloadExecutionContext): Promise<string> {
        const stateId = context.workload.stateId;
        this.calls.push(stateId);
        const queue = this.responses[stateId];
        const response = queue?.shift();
        if (!response) {
            return Promise.reject(new Error(`No mocked LLM response configured for ${stateId}.`));
        }
        return Promise.resolve(response);
    }
}

function summarizeRunForFailure(run: { status: string; events?: Array<{ type: string; message?: string; stateId?: string; workloadId?: string; payload?: unknown }>; workloads?: Array<{ id: string; stateId: string; status: string; summary?: string; issues?: string[] }> }): string {
    const events = (run.events || []).slice(-8).map(event => `${event.type}${event.stateId ? ` state=${event.stateId}` : ''}${event.message ? `: ${event.message}` : ''}`);
    const workloads = (run.workloads || []).map(workload => `${workload.stateId}/${workload.id}=${workload.status}${workload.summary ? ` ${workload.summary}` : ''}${workload.issues?.length ? ` issues=${workload.issues.join(' | ')}` : ''}`);
    return [`status=${run.status}`, ...workloads, ...events].join('\n');
}
function createNoopLogger(): { debug: (...args: unknown[]) => void; info: (...args: unknown[]) => void; warn: (...args: unknown[]) => void; error: (...args: unknown[]) => void; trace: (...args: unknown[]) => void; } {
    return {
        debug: () => undefined,
        info: () => undefined,
        warn: () => undefined,
        error: () => undefined,
        trace: () => undefined
    };
}

function configureHelloWorldSisyphusSmokeWorkflow(workflow: FlowWorkflow): void {
    const ultraworker = workflow.states.sisyphus_ultraworker;
    if (ultraworker === undefined) {
        return;
    }

    if (ultraworker.outputs === undefined) {
        ultraworker.outputs = [];
    }
    if (!ultraworker.outputs.includes('hello-world.txt')) {
        ultraworker.outputs = [...ultraworker.outputs, 'hello-world.txt'];
    }

    if (ultraworker.deliverables === undefined) {
        ultraworker.deliverables = [];
    }
    if (!ultraworker.deliverables.some(deliverable => deliverable.path === 'hello-world.txt')) {
        ultraworker.deliverables = [
            ...ultraworker.deliverables,
            { path: 'hello-world.txt', description: 'Deterministic hello-world artifact', required: true, kind: 'text' }
        ];
    }
}

describe('SimulatedFlowKernelBridge', () => {

    it('emits structured workload and gate events', async () => {
        const bridge = new SimulatedFlowKernelBridge();
        const workflow = sampleWorkflow();

        const started = await bridge.startRun(workflow, 'review this', 'empty context');
        const afterIntake = await bridge.tickRun(workflow, started);
        const waiting = await bridge.tickRun(workflow, afterIntake);
        const gate = waiting.gates[0];
        expect(waiting.status).to.equal('waiting_gate');
        expect(waiting.events.map(event => event.type)).to.contain('gate.created');

        const request: FlowGateDecisionRequest = {
            runId: waiting.id,
            gateId: gate.id,
            decision: 'approved'
        };
        const approved = await bridge.approveGate(workflow, waiting, request);

        expect(approved.status).to.equal('running');
        expect(approved.events.map(event => event.type)).to.contain('gate.approved');
    });

    it('runs contracted parallel delivery through contract gate, parallel branches, QA repair, passing QA, and final report with mocked LLM', async () => {
        const workspaceRootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'flow-llm-integration-'));
        const workspaceRootUri = FileUri.create(workspaceRootDir).toString();
        try {
            const workflow = instantiateFlowWorkflowTemplate('contracted_parallel_delivery', {
                id: 'mocked_contracted_parallel_delivery',
                name: 'Mocked Contracted Parallel Delivery'
            });
            workflow.states.delivery_join = {
                ...workflow.states.delivery_join,
                type: 'report',
                outputs: ['delivery/join-summary.md']
            };
            const capabilityResolution = resolveFlowWorkflowCapabilities(workflow, {
                ...FLOW_CAPABILITIES,
                llmAgentExecution: 'available',
                llmAgentProvider: 'configured',
                filesystemEdit: 'available',
                filesystemEditPolicy: 'configured',
                imageGeneration: 'available',
                imageProvider: 'configured',
                memoryProvider: 'local',
                deterministicFallback: false
            });
            expect(capabilityResolution.missing).to.deep.equal([]);
            expect(capabilityResolution.provided).to.include.members([
                'llm.agent.execute',
                'memory.context',
                'human.approval',
                'filesystem.edit',
                'image.generate',
                'filesystem.artifacts'
            ]);
            const executor = new StateMappedMockLlmExecutor({
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
            const bridge = new SimulatedFlowKernelBridge(executor);

            let run = await bridge.startRun(workflow, 'deliver feature with contract and QA repair', 'mock context', workspaceRootUri);
            for (let i = 0; i < 20 && run.status !== 'completed'; i += 1) {
                run = await bridge.tickRun(workflow, run, workspaceRootUri);
                if (run.status === 'waiting_gate') {
                    const gate = run.gates.find(candidate => candidate.status === 'pending');
                    expect(gate?.id).to.equal('contract_approval');
                    run = await bridge.approveGate(workflow, run, {
                        runId: run.id,
                        gateId: gate!.id,
                        decision: 'approved',
                        note: 'Contract approved by integration test.'
                    });
                }
            }

            expect(run.status, summarizeRunForFailure(run)).to.equal('completed');
            expect(run.gates.find(gate => gate.id === 'contract_approval')?.status).to.equal('approved');
            expect(executor.calls).to.include.members(['architecture', 'contract_design', 'backend_work', 'frontend_work', 'designer_work', 'qa', 'repair_loop']);
            expect(executor.calls.filter(call => call === 'qa')).to.have.length(2);
            expect(run.stateStatuses.parallel_delivery).to.equal('done');
            expect(run.stateStatuses.backend_work).to.equal('done');
            expect(run.stateStatuses.frontend_work).to.equal('done');
            expect(run.stateStatuses.designer_work).to.equal('done');
            expect(run.stateStatuses.delivery_join).to.equal('done');
            expect(run.stateStatuses.repair_loop).to.equal('done');
            expect(run.stateStatuses.final_report).to.equal('done');
            expect(run.secondRunSuggestion?.status).to.equal('suggested');
            expect(run.secondRunSuggestion?.reason).to.contain('fora de escopo');
            expect(run.secondRunSuggestion?.issues.map(issue => issue.summary)).to.include('Billing migration remains outside the approved contract scope.');
            expect(run.signals.some(signal => signal.key === 'qa.status' && signal.value === 'failed')).to.equal(true);
            expect(run.signals.some(signal => signal.key === 'qa.status' && signal.value === 'passed')).to.equal(true);
            expect(run.events.map(event => event.type)).to.include.members(['gate.created', 'gate.approved', 'state.completed', 'run.completed']);
            expect(run.events.map(event => event.transitionId)).to.include.members([
                'contract_gate_to_parallel_delivery',
                'parallel_delivery_to_delivery_join',
                'qa_failed_to_repair_loop',
                'repair_loop_to_qa',
                'qa_passed_to_final_report'
            ]);
            expect(run.artifacts.some(artifact => artifact.kind === 'contract' && artifact.summary?.includes('contracts/contracts.json'))).to.equal(true);
            expect(run.artifacts.some(artifact => artifact.kind === 'report' && artifact.stateId === 'final_report')).to.equal(true);
            expect(run.workloads.some(workload => workload.stateId === 'qa' && workload.issues.includes('Billing migration remains outside the approved contract scope.'))).to.equal(true);
        } finally {
            await fs.rm(workspaceRootDir, { recursive: true, force: true });
        }
    });

    it('maps external kernel snapshots into Flow runs', () => {
        const workflow = sampleWorkflow();
        const run = mapKernelRunToFlowRun(workflow, 'review this', {
            id: 'run_external',
            workflowId: workflow.id,
            workflow,
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

        expect(run.status).to.equal('completed');
        expect(run.workloads[0].status).to.equal('done');
        expect(run.artifacts[0].uri).to.equal('review.md');
        expect(run.signals[0].key).to.equal('review.status');
        expect(run.events.map(event => event.type)).to.contain('transition.fired');
        expect(run.externalKernelMetadata).to.deep.equal({
            kernelRunId: 'run_external',
            storeDir: 'C:/tmp/kernel-store',
            workflowFile: 'C:/tmp/workflow.json'
        });
    });
});

describe('FlowKernelBridge external transport', () => {

    it('executa startRun contra daemon HTTP mockado', async () => {
        const workflow = sampleWorkflow();
        const server = new MockKernelHttpServer({
            validate_workflow: request => {
                expect((request.workflow as FlowWorkflow).transitions[0].guard).to.deep.equal(workflow.transitions[0].guard);
                return { type: 'validate_workflow.ok', valid: true, workflowId: workflow.id };
            },
            start_run: () => ({
                type: 'start_run.ok',
                run: {
                    id: 'kernel-run-live',
                    workflowId: workflow.id,
                    workflow,
                    status: 'running',
                    createdAt: '2026-05-19T10:00:00.000Z',
                    updatedAt: '2026-05-19T10:00:00.000Z'
                }
            }),
            list_events: () => ({
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
            })
        });
        const endpoint = await server.start();

        const previousEndpoint = process.env.FLOW_KERNEL_HTTP;
        const previousMode = process.env.FLOW_KERNEL_MODE;
        process.env.FLOW_KERNEL_HTTP = endpoint;
        process.env.FLOW_KERNEL_MODE = 'external';

        try {
            const external = new ExternalFlowKernelBridge();
            const run = await external.startRun(workflow, 'review this', 'project summary');

            expect(run.status).to.equal('running');
            expect(run.externalKernelMetadata).to.deep.include({ kernelRunId: 'kernel-run-live' });
            expect(run.events.map(event => event.type)).to.include('state.entered');
            expect(server.requestTypes()).to.deep.equal(['validate_workflow', 'start_run', 'list_events']);
            expect(run.events.map(event => event.id)).to.include('3');
        } finally {
            setEnv('FLOW_KERNEL_HTTP', previousEndpoint);
            setEnv('FLOW_KERNEL_MODE', previousMode);
            await server.stop();
        }
    });

    it('auto-detecta e executa o Flow Kernel Go local via stdio', async function () {
        this.timeout(20000);
        const workflow: FlowWorkflow = {
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
        const repositoryRoot = path.resolve(__dirname, '..', '..', '..', '..');
        const kernelMain = path.join(repositoryRoot, 'flow-kernel', 'cmd', 'flow-kernel', 'main.go');
        const previousCwd = process.cwd();
        const previousEndpoint = process.env.FLOW_KERNEL_HTTP;
        const previousCli = process.env.FLOW_KERNEL_CLI;
        const previousMode = process.env.FLOW_KERNEL_MODE;
        let bridge: ExternalFlowKernelBridge | undefined;

        try {
            await fs.access(kernelMain);
            process.chdir(repositoryRoot);
            setEnv('FLOW_KERNEL_HTTP', undefined);
            setEnv('FLOW_KERNEL_CLI', undefined);
            process.env.FLOW_KERNEL_MODE = 'external';

            bridge = new ExternalFlowKernelBridge();
            const run = await bridge.startRun(workflow, 'produce final report', 'project summary');

            expect(run.status, summarizeRunForFailure(run)).to.equal('completed');
            expect(run.externalKernelMetadata?.kernelRunId).to.match(/^run_/);
            expect(run.artifacts.map(artifact => artifact.uri)).to.include('final.md');
            expect(run.events.map(event => event.type)).to.include.members(['run.started', 'run.completed']);
        } finally {
            await bridge?.shutdownKernelProcess();
            process.chdir(previousCwd);
            setEnv('FLOW_KERNEL_HTTP', previousEndpoint);
            setEnv('FLOW_KERNEL_CLI', previousCli);
            setEnv('FLOW_KERNEL_MODE', previousMode);
        }
    });

    it('auto-detecta e executa o Sisyphus ultraworker hello-world smoke via stdio', async function () {
        this.timeout(30000);
        const repositoryRoot = path.resolve(__dirname, '..', '..', '..', '..');
        const kernelMain = path.join(repositoryRoot, 'flow-kernel', 'cmd', 'flow-kernel', 'main.go');
        const preset = getBuiltInFlowPipelinePreset(SISYPHUS_ULTRAWORK_COORDINATOR_PRESET_ID);
        expect(preset).to.not.equal(undefined);
        const workflow = instantiateFlowPipelinePreset(preset!, {
            id: 'sisyphus_hello_world_smoke',
            name: 'Sisyphus Hello World Smoke'
        });
        configureHelloWorldSisyphusSmokeWorkflow(workflow);
        const workspaceRootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sisyphus-hello-world-smoke-'));
        const workspaceRootUri = FileUri.create(workspaceRootDir).toString();
        const previousCwd = process.cwd();
        const previousEndpoint = process.env.FLOW_KERNEL_HTTP;
        const previousCli = process.env.FLOW_KERNEL_CLI;
        const previousMode = process.env.FLOW_KERNEL_MODE;
        let bridge: ExternalFlowKernelBridge | undefined;

        try {
            await fs.access(kernelMain);
            process.chdir(repositoryRoot);
            setEnv('FLOW_KERNEL_HTTP', undefined);
            setEnv('FLOW_KERNEL_CLI', undefined);
            process.env.FLOW_KERNEL_MODE = 'external';

            const executor = new StateMappedMockLlmExecutor({
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

            bridge = new ExternalFlowKernelBridge(executor);
            let run = await bridge.startRun(workflow, 'Create a deterministic hello-world artifact.', 'Mock project summary for the Sisyphus smoke.', workspaceRootUri);

            for (let i = 0; i < 20 && run.status !== 'completed'; i += 1) {
                run = await bridge.tickRun(workflow, run, workspaceRootUri);
                if (run.status === 'waiting_gate') {
                    const gate = run.gates.find(candidate => candidate.id === 'sisyphus_plan_approval');
                    expect(gate?.status).to.equal('pending');
                    run = await bridge.approveGate(workflow, run, {
                        runId: run.id,
                        gateId: gate!.id,
                        decision: 'approved',
                        note: 'Approved deterministically in smoke test.'
                    });
                }
            }

            expect(run.status, summarizeRunForFailure(run)).to.equal('completed');
            expect(executor.calls).to.include.members(['sisyphus_coordinator', 'sisyphus_ultraworker', 'sisyphus_reviewer']);
            expect(run.gates.find(gate => gate.id === 'sisyphus_plan_approval')?.status).to.equal('approved');
            const artifactUris = run.artifacts.map(artifact => artifact.uri);
            expect(artifactUris.some(uri => uri.includes('plan/plan.md'))).to.equal(true);
            expect(artifactUris.some(uri => uri.includes('work/summary.md'))).to.equal(true);
            expect(artifactUris.some(uri => uri.includes('work/evidence.md'))).to.equal(true);
            expect(artifactUris.some(uri => uri.includes('review/review.md'))).to.equal(true);
            expect(artifactUris.some(uri => uri.includes('final/report.md'))).to.equal(true);
            expect(artifactUris.some(uri => uri.includes('hello-world.txt'))).to.equal(true);
            const helloWorldArtifact = run.artifacts.find(artifact => artifact.uri.includes('hello-world.txt'));
            expect(helloWorldArtifact).to.not.equal(undefined);
            const helloWorldContent = await fs.readFile(FileUri.fsPath(helloWorldArtifact!.uri), 'utf8');
            expect(helloWorldContent.trim()).to.equal('Hello, world!');
            expect(run.events.map(event => event.type)).to.include.members(['gate.created', 'gate.approved', 'run.completed']);
        } finally {
            await bridge?.shutdownKernelProcess();
            process.chdir(previousCwd);
            setEnv('FLOW_KERNEL_HTTP', previousEndpoint);
            setEnv('FLOW_KERNEL_CLI', previousCli);
            setEnv('FLOW_KERNEL_MODE', previousMode);
            await fs.rm(workspaceRootDir, { recursive: true, force: true });
        }
    });

    it('manual opt-in @real-codex-smoke for the Sisyphus hello-world pipeline', async function () {
        if (process.env.FLOW_REAL_CODEX_SMOKE !== '1') {
            this.skip();
        }
        this.timeout(300000);
        const repositoryRoot = path.resolve(__dirname, '..', '..', '..', '..');
        const kernelMain = path.join(repositoryRoot, 'flow-kernel', 'cmd', 'flow-kernel', 'main.go');
        const preset = getBuiltInFlowPipelinePreset(SISYPHUS_ULTRAWORK_COORDINATOR_PRESET_ID);
        expect(preset).to.not.equal(undefined);
        const workflow = instantiateFlowPipelinePreset(preset!, {
            id: 'sisyphus_real_codex_hello_world_smoke',
            name: 'Sisyphus Real Codex Hello World Smoke'
        });
        configureHelloWorldSisyphusSmokeWorkflow(workflow);
        const workspaceRootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sisyphus-real-codex-smoke-'));
        const workspaceRootUri = FileUri.create(workspaceRootDir).toString();
        const previousCwd = process.cwd();
        const previousKernelHttp = process.env.FLOW_KERNEL_HTTP;
        const previousKernelCli = process.env.FLOW_KERNEL_CLI;
        const previousKernelMode = process.env.FLOW_KERNEL_MODE;
        const previousProvider = process.env.FLOW_AGENT_PROVIDER;
        const previousModelId = process.env.FLOW_AGENT_MODEL_ID;
        const previousLegacyModelId = process.env.FLOW_AGENT_LLM_MODEL_ID;
        const previousCommand = process.env.FLOW_AGENT_COMMAND;
        const previousLegacyCommand = process.env.FLOW_AGENT_LLM_COMMAND;
        let bridge: ExternalFlowKernelBridge | undefined;
        let codexProviderService: CodexProviderServiceImpl | undefined;
        let removeWorkspaceRootDir = true;

        try {
            await fs.access(kernelMain);
            process.chdir(repositoryRoot);
            setEnv('FLOW_KERNEL_HTTP', undefined);
            setEnv('FLOW_KERNEL_CLI', undefined);
            process.env.FLOW_KERNEL_MODE = 'external';
            process.env.FLOW_AGENT_PROVIDER = 'ai-providers';
            setEnv('FLOW_AGENT_MODEL_ID', undefined);
            setEnv('FLOW_AGENT_LLM_MODEL_ID', undefined);
            setEnv('FLOW_AGENT_COMMAND', undefined);
            setEnv('FLOW_AGENT_LLM_COMMAND', undefined);

            const agentMarkdownStore = new AgentMarkdownStore();
            for (const agent of preset!.agentMarkdown || []) {
                await agentMarkdownStore.writeAgent(workspaceRootUri, agent.relativePath, agent.content);
            }

            codexProviderService = new CodexProviderServiceImpl();
            (codexProviderService as unknown as { logger: ReturnType<typeof createNoopLogger>; }).logger = createNoopLogger();

            const status = await codexProviderService.getStatus({ cwd: workspaceRootDir });
            expect(status.available, status.message || 'Codex provider must be available for the manual smoke test.').to.equal(true);

            const executor = new ProviderBackedFlowWorkloadExecutor(
                agentMarkdownStore,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                codexProviderService
            );

            bridge = new ExternalFlowKernelBridge(executor);
            let run = await bridge.startRun(workflow, 'Create a deterministic hello-world artifact through the real Codex provider.', 'Mock project summary for the real Codex smoke.', workspaceRootUri);

            for (let i = 0; i < 30 && run.status !== 'completed'; i += 1) {
                run = await bridge.tickRun(workflow, run, workspaceRootUri);
                if (run.status === 'waiting_gate') {
                    const gate = run.gates.find(candidate => candidate.id === 'sisyphus_plan_approval');
                    expect(gate?.status).to.equal('pending');
                    run = await bridge.approveGate(workflow, run, {
                        runId: run.id,
                        gateId: gate!.id,
                        decision: 'approved',
                        note: 'Approved manually in the real-Codex smoke test.'
                    }, workspaceRootUri);
                }
            }

            if (run.status !== 'completed') {
                removeWorkspaceRootDir = false;
                throw new Error('Real Codex Sisyphus smoke did not complete. Workspace preserved at ' + workspaceRootDir + '.\n' + summarizeRunForFailure(run));
            }
            expect(run.status).to.equal('completed');
            expect(run.gates.find(gate => gate.id === 'sisyphus_plan_approval')?.status).to.equal('approved');
            const artifactUris = run.artifacts.map(artifact => artifact.uri);
            expect(artifactUris.some(uri => uri.includes('plan/plan.md'))).to.equal(true);
            expect(artifactUris.some(uri => uri.includes('work/summary.md'))).to.equal(true);
            expect(artifactUris.some(uri => uri.includes('work/evidence.md'))).to.equal(true);
            expect(artifactUris.some(uri => uri.includes('review/review.md'))).to.equal(true);
            expect(artifactUris.some(uri => uri.includes('final/report.md'))).to.equal(true);
            expect(artifactUris.some(uri => uri.includes('hello-world.txt'))).to.equal(true);
            const helloWorldArtifact = run.artifacts.find(artifact => artifact.uri.includes('hello-world.txt'));
            expect(helloWorldArtifact).to.not.equal(undefined);
            const helloWorldContent = await fs.readFile(FileUri.fsPath(helloWorldArtifact!.uri), 'utf8');
            expect(helloWorldContent).to.contain('Hello, world');
            expect(run.events.map(event => event.type)).to.include.members(['gate.created', 'gate.approved', 'run.completed']);
        } finally {
            codexProviderService?.dispose();
            await bridge?.shutdownKernelProcess();
            process.chdir(previousCwd);
            setEnv('FLOW_KERNEL_HTTP', previousKernelHttp);
            setEnv('FLOW_KERNEL_CLI', previousKernelCli);
            setEnv('FLOW_KERNEL_MODE', previousKernelMode);
            setEnv('FLOW_AGENT_PROVIDER', previousProvider);
            setEnv('FLOW_AGENT_MODEL_ID', previousModelId);
            setEnv('FLOW_AGENT_LLM_MODEL_ID', previousLegacyModelId);
            setEnv('FLOW_AGENT_COMMAND', previousCommand);
            setEnv('FLOW_AGENT_LLM_COMMAND', previousLegacyCommand);
            if (removeWorkspaceRootDir) {
                await fs.rm(workspaceRootDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 250 });
            }
        }
    });

    it('executa startRun contra daemon WebSocket mockado quando o endpoint usa ws:', async () => {
        const workflow = sampleWorkflow();
        const server = new MockKernelWebSocketServer({
            validate_workflow: request => {
                expect((request.workflow as FlowWorkflow).id).to.equal(workflow.id);
                return { type: 'validate_workflow.ok', valid: true, workflowId: workflow.id };
            },
            start_run: () => ({
                type: 'start_run.ok',
                run: {
                    id: 'kernel-run-ws',
                    workflowId: workflow.id,
                    workflow,
                    status: 'running',
                    createdAt: '2026-05-20T11:00:00.000Z',
                    updatedAt: '2026-05-20T11:00:00.000Z'
                }
            }),
            list_events: () => ({
                type: 'list_events.ok',
                events: [{
                    seq: 1,
                    time: '2026-05-20T11:00:00.100Z',
                    type: 'run.started',
                    runId: 'kernel-run-ws',
                    message: 'run started over websocket'
                }]
            })
        });
        const endpoint = await server.start();

        const previousEndpoint = process.env.FLOW_KERNEL_HTTP;
        const previousMode = process.env.FLOW_KERNEL_MODE;
        process.env.FLOW_KERNEL_HTTP = endpoint;
        process.env.FLOW_KERNEL_MODE = 'external';

        try {
            const run = await new ExternalFlowKernelBridge().startRun(workflow, 'review this over ws', 'project summary');

            expect(run.status).to.equal('running');
            expect(run.externalKernelMetadata).to.deep.include({ kernelRunId: 'kernel-run-ws' });
            expect(run.events.map(event => event.type)).to.include('run.started');
            expect(server.requestTypes()).to.deep.equal(['validate_workflow', 'start_run', 'list_events']);
        } finally {
            setEnv('FLOW_KERNEL_HTTP', previousEndpoint);
            setEnv('FLOW_KERNEL_MODE', previousMode);
            await server.stop();
        }
    });

    it('reconecta stream WebSocket e preserva ordering/dedupe dos eventos', async () => {
        const workflow = sampleWorkflow();
        const kernelRun = {
            id: 'kernel-run-ws-reconnect',
            workflowId: workflow.id,
            workflow,
            status: 'running',
            createdAt: '2026-05-20T11:10:00.000Z',
            updatedAt: '2026-05-20T11:10:00.000Z'
        };
        const events: Array<Record<string, unknown>> = [{
            seq: 1,
            time: '2026-05-20T11:10:00.100Z',
            type: 'run.started',
            runId: kernelRun.id,
            message: 'started'
        }];
        const server = new MockKernelWebSocketServer({
            validate_workflow: () => ({ type: 'validate_workflow.ok', valid: true, workflowId: workflow.id }),
            start_run: () => ({ type: 'start_run.ok', run: kernelRun }),
            get_run: () => ({ type: 'get_run.ok', run: kernelRun }),
            list_events: () => ({ type: 'list_events.ok', events })
        });
        const endpoint = await server.start();

        const previousEndpoint = process.env.FLOW_KERNEL_HTTP;
        const previousMode = process.env.FLOW_KERNEL_MODE;
        process.env.FLOW_KERNEL_HTTP = endpoint;
        process.env.FLOW_KERNEL_MODE = 'external';

        try {
            const bridge = new ExternalFlowKernelBridge();
            const run = await bridge.startRun(workflow, 'review this over ws reconnect', 'project summary');
            const updates: string[][] = [];
            const dispose = await bridge.subscribeRunEvents?.(workflow, run, undefined, updated => {
                updates.push(updated.events.map(event => `${event.id}:${event.message}`));
            });

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
            await waitFor(() => updates.length >= 1);

            server.closeConnections();
            await waitFor(() => server.upgradePaths().length >= 2);
            events.push({
                seq: 3,
                time: '2026-05-20T11:10:03.500Z',
                type: 'artifact.created',
                runId: kernelRun.id,
                message: 'new duplicate'
            });
            server.push({ type: 'events', events: [events[3]] });
            await waitFor(() => updates.some(update => update.includes('3:new duplicate')));

            const latest = updates[updates.length - 1].filter(item => /^\d+:/.test(item));
            expect(latest).to.deep.equal(['1:started', '2:workload started', '3:new duplicate']);
            dispose?.();
        } finally {
            setEnv('FLOW_KERNEL_HTTP', previousEndpoint);
            setEnv('FLOW_KERNEL_MODE', previousMode);
            await server.stop();
        }
    });

    it('normaliza ws sem path para /ws em vez de rejeitar o endpoint', async () => {
        const workflow = sampleWorkflow();
        const server = new MockKernelWebSocketServer({
            validate_workflow: () => ({ type: 'validate_workflow.ok', valid: true, workflowId: workflow.id }),
            start_run: () => ({
                type: 'start_run.ok',
                run: {
                    id: 'kernel-run-ws-default-path',
                    workflowId: workflow.id,
                    workflow,
                    status: 'running',
                    createdAt: '2026-05-20T11:30:00.000Z',
                    updatedAt: '2026-05-20T11:30:00.000Z'
                }
            }),
            list_events: () => ({ type: 'list_events.ok', events: [] })
        });
        const endpoint = await server.start();
        const rootEndpoint = endpoint.replace(/\/ws$/, '');
        const previousEndpoint = process.env.FLOW_KERNEL_HTTP;
        const previousMode = process.env.FLOW_KERNEL_MODE;
        process.env.FLOW_KERNEL_HTTP = rootEndpoint;
        process.env.FLOW_KERNEL_MODE = 'external';

        try {
            const run = await new ExternalFlowKernelBridge().startRun(workflow, 'review this over ws root', 'project summary');

            expect(run.externalKernelMetadata?.kernelRunId).to.equal('kernel-run-ws-default-path');
            expect(server.upgradePaths()).to.deep.equal(['/ws']);
        } finally {
            setEnv('FLOW_KERNEL_HTTP', previousEndpoint);
            setEnv('FLOW_KERNEL_MODE', previousMode);
            await server.stop();
        }
    });

    it('registra request_artifact_open como disponibilidade sem autoabrir artifact', async () => {
        const workflow = sampleWorkflow();
        const initialRun = {
            id: 'kernel-run-artifact-open',
            workflowId: workflow.id,
            workflow,
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
        const server = new MockKernelHttpServer({
            validate_workflow: () => ({ type: 'validate_workflow.ok', valid: true, workflowId: workflow.id }),
            start_run: () => ({ type: 'start_run.ok', run: initialRun, requests: initialRun.requests }),
            list_events: () => ({ type: 'list_events.ok', events: [] }),
            signal_recorded: request => {
                expect(request.key).to.equal('artifact.artifact-1.open.available');
                expect(request.value).to.deep.equal({
                    artifactId: 'artifact-1',
                    target: 'out/report.md',
                    available: true,
                    autoOpen: false,
                    requiresUserAction: true,
                    disposition: 'available_for_user_requested_open'
                });
                return { type: 'signal_recorded.ok', run: { ...initialRun, requests: [] } };
            }
        });
        const endpoint = await server.start();
        const previousEndpoint = process.env.FLOW_KERNEL_HTTP;
        const previousMode = process.env.FLOW_KERNEL_MODE;
        process.env.FLOW_KERNEL_HTTP = endpoint;
        process.env.FLOW_KERNEL_MODE = 'external';

        try {
            await new ExternalFlowKernelBridge().startRun(workflow, 'open report when requested', 'summary');

            expect(server.requestTypes()).to.deep.equal([
                'validate_workflow',
                'start_run',
                'signal_recorded',
                'list_events'
            ]);
        } finally {
            setEnv('FLOW_KERNEL_HTTP', previousEndpoint);
            setEnv('FLOW_KERNEL_MODE', previousMode);
            await server.stop();
        }
    });

    it('encaminha request_human_gate pela UI como callback gate_approved sem decidir transicao no frontend', async () => {
        const workflow = sampleWorkflow();
        const waitingRun = {
            id: 'kernel-run-gate',
            workflowId: workflow.id,
            workflow,
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
        const approvedRun = {
            ...waitingRun,
            status: 'running',
            updatedAt: '2026-05-20T10:01:00.000Z',
            activeStates: { execution: true },
            completedStates: { intake: true, review: true },
            requests: []
        };
        let events: unknown[] = [{
            seq: 1,
            time: '2026-05-20T10:00:00.000Z',
            type: 'gate.waiting',
            runId: 'kernel-run-gate',
            stateId: 'review',
            gateId: 'gate-review',
            message: 'Approve review'
        }];
        const server = new MockKernelHttpServer({
            validate_workflow: () => ({ type: 'validate_workflow.ok', valid: true, workflowId: workflow.id }),
            start_run: () => ({ type: 'start_run.ok', run: waitingRun, requests: waitingRun.requests }),
            list_events: () => ({ type: 'list_events.ok', events }),
            gate_approved: request => {
                expect(request.gateId).to.equal('gate-review');
                expect(request.note).to.equal('approved in UI');
                events = [
                    ...events,
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
                ];
                return { type: 'gate_approved.ok', run: approvedRun, requests: [] };
            }
        });
        const endpoint = await server.start();
        const previousEndpoint = process.env.FLOW_KERNEL_HTTP;
        const previousMode = process.env.FLOW_KERNEL_MODE;
        process.env.FLOW_KERNEL_HTTP = endpoint;
        process.env.FLOW_KERNEL_MODE = 'external';

        try {
            const bridge = new ExternalFlowKernelBridge();
            const waiting = await bridge.startRun(workflow, 'needs approval', 'summary');
            expect(waiting.status).to.equal('waiting_gate');
            expect(waiting.gates[0]).to.include({ id: 'gate-review', status: 'pending' });

            const approved = await bridge.approveGate(workflow, waiting, {
                runId: waiting.id,
                gateId: 'gate-review',
                decision: 'approved',
                note: 'approved in UI'
            });

            expect(approved.gates[0]).to.include({ id: 'gate-review', status: 'approved' });
            expect(approved.currentStateIds).to.deep.equal(['execution']);
            expect(approved.events.map(event => event.type)).to.include('transition.fired');
            expect(server.requestTypes()).to.deep.equal([
                'validate_workflow',
                'start_run',
                'list_events',
                'gate_approved',
                'list_events'
            ]);
        } finally {
            setEnv('FLOW_KERNEL_HTTP', previousEndpoint);
            setEnv('FLOW_KERNEL_MODE', previousMode);
            await server.stop();
        }
    });

    it('encaminha rejeicao de gate externo como callback gate_rejected', async () => {
        const workflow = sampleWorkflow();
        const waitingRun = {
            id: 'kernel-run-gate-reject',
            workflowId: workflow.id,
            workflow,
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
        let events: unknown[] = [{
            seq: 1,
            time: '2026-05-20T10:00:00.000Z',
            type: 'gate.waiting',
            runId: 'kernel-run-gate-reject',
            stateId: 'review',
            gateId: 'gate-review',
            message: 'Approve review'
        }];
        const rejectedRun = {
            ...waitingRun,
            status: 'failed',
            updatedAt: '2026-05-20T10:01:00.000Z',
            activeStates: {},
            requests: []
        };
        const server = new MockKernelHttpServer({
            validate_workflow: () => ({ type: 'validate_workflow.ok', valid: true, workflowId: workflow.id }),
            start_run: () => ({ type: 'start_run.ok', run: waitingRun, requests: [] }),
            list_events: () => ({ type: 'list_events.ok', events }),
            gate_rejected: request => {
                expect(request.gateId).to.equal('gate-review');
                events = [...events, {
                    seq: 2,
                    time: '2026-05-20T10:01:00.000Z',
                    type: 'gate.rejected',
                    runId: 'kernel-run-gate-reject',
                    stateId: 'review',
                    gateId: 'gate-review',
                    message: 'gate rejected'
                }];
                return { type: 'gate_rejected.ok', run: rejectedRun, requests: [] };
            }
        });
        const endpoint = await server.start();
        const previousEndpoint = process.env.FLOW_KERNEL_HTTP;
        const previousMode = process.env.FLOW_KERNEL_MODE;
        process.env.FLOW_KERNEL_HTTP = endpoint;
        process.env.FLOW_KERNEL_MODE = 'external';

        try {
            const bridge = new ExternalFlowKernelBridge();
            const waiting = await bridge.startRun(workflow, 'needs approval', 'summary');
            const rejected = await bridge.approveGate(workflow, waiting, {
                runId: waiting.id,
                gateId: 'gate-review',
                decision: 'rejected'
            });

            expect(rejected.status).to.equal('failed');
            expect(rejected.gates[0]).to.include({ id: 'gate-review', status: 'rejected' });
            expect(server.requestTypes()).to.deep.equal([
                'validate_workflow',
                'start_run',
                'list_events',
                'gate_rejected',
                'list_events'
            ]);
        } finally {
            setEnv('FLOW_KERNEL_HTTP', previousEndpoint);
            setEnv('FLOW_KERNEL_MODE', previousMode);
            await server.stop();
        }
    });

    it('executa workloads paralelos do kernel pelo executor de host sem compartilhar contexto entre agentes', async () => {
        const workflow: FlowWorkflow = {
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
        const initialRun = {
            id: 'kernel-run-parallel',
            workflowId: workflow.id,
            workflow,
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
        const executions: string[] = [];
        let inFlight = 0;
        let maxInFlight = 0;
        const executor: FlowWorkloadExecutor = {
            execute: async (context: FlowWorkloadExecutionContext) => {
                executions.push(context.workload.stateId);
                inFlight += 1;
                maxInFlight = Math.max(maxInFlight, inFlight);
                expect(context.run.workloads.filter(workload => workload.status === 'done')).to.have.length(0);
                await Promise.resolve();
                inFlight -= 1;
                context.workload.status = 'done';
                context.workload.outputArtifacts = [`file:///tmp/${context.workload.stateId}.md`];
                context.run.artifacts.push({
                    id: `${context.workload.id}-artifact`,
                    runId: context.run.id,
                    stateId: context.workload.stateId,
                    uri: context.workload.outputArtifacts[0],
                    kind: 'report',
                    summary: context.workload.outputArtifacts[0],
                    createdAt: '2026-05-20T10:00:01.000Z'
                });
                context.run.signals.push({
                    key: `${context.workload.stateId}.status`,
                    value: 'completed',
                    stateId: context.workload.stateId,
                    runId: context.run.id,
                    createdAt: '2026-05-20T10:00:01.000Z'
                });
                return {};
            },
            executeAgentWorkload: async context => executor.execute(context),
            executeContextWorkload: async context => executor.execute(context),
            executeCommandWorkload: async context => executor.execute(context),
            executeMemoryWriteWorkload: async context => executor.execute(context),
            executeReportWorkload: async context => executor.execute(context)
        };
        const server = new MockKernelHttpServer({
            validate_workflow: () => ({ type: 'validate_workflow.ok', valid: true, workflowId: workflow.id }),
            start_run: () => ({ type: 'start_run.ok', run: initialRun, requests: initialRun.requests }),
            list_events: () => ({ type: 'list_events.ok', events: [] }),
            workload_started: () => ({ type: 'workload_started.ok', run: initialRun }),
            artifact_created: () => ({ type: 'artifact_created.ok', run: initialRun }),
            signal_recorded: () => ({ type: 'signal_recorded.ok', run: initialRun }),
            workload_completed: () => ({ type: 'workload_completed.ok', run: { ...initialRun, requests: [] } })
        });
        const endpoint = await server.start();
        const previousEndpoint = process.env.FLOW_KERNEL_HTTP;
        const previousMode = process.env.FLOW_KERNEL_MODE;
        process.env.FLOW_KERNEL_HTTP = endpoint;
        process.env.FLOW_KERNEL_MODE = 'external';

        try {
            await new ExternalFlowKernelBridge(executor).startRun(workflow, 'build it', 'summary', 'file:///workspace');

            expect(executions).to.have.members(['backend_work', 'frontend_work', 'designer_work']);
            expect(maxInFlight).to.be.greaterThan(1);
            expect(server.requestTypes().filter(type => type === 'workload_started')).to.have.length(3);
            expect(server.requestTypes().filter(type => type === 'workload_completed')).to.have.length(3);
        } finally {
            setEnv('FLOW_KERNEL_HTTP', previousEndpoint);
            setEnv('FLOW_KERNEL_MODE', previousMode);
            await server.stop();
        }
    });

    it('trata request_context_pack via MemoryAdapter e confirma no kernel', async () => {
        const workflow = sampleWorkflow();
        const initialRun = {
            id: 'kernel-run-context',
            workflowId: workflow.id,
            workflow,
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
        const completedRun = { ...initialRun, requests: [] };
        const buildCalls: unknown[] = [];
        const memory = {
            buildContextPack: async (workspaceRootUri: string | undefined, requestedWorkflow: FlowWorkflow, workload: unknown) => {
                buildCalls.push({ workspaceRootUri, workflowId: requestedWorkflow.id, workload });
                return {
                    workspaceRootUri,
                    summary: 'Context pack from Memory.',
                    workflow: { id: requestedWorkflow.id, name: requestedWorkflow.name, stateCount: requestedWorkflow.states.length, transitionCount: requestedWorkflow.transitions.length, agentIds: [] },
                    files: [{ uri: 'file:///workspace/src/app.ts', reason: 'Relevant source' }],
                    symbols: ['App'],
                    signals: [{ key: 'context.ready', value: true }]
                };
            }
        };
        const server = new MockKernelHttpServer({
            validate_workflow: () => ({ type: 'validate_workflow.ok', valid: true, workflowId: workflow.id }),
            start_run: () => ({ type: 'start_run.ok', run: initialRun, requests: initialRun.requests }),
            list_events: () => ({ type: 'list_events.ok', events: [] }),
            workload_started: () => ({ type: 'workload_started.ok', run: initialRun }),
            artifact_created: request => {
                expect(request.artifactType).to.equal('other');
                expect(String(request.path || '')).to.contain('context-pack-kernel-run-context-wl_context');
                return { type: 'artifact_created.ok', run: initialRun };
            },
            signal_recorded: request => {
                expect(request.key).to.equal('memory.context_pack.built');
                return { type: 'signal_recorded.ok', run: initialRun };
            },
            workload_completed: request => {
                expect(request.workloadId).to.equal('wl_context');
                return { type: 'workload_completed.ok', run: completedRun };
            }
        });
        const endpoint = await server.start();
        const previousEndpoint = process.env.FLOW_KERNEL_HTTP;
        const previousMode = process.env.FLOW_KERNEL_MODE;
        process.env.FLOW_KERNEL_HTTP = endpoint;
        process.env.FLOW_KERNEL_MODE = 'external';

        try {
            await new ExternalFlowKernelBridge(new ProviderBackedFlowWorkloadExecutor(), memory as any)
                .startRun(workflow, 'build context', 'summary', 'file:///workspace');

            expect(buildCalls).to.have.length(1);
            expect(server.requestTypes()).to.include.members(['workload_started', 'artifact_created', 'signal_recorded', 'workload_completed']);
        } finally {
            setEnv('FLOW_KERNEL_HTTP', previousEndpoint);
            setEnv('FLOW_KERNEL_MODE', previousMode);
            await server.stop();
        }
    });

    it('trata request_memory_write como candidato explicito sem persistir memoria automaticamente', async () => {
        const workflow = sampleWorkflow();
        const initialRun = {
            id: 'kernel-run-memory',
            workflowId: workflow.id,
            workflow,
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
        let executorCalled = false;
        const executor: FlowWorkloadExecutor = {
            execute: async () => {
                executorCalled = true;
                return {};
            },
            executeAgentWorkload: async context => executor.execute(context),
            executeContextWorkload: async context => executor.execute(context),
            executeCommandWorkload: async context => executor.execute(context),
            executeMemoryWriteWorkload: async context => executor.execute(context),
            executeReportWorkload: async context => executor.execute(context)
        };
        const server = new MockKernelHttpServer({
            validate_workflow: () => ({ type: 'validate_workflow.ok', valid: true, workflowId: workflow.id }),
            start_run: () => ({ type: 'start_run.ok', run: initialRun, requests: initialRun.requests }),
            list_events: () => ({ type: 'list_events.ok', events: [] }),
            workload_started: () => ({ type: 'workload_started.ok', run: initialRun }),
            effect_recorded: request => {
                expect(request.effectType).to.equal('memory.write');
                expect(request.status).to.equal('proposed');
                expect(request.approvalPolicy).to.equal('human_gate_required');
                return { type: 'effect_recorded.ok', run: initialRun };
            },
            signal_recorded: request => {
                expect(request.key).to.equal('memory_write.candidate_proposed');
                return { type: 'signal_recorded.ok', run: initialRun };
            },
            workload_completed: request => {
                expect(request.workloadId).to.equal('wl_memory');
                return { type: 'workload_completed.ok', run: { ...initialRun, requests: [] } };
            }
        });
        const endpoint = await server.start();
        const previousEndpoint = process.env.FLOW_KERNEL_HTTP;
        const previousMode = process.env.FLOW_KERNEL_MODE;
        process.env.FLOW_KERNEL_HTTP = endpoint;
        process.env.FLOW_KERNEL_MODE = 'external';

        try {
            await new ExternalFlowKernelBridge(executor).startRun(workflow, 'review memory', 'summary', 'file:///workspace');

            expect(executorCalled).to.equal(false);
            expect(server.requestTypes()).to.include.members(['workload_started', 'effect_recorded', 'signal_recorded', 'workload_completed']);
        } finally {
            setEnv('FLOW_KERNEL_HTTP', previousEndpoint);
            setEnv('FLOW_KERNEL_MODE', previousMode);
            await server.stop();
        }
    });

    it('trata request_command_execution pelo CommandEffectHostAdapter e audita o resultado no kernel', async () => {
        const workflow: FlowWorkflow = {
            ...sampleWorkflow(),
            states: {
                command_step: {
                    type: 'command' as any,
                    command: 'node -e "console.log(process.env.SAFE_TOKEN)"',
                    cwd: 'tools',
                    env: { SAFE_TOKEN: 'secret-token-value', UNSAFE_TOKEN: 'blocked' },
                    allowedEnv: ['SAFE_TOKEN'],
                    allowedCommands: ['node'],
                    timeoutMs: 1234,
                    approvalPolicy: 'auto'
                } as any
            },
            transitions: []
        };
        const initialRun = {
            id: 'kernel-run-command',
            workflowId: workflow.id,
            workflow,
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
        const commandCalls: unknown[] = [];
        const commandAdapter: CommandEffectHostAdapter = {
            prepare: async () => {
                throw new Error('prepare should not be called directly');
            },
            apply: async (workspaceRootUri, effect) => {
                commandCalls.push({ workspaceRootUri, effect });
                return {
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
                };
            }
        };
        const server = new MockKernelHttpServer({
            validate_workflow: () => ({ type: 'validate_workflow.ok', valid: true, workflowId: workflow.id }),
            start_run: () => ({ type: 'start_run.ok', run: initialRun, requests: initialRun.requests }),
            list_events: () => ({ type: 'list_events.ok', events: [] }),
            workload_started: () => ({ type: 'workload_started.ok', run: initialRun }),
            effect_recorded: request => {
                expect(request.effectType).to.equal('command.executed');
                expect(request.command).to.equal('node -e "console.log(process.env.SAFE_TOKEN)"');
                expect(request.status).to.equal('applied');
                expect((request.effect as any).env).to.deep.equal({ SAFE_TOKEN: 'secret-token-value' });
                expect((request.effect as any).stdout).to.equal('[REDACTED]');
                return { type: 'effect_recorded.ok', run: initialRun };
            },
            signal_recorded: request => {
                expect(request.key).to.equal('command_execution.status');
                expect(request.value).to.equal('applied');
                return { type: 'signal_recorded.ok', run: initialRun };
            },
            workload_completed: request => {
                expect(request.workloadId).to.equal('wl_command');
                return { type: 'workload_completed.ok', run: { ...initialRun, requests: [] } };
            }
        });
        const endpoint = await server.start();
        const previousEndpoint = process.env.FLOW_KERNEL_HTTP;
        const previousMode = process.env.FLOW_KERNEL_MODE;
        process.env.FLOW_KERNEL_HTTP = endpoint;
        process.env.FLOW_KERNEL_MODE = 'external';

        try {
            await new ExternalFlowKernelBridge(new ProviderBackedFlowWorkloadExecutor(), undefined, commandAdapter)
                .startRun(workflow, 'run command', 'summary', 'file:///workspace');

            expect(commandCalls).to.deep.equal([{
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
            expect(server.requestTypes()).to.include.members(['workload_started', 'effect_recorded', 'signal_recorded', 'workload_completed']);
        } finally {
            setEnv('FLOW_KERNEL_HTTP', previousEndpoint);
            setEnv('FLOW_KERNEL_MODE', previousMode);
            await server.stop();
        }
    });

    it('confirma workload_failed no kernel quando o executor de host falha um workload', async () => {
        const workflow = sampleWorkflow();
        const initialRun = {
            id: 'kernel-run-workload-failure',
            workflowId: workflow.id,
            workflow,
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
        const failedRun = {
            ...initialRun,
            status: 'failed',
            updatedAt: '2026-05-20T10:01:00.000Z',
            requests: []
        };
        const executor: FlowWorkloadExecutor = {
            execute: async context => {
                context.workload.status = 'failed';
                context.workload.issues.push('Reviewer agent failed contract validation.');
                return {};
            },
            executeAgentWorkload: async context => executor.execute(context),
            executeContextWorkload: async context => executor.execute(context),
            executeCommandWorkload: async context => executor.execute(context),
            executeMemoryWriteWorkload: async context => executor.execute(context),
            executeReportWorkload: async context => executor.execute(context)
        };
        const server = new MockKernelHttpServer({
            validate_workflow: () => ({ type: 'validate_workflow.ok', valid: true, workflowId: workflow.id }),
            start_run: () => ({ type: 'start_run.ok', run: initialRun, requests: initialRun.requests }),
            list_events: () => ({ type: 'list_events.ok', events: [] }),
            workload_started: request => {
                expect(request.workloadId).to.equal('wl_review');
                return { type: 'workload_started.ok', run: initialRun };
            },
            artifact_created: request => {
                expect(request.artifactType).to.equal('input');
                return { type: 'artifact_created.ok', run: initialRun };
            },
            issue_recorded: request => {
                expect(request.workloadId).to.equal('wl_review');
                expect(request.issue).to.deep.equal({
                    severity: 'non_blocking',
                    type: 'workload_issue',
                    summary: 'Reviewer agent failed contract validation.'
                });
                return { type: 'issue_recorded.ok', run: initialRun };
            },
            workload_failed: request => {
                expect(request.workloadId).to.equal('wl_review');
                expect(request.error).to.equal('Reviewer agent failed contract validation.');
                return { type: 'workload_failed.ok', run: failedRun };
            }
        });
        const endpoint = await server.start();
        const previousEndpoint = process.env.FLOW_KERNEL_HTTP;
        const previousMode = process.env.FLOW_KERNEL_MODE;
        process.env.FLOW_KERNEL_HTTP = endpoint;
        process.env.FLOW_KERNEL_MODE = 'external';

        try {
            const run = await new ExternalFlowKernelBridge(executor)
                .startRun(workflow, 'review this', 'summary', 'file:///workspace');

            expect(run.status).to.equal('failed');
            expect(server.requestTypes()).to.deep.equal([
                'validate_workflow',
                'start_run',
                'workload_started',
                'list_events',
                'artifact_created',
                'issue_recorded',
                'workload_failed',
                'list_events'
            ]);
        } finally {
            setEnv('FLOW_KERNEL_HTTP', previousEndpoint);
            setEnv('FLOW_KERNEL_MODE', previousMode);
            await server.stop();
        }
    });

    it('deduplica eventos duplicados do kernel por seq', async () => {
        const workflow = sampleWorkflow();
        const server = new MockKernelHttpServer({
            validate_workflow: () => ({ type: 'validate_workflow.ok', valid: true, workflowId: workflow.id }),
            start_run: () => ({
                type: 'start_run.ok',
                run: {
                    id: 'kernel-run-dup',
                    workflowId: workflow.id,
                    workflow,
                    status: 'running',
                    createdAt: '2026-05-19T10:10:00.000Z',
                    updatedAt: '2026-05-19T10:10:00.000Z'
                }
            }),
            list_events: () => ({
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
            })
        });
        const endpoint = await server.start();

        const previousEndpoint = process.env.FLOW_KERNEL_HTTP;
        const previousMode = process.env.FLOW_KERNEL_MODE;
        process.env.FLOW_KERNEL_HTTP = endpoint;
        process.env.FLOW_KERNEL_MODE = 'external';

        try {
            const run = await new ExternalFlowKernelBridge().startRun(workflow, 'review this', 'project summary');

            const duplicated = run.events.filter(event => event.id === '12');
            expect(duplicated).to.have.length(1);
            expect(duplicated[0].message).to.equal('deduped override');
            expect(server.requestTypes()).to.deep.equal(['validate_workflow', 'start_run', 'list_events']);
        } finally {
            setEnv('FLOW_KERNEL_HTTP', previousEndpoint);
            setEnv('FLOW_KERNEL_MODE', previousMode);
            await server.stop();
        }
    });

    it('falha claramente quando o kernel externo falha sem fallback para simulacao', async () => {
        const workflow = sampleWorkflow();
        let externalCalls = 0;

        const bridge = new HybridFlowKernelBridge() as HybridFlowKernelBridge & { external: FlowKernelBridge };
        bridge.external = {
            available: () => true,
            getBridgeMode: async () => 'external',
            startRun: async () => {
                externalCalls += 1;
                throw new Error('Kernel unavailable');
            },
            tickRun: async () => {
                throw new Error('Kernel unavailable');
            },
            approveGate: async () => {
                throw new Error('Kernel unavailable');
            },
            pauseRun: async () => {
                throw new Error('Kernel unavailable');
            },
            resumeRun: async () => {
                throw new Error('Kernel unavailable');
            },
            cancelRun: async () => {
                throw new Error('Kernel unavailable');
            },
            refreshRun: async () => {
                throw new Error('Kernel unavailable');
            }
        };

        const previousMode = process.env.FLOW_KERNEL_MODE;
        process.env.FLOW_KERNEL_MODE = 'external';

        try {
            let failure: Error | undefined;
            try {
                await bridge.startRun(workflow, 'review this', 'project summary');
            } catch (error) {
                failure = error instanceof Error ? error : new Error(String(error));
            }

            expect(externalCalls).to.equal(1);
            expect(failure?.message).to.contain('External Flow Kernel startRun failed: Kernel unavailable');
            expect(failure?.message).to.contain('Simulated fallback is disabled');
        } finally {
            setEnv('FLOW_KERNEL_MODE', previousMode);
        }
    });

    it('recupera da perda de processo do transport com restart e reconexao', async () => {
        const transport = new FlakyStdioTransport();
        const external = new ExternalFlowKernelBridge();
        (external as unknown as { transport: unknown }).transport = transport;

        const run = await external.startRun(sampleWorkflow(), 'retry this', 'project summary');

        expect(transport.calls).to.deep.equal(['validate_workflow', 'start_run', 'start_run', 'list_events']);
        expect(transport.restartCount).to.equal(1);
        expect(run.externalKernelMetadata?.kernelRunId).to.equal('kernel-run-recovered');
        expect(run.events.map(event => event.type)).to.include('run.started');
    });

    it('alterna capability simulated apenas em modo explicito e falha sem kernel externo no padrao', async () => {
        let externalAvailable = true;
        let externalModeChecks = 0;
        const workflow = sampleWorkflow();
        const fakeExternal: FlowKernelBridge = {
            available: () => externalAvailable,
            getBridgeMode: async () => {
                externalModeChecks += 1;
                return 'external';
            },
            startRun: async () => {
                throw new Error('should not be called');
            },
            tickRun: async () => {
                throw new Error('should not be called');
            },
            approveGate: async () => {
                throw new Error('should not be called');
            },
            pauseRun: async () => {
                throw new Error('should not be called');
            },
            resumeRun: async () => {
                throw new Error('should not be called');
            },
            cancelRun: async () => {
                throw new Error('should not be called');
            },
            refreshRun: async () => {
                throw new Error('should not be called');
            }
        };

        const bridge = new HybridFlowKernelBridge() as HybridFlowKernelBridge & { external: FlowKernelBridge };
        bridge.external = fakeExternal;

        const previousMode = process.env.FLOW_KERNEL_MODE;
        try {
            process.env.FLOW_KERNEL_MODE = 'simulated';
            expect(await bridge.getBridgeMode()).to.equal('simulated');
            expect(externalModeChecks).to.equal(0);
            expect((await bridge.startRun(workflow, 'x', 'y').then(() => 0))).to.equal(0);
            expect(externalModeChecks).to.equal(0);

            process.env.FLOW_KERNEL_MODE = 'auto';
            expect(await bridge.getBridgeMode()).to.equal('external');
            expect(externalModeChecks).to.equal(1);

            externalAvailable = false;
            setEnv('FLOW_KERNEL_MODE', undefined);
            let defaultFailure: Error | undefined;
            try {
                await bridge.startRun(workflow, 'x', 'y');
            } catch (error) {
                defaultFailure = error instanceof Error ? error : new Error(String(error));
            }
            expect(defaultFailure?.message).to.contain('External Flow Kernel startRun is unavailable');
            expect(defaultFailure?.message).to.contain('Simulated fallback is disabled');

            process.env.FLOW_KERNEL_MODE = 'auto';
            let autoModeFailure: Error | undefined;
            try {
                await bridge.getBridgeMode();
            } catch (error) {
                autoModeFailure = error instanceof Error ? error : new Error(String(error));
            }
            expect(autoModeFailure?.message).to.contain('External Flow Kernel getBridgeMode is unavailable');
            expect(autoModeFailure?.message).to.contain('Simulated fallback is disabled');
            expect(externalModeChecks).to.equal(1);
        } finally {
            setEnv('FLOW_KERNEL_MODE', previousMode);
        }
    });

function setEnv(name: string, value: string | undefined): void {
    if (value === undefined) {
        delete process.env[name];
        return;
    }
    process.env[name] = value;
}
});

function kernelWorkload(id: string, stateId: string, agent: string): Record<string, unknown> {
    return {
        id,
        runId: 'kernel-run-parallel',
        stateId,
        parentState: 'parallel_delivery',
        agent,
        type: 'agent',
        status: 'waiting_for_host',
        input: { include: [] },
        outputs: [`delivery/${stateId}.md`],
        createdAt: '2026-05-20T10:00:00.000Z'
    };
}

function hostWorkloadRequest(workloadId: string, stateId: string, agent: string): Record<string, unknown> {
    return {
        id: workloadId,
        type: 'execute_workload',
        requestId: workloadId,
        runId: 'kernel-run-parallel',
        workloadId,
        stateId,
        agent,
        inputArtifacts: [],
        outputContract: 'schemas/workload-output.schema.json'
    };
}

function workloadOutput(
    status: 'completed' | 'failed',
    summary: string,
    artifacts: Array<{ path: string; content: string }>,
    signals: Record<string, string | number | boolean> = {},
    extraIssues: Array<Record<string, string>> = []
): string {
    const issues = [
        ...(status === 'failed'
            ? [{ severity: 'blocking', type: 'contract_validation', summary }]
            : []),
        ...extraIssues
    ];
    return JSON.stringify({
        result: {
            status,
            summary,
            artifacts,
            signals,
            issues
        },
        report: summary,
        artifacts,
        signals,
        issues
    });
}

function validContractPackage(): Record<string, unknown> {
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

class MockKernelHttpServer {
    private server?: http.Server;
    private readonly requestLog: Record<string, unknown>[] = [];

    constructor(
        private readonly handlers: Record<string, (request: Record<string, unknown>) => Record<string, unknown>>
    ) {
    }

    async start(): Promise<string> {
        this.server = http.createServer((request, response) => {
            let raw = '';
            request.setEncoding('utf8');
            request.on('data', chunk => {
                raw += chunk;
            });
            request.on('end', () => {
                let payload: Record<string, unknown>;
                try {
                    payload = raw ? JSON.parse(raw) as Record<string, unknown> : {};
                } catch {
                    response.statusCode = 500;
                    response.end(JSON.stringify({ type: 'request.parse_error', error: 'invalid json payload' }));
                    return;
                }
                this.requestLog.push(payload);
                const type = String(payload.type || '');
                const handler = this.handlers[type] || this.defaultHandler(type);
                if (!handler) {
                    response.statusCode = 400;
                    response.end(JSON.stringify({ type: `${type}.error`, error: `no mock handler for ${type}` }));
                    return;
                }
                const responsePayload = handler(payload);
                response.setHeader('content-type', 'application/json');
                response.end(JSON.stringify(responsePayload));
            });
        });
        await new Promise<void>((resolve, reject) => {
            this.server?.listen(0, '127.0.0.1', () => resolve());
            this.server?.on('error', reject);
        });
        const address = this.server?.address();
        if (!address || typeof address === 'string') {
            throw new Error('Unable to determine mocked kernel endpoint.');
        }
        return `http://127.0.0.1:${address.port}`;
    }

    requestTypes(): string[] {
        return this.requestLog
            .map(request => String(request.type || ''))
            .filter(type => type !== 'handshake' && type !== 'status');
    }

    private defaultHandler(type: string): ((request: Record<string, unknown>) => Record<string, unknown>) | undefined {
        switch (type) {
            case 'handshake':
                return () => ({ type: 'handshake.ok', protocol: 'flow-kernel/stdio/v1', version: 'flow.workflow/v1' });
            case 'status':
                return () => ({ type: 'status.ok', status: 'ready' });
            default:
                return undefined;
        }
    }

    async stop(): Promise<void> {
        if (!this.server) {
            return;
        }
        await new Promise<void>((resolve, reject) => {
            this.server?.close(error => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve();
            });
        });
        this.server = undefined;
    }
}

class MockKernelWebSocketServer {
    private server?: http.Server;
    private readonly requestLog: Record<string, unknown>[] = [];
    private readonly paths: string[] = [];
    private readonly sockets = new Set<Duplex>();

    constructor(
        private readonly handlers: Record<string, (request: Record<string, unknown>) => Record<string, unknown>>
    ) {
    }

    async start(): Promise<string> {
        this.server = http.createServer();
        this.server.on('upgrade', (request, socket) => {
            this.paths.push(request.url || '');
            if (request.url !== '/ws') {
                socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
                socket.destroy();
                return;
            }
            const key = request.headers['sec-websocket-key'];
            if (typeof key !== 'string') {
                socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
                socket.destroy();
                return;
            }
            this.sockets.add(socket);
            socket.on('close', () => this.sockets.delete(socket));
            socket.write([
                'HTTP/1.1 101 Switching Protocols',
                'Upgrade: websocket',
                'Connection: Upgrade',
                `Sec-WebSocket-Accept: ${webSocketAcceptKey(key)}`,
                '\r\n'
            ].join('\r\n'));
            socket.on('data', chunk => {
                const message = decodeWebSocketTextFrame(chunk);
                if (!message) {
                    return;
                }
                const responsePayload = this.handleMessage(message);
                socket.write(encodeWebSocketTextFrame(JSON.stringify(responsePayload)));
            });
        });
        await new Promise<void>((resolve, reject) => {
            this.server?.listen(0, '127.0.0.1', () => resolve());
            this.server?.on('error', reject);
        });
        const address = this.server?.address();
        if (!address || typeof address === 'string') {
            throw new Error('Unable to determine mocked kernel WebSocket endpoint.');
        }
        return `ws://127.0.0.1:${address.port}/ws`;
    }

    requestTypes(): string[] {
        return this.requestLog
            .map(request => String(request.type || ''))
            .filter(type => type !== 'handshake' && type !== 'status');
    }

    upgradePaths(): string[] {
        return [...this.paths];
    }

    push(message: Record<string, unknown>): void {
        const frame = encodeWebSocketTextFrame(JSON.stringify(message));
        for (const socket of this.sockets) {
            socket.write(frame);
        }
    }

    closeConnections(): void {
        for (const socket of [...this.sockets]) {
            socket.destroy();
        }
    }

    async stop(): Promise<void> {
        for (const socket of this.sockets) {
            socket.destroy();
        }
        this.sockets.clear();
        if (!this.server) {
            return;
        }
        await new Promise<void>((resolve, reject) => {
            this.server?.close(error => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve();
            });
        });
        this.server = undefined;
    }

    private handleMessage(raw: string): Record<string, unknown> {
        let payload: Record<string, unknown>;
        try {
            payload = JSON.parse(raw) as Record<string, unknown>;
        } catch {
            return { type: 'request.parse_error', error: 'invalid json payload' };
        }
        this.requestLog.push(payload);
        const type = String(payload.type || '');
        const handler = this.handlers[type] || this.defaultHandler(type);
        if (!handler) {
            return { type: `${type}.error`, error: `no mock handler for ${type}`, id: payload.id };
        }
        return { id: payload.id, ...handler(payload) };
    }

    private defaultHandler(type: string): ((request: Record<string, unknown>) => Record<string, unknown>) | undefined {
        switch (type) {
            case 'handshake':
                return () => ({ type: 'handshake.ok', protocol: 'flow-kernel/stdio/v1', version: 'flow.workflow/v1' });
            case 'status':
                return () => ({ type: 'status.ok', status: 'ready' });
            default:
                return undefined;
        }
    }
}

function webSocketAcceptKey(key: string): string {
    return crypto
        .createHash('sha1')
        .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
        .digest('base64');
}

function decodeWebSocketTextFrame(frame: Buffer): string | undefined {
    if (frame.length < 2) {
        return undefined;
    }
    const opcode = frame[0] & 0x0f;
    if (opcode === 0x8) {
        return undefined;
    }
    const masked = (frame[1] & 0x80) !== 0;
    let length = frame[1] & 0x7f;
    let offset = 2;
    if (length === 126) {
        length = frame.readUInt16BE(offset);
        offset += 2;
    } else if (length === 127) {
        const longLength = frame.readBigUInt64BE(offset);
        if (longLength > BigInt(Number.MAX_SAFE_INTEGER)) {
            throw new Error('Mock WebSocket frame is too large.');
        }
        length = Number(longLength);
        offset += 8;
    }
    let mask: Buffer | undefined;
    if (masked) {
        mask = frame.subarray(offset, offset + 4);
        offset += 4;
    }
    const payload = Buffer.from(frame.subarray(offset, offset + length));
    if (mask) {
        for (let index = 0; index < payload.length; index += 1) {
            payload[index] = payload[index] ^ mask[index % 4];
        }
    }
    return payload.toString('utf8');
}

function encodeWebSocketTextFrame(message: string): Buffer {
    const payload = Buffer.from(message, 'utf8');
    if (payload.length < 126) {
        return Buffer.concat([Buffer.from([0x81, payload.length]), payload]);
    }
    if (payload.length <= 0xffff) {
        const header = Buffer.alloc(4);
        header[0] = 0x81;
        header[1] = 126;
        header.writeUInt16BE(payload.length, 2);
        return Buffer.concat([header, payload]);
    }
    const header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(payload.length), 2);
    return Buffer.concat([header, payload]);
}

class FlakyStdioTransport {
    public calls: string[] = [];
    public restartCount = 0;
    private startRunCalls = 0;

    public request(message: { type?: string }): Promise<Record<string, unknown>> {
        const requestType = String(message.type || '');
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
        return Promise.reject(new Error(`Unexpected request "${requestType}"`));
    }

    public restart(): Promise<void> {
        this.restartCount += 1;
        return Promise.resolve();
    }
}

async function waitFor(assertion: () => boolean, timeoutMs = 2000): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        if (assertion()) {
            return;
        }
        await new Promise(resolve => setTimeout(resolve, 25));
    }
    throw new Error('Timed out waiting for condition.');
}

function sampleWorkflow(): FlowWorkflow {
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

import { expect } from 'chai';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { FileUri } from '@theia/core/lib/common/file-uri';
import { LanguageModel, LanguageModelRegistry } from '@theia/ai-core';
import {
    FLOW_CAPABILITIES,
    SISYPHUS_ULTRAWORK_COORDINATOR_PRESET_ID,
    FlowRun,
    FlowCapabilities,
    FlowStartRunRequest,
    FlowWorkflow
} from '../common';
import { MemoryAdapter } from './memory-adapter';
import { FlowServiceImpl } from './flow-service';
import { FlowStore } from './flow-store';
import { AgentMarkdownStore } from './agent-markdown-store';

class TestFlowService extends FlowServiceImpl {
    constructor(
        private readonly workflow: FlowWorkflow,
        private readonly capabilities: FlowCapabilities = FLOW_CAPABILITIES
    ) {
        super();
    }

    override getWorkflow(): Promise<FlowWorkflow> {
        return Promise.resolve(this.workflow);
    }

    protected override getRuntimeCapabilities(): Promise<FlowCapabilities> {
        return Promise.resolve(this.capabilities);
    }
}

class RuntimeCapabilitiesFlowService extends FlowServiceImpl {
    readCapabilities(): Promise<FlowCapabilities> {
        return this.getRuntimeCapabilities();
    }
}

class MemoryAuditFlowService extends FlowServiceImpl {
    constructor(private readonly run: FlowRun, memory: Pick<MemoryAdapter, 'writeApprovedMemory'>) {
        super();
        Object.defineProperty(this, 'memory', { value: memory });
        Object.defineProperty(this, 'store', {
            value: {
                saveRun: async (_workspaceRootUri: string | undefined, updatedRun: FlowRun) => {
                    Object.assign(this.run, updatedRun);
                }
            }
        });
    }

    override getRun(): Promise<FlowRun> {
        return Promise.resolve(this.run);
    }
}

class EffectDecisionFlowService extends FlowServiceImpl {
    constructor(private readonly run: FlowRun) {
        super();
        Object.defineProperty(this, 'store', {
            value: {
                saveRun: async (_workspaceRootUri: string | undefined, updatedRun: FlowRun) => {
                    Object.assign(this.run, updatedRun);
                }
            }
        });
        Object.defineProperty(this, 'fileEffectHostAdapter', {
            value: {
                apply: async () => ({
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
                })
            }
        });
    }

    override getRun(): Promise<FlowRun> {
        return Promise.resolve(this.run);
    }
}

class SecondRunFlowService extends FlowServiceImpl {
    readonly savedRuns: FlowRun[] = [];
    readonly savedWorkflows: FlowWorkflow[] = [];

    constructor(private readonly sourceRun: FlowRun, private readonly sourceWorkflow: FlowWorkflow) {
        super();
        Object.defineProperty(this, 'store', {
            value: {
                saveWorkflow: async (_workspaceRootUri: string | undefined, workflow: FlowWorkflow) => {
                    this.savedWorkflows.push(workflow);
                },
                saveRun: async (_workspaceRootUri: string | undefined, run: FlowRun) => {
                    this.savedRuns.push(run);
                    if (run.id === this.sourceRun.id) {
                        Object.assign(this.sourceRun, run);
                    }
                }
            }
        });
        Object.defineProperty(this, 'kernelBridge', {
            value: {
                startRun: async (workflow: FlowWorkflow, prompt: string) => ({
                    id: 'run-2',
                    workflowId: workflow.id,
                    prompt,
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
                } satisfies FlowRun)
            }
        });
        Object.defineProperty(this, 'memory', {
            value: {
                buildContextPack: async (_workspaceRootUri: string | undefined, workflow: FlowWorkflow) => ({
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
                }),
                collectMemoryCandidates: async () => []
            }
        });
        Object.defineProperty(this, 'workloadStore', {
            value: {
                materializeRun: async (_workspaceRootUri: string | undefined, _workflow: FlowWorkflow, run: FlowRun) => run
            }
        });
    }

    override getRun(): Promise<FlowRun> {
        return Promise.resolve(this.sourceRun);
    }

    override getWorkflow(): Promise<FlowWorkflow> {
        return Promise.resolve(this.savedWorkflows[0] || this.sourceWorkflow);
    }
}

class PresetFlowService extends FlowServiceImpl {
    constructor(store: FlowStore, agentMarkdownStore: AgentMarkdownStore) {
        super();
        Object.defineProperty(this, 'store', { value: store });
        Object.defineProperty(this, 'agentMarkdownStore', { value: agentMarkdownStore });
    }
}

class AiAuthoringDraftFlowService extends FlowServiceImpl {
    constructor(store: FlowStore, agentMarkdownStore: AgentMarkdownStore) {
        super();
        Object.defineProperty(this, 'store', { value: store });
        Object.defineProperty(this, 'agentMarkdownStore', { value: agentMarkdownStore });
    }

    setLanguageModelRegistry(registry: LanguageModelRegistry): void {
        Object.defineProperty(this, 'languageModelRegistry', { value: registry });
    }

    override async startRun(request: FlowStartRunRequest): Promise<FlowRun> {
        return {
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
        };
    }
}

describe('FlowServiceImpl capability gates', () => {

    let tempDir: string;
    let workspaceRootUri: string;

    beforeEach(async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'flow-service-'));
        workspaceRootUri = FileUri.create(tempDir).toString();
    });

    afterEach(async () => {
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('blocks command.execute workflows when the host does not declare command execution', async () => {
        const service = new TestFlowService({
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

        try {
            await service.startRun({
                workspaceRootUri: 'file:///workspace',
                workflowId: 'command_workflow',
                prompt: 'run commands'
            });
            throw new Error('startRun unexpectedly succeeded.');
        } catch (error) {
            expect(error).to.be.instanceOf(Error);
            expect((error as Error).message).to.equal(
                'Missing Flow host capability: command.execute '
                + '(states: command_step; host: CyberVinci (simulated kernel bridge); '
                + 'execution mode: kernel_simulated; demo=off; deterministicFallback=on; '
                + 'action: configure command execution policy with allowlisted commands/env/cwd, timeout, output redaction, and approvals).'
            );
        }
    });

    it('lists pipeline presets and materializes built-in preset agents when creating workflows', async () => {
        const store = new FlowStore();
        const agentMarkdownStore = new AgentMarkdownStore();
        const service = new PresetFlowService(store, agentMarkdownStore);

        const presets = await service.listPipelinePresets({ workspaceRootUri });
        const workflow = await service.createWorkflowFromPreset({
            workspaceRootUri,
            presetId: SISYPHUS_ULTRAWORK_COORDINATOR_PRESET_ID,
            workflowId: 'sisyphus_created'
        });
        const coordinatorAgent = await agentMarkdownStore.readAgent(workspaceRootUri, 'sisyphus/coordinator.md');
        const coordinatorState = workflow.states.sisyphus_coordinator;

        expect(presets.map(preset => preset.id)).to.include(SISYPHUS_ULTRAWORK_COORDINATOR_PRESET_ID);
        expect(workflow.id).to.equal('sisyphus_created');
        expect(coordinatorAgent?.content).to.contain('# Sisyphus Coordinator');
        expect(coordinatorState.provider).to.equal(undefined);
        expect(coordinatorState.systemPrompt).to.contain('Sisyphus coordinator');
        expect(coordinatorState.taskPrompt).to.contain('plan/plan.md');
        expect(coordinatorState.deliverables?.map(deliverable => deliverable.path)).to.deep.equal([
            'plan/plan.md',
            'plan/acceptance-criteria.md',
            'plan/work-order.md'
        ]);
    });

    it('materializes and runs AI-authored dynamic workflows without manual JSON editing', async () => {
        const store = new FlowStore();
        const agentMarkdownStore = new AgentMarkdownStore();
        const service = new AiAuthoringDraftFlowService(store, agentMarkdownStore);

        const run = await service.runDynamicWorkflow({
            workspaceRootUri,
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
        });
        const workflow = await store.getWorkflow(workspaceRootUri, run.workflowId);
        const agent = await agentMarkdownStore.readAgent(workspaceRootUri, 'ai/reviewer.md');

        expect(run.workflowId).to.equal('ai_generated_report');
        expect(run.prompt).to.equal('Create a focused reporting workflow.');
        expect(run.events.find(event => event.type === 'dynamic_workflow.selected')).to.deep.include({
            workflowId: 'ai_generated_report',
            type: 'dynamic_workflow.selected',
            message: 'AI authoring create_workflow generated workflow "ai_generated_report": No saved workflow or built-in pattern is specific enough.'
        });
        expect(run.events.find(event => event.type === 'dynamic_workflow.selected')?.payload).to.deep.include({
            kind: 'generated_workflow',
            authoringAction: 'create_workflow',
            workflowId: 'ai_generated_report',
            reason: 'No saved workflow or built-in pattern is specific enough.'
        });
        expect(workflow?.name).to.equal('AI Generated Report');
        expect(workflow?.file?.format).to.equal('json');
        expect(agent?.content).to.contain('Act as the verifier stage');
    });

    it('uses the selected language model to author dynamic workflow decisions when available', async () => {
        const store = new FlowStore();
        const agentMarkdownStore = new AgentMarkdownStore();
        const service = new AiAuthoringDraftFlowService(store, agentMarkdownStore);
        const workflow: FlowWorkflow = {
            version: 'flow.workflow/v1',
            id: 'architecture_review',
            name: 'Architecture Review',
            description: 'Review architecture plans and implementation risks.',
            states: {
                input: { type: 'input', outputs: ['input/request.md'] },
                final_report: { type: 'report', outputs: ['final/report.md'] }
            },
            transitions: [
                { id: 'input_to_final', from: 'input', to: 'final_report', on: 'run.started' }
            ]
        };
        await store.saveWorkflow(workspaceRootUri, workflow);
        service.setLanguageModelRegistry({
            selectLanguageModel: async () => ({
                id: 'authoring-model',
                name: 'Authoring Model',
                status: { status: 'ready' },
                request: async request => {
                    expect(request.response_format).to.deep.equal({ type: 'json_object' });
                    const systemMessage = request.messages[0];
                    const userMessage = request.messages[1];
                    expect(systemMessage.type).to.equal('text');
                    expect(userMessage.type).to.equal('text');
                    if (systemMessage.type !== 'text' || userMessage.type !== 'text') {
                        throw new Error('Expected text messages.');
                    }
                    expect(systemMessage.text).to.contain('cybervinci-flow-author');
                    expect(userMessage.text).to.contain('Architecture Review');
                    return {
                        text: JSON.stringify({
                            version: 'flow.ai-authoring/v1',
                            action: 'run_saved_workflow',
                            confidence: 0.91,
                            reason: 'The saved architecture review workflow matches the request.',
                            savedWorkflowId: 'architecture_review',
                            promptMarkdown: 'Review the proposed architecture.'
                        })
                    };
                }
            } as LanguageModel)
        } as unknown as LanguageModelRegistry);

        const run = await service.runDynamicWorkflow({
            workspaceRootUri,
            prompt: 'Review the proposed architecture.'
        });

        expect(run.workflowId).to.equal('architecture_review');
        expect(run.prompt).to.equal('Review the proposed architecture.');
        expect(run.events.find(event => event.type === 'dynamic_workflow.selected')?.payload).to.deep.include({
            kind: 'saved_workflow',
            authoringAction: 'run_saved_workflow',
            workflowId: 'architecture_review',
            confidence: 0.91
        });
    });

    it('surfaces AI-authored clarification questions instead of falling back to a different dynamic plan', async () => {
        const store = new FlowStore();
        const agentMarkdownStore = new AgentMarkdownStore();
        const service = new AiAuthoringDraftFlowService(store, agentMarkdownStore);
        service.setLanguageModelRegistry({
            selectLanguageModel: async () => ({
                id: 'authoring-model',
                name: 'Authoring Model',
                status: { status: 'ready' },
                request: async () => ({
                    text: JSON.stringify({
                        version: 'flow.ai-authoring/v1',
                        action: 'ask_user',
                        confidence: 0.86,
                        reason: 'The target environment is required before choosing a workflow.',
                        questionMarkdown: 'Which target environment should this workflow optimize for?'
                    })
                })
            } as LanguageModel)
        } as unknown as LanguageModelRegistry);
        let error: unknown;
        try {
            await service.runDynamicWorkflow({
                workspaceRootUri,
                prompt: 'Compare three implementation options and choose the winner.'
            });
        } catch (caught) {
            error = caught;
        }

        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.equal(
            'Dynamic workflow needs user input: Which target environment should this workflow optimize for?'
        );
        expect((await store.listWorkflows(workspaceRootUri)).map(workflow => workflow.id)).not.to.include('simple_tournament');
    });

    it('records the selected built-in pattern when dynamic workflow planning instantiates one', async () => {
        const store = new FlowStore();
        const agentMarkdownStore = new AgentMarkdownStore();
        const service = new AiAuthoringDraftFlowService(store, agentMarkdownStore);

        const run = await service.runDynamicWorkflow({
            workspaceRootUri,
            prompt: 'Compare three implementation options and choose the winner.'
        });
        const decision = run.events.find(event => event.type === 'dynamic_workflow.selected');

        expect(run.workflowId).to.equal('simple_tournament');
        expect(decision?.message).to.contain('selected pattern "simple_tournament"');
        expect(decision?.payload).to.deep.include({
            kind: 'pattern',
            patternId: 'simple_tournament',
            workflowId: 'simple_tournament'
        });
    });

    it('reflects the Memory provider reported by the adapter', async () => {
        const service = new RuntimeCapabilitiesFlowService();
        Object.defineProperty(service, 'memory', {
            value: {
                report: async () => ({
                    provider: 'external',
                    available: true
                })
            } satisfies Pick<MemoryAdapter, 'report'>
        });

        const capabilities = await service.readCapabilities();

        expect(capabilities.memoryAdapter).to.equal(true);
        expect(capabilities.memoryProvider).to.equal('external');
    });

    it('reports Memory as unavailable when the adapter is missing', async () => {
        const service = new RuntimeCapabilitiesFlowService();

        const capabilities = await service.readCapabilities();

        expect(capabilities.memoryAdapter).to.equal(false);
        expect(capabilities.memoryProvider).to.equal('missing');
    });

    it('promotes real runtime capabilities only when providers and policies are configured', async () => {
        const previousEnv = snapshotFlowCapabilityEnv();
        try {
            process.env.FLOW_AGENT_LLM_COMMAND = 'node ./agent-provider.js';
            process.env.FLOW_IMAGE_PROVIDER_COMMAND = 'node ./image-provider.js';
            process.env.FLOW_COMMAND_ALLOWLIST = 'npm,node';

            const service = new RuntimeCapabilitiesFlowService();
            Object.defineProperty(service, 'fileEffectHostAdapter', {
                value: {
                    prepare: async () => undefined,
                    apply: async () => undefined
                }
            });

            const capabilities = await service.readCapabilities();

            expect(capabilities.llmAgentExecution).to.equal('available');
            expect(capabilities.llmAgentProvider).to.equal('configured');
            expect(capabilities.filesystemEdit).to.equal('available');
            expect(capabilities.filesystemEditPolicy).to.equal('configured');
            expect(capabilities.imageGeneration).to.equal('available');
            expect(capabilities.imageProvider).to.equal('configured');
            expect(capabilities.commandExecution).to.equal(true);
            expect(capabilities.commandExecutionPolicy).to.equal('configured');
        } finally {
            restoreFlowCapabilityEnv(previousEnv);
        }
    });

    it('does not advertise Codex as configured when FLOW_AGENT_PROVIDER is unset or auto', async () => {
        const previousEnv = snapshotFlowCapabilityEnv();
        try {
            delete process.env.FLOW_AGENT_PROVIDER;
            delete process.env.FLOW_AGENT_LLM_COMMAND;
            delete process.env.FLOW_AGENT_COMMAND;

            const service = new RuntimeCapabilitiesFlowService();
            Object.defineProperty(service, 'codexProviderService', {
                value: {
                    getStatus: async () => ({
                        available: true,
                        authenticated: true,
                        executablePath: 'codex',
                        capabilities: { imageGeneration: true }
                    })
                }
            });

            const capabilities = await service.readCapabilities();

            expect(capabilities.llmAgentExecution).to.equal('unavailable');
            expect(capabilities.llmAgentProvider).to.equal('missing');
            expect(capabilities.imageGeneration).to.equal('unavailable');
            expect(capabilities.imageProvider).to.equal('missing');

            process.env.FLOW_AGENT_PROVIDER = 'auto';

            const autoCapabilities = await service.readCapabilities();

            expect(autoCapabilities.llmAgentExecution).to.equal('unavailable');
            expect(autoCapabilities.llmAgentProvider).to.equal('missing');
            expect(autoCapabilities.imageGeneration).to.equal('unavailable');
            expect(autoCapabilities.imageProvider).to.equal('missing');
        } finally {
            restoreFlowCapabilityEnv(previousEnv);
        }
    });

    it('reports Codex capabilities only when FLOW_AGENT_PROVIDER=codex-provider is set explicitly', async () => {
        const previousEnv = snapshotFlowCapabilityEnv();
        try {
            process.env.FLOW_AGENT_PROVIDER = 'codex-provider';

            const service = new RuntimeCapabilitiesFlowService();
            Object.defineProperty(service, 'codexProviderService', {
                value: {
                    getStatus: async () => ({
                        available: true,
                        authenticated: true,
                        executablePath: 'codex',
                        capabilities: { imageGeneration: true }
                    })
                }
            });

            const capabilities = await service.readCapabilities();

            expect(capabilities.llmAgentExecution).to.equal('available');
            expect(capabilities.llmAgentProvider).to.equal('configured');
            expect(capabilities.imageGeneration).to.equal('available');
            expect(capabilities.imageProvider).to.equal('configured');
            expect(capabilities.demoMode).to.equal('off');
        } finally {
            restoreFlowCapabilityEnv(previousEnv);
        }
    });

    it('keeps e2e mock LLM separate from real agent execution', async () => {
        const previousEnv = snapshotFlowCapabilityEnv();
        try {
            process.env.FLOW_AGENT_PROVIDER = 'e2e-mock';
            delete process.env.FLOW_AGENT_LLM_COMMAND;
            delete process.env.FLOW_AGENT_COMMAND;

            const service = new RuntimeCapabilitiesFlowService();
            const capabilities = await service.readCapabilities();

            expect(capabilities.llmAgentExecution).to.equal('mock');
            expect(capabilities.llmAgentProvider).to.equal('mock');
            expect(capabilities.demoMode).to.equal('e2e');
        } finally {
            restoreFlowCapabilityEnv(previousEnv);
        }
    });

    it('does not advertise command execution without an explicit command allowlist', async () => {
        const previousEnv = snapshotFlowCapabilityEnv();
        try {
            process.env.FLOW_COMMAND_POLICY = 'configured';
            delete process.env.FLOW_COMMAND_ALLOWLIST;
            delete process.env.FLOW_ALLOWED_COMMANDS;

            const service = new RuntimeCapabilitiesFlowService();
            const capabilities = await service.readCapabilities();

            expect(capabilities.commandExecution).to.equal(false);
            expect(capabilities.commandExecutionPolicy).to.equal('blocked');
        } finally {
            restoreFlowCapabilityEnv(previousEnv);
        }
    });

    it('audits approved and written memory writes as separate events', async () => {
        const run = memoryRunFixture();
        const service = new MemoryAuditFlowService(run, {
            writeApprovedMemory: async memoryWrite => ({ ...memoryWrite, status: 'written' })
        });

        const updated = await service.approveMemoryCandidate({
            workspaceRootUri: 'file:///workspace',
            runId: run.id,
            candidateId: 'candidate-1',
            decision: 'approved',
            approvedBy: 'tester',
            scope: 'workspace'
        });

        expect(updated.memoryWrites?.[0].status).to.equal('written');
        expect(updated.memoryCandidates?.[0].status).to.equal('written');
        expect(updated.events.map(event => event.type)).to.include.members(['memory_write.approved', 'memory_write.written']);
        expect(updated.events.find(event => event.type === 'memory_write.approved')?.payload?.memoryWriteId).to.equal('memory-write-run-1-candidate-1');
    });

    it('audits failed memory writes after approval', async () => {
        const run = memoryRunFixture();
        const service = new MemoryAuditFlowService(run, {
            writeApprovedMemory: async memoryWrite => ({ ...memoryWrite, status: 'failed', error: 'provider unavailable' })
        });

        const updated = await service.approveMemoryCandidate({
            workspaceRootUri: 'file:///workspace',
            runId: run.id,
            candidateId: 'candidate-1',
            decision: 'approved'
        });

        expect(updated.memoryWrites?.[0].status).to.equal('failed');
        expect(updated.memoryCandidates?.[0].status).to.equal('approved');
        expect(updated.events.map(event => event.type)).to.include.members(['memory_write.approved', 'memory_write.failed']);
        expect(updated.events.find(event => event.type === 'memory_write.failed')?.payload?.error).to.equal('provider unavailable');
    });

    it('rejects a pending effect through the service API with an audit event', async () => {
        const run = effectRunFixture();
        const service = new EffectDecisionFlowService(run);

        const updated = await service.decideEffect({
            workspaceRootUri: 'file:///workspace',
            runId: run.id,
            effectId: 'effect-1',
            decision: 'rejected',
            note: 'needs smaller patch',
            approvedBy: 'tester'
        });

        expect(updated.effects[0].status).to.equal('rejected');
        expect(updated.events.map(event => event.type)).to.include('effect.rejected');
        expect(updated.events[0].payload?.note).to.equal('needs smaller patch');
    });

    it('applies an approved pending file effect through the secure adapter', async () => {
        const run = effectRunFixture();
        const service = new EffectDecisionFlowService(run);

        const updated = await service.decideEffect({
            workspaceRootUri: 'file:///workspace',
            runId: run.id,
            effectId: 'effect-1',
            decision: 'applied',
            approvedBy: 'tester'
        });

        expect(updated.effects[0].status).to.equal('applied');
        expect(updated.effects[0].hashAfter).to.equal('sha256:new');
        expect(updated.effects[0].patch).to.contain('+new');
        expect(updated.events.map(event => event.type)).to.include('effect.applied');
        expect(updated.artifacts[0].kind).to.equal('patch');
    });

    it('approves a suggested second run with copied context and source issues', async () => {
        const run = secondRunFixture();
        const service = new SecondRunFlowService(run, workflowFixture());

        const newRun = await service.approveSecondRunSuggestion({
            workspaceRootUri: 'file:///workspace',
            runId: run.id,
            suggestionId: 'second-run-1',
            approvedBy: 'tester'
        });

        expect(newRun.id).to.equal('run-2');
        expect(newRun.workflowId).to.not.equal(run.workflowId);
        expect(newRun.prompt).to.contain('Source run: run-1');
        expect(newRun.prompt).to.contain('Follow-up: run scoped implementation separately');
        expect(newRun.contextPack?.sections?.[0].id).to.equal('second_run_source');
        expect(newRun.events.map(event => event.type)).to.include('second_run.approved');
        expect(run.secondRunSuggestion?.status).to.equal('accepted');
        expect(run.secondRunSuggestion?.approvedRunId).to.equal('run-2');
    });

    it('dismisses a suggested second run without creating a new run', async () => {
        const run = secondRunFixture();
        const service = new SecondRunFlowService(run, workflowFixture());

        const updated = await service.decideSecondRunSuggestion({
            workspaceRootUri: 'file:///workspace',
            runId: run.id,
            suggestionId: 'second-run-1',
            decision: 'dismissed',
            approvedBy: 'tester',
            note: 'defer for now'
        });

        expect(updated.id).to.equal('run-1');
        expect(updated.secondRunSuggestion?.status).to.equal('dismissed');
        expect(updated.events.map(event => event.type)).to.include('second_run.dismissed');
        expect(updated.events[0].payload?.status).to.equal('dismissed');
        expect(service.savedRuns.some(saved => saved.id === 'run-2')).to.equal(false);
    });
});

function workflowFixture(): FlowWorkflow {
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

const capabilityEnvKeys = [
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

function snapshotFlowCapabilityEnv(): Record<string, string | undefined> {
    return Object.fromEntries(capabilityEnvKeys.map(key => [key, process.env[key]]));
}

function restoreFlowCapabilityEnv(snapshot: Record<string, string | undefined>): void {
    for (const key of capabilityEnvKeys) {
        const value = snapshot[key];
        if (value === undefined) {
            delete process.env[key];
        } else {
            process.env[key] = value;
        }
    }
}

function secondRunFixture(): FlowRun {
    return {
        ...memoryRunFixture(),
        secondRunSuggestion: {
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
        }
    };
}

function memoryRunFixture(): FlowRun {
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

function effectRunFixture(): FlowRun {
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

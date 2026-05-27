import { expect } from 'chai';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { FileUri } from '@theia/core/lib/common/file-uri';
import {
    FlowRun,
    FlowWorkflow,
    FlowWorkflowState,
    MemoryWrite,
    MemoryCandidate
} from '../common';
import { AgentMarkdownStore } from './agent-markdown-store';
import { FlowWorkloadExecutionContext, ProviderBackedFlowWorkloadExecutor } from './flow-workload-executor';
import { MemoryAdapter } from './memory-adapter';

class MockLlmProviderExecutor extends ProviderBackedFlowWorkloadExecutor {
    private readonly responses: Array<string | Error>;

    public calls = 0;
    public providerPayloads: Record<string, unknown>[] = [];

    constructor(agentMarkdown: string, responses: Array<string | Error>) {
        super({
            readAgent: async () => ({
                path: 'agents/reviewer.md',
                uri: 'agents/reviewer.md',
                relativePath: 'agents/reviewer.md',
                content: agentMarkdown,
                updatedAt: '2026-05-19T00:00:00.000Z'
            })
        } as unknown as AgentMarkdownStore);
        this.responses = [...responses];
    }

    protected override resolveLlmProvider(): Promise<any> {
        return Promise.resolve({
            command: 'mock-llm-provider'
        });
    }

    protected override async invokeLlmProvider(
        _context: unknown,
        _providerPayload: Record<string, unknown>,
        _provider: unknown,
        _workloadDir: string
    ): Promise<string> {
        this.calls += 1;
        this.providerPayloads.push(_providerPayload);
        const next = this.responses.shift();
        if (!next) {
            throw new Error('No mocked LLM response configured for this attempt.');
        }
        if (next instanceof Error) {
            throw next;
        }
        return next;
    }
}

class MemoryWriteExecutor extends ProviderBackedFlowWorkloadExecutor {
    constructor(memoryAdapter?: MemoryAdapter) {
        super(undefined as unknown as AgentMarkdownStore, undefined, undefined, undefined, undefined, undefined, undefined, memoryAdapter);
    }
}

function createExecutionContext(
    workspaceRootUri: string,
    statePatch: Partial<FlowWorkflowState> = {}
): FlowWorkloadExecutionContext {
    const state: FlowWorkflowState = {
        id: 'agent',
        type: 'agent',
        agent: 'reviewer',
        outputs: ['report.md'],
        ...statePatch
    };
    const workflow: FlowWorkflow = {
        version: 'flow.workflow/v1',
        id: 'workload_executor_test',
        name: 'Workload executor test',
        agents: {
            reviewer: 'agents/reviewer.md'
        },
        states: {
            [state.id || 'agent']: state
        },
        transitions: []
    };
    const run: FlowRun = {
        id: 'run-1',
        workflowId: workflow.id,
        prompt: 'run this task',
        status: 'running',
        createdAt: '2026-05-19T00:00:00.000Z',
        updatedAt: '2026-05-19T00:00:00.000Z',
        currentStateIds: [state.id || 'agent'],
        stateStatuses: { [state.id || 'agent']: 'running' },
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
    const workload = {
        id: 'workload-1',
        runId: run.id,
        stateId: state.id || 'agent',
        agent: 'reviewer',
        status: 'running' as const,
        inputArtifacts: [],
        outputArtifacts: [],
        issues: [],
        effectIds: [],
        createdAt: '2026-05-19T00:00:00.000Z',
        updatedAt: '2026-05-19T00:00:00.000Z'
    };
    run.workloads.push(workload);

    return {
        workflow,
        run,
        state,
        workload,
        workspaceRootUri
    };
}

function toJsonFailureMessage(raw = 'invalid json') {
    return raw;
}

function validMockProviderResult(patch: Record<string, unknown> = {}): string {
    return JSON.stringify({
        result: {
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
        },
        report: 'Execution finished.',
        effects: [
            {
                type: 'file_write',
                path: 'notes.md',
                summary: 'Updated generated notes.'
            }
        ],
        memoryCandidates: [
            'Persist this architecture decision in long-term memory.'
        ],
        ...patch
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

async function addRunArtifact(context: FlowWorkloadExecutionContext, workspaceRootDir: string, artifactPath: string, content: string, stateId = 'delivery'): Promise<void> {
    const filePath = path.join(workspaceRootDir, 'seed-artifacts', ...artifactPath.split('/'));
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf8');
    context.run.artifacts.push({
        id: `artifact-${artifactPath.replace(/[^a-zA-Z0-9]/g, '-')}`,
        runId: context.run.id,
        stateId,
        uri: FileUri.create(filePath).toString(),
        kind: artifactPath.includes('contract') ? 'contract' : 'report',
        summary: artifactPath,
        createdAt: '2026-05-19T00:00:00.000Z'
    });
}

describe('ProviderBackedFlowWorkloadExecutor with mocked LLM provider', () => {
    let workspaceRootDir: string;
    let workspaceRootUri: string;

    const agentMarkdown = [
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

    beforeEach(async () => {
        workspaceRootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'flow-workload-executor-'));
        workspaceRootUri = FileUri.create(workspaceRootDir).toString();
    });

    afterEach(async () => {
        await fs.rm(workspaceRootDir, { recursive: true, force: true });
    });

    it('executa agente com sucesso e registra issues, signals e memory candidates', async () => {
        const context = createExecutionContext(workspaceRootUri);
        const executor = new MockLlmProviderExecutor(agentMarkdown, [validMockProviderResult()]);

        const result = await executor.executeAgentWorkload(context);

        expect(result.artifactUri).to.contain('report.md');
        expect(context.run.workloads[0].status).to.equal('done');
        expect(context.run.workloads[0].outputEnvelope).to.not.be.undefined;
        expect(context.run.workloads[0].outputEnvelope?.result?.status).to.equal('completed');
        expect(context.run.workloads[0].issues).to.deep.equal(['Minor issue found during execution.']);
        expect(context.run.signals.some(signal => signal.key === 'agent.issue' && signal.value === 'Minor issue found during execution.')).to.equal(true);
        expect(context.run.signals.some(signal => signal.key === 'agent.signal' && signal.value === true)).to.equal(true);
        expect(context.run.signals.some(signal => signal.key === 'agent.status' && signal.value === 'completed')).to.equal(true);
        expect(context.run.effects.some(effect => effect.kind === 'file_write' && effect.summary === 'Updated generated notes.')).to.equal(true);
        expect(context.run.workloads[0].outputEnvelope?.effects[0]).to.deep.include({
            type: 'file_write',
            path: 'notes.md',
            status: 'proposed'
        });
        expect(context.run.memoryCandidates?.map((candidate: MemoryCandidate) => candidate.content))
            .to.deep.equal(['Persist this architecture decision in long-term memory.']);
        expect(context.run.memoryCandidates?.every((candidate: MemoryCandidate) => candidate.status === 'candidate')).to.equal(true);
        const artifact = context.run.artifacts.find(item => item.summary?.includes('report.md'));
        expect(artifact?.kind).to.equal('report');
        expect(context.run.workloads[0].outputArtifacts).to.include(artifact?.uri);
        expect(context.run.events.some(event => event.type === 'artifact.created' && event.workloadId === context.run.workloads[0].id)).to.equal(true);
        expect(await fs.readFile(path.join(workspaceRootDir, '.theia', 'flow', 'runs', context.run.id, 'workloads', context.run.workloads[0].id, 'output', 'artifacts', 'report.md'), 'utf8'))
            .to.equal('# Report\n\nEverything is green.\n');
        expect(context.run.events.some(event => event.type === 'workload.completed')).to.equal(true);
        expect(context.run.events.some(event => event.type === 'effect.proposed')).to.equal(true);
        expect(context.run.events.filter(event => event.type === 'workload.retry')).to.have.length(0);
        const resultJsonPath = path.join(workspaceRootDir, '.theia', 'flow', 'runs', context.run.id, 'workloads', context.run.workloads[0].id, 'output', 'result.json');
        const resultJson = JSON.parse(await fs.readFile(resultJsonPath, 'utf8'));
        expect(resultJson.result.status).to.equal('completed');
        expect(resultJson.artifacts[0]).to.deep.include({ path: 'report.md', type: 'report' });
        expect(context.run.workloads[0].outputArtifacts.some(uri => uri.endsWith('/output/result.json'))).to.equal(true);
    });

    it('rebaixa memory candidates importados como written para candidate review', async () => {
        const context = createExecutionContext(workspaceRootUri);
        const providerResult = validMockProviderResult({
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
        const executor = new MockLlmProviderExecutor(agentMarkdown, [providerResult]);

        await executor.executeAgentWorkload(context);

        expect(context.run.memoryCandidates).to.have.length(1);
        expect(context.run.memoryCandidates?.[0]).to.deep.include({
            id: 'imported-written-candidate',
            runId: context.run.id,
            stateId: 'external-state',
            source: 'artifact',
            status: 'candidate'
        });
        expect(context.run.memoryWrites).to.equal(undefined);
    });

    it('isola diretorio de workload mesmo com run id malicioso', async () => {
        const context = createExecutionContext(workspaceRootUri);
        context.run.id = '../other-run';
        context.workload.runId = context.run.id;
        const executor = new MockLlmProviderExecutor(agentMarkdown, [validMockProviderResult()]);

        await executor.executeAgentWorkload(context);

        const isolatedReport = path.join(workspaceRootDir, '.theia', 'flow', 'runs', '.._other-run', 'workloads', context.workload.id, 'output', 'artifacts', 'report.md');
        expect(await fs.readFile(isolatedReport, 'utf8')).to.equal('# Report\n\nEverything is green.\n');
        await expectRejected(fs.access(path.join(workspaceRootDir, '.theia', 'flow', 'other-run', 'workloads', context.workload.id, 'output', 'artifacts', 'report.md')));
    });

    it('gera pacote contratual validado para contract_designer com work orders e schemas', async () => {
        const context = createExecutionContext(workspaceRootUri, {
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
        const contracts = {
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
        const executor = new MockLlmProviderExecutor(agentMarkdown, [JSON.stringify({
            result: {
                status: 'completed',
                summary: 'Contract package generated.',
                artifacts: [{ path: 'contracts/contracts.json', content: JSON.stringify(contracts) }],
                signals: {},
                issues: []
            }
        })]);

        await executor.executeAgentWorkload(context);

        const outputRoot = path.join(workspaceRootDir, '.theia', 'flow', 'runs', context.run.id, 'workloads', context.workload.id, 'output', 'artifacts');
        expect(JSON.parse(await fs.readFile(path.join(outputRoot, 'contracts', 'contracts.json'), 'utf8')).schemaVersion).to.equal('flow.contracts/v1');
        expect(await fs.readFile(path.join(outputRoot, 'contracts', 'shared.md'), 'utf8')).to.contain('Shared Contract');
        const backendWorkOrder = await fs.readFile(path.join(outputRoot, 'contracts', 'work-orders', 'backend.md'), 'utf8');
        const frontendWorkOrder = await fs.readFile(path.join(outputRoot, 'contracts', 'work-orders', 'frontend.md'), 'utf8');
        const designerWorkOrder = await fs.readFile(path.join(outputRoot, 'contracts', 'work-orders', 'designer.md'), 'utf8');
        const qaWorkOrder = await fs.readFile(path.join(outputRoot, 'contracts', 'work-orders', 'qa.md'), 'utf8');
        expect(backendWorkOrder).to.contain('Role: backend');
        expect(backendWorkOrder).to.contain('API feature_read: GET /feature');
        expect(frontendWorkOrder).to.contain('Asset feature_icon: public/assets/feature-icon.png');
        expect(designerWorkOrder).to.contain('Preserve required dimensions, formats, usage, and naming.');
        expect(qaWorkOrder).to.contain('Validate backend, frontend, and design outputs against contracts/contracts.json.');
        expect(qaWorkOrder).to.contain('Schema api: schemas/api.json v1.0.0');
        expect(JSON.parse(await fs.readFile(path.join(outputRoot, 'schemas', 'api.json'), 'utf8')).title).to.equal('Flow API Contract');
        expect(context.run.signals.some(signal => signal.key === 'contract.status' && signal.value === 'ready')).to.equal(true);
        expect(context.run.artifacts.filter(artifact => artifact.kind === 'contract')).to.have.length.greaterThan(0);
        expect(context.run.artifacts.filter(artifact => artifact.kind === 'work_order')).to.have.length.greaterThan(0);
    });

    it('falha contract package gerado pelo agente quando nao valida contra contracts.schema.json', async () => {
        const context = createExecutionContext(workspaceRootUri, {
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
        const contracts = {
            ...validContractPackage(),
            schemaVersion: 'flow.contracts/v0'
        };
        const executor = new MockLlmProviderExecutor(agentMarkdown, [JSON.stringify({
            result: {
                status: 'completed',
                summary: 'Contract package generated.',
                artifacts: [{ path: 'contracts/contracts.json', content: JSON.stringify(contracts) }],
                signals: {},
                issues: []
            }
        })]);

        await executor.executeAgentWorkload(context);

        expect(context.run.workloads[0].status).to.equal('failed');
        expect(context.run.events.some(event =>
            event.type === 'workload.failed'
            && String(event.payload?.error || '').includes('failed flow contract schema validation')
        )).to.equal(true);
        expect(context.run.signals.some(signal => signal.key === 'contract.status' && signal.value === 'ready')).to.equal(false);
    });

    it('materializa work orders e schemas para contract_designer mesmo quando outputs legados listam apenas contracts.json', async () => {
        const context = createExecutionContext(workspaceRootUri, {
            id: 'contract_design',
            agent: 'contract_designer',
            outputs: ['contracts/shared.md', 'contracts/contracts.json']
        });
        context.workload.stateId = 'contract_design';
        context.workload.agent = 'contract_designer';
        context.run.stateStatuses = { contract_design: 'running' };
        context.workflow.agents = { contract_designer: 'agents/contract-designer.md' };
        context.workflow.states = { contract_design: context.state };
        const executor = new MockLlmProviderExecutor(agentMarkdown, [JSON.stringify({
            result: {
                status: 'completed',
                summary: 'Contract package generated.',
                artifacts: [{ path: 'contracts/contracts.json', content: JSON.stringify(validContractPackage()) }],
                signals: {},
                issues: []
            }
        })]);

        await executor.executeAgentWorkload(context);

        const outputRoot = path.join(workspaceRootDir, '.theia', 'flow', 'runs', context.run.id, 'workloads', context.workload.id, 'output', 'artifacts');
        await fs.access(path.join(outputRoot, 'contracts', 'work-orders', 'backend.md'));
        await fs.access(path.join(outputRoot, 'contracts', 'work-orders', 'frontend.md'));
        await fs.access(path.join(outputRoot, 'contracts', 'work-orders', 'designer.md'));
        await fs.access(path.join(outputRoot, 'contracts', 'work-orders', 'qa.md'));
        expect(JSON.parse(await fs.readFile(path.join(outputRoot, 'schemas', 'api.json'), 'utf8')).title).to.equal('Flow API Contract');
        expect(JSON.parse(await fs.readFile(path.join(outputRoot, 'schemas', 'assets.json'), 'utf8')).title).to.equal('Flow Asset Contract');
    });

    it('falha contract package aprovado quando falta work order requerida pelo workflow', async () => {
        const context = createExecutionContext(workspaceRootUri, {
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
        const contracts = {
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
        const executor = new MockLlmProviderExecutor(agentMarkdown, [JSON.stringify({
            result: {
                status: 'completed',
                summary: 'Contract package generated.',
                artifacts: [{ path: 'contracts/contracts.json', content: JSON.stringify(contracts) }],
                signals: {},
                issues: []
            }
        })]);

        await executor.executeAgentWorkload(context);

        expect(context.run.workloads[0].status).to.equal('failed');
        expect(context.run.events.some(event =>
            event.type === 'workload.failed'
            && String(event.payload?.error || '').includes('missing workOrders for: qa')
        )).to.equal(true);
    });

    it('imports LLM memory candidates as candidates even when the payload marks them written', async () => {
        const context = createExecutionContext(workspaceRootUri);
        const executor = new MockLlmProviderExecutor(agentMarkdown, [JSON.stringify({
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

        await executor.executeAgentWorkload(context);

        expect(context.run.memoryCandidates).to.have.length(1);
        expect(context.run.memoryCandidates?.[0]).to.include({
            source: 'artifact',
            kind: 'decision',
            status: 'candidate'
        });
        expect(context.run.memoryWrites).to.equal(undefined);
    });

    it('executes real memory_write workloads for approved candidates through MemoryAdapter', async () => {
        const context = createExecutionContext(workspaceRootUri, {
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
        const writes: MemoryWrite[] = [];
        const executor = new MemoryWriteExecutor({
            report: async () => ({ available: true, provider: 'local' }),
            buildContextPack: async () => context.run.contextPack!,
            collectMemoryCandidates: async () => [],
            writeApprovedMemory: async memoryWrite => {
                writes.push(memoryWrite);
                return { ...memoryWrite, status: 'written' };
            }
        });

        await executor.executeMemoryWriteWorkload(context);

        expect(writes).to.have.length(1);
        expect(writes[0]).to.include({
            candidateId: 'candidate-workflow',
            scope: 'workflow',
            target: context.workflow.id,
            status: 'approved'
        });
        expect(context.run.memoryCandidates?.find(candidate => candidate.id === 'candidate-workflow')?.status).to.equal('written');
        expect(context.run.memoryWrites?.[0]).to.include({ status: 'written', scope: 'workflow', target: context.workflow.id });
        expect(context.run.events.map(event => event.type)).to.include.members(['memory_write.approved', 'memory_write.written']);
        expect(context.run.workloads[0].status).to.equal('done');
    });

    it('respects ide workspace project workflow run and agent scopes in memory_write workloads', async () => {
        const scopes = ['ide', 'workspace', 'project', 'workflow', 'run', 'agent'] as const;
        const writes: MemoryWrite[] = [];
        for (const scope of scopes) {
            const context = createExecutionContext(workspaceRootUri, {
                id: `memory_${scope}`,
                type: 'memory_write',
                scope,
                agent: scope === 'agent' ? 'reviewer' : undefined
            });
            context.run.memoryCandidates = [{
                id: `candidate-${scope}`,
                runId: context.run.id,
                stateId: 'memory_review',
                source: 'artifact',
                kind: 'decision',
                content: `Approved ${scope} memory.`,
                reason: 'Scope coverage.',
                confidence: 0.8,
                status: 'approved',
                createdAt: '2026-05-19T00:00:00.000Z'
            }];
            const executor = new MemoryWriteExecutor({
                report: async () => ({ available: true, provider: 'local' }),
                buildContextPack: async () => context.run.contextPack!,
                collectMemoryCandidates: async () => [],
                writeApprovedMemory: async memoryWrite => {
                    writes.push(memoryWrite);
                    return { ...memoryWrite, status: 'written' };
                }
            });

            await executor.executeMemoryWriteWorkload(context);
        }

        expect(writes.map(write => write.scope)).to.deep.equal([...scopes]);
        expect(writes.find(write => write.scope === 'workflow')?.target).to.equal('workload_executor_test');
        expect(writes.find(write => write.scope === 'run')?.target).to.equal('run-1');
        expect(writes.find(write => write.scope === 'agent')?.target).to.equal('reviewer');
    });

    it('fails approved memory_write workloads when Memory is absent', async () => {
        const context = createExecutionContext(workspaceRootUri, {
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
        const executor = new MemoryWriteExecutor();

        await executor.executeMemoryWriteWorkload(context);

        expect(context.run.memoryWrites?.[0]).to.include({ status: 'failed', scope: 'project' });
        expect(context.run.memoryWrites?.[0].error).to.contain('Memory adapter is not available');
        expect(context.run.events.some(event => event.type === 'memory_write.failed')).to.equal(true);
        expect(context.run.workloads[0].status).to.equal('failed');
    });

    it('registra evento e artifact auditavel para file effect gerado pelo agente', async () => {
        const context = createExecutionContext(workspaceRootUri);
        const executor = new MockLlmProviderExecutor(agentMarkdown, [JSON.stringify({
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

        await executor.executeAgentWorkload(context);

        const effect = context.run.effects.find(item => item.type === 'file.edited');
        expect(effect?.status).to.equal('applied');
        expect(effect?.hashBefore).to.match(/^sha256:/);
        expect(effect?.hashAfter).to.match(/^sha256:/);
        expect(context.run.events.some(event => event.type === 'effect.proposed' && event.payload?.effectId === effect?.id)).to.equal(true);
        expect(context.run.events.some(event => event.type === 'effect.approved' && event.payload?.effectId === effect?.id)).to.equal(true);
        expect(context.run.events.some(event => event.type === 'effect.applied' && event.payload?.effectId === effect?.id)).to.equal(true);
        expect(context.run.artifacts.some(artifact => artifact.kind === 'patch' && artifact.uri.endsWith('-proposed.diff'))).to.equal(true);
        expect(context.run.artifacts.some(artifact => artifact.kind === 'patch' && artifact.uri.endsWith('-approved.diff'))).to.equal(true);
        expect(context.run.artifacts.some(artifact => artifact.kind === 'patch' && artifact.summary?.includes('File effect applied: src/app.ts') && artifact.uri.endsWith('-applied.diff'))).to.equal(true);
        expect(context.run.events.find(event => event.type === 'effect.applied' && event.payload?.effectId === effect?.id)?.payload?.patch).to.contain('+++ b/src/app.ts');
        expect(await fs.readFile(path.join(workspaceRootDir, 'src', 'app.ts'), 'utf8')).to.equal('export const value = 2;\n');
    });

    it('registra file effect bloqueado com estado separado, evento e diff artifact', async () => {
        const context = createExecutionContext(workspaceRootUri);
        const executor = new MockLlmProviderExecutor(agentMarkdown, [JSON.stringify({
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

        await executor.executeAgentWorkload(context);

        const effect = context.run.effects.find(item => item.type === 'file.created');
        expect(effect?.status).to.equal('blocked');
        expect(context.run.events.some(event => event.type === 'effect.proposed' && event.payload?.effectId === effect?.id)).to.equal(true);
        expect(context.run.events.some(event => event.type === 'effect.blocked' && event.payload?.effectId === effect?.id)).to.equal(true);
        expect(context.run.artifacts.some(artifact => artifact.kind === 'patch' && artifact.uri.endsWith('-blocked.diff'))).to.equal(true);
        expect(context.run.workloads[0].status).to.equal('failed');
    });

    it('gera image effect via provider configurado e salva artifact auditavel', async () => {
        const previousProvider = process.env.FLOW_IMAGE_PROVIDER_COMMAND;
        process.env.FLOW_IMAGE_PROVIDER_COMMAND = `"${process.execPath}" -e "process.stdin.resume();process.stdin.on('end',()=>console.log(JSON.stringify({base64:Buffer.from('png').toString('base64')})))"`;
        try {
            const context = createExecutionContext(workspaceRootUri);
            const executor = new MockLlmProviderExecutor(agentMarkdown, [JSON.stringify({
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

            await executor.executeAgentWorkload(context);

            const effect = context.run.effects.find(item => item.type === 'image.generate');
            expect(effect?.kind).to.equal('image');
            expect(effect?.status).to.equal('applied');
            expect(effect?.path).to.contain('mockup.png');
            expect(context.run.events.some(event => event.type === 'effect.applied' && event.payload?.effectId === effect?.id)).to.equal(true);
            expect(context.run.artifacts.some(artifact => artifact.summary?.includes('Image effect applied: images/mockup.png'))).to.equal(true);
            await fs.access(path.join(workspaceRootDir, '.theia', 'flow', 'runs', context.run.id, 'artifacts', 'images', 'mockup.png'));
        } finally {
            if (previousProvider === undefined) {
                delete process.env.FLOW_IMAGE_PROVIDER_COMMAND;
            } else {
                process.env.FLOW_IMAGE_PROVIDER_COMMAND = previousProvider;
            }
        }
    });

    it('bloqueia image effect sem provider e marca workload como failed', async () => {
        const previousProvider = process.env.FLOW_IMAGE_PROVIDER_COMMAND;
        delete process.env.FLOW_IMAGE_PROVIDER_COMMAND;
        try {
            const context = createExecutionContext(workspaceRootUri);
            const executor = new MockLlmProviderExecutor(agentMarkdown, [JSON.stringify({
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

            await executor.executeAgentWorkload(context);

            const effect = context.run.effects.find(item => item.type === 'image.generate');
            expect(effect?.kind).to.equal('image');
            expect(effect?.status).to.equal('blocked');
            expect(effect?.stderr).to.contain('Image provider is not configured');
            expect(context.run.workloads[0].status).to.equal('failed');
            expect(context.run.stateStatuses.agent).to.equal('failed');
            expect(context.run.workloads[0].issues.some(issue => issue.includes('Image effect "Generated product mockup." was blocked'))).to.equal(true);
            expect(context.run.events.some(event => event.type === 'effect.failed' && event.payload?.effectId === effect?.id)).to.equal(true);
            expect(context.run.events.some(event => event.type === 'workload.failed')).to.equal(true);
            expect(context.run.events.some(event => event.type === 'workload.completed')).to.equal(false);
            expect(context.run.artifacts.some(artifact => artifact.summary?.includes('Image effect blocked: Generated product mockup.'))).to.equal(true);
        } finally {
            if (previousProvider === undefined) {
                delete process.env.FLOW_IMAGE_PROVIDER_COMMAND;
            } else {
                process.env.FLOW_IMAGE_PROVIDER_COMMAND = previousProvider;
            }
        }
    });

    it('QA real valida contratos contra artifacts, rotas, assets, nomes e file effects', async () => {
        const context = createExecutionContext(workspaceRootUri, {
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
        await addRunArtifact(context, workspaceRootDir, 'contracts/contracts.json', JSON.stringify(validContractPackage()), 'contract_design');
        await addRunArtifact(
            context,
            workspaceRootDir,
            'delivery/join-summary.md',
            [
                '# Delivery',
                'Backend exposes GET /feature for FeatureRequest.',
                'Frontend consumes GET /feature with FeatureRequest fields.',
                'Designer delivered public/assets/feature-icon.png.'
            ].join('\n')
        );
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
        const executor = new MockLlmProviderExecutor(agentMarkdown, [JSON.stringify({
            result: {
                status: 'completed',
                summary: 'QA agent reviewed delivery.',
                artifacts: [{ path: 'qa/report.md', content: '# QA\n\nAgent report.' }],
                signals: {},
                issues: []
            }
        })]);

        await executor.executeAgentWorkload(context);

        expect(context.run.workloads[0].status).to.equal('done');
        expect(context.run.signals.some(signal => signal.key === 'qa.status' && signal.value === 'passed')).to.equal(true);
        expect(context.run.signals.some(signal => signal.key === 'qa.blocking_issue_count' && signal.value === 0)).to.equal(true);
        expect(context.run.workloads[0].issues).to.deep.equal([]);
        const reportPath = path.join(workspaceRootDir, '.theia', 'flow', 'runs', context.run.id, 'workloads', context.workload.id, 'output', 'artifacts', 'qa', 'report.md');
        expect(await fs.readFile(reportPath, 'utf8')).to.contain('Status: passed');
    });

    it('QA real falha quando faltam evidencias contratuais e ha issue compartilhada aberta', async () => {
        const context = createExecutionContext(workspaceRootUri, {
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
        await addRunArtifact(context, workspaceRootDir, 'contracts/contracts.json', JSON.stringify(validContractPackage()), 'contract_design');
        await addRunArtifact(context, workspaceRootDir, 'delivery/join-summary.md', '# Delivery\n\nOnly partial UI notes.', 'delivery');
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
        const executor = new MockLlmProviderExecutor(agentMarkdown, [JSON.stringify({
            result: {
                status: 'completed',
                summary: 'QA agent reviewed delivery.',
                artifacts: [{ path: 'qa/report.md', content: '# QA\n\nAgent report.' }],
                signals: {},
                issues: []
            }
        })]);

        await executor.executeAgentWorkload(context);

        const qaWorkload = context.run.workloads.find(workload => workload.stateId === 'qa');
        expect(qaWorkload?.status).to.equal('failed');
        expect(context.run.signals.some(signal => signal.key === 'qa.status' && signal.value === 'failed')).to.equal(true);
        expect(qaWorkload?.issues.some(issue => issue.includes('Missing route evidence for contract API GET /feature'))).to.equal(true);
        expect(qaWorkload?.issues.some(issue => issue.includes('Missing canonical field/name evidence for FeatureRequest'))).to.equal(true);
        expect(qaWorkload?.issues.some(issue => issue.includes('Unsafe or unapplied effect remains'))).to.equal(true);
        expect(qaWorkload?.issues.some(issue => issue.includes('Shared delivery issue remains open'))).to.equal(true);
        expect(context.run.events.some(event => event.type === 'workload.failed')).to.equal(true);
    });

    it('QA real falha com issue bloqueante aberta registrada no event log', async () => {
        const context = createExecutionContext(workspaceRootUri, {
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
        await addRunArtifact(context, workspaceRootDir, 'contracts/contracts.json', JSON.stringify(validContractPackage()), 'contract_design');
        await addRunArtifact(
            context,
            workspaceRootDir,
            'delivery/join-summary.md',
            [
                '# Delivery',
                'Backend exposes GET /feature for FeatureRequest.',
                'Frontend consumes GET /feature with FeatureRequest fields.',
                'Designer delivered public/assets/feature-icon.png.'
            ].join('\n'),
            'delivery'
        );
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
        const executor = new MockLlmProviderExecutor(agentMarkdown, [JSON.stringify({
            result: {
                status: 'completed',
                summary: 'QA agent reviewed delivery.',
                artifacts: [{ path: 'qa/report.md', content: '# QA\n\nAgent report.' }],
                signals: {},
                issues: []
            }
        })]);

        await executor.executeAgentWorkload(context);

        const qaWorkload = context.run.workloads.find(workload => workload.stateId === 'qa');
        expect(qaWorkload?.status).to.equal('failed');
        expect(context.run.signals.some(signal => signal.key === 'qa.status' && signal.value === 'failed')).to.equal(true);
        expect(qaWorkload?.issues.some(issue => issue.includes('Shared delivery issue remains open: Backend contract validation is still open.'))).to.equal(true);
    });

    it('envia aos papeis paralelos somente work order e contexto escopados ao workload', async () => {
        const context = createExecutionContext(workspaceRootUri, {
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
        const executor = new MockLlmProviderExecutor(agentMarkdown, [JSON.stringify({
            result: {
                status: 'completed',
                summary: 'Backend done.',
                artifacts: [{ path: 'backend/delivery.md', content: '# Backend' }],
                signals: {},
                issues: []
            }
        })]);

        await executor.executeAgentWorkload(context);

        const providerContext = executor.providerPayloads[0].context as Record<string, unknown>;
        const payloadContextPack = providerContext.contextPack as string;
        expect(payloadContextPack).to.contain('Scoped context for workload "workload-backend"');
        expect(payloadContextPack).to.contain('contracts/work-orders/backend.md');
        expect(payloadContextPack).to.not.contain('contracts/work-orders/frontend.md');
        expect(payloadContextPack).to.not.contain('Full Contracted Parallel Delivery Plan');
        expect(payloadContextPack).to.not.contain('public/assets/login-hero.png');
        const workloadInputContextPack = await fs.readFile(path.join(
            workspaceRootDir,
            '.theia',
            'flow',
            'runs',
            context.run.id,
            'workloads',
            context.workload.id,
            'input',
            'context-pack.md'
        ), 'utf8');
        expect(workloadInputContextPack).to.equal(payloadContextPack);
    });

    it('gera report workload estruturado agregando run, workflow, efeitos e pendencias', async () => {
        const context = createExecutionContext(workspaceRootUri, {
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
        context.run.events.push(
            { id: 'transition-fired', runId: context.run.id, type: 'transition.fired', timestamp: '2026-05-19T00:00:00.000Z', stateId: 'repair', transitionId: 'repair_to_final', message: 'Transition fired.' },
            { id: 'issue-recorded', runId: context.run.id, type: 'issue.recorded', timestamp: '2026-05-19T00:00:00.000Z', stateId: 'repair', workloadId: 'workload-repair-2', message: 'Issue recorded.', payload: { severity: 'blocking', summary: 'QA failed before repair.' } }
        );
        const executor = new ProviderBackedFlowWorkloadExecutor();

        await executor.executeReportWorkload(context);

        expect(context.run.workloads.find(workload => workload.id === 'workload-1')?.status).to.equal('done');
        expect(context.run.artifacts.some(artifact => artifact.kind === 'report' && artifact.uri.endsWith('/final/report.json'))).to.equal(true);
        const reportPath = path.join(workspaceRootDir, '.theia', 'flow', 'runs', context.run.id, 'workloads', context.workload.id, 'output', 'artifacts', 'final', 'report.json');
        const report = JSON.parse(await fs.readFile(reportPath, 'utf8'));
        expect(report.run.prompt).to.equal('run this task');
        expect(report.workflow.capabilities).to.deep.equal(['filesystem.edit', 'llm.agent.execute']);
        expect(report.workflow.transitions.some((transition: any) => transition.id === 'repair_to_final' && transition.fired === true)).to.equal(true);
        expect(report.workloads.some((workload: any) => workload.id === 'workload-repair-2' && workload.previousWorkloadId === 'workload-repair-1')).to.equal(true);
        expect(report.gates.some((gate: any) => gate.id === 'scope_gate' && gate.status === 'approved')).to.equal(true);
        expect(report.artifacts.some((artifact: any) => artifact.id === 'artifact-contract')).to.equal(true);
        expect(report.effects.some((effect: any) => effect.id === 'effect-file' && effect.status === 'blocked')).to.equal(true);
        expect(report.issues.some((issue: any) => issue.summary === 'QA failed before repair.')).to.equal(true);
        expect(report.repairs.some((repair: any) => repair.stateId === 'repair' && repair.attempts === 2)).to.equal(true);
        expect(report.memoryWrites.some((write: any) => write.id === 'memory-write-1')).to.equal(true);
        expect(report.pending.some((item: any) => item.kind === 'effect' && item.id === 'effect-file')).to.equal(true);
        expect(report.eventLog.length).to.be.greaterThan(0);
    });

    it('executa command workload com politica, saidas redigidas e auditoria', async () => {
        const context = createExecutionContext(workspaceRootUri, {
            type: 'command',
            command: JSON.stringify([process.execPath, '-e', "console.log('token=secret-value'); console.error('done')"]),
            allowedCommands: [process.execPath],
            approvalPolicy: 'auto_apply',
            timeoutMs: 5000
        });
        const executor = new ProviderBackedFlowWorkloadExecutor();

        await executor.executeCommandWorkload(context);

        const effect = context.run.effects.find(item => item.kind === 'command' && item.type === 'command.executed');
        expect(effect?.status).to.equal('applied');
        expect(effect?.stdout).to.contain('token=[REDACTED]');
        expect(effect?.stderr).to.contain('done');
        expect(effect?.timeoutMs).to.equal(5000);
        expect(context.run.events.some(event => event.type === 'effect.applied' && event.payload?.effectId === effect?.id)).to.equal(true);
        expect(context.run.artifacts.some(artifact => artifact.kind === 'log' && artifact.summary?.includes('Command effect applied'))).to.equal(true);
    });

    it('falha command workload bloqueado por allowlist sem executar', async () => {
        const marker = path.join(workspaceRootDir, 'blocked-command.txt');
        const context = createExecutionContext(workspaceRootUri, {
            type: 'command',
            command: JSON.stringify([process.execPath, '-e', `require('fs').writeFileSync(${JSON.stringify(marker)}, 'ran')`]),
            allowedCommands: ['not-node'],
            approvalPolicy: 'auto_apply'
        });
        const executor = new ProviderBackedFlowWorkloadExecutor();

        await executor.executeCommandWorkload(context);

        const effect = context.run.effects.find(item => item.kind === 'command' && item.type === 'command.executed');
        expect(effect?.status).to.equal('blocked');
        expect(effect?.stderr).to.contain('command outside allowlist');
        expect(context.run.workloads[0].status).to.equal('failed');
        await expectRejected(fs.access(marker));
    });

    it('registra timeout e stdout grande em command workloads', async () => {
        const timeoutContext = createExecutionContext(workspaceRootUri, {
            type: 'command',
            command: JSON.stringify([process.execPath, '-e', 'setTimeout(() => undefined, 1000)']),
            allowedCommands: [process.execPath],
            approvalPolicy: 'auto_apply',
            timeoutMs: 50
        });
        const stdoutContext = createExecutionContext(workspaceRootUri, {
            type: 'command',
            command: JSON.stringify([process.execPath, '-e', "process.stdout.write('token=secret-value\\n' + 'x'.repeat(13000))"]),
            allowedCommands: [process.execPath],
            approvalPolicy: 'auto_apply',
            timeoutMs: 5000
        });
        const executor = new ProviderBackedFlowWorkloadExecutor();

        await executor.executeCommandWorkload(timeoutContext);
        await executor.executeCommandWorkload(stdoutContext);

        const timeoutEffect = timeoutContext.run.effects.find(item => item.kind === 'command' && item.type === 'command.executed');
        expect(timeoutEffect?.status).to.equal('failed');
        expect(timeoutEffect?.timedOut).to.equal(true);
        expect(timeoutContext.run.workloads[0].status).to.equal('failed');

        const stdoutEffect = stdoutContext.run.effects.find(item => item.kind === 'command' && item.type === 'command.executed');
        expect(stdoutEffect?.status).to.equal('applied');
        expect(stdoutEffect?.stdout).to.contain('token=[REDACTED]');
        expect(stdoutEffect?.stdout).to.contain('[truncated command output]');
        expect(stdoutEffect?.stdout).to.not.contain('secret-value');
    });

    it('falha com JSON inválido e marca workload como failed', async () => {
        const context = createExecutionContext(workspaceRootUri);
        const executor = new MockLlmProviderExecutor(agentMarkdown, [toJsonFailureMessage('this is not json')]);

        const result = await executor.executeAgentWorkload(context);

        expect(result.artifactUri).to.contain('flow://');
        expect(context.run.workloads[0].status).to.equal('failed');
        expect(context.run.stateStatuses.agent).to.equal('failed');
        expect(context.run.events.some(event => event.type === 'workload.failed')).to.equal(true);
        expect(context.run.effects.some(effect => effect.summary.includes('failed after 1 attempts'))).to.equal(true);
        expect(context.run.workloads[0].outputEnvelope).to.be.undefined;
    });

    it('bloqueia completion quando result.json nao valida contra workload-output.schema.json', async () => {
        const context = createExecutionContext(workspaceRootUri);
        const executor = new MockLlmProviderExecutor(agentMarkdown, [JSON.stringify({
            result: {
                status: 'completed',
                summary: 'Invalid envelope should not complete.',
                artifacts: [{ path: 'report.md', content: '# Report' }],
                signals: {},
                issues: []
            },
            report: 'Execution finished.',
            effects: [{
                type: 'notification',
                summary: 'Notification effects need a path or command in the workload output contract.'
            }]
        })]);

        await executor.executeAgentWorkload(context);

        expect(context.run.workloads[0].status).to.equal('failed');
        expect(context.run.events.some(event => event.type === 'workload.failed')).to.equal(true);
        expect(context.run.events.some(event => event.type === 'workload.completed')).to.equal(false);
        expect(context.run.workloads[0].outputArtifacts.some(uri => uri.endsWith('/output/result.json'))).to.equal(false);
        await expectRejected(fs.access(path.join(workspaceRootDir, '.theia', 'flow', 'runs', context.run.id, 'workloads', context.run.workloads[0].id, 'output', 'result.json')));
    });

    it('faz fallback seguro em timeout quando não há retry', async () => {
        const context = createExecutionContext(workspaceRootUri);
        const executor = new MockLlmProviderExecutor(agentMarkdown, [new Error('LLM command provider timed out after 120000ms.')]);

        const result = await executor.executeAgentWorkload(context);

        expect(result.artifactUri).to.contain('flow://');
        expect(context.run.workloads[0].status).to.equal('done');
        expect(context.run.effects.some(effect => effect.summary.includes('used deterministic fallback'))).to.equal(true);
        expect(context.run.events.some(event => event.type === 'workload.retry')).to.equal(false);
        expect(context.run.events.some(event => event.type === 'workload.failed')).to.equal(false);
    });

    it('reexecuta após retry em erro temporário e conclui com sucesso', async () => {
        const context = createExecutionContext(workspaceRootUri, {
            retry: {
                max: 1
            }
        });
        const executor = new MockLlmProviderExecutor(agentMarkdown, [
            new Error('LLM command provider timed out after 120000ms.'),
            validMockProviderResult()
        ]);

        const result = await executor.executeAgentWorkload(context);

        expect(executor.calls).to.equal(2);
        expect(result.artifactUri).to.contain('report.md');
        expect(context.run.events.filter(event => event.type === 'workload.retry')).to.have.length(1);
        expect(context.run.workloads[0].status).to.equal('done');
        expect(context.run.stateStatuses.agent).to.equal('done');
        expect(context.run.events.some(event => event.type === 'workload.failed')).to.equal(false);
    });

    it('finaliza com falha após atingir limite de retry', async () => {
        const context = createExecutionContext(workspaceRootUri, {
            retry: {
                max: 1
            }
        });
        const executor = new MockLlmProviderExecutor(agentMarkdown, [
            new Error('Temporary provider issue.'),
            new Error('Persistent provider issue.')
        ]);

        const result = await executor.executeAgentWorkload(context);

        expect(executor.calls).to.equal(2);
        expect(result.artifactUri).to.contain('flow://');
        expect(context.run.workloads[0].status).to.equal('failed');
        expect(context.run.stateStatuses.agent).to.equal('failed');
        expect(context.run.events.filter(event => event.type === 'workload.retry')).to.have.length(1);
        expect(context.run.events.some(event => event.type === 'workload.failed')).to.equal(true);
        expect(context.run.events.some(event => event.type === 'effect.proposed')).to.equal(true);
    });
});

async function expectRejected(action: Promise<unknown>): Promise<void> {
    try {
        await action;
    } catch {
        return;
    }
    throw new Error('Expected promise to be rejected.');
}

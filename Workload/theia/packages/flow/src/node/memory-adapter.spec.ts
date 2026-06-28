import { expect } from 'chai';
import { FlowRun, FlowWorkflow, FlowWorkload, MemoryWrite } from '../common';
import { LocalMemoryAdapter } from './memory-adapter';

interface MemoryService {
    providerKind?: string;
    search(query: unknown): Promise<unknown[]>;
    buildContextPack(request: unknown): Promise<unknown>;
    getDashboard(workspacePath: string): Promise<unknown>;
    addMemory(memory: unknown): Promise<unknown>;
}

describe('LocalMemoryAdapter', () => {

    const originalMemoryProvider = process.env.FLOW_MEMORY_PROVIDER;
    const originalMemoryFallback = process.env.FLOW_MEMORY_FALLBACK;

    afterEach(() => {
        if (originalMemoryProvider === undefined) {
            delete process.env.FLOW_MEMORY_PROVIDER;
        } else {
            process.env.FLOW_MEMORY_PROVIDER = originalMemoryProvider;
        }
        if (originalMemoryFallback === undefined) {
            delete process.env.FLOW_MEMORY_FALLBACK;
        } else {
            process.env.FLOW_MEMORY_FALLBACK = originalMemoryFallback;
        }
    });

    it('rejects local context fallback when Memory is missing and fallback is not explicit', async () => {
        const adapter = new LocalMemoryAdapter();

        await expectRejected(
            adapter.buildContextPack('file:///workspace', sampleWorkflow()),
            'Memory service is not bound in Flow yet.'
        );
    });

    it('builds a lean local context pack only when fallback is explicit', async () => {
        process.env.FLOW_MEMORY_FALLBACK = 'true';
        const adapter = new LocalMemoryAdapter();
        const pack = await adapter.buildContextPack('file:///workspace', sampleWorkflow());

        expect(pack.workspaceRootUri).to.equal('file:///workspace');
        expect(pack.workflow).to.deep.equal({
            id: 'memory_flow',
            name: 'Memory Flow',
            stateCount: 2,
            transitionCount: 1,
            agentIds: ['architect']
        });
        expect(pack.files.map(file => file.uri)).to.deep.equal([
            'agents/architect.md',
            'memory/finding.md',
            'request.md'
        ]);
        expect(pack.symbols).to.deep.equal([]);
        expect(pack.missingService).to.contain('Memory service is not bound');
    });

    it('collects memory candidates from effects and signals without auto-persisting memory writes', async () => {
        const adapter = new LocalMemoryAdapter();
        const run = {
            ...sampleRun(),
            signals: [{
                key: 'project.memory.decision',
                value: 'Remember signal content only after review.',
                stateId: 'remember',
                runId: 'run-1',
                createdAt: '2026-05-19T00:01:00.000Z'
            }]
        };

        const candidates = await adapter.collectMemoryCandidates(run);

        expect(candidates).to.have.length(2);
        expect(candidates[0]).to.include({
            runId: run.id,
            stateId: 'remember',
            source: 'effect',
            status: 'candidate'
        });
        expect(candidates[1]).to.include({
            source: 'signal',
            status: 'candidate'
        });
        expect(run.memoryWrites).to.equal(undefined);
    });

    it('imports memory-related artifacts as candidates for review only', async () => {
        const adapter = new LocalMemoryAdapter();
        const run = {
            ...sampleRun(),
            effects: [],
            artifacts: [{
                id: 'artifact-memory-1',
                runId: 'run-1',
                stateId: 'remember',
                uri: 'flow://run-1/remember/memory-summary.md',
                kind: 'report' as const,
                summary: 'Remember this artifact content only after review.',
                createdAt: '2026-05-19T00:02:00.000Z'
            }]
        };

        const candidates = await adapter.collectMemoryCandidates(run);

        expect(candidates).to.have.length(1);
        expect(candidates[0]).to.include({
            runId: run.id,
            stateId: 'remember',
            source: 'artifact',
            status: 'candidate',
            content: 'Remember this artifact content only after review.'
        });
        expect(run.memoryWrites).to.equal(undefined);
    });

    it('refuses to persist memory without explicit approval metadata', async () => {
        const adapter = new LocalMemoryAdapter();
        const service = new MockMemoryService();
        Object.defineProperty(adapter, 'memoryService', { value: service as unknown as MemoryService });

        const result = await adapter.writeApprovedMemory({
            id: 'write-1',
            runId: 'run-1',
            candidateId: 'candidate-1',
            status: 'failed',
            content: 'This came from an imported candidate.',
            approvedAt: '2026-05-19T00:00:00.000Z'
        }, 'file:///workspace');

        expect(result.status).to.equal('failed');
        expect(result.error).to.contain('explicitly approved');
        expect(service.memories).to.have.length(0);
    });

    it('uses the public Memory service when it is bound', async () => {
        const adapter = new LocalMemoryAdapter();
        const service = new MockMemoryService();
        Object.defineProperty(adapter, 'memoryService', { value: service as unknown as MemoryService });

        const report = await adapter.report();
        const pack = await adapter.buildContextPack('file:///workspace', sampleWorkflow());

        expect(report).to.deep.equal({
            provider: 'local',
            available: true,
            detail: 'Memory is provided by the local CyberVinci service.'
        });
        expect(service.searchRequests[0]).to.include({
            workspacePath: '\\workspace'
        });
        expect(pack.summary).to.contain('Memory context pack');
        expect(pack.files.map(file => file.uri)).to.include('src/service.ts');
        expect(pack.files.map(file => file.uri)).to.include('package.json');
        expect(pack.symbols).to.deep.equal(['MemoryService', 'Service']);
        expect(pack.sections?.map(section => section.id)).to.include.members([
            'retrieval',
            'user_preferences',
            'decisions',
            'workspace_patterns',
            'repository_stack',
            'relevant_files',
            'global_memories'
        ]);
        expect(pack.sections?.find(section => section.id === 'user_preferences')?.items[0].content).to.contain('concise');
        expect(pack.sections?.find(section => section.id === 'repository_stack')?.items.map(item => item.title)).to.include('typescript');
        expect(pack.missingService).to.equal(undefined);
    });

    it('does not mask Memory provider failures unless fallback is explicit', async () => {
        const adapter = new LocalMemoryAdapter();
        const service = new MockMemoryService();
        service.searchError = new Error('index unavailable');
        Object.defineProperty(adapter, 'memoryService', { value: service as unknown as MemoryService });

        await expectRejected(
            adapter.buildContextPack('file:///workspace', sampleWorkflow()),
            'Memory context failed and local fallback is not explicitly enabled: index unavailable'
        );
    });

    it('uses explicit local fallback when the Memory provider fails', async () => {
        process.env.FLOW_MEMORY_PROVIDER = 'local-fallback';
        const adapter = new LocalMemoryAdapter();
        const service = new MockMemoryService();
        service.searchError = new Error('index unavailable');
        Object.defineProperty(adapter, 'memoryService', { value: service as unknown as MemoryService });

        const pack = await adapter.buildContextPack('file:///workspace', sampleWorkflow());

        expect(pack.summary).to.contain('Workflow "Memory Flow"');
        expect(pack.missingService).to.equal('Memory context failed: index unavailable');
    });

    it('builds a focused context pack for one parallel workload', async () => {
        const adapter = new LocalMemoryAdapter();
        const service = new MockMemoryService();
        Object.defineProperty(adapter, 'memoryService', { value: service as unknown as MemoryService });

        const pack = await adapter.buildContextPack('file:///workspace', parallelWorkflow(), sampleWorkload());

        expect(pack.workflow.agentIds).to.deep.equal(['backend']);
        expect(pack.files.map(file => file.uri)).to.include.members([
            'agents/backend.md',
            'contracts/shared.md',
            'backend/report.md',
            'src/service.ts'
        ]);
        expect(pack.files.map(file => file.uri)).to.not.include('agents/frontend.md');
        expect(pack.files.map(file => file.uri)).to.not.include('ui/mockup.tsx');
        expect(service.searchRequests[0]).to.deep.include({
            limit: 5
        });
        expect(service.contextPackRequests[0]).to.deep.include({
            tokenBudget: 2500
        });
        expect(pack.sections?.find(section => section.id === 'relevant_files')?.items.map(item => item.uri)).to.deep.equal(['src/service.ts']);
        expect(pack.sections?.find(section => section.id === 'retrieval')?.items).to.have.length(2);
    });

    it('reports an external Memory provider when the bound service declares one', async () => {
        const adapter = new LocalMemoryAdapter();
        const service = new MockMemoryService();
        service.providerKind = 'external';
        Object.defineProperty(adapter, 'memoryService', { value: service as unknown as MemoryService });

        const report = await adapter.report();

        expect(report).to.deep.equal({
            provider: 'external',
            available: true,
            detail: 'Memory is provided by an external host adapter.'
        });
    });

    it('reports Memory as missing when explicitly disabled', async () => {
        process.env.FLOW_MEMORY_PROVIDER = 'none';
        const adapter = new LocalMemoryAdapter();
        const service = new MockMemoryService();
        Object.defineProperty(adapter, 'memoryService', { value: service as unknown as MemoryService });

        const report = await adapter.report();

        expect(report).to.deep.equal({
            provider: 'missing',
            available: false,
            missingService: 'Memory provider is explicitly disabled for Flow.'
        });
    });

    it('writes approved memories through the public Memory service', async () => {
        const adapter = new LocalMemoryAdapter();
        const service = new MockMemoryService();
        Object.defineProperty(adapter, 'memoryService', { value: service as unknown as MemoryService });

        const result = await adapter.writeApprovedMemory({
            id: 'write-1',
            runId: 'run-1',
            candidateId: 'candidate-1',
            status: 'approved',
            content: 'Keep Flow memory writes explicit.',
            approvedAt: '2026-05-19T00:00:00.000Z'
        }, 'file:///workspace');

        expect(result.status).to.equal('written');
        expect(service.memories).to.have.length(1);
        expect(service.memories[0]).to.include({
            scope: 'workspace',
            workspacePath: '\\workspace',
            memoryType: 'manual_note',
            content: 'Keep Flow memory writes explicit.',
            source: 'flow'
        });
    });

    it('returns failed memory writes when the Memory provider rejects the write', async () => {
        const adapter = new LocalMemoryAdapter();
        const service = new MockMemoryService();
        service.addMemoryError = new Error('memory store is read-only');
        Object.defineProperty(adapter, 'memoryService', { value: service as unknown as MemoryService });

        const result = await adapter.writeApprovedMemory(memoryWrite({ id: 'write-failure' }), 'file:///workspace');

        expect(result).to.include({
            id: 'write-failure',
            status: 'failed',
            error: 'memory store is read-only'
        });
        expect(service.memories).to.have.length(0);
    });

    it('maps Flow memory scopes to Memory memory scopes', async () => {
        const adapter = new LocalMemoryAdapter();
        const service = new MockMemoryService();
        Object.defineProperty(adapter, 'memoryService', { value: service as unknown as MemoryService });

        await adapter.writeApprovedMemory(memoryWrite({ id: 'write-ide', scope: 'ide' }), 'file:///workspace');
        await adapter.writeApprovedMemory(memoryWrite({ id: 'write-workspace', scope: 'workspace' }), 'file:///workspace');
        await adapter.writeApprovedMemory(memoryWrite({ id: 'write-project', scope: 'project' }), 'file:///workspace');
        await adapter.writeApprovedMemory(memoryWrite({ id: 'write-workflow', scope: 'workflow', target: 'workflow-target' }), 'file:///workspace');
        await adapter.writeApprovedMemory(memoryWrite({ id: 'write-run', scope: 'run', target: 'run-target' }), 'file:///workspace');
        await adapter.writeApprovedMemory(memoryWrite({ id: 'write-agent', scope: 'agent', target: 'agent-target' }), 'file:///workspace');

        expect(service.memories[0]).to.deep.include({
            scope: 'global'
        });
        expect(service.memories[0]).to.not.have.property('workspacePath');
        expect(service.memories[1]).to.deep.include({
            scope: 'workspace',
            workspacePath: '\\workspace'
        });
        expect(service.memories[2]).to.deep.include({
            scope: 'repository',
            workspacePath: '\\workspace',
            repositoryId: 'flow-project-workspace'
        });
        expect(service.memories[3]).to.deep.include({
            scope: 'task',
            workspacePath: '\\workspace',
            taskId: 'flow-workflow-workflow-target',
            retentionPolicy: 'permanent'
        });
        expect(service.memories[4]).to.deep.include({
            scope: 'task',
            workspacePath: '\\workspace',
            taskId: 'flow-run-run-target',
            retentionPolicy: 'manual'
        });
        expect(service.memories[5]).to.deep.include({
            scope: 'task',
            workspacePath: '\\workspace',
            taskId: 'flow-agent-agent-target',
            retentionPolicy: 'permanent'
        });
    });
});

function memoryWrite(partial: Partial<MemoryWrite>): MemoryWrite {
    return {
        id: 'write-1',
        runId: 'run-1',
        candidateId: 'candidate-1',
        status: 'approved',
        content: 'Keep scoped memory explicit.',
        approvedAt: '2026-05-19T00:00:00.000Z',
        ...partial
    };
}

async function expectRejected(promise: Promise<unknown>, message: string): Promise<void> {
    try {
        await promise;
    } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.contain(message);
        return;
    }
    throw new Error(`Expected promise to reject with "${message}".`);
}

function sampleWorkflow(): FlowWorkflow {
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

function sampleRun(): FlowRun {
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

function parallelWorkflow(): FlowWorkflow {
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

function sampleWorkload(): FlowWorkload {
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

class MockMemoryService {

    readonly searchRequests: unknown[] = [];
    readonly contextPackRequests: unknown[] = [];
    readonly memories: unknown[] = [];
    providerKind?: 'local' | 'external';
    addMemoryError?: Error;
    searchError?: Error;

    async search(request: unknown): Promise<unknown[]> {
        if (this.searchError) {
            throw this.searchError;
        }
        this.searchRequests.push(request);
        return [{
            id: 'result-1',
            sourceKind: 'code',
            title: 'Service',
            snippet: 'service excerpt',
            score: 0.9,
            uri: 'src/service.ts'
        }];
    }

    async buildContextPack(request: unknown): Promise<unknown> {
        this.contextPackRequests.push(request);
        return {
            workspacePath: 'C:\\workspace',
            promptSignature: 'signature',
            estimatedTokens: 42,
            sections: [{ id: 'section-1', title: 'Relevant context', content: 'service excerpt' }],
            citations: [{ resultId: 'result-1', sourceKind: 'code', title: 'Service', uri: 'src/service.ts' }]
        };
    }

    async getDashboard(): Promise<unknown> {
        return {
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
        };
    }

    async addMemory(memory: Record<string, unknown>): Promise<unknown> {
        if (this.addMemoryError) {
            throw this.addMemoryError;
        }
        this.memories.push(memory);
        return {
            id: 'memory-1',
            status: 'active',
            staleStatus: 'fresh',
            createdAt: '2026-05-19T00:00:00.000Z',
            updatedAt: '2026-05-19T00:00:00.000Z',
            acceptedCount: 0,
            rejectedCount: 0,
            ...memory
        };
    }
}

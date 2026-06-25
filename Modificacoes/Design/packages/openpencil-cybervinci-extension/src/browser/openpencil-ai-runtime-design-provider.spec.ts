import { expect } from 'chai';
import {
    CyberVinciAiRuntimeService,
    CyberVinciAiTaskRequest,
    CyberVinciAiTaskResult
} from '@cybervinci/ai-runtime/lib/common';
import { OpenPencilDocument } from '../common/openpencil-types';
import {
    OpenPencilAiDesignRequest,
    OpenPencilAiSkillContext
} from './openpencil-design-command-service';
import { OpenPencilAiRuntimeDesignProvider } from './openpencil-ai-runtime-design-provider';

describe('OpenPencilAiRuntimeDesignProvider', () => {

    it('prefers the frontend AI runtime for batch generation so provider preferences are applied', async () => {
        let frontendCalled = false;
        let backendCalled = false;
        const aiRuntimeFrontend = {
            async runTask(request: CyberVinciAiTaskRequest): Promise<CyberVinciAiTaskResult> {
                frontendCalled = true;
                return {
                    taskId: request.taskId,
                    surfaceId: request.surfaceId,
                    action: request.action,
                    text: '{"contract":"openpencil.design-operations.v1","operations":[{"operation":"createNode","parentId":null,"node":{"id":"frontend-card","type":"frame","name":"Frontend card","width":320,"height":180,"children":[]}}]}',
                    structured: {
                        contract: 'openpencil.design-operations.v1',
                        operations: [{
                            operation: 'createNode',
                            parentId: null,
                            node: {
                                id: 'frontend-card',
                                type: 'frame',
                                name: 'Frontend card',
                                width: 320,
                                height: 180,
                                children: []
                            }
                        }]
                    },
                    provider: {
                        id: 'direct-http:opencode',
                        runtime: 'direct-http',
                        modelProvider: 'opencode',
                        label: 'OpenCode Zen',
                        available: true
                    },
                    execution: request.execution ?? {},
                    context: {
                        requested: false,
                        used: false,
                        source: 'none',
                        estimatedTokens: 0,
                        suggestions: [],
                        citations: []
                    },
                    notifications: [],
                    diagnostics: ['frontend runtime ok']
                };
            }
        };
        const aiRuntime = {
            async runTask(): Promise<CyberVinciAiTaskResult> {
                backendCalled = true;
                throw new Error('Backend runtime should not be called when frontend runtime exists.');
            }
        } as unknown as CyberVinciAiRuntimeService;
        const provider = new OpenPencilAiRuntimeDesignProvider();
        Object.assign(provider, { aiRuntime, aiRuntimeFrontend });

        const result = await provider.generateOperations(createRuntimeRequest(), createRuntimeContext());

        expect(frontendCalled).to.equal(true);
        expect(backendCalled).to.equal(false);
        expect(result.operations?.[0].operation).to.equal('createNode');
        expect(result.diagnostics).to.deep.equal(['frontend runtime ok']);
    });

    it('forwards provider, model, reasoning, and workspace selection to the provider-neutral AI runtime', async () => {
        let forwardedRequest: CyberVinciAiTaskRequest | undefined;
        const aiRuntime = {
            async runTask(request: CyberVinciAiTaskRequest): Promise<CyberVinciAiTaskResult> {
                forwardedRequest = request;
                return {
                    taskId: request.taskId,
                    surfaceId: request.surfaceId,
                    action: request.action,
                    text: '{"contract":"openpencil.design-operations.v1","operations":[{"operation":"createNode","parentId":null,"node":{"id":"runtime-card","type":"frame","name":"Runtime card","width":320,"height":180,"children":[]}}]}',
                    structured: {
                        contract: 'openpencil.design-operations.v1',
                        operations: [{
                            operation: 'createNode',
                            parentId: null,
                            node: {
                                id: 'runtime-card',
                                type: 'frame',
                                name: 'Runtime card',
                                width: 320,
                                height: 180,
                                children: []
                            }
                        }]
                    },
                    provider: {
                        id: 'direct-http:openrouter',
                        runtime: 'direct-http',
                        modelProvider: 'openrouter',
                        label: 'OpenRouter',
                        available: true
                    },
                    execution: request.execution ?? {},
                    context: {
                        requested: false,
                        used: false,
                        source: 'none',
                        estimatedTokens: 0,
                        suggestions: [],
                        citations: []
                    },
                    notifications: [],
                    diagnostics: ['runtime ok']
                };
            }
        } as unknown as CyberVinciAiRuntimeService;
        const provider = new OpenPencilAiRuntimeDesignProvider();
        Object.assign(provider, { aiRuntime });

        const request = createRuntimeRequest();
        const context = createRuntimeContext();

        const result = await provider.generateOperations(request, context);

        expect(result.operations?.map(operation => operation.operation)).to.deep.equal(['createNode']);
        expect(result.diagnostics).to.deep.equal(['runtime ok']);
        expect(forwardedRequest?.surfaceId).to.equal('openpencil-design');
        expect(forwardedRequest?.action).to.equal('canvas.generateOperations');
        expect(forwardedRequest?.workspacePath).to.equal('C:/workspace');
        expect(forwardedRequest?.execution).to.include({
            providerId: 'direct-http:openrouter',
            runtime: 'direct-http',
            modelProvider: 'openrouter',
            model: 'openrouter/openai/gpt-5',
            reasoningPolicy: 'auto',
            reasoningEffort: 'high'
        });
        expect(forwardedRequest?.effectPolicy).to.include({
            previewOnly: true,
            workspaceWrites: 'forbidden',
            shellExecution: 'forbidden'
        });
    });

    it('normalizes batch runtime operation event wrappers into OpenPencil operations', async () => {
        const aiRuntimeFrontend = {
            async runTask(request: CyberVinciAiTaskRequest): Promise<CyberVinciAiTaskResult> {
                return {
                    taskId: request.taskId,
                    surfaceId: request.surfaceId,
                    action: request.action,
                    text: '{"contract":"openpencil.design-operations.v1","operations":[{"type":"operation","operation":{"operation":"createNode","parentId":null,"node":{"id":"wrapped-card","type":"frame","name":"Wrapped card","width":320,"height":180,"children":[]}}}]}',
                    structured: {
                        contract: 'openpencil.design-operations.v1',
                        operations: [{
                            type: 'operation',
                            operation: {
                                operation: 'createNode',
                                parentId: null,
                                node: {
                                    id: 'wrapped-card',
                                    type: 'frame',
                                    name: 'Wrapped card',
                                    width: 320,
                                    height: 180,
                                    children: []
                                }
                            }
                        }]
                    },
                    provider: {
                        id: 'direct-http:opencode',
                        runtime: 'direct-http',
                        modelProvider: 'opencode',
                        label: 'OpenCode Zen',
                        available: true
                    },
                    execution: request.execution ?? {},
                    context: {
                        requested: false,
                        used: false,
                        source: 'none',
                        estimatedTokens: 0,
                        suggestions: [],
                        citations: []
                    },
                    notifications: [],
                    diagnostics: []
                };
            }
        };
        const provider = new OpenPencilAiRuntimeDesignProvider();
        Object.assign(provider, { aiRuntimeFrontend });

        const result = await provider.generateOperations(createRuntimeRequest(), createRuntimeContext());

        expect(result.operations?.map(operation => operation.operation)).to.deep.equal(['createNode']);
        expect(result.operations?.[0]).to.deep.include({ parentId: null });
    });

    it('normalizes weak-model operation variants into strict OpenPencil operations', async () => {
        const aiRuntimeFrontend = {
            async runTask(request: CyberVinciAiTaskRequest): Promise<CyberVinciAiTaskResult> {
                return {
                    taskId: request.taskId,
                    surfaceId: request.surfaceId,
                    action: request.action,
                    text: '',
                    structured: {
                        contract: 'openpencil.design-operations.v1',
                        operations: [{
                            operation: 'createNode',
                            id: 'flat-card',
                            type: 'frame',
                            name: 'Flat card',
                            width: 320,
                            height: 180,
                            children: []
                        }, {
                            action: 'create',
                            parent: 'flat-card',
                            payload: {
                                id: 'flat-title',
                                type: 'text',
                                name: 'Flat title',
                                content: 'Nova Market'
                            }
                        }, {
                            operation: 'updatePage',
                            changes: {
                                background: '#f5f5f5'
                            }
                        }, {
                            operation: 'setSelection',
                            ids: ['flat-card']
                        }]
                    },
                    provider: {
                        id: 'direct-http:opencode',
                        runtime: 'direct-http',
                        modelProvider: 'opencode',
                        label: 'OpenCode Zen',
                        available: true
                    },
                    execution: request.execution ?? {},
                    context: {
                        requested: false,
                        used: false,
                        source: 'none',
                        estimatedTokens: 0,
                        suggestions: [],
                        citations: []
                    },
                    notifications: [],
                    diagnostics: []
                };
            }
        };
        const provider = new OpenPencilAiRuntimeDesignProvider();
        Object.assign(provider, { aiRuntimeFrontend });

        const result = await provider.generateOperations(createRuntimeRequest(), createRuntimeContext());

        expect(result.operations?.map(operation => operation.operation)).to.deep.equal(['createNode', 'createNode', 'updatePage', 'setSelection']);
        expect(result.operations?.[0]).to.deep.include({
            operation: 'createNode',
            parentId: 'page-1'
        });
        expect(result.operations?.[0]).to.deep.nested.include({
            'node.id': 'flat-card',
            'node.type': 'frame'
        });
        expect(result.operations?.[1]).to.deep.include({
            operation: 'createNode',
            parentId: 'flat-card'
        });
        expect(result.operations?.[2]).to.deep.include({
            operation: 'updatePage',
            pageId: 'page-1'
        });
        expect(result.operations?.[3]).to.deep.include({
            operation: 'setSelection'
        });
    });

    it('streams provider-neutral operation events from AI Runtime text deltas', async () => {
        let forwardedRequest: CyberVinciAiTaskRequest | undefined;
        const aiRuntimeFrontend = {
            async *runTaskStream(request: CyberVinciAiTaskRequest): AsyncIterable<unknown> {
                forwardedRequest = request;
                yield {
                    type: 'text-delta',
                    text: '{"type":"operation","operation":'
                };
                yield {
                    type: 'text-delta',
                    text: '{"operation":"createNode","parentId":null,"node":{"id":"stream-card","type":"frame","name":"Stream card","width":320,"height":180,"children":[]}}}\n'
                };
                yield {
                    type: 'complete',
                    text: '',
                    notifications: [],
                    diagnostics: ['stream ok']
                };
            }
        };
        const provider = new OpenPencilAiRuntimeDesignProvider();
        Object.assign(provider, { aiRuntimeFrontend });

        const document: OpenPencilDocument = {
            version: '0.7.6',
            name: 'Runtime streaming test',
            activePageId: 'page-1',
            children: [],
            pages: [{
                id: 'page-1',
                name: 'Page 1',
                children: []
            }]
        };
        const request: OpenPencilAiDesignRequest = {
            prompt: 'Create a streamed card',
            document,
            selection: [],
            uri: 'file:///workspace/stream-card.op',
            mode: 'generation',
            workspacePath: 'C:/workspace',
            execution: {
                providerId: 'direct-http:openrouter',
                runtime: 'direct-http',
                modelProvider: 'openrouter',
                model: 'openrouter/openai/gpt-5',
                reasoningPolicy: 'auto',
                reasoningEffort: 'high'
            }
        };
        const context: OpenPencilAiSkillContext = {
            adapter: 'pen-ai-skills-in-process',
            phase: 'generation',
            operationFormat: 'OpenPencilDesignOperation[]',
            operationExamples: [],
            responseContract: {
                format: 'json',
                rootProperty: 'operations',
                guidance: 'return operations only'
            },
            documentContext: {
                documentName: 'Runtime streaming test',
                requestMode: 'generation',
                activePageId: 'page-1',
                activePageName: 'Page 1',
                nodeCount: 0,
                selectedNodeIds: [],
                selectedNodes: [],
                activePageLayout: {
                    id: 'page-1',
                    name: 'Page 1',
                    bounds: { x: 0, y: 0, width: 1200, height: 800 },
                    contentBottom: 0,
                    topLevelNodeCount: 0,
                    topLevelNodes: []
                }
            },
            skills: []
        };

        const events = [];
        for await (const event of provider.streamOperations(request, context)) {
            events.push(event);
        }

        expect(events[0]).to.deep.include({ type: 'operation' });
        expect(events[0].type === 'operation' ? events[0].operation.operation : undefined).to.equal('createNode');
        expect(events[1]).to.deep.equal({ type: 'complete', diagnostics: ['stream ok'] });
        expect(forwardedRequest?.surfaceId).to.equal('openpencil-design');
        expect(forwardedRequest?.action).to.equal('canvas.streamOperations');
        expect(forwardedRequest?.output?.mode).to.equal('text');
        expect(forwardedRequest?.execution).to.include({
            providerId: 'direct-http:openrouter',
            runtime: 'direct-http',
            modelProvider: 'openrouter',
            model: 'openrouter/openai/gpt-5',
            reasoningPolicy: 'auto',
            reasoningEffort: 'high'
        });
    });
});

function createRuntimeRequest(): OpenPencilAiDesignRequest {
    const document: OpenPencilDocument = {
        version: '0.7.6',
        name: 'Runtime forwarding test',
        activePageId: 'page-1',
        children: [],
        pages: [{
            id: 'page-1',
            name: 'Page 1',
            children: []
        }]
    };
    return {
        prompt: 'Create a runtime-backed card',
        document,
        selection: [],
        uri: 'file:///workspace/runtime-card.op',
        mode: 'generation',
        workspacePath: 'C:/workspace',
        execution: {
            providerId: 'direct-http:openrouter',
            runtime: 'direct-http',
            modelProvider: 'openrouter',
            model: 'openrouter/openai/gpt-5',
            reasoningPolicy: 'auto',
            reasoningEffort: 'high'
        }
    };
}

function createRuntimeContext(): OpenPencilAiSkillContext {
    return {
        adapter: 'pen-ai-skills-in-process',
        phase: 'generation',
        operationFormat: 'OpenPencilDesignOperation[]',
        operationExamples: [],
        responseContract: {
            format: 'json',
            rootProperty: 'operations',
            guidance: 'return operations only'
        },
        documentContext: {
            documentName: 'Runtime forwarding test',
            requestMode: 'generation',
            activePageId: 'page-1',
            activePageName: 'Page 1',
            nodeCount: 0,
            selectedNodeIds: [],
            selectedNodes: [],
            activePageLayout: {
                id: 'page-1',
                name: 'Page 1',
                bounds: { x: 0, y: 0, width: 1200, height: 800 },
                contentBottom: 0,
                topLevelNodeCount: 0,
                topLevelNodes: []
            }
        },
        skills: [{
            name: 'schema',
            phase: 'generation',
            category: 'knowledge',
            sourcePath: 'Skills/System/OpenPencil/pen-ai-skills/phases/generation/schema.md',
            guidance: 'Use OpenPencil operations.',
            content: 'schema content'
        }]
    };
}

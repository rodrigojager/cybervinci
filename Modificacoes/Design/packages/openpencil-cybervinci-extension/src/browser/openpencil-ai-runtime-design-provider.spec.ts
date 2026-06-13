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
        const request: OpenPencilAiDesignRequest = {
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
});

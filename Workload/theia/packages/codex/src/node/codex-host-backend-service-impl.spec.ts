// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { expect } from 'chai';
import { FlowRun, FlowRunDynamicWorkflowRequest, FlowService, FlowWorkflow } from '@cybervinci/flow/lib/common';
import { CodexHostBackendServiceImpl } from './codex-host-backend-service-impl';

describe('CodexHostBackendServiceImpl Flow RPC bridge', () => {
    it('starts a saved workflow by display name for Codex CLI manual workflow routing', async () => {
        const startRequests: Array<{ workflowId: string; prompt: string }> = [];
        const service = createServiceWithFlow({
            workflows: [
                workflow('design_review', 'Design Review'),
                workflow('implementation', 'Implementation')
            ],
            startRun: async request => {
                startRequests.push(request);
                return run('run-1', request.workflowId, request.prompt);
            }
        });

        const result = await service.invokeRpc('webview-1', 'flow-start-workflow', {
            workflowName: 'Design Review',
            prompt: 'Review this feature.'
        });

        expect(startRequests).deep.equals([{ workflowId: 'design_review', prompt: 'Review this feature.' }]);
        expect(result).deep.include({ run: run('run-1', 'design_review', 'Review this feature.') });
    });

    it('reports ambiguous saved workflow selectors instead of guessing', async () => {
        const service = createServiceWithFlow({
            workflows: [
                workflow('design-review', 'Design Review'),
                workflow('design_review', 'Design Review')
            ]
        });

        try {
            await service.invokeRpc('webview-1', 'flow-start-workflow', {
                workflowName: 'design review',
                prompt: 'Review this feature.'
            });
            throw new Error('flow-start-workflow unexpectedly resolved an ambiguous workflow.');
        } catch (error) {
            expect(error).to.be.instanceOf(Error);
            expect((error as Error).message).to.contain('workflow selector "design review" is ambiguous');
        }
    });

    it('runs a dynamic workflow with AI-authored parameters and per-stage model overrides', async () => {
        const dynamicRequests: FlowRunDynamicWorkflowRequest[] = [];
        const roleOverrides: FlowRunDynamicWorkflowRequest['roleOverrides'] = {
            judge: {
                profileId: 'critical_judge',
                provider: {
                    providerId: 'anthropic',
                    modelId: 'claude-sonnet'
                },
                modelExecution: {
                    reasoningPolicy: 'virtual',
                    virtualReasoning: {
                        enabled: true,
                        mode: 'balanced',
                        maxCostMultiplier: 6
                    }
                }
            },
            executor: {
                profileId: 'fast',
                provider: {
                    providerId: 'openai',
                    modelId: 'gpt-4.1-mini'
                },
                modelExecution: {
                    reasoningPolicy: 'native',
                    nativeReasoning: {
                        enabled: true,
                        effort: 'low'
                    }
                }
            }
        };
        const authoringDraft: NonNullable<FlowRunDynamicWorkflowRequest['authoringDraft']> = {
            version: 'flow.ai-authoring/v1',
            action: 'instantiate_pattern',
            reason: 'Use a tournament for alternative implementation plans.',
            pattern: {
                patternId: 'simple_tournament',
                parameters: {
                    competitorCount: 3,
                    criteria: 'Correctness, cost, and implementation risk.'
                },
                roleOverrides
            }
        };
        const service = createServiceWithFlow({
            workflows: [],
            runDynamicWorkflow: async request => {
                dynamicRequests.push(request);
                return run('run-dynamic', 'dynamic.generated', request.prompt);
            }
        });

        const result = await service.invokeRpc('webview-1', 'flow-run-dynamic-workflow', {
            message: 'Compare three implementation plans.',
            workspaceRootUri: 'file:///workspace',
            preferSaved: false,
            parameters: {
                budget: 'low'
            },
            roleOverrides,
            authoringDraft
        });

        expect(dynamicRequests).deep.equals([{
            prompt: 'Compare three implementation plans.',
            workspaceRootUri: 'file:///workspace',
            preferSaved: false,
            parameters: {
                budget: 'low'
            },
            roleOverrides,
            authoringDraft
        }]);
        expect(result).deep.include({
            run: run('run-dynamic', 'dynamic.generated', 'Compare three implementation plans.')
        });
    });
});

function createServiceWithFlow(options: {
    workflows: FlowWorkflow[];
    startRun?: (request: { workflowId: string; prompt: string }) => Promise<FlowRun>;
    runDynamicWorkflow?: (request: FlowRunDynamicWorkflowRequest) => Promise<FlowRun>;
}): CodexHostBackendServiceImpl {
    const service = new CodexHostBackendServiceImpl();
    const flow = {
        listWorkflows: async () => options.workflows,
        startRun: options.startRun || (async request => run('run-default', request.workflowId, request.prompt)),
        runDynamicWorkflow: options.runDynamicWorkflow || (async request => run('run-dynamic-default', 'dynamic.default', request.prompt))
    } satisfies Pick<FlowService, 'listWorkflows' | 'startRun' | 'runDynamicWorkflow'>;
    Object.defineProperty(service, 'flowService', { value: flow });
    return service;
}

function workflow(id: string, name: string): FlowWorkflow {
    return {
        version: 'flow.workflow/v1',
        id,
        name,
        states: {
            input: { type: 'input' }
        },
        transitions: []
    };
}

function run(id: string, workflowId: string, prompt: string): FlowRun {
    return {
        id,
        workflowId,
        prompt,
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

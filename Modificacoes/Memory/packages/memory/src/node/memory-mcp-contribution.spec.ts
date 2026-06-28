// *****************************************************************************
// Copyright (C) 2026.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { expect } from 'chai';
import { MEMORY_MCP_TOOLS } from './memory-mcp-contribution';
import { MemoryMcpContribution } from './memory-mcp-contribution';
import { MemoryService } from '../common';

type McpHandler = (args: Record<string, unknown>) => Promise<{ content: Array<{ type: 'text'; text: string }> }>;

function configureHandlers(service: object): Map<string, McpHandler> {
    const handlers = new Map<string, McpHandler>();
    const contribution = new MemoryMcpContribution();
    Object.defineProperty(contribution, 'memoryService', { value: service as unknown as MemoryService });
    contribution.configure({
        registerTool: (name: string, _config: object, handler: McpHandler) => {
            handlers.set(name, handler);
        }
    } as never);
    return handlers;
}

async function invokeMcp(handlers: Map<string, McpHandler>, name: string, args: Record<string, unknown>): Promise<unknown> {
    const result = await handlers.get(name)?.(args);
    return JSON.parse(result?.content[0].text ?? '{}');
}

describe('Memory MCP contribution', () => {
    it('exposes the minimal internal tool contract', () => {
        expect(MEMORY_MCP_TOOLS).to.deep.equal([
            'cybervinci.context.suggest',
            'cybervinci.context.buildPack',
            'cybervinci.context.explainRanking',
            'cybervinci.context.markAccepted',
            'cybervinci.context.markRejected',
            'cybervinci.search.graphFirst',
            'cybervinci.graph.findCallers',
            'cybervinci.graph.findCallees',
            'cybervinci.graph.findTests',
            'cybervinci.graph.path',
            'cybervinci.graph.explain',
            'cybervinci.graph.query',
            'cybervinci.graph.findGodNodes',
            'cybervinci.graph.findSurprisingConnections',
            'cybervinci.graph.findCommunities',
            'cybervinci.graph.detectChangeImpact',
            'cybervinci.graph.analyzePullRequest',
            'cybervinci.graph.analyzeConflicts',
            'cybervinci.graph.exportPortable',
            'cybervinci.graph.comparePortablePackage',
            'cybervinci.graph.installPortablePackage',
            'cybervinci.memory.search',
            'cybervinci.memory.searchIde',
            'cybervinci.memory.searchWorkspace',
            'cybervinci.memory.searchRepository',
            'cybervinci.memory.searchSession',
            'cybervinci.memory.searchTask',
            'cybervinci.memory.store',
            'cybervinci.memory.storeApproved',
            'cybervinci.memory.storeCandidate',
            'cybervinci.memory.consolidate',
            'cybervinci.memory.update',
            'cybervinci.memory.updateAccess',
            'cybervinci.memory.promoteToIde',
            'cybervinci.memory.demoteToWorkspace',
            'cybervinci.memory.runDecay',
            'cybervinci.memory.forget',
            'cybervinci.memory.health',
            'cybervinci.memory.stats',
            'cybervinci.memory.listSpaces',
            'cybervinci.memory.vectorStatus',
            'cybervinci.memory.vectorBackfill',
            'cybervinci.knowledge.search',
            'cybervinci.knowledge.inspect',
            'cybervinci.knowledge.export',
            'cybervinci.knowledge.create',
            'cybervinci.knowledge.add',
            'cybervinci.knowledge.link',
            'cybervinci.skills.find',
            'cybervinci.feedback.record',
            'cybervinci.feedback.resolve',
            'cybervinci.feedback.search',
            'cybervinci.transcript.startSession',
            'cybervinci.transcript.record',
            'cybervinci.transcript.search',
            'cybervinci.transcript.forget'
        ]);
    });

    it('records transcript messages with session and task association through MCP', async () => {
        const calls: unknown[] = [];
        const handlers = configureHandlers({
            recordTranscriptMessage: async (request: unknown) => {
                calls.push(request);
                return {
                    id: 'transcript-message-1',
                    blocked: false,
                    ...(request as object),
                    createdAt: '2026-05-20T12:01:00.000Z',
                    updatedAt: '2026-05-20T12:01:00.000Z'
                };
            }
        });

        const result = await invokeMcp(handlers, 'cybervinci.transcript.record', {
            workspacePath: '/workspace',
            transcriptSessionId: 'transcript-session-1',
            sessionId: 'chat-session-1',
            taskId: 'task-1',
            scope: 'task',
            origin: 'ai-chat',
            role: 'user',
            content: 'Use repository memory for this task.',
            retentionPolicy: 'task',
            metadata: {
                turn: 1,
                nested: { ignored: true }
            }
        });

        expect(calls).to.deep.equal([{
            workspacePath: '/workspace',
            transcriptSessionId: 'transcript-session-1',
            sessionId: 'chat-session-1',
            taskId: 'task-1',
            scope: 'task',
            origin: 'ai-chat',
            role: 'user',
            content: 'Use repository memory for this task.',
            retentionPolicy: 'task',
            metadata: {
                turn: 1
            }
        }]);
        expect(result).to.deep.include({
            id: 'transcript-message-1',
            blocked: false,
            sessionId: 'chat-session-1',
            taskId: 'task-1',
            role: 'user'
        });
    });

    it('starts transcript sessions with retention policy and minimal metadata', async () => {
        const calls: unknown[] = [];
        const handlers = configureHandlers({
            startTranscriptSession: async (request: unknown) => {
                calls.push(request);
                return {
                    id: 'transcript-session-1',
                    ...(request as object),
                    startedAt: '2026-05-20T12:00:00.000Z',
                    redactionStatus: 'clean',
                    createdAt: '2026-05-20T12:00:00.000Z',
                    updatedAt: '2026-05-20T12:00:00.000Z'
                };
            }
        });

        const result = await invokeMcp(handlers, 'cybervinci.transcript.startSession', {
            workspacePath: '/workspace',
            sessionId: 'chat-session-1',
            scope: 'session',
            origin: 'ai-chat',
            source: 'theia-chat',
            title: 'Planning session',
            retentionPolicy: 'ttl',
            metadata: {
                agentId: 'planner',
                turnCount: 0,
                searchable: false,
                nested: { ignored: true }
            }
        });

        expect(calls).to.deep.equal([{
            workspacePath: '/workspace',
            sessionId: 'chat-session-1',
            scope: 'session',
            origin: 'ai-chat',
            source: 'theia-chat',
            title: 'Planning session',
            retentionPolicy: 'ttl',
            metadata: {
                agentId: 'planner',
                turnCount: 0,
                searchable: false
            }
        }]);
        expect(result).to.deep.include({
            id: 'transcript-session-1',
            workspacePath: '/workspace',
            sessionId: 'chat-session-1',
            scope: 'session',
            retentionPolicy: 'ttl'
        });
    });

    it('searches transcripts through MCP with budget, scope filters, and explanation fields', async () => {
        const calls: unknown[] = [];
        const handlers = configureHandlers({
            searchTranscripts: async (request: unknown) => {
                calls.push(request);
                return [{
                    id: 'transcript-message-1',
                    transcriptSessionId: 'transcript-session-1',
                    workspacePath: '/workspace',
                    scope: 'task',
                    origin: 'ai-chat',
                    role: 'user',
                    snippet: 'Auth decision with redacted token abcdef********3456.',
                    score: 1,
                    estimatedTokens: 12,
                    createdAt: '2026-05-20T12:01:00.000Z',
                    updatedAt: '2026-05-20T12:01:00.000Z',
                    redactionStatus: 'blocked',
                    explanation: {
                        source: 'pi_transcript_messages',
                        scope: 'task',
                        evidence: 'pi_transcript_messages:transcript-session-1:user:2026-05-20T12:01:00.000Z',
                        matchedQuery: true,
                        tokenBudgetApplied: true,
                        redaction: 'blocked',
                        filters: {
                            workspacePath: '/workspace',
                            scopes: ['task'],
                            sessionId: 'chat-session-1',
                            taskId: 'task-1',
                            roles: ['user'],
                            origins: ['ai-chat']
                        },
                        ranking: {
                            textScore: 1,
                            recencyScore: 1,
                            finalScore: 1.15
                        }
                    }
                }];
            }
        });

        const result = await invokeMcp(handlers, 'cybervinci.transcript.search', {
            workspacePath: '/workspace',
            query: 'auth',
            tokenBudget: 128,
            scopes: ['task', 'invalid'],
            sessionId: 'chat-session-1',
            taskId: 'task-1',
            roles: ['user', 'invalid'],
            origins: ['ai-chat'],
            limit: 5
        });

        expect(calls).to.deep.equal([{
            workspacePath: '/workspace',
            query: 'auth',
            limit: 5,
            tokenBudget: 128,
            scopes: ['task'],
            transcriptSessionId: undefined,
            sessionId: 'chat-session-1',
            taskId: 'task-1',
            roles: ['user'],
            origins: ['ai-chat']
        }]);
        expect(result).to.be.an('array').with.length(1);
        expect((result as unknown[])[0]).to.deep.include({
            id: 'transcript-message-1',
            transcriptSessionId: 'transcript-session-1',
            redactionStatus: 'blocked'
        });
    });

    it('forgets transcripts through MCP with retention and scope filters', async () => {
        const calls: unknown[] = [];
        const handlers = configureHandlers({
            forgetTranscripts: async (request: unknown) => {
                calls.push(request);
                return {
                    workspacePath: '/workspace',
                    mode: 'expire',
                    removedMessages: 2,
                    removedSessions: 0,
                    expiredSessions: 1,
                    filters: request
                };
            }
        });

        const result = await invokeMcp(handlers, 'cybervinci.transcript.forget', {
            workspacePath: '/workspace',
            mode: 'expire',
            scopes: ['task', 'invalid'],
            transcriptSessionId: 'transcript-session-1',
            sessionId: 'chat-session-1',
            taskId: 'task-1',
            retentionPolicy: 'task'
        });

        expect(calls).to.deep.equal([{
            workspacePath: '/workspace',
            mode: 'expire',
            scopes: ['task'],
            transcriptSessionId: 'transcript-session-1',
            sessionId: 'chat-session-1',
            taskId: 'task-1',
            retentionPolicy: 'task'
        }]);
        expect(result).to.deep.include({
            workspacePath: '/workspace',
            mode: 'expire',
            removedMessages: 2,
            expiredSessions: 1
        });
    });

    it('searches repository memory with repository, status, stale, and token budget filters', async () => {
        const handlers = new Map<string, (args: Record<string, unknown>) => Promise<{ content: Array<{ type: 'text'; text: string }> }>>();
        const contribution = new MemoryMcpContribution();
        const service = {
            getDashboard: async () => ({
                memories: [
                    {
                        id: 'repo-active',
                        workspacePath: '/clone-a',
                        scope: 'repository',
                        repositoryUrl: 'https://github.com/acme/app.git',
                        repositoryId: 'acme/app',
                        memoryType: 'project_decision',
                        title: 'Repository auth decision',
                        content: 'Use the repository middleware for authentication.',
                        status: 'active',
                        staleStatus: 'fresh',
                        importance: 'high',
                        weight: 0.8,
                        lastAccessedAt: '2026-05-20T10:00:00.000Z',
                        accessCount: 0,
                        createdAt: '2026-05-20T10:00:00.000Z',
                        updatedAt: '2026-05-20T10:00:00.000Z',
                        acceptedCount: 0,
                        rejectedCount: 0
                    },
                    {
                        id: 'repo-stale',
                        workspacePath: '/clone-b',
                        scope: 'repository',
                        repositoryUrl: 'https://github.com/acme/app.git',
                        repositoryId: 'acme/app',
                        memoryType: 'project_decision',
                        title: 'Repository auth stale decision',
                        content: 'Old authentication decision.',
                        status: 'active',
                        staleStatus: 'stale',
                        importance: 'medium',
                        weight: 0.4,
                        lastAccessedAt: '2026-05-20T09:00:00.000Z',
                        accessCount: 0,
                        createdAt: '2026-05-20T09:00:00.000Z',
                        updatedAt: '2026-05-20T09:00:00.000Z',
                        acceptedCount: 0,
                        rejectedCount: 0
                    },
                    {
                        id: 'workspace-active',
                        workspacePath: '/clone-a',
                        scope: 'workspace',
                        memoryType: 'project_decision',
                        title: 'Workspace auth decision',
                        content: 'Workspace-only authentication note.',
                        status: 'active',
                        staleStatus: 'fresh',
                        importance: 'medium',
                        weight: 0.4,
                        lastAccessedAt: '2026-05-20T09:00:00.000Z',
                        accessCount: 0,
                        createdAt: '2026-05-20T09:00:00.000Z',
                        updatedAt: '2026-05-20T09:00:00.000Z',
                        acceptedCount: 0,
                        rejectedCount: 0
                    }
                ]
            })
        };
        Object.defineProperty(contribution, 'memoryService', { value: service as unknown as MemoryService });
        contribution.configure({
            registerTool: (name: string, _config: object, handler: (args: Record<string, unknown>) => Promise<{ content: Array<{ type: 'text'; text: string }> }>) => {
                handlers.set(name, handler);
            }
        } as never);

        const result = await handlers.get('cybervinci.memory.searchRepository')?.({
            workspacePath: '/clone-b',
            query: 'auth',
            repositoryUrl: 'https://github.com/acme/app.git',
            repositoryId: 'acme/app',
            status: 'active',
            staleStatus: 'fresh',
            tokenBudget: 30
        });
        const payload = JSON.parse(result?.content[0].text ?? '{}');

        expect(payload).to.deep.include({
            workspacePath: '/clone-b',
            scope: 'repository',
            repositoryUrl: 'https://github.com/acme/app.git',
            repositoryId: 'acme/app',
            status: 'active',
            staleStatus: 'fresh',
            tokenBudget: 30,
            count: 1,
            totalMatches: 1
        });
        expect(payload.estimatedTokens).to.be.at.most(30);
        expect(payload.memories.map((memory: { id: string }) => memory.id)).to.deep.equal(['repo-active']);
        expect(payload.memories[0]).to.include({
            staleStatus: 'fresh',
            status: 'active',
            estimatedTokens: payload.estimatedTokens
        });
    });

    it('keeps existing context tools compatible while forwarding token budget and source filters', async () => {
        const calls: unknown[] = [];
        const service = {
            suggestContext: async (request: unknown) => {
                calls.push({ method: 'suggestContext', request });
                return {
                    suggestions: [{
                        id: 'suggestion-1',
                        title: 'Auth context',
                        estimatedTokens: 12
                    }],
                    tokenBudget: (request as { tokenBudget?: number }).tokenBudget
                };
            },
            search: async (request: unknown) => {
                calls.push({ method: 'search', request });
                return [{
                    id: 'result-1',
                    sourceKind: 'project-memory',
                    title: 'Auth memory',
                    snippet: 'Use local auth middleware.',
                    score: 0.8,
                    estimatedTokens: 8
                }];
            },
            buildContextPack: async (request: unknown) => {
                calls.push({ method: 'buildContextPack', request });
                return {
                    workspacePath: (request as { workspacePath: string }).workspacePath,
                    tokenBudget: (request as { tokenBudget?: number }).tokenBudget,
                    items: (request as { retrievalResults: unknown[] }).retrievalResults,
                    estimatedTokens: 8
                };
            }
        };
        const handlers = configureHandlers(service);

        const suggestion = await invokeMcp(handlers, 'cybervinci.context.suggest', {
            workspacePath: '/workspace',
            prompt: 'auth',
            limit: 3,
            tokenBudget: 40,
            sourceKinds: ['project-memory', 'repository-memory', 'unsupported-source'],
            taskId: 'task_auth'
        });
        const pack = await invokeMcp(handlers, 'cybervinci.context.buildPack', {
            workspacePath: '/workspace',
            prompt: 'auth',
            limit: 2,
            tokenBudget: 20,
            sourceKinds: ['project-memory'],
            retrievalResults: [{
                id: 'provided-1',
                sourceKind: 'project-memory',
                title: 'Provided memory',
                snippet: 'Provided snippet.',
                score: 0.9,
                estimatedTokens: 7
            }, {
                id: 'invalid-source',
                sourceKind: 'unknown',
                title: 'Invalid',
                snippet: 'Invalid snippet.',
                score: 0.1
            }]
        });

        expect(suggestion).to.deep.include({ tokenBudget: 40 });
        expect(pack).to.deep.include({ workspacePath: '/workspace', tokenBudget: 20, estimatedTokens: 8 });
        expect(calls).to.deep.equal([{
            method: 'suggestContext',
            request: {
                workspacePath: '/workspace',
                prompt: 'auth',
                limit: 3,
                tokenBudget: 40,
                sourceKinds: ['project-memory', 'repository-memory'],
                taskId: 'task_auth'
            }
        }, {
            method: 'buildContextPack',
            request: {
                workspacePath: '/workspace',
                prompt: 'auth',
                retrievalResults: [{
                    id: 'provided-1',
                    sourceKind: 'project-memory',
                    title: 'Provided memory',
                    snippet: 'Provided snippet.',
                    score: 0.9,
                    estimatedTokens: 7
                }],
                tokenBudget: 20
            }
        }]);
    });

    it('rejects invalid required MCP parameters before calling backend services', async () => {
        let called = false;
        const handlers = configureHandlers({
            search: async () => {
                called = true;
                return [];
            }
        });

        let rejected: Error | undefined;
        try {
            await handlers.get('cybervinci.context.explainRanking')?.({
                workspacePath: '/workspace',
                prompt: 42
            });
        } catch (error) {
            rejected = error as Error;
        }

        expect(called).to.equal(false);
        expect(rejected?.message).to.contain('Missing required string argument: prompt');
    });

    it('searches task memory with task, expiration, status, and token budget filters', async () => {
        const handlers = new Map<string, (args: Record<string, unknown>) => Promise<{ content: Array<{ type: 'text'; text: string }> }>>();
        const contribution = new MemoryMcpContribution();
        const service = {
            getDashboard: async () => ({
                memories: [
                    {
                        id: 'task-active',
                        workspacePath: '/workspace',
                        scope: 'task',
                        taskId: 'task_alpha',
                        retentionPolicy: 'task',
                        expiresAt: '2999-01-01T00:00:00.000Z',
                        memoryType: 'project_decision',
                        title: 'Task auth decision',
                        content: 'Use the task middleware for authentication.',
                        status: 'active',
                        staleStatus: 'fresh',
                        importance: 'high',
                        weight: 0.8,
                        lastAccessedAt: '2026-05-20T10:00:00.000Z',
                        accessCount: 0,
                        createdAt: '2026-05-20T10:00:00.000Z',
                        updatedAt: '2026-05-20T10:00:00.000Z',
                        acceptedCount: 0,
                        rejectedCount: 0
                    },
                    {
                        id: 'task-expired',
                        workspacePath: '/workspace',
                        scope: 'task',
                        taskId: 'task_alpha',
                        retentionPolicy: 'task',
                        expiresAt: '2020-01-01T00:00:00.000Z',
                        memoryType: 'project_decision',
                        title: 'Expired task auth decision',
                        content: 'Expired authentication note.',
                        status: 'active',
                        staleStatus: 'fresh',
                        importance: 'medium',
                        weight: 0.7,
                        lastAccessedAt: '2026-05-20T09:00:00.000Z',
                        accessCount: 0,
                        createdAt: '2026-05-20T09:00:00.000Z',
                        updatedAt: '2026-05-20T09:00:00.000Z',
                        acceptedCount: 0,
                        rejectedCount: 0
                    },
                    {
                        id: 'task-candidate',
                        workspacePath: '/workspace',
                        scope: 'task',
                        taskId: 'task_alpha',
                        retentionPolicy: 'task',
                        expiresAt: '2999-01-01T00:00:00.000Z',
                        memoryType: 'project_decision',
                        title: 'Candidate task auth decision',
                        content: 'Candidate authentication note.',
                        status: 'candidate',
                        staleStatus: 'fresh',
                        importance: 'medium',
                        weight: 0.6,
                        lastAccessedAt: '2026-05-20T09:00:00.000Z',
                        accessCount: 0,
                        createdAt: '2026-05-20T09:00:00.000Z',
                        updatedAt: '2026-05-20T09:00:00.000Z',
                        acceptedCount: 0,
                        rejectedCount: 0
                    },
                    {
                        id: 'other-task',
                        workspacePath: '/workspace',
                        scope: 'task',
                        taskId: 'task_beta',
                        retentionPolicy: 'task',
                        expiresAt: '2999-01-01T00:00:00.000Z',
                        memoryType: 'project_decision',
                        title: 'Other task auth decision',
                        content: 'Other task authentication note.',
                        status: 'active',
                        staleStatus: 'fresh',
                        importance: 'medium',
                        weight: 0.7,
                        lastAccessedAt: '2026-05-20T09:00:00.000Z',
                        accessCount: 0,
                        createdAt: '2026-05-20T09:00:00.000Z',
                        updatedAt: '2026-05-20T09:00:00.000Z',
                        acceptedCount: 0,
                        rejectedCount: 0
                    }
                ]
            })
        };
        Object.defineProperty(contribution, 'memoryService', { value: service as unknown as MemoryService });
        contribution.configure({
            registerTool: (name: string, _config: object, handler: (args: Record<string, unknown>) => Promise<{ content: Array<{ type: 'text'; text: string }> }>) => {
                handlers.set(name, handler);
            }
        } as never);

        const result = await handlers.get('cybervinci.memory.searchTask')?.({
            workspacePath: '/workspace',
            query: 'auth',
            taskId: 'task_alpha',
            status: 'active',
            tokenBudget: 30
        });
        const payload = JSON.parse(result?.content[0].text ?? '{}');

        expect(payload).to.deep.include({
            workspacePath: '/workspace',
            scope: 'task',
            taskId: 'task_alpha',
            status: 'active',
            tokenBudget: 30,
            excludeExpired: true,
            count: 1,
            totalMatches: 1
        });
        expect(payload.estimatedTokens).to.be.at.most(30);
        expect(payload.memories.map((memory: { id: string }) => memory.id)).to.deep.equal(['task-active']);
        expect(payload.memories[0]).to.include({
            taskId: 'task_alpha',
            status: 'active',
            estimatedTokens: payload.estimatedTokens
        });
    });

    it('stores approved memories only with explicit approval or trusted manual origin', async () => {
        const handlers = new Map<string, (args: Record<string, unknown>) => Promise<{ content: Array<{ type: 'text'; text: string }> }>>();
        const stored: unknown[] = [];
        const contribution = new MemoryMcpContribution();
        const service = {
            addMemory: async (memory: unknown) => {
                stored.push(memory);
                return {
                    id: `mem-${stored.length}`,
                    status: 'active',
                    staleStatus: 'fresh',
                    importance: 'medium',
                    weight: 0.5,
                    lastAccessedAt: '2026-05-20T10:00:00.000Z',
                    accessCount: 0,
                    createdAt: '2026-05-20T10:00:00.000Z',
                    updatedAt: '2026-05-20T10:00:00.000Z',
                    acceptedCount: 0,
                    rejectedCount: 0,
                    ...(memory as object)
                };
            }
        };
        Object.defineProperty(contribution, 'memoryService', { value: service as unknown as MemoryService });
        contribution.configure({
            registerTool: (name: string, _config: object, handler: (args: Record<string, unknown>) => Promise<{ content: Array<{ type: 'text'; text: string }> }>) => {
                handlers.set(name, handler);
            }
        } as never);

        await handlers.get('cybervinci.memory.storeApproved')?.({
            workspacePath: '/workspace',
            title: 'Approved decision',
            content: 'Use explicit approval for active memory.',
            memoryType: 'project_decision',
            approvedByUser: true
        });
        await handlers.get('cybervinci.memory.storeApproved')?.({
            workspacePath: '/workspace',
            title: 'Manual note',
            content: 'User typed this note directly.',
            source: 'manual'
        });
        let rejected: Error | undefined;
        try {
            await handlers.get('cybervinci.memory.storeApproved')?.({
                workspacePath: '/workspace',
                title: 'Unreviewed extraction',
                content: 'Extracted notes must stay candidates.',
                memoryType: 'project_decision',
                source: 'agent-event'
            });
        } catch (error) {
            rejected = error as Error;
        }

        expect(stored).to.have.length(2);
        expect(stored[0]).to.deep.include({
            workspacePath: '/workspace',
            scope: 'workspace',
            memoryType: 'project_decision',
            source: undefined
        });
        expect(stored[1]).to.deep.include({
            workspacePath: '/workspace',
            scope: 'workspace',
            memoryType: 'manual_note',
            source: 'manual'
        });
        expect(rejected?.message).to.contain('requires approvedByUser=true');
    });

    it('creates review-required memory consolidation candidates through MCP', async () => {
        const handlers = new Map<string, (args: Record<string, unknown>) => Promise<{ content: Array<{ type: 'text'; text: string }> }>>();
        const requests: unknown[] = [];
        const contribution = new MemoryMcpContribution();
        const service = {
            proposeMemoryConsolidation: async (request: unknown) => {
                requests.push(request);
                return {
                    candidate: {
                        id: 'mem-consolidated',
                        workspacePath: '/workspace',
                        scope: 'workspace',
                        memoryType: 'project_decision',
                        title: 'Consolidated topic: auth',
                        content: 'Reviewed candidate for auth.',
                        status: 'candidate',
                        staleStatus: 'unknown',
                        importance: 'high',
                        weight: 0.9,
                        source: 'memory-consolidation',
                        evidence: 'review-required topic consolidation for "auth" from memories: mem-a, mem-b',
                        supersedes: ['mem-a', 'mem-b'],
                        createdAt: '2026-05-20T10:00:00.000Z',
                        updatedAt: '2026-05-20T10:00:00.000Z',
                        lastAccessedAt: '2026-05-20T10:00:00.000Z',
                        accessCount: 0,
                        acceptedCount: 0,
                        rejectedCount: 0
                    },
                    relatedMemoryIds: ['mem-a', 'mem-b'],
                    skippedSensitiveMemoryIds: [],
                    created: true,
                    deduplicated: false
                };
            }
        };
        Object.defineProperty(contribution, 'memoryService', { value: service as unknown as MemoryService });
        contribution.configure({
            registerTool: (name: string, _config: object, handler: (args: Record<string, unknown>) => Promise<{ content: Array<{ type: 'text'; text: string }> }>) => {
                handlers.set(name, handler);
            }
        } as never);

        const result = await handlers.get('cybervinci.memory.consolidate')?.({
            workspacePath: '/workspace',
            topic: 'auth',
            memoryIds: ['mem-a', 'mem-b'],
            maxMemories: 4
        });
        const payload = JSON.parse(result?.content[0].text ?? '{}');

        expect(requests).to.deep.equal([{
            workspacePath: '/workspace',
            topic: 'auth',
            memoryIds: ['mem-a', 'mem-b'],
            maxMemories: 4
        }]);
        expect(payload.candidate.status).to.equal('candidate');
        expect(payload.candidate.source).to.equal('memory-consolidation');
        expect(payload.candidate.supersedes).to.deep.equal(['mem-a', 'mem-b']);
        expect(payload.relatedMemoryIds).to.deep.equal(['mem-a', 'mem-b']);
    });

    it('lists persisted memory spaces with status and scope counters', async () => {
        const now = '2026-05-19T12:00:00.000Z';
        const handlers = new Map<string, (args: Record<string, unknown>) => Promise<{ content: Array<{ type: 'text'; text: string }> }>>();
        const contribution = new MemoryMcpContribution();
        const service = {
            getDashboard: async () => ({
                memories: [{
                    id: 'mem-active',
                    memorySpaceId: 'space-workspace',
                    workspacePath: '/workspace',
                    scope: 'workspace',
                    memoryType: 'project_decision',
                    title: 'Active memory',
                    content: 'Use persisted spaces.',
                    status: 'active',
                    staleStatus: 'fresh',
                    importance: 'high',
                    weight: 0.9,
                    lastAccessedAt: now,
                    accessCount: 1,
                    createdAt: now,
                    updatedAt: now,
                    acceptedCount: 0,
                    rejectedCount: 0
                }, {
                    id: 'mem-candidate',
                    memorySpaceId: 'space-workspace',
                    workspacePath: '/workspace',
                    scope: 'workspace',
                    memoryType: 'manual_note',
                    title: 'Candidate memory',
                    content: 'Review before activation.',
                    status: 'candidate',
                    staleStatus: 'stale',
                    importance: 'medium',
                    weight: 0.5,
                    lastAccessedAt: now,
                    accessCount: 0,
                    createdAt: now,
                    updatedAt: '2026-05-19T13:00:00.000Z',
                    acceptedCount: 0,
                    rejectedCount: 0
                }],
                memoryHealth: {}
            }),
            listMemorySpaces: async () => [{
                id: 'space-workspace',
                scope: 'workspace',
                workspacePath: '/workspace',
                metadata: { label: 'Workspace reviewed' },
                createdAt: now,
                updatedAt: now
            }]
        };
        Object.defineProperty(contribution, 'memoryService', { value: service as unknown as MemoryService });
        contribution.configure({
            registerTool: (name: string, _config: object, handler: (args: Record<string, unknown>) => Promise<{ content: Array<{ type: 'text'; text: string }> }>) => {
                handlers.set(name, handler);
            }
        } as never);

        const result = await handlers.get('cybervinci.memory.listSpaces')?.({ workspacePath: '/workspace' });
        const payload = JSON.parse(result?.content[0].text ?? '{}');

        expect(payload.totalSpaces).to.equal(1);
        expect(payload.byScope).to.deep.equal({ workspace: 1 });
        expect(payload.spaces).to.deep.include({
            id: 'space-workspace',
            name: 'Workspace reviewed',
            scope: 'workspace',
            workspacePath: '/workspace',
            metadata: { label: 'Workspace reviewed' },
            total: 2,
            byStatus: { active: 1, candidate: 1 },
            byScope: { workspace: 2 },
            active: 1,
            candidates: 1,
            stale: 1,
            createdAt: now,
            updatedAt: '2026-05-19T13:00:00.000Z'
        });
    });

    it('exposes memory promotion to IDE memory through MCP', async () => {
        const handlers = new Map<string, (args: Record<string, unknown>) => Promise<{ content: Array<{ type: 'text'; text: string }> }>>();
        const requests: unknown[] = [];
        const contribution = new MemoryMcpContribution();
        const service = {
            promoteMemoryToIde: async (request: unknown) => {
                requests.push(request);
                return {
                    id: 'mem-promote',
                    scope: 'global',
                    workspacePath: undefined,
                    memoryType: 'manual_note',
                    title: 'IDE preference',
                    content: 'Apply this everywhere.'
                };
            }
        };
        Object.defineProperty(contribution, 'memoryService', { value: service as unknown as MemoryService });
        contribution.configure({
            registerTool: (name: string, _config: object, handler: (args: Record<string, unknown>) => Promise<{ content: Array<{ type: 'text'; text: string }> }>) => {
                handlers.set(name, handler);
            }
        } as never);

        const result = await handlers.get('cybervinci.memory.promoteToIde')?.({
            workspacePath: '/workspace',
            id: 'mem-promote',
            reason: 'User wants this preference across workspaces.'
        });
        const payload = JSON.parse(result?.content[0].text ?? '{}');

        expect(requests).to.deep.equal([{
            workspacePath: '/workspace',
            id: 'mem-promote',
            reason: 'User wants this preference across workspaces.'
        }]);
        expect(payload.scope).to.equal('global');
        expect(payload.workspacePath).to.equal(undefined);
    });

    it('exposes memory demotion to workspace memory through MCP', async () => {
        const handlers = new Map<string, (args: Record<string, unknown>) => Promise<{ content: Array<{ type: 'text'; text: string }> }>>();
        const requests: unknown[] = [];
        const contribution = new MemoryMcpContribution();
        const service = {
            demoteMemoryToWorkspace: async (request: unknown) => {
                requests.push(request);
                return {
                    id: 'mem-demote',
                    scope: 'workspace',
                    workspacePath: '/workspace',
                    memoryType: 'manual_note',
                    title: 'Workspace preference',
                    content: 'Apply this here.',
                    evidence: 'manual review'
                };
            }
        };
        Object.defineProperty(contribution, 'memoryService', { value: service as unknown as MemoryService });
        contribution.configure({
            registerTool: (name: string, _config: object, handler: (args: Record<string, unknown>) => Promise<{ content: Array<{ type: 'text'; text: string }> }>) => {
                handlers.set(name, handler);
            }
        } as never);

        const result = await handlers.get('cybervinci.memory.demoteToWorkspace')?.({
            workspacePath: '/workspace',
            id: 'mem-demote',
            reason: 'Only applies to this project.'
        });
        const payload = JSON.parse(result?.content[0].text ?? '{}');

        expect(requests).to.deep.equal([{
            workspacePath: '/workspace',
            id: 'mem-demote',
            reason: 'Only applies to this project.'
        }]);
        expect(payload.scope).to.equal('workspace');
        expect(payload.workspacePath).to.equal('/workspace');
        expect(payload.evidence).to.equal('manual review');
    });

    it('explains ranking by item and source with weights, stale penalty, feedback, and scope reason', async () => {
        const handlers = new Map<string, (args: Record<string, unknown>) => Promise<{ content: Array<{ type: 'text'; text: string }> }>>();
        const contribution = new MemoryMcpContribution();
        const service = {
            search: async () => [{
                id: 'memory-ranking',
                sourceKind: 'project-memory',
                title: 'Ranking memory',
                snippet: 'Prefer explainable retrieval ranking.',
                score: 0.7,
                estimatedTokens: 9,
                evidence: 'pi_memory_items_fts:bm25',
                rankingSignals: {
                    bm25Score: 0.8,
                    vectorScore: 0.4,
                    graphScore: 0.2,
                    godNodeScore: 0.6,
                    communityScore: 0.4,
                    surprisingConnectionScore: 0.7,
                    riskScore: 0.5,
                    graphSignals: [
                        'god-node:RankingService:score=0.6',
                        'community:Ranking / Context score=0.4',
                        'surprising-connection:score=0.7',
                        'risk:src/ranking.ts:score=0.5'
                    ],
                    memoryWeight: 0.9,
                    recencyScore: 0.5,
                    acceptanceScore: 1,
                    scopeBoost: 0.75,
                    stalePenalty: 0.3,
                    staleStatus: 'possibly_stale',
                    importance: 'high',
                    weight: 0.9,
                    scope: 'workspace',
                    feedbackMultiplier: 0.45
                }
            }, {
                id: 'code-ranking',
                sourceKind: 'code',
                title: 'Ranking code',
                snippet: 'Ranking code path.',
                score: 0.2,
                estimatedTokens: 5,
                evidence: 'pi_code_chunks:match'
            }],
            searchFeedback: async () => [{
                id: 'feedback-rejected',
                workspacePath: '/workspace',
                targetKind: 'retrieval-result',
                targetId: 'memory-ranking',
                targetSourceKind: 'project-memory',
                feedback: 'rejected',
                reason: 'Wrong scope in previous answer',
                evidence: 'manual review',
                createdAt: '2026-05-20T10:00:00.000Z'
            }],
            getVectorStatus: async () => ({ enabled: true, provider: 'local-deterministic' })
        };
        Object.defineProperty(contribution, 'memoryService', { value: service as unknown as MemoryService });
        contribution.configure({
            registerTool: (name: string, _config: object, handler: (args: Record<string, unknown>) => Promise<{ content: Array<{ type: 'text'; text: string }> }>) => {
                handlers.set(name, handler);
            }
        } as never);

        const result = await handlers.get('cybervinci.context.explainRanking')?.({
            workspacePath: '/workspace',
            prompt: 'ranking',
            tokenBudget: 10,
            rankingWeights: {
                bm25Score: 0.5,
                stalePenalty: 0.8
            }
        });
        const payload = JSON.parse(result?.content[0].text ?? '{}');

        expect(payload.rankingWeights.bm25Score).to.equal(0.5);
        expect(payload.rankingWeights.stalePenalty).to.equal(0.8);
        expect(payload.sources).to.deep.include({
            sourceKind: 'project-memory',
            count: 1,
            averageScore: 0.7,
            maxScore: 0.7,
            estimatedTokens: 9,
            withinTokenBudget: 1,
            componentTotals: {
                bm25Score: 0.4,
                vectorScore: 0.1,
                graphScore: 0.03,
                memoryWeight: 0.09,
                recencyScore: 0.05,
                acceptanceScore: 0.05,
                scopeBoost: 0.0375,
                stalePenalty: -0.24
            }
        });
        expect(payload.results[0].scopeReason).to.equal('Matched workspace scope with scopeBoost=0.75.');
        expect(payload.results[0].feedbackApplied).to.deep.include({
            multiplier: 0.45,
            accepted: 0,
            rejected: 1,
            stale: 0,
            unresolved: 1
        });
        expect(payload.results[0].scoreExplanation.rawScore).to.equal(0.5175);
        expect(payload.results[0].rankingSignals).to.deep.include({
            graphScore: 0.2,
            godNodeScore: 0.6,
            communityScore: 0.4,
            surprisingConnectionScore: 0.7,
            riskScore: 0.5
        });
        expect(payload.results[0].rankingSignals.graphSignals).to.deep.equal([
            'god-node:RankingService:score=0.6',
            'community:Ranking / Context score=0.4',
            'surprising-connection:score=0.7',
            'risk:src/ranking.ts:score=0.5'
        ]);
        expect(payload.results[0].scoreExplanation.stalePenalty).to.deep.equal({
            name: 'stalePenalty',
            signal: 0.3,
            weight: 0.8,
            contribution: -0.24
        });
        expect(payload.results[1].scoreExplanation.fallback).to.equal(true);
        expect(payload.omittedByTokenBudget).to.equal(1);
    });

    it('exposes graph path, query, explain, god nodes, surprising connections, and communities through MCP', async () => {
        const dashboard = {
            files: [
                { id: 'file-a', relativePath: 'src/a.ts', fileName: 'a.ts', languageId: 'typescript', sizeBytes: 10, contentHash: 'a', isIgnored: false, isGenerated: false, isBinary: false, isSensitive: false },
                { id: 'file-b', relativePath: 'src/b.ts', fileName: 'b.ts', languageId: 'typescript', sizeBytes: 10, contentHash: 'b', isIgnored: false, isGenerated: false, isBinary: false, isSensitive: false },
                { id: 'file-c', relativePath: 'src/c.ts', fileName: 'c.ts', languageId: 'typescript', sizeBytes: 10, contentHash: 'c', isIgnored: false, isGenerated: false, isBinary: false, isSensitive: false }
            ],
            symbols: [
                { id: 'sym-a', fileId: 'file-a', languageId: 'typescript', symbolKind: 'class', name: 'A', fullName: 'A' },
                { id: 'sym-b', fileId: 'file-b', languageId: 'typescript', symbolKind: 'class', name: 'B', fullName: 'B' },
                { id: 'sym-c', fileId: 'file-c', languageId: 'typescript', symbolKind: 'class', name: 'C', fullName: 'C' }
            ],
            relations: [
                { id: 'rel-a-b', sourceKind: 'symbol', sourceId: 'sym-a', targetKind: 'symbol', targetId: 'sym-b', relationType: 'calls', confidenceLevel: 'extracted', confidenceScore: 0.9, evidence: 'A calls B with API_KEY=abcdefghijklmnopqrstuvwxyz123456.' },
                { id: 'rel-b-c', sourceKind: 'symbol', sourceId: 'sym-b', targetKind: 'symbol', targetId: 'sym-c', relationType: 'calls', confidenceLevel: 'extracted', confidenceScore: 0.8 },
                { id: 'rel-surprise', sourceKind: 'symbol', sourceId: 'sym-a', targetKind: 'symbol', targetId: 'sym-c', relationType: 'surprising_connection', confidenceLevel: 'inferred', confidenceScore: 0.7, evidence: 'Shared lifecycle terms.' }
            ],
            knowledgeGraphs: [{
                id: 'kg',
                workspacePath: '/workspace',
                scope: 'workspace',
                title: 'Knowledge',
                status: 'active',
                concepts: [
                    { id: 'concept-a', graphId: 'kg', kind: 'architecture', title: 'Architecture A', summary: 'A', status: 'active', sourceKind: 'code-graph', sourceId: 'sym-a', createdAt: '2026-05-20T10:00:00.000Z', updatedAt: '2026-05-20T10:00:00.000Z' },
                    { id: 'concept-c', graphId: 'kg', kind: 'architecture', title: 'Architecture C', summary: 'C', status: 'active', sourceKind: 'code-graph', sourceId: 'sym-c', createdAt: '2026-05-20T10:00:00.000Z', updatedAt: '2026-05-20T10:00:00.000Z' }
                ],
                links: [{ id: 'kg-surprise', graphId: 'kg', sourceConceptId: 'concept-a', targetConceptId: 'concept-c', linkKind: 'surprising_connection', status: 'candidate', confidenceScore: 0.77, evidence: 'Shared terms.', createdAt: '2026-05-20T10:00:00.000Z', updatedAt: '2026-05-20T10:00:00.000Z' }],
                createdAt: '2026-05-20T10:00:00.000Z',
                updatedAt: '2026-05-20T10:00:00.000Z'
            }]
        };
        const handlers = configureHandlers({ getDashboard: async () => dashboard });

        const path = await invokeMcp(handlers, 'cybervinci.graph.path', { workspacePath: '/workspace', from: { symbolName: 'A' }, to: { symbolName: 'C' }, relationTypes: ['calls'], maxDepth: 3, directed: true });
        const query = await invokeMcp(handlers, 'cybervinci.graph.query', { workspacePath: '/workspace', query: 'B', nodeKinds: ['symbol'] });
        const explain = await invokeMcp(handlers, 'cybervinci.graph.explain', { workspacePath: '/workspace', symbolName: 'A' });
        const godNodes = await invokeMcp(handlers, 'cybervinci.graph.findGodNodes', { workspacePath: '/workspace', minDegree: 1 });
        const surprising = await invokeMcp(handlers, 'cybervinci.graph.findSurprisingConnections', { workspacePath: '/workspace' });
        const communities = await invokeMcp(handlers, 'cybervinci.graph.findCommunities', { workspacePath: '/workspace', minCommunitySize: 2 });

        expect((path as { found: boolean }).found).to.equal(true);
        expect((path as { edges: Array<{ id: string }> }).edges.map(edge => edge.id)).to.deep.equal(['rel-a-b', 'rel-b-c']);
        expect(JSON.stringify(path)).not.to.contain('abcdefghijklmnopqrstuvwxyz123456');
        expect((query as { nodes: Array<{ id: string }> }).nodes.map(node => node.id)).to.deep.equal(['sym-b']);
        expect((explain as { fanOut: number }).fanOut).to.equal(2);
        expect((godNodes as { nodes: Array<{ id: string }> }).nodes.map(node => node.id)).to.include('sym-a');
        expect((godNodes as { nodes: Array<{ id: string; reasons: string[] }> }).nodes.find(node => node.id === 'sym-a')?.reasons).to.include.members(['degree:2', 'fan-out:2']);
        expect((surprising as { connections: Array<{ id: string }> }).connections.map(connection => connection.id)).to.include('kg-surprise');
        expect((surprising as { connections: Array<{ id: string }> }).connections.map(connection => connection.id)).to.include('rel-surprise');
        const graphCommunities = (communities as { communities: Array<{ nodeIds: string[]; relationSummaries: Array<{ relationType: string; count: number }>; mainRelations: Array<{ id: string }> }> }).communities;
        expect(graphCommunities).to.have.length.greaterThan(0);
        expect(graphCommunities[0].nodeIds).to.include.members(['sym-a', 'sym-b']);
        expect(graphCommunities[0].relationSummaries).to.deep.include({ relationType: 'calls', count: 2, confidenceScore: 0.85 });
        expect(graphCommunities[0].mainRelations.map(relation => relation.id)).to.include.members(['rel-a-b', 'rel-b-c']);
    });

    it('searches Memory graph before external grep fallbacks through MCP', async () => {
        const searchCalls: unknown[] = [];
        const gitImpactCalls: unknown[] = [];
        const dashboard = {
            files: [
                { id: 'file-auth', relativePath: 'src/auth.ts', fileName: 'auth.ts', languageId: 'typescript', sizeBytes: 10, contentHash: 'auth', isIgnored: false, isGenerated: false, isBinary: false, isSensitive: false }
            ],
            symbols: [
                { id: 'sym-auth', fileId: 'file-auth', languageId: 'typescript', symbolKind: 'class', name: 'AuthService', fullName: 'AuthService' }
            ],
            relations: [
                { id: 'rel-auth-file', sourceKind: 'file', sourceId: 'file-auth', targetKind: 'symbol', targetId: 'sym-auth', relationType: 'contains', confidenceLevel: 'extracted', confidenceScore: 1 }
            ],
            events: [],
            memories: [],
            changeImpacts: [],
            knowledgeGraphs: []
        };
        const handlers = configureHandlers({
            getDashboard: async () => dashboard,
            search: async (request: unknown) => {
                searchCalls.push(request);
                return [{
                    id: 'graph-auth-result',
                    sourceKind: 'code-graph',
                    title: 'AuthService',
                    snippet: 'AuthService owns login flow with API_KEY=abcdefghijklmnopqrstuvwxyz123456.',
                    score: 0.94,
                    uri: 'src/auth.ts',
                    evidence: 'code graph symbol',
                    estimatedTokens: 16
                }];
            },
            detectChangeImpactFromGitDiff: async (request: unknown) => {
                gitImpactCalls.push(request);
                return {
                    changeSet: {
                        workspacePath: '/workspace',
                        changedFilePaths: ['src/auth.ts'],
                        source: 'git-diff',
                        diagnostics: []
                    },
                    impacts: [],
                    summary: { totalChangedFiles: 1 }
                };
            }
        });

        const payload = await invokeMcp(handlers, 'cybervinci.search.graphFirst', {
            workspacePath: '/workspace',
            query: 'AuthService',
            tokenBudget: 80,
            detectGitChanges: true,
            includeUntracked: true
        }) as {
            strategy: string;
            graphReady: boolean;
            graph: { count: number };
            retrieval: { count: number; results: Array<{ sourceKind: string; snippet: string }> };
            recommendedNextStep: string;
            changeImpact: { changeSet: { source: string } };
        };

        expect(searchCalls).to.deep.equal([{
            workspacePath: '/workspace',
            text: 'AuthService',
            limit: 12,
            sourceKinds: ['code-graph', 'project-memory', 'repository-memory', 'task-memory', 'local-docs', 'skill', 'agent-event', 'feedback-record']
        }]);
        expect(gitImpactCalls).to.deep.equal([{
            workspacePath: '/workspace',
            baseRef: undefined,
            compareRef: undefined,
            includeUntracked: true,
            since: undefined,
            maxDepth: undefined
        }]);
        expect(payload.strategy).to.equal('graph-first');
        expect(payload.graphReady).to.equal(true);
        expect(payload.graph.count).to.equal(1);
        expect(payload.retrieval.count).to.equal(1);
        expect(payload.retrieval.results[0].sourceKind).to.equal('code-graph');
        expect(payload.retrieval.results[0].snippet).not.to.contain('abcdefghijklmnopqrstuvwxyz123456');
        expect(payload.changeImpact.changeSet.source).to.equal('git-diff');
        expect(payload.recommendedNextStep).to.equal('use-memory-results');
    });

    it('records context feedback without writing raw secrets to MCP audit events', async () => {
        const secret = 'API_KEY=abcdefghijklmnopqrstuvwxyz123456';
        const events: unknown[] = [];
        const handlers = configureHandlers({
            recordFeedback: async (request: unknown) => ({
                id: 'feedback-secret',
                ...(request as object)
            }),
            recordEvent: async (event: Record<string, unknown>) => {
                events.push(event);
                return {
                    id: 'event-secret',
                    createdAt: '2026-05-20T10:05:00.000Z',
                    ...event
                };
            }
        });

        const payload = await invokeMcp(handlers, 'cybervinci.context.markRejected', {
            workspacePath: '/workspace',
            targetId: 'result-secret',
            targetSourceKind: 'project-memory',
            reason: `Rejected because ${secret}.`,
            evidence: `Evidence also has ${secret}.`,
            metadata: {
                note: `Metadata has ${secret}.`,
                safe: true
            }
        });

        expect((payload as { record: { reason: string } }).record.reason).to.contain(secret);
        expect(events).to.have.length(1);
        expect(JSON.stringify(events)).not.to.contain(secret);
    });

    it('uses sanitized event fallback for feedback recording when feedback storage is unavailable', async () => {
        const secret = 'TOKEN=abcdefghijklmnopqrstuvwxyz123456';
        const events: unknown[] = [];
        const handlers = configureHandlers({
            recordEvent: async (event: Record<string, unknown>) => {
                events.push(event);
                return {
                    id: 'event-fallback',
                    createdAt: '2026-05-20T10:05:00.000Z',
                    ...event
                };
            }
        });

        const payload = await invokeMcp(handlers, 'cybervinci.feedback.record', {
            workspacePath: '/workspace',
            targetKind: 'memory',
            targetId: 'mem-secret',
            feedback: 'rejected',
            reason: `Rejected due to ${secret}.`,
            evidence: `Fallback evidence includes ${secret}.`,
            metadata: {
                source: `fallback ${secret}`
            }
        });

        expect((payload as { storedVia: string }).storedVia).to.equal('event');
        expect(events).to.have.length(1);
        expect(JSON.stringify(events)).not.to.contain(secret);
        expect(JSON.stringify(events)).to.contain('abcdef********3456');
    });

    it('resolves feedback through MCP and records a sanitized audit event', async () => {
        const handlers = new Map<string, (args: Record<string, unknown>) => Promise<{ content: Array<{ type: 'text'; text: string }> }>>();
        const contribution = new MemoryMcpContribution();
        const events: unknown[] = [];
        const service = {
            resolveFeedback: async (request: { workspacePath: string; id: string }) => ({
                id: request.id,
                workspacePath: request.workspacePath,
                targetKind: 'memory',
                targetId: 'mem-secret',
                targetSourceKind: 'project-memory',
                targetTitle: 'Secret-bearing memory title',
                feedback: 'rejected',
                reason: 'Do not include token sk-live-secret in prompts.',
                evidence: 'Sensitive evidence with token sk-live-secret.',
                createdAt: '2026-05-20T10:00:00.000Z',
                resolvedAt: '2026-05-20T10:05:00.000Z'
            }),
            recordEvent: async (event: Record<string, unknown>) => {
                events.push(event);
                return {
                    id: 'event_feedback_resolved',
                    workspacePath: '/workspace',
                    eventType: 'feedback.resolved',
                    createdAt: '2026-05-20T10:05:00.000Z',
                    ...event
                };
            }
        };
        Object.defineProperty(contribution, 'memoryService', { value: service as unknown as MemoryService });
        contribution.configure({
            registerTool: (name: string, _config: object, handler: (args: Record<string, unknown>) => Promise<{ content: Array<{ type: 'text'; text: string }> }>) => {
                handlers.set(name, handler);
            }
        } as never);

        const result = await handlers.get('cybervinci.feedback.resolve')?.({
            workspacePath: '/workspace',
            id: 'feedback_1'
        });
        const payload = JSON.parse(result?.content[0].text ?? '{}');

        expect(payload.resolved.id).to.equal('feedback_1');
        expect(payload.resolved.resolvedAt).to.equal('2026-05-20T10:05:00.000Z');
        expect(payload.audit.eventType).to.equal('feedback.resolved');
        expect(events).to.have.length(1);
        expect(events[0]).to.deep.equal({
            workspacePath: '/workspace',
            eventType: 'feedback.resolved',
            payload: JSON.stringify({
                feedbackId: 'feedback_1',
                resolved: true,
                targetKind: 'memory',
                targetId: 'mem-secret',
                targetSourceKind: 'project-memory',
                feedback: 'rejected',
                resolvedAt: '2026-05-20T10:05:00.000Z'
            })
        });
        expect(JSON.stringify(events)).not.to.contain('sk-live-secret');
        expect(JSON.stringify(events)).not.to.contain('Sensitive evidence');
    });

    it('exports portable packages through MCP with redaction and token budget limits', async () => {
        const secret = 'API_KEY=abcdefghijklmnopqrstuvwxyz123456';
        const handlers = configureHandlers({
            exportWorkspaceData: async () => ({
                version: 2,
                exportedAt: '2026-05-20T12:00:00.000Z',
                workspacePath: '/workspace',
                settings: {},
                files: [{ relativePath: 'src/index.ts' }],
                symbols: [],
                relations: [],
                codeChunks: [],
                graphSnapshots: [],
                changeImpacts: [],
                contextSuggestions: [],
                memories: [{
                    id: 'memory-secret',
                    scope: 'workspace',
                    workspacePath: '/workspace',
                    memoryType: 'manual_note',
                    title: 'Secret memory',
                    content: `Never export raw ${secret}.`,
                    status: 'active',
                    staleStatus: 'fresh',
                    weight: 1,
                    lastAccessedAt: '2026-05-20T12:00:00.000Z',
                    accessCount: 0,
                    createdAt: '2026-05-20T12:00:00.000Z',
                    updatedAt: '2026-05-20T12:00:00.000Z',
                    acceptedCount: 0,
                    rejectedCount: 0
                }],
                memorySpaces: [],
                knowledgeGraphs: [],
                skillCandidates: [],
                events: [],
                feedbackRecords: [],
                artifacts: [{
                    path: 'metadata.json',
                    mediaType: 'application/json',
                    content: `{"note":"${secret}"}`
                }, {
                    path: 'cybervinci-project-report.md',
                    mediaType: 'text/markdown',
                    content: 'A long report '.repeat(200)
                }]
            })
        });

        const payload = await invokeMcp(handlers, 'cybervinci.graph.exportPortable', {
            workspacePath: '/workspace',
            includeArtifactContents: true,
            includeBundle: true,
            tokenBudget: 40
        });

        const serialized = JSON.stringify(payload);
        expect(serialized).not.to.contain(secret);
        expect(serialized).to.contain('abcdef********3456');
        expect((payload as { bundle?: unknown }).bundle).to.equal(undefined);
        expect((payload as { omittedBundle?: { reason: string } }).omittedBundle?.reason).to.equal('bundle exceeds token budget');
        expect((payload as { artifacts: Array<{ path: string; content?: string }> }).artifacts.find(artifact => artifact.path === 'metadata.json')?.content).to.contain('abcdef********3456');
        expect((payload as { omittedArtifactContents: string[] }).omittedArtifactContents).to.include('cybervinci-project-report.md');
    });

    it('compares portable packages through MCP without importing memories', async () => {
        const secret = 'TOKEN=abcdefghijklmnopqrstuvwxyz123456';
        let imported = false;
        const handlers = configureHandlers({
            getDashboard: async () => ({
                memories: [{
                    id: 'local-duplicate',
                    scope: 'workspace',
                    title: 'Existing',
                    content: 'Already here.',
                    memoryType: 'manual_note',
                    status: 'active',
                    staleStatus: 'fresh',
                    weight: 1,
                    lastAccessedAt: '2026-05-20T12:00:00.000Z',
                    accessCount: 0,
                    createdAt: '2026-05-20T12:00:00.000Z',
                    updatedAt: '2026-05-20T12:00:00.000Z',
                    acceptedCount: 0,
                    rejectedCount: 0
                }, {
                    id: 'portable-id-conflict',
                    scope: 'workspace',
                    title: 'Local id conflict',
                    content: 'Local content wins.',
                    memoryType: 'manual_note',
                    status: 'active',
                    staleStatus: 'fresh',
                    weight: 1,
                    lastAccessedAt: '2026-05-20T12:00:00.000Z',
                    accessCount: 0,
                    createdAt: '2026-05-20T12:00:00.000Z',
                    updatedAt: '2026-05-20T12:00:00.000Z',
                    acceptedCount: 0,
                    rejectedCount: 0
                }, {
                    id: 'local-title-conflict',
                    scope: 'workspace',
                    title: 'Same title conflict',
                    content: 'Local title content wins.',
                    memoryType: 'manual_note',
                    status: 'active',
                    staleStatus: 'fresh',
                    weight: 1,
                    lastAccessedAt: '2026-05-20T12:00:00.000Z',
                    accessCount: 0,
                    createdAt: '2026-05-20T12:00:00.000Z',
                    updatedAt: '2026-05-20T12:00:00.000Z',
                    acceptedCount: 0,
                    rejectedCount: 0
                }],
                files: [],
                symbols: [],
                relations: []
            }),
            importWorkspaceData: async () => {
                imported = true;
            }
        });

        const payload = await invokeMcp(handlers, 'cybervinci.graph.comparePortablePackage', {
            workspacePath: '/workspace',
            packageJson: JSON.stringify({
                version: 2,
                exportedAt: '2026-05-20T12:00:00.000Z',
                workspacePath: '/workspace',
                memories: [{
                    id: 'portable-duplicate',
                    scope: 'workspace',
                    title: 'Existing',
                    content: 'Already here.'
                }, {
                    id: 'portable-new',
                    scope: 'workspace',
                    title: 'New',
                    content: 'Review me.'
                }, {
                    id: 'portable-id-conflict',
                    scope: 'workspace',
                    title: 'Local id conflict',
                    content: 'Portable content conflicts by id.'
                }, {
                    id: 'portable-title-conflict',
                    scope: 'workspace',
                    title: 'Same title conflict',
                    content: 'Portable content conflicts by scope and title.'
                }, {
                    id: 'portable-secret',
                    scope: 'workspace',
                    title: 'Secret',
                    content: `Contains ${secret}.`
                }]
            })
        });

        expect(imported).to.equal(false);
        expect(JSON.stringify(payload)).not.to.contain(secret);
        expect((payload as { totalMemoryDiff: number }).totalMemoryDiff).to.equal(5);
        expect((payload as { memoryDiff: Array<{ memoryId: string; classification: string; importable: boolean }> }).memoryDiff).to.deep.include({
            memoryId: 'portable-duplicate',
            title: 'Existing',
            scope: 'workspace',
            status: 'candidate',
            classification: 'duplicate',
            importable: false,
            existingMemoryId: 'local-duplicate',
            reason: 'A local memory with the same scope, title, and content already exists.'
        });
        expect((payload as { memoryDiff: Array<{ memoryId: string; classification: string; importable: boolean }> }).memoryDiff.find(entry => entry.memoryId === 'portable-new')).to.deep.include({
            classification: 'new',
            importable: true
        });
        expect((payload as { memoryDiff: Array<{ memoryId: string; classification: string; importable: boolean; existingMemoryId?: string }> }).memoryDiff.find(entry => entry.memoryId === 'portable-id-conflict')).to.deep.include({
            classification: 'conflicting',
            importable: false,
            existingMemoryId: 'portable-id-conflict'
        });
        expect((payload as { memoryDiff: Array<{ memoryId: string; classification: string; importable: boolean; existingMemoryId?: string }> }).memoryDiff.find(entry => entry.memoryId === 'portable-title-conflict')).to.deep.include({
            classification: 'conflicting',
            importable: false,
            existingMemoryId: 'local-title-conflict'
        });
        expect((payload as { memoryDiff: Array<{ memoryId: string; classification: string; importable: boolean }> }).memoryDiff.find(entry => entry.memoryId === 'portable-secret')).to.deep.include({
            classification: 'sensitive',
            importable: false
        });
    });

    it('installs portable packages through MCP only by forwarding explicit confirmation', async () => {
        const requests: unknown[] = [];
        const handlers = configureHandlers({
            installPortableMemory: async (request: unknown) => {
                requests.push(request);
                return {
                    workspacePath: '/workspace',
                    installPath: '/workspace/.cybervinci/memory',
                    artifactCount: 2,
                    files: ['cybervinci-memory-bundle.json', 'metadata.json']
                };
            }
        });

        const payload = await invokeMcp(handlers, 'cybervinci.graph.installPortablePackage', {
            workspacePath: '/workspace',
            includeGlobalMemories: false,
            includeEphemeralMemories: true,
            confirmed: true
        });

        expect(requests).to.deep.equal([{
            workspacePath: '/workspace',
            includeGlobalMemories: false,
            includeEphemeralMemories: true,
            confirmed: true
        }]);
        expect(payload).to.deep.include({
            workspacePath: '/workspace',
            artifactCount: 2
        });
    });
});

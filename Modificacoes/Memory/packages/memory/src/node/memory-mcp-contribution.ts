// *****************************************************************************
// Copyright (C) 2026.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { MCPBackendContribution } from '@theia/ai-mcp-server/lib/node/mcp-theia-server';
import { nls } from '@theia/core';
import { inject, injectable } from '@theia/core/shared/inversify';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { z } from 'zod';
import {
    MemoryDashboard,
    MemoryFeedbackKind,
    MemoryFeedbackRecord,
    MemoryFeedbackRequest,
    MemoryResolveFeedbackRequest,
    MemoryFeedbackSearchRequest,
    MemoryFeedbackTargetKind,
    MemoryExportBundle,
    MemoryGraph,
    MemoryGraphEdge,
    MemoryGraphNode,
    MemoryImportance,
    MemoryItem,
    MemorySpace,
    MemoryRelation,
    MemoryRankingWeights,
    MemoryService,
    MemoryScope,
    MemorySourceKind,
    GraphCommunityAnalyzer,
    GodNodeAnalyzer,
    GraphQueryService,
    RetrievalResult,
    SecretScanner,
    TokenBudgetService,
    DEFAULT_MEMORY_RANKING_WEIGHTS
} from '../common';

const SOURCE_KINDS = ['code', 'code-graph', 'local-docs', 'project-memory', 'repository-memory', 'task-memory', 'skill', 'agent-event', 'feedback-record'] as const;
const sourceKindSchema = z.enum(SOURCE_KINDS);
const GRAPH_FIRST_SOURCE_KINDS: MemorySourceKind[] = ['code-graph', 'project-memory', 'repository-memory', 'task-memory', 'local-docs', 'skill', 'agent-event', 'feedback-record'];
const GRAPH_FIRST_DEFAULT_LIMIT = 12;
const GRAPH_FIRST_DEFAULT_TOKEN_BUDGET = 1200;
const GRAPH_FIRST_MAX_SNIPPET_CHARS = 900;
const execFileAsync = promisify(execFile);
const MEMORY_SCOPES = ['global', 'workspace', 'repository', 'session', 'task'] as const;
const memoryScopeSchema = z.enum(MEMORY_SCOPES);
const MEMORY_TYPES = [
    'user_preference',
    'project_decision',
    'project_convention',
    'file_location',
    'architecture_note',
    'bug_history',
    'command_note',
    'testing_note',
    'security_note',
    'generated_skill_note',
    'manual_note'
] as const;
const memoryTypeSchema = z.enum(MEMORY_TYPES);
const MEMORY_STATUSES = ['active', 'candidate', 'archived', 'rejected', 'blocked'] as const;
const memoryStatusSchema = z.enum(MEMORY_STATUSES);
const STALE_STATUSES = ['fresh', 'possibly_stale', 'stale', 'unknown'] as const;
const staleStatusSchema = z.enum(STALE_STATUSES);
const MEMORY_IMPORTANCE = ['critical', 'high', 'medium', 'low'] as const;
const memoryImportanceSchema = z.enum(MEMORY_IMPORTANCE);
const MEMORY_RETENTION_POLICIES = ['session', 'task', 'ttl', 'manual', 'permanent'] as const;
const memoryRetentionPolicySchema = z.enum(MEMORY_RETENTION_POLICIES);
const FEEDBACK_TARGET_KINDS = ['retrieval-result', 'context-suggestion', 'memory', 'skill', 'event'] as const;
const feedbackTargetKindSchema = z.enum(FEEDBACK_TARGET_KINDS);
const FEEDBACK_KINDS = ['accepted', 'rejected', 'stale'] as const;
const feedbackKindSchema = z.enum(FEEDBACK_KINDS);
const TRANSCRIPT_ROLES = ['user', 'assistant', 'system', 'tool', 'agent'] as const;

interface RankingScoreComponent {
    name: string;
    signal: number;
    weight: number;
    contribution: number;
}

interface RankingScoreExplanation {
    finalScore: number;
    formula: string;
    fallback?: boolean;
    rawScore?: number;
    clampedScore?: number;
    components: RankingScoreComponent[];
    stalePenalty?: RankingScoreComponent;
}

export const MEMORY_MCP_TOOLS = [
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
] as const;

type MemoryMcpTool = typeof MEMORY_MCP_TOOLS[number];

interface RegisterToolServer {
    registerTool(
        name: MemoryMcpTool,
        config: object,
        handler: (args: Record<string, unknown>) => Promise<{ content: Array<{ type: 'text'; text: string }> }>
    ): void;
}

interface MemoryFeedbackMcpSearchRequest {
    workspacePath: string;
    query?: string;
    limit?: number;
}

interface OptionalMemoryFeedbackApi {
    recordFeedback?: (request: MemoryFeedbackRequest) => Promise<unknown>;
    resolveFeedback?: (request: MemoryResolveFeedbackRequest) => Promise<MemoryFeedbackRecord | undefined>;
    searchFeedback?: (request: MemoryFeedbackSearchRequest) => Promise<MemoryFeedbackRecord[]>;
    listFeedback?: (request: MemoryFeedbackSearchRequest) => Promise<MemoryFeedbackRecord[]>;
}

type MemoryKnowledgeExportFormat = 'json' | 'markdown' | 'dot';

interface MemoryKnowledgeSearchRequest {
    workspacePath: string;
    query?: string;
    limit?: number;
}

interface MemoryKnowledgeInspectRequest {
    workspacePath: string;
    id?: string;
    title?: string;
}

interface MemoryKnowledgeExportRequest {
    workspacePath: string;
    format: MemoryKnowledgeExportFormat;
    limit?: number;
}

interface MemoryKnowledgeWriteRequest {
    workspacePath: string;
    id?: string;
    title?: string;
    content?: string;
    kind?: string;
    sourceId?: string;
    targetId?: string;
    relationType?: string;
    confidenceScore?: number;
    evidence?: string;
    metadata?: Record<string, unknown>;
}

interface MemoryKnowledgeGraphResponse {
    title?: string;
    graph?: MemoryGraph;
    nodes?: MemoryGraphNode[];
    edges?: MemoryGraphEdge[];
}

interface OptionalMemoryKnowledgeApi {
    searchKnowledge?: (request: MemoryKnowledgeSearchRequest) => Promise<unknown>;
    inspectKnowledge?: (request: MemoryKnowledgeInspectRequest) => Promise<unknown>;
    exportKnowledge?: (request: MemoryKnowledgeExportRequest) => Promise<unknown>;
    getKnowledgeGraph?: (request: { workspacePath: string; limit?: number }) => Promise<MemoryGraph | MemoryKnowledgeGraphResponse>;
    createKnowledgeConcept?: (request: MemoryKnowledgeWriteRequest) => Promise<unknown>;
    addKnowledgeConcept?: (request: MemoryKnowledgeWriteRequest) => Promise<unknown>;
    linkKnowledgeConcepts?: (request: MemoryKnowledgeWriteRequest) => Promise<unknown>;
}

@injectable()
export class MemoryMcpContribution implements MCPBackendContribution {

    @inject(MemoryService)
    protected readonly memoryService: MemoryService;

    protected readonly secretScanner = new SecretScanner();
    protected readonly tokenBudgetService = new TokenBudgetService();

    configure(server: McpServer): void {
        const mcpServer = server as unknown as RegisterToolServer;

        mcpServer.registerTool('cybervinci.context.suggest', {
            title: nls.localize('theia/memory/mcp/contextSuggest/title', 'Suggest Memory context'),
            description: nls.localize(
                'theia/memory/mcp/contextSuggest/description',
                'Return Memory context suggestions for explicit user review. This tool does not send context to an AI provider.'
            ),
            inputSchema: {
                workspacePath: z.string(),
                prompt: z.string(),
                limit: z.number().optional(),
                tokenBudget: z.number().optional(),
                sourceKinds: z.array(sourceKindSchema).optional(),
                taskId: z.string().optional()
            }
        }, async args => this.result(await this.memoryService.suggestContext({
            workspacePath: this.requiredStringArg(args.workspacePath, 'workspacePath'),
            prompt: this.requiredStringArg(args.prompt, 'prompt'),
            limit: this.numberArg(args.limit),
            tokenBudget: this.numberArg(args.tokenBudget),
            sourceKinds: this.sourceKindsArg(args.sourceKinds),
            taskId: this.stringArg(args.taskId)
        })));

        mcpServer.registerTool('cybervinci.context.buildPack', {
            title: nls.localize('theia/memory/mcp/contextBuildPack/title', 'Build Memory context pack'),
            description: nls.localize(
                'theia/memory/mcp/contextBuildPack/description',
                'Build a compact context pack from local Memory retrieval results. This tool only returns the pack for explicit review.'
            ),
            inputSchema: {
                workspacePath: z.string(),
                prompt: z.string(),
                limit: z.number().optional(),
                tokenBudget: z.number().optional(),
                sourceKinds: z.array(sourceKindSchema).optional(),
                taskId: z.string().optional(),
                retrievalResults: z.array(z.object({
                    id: z.string(),
                    sourceKind: sourceKindSchema,
                    title: z.string(),
                    snippet: z.string(),
                    score: z.number(),
                    uri: z.string().optional(),
                    evidence: z.string().optional(),
                    estimatedTokens: z.number().optional()
                })).optional()
            }
        }, async args => {
            const workspacePath = this.requiredStringArg(args.workspacePath, 'workspacePath');
            const prompt = this.requiredStringArg(args.prompt, 'prompt');
            const retrievalResults = this.retrievalResultsArg(args.retrievalResults) ?? await this.memoryService.search({
                workspacePath,
                text: prompt,
                limit: this.numberArg(args.limit),
                sourceKinds: this.sourceKindsArg(args.sourceKinds),
                taskId: this.stringArg(args.taskId)
            });
            return this.result(await this.memoryService.buildContextPack({
                workspacePath,
                prompt,
                retrievalResults,
                tokenBudget: this.numberArg(args.tokenBudget)
            }));
        });

        mcpServer.registerTool('cybervinci.context.explainRanking', {
            title: nls.localize('theia/memory/mcp/contextExplainRanking/title', 'Explain Memory ranking'),
            description: nls.localize('theia/memory/mcp/contextExplainRanking/description', 'Explain local retrieval ranking, source mix, feedback records, and token estimates without sending context to an AI provider.'),
            inputSchema: {
                workspacePath: z.string(),
                prompt: z.string(),
                limit: z.number().optional(),
                tokenBudget: z.number().optional(),
                sourceKinds: z.array(sourceKindSchema).optional(),
                taskId: z.string().optional(),
                rankingWeights: z.object({
                    bm25Score: z.number().optional(),
                    vectorScore: z.number().optional(),
                    graphScore: z.number().optional(),
                    memoryWeight: z.number().optional(),
                    recencyScore: z.number().optional(),
                    acceptanceScore: z.number().optional(),
                    scopeBoost: z.number().optional(),
                    stalePenalty: z.number().optional()
                }).optional()
            }
        }, async args => this.result(await this.explainRanking({
            workspacePath: this.requiredStringArg(args.workspacePath, 'workspacePath'),
            prompt: this.requiredStringArg(args.prompt, 'prompt'),
            limit: this.numberArg(args.limit),
            tokenBudget: this.numberArg(args.tokenBudget),
            sourceKinds: this.sourceKindsArg(args.sourceKinds),
            taskId: this.stringArg(args.taskId),
            rankingWeights: this.rankingWeightsArg(args.rankingWeights)
        })));

        mcpServer.registerTool('cybervinci.context.markAccepted', {
            title: nls.localize('theia/memory/mcp/contextMarkAccepted/title', 'Mark Memory context accepted'),
            description: nls.localize('theia/memory/mcp/contextMarkAccepted/description', 'Record explicit local acceptance feedback for a Memory context suggestion or retrieval result.'),
            inputSchema: this.contextFeedbackSchema('accepted')
        }, async args => this.result(await this.markContextFeedback(args, 'accepted')));

        mcpServer.registerTool('cybervinci.context.markRejected', {
            title: nls.localize('theia/memory/mcp/contextMarkRejected/title', 'Mark Memory context rejected'),
            description: nls.localize('theia/memory/mcp/contextMarkRejected/description', 'Record explicit local rejection feedback for a Memory context suggestion or retrieval result.'),
            inputSchema: this.contextFeedbackSchema('rejected')
        }, async args => this.result(await this.markContextFeedback(args, 'rejected')));

        mcpServer.registerTool('cybervinci.search.graphFirst', {
            title: nls.localize('theia/memory/mcp/searchGraphFirst/title', 'Search Memory graph first'),
            description: nls.localize(
                'theia/memory/mcp/searchGraphFirst/description',
                'Search the local Memory code graph and learned memory before falling back to ast-grep or rg. Returns compact graph-first evidence and a recommended next step.'
            ),
            inputSchema: this.graphFirstSearchSchema()
        }, async args => this.result(await this.graphFirstSearch(args)));

        mcpServer.registerTool('cybervinci.graph.findCallers', {
            title: nls.localize('theia/memory/mcp/graphFindCallers/title', 'Find callers'),
            description: nls.localize('theia/memory/mcp/graphFindCallers/description', 'Find graph nodes that call the requested file or symbol.'),
            inputSchema: this.graphQuerySchema()
        }, async args => this.result(await this.memoryService.getCallers(this.graphQueryArgs(args))));

        mcpServer.registerTool('cybervinci.graph.findCallees', {
            title: nls.localize('theia/memory/mcp/graphFindCallees/title', 'Find callees'),
            description: nls.localize('theia/memory/mcp/graphFindCallees/description', 'Find graph nodes called by the requested file or symbol.'),
            inputSchema: this.graphQuerySchema()
        }, async args => this.result(await this.memoryService.getCallees(this.graphQueryArgs(args))));

        mcpServer.registerTool('cybervinci.graph.findTests', {
            title: nls.localize('theia/memory/mcp/graphFindTests/title', 'Find related tests'),
            description: nls.localize('theia/memory/mcp/graphFindTests/description', 'Find tests inferred for the requested file or symbol.'),
            inputSchema: this.graphQuerySchema()
        }, async args => this.result(await this.memoryService.getTests(this.graphQueryArgs(args))));

        mcpServer.registerTool('cybervinci.graph.path', {
            title: nls.localize('theia/memory/mcp/graphPath/title', 'Find graph path'),
            description: nls.localize('theia/memory/mcp/graphPath/description', 'Find a bounded local code graph path between two files, symbols, or node ids.'),
            inputSchema: this.graphPathSchema()
        }, async args => this.result(await this.graphPath(args)));

        mcpServer.registerTool('cybervinci.graph.explain', {
            title: nls.localize('theia/memory/mcp/graphExplain/title', 'Explain graph node'),
            description: nls.localize('theia/memory/mcp/graphExplain/description', 'Explain local graph evidence, neighborhood, centrality, communities, and god-node signals for a file, symbol, or node id.'),
            inputSchema: this.graphQuerySchema()
        }, async args => this.result(await this.graphExplain(this.graphQueryArgs(args))));

        mcpServer.registerTool('cybervinci.graph.query', {
            title: nls.localize('theia/memory/mcp/graphQuery/title', 'Query graph'),
            description: nls.localize('theia/memory/mcp/graphQuery/description', 'Query local graph nodes and relations with optional text, node kind, relation type, and neighborhood expansion.'),
            inputSchema: this.graphSearchSchema()
        }, async args => this.result(await this.graphSearch(args)));

        mcpServer.registerTool('cybervinci.graph.findGodNodes', {
            title: nls.localize('theia/memory/mcp/graphFindGodNodes/title', 'Find god nodes'),
            description: nls.localize('theia/memory/mcp/graphFindGodNodes/description', 'Find high-degree or critical-path graph nodes using local code graph structure.'),
            inputSchema: this.graphGodNodesSchema()
        }, async args => this.result(await this.graphGodNodes(args)));

        mcpServer.registerTool('cybervinci.graph.findSurprisingConnections', {
            title: nls.localize('theia/memory/mcp/graphFindSurprisingConnections/title', 'Find surprising connections'),
            description: nls.localize('theia/memory/mcp/graphFindSurprisingConnections/description', 'Find reviewed or candidate surprising knowledge/code graph connections without exposing raw source content.'),
            inputSchema: this.graphSearchSchema()
        }, async args => this.result(await this.graphSurprisingConnections(args)));

        mcpServer.registerTool('cybervinci.graph.findCommunities', {
            title: nls.localize('theia/memory/mcp/graphFindCommunities/title', 'Find graph communities'),
            description: nls.localize('theia/memory/mcp/graphFindCommunities/description', 'Detect local graph communities with deterministic label propagation and explain central nodes and relation summaries.'),
            inputSchema: this.graphCommunitiesSchema()
        }, async args => this.result(await this.graphCommunities(args)));

        mcpServer.registerTool('cybervinci.graph.detectChangeImpact', {
            title: nls.localize('theia/memory/mcp/graphDetectChangeImpact/title', 'Detect change impact'),
            description: nls.localize('theia/memory/mcp/graphDetectChangeImpact/description', 'Analyze local Memory graph data for changed files.'),
            inputSchema: {
                workspacePath: z.string(),
                changedFilePaths: z.array(z.string()),
                maxDepth: z.number().optional()
            }
        }, async args => {
            const workspacePath = this.requiredStringArg(args.workspacePath, 'workspacePath');
            const dashboard = await this.memoryService.getDashboard(workspacePath);
            return this.result(await this.memoryService.analyzeBlastRadius({
                changedFilePaths: this.requiredStringArrayArg(args.changedFilePaths, 'changedFilePaths'),
                files: dashboard.files,
                symbols: dashboard.symbols,
                relations: dashboard.relations,
                events: dashboard.events,
                maxDepth: this.numberArg(args.maxDepth)
            }));
        });

        mcpServer.registerTool('cybervinci.graph.analyzePullRequest', {
            title: nls.localize('theia/memory/mcp/graphAnalyzePullRequest/title', 'Analyze pull request graph'),
            description: nls.localize('theia/memory/mcp/graphAnalyzePullRequest/description', 'Analyze changed files against local graph communities, risk, tests, memories, and recommended context for explicit review.'),
            inputSchema: {
                workspacePath: z.string(),
                changedFilePaths: z.array(z.string()),
                maxDepth: z.number().optional(),
                contextLimit: z.number().optional()
            }
        }, async args => {
            const workspacePath = this.requiredStringArg(args.workspacePath, 'workspacePath');
            const dashboard = await this.memoryService.getDashboard(workspacePath);
            return this.result(await this.memoryService.analyzePullRequestGraph({
                changedFilePaths: this.requiredStringArrayArg(args.changedFilePaths, 'changedFilePaths'),
                files: dashboard.files,
                symbols: dashboard.symbols,
                relations: dashboard.relations,
                events: dashboard.events,
                memories: dashboard.memories,
                maxDepth: this.numberArg(args.maxDepth),
                contextLimit: this.numberArg(args.contextLimit)
            }));
        });

        mcpServer.registerTool('cybervinci.graph.analyzeConflicts', {
            title: nls.localize('theia/memory/mcp/graphAnalyzeConflicts/title', 'Analyze conflict impact'),
            description: nls.localize('theia/memory/mcp/graphAnalyzeConflicts/description', 'Analyze conflicting files against graph relations, memories, documentation links, and risk areas for explicit review.'),
            inputSchema: {
                workspacePath: z.string(),
                conflictingFilePaths: z.array(z.string()),
                maxDepth: z.number().optional(),
                contextLimit: z.number().optional()
            }
        }, async args => {
            const workspacePath = this.requiredStringArg(args.workspacePath, 'workspacePath');
            const dashboard = await this.memoryService.getDashboard(workspacePath);
            return this.result(await this.memoryService.analyzeConflicts({
                conflictingFilePaths: this.requiredStringArrayArg(args.conflictingFilePaths, 'conflictingFilePaths'),
                changedFilePaths: this.requiredStringArrayArg(args.conflictingFilePaths, 'conflictingFilePaths'),
                files: dashboard.files,
                symbols: dashboard.symbols,
                relations: dashboard.relations,
                events: dashboard.events,
                memories: dashboard.memories,
                maxDepth: this.numberArg(args.maxDepth),
                contextLimit: this.numberArg(args.contextLimit)
            }));
        });

        mcpServer.registerTool('cybervinci.graph.exportPortable', {
            title: nls.localize('theia/memory/mcp/graphExportPortable/title', 'Export portable Memory package'),
            description: nls.localize(
                'theia/memory/mcp/graphExportPortable/description',
                'Build a redacted portable Memory package preview. Heavy bundle or artifact contents are returned only when explicitly requested and within the token budget.'
            ),
            inputSchema: {
                workspacePath: z.string(),
                includeGlobalMemories: z.boolean().optional(),
                includeEphemeralMemories: z.boolean().optional(),
                includeBundle: z.boolean().optional(),
                includeArtifactContents: z.boolean().optional(),
                tokenBudget: z.number().optional()
            }
        }, async args => this.result(await this.exportPortablePackage({
            workspacePath: this.requiredStringArg(args.workspacePath, 'workspacePath'),
            includeGlobalMemories: this.booleanArg(args.includeGlobalMemories),
            includeEphemeralMemories: this.booleanArg(args.includeEphemeralMemories),
            includeBundle: this.booleanArg(args.includeBundle),
            includeArtifactContents: this.booleanArg(args.includeArtifactContents),
            tokenBudget: this.numberArg(args.tokenBudget)
        })));

        mcpServer.registerTool('cybervinci.graph.comparePortablePackage', {
            title: nls.localize('theia/memory/mcp/graphComparePortablePackage/title', 'Compare portable Memory package'),
            description: nls.localize(
                'theia/memory/mcp/graphComparePortablePackage/description',
                'Compare a supplied portable Memory package with the current workspace without importing or activating memories.'
            ),
            inputSchema: {
                workspacePath: z.string(),
                packageJson: z.string().optional(),
                package: z.record(z.string(), z.unknown()).optional(),
                tokenBudget: z.number().optional(),
                limit: z.number().optional()
            }
        }, async args => this.result(await this.comparePortablePackage({
            workspacePath: this.requiredStringArg(args.workspacePath, 'workspacePath'),
            packageJson: this.stringArg(args.packageJson),
            packageValue: this.objectValue(args.package),
            tokenBudget: this.numberArg(args.tokenBudget),
            limit: this.numberArg(args.limit)
        })));

        mcpServer.registerTool('cybervinci.graph.installPortablePackage', {
            title: nls.localize('theia/memory/mcp/graphInstallPortablePackage/title', 'Install portable Memory package'),
            description: nls.localize(
                'theia/memory/mcp/graphInstallPortablePackage/description',
                'Install the redacted portable Memory package into .cybervinci/memory after explicit user confirmation.'
            ),
            inputSchema: {
                workspacePath: z.string(),
                includeGlobalMemories: z.boolean().optional(),
                includeEphemeralMemories: z.boolean().optional(),
                confirmed: z.boolean()
            }
        }, async args => this.result(await this.memoryService.installPortableMemory({
            workspacePath: this.requiredStringArg(args.workspacePath, 'workspacePath'),
            includeGlobalMemories: this.booleanArg(args.includeGlobalMemories),
            includeEphemeralMemories: this.booleanArg(args.includeEphemeralMemories),
            confirmed: this.booleanArg(args.confirmed) === true
        })));

        mcpServer.registerTool('cybervinci.memory.search', {
            title: nls.localize('theia/memory/mcp/memorySearch/title', 'Search Memory memory'),
            description: nls.localize('theia/memory/mcp/memorySearch/description', 'Search local Memory memories.'),
            inputSchema: {
                workspacePath: z.string(),
                query: z.string(),
                limit: z.number().optional()
            }
        }, async args => this.result(await this.memoryService.search({
            workspacePath: this.requiredStringArg(args.workspacePath, 'workspacePath'),
            text: this.requiredStringArg(args.query, 'query'),
            limit: this.numberArg(args.limit),
            sourceKinds: ['project-memory']
        })));

        mcpServer.registerTool('cybervinci.memory.searchIde', {
            title: nls.localize('theia/memory/mcp/memorySearchIde/title', 'Search IDE memory'),
            description: nls.localize('theia/memory/mcp/memorySearchIde/description', 'Search global Memory memories that apply across workspaces.'),
            inputSchema: this.memorySearchSchema()
        }, async args => this.result(await this.searchMemoryScope(this.memorySearchArgs(args), 'global')));

        mcpServer.registerTool('cybervinci.memory.searchWorkspace', {
            title: nls.localize('theia/memory/mcp/memorySearchWorkspace/title', 'Search workspace memory'),
            description: nls.localize('theia/memory/mcp/memorySearchWorkspace/description', 'Search Memory memories scoped to the current workspace.'),
            inputSchema: this.memorySearchSchema()
        }, async args => this.result(await this.searchMemoryScope(this.memorySearchArgs(args), 'workspace')));

        mcpServer.registerTool('cybervinci.memory.searchRepository', {
            title: nls.localize('theia/memory/mcp/memorySearchRepository/title', 'Search repository memory'),
            description: nls.localize('theia/memory/mcp/memorySearchRepository/description', 'Search Memory memories scoped to a repository identity.'),
            inputSchema: this.memorySearchSchema({
                repositoryUrl: z.string().optional(),
                repositoryId: z.string().optional(),
                status: memoryStatusSchema.optional(),
                staleStatus: staleStatusSchema.optional(),
                tokenBudget: z.number().optional()
            })
        }, async args => this.result(await this.searchMemoryScope(this.memorySearchArgs(args), 'repository')));

        mcpServer.registerTool('cybervinci.memory.searchSession', {
            title: nls.localize('theia/memory/mcp/memorySearchSession/title', 'Search session memory'),
            description: nls.localize('theia/memory/mcp/memorySearchSession/description', 'Search Memory memories scoped to the current session.'),
            inputSchema: this.memorySearchSchema()
        }, async args => this.result(await this.searchMemoryScope(this.memorySearchArgs(args), 'session')));

        mcpServer.registerTool('cybervinci.memory.searchTask', {
            title: nls.localize('theia/memory/mcp/memorySearchTask/title', 'Search task memory'),
            description: nls.localize('theia/memory/mcp/memorySearchTask/description', 'Search non-expired Memory memories scoped to a task.'),
            inputSchema: this.memorySearchSchema({
                taskId: z.string().optional(),
                includeExpired: z.boolean().optional(),
                status: memoryStatusSchema.optional(),
                tokenBudget: z.number().optional()
            })
        }, async args => this.result(await this.searchMemoryScope({
            ...this.memorySearchArgs(args),
            excludeExpired: !this.booleanArg(args.includeExpired)
        }, 'task')));

        mcpServer.registerTool('cybervinci.memory.store', {
            title: nls.localize('theia/memory/mcp/memoryStore/title', 'Store Memory memory'),
            description: nls.localize('theia/memory/mcp/memoryStore/description', 'Store an explicitly approved local Memory memory.'),
            inputSchema: this.memoryStoreSchema()
        }, async args => this.result(await this.memoryService.addMemory(this.memoryStoreArgs(args))));

        mcpServer.registerTool('cybervinci.memory.storeApproved', {
            title: nls.localize('theia/memory/mcp/memoryStoreApproved/title', 'Store approved Memory memory'),
            description: nls.localize(
                'theia/memory/mcp/memoryStoreApproved/description',
                'Store an active Memory memory only when the call declares explicit user approval or a trusted manual origin.'
            ),
            inputSchema: this.memoryStoreApprovedSchema()
        }, async args => this.result(await this.memoryService.addMemory(this.memoryStoreApprovedArgs(args))));

        mcpServer.registerTool('cybervinci.memory.storeCandidate', {
            title: nls.localize('theia/memory/mcp/memoryStoreCandidate/title', 'Store Memory memory candidate'),
            description: nls.localize('theia/memory/mcp/memoryStoreCandidate/description', 'Extract and store candidate memories for later user approval. Candidates are not active memory.'),
            inputSchema: {
                workspacePath: z.string(),
                text: z.string(),
                source: z.string().optional(),
                evidence: z.string().optional(),
                eventId: z.string().optional(),
                relativePath: z.string().optional(),
                maxCandidates: z.number().optional()
            }
        }, async args => this.result(await this.memoryService.proposeMemoryCandidate({
            workspacePath: this.requiredStringArg(args.workspacePath, 'workspacePath'),
            text: this.requiredStringArg(args.text, 'text'),
            source: this.stringArg(args.source),
            evidence: this.stringArg(args.evidence),
            eventId: this.stringArg(args.eventId),
            relativePath: this.stringArg(args.relativePath),
            maxCandidates: this.numberArg(args.maxCandidates)
        })));

        mcpServer.registerTool('cybervinci.memory.consolidate', {
            title: nls.localize('theia/memory/mcp/memoryConsolidate/title', 'Consolidate Memory memories'),
            description: nls.localize(
                'theia/memory/mcp/memoryConsolidate/description',
                'Create a review-required candidate memory for a topic and list active memories it may supersede. Source memories are not superseded until the candidate is explicitly approved.'
            ),
            inputSchema: {
                workspacePath: z.string(),
                topic: z.string(),
                memoryIds: z.array(z.string()).optional(),
                maxMemories: z.number().optional()
            }
        }, async args => this.result(await this.memoryService.proposeMemoryConsolidation({
            workspacePath: this.requiredStringArg(args.workspacePath, 'workspacePath'),
            topic: this.requiredStringArg(args.topic, 'topic'),
            memoryIds: this.stringArrayArg(args.memoryIds),
            maxMemories: this.numberArg(args.maxMemories)
        })));

        mcpServer.registerTool('cybervinci.memory.update', {
            title: nls.localize('theia/memory/mcp/memoryUpdate/title', 'Update Memory memory'),
            description: nls.localize('theia/memory/mcp/memoryUpdate/description', 'Update local Memory memory metadata, content, status, or lifecycle fields.'),
            inputSchema: this.memoryUpdateSchema()
        }, async args => this.result(await this.memoryService.updateMemory(this.memoryUpdateArgs(args))));

        mcpServer.registerTool('cybervinci.memory.updateAccess', {
            title: nls.localize('theia/memory/mcp/memoryUpdateAccess/title', 'Update Memory memory access'),
            description: nls.localize('theia/memory/mcp/memoryUpdateAccess/description', 'Record explicit use of a local Memory memory, incrementing access count, last accessed time, and weight.'),
            inputSchema: {
                workspacePath: z.string(),
                id: z.string()
            }
        }, async args => this.result(await this.memoryService.updateMemoryAccess({
            workspacePath: this.requiredStringArg(args.workspacePath, 'workspacePath'),
            id: this.requiredStringArg(args.id, 'id')
        })));

        mcpServer.registerTool('cybervinci.memory.promoteToIde', {
            title: nls.localize('theia/memory/mcp/memoryPromoteToIde/title', 'Promote memory to IDE memory'),
            description: nls.localize('theia/memory/mcp/memoryPromoteToIde/description', 'Promote a Project, Repository, Session, or Task memory to IDE/global memory, removing workspace and temporary locators and recording a local audit event.'),
            inputSchema: {
                workspacePath: z.string(),
                id: z.string(),
                reason: z.string().optional()
            }
        }, async args => this.result(await this.memoryService.promoteMemoryToIde({
            workspacePath: this.requiredStringArg(args.workspacePath, 'workspacePath'),
            id: this.requiredStringArg(args.id, 'id'),
            reason: this.stringArg(args.reason)
        })));

        mcpServer.registerTool('cybervinci.memory.demoteToWorkspace', {
            title: nls.localize('theia/memory/mcp/memoryDemoteToWorkspace/title', 'Demote IDE memory to workspace memory'),
            description: nls.localize('theia/memory/mcp/memoryDemoteToWorkspace/description', 'Demote an IDE/global memory to Project/workspace memory for the current workspace, preserving evidence and recording a local audit event.'),
            inputSchema: {
                workspacePath: z.string(),
                id: z.string(),
                reason: z.string().optional()
            }
        }, async args => this.result(await this.memoryService.demoteMemoryToWorkspace({
            workspacePath: this.requiredStringArg(args.workspacePath, 'workspacePath'),
            id: this.requiredStringArg(args.id, 'id'),
            reason: this.stringArg(args.reason)
        })));

        mcpServer.registerTool('cybervinci.memory.runDecay', {
            title: nls.localize('theia/memory/mcp/memoryRunDecay/title', 'Run Memory memory decay'),
            description: nls.localize('theia/memory/mcp/memoryRunDecay/description', 'Run the local memory lifecycle decay job for memories visible to a workspace. It reduces stale, rarely used memory weights and returns review-required pruning proposals without deleting memory content.'),
            inputSchema: {
                workspacePath: z.string(),
                now: z.string().optional(),
                dryRun: z.boolean().optional()
            }
        }, async args => this.result(await this.memoryService.runMemoryDecay({
            workspacePath: this.requiredStringArg(args.workspacePath, 'workspacePath'),
            now: this.stringArg(args.now),
            dryRun: this.booleanArg(args.dryRun)
        })));

        mcpServer.registerTool('cybervinci.memory.forget', {
            title: nls.localize('theia/memory/mcp/memoryForget/title', 'Forget Memory memory'),
            description: nls.localize('theia/memory/mcp/memoryForget/description', 'Remove a local Memory memory, its local vector, and derived knowledge links.'),
            inputSchema: {
                workspacePath: z.string(),
                id: z.string()
            }
        }, async args => this.result({
            forgotten: await this.memoryService.forgetMemory({
                workspacePath: this.requiredStringArg(args.workspacePath, 'workspacePath'),
                id: this.requiredStringArg(args.id, 'id')
            })
        }));

        mcpServer.registerTool('cybervinci.memory.health', {
            title: nls.localize('theia/memory/mcp/memoryHealth/title', 'Memory memory health'),
            description: nls.localize('theia/memory/mcp/memoryHealth/description', 'Return local memory health counters and lifecycle signals.'),
            inputSchema: {
                workspacePath: z.string()
            }
        }, async args => {
            const dashboard = await this.memoryService.getDashboard(this.requiredStringArg(args.workspacePath, 'workspacePath'));
            return this.result(dashboard.memoryHealth);
        });

        mcpServer.registerTool('cybervinci.memory.stats', {
            title: nls.localize('theia/memory/mcp/memoryStats/title', 'Memory memory stats'),
            description: nls.localize('theia/memory/mcp/memoryStats/description', 'Return local memory counts by scope, status, type, lifecycle, feedback, and vector state.'),
            inputSchema: {
                workspacePath: z.string()
            }
        }, async args => this.result(await this.memoryStats(this.requiredStringArg(args.workspacePath, 'workspacePath'))));

        mcpServer.registerTool('cybervinci.memory.listSpaces', {
            title: nls.localize('theia/memory/mcp/memoryListSpaces/title', 'List Memory memory spaces'),
            description: nls.localize('theia/memory/mcp/memoryListSpaces/description', 'List local memory spaces and counts visible to the current workspace.'),
            inputSchema: {
                workspacePath: z.string()
            }
        }, async args => this.result(await this.memorySpaces(this.requiredStringArg(args.workspacePath, 'workspacePath'))));

        mcpServer.registerTool('cybervinci.memory.vectorStatus', {
            title: nls.localize('theia/memory/mcp/memoryVectorStatus/title', 'Memory vector status'),
            description: nls.localize('theia/memory/mcp/memoryVectorStatus/description', 'Return local opt-in vector memory status. Vector search is disabled unless explicitly enabled with user consent.'),
            inputSchema: {
                workspacePath: z.string()
            }
        }, async args => this.result(await this.memoryService.getVectorStatus(this.requiredStringArg(args.workspacePath, 'workspacePath'))));

        mcpServer.registerTool('cybervinci.memory.vectorBackfill', {
            title: nls.localize('theia/memory/mcp/memoryVectorBackfill/title', 'Backfill Memory memory vectors'),
            description: nls.localize('theia/memory/mcp/memoryVectorBackfill/description', 'Backfill local deterministic memory vectors only when vector search has been explicitly enabled with user consent.'),
            inputSchema: {
                workspacePath: z.string()
            }
        }, async args => this.result(await this.memoryService.backfillMemoryVectors(this.requiredStringArg(args.workspacePath, 'workspacePath'))));

        mcpServer.registerTool('cybervinci.knowledge.search', {
            title: nls.localize('theia/memory/mcp/knowledgeSearch/title', 'Search Memory knowledge'),
            description: nls.localize('theia/memory/mcp/knowledgeSearch/description', 'Search local knowledge concepts and memory-backed graph data.'),
            inputSchema: {
                workspacePath: z.string(),
                query: z.string().optional(),
                limit: z.number().optional()
            }
        }, async args => this.result(await this.searchKnowledge({
            workspacePath: this.requiredStringArg(args.workspacePath, 'workspacePath'),
            query: this.stringArg(args.query),
            limit: this.numberArg(args.limit)
        })));

        mcpServer.registerTool('cybervinci.knowledge.inspect', {
            title: nls.localize('theia/memory/mcp/knowledgeInspect/title', 'Inspect Memory knowledge'),
            description: nls.localize('theia/memory/mcp/knowledgeInspect/description', 'Inspect a local knowledge concept and its graph links.'),
            inputSchema: {
                workspacePath: z.string(),
                id: z.string().optional(),
                title: z.string().optional()
            }
        }, async args => this.result(await this.inspectKnowledge({
            workspacePath: this.requiredStringArg(args.workspacePath, 'workspacePath'),
            id: this.stringArg(args.id),
            title: this.stringArg(args.title)
        })));

        mcpServer.registerTool('cybervinci.knowledge.export', {
            title: nls.localize('theia/memory/mcp/knowledgeExport/title', 'Export Memory knowledge'),
            description: nls.localize('theia/memory/mcp/knowledgeExport/description', 'Export local knowledge graph data as JSON, Markdown, or Graphviz DOT.'),
            inputSchema: {
                workspacePath: z.string(),
                format: z.enum(['json', 'markdown', 'dot']).optional(),
                limit: z.number().optional()
            }
        }, async args => this.result(await this.exportKnowledge({
            workspacePath: this.requiredStringArg(args.workspacePath, 'workspacePath'),
            format: this.knowledgeExportFormatArg(args.format),
            limit: this.numberArg(args.limit)
        })));

        mcpServer.registerTool('cybervinci.knowledge.create', {
            title: nls.localize('theia/memory/mcp/knowledgeCreate/title', 'Create Memory knowledge'),
            description: nls.localize('theia/memory/mcp/knowledgeCreate/description', 'Create a knowledge concept when the backend exposes a writable knowledge API.'),
            inputSchema: this.knowledgeWriteSchema()
        }, async args => this.result(await this.writeKnowledge('createKnowledgeConcept', this.knowledgeWriteArgs(args))));

        mcpServer.registerTool('cybervinci.knowledge.add', {
            title: nls.localize('theia/memory/mcp/knowledgeAdd/title', 'Add Memory knowledge'),
            description: nls.localize('theia/memory/mcp/knowledgeAdd/description', 'Add evidence or content to a knowledge concept when the backend exposes a writable knowledge API.'),
            inputSchema: this.knowledgeWriteSchema()
        }, async args => this.result(await this.writeKnowledge('addKnowledgeConcept', this.knowledgeWriteArgs(args))));

        mcpServer.registerTool('cybervinci.knowledge.link', {
            title: nls.localize('theia/memory/mcp/knowledgeLink/title', 'Link Memory knowledge'),
            description: nls.localize('theia/memory/mcp/knowledgeLink/description', 'Link two knowledge concepts when the backend exposes a writable knowledge API.'),
            inputSchema: this.knowledgeWriteSchema()
        }, async args => this.result(await this.writeKnowledge('linkKnowledgeConcepts', this.knowledgeWriteArgs(args))));

        mcpServer.registerTool('cybervinci.skills.find', {
            title: nls.localize('theia/memory/mcp/skillsFind/title', 'Find Memory skills'),
            description: nls.localize('theia/memory/mcp/skillsFind/description', 'Find local Memory skill candidates for explicit user review.'),
            inputSchema: {
                workspacePath: z.string(),
                query: z.string(),
                limit: z.number().optional()
            }
        }, async args => this.result(await this.memoryService.search({
            workspacePath: this.requiredStringArg(args.workspacePath, 'workspacePath'),
            text: this.requiredStringArg(args.query, 'query'),
            limit: this.numberArg(args.limit),
            sourceKinds: ['skill']
        })));

        mcpServer.registerTool('cybervinci.feedback.record', {
            title: nls.localize('theia/memory/mcp/feedbackRecord/title', 'Record Memory feedback'),
            description: nls.localize('theia/memory/mcp/feedbackRecord/description', 'Record explicit local feedback about Memory context, memory, skill, or graph suggestions.'),
            inputSchema: {
                workspacePath: z.string(),
                promptSignature: z.string().optional(),
                targetKind: feedbackTargetKindSchema.optional(),
                targetId: z.string(),
                targetSourceKind: sourceKindSchema.optional(),
                targetUri: z.string().optional(),
                targetTitle: z.string().optional(),
                feedback: feedbackKindSchema,
                reason: z.string().optional(),
                evidence: z.string().optional(),
                metadata: z.unknown().optional()
            }
        }, async args => this.result(await this.recordFeedback({
            workspacePath: this.requiredStringArg(args.workspacePath, 'workspacePath'),
            promptSignature: this.stringArg(args.promptSignature),
            targetKind: this.feedbackTargetKindArg(args.targetKind) ?? 'retrieval-result',
            targetId: this.requiredStringArg(args.targetId, 'targetId'),
            targetSourceKind: this.sourceKindArg(args.targetSourceKind),
            targetUri: this.stringArg(args.targetUri),
            targetTitle: this.stringArg(args.targetTitle),
            feedback: this.feedbackKindArg(args.feedback) ?? 'rejected',
            reason: this.stringArg(args.reason),
            evidence: this.stringArg(args.evidence),
            metadata: this.metadataArg(args.metadata)
        })));

        mcpServer.registerTool('cybervinci.feedback.resolve', {
            title: nls.localize('theia/memory/mcp/feedbackResolve/title', 'Resolve Memory feedback'),
            description: nls.localize('theia/memory/mcp/feedbackResolve/description', 'Resolve an explicit local Memory feedback record using the internal feedback resolution contract and record a sanitized local audit event.'),
            inputSchema: {
                workspacePath: z.string(),
                id: z.string()
            }
        }, async args => this.result(await this.resolveFeedback({
            workspacePath: this.requiredStringArg(args.workspacePath, 'workspacePath'),
            id: this.requiredStringArg(args.id, 'id')
        })));

        mcpServer.registerTool('cybervinci.feedback.search', {
            title: nls.localize('theia/memory/mcp/feedbackSearch/title', 'Search Memory feedback'),
            description: nls.localize('theia/memory/mcp/feedbackSearch/description', 'Search explicit local Memory feedback records when the backend exposes feedback storage, with event fallback.'),
            inputSchema: {
                workspacePath: z.string(),
                query: z.string().optional(),
                limit: z.number().optional()
            }
        }, async args => this.result(await this.searchFeedback({
            workspacePath: this.requiredStringArg(args.workspacePath, 'workspacePath'),
            query: this.stringArg(args.query),
            limit: this.numberArg(args.limit)
        })));

        mcpServer.registerTool('cybervinci.transcript.startSession', {
            title: nls.localize('theia/memory/mcp/transcriptStartSession/title', 'Start Memory transcript session'),
            description: nls.localize(
                'theia/memory/mcp/transcriptStartSession/description',
                'Open a local transcript session with explicit retention policy and minimal redacted metadata. This does not enable transcript retrieval or remote upload.'
            ),
            inputSchema: {
                workspacePath: z.string(),
                sessionId: z.string().optional(),
                scope: memoryScopeSchema.optional(),
                origin: z.string().optional(),
                source: z.string().optional(),
                title: z.string().optional(),
                retentionPolicy: memoryRetentionPolicySchema.optional(),
                metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.undefined()])).optional()
            }
        }, async args => this.result(await this.memoryService.startTranscriptSession({
            workspacePath: this.requiredStringArg(args.workspacePath, 'workspacePath'),
            sessionId: this.stringArg(args.sessionId),
            scope: this.memoryScopeArg(args.scope) ?? 'workspace',
            origin: this.stringArg(args.origin),
            source: this.stringArg(args.source),
            title: this.stringArg(args.title),
            retentionPolicy: this.memoryRetentionPolicyArg(args.retentionPolicy),
            metadata: this.stringNumberBooleanMetadataArg(args.metadata)
        })));

        mcpServer.registerTool('cybervinci.transcript.record', {
            title: nls.localize('theia/memory/mcp/transcriptRecord/title', 'Record Memory transcript message'),
            description: nls.localize(
                'theia/memory/mcp/transcriptRecord/description',
                'Record a local redacted transcript message. Secrets are blocked from raw storage; sessionId and taskId are associated when provided.'
            ),
            inputSchema: {
                workspacePath: z.string(),
                transcriptSessionId: z.string().optional(),
                sessionId: z.string().optional(),
                taskId: z.string().optional(),
                scope: memoryScopeSchema.optional(),
                origin: z.string().optional(),
                role: z.enum(['user', 'assistant', 'system', 'tool', 'agent']),
                content: z.string(),
                retentionPolicy: memoryRetentionPolicySchema.optional(),
                metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.undefined()])).optional()
            }
        }, async args => this.result(await this.memoryService.recordTranscriptMessage({
            workspacePath: this.requiredStringArg(args.workspacePath, 'workspacePath'),
            transcriptSessionId: this.stringArg(args.transcriptSessionId),
            sessionId: this.stringArg(args.sessionId),
            taskId: this.stringArg(args.taskId),
            scope: this.memoryScopeArg(args.scope),
            origin: this.stringArg(args.origin),
            role: this.transcriptRoleArg(args.role),
            content: this.requiredStringArg(args.content, 'content'),
            retentionPolicy: this.memoryRetentionPolicyArg(args.retentionPolicy),
            metadata: this.stringNumberBooleanMetadataArg(args.metadata)
        })));

        mcpServer.registerTool('cybervinci.transcript.search', {
            title: nls.localize('theia/memory/mcp/transcriptSearch/title', 'Search Memory transcripts'),
            description: nls.localize(
                'theia/memory/mcp/transcriptSearch/description',
                'Search opt-in local transcript storage with scope filters, token budget trimming, guaranteed redaction, and per-result explanations.'
            ),
            inputSchema: {
                workspacePath: z.string(),
                query: z.string().optional(),
                limit: z.number().optional(),
                tokenBudget: z.number().optional(),
                scopes: z.array(memoryScopeSchema).optional(),
                transcriptSessionId: z.string().optional(),
                sessionId: z.string().optional(),
                taskId: z.string().optional(),
                roles: z.array(z.enum(['user', 'assistant', 'system', 'tool', 'agent'])).optional(),
                origins: z.array(z.string()).optional()
            }
        }, async args => this.result(await this.memoryService.searchTranscripts({
            workspacePath: this.requiredStringArg(args.workspacePath, 'workspacePath'),
            query: this.stringArg(args.query),
            limit: this.numberArg(args.limit),
            tokenBudget: this.numberArg(args.tokenBudget),
            scopes: this.memoryScopesArg(args.scopes),
            transcriptSessionId: this.stringArg(args.transcriptSessionId),
            sessionId: this.stringArg(args.sessionId),
            taskId: this.stringArg(args.taskId),
            roles: this.transcriptRolesArg(args.roles),
            origins: this.stringArrayArg(args.origins)
        })));

        mcpServer.registerTool('cybervinci.transcript.forget', {
            title: nls.localize('theia/memory/mcp/transcriptForget/title', 'Forget Memory transcripts'),
            description: nls.localize(
                'theia/memory/mcp/transcriptForget/description',
                'Delete or expire local transcript records by transcript session, chat session, task, workspace scope, or retention policy. Audit output contains counts and filters only.'
            ),
            inputSchema: {
                workspacePath: z.string(),
                mode: z.enum(['delete', 'expire']).optional(),
                scopes: z.array(memoryScopeSchema).optional(),
                transcriptSessionId: z.string().optional(),
                sessionId: z.string().optional(),
                taskId: z.string().optional(),
                retentionPolicy: memoryRetentionPolicySchema.optional()
            }
        }, async args => this.result(await this.memoryService.forgetTranscripts({
            workspacePath: this.requiredStringArg(args.workspacePath, 'workspacePath'),
            mode: args.mode === 'expire' ? 'expire' : 'delete',
            scopes: this.memoryScopesArg(args.scopes),
            transcriptSessionId: this.stringArg(args.transcriptSessionId),
            sessionId: this.stringArg(args.sessionId),
            taskId: this.stringArg(args.taskId),
            retentionPolicy: this.memoryRetentionPolicyArg(args.retentionPolicy)
        })));
    }

    protected graphQuerySchema(): object {
        return {
            workspacePath: z.string(),
            nodeId: z.string().optional(),
            filePath: z.string().optional(),
            symbolName: z.string().optional(),
            depth: z.number().optional()
        };
    }

    protected graphQueryArgs(args: Record<string, unknown>): {
        workspacePath: string;
        nodeId?: string;
        filePath?: string;
        symbolName?: string;
        depth?: number;
    } {
        return {
            workspacePath: this.requiredStringArg(args.workspacePath, 'workspacePath'),
            nodeId: this.stringArg(args.nodeId),
            filePath: this.stringArg(args.filePath),
            symbolName: this.stringArg(args.symbolName),
            depth: this.numberArg(args.depth)
        };
    }

    protected graphPathSchema(): object {
        const endpoint = z.object({
            nodeId: z.string().optional(),
            filePath: z.string().optional(),
            symbolName: z.string().optional()
        });
        return {
            workspacePath: z.string(),
            from: endpoint,
            to: endpoint,
            maxDepth: z.number().optional(),
            directed: z.boolean().optional(),
            relationTypes: z.array(z.string()).optional()
        };
    }

    protected graphSearchSchema(): object {
        return {
            workspacePath: z.string(),
            query: z.string().optional(),
            nodeId: z.string().optional(),
            filePath: z.string().optional(),
            symbolName: z.string().optional(),
            nodeKinds: z.array(z.string()).optional(),
            relationTypes: z.array(z.string()).optional(),
            depth: z.number().optional(),
            limit: z.number().optional()
        };
    }

    protected graphFirstSearchSchema(): object {
        return {
            workspacePath: z.string(),
            query: z.string(),
            limit: z.number().optional(),
            tokenBudget: z.number().optional(),
            sourceKinds: z.array(sourceKindSchema).optional(),
            includeIndexedCode: z.boolean().optional(),
            nodeKinds: z.array(z.string()).optional(),
            relationTypes: z.array(z.string()).optional(),
            depth: z.number().optional(),
            changedFilePaths: z.array(z.string()).optional(),
            detectGitChanges: z.boolean().optional(),
            includeUntracked: z.boolean().optional(),
            baseRef: z.string().optional(),
            compareRef: z.string().optional(),
            since: z.string().optional(),
            maxDepth: z.number().optional(),
            astGrepPattern: z.string().optional(),
            astGrepLanguage: z.string().optional(),
            astGrepLimit: z.number().optional(),
            runAstGrep: z.boolean().optional()
        };
    }

    protected graphGodNodesSchema(): object {
        return {
            workspacePath: z.string(),
            minDegree: z.number().optional(),
            minCriticalPathCount: z.number().optional(),
            maxCriticalPathDepth: z.number().optional(),
            limit: z.number().optional()
        };
    }

    protected graphCommunitiesSchema(): object {
        return {
            workspacePath: z.string(),
            minCommunitySize: z.number().optional(),
            maxCommunities: z.number().optional(),
            maxIterations: z.number().optional()
        };
    }

    protected async graphPath(args: Record<string, unknown>): Promise<unknown> {
        const workspacePath = this.requiredStringArg(args.workspacePath, 'workspacePath');
        const dashboard = await this.memoryService.getDashboard(workspacePath);
        const from = this.objectValue(args.from) ?? {};
        const to = this.objectValue(args.to) ?? {};
        const fromId = this.resolveGraphNodeId(dashboard, from);
        const toId = this.resolveGraphNodeId(dashboard, to);
        const maxDepth = Math.max(1, Math.min(8, this.numberArg(args.maxDepth) ?? 4));
        const relationTypes = new Set(this.stringArrayArg(args.relationTypes));
        if (!fromId || !toId) {
            return {
                workspacePath,
                found: false,
                reason: !fromId ? 'from endpoint not found' : 'to endpoint not found',
                from,
                to
            };
        }
        const path = this.shortestGraphPath(dashboard.relations, fromId, toId, maxDepth, args.directed === true, relationTypes);
        return {
            workspacePath,
            found: Boolean(path),
            from: this.graphNodeDetails(dashboard, fromId),
            to: this.graphNodeDetails(dashboard, toId),
            maxDepth,
            directed: args.directed === true,
            relationTypes: [...relationTypes],
            nodes: path?.nodeIds.map(id => this.graphNodeDetails(dashboard, id)) ?? [],
            edges: path?.edgeIds.map(id => dashboard.relations.find(relation => relation.id === id)).filter((relation): relation is MemoryRelation => !!relation).map(relation => this.relationEdge(relation)) ?? [],
            explanation: path ? [
                `Shortest bounded path found with ${path.edgeIds.length} relation(s).`,
                `Search depth limit was ${maxDepth}.`
            ] : [`No path found within depth ${maxDepth}.`]
        };
    }

    protected async graphExplain(request: { workspacePath: string; nodeId?: string; filePath?: string; symbolName?: string; depth?: number }): Promise<unknown> {
        const dashboard = await this.memoryService.getDashboard(request.workspacePath);
        const nodeId = this.resolveGraphNodeId(dashboard, request);
        if (!nodeId) {
            return { workspacePath: request.workspacePath, found: false, reason: 'node not found' };
        }
        const neighborhood = new GraphQueryService(dashboard.files, dashboard.symbols, dashboard.relations).expand({ nodeId, depth: request.depth ?? 1 });
        const incoming = dashboard.relations.filter(relation => relation.targetId === nodeId);
        const outgoing = dashboard.relations.filter(relation => relation.sourceId === nodeId);
        const godNode = new GodNodeAnalyzer().analyze({ files: dashboard.files, symbols: dashboard.symbols, relations: dashboard.relations, limit: 100 }).nodes.find(node => node.id === nodeId);
        const community = new GraphCommunityAnalyzer().analyze({ files: dashboard.files, symbols: dashboard.symbols, relations: dashboard.relations }).communities.find(candidate => candidate.nodeIds.includes(nodeId));
        return {
            workspacePath: request.workspacePath,
            found: true,
            node: this.graphNodeDetails(dashboard, nodeId),
            degree: incoming.length + outgoing.length,
            fanIn: incoming.length,
            fanOut: outgoing.length,
            incoming: incoming.slice(0, 20).map(relation => this.relationEdge(relation)),
            outgoing: outgoing.slice(0, 20).map(relation => this.relationEdge(relation)),
            neighborhood,
            godNode,
            community,
            reasons: [
                incoming.length ? `${incoming.length} incoming relation(s).` : undefined,
                outgoing.length ? `${outgoing.length} outgoing relation(s).` : undefined,
                godNode ? `God-node signal score ${godNode.score}.` : undefined,
                community ? `Member of community "${community.name}".` : undefined
            ].filter((reason): reason is string => !!reason)
        };
    }

    protected async graphSearch(args: Record<string, unknown>): Promise<unknown> {
        const workspacePath = this.requiredStringArg(args.workspacePath, 'workspacePath');
        const dashboard = await this.memoryService.getDashboard(workspacePath);
        const limit = Math.max(1, Math.min(100, this.numberArg(args.limit) ?? 25));
        const query = this.stringArg(args.query)?.toLowerCase();
        const relationTypes = new Set(this.stringArrayArg(args.relationTypes));
        const nodeKinds = new Set(this.stringArrayArg(args.nodeKinds));
        const startId = this.resolveGraphNodeId(dashboard, args);
        const expanded = startId ? new GraphQueryService(dashboard.files, dashboard.symbols, dashboard.relations).expand({ nodeId: startId, depth: this.numberArg(args.depth) ?? 1 }) : undefined;
        const expandedNodeIds = expanded ? new Set(expanded.nodes.map(node => node.id)) : undefined;
        const nodes = this.allGraphNodes(dashboard)
            .filter(node => !expandedNodeIds || expandedNodeIds.has(node.id))
            .filter(node => !nodeKinds.size || nodeKinds.has(node.kind))
            .filter(node => !query || `${node.label} ${node.detail ?? ''} ${node.semanticTags?.join(' ') ?? ''}`.toLowerCase().includes(query))
            .slice(0, limit);
        const nodeIds = new Set(nodes.map(node => node.id));
        const edges = dashboard.relations
            .filter(relation => (!expandedNodeIds || expandedNodeIds.has(relation.sourceId) || expandedNodeIds.has(relation.targetId)))
            .filter(relation => !relationTypes.size || relationTypes.has(relation.relationType))
            .filter(relation => nodeIds.has(relation.sourceId) || nodeIds.has(relation.targetId))
            .slice(0, limit * 2)
            .map(relation => this.relationEdge(relation));
        return {
            workspacePath,
            query,
            count: nodes.length,
            nodes,
            edges,
            explanation: {
                source: 'local Memory graph',
                filters: { nodeKinds: [...nodeKinds], relationTypes: [...relationTypes], startId, depth: this.numberArg(args.depth) }
            }
        };
    }

    protected async graphFirstSearch(args: Record<string, unknown>): Promise<unknown> {
        const workspacePath = this.requiredStringArg(args.workspacePath, 'workspacePath');
        const query = this.requiredStringArg(args.query, 'query');
        const limit = Math.max(1, Math.min(50, this.numberArg(args.limit) ?? GRAPH_FIRST_DEFAULT_LIMIT));
        const tokenBudget = Math.max(80, Math.min(8000, this.numberArg(args.tokenBudget) ?? GRAPH_FIRST_DEFAULT_TOKEN_BUDGET));
        const dashboard = await this.memoryService.getDashboard(workspacePath);
        const graph = await this.graphSearch({
            workspacePath,
            query,
            nodeKinds: args.nodeKinds,
            relationTypes: args.relationTypes,
            depth: args.depth,
            limit
        }) as { count?: number; nodes?: unknown[]; edges?: unknown[] };
        const sourceKinds = this.graphFirstSourceKinds(args.sourceKinds, this.booleanArg(args.includeIndexedCode));
        const retrievalResults = await this.memoryService.search({
            workspacePath,
            text: query,
            limit,
            sourceKinds
        });
        const compactResults = this.compactGraphFirstRetrievalResults(retrievalResults, tokenBudget);
        const graphReady = dashboard.files.length > 0 || dashboard.symbols.length > 0 || dashboard.relations.length > 0;
        const graphHitCount = graph.count ?? graph.nodes?.length ?? 0;
        const retrievalHitCount = retrievalResults.length;
        const changedFilePaths = this.stringArrayArg(args.changedFilePaths);
        const changeImpact = changedFilePaths?.length
            ? await this.memoryService.analyzeBlastRadius({
                changedFilePaths,
                files: dashboard.files,
                symbols: dashboard.symbols,
                relations: dashboard.relations,
                events: dashboard.events,
                memories: dashboard.memories,
                maxDepth: this.numberArg(args.maxDepth)
            })
            : this.booleanArg(args.detectGitChanges) === true
                ? await this.memoryService.detectChangeImpactFromGitDiff({
                    workspacePath,
                    baseRef: this.stringArg(args.baseRef),
                    compareRef: this.stringArg(args.compareRef),
                    includeUntracked: this.booleanArg(args.includeUntracked),
                    since: this.stringArg(args.since),
                    maxDepth: this.numberArg(args.maxDepth)
                })
                : undefined;
        const hasMemoryEvidence = graphReady && (graphHitCount > 0 || retrievalHitCount > 0);
        const astGrepPattern = this.stringArg(args.astGrepPattern);
        const astGrep = astGrepPattern
            ? await this.astGrepFallback({
                workspacePath,
                pattern: astGrepPattern,
                language: this.stringArg(args.astGrepLanguage),
                limit: Math.max(1, Math.min(100, this.numberArg(args.astGrepLimit) ?? limit)),
                run: !hasMemoryEvidence && this.booleanArg(args.runAstGrep) !== false
            })
            : undefined;
        return {
            workspacePath,
            query,
            strategy: 'graph-first',
            graphReady,
            graphStats: {
                files: dashboard.files.length,
                symbols: dashboard.symbols.length,
                relations: dashboard.relations.length,
                memories: dashboard.memories.length,
                changeImpacts: dashboard.changeImpacts.length
            },
            sourceKinds,
            graph,
            retrieval: {
                count: retrievalResults.length,
                estimatedTokens: compactResults.estimatedTokens,
                omittedCount: compactResults.omittedCount,
                results: compactResults.results
            },
            changeImpact,
            astGrep,
            recommendedNextStep: this.graphFirstRecommendation({
                graphReady,
                graphHitCount,
                retrievalHitCount,
                astGrepPattern,
                astGrep
            }),
            notes: [
                'Use this Memory result before rg/grep when graphReady is true and evidence exists.',
                astGrepPattern ? 'ast-grep is only used as a structural fallback when Memory graph/search did not return evidence.' : 'Provide astGrepPattern to try ast-grep before rg when Memory has no evidence.',
                'Run rg/grep only when Memory and optional ast-grep are insufficient or stale.'
            ]
        };
    }

    protected graphFirstSourceKinds(value: unknown, includeIndexedCode?: boolean): MemorySourceKind[] {
        const requested = this.sourceKindsArg(value);
        if (requested?.length) {
            return requested;
        }
        return includeIndexedCode === true ? [...GRAPH_FIRST_SOURCE_KINDS, 'code'] : [...GRAPH_FIRST_SOURCE_KINDS];
    }

    protected compactGraphFirstRetrievalResults(results: RetrievalResult[], tokenBudget: number): {
        results: Array<Pick<RetrievalResult, 'id' | 'sourceKind' | 'title' | 'uri' | 'evidence' | 'score' | 'estimatedTokens'> & { snippet: string }>;
        estimatedTokens: number;
        omittedCount: number;
    } {
        let estimatedTokens = 0;
        const compact: Array<Pick<RetrievalResult, 'id' | 'sourceKind' | 'title' | 'uri' | 'evidence' | 'score' | 'estimatedTokens'> & { snippet: string }> = [];
        for (const result of results) {
            const snippet = this.truncateText(this.redactSearchText(result.snippet), GRAPH_FIRST_MAX_SNIPPET_CHARS);
            const resultTokens = result.estimatedTokens ?? this.tokenBudgetService.estimateTokens(snippet);
            if (compact.length > 0 && estimatedTokens + resultTokens > tokenBudget) {
                continue;
            }
            compact.push({
                id: result.id,
                sourceKind: result.sourceKind,
                title: this.redactSearchText(result.title),
                uri: result.uri ? this.redactSearchText(result.uri) : undefined,
                evidence: result.evidence ? this.redactSearchText(result.evidence) : undefined,
                score: result.score,
                estimatedTokens: resultTokens,
                snippet
            });
            estimatedTokens += resultTokens;
        }
        return {
            results: compact,
            estimatedTokens,
            omittedCount: Math.max(0, results.length - compact.length)
        };
    }

    protected graphFirstRecommendation(request: {
        graphReady: boolean;
        graphHitCount: number;
        retrievalHitCount: number;
        astGrepPattern?: string;
        astGrep?: unknown;
    }): string {
        if (!request.graphReady) {
            return 'index-memory';
        }
        if (request.graphHitCount > 0 || request.retrievalHitCount > 0) {
            return 'use-memory-results';
        }
        const astGrep = this.objectValue(request.astGrep);
        if (astGrep?.status === 'ok' && this.numberArg(astGrep.count) && this.numberArg(astGrep.count)! > 0) {
            return 'use-ast-grep-results';
        }
        if (request.astGrepPattern && astGrep?.status !== 'error') {
            return 'run-ast-grep';
        }
        return 'run-rg';
    }

    protected async astGrepFallback(request: {
        workspacePath: string;
        pattern: string;
        language?: string;
        limit: number;
        run: boolean;
    }): Promise<unknown> {
        if (!request.run) {
            return {
                status: 'skipped',
                reason: 'Memory graph/search already returned evidence or runAstGrep was false.'
            };
        }
        const args = ['run', '--pattern', request.pattern];
        if (request.language) {
            args.push('--lang', request.language);
        }
        const attemptedCommands: string[] = [];
        for (const command of ['ast-grep', 'sg']) {
            attemptedCommands.push(command);
            try {
                const { stdout, stderr } = await execFileAsync(command, args, {
                    cwd: request.workspacePath,
                    windowsHide: true,
                    timeout: 8000,
                    maxBuffer: 512 * 1024
                });
                const matches = this.compactAstGrepLines(stdout, request.limit);
                return {
                    status: 'ok',
                    command,
                    language: request.language,
                    count: matches.length,
                    truncated: stdout.split(/\r?\n/).filter(line => line.trim()).length > matches.length,
                    matches,
                    stderr: stderr ? this.truncateText(this.redactSearchText(stderr), 1200) : undefined
                };
            } catch (error) {
                const failure = error as { code?: string | number; message?: string; stdout?: string; stderr?: string };
                if (failure.code === 'ENOENT') {
                    continue;
                }
                const matches = failure.stdout ? this.compactAstGrepLines(failure.stdout, request.limit) : [];
                if (matches.length) {
                    return {
                        status: 'ok',
                        command,
                        language: request.language,
                        count: matches.length,
                        partial: true,
                        matches,
                        stderr: failure.stderr ? this.truncateText(this.redactSearchText(failure.stderr), 1200) : undefined
                    };
                }
                return {
                    status: 'error',
                    command,
                    language: request.language,
                    message: this.truncateText(this.redactSearchText(failure.message ?? 'ast-grep failed'), 800),
                    stderr: failure.stderr ? this.truncateText(this.redactSearchText(failure.stderr), 1200) : undefined
                };
            }
        }
        return {
            status: 'unavailable',
            attemptedCommands,
            reason: 'No ast-grep CLI binary was found. Install ast-grep or sg to enable the structural fallback.'
        };
    }

    protected compactAstGrepLines(stdout: string, limit: number): string[] {
        return stdout
            .split(/\r?\n/)
            .map(line => line.trimEnd())
            .filter(line => line.trim().length > 0)
            .slice(0, limit)
            .map(line => this.truncateText(this.redactSearchText(line), 500));
    }

    protected redactSearchText(value: string): string {
        return this.secretScanner.scan({ content: value, maxFindings: 25 }).redactedContent;
    }

    protected truncateText(value: string, maxLength: number): string {
        return value.length > maxLength ? `${value.slice(0, Math.max(0, maxLength - 3))}...` : value;
    }

    protected async graphGodNodes(args: Record<string, unknown>): Promise<unknown> {
        const workspacePath = this.requiredStringArg(args.workspacePath, 'workspacePath');
        const dashboard = await this.memoryService.getDashboard(workspacePath);
        return {
            workspacePath,
            ...new GodNodeAnalyzer().analyze({
                files: dashboard.files,
                symbols: dashboard.symbols,
                relations: dashboard.relations,
                minDegree: this.numberArg(args.minDegree),
                minCriticalPathCount: this.numberArg(args.minCriticalPathCount),
                maxCriticalPathDepth: this.numberArg(args.maxCriticalPathDepth),
                limit: this.numberArg(args.limit)
            })
        };
    }

    protected async graphCommunities(args: Record<string, unknown>): Promise<unknown> {
        const workspacePath = this.requiredStringArg(args.workspacePath, 'workspacePath');
        const dashboard = await this.memoryService.getDashboard(workspacePath);
        return {
            workspacePath,
            ...new GraphCommunityAnalyzer().analyze({
                files: dashboard.files,
                symbols: dashboard.symbols,
                relations: dashboard.relations,
                minCommunitySize: this.numberArg(args.minCommunitySize),
                maxCommunities: this.numberArg(args.maxCommunities),
                maxIterations: this.numberArg(args.maxIterations)
            })
        };
    }

    protected async graphSurprisingConnections(args: Record<string, unknown>): Promise<unknown> {
        const workspacePath = this.requiredStringArg(args.workspacePath, 'workspacePath');
        const dashboard = await this.memoryService.getDashboard(workspacePath);
        const query = this.stringArg(args.query)?.toLowerCase();
        const knowledgeLinks = dashboard.knowledgeGraphs.flatMap(graph => graph.links
            .filter(link => link.linkKind === 'surprising_connection' && link.status !== 'rejected' && link.status !== 'archived')
            .map(link => {
                const concepts = new Map(graph.concepts.map(concept => [concept.id, concept]));
                const source = concepts.get(link.sourceConceptId);
                const target = concepts.get(link.targetConceptId);
                return {
                    id: link.id,
                    graphId: graph.id,
                    graphTitle: graph.title,
                    source: source ? { id: source.id, title: source.title, kind: source.kind, sourceKind: source.sourceKind, sourceId: source.sourceId } : { id: link.sourceConceptId },
                    target: target ? { id: target.id, title: target.title, kind: target.kind, sourceKind: target.sourceKind, sourceId: target.sourceId } : { id: link.targetConceptId },
                    label: link.label,
                    confidenceScore: link.confidenceScore,
                    evidence: link.evidence,
                    status: link.status ?? 'active',
                    metadata: link.metadata,
                    reasons: ['Knowledge graph link marked surprising_connection.', link.status === 'candidate' ? 'Review required before treating as active memory.' : undefined].filter((reason): reason is string => !!reason)
                };
            }));
        const relationConnections = dashboard.relations
            .filter(relation => relation.relationType === 'surprising_connection')
            .map(relation => ({
                id: relation.id,
                source: this.graphNodeDetails(dashboard, relation.sourceId),
                target: this.graphNodeDetails(dashboard, relation.targetId),
                confidenceScore: relation.confidenceScore,
                evidence: relation.evidence,
                status: relation.confidenceLevel,
                reasons: ['Code graph relation marked surprising_connection.']
            }));
        const connections = [...knowledgeLinks, ...relationConnections]
            .filter(connection => !query || JSON.stringify(connection).toLowerCase().includes(query))
            .slice(0, Math.max(1, Math.min(100, this.numberArg(args.limit) ?? 25)));
        return { workspacePath, query, count: connections.length, connections };
    }

    protected resolveGraphNodeId(dashboard: Pick<MemoryDashboard, 'files' | 'symbols'>, request: Record<string, unknown>): string | undefined {
        const nodeId = this.stringArg(request.nodeId);
        if (nodeId && (dashboard.files.some(file => file.id === nodeId) || dashboard.symbols.some(symbol => symbol.id === nodeId))) {
            return nodeId;
        }
        const filePath = this.stringArg(request.filePath)?.replace(/\\/g, '/').toLowerCase();
        if (filePath) {
            return dashboard.files.find(file => file.relativePath.toLowerCase() === filePath || file.fileName.toLowerCase() === filePath)?.id;
        }
        const symbolName = this.stringArg(request.symbolName);
        if (symbolName) {
            return dashboard.symbols.find(symbol => symbol.name === symbolName || symbol.fullName === symbolName)?.id;
        }
        return undefined;
    }

    protected graphNodeDetails(dashboard: Pick<MemoryDashboard, 'files' | 'symbols'>, nodeId: string): MemoryGraphNode {
        const file = dashboard.files.find(candidate => candidate.id === nodeId);
        if (file) {
            return {
                id: file.id,
                kind: 'file',
                label: file.fileName,
                detail: file.relativePath,
                source: 'code',
                relativePath: file.relativePath,
                semanticTags: [
                    file.languageId,
                    file.isGenerated ? 'generated' : undefined,
                    file.isSensitive ? 'sensitive' : undefined,
                    file.ignoreReason?.kind
                ].filter((tag): tag is string => !!tag)
            };
        }
        const symbol = dashboard.symbols.find(candidate => candidate.id === nodeId);
        if (symbol) {
            const owner = dashboard.files.find(candidate => candidate.id === symbol.fileId);
            return {
                id: symbol.id,
                kind: 'symbol',
                label: symbol.fullName ?? symbol.name,
                detail: symbol.symbolKind,
                source: 'code-graph',
                relativePath: owner?.relativePath,
                line: symbol.startLine,
                semanticTags: [symbol.languageId, symbol.symbolKind, ...(symbol.attributes ?? [])]
            };
        }
        return {
            id: nodeId,
            kind: 'symbol',
            label: nodeId,
            source: 'code-graph'
        };
    }

    protected allGraphNodes(dashboard: Pick<MemoryDashboard, 'files' | 'symbols'>): MemoryGraphNode[] {
        return [
            ...dashboard.files.map(file => this.graphNodeDetails(dashboard, file.id)),
            ...dashboard.symbols.map(symbol => this.graphNodeDetails(dashboard, symbol.id))
        ];
    }

    protected relationEdge(relation: MemoryRelation): MemoryGraphEdge {
        return {
            id: relation.id,
            sourceId: relation.sourceId,
            targetId: relation.targetId,
            relationType: relation.relationType,
            confidenceScore: relation.confidenceScore,
            evidence: relation.evidence ? [{
                kind: 'static-analysis',
                source: 'code-graph',
                summary: this.secretScanner.scan({ content: relation.evidence }).redactedContent,
                confidenceScore: relation.confidenceScore,
                redacted: true
            }] : undefined,
            metadata: relation.metadata
        };
    }

    protected shortestGraphPath(
        relations: readonly MemoryRelation[],
        fromId: string,
        toId: string,
        maxDepth: number,
        directed: boolean,
        relationTypes: Set<string>
    ): { nodeIds: string[]; edgeIds: string[] } | undefined {
        const queue: Array<{ nodeId: string; nodeIds: string[]; edgeIds: string[] }> = [{ nodeId: fromId, nodeIds: [fromId], edgeIds: [] }];
        const visited = new Set([fromId]);
        while (queue.length) {
            const current = queue.shift();
            if (!current) {
                continue;
            }
            if (current.nodeId === toId) {
                return { nodeIds: current.nodeIds, edgeIds: current.edgeIds };
            }
            if (current.edgeIds.length >= maxDepth) {
                continue;
            }
            for (const relation of relations) {
                if (relationTypes.size && !relationTypes.has(relation.relationType)) {
                    continue;
                }
                const forward = relation.sourceId === current.nodeId;
                const backward = !directed && relation.targetId === current.nodeId;
                if (!forward && !backward) {
                    continue;
                }
                const nextId = forward ? relation.targetId : relation.sourceId;
                if (visited.has(nextId)) {
                    continue;
                }
                visited.add(nextId);
                queue.push({
                    nodeId: nextId,
                    nodeIds: [...current.nodeIds, nextId],
                    edgeIds: [...current.edgeIds, relation.id]
                });
            }
        }
        return undefined;
    }

    protected contextFeedbackSchema(defaultFeedback: MemoryFeedbackKind): object {
        return {
            workspacePath: z.string(),
            promptSignature: z.string().optional(),
            targetKind: feedbackTargetKindSchema.optional(),
            targetId: z.string(),
            targetSourceKind: sourceKindSchema.optional(),
            targetUri: z.string().optional(),
            targetTitle: z.string().optional(),
            reason: defaultFeedback === 'rejected' ? z.string().optional() : z.string().optional(),
            evidence: z.string().optional(),
            metadata: z.unknown().optional()
        };
    }

    protected async explainRanking(request: {
        workspacePath: string;
        prompt: string;
        limit?: number;
        tokenBudget?: number;
        sourceKinds?: MemorySourceKind[];
        taskId?: string;
        rankingWeights?: Partial<MemoryRankingWeights>;
    }): Promise<unknown> {
        const weights = this.rankingWeights(request.rankingWeights);
        const results = await this.memoryService.search({
            workspacePath: request.workspacePath,
            text: request.prompt,
            limit: request.limit,
            sourceKinds: request.sourceKinds,
            taskId: request.taskId
        });
        const feedback = results.length
            ? await this.memoryService.searchFeedback({
                workspacePath: request.workspacePath,
                targetIds: results.map(result => result.id),
                unresolvedOnly: true,
                limit: Math.max(100, results.length * 3)
            })
            : [];
        const feedbackByTarget = new Map<string, MemoryFeedbackRecord[]>();
        for (const record of feedback) {
            const records = feedbackByTarget.get(record.targetId) ?? [];
            records.push(record);
            feedbackByTarget.set(record.targetId, records);
        }
        let usedTokens = 0;
        const tokenBudget = request.tokenBudget;
        const ranked = results.map((result, index) => {
            const resultFeedback = feedbackByTarget.get(result.id) ?? [];
            const estimatedTokens = result.estimatedTokens ?? 0;
            usedTokens += estimatedTokens;
            const accepted = resultFeedback.filter(record => record.feedback === 'accepted').length;
            const rejected = resultFeedback.filter(record => record.feedback === 'rejected').length;
            const stale = resultFeedback.filter(record => record.feedback === 'stale').length;
            const scoreExplanation = this.rankingScoreExplanation(result, weights);
            const feedbackMultiplier = result.rankingSignals?.feedbackMultiplier ?? this.feedbackMultiplierFromCounts(accepted, rejected, stale);
            const scopeReason = this.scopeReason(result);
            return {
                rank: index + 1,
                id: result.id,
                sourceKind: result.sourceKind,
                title: result.title,
                uri: result.uri,
                score: result.score,
                estimatedTokens,
                withinTokenBudget: tokenBudget === undefined || usedTokens <= tokenBudget,
                evidence: result.evidence,
                scopeReason,
                feedbackApplied: {
                    multiplier: feedbackMultiplier,
                    accepted,
                    rejected,
                    stale,
                    unresolved: resultFeedback.length,
                    records: resultFeedback.map(record => ({
                        id: record.id,
                        feedback: record.feedback,
                        reason: record.reason,
                        evidence: record.evidence,
                        createdAt: record.createdAt
                    }))
                },
                scoreExplanation,
                rankingSignals: {
                    sourceScore: result.score,
                    acceptedFeedback: accepted,
                    rejectedFeedback: rejected,
                    staleFeedback: stale,
                    unresolvedFeedback: resultFeedback.length,
                    vectorEligible: result.sourceKind === 'project-memory' || result.sourceKind === 'repository-memory' || result.sourceKind === 'task-memory',
                    ...result.rankingSignals
                }
            };
        });
        const sources = this.sourceRankingSummary(ranked);
        return {
            workspacePath: request.workspacePath,
            prompt: request.prompt,
            rankingModel: 'local-bm25-feedback-vector',
            rankingWeights: weights,
            sourceKinds: request.sourceKinds ?? SOURCE_KINDS,
            totalResults: results.length,
            estimatedTokens: ranked.reduce((sum, result) => sum + result.estimatedTokens, 0),
            tokenBudget,
            omittedByTokenBudget: tokenBudget === undefined ? 0 : ranked.filter(result => !result.withinTokenBudget).length,
            vectorStatus: await this.memoryService.getVectorStatus(request.workspacePath),
            sources,
            results: ranked
        };
    }

    protected async exportPortablePackage(request: {
        workspacePath: string;
        includeGlobalMemories?: boolean;
        includeEphemeralMemories?: boolean;
        includeBundle?: boolean;
        includeArtifactContents?: boolean;
        tokenBudget?: number;
    }): Promise<unknown> {
        const bundle = await this.memoryService.exportWorkspaceData({
            workspacePath: request.workspacePath,
            includeGlobalMemories: request.includeGlobalMemories,
            includeEphemeralMemories: request.includeEphemeralMemories
        });
        const safeBundle = this.redactPortableValue(bundle) as MemoryExportBundle;
        const artifactItems = (safeBundle.artifacts ?? []).map(artifact => ({
            id: artifact.path,
            text: artifact.content,
            priority: artifact.path === 'metadata.json' ? 10 : 1
        }));
        const fit = this.tokenBudgetService.fit({
            budgetTokens: request.tokenBudget ?? 1200,
            items: artifactItems
        });
        const selectedArtifacts = new Set(fit.selectedIds);
        const bundleText = JSON.stringify(safeBundle);
        const bundleTokens = this.tokenBudgetService.estimateTokens(bundleText);
        const includeBundle = request.includeBundle === true && bundleTokens <= (request.tokenBudget ?? 1200);
        return {
            workspacePath: safeBundle.workspacePath,
            exportedAt: safeBundle.exportedAt,
            version: safeBundle.version,
            policies: {
                includeGlobalMemories: request.includeGlobalMemories === true,
                includeEphemeralMemories: request.includeEphemeralMemories === true,
                optInPortableInstall: true,
                localFirst: true,
                reviewRequiredOnImport: true
            },
            counts: this.portableBundleCounts(safeBundle),
            tokenBudget: request.tokenBudget,
            estimatedTokens: request.includeArtifactContents === true ? fit.estimatedTokens : 0,
            omittedArtifactContents: request.includeArtifactContents === true ? fit.omittedIds : (safeBundle.artifacts ?? []).map(artifact => artifact.path),
            omittedBundle: request.includeBundle === true && !includeBundle ? {
                reason: 'bundle exceeds token budget',
                estimatedTokens: bundleTokens
            } : undefined,
            artifacts: (safeBundle.artifacts ?? []).map(artifact => ({
                path: artifact.path,
                mediaType: artifact.mediaType,
                bytes: artifact.content.length,
                estimatedTokens: this.tokenBudgetService.estimateTokens(artifact.content),
                content: request.includeArtifactContents === true && selectedArtifacts.has(artifact.path) ? artifact.content : undefined
            })),
            bundle: includeBundle ? safeBundle : undefined
        };
    }

    protected async comparePortablePackage(request: {
        workspacePath: string;
        packageJson?: string;
        packageValue?: Record<string, unknown>;
        tokenBudget?: number;
        limit?: number;
    }): Promise<unknown> {
        const parsed = this.parsePortablePackage(request);
        const safePackage = this.redactPortableValue(parsed) as MemoryExportBundle;
        const dashboard = await this.memoryService.getDashboard(request.workspacePath);
        const localMemoryKeys = new Map(dashboard.memories.map(memory => [this.memoryComparisonKey(memory), memory]));
        const localMemoriesById = new Map(dashboard.memories.map(memory => [memory.id, memory]));
        const localMemoryTitleScopeKeys = new Map(dashboard.memories.map(memory => [this.memoryTitleScopeComparisonKey(memory), memory]));
        const rawMemoriesById = new Map((parsed.memories ?? []).map(memory => [memory.id, memory]));
        const memoryDiff = (safePackage.memories ?? []).map(memory => {
            const rawMemory = rawMemoriesById.get(memory.id) ?? memory;
            const secretFindings = this.secretScanner.scan({ content: `${rawMemory.title}\n${rawMemory.content}\n${rawMemory.evidence ?? ''}`, maxFindings: 1 }).findings.length;
            const duplicate = localMemoryKeys.get(this.memoryComparisonKey(memory));
            const idConflict = localMemoriesById.get(memory.id);
            const titleScopeConflict = localMemoryTitleScopeKeys.get(this.memoryTitleScopeComparisonKey(memory));
            const conflict = !duplicate && idConflict
                ? idConflict
                : !duplicate && titleScopeConflict
                    ? titleScopeConflict
                    : undefined;
            const classification = secretFindings ? 'sensitive' : duplicate ? 'duplicate' : conflict ? 'conflicting' : 'new';
            return {
                memoryId: memory.id,
                title: memory.title,
                scope: memory.scope,
                status: 'candidate',
                classification,
                importable: classification === 'new',
                existingMemoryId: duplicate?.id ?? conflict?.id,
                reason: secretFindings
                    ? 'Portable memory contains secret-like content after redaction check.'
                    : duplicate
                        ? 'A local memory with the same scope, title, and content already exists.'
                        : conflict
                            ? 'A local memory with the same id or scope/title exists with different content.'
                        : 'Portable memory can be imported as a review candidate.'
            };
        });
        const detailItems = memoryDiff.map((entry, index) => ({
            id: entry.memoryId ?? `memory-${index}`,
            text: JSON.stringify(entry),
            priority: entry.importable ? 2 : 1
        }));
        const fit = this.tokenBudgetService.fit({
            budgetTokens: request.tokenBudget ?? 1200,
            items: detailItems
        });
        const selected = new Set(fit.selectedIds);
        const limited = memoryDiff
            .filter((entry, index) => selected.has(entry.memoryId ?? `memory-${index}`))
            .slice(0, request.limit ?? 50);
        return {
            workspacePath: request.workspacePath,
            packageWorkspacePath: safePackage.workspacePath,
            exportedAt: safePackage.exportedAt,
            version: safePackage.version,
            counts: this.portableBundleCounts(safePackage),
            localCounts: {
                memories: dashboard.memories.length,
                files: dashboard.files.length,
                symbols: dashboard.symbols.length,
                relations: dashboard.relations.length
            },
            security: {
                redacted: true,
                rawContentImported: false,
                normalImportWouldCreateReviewCandidates: true
            },
            memoryDiff: limited,
            totalMemoryDiff: memoryDiff.length,
            omittedMemoryDiff: fit.omittedIds.length + Math.max(0, memoryDiff.length - limited.length - fit.omittedIds.length),
            tokenBudget: request.tokenBudget,
            estimatedTokens: fit.estimatedTokens
        };
    }

    protected parsePortablePackage(request: { packageJson?: string; packageValue?: Record<string, unknown> }): MemoryExportBundle {
        const value = request.packageValue ?? (request.packageJson ? this.parseJsonObject(request.packageJson) : undefined);
        if (!value) {
            throw new Error(nls.localize('theia/memory/mcp/missingPortablePackage', 'Missing portable package JSON.'));
        }
        if (!Array.isArray(value.memories) || typeof value.workspacePath !== 'string') {
            throw new Error(nls.localize('theia/memory/mcp/invalidPortablePackage', 'Invalid portable Memory package.'));
        }
        return value as unknown as MemoryExportBundle;
    }

    protected portableBundleCounts(bundle: Partial<MemoryExportBundle>): Record<string, number> {
        return {
            files: bundle.files?.length ?? 0,
            symbols: bundle.symbols?.length ?? 0,
            relations: bundle.relations?.length ?? 0,
            codeChunks: bundle.codeChunks?.length ?? 0,
            memories: bundle.memories?.length ?? 0,
            memorySpaces: bundle.memorySpaces?.length ?? 0,
            knowledgeGraphs: bundle.knowledgeGraphs?.length ?? 0,
            feedbackRecords: bundle.feedbackRecords?.length ?? 0,
            artifacts: bundle.artifacts?.length ?? 0
        };
    }

    protected redactPortableValue<T>(value: T): T {
        return JSON.parse(this.secretScanner.scan({ content: JSON.stringify(value) }).redactedContent) as T;
    }

    protected memoryComparisonKey(memory: Pick<MemoryItem, 'scope' | 'title' | 'content'>): string {
        return `${memory.scope}:${memory.title}:${memory.content}`.toLowerCase().replace(/\s+/g, ' ').trim();
    }

    protected memoryTitleScopeComparisonKey(memory: Pick<MemoryItem, 'scope' | 'title'>): string {
        return `${memory.scope}:${memory.title}`.toLowerCase().replace(/\s+/g, ' ').trim();
    }

    protected rankingWeights(overrides: Partial<MemoryRankingWeights> | undefined): MemoryRankingWeights {
        return {
            ...DEFAULT_MEMORY_RANKING_WEIGHTS,
            ...overrides
        };
    }

    protected rankingWeightsArg(value: unknown): Partial<MemoryRankingWeights> | undefined {
        if (!value || typeof value !== 'object') {
            return undefined;
        }
        const record = value as Partial<Record<keyof MemoryRankingWeights, unknown>>;
        return Object.fromEntries(Object.entries(record).filter((entry): entry is [keyof MemoryRankingWeights, number] => typeof entry[1] === 'number')) as Partial<MemoryRankingWeights>;
    }

    protected rankingScoreExplanation(result: RetrievalResult, weights: MemoryRankingWeights): RankingScoreExplanation {
        const signals = result.rankingSignals;
        if (!signals) {
            return {
                finalScore: result.score,
                formula: 'sourceScore',
                fallback: true,
                components: [{
                    name: 'sourceScore',
                    signal: result.score,
                    weight: 1,
                    contribution: result.score
                }]
            };
        }
        const components = [
            this.rankingComponent('bm25Score', signals.bm25Score, weights.bm25Score),
            this.rankingComponent('vectorScore', signals.vectorScore, weights.vectorScore),
            this.rankingComponent('graphScore', signals.graphScore, weights.graphScore),
            this.rankingComponent('memoryWeight', signals.memoryWeight ?? signals.weight, weights.memoryWeight),
            this.rankingComponent('recencyScore', signals.recencyScore, weights.recencyScore),
            this.rankingComponent('eventTypeScore', signals.eventTypeScore, weights.eventTypeScore),
            this.rankingComponent('workspaceScore', signals.workspaceScore, weights.workspaceScore),
            this.rankingComponent('sessionTaskScore', signals.sessionTaskScore, weights.sessionTaskScore),
            this.rankingComponent('acceptanceScore', signals.acceptanceScore, weights.acceptanceScore),
            this.rankingComponent('scopeBoost', signals.scopeBoost, weights.scopeBoost)
        ];
        const stalePenalty = this.rankingComponent('stalePenalty', signals.stalePenalty, weights.stalePenalty, -1);
        const rawScore = components.reduce((sum, component) => sum + component.contribution, 0) + stalePenalty.contribution;
        return {
            finalScore: result.score,
            formula: '0.30*bm25 + 0.25*vector + 0.15*graph + 0.10*memoryWeight + 0.10*recency + 0.05*eventType + 0.05*workspace + 0.10*sessionTask + 0.05*acceptance + 0.05*scopeBoost - stalePenalty',
            rawScore: Number(rawScore.toFixed(6)),
            clampedScore: Number(Math.max(0, rawScore).toFixed(6)),
            components,
            stalePenalty
        };
    }

    protected rankingComponent(name: keyof MemoryRankingWeights, value: number | undefined, weight: number, direction = 1): RankingScoreComponent {
        const signal = Math.max(0, Math.min(1, value ?? 0));
        return {
            name,
            signal,
            weight,
            contribution: Number((direction * weight * signal).toFixed(6))
        };
    }

    protected feedbackMultiplierFromCounts(accepted: number, rejected: number, stale: number): number {
        if (!accepted && !rejected && !stale) {
            return 1;
        }
        const penalty = Math.pow(0.45, rejected) * Math.pow(0.7, stale);
        const boost = accepted > rejected + stale ? 1.05 : 1;
        return Math.max(0.05, Math.min(1.05, Number((penalty * boost).toFixed(6))));
    }

    protected scopeReason(result: RetrievalResult): string {
        const scope = result.rankingSignals?.scope;
        const boost = result.rankingSignals?.scopeBoost;
        if (scope) {
            return `Matched ${scope} scope${boost !== undefined ? ` with scopeBoost=${boost}` : ''}.`;
        }
        switch (result.sourceKind) {
            case 'repository-memory':
                return 'Matched repository memory for the current repository identity.';
            case 'project-memory':
                return 'Matched project memory visible to the current workspace.';
            case 'task-memory':
                return 'Matched task/ephemeral memory for the requested task.';
            default:
                return `Matched ${result.sourceKind} source for the current workspace.`;
        }
    }

    protected sourceRankingSummary(results: Array<{ sourceKind: MemorySourceKind; score: number; estimatedTokens: number; withinTokenBudget: boolean; scoreExplanation: RankingScoreExplanation }>): unknown[] {
        const summaries = new Map<MemorySourceKind, { sourceKind: MemorySourceKind; count: number; averageScore: number; maxScore: number; estimatedTokens: number; withinTokenBudget: number; componentTotals: Record<string, number> }>();
        for (const result of results) {
            const summary = summaries.get(result.sourceKind) ?? {
                sourceKind: result.sourceKind,
                count: 0,
                averageScore: 0,
                maxScore: 0,
                estimatedTokens: 0,
                withinTokenBudget: 0,
                componentTotals: {}
            };
            summary.count++;
            summary.averageScore += result.score;
            summary.maxScore = Math.max(summary.maxScore, result.score);
            summary.estimatedTokens += result.estimatedTokens;
            summary.withinTokenBudget += result.withinTokenBudget ? 1 : 0;
            for (const component of result.scoreExplanation.components ?? []) {
                if (component.contribution === 0) {
                    continue;
                }
                summary.componentTotals[component.name] = Number(((summary.componentTotals[component.name] ?? 0) + component.contribution).toFixed(6));
            }
            if (result.scoreExplanation.stalePenalty && result.scoreExplanation.stalePenalty.contribution !== 0) {
                summary.componentTotals.stalePenalty = Number(((summary.componentTotals.stalePenalty ?? 0) + result.scoreExplanation.stalePenalty.contribution).toFixed(6));
            }
            summaries.set(result.sourceKind, summary);
        }
        return [...summaries.values()].map(summary => ({
            ...summary,
            averageScore: Number((summary.averageScore / summary.count).toFixed(6))
        }));
    }

    protected async markContextFeedback(args: Record<string, unknown>, feedback: MemoryFeedbackKind): Promise<unknown> {
        const request: MemoryFeedbackRequest = {
            workspacePath: this.requiredStringArg(args.workspacePath, 'workspacePath'),
            promptSignature: this.stringArg(args.promptSignature),
            targetKind: this.feedbackTargetKindArg(args.targetKind) ?? 'retrieval-result',
            targetId: this.requiredStringArg(args.targetId, 'targetId'),
            targetSourceKind: this.sourceKindArg(args.targetSourceKind),
            targetUri: this.stringArg(args.targetUri),
            targetTitle: this.stringArg(args.targetTitle),
            feedback,
            reason: this.stringArg(args.reason),
            evidence: this.stringArg(args.evidence),
            metadata: this.metadataArg(args.metadata)
        };
        const record = await this.recordFeedback(request);
        const event = await this.memoryService.recordEvent({
            workspacePath: request.workspacePath,
            eventType: feedback === 'accepted' ? 'context.accepted' : 'context.rejected',
            promptSignature: request.promptSignature,
            payload: JSON.stringify({
                targetKind: request.targetKind,
                targetId: request.targetId,
                targetSourceKind: request.targetSourceKind,
                targetUri: request.targetUri,
                targetTitle: request.targetTitle,
                feedback,
                reason: this.redactSensitiveText(request.reason),
                evidence: this.redactSensitiveText(request.evidence),
                metadata: this.redactSensitiveMetadata(request.metadata)
            })
        });
        return { record, event };
    }

    protected sanitizedFeedbackAuditPayload(request: MemoryFeedbackRequest): MemoryFeedbackRequest {
        return {
            ...request,
            reason: this.redactSensitiveText(request.reason),
            evidence: this.redactSensitiveText(request.evidence),
            metadata: this.redactSensitiveMetadata(request.metadata)
        };
    }

    protected redactSensitiveText(value: string | undefined): string | undefined {
        if (!value) {
            return value;
        }
        return this.secretScanner.scan({ content: value }).redactedContent;
    }

    protected redactSensitiveMetadata(metadata: Record<string, string | number | boolean> | undefined): Record<string, string | number | boolean> | undefined {
        if (!metadata) {
            return undefined;
        }
        return Object.fromEntries(Object.entries(metadata).map(([key, value]) => [
            key,
            typeof value === 'string' ? this.redactSensitiveText(value) ?? value : value
        ]));
    }

    protected memorySearchSchema(extra: object = {}): object {
        return {
            workspacePath: z.string(),
            query: z.string().optional(),
            limit: z.number().optional(),
            includeInactive: z.boolean().optional(),
            ...extra
        };
    }

    protected memorySearchArgs(args: Record<string, unknown>): {
        workspacePath: string;
        query?: string;
        limit?: number;
        includeInactive?: boolean;
        repositoryUrl?: string;
        repositoryId?: string;
        taskId?: string;
        status?: MemoryItem['status'];
        staleStatus?: MemoryItem['staleStatus'];
        tokenBudget?: number;
        excludeExpired?: boolean;
    } {
        return {
            workspacePath: this.requiredStringArg(args.workspacePath, 'workspacePath'),
            query: this.stringArg(args.query),
            limit: this.numberArg(args.limit),
            includeInactive: this.booleanArg(args.includeInactive),
            repositoryUrl: this.stringArg(args.repositoryUrl),
            repositoryId: this.stringArg(args.repositoryId),
            taskId: this.stringArg(args.taskId),
            status: this.memoryStatusArg(args.status),
            staleStatus: this.staleStatusArg(args.staleStatus),
            tokenBudget: this.numberArg(args.tokenBudget)
        };
    }

    protected async searchMemoryScope(request: {
        workspacePath: string;
        query?: string;
        limit?: number;
        includeInactive?: boolean;
        repositoryUrl?: string;
        repositoryId?: string;
        taskId?: string;
        status?: MemoryItem['status'];
        staleStatus?: MemoryItem['staleStatus'];
        tokenBudget?: number;
        excludeExpired?: boolean;
    }, scope: MemoryScope): Promise<unknown> {
        const dashboard = await this.memoryService.getDashboard(request.workspacePath);
        const query = request.query?.trim().toLowerCase();
        const scored = dashboard.memories
            .filter(memory => memory.scope === scope)
            .filter(memory => this.memoryMatchesSearchFilters(memory, request))
            .map(memory => ({
                memory,
                score: this.memoryTextScore(memory, query)
            }))
            .filter(result => !query || result.score > 0)
            .sort((left, right) => right.score - left.score || right.memory.updatedAt.localeCompare(left.memory.updatedAt));
        const limited = this.limitMemorySearchResults(scored, request.limit ?? 25, request.tokenBudget);
        return {
            workspacePath: request.workspacePath,
            space: this.memorySpaceName(scope),
            scope,
            query: request.query,
            repositoryUrl: request.repositoryUrl,
            repositoryId: request.repositoryId,
            taskId: request.taskId,
            status: request.status,
            staleStatus: request.staleStatus,
            tokenBudget: request.tokenBudget,
            excludeExpired: request.excludeExpired,
            count: limited.length,
            totalMatches: scored.length,
            estimatedTokens: limited.reduce((sum, result) => sum + this.memoryEstimatedTokens(result.memory), 0),
            memories: limited.map(result => ({
                ...result.memory,
                score: result.score,
                estimatedTokens: this.memoryEstimatedTokens(result.memory)
            }))
        };
    }

    protected memoryMatchesSearchFilters(memory: MemoryItem, request: {
        includeInactive?: boolean;
        repositoryUrl?: string;
        repositoryId?: string;
        taskId?: string;
        status?: MemoryItem['status'];
        staleStatus?: MemoryItem['staleStatus'];
        excludeExpired?: boolean;
    }): boolean {
        if (request.repositoryUrl && memory.repositoryUrl !== request.repositoryUrl) {
            return false;
        }
        if (request.repositoryId && memory.repositoryId !== request.repositoryId) {
            return false;
        }
        if (request.taskId && memory.taskId !== request.taskId) {
            return false;
        }
        if (request.excludeExpired && this.memoryExpired(memory)) {
            return false;
        }
        if (request.status) {
            if (memory.status !== request.status) {
                return false;
            }
        } else if (!request.includeInactive && memory.status !== 'active' && memory.status !== 'candidate') {
            return false;
        }
        return !request.staleStatus || memory.staleStatus === request.staleStatus;
    }

    protected memoryExpired(memory: MemoryItem): boolean {
        if (!memory.expiresAt) {
            return false;
        }
        const expiresAt = Date.parse(memory.expiresAt);
        return !Number.isNaN(expiresAt) && expiresAt <= Date.now();
    }

    protected limitMemorySearchResults<T extends { memory: MemoryItem }>(results: T[], limit: number, tokenBudget?: number): T[] {
        const bounded = results.slice(0, limit);
        if (tokenBudget === undefined || tokenBudget <= 0) {
            return bounded;
        }
        const selected: T[] = [];
        let usedTokens = 0;
        for (const result of bounded) {
            const estimatedTokens = this.memoryEstimatedTokens(result.memory);
            if (selected.length > 0 && usedTokens + estimatedTokens > tokenBudget) {
                continue;
            }
            selected.push(result);
            usedTokens += estimatedTokens;
            if (usedTokens >= tokenBudget) {
                break;
            }
        }
        return selected;
    }

    protected memoryEstimatedTokens(memory: MemoryItem): number {
        const text = [memory.title, memory.content, memory.evidence, memory.source].filter(Boolean).join(' ');
        return Math.max(1, Math.ceil(text.length / 4));
    }

    protected memoryStoreSchema(): object {
        return {
            workspacePath: z.string(),
            scope: memoryScopeSchema.optional(),
            memoryType: memoryTypeSchema.optional(),
            title: z.string(),
            content: z.string(),
            importance: memoryImportanceSchema.optional(),
            weight: z.number().optional(),
            source: z.string().optional(),
            evidence: z.string().optional()
        };
    }

    protected memoryStoreApprovedSchema(): object {
        return {
            ...this.memoryStoreSchema(),
            approvedByUser: z.boolean().optional()
        };
    }

    protected memoryStoreArgs(args: Record<string, unknown>): Pick<MemoryItem, 'workspacePath' | 'scope' | 'memoryType' | 'title' | 'content'> & Partial<Pick<MemoryItem, 'importance' | 'weight' | 'source' | 'evidence'>> {
        return {
            workspacePath: this.requiredStringArg(args.workspacePath, 'workspacePath'),
            scope: this.memoryScopeArg(args.scope) ?? 'workspace',
            memoryType: this.memoryTypeArg(args.memoryType) ?? 'manual_note',
            title: this.requiredStringArg(args.title, 'title'),
            content: this.requiredStringArg(args.content, 'content'),
            importance: this.memoryImportanceArg(args.importance),
            weight: this.numberArg(args.weight),
            source: this.stringArg(args.source),
            evidence: this.stringArg(args.evidence)
        };
    }

    protected memoryStoreApprovedArgs(args: Record<string, unknown>): ReturnType<MemoryMcpContribution['memoryStoreArgs']> {
        const memory = this.memoryStoreArgs(args);
        if (!this.booleanArg(args.approvedByUser) && !this.isTrustedManualMemory(memory)) {
            throw new Error('cybervinci.memory.storeApproved requires approvedByUser=true or a trusted manual origin (source=manual and memoryType=manual_note).');
        }
        return memory;
    }

    protected isTrustedManualMemory(memory: Pick<MemoryItem, 'memoryType'> & Partial<Pick<MemoryItem, 'source'>>): boolean {
        return memory.memoryType === 'manual_note' && memory.source === 'manual';
    }

    protected memoryUpdateSchema(): object {
        return {
            workspacePath: z.string(),
            id: z.string(),
            scope: memoryScopeSchema.optional(),
            memoryType: memoryTypeSchema.optional(),
            title: z.string().optional(),
            content: z.string().optional(),
            status: memoryStatusSchema.optional(),
            staleStatus: staleStatusSchema.optional(),
            importance: memoryImportanceSchema.optional(),
            weight: z.number().optional(),
            lastAccessedAt: z.string().optional(),
            accessCount: z.number().optional(),
            source: z.string().optional(),
            evidence: z.string().optional()
        };
    }

    protected memoryUpdateArgs(args: Record<string, unknown>): {
        workspacePath: string;
        id: string;
        patch: Partial<Pick<MemoryItem, 'scope' | 'memoryType' | 'title' | 'content' | 'status' | 'staleStatus' | 'importance' | 'weight' | 'lastAccessedAt' | 'accessCount' | 'source' | 'evidence'>>;
    } {
        return {
            workspacePath: this.requiredStringArg(args.workspacePath, 'workspacePath'),
            id: this.requiredStringArg(args.id, 'id'),
            patch: this.definedObject({
                scope: this.memoryScopeArg(args.scope),
                memoryType: this.memoryTypeArg(args.memoryType),
                title: this.stringArg(args.title),
                content: this.stringArg(args.content),
                status: this.memoryStatusArg(args.status),
                staleStatus: this.staleStatusArg(args.staleStatus),
                importance: this.memoryImportanceArg(args.importance),
                weight: this.numberArg(args.weight),
                lastAccessedAt: this.stringArg(args.lastAccessedAt),
                accessCount: this.numberArg(args.accessCount),
                source: this.stringArg(args.source),
                evidence: this.stringArg(args.evidence)
            })
        };
    }

    protected async memoryStats(workspacePath: string): Promise<unknown> {
        const [dashboard, vectorStatus, feedback] = await Promise.all([
            this.memoryService.getDashboard(workspacePath),
            this.memoryService.getVectorStatus(workspacePath),
            this.memoryService.searchFeedback({ workspacePath, limit: 500 })
        ]);
        return {
            workspacePath,
            total: dashboard.memories.length,
            byScope: this.countBy(dashboard.memories, memory => memory.scope),
            byStatus: this.countBy(dashboard.memories, memory => memory.status),
            byType: this.countBy(dashboard.memories, memory => memory.memoryType),
            byImportance: this.countBy(dashboard.memories, memory => memory.importance),
            staleStatus: this.countBy(dashboard.memories, memory => memory.staleStatus),
            health: dashboard.memoryHealth,
            feedback: this.countBy(feedback, record => record.feedback),
            vectorStatus
        };
    }

    protected async memorySpaces(workspacePath: string): Promise<unknown> {
        const [dashboard, spaces] = await Promise.all([
            this.memoryService.getDashboard(workspacePath),
            this.memoryService.listMemorySpaces(workspacePath)
        ]);
        return {
            workspacePath,
            totalSpaces: spaces.length,
            byScope: this.countBy(spaces, space => space.scope),
            spaces: spaces.map(space => {
                const memories = dashboard.memories.filter(memory => this.memoryInSpace(memory, space));
                return {
                    id: space.id,
                    name: this.memorySpaceName(space.scope, space),
                    scope: space.scope,
                    workspacePath: space.workspacePath,
                    repositoryUrl: space.repositoryUrl,
                    repositoryId: space.repositoryId,
                    sessionId: space.sessionId,
                    taskId: space.taskId,
                    retentionPolicy: space.retentionPolicy,
                    metadata: space.metadata,
                    total: memories.length,
                    byStatus: this.countBy(memories, memory => memory.status),
                    byScope: this.countBy(memories, memory => memory.scope),
                    active: memories.filter(memory => memory.status === 'active').length,
                    candidates: memories.filter(memory => memory.status === 'candidate').length,
                    stale: memories.filter(memory => memory.staleStatus === 'stale').length,
                    createdAt: space.createdAt,
                    updatedAt: [space.updatedAt, ...memories.map(memory => memory.updatedAt)].filter(Boolean).sort().pop()
                };
            })
        };
    }

    protected memoryInSpace(memory: MemoryItem, space: MemorySpace): boolean {
        if (memory.memorySpaceId) {
            return memory.memorySpaceId === space.id;
        }
        return memory.scope === space.scope
            && (!space.workspacePath || memory.workspacePath === space.workspacePath)
            && (!space.repositoryUrl || memory.repositoryUrl === space.repositoryUrl)
            && (!space.repositoryId || memory.repositoryId === space.repositoryId)
            && (!space.sessionId || memory.sessionId === space.sessionId)
            && (!space.taskId || memory.taskId === space.taskId);
    }

    protected knowledgeWriteSchema(): object {
        return {
            workspacePath: z.string(),
            id: z.string().optional(),
            title: z.string().optional(),
            content: z.string().optional(),
            kind: z.string().optional(),
            sourceId: z.string().optional(),
            targetId: z.string().optional(),
            relationType: z.string().optional(),
            confidenceScore: z.number().optional(),
            evidence: z.string().optional(),
            metadata: z.unknown().optional()
        };
    }

    protected knowledgeWriteArgs(args: Record<string, unknown>): MemoryKnowledgeWriteRequest {
        return {
            workspacePath: this.requiredStringArg(args.workspacePath, 'workspacePath'),
            id: this.stringArg(args.id),
            title: this.stringArg(args.title),
            content: this.stringArg(args.content),
            kind: this.stringArg(args.kind),
            sourceId: this.stringArg(args.sourceId),
            targetId: this.stringArg(args.targetId),
            relationType: this.stringArg(args.relationType),
            confidenceScore: this.numberArg(args.confidenceScore),
            evidence: this.stringArg(args.evidence),
            metadata: this.objectValue(args.metadata)
        };
    }

    protected async searchKnowledge(request: MemoryKnowledgeSearchRequest): Promise<unknown> {
        const api = this.knowledgeApi();
        if (api.searchKnowledge) {
            return api.searchKnowledge(request);
        }
        const graph = await this.knowledgeGraph(request.workspacePath, request.limit);
        const query = request.query?.toLowerCase();
        const concepts = graph.nodes
            .filter(node => !query || `${node.label} ${node.detail ?? ''} ${(node.semanticTags ?? []).join(' ')}`.toLowerCase().includes(query))
            .slice(0, request.limit ?? 25);
        const ids = new Set(concepts.map(node => node.id));
        return {
            storedVia: 'dashboard',
            concepts,
            links: graph.edges.filter(edge => ids.has(edge.sourceId) || ids.has(edge.targetId)).slice(0, request.limit ?? 25)
        };
    }

    protected async inspectKnowledge(request: MemoryKnowledgeInspectRequest): Promise<unknown> {
        const api = this.knowledgeApi();
        if (api.inspectKnowledge) {
            return api.inspectKnowledge(request);
        }
        const graph = await this.knowledgeGraph(request.workspacePath);
        const title = request.title?.toLowerCase();
        const concept = graph.nodes.find(node => request.id ? node.id === request.id : title ? node.label.toLowerCase() === title : false);
        if (!concept) {
            return {
                found: false,
                message: 'Knowledge concept not found in the local dashboard graph.'
            };
        }
        return {
            found: true,
            concept,
            links: graph.edges.filter(edge => edge.sourceId === concept.id || edge.targetId === concept.id)
        };
    }

    protected async exportKnowledge(request: MemoryKnowledgeExportRequest): Promise<unknown> {
        const api = this.knowledgeApi();
        if (api.exportKnowledge) {
            return api.exportKnowledge(request);
        }
        const graph = await this.knowledgeGraph(request.workspacePath, request.limit);
        const content = request.format === 'markdown'
            ? this.knowledgeGraphToMarkdown(graph)
            : request.format === 'dot'
                ? this.knowledgeGraphToDot(graph)
                : JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), workspacePath: request.workspacePath, graph }, undefined, 2);
        return {
            storedVia: 'dashboard',
            format: request.format,
            content
        };
    }

    protected async writeKnowledge(method: 'createKnowledgeConcept' | 'addKnowledgeConcept' | 'linkKnowledgeConcepts', request: MemoryKnowledgeWriteRequest): Promise<unknown> {
        const api = this.knowledgeApi();
        const handler = api[method];
        if (handler) {
            return handler(request);
        }
        return {
            stored: false,
            unsupported: true,
            method,
            message: 'Writable knowledge graph APIs are not available in this build.'
        };
    }

    protected async knowledgeGraph(workspacePath: string, limit = 200): Promise<MemoryGraph> {
        const api = this.knowledgeApi();
        if (api.getKnowledgeGraph) {
            try {
                const graph = this.normalizeKnowledgeGraph(await api.getKnowledgeGraph({ workspacePath, limit }));
                if (graph) {
                    return graph;
                }
            } catch {
                // Dashboard fallback keeps MCP tools available before the knowledge backend is merged.
            }
        }
        const dashboard = await this.memoryService.getDashboard(workspacePath);
        const dashboardGraph = this.resolveDashboardKnowledgeGraph(dashboard);
        return dashboardGraph ?? this.buildKnowledgeFallbackGraph(dashboard, limit);
    }

    protected normalizeKnowledgeGraph(response: MemoryGraph | MemoryKnowledgeGraphResponse): MemoryGraph | undefined {
        if (this.isMemoryGraph(response)) {
            return response;
        }
        if (response.graph && this.isMemoryGraph(response.graph)) {
            return response.graph;
        }
        if (Array.isArray(response.nodes) && Array.isArray(response.edges)) {
            return {
                title: response.title ?? 'Knowledge Graph',
                nodes: response.nodes,
                edges: response.edges
            };
        }
        return undefined;
    }

    protected isMemoryGraph(value: unknown): value is MemoryGraph {
        const graph = value as Partial<MemoryGraph>;
        return !!graph && typeof graph.title === 'string' && Array.isArray(graph.nodes) && Array.isArray(graph.edges);
    }

    protected resolveDashboardKnowledgeGraph(dashboard: MemoryDashboard): MemoryGraph | undefined {
        const graphs = dashboard.graphs as MemoryDashboard['graphs'] & { knowledge?: MemoryGraph };
        return graphs.knowledge;
    }

    protected buildKnowledgeFallbackGraph(dashboard: MemoryDashboard, limit: number): MemoryGraph {
        const rootId = 'knowledge-root';
        const memories = dashboard.memories
            .filter(memory => memory.status !== 'rejected' && memory.status !== 'blocked')
            .slice(0, limit);
        const nodes: MemoryGraphNode[] = [
            {
                id: rootId,
                kind: 'memory',
                label: 'Knowledge Graph',
                detail: 'Inferred from Memory memories',
                source: 'project-memory',
                semanticTags: ['knowledge', 'concept']
            },
            ...memories.map(memory => this.memoryConceptNode(memory))
        ];
        const edges: MemoryGraphEdge[] = memories.map(memory => ({
            id: `knowledge-root:${memory.id}`,
            sourceId: rootId,
            targetId: memory.id,
            relationType: 'related_to_memory',
            confidenceScore: memory.status === 'active' ? 0.85 : 0.55
        }));
        for (let index = 0; index < memories.length && edges.length < limit * 2; index++) {
            for (let otherIndex = index + 1; otherIndex < memories.length && edges.length < limit * 2; otherIndex++) {
                const left = memories[index];
                const right = memories[otherIndex];
                if (left.memoryType === right.memoryType || this.memoryTerms(left).some(term => this.memoryTerms(right).includes(term))) {
                    edges.push({
                        id: `knowledge-link:${left.id}:${right.id}`,
                        sourceId: left.id,
                        targetId: right.id,
                        relationType: 'related_to_memory',
                        confidenceScore: left.memoryType === right.memoryType ? 0.72 : 0.6
                    });
                }
            }
        }
        return { title: 'Knowledge Graph', nodes, edges };
    }

    protected memoryConceptNode(memory: MemoryItem): MemoryGraphNode {
        return {
            id: memory.id,
            kind: 'memory',
            label: memory.title,
            detail: memory.memoryType,
            source: 'project-memory',
            staleStatus: memory.staleStatus,
            semanticTags: ['knowledge', 'concept', memory.memoryType]
        };
    }

    protected memoryTerms(memory: MemoryItem): string[] {
        return `${memory.title} ${memory.content}`
            .toLowerCase()
            .split(/[^a-z0-9_]+/)
            .filter(term => term.length > 4)
            .slice(0, 24);
    }

    protected knowledgeExportFormatArg(value: unknown): MemoryKnowledgeExportFormat {
        return value === 'markdown' || value === 'dot' || value === 'json' ? value : 'json';
    }

    protected knowledgeGraphToMarkdown(graph: MemoryGraph): string {
        const nodeById = new Map(graph.nodes.map(node => [node.id, node]));
        const lines = [
            `# ${graph.title}`,
            '',
            `Exported: ${new Date().toISOString()}`,
            '',
            '## Concepts',
            ...graph.nodes.map(node => `- **${node.label}** (${node.kind}${node.detail ? `, ${node.detail}` : ''})`),
            '',
            '## Links',
            ...graph.edges.map(edge => {
                const source = nodeById.get(edge.sourceId)?.label ?? edge.sourceId;
                const target = nodeById.get(edge.targetId)?.label ?? edge.targetId;
                return `- ${source} --${edge.relationType} (${Math.round(edge.confidenceScore * 100)}%)--> ${target}`;
            })
        ];
        return `${lines.join('\n')}\n`;
    }

    protected knowledgeGraphToDot(graph: MemoryGraph): string {
        const lines = [
            'digraph "Memory Knowledge" {',
            '  rankdir=LR;'
        ];
        for (const node of graph.nodes) {
            lines.push(`  "${this.dotEscape(node.id)}" [label="${this.dotEscape(node.label)}"];`);
        }
        for (const edge of graph.edges) {
            lines.push(`  "${this.dotEscape(edge.sourceId)}" -> "${this.dotEscape(edge.targetId)}" [label="${this.dotEscape(edge.relationType)}"];`);
        }
        lines.push('}');
        return `${lines.join('\n')}\n`;
    }

    protected dotEscape(value: string): string {
        return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    }

    protected result(value: unknown): { content: Array<{ type: 'text'; text: string }> } {
        return {
            content: [{
                type: 'text',
                text: JSON.stringify(value, undefined, 2)
            }]
        };
    }

    protected stringArg(value: unknown): string | undefined {
        return typeof value === 'string' ? value : undefined;
    }

    protected requiredStringArg(value: unknown, name: string): string {
        if (typeof value !== 'string') {
            throw new Error(nls.localize('theia/memory/mcp/missingStringArg', 'Missing required string argument: {0}', name));
        }
        return value;
    }

    protected numberArg(value: unknown): number | undefined {
        return typeof value === 'number' ? value : undefined;
    }

    protected booleanArg(value: unknown): boolean | undefined {
        return typeof value === 'boolean' ? value : undefined;
    }

    protected sourceKindsArg(value: unknown): MemorySourceKind[] | undefined {
        return this.stringArrayArg(value)?.filter((sourceKind): sourceKind is MemorySourceKind =>
            SOURCE_KINDS.includes(sourceKind as typeof SOURCE_KINDS[number])
        );
    }

    protected sourceKindArg(value: unknown): MemorySourceKind | undefined {
        return typeof value === 'string' && SOURCE_KINDS.includes(value as typeof SOURCE_KINDS[number])
            ? value as MemorySourceKind
            : undefined;
    }

    protected memoryScopeArg(value: unknown): MemoryScope | undefined {
        return typeof value === 'string' && MEMORY_SCOPES.includes(value as typeof MEMORY_SCOPES[number])
            ? value as MemoryScope
            : undefined;
    }

    protected memoryScopesArg(value: unknown): MemoryScope[] | undefined {
        const scopes = this.stringArrayArg(value)?.filter((scope): scope is MemoryScope =>
            MEMORY_SCOPES.includes(scope as typeof MEMORY_SCOPES[number])
        );
        return scopes?.length ? scopes : undefined;
    }

    protected memoryTypeArg(value: unknown): MemoryItem['memoryType'] | undefined {
        return typeof value === 'string' && MEMORY_TYPES.includes(value as typeof MEMORY_TYPES[number])
            ? value as MemoryItem['memoryType']
            : undefined;
    }

    protected memoryStatusArg(value: unknown): MemoryItem['status'] | undefined {
        return typeof value === 'string' && MEMORY_STATUSES.includes(value as typeof MEMORY_STATUSES[number])
            ? value as MemoryItem['status']
            : undefined;
    }

    protected staleStatusArg(value: unknown): MemoryItem['staleStatus'] | undefined {
        return typeof value === 'string' && STALE_STATUSES.includes(value as typeof STALE_STATUSES[number])
            ? value as MemoryItem['staleStatus']
            : undefined;
    }

    protected memoryImportanceArg(value: unknown): MemoryImportance | undefined {
        return typeof value === 'string' && MEMORY_IMPORTANCE.includes(value as typeof MEMORY_IMPORTANCE[number])
            ? value as MemoryImportance
            : undefined;
    }

    protected memoryRetentionPolicyArg(value: unknown): MemoryItem['retentionPolicy'] | undefined {
        return typeof value === 'string' && MEMORY_RETENTION_POLICIES.includes(value as typeof MEMORY_RETENTION_POLICIES[number])
            ? value as MemoryItem['retentionPolicy']
            : undefined;
    }

    protected feedbackTargetKindArg(value: unknown): MemoryFeedbackTargetKind | undefined {
        return typeof value === 'string' && FEEDBACK_TARGET_KINDS.includes(value as typeof FEEDBACK_TARGET_KINDS[number])
            ? value as MemoryFeedbackTargetKind
            : undefined;
    }

    protected feedbackKindArg(value: unknown): MemoryFeedbackKind | undefined {
        return typeof value === 'string' && FEEDBACK_KINDS.includes(value as typeof FEEDBACK_KINDS[number])
            ? value as MemoryFeedbackKind
            : undefined;
    }

    protected transcriptRoleArg(value: unknown): typeof TRANSCRIPT_ROLES[number] {
        if (typeof value === 'string' && TRANSCRIPT_ROLES.includes(value as typeof TRANSCRIPT_ROLES[number])) {
            return value as typeof TRANSCRIPT_ROLES[number];
        }
        throw new Error(nls.localize('theia/memory/mcp/missingTranscriptRoleArg', 'Missing required transcript role argument: role'));
    }

    protected transcriptRolesArg(value: unknown): Array<typeof TRANSCRIPT_ROLES[number]> | undefined {
        const roles = this.stringArrayArg(value)?.filter((role): role is typeof TRANSCRIPT_ROLES[number] =>
            TRANSCRIPT_ROLES.includes(role as typeof TRANSCRIPT_ROLES[number])
        );
        return roles?.length ? roles : undefined;
    }

    protected stringArrayArg(value: unknown): string[] | undefined {
        return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : undefined;
    }

    protected requiredStringArrayArg(value: unknown, name: string): string[] {
        const values = this.stringArrayArg(value);
        if (!values) {
            throw new Error(nls.localize('theia/memory/mcp/missingStringArrayArg', 'Missing required string array argument: {0}', name));
        }
        return values;
    }

    protected retrievalResultsArg(value: unknown): RetrievalResult[] | undefined {
        if (!Array.isArray(value)) {
            return undefined;
        }
        return value.filter((candidate): candidate is RetrievalResult => {
            const result = candidate as Partial<RetrievalResult>;
            return typeof result.id === 'string'
                && typeof result.title === 'string'
                && typeof result.snippet === 'string'
                && typeof result.score === 'number'
                && typeof result.sourceKind === 'string'
                && SOURCE_KINDS.includes(result.sourceKind as typeof SOURCE_KINDS[number]);
        });
    }

    protected feedbackApi(): OptionalMemoryFeedbackApi {
        return this.memoryService as unknown as OptionalMemoryFeedbackApi;
    }

    protected knowledgeApi(): OptionalMemoryKnowledgeApi {
        return this.memoryService as unknown as OptionalMemoryKnowledgeApi;
    }

    protected async recordFeedback(request: MemoryFeedbackRequest): Promise<unknown> {
        const feedbackApi = this.feedbackApi();
        if (feedbackApi.recordFeedback) {
            return feedbackApi.recordFeedback(request);
        }
        const event = await this.memoryService.recordEvent({
            workspacePath: request.workspacePath,
            eventType: request.feedback === 'accepted' ? 'context.accepted' : 'context.rejected',
            promptSignature: request.promptSignature,
            payload: JSON.stringify({
                feedback: this.sanitizedFeedbackAuditPayload(request),
                fallback: 'event'
            })
        });
        return {
            storedVia: 'event',
            event
        };
    }

    protected async resolveFeedback(request: MemoryResolveFeedbackRequest): Promise<unknown> {
        const feedbackApi = this.feedbackApi();
        if (!feedbackApi.resolveFeedback) {
            return {
                resolved: undefined,
                audit: undefined,
                unavailable: 'resolveFeedback'
            };
        }
        const resolved = await feedbackApi.resolveFeedback(request);
        const audit = await this.memoryService.recordEvent({
            workspacePath: request.workspacePath,
            eventType: 'feedback.resolved',
            payload: JSON.stringify({
                feedbackId: request.id,
                resolved: Boolean(resolved),
                targetKind: resolved?.targetKind,
                targetId: resolved?.targetId,
                targetSourceKind: resolved?.targetSourceKind,
                feedback: resolved?.feedback,
                resolvedAt: resolved?.resolvedAt
            })
        });
        return {
            resolved,
            audit
        };
    }

    protected async searchFeedback(request: MemoryFeedbackMcpSearchRequest): Promise<unknown> {
        const feedbackApi = this.feedbackApi();
        const query = request.query?.toLowerCase();
        if (feedbackApi.searchFeedback) {
            const records = await feedbackApi.searchFeedback({ workspacePath: request.workspacePath, limit: request.limit });
            return query ? records.filter(record => this.feedbackRecordMatches(record, query)) : records;
        }
        if (feedbackApi.listFeedback) {
            const records = await feedbackApi.listFeedback({ workspacePath: request.workspacePath, limit: request.limit });
            return query ? records.filter(record => this.feedbackRecordMatches(record, query)) : records;
        }
        const events = await this.memoryService.listEvents({
            workspacePath: request.workspacePath,
            eventTypes: ['context.rejected', 'context.accepted'],
            limit: request.limit
        });
        const records: MemoryFeedbackRecord[] = events.map(event => {
            const payload = this.parseJsonObject(event.payload);
            const feedback = this.objectValue(payload?.feedback) ?? {};
            return {
                id: event.id,
                workspacePath: event.workspacePath,
                promptSignature: event.promptSignature,
                targetKind: this.feedbackTargetKindArg(feedback.targetKind) ?? 'retrieval-result',
                targetId: this.stringArg(feedback.targetId) ?? this.stringArg(feedback.id) ?? event.relativePath ?? event.id,
                targetSourceKind: this.sourceKindArg(feedback.targetSourceKind),
                targetUri: this.stringArg(feedback.targetUri),
                targetTitle: this.stringArg(feedback.targetTitle) ?? this.stringArg(feedback.title),
                feedback: this.feedbackKindArg(feedback.feedback) ?? (event.eventType === 'context.accepted' ? 'accepted' : 'rejected'),
                reason: this.stringArg(feedback?.reason),
                evidence: this.stringArg(feedback?.evidence),
                metadata: this.metadataArg(feedback?.metadata),
                createdAt: event.createdAt
            };
        });
        return query ? records.filter(record => this.feedbackRecordMatches(record, query)) : records;
    }

    protected feedbackRecordMatches(record: MemoryFeedbackRecord, query: string): boolean {
        return [
            record.promptSignature,
            record.targetKind,
            record.targetId,
            record.targetSourceKind,
            record.targetUri,
            record.targetTitle,
            record.feedback,
            record.reason,
            record.evidence,
            record.metadata ? JSON.stringify(record.metadata) : undefined
        ].filter((value): value is string => typeof value === 'string')
            .join('\n')
            .toLowerCase()
            .includes(query);
    }

    protected parseJsonObject(value?: string): Record<string, unknown> | undefined {
        if (!value) {
            return undefined;
        }
        try {
            return this.objectValue(JSON.parse(value) as unknown);
        } catch {
            return undefined;
        }
    }

    protected objectValue(value: unknown): Record<string, unknown> | undefined {
        return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
    }

    protected metadataArg(value: unknown): Record<string, string | number | boolean> | undefined {
        const metadata = this.objectValue(value);
        if (!metadata) {
            return undefined;
        }
        return Object.fromEntries(Object.entries(metadata).filter((entry): entry is [string, string | number | boolean] =>
            typeof entry[1] === 'string' || typeof entry[1] === 'number' || typeof entry[1] === 'boolean'
        ));
    }

    protected stringNumberBooleanMetadataArg(value: unknown): Record<string, string | number | boolean | undefined> | undefined {
        const metadata = this.objectValue(value);
        if (!metadata) {
            return undefined;
        }
        return Object.fromEntries(Object.entries(metadata).filter((entry): entry is [string, string | number | boolean | undefined] =>
            typeof entry[1] === 'string' || typeof entry[1] === 'number' || typeof entry[1] === 'boolean' || entry[1] === undefined
        ));
    }

    protected definedObject<T extends object>(value: T): T {
        return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
    }

    protected countBy<T>(items: readonly T[], keyOf: (item: T) => string): Record<string, number> {
        const counts: Record<string, number> = {};
        for (const item of items) {
            const key = keyOf(item);
            counts[key] = (counts[key] ?? 0) + 1;
        }
        return counts;
    }

    protected memoryTextScore(memory: MemoryItem, query: string | undefined): number {
        if (!query) {
            return memory.weight;
        }
        const title = memory.title.toLowerCase();
        const content = memory.content.toLowerCase();
        const evidence = memory.evidence?.toLowerCase() ?? '';
        const terms = query.split(/\s+/).filter(Boolean);
        return terms.reduce((score, term) => score
            + (title.includes(term) ? 4 : 0)
            + (content.includes(term) ? 2 : 0)
            + (evidence.includes(term) ? 1 : 0), 0) * Math.max(memory.weight, 0.1);
    }

    protected memorySpaceName(scope: MemoryScope, space?: MemorySpace): string {
        const label = space?.metadata?.label;
        if (typeof label === 'string' && label.trim()) {
            return label;
        }
        switch (scope) {
            case 'global':
                return 'IDE';
            case 'repository':
                return 'Repository';
            case 'session':
                return 'Session';
            case 'task':
                return 'Task';
            default:
                return 'Workspace';
        }
    }
}

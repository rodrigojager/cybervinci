// *****************************************************************************
// Copyright (C) 2026.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import {
    BlastRadiusImpact,
    BlastRadiusRequest,
    BlastRadiusResult,
    GraphCommunity,
    GraphCommunityDetectionRequest,
    GraphCommunityDetectionResult,
    GraphCommunityMainRelation,
    GraphCommunityRelationSummary,
    GodNodeAnalysisRequest,
    GodNodeAnalysisResult,
    GodNodeMetric,
    GraphDiffRequest,
    GraphDiffResult,
    GraphQueryRequest,
    GraphQueryResult,
    MemoryAnalysisCitation,
    MemoryCompactAnalysisContext,
    MemoryEvent,
    MemoryConflictAffectedDoc,
    MemoryConflictAffectedRelation,
    MemoryConflictAnalysisRequest,
    MemoryConflictAnalysisResult,
    MemoryConflictRiskArea,
    MemoryFile,
    MemoryGraph,
    MemoryGraphEdge,
    MemoryGraphNode,
    MemoryFlowAgentKind,
    MemoryFlowAgentSuggestion,
    MemoryItem,
    MemoryPullRequestAffectedCommunity,
    MemoryPullRequestGraphAnalysisRequest,
    MemoryPullRequestGraphAnalysisResult,
    MemoryPullRequestRecommendedContext,
    MemoryPullRequestRiskFile,
    MemoryPullRequestTouchedMemory,
    MemoryRelation,
    MemorySymbol
} from './memory-types';
import { SecretRedactionService } from './secret-redaction';

export class GraphQueryService {

    constructor(
        protected readonly files: readonly MemoryFile[] = [],
        protected readonly symbols: readonly MemorySymbol[] = [],
        protected readonly relations: readonly MemoryRelation[] = []
    ) { }

    callers(request: GraphQueryRequest): GraphQueryResult {
        return this.neighbors(request, relation => relation.relationType === 'calls' && relation.targetId === this.resolveNodeId(request));
    }

    callees(request: GraphQueryRequest): GraphQueryResult {
        return this.neighbors(request, relation => relation.relationType === 'calls' && relation.sourceId === this.resolveNodeId(request));
    }

    tests(request: GraphQueryRequest): GraphQueryResult {
        const targetId = this.resolveNodeId(request);
        return this.neighbors(request, relation => (relation.relationType === 'tests' && relation.targetId === targetId)
            || (relation.relationType === 'tested_by' && relation.sourceId === targetId));
    }

    relatedFiles(request: GraphQueryRequest): MemoryFile[] {
        const nodeIds = new Set(this.expand(request).nodes.map(node => node.id));
        const symbolFileIds = this.symbols.filter(symbol => nodeIds.has(symbol.id)).map(symbol => symbol.fileId);
        return this.files.filter(file => nodeIds.has(file.id) || symbolFileIds.includes(file.id));
    }

    expand(request: GraphQueryRequest): GraphQueryResult {
        const startId = this.resolveNodeId(request);
        if (!startId) {
            return { nodes: [], edges: [] };
        }
        const depth = request.depth ?? 1;
        const visited = new Set([startId]);
        const edgeIds = new Set<string>();
        let frontier = new Set([startId]);
        for (let level = 0; level < depth; level++) {
            const next = new Set<string>();
            for (const relation of this.relations) {
                if (frontier.has(relation.sourceId) || frontier.has(relation.targetId)) {
                    edgeIds.add(relation.id);
                    if (!visited.has(relation.sourceId)) {
                        next.add(relation.sourceId);
                        visited.add(relation.sourceId);
                    }
                    if (!visited.has(relation.targetId)) {
                        next.add(relation.targetId);
                        visited.add(relation.targetId);
                    }
                }
            }
            frontier = next;
        }
        return this.toResult(visited, edgeIds);
    }

    protected neighbors(request: GraphQueryRequest, predicate: (relation: MemoryRelation) => boolean): GraphQueryResult {
        const ids = new Set<string>();
        const edgeIds = new Set<string>();
        for (const relation of this.relations.filter(predicate)) {
            ids.add(relation.sourceId);
            ids.add(relation.targetId);
            edgeIds.add(relation.id);
        }
        return this.toResult(ids, edgeIds);
    }

    protected resolveNodeId(request: GraphQueryRequest): string | undefined {
        if (request.nodeId) {
            return request.nodeId;
        }
        if (request.filePath) {
            const normalized = request.filePath.replace(/\\/g, '/').toLowerCase();
            return this.files.find(file => file.relativePath.toLowerCase() === normalized)?.id;
        }
        if (request.symbolName) {
            return this.symbols.find(symbol => symbol.name === request.symbolName || symbol.fullName === request.symbolName)?.id;
        }
        return undefined;
    }

    protected toResult(nodeIds: Set<string>, edgeIds: Set<string>): GraphQueryResult {
        return {
            nodes: [
                ...this.files.filter(file => nodeIds.has(file.id)).map(file => this.fileNode(file)),
                ...this.symbols.filter(symbol => nodeIds.has(symbol.id)).map(symbol => this.symbolNode(symbol))
            ],
            edges: this.relations.filter(relation => edgeIds.has(relation.id)).map(relation => this.edge(relation))
        };
    }

    protected fileNode(file: MemoryFile): MemoryGraphNode {
        return {
            id: file.id,
            kind: 'file',
            label: file.fileName,
            detail: file.relativePath,
            source: 'code'
        };
    }

    protected symbolNode(symbol: MemorySymbol): MemoryGraphNode {
        return {
            id: symbol.id,
            kind: 'symbol',
            label: symbol.name,
            detail: symbol.symbolKind,
            source: 'code-graph'
        };
    }

    protected edge(relation: MemoryRelation): MemoryGraphEdge {
        return {
            id: relation.id,
            sourceId: relation.sourceId,
            targetId: relation.targetId,
            relationType: relation.relationType,
            confidenceScore: relation.confidenceScore
        };
    }
}

export class BlastRadiusAnalyzer {

    protected readonly semanticImpactRelationTypes = new Set<MemoryRelation['relationType']>([
        'inherits',
        'implements',
        'overrides',
        'maps_to_endpoint',
        'injects',
        'uses_dependency',
        'uses_db_context',
        'uses_entity',
        'tests',
        'tested_by'
    ]);

    analyze(request: BlastRadiusRequest): BlastRadiusResult {
        const graphQuery = new GraphQueryService(request.files, request.symbols, request.relations);
        const impacts: BlastRadiusImpact[] = [];
        const graphNodes = new Map<string, MemoryGraphNode>();
        const graphEdges = new Map<string, MemoryGraphEdge>();
        const changedFilePaths = new Set([
            ...request.changedFilePaths,
            ...(request.events ?? [])
                .filter(event => event.eventType === 'file.edited' && event.relativePath)
                .map(event => event.relativePath as string)
        ].map(changedPath => changedPath.replace(/\\/g, '/').toLowerCase()));

        for (const changedPath of changedFilePaths) {
            const file = request.files.find(candidate => candidate.relativePath.toLowerCase() === changedPath);
            if (!file) {
                continue;
            }
            const expanded = graphQuery.expand({ nodeId: file.id, depth: request.maxDepth ?? 2 });
            for (const node of expanded.nodes) {
                graphNodes.set(node.id, node);
            }
            for (const edge of expanded.edges) {
                graphEdges.set(edge.id, edge);
            }
            const relatedSymbols = request.symbols.filter(symbol => symbol.fileId === file.id || expanded.nodes.some(node => node.id === symbol.id));
            const expandedEdgeIds = new Set(expanded.edges.map(edge => edge.id));
            const relatedTestIds = this.relatedTestFileIds(file, expanded, request);
            const relatedTests = [...relatedTestIds]
                .map(fileId => request.files.find(candidate => candidate.id === fileId))
                .filter((candidate): candidate is MemoryFile => candidate !== undefined)
                .filter(candidate => this.isTestFile(candidate, request.symbols));
            const semanticRelations = request.relations.filter(relation => expandedEdgeIds.has(relation.id) && this.semanticImpactRelationTypes.has(relation.relationType));
            const relationSummary = this.semanticRelationSummary(semanticRelations);
            const callRelations = request.relations.filter(relation => expandedEdgeIds.has(relation.id) && relation.relationType === 'calls');
            const centralityScore = this.centralityScore(file, request.symbols, request.relations);
            const recentChangeCount = this.recentChangeCount(file, request.events ?? []);
            const sensitiveMemoryIds = this.relatedSensitiveMemories(file, relatedSymbols, request.memories ?? []);
            const coverageStatus = relatedTests.length ? 'covered' : 'low_inferred_coverage';
            const reasons = [
                file.isSensitive ? 'Sensitive file changed.' : undefined,
                file.isGenerated ? 'Generated file changed.' : undefined,
                centralityScore >= 0.5 ? `High graph centrality (${centralityScore}).` : undefined,
                recentChangeCount > 1 ? `${recentChangeCount} recent change events.` : undefined,
                relatedSymbols.length ? `${relatedSymbols.length} related symbols.` : undefined,
                relationSummary.inheritance ? `${relationSummary.inheritance} inheritance/interface/override relations.` : undefined,
                relationSummary.endpoints ? `${relationSummary.endpoints} endpoint relations.` : undefined,
                relationSummary.di ? `${relationSummary.di} dependency-injection relations.` : undefined,
                relationSummary.dbContext ? `${relationSummary.dbContext} DbContext/entity relations.` : undefined,
                relationSummary.tests ? `${relationSummary.tests} test relations.` : undefined,
                callRelations.length ? `${callRelations.length} call relations.` : undefined,
                relatedTests.length ? `${relatedTests.length} related tests.` : 'Low inferred coverage: no related tests.',
                sensitiveMemoryIds.length ? `${sensitiveMemoryIds.length} related sensitive memories.` : undefined
            ].filter((reason): reason is string => reason !== undefined);
            impacts.push({
                file,
                riskScore: this.riskScore(file, relatedSymbols, relatedTests, semanticRelations.length + callRelations.length, centralityScore, recentChangeCount, sensitiveMemoryIds.length),
                reasons,
                relatedSymbols,
                relatedTests,
                centralityScore,
                recentChangeCount,
                coverageStatus,
                sensitiveMemoryIds
            });
        }

        const graph: MemoryGraph = {
            title: 'Blast Radius',
            nodes: [...graphNodes.values()],
            edges: [...graphEdges.values()]
        };
        return {
            impacts: impacts.sort((left, right) => right.riskScore - left.riskScore),
            graph
        };
    }

    protected relatedTestFileIds(file: MemoryFile, expanded: GraphQueryResult, request: BlastRadiusRequest): Set<string> {
        const expandedNodeIds = new Set(expanded.nodes.map(node => node.id));
        const fileSymbolIds = new Set(request.symbols.filter(symbol => symbol.fileId === file.id).map(symbol => symbol.id));
        const targetIds = new Set([file.id, ...fileSymbolIds]);
        const testFileIds = new Set<string>();
        for (const node of expanded.nodes) {
            const symbol = request.symbols.find(candidate => candidate.id === node.id);
            if (symbol?.symbolKind === 'test_method') {
                testFileIds.add(symbol.fileId);
            }
        }
        for (const relation of request.relations) {
            if (relation.relationType === 'tests' && (targetIds.has(relation.targetId) || expandedNodeIds.has(relation.sourceId) || expandedNodeIds.has(relation.targetId))) {
                this.addTestFileId(testFileIds, relation.sourceId, request.symbols);
            }
            if (relation.relationType === 'tested_by' && (targetIds.has(relation.sourceId) || expandedNodeIds.has(relation.sourceId) || expandedNodeIds.has(relation.targetId))) {
                this.addTestFileId(testFileIds, relation.targetId, request.symbols);
            }
        }
        return testFileIds;
    }

    protected addTestFileId(testFileIds: Set<string>, nodeId: string, symbols: readonly MemorySymbol[]): void {
        const symbol = symbols.find(candidate => candidate.id === nodeId);
        if (symbol?.symbolKind === 'test_method') {
            testFileIds.add(symbol.fileId);
        } else if (!symbol) {
            testFileIds.add(nodeId);
        }
    }

    protected semanticRelationSummary(relations: readonly MemoryRelation[]): { inheritance: number; endpoints: number; di: number; dbContext: number; tests: number } {
        return {
            inheritance: relations.filter(relation => relation.relationType === 'inherits' || relation.relationType === 'implements' || relation.relationType === 'overrides').length,
            endpoints: relations.filter(relation => relation.relationType === 'maps_to_endpoint').length,
            di: relations.filter(relation => relation.relationType === 'injects' || relation.relationType === 'uses_dependency').length,
            dbContext: relations.filter(relation => relation.relationType === 'uses_db_context' || relation.relationType === 'uses_entity').length,
            tests: relations.filter(relation => relation.relationType === 'tests' || relation.relationType === 'tested_by').length
        };
    }

    protected riskScore(file: MemoryFile, symbols: MemorySymbol[], tests: MemoryFile[], relationCount = 0, centralityScore = 0, recentChangeCount = 0, sensitiveMemoryCount = 0): number {
        let score = 0.2;
        score += Math.min(0.4, symbols.length * 0.04);
        score += Math.min(0.2, relationCount * 0.03);
        score += tests.length ? -0.1 : 0.2;
        score += Math.min(0.2, centralityScore * 0.2);
        score += Math.min(0.15, Math.max(0, recentChangeCount - 1) * 0.05);
        score += Math.min(0.2, sensitiveMemoryCount * 0.1);
        score += file.isSensitive ? 0.2 : 0;
        score += file.isGenerated ? 0.1 : 0;
        return Math.max(0, Math.min(1, Number(score.toFixed(2))));
    }

    protected centralityScore(file: MemoryFile, symbols: readonly MemorySymbol[], relations: readonly MemoryRelation[]): number {
        const nodeIds = new Set([file.id, ...symbols.filter(symbol => symbol.fileId === file.id).map(symbol => symbol.id)]);
        const degree = relations.filter(relation => nodeIds.has(relation.sourceId) || nodeIds.has(relation.targetId)).length;
        return Number(Math.min(1, degree / 10).toFixed(2));
    }

    protected recentChangeCount(file: MemoryFile, events: readonly MemoryEvent[]): number {
        const relativePath = file.relativePath.toLowerCase();
        return events.filter(event => event.eventType === 'file.edited' && event.relativePath?.toLowerCase() === relativePath).length;
    }

    protected relatedSensitiveMemories(file: MemoryFile, symbols: readonly MemorySymbol[], memories: readonly MemoryItem[]): string[] {
        const terms = [
            file.relativePath,
            file.fileName,
            ...symbols.flatMap(symbol => [symbol.name, symbol.fullName].filter((value): value is string => !!value))
        ]
            .map(term => term.toLowerCase())
            .filter(term => term.length >= 4);
        return memories
            .filter(memory => memory.status === 'active')
            .filter(memory => memory.memoryType === 'security_note' || memory.importance === 'critical' || memory.originMarkers?.includes('sensitive'))
            .filter(memory => {
                const haystack = `${memory.title} ${memory.content} ${memory.evidence ?? ''}`.toLowerCase();
                return terms.some(term => haystack.includes(term));
            })
            .map(memory => memory.id);
    }

    protected isTestFile(file: MemoryFile, symbols: readonly MemorySymbol[]): boolean {
        const normalizedPath = file.relativePath.toLowerCase();
        return normalizedPath.includes('/test/')
            || normalizedPath.includes('/tests/')
            || normalizedPath.endsWith('.spec.ts')
            || normalizedPath.endsWith('.test.ts')
            || normalizedPath.endsWith('.spec.tsx')
            || normalizedPath.endsWith('.test.tsx')
            || normalizedPath.endsWith('test.cs')
            || symbols.some(symbol => symbol.fileId === file.id && symbol.symbolKind === 'test_method');
    }
}

export class PullRequestGraphAnalyzer {

    protected readonly redaction = new SecretRedactionService();

    analyze(request: MemoryPullRequestGraphAnalysisRequest): MemoryPullRequestGraphAnalysisResult {
        const changedFilePaths = this.normalizedChangedPaths(request.changedFilePaths);
        const blastRadius = new BlastRadiusAnalyzer().analyze(request);
        const communities = new GraphCommunityAnalyzer().analyze({
            files: request.files,
            symbols: request.symbols,
            relations: request.relations
        }).communities;
        const affectedCommunities = this.affectedCommunities(communities, blastRadius.impacts, request.files, request.symbols, changedFilePaths);
        const highRiskFiles = blastRadius.impacts
            .map(impact => this.riskFile(impact))
            .sort((left, right) => right.riskScore - left.riskScore || left.relativePath.localeCompare(right.relativePath));
        const relatedTests = this.uniqueFiles(blastRadius.impacts.flatMap(impact => impact.relatedTests));
        const touchedMemories = this.touchedMemories(request.memories ?? [], blastRadius.impacts, request.symbols);
        const recommendedContext = this.recommendedContext(request, highRiskFiles, relatedTests, touchedMemories, affectedCommunities)
            .slice(0, Math.max(1, request.contextLimit ?? 12));
        const flowAgentSuggestions = this.flowAgentSuggestions(highRiskFiles, relatedTests, affectedCommunities);
        const summary = this.summary(changedFilePaths.length, affectedCommunities.length, highRiskFiles, relatedTests.length, touchedMemories.length);

        return this.redaction.redactJson({
            changedFilePaths,
            affectedCommunities,
            highRiskFiles,
            relatedTests,
            touchedMemories,
            recommendedContext,
            flowAgentSuggestions,
            blastRadius,
            graph: blastRadius.graph,
            compactContext: this.compactContext(summary, recommendedContext, request.files, request.symbols, request.relations, touchedMemories, affectedCommunities),
            summary
        });
    }

    protected affectedCommunities(
        communities: readonly GraphCommunity[],
        impacts: readonly BlastRadiusImpact[],
        files: readonly MemoryFile[],
        symbols: readonly MemorySymbol[],
        changedFilePaths: readonly string[]
    ): MemoryPullRequestAffectedCommunity[] {
        const changedPathSet = new Set(changedFilePaths.map(path => path.toLowerCase()));
        const impactsByFileId = new Map(impacts.map(impact => [impact.file.id, impact]));
        const fileIdsBySymbolId = new Map(symbols.map(symbol => [symbol.id, symbol.fileId]));
        return communities
            .map(community => {
                const communityFileIds = new Set([
                    ...community.fileIds,
                    ...community.symbolIds.map(symbolId => fileIdsBySymbolId.get(symbolId)).filter((fileId): fileId is string => !!fileId)
                ]);
                const communityFiles = files.filter(file => communityFileIds.has(file.id));
                const impacted = communityFiles.filter(file => impactsByFileId.has(file.id));
                const changed = communityFiles.filter(file => changedPathSet.has(file.relativePath.toLowerCase()));
                if (!impacted.length && !changed.length) {
                    return undefined;
                }
                const maxRisk = Math.max(...[...impacted, ...changed].map(file => impactsByFileId.get(file.id)?.riskScore ?? 0.2));
                return {
                    community,
                    changedFilePaths: changed.map(file => file.relativePath).sort(),
                    impactedFilePaths: impacted.map(file => file.relativePath).sort(),
                    riskScore: Number(maxRisk.toFixed(2)),
                    reasons: [
                        `${changed.length} changed file(s) in community.`,
                        `${impacted.length} impacted file(s) in blast radius.`,
                        community.reasons[0]
                    ].filter((reason): reason is string => !!reason)
                };
            })
            .filter((community): community is MemoryPullRequestAffectedCommunity => !!community)
            .sort((left, right) => right.riskScore - left.riskScore || right.community.score - left.community.score || left.community.name.localeCompare(right.community.name));
    }

    protected riskFile(impact: BlastRadiusImpact): MemoryPullRequestRiskFile {
        return {
            relativePath: impact.file.relativePath,
            riskScore: impact.riskScore,
            reasons: impact.reasons,
            relatedSymbolIds: impact.relatedSymbols.map(symbol => symbol.id).sort(),
            relatedTestPaths: impact.relatedTests.map(file => file.relativePath).sort(),
            sensitiveMemoryIds: impact.sensitiveMemoryIds ?? []
        };
    }

    protected touchedMemories(
        memories: readonly MemoryItem[],
        impacts: readonly BlastRadiusImpact[],
        symbols: readonly MemorySymbol[]
    ): MemoryPullRequestTouchedMemory[] {
        const terms = new Set<string>();
        for (const impact of impacts) {
            for (const value of [impact.file.relativePath, impact.file.fileName, ...impact.relatedSymbols.flatMap(symbol => [symbol.name, symbol.fullName].filter(Boolean) as string[])]) {
                if (value.length >= 4) {
                    terms.add(value.toLowerCase());
                }
            }
        }
        for (const symbol of symbols.filter(symbol => terms.has(symbol.fileId.toLowerCase()))) {
            terms.add(symbol.name.toLowerCase());
        }
        return memories
            .filter(memory => memory.status === 'active')
            .filter(memory => memory.memoryType !== 'security_note')
            .filter(memory => {
                const haystack = `${memory.title} ${memory.content} ${memory.evidence ?? ''} ${(memory.originMarkers ?? []).join(' ')}`.toLowerCase();
                return [...terms].some(term => haystack.includes(term));
            })
            .map(memory => ({
                id: memory.id,
                title: memory.title,
                scope: memory.scope,
                source: memory.source,
                importance: memory.importance,
                weight: memory.weight,
                staleStatus: memory.staleStatus,
                status: memory.status,
                evidence: memory.evidence,
                reason: `Matched changed graph terms for ${memory.scope} memory.`
            }))
            .sort((left, right) => this.importanceRank(right.importance) - this.importanceRank(left.importance) || right.weight - left.weight || left.title.localeCompare(right.title));
    }

    protected recommendedContext(
        request: MemoryPullRequestGraphAnalysisRequest,
        highRiskFiles: readonly MemoryPullRequestRiskFile[],
        relatedTests: readonly MemoryFile[],
        touchedMemories: readonly MemoryPullRequestTouchedMemory[],
        affectedCommunities: readonly MemoryPullRequestAffectedCommunity[]
    ): MemoryPullRequestRecommendedContext[] {
        const contexts: MemoryPullRequestRecommendedContext[] = [
            ...highRiskFiles.map(file => ({
                id: `file:${file.relativePath}`,
                sourceKind: 'code' as const,
                title: file.relativePath,
                uri: file.relativePath,
                score: file.riskScore,
                evidence: file.reasons.join(' '),
                reason: 'High-risk changed file from graph blast radius.'
            })),
            ...relatedTests.map(file => ({
                id: `test:${file.relativePath}`,
                sourceKind: 'code-graph' as const,
                title: file.relativePath,
                uri: file.relativePath,
                score: 0.72,
                evidence: 'Related test inferred from graph relations.',
                reason: 'Relevant validation target for this PR.'
            })),
            ...touchedMemories.map(memory => ({
                id: memory.id,
                sourceKind: memory.scope === 'repository' ? 'repository-memory' as const : 'project-memory' as const,
                title: memory.title,
                score: Math.min(1, memory.weight + this.importanceRank(memory.importance) * 0.08),
                evidence: memory.evidence ?? memory.reason,
                reason: `Touched ${memory.scope} memory; status=${memory.status}; stale=${memory.staleStatus}; importance=${memory.importance}.`
            })),
            ...affectedCommunities.map(community => ({
                id: `community:${community.community.id}`,
                sourceKind: 'code-graph' as const,
                title: community.community.name,
                score: community.riskScore,
                evidence: community.reasons.join(' '),
                reason: 'Affected graph community summarizes neighboring code context.'
            }))
        ];
        return contexts
            .filter(context => request.files.some(file => context.uri === file.relativePath) || !context.uri || !request.files.find(file => file.relativePath === context.uri)?.isSensitive)
            .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title));
    }

    protected flowAgentSuggestions(
        highRiskFiles: readonly MemoryPullRequestRiskFile[],
        relatedTests: readonly MemoryFile[],
        affectedCommunities: readonly MemoryPullRequestAffectedCommunity[]
    ): MemoryFlowAgentSuggestion[] {
        const suggestions: MemoryFlowAgentSuggestion[] = [];
        const topRisk = highRiskFiles[0]?.riskScore ?? 0;
        const riskFiles = highRiskFiles.filter(file => file.riskScore >= 0.5);
        const securityFiles = highRiskFiles.filter(file => file.sensitiveMemoryIds.length || file.reasons.some(reason => /sensitive|secret|security/i.test(reason)));
        const uncoveredRiskFiles = highRiskFiles.filter(file => !file.relatedTestPaths.length && file.riskScore >= 0.45);
        if (affectedCommunities.length >= 2 || topRisk >= 0.65) {
            suggestions.push(this.agentSuggestion('impact', 'Flow impact mapper', Math.max(0.62, topRisk), affectedCommunities, riskFiles, [
                `${affectedCommunities.length} affected graph communit${affectedCommunities.length === 1 ? 'y' : 'ies'}.`,
                `${riskFiles.length} high-risk file(s).`
            ], 'Map cross-community blast radius before implementation or merge.'));
        }
        if (topRisk >= 0.55 || riskFiles.length >= 2) {
            suggestions.push(this.agentSuggestion('review', 'Flow code reviewer', Math.max(0.58, topRisk), affectedCommunities, riskFiles, [
                `Top graph risk score ${topRisk.toFixed(2)}.`,
                `${riskFiles.length} file(s) at or above review threshold.`
            ], 'Review risky code paths and ranking evidence from Memory.'));
        }
        if (uncoveredRiskFiles.length || relatedTests.length) {
            suggestions.push(this.agentSuggestion('tests', 'Flow test planner', Math.max(0.5, uncoveredRiskFiles[0]?.riskScore ?? 0.54), affectedCommunities, uncoveredRiskFiles.length ? uncoveredRiskFiles : highRiskFiles, [
                `${relatedTests.length} related test file(s) inferred.`,
                `${uncoveredRiskFiles.length} risky file(s) without inferred tests.`
            ], uncoveredRiskFiles.length ? 'Add or target validation for risky files with low inferred coverage.' : 'Run the inferred validation targets for this change.'));
        }
        if (securityFiles.length) {
            suggestions.push(this.agentSuggestion('security', 'Flow security reviewer', Math.max(0.7, securityFiles[0].riskScore), affectedCommunities, securityFiles, [
                `${securityFiles.length} security-sensitive file or memory signal(s).`
            ], 'Review security-sensitive paths without exporting raw sensitive content.'));
        }
        return suggestions.sort((left, right) => right.priority - left.priority || left.kind.localeCompare(right.kind));
    }

    protected agentSuggestion(
        kind: MemoryFlowAgentKind,
        title: string,
        riskScore: number,
        communities: readonly MemoryPullRequestAffectedCommunity[],
        files: readonly MemoryPullRequestRiskFile[],
        evidence: readonly string[],
        reason: string
    ): MemoryFlowAgentSuggestion {
        const affectedFilePaths = [...new Set(files.flatMap(file => [file.relativePath, ...file.relatedTestPaths]))].sort();
        return {
            id: `agency:${kind}`,
            kind,
            title,
            priority: Number(Math.min(1, riskScore + communities.length * 0.03 + files.length * 0.02).toFixed(2)),
            riskScore: Number(Math.min(1, riskScore).toFixed(2)),
            affectedCommunityIds: communities.map(community => community.community.id).sort(),
            affectedFilePaths,
            evidence: evidence.join(' '),
            reason
        };
    }

    protected uniqueFiles(files: readonly MemoryFile[]): MemoryFile[] {
        return [...new Map(files.map(file => [file.id, file])).values()]
            .sort((left, right) => left.relativePath.localeCompare(right.relativePath));
    }

    protected normalizedChangedPaths(paths: readonly string[]): string[] {
        return [...new Set(paths.map(path => path.trim().replace(/\\/g, '/')).filter(Boolean))]
            .sort((left, right) => left.localeCompare(right));
    }

    protected importanceRank(importance: MemoryItem['importance']): number {
        return ({ critical: 4, high: 3, medium: 2, low: 1 })[importance] ?? 0;
    }

    protected summary(changedCount: number, communityCount: number, riskFiles: readonly MemoryPullRequestRiskFile[], testCount: number, memoryCount: number): string {
        const topRisk = riskFiles[0];
        return [
            `${changedCount} changed file(s) analyzed.`,
            `${communityCount} affected communit${communityCount === 1 ? 'y' : 'ies'}.`,
            `${riskFiles.length} risk file(s), top risk ${topRisk ? `${topRisk.relativePath} (${topRisk.riskScore})` : 'none'}.`,
            `${testCount} related test file(s).`,
            `${memoryCount} touched memor${memoryCount === 1 ? 'y' : 'ies'}.`
        ].join(' ');
    }

    protected compactContext(
        summary: string,
        recommendedContext: readonly MemoryPullRequestRecommendedContext[],
        files: readonly MemoryFile[],
        symbols: readonly MemorySymbol[],
        relations: readonly MemoryRelation[],
        memories: readonly MemoryPullRequestTouchedMemory[],
        communities: readonly MemoryPullRequestAffectedCommunity[]
    ): MemoryCompactAnalysisContext {
        const citedFilePaths = new Set(recommendedContext.map(context => context.uri).filter((uri): uri is string => !!uri));
        const citedFileIds = new Set(files.filter(file => citedFilePaths.has(file.relativePath)).map(file => file.id));
        const citedSymbolIds = new Set([
            ...symbols.filter(symbol => citedFileIds.has(symbol.fileId)).map(symbol => symbol.id),
            ...relations
                .filter(relation => citedFileIds.has(relation.sourceId) || citedFileIds.has(relation.targetId))
                .flatMap(relation => [relation.sourceId, relation.targetId])
        ]);
        const citations: MemoryAnalysisCitation[] = [
            ...files
                .filter(file => citedFilePaths.has(file.relativePath))
                .map(file => ({
                    id: file.id,
                    kind: 'file' as const,
                    title: file.relativePath,
                    uri: file.relativePath,
                    sourceKind: 'code' as const,
                    reason: 'Referenced by recommended PR context.'
                })),
            ...symbols
                .filter(symbol => citedSymbolIds.has(symbol.id))
                .slice(0, 12)
                .map(symbol => ({
                    id: symbol.id,
                    kind: 'symbol' as const,
                    title: symbol.fullName ?? symbol.name,
                    uri: files.find(file => file.id === symbol.fileId)?.relativePath,
                    sourceKind: 'code-graph' as const,
                    reason: 'Symbol is inside or adjacent to cited files.'
                })),
            ...memories.map(memory => ({
                id: memory.id,
                kind: 'memory' as const,
                title: memory.title,
                scope: memory.scope,
                sourceKind: memory.scope === 'repository' ? 'repository-memory' as const : 'project-memory' as const,
                evidence: memory.evidence,
                reason: memory.reason
            })),
            ...relations
                .filter(relation => citedSymbolIds.has(relation.sourceId) || citedSymbolIds.has(relation.targetId) || citedFileIds.has(relation.sourceId) || citedFileIds.has(relation.targetId))
                .slice(0, 12)
                .map(relation => ({
                    id: relation.id,
                    kind: 'relation' as const,
                    title: `${relation.sourceId} ${relation.relationType} ${relation.targetId}`,
                    sourceKind: 'code-graph' as const,
                    evidence: relation.evidence,
                    reason: 'Relation supports the compact PR context.'
                })),
            ...communities.slice(0, 6).map(community => ({
                id: community.community.id,
                kind: 'community' as const,
                title: community.community.name,
                sourceKind: 'code-graph' as const,
                evidence: community.reasons.join(' '),
                reason: 'Affected graph community cited for blast-radius context.'
            }))
        ];
        return {
            summary,
            highlights: recommendedContext.slice(0, 5).map(context => `${context.title}: ${context.reason}`),
            recommendedContext: [...recommendedContext],
            citations: this.uniqueCitations(citations)
        };
    }

    protected uniqueCitations(citations: readonly MemoryAnalysisCitation[]): MemoryAnalysisCitation[] {
        return [...new Map(citations.map(citation => [`${citation.kind}:${citation.id}`, citation])).values()];
    }
}

export class ConflictAnalysisAnalyzer {

    protected readonly redaction = new SecretRedactionService();

    analyze(request: MemoryConflictAnalysisRequest): MemoryConflictAnalysisResult {
        const pullRequestAnalysis = new PullRequestGraphAnalyzer().analyze({
            ...request,
            changedFilePaths: request.conflictingFilePaths
        });
        const affectedNodeIds = this.affectedNodeIds(pullRequestAnalysis);
        const affectedRelations = this.affectedRelations(request.relations, affectedNodeIds);
        const affectedDocs = this.affectedDocs(affectedRelations);
        const riskAreas = this.riskAreas(pullRequestAnalysis, affectedRelations, affectedDocs);
        const recommendedContext = this.recommendedContext(pullRequestAnalysis.recommendedContext, affectedDocs, request.contextLimit);
        const summary = this.summary(pullRequestAnalysis.changedFilePaths.length, affectedRelations.length, pullRequestAnalysis.touchedMemories.length, affectedDocs.length, riskAreas);
        return this.redaction.redactJson({
            conflictingFilePaths: pullRequestAnalysis.changedFilePaths,
            affectedRelations,
            affectedMemories: pullRequestAnalysis.touchedMemories,
            affectedDocs,
            riskAreas,
            recommendedContext,
            pullRequestAnalysis,
            compactContext: this.compactContext(summary, recommendedContext, pullRequestAnalysis.compactContext.citations, affectedRelations, affectedDocs, riskAreas),
            summary
        });
    }

    protected affectedNodeIds(analysis: MemoryPullRequestGraphAnalysisResult): Set<string> {
        return new Set([
            ...analysis.blastRadius.graph.nodes.map(node => node.id),
            ...analysis.blastRadius.graph.edges.flatMap(edge => [edge.sourceId, edge.targetId]),
            ...analysis.highRiskFiles.flatMap(file => file.relatedSymbolIds)
        ]);
    }

    protected affectedRelations(
        relations: readonly MemoryRelation[],
        affectedNodeIds: Set<string>
    ): MemoryConflictAffectedRelation[] {
        return relations
            .filter(relation => affectedNodeIds.has(relation.sourceId) || affectedNodeIds.has(relation.targetId))
            .map(relation => ({
                id: relation.id,
                sourceKind: relation.sourceKind,
                sourceId: relation.sourceId,
                targetKind: relation.targetKind,
                targetId: relation.targetId,
                relationType: relation.relationType,
                confidenceScore: relation.confidenceScore,
                evidence: relation.evidence,
                reason: relation.sourceKind === 'doc' || relation.targetKind === 'doc'
                    ? 'Documentation relation connected to the conflict blast radius.'
                    : 'Relation touches a conflicting or impacted graph node.'
            }))
            .sort((left, right) => right.confidenceScore - left.confidenceScore || left.relationType.localeCompare(right.relationType) || left.id.localeCompare(right.id));
    }

    protected affectedDocs(relations: readonly MemoryConflictAffectedRelation[]): MemoryConflictAffectedDoc[] {
        const docs = new Map<string, MemoryConflictAffectedDoc>();
        for (const relation of relations.filter(candidate => candidate.sourceKind === 'doc' || candidate.targetKind === 'doc')) {
            const id = relation.sourceKind === 'doc' ? relation.sourceId : relation.targetId;
            const existing = docs.get(id);
            docs.set(id, {
                id,
                title: this.docTitle(id),
                uri: this.docUri(id),
                relationIds: [...(existing?.relationIds ?? []), relation.id].sort(),
                evidence: existing?.evidence ?? relation.evidence,
                reason: 'Document is connected by graph relation to a conflicting file, symbol, or impacted neighbor.'
            });
        }
        return [...docs.values()].sort((left, right) => left.title.localeCompare(right.title));
    }

    protected riskAreas(
        analysis: MemoryPullRequestGraphAnalysisResult,
        relations: readonly MemoryConflictAffectedRelation[],
        docs: readonly MemoryConflictAffectedDoc[]
    ): MemoryConflictRiskArea[] {
        const relationTypes = [...new Set(relations.map(relation => relation.relationType))].sort();
        const docIds = docs.map(doc => doc.id);
        const memoryIds = analysis.touchedMemories.map(memory => memory.id);
        return analysis.affectedCommunities.map(community => ({
            id: `risk:${community.community.id}`,
            title: community.community.name,
            riskScore: community.riskScore,
            affectedFilePaths: [...new Set([...community.changedFilePaths, ...community.impactedFilePaths])].sort(),
            relationTypes,
            memoryIds,
            docIds,
            reasons: [
                ...community.reasons,
                memoryIds.length ? `${memoryIds.length} memory item(s) may need review.` : undefined,
                docIds.length ? `${docIds.length} documentation item(s) may need review.` : undefined
            ].filter((reason): reason is string => !!reason)
        })).sort((left, right) => right.riskScore - left.riskScore || left.title.localeCompare(right.title));
    }

    protected recommendedContext(
        base: readonly MemoryPullRequestRecommendedContext[],
        docs: readonly MemoryConflictAffectedDoc[],
        limit = 12
    ): MemoryPullRequestRecommendedContext[] {
        return [
            ...base,
            ...docs.map(doc => ({
                id: `doc:${doc.id}`,
                sourceKind: 'local-docs' as const,
                title: doc.title,
                uri: doc.uri,
                score: 0.74,
                evidence: doc.evidence ?? `relations:${doc.relationIds.join(',')}`,
                reason: 'Documentation linked to the conflict blast radius.'
            }))
        ]
            .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title))
            .slice(0, Math.max(1, limit));
    }

    protected docTitle(id: string): string {
        return id.replace(/^doc[:_]/, '').replace(/[_/\\-]+/g, ' ');
    }

    protected docUri(id: string): string | undefined {
        return /[/.]/.test(id) ? id.replace(/^doc[:_]/, '') : undefined;
    }

    protected summary(conflictCount: number, relationCount: number, memoryCount: number, docCount: number, riskAreas: readonly MemoryConflictRiskArea[]): string {
        const topRisk = riskAreas[0];
        return [
            `${conflictCount} conflicting file(s) analyzed.`,
            `${relationCount} affected relation(s).`,
            `${memoryCount} affected memor${memoryCount === 1 ? 'y' : 'ies'}.`,
            `${docCount} affected doc(s).`,
            `Top risk area ${topRisk ? `${topRisk.title} (${topRisk.riskScore})` : 'none'}.`
        ].join(' ');
    }

    protected compactContext(
        summary: string,
        recommendedContext: readonly MemoryPullRequestRecommendedContext[],
        baseCitations: readonly MemoryAnalysisCitation[],
        relations: readonly MemoryConflictAffectedRelation[],
        docs: readonly MemoryConflictAffectedDoc[],
        riskAreas: readonly MemoryConflictRiskArea[]
    ): MemoryCompactAnalysisContext {
        const citations: MemoryAnalysisCitation[] = [
            ...baseCitations,
            ...relations.slice(0, 12).map(relation => ({
                id: relation.id,
                kind: 'relation' as const,
                title: `${relation.sourceId} ${relation.relationType} ${relation.targetId}`,
                sourceKind: 'code-graph' as const,
                evidence: relation.evidence,
                reason: relation.reason
            })),
            ...docs.map(doc => ({
                id: doc.id,
                kind: 'doc' as const,
                title: doc.title,
                uri: doc.uri,
                sourceKind: 'local-docs' as const,
                evidence: doc.evidence,
                reason: doc.reason
            }))
        ];
        return {
            summary,
            highlights: [
                ...recommendedContext.slice(0, 4).map(context => `${context.title}: ${context.reason}`),
                ...riskAreas.slice(0, 2).map(area => `${area.title}: ${area.reasons.join(' ')}`)
            ],
            recommendedContext: [...recommendedContext],
            citations: [...new Map(citations.map(citation => [`${citation.kind}:${citation.id}`, citation])).values()]
        };
    }
}

export class GraphDiffService {

    diff(request: GraphDiffRequest): GraphDiffResult {
        return {
            addedFileIds: this.added(request.before.files, request.after.files, item => item.id),
            removedFileIds: this.removed(request.before.files, request.after.files, item => item.id),
            changedFileIds: request.after.files
                .filter(after => request.before.files.some(before => before.id === after.id && before.contentHash !== after.contentHash))
                .map(file => file.id),
            addedSymbolIds: this.added(request.before.symbols, request.after.symbols, item => item.id),
            removedSymbolIds: this.removed(request.before.symbols, request.after.symbols, item => item.id),
            addedRelationIds: this.added(request.before.relations, request.after.relations, item => item.id),
            removedRelationIds: this.removed(request.before.relations, request.after.relations, item => item.id)
        };
    }

    protected added<T>(before: readonly T[], after: readonly T[], id: (value: T) => string): string[] {
        const beforeIds = new Set(before.map(id));
        return after.map(id).filter(value => !beforeIds.has(value));
    }

    protected removed<T>(before: readonly T[], after: readonly T[], id: (value: T) => string): string[] {
        const afterIds = new Set(after.map(id));
        return before.map(id).filter(value => !afterIds.has(value));
    }
}

export class GraphCommunityAnalyzer {

    analyze(request: GraphCommunityDetectionRequest): GraphCommunityDetectionResult {
        const minCommunitySize = request.minCommunitySize ?? 3;
        const maxCommunities = request.maxCommunities ?? 20;
        const maxIterations = request.maxIterations ?? 12;
        const nodeIds = new Set([
            ...request.files.map(file => file.id),
            ...request.symbols.map(symbol => symbol.id)
        ]);
        const relations = request.relations.filter(relation => nodeIds.has(relation.sourceId) && nodeIds.has(relation.targetId));
        const labels = this.propagateLabels(nodeIds, relations, maxIterations);
        const grouped = new Map<string, Set<string>>();
        for (const nodeId of [...nodeIds].sort()) {
            const label = labels.get(nodeId) ?? nodeId;
            grouped.set(label, new Set([...(grouped.get(label) ?? []), nodeId]));
        }

        const communities = [...grouped.values()]
            .filter(nodes => nodes.size >= minCommunitySize)
            .map((nodes, index) => this.community(index + 1, nodes, request.files, request.symbols, relations))
            .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name))
            .slice(0, maxCommunities);

        return {
            communities,
            thresholds: {
                minCommunitySize,
                maxCommunities,
                maxIterations
            }
        };
    }

    protected propagateLabels(nodeIds: Set<string>, relations: readonly MemoryRelation[], maxIterations: number): Map<string, string> {
        const labels = new Map([...nodeIds].sort().map(id => [id, id]));
        const adjacency = this.weightedAdjacency(relations);
        for (let iteration = 0; iteration < maxIterations; iteration++) {
            let changed = false;
            for (const nodeId of [...nodeIds].sort()) {
                const scores = new Map<string, number>();
                for (const [neighborId, weight] of adjacency.get(nodeId) ?? []) {
                    const label = labels.get(neighborId) ?? neighborId;
                    scores.set(label, (scores.get(label) ?? 0) + weight);
                }
                const best = [...scores.entries()]
                    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0]?.[0];
                if (best && best !== labels.get(nodeId)) {
                    labels.set(nodeId, best);
                    changed = true;
                }
            }
            if (!changed) {
                break;
            }
        }
        return labels;
    }

    protected weightedAdjacency(relations: readonly MemoryRelation[]): Map<string, Map<string, number>> {
        const adjacency = new Map<string, Map<string, number>>();
        for (const relation of relations) {
            const weight = Math.max(0.1, relation.confidenceScore);
            this.addWeight(adjacency, relation.sourceId, relation.targetId, weight);
            this.addWeight(adjacency, relation.targetId, relation.sourceId, weight);
        }
        return adjacency;
    }

    protected addWeight(adjacency: Map<string, Map<string, number>>, sourceId: string, targetId: string, weight: number): void {
        const neighbors = adjacency.get(sourceId) ?? new Map<string, number>();
        neighbors.set(targetId, (neighbors.get(targetId) ?? 0) + weight);
        adjacency.set(sourceId, neighbors);
    }

    protected community(
        index: number,
        nodeIds: Set<string>,
        files: readonly MemoryFile[],
        symbols: readonly MemorySymbol[],
        relations: readonly MemoryRelation[]
    ): GraphCommunity {
        const communityRelations = relations.filter(relation => nodeIds.has(relation.sourceId) && nodeIds.has(relation.targetId));
        const relationSummaries = this.relationSummaries(communityRelations);
        const centralNodeIds = this.centralNodeIds(nodeIds, communityRelations);
        const fileIds = files.filter(file => nodeIds.has(file.id)).map(file => file.id).sort();
        const symbolIds = symbols.filter(symbol => nodeIds.has(symbol.id)).map(symbol => symbol.id).sort();
        const name = this.communityName(centralNodeIds, files, symbols, relationSummaries, index);
        return {
            id: `community_${index}`,
            name,
            nodeIds: [...nodeIds].sort(),
            fileIds,
            symbolIds,
            centralNodeIds,
            relationSummaries,
            mainRelations: this.mainRelations(communityRelations),
            score: Number((nodeIds.size + communityRelations.length * 0.5 + relationSummaries.length * 0.25).toFixed(2)),
            reasons: [
                `${nodeIds.size} connected nodes`,
                `${communityRelations.length} internal relations`,
                relationSummaries[0] ? `dominant relation:${relationSummaries[0].relationType}` : undefined
            ].filter((reason): reason is string => !!reason)
        };
    }

    protected relationSummaries(relations: readonly MemoryRelation[]): GraphCommunityRelationSummary[] {
        const grouped = new Map<MemoryRelation['relationType'], { count: number; confidence: number }>();
        for (const relation of relations) {
            const current = grouped.get(relation.relationType) ?? { count: 0, confidence: 0 };
            grouped.set(relation.relationType, {
                count: current.count + 1,
                confidence: current.confidence + relation.confidenceScore
            });
        }
        return [...grouped.entries()]
            .map(([relationType, summary]) => ({
                relationType,
                count: summary.count,
                confidenceScore: Number((summary.confidence / summary.count).toFixed(2))
            }))
            .sort((left, right) => right.count - left.count || right.confidenceScore - left.confidenceScore || left.relationType.localeCompare(right.relationType));
    }

    protected centralNodeIds(nodeIds: Set<string>, relations: readonly MemoryRelation[]): string[] {
        const degree = new Map<string, number>();
        for (const nodeId of nodeIds) {
            degree.set(nodeId, 0);
        }
        for (const relation of relations) {
            degree.set(relation.sourceId, (degree.get(relation.sourceId) ?? 0) + 1);
            degree.set(relation.targetId, (degree.get(relation.targetId) ?? 0) + 1);
        }
        return [...degree.entries()]
            .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
            .slice(0, 3)
            .map(([nodeId]) => nodeId);
    }

    protected mainRelations(relations: readonly MemoryRelation[]): GraphCommunityMainRelation[] {
        return [...relations]
            .sort((left, right) => right.confidenceScore - left.confidenceScore || left.relationType.localeCompare(right.relationType) || left.id.localeCompare(right.id))
            .slice(0, 8)
            .map(relation => ({
                id: relation.id,
                sourceId: relation.sourceId,
                targetId: relation.targetId,
                relationType: relation.relationType,
                confidenceScore: relation.confidenceScore,
                evidence: relation.evidence
            }));
    }

    protected communityName(
        centralNodeIds: readonly string[],
        files: readonly MemoryFile[],
        symbols: readonly MemorySymbol[],
        relationSummaries: readonly GraphCommunityRelationSummary[],
        index: number
    ): string {
        const labels = centralNodeIds
            .map(id => symbols.find(symbol => symbol.id === id)?.name ?? files.find(file => file.id === id)?.fileName)
            .filter((label): label is string => !!label);
        const focus = labels.length ? labels.slice(0, 2).join(' / ') : `Community ${index}`;
        const relation = relationSummaries[0]?.relationType.replace(/_/g, ' ');
        return relation ? `${focus} ${relation}` : focus;
    }
}

export class GodNodeAnalyzer {

    analyze(request: GodNodeAnalysisRequest): GodNodeAnalysisResult {
        const minDegree = request.minDegree ?? 5;
        const minCriticalPathCount = request.minCriticalPathCount ?? 2;
        const maxCriticalPathDepth = request.maxCriticalPathDepth ?? 4;
        const nodeIds = new Set([
            ...request.files.map(file => file.id),
            ...request.symbols.map(symbol => symbol.id)
        ]);
        const fileSymbolIds = new Map<string, string[]>();
        for (const symbol of request.symbols) {
            fileSymbolIds.set(symbol.fileId, [...fileSymbolIds.get(symbol.fileId) ?? [], symbol.id]);
        }
        const adjacency = this.adjacency(request.relations, nodeIds);
        const reverse = this.reverseAdjacency(request.relations, nodeIds);

        const metrics = [
            ...request.files.map(file => this.fileMetric(file, fileSymbolIds.get(file.id) ?? [], adjacency, reverse, maxCriticalPathDepth)),
            ...request.symbols.map(symbol => this.symbolMetric(symbol, adjacency, reverse, maxCriticalPathDepth))
        ].filter(metric => metric.degree >= minDegree || metric.criticalPathCount >= minCriticalPathCount);

        return {
            nodes: metrics
                .sort((left, right) => right.score - left.score || right.degree - left.degree || left.label.localeCompare(right.label))
                .slice(0, request.limit ?? 25),
            thresholds: {
                minDegree,
                minCriticalPathCount,
                maxCriticalPathDepth
            }
        };
    }

    protected fileMetric(
        file: MemoryFile,
        symbolIds: string[],
        adjacency: Map<string, Set<string>>,
        reverse: Map<string, Set<string>>,
        maxCriticalPathDepth: number
    ): GodNodeMetric {
        const sourceIds = [file.id, ...symbolIds];
        const fanInIds = this.union(sourceIds.map(id => reverse.get(id) ?? new Set()));
        const fanOutIds = this.union(sourceIds.map(id => adjacency.get(id) ?? new Set()));
        const criticalPathIds = this.criticalPathIds(sourceIds, adjacency, reverse, maxCriticalPathDepth);
        return this.metric({
            id: file.id,
            kind: 'file',
            label: file.fileName,
            detail: file.relativePath,
            fanIn: fanInIds.size,
            fanOut: fanOutIds.size,
            criticalPathIds
        });
    }

    protected symbolMetric(
        symbol: MemorySymbol,
        adjacency: Map<string, Set<string>>,
        reverse: Map<string, Set<string>>,
        maxCriticalPathDepth: number
    ): GodNodeMetric {
        const fanIn = reverse.get(symbol.id)?.size ?? 0;
        const fanOut = adjacency.get(symbol.id)?.size ?? 0;
        const criticalPathIds = this.criticalPathIds([symbol.id], adjacency, reverse, maxCriticalPathDepth);
        return this.metric({
            id: symbol.id,
            kind: 'symbol',
            label: symbol.fullName ?? symbol.name,
            detail: symbol.symbolKind,
            fanIn,
            fanOut,
            criticalPathIds
        });
    }

    protected metric(input: Pick<GodNodeMetric, 'id' | 'kind' | 'label' | 'detail' | 'fanIn' | 'fanOut' | 'criticalPathIds'>): GodNodeMetric {
        const degree = input.fanIn + input.fanOut;
        const criticalPathCount = input.criticalPathIds.length;
        const score = Number((degree + criticalPathCount * 2 + Math.min(input.fanIn, input.fanOut)).toFixed(2));
        const reasons = [
            degree ? `degree:${degree}` : undefined,
            input.fanIn ? `fan-in:${input.fanIn}` : undefined,
            input.fanOut ? `fan-out:${input.fanOut}` : undefined,
            criticalPathCount ? `critical-paths:${criticalPathCount}` : undefined
        ].filter((reason): reason is string => reason !== undefined);
        return {
            ...input,
            degree,
            criticalPathCount,
            score,
            reasons
        };
    }

    protected adjacency(relations: readonly MemoryRelation[], nodeIds: Set<string>): Map<string, Set<string>> {
        const adjacency = new Map<string, Set<string>>();
        for (const relation of relations) {
            if (!nodeIds.has(relation.sourceId) || !nodeIds.has(relation.targetId)) {
                continue;
            }
            adjacency.set(relation.sourceId, new Set([...(adjacency.get(relation.sourceId) ?? []), relation.targetId]));
        }
        return adjacency;
    }

    protected reverseAdjacency(relations: readonly MemoryRelation[], nodeIds: Set<string>): Map<string, Set<string>> {
        const reverse = new Map<string, Set<string>>();
        for (const relation of relations) {
            if (!nodeIds.has(relation.sourceId) || !nodeIds.has(relation.targetId)) {
                continue;
            }
            reverse.set(relation.targetId, new Set([...(reverse.get(relation.targetId) ?? []), relation.sourceId]));
        }
        return reverse;
    }

    protected criticalPathIds(nodeIds: string[], adjacency: Map<string, Set<string>>, reverse: Map<string, Set<string>>, maxDepth: number): string[] {
        const pathIds = new Set<string>();
        for (const nodeId of nodeIds) {
            const upstream = this.reachable(reverse, nodeId, maxDepth);
            const downstream = this.reachable(adjacency, nodeId, maxDepth);
            for (const sourceId of upstream) {
                for (const targetId of downstream) {
                    if (sourceId !== targetId) {
                        pathIds.add(`${sourceId}->${nodeId}->${targetId}`);
                    }
                }
            }
        }
        return [...pathIds].sort();
    }

    protected reachable(graph: Map<string, Set<string>>, startId: string, maxDepth: number): Set<string> {
        const visited = new Set<string>();
        let frontier = new Set([startId]);
        for (let depth = 0; depth < maxDepth; depth++) {
            const next = new Set<string>();
            for (const id of frontier) {
                for (const neighbor of graph.get(id) ?? []) {
                    if (neighbor !== startId && !visited.has(neighbor)) {
                        visited.add(neighbor);
                        next.add(neighbor);
                    }
                }
            }
            frontier = next;
        }
        return visited;
    }

    protected union(sets: Set<string>[]): Set<string> {
        const values = new Set<string>();
        for (const set of sets) {
            for (const value of set) {
                values.add(value);
            }
        }
        return values;
    }
}

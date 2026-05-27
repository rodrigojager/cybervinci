// *****************************************************************************
// Copyright (C) 2026.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import {
    MemoryAddKnowledgeConceptRequest,
    MemoryCreateKnowledgeGraphRequest,
    MemoryExportKnowledgeGraphRequest,
    MemoryGraph,
    MemoryKnowledgeConcept,
    MemoryKnowledgeConceptInput,
    MemoryKnowledgeContextCartItem,
    MemoryKnowledgeGraph,
    MemoryKnowledgeGraphExport,
    MemoryKnowledgeLink,
    MemoryKnowledgeLinkInput,
    MemoryKnowledgeSearchResult,
    MemoryLinkKnowledgeConceptsRequest,
    MemorySearchKnowledgeRequest
} from './memory-types';
import { SecretRedactionService } from './secret-redaction';

export class KnowledgeGraphService {

    protected readonly redactionService = new SecretRedactionService();

    createGraph(
        request: MemoryCreateKnowledgeGraphRequest,
        createId: (prefix: string) => string,
        now = new Date().toISOString()
    ): MemoryKnowledgeGraph {
        const scope = request.scope ?? 'workspace';
        return this.normalizeGraph({
            id: createId('kg'),
            workspacePath: scope === 'workspace' ? request.workspacePath : undefined,
            scope,
            title: request.title?.trim() || 'Project Knowledge Graph',
            description: request.description,
            status: 'active',
            tags: request.tags,
            concepts: [],
            links: [],
            createdAt: now,
            updatedAt: now
        }, now);
    }

    normalizeGraph(graph: MemoryKnowledgeGraph, now = new Date().toISOString()): MemoryKnowledgeGraph {
        return {
            ...graph,
            scope: graph.scope ?? 'workspace',
            title: graph.title || 'Project Knowledge Graph',
            status: graph.status ?? 'active',
            concepts: (graph.concepts ?? []).map(concept => this.normalizeConcept(graph.id, concept, concept.id, concept.createdAt ?? now, concept.updatedAt ?? now)),
            links: (graph.links ?? []).map(link => this.normalizeLink(graph.id, link, link.id, link.createdAt ?? now, link.updatedAt ?? now)),
            createdAt: graph.createdAt ?? now,
            updatedAt: graph.updatedAt ?? now
        };
    }

    createConcept(
        graph: MemoryKnowledgeGraph,
        request: MemoryAddKnowledgeConceptRequest,
        createId: (prefix: string) => string,
        now = new Date().toISOString()
    ): MemoryKnowledgeConcept {
        return this.normalizeConcept(graph.id, request.concept, request.concept.id ?? createId('kg-concept'), now, now);
    }

    createLink(
        graph: MemoryKnowledgeGraph,
        request: MemoryLinkKnowledgeConceptsRequest,
        createId: (prefix: string) => string,
        now = new Date().toISOString()
    ): MemoryKnowledgeLink {
        return this.normalizeLink(graph.id, request, request.id ?? createId('kg-link'), now, now);
    }

    proposeSurprisingConnections(
        graph: MemoryKnowledgeGraph,
        createId: (sourceConceptId: string, targetConceptId: string) => string,
        now = new Date().toISOString(),
        limit = 10
    ): MemoryKnowledgeLink[] {
        const activeConcepts = graph.concepts
            .filter(concept => concept.status === 'active')
            .filter(concept => concept.metadata?.defaultRoot !== true);
        const existingPairs = new Set(graph.links.flatMap(link => [
            `${link.sourceConceptId}:${link.targetConceptId}`,
            `${link.targetConceptId}:${link.sourceConceptId}`
        ]));
        const proposals = [];
        for (let sourceIndex = 0; sourceIndex < activeConcepts.length; sourceIndex++) {
            for (let targetIndex = sourceIndex + 1; targetIndex < activeConcepts.length; targetIndex++) {
                const source = activeConcepts[sourceIndex];
                const target = activeConcepts[targetIndex];
                if (existingPairs.has(`${source.id}:${target.id}`) || !this.areDistantConcepts(source, target)) {
                    continue;
                }
                const sharedTerms = this.sharedInterestingTerms(source, target);
                if (sharedTerms.length < 2) {
                    continue;
                }
                proposals.push({
                    source,
                    target,
                    sharedTerms,
                    score: this.surpriseScore(source, target, sharedTerms)
                });
            }
        }
        return proposals
            .sort((left, right) => right.score - left.score || left.source.title.localeCompare(right.source.title) || left.target.title.localeCompare(right.target.title))
            .slice(0, limit)
            .map(proposal => this.normalizeLink(graph.id, {
                id: createId(proposal.source.id, proposal.target.id),
                sourceConceptId: proposal.source.id,
                targetConceptId: proposal.target.id,
                linkKind: 'surprising_connection',
                status: 'candidate',
                label: 'Surprising inferred connection',
                confidenceScore: proposal.score,
                evidence: [
                    'Inferred review candidate between distant knowledge areas.',
                    `Shared terms: ${proposal.sharedTerms.join(', ')}.`,
                    `Source area: ${this.conceptArea(proposal.source)}; target area: ${this.conceptArea(proposal.target)}.`
                ].join(' '),
                metadata: {
                    classification: 'inferred',
                    reviewRequired: true,
                    surprisingConnection: true,
                    inferredBy: 'deterministic-surprising-connection-detector',
                    sharedTerms: proposal.sharedTerms
                }
            }, proposal.source.id < proposal.target.id ? proposal.source.id : proposal.target.id, now, now));
    }

    search(
        graphs: readonly MemoryKnowledgeGraph[],
        request: MemorySearchKnowledgeRequest,
        workspaceKey: (workspacePath: string) => string
    ): MemoryKnowledgeSearchResult[] {
        const requestKey = workspaceKey(request.workspacePath);
        const terms = this.searchTerms(request.query);
        const results: MemoryKnowledgeSearchResult[] = [];
        for (const graph of graphs) {
            if (request.graphId && graph.id !== request.graphId) {
                continue;
            }
            if (graph.scope !== 'global' && workspaceKey(graph.workspacePath ?? '') !== requestKey) {
                continue;
            }
            if (!request.includeArchived && graph.status === 'archived') {
                continue;
            }
            const conceptsById = new Map(graph.concepts.map(concept => [concept.id, concept]));
            for (const concept of graph.concepts) {
                if (!request.includeArchived && concept.status !== 'active') {
                    continue;
                }
                const haystack = [
                    graph.title,
                    concept.kind,
                    concept.title,
                    concept.summary,
                    concept.tags?.join(' ') ?? '',
                    concept.evidence ?? '',
                    concept.uri ?? ''
                ].join(' ').toLowerCase();
                const score = this.score(haystack, terms, concept.weight ?? 0.6);
                if (terms.length && score <= 0) {
                    continue;
                }
                results.push({
                    id: concept.id,
                    graphId: graph.id,
                    graphTitle: graph.title,
                    kind: 'concept',
                    title: concept.title,
                    excerpt: concept.summary,
                    score,
                    sourceKind: concept.sourceKind ?? 'knowledge-graph',
                    sourceId: concept.sourceId,
                    uri: concept.uri,
                    evidence: concept.evidence,
                    concept
                });
            }
            for (const link of graph.links) {
                if (!request.includeArchived && link.status && link.status !== 'active') {
                    continue;
                }
                const source = conceptsById.get(link.sourceConceptId);
                const target = conceptsById.get(link.targetConceptId);
                if (!source || !target || (!request.includeArchived && (source.status !== 'active' || target.status !== 'active'))) {
                    continue;
                }
                const title = link.label || `${source.title} ${link.linkKind.replace(/_/g, ' ')} ${target.title}`;
                const excerpt = link.evidence || `${source.summary} ${target.summary}`;
                const haystack = [title, excerpt, link.linkKind].join(' ').toLowerCase();
                const score = this.score(haystack, terms, link.confidenceScore);
                if (terms.length && score <= 0) {
                    continue;
                }
                results.push({
                    id: link.id,
                    graphId: graph.id,
                    graphTitle: graph.title,
                    kind: 'link',
                    title,
                    excerpt,
                    score,
                    sourceKind: 'knowledge-graph',
                    evidence: link.evidence,
                    link
                });
            }
        }
        return results
            .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title))
            .slice(0, request.limit ?? 20);
    }

    exportGraph(graph: MemoryKnowledgeGraph, request: MemoryExportKnowledgeGraphRequest, exportedAt = new Date().toISOString()): MemoryKnowledgeGraphExport {
        const safeGraph = this.redactionService.redactJson(graph);
        const baseName = graph.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || graph.id;
        switch (request.format) {
            case 'json':
                return {
                    graphId: graph.id,
                    format: request.format,
                    mimeType: 'application/json',
                    fileName: `${baseName}.json`,
                    content: `${JSON.stringify(safeGraph, undefined, 2)}\n`,
                    exportedAt,
                    graph: safeGraph
                };
            case 'markdown':
                return {
                    graphId: graph.id,
                    format: request.format,
                    mimeType: 'text/markdown',
                    fileName: `${baseName}.md`,
                    content: this.toMarkdown(safeGraph),
                    exportedAt,
                    graph: safeGraph
                };
            case 'dot':
                return {
                    graphId: graph.id,
                    format: request.format,
                    mimeType: 'text/vnd.graphviz',
                    fileName: `${baseName}.dot`,
                    content: this.toDot(safeGraph),
                    exportedAt,
                    graph: safeGraph
                };
            case 'context-cart': {
                const contextCart = this.toContextCart(safeGraph);
                return {
                    graphId: graph.id,
                    format: request.format,
                    mimeType: 'application/json',
                    fileName: `${baseName}.context-cart.json`,
                    content: `${JSON.stringify({ graphId: graph.id, items: contextCart }, undefined, 2)}\n`,
                    exportedAt,
                    graph: safeGraph,
                    contextCart
                };
            }
            default:
                return {
                    graphId: graph.id,
                    format: request.format,
                    mimeType: 'text/plain',
                    fileName: `${baseName}.txt`,
                    content: '',
                    exportedAt,
                    graph: safeGraph
                };
        }
    }

    toGraph(graph: MemoryKnowledgeGraph): MemoryGraph {
        return {
            title: graph.title,
            nodes: graph.concepts.map(concept => ({
                id: concept.id,
                kind: 'knowledge-concept' as const,
                label: concept.title,
                detail: concept.kind,
                source: this.graphSourceKind(concept.sourceKind),
                staleStatus: concept.status === 'stale' ? 'stale' : undefined,
                semanticTags: concept.tags
            })),
            edges: graph.links.map(link => ({
                id: link.id,
                sourceId: link.sourceConceptId,
                targetId: link.targetConceptId,
                relationType: this.linkRelationType(link.linkKind),
                confidenceScore: link.confidenceScore
            }))
        };
    }

    protected normalizeConcept(
        graphId: string,
        input: MemoryKnowledgeConceptInput,
        id: string,
        createdAt: string,
        updatedAt: string
    ): MemoryKnowledgeConcept {
        return {
            ...input,
            id,
            graphId,
            kind: input.kind ?? 'concept',
            title: input.title.trim(),
            summary: input.summary.trim(),
            status: input.status ?? 'active',
            tags: input.tags ?? [],
            weight: input.weight ?? 0.6,
            createdAt,
            updatedAt
        };
    }

    protected normalizeLink(
        graphId: string,
        input: MemoryKnowledgeLinkInput,
        id: string,
        createdAt: string,
        updatedAt: string
    ): MemoryKnowledgeLink {
        return {
            ...input,
            id,
            graphId,
            linkKind: input.linkKind ?? 'related_to',
            status: input.status ?? 'active',
            confidenceScore: input.confidenceScore ?? 0.6,
            createdAt,
            updatedAt
        };
    }

    protected areDistantConcepts(left: MemoryKnowledgeConcept, right: MemoryKnowledgeConcept): boolean {
        return left.kind !== right.kind && this.conceptArea(left) !== this.conceptArea(right);
    }

    protected conceptArea(concept: MemoryKnowledgeConcept): string {
        return concept.tags?.find(tag => tag && !['medium', 'high', 'critical', 'low'].includes(tag)) ?? concept.kind;
    }

    protected sharedInterestingTerms(left: MemoryKnowledgeConcept, right: MemoryKnowledgeConcept): string[] {
        const leftTerms = new Set(this.interestingTerms(left));
        return [...new Set(this.interestingTerms(right).filter(term => leftTerms.has(term)))]
            .sort()
            .slice(0, 5);
    }

    protected interestingTerms(concept: MemoryKnowledgeConcept): string[] {
        const stopWords = new Set([
            'about', 'after', 'before', 'between', 'does', 'from', 'have', 'into', 'keep', 'local', 'must', 'project', 'runtime',
            'should', 'that', 'their', 'there', 'this', 'with', 'without', 'para', 'como', 'mais', 'nao', 'não', 'por', 'que', 'uma'
        ]);
        return `${concept.title} ${concept.summary} ${concept.evidence ?? ''}`
            .toLowerCase()
            .match(/[a-z0-9][a-z0-9_-]{3,}/g)?.filter(term => !stopWords.has(term)) ?? [];
    }

    protected surpriseScore(left: MemoryKnowledgeConcept, right: MemoryKnowledgeConcept, sharedTerms: readonly string[]): number {
        const distanceBoost = left.sourceKind !== right.sourceKind ? 0.08 : 0;
        const weight = ((left.weight ?? 0.6) + (right.weight ?? 0.6)) / 2;
        return Number(Math.min(0.74, 0.42 + sharedTerms.length * 0.06 + weight * 0.12 + distanceBoost).toFixed(2));
    }

    protected toMarkdown(graph: MemoryKnowledgeGraph): string {
        const conceptsById = new Map(graph.concepts.map(concept => [concept.id, concept]));
        const lines = [
            `# ${graph.title}`,
            graph.description ? `\n${graph.description}` : '',
            '',
            '## Concepts',
            ...graph.concepts.map(concept => [
                `- **${concept.title}** (${concept.kind})`,
                `  ${concept.summary}`,
                concept.evidence ? `  Evidence: ${concept.evidence}` : undefined
            ].filter(Boolean).join('\n')),
            '',
            '## Links',
            ...graph.links.map(link => {
                const source = conceptsById.get(link.sourceConceptId)?.title ?? link.sourceConceptId;
                const target = conceptsById.get(link.targetConceptId)?.title ?? link.targetConceptId;
                return `- ${source} ${link.linkKind.replace(/_/g, ' ')} ${target}${link.evidence ? `: ${link.evidence}` : ''}`;
            })
        ];
        return `${lines.join('\n').replace(/\n{3,}/g, '\n\n')}\n`;
    }

    protected toDot(graph: MemoryKnowledgeGraph): string {
        const lines = [
            `digraph ${this.dotId(graph.id)} {`,
            `  label="${this.dotLabel(graph.title)}";`,
            '  labelloc="t";',
            ...graph.concepts.map(concept => `  ${this.dotId(concept.id)} [label="${this.dotLabel(concept.title)}", shape=box];`),
            ...graph.links.map(link => `  ${this.dotId(link.sourceConceptId)} -> ${this.dotId(link.targetConceptId)} [label="${this.dotLabel(link.label ?? link.linkKind)}"];`),
            '}'
        ];
        return `${lines.join('\n')}\n`;
    }

    protected toContextCart(graph: MemoryKnowledgeGraph): MemoryKnowledgeContextCartItem[] {
        return graph.concepts
            .filter(concept => concept.status === 'active')
            .map(concept => ({
                id: concept.id,
                title: concept.title,
                content: [concept.summary, concept.evidence ? `Evidence: ${concept.evidence}` : undefined].filter(Boolean).join('\n'),
                sourceKind: concept.sourceKind ?? 'knowledge-graph',
                uri: concept.uri,
                estimatedTokens: this.estimateTokens(`${concept.title} ${concept.summary} ${concept.evidence ?? ''}`),
                metadata: {
                    graphId: graph.id,
                    conceptKind: concept.kind,
                    sourceId: concept.sourceId ?? ''
                }
            }));
    }

    protected searchTerms(query: string): string[] {
        return query.toLowerCase().match(/[a-z0-9_.$#-]{2,}/g)?.slice(0, 8) ?? [];
    }

    protected score(haystack: string, terms: string[], weight: number): number {
        if (!terms.length) {
            return weight;
        }
        return terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0) / terms.length * Math.max(0.1, weight);
    }

    protected estimateTokens(content: string): number {
        return Math.ceil(content.split(/\s+/).filter(Boolean).length * 1.3);
    }

    protected dotId(value: string): string {
        return `"${value.replace(/"/g, '\\"')}"`;
    }

    protected dotLabel(value: string): string {
        return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, '\\n');
    }

    protected linkRelationType(linkKind: MemoryKnowledgeLink['linkKind']): MemoryGraph['edges'][number]['relationType'] {
        return linkKind === 'related_to' ? 'references' : linkKind;
    }

    protected graphSourceKind(sourceKind: MemoryKnowledgeConcept['sourceKind']): MemoryGraph['nodes'][number]['source'] {
        return sourceKind && sourceKind !== 'knowledge-graph' ? sourceKind : 'project-memory';
    }
}

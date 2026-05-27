// *****************************************************************************
// Copyright (C) 2026.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import {
    MemoryIcmBridgeBundle,
    MemoryIcmMemory,
    MemoryIcmMemoir,
    MemoryIcmMemoirConcept,
    MemoryKnowledgeConceptKind,
    MemoryKnowledgeGraph,
    MemoryKnowledgeLinkKind,
    MemoryImportance,
    MemoryItem
} from './memory-types';
import { SecretRedactionService } from './secret-redaction';

export const MEMORY_ICM_LIMITS = [
    'ICM is optional; Memory never shells out to the ICM binary during import/export.',
    'Imported ICM memories are stored as approval candidates unless activateMemories is set.',
    'ICM labels and custom metadata are preserved only when they fit the Memory metadata model.',
    'ICM memoir relation names are mapped to the closest Memory knowledge link kind.'
] as const;

export class IcmBridgeService {

    protected readonly redactionService = new SecretRedactionService();

    toMemoryItems(input: {
        workspacePath: string;
        memories: readonly MemoryIcmMemory[];
        activate?: boolean;
        now: string;
        idFactory(prefix: string, seed: string): string;
    }): MemoryItem[] {
        return input.memories.map(memory => {
            const content = this.memoryContent(memory);
            const title = memory.title?.trim() || this.firstLine(content) || 'Imported ICM memory';
            return {
                id: input.idFactory('mem', memory.id ?? `${title}:${content}`),
                workspacePath: input.workspacePath,
                scope: 'workspace',
                memoryType: this.memoryType(memory.kind),
                title,
                content,
                status: input.activate ? 'active' : 'candidate',
                staleStatus: 'unknown',
                importance: this.importance(memory.importance),
                weight: this.weight(memory.weight, memory.importance),
                lastAccessedAt: memory.last_accessed_at ?? input.now,
                accessCount: Math.max(0, memory.access_count ?? 0),
                createdAt: memory.created_at ?? input.now,
                updatedAt: memory.updated_at ?? input.now,
                acceptedCount: input.activate ? 1 : 0,
                rejectedCount: 0,
                source: memory.id ? `icm:${memory.id}` : 'icm',
                evidence: memory.topic ? `ICM topic: ${memory.topic}` : undefined
            };
        });
    }

    toIcmMemories(memories: readonly MemoryItem[]): MemoryIcmMemory[] {
        return memories.map(memory => this.redactionService.redactJson({
            id: memory.id,
            topic: memory.workspacePath,
            title: memory.title,
            text: memory.content,
            kind: memory.memoryType,
            importance: memory.importance,
            weight: memory.weight,
            created_at: memory.createdAt,
            updated_at: memory.updatedAt,
            last_accessed_at: memory.lastAccessedAt,
            access_count: memory.accessCount,
            metadata: {
                scope: memory.scope,
                status: memory.status,
                staleStatus: memory.staleStatus,
                source: memory.source ?? '',
                evidence: memory.evidence ?? ''
            }
        }));
    }

    memoirsToKnowledgeGraphs(input: {
        workspacePath: string;
        memoirs: readonly MemoryIcmMemoir[];
        now: string;
        idFactory(prefix: string, seed: string): string;
    }): MemoryKnowledgeGraph[] {
        return input.memoirs.map(memoir => {
            const graphId = input.idFactory('kg', memoir.id ?? memoir.name ?? memoir.title ?? 'icm-memoir');
            const conceptIdByExternal = new Map<string, string>();
            const concepts = (memoir.concepts ?? []).map(concept => {
                const externalId = concept.id ?? concept.name ?? concept.title ?? this.firstLabel(concept) ?? 'concept';
                const id = input.idFactory('kg-concept', `${graphId}:${externalId}`);
                conceptIdByExternal.set(externalId, id);
                if (concept.name) {
                    conceptIdByExternal.set(concept.name, id);
                }
                if (concept.title) {
                    conceptIdByExternal.set(concept.title, id);
                }
                return {
                    id,
                    graphId,
                    kind: this.conceptKind(concept),
                    title: concept.title ?? concept.name ?? externalId,
                    summary: concept.description ?? '',
                    status: 'active' as const,
                    sourceKind: 'knowledge-graph' as const,
                    sourceId: concept.id,
                    tags: concept.labels,
                    weight: concept.confidence,
                    metadata: concept.metadata,
                    createdAt: input.now,
                    updatedAt: input.now
                };
            });
            const links = (memoir.links ?? []).map(link => {
                const source = conceptIdByExternal.get(link.from ?? link.source ?? '');
                const target = conceptIdByExternal.get(link.to ?? link.target ?? '');
                if (!source || !target) {
                    return undefined;
                }
                return {
                    id: input.idFactory('kg-link', `${graphId}:${source}:${target}:${link.relation ?? link.type ?? 'related_to'}`),
                    graphId,
                    sourceConceptId: source,
                    targetConceptId: target,
                    linkKind: this.linkKind(link.relation ?? link.type),
                    label: link.relation ?? link.type,
                    confidenceScore: Math.max(0, Math.min(1, link.confidence ?? 0.7)),
                    evidence: link.evidence,
                    createdAt: input.now,
                    updatedAt: input.now
                };
            }).filter((link): link is NonNullable<typeof link> => !!link);
            return {
                id: graphId,
                workspacePath: input.workspacePath,
                scope: 'workspace',
                title: memoir.title ?? memoir.name ?? 'ICM Memoir',
                description: memoir.description,
                status: 'active',
                tags: ['icm-import'],
                concepts,
                links,
                metadata: {
                    ...memoir.metadata,
                    importedFrom: 'icm'
                },
                createdAt: input.now,
                updatedAt: input.now
            };
        });
    }

    knowledgeGraphsToMemoirs(graphs: readonly MemoryKnowledgeGraph[]): MemoryIcmMemoir[] {
        return graphs.map(graph => this.redactionService.redactJson({
            id: graph.id,
            name: graph.title,
            description: graph.description,
            concepts: graph.concepts.map(concept => ({
                id: concept.id,
                name: concept.title,
                description: concept.summary,
                labels: concept.tags,
                confidence: concept.weight,
                metadata: concept.metadata
            })),
            links: graph.links.map(link => ({
                id: link.id,
                from: link.sourceConceptId,
                to: link.targetConceptId,
                relation: link.label ?? link.linkKind,
                confidence: link.confidenceScore,
                evidence: link.evidence
            })),
            metadata: graph.metadata
        }));
    }

    exportBundle(input: {
        workspacePath: string;
        memories: readonly MemoryItem[];
        graphs: readonly MemoryKnowledgeGraph[];
        exportedAt: string;
    }): MemoryIcmBridgeBundle {
        return this.redactionService.redactJson({
            version: 1,
            exportedAt: input.exportedAt,
            workspacePath: input.workspacePath,
            source: 'cybervinci-memory',
            memories: this.toIcmMemories(input.memories),
            memoirs: this.knowledgeGraphsToMemoirs(input.graphs),
            limits: [...MEMORY_ICM_LIMITS]
        });
    }

    protected memoryContent(memory: MemoryIcmMemory): string {
        return (memory.text ?? memory.content ?? memory.body ?? '').trim();
    }

    protected firstLine(value: string): string {
        return value.split(/\r?\n/).find(line => line.trim())?.trim().slice(0, 80) ?? '';
    }

    protected firstLabel(concept: MemoryIcmMemoirConcept): string | undefined {
        return concept.labels?.find(Boolean);
    }

    protected memoryType(kind: string | undefined): MemoryItem['memoryType'] {
        const normalized = kind?.toLowerCase().replace(/[-\s]+/g, '_');
        switch (normalized) {
            case 'preference':
            case 'user_preference':
                return 'user_preference';
            case 'decision':
            case 'project_decision':
                return 'project_decision';
            case 'convention':
            case 'project_convention':
                return 'project_convention';
            case 'architecture':
            case 'architecture_note':
                return 'architecture_note';
            case 'bug':
            case 'bug_history':
                return 'bug_history';
            case 'command':
            case 'command_note':
                return 'command_note';
            case 'testing':
            case 'testing_note':
                return 'testing_note';
            case 'security':
            case 'security_note':
                return 'security_note';
            default:
                return 'manual_note';
        }
    }

    protected importance(value: string | undefined): MemoryImportance {
        const normalized = value?.toLowerCase();
        return normalized === 'critical' || normalized === 'high' || normalized === 'low' ? normalized : 'medium';
    }

    protected weight(value: number | undefined, importance: string | undefined): number {
        if (typeof value === 'number') {
            return Math.max(0, Math.min(1, value));
        }
        switch (this.importance(importance)) {
            case 'critical':
                return 1;
            case 'high':
                return 0.8;
            case 'low':
                return 0.3;
            default:
                return 0.6;
        }
    }

    protected conceptKind(concept: MemoryIcmMemoirConcept): MemoryKnowledgeConceptKind {
        const labels = (concept.labels ?? []).join(' ').toLowerCase();
        if (labels.includes('decision')) {
            return 'decision';
        }
        if (labels.includes('risk')) {
            return 'risk';
        }
        if (labels.includes('component') || labels.includes('service')) {
            return 'component';
        }
        if (labels.includes('preference')) {
            return 'preference';
        }
        return 'concept';
    }

    protected linkKind(value: string | undefined): MemoryKnowledgeLinkKind {
        const normalized = value?.toLowerCase().replace(/[-\s]+/g, '_');
        switch (normalized) {
            case 'supports':
            case 'contradicts':
            case 'depends_on':
            case 'implements':
            case 'documents':
            case 'decides':
            case 'replaces':
            case 'blocks':
            case 'derived_from':
                return normalized;
            default:
                return 'related_to';
        }
    }
}

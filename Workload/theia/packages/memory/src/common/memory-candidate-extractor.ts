// *****************************************************************************
// Copyright (C) 2026.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import {
    MemoryExtractedMemoryCandidate,
    MemoryCandidateProposalRequest,
    MemoryItem
} from './memory-types';

type MemoryType = MemoryItem['memoryType'];

interface MemoryExtractionRule {
    readonly memoryType: MemoryType;
    readonly titlePrefix: string;
    readonly matchedPattern: string;
    readonly importance: MemoryItem['importance'];
    readonly weight: number;
    readonly matches: (sentence: string) => boolean;
    readonly scope?: (sentence: string) => MemoryItem['scope'];
}

export class MemoryCandidateExtractor {

    protected readonly rules: MemoryExtractionRule[] = [
        {
            memoryType: 'security_note',
            titlePrefix: 'Security note',
            matchedPattern: 'security note',
            importance: 'critical',
            weight: 1,
            matches: sentence => /\b(security note|security|vulnerability|secret|token|password|credential|nota de seguranca|seguranca|vulnerabilidade|segredo|senha|credencial)\b/.test(sentence)
        },
        {
            memoryType: 'testing_note',
            titlePrefix: 'Test command',
            matchedPattern: 'test command',
            importance: 'high',
            weight: 0.85,
            matches: sentence => /\b(test command|command to test|run tests?|testing command|comando de teste|comando para testar|rodar testes?|executar testes?|npm test|yarn test|pnpm test|theiaext test|pytest|dotnet test|mvn test|gradle test)\b/.test(sentence)
        },
        {
            memoryType: 'command_note',
            titlePrefix: 'Run command',
            matchedPattern: 'run command',
            importance: 'medium',
            weight: 0.65,
            matches: sentence => /\b(run command|command to run|execute command|use command|terminal command|rodar comando|executar comando|comando para rodar|usar comando|comando no terminal|npm\s+\w+|yarn\s+\w+|pnpm\s+\w+|git\s+\w+|theiaext\s+\w+|node\s+\S+|python\s+\S+|dotnet\s+\w+|mvn\s+\w+|gradle\s+\w+)\b/.test(sentence)
        },
        {
            memoryType: 'bug_history',
            titlePrefix: 'Known bug',
            matchedPattern: 'known bug',
            importance: 'high',
            weight: 0.8,
            matches: sentence => /\b(known bug|known issue|bug conhecido|problema conhecido|falha conhecida|erro conhecido)\b/.test(sentence)
        },
        {
            memoryType: 'bug_history',
            titlePrefix: 'Workaround',
            matchedPattern: 'workaround',
            importance: 'medium',
            weight: 0.7,
            matches: sentence => /\b(workaround|temporary workaround|work around|contorno|solucao alternativa|solucao temporaria|gambiarra)\b/.test(sentence)
        },
        {
            memoryType: 'bug_history',
            titlePrefix: 'Bug fixed',
            matchedPattern: 'bug fixed',
            importance: 'medium',
            weight: 0.7,
            matches: sentence => /\b(bug fixed|fixed bug|fix(ed)?|resolved bug|corrigido|bug corrigido|erro corrigido|resolvido|consertado)\b/.test(sentence)
        },
        {
            memoryType: 'project_decision',
            titlePrefix: 'Decision',
            matchedPattern: 'decided',
            importance: 'high',
            weight: 0.85,
            matches: sentence => /\b(decided|decision|we chose|we agreed|decidido|decidimos|decisao|foi decidido|combinamos|acordamos)\b/.test(sentence)
        },
        {
            memoryType: 'project_convention',
            titlePrefix: 'Project standard',
            matchedPattern: 'standard',
            importance: 'medium',
            weight: 0.7,
            matches: sentence => /\b(standard|convention|default pattern|project standard|padrao|convencao|padrao do projeto|padrao oficial)\b/.test(sentence)
        },
        {
            memoryType: 'project_convention',
            titlePrefix: 'Always',
            matchedPattern: 'always',
            importance: 'medium',
            weight: 0.7,
            matches: sentence => /\b(always|sempre)\b/.test(sentence)
        },
        {
            memoryType: 'project_convention',
            titlePrefix: 'Never',
            matchedPattern: 'never',
            importance: 'medium',
            weight: 0.7,
            matches: sentence => /\b(never|nunca|jamais)\b/.test(sentence)
        },
        {
            memoryType: 'user_preference',
            titlePrefix: 'Preference',
            matchedPattern: 'prefer',
            importance: 'medium',
            weight: 0.6,
            matches: sentence => /\b(prefer|prefers|preference|prefiro|prefere|preferimos|preferencia)\b/.test(sentence),
            scope: sentence => this.isGlobalPreference(sentence) ? 'global' : 'workspace'
        }
    ];

    extract(request: MemoryCandidateProposalRequest): MemoryExtractedMemoryCandidate[] {
        const candidates: MemoryExtractedMemoryCandidate[] = [];
        const seen = new Set<string>();
        for (const sentence of this.sentences(request.text)) {
            const normalized = this.normalize(sentence);
            const rule = this.rules.find(candidateRule => candidateRule.matches(normalized));
            if (!rule) {
                continue;
            }
            const content = this.cleanContent(sentence);
            const scope = rule.scope?.(normalized) ?? 'workspace';
            const candidate: MemoryExtractedMemoryCandidate = {
                scope,
                memoryType: rule.memoryType,
                title: this.title(rule.titlePrefix, content),
                content,
                importance: rule.importance,
                weight: rule.weight,
                source: request.source ?? 'memory-candidate-extractor',
                evidence: this.evidence(request, rule.matchedPattern, content),
                matchedPattern: rule.matchedPattern,
                confidence: 0.8
            };
            const key = `${candidate.scope}:${candidate.memoryType}:${this.normalize(candidate.title)}:${this.normalize(candidate.content)}`;
            if (!seen.has(key)) {
                seen.add(key);
                candidates.push(candidate);
            }
            if (request.maxCandidates && candidates.length >= request.maxCandidates) {
                break;
            }
        }
        return candidates;
    }

    protected sentences(text: string): string[] {
        return text
            .replace(/\r/g, '\n')
            .split(/\n+|[.!?]\s+/)
            .map(sentence => sentence.trim())
            .filter(sentence => sentence.length >= 8);
    }

    protected cleanContent(sentence: string): string {
        return sentence.replace(/^[-*>\s]+/, '').replace(/\s+/g, ' ').trim();
    }

    protected title(prefix: string, content: string): string {
        const normalized = content
            .replace(/^(we\s+)?(decided|prefer|always|never|standard|run command|test command|security note)\s*(that|to|is|:)?\s*/i, '')
            .replace(/^(decidimos|prefiro|preferimos|sempre|nunca|padrao|comando de teste|nota de seguranca)\s*(que|:)?\s*/i, '')
            .trim();
        const summary = normalized || content;
        return `${prefix}: ${summary.slice(0, 80)}${summary.length > 80 ? '...' : ''}`;
    }

    protected evidence(request: MemoryCandidateProposalRequest, matchedPattern: string, content: string): string {
        return JSON.stringify({
            source: request.source ?? 'memory-candidate-extractor',
            sourceEventId: request.eventId,
            relativePath: request.relativePath,
            matchedPattern,
            evidence: request.evidence,
            excerpt: content
        });
    }

    protected isGlobalPreference(sentence: string): boolean {
        const userPreference = /\b(i prefer|my preference|user prefers|eu prefiro|minha preferencia|usuario prefere|usuaria prefere)\b/.test(sentence);
        const workspaceBound = /\b(project|workspace|repo|repository|codebase|projeto|workspace|repositorio|codigo)\b/.test(sentence);
        return userPreference && !workspaceBound;
    }

    protected normalize(value: string): string {
        return value
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();
    }
}

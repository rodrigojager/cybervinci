// *****************************************************************************
// Copyright (C) 2026.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { MemoryCodeChunk, MemoryItem } from './memory-types';

export interface MemoryContradictionCandidate {
    title: string;
    content: string;
    evidence: string;
    confidence: number;
    originMarkers: string[];
}

interface AssertionSource {
    id: string;
    label: string;
    subject: string;
    polarity: 'positive' | 'negative';
    sourceKind: 'memory' | 'code' | 'local-docs';
    path?: string;
}

interface DependencySource {
    id: string;
    name: string;
    sourceKind: 'direct-manifest' | 'lockfile';
    path?: string;
    version?: string;
}

const DANGEROUS_INDIRECT_DEPENDENCIES = new Map<string, { severity: 'high' | 'critical'; reason: string }>([
    ['event-stream', { severity: 'critical', reason: 'known supply-chain compromise package' }],
    ['flatmap-stream', { severity: 'critical', reason: 'known malicious transitive dependency' }],
    ['ua-parser-js', { severity: 'critical', reason: 'known compromised package releases' }],
    ['coa', { severity: 'critical', reason: 'known compromised package releases' }],
    ['rc', { severity: 'critical', reason: 'known compromised package releases' }],
    ['node-ipc', { severity: 'high', reason: 'known protestware/supply-chain risk history' }],
    ['peacenotwar', { severity: 'high', reason: 'known protestware/supply-chain risk history' }],
    ['colors', { severity: 'high', reason: 'known package sabotage risk history' }],
    ['faker', { severity: 'high', reason: 'known package sabotage risk history' }]
]);

export class ContradictionDetector {

    detect(input: {
        memories: readonly MemoryItem[];
        codeChunks: readonly MemoryCodeChunk[];
        existingCandidates?: readonly MemoryItem[];
        limit?: number;
    }): MemoryContradictionCandidate[] {
        const sources = [
            ...input.memories
                .filter(memory => memory.status === 'active')
                .filter(memory => memory.source !== 'deterministic-contradiction-detector')
                .map(memory => this.assertionFromMemory(memory)),
            ...input.codeChunks.map(chunk => this.assertionFromChunk(chunk))
        ].filter((source): source is AssertionSource => source !== undefined);
        const existing = new Set((input.existingCandidates ?? []).flatMap(candidate => candidate.originMarkers ?? []));
        const results: MemoryContradictionCandidate[] = [];
        const limit = input.limit ?? 20;
        results.push(...this.detectDangerousIndirectDependencies(input.codeChunks, existing, limit - results.length));
        for (let i = 0; i < sources.length && results.length < limit; i++) {
            for (let j = i + 1; j < sources.length && results.length < limit; j++) {
                const left = sources[i];
                const right = sources[j];
                if (left.subject !== right.subject || left.polarity === right.polarity || left.id === right.id) {
                    continue;
                }
                const marker = this.marker(left, right);
                if (existing.has(marker) || results.some(candidate => candidate.originMarkers.includes(marker))) {
                    continue;
                }
                results.push(this.toContradictionCandidate(left, right, marker));
            }
        }
        return results;
    }

    protected assertionFromMemory(memory: MemoryItem): AssertionSource | undefined {
        const text = `${memory.title}. ${memory.content}`;
        const polarity = this.polarity(text);
        const subject = this.subject(memory.title || memory.content);
        if (!polarity || !subject) {
            return undefined;
        }
        return {
            id: memory.id,
            label: memory.title,
            subject,
            polarity,
            sourceKind: 'memory'
        };
    }

    protected assertionFromChunk(chunk: MemoryCodeChunk): AssertionSource | undefined {
        const text = `${chunk.title}. ${chunk.content}`;
        const polarity = this.polarity(text);
        const subject = this.subject(chunk.title);
        if (!polarity || !subject) {
            return undefined;
        }
        return {
            id: chunk.id,
            label: chunk.title,
            subject,
            polarity,
            sourceKind: chunk.chunkKind === 'markdown-section' || chunk.chunkKind === 'text-block' ? 'local-docs' : 'code',
            path: `${chunk.relativePath}:${chunk.startLine}`
        };
    }

    protected polarity(text: string): AssertionSource['polarity'] | undefined {
        const normalized = this.normalize(text);
        if (/\b(no|not|never|without|disable[sd]?|disabled|false|forbid(?:s|den)?|avoid|deprecated|unsupported)\b/.test(normalized)) {
            return 'negative';
        }
        if (/\b(use[sd]?|enable[sd]?|enabled|true|required?|support(?:s|ed)?|allow(?:s|ed)?|recommended|must|should)\b/.test(normalized)) {
            return 'positive';
        }
        return undefined;
    }

    protected subject(text: string): string | undefined {
        const tokens = this.normalize(text)
            .replace(/\b(no|not|never|without|disable[sd]?|disabled|false|forbid(?:s|den)?|avoid|deprecated|unsupported|use[sd]?|enable[sd]?|enabled|true|required?|support(?:s|ed)?|allow(?:s|ed)?|recommended|must|should|the|a|an|this|that|project|memory|decision|note)\b/g, ' ')
            .match(/[a-z0-9][a-z0-9._-]{2,}/g) ?? [];
        const subject = tokens.slice(0, 5).join(' ');
        return subject.length >= 3 ? subject : undefined;
    }

    protected normalize(text: string): string {
        return text.toLowerCase().replace(/[`"'()[\]{}:;,]/g, ' ').replace(/\s+/g, ' ').trim();
    }

    protected marker(left: AssertionSource, right: AssertionSource): string {
        const ids = [left.id, right.id].sort();
        return `contradiction:${ids[0]}:${ids[1]}`;
    }

    protected detectDangerousIndirectDependencies(
        chunks: readonly MemoryCodeChunk[],
        existing: Set<string>,
        limit: number
    ): MemoryContradictionCandidate[] {
        if (limit <= 0) {
            return [];
        }
        const dependencies = chunks.flatMap(chunk => this.dependenciesFromChunk(chunk));
        const directNames = new Set(dependencies
            .filter(dependency => dependency.sourceKind === 'direct-manifest')
            .map(dependency => dependency.name));
        const candidates: MemoryContradictionCandidate[] = [];
        for (const dependency of dependencies.filter(item => item.sourceKind === 'lockfile')) {
            const risk = DANGEROUS_INDIRECT_DEPENDENCIES.get(dependency.name);
            if (!risk || directNames.has(dependency.name)) {
                continue;
            }
            const marker = `dangerous-indirect-dependency:${dependency.name}:${dependency.id}`;
            if (existing.has(marker) || candidates.some(candidate => candidate.originMarkers.includes(marker))) {
                continue;
            }
            candidates.push({
                title: `Review dangerous indirect dependency: ${dependency.name}`,
                content: `A ${risk.severity}-risk dependency appears in a lockfile without a direct manifest declaration. Review the dependency chain before accepting this candidate.`,
                confidence: risk.severity === 'critical' ? 0.86 : 0.78,
                evidence: [
                    `heuristic: dangerous indirect dependency "${dependency.name}"`,
                    `confidence:${risk.severity === 'critical' ? 0.86 : 0.78}`,
                    `reason:${risk.reason}`,
                    `lockfile:${dependency.id}${dependency.path ? ` (${dependency.path})` : ''}${dependency.version ? ` version ${dependency.version}` : ''}`,
                    `direct-manifest:${directNames.has(dependency.name) ? 'present' : 'absent'}`
                ].join('\n'),
                originMarkers: [marker, `source:${dependency.id}`, `dependency:${dependency.name}`, 'risk:dangerous-indirect-dependency']
            });
            if (candidates.length >= limit) {
                break;
            }
        }
        return candidates;
    }

    protected dependenciesFromChunk(chunk: MemoryCodeChunk): DependencySource[] {
        const path = chunk.relativePath.toLowerCase();
        if (path.endsWith('package.json')) {
            return this.dependenciesFromPackageJson(chunk);
        }
        if (path.endsWith('package-lock.json') || path.endsWith('npm-shrinkwrap.json') || path.endsWith('yarn.lock') || path.endsWith('pnpm-lock.yaml')) {
            return this.dependenciesFromLockfile(chunk);
        }
        return [];
    }

    protected dependenciesFromPackageJson(chunk: MemoryCodeChunk): DependencySource[] {
        try {
            const parsed = JSON.parse(chunk.content) as Record<string, unknown>;
            const results: DependencySource[] = [];
            for (const field of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
                const value = parsed[field];
                if (value && typeof value === 'object' && !Array.isArray(value)) {
                    for (const [name, version] of Object.entries(value as Record<string, unknown>)) {
                        results.push({
                            id: chunk.id,
                            name: name.toLowerCase(),
                            sourceKind: 'direct-manifest',
                            path: `${chunk.relativePath}:${chunk.startLine}`,
                            version: typeof version === 'string' ? version : undefined
                        });
                    }
                }
            }
            return results;
        } catch {
            return [];
        }
    }

    protected dependenciesFromLockfile(chunk: MemoryCodeChunk): DependencySource[] {
        const results = new Map<string, DependencySource>();
        const add = (name: string, version?: string): void => {
            const normalized = name.toLowerCase();
            if (!DANGEROUS_INDIRECT_DEPENDENCIES.has(normalized) || results.has(normalized)) {
                return;
            }
            results.set(normalized, {
                id: chunk.id,
                name: normalized,
                sourceKind: 'lockfile',
                path: `${chunk.relativePath}:${chunk.startLine}`,
                version
            });
        };
        try {
            const parsed = JSON.parse(chunk.content) as Record<string, unknown>;
            const packages = parsed.packages;
            if (packages && typeof packages === 'object' && !Array.isArray(packages)) {
                for (const [packagePath, value] of Object.entries(packages as Record<string, unknown>)) {
                    const match = /(?:^|\/)node_modules\/((?:@[^/]+\/)?[^/]+)$/.exec(packagePath);
                    if (match) {
                        add(match[1], this.versionFromObject(value));
                    }
                }
            }
            const dependencies = parsed.dependencies;
            if (dependencies && typeof dependencies === 'object' && !Array.isArray(dependencies)) {
                for (const [name, value] of Object.entries(dependencies as Record<string, unknown>)) {
                    add(name, this.versionFromObject(value));
                }
            }
        } catch {
            for (const name of DANGEROUS_INDIRECT_DEPENDENCIES.keys()) {
                if (new RegExp(`(?:^|[\\s"'/])${this.escapeRegExp(name)}(?:$|[\\s"':@/])`, 'i').test(chunk.content)) {
                    add(name);
                }
            }
        }
        return [...results.values()];
    }

    protected versionFromObject(value: unknown): string | undefined {
        return value && typeof value === 'object' && !Array.isArray(value) && typeof (value as { version?: unknown }).version === 'string'
            ? (value as { version: string }).version
            : undefined;
    }

    protected escapeRegExp(value: string): string {
        return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    protected toContradictionCandidate(left: AssertionSource, right: AssertionSource, marker: string): MemoryContradictionCandidate {
        const title = left.sourceKind === 'local-docs' || right.sourceKind === 'local-docs'
            ? `Review docs contradict implementation: ${left.subject}`
            : `Review possible contradiction: ${left.subject}`;
        const confidence = left.sourceKind === 'local-docs' && right.sourceKind === 'code' || left.sourceKind === 'code' && right.sourceKind === 'local-docs'
            ? 0.72
            : 0.68;
        return {
            title,
            content: `Deterministic heuristics found conflicting statements about "${left.subject}". Review before accepting or superseding either source.`,
            confidence,
            evidence: [
                `heuristic: opposite polarity for normalized subject "${left.subject}"`,
                `confidence:${confidence}`,
                `${left.sourceKind}:${left.id}${left.path ? ` (${left.path})` : ''} => ${left.polarity}: ${left.label}`,
                `${right.sourceKind}:${right.id}${right.path ? ` (${right.path})` : ''} => ${right.polarity}: ${right.label}`
            ].join('\n'),
            originMarkers: [marker, `source:${left.id}`, `source:${right.id}`]
        };
    }
}

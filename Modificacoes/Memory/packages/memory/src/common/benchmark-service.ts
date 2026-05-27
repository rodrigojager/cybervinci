// *****************************************************************************
// Copyright (C) 2026.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import {
    MemoryBenchmarkCaseResult,
    MemoryBenchmarkDatasetItem,
    MemoryBenchmarkDatasetSuite,
    MemoryBenchmarkFeedbackReport,
    MemoryBenchmarkReport,
    MemoryBenchmarkSecurityReport,
    MemoryCodeChunk,
    MemoryFeedbackRecord,
    MemoryFile,
    MemoryIndexingLatencyBenchmark,
    MemoryItem,
    MemoryStoredContextSuggestion,
    RetrievalResult
} from './memory-types';
import { SecretRedactionService } from './secret-redaction';
import { MEMORY_BENCHMARK_SUITES } from './benchmark-datasets';

const SECRET_LIKE = /\b(api[_-]?key|secret|token|password|passwd|private[_-]?key)\b\s*[:=]/i;

export class BenchmarkService {

    protected readonly redactionService = new SecretRedactionService();

    listVersionedSuites(): MemoryBenchmarkDatasetSuite[] {
        return MEMORY_BENCHMARK_SUITES.map(suite => this.cloneSuite(suite));
    }

    getVersionedSuite(id: string, version?: number): MemoryBenchmarkDatasetSuite | undefined {
        const suite = MEMORY_BENCHMARK_SUITES.find(candidate =>
            candidate.id === id && (version === undefined || candidate.version === version)
        );
        return suite ? this.cloneSuite(suite) : undefined;
    }

    validateSuite(suite: MemoryBenchmarkDatasetSuite): string[] {
        const issues: string[] = [];
        if (!suite.id || suite.version < 1) {
            issues.push('suite must have a stable id and positive version');
        }
        if (!suite.cases.length) {
            issues.push('suite must contain at least one benchmark case');
        }
        const seen = new Set<string>();
        for (const item of suite.cases) {
            if (seen.has(item.id)) {
                issues.push(`duplicate benchmark case id: ${item.id}`);
            }
            seen.add(item.id);
            if (!item.prompt.trim()) {
                issues.push(`benchmark case ${item.id} must include a prompt`);
            }
            if (!item.expectedIds?.length && !item.expectedTerms?.length) {
                issues.push(`benchmark case ${item.id} must include expected ids or terms`);
            }
        }
        for (const domain of ['retrieval', 'ranking', 'security', 'indexing', 'multi-session-memory'] as const) {
            if (!suite.domains.includes(domain)) {
                issues.push(`suite must cover ${domain}`);
            }
        }
        if (suite.domains.includes('multi-session-memory')) {
            for (const scope of ['global', 'workspace', 'repository', 'session', 'task'] as const) {
                if (!suite.cases.some(item => item.scope === scope)) {
                    issues.push(`multi-session memory suite must cover ${scope} scope`);
                }
            }
        }
        return issues;
    }

    buildDataset(input: {
        memories: readonly MemoryItem[];
        codeChunks: readonly MemoryCodeChunk[];
        limit?: number;
    }): MemoryBenchmarkDatasetItem[] {
        const limit = Math.max(1, input.limit ?? 12);
        const memoryItems = input.memories
            .filter(memory => memory.status === 'active')
            .slice(0, Math.ceil(limit / 2))
            .map(memory => ({
                id: `memory:${memory.id}`,
                prompt: this.compactPrompt(`${memory.title} ${this.firstSentence(memory.content)}`),
                expectedSourceKind: 'project-memory' as const,
                expectedIds: [memory.id],
                expectedTerms: this.terms(`${memory.title} ${memory.content}`).slice(0, 4),
                scope: memory.scope
            }));
        const codeItems = input.codeChunks
            .slice(0, Math.max(0, limit - memoryItems.length))
            .map(chunk => ({
                id: `code:${chunk.id}`,
                prompt: this.compactPrompt(`${chunk.title} ${this.firstSentence(chunk.content)}`),
                expectedSourceKind: 'code' as const,
                expectedIds: [chunk.id],
                expectedTerms: this.terms(`${chunk.title} ${chunk.content}`).slice(0, 4)
            }));
        return [...memoryItems, ...codeItems].slice(0, limit);
    }

    caseResult(
        item: MemoryBenchmarkDatasetItem,
        results: readonly RetrievalResult[],
        latencyMs: number
    ): MemoryBenchmarkCaseResult {
        const top = results[0];
        const hit = results.some(result => this.matches(item, result));
        return this.redactionService.redactJson({
            ...item,
            latencyMs,
            hit,
            topResultId: top?.id,
            topResultTitle: top?.title,
            topResultSourceKind: top?.sourceKind,
            resultCount: results.length,
            estimatedTokens: results.reduce((sum, result) => sum + (result.estimatedTokens ?? this.estimateTokens(result.snippet)), 0)
        });
    }

    buildReport(input: {
        workspacePath: string;
        generatedAt: string;
        dataset: readonly MemoryBenchmarkDatasetItem[];
        cases: readonly MemoryBenchmarkCaseResult[];
        memories: readonly MemoryItem[];
        codeChunks: readonly MemoryCodeChunk[];
        files: readonly MemoryFile[];
        resultSets: readonly RetrievalResult[][];
        contextSuggestions?: readonly MemoryStoredContextSuggestion[];
        feedbackRecords?: readonly MemoryFeedbackRecord[];
        indexingLatency?: MemoryIndexingLatencyBenchmark;
    }): MemoryBenchmarkReport {
        const baselineTokens = this.estimateBaselineTokens(input.memories, input.codeChunks);
        const contextTokens = input.cases.reduce((sum, item) => sum + item.estimatedTokens, 0);
        const latencies = input.cases.map(item => item.latencyMs).sort((left, right) => left - right);
        const recall = this.recall(input.cases);
        const multiSessionCases = input.cases.filter(item => this.isMultiSessionMemoryScope(item.scope));
        const multiSessionRecall = multiSessionCases.length ? this.recall(multiSessionCases) : recall;
        const security = this.securityReport(input.files, input.resultSets);
        const feedback = this.feedbackReport(input.contextSuggestions ?? [], input.feedbackRecords ?? [], input.resultSets);
        return this.redactionService.redactJson({
            workspacePath: input.workspacePath,
            generatedAt: input.generatedAt,
            datasetSize: input.dataset.length,
            baselineTokens,
            contextTokens,
            tokenReductionPercent: baselineTokens > 0 ? Math.max(0, Math.round((1 - contextTokens / baselineTokens) * 100)) : 0,
            recall,
            multiSessionRecall,
            averageLatencyMs: latencies.length ? Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length) : 0,
            p95LatencyMs: latencies.length ? latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * 0.95))] : 0,
            security,
            feedback,
            indexingLatency: input.indexingLatency,
            cases: [...input.cases],
            summary: this.summary(input.dataset.length, recall, security)
        });
    }

    buildIndexingLatencyBenchmark(input: {
        workspacePath: string;
        indexedAt: string;
        durationMs: number;
        files: readonly MemoryFile[];
        indexedFileCount: number;
        indexedChunkCount: number;
    }): MemoryIndexingLatencyBenchmark {
        const durationSeconds = Math.max(input.durationMs / 1000, 0.001);
        const ignoredBreakdown = {
            gitignore: 0,
            cvignore: 0,
            cybervinciignore: 0,
            denylist: 0,
            allowlist: 0,
            binary: 0,
            size: 0,
            generated: 0,
            secret: 0,
            sensitive: 0,
            large: 0
        };
        const languageBreakdown: Record<string, number> = {};
        for (const file of input.files) {
            if (file.ignoreReason?.kind) {
                ignoredBreakdown[file.ignoreReason.kind]++;
            }
            if (file.isSensitive) {
                ignoredBreakdown.sensitive++;
            }
            if (file.sizeBytes > 256_000 || file.ignoreReason?.kind === 'size') {
                ignoredBreakdown.large++;
            }
            if (file.isGenerated && file.ignoreReason?.kind !== 'generated') {
                ignoredBreakdown.generated++;
            }
            if (file.isBinary && file.ignoreReason?.kind !== 'binary') {
                ignoredBreakdown.binary++;
            }
            const language = file.languageId ?? file.extension?.replace(/^\./, '') ?? 'unknown';
            languageBreakdown[language || 'unknown'] = (languageBreakdown[language || 'unknown'] ?? 0) + 1;
        }
        const sensitiveFileCount = input.files.filter(file => file.isSensitive).length;
        const largeFileCount = input.files.filter(file => file.sizeBytes > 256_000 || file.ignoreReason?.kind === 'size').length;
        const generatedFileCount = input.files.filter(file => file.isGenerated).length;
        const binaryFileCount = input.files.filter(file => file.isBinary).length;
        const languageCount = Object.keys(languageBreakdown).length;
        const benchmark: MemoryIndexingLatencyBenchmark = {
            workspacePath: input.workspacePath,
            indexedAt: input.indexedAt,
            durationMs: Math.max(0, Math.round(input.durationMs)),
            fileCount: input.files.length,
            indexedFileCount: input.indexedFileCount,
            indexedChunkCount: input.indexedChunkCount,
            ignoredFileCount: input.files.filter(file => file.isIgnored).length,
            sensitiveFileCount,
            largeFileCount,
            generatedFileCount,
            binaryFileCount,
            multiLanguageFileCount: input.files.filter(file => !!file.languageId).length,
            languageCount,
            filesPerSecond: Number((input.files.length / durationSeconds).toFixed(2)),
            indexedFilesPerSecond: Number((input.indexedFileCount / durationSeconds).toFixed(2)),
            chunksPerSecond: Number((input.indexedChunkCount / durationSeconds).toFixed(2)),
            ignoredBreakdown,
            languageBreakdown,
            status: sensitiveFileCount || largeFileCount || generatedFileCount || binaryFileCount || languageCount > 1 ? 'attention' : 'passed',
            summary: this.indexingSummary(input.files.length, input.indexedFileCount, input.indexedChunkCount, Math.max(0, Math.round(input.durationMs)))
        };
        return this.redactionService.redactJson(benchmark);
    }

    estimateTokens(value: string): number {
        return Math.max(1, Math.ceil(value.length / 4));
    }

    protected estimateBaselineTokens(memories: readonly MemoryItem[], codeChunks: readonly MemoryCodeChunk[]): number {
        return memories.reduce((sum, memory) => sum + this.estimateTokens(`${memory.title}\n${memory.content}`), 0)
            + codeChunks.reduce((sum, chunk) => sum + this.estimateTokens(`${chunk.title}\n${chunk.content}`), 0);
    }

    protected recall(cases: readonly MemoryBenchmarkCaseResult[]): number {
        return cases.length ? Number((cases.filter(item => item.hit).length / cases.length).toFixed(3)) : 0;
    }

    protected isMultiSessionMemoryScope(scope: MemoryBenchmarkDatasetItem['scope']): boolean {
        return scope === 'global'
            || scope === 'workspace'
            || scope === 'repository'
            || scope === 'session'
            || scope === 'task';
    }

    protected securityReport(files: readonly MemoryFile[], resultSets: readonly RetrievalResult[][]): MemoryBenchmarkSecurityReport {
        const sensitivePaths = new Set(files.filter(file => file.isSensitive).map(file => file.relativePath));
        const results = resultSets.flat();
        const sensitiveResults = results.filter(result => result.uri && sensitivePaths.has(result.uri)).length;
        const secretLikeSnippets = results.filter(result => SECRET_LIKE.test(`${result.title}\n${result.snippet}\n${result.evidence ?? ''}`)).length;
        return {
            sensitiveFiles: sensitivePaths.size,
            sensitiveResults,
            secretLikeSnippets,
            status: sensitiveResults || secretLikeSnippets ? 'failed' : sensitivePaths.size ? 'attention' : 'passed'
        };
    }

    protected feedbackReport(
        suggestions: readonly MemoryStoredContextSuggestion[],
        feedbackRecords: readonly MemoryFeedbackRecord[],
        resultSets: readonly RetrievalResult[][]
    ): MemoryBenchmarkFeedbackReport {
        const decided = suggestions.filter(suggestion => suggestion.accepted !== undefined);
        const acceptedCount = decided.filter(suggestion => suggestion.accepted).length;
        const rejectedCount = decided.filter(suggestion => suggestion.accepted === false).length;
        const feedbackMultipliers = resultSets
            .flat()
            .map(result => result.rankingSignals?.feedbackMultiplier)
            .filter((value): value is number => value !== undefined);
        const feedbackApplied = feedbackMultipliers.filter(value => value !== 1);
        const unresolvedFeedbackCount = feedbackRecords.filter(record => !record.resolvedAt).length;
        const rejectionRate = decided.length ? rejectedCount / decided.length : 0;
        const averageFeedbackMultiplier = feedbackMultipliers.length
            ? feedbackMultipliers.reduce((sum, value) => sum + value, 0) / feedbackMultipliers.length
            : 1;
        return {
            suggestedCount: suggestions.length,
            acceptedCount,
            rejectedCount,
            rejectionRate: Number(rejectionRate.toFixed(3)),
            unresolvedFeedbackCount,
            feedbackAppliedResultCount: feedbackApplied.length,
            feedbackBoostedResultCount: feedbackApplied.filter(value => value > 1).length,
            feedbackPenalizedResultCount: feedbackApplied.filter(value => value < 1).length,
            averageFeedbackMultiplier: Number(averageFeedbackMultiplier.toFixed(3)),
            status: rejectionRate > 0.5 || feedbackApplied.some(value => value < 1) ? 'attention' : 'passed'
        };
    }

    protected matches(item: MemoryBenchmarkDatasetItem, result: RetrievalResult): boolean {
        if (item.expectedIds?.includes(result.id)) {
            return true;
        }
        if (item.expectedSourceKind !== result.sourceKind) {
            return false;
        }
        const haystack = `${result.title} ${result.snippet} ${result.evidence ?? ''}`.toLowerCase();
        return !!item.expectedTerms?.length && item.expectedTerms.some(term => haystack.includes(term));
    }

    protected firstSentence(value: string): string {
        return value.split(/[.!?]\s/)[0] ?? value;
    }

    protected compactPrompt(value: string): string {
        return value.replace(/\s+/g, ' ').trim().slice(0, 180);
    }

    protected terms(value: string): string[] {
        return Array.from(new Set(value.toLowerCase().split(/[^a-z0-9_]+/).filter(term => term.length > 3)));
    }

    protected summary(datasetSize: number, recall: number, security: MemoryBenchmarkSecurityReport): string {
        if (!datasetSize) {
            return 'Benchmark dataset is empty. Index the workspace or add memories to collect metrics.';
        }
        if (security.status === 'failed') {
            return 'Benchmark completed with security findings that need review.';
        }
        return `Benchmark completed with ${Math.round(recall * 100)}% recall on ${datasetSize} local cases.`;
    }

    protected indexingSummary(fileCount: number, indexedFileCount: number, indexedChunkCount: number, durationMs: number): string {
        return `Workspace indexing benchmark processed ${fileCount} files, indexed ${indexedFileCount} files and ${indexedChunkCount} chunks in ${durationMs}ms.`;
    }

    protected cloneSuite(suite: MemoryBenchmarkDatasetSuite): MemoryBenchmarkDatasetSuite {
        return this.redactionService.redactJson(JSON.parse(JSON.stringify(suite)));
    }
}

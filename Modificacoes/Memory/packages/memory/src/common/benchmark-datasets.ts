// *****************************************************************************
// Copyright (C) 2026.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { MemoryBenchmarkDatasetSuite } from './memory-types';

export const MEMORY_BENCHMARK_DATASET_VERSION = 1;

export const MEMORY_BENCHMARK_SUITES: readonly MemoryBenchmarkDatasetSuite[] = [{
    id: 'memory-core-v1',
    version: MEMORY_BENCHMARK_DATASET_VERSION,
    title: 'Memory core retrieval suite',
    description: 'Versioned local-first cases for retrieval, ranking, security, indexing, and multi-session memory behavior.',
    domains: ['retrieval', 'ranking', 'security', 'indexing', 'multi-session-memory'],
    createdAt: '2026-05-20T00:00:00.000Z',
    updatedAt: '2026-05-20T00:00:00.000Z',
    expectedMinimumRecall: 0.8,
    securityExpectations: {
        sensitiveFiles: 1,
        sensitiveResults: 0,
        secretLikeSnippets: 0
    },
    cases: [{
        id: 'multi-session-memory:global-ide-policy',
        prompt: 'Find the IDE-wide memory policy that follows every workspace',
        expectedSourceKind: 'project-memory',
        expectedIds: ['mem_global_ide_context_cart_policy'],
        expectedTerms: ['global', 'ide', 'context', 'cart'],
        scope: 'global'
    }, {
        id: 'multi-session-memory:workspace-storage-policy',
        prompt: 'Find the current workspace memory storage decision',
        expectedSourceKind: 'project-memory',
        expectedIds: ['mem_workspace_sqlite_storage_policy'],
        expectedTerms: ['workspace', 'sqlite', 'storage'],
        scope: 'workspace'
    }, {
        id: 'retrieval:repository-memory-remote-clone',
        prompt: 'How does repository-scoped storage survive a different local clone path?',
        expectedSourceKind: 'repository-memory',
        expectedIds: ['mem_repo_clone_policy'],
        expectedTerms: ['repositoryid', 'remote', 'clone'],
        scope: 'repository'
    }, {
        id: 'ranking:feedback-graph-repository',
        prompt: 'Rank checkout context with graph signals and accepted feedback',
        expectedSourceKind: 'code-graph',
        expectedIds: ['graph_checkout_orchestrator'],
        expectedTerms: ['checkout', 'graph', 'accepted'],
        scope: 'repository'
    }, {
        id: 'security:ignored-secret-file',
        prompt: 'Ensure ignored secret material is not returned as context',
        expectedSourceKind: 'code',
        expectedIds: ['chunk_public_security_policy'],
        expectedTerms: ['redacted', 'audit', 'secret']
    }, {
        id: 'indexing:local-docs-fallback',
        prompt: 'Find the local versioned docs fallback for workspace sections',
        expectedSourceKind: 'local-docs',
        expectedIds: ['doc_workspace_sections_fallback'],
        expectedTerms: ['workspace', 'sections', 'fallback']
    }, {
        id: 'multi-session-memory:active-session',
        prompt: 'Find the current session handoff without using expired task memory',
        expectedSourceKind: 'project-memory',
        expectedIds: ['mem_session_checkout_handoff'],
        expectedTerms: ['handoff', 'checkout', 'session'],
        scope: 'session'
    }, {
        id: 'multi-session-memory:active-task',
        prompt: 'Find the current task handoff without using expired task memory',
        expectedSourceKind: 'task-memory',
        expectedIds: ['mem_task_checkout_handoff'],
        expectedTerms: ['handoff', 'checkout', 'task'],
        scope: 'task'
    }]
}];

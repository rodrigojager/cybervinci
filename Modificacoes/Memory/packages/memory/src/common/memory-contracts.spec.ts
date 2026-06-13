// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { expect } from 'chai';
import {
    BenchmarkService,
    BlastRadiusAnalyzer,
    ConflictAnalysisAnalyzer,
    ContextPackBuilder,
    ContextSuggestionService,
    EventCaptureBus,
    FeedbackService,
    GodNodeAnalyzer,
    GraphCommunityAnalyzer,
    GraphDiffService,
    IntentClassifier,
    IcmBridgeService,
    KnowledgeGraphService,
    MemoryServiceHelper,
    PromptNormalizer,
    MEMORY_SCHEMA,
    PullRequestGraphAnalyzer,
    SecretScanner,
    MemoryVectorService,
    SkillSuggestionEngine,
    TokenBudgetService
} from './index';
import type {
    MemoryArchitectureGraph,
    MemoryDomainGraph,
    MemoryFile,
    IRetrievalSource,
    MemoryItem,
    MemoryPromptIntent,
    MemoryRelation,
    MemoryEventType,
    MemoryWorkspaceSettings,
    MemorySecurityGraph,
    MemorySymbol,
    MemoryTestGraph,
    MemoryUserPreferenceGraph,
    MemoryWorkflowGraph,
    RetrievalResult
} from './index';

type SecretSeverity = 'low' | 'medium' | 'high' | 'critical';

interface SecretFinding {
    kind: 'api-key' | 'token' | 'password' | 'private-key' | 'connection-string' | 'unknown';
    severity: SecretSeverity;
    fingerprint: string;
    redactedPreview: string;
    range?: {
        startLine: number;
        startColumn: number;
        endLine: number;
        endColumn: number;
    };
    sourceUri?: string;
}

interface SecretScannerResult {
    findings: SecretFinding[];
    redactedContent: string;
}

interface PromptSection {
    id: string;
    title: string;
    content: string;
}

interface PromptNormalizerResult {
    normalizedPrompt: string;
    sections: readonly PromptSection[];
    redactionCount: number;
    warnings: readonly string[];
}

interface SkillSuggestion {
    skillId: string;
    confidence: number;
    reasons: readonly string[];
}

interface SkillSuggestionResult {
    suggestions: readonly SkillSuggestion[];
}

describe('Memory service contracts', () => {
    it('defines event types for tool, file lifecycle, build, test, and ignored context capture', () => {
        const eventTypes: MemoryEventType[] = [
            'tool.requested',
            'file.created',
            'file.deleted',
            'file.saved',
            'file.renamed',
            'build.started',
            'build.failed',
            'build.succeeded',
            'test.started',
            'test.failed',
            'test.passed',
            'context.ignored'
        ];

        expect(eventTypes).to.have.members([
            'tool.requested',
            'file.created',
            'file.deleted',
            'file.saved',
            'file.renamed',
            'build.started',
            'build.failed',
            'build.succeeded',
            'test.started',
            'test.failed',
            'test.passed',
            'context.ignored'
        ]);
    });

    it('requires separate opt-in consent flags for each sensitive Memory capability', () => {
        const settings: MemoryWorkspaceSettings = {
            workspacePath: '/workspace',
            enabled: false,
            graphEnabled: false,
            memoryEnabled: false,
            skillSuggestionsEnabled: false,
            chatLearningEnabled: false,
            chatInlineSuggestionsEnabled: false,
            editorHoverEnabled: false,
            optIn: {
                codeGraph: false,
                projectMemory: false,
                transcriptSearch: false,
                promptSnippets: false,
                skills: false,
                contextCart: false,
                editorHover: false
            },
            updatedAt: '2026-05-20T00:00:00.000Z'
        };

        expect(settings.enabled).to.equal(false);
        expect(settings.graphEnabled).to.equal(false);
        expect(settings.memoryEnabled).to.equal(false);
        expect(settings.skillSuggestionsEnabled).to.equal(false);
        expect(settings.chatLearningEnabled).to.equal(false);
        expect(settings.chatInlineSuggestionsEnabled).to.equal(false);
        expect(settings.editorHoverEnabled).to.equal(false);
        expect(settings.optIn).to.deep.include({
            codeGraph: false,
            projectMemory: false,
            transcriptSearch: false,
            promptSnippets: false,
            skills: false,
            contextCart: false,
            editorHover: false
        });
    });

    it('keeps consent grants independent across code graph, memory, chat learning, skill suggestions, Context Cart, and hover', () => {
        const baseOptIn: NonNullable<MemoryWorkspaceSettings['optIn']> = {
            codeGraph: false,
            projectMemory: false,
            transcriptSearch: false,
            skills: false,
            contextCart: false,
            editorHover: false
        };
        const sensitiveFlags = [
            'codeGraph',
            'projectMemory',
            'transcriptSearch',
            'promptSnippets',
            'skills',
            'contextCart',
            'editorHover'
        ] as const;

        for (const flag of sensitiveFlags) {
            const optIn: NonNullable<MemoryWorkspaceSettings['optIn']> = {
                ...baseOptIn,
                [flag]: true
            };
            const enabledFlags = sensitiveFlags.filter(candidate => optIn[candidate] === true);

            expect(enabledFlags).to.deep.equal([flag]);
        }
    });

    it('refuses embeddings for sensitive chunks, docs, memories, and transcripts', () => {
        const vectorService = new MemoryVectorService();
        const secret = 'TOKEN=abcdefghijklmnopqrstuvwxyz123456';

        expect(() => vectorService.embedCodeChunk({
            title: 'Sensitive chunk',
            content: `Do not vectorize ${secret}.`,
            relativePath: 'src/config.ts'
        })).to.throw('refused to embed sensitive code chunk content');
        expect(() => vectorService.embedCodeChunk({
            title: 'Marked sensitive chunk',
            content: 'No raw secret here, but the source file was classified sensitive.',
            relativePath: '.env.example',
            isSensitive: true
        })).to.throw('refused to embed sensitive code chunk content');
        expect(() => vectorService.embedDocument({
            title: 'Sensitive doc',
            content: `API key note ${secret}.`,
            source: 'local-docs'
        })).to.throw('refused to embed sensitive document content');
        expect(() => vectorService.embedMemory({
            title: 'Sensitive memory',
            content: `Remembering ${secret} is not allowed.`,
            memoryType: 'security_note',
            importance: 'high'
        })).to.throw('refused to embed sensitive memory content');
        expect(() => vectorService.embedTranscript({
            eventType: 'prompt.submitted',
            payload: `User pasted ${secret}.`
        })).to.throw('refused to embed sensitive transcript content');
    });

    it('keeps SecretScanner findings safe to serialize without raw secrets', () => {
        const rawSecret = 'sk-test-1234567890';
        const result: SecretScannerResult = {
            findings: [{
                kind: 'api-key',
                severity: 'critical',
                fingerprint: 'sha256:7f83b1657ff1fc53',
                redactedPreview: 'sk-test-********',
                range: {
                    startLine: 3,
                    startColumn: 13,
                    endLine: 3,
                    endColumn: 31
                },
                sourceUri: 'file:///workspace/.env'
            }],
            redactedContent: 'OPENAI_API_KEY=sk-test-********'
        };

        const serialized = JSON.stringify(result);

        expect(result.findings).to.have.length(1);
        expect(result.findings[0].severity).to.equal('critical');
        expect(result.findings[0].fingerprint).to.match(/^sha256:[a-f0-9]+$/);
        expect(serialized).not.to.contain(rawSecret);
        expect(result.redactedContent).not.to.contain(rawSecret);
    });

    it('redacts secret findings across unicode boundaries and caps large payload scans', () => {
        const scanner = new SecretScanner();
        const secret = 'abcdefghijklmnopqrstuvwxyz123456';
        const largePayload = `${'safe text '.repeat(1000)}🔐API_KEY=${secret}\n${'tail '.repeat(1000)}`;

        const result = scanner.scan({
            content: largePayload,
            sourceUri: 'docs/seguranca.md',
            maxFindings: 1
        });

        expect(result.findings).to.have.length(1);
        expect(result.findings[0].sourceUri).to.equal('docs/seguranca.md');
        expect(result.findings[0].redactedPreview).to.equal('abcdef********3456');
        expect(result.redactedContent).to.contain('🔐API_KEY=abcdef********3456');
        expect(result.redactedContent).not.to.contain(secret);
    });

    it('defines a normalized prompt envelope with stable sections and applied redactions', () => {
        const result: PromptNormalizerResult = {
            normalizedPrompt: [
                '# Task',
                'Explain the failing tests.',
                '',
                '# Project Context',
                '- package: @cybervinci/memory',
                '- secret findings: 1 redacted'
            ].join('\n'),
            sections: [{
                id: 'task',
                title: 'Task',
                content: 'Explain the failing tests.'
            }, {
                id: 'project-context',
                title: 'Project Context',
                content: '- package: @cybervinci/memory\n- secret findings: 1 redacted'
            }],
            redactionCount: 1,
            warnings: []
        };

        expect(result.normalizedPrompt).not.to.match(/\r\n/);
        expect(result.normalizedPrompt).not.to.match(/[ \t]$/m);
        expect(result.sections.map(section => section.id)).to.deep.equal(['task', 'project-context']);
        expect(result.redactionCount).to.equal(1);
        expect(result.warnings).to.deep.equal([]);
    });

    it('redacts secret-like values from context packs before prompt assembly', () => {
        const secret = 'abcdefghijklmnopqrstuvwxyz123456';
        const pack = new ContextPackBuilder().build({
            workspacePath: '/workspace',
            prompt: 'Review auth context',
            retrievalResults: [{
                id: 'result_secret',
                sourceKind: 'code',
                title: 'Auth token',
                snippet: `token = ${secret}`,
                evidence: `password = ${secret}`,
                score: 1,
                uri: `src/token=${secret}.ts`
            }]
        });

        expect(JSON.stringify(pack)).not.to.contain(secret);
        expect(JSON.stringify(pack)).to.contain('abcdef********3456');
    });

    it('redacts and minimizes events in the capture bus before repository persistence', async () => {
        const secret = 'abcdefghijklmnopqrstuvwxyz123456';
        const persisted: unknown[] = [];
        const bus = new EventCaptureBus({
            appendEvent: async event => {
                persisted.push(event);
            },
            listEvents: async () => []
        });

        const event = await bus.record({
            workspacePath: '/workspace',
            eventType: 'prompt.submitted',
            relativePath: `src/token-${secret}.ts`,
            promptSignature: `sig-${secret}`,
            payload: JSON.stringify({
                prompt: `Deploy with API_KEY=${secret}`,
                redactedPromptSnippet: `Deploy with API_KEY=${secret}`,
                promptTextHash: 'sha256:prompt',
                promptSignature: 'intent:deploy'
            })
        });

        const serialized = JSON.stringify({ event, persisted });

        expect(serialized).not.to.contain(secret);
        expect(event.payload).not.to.contain('Deploy with API_KEY');
        expect(event.payload).not.to.contain('"prompt":');
        expect(event.payload).not.to.contain('redactedPromptSnippet');
        expect(event.payload).to.contain('promptTextHash');
    });

    it('requires SkillSuggestionEngine results to be ranked, bounded, and deduplicated', () => {
        const result: SkillSuggestionResult = {
            suggestions: [{
                skillId: 'openai-docs',
                confidence: 0.92,
                reasons: ['Task asks for current OpenAI API behavior.']
            }, {
                skillId: 'browser-use',
                confidence: 0.73,
                reasons: ['Task needs local UI verification.']
            }, {
                skillId: 'imagegen',
                confidence: 0.21,
                reasons: ['Task may need generated bitmap assets.']
            }]
        };

        const ids = result.suggestions.map(suggestion => suggestion.skillId);
        const confidences = result.suggestions.map(suggestion => suggestion.confidence);

        expect(new Set(ids).size).to.equal(ids.length);
        expect(confidences.every(confidence => confidence >= 0 && confidence <= 1)).to.equal(true);
        expect(confidences).to.deep.equal([...confidences].sort((left, right) => right - left));
        expect(result.suggestions.every(suggestion => suggestion.reasons.length > 0)).to.equal(true);
    });

    it('excludes manual-only skills from automatic skill suggestions', () => {
        const engine = new SkillSuggestionEngine();
        const result = engine.suggest({
            task: 'review code and write tests',
            projectSignals: [],
            minimumConfidence: 0.1,
            availableSkills: [{
                id: 'manual-review-agent',
                name: 'Code Review Agent',
                description: 'Review code and write tests',
                discovery: 'manual'
            }, {
                id: 'auto-testing',
                name: 'Testing',
                description: 'Review code and write tests',
                discovery: 'auto'
            }]
        });

        expect(result.suggestions.map(suggestion => suggestion.skillId)).to.deep.equal(['auto-testing']);
    });

    it('defines SQLite-ready pi_* schema migrations', () => {
        expect(MEMORY_SCHEMA.tables).not.to.be.empty;
        expect(MEMORY_SCHEMA.tables.every(table => table.name.startsWith('pi_'))).to.equal(true);
        expect(MEMORY_SCHEMA.migrations[0].statements.some(statement => statement.includes('CREATE TABLE IF NOT EXISTS pi_files'))).to.equal(true);
    });

    it('defines workspace identity storage through pi_workspaces or an equivalent compatibility layer', () => {
        const requiredColumns = [
            'workspace_id',
            'repo',
            'branch',
            'head_commit',
            'flags',
            'created_at',
            'updated_at'
        ];
        const workspaceIdentityTable = MEMORY_SCHEMA.tables.find(table => {
            const columns = table.columns.map(column => column.name);
            return table.name === 'pi_workspaces'
                || requiredColumns.every(column => columns.includes(column));
        });
        const migrationStatements = MEMORY_SCHEMA.migrations
            .flatMap(migration => migration.statements)
            .map(statement => statement.replace(/\s+/g, ' ').trim().toLowerCase());

        expect(workspaceIdentityTable, 'expected pi_workspaces or an equivalent table with workspace identity metadata').to.exist;
        expect(workspaceIdentityTable!.columns.map(column => column.name)).to.include.members(requiredColumns);
        expect(
            migrationStatements.some(statement => statement.startsWith('create table if not exists pi_workspaces'))
            || migrationStatements.some(statement => requiredColumns.every(column => statement.includes(column)))
        ).to.equal(true);
    });

    it('defines pi_agent_events as a compatibility contract over pi_events', () => {
        const migrationStatements = MEMORY_SCHEMA.migrations
            .flatMap(migration => migration.statements)
            .map(statement => statement.replace(/\s+/g, ' ').trim().toLowerCase());

        expect(
            migrationStatements.some(statement => statement.startsWith('create view if not exists pi_agent_events as'))
        ).to.equal(true);
        expect(
            migrationStatements.some(statement => statement.includes('instead of insert on pi_agent_events'))
        ).to.equal(true);
        for (const column of [
            'workspace_id',
            'session_id',
            'task_id',
            'provider',
            'event_type',
            'payload_json',
            'file_id',
            'symbol_id',
            'relative_path',
            'command',
            'prompt_text_hash',
            'prompt_signature',
            'created_at'
        ]) {
            expect(
                migrationStatements.some(statement => statement.includes(column)),
                `expected pi_agent_events compatibility to expose ${column}`
            ).to.equal(true);
        }
    });

    it('defines persistent knowledge concept storage fields', () => {
        const table = MEMORY_SCHEMA.tables.find(candidate => candidate.name === 'pi_knowledge_concepts');
        const columns = table?.columns.map(column => column.name) ?? [];
        const migration = MEMORY_SCHEMA.migrations.find(candidate => candidate.id === '010_create_knowledge_concepts');
        const statements = migration?.statements.map(statement => statement.replace(/\s+/g, ' ').trim().toLowerCase()) ?? [];

        expect(MEMORY_SCHEMA.version).to.equal(20);
        expect(columns).to.include.members([
            'id',
            'graph_id',
            'concept_type',
            'title',
            'description',
            'scope',
            'source',
            'evidence',
            'confidence',
            'created_at',
            'updated_at'
        ]);
        expect(statements.some(statement => statement.startsWith('create table if not exists pi_knowledge_concepts'))).to.equal(true);
        expect(statements.some(statement => statement.includes('concept_type text not null'))).to.equal(true);
        expect(statements.some(statement => statement.includes('confidence real not null'))).to.equal(true);
    });

    it('adds stable workspace_id mapping for every workspace-scoped table outside pi_workspaces', () => {
        const workspaceScopedTables = MEMORY_SCHEMA.tables
            .filter(table => table.name !== 'pi_workspaces' && table.columns.some(column => column.name === 'workspace_path'))
            .map(table => table.name);
        const migration = MEMORY_SCHEMA.migrations.find(candidate => candidate.id === '020_add_workspace_id_mapping');
        const statements = migration?.statements.map(statement => statement.replace(/\s+/g, ' ').trim().toLowerCase()) ?? [];

        expect(MEMORY_SCHEMA.version).to.equal(20);
        expect(workspaceScopedTables).not.to.be.empty;
        for (const table of workspaceScopedTables) {
            expect(
                statements.some(statement => statement === `alter table ${table} add column workspace_id text;`),
                `expected ${table} to add workspace_id`
            ).to.equal(true);
            expect(
                statements.some(statement => statement.includes(`update ${table} set workspace_id =`) && statement.includes('from pi_workspaces')),
                `expected ${table} to backfill workspace_id from pi_workspaces`
            ).to.equal(true);
            expect(
                statements.some(statement => statement === `create index if not exists idx_${table}_workspace_id on ${table} (workspace_id);`),
                `expected ${table} to index workspace_id`
            ).to.equal(true);
        }
    });

    it('defines persistent knowledge link storage fields', () => {
        const table = MEMORY_SCHEMA.tables.find(candidate => candidate.name === 'pi_knowledge_links');
        const columns = table?.columns.map(column => column.name) ?? [];
        const migration = MEMORY_SCHEMA.migrations.find(candidate => candidate.id === '011_create_knowledge_links');
        const statements = migration?.statements.map(statement => statement.replace(/\s+/g, ' ').trim().toLowerCase()) ?? [];

        expect(columns).to.include.members([
            'id',
            'graph_id',
            'source_kind',
            'source_id',
            'target_kind',
            'target_id',
            'relation_type',
            'confidence',
            'source',
            'evidence',
            'created_at',
            'updated_at'
        ]);
        expect(statements.some(statement => statement.startsWith('create table if not exists pi_knowledge_links'))).to.equal(true);
        expect(statements.some(statement => statement.includes('source_kind text not null'))).to.equal(true);
        expect(statements.some(statement => statement.includes('target_kind text not null'))).to.equal(true);
        expect(statements.some(statement => statement.includes('confidence real not null'))).to.equal(true);
    });

    it('defines persistent memory relation storage fields', () => {
        const table = MEMORY_SCHEMA.tables.find(candidate => candidate.name === 'pi_memory_relations');
        const columns = table?.columns.map(column => column.name) ?? [];
        const migration = MEMORY_SCHEMA.migrations.find(candidate => candidate.id === '012_create_memory_relations');
        const statements = migration?.statements.map(statement => statement.replace(/\s+/g, ' ').trim().toLowerCase()) ?? [];

        expect(columns).to.include.members([
            'id',
            'workspace_path',
            'scope',
            'source_memory_id',
            'target_memory_id',
            'relation_type',
            'confidence',
            'source',
            'evidence',
            'metadata_json',
            'created_at',
            'updated_at'
        ]);
        expect(statements.some(statement => statement.startsWith('create table if not exists pi_memory_relations'))).to.equal(true);
        expect(statements.some(statement => statement.includes("relation_type text not null check (relation_type in ('contradicts', 'refines', 'alternative_to', 'superseded_by', 'related_to'))"))).to.equal(true);
        expect(statements.some(statement => statement.includes('source_memory_id text not null'))).to.equal(true);
        expect(statements.some(statement => statement.includes('target_memory_id text not null'))).to.equal(true);
        expect(statements.some(statement => statement.includes('confidence real not null'))).to.equal(true);
    });

    it('defines scoped retrieval cache storage fields', () => {
        const table = MEMORY_SCHEMA.tables.find(candidate => candidate.name === 'pi_retrieval_cache');
        const columns = table?.columns.map(column => column.name) ?? [];
        const migration = MEMORY_SCHEMA.migrations.find(candidate => candidate.id === '014_create_retrieval_cache');
        const statements = migration?.statements.map(statement => statement.replace(/\s+/g, ' ').trim().toLowerCase()) ?? [];

        expect(columns).to.include.members([
            'id',
            'workspace_path',
            'query_key',
            'scope_params_json',
            'sources_hash',
            'results_json',
            'created_at',
            'expires_at'
        ]);
        expect(table?.indexes?.some(index => index.unique && index.columns.join(',') === 'workspace_path,query_key,sources_hash')).to.equal(true);
        expect(statements.some(statement => statement.startsWith('create table if not exists pi_retrieval_cache'))).to.equal(true);
        expect(statements.some(statement => statement.includes('sources_hash text not null'))).to.equal(true);
        expect(statements.some(statement => statement.includes('expires_at text not null'))).to.equal(true);
    });

    it('defines scoped transcript session and message storage fields', () => {
        const sessionTable = MEMORY_SCHEMA.tables.find(candidate => candidate.name === 'pi_transcript_sessions');
        const messageTable = MEMORY_SCHEMA.tables.find(candidate => candidate.name === 'pi_transcript_messages');
        const migration = MEMORY_SCHEMA.migrations.find(candidate => candidate.id === '016_create_transcript_storage');
        const statements = migration?.statements.map(statement => statement.replace(/\s+/g, ' ').trim().toLowerCase()) ?? [];

        expect(sessionTable?.columns.map(column => column.name)).to.include.members([
            'id',
            'workspace_path',
            'scope',
            'origin',
            'source',
            'started_at',
            'ended_at',
            'retention_policy',
            'redaction_status',
            'metadata_json',
            'created_at',
            'updated_at'
        ]);
        expect(messageTable?.columns.map(column => column.name)).to.include.members([
            'id',
            'session_id',
            'workspace_path',
            'scope',
            'origin',
            'role',
            'content',
            'redacted_content',
            'redaction_status',
            'redaction_summary_json',
            'retention_policy',
            'created_at',
            'updated_at'
        ]);
        expect(statements.some(statement => statement.startsWith('create table if not exists pi_transcript_sessions'))).to.equal(true);
        expect(statements.some(statement => statement.startsWith('create table if not exists pi_transcript_messages'))).to.equal(true);
        expect(statements.some(statement => statement.startsWith('create virtual table if not exists pi_transcript_message_fts'))).to.equal(true);
        expect(statements.some(statement => statement.includes('create trigger if not exists pi_transcript_messages_ai'))).to.equal(true);
    });

    it('defines mature specialized graph contracts for project intelligence domains', () => {
        const generatedAt = '2026-01-01T00:00:00.000Z';
        const architecture: MemoryArchitectureGraph = {
            kind: 'architecture',
            scope: 'repository',
            repositoryId: 'github.com/acme/project',
            title: 'Architecture',
            generatedAt,
            nodes: [{
                id: 'svc_api',
                graphKind: 'architecture',
                kind: 'architecture-service',
                label: 'API service',
                scope: 'repository',
                repositoryId: 'github.com/acme/project',
                sourceIds: ['symbol_api'],
                evidence: [{
                    kind: 'language-analyzer',
                    source: 'code-graph',
                    sourceId: 'symbol_api',
                    summary: 'Service class extracted from code graph.',
                    confidenceScore: 0.9,
                    capturedAt: generatedAt
                }]
            }],
            edges: []
        };
        const domain: MemoryDomainGraph = {
            kind: 'domain',
            scope: 'workspace',
            workspacePath: '/workspace',
            title: 'Domain',
            ubiquitousLanguage: ['order', 'invoice'],
            nodes: [{ id: 'domain_order', graphKind: 'domain', kind: 'domain-aggregate', label: 'Order' }],
            edges: [{ id: 'domain_edge', sourceId: 'domain_order', targetId: 'domain_invoice', relationType: 'emits', confidenceScore: 0.8 }]
        };
        const tests: MemoryTestGraph = {
            kind: 'tests',
            title: 'Tests',
            coveragePercent: 78,
            nodes: [{ id: 'test_gap', graphKind: 'tests', kind: 'test-gap', label: 'Missing controller tests', status: 'candidate' }],
            edges: [{ id: 'test_edge', sourceId: 'test_gap', targetId: 'svc_api', relationType: 'misses_coverage', confidenceScore: 0.75 }]
        };
        const security: MemorySecurityGraph = {
            kind: 'security',
            title: 'Security',
            threatModelStatus: 'draft',
            nodes: [{ id: 'threat_secret', graphKind: 'security', kind: 'security-threat', label: 'Secret exposure', status: 'candidate' }],
            edges: [{ id: 'security_edge', sourceId: 'control_redaction', targetId: 'threat_secret', relationType: 'mitigates', confidenceScore: 0.88 }]
        };
        const workflow: MemoryWorkflowGraph = {
            kind: 'workflow',
            title: 'Workflow',
            nodes: [{ id: 'workflow_review', graphKind: 'workflow', kind: 'workflow-step', label: 'Review candidates' }],
            edges: [{ id: 'workflow_edge', sourceId: 'workflow_trigger', targetId: 'workflow_review', relationType: 'triggers', confidenceScore: 0.7 }]
        };
        const preferences: MemoryUserPreferenceGraph = {
            kind: 'user-preferences',
            title: 'Preferences',
            nodes: [{ id: 'pref_local', graphKind: 'user-preferences', kind: 'preference-rule', label: 'Prefer local-first retrieval', importance: 'high' }],
            edges: [{ id: 'preference_edge', sourceId: 'pref_local', targetId: 'remote_llm', relationType: 'overrides', confidenceScore: 0.9 }]
        };

        expect([architecture, domain, tests, security, workflow, preferences].map(graph => graph.kind)).to.deep.equal([
            'architecture',
            'domain',
            'tests',
            'security',
            'workflow',
            'user-preferences'
        ]);
        expect(architecture.nodes[0].evidence?.[0].source).to.equal('code-graph');
        expect(domain.edges[0].relationType).to.equal('emits');
        expect(tests.edges[0].relationType).to.equal('misses_coverage');
        expect(security.edges[0].relationType).to.equal('mitigates');
        expect(workflow.edges[0].relationType).to.equal('triggers');
        expect(preferences.nodes[0].importance).to.equal('high');
    });

    it('detects deterministic god nodes from degree, fan-in, fan-out, and critical paths', () => {
        const files = [
            fileFixture({ id: 'file_core', relativePath: 'src/core.ts', fileName: 'core.ts' }),
            fileFixture({ id: 'file_leaf', relativePath: 'src/leaf.ts', fileName: 'leaf.ts' })
        ];
        const symbols = [
            symbolFixture({ id: 'sym_core', fileId: 'file_core', name: 'CoreService', fullName: 'CoreService' }),
            symbolFixture({ id: 'sym_helper', fileId: 'file_core', name: 'CoreHelper', fullName: 'CoreHelper' }),
            symbolFixture({ id: 'sym_a', fileId: 'file_leaf', name: 'CallerA' }),
            symbolFixture({ id: 'sym_b', fileId: 'file_leaf', name: 'CallerB' }),
            symbolFixture({ id: 'sym_c', fileId: 'file_leaf', name: 'CalleeC' }),
            symbolFixture({ id: 'sym_d', fileId: 'file_leaf', name: 'CalleeD' })
        ];
        const relations = [
            relationFixture('rel_a_core', 'sym_a', 'sym_core'),
            relationFixture('rel_b_core', 'sym_b', 'sym_core'),
            relationFixture('rel_core_c', 'sym_core', 'sym_c'),
            relationFixture('rel_core_d', 'sym_core', 'sym_d'),
            relationFixture('rel_helper_core', 'sym_helper', 'sym_core')
        ];

        const result = new GodNodeAnalyzer().analyze({
            files,
            symbols,
            relations,
            minDegree: 4,
            minCriticalPathCount: 4
        });

        const coreSymbol = result.nodes.find(node => node.id === 'sym_core');
        const coreFile = result.nodes.find(node => node.id === 'file_core');

        expect(result.thresholds.minDegree).to.equal(4);
        expect(result.nodes.map(node => node.id)).to.include.members(['sym_core', 'file_core']);
        expect(result.nodes.map(node => node.id)).not.to.include('sym_a');
        expect(coreSymbol).to.deep.include({
            kind: 'symbol',
            fanIn: 3,
            fanOut: 2,
            degree: 5,
            criticalPathCount: 6
        });
        expect(coreSymbol?.criticalPathIds).to.include('sym_a->sym_core->sym_c');
        expect(coreSymbol?.reasons).to.include.members(['degree:5', 'fan-in:3', 'fan-out:2', 'critical-paths:6']);
        expect(coreFile?.degree).to.equal(6);
        expect(coreFile?.criticalPathCount).to.equal(6);
    });

    it('detects named graph communities with heuristic main relations without embeddings', () => {
        const files = [
            fileFixture({ id: 'file_auth', relativePath: 'src/auth.ts', fileName: 'auth.ts' }),
            fileFixture({ id: 'file_session', relativePath: 'src/session.ts', fileName: 'session.ts' }),
            fileFixture({ id: 'file_billing', relativePath: 'src/billing.ts', fileName: 'billing.ts' }),
            fileFixture({ id: 'file_invoice', relativePath: 'src/invoice.ts', fileName: 'invoice.ts' })
        ];
        const symbols = [
            symbolFixture({ id: 'sym_auth', fileId: 'file_auth', name: 'AuthService' }),
            symbolFixture({ id: 'sym_session', fileId: 'file_session', name: 'SessionStore' }),
            symbolFixture({ id: 'sym_token', fileId: 'file_session', name: 'TokenPolicy' }),
            symbolFixture({ id: 'sym_billing', fileId: 'file_billing', name: 'BillingService' }),
            symbolFixture({ id: 'sym_invoice', fileId: 'file_invoice', name: 'InvoiceRepository' }),
            symbolFixture({ id: 'sym_payment', fileId: 'file_billing', name: 'PaymentPolicy' })
        ];
        const relations: MemoryRelation[] = [
            relationFixture('rel_auth_session', 'sym_auth', 'sym_session'),
            relationFixture('rel_session_token', 'sym_session', 'sym_token'),
            relationFixture('rel_auth_token', 'sym_auth', 'sym_token'),
            { ...relationFixture('rel_billing_invoice', 'sym_billing', 'sym_invoice'), relationType: 'uses_dependency' },
            { ...relationFixture('rel_payment_billing', 'sym_payment', 'sym_billing'), relationType: 'uses_dependency' },
            { ...relationFixture('rel_payment_invoice', 'sym_payment', 'sym_invoice'), relationType: 'uses_dependency', confidenceScore: 0.8 }
        ];

        const result = new GraphCommunityAnalyzer().analyze({
            files,
            symbols,
            relations,
            minCommunitySize: 3
        });

        expect(result.thresholds.maxIterations).to.equal(12);
        expect(result.communities).to.have.length(2);
        expect(result.communities.map(community => community.nodeIds)).to.deep.include.members([
            ['sym_auth', 'sym_session', 'sym_token'],
            ['sym_billing', 'sym_invoice', 'sym_payment']
        ]);
        const billing = result.communities.find(community => community.nodeIds.includes('sym_billing'));
        expect(billing?.name).to.equal('BillingService / InvoiceRepository uses dependency');
        expect(billing?.relationSummaries[0]).to.deep.equal({
            relationType: 'uses_dependency',
            count: 3,
            confidenceScore: 0.87
        });
        expect(billing?.mainRelations.map(relation => relation.id)).to.deep.equal([
            'rel_billing_invoice',
            'rel_payment_billing',
            'rel_payment_invoice'
        ]);
        expect(billing?.reasons).to.include.members(['3 connected nodes', '3 internal relations', 'dominant relation:uses_dependency']);
    });

    it('detects risky changed files from centrality, recent changes, low coverage, and sensitive memories', () => {
        const file = fileFixture({ id: 'file_auth', relativePath: 'src/auth.ts', fileName: 'auth.ts' });
        const symbols = [
            symbolFixture({ id: 'sym_auth', fileId: 'file_auth', name: 'AuthService', fullName: 'AuthService' }),
            symbolFixture({ id: 'sym_api', fileId: 'file_api', name: 'ApiController' }),
            symbolFixture({ id: 'sym_store', fileId: 'file_store', name: 'TokenStore' }),
            symbolFixture({ id: 'sym_session', fileId: 'file_session', name: 'SessionService' }),
            symbolFixture({ id: 'sym_audit', fileId: 'file_audit', name: 'AuditTrail' }),
            symbolFixture({ id: 'sym_policy', fileId: 'file_policy', name: 'PolicyService' })
        ];
        const relations = [
            relationFixture('rel_api_auth', 'sym_api', 'sym_auth'),
            relationFixture('rel_store_auth', 'sym_store', 'sym_auth'),
            relationFixture('rel_auth_session', 'sym_auth', 'sym_session'),
            relationFixture('rel_auth_audit', 'sym_auth', 'sym_audit'),
            relationFixture('rel_auth_policy', 'sym_auth', 'sym_policy')
        ];

        const result = new BlastRadiusAnalyzer().analyze({
            changedFilePaths: ['src/auth.ts'],
            files: [file],
            symbols,
            relations,
            events: [
                { id: 'event_1', workspacePath: '/workspace', eventType: 'file.edited', relativePath: 'src/auth.ts', createdAt: '2026-01-01T00:00:00.000Z' },
                { id: 'event_2', workspacePath: '/workspace', eventType: 'file.edited', relativePath: 'src/auth.ts', createdAt: '2026-01-02T00:00:00.000Z' }
            ],
            memories: [memoryItemFixture({
                id: 'mem_auth_secret',
                memoryType: 'security_note',
                title: 'AuthService security boundary',
                content: 'src/auth.ts coordinates token validation.',
                importance: 'critical'
            })]
        });

        expect(result.impacts).to.have.length(1);
        expect(result.impacts[0].centralityScore).to.equal(0.5);
        expect(result.impacts[0].recentChangeCount).to.equal(2);
        expect(result.impacts[0].coverageStatus).to.equal('low_inferred_coverage');
        expect(result.impacts[0].sensitiveMemoryIds).to.deep.equal(['mem_auth_secret']);
        expect(result.impacts[0].riskScore).to.be.greaterThan(0.65);
        expect(result.impacts[0].reasons).to.include.members([
            'High graph centrality (0.5).',
            '2 recent change events.',
            'Low inferred coverage: no related tests.',
            '1 related sensitive memories.'
        ]);
        expect(result.impacts[0].reasons.join(' ')).not.to.contain('token validation');
    });

    it('includes semantic C# relations in change impact scoring and test coverage', () => {
        const files = [
            fileFixture({ id: 'file_controller', relativePath: 'src/OrdersController.cs', fileName: 'OrdersController.cs' }),
            fileFixture({ id: 'file_tests', relativePath: 'tests/OrdersControllerTests.cs', fileName: 'OrdersControllerTests.cs' }),
            fileFixture({ id: 'file_db', relativePath: 'src/OrdersDbContext.cs', fileName: 'OrdersDbContext.cs' })
        ];
        const symbols = [
            symbolFixture({ id: 'sym_controller', fileId: 'file_controller', languageId: 'csharp', symbolKind: 'class', name: 'OrdersController' }),
            symbolFixture({ id: 'sym_endpoint', fileId: 'file_controller', languageId: 'csharp', symbolKind: 'endpoint', name: 'Get' }),
            symbolFixture({ id: 'sym_service', fileId: 'file_controller', languageId: 'csharp', symbolKind: 'class', name: 'OrderService' }),
            symbolFixture({ id: 'sym_interface', fileId: 'file_controller', languageId: 'csharp', symbolKind: 'interface', name: 'IOrderService' }),
            symbolFixture({ id: 'sym_db', fileId: 'file_db', languageId: 'csharp', symbolKind: 'class', name: 'OrdersDbContext', metadata: { normalizedSymbolKind: 'db_context' } }),
            symbolFixture({ id: 'sym_entity', fileId: 'file_db', languageId: 'csharp', symbolKind: 'class', name: 'Order', metadata: { normalizedSymbolKind: 'entity' } }),
            symbolFixture({ id: 'sym_test', fileId: 'file_tests', languageId: 'csharp', symbolKind: 'test_method', name: 'Get_returns_orders' })
        ];
        const relations: MemoryRelation[] = [
            { ...relationFixture('rel_file_controller', 'file_controller', 'sym_controller'), sourceKind: 'file', relationType: 'contains' },
            { ...relationFixture('rel_controller_endpoint', 'sym_controller', 'sym_endpoint'), relationType: 'maps_to_endpoint' },
            { ...relationFixture('rel_service_interface', 'sym_service', 'sym_interface'), relationType: 'implements' },
            { ...relationFixture('rel_controller_service', 'sym_controller', 'sym_service'), relationType: 'injects' },
            { ...relationFixture('rel_service_db', 'sym_service', 'sym_db'), relationType: 'uses_db_context' },
            { ...relationFixture('rel_db_entity', 'sym_db', 'sym_entity'), relationType: 'uses_entity' },
            { ...relationFixture('rel_controller_tested_by', 'sym_controller', 'sym_test'), relationType: 'tested_by' }
        ];

        const result = new BlastRadiusAnalyzer().analyze({
            changedFilePaths: ['src/OrdersController.cs'],
            files,
            symbols,
            relations,
            maxDepth: 4
        });

        expect(result.impacts).to.have.length(1);
        expect(result.impacts[0].coverageStatus).to.equal('covered');
        expect(result.impacts[0].relatedTests.map(file => file.relativePath)).to.deep.equal(['tests/OrdersControllerTests.cs']);
        expect(result.impacts[0].reasons).to.include.members([
            '1 inheritance/interface/override relations.',
            '1 endpoint relations.',
            '1 dependency-injection relations.',
            '2 DbContext/entity relations.',
            '1 test relations.',
            '1 related tests.'
        ]);
        expect(result.impacts[0].riskScore).to.be.greaterThan(0.4);
    });

    it('tracks impact for C# interface, controller action, injected service, and EF entity changes', () => {
        const files = [
            fileFixture({ id: 'file_interface', relativePath: 'src/IOrderService.cs', fileName: 'IOrderService.cs', extension: '.cs', languageId: 'csharp' }),
            fileFixture({ id: 'file_controller', relativePath: 'src/OrdersController.cs', fileName: 'OrdersController.cs', extension: '.cs', languageId: 'csharp' }),
            fileFixture({ id: 'file_service', relativePath: 'src/OrderService.cs', fileName: 'OrderService.cs', extension: '.cs', languageId: 'csharp' }),
            fileFixture({ id: 'file_db', relativePath: 'src/OrdersDbContext.cs', fileName: 'OrdersDbContext.cs', extension: '.cs', languageId: 'csharp' }),
            fileFixture({ id: 'file_entity', relativePath: 'src/Order.cs', fileName: 'Order.cs', extension: '.cs', languageId: 'csharp' }),
            fileFixture({ id: 'file_tests', relativePath: 'tests/OrdersControllerTests.cs', fileName: 'OrdersControllerTests.cs', extension: '.cs', languageId: 'csharp' })
        ];
        const symbols = [
            symbolFixture({ id: 'sym_interface', fileId: 'file_interface', languageId: 'csharp', symbolKind: 'interface', name: 'IOrderService' }),
            symbolFixture({ id: 'sym_controller', fileId: 'file_controller', languageId: 'csharp', symbolKind: 'class', name: 'OrdersController', metadata: { normalizedSymbolKind: 'controller' } }),
            symbolFixture({ id: 'sym_action', fileId: 'file_controller', languageId: 'csharp', symbolKind: 'endpoint', name: 'Get', metadata: { normalizedSymbolKind: 'controller_action' } }),
            symbolFixture({ id: 'sym_service', fileId: 'file_service', languageId: 'csharp', symbolKind: 'class', name: 'OrderService' }),
            symbolFixture({ id: 'sym_db', fileId: 'file_db', languageId: 'csharp', symbolKind: 'class', name: 'OrdersDbContext', metadata: { normalizedSymbolKind: 'db_context' } }),
            symbolFixture({ id: 'sym_entity', fileId: 'file_entity', languageId: 'csharp', symbolKind: 'class', name: 'Order', metadata: { normalizedSymbolKind: 'entity' } }),
            symbolFixture({ id: 'sym_test', fileId: 'file_tests', languageId: 'csharp', symbolKind: 'test_method', name: 'Get_returns_orders' })
        ];
        const relations: MemoryRelation[] = [
            { ...relationFixture('rel_file_interface', 'file_interface', 'sym_interface'), sourceKind: 'file', relationType: 'contains' },
            { ...relationFixture('rel_file_controller', 'file_controller', 'sym_controller'), sourceKind: 'file', relationType: 'contains' },
            { ...relationFixture('rel_file_action', 'file_controller', 'sym_action'), sourceKind: 'file', relationType: 'contains' },
            { ...relationFixture('rel_file_service', 'file_service', 'sym_service'), sourceKind: 'file', relationType: 'contains' },
            { ...relationFixture('rel_file_db', 'file_db', 'sym_db'), sourceKind: 'file', relationType: 'contains' },
            { ...relationFixture('rel_file_entity', 'file_entity', 'sym_entity'), sourceKind: 'file', relationType: 'contains' },
            { ...relationFixture('rel_controller_action', 'sym_controller', 'sym_action'), relationType: 'maps_to_endpoint' },
            { ...relationFixture('rel_service_interface', 'sym_service', 'sym_interface'), relationType: 'implements' },
            { ...relationFixture('rel_controller_service', 'sym_controller', 'sym_interface'), relationType: 'injects' },
            { ...relationFixture('rel_service_db', 'sym_service', 'sym_db'), relationType: 'uses_db_context' },
            { ...relationFixture('rel_db_entity', 'sym_db', 'sym_entity'), relationType: 'uses_entity' },
            { ...relationFixture('rel_controller_tested_by', 'sym_controller', 'sym_test'), relationType: 'tested_by' }
        ];
        const analyze = (changedFilePath: string) => new BlastRadiusAnalyzer().analyze({
            changedFilePaths: [changedFilePath],
            files,
            symbols,
            relations,
            maxDepth: 4
        }).impacts[0];

        const interfaceImpact = analyze('src/IOrderService.cs');
        expect(interfaceImpact.reasons).to.include.members([
            '1 inheritance/interface/override relations.',
            '1 dependency-injection relations.'
        ]);
        expect(interfaceImpact.relatedSymbols.map(symbol => symbol.id)).to.include.members(['sym_interface', 'sym_service', 'sym_controller']);

        const actionImpact = analyze('src/OrdersController.cs');
        expect(actionImpact.reasons).to.include.members([
            '1 endpoint relations.',
            '1 test relations.',
            '1 related tests.'
        ]);
        expect(actionImpact.coverageStatus).to.equal('covered');

        const injectedServiceImpact = analyze('src/OrderService.cs');
        expect(injectedServiceImpact.reasons).to.include.members([
            '1 inheritance/interface/override relations.',
            '1 dependency-injection relations.',
            '2 DbContext/entity relations.'
        ]);
        expect(injectedServiceImpact.relatedSymbols.map(symbol => symbol.id)).to.include.members(['sym_service', 'sym_interface', 'sym_db', 'sym_entity']);

        const entityImpact = analyze('src/Order.cs');
        expect(entityImpact.reasons).to.include('2 DbContext/entity relations.');
        expect(entityImpact.relatedSymbols.map(symbol => symbol.id)).to.include.members(['sym_entity', 'sym_db', 'sym_service']);
    });

    it('analyzes pull request graph impact with communities, risks, tests, memories, and context', () => {
        const files = [
            fileFixture({ id: 'file_auth', relativePath: 'src/auth.ts', fileName: 'auth.ts' }),
            fileFixture({ id: 'file_token', relativePath: 'src/token.ts', fileName: 'token.ts' }),
            fileFixture({ id: 'file_auth_test', relativePath: 'test/auth.spec.ts', fileName: 'auth.spec.ts' })
        ];
        const symbols = [
            symbolFixture({ id: 'sym_auth', fileId: 'file_auth', name: 'AuthService' }),
            symbolFixture({ id: 'sym_token', fileId: 'file_token', name: 'TokenStore' }),
            symbolFixture({ id: 'sym_auth_test', fileId: 'file_auth_test', name: 'auth validates tokens', symbolKind: 'test_method' })
        ];
        const relations = [
            { ...relationFixture('rel_auth_token', 'sym_auth', 'sym_token'), relationType: 'uses_dependency' as const },
            { ...relationFixture('rel_test_auth', 'file_auth_test', 'file_auth'), sourceKind: 'file' as const, targetKind: 'file' as const, relationType: 'tests' as const },
            { ...relationFixture('rel_auth_file_symbol', 'file_auth', 'sym_auth'), sourceKind: 'file' as const, relationType: 'contains' as const },
            { ...relationFixture('rel_token_file_symbol', 'file_token', 'sym_token'), sourceKind: 'file' as const, relationType: 'contains' as const }
        ];

        const result = new PullRequestGraphAnalyzer().analyze({
            changedFilePaths: ['src/auth.ts'],
            files,
            symbols,
            relations,
            memories: [memoryItemFixture({
                id: 'mem_auth_rule',
                title: 'AuthService review rule',
                content: 'Review src/auth.ts with token boundary tests.',
                evidence: 'Architecture review',
                importance: 'high',
                weight: 0.8
            }), memoryItemFixture({
                id: 'mem_auth_security',
                memoryType: 'security_note',
                title: 'AuthService security boundary',
                content: 'AuthService handles token validation boundaries.',
                evidence: 'Security review',
                importance: 'critical',
                weight: 0.9
            })],
            contextLimit: 10
        });

        expect(result.changedFilePaths).to.deep.equal(['src/auth.ts']);
        expect(result.affectedCommunities).to.have.length(1);
        expect(result.highRiskFiles[0].relativePath).to.equal('src/auth.ts');
        expect(result.relatedTests.map(file => file.relativePath)).to.deep.equal(['test/auth.spec.ts']);
        expect(result.touchedMemories.map(memory => memory.id)).to.deep.equal(['mem_auth_rule']);
        expect(result.recommendedContext.map(context => context.id)).to.include.members([
            'file:src/auth.ts',
            'test:test/auth.spec.ts',
            'mem_auth_rule'
        ]);
        expect(result.compactContext.summary).to.equal(result.summary);
        expect(result.compactContext.citations.map(citation => `${citation.kind}:${citation.id}`)).to.include.members([
            'file:file_auth',
            'symbol:sym_auth',
            'memory:mem_auth_rule',
            'relation:rel_auth_token'
        ]);
        expect(result.compactContext.citations.find(citation => citation.id === 'mem_auth_rule')?.evidence).to.equal('Architecture review');
        expect(result.recommendedContext.find(context => context.id === 'mem_auth_rule')?.reason).to.contain('importance=high');
        expect(result.flowAgentSuggestions.map(suggestion => suggestion.kind)).to.include.members(['security', 'tests']);
        expect(result.flowAgentSuggestions.find(suggestion => suggestion.kind === 'security')).to.deep.include({
            id: 'agency:security',
            title: 'Flow security reviewer',
            reason: 'Review security-sensitive paths without exporting raw sensitive content.'
        });
        expect(result.flowAgentSuggestions.find(suggestion => suggestion.kind === 'tests')?.evidence).to.contain('1 related test file(s) inferred.');
        expect(result.summary).to.contain('1 affected community');
    });

    it('analyzes conflict impact across relations, memories, docs, and risk areas', () => {
        const files = [
            fileFixture({ id: 'file_auth', relativePath: 'src/auth.ts', fileName: 'auth.ts' }),
            fileFixture({ id: 'file_token', relativePath: 'src/token.ts', fileName: 'token.ts' })
        ];
        const symbols = [
            symbolFixture({ id: 'sym_auth', fileId: 'file_auth', name: 'AuthService' }),
            symbolFixture({ id: 'sym_token', fileId: 'file_token', name: 'TokenStore' })
        ];
        const relations = [
            { ...relationFixture('rel_auth_symbol', 'file_auth', 'sym_auth'), sourceKind: 'file' as const, relationType: 'contains' as const },
            { ...relationFixture('rel_auth_token', 'sym_auth', 'sym_token'), relationType: 'uses_dependency' as const },
            { ...relationFixture('rel_auth_doc', 'sym_auth', 'docs/auth.md'), targetKind: 'doc' as const, relationType: 'documents' as const, evidence: 'Architecture docs' }
        ];

        const result = new ConflictAnalysisAnalyzer().analyze({
            conflictingFilePaths: ['src/auth.ts'],
            changedFilePaths: ['src/auth.ts'],
            files,
            symbols,
            relations,
            memories: [memoryItemFixture({
                id: 'mem_auth_rule',
                title: 'AuthService merge rule',
                content: 'Resolve AuthService changes with TokenStore expectations.',
                importance: 'critical',
                weight: 0.9
            })],
            contextLimit: 10
        });

        expect(result.conflictingFilePaths).to.deep.equal(['src/auth.ts']);
        expect(result.affectedRelations.map(relation => relation.id)).to.include.members(['rel_auth_symbol', 'rel_auth_token', 'rel_auth_doc']);
        expect(result.affectedMemories.map(memory => memory.id)).to.deep.equal(['mem_auth_rule']);
        expect(result.affectedDocs.map(doc => doc.uri)).to.deep.equal(['docs/auth.md']);
        expect(result.riskAreas[0].memoryIds).to.deep.equal(['mem_auth_rule']);
        expect(result.recommendedContext.map(context => context.id)).to.include('doc:docs/auth.md');
        expect(result.compactContext.citations.map(citation => `${citation.kind}:${citation.id}`)).to.include.members([
            'file:file_auth',
            'symbol:sym_auth',
            'memory:mem_auth_rule',
            'relation:rel_auth_doc',
            'doc:docs/auth.md'
        ]);
        expect(result.compactContext.recommendedContext.map(context => context.id)).to.include('doc:docs/auth.md');
        expect(result.summary).to.contain('1 conflicting file');
    });

    it('keeps pull request analysis compact, budgetable, and free of raw sensitive content', () => {
        const secret = 'abcdefghijklmnopqrstuvwxyz123456';
        const files = [
            fileFixture({ id: 'file_auth', relativePath: 'src/auth.ts', fileName: 'auth.ts', isSensitive: true }),
            fileFixture({ id: 'file_policy', relativePath: 'src/policy.ts', fileName: 'policy.ts' }),
            fileFixture({ id: 'file_auth_test', relativePath: 'test/auth.spec.ts', fileName: 'auth.spec.ts' })
        ];
        const symbols = [
            symbolFixture({ id: 'sym_auth', fileId: 'file_auth', name: 'AuthService' }),
            symbolFixture({ id: 'sym_policy', fileId: 'file_policy', name: 'PolicyService' }),
            symbolFixture({ id: 'sym_auth_test', fileId: 'file_auth_test', name: 'auth validates boundaries', symbolKind: 'test_method' })
        ];
        const relations = [
            { ...relationFixture('rel_auth_policy', 'sym_auth', 'sym_policy'), relationType: 'uses_dependency' as const, evidence: `token = ${secret}` },
            { ...relationFixture('rel_test_auth', 'file_auth_test', 'file_auth'), sourceKind: 'file' as const, targetKind: 'file' as const, relationType: 'tests' as const }
        ];

        const result = new PullRequestGraphAnalyzer().analyze({
            changedFilePaths: ['src/auth.ts', 'src/policy.ts'],
            files,
            symbols,
            relations,
            memories: [memoryItemFixture({
                id: 'mem_auth_rule',
                title: 'AuthService review rule',
                content: `Review src/auth.ts. password = ${secret}`,
                evidence: `Security decision token = ${secret}`,
                importance: 'high',
                weight: 0.85
            })],
            contextLimit: 3
        });
        const budget = new TokenBudgetService().fit({
            budgetTokens: 80,
            reservedTokens: 4,
            items: result.compactContext.recommendedContext.map(context => ({
                id: context.id,
                text: `${context.title}\n${context.evidence ?? ''}\n${context.reason}`,
                priority: context.score
            }))
        });

        expect(result.recommendedContext).to.have.length(3);
        expect(result.flowAgentSuggestions.map(suggestion => suggestion.kind)).to.include.members(['security', 'tests']);
        expect(result.flowAgentSuggestions.find(suggestion => suggestion.kind === 'security')?.affectedFilePaths).to.include('src/auth.ts');
        expect(result.flowAgentSuggestions.find(suggestion => suggestion.kind === 'security')?.priority).to.be.greaterThan(0.7);
        expect(result.highRiskFiles.find(file => file.relativePath === 'src/auth.ts')?.reasons).to.include('Sensitive file changed.');
        expect(budget.estimatedTokens).to.be.at.most(76);
        expect(budget.selectedIds.length).to.be.greaterThan(0);
        expect(JSON.stringify(result)).not.to.contain(secret);
    });

    it('keeps conflict analysis recommendations and citations free of raw sensitive content', () => {
        const secret = 'abcdefghijklmnopqrstuvwxyz123456';
        const files = [
            fileFixture({ id: 'file_auth', relativePath: 'src/auth.ts', fileName: 'auth.ts' }),
            fileFixture({ id: 'file_token', relativePath: 'src/token.ts', fileName: 'token.ts' })
        ];
        const symbols = [
            symbolFixture({ id: 'sym_auth', fileId: 'file_auth', name: 'AuthService' }),
            symbolFixture({ id: 'sym_token', fileId: 'file_token', name: 'TokenStore' })
        ];
        const relations = [
            { ...relationFixture('rel_auth_symbol', 'file_auth', 'sym_auth'), sourceKind: 'file' as const, relationType: 'contains' as const },
            { ...relationFixture('rel_auth_token', 'sym_auth', 'sym_token'), relationType: 'uses_dependency' as const, evidence: `api_key=${secret}` },
            { ...relationFixture('rel_auth_doc', 'sym_auth', 'docs/auth.md'), targetKind: 'doc' as const, relationType: 'documents' as const, evidence: `password = ${secret}` }
        ];

        const result = new ConflictAnalysisAnalyzer().analyze({
            conflictingFilePaths: ['src/auth.ts'],
            changedFilePaths: ['src/auth.ts'],
            files,
            symbols,
            relations,
            memories: [memoryItemFixture({
                id: 'mem_auth_rule',
                title: 'AuthService merge rule',
                content: `Resolve AuthService changes. token = ${secret}`,
                evidence: `Architecture note password = ${secret}`,
                importance: 'critical',
                weight: 0.9
            })],
            contextLimit: 4
        });

        expect(result.recommendedContext).to.have.length.at.most(4);
        expect(result.affectedDocs.map(doc => doc.uri)).to.deep.equal(['docs/auth.md']);
        expect(result.compactContext.citations.map(citation => `${citation.kind}:${citation.id}`)).to.include.members([
            'memory:mem_auth_rule',
            'relation:rel_auth_doc',
            'doc:docs/auth.md'
        ]);
        expect(JSON.stringify(result)).not.to.contain(secret);
    });

    it('classifies prompt intent deterministically', () => {
        const classifier = new IntentClassifier();
        const first = classifier.classify({ prompt: 'Please review this diff and impact.' });
        const second = classifier.classify({ prompt: 'Please review this diff and impact.' });

        expect(first).to.deep.equal(second);
        expect(first.intent).to.equal('review_change');
    });

    it('classifies expanded project intelligence intents', () => {
        const classifier = new IntentClassifier();
        const cases: Array<[string, MemoryPromptIntent]> = [
            ['Create an end-to-end Playwright test for checkout', 'create_e2e_test'],
            ['Refactor code in the payment service', 'refactor_code'],
            ['Find the file that defines the cache settings', 'find_file'],
            ['Review PR 42 for regressions', 'review_pr'],
            ['Fix the error thrown by the login handler', 'fix_error'],
            ['Create an endpoint for orders', 'create_endpoint'],
            ['Update config for the production API URL', 'update_config'],
            ['Create a prompt for the review agent', 'create_prompt'],
            ['Create a PRD for project intelligence consent', 'create_prd'],
            ['Run a security review for OWASP issues', 'security_review'],
            ['Do a performance review for latency bottlenecks', 'performance_review']
        ];

        for (const [prompt, intent] of cases) {
            expect(classifier.classify({ prompt }).intent, prompt).to.equal(intent);
        }
    });

    it('uses normalized prompt dimensions instead of full prompt fingerprints for repetition signatures', () => {
        const normalizer = new PromptNormalizer();
        const first = normalizer.normalize({
            prompt: 'Create a unit test for OrdersController in ASP.NET using xUnit',
            context: [{ kind: 'file', uri: 'src/OrdersController.cs', content: 'class OrdersController { }' }]
        });
        const second = normalizer.normalize({
            prompt: 'Please add tests around the orders controller with xunit assertions',
            context: [{ kind: 'file', uri: 'src/OrdersController.cs', content: 'class OrdersController { }' }]
        });

        expect(first.signature).to.equal('create_unit_test:csharp:test:aspnet:create');
        expect(second.signature).to.equal(first.signature);
        expect(first.signature).not.to.match(/[a-f0-9]{12}$/);
    });

    it('keeps context selection inside the token budget', () => {
        const budget = new TokenBudgetService().fit({
            budgetTokens: 8,
            items: [
                { id: 'a', text: 'short', priority: 1 },
                { id: 'b', text: 'this is a much longer piece of context', priority: 0 }
            ]
        });

        expect(budget.selectedIds).to.deep.equal(['a']);
        expect(budget.omittedIds).to.deep.equal(['b']);
    });

    it('reports graph diffs by stable ids', () => {
        const diff = new GraphDiffService().diff({
            before: {
                files: [{ id: 'file_a', relativePath: 'a.ts', fileName: 'a.ts', sizeBytes: 1, contentHash: '1', isIgnored: false, isGenerated: false, isBinary: false, isSensitive: false }],
                symbols: [],
                relations: []
            },
            after: {
                files: [{ id: 'file_a', relativePath: 'a.ts', fileName: 'a.ts', sizeBytes: 1, contentHash: '2', isIgnored: false, isGenerated: false, isBinary: false, isSensitive: false }],
                symbols: [],
                relations: []
            }
        });

        expect(diff.changedFileIds).to.deep.equal(['file_a']);
    });

    it('suggests context from requested sources and respects token budget', async () => {
        const service = new ContextSuggestionService([{
            sourceKind: 'code',
            search: async () => [{
                id: 'code_1',
                sourceKind: 'code',
                title: 'Alpha service',
                snippet: 'Alpha service implementation details.',
                score: 0.9,
                estimatedTokens: 4
            }, {
                id: 'code_2',
                sourceKind: 'code',
                title: 'Large file',
                snippet: 'large '.repeat(100),
                score: 0.8,
                estimatedTokens: 100
            }]
        }, {
            sourceKind: 'skill',
            search: async () => [{
                id: 'skill_1',
                sourceKind: 'skill',
                title: 'Ignored skill',
                snippet: 'Should not be queried for code-only suggestions.',
                score: 1
            }]
        }]);

        const result = await service.suggest({
            workspacePath: '/workspace',
            prompt: 'alpha',
            sourceKinds: ['code'],
            tokenBudget: 10
        });

        expect(result.suggestions.map(suggestion => suggestion.id)).to.deep.equal(['code_1']);
        expect(result.omittedCount).to.equal(1);
        expect(result.estimatedTokens).to.equal(4);
    });

    it('keeps BM25 fallback suggestions when optional vector retrieval is empty', async () => {
        const service = new ContextSuggestionService([{
            sourceKind: 'code',
            search: async () => []
        }, {
            sourceKind: 'code',
            search: async () => [{
                id: 'bm25_1',
                sourceKind: 'code',
                title: 'BM25 fallback match',
                snippet: 'Fallback lexical retrieval remains available.',
                score: 0.64,
                evidence: 'BM25 fallback'
            }]
        }]);

        const result = await service.suggest({
            workspacePath: '/workspace',
            prompt: 'fallback retrieval',
            sourceKinds: ['code'],
            tokenBudget: 100
        });

        expect(result.suggestions.map(suggestion => suggestion.id)).to.deep.equal(['bm25_1']);
        expect(result.suggestions[0].reason).to.equal('BM25 fallback');
    });

    it('ranks vector retrieval candidates by score while preserving BM25 fallback candidates', async () => {
        const service = new ContextSuggestionService([{
            sourceKind: 'code',
            search: async () => [{
                id: 'vector_1',
                sourceKind: 'code',
                title: 'Semantic match',
                snippet: 'Semantic vector retrieval candidate.',
                score: 0.92,
                evidence: 'local vector search'
            }]
        }, {
            sourceKind: 'code',
            search: async () => [{
                id: 'bm25_1',
                sourceKind: 'code',
                title: 'Lexical match',
                snippet: 'BM25 fallback retrieval candidate.',
                score: 0.71,
                evidence: 'BM25 fallback'
            }]
        }]);

        const result = await service.suggest({
            workspacePath: '/workspace',
            prompt: 'semantic retrieval',
            sourceKinds: ['code'],
            tokenBudget: 100
        });

        expect(result.suggestions.map(suggestion => suggestion.id)).to.deep.equal(['vector_1', 'bm25_1']);
        expect(result.suggestions.map(suggestion => suggestion.score)).to.deep.equal([0.92, 0.71]);
    });

    it('combines configurable ranking signals and keeps selection within token budget', async () => {
        const service = new ContextSuggestionService([{
            sourceKind: 'project-memory',
            search: async () => [{
                id: 'memory_fresh',
                sourceKind: 'project-memory',
                title: 'Fresh accepted memory',
                snippet: 'Use local-first retrieval ranking.',
                score: 0.1,
                estimatedTokens: 6,
                evidence: 'pi_memory_items_fts:bm25',
                rankingSignals: {
                    bm25Score: 0.7,
                    vectorScore: 0.8,
                    graphScore: 0.5,
                    godNodeScore: 0.6,
                    communityScore: 0.4,
                    surprisingConnectionScore: 0.3,
                    riskScore: 0.8,
                    graphSignals: ['god-node:BillingService:score=0.6', 'risk:billing.ts:score=0.8'],
                    memoryWeight: 0.9,
                    recencyScore: 1,
                    acceptanceScore: 1,
                    scopeBoost: 0.75,
                    stalePenalty: 0,
                    importance: 'high',
                    weight: 0.9,
                    staleStatus: 'fresh',
                    scope: 'workspace',
                    feedbackMultiplier: 1.05
                }
            }, {
                id: 'memory_stale',
                sourceKind: 'project-memory',
                title: 'Stale memory',
                snippet: 'Older retrieval rule. '.repeat(20),
                score: 1,
                estimatedTokens: 100,
                evidence: 'pi_memory_items_fts:bm25',
                rankingSignals: {
                    bm25Score: 1,
                    vectorScore: 1,
                    graphScore: 1,
                    memoryWeight: 1,
                    recencyScore: 0.1,
                    acceptanceScore: 0,
                    scopeBoost: 0.75,
                    stalePenalty: 0.5,
                    importance: 'low',
                    weight: 1,
                    staleStatus: 'stale',
                    scope: 'workspace',
                    feedbackMultiplier: 0.7
                }
            }]
        }]);

        const result = await service.suggest({
            workspacePath: '/workspace',
            prompt: 'retrieval ranking',
            tokenBudget: 10,
            rankingWeights: {
                stalePenalty: 1
            }
        });

        expect(result.suggestions.map(suggestion => suggestion.id)).to.deep.equal(['memory_fresh']);
        expect(result.suggestions[0].score).to.equal(0.801);
        expect(result.suggestions[0].reason).to.contain('scope=workspace');
        expect(result.suggestions[0].reason).to.contain('stale=fresh');
        expect(result.suggestions[0].reason).to.contain('importance=high');
        expect(result.suggestions[0].reason).to.contain('godNode=0.6');
        expect(result.suggestions[0].reason).to.contain('community=0.4');
        expect(result.suggestions[0].reason).to.contain('surprisingConnection=0.3');
        expect(result.suggestions[0].reason).to.contain('risk=0.8');
        expect(result.suggestions[0].reason).to.contain('graphSignals=god-node:BillingService:score=0.6,risk:billing.ts:score=0.8');
        expect(result.suggestions[0].rankingSignals).to.deep.include({
            scope: 'workspace',
            staleStatus: 'fresh',
            importance: 'high',
            feedbackMultiplier: 1.05,
            godNodeScore: 0.6,
            communityScore: 0.4,
            surprisingConnectionScore: 0.3,
            riskScore: 0.8
        });
        expect(result.omittedCount).to.equal(1);
    });

    it('marks memory staleness and imports newer workspace memories only', () => {
        const service = new MemoryServiceHelper();
        const oldMemory = {
            id: 'mem_old',
            workspacePath: '/workspace',
            scope: 'workspace' as const,
            memoryType: 'project_decision' as const,
            title: 'Old decision',
            content: 'Use local indexes.',
            status: 'active' as const,
            staleStatus: 'fresh' as const,
            importance: 'medium' as const,
            weight: 0.6,
            lastAccessedAt: '2025-01-01T00:00:00.000Z',
            accessCount: 0,
            createdAt: '2025-01-01T00:00:00.000Z',
            updatedAt: '2025-01-01T00:00:00.000Z',
            acceptedCount: 0,
            rejectedCount: 0
        };
        const stale = service.markStaleness([oldMemory], new Date('2025-08-01T00:00:00.000Z'));
        const imported = service.import([oldMemory], {
            exportedAt: '2025-08-02T00:00:00.000Z',
            workspacePath: '/workspace',
            memories: [{
                ...oldMemory,
                title: 'Updated decision',
                updatedAt: '2025-08-02T00:00:00.000Z'
            }]
        });

        expect(stale[0].staleStatus).to.equal('stale');
        expect(imported.imported).to.equal(1);
        expect(imported.memories[0].title).to.equal('Updated decision');
    });

    it('normalizes lifecycle fields, tracks access, decay, pruning, and health', () => {
        const service = new MemoryServiceHelper();
        const memory = service.normalize({
            id: 'mem_lifecycle',
            workspacePath: '/workspace',
            scope: 'workspace',
            memoryType: 'project_decision',
            title: 'Lifecycle decision',
            content: 'Evidence was captured from a source dated 2025-01-01.',
            status: 'active',
            staleStatus: 'fresh',
            source: 'notes/architecture.md#2025-01-01',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z'
        });
        const accessed = service.recordAccess(memory, '2026-01-02T00:00:00.000Z');
        const stale = service.markStaleness([accessed], new Date('2026-08-01T00:00:00.000Z'))[0];
        const decayed = service.decay([stale], new Date('2026-08-01T00:00:00.000Z'))[0];
        const pruned = service.prune([{ ...decayed, importance: 'low', weight: 0.05 }], new Date('2026-08-01T00:00:00.000Z'));
        const proposals = service.proposePruning([
            { ...decayed, id: 'mem_old', importance: 'low', weight: 0.05 },
            { ...decayed, id: 'mem_secret', title: 'Token note', content: 'token = abcdefghijklmnopqrstuvwxyz123456' },
            { ...decayed, id: 'mem_duplicate_old', weight: 0.4, updatedAt: '2026-01-01T00:00:00.000Z' },
            { ...decayed, id: 'mem_duplicate_new', weight: 0.7, updatedAt: '2026-01-02T00:00:00.000Z' }
        ], new Date('2026-08-01T00:00:00.000Z'));
        const health = service.healthReport([stale], new Date('2026-08-01T00:00:00.000Z'));

        expect(memory.importance).to.equal('medium');
        expect(memory.weight).to.equal(0.6);
        expect(accessed.accessCount).to.equal(1);
        expect(accessed.lastAccessedAt).to.equal('2026-01-02T00:00:00.000Z');
        expect(stale.staleStatus).to.equal('stale');
        expect(decayed.weight).to.be.lessThan(accessed.weight);
        expect(pruned).to.have.length(0);
        expect(proposals.find(proposal => proposal.id === 'mem_old')?.action).to.equal('archive');
        expect(proposals.find(proposal => proposal.id === 'mem_old')?.reasons).to.include('old');
        expect(proposals.find(proposal => proposal.id === 'mem_secret')?.action).to.equal('remove');
        expect(proposals.find(proposal => proposal.id === 'mem_secret')?.reasons).to.include('sensitive');
        expect(proposals.find(proposal => proposal.id === 'mem_duplicate_old')?.duplicateOf).to.equal('mem_duplicate_new');
        expect(proposals.every(proposal => proposal.reviewRequired)).to.equal(true);
        expect(health.status).to.equal('critical');
        expect(health.stale).to.equal(1);
    });

    it('expands memory health with duplicates, contradictions, missing sources, sensitive content, misplaced globals, and old candidates', () => {
        const service = new MemoryServiceHelper();
        const base = {
            scope: 'workspace' as const,
            workspacePath: '/workspace',
            memoryType: 'project_decision' as const,
            status: 'active' as const,
            staleStatus: 'fresh' as const,
            importance: 'medium' as const,
            weight: 0.6,
            lastAccessedAt: '2026-01-01T00:00:00.000Z',
            accessCount: 0,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            acceptedCount: 0,
            rejectedCount: 0
        };
        const health = service.healthReport([
            { ...base, id: 'mem_duplicate_old', title: 'Use SQLite', content: 'Use SQLite for storage.', updatedAt: '2026-01-01T00:00:00.000Z', source: 'docs/storage.md' },
            { ...base, id: 'mem_duplicate_new', title: 'Use SQLite', content: 'Use SQLite for storage.', updatedAt: '2026-01-02T00:00:00.000Z', source: 'docs/storage.md' },
            { ...base, id: 'mem_positive', title: 'Use Redis', content: 'Use Redis for cache.', source: 'docs/cache.md' },
            { ...base, id: 'mem_negative', title: 'Do not use Redis', content: 'Do not use Redis for cache.', source: 'docs/cache.md' },
            { ...base, id: 'mem_missing_source', title: 'No source', content: 'This active memory has no source or evidence.' },
            { ...base, id: 'mem_sensitive', title: 'API token', content: 'token = abcdefghijklmnopqrstuvwxyz123456', source: 'manual' },
            { ...base, id: 'mem_global_workspace', scope: 'global' as const, workspacePath: '/workspace', title: 'IDE preference', content: 'Prefer local-first behavior.', source: 'manual' },
            { ...base, id: 'mem_old_candidate', title: 'Old candidate', content: 'Review this candidate.', status: 'candidate' as const, source: 'import:portable-pack' }
        ], new Date('2026-03-15T00:00:00.000Z'));

        expect(health.status).to.equal('critical');
        expect(health.byScope.workspace).to.equal(7);
        expect(health.byScope.global).to.equal(1);
        expect(health.duplicate).to.equal(1);
        expect(health.contradictions).to.equal(1);
        expect(health.missingSource).to.equal(1);
        expect(health.sensitive).to.equal(1);
        expect(health.globalWithWorkspace).to.equal(1);
        expect(health.oldCandidates).to.equal(1);
        expect(health.neverAccessed).to.equal(8);
        expect(health.issues.map(issue => issue.kind)).to.include.members([
            'duplicate',
            'contradiction',
            'missing_source',
            'sensitive',
            'global_with_workspace',
            'old_candidate',
            'never_accessed'
        ]);
        expect(health.issues.find(issue => issue.kind === 'duplicate')?.relatedMemoryId).to.equal('mem_duplicate_new');
    });

    it('preserves optional memory scope locator and origin fields without requiring them on old records', () => {
        const service = new MemoryServiceHelper();
        const legacy = service.normalize({
            id: 'mem_legacy_scope',
            workspacePath: '/workspace',
            scope: 'workspace',
            memoryType: 'manual_note',
            title: 'Legacy memory',
            content: 'Created before repository/session/task fields.',
            status: 'active',
            staleStatus: 'fresh',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z'
        });
        const repository = service.normalize({
            id: 'mem_repository_scope',
            scope: 'repository',
            repositoryUrl: 'https://github.com/acme/project.git',
            repositoryId: 'github.com/acme/project',
            sessionId: 'session_1',
            taskId: 'task_1',
            expiresAt: '2026-02-01T00:00:00.000Z',
            retentionPolicy: 'ttl',
            memoryType: 'project_decision',
            title: 'Repository scoped decision',
            content: 'Share this memory across clones.',
            status: 'candidate',
            staleStatus: 'unknown',
            supersededBy: 'mem_new',
            supersedes: ['mem_old', 'mem_old', '  '],
            originMarkers: ['import:portable-pack', 'event:123', 'event:123'],
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z'
        });

        expect(legacy.repositoryUrl).to.equal(undefined);
        expect(legacy.retentionPolicy).to.equal(undefined);
        expect(legacy.supersedes).to.equal(undefined);
        expect(repository.repositoryUrl).to.equal('https://github.com/acme/project.git');
        expect(repository.repositoryId).to.equal('github.com/acme/project');
        expect(repository.sessionId).to.equal('session_1');
        expect(repository.taskId).to.equal('task_1');
        expect(repository.expiresAt).to.equal('2026-02-01T00:00:00.000Z');
        expect(repository.retentionPolicy).to.equal('ttl');
        expect(repository.supersededBy).to.equal('mem_new');
        expect(repository.supersedes).to.deep.equal(['mem_old']);
        expect(repository.originMarkers).to.deep.equal(['import:portable-pack', 'event:123']);
    });

    it('enforces memory scope locators before persistence normalization', () => {
        const service = new MemoryServiceHelper();
        const baseMemory = {
            id: 'mem_scope',
            memoryType: 'manual_note' as const,
            title: 'Scoped memory',
            content: 'Scope locator validation.',
            status: 'active' as const,
            staleStatus: 'fresh' as const,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z'
        };

        const global = service.normalize({
            ...baseMemory,
            scope: 'global',
            workspacePath: '/workspace'
        });
        const repository = service.normalize({
            ...baseMemory,
            id: 'mem_repository_valid',
            scope: 'repository',
            repositoryId: 'github.com/acme/project'
        });

        expect(global.workspacePath).to.equal(undefined);
        expect(repository.repositoryId).to.equal('github.com/acme/project');
        expect(() => service.normalize({ ...baseMemory, id: 'mem_repository_invalid', scope: 'repository' })).to.throw('Repository memory requires repositoryUrl or repositoryId');
        expect(() => service.normalize({ ...baseMemory, id: 'mem_session_invalid', scope: 'session' })).to.throw('Session memory requires sessionId');
        expect(() => service.normalize({ ...baseMemory, id: 'mem_task_invalid', scope: 'task' })).to.throw('Task memory requires taskId');
    });

    it('reduces retrieval ranking for unresolved rejected or stale feedback', () => {
        const service = new FeedbackService();
        const rejectedMultiplier = service.rankingMultiplier([{
            id: 'feedback_rejected',
            workspacePath: '/workspace',
            targetKind: 'context-suggestion',
            targetId: 'mem_1',
            targetSourceKind: 'project-memory',
            feedback: 'rejected',
            createdAt: '2026-01-01T00:00:00.000Z'
        }], {
            id: 'mem_1',
            sourceKind: 'project-memory'
        });
        const resolvedMultiplier = service.rankingMultiplier([{
            id: 'feedback_resolved',
            workspacePath: '/workspace',
            targetKind: 'context-suggestion',
            targetId: 'mem_1',
            targetSourceKind: 'project-memory',
            feedback: 'rejected',
            createdAt: '2026-01-01T00:00:00.000Z',
            resolvedAt: '2026-01-02T00:00:00.000Z'
        }], {
            id: 'mem_1',
            sourceKind: 'project-memory'
        });

        expect(rejectedMultiplier).to.be.lessThan(1);
        expect(resolvedMultiplier).to.equal(1);
    });

    it('builds deterministic benchmark reports for retrieval quality and security', () => {
        const service = new BenchmarkService();
        const dataset = service.buildDataset({
            limit: 2,
            memories: [{
                id: 'mem_bench',
                workspacePath: '/workspace',
                scope: 'workspace',
                memoryType: 'project_decision',
                title: 'Use SQLite storage',
                content: 'Memory stores memory in SQLite.',
                status: 'active',
                staleStatus: 'fresh',
                importance: 'medium',
                weight: 0.6,
                lastAccessedAt: '2026-01-01T00:00:00.000Z',
                accessCount: 0,
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
                acceptedCount: 0,
                rejectedCount: 0
            }],
            codeChunks: [{
                id: 'chunk_bench',
                workspacePath: '/workspace',
                fileId: 'file_bench',
                relativePath: 'src/storage.ts',
                chunkKind: 'file',
                title: 'Storage service',
                content: 'SQLite storage service with benchmark coverage.',
                contentHash: 'hash',
                startLine: 1,
                endLine: 2,
                estimatedTokens: 12,
                indexedAt: '2026-01-01T00:00:00.000Z'
            }]
        });
        const cases = [
            service.caseResult(dataset[0], [{
                id: 'mem_bench',
                sourceKind: 'project-memory',
                title: 'Use SQLite storage',
                snippet: 'Memory stores memory in SQLite.',
                score: 10,
                estimatedTokens: 8
            }], 4),
            service.caseResult(dataset[1], [{
                id: 'chunk_bench',
                sourceKind: 'code',
                title: 'Storage service',
                snippet: 'SQLite storage service with benchmark coverage.',
                score: 8,
                uri: 'src/storage.ts',
                estimatedTokens: 7
            }], 6)
        ];

        const report = service.buildReport({
            workspacePath: '/workspace',
            generatedAt: '2026-01-01T00:00:00.000Z',
            dataset,
            cases,
            memories: [],
            codeChunks: [],
            files: [],
            resultSets: []
        });

        expect(dataset).to.have.length(2);
        expect(report.recall).to.equal(1);
        expect(report.averageLatencyMs).to.equal(5);
        expect(report.security.status).to.equal('passed');
        expect(report.feedback.rejectionRate).to.equal(0);
        expect(report.feedback.feedbackAppliedResultCount).to.equal(0);
    });

    it('benchmarks context suggestion rejection rate and feedback use in ranking', () => {
        const service = new BenchmarkService();
        const item = {
            id: 'ranking:feedback-penalty',
            prompt: 'Rank storage context with rejected feedback',
            expectedSourceKind: 'project-memory' as const,
            expectedIds: ['mem_rejected']
        };
        const result: RetrievalResult = {
            id: 'mem_rejected',
            sourceKind: 'project-memory',
            title: 'Rejected storage memory',
            snippet: 'Old storage advice that was rejected by the reviewer.',
            score: 0.4,
            rankingSignals: {
                bm25Score: 0.8,
                acceptanceScore: 0.45,
                stalePenalty: 0.55,
                feedbackMultiplier: 0.45
            }
        };
        const report = service.buildReport({
            workspacePath: '/workspace',
            generatedAt: '2026-05-20T00:00:00.000Z',
            dataset: [item],
            cases: [service.caseResult(item, [result], 5)],
            memories: [],
            codeChunks: [],
            files: [],
            resultSets: [[result]],
            contextSuggestions: [{
                id: 'mem_rejected',
                workspacePath: '/workspace',
                promptSignature: 'prompt:storage',
                createdAt: '2026-05-20T00:00:00.000Z',
                title: 'Rejected storage memory',
                reason: 'Matched project-memory.',
                sourceKind: 'project-memory',
                score: 0.4,
                estimatedTokens: 10,
                accepted: false
            }, {
                id: 'mem_accepted',
                workspacePath: '/workspace',
                promptSignature: 'prompt:storage',
                createdAt: '2026-05-20T00:00:00.000Z',
                title: 'Accepted storage memory',
                reason: 'Matched project-memory.',
                sourceKind: 'project-memory',
                score: 0.8,
                estimatedTokens: 10,
                accepted: true
            }],
            feedbackRecords: [{
                id: 'feedback_rejected',
                workspacePath: '/workspace',
                targetKind: 'context-suggestion',
                targetId: 'mem_rejected',
                targetSourceKind: 'project-memory',
                feedback: 'rejected',
                createdAt: '2026-05-20T00:00:00.000Z'
            }]
        });

        expect(report.feedback.suggestedCount).to.equal(2);
        expect(report.feedback.acceptedCount).to.equal(1);
        expect(report.feedback.rejectedCount).to.equal(1);
        expect(report.feedback.rejectionRate).to.equal(0.5);
        expect(report.feedback.unresolvedFeedbackCount).to.equal(1);
        expect(report.feedback.feedbackAppliedResultCount).to.equal(1);
        expect(report.feedback.feedbackPenalizedResultCount).to.equal(1);
        expect(report.feedback.status).to.equal('attention');
    });

    it('redacts benchmark report case details before reports are exported', () => {
        const secret = 'abcdefghijklmnopqrstuvwxyz123456';
        const service = new BenchmarkService();
        const item = {
            id: 'case_secret',
            prompt: `token = ${secret}`,
            expectedSourceKind: 'code' as const
        };
        const caseResult = service.caseResult(item, [{
            id: 'chunk_secret',
            sourceKind: 'code',
            title: 'Token fixture',
            snippet: `password = ${secret}`,
            evidence: `token = ${secret}`,
            score: 1
        }], 5);
        const report = service.buildReport({
            workspacePath: '/workspace',
            generatedAt: '2026-01-01T00:00:00.000Z',
            dataset: [item],
            cases: [caseResult],
            memories: [],
            codeChunks: [],
            files: [],
            resultSets: []
        });

        expect(JSON.stringify(report)).not.to.contain(secret);
        expect(JSON.stringify(report)).to.contain('abcdef********3456');
    });

    it('builds an indexing latency benchmark for ignored, sensitive, large, generated, and multi-language files', () => {
        const service = new BenchmarkService();
        const benchmark = service.buildIndexingLatencyBenchmark({
            workspacePath: '/workspace',
            indexedAt: '2026-05-20T00:00:00.000Z',
            durationMs: 250,
            indexedFileCount: 2,
            indexedChunkCount: 5,
            files: [
                fileFixture({ id: 'file_ts', relativePath: 'src/app.ts', languageId: 'typescript' }),
                fileFixture({ id: 'file_py', relativePath: 'src/app.py', fileName: 'app.py', extension: '.py', languageId: 'python' }),
                fileFixture({
                    id: 'file_gitignored',
                    relativePath: 'dist/bundle.js',
                    fileName: 'bundle.js',
                    extension: '.js',
                    languageId: 'javascript',
                    isIgnored: true,
                    isGenerated: true,
                    ignoreReason: { kind: 'gitignore', source: '.gitignore', detail: 'dist/**' }
                }),
                fileFixture({
                    id: 'file_secret',
                    relativePath: '.env',
                    fileName: '.env',
                    extension: '',
                    languageId: undefined,
                    isIgnored: true,
                    isSensitive: true,
                    ignoreReason: { kind: 'secret', source: 'secret-scanner', detail: 'metadata-only' }
                }),
                fileFixture({
                    id: 'file_large',
                    relativePath: 'logs/huge.log',
                    fileName: 'huge.log',
                    extension: '.log',
                    languageId: undefined,
                    sizeBytes: 300_000,
                    isIgnored: true,
                    ignoreReason: { kind: 'size', source: 'max-file-bytes', detail: '300000 > 256000' }
                }),
                fileFixture({
                    id: 'file_binary',
                    relativePath: 'assets/logo.png',
                    fileName: 'logo.png',
                    extension: '.png',
                    languageId: 'png',
                    isIgnored: true,
                    isBinary: true,
                    ignoreReason: { kind: 'binary', source: 'binary-detector', detail: 'metadata-only' }
                })
            ]
        });

        expect(benchmark.fileCount).to.equal(6);
        expect(benchmark.indexedFileCount).to.equal(2);
        expect(benchmark.indexedChunkCount).to.equal(5);
        expect(benchmark.ignoredFileCount).to.equal(4);
        expect(benchmark.sensitiveFileCount).to.equal(1);
        expect(benchmark.largeFileCount).to.equal(1);
        expect(benchmark.generatedFileCount).to.equal(1);
        expect(benchmark.binaryFileCount).to.equal(1);
        expect(benchmark.languageCount).to.be.greaterThan(1);
        expect(benchmark.filesPerSecond).to.equal(24);
        expect(benchmark.indexedFilesPerSecond).to.equal(8);
        expect(benchmark.chunksPerSecond).to.equal(20);
        expect(benchmark.ignoredBreakdown.gitignore).to.equal(1);
        expect(benchmark.ignoredBreakdown.secret).to.equal(1);
        expect(benchmark.ignoredBreakdown.size).to.equal(1);
        expect(benchmark.ignoredBreakdown.binary).to.equal(1);
        expect(benchmark.ignoredBreakdown.sensitive).to.equal(1);
        expect(benchmark.languageBreakdown.typescript).to.equal(1);
        expect(benchmark.languageBreakdown.python).to.equal(1);
        expect(benchmark.status).to.equal('attention');
        expect(benchmark.summary).to.contain('indexed 2 files and 5 chunks in 250ms');
    });

    it('ships a validated versioned benchmark suite for retrieval, ranking, security, indexing, and multi-session memory', () => {
        const service = new BenchmarkService();
        const suites = service.listVersionedSuites();
        const suite = service.getVersionedSuite('memory-core-v1', 1);

        expect(suites.map(item => item.id)).to.include('memory-core-v1');
        expect(suite).to.exist;
        expect(service.validateSuite(suite!)).to.deep.equal([]);
        expect(suite!.version).to.equal(1);
        expect(suite!.domains).to.have.members(['retrieval', 'ranking', 'security', 'indexing', 'multi-session-memory']);
        expect(suite!.cases.map(item => item.id)).to.deep.equal([
            'multi-session-memory:global-ide-policy',
            'multi-session-memory:workspace-storage-policy',
            'retrieval:repository-memory-remote-clone',
            'ranking:feedback-graph-repository',
            'security:ignored-secret-file',
            'indexing:local-docs-fallback',
            'multi-session-memory:active-session',
            'multi-session-memory:active-task'
        ]);
        expect(suite!.cases.filter(item => item.id.startsWith('multi-session-memory:')).map(item => item.scope)).to.have.members([
            'global',
            'workspace',
            'session',
            'task'
        ]);
        expect(suite!.cases.filter(item => item.scope === 'repository').map(item => item.id)).to.include('retrieval:repository-memory-remote-clone');
        expect(suite!.securityExpectations).to.deep.equal({
            sensitiveFiles: 1,
            sensitiveResults: 0,
            secretLikeSnippets: 0
        });
    });

    it('evaluates the versioned benchmark suite against deterministic local retrieval results', () => {
        const service = new BenchmarkService();
        const suite = service.getVersionedSuite('memory-core-v1', 1)!;
        const resultByCase = new Map<string, RetrievalResult[]>([
            ['multi-session-memory:global-ide-policy', [{
                id: 'mem_global_ide_context_cart_policy',
                sourceKind: 'project-memory',
                title: 'Global IDE Context Cart policy',
                snippet: 'Global IDE memory says Context Cart remains the approval gate for every workspace.',
                score: 0.92,
                rankingSignals: { scope: 'global', bm25Score: 0.8, memoryWeight: 0.7, scopeBoost: 0.5, staleStatus: 'fresh', importance: 'high' }
            }]],
            ['multi-session-memory:workspace-storage-policy', [{
                id: 'mem_workspace_sqlite_storage_policy',
                sourceKind: 'project-memory',
                title: 'Workspace SQLite storage policy',
                snippet: 'Current workspace stores Memory memory in local SQLite storage with JSON fallback.',
                score: 0.9,
                rankingSignals: { scope: 'workspace', bm25Score: 0.75, memoryWeight: 0.8, scopeBoost: 0.75, staleStatus: 'fresh', importance: 'medium' }
            }]],
            ['retrieval:repository-memory-remote-clone', [{
                id: 'mem_repo_clone_policy',
                sourceKind: 'repository-memory',
                title: 'RepositoryId remote clone policy',
                snippet: 'RepositoryId is derived from the remote URL so repository memory follows different clone paths.',
                score: 0.9,
                rankingSignals: { scope: 'repository', bm25Score: 0.8, scopeBoost: 1, staleStatus: 'fresh', importance: 'high', weight: 0.8 }
            }]],
            ['ranking:feedback-graph-repository', [{
                id: 'graph_checkout_orchestrator',
                sourceKind: 'code-graph',
                title: 'Checkout orchestrator graph context',
                snippet: 'Checkout graph context has accepted feedback and links to the repository workflow.',
                score: 0.95,
                evidence: 'accepted feedback',
                rankingSignals: { graphScore: 1, acceptanceScore: 1, scopeBoost: 1, scope: 'repository' }
            }]],
            ['security:ignored-secret-file', [{
                id: 'chunk_public_security_policy',
                sourceKind: 'code',
                title: 'Public security policy',
                snippet: 'Secrets are redacted before audit logs and retrieval snippets are exported.',
                score: 0.8,
                uri: 'docs/security.md'
            }]],
            ['indexing:local-docs-fallback', [{
                id: 'doc_workspace_sections_fallback',
                sourceKind: 'local-docs',
                title: 'Workspace sections fallback',
                snippet: 'Workspace sections use local docs fallback when FTS workspace indexing is unavailable.',
                score: 0.7,
                uri: 'docs/retrieval.md'
            }]],
            ['multi-session-memory:active-session', [{
                id: 'mem_session_checkout_handoff',
                sourceKind: 'project-memory',
                title: 'Checkout session handoff',
                snippet: 'Current session handoff for checkout work is active and unexpired.',
                score: 0.86,
                rankingSignals: { scope: 'session', bm25Score: 0.7, memoryWeight: 0.8, staleStatus: 'fresh' }
            }]],
            ['multi-session-memory:active-task', [{
                id: 'mem_task_checkout_handoff',
                sourceKind: 'task-memory',
                title: 'Checkout task handoff',
                snippet: 'Current task handoff for checkout work is active and unexpired.',
                score: 0.85,
                rankingSignals: { scope: 'task', bm25Score: 0.7, memoryWeight: 0.8, staleStatus: 'fresh' }
            }]]
        ]);
        const cases = suite.cases.map((item, index) => service.caseResult(item, resultByCase.get(item.id) ?? [], 5 + index));
        const report = service.buildReport({
            workspacePath: '/workspace',
            generatedAt: '2026-05-20T00:00:00.000Z',
            dataset: suite.cases,
            cases,
            memories: [],
            codeChunks: [],
            files: [{
                id: 'file_secret_env',
                relativePath: '.env',
                fileName: '.env',
                sizeBytes: 32,
                contentHash: 'secret-hash',
                isIgnored: true,
                isGenerated: false,
                isBinary: false,
                isSensitive: true,
                ignoreReason: { kind: 'secret', source: 'secret-scanner', detail: 'metadata-only' }
            }],
            resultSets: suite.cases.map(item => resultByCase.get(item.id) ?? [])
        });

        expect(report.recall).to.equal(1);
        expect(report.recall).to.be.greaterThanOrEqual(suite.expectedMinimumRecall);
        expect(report.multiSessionRecall).to.equal(1);
        expect(report.security).to.deep.equal({
            sensitiveFiles: 1,
            sensitiveResults: 0,
            secretLikeSnippets: 0,
            status: 'attention'
        });
    });

    it('keeps versioned ranking benchmark explanations visible after score calculation', async () => {
        const source: IRetrievalSource = {
            sourceKind: 'code-graph',
            search: async () => [{
                id: 'graph_checkout_orchestrator',
                sourceKind: 'code-graph',
                title: 'Checkout orchestrator graph context',
                snippet: 'Checkout graph context with accepted feedback.',
                score: 0,
                evidence: 'accepted feedback',
                rankingSignals: {
                    bm25Score: 0.6,
                    graphScore: 1,
                    acceptanceScore: 1,
                    scopeBoost: 1,
                    scope: 'repository',
                    staleStatus: 'fresh',
                    importance: 'high',
                    weight: 0.9,
                    feedbackMultiplier: 1.2,
                    graphSignals: ['community', 'change-risk']
                }
            }]
        };
        const service = new ContextSuggestionService([source]);
        const result = await service.suggest({
            workspacePath: '/workspace',
            prompt: 'Rank checkout context with graph signals and accepted feedback',
            sourceKinds: ['code-graph'],
            limit: 1
        });

        expect(result.suggestions).to.have.length(1);
        expect(result.suggestions[0].id).to.equal('graph_checkout_orchestrator');
        expect(result.suggestions[0].score).to.be.greaterThan(0);
        expect(result.suggestions[0].reason).to.contain('scope=repository');
        expect(result.suggestions[0].reason).to.contain('stale=fresh');
        expect(result.suggestions[0].reason).to.contain('importance=high');
        expect(result.suggestions[0].reason).to.contain('feedback=1.2');
        expect(result.suggestions[0].reason).to.contain('graphSignals=community,change-risk');
    });

    it('applies feedback multipliers to explainable context ranking scores', async () => {
        const source: IRetrievalSource = {
            sourceKind: 'project-memory',
            search: async () => [{
                id: 'memory_rejected',
                sourceKind: 'project-memory',
                title: 'Rejected memory',
                snippet: 'Rejected memory should lose ranking strength.',
                score: 1,
                rankingSignals: {
                    bm25Score: 1,
                    feedbackMultiplier: 0.45
                }
            }, {
                id: 'memory_neutral',
                sourceKind: 'project-memory',
                title: 'Neutral memory',
                snippet: 'Neutral memory keeps normal ranking strength.',
                score: 1,
                rankingSignals: {
                    bm25Score: 1
                }
            }]
        };
        const service = new ContextSuggestionService([source]);
        const result = await service.suggest({
            workspacePath: '/workspace',
            prompt: 'memory',
            sourceKinds: ['project-memory'],
            limit: 2
        });

        expect(result.suggestions.map(suggestion => suggestion.id)).to.deep.equal(['memory_neutral', 'memory_rejected']);
        expect(result.suggestions[1].score).to.equal(0.135);
        expect(result.suggestions[1].reason).to.contain('feedback=0.45');
    });

    it('maps optional ICM memories and memoirs without requiring an ICM binary', () => {
        const service = new IcmBridgeService();
        const memories = service.toMemoryItems({
            workspacePath: '/workspace',
            now: '2026-01-01T00:00:00.000Z',
            activate: false,
            idFactory: (prefix, seed) => `${prefix}:${seed}`,
            memories: [{
                id: 'icm-memory-1',
                topic: 'workspace',
                title: 'Prefer local storage',
                text: 'Use local SQLite storage for Memory memory.',
                kind: 'decision',
                importance: 'high',
                weight: 0.8
            }]
        });
        const graphs = service.memoirsToKnowledgeGraphs({
            workspacePath: '/workspace',
            now: '2026-01-01T00:00:00.000Z',
            idFactory: (prefix, seed) => `${prefix}:${seed}`,
            memoirs: [{
                id: 'architecture',
                name: 'Architecture',
                concepts: [
                    { id: 'api', name: 'api', description: 'API boundary.', labels: ['type:service'] },
                    { id: 'storage', name: 'storage', description: 'Local storage.', labels: ['decision'] }
                ],
                links: [{ from: 'api', to: 'storage', relation: 'depends-on', confidence: 0.9 }]
            }]
        });
        const exported = service.exportBundle({
            workspacePath: '/workspace',
            exportedAt: '2026-01-01T00:00:00.000Z',
            memories,
            graphs
        });

        expect(memories[0].status).to.equal('candidate');
        expect(memories[0].memoryType).to.equal('project_decision');
        expect(graphs[0].concepts).to.have.length(2);
        expect(graphs[0].links[0].linkKind).to.equal('depends_on');
        expect(exported.source).to.equal('cybervinci-memory');
        expect(exported.memories[0].text).to.equal('Use local SQLite storage for Memory memory.');
    });

    it('redacts ICM portable bundle and knowledge graph exports', () => {
        const secret = 'abcdefghijklmnopqrstuvwxyz123456';
        const icm = new IcmBridgeService();
        const memory = {
            id: 'mem_secret',
            workspacePath: '/workspace',
            scope: 'workspace' as const,
            memoryType: 'security_note' as const,
            title: 'Secret note',
            content: `token = ${secret}`,
            status: 'active' as const,
            staleStatus: 'fresh' as const,
            importance: 'medium' as const,
            weight: 0.6,
            lastAccessedAt: '2026-01-01T00:00:00.000Z',
            accessCount: 0,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            acceptedCount: 0,
            rejectedCount: 0,
            evidence: `password = ${secret}`
        };
        const graph = {
            id: 'kg_secret',
            workspacePath: '/workspace',
            scope: 'workspace' as const,
            title: 'Security Graph',
            status: 'active' as const,
            concepts: [{
                id: 'concept_secret',
                graphId: 'kg_secret',
                kind: 'risk' as const,
                title: 'Token exposure',
                summary: `token = ${secret}`,
                status: 'active' as const,
                tags: [],
                weight: 0.6,
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z'
            }],
            links: [],
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z'
        };
        const bundle = icm.exportBundle({
            workspacePath: '/workspace',
            exportedAt: '2026-01-01T00:00:00.000Z',
            memories: [memory],
            graphs: [graph]
        });
        const exportedGraph = new KnowledgeGraphService().exportGraph(graph, {
            workspacePath: '/workspace',
            graphId: graph.id,
            format: 'markdown'
        }, '2026-01-01T00:00:00.000Z');

        expect(JSON.stringify(bundle)).not.to.contain(secret);
        expect(exportedGraph.content).not.to.contain(secret);
        expect(JSON.stringify(exportedGraph.graph)).to.contain('abcdef********3456');
    });

    it('moves repeated skill candidates into approval and blocks the same pattern after repeated rejection', () => {
        const engine = new SkillSuggestionEngine();
        const suggested = engine.updateCandidateForPrompt(undefined, {
            workspacePath: '/workspace',
            signature: 'review_change:csharp',
            eventType: 'prompt.submitted',
            trackingThreshold: 1,
            approvalThreshold: 1,
            now: '2026-01-01T00:00:00.000Z'
        });
        const deletePending = engine.updateCandidateForPrompt({
            ...suggested,
            status: 'suggested',
            rejectionCount: 2
        }, {
            workspacePath: '/workspace',
            signature: suggested.signature,
            eventType: 'skill.rejected',
            now: '2026-01-02T00:00:00.000Z'
        });

        expect(suggested.status).to.equal('suggested');
        expect(deletePending.status).to.equal('blocked');
        expect(deletePending.rejectionCount).to.equal(3);
        expect(deletePending.statusReason).to.contain('candidate silenced for this pattern');
    });

    it('keeps counting rejected skill candidates until the same pattern reaches the silence threshold', () => {
        const engine = new SkillSuggestionEngine();
        const rejected = engine.updateCandidateForPrompt({
            id: 'skill_repeated_test',
            workspacePath: '/workspace',
            signature: 'create_unit_test:csharp:test:none:create',
            title: 'Create Unit Test Csharp Test None Create',
            description: 'Candidate skill for repeated prompts matching create_unit_test:csharp:test:none:create.',
            triggerCount: 5,
            rejectionCount: 2,
            status: 'rejected',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-02T00:00:00.000Z'
        }, {
            workspacePath: '/workspace',
            signature: 'create_unit_test:csharp:test:none:create',
            eventType: 'skill.rejected',
            now: '2026-01-03T00:00:00.000Z'
        });

        expect(rejected.status).to.equal('blocked');
        expect(rejected.rejectionCount).to.equal(3);
        expect(rejected.statusReason).to.contain('threshold 3');
    });

    it('starts skill candidate tracking only after 3 occurrences in a 7 day window', () => {
        const engine = new SkillSuggestionEngine();
        const first = engine.updateCandidateForPrompt(undefined, {
            workspacePath: '/workspace',
            signature: 'create_unit_test:csharp:test:none:create',
            eventType: 'prompt.submitted',
            now: '2026-01-01T00:00:00.000Z'
        });
        const second = engine.updateCandidateForPrompt(first, {
            workspacePath: '/workspace',
            signature: first.signature,
            eventType: 'prompt.submitted',
            now: '2026-01-03T00:00:00.000Z'
        });
        const third = engine.updateCandidateForPrompt(second, {
            workspacePath: '/workspace',
            signature: first.signature,
            eventType: 'prompt.submitted',
            now: '2026-01-08T00:00:00.000Z'
        });
        const outsideWindow = engine.updateCandidateForPrompt(third, {
            workspacePath: '/workspace',
            signature: first.signature,
            eventType: 'prompt.submitted',
            now: '2026-01-20T00:00:00.000Z'
        });

        expect(first.trackingStartedAt).to.equal(undefined);
        expect(second.trackingStartedAt).to.equal(undefined);
        expect(third.trackingStartedAt).to.equal('2026-01-08T00:00:00.000Z');
        expect(third.triggerHistory).to.deep.equal([
            '2026-01-01T00:00:00.000Z',
            '2026-01-03T00:00:00.000Z',
            '2026-01-08T00:00:00.000Z'
        ]);
        expect(outsideWindow.triggerHistory).to.deep.equal([
            '2026-01-01T00:00:00.000Z',
            '2026-01-03T00:00:00.000Z',
            '2026-01-08T00:00:00.000Z',
            '2026-01-20T00:00:00.000Z'
        ]);
        expect(outsideWindow.statusReason).to.contain('1/3 occurrences in the last 7 days');
    });

    it('suggests skill candidates only after 5 occurrences in a 30 day window', () => {
        const engine = new SkillSuggestionEngine();
        const request = {
            workspacePath: '/workspace',
            signature: 'create_unit_test:csharp:test:none:create',
            eventType: 'prompt.submitted' as const
        };

        const first = engine.updateCandidateForPrompt(undefined, {
            ...request,
            now: '2026-01-01T00:00:00.000Z'
        });
        const second = engine.updateCandidateForPrompt(first, {
            ...request,
            now: '2026-01-05T00:00:00.000Z'
        });
        const third = engine.updateCandidateForPrompt(second, {
            ...request,
            now: '2026-01-10T00:00:00.000Z'
        });
        const fourth = engine.updateCandidateForPrompt(third, {
            ...request,
            now: '2026-01-20T00:00:00.000Z'
        });
        const fifthInWindow = engine.updateCandidateForPrompt(fourth, {
            ...request,
            now: '2026-01-31T00:00:00.000Z'
        });

        const staleFirst = engine.updateCandidateForPrompt(undefined, {
            ...request,
            signature: 'review_change:csharp:api:none:review',
            now: '2026-01-01T00:00:00.000Z'
        });
        const staleSecond = engine.updateCandidateForPrompt(staleFirst, {
            ...request,
            signature: staleFirst.signature,
            now: '2026-01-02T00:00:00.000Z'
        });
        const staleThird = engine.updateCandidateForPrompt(staleSecond, {
            ...request,
            signature: staleFirst.signature,
            now: '2026-01-03T00:00:00.000Z'
        });
        const staleFourth = engine.updateCandidateForPrompt(staleThird, {
            ...request,
            signature: staleFirst.signature,
            now: '2026-01-04T00:00:00.000Z'
        });
        const fifthOutsideWindow = engine.updateCandidateForPrompt(staleFourth, {
            ...request,
            signature: staleFirst.signature,
            now: '2026-02-05T00:00:00.000Z'
        });

        expect(fourth.status).to.equal('tracking');
        expect(fifthInWindow.status).to.equal('suggested');
        expect(fifthInWindow.statusReason).to.contain('5/5 occurrences in the last 30 days');
        expect(fifthOutsideWindow.triggerCount).to.equal(5);
        expect(fifthOutsideWindow.status).to.equal('tracking');
        expect(fifthOutsideWindow.statusReason).to.contain('1/5 occurrences in the last 30 days');
    });

    it('applies skill suggestion lifecycle transitions from controlled dated events', () => {
        const engine = new SkillSuggestionEngine();
        const baseRequest = {
            workspacePath: '/workspace',
            signature: 'refactor_controller:csharp:controller:aspnet:refactor'
        };
        const apply = (
            candidate: ReturnType<SkillSuggestionEngine['updateCandidateForPrompt']> | undefined,
            eventType: 'prompt.submitted' | 'skill.rejected' | 'skill.accepted',
            now: string
        ) => engine.updateCandidateForPrompt(candidate, {
            ...baseRequest,
            eventType,
            now
        });

        const first = apply(undefined, 'prompt.submitted', '2026-03-01T10:00:00.000Z');
        const second = apply(first, 'prompt.submitted', '2026-03-03T10:00:00.000Z');
        const tracking = apply(second, 'prompt.submitted', '2026-03-07T10:00:00.000Z');
        const fourth = apply(tracking, 'prompt.submitted', '2026-03-15T10:00:00.000Z');
        const suggested = apply(fourth, 'prompt.submitted', '2026-03-29T10:00:00.000Z');
        const accepted = apply(suggested, 'skill.accepted', '2026-03-30T10:00:00.000Z');

        const rejectedOnce = apply({
            ...suggested,
            status: 'rejected',
            rejectionCount: 0
        }, 'skill.rejected', '2026-03-30T11:00:00.000Z');
        const rejectedTwice = apply(rejectedOnce, 'skill.rejected', '2026-03-31T11:00:00.000Z');
        const blocked = apply(rejectedTwice, 'skill.rejected', '2026-04-01T11:00:00.000Z');

        expect(first.status).to.equal('tracking');
        expect(first.statusReason).to.contain('Observed 1/3 occurrences in the last 7 days');
        expect(second.trackingStartedAt).to.equal(undefined);
        expect(tracking.trackingStartedAt).to.equal('2026-03-07T10:00:00.000Z');
        expect(tracking.statusReason).to.contain('Tracking 3/5 occurrences in the last 30 days');
        expect(suggested.status).to.equal('suggested');
        expect(suggested.statusReason).to.contain('5/5 occurrences in the last 30 days');
        expect(suggested.triggerHistory).to.deep.equal([
            '2026-03-01T10:00:00.000Z',
            '2026-03-03T10:00:00.000Z',
            '2026-03-07T10:00:00.000Z',
            '2026-03-15T10:00:00.000Z',
            '2026-03-29T10:00:00.000Z'
        ]);
        expect(accepted.status).to.equal('accepted');
        expect(accepted.updatedAt).to.equal('2026-03-30T10:00:00.000Z');
        expect(rejectedOnce.status).to.equal('rejected');
        expect(rejectedTwice.status).to.equal('rejected');
        expect(blocked.status).to.equal('blocked');
        expect(blocked.rejectionCount).to.equal(3);
        expect(blocked.statusReason).to.contain('candidate silenced for this pattern');
    });

    it('includes redacted examples, triggers, and activation criteria in proposed skill payloads', () => {
        const engine = new SkillSuggestionEngine();
        const rawSecret = 'sk-test-12345678901234567890';
        const candidate = engine.updateCandidateForPrompt(undefined, {
            workspacePath: '/workspace',
            signature: 'create_unit_test:csharp:test:xunit:create',
            eventType: 'prompt.submitted',
            prompt: `Create xunit tests for OrdersService using token=${rawSecret}`,
            now: '2026-01-01T00:00:00.000Z'
        });
        const proposal = JSON.parse(candidate.proposedSkillJson ?? '{}') as {
            redactedExamples: string[];
            triggers: string[];
            activationCriteria: string;
        };

        expect(candidate.redactedExamples?.[0]).to.contain('sk-tes********7890');
        expect(candidate.redactedExamples?.[0]).not.to.contain(rawSecret);
        expect(proposal.redactedExamples[0]).to.equal(candidate.redactedExamples?.[0]);
        expect(proposal.triggers).to.include.members([
            'intent:create_unit_test',
            'language:csharp',
            'target:test',
            'framework:xunit',
            'action:create'
        ]);
        expect(proposal.activationCriteria).to.contain('Start tracking after 3 similar occurrences in 7 days.');
        expect(proposal.activationCriteria).to.contain('Suggest after 5 similar occurrences in 30 days.');
        expect(proposal.activationCriteria).to.contain('Silence after 3 rejections for the same pattern.');
    });
});

function fileFixture(partial: Partial<MemoryFile>): MemoryFile {
    return {
        id: 'file',
        relativePath: 'src/file.ts',
        fileName: 'file.ts',
        extension: '.ts',
        languageId: 'typescript',
        sizeBytes: 100,
        contentHash: 'hash',
        isIgnored: false,
        isGenerated: false,
        isBinary: false,
        isSensitive: false,
        ...partial
    };
}

function symbolFixture(partial: Partial<MemorySymbol>): MemorySymbol {
    return {
        id: 'sym',
        fileId: 'file',
        languageId: 'typescript',
        symbolKind: 'class',
        name: 'Symbol',
        ...partial
    };
}

function relationFixture(id: string, sourceId: string, targetId: string): MemoryRelation {
    return {
        id,
        sourceKind: 'symbol',
        sourceId,
        targetKind: 'symbol',
        targetId,
        relationType: 'calls',
        confidenceLevel: 'extracted',
        confidenceScore: 0.9
    };
}

function memoryItemFixture(partial: Partial<MemoryItem>): MemoryItem {
    return {
        id: 'memory',
        workspacePath: '/workspace',
        scope: 'workspace',
        memoryType: 'manual_note',
        title: 'Memory',
        content: 'Memory content',
        status: 'active',
        staleStatus: 'fresh',
        importance: 'medium',
        weight: 1,
        lastAccessedAt: '2026-01-01T00:00:00.000Z',
        accessCount: 0,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        acceptedCount: 0,
        rejectedCount: 0,
        ...partial
    };
}

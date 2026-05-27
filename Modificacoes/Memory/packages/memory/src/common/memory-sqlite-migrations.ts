// *****************************************************************************
// Copyright (C) 2026.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { MemoryMigration } from './memory-types';

export const MEMORY_WORKSPACE_ID_PATH_MAPPING_TABLES = [
    'pi_workspace_settings',
    'pi_workspace_snapshots',
    'pi_graph_snapshots',
    'pi_change_impacts',
    'pi_context_suggestions',
    'pi_memory_items',
    'pi_memory_vectors',
    'pi_memory_spaces',
    'pi_memory_relations',
    'pi_knowledge_graphs',
    'pi_knowledge_concepts',
    'pi_knowledge_links',
    'pi_skill_candidates',
    'pi_events',
    'pi_feedback_records',
    'pi_transcript_sessions',
    'pi_transcript_messages',
    'pi_retrieval_cache',
    'pi_benchmark_reports'
];

export const MEMORY_WORKSPACE_ID_KEY_MAPPING_TABLES = [
    'pi_files',
    'pi_symbols',
    'pi_relations',
    'pi_code_chunks',
    'pi_legacy_memories',
    'pi_skills'
];

export const MEMORY_SQLITE_MIGRATIONS: MemoryMigration[] = [
        {
            id: '001-memory-storage-core',
            description: 'Create Memory SQLite storage tables.',
            statements: [
                'PRAGMA journal_mode = WAL;',
                'PRAGMA foreign_keys = ON;',
                `CREATE TABLE IF NOT EXISTS pi_metadata (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )`,
                `CREATE TABLE IF NOT EXISTS pi_workspace_settings (
                    workspace_key TEXT PRIMARY KEY,
                    workspace_path TEXT NOT NULL,
                    payload_json TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )`,
                `CREATE TABLE IF NOT EXISTS pi_workspace_snapshots (
                    workspace_key TEXT PRIMARY KEY,
                    workspace_path TEXT NOT NULL,
                    payload_json TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )`,
                `CREATE TABLE IF NOT EXISTS pi_files (
                    workspace_key TEXT NOT NULL,
                    id TEXT NOT NULL,
                    relative_path TEXT NOT NULL,
                    language_id TEXT,
                    content_hash TEXT,
                    indexed_at TEXT,
                    payload_json TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    PRIMARY KEY (workspace_key, id)
                )`,
                `CREATE TABLE IF NOT EXISTS pi_symbols (
                    workspace_key TEXT NOT NULL,
                    id TEXT NOT NULL,
                    file_id TEXT NOT NULL,
                    language_id TEXT,
                    symbol_kind TEXT,
                    name TEXT,
                    full_name TEXT,
                    payload_json TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    PRIMARY KEY (workspace_key, id)
                )`,
                `CREATE TABLE IF NOT EXISTS pi_relations (
                    workspace_key TEXT NOT NULL,
                    id TEXT NOT NULL,
                    source_kind TEXT,
                    source_id TEXT,
                    target_kind TEXT,
                    target_id TEXT,
                    relation_type TEXT,
                    confidence_score REAL,
                    payload_json TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    PRIMARY KEY (workspace_key, id)
                )`,
                `CREATE TABLE IF NOT EXISTS pi_code_chunks (
                    workspace_key TEXT NOT NULL,
                    id TEXT NOT NULL,
                    relative_path TEXT NOT NULL,
                    language_id TEXT,
                    chunk_kind TEXT,
                    title TEXT NOT NULL,
                    content TEXT NOT NULL,
                    content_hash TEXT,
                    symbol_name TEXT,
                    indexed_at TEXT,
                    payload_json TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    PRIMARY KEY (workspace_key, id)
                )`,
                `CREATE TABLE IF NOT EXISTS pi_graph_snapshots (
                    id TEXT PRIMARY KEY,
                    workspace_key TEXT,
                    workspace_path TEXT,
                    created_at TEXT,
                    content_hash TEXT,
                    payload_json TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )`,
                `CREATE TABLE IF NOT EXISTS pi_change_impacts (
                    id TEXT PRIMARY KEY,
                    workspace_key TEXT,
                    workspace_path TEXT,
                    relative_path TEXT,
                    risk_score REAL,
                    created_at TEXT,
                    payload_json TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )`,
                `CREATE TABLE IF NOT EXISTS pi_context_suggestions (
                    id TEXT PRIMARY KEY,
                    workspace_key TEXT NOT NULL,
                    workspace_path TEXT NOT NULL,
                    prompt_signature TEXT NOT NULL,
                    source_kind TEXT,
                    score REAL,
                    created_at TEXT NOT NULL,
                    payload_json TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )`,
                `CREATE TABLE IF NOT EXISTS pi_legacy_memories (
                    workspace_key TEXT NOT NULL,
                    id TEXT NOT NULL,
                    kind TEXT,
                    title TEXT,
                    created_at TEXT,
                    updated_at TEXT,
                    payload_json TEXT NOT NULL,
                    row_order INTEGER NOT NULL,
                    PRIMARY KEY (workspace_key, id)
                )`,
                `CREATE TABLE IF NOT EXISTS pi_skills (
                    workspace_key TEXT NOT NULL,
                    id TEXT NOT NULL,
                    kind TEXT,
                    name TEXT,
                    created_at TEXT,
                    updated_at TEXT,
                    payload_json TEXT NOT NULL,
                    row_order INTEGER NOT NULL,
                    PRIMARY KEY (workspace_key, id)
                )`,
                `CREATE TABLE IF NOT EXISTS pi_memory_items (
                    id TEXT PRIMARY KEY,
                    workspace_key TEXT,
                    workspace_path TEXT,
                    scope TEXT NOT NULL,
                    memory_type TEXT NOT NULL,
                    title TEXT NOT NULL,
                    content TEXT NOT NULL,
                    status TEXT NOT NULL,
                    stale_status TEXT NOT NULL,
                    source TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    accepted_count INTEGER NOT NULL,
                    rejected_count INTEGER NOT NULL,
                    payload_json TEXT NOT NULL
                )`,
                `CREATE TABLE IF NOT EXISTS pi_memory_vectors (
                    id TEXT PRIMARY KEY,
                    memory_id TEXT NOT NULL,
                    workspace_key TEXT,
                    workspace_path TEXT,
                    scope TEXT NOT NULL,
                    model_id TEXT NOT NULL,
                    dimensions INTEGER NOT NULL,
                    content_hash TEXT NOT NULL,
                    vector_json TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    payload_json TEXT NOT NULL
                )`,
                `CREATE TABLE IF NOT EXISTS pi_skill_candidates (
                    id TEXT PRIMARY KEY,
                    workspace_key TEXT,
                    workspace_path TEXT,
                    signature TEXT NOT NULL,
                    title TEXT NOT NULL,
                    status TEXT NOT NULL,
                    trigger_count INTEGER NOT NULL,
                    rejection_count INTEGER,
                    last_triggered_at TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    payload_json TEXT NOT NULL
                )`,
                `CREATE TABLE IF NOT EXISTS pi_knowledge_graphs (
                    id TEXT PRIMARY KEY,
                    workspace_key TEXT,
                    workspace_path TEXT,
                    scope TEXT NOT NULL,
                    title TEXT NOT NULL,
                    status TEXT NOT NULL,
                    concept_count INTEGER NOT NULL,
                    link_count INTEGER NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    payload_json TEXT NOT NULL
                )`,
                `CREATE TABLE IF NOT EXISTS pi_events (
                    id TEXT PRIMARY KEY,
                    workspace_key TEXT NOT NULL,
                    workspace_path TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    relative_path TEXT,
                    prompt_signature TEXT,
                    created_at TEXT NOT NULL,
                    payload_json TEXT NOT NULL
                )`,
                `CREATE TABLE IF NOT EXISTS pi_feedback_records (
                    id TEXT PRIMARY KEY,
                    workspace_key TEXT NOT NULL,
                    workspace_path TEXT NOT NULL,
                    prompt_signature TEXT,
                    target_kind TEXT NOT NULL,
                    target_id TEXT NOT NULL,
                    target_source_kind TEXT,
                    target_uri TEXT,
                    target_title TEXT,
                    feedback TEXT NOT NULL,
                    reason TEXT,
                    evidence TEXT,
                    metadata_json TEXT,
                    created_at TEXT NOT NULL,
                    resolved_at TEXT,
                    payload_json TEXT NOT NULL
                )`
            ]
        },
        {
            id: '002-memory-storage-indexes',
            description: 'Create indexes for workspace reads and memory/event lookup.',
            statements: [
                'CREATE INDEX IF NOT EXISTS pi_files_workspace_path_idx ON pi_files(workspace_key, relative_path)',
                'CREATE INDEX IF NOT EXISTS pi_symbols_workspace_name_idx ON pi_symbols(workspace_key, name)',
                'CREATE INDEX IF NOT EXISTS pi_relations_workspace_source_idx ON pi_relations(workspace_key, source_kind, source_id)',
                'CREATE INDEX IF NOT EXISTS pi_relations_workspace_target_idx ON pi_relations(workspace_key, target_kind, target_id)',
                'CREATE INDEX IF NOT EXISTS pi_code_chunks_workspace_path_idx ON pi_code_chunks(workspace_key, relative_path)',
                'CREATE INDEX IF NOT EXISTS pi_code_chunks_workspace_symbol_idx ON pi_code_chunks(workspace_key, symbol_name)',
                'CREATE INDEX IF NOT EXISTS pi_memory_items_workspace_scope_idx ON pi_memory_items(workspace_key, scope, status)',
                'CREATE INDEX IF NOT EXISTS pi_memory_items_scope_idx ON pi_memory_items(scope, status)',
                'CREATE INDEX IF NOT EXISTS pi_memory_items_type_idx ON pi_memory_items(memory_type, status)',
                'CREATE INDEX IF NOT EXISTS pi_memory_vectors_workspace_idx ON pi_memory_vectors(workspace_key, model_id, dimensions)',
                'CREATE INDEX IF NOT EXISTS pi_memory_vectors_memory_idx ON pi_memory_vectors(memory_id, content_hash)',
                'CREATE INDEX IF NOT EXISTS pi_skill_candidates_workspace_status_idx ON pi_skill_candidates(workspace_key, status)',
                'CREATE INDEX IF NOT EXISTS pi_knowledge_graphs_workspace_status_idx ON pi_knowledge_graphs(workspace_key, status, updated_at)',
                'CREATE INDEX IF NOT EXISTS pi_knowledge_graphs_scope_idx ON pi_knowledge_graphs(scope, status)',
                'CREATE INDEX IF NOT EXISTS pi_knowledge_graphs_title_idx ON pi_knowledge_graphs(title)',
                'CREATE INDEX IF NOT EXISTS pi_events_workspace_type_idx ON pi_events(workspace_key, event_type, created_at)',
                'CREATE INDEX IF NOT EXISTS pi_events_workspace_prompt_idx ON pi_events(workspace_key, prompt_signature, created_at)',
                'CREATE INDEX IF NOT EXISTS pi_context_suggestions_workspace_prompt_idx ON pi_context_suggestions(workspace_key, prompt_signature, created_at)',
                'CREATE INDEX IF NOT EXISTS pi_feedback_records_workspace_prompt_idx ON pi_feedback_records(workspace_key, prompt_signature, created_at)',
                'CREATE INDEX IF NOT EXISTS pi_feedback_records_workspace_target_idx ON pi_feedback_records(workspace_key, target_source_kind, target_id, feedback)',
                'CREATE INDEX IF NOT EXISTS pi_feedback_records_resolved_idx ON pi_feedback_records(resolved_at, created_at)'
            ]
        },
        {
            id: '003-memory-storage-fts',
            description: 'Create FTS5 indexes for memories, events, and skill candidates.',
            statements: [
                `CREATE VIRTUAL TABLE IF NOT EXISTS pi_memory_fts USING fts5(
                    title,
                    content,
                    source,
                    payload_json,
                    content='pi_memory_items',
                    content_rowid='rowid',
                    tokenize='unicode61'
                )`,
                `CREATE VIRTUAL TABLE IF NOT EXISTS pi_event_fts USING fts5(
                    event_type,
                    relative_path,
                    prompt_signature,
                    payload_json,
                    content='pi_events',
                    content_rowid='rowid',
                    tokenize='unicode61'
                )`,
                `CREATE VIRTUAL TABLE IF NOT EXISTS pi_skill_candidate_fts USING fts5(
                    signature,
                    title,
                    payload_json,
                    content='pi_skill_candidates',
                    content_rowid='rowid',
                    tokenize='unicode61'
                )`,
                `CREATE TRIGGER IF NOT EXISTS pi_memory_items_ai AFTER INSERT ON pi_memory_items BEGIN
                    INSERT INTO pi_memory_fts(rowid, title, content, source, payload_json)
                    VALUES (new.rowid, new.title, new.content, new.source, new.payload_json);
                END`,
                `CREATE TRIGGER IF NOT EXISTS pi_memory_items_ad AFTER DELETE ON pi_memory_items BEGIN
                    INSERT INTO pi_memory_fts(pi_memory_fts, rowid, title, content, source, payload_json)
                    VALUES ('delete', old.rowid, old.title, old.content, old.source, old.payload_json);
                END`,
                `CREATE TRIGGER IF NOT EXISTS pi_memory_items_au AFTER UPDATE ON pi_memory_items BEGIN
                    INSERT INTO pi_memory_fts(pi_memory_fts, rowid, title, content, source, payload_json)
                    VALUES ('delete', old.rowid, old.title, old.content, old.source, old.payload_json);
                    INSERT INTO pi_memory_fts(rowid, title, content, source, payload_json)
                    VALUES (new.rowid, new.title, new.content, new.source, new.payload_json);
                END`,
                `CREATE TRIGGER IF NOT EXISTS pi_events_ai AFTER INSERT ON pi_events BEGIN
                    INSERT INTO pi_event_fts(rowid, event_type, relative_path, prompt_signature, payload_json)
                    VALUES (new.rowid, new.event_type, new.relative_path, new.prompt_signature, new.payload_json);
                END`,
                `CREATE TRIGGER IF NOT EXISTS pi_events_ad AFTER DELETE ON pi_events BEGIN
                    INSERT INTO pi_event_fts(pi_event_fts, rowid, event_type, relative_path, prompt_signature, payload_json)
                    VALUES ('delete', old.rowid, old.event_type, old.relative_path, old.prompt_signature, old.payload_json);
                END`,
                `CREATE TRIGGER IF NOT EXISTS pi_events_au AFTER UPDATE ON pi_events BEGIN
                    INSERT INTO pi_event_fts(pi_event_fts, rowid, event_type, relative_path, prompt_signature, payload_json)
                    VALUES ('delete', old.rowid, old.event_type, old.relative_path, old.prompt_signature, old.payload_json);
                    INSERT INTO pi_event_fts(rowid, event_type, relative_path, prompt_signature, payload_json)
                    VALUES (new.rowid, new.event_type, new.relative_path, new.prompt_signature, new.payload_json);
                END`,
                `CREATE TRIGGER IF NOT EXISTS pi_skill_candidates_ai AFTER INSERT ON pi_skill_candidates BEGIN
                    INSERT INTO pi_skill_candidate_fts(rowid, signature, title, payload_json)
                    VALUES (new.rowid, new.signature, new.title, new.payload_json);
                END`,
                `CREATE TRIGGER IF NOT EXISTS pi_skill_candidates_ad AFTER DELETE ON pi_skill_candidates BEGIN
                    INSERT INTO pi_skill_candidate_fts(pi_skill_candidate_fts, rowid, signature, title, payload_json)
                    VALUES ('delete', old.rowid, old.signature, old.title, old.payload_json);
                END`,
                `CREATE TRIGGER IF NOT EXISTS pi_skill_candidates_au AFTER UPDATE ON pi_skill_candidates BEGIN
                    INSERT INTO pi_skill_candidate_fts(pi_skill_candidate_fts, rowid, signature, title, payload_json)
                    VALUES ('delete', old.rowid, old.signature, old.title, old.payload_json);
                    INSERT INTO pi_skill_candidate_fts(rowid, signature, title, payload_json)
                    VALUES (new.rowid, new.signature, new.title, new.payload_json);
                END`,
                "INSERT INTO pi_memory_fts(pi_memory_fts) VALUES ('rebuild')",
                "INSERT INTO pi_event_fts(pi_event_fts) VALUES ('rebuild')",
                "INSERT INTO pi_skill_candidate_fts(pi_skill_candidate_fts) VALUES ('rebuild')"
            ]
        },
        {
            id: '004-memory-lifecycle',
            description: 'Add Memory memory lifecycle fields for ranking and pruning.',
            statements: [
                "ALTER TABLE pi_memory_items ADD COLUMN importance TEXT NOT NULL DEFAULT 'medium'",
                'ALTER TABLE pi_memory_items ADD COLUMN weight REAL NOT NULL DEFAULT 0.6',
                'ALTER TABLE pi_memory_items ADD COLUMN last_accessed_at TEXT',
                'ALTER TABLE pi_memory_items ADD COLUMN access_count INTEGER NOT NULL DEFAULT 0',
                'UPDATE pi_memory_items SET last_accessed_at = COALESCE(last_accessed_at, updated_at, created_at)',
                'CREATE INDEX IF NOT EXISTS pi_memory_items_importance_idx ON pi_memory_items(importance, status)',
                'CREATE INDEX IF NOT EXISTS pi_memory_items_weight_idx ON pi_memory_items(weight, updated_at)',
                'CREATE INDEX IF NOT EXISTS pi_memory_items_last_accessed_idx ON pi_memory_items(last_accessed_at)'
            ]
        },
        {
            id: '005-memory-feedback-records',
            description: 'Add local Memory feedback records for prompt and retrieval learning.',
            statements: [
                `CREATE TABLE IF NOT EXISTS pi_feedback_records (
                    id TEXT PRIMARY KEY,
                    workspace_key TEXT NOT NULL,
                    workspace_path TEXT NOT NULL,
                    prompt_signature TEXT,
                    target_kind TEXT NOT NULL,
                    target_id TEXT NOT NULL,
                    target_source_kind TEXT,
                    target_uri TEXT,
                    target_title TEXT,
                    feedback TEXT NOT NULL,
                    reason TEXT,
                    evidence TEXT,
                    metadata_json TEXT,
                    created_at TEXT NOT NULL,
                    resolved_at TEXT,
                    payload_json TEXT NOT NULL
                )`,
                'CREATE INDEX IF NOT EXISTS pi_feedback_records_workspace_prompt_idx ON pi_feedback_records(workspace_key, prompt_signature, created_at)',
                'CREATE INDEX IF NOT EXISTS pi_feedback_records_workspace_target_idx ON pi_feedback_records(workspace_key, target_source_kind, target_id, feedback)',
                'CREATE INDEX IF NOT EXISTS pi_feedback_records_resolved_idx ON pi_feedback_records(resolved_at, created_at)'
            ]
        },
        {
            id: '006-memory-knowledge-graphs',
            description: 'Add local Memory knowledge graph persistence.',
            statements: [
                `CREATE TABLE IF NOT EXISTS pi_knowledge_graphs (
                    id TEXT PRIMARY KEY,
                    workspace_key TEXT,
                    workspace_path TEXT,
                    scope TEXT NOT NULL,
                    title TEXT NOT NULL,
                    status TEXT NOT NULL,
                    concept_count INTEGER NOT NULL,
                    link_count INTEGER NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    payload_json TEXT NOT NULL
                )`,
                'CREATE INDEX IF NOT EXISTS pi_knowledge_graphs_workspace_status_idx ON pi_knowledge_graphs(workspace_key, status, updated_at)',
                'CREATE INDEX IF NOT EXISTS pi_knowledge_graphs_scope_idx ON pi_knowledge_graphs(scope, status)',
                'CREATE INDEX IF NOT EXISTS pi_knowledge_graphs_title_idx ON pi_knowledge_graphs(title)'
            ]
        },
        {
            id: '007-memory-vectors',
            description: 'Add opt-in local Memory memory vector persistence.',
            statements: [
                `CREATE TABLE IF NOT EXISTS pi_memory_vectors (
                    id TEXT PRIMARY KEY,
                    memory_id TEXT NOT NULL,
                    workspace_key TEXT,
                    workspace_path TEXT,
                    scope TEXT NOT NULL,
                    model_id TEXT NOT NULL,
                    dimensions INTEGER NOT NULL,
                    content_hash TEXT NOT NULL,
                    vector_json TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    payload_json TEXT NOT NULL
                )`,
                'CREATE INDEX IF NOT EXISTS pi_memory_vectors_workspace_idx ON pi_memory_vectors(workspace_key, model_id, dimensions)',
                'CREATE INDEX IF NOT EXISTS pi_memory_vectors_memory_idx ON pi_memory_vectors(memory_id, content_hash)'
            ]
        },
        {
            id: '004a-memory-scope-locators',
            description: 'Add Memory memory scope locator and supersedence columns.',
            statements: [
                'ALTER TABLE pi_memory_items ADD COLUMN repository_url TEXT',
                'ALTER TABLE pi_memory_items ADD COLUMN repository_id TEXT',
                'ALTER TABLE pi_memory_items ADD COLUMN session_id TEXT',
                'ALTER TABLE pi_memory_items ADD COLUMN task_id TEXT',
                'ALTER TABLE pi_memory_items ADD COLUMN expires_at TEXT',
                'ALTER TABLE pi_memory_items ADD COLUMN retention_policy TEXT',
                'ALTER TABLE pi_memory_items ADD COLUMN superseded_by TEXT',
                'ALTER TABLE pi_memory_items ADD COLUMN supersedes_json TEXT',
                'ALTER TABLE pi_memory_items ADD COLUMN origin_markers_json TEXT',
                'CREATE INDEX IF NOT EXISTS pi_memory_items_repository_id_idx ON pi_memory_items(repository_id, status)',
                'CREATE INDEX IF NOT EXISTS pi_memory_items_session_idx ON pi_memory_items(session_id, status)',
                'CREATE INDEX IF NOT EXISTS pi_memory_items_task_idx ON pi_memory_items(task_id, status)',
                'CREATE INDEX IF NOT EXISTS pi_memory_items_expiry_idx ON pi_memory_items(expires_at, retention_policy)'
            ]
        },
        {
            id: '008-memory-spaces',
            description: 'Create Memory memory spaces.',
            statements: [
                `CREATE TABLE IF NOT EXISTS pi_memory_spaces (
                    id TEXT PRIMARY KEY,
                    workspace_key TEXT,
                    workspace_path TEXT,
                    scope TEXT NOT NULL,
                    repository_url TEXT,
                    repository_id TEXT,
                    session_id TEXT,
                    task_id TEXT,
                    retention_policy TEXT,
                    metadata_json TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    payload_json TEXT NOT NULL
                )`,
                'CREATE INDEX IF NOT EXISTS pi_memory_spaces_scope_idx ON pi_memory_spaces(scope)',
                'CREATE INDEX IF NOT EXISTS pi_memory_spaces_workspace_path_idx ON pi_memory_spaces(workspace_key, workspace_path)',
                'CREATE INDEX IF NOT EXISTS pi_memory_spaces_repository_url_idx ON pi_memory_spaces(repository_url)',
                'CREATE INDEX IF NOT EXISTS pi_memory_spaces_repository_id_idx ON pi_memory_spaces(repository_id)',
                'CREATE INDEX IF NOT EXISTS pi_memory_spaces_session_idx ON pi_memory_spaces(session_id)',
                'CREATE INDEX IF NOT EXISTS pi_memory_spaces_task_idx ON pi_memory_spaces(task_id)',
                'CREATE INDEX IF NOT EXISTS pi_memory_spaces_retention_idx ON pi_memory_spaces(retention_policy)'
            ]
        },
        {
            id: '009-memory-default-memory-space-mapping',
            description: 'Map existing memories to default memory spaces.',
            statements: [
                'ALTER TABLE pi_memory_items ADD COLUMN memory_space_id TEXT',
                `INSERT OR IGNORE INTO pi_memory_spaces (
                    id, workspace_key, workspace_path, scope, repository_url, repository_id, session_id, task_id, retention_policy, metadata_json, created_at, updated_at, payload_json
                )
                SELECT DISTINCT
                    CASE
                        WHEN scope = 'global' THEN 'default:global'
                        WHEN scope = 'workspace' THEN 'default:workspace:' || COALESCE(workspace_path, '')
                        WHEN scope = 'repository' THEN 'default:repository:' || COALESCE(repository_id, repository_url, '')
                        WHEN scope = 'session' THEN 'default:session:' || COALESCE(session_id, '')
                        WHEN scope = 'task' THEN 'default:task:' || COALESCE(task_id, '')
                        ELSE 'default:' || scope
                    END,
                    workspace_key,
                    CASE WHEN scope = 'global' THEN NULL ELSE workspace_path END,
                    scope,
                    repository_url,
                    repository_id,
                    session_id,
                    task_id,
                    retention_policy,
                    '{"kind":"default"}',
                    created_at,
                    updated_at,
                    json_object(
                        'id', CASE
                            WHEN scope = 'global' THEN 'default:global'
                            WHEN scope = 'workspace' THEN 'default:workspace:' || COALESCE(workspace_path, '')
                            WHEN scope = 'repository' THEN 'default:repository:' || COALESCE(repository_id, repository_url, '')
                            WHEN scope = 'session' THEN 'default:session:' || COALESCE(session_id, '')
                            WHEN scope = 'task' THEN 'default:task:' || COALESCE(task_id, '')
                            ELSE 'default:' || scope
                        END,
                        'scope', scope,
                        'workspacePath', CASE WHEN scope = 'global' THEN NULL ELSE workspace_path END,
                        'repositoryUrl', repository_url,
                        'repositoryId', repository_id,
                        'sessionId', session_id,
                        'taskId', task_id,
                        'retentionPolicy', retention_policy,
                        'metadata', json('{"kind":"default"}'),
                        'createdAt', created_at,
                        'updatedAt', updated_at
                    )
                FROM pi_memory_items`,
                `UPDATE pi_memory_items SET memory_space_id = CASE
                    WHEN scope = 'global' THEN 'default:global'
                    WHEN scope = 'workspace' THEN 'default:workspace:' || COALESCE(workspace_path, '')
                    WHEN scope = 'repository' THEN 'default:repository:' || COALESCE(repository_id, repository_url, '')
                    WHEN scope = 'session' THEN 'default:session:' || COALESCE(session_id, '')
                    WHEN scope = 'task' THEN 'default:task:' || COALESCE(task_id, '')
                    ELSE 'default:' || scope
                END`
            ]
        },
        {
            id: '010-memory-knowledge-concepts',
            description: 'Create Memory persistent knowledge concepts.',
            statements: [
                `CREATE TABLE IF NOT EXISTS pi_knowledge_concepts (
                    id TEXT PRIMARY KEY,
                    graph_id TEXT,
                    workspace_key TEXT,
                    workspace_path TEXT,
                    scope TEXT NOT NULL,
                    concept_type TEXT NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT,
                    source TEXT,
                    evidence TEXT,
                    confidence REAL NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    payload_json TEXT NOT NULL
                )`,
                'CREATE INDEX IF NOT EXISTS pi_knowledge_concepts_workspace_scope_idx ON pi_knowledge_concepts(workspace_key, scope)',
                'CREATE INDEX IF NOT EXISTS pi_knowledge_concepts_scope_type_idx ON pi_knowledge_concepts(scope, concept_type)',
                'CREATE INDEX IF NOT EXISTS pi_knowledge_concepts_title_idx ON pi_knowledge_concepts(title)',
                'CREATE INDEX IF NOT EXISTS pi_knowledge_concepts_source_idx ON pi_knowledge_concepts(source)',
                'CREATE INDEX IF NOT EXISTS pi_knowledge_concepts_confidence_idx ON pi_knowledge_concepts(confidence)'
            ]
        },
        {
            id: '011-memory-knowledge-links',
            description: 'Create Memory persistent knowledge links.',
            statements: [
                `CREATE TABLE IF NOT EXISTS pi_knowledge_links (
                    id TEXT PRIMARY KEY,
                    graph_id TEXT,
                    workspace_key TEXT,
                    workspace_path TEXT,
                    scope TEXT NOT NULL,
                    source_kind TEXT NOT NULL,
                    source_id TEXT NOT NULL,
                    target_kind TEXT NOT NULL,
                    target_id TEXT NOT NULL,
                    relation_type TEXT NOT NULL,
                    confidence REAL NOT NULL,
                    source TEXT,
                    evidence TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    payload_json TEXT NOT NULL
                )`,
                'CREATE INDEX IF NOT EXISTS pi_knowledge_links_graph_idx ON pi_knowledge_links(graph_id)',
                'CREATE INDEX IF NOT EXISTS pi_knowledge_links_workspace_scope_idx ON pi_knowledge_links(workspace_key, scope)',
                'CREATE INDEX IF NOT EXISTS pi_knowledge_links_source_idx ON pi_knowledge_links(source_kind, source_id)',
                'CREATE INDEX IF NOT EXISTS pi_knowledge_links_target_idx ON pi_knowledge_links(target_kind, target_id)',
                'CREATE INDEX IF NOT EXISTS pi_knowledge_links_relation_idx ON pi_knowledge_links(relation_type)',
                'CREATE INDEX IF NOT EXISTS pi_knowledge_links_origin_idx ON pi_knowledge_links(source)'
            ]
        },
        {
            id: '012-memory-relations',
            description: 'Create Memory memory relation storage.',
            statements: [
                `CREATE TABLE IF NOT EXISTS pi_memory_relations (
                    id TEXT PRIMARY KEY,
                    workspace_key TEXT,
                    workspace_path TEXT,
                    scope TEXT NOT NULL,
                    source_memory_id TEXT NOT NULL,
                    target_memory_id TEXT NOT NULL,
                    relation_type TEXT NOT NULL CHECK (relation_type IN ('contradicts', 'refines', 'alternative_to', 'superseded_by', 'related_to')),
                    confidence REAL NOT NULL,
                    source TEXT,
                    evidence TEXT,
                    metadata_json TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    payload_json TEXT NOT NULL
                )`,
                'CREATE INDEX IF NOT EXISTS pi_memory_relations_workspace_scope_idx ON pi_memory_relations(workspace_key, scope)',
                'CREATE INDEX IF NOT EXISTS pi_memory_relations_source_idx ON pi_memory_relations(source_memory_id)',
                'CREATE INDEX IF NOT EXISTS pi_memory_relations_target_idx ON pi_memory_relations(target_memory_id)',
                'CREATE INDEX IF NOT EXISTS pi_memory_relations_type_idx ON pi_memory_relations(relation_type)',
                'CREATE INDEX IF NOT EXISTS pi_memory_relations_origin_idx ON pi_memory_relations(source)'
            ]
        },
        {
            id: '013-memory-retrieval-cache',
            description: 'Create scoped retrieval cache storage.',
            statements: [
                `CREATE TABLE IF NOT EXISTS pi_retrieval_cache (
                    id TEXT PRIMARY KEY,
                    workspace_key TEXT NOT NULL,
                    workspace_path TEXT NOT NULL,
                    query_key TEXT NOT NULL,
                    scope_params_json TEXT NOT NULL,
                    sources_hash TEXT NOT NULL,
                    results_json TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    expires_at TEXT NOT NULL
                )`,
                'CREATE UNIQUE INDEX IF NOT EXISTS pi_retrieval_cache_query_scope_idx ON pi_retrieval_cache(workspace_path, query_key, sources_hash)',
                'CREATE INDEX IF NOT EXISTS pi_retrieval_cache_workspace_expiry_idx ON pi_retrieval_cache(workspace_key, expires_at)'
            ]
        },
        {
            id: '014-memory-benchmark-reports',
            description: 'Create benchmark report storage.',
            statements: [
                `CREATE TABLE IF NOT EXISTS pi_benchmark_reports (
                    id TEXT PRIMARY KEY,
                    workspace_key TEXT,
                    workspace_path TEXT,
                    suite_id TEXT,
                    score REAL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    payload_json TEXT NOT NULL
                )`,
                'CREATE INDEX IF NOT EXISTS pi_benchmark_reports_workspace_idx ON pi_benchmark_reports(workspace_key, created_at)',
                'CREATE INDEX IF NOT EXISTS pi_benchmark_reports_suite_idx ON pi_benchmark_reports(suite_id, created_at)'
            ]
        },
        {
            id: '015-memory-transcript-storage',
            description: 'Create transcript session and message storage.',
            statements: [
                `CREATE TABLE IF NOT EXISTS pi_transcript_sessions (
                    id TEXT PRIMARY KEY,
                    workspace_key TEXT,
                    workspace_path TEXT,
                    scope TEXT NOT NULL,
                    origin TEXT NOT NULL,
                    source TEXT,
                    title TEXT,
                    started_at TEXT NOT NULL,
                    ended_at TEXT,
                    retention_policy TEXT,
                    redaction_status TEXT NOT NULL,
                    metadata_json TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    payload_json TEXT NOT NULL
                )`,
                `CREATE TABLE IF NOT EXISTS pi_transcript_messages (
                    id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    workspace_key TEXT,
                    workspace_path TEXT,
                    scope TEXT NOT NULL,
                    origin TEXT NOT NULL,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    redacted_content TEXT,
                    redaction_status TEXT NOT NULL,
                    redaction_summary_json TEXT,
                    retention_policy TEXT,
                    session_id_hint TEXT,
                    task_id TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    payload_json TEXT NOT NULL
                )`,
                'CREATE INDEX IF NOT EXISTS pi_transcript_sessions_workspace_scope_idx ON pi_transcript_sessions(workspace_key, scope)',
                'CREATE INDEX IF NOT EXISTS pi_transcript_sessions_origin_idx ON pi_transcript_sessions(origin)',
                'CREATE INDEX IF NOT EXISTS pi_transcript_sessions_retention_idx ON pi_transcript_sessions(retention_policy)',
                'CREATE INDEX IF NOT EXISTS pi_transcript_messages_session_created_idx ON pi_transcript_messages(session_id, created_at)',
                'CREATE INDEX IF NOT EXISTS pi_transcript_messages_workspace_scope_idx ON pi_transcript_messages(workspace_key, scope)',
                'CREATE INDEX IF NOT EXISTS pi_transcript_messages_origin_role_idx ON pi_transcript_messages(origin, role)',
                'CREATE INDEX IF NOT EXISTS pi_transcript_messages_retention_idx ON pi_transcript_messages(retention_policy)',
                `CREATE VIRTUAL TABLE IF NOT EXISTS pi_transcript_message_fts USING fts5(
                    content,
                    origin,
                    role,
                    payload_json,
                    content='pi_transcript_messages',
                    content_rowid='rowid',
                    tokenize='unicode61'
                )`,
                `CREATE TRIGGER IF NOT EXISTS pi_transcript_messages_ai AFTER INSERT ON pi_transcript_messages BEGIN
                    INSERT INTO pi_transcript_message_fts(rowid, content, origin, role, payload_json)
                    VALUES (new.rowid, new.content, new.origin, new.role, new.payload_json);
                END`,
                `CREATE TRIGGER IF NOT EXISTS pi_transcript_messages_ad AFTER DELETE ON pi_transcript_messages BEGIN
                    INSERT INTO pi_transcript_message_fts(pi_transcript_message_fts, rowid, content, origin, role, payload_json)
                    VALUES ('delete', old.rowid, old.content, old.origin, old.role, old.payload_json);
                END`,
                `CREATE TRIGGER IF NOT EXISTS pi_transcript_messages_au AFTER UPDATE ON pi_transcript_messages BEGIN
                    INSERT INTO pi_transcript_message_fts(pi_transcript_message_fts, rowid, content, origin, role, payload_json)
                    VALUES ('delete', old.rowid, old.content, old.origin, old.role, old.payload_json);
                    INSERT INTO pi_transcript_message_fts(rowid, content, origin, role, payload_json)
                    VALUES (new.rowid, new.content, new.origin, new.role, new.payload_json);
                END`
            ]
        },
        {
            id: '017-memory-workspaces',
            description: 'Create workspace identity storage and migrate workspace settings.',
            statements: [
                `CREATE TABLE IF NOT EXISTS pi_workspaces (
                    id TEXT PRIMARY KEY,
                    workspace_id TEXT NOT NULL,
                    root_path TEXT NOT NULL,
                    repository_url TEXT,
                    git_branch TEXT,
                    git_head_commit TEXT,
                    enabled INTEGER NOT NULL,
                    code_graph_enabled INTEGER NOT NULL,
                    memory_enabled INTEGER NOT NULL,
                    chat_learning_enabled INTEGER NOT NULL,
                    skill_suggestions_enabled INTEGER NOT NULL,
                    context_cart_enabled INTEGER NOT NULL,
                    hover_editor_enabled INTEGER NOT NULL,
                    sensitive_local_docs_enabled INTEGER NOT NULL,
                    flags TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )`,
                `INSERT OR REPLACE INTO pi_workspaces (
                    id, workspace_id, root_path, repository_url, git_branch, git_head_commit, enabled,
                    code_graph_enabled, memory_enabled, chat_learning_enabled, skill_suggestions_enabled,
                    context_cart_enabled, hover_editor_enabled, sensitive_local_docs_enabled, flags, created_at, updated_at
                )
                SELECT
                    workspace_key,
                    workspace_key,
                    workspace_path,
                    json_extract(payload_json, '$.repositoryUrl'),
                    json_extract(payload_json, '$.gitBranch'),
                    json_extract(payload_json, '$.gitHeadCommit'),
                    CASE WHEN json_extract(payload_json, '$.enabled') THEN 1 ELSE 0 END,
                    CASE WHEN json_extract(payload_json, '$.graphEnabled') OR json_extract(payload_json, '$.optIn.codeGraph') OR json_extract(payload_json, '$.optIn.documentGraph') THEN 1 ELSE 0 END,
                    CASE WHEN json_extract(payload_json, '$.optIn.projectMemory') OR json_extract(payload_json, '$.optIn.preferences') OR json_extract(payload_json, '$.optIn.transcriptSearch') THEN 1 ELSE 0 END,
                    CASE WHEN json_extract(payload_json, '$.chatLearningEnabled') OR json_extract(payload_json, '$.optIn.transcriptSearch') THEN 1 ELSE 0 END,
                    CASE WHEN json_extract(payload_json, '$.skillSuggestionsEnabled') OR json_extract(payload_json, '$.optIn.skills') THEN 1 ELSE 0 END,
                    CASE WHEN json_extract(payload_json, '$.optIn.contextCart') THEN 1 ELSE 0 END,
                    CASE WHEN json_extract(payload_json, '$.editorHoverEnabled') OR json_extract(payload_json, '$.optIn.editorHover') THEN 1 ELSE 0 END,
                    CASE WHEN json_extract(payload_json, '$.optIn.pdfDocuments') OR json_extract(payload_json, '$.optIn.officeDocuments') OR json_extract(payload_json, '$.optIn.images') OR json_extract(payload_json, '$.optIn.diagrams') OR json_extract(payload_json, '$.optIn.audioVideo') THEN 1 ELSE 0 END,
                    json_object('source', 'pi_workspace_settings', 'migratedFromWorkspaceKey', workspace_key),
                    COALESCE(json_extract(payload_json, '$.createdAt'), updated_at),
                    updated_at
                FROM pi_workspace_settings`,
                'CREATE INDEX IF NOT EXISTS idx_pi_workspaces_workspace_id ON pi_workspaces(workspace_id)',
                'CREATE INDEX IF NOT EXISTS idx_pi_workspaces_root_path ON pi_workspaces(root_path)',
                'CREATE INDEX IF NOT EXISTS idx_pi_workspaces_repository_url ON pi_workspaces(repository_url)',
                'CREATE INDEX IF NOT EXISTS idx_pi_workspaces_git_branch ON pi_workspaces(git_branch)',
                'CREATE INDEX IF NOT EXISTS idx_pi_workspaces_git_head_commit ON pi_workspaces(git_head_commit)',
                'CREATE INDEX IF NOT EXISTS idx_pi_workspaces_updated_at ON pi_workspaces(updated_at)'
            ]
        },
        {
            id: '018-memory-agent-events-compatibility',
            description: 'Expose pi_events through the pi_agent_events compatibility contract.',
            statements: [
                `CREATE VIEW IF NOT EXISTS pi_agent_events AS
                SELECT
                    id,
                    workspace_key AS workspace_id,
                    json_extract(payload_json, '$.sessionId') AS session_id,
                    json_extract(payload_json, '$.taskId') AS task_id,
                    json_extract(payload_json, '$.provider') AS provider,
                    event_type,
                    payload_json,
                    json_extract(payload_json, '$.fileId') AS file_id,
                    json_extract(payload_json, '$.symbolId') AS symbol_id,
                    relative_path,
                    json_extract(payload_json, '$.command') AS command,
                    json_extract(payload_json, '$.promptTextHash') AS prompt_text_hash,
                    prompt_signature,
                    created_at
                FROM pi_events`,
                `CREATE TRIGGER IF NOT EXISTS pi_agent_events_insert INSTEAD OF INSERT ON pi_agent_events BEGIN
                    INSERT INTO pi_events (id, workspace_key, workspace_path, event_type, relative_path, prompt_signature, created_at, payload_json)
                    VALUES (
                        NEW.id,
                        NEW.workspace_id,
                        COALESCE((SELECT root_path FROM pi_workspaces WHERE workspace_id = NEW.workspace_id OR id = NEW.workspace_id LIMIT 1), NEW.workspace_id),
                        NEW.event_type,
                        NEW.relative_path,
                        NEW.prompt_signature,
                        NEW.created_at,
                        COALESCE(NEW.payload_json, json_object(
                            'id', NEW.id,
                            'sessionId', NEW.session_id,
                            'taskId', NEW.task_id,
                            'provider', NEW.provider,
                            'eventType', NEW.event_type,
                            'fileId', NEW.file_id,
                            'symbolId', NEW.symbol_id,
                            'relativePath', NEW.relative_path,
                            'command', NEW.command,
                            'promptTextHash', NEW.prompt_text_hash,
                            'promptSignature', NEW.prompt_signature,
                            'createdAt', NEW.created_at
                        ))
                    );
                END`
            ]
        }
    ];

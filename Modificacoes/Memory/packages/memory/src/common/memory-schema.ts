// *****************************************************************************
// Copyright (C) 2026.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { MemoryMigration, MemorySchema, MemoryTableSchema } from './memory-types';
import { MEMORY_SQLITE_MIGRATIONS, MEMORY_WORKSPACE_ID_KEY_MAPPING_TABLES, MEMORY_WORKSPACE_ID_PATH_MAPPING_TABLES } from './memory-sqlite-migrations';

const column = (name: string, type: 'TEXT' | 'INTEGER' | 'REAL' | 'BLOB' = 'TEXT', options: Partial<MemoryTableSchema['columns'][number]> = {}): MemoryTableSchema['columns'][number] => ({
    name,
    type,
    ...options
});

export const MEMORY_TABLES: MemoryTableSchema[] = ([
    {
        name: 'pi_agent_events',
        columns: [
            column('id', 'TEXT', { primaryKey: true }),
            column('workspace_id'),
            column('session_id'),
            column('task_id'),
            column('provider'),
            column('event_type'),
            column('payload_json'),
            column('file_id'),
            column('symbol_id'),
            column('relative_path'),
            column('command'),
            column('prompt_text_hash'),
            column('prompt_signature'),
            column('created_at')
        ]
    },
    { name: 'pi_benchmark_reports', columns: [column('id', 'TEXT', { primaryKey: true }), column('workspace_path'), column('workspace_id'), column('suite_id'), column('score', 'REAL'), column('created_at'), column('updated_at'), column('payload_json')] },
    { name: 'pi_change_impacts', columns: [column('id', 'TEXT', { primaryKey: true }), column('workspace_path'), column('workspace_id'), column('relative_path'), column('risk_score', 'REAL'), column('created_at'), column('payload_json'), column('updated_at')] },
    { name: 'pi_code_chunks', columns: [column('workspace_key'), column('workspace_id'), column('id'), column('relative_path'), column('language_id'), column('chunk_kind'), column('title'), column('content'), column('content_hash'), column('symbol_name'), column('indexed_at'), column('payload_json'), column('updated_at')] },
    { name: 'pi_context_suggestions', columns: [column('id', 'TEXT', { primaryKey: true }), column('workspace_path'), column('workspace_id'), column('prompt_signature'), column('source_kind'), column('score', 'REAL'), column('created_at'), column('payload_json'), column('updated_at')] },
    { name: 'pi_event_fts', columns: [column('event_type'), column('relative_path'), column('prompt_signature'), column('payload_json')] },
    { name: 'pi_events', columns: [column('id', 'TEXT', { primaryKey: true }), column('workspace_path'), column('workspace_id'), column('event_type'), column('payload_json'), column('relative_path'), column('prompt_signature'), column('created_at')] },
    { name: 'pi_feedback_records', columns: [column('id', 'TEXT', { primaryKey: true }), column('workspace_path'), column('workspace_id'), column('prompt_signature'), column('target_kind'), column('target_id'), column('target_source_kind'), column('target_uri'), column('target_title'), column('feedback'), column('reason'), column('evidence'), column('metadata_json'), column('created_at'), column('resolved_at'), column('payload_json')] },
    { name: 'pi_files', columns: [column('workspace_key'), column('workspace_id'), column('id'), column('relative_path'), column('language_id'), column('content_hash'), column('indexed_at'), column('payload_json'), column('updated_at')] },
    { name: 'pi_graph_snapshots', columns: [column('id', 'TEXT', { primaryKey: true }), column('workspace_path'), column('workspace_id'), column('created_at'), column('content_hash'), column('payload_json'), column('updated_at')] },
    {
        name: 'pi_knowledge_concepts',
        columns: [
            column('id', 'TEXT', { primaryKey: true }),
            column('graph_id'),
            column('workspace_path'),
            column('workspace_id'),
            column('scope'),
            column('concept_type'),
            column('title'),
            column('description'),
            column('source'),
            column('evidence'),
            column('confidence', 'REAL'),
            column('created_at'),
            column('updated_at'),
            column('payload_json')
        ]
    },
    { name: 'pi_knowledge_graphs', columns: [column('id', 'TEXT', { primaryKey: true }), column('workspace_path'), column('workspace_id'), column('scope'), column('title'), column('status'), column('concept_count', 'INTEGER'), column('link_count', 'INTEGER'), column('created_at'), column('updated_at'), column('payload_json')] },
    {
        name: 'pi_knowledge_links',
        columns: [
            column('id', 'TEXT', { primaryKey: true }),
            column('graph_id'),
            column('workspace_path'),
            column('workspace_id'),
            column('scope'),
            column('source_kind'),
            column('source_id'),
            column('target_kind'),
            column('target_id'),
            column('relation_type'),
            column('confidence', 'REAL'),
            column('source'),
            column('evidence'),
            column('created_at'),
            column('updated_at'),
            column('payload_json')
        ]
    },
    { name: 'pi_legacy_memories', columns: [column('workspace_key'), column('workspace_id'), column('id'), column('kind'), column('title'), column('created_at'), column('updated_at'), column('payload_json'), column('row_order', 'INTEGER')] },
    { name: 'pi_memory_fts', columns: [column('title'), column('content'), column('source'), column('payload_json')] },
    { name: 'pi_memory_items', columns: [column('id', 'TEXT', { primaryKey: true }), column('memory_space_id'), column('workspace_path'), column('workspace_id'), column('scope'), column('repository_url'), column('repository_id'), column('session_id'), column('task_id'), column('expires_at'), column('retention_policy'), column('memory_type'), column('title'), column('content'), column('status'), column('stale_status'), column('importance'), column('weight', 'REAL'), column('last_accessed_at'), column('access_count', 'INTEGER'), column('source'), column('superseded_by'), column('supersedes_json'), column('origin_markers_json'), column('created_at'), column('updated_at'), column('accepted_count', 'INTEGER'), column('rejected_count', 'INTEGER'), column('payload_json')] },
    {
        name: 'pi_memory_relations',
        columns: [
            column('id', 'TEXT', { primaryKey: true }),
            column('workspace_path'),
            column('workspace_id'),
            column('scope'),
            column('source_memory_id'),
            column('target_memory_id'),
            column('relation_type'),
            column('confidence', 'REAL'),
            column('source'),
            column('evidence'),
            column('metadata_json'),
            column('created_at'),
            column('updated_at'),
            column('payload_json')
        ]
    },
    { name: 'pi_memory_spaces', columns: [column('id', 'TEXT', { primaryKey: true }), column('workspace_path'), column('workspace_id'), column('scope'), column('repository_url'), column('repository_id'), column('session_id'), column('task_id'), column('retention_policy'), column('metadata_json'), column('created_at'), column('updated_at'), column('payload_json')] },
    { name: 'pi_memory_vectors', columns: [column('id', 'TEXT', { primaryKey: true }), column('memory_id'), column('workspace_path'), column('workspace_id'), column('scope'), column('model_id'), column('dimensions', 'INTEGER'), column('content_hash'), column('vector_json'), column('created_at'), column('updated_at'), column('payload_json')] },
    { name: 'pi_metadata', columns: [column('key', 'TEXT', { primaryKey: true }), column('value'), column('updated_at')] },
    { name: 'pi_migrations', columns: [column('id', 'TEXT', { primaryKey: true }), column('schema_version', 'INTEGER'), column('description'), column('checksum'), column('applied_at')] },
    { name: 'pi_relations', columns: [column('workspace_key'), column('workspace_id'), column('id'), column('source_kind'), column('source_id'), column('target_kind'), column('target_id'), column('relation_type'), column('confidence_score', 'REAL'), column('payload_json'), column('updated_at')] },
    {
        name: 'pi_retrieval_cache',
        columns: [column('id', 'TEXT', { primaryKey: true }), column('workspace_path'), column('workspace_id'), column('query_key'), column('scope_params_json'), column('sources_hash'), column('results_json'), column('created_at'), column('expires_at')],
        indexes: [{
            name: 'pi_retrieval_cache_query_scope_idx',
            columns: ['workspace_path', 'query_key', 'sources_hash'],
            unique: true
        }, {
            name: 'pi_retrieval_cache_workspace_expiry_idx',
            columns: ['workspace_id', 'expires_at']
        }]
    },
    { name: 'pi_skill_candidate_fts', columns: [column('signature'), column('title'), column('payload_json')] },
    { name: 'pi_skill_candidates', columns: [column('id', 'TEXT', { primaryKey: true }), column('workspace_path'), column('workspace_id'), column('signature'), column('title'), column('status'), column('trigger_count', 'INTEGER'), column('rejection_count', 'INTEGER'), column('last_triggered_at'), column('created_at'), column('updated_at'), column('payload_json')] },
    { name: 'pi_skills', columns: [column('workspace_key'), column('workspace_id'), column('id'), column('kind'), column('name'), column('created_at'), column('updated_at'), column('payload_json'), column('row_order', 'INTEGER')] },
    { name: 'pi_symbols', columns: [column('workspace_key'), column('workspace_id'), column('id'), column('file_id'), column('language_id'), column('symbol_kind'), column('name'), column('full_name'), column('payload_json'), column('updated_at')] },
    { name: 'pi_transcript_message_fts', columns: [column('content'), column('origin'), column('role'), column('payload_json')] },
    { name: 'pi_transcript_messages', columns: [column('id', 'TEXT', { primaryKey: true }), column('session_id'), column('workspace_path'), column('workspace_id'), column('scope'), column('origin'), column('role'), column('content'), column('redacted_content'), column('redaction_status'), column('redaction_summary_json'), column('retention_policy'), column('created_at'), column('updated_at'), column('payload_json')] },
    { name: 'pi_transcript_sessions', columns: [column('id', 'TEXT', { primaryKey: true }), column('workspace_path'), column('workspace_id'), column('scope'), column('origin'), column('source'), column('started_at'), column('ended_at'), column('retention_policy'), column('redaction_status'), column('metadata_json'), column('created_at'), column('updated_at'), column('payload_json')] },
    { name: 'pi_workspace_settings', columns: [column('workspace_key'), column('workspace_path'), column('workspace_id'), column('payload_json'), column('updated_at')] },
    { name: 'pi_workspace_snapshots', columns: [column('workspace_key'), column('workspace_path'), column('workspace_id'), column('payload_json'), column('updated_at')] },
    { name: 'pi_workspaces', columns: [column('id', 'TEXT', { primaryKey: true }), column('workspace_id'), column('root_path'), column('repo'), column('branch'), column('head_commit'), column('repository_url'), column('git_branch'), column('git_head_commit'), column('enabled', 'INTEGER'), column('code_graph_enabled', 'INTEGER'), column('memory_enabled', 'INTEGER'), column('chat_learning_enabled', 'INTEGER'), column('skill_suggestions_enabled', 'INTEGER'), column('context_cart_enabled', 'INTEGER'), column('hover_editor_enabled', 'INTEGER'), column('sensitive_local_docs_enabled', 'INTEGER'), column('flags'), column('created_at'), column('updated_at')] }
] as MemoryTableSchema[]).sort((left, right) => left.name.localeCompare(right.name));

const schemaMigrationAliases: MemoryMigration[] = [
    aliasMigration('010_create_knowledge_concepts', '010-memory-knowledge-concepts'),
    aliasMigration('011_create_knowledge_links', '011-memory-knowledge-links'),
    aliasMigration('012_create_memory_relations', '012-memory-relations'),
    aliasMigration('014_create_retrieval_cache', '013-memory-retrieval-cache'),
    aliasMigration('016_create_transcript_storage', '015-memory-transcript-storage'),
    workspaceIdMappingMigration()
].filter((migration): migration is MemoryMigration => !!migration);

export const MEMORY_SCHEMA: MemorySchema = {
    version: 20,
    tables: MEMORY_TABLES,
    migrations: [
        ...MEMORY_SQLITE_MIGRATIONS,
        ...schemaMigrationAliases
    ]
};

function aliasMigration(id: string, sourceId: string): MemoryMigration | undefined {
    const source = MEMORY_SQLITE_MIGRATIONS.find(migration => migration.id === sourceId);
    return source ? { ...source, id } : undefined;
}

function workspaceIdMappingMigration(): MemoryMigration {
    const tables = [...MEMORY_WORKSPACE_ID_PATH_MAPPING_TABLES, ...MEMORY_WORKSPACE_ID_KEY_MAPPING_TABLES];
    return {
        id: '020_add_workspace_id_mapping',
        description: 'Add stable workspace_id mapping for workspace-scoped Memory tables.',
        statements: tables.flatMap(table => [
            `ALTER TABLE ${table} ADD COLUMN workspace_id TEXT;`,
            `UPDATE ${table} SET workspace_id = (SELECT workspace_id FROM pi_workspaces WHERE pi_workspaces.root_path = ${table}.workspace_path OR pi_workspaces.id = ${table}.workspace_key OR pi_workspaces.workspace_id = ${table}.workspace_key LIMIT 1) FROM pi_workspaces;`,
            `CREATE INDEX IF NOT EXISTS idx_${table}_workspace_id ON ${table} (workspace_id);`
        ])
    };
}

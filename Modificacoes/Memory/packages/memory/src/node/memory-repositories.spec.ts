// *****************************************************************************
// Copyright (C) 2026.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { expect } from 'chai';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { LibraryService } from '@cybervinci/library/lib/common/library-service';
import {
    MEMORY_SCHEMA,
    MemoryCodeChunk,
    MemoryKnowledgeConcept,
    MemoryKnowledgeLink,
    MemoryItem
} from '../common';
import * as repositoryExports from './memory-repositories';
import { MemoryJsonStoreRepository } from './memory-repositories';
import { MemoryServiceImpl } from './memory-service';
import type { MemoryStoreData, MemoryStoreRepository } from './memory-repositories';

describe('MemoryJsonStoreRepository', () => {

    it('falls back to JSON code chunk search when workspace sections are unavailable', async () => {
        const repository = new JsonOnlyStoreRepository(await tempStorePath(), {} as LibraryService);
        await repository.replaceCodeChunks('/workspace', [chunkFixture({
            id: 'chunk_alpha',
            title: 'Alpha service',
            content: 'Alpha service performs the important operation.'
        })]);

        const results = await repository.searchCodeChunks('/workspace', 'important', 5);

        expect(results.map(result => result.id)).to.deep.equal(['chunk_alpha']);
    });

    it('treats SQL and FTS metacharacters as search text instead of executable query syntax', async () => {
        const repository = new JsonOnlyStoreRepository(await tempStorePath(), {} as LibraryService);
        await repository.write({
            ...emptyStore(),
            memories: [
                memoryFixture('/workspace', {
                    id: 'mem_alpha',
                    title: 'Alpha memory',
                    content: 'Only the alpha needle should match this record.'
                }),
                memoryFixture('/workspace', {
                    id: 'mem_beta',
                    title: 'Unlinked sample',
                    content: 'Keep this hidden.'
                })
            ],
            codeChunks: {
                [repository.workspaceKey('/workspace')]: [
                    chunkFixture({ id: 'chunk_alpha', title: 'Alpha chunk', content: 'alpha searchable chunk content.' }),
                    chunkFixture({ id: 'chunk_beta', title: 'Beta chunk', content: 'unrelated chunk content.' })
                ]
            }
        });

        const malicious = 'alpha" OR 1=1; DROP TABLE pi_memory_items; -- \0 ../*';
        const memories = await repository.searchMemories('/workspace', malicious, 10);
        const chunks = await repository.searchCodeChunks('/workspace', malicious, 10);

        expect(memories[0].id).to.equal('mem_alpha');
        expect(memories.map(memory => memory.id)).to.include('mem_beta');
        expect(chunks[0].id).to.equal('chunk_alpha');
        expect(chunks.map(chunk => chunk.id)).to.include('chunk_beta');
    });

    it('uses workspace sections when available and maps results back to code chunks', async () => {
        const indexedSections: unknown[] = [];
        const docsService = {
            indexWorkspaceSections: async (request: { sections: unknown[] }) => {
                indexedSections.push(...request.sections);
            },
            searchWorkspaceSections: async () => [{
                id: 'section_alpha',
                workspacePath: '/workspace',
                source: 'memory',
                sourceId: 'file_alpha',
                relativePath: 'alpha.ts',
                languageId: 'typescript',
                sectionKind: 'symbol',
                title: 'Alpha',
                content: 'export class Alpha {}',
                contentHash: 'abc',
                startLine: 1,
                endLine: 1,
                tokenCount: 5,
                indexedAt: '2026-01-01T00:00:00.000Z',
                metadata: {
                    symbolName: 'Alpha'
                },
                snippet: 'export class Alpha {}',
                score: 1
            }]
        } as unknown as LibraryService;
        const repository = new TempStoreRepository(await tempStorePath(), docsService);

        await repository.replaceCodeChunks('/workspace', [chunkFixture({ id: 'chunk_alpha' })]);
        const results = await repository.searchCodeChunks('/workspace', 'Alpha', 5);

        expect(indexedSections).to.have.length(1);
        expect(results[0].id).to.equal('section_alpha');
        expect(results[0].chunkKind).to.equal('symbol');
        expect(results[0].symbolName).to.equal('Alpha');
    });

    it('normalizes older JSON memories with lifecycle defaults on read', async () => {
        const storePath = await tempStorePath();
        await fs.writeFile(storePath, JSON.stringify({
            memories: [{
                id: 'mem_old',
                workspacePath: '/workspace',
                memoryType: 'project_decision',
                title: 'Old memory',
                content: 'Created before lifecycle fields existed.',
                status: 'active',
                staleStatus: 'fresh',
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-02T00:00:00.000Z',
                acceptedCount: 0,
                rejectedCount: 0
            }]
        }, undefined, 2), 'utf8');
        const repository = new TempStoreRepository(storePath, {} as LibraryService);

        const store = await repository.read();

        expect(store.memories[0].importance).to.equal('medium');
        expect(store.memories[0].scope).to.equal('workspace');
        expect(store.memories[0].weight).to.equal(0.6);
        expect(store.memories[0].lastAccessedAt).to.equal('2026-01-02T00:00:00.000Z');
        expect(store.memories[0].accessCount).to.equal(0);
        expect(store.memories[0].repositoryUrl).to.equal(undefined);
        expect(store.memories[0].originMarkers).to.equal(undefined);
    });

    it('redacts secret-like event payloads before persisting JSON store data', async () => {
        const storePath = await tempStorePath();
        const repository = new TempStoreRepository(storePath, {} as LibraryService);
        const secret = 'abcdefghijklmnopqrstuvwxyz123456';

        await repository.write({
            ...emptyStore(),
            events: [{
                id: 'event_secret',
                workspacePath: '/workspace',
                eventType: 'terminal.command',
                payload: `{"command":"deploy","env":"API_KEY=${secret}"}`,
                relativePath: 'scripts/deploy.sh',
                createdAt: '2026-01-01T00:00:00.000Z'
            }]
        });

        const raw = await fs.readFile(storePath, 'utf8');
        const store = await repository.read();

        expect(raw).not.to.contain(secret);
        expect(store.events[0].payload).to.contain('abcdef********3456');
        expect(store.events[0].payload).not.to.contain(secret);
    });

    it('minimizes raw prompt event payloads before persisting JSON store data', async () => {
        const storePath = await tempStorePath();
        const repository = new TempStoreRepository(storePath, {} as LibraryService);
        const secret = 'abcdefghijklmnopqrstuvwxyz123456';

        await repository.write({
            ...emptyStore(),
            settings: {
                [repository.workspaceKey('/workspace')]: {
                    workspacePath: '/workspace',
                    enabled: true,
                    graphEnabled: false,
                    memoryEnabled: false,
                    skillSuggestionsEnabled: false,
                    optIn: { promptSnippets: false },
                    updatedAt: '2026-01-01T00:00:00.000Z'
                }
            },
            events: [{
                id: 'event_prompt',
                workspacePath: '/workspace',
                eventType: 'prompt.submitted',
                payload: JSON.stringify({
                    prompt: `Explain API_KEY=${secret}`,
                    redactedPromptSnippet: `Explain API_KEY=${secret}`,
                    promptTextHash: 'sha256:prompt',
                    promptSignature: 'intent:explain'
                }),
                createdAt: '2026-01-01T00:00:00.000Z'
            }]
        });

        const raw = await fs.readFile(storePath, 'utf8');
        const event = (await repository.read()).events[0];

        expect(raw).not.to.contain(secret);
        expect(raw).not.to.contain('Explain API_KEY');
        expect(event.payload).to.contain('promptTextHash');
        expect(event.payload).not.to.contain('redactedPromptSnippet');
    });

    it('round-trips JSON memory scope, expiration, retention, and supersedence fields', async () => {
        const storePath = await tempStorePath();
        const repository = new TempStoreRepository(storePath, {} as LibraryService);
        const now = '2026-01-01T00:00:00.000Z';
        const memories: MemoryItem[] = [{
            id: 'mem_repository',
            scope: 'repository',
            repositoryUrl: 'https://github.com/acme/project.git',
            repositoryId: 'github.com/acme/project',
            sessionId: 'session_alpha',
            taskId: 'task_alpha',
            expiresAt: '2026-02-01T00:00:00.000Z',
            retentionPolicy: 'ttl',
            memoryType: 'project_decision',
            title: 'Repository memory',
            content: 'Repository scoped memory survives clone path changes.',
            status: 'candidate',
            staleStatus: 'unknown',
            importance: 'high',
            weight: 0.85,
            lastAccessedAt: now,
            accessCount: 2,
            createdAt: now,
            updatedAt: now,
            acceptedCount: 1,
            rejectedCount: 0,
            supersededBy: 'mem_repository_new',
            supersedes: ['mem_workspace'],
            originMarkers: ['portable-package']
        }, {
            id: 'mem_session',
            scope: 'session',
            sessionId: 'session_alpha',
            expiresAt: '2026-01-02T00:00:00.000Z',
            retentionPolicy: 'ttl',
            memoryType: 'manual_note',
            title: 'Session memory',
            content: 'Temporary session memory.',
            status: 'candidate',
            staleStatus: 'unknown',
            importance: 'medium',
            weight: 0.6,
            lastAccessedAt: now,
            accessCount: 0,
            createdAt: now,
            updatedAt: now,
            acceptedCount: 0,
            rejectedCount: 0
        }, {
            id: 'mem_task',
            scope: 'task',
            taskId: 'task_alpha',
            expiresAt: '2026-01-03T00:00:00.000Z',
            retentionPolicy: 'task',
            memoryType: 'manual_note',
            title: 'Task memory',
            content: 'Temporary task memory.',
            status: 'candidate',
            staleStatus: 'unknown',
            importance: 'medium',
            weight: 0.6,
            lastAccessedAt: now,
            accessCount: 0,
            createdAt: now,
            updatedAt: now,
            acceptedCount: 0,
            rejectedCount: 0
        }];

        await repository.write({ ...emptyStore(), memories });

        const persisted = JSON.parse(await fs.readFile(storePath, 'utf8')) as MemoryStoreData;
        const roundTripped = await repository.read();

        expect(persisted.memories.find(memory => memory.id === 'mem_repository')?.repositoryId).to.equal('github.com/acme/project');
        expect(roundTripped.memories.find(memory => memory.id === 'mem_repository')?.supersedes).to.deep.equal(['mem_workspace']);
        expect(roundTripped.memories.find(memory => memory.id === 'mem_repository')?.originMarkers).to.deep.equal(['portable-package']);
        expect(roundTripped.memories.find(memory => memory.id === 'mem_session')?.expiresAt).to.equal('2026-01-02T00:00:00.000Z');
        expect(roundTripped.memories.find(memory => memory.id === 'mem_task')?.retentionPolicy).to.equal('task');
    });

    it('normalizes and lists JSON memory spaces without workspacePath for global scope', async () => {
        const repository = new TempStoreRepository(await tempStorePath(), {} as LibraryService);
        const now = '2026-01-01T00:00:00.000Z';

        await repository.write({
            ...emptyStore(),
            memorySpaces: [{
                id: 'space:global',
                scope: 'global',
                workspacePath: '/workspace-that-must-not-stick',
                metadata: { label: 'Global IDE memory' },
                createdAt: now,
                updatedAt: now
            }, {
                id: 'space:workspace',
                scope: 'workspace',
                workspacePath: '/workspace',
                metadata: { label: 'Workspace memory' },
                createdAt: now,
                updatedAt: '2026-01-02T00:00:00.000Z'
            }]
        });

        const spaces = await repository.listMemorySpaces();
        const globalSpaces = await repository.listMemorySpaces({ scope: 'global' });
        const workspaceSpaces = await repository.listMemorySpaces({ workspacePath: '/workspace' });

        expect(spaces.find(space => space.id === 'space:global')?.workspacePath).to.equal(undefined);
        expect(globalSpaces.map(space => space.id)).to.deep.equal(['space:global']);
        expect(workspaceSpaces.map(space => space.id)).to.deep.equal(['space:workspace']);
    });

    it('keeps expired session and task memories persisted but out of JSON memory search', async () => {
        const repository = new TempStoreRepository(await tempStorePath(), {} as LibraryService);
        const now = '2026-01-01T00:00:00.000Z';
        await repository.write({
            ...emptyStore(),
            memories: [{
                ...memoryFixture('/workspace', {
                    id: 'mem_active',
                    title: 'Active memory',
                    content: 'Normal memory search result.'
                }),
                createdAt: now,
                updatedAt: now
            }, {
                ...memoryFixture('/workspace', {
                    id: 'mem_expired_session',
                    scope: 'session',
                    sessionId: 'session_alpha',
                    expiresAt: '2026-01-01T00:00:00.000Z',
                    retentionPolicy: 'ttl',
                    title: 'Expired session memory',
                    content: 'Normal memory search result.'
                }),
                createdAt: now,
                updatedAt: now
            }, {
                ...memoryFixture('/workspace', {
                    id: 'mem_expired_task',
                    scope: 'task',
                    taskId: 'task_alpha',
                    expiresAt: '2026-01-01T00:00:00.000Z',
                    retentionPolicy: 'task',
                    title: 'Expired task memory',
                    content: 'Normal memory search result.'
                }),
                createdAt: now,
                updatedAt: now
            }]
        });

        const persisted = await repository.read();
        const results = await repository.searchMemories('/workspace', 'normal memory', 10);

        expect(persisted.memories.map(memory => memory.id)).to.include.members(['mem_expired_session', 'mem_expired_task']);
        expect(results.map(memory => memory.id)).to.deep.equal(['mem_active']);
    });
});

describe('Memory SQLite Phase 1 storage contract', () => {

    it('keeps getSchema table names aligned with SQLite runtime migrations', async function () {
        const directory = await tempStoreDirectory();
        const storePath = path.join(directory, 'store.db');
        const repository = createSqliteRepositoryIfAvailable(storePath);
        if (!repository) {
            this.skip();
            return;
        }

        const opened = await (repository as unknown as { openAndCloseDatabase?: () => Promise<boolean> }).openAndCloseDatabase?.();
        expect(opened).to.equal(true);

        const service = new MemoryServiceImpl();
        const schema = await service.getSchema();
        const exposedTables = schema.tables.map(table => table.name).sort();
        const runtimeTables = readMemoryRuntimeTables(repository, storePath);

        expect(exposedTables).to.deep.equal(runtimeTables);
    });

    it('declares migration history, WAL, and generated indices in the shared schema', () => {
        const tableNames = MEMORY_SCHEMA.tables.map(table => table.name);
        const normalizedStatements = MEMORY_SCHEMA.migrations
            .flatMap(migration => migration.statements)
            .map(statement => statement.replace(/\s+/g, ' ').trim().toLowerCase());
        const migrationColumns = MEMORY_SCHEMA.tables
            .find(table => table.name === 'pi_migrations')?.columns.map(column => column.name);
        const expectedIndexNames = MEMORY_SCHEMA.tables.flatMap(table => {
            const indexes = table.indexes ?? table.columns.filter(column => column.indexed).map(column => ({
                name: `idx_${table.name}_${column.name}`
            }));
            return indexes.map(index => index.name);
        });

        expect(tableNames).to.include('pi_migrations');
        expect(migrationColumns).to.include.members(['id', 'schema_version', 'description', 'checksum', 'applied_at']);
        expect(normalizedStatements.some(statement => statement === 'pragma journal_mode = wal;')).to.equal(true);
        expect(normalizedStatements.some(statement => statement === 'pragma foreign_keys = on;')).to.equal(true);
        for (const indexName of expectedIndexNames) {
            expect(normalizedStatements.some(statement => statement.includes(`index if not exists ${indexName.toLowerCase()} on`)), indexName).to.equal(true);
        }
    });

    it('adds memory scope locator columns only in the incremental SQLite migration', () => {
        const repository = createSqliteRepositoryIfAvailable(path.join(os.tmpdir(), 'pi-unused.sqlite')) as unknown as {
            migrations?: Array<{ id: string; statements: string[] }>;
        } | undefined;
        if (!repository?.migrations) {
            return;
        }
        const migrations = repository.migrations;
        const initialStatements = migrations
            .filter(migration => migration.id < '004a-memory-scope-locators')
            .flatMap(migration => migration.statements)
            .map(statement => statement.replace(/\s+/g, ' ').trim().toLowerCase());
        const scopeMigration = migrations.find(migration => migration.id === '004a-memory-scope-locators');
        const memoryColumns = [
            'repository_url',
            'repository_id',
            'session_id',
            'task_id',
            'expires_at',
            'retention_policy',
            'superseded_by',
            'supersedes_json',
            'origin_markers_json'
        ];

        expect(scopeMigration?.statements).to.include.members(memoryColumns.map(column => `ALTER TABLE pi_memory_items ADD COLUMN ${column} TEXT`));
        for (const column of memoryColumns) {
            expect(initialStatements.some(statement => statement.includes(column)), column).to.equal(false);
        }
    });

    it('creates memory spaces only in the incremental SQLite migration', () => {
        const repository = createSqliteRepositoryIfAvailable(path.join(os.tmpdir(), 'pi-unused.sqlite')) as unknown as {
            migrations?: Array<{ id: string; statements: string[] }>;
        } | undefined;
        if (!repository?.migrations) {
            return;
        }
        const migrations = repository.migrations;
        const initialStatements = migrations
            .filter(migration => migration.id < '008-memory-spaces')
            .flatMap(migration => migration.statements)
            .map(statement => statement.replace(/\s+/g, ' ').trim().toLowerCase());
        const memorySpacesMigration = migrations.find(migration => migration.id === '008-memory-spaces');
        const normalizedStatements = memorySpacesMigration?.statements
            .map(statement => statement.replace(/\s+/g, ' ').trim().toLowerCase()) ?? [];

        expect(initialStatements.some(statement => statement.includes('pi_memory_spaces'))).to.equal(false);
        expect(normalizedStatements.some(statement => statement.startsWith('create table if not exists pi_memory_spaces'))).to.equal(true);
        expect(normalizedStatements.some(statement => statement.includes('id text primary key'))).to.equal(true);
        expect(normalizedStatements.some(statement => statement.includes('scope text not null'))).to.equal(true);
        for (const column of ['workspace_path', 'repository_url', 'repository_id', 'session_id', 'task_id', 'retention_policy', 'metadata_json', 'created_at', 'updated_at']) {
            expect(normalizedStatements.some(statement => statement.includes(`${column} text`)), column).to.equal(true);
        }
        for (const indexName of [
            'pi_memory_spaces_scope_idx',
            'pi_memory_spaces_workspace_path_idx',
            'pi_memory_spaces_repository_url_idx',
            'pi_memory_spaces_repository_id_idx',
            'pi_memory_spaces_session_idx',
            'pi_memory_spaces_task_idx',
            'pi_memory_spaces_retention_idx'
        ]) {
            expect(normalizedStatements.some(statement => statement.includes(`index if not exists ${indexName}`)), indexName).to.equal(true);
        }
    });

    it('maps existing memories to default memory spaces in an incremental SQLite migration', () => {
        const repository = createSqliteRepositoryIfAvailable(path.join(os.tmpdir(), 'pi-unused.sqlite')) as unknown as {
            migrations?: Array<{ id: string; statements: string[] }>;
        } | undefined;
        if (!repository?.migrations) {
            return;
        }
        const migrations = repository.migrations;
        const initialStatements = migrations
            .filter(migration => migration.id < '009-memory-default-memory-space-mapping')
            .flatMap(migration => migration.statements)
            .map(statement => statement.replace(/\s+/g, ' ').trim().toLowerCase());
        const mappingMigration = migrations.find(migration => migration.id === '009-memory-default-memory-space-mapping');
        const normalizedStatements = mappingMigration?.statements
            .map(statement => statement.replace(/\s+/g, ' ').trim().toLowerCase()) ?? [];

        expect(initialStatements.some(statement => statement.includes('memory_space_id'))).to.equal(false);
        expect(normalizedStatements).to.include('alter table pi_memory_items add column memory_space_id text');
        expect(normalizedStatements.some(statement => statement.includes('insert or ignore into pi_memory_spaces'))).to.equal(true);
        expect(normalizedStatements.some(statement => statement.includes("when scope = 'global' then 'default:global'"))).to.equal(true);
        expect(normalizedStatements.some(statement => statement.includes("case when scope = 'global' then null else workspace_path end"))).to.equal(true);
        expect(normalizedStatements.some(statement => statement.includes("when scope = 'workspace' then 'default:workspace:' || coalesce(workspace_path, '')"))).to.equal(true);
        expect(normalizedStatements.some(statement => statement.includes("when scope = 'session' then 'default:session:' || coalesce(session_id, '')"))).to.equal(true);
        expect(normalizedStatements.some(statement => statement.includes('update pi_memory_items set memory_space_id'))).to.equal(true);
    });

    it('creates persistent knowledge concepts only in the incremental SQLite migration', () => {
        const repository = createSqliteRepositoryIfAvailable(path.join(os.tmpdir(), 'pi-unused.sqlite')) as unknown as {
            migrations?: Array<{ id: string; statements: string[] }>;
        } | undefined;
        if (!repository?.migrations) {
            return;
        }
        const migrations = repository.migrations;
        const initialStatements = migrations
            .filter(migration => migration.id < '010-memory-knowledge-concepts')
            .flatMap(migration => migration.statements)
            .map(statement => statement.replace(/\s+/g, ' ').trim().toLowerCase());
        const conceptMigration = migrations.find(migration => migration.id === '010-memory-knowledge-concepts');
        const normalizedStatements = conceptMigration?.statements
            .map(statement => statement.replace(/\s+/g, ' ').trim().toLowerCase()) ?? [];

        expect(initialStatements.some(statement => statement.includes('pi_knowledge_concepts'))).to.equal(false);
        expect(normalizedStatements.some(statement => statement.startsWith('create table if not exists pi_knowledge_concepts'))).to.equal(true);
        for (const column of [
            'id text primary key',
            'workspace_key text',
            'workspace_path text',
            'scope text not null',
            'concept_type text not null',
            'title text not null',
            'description text',
            'source text',
            'evidence text',
            'confidence real not null',
            'created_at text not null',
            'updated_at text not null'
        ]) {
            expect(normalizedStatements.some(statement => statement.includes(column)), column).to.equal(true);
        }
        for (const indexName of [
            'pi_knowledge_concepts_workspace_scope_idx',
            'pi_knowledge_concepts_scope_type_idx',
            'pi_knowledge_concepts_title_idx',
            'pi_knowledge_concepts_source_idx',
            'pi_knowledge_concepts_confidence_idx'
        ]) {
            expect(normalizedStatements.some(statement => statement.includes(`index if not exists ${indexName}`)), indexName).to.equal(true);
        }
    });

    it('creates persistent knowledge links only in the incremental SQLite migration', () => {
        const repository = createSqliteRepositoryIfAvailable(path.join(os.tmpdir(), 'pi-unused.sqlite')) as unknown as {
            migrations?: Array<{ id: string; statements: string[] }>;
        } | undefined;
        if (!repository?.migrations) {
            return;
        }
        const migrations = repository.migrations;
        const initialStatements = migrations
            .filter(migration => migration.id < '011-memory-knowledge-links')
            .flatMap(migration => migration.statements)
            .map(statement => statement.replace(/\s+/g, ' ').trim().toLowerCase());
        const linkMigration = migrations.find(migration => migration.id === '011-memory-knowledge-links');
        const normalizedStatements = linkMigration?.statements
            .map(statement => statement.replace(/\s+/g, ' ').trim().toLowerCase()) ?? [];

        expect(initialStatements.some(statement => statement.includes('pi_knowledge_links'))).to.equal(false);
        expect(normalizedStatements.some(statement => statement.startsWith('create table if not exists pi_knowledge_links'))).to.equal(true);
        for (const column of [
            'id text primary key',
            'graph_id text',
            'workspace_key text',
            'workspace_path text',
            'scope text not null',
            'source_kind text not null',
            'source_id text not null',
            'target_kind text not null',
            'target_id text not null',
            'relation_type text not null',
            'confidence real not null',
            'source text',
            'evidence text',
            'created_at text not null',
            'updated_at text not null'
        ]) {
            expect(normalizedStatements.some(statement => statement.includes(column)), column).to.equal(true);
        }
        for (const indexName of [
            'pi_knowledge_links_graph_idx',
            'pi_knowledge_links_workspace_scope_idx',
            'pi_knowledge_links_source_idx',
            'pi_knowledge_links_target_idx',
            'pi_knowledge_links_relation_idx',
            'pi_knowledge_links_origin_idx'
        ]) {
            expect(normalizedStatements.some(statement => statement.includes(`index if not exists ${indexName}`)), indexName).to.equal(true);
        }
    });

    it('creates persistent memory relations only in the incremental SQLite migration', () => {
        const repository = createSqliteRepositoryIfAvailable(path.join(os.tmpdir(), 'pi-unused.sqlite')) as unknown as {
            migrations?: Array<{ id: string; statements: string[] }>;
        } | undefined;
        if (!repository?.migrations) {
            return;
        }
        const migrations = repository.migrations;
        const initialStatements = migrations
            .filter(migration => migration.id < '012-memory-relations')
            .flatMap(migration => migration.statements)
            .map(statement => statement.replace(/\s+/g, ' ').trim().toLowerCase());
        const relationMigration = migrations.find(migration => migration.id === '012-memory-relations');
        const normalizedStatements = relationMigration?.statements
            .map(statement => statement.replace(/\s+/g, ' ').trim().toLowerCase()) ?? [];

        expect(initialStatements.some(statement => statement.includes('pi_memory_relations'))).to.equal(false);
        expect(normalizedStatements.some(statement => statement.startsWith('create table if not exists pi_memory_relations'))).to.equal(true);
        for (const column of [
            'id text primary key',
            'workspace_key text',
            'workspace_path text',
            'scope text not null',
            'source_memory_id text not null',
            'target_memory_id text not null',
            'confidence real not null',
            'source text',
            'evidence text',
            'metadata_json text',
            'created_at text not null',
            'updated_at text not null'
        ]) {
            expect(normalizedStatements.some(statement => statement.includes(column)), column).to.equal(true);
        }
        expect(normalizedStatements.some(statement => statement.includes("relation_type text not null check (relation_type in ('contradicts', 'refines', 'alternative_to', 'superseded_by', 'related_to'))"))).to.equal(true);
        for (const indexName of [
            'pi_memory_relations_workspace_scope_idx',
            'pi_memory_relations_source_idx',
            'pi_memory_relations_target_idx',
            'pi_memory_relations_type_idx',
            'pi_memory_relations_origin_idx'
        ]) {
            expect(normalizedStatements.some(statement => statement.includes(`index if not exists ${indexName}`)), indexName).to.equal(true);
        }
    });

    it('creates retrieval cache only in the incremental SQLite migration', () => {
        const repository = createSqliteRepositoryIfAvailable(path.join(os.tmpdir(), 'pi-unused.sqlite')) as unknown as {
            migrations?: Array<{ id: string; statements: string[] }>;
        } | undefined;
        if (!repository?.migrations) {
            return;
        }
        const migrations = repository.migrations;
        const initialStatements = migrations
            .filter(migration => migration.id < '013-memory-retrieval-cache')
            .flatMap(migration => migration.statements)
            .map(statement => statement.replace(/\s+/g, ' ').trim().toLowerCase());
        const cacheMigration = migrations.find(migration => migration.id === '013-memory-retrieval-cache');
        const normalizedStatements = cacheMigration?.statements
            .map(statement => statement.replace(/\s+/g, ' ').trim().toLowerCase()) ?? [];

        expect(initialStatements.some(statement => statement.includes('pi_retrieval_cache'))).to.equal(false);
        expect(normalizedStatements.some(statement => statement.startsWith('create table if not exists pi_retrieval_cache'))).to.equal(true);
        for (const column of [
            'id text primary key',
            'workspace_key text not null',
            'workspace_path text not null',
            'query_key text not null',
            'scope_params_json text not null',
            'sources_hash text not null',
            'results_json text not null',
            'created_at text not null',
            'expires_at text not null'
        ]) {
            expect(normalizedStatements.some(statement => statement.includes(column)), column).to.equal(true);
        }
        expect(normalizedStatements.some(statement => statement.includes('unique index if not exists pi_retrieval_cache_query_scope_idx'))).to.equal(true);
        expect(normalizedStatements.some(statement => statement.includes('index if not exists pi_retrieval_cache_workspace_expiry_idx'))).to.equal(true);
    });

    it('creates transcript sessions and messages only in the incremental SQLite migration', () => {
        const repository = createSqliteRepositoryIfAvailable(path.join(os.tmpdir(), 'pi-unused.sqlite')) as unknown as {
            migrations?: Array<{ id: string; statements: string[] }>;
        } | undefined;
        if (!repository?.migrations) {
            return;
        }
        const migrations = repository.migrations;
        const initialStatements = migrations
            .filter(migration => migration.id < '015-memory-transcript-storage')
            .flatMap(migration => migration.statements)
            .map(statement => statement.replace(/\s+/g, ' ').trim().toLowerCase());
        const transcriptMigration = migrations.find(migration => migration.id === '015-memory-transcript-storage');
        const normalizedStatements = transcriptMigration?.statements
            .map(statement => statement.replace(/\s+/g, ' ').trim().toLowerCase()) ?? [];

        expect(initialStatements.some(statement => statement.includes('pi_transcript_sessions'))).to.equal(false);
        expect(initialStatements.some(statement => statement.includes('pi_transcript_messages'))).to.equal(false);
        expect(normalizedStatements.some(statement => statement.startsWith('create table if not exists pi_transcript_sessions'))).to.equal(true);
        expect(normalizedStatements.some(statement => statement.startsWith('create table if not exists pi_transcript_messages'))).to.equal(true);
        for (const column of [
            'workspace_key text',
            'workspace_path text',
            'scope text not null',
            'origin text not null',
            'retention_policy text',
            'redaction_status text not null',
            'created_at text not null',
            'updated_at text not null'
        ]) {
            expect(normalizedStatements.some(statement => statement.includes(column)), column).to.equal(true);
        }
        for (const column of [
            'session_id text not null',
            'role text not null',
            'content text not null',
            'redacted_content text',
            'redaction_summary_json text'
        ]) {
            expect(normalizedStatements.some(statement => statement.includes(column)), column).to.equal(true);
        }
        for (const indexName of [
            'pi_transcript_sessions_workspace_scope_idx',
            'pi_transcript_sessions_origin_idx',
            'pi_transcript_sessions_retention_idx',
            'pi_transcript_messages_session_created_idx',
            'pi_transcript_messages_workspace_scope_idx',
            'pi_transcript_messages_origin_role_idx',
            'pi_transcript_messages_retention_idx'
        ]) {
            expect(normalizedStatements.some(statement => statement.includes(`index if not exists ${indexName}`)), indexName).to.equal(true);
        }
        expect(normalizedStatements.some(statement => statement.startsWith('create virtual table if not exists pi_transcript_message_fts'))).to.equal(true);
        expect(normalizedStatements.some(statement => statement.includes('create trigger if not exists pi_transcript_messages_ai'))).to.equal(true);
        expect(normalizedStatements.some(statement => statement.includes('create trigger if not exists pi_transcript_messages_ad'))).to.equal(true);
        expect(normalizedStatements.some(statement => statement.includes('create trigger if not exists pi_transcript_messages_au'))).to.equal(true);
    });

    it('creates workspace identity and opt-in flags only in the incremental SQLite migration', () => {
        const repository = createSqliteRepositoryIfAvailable(path.join(os.tmpdir(), 'pi-unused.sqlite')) as unknown as {
            migrations?: Array<{ id: string; statements: string[] }>;
        } | undefined;
        if (!repository?.migrations) {
            return;
        }
        const migrations = repository.migrations;
        const initialStatements = migrations
            .filter(migration => migration.id < '017-memory-workspaces')
            .flatMap(migration => migration.statements)
            .map(statement => statement.replace(/\s+/g, ' ').trim().toLowerCase());
        const workspaceMigration = migrations.find(migration => migration.id === '017-memory-workspaces');
        const normalizedStatements = workspaceMigration?.statements
            .map(statement => statement.replace(/\s+/g, ' ').trim().toLowerCase()) ?? [];

        expect(initialStatements.some(statement => statement.includes('pi_workspaces'))).to.equal(false);
        expect(normalizedStatements.some(statement => statement.startsWith('create table if not exists pi_workspaces'))).to.equal(true);
        for (const column of [
            'id text primary key',
            'workspace_id text not null',
            'root_path text not null',
            'repository_url text',
            'git_branch text',
            'git_head_commit text',
            'enabled integer not null',
            'code_graph_enabled integer not null',
            'memory_enabled integer not null',
            'chat_learning_enabled integer not null',
            'skill_suggestions_enabled integer not null',
            'context_cart_enabled integer not null',
            'hover_editor_enabled integer not null',
            'sensitive_local_docs_enabled integer not null',
            'flags text not null',
            'created_at text not null',
            'updated_at text not null'
        ]) {
            expect(normalizedStatements.some(statement => statement.includes(column)), column).to.equal(true);
        }
        for (const indexName of [
            'idx_pi_workspaces_workspace_id',
            'idx_pi_workspaces_root_path',
            'idx_pi_workspaces_repository_url',
            'idx_pi_workspaces_git_branch',
            'idx_pi_workspaces_git_head_commit',
            'idx_pi_workspaces_updated_at'
        ]) {
            expect(normalizedStatements.some(statement => statement.includes(`index if not exists ${indexName}`)), indexName).to.equal(true);
        }
    });

    it('migrates legacy workspace settings into pi_workspaces while preserving workspace_key', async function () {
        const directory = await tempStoreDirectory();
        const workspacePath = path.join(directory, 'workspace');
        const storePath = path.join(directory, 'store.db');
        const repository = createSqliteRepositoryIfAvailable(storePath);
        if (!repository) {
            this.skip();
            return;
        }

        createLegacyWorkspaceSettingsDatabase(repository, storePath, workspacePath);
        const opened = await (repository as unknown as { openAndCloseDatabase?: () => Promise<boolean> }).openAndCloseDatabase?.();
        expect(opened).to.equal(true);

        const key = repository.workspaceKey(workspacePath);
        const rows = readSqliteWorkspaces(repository, storePath);
        expect(rows).to.have.length(1);
        expect(rows[0].id).to.equal(key);
        expect(rows[0].workspace_id).to.equal(key);
        expect(rows[0].root_path).to.equal(workspacePath);
        expect(rows[0].enabled).to.equal(1);
        expect(rows[0].code_graph_enabled).to.equal(1);
        expect(rows[0].memory_enabled).to.equal(0);
        expect(rows[0].chat_learning_enabled).to.equal(1);
        expect(rows[0].skill_suggestions_enabled).to.equal(1);
        expect(rows[0].context_cart_enabled).to.equal(1);
        expect(rows[0].hover_editor_enabled).to.equal(1);
        expect(rows[0].sensitive_local_docs_enabled).to.equal(1);
        expect(JSON.parse(String(rows[0].flags))).to.deep.include({
            source: 'pi_workspace_settings',
            migratedFromWorkspaceKey: key
        });
    });

    it('exposes pi_events through the pi_agent_events compatibility contract', async function () {
        const directory = await tempStoreDirectory();
        const workspacePath = path.join(directory, 'workspace');
        const storePath = path.join(directory, 'store.db');
        const repository = createSqliteRepositoryIfAvailable(storePath);
        if (!repository) {
            this.skip();
            return;
        }

        await repository.write({
            ...emptyStore(),
            events: [{
                id: 'event_alpha',
                workspacePath,
                eventType: 'prompt.submitted',
                relativePath: 'src/alpha.ts',
                promptSignature: 'sig_alpha',
                createdAt: '2026-05-20T00:00:00.000Z',
                sessionId: 'session_alpha',
                taskId: 'task_alpha',
                provider: 'local',
                fileId: 'file_alpha',
                symbolId: 'symbol_alpha',
                command: 'test',
                promptTextHash: 'hash_alpha'
            } as MemoryStoreData['events'][number]]
        });

        const key = repository.workspaceKey(workspacePath);
        const rows = readSqliteAgentEvents(repository, storePath);
        expect(rows).to.have.length(1);
        expect(rows[0]).to.deep.include({
            id: 'event_alpha',
            workspace_id: key,
            session_id: 'session_alpha',
            task_id: 'task_alpha',
            provider: 'local',
            event_type: 'prompt.submitted',
            file_id: 'file_alpha',
            symbol_id: 'symbol_alpha',
            relative_path: 'src/alpha.ts',
            command: 'test',
            prompt_text_hash: 'hash_alpha',
            prompt_signature: 'sig_alpha',
            created_at: '2026-05-20T00:00:00.000Z'
        });
    });

    it('migrates legacy store.json data when MemorySqliteStoreRepository is available', async function () {
        const directory = await tempStoreDirectory();
        const workspacePath = path.join(directory, 'workspace');
        const legacyStore = storeFixture(workspacePath);
        await fs.writeFile(path.join(directory, 'store.json'), `${JSON.stringify(legacyStore, undefined, 2)}\n`, 'utf8');
        const repository = createSqliteRepositoryIfAvailable(path.join(directory, 'store.db'));
        if (!repository) {
            this.skip();
            return;
        }

        const migrated = await repository.read();
        const key = repository.workspaceKey(workspacePath);

        expectStoreFields(migrated);
        expect(migrated.settings[key].workspacePath).to.equal(workspacePath);
        expect(migrated.codeChunks[key].map(chunk => chunk.id)).to.deep.equal(['chunk_alpha']);
        expect(migrated.memories.map(memory => memory.id)).to.include.members(['mem_global', 'mem_workspace']);
        expect(migrated.memories.find(memory => memory.id === 'mem_global')?.workspacePath).to.equal(undefined);
        expect(migrated.memories.find(memory => memory.id === 'mem_global')?.memorySpaceId).to.equal('default:global');
        expect(migrated.memories.find(memory => memory.id === 'mem_workspace')?.memorySpaceId).to.equal(`default:workspace:${workspacePath}`);
        expect(migrated.memorySpaces.find(space => space.id === 'default:global')?.workspacePath).to.equal(undefined);
        expect(migrated.memorySpaces.map(space => space.id)).to.include.members([
            'default:global',
            `default:workspace:${workspacePath}`,
            'default:repository:github.com/acme/project',
            `custom:workspace:${workspacePath}`
        ]);
        expect(migrated.events.map(event => event.id)).to.deep.equal(['event_alpha']);
    });

    it('round-trips read/write/search data through MemorySqliteStoreRepository when available', async function () {
        const directory = await tempStoreDirectory();
        const workspacePath = path.join(directory, 'workspace');
        const storePath = path.join(directory, 'store.db');
        const repository = createSqliteRepositoryIfAvailable(storePath);
        if (!repository) {
            this.skip();
            return;
        }

        const store = storeFixture(workspacePath);
        await repository.write(store);

        const key = repository.workspaceKey(workspacePath);
        const roundTripped = await repository.read();
        const searchResults = await repository.searchCodeChunks(workspacePath, 'sqlite migration', 5);
        const memoryResults = await repository.searchMemories?.(workspacePath, '', 5) ?? [];
        const exportCompatible = JSON.parse(JSON.stringify(roundTripped)) as MemoryStoreData;

        expectStoreFields(roundTripped);
        expectStoreFields(exportCompatible);
        expect(roundTripped.files[key].map(file => file.id)).to.deep.equal(['file_alpha']);
        expect(roundTripped.symbols[key].map(symbol => symbol.id)).to.deep.equal(['symbol_alpha']);
        expect(roundTripped.relations[key].map(relation => relation.id)).to.deep.equal(['relation_alpha']);
        expect(roundTripped.graphSnapshots.map(snapshot => snapshot.id)).to.deep.equal(['graph_alpha']);
        expect(roundTripped.contextSuggestions.map(suggestion => suggestion.id)).to.deep.equal(['suggestion_alpha']);
        expect(roundTripped.memories.find(memory => memory.id === 'mem_workspace')?.importance).to.equal('high');
        expect(roundTripped.memories.find(memory => memory.id === 'mem_global')?.memorySpaceId).to.equal('default:global');
        expect(roundTripped.memories.find(memory => memory.id === 'mem_global')?.workspacePath).to.equal(undefined);
        expect(roundTripped.memories.find(memory => memory.id === 'mem_workspace')?.memorySpaceId).to.equal(`default:workspace:${workspacePath}`);
        expect(roundTripped.memories.find(memory => memory.id === 'mem_workspace')?.accessCount).to.equal(1);
        expect(roundTripped.memories.find(memory => memory.id === 'mem_repository')?.repositoryId).to.equal('github.com/acme/project');
        expect(roundTripped.memories.find(memory => memory.id === 'mem_repository')?.memorySpaceId).to.equal('default:repository:github.com/acme/project');
        expect(roundTripped.memories.find(memory => memory.id === 'mem_repository')?.supersedes).to.deep.equal(['mem_workspace']);
        expect(roundTripped.memorySpaces.map(space => space.id)).to.include.members([
            'default:global',
            `default:workspace:${workspacePath}`,
            'default:repository:github.com/acme/project',
            `custom:workspace:${workspacePath}`
        ]);
        expect(roundTripped.memoryVectors.map(vector => vector.memoryId)).to.deep.equal(['mem_workspace']);
        expect(roundTripped.knowledgeGraphs.map(graph => graph.id)).to.deep.equal(['kg_alpha']);
        expect(roundTripped.knowledgeGraphs[0].concepts.map(concept => concept.id)).to.deep.equal(['kg_concept_alpha']);
        expect(roundTripped.knowledgeGraphs[0].links.map(link => link.id)).to.deep.equal(['kg_link_alpha']);
        expect(readSqliteKnowledgeConcepts(repository, storePath).map(concept => concept.id)).to.deep.equal(['kg_concept_alpha']);
        expect(readSqliteKnowledgeLinks(repository, storePath).map(link => link.id)).to.deep.equal(['kg_link_alpha']);
        expect(roundTripped.skillCandidates.map(candidate => candidate.id)).to.deep.equal(['skill_candidate_alpha']);
        expect(roundTripped.feedbackRecords.map(record => record.id)).to.deep.equal(['feedback_alpha']);
        expect(searchResults.map(chunk => chunk.id)).to.deep.equal(['chunk_alpha']);
        expect(memoryResults.map(memory => memory.id)).to.deep.equal(['mem_workspace', 'mem_global', 'mem_repository']);
    });

    it('treats SQL, FTS, null-byte, unicode, and large search payloads as data in SQLite when available', async function () {
        const directory = await tempStoreDirectory();
        const workspacePath = path.join(directory, 'workspace');
        const storePath = path.join(directory, 'store.db');
        const repository = createSqliteRepositoryIfAvailable(storePath);
        if (!repository?.searchMemories) {
            this.skip();
            return;
        }

        await repository.write({
            ...emptyStore(),
            memories: [
                memoryFixture(workspacePath, {
                    id: 'mem_alpha',
                    title: 'Alpha unicode boundary',
                    content: 'Alpha needle near unicode cafe security notes.'
                }),
                memoryFixture(workspacePath, {
                    id: 'mem_beta',
                    title: 'Beta record',
                    content: 'Unrelated memory that must survive hostile queries.'
                })
            ],
            codeChunks: {
                [repository.workspaceKey(workspacePath)]: [
                    chunkFixture({ id: 'chunk_alpha', title: 'Alpha unicode chunk', content: 'Alpha needle near unicode cafe code.' }),
                    chunkFixture({ id: 'chunk_beta', title: 'Beta chunk', content: 'Unrelated code chunk.' })
                ]
            }
        });

        const hostileQuery = [
            'alpha',
            '" OR 1=1; DROP TABLE pi_memory_items; --',
            '\0',
            '../outside',
            'café',
            '🔐',
            'x'.repeat(128 * 1024)
        ].join(' ');
        const memories = await repository.searchMemories(workspacePath, hostileQuery, 10);
        const chunks = await repository.searchCodeChunks(workspacePath, hostileQuery, 10);
        const afterHostileSearch = await repository.read();

        expect(memories.map(memory => memory.id)).to.deep.equal(['mem_alpha']);
        expect(chunks[0]?.id).to.equal('chunk_alpha');
        expect(afterHostileSearch.memories.map(memory => memory.id)).to.include.members(['mem_alpha', 'mem_beta']);
        expect(afterHostileSearch.codeChunks[repository.workspaceKey(workspacePath)].map(chunk => chunk.id)).to.include.members(['chunk_alpha', 'chunk_beta']);
    });

    it('persists retrieval cache entries and invalidates them when source data changes', async function () {
        const directory = await tempStoreDirectory();
        const workspacePath = path.join(directory, 'workspace');
        const repository = createSqliteRepositoryIfAvailable(path.join(directory, 'store.db'));
        if (!repository?.getRetrievalCache || !repository.setRetrievalCache || !repository.retrievalSourcesHash) {
            this.skip();
            return;
        }

        await repository.write(storeFixture(workspacePath));
        const sourcesHash = await repository.retrievalSourcesHash(workspacePath);
        await repository.setRetrievalCache({
            id: 'cache_alpha',
            workspacePath,
            queryKey: 'query_alpha',
            scopeParams: {
                workspacePath,
                sourceKinds: ['project-memory'],
                limit: 3,
                repositoryId: 'github.com/acme/project'
            },
            sourcesHash,
            results: [{
                id: 'mem_workspace',
                sourceKind: 'project-memory',
                title: 'Project storage',
                snippet: 'SQLite-backed storage guidance.',
                score: 0.91,
                evidence: 'pi_memory_items'
            }],
            createdAt: '2026-01-01T00:00:00.000Z',
            expiresAt: '2999-01-01T00:00:00.000Z'
        });

        expect((await repository.getRetrievalCache('query_alpha', workspacePath, sourcesHash))?.results.map(result => result.id)).to.deep.equal(['mem_workspace']);

        await repository.write({
            ...storeFixture(workspacePath),
            codeChunks: {
                [repository.workspaceKey(workspacePath)]: [
                    ...storeFixture(workspacePath).codeChunks[repository.workspaceKey(workspacePath)],
                    {
                        ...storeFixture(workspacePath).codeChunks[repository.workspaceKey(workspacePath)][0],
                        id: 'chunk_beta',
                        title: 'Changed retrieval source',
                        indexedAt: '2026-02-01T00:00:00.000Z'
                    }
                ]
            }
        });
        const changedSourcesHash = await repository.retrievalSourcesHash(workspacePath);

        expect(changedSourcesHash).not.to.equal(sourcesHash);
        expect(await repository.getRetrievalCache('query_alpha', workspacePath, sourcesHash)).to.equal(undefined);
    });

    it('reads normalized SQLite knowledge rows when legacy payloads do not carry graph ids', async function () {
        const directory = await tempStoreDirectory();
        const workspacePath = path.join(directory, 'workspace');
        const storePath = path.join(directory, 'store.db');
        const repository = createSqliteRepositoryIfAvailable(storePath);
        if (!repository) {
            this.skip();
            return;
        }

        await repository.write(storeFixture(workspacePath));
        rewriteSqliteKnowledgePayloads(repository, storePath, concept => {
            const { graphId, ...legacyConcept } = concept;
            return legacyConcept;
        }, link => {
            const { graphId, metadata, ...legacyLink } = link;
            return {
                ...legacyLink,
                metadata: {
                    sourceKind: metadata?.sourceKind ?? 'knowledge-concept',
                    targetKind: metadata?.targetKind ?? 'memory',
                    source: metadata?.source ?? 'legacy-payload'
                }
            };
        });

        const roundTripped = await repository.read();
        const graph = roundTripped.knowledgeGraphs[0];

        expect(graph.id).to.equal('kg_alpha');
        expect(graph.concepts.map(concept => concept.graphId)).to.deep.equal(['kg_alpha']);
        expect(graph.links.map(link => link.graphId)).to.deep.equal(['kg_alpha']);
        expect(graph.links[0].metadata?.targetKind).to.equal('memory');
        expect(graph.links[0].metadata?.source).to.equal('test-fixture');
    });

    it('associates SQLite memories with explicit memory spaces and lists the new spaces when available', async function () {
        const directory = await tempStoreDirectory();
        const workspacePath = path.join(directory, 'workspace');
        const repository = createSqliteRepositoryIfAvailable(path.join(directory, 'store.db'));
        if (!repository?.listMemorySpaces) {
            this.skip();
            return;
        }
        const now = '2026-01-01T00:00:00.000Z';
        const memorySpaceId = `space:workspace:${workspacePath}`;

        await repository.write({
            ...emptyStore(),
            memories: [{
                ...memoryFixture(workspacePath, {
                    id: 'mem_custom_space',
                    memorySpaceId,
                    title: 'Custom space memory',
                    content: 'Memory associated to an explicit space.'
                }),
                createdAt: now,
                updatedAt: now
            }],
            memorySpaces: [{
                id: memorySpaceId,
                scope: 'workspace',
                workspacePath,
                retentionPolicy: 'manual',
                metadata: { label: 'Reviewed workspace space' },
                createdAt: now,
                updatedAt: now
            }]
        });

        const roundTripped = await repository.read();
        const workspaceSpaces = await repository.listMemorySpaces({ workspacePath });

        expect(roundTripped.memories.find(memory => memory.id === 'mem_custom_space')?.memorySpaceId).to.equal(memorySpaceId);
        expect(workspaceSpaces.map(space => space.id)).to.deep.equal([memorySpaceId]);
        expect(workspaceSpaces[0].metadata?.label).to.equal('Reviewed workspace space');
    });

    it('creates, updates, lists, and resolves SQLite memory spaces by scoped locator when available', async function () {
        const directory = await tempStoreDirectory();
        const workspacePath = path.join(directory, 'workspace');
        const repository = createSqliteRepositoryIfAvailable(path.join(directory, 'store.db'));
        if (!repository?.upsertMemorySpace || !repository.listMemorySpaces || !repository.resolveMemorySpace) {
            this.skip();
            return;
        }
        const now = '2026-01-01T00:00:00.000Z';

        await repository.upsertMemorySpace({
            id: `space:workspace:${workspacePath}`,
            scope: 'workspace',
            workspacePath,
            retentionPolicy: 'manual',
            metadata: { label: 'Workspace' },
            createdAt: now,
            updatedAt: now
        });
        await repository.upsertMemorySpace({
            id: 'space:repository:github.com/acme/project',
            scope: 'repository',
            repositoryUrl: 'https://github.com/acme/project.git',
            repositoryId: 'github.com/acme/project',
            retentionPolicy: 'permanent',
            metadata: { label: 'Repository v2' },
            createdAt: now,
            updatedAt: '2026-01-02T00:00:00.000Z'
        });

        const workspaceSpaces = await repository.listMemorySpaces({ workspacePath });
        const repositorySpace = await repository.resolveMemorySpace({ scope: 'repository', repositoryId: 'github.com/acme/project' });
        const updatedRepositorySpace = await repository.upsertMemorySpace({
            ...repositorySpace!,
            metadata: { label: 'Repository updated' },
            updatedAt: '2026-01-03T00:00:00.000Z'
        });

        expect(workspaceSpaces.map(space => space.id)).to.deep.equal([`space:workspace:${workspacePath}`]);
        expect(repositorySpace?.id).to.equal('space:repository:github.com/acme/project');
        expect(updatedRepositorySpace.metadata?.label).to.equal('Repository updated');
        expect((await repository.listMemorySpaces({ repositoryId: 'github.com/acme/project' }))[0].metadata?.label).to.equal('Repository updated');
    });
});

class TempStoreRepository extends MemoryJsonStoreRepository {

    constructor(protected readonly storePath: string, libraryService: LibraryService) {
        super(libraryService);
    }

    override async getStorePath(): Promise<string> {
        return this.storePath;
    }
}

class JsonOnlyStoreRepository extends TempStoreRepository {

    protected override getSqliteModule(): undefined {
        return undefined;
    }
}

async function tempStorePath(): Promise<string> {
    const directory = await tempStoreDirectory();
    return path.join(directory, 'store.json');
}

async function tempStoreDirectory(): Promise<string> {
    return fs.mkdtemp(path.join(os.tmpdir(), 'pi-store-'));
}

function chunkFixture(partial: Partial<MemoryCodeChunk>): MemoryCodeChunk {
    return {
        id: 'chunk',
        workspacePath: '/workspace',
        fileId: 'file_alpha',
        relativePath: 'alpha.ts',
        languageId: 'typescript',
        chunkKind: 'text-block',
        title: 'Alpha',
        content: 'Alpha content long enough to index.',
        contentHash: 'hash',
        startLine: 1,
        endLine: 1,
        estimatedTokens: 8,
        indexedAt: '2026-01-01T00:00:00.000Z',
        ...partial
    };
}

function createSqliteRepositoryIfAvailable(storePath: string): MemoryStoreRepository | undefined {
    const SqliteRepository = (repositoryExports as {
        MemorySqliteStoreRepository?: new (...args: unknown[]) => MemoryStoreRepository;
    }).MemorySqliteStoreRepository;
    if (!SqliteRepository) {
        return undefined;
    }
    const constructors: Array<() => MemoryStoreRepository> = [
        () => new SqliteRepository(undefined as unknown as LibraryService),
        () => new SqliteRepository()
    ];
    for (const instantiate of constructors) {
        try {
            const repository = instantiate();
            (repository as { getStorePath: () => Promise<string> }).getStorePath = async () => storePath;
            return repository;
        } catch {
            // Try the next constructor shape used by the implementation branch.
        }
    }
    throw new Error('MemorySqliteStoreRepository is exported but could not be constructed for tests.');
}

function readSqliteKnowledgeLinks(repository: MemoryStoreRepository | undefined, storePath: string): Array<Record<string, unknown>> {
    const sqliteModule = (repository as unknown as { getSqliteModule?: () => { DatabaseSync: new (databasePath: string, options?: { readOnly?: boolean }) => {
        prepare(sql: string): { all(): unknown[] };
        close(): void;
    } } | undefined }).getSqliteModule?.();
    if (!sqliteModule) {
        return [];
    }
    const database = new sqliteModule.DatabaseSync(storePath, { readOnly: true });
    try {
        return database.prepare('SELECT id, graph_id, source_kind, source_id, target_kind, target_id, relation_type, confidence, source, evidence FROM pi_knowledge_links ORDER BY id').all() as Array<Record<string, unknown>>;
    } finally {
        database.close();
    }
}

function createLegacyWorkspaceSettingsDatabase(repository: MemoryStoreRepository, storePath: string, workspacePath: string): void {
    const sqliteModule = (repository as unknown as { getSqliteModule?: () => { DatabaseSync: new (databasePath: string) => {
        exec(sql: string): void;
        prepare(sql: string): { run(...params: unknown[]): void };
        close(): void;
    } } | undefined }).getSqliteModule?.();
    const migrations = (repository as unknown as { migrations?: Array<{ id: string; description: string; statements: string[] }> }).migrations;
    if (!sqliteModule || !migrations) {
        return;
    }
    const database = new sqliteModule.DatabaseSync(storePath);
    try {
        database.exec(`CREATE TABLE IF NOT EXISTS pi_migrations (
            id TEXT PRIMARY KEY,
            schema_version INTEGER NOT NULL,
            description TEXT NOT NULL,
            checksum TEXT NOT NULL,
            applied_at TEXT NOT NULL
        )`);
        database.exec(`CREATE TABLE IF NOT EXISTS pi_metadata (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )`);
        database.exec(`CREATE TABLE IF NOT EXISTS pi_workspace_settings (
            workspace_key TEXT PRIMARY KEY,
            workspace_path TEXT NOT NULL,
            payload_json TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )`);
        const appliedAt = '2026-01-01T00:00:00.000Z';
        const insertMigration = database.prepare('INSERT INTO pi_migrations (id, schema_version, description, checksum, applied_at) VALUES (?, ?, ?, ?, ?)');
        for (const migration of migrations.filter(candidate => candidate.id < '017-memory-workspaces')) {
            insertMigration.run(migration.id, Number(migration.id.match(/^\d+/)?.[0] ?? '1'), migration.description, 'legacy-test', appliedAt);
        }
        const workspaceKey = path.resolve(workspacePath).toLowerCase();
        database.prepare('INSERT INTO pi_workspace_settings (workspace_key, workspace_path, payload_json, updated_at) VALUES (?, ?, ?, ?)').run(
            workspaceKey,
            workspacePath,
            JSON.stringify({
                workspacePath,
                enabled: true,
                graphEnabled: true,
                memoryEnabled: true,
                skillSuggestionsEnabled: false,
                chatLearningEnabled: true,
                editorHoverEnabled: false,
                repositoryUrl: 'https://github.com/acme/project',
                repositoryId: 'github.com/acme/project',
                gitBranch: 'main',
                gitHeadCommit: 'abc123',
                createdAt: '2026-01-01T00:00:00.000Z',
                optIn: {
                    projectMemory: false,
                    skills: true,
                    contextCart: true,
                    editorHover: true,
                    pdfDocuments: true
                }
            }),
            '2026-01-02T00:00:00.000Z'
        );
    } finally {
        database.close();
    }
}

function readSqliteWorkspaces(repository: MemoryStoreRepository | undefined, storePath: string): Array<Record<string, unknown>> {
    const sqliteModule = (repository as unknown as { getSqliteModule?: () => { DatabaseSync: new (databasePath: string, options?: { readOnly?: boolean }) => {
        prepare(sql: string): { all(): unknown[] };
        close(): void;
    } } | undefined }).getSqliteModule?.();
    if (!sqliteModule) {
        return [];
    }
    const database = new sqliteModule.DatabaseSync(storePath, { readOnly: true });
    try {
        return database.prepare('SELECT * FROM pi_workspaces ORDER BY id').all() as Array<Record<string, unknown>>;
    } finally {
        database.close();
    }
}

function readMemoryRuntimeTables(repository: MemoryStoreRepository | undefined, storePath: string): string[] {
    const sqliteModule = (repository as unknown as { getSqliteModule?: () => { DatabaseSync: new (databasePath: string, options?: { readOnly?: boolean }) => {
        prepare(sql: string): { all(): unknown[] };
        close(): void;
    } } | undefined }).getSqliteModule?.();
    if (!sqliteModule) {
        return [];
    }
    const database = new sqliteModule.DatabaseSync(storePath, { readOnly: true });
    try {
        const rows = database.prepare([
            'SELECT name FROM sqlite_schema',
            "WHERE type IN ('table', 'view')",
            "AND name LIKE 'pi_%'",
            "AND name NOT LIKE 'pi\\_%\\_fts\\_%' ESCAPE '\\'",
            'ORDER BY name'
        ].join(' ')).all() as Array<Record<string, unknown>>;
        return rows.map(row => String(row.name));
    } finally {
        database.close();
    }
}

function rewriteSqliteKnowledgePayloads(
    repository: MemoryStoreRepository | undefined,
    storePath: string,
    conceptPayload: (concept: MemoryKnowledgeConcept) => unknown,
    linkPayload: (link: MemoryKnowledgeLink) => unknown
): void {
    const sqliteModule = (repository as unknown as { getSqliteModule?: () => { DatabaseSync: new (databasePath: string) => {
        prepare(sql: string): { all(): unknown[]; run(...params: unknown[]): void };
        close(): void;
    } } | undefined }).getSqliteModule?.();
    if (!sqliteModule) {
        return;
    }
    const database = new sqliteModule.DatabaseSync(storePath);
    try {
        const conceptRows = database.prepare('SELECT id, payload_json FROM pi_knowledge_concepts ORDER BY id').all() as Array<Record<string, unknown>>;
        const linkRows = database.prepare('SELECT id, payload_json FROM pi_knowledge_links ORDER BY id').all() as Array<Record<string, unknown>>;
        const updateConcept = database.prepare('UPDATE pi_knowledge_concepts SET payload_json = ? WHERE id = ?');
        const updateLink = database.prepare('UPDATE pi_knowledge_links SET payload_json = ? WHERE id = ?');
        for (const row of conceptRows) {
            updateConcept.run(JSON.stringify(conceptPayload(JSON.parse(String(row.payload_json)) as MemoryKnowledgeConcept)), row.id);
        }
        for (const row of linkRows) {
            updateLink.run(JSON.stringify(linkPayload(JSON.parse(String(row.payload_json)) as MemoryKnowledgeLink)), row.id);
        }
    } finally {
        database.close();
    }
}

function readSqliteAgentEvents(repository: MemoryStoreRepository | undefined, storePath: string): Array<Record<string, unknown>> {
    const sqliteModule = (repository as unknown as { getSqliteModule?: () => { DatabaseSync: new (databasePath: string, options?: { readOnly?: boolean }) => {
        prepare(sql: string): { all(): unknown[] };
        close(): void;
    } } | undefined }).getSqliteModule?.();
    if (!sqliteModule) {
        return [];
    }
    const database = new sqliteModule.DatabaseSync(storePath, { readOnly: true });
    try {
        return database.prepare([
            'SELECT id, workspace_id, session_id, task_id, provider, event_type, file_id, symbol_id,',
            'relative_path, command, prompt_text_hash, prompt_signature, created_at',
            'FROM pi_agent_events ORDER BY created_at, id'
        ].join(' ')).all() as Array<Record<string, unknown>>;
    } finally {
        database.close();
    }
}

function readSqliteKnowledgeConcepts(repository: MemoryStoreRepository | undefined, storePath: string): Array<Record<string, unknown>> {
    const sqliteModule = (repository as unknown as { getSqliteModule?: () => { DatabaseSync: new (databasePath: string, options?: { readOnly?: boolean }) => {
        prepare(sql: string): { all(): unknown[] };
        close(): void;
    } } | undefined }).getSqliteModule?.();
    if (!sqliteModule) {
        return [];
    }
    const database = new sqliteModule.DatabaseSync(storePath, { readOnly: true });
    try {
        return database.prepare('SELECT id, graph_id, concept_type, title, source, evidence, confidence FROM pi_knowledge_concepts ORDER BY id').all() as Array<Record<string, unknown>>;
    } finally {
        database.close();
    }
}

function expectStoreFields(store: MemoryStoreData): void {
    expect(Object.keys(store).sort()).to.deep.equal([
        'benchmarkReports',
        'changeImpacts',
        'codeChunks',
        'contextSuggestions',
        'events',
        'feedbackRecords',
        'files',
        'graphSnapshots',
        'knowledgeGraphs',
        'legacyMemories',
        'memories',
        'memorySpaces',
        'memoryVectors',
        'relations',
        'settings',
        'skillCandidates',
        'skills',
        'snapshots',
        'symbols',
        'transcriptMessages',
        'transcriptSessions'
    ]);
}

function emptyStore(): MemoryStoreData {
    return {
        settings: {},
        snapshots: {},
        files: {},
        symbols: {},
        relations: {},
        codeChunks: {},
        graphSnapshots: [],
        changeImpacts: [],
        contextSuggestions: [],
        legacyMemories: {},
        skills: {},
        memories: [],
        memorySpaces: [],
        memoryVectors: [],
        knowledgeGraphs: [],
        skillCandidates: [],
        events: [],
        feedbackRecords: [],
        transcriptSessions: [],
        transcriptMessages: [],
        benchmarkReports: []
    };
}

function memoryFixture(workspacePath: string, partial: Partial<MemoryItem>): MemoryItem {
    const now = '2026-01-01T00:00:00.000Z';
    return {
        id: 'mem',
        workspacePath,
        scope: 'workspace',
        memoryType: 'project_decision',
        title: 'Project memory',
        content: 'Project memory content.',
        status: 'active',
        staleStatus: 'fresh',
        importance: 'medium',
        weight: 0.6,
        lastAccessedAt: now,
        accessCount: 0,
        createdAt: now,
        updatedAt: now,
        acceptedCount: 0,
        rejectedCount: 0,
        ...partial
    };
}

function storeFixture(workspacePath: string): MemoryStoreData {
    const key = path.resolve(workspacePath).toLowerCase();
    const now = '2026-01-01T00:00:00.000Z';
    return {
        settings: {
            [key]: {
                workspacePath,
                enabled: true,
                graphEnabled: true,
                memoryEnabled: true,
                skillSuggestionsEnabled: true,
                updatedAt: now
            }
        },
        snapshots: {
            [key]: {
                workspaceRoot: workspacePath,
                scanId: 'scan_alpha',
                scannedAt: now,
                mode: 'quick',
                totals: {
                    files: 1,
                    indexedFiles: 1,
                    skippedFiles: 0,
                    bytes: 42,
                    lines: 3,
                    secrets: 0
                },
                languages: [{ language: 'typescript', files: 1, bytes: 42 }],
                files: [],
                manifests: [],
                secretFindings: [],
                issues: []
            }
        },
        files: {
            [key]: [{
                id: 'file_alpha',
                relativePath: 'src/alpha.ts',
                fileName: 'alpha.ts',
                extension: '.ts',
                languageId: 'typescript',
                sizeBytes: 42,
                contentHash: 'file_hash',
                isIgnored: false,
                isGenerated: false,
                isBinary: false,
                isSensitive: false,
                indexedAt: now
            }]
        },
        symbols: {
            [key]: [{
                id: 'symbol_alpha',
                fileId: 'file_alpha',
                languageId: 'typescript',
                symbolKind: 'class',
                name: 'AlphaService',
                fullName: 'AlphaService',
                startLine: 1,
                endLine: 3
            }]
        },
        relations: {
            [key]: [{
                id: 'relation_alpha',
                sourceKind: 'file',
                sourceId: 'file_alpha',
                targetKind: 'symbol',
                targetId: 'symbol_alpha',
                relationType: 'contains',
                confidenceLevel: 'extracted',
                confidenceScore: 1,
                evidence: 'class AlphaService'
            }]
        },
        codeChunks: {
            [key]: [chunkFixture({
                id: 'chunk_alpha',
                workspacePath,
                fileId: 'file_alpha',
                relativePath: 'src/alpha.ts',
                languageId: 'typescript',
                chunkKind: 'symbol',
                title: 'AlphaService',
                content: 'SQLite migration preserves code chunk search fields.',
                contentHash: 'chunk_hash',
                symbolName: 'AlphaService',
                startLine: 1,
                endLine: 3,
                estimatedTokens: 8,
                indexedAt: now
            })]
        },
        graphSnapshots: [{
            id: 'graph_alpha',
            workspacePath,
            label: 'Code Graph',
            graphJson: '{"nodes":[],"edges":[]}',
            createdAt: now
        }],
        changeImpacts: [{
            id: 'impact_alpha',
            workspacePath,
            relativePath: 'src/alpha.ts',
            sourceId: 'file_alpha',
            summary: 'Alpha changed.',
            riskScore: 0.25,
            impactJson: '{"risks":[]}',
            createdAt: now
        }],
        contextSuggestions: [{
            id: 'suggestion_alpha',
            workspacePath,
            promptSignature: 'prompt_alpha',
            title: 'AlphaService',
            reason: 'Relevant to SQLite migration tests.',
            sourceKind: 'code',
            score: 0.9,
            estimatedTokens: 8,
            uri: 'src/alpha.ts:1',
            createdAt: now,
            accepted: true
        }],
        legacyMemories: {
            [key]: [{
                id: 'legacy_memory_alpha',
                kind: 'note',
                title: 'Legacy JSON memory',
                body: 'Preserved for import compatibility.',
                createdAt: now,
                updatedAt: now
            }]
        },
        skills: {
            [key]: [{
                id: 'skill_alpha',
                kind: 'workflow',
                name: 'SQLite migration workflow',
                description: 'Validate storage migration.',
                guidance: ['Run storage tests.'],
                createdAt: now,
                updatedAt: now
            }]
        },
        memories: [{
            id: 'mem_global',
            scope: 'global',
            memoryType: 'user_preference',
            title: 'IDE memory',
            content: 'Global IDE memory is not workspace-bound.',
            status: 'active',
            staleStatus: 'fresh',
            importance: 'medium',
            weight: 0.6,
            lastAccessedAt: now,
            accessCount: 0,
            createdAt: now,
            updatedAt: now,
            acceptedCount: 1,
            rejectedCount: 0
        }, {
            id: 'mem_repository',
            scope: 'repository',
            repositoryUrl: 'https://github.com/acme/project.git',
            repositoryId: 'github.com/acme/project',
            sessionId: 'session_alpha',
            taskId: 'task_alpha',
            expiresAt: '2026-02-01T00:00:00.000Z',
            retentionPolicy: 'ttl',
            memoryType: 'project_decision',
            title: 'Repository storage',
            content: 'Repository scoped memory survives clone path changes.',
            status: 'candidate',
            staleStatus: 'unknown',
            importance: 'medium',
            weight: 0.6,
            lastAccessedAt: now,
            accessCount: 0,
            createdAt: now,
            updatedAt: now,
            acceptedCount: 0,
            rejectedCount: 0,
            supersededBy: 'mem_repository_new',
            supersedes: ['mem_workspace'],
            originMarkers: ['test-fixture']
        }, {
            id: 'mem_workspace',
            workspacePath,
            scope: 'workspace',
            memoryType: 'project_decision',
            title: 'Project storage',
            content: 'Use SQLite as the source of truth.',
            status: 'active',
            staleStatus: 'fresh',
            importance: 'high',
            weight: 0.85,
            lastAccessedAt: now,
            accessCount: 1,
            createdAt: now,
            updatedAt: now,
            acceptedCount: 1,
            rejectedCount: 0,
            source: 'test',
            evidence: 'Phase 1 storage plan'
        }],
        memorySpaces: [{
            id: `custom:workspace:${workspacePath}`,
            scope: 'workspace',
            workspacePath,
            retentionPolicy: 'manual',
            metadata: {
                label: 'Workspace memory space'
            },
            createdAt: now,
            updatedAt: now
        }],
        memoryVectors: [{
            id: 'mem_vector_alpha',
            memoryId: 'mem_workspace',
            workspacePath,
            scope: 'workspace',
            modelId: 'pi-local-hash-embedding-v1',
            dimensions: 4,
            contentHash: 'vector_hash',
            vector: [0.5, 0.5, 0.5, 0.5],
            createdAt: now,
            updatedAt: now
        }],
        knowledgeGraphs: [{
            id: 'kg_alpha',
            workspacePath,
            scope: 'workspace',
            title: 'Project Decisions',
            description: 'Round-trip knowledge graph.',
            status: 'active',
            tags: ['test'],
            concepts: [{
                id: 'kg_concept_alpha',
                graphId: 'kg_alpha',
                kind: 'decision',
                title: 'Use SQLite',
                summary: 'Use SQLite as the source of truth.',
                status: 'active',
                sourceKind: 'project-memory',
                sourceId: 'mem_workspace',
                tags: ['project_decision'],
                weight: 0.85,
                createdAt: now,
                updatedAt: now
            }],
            links: [{
                id: 'kg_link_alpha',
                graphId: 'kg_alpha',
                sourceConceptId: 'kg_concept_alpha',
                targetConceptId: 'mem_workspace',
                linkKind: 'derived_from',
                label: 'Derived from memory',
                confidenceScore: 0.82,
                evidence: 'Project memory review',
                metadata: {
                    targetKind: 'memory',
                    source: 'test-fixture'
                },
                createdAt: now,
                updatedAt: now
            }],
            createdAt: now,
            updatedAt: now
        }],
        skillCandidates: [{
            id: 'skill_candidate_alpha',
            workspacePath,
            signature: 'storage:sqlite',
            title: 'SQLite tests',
            description: 'Suggest SQLite validation workflow.',
            triggerCount: 2,
            rejectionCount: 0,
            status: 'suggested',
            proposedSkillJson: '{"id":"sqlite-tests"}',
            statusReason: 'Repeated storage task.',
            lastTriggeredAt: now,
            createdAt: now,
            updatedAt: now
        }],
        events: [{
            id: 'event_alpha',
            workspacePath,
            eventType: 'prompt.submitted',
            payload: '{"promptTextHash":"sha256:validate-sqlite-storage","promptSignature":"prompt_alpha","metadata":{"promptLength":23}}',
            relativePath: 'src/alpha.ts',
            promptSignature: 'prompt_alpha',
            createdAt: now
        }],
        feedbackRecords: [{
            id: 'feedback_alpha',
            workspacePath,
            promptSignature: 'prompt_alpha',
            targetKind: 'context-suggestion',
            targetId: 'mem_workspace',
            targetSourceKind: 'project-memory',
            targetTitle: 'Project storage',
            feedback: 'rejected',
            reason: 'Not relevant for this prompt.',
            createdAt: now
        }],
        transcriptSessions: [],
        transcriptMessages: [],
        benchmarkReports: []
    };
}

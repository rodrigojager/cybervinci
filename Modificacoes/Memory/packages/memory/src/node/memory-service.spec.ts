// *****************************************************************************
// Copyright (C) 2026.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { expect } from 'chai';
import { Container } from '@theia/core/shared/inversify';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import * as zlib from 'zlib';
import { EventCaptureBus, EventCaptureRepository, MemoryCodeChunk, MemoryFile, MemoryKnowledgeGraph, MemoryItem, MemoryRelation, MemoryRetrievalCacheEntry, MemoryService, MemorySymbol, MemoryUpdateMemoryRequest, MemoryWorkspaceSettings } from '../common';
import memoryBackendModule from './memory-backend-module';
import {
    MemoryVectorSearchHit,
    MemoryVectorSearchRequest,
    MemoryStoreData,
    MemoryStoreRepository
} from './memory-repositories';
import * as repositoryExports from './memory-repositories';
import { MemoryServiceImpl } from './memory-service';
import { AgentEventRetrievalSource, MemorySearchHit, MemorySearchRepository } from './retrieval-sources';

describe('MemoryServiceImpl', () => {

    it('keeps Memory and sensitive capabilities disabled by default until explicit opt-in', () => {
        const service = new PrivacyDefaultsMemoryService();
        const settings = service.defaultSettingsForTest('/workspace/project');

        expect(settings.enabled).to.equal(false);
        expect(settings.memoryEnabled).to.equal(false);
        expect(settings.skillSuggestionsEnabled).to.equal(false);
        expect(settings.chatLearningEnabled).to.equal(false);
        expect(settings.chatInlineSuggestionsEnabled).to.equal(false);
        expect(settings.chatAutoIndexEnabled).to.equal(false);
        expect(settings.editorHoverEnabled).to.equal(false);
        expect(settings.graphEnabled).to.equal(false);
        expect(settings.vectorSearch?.enabled).to.equal(false);
        expect(settings.optIn).to.deep.include({
            codeGraph: false,
            documentGraph: false,
            projectMemory: false,
            preferences: false,
            skills: false,
            contextCart: false,
            editorHover: false,
            vectorSearch: false,
            transcriptSearch: false,
            promptSnippets: false,
            pdfDocuments: false,
            officeDocuments: false,
            images: false,
            diagrams: false,
            audioVideo: false,
            remoteImageSemantics: false,
            remoteMediaTranscription: false,
            externalDocCollections: false
        });
    });

    it('does not persist prompts or index memory for a new workspace before consent', async () => {
        const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'pi-no-consent-'));
        await fs.writeFile(path.join(workspacePath, 'README.md'), '# Project\n\nNo consent yet.', 'utf8');
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);

        const promptEvent = await service.recordEvent({
            workspacePath,
            eventType: 'prompt.submitted',
            payload: JSON.stringify({ prompt: 'Remember that this project uses private staging keys.' })
        });
        const indexResult = await service.indexWorkspace({ workspacePath, scope: 'local-docs', backfillMemories: true });
        const key = repository.workspaceKey(workspacePath);

        expect(promptEvent.eventType).to.equal('prompt.submitted');
        expect(repository.store.events.filter(event => event.workspacePath === workspacePath)).to.have.length(1);
        expect(repository.store.events[0].eventType).to.equal('search.executed');
        expect(repository.store.events.some(event => event.eventType === 'prompt.submitted')).to.equal(false);
        expect(repository.store.memories.filter(memory => memory.workspacePath === workspacePath)).to.deep.equal([]);
        expect(repository.store.memoryVectors.filter(vector => vector.workspacePath === workspacePath)).to.deep.equal([]);
        expect(repository.store.settings[key].enabled).to.equal(true);
        expect(repository.store.settings[key].memoryEnabled).to.equal(false);
        expect(indexResult.memoryBackfillStatus).to.equal(undefined);
    });

    it('keeps sensitive retrieval sources disabled until their source consent is granted', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        const workspacePath = '/workspace';
        const key = repository.workspaceKey(workspacePath);
        repository.store.memories.push(memoryFixture({
            id: 'mem_sensitive_policy',
            workspacePath,
            title: 'Sensitive memory policy',
            content: 'Only retrieve this after memory consent.'
        }));
        repository.store.events.push({
            id: 'event_sensitive_agent',
            workspacePath,
            eventType: 'agent.completed',
            payload: 'Only retrieve this after event consent.',
            createdAt: '2026-01-01T00:00:00.000Z'
        });
        repository.store.files[key] = [fileFixture({
            id: 'file_docs',
            relativePath: 'docs/private.md',
            fileName: 'private.md',
            extension: '.md',
            languageId: 'markdown'
        })];
        repository.store.codeChunks[key] = [codeChunkFixture(workspacePath, {
            id: 'chunk_private_docs',
            fileId: 'file_docs',
            relativePath: 'docs/private.md',
            chunkKind: 'markdown-section',
            title: 'Private local docs',
            content: 'Only retrieve this after document graph consent.'
        })];

        await service.updateWorkspaceConsent({
            workspacePath,
            capabilities: {
                contextCart: true
            }
        });

        const blocked = await service.search({
            workspacePath,
            text: 'retrieve consent',
            sourceKinds: ['project-memory', 'agent-event', 'local-docs'],
            limit: 10
        });
        expect(blocked).to.deep.equal([]);

        await service.updateWorkspaceConsent({
            workspacePath,
            capabilities: {
                projectMemory: true,
                events: true,
                documentGraph: true
            }
        });

        const allowed = await service.search({
            workspacePath,
            text: 'retrieve consent',
            sourceKinds: ['project-memory', 'agent-event', 'local-docs'],
            limit: 10
        });
        expect(allowed.map(result => result.sourceKind)).to.include.members(['project-memory', 'agent-event', 'local-docs']);
    });

    it('registers EventCaptureBus in DI and records service events through the shared bus repository', async () => {
        const container = new Container();
        container.load(memoryBackendModule);
        const service = container.get<MemoryService>(MemoryService);
        attachRepository(service as MemoryServiceImpl, new InMemoryStoreRepository());

        const event = await service.recordEvent({
            workspacePath: '/workspace',
            eventType: 'agent.completed',
            payload: JSON.stringify({ agentId: 'agent-1', result: 'ok' }),
            promptSignature: 'intent:agent:complete'
        });
        const busEvents = await container.get(EventCaptureBus).list({
            workspacePath: '/workspace',
            eventTypes: ['agent.completed'],
            promptSignature: 'intent:agent:complete'
        });
        const repositoryEvents = await container.get<EventCaptureRepository>(EventCaptureRepository).listEvents({
            workspacePath: '/workspace',
            eventTypes: ['agent.completed']
        });

        expect(event.eventType).to.equal('agent.completed');
        expect(busEvents.map(captured => captured.id)).to.deep.equal([event.id]);
        expect(repositoryEvents.map(captured => captured.id)).to.deep.equal([event.id]);
    });

    it('registers agent events as a retrieval source', () => {
        const service = new RetrievalSourcesMemoryService();

        expect(service.retrievalSourceKindsForTest()).to.include.members([
            'code',
            'project-memory',
            'repository-memory',
            'task-memory',
            'agent-event',
            'skill',
            'feedback-record',
            'local-docs'
        ]);
    });

    it('retrieves agent events from minimized local event payloads without prompt samples', async () => {
        const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'pi-workspace-'));
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        repository.store.events.push({
            id: 'event_agent_cache',
            workspacePath,
            eventType: 'agent.completed',
            relativePath: 'src/cache.ts',
            promptSignature: 'intent:debug_error:typescript:cache',
            payload: JSON.stringify({
                agentId: 'codex',
                outcome: 'completed',
                summary: 'Reviewed retry policy and cache invalidation.',
                prompt: 'raw prompt should not be retrieved',
                redactedPromptSnippet: 'sample should not be retrieved'
            }),
            createdAt: '2026-01-01T00:00:00.000Z'
        });

        const results = await service.search({ workspacePath, text: 'retry policy', sourceKinds: ['agent-event'], limit: 5 });

        expect(results).to.have.length(1);
        expect(results[0].sourceKind).to.equal('agent-event');
        expect(results[0].title).to.equal('agent.completed: src/cache.ts');
        expect(results[0].snippet).to.contain('Reviewed retry policy and cache invalidation.');
        expect(results[0].snippet).not.to.contain('raw prompt should not be retrieved');
        expect(results[0].snippet).not.to.contain('sample should not be retrieved');
    });

    it('filters agent event retrieval to permitted event categories only', async () => {
        const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'pi-workspace-'));
        const repository = new InMemoryStoreRepository();
        repository.store.events.push({
            id: 'event_agent_allowed',
            workspacePath,
            eventType: 'agent.completed',
            payload: JSON.stringify({ summary: 'shared retry policy signal' }),
            createdAt: '2026-01-01T00:00:00.000Z'
        }, {
            id: 'event_consent_blocked',
            workspacePath,
            eventType: 'consent.updated',
            payload: JSON.stringify({ summary: 'shared retry policy signal', events: true }),
            createdAt: '2026-01-01T00:00:00.000Z'
        }, {
            id: 'event_feedback_blocked',
            workspacePath,
            eventType: 'feedback.recorded',
            payload: JSON.stringify({ summary: 'shared retry policy signal' }),
            createdAt: '2026-01-01T00:00:00.000Z'
        });

        const results = await new AgentEventRetrievalSource(repository).search({
            workspacePath,
            text: 'retry policy',
            limit: 10
        });

        expect(results.map(result => result.id)).to.deep.equal(['event_agent_allowed']);
    });

    it('enqueues reactive indexing for file create, update, save, and rename events', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        const workspacePath = '/workspace';

        await service.recordEvent({ workspacePath, eventType: 'file.created', relativePath: 'src/created.ts' });
        await service.recordEvent({ workspacePath, eventType: 'file.edited', relativePath: 'src/created.ts' });
        await service.recordEvent({ workspacePath, eventType: 'file.saved', relativePath: 'src/created.ts' });
        await service.recordEvent({
            workspacePath,
            eventType: 'file.renamed',
            relativePath: 'src/renamed.ts',
            payload: JSON.stringify({ fromRelativePath: 'src/created.ts' })
        });

        const status = service.getIncrementalIndexQueueStatus(workspacePath);
        expect(status).to.have.length(1);
        expect(status[0]).to.include({
            workspacePath,
            pending: true,
            running: false,
            pendingCount: 4
        });
    });

    it('removes indexed file artifacts immediately when a file is deleted', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        const workspacePath = '/workspace';
        const key = repository.workspaceKey(workspacePath);
        repository.store.files[key] = [
            fileFixture({ id: 'file_removed', relativePath: 'src/removed.ts', fileName: 'removed.ts' }),
            fileFixture({ id: 'file_kept', relativePath: 'src/kept.ts', fileName: 'kept.ts' })
        ];
        repository.store.symbols[key] = [
            symbolFixture({ id: 'symbol_removed', fileId: 'file_removed', name: 'RemovedService' }),
            symbolFixture({ id: 'symbol_kept', fileId: 'file_kept', name: 'KeptService' })
        ];
        repository.store.relations[key] = [
            relationFixture({ id: 'relation_removed', sourceId: 'symbol_removed', targetId: 'symbol_kept' }),
            relationFixture({ id: 'relation_kept', sourceId: 'file_kept', targetId: 'symbol_kept' })
        ];
        repository.store.codeChunks[key] = [
            codeChunkFixture(workspacePath, { id: 'chunk_removed', fileId: 'file_removed', relativePath: 'src/removed.ts' }),
            codeChunkFixture(workspacePath, { id: 'chunk_kept', fileId: 'file_kept', relativePath: 'src/kept.ts' })
        ];

        await service.recordEvent({ workspacePath, eventType: 'file.deleted', relativePath: 'src/removed.ts' });

        expect(repository.store.files[key].map(file => file.id)).to.deep.equal(['file_kept']);
        expect(repository.store.symbols[key].map(symbol => symbol.id)).to.deep.equal(['symbol_kept']);
        expect(repository.store.relations[key].map(relation => relation.id)).to.deep.equal(['relation_kept']);
        expect(repository.store.codeChunks[key].map(chunk => chunk.id)).to.deep.equal(['chunk_kept']);
        expect(service.getIncrementalIndexQueueStatus(workspacePath)).to.deep.equal([]);
    });

    it('invalidates change impacts and retrieval cache for reactive file events', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        const workspacePath = '/workspace';
        repository.store.changeImpacts = [
            {
                id: 'impact_removed',
                workspacePath,
                relativePath: 'src/cache.ts',
                sourceId: 'file_cache',
                summary: 'src/cache.ts risk',
                riskScore: 0.8,
                impactJson: JSON.stringify({ changedFilePaths: ['src/cache.ts'] }),
                createdAt: '2026-01-01T00:00:00.000Z'
            },
            {
                id: 'impact_kept',
                workspacePath,
                relativePath: 'src/kept.ts',
                sourceId: 'file_kept',
                summary: 'src/kept.ts risk',
                riskScore: 0.4,
                impactJson: JSON.stringify({ changedFilePaths: ['src/kept.ts'] }),
                createdAt: '2026-01-01T00:00:00.000Z'
            }
        ];
        repository.retrievalCache = [{
            id: 'cache_cache_file',
            workspacePath,
            queryKey: 'query_cache',
            scopeParams: { workspacePath, sourceKinds: ['code'], limit: 5 },
            sourcesHash: 'sources',
            results: [{
                id: 'chunk_cache',
                sourceKind: 'code',
                title: 'Cache file',
                snippet: 'cache invalidation',
                score: 0.9,
                uri: 'src/cache.ts:1',
                evidence: 'src/cache.ts'
            }],
            createdAt: '2026-01-01T00:00:00.000Z',
            expiresAt: '2999-01-01T00:00:00.000Z'
        }];

        await service.recordEvent({ workspacePath, eventType: 'file.saved', relativePath: 'src/cache.ts' });

        expect(repository.store.changeImpacts.map(impact => impact.id)).to.deep.equal(['impact_kept']);
        expect(repository.retrievalCache).to.deep.equal([]);
        expect(repository.invalidatedCachePaths).to.deep.equal([['src/cache.ts']]);
    });

    it('marks memories derived from changed files as possibly stale when origin links match', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        const workspacePath = '/workspace';
        repository.store.memories = [
            memoryFixture({
                id: 'mem_source_match',
                workspacePath,
                source: 'code:src/cache.ts',
                staleStatus: 'fresh'
            }),
            memoryFixture({
                id: 'mem_origin_marker_match',
                workspacePath,
                originMarkers: ['derived-from:file:src/cache.ts'],
                staleStatus: 'fresh'
            }),
            memoryFixture({
                id: 'mem_no_origin_link',
                workspacePath,
                content: 'Mentions src/cache.ts in user-authored content only.',
                staleStatus: 'fresh'
            }),
            memoryFixture({
                id: 'mem_already_stale',
                workspacePath,
                source: 'code:src/cache.ts',
                staleStatus: 'stale'
            }),
            memoryFixture({
                id: 'mem_other_workspace',
                workspacePath: '/other',
                source: 'code:src/cache.ts',
                staleStatus: 'fresh'
            })
        ];

        await service.recordEvent({ workspacePath, eventType: 'file.saved', relativePath: 'src/cache.ts' });

        const byId = new Map(repository.store.memories.map(memory => [memory.id, memory]));
        expect(byId.get('mem_source_match')?.staleStatus).to.equal('possibly_stale');
        expect(byId.get('mem_source_match')?.evidence).to.contain('possibly_stale:file-change:src/cache.ts');
        expect(byId.get('mem_origin_marker_match')?.staleStatus).to.equal('possibly_stale');
        expect(byId.get('mem_no_origin_link')?.staleStatus).to.equal('fresh');
        expect(byId.get('mem_already_stale')?.staleStatus).to.equal('stale');
        expect(byId.get('mem_other_workspace')?.staleStatus).to.equal('fresh');
    });

    it('adds ranking signals for event recency, type, workspace, session/task, and feedback', async () => {
        const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'pi-workspace-'));
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        repository.store.events.push({
            id: 'event_current_task',
            workspacePath,
            eventType: 'prompt.submitted',
            taskId: 'task-1',
            sessionId: 'session-1',
            promptSignature: 'intent:debug_error:typescript:cache',
            payload: JSON.stringify({ summary: 'retry policy cache invalidation', taskId: 'task-1', sessionId: 'session-1' }),
            createdAt: new Date().toISOString()
        }, {
            id: 'event_other_task',
            workspacePath,
            eventType: 'agent.failed',
            taskId: 'task-2',
            sessionId: 'session-2',
            promptSignature: 'intent:debug_error:typescript:cache',
            payload: JSON.stringify({ summary: 'retry policy cache invalidation', taskId: 'task-2', sessionId: 'session-2' }),
            createdAt: '2026-01-01T00:00:00.000Z'
        });
        repository.store.feedbackRecords.push({
            id: 'feedback_event_current_task',
            workspacePath,
            targetKind: 'retrieval-result',
            targetId: 'event_current_task',
            targetSourceKind: 'agent-event',
            targetTitle: 'prompt.submitted',
            feedback: 'accepted',
            createdAt: new Date().toISOString()
        });

        const result = await service.suggestContext({
            workspacePath,
            prompt: 'retry policy',
            sourceKinds: ['agent-event'],
            taskId: 'task-1',
            sessionId: 'session-1',
            limit: 2
        });

        expect(result.suggestions[0].id).to.equal('event_current_task');
        expect(result.suggestions[0].rankingSignals).to.deep.include({
            eventType: 'prompt.submitted',
            eventTypeScore: 0.75,
            workspaceScore: 1,
            sessionTaskScore: 1,
            feedbackMultiplier: 1.05
        });
        expect(result.suggestions[0].rankingSignals?.recencyScore).to.be.greaterThan(0.9);
        expect(result.suggestions[0].reason).to.contain('Suggested event because');
        expect(result.suggestions[0].reason).to.contain('matched the prompt text');
        expect(result.suggestions[0].reason).to.contain('event type prompt.submitted contributed relevance');
        expect(result.suggestions[0].reason).to.contain('matched the current session or task');
        expect(result.suggestions[0].reason).to.contain('eventType=prompt.submitted');
        expect(result.suggestions[0].reason).to.contain('sessionTask=1');
        expect(result.suggestions[0].reason).to.contain('feedback=1.05');
    });

    it('preserves symbols, relations, and chunks for unchanged files during incremental indexing', async () => {
        const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'pi-workspace-'));
        await fs.writeFile(path.join(workspacePath, 'A.cs'), csharpFile('A', 'Alpha'), 'utf8');
        await fs.writeFile(path.join(workspacePath, 'B.cs'), csharpFile('B', 'Bravo'), 'utf8');
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);

        await service.indexWorkspace({ workspacePath });
        const key = repository.workspaceKey(workspacePath);
        const beforeFile = repository.store.files[key].find(file => file.relativePath === 'B.cs');
        expect(beforeFile).not.to.equal(undefined);
        const beforeSymbols = repository.store.symbols[key].filter(symbol => symbol.fileId === beforeFile?.id);
        const beforeRelations = repository.store.relations[key].filter(relation => beforeSymbols.some(symbol => relation.sourceId === symbol.id || relation.targetId === symbol.id));
        const beforeChunks = repository.store.codeChunks[key].filter(chunk => chunk.fileId === beforeFile?.id);

        await fs.writeFile(path.join(workspacePath, 'A.cs'), csharpFile('A', 'Alpha changed'), 'utf8');
        await service.indexWorkspace({ workspacePath, changedRelativePaths: ['A.cs'] });

        const afterFile = repository.store.files[key].find(file => file.relativePath === 'B.cs');
        const afterSymbols = repository.store.symbols[key].filter(symbol => symbol.fileId === afterFile?.id);
        const afterRelations = repository.store.relations[key].filter(relation => afterSymbols.some(symbol => relation.sourceId === symbol.id || relation.targetId === symbol.id));
        const afterChunks = repository.store.codeChunks[key].filter(chunk => chunk.fileId === afterFile?.id);

        expect(afterFile?.contentHash).to.equal(beforeFile?.contentHash);
        expect(afterFile?.indexedAt).to.equal(beforeFile?.indexedAt);
        expect(afterSymbols).to.deep.equal(beforeSymbols);
        expect(afterRelations).to.deep.equal(beforeRelations);
        expect(afterChunks).to.deep.equal(beforeChunks);
        expect(repository.replacedChunks.map(chunk => chunk.fileId)).to.include(afterFile?.id);
    });

    it('supports controlled local-docs indexing without extracting the whole code graph', async () => {
        const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'pi-doc-backfill-'));
        await fs.writeFile(path.join(workspacePath, 'README.md'), [
            '# Local operations',
            '',
            'Use the local documentation cache before indexing the full source tree.'
        ].join('\n'), 'utf8');
        await fs.writeFile(path.join(workspacePath, 'A.cs'), csharpFile('A', 'Alpha'), 'utf8');
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);

        const result = await service.indexWorkspace({ workspacePath, scope: 'local-docs', maxFiles: 1 });
        const key = repository.workspaceKey(workspacePath);

        expect(result.backfillScope).to.equal('local-docs');
        expect(result.indexedFileCount).to.equal(1);
        expect(repository.store.symbols[key]).to.deep.equal([]);
        expect(repository.store.codeChunks[key].map(chunk => chunk.relativePath)).to.deep.equal(['README.md']);
    });

    it('refreshes external doc collections only when the workspace opts in and requests refresh', async () => {
        const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'pi-external-doc-workspace-'));
        const externalDocsPath = await fs.mkdtemp(path.join(os.tmpdir(), 'pi-external-docs-'));
        await fs.writeFile(path.join(workspacePath, 'README.md'), '# Workspace docs\n\nLocal workspace context.', 'utf8');
        await fs.writeFile(path.join(externalDocsPath, 'sdk.md'), '# SDK Cache\n\nExternal retry policy and timeout guidance.', 'utf8');
        await fs.writeFile(path.join(externalDocsPath, 'secret.env'), 'TOKEN=abcdefghijklmnopqrstuvwxyz123456', 'utf8');
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);

        await service.updateSettings({
            workspacePath,
            externalDocCollections: [{
                id: 'sdk-docs',
                label: 'SDK Docs',
                rootPath: externalDocsPath,
                enabled: true,
                refreshPolicy: 'manual',
                includeGlobs: ['**/*.md'],
                source: 'external-sdk-docs',
                origin: 'file-system-doc-collection'
            }]
        });
        await service.indexWorkspace({ workspacePath, scope: 'local-docs' });
        const key = repository.workspaceKey(workspacePath);
        expect(repository.store.codeChunks[key].some(chunk => chunk.sourceKind === 'external-docs')).to.equal(false);

        await service.updateSettings({ workspacePath, optIn: { externalDocCollections: true } });
        const result = await service.indexWorkspace({ workspacePath, scope: 'local-docs', refreshExternalDocs: true, externalDocCollectionIds: ['sdk-docs'] });
        const externalChunks = repository.store.codeChunks[key].filter(chunk => chunk.sourceKind === 'external-docs');
        const searchResults = await service.search({ workspacePath, text: 'retry policy', sourceKinds: ['external-docs'], limit: 5 });
        const refreshedCollection = repository.store.settings[key].externalDocCollections?.find(collection => collection.id === 'sdk-docs');

        expect(result.refreshedExternalDocCollectionCount).to.equal(1);
        expect(externalChunks).to.have.length(1);
        expect(externalChunks[0].relativePath).to.equal('external-docs/sdk-docs/sdk.md');
        expect(externalChunks[0].externalCollectionLabel).to.equal('SDK Docs');
        expect(externalChunks[0].origin).to.equal('file-system-doc-collection');
        expect(JSON.stringify(externalChunks)).not.to.contain('TOKEN=');
        expect(searchResults[0]?.sourceKind).to.equal('external-docs');
        expect(searchResults[0]?.evidence).to.contain('external-docs:sdk-docs');
        expect(refreshedCollection?.lastRefreshedAt).to.equal(result.indexedAt);
    });

    it('keeps Office ingestion opt-in and stores extracted memories only as review candidates', async () => {
        const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'pi-office-docs-'));
        await fs.mkdir(path.join(workspacePath, 'docs'), { recursive: true });
        const secret = 'abcdefghijklmnopqrstuvwxyz123456';
        await fs.writeFile(path.join(workspacePath, 'docs', 'decision.docx'), minimalZipXml('word/document.xml', `<w:document><w:body><w:p><w:r><w:t>Decision: review office onboarding notes and redact token: ${secret}.</w:t></w:r></w:p></w:body></w:document>`));
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);

        await service.indexWorkspace({ workspacePath, scope: 'local-docs' });
        let key = repository.workspaceKey(workspacePath);
        expect(repository.store.files[key].find(file => file.relativePath === 'docs/decision.docx')?.isBinary).to.equal(true);
        expect(repository.store.codeChunks[key] ?? []).to.deep.equal([]);

        await service.updateSettings({ workspacePath, optIn: { officeDocuments: true } });
        const result = await service.indexWorkspace({ workspacePath, scope: 'local-docs' });
        key = repository.workspaceKey(workspacePath);
        const chunks = repository.store.codeChunks[key].filter(chunk => chunk.relativePath === 'docs/decision.docx');
        const candidates = repository.store.memories.filter(memory => memory.source === 'office-document-ingestion');

        expect(result.indexedFileCount).to.equal(1);
        expect(repository.store.files[key].find(file => file.relativePath === 'docs/decision.docx')?.isBinary).to.equal(false);
        expect(chunks).to.have.length(1);
        expect(chunks[0].chunkKind).to.equal('office-document');
        expect(JSON.stringify(chunks)).not.to.contain(secret);
        expect(candidates).not.to.deep.equal([]);
        expect(candidates.every(memory => memory.status === 'candidate')).to.equal(true);
        expect(JSON.stringify(candidates)).not.to.contain(secret);
    });

    it('keeps image and diagram ingestion opt-in with local metadata and review-only diagram memory proposals', async () => {
        const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'pi-media-docs-'));
        await fs.mkdir(path.join(workspacePath, 'docs'), { recursive: true });
        await fs.mkdir(path.join(workspacePath, 'assets'), { recursive: true });
        const secret = 'abcdefghijklmnopqrstuvwxyz123456';
        await fs.writeFile(path.join(workspacePath, 'assets', 'system.png'), minimalPng(48, 24));
        await fs.writeFile(path.join(workspacePath, 'docs', 'flow.mmd'), 'flowchart LR\n  A[Client] --> B[Local API]\n  Decision: keep diagram ingestion local-first.', 'utf8');
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);

        await service.indexWorkspace({ workspacePath, scope: 'local-docs' });
        let key = repository.workspaceKey(workspacePath);
        expect(repository.store.files[key].find(file => file.relativePath === 'assets/system.png')?.isBinary).to.equal(true);
        expect(repository.store.files[key].find(file => file.relativePath === 'docs/flow.mmd')?.isBinary).to.equal(true);
        expect(repository.store.codeChunks[key] ?? []).to.deep.equal([]);

        await service.updateSettings({
            workspacePath,
            optIn: {
                images: true,
                diagrams: true,
                remoteImageSemantics: true
            }
        });
        const result = await service.indexWorkspace({ workspacePath, scope: 'local-docs' });
        key = repository.workspaceKey(workspacePath);
        const imageChunk = repository.store.codeChunks[key].find(chunk => chunk.relativePath === 'assets/system.png');
        const diagramChunk = repository.store.codeChunks[key].find(chunk => chunk.relativePath === 'docs/flow.mmd');
        const candidates = repository.store.memories.filter(memory => memory.source === 'diagram-document-ingestion');

        expect(result.indexedFileCount).to.equal(2);
        expect(repository.store.files[key].find(file => file.relativePath === 'assets/system.png')?.isBinary).to.equal(false);
        expect(repository.store.files[key].find(file => file.relativePath === 'docs/flow.mmd')?.isBinary).to.equal(false);
        expect(imageChunk?.chunkKind).to.equal('image-metadata');
        expect(imageChunk?.content).to.contain('OCR: disabled');
        expect(imageChunk?.content).to.contain('Remote semantics: disabled');
        expect(diagramChunk?.chunkKind).to.equal('diagram-document');
        expect(JSON.stringify([diagramChunk, candidates])).not.to.contain(secret);
        expect(candidates.every(memory => memory.status === 'candidate')).to.equal(true);
    });

    it('respects workspace gitignore rules while keeping the default denylist', async () => {
        const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'pi-gitignore-'));
        await fs.mkdir(path.join(workspacePath, 'src', 'generated'), { recursive: true });
        await fs.mkdir(path.join(workspacePath, 'docs'), { recursive: true });
        await fs.mkdir(path.join(workspacePath, 'node_modules', 'pkg'), { recursive: true });
        await fs.writeFile(path.join(workspacePath, '.gitignore'), [
            'ignored-root.md',
            'src/generated/'
        ].join('\n'), 'utf8');
        await fs.writeFile(path.join(workspacePath, 'docs', '.gitignore'), '*.tmp\n', 'utf8');
        await fs.writeFile(path.join(workspacePath, 'README.md'), '# Project\n\nKeep this indexed by Memory.', 'utf8');
        await fs.writeFile(path.join(workspacePath, 'ignored-root.md'), '# Ignored\n\nThis root file is ignored by git.', 'utf8');
        await fs.writeFile(path.join(workspacePath, 'src', 'generated', 'service.ts'), 'export const ignored = "generated";', 'utf8');
        await fs.writeFile(path.join(workspacePath, 'docs', 'draft.tmp'), 'ignored draft from nested gitignore', 'utf8');
        await fs.writeFile(path.join(workspacePath, 'docs', 'guide.md'), '# Guide\n\nNested gitignore keeps this markdown file.', 'utf8');
        await fs.writeFile(path.join(workspacePath, 'node_modules', 'pkg', 'index.ts'), 'export const ignoredByDefaultDenylist = true;', 'utf8');
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);

        await service.indexWorkspace({ workspacePath });
        const key = repository.workspaceKey(workspacePath);
        const indexedPaths = repository.store.files[key].map(file => file.relativePath).sort();

        expect(indexedPaths).to.deep.equal([
            '.gitignore',
            'README.md',
            'docs/.gitignore',
            'docs/draft.tmp',
            'docs/guide.md',
            'ignored-root.md'
        ]);
        expect(repository.store.files[key].find(file => file.relativePath === 'ignored-root.md')?.ignoreReason?.kind).to.equal('gitignore');
        expect(repository.store.files[key].find(file => file.relativePath === 'docs/draft.tmp')?.ignoreReason?.source).to.equal('docs/.gitignore');
    });

    it('gives CyberVinci ignore files precedence over workspace allowlist and denylist', async () => {
        const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'pi-cvignore-'));
        await fs.mkdir(path.join(workspacePath, 'node_modules', 'pkg'), { recursive: true });
        await fs.mkdir(path.join(workspacePath, 'vendor', 'keep'), { recursive: true });
        await fs.writeFile(path.join(workspacePath, '.cvignore'), [
            'vendor/keep/secret.md',
            'always-hidden.md'
        ].join('\n'), 'utf8');
        await fs.writeFile(path.join(workspacePath, '.cybervinciignore'), 'node_modules/pkg/blocked.ts\n', 'utf8');
        await fs.writeFile(path.join(workspacePath, 'README.md'), '# Project\n\nKeep this indexed.', 'utf8');
        await fs.writeFile(path.join(workspacePath, 'always-hidden.md'), '# Hidden\n\nCyberVinci ignore wins over allowlist.', 'utf8');
        await fs.writeFile(path.join(workspacePath, 'vendor', 'keep', 'public.md'), '# Public\n\nAllowlist re-includes this denied folder.', 'utf8');
        await fs.writeFile(path.join(workspacePath, 'vendor', 'keep', 'secret.md'), '# Secret\n\nCyberVinci ignore excludes this allowed file.', 'utf8');
        await fs.writeFile(path.join(workspacePath, 'node_modules', 'pkg', 'allowed.ts'), 'export const allowed = true;', 'utf8');
        await fs.writeFile(path.join(workspacePath, 'node_modules', 'pkg', 'blocked.ts'), 'export const blocked = true;', 'utf8');
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        await service.updateSettings({
            workspacePath,
            allowlist: ['node_modules/pkg/allowed.ts', 'vendor/keep/', 'always-hidden.md'],
            denylist: ['node_modules', 'vendor']
        });

        await service.indexWorkspace({ workspacePath });
        const key = repository.workspaceKey(workspacePath);
        const indexedPaths = repository.store.files[key].map(file => file.relativePath).sort();

        expect(indexedPaths).to.deep.equal([
            '.cvignore',
            '.cybervinciignore',
            'README.md',
            'always-hidden.md',
            'node_modules/pkg/allowed.ts',
            'node_modules/pkg/blocked.ts',
            'vendor/keep/public.md',
            'vendor/keep/secret.md'
        ]);
        expect(repository.store.files[key].find(file => file.relativePath === 'always-hidden.md')?.ignoreReason?.kind).to.equal('cvignore');
        expect(repository.store.files[key].find(file => file.relativePath === 'node_modules/pkg/blocked.ts')?.ignoreReason?.kind).to.equal('cybervinciignore');
        expect(repository.store.files[key].find(file => file.relativePath === 'vendor/keep/secret.md')?.ignoreReason?.kind).to.equal('cvignore');
    });

    it('limits workspace indexing to allowlisted paths when allowlist-only mode is enabled', async () => {
        const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'pi-allowlist-only-'));
        await fs.mkdir(path.join(workspacePath, 'docs', 'internal'), { recursive: true });
        await fs.mkdir(path.join(workspacePath, 'src'), { recursive: true });
        await fs.mkdir(path.join(workspacePath, 'node_modules', 'pkg'), { recursive: true });
        await fs.writeFile(path.join(workspacePath, '.cvignore'), 'docs/internal/secret.md\n', 'utf8');
        await fs.writeFile(path.join(workspacePath, 'README.md'), '# Project\n\nOutside the explicit allowlist.', 'utf8');
        await fs.writeFile(path.join(workspacePath, 'docs', 'guide.md'), '# Guide\n\nAllowed documentation.', 'utf8');
        await fs.writeFile(path.join(workspacePath, 'docs', 'notes.txt'), 'Allowed by docs directory allowlist.', 'utf8');
        await fs.writeFile(path.join(workspacePath, 'docs', 'internal', 'secret.md'), '# Secret\n\nAllowed pattern but CyberVinci ignored.', 'utf8');
        await fs.writeFile(path.join(workspacePath, 'src', 'app.ts'), 'export const skipped = true;', 'utf8');
        await fs.writeFile(path.join(workspacePath, 'node_modules', 'pkg', 'allowed.ts'), 'export const allowed = true;', 'utf8');
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        await service.updateSettings({
            workspacePath,
            restrictIndexingToAllowlist: true,
            allowlist: ['docs/', 'node_modules/pkg/allowed.ts']
        });

        const result = await service.indexWorkspace({ workspacePath });
        const key = repository.workspaceKey(workspacePath);
        const indexedPaths = repository.store.files[key].map(file => file.relativePath).sort();

        expect(result.fileCount).to.equal(6);
        expect(indexedPaths).to.deep.equal([
            '.cvignore',
            'README.md',
            'docs/guide.md',
            'docs/internal/secret.md',
            'docs/notes.txt',
            'node_modules/pkg/allowed.ts'
        ]);
        expect(repository.store.files[key].find(file => file.relativePath === 'README.md')?.ignoreReason?.kind).to.equal('allowlist');
        expect(repository.store.files[key].find(file => file.relativePath === 'docs/internal/secret.md')?.ignoreReason?.kind).to.equal('cvignore');
    });

    it('records ignore reasons and prevents secret content from becoming chunks during indexing', async () => {
        const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'pi-secret-index-'));
        await fs.mkdir(path.join(workspacePath, 'src'), { recursive: true });
        await fs.writeFile(path.join(workspacePath, '.gitignore'), 'ignored.md\n', 'utf8');
        await fs.writeFile(path.join(workspacePath, 'README.md'), '# Project\n\nPublic content that is safe to chunk.', 'utf8');
        await fs.writeFile(path.join(workspacePath, 'ignored.md'), '# Ignored\n\nGit ignored content.', 'utf8');
        await fs.writeFile(path.join(workspacePath, 'src', 'auth.ts'), [
            'export const token = "TOKEN=abcdefghijklmnopqrstuvwxyz123456";',
            'export const publicValue = "long enough public text";'
        ].join('\n'), 'utf8');
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);

        const result = await service.indexWorkspace({ workspacePath, scope: 'workspace' });
        const key = repository.workspaceKey(workspacePath);
        const sensitiveFile = repository.store.files[key].find(file => file.relativePath === 'src/auth.ts');
        const ignoredFile = repository.store.files[key].find(file => file.relativePath === 'ignored.md');
        const chunkText = repository.store.codeChunks[key].map(chunk => chunk.content).join('\n');

        expect(result.sensitiveFileCount).to.equal(1);
        expect(sensitiveFile?.isSensitive).to.equal(true);
        expect(sensitiveFile?.ignoreReason?.kind).to.equal('secret');
        expect(ignoredFile?.ignoreReason).to.deep.include({ kind: 'gitignore', source: '.gitignore' });
        expect(repository.store.codeChunks[key].map(chunk => chunk.relativePath)).to.deep.equal(['README.md']);
        expect(chunkText).not.to.contain('abcdefghijklmnopqrstuvwxyz123456');
    });

    it('redacts secrets in audit/event payloads including unicode-adjacent boundaries', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        const secret = 'abcdefghijklmnopqrstuvwxyz123456';

        const event = await service.recordEvent({
            workspacePath: '/workspace',
            eventType: 'terminal.command',
            payload: `Deploy 🔐 API_KEY=${secret} before release`,
            relativePath: `src/API_KEY=${secret}.ts`
        });

        expect(event.payload).to.contain('abcdef********3456');
        expect(event.payload).not.to.contain(secret);
        expect(event.relativePath).to.contain('abcdef********');
        expect(event.relativePath).not.to.contain(secret);
    });

    it('runs memory vector backfill only when explicitly requested during indexing', async () => {
        const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'pi-memory-backfill-'));
        await fs.writeFile(path.join(workspacePath, 'README.md'), '# Project\n\nLocal docs content for indexing.', 'utf8');
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        await service.addMemory({
            workspacePath,
            scope: 'workspace',
            memoryType: 'manual_note',
            title: 'Backfill target',
            content: 'Index memory vectors only after an explicit caller request.'
        });

        const withoutBackfill = await service.indexWorkspace({ workspacePath, scope: 'local-docs' });
        expect(withoutBackfill.memoryBackfillStatus).to.equal(undefined);
        expect(repository.store.memoryVectors).to.have.length(0);

        await service.updateVectorSettings({ workspacePath, enabled: true, consent: true });
        const withBackfill = await service.indexWorkspace({ workspacePath, scope: 'local-docs', backfillMemories: true });
        expect(withBackfill.memoryBackfillStatus).to.equal('completed');
        expect(repository.store.memoryVectors).to.have.length(1);
    });

    it('keeps transcript search opt-in disabled by default and preserves it through partial settings updates', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        const workspacePath = '/workspace';

        const defaults = await service.getSettings(workspacePath);
        expect(defaults.optIn?.transcriptSearch).to.equal(false);

        const enabled = await service.updateSettings({
            workspacePath,
            optIn: {
                transcriptSearch: true
            }
        });
        expect(enabled.optIn?.transcriptSearch).to.equal(true);
        expect(enabled.optIn?.codeGraph).to.equal(false);

        const updated = await service.updateSettings({
            workspacePath,
            chatLearningEnabled: false
        });
        expect(updated.optIn?.transcriptSearch).to.equal(true);
        expect(updated.optIn?.vectorSearch).to.equal(false);
        expect(updated.chatLearningLlmEnabled).to.equal(false);
        expect(updated.ignoreRules?.useGitignore).to.equal(true);
        expect(updated.ignoreRules?.useCyberVinciIgnore).to.equal(true);
        expect(updated.exportOptions?.includeGlobalMemories).to.equal(false);
        expect(updated.retentionPolicies?.sessionMemory).to.equal('session');
        expect(updated.retentionPolicies?.taskMemory).to.equal('task');
        expect(updated.retentionPolicies?.transcripts).to.equal('manual');

        const policyUpdate = await service.updateSettings({
            workspacePath,
            ignoreRules: { useGitignore: false },
            exportOptions: { includeGlobalMemories: true },
            retentionPolicies: { transcripts: 'ttl', transcriptTtlDays: 14 }
        });
        expect(policyUpdate.ignoreRules?.useGitignore).to.equal(false);
        expect(policyUpdate.ignoreRules?.useCyberVinciIgnore).to.equal(true);
        expect(policyUpdate.exportOptions?.includeGlobalMemories).to.equal(true);
        expect(policyUpdate.retentionPolicies?.transcripts).to.equal('ttl');
        expect(policyUpdate.retentionPolicies?.sessionMemory).to.equal('session');
        expect(policyUpdate.retentionPolicies?.transcriptTtlDays).to.equal(14);
    });

    it('updates workspace consent for selected capabilities and records a minimized local audit event', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        const workspacePath = '/workspace';

        const updated = await service.updateWorkspaceConsent({
            workspacePath,
            capabilities: {
                codeGraph: true,
                projectMemory: true,
                contextCart: true,
                editorHover: false
            }
        });

        expect(updated.enabled).to.equal(true);
        expect(updated.graphEnabled).to.equal(true);
        expect(updated.memoryEnabled).to.equal(true);
        expect(updated.skillSuggestionsEnabled).to.equal(false);
        expect(updated.chatLearningEnabled).to.equal(false);
        expect(updated.editorHoverEnabled).to.equal(false);
        expect(updated.optIn).to.deep.include({
            codeGraph: true,
            projectMemory: true,
            contextCart: true,
            editorHover: false,
            skills: false
        });

        const event = repository.store.events.find(candidate => candidate.eventType === 'consent.updated');
        expect(event?.workspacePath).to.equal(workspacePath);
        expect(event?.payload).to.contain('"granted":["codeGraph","contextCart","projectMemory"]');
        expect(event?.payload).to.contain('"revoked":["editorHover"]');
        expect(event?.payload).not.to.contain(workspacePath);
    });

    it('enables minimized chat learning for skill and event consent without transcript search', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        const workspacePath = '/workspace';

        const skillsOnly = await service.updateWorkspaceConsent({
            workspacePath,
            capabilities: {
                skills: true
            }
        });
        expect(skillsOnly.skillSuggestionsEnabled).to.equal(true);
        expect(skillsOnly.chatLearningEnabled).to.equal(true);
        expect(skillsOnly.optIn?.skills).to.equal(true);
        expect(skillsOnly.optIn?.transcriptSearch).to.equal(false);

        const eventsOnly = await service.updateWorkspaceConsent({
            workspacePath,
            capabilities: {
                skills: false,
                events: true
            }
        });
        expect(eventsOnly.skillSuggestionsEnabled).to.equal(false);
        expect(eventsOnly.chatLearningEnabled).to.equal(true);
        expect(eventsOnly.optIn?.events).to.equal(true);
        expect(eventsOnly.optIn?.transcriptSearch).to.equal(false);
    });

    it('records sanitized audit events for memory, feedback, embeddings, export, and import', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        const workspacePath = '/workspace';
        const secret = 'abcdefghijklmnopqrstuvwxyz123456';

        const memory = await service.addMemory({
            workspacePath,
            scope: 'workspace',
            memoryType: 'manual_note',
            title: 'Audit target',
            content: 'Audit lifecycle without exposing raw content.',
            source: 'manual',
            evidence: `API_KEY=${secret}`
        });
        await service.updateMemory({
            workspacePath,
            id: memory.id,
            patch: {
                status: 'candidate',
                title: 'Edited audit target'
            }
        });
        await service.updateMemory({
            workspacePath,
            id: memory.id,
            patch: { status: 'active' }
        });
        await service.updateMemoryAccess({ workspacePath, id: memory.id });
        await service.recordFeedback({
            workspacePath,
            targetKind: 'memory',
            targetId: memory.id,
            targetTitle: memory.title,
            feedback: 'accepted',
            evidence: `token ${secret}`
        });
        await service.updateVectorSettings({ workspacePath, enabled: true, consent: true });
        await service.backfillMemoryVectors(workspacePath);
        const bundle = await service.exportWorkspaceData({ workspacePath });
        await service.importWorkspaceData({ ...bundle, workspacePath: '/imported-workspace' });
        await service.forgetMemory({ workspacePath, id: memory.id });

        const eventTypes = repository.store.events.map(event => event.eventType);
        expect(eventTypes).to.include.members([
            'memory.created',
            'memory.edited',
            'memory.approved',
            'memory.accessed',
            'memory.deleted',
            'feedback.recorded',
            'embedding.generated',
            'embedding.backfilled',
            'export.created',
            'import.completed'
        ]);
        const rawEvents = JSON.stringify(repository.store.events);
        expect(rawEvents).not.to.contain(secret);
        expect(rawEvents).not.to.contain('Audit lifecycle without exposing raw content.');
        expect(repository.store.events.find(event => event.eventType === 'memory.created')?.payload).to.contain('hasEvidence');
        expect(repository.store.events.find(event => event.eventType === 'embedding.generated')?.payload).to.contain('contentHash');
    });

    it('detects change impact from file events when git is not available', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        const workspacePath = '/workspace';
        const key = repository.workspaceKey(workspacePath);
        repository.store.files[key] = [{
            id: 'file_service',
            relativePath: 'src/service.ts',
            fileName: 'service.ts',
            extension: '.ts',
            languageId: 'typescript',
            sizeBytes: 100,
            contentHash: 'hash',
            isIgnored: false,
            isGenerated: false,
            isBinary: false,
            isSensitive: false
        }];
        repository.store.symbols[key] = [];
        repository.store.relations[key] = [];
        repository.store.memories = [memoryFixture({
            id: 'mem_sensitive_service',
            workspacePath,
            memoryType: 'security_note',
            title: 'service.ts security boundary',
            content: 'src/service.ts handles sensitive project behavior.',
            importance: 'critical'
        })];
        repository.store.events.push({
            id: 'event_1',
            workspacePath,
            eventType: 'file.edited',
            relativePath: 'src/service.ts',
            createdAt: '2026-01-01T00:00:00.000Z'
        }, {
            id: 'event_2',
            workspacePath,
            eventType: 'file.edited',
            relativePath: 'src/service.ts',
            createdAt: '2026-01-02T00:00:00.000Z'
        });

        const result = await service.detectChangeImpactFromGitDiff({
            workspacePath,
            events: repository.store.events
        });

        expect(result.changeSet.source).to.equal('file-events');
        expect(result.impacts).to.have.length(1);
        expect(result.impacts[0].sensitiveMemoryIds).to.deep.equal(['mem_sensitive_service']);
        expect(result.impacts[0].coverageStatus).to.equal('low_inferred_coverage');
        expect(repository.store.changeImpacts).to.have.length(1);
        const impactJson = JSON.parse(repository.store.changeImpacts[0].impactJson ?? '{}');
        expect(impactJson.sensitiveMemoryIds).to.deep.equal(['mem_sensitive_service']);
        expect(impactJson.reasons.join(' ')).not.to.contain('sensitive project behavior');
    });

    it('stores LLM-proposed skill candidates as approval-required suggestions', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        const workspacePath = '/workspace';

        const candidate = await service.proposeSkillCandidate({
            workspacePath,
            signature: 'write tests for service',
            title: 'Write Service Tests',
            description: 'Reusable workflow for creating focused service tests.',
            proposedSkillJson: '{"name":"Write Service Tests"}',
            evidence: 'LLM chat learning'
        });

        expect(candidate.status).to.equal('suggested');
        expect(candidate.title).to.equal('Write Service Tests');
        expect(repository.store.skillCandidates).to.have.length(1);
        expect(repository.store.events.some(event => event.eventType === 'skill.suggested')).to.equal(true);
    });

    it('records minimized local skill rejection feedback and allows blocked candidates to be unblocked', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        const workspacePath = '/workspace';

        const candidate = await service.proposeSkillCandidate({
            workspacePath,
            signature: 'write tests for service',
            title: 'Write Service Tests',
            description: 'Reusable workflow for creating focused service tests.'
        });

        await service.decideSkillCandidate({ workspacePath, id: candidate.id, status: 'rejected', reason: 'Too broad.' });
        await service.decideSkillCandidate({ workspacePath, id: candidate.id, status: 'rejected', reason: 'Wrong framework.' });
        const blocked = await service.decideSkillCandidate({ workspacePath, id: candidate.id, status: 'rejected', reason: 'Still noisy.' });

        expect(blocked?.status).to.equal('blocked');
        expect(blocked?.rejectionCount).to.equal(3);
        expect(blocked?.rejectionReasons).to.deep.equal([
            'Rejected or ignored by the user.',
            'Rejected or ignored by the user.',
            'Rejected or ignored by the user.'
        ]);
        expect(blocked?.statusReason).to.equal('Rejected signal reached threshold 3; candidate silenced for this pattern.');
        expect(repository.store.feedbackRecords).to.have.length(3);
        expect(repository.store.feedbackRecords.every(record =>
            record.targetKind === 'skill'
            && record.feedback === 'rejected'
            && record.reason === 'skill_suggestion_rejected_or_ignored'
            && record.evidence === undefined
        )).to.equal(true);
        expect(JSON.stringify(repository.store.feedbackRecords)).not.to.contain('Too broad.');
        expect(JSON.stringify(repository.store.feedbackRecords)).not.to.contain('Wrong framework.');
        expect(JSON.stringify(repository.store.events)).not.to.contain('Still noisy.');

        const unblocked = await service.decideSkillCandidate({ workspacePath, id: candidate.id, status: 'tracking', reason: 'Block undone by the user.' });

        expect(unblocked?.status).to.equal('tracking');
        expect(unblocked?.rejectionCount).to.equal(0);
        expect(unblocked?.rejectionReasons).to.deep.equal([]);
        expect(repository.store.events.some(event => event.eventType === 'skill.unblocked')).to.equal(true);
    });

    it('normalizes global memories to avoid persisting workspacePath', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        const workspacePath = '/workspace';

        const memory = await service.addMemory({
            workspacePath,
            scope: 'global',
            memoryType: 'user_preference',
            title: 'IDE preference from UI',
            content: 'Show IDE memory semantics in the global list.',
            source: 'manual'
        });

        expect(memory.workspacePath).to.equal(undefined);
        expect(repository.store.memories.some(item => item.id === memory.id && item.scope === 'global' && item.workspacePath === undefined)).to.equal(true);
    });

    it('caches context suggestions and invalidates on memory, feedback, knowledge graph, code chunk, settings, and token budget changes', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        const workspacePath = '/workspace';
        const key = repository.workspaceKey(workspacePath);
        repository.store.settings[key] = {
            workspacePath,
            enabled: true,
            graphEnabled: false,
            memoryEnabled: true,
            skillSuggestionsEnabled: true,
            chatLearningEnabled: true,
            chatInlineSuggestionsEnabled: true,
            chatAutoIndexEnabled: true,
            chatLearningLlmEnabled: false,
            chatLearningLlmFrequency: 0,
            editorHoverEnabled: true,
            denylist: [],
            optIn: {},
            vectorSearch: {
                enabled: false,
                localModelId: 'local',
                dimensions: 384,
                backfillStatus: 'not_started'
            },
            updatedAt: '2026-01-01T00:00:00.000Z'
        };
        repository.store.memories.push(memoryFixture({
            id: 'mem_cache',
            workspacePath,
            title: 'Cache policy',
            content: 'Retrieval cache should be reused until source data changes.'
        }));
        repository.store.codeChunks[key] = [codeChunkFixture(workspacePath, {
            id: 'chunk_cache',
            title: 'Cache chunk',
            content: 'Retrieval cache code chunk content.'
        })];

        const first = await service.suggestContext({
            workspacePath,
            prompt: 'cache',
            sourceKinds: ['project-memory', 'code'],
            tokenBudget: 2000,
            limit: 5
        });
        expect(first.suggestions.map(suggestion => suggestion.id)).to.include('mem_cache');
        const cacheWritesAfterFirst = repository.cacheWriteCount;

        const second = await service.suggestContext({
            workspacePath,
            prompt: 'cache',
            sourceKinds: ['project-memory', 'code'],
            tokenBudget: 2000,
            limit: 5
        });
        expect(second.suggestions.map(suggestion => suggestion.id)).to.deep.equal(first.suggestions.map(suggestion => suggestion.id));
        expect(second.estimatedTokens).to.equal(first.estimatedTokens);
        expect(second.omittedCount).to.equal(first.omittedCount);
        expect(repository.cacheHits).to.equal(1);
        expect(repository.cacheMisses).to.equal(1);
        expect(repository.cacheWriteCount).to.equal(cacheWritesAfterFirst);

        await service.suggestContext({
            workspacePath,
            prompt: 'cache',
            sourceKinds: ['project-memory', 'code'],
            tokenBudget: 20,
            limit: 5
        });
        expect(repository.cacheWriteCount).to.equal(cacheWritesAfterFirst + 1);

        const baselineWrites = repository.cacheWriteCount;
        const mutateAndExpectMiss = async (mutate: () => void | Promise<void>): Promise<void> => {
            await mutate();
            await service.suggestContext({
                workspacePath,
                prompt: 'cache',
                sourceKinds: ['project-memory', 'code'],
                tokenBudget: 2000,
                limit: 5
            });
            expect(repository.cacheWriteCount).to.equal(++expectedWrites);
        };
        let expectedWrites = baselineWrites;

        await mutateAndExpectMiss(() => {
            repository.store.memories[0] = { ...repository.store.memories[0], updatedAt: '2026-01-02T00:00:00.000Z' };
        });
        await mutateAndExpectMiss(() => {
            repository.store.feedbackRecords.push({
                id: 'feedback_cache',
                workspacePath,
                targetKind: 'context-suggestion',
                targetId: 'mem_cache',
                feedback: 'accepted',
                createdAt: '2026-01-03T00:00:00.000Z'
            });
        });
        await mutateAndExpectMiss(() => {
            repository.store.knowledgeGraphs.push({
                id: 'kg_cache',
                workspacePath,
                scope: 'workspace',
                title: 'Cache graph',
                status: 'active',
                concepts: [],
                links: [],
                createdAt: '2026-01-04T00:00:00.000Z',
                updatedAt: '2026-01-04T00:00:00.000Z'
            });
        });
        await mutateAndExpectMiss(() => {
            repository.store.codeChunks[key] = [
                ...repository.store.codeChunks[key],
                codeChunkFixture(workspacePath, {
                    id: 'chunk_cache_changed',
                    title: 'Changed cache chunk',
                    content: 'Retrieval cache changed code chunk content.',
                    indexedAt: '2026-01-05T00:00:00.000Z'
                })
            ];
        });
        await mutateAndExpectMiss(() => {
            repository.store.settings[key] = {
                ...repository.store.settings[key],
                updatedAt: '2026-01-06T00:00:00.000Z'
            };
        });
    });

    it('returns explainable ranked suggestions with feedback records as a retrieval source', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        const workspacePath = '/workspace';
        repository.store.memories.push(memoryFixture({
            id: 'mem_feedback_rank',
            workspacePath,
            scope: 'workspace',
            title: 'Cache policy',
            content: 'Use local cache policy ranking coordination for project intelligence retrieval.',
            staleStatus: 'possibly_stale',
            importance: 'high',
            weight: 0.9,
            evidence: 'Reviewed architecture note'
        }));
        repository.store.feedbackRecords.push({
            id: 'feedback_rank_accept',
            workspacePath,
            targetKind: 'context-suggestion',
            targetId: 'mem_feedback_rank',
            targetSourceKind: 'project-memory',
            targetTitle: 'Cache policy',
            feedback: 'accepted',
            reason: 'Useful for cache ranking prompts.',
            evidence: 'Human accepted this suggestion.',
            createdAt: '2026-01-02T00:00:00.000Z'
        }, {
            id: 'feedback_rank_reject',
            workspacePath,
            targetKind: 'context-suggestion',
            targetId: 'other_result',
            targetSourceKind: 'code',
            targetTitle: 'Old cache policy ranking snippet',
            feedback: 'rejected',
            reason: 'Prefer the local cache policy.',
            evidence: 'Human rejected stale code context.',
            metadata: {
                correction: 'Use the project memory cache policy instead.'
            },
            createdAt: '2026-01-03T00:00:00.000Z'
        });

        const result = await service.suggestContext({
            workspacePath,
            prompt: 'cache policy ranking',
            sourceKinds: ['project-memory', 'feedback-record'],
            tokenBudget: 2000,
            limit: 5
        });

        const memorySuggestion = result.suggestions.find(suggestion => suggestion.id === 'mem_feedback_rank');
        const feedbackSuggestion = result.suggestions.find(suggestion => suggestion.id === 'feedback_rank_reject');
        expect(memorySuggestion?.sourceKind).to.equal('project-memory');
        expect(memorySuggestion?.reason).to.contain('Reviewed architecture note');
        expect(memorySuggestion?.reason).to.contain('scope=workspace');
        expect(memorySuggestion?.reason).to.contain('stale=possibly_stale');
        expect(memorySuggestion?.reason).to.contain('importance=high');
        expect(memorySuggestion?.reason).to.contain('weight=0.9');
        expect(memorySuggestion?.reason).to.contain('feedback=1.05');
        expect(feedbackSuggestion?.sourceKind).to.equal('feedback-record');
        expect(feedbackSuggestion?.title).to.equal('Rejected feedback: Old cache policy ranking snippet');
        expect(feedbackSuggestion?.reason).to.contain('pi_feedback_records:rejected:unresolved');
    });

    it('suggests explainable onboarding questions from graph, memories, local docs, risks, and decisions', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        const workspacePath = '/workspace';
        const key = repository.workspaceKey(workspacePath);
        repository.store.files[key] = [
            fileFixture({ id: 'file_app', relativePath: 'src/app.ts', fileName: 'app.ts' }),
            fileFixture({ id: 'file_readme', relativePath: 'README.md', fileName: 'README.md', extension: '.md', languageId: 'markdown' })
        ];
        repository.store.symbols[key] = [{
            id: 'symbol_app',
            fileId: 'file_app',
            languageId: 'typescript',
            symbolKind: 'class',
            name: 'AppCoordinator'
        }, ...[0, 1, 2, 3, 4].map(index => ({
            id: `symbol_dep_${index}`,
            fileId: 'file_app',
            languageId: 'typescript',
            symbolKind: 'method' as const,
            name: `dependency${index}`
        }))];
        repository.store.relations[key] = [0, 1, 2, 3, 4].map(index => ({
            id: `rel_${index}`,
            sourceKind: 'symbol' as const,
            sourceId: 'symbol_app',
            targetKind: 'symbol' as const,
            targetId: `symbol_dep_${index}`,
            relationType: 'calls' as const,
            confidenceLevel: 'extracted' as const,
            confidenceScore: 0.9
        }));
        repository.store.codeChunks[key] = [codeChunkFixture(workspacePath, {
            id: 'doc_onboarding',
            fileId: 'file_readme',
            relativePath: 'README.md',
            chunkKind: 'markdown-section',
            title: 'Contributor setup',
            content: 'Run local setup and read architecture notes before changing code.',
            estimatedTokens: 20
        })];
        repository.store.memories.push(memoryFixture({
            id: 'mem_decision',
            workspacePath,
            memoryType: 'project_decision',
            title: 'Keep retrieval local-first',
            content: 'Do not require remote services for contributor onboarding.',
            evidence: 'ADR-001',
            importance: 'critical',
            weight: 0.95
        }));
        repository.store.changeImpacts.push({
            id: 'impact_auth',
            workspacePath,
            relativePath: 'src/auth.ts',
            summary: 'Authentication changes have high blast radius.',
            riskScore: 91,
            createdAt: '2026-01-01T00:00:00.000Z'
        });
        repository.store.knowledgeGraphs.push(knowledgeGraphFixture(workspacePath));

        const dashboard = await service.getDashboard(workspacePath);
        const bySource = new Set(dashboard.suggestedQuestions.map(question => question.source));

        expect([...bySource]).to.include.members(['project-memory', 'decision', 'risk', 'code-graph', 'local-docs', 'knowledge-graph']);
        expect(dashboard.suggestedQuestions[0]).to.include({
            source: 'project-memory',
            evidence: 'ADR-001',
            scope: 'workspace'
        });
        expect(dashboard.suggestedQuestions.find(question => question.source === 'risk')?.evidence).to.contain('change-impact:impact_auth');
        expect(dashboard.suggestedQuestions.find(question => question.source === 'local-docs')?.uri).to.equal('README.md');
    });

    it('falls back to BM25-style memory search when vector search is disabled', async () => {
        const repository = new FtsMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        const workspacePath = '/workspace';
        const key = repository.workspaceKey(workspacePath);
        repository.store.settings[key] = {
            workspacePath,
            enabled: true,
            graphEnabled: false,
            memoryEnabled: true,
            skillSuggestionsEnabled: true,
            vectorSearch: {
                enabled: false,
                localModelId: 'local',
                dimensions: 384,
                backfillStatus: 'not_started'
            },
            updatedAt: '2026-01-01T00:00:00.000Z'
        };
        repository.memorySearchHits = [{
            ...memoryFixture({
                id: 'mem_bm25_fallback',
                workspacePath,
                title: 'BM25 fallback policy',
                content: 'BM25 fallback should retrieve memory text without vector consent.'
            }),
            snippet: 'BM25 fallback should retrieve memory text.',
            score: 0.82,
            evidence: 'pi_memory_items_fts:bm25'
        }];
        repository.store.memoryVectors.push({
            id: 'vector_unused',
            memoryId: 'mem_bm25_fallback',
            workspacePath,
            scope: 'workspace',
            modelId: 'local',
            dimensions: 384,
            contentHash: 'hash',
            vector: new Array(384).fill(0.1),
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z'
        });

        const result = await service.suggestContext({
            workspacePath,
            prompt: 'BM25 fallback vector',
            sourceKinds: ['project-memory'],
            tokenBudget: 2000,
            limit: 5
        });

        expect(repository.memorySearchCalls).to.have.length(1);
        expect(repository.memorySearchCalls[0].ftsQuery).to.contain('"bm25"');
        expect(repository.memorySearchCalls[0].ftsQuery).to.contain('"fallback"');
        expect(result.suggestions.map(suggestion => suggestion.id)).to.deep.equal(['mem_bm25_fallback']);
        expect(result.suggestions[0].reason).to.contain('pi_memory_items_fts:bm25');
        expect(result.suggestions[0].reason).not.to.contain('pi_memory_vectors');
    });

    it('keeps BM25 memory search results when the optional vector backend fails', async () => {
        const repository = new FailingVectorMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        const workspacePath = '/workspace';
        const key = repository.workspaceKey(workspacePath);
        repository.store.settings[key] = {
            workspacePath,
            enabled: true,
            graphEnabled: false,
            memoryEnabled: true,
            skillSuggestionsEnabled: true,
            vectorSearch: {
                enabled: true,
                userConsentAt: '2026-01-01T00:00:00.000Z',
                localModelId: 'pi-local-hash-embedding-v1',
                dimensions: 64,
                backfillStatus: 'completed'
            },
            updatedAt: '2026-01-01T00:00:00.000Z'
        };
        repository.memorySearchHits = [{
            ...memoryFixture({
                id: 'mem_vector_backend_failure',
                workspacePath,
                title: 'BM25 survives vector failure',
                content: 'BM25 fallback remains mandatory when the local vector backend fails.'
            }),
            snippet: 'BM25 fallback remains mandatory.',
            score: 0.79,
            evidence: 'pi_memory_items_fts:bm25'
        }];

        const result = await service.suggestContext({
            workspacePath,
            prompt: 'BM25 vector failure',
            sourceKinds: ['project-memory'],
            tokenBudget: 2000,
            limit: 5
        });

        expect(repository.memorySearchCalls).to.have.length(1);
        expect(repository.vectorSearchCalls).to.have.length(1);
        expect(result.suggestions.map(suggestion => suggestion.id)).to.deep.equal(['mem_vector_backend_failure']);
        expect(result.suggestions[0].reason).to.contain('pi_memory_items_fts:bm25');
        expect(result.suggestions[0].reason).not.to.contain('pi_memory_vectors');
    });

    it('uses Git remote identity for repository-scoped memories when available', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new RepositoryIdentityMemoryService('git@github.com:Acme/Project.git');
        attachRepository(service, repository);

        const memory = await service.addMemory({
            workspacePath: '/workspace',
            scope: 'repository',
            memoryType: 'project_decision',
            title: 'Repository decision',
            content: 'Share this decision across clones of the same remote.'
        });

        expect(memory.repositoryUrl).to.equal('git@github.com:Acme/Project.git');
        expect(memory.repositoryId).to.equal('github.com/acme/project');
        expect(memory.workspacePath).to.equal('/workspace');
    });

    it('uses a deterministic local repository identity outside Git without blocking memory creation', async () => {
        const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'pi-non-git-workspace-'));
        const repository = new InMemoryStoreRepository();
        const service = new RepositoryIdentityMemoryService(undefined);
        attachRepository(service, repository);

        const first = await service.addMemory({
            workspacePath,
            scope: 'repository',
            memoryType: 'project_decision',
            title: 'Local repository decision',
            content: 'A workspace outside Git still receives a stable local repository id.'
        });
        const second = await service.addMemory({
            workspacePath,
            scope: 'repository',
            memoryType: 'project_decision',
            title: 'Another local repository decision',
            content: 'The local repository id is deterministic for the workspace path.'
        });

        expect(first.repositoryUrl).to.equal(undefined);
        expect(first.repositoryId).to.match(/^local:[0-9a-f]{24}$/);
        expect(second.repositoryId).to.equal(first.repositoryId);
    });

    it('imports graphify-out graph JSON as review-only knowledge candidates without Graphify runtime', async () => {
        const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'pi-graphify-import-'));
        await fs.mkdir(path.join(workspacePath, 'graphify-out'));
        await fs.writeFile(path.join(workspacePath, 'graphify-out', 'graph.json'), JSON.stringify({
            title: 'Graphify project graph',
            nodes: [
                { id: 'api', label: 'API layer', type: 'component', description: 'Receives requests.' },
                { id: 'db', label: 'Database', type: 'component', description: 'Stores records.' }
            ],
            edges: [
                { source: 'api', target: 'db', type: 'depends_on', confidence: 0.8 },
                { source: 'api', target: 'missing', type: 'depends_on' }
            ]
        }), 'utf8');
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        repository.store.memories = [
            memoryFixture({
                id: 'mem_active_decision',
                workspacePath,
                title: 'Active architecture decision',
                content: 'Keep the existing active memory when Graphify imports inferred graph data.',
                status: 'active'
            })
        ];

        const result = await service.importGraphifyGraph({ workspacePath });

        expect(result.importedKnowledgeConceptCandidates).to.equal(2);
        expect(result.importedKnowledgeLinkCandidates).to.equal(1);
        expect(result.skippedEdges).to.equal(1);
        expect(repository.store.memories).to.have.length(1);
        expect(repository.store.memories[0]).to.include({
            id: 'mem_active_decision',
            status: 'active',
            content: 'Keep the existing active memory when Graphify imports inferred graph data.'
        });
        const imported = repository.store.knowledgeGraphs.find(graph => graph.id === result.graphId);
        expect(imported?.metadata?.importedFrom).to.equal('graphify-out/graph.json');
        expect(imported?.metadata?.originMarkers).to.include('imported-graphify');
        expect(imported?.metadata?.reviewRequired).to.equal(true);
        expect(imported?.concepts.map(concept => concept.status)).to.deep.equal(['candidate', 'candidate']);
        expect(imported?.concepts.every(concept => concept.metadata?.reviewRequired === true)).to.equal(true);
        expect(imported?.concepts[0].metadata?.originMarkers).to.include('imported-graphify');
        expect(imported?.links[0].status).to.equal('candidate');
        expect(imported?.links[0].metadata?.reviewRequired).to.equal(true);
        expect(imported?.links[0].linkKind).to.equal('depends_on');
        expect(imported?.links[0].confidenceScore).to.equal(0.8);
        expect(imported?.links[0].metadata?.source).to.equal('graphify');
        expect(imported?.links[0].metadata?.originalRelation).to.equal('depends_on');
        expect(imported?.links[0].metadata?.originMarkers).to.include('imported-graphify');
        const normalSearch = await service.searchKnowledge({ workspacePath, query: 'Database' });
        const reviewSearch = await service.searchKnowledge({ workspacePath, query: 'Database', includeArchived: true });
        expect(normalSearch.map(item => item.id)).to.not.include(imported?.concepts[1].id);
        expect(reviewSearch.map(item => item.id)).to.include(imported?.concepts[1].id);
        const snapshot = repository.store.graphSnapshots.find(candidate => candidate.label === 'Graphify Imported Graph');
        const snapshotGraph = JSON.parse(snapshot?.graphJson ?? '{}');
        expect(snapshot?.workspacePath).to.equal(workspacePath);
        expect(snapshotGraph.kind).to.equal('knowledge');
        expect(snapshotGraph.metadata.originMarkers).to.include('imported-graphify');
        expect(snapshotGraph.edges[0].relationType).to.equal('depends_on');
        expect(snapshotGraph.edges[0].confidenceScore).to.equal(0.8);
        expect(snapshotGraph.edges[0].metadata.source).to.equal('graphify');
        const bundle = await service.exportWorkspaceData({ workspacePath });
        const graphArtifact = bundle.artifacts?.find(artifact => artifact.path === 'cybervinci-project-graph.json');
        const graphJson = JSON.parse(graphArtifact?.content ?? '{}');
        expect(graphJson.concepts[0].originMarkers).to.include('imported-graphify');
        expect(graphJson.links[0].originMarkers).to.include('imported-graphify');
        const event = repository.store.events.find(candidate => candidate.eventType === 'import.completed' && candidate.payload?.includes('graphify-graph-json'));
        expect(event?.eventType).to.equal('import.completed');
        expect(event?.payload).to.contain('graphify-graph-json');
    });

    it('returns a Graphify import diff and skips duplicate conflicting obsolete and sensitive candidates', async () => {
        const workspacePath = '/workspace';
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        const key = repository.workspaceKey(workspacePath);
        repository.store.files[key] = [
            fileFixture({ id: 'file_current', relativePath: 'src/current.ts', fileName: 'current.ts', contentHash: 'current-hash' }),
            fileFixture({ id: 'file_secret', relativePath: 'src/secret.ts', fileName: 'secret.ts', contentHash: 'secret-hash', isSensitive: true })
        ];
        repository.store.knowledgeGraphs = [{
            id: 'kg_existing',
            workspacePath,
            scope: 'workspace',
            title: 'Existing graph',
            status: 'active',
            tags: [],
            concepts: [{
                id: 'kg_existing_concept',
                graphId: 'kg_existing',
                kind: 'component',
                title: 'Existing component',
                summary: 'Already imported.',
                status: 'active',
                sourceKind: 'knowledge-graph',
                sourceId: 'existing',
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z'
            }],
            links: [],
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z'
        }];

        const result = await service.importGraphifyGraph({
            workspacePath,
            graphJson: JSON.stringify({
                nodes: [
                    { id: 'new', label: 'New component', type: 'component', description: 'New safe node.' },
                    { id: 'duplicate', label: 'Existing component', type: 'component', description: 'Already imported.' },
                    { id: 'conflict', label: 'Changed file', type: 'file', path: 'src/current.ts', contentHash: 'portable-hash' },
                    { id: 'obsolete', label: 'Removed file', type: 'file', path: 'src/removed.ts', contentHash: 'removed-hash' },
                    { id: 'sensitive', label: 'Sensitive file', type: 'file', path: 'src/secret.ts', contentHash: 'secret-hash' },
                    { id: 'secretText', label: 'Secret text', type: 'component', description: 'API_KEY=abcdefghijklmnopqrstuvwxyz123456' }
                ],
                edges: [
                    { source: 'new', target: 'duplicate', type: 'depends_on' }
                ]
            })
        });

        expect(result.diff.map(entry => [entry.title, entry.classification])).to.deep.include.members([
            ['New component', 'new'],
            ['Existing component', 'duplicate'],
            ['Changed file', 'conflicting'],
            ['Removed file', 'obsolete'],
            ['Sensitive file', 'sensitive'],
            ['Secret text', 'sensitive'],
            ['New component depends_on Existing component', 'duplicate']
        ]);
        expect(result.importedKnowledgeConceptCandidates).to.equal(1);
        expect(result.importedKnowledgeLinkCandidates).to.equal(0);
        const imported = repository.store.knowledgeGraphs.find(graph => graph.id === result.graphId);
        expect(imported?.concepts.map(concept => concept.title)).to.deep.equal(['New component']);
        expect(imported?.links).to.deep.equal([]);
    });

    it('does not make Graphify a required package dependency', async () => {
        const packageJsonPath = path.resolve(__dirname, '..', '..', 'package.json');
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8')) as {
            dependencies?: Record<string, string>;
            devDependencies?: Record<string, string>;
            peerDependencies?: Record<string, string>;
            optionalDependencies?: Record<string, string>;
        };
        const dependencyNames = [
            ...Object.keys(packageJson.dependencies ?? {}),
            ...Object.keys(packageJson.devDependencies ?? {}),
            ...Object.keys(packageJson.peerDependencies ?? {}),
            ...Object.keys(packageJson.optionalDependencies ?? {})
        ];

        expect(dependencyNames.filter(name => name.toLowerCase().includes('graphify'))).to.deep.equal([]);
    });

    it('normalizes and persists global workspace repository session and task memories', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new RepositoryIdentityMemoryService('https://github.com/acme/project.git');
        attachRepository(service, repository);
        const workspacePath = '/workspace';

        const global = await service.addMemory({
            workspacePath,
            scope: 'global',
            memoryType: 'user_preference',
            title: 'Global IDE memory',
            content: 'Applies across all workspaces.'
        });
        const workspace = await service.addMemory({
            workspacePath,
            scope: 'workspace',
            memoryType: 'project_decision',
            title: 'Workspace memory',
            content: 'Applies only to this workspace.'
        });
        const repositoryMemory = await service.addMemory({
            workspacePath,
            scope: 'repository',
            memoryType: 'project_decision',
            title: 'Repository memory',
            content: 'Applies to clones of this remote.'
        });
        const session = await service.addMemory({
            workspacePath,
            scope: 'session',
            sessionId: 'session_alpha',
            expiresAt: '2026-02-01T00:00:00.000Z',
            retentionPolicy: 'ttl',
            memoryType: 'manual_note',
            title: 'Session memory',
            content: 'Temporary session context.'
        });
        const task = await service.addMemory({
            workspacePath,
            scope: 'task',
            taskId: 'task_alpha',
            expiresAt: '2026-02-01T00:00:00.000Z',
            retentionPolicy: 'task',
            memoryType: 'manual_note',
            title: 'Task memory',
            content: 'Temporary task context.'
        });

        expect(global.workspacePath).to.equal(undefined);
        expect(global.memorySpaceId).to.equal('default:global');
        expect(workspace.workspacePath).to.equal(workspacePath);
        expect(workspace.memorySpaceId).to.equal(`default:workspace:${workspacePath}`);
        expect(repositoryMemory.repositoryUrl).to.equal('https://github.com/acme/project.git');
        expect(repositoryMemory.repositoryId).to.equal('github.com/acme/project');
        expect(repositoryMemory.memorySpaceId).to.equal('default:repository:github.com/acme/project');
        expect(session.sessionId).to.equal('session_alpha');
        expect(session.retentionPolicy).to.equal('ttl');
        expect(session.memorySpaceId).to.equal('default:session:session_alpha');
        expect(task.taskId).to.equal('task_alpha');
        expect(task.retentionPolicy).to.equal('task');
        expect(task.memorySpaceId).to.equal('default:task:task_alpha');
        expect(repository.store.memories.map(memory => memory.id)).to.have.members([
            global.id,
            workspace.id,
            repositoryMemory.id,
            session.id,
            task.id
        ]);
        expect(repository.store.memorySpaces.map(space => space.id)).to.have.members([
            'default:global',
            `default:workspace:${workspacePath}`,
            'default:repository:github.com/acme/project',
            'default:session:session_alpha',
            'default:task:task_alpha'
        ]);
        expect(repository.store.memorySpaces.find(space => space.id === 'default:global')?.workspacePath).to.equal(undefined);
    });

    it('exports redacted portable artifacts and omits global memories unless explicitly requested', async () => {
        const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'pi-portable-export-'));
        await fs.writeFile(path.join(workspacePath, 'Service.cs'), csharpFile('Service', 'Use dependency graph exports'), 'utf8');
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        const secret = 'abcdefghijklmnopqrstuvwxyz123456';

        await service.indexWorkspace({ workspacePath });
        const globalMemory = await service.addMemory({
            workspacePath,
            scope: 'global',
            memoryType: 'user_preference',
            title: 'IDE-wide export preference',
            content: 'This global preference must stay out of normal workspace exports.'
        });
        const workspaceMemory = await service.addMemory({
            workspacePath,
            scope: 'workspace',
            memoryType: 'project_decision',
            title: 'Portable export decision',
            content: `Export portable artifacts without leaking API_KEY=${secret}.`,
            evidence: `Reviewer noted token ${secret} in source evidence.`,
            source: 'manual'
        });

        const bundle = await service.exportWorkspaceData({ workspacePath });
        const artifactByPath = new Map((bundle.artifacts ?? []).map(artifact => [artifact.path, artifact]));
        const serializedBundle = JSON.stringify(bundle);

        expect(bundle.memories.map(memory => memory.id)).to.include(workspaceMemory.id);
        expect(serializedBundle).to.not.contain(globalMemory.id);
        expect(serializedBundle).to.not.contain(secret);
        expect(Array.from(artifactByPath.keys())).to.have.members([
            'metadata.json',
            'memories.json',
            'context-pack.md',
            'report.md',
            'graph.json',
            'graphify-out/graph.json',
            'cybervinci-project-report.md',
            'cybervinci-project-graph.json',
            'cybervinci-project-graph.graphml',
            'cybervinci-project-graph.html',
            'cybervinci-project-callflow.svg'
        ]);

        const metadata = JSON.parse(artifactByPath.get('metadata.json')?.content ?? '{}');
        const memories = JSON.parse(artifactByPath.get('memories.json')?.content ?? '{}');
        const graph = JSON.parse(artifactByPath.get('cybervinci-project-graph.json')?.content ?? '{}');
        const graphifyGraph = JSON.parse(artifactByPath.get('graphify-out/graph.json')?.content ?? '{}');
        expect(metadata.scope.includeGlobalMemories).to.equal(false);
        expect(metadata.scope.memoryScopes.global).to.equal(undefined);
        expect(memories.memories.map((memory: MemoryItem) => memory.id)).to.include(workspaceMemory.id);
        expect(graph.source).to.equal('cybervinci-memory');
        expect(graph.metadata.fileCount).to.equal(1);
        expect(graphifyGraph.compatibility).to.include({
            format: 'graphify-out/graph.json',
            graphifyRuntimeRequired: false,
            rawSourceContentIncluded: false,
            rawEvidenceIncluded: false,
            secretsRedacted: true
        });
        expect(graphifyGraph.nodes).to.be.an('array');
        expect(graphifyGraph.edges).to.be.an('array');
        expect(artifactByPath.get('cybervinci-project-report.md')?.content).to.contain('# CyberVinci Project Report');
        expect(artifactByPath.get('cybervinci-project-graph.graphml')?.content).to.contain('<graphml xmlns="http://graphml.graphdrawing.org/xmlns">');
        expect(artifactByPath.get('cybervinci-project-graph.html')?.content).to.contain('cybervinci-project-graph-data');
        expect((bundle.artifacts ?? []).map(artifact => artifact.content).join('\n')).to.not.contain(secret);

        const explicitGlobalBundle = await service.exportWorkspaceData({ workspacePath, includeGlobalMemories: true });
        expect(explicitGlobalBundle.memories.map(memory => memory.id)).to.include.members([globalMemory.id, workspaceMemory.id]);

        try {
            await service.installPortableMemory({ workspacePath, confirmed: false });
            expect.fail('Expected portable install to require explicit confirmation.');
        } catch (error) {
            expect(error).to.be.instanceOf(Error);
            expect((error as Error).message).to.contain('Explicit user confirmation is required');
        }

        const install = await service.installPortableMemory({ workspacePath, confirmed: true });
        expect(install.files).to.include.members([
            'cybervinci-memory-bundle.json',
            'cybervinci-project-report.md',
            'cybervinci-project-graph.json',
            'graphify-out/graph.json',
            'cybervinci-project-graph.graphml',
            'cybervinci-project-graph.html'
        ]);
        const installedGraph = await fs.readFile(path.join(install.installPath, 'cybervinci-project-graph.json'), 'utf8');
        expect(installedGraph).to.not.contain(secret);
    });

    it('rejects portable artifact paths that escape the install directory', async () => {
        const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'pi-portable-path-policy-'));
        const installPath = path.join(workspacePath, '.cybervinci', 'memory');
        const outsidePath = path.join(workspacePath, 'escaped.md');
        const service = new PortablePathPolicyMemoryService();

        for (const artifactPath of ['../escaped.md', 'graphify-out/../../escaped.md', '/absolute.md', 'C:/absolute.md']) {
            try {
                await service.writePortableInstallFileForTest(installPath, artifactPath, 'escaped');
                expect.fail(`Expected ${artifactPath} to be rejected.`);
            } catch (error) {
                expect(error).to.be.instanceOf(Error);
                expect((error as Error).message).to.match(/Invalid portable artifact path|escapes install directory/);
            }
        }

        await service.writePortableInstallFileForTest(installPath, 'graphify-out/graph.json', '{"safe":true}');

        await expectPathExists(path.join(installPath, 'graphify-out', 'graph.json'));
        await expectPathMissing(outsidePath);
    });

    it('retrieves only in-scope memories and filters expired session and task memories', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new RepositoryIdentityMemoryService('https://github.com/acme/project.git');
        attachRepository(service, repository);
        const sameRepositoryClone = '/clone/project';
        const otherRepositoryClone = '/clone/other-project';
        repository.store.memories = [
            memoryFixture({
                id: 'mem_global',
                workspacePath: '/workspace',
                scope: 'global',
                title: 'Scope contract global',
                content: 'Scope contract memory shared by the IDE.'
            }),
            memoryFixture({
                id: 'mem_workspace',
                workspacePath: sameRepositoryClone,
                scope: 'workspace',
                title: 'Scope contract workspace',
                content: 'Scope contract memory for this workspace path.'
            }),
            memoryFixture({
                id: 'mem_repository',
                workspacePath: '/different/clone/of/project',
                scope: 'repository',
                repositoryUrl: 'https://github.com/acme/project.git',
                repositoryId: 'github.com/acme/project',
                title: 'Scope contract repository',
                content: 'Scope contract memory shared by repository identity.'
            }),
            memoryFixture({
                id: 'mem_session',
                workspacePath: sameRepositoryClone,
                scope: 'session',
                sessionId: 'session_alpha',
                expiresAt: '2099-06-01T00:00:00.000Z',
                retentionPolicy: 'ttl',
                title: 'Scope contract session',
                content: 'Scope contract active session memory.'
            }),
            memoryFixture({
                id: 'mem_task',
                workspacePath: sameRepositoryClone,
                scope: 'task',
                taskId: 'task_alpha',
                expiresAt: '2099-06-01T00:00:00.000Z',
                retentionPolicy: 'task',
                title: 'Scope contract task',
                content: 'Scope contract active task memory.'
            }),
            memoryFixture({
                id: 'mem_expired_session',
                workspacePath: sameRepositoryClone,
                scope: 'session',
                sessionId: 'session_old',
                expiresAt: '2026-01-01T00:00:00.000Z',
                retentionPolicy: 'ttl',
                title: 'Scope contract expired session',
                content: 'Scope contract expired session memory.'
            }),
            memoryFixture({
                id: 'mem_expired_task',
                workspacePath: sameRepositoryClone,
                scope: 'task',
                taskId: 'task_old',
                expiresAt: '2026-01-01T00:00:00.000Z',
                retentionPolicy: 'task',
                title: 'Scope contract expired task',
                content: 'Scope contract expired task memory.'
            }),
            memoryFixture({
                id: 'mem_other_workspace',
                workspacePath: otherRepositoryClone,
                scope: 'workspace',
                title: 'Scope contract other workspace',
                content: 'Scope contract memory from another workspace.'
            }),
            memoryFixture({
                id: 'mem_other_repository',
                workspacePath: undefined,
                scope: 'repository',
                repositoryUrl: 'https://github.com/acme/other-project.git',
                repositoryId: 'github.com/acme/other-project',
                title: 'Scope contract other repository',
                content: 'Scope contract memory from another repository.'
            })
        ];

        const results = await service.search({
            workspacePath: sameRepositoryClone,
            text: 'scope contract',
            limit: 20,
            sourceKinds: ['project-memory', 'repository-memory', 'task-memory'],
            taskId: 'task_alpha'
        });

        expect(results.map(result => result.id)).to.have.members([
            'mem_global',
            'mem_workspace',
            'mem_repository',
            'mem_session',
            'mem_task'
        ]);
        expect(results.find(result => result.id === 'mem_task')?.sourceKind).to.equal('task-memory');

        const projectMemoryOnly = await service.search({
            workspacePath: sameRepositoryClone,
            text: 'scope contract',
            limit: 20,
            sourceKinds: ['project-memory']
        });
        const taskWithoutId = await service.search({
            workspacePath: sameRepositoryClone,
            text: 'scope contract',
            limit: 20,
            sourceKinds: ['task-memory']
        });

        expect(projectMemoryOnly.map(result => result.id)).to.have.members([
            'mem_global',
            'mem_workspace',
            'mem_session'
        ]);
        expect(taskWithoutId).to.deep.equal([]);
    });

    it('retrieves repository memory as its own source by repository identity', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new RepositoryIdentityMemoryService('https://github.com/acme/project.git');
        attachRepository(service, repository);
        repository.store.memories = [
            memoryFixture({
                id: 'mem_workspace',
                workspacePath: '/clone/project',
                scope: 'workspace',
                title: 'Shared architecture rule',
                content: 'Shared architecture rule belongs only to this workspace.'
            }),
            memoryFixture({
                id: 'mem_repository',
                workspacePath: '/other/clone/project',
                scope: 'repository',
                repositoryUrl: 'https://github.com/acme/project.git',
                repositoryId: 'github.com/acme/project',
                title: 'Shared architecture rule',
                content: 'Shared architecture rule follows clones of the same repository.'
            }),
            memoryFixture({
                id: 'mem_other_repository',
                workspacePath: '/other/clone/elsewhere',
                scope: 'repository',
                repositoryUrl: 'https://github.com/acme/elsewhere.git',
                repositoryId: 'github.com/acme/elsewhere',
                title: 'Shared architecture rule',
                content: 'Shared architecture rule from a different repository.'
            })
        ];

        const projectResults = await service.search({
            workspacePath: '/clone/project',
            text: 'shared architecture rule',
            limit: 10,
            sourceKinds: ['project-memory']
        });
        const repositoryResults = await service.search({
            workspacePath: '/clone/project',
            text: 'shared architecture rule',
            limit: 10,
            sourceKinds: ['repository-memory']
        });

        expect(projectResults.map(result => result.id)).to.deep.equal(['mem_workspace']);
        expect(repositoryResults.map(result => result.id)).to.deep.equal(['mem_repository']);
        expect(repositoryResults[0].sourceKind).to.equal('repository-memory');
    });

    it('retrieves local repository memory in workspaces without Git remote', async () => {
        const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'pi-local-repo-retrieval-'));
        const service = new RepositoryIdentityMemoryService(undefined);
        const repository = new InMemoryStoreRepository();
        attachRepository(service, repository);
        const localMemory = await service.addMemory({
            workspacePath,
            scope: 'repository',
            memoryType: 'project_decision',
            title: 'Local repository retrieval',
            content: 'Local repository retrieval works without Git remote.'
        });
        repository.store.memories.push(memoryFixture({
            id: 'mem_other_local_repository',
            workspacePath: '/elsewhere',
            scope: 'repository',
            repositoryId: 'local:000000000000000000000000',
            title: 'Local repository retrieval',
            content: 'Local repository retrieval from another workspace.'
        }));

        const results = await service.search({
            workspacePath,
            text: 'local repository retrieval',
            limit: 10,
            sourceKinds: ['repository-memory']
        });

        expect(localMemory.repositoryUrl).to.equal(undefined);
        expect(localMemory.repositoryId).to.match(/^local:[0-9a-f]{24}$/);
        expect(results.map(result => result.id)).to.deep.equal([localMemory.id]);
        expect(results[0].sourceKind).to.equal('repository-memory');
    });

    it('proposes deterministic memory candidates from EN/PT learning signals without activating them', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);

        const result = await service.proposeMemoryCandidate({
            workspacePath: '/workspace',
            text: [
                'We decided to keep context approval explicit.',
                'I prefer compact IDE prompts.',
                'Run command: pnpm build.',
                'O comando de teste é npm test.',
                'Nota de segurança: nunca registrar tokens.'
            ].join('\n'),
            source: 'unit-test'
        });

        expect(result.created).to.equal(5);
        expect(result.deduplicated).to.equal(0);
        expect(result.candidates.every(candidate => candidate.status === 'candidate')).to.equal(true);
        expect(result.candidates.map(candidate => candidate.memoryType)).to.include.members([
            'project_decision',
            'user_preference',
            'command_note',
            'testing_note',
            'security_note'
        ]);
        expect(result.candidates.find(candidate => candidate.memoryType === 'user_preference')?.scope).to.equal('global');
        expect(result.candidates.find(candidate => candidate.memoryType === 'user_preference')?.workspacePath).to.equal(undefined);
        expect(result.candidates.every(candidate => !!candidate.memorySpaceId)).to.equal(true);
        expect(repository.store.memorySpaces.map(space => space.id)).to.include.members([
            'default:global',
            'default:workspace:/workspace'
        ]);
        expect(repository.store.events.filter(event => event.eventType === 'memory.suggested')).to.have.length(5);
        expect(repository.store.memories.some(memory => memory.status === 'active')).to.equal(false);
    });

    it('deduplicates proposed memory candidates by title content workspace and scope', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        const request = {
            workspacePath: '/workspace',
            text: 'We decided to keep PR summaries short.',
            source: 'unit-test'
        };

        const first = await service.proposeMemoryCandidate(request);
        const second = await service.proposeMemoryCandidate(request);

        expect(first.created).to.equal(1);
        expect(second.created).to.equal(0);
        expect(second.deduplicated).to.equal(1);
        expect(second.candidates[0].id).to.equal(first.candidates[0].id);
        expect(repository.store.memories).to.have.length(1);
        expect(repository.store.events.filter(event => event.eventType === 'memory.suggested')).to.have.length(1);
    });

    it('records event evidence when prompt events produce memory candidates', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);

        const event = await service.recordEvent({
            workspacePath: '/workspace',
            eventType: 'terminal.command',
            payload: JSON.stringify({ command: 'Known bug: login fails after refresh.' })
        });

        const candidate = repository.store.memories.find(memory => memory.memoryType === 'bug_history');
        expect(candidate).not.to.equal(undefined);
        expect(candidate?.status).to.equal('candidate');
        expect(candidate?.evidence ?? '').to.contain(`"sourceEventId":"${event.id}"`);
        expect(repository.store.events.some(item => item.eventType === 'memory.suggested')).to.equal(true);
    });

    it('uses minimized prompt.submitted payload signatures without requiring raw prompt text', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);

        const event = await service.recordEvent({
            workspacePath: '/workspace',
            eventType: 'prompt.submitted',
            payload: JSON.stringify({
                promptTextHash: 'sha256:abcdef',
                promptSignature: 'review_change:csharp:normalized',
                source: 'ai-chat',
                sessionId: 'session-1',
                requestId: 'request-1',
                metadata: {
                    promptLength: 42
                }
            })
        });

        expect(event.promptSignature).to.equal('review_change:csharp:normalized');
        expect(event.payload).not.to.contain('"prompt"');
        expect(event.payload).to.contain('promptTextHash');
        expect(repository.store.skillCandidates[0]?.signature).to.equal('review_change:csharp:normalized');
        expect(repository.store.memories.some(memory => memory.source === 'event:prompt.submitted')).to.equal(false);
    });

    it('keeps prompt text hash as audit metadata instead of a repetition signature', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);

        const event = await service.recordEvent({
            workspacePath: '/workspace',
            eventType: 'prompt.submitted',
            payload: JSON.stringify({
                promptTextHash: 'sha256:only-dedup-audit',
                source: 'ai-chat',
                metadata: {
                    promptLength: 42
                }
            })
        });

        expect(event.promptSignature).to.equal(undefined);
        expect(event.payload).to.contain('promptTextHash');
        expect(repository.store.skillCandidates).to.have.length(0);
    });

    it('drops redacted prompt snippets from prompt events until the separate opt-in is enabled', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        const secret = 'abcdefghijklmnopqrstuvwxyz123456';

        const event = await service.recordEvent({
            workspacePath: '/workspace',
            eventType: 'prompt.submitted',
            payload: JSON.stringify({
                promptTextHash: 'sha256:abcdef',
                promptSignature: 'debug_error:csharp:service',
                prompt: `raw prompt ${secret}`,
                redactedPromptSnippet: `debug token ${secret}`,
                metadata: { promptLength: 64 }
            })
        });

        expect(event.payload).to.contain('promptTextHash');
        expect(event.payload).not.to.contain('raw prompt');
        expect(event.payload).not.to.contain('redactedPromptSnippet');
        expect(JSON.stringify(repository.store.events)).not.to.contain(secret);
    });

    it('does not persist raw prompt text in pi_events without prompt snippet opt-in', async function () {
        const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'pi-events-'));
        const storePath = path.join(directory, 'store.db');
        const repository = createSqliteRepositoryIfAvailable(storePath);
        if (!repository) {
            this.skip();
            return;
        }
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        const rawPrompt = 'Debug the payment retry failure using customer email alice@example.com';

        const event = await service.recordEvent({
            workspacePath: '/workspace',
            eventType: 'prompt.submitted',
            payload: JSON.stringify({
                prompt: rawPrompt,
                promptTextHash: 'sha256:payment-retry',
                promptSignature: 'debug_error:csharp:payment',
                redactedPromptSnippet: rawPrompt,
                metadata: { promptLength: rawPrompt.length }
            })
        });
        const persistedPayloads = readSqliteEventPayloadJson(repository, storePath);
        const persisted = persistedPayloads.join('\n');

        expect(event.payload).not.to.contain(rawPrompt);
        expect(event.payload).not.to.contain('redactedPromptSnippet');
        expect(persistedPayloads).to.have.length(1);
        expect(persisted).to.contain('promptTextHash');
        expect(persisted).not.to.contain(rawPrompt);
        expect(persisted).not.to.contain('redactedPromptSnippet');
        expect(persisted).not.to.contain('"prompt"');
    });

    it('stores only the redacted prompt snippet when prompt snippet opt-in is enabled', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        const secret = 'abcdefghijklmnopqrstuvwxyz123456';

        await service.updateSettings({
            workspacePath: '/workspace',
            optIn: { promptSnippets: true }
        });
        const event = await service.recordEvent({
            workspacePath: '/workspace',
            eventType: 'prompt.submitted',
            payload: JSON.stringify({
                promptTextHash: 'sha256:abcdef',
                promptSignature: 'debug_error:csharp:service',
                prompt: `raw prompt ${secret}`,
                redactedPromptSnippet: `debug token ${secret}`,
                metadata: { promptLength: 64 }
            })
        });

        expect(event.payload).to.contain('redactedPromptSnippet');
        expect(event.payload).not.to.contain('raw prompt');
        expect(event.payload).not.to.contain(secret);
        expect(event.payload).to.contain('abcdef********3456');
    });

    it('redacts secrets before returning and persisting transcript or audit events', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        const secret = 'abcdefghijklmnopqrstuvwxyz123456';

        const event = await service.recordEvent({
            workspacePath: '/workspace',
            eventType: 'prompt.submitted',
            payload: JSON.stringify({ prompt: `token = ${secret}` }),
            relativePath: `src/token=${secret}.ts`
        });

        expect(JSON.stringify(event)).not.to.contain(secret);
        expect(JSON.stringify(repository.store.events)).not.to.contain(secret);
        expect(event.payload).not.to.contain('token =');
    });

    it('records transcript messages redacted, blocks raw secrets, and keeps session/task association', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        const secret = 'TOKEN=abcdefghijklmnopqrstuvwxyz123456';

        const session = await service.startTranscriptSession({
            workspacePath: '/workspace',
            sessionId: 'chat-session-1',
            scope: 'session',
            origin: 'ai-chat',
            retentionPolicy: 'ttl'
        });
        const message = await service.recordTranscriptMessage({
            workspacePath: '/workspace',
            transcriptSessionId: session.id,
            sessionId: 'chat-session-1',
            taskId: 'task-1',
            scope: 'task',
            origin: 'ai-chat',
            role: 'user',
            content: `Please inspect auth. ${secret}`,
            retentionPolicy: 'task',
            metadata: {
                note: `metadata ${secret}`
            }
        });

        expect(message.blocked).to.equal(true);
        expect(message.sessionId).to.equal(session.id);
        expect(message.sessionIdHint).to.equal('chat-session-1');
        expect(message.taskId).to.equal('task-1');
        expect(message.redactionStatus).to.equal('blocked');
        expect(message.content).to.contain('abcdef********3456');
        expect(JSON.stringify(message)).not.to.contain(secret);
        expect(JSON.stringify(repository.store.transcriptMessages)).not.to.contain(secret);
        expect(JSON.stringify(repository.store.events)).not.to.contain(secret);
        expect(repository.store.events.some(event => event.eventType === 'transcript.message.recorded')).to.equal(true);
    });

    it('searches opted-in transcripts with scope filters, redaction, token budget, and explanations', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        const secret = 'abcdefghijklmnopqrstuvwxyz123456';

        await service.updateSettings({
            workspacePath: '/workspace',
            optIn: {
                transcriptSearch: true
            }
        });
        const session = await service.startTranscriptSession({
            workspacePath: '/workspace',
            sessionId: 'chat-session-1',
            scope: 'session',
            origin: 'ai-chat',
            retentionPolicy: 'ttl'
        });
        await service.recordTranscriptMessage({
            workspacePath: '/workspace',
            transcriptSessionId: session.id,
            sessionId: 'chat-session-1',
            taskId: 'task-1',
            scope: 'task',
            origin: 'ai-chat',
            role: 'user',
            content: `Auth transcript should redact TOKEN=${secret}.`,
            retentionPolicy: 'task'
        });
        await service.recordTranscriptMessage({
            workspacePath: '/workspace',
            transcriptSessionId: session.id,
            sessionId: 'chat-session-1',
            taskId: 'task-2',
            scope: 'task',
            origin: 'ai-chat',
            role: 'assistant',
            content: 'Unrelated deployment notes that should not match.',
            retentionPolicy: 'task'
        });

        const results = await service.searchTranscripts({
            workspacePath: '/workspace',
            query: 'auth',
            scopes: ['task'],
            sessionId: 'chat-session-1',
            taskId: 'task-1',
            roles: ['user'],
            origins: ['ai-chat'],
            tokenBudget: 100,
            limit: 10
        });

        expect(results).to.have.length(1);
        expect(results[0].snippet).to.contain('********');
        expect(JSON.stringify(results)).not.to.contain(secret);
        expect(results[0].explanation.source).to.equal('pi_transcript_messages');
        expect(results[0].explanation.scope).to.equal('task');
        expect(results[0].explanation.tokenBudgetApplied).to.equal(true);
        expect(results[0].explanation.filters.taskId).to.equal('task-1');
        expect(results[0].explanation.redaction).to.equal('blocked');
    });

    it('keeps transcript search disabled until explicit opt-in', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);

        await service.recordTranscriptMessage({
            workspacePath: '/workspace',
            sessionId: 'chat-session-1',
            role: 'user',
            content: 'Auth transcript exists but search is not opted in.'
        });

        expect(await service.searchTranscripts({
            workspacePath: '/workspace',
            query: 'auth'
        })).to.deep.equal([]);
    });

    it('uses configured transcript retention policy when transcript requests omit one', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);

        await service.updateSettings({
            workspacePath: '/workspace',
            retentionPolicies: {
                transcripts: 'ttl',
                transcriptTtlDays: 7
            }
        });
        const session = await service.startTranscriptSession({
            workspacePath: '/workspace',
            sessionId: 'chat-session-1',
            scope: 'session'
        });
        const message = await service.recordTranscriptMessage({
            workspacePath: '/workspace',
            transcriptSessionId: session.id,
            sessionId: 'chat-session-1',
            role: 'user',
            content: 'Use configured transcript retention.'
        });

        expect(session.retentionPolicy).to.equal('ttl');
        expect(message.retentionPolicy).to.equal('ttl');
    });

    it('keeps stored transcripts absent from search whenever transcript opt-in is disabled', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        const secret = 'TOKEN=abcdefghijklmnopqrstuvwxyz123456';

        const session = await service.startTranscriptSession({
            workspacePath: '/workspace',
            sessionId: 'chat-session-1',
            scope: 'session',
            origin: 'ai-chat',
            title: `Auth review ${secret}`,
            retentionPolicy: 'ttl',
            metadata: {
                sourceNote: `contains ${secret}`
            }
        });
        await service.recordTranscriptMessage({
            workspacePath: '/workspace',
            transcriptSessionId: session.id,
            sessionId: 'chat-session-1',
            taskId: 'task-1',
            scope: 'task',
            origin: 'ai-chat',
            role: 'user',
            content: `Auth transcript exists with ${secret}.`,
            retentionPolicy: 'task',
            metadata: {
                prompt: `inspect ${secret}`
            }
        });

        expect(repository.store.transcriptMessages).to.have.length(1);
        expect(JSON.stringify(repository.store.transcriptSessions)).not.to.contain(secret);
        expect(JSON.stringify(repository.store.transcriptMessages)).not.to.contain(secret);
        expect(await service.searchTranscripts({
            workspacePath: '/workspace',
            query: 'auth',
            scopes: ['task'],
            sessionId: 'chat-session-1',
            taskId: 'task-1'
        })).to.deep.equal([]);

        await service.updateSettings({
            workspacePath: '/workspace',
            optIn: { transcriptSearch: true }
        });
        expect(await service.searchTranscripts({
            workspacePath: '/workspace',
            query: 'auth',
            scopes: ['task'],
            sessionId: 'chat-session-1',
            taskId: 'task-1'
        })).to.have.length(1);

        await service.updateSettings({
            workspacePath: '/workspace',
            optIn: { transcriptSearch: false }
        });
        expect(await service.searchTranscripts({
            workspacePath: '/workspace',
            query: 'auth',
            scopes: ['task'],
            sessionId: 'chat-session-1',
            taskId: 'task-1'
        })).to.deep.equal([]);
        expect(repository.store.transcriptMessages).to.have.length(1);
    });

    it('forgets transcripts by session, task, workspace, and retention filters without auditing content', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);

        await service.updateSettings({
            workspacePath: '/workspace',
            optIn: { transcriptSearch: true }
        });
        const session = await service.startTranscriptSession({
            workspacePath: '/workspace',
            sessionId: 'chat-session-1',
            scope: 'session',
            retentionPolicy: 'ttl'
        });
        await service.recordTranscriptMessage({
            workspacePath: '/workspace',
            transcriptSessionId: session.id,
            sessionId: 'chat-session-1',
            taskId: 'task-1',
            scope: 'task',
            role: 'user',
            content: 'Forget this auth transcript.',
            retentionPolicy: 'task'
        });
        await service.recordTranscriptMessage({
            workspacePath: '/workspace',
            transcriptSessionId: session.id,
            sessionId: 'chat-session-1',
            taskId: 'task-2',
            scope: 'task',
            role: 'assistant',
            content: 'Keep this deployment transcript.',
            retentionPolicy: 'manual'
        });

        const expired = await service.forgetTranscripts({
            workspacePath: '/workspace',
            mode: 'expire',
            taskId: 'task-1',
            retentionPolicy: 'task'
        });

        expect(expired).to.deep.include({
            mode: 'expire',
            removedMessages: 1,
            removedSessions: 0,
            expiredSessions: 1
        });
        expect(repository.store.transcriptSessions?.[0].endedAt).to.be.a('string');
        expect(await service.searchTranscripts({
            workspacePath: '/workspace',
            query: 'auth',
            taskId: 'task-1'
        })).to.deep.equal([]);
        expect(await service.searchTranscripts({
            workspacePath: '/workspace',
            query: 'deployment',
            taskId: 'task-2'
        })).to.have.length(1);

        const deleted = await service.forgetTranscripts({
            workspacePath: '/workspace',
            transcriptSessionId: session.id,
            sessionId: 'chat-session-1',
            scopes: ['task']
        });

        expect(deleted).to.deep.include({
            mode: 'delete',
            removedMessages: 1,
            removedSessions: 1,
            expiredSessions: 0
        });
        expect(repository.store.transcriptMessages).to.deep.equal([]);
        expect(repository.store.transcriptSessions).to.deep.equal([]);
        const audit = repository.store.events.filter(event => event.eventType === 'transcript.forgotten');
        expect(audit).to.have.length(2);
        expect(JSON.stringify(audit)).not.to.contain('auth transcript');
        expect(JSON.stringify(audit)).not.to.contain('deployment transcript');
    });

    it('preserves global memories when clearing workspace data', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        const workspacePath = '/workspace';
        const otherWorkspacePath = '/other-workspace';

        await service.addMemory({
            workspacePath,
            scope: 'workspace',
            memoryType: 'manual_note',
            title: 'Project memory for current workspace',
            content: 'Will be deleted by clearWorkspaceData.'
        });
        await service.addMemory({
            workspacePath,
            scope: 'global',
            memoryType: 'user_preference',
            title: 'IDE memory',
            content: 'Must remain after clear.'
        });
        await service.addMemory({
            workspacePath: otherWorkspacePath,
            scope: 'workspace',
            memoryType: 'manual_note',
            title: 'Project memory for other workspace',
            content: 'Must remain.'
        });

        await service.clearWorkspaceData(workspacePath);

        expect(repository.store.memories.some(memory => memory.scope === 'global' && memory.title === 'IDE memory')).to.equal(true);
        expect(repository.store.memories.some(memory => memory.scope === 'workspace' && memory.title === 'Project memory for current workspace')).to.equal(false);
        expect(repository.store.memories.some(memory => memory.scope === 'workspace' && memory.title === 'Project memory for other workspace')).to.equal(true);
    });

    it('excludes global memories from workspace exports unless explicitly requested', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        repository.store.memories = [
            memoryFixture({ id: 'mem_workspace', workspacePath: '/workspace', scope: 'workspace', title: 'Workspace memory' }),
            memoryFixture({ id: 'mem_global', workspacePath: undefined, scope: 'global', title: 'IDE memory' })
        ];
        repository.store.memorySpaces = [
            {
                id: 'default:workspace:/workspace',
                scope: 'workspace',
                workspacePath: '/workspace',
                metadata: { kind: 'default' },
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z'
            },
            {
                id: 'default:global',
                scope: 'global',
                workspacePath: undefined,
                metadata: { kind: 'default' },
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z'
            }
        ];
        repository.store.memoryVectors = [
            {
                id: 'vec_workspace',
                memoryId: 'mem_workspace',
                workspacePath: '/workspace',
                scope: 'workspace',
                modelId: 'local-hash-v1',
                dimensions: 32,
                contentHash: 'workspace',
                vector: [0.1],
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z'
            },
            {
                id: 'vec_global',
                memoryId: 'mem_global',
                workspacePath: undefined,
                scope: 'global',
                modelId: 'local-hash-v1',
                dimensions: 32,
                contentHash: 'global',
                vector: [0.2],
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z'
            }
        ];
        repository.store.knowledgeGraphs = [{
            id: 'kg_workspace',
            workspacePath: '/workspace',
            scope: 'workspace',
            title: 'Workspace knowledge',
            status: 'active',
            concepts: [],
            links: [],
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z'
        }, {
            id: 'kg_global',
            scope: 'global',
            title: 'IDE knowledge',
            status: 'active',
            concepts: [],
            links: [],
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z'
        }];

        const defaultBundle = await service.exportWorkspaceData('/workspace');
        const explicitBundle = await service.exportWorkspaceData({ workspacePath: '/workspace', includeGlobalMemories: true });

        expect(defaultBundle.memories.map(memory => memory.id)).to.deep.equal(['mem_workspace']);
        expect(defaultBundle.memorySpaces?.map(space => space.id)).to.deep.equal(['default:workspace:/workspace']);
        expect(defaultBundle.memoryVectors?.map(vector => vector.id)).to.deep.equal(['vec_workspace']);
        expect(defaultBundle.knowledgeGraphs.map(graph => graph.id)).to.deep.equal(['kg_workspace']);
        expect(explicitBundle.memories.map(memory => memory.id)).to.have.members(['mem_workspace', 'mem_global']);
        expect(explicitBundle.memorySpaces?.map(space => space.id)).to.have.members(['default:workspace:/workspace', 'default:global']);
        expect(explicitBundle.memoryVectors?.map(vector => vector.id)).to.have.members(['vec_workspace', 'vec_global']);
        expect(explicitBundle.knowledgeGraphs.map(graph => graph.id)).to.have.members(['kg_workspace', 'kg_global']);

        await service.updateSettings({
            workspacePath: '/workspace',
            exportOptions: { includeGlobalMemories: true }
        });
        const configuredBundle = await service.exportWorkspaceData('/workspace');
        const explicitOptOutBundle = await service.exportWorkspaceData({ workspacePath: '/workspace', includeGlobalMemories: false });
        expect(configuredBundle.memories.map(memory => memory.id)).to.have.members(['mem_workspace', 'mem_global']);
        expect(configuredBundle.knowledgeGraphs.map(graph => graph.id)).to.have.members(['kg_workspace', 'kg_global']);
        expect(explicitOptOutBundle.memories.map(memory => memory.id)).to.deep.equal(['mem_workspace']);
        expect(explicitOptOutBundle.knowledgeGraphs.map(graph => graph.id)).to.deep.equal(['kg_workspace']);
    });

    it('redacts secrets from portable workspace export bundles', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        const secret = 'abcdefghijklmnopqrstuvwxyz123456';
        repository.store.memories = [
            memoryFixture({
                id: 'mem_secret',
                workspacePath: '/workspace',
                scope: 'workspace',
                title: 'Secret memory',
                content: `token = ${secret}`,
                evidence: `password = ${secret}`
            })
        ];
        repository.store.codeChunks[repository.workspaceKey('/workspace')] = [{
            id: 'chunk_secret',
            workspacePath: '/workspace',
            fileId: 'file_secret',
            relativePath: 'src/auth.ts',
            chunkKind: 'file',
            title: 'Auth fixture',
            content: `API_KEY=${secret}`,
            contentHash: 'secret',
            startLine: 1,
            endLine: 1,
            estimatedTokens: 8,
            indexedAt: '2026-01-01T00:00:00.000Z'
        }];
        repository.store.events = [{
            id: 'event_secret',
            workspacePath: '/workspace',
            eventType: 'prompt.submitted',
            payload: `token = ${secret}`,
            createdAt: '2026-01-01T00:00:00.000Z'
        }];

        const bundle = await service.exportWorkspaceData('/workspace');

        expect(JSON.stringify(bundle)).not.to.contain(secret);
        expect(JSON.stringify(bundle)).to.contain('abcdef********3456');
    });

    it('requires explicit confirmation before installing portable intelligence in the project', async () => {
        const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'pi-portable-install-'));
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);

        try {
            await service.installPortableMemory({ workspacePath, confirmed: false });
            expect.fail('Expected installPortableMemory to reject unconfirmed installs.');
        } catch (error) {
            expect(error instanceof Error ? error.message : String(error)).to.contain('Explicit user confirmation');
        }

        const installPath = path.join(workspacePath, '.cybervinci', 'memory');
        await expectPathMissing(installPath);
    });

    it('installs a redacted portable intelligence package under .cybervinci/memory', async () => {
        const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'pi-portable-install-'));
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        const key = repository.workspaceKey(workspacePath);
        const secret = 'abcdefghijklmnopqrstuvwxyz123456';
        repository.store.files[key] = [{
            id: 'file_readme',
            relativePath: 'README.md',
            fileName: 'README.md',
            extension: '.md',
            languageId: 'markdown',
            sizeBytes: 32,
            contentHash: 'hash-readme',
            isIgnored: false,
            isGenerated: false,
            isBinary: false,
            isSensitive: false
        }];
        repository.store.memories = [
            memoryFixture({
                id: 'mem_workspace',
                workspacePath,
                scope: 'workspace',
                title: 'Workspace token note',
                content: `token = ${secret}`
            })
        ];

        const result = await service.installPortableMemory({ workspacePath, confirmed: true });
        const installPath = path.join(workspacePath, '.cybervinci', 'memory');
        const bundlePath = path.join(installPath, 'cybervinci-memory-bundle.json');
        const reportPath = path.join(installPath, 'cybervinci-project-report.md');
        const graphPath = path.join(installPath, 'cybervinci-project-graph.json');
        const canonicalReportPath = path.join(installPath, 'report.md');
        const canonicalGraphPath = path.join(installPath, 'graph.json');
        const contextPackPath = path.join(installPath, 'context-pack.md');
        const memoriesPath = path.join(installPath, 'memories.json');
        const metadataPath = path.join(installPath, 'metadata.json');

        expect(result.installPath).to.equal(installPath);
        expect(result.files).to.include('cybervinci-memory-bundle.json');
        expect(result.files).to.include('cybervinci-project-report.md');
        expect(result.files).to.include.members(['graph.json', 'report.md', 'context-pack.md', 'memories.json', 'metadata.json']);
        expect(result.artifactCount).to.be.greaterThan(0);
        expect(await fs.readFile(reportPath, 'utf8')).to.contain('# CyberVinci Project Report');
        expect(await fs.readFile(canonicalReportPath, 'utf8')).to.contain('# CyberVinci Project Report');
        expect(await fs.readFile(graphPath, 'utf8')).to.contain('cybervinci-memory');
        expect(await fs.readFile(canonicalGraphPath, 'utf8')).to.contain('cybervinci-memory');
        expect(await fs.readFile(contextPackPath, 'utf8')).to.contain('# CyberVinci Portable Context Pack');
        expect(JSON.parse(await fs.readFile(memoriesPath, 'utf8')).policies.importedMemoriesRequireHumanReview).to.equal(true);
        const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
        expect(metadata).to.include({ version: 2 });
        expect(metadata.scope).to.include({ workspacePath, includeGlobalMemories: false, includeEphemeralMemories: false });
        expect(metadata.policies).to.include({ localFirst: true, secretsRedacted: true });
        expect(metadata.origin.artifactPaths).to.deep.equal(['graph.json', 'graphify-out/graph.json', 'report.md', 'context-pack.md', 'memories.json', 'metadata.json']);
        const bundleText = await fs.readFile(bundlePath, 'utf8');
        expect(bundleText).not.to.contain(secret);
        expect(bundleText).to.contain('abcdef********3456');
        expect(repository.store.events.some(event => event.eventType === 'export.installed')).to.equal(true);
    });

    it('detects an installed portable intelligence package in the workspace dashboard', async function () {
        this.timeout(5000);
        const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'pi-portable-detect-'));
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);

        const before = await service.getDashboard(workspacePath);
        expect(before.portablePackage?.detected).to.equal(false);

        await service.addMemory({
            workspacePath,
            scope: 'workspace',
            memoryType: 'project_decision',
            title: 'Portable detection',
            content: 'Detect installed portable intelligence without importing memories automatically.'
        });
        await service.installPortableMemory({ workspacePath, confirmed: true });

        const dashboard = await service.getDashboard(workspacePath);
        const portable = dashboard.portablePackage;

        expect(portable?.detected).to.equal(true);
        expect(portable?.installPath).to.equal(path.join(workspacePath, '.cybervinci', 'memory'));
        expect(portable?.producer).to.equal('cybervinci-memory');
        expect(portable?.source).to.equal('workspace-export');
        expect(portable?.version).to.equal(2);
        expect(portable?.exportedAt).to.match(/^\d{4}-\d{2}-\d{2}T/);
        expect(portable?.installedAt).to.match(/^\d{4}-\d{2}-\d{2}T/);
        expect(portable?.policies.importedMemoriesRequireHumanReview).to.equal(true);
        expect(portable?.counts.memories).to.equal(1);
        expect(portable?.artifactPaths).to.include.members([
            'cybervinci-memory-bundle.json',
            'metadata.json',
            'cybervinci-project-report.md'
        ]);
        expect(portable?.summary).to.contain('Detected CyberVinci Memory portable package');
        expect(repository.store.memories.filter(memory => memory.source === 'import:portable-pack')).to.have.length(0);
    });

    it('ignores, removes, and regenerates portable package references without deleting IDE memories', async function () {
        this.timeout(5000);
        const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'pi-portable-manage-'));
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        repository.store.memories = [
            memoryFixture({
                id: 'mem_global',
                scope: 'global',
                workspacePath: undefined,
                title: 'IDE preference',
                content: 'Keep IDE memory outside workspace portable maintenance.'
            }),
            memoryFixture({
                id: 'mem_workspace',
                scope: 'workspace',
                workspacePath,
                title: 'Workspace convention',
                content: 'Use the local portable package for review artifacts.'
            })
        ];

        await service.installPortableMemory({ workspacePath, confirmed: true });
        const installPath = path.join(workspacePath, '.cybervinci', 'memory');
        await expectPathExists(path.join(installPath, 'metadata.json'));

        try {
            await service.managePortableMemory({ workspacePath, action: 'ignore', confirmed: false });
            expect.fail('Expected managePortableMemory to reject unconfirmed changes.');
        } catch (error) {
            expect(error instanceof Error ? error.message : String(error)).to.contain('Explicit user confirmation');
        }

        const ignored = await service.managePortableMemory({ workspacePath, action: 'ignore', confirmed: true });
        expect(ignored.ignored).to.equal(true);
        expect(await service.getDashboard(workspacePath)).to.have.nested.property('portablePackage.detected', false);
        expect(repository.store.memories.map(memory => memory.id)).to.have.members(['mem_global', 'mem_workspace']);

        const regenerated = await service.managePortableMemory({ workspacePath, action: 'regenerate', confirmed: true });
        expect(regenerated.regenerated).to.equal(true);
        expect(regenerated.files).to.include('metadata.json');
        expect((await service.getDashboard(workspacePath)).portablePackage?.detected).to.equal(true);
        await expectPathMissing(path.join(installPath, '.cybervinci-portable-ignore'));

        const removed = await service.managePortableMemory({ workspacePath, action: 'remove-local-reference', confirmed: true });
        expect(removed.removed).to.equal(true);
        await expectPathMissing(installPath);
        expect((await service.getDashboard(workspacePath)).portablePackage?.detected).to.equal(false);
        expect(repository.store.memories.map(memory => memory.id)).to.have.members(['mem_global', 'mem_workspace']);
        expect(repository.store.events.some(event => event.eventType === 'export.portable-maintenance')).to.equal(true);
    });

    it('exports a reviewable CyberVinci project report artifact', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        const key = repository.workspaceKey('/workspace');
        repository.store.files[key] = [
            {
                id: 'file_service',
                relativePath: 'src/cache-service.ts',
                fileName: 'cache-service.ts',
                extension: '.ts',
                languageId: 'typescript',
                sizeBytes: 200,
                contentHash: 'hash-service',
                isIgnored: false,
                isGenerated: false,
                isBinary: false,
                isSensitive: false
            },
            {
                id: 'file_existing_test',
                relativePath: 'src/cache-service.spec.ts',
                fileName: 'cache-service.spec.ts',
                extension: '.ts',
                languageId: 'typescript',
                sizeBytes: 150,
                contentHash: 'hash-test',
                isIgnored: false,
                isGenerated: false,
                isBinary: false,
                isSensitive: false
            }
        ];
        repository.store.symbols[key] = [
            { id: 'symbol_cache', fileId: 'file_service', languageId: 'typescript', symbolKind: 'class', name: 'CacheService' },
            { id: 'symbol_a', fileId: 'file_service', languageId: 'typescript', symbolKind: 'method', name: 'a' },
            { id: 'symbol_b', fileId: 'file_service', languageId: 'typescript', symbolKind: 'method', name: 'b' },
            { id: 'symbol_c', fileId: 'file_service', languageId: 'typescript', symbolKind: 'method', name: 'c' },
            { id: 'symbol_d', fileId: 'file_service', languageId: 'typescript', symbolKind: 'method', name: 'd' },
            { id: 'symbol_e', fileId: 'file_service', languageId: 'typescript', symbolKind: 'method', name: 'e' }
        ];
        repository.store.relations[key] = ['symbol_a', 'symbol_b', 'symbol_c', 'symbol_d', 'symbol_e'].map((targetId, index) => ({
            id: `rel_${index}`,
            sourceKind: 'symbol' as const,
            sourceId: 'symbol_cache',
            targetKind: 'symbol' as const,
            targetId,
            relationType: 'calls' as const,
            confidenceLevel: 'extracted' as const,
            confidenceScore: 0.9
        }));
        repository.store.changeImpacts = [{
            id: 'impact_cache',
            workspacePath: '/workspace',
            relativePath: 'src/cache-service.ts',
            summary: 'Cache policy changes affect API freshness.',
            riskScore: 0.8,
            createdAt: '2026-01-01T00:00:00.000Z'
        }];
        repository.store.knowledgeGraphs = [{
            id: 'kg_project',
            workspacePath: '/workspace',
            scope: 'workspace',
            title: 'Project decisions',
            status: 'active',
            concepts: [{
                id: 'concept_decision',
                graphId: 'kg_project',
                kind: 'decision',
                title: 'Use local cache',
                summary: 'Cache remains local-first.',
                status: 'active',
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z'
            }],
            links: [],
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z'
        }];
        repository.store.contextSuggestions = [{
            id: 'suggestion_cache',
            workspacePath: '/workspace',
            promptSignature: 'sig',
            title: 'Cache service',
            reason: 'High lexical and graph score.',
            sourceKind: 'code',
            score: 0.91,
            estimatedTokens: 120,
            createdAt: '2026-01-01T00:00:00.000Z'
        }];

        const bundle = await service.exportWorkspaceData('/workspace');
        const report = bundle.artifacts?.find(artifact => artifact.path === 'cybervinci-project-report.md');

        expect(report?.mediaType).to.equal('text/markdown');
        expect(report?.content).to.contain('# CyberVinci Project Report');
        expect(report?.content).to.contain('## Architectural Summary');
        expect(report?.content).to.contain('## God Nodes');
        expect(report?.content).to.contain('CacheService');
        expect(report?.content).to.contain('## Relevant Decisions');
        expect(report?.content).to.contain('Use local cache');
        expect(report?.content).to.contain('## Reviewable Context');
        expect(report?.content).to.contain('Cache service');
        expect(report?.content).not.to.contain('- src/cache-service.ts');
    });

    it('exports a standalone CyberVinci project graph JSON artifact with origins, confidence, and classification markers', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        const key = repository.workspaceKey('/workspace');
        repository.store.files[key] = [{
            id: 'file_service',
            relativePath: 'src/cache-service.ts',
            fileName: 'cache-service.ts',
            extension: '.ts',
            languageId: 'typescript',
            sizeBytes: 200,
            contentHash: 'hash-service',
            isIgnored: false,
            isGenerated: false,
            isBinary: false,
            isSensitive: false
        }];
        repository.store.symbols[key] = [{
            id: 'symbol_cache',
            fileId: 'file_service',
            languageId: 'typescript',
            symbolKind: 'class',
            name: 'CacheService',
            fullName: 'CacheService'
        }, {
            id: 'symbol_get',
            fileId: 'file_service',
            languageId: 'typescript',
            symbolKind: 'method',
            name: 'get',
            fullName: 'CacheService.get'
        }];
        repository.store.relations[key] = [{
            id: 'rel_contains',
            sourceKind: 'file',
            sourceId: 'file_service',
            targetKind: 'symbol',
            targetId: 'symbol_cache',
            relationType: 'contains',
            confidenceLevel: 'extracted',
            confidenceScore: 0.95,
            evidence: 'class CacheService uses token abcdefghijklmnopqrstuvwxyz123456'
        }, {
            id: 'rel_calls',
            sourceKind: 'symbol',
            sourceId: 'symbol_cache',
            targetKind: 'symbol',
            targetId: 'symbol_get',
            relationType: 'calls',
            confidenceLevel: 'extracted',
            confidenceScore: 0.91,
            evidence: 'CacheService calls get with token abcdefghijklmnopqrstuvwxyz123456'
        }];
        repository.store.knowledgeGraphs = [{
            id: 'kg_project',
            workspacePath: '/workspace',
            scope: 'workspace',
            title: 'Project concepts',
            status: 'active',
            concepts: [{
                id: 'concept_cache',
                graphId: 'kg_project',
                kind: 'component',
                title: 'Cache service',
                summary: 'Cache service owns local cache decisions.',
                status: 'active',
                sourceKind: 'code-graph',
                sourceId: 'symbol_cache',
                evidence: 'Derived from CacheService symbol.',
                weight: 0.82,
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z'
            }, {
                id: 'concept_policy',
                graphId: 'kg_project',
                kind: 'decision',
                title: 'Local cache policy',
                summary: 'Cache remains local-first.',
                status: 'active',
                sourceKind: 'project-memory',
                sourceId: 'mem_cache',
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z'
            }, {
                id: 'concept_manual',
                graphId: 'kg_project',
                kind: 'decision',
                title: 'Reviewer-approved decision',
                summary: 'A reviewer approved this knowledge item.',
                status: 'active',
                metadata: { userApproved: true },
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z'
            }, {
                id: 'concept_ambiguous',
                graphId: 'kg_project',
                kind: 'risk',
                title: 'Ambiguous ownership',
                summary: 'Ownership is not clear enough for automatic trust.',
                status: 'active',
                weight: 0.4,
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z'
            }],
            links: [{
                id: 'link_policy',
                graphId: 'kg_project',
                sourceConceptId: 'concept_policy',
                targetConceptId: 'concept_cache',
                linkKind: 'decides',
                confidenceScore: 0.84,
                evidence: 'Decision applies to cache component.',
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z'
            }, {
                id: 'link_conflict',
                graphId: 'kg_project',
                sourceConceptId: 'concept_policy',
                targetConceptId: 'concept_ambiguous',
                linkKind: 'conflicts_with',
                confidenceScore: 0.75,
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z'
            }],
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z'
        }];

        const bundle = await service.exportWorkspaceData('/workspace');
        const artifact = bundle.artifacts?.find(item => item.path === 'cybervinci-project-graph.json');
        const canonicalArtifact = bundle.artifacts?.find(item => item.path === 'graph.json');
        const metadataArtifact = bundle.artifacts?.find(item => item.path === 'metadata.json');
        const memoriesArtifact = bundle.artifacts?.find(item => item.path === 'memories.json');
        const contextPackArtifact = bundle.artifacts?.find(item => item.path === 'context-pack.md');
        const reportArtifact = bundle.artifacts?.find(item => item.path === 'report.md');
        const graphmlArtifact = bundle.artifacts?.find(item => item.path === 'cybervinci-project-graph.graphml');
        const htmlArtifact = bundle.artifacts?.find(item => item.path === 'cybervinci-project-graph.html');
        const callflowArtifact = bundle.artifacts?.find(item => item.path === 'cybervinci-project-callflow.svg');
        const graph = JSON.parse(artifact?.content ?? '{}');
        const metadata = JSON.parse(metadataArtifact?.content ?? '{}');

        expect(artifact?.mediaType).to.equal('application/json');
        expect(canonicalArtifact?.mediaType).to.equal('application/json');
        expect(JSON.parse(canonicalArtifact?.content ?? '{}')).to.deep.equal(graph);
        expect(metadataArtifact?.mediaType).to.equal('application/json');
        expect(memoriesArtifact?.mediaType).to.equal('application/json');
        expect(contextPackArtifact?.mediaType).to.equal('text/markdown');
        expect(reportArtifact?.mediaType).to.equal('text/markdown');
        expect(metadata.origin).to.include({ producer: 'cybervinci-memory', source: 'workspace-export' });
        expect(metadata.origin.artifactPaths).to.deep.equal(['graph.json', 'graphify-out/graph.json', 'report.md', 'context-pack.md', 'memories.json', 'metadata.json']);
        expect(metadata.policies).to.include({ localFirst: true, importedMemoriesRequireHumanReview: true, secretsRedacted: true });
        expect(graphmlArtifact?.mediaType).to.equal('application/graphml+xml');
        expect(htmlArtifact?.mediaType).to.equal('text/html');
        expect(callflowArtifact?.mediaType).to.equal('image/svg+xml');
        expect(graph.source).to.equal('cybervinci-memory');
        const graphifyArtifact = bundle.artifacts?.find(item => item.path === 'graphify-out/graph.json');
        const graphifyGraph = JSON.parse(graphifyArtifact?.content ?? '{}');
        expect(graphifyArtifact?.mediaType).to.equal('application/json');
        expect(graphifyGraph.compatibility).to.include({ format: 'graphify-out/graph.json', graphifyRuntimeRequired: false, secretsRedacted: true });
        expect(graphifyGraph.nodes.map((node: { id: string }) => node.id)).to.include.members(['file:file_service', 'symbol:symbol_cache', 'concept:concept_cache']);
        expect(graphifyGraph.edges.map((edge: { type: string }) => edge.type)).to.include.members(['declares', 'contains', 'calls', 'decides', 'conflicts_with']);
        expect(graphifyArtifact?.content).to.not.contain('abcdefghijklmnopqrstuvwxyz123456');
        expect(graph.files[0]).to.include({ id: 'file_service', relativePath: 'src/cache-service.ts' });
        expect(graph.files[0].classificationMarkers).to.include.members(['indexed', 'language:typescript']);
        expect(graph.files[0].originMarkers).to.deep.equal(['source:code-index']);
        expect(graph.symbols[0].classificationMarkers).to.include.members(['symbol:class', 'language:typescript']);
        expect(graph.symbols[0].originMarkers).to.deep.equal(['source:language-analyzer']);
        expect(graph.relations[0]).to.include({ relationType: 'contains', confidenceScore: 0.95 });
        expect(graph.relations[0].classificationMarkers).to.include.members(['relation:contains', 'confidence:extracted', 'has-evidence']);
        expect(graph.concepts.map((concept: { id: string }) => concept.id)).to.deep.equal(['concept_cache', 'concept_policy', 'concept_manual', 'concept_ambiguous']);
        expect(graph.concepts[0].confidenceScore).to.equal(0.82);
        expect(graph.concepts[0].classificationMarkers).to.include.members(['extracted', 'concept:component', 'status:active', 'source:code-graph', 'has-evidence', 'has-confidence']);
        expect(graph.concepts[1].classificationMarkers).to.include('inferred');
        expect(graph.concepts[2].classificationMarkers).to.include('user-approved');
        expect(graph.concepts[3].classificationMarkers).to.include('ambiguous');
        expect(graph.concepts[0].originMarkers).to.include.members(['source:knowledge-graph', 'graph:kg_project', 'scope:workspace', 'source-kind:code-graph', 'source-id:symbol_cache']);
        expect(graph.links[0]).to.include({ linkKind: 'decides', confidenceScore: 0.84 });
        expect(graph.links[0].classificationMarkers).to.include.members(['inferred', 'link:decides', 'has-evidence', 'high-confidence']);
        expect(graph.links[1].classificationMarkers).to.include.members(['conflict', 'link:conflicts_with']);
        expect(graph.metadata).to.include({ fileCount: 1, symbolCount: 2, relationCount: 2, conceptCount: 4, linkCount: 2, knowledgeGraphCount: 1 });
        expect(reportArtifact?.content).to.contain('## Relation Inventory');
        expect(reportArtifact?.content).to.contain('- contains: 1');
        expect(reportArtifact?.content).to.contain('- calls: 1');
        expect(reportArtifact?.content).to.contain('## God Nodes');
        expect(reportArtifact?.content).to.contain('CacheService');
        expect(reportArtifact?.content).to.contain('## Files Without Inferred Tests');
        expect(reportArtifact?.content).to.contain('src/cache-service.ts');
        expect(reportArtifact?.content).to.contain('## Relevant Decisions');
        expect(reportArtifact?.content).to.contain('Local cache policy');
        expect(reportArtifact?.content).to.not.contain('abcdefghijklmnopqrstuvwxyz123456');
        expect(graphmlArtifact?.content).to.contain('<graphml xmlns="http://graphml.graphdrawing.org/xmlns">');
        expect(graphmlArtifact?.content).to.contain('<node id="file:file_service">');
        expect(graphmlArtifact?.content).to.contain('<node id="symbol:symbol_cache">');
        expect(graphmlArtifact?.content).to.contain('<node id="concept:concept_cache">');
        expect(graphmlArtifact?.content).to.contain('<edge id="relation:rel_contains" source="file:file_service" target="symbol:symbol_cache">');
        expect(graphmlArtifact?.content).to.contain('<edge id="knowledge-link:link_policy" source="concept:concept_policy" target="concept:concept_cache">');
        expect(graphmlArtifact?.content).to.not.contain('abcdefghijklmnopqrstuvwxyz123456');
        expect(htmlArtifact?.content).to.contain('<title>CyberVinci Project Graph</title>');
        expect(htmlArtifact?.content).to.contain('cybervinci-project-graph-data');
        expect(htmlArtifact?.content).to.contain('Standalone local viewer; no IDE runtime or network scripts required.');
        expect(htmlArtifact?.content).to.not.contain('<script src=');
        expect(htmlArtifact?.content).to.not.contain('abcdefghijklmnopqrstuvwxyz123456');
        expect(callflowArtifact?.content).to.contain('<title id="title">CyberVinci Project Callflow</title>');
        expect(callflowArtifact?.content).to.contain('CacheService');
        expect(callflowArtifact?.content).to.contain('CacheService.get');
        expect(callflowArtifact?.content).to.contain('calls');
        expect(callflowArtifact?.content).to.contain('Raw evidence and source content omitted');
        expect(callflowArtifact?.content).to.not.contain('abcdefghijklmnopqrstuvwxyz123456');
    });

    it('keeps existing global memories when importing a workspace-only export bundle', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        repository.store.memories = [
            memoryFixture({ id: 'mem_global', workspacePath: undefined, scope: 'global', title: 'IDE memory' })
        ];
        const bundle = await service.exportWorkspaceData('/workspace');

        await service.importWorkspaceData({
            ...bundle,
            memories: [
                memoryFixture({ id: 'mem_workspace_imported', workspacePath: '/workspace', scope: 'workspace', title: 'Imported workspace memory' })
            ]
        });

        expect(repository.store.memories.some(memory => memory.id === 'mem_global' && memory.scope === 'global' && memory.workspacePath === undefined)).to.equal(true);
        const imported = repository.store.memories.find(memory => memory.id === 'mem_workspace_imported');
        expect(imported?.status).to.equal('candidate');
        expect(imported?.originMarkers).to.deep.equal(['imported-portable', 'import:portable-pack', 'import:workspace']);
    });

    it('preserves imported global memories without attaching the source workspace path', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        const sourceWorkspace = '/other-workspace';
        const bundle = await service.exportWorkspaceData(sourceWorkspace);

        await service.importWorkspaceData({
            ...bundle,
            memories: [
                memoryFixture({
                    id: 'mem_global_imported',
                    workspacePath: sourceWorkspace,
                    scope: 'global',
                    memoryType: 'user_preference',
                    title: 'Imported IDE memory',
                    content: 'Keep this as IDE-wide memory even when the bundle came from another workspace.'
                })
            ]
        });

        const imported = repository.store.memories.find(memory => memory.id === 'mem_global_imported');
        expect(imported?.scope).to.equal('global');
        expect(imported?.workspacePath).to.equal(undefined);
        expect(imported?.status).to.equal('candidate');
        expect(imported?.originMarkers).to.deep.equal(['imported-portable', 'import:portable-pack', 'import:global']);
        expect(imported?.memorySpaceId).to.equal(undefined);
    });

    it('exports repository memories for the workspace repository and omits ephemeral memories unless requested', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        repository.store.memories = [
            memoryFixture({ id: 'mem_workspace', workspacePath: '/workspace', scope: 'workspace' }),
            memoryFixture({
                id: 'mem_repository',
                workspacePath: '/workspace',
                scope: 'repository',
                repositoryId: 'workspace',
                repositoryUrl: 'file:///workspace',
                title: 'Repository memory'
            }),
            memoryFixture({
                id: 'mem_session',
                workspacePath: '/workspace',
                scope: 'session',
                sessionId: 'session-1',
                expiresAt: '2099-01-01T00:00:00.000Z',
                retentionPolicy: 'ttl'
            }),
            memoryFixture({
                id: 'mem_task_expired',
                workspacePath: '/workspace',
                scope: 'task',
                taskId: 'task-1',
                expiresAt: '2020-01-01T00:00:00.000Z',
                retentionPolicy: 'ttl'
            })
        ];

        const defaultBundle = await service.exportWorkspaceData('/workspace');
        const ephemeralBundle = await service.exportWorkspaceData({ workspacePath: '/workspace', includeEphemeralMemories: true });

        expect(defaultBundle.memories.map(memory => memory.id)).to.have.members(['mem_workspace', 'mem_repository']);
        expect(ephemeralBundle.memories.map(memory => memory.id)).to.have.members(['mem_workspace', 'mem_repository', 'mem_session']);
        expect(ephemeralBundle.memories.some(memory => memory.id === 'mem_task_expired')).to.equal(false);
    });

    it('imports repository, session, and task memories without attaching the target workspacePath or expired ephemeral records', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        const bundle = await service.exportWorkspaceData('/workspace');

        await service.importWorkspaceData({
            ...bundle,
            memories: [
                memoryFixture({
                    id: 'mem_repository_imported',
                    workspacePath: '/source-clone',
                    scope: 'repository',
                    repositoryId: 'github.com/acme/project',
                    repositoryUrl: 'https://github.com/acme/project.git',
                    title: 'Imported repository memory'
                }),
                memoryFixture({
                    id: 'mem_session_imported',
                    workspacePath: '/source-workspace',
                    scope: 'session',
                    sessionId: 'session-2',
                    expiresAt: '2099-01-01T00:00:00.000Z',
                    retentionPolicy: 'ttl',
                    title: 'Imported session memory'
                }),
                memoryFixture({
                    id: 'mem_task_expired_imported',
                    workspacePath: '/source-workspace',
                    scope: 'task',
                    taskId: 'task-2',
                    expiresAt: '2020-01-01T00:00:00.000Z',
                    retentionPolicy: 'ttl',
                    title: 'Expired imported task memory'
                })
            ]
        });

        const importedRepository = repository.store.memories.find(memory => memory.id === 'mem_repository_imported');
        const importedSession = repository.store.memories.find(memory => memory.id === 'mem_session_imported');

        expect(importedRepository?.scope).to.equal('repository');
        expect(importedRepository?.workspacePath).to.equal(undefined);
        expect(importedRepository?.repositoryId).to.equal('github.com/acme/project');
        expect(importedRepository?.status).to.equal('candidate');
        expect(importedRepository?.originMarkers).to.deep.equal(['imported-portable', 'import:portable-pack', 'import:repository']);
        expect(importedSession?.scope).to.equal('session');
        expect(importedSession?.workspacePath).to.equal('/source-workspace');
        expect(importedSession?.expiresAt).to.equal('2099-01-01T00:00:00.000Z');
        expect(importedSession?.status).to.equal('candidate');
        expect(importedSession?.originMarkers).to.deep.equal(['imported-portable', 'import:portable-pack', 'import:session']);
        expect(repository.store.memories.some(memory => memory.id === 'mem_task_expired_imported')).to.equal(false);
    });

    it('classifies imported memory diff and only imports safe new memories automatically', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        repository.store.memories = [
            memoryFixture({ id: 'mem_existing', title: 'Existing decision', content: 'Keep the existing decision.' }),
            memoryFixture({ id: 'mem_conflict', title: 'Conflict title', content: 'Existing content.' }),
            memoryFixture({ id: 'mem_title_conflict', title: 'Same title', content: 'Existing title content.' })
        ];
        const bundle = await service.exportWorkspaceData('/workspace');

        const result = await service.importWorkspaceData({
            ...bundle,
            memories: [
                memoryFixture({ id: 'mem_new', title: 'New import', content: 'Safe new memory.' }),
                memoryFixture({ id: 'mem_duplicate', title: 'Existing decision', content: 'Keep the existing decision.' }),
                memoryFixture({ id: 'mem_conflict', title: 'Conflict title', content: 'Imported conflicting content.' }),
                memoryFixture({ id: 'mem_other_title_conflict', title: 'Same title', content: 'Different imported content.' }),
                memoryFixture({ id: 'mem_obsolete', title: 'Obsolete import', content: 'Old memory.', staleStatus: 'stale' }),
                memoryFixture({ id: 'mem_sensitive', title: 'Sensitive import', content: 'API_KEY=abcdefghijklmnopqrstuvwxyz123456' }),
                memoryFixture({ id: 'mem_expired', title: 'Expired import', scope: 'task', taskId: 'task-expired', retentionPolicy: 'ttl', expiresAt: '2020-01-01T00:00:00.000Z' })
            ]
        });

        expect(result.importedMemories).to.equal(1);
        expect(result.skippedMemories).to.equal(6);
        expect(result.memoryDiff.map(entry => [entry.memoryId, entry.classification])).to.deep.equal([
            ['mem_new', 'new'],
            ['mem_duplicate', 'duplicate'],
            ['mem_conflict', 'conflicting'],
            ['mem_other_title_conflict', 'conflicting'],
            ['mem_obsolete', 'obsolete'],
            ['mem_sensitive', 'sensitive'],
            ['mem_expired', 'not_importable']
        ]);
        expect(repository.store.memories.some(memory => memory.id === 'mem_new')).to.equal(true);
        expect(repository.store.memories.find(memory => memory.id === 'mem_new')?.status).to.equal('candidate');
        expect(repository.store.memories.find(memory => memory.id === 'mem_new')?.originMarkers).to.deep.equal(['imported-portable', 'import:portable-pack', 'import:workspace']);
        expect(repository.store.memories.some(memory => memory.id === 'mem_sensitive')).to.equal(false);
        expect(repository.store.memories.find(memory => memory.id === 'mem_conflict')?.content).to.equal('Existing content.');
    });

    it('compares imported memories with the reindexed local graph before importing review candidates', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        const key = repository.workspaceKey('/workspace');
        repository.store.files[key] = [
            fileFixture({ id: 'file_current', relativePath: 'src/current.ts', fileName: 'current.ts', contentHash: 'current-hash' }),
            fileFixture({ id: 'file_sensitive', relativePath: 'src/secret.ts', fileName: 'secret.ts', contentHash: 'secret-hash', isSensitive: true })
        ];
        const bundle = await service.exportWorkspaceData('/workspace');

        const result = await service.importWorkspaceData({
            ...bundle,
            files: [
                fileFixture({ id: 'file_current', relativePath: 'src/current.ts', fileName: 'current.ts', contentHash: 'portable-hash' }),
                fileFixture({ id: 'file_removed', relativePath: 'src/removed.ts', fileName: 'removed.ts', contentHash: 'removed-hash' }),
                fileFixture({ id: 'file_sensitive', relativePath: 'src/secret.ts', fileName: 'secret.ts', contentHash: 'secret-hash' })
            ],
            memories: [
                memoryFixture({ id: 'mem_graph_conflict', title: 'Current graph fact', content: 'Decision from src/current.ts.' }),
                memoryFixture({ id: 'mem_graph_obsolete', title: 'Removed graph fact', content: 'Decision from src/removed.ts.' }),
                memoryFixture({ id: 'mem_graph_sensitive', title: 'Sensitive graph fact', content: 'Decision from src/secret.ts.' }),
                memoryFixture({ id: 'mem_graph_new', title: 'New graph fact', content: 'Portable memory with no graph file reference.' })
            ]
        });

        expect(result.importedMemories).to.equal(1);
        expect(result.memoryDiff.map(entry => [entry.memoryId, entry.classification])).to.deep.equal([
            ['mem_graph_conflict', 'conflicting'],
            ['mem_graph_obsolete', 'obsolete'],
            ['mem_graph_sensitive', 'sensitive'],
            ['mem_graph_new', 'new']
        ]);
        expect(repository.store.memories.some(memory => memory.id === 'mem_graph_new')).to.equal(true);
        expect(repository.store.memories.some(memory => memory.id === 'mem_graph_conflict')).to.equal(false);
    });

    it('imports portable knowledge concepts and links only as review candidates', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        const bundle = await service.exportWorkspaceData('/workspace');
        const graph = knowledgeGraphFixture('/source-workspace');

        const result = await service.importWorkspaceData({
            ...bundle,
            knowledgeGraphs: [graph]
        });

        const imported = repository.store.knowledgeGraphs.find(item => item.id === 'kg_imported');
        expect(result.importedKnowledgeConceptCandidates).to.equal(2);
        expect(result.importedKnowledgeLinkCandidates).to.equal(1);
        expect(imported?.workspacePath).to.equal('/workspace');
        expect(imported?.metadata?.originMarkers).to.deep.equal(['imported-portable', 'import:portable-pack', 'import:workspace']);
        expect(imported?.concepts.map(concept => concept.status)).to.deep.equal(['candidate', 'candidate']);
        expect(imported?.concepts[0].metadata?.reviewRequired).to.equal(true);
        expect(imported?.concepts[0].metadata?.originMarkers).to.deep.equal(['imported-portable', 'import:portable-pack', 'import:workspace']);
        expect(imported?.links.map(link => link.status)).to.deep.equal(['candidate']);
        expect(imported?.links[0].metadata?.reviewRequired).to.equal(true);
        expect(imported?.links[0].metadata?.originMarkers).to.deep.equal(['imported-portable', 'import:portable-pack', 'import:workspace']);
    });

    it('keeps imported knowledge candidates out of normal search until review includes non-active items', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        const bundle = await service.exportWorkspaceData('/workspace');
        await service.importWorkspaceData({
            ...bundle,
            knowledgeGraphs: [knowledgeGraphFixture('/source-workspace')]
        });

        const normalResults = await service.searchKnowledge({ workspacePath: '/workspace', query: 'portable' });
        const reviewResults = await service.searchKnowledge({ workspacePath: '/workspace', query: 'portable', includeArchived: true });

        expect(normalResults).to.deep.equal([]);
        expect(reviewResults.map(result => result.id)).to.have.members(['concept_portable_source', 'concept_portable_target', 'link_portable']);
    });

    it('merges portable packages for review without overwriting local settings, graph data, active memories, or knowledge graphs', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        const workspacePath = '/workspace';
        const key = repository.workspaceKey(workspacePath);
        repository.store.settings[key] = {
            workspacePath,
            enabled: true,
            graphEnabled: true,
            memoryEnabled: true,
            skillSuggestionsEnabled: true,
            optIn: { transcriptSearch: false, vectorSearch: false },
            updatedAt: '2026-01-01T00:00:00.000Z'
        };
        repository.store.files[key] = [fileFixture({ id: 'file_local', relativePath: 'src/local.ts', fileName: 'local.ts', contentHash: 'local-hash' })];
        repository.store.codeChunks[key] = [codeChunkFixture(workspacePath, { id: 'chunk_local', relativePath: 'src/local.ts', content: 'Local chunk remains authoritative.' })];
        repository.store.memories = [
            memoryFixture({ id: 'mem_active_local', workspacePath, title: 'Local active memory', content: 'Do not overwrite active local memory.' })
        ];
        repository.store.knowledgeGraphs = [knowledgeGraphFixture(workspacePath)];
        const localKnowledgeGraph = repository.store.knowledgeGraphs[0];
        const bundle = await service.exportWorkspaceData(workspacePath);

        const result = await service.importWorkspaceData({
            ...bundle,
            settings: {
                ...bundle.settings,
                optIn: { transcriptSearch: true, vectorSearch: true },
                updatedAt: '2026-02-01T00:00:00.000Z'
            },
            files: [fileFixture({ id: 'file_imported', relativePath: 'src/imported.ts', fileName: 'imported.ts', contentHash: 'imported-hash' })],
            codeChunks: [codeChunkFixture(workspacePath, { id: 'chunk_imported', relativePath: 'src/imported.ts', content: 'Imported chunk must not replace local chunks.' })],
            memories: [
                memoryFixture({ id: 'mem_imported_review', workspacePath, title: 'Imported review memory', content: 'Import only as a review candidate.' })
            ],
            knowledgeGraphs: [knowledgeGraphFixture('/source-workspace')]
        });

        const importedMemory = repository.store.memories.find(memory => memory.id === 'mem_imported_review');
        const importedKnowledgeGraph = repository.store.knowledgeGraphs.find(graph => graph.id !== localKnowledgeGraph.id);

        expect(result.importedMemories).to.equal(1);
        expect(repository.store.settings[key].optIn?.transcriptSearch).to.equal(false);
        expect(repository.store.settings[key].updatedAt).to.equal('2026-01-01T00:00:00.000Z');
        expect(repository.store.files[key].map(file => file.id)).to.deep.equal(['file_local']);
        expect(repository.store.codeChunks[key].map(chunk => chunk.id)).to.deep.equal(['chunk_local']);
        expect(repository.replacedChunks).to.deep.equal([]);
        expect(repository.store.memories.find(memory => memory.id === 'mem_active_local')?.status).to.equal('active');
        expect(importedMemory?.status).to.equal('candidate');
        expect(importedMemory?.originMarkers).to.include('imported-portable');
        expect(repository.store.knowledgeGraphs.find(graph => graph.id === localKnowledgeGraph.id)).to.deep.equal(localKnowledgeGraph);
        expect(importedKnowledgeGraph?.id).to.not.equal('kg_imported');
        expect(importedKnowledgeGraph?.concepts.every(concept => concept.status === 'candidate')).to.equal(true);
    });

    it('updates memory stale state for lifecycle review UI actions', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        repository.store.memories = [
            memoryFixture({
                id: 'mem_review',
                workspacePath: '/workspace',
                staleStatus: 'fresh'
            })
        ];

        const updated = await service.updateMemory({
            workspacePath: '/workspace',
            id: 'mem_review',
            patch: { staleStatus: 'stale' }
        });

        expect(updated?.staleStatus).to.equal('stale');
        expect(repository.store.memories[0].staleStatus).to.equal('stale');
    });

    it('updates memory access through an explicit lifecycle action', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        repository.store.memories = [
            memoryFixture({
                id: 'mem_access',
                workspacePath: '/workspace',
                accessCount: 2,
                weight: 0.98,
                lastAccessedAt: '2026-01-01T00:00:00.000Z'
            })
        ];

        const updated = await service.updateMemoryAccess({
            workspacePath: '/workspace',
            id: 'mem_access'
        });

        expect(updated?.accessCount).to.equal(3);
        expect(updated?.lastAccessedAt).to.not.equal('2026-01-01T00:00:00.000Z');
        expect(updated?.weight).to.equal(1);
        expect(repository.store.memories[0].accessCount).to.equal(3);
        expect(repository.store.memories[0].weight).to.equal(1);
    });

    it('promotes scoped memory to IDE memory and records sanitized audit', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        repository.store.memories = [
            memoryFixture({
                id: 'mem_repo',
                workspacePath: '/workspace',
                scope: 'repository',
                repositoryUrl: 'https://github.com/acme/project.git',
                repositoryId: 'github.com/acme/project',
                sessionId: 'session-1',
                taskId: 'task-1',
                expiresAt: '2099-01-01T00:00:00.000Z',
                retentionPolicy: 'ttl',
                memorySpaceId: 'default:repository:github.com/acme/project'
            })
        ];
        repository.store.memoryVectors = [{
            id: 'vec_repo',
            memoryId: 'mem_repo',
            workspacePath: '/workspace',
            scope: 'repository',
            repositoryUrl: 'https://github.com/acme/project.git',
            repositoryId: 'github.com/acme/project',
            modelId: 'local-hash-v1',
            dimensions: 32,
            contentHash: 'repo',
            vector: [0.1],
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z'
        }];

        const promoted = await service.promoteMemoryToIde({
            workspacePath: '/workspace',
            id: 'mem_repo',
            reason: 'Reviewed by user for IDE scope.'
        });

        expect(promoted?.scope).to.equal('global');
        expect(promoted?.workspacePath).to.equal(undefined);
        expect(promoted?.repositoryUrl).to.equal(undefined);
        expect(promoted?.repositoryId).to.equal(undefined);
        expect(promoted?.sessionId).to.equal(undefined);
        expect(promoted?.taskId).to.equal(undefined);
        expect(promoted?.expiresAt).to.equal(undefined);
        expect(promoted?.retentionPolicy).to.equal('permanent');
        expect(promoted?.memorySpaceId).to.equal('default:global');
        expect(repository.store.memoryVectors).to.deep.equal([]);
        expect(repository.store.memorySpaces.some(space => space.id === 'default:global' && space.scope === 'global' && space.workspacePath === undefined)).to.equal(true);
        const audit = repository.store.events.find(event => event.eventType === 'memory.promoted');
        expect(audit?.workspacePath).to.equal('/workspace');
        expect(audit?.payload).to.contain('"previousScope":"repository"');
        expect(audit?.payload).to.contain('"previousWorkspacePath":"/workspace"');
        expect(audit?.payload).to.contain('"reason":"Reviewed by user for IDE scope."');
        expect(audit?.payload).to.not.contain('Project memory content.');
    });

    it('demotes IDE memory to workspace memory, preserves evidence, and records sanitized audit', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        await service.updateVectorSettings({
            workspacePath: '/workspace',
            enabled: true,
            consent: true,
            userConsentAt: '2026-05-20T10:00:00.000Z'
        });
        repository.store.memories = [
            memoryFixture({
                id: 'mem_global',
                scope: 'global',
                workspacePath: undefined,
                title: 'IDE preference',
                content: 'Prefer the IDE-wide pattern.',
                evidence: 'User approved from global memory review.',
                source: 'manual',
                retentionPolicy: 'permanent',
                memorySpaceId: 'default:global'
            })
        ];

        const demoted = await service.demoteMemoryToWorkspace({
            workspacePath: '/workspace',
            id: 'mem_global',
            reason: 'Only applies to this project.'
        });

        expect(demoted?.scope).to.equal('workspace');
        expect(demoted?.workspacePath).to.equal('/workspace');
        expect(demoted?.repositoryUrl).to.equal(undefined);
        expect(demoted?.repositoryId).to.equal(undefined);
        expect(demoted?.sessionId).to.equal(undefined);
        expect(demoted?.taskId).to.equal(undefined);
        expect(demoted?.expiresAt).to.equal(undefined);
        expect(demoted?.retentionPolicy).to.equal('manual');
        expect(demoted?.memorySpaceId).to.equal('default:workspace:/workspace');
        expect(demoted?.evidence).to.equal('User approved from global memory review.');
        expect(repository.store.memoryVectors.map(vector => ({
            memoryId: vector.memoryId,
            workspacePath: vector.workspacePath,
            scope: vector.scope
        }))).to.deep.equal([{
            memoryId: 'mem_global',
            workspacePath: '/workspace',
            scope: 'workspace'
        }]);
        expect(repository.store.memorySpaces.some(space => space.id === 'default:workspace:/workspace' && space.scope === 'workspace' && space.workspacePath === '/workspace')).to.equal(true);
        const audit = repository.store.events.find(event => event.eventType === 'memory.demoted');
        expect(audit?.workspacePath).to.equal('/workspace');
        expect(audit?.payload).to.contain('"previousScope":"global"');
        expect(audit?.payload).to.contain('"reason":"Only applies to this project."');
        expect(audit?.payload).to.contain('"changedFields":["scope","workspacePath","retentionPolicy","memorySpaceId"]');
        expect(audit?.payload).to.not.contain('Prefer the IDE-wide pattern.');
        expect(audit?.payload).to.not.contain('User approved from global memory review.');
    });

    it('records sanitized audit events for memory lifecycle operations', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        const workspacePath = '/workspace';
        const secretText = 'API_KEY=abcdefghijklmnopqrstuvwxyz123456';

        const created = await service.addMemory({
            workspacePath,
            scope: 'workspace',
            memoryType: 'manual_note',
            title: 'Audit target',
            content: `Do not leak ${secretText}.`
        });
        await service.updateMemoryAccess({ workspacePath, id: created.id });
        await service.updateMemory({
            workspacePath,
            id: created.id,
            patch: { content: `Updated without leaking ${secretText}.`, status: 'active' }
        });
        await service.runMemoryDecay({
            workspacePath,
            now: '2026-07-20T00:00:00.000Z'
        });
        await service.forgetMemory({ workspacePath, id: created.id });

        const auditEvents = repository.store.events.filter(event => event.eventType.startsWith('memory.') && event.eventType !== 'memory.suggested');
        expect(auditEvents.map(event => event.eventType)).to.include.members([
            'memory.created',
            'memory.accessed',
            'memory.edited',
            'memory.decayed',
            'memory.pruning_proposed',
            'memory.deleted'
        ]);
        expect(JSON.stringify(auditEvents)).not.to.contain(secretText);
        expect(auditEvents.every(event => event.payload?.includes(`"memoryId":"${created.id}"`))).to.equal(true);
        expect(auditEvents.find(event => event.eventType === 'memory.edited')?.payload).to.contain('"changedFields":["content"]');
    });

    it('creates reviewable topic consolidation candidates and marks sources superseded only after approval', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        repository.store.memories = [
            memoryFixture({
                id: 'mem_auth_decision',
                workspacePath: '/workspace',
                title: 'Auth decision',
                content: 'Auth tokens must be validated locally before calling remote services.',
                importance: 'high',
                weight: 0.8
            }),
            memoryFixture({
                id: 'mem_auth_testing',
                workspacePath: '/workspace',
                title: 'Auth testing',
                content: 'Auth tests cover token validation failures and local fallback behavior.',
                importance: 'medium',
                weight: 0.6
            }),
            memoryFixture({
                id: 'mem_auth_secret',
                workspacePath: '/workspace',
                title: 'Auth secret',
                content: 'Auth API_KEY=abcdefghijklmnopqrstuvwxyz123456 should never be exported.',
                importance: 'critical',
                weight: 1
            })
        ];

        const result = await service.proposeMemoryConsolidation({
            workspacePath: '/workspace',
            topic: 'auth',
            memoryIds: ['mem_auth_decision', 'mem_auth_testing', 'mem_auth_secret']
        });

        expect(result.created).to.equal(true);
        expect(result.candidate?.status).to.equal('candidate');
        expect(result.candidate?.source).to.equal('memory-consolidation');
        expect(result.candidate?.supersedes).to.have.members(['mem_auth_decision', 'mem_auth_testing']);
        expect(result.candidate?.content).to.not.contain('API_KEY');
        expect(result.skippedSensitiveMemoryIds).to.deep.equal(['mem_auth_secret']);
        expect(repository.store.memories.find(memory => memory.id === 'mem_auth_decision')?.supersededBy).to.equal(undefined);
        expect(repository.store.events.find(event => event.eventType === 'memory.consolidated')?.payload).to.contain('"supersedes":["mem_auth_decision","mem_auth_testing"]');

        const approved = await service.updateMemory({
            workspacePath: '/workspace',
            id: result.candidate!.id,
            patch: { status: 'active', staleStatus: 'fresh' }
        });

        expect(approved?.status).to.equal('active');
        expect(repository.store.memories.find(memory => memory.id === 'mem_auth_decision')?.supersededBy).to.equal(result.candidate?.id);
        expect(repository.store.memories.find(memory => memory.id === 'mem_auth_testing')?.supersededBy).to.equal(result.candidate?.id);
        expect(repository.store.memories.find(memory => memory.id === 'mem_auth_secret')?.supersededBy).to.equal(undefined);
        const supersededEvents = repository.store.events.filter(event => event.eventType === 'memory.superseded');
        expect(supersededEvents).to.have.length(2);
        expect(supersededEvents.every(event => event.payload?.includes(`"supersededBy":"${result.candidate?.id}"`))).to.equal(true);
        expect(JSON.stringify(supersededEvents)).not.to.contain('API_KEY');
    });

    it('runs memory decay as an operational action without deleting memories', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        repository.store.memories = [
            memoryFixture({
                id: 'mem_old_unused',
                workspacePath: '/workspace',
                title: 'Old unused memory',
                weight: 0.6,
                accessCount: 0,
                lastAccessedAt: '2026-01-01T00:00:00.000Z'
            }),
            memoryFixture({
                id: 'mem_recent',
                workspacePath: '/workspace',
                title: 'Recent memory',
                weight: 0.6,
                lastAccessedAt: '2026-05-19T00:00:00.000Z',
                updatedAt: '2026-05-19T00:00:00.000Z'
            }),
            memoryFixture({
                id: 'mem_sensitive',
                workspacePath: '/workspace',
                title: 'Sensitive memory',
                content: 'API_KEY = abcdefghijklmnopqrstuvwxyz123456',
                source: 'manual',
                evidence: 'reviewed',
                weight: 0.6,
                lastAccessedAt: '2026-05-19T00:00:00.000Z',
                updatedAt: '2026-05-19T00:00:00.000Z'
            }),
            memoryFixture({
                id: 'mem_other_workspace',
                workspacePath: '/other',
                title: 'Other workspace memory',
                weight: 0.6,
                lastAccessedAt: '2026-01-01T00:00:00.000Z'
            })
        ];

        const dryRun = await service.runMemoryDecay({
            workspacePath: '/workspace',
            now: '2026-05-20T00:00:00.000Z',
            dryRun: true
        });
        expect(dryRun.evaluated).to.equal(3);
        expect(dryRun.decayed).to.equal(1);
        expect(dryRun.pruningProposals.find(proposal => proposal.id === 'mem_old_unused')?.action).to.equal('archive');
        expect(dryRun.pruningProposals.find(proposal => proposal.id === 'mem_sensitive')?.action).to.equal('remove');
        expect(repository.store.memories.find(memory => memory.id === 'mem_old_unused')?.weight).to.equal(0.6);

        const result = await service.runMemoryDecay({
            workspacePath: '/workspace',
            now: '2026-05-20T00:00:00.000Z'
        });

        expect(result.evaluated).to.equal(3);
        expect(result.decayed).to.equal(1);
        expect(result.changes[0].id).to.equal('mem_old_unused');
        expect(result.pruningProposals.every(proposal => proposal.reviewRequired)).to.equal(true);
        expect(repository.store.memories).to.have.length(4);
        expect(repository.store.memories.find(memory => memory.id === 'mem_old_unused')?.weight).to.be.lessThan(0.6);
        expect(repository.store.memories.find(memory => memory.id === 'mem_recent')?.weight).to.equal(0.6);
        expect(repository.store.memories.find(memory => memory.id === 'mem_other_workspace')?.weight).to.equal(0.6);
        expect(repository.store.events.some(event => event.payload?.includes('"action":"decay"'))).to.equal(true);
    });

    it('forgets project memory together with vectors and derived knowledge links', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        repository.store.memories = [
            memoryFixture({ id: 'mem_forget', workspacePath: '/workspace' })
        ];
        repository.store.memoryVectors = [{
            id: 'vec_forget',
            memoryId: 'mem_forget',
            workspacePath: '/workspace',
            scope: 'workspace',
            modelId: 'local-hash-v1',
            dimensions: 32,
            contentHash: 'hash',
            vector: [0.1],
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z'
        }];
        repository.store.knowledgeGraphs = [{
            id: 'kg',
            workspacePath: '/workspace',
            scope: 'workspace',
            title: 'Project Decisions',
            status: 'active',
            concepts: [
                {
                    id: 'root',
                    graphId: 'kg',
                    kind: 'concept',
                    title: 'Root',
                    summary: 'Root concept.',
                    status: 'active',
                    createdAt: '2026-01-01T00:00:00.000Z',
                    updatedAt: '2026-01-01T00:00:00.000Z'
                },
                {
                    id: 'concept_forget',
                    graphId: 'kg',
                    kind: 'decision',
                    title: 'Project memory',
                    summary: 'Project memory content.',
                    status: 'active',
                    sourceKind: 'project-memory',
                    sourceId: 'mem_forget',
                    createdAt: '2026-01-01T00:00:00.000Z',
                    updatedAt: '2026-01-01T00:00:00.000Z'
                }
            ],
            links: [{
                id: 'link_forget',
                graphId: 'kg',
                sourceConceptId: 'root',
                targetConceptId: 'concept_forget',
                linkKind: 'documents',
                confidenceScore: 0.8,
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z'
            }],
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z'
        }];

        const forgotten = await service.forgetMemory({ workspacePath: '/workspace', id: 'mem_forget' });

        expect(forgotten).to.equal(true);
        expect(repository.store.memories.some(memory => memory.id === 'mem_forget')).to.equal(false);
        expect(repository.store.memoryVectors.some(vector => vector.memoryId === 'mem_forget')).to.equal(false);
        expect(repository.store.knowledgeGraphs[0].concepts.some(concept => concept.id === 'concept_forget')).to.equal(false);
        expect(repository.store.knowledgeGraphs[0].links.some(link => link.targetConceptId === 'concept_forget')).to.equal(false);
        expect(repository.store.events.some(event => event.payload?.includes('"action":"forgotten"'))).to.equal(true);
    });

    it('forgets workspace prompt events and memories derived from them only for the current workspace', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        repository.store.events = [
            {
                id: 'event_prompt',
                workspacePath: '/workspace',
                eventType: 'prompt.submitted',
                promptSignature: 'sig_prompt',
                payload: JSON.stringify({ intent: 'test' }),
                createdAt: '2026-01-01T00:00:00.000Z'
            },
            {
                id: 'event_file',
                workspacePath: '/workspace',
                eventType: 'file.opened',
                createdAt: '2026-01-01T00:00:00.000Z'
            },
            {
                id: 'event_other_prompt',
                workspacePath: '/other',
                eventType: 'prompt.submitted',
                promptSignature: 'sig_other',
                createdAt: '2026-01-01T00:00:00.000Z'
            }
        ];
        repository.store.memories = [
            memoryFixture({ id: 'mem_prompt', source: 'event:prompt.submitted', evidence: JSON.stringify({ eventId: 'event_prompt', promptSignature: 'sig_prompt' }) }),
            memoryFixture({ id: 'mem_manual', source: 'manual' }),
            memoryFixture({ id: 'mem_other', workspacePath: '/other', source: 'event:prompt.submitted', evidence: JSON.stringify({ eventId: 'event_other_prompt' }) })
        ];
        repository.store.memoryVectors = [
            {
                id: 'vec_prompt',
                memoryId: 'mem_prompt',
                workspacePath: '/workspace',
                scope: 'workspace',
                modelId: 'local-hash-v1',
                dimensions: 32,
                contentHash: 'hash',
                vector: [0.1],
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z'
            }
        ];
        repository.store.knowledgeGraphs = [{
            id: 'kg',
            workspacePath: '/workspace',
            scope: 'workspace',
            title: 'Project Decisions',
            status: 'active',
            concepts: [
                {
                    id: 'concept_prompt',
                    graphId: 'kg',
                    kind: 'decision',
                    title: 'Prompt memory',
                    summary: 'Prompt memory content.',
                    status: 'active',
                    sourceKind: 'project-memory',
                    sourceId: 'mem_prompt',
                    createdAt: '2026-01-01T00:00:00.000Z',
                    updatedAt: '2026-01-01T00:00:00.000Z'
                }
            ],
            links: [{
                id: 'link_prompt',
                graphId: 'kg',
                sourceConceptId: 'concept_prompt',
                targetConceptId: 'concept_prompt',
                linkKind: 'derived_from',
                confidenceScore: 0.8,
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z'
            }],
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z'
        }];

        const result = await service.forgetWorkspaceLearningData({ workspacePath: '/workspace' });

        expect(result).to.deep.include({
            promptEventsDeleted: 1,
            derivedMemoriesDeleted: 1,
            memoryVectorsDeleted: 1,
            knowledgeConceptsDeleted: 1,
            knowledgeLinksDeleted: 1
        });
        expect(repository.store.events.some(event => event.id === 'event_prompt')).to.equal(false);
        expect(repository.store.events.some(event => event.id === 'event_file')).to.equal(true);
        expect(repository.store.events.some(event => event.id === 'event_other_prompt')).to.equal(true);
        expect(repository.store.events.some(event => event.payload?.includes('workspace-learning-forgotten'))).to.equal(true);
        expect(repository.store.memories.map(memory => memory.id)).to.have.members(['mem_manual', 'mem_other']);
        expect(repository.store.memoryVectors).to.have.length(0);
        expect(repository.store.knowledgeGraphs[0].concepts).to.have.length(0);
        expect(repository.store.knowledgeGraphs[0].links).to.have.length(0);
    });

    it('keeps wait-compatible lifecycle memory fields when provided by a compatible branch', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        repository.store.memories = [
            memoryFixture({
                id: 'mem_lifecycle',
                workspacePath: '/workspace'
            })
        ];
        const lifecyclePatch = {
            staleStatus: 'possibly_stale',
            importance: 'high',
            weight: 0.82,
            accessCount: 7,
            lastAccessedAt: '2026-01-02T00:00:00.000Z'
        } as MemoryUpdateMemoryRequest['patch'] & {
            importance: string;
            weight: number;
            accessCount: number;
            lastAccessedAt: string;
        };

        const updated = await service.updateMemory({
            workspacePath: '/workspace',
            id: 'mem_lifecycle',
            patch: lifecyclePatch
        });
        const lifecycle = updated as MemoryItem & {
            importance?: string;
            weight?: number;
            accessCount?: number;
            lastAccessedAt?: string;
        };

        expect(lifecycle?.staleStatus).to.equal('possibly_stale');
        expect(lifecycle?.importance).to.equal('high');
        expect(lifecycle?.weight).to.equal(0.82);
        expect(lifecycle?.accessCount).to.equal(7);
        expect(lifecycle?.lastAccessedAt).to.equal('2026-01-02T00:00:00.000Z');
    });

    it('keeps JSON-backed project memory retrieval when FTS memory search is unavailable', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        repository.store.memories = [
            memoryFixture({
                id: 'mem_match',
                workspacePath: '/workspace',
                title: 'Project convention',
                content: 'Use JSON fallback for memory retrieval.'
            }),
            memoryFixture({
                id: 'mem_other',
                workspacePath: '/other-workspace',
                title: 'Other workspace',
                content: 'Should not be returned.'
            })
        ];

        const results = await service.search({
            workspacePath: '/workspace',
            text: 'JSON fallback',
            limit: 5,
            sourceKinds: ['project-memory']
        });

        expect(results.map(result => result.id)).to.deep.equal(['mem_match']);
        expect(results[0].evidence).to.equal('pi_memory_items:fresh');
        expect(repository.store.memories.find(memory => memory.id === 'mem_match')?.accessCount).to.equal(1);
    });

    it('excludes expired session and task memories from normal retrieval and dashboard views', async function () {
        this.timeout(5000);
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        repository.store.memories = [
            memoryFixture({
                id: 'mem_workspace',
                workspacePath: '/workspace',
                title: 'Persistent JSON memory',
                content: 'Use normal project memory retrieval.'
            }),
            memoryFixture({
                id: 'mem_expired_session',
                scope: 'session',
                workspacePath: '/workspace',
                sessionId: 'session_alpha',
                expiresAt: '2026-01-01T00:00:00.000Z',
                retentionPolicy: 'ttl',
                title: 'Expired session memory',
                content: 'Expired session memory must not be retrieved.'
            }),
            memoryFixture({
                id: 'mem_expired_task',
                scope: 'task',
                workspacePath: '/workspace',
                taskId: 'task_alpha',
                expiresAt: '2026-01-01T00:00:00.000Z',
                retentionPolicy: 'task',
                title: 'Expired task memory',
                content: 'Expired task memory must not be retrieved.'
            })
        ];

        const results = await service.search({
            workspacePath: '/workspace',
            text: 'memory',
            limit: 10,
            sourceKinds: ['project-memory']
        });
        const dashboard = await service.getDashboard('/workspace');

        expect(results.map(result => result.id)).to.deep.equal(['mem_workspace']);
        expect(dashboard.memories.map(memory => memory.id)).to.deep.equal(['mem_workspace']);
        expect(repository.store.memories.map(memory => memory.id)).to.include.members(['mem_expired_session', 'mem_expired_task']);
    });

    it('filters expired FTS memory hits before ranking', async () => {
        const repository = new FtsMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        repository.memorySearchHits = [
            {
                ...memoryFixture({
                    id: 'mem_expired_session',
                    scope: 'session',
                    sessionId: 'session_alpha',
                    expiresAt: '2026-01-01T00:00:00.000Z',
                    retentionPolicy: 'ttl',
                    title: 'Expired FTS memory',
                    content: 'Expired FTS memory should not rank.'
                }),
                score: 100,
                evidence: 'pi_memory_items_fts:bm25'
            },
            {
                ...memoryFixture({
                    id: 'mem_active',
                    title: 'Active FTS memory',
                    content: 'Active FTS memory should rank.'
                }),
                score: 1,
                evidence: 'pi_memory_items_fts:bm25'
            }
        ];

        const results = await service.search({
            workspacePath: '/workspace',
            text: 'FTS memory',
            limit: 10,
            sourceKinds: ['project-memory']
        });

        expect(results.map(result => result.id)).to.deep.equal(['mem_active']);
    });

    it('runs a local benchmark report for tokens recall latency and security', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        const key = repository.workspaceKey('/workspace');
        repository.store.memories = [
            memoryFixture({
                id: 'mem_benchmark',
                workspacePath: '/workspace',
                title: 'Use deterministic benchmarks',
                content: 'Benchmarks measure recall and latency for Memory.'
            })
        ];
        repository.store.codeChunks[key] = [{
            id: 'chunk_benchmark',
            workspacePath: '/workspace',
            fileId: 'file_benchmark',
            relativePath: 'src/benchmark.ts',
            chunkKind: 'file',
            title: 'Benchmark runner',
            content: 'Benchmark runner measures latency and token reduction.',
            contentHash: 'hash',
            startLine: 1,
            endLine: 2,
            estimatedTokens: 12,
            indexedAt: '2026-01-01T00:00:00.000Z'
        }];
        repository.store.files[key] = [{
            id: 'file_benchmark',
            relativePath: 'src/benchmark.ts',
            fileName: 'benchmark.ts',
            extension: '.ts',
            languageId: 'typescript',
            sizeBytes: 128,
            contentHash: 'hash',
            isIgnored: false,
            isGenerated: false,
            isBinary: false,
            isSensitive: false
        }];

        const report = await service.runBenchmarks({ workspacePath: '/workspace', limit: 2 });

        expect(report.datasetSize).to.equal(2);
        expect(report.cases.every(item => item.hit)).to.equal(true);
        expect(report.recall).to.equal(1);
        expect(report.averageLatencyMs).to.be.greaterThanOrEqual(0);
        expect(report.security.status).to.equal('passed');
        expect(repository.store.benchmarkReports).to.have.lengthOf(1);

        const dashboard = await service.getDashboard('/workspace');
        expect(dashboard.benchmarkReport?.generatedAt).to.equal(report.generatedAt);
        expect(dashboard.benchmarkReports.map(item => item.generatedAt)).to.deep.equal([report.generatedAt]);
    });

    it('imports and exports optional ICM bridge data without external binary dependency', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);

        const imported = await service.importIcmData({
            workspacePath: '/workspace',
            data: {
                memories: [{
                    id: 'icm-1',
                    topic: 'workspace',
                    title: 'Keep ICM optional',
                    text: 'Memory can import ICM memory but must keep ICM optional.',
                    kind: 'decision',
                    importance: 'critical'
                }],
                memoirs: [{
                    id: 'memoir-1',
                    name: 'Architecture',
                    concepts: [
                        { id: 'pi', name: 'Memory', description: 'IDE-native context.', labels: ['type:service'] },
                        { id: 'icm', name: 'ICM', description: 'Optional memory bridge.', labels: ['type:bridge'] }
                    ],
                    links: [{ from: 'pi', to: 'icm', relation: 'documents', confidence: 0.8 }]
                }]
            }
        });
        const exported = await service.exportIcmData({ workspacePath: '/workspace' });

        expect(imported.importedMemories).to.equal(1);
        expect(imported.importedMemoirs).to.equal(1);
        expect(repository.store.memories[0].status).to.equal('candidate');
        expect(repository.store.knowledgeGraphs[0].title).to.equal('Architecture');
        expect(exported.memories[0].title).to.equal('Keep ICM optional');
        expect(exported.memoirs[0].name).to.equal('Architecture');
        expect(exported.limits.some(limit => limit.includes('optional'))).to.equal(true);
    });

    it('keeps vector search disabled by default and requires consent before backfill', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        repository.store.memories = [
            memoryFixture({
                id: 'mem_vector_default',
                workspacePath: '/workspace',
                title: 'Vector default',
                content: 'Vector search should remain opt-in.'
            })
        ];

        const initial = await service.getVectorStatus('/workspace');
        await service.updateVectorSettings({ workspacePath: '/workspace', enabled: true });
        const backfill = await service.backfillMemoryVectors('/workspace');

        expect(initial.enabled).to.equal(false);
        expect(initial.consented).to.equal(false);
        expect(backfill.totalVectors).to.equal(0);
        expect(backfill.backfillStatus).to.equal('not_started');
        expect(backfill.lastError).to.equal('Vector backfill requires user consent.');
    });

    it('does not call the optional vector backend until vector search is explicitly consented', async () => {
        const repository = new LocalVectorMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        const workspacePath = '/workspace';
        const key = repository.workspaceKey(workspacePath);
        repository.store.settings[key] = {
            workspacePath,
            enabled: true,
            graphEnabled: false,
            memoryEnabled: true,
            skillSuggestionsEnabled: true,
            vectorSearch: {
                enabled: true,
                localModelId: 'pi-local-hash-embedding-v1',
                dimensions: 64,
                backfillStatus: 'not_started'
            },
            updatedAt: '2026-01-01T00:00:00.000Z'
        };
        repository.store.memories = [
            memoryFixture({
                id: 'mem_lexical_only',
                workspacePath,
                title: 'Lexical opt in guard',
                content: 'Lexical retrieval must work while vector retrieval waits for consent.'
            })
        ];
        repository.vectorHits = [{
            vector: {
                id: 'vec_not_consented',
                memoryId: 'mem_lexical_only',
                workspacePath,
                scope: 'workspace',
                modelId: 'pi-local-hash-embedding-v1',
                dimensions: 64,
                contentHash: 'hash',
                vector: new Array(64).fill(0.1),
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z'
            },
            memory: repository.store.memories[0],
            score: 0.99
        }];

        const results = await service.search({
            workspacePath,
            text: 'lexical opt in guard',
            limit: 5,
            sourceKinds: ['project-memory']
        });

        expect(repository.vectorSearchCalls).to.deep.equal([]);
        expect(results.map(result => result.id)).to.deep.equal(['mem_lexical_only']);
        expect(results[0].evidence ?? '').not.to.contain('pi_memory_vectors');
    });

    it('records consent without running memory-vector backfill automatically', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        repository.store.memories = [
            memoryFixture({
                id: 'mem_manual_backfill',
                workspacePath: '/workspace',
                title: 'Manual backfill gate',
                content: 'Vector memories are created only by an explicit backfill action.'
            })
        ];

        const status = await service.updateVectorSettings({ workspacePath: '/workspace', enabled: true, consent: true });

        expect(status.enabled).to.equal(true);
        expect(status.consented).to.equal(true);
        expect(status.backfillStatus).to.equal('not_started');
        expect(status.pendingMemories).to.equal(1);
        expect(status.totalVectors).to.equal(0);
        expect(repository.store.memoryVectors).to.deep.equal([]);
    });

    it('backfills deterministic local memory vectors and uses them with BM25 fallback ranking', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        repository.store.memories = [
            memoryFixture({
                id: 'mem_restart',
                workspacePath: '/workspace',
                title: 'Service restart convention',
                content: 'Restart the application after configuration changes.'
            }),
            memoryFixture({
                id: 'mem_other',
                workspacePath: '/workspace',
                title: 'Unrelated memory',
                content: 'Database indexes are rebuilt during maintenance.'
            })
        ];

        await service.updateVectorSettings({ workspacePath: '/workspace', enabled: true, consent: true });
        const status = await service.backfillMemoryVectors('/workspace');
        const results = await service.search({
            workspacePath: '/workspace',
            text: 'restart app',
            limit: 5,
            sourceKinds: ['project-memory']
        });

        expect(status.enabled).to.equal(true);
        expect(status.consented).to.equal(true);
        expect(status.totalVectors).to.equal(2);
        expect(status.pendingMemories).to.equal(0);
        expect(repository.store.memoryVectors).to.have.length(2);
        expect(results[0].id).to.equal('mem_restart');
        expect(results[0].evidence ?? '').to.contain('pi_memory_vectors:pi-local-hash-embedding-v1');
    });

    it('merges lexical BM25 and vector signals for the same memory during hybrid ranking', async () => {
        const repository = new FtsMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        const workspacePath = '/workspace';
        const memory = memoryFixture({
            id: 'mem_hybrid',
            workspacePath,
            title: 'Hybrid ranking policy',
            content: 'Hybrid ranking combines lexical evidence and local vector evidence.'
        });
        repository.store.memories = [memory];
        repository.memorySearchHits = [{
            ...memory,
            snippet: 'Hybrid ranking combines lexical evidence.',
            score: 0.6,
            evidence: 'pi_memory_items_fts:bm25'
        }];

        await service.updateVectorSettings({ workspacePath, enabled: true, consent: true, dimensions: 64 });
        await service.backfillMemoryVectors(workspacePath);
        const results = await service.search({
            workspacePath,
            text: 'hybrid ranking vector evidence',
            limit: 5,
            sourceKinds: ['project-memory']
        });

        expect(repository.memorySearchCalls).to.have.length(1);
        expect(results.map(result => result.id)).to.deep.equal(['mem_hybrid']);
        expect(results[0].evidence).to.equal('pi_memory_items_fts:bm25 + pi_memory_vectors:pi-local-hash-embedding-v1');
        expect(results[0].rankingSignals?.bm25Score).to.equal(0.6);
        expect(results[0].rankingSignals?.vectorScore).to.be.greaterThan(0);
    });

    it('does not embed memory content when the secret scanner detects sensitive values', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        repository.store.memories = [
            memoryFixture({
                id: 'mem_public',
                workspacePath: '/workspace',
                title: 'Public convention',
                content: 'Restart the application after changing safe configuration values.'
            }),
            memoryFixture({
                id: 'mem_secret',
                workspacePath: '/workspace',
                title: 'Sensitive token',
                content: 'Do not embed TOKEN=abcdefghijklmnopqrstuvwxyz123456 in vectors.'
            })
        ];

        await service.updateVectorSettings({ workspacePath: '/workspace', enabled: true, consent: true });
        const status = await service.backfillMemoryVectors('/workspace');

        expect(status.totalMemories).to.equal(1);
        expect(status.totalVectors).to.equal(1);
        expect(status.pendingMemories).to.equal(0);
        expect(repository.store.memoryVectors.map(vector => vector.memoryId)).to.deep.equal(['mem_public']);
    });

    it('removes an existing memory vector when an update introduces sensitive content', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);

        await service.updateVectorSettings({ workspacePath: '/workspace', enabled: true, consent: true });
        const memory = await service.addMemory({
            workspacePath: '/workspace',
            scope: 'workspace',
            memoryType: 'project_decision',
            title: 'Deployment note',
            content: 'Use the staging deployment checklist.'
        });
        expect(repository.store.memoryVectors.map(vector => vector.memoryId)).to.deep.equal([memory.id]);

        await service.updateMemory({
            workspacePath: '/workspace',
            id: memory.id,
            patch: {
                content: 'Use TOKEN=abcdefghijklmnopqrstuvwxyz123456 for staging deployment.'
            }
        });

        expect(repository.store.memoryVectors.some(vector => vector.memoryId === memory.id)).to.equal(false);
        const status = await service.getVectorStatus('/workspace');
        expect(status.totalMemories).to.equal(0);
        expect(status.totalVectors).to.equal(0);
    });

    it('uses the optional local vector repository backend when available', async () => {
        const repository = new LocalVectorMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        repository.store.memories = [
            memoryFixture({
                id: 'mem_backend',
                workspacePath: '/workspace',
                title: 'Semantic backend memory',
                content: 'The local SQLite vector backend can retrieve semantic matches.'
            })
        ];
        repository.vectorHits = [{
            vector: {
                id: 'vec_backend',
                memoryId: 'mem_backend',
                workspacePath: '/workspace',
                scope: 'workspace',
                modelId: 'pi-local-hash-embedding-v1',
                dimensions: 64,
                contentHash: 'hash',
                vector: new Array(64).fill(0.1),
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z'
            },
            memory: repository.store.memories[0],
            score: 0.91
        }];

        await service.updateVectorSettings({ workspacePath: '/workspace', enabled: true, consent: true });
        const status = await service.getVectorStatus('/workspace');
        const results = await service.search({
            workspacePath: '/workspace',
            text: 'semantic vector backend',
            limit: 5,
            sourceKinds: ['project-memory']
        });

        expect(status.backend).to.equal('sqlite-local');
        expect(repository.vectorSearchCalls).to.have.length(1);
        expect(results[0].id).to.equal('mem_backend');
        expect(results[0].rankingSignals?.vectorScore).to.equal(0.91);
    });

    it('adds memory health to the dashboard', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        repository.store.memories = [
            memoryFixture({
                id: 'mem_stale',
                workspacePath: '/workspace',
                importance: 'critical',
                source: 'decision-record:2025-01-01',
                updatedAt: '2026-01-01T00:00:00.000Z'
            })
        ];

        const dashboard = await service.getDashboard('/workspace');

        expect(dashboard.memoryHealth.total).to.equal(1);
        expect(dashboard.memoryHealth.critical).to.equal(1);
        expect(dashboard.memories[0].importance).to.equal('critical');
    });

    it('routes project memory retrieval through optional FTS search with sanitized query and BM25 score ordering', async () => {
        const repository = new FtsMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        repository.memorySearchHits = [
            {
                ...memoryFixture({
                    id: 'mem_low',
                    workspacePath: '/workspace',
                    title: 'Lower ranked memory',
                    content: 'A less relevant memory.'
                }),
                snippet: 'Lower BM25 match.',
                score: 0.25,
                evidence: 'pi_memory_items_fts:bm25'
            },
            {
                ...memoryFixture({
                    id: 'mem_high',
                    workspacePath: '/workspace',
                    title: 'Higher ranked memory',
                    content: 'The most relevant memory.'
                }),
                snippet: 'Higher BM25 match.',
                score: 0.91,
                evidence: 'pi_memory_items_fts:bm25'
            },
            {
                ...memoryFixture({
                    id: 'mem_other_workspace',
                    workspacePath: '/other-workspace',
                    title: 'Other workspace',
                    content: 'Must not leak across workspace boundaries.'
                }),
                score: 1
            }
        ];

        const results = await service.search({
            workspacePath: '/workspace',
            text: 'Project "decision" OR DROP TABLE pi_memory_items; -- stale*',
            limit: 5,
            sourceKinds: ['project-memory']
        });

        expect(repository.memorySearchCalls).to.deep.equal([{
            workspacePath: '/workspace',
            ftsQuery: '"project" OR "decision" OR "drop" OR "table" OR "pi_memory_items" OR "stale"',
            limit: 5
        }]);
        expect(results.map(result => result.id)).to.deep.equal(['mem_high', 'mem_low']);
        expect(results[0].snippet).to.equal('Higher BM25 match.');
        expect(results[0].evidence).to.equal('pi_memory_items_fts:bm25');
    });

    it('extracts feedback records from rejected context events and resolves them', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        repository.store.contextSuggestions = [{
            id: 'mem_context',
            workspacePath: '/workspace',
            promptSignature: 'prompt_alpha',
            title: 'Rejected memory context',
            reason: 'Project memory',
            sourceKind: 'project-memory',
            score: 0.9,
            estimatedTokens: 10,
            createdAt: '2026-01-01T00:00:00.000Z'
        }];

        await service.recordEvent({
            workspacePath: '/workspace',
            eventType: 'context.rejected',
            promptSignature: 'prompt_alpha',
            payload: JSON.stringify({
                id: 'mem_context',
                title: 'Rejected memory context',
                sourceKind: 'project-memory',
                status: 'rejected',
                evidence: 'User removed it from the context cart.'
            })
        });
        const feedback = await service.listFeedbackForPrompt({
            workspaceRoot: '/workspace',
            promptSignature: 'prompt_alpha'
        });
        const resolved = await service.resolveFeedback({
            workspacePath: '/workspace',
            id: feedback[0].id
        });

        expect(feedback).to.have.length(1);
        expect(feedback[0].feedback).to.equal('rejected');
        expect(feedback[0].targetSourceKind).to.equal('project-memory');
        expect(repository.store.contextSuggestions[0].accepted).to.equal(false);
        expect(resolved?.resolvedAt).to.not.equal(undefined);
    });

    it('records feedback for stale and rejected memory lifecycle updates', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        repository.store.memories = [
            memoryFixture({
                id: 'mem_lifecycle_feedback',
                workspacePath: '/workspace',
                title: 'Lifecycle feedback'
            })
        ];

        await service.updateMemory({
            workspacePath: '/workspace',
            id: 'mem_lifecycle_feedback',
            patch: { staleStatus: 'stale' }
        });
        await service.updateMemory({
            workspacePath: '/workspace',
            id: 'mem_lifecycle_feedback',
            patch: { status: 'rejected' }
        });

        expect(repository.store.feedbackRecords.map(record => record.feedback)).to.deep.equal(['stale', 'rejected']);
        expect(repository.store.feedbackRecords.every(record => record.targetSourceKind === 'project-memory')).to.equal(true);
    });

    it('lowers retrieval ranking for rejected memory feedback without deleting the source', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        repository.store.memories = [
            memoryFixture({
                id: 'mem_rejected',
                workspacePath: '/workspace',
                title: 'JSON fallback',
                content: 'JSON fallback rejected memory retrieval.'
            }),
            memoryFixture({
                id: 'mem_allowed',
                workspacePath: '/workspace',
                title: 'JSON fallback',
                content: 'JSON fallback accepted memory retrieval.'
            })
        ];
        await service.recordFeedback({
            workspacePath: '/workspace',
            targetKind: 'context-suggestion',
            targetId: 'mem_rejected',
            targetSourceKind: 'project-memory',
            feedback: 'rejected'
        });

        const results = await service.search({
            workspacePath: '/workspace',
            text: 'JSON fallback',
            limit: 5,
            sourceKinds: ['project-memory']
        });

        expect(results.map(result => result.id)).to.deep.equal(['mem_allowed', 'mem_rejected']);
        expect(results[1].score).to.be.lessThan(results[0].score);
    });

    it('retrieves unresolved feedback records as their own Context Cart source', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        await service.recordFeedback({
            workspacePath: '/workspace',
            targetKind: 'context-suggestion',
            targetId: 'mem_redis',
            targetSourceKind: 'project-memory',
            targetTitle: 'Use Redis',
            feedback: 'rejected',
            reason: 'outdated',
            evidence: 'Rejected from Context Cart',
            metadata: {
                correction: 'Use local cache coordination instead.'
            }
        });
        const resolved = await service.recordFeedback({
            workspacePath: '/workspace',
            targetKind: 'context-suggestion',
            targetId: 'mem_old',
            targetSourceKind: 'project-memory',
            targetTitle: 'Old Redis decision',
            feedback: 'stale',
            reason: 'already reviewed'
        });
        await service.resolveFeedback({
            workspacePath: '/workspace',
            id: resolved.id
        });
        await service.recordFeedback({
            workspacePath: '/other-workspace',
            targetKind: 'context-suggestion',
            targetId: 'mem_other',
            targetSourceKind: 'project-memory',
            targetTitle: 'Use Redis elsewhere',
            feedback: 'rejected',
            reason: 'outdated'
        });

        const results = await service.search({
            workspacePath: '/workspace',
            text: 'local cache',
            limit: 10,
            sourceKinds: ['feedback-record']
        });

        expect(results).to.have.length(1);
        expect(results[0].sourceKind).to.equal('feedback-record');
        expect(results[0].title).to.equal('Rejected feedback: Use Redis');
        expect(results[0].snippet).to.contain('Correction: Use local cache coordination instead.');
        expect(results[0].evidence).to.contain('pi_feedback_records:rejected:unresolved');
    });

    it('derives a default project decision knowledge graph from active workspace memories', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        repository.store.memories = [
            memoryFixture({
                id: 'mem_decision',
                workspacePath: '/workspace',
                memoryType: 'project_decision',
                title: 'Use local storage',
                content: 'Keep knowledge graph storage local-first.'
            }),
            memoryFixture({
                id: 'mem_candidate',
                workspacePath: '/workspace',
                status: 'candidate',
                title: 'Ignore inactive memory'
            })
        ];

        const results = await service.searchKnowledge({
            workspacePath: '/workspace',
            query: 'local-first',
            limit: 5
        });

        expect(repository.store.knowledgeGraphs).to.have.length(1);
        expect(repository.store.knowledgeGraphs[0].title).to.equal('Project Decisions');
        expect(repository.store.knowledgeGraphs[0].concepts.some(concept => concept.sourceId === 'mem_decision')).to.equal(true);
        expect(repository.store.knowledgeGraphs[0].concepts.some(concept => concept.sourceId === 'mem_candidate')).to.equal(false);
        expect(results.map(result => result.title)).to.include('Use local storage');
    });

    it('proposes surprising knowledge connections as inferred review candidates', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        repository.store.memories = [
            memoryFixture({
                id: 'mem_auth_decision',
                workspacePath: '/workspace',
                memoryType: 'project_decision',
                importance: 'high',
                title: 'Token review gates',
                content: 'Token review gates protect tenant boundaries during privileged access changes.'
            }),
            memoryFixture({
                id: 'mem_billing_security',
                workspacePath: '/workspace',
                memoryType: 'security_note',
                importance: 'medium',
                title: 'Billing tenant boundary risk',
                content: 'Billing workflows must preserve tenant boundaries and require review before access changes.'
            })
        ];

        await service.searchKnowledge({
            workspacePath: '/workspace',
            query: 'tenant boundaries',
            limit: 5
        });

        const graph = repository.store.knowledgeGraphs[0];
        const surprising = graph.links.find(link => link.linkKind === 'surprising_connection');
        expect(surprising?.status).to.equal('candidate');
        expect(surprising?.metadata?.classification).to.equal('inferred');
        expect(surprising?.metadata?.reviewRequired).to.equal(true);
        expect(surprising?.metadata?.surprisingConnection).to.equal(true);
        expect(surprising?.evidence).to.contain('Inferred review candidate');
    });

    it('creates reviewable deterministic contradiction candidates between memories', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);

        await service.addMemory({
            workspacePath: '/workspace',
            scope: 'workspace',
            memoryType: 'project_decision',
            title: 'Use Redis',
            content: 'Use Redis for cache coordination.'
        });
        await service.addMemory({
            workspacePath: '/workspace',
            scope: 'workspace',
            memoryType: 'project_decision',
            title: 'Do not use Redis',
            content: 'Do not use Redis for cache coordination.'
        });

        const candidates = repository.store.memories.filter(memory => memory.source === 'deterministic-contradiction-detector');
        expect(candidates).to.have.length(1);
        expect(candidates[0].status).to.equal('candidate');
        expect(candidates[0].workspacePath).to.equal('/workspace');
        expect(candidates[0].evidence).to.contain('opposite polarity');
        expect(candidates[0].originMarkers?.some(marker => marker.startsWith('contradiction:'))).to.equal(true);
    });

    it('creates reviewable deterministic contradiction candidates between memories and indexed docs or code', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        const workspacePath = '/workspace';
        const key = repository.workspaceKey(workspacePath);
        repository.store.codeChunks[key] = [{
            id: 'chunk_docs_redis',
            workspacePath,
            fileId: 'file_docs',
            relativePath: 'docs/cache.md',
            languageId: 'markdown',
            chunkKind: 'markdown-section',
            title: 'Do not use Redis',
            content: 'Do not use Redis for cache coordination.',
            contentHash: 'hash',
            startLine: 1,
            endLine: 2,
            estimatedTokens: 10,
            indexedAt: '2026-01-01T00:00:00.000Z'
        }];

        await service.addMemory({
            workspacePath,
            scope: 'workspace',
            memoryType: 'project_decision',
            title: 'Use Redis',
            content: 'Use Redis for cache coordination.'
        });

        const candidates = repository.store.memories.filter(memory => memory.source === 'deterministic-contradiction-detector');
        expect(candidates).to.have.length(1);
        expect(candidates[0].status).to.equal('candidate');
        expect(candidates[0].evidence).to.contain('local-docs:chunk_docs_redis');
    });

    it('creates reviewable candidates when local docs contradict indexed implementation', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        const workspacePath = '/workspace';
        const key = repository.workspaceKey(workspacePath);
        repository.store.codeChunks[key] = [
            {
                id: 'chunk_docs_redis',
                workspacePath,
                fileId: 'file_docs',
                relativePath: 'docs/cache.md',
                languageId: 'markdown',
                chunkKind: 'markdown-section',
                title: 'Do not use Redis',
                content: 'Do not use Redis for cache coordination.',
                contentHash: 'hash-doc',
                startLine: 1,
                endLine: 2,
                estimatedTokens: 10,
                indexedAt: '2026-01-01T00:00:00.000Z'
            },
            {
                id: 'chunk_code_redis',
                workspacePath,
                fileId: 'file_code',
                relativePath: 'src/cache.ts',
                languageId: 'typescript',
                chunkKind: 'symbol',
                title: 'Use Redis',
                content: 'Use Redis for cache coordination.',
                contentHash: 'hash-code',
                startLine: 10,
                endLine: 12,
                estimatedTokens: 10,
                indexedAt: '2026-01-01T00:00:00.000Z'
            }
        ];

        await service.addMemory({
            workspacePath,
            scope: 'workspace',
            memoryType: 'manual_note',
            title: 'Cache review',
            content: 'Review cache implementation against docs.'
        });

        const candidates = repository.store.memories.filter(memory => memory.source === 'deterministic-contradiction-detector');
        expect(candidates).to.have.length(1);
        expect(candidates[0].title).to.contain('docs contradict implementation');
        expect(candidates[0].evidence).to.contain('confidence:0.72');
        expect(candidates[0].evidence).to.contain('local-docs:chunk_docs_redis');
        expect(candidates[0].evidence).to.contain('code:chunk_code_redis');
        expect(candidates[0].weight).to.equal(0.72);
    });

    it('creates reviewable candidates for dangerous indirect dependencies in lockfiles', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        const workspacePath = '/workspace';
        const key = repository.workspaceKey(workspacePath);
        repository.store.codeChunks[key] = [
            {
                id: 'chunk_package_json',
                workspacePath,
                fileId: 'file_package',
                relativePath: 'package.json',
                languageId: 'json',
                chunkKind: 'json-block',
                title: 'dependencies',
                content: JSON.stringify({ dependencies: { express: '^4.18.0' } }),
                contentHash: 'hash-package',
                startLine: 1,
                endLine: 8,
                estimatedTokens: 20,
                indexedAt: '2026-01-01T00:00:00.000Z'
            },
            {
                id: 'chunk_package_lock',
                workspacePath,
                fileId: 'file_lock',
                relativePath: 'package-lock.json',
                languageId: 'json',
                chunkKind: 'json-block',
                title: 'packages',
                content: JSON.stringify({
                    packages: {
                        '': { dependencies: { express: '^4.18.0' } },
                        'node_modules/event-stream': { version: '3.3.6' }
                    }
                }),
                contentHash: 'hash-lock',
                startLine: 1,
                endLine: 20,
                estimatedTokens: 40,
                indexedAt: '2026-01-01T00:00:00.000Z'
            }
        ];

        await service.addMemory({
            workspacePath,
            scope: 'workspace',
            memoryType: 'manual_note',
            title: 'Dependency review',
            content: 'Review dependency graph.'
        });

        const candidates = repository.store.memories.filter(memory => memory.source === 'deterministic-contradiction-detector');
        expect(candidates).to.have.length(1);
        expect(candidates[0].title).to.contain('dangerous indirect dependency');
        expect(candidates[0].evidence).to.contain('heuristic: dangerous indirect dependency "event-stream"');
        expect(candidates[0].evidence).to.contain('confidence:0.86');
        expect(candidates[0].evidence).to.contain('direct-manifest:absent');
        expect(candidates[0].originMarkers).to.include('risk:dangerous-indirect-dependency');
        expect(candidates[0].status).to.equal('candidate');
    });

    it('creates knowledge concepts, links them, and exports dot and context-cart formats', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        const graph = await service.createKnowledgeGraph({
            workspacePath: '/workspace',
            title: 'Architecture Knowledge'
        });
        const decision = await service.addKnowledgeConcept({
            workspacePath: '/workspace',
            graphId: graph.id,
            concept: {
                kind: 'decision',
                title: 'Persist locally',
                summary: 'Knowledge graph data is persisted in local Memory storage.',
                tags: ['storage']
            }
        });
        const consequence = await service.addKnowledgeConcept({
            workspacePath: '/workspace',
            graphId: graph.id,
            concept: {
                kind: 'constraint',
                title: 'No external runtime',
                summary: 'The graph does not require external services at runtime.'
            }
        });
        const link = await service.linkKnowledgeConcepts({
            workspacePath: '/workspace',
            graphId: graph.id,
            sourceConceptId: decision.id,
            targetConceptId: consequence.id,
            linkKind: 'supports',
            confidenceScore: 0.9
        });

        const dot = await service.exportKnowledgeGraph({ workspacePath: '/workspace', graphId: graph.id, format: 'dot' });
        const contextCart = await service.exportKnowledgeGraph({ workspacePath: '/workspace', graphId: graph.id, format: 'context-cart' });

        expect(link.linkKind).to.equal('supports');
        expect(dot.content).to.contain('digraph');
        expect(dot.content).to.contain('Persist locally');
        expect(contextCart.contextCart?.map(item => item.title)).to.deep.equal(['Persist locally', 'No external runtime']);
        expect(JSON.parse(contextCart.content).items).to.have.length(2);
    });

    it('persists, exports, searches, and relates knowledge across memory, file, symbol, doc, and event evidence', async () => {
        const repository = new InMemoryStoreRepository();
        const service = new MemoryServiceImpl();
        attachRepository(service, repository);
        const workspacePath = '/workspace';
        const key = repository.workspaceKey(workspacePath);
        repository.store.files[key] = [{
            id: 'file_cache',
            relativePath: 'src/cache.ts',
            fileName: 'cache.ts',
            extension: '.ts',
            languageId: 'typescript',
            sizeBytes: 120,
            contentHash: 'file_hash',
            isIgnored: false,
            isGenerated: false,
            isBinary: false,
            isSensitive: false,
            indexedAt: '2026-01-01T00:00:00.000Z'
        }];
        repository.store.symbols[key] = [{
            id: 'symbol_cache_service',
            fileId: 'file_cache',
            languageId: 'typescript',
            symbolKind: 'class',
            name: 'CacheService',
            fullName: 'CacheService',
            startLine: 1,
            endLine: 12
        }];
        repository.store.codeChunks[key] = [{
            id: 'doc_cache_policy',
            workspacePath,
            fileId: 'file_docs_cache',
            relativePath: 'docs/cache.md',
            languageId: 'markdown',
            chunkKind: 'markdown-section',
            title: 'Do not use Redis',
            content: 'Do not use Redis for cache coordination.',
            contentHash: 'doc_hash',
            startLine: 1,
            endLine: 4,
            estimatedTokens: 12,
            indexedAt: '2026-01-01T00:00:00.000Z'
        }];
        const memory = await service.addMemory({
            workspacePath,
            scope: 'workspace',
            memoryType: 'project_decision',
            title: 'Use Redis',
            content: 'Use Redis for cache coordination.'
        });
        const event = await service.recordEvent({
            workspacePath,
            eventType: 'prompt.submitted',
            relativePath: 'src/cache.ts',
            payload: JSON.stringify({ prompt: 'Explain CacheService Redis decision' }),
            promptSignature: 'prompt_cache'
        });
        const graph = await service.createKnowledgeGraph({
            workspacePath,
            title: 'Cache Knowledge'
        });
        const memoryConcept = await service.addKnowledgeConcept({
            workspacePath,
            graphId: graph.id,
            concept: {
                kind: 'memory',
                title: 'Cache memory',
                summary: memory.content,
                sourceKind: 'project-memory',
                sourceId: memory.id,
                evidence: `memory:${memory.id}`
            }
        });
        const fileConcept = await service.addKnowledgeConcept({
            workspacePath,
            graphId: graph.id,
            concept: {
                kind: 'file',
                title: 'Cache file',
                summary: 'CacheService implementation file.',
                sourceKind: 'code',
                sourceId: 'file_cache',
                uri: 'src/cache.ts',
                evidence: 'file:file_cache'
            }
        });
        const symbolConcept = await service.addKnowledgeConcept({
            workspacePath,
            graphId: graph.id,
            concept: {
                kind: 'component',
                title: 'CacheService symbol',
                summary: 'Symbol extracted from the code graph.',
                sourceKind: 'code-graph',
                sourceId: 'symbol_cache_service',
                uri: 'src/cache.ts:1',
                evidence: 'symbol:symbol_cache_service'
            }
        });
        const docConcept = await service.addKnowledgeConcept({
            workspacePath,
            graphId: graph.id,
            concept: {
                kind: 'document',
                title: 'Cache policy doc',
                summary: 'Local docs describe the cache coordination policy.',
                sourceKind: 'local-docs',
                sourceId: 'doc_cache_policy',
                uri: 'docs/cache.md',
                evidence: 'local-docs:doc_cache_policy'
            }
        });
        const eventConcept = await service.addKnowledgeConcept({
            workspacePath,
            graphId: graph.id,
            concept: {
                kind: 'concept',
                title: 'Cache prompt event',
                summary: 'Agent event that requested cache decision context.',
                sourceKind: 'agent-event',
                sourceId: event.id,
                evidence: `event:${event.id}`
            }
        });
        await service.linkKnowledgeConcepts({
            workspacePath,
            graphId: graph.id,
            sourceConceptId: memoryConcept.id,
            targetConceptId: docConcept.id,
            linkKind: 'contradicts',
            confidenceScore: 0.88,
            evidence: 'memory decision conflicts with local docs'
        });
        await service.linkKnowledgeConcepts({
            workspacePath,
            graphId: graph.id,
            sourceConceptId: fileConcept.id,
            targetConceptId: symbolConcept.id,
            linkKind: 'implements',
            confidenceScore: 0.92,
            evidence: 'file contains symbol'
        });
        await service.linkKnowledgeConcepts({
            workspacePath,
            graphId: graph.id,
            sourceConceptId: eventConcept.id,
            targetConceptId: memoryConcept.id,
            linkKind: 'derived_from',
            confidenceScore: 0.7,
            evidence: 'event requested memory context'
        });

        const exportedGraph = await service.exportKnowledgeGraph({ workspacePath, graphId: graph.id, format: 'json' });
        const searchResults = await service.searchKnowledge({ workspacePath, query: 'cache redis policy', limit: 10 });
        const bundle = await service.exportWorkspaceData({ workspacePath });
        const contradictionCandidates = repository.store.memories.filter(item => item.source === 'deterministic-contradiction-detector');
        const storedGraph = repository.store.knowledgeGraphs.find(item => item.id === graph.id);
        const exportedBundleGraph = bundle.knowledgeGraphs.find(item => item.id === graph.id);

        expect(storedGraph?.concepts.map(concept => concept.sourceKind)).to.have.members([
            'project-memory',
            'code',
            'code-graph',
            'local-docs',
            'agent-event'
        ]);
        expect(storedGraph?.links.map(link => link.linkKind)).to.include.members(['contradicts', 'implements', 'derived_from']);
        expect(JSON.parse(exportedGraph.content).links.some((link: { linkKind: string }) => link.linkKind === 'contradicts')).to.equal(true);
        expect(searchResults.map(result => result.sourceKind)).to.include.members(['project-memory', 'local-docs', 'knowledge-graph']);
        expect(bundle.files.map(file => file.id)).to.deep.equal(['file_cache']);
        expect(bundle.symbols.map(symbol => symbol.id)).to.deep.equal(['symbol_cache_service']);
        expect(bundle.codeChunks.map(chunk => chunk.id)).to.deep.equal(['doc_cache_policy']);
        expect(bundle.events.map(item => item.id)).to.include(event.id);
        expect(bundle.memories.map(item => item.id)).to.include(memory.id);
        expect(exportedBundleGraph?.concepts).to.have.length(5);
        expect(contradictionCandidates).to.have.length(1);
        expect(contradictionCandidates[0].evidence).to.contain('local-docs:doc_cache_policy');
    });
});

class InMemoryStoreRepository implements MemoryStoreRepository {

    store = emptyStore();
    replacedChunks: MemoryCodeChunk[] = [];
    retrievalCache: MemoryRetrievalCacheEntry[] = [];
    invalidatedCachePaths: string[][] = [];
    cacheHits = 0;
    cacheMisses = 0;
    cacheWriteCount = 0;

    async getStorePath(): Promise<string> {
        return path.join(os.tmpdir(), 'memory-store.json');
    }

    async read(): Promise<MemoryStoreData> {
        return this.store;
    }

    async write(store: MemoryStoreData): Promise<void> {
        this.store = store;
    }

    workspaceKey(workspacePath: string): string {
        return path.resolve(workspacePath || '.').toLowerCase();
    }

    async replaceCodeChunks(workspacePath: string, chunks: MemoryCodeChunk[]): Promise<void> {
        this.replacedChunks = chunks;
        this.store.codeChunks[this.workspaceKey(workspacePath)] = chunks;
    }

    async searchCodeChunks(workspacePath: string, query: string, limit = 20): Promise<MemoryCodeChunk[]> {
        const needle = query.toLowerCase();
        return (this.store.codeChunks[this.workspaceKey(workspacePath)] ?? [])
            .filter(chunk => !needle || `${chunk.title} ${chunk.content}`.toLowerCase().includes(needle))
            .slice(0, limit);
    }

    async getRetrievalCache(queryKey: string, workspacePath: string, sourcesHash: string): Promise<MemoryRetrievalCacheEntry | undefined> {
        const entry = this.retrievalCache.find(candidate =>
            candidate.queryKey === queryKey
            && this.workspaceKey(candidate.workspacePath) === this.workspaceKey(workspacePath)
            && candidate.sourcesHash === sourcesHash
            && candidate.expiresAt > new Date().toISOString()
        );
        if (entry) {
            this.cacheHits++;
        } else {
            this.cacheMisses++;
        }
        return entry;
    }

    async setRetrievalCache(entry: MemoryRetrievalCacheEntry): Promise<void> {
        this.cacheWriteCount++;
        this.retrievalCache = [
            ...this.retrievalCache.filter(candidate => !(candidate.queryKey === entry.queryKey && this.workspaceKey(candidate.workspacePath) === this.workspaceKey(entry.workspacePath))),
            entry
        ];
    }

    async invalidateRetrievalCache(workspacePath: string, relativePaths: readonly string[] = []): Promise<number> {
        this.invalidatedCachePaths.push([...relativePaths]);
        const key = this.workspaceKey(workspacePath);
        const normalizedPaths = relativePaths.map(relativePath => relativePath.replace(/\\/g, '/').replace(/^\/+/, '').toLowerCase()).filter(Boolean);
        const before = this.retrievalCache.length;
        this.retrievalCache = this.retrievalCache.filter(entry => {
            if (this.workspaceKey(entry.workspacePath) !== key) {
                return true;
            }
            if (!normalizedPaths.length) {
                return false;
            }
            return !entry.results.some(result => {
                const haystack = [result.uri, result.evidence, result.title, result.snippet]
                    .filter((value): value is string => typeof value === 'string')
                    .map(value => value.replace(/\\/g, '/').toLowerCase())
                    .join('\n');
                return normalizedPaths.some(relativePath => haystack.includes(relativePath));
            });
        });
        return before - this.retrievalCache.length;
    }

    async retrievalSourcesHash(workspacePath: string): Promise<string> {
        const key = this.workspaceKey(workspacePath);
        return this.simpleHash(JSON.stringify({
            settings: this.versionOf(this.store.settings[key] ? [this.store.settings[key]] : []),
            codeChunks: this.versionOf(this.store.codeChunks[key]),
            memories: this.versionOf(this.store.memories.filter(memory => !memory.workspacePath || this.workspaceKey(memory.workspacePath) === key)),
            knowledgeGraphs: this.versionOf(this.store.knowledgeGraphs.filter(graph => graph.scope === 'global' || this.workspaceKey(graph.workspacePath ?? '') === key)),
            events: this.versionOf(this.store.events.filter(event => this.workspaceKey(event.workspacePath) === key)),
            feedbackRecords: this.versionOf(this.store.feedbackRecords.filter(record => this.workspaceKey(record.workspacePath) === key))
        }));
    }

    async rebuildCodeChunkIndex(): Promise<boolean> {
        return false;
    }

    protected versionOf(values: readonly unknown[] | undefined): { count: number; maxUpdatedAt: string } {
        let maxUpdatedAt = '';
        for (const value of values ?? []) {
            const record = value as Record<string, unknown>;
            const updatedAt = String(record.updatedAt ?? record.indexedAt ?? record.createdAt ?? '');
            if (updatedAt > maxUpdatedAt) {
                maxUpdatedAt = updatedAt;
            }
        }
        return {
            count: values?.length ?? 0,
            maxUpdatedAt
        };
    }

    protected simpleHash(value: string): string {
        let hash = 2166136261;
        for (let index = 0; index < value.length; index++) {
            hash ^= value.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
        }
        return (hash >>> 0).toString(16);
    }
}

class FtsMemoryStoreRepository extends InMemoryStoreRepository implements MemorySearchRepository {

    memorySearchHits: MemorySearchHit[] = [];
    memorySearchCalls: Array<{ workspacePath: string; ftsQuery: string; limit?: number }> = [];

    async searchMemoryItems(workspacePath: string, ftsQuery: string, limit = 20): Promise<MemorySearchHit[]> {
        this.memorySearchCalls.push({ workspacePath, ftsQuery, limit });
        return this.memorySearchHits.slice(0, limit);
    }
}

class LocalVectorMemoryStoreRepository extends InMemoryStoreRepository {

    vectorHits: MemoryVectorSearchHit[] = [];
    vectorSearchCalls: MemoryVectorSearchRequest[] = [];

    async searchMemoryVectors(request: MemoryVectorSearchRequest): Promise<MemoryVectorSearchHit[]> {
        this.vectorSearchCalls.push(request);
        return this.vectorHits.slice(0, request.limit ?? 20);
    }
}

class FailingVectorMemoryStoreRepository extends FtsMemoryStoreRepository {

    vectorSearchCalls: MemoryVectorSearchRequest[] = [];

    async searchMemoryVectors(request: MemoryVectorSearchRequest): Promise<MemoryVectorSearchHit[]> {
        this.vectorSearchCalls.push(request);
        throw new Error('Vector backend unavailable');
    }
}

class RepositoryIdentityMemoryService extends MemoryServiceImpl {

    constructor(protected readonly remoteUrl: string | undefined) {
        super();
    }

    protected override async gitRemoteUrl(): Promise<string | undefined> {
        return this.remoteUrl;
    }
}

class PortablePathPolicyMemoryService extends MemoryServiceImpl {

    writePortableInstallFileForTest(installPath: string, relativePath: string, content: string): Promise<void> {
        return this.writePortableInstallFile(installPath, relativePath, content);
    }
}

class PrivacyDefaultsMemoryService extends MemoryServiceImpl {

    defaultSettingsForTest(workspacePath: string): MemoryWorkspaceSettings {
        return this.defaultSettings(workspacePath);
    }
}

class RetrievalSourcesMemoryService extends MemoryServiceImpl {

    retrievalSourceKindsForTest(): string[] {
        return this.retrievalSources().map(source => source.sourceKind);
    }
}

function attachRepository(service: MemoryServiceImpl, repository: MemoryStoreRepository): void {
    (service as unknown as { repository: MemoryStoreRepository }).repository = repository;
}

function createSqliteRepositoryIfAvailable(storePath: string): MemoryStoreRepository | undefined {
    const SqliteRepository = (repositoryExports as {
        MemorySqliteStoreRepository?: new (...args: unknown[]) => MemoryStoreRepository;
    }).MemorySqliteStoreRepository;
    if (!SqliteRepository) {
        return undefined;
    }
    const constructors: Array<() => MemoryStoreRepository> = [
        () => new SqliteRepository(),
        () => new SqliteRepository(undefined)
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

function readSqliteEventPayloadJson(repository: MemoryStoreRepository, storePath: string): string[] {
    const sqliteModule = (repository as unknown as { getSqliteModule?: () => { DatabaseSync: new (databasePath: string, options?: { readOnly?: boolean }) => {
        prepare(sql: string): { all(): unknown[] };
        close(): void;
    } } | undefined }).getSqliteModule?.();
    if (!sqliteModule) {
        return [];
    }
    const database = new sqliteModule.DatabaseSync(storePath, { readOnly: true });
    try {
        const rows = database.prepare('SELECT payload_json FROM pi_events ORDER BY rowid').all() as Array<{ payload_json: string }>;
        return rows.map(row => row.payload_json);
    } finally {
        database.close();
    }
}

function minimalZipXml(name: string, xml: string): Buffer {
    const nameBuffer = Buffer.from(name, 'utf8');
    const payload = zlib.deflateRawSync(Buffer.from(xml, 'utf8'));
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(8, 8);
    header.writeUInt32LE(payload.length, 18);
    header.writeUInt32LE(payload.length, 22);
    header.writeUInt16LE(nameBuffer.length, 26);
    return Buffer.concat([header, nameBuffer, payload]);
}

function minimalPng(width: number, height: number): Buffer {
    const buffer = Buffer.alloc(33);
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer, 0);
    buffer.writeUInt32BE(13, 8);
    buffer.write('IHDR', 12, 'ascii');
    buffer.writeUInt32BE(width, 16);
    buffer.writeUInt32BE(height, 20);
    buffer[24] = 8;
    buffer[25] = 6;
    return buffer;
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

async function expectPathMissing(targetPath: string): Promise<void> {
    try {
        await fs.stat(targetPath);
        expect.fail(`Expected path to be missing: ${targetPath}`);
    } catch (error) {
        expect((error as NodeJS.ErrnoException).code).to.equal('ENOENT');
    }
}

async function expectPathExists(targetPath: string): Promise<void> {
    try {
        await fs.stat(targetPath);
    } catch (error) {
        expect.fail(`Expected path to exist: ${targetPath}. ${error instanceof Error ? error.message : String(error)}`);
    }
}

function csharpFile(className: string, value: string): string {
    return [
        'namespace Demo;',
        `public class ${className}`,
        '{',
        `    public string Value() { return "${value} with enough content"; }`,
        '}'
    ].join('\n');
}

function codeChunkFixture(workspacePath: string, partial: Partial<MemoryCodeChunk>): MemoryCodeChunk {
    return {
        id: 'chunk',
        workspacePath,
        fileId: 'file',
        relativePath: 'src/cache.ts',
        languageId: 'typescript',
        chunkKind: 'text-block',
        title: 'Cache chunk',
        content: 'Cache chunk content.',
        contentHash: 'hash',
        startLine: 1,
        endLine: 1,
        estimatedTokens: 12,
        indexedAt: '2026-01-01T00:00:00.000Z',
        ...partial
    };
}

function symbolFixture(partial: Partial<MemorySymbol>): MemorySymbol {
    return {
        id: 'symbol',
        fileId: 'file',
        languageId: 'typescript',
        symbolKind: 'class',
        name: 'Service',
        startLine: 1,
        endLine: 1,
        ...partial
    };
}

function relationFixture(partial: Partial<MemoryRelation>): MemoryRelation {
    return {
        id: 'relation',
        sourceKind: 'symbol',
        sourceId: 'source',
        targetKind: 'symbol',
        targetId: 'target',
        relationType: 'calls',
        confidenceLevel: 'extracted',
        confidenceScore: 0.9,
        ...partial
    };
}

function memoryFixture(partial: Partial<MemoryItem>): MemoryItem {
    return {
        id: 'mem',
        workspacePath: '/workspace',
        scope: 'workspace',
        memoryType: 'project_decision',
        title: 'Project memory',
        content: 'Project memory content.',
        status: 'active',
        staleStatus: 'fresh',
        importance: 'medium',
        weight: 0.6,
        lastAccessedAt: '2026-01-01T00:00:00.000Z',
        accessCount: 0,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        acceptedCount: 0,
        rejectedCount: 0,
        ...partial
    };
}

function knowledgeGraphFixture(workspacePath: string): MemoryKnowledgeGraph {
    return {
        id: 'kg_imported',
        workspacePath,
        scope: 'workspace',
        title: 'Imported Knowledge',
        status: 'active',
        concepts: [
            {
                id: 'concept_portable_source',
                graphId: 'kg_imported',
                kind: 'decision',
                title: 'Portable source concept',
                summary: 'Portable source concept summary.',
                status: 'active',
                sourceKind: 'knowledge-graph',
                sourceId: 'source',
                weight: 0.7,
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z'
            },
            {
                id: 'concept_portable_target',
                graphId: 'kg_imported',
                kind: 'concept',
                title: 'Portable target concept',
                summary: 'Portable target concept summary.',
                status: 'active',
                sourceKind: 'knowledge-graph',
                sourceId: 'target',
                weight: 0.6,
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z'
            }
        ],
        links: [{
            id: 'link_portable',
            graphId: 'kg_imported',
            sourceConceptId: 'concept_portable_source',
            targetConceptId: 'concept_portable_target',
            linkKind: 'supports',
            label: 'Portable source supports target',
            confidenceScore: 0.8,
            evidence: 'Portable package evidence marker.',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z'
        }],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z'
    };
}

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
        indexedAt: '2026-01-01T00:00:00.000Z',
        ...partial
    };
}

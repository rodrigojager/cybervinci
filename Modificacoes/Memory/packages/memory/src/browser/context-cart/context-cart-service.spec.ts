// *****************************************************************************
// Copyright (C) 2026.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { enableJSDOM } from '@theia/core/lib/browser/test/jsdom';
import { expect } from 'chai';
import { FrontendApplicationConfigProvider } from '@theia/core/lib/browser/frontend-application-config-provider';
import type { MemoryEventRecordRequest, MemoryService, MemoryWorkspaceSettings, RetrievalResult } from '../../common';
import type { ContextCartItem, MemoryContextCartServiceImpl as MemoryContextCartServiceImplType } from './context-cart-service';

let disableJSDOM = enableJSDOM();

FrontendApplicationConfigProvider.set({});

const { MemoryContextCartServiceImpl } = require('./context-cart-service') as typeof import('./context-cart-service');
disableJSDOM();

describe('MemoryContextCartServiceImpl', () => {

    before(() => {
        disableJSDOM = enableJSDOM();
    });

    after(() => {
        disableJSDOM();
    });

    it('records context.ignored when pending suggestions are cleared without use', async () => {
        const { service, events } = createService();
        setItems(service, [
            contextItem('pending_context', 'pending'),
            contextItem('accepted_context', 'accepted'),
            contextItem('rejected_context', 'rejected')
        ]);

        service.clear();
        await flushPromises();

        const ignored = events.filter(event => event.eventType === 'context.ignored');
        expect(ignored).to.have.length(1);
        expect(JSON.parse(ignored[0].payload ?? '{}')).to.deep.include({
            id: 'pending_context',
            status: 'ignored',
            reason: 'cart-cleared'
        });
    });

    it('records context.ignored for pending suggestions dropped by a refreshed suggestion set', async () => {
        const { service, events, memoryService } = createService();
        memoryService.settings = settingsFixture({
            optIn: {
                contextCart: true
            }
        });
        setItems(service, [
            contextItem('old_pending', 'pending'),
            contextItem('kept_pending', 'pending'),
            contextItem('old_accepted', 'accepted')
        ]);
        memoryService.nextResults = [
            retrievalResult('kept_pending'),
            retrievalResult('new_pending')
        ];

        await service.suggest('Find relevant context');

        const ignored = events.filter(event => event.eventType === 'context.ignored');
        expect(ignored).to.have.length(1);
        expect(JSON.parse(ignored[0].payload ?? '{}')).to.deep.include({
            id: 'old_pending',
            status: 'ignored',
            reason: 'suggestions-refreshed'
        });
    });

    it('includes task memory and agent events in default configurable Context Cart sources', async () => {
        const { service, memoryService } = createService();
        memoryService.settings = settingsFixture({
            optIn: {
                contextCart: true,
                projectMemory: true,
                skills: true,
                events: true
            }
        });
        memoryService.nextResults = [retrievalResult('task_context')];

        await service.suggest('Find task and agent context');

        expect(memoryService.lastSuggestSourceKinds).to.include.members(['task-memory', 'agent-event']);
        expect(memoryService.lastSearchSourceKinds).to.include.members(['task-memory', 'agent-event']);
    });

    it('requires approving an agent event before inserting it into the prompt', () => {
        const { service } = createService();
        service.setPrompt('Continue the implementation');
        setItems(service, [
            {
                ...retrievalResult('agent_event_1', 'agent-event'),
                title: 'Agent completed repository scan',
                snippet: 'Agent reported that the service layer already has Context Cart hooks.',
                evidence: 'Captured agent event',
                status: 'pending'
            }
        ]);

        expect(service.buildContextPack()).to.equal(undefined);

        service.accept('agent_event_1');
        const pack = service.buildContextPack();
        expect(pack).to.not.equal(undefined);
        expect(pack?.approvedItemIds).to.deep.equal(['agent_event_1']);
        expect(pack?.approvedItems).to.deep.include({
            id: 'agent_event_1',
            title: 'Agent completed repository scan',
            sourceKind: 'agent-event',
            uri: 'file:///workspace/src/agent_event_1.ts',
            estimatedTokens: 4,
            score: 0.5
        });
        expect(pack?.content).to.contain('Source: Agent event');
        expect(pack?.content).to.contain('Agent reported that the service layer already has Context Cart hooks.');

        const variable = service.createApprovedContextVariable(pack!);
        expect(variable.arg).to.equal(pack?.content);
    });

    it('builds insertable Context Cart packs with accepted items only', () => {
        const { service } = createService();
        service.setPrompt('Explain the checkout flow');
        setItems(service, [
            {
                ...contextItem('accepted_context', 'accepted'),
                title: 'Accepted checkout context',
                snippet: 'Approved checkout context can be inserted.'
            },
            {
                ...contextItem('pending_context', 'pending'),
                title: 'Pending checkout context',
                snippet: 'Pending checkout context must not be inserted.'
            },
            {
                ...contextItem('rejected_context', 'rejected'),
                title: 'Rejected checkout context',
                snippet: 'Rejected checkout context must not be inserted.'
            }
        ]);

        const pack = service.buildContextPack();

        expect(pack?.approvedItemIds).to.deep.equal(['accepted_context']);
        expect(pack?.approvedItems.map(item => item.id)).to.deep.equal(['accepted_context']);
        expect(pack?.content).to.contain('Accepted checkout context');
        expect(pack?.content).to.contain('Approved checkout context can be inserted.');
        expect(pack?.content).to.not.contain('Pending checkout context');
        expect(pack?.content).to.not.contain('Pending checkout context must not be inserted.');
        expect(pack?.content).to.not.contain('Rejected checkout context');
        expect(pack?.content).to.not.contain('Rejected checkout context must not be inserted.');

        const variable = service.createApprovedContextVariable(pack!);
        expect(variable.arg).to.equal(pack?.content);
    });

    it('does not query sensitive sources before Context Cart consent', async () => {
        const { service, memoryService } = createService();

        await service.suggest('Find sensitive context');

        expect(memoryService.lastSuggestSourceKinds).to.equal(undefined);
        expect(memoryService.lastSearchSourceKinds).to.equal(undefined);
        expect(service.state.items).to.deep.equal([]);
        expect(service.state.error).to.contain('Enable Memory Context Cart');
    });

    it('filters Context Cart sources by explicit source consent', async () => {
        const { service, memoryService } = createService();
        memoryService.settings = settingsFixture({
            optIn: {
                contextCart: true,
                codeGraph: true
            }
        });

        await service.suggest('Find code graph only');

        expect(memoryService.lastSuggestSourceKinds).to.deep.equal(['code', 'code-graph', 'feedback-record']);
        expect(memoryService.lastSearchSourceKinds).to.deep.equal(['code', 'code-graph', 'feedback-record']);
    });

});

function createService(): {
    service: MemoryContextCartServiceImplType;
    events: MemoryEventRecordRequest[];
    memoryService: TestMemoryService;
} {
    const service = new MemoryContextCartServiceImpl();
    const events: MemoryEventRecordRequest[] = [];
    const memoryService = new TestMemoryService(events);
    (service as unknown as { memoryService: MemoryService }).memoryService = memoryService as unknown as MemoryService;
    (service as unknown as { workspaceService: { roots: Promise<Array<{ resource: { toString(): string } }>> } }).workspaceService = {
        roots: Promise.resolve([{ resource: { toString: () => 'file:///workspace' } }])
    };
    return { service, events, memoryService };
}

function setItems(service: MemoryContextCartServiceImplType, items: ContextCartItem[]): void {
    (service as unknown as { mutableState: { items: ContextCartItem[] } }).mutableState.items = items;
}

function contextItem(id: string, status: ContextCartItem['status']): ContextCartItem {
    return {
        ...retrievalResult(id),
        status
    };
}

function retrievalResult(id: string, sourceKind: RetrievalResult['sourceKind'] = 'code'): RetrievalResult {
    return {
        id,
        sourceKind,
        title: `Title ${id}`,
        snippet: `Snippet ${id}`,
        score: 0.5,
        uri: `file:///workspace/src/${id}.ts`,
        evidence: `Evidence ${id}`,
        estimatedTokens: 4
    };
}

async function flushPromises(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 0));
}

class TestMemoryService {

    nextResults: RetrievalResult[] = [];
    lastSuggestSourceKinds: string[] | undefined;
    lastSearchSourceKinds: string[] | undefined;
    settings: MemoryWorkspaceSettings = settingsFixture();

    constructor(protected readonly events: MemoryEventRecordRequest[]) { }

    async suggestContext(request?: { sourceKinds?: string[] }): Promise<{ suggestions: Array<{ id: string; score: number; estimatedTokens: number; reason: string }>; omittedCount: number }> {
        this.lastSuggestSourceKinds = request?.sourceKinds;
        return {
            suggestions: this.nextResults.map(result => ({
                id: result.id,
                score: result.score,
                estimatedTokens: result.estimatedTokens ?? 1,
                reason: result.evidence ?? 'Matched context.'
            })),
            omittedCount: 0
        };
    }

    async search(request?: { sourceKinds?: string[] }): Promise<RetrievalResult[]> {
        this.lastSearchSourceKinds = request?.sourceKinds;
        return this.nextResults;
    }

    async recordEvent(request: MemoryEventRecordRequest): Promise<{ id: string; createdAt: string } & MemoryEventRecordRequest> {
        this.events.push(request);
        return {
            id: `event_${this.events.length}`,
            createdAt: new Date().toISOString(),
            ...request
        };
    }

    async getSettings(): Promise<MemoryWorkspaceSettings> {
        return this.settings;
    }
}

function settingsFixture(partial: Partial<MemoryWorkspaceSettings> = {}): MemoryWorkspaceSettings {
    return {
        ...partial,
        workspacePath: '/workspace',
        enabled: partial.enabled ?? Object.values(partial.optIn ?? {}).some(value => value === true),
        graphEnabled: false,
        memoryEnabled: false,
        skillSuggestionsEnabled: false,
        updatedAt: '2026-01-01T00:00:00.000Z',
        optIn: {
            codeGraph: false,
            documentGraph: false,
            projectMemory: false,
            preferences: false,
            skills: false,
            contextCart: false,
            editorHover: false,
            vectorSearch: false,
            transcriptSearch: false,
            events: false,
            promptSnippets: false,
            pdfDocuments: false,
            officeDocuments: false,
            images: false,
            diagrams: false,
            audioVideo: false,
            remoteImageSemantics: false,
            remoteMediaTranscription: false,
            externalDocCollections: false,
            ...partial.optIn
        }
    };
}

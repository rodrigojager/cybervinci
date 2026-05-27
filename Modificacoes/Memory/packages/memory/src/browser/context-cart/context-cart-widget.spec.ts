// *****************************************************************************
// Copyright (C) 2026.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { enableJSDOM } from '@theia/core/lib/browser/test/jsdom';

let disableJSDOM = enableJSDOM();

import { FrontendApplicationConfigProvider } from '@theia/core/lib/browser/frontend-application-config-provider';
FrontendApplicationConfigProvider.set({});

import { expect } from 'chai';
import { CommandService, Emitter, MessageService } from '@theia/core';
import * as React from '@theia/core/shared/react';
import * as ReactDOM from '@theia/core/shared/react-dom';
import { MemoryContextCartWidget } from './context-cart-widget';
import {
    ContextCartFeedbackInput,
    MemoryContextCartService,
    MemoryContextCartState
} from './context-cart-service';

disableJSDOM();

describe('MemoryContextCartWidget', () => {
    let host: HTMLElement;
    let service: TestContextCartService;

    before(() => {
        disableJSDOM = enableJSDOM();
    });

    after(() => {
        disableJSDOM();
    });

    beforeEach(() => {
        host = document.createElement('div');
        document.body.appendChild(host);
        service = new TestContextCartService();
    });

    afterEach(() => {
        ReactDOM.unmountComponentAtNode(host);
        host.remove();
    });

    it('renders global memory context without a workspace path', () => {
        service.state.items = [{
            id: 'mem_global_preference',
            sourceKind: 'project-memory',
            title: 'Prefer local-first implementation',
            snippet: 'Keep Memory local-first unless the user opts in.',
            score: 0.94,
            evidence: 'Manual IDE memory reviewed by the user.',
            estimatedTokens: 18,
            rankingSignals: {
                scope: 'global',
                staleStatus: 'fresh',
                importance: 'high',
                feedbackMultiplier: 1.2
            },
            status: 'pending'
        }];

        renderWidget(createWidget(service));

        const item = cartItems()[0];
        expect(item.textContent).to.contain('Prefer local-first implementation');
        expect(item.textContent).to.contain('Source: Memory');
        expect(item.textContent).to.contain('Scope: global');
        expect(item.textContent).to.contain('Stale: fresh');
        expect(item.textContent).to.contain('Importance: high');
        expect(item.textContent).to.contain('Feedback: x1.2');
        expect(item.textContent).to.not.contain('/workspace');
        expect(item.textContent).to.not.contain('workspacePath');
    });

    it('renders repository memory as reusable repository-scoped context', () => {
        service.state.items = [{
            id: 'mem_repository_decision',
            sourceKind: 'repository-memory',
            title: 'Repository storage decision',
            snippet: 'This repository stores Memory data in local SQLite.',
            score: 0.88,
            uri: 'repo:https://github.com/acme/project.git#mem_repository_decision',
            evidence: 'Repository memory matched repositoryId github.com/acme/project.',
            estimatedTokens: 21,
            rankingSignals: {
                scope: 'repository',
                staleStatus: 'possibly_stale',
                importance: 'medium',
                acceptanceScore: 0.7
            },
            status: 'pending'
        }];

        renderWidget(createWidget(service));

        const item = cartItems()[0];
        expect(item.textContent).to.contain('Repo Memory - score 0.880');
        expect(item.textContent).to.contain('Source: Repo Memory');
        expect(item.textContent).to.contain('Scope: repository');
        expect(item.textContent).to.contain('Stale: possibly stale');
        expect(item.textContent).to.contain('Importance: medium');
        expect(item.textContent).to.contain('Feedback: acceptance 0.7');
        expect(item.textContent).to.contain('repo:https://github.com/acme/project.git#mem_repository_decision');
    });

    it('renders expired task memory with stale state and ranking evidence', () => {
        service.state.items = [{
            id: 'mem_task_expired',
            sourceKind: 'task-memory',
            title: 'Expired task plan',
            snippet: 'Temporary task context should not be reused after its retention window.',
            score: 0.12,
            evidence: 'Task memory expired at 2026-01-02T00:00:00.000Z and received stalePenalty 0.4.',
            estimatedTokens: 16,
            rankingSignals: {
                scope: 'task',
                staleStatus: 'stale',
                importance: 'low',
                stalePenalty: 0.4
            },
            status: 'pending'
        }];

        renderWidget(createWidget(service));

        const item = cartItems()[0];
        expect(item.textContent).to.contain('Task Memory - score 0.120');
        expect(item.textContent).to.contain('Source: Task Memory');
        expect(item.textContent).to.contain('Scope: task');
        expect(item.textContent).to.contain('Stale: stale');
        expect(item.textContent).to.contain('Importance: low');
        expect(item.textContent).to.contain('Ranking reason');
        expect(item.textContent).to.contain('expired at 2026-01-02T00:00:00.000Z');
        expect(item.textContent).to.contain('stalePenalty 0.4');
    });

    it('renders explained ranking metadata for suggested context', () => {
        service.state.items = [{
            id: 'ranked_context',
            sourceKind: 'code-graph',
            title: 'ContextSuggestionService ranking formula',
            snippet: 'finalScore combines bm25Score, vectorScore, graphScore, memoryWeight, recencyScore, acceptanceScore, scopeBoost, and stalePenalty.',
            score: 0.765,
            evidence: 'bm25 0.8 + vector 0.6 + graph 0.7 + scope repository + feedback x0.8.',
            estimatedTokens: 30,
            rankingSignals: {
                scope: 'repository',
                staleStatus: 'fresh',
                importance: 'critical',
                bm25Score: 0.8,
                vectorScore: 0.6,
                graphScore: 0.7,
                godNodeScore: 0.9,
                communityScore: 0.6,
                surprisingConnectionScore: 0.74,
                riskScore: 0.8,
                graphSignals: ['god-node:ContextSuggestionService:score=0.9', 'risk:context-suggestion-service.ts:score=0.8'],
                memoryWeight: 0.5,
                recencyScore: 0.4,
                acceptanceScore: 0.3,
                scopeBoost: 0.2,
                feedbackMultiplier: 0.8
            },
            status: 'pending'
        }];

        renderWidget(createWidget(service));

        const item = cartItems()[0];
        expect(item.querySelector('.memory-context-cart-meta')?.textContent).to.contain('Source: Graph');
        expect(item.querySelector('.memory-context-cart-meta')?.textContent).to.contain('Scope: repository');
        expect(item.querySelector('.memory-context-cart-meta')?.textContent).to.contain('Stale: fresh');
        expect(item.querySelector('.memory-context-cart-meta')?.textContent).to.contain('Importance: critical');
        expect(item.querySelector('.memory-context-cart-meta')?.textContent).to.contain('Feedback: x0.8');
        expect(item.querySelector('.memory-context-cart-meta')?.textContent).to.contain('Graph: god 0.9, community 0.6, surprise 0.74, risk 0.8');
        expect(item.querySelector('.memory-context-cart-ranking')?.textContent).to.contain('bm25 0.8');
        expect(item.querySelector('.memory-context-cart-ranking')?.textContent).to.contain('scope repository');
    });

    function createWidget(contextCart: MemoryContextCartService): MemoryContextCartWidget {
        const widget = new MemoryContextCartWidget();
        (widget as unknown as { contextCart: MemoryContextCartService }).contextCart = contextCart;
        (widget as unknown as { commandService: CommandService }).commandService = {} as CommandService;
        (widget as unknown as { messageService: MessageService }).messageService = {} as MessageService;
        (widget as unknown as { init: () => void }).init();
        return widget;
    }

    function renderWidget(widget: MemoryContextCartWidget): void {
        const element = (widget as unknown as { render: () => React.ReactNode }).render();
        ReactDOM.render(element as React.ReactElement, host);
    }

    function cartItems(): HTMLElement[] {
        return Array.from(host.querySelectorAll('.memory-context-cart-item'));
    }
});

class TestContextCartService implements MemoryContextCartService {

    protected readonly onDidChangeEmitter = new Emitter<void>();
    readonly onDidChange = this.onDidChangeEmitter.event;

    readonly state: MemoryContextCartState = {
        prompt: '',
        sourceKinds: ['code', 'code-graph', 'project-memory', 'repository-memory', 'task-memory', 'local-docs', 'skill', 'feedback-record'],
        items: [],
        estimatedTokens: 0,
        omittedCount: 0,
        busy: false
    };

    setPrompt(prompt: string): void {
        this.state.prompt = prompt;
        this.onDidChangeEmitter.fire(undefined);
    }

    toggleSourceKind(): void { }
    async suggest(): Promise<void> { }
    accept(): void { }
    reject(_id: string, _feedback?: ContextCartFeedbackInput): void { }
    reset(): void { }
    acceptAll(): void { }
    rejectAll(): void { }
    clear(): void { }
    buildContextPack(): undefined {
        return undefined;
    }
    createApprovedContextVariable(): never {
        throw new Error('No approved context pack in this test.');
    }
}

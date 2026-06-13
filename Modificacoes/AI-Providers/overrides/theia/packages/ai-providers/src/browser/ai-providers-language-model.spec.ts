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
import { LanguageModelStreamResponsePart, UserRequest } from '@theia/ai-core';
import { CancellationToken } from '@theia/core';
import { CodexProviderNotificationMessage, CodexProviderOptions } from '../common';
import { CodexProviderLanguageModel } from './ai-providers-language-model';

class TestCodexProviderLanguageModel extends CodexProviderLanguageModel {
    readonly virtualStages: string[] = [];

    streamParts(message: CodexProviderNotificationMessage, receivedAgentDelta = false): LanguageModelStreamResponsePart[] {
        return Array.from(this.toStreamParts(message, receivedAgentDelta));
    }

    codexOptions(request: Partial<UserRequest> = {}): Partial<CodexProviderOptions> {
        return this.toCodexOptions({
            messages: [],
            sessionId: 'test-session',
            requestId: 'test-request',
            ...request
        });
    }

    prompt(request: Partial<UserRequest> = {}, includeVirtualReasoningInstruction = true): string {
        return this.toPrompt({
            messages: [],
            sessionId: 'test-session',
            requestId: 'test-request',
            ...request
        }, { includeVirtualReasoningInstruction });
    }

    virtualResponse(mode: 'fast' | 'balanced' | 'auto' | 'deep' | 'coding' | 'research' | 'lats', text = 'Solve it.') {
        return this.requestWithVirtualReasoning({
            messages: [{ actor: 'user', type: 'text', text }],
            sessionId: 'test-session',
            requestId: 'test-request',
            settings: { virtualReasoning: { enabled: true, mode } }
        }, { enabled: true, mode });
    }

    protected override async completeInternalPrompt(
        stage: string,
        _prompt: string,
        _request: UserRequest,
        _cancellationToken?: CancellationToken
    ): Promise<string> {
        this.virtualStages.push(stage);
        if (stage === 'classify') {
            return '{"taskType":"coding","complexity":"medium","needsReasoning":true,"needsTools":false,"recommendedMode":"balanced","reason":"test"}';
        }
        if (stage === 'verify') {
            return 'approved';
        }
        return `result:${stage}`;
    }
}

describe('CodexProviderLanguageModel', () => {
    let model: TestCodexProviderLanguageModel;

    beforeEach(() => {
        model = new TestCodexProviderLanguageModel();
    });

    it('streams agent message deltas as content', () => {
        const parts = model.streamParts({
            type: 'notification',
            method: 'item/agentMessage/delta',
            params: { delta: 'hello' }
        });

        expect(parts).deep.equals([{ content: 'hello' }]);
    });

    it('uses completed camel-case agent messages as a fallback when no delta was received', () => {
        const parts = model.streamParts({
            type: 'notification',
            method: 'item/completed',
            params: { item: { type: 'agentMessage', text: 'done' } }
        });

        expect(parts).deep.equals([{ content: 'done' }]);
    });

    it('does not duplicate completed agent messages after deltas were received', () => {
        const parts = model.streamParts({
            type: 'notification',
            method: 'item/completed',
            params: { item: { type: 'agentMessage', text: 'done' } }
        }, true);

        expect(parts).deep.equals([]);
    });

    it('uses task_complete as a final fallback when no delta was received', () => {
        const parts = model.streamParts({
            type: 'notification',
            method: 'task_complete',
            params: { last_agent_message: 'final answer' }
        });

        expect(parts).deep.equals([{ content: 'final answer' }]);
    });

    it('streams reasoning deltas as thoughts', () => {
        const parts = model.streamParts({
            type: 'notification',
            method: 'item/reasoning/textDelta',
            params: { delta: 'thinking' }
        });

        expect(parts).deep.equals([{ thought: 'thinking', signature: 'cybervinci-ai-provider' }]);
    });

    it('does not override configured CyberVinci AI Providers run-mode preferences in language-model requests', () => {
        expect(model.codexOptions()).deep.equals({ collaborationMode: 'default' });
    });

    it('maps explicit Theia reasoning requests without clearing provider defaults', () => {
        expect(model.codexOptions({ reasoning: { level: 'high' } })).deep.equals({
            collaborationMode: 'default',
            reasoningEffort: 'high'
        });
    });

    it('adds Virtual Reasoning instructions only when enabled', () => {
        const prompt = model.prompt({
            settings: { virtualReasoning: { enabled: true, mode: 'balanced' } },
            messages: [{ actor: 'user', type: 'text', text: 'Explain the design.' }]
        });

        expect(prompt).to.contain('Virtual Reasoning is enabled');
        expect(model.prompt({ settings: { virtualReasoning: { enabled: false, mode: 'off' } } })).not.to.contain('Virtual Reasoning is enabled');
    });

    it('runs Fast Virtual Reasoning internally and returns only the final answer', async () => {
        const parts = await collectParts(await model.virtualResponse('fast'));

        expect(model.virtualStages).deep.equals(['draft', 'critique', 'revise']);
        expect(thoughts(parts)).deep.equals(['Drafting response...', 'Reviewing response...', 'Revising response...']);
        expect(contents(parts)).deep.equals(['result:revise']);
    });

    it('runs Balanced Virtual Reasoning internally without an extra final model call', async () => {
        const parts = await collectParts(await model.virtualResponse('balanced'));

        expect(model.virtualStages).deep.equals(['classify', 'plan', 'draft', 'critique', 'revise', 'verify']);
        expect(thoughts(parts)).deep.equals([
            'Analyzing request...',
            'Planning response...',
            'Drafting response...',
            'Reviewing response...',
            'Revising response...',
            'Verifying response...'
        ]);
        expect(contents(parts)).deep.equals(['result:revise']);
    });

    it('resolves Auto Virtual Reasoning to Fast for simple questions', async () => {
        const parts = await collectParts(await model.virtualResponse('auto', 'What is 2 + 2?'));

        expect(model.virtualStages).deep.equals(['draft', 'critique', 'revise']);
        expect(contents(parts)).deep.equals(['result:revise']);
    });

    it('resolves Auto Virtual Reasoning to Coding for coding work', async () => {
        const parts = await collectParts(await model.virtualResponse('auto', 'Debug this TypeScript error and propose a fix.'));

        expect(model.virtualStages).deep.equals(['classify', 'plan', 'draft', 'critique', 'revise', 'verify', 'revise']);
        expect(contents(parts)).deep.equals(['result:revise']);
    });

    it('runs prepared LATS Virtual Reasoning mode as a bounded search profile', async () => {
        const parts = await collectParts(await model.virtualResponse('lats'));

        expect(model.virtualStages).deep.equals(['classify', 'plan', 'draft', 'draft', 'critique', 'draft', 'critique', 'revise', 'verify']);
        expect(contents(parts)).deep.equals(['result:revise']);
    });
});

function asStreamResponse(response: unknown): { stream: AsyncIterable<LanguageModelStreamResponsePart> } {
    return response as { stream: AsyncIterable<LanguageModelStreamResponsePart> };
}

async function collectParts(response: unknown): Promise<LanguageModelStreamResponsePart[]> {
    const parts: LanguageModelStreamResponsePart[] = [];
    for await (const part of asStreamResponse(response).stream) {
        parts.push(part);
    }
    return parts;
}

function contents(parts: LanguageModelStreamResponsePart[]): string[] {
    return parts.flatMap(part => 'content' in part && part.content ? [part.content] : []);
}

function thoughts(parts: LanguageModelStreamResponsePart[]): string[] {
    return parts.flatMap(part => 'thought' in part && part.thought ? [part.thought] : []);
}

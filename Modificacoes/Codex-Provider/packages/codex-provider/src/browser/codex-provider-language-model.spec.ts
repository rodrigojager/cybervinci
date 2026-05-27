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
import { CodexProviderNotificationMessage, CodexProviderOptions } from '../common';
import { CodexProviderLanguageModel } from './codex-provider-language-model';

class TestCodexProviderLanguageModel extends CodexProviderLanguageModel {
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

        expect(parts).deep.equals([{ thought: 'thinking', signature: 'codex-provider' }]);
    });

    it('does not override configured Codex Provider run-mode preferences in language-model requests', () => {
        expect(model.codexOptions()).deep.equals({ collaborationMode: 'default' });
    });

    it('maps explicit Theia reasoning requests without clearing provider defaults', () => {
        expect(model.codexOptions({ reasoning: { level: 'high' } })).deep.equals({
            collaborationMode: 'default',
            reasoningEffort: 'high'
        });
    });
});

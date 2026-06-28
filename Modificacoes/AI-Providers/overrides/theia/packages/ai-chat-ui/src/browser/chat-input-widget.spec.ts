// *****************************************************************************
// Copyright (C) 2026 EclipseSource and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// This Source Code may also be made available under the following Secondary
// Licenses when the conditions for such availability set forth in the Eclipse
// Public License v. 2.0 are satisfied: GNU General Public License, version 2
// with the GNU Classpath Exception which is available at
// https://www.gnu.org/software/classpath/license.html.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { enableJSDOM } from '@theia/core/lib/browser/test/jsdom';

let disableJSDOM = enableJSDOM();

import { FrontendApplicationConfigProvider } from '@theia/core/lib/browser/frontend-application-config-provider';
FrontendApplicationConfigProvider.set({});

import 'reflect-metadata';

import { expect } from 'chai';
import { ChatModel } from '@theia/ai-chat';
import { AIChatInputWidget } from './chat-input-widget';

disableJSDOM();

type TestFlowChatMode = 'chat' | 'saved' | 'dynamic';
type TestVirtualReasoningMode = 'off' | 'auto' | 'fast' | 'balanced' | 'deep' | 'coding' | 'research' | 'lats';

class TestChatInputWidget extends AIChatInputWidget {

    readonly updateCalls: Array<{ agentId: string; modeId?: string; preserveOverrides?: boolean }> = [];

    setReceivingAgent(agentId: string, modeId?: string): void {
        this.receivingAgent = {
            agentId,
            modes: [],
            currentModeId: modeId
        };
    }

    refreshCapabilitiesForTest(): Promise<void> {
        return this.refreshCapabilities();
    }

    setFlowModeSessionForTest(initialSettings: Record<string, unknown> = {}): { model: { id: string; settings: unknown; setSettings(settings: unknown): void } } {
        const model: { id: string; settings: unknown; setSettings(settings: unknown): void } = {
            id: 'chat-model',
            settings: initialSettings,
            setSettings(settings: unknown): void {
                this.settings = settings;
            }
        };
        const session = { model };
        this._chatModel = { id: model.id } as unknown as ChatModel;
        Object.defineProperty(this, 'chatService', {
            value: {
                getSessions: () => [session]
            }
        });
        return session;
    }

    applyFlowModeForTest(mode: TestFlowChatMode): void {
        this.applyFlowChatModeToSession(mode);
    }

    applyVirtualReasoningForTest(mode: TestVirtualReasoningMode): void {
        this.applyVirtualReasoningToSession(mode === 'off' ? undefined : { enabled: true, mode });
    }

    getCurrentFlowModeForTest(): TestFlowChatMode {
        return this.getCurrentFlowChatMode();
    }

    getCurrentVirtualReasoningModeForTest(): TestVirtualReasoningMode {
        return this.getCurrentVirtualReasoningMode();
    }

    parseFlowCommandForTest(prompt: string): unknown {
        return this.parseFlowChatCommand(prompt);
    }

    protected override async updateCapabilitiesForAgent(agentId: string, modeId?: string, preserveOverrides?: boolean): Promise<void> {
        this.updateCalls.push({ agentId, modeId, preserveOverrides });
    }

    override update(): void {
        // no-op
    }
}

describe('AIChatInputWidget', () => {
    before(() => disableJSDOM = enableJSDOM());
    after(() => disableJSDOM());

    describe('refreshCapabilities', () => {
        it('preserves capability selections while reloading prompt-template capabilities', async () => {
            const widget = new TestChatInputWidget();
            widget.setReceivingAgent('test-agent', 'test-mode');

            await widget.refreshCapabilitiesForTest();

            expect(widget.updateCalls).to.deep.equal([{
                agentId: 'test-agent',
                modeId: 'test-mode',
                preserveOverrides: true
            }]);
        });
    });

    describe('Flow routing', () => {
        it('persists Saved Flow mode in session settings', () => {
            const widget = new TestChatInputWidget();
            const session = widget.setFlowModeSessionForTest();

            widget.applyFlowModeForTest('saved');

            expect(session.model.settings).to.deep.equal({
                commonSettings: {
                    flowMode: 'saved'
                },
                flowMode: 'saved'
            });
            expect(widget.getCurrentFlowModeForTest()).to.equal('saved');
        });

        it('clears Flow routing settings when returning to plain chat', () => {
            const widget = new TestChatInputWidget();
            const session = widget.setFlowModeSessionForTest({
                commonSettings: {
                    flowMode: 'saved'
                },
                flowMode: 'saved'
            });

            widget.applyFlowModeForTest('chat');

            expect(session.model.settings).to.deep.equal({
                commonSettings: {}
            });
            expect(widget.getCurrentFlowModeForTest()).to.equal('chat');
        });

        it('routes /flow without an id through the saved workflow picker', () => {
            const widget = new TestChatInputWidget();

            expect(widget.parseFlowCommandForTest('/flow Review this change')).to.deep.equal({
                commandId: 'cybervinci.flow.startWorkflow',
                options: {
                    prompt: 'Review this change',
                    selectWorkflow: true
                }
            });
        });

        it('routes /flow with an explicit id directly to that workflow', () => {
            const widget = new TestChatInputWidget();

            expect(widget.parseFlowCommandForTest('/flow qa_review: Review this change')).to.deep.equal({
                commandId: 'cybervinci.flow.startWorkflow',
                options: {
                    workflowId: 'qa_review',
                    prompt: 'Review this change'
                }
            });
        });
    });

    describe('Virtual Reasoning', () => {
        it('persists Virtual Reasoning as a session option independent of model selection', () => {
            const widget = new TestChatInputWidget();
            const session = widget.setFlowModeSessionForTest();

            widget.applyVirtualReasoningForTest('balanced');

            expect(session.model.settings).to.deep.equal({
                commonSettings: {
                    virtualReasoning: {
                        enabled: true,
                        mode: 'balanced'
                    }
                },
                virtualReasoning: {
                    enabled: true,
                    mode: 'balanced'
                }
            });
            expect(widget.getCurrentVirtualReasoningModeForTest()).to.equal('balanced');
        });

        it('clears only Virtual Reasoning when toggled off', () => {
            const widget = new TestChatInputWidget();
            const session = widget.setFlowModeSessionForTest({
                commonSettings: {
                    flowMode: 'dynamic',
                    virtualReasoning: {
                        enabled: true,
                        mode: 'coding'
                    }
                },
                flowMode: 'dynamic',
                virtualReasoning: {
                    enabled: true,
                    mode: 'coding'
                }
            });

            widget.applyVirtualReasoningForTest('off');

            expect(session.model.settings).to.deep.equal({
                commonSettings: {
                    flowMode: 'dynamic'
                },
                flowMode: 'dynamic'
            });
            expect(widget.getCurrentVirtualReasoningModeForTest()).to.equal('off');
        });
    });
});

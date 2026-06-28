// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { ChatService } from '@theia/ai-chat';
import { ReactWidget } from '@theia/core/lib/browser';
import { CommandService, MessageService, nls } from '@theia/core';
import { Disposable } from '@theia/core/lib/common/disposable';
import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import * as React from '@theia/core/shared/react';
import { CyberVinciChatGoalDialog } from './cybervinci-ai-chat-goal-dialog';
import { CyberVinciChatGoalService, CyberVinciChatGoalState } from './cybervinci-ai-chat-goal-service';
import { formatGoalElapsed, formatGoalRunSummary } from './cybervinci-ai-chat-goal-status';

interface CyberVinciGoalWidgetState {
    readonly activeSessionId?: string;
    readonly activeSessionTitle?: string;
    readonly goal?: CyberVinciChatGoalState;
    readonly loading: boolean;
}

@injectable()
export class CyberVinciChatGoalWidget extends ReactWidget {
    static readonly ID = 'cybervinci-ai-chat-goal-widget';
    static readonly LABEL = nls.localize('theia/cybervinci/ai-chat/goal/viewLabel', 'Goal');
    static readonly ICON_CLASS = 'cybervinci-product-icon cybervinci-product-icon-target';

    @inject(ChatService)
    protected readonly chatService: ChatService;

    @inject(CyberVinciChatGoalService)
    protected readonly goalService: CyberVinciChatGoalService;

    @inject(CommandService)
    protected readonly commandService: CommandService;

    @inject(MessageService)
    protected readonly messageService: MessageService;

    protected state: CyberVinciGoalWidgetState = {
        loading: true
    };

    constructor() {
        super();
        this.id = CyberVinciChatGoalWidget.ID;
        this.title.label = CyberVinciChatGoalWidget.LABEL;
        this.title.caption = CyberVinciChatGoalWidget.LABEL;
        this.title.iconClass = CyberVinciChatGoalWidget.ICON_CLASS;
        this.title.closable = true;
    }

    @postConstruct()
    protected init(): void {
        this.addClass('cybervinci-goal-widget');
        this.toDispose.push(this.chatService.onSessionEvent(() => this.refresh()));
        this.toDispose.push(this.goalService.onDidChangeGoal(event => {
            if (!this.state.activeSessionId || event.chatModelId === this.state.activeSessionId) {
                this.refresh();
            }
        }));
        const timer = window.setInterval(() => {
            if (this.state.goal?.status === 'active') {
                this.update();
            }
        }, 1000);
        this.toDispose.push(Disposable.create(() => window.clearInterval(timer)));
        this.refresh();
    }

    async refresh(): Promise<void> {
        const session = this.chatService.getActiveSession();
        this.state = {
            ...this.state,
            activeSessionId: session?.id,
            activeSessionTitle: session?.title,
            loading: true
        };
        this.update();
        await this.goalService.ensureLoaded(session?.model);
        this.state = {
            activeSessionId: session?.id,
            activeSessionTitle: session?.title,
            goal: this.goalService.getGoal(session?.model),
            loading: false
        };
        this.update();
    }

    protected render(): React.ReactNode {
        const { activeSessionId, activeSessionTitle, goal, loading } = this.state;
        return (
            <div className='cybervinci-goal-root'>
                <div className='cybervinci-goal-toolbar'>
                    <button type='button' className='theia-button' title={nls.localizeByDefault('Refresh')} onClick={() => this.refresh()}>
                        <span className='codicon codicon-refresh' />
                    </button>
                    <button type='button' className='theia-button' title={goal ? nls.localizeByDefault('Edit') : nls.localize('theia/cybervinci/ai-chat/goal/set', 'Set Goal')} onClick={() => this.setOrEditGoal()}>
                        <span className='codicon codicon-edit' />
                    </button>
                    <button type='button' className='theia-button' title={nls.localize('theia/cybervinci/ai-chat/goal/openChat', 'Open AI Chat')} onClick={() => this.openChat()}>
                        <span className='codicon codicon-comment-discussion' />
                    </button>
                </div>
                {loading && <div className='cybervinci-goal-empty'>{nls.localizeByDefault('Loading...')}</div>}
                {!loading && !activeSessionId && <div className='cybervinci-goal-empty'>
                    {nls.localize('theia/cybervinci/ai-chat/goal/noActiveChat', 'No active chat session.')}
                </div>}
                {!loading && activeSessionId && !goal && <div className='cybervinci-goal-empty'>
                    <span className='cybervinci-product-icon cybervinci-product-icon-target' aria-hidden='true' />
                    <div>{nls.localize('theia/cybervinci/ai-chat/goal/noGoalLong', 'No Virtual Goal exists for the active chat.')}</div>
                    <button type='button' className='theia-button' onClick={() => this.setOrEditGoal()}>
                        {nls.localize('theia/cybervinci/ai-chat/goal/set', 'Set Goal')}
                    </button>
                </div>}
                {!loading && activeSessionId && goal && this.renderGoal(goal, activeSessionTitle)}
            </div>
        );
    }

    protected renderGoal(goal: CyberVinciChatGoalState, sessionTitle: string | undefined): React.ReactNode {
        const elapsed = formatGoalElapsed(this.goalService.getElapsedSeconds(goal));
        const budget = goal.tokenBudget
            ? `${goal.tokensUsed}/${goal.tokenBudget}${goal.usageEstimated ? ' estimated' : ''}`
            : `${goal.tokensUsed}${goal.usageEstimated ? ' estimated' : ''}`;
        return (
            <div className={`cybervinci-goal-current status-${goal.status}`}>
                <div className='cybervinci-goal-heading'>
                    <span className='cybervinci-product-icon cybervinci-product-icon-target' aria-hidden='true' />
                    <div>
                        <div className='cybervinci-goal-status'>{formatGoalRunSummary(goal, elapsed)}</div>
                        <div className='cybervinci-goal-meta'>
                            <span>{budget} tokens</span>
                        </div>
                    </div>
                </div>
                <div className='cybervinci-goal-objective'>{goal.objective}</div>
                <div className='cybervinci-goal-details'>
                    <div>
                        <span>{nls.localize('theia/cybervinci/ai-chat/goal/thread', 'Thread')}</span>
                        <code>{sessionTitle || goal.threadId}</code>
                    </div>
                    <div>
                        <span>{nls.localize('theia/cybervinci/ai-chat/goal/id', 'Goal ID')}</span>
                        <code>{goal.goalId}</code>
                    </div>
                </div>
                <div className='cybervinci-goal-actions'>
                    <button type='button' className='theia-button' onClick={() => this.setOrEditGoal()}>
                        <span className='codicon codicon-edit' />
                        {nls.localizeByDefault('Edit')}
                    </button>
                    {goal.status !== 'complete' && goal.status !== 'blocked' && (
                        <button type='button' className='theia-button' onClick={() => this.pauseOrResumeGoal(goal)}>
                            <span className={`codicon ${goal.status === 'active' ? 'codicon-debug-pause' : 'codicon-debug-start'}`} />
                            {goal.status === 'active'
                                ? nls.localizeByDefault('Pause')
                                : nls.localize('theia/cybervinci/ai-chat/goal/resume', 'Resume')}
                        </button>
                    )}
                    {goal.status !== 'complete' && (
                        <button type='button' className='theia-button' onClick={() => this.completeGoal()}>
                            <span className='codicon codicon-check' />
                            {nls.localize('theia/cybervinci/ai-chat/goal/markComplete', 'Mark Complete')}
                        </button>
                    )}
                    <button type='button' className='theia-button secondary' onClick={() => this.clearGoal()}>
                        <span className='codicon codicon-close' />
                        {nls.localizeByDefault('Clear')}
                    </button>
                </div>
            </div>
        );
    }

    protected async setOrEditGoal(): Promise<void> {
        const session = this.chatService.getActiveSession();
        if (!session) {
            this.messageService.warn(nls.localize('theia/cybervinci/ai-chat/goal/noActiveChat', 'No active chat session.'));
            return;
        }
        await this.goalService.ensureLoaded(session.model);
        const goal = this.goalService.getGoal(session.model);
        const value = await new CyberVinciChatGoalDialog({
            title: goal
                ? nls.localize('theia/cybervinci/ai-chat/goal/editDialogTitle', 'Edit Virtual Goal')
                : nls.localize('theia/cybervinci/ai-chat/goal/setDialogTitle', 'Set Virtual Goal'),
            initialValue: goal?.objective,
            acceptLabel: nls.localizeByDefault('Save')
        }).open();
        if (value) {
            await this.goalService.setVirtualGoal(session.model, value, { preserveProgress: !!goal, maxRounds: goal?.maxRounds });
            await this.refresh();
        }
    }

    protected async pauseOrResumeGoal(goal: CyberVinciChatGoalState): Promise<void> {
        const session = this.chatService.getActiveSession();
        if (!session) {
            return;
        }
        await this.goalService.updateStatus(session.model, goal.status === 'active' ? 'paused' : 'active');
        await this.refresh();
    }

    protected async completeGoal(): Promise<void> {
        const session = this.chatService.getActiveSession();
        if (!session) {
            return;
        }
        await this.goalService.updateStatus(session.model, 'complete');
        await this.refresh();
    }

    protected async clearGoal(): Promise<void> {
        const session = this.chatService.getActiveSession();
        if (!session) {
            return;
        }
        await this.goalService.clearGoal(session.model);
        await this.refresh();
    }

    protected async openChat(): Promise<void> {
        await this.commandService.executeCommand('aiChat:toggle');
    }
}

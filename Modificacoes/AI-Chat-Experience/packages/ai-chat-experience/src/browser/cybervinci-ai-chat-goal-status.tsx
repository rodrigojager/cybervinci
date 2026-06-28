// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { ChatModel } from '@theia/ai-chat';
import { nls } from '@theia/core';
import * as React from '@theia/core/shared/react';
import { CyberVinciChatGoalDialog } from './cybervinci-ai-chat-goal-dialog';
import { CyberVinciChatGoalService, CyberVinciChatGoalState, CyberVinciChatGoalStatus } from './cybervinci-ai-chat-goal-service';

export const CyberVinciChatGoalStatusBar: React.FunctionComponent<{
    goalService: CyberVinciChatGoalService;
    chatModel?: ChatModel;
}> = ({ goalService, chatModel }) => {
    const [, setVersion] = React.useState(0);
    const goal = goalService.getGoal(chatModel);

    React.useEffect(() => {
        let disposed = false;
        goalService.ensureLoaded(chatModel).then(() => {
            if (!disposed) {
                setVersion(current => current + 1);
            }
        }).catch(error => console.warn('Could not load CyberVinci chat goal:', error));
        const disposable = goalService.onDidChangeGoal(event => {
            if (!chatModel || event.chatModelId === chatModel.id) {
                setVersion(current => current + 1);
            }
        });
        return () => {
            disposed = true;
            disposable.dispose();
        };
    }, [goalService, chatModel]);

    React.useEffect(() => {
        if (goal?.status !== 'active') {
            return undefined;
        }
        const handle = window.setInterval(() => setVersion(current => current + 1), 1000);
        return () => window.clearInterval(handle);
    }, [goal?.status, goal?.activeStartedAt]);

    if (!chatModel || !goal) {
        return null;
    }

    const editGoal = async (): Promise<void> => {
        const value = await new CyberVinciChatGoalDialog({
            title: nls.localize('theia/cybervinci/ai-chat/goal/editDialogTitle', 'Edit Virtual Goal'),
            initialValue: goal.objective,
            acceptLabel: nls.localizeByDefault('Save')
        }).open();
        if (value) {
            await goalService.setVirtualGoal(chatModel, value, { preserveProgress: true, maxRounds: goal.maxRounds });
        }
    };
    const togglePause = async (): Promise<void> => {
        await goalService.updateStatus(chatModel, goal.status === 'active' ? 'paused' : 'active');
    };
    const clearGoal = async (): Promise<void> => {
        await goalService.clearGoal(chatModel);
    };
    const elapsed = formatGoalElapsed(goalService.getElapsedSeconds(goal));
    const summary = formatGoalRunSummary(goal, elapsed);

    return (
        <div className={`cybervinci-chat-goal-bar status-${goal.status}`} data-cybervinci-chat-goal='true'>
            <span className='cybervinci-chat-goal-bar__icon cybervinci-product-icon cybervinci-product-icon-target' aria-hidden='true' />
            <div className='cybervinci-chat-goal-bar__main' title={goal.objective}>
                <div className='cybervinci-chat-goal-bar__status'>
                    <strong>{summary}</strong>
                </div>
                <div className='cybervinci-chat-goal-bar__objective'>{goal.objective}</div>
            </div>
            <div className='cybervinci-chat-goal-bar__actions'>
                <button type='button' title={nls.localizeByDefault('Edit')} onClick={editGoal}>
                    <span className='codicon codicon-edit' />
                </button>
                {goal.status !== 'complete' && goal.status !== 'blocked' && (
                    <button
                        type='button'
                        title={goal.status === 'active'
                            ? nls.localizeByDefault('Pause')
                            : nls.localize('theia/cybervinci/ai-chat/goal/resume', 'Resume')}
                        onClick={togglePause}
                    >
                        <span className={`codicon ${goal.status === 'active' ? 'codicon-debug-pause' : 'codicon-debug-start'}`} />
                    </button>
                )}
                <button type='button' title={nls.localizeByDefault('Clear')} onClick={clearGoal}>
                    <span className='codicon codicon-close' />
                </button>
            </div>
        </div>
    );
};

export function formatGoalElapsed(totalSeconds: number): string {
    const normalized = Math.max(0, Math.floor(totalSeconds));
    const hours = Math.floor(normalized / 3600);
    const minutes = Math.floor((normalized % 3600) / 60);
    const seconds = normalized % 60;
    if (hours > 0) {
        return `${hours}:${padTimePart(minutes)}:${padTimePart(seconds)}`;
    }
    return `${minutes}:${padTimePart(seconds)}`;
}

function padTimePart(value: number): string {
    return String(value).padStart(2, '0');
}

export function formatGoalRunSummary(goal: Pick<CyberVinciChatGoalState, 'rounds' | 'status'>, elapsed: string): string {
    return `${goalStatusLabel(goal.status)}  ${goal.rounds} ${goal.rounds === 1 ? 'round' : 'rounds'}  ${elapsed}`;
}

export function goalStatusLabel(status: CyberVinciChatGoalStatus): string {
    switch (status) {
        case 'paused':
            return nls.localize('theia/cybervinci/ai-chat/goal/statusPaused', 'Goal paused');
        case 'blocked':
            return nls.localize('theia/cybervinci/ai-chat/goal/statusBlocked', 'Goal blocked');
        case 'usage_limited':
            return nls.localize('theia/cybervinci/ai-chat/goal/statusUsageLimited', 'Goal usage limited');
        case 'budget_limited':
            return nls.localize('theia/cybervinci/ai-chat/goal/statusBudgetLimited', 'Goal limit reached');
        case 'complete':
            return nls.localize('theia/cybervinci/ai-chat/goal/statusComplete', 'Goal complete');
        default:
            return nls.localize('theia/cybervinci/ai-chat/goal/statusActive', 'Pursuing goal');
    }
}

export function goalStatusTone(goal: CyberVinciChatGoalState | undefined): string {
    return goal?.status ?? 'none';
}

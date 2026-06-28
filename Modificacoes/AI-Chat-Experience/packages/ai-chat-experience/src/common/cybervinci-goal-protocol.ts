// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

export type CyberVinciThreadGoalStatus = 'active' | 'paused' | 'blocked' | 'usage_limited' | 'budget_limited' | 'complete';

export interface CyberVinciThreadGoal {
    kind: 'virtual';
    threadId: string;
    goalId: string;
    objective: string;
    status: CyberVinciThreadGoalStatus;
    tokenBudget?: number;
    tokensUsed: number;
    usageEstimated?: boolean;
    createdAt: number;
    updatedAt: number;
    timeUsedSeconds: number;
    rounds: number;
    maxRounds?: number;
}

export interface CyberVinciThreadGoalUpdatedEvent {
    type: 'thread/goal/updated';
    threadId: string;
    eventId: string;
    goal: CyberVinciThreadGoal;
}

export interface CyberVinciThreadGoalClearedEvent {
    type: 'thread/goal/cleared';
    threadId: string;
    eventId: string;
    previousGoal?: CyberVinciThreadGoal;
}

export type CyberVinciThreadGoalEvent = CyberVinciThreadGoalUpdatedEvent | CyberVinciThreadGoalClearedEvent;

export interface CyberVinciThreadGoalQueryParams {
    threadId?: string;
}

export interface CyberVinciThreadGoalSetParams extends CyberVinciThreadGoalQueryParams {
    objective: string;
    status?: CyberVinciThreadGoalStatus;
    tokenBudget?: number;
    maxRounds?: number;
    preserveProgress?: boolean;
}

export interface CyberVinciThreadGoalBudgetParams extends CyberVinciThreadGoalQueryParams {
    tokenBudget?: number;
}

export interface CyberVinciThreadGoalResponse {
    ok: boolean;
    message?: string;
    goal?: CyberVinciThreadGoal;
    previousGoal?: CyberVinciThreadGoal;
    event?: CyberVinciThreadGoalEvent;
}

export function createCyberVinciThreadGoalUpdatedEvent(goal: CyberVinciThreadGoal): CyberVinciThreadGoalUpdatedEvent {
    return {
        type: 'thread/goal/updated',
        threadId: goal.threadId,
        eventId: createCyberVinciThreadGoalEventId(),
        goal
    };
}

export function createCyberVinciThreadGoalClearedEvent(threadId: string, previousGoal?: CyberVinciThreadGoal): CyberVinciThreadGoalClearedEvent {
    return {
        type: 'thread/goal/cleared',
        threadId,
        eventId: createCyberVinciThreadGoalEventId(),
        previousGoal
    };
}

function createCyberVinciThreadGoalEventId(): string {
    const random = Math.random().toString(36).slice(2, 10);
    return `evt_${Date.now().toString(36)}_${random}`;
}

// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { createToolCallError, ToolProvider, ToolRequest } from '@theia/ai-core';
import { ChatToolContext, assertChatContext } from '@theia/ai-chat/lib/common/chat-tool-request-service';
import { PreferenceService } from '@theia/core/lib/common/preferences';
import { inject, injectable, optional } from '@theia/core/shared/inversify';
import { CyberVinciChatGoalService, CyberVinciChatGoalStatus } from './cybervinci-ai-chat-goal-service';
import {
    CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_ENABLED_PREF,
    CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_MODEL_TOOLS_ENABLED_PREF
} from './cybervinci-ai-chat-experience-preferences';

const PROVIDER_NAME = 'cybervinci-virtual-goal';

@injectable()
export class CyberVinciGetGoalToolProvider implements ToolProvider {

    @inject(CyberVinciChatGoalService)
    protected readonly goalService: CyberVinciChatGoalService;

    @inject(PreferenceService) @optional()
    protected readonly preferenceService: PreferenceService | undefined;

    getTool(): ToolRequest<ChatToolContext> {
        return {
            id: 'get_goal',
            name: 'get_goal',
            providerName: PROVIDER_NAME,
            description: 'Read the active CyberVinci thread goal state.',
            parameters: {
                type: 'object',
                properties: {}
            },
            checkAutoAction: () => ({ action: 'allow' }),
            handler: async (_argString, ctx) => {
                assertChatContext(ctx);
                if (!isGoalToolEnabled(this.preferenceService)) {
                    return createToolCallError('CyberVinci Virtual Goal model tools are disabled.');
                }
                await this.goalService.ensureLoaded(ctx.request.session);
                return { goal: this.goalService.getGoal(ctx.request.session) ?? null };
            }
        };
    }
}

@injectable()
export class CyberVinciCreateGoalToolProvider implements ToolProvider {

    @inject(CyberVinciChatGoalService)
    protected readonly goalService: CyberVinciChatGoalService;

    @inject(PreferenceService) @optional()
    protected readonly preferenceService: PreferenceService | undefined;

    getTool(): ToolRequest<ChatToolContext> {
        return {
            id: 'create_goal',
            name: 'create_goal',
            providerName: PROVIDER_NAME,
            description: 'Create a CyberVinci thread goal only when the latest user message explicitly asks for a goal.',
            parameters: {
                type: 'object',
                properties: {
                    objective: {
                        type: 'string',
                        description: 'The user-requested goal objective. Maximum 4000 characters.'
                    },
                    tokenBudget: {
                        type: 'integer',
                        description: 'Optional token budget for the goal.'
                    }
                },
                required: ['objective']
            },
            checkAutoAction: () => ({ action: 'allow' }),
            getArgumentsShortLabel: args => ({ label: readGoalToolString(args, 'objective') ?? 'goal', hasMore: true }),
            handler: async (argString, ctx) => {
                assertChatContext(ctx);
                if (!isGoalToolEnabled(this.preferenceService)) {
                    return createToolCallError('CyberVinci Virtual Goal model tools are disabled.');
                }
                const args = readGoalToolArgs(argString);
                const objective = typeof args.objective === 'string' ? args.objective.trim() : '';
                if (!objective) {
                    return createToolCallError('create_goal requires a non-empty objective.');
                }
                if (!this.goalService.canModelCreateGoal(ctx.request.session, ctx.request.request.text)) {
                    return createToolCallError('create_goal can only be used when the latest user message explicitly asks CyberVinci to create a goal.');
                }
                await this.goalService.ensureLoaded(ctx.request.session);
                const current = this.goalService.getGoal(ctx.request.session);
                if (current && current.status !== 'complete' && current.status !== 'blocked') {
                    return createToolCallError(`A non-terminal goal already exists: ${current.goalId}.`);
                }
                const tokenBudget = typeof args.tokenBudget === 'number' && Number.isFinite(args.tokenBudget) && args.tokenBudget > 0
                    ? Math.floor(args.tokenBudget)
                    : undefined;
                try {
                    const goal = await this.goalService.setVirtualGoal(ctx.request.session, objective, { tokenBudget });
                    return { goal };
                } catch (error) {
                    return createToolCallError(error instanceof Error ? error.message : String(error));
                }
            }
        };
    }
}

@injectable()
export class CyberVinciUpdateGoalToolProvider implements ToolProvider {

    @inject(CyberVinciChatGoalService)
    protected readonly goalService: CyberVinciChatGoalService;

    @inject(PreferenceService) @optional()
    protected readonly preferenceService: PreferenceService | undefined;

    getTool(): ToolRequest<ChatToolContext> {
        return {
            id: 'update_goal',
            name: 'update_goal',
            providerName: PROVIDER_NAME,
            description: 'Mark the active CyberVinci thread goal complete or blocked. Other status changes are user/runtime controlled.',
            parameters: {
                type: 'object',
                properties: {
                    status: {
                        type: 'string',
                        enum: ['complete', 'blocked'],
                        description: 'Only complete or blocked are accepted from the model.'
                    },
                    expectedGoalId: {
                        type: 'string',
                        description: 'Optional current goal id guard to avoid stale updates.'
                    },
                    evidence: {
                        type: 'string',
                        description: 'Optional concise evidence that the goal is complete, such as tests, files, commands, or runtime checks.'
                    }
                },
                required: ['status']
            },
            checkAutoAction: () => ({ action: 'allow' }),
            getArgumentsShortLabel: args => ({ label: readGoalToolString(args, 'status') ?? 'update', hasMore: true }),
            handler: async (argString, ctx) => {
                assertChatContext(ctx);
                if (!isGoalToolEnabled(this.preferenceService)) {
                    return createToolCallError('CyberVinci Virtual Goal model tools are disabled.');
                }
                const args = readGoalToolArgs(argString);
                const status = normalizeModelGoalStatus(args.status);
                if (!status) {
                    return createToolCallError('update_goal only accepts status "complete" or "blocked".');
                }
                await this.goalService.ensureLoaded(ctx.request.session);
                const current = this.goalService.getGoal(ctx.request.session);
                if (!current) {
                    return createToolCallError('No active goal exists for this thread.');
                }
                const expectedGoalId = typeof args.expectedGoalId === 'string' ? args.expectedGoalId.trim() : '';
                if (expectedGoalId && expectedGoalId !== current.goalId) {
                    return createToolCallError(`Stale goal update. Expected ${expectedGoalId}, current goal is ${current.goalId}.`);
                }
                const evidence = typeof args.evidence === 'string' ? args.evidence : undefined;
                const result = await this.goalService.updateStatusFromModel(ctx.request.session, status, expectedGoalId, evidence);
                if (result.rejected) {
                    return createToolCallError(result.message ?? 'CyberVinci Virtual Goal update was rejected.');
                }
                return { goal: result.goal, verifier: result.verifier };
            }
        };
    }
}

function readGoalToolArgs(argString: string): Record<string, unknown> {
    if (!argString.trim()) {
        return {};
    }
    try {
        const parsed = JSON.parse(argString);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
    } catch {
        return {};
    }
}

function readGoalToolString(argString: string, key: string): string | undefined {
    const value = readGoalToolArgs(argString)[key];
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function normalizeModelGoalStatus(value: unknown): Extract<CyberVinciChatGoalStatus, 'complete' | 'blocked'> | undefined {
    return value === 'complete' || value === 'blocked' ? value : undefined;
}

function isGoalToolEnabled(preferenceService: PreferenceService | undefined): boolean {
    const goalEnabled = preferenceService?.get<boolean>(CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_ENABLED_PREF, true) ?? true;
    const toolsEnabled = preferenceService?.get<boolean>(CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_MODEL_TOOLS_ENABLED_PREF, true) ?? true;
    return goalEnabled && toolsEnabled;
}

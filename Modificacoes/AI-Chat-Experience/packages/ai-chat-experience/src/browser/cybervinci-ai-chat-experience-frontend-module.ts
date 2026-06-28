// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { AIChatInputOptionsContribution, AIChatInputWidget } from '@theia/ai-chat-ui/lib/browser/chat-input-widget';
import { ChatService } from '@theia/ai-chat';
import { bindToolProvider } from '@theia/ai-core/lib/common';
import { CommandContribution } from '@theia/core';
import { bindViewContribution, FrontendApplicationContribution, WidgetFactory } from '@theia/core/lib/browser';
import { PreferenceContribution } from '@theia/core/lib/common/preferences';
import { ContainerModule } from '@theia/core/shared/inversify';
import {
    CYBERVINCI_FRONTEND_BRIDGE_SMOKE_PLAYBOOK_ID,
    CyberVinciAiChatExperienceClient,
    CyberVinciAiChatExperienceService,
    CyberVinciFlowPlaybookRunResult,
    CyberVinciThreadGoal,
    CyberVinciThreadGoalBudgetParams,
    CyberVinciThreadGoalQueryParams,
    CyberVinciThreadGoalResponse,
    CyberVinciThreadGoalSetParams,
    createCyberVinciThreadGoalClearedEvent,
    createCyberVinciThreadGoalUpdatedEvent
} from '../common';
import { CyberVinciChatInputOptionsContribution } from './cybervinci-chat-input-options-contribution';
import { CyberVinciAIChatInputWidget } from './cybervinci-ai-chat-input-widget';
import {
    CyberVinciDeclarativeChatAgentContribution,
    CyberVinciDeclarativePromptChatAgentFactory
} from './cybervinci-declarative-chat-agent-contribution';
import { CyberVinciDeclarativePromptChatAgent } from './cybervinci-declarative-chat-agent';
import { CyberVinciPlaybookRuntime } from './cybervinci-playbook-runtime';
import { CyberVinciToolRegistry } from './cybervinci-tool-registry';
import { createCyberVinciAiChatExperienceService } from './cybervinci-ai-chat-experience-frontend-service';
import { cyberVinciAiChatExperiencePreferenceContribution } from './cybervinci-ai-chat-experience-preferences';
import { CyberVinciAiChatWorkdirContribution } from './cybervinci-ai-chat-workdir-contribution';
import { CyberVinciAiChatWorkdirService } from './cybervinci-ai-chat-workdir-service';
import { CyberVinciChatGoalService } from './cybervinci-ai-chat-goal-service';
import { CyberVinciChatGoalStore, CyberVinciStorageChatGoalStore } from './cybervinci-ai-chat-goal-store';
import { CyberVinciChatGoalContribution } from './cybervinci-ai-chat-goal-contribution';
import { CyberVinciChatGoalWidget } from './cybervinci-ai-chat-goal-widget';
import {
    CyberVinciCreateGoalToolProvider,
    CyberVinciGetGoalToolProvider,
    CyberVinciUpdateGoalToolProvider
} from './cybervinci-ai-chat-goal-tools';
import '../../src/browser/style/cybervinci-ai-chat-experience.css';

export default new ContainerModule((bind, _unbind, isBound, rebind) => {
    bind(CyberVinciAiChatExperienceService).toDynamicValue(ctx => {
        const resolveGoalSession = (threadId?: string) => {
            const chatService = ctx.container.get<ChatService>(ChatService);
            if (threadId) {
                return chatService.getSessions().find(session => session.id === threadId || session.model.id === threadId);
            }
            return chatService.getActiveSession();
        };
        const toThreadGoal = (goal: ReturnType<CyberVinciChatGoalService['getGoal']>, goalService: CyberVinciChatGoalService): CyberVinciThreadGoal | undefined => goal && ({
            kind: goal.kind,
            threadId: goal.threadId,
            goalId: goal.goalId,
            objective: goal.objective,
            status: goal.status,
            tokenBudget: goal.tokenBudget,
            tokensUsed: goal.tokensUsed,
            usageEstimated: goal.usageEstimated,
            createdAt: goal.createdAt,
            updatedAt: goal.updatedAt,
            timeUsedSeconds: goalService.getElapsedSeconds(goal),
            rounds: goal.rounds,
            maxRounds: goal.maxRounds
        });
        const noGoalSessionResponse = (threadId: string | undefined): CyberVinciThreadGoalResponse => ({
            ok: false,
            message: threadId
                ? `No chat thread '${threadId}' is available in the connected CyberVinci frontend.`
                : 'No active CyberVinci chat session is available.'
        });
        const readGoalForSession = async (params: CyberVinciThreadGoalQueryParams): Promise<CyberVinciThreadGoalResponse> => {
            const session = resolveGoalSession(params.threadId);
            if (!session) {
                return noGoalSessionResponse(params.threadId);
            }
            const goalService = ctx.container.get<CyberVinciChatGoalService>(CyberVinciChatGoalService);
            await goalService.ensureLoaded(session.model);
            const goal = toThreadGoal(goalService.getGoal(session.model), goalService);
            return {
                ok: true,
                goal,
                message: goal ? undefined : 'No Virtual Goal exists for this chat thread.'
            };
        };
        const client: CyberVinciAiChatExperienceClient = {
            runPlaybookFromFlow: async (request): Promise<CyberVinciFlowPlaybookRunResult> => {
                if (request.playbookId === CYBERVINCI_FRONTEND_BRIDGE_SMOKE_PLAYBOOK_ID) {
                    return {
                        ok: true,
                        message: 'CyberVinci frontend bridge smoke completed.',
                        value: {
                            marker: request.input.marker,
                            playbookId: request.playbookId,
                            prompt: request.prompt
                        },
                        diagnostics: [],
                        issues: [],
                        signals: {
                            'cybervinci.playbook.id': request.playbookId,
                            'cybervinci.playbook.frontend': true,
                            'cybervinci.playbook.frontendSmoke': true
                        }
                    };
                }
                const runtime = ctx.container.get<CyberVinciPlaybookRuntime>(CyberVinciPlaybookRuntime);
                const result = await runtime.runPlaybookById(request.playbookId, request.prompt, request.input);
                return {
                    ok: result.ok,
                    stop: result.stop,
                    message: result.message,
                    value: result.value,
                    diagnostics: result.diagnostics,
                    issues: (result.diagnostics ?? []).map(summary => ({
                        severity: 'blocking',
                        type: 'playbook.frontend',
                        summary,
                        producer: 'cybervinci-ai-chat-experience-client'
                    })),
                    signals: {
                        'cybervinci.playbook.id': request.playbookId,
                        'cybervinci.playbook.frontend': true
                    }
                };
            },
            getThreadGoal: params => readGoalForSession(params),
            getThreadGoalStatus: params => readGoalForSession(params),
            setThreadGoal: async (params: CyberVinciThreadGoalSetParams): Promise<CyberVinciThreadGoalResponse> => {
                const session = resolveGoalSession(params.threadId);
                if (!session) {
                    return noGoalSessionResponse(params.threadId);
                }
                const objective = params.objective.trim();
                if (!objective) {
                    return {
                        ok: false,
                        message: 'Virtual Goal objective cannot be empty.'
                    };
                }
                const goalService = ctx.container.get<CyberVinciChatGoalService>(CyberVinciChatGoalService);
                await goalService.ensureLoaded(session.model);
                const previousGoal = toThreadGoal(goalService.getGoal(session.model), goalService);
                const created = await goalService.setVirtualGoal(session.model, objective, {
                    preserveProgress: params.preserveProgress ?? !!previousGoal,
                    tokenBudget: params.tokenBudget,
                    maxRounds: params.maxRounds
                });
                const finalGoal = params.status && params.status !== 'active'
                    ? await goalService.updateStatus(session.model, params.status)
                    : created;
                return {
                    ok: true,
                    goal: toThreadGoal(finalGoal, goalService),
                    previousGoal,
                    event: finalGoal ? createCyberVinciThreadGoalUpdatedEvent(toThreadGoal(finalGoal, goalService)!) : undefined,
                    message: 'Virtual Goal set.'
                };
            },
            clearThreadGoal: async (params: CyberVinciThreadGoalQueryParams): Promise<CyberVinciThreadGoalResponse> => {
                const session = resolveGoalSession(params.threadId);
                if (!session) {
                    return noGoalSessionResponse(params.threadId);
                }
                const goalService = ctx.container.get<CyberVinciChatGoalService>(CyberVinciChatGoalService);
                await goalService.ensureLoaded(session.model);
                const previousGoal = toThreadGoal(goalService.getGoal(session.model), goalService);
                await goalService.clearGoal(session.model);
                return {
                    ok: true,
                    previousGoal,
                    event: createCyberVinciThreadGoalClearedEvent(session.model.id, previousGoal),
                    message: previousGoal ? 'Virtual Goal cleared.' : 'No Virtual Goal existed for this chat thread.'
                };
            },
            pauseThreadGoal: async (params: CyberVinciThreadGoalQueryParams): Promise<CyberVinciThreadGoalResponse> => {
                const session = resolveGoalSession(params.threadId);
                if (!session) {
                    return noGoalSessionResponse(params.threadId);
                }
                const goalService = ctx.container.get<CyberVinciChatGoalService>(CyberVinciChatGoalService);
                await goalService.ensureLoaded(session.model);
                if (!goalService.getGoal(session.model)) {
                    return {
                        ok: false,
                        message: 'No Virtual Goal exists for this chat thread.'
                    };
                }
                const goal = await goalService.updateStatus(session.model, 'paused');
                return {
                    ok: true,
                    goal: toThreadGoal(goal, goalService),
                    event: goal ? createCyberVinciThreadGoalUpdatedEvent(toThreadGoal(goal, goalService)!) : undefined,
                    message: 'Virtual Goal paused.'
                };
            },
            resumeThreadGoal: async (params: CyberVinciThreadGoalQueryParams): Promise<CyberVinciThreadGoalResponse> => {
                const session = resolveGoalSession(params.threadId);
                if (!session) {
                    return noGoalSessionResponse(params.threadId);
                }
                const goalService = ctx.container.get<CyberVinciChatGoalService>(CyberVinciChatGoalService);
                await goalService.ensureLoaded(session.model);
                if (!goalService.getGoal(session.model)) {
                    return {
                        ok: false,
                        message: 'No Virtual Goal exists for this chat thread.'
                    };
                }
                const goal = await goalService.updateStatus(session.model, 'active');
                return {
                    ok: true,
                    goal: toThreadGoal(goal, goalService),
                    event: goal ? createCyberVinciThreadGoalUpdatedEvent(toThreadGoal(goal, goalService)!) : undefined,
                    message: 'Virtual Goal resumed.'
                };
            },
            setThreadGoalBudget: async (params: CyberVinciThreadGoalBudgetParams): Promise<CyberVinciThreadGoalResponse> => {
                const session = resolveGoalSession(params.threadId);
                if (!session) {
                    return noGoalSessionResponse(params.threadId);
                }
                const goalService = ctx.container.get<CyberVinciChatGoalService>(CyberVinciChatGoalService);
                await goalService.ensureLoaded(session.model);
                if (!goalService.getGoal(session.model)) {
                    return {
                        ok: false,
                        message: 'No Virtual Goal exists for this chat thread.'
                    };
                }
                const goal = await goalService.setTokenBudget(session.model, params.tokenBudget);
                return {
                    ok: true,
                    goal: toThreadGoal(goal, goalService),
                    event: goal ? createCyberVinciThreadGoalUpdatedEvent(toThreadGoal(goal, goalService)!) : undefined,
                    message: 'Virtual Goal budget updated.'
                };
            }
        };
        const service = createCyberVinciAiChatExperienceService(ctx.container, client);
        if (typeof window !== 'undefined') {
            (window as unknown as {
                __cyberVinciAiChatExperienceDiagnostics?: {
                    getRuntimeDiagnostics: CyberVinciAiChatExperienceService['getRuntimeDiagnostics'];
                    runFrontendBridgeSmoke: CyberVinciAiChatExperienceService['runFrontendBridgeSmoke'];
                    runRunInspectorObservabilitySmoke: () => Promise<Record<string, unknown>>;
                    startPlaybookPersistenceReloadSmoke: () => Promise<Record<string, unknown>>;
                    finishPlaybookPersistenceReloadSmoke: (requestId: string) => Promise<Record<string, unknown>>;
                    runCatalogManagerEditingSmoke: () => Promise<Record<string, unknown>>;
                    runCanvasDesignQaRealEditorSmoke: (options?: Record<string, unknown>) => Promise<Record<string, unknown>>;
                };
            }).__cyberVinciAiChatExperienceDiagnostics = {
                getRuntimeDiagnostics: () => service.getRuntimeDiagnostics(),
                runFrontendBridgeSmoke: () => service.runFrontendBridgeSmoke(),
                runRunInspectorObservabilitySmoke: () => ctx.container.get(CyberVinciDeclarativeChatAgentContribution).runRunInspectorObservabilitySmoke(),
                startPlaybookPersistenceReloadSmoke: () => ctx.container.get(CyberVinciDeclarativeChatAgentContribution).startPlaybookPersistenceReloadSmoke(),
                finishPlaybookPersistenceReloadSmoke: requestId => ctx.container.get(CyberVinciDeclarativeChatAgentContribution).finishPlaybookPersistenceReloadSmoke(requestId),
                runCatalogManagerEditingSmoke: () => ctx.container.get(CyberVinciDeclarativeChatAgentContribution).runCatalogManagerEditingSmoke(),
                runCanvasDesignQaRealEditorSmoke: options => ctx.container.get(CyberVinciDeclarativeChatAgentContribution).runCanvasDesignQaRealEditorSmoke(options)
            };
        }
        return service;
    }).inSingletonScope();
    bind(PreferenceContribution).toConstantValue(cyberVinciAiChatExperiencePreferenceContribution);

    bind(CyberVinciChatInputOptionsContribution).toSelf().inSingletonScope();
    bind(AIChatInputOptionsContribution).toService(CyberVinciChatInputOptionsContribution);

    bind(CyberVinciDeclarativePromptChatAgent).toSelf();
    bind(CyberVinciDeclarativePromptChatAgentFactory).toFactory(ctx => () =>
        ctx.container.get<CyberVinciDeclarativePromptChatAgent>(CyberVinciDeclarativePromptChatAgent)
    );
    bind(CyberVinciDeclarativeChatAgentContribution).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(CyberVinciDeclarativeChatAgentContribution);
    bind(CommandContribution).toService(CyberVinciDeclarativeChatAgentContribution);

    bind(CyberVinciToolRegistry).toSelf().inSingletonScope();
    bind(CyberVinciPlaybookRuntime).toSelf().inSingletonScope();
    bind(CyberVinciAiChatWorkdirService).toSelf().inSingletonScope();
    bind(CyberVinciAiChatWorkdirContribution).toSelf().inSingletonScope();
    bind(CyberVinciChatGoalStore).to(CyberVinciStorageChatGoalStore).inSingletonScope();
    bind(CyberVinciChatGoalService).toSelf().inSingletonScope();
    bindViewContribution(bind, CyberVinciChatGoalContribution);
    bind(FrontendApplicationContribution).toService(CyberVinciChatGoalContribution);
    bind(CyberVinciChatGoalWidget).toSelf();
    bind(WidgetFactory).toDynamicValue(ctx => ({
        id: CyberVinciChatGoalWidget.ID,
        createWidget: () => ctx.container.get<CyberVinciChatGoalWidget>(CyberVinciChatGoalWidget)
    })).inSingletonScope();
    bindToolProvider(CyberVinciGetGoalToolProvider, bind);
    bindToolProvider(CyberVinciCreateGoalToolProvider, bind);
    bindToolProvider(CyberVinciUpdateGoalToolProvider, bind);
    bind(FrontendApplicationContribution).toService(CyberVinciAiChatWorkdirContribution);
    bind(CommandContribution).toService(CyberVinciAiChatWorkdirContribution);
    bind(CyberVinciAIChatInputWidget).toSelf();

    if (isBound(AIChatInputWidget)) {
        rebind(AIChatInputWidget).to(CyberVinciAIChatInputWidget);
    } else {
        bind(AIChatInputWidget).to(CyberVinciAIChatInputWidget);
    }
});

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
import { Emitter, Event } from '@theia/core/lib/common/event';
import { PreferenceService } from '@theia/core/lib/common/preferences';
import URI from '@theia/core/lib/common/uri';
import { generateUuid } from '@theia/core/lib/common/uuid';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { inject, injectable, optional } from '@theia/core/shared/inversify';
import { CyberVinciAiChatWorkdirService } from './cybervinci-ai-chat-workdir-service';
import { CyberVinciChatGoalStore } from './cybervinci-ai-chat-goal-store';
import { createCyberVinciThreadGoalClearedEvent, createCyberVinciThreadGoalUpdatedEvent, CyberVinciThreadGoalEvent } from '../common';
import {
    CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_DEFAULT_TOKEN_BUDGET_PREF,
    CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_ENABLED_PREF,
    CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_FALLBACK_TEXT_TOOL_CALLING_ENABLED_PREF,
    CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_MAX_OBJECTIVE_LENGTH_PREF,
    CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_MODEL_TOOLS_ENABLED_PREF,
    CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_PROGRESS_GUARD_ENABLED_PREF,
    CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_PROGRESS_GUARD_MAX_REPEATED_FAILURES_PREF,
    CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_PROGRESS_GUARD_MAX_NO_PROGRESS_TURNS_PREF,
    CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_PROGRESS_GUARD_MAX_REPEATED_RESPONSES_PREF,
    CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_SCOPE_GUARD_FORBIDDEN_PATHS_PREF,
    CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_SCOPE_GUARD_MODE_PREF,
    CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_VERIFIER_MODE_PREF
} from './cybervinci-ai-chat-experience-preferences';

export type CyberVinciChatGoalKind = 'virtual';
export type CyberVinciChatGoalStatus = 'active' | 'paused' | 'blocked' | 'usage_limited' | 'budget_limited' | 'complete';

export interface CyberVinciChatGoalState {
    readonly kind: CyberVinciChatGoalKind;
    readonly threadId: string;
    readonly goalId: string;
    readonly objective: string;
    readonly status: CyberVinciChatGoalStatus;
    readonly tokenBudget?: number;
    readonly tokensUsed: number;
    readonly usageEstimated?: boolean;
    readonly createdAt: number;
    readonly updatedAt: number;
    readonly timeUsedSeconds: number;
    readonly activeStartedAt?: number;
    readonly rounds: number;
    readonly maxRounds?: number;
    readonly progressGuard?: CyberVinciChatGoalProgressGuardState;
}

export interface CyberVinciChatGoalProgressGuardState {
    readonly lastResponseSignature?: string;
    readonly repeatedResponseCount: number;
    readonly noProgressTurns: number;
    readonly lastFailureSignature?: string;
    readonly repeatedFailureCount: number;
}

export interface CyberVinciVirtualGoalSettings {
    readonly enabled: boolean;
    readonly allowModelControl: boolean;
    readonly goalId?: string;
    readonly objective?: string;
    readonly status?: CyberVinciChatGoalStatus;
    readonly rounds?: number;
    readonly maxRounds?: number;
    readonly tokenBudget?: number;
    readonly tokensUsed?: number;
    readonly usageEstimated?: boolean;
    readonly createdAt?: number;
    readonly updatedAt?: number;
    readonly timeUsedSeconds?: number;
}

export interface CyberVinciChatGoalChangeEvent {
    readonly chatModelId: string;
    readonly goal?: CyberVinciChatGoalState;
    readonly previousGoal?: CyberVinciChatGoalState;
    readonly event: CyberVinciThreadGoalEvent;
}

export interface CyberVinciChatGoalUpdateOptions {
    readonly preserveProgress?: boolean;
    readonly maxRounds?: number;
    readonly tokenBudget?: number;
    readonly useDefaultTokenBudget?: boolean;
}

export interface CyberVinciChatGoalObjectiveUpdatedSteering {
    readonly type: 'objective_updated';
    readonly threadId: string;
    readonly previousGoalId: string;
    readonly previousObjective: string;
    readonly goalId: string;
    readonly objective: string;
    readonly updatedAt: number;
}

export type CyberVinciChatGoalRunLogEvent =
    | 'turn_started'
    | 'turn_stopped'
    | 'turn_canceled'
    | 'turn_error'
    | 'continuation_suppressed'
    | 'continuation_failed';

const CYBERVINCI_CHAT_GOAL_DEFAULT_OBJECTIVE_LENGTH = 4000;
const CYBERVINCI_CHAT_GOAL_DEFAULT_TOKEN_BUDGET = 40000;

export interface CyberVinciGoalTokenUsage {
    readonly inputTokens?: number;
    readonly outputTokens?: number;
    readonly cacheReadInputTokens?: number;
    readonly cacheCreationInputTokens?: number;
}

interface CyberVinciFallbackGoalToolCall {
    readonly name: 'create_goal' | 'update_goal';
    readonly arguments: Record<string, unknown>;
}

export interface CyberVinciChatGoalProgressGuardResult {
    readonly status: 'ok' | 'warning' | 'blocked';
    readonly reason?: 'repeated_response' | 'explicit_no_progress' | 'repeated_failure';
    readonly count?: number;
    readonly threshold?: number;
}

export type CyberVinciChatGoalVerifierMode = 'off' | 'warn' | 'enforce';
export type CyberVinciChatGoalScopeGuardMode = 'off' | 'warn' | 'enforce';

export interface CyberVinciChatGoalVerifierResult {
    readonly status: 'accepted' | 'warned' | 'rejected';
    readonly mode: CyberVinciChatGoalVerifierMode;
    readonly reason?: 'missing_evidence';
    readonly evidenceScore: number;
    readonly evidenceSignals: string[];
}

export interface CyberVinciChatGoalModelUpdateResult {
    readonly goal?: CyberVinciChatGoalState;
    readonly verifier?: CyberVinciChatGoalVerifierResult;
    readonly rejected?: boolean;
    readonly message?: string;
}

export interface CyberVinciChatGoalScopeGuardResult {
    readonly status: 'ok' | 'warning' | 'blocked';
    readonly mode: CyberVinciChatGoalScopeGuardMode;
    readonly violations: string[];
}

@injectable()
export class CyberVinciChatGoalService {

    @inject(CyberVinciChatGoalStore)
    protected readonly goalStore: CyberVinciChatGoalStore;

    @inject(FileService) @optional()
    protected readonly fileService: FileService | undefined;

    @inject(CyberVinciAiChatWorkdirService) @optional()
    protected readonly workdirService: CyberVinciAiChatWorkdirService | undefined;

    @inject(PreferenceService) @optional()
    protected readonly preferenceService: PreferenceService | undefined;

    protected readonly onDidChangeGoalEmitter = new Emitter<CyberVinciChatGoalChangeEvent>();
    readonly onDidChangeGoal: Event<CyberVinciChatGoalChangeEvent> = this.onDidChangeGoalEmitter.event;

    protected readonly goals = new Map<string, CyberVinciChatGoalState>();
    protected readonly loaded = new Set<string>();
    protected readonly loading = new Map<string, Promise<void>>();
    protected readonly modelGoalCreationIntentByChatModelId = new Map<string, boolean>();
    protected readonly pendingObjectiveUpdatedSteeringByChatModelId = new Map<string, CyberVinciChatGoalObjectiveUpdatedSteering>();

    async ensureLoaded(chatModel: ChatModel | undefined): Promise<void> {
        if (!chatModel || this.loaded.has(chatModel.id)) {
            return;
        }
        const existing = this.loading.get(chatModel.id);
        if (existing) {
            await existing;
            return;
        }
        const load = this.goalStore.getThreadGoal(chatModel.id)
            .then(value => {
                const goal = this.normalizeGoalState(value);
                if (goal) {
                    this.goals.set(chatModel.id, goal);
                } else {
                    this.goals.delete(chatModel.id);
                }
                this.loaded.add(chatModel.id);
                this.onDidChangeGoalEmitter.fire({
                    chatModelId: chatModel.id,
                    goal,
                    event: goal
                        ? createCyberVinciThreadGoalUpdatedEvent(this.toThreadGoalEventState(goal))
                        : createCyberVinciThreadGoalClearedEvent(chatModel.id)
                });
            })
            .catch(error => {
                console.warn('Could not load CyberVinci chat goal state:', error);
                this.loaded.add(chatModel.id);
            })
            .finally(() => this.loading.delete(chatModel.id));
        this.loading.set(chatModel.id, load);
        await load;
    }

    getGoal(chatModel: ChatModel | undefined): CyberVinciChatGoalState | undefined {
        return chatModel ? this.goals.get(chatModel.id) : undefined;
    }

    recordUserGoalCreationIntent(chatModel: ChatModel | undefined, userText: string | undefined): void {
        if (!chatModel) {
            return;
        }
        this.modelGoalCreationIntentByChatModelId.set(chatModel.id, this.userTextRequestsGoalCreation(userText));
    }

    canModelCreateGoal(chatModel: ChatModel | undefined, userText?: string): boolean {
        if (!chatModel) {
            return false;
        }
        if (!this.isModelControlEnabled()) {
            return false;
        }
        if (this.userTextRequestsGoalCreation(userText)) {
            return true;
        }
        const allowed = this.modelGoalCreationIntentByChatModelId.get(chatModel.id) === true;
        this.modelGoalCreationIntentByChatModelId.delete(chatModel.id);
        return allowed;
    }

    takePendingObjectiveUpdatedSteering(chatModel: ChatModel | undefined): CyberVinciChatGoalObjectiveUpdatedSteering | undefined {
        if (!chatModel) {
            return undefined;
        }
        const steering = this.pendingObjectiveUpdatedSteeringByChatModelId.get(chatModel.id);
        this.pendingObjectiveUpdatedSteeringByChatModelId.delete(chatModel.id);
        return steering;
    }

    isModelControlEnabled(): boolean {
        return this.preferenceService?.get<boolean>(CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_MODEL_TOOLS_ENABLED_PREF, true) ?? true;
    }

    async setVirtualGoal(chatModel: ChatModel, objective: string, options: CyberVinciChatGoalUpdateOptions = {}): Promise<CyberVinciChatGoalState> {
        if (!this.isVirtualGoalEnabled()) {
            throw new Error('CyberVinci Virtual Goal is disabled.');
        }
        await this.ensureLoaded(chatModel);
        const trimmed = objective.trim();
        if (!trimmed) {
            throw new Error('Goal objective cannot be empty.');
        }
        const maxObjectiveLength = this.getMaxObjectiveLength();
        if (trimmed.length > maxObjectiveLength) {
            throw new Error(`Goal objective cannot exceed ${maxObjectiveLength} characters.`);
        }
        const now = Date.now();
        const existing = this.getGoal(chatModel);
        const frozenExisting = existing ? this.freezeElapsed(existing, now) : undefined;
        const objectiveChanged = !!frozenExisting && frozenExisting.objective !== trimmed;
        const shouldPreserveProgress = !!options.preserveProgress && !!frozenExisting && !objectiveChanged;
        const frozenPrevious = shouldPreserveProgress ? frozenExisting : undefined;
        const tokenBudget = this.resolveInitialTokenBudget(options, frozenPrevious ?? frozenExisting);
        const preservedProgressGuard = frozenPrevious?.objective === trimmed ? frozenPrevious.progressGuard : undefined;
        const goal: CyberVinciChatGoalState = {
            kind: 'virtual',
            threadId: chatModel.id,
            goalId: frozenPrevious?.goalId ?? generateUuid(),
            objective: trimmed,
            status: 'active',
            tokenBudget,
            tokensUsed: frozenPrevious?.tokensUsed ?? 0,
            usageEstimated: frozenPrevious?.usageEstimated,
            createdAt: frozenPrevious?.createdAt ?? now,
            updatedAt: now,
            timeUsedSeconds: frozenPrevious?.timeUsedSeconds ?? 0,
            activeStartedAt: now,
            rounds: frozenPrevious?.rounds ?? 0,
            maxRounds: options.maxRounds ?? frozenPrevious?.maxRounds ?? frozenExisting?.maxRounds,
            progressGuard: preservedProgressGuard
        };
        await this.storeGoal(chatModel.id, goal);
        if (objectiveChanged && frozenExisting && frozenExisting.status !== 'complete') {
            this.pendingObjectiveUpdatedSteeringByChatModelId.set(chatModel.id, {
                type: 'objective_updated',
                threadId: chatModel.id,
                previousGoalId: frozenExisting.goalId,
                previousObjective: frozenExisting.objective,
                goalId: goal.goalId,
                objective: goal.objective,
                updatedAt: now
            });
        }
        await this.writeRunLog(goal, frozenExisting ? 'goal_updated' : 'goal_created', {
            previousGoalId: frozenExisting?.goalId,
            objectiveChanged
        });
        return goal;
    }

    async accountGoalUsage(chatModel: ChatModel, usage: CyberVinciGoalTokenUsage | undefined, responseText: string): Promise<CyberVinciChatGoalState | undefined> {
        await this.ensureLoaded(chatModel);
        const current = this.getGoal(chatModel);
        if (!current || current.status === 'complete') {
            return current;
        }
        const calculated = this.calculateTokenDelta(usage);
        const estimated = calculated === undefined;
        const tokenDelta = calculated ?? this.estimateTokenDelta(responseText);
        if (tokenDelta <= 0) {
            return current;
        }
        const now = Date.now();
        const frozen = this.freezeElapsed(current, now);
        const tokensUsed = frozen.tokensUsed + tokenDelta;
        const nextStatus = frozen.tokenBudget !== undefined && tokensUsed >= frozen.tokenBudget && frozen.status === 'active'
            ? 'budget_limited'
            : frozen.status;
        const goal: CyberVinciChatGoalState = {
            ...frozen,
            status: nextStatus,
            tokensUsed,
            usageEstimated: frozen.usageEstimated || estimated,
            updatedAt: now,
            activeStartedAt: nextStatus === 'active' ? frozen.activeStartedAt : undefined
        };
        await this.storeGoal(chatModel.id, goal);
        await this.writeRunLog(goal, nextStatus === 'budget_limited' && current.status !== 'budget_limited' ? 'budget_limited' : 'accounting_updated', {
            tokenDelta,
            estimated,
            usage
        });
        return goal;
    }

    async updateStatus(chatModel: ChatModel, status: CyberVinciChatGoalStatus): Promise<CyberVinciChatGoalState | undefined> {
        await this.ensureLoaded(chatModel);
        const current = this.getGoal(chatModel);
        if (!current) {
            return undefined;
        }
        const now = Date.now();
        const frozen = this.freezeElapsed(current, now);
        const goal: CyberVinciChatGoalState = {
            ...frozen,
            status,
            updatedAt: now,
            activeStartedAt: status === 'active' ? now : undefined
        };
        await this.storeGoal(chatModel.id, goal);
        await this.writeRunLog(goal, this.goalStatusEvent(status), { previousStatus: current.status });
        return goal;
    }

    async updateStatusFromModel(
        chatModel: ChatModel,
        status: Extract<CyberVinciChatGoalStatus, 'complete' | 'blocked'>,
        expectedGoalId?: string,
        evidenceText?: string
    ): Promise<CyberVinciChatGoalModelUpdateResult> {
        return this.applyModelStatusUpdate(chatModel, status, expectedGoalId, evidenceText);
    }

    async incrementRound(chatModel: ChatModel): Promise<CyberVinciChatGoalState | undefined> {
        await this.ensureLoaded(chatModel);
        const current = this.getGoal(chatModel);
        if (!current) {
            return undefined;
        }
        const now = Date.now();
        const goal: CyberVinciChatGoalState = {
            ...current,
            rounds: current.rounds + 1,
            updatedAt: now
        };
        await this.storeGoal(chatModel.id, goal);
        await this.writeRunLog(goal, 'continuation_started', { round: goal.rounds });
        return goal;
    }

    async setTokenBudget(chatModel: ChatModel, tokenBudget: number | undefined): Promise<CyberVinciChatGoalState | undefined> {
        await this.ensureLoaded(chatModel);
        const current = this.getGoal(chatModel);
        if (!current) {
            return undefined;
        }
        const normalizedBudget = typeof tokenBudget === 'number' && Number.isFinite(tokenBudget) && tokenBudget > 0
            ? Math.floor(tokenBudget)
            : undefined;
        const now = Date.now();
        const frozen = this.freezeElapsed(current, now);
        const nextStatus = normalizedBudget !== undefined && frozen.tokensUsed >= normalizedBudget && frozen.status === 'active'
            ? 'budget_limited'
            : frozen.status === 'budget_limited' && (normalizedBudget === undefined || frozen.tokensUsed < normalizedBudget)
                ? 'active'
                : frozen.status;
        const goal: CyberVinciChatGoalState = {
            ...frozen,
            tokenBudget: normalizedBudget,
            status: nextStatus,
            updatedAt: now,
            activeStartedAt: nextStatus === 'active' ? frozen.activeStartedAt ?? now : undefined
        };
        await this.storeGoal(chatModel.id, goal);
        await this.writeRunLog(goal, nextStatus === 'budget_limited' && current.status !== 'budget_limited' ? 'budget_limited' : 'goal_updated', {
            tokenBudget: normalizedBudget
        });
        return goal;
    }

    async clearGoal(chatModel: ChatModel): Promise<void> {
        await this.ensureLoaded(chatModel);
        const previousGoal = this.getGoal(chatModel);
        this.goals.delete(chatModel.id);
        await this.goalStore.clearThreadGoal(chatModel.id);
        this.onDidChangeGoalEmitter.fire({
            chatModelId: chatModel.id,
            previousGoal,
            event: createCyberVinciThreadGoalClearedEvent(chatModel.id, previousGoal ? this.toThreadGoalEventState(previousGoal) : undefined)
        });
        if (previousGoal) {
            await this.writeRunLog(previousGoal, 'goal_cleared');
        }
    }

    async recordRunLogEvent(chatModel: ChatModel, event: CyberVinciChatGoalRunLogEvent, data: Record<string, unknown> = {}): Promise<void> {
        await this.ensureLoaded(chatModel);
        const goal = this.getGoal(chatModel);
        if (!goal) {
            return;
        }
        await this.writeRunLog(goal, event, data);
    }

    async assessProgressGuard(chatModel: ChatModel, responseText: string): Promise<CyberVinciChatGoalProgressGuardResult> {
        await this.ensureLoaded(chatModel);
        const current = this.getGoal(chatModel);
        if (!current || current.status !== 'active' || !this.isProgressGuardEnabled()) {
            return { status: 'ok' };
        }

        const signature = this.toProgressResponseSignature(responseText);
        const repeatedResponseCount = signature && signature === current.progressGuard?.lastResponseSignature
            ? (current.progressGuard?.repeatedResponseCount ?? 1) + 1
            : signature
                ? 1
                : 0;
        const explicitNoProgress = this.isExplicitNoProgressResponse(responseText);
        const noProgressTurns = explicitNoProgress ? (current.progressGuard?.noProgressTurns ?? 0) + 1 : 0;
        const failureSignature = this.toProgressFailureSignature(responseText);
        const repeatedFailureCount = failureSignature && failureSignature === current.progressGuard?.lastFailureSignature
            ? (current.progressGuard?.repeatedFailureCount ?? 1) + 1
            : failureSignature
                ? 1
                : 0;
        const progressGuard: CyberVinciChatGoalProgressGuardState = {
            lastResponseSignature: signature || current.progressGuard?.lastResponseSignature,
            repeatedResponseCount,
            noProgressTurns,
            lastFailureSignature: failureSignature || current.progressGuard?.lastFailureSignature,
            repeatedFailureCount
        };
        const repeatedThreshold = this.getProgressGuardRepeatedResponseThreshold();
        const noProgressThreshold = this.getProgressGuardNoProgressThreshold();
        const repeatedFailureThreshold = this.getProgressGuardRepeatedFailureThreshold();
        const repeatedBlocked = repeatedResponseCount >= repeatedThreshold && repeatedThreshold > 0;
        const noProgressBlocked = noProgressTurns >= noProgressThreshold && noProgressThreshold > 0;
        const repeatedFailureBlocked = repeatedFailureCount >= repeatedFailureThreshold && repeatedFailureThreshold > 0;
        const now = Date.now();
        const frozen = this.freezeElapsed(current, now);
        const blockedReason = repeatedFailureBlocked
            ? 'repeated_failure'
            : repeatedBlocked
                ? 'repeated_response'
                : noProgressBlocked
                    ? 'explicit_no_progress'
                    : undefined;
        const goal: CyberVinciChatGoalState = {
            ...frozen,
            status: blockedReason ? 'blocked' : frozen.status,
            progressGuard,
            updatedAt: now,
            activeStartedAt: blockedReason ? undefined : frozen.activeStartedAt
        };
        await this.storeGoal(chatModel.id, goal);

        if (blockedReason) {
            const threshold = blockedReason === 'repeated_failure'
                ? repeatedFailureThreshold
                : blockedReason === 'repeated_response'
                    ? repeatedThreshold
                    : noProgressThreshold;
            const count = blockedReason === 'repeated_failure'
                ? repeatedFailureCount
                : blockedReason === 'repeated_response'
                    ? repeatedResponseCount
                    : noProgressTurns;
            await this.writeRunLog(goal, 'progress_guard_blocked', {
                reason: blockedReason,
                count,
                threshold,
                failureSignature: blockedReason === 'repeated_failure' ? failureSignature : undefined
            });
            return { status: 'blocked', reason: blockedReason, count, threshold };
        }

        if (repeatedResponseCount > 1 || repeatedFailureCount > 1 || explicitNoProgress) {
            const reason = repeatedFailureCount > 1
                ? 'repeated_failure'
                : repeatedResponseCount > 1
                    ? 'repeated_response'
                    : 'explicit_no_progress';
            await this.writeRunLog(goal, 'progress_guard_warning', {
                reason,
                repeatedResponseCount,
                repeatedFailureCount,
                noProgressTurns,
                repeatedThreshold,
                repeatedFailureThreshold,
                noProgressThreshold,
                failureSignature: reason === 'repeated_failure' ? failureSignature : undefined
            });
            return {
                status: 'warning',
                reason,
                count: reason === 'repeated_failure'
                    ? repeatedFailureCount
                    : reason === 'repeated_response'
                        ? repeatedResponseCount
                        : noProgressTurns,
                threshold: reason === 'repeated_failure'
                    ? repeatedFailureThreshold
                    : reason === 'repeated_response'
                        ? repeatedThreshold
                        : noProgressThreshold
            };
        }
        return { status: 'ok' };
    }

    async assessScopeGuard(chatModel: ChatModel, responseText: string): Promise<CyberVinciChatGoalScopeGuardResult> {
        await this.ensureLoaded(chatModel);
        const current = this.getGoal(chatModel);
        const mode = this.getScopeGuardMode();
        if (!current || current.status !== 'active' || mode === 'off') {
            return { status: 'ok', mode, violations: [] };
        }
        const violations = this.findScopeGuardPathViolations(responseText, this.getScopeGuardForbiddenPaths());
        if (violations.length === 0) {
            return { status: 'ok', mode, violations: [] };
        }
        const now = Date.now();
        const frozen = this.freezeElapsed(current, now);
        if (mode === 'enforce') {
            const goal: CyberVinciChatGoalState = {
                ...frozen,
                status: 'blocked',
                updatedAt: now,
                activeStartedAt: undefined
            };
            await this.storeGoal(chatModel.id, goal);
            await this.writeRunLog(goal, 'scope_guard_blocked', {
                mode,
                violations
            });
            return { status: 'blocked', mode, violations };
        }
        await this.writeRunLog(frozen, 'scope_guard_warning', {
            mode,
            violations
        });
        return { status: 'warning', mode, violations };
    }

    toVirtualGoalSettings(chatModel: ChatModel | undefined): CyberVinciVirtualGoalSettings | undefined {
        if (!chatModel || !this.isVirtualGoalEnabled()) {
            return undefined;
        }
        const allowModelControl = this.isModelControlEnabled();
        const goal = this.getGoal(chatModel);
        if (!goal) {
            return {
                enabled: false,
                allowModelControl
            };
        }
        return {
            enabled: goal.status === 'active',
            allowModelControl,
            goalId: goal.goalId,
            objective: goal.objective,
            status: goal.status,
            rounds: goal.rounds,
            maxRounds: goal.maxRounds,
            tokenBudget: goal.tokenBudget,
            tokensUsed: goal.tokensUsed,
            usageEstimated: goal.usageEstimated,
            createdAt: goal.createdAt,
            updatedAt: goal.updatedAt,
            timeUsedSeconds: this.getElapsedSeconds(goal)
        };
    }

    async recordAssistantResponse(chatModel: ChatModel, text: string): Promise<void> {
        if (!this.isVirtualGoalEnabled()) {
            return;
        }
        const modelControlEnabled = this.isModelControlEnabled();
        const fallbackToolCall = modelControlEnabled && this.isFallbackTextToolCallingEnabled() ? this.extractFallbackGoalToolCall(text) : undefined;
        if (fallbackToolCall) {
            await this.applyFallbackGoalToolCall(chatModel, fallbackToolCall, text);
            return;
        }
        const command = modelControlEnabled ? this.extractControlCommand(text) : undefined;
        if (command) {
            if (command.action === 'set' && command.objective?.trim()) {
                if (!this.canModelCreateGoal(chatModel)) {
                    await this.recordModelGoalCreationRejected(chatModel, command.objective, 'missing_user_goal_request');
                    return;
                }
                await this.createGoalFromModelFallback(chatModel, command.objective);
                return;
            }
            if (command.action === 'complete') {
                await this.applyModelStatusUpdate(chatModel, 'complete', undefined, text);
                return;
            }
        }

        const statusUpdate = modelControlEnabled ? this.extractControlStatusUpdate(text) : undefined;
        if (statusUpdate?.status === 'complete' || statusUpdate?.status === 'blocked') {
            await this.applyModelStatusUpdate(chatModel, statusUpdate.status, statusUpdate.expectedGoalId, text);
        }
    }

    isVirtualGoalEnabled(): boolean {
        return this.preferenceService?.get<boolean>(CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_ENABLED_PREF, true) ?? true;
    }

    protected isFallbackTextToolCallingEnabled(): boolean {
        return this.preferenceService?.get<boolean>(CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_FALLBACK_TEXT_TOOL_CALLING_ENABLED_PREF, true) ?? true;
    }

    protected isProgressGuardEnabled(): boolean {
        return this.preferenceService?.get<boolean>(CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_PROGRESS_GUARD_ENABLED_PREF, true) ?? true;
    }

    protected getProgressGuardRepeatedResponseThreshold(): number {
        return this.normalizeBoundedInteger(
            this.preferenceService?.get<number>(CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_PROGRESS_GUARD_MAX_REPEATED_RESPONSES_PREF, 3),
            3,
            2,
            20
        );
    }

    protected getProgressGuardNoProgressThreshold(): number {
        return this.normalizeBoundedInteger(
            this.preferenceService?.get<number>(CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_PROGRESS_GUARD_MAX_NO_PROGRESS_TURNS_PREF, 3),
            3,
            1,
            20
        );
    }

    protected getProgressGuardRepeatedFailureThreshold(): number {
        return this.normalizeBoundedInteger(
            this.preferenceService?.get<number>(CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_PROGRESS_GUARD_MAX_REPEATED_FAILURES_PREF, 3),
            3,
            2,
            20
        );
    }

    protected getVerifierMode(): CyberVinciChatGoalVerifierMode {
        const configured = this.preferenceService?.get<string>(CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_VERIFIER_MODE_PREF, 'off') ?? 'off';
        return configured === 'warn' || configured === 'enforce' ? configured : 'off';
    }

    protected getScopeGuardMode(): CyberVinciChatGoalScopeGuardMode {
        const configured = this.preferenceService?.get<string>(CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_SCOPE_GUARD_MODE_PREF, 'off') ?? 'off';
        return configured === 'warn' || configured === 'enforce' ? configured : 'off';
    }

    protected getScopeGuardForbiddenPaths(): string[] {
        const configured = this.preferenceService?.get<string[]>(
            CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_SCOPE_GUARD_FORBIDDEN_PATHS_PREF,
            ['.env', '.env.*', 'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock']
        ) ?? [];
        return configured
            .map(item => item.trim())
            .filter(Boolean)
            .slice(0, 200);
    }

    protected findScopeGuardPathViolations(responseText: string, forbiddenPaths: string[]): string[] {
        if (!responseText || forbiddenPaths.length === 0) {
            return [];
        }
        const normalizedText = this.normalizeScopeGuardText(responseText);
        const violations = new Set<string>();
        for (const originalPattern of forbiddenPaths) {
            const pattern = this.normalizeScopeGuardPath(originalPattern);
            if (!pattern) {
                continue;
            }
            if (pattern.includes('*')) {
                const regex = this.scopeGuardWildcardToRegExp(pattern);
                if (regex.test(normalizedText)) {
                    violations.add(originalPattern);
                }
                continue;
            }
            if (this.scopeGuardTextContainsPath(normalizedText, pattern)) {
                violations.add(originalPattern);
            }
        }
        return Array.from(violations);
    }

    protected normalizeScopeGuardText(value: string): string {
        return value
            .replace(/<!--\s*cybervinci:goal\b[\s\S]*?-->/gi, ' ')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\\/g, '/')
            .replace(/[`'"]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    protected normalizeScopeGuardPath(value: string): string {
        return value
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\\/g, '/')
            .replace(/^\.?\//, '')
            .trim();
    }

    protected scopeGuardTextContainsPath(normalizedText: string, normalizedPath: string): boolean {
        if (normalizedText.includes(normalizedPath)) {
            return true;
        }
        const basename = normalizedPath.split('/').at(-1);
        return !!basename && basename !== normalizedPath && normalizedText.includes(basename);
    }

    protected scopeGuardWildcardToRegExp(pattern: string): RegExp {
        const escaped = pattern
            .split('*')
            .map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
            .join('[^\\s`\'"]*');
        return new RegExp(`(?:^|[\\s/])${escaped}(?:$|[\\s,.;:)/])`, 'i');
    }

    protected verifyModelCompletion(evidenceText: string): CyberVinciChatGoalVerifierResult {
        const mode = this.getVerifierMode();
        if (mode === 'off') {
            return {
                status: 'accepted',
                mode,
                evidenceScore: 0,
                evidenceSignals: []
            };
        }
        const evidenceSignals = this.collectCompletionEvidenceSignals(evidenceText);
        const evidenceScore = evidenceSignals.length;
        if (evidenceScore > 0) {
            return {
                status: 'accepted',
                mode,
                evidenceScore,
                evidenceSignals
            };
        }
        return {
            status: mode === 'enforce' ? 'rejected' : 'warned',
            mode,
            reason: 'missing_evidence',
            evidenceScore,
            evidenceSignals
        };
    }

    protected getMaxObjectiveLength(): number {
        const configured = this.preferenceService?.get<number>(
            CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_MAX_OBJECTIVE_LENGTH_PREF,
            CYBERVINCI_CHAT_GOAL_DEFAULT_OBJECTIVE_LENGTH
        ) ?? CYBERVINCI_CHAT_GOAL_DEFAULT_OBJECTIVE_LENGTH;
        if (!Number.isFinite(configured)) {
            return CYBERVINCI_CHAT_GOAL_DEFAULT_OBJECTIVE_LENGTH;
        }
        return Math.min(20000, Math.max(1, Math.floor(configured)));
    }

    protected getDefaultTokenBudget(): number | undefined {
        const configured = this.preferenceService?.get<number>(
            CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_DEFAULT_TOKEN_BUDGET_PREF,
            CYBERVINCI_CHAT_GOAL_DEFAULT_TOKEN_BUDGET
        ) ?? CYBERVINCI_CHAT_GOAL_DEFAULT_TOKEN_BUDGET;
        if (!Number.isFinite(configured) || configured <= 0) {
            return undefined;
        }
        return Math.floor(configured);
    }

    protected resolveInitialTokenBudget(
        options: CyberVinciChatGoalUpdateOptions,
        previous: CyberVinciChatGoalState | undefined
    ): number | undefined {
        if (options.tokenBudget !== undefined) {
            return this.normalizeTokenBudget(options.tokenBudget);
        }
        if (previous?.tokenBudget !== undefined) {
            return previous.tokenBudget;
        }
        return options.useDefaultTokenBudget === false ? undefined : this.getDefaultTokenBudget();
    }

    protected normalizeTokenBudget(value: number | undefined): number | undefined {
        return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : undefined;
    }

    protected async createGoalFromModelFallback(chatModel: ChatModel, objective: string): Promise<void> {
        await this.ensureLoaded(chatModel);
        const current = this.getGoal(chatModel);
        if (current && current.status !== 'complete' && current.status !== 'blocked') {
            return;
        }
        await this.setVirtualGoal(chatModel, objective, { preserveProgress: false });
    }

    protected async recordModelGoalCreationRejected(chatModel: ChatModel, objective: string, reason: string): Promise<void> {
        const now = Date.now();
        const current = this.getGoal(chatModel);
        await this.writeRunLog(current ?? {
            kind: 'virtual',
            threadId: chatModel.id,
            goalId: 'none',
            objective,
            status: 'blocked',
            tokensUsed: 0,
            createdAt: now,
            updatedAt: now,
            timeUsedSeconds: 0,
            rounds: 0
        }, 'model_goal_creation_rejected', {
            reason
        });
    }

    protected userTextRequestsGoalCreation(userText: string | undefined): boolean {
        if (!userText) {
            return false;
        }
        const normalized = userText
            .toLowerCase()
            .normalize('NFD')
            .replace(/\p{Diacritic}/gu, '');
        if (/^\s*\/goal(?:\s+|$)/.test(normalized)) {
            return true;
        }
        const goalTerm = String.raw`(?:goal|objetivo|meta)`;
        const createTerm = String.raw`(?:create|crie|criar|cria|define|defina|definir|set|start|inicie|iniciar|comece|comecar|estabeleca|estabelecer)`;
        return new RegExp(`${createTerm}[\\s\\S]{0,120}\\b${goalTerm}\\b`, 'i').test(normalized)
            || new RegExp(`\\b${goalTerm}\\b[\\s\\S]{0,120}${createTerm}`, 'i').test(normalized);
    }

    protected async applyFallbackGoalToolCall(chatModel: ChatModel, call: CyberVinciFallbackGoalToolCall, sourceText?: string): Promise<void> {
        await this.ensureLoaded(chatModel);
        if (call.name === 'create_goal') {
            const objective = typeof call.arguments.objective === 'string' ? call.arguments.objective.trim() : '';
            if (objective) {
                if (!this.canModelCreateGoal(chatModel)) {
                    await this.recordModelGoalCreationRejected(chatModel, objective, 'missing_user_goal_request');
                    return;
                }
                const tokenBudget = this.normalizeTokenBudget(
                    typeof call.arguments.tokenBudget === 'number' ? call.arguments.tokenBudget : undefined
                );
                const current = this.getGoal(chatModel);
                if (!current || current.status === 'complete' || current.status === 'blocked') {
                    await this.setVirtualGoal(chatModel, objective, { tokenBudget });
                }
            }
            return;
        }
        if (call.name !== 'update_goal') {
            return;
        }
        const status = call.arguments.status;
        if (status !== 'complete' && status !== 'blocked') {
            return;
        }
        const expectedGoalId = typeof call.arguments.expectedGoalId === 'string' ? call.arguments.expectedGoalId.trim() : '';
        const evidenceText = typeof call.arguments.evidence === 'string' && call.arguments.evidence.trim()
            ? call.arguments.evidence
            : sourceText;
        await this.applyModelStatusUpdate(chatModel, status, expectedGoalId, evidenceText);
    }

    protected async applyModelStatusUpdate(
        chatModel: ChatModel,
        status: Extract<CyberVinciChatGoalStatus, 'complete' | 'blocked'>,
        expectedGoalId?: string,
        evidenceText?: string
    ): Promise<CyberVinciChatGoalModelUpdateResult> {
        await this.ensureLoaded(chatModel);
        const current = this.getGoal(chatModel);
        if (!current) {
            return { message: 'No active goal exists for this thread.' };
        }
        const normalizedExpectedGoalId = expectedGoalId?.trim() ?? '';
        if (current.status === 'active' && !normalizedExpectedGoalId) {
            await this.writeRunLog(current, 'missing_expected_goal_id_rejected', {
                requestedStatus: status
            });
            return {
                goal: current,
                rejected: true,
                message: `Goal update requires expectedGoalId ${current.goalId}.`
            };
        }
        if (normalizedExpectedGoalId && normalizedExpectedGoalId !== current.goalId) {
            await this.writeRunLog(current, 'stale_model_goal_update_rejected', {
                requestedStatus: status,
                expectedGoalId: normalizedExpectedGoalId
            });
            return {
                goal: current,
                rejected: true,
                message: `Stale goal update. Expected ${normalizedExpectedGoalId}, current goal is ${current.goalId}.`
            };
        }
        const verifier = status === 'complete' ? this.verifyModelCompletion(evidenceText ?? '') : undefined;
        if (verifier?.status === 'rejected') {
            await this.writeRunLog(current, 'verifier_rejected_completion', {
                reason: verifier.reason,
                evidenceScore: verifier.evidenceScore,
                evidenceSignals: verifier.evidenceSignals
            });
            return {
                goal: current,
                verifier,
                rejected: true,
                message: 'Virtual Goal completion was rejected by the deterministic verifier because no completion evidence was found.'
            };
        }
        if (verifier?.status === 'warned') {
            await this.writeRunLog(current, 'verifier_warned_completion', {
                reason: verifier.reason,
                evidenceScore: verifier.evidenceScore,
                evidenceSignals: verifier.evidenceSignals
            });
        }
        const goal = await this.updateStatus(chatModel, status);
        return { goal, verifier };
    }

    getElapsedSeconds(goal: CyberVinciChatGoalState, now = Date.now()): number {
        if (goal.status !== 'active' || goal.activeStartedAt === undefined) {
            return goal.timeUsedSeconds;
        }
        return goal.timeUsedSeconds + Math.max(0, Math.floor((now - goal.activeStartedAt) / 1000));
    }

    protected async storeGoal(chatModelId: string, goal: CyberVinciChatGoalState): Promise<void> {
        this.goals.set(chatModelId, goal);
        this.loaded.add(chatModelId);
        await this.goalStore.setThreadGoal(chatModelId, goal);
        this.onDidChangeGoalEmitter.fire({
            chatModelId,
            goal,
            event: createCyberVinciThreadGoalUpdatedEvent(this.toThreadGoalEventState(goal))
        });
    }

    protected toThreadGoalEventState(goal: CyberVinciChatGoalState) {
        return {
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
            timeUsedSeconds: this.getElapsedSeconds(goal),
            rounds: goal.rounds,
            maxRounds: goal.maxRounds
        };
    }

    protected freezeElapsed(goal: CyberVinciChatGoalState, now: number): CyberVinciChatGoalState {
        return {
            ...goal,
            timeUsedSeconds: this.getElapsedSeconds(goal, now),
            activeStartedAt: goal.status === 'active' ? now : goal.activeStartedAt
        };
    }

    protected normalizeGoalState(value: unknown): CyberVinciChatGoalState | undefined {
        if (!value || typeof value !== 'object') {
            return undefined;
        }
        const candidate = value as Partial<CyberVinciChatGoalState>;
        const objective = typeof candidate.objective === 'string' ? candidate.objective.trim() : '';
        if (!objective) {
            return undefined;
        }
        const status = this.normalizeGoalStatus(candidate.status);
        const threadId = typeof candidate.threadId === 'string' && candidate.threadId ? candidate.threadId : '';
        return {
            kind: 'virtual',
            threadId,
            goalId: typeof candidate.goalId === 'string' && candidate.goalId ? candidate.goalId : generateUuid(),
            objective,
            status,
            tokenBudget: typeof candidate.tokenBudget === 'number' && Number.isFinite(candidate.tokenBudget) && candidate.tokenBudget > 0
                ? Math.floor(candidate.tokenBudget)
                : undefined,
            tokensUsed: Math.max(0, Math.floor(this.normalizeNumber(candidate.tokensUsed))),
            usageEstimated: candidate.usageEstimated === true,
            createdAt: this.normalizeTimestamp(candidate.createdAt),
            updatedAt: this.normalizeTimestamp(candidate.updatedAt),
            timeUsedSeconds: this.normalizeNumber(candidate.timeUsedSeconds),
            activeStartedAt: typeof candidate.activeStartedAt === 'number' && Number.isFinite(candidate.activeStartedAt)
                ? candidate.activeStartedAt
                : status === 'active'
                    ? Date.now()
                    : undefined,
            rounds: Math.max(0, Math.floor(this.normalizeNumber(candidate.rounds))),
            maxRounds: typeof candidate.maxRounds === 'number' && Number.isFinite(candidate.maxRounds) && candidate.maxRounds > 0
                ? Math.floor(candidate.maxRounds)
                : undefined,
            progressGuard: this.normalizeProgressGuardState(candidate.progressGuard)
        };
    }

    protected normalizeProgressGuardState(value: unknown): CyberVinciChatGoalProgressGuardState | undefined {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return undefined;
        }
        const candidate = value as Partial<CyberVinciChatGoalProgressGuardState>;
        const lastResponseSignature = typeof candidate.lastResponseSignature === 'string' && candidate.lastResponseSignature
            ? candidate.lastResponseSignature
            : undefined;
        const repeatedResponseCount = Math.max(0, Math.floor(this.normalizeNumber(candidate.repeatedResponseCount)));
        const noProgressTurns = Math.max(0, Math.floor(this.normalizeNumber(candidate.noProgressTurns)));
        const lastFailureSignature = typeof candidate.lastFailureSignature === 'string' && candidate.lastFailureSignature
            ? candidate.lastFailureSignature
            : undefined;
        const repeatedFailureCount = Math.max(0, Math.floor(this.normalizeNumber(candidate.repeatedFailureCount)));
        if (!lastResponseSignature && repeatedResponseCount === 0 && noProgressTurns === 0 && !lastFailureSignature && repeatedFailureCount === 0) {
            return undefined;
        }
        return {
            lastResponseSignature,
            repeatedResponseCount,
            noProgressTurns,
            lastFailureSignature,
            repeatedFailureCount
        };
    }

    protected normalizeGoalStatus(value: unknown): CyberVinciChatGoalStatus {
        if (value === 'budgetLimited') {
            return 'budget_limited';
        }
        if (value === 'usageLimited') {
            return 'usage_limited';
        }
        return value === 'paused' || value === 'blocked' || value === 'usage_limited' || value === 'budget_limited' || value === 'complete' ? value : 'active';
    }

    protected normalizeTimestamp(value: unknown): number {
        return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : Date.now();
    }

    protected normalizeNumber(value: unknown): number {
        return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
    }

    protected normalizeBoundedInteger(value: unknown, fallback: number, minimum: number, maximum: number): number {
        return typeof value === 'number' && Number.isFinite(value)
            ? Math.min(maximum, Math.max(minimum, Math.floor(value)))
            : fallback;
    }

    protected collectCompletionEvidenceSignals(text: string): string[] {
        const normalized = text
            .replace(/<!--\s*cybervinci:goal\b[\s\S]*?-->/gi, '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
        const signals = new Set<string>();
        const patterns: Array<[string, RegExp]> = [
            ['test-passed', /\b(tests?|specs?|suite)\b.{0,80}\b(pass(ed|ing)?|green|ok|success|succeeded)\b/],
            ['compile-passed', /\b(compile|compiled|build|built|typecheck|tsc|lint)\b.{0,80}\b(pass(ed|ing)?|green|ok|success|succeeded|clean)\b/],
            ['runtime-verified', /\b(verified|validated|checked|confirmed|responded|health check|status\s*200|http\s*200)\b/],
            ['file-evidence', /\b[a-z0-9_.-]+\.(ts|tsx|js|jsx|json|md|css|scss|html|py|rs|go|cs|java|yml|yaml)\b/],
            ['diff-evidence', /\b(diff|patch|changed files?|git status|run-log|log)\b/],
            ['tool-evidence', /\b(command|terminal|script|npm run|pnpm|yarn|node --check|pytest|vitest|jest|mocha)\b/]
        ];
        for (const [name, pattern] of patterns) {
            if (pattern.test(normalized)) {
                signals.add(name);
            }
        }
        return Array.from(signals);
    }

    protected toProgressResponseSignature(text: string): string | undefined {
        const withoutGoalControls = text
            .replace(/<!--\s*cybervinci:goal\b[\s\S]*?-->/gi, '')
            .replace(/```(?:json|tool_call|cybervinci-goal)?\s*[\s\S]*?```/gi, '')
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();
        if (withoutGoalControls.length < 24) {
            return undefined;
        }
        return withoutGoalControls.slice(0, 800);
    }

    protected isExplicitNoProgressResponse(text: string): boolean {
        const normalized = text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
        return /\b(no progress|without progress|stuck|cannot proceed|can't proceed|blocked|sem progresso|nao consegui avancar|nao houve progresso|nao consigo avancar|estou bloqueado|estou travado)\b/.test(normalized);
    }

    protected toProgressFailureSignature(text: string): string | undefined {
        const normalized = text
            .replace(/<!--\s*cybervinci:goal\b[\s\S]*?-->/gi, '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\battempt\s+\d+\b/g, 'attempt')
            .replace(/\b\d+(?:\.\d+)?\s*(?:ms|s|sec|seconds|minutes|m)\b/g, '<duration>')
            .replace(/[a-z]:[\\/][^\s'"`]+/gi, '<path>')
            .replace(/(?:\.\.?[\\/])?[a-z0-9_.-]+(?:[\\/][a-z0-9_.-]+)+/gi, '<path>')
            .replace(/\bline\s+\d+\b/g, 'line <n>')
            .replace(/:\d+:\d+\b/g, ':<n>:<n>')
            .replace(/\s+/g, ' ')
            .trim();
        if (!/\b(command failed|failed|failing|failure|error|erro|exit code|exit status|exited with code|npm err|stderr|test failed|tests failed|compilation failed|build failed)\b/.test(normalized)) {
            return undefined;
        }
        const command = /\b(?:npm run|pnpm|yarn|node|python|pytest|vitest|jest|mocha|tsc|eslint|dotnet|go test|cargo test)\s+[a-z0-9_./:@=-]+(?:\s+[a-z0-9_./:@=-]+){0,5}/.exec(normalized)?.[0]
            ?? /\b(?:command|script|running|run|executed|exec)\s+[`'"]?([^`'".\n]{3,120})/.exec(normalized)?.[1]?.trim();
        const exitCode = /\b(?:exit(?:ed)?(?:\s+with)?\s+(?:code|status)|exit code|exit status|code)\s*[:=]?\s*(-?\d+)/.exec(normalized)?.[1];
        const errorLine = normalized
            .split(/(?:\\n|\.)/)
            .map(line => line.trim())
            .find(line => /\b(command failed|failed|failing|failure|error|erro|exit code|exit status|npm err|stderr)\b/.test(line));
        const pieces = [
            command ? `cmd:${command}` : undefined,
            exitCode ? `exit:${exitCode}` : undefined,
            errorLine ? `err:${errorLine.slice(0, 220)}` : undefined
        ].filter((value): value is string => !!value);
        return pieces.length ? pieces.join('|') : undefined;
    }

    protected extractControlStatusUpdate(text: string): { status?: CyberVinciChatGoalStatus; expectedGoalId?: string } | undefined {
        const comment = this.findGoalControlComment(text);
        if (!comment) {
            return undefined;
        }
        const status = this.readCommentAttribute(comment, 'status');
        const normalizedStatus = status === 'active' || status === 'paused' || status === 'blocked' || status === 'usage_limited' || status === 'budget_limited' || status === 'complete'
            ? status
            : undefined;
        return {
            status: normalizedStatus,
            expectedGoalId: this.readCommentAttribute(comment, 'expectedGoalId')
        };
    }

    protected extractControlCommand(text: string): { action: 'set' | 'clear' | 'pause' | 'resume' | 'complete'; objective?: string } | undefined {
        const comment = this.findGoalControlComment(text);
        if (!comment) {
            return undefined;
        }
        const action = this.readCommentAttribute(comment, 'action');
        if (action === 'set') {
            return { action, objective: this.readCommentAttribute(comment, 'objective') };
        }
        if (action === 'clear' || action === 'pause' || action === 'resume' || action === 'complete') {
            return { action };
        }
        return undefined;
    }

    protected extractFallbackGoalToolCall(text: string): CyberVinciFallbackGoalToolCall | undefined {
        for (const candidate of this.readFallbackJsonCandidates(text)) {
            const parsed = this.parseFallbackGoalToolCallCandidate(candidate);
            if (parsed) {
                return parsed;
            }
        }
        return undefined;
    }

    protected readFallbackJsonCandidates(text: string): string[] {
        const candidates: string[] = [];
        const fencedJson = /```(?:json|tool_call|cybervinci-goal)?\s*([\s\S]*?)```/gi;
        for (const match of text.matchAll(fencedJson)) {
            if (match[1]?.trim()) {
                candidates.push(match[1].trim());
            }
        }
        const trimmed = text.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            candidates.push(trimmed);
        }
        return candidates.slice(0, 4);
    }

    protected parseFallbackGoalToolCallCandidate(candidate: string): CyberVinciFallbackGoalToolCall | undefined {
        for (const attempt of this.fallbackJsonParseAttempts(candidate)) {
            const parsed = this.tryParseFallbackJson(attempt);
            if (parsed === undefined) {
                continue;
            }
            const items = Array.isArray(parsed) ? parsed : [parsed];
            for (const item of items) {
                const call = this.normalizeFallbackGoalToolCall(item);
                if (call) {
                    return call;
                }
            }
        }
        return undefined;
    }

    protected fallbackJsonParseAttempts(candidate: string): string[] {
        const trimmed = candidate.trim();
        const attempts = [trimmed];
        const repaired = this.repairFallbackGoalToolCallJson(trimmed);
        if (repaired && repaired !== trimmed) {
            attempts.push(repaired);
        }
        return attempts;
    }

    protected tryParseFallbackJson(candidate: string): unknown | undefined {
        try {
            return JSON.parse(candidate);
        } catch {
            return undefined;
        }
    }

    protected repairFallbackGoalToolCallJson(candidate: string): string | undefined {
        let repaired = candidate
            .replace(/^\uFEFF/, '')
            .replace(/^\s*(?:tool_call|function_call|cybervinci_goal)\s*:\s*/i, '')
            .replace(/,\s*([}\]])/g, '$1')
            .replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$2":')
            .replace(/:\s*'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_match, value: string) => `:${JSON.stringify(value.replace(/\\'/g, "'"))}`)
            .replace(/\[\s*'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_match, value: string) => `[${JSON.stringify(value.replace(/\\'/g, "'"))}`)
            .replace(/,\s*'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_match, value: string) => `,${JSON.stringify(value.replace(/\\'/g, "'"))}`);
        const firstBrace = repaired.indexOf('{');
        const lastBrace = repaired.lastIndexOf('}');
        if (firstBrace > 0 && lastBrace > firstBrace) {
            repaired = repaired.slice(firstBrace, lastBrace + 1);
        }
        return repaired.trim() || undefined;
    }

    protected normalizeFallbackGoalToolCall(value: unknown): CyberVinciFallbackGoalToolCall | undefined {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return undefined;
        }
        const record = value as Record<string, unknown>;
        const fn = record.function && typeof record.function === 'object' && !Array.isArray(record.function)
            ? record.function as Record<string, unknown>
            : undefined;
        const name = this.normalizeFallbackGoalToolName(record.tool ?? record.name ?? record.id ?? fn?.name);
        if (!name) {
            return undefined;
        }
        const rawArguments = record.arguments ?? record.args ?? record.parameters ?? fn?.arguments;
        const parsedArguments = typeof rawArguments === 'string' ? this.parseFallbackArgumentsString(rawArguments) : rawArguments;
        const args = parsedArguments && typeof parsedArguments === 'object' && !Array.isArray(parsedArguments)
            ? parsedArguments as Record<string, unknown>
            : {};
        return { name, arguments: args };
    }

    protected normalizeFallbackGoalToolName(value: unknown): CyberVinciFallbackGoalToolCall['name'] | undefined {
        return value === 'create_goal' || value === 'update_goal' ? value : undefined;
    }

    protected parseFallbackArgumentsString(value: string): unknown {
        try {
            return JSON.parse(value);
        } catch {
            return {};
        }
    }

    protected findGoalControlComment(text: string): string | undefined {
        return text.match(/<!--\s*cybervinci:goal\b[\s\S]*?-->/i)?.[0];
    }

    protected readCommentAttribute(comment: string, name: string): string | undefined {
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const match = new RegExp(`${escaped}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(comment);
        const value = match?.[1] ?? match?.[2] ?? match?.[3];
        return value ? this.decodeHtmlEntities(value).trim() : undefined;
    }

    protected decodeHtmlEntities(value: string): string {
        if (typeof document === 'undefined') {
            return value;
        }
        const textarea = document.createElement('textarea');
        textarea.innerHTML = value;
        return textarea.value;
    }

    protected goalStatusEvent(status: CyberVinciChatGoalStatus): string {
        if (status === 'active') {
            return 'goal_resumed';
        }
        if (status === 'paused') {
            return 'goal_paused';
        }
        if (status === 'complete') {
            return 'goal_completed';
        }
        if (status === 'blocked') {
            return 'goal_blocked';
        }
        return status;
    }

    protected async writeRunLog(goal: CyberVinciChatGoalState, event: string, data: Record<string, unknown> = {}): Promise<void> {
        try {
            const fileUri = await this.getRunLogUri(goal);
            if (!fileUri || !this.fileService) {
                return;
            }
            await this.fileService.createFolder(fileUri.parent, { fromUserGesture: false });
            const line = `${JSON.stringify({
                ts: new Date().toISOString(),
                threadId: goal.threadId,
                goalId: goal.goalId,
                event,
                data: {
                    status: goal.status,
                    rounds: goal.rounds,
                    tokensUsed: goal.tokensUsed,
                    tokenBudget: goal.tokenBudget,
                    timeUsedSeconds: this.getElapsedSeconds(goal),
                    ...data
                }
            })}\n`;
            const previous = await this.readRunLog(fileUri);
            await this.fileService.write(fileUri, previous + line);
        } catch (error) {
            console.warn('Could not write CyberVinci Virtual Goal run log:', error);
        }
    }

    protected async readRunLog(fileUri: URI): Promise<string> {
        if (!this.fileService || !await this.fileService.exists(fileUri)) {
            return '';
        }
        return (await this.fileService.read(fileUri)).value;
    }

    protected async getRunLogUri(goal: CyberVinciChatGoalState): Promise<URI | undefined> {
        const workdir = this.workdirService?.getEffectiveWorkdirUri();
        if (!workdir) {
            return undefined;
        }
        return workdir
            .resolve('.cybervinci')
            .resolve('goals')
            .resolve(this.toRunLogSegment(goal.threadId))
            .resolve(this.toRunLogSegment(goal.goalId))
            .resolve('run-log.jsonl');
    }

    protected toRunLogSegment(value: string): string {
        return (value || 'unknown').replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 120) || 'unknown';
    }

    protected calculateTokenDelta(usage: CyberVinciGoalTokenUsage | undefined): number | undefined {
        if (!usage) {
            return undefined;
        }
        const inputTokens = typeof usage.inputTokens === 'number' && Number.isFinite(usage.inputTokens) ? usage.inputTokens : 0;
        const outputTokens = typeof usage.outputTokens === 'number' && Number.isFinite(usage.outputTokens) ? usage.outputTokens : 0;
        const cachedInputTokens = typeof usage.cacheReadInputTokens === 'number' && Number.isFinite(usage.cacheReadInputTokens) ? usage.cacheReadInputTokens : 0;
        return Math.max(0, Math.floor(inputTokens - cachedInputTokens + outputTokens));
    }

    protected estimateTokenDelta(text: string): number {
        return Math.max(1, Math.ceil(text.length / 4));
    }
}

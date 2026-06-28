// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import {
    ImageContent,
    LanguageModel,
    LanguageModelMessage,
    LanguageModelResponse,
    LanguageModelStreamResponsePart,
    LanguageModelStatus,
    ReasoningLevel,
    UserRequest
} from '@theia/ai-core';
import { CancellationToken, nls } from '@theia/core';
import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { inject, injectable } from '@theia/core/shared/inversify';
import {
    CodexProviderNotificationMessage,
    CodexProviderInputItem,
    CodexProviderOptions,
    CodexProviderStreamMessage
} from '../common/ai-providers-service';
import { CodexProviderRuntimeProvider } from './ai-providers-runtime-provider';
import { VirtualReasoningEngine, VirtualReasoningMode, VirtualReasoningOptions, ReasoningStage } from './virtual-reasoning';

export const CYBERVINCI_AI_PROVIDER_LANGUAGE_MODEL_ID = 'cybervinci-ai-provider';
export const CODEX_CLI_LANGUAGE_MODEL_ID = CYBERVINCI_AI_PROVIDER_LANGUAGE_MODEL_ID;

type VirtualGoalStatus = 'active' | 'paused' | 'blocked' | 'usage_limited' | 'budget_limited' | 'complete';

interface VirtualGoalOptions {
    enabled: boolean;
    allowModelControl: boolean;
    goalId?: string;
    objective?: string;
    status?: VirtualGoalStatus;
    rounds?: number;
    maxRounds?: number;
    tokenBudget?: number;
    tokensUsed?: number;
    usageEstimated?: boolean;
    timeUsedSeconds?: number;
}

@injectable()
export class CodexProviderLanguageModel implements LanguageModel, FrontendApplicationContribution {
    readonly id = CODEX_CLI_LANGUAGE_MODEL_ID;
    readonly name = 'CyberVinci AI Provider';
    readonly vendor = 'CyberVinci';
    readonly family = 'cybervinci-ai-provider';
    readonly version = 'multi-runtime';
    protected currentStatus: LanguageModelStatus = { status: 'ready' };
    readonly reasoningSupport = {
        supportedLevels: ['off', 'minimal', 'low', 'medium', 'high', 'auto'] as ReasoningLevel[],
        defaultLevel: 'auto' as ReasoningLevel
    };

    @inject(CodexProviderRuntimeProvider)
    protected readonly codexProvider: CodexProviderRuntimeProvider;

    get status(): LanguageModelStatus {
        return this.currentStatus;
    }

    async initialize(): Promise<void> {
        await this.refreshStatus();
    }

    async request(request: UserRequest, cancellationToken?: CancellationToken): Promise<LanguageModelResponse> {
        await this.refreshStatus();
        if (this.currentStatus.status !== 'ready') {
            throw new Error(this.currentStatus.message || nls.localize('theia/ai-providers/languageModel/notAvailable', 'CyberVinci AI provider is not available.'));
        }
        const virtualReasoning = this.readVirtualReasoningSettings(request.settings?.virtualReasoning);
        if (virtualReasoning?.enabled && virtualReasoning.mode !== 'off') {
            return this.requestWithVirtualReasoning(request, virtualReasoning, cancellationToken);
        }
        return this.requestDirect(request, cancellationToken);
    }

    protected async requestDirect(request: UserRequest, cancellationToken?: CancellationToken): Promise<LanguageModelResponse> {
        const stream = await this.codexProvider.send({
            prompt: this.toPrompt(request),
            input: this.toInput(request),
            options: this.toCodexOptions(request)
        }, cancellationToken);

        return {
            stream: this.toLanguageModelStream(stream)
        };
    }

    protected async requestWithVirtualReasoning(
        request: UserRequest,
        virtualReasoning: VirtualReasoningOptions,
        cancellationToken?: CancellationToken
    ): Promise<LanguageModelResponse> {
        const basePrompt = this.toPrompt(request, { includeVirtualReasoningInstruction: false });
        const engine = new VirtualReasoningEngine();
        const resolvedMode = engine.resolveMode(basePrompt, virtualReasoning.mode);
        if (resolvedMode === 'off') {
            return this.requestDirect(request, cancellationToken);
        }
        return {
            stream: this.virtualReasoningStream(request, basePrompt, resolvedMode, virtualReasoning, cancellationToken)
        };
    }

    protected async *virtualReasoningStream(
        request: UserRequest,
        basePrompt: string,
        mode: VirtualReasoningMode,
        virtualReasoning: VirtualReasoningOptions,
        cancellationToken?: CancellationToken
    ): AsyncIterable<LanguageModelStreamResponsePart> {
        const progressQueue: string[] = [];
        let wakeProgress: (() => void) | undefined;
        let completed = false;
        let resultText = '';
        let failure: unknown;
        const wake = (): void => {
            const wakeCurrent = wakeProgress;
            wakeProgress = undefined;
            wakeCurrent?.();
        };
        const pushProgress = (message: string): void => {
            if (virtualReasoning.showProgress === false) {
                return;
            }
            progressQueue.push(message);
            wake();
        };
        const engine = new VirtualReasoningEngine();
        const execution = engine.execute({
            basePrompt,
            baseModelId: this.id,
            mode,
            onProgress: (_stage, message) => pushProgress(message),
            invokeStage: (stage, prompt) => this.completeInternalPrompt(stage, prompt, request, cancellationToken)
        }).then(result => {
            resultText = result.finalAnswer.trim();
        }, error => {
            failure = error;
        }).finally(() => {
            completed = true;
            wake();
        });
        try {
            while (!completed || progressQueue.length > 0) {
                while (progressQueue.length > 0) {
                    yield { thought: progressQueue.shift()!, signature: CODEX_CLI_LANGUAGE_MODEL_ID };
                }
                if (!completed) {
                    await new Promise<void>(resolve => {
                        wakeProgress = resolve;
                    });
                }
            }
            await execution;
        } catch (error) {
            failure = error;
        }
        if (failure || !resultText) {
            if (failure) {
                console.warn('Virtual Reasoning failed, falling back to direct model request:', failure);
            }
            const direct = await this.requestDirect(request, cancellationToken);
            for await (const part of (direct as { stream: AsyncIterable<LanguageModelStreamResponsePart> }).stream) {
                yield part;
            }
            return;
        }
        yield { content: resultText };
    }

    protected async completeInternalPrompt(
        stage: ReasoningStage,
        prompt: string,
        request: UserRequest,
        cancellationToken?: CancellationToken
    ): Promise<string> {
        const stream = await this.codexProvider.send({
            prompt,
            input: [{ type: 'text', text: prompt, text_elements: [] }],
            options: this.toCodexOptions(request)
        }, cancellationToken);
        const chunks: string[] = [];
        for await (const part of this.toLanguageModelStream(stream)) {
            if ('content' in part && part.content) {
                chunks.push(part.content);
            }
        }
        const text = chunks.join('').trim();
        if (!text) {
            throw new Error(`Virtual Reasoning stage "${stage}" returned no text.`);
        }
        return text;
    }

    protected async refreshStatus(): Promise<void> {
        const status = await this.codexProvider.getStatus();
        this.currentStatus = status.available === false
            ? { status: 'unavailable', message: status.message || nls.localize('theia/ai-providers/languageModel/runtimeUnavailable', 'CyberVinci AI provider runtime is not available.') }
            : { status: 'ready', message: status.version };
    }

    protected toCodexOptions(request: UserRequest): Partial<CodexProviderOptions> {
        const options: Partial<CodexProviderOptions> = {
            collaborationMode: 'default'
        };
        const reasoningEffort = this.toReasoningEffort(request.reasoning?.level);
        if (reasoningEffort) {
            options.reasoningEffort = reasoningEffort;
        }
        return options;
    }

    protected toReasoningEffort(level: ReasoningLevel | undefined): CodexProviderOptions['reasoningEffort'] {
        if (level === 'minimal' || level === 'low') {
            return 'low';
        }
        if (level === 'medium' || level === 'high') {
            return level;
        }
        return undefined;
    }

    protected async *toLanguageModelStream(stream: AsyncIterable<CodexProviderStreamMessage>): AsyncIterable<LanguageModelStreamResponsePart> {
        let receivedAgentDelta = false;
        for await (const message of stream) {
            if (message.type === 'approval-request') {
                this.codexProvider.sendApprovalResponse({
                    type: 'approval-response',
                    requestId: message.requestId,
                    decision: message.method === 'item/fileChange/requestApproval' || message.method === 'applyPatchApproval' ? 'decline' : 'cancel'
                });
                continue;
            }
            if (message.type === 'user-input-request') {
                this.codexProvider.sendUserInputResponse({
                    type: 'user-input-response',
                    requestId: message.requestId,
                    answers: {}
                });
                continue;
            }
            if (message.type === 'notification') {
                for (const part of this.toStreamParts(message, receivedAgentDelta)) {
                    if ('content' in part && part.content) {
                        receivedAgentDelta = true;
                    }
                    yield part;
                }
            }
        }
    }

    protected *toStreamParts(message: CodexProviderNotificationMessage, receivedAgentDelta: boolean): Iterable<LanguageModelStreamResponsePart> {
        const { method, params } = message;
        if (method === 'item/agentMessage/delta' || method === 'item/agent_message/delta' || method === 'agent_message_delta' || method === 'response/output_text/delta') {
            yield { content: this.readFirstString(params, ['delta', 'text', 'content', 'message']) };
        } else if (method === 'item/reasoning/textDelta' || method === 'item/reasoning/summaryTextDelta' || method === 'item/plan/delta') {
            yield { thought: this.readString(params, 'delta'), signature: CODEX_CLI_LANGUAGE_MODEL_ID };
        } else if (method === 'item/completed' && !receivedAgentDelta) {
            const item = this.readObject(params, 'item');
            if (item.type === 'agent_message' || item.type === 'agentMessage') {
                const content = this.readFirstString(item, ['text', 'message', 'content']);
                if (content) {
                    yield { content };
                }
            }
        } else if ((method === 'turn/completed' || method === 'response/completed') && !receivedAgentDelta) {
            const content = this.readFirstString(params, ['last_agent_message', 'text', 'message', 'content', 'output_text']);
            if (content) {
                yield { content };
            }
        } else if (method === 'task_complete' && !receivedAgentDelta) {
            yield { content: this.readString(params, 'last_agent_message') };
        } else if (method === 'turn/failed') {
            yield { content: this.toDisplayText(params) };
        } else if (method === 'error' || method === 'warning' || method === 'configWarning') {
            yield { content: this.toDisplayText(params) };
        }
    }

    protected toPrompt(request: UserRequest, options: { includeVirtualReasoningInstruction?: boolean } = {}): string {
        const lines: string[] = [];
        const includeVirtualReasoningInstruction = options.includeVirtualReasoningInstruction !== false;
        const virtualReasoningInstruction = includeVirtualReasoningInstruction ? this.toVirtualReasoningInstruction(request) : '';
        if (virtualReasoningInstruction) {
            lines.push(virtualReasoningInstruction);
        }
        const virtualGoalInstruction = this.toVirtualGoalInstruction(request);
        if (virtualGoalInstruction) {
            lines.push(virtualGoalInstruction);
        }
        for (const message of request.messages) {
            const text = this.messageToText(message);
            if (text) {
                lines.push(`[${message.actor}] ${text}`);
            }
        }
        return lines.join('\n\n');
    }

    protected toVirtualReasoningInstruction(request: UserRequest): string {
        const virtualReasoning = this.readVirtualReasoningSettings(request.settings?.virtualReasoning);
        if (!virtualReasoning?.enabled || virtualReasoning.mode === 'off') {
            return '';
        }
        const mode = virtualReasoning.mode ?? 'auto';
        const flow = mode === 'auto'
            ? 'auto-select direct, fast, or balanced'
            : mode === 'fast'
            ? 'draft -> critique -> revise/final'
            : 'classify -> plan -> draft -> critique -> revise -> verify -> final';
        return [
            '[system] Virtual Reasoning is enabled for this turn.',
            `Mode: ${mode}. Internal flow: ${flow}.`,
            'Use this as a private answer-quality harness. Do not reveal hidden reasoning, intermediate drafts, critique, verification JSON, or harness details.',
            'Return only the final answer the user asked for. If progress UI is unavailable, do not print progress messages.'
        ].join('\n');
    }

    protected toVirtualGoalInstruction(request: UserRequest): string {
        const virtualGoal = this.readVirtualGoalSettings(request.settings?.virtualGoal);
        if (!virtualGoal?.enabled && !virtualGoal?.allowModelControl) {
            return '';
        }
        const lines = [
            '[system] CyberVinci Goal controls are available for this turn.',
            'If native tool calling is available, use get_goal to inspect the goal, create_goal only when the latest user message explicitly asks to create a goal, and update_goal only with status "complete" or "blocked".',
            'When using update_goal with status "complete", include concise evidence when the provider supports an evidence argument: tests, files, commands, runtime checks, or other direct verification.',
            'Only create a goal when the latest user message explicitly asks for a goal. The model must not pause, resume, clear, rewrite, or budget a goal; those operations are user/runtime controlled.',
            'If native tool calling is not available and the user explicitly asks to create a goal, include exactly one hidden HTML comment in the final answer: <!-- cybervinci:goal action="set" objective="..." -->.',
            `If hidden comments are not reliable for the provider, use exactly one fenced JSON fallback instead: {"tool":"create_goal","arguments":{"objective":"..."}} or {"tool":"update_goal","arguments":{"status":"complete","expectedGoalId":"${virtualGoal?.goalId ?? '<current-goal-id>'}","evidence":"..."}}. Do not mention hidden controls or fallback JSON to the user.`
        ];
        if (virtualGoal?.enabled && virtualGoal.objective) {
            lines.push(
                'Virtual Goal is active. Continue concrete work toward this objective unless higher-priority instructions or the latest user message conflict with it.',
                'Do not narrow, replace, or declare completion based on partial progress. Before marking complete, audit the current state against the objective and cite direct evidence from files, commands, tests, rendered output, or runtime state.',
                virtualGoal.goalId ? `Goal ID: ${virtualGoal.goalId}` : 'Goal ID: unknown',
                `Objective: ${virtualGoal.objective}`,
                `Current progress: ${virtualGoal.rounds ?? 0} continuation rounds${virtualGoal.maxRounds ? ` of ${virtualGoal.maxRounds}` : ''}.`,
                `Token usage: ${virtualGoal.tokensUsed ?? 0}${virtualGoal.tokenBudget ? ` of ${virtualGoal.tokenBudget}` : ''}${virtualGoal.usageEstimated ? ' estimated' : ''}.`,
                `At the end of the final answer include exactly one hidden HTML comment: <!-- cybervinci:goal status="active" --> while more work remains, <!-- cybervinci:goal status="complete"${virtualGoal.goalId ? ` expectedGoalId="${virtualGoal.goalId}"` : ''} --> only when the objective is fully satisfied, or <!-- cybervinci:goal status="blocked"${virtualGoal.goalId ? ` expectedGoalId="${virtualGoal.goalId}"` : ''} --> only when meaningful progress is no longer possible without user input or an external state change. If hidden comments are not reliable for the provider, use a fenced JSON update_goal fallback with status "complete" or "blocked"${virtualGoal.goalId ? ` and expectedGoalId "${virtualGoal.goalId}"` : ''} instead.`
            );
        } else if (virtualGoal?.status === 'paused' && virtualGoal.objective) {
            lines.push(
                'A CyberVinci Goal exists but is paused. Do not pursue it automatically unless the latest user message explicitly asks to resume it.',
                `Paused objective: ${virtualGoal.objective}`
            );
        } else if (virtualGoal?.status === 'budget_limited' && virtualGoal.objective) {
            lines.push(
                'A CyberVinci Goal exists but its token budget is exhausted. Do not start new autonomous work for it.',
                `Budget-limited objective: ${virtualGoal.objective}`,
                `Token usage: ${virtualGoal.tokensUsed ?? 0}${virtualGoal.tokenBudget ? ` of ${virtualGoal.tokenBudget}` : ''}${virtualGoal.usageEstimated ? ' estimated' : ''}.`
            );
        } else if (virtualGoal?.status === 'usage_limited' && virtualGoal.objective) {
            lines.push(
                'A CyberVinci Goal exists but provider usage limits stopped it. Do not auto-loop; explain the current limit if the user asks.',
                `Usage-limited objective: ${virtualGoal.objective}`
            );
        } else if (virtualGoal?.status === 'blocked' && virtualGoal.objective) {
            lines.push(
                'A CyberVinci Goal is blocked. Do not claim it is complete unless the user gives new information or explicitly resumes/replaces it.',
                `Blocked objective: ${virtualGoal.objective}`
            );
        } else if (virtualGoal?.status === 'complete' && virtualGoal.objective) {
            lines.push(
                'A CyberVinci Goal is complete. Do not continue it unless the user explicitly creates or resumes a new goal.',
                `Completed objective: ${virtualGoal.objective}`
            );
        }
        return lines.join('\n');
    }

    protected readVirtualReasoningSettings(value: unknown): VirtualReasoningOptions | undefined {
        if (!value || typeof value !== 'object') {
            return undefined;
        }
        const record = value as Record<string, unknown>;
        const mode = this.normalizeVirtualReasoningMode(record.mode);
        return {
            enabled: record.enabled === true && mode !== 'off',
            mode,
            showProgress: typeof record.showProgress === 'boolean' ? record.showProgress : undefined
        };
    }

    protected readVirtualGoalSettings(value: unknown): VirtualGoalOptions | undefined {
        if (!value || typeof value !== 'object') {
            return undefined;
        }
        const record = value as Record<string, unknown>;
        return {
            enabled: record.enabled === true,
            allowModelControl: record.allowModelControl !== false,
            goalId: typeof record.goalId === 'string' && record.goalId ? record.goalId : undefined,
            objective: typeof record.objective === 'string' ? record.objective : undefined,
            status: this.normalizeVirtualGoalStatus(record.status),
            rounds: typeof record.rounds === 'number' && Number.isFinite(record.rounds) ? Math.max(0, Math.floor(record.rounds)) : undefined,
            maxRounds: typeof record.maxRounds === 'number' && Number.isFinite(record.maxRounds) ? Math.max(1, Math.floor(record.maxRounds)) : undefined,
            tokenBudget: typeof record.tokenBudget === 'number' && Number.isFinite(record.tokenBudget) ? Math.max(1, Math.floor(record.tokenBudget)) : undefined,
            tokensUsed: typeof record.tokensUsed === 'number' && Number.isFinite(record.tokensUsed) ? Math.max(0, Math.floor(record.tokensUsed)) : undefined,
            usageEstimated: record.usageEstimated === true,
            timeUsedSeconds: typeof record.timeUsedSeconds === 'number' && Number.isFinite(record.timeUsedSeconds) ? Math.max(0, Math.floor(record.timeUsedSeconds)) : undefined
        };
    }

    protected normalizeVirtualGoalStatus(value: unknown): VirtualGoalStatus | undefined {
        return value === 'active' || value === 'paused' || value === 'blocked' || value === 'usage_limited' || value === 'budget_limited' || value === 'complete'
            ? value
            : undefined;
    }

    protected normalizeVirtualReasoningMode(value: unknown): VirtualReasoningMode {
        return value === 'auto' || value === 'fast' || value === 'balanced' || value === 'deep' || value === 'coding' || value === 'research' || value === 'lats' ? value : 'off';
    }

    protected toInput(request: UserRequest): CodexProviderInputItem[] {
        const input: CodexProviderInputItem[] = [{
            type: 'text',
            text: this.toPrompt(request),
            text_elements: []
        }];
        for (const message of request.messages) {
            if (!LanguageModelMessage.isImageMessage(message)) {
                continue;
            }
            if (ImageContent.isUrl(message.image)) {
                input.push({ type: 'image', url: message.image.url });
            } else if (ImageContent.isBase64(message.image)) {
                input.push({ type: 'image', url: `data:${message.image.mimeType};base64,${message.image.base64data}` });
            }
        }
        return input;
    }

    protected messageToText(message: LanguageModelMessage): string {
        if (LanguageModelMessage.isTextMessage(message)) {
            return message.text;
        }
        if (LanguageModelMessage.isThinkingMessage(message)) {
            return message.thinking;
        }
        if (LanguageModelMessage.isToolUseMessage(message)) {
            return `Tool request ${message.name}: ${JSON.stringify(message.input)}`;
        }
        if (LanguageModelMessage.isToolResultMessage(message)) {
            return `Tool result ${message.name}: ${this.toDisplayText(message.content)}`;
        }
        if (LanguageModelMessage.isImageMessage(message)) {
            return ImageContent.isUrl(message.image) ? `Image: ${message.image.url}` : `Image: ${message.image.mimeType}`;
        }
        return '';
    }

    protected readFirstString(source: unknown, keys: string[]): string {
        for (const key of keys) {
            const value = this.readString(source, key);
            if (value) {
                return value;
            }
        }
        return '';
    }

    protected readString(source: unknown, key: string): string {
        if (typeof source === 'object' && source && key in source) {
            const value = (source as Record<string, unknown>)[key];
            return typeof value === 'string' ? value : '';
        }
        return '';
    }

    protected readObject(source: unknown, key: string): Record<string, unknown> {
        if (typeof source === 'object' && source && key in source) {
            const value = (source as Record<string, unknown>)[key];
            return typeof value === 'object' && value ? value as Record<string, unknown> : {};
        }
        return {};
    }

    protected toDisplayText(value: unknown): string {
        return typeof value === 'string' ? value : JSON.stringify(value, undefined, 2);
    }
}

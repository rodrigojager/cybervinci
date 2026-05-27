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
} from '../common/codex-provider-service';
import { CodexProviderRuntimeProvider } from './codex-provider-runtime-provider';

export const CODEX_CLI_LANGUAGE_MODEL_ID = 'codex-provider';

@injectable()
export class CodexProviderLanguageModel implements LanguageModel, FrontendApplicationContribution {
    readonly id = CODEX_CLI_LANGUAGE_MODEL_ID;
    readonly name = 'Codex Provider';
    readonly vendor = 'OpenAI';
    readonly family = 'codex-provider';
    readonly version = 'app-server';
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
            throw new Error(this.currentStatus.message || nls.localize('theia/codex-provider/languageModel/notAvailable', 'Codex Provider is not available.'));
        }
        const stream = await this.codexProvider.send({
            prompt: this.toPrompt(request),
            input: this.toInput(request),
            options: this.toCodexOptions(request)
        }, cancellationToken);

        return {
            stream: this.toLanguageModelStream(stream)
        };
    }

    protected async refreshStatus(): Promise<void> {
        const status = await this.codexProvider.getStatus();
        this.currentStatus = status.available === false
            ? { status: 'unavailable', message: status.message || nls.localize('theia/codex-provider/languageModel/executableUnavailable', 'Codex Provider executable was not found or is not working.') }
            : { status: 'ready', message: status.version };
    }

    protected toCodexOptions(request: UserRequest): Partial<CodexProviderOptions> {
        const options: Partial<CodexProviderOptions> = {
            collaborationMode: 'default',
            approvalPolicy: 'never',
            sandboxMode: 'read-only',
            webSearch: 'disabled'
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

    protected toPrompt(request: UserRequest): string {
        const lines: string[] = [];
        for (const message of request.messages) {
            const text = this.messageToText(message);
            if (text) {
                lines.push(`[${message.actor}] ${text}`);
            }
        }
        return lines.join('\n\n');
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

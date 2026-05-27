// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { inject, injectable } from '@theia/core/shared/inversify';
import {
    LanguageModelMessage,
    LanguageModelRequest,
    ToolCallContent,
    ToolCallContentResult,
    ToolCallResult,
    ToolRequest,
    isToolCallContent
} from '@theia/ai-core/lib/common';
import { PreferenceService } from '@theia/core/lib/common/preferences';
import { AIOutputCleanerBackendService } from '../common/ai-output-cleaner-backend-service';
import {
    OUTPUT_CLEANER_ENABLED_PREF,
    OUTPUT_CLEANER_LITERAL_BYPASS_PATTERNS_PREF,
    OUTPUT_CLEANER_MODE_PREF,
    OUTPUT_CLEANER_RAW_ARTIFACTS_ENABLED_PREF,
    OUTPUT_CLEANER_SHOW_NOTICE_PREF,
    OUTPUT_CLEANER_STATUS_AWARE_ENABLED_PREF,
    OUTPUT_CLEANER_STATUS_INTENT_PATTERNS_PREF,
    OUTPUT_CLEANER_THEIA_TOOLS_ENABLED_PREF,
    OUTPUT_CLEANER_WRAPPER_COMMANDS_PREF
} from '../common/ai-output-cleaner-preferences';
import { AIOutputCleanerService } from '../common/ai-output-cleaner-service';
import { AIOutputCleanerResult, AIOutputCleanerServiceConfig } from '../common/ai-output-cleaner-types';

interface PersistedArtifact {
    id: string;
}

interface TextualToolPayload {
    command?: string;
    args: string[];
    stdout: string;
    stderr: string;
    exitCode?: number;
    status?: 'running' | 'completed' | 'failed';
    format: 'string' | 'json-string' | 'tool-call-content' | 'command-object';
    resultObject?: Record<string, unknown>;
}

@injectable()
export class TheiaToolCallInterceptor {

    @inject(PreferenceService)
    protected readonly preferenceService: PreferenceService;

    @inject(AIOutputCleanerBackendService)
    protected readonly backendService: AIOutputCleanerBackendService;

    async intercept(
        request: LanguageModelRequest,
        tool: ToolRequest,
        argString: string,
        rawResult: ToolCallResult
    ): Promise<ToolCallResult> {
        if (!this.isEnabled()) {
            return rawResult;
        }

        const payload = this.extractPayload(tool, argString, rawResult);
        if (!payload) {
            return rawResult;
        }

        const sessionId = this.extractSessionId(request);
        const sessionOverride = sessionId ? await this.backendService.getSessionOverride(sessionId) : undefined;
        const cleanResult = sessionOverride?.bypassFiltering
            ? this.createBypassedResult(payload)
            : new AIOutputCleanerService(this.readConfig()).clean({
                origin: 'theia-tool',
                command: payload.command,
                args: payload.args,
                prompt: this.extractPrompt(request),
                stdout: payload.stdout,
                stderr: payload.stderr,
                exitCode: payload.exitCode,
                status: payload.status
            });

        const artifact = await this.persistArtifactIfNeeded(tool, payload, cleanResult, sessionId);
        return this.applyResult(payload, rawResult, cleanResult, artifact);
    }

    protected isEnabled(): boolean {
        return this.preferenceService.get<boolean>(OUTPUT_CLEANER_ENABLED_PREF, false)
            && this.preferenceService.get<boolean>(OUTPUT_CLEANER_THEIA_TOOLS_ENABLED_PREF, true);
    }

    protected readConfig(): AIOutputCleanerServiceConfig {
        const mode = this.preferenceService.get<string>(OUTPUT_CLEANER_MODE_PREF, 'safe');
        const statusAware = this.preferenceService.get<boolean>(OUTPUT_CLEANER_STATUS_AWARE_ENABLED_PREF, true);
        return {
            enabled: true,
            mode: statusAware && mode === 'safe' ? 'status-aware' : (mode as AIOutputCleanerServiceConfig['mode']),
            showFilteringNotice: this.preferenceService.get<boolean>(OUTPUT_CLEANER_SHOW_NOTICE_PREF, true),
            wrapperCommands: this.preferenceService.get<string[]>(OUTPUT_CLEANER_WRAPPER_COMMANDS_PREF, []),
            literalBypassPatterns: this.preferenceService.get<string[]>(OUTPUT_CLEANER_LITERAL_BYPASS_PATTERNS_PREF, []),
            statusIntentPatterns: this.preferenceService.get<string[]>(OUTPUT_CLEANER_STATUS_INTENT_PATTERNS_PREF, [])
        };
    }

    protected extractPrompt(request: LanguageModelRequest): string {
        return request.messages
            .filter((message): message is LanguageModelMessage & { actor: 'user', type: 'text', text: string } =>
                LanguageModelMessage.isTextMessage(message) && message.actor === 'user')
            .map(message => message.text)
            .join('\n');
    }

    protected extractSessionId(request: LanguageModelRequest): string | undefined {
        const candidate = (request as Partial<{ sessionId: unknown }>).sessionId;
        return typeof candidate === 'string' && candidate.length > 0 ? candidate : undefined;
    }

    protected extractPayload(tool: ToolRequest, argString: string, rawResult: ToolCallResult): TextualToolPayload | undefined {
        const parsedArgs = this.tryParseJson(argString);
        if (!this.supportsInterception(tool.id, parsedArgs, rawResult)) {
            return undefined;
        }
        const command = this.extractCommand(tool.id, parsedArgs, rawResult);
        const args = this.tokenizeCommand(command);

        if (typeof rawResult === 'string') {
            const parsedResult = this.tryParseJson(rawResult);
            if (parsedResult && this.isCommandResultObject(parsedResult)) {
                return {
                    command,
                    args,
                    stdout: this.readString(parsedResult.aggregated_output) ?? this.readString(parsedResult.stdout) ?? '',
                    stderr: this.readString(parsedResult.stderr) ?? '',
                    exitCode: this.readNumber(parsedResult.exit_code) ?? this.readNumber(parsedResult.exitCode),
                    status: this.toStatus(this.readString(parsedResult.status)),
                    format: 'json-string',
                    resultObject: parsedResult
                };
            }
            return {
                command,
                args,
                stdout: rawResult,
                stderr: '',
                format: 'string'
            };
        }

        if (isToolCallContent(rawResult)) {
            const textParts = rawResult.content.filter((item): item is { type: 'text'; text: string } => item.type === 'text');
            if (textParts.length === 0) {
                return undefined;
            }
            return {
                command,
                args,
                stdout: textParts.map(item => item.text).join('\n'),
                stderr: '',
                format: 'tool-call-content'
            };
        }

        if (this.isCommandResultObject(rawResult)) {
            return {
                command,
                args,
                stdout: this.readString(rawResult.aggregated_output) ?? this.readString(rawResult.stdout) ?? '',
                stderr: this.readString(rawResult.stderr) ?? '',
                exitCode: this.readNumber(rawResult.exit_code) ?? this.readNumber(rawResult.exitCode),
                status: this.toStatus(this.readString(rawResult.status)),
                format: 'command-object',
                resultObject: rawResult
            };
        }

        return undefined;
    }

    protected supportsInterception(toolId: string, parsedArgs: unknown, rawResult: ToolCallResult): boolean {
        if (toolId.includes('command') || toolId.includes('terminal') || toolId.includes('shell')) {
            return true;
        }
        if (this.isObject(parsedArgs) && (typeof parsedArgs.command === 'string' || typeof parsedArgs.cmd === 'string')) {
            return true;
        }
        return this.isCommandResultObject(rawResult);
    }

    protected extractCommand(toolId: string, parsedArgs: unknown, rawResult: ToolCallResult): string | undefined {
        if (this.isObject(parsedArgs)) {
            const command = this.readString(parsedArgs.command) ?? this.readString(parsedArgs.cmd);
            if (command) {
                return command;
            }
        }
        if (this.isCommandResultObject(rawResult)) {
            const command = this.readString(rawResult.command) ?? this.readString(rawResult.cmd);
            if (command) {
                return command;
            }
        }
        return toolId.includes('command') || toolId.includes('terminal') || toolId.includes('shell')
            ? toolId
            : undefined;
    }

    protected tokenizeCommand(command: string | undefined): string[] {
        if (!command) {
            return [];
        }
        return command.match(/"[^"]*"|'[^']*'|\S+/g)?.map(token => token.replace(/^['"]|['"]$/g, '')) ?? [];
    }

    protected async persistArtifactIfNeeded(
        tool: ToolRequest,
        payload: TextualToolPayload,
        cleanResult: AIOutputCleanerResult,
        sessionId?: string
    ): Promise<PersistedArtifact | undefined> {
        if (!this.preferenceService.get<boolean>(OUTPUT_CLEANER_RAW_ARTIFACTS_ENABLED_PREF, true)) {
            return undefined;
        }

        const startedAt = new Date().toISOString();
        const artifact = await this.backendService.saveArtifact({
            command: payload.command ?? tool.id,
            args: payload.args,
            origin: 'theia-tool',
            provider: tool.providerName,
            sessionId,
            startedAt,
            completedAt: new Date().toISOString(),
            exitCode: cleanResult.exitCode,
            rawStdout: payload.stdout,
            rawStderr: payload.stderr,
            cleanedStdout: cleanResult.stdout,
            cleanedStderr: cleanResult.stderr,
            changed: cleanResult.changed,
            filtersApplied: cleanResult.filtersApplied,
            notice: cleanResult.notice
        });

        return { id: artifact.id };
    }

    protected createBypassedResult(payload: TextualToolPayload): AIOutputCleanerResult {
        return {
            stdout: payload.stdout,
            stderr: payload.stderr,
            exitCode: payload.exitCode,
            changed: false,
            removedLineCount: 0,
            filtersApplied: []
        };
    }

    protected applyResult(
        payload: TextualToolPayload,
        rawResult: ToolCallResult,
        cleanResult: AIOutputCleanerResult,
        artifact: PersistedArtifact | undefined
    ): ToolCallResult {
        const notice = this.composeNotice(cleanResult.notice, artifact);

        if (payload.format === 'string') {
            return this.joinText(cleanResult.stdout, notice);
        }

        if (payload.format === 'json-string') {
            const resultObject = { ...payload.resultObject };
            resultObject.aggregated_output = this.joinText(cleanResult.stdout, notice);
            resultObject.stderr = cleanResult.stderr;
            if (cleanResult.exitCode !== undefined) {
                resultObject.exit_code = cleanResult.exitCode;
            }
            return JSON.stringify(resultObject);
        }

        if (payload.format === 'command-object') {
            return {
                ...payload.resultObject,
                aggregated_output: this.joinText(cleanResult.stdout, notice),
                stderr: cleanResult.stderr,
                ...(cleanResult.exitCode !== undefined ? { exit_code: cleanResult.exitCode } : {})
            };
        }

        if (isToolCallContent(rawResult)) {
            const content: ToolCallContentResult[] = [];
            let replaced = false;
            for (const item of rawResult.content) {
                if (!replaced && item.type === 'text') {
                    content.push({ type: 'text', text: cleanResult.stdout });
                    replaced = true;
                } else if (item.type !== 'text') {
                    content.push(item);
                }
            }
            if (notice) {
                content.push({ type: 'text', text: notice });
            }
            return { content } satisfies ToolCallContent;
        }

        return rawResult;
    }

    protected composeNotice(notice: string | undefined, artifact: PersistedArtifact | undefined): string | undefined {
        if (!artifact) {
            return notice;
        }
        const artifactNotice = `[CyberVinci AI Output Cleaner raw output saved as cybervinci://output-artifact/${artifact.id}.]`;
        return notice ? `${notice}\n${artifactNotice}` : artifactNotice;
    }

    protected joinText(text: string, suffix: string | undefined): string {
        if (!suffix) {
            return text;
        }
        return text ? `${text}\n${suffix}` : suffix;
    }

    protected tryParseJson(value: string): Record<string, unknown> | undefined {
        const trimmed = value.trim();
        if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
            return undefined;
        }
        try {
            const parsed = JSON.parse(trimmed);
            return this.isObject(parsed) ? parsed : undefined;
        } catch {
            return undefined;
        }
    }

    protected isCommandResultObject(value: unknown): value is Record<string, unknown> {
        return this.isObject(value) && (
            typeof value.command === 'string'
            || typeof value.cmd === 'string'
            || typeof value.aggregated_output === 'string'
            || typeof value.stdout === 'string'
        );
    }

    protected isObject(value: unknown): value is Record<string, unknown> {
        return !!value && typeof value === 'object';
    }

    protected readString(value: unknown): string | undefined {
        return typeof value === 'string' ? value : undefined;
    }

    protected readNumber(value: unknown): number | undefined {
        return typeof value === 'number' ? value : undefined;
    }

    protected toStatus(value: string | undefined): 'running' | 'completed' | 'failed' | undefined {
        if (value === 'running') {
            return 'running';
        }
        if (value === 'completed' || value === 'success') {
            return 'completed';
        }
        if (value === 'failed' || value === 'error') {
            return 'failed';
        }
        return undefined;
    }
}

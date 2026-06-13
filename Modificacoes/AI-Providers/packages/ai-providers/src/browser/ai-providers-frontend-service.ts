// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { CancellationToken, generateUuid, nls, PreferenceService } from '@theia/core';
import { FileUri } from '@theia/core/lib/common/file-uri';
import { inject, injectable } from '@theia/core/shared/inversify';
import { OutputChannel, OutputChannelManager, OutputChannelSeverity } from '@theia/output/lib/browser/output-channel';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import {
    CODEX_CLI_APPROVAL_POLICY_PREF,
    CODEX_CLI_CLAUDE_AGENT_PREF,
    CODEX_CLI_CLAUDE_EXECUTABLE_PATH_PREF,
    CODEX_CLI_CURSOR_EXECUTABLE_PATH_PREF,
    CODEX_CLI_CURSOR_MODE_PREF,
    CODEX_CLI_EXECUTABLE_PATH_PREF,
    CODEX_CLI_GEMINI_EXECUTABLE_PATH_PREF,
    CODEX_CLI_MODEL_PREF,
    CODEX_CLI_MODEL_PROVIDER_PREF,
    CODEX_CLI_OPENCODE_API_KEY_PREF,
    CODEX_CLI_OPENCODE_AGENT_PREF,
    CODEX_CLI_OPENCODE_EXECUTABLE_PATH_PREF,
    CODEX_CLI_OPENCODE_VARIANT_PREF,
    CODEX_CLI_OPENROUTER_API_KEY_PREF,
    CODEX_CLI_PROFILE_PREF,
    CODEX_CLI_REASONING_EFFORT_PREF,
    CODEX_CLI_RUNTIME_PREF,
    CODEX_CLI_SANDBOX_MODE_PREF,
    CODEX_CLI_SERVICE_TIER_PREF,
    CODEX_CLI_VERBOSITY_PREF,
    CODEX_CLI_WEB_SEARCH_CONTEXT_SIZE_PREF,
    CODEX_CLI_WEB_SEARCH_PREF
} from '../common/ai-providers-preferences';
import {
    CodexProviderApprovalResponseMessage,
    CodexProviderBackendRequest,
    CodexProviderClient,
    CodexProviderLoginRequest,
    CodexProviderLoginResult,
    CodexProviderOptions,
    CodexProviderService,
    CodexProviderStatus,
    CodexProviderStreamMessage,
    CodexProviderThreadActionResult,
    CodexProviderUserInputResponseMessage
} from '../common/ai-providers-service';

export const CYBERVINCI_AI_PROVIDERS_OUTPUT_CHANNEL = 'CyberVinci AI Providers';

@injectable()
export class CodexProviderClientImpl implements CodexProviderClient {
    protected tokenHandlers = new Map<string, (token?: CodexProviderStreamMessage) => void>();
    protected errorHandlers = new Map<string, (error: Error) => void>();

    sendToken(streamId: string, token?: CodexProviderStreamMessage): void {
        this.tokenHandlers.get(streamId)?.(token);
    }

    sendError(streamId: string, error: Error): void {
        this.errorHandlers.get(streamId)?.(error);
    }

    registerTokenHandler(streamId: string, handler: (token?: CodexProviderStreamMessage) => void): void {
        this.tokenHandlers.set(streamId, handler);
    }

    registerErrorHandler(streamId: string, handler: (error: Error) => void): void {
        this.errorHandlers.set(streamId, handler);
    }

    unregisterHandlers(streamId: string): void {
        this.tokenHandlers.delete(streamId);
        this.errorHandlers.delete(streamId);
    }
}

interface StreamState {
    id: string;
    tokens: (CodexProviderStreamMessage | undefined)[];
    isComplete: boolean;
    hasError: boolean;
    receivedToken: boolean;
    error?: Error;
    pendingResolve?: () => void;
    pendingReject?: (error: Error) => void;
}

@injectable()
export class CodexProviderFrontendService {

    @inject(CodexProviderService)
    protected readonly backendService: CodexProviderService;

    @inject(CodexProviderClientImpl)
    protected readonly client: CodexProviderClientImpl;

    @inject(PreferenceService)
    protected readonly preferenceService: PreferenceService;

    @inject(WorkspaceService)
    protected readonly workspaceService: WorkspaceService;

    @inject(OutputChannelManager)
    protected readonly outputChannelManager: OutputChannelManager;

    protected streams = new Map<string, StreamState>();

    async send(request: CodexProviderBackendRequest, cancellationToken?: CancellationToken): Promise<AsyncIterable<CodexProviderStreamMessage>> {
        const streamState: StreamState = {
            id: generateUuid(),
            tokens: [],
            isComplete: false,
            hasError: false,
            receivedToken: false
        };
        this.streams.set(streamState.id, streamState);
        this.setupStreamHandlers(streamState);

        cancellationToken?.onCancellationRequested(() => {
            if (streamState.isComplete || streamState.hasError) {
                return;
            }
            if (streamState.receivedToken) {
                this.getOutputChannel()?.appendLine(nls.localize(
                    'theia/ai-providers/frontend/ignoreLateCancellation',
                    'Ignoring late CyberVinci AI Providers cancellation after stream activity.'
                ));
                return;
            }
            this.backendService.cancel(streamState.id);
            const error = new Error(nls.localizeByDefault('Canceled'));
            streamState.hasError = true;
            streamState.error = error;
            streamState.pendingReject?.(error);
            streamState.pendingReject = undefined;
        });

        const backendRequest: CodexProviderBackendRequest = {
            prompt: request.prompt,
            sessionId: request.sessionId,
            runtime: request.runtime ?? this.getRuntime(),
            executablePath: request.executablePath ?? this.preferenceService.get<string>(CODEX_CLI_EXECUTABLE_PATH_PREF, undefined),
            profile: request.profile ?? this.preferenceService.get<string>(CODEX_CLI_PROFILE_PREF, undefined),
            modelProvider: request.modelProvider ?? this.getModelProvider(),
            openRouterApiKey: request.openRouterApiKey ?? this.preferenceService.get<string>(CODEX_CLI_OPENROUTER_API_KEY_PREF, undefined),
            openCodeApiKey: request.openCodeApiKey ?? this.preferenceService.get<string>(CODEX_CLI_OPENCODE_API_KEY_PREF, undefined),
            openCodeExecutablePath: request.openCodeExecutablePath ?? this.preferenceService.get<string>(CODEX_CLI_OPENCODE_EXECUTABLE_PATH_PREF, undefined),
            openCodeAgent: request.openCodeAgent ?? this.preferenceService.get<string>(CODEX_CLI_OPENCODE_AGENT_PREF, undefined),
            openCodeVariant: request.openCodeVariant ?? this.preferenceService.get<string>(CODEX_CLI_OPENCODE_VARIANT_PREF, undefined),
            geminiExecutablePath: request.geminiExecutablePath ?? this.preferenceService.get<string>(CODEX_CLI_GEMINI_EXECUTABLE_PATH_PREF, undefined),
            claudeExecutablePath: request.claudeExecutablePath ?? this.preferenceService.get<string>(CODEX_CLI_CLAUDE_EXECUTABLE_PATH_PREF, undefined),
            claudeAgent: request.claudeAgent ?? this.preferenceService.get<string>(CODEX_CLI_CLAUDE_AGENT_PREF, undefined),
            cursorExecutablePath: request.cursorExecutablePath ?? this.preferenceService.get<string>(CODEX_CLI_CURSOR_EXECUTABLE_PATH_PREF, undefined),
            cursorMode: request.cursorMode ?? this.preferenceService.get<string>(CODEX_CLI_CURSOR_MODE_PREF, undefined),
            options: {
                cwd: await this.getWorkspaceRoot(),
                model: this.preferenceService.get<string>(CODEX_CLI_MODEL_PREF, undefined) as CodexProviderOptions['model'],
                approvalPolicy: this.preferenceService.get<string>(CODEX_CLI_APPROVAL_POLICY_PREF, 'on-request') as CodexProviderOptions['approvalPolicy'],
                sandboxMode: this.preferenceService.get<string>(CODEX_CLI_SANDBOX_MODE_PREF, 'read-only') as CodexProviderOptions['sandboxMode'],
                reasoningEffort: this.preferenceService.get<string>(CODEX_CLI_REASONING_EFFORT_PREF, undefined) as CodexProviderOptions['reasoningEffort'],
                verbosity: this.preferenceService.get<string>(CODEX_CLI_VERBOSITY_PREF, undefined) as CodexProviderOptions['verbosity'],
                serviceTier: this.preferenceService.get<string>(CODEX_CLI_SERVICE_TIER_PREF, undefined) as CodexProviderOptions['serviceTier'],
                webSearch: this.preferenceService.get<string>(CODEX_CLI_WEB_SEARCH_PREF, 'disabled') as CodexProviderOptions['webSearch'],
                webSearchContextSize: this.preferenceService.get<string>(CODEX_CLI_WEB_SEARCH_CONTEXT_SIZE_PREF, 'medium') as CodexProviderOptions['webSearchContextSize'],
                ...request.options
            }
        };

        this.getOutputChannel()?.appendLine(JSON.stringify(this.sanitizeBackendRequestForLog({ ...backendRequest, prompt: request.prompt }), undefined, 2));
        await this.backendService.send(backendRequest, streamState.id);
        return this.createAsyncIterable(streamState);
    }

    async login(): Promise<CodexProviderLoginResult> {
        const request: CodexProviderLoginRequest = {
            runtime: this.getRuntime(),
            executablePath: this.preferenceService.get<string>(CODEX_CLI_EXECUTABLE_PATH_PREF, undefined),
            profile: this.preferenceService.get<string>(CODEX_CLI_PROFILE_PREF, undefined),
            cwd: await this.getWorkspaceRoot(),
            modelProvider: this.getModelProvider(),
            openRouterApiKey: this.preferenceService.get<string>(CODEX_CLI_OPENROUTER_API_KEY_PREF, undefined),
            openCodeApiKey: this.preferenceService.get<string>(CODEX_CLI_OPENCODE_API_KEY_PREF, undefined),
            openCodeExecutablePath: this.preferenceService.get<string>(CODEX_CLI_OPENCODE_EXECUTABLE_PATH_PREF, undefined),
            geminiExecutablePath: this.preferenceService.get<string>(CODEX_CLI_GEMINI_EXECUTABLE_PATH_PREF, undefined),
            claudeExecutablePath: this.preferenceService.get<string>(CODEX_CLI_CLAUDE_EXECUTABLE_PATH_PREF, undefined),
            cursorExecutablePath: this.preferenceService.get<string>(CODEX_CLI_CURSOR_EXECUTABLE_PATH_PREF, undefined)
        };
        return this.backendService.login(request);
    }

    async restart(): Promise<CodexProviderStatus> {
        const executablePath = this.preferenceService.get<string>(CODEX_CLI_EXECUTABLE_PATH_PREF, undefined);
        const profile = this.preferenceService.get<string>(CODEX_CLI_PROFILE_PREF, undefined);
        const cwd = await this.getWorkspaceRoot();
        const backendStatus = await this.backendService.restart({
            runtime: this.getRuntime(),
            executablePath,
            profile,
            cwd,
            model: this.preferenceService.get<string>(CODEX_CLI_MODEL_PREF, undefined),
            modelProvider: this.getModelProvider(),
            openRouterApiKey: this.preferenceService.get<string>(CODEX_CLI_OPENROUTER_API_KEY_PREF, undefined),
            openCodeApiKey: this.preferenceService.get<string>(CODEX_CLI_OPENCODE_API_KEY_PREF, undefined),
            openCodeExecutablePath: this.preferenceService.get<string>(CODEX_CLI_OPENCODE_EXECUTABLE_PATH_PREF, undefined),
            openCodeAgent: this.preferenceService.get<string>(CODEX_CLI_OPENCODE_AGENT_PREF, undefined),
            openCodeVariant: this.preferenceService.get<string>(CODEX_CLI_OPENCODE_VARIANT_PREF, undefined),
            geminiExecutablePath: this.preferenceService.get<string>(CODEX_CLI_GEMINI_EXECUTABLE_PATH_PREF, undefined),
            claudeExecutablePath: this.preferenceService.get<string>(CODEX_CLI_CLAUDE_EXECUTABLE_PATH_PREF, undefined),
            claudeAgent: this.preferenceService.get<string>(CODEX_CLI_CLAUDE_AGENT_PREF, undefined),
            cursorExecutablePath: this.preferenceService.get<string>(CODEX_CLI_CURSOR_EXECUTABLE_PATH_PREF, undefined),
            cursorMode: this.preferenceService.get<string>(CODEX_CLI_CURSOR_MODE_PREF, undefined)
        });
        return this.toStatus(backendStatus, executablePath, profile, cwd);
    }

    async compactThread(sessionId: string): Promise<CodexProviderThreadActionResult> {
        return this.backendService.compactThread({
            ...(await this.toThreadActionBaseRequest()),
            sessionId
        });
    }

    async resetThread(sessionId: string): Promise<CodexProviderThreadActionResult> {
        return this.backendService.resetThread({
            ...(await this.toThreadActionBaseRequest()),
            sessionId
        });
    }

    async setThread(sessionId: string, threadId: string): Promise<CodexProviderThreadActionResult> {
        return this.backendService.setThread({
            ...(await this.toThreadActionBaseRequest()),
            sessionId,
            threadId
        });
    }

    async getStatus(): Promise<CodexProviderStatus> {
        const executablePath = this.preferenceService.get<string>(CODEX_CLI_EXECUTABLE_PATH_PREF, undefined);
        const profile = this.preferenceService.get<string>(CODEX_CLI_PROFILE_PREF, undefined);
        const cwd = await this.getWorkspaceRoot();
        const backendStatus = await this.backendService.getStatus({
            runtime: this.getRuntime(),
            executablePath,
            profile,
            cwd,
            model: this.preferenceService.get<string>(CODEX_CLI_MODEL_PREF, undefined),
            modelProvider: this.getModelProvider(),
            openRouterApiKey: this.preferenceService.get<string>(CODEX_CLI_OPENROUTER_API_KEY_PREF, undefined),
            openCodeApiKey: this.preferenceService.get<string>(CODEX_CLI_OPENCODE_API_KEY_PREF, undefined),
            openCodeExecutablePath: this.preferenceService.get<string>(CODEX_CLI_OPENCODE_EXECUTABLE_PATH_PREF, undefined),
            openCodeAgent: this.preferenceService.get<string>(CODEX_CLI_OPENCODE_AGENT_PREF, undefined),
            openCodeVariant: this.preferenceService.get<string>(CODEX_CLI_OPENCODE_VARIANT_PREF, undefined),
            geminiExecutablePath: this.preferenceService.get<string>(CODEX_CLI_GEMINI_EXECUTABLE_PATH_PREF, undefined),
            claudeExecutablePath: this.preferenceService.get<string>(CODEX_CLI_CLAUDE_EXECUTABLE_PATH_PREF, undefined),
            claudeAgent: this.preferenceService.get<string>(CODEX_CLI_CLAUDE_AGENT_PREF, undefined),
            cursorExecutablePath: this.preferenceService.get<string>(CODEX_CLI_CURSOR_EXECUTABLE_PATH_PREF, undefined),
            cursorMode: this.preferenceService.get<string>(CODEX_CLI_CURSOR_MODE_PREF, undefined)
        });
        return this.toStatus(backendStatus, executablePath, profile, cwd);
    }

    protected toStatus(
        backendStatus: Awaited<ReturnType<CodexProviderService['getStatus']>>,
        executablePath: string | undefined,
        profile: string | undefined,
        cwd: string | undefined
    ): CodexProviderStatus {
        return {
            runtime: backendStatus.runtime ?? this.getRuntime(),
            modelProvider: backendStatus.modelProvider ?? this.getModelProvider(),
            executablePath: backendStatus.executablePath || executablePath || 'codex',
            profile,
            cwd,
            available: backendStatus.available,
            version: backendStatus.version,
            message: backendStatus.message,
            appServer: backendStatus.appServer,
            authenticated: backendStatus.authenticated,
            authStatus: backendStatus.authStatus,
            accountLabel: backendStatus.accountLabel,
            models: backendStatus.models,
            capabilities: backendStatus.capabilities,
            configurationRequired: backendStatus.configurationRequired,
            detectedProviders: backendStatus.detectedProviders,
            model: this.preferenceService.get<string>(CODEX_CLI_MODEL_PREF, undefined) as CodexProviderStatus['model'],
            approvalPolicy: this.preferenceService.get<string>(CODEX_CLI_APPROVAL_POLICY_PREF, 'on-request') as CodexProviderStatus['approvalPolicy'],
            sandboxMode: this.preferenceService.get<string>(CODEX_CLI_SANDBOX_MODE_PREF, 'read-only') as CodexProviderStatus['sandboxMode'],
            reasoningEffort: this.preferenceService.get<string>(CODEX_CLI_REASONING_EFFORT_PREF, undefined) as CodexProviderStatus['reasoningEffort'],
            verbosity: this.preferenceService.get<string>(CODEX_CLI_VERBOSITY_PREF, undefined) as CodexProviderStatus['verbosity'],
            serviceTier: this.preferenceService.get<string>(CODEX_CLI_SERVICE_TIER_PREF, undefined) as CodexProviderStatus['serviceTier'],
            webSearch: this.preferenceService.get<string>(CODEX_CLI_WEB_SEARCH_PREF, 'disabled') as CodexProviderStatus['webSearch'],
            webSearchContextSize: this.preferenceService.get<string>(CODEX_CLI_WEB_SEARCH_CONTEXT_SIZE_PREF, 'medium') as CodexProviderStatus['webSearchContextSize'],
            openCodeExecutablePath: this.preferenceService.get<string>(CODEX_CLI_OPENCODE_EXECUTABLE_PATH_PREF, undefined),
            openCodeAgent: this.preferenceService.get<string>(CODEX_CLI_OPENCODE_AGENT_PREF, undefined),
            openCodeVariant: this.preferenceService.get<string>(CODEX_CLI_OPENCODE_VARIANT_PREF, undefined),
            geminiExecutablePath: this.preferenceService.get<string>(CODEX_CLI_GEMINI_EXECUTABLE_PATH_PREF, undefined),
            claudeExecutablePath: this.preferenceService.get<string>(CODEX_CLI_CLAUDE_EXECUTABLE_PATH_PREF, undefined),
            claudeAgent: this.preferenceService.get<string>(CODEX_CLI_CLAUDE_AGENT_PREF, undefined),
            cursorExecutablePath: this.preferenceService.get<string>(CODEX_CLI_CURSOR_EXECUTABLE_PATH_PREF, undefined),
            cursorMode: this.preferenceService.get<string>(CODEX_CLI_CURSOR_MODE_PREF, undefined)
        };
    }

    protected async toThreadActionBaseRequest(): Promise<{
        runtime?: CodexProviderStatus['runtime'],
        executablePath?: string,
        profile?: string,
        cwd?: string,
        model?: string,
        modelProvider?: string,
        openRouterApiKey?: string,
        openCodeApiKey?: string,
        openCodeExecutablePath?: string,
        openCodeAgent?: string,
        openCodeVariant?: string,
        geminiExecutablePath?: string,
        claudeExecutablePath?: string,
        claudeAgent?: string,
        cursorExecutablePath?: string,
        cursorMode?: string
    }> {
        return {
            runtime: this.getRuntime(),
            executablePath: this.preferenceService.get<string>(CODEX_CLI_EXECUTABLE_PATH_PREF, undefined),
            profile: this.preferenceService.get<string>(CODEX_CLI_PROFILE_PREF, undefined),
            cwd: await this.getWorkspaceRoot(),
            model: this.preferenceService.get<string>(CODEX_CLI_MODEL_PREF, undefined),
            modelProvider: this.getModelProvider(),
            openRouterApiKey: this.preferenceService.get<string>(CODEX_CLI_OPENROUTER_API_KEY_PREF, undefined),
            openCodeApiKey: this.preferenceService.get<string>(CODEX_CLI_OPENCODE_API_KEY_PREF, undefined),
            openCodeExecutablePath: this.preferenceService.get<string>(CODEX_CLI_OPENCODE_EXECUTABLE_PATH_PREF, undefined),
            openCodeAgent: this.preferenceService.get<string>(CODEX_CLI_OPENCODE_AGENT_PREF, undefined),
            openCodeVariant: this.preferenceService.get<string>(CODEX_CLI_OPENCODE_VARIANT_PREF, undefined),
            geminiExecutablePath: this.preferenceService.get<string>(CODEX_CLI_GEMINI_EXECUTABLE_PATH_PREF, undefined),
            claudeExecutablePath: this.preferenceService.get<string>(CODEX_CLI_CLAUDE_EXECUTABLE_PATH_PREF, undefined),
            claudeAgent: this.preferenceService.get<string>(CODEX_CLI_CLAUDE_AGENT_PREF, undefined),
            cursorExecutablePath: this.preferenceService.get<string>(CODEX_CLI_CURSOR_EXECUTABLE_PATH_PREF, undefined),
            cursorMode: this.preferenceService.get<string>(CODEX_CLI_CURSOR_MODE_PREF, undefined)
        };
    }

    protected getRuntime(): CodexProviderStatus['runtime'] {
        return this.preferenceService.get<CodexProviderStatus['runtime']>(CODEX_CLI_RUNTIME_PREF, 'codex-app-server');
    }

    protected getModelProvider(): string {
        return this.preferenceService.get<string>(CODEX_CLI_MODEL_PROVIDER_PREF, 'codex');
    }

    protected sanitizeBackendRequestForLog(request: CodexProviderBackendRequest): CodexProviderBackendRequest {
        return {
            ...request,
            openRouterApiKey: request.openRouterApiKey ? '********' : request.openRouterApiKey,
            openCodeApiKey: request.openCodeApiKey ? '********' : request.openCodeApiKey
        };
    }

    sendApprovalResponse(response: CodexProviderApprovalResponseMessage): void {
        this.backendService.handleApprovalResponse(response);
    }

    sendUserInputResponse(response: CodexProviderUserInputResponseMessage): void {
        this.backendService.handleUserInputResponse(response);
    }

    protected setupStreamHandlers(streamState: StreamState): void {
        this.client.registerTokenHandler(streamState.id, token => {
            if (token === undefined) {
                streamState.isComplete = true;
            } else {
                streamState.receivedToken = true;
                this.getOutputChannel()?.appendLine(JSON.stringify(token, undefined, 2));
                streamState.tokens.push(token);
            }
            streamState.pendingResolve?.();
            streamState.pendingResolve = undefined;
        });

        this.client.registerErrorHandler(streamState.id, error => {
            streamState.hasError = true;
            streamState.error = error;
            this.getOutputChannel()?.appendLine(String(error.message ?? error), OutputChannelSeverity.Error);
            streamState.pendingReject?.(error);
            streamState.pendingReject = undefined;
        });
    }

    protected async *createAsyncIterable(streamState: StreamState): AsyncIterable<CodexProviderStreamMessage> {
        let currentIndex = 0;
        while (true) {
            if (currentIndex < streamState.tokens.length) {
                const token = streamState.tokens[currentIndex++];
                if (token !== undefined) {
                    yield token;
                }
                continue;
            }
            if (streamState.isComplete) {
                break;
            }
            if (streamState.hasError && streamState.error) {
                this.cleanup(streamState.id);
                throw streamState.error;
            }
            await new Promise<void>((resolve, reject) => {
                streamState.pendingResolve = resolve;
                streamState.pendingReject = reject;
            });
        }
        this.cleanup(streamState.id);
    }

    protected cleanup(streamId: string): void {
        this.client.unregisterHandlers(streamId);
        this.streams.delete(streamId);
    }

    protected async getWorkspaceRoot(): Promise<string | undefined> {
        const roots = await this.workspaceService.roots;
        const root = roots[0];
        return root ? FileUri.fsPath(root.resource.toString()) : undefined;
    }

    protected getOutputChannel(): OutputChannel | undefined {
        return this.outputChannelManager.getChannel(CYBERVINCI_AI_PROVIDERS_OUTPUT_CHANNEL);
    }
}

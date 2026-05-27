// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { inject, injectable, LazyServiceIdentifier, optional, postConstruct } from '@theia/core/shared/inversify';
import { CommandService } from '@theia/core/lib/common/command';
import { ILogger } from '@theia/core/lib/common/logger';
import { RemoteConnectionProvider, ServiceConnectionProvider } from '@theia/core/lib/browser';
import { OpenerService, open } from '@theia/core/lib/browser/opener-service';
import URI from '@theia/core/lib/common/uri';
import {
    CodexHostBackendClient,
    CodexHostBackendService,
    CODEX_HOST_SERVICE_PATH
} from '../../common/codex-host-backend-service';
import { CodexHostMessage, CodexWebviewEnvelope, CODEX_WEBVIEW_CHANNEL, CODEX_WEBVIEW_STATIC_PATH } from '../../common/codex-host-protocol';
import { CODEX_VSCODE_RPC_PREFIX, isCodexFrontendRpcMethod } from '../../common/codex-host-protocol';
import { CodexExtensionCommands } from '../../common/codex-commands';
import { CodexWebviewMessageRouter, parseCodexFetchRequest } from './codex-webview-message-router';
import { CodexFrontendRpcService } from '../codex-frontend-rpc-service';
import { Endpoint } from '@theia/core/lib/browser/endpoint';
import { OutputChannelManager, OutputChannel } from '@theia/output/lib/browser/output-channel';
import type { CodexConversationEditorContribution } from '../codex-conversation-editor-contribution';
import { CodexWebviewSurface } from '../codex-webview-surface';
import { CodexElectronBridgeService } from '../../common/codex-electron-bridge-service';

@injectable()
export class CodexWebviewHostService implements CodexHostBackendClient {

    @inject(RemoteConnectionProvider)
    protected readonly connectionProvider: ServiceConnectionProvider;

    @inject(CommandService)
    protected readonly commands: CommandService;

    @inject(OpenerService)
    protected readonly openerService: OpenerService;

    @inject(ILogger)
    protected readonly logger: ILogger;

    @inject(OutputChannelManager)
    protected readonly outputChannelManager: OutputChannelManager;

    @inject(new LazyServiceIdentifier(() =>
        require('../codex-conversation-editor-contribution').CodexConversationEditorContribution as typeof import('../codex-conversation-editor-contribution').CodexConversationEditorContribution
    ))
    protected readonly conversationEditor: CodexConversationEditorContribution;

    @inject(CodexFrontendRpcService)
    protected readonly frontendRpc: CodexFrontendRpcService;

    @inject(CodexElectronBridgeService) @optional()
    protected readonly electronBridge: CodexElectronBridgeService | undefined;

    protected backendService: CodexHostBackendService;
    protected readonly router = new CodexWebviewMessageRouter();
    protected readonly surfaces = new Map<string, CodexWebviewSurface>();
    protected outputChannel: OutputChannel | undefined;

    @postConstruct()
    protected init(): void {
        this.backendService = this.connectionProvider.createProxy(CODEX_HOST_SERVICE_PATH, this);
        this.registerHandlers();
        window.addEventListener('message', this.onWindowMessage);
    }

    dispose(): void {
        window.removeEventListener('message', this.onWindowMessage);
        for (const surface of this.surfaces.values()) {
            surface.dispose();
        }
        this.surfaces.clear();
    }

    registerSurface(surface: CodexWebviewSurface): void {
        this.surfaces.set(surface.webviewId, surface);
    }

    unregisterSurface(webviewId: string): void {
        this.surfaces.delete(webviewId);
    }

    buildShellUrl(webviewId: string, initialRoute?: string): string {
        const endpoint = new Endpoint({ path: CODEX_WEBVIEW_STATIC_PATH });
        const base = endpoint.getRestUrl().toString();
        const params = new URLSearchParams({ webviewId });
        if (initialRoute) {
            params.set('initialRoute', initialRoute);
        }
        return `${base}/shell?${params.toString()}`;
    }

    notifySharedObjectUpdated(key: string, value: unknown): void {
        this.broadcast({ type: 'shared-object-updated', key, value });
    }

    notifyFetchStreamEvent(requestId: string, event: unknown): void {
        this.broadcast({ type: 'fetch-stream-event', requestId, ...(event as object) });
    }

    notifyFetchStreamError(requestId: string, error: string): void {
        this.broadcast({ type: 'fetch-stream-error', requestId, error });
    }

    notifyFetchStreamComplete(requestId: string): void {
        this.broadcast({ type: 'fetch-stream-complete', requestId });
    }

    protected registerHandlers(): void {
        this.router.register('webview-ready', async webviewId => {
            this.logger.info(`[Codex] webview ready: ${webviewId}`);
        });
        this.router.register('fetch', async (webviewId, message) => {
            const request = parseCodexFetchRequest(message);
            if (!request) {
                return;
            }
            this.logger.info(`[Codex] webview fetch: ${request.method} ${request.url}`);
            if (request.url.startsWith(CODEX_VSCODE_RPC_PREFIX)) {
                const method = request.url.slice(CODEX_VSCODE_RPC_PREFIX.length).replace(/\/$/, '');
                if (isCodexFrontendRpcMethod(method)) {
                    const params = request.body ? JSON.parse(request.body) : undefined;
                    const result = await this.frontendRpc.invoke(
                        webviewId,
                        method,
                        params,
                        msg => this.postToWebview(webviewId, msg as CodexHostMessage)
                    );
                    this.postToWebview(webviewId, {
                        type: 'fetch-response',
                        requestId: request.requestId,
                        responseType: 'success',
                        status: 200,
                        bodyJsonString: JSON.stringify(result ?? null)
                    });
                    return;
                }
            }
            const response = await this.backendService.fetch(request);
            if (response.responseType === 'error') {
                this.logger.warn(`[Codex] webview fetch failed: ${request.url}: ${response.error ?? response.status ?? 'unknown error'}`);
            }
            this.postToWebview(webviewId, { type: 'fetch-response', ...response });
        });
        this.router.register('cancel-fetch', async (_webviewId, message) => {
            if (typeof message.requestId === 'string') {
                this.backendService.cancelFetch(message.requestId);
            }
        });
        this.router.register('fetch-stream', async (webviewId, message) => {
            const request = parseCodexFetchRequest(message);
            if (!request) {
                return;
            }
            await this.backendService.fetchStream(request, event => {
                this.postToWebview(webviewId, { type: 'fetch-stream-event', requestId: request.requestId, ...event as object });
            });
        });
        this.router.register('cancel-fetch-stream', async (_webviewId, message) => {
            if (typeof message.requestId === 'string') {
                this.backendService.cancelFetchStream(message.requestId);
            }
        });
        this.router.register('shared-object-subscribe', async (webviewId, message) => {
            const key = typeof message.key === 'string' ? message.key : undefined;
            if (key) {
                this.backendService.subscribeSharedObject(webviewId, key);
            }
        });
        this.router.register('shared-object-unsubscribe', async (webviewId, message) => {
            const key = typeof message.key === 'string' ? message.key : undefined;
            if (key) {
                this.backendService.unsubscribeSharedObject(webviewId, key);
            }
        });
        this.router.register('shared-object-set', async (webviewId, message) => {
            const key = typeof message.key === 'string' ? message.key : undefined;
            if (key) {
                this.backendService.setSharedObject(webviewId, key, message.value);
            }
        });
        this.router.register('open-vscode-command', async (_webviewId, message) => {
            const command = typeof message.command === 'string' ? message.command : undefined;
            if (command) {
                await this.commands.executeCommand(this.mapOfficialCommand(command), message);
            }
        });
        this.router.register('navigate-to-route', async (webviewId, message) => {
            const path = typeof message.path === 'string' ? message.path : '/';
            this.postToWebview(webviewId, { type: 'navigate-to-route', path, state: message.state });
        });
        this.router.register('navigate-in-new-editor-tab', async (_webviewId, message) => {
            const path = typeof message.path === 'string' ? message.path : '/';
            await this.conversationEditor.openConversationTab(path, message.state);
        });
        this.router.register('implement-todo', async (_webviewId, message) => {
            await this.commands.executeCommand(CodexExtensionCommands.IMPLEMENT_TODO.id, message);
        });
        this.router.register('log-message', async (_webviewId, message) => {
            const text = String(message.message ?? message.text ?? JSON.stringify(message));
            this.logger.warn(`[Codex] ${text}`);
            this.getOutputChannel().appendLine(text);
        });
        this.router.register('query-cache-invalidate', async () => undefined);
        this.router.register('worker-request', async (webviewId, message) => {
            const workerId = typeof message.workerId === 'string' ? message.workerId : '';
            const request = message.request as { id?: string | number; method?: string; params?: unknown } | undefined;
            if (!request || request.id === undefined || typeof request.method !== 'string') {
                return;
            }
            const response = await this.backendService.handleWorkerRequest(workerId, {
                id: request.id,
                method: request.method,
                params: request.params
            });
            this.postToWebview(webviewId, {
                type: 'worker-response',
                workerId,
                response
            });
        });
        this.router.register('worker-request-cancel', async (_webviewId, message) => {
            const workerId = typeof message.workerId === 'string' ? message.workerId : '';
            const requestId = message.id;
            if (workerId && (typeof requestId === 'string' || typeof requestId === 'number')) {
                this.backendService.cancelWorkerRequest(workerId, requestId);
            }
        });
        this.router.register('hotkey-window-dismiss', async () => {
            await this.dismissHotkeyWindow();
        });
    }

    protected mapOfficialCommand(command: string): string {
        const aliases: Record<string, string> = {
            'chatgpt.openSidebar': CodexExtensionCommands.OPEN_SIDEBAR.id,
            'chatgpt.newChat': CodexExtensionCommands.NEW_THREAD.id,
            'chatgpt.newCodexPanel': CodexExtensionCommands.NEW_CODEX_PANEL.id,
            'chatgpt.addToThread': CodexExtensionCommands.ADD_TO_THREAD.id,
            'chatgpt.addFileToThread': CodexExtensionCommands.ADD_FILE_TO_THREAD.id,
            'chatgpt.implementTodo': CodexExtensionCommands.IMPLEMENT_TODO.id,
            'chatgpt.openCommandMenu': CodexExtensionCommands.OPEN_COMMAND_MENU.id
        };
        return aliases[command] ?? command;
    }

    protected getOutputChannel(): OutputChannel {
        if (!this.outputChannel) {
            this.outputChannel = this.outputChannelManager.getChannel('Codex');
        }
        return this.outputChannel;
    }

    protected onWindowMessage = async (event: MessageEvent): Promise<void> => {
        const data = event.data as CodexWebviewEnvelope | undefined;
        if (!data || data.channel !== CODEX_WEBVIEW_CHANNEL || typeof data.webviewId !== 'string') {
            return;
        }
        await this.router.handleEnvelope(data);
    };

    protected postToWebview(webviewId: string, message: CodexHostMessage): void {
        this.surfaces.get(webviewId)?.postMessage(message);
    }

    protected broadcast(message: CodexHostMessage): void {
        for (const surface of this.surfaces.values()) {
            surface.postMessage(message);
        }
    }

    async openFileUri(uriString: string): Promise<void> {
        await open(this.openerService, new URI(uriString));
    }

    protected async dismissHotkeyWindow(): Promise<void> {
        await this.electronBridge?.dismissHotkeyWindow();
    }
}

// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { inject, injectable, LazyServiceIdentifier, optional, postConstruct } from '@theia/core/shared/inversify';
import { CommandService } from '@theia/core/lib/common/command';
import { ILogger } from '@theia/core/lib/common/logger';
import { RemoteConnectionProvider, ServiceConnectionProvider } from '@theia/core/lib/browser';
import { ThemeService } from '@theia/core/lib/browser/theming';
import { OpenerService, open } from '@theia/core/lib/browser/opener-service';
import URI from '@theia/core/lib/common/uri';
import { DisposableCollection } from '@theia/core/lib/common/disposable';
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

const CODEX_THEME_COLOR_VARIABLES: Record<string, readonly string[]> = {
    '--vscode-foreground': ['--theia-foreground'],
    '--vscode-descriptionForeground': ['--theia-descriptionForeground'],
    '--vscode-disabledForeground': ['--theia-disabledForeground', '--theia-descriptionForeground'],
    '--vscode-errorForeground': ['--theia-errorForeground'],
    '--vscode-focusBorder': ['--theia-focusBorder', '--theia-activityBar-activeBorder', '--theia-button-background'],
    '--vscode-icon-foreground': ['--theia-icon-foreground', '--theia-descriptionForeground'],
    '--vscode-editor-background': ['--theia-editor-background'],
    '--vscode-editor-foreground': ['--theia-editor-foreground', '--theia-foreground'],
    '--vscode-editorError-foreground': ['--theia-errorForeground'],
    '--vscode-editorWarning-foreground': ['--theia-editorWarning-foreground', '--theia-inputValidation-warningBorder'],
    '--vscode-editorInfo-foreground': ['--theia-editorInfo-foreground', '--theia-focusBorder'],
    '--vscode-sideBar-background': ['--theia-sideBar-background', '--theia-editor-background'],
    '--vscode-sideBar-foreground': ['--theia-sideBar-foreground', '--theia-foreground'],
    '--vscode-dropdown-background': ['--theia-dropdown-background', '--theia-menu-background', '--theia-editorWidget-background'],
    '--vscode-dropdown-foreground': ['--theia-dropdown-foreground', '--theia-menu-foreground', '--theia-foreground'],
    '--vscode-dropdown-border': ['--theia-dropdown-border', '--theia-menu-border', '--theia-editorWidget-border'],
    '--vscode-button-background': ['--theia-button-background', '--theia-focusBorder'],
    '--vscode-button-foreground': ['--theia-button-foreground'],
    '--vscode-button-hoverBackground': ['--theia-button-hoverBackground', '--theia-button-background'],
    '--vscode-button-secondaryBackground': ['--theia-button-secondaryBackground', '--theia-tab-inactiveBackground'],
    '--vscode-button-secondaryForeground': ['--theia-button-secondaryForeground', '--theia-foreground'],
    '--vscode-button-secondaryHoverBackground': ['--theia-button-secondaryHoverBackground', '--theia-list-hoverBackground'],
    '--vscode-button-border': ['--theia-button-border', '--theia-focusBorder', '--theia-editorWidget-border'],
    '--vscode-input-background': ['--theia-input-background', '--theia-editorWidget-background'],
    '--vscode-input-foreground': ['--theia-input-foreground', '--theia-foreground'],
    '--vscode-input-border': ['--theia-input-border', '--theia-editorWidget-border'],
    '--vscode-input-placeholderForeground': ['--theia-input-placeholderForeground', '--theia-disabledForeground'],
    '--vscode-textLink-foreground': ['--theia-textLink-foreground', '--theia-focusBorder', '--theia-activityBar-activeBorder'],
    '--vscode-textLink-activeForeground': ['--theia-textLink-activeForeground', '--theia-textLink-foreground', '--theia-focusBorder'],
    '--vscode-textPreformat-foreground': ['--theia-textPreformat-foreground', '--theia-foreground'],
    '--vscode-textPreformat-background': ['--theia-textPreformat-background', '--theia-editorWidget-background'],
    '--vscode-textCodeBlock-background': ['--theia-textCodeBlock-background', '--theia-editorWidget-background'],
    '--vscode-badge-background': ['--theia-badge-background', '--theia-activityBarBadge-background', '--theia-focusBorder'],
    '--vscode-badge-foreground': ['--theia-badge-foreground', '--theia-activityBarBadge-foreground'],
    '--vscode-list-hoverBackground': ['--theia-list-hoverBackground'],
    '--vscode-list-hoverForeground': ['--theia-list-hoverForeground', '--theia-foreground'],
    '--vscode-list-activeSelectionBackground': ['--theia-list-activeSelectionBackground', '--theia-selection-background'],
    '--vscode-list-activeSelectionForeground': ['--theia-list-activeSelectionForeground', '--theia-foreground'],
    '--vscode-list-activeSelectionIconForeground': ['--theia-list-activeSelectionIconForeground', '--theia-focusBorder'],
    '--vscode-list-focusBackground': ['--theia-list-focusBackground', '--theia-list-hoverBackground'],
    '--vscode-list-focusForeground': ['--theia-list-focusForeground', '--theia-foreground'],
    '--vscode-list-focusOutline': ['--theia-list-focusOutline', '--theia-focusBorder'],
    '--vscode-list-highlightForeground': ['--theia-list-highlightForeground', '--theia-focusBorder'],
    '--vscode-scrollbarSlider-background': ['--theia-scrollbarSlider-background'],
    '--vscode-scrollbarSlider-hoverBackground': ['--theia-scrollbarSlider-hoverBackground'],
    '--vscode-scrollbarSlider-activeBackground': ['--theia-scrollbarSlider-activeBackground', '--theia-focusBorder'],
    '--vscode-panel-background': ['--theia-panel-background', '--theia-editorWidget-background'],
    '--vscode-panel-border': ['--theia-panel-border', '--theia-editorWidget-border'],
    '--vscode-editorWidget-background': ['--theia-editorWidget-background', '--theia-panel-background'],
    '--vscode-editorWidget-foreground': ['--theia-editorWidget-foreground', '--theia-foreground'],
    '--vscode-editorWidget-border': ['--theia-editorWidget-border', '--theia-panel-border'],
    '--vscode-editorHoverWidget-background': ['--theia-editorHoverWidget-background', '--theia-editorWidget-background'],
    '--vscode-editorHoverWidget-foreground': ['--theia-editorHoverWidget-foreground', '--theia-foreground'],
    '--vscode-editorHoverWidget-border': ['--theia-editorHoverWidget-border', '--theia-editorWidget-border'],
    '--vscode-editorGroupHeader-tabsBackground': ['--theia-editorGroupHeader-tabsBackground', '--theia-panel-background'],
    '--vscode-tab-activeBackground': ['--theia-tab-activeBackground', '--theia-editor-background'],
    '--vscode-tab-activeForeground': ['--theia-tab-activeForeground', '--theia-foreground'],
    '--vscode-tab-inactiveBackground': ['--theia-tab-inactiveBackground', '--theia-panel-background'],
    '--vscode-tab-inactiveForeground': ['--theia-tab-inactiveForeground', '--theia-descriptionForeground'],
    '--vscode-toolbar-hoverBackground': ['--theia-toolbar-hoverBackground', '--theia-list-hoverBackground'],
    '--vscode-inputValidation-infoBackground': ['--theia-inputValidation-infoBackground'],
    '--vscode-inputValidation-infoBorder': ['--theia-inputValidation-infoBorder', '--theia-focusBorder'],
    '--vscode-inputValidation-warningBackground': ['--theia-inputValidation-warningBackground'],
    '--vscode-inputValidation-warningBorder': ['--theia-inputValidation-warningBorder'],
    '--vscode-inputValidation-errorBackground': ['--theia-inputValidation-errorBackground'],
    '--vscode-inputValidation-errorBorder': ['--theia-inputValidation-errorBorder', '--theia-errorForeground'],
    '--vscode-progressBar-background': ['--theia-progressBar-background', '--theia-focusBorder'],
    '--vscode-activityBarBadge-background': ['--theia-activityBarBadge-background', '--theia-focusBorder'],
    '--vscode-activityBarBadge-foreground': ['--theia-activityBarBadge-foreground'],
    '--token-foreground': ['--theia-foreground'],
    '--token-text-primary': ['--theia-foreground'],
    '--token-text-secondary': ['--theia-descriptionForeground'],
    '--token-text-tertiary': ['--theia-disabledForeground', '--theia-descriptionForeground'],
    '--token-description-foreground': ['--theia-descriptionForeground'],
    '--token-side-bar-background': ['--theia-sideBar-background', '--theia-editor-background'],
    '--token-dropdown-background': ['--theia-dropdown-background', '--theia-menu-background', '--theia-editorWidget-background'],
    '--token-main-surface-primary': ['--theia-editor-background'],
    '--token-main-surface-secondary': ['--theia-panel-background', '--theia-editorWidget-background'],
    '--token-main-surface-tertiary': ['--theia-tab-inactiveBackground', '--theia-panel-background'],
    '--token-border': ['--theia-editorWidget-border', '--theia-panel-border'],
    '--token-border-default': ['--theia-editorWidget-border', '--theia-panel-border'],
    '--token-border-light': ['--theia-panel-border', '--theia-editorWidget-border'],
    '--token-border-medium': ['--theia-panel-border', '--theia-editorWidget-border'],
    '--token-button-secondary-hover-background': ['--theia-button-secondaryHoverBackground', '--theia-list-hoverBackground'],
    '--color-text-foreground': ['--theia-foreground'],
    '--color-text-foreground-secondary': ['--theia-descriptionForeground'],
    '--color-text-foreground-tertiary': ['--theia-disabledForeground', '--theia-descriptionForeground'],
    '--color-text-error': ['--theia-errorForeground'],
    '--color-text-accent': ['--theia-textLink-foreground', '--theia-focusBorder', '--theia-activityBar-activeBorder'],
    '--color-icon-primary': ['--theia-icon-foreground', '--theia-descriptionForeground'],
    '--color-border-focus': ['--theia-focusBorder'],
    '--color-border': ['--theia-editorWidget-border', '--theia-panel-border'],
    '--color-border-light': ['--theia-panel-border', '--theia-editorWidget-border'],
    '--color-border-heavy': ['--theia-panel-border', '--theia-editorWidget-border'],
    '--color-background-surface': ['--theia-editor-background'],
    '--color-background-surface-under': ['--theia-sideBar-background', '--theia-editor-background'],
    '--color-background-editor-opaque': ['--theia-editor-background'],
    '--color-background-elevated-primary': ['--theia-editorWidget-background', '--theia-panel-background'],
    '--color-background-elevated-primary-opaque': ['--theia-editorWidget-background', '--theia-panel-background'],
    '--color-background-elevated-secondary': ['--theia-panel-background', '--theia-editorWidget-background'],
    '--color-background-status-error': ['--theia-inputValidation-errorBackground'],
    '--color-background-status-warning': ['--theia-inputValidation-warningBackground'],
    '--color-background-status-success': ['--theia-inputValidation-infoBackground', '--theia-terminal-ansiGreen'],
    '--color-accent-red': ['--theia-errorForeground'],
    '--color-accent-yellow': ['--theia-terminal-ansiYellow', '--theia-inputValidation-warningBorder'],
    '--color-accent-green': ['--theia-terminal-ansiGreen'],
    '--color-accent-blue': ['--theia-focusBorder', '--theia-terminal-ansiBlue'],
    '--color-accent-purple': ['--theia-terminal-ansiMagenta', '--theia-textLink-foreground', '--theia-focusBorder'],
    '--color-decoration-added': ['--theia-gitDecoration-addedResourceForeground', '--theia-terminal-ansiGreen'],
    '--color-decoration-modified': ['--theia-gitDecoration-modifiedResourceForeground', '--theia-focusBorder'],
    '--color-decoration-deleted': ['--theia-gitDecoration-deletedResourceForeground', '--theia-errorForeground'],
    '--codex-titlebar-tint': ['--theia-titleBar-activeBackground', '--theia-editorGroupHeader-tabsBackground']
};

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

    @inject(ThemeService)
    protected readonly themeService: ThemeService;

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
    protected readonly toDispose = new DisposableCollection();
    protected outputChannel: OutputChannel | undefined;
    protected themeBroadcastHandle: number | undefined;

    @postConstruct()
    protected init(): void {
        this.backendService = this.connectionProvider.createProxy(CODEX_HOST_SERVICE_PATH, this);
        this.registerHandlers();
        window.addEventListener('message', this.onWindowMessage);
        this.themeService.initialized.then(() => this.scheduleThemeBroadcast());
        this.toDispose.push(this.themeService.onDidColorThemeChange(() => this.scheduleThemeBroadcast()));
    }

    dispose(): void {
        window.removeEventListener('message', this.onWindowMessage);
        this.toDispose.dispose();
        if (this.themeBroadcastHandle !== undefined) {
            window.clearTimeout(this.themeBroadcastHandle);
            this.themeBroadcastHandle = undefined;
        }
        for (const surface of this.surfaces.values()) {
            surface.dispose();
        }
        this.surfaces.clear();
    }

    registerSurface(surface: CodexWebviewSurface): void {
        this.surfaces.set(surface.webviewId, surface);
        this.scheduleThemeBroadcast();
    }

    unregisterSurface(webviewId: string): void {
        this.surfaces.delete(webviewId);
    }

    buildShellUrl(webviewId: string, initialRoute?: string, viewKind: 'sidebar' | 'editor' | 'hotkey' = 'sidebar'): string {
        const endpoint = new Endpoint({ path: CODEX_WEBVIEW_STATIC_PATH });
        const base = endpoint.getRestUrl().toString();
        const params = new URLSearchParams({ webviewId, viewKind });
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

    notifyMcpNotification(hostId: string, method: string, params: unknown): void {
        this.broadcast({ type: 'mcp-notification', hostId, method, params });
    }

    protected registerHandlers(): void {
        this.router.register('webview-ready', async webviewId => {
            this.logger.info(`[Codex] webview ready: ${webviewId}`);
            this.postThemeToWebview(webviewId);
        });
        this.router.register('ready', async webviewId => {
            this.logger.info(`[Codex] official webview app ready: ${webviewId}`);
            this.postThemeToWebview(webviewId);
        });
        this.router.register('view-focused', async () => undefined);
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
        this.router.register('open-in-browser', async (_webviewId, message) => {
            const url = typeof message.url === 'string' ? message.url : undefined;
            if (url) {
                await open(this.openerService, new URI(url));
            }
        });
        this.router.register('show-settings', async (_webviewId, message) => {
            await this.openSettingsRoute(message, '/settings');
        });
        this.router.register('open-keyboard-shortcuts', async () => {
            await this.commands.executeCommand('keymaps:open');
        });
        this.router.register('open-config-toml', async (webviewId, message) => {
            const path = typeof message.path === 'string' ? message.path : undefined;
            if (path) {
                await this.openFileUri(path);
                return;
            }
            await this.openSettingsRoute(message, '/settings/agent');
        });
        this.router.register('show-diff', async (_webviewId, message) => {
            const unifiedDiff = typeof message.unifiedDiff === 'string' ? message.unifiedDiff : undefined;
            if (unifiedDiff) {
                this.appendOutputSection('Diff', unifiedDiff, message.conversationId);
            }
        });
        this.router.register('update-diff-if-open', async (_webviewId, message) => {
            const unifiedDiff = typeof message.unifiedDiff === 'string' ? message.unifiedDiff : undefined;
            if (unifiedDiff) {
                this.appendOutputSection('Updated diff', unifiedDiff, message.conversationId);
            }
        });
        this.router.register('show-plan-summary', async (_webviewId, message) => {
            const planContent = typeof message.planContent === 'string' ? message.planContent : undefined;
            if (planContent) {
                this.appendOutputSection('Plan summary', planContent, message.conversationId);
            }
        });
        this.router.register('navigate-to-route', async (webviewId, message) => {
            const path = typeof message.path === 'string' ? message.path : '/';
            if (this.isSettingsRoute(path) && !this.isSurfaceOnSettingsRoute(webviewId)) {
                await this.openSettingsRoute(message, path);
                return;
            }
            if (path === '/' && this.isSurfaceOnSettingsRoute(webviewId) && this.setSurfaceRoute(webviewId, path, message.state)) {
                return;
            }
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
        this.router.register('tray-menu-threads-changed', async () => undefined);
        this.router.register('persisted-atom-sync-request', async webviewId => {
            const state = await this.backendService.invokeRpc(webviewId, 'get-global-state', undefined);
            this.postToWebview(webviewId, {
                type: 'persisted-atom-sync',
                state: this.isRecord(state) ? state : {}
            });
        });
        this.router.register('persisted-atom-update', async (webviewId, message) => {
            const key = typeof message.key === 'string' ? message.key : undefined;
            if (!key) {
                return;
            }
            const deleted = message.deleted === true;
            const value = deleted ? undefined : message.value;
            await this.backendService.invokeRpc(webviewId, 'set-global-state', { key, value });
            this.broadcast({ type: 'persisted-atom-updated', key, value, deleted });
        });
        this.router.register('mcp-request', async (webviewId, message) => {
            await this.handleMcpRequest(webviewId, message);
        });
        this.router.register('thread-prewarm-start', async (webviewId, message) => {
            await this.handleMcpRequest(webviewId, message);
        });
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

    protected navigateWebviewToRoute(webviewId: string, message: CodexHostMessage, fallbackPath: string): void {
        const path = typeof message.path === 'string'
            ? message.path
            : typeof message.route === 'string'
                ? message.route
                : fallbackPath;
        this.postToWebview(webviewId, { type: 'navigate-to-route', path, state: message.state });
    }

    protected async openSettingsRoute(message: CodexHostMessage, fallbackPath: string): Promise<void> {
        const path = typeof message.path === 'string'
            ? message.path
            : typeof message.route === 'string'
                ? message.route
                : typeof message.section === 'string' && message.section.trim().length > 0
                    ? `/settings/${message.section.replace(/^\/+/, '')}`
                    : fallbackPath;
        await this.conversationEditor.openSettingsTab(path, message.state);
    }

    protected isSettingsRoute(path: string): boolean {
        return path === '/settings' || path.startsWith('/settings/');
    }

    protected isSurfaceOnSettingsRoute(webviewId: string): boolean {
        const route = this.surfaces.get(webviewId)?.getRoute?.();
        return typeof route === 'string' && this.isSettingsRoute(route);
    }

    protected setSurfaceRoute(webviewId: string, path: string, state?: unknown): boolean {
        const surface = this.surfaces.get(webviewId);
        if (!surface?.setRoute) {
            return false;
        }
        surface.setRoute(path, state);
        return true;
    }

    protected appendOutputSection(title: string, content: string, conversationId: unknown): void {
        const channel = this.getOutputChannel();
        const suffix = typeof conversationId === 'string' && conversationId ? ` (${conversationId})` : '';
        channel.appendLine(``);
        channel.appendLine(`[Codex] ${title}${suffix}`);
        channel.appendLine(content);
        channel.show({ preserveFocus: true });
    }

    protected async handleMcpRequest(webviewId: string, message: CodexHostMessage): Promise<void> {
        const request = message.request as { id?: string | number; method?: string; params?: unknown } | undefined;
        const requestId = request?.id;
        const method = request?.method;
        const params = request?.params;
        const hostId = typeof message.hostId === 'string' ? message.hostId : 'local';
        if ((typeof requestId !== 'string' && typeof requestId !== 'number') || typeof method !== 'string') {
            return;
        }
        const id = String(requestId);
        this.logger.info(`[Codex] mcp request: ${method}`);
        try {
            const response = await this.backendService.invokeRpc(webviewId, 'ipc-request', {
                requestId: id,
                method,
                params
            });
            if (this.isRecord(response) && response.resultType === 'error') {
                throw new Error(String(response.error ?? `Codex request failed: ${method}`));
            }
            const result = this.normalizeMcpResult(
                method,
                this.isRecord(response) && 'result' in response ? response.result : response
            );
            if (method === 'account/login/start') {
                this.logger.info(`[Codex] mcp response: ${method} -> ${this.describeMcpResult(result)}`);
            }
            const responseMessage = { id, result: result ?? { ok: true } };
            this.postToWebview(webviewId, {
                type: 'mcp-response',
                hostId,
                message: responseMessage,
                response: responseMessage
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (method === 'account/login/start') {
                this.logger.warn(`[Codex] mcp response: ${method} failed: ${errorMessage}`);
            }
            const responseMessage = { id, error: errorMessage };
            this.postToWebview(webviewId, {
                type: 'mcp-response',
                hostId,
                message: responseMessage,
                response: responseMessage
            });
        }
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

    protected scheduleThemeBroadcast(): void {
        if (this.themeBroadcastHandle !== undefined) {
            window.clearTimeout(this.themeBroadcastHandle);
        }
        this.themeBroadcastHandle = window.setTimeout(() => {
            this.themeBroadcastHandle = undefined;
            this.broadcastTheme();
        }, 0);
    }

    protected broadcastTheme(): void {
        this.broadcast(this.createThemeUpdatedMessage());
    }

    protected postThemeToWebview(webviewId: string): void {
        this.postToWebview(webviewId, this.createThemeUpdatedMessage());
    }

    protected createThemeUpdatedMessage(): CodexHostMessage {
        const theme = this.themeService.getCurrentTheme();
        return {
            type: 'theme-updated',
            theme: {
                id: theme.id,
                type: theme.type,
                variant: theme.type === 'light' ? 'light' : 'dark',
                colors: this.readCurrentThemeColors()
            }
        };
    }

    protected readCurrentThemeColors(): Record<string, string> {
        const colors: Record<string, string> = {};
        for (const [targetVariable, sourceVariables] of Object.entries(CODEX_THEME_COLOR_VARIABLES)) {
            const value = this.readCssVariable(sourceVariables);
            if (value) {
                colors[targetVariable] = value;
            }
        }
        return colors;
    }

    protected readCssVariable(sourceVariables: readonly string[]): string | undefined {
        const styles = [
            getComputedStyle(document.documentElement),
            document.body ? getComputedStyle(document.body) : undefined
        ].filter((style): style is CSSStyleDeclaration => !!style);
        for (const sourceVariable of sourceVariables) {
            for (const style of styles) {
                const value = style.getPropertyValue(sourceVariable).trim();
                if (value) {
                    return value;
                }
            }
        }
        return undefined;
    }

    protected isRecord(value: unknown): value is Record<string, unknown> {
        return !!value && typeof value === 'object' && !Array.isArray(value);
    }

    protected normalizeMcpResult(method: string, value: unknown): unknown {
        const result = this.unwrapMcpResult(value);
        switch (method) {
            case 'account/login/start':
                return this.normalizeLoginStartMcpResult(result);
            case 'conversation/list':
            case 'thread/list': {
                const record = this.asRecord(result);
                const data = this.extractArray(result)
                    ?? this.extractArray(record.data)
                    ?? this.extractArray(record.threads)
                    ?? this.extractArray(record.conversations)
                    ?? [];
                return {
                    ...record,
                    data,
                    conversations: this.extractArray(record.conversations) ?? data,
                    threads: this.extractArray(record.threads) ?? data,
                    nextCursor: this.extractCursor(record)
                };
            }
            case 'notification/list': {
                const record = this.asRecord(result);
                const data = this.extractArray(result)
                    ?? this.extractArray(record.data)
                    ?? this.extractArray(record.notifications)
                    ?? [];
                return {
                    ...record,
                    data,
                    notifications: this.extractArray(record.notifications) ?? data,
                    nextCursor: this.extractCursor(record)
                };
            }
            case 'model/list': {
                const record = this.asRecord(result);
                const data = this.extractArray(result)
                    ?? this.extractArray(record.data)
                    ?? this.extractArray(record.models)
                    ?? [];
                return {
                    ...record,
                    data,
                    models: this.extractArray(record.models) ?? data
                };
            }
            case 'mcpServerStatus/list':
            case 'app/list':
            case 'plugin/list':
            case 'skills/list':
            case 'externalAgentConfig/list':
            case 'experimentalFeature/list': {
                const record = this.asRecord(result);
                return {
                    ...record,
                    data: this.extractArray(result) ?? this.extractArray(record.data) ?? [],
                    nextCursor: this.extractCursor(record)
                };
            }
            default:
                return result;
        }
    }

    protected normalizeLoginStartMcpResult(value: unknown): unknown {
        const result = this.unwrapNestedMcpResult(value);
        const record = this.asRecord(result);
        switch (record.type) {
            case 'apiKey':
            case 'chatgptAuthTokens':
                return record;
            case 'chatgpt':
                if (typeof record.loginId === 'string' && typeof record.authUrl === 'string') {
                    return record;
                }
                break;
            case 'chatgptDeviceCode':
                if (typeof record.loginId === 'string' &&
                    typeof record.verificationUrl === 'string' &&
                    typeof record.userCode === 'string') {
                    return record;
                }
                break;
        }
        if (typeof record.loginId === 'string' && typeof record.authUrl === 'string') {
            return { ...record, type: 'chatgpt' };
        }
        return result;
    }

    protected unwrapNestedMcpResult(value: unknown): unknown {
        let current = value;
        for (let index = 0; index < 4; index++) {
            const record = this.asRecord(current);
            if (!this.isRecord(current) || 'type' in record) {
                break;
            }
            if ('result' in record) {
                current = record.result;
                continue;
            }
            if ('message' in record) {
                current = record.message;
                continue;
            }
            if ('response' in record) {
                current = record.response;
                continue;
            }
            if ('params' in record) {
                current = record.params;
                continue;
            }
            break;
        }
        return current;
    }

    protected describeMcpResult(value: unknown): string {
        const record = this.asRecord(value);
        const type = typeof record.type === 'string' ? record.type : typeof value;
        const fields = Object.keys(record).filter(key => key !== 'authUrl' && key !== 'apiKey');
        return `${type} [${fields.join(', ')}]`;
    }

    protected unwrapMcpResult(value: unknown): unknown {
        if (!this.isRecord(value) || 'data' in value || 'threads' in value || 'conversations' in value) {
            return value;
        }
        return 'result' in value ? value.result : value;
    }

    protected asRecord(value: unknown): Record<string, unknown> {
        return this.isRecord(value) ? value : {};
    }

    protected extractArray(value: unknown): unknown[] | undefined {
        return Array.isArray(value) ? value : undefined;
    }

    protected extractCursor(record: Record<string, unknown>): string | null {
        if (typeof record.nextCursor === 'string') {
            return record.nextCursor;
        }
        if (typeof record.cursor === 'string') {
            return record.cursor;
        }
        return null;
    }

    async openFileUri(uriString: string): Promise<void> {
        await open(this.openerService, new URI(uriString));
    }

    protected async dismissHotkeyWindow(): Promise<void> {
        await this.electronBridge?.dismissHotkeyWindow();
    }
}

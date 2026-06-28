// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import { BaseWidget, Message, Navigatable, NavigatableWidgetOptions, PanelLayout } from '@theia/core/lib/browser';
import { generateUuid } from '@theia/core/lib/common/uuid';
import URI from '@theia/core/lib/common/uri';
import { CodexWebviewHostService } from './host/codex-webview-host-service';
import { CodexWebviewSurface } from './codex-webview-surface';
import { CodexHostMessage } from '../common/codex-host-protocol';

@injectable()
export class CodexConversationEditorWidget extends BaseWidget implements CodexWebviewSurface, Navigatable {

    static readonly ID = 'codex-conversation-editor-widget';
    static readonly LABEL = 'Codex';

    @inject(CodexWebviewHostService)
    protected readonly hostService: CodexWebviewHostService;

    readonly webviewId: string;
    protected iframe: HTMLIFrameElement;
    protected route = '/';
    protected resourceUri: URI | undefined;

    constructor() {
        super();
        this.webviewId = generateUuid();
        this.id = CodexConversationEditorWidget.ID;
        this.title.label = CodexConversationEditorWidget.LABEL;
        this.title.closable = true;
        this.title.iconClass = 'cybervinci-product-icon cybervinci-product-icon-codex';
        this.addClass('codex-conversation-editor-widget');
        this.layout = new PanelLayout();
        this.iframe = document.createElement('iframe');
        this.iframe.className = 'codex-webview-iframe';
        this.iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-downloads');
        this.iframe.style.border = '0';
        this.iframe.style.width = '100%';
        this.iframe.style.height = '100%';
    }

    setRoute(path: string, _state?: unknown): void {
        this.route = path;
        if (this.isSettingsRoute(path)) {
            this.title.label = 'Codex Settings';
            this.title.caption = 'Codex Settings';
        } else {
            this.title.label = CodexConversationEditorWidget.LABEL;
            this.title.caption = CodexConversationEditorWidget.LABEL;
        }
        this.iframe.src = this.hostService.buildShellUrl(this.webviewId, path, 'editor');
    }

    getRoute(): string | undefined {
        return this.route;
    }

    setResourceUri(uri: URI): void {
        this.resourceUri = uri;
        if (!this.isSettingsRoute(this.route)) {
            this.title.label = uri.path.base || CodexConversationEditorWidget.LABEL;
        }
    }

    getResourceUri(): URI | undefined {
        return this.resourceUri;
    }

    createMoveToUri(resourceUri: URI): URI | undefined {
        return resourceUri.withScheme(resourceUri.scheme);
    }

    @postConstruct()
    protected init(): void {
        this.hostService.registerSurface(this);
        this.iframe.src = this.hostService.buildShellUrl(this.webviewId, this.route, 'editor');
        const wrapper = new BaseWidget();
        wrapper.addClass('codex-webview-iframe-wrapper');
        wrapper.node.appendChild(this.iframe);
        (this.layout as PanelLayout).addWidget(wrapper);
    }

    postMessage(message: CodexHostMessage): void {
        this.iframe.contentWindow?.postMessage(message, '*');
    }

    override dispose(): void {
        this.hostService.unregisterSurface(this.webviewId);
        super.dispose();
    }

    override onActivateRequest(msg: Message): void {
        super.onActivateRequest(msg);
        this.iframe.focus();
    }

    protected isSettingsRoute(path: string): boolean {
        return path === '/settings' || path.startsWith('/settings/');
    }
}

export function createCodexConversationEditorOptions(uri: URI, route?: string): NavigatableWidgetOptions {
    return {
        kind: 'navigatable',
        uri: uri.toString(),
        route
    } as NavigatableWidgetOptions & { route?: string };
}

// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import { BaseWidget, Message, PanelLayout } from '@theia/core/lib/browser';
import { generateUuid } from '@theia/core/lib/common/uuid';
import { CODEX_EXTENSION_WIDGET_ID } from '../../common/codex-commands';
import { CodexWebviewHostService } from '../host/codex-webview-host-service';
import { CodexWebviewSurface } from '../codex-webview-surface';
import { CodexHostMessage } from '../../common/codex-host-protocol';

@injectable()
export class CodexWebviewWidget extends BaseWidget implements CodexWebviewSurface {

    static readonly ID = CODEX_EXTENSION_WIDGET_ID;
    static readonly LABEL = 'Codex';

    @inject(CodexWebviewHostService)
    protected readonly hostService: CodexWebviewHostService;

    readonly webviewId: string;
    protected iframe: HTMLIFrameElement;
    protected initialRoute?: string;

    constructor() {
        super();
        this.webviewId = generateUuid();
        this.id = CodexWebviewWidget.ID;
        this.title.label = CodexWebviewWidget.LABEL;
        this.title.caption = CodexWebviewWidget.LABEL;
        this.title.closable = true;
        this.title.iconClass = 'cybervinci-product-icon cybervinci-product-icon-codex';
        this.addClass('codex-webview-widget');
        this.layout = new PanelLayout();
        this.iframe = document.createElement('iframe');
        this.iframe.className = 'codex-webview-iframe';
        this.iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-downloads');
        this.iframe.style.border = '0';
        this.iframe.style.width = '100%';
        this.iframe.style.height = '100%';
    }

    setInitialRoute(route: string | undefined): void {
        this.initialRoute = route;
    }

    @postConstruct()
    protected init(): void {
        this.hostService.registerSurface(this);
        this.iframe.src = this.hostService.buildShellUrl(this.webviewId, this.initialRoute);
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
}

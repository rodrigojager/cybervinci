// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { injectable } from '@theia/core/shared/inversify';
import { NavigatableWidgetOpenHandler, NavigatableWidgetOptions, WidgetOpenerOptions } from '@theia/core/lib/browser';
import URI from '@theia/core/lib/common/uri';
import { CodexConversationEditorWidget } from './codex-conversation-editor-widget';

export const OPENAI_CODEX_SCHEME = 'openai-codex';

export interface CodexConversationEditorOptions extends WidgetOpenerOptions {
    route?: string;
}

@injectable()
export class CodexConversationEditorContribution extends NavigatableWidgetOpenHandler<CodexConversationEditorWidget> {

    override readonly id = CodexConversationEditorWidget.ID;
    readonly label = CodexConversationEditorWidget.LABEL;

    canHandle(uri: URI): number {
        return uri.scheme === OPENAI_CODEX_SCHEME ? 500 : 0;
    }

    async openConversationTab(path: string, state?: unknown): Promise<CodexConversationEditorWidget> {
        const slug = encodeURIComponent(path.replace(/^\//, '') || 'conversation');
        const uri = new URI(`${OPENAI_CODEX_SCHEME}:/${slug}`);
        const widget = await this.open(uri, { mode: 'activate', route: path } as CodexConversationEditorOptions);
        widget.setResourceUri(uri);
        widget.setRoute(path, state);
        return widget;
    }

    async openSettingsTab(path = '/settings', state?: unknown): Promise<CodexConversationEditorWidget> {
        const route = path === '/settings' || path.startsWith('/settings/') ? path : '/settings';
        return this.openConversationTab(route, state);
    }

    protected override createWidgetOptions(uri: URI, options?: CodexConversationEditorOptions): NavigatableWidgetOptions {
        return {
            kind: 'navigatable',
            uri: uri.toString(),
            route: options?.route
        } as NavigatableWidgetOptions & { route?: string };
    }
}

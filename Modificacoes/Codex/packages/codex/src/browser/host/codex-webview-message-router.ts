// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import {
    CodexFetchRequest,
    CodexHostMessage,
    CodexWebviewEnvelope,
    CODEX_WEBVIEW_CHANNEL
} from '../../common/codex-host-protocol';

export type CodexHostMessageHandler = (webviewId: string, message: CodexHostMessage) => Promise<void> | void;

export class CodexWebviewMessageRouter {

    protected readonly handlers = new Map<string, CodexHostMessageHandler>();

    register(type: string, handler: CodexHostMessageHandler): void {
        this.handlers.set(type, handler);
    }

    async handleEnvelope(envelope: CodexWebviewEnvelope): Promise<CodexHostMessage[]> {
        if (envelope.channel !== CODEX_WEBVIEW_CHANNEL) {
            return [];
        }
        const message = envelope.message;
        const handler = this.handlers.get(message.type);
        if (!handler) {
            return [];
        }
        await handler(envelope.webviewId, message);
        return [];
    }
}

export function parseCodexFetchRequest(message: CodexHostMessage): CodexFetchRequest | undefined {
    if (typeof message.requestId !== 'string') {
        return undefined;
    }
    return {
        requestId: message.requestId,
        hostId: typeof message.hostId === 'string' ? message.hostId : undefined,
        method: typeof message.method === 'string' ? message.method : 'GET',
        url: typeof message.url === 'string' ? message.url : '',
        headers: message.headers as Record<string, string> | undefined,
        body: typeof message.body === 'string' ? message.body : undefined
    };
}

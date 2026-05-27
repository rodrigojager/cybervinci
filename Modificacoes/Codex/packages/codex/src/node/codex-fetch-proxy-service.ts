// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { inject, injectable } from '@theia/core/shared/inversify';
import { ILogger } from '@theia/core/lib/common/logger';
import { CodexFetchRequest, CodexFetchResponse } from '../common/codex-host-protocol';

const CODEX_USER_AGENT = 'codex_vscode';

@injectable()
export class CodexFetchProxyService {

    @inject(ILogger)
    protected readonly logger: ILogger;

    protected readonly abortControllers = new Map<string, AbortController>();
    protected readonly streamAbortControllers = new Map<string, AbortController>();

    async fetch(request: CodexFetchRequest): Promise<CodexFetchResponse> {
        return this.handleHttpFetch(request);
    }

    cancelFetch(requestId: string): void {
        this.abortControllers.get(requestId)?.abort();
        this.abortControllers.delete(requestId);
    }

    cancelFetchStream(requestId: string): void {
        this.streamAbortControllers.get(requestId)?.abort();
        this.streamAbortControllers.delete(requestId);
    }

    protected async handleHttpFetch(request: CodexFetchRequest): Promise<CodexFetchResponse> {
        const controller = new AbortController();
        this.abortControllers.set(request.requestId, controller);
        try {
            const headers: Record<string, string> = {
                'User-Agent': CODEX_USER_AGENT,
                ...(request.headers ?? {})
            };
            const response = await fetch(request.url, {
                method: request.method || 'GET',
                headers,
                body: request.body,
                signal: controller.signal
            });
            const bodyText = await response.text();
            const responseHeaders: Record<string, string> = {};
            response.headers.forEach((value, key) => {
                responseHeaders[key] = value;
            });
            return {
                requestId: request.requestId,
                responseType: response.ok ? 'success' : 'error',
                status: response.status,
                headers: responseHeaders,
                bodyJsonString: bodyText,
                error: response.ok ? undefined : bodyText
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return {
                requestId: request.requestId,
                responseType: 'error',
                error: message
            };
        } finally {
            this.abortControllers.delete(request.requestId);
        }
    }
}

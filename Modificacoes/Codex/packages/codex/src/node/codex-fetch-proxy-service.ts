// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { inject, injectable } from '@theia/core/shared/inversify';
import { ILogger } from '@theia/core/lib/common/logger';
import { CodexFetchRequest, CodexFetchResponse } from '../common/codex-host-protocol';

const CODEX_USER_AGENT = 'codex_vscode';
const CHATGPT_WEB_BASE_URL = 'https://chatgpt.com';

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
            const url = this.resolveFetchUrl(request.url);
            const syntheticResponse = this.tryBuildSyntheticResponse(request, url);
            if (syntheticResponse) {
                return syntheticResponse;
            }
            const headers: Record<string, string> = {
                'User-Agent': CODEX_USER_AGENT,
                ...(request.headers ?? {})
            };
            const response = await fetch(url, {
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

    protected tryBuildSyntheticResponse(request: CodexFetchRequest, resolvedUrl: string): CodexFetchResponse | undefined {
        const url = new URL(resolvedUrl);
        if (url.hostname === 'ab.chatgpt.com' && url.pathname.startsWith('/v1/')) {
            return this.statsigNoUpdatesResponse(request);
        }
        if (url.hostname !== 'chatgpt.com') {
            return undefined;
        }
        if (url.pathname.startsWith('/ces/')) {
            return this.statsigNoUpdatesResponse(request);
        }
        if (!url.pathname.startsWith('/wham/')) {
            return undefined;
        }
        if (url.pathname === '/wham/accounts/check') {
            return this.jsonResponse(request, { account_ordering: [], accounts: [] });
        }
        if (url.pathname === '/wham/tasks/list') {
            return this.jsonResponse(request, { items: [], cursor: null });
        }
        if (url.pathname === '/wham/usage') {
            return this.jsonResponse(request, null);
        }
        if (url.pathname === '/wham/environments') {
            return this.jsonResponse(request, []);
        }
        if (url.pathname === '/wham/onboarding/context' || url.pathname === '/wham/statsig/bootstrap') {
            return this.jsonResponse(request, {});
        }
        if (url.pathname.endsWith('/mark_read')) {
            return this.jsonResponse(request, { ok: true });
        }
        return this.jsonResponse(request, null);
    }

    protected jsonResponse(request: CodexFetchRequest, body: unknown): CodexFetchResponse {
        return {
            requestId: request.requestId,
            responseType: 'success',
            status: 200,
            headers: { 'content-type': 'application/json' },
            bodyJsonString: JSON.stringify(body)
        };
    }

    protected statsigNoUpdatesResponse(request: CodexFetchRequest): CodexFetchResponse {
        return this.jsonResponse(request, {
            has_updates: false,
            time: Date.now()
        });
    }

    protected resolveFetchUrl(url: string): string {
        try {
            return new URL(url).toString();
        } catch {
            return new URL(url, CHATGPT_WEB_BASE_URL).toString();
        }
    }
}

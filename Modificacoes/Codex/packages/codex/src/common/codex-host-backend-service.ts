// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { CodexFetchRequest, CodexFetchResponse, CODEX_HOST_SERVICE_PATH } from './codex-host-protocol';
import { CodexWorkerRequest, CodexWorkerResponseBody } from './codex-worker-protocol';

export { CODEX_HOST_SERVICE_PATH };

export const CodexHostBackendService = Symbol('CodexHostBackendService');

export interface CodexHostBackendService {
    invokeRpc(webviewId: string, method: string, params: unknown): Promise<unknown>;
    fetch(request: CodexFetchRequest): Promise<CodexFetchResponse>;
    cancelFetch(requestId: string): void;
    fetchStream(request: CodexFetchRequest, onEvent: (event: unknown) => void): Promise<void>;
    cancelFetchStream(requestId: string): void;
    subscribeSharedObject(webviewId: string, key: string): void;
    unsubscribeSharedObject(webviewId: string, key: string): void;
    setSharedObject(webviewId: string, key: string, value: unknown): void;
    getSharedObjectSnapshot(key: string): unknown;
    handleWorkerRequest(workerId: string, request: CodexWorkerRequest): Promise<CodexWorkerResponseBody>;
    cancelWorkerRequest(workerId: string, requestId: string | number): void;
}

export interface CodexHostBackendClient {
    notifySharedObjectUpdated(key: string, value: unknown): void;
    notifyFetchStreamEvent(requestId: string, event: unknown): void;
    notifyFetchStreamError(requestId: string, error: string): void;
    notifyFetchStreamComplete(requestId: string): void;
}

export const CodexHostBackendClient = Symbol('CodexHostBackendClient');

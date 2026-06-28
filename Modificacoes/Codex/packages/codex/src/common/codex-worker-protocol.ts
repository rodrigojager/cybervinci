// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

export interface CodexWorkerRequest {
    id: string | number;
    method: string;
    params?: unknown;
}

export type CodexWorkerResult =
    | { type: 'ok'; value: unknown }
    | { type: 'error'; error: { message: string } };

export interface CodexWorkerResponseBody {
    id: string | number;
    method: string;
    result: CodexWorkerResult;
}

export function codexWorkerOk(value: unknown): CodexWorkerResult {
    return { type: 'ok', value };
}

export function codexWorkerError(message: string): CodexWorkerResult {
    return { type: 'error', error: { message } };
}

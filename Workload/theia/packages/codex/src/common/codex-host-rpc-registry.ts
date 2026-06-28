// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { CODEX_HOST_EVENT_TYPES, CODEX_HOST_RPC_METHODS, CODEX_WEBVIEW_EVENT_TYPES } from './codex-host-protocol';

export interface CodexHostRpcRegistry {
    readonly rpcMethods: readonly string[];
    readonly hostEventTypes: readonly string[];
    readonly webviewEventTypes: readonly string[];
}

export const CODEX_HOST_RPC_REGISTRY: CodexHostRpcRegistry = {
    rpcMethods: CODEX_HOST_RPC_METHODS,
    hostEventTypes: CODEX_HOST_EVENT_TYPES,
    webviewEventTypes: CODEX_WEBVIEW_EVENT_TYPES
};

export function isCodexHostRpcMethod(method: string): boolean {
    return (CODEX_HOST_RPC_METHODS as readonly string[]).includes(method);
}

export function isCodexHostEventType(type: string): boolean {
    return (CODEX_HOST_EVENT_TYPES as readonly string[]).includes(type);
}

export { isCodexFrontendRpcMethod } from './codex-host-protocol';

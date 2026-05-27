// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import * as chai from 'chai';
import {
    CODEX_HOST_EVENT_TYPES,
    CODEX_HOST_RPC_METHODS,
    CODEX_WEBVIEW_CHANNEL,
    CODEX_WEBVIEW_EVENT_TYPES
} from '../codex-host-protocol';

const expect = chai.expect;

describe('codex-host-protocol', () => {
    it('defines stable IPC channel and event inventories', () => {
        expect(CODEX_WEBVIEW_CHANNEL).to.equal('codex-webview-ipc');
        expect(CODEX_HOST_EVENT_TYPES).to.include('fetch');
        expect(CODEX_HOST_EVENT_TYPES).to.include('shared-object-set');
        expect(CODEX_WEBVIEW_EVENT_TYPES).to.include('fetch-response');
        expect(CODEX_WEBVIEW_EVENT_TYPES).to.include('shared-object-updated');
    });

    it('lists official RPC methods used by webview v26.5513.21555', () => {
        expect(CODEX_HOST_RPC_METHODS).to.include('ping');
        expect(CODEX_HOST_RPC_METHODS).to.include('get-configuration');
        expect(CODEX_HOST_RPC_METHODS).to.include('pick-files');
        expect(CODEX_HOST_RPC_METHODS).to.include('git-origins');
        expect(CODEX_HOST_RPC_METHODS).to.include('paths-exist');
        expect(CODEX_HOST_RPC_METHODS).to.include('thread-follower-start-turn');
        expect(CODEX_HOST_RPC_METHODS).to.include('fork-conversation-from-latest');
    });
});

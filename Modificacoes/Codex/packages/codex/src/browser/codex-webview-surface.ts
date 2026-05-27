// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { CodexHostMessage } from '../common/codex-host-protocol';

export interface CodexWebviewSurface {
    readonly webviewId: string;
    postMessage(message: CodexHostMessage): void;
    dispose(): void;
}

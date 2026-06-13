// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { CancellationToken } from '@theia/core';
import {
    CodexProviderApprovalResponseMessage,
    CodexProviderLoginResult,
    CodexProviderRequest,
    CodexProviderStatus,
    CodexProviderStreamMessage,
    CodexProviderThreadActionResult,
    CodexProviderUserInputResponseMessage
} from '../common/ai-providers-service';

export const CodexProviderRuntimeProvider = Symbol('CodexProviderRuntimeProvider');

/**
 * Frontend-facing provider for CyberVinci AI runtime turns.
 *
 * This is intentionally lower level than a Theia ChatAgent. Product agents can
 * inject this provider and decide how to present approvals, file changes,
 * command output, and streamed assistant text in their own UX.
 */
export interface CodexProviderRuntimeProvider {
    send(request: CodexProviderRequest, cancellationToken?: CancellationToken): Promise<AsyncIterable<CodexProviderStreamMessage>>;
    login(): Promise<CodexProviderLoginResult>;
    restart(): Promise<CodexProviderStatus>;
    getStatus(): Promise<CodexProviderStatus>;
    compactThread(sessionId: string): Promise<CodexProviderThreadActionResult>;
    resetThread(sessionId: string): Promise<CodexProviderThreadActionResult>;
    setThread(sessionId: string, threadId: string): Promise<CodexProviderThreadActionResult>;
    sendApprovalResponse(response: CodexProviderApprovalResponseMessage): void;
    sendUserInputResponse(response: CodexProviderUserInputResponseMessage): void;
}

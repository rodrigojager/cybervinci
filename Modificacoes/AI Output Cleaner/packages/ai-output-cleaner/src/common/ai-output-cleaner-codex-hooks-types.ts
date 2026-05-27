// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

export type AIOutputCleanerCodexHooksReadiness = 'supported' | 'prepared' | 'configured' | 'unknown';

export interface AIOutputCleanerCodexHooksCapabilityStatus {
    readiness: AIOutputCleanerCodexHooksReadiness;
    available: boolean;
    supported: boolean;
    postToolUseCanReplaceToolResult: boolean;
    codexVersion?: string;
    executablePath?: string;
    binaryPath?: string;
    homePath: string;
    configPath: string;
    helpMentionsHookTrustBypass: boolean;
    binaryMentionsConfigRequirementsHooks: boolean;
    configSyntaxDocumentedInHelp: boolean;
    evidence: string[];
    checkedAt: string;
}

export interface AIOutputCleanerCodexHookArtifactsStatus {
    readiness: AIOutputCleanerCodexHooksReadiness;
    rootPath: string;
    helperScriptPath: string;
    readmePath: string;
    eventLogPath: string;
    runtimeStatePath: string;
    prepared: boolean;
    configured: boolean;
    runtimeEnabled: boolean;
    managedBlockInstalled: boolean;
    eventCount: number;
    installedEvents: string[];
    lastEventAt?: string;
    lastEventPreview?: string;
    errors: string[];
}

export interface AIOutputCleanerCodexHooksStatus {
    readiness: AIOutputCleanerCodexHooksReadiness;
    available: boolean;
    supported: boolean;
    configured: boolean;
    summary: string;
    capability: AIOutputCleanerCodexHooksCapabilityStatus;
    artifacts: AIOutputCleanerCodexHookArtifactsStatus;
}

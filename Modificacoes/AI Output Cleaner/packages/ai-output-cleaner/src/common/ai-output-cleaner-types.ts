// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { AIOutputCleanerCodexHooksStatus } from './ai-output-cleaner-codex-hooks-types';

export type AIOutputCleanerMode = 'off' | 'raw' | 'safe' | 'command-noise' | 'status-aware' | 'aggressive';

export type AIOutputCleanerOrigin = 'codex-provider-wrapper' | 'theia-tool' | 'provider-api' | 'manual-debug';

export interface AIOutputCleanerInput {
    origin: AIOutputCleanerOrigin;
    command?: string;
    args?: string[];
    prompt?: string;
    cwd?: string;
    exitCode?: number;
    stdout?: string;
    stderr?: string;
    startedAt?: string;
    completedAt?: string;
    durationMs?: number;
    status?: 'running' | 'completed' | 'failed';
}

export interface AIOutputCleanerServiceConfig {
    enabled?: boolean;
    mode?: AIOutputCleanerMode;
    showFilteringNotice?: boolean;
    wrapperCommands?: string[];
    literalBypassPatterns?: string[];
    statusIntentPatterns?: string[];
}

export interface AIOutputCleanerResult {
    stdout: string;
    stderr: string;
    exitCode?: number;
    changed: boolean;
    removedLineCount: number;
    filtersApplied: string[];
    notice?: string;
}

export interface ArtifactStoreInput {
    command: string;
    args?: string[];
    cwd?: string;
    origin?: AIOutputCleanerOrigin;
    provider?: string;
    sessionId?: string;
    exitCode?: number;
    startedAt?: string;
    completedAt?: string;
    durationMs?: number;
    filtersApplied?: string[];
    stdout: string;
    stderr: string;
}

export interface ArtifactMetadata {
    id: string;
    command: string;
    args: string[];
    cwd?: string;
    origin?: AIOutputCleanerOrigin;
    provider?: string;
    sessionId?: string;
    exitCode?: number;
    startedAt: string;
    completedAt: string;
    durationMs?: number;
    filtersApplied: string[];
}

export interface SavedArtifact extends ArtifactMetadata {
    path: string;
}

export interface AIOutputCleanerRawArtifact {
    artifact: SavedArtifact;
    stdout: string;
    stderr: string;
}

export interface AIOutputCleanerArtifactQuery {
    limit?: number;
    sessionId?: string;
    origin?: AIOutputCleanerOrigin;
}

export interface AIOutputCleanerSessionOverride {
    sessionId: string;
    bypassFiltering: boolean;
    updatedAt: string;
}

export interface AIOutputCleanerToolResultRecord {
    command: string;
    args?: string[];
    cwd?: string;
    origin: AIOutputCleanerOrigin;
    provider?: string;
    sessionId?: string;
    pid?: number;
    exitCode?: number;
    startedAt?: string;
    completedAt?: string;
    durationMs?: number;
    status?: 'running' | 'completed' | 'failed';
    rawStdout: string;
    rawStderr: string;
    cleanedStdout?: string;
    cleanedStderr?: string;
    changed?: boolean;
    filtersApplied?: string[];
    notice?: string;
}

export interface AIOutputCleanerProcessStatus {
    id: string;
    command: string;
    args: string[];
    cwd?: string;
    origin: AIOutputCleanerOrigin;
    provider?: string;
    sessionId?: string;
    pid?: number;
    startedAt: string;
    completedAt?: string;
    lastUpdatedAt: string;
    status: 'running' | 'completed' | 'failed';
    exitCode?: number;
    artifactId?: string;
    changed: boolean;
    filtersApplied: string[];
    notice?: string;
    lastStdoutPreview: string;
    lastStderrPreview: string;
    recentLines: string[];
    hasRecentOutput: boolean;
}

export interface AIOutputCleanerStatusSnapshot {
    artifactRootPath: string;
    activeProcesses: AIOutputCleanerProcessStatus[];
    recentProcesses: AIOutputCleanerProcessStatus[];
    lastProcess?: AIOutputCleanerProcessStatus;
    lastArtifact?: SavedArtifact;
    recentArtifacts: SavedArtifact[];
    recentFiltersApplied: string[];
    codexHooks?: AIOutputCleanerCodexHooksStatus;
    updatedAt?: string;
}

export interface AIOutputCleanerRecordResult {
    artifact: SavedArtifact;
    process: AIOutputCleanerProcessStatus;
}

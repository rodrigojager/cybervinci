// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import {
    AIOutputCleanerArtifactQuery,
    AIOutputCleanerRecordResult,
    AIOutputCleanerRawArtifact,
    AIOutputCleanerSessionOverride,
    AIOutputCleanerStatusSnapshot,
    AIOutputCleanerToolResultRecord,
    SavedArtifact
} from './ai-output-cleaner-types';

export const OUTPUT_CLEANER_SERVICE_PATH = '/services/ai-output-cleaner';
export const LEGACY_OUTPUT_CLEANER_SERVICE_PATH = '/services/cybervinci-output-cleaner';

export const AIOutputCleanerBackendService = Symbol('AIOutputCleanerBackendService');

export interface AIOutputCleanerBackendService {
    getArtifactRootPath(): Promise<string>;
    recreateWrappers(commands?: string[]): Promise<string[]>;
    installCodexHooks(): Promise<AIOutputCleanerStatusSnapshot['codexHooks']>;
    removeCodexHooks(): Promise<AIOutputCleanerStatusSnapshot['codexHooks']>;
    setCodexHooksRuntimeEnabled(enabled: boolean): Promise<AIOutputCleanerStatusSnapshot['codexHooks']>;
    saveArtifact(record: AIOutputCleanerToolResultRecord): Promise<SavedArtifact>;
    listRecentArtifacts(query?: AIOutputCleanerArtifactQuery): Promise<SavedArtifact[]>;
    readRawArtifact(artifactId: string): Promise<AIOutputCleanerRawArtifact | undefined>;
    recordToolResult(record: AIOutputCleanerToolResultRecord): Promise<AIOutputCleanerRecordResult>;
    getStatus(query?: AIOutputCleanerArtifactQuery): Promise<AIOutputCleanerStatusSnapshot>;
    getSessionOverride(sessionId: string): Promise<AIOutputCleanerSessionOverride | undefined>;
    setSessionBypass(sessionId: string, bypassFiltering: boolean): Promise<AIOutputCleanerSessionOverride>;
}

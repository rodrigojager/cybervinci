// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { inject, injectable } from '@theia/core/shared/inversify';
import { AIOutputCleanerBackendService } from '../common/ai-output-cleaner-backend-service';
import {
    AIOutputCleanerArtifactQuery,
    AIOutputCleanerRecordResult,
    AIOutputCleanerRawArtifact,
    AIOutputCleanerSessionOverride,
    AIOutputCleanerStatusSnapshot,
    AIOutputCleanerToolResultRecord,
    SavedArtifact
} from '../common/ai-output-cleaner-types';
import { AIOutputCleanerArtifactStore } from './ai-output-cleaner-artifact-store';
import { AIOutputCleanerCodexEnvService } from './ai-output-cleaner-codex-env-service';
import { AIOutputCleanerCodexHooksStatusService } from './ai-output-cleaner-codex-hooks-status-service';
import { AIOutputCleanerStatusTracker } from './ai-output-cleaner-status-tracker';

@injectable()
export class AIOutputCleanerBackendServiceImpl implements AIOutputCleanerBackendService {

    @inject(AIOutputCleanerArtifactStore)
    protected readonly artifactStore: AIOutputCleanerArtifactStore;

    @inject(AIOutputCleanerStatusTracker)
    protected readonly statusTracker: AIOutputCleanerStatusTracker;

    @inject(AIOutputCleanerCodexEnvService)
    protected readonly codexEnvService: AIOutputCleanerCodexEnvService;

    @inject(AIOutputCleanerCodexHooksStatusService)
    protected readonly codexHooksStatusService: AIOutputCleanerCodexHooksStatusService;

    async getArtifactRootPath(): Promise<string> {
        return this.artifactStore.getArtifactRootPath();
    }

    async recreateWrappers(commands?: string[]): Promise<string[]> {
        return this.codexEnvService.recreateWrappers(commands);
    }

    async installCodexHooks(): Promise<AIOutputCleanerStatusSnapshot['codexHooks']> {
        return this.codexHooksStatusService.install();
    }

    async removeCodexHooks(): Promise<AIOutputCleanerStatusSnapshot['codexHooks']> {
        return this.codexHooksStatusService.remove();
    }

    async setCodexHooksRuntimeEnabled(enabled: boolean): Promise<AIOutputCleanerStatusSnapshot['codexHooks']> {
        return this.codexHooksStatusService.setRuntimeEnabled(enabled);
    }

    async saveArtifact(record: AIOutputCleanerToolResultRecord): Promise<SavedArtifact> {
        return this.artifactStore.saveArtifact({
            command: record.command,
            args: record.args,
            cwd: record.cwd,
            origin: record.origin,
            provider: record.provider,
            sessionId: record.sessionId,
            exitCode: record.exitCode,
            startedAt: record.startedAt,
            completedAt: record.completedAt,
            durationMs: record.durationMs,
            filtersApplied: record.filtersApplied,
            stdout: record.rawStdout,
            stderr: record.rawStderr
        });
    }

    async listRecentArtifacts(query?: AIOutputCleanerArtifactQuery): Promise<SavedArtifact[]> {
        return this.artifactStore.listArtifacts(query);
    }

    async readRawArtifact(artifactId: string): Promise<AIOutputCleanerRawArtifact | undefined> {
        return this.artifactStore.readArtifact(artifactId);
    }

    async recordToolResult(record: AIOutputCleanerToolResultRecord): Promise<AIOutputCleanerRecordResult> {
        const artifact = await this.saveArtifact(record);
        const process = await this.statusTracker.record(record, artifact);
        return { artifact, process };
    }

    async getStatus(query?: AIOutputCleanerArtifactQuery): Promise<AIOutputCleanerStatusSnapshot> {
        const [artifactRootPath, recentArtifacts, codexHooks] = await Promise.all([
            this.artifactStore.getArtifactRootPath(),
            this.artifactStore.listArtifacts(query),
            this.codexHooksStatusService.getStatus()
        ]);
        return {
            ...await this.statusTracker.getSnapshot(artifactRootPath, recentArtifacts, query),
            codexHooks
        };
    }

    async getSessionOverride(sessionId: string): Promise<AIOutputCleanerSessionOverride | undefined> {
        return this.artifactStore.getSessionOverride(sessionId);
    }

    async setSessionBypass(sessionId: string, bypassFiltering: boolean): Promise<AIOutputCleanerSessionOverride> {
        return this.artifactStore.setSessionBypass(sessionId, bypassFiltering);
    }
}

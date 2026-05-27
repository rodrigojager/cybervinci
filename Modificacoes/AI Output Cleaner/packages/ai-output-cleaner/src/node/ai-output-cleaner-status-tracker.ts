// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { createHash } from 'crypto';
import { injectable } from '@theia/core/shared/inversify';
import {
    AIOutputCleanerArtifactQuery,
    AIOutputCleanerProcessStatus,
    AIOutputCleanerStatusSnapshot,
    AIOutputCleanerToolResultRecord,
    SavedArtifact
} from '../common/ai-output-cleaner-types';
import { AIOutputCleanerStatusStore } from './ai-output-cleaner-status-store';

@injectable()
export class AIOutputCleanerStatusTracker {
    constructor(protected readonly statusStore: AIOutputCleanerStatusStore = new AIOutputCleanerStatusStore()) { }

    async record(record: AIOutputCleanerToolResultRecord, artifact?: SavedArtifact): Promise<AIOutputCleanerProcessStatus> {
        const timestamp = record.completedAt ?? record.startedAt ?? new Date().toISOString();
        const processId = this.createProcessId(record);
        const previous = await this.statusStore.getProcess(processId);
        const startedAt = previous?.startedAt ?? record.startedAt ?? timestamp;
        const recentLines = this.collectRecentLines(record);
        const status: AIOutputCleanerProcessStatus = {
            id: processId,
            command: record.command,
            args: record.args ?? [],
            cwd: record.cwd,
            origin: record.origin,
            provider: record.provider,
            sessionId: record.sessionId,
            pid: record.pid ?? previous?.pid,
            startedAt,
            completedAt: record.status === 'running' ? previous?.completedAt : (record.completedAt ?? timestamp),
            lastUpdatedAt: timestamp,
            status: record.status ?? this.resolveStatus(record.exitCode),
            exitCode: record.exitCode,
            artifactId: artifact?.id ?? previous?.artifactId,
            changed: record.changed ?? false,
            filtersApplied: record.filtersApplied ?? [],
            notice: record.notice,
            lastStdoutPreview: this.toPreview(record.cleanedStdout ?? record.rawStdout),
            lastStderrPreview: this.toPreview(record.cleanedStderr ?? record.rawStderr),
            recentLines,
            hasRecentOutput: recentLines.length > 0
        };
        await this.statusStore.saveProcess(status);
        return status;
    }

    async getSnapshot(artifactRootPath: string, recentArtifacts: SavedArtifact[], query: AIOutputCleanerArtifactQuery = {}): Promise<AIOutputCleanerStatusSnapshot> {
        const matchingProcesses = await this.statusStore.listProcesses(query);
        const activeProcesses = matchingProcesses.filter(process => process.status === 'running');
        const recentFiltersApplied = Array.from(new Set(matchingProcesses.flatMap(process => process.filtersApplied))).slice(0, query.limit ?? 20);
        return {
            artifactRootPath,
            activeProcesses,
            recentProcesses: matchingProcesses.slice(0, query.limit ?? 20),
            lastProcess: matchingProcesses[0],
            lastArtifact: recentArtifacts[0],
            recentArtifacts,
            recentFiltersApplied,
            updatedAt: matchingProcesses[0]?.lastUpdatedAt ?? recentArtifacts[0]?.completedAt
        };
    }

    protected createProcessId(record: AIOutputCleanerToolResultRecord): string {
        if (record.sessionId && record.pid !== undefined) {
            return `${record.sessionId}:${record.pid}`;
        }
        if (record.sessionId) {
            return `${record.sessionId}:${record.command}:${(record.args ?? []).join('\u0000')}`;
        }
        const payload = JSON.stringify({
            command: record.command,
            args: record.args ?? [],
            cwd: record.cwd,
            origin: record.origin,
            provider: record.provider,
            startedAt: record.startedAt
        });
        return createHash('sha1').update(payload).digest('hex').slice(0, 16);
    }

    protected resolveStatus(exitCode: number | undefined): 'completed' | 'failed' {
        return exitCode === undefined || exitCode === 0 ? 'completed' : 'failed';
    }

    protected collectRecentLines(record: AIOutputCleanerToolResultRecord): string[] {
        const combined = [record.cleanedStdout ?? record.rawStdout, record.cleanedStderr ?? record.rawStderr]
            .filter(Boolean)
            .join('\n');
        return combined
            .split(/\r?\n/)
            .map(line => line.trimEnd())
            .filter(line => line.length > 0)
            .slice(-8);
    }

    protected toPreview(text: string | undefined): string {
        if (!text) {
            return '';
        }
        const normalized = text.replace(/\s+/g, ' ').trim();
        return normalized.slice(0, 240);
    }
}

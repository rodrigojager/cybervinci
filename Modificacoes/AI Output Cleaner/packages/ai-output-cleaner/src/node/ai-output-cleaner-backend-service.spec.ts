// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { expect } from 'chai';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { AIOutputCleanerBackendServiceImpl } from './ai-output-cleaner-backend-service';
import { AIOutputCleanerArtifactStore } from './ai-output-cleaner-artifact-store';
import { AIOutputCleanerCodexEnvService } from './ai-output-cleaner-codex-env-service';
import { AIOutputCleanerCodexHooksStatusService } from './ai-output-cleaner-codex-hooks-status-service';
import { AIOutputCleanerStatusTracker } from './ai-output-cleaner-status-tracker';
import { AIOutputCleanerStatusStore } from './ai-output-cleaner-status-store';

describe('AIOutputCleanerBackendServiceImpl', () => {

    it('records tool results and exposes status snapshots', async () => {
        const root = await createTempDirectory();
        const store = new TempAIOutputCleanerArtifactStore(root);
        const statusStore = new TempAIOutputCleanerStatusStore(path.join(root, 'status'));
        const service = new AIOutputCleanerBackendServiceImpl();
        (service as any).artifactStore = store;
        (service as any).statusTracker = new AIOutputCleanerStatusTracker(statusStore);
        (service as any).codexEnvService = {
            recreateWrappers: async () => ['git.cmd']
        } as unknown as AIOutputCleanerCodexEnvService;
        (service as any).codexHooksStatusService = {
            getStatus: async () => ({
                readiness: 'prepared',
                available: true,
                supported: true,
                configured: false,
                summary: 'support detected',
                capability: {
                    readiness: 'prepared',
                    available: true,
                    supported: true,
                    postToolUseCanReplaceToolResult: true,
                    homePath: '/home/test/.codex',
                    configPath: '/home/test/.codex/config.toml',
                    helpMentionsHookTrustBypass: true,
                    binaryMentionsConfigRequirementsHooks: true,
                    configSyntaxDocumentedInHelp: false,
                    evidence: ['help exposes --dangerously-bypass-hook-trust'],
                    checkedAt: '2026-01-01T10:00:00.000Z'
                },
                artifacts: {
                    readiness: 'prepared',
                    rootPath: '/hooks',
                    helperScriptPath: '/hooks/ai-output-cleaner-hook.cjs',
                    readmePath: '/hooks/README.md',
                    eventLogPath: '/hooks/hook-events.ndjson',
                    runtimeStatePath: '/hooks/runtime-state.json',
                    prepared: true,
                    configured: false,
                    runtimeEnabled: true,
                    managedBlockInstalled: false,
                    eventCount: 0,
                    installedEvents: [],
                    errors: []
                }
            })
        } as unknown as AIOutputCleanerCodexHooksStatusService;

        const running = await service.recordToolResult({
            command: 'npm',
            args: ['install'],
            cwd: '/workspace',
            origin: 'theia-tool',
            provider: 'fake-provider',
            sessionId: 'session-1',
            pid: 42,
            status: 'running',
            startedAt: '2026-01-01T10:00:00.000Z',
            completedAt: '2026-01-01T10:00:01.000Z',
            rawStdout: 'downloading package-a\n50%',
            rawStderr: '',
            cleanedStdout: 'downloading package-a\n50%',
            changed: false,
            filtersApplied: []
        });

        expect(running.artifact.command).to.equal('npm');
        expect(running.process.status).to.equal('running');
        expect(running.process.artifactId).to.equal(running.artifact.id);

        const completed = await service.recordToolResult({
            command: 'npm',
            args: ['install'],
            cwd: '/workspace',
            origin: 'theia-tool',
            provider: 'fake-provider',
            sessionId: 'session-1',
            pid: 42,
            status: 'completed',
            exitCode: 0,
            startedAt: '2026-01-01T10:00:00.000Z',
            completedAt: '2026-01-01T10:00:05.000Z',
            rawStdout: 'done',
            rawStderr: '',
            cleanedStdout: '[CyberVinci notice]\ndone',
            changed: true,
            filtersApplied: ['git-status-advice'],
            notice: '[CyberVinci notice]'
        });

        expect(completed.process.status).to.equal('completed');
        expect(completed.process.filtersApplied).to.deep.equal(['git-status-advice']);

        const artifacts = await service.listRecentArtifacts({ sessionId: 'session-1' });
        const status = await service.getStatus({ sessionId: 'session-1' });
        const rawArtifact = await service.readRawArtifact(completed.artifact.id);
        const sessionOverride = await service.setSessionBypass('session-1', true);

        expect(artifacts).to.have.length(2);
        expect(rawArtifact?.stdout).to.equal('done');
        expect(rawArtifact?.stderr).to.equal('');
        expect(status.activeProcesses).to.have.length(0);
        expect(status.recentProcesses).to.have.length(1);
        expect(status.lastProcess?.status).to.equal('completed');
        expect(status.lastProcess?.artifactId).to.equal(completed.artifact.id);
        expect(status.recentFiltersApplied).to.deep.equal(['git-status-advice']);
        expect(status.lastArtifact?.id).to.equal(artifacts[0].id);
        expect(sessionOverride.bypassFiltering).to.equal(true);
        expect((await service.getSessionOverride('session-1'))?.bypassFiltering).to.equal(true);
        expect(status.codexHooks?.supported).to.equal(true);
        expect(status.codexHooks?.artifacts.prepared).to.equal(true);

        const restartedService = new AIOutputCleanerBackendServiceImpl();
        (restartedService as any).artifactStore = store;
        (restartedService as any).statusTracker = new AIOutputCleanerStatusTracker(statusStore);
        (restartedService as any).codexEnvService = (service as any).codexEnvService;
        (restartedService as any).codexHooksStatusService = (service as any).codexHooksStatusService;
        const restartedStatus = await restartedService.getStatus({ sessionId: 'session-1' });

        expect(restartedStatus.lastProcess?.status).to.equal('completed');
        expect(restartedStatus.lastProcess?.artifactId).to.equal(completed.artifact.id);
        expect((await restartedService.getSessionOverride('session-1'))?.bypassFiltering).to.equal(true);
        expect(restartedStatus.codexHooks?.readiness).to.equal('prepared');

        const wrappers = await service.recreateWrappers(['git']);
        expect(wrappers).to.deep.equal(['git.cmd']);
    });
});

class TempAIOutputCleanerArtifactStore extends AIOutputCleanerArtifactStore {
    constructor(private readonly rootPath: string) {
        super();
    }

    protected override getArtifactRootDirectory(): string {
        return this.rootPath;
    }
}

class TempAIOutputCleanerStatusStore extends AIOutputCleanerStatusStore {
    constructor(private readonly rootPath: string) {
        super();
    }

    protected override getStatusRootDirectory(): string {
        return this.rootPath;
    }
}

async function createTempDirectory(): Promise<string> {
    return fs.mkdtemp(path.join(os.tmpdir(), 'ai-output-cleaner-backend-'));
}

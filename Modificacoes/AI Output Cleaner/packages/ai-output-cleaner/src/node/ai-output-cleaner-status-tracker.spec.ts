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
import { SavedArtifact } from '../common/ai-output-cleaner-types';
import { AIOutputCleanerStatusStore } from './ai-output-cleaner-status-store';
import { AIOutputCleanerStatusTracker } from './ai-output-cleaner-status-tracker';

describe('AIOutputCleanerStatusTracker', () => {

    it('persists process state across tracker instances', async () => {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-output-cleaner-status-'));
        const store = new TempAIOutputCleanerStatusStore(root);
        const artifact = createArtifact('artifact-1');

        const tracker = new AIOutputCleanerStatusTracker(store);
        await tracker.record({
            command: 'git',
            args: ['status'],
            cwd: '/workspace',
            origin: 'codex-provider-wrapper',
            sessionId: 'session-1',
            pid: 42,
            status: 'running',
            startedAt: '2026-01-01T10:00:00.000Z',
            rawStdout: '',
            rawStderr: ''
        });

        const restartedTracker = new AIOutputCleanerStatusTracker(store);
        await restartedTracker.record({
            command: 'git',
            args: ['status'],
            cwd: '/workspace',
            origin: 'codex-provider-wrapper',
            sessionId: 'session-1',
            pid: 42,
            status: 'completed',
            exitCode: 0,
            startedAt: '2026-01-01T10:00:00.000Z',
            completedAt: '2026-01-01T10:00:02.000Z',
            rawStdout: 'clean',
            rawStderr: ''
        }, artifact);

        const snapshot = await restartedTracker.getSnapshot(root, [artifact], { sessionId: 'session-1' });

        expect(snapshot.activeProcesses).to.have.length(0);
        expect(snapshot.lastProcess?.status).to.equal('completed');
        expect(snapshot.lastProcess?.artifactId).to.equal('artifact-1');
        expect(snapshot.lastProcess?.startedAt).to.equal('2026-01-01T10:00:00.000Z');
        expect(snapshot.recentProcesses).to.have.length(1);
    });
});

class TempAIOutputCleanerStatusStore extends AIOutputCleanerStatusStore {
    constructor(private readonly rootPath: string) {
        super();
    }

    protected override getStatusRootDirectory(): string {
        return this.rootPath;
    }
}

function createArtifact(id: string): SavedArtifact {
    return {
        id,
        command: 'git',
        args: ['status'],
        cwd: '/workspace',
        origin: 'codex-provider-wrapper',
        sessionId: 'session-1',
        startedAt: '2026-01-01T10:00:00.000Z',
        completedAt: '2026-01-01T10:00:02.000Z',
        filtersApplied: [],
        path: '/artifacts/git-status'
    };
}

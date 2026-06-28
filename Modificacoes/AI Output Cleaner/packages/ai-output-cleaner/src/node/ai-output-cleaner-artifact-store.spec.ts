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
import { ArtifactStoreInput } from '../common/ai-output-cleaner-types';
import { AIOutputCleanerArtifactStore } from './ai-output-cleaner-artifact-store';

describe('AIOutputCleanerArtifactStore', () => {

    it('stores raw output and metadata in an artifact', async () => {
        const root = await createTempDirectory();
        const store = new TempAIOutputCleanerArtifactStore(root);
        const input: ArtifactStoreInput = {
            command: 'git',
            args: ['status'],
            cwd: '/workspace',
            origin: 'theia-tool',
            exitCode: 0,
            stdout: 'stdout',
            stderr: 'stderr',
            filtersApplied: ['git-status-advice'],
            startedAt: '2026-01-01T10:00:00.000Z',
            completedAt: '2026-01-01T10:00:01.000Z'
        };

        const saved = await store.saveArtifact(input);

        expect(saved.id).to.be.a('string');
        expect(saved.path).to.include(saved.id);
        expect(saved.command).to.equal('git');
        expect(saved.args).to.deep.equal(['status']);
        const metadata = JSON.parse(await fs.readFile(path.join(saved.path, 'metadata.json'), 'utf8'));
        expect(metadata.command).to.equal('git');
        expect(metadata.exitCode).to.equal(0);
        expect(await fs.readFile(path.join(saved.path, 'stdout.txt'), 'utf8')).to.equal('stdout');
        expect(await fs.readFile(path.join(saved.path, 'stderr.txt'), 'utf8')).to.equal('stderr');
    });

    it('lists recent artifacts', async () => {
        const root = await createTempDirectory();
        const store = new TempAIOutputCleanerArtifactStore(root);
        await store.saveArtifact({
            command: 'cmd',
            args: ['cmd', 'first'],
            exitCode: 0,
            stdout: 'one',
            stderr: '',
            startedAt: '2026-01-01T10:00:00.000Z',
            completedAt: '2026-01-01T10:00:01.000Z'
        });
        await store.saveArtifact({
            command: 'cmd',
            args: ['cmd', 'second'],
            exitCode: 1,
            stdout: 'two',
            stderr: '',
            startedAt: '2026-01-01T10:00:10.000Z',
            completedAt: '2026-01-01T10:00:11.000Z'
        });
        const list = await store.listArtifacts(10);

        expect(list).to.have.length(2);
        expect(list[0].completedAt >= list[1].completedAt).to.equal(true);
    });

    it('filters artifacts by session and origin', async () => {
        const root = await createTempDirectory();
        const store = new TempAIOutputCleanerArtifactStore(root);
        await store.saveArtifact({
            command: 'git',
            args: ['status'],
            origin: 'theia-tool',
            sessionId: 'session-a',
            exitCode: 0,
            stdout: 'one',
            stderr: '',
            startedAt: '2026-01-01T10:00:00.000Z',
            completedAt: '2026-01-01T10:00:01.000Z'
        });
        await store.saveArtifact({
            command: 'git',
            args: ['diff'],
            origin: 'provider-api',
            sessionId: 'session-b',
            exitCode: 0,
            stdout: 'two',
            stderr: '',
            startedAt: '2026-01-01T10:00:02.000Z',
            completedAt: '2026-01-01T10:00:03.000Z'
        });

        const bySession = await store.listArtifacts({ sessionId: 'session-a' });
        const byOrigin = await store.listArtifacts({ origin: 'provider-api' });

        expect(bySession).to.have.length(1);
        expect(bySession[0].sessionId).to.equal('session-a');
        expect(byOrigin).to.have.length(1);
        expect(byOrigin[0].origin).to.equal('provider-api');
    });

    it('reads raw artifact content and stores session-scoped bypass overrides', async () => {
        const root = await createTempDirectory();
        const store = new TempAIOutputCleanerArtifactStore(root);
        const saved = await store.saveArtifact({
            command: 'git',
            args: ['status'],
            sessionId: 'session-raw',
            stdout: 'raw stdout',
            stderr: 'raw stderr',
            startedAt: '2026-01-01T10:00:00.000Z',
            completedAt: '2026-01-01T10:00:01.000Z'
        });

        const rawArtifact = await store.readArtifact(saved.id);
        const override = await store.setSessionBypass('session-raw', true);
        const resolvedOverride = await store.getSessionOverride('session-raw');

        expect(rawArtifact?.artifact.id).to.equal(saved.id);
        expect(rawArtifact?.stdout).to.equal('raw stdout');
        expect(rawArtifact?.stderr).to.equal('raw stderr');
        expect(override.bypassFiltering).to.equal(true);
        expect(resolvedOverride?.sessionId).to.equal('session-raw');
        expect(resolvedOverride?.bypassFiltering).to.equal(true);
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

async function createTempDirectory(): Promise<string> {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-output-cleaner-artifacts-'));
    return directory;
}

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
import { PreferenceService } from '@theia/core';
import {
    OUTPUT_CLEANER_CODEX_ENV_ENABLED,
    OUTPUT_CLEANER_CODEX_ENV_MODE,
    OUTPUT_CLEANER_CODEX_ENV_ORIGINAL_PATH,
    OUTPUT_CLEANER_CODEX_ENV_SESSION,
    OUTPUT_CLEANER_CODEX_ENV_WRAPPER_BIN
} from '../common/ai-output-cleaner-codex-env-types';
import {
    OUTPUT_CLEANER_CODEX_ENABLED_PREF,
    OUTPUT_CLEANER_CODEX_WRAPPERS_ENABLED_PREF,
    OUTPUT_CLEANER_ENABLED_PREF,
    OUTPUT_CLEANER_MODE_PREF,
    OUTPUT_CLEANER_WRAPPER_COMMANDS_PREF
} from '../common/ai-output-cleaner-preferences';
import { AIOutputCleanerArtifactStore } from './ai-output-cleaner-artifact-store';
import { AIOutputCleanerCommandWrapperManager } from './ai-output-cleaner-command-wrapper-manager';
import { AIOutputCleanerCodexEnvService } from './ai-output-cleaner-codex-env-service';

describe('AIOutputCleanerCodexEnvService', () => {

    it('builds session env and PATH entries when Codex integration is enabled', async () => {
        const wrapperBinPath = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-output-cleaner-bin-'));
        const service = new TestAIOutputCleanerCodexEnvService(wrapperBinPath);
        (service as unknown as { preferenceService: PreferenceService }).preferenceService = new MockPreferenceService({
            [OUTPUT_CLEANER_ENABLED_PREF]: true,
            [OUTPUT_CLEANER_MODE_PREF]: 'safe',
            [OUTPUT_CLEANER_CODEX_ENABLED_PREF]: true,
            [OUTPUT_CLEANER_CODEX_WRAPPERS_ENABLED_PREF]: true,
            [OUTPUT_CLEANER_WRAPPER_COMMANDS_PREF]: ['git', 'rg']
        }) as unknown as PreferenceService;
        (service as unknown as { artifactStore: AIOutputCleanerArtifactStore }).artifactStore = new MockArtifactStore(
            path.join(wrapperBinPath, '..', 'artifacts', 'raw-output')
        );
        const wrapperManager = new MockWrapperManager();
        (service as unknown as { wrapperManager: AIOutputCleanerCommandWrapperManager }).wrapperManager = wrapperManager as unknown as AIOutputCleanerCommandWrapperManager;

        const resolution = await service.resolveForSession('session-1');

        expect(resolution.enabled).to.equal(true);
        expect(resolution.env[OUTPUT_CLEANER_CODEX_ENV_ENABLED]).to.equal('1');
        expect(resolution.env[OUTPUT_CLEANER_CODEX_ENV_MODE]).to.equal('safe');
        expect(resolution.env[OUTPUT_CLEANER_CODEX_ENV_SESSION]).to.equal('session-1');
        expect(resolution.env[OUTPUT_CLEANER_CODEX_ENV_WRAPPER_BIN]).to.equal(wrapperBinPath);
        expect(resolution.env[OUTPUT_CLEANER_CODEX_ENV_ORIGINAL_PATH]).to.be.a('string');
        expect(resolution.pathEntries).to.deep.equal([wrapperBinPath]);
        expect(wrapperManager.calls).to.deep.equal([{ wrapperBinPath, commands: ['git', 'rg'] }]);
    });

    it('exposes generic cli capabilities for future adapters', async () => {
        const service = new TestAIOutputCleanerCodexEnvService('C:\\cleaner\\bin');
        (service as unknown as { preferenceService: PreferenceService }).preferenceService = new MockPreferenceService({
            [OUTPUT_CLEANER_ENABLED_PREF]: true,
            [OUTPUT_CLEANER_MODE_PREF]: 'safe',
            [OUTPUT_CLEANER_CODEX_ENABLED_PREF]: true,
            [OUTPUT_CLEANER_CODEX_WRAPPERS_ENABLED_PREF]: false,
            [OUTPUT_CLEANER_WRAPPER_COMMANDS_PREF]: ['git']
        }) as unknown as PreferenceService;
        (service as unknown as { artifactStore: AIOutputCleanerArtifactStore }).artifactStore = new MockArtifactStore(
            'C:\\cleaner\\artifacts\\raw-output'
        );
        (service as unknown as { wrapperManager: AIOutputCleanerCommandWrapperManager }).wrapperManager = new MockWrapperManager() as unknown as AIOutputCleanerCommandWrapperManager;

        const resolution = await service.resolveForCli({ cliId: 'codex', sessionId: 'session-3' });

        expect(resolution.cliId).to.equal('codex');
        expect(resolution.capabilities).to.deep.equal({
            env: {
                variables: [
                    OUTPUT_CLEANER_CODEX_ENV_ENABLED,
                    OUTPUT_CLEANER_CODEX_ENV_MODE,
                    'CYBERVINCI_OUTPUT_CLEANER_ARTIFACT_ROOT',
                    OUTPUT_CLEANER_CODEX_ENV_ORIGINAL_PATH,
                    OUTPUT_CLEANER_CODEX_ENV_SESSION
                ],
                pathEntries: false,
                fingerprint: true
            },
            hooks: ['spawn-env'],
            sandbox: ['kill-switch', 'mode-env', 'path-capture', 'wrapper-bin'],
            stream: ['session-env']
        });
    });

    it('keeps PATH untouched when disabled by preferences', async () => {
        const service = new TestAIOutputCleanerCodexEnvService('C:\\cleaner\\bin');
        (service as unknown as { preferenceService: PreferenceService }).preferenceService = new MockPreferenceService({
            [OUTPUT_CLEANER_ENABLED_PREF]: false,
            [OUTPUT_CLEANER_MODE_PREF]: 'off',
            [OUTPUT_CLEANER_CODEX_ENABLED_PREF]: true,
            [OUTPUT_CLEANER_CODEX_WRAPPERS_ENABLED_PREF]: true,
            [OUTPUT_CLEANER_WRAPPER_COMMANDS_PREF]: ['git']
        }) as unknown as PreferenceService;
        (service as unknown as { artifactStore: AIOutputCleanerArtifactStore }).artifactStore = new MockArtifactStore(
            'C:\\cleaner\\artifacts\\raw-output'
        );
        const wrapperManager = new MockWrapperManager();
        (service as unknown as { wrapperManager: AIOutputCleanerCommandWrapperManager }).wrapperManager = wrapperManager as unknown as AIOutputCleanerCommandWrapperManager;

        const resolution = await service.resolveForSession('session-2');

        expect(resolution.enabled).to.equal(false);
        expect(resolution.env[OUTPUT_CLEANER_CODEX_ENV_ENABLED]).to.equal('0');
        expect(resolution.pathEntries).to.deep.equal([]);
        expect(resolution.env[OUTPUT_CLEANER_CODEX_ENV_WRAPPER_BIN]).to.equal(undefined);
        expect(wrapperManager.calls).to.deep.equal([]);
    });

    it('forces raw mode when the active session bypass is enabled', async () => {
        const wrapperBinPath = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-output-cleaner-bypass-bin-'));
        const service = new TestAIOutputCleanerCodexEnvService(wrapperBinPath);
        (service as unknown as { preferenceService: PreferenceService }).preferenceService = new MockPreferenceService({
            [OUTPUT_CLEANER_ENABLED_PREF]: true,
            [OUTPUT_CLEANER_MODE_PREF]: 'safe',
            [OUTPUT_CLEANER_CODEX_ENABLED_PREF]: true,
            [OUTPUT_CLEANER_CODEX_WRAPPERS_ENABLED_PREF]: true,
            [OUTPUT_CLEANER_WRAPPER_COMMANDS_PREF]: ['git']
        }) as unknown as PreferenceService;
        (service as unknown as { artifactStore: AIOutputCleanerArtifactStore }).artifactStore = new MockArtifactStore(
            path.join(wrapperBinPath, '..', 'artifacts', 'raw-output'),
            async () => ({
                sessionId: 'session-bypass',
                bypassFiltering: true,
                updatedAt: '2026-01-01T10:00:00.000Z'
            })
        );
        const wrapperManager = new MockWrapperManager();
        (service as unknown as { wrapperManager: AIOutputCleanerCommandWrapperManager }).wrapperManager = wrapperManager as unknown as AIOutputCleanerCommandWrapperManager;

        const resolution = await service.resolveForSession('session-bypass');

        expect(resolution.env[OUTPUT_CLEANER_CODEX_ENV_MODE]).to.equal('raw');
        expect(resolution.pathEntries).to.deep.equal([wrapperBinPath]);
        expect(resolution.fingerprint).to.contain('"bypassFiltering":true');
    });
});

class TestAIOutputCleanerCodexEnvService extends AIOutputCleanerCodexEnvService {
    constructor(private readonly wrapperBinPath: string) {
        super();
    }

    protected override getWrapperBinPath(): string {
        return this.wrapperBinPath;
    }
}

class MockPreferenceService {
    constructor(protected readonly values: Record<string, unknown>) {
    }

    get<T>(preferenceName: string, defaultValue?: T): T {
        return (this.values[preferenceName] as T | undefined) ?? defaultValue as T;
    }
}

class MockWrapperManager {
    readonly calls: Array<{ wrapperBinPath: string; commands: string[] }> = [];

    async ensureWrappers(wrapperBinPath: string, commands: string[]): Promise<string[]> {
        this.calls.push({ wrapperBinPath, commands });
        return commands.map(command => path.join(wrapperBinPath, `${command}.cmd`));
    }
}

class MockArtifactStore extends AIOutputCleanerArtifactStore {
    constructor(
        private readonly rootPath: string,
        private readonly overrideReader: () => Promise<{ sessionId: string; bypassFiltering: boolean; updatedAt: string } | undefined> = async () => undefined
    ) {
        super();
    }

    override async getArtifactRootPath(): Promise<string> {
        return this.rootPath;
    }

    override async getSessionOverride(_sessionId: string): Promise<{ sessionId: string; bypassFiltering: boolean; updatedAt: string } | undefined> {
        return this.overrideReader();
    }
}

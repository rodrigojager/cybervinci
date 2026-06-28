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
import { AIOutputCleanerCodexHooksStatusService } from './ai-output-cleaner-codex-hooks-status-service';

describe('AIOutputCleanerCodexHooksStatusService', () => {
    it('detects local hook support and prepares AI Output Cleaner artifacts without configuring Codex', async () => {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-output-cleaner-hooks-'));
        const service = new TestAIOutputCleanerCodexHooksStatusService(root, {
            codexHomePath: path.join(root, '.codex'),
            commandPath: 'C:/Users/test/AppData/Roaming/npm/codex.ps1',
            version: '0.131.0',
            help: 'Codex Provider\n  --dangerously-bypass-hook-trust\n  -c, --config <key=value>\n',
            binaryContents: 'configRequirements.read.hooks'
        });

        const status = await service.getStatus();

        expect(status.readiness).to.equal('prepared');
        expect(status.available).to.equal(true);
        expect(status.supported).to.equal(true);
        expect(status.configured).to.equal(false);
        expect(status.capability.homePath).to.equal(path.join(root, '.codex'));
        expect(status.capability.configPath).to.equal(path.join(root, '.codex', 'config.toml'));
        expect(status.capability.helpMentionsHookTrustBypass).to.equal(true);
        expect(status.capability.binaryMentionsConfigRequirementsHooks).to.equal(true);
        expect(status.capability.postToolUseCanReplaceToolResult).to.equal(true);
        expect(status.summary).to.contain('without modifying ~/.codex/config.toml');
        expect(status.artifacts.prepared).to.equal(true);
        expect(status.artifacts.runtimeEnabled).to.equal(true);
        expect(status.artifacts.runtimeStatePath).to.equal(path.join(root, 'runtime-state.json'));
        expect(status.artifacts.installedEvents).to.deep.equal([]);
        expect(await fs.readFile(status.artifacts.helperScriptPath, 'utf8')).to.contain('hook-events.ndjson');
        expect(await fs.readFile(status.artifacts.readmePath, 'utf8')).to.contain('The extension only installs a managed block in `~/.codex/config.toml` when explicitly asked.');
    });

    it('reports unknown status when Codex cannot be found locally', async () => {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-output-cleaner-hooks-'));
        const service = new TestAIOutputCleanerCodexHooksStatusService(root, {});

        const status = await service.getStatus();

        expect(status.readiness).to.equal('unknown');
        expect(status.available).to.equal(false);
        expect(status.supported).to.equal(false);
        expect(status.capability.evidence).to.include('codex executable not found on PATH');
    });

    it('installs and removes a managed config block in config.toml', async () => {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-output-cleaner-hooks-'));
        const codexHomePath = path.join(root, '.codex');
        const service = new TestAIOutputCleanerCodexHooksStatusService(root, {
            codexHomePath,
            commandPath: 'C:/Users/test/AppData/Roaming/npm/codex.ps1',
            version: '0.131.0',
            help: 'Codex Provider\n  --dangerously-bypass-hook-trust\n  hooks\n',
            binaryContents: 'configRequirements.read.hooks'
        });

        const installed = await service.install();
        const configPath = path.join(codexHomePath, 'config.toml');
        const configContents = await fs.readFile(configPath, 'utf8');

        expect(installed.readiness).to.equal('configured');
        expect(installed.configured).to.equal(true);
        expect(installed.artifacts.runtimeEnabled).to.equal(true);
        expect(installed.artifacts.installedEvents).to.deep.equal([
            'SessionStart',
            'UserPromptSubmit',
            'PreToolUse',
            'PermissionRequest',
            'PostToolUse',
            'Stop'
        ]);
        expect(configContents).to.contain('[[hooks.PostToolUse]]');
        expect(configContents).to.contain('CyberVinci AI Output Cleaner hooks');

        const disabled = await service.setRuntimeEnabled(false);
        expect(disabled.artifacts.runtimeEnabled).to.equal(false);

        const removed = await service.remove();
        const removedConfigContents = await fs.readFile(configPath, 'utf8');
        expect(removed.configured).to.equal(false);
        expect(removed.artifacts.runtimeEnabled).to.equal(false);
        expect(removedConfigContents).not.to.contain('CyberVinci AI Output Cleaner hooks');
    });
});

class TestAIOutputCleanerCodexHooksStatusService extends AIOutputCleanerCodexHooksStatusService {
    constructor(
        private readonly rootPath: string,
        private readonly options: {
            codexHomePath?: string;
            commandPath?: string;
            version?: string;
            help?: string;
            binaryContents?: string;
        }
    ) {
        super();
    }

    protected override getArtifactsRootPath(): string {
        return this.rootPath;
    }

    protected override getCodexHomePath(): string {
        return this.options.codexHomePath || super.getCodexHomePath();
    }

    protected override async resolveCodexExecutablePath(): Promise<string | undefined> {
        return this.options.commandPath;
    }

    protected override async resolveCodexBinaryPath(_executablePath: string): Promise<string | undefined> {
        return this.options.binaryContents ? path.join(this.rootPath, 'codex.exe') : undefined;
    }

    protected override async tryRead(_targetPath: string): Promise<string | undefined> {
        return this.options.binaryContents;
    }

    protected override async tryRun(command: string, args: string[]): Promise<string | undefined> {
        if (command === this.options.commandPath && args[0] === '--help') {
            return this.options.help;
        }
        if (command === this.options.commandPath && args[0] === '--version') {
            return this.options.version;
        }
        return undefined;
    }
}

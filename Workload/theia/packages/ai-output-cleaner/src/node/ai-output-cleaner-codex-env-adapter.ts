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
import { AIOutputCleanerCodexEnvService } from './ai-output-cleaner-codex-env-service';
import {
    AIOutputCleanerCliAdapterCapabilities,
    AIOutputCleanerCliEnvironmentAdapter,
    AIOutputCleanerCliEnvironmentContext,
    AIOutputCleanerCliEnvironmentFragment
} from './ai-output-cleaner-cli-adapter-registry';

export const CODEX_CLI_SPAWN_ENVIRONMENT_CONTRIBUTION = Symbol.for('theia.aiCodexProvider.spawnEnvironmentContribution');

export interface CodexProviderSpawnEnvironmentContext {
    executablePath?: string;
    profile?: string;
    cwd?: string;
    sessionId?: string;
}

export interface CodexProviderSpawnEnvironmentFragment {
    env?: Record<string, string | undefined>;
    pathEntries?: string[];
    fingerprint?: string;
    capabilities?: AIOutputCleanerCliAdapterCapabilities;
}

export interface CodexProviderSpawnEnvironmentContribution {
    contributeCodexProviderSpawnEnvironment(context: CodexProviderSpawnEnvironmentContext): Promise<CodexProviderSpawnEnvironmentFragment | undefined>;
}

@injectable()
export class AIOutputCleanerCodexEnvAdapter implements CodexProviderSpawnEnvironmentContribution, AIOutputCleanerCliEnvironmentAdapter {

    readonly id = 'codex';
    readonly capabilities: AIOutputCleanerCliAdapterCapabilities = {
        env: {
            pathEntries: true,
            fingerprint: true
        },
        hooks: ['spawn-env'],
        sandbox: ['kill-switch', 'mode-env', 'path-capture', 'wrapper-bin'],
        stream: ['session-env']
    };

    @inject(AIOutputCleanerCodexEnvService)
    protected readonly envService: AIOutputCleanerCodexEnvService;

    async contributeCodexProviderSpawnEnvironment(context: CodexProviderSpawnEnvironmentContext): Promise<CodexProviderSpawnEnvironmentFragment | undefined> {
        return this.resolveEnvironment({
            cliId: this.id,
            sessionId: context.sessionId,
            executablePath: context.executablePath,
            profile: context.profile,
            cwd: context.cwd
        });
    }

    async resolveEnvironment(context: AIOutputCleanerCliEnvironmentContext): Promise<AIOutputCleanerCliEnvironmentFragment | undefined> {
        const resolution = await this.envService.resolveForCli(context);
        return {
            env: resolution.env,
            pathEntries: resolution.pathEntries,
            fingerprint: resolution.fingerprint,
            capabilities: resolution.capabilities
        };
    }
}


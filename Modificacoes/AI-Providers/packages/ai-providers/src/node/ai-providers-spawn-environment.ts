// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { MaybePromise } from '@theia/core';

export const CodexProviderSpawnEnvironmentContribution = Symbol.for('theia.aiCodexProvider.spawnEnvironmentContribution');

export interface CliSpawnEnvironmentCapabilities {
    env?: {
        variables?: string[];
        pathEntries?: boolean;
        fingerprint?: boolean;
    };
    hooks?: string[];
    sandbox?: string[];
    stream?: string[];
}

export interface CliSpawnEnvironmentContext {
    executablePath?: string;
    profile?: string;
    cwd?: string;
    sessionId?: string;
}

export interface CliSpawnEnvironmentFragment {
    env?: Record<string, string | undefined>;
    pathEntries?: string[];
    fingerprint?: string;
    capabilities?: CliSpawnEnvironmentCapabilities;
}

export type CodexProviderSpawnEnvironmentContext = CliSpawnEnvironmentContext;
export type CodexProviderSpawnEnvironmentFragment = CliSpawnEnvironmentFragment;

export interface CodexProviderSpawnEnvironmentContribution {
    contributeCodexProviderSpawnEnvironment(
        context: CodexProviderSpawnEnvironmentContext
    ): MaybePromise<CodexProviderSpawnEnvironmentFragment | undefined>;
}


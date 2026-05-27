// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { ContributionProvider, MaybePromise } from '@theia/core';
import { inject, injectable, named, optional } from '@theia/core/shared/inversify';

export const OUTPUT_CLEANER_CLI_ENVIRONMENT_ADAPTER = Symbol.for('theia.aiOutputCleaner.cliEnvironmentAdapter');

export interface AIOutputCleanerCliEnvironmentContext {
    cliId: string;
    sessionId?: string;
    executablePath?: string;
    profile?: string;
    cwd?: string;
}

export interface AIOutputCleanerCliAdapterCapabilities {
    env?: {
        variables?: string[];
        pathEntries?: boolean;
        fingerprint?: boolean;
    };
    hooks?: string[];
    sandbox?: string[];
    stream?: string[];
}

export interface AIOutputCleanerCliEnvironmentFragment {
    env?: Record<string, string | undefined>;
    pathEntries?: string[];
    fingerprint?: string;
    capabilities?: AIOutputCleanerCliAdapterCapabilities;
}

export interface AIOutputCleanerCliEnvironmentAdapter {
    readonly id: string;
    readonly capabilities?: AIOutputCleanerCliAdapterCapabilities;
    canHandle?(context: AIOutputCleanerCliEnvironmentContext): boolean;
    resolveEnvironment(context: AIOutputCleanerCliEnvironmentContext): MaybePromise<AIOutputCleanerCliEnvironmentFragment | undefined>;
}

@injectable()
export class AIOutputCleanerCliAdapterRegistry {

    @inject(ContributionProvider) @named(OUTPUT_CLEANER_CLI_ENVIRONMENT_ADAPTER) @optional()
    protected readonly adapterContributions: ContributionProvider<AIOutputCleanerCliEnvironmentAdapter> | undefined;

    getAdapters(): AIOutputCleanerCliEnvironmentAdapter[] {
        return this.adapterContributions?.getContributions() ?? [];
    }

    getAdapter(cliId: string): AIOutputCleanerCliEnvironmentAdapter | undefined {
        const normalizedId = cliId.trim().toLowerCase();
        return this.getAdapters().find(adapter => adapter.id.trim().toLowerCase() === normalizedId);
    }

    async resolveEnvironment(context: AIOutputCleanerCliEnvironmentContext): Promise<AIOutputCleanerCliEnvironmentFragment | undefined> {
        const adapter = this.getAdapter(context.cliId);
        if (!adapter) {
            return undefined;
        }
        if (adapter.canHandle && !adapter.canHandle(context)) {
            return undefined;
        }
        const fragment = await adapter.resolveEnvironment(context);
        if (!fragment) {
            return undefined;
        }
        return {
            ...fragment,
            capabilities: fragment.capabilities ?? adapter.capabilities
        };
    }
}

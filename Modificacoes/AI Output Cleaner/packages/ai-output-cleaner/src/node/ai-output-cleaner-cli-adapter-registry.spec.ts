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
import { ContributionProvider } from '@theia/core';
import {
    AIOutputCleanerCliAdapterRegistry,
    AIOutputCleanerCliEnvironmentAdapter,
    AIOutputCleanerCliEnvironmentContext
} from './ai-output-cleaner-cli-adapter-registry';

class TestAIOutputCleanerCliAdapterRegistry extends AIOutputCleanerCliAdapterRegistry {
    setAdapters(adapters: AIOutputCleanerCliEnvironmentAdapter[]): void {
        (this as unknown as { adapterContributions: ContributionProvider<AIOutputCleanerCliEnvironmentAdapter> }).adapterContributions = {
            getContributions: () => adapters
        };
    }
}

describe('AIOutputCleanerCliAdapterRegistry', () => {
    let registry: TestAIOutputCleanerCliAdapterRegistry;

    beforeEach(() => {
        registry = new TestAIOutputCleanerCliAdapterRegistry();
    });

    it('resolves adapters by cli id and preserves declared capabilities', async () => {
        registry.setAdapters([
            {
                id: 'codex',
                capabilities: {
                    env: { pathEntries: true, fingerprint: true, variables: ['A'] },
                    hooks: ['spawn-env'],
                    sandbox: ['wrappers'],
                    stream: ['session-id']
                },
                async resolveEnvironment() {
                    return {
                        env: { A: '1' },
                        pathEntries: ['C:\\cleaner\\bin'],
                        fingerprint: 'fingerprint-1'
                    };
                }
            }
        ]);

        const resolved = await registry.resolveEnvironment({ cliId: 'CoDeX', sessionId: 'chat-1' });

        expect(registry.getAdapter('codex')?.id).to.equal('codex');
        expect(resolved).to.deep.equal({
            env: { A: '1' },
            pathEntries: ['C:\\cleaner\\bin'],
            fingerprint: 'fingerprint-1',
            capabilities: {
                env: { pathEntries: true, fingerprint: true, variables: ['A'] },
                hooks: ['spawn-env'],
                sandbox: ['wrappers'],
                stream: ['session-id']
            }
        });
    });

    it('returns undefined when the selected adapter declines the context', async () => {
        registry.setAdapters([
            {
                id: 'codex',
                canHandle: (context: AIOutputCleanerCliEnvironmentContext) => context.sessionId === 'allowed',
                async resolveEnvironment() {
                    return { env: { A: '1' } };
                }
            }
        ]);

        expect(await registry.resolveEnvironment({ cliId: 'codex', sessionId: 'blocked' })).to.equal(undefined);
    });
});

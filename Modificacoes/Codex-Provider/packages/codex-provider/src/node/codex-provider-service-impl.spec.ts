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
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ContributionProvider } from '@theia/core';
import { CodexProviderFileUpdateChange, CodexProviderOptions } from '../common';
import { CodexProviderClient, CodexProviderStreamMessage } from '../common/codex-provider-service';
import { CodexProviderSpawnEnvironmentContribution } from './codex-provider-spawn-environment';
import { CodexProviderServiceImpl } from './codex-provider-service-impl';

class TestCodexProviderServiceImpl extends CodexProviderServiceImpl {
    threadId(value: unknown): string | undefined {
        return this.extractThreadId(value);
    }

    turnId(value: unknown): string | undefined {
        return this.extractTurnId(value);
    }

    fileChanges(value: unknown): CodexProviderFileUpdateChange[] {
        return this.readFileChanges(value);
    }

    cancellationError(value: unknown): boolean {
        return this.isCancellationError(value);
    }

    approvalResponse(method: string, params: unknown, decision: string | object): Record<string, unknown> {
        return this.buildApprovalResponse(method, params, decision);
    }

    threadConfig(options: Partial<CodexProviderOptions>): Record<string, unknown> | undefined {
        return this.buildThreadConfig(options);
    }

    turnStartParams(options: Partial<CodexProviderOptions>): Record<string, unknown> {
        return this.buildTurnStartParams('thread-1', 'prompt', undefined, options, 'C:\\workspace', true);
    }

    turnStartParamsWithInput(): Record<string, unknown> {
        return this.buildTurnStartParams('thread-1', 'fallback prompt', [
            { type: 'text', text: 'hello' },
            { type: 'image', url: 'data:image/png;base64,abc' }
        ], {}, 'C:\\workspace', true);
    }

    snapshot(cwd: string): Promise<Map<string, unknown>> {
        return this.snapshotWorkspaceFiles(cwd) as Promise<Map<string, unknown>>;
    }

    syntheticChanges(streamId: string, cwd: string, before: Map<string, unknown>): Promise<void> {
        return this.sendSyntheticFileChanges(streamId, cwd, before as never);
    }

    accountStatus(value: unknown): unknown {
        return this.extractAccountStatus(value);
    }

    capabilityStatus(value: unknown): unknown {
        return this.extractCapabilities(value);
    }

    async spawnEnvironmentFingerprint(sessionId: string | undefined): Promise<string> {
        return (await this.resolveSpawnEnvironment({ cwd: 'C:\\workspace', sessionId })).fingerprint;
    }

    async spawnEnvironmentPath(sessionId: string | undefined): Promise<string | undefined> {
        const resolved = await this.resolveSpawnEnvironment({ cwd: 'C:\\workspace', sessionId });
        const pathKey = Object.keys(resolved.env).find(key => key.toLowerCase() === 'path');
        return pathKey ? resolved.env[pathKey] : undefined;
    }

    setSpawnEnvironmentContributions(contributions: CodexProviderSpawnEnvironmentContribution[]): void {
        (this as unknown as { spawnEnvironmentContributions: ContributionProvider<CodexProviderSpawnEnvironmentContribution> }).spawnEnvironmentContributions = {
            getContributions: () => contributions
        };
    }
}

describe('CodexProviderServiceImpl', () => {
    let service: TestCodexProviderServiceImpl;

    beforeEach(() => {
        service = new TestCodexProviderServiceImpl();
    });

    it('extracts camel-case and snake-case thread ids', () => {
        expect(service.threadId({ threadId: 'camel' })).equals('camel');
        expect(service.threadId({ thread_id: 'snake' })).equals('snake');
        expect(service.threadId({ thread: { id: 'nested' } })).equals('nested');
    });

    it('extracts camel-case and snake-case turn ids', () => {
        expect(service.turnId({ turnId: 'camel' })).equals('camel');
        expect(service.turnId({ turn_id: 'snake' })).equals('snake');
        expect(service.turnId({ turn: { id: 'nested' } })).equals('nested');
    });

    it('reads file changes with string or object kind values', () => {
        const changes = service.fileChanges({
            changes: [
                { path: 'a.txt', kind: 'modify', diff: '--- a' },
                { path: 'b.txt', kind: { type: 'add' } },
                { path: '', kind: { type: 'delete' } }
            ]
        });

        expect(changes).deep.equals([
            { path: 'a.txt', kind: 'modify', diff: '--- a' },
            { path: 'b.txt', kind: 'add', diff: '' }
        ]);
    });

    it('reads nested item file changes', () => {
        expect(service.fileChanges({
            item: {
                changes: [{ path: 'nested.txt', kind: { type: 'add' } }]
            }
        })).deep.equals([{ path: 'nested.txt', kind: 'add', diff: '' }]);
    });

    it('detects cancellation errors from app-server responses', () => {
        expect(service.cancellationError(new Error('Canceled'))).equals(true);
        expect(service.cancellationError('cancelled')).equals(true);
        expect(service.cancellationError(new Error('Other'))).equals(false);
    });

    it('normalizes legacy approval decisions', () => {
        expect(service.approvalResponse('execCommandApproval', {}, 'accept')).deep.equals({ decision: 'approved' });
        expect(service.approvalResponse('applyPatchApproval', {}, 'acceptForSession')).deep.equals({ decision: 'approved_for_session' });
        expect(service.approvalResponse('applyPatchApproval', {}, 'decline')).deep.equals({ decision: 'denied' });
        expect(service.approvalResponse('execCommandApproval', {}, 'cancel')).deep.equals({ decision: 'abort' });
    });

    it('builds granular permission approval responses', () => {
        const permissions = {
            fileSystem: { read: ['C:\\workspace'], write: ['C:\\workspace'] },
            network: { enabled: true }
        };

        expect(service.approvalResponse('item/permissions/requestApproval', { permissions }, 'acceptForSession')).deep.equals({
            permissions,
            scope: 'session',
            strictAutoReview: false
        });
        expect(service.approvalResponse('item/permissions/requestApproval', { permissions }, 'cancel')).deep.equals({
            permissions: {},
            scope: 'turn',
            strictAutoReview: false
        });
    });

    it('maps thread-only Codex options to app-server config', () => {
        expect(service.threadConfig({
            verbosity: 'high',
            webSearch: 'live',
            webSearchContextSize: 'low'
        })).deep.equals({
            model_verbosity: 'high',
            web_search: 'live',
            tools: {
                web_search: {
                    context_size: 'low',
                    allowed_domains: undefined,
                    location: undefined
                },
                view_image: true
            }
        });
    });

    it('does not send unsupported turn-start overrides', () => {
        const params = service.turnStartParams({
            verbosity: 'high',
            collaborationMode: 'plan',
            reasoningEffort: 'medium',
            approvalPolicy: 'on-request',
            sandboxMode: 'workspace-write'
        });

        expect(params).to.include({
            effort: 'medium',
            approvalPolicy: 'on-request'
        });
        expect(params).not.to.have.property('verbosity');
        expect(params).not.to.have.property('collaborationMode');
    });

    it('passes structured text and image input to turn/start', () => {
        expect(service.turnStartParamsWithInput().input).deep.equals([
            { type: 'text', text: 'The IDE working directory is "C:\\workspace".', text_elements: [] },
            { type: 'text', text: 'hello', text_elements: [] },
            { type: 'image', url: 'data:image/png;base64,abc' }
        ]);
    });

    it('extracts optional account and capability status', () => {
        expect(service.accountStatus({
            account: { email: 'dev@example.com', status: 'authenticated' }
        })).deep.equals({
            authenticated: true,
            authStatus: 'authenticated',
            accountLabel: 'dev@example.com'
        });
        expect(service.capabilityStatus({
            tools: { web_search: true, image_generation: true, apply_patch: true },
            capabilities: { mcp: true, shellExecution: true }
        })).deep.includes({
            webSearch: true,
            imageGeneration: true,
            mcp: true,
            applyPatch: true,
            shellExecution: true
        });
    });

    it('merges session-scoped spawn environment contributions into PATH', async () => {
        service.setSpawnEnvironmentContributions([
            {
                async contributeCodexProviderSpawnEnvironment(context) {
                    return {
                        env: { CYBERVINCI_OUTPUT_CLEANER_SESSION: context.sessionId ?? '' },
                        pathEntries: ['C:\\cleaner\\bin'],
                        fingerprint: `session:${context.sessionId ?? ''}`
                    };
                }
            }
        ]);

        const fingerprint = await service.spawnEnvironmentFingerprint('chat-1');
        const mergedPath = await service.spawnEnvironmentPath('chat-1');

        expect(fingerprint).to.contain('chat-1');
        expect(mergedPath?.split(path.delimiter)[0]).to.equal('C:\\cleaner\\bin');
    });

    it('emits synthetic file changes with unified diffs for shell-created edits', async () => {
        const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'codex-provider-service-'));
        const tokens: Array<CodexProviderStreamMessage | undefined> = [];
        const client: CodexProviderClient = {
            sendToken: (_streamId, token) => tokens.push(token),
            sendError: () => undefined
        };
        service.setClient(client);
        try {
            await fs.promises.writeFile(path.join(tempDir, 'existing.txt'), 'before\n');
            const before = await service.snapshot(tempDir);
            await fs.promises.writeFile(path.join(tempDir, 'existing.txt'), 'after\n');
            await fs.promises.writeFile(path.join(tempDir, 'created.txt'), 'created\n');

            await service.syntheticChanges('stream-1', tempDir, before);

            const notification = tokens.find(token => token?.type === 'notification' && token.method === 'item/completed');
            const item = notification?.type === 'notification'
                ? (notification.params as { item?: { changes?: CodexProviderFileUpdateChange[] } } | undefined)?.item
                : undefined;
            expect(item?.changes?.map(change => change.path).sort()).deep.equals(['created.txt', 'existing.txt']);
            expect(item?.changes?.find(change => change.path === 'created.txt')?.diff).contains('+++ b/created.txt');
            expect(item?.changes?.find(change => change.path === 'existing.txt')?.diff).contains('-before');
            expect(item?.changes?.find(change => change.path === 'existing.txt')?.diff).contains('+after');
        } finally {
            await fs.promises.rm(tempDir, { recursive: true, force: true });
        }
    });
});

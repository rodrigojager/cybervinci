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
import { CodexProviderBackendRequest, CodexProviderClient, CodexProviderRuntime, CodexProviderStreamMessage } from '../common/ai-providers-service';
import { CodexProviderSpawnEnvironmentContribution } from './ai-providers-spawn-environment';
import { CodexProviderServiceImpl } from './ai-providers-service-impl';

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

    openCodeProvider(model: string | undefined): string | undefined {
        return this.openCodeProviderFromModel(model);
    }

    openCodeRunArgs(request: CodexProviderBackendRequest): string[] {
        return this.buildOpenCodeRunArgs(request);
    }

    cliRunArgs(runtime: CodexProviderRuntime, request: CodexProviderBackendRequest): string[] {
        const adapter = this.resolveCliAdapter(runtime);
        if (!adapter) {
            throw new Error(`No adapter for ${runtime}`);
        }
        return this.buildCliRunArgs(adapter, request);
    }

    openCodeEvent(event: Record<string, unknown>): Array<CodexProviderStreamMessage | undefined> {
        const tokens: Array<CodexProviderStreamMessage | undefined> = [];
        const client: CodexProviderClient = {
            sendToken: (_streamId, token) => tokens.push(token),
            sendError: () => undefined
        };
        this.handleOpenCodeRunEvent('stream-1', event, client);
        return tokens;
    }

    cliEvent(runtime: CodexProviderRuntime, event: Record<string, unknown>): Array<CodexProviderStreamMessage | undefined> {
        const adapter = this.resolveCliAdapter(runtime);
        if (!adapter) {
            throw new Error(`No adapter for ${runtime}`);
        }
        const tokens: Array<CodexProviderStreamMessage | undefined> = [];
        const client: CodexProviderClient = {
            sendToken: (_streamId, token) => tokens.push(token),
            sendError: () => undefined
        };
        this.handleGenericCliRunEvent(adapter, 'stream-1', event, client);
        return tokens;
    }

    cliEventSequence(runtime: CodexProviderRuntime, events: Record<string, unknown>[]): Array<CodexProviderStreamMessage | undefined> {
        const adapter = this.resolveCliAdapter(runtime);
        if (!adapter) {
            throw new Error(`No adapter for ${runtime}`);
        }
        const tokens: Array<CodexProviderStreamMessage | undefined> = [];
        const client: CodexProviderClient = {
            sendToken: (_streamId, token) => tokens.push(token),
            sendError: () => undefined
        };
        this.activeStreams.set('stream-1', {
            streamId: 'stream-1',
            runtime,
            client,
            complete: () => undefined
        });
        for (const event of events) {
            this.handleGenericCliRunEvent(adapter, 'stream-1', event, client);
        }
        this.activeStreams.delete('stream-1');
        return tokens;
    }

    directRequest(modelProvider: string, request: CodexProviderBackendRequest): { model: string, protocol: string, url: string, headers: Record<string, string>, body: Record<string, unknown> } {
        const provider = this.resolveDirectHttpProviderConfig({
            runtime: 'direct-http',
            modelProvider,
            model: request.options?.model
        });
        if (!provider) {
            throw new Error(`No direct provider for ${modelProvider}`);
        }
        const model = this.resolveDirectHttpModel(provider, request);
        const protocol = this.resolveDirectHttpProtocol(provider, model);
        return {
            model,
            protocol,
            ...this.buildDirectHttpRequest(provider, protocol, request, 'C:\\workspace', model, 'secret')
        };
    }

    directModelMetadata(modelProvider: string, value: unknown): { id: string; label?: string; cost?: string } | undefined {
        const provider = this.resolveDirectHttpProviderConfig({
            runtime: 'direct-http',
            modelProvider
        });
        if (!provider) {
            throw new Error(`No direct provider for ${modelProvider}`);
        }
        const metadata = this.toDirectHttpModelMetadata(provider, value);
        return metadata ? {
            id: metadata.id,
            label: metadata.label,
            cost: metadata.cost
        } : undefined;
    }

    directUnavailableModel(
        modelProvider: string,
        model: string,
        detail: string,
        status = 401
    ): { id: string; unavailable?: boolean; unavailableReason?: string } | undefined {
        const provider = this.resolveDirectHttpProviderConfig({
            runtime: 'direct-http',
            modelProvider
        });
        if (!provider) {
            throw new Error(`No direct provider for ${modelProvider}`);
        }
        this.markDirectHttpModelUnavailableFromError(provider, model, status, detail);
        const metadata = this.applyDirectHttpUnavailableModels(provider, [{
            id: this.withDirectProviderPrefix(provider, model)
        }])?.[0];
        return metadata ? {
            id: metadata.id,
            unavailable: metadata.unavailable,
            unavailableReason: metadata.unavailableReason
        } : undefined;
    }

    directEvent(protocol: 'openai-chat' | 'openai-responses' | 'anthropic-messages' | 'google-generate', block: string): Array<CodexProviderStreamMessage | undefined> {
        const tokens: Array<CodexProviderStreamMessage | undefined> = [];
        const client: CodexProviderClient = {
            sendToken: (_streamId, token) => tokens.push(token),
            sendError: () => undefined
        };
        this.handleDirectHttpSseBlock(protocol, 'stream-1', block, client);
        return tokens;
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
        const input = service.turnStartParamsWithInput().input as Array<{ type: string; text?: string; url?: string; text_elements?: unknown[] }>;
        expect(input[0]).deep.equals({ type: 'text', text: 'The IDE working directory is "C:\\workspace".', text_elements: [] });
        expect(input[1].text).to.contain('cybervinci.search.graphFirst');
        expect(input.slice(2)).deep.equals([
            { type: 'text', text: 'hello', text_elements: [] },
            { type: 'image', url: 'data:image/png;base64,abc' }
        ]);
    });

    it('parses OpenCode provider refs using the first path segment only', () => {
        expect(service.openCodeProvider('openrouter/openai/gpt-5')).equals('openrouter');
        expect(service.openCodeProvider('opencode-go/deepseek-v4-flash')).equals('opencode-go');
        expect(service.openCodeProvider('gpt-5-codex')).equals(undefined);
    });

    it('builds OpenCode CLI args without splitting nested model ids', () => {
        expect(service.openCodeRunArgs({
            prompt: 'hello',
            runtime: 'opencode-cli',
            openCodeAgent: 'general',
            openCodeVariant: 'high',
            options: {
                model: 'openrouter/openai/gpt-5',
                reasoningEffort: 'medium'
            }
        })).deep.equals([
            'run',
            '--format',
            'json',
            '--model',
            'openrouter/openai/gpt-5',
            '--agent',
            'general',
            '--variant',
            'high',
            '--thinking'
        ]);
    });

    it('builds Gemini CLI headless args with model and approval mode', () => {
        expect(service.cliRunArgs('gemini-cli', {
            prompt: 'hello',
            runtime: 'gemini-cli',
            options: {
                model: 'gemini-2.5-pro',
                sandboxMode: 'workspace-write'
            }
        })).deep.equals([
            '--output-format',
            'stream-json',
            '--skip-trust',
            '--model',
            'gemini-2.5-pro',
            '--approval-mode',
            'auto_edit'
        ]);
    });

    it('builds Claude Code print-mode args with agent, effort, and permissions', () => {
        expect(service.cliRunArgs('claude-code-cli', {
            prompt: 'hello',
            runtime: 'claude-code-cli',
            claudeAgent: 'general',
            options: {
                model: 'sonnet',
                reasoningEffort: 'high',
                sandboxMode: 'workspace-write'
            }
        })).deep.equals([
            '--print',
            '--output-format',
            'stream-json',
            '--include-partial-messages',
            '--verbose',
            '--model',
            'sonnet',
            '--agent',
            'general',
            '--effort',
            'high',
            '--permission-mode',
            'acceptEdits'
        ]);
    });

    it('builds Cursor print-mode args with model, mode, and sandbox', () => {
        expect(service.cliRunArgs('cursor-cli', {
            prompt: 'hello',
            runtime: 'cursor-cli',
            cursorMode: 'ask',
            options: {
                model: 'gpt-5',
                sandboxMode: 'read-only'
            }
        })).deep.equals([
            '--print',
            '--output-format',
            'stream-json',
            '--stream-partial-output',
            '--trust',
            '--model',
            'gpt-5',
            '--mode',
            'ask',
            '--sandbox',
            'enabled'
        ]);
    });

    it('builds direct OpenRouter chat requests without requiring opencode', () => {
        const built = service.directRequest('openrouter', {
            prompt: 'hello',
            runtime: 'direct-http',
            modelProvider: 'openrouter',
            openRouterApiKey: 'secret',
            options: {
                model: 'openrouter/openai/gpt-5'
            }
        });

        expect(built.model).equals('openai/gpt-5');
        expect(built.protocol).equals('openai-chat');
        expect(built.url).equals('https://openrouter.ai/api/v1/chat/completions');
        expect(built.headers.authorization).equals('Bearer secret');
        expect(built.body.model).equals('openai/gpt-5');
    });

    it('builds direct OpenCode Go requests with Anthropic messages when the model requires it', () => {
        const built = service.directRequest('opencode-go', {
            prompt: 'hello',
            runtime: 'direct-http',
            modelProvider: 'opencode-go',
            openCodeApiKey: 'secret',
            options: {
                model: 'opencode-go/minimax-m3'
            }
        });

        expect(built.model).equals('minimax-m3');
        expect(built.protocol).equals('anthropic-messages');
        expect(built.url).equals('https://opencode.ai/zen/go/v1/messages');
        expect(built.headers['x-api-key']).equals('secret');
        expect(built.body.model).equals('minimax-m3');
    });

    it('builds direct OpenCode Zen GPT requests with Responses API', () => {
        const built = service.directRequest('opencode', {
            prompt: 'hello',
            runtime: 'direct-http',
            modelProvider: 'opencode',
            openCodeApiKey: 'secret',
            options: {
                model: 'opencode/gpt-5-codex'
            }
        });

        expect(built.model).equals('gpt-5-codex');
        expect(built.protocol).equals('openai-responses');
        expect(built.url).equals('https://opencode.ai/zen/v1/responses');
        expect(built.headers.authorization).equals('Bearer secret');
        expect(built.body.model).equals('gpt-5-codex');
    });

    it('marks OpenRouter free variants from model metadata', () => {
        expect(service.directModelMetadata('openrouter', {
            id: 'nvidia/nemotron-3-ultra:free',
            name: 'Nemotron Free',
            pricing: { prompt: '0', completion: '0' }
        })).deep.equals({
            id: 'openrouter/nvidia/nemotron-3-ultra:free',
            label: 'Nemotron Free',
            cost: 'free'
        });
    });

    it('marks OpenCode Zen free models as limited free', () => {
        expect(service.directModelMetadata('opencode', {
            id: 'deepseek-v4-flash-free',
            pricing: { prompt: 'Free', completion: 'Free' }
        })).deep.equals({
            id: 'opencode/deepseek-v4-flash-free',
            label: 'deepseek-v4-flash-free',
            cost: 'free-limited'
        });
    });

    it('marks known OpenCode Zen free models without a free suffix as limited free', () => {
        expect(service.directModelMetadata('opencode', {
            id: 'big-pickle'
        })).deep.equals({
            id: 'opencode/big-pickle',
            label: 'big-pickle',
            cost: 'free-limited'
        });
    });

    it('marks expired OpenCode Zen promotional models as unavailable after provider rejection', () => {
        expect(service.directUnavailableModel('opencode', 'qwen3.6-plus-free', JSON.stringify({
            type: 'error',
            error: {
                type: 'ModelError',
                message: 'Free promotion has ended for Qwen3.6 Plus Free. You can continue using the model by subscribing to OpenCode Go - https://opencode.ai/go'
            }
        }))).deep.equals({
            id: 'opencode/qwen3.6-plus-free',
            unavailable: true,
            unavailableReason: 'Free promotion has ended for Qwen3.6 Plus Free. You can continue using the model by subscribing to OpenCode Go - https://opencode.ai/go'
        });
    });

    it('marks OpenCode Go models as subscription included by default', () => {
        expect(service.directModelMetadata('opencode-go', {
            id: 'kimi-k2.7',
            pricing: { prompt: '0.95', completion: '4.00' }
        })).deep.equals({
            id: 'opencode-go/kimi-k2.7',
            label: 'kimi-k2.7',
            cost: 'included'
        });
    });

    it('maps OpenCode JSON events to Theia-compatible stream notifications', () => {
        const text = service.openCodeEvent({
            type: 'text',
            sessionID: 'session-1',
            part: { type: 'text', text: 'hello' }
        });
        expect(text[0]).deep.equals({
            type: 'notification',
            method: 'item/agentMessage/delta',
            params: {
                delta: 'hello',
                runtime: 'opencode-cli',
                sessionID: 'session-1'
            }
        });

        const reasoning = service.openCodeEvent({
            type: 'reasoning',
            sessionID: 'session-1',
            part: { type: 'reasoning', text: 'thinking' }
        });
        expect(reasoning[0]).deep.equals({
            type: 'notification',
            method: 'item/reasoning/textDelta',
            params: {
                delta: 'thinking',
                runtime: 'opencode-cli',
                sessionID: 'session-1'
            }
        });
    });

    it('maps direct provider SSE events to Theia-compatible stream notifications', () => {
        const chat = service.directEvent('openai-chat', 'data: {"choices":[{"delta":{"content":"hello","reasoning_content":"thinking"}}]}');
        expect(chat[0]).deep.equals({
            type: 'notification',
            method: 'item/reasoning/textDelta',
            params: {
                delta: 'thinking',
                runtime: 'direct-http'
            }
        });
        expect(chat[1]).deep.equals({
            type: 'notification',
            method: 'item/agentMessage/delta',
            params: {
                delta: 'hello',
                runtime: 'direct-http'
            }
        });

        const responses = service.directEvent('openai-responses', 'event: response.output_text.delta\ndata: {"type":"response.output_text.delta","delta":"hi"}');
        expect(responses[0]).deep.equals({
            type: 'notification',
            method: 'item/agentMessage/delta',
            params: {
                delta: 'hi',
                runtime: 'direct-http'
            }
        });

        const anthropic = service.directEvent('anthropic-messages', 'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"claude"}}');
        expect(anthropic[0]).deep.equals({
            type: 'notification',
            method: 'item/agentMessage/delta',
            params: {
                delta: 'claude',
                runtime: 'direct-http'
            }
        });
    });

    it('maps generic CLI JSON events to Theia-compatible stream notifications', () => {
        const gemini = service.cliEvent('gemini-cli', {
            response: 'gemini text'
        });
        expect(gemini[0]).deep.equals({
            type: 'notification',
            method: 'item/agentMessage/delta',
            params: {
                delta: 'gemini text',
                runtime: 'gemini-cli'
            }
        });

        const claude = service.cliEvent('claude-code-cli', {
            type: 'assistant',
            message: {
                content: [{ type: 'text', text: 'claude text' }]
            }
        });
        expect(claude[0]).deep.equals({
            type: 'notification',
            method: 'item/agentMessage/delta',
            params: {
                delta: 'claude text',
                runtime: 'claude-code-cli'
            }
        });

        const cursor = service.cliEvent('cursor-cli', {
            type: 'text',
            delta: 'cursor text'
        });
        expect(cursor[0]).deep.equals({
            type: 'notification',
            method: 'item/agentMessage/delta',
            params: {
                delta: 'cursor text',
                runtime: 'cursor-cli'
            }
        });
    });

    it('does not suppress a final generic CLI response after reasoning-only deltas', () => {
        const tokens = service.cliEventSequence('gemini-cli', [{
            type: 'reasoning',
            reasoning: 'planning privately'
        }, {
            type: 'result',
            result: '{"type":"operation","operation":{"operation":"updatePage","changes":{"background":"#ffffff"}}}'
        }]);

        expect(tokens.map(token => (token as { method?: string } | undefined)?.method)).to.deep.equal([
            'item/reasoning/textDelta',
            'item/agentMessage/delta'
        ]);
        expect(tokens[1]).deep.includes({
            type: 'notification',
            method: 'item/agentMessage/delta'
        });
        expect((tokens[1] as { params?: unknown }).params).deep.includes({
            delta: '{"type":"operation","operation":{"operation":"updatePage","changes":{"background":"#ffffff"}}}',
            runtime: 'gemini-cli'
        });
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
        const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'ai-providers-service-'));
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

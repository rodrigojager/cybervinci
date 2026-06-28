import { expect } from 'chai';
import { LanguageModel, LanguageModelRegistry, LanguageModelService } from '@theia/ai-core';
import { CodexProviderService } from '@cybervinci/ai-providers/lib/common/ai-providers-service';
import { FlowWorkflowState, FlowWorkload } from '../common';
import { customProviderCommandEnvName, FlowAgentProviderRegistry } from './flow-agent-provider-registry';

describe('FlowAgentProviderRegistry', () => {
    const envKeys = [
        'FLOW_AGENT_PROVIDER',
        'FLOW_AGENT_LLM_COMMAND',
        'FLOW_AGENT_COMMAND',
        'FLOW_AGENT_MODEL_ID',
        'FLOW_AGENT_LLM_MODEL_ID',
        customProviderCommandEnvName('open-router')
    ];
    let envSnapshot: Record<string, string | undefined>;

    beforeEach(() => {
        envSnapshot = snapshotEnv(envKeys);
        restoreEnv(Object.fromEntries(envKeys.map(key => [key, undefined])), envKeys);
    });

    afterEach(() => {
        restoreEnv(envSnapshot, envKeys);
    });

    it('resolves explicit command provider from state provider fields', async () => {
        process.env.FLOW_AGENT_LLM_COMMAND = 'node ./flow-agent-provider.js';
        const registry = new FlowAgentProviderRegistry();

        const provider = await registry.resolveProvider(createResolutionContext({
            provider: {
                providerId: 'command',
                modelId: 'ignored-by-command',
                options: { temperature: 0.2 }
            }
        }));

        expect('command' in provider && provider.command).to.equal('node ./flow-agent-provider.js');
        expect(provider.providerId).to.equal('command');
    });

    it('resolves custom command-backed providers through sanitized env vars', async () => {
        process.env[customProviderCommandEnvName('open-router')] = 'node ./open-router-provider.js';
        const registry = new FlowAgentProviderRegistry();

        const provider = await registry.resolveProvider(createResolutionContext({
            provider: {
                providerId: 'open-router'
            }
        }));

        expect('command' in provider && provider.command).to.equal('node ./open-router-provider.js');
        expect(provider.providerId).to.equal('open-router');
    });

    it('fails unsupported providers with state id, provider id, and configuration hint', async () => {
        const registry = new FlowAgentProviderRegistry();

        await expectRejectedWith(
            registry.resolveProvider(createResolutionContext({ provider: { providerId: 'openrouter' } })),
            ['state "agent"', '"openrouter"', 'FLOW_AGENT_PROVIDER_OPENROUTER_COMMAND']
        );
    });

    it('fails missing providers instead of selecting deterministic fallback', async () => {
        const registry = new FlowAgentProviderRegistry();

        await expectRejectedWith(
            registry.resolveProvider(createResolutionContext()),
            ['provider is missing', 'state "agent"', 'Deterministic production fallback is disabled']
        );
    });

    it('does not auto-select Codex when FLOW_AGENT_PROVIDER is unset or auto', async () => {
        const registry = new FlowAgentProviderRegistry(undefined, undefined, codexProviderService(true));

        await expectRejectedWith(
            registry.resolveProvider(createResolutionContext()),
            ['provider is missing', 'Deterministic production fallback is disabled']
        );

        process.env.FLOW_AGENT_PROVIDER = 'auto';

        await expectRejectedWith(
            registry.resolveProvider(createResolutionContext()),
            ['provider is missing', 'Deterministic production fallback is disabled']
        );
    });

    it('resolves explicit FLOW_AGENT_PROVIDER=codex-provider when Codex is available', async () => {
        process.env.FLOW_AGENT_PROVIDER = 'codex-provider';
        const registry = new FlowAgentProviderRegistry(undefined, undefined, codexProviderService(true));

        const provider = await registry.resolveProvider(createResolutionContext());

        expect('codexProvider' in provider).to.equal(true);
        expect(provider.providerId).to.equal('codex-provider');
    });

    it('preserves the selected model for the Codex provider', async () => {
        const registry = new FlowAgentProviderRegistry(undefined, undefined, codexProviderService(true));

        const provider = await registry.resolveProvider(createResolutionContext({
            provider: {
                providerId: 'codex-provider',
                modelId: 'gpt-5-codex'
            }
        }));

        expect('codexProvider' in provider).to.equal(true);
        expect('codexProvider' in provider && provider.modelId).to.equal('gpt-5-codex');
    });

    it('preserves picker runtime and model provider options for generic Codex provider states', async () => {
        const statusRequests: unknown[] = [];
        const registry = new FlowAgentProviderRegistry(undefined, undefined, codexProviderService(true, statusRequests));

        const provider = await registry.resolveProvider(createResolutionContext({
            provider: {
                providerId: 'codex-provider',
                modelId: 'opencode/gpt-5.5',
                options: {
                    runtime: 'direct-http',
                    modelProvider: 'opencode',
                    openCodeVariant: 'zen'
                }
            }
        }));

        expect('codexProvider' in provider).to.equal(true);
        expect('codexProvider' in provider && provider.request?.runtime).to.equal('direct-http');
        expect('codexProvider' in provider && provider.request?.modelProvider).to.equal('opencode');
        expect('codexProvider' in provider && provider.request?.openCodeVariant).to.equal('zen');
        expect(statusRequests[0]).to.deep.include({
            runtime: 'direct-http',
            modelProvider: 'opencode',
            model: 'opencode/gpt-5.5'
        });
    });

    it('allows e2e mock only when explicitly configured through FLOW_AGENT_PROVIDER', async () => {
        const registry = new FlowAgentProviderRegistry();
        await expectRejectedWith(
            registry.resolveProvider(createResolutionContext({ provider: { providerId: 'e2e-mock' } })),
            ['Set FLOW_AGENT_PROVIDER=e2e-mock']
        );

        process.env.FLOW_AGENT_PROVIDER = 'e2e-mock';
        const provider = await registry.resolveProvider(createResolutionContext({ provider: { providerId: 'e2e-mock' } }));

        expect('mock' in provider && provider.mock).to.equal('e2e');
    });

    it('fails clearly when a requested Theia modelId is unavailable', async () => {
        const registry = new FlowAgentProviderRegistry(unavailableLanguageModelRegistry(), {} as unknown as LanguageModelService);

        await expectRejectedWith(
            registry.resolveProvider(createResolutionContext({
                provider: {
                    providerId: 'theia-language-model',
                    modelId: 'missing-model'
                }
            })),
            ['state "agent"', '"theia-language-model"', 'modelId "missing-model"']
        );
    });

    it('inherits the selected IDE chat language model when no node provider is configured', async () => {
        const registry = new FlowAgentProviderRegistry(selectedLanguageModelRegistry('OpenCoder', 'chat', readyLanguageModel('gpt-5.5')), {} as unknown as LanguageModelService);

        const provider = await registry.resolveProvider(createResolutionContext());

        expect(provider.providerId).to.equal('theia');
        expect('model' in provider && provider.model.id).to.equal('gpt-5.5');
        expect('agentId' in provider && provider.agentId).to.equal('OpenCoder');
        expect('purpose' in provider && provider.purpose).to.equal('chat');
    });

    it('inherits the selected OpenPencil design language model when chat is not configured', async () => {
        const registry = new FlowAgentProviderRegistry(selectedLanguageModelRegistry('OpenPencil', 'openpencil-design', readyLanguageModel('design-model')), {} as unknown as LanguageModelService);

        const provider = await registry.resolveProvider(createResolutionContext());

        expect(provider.providerId).to.equal('theia');
        expect('model' in provider && provider.model.id).to.equal('design-model');
        expect('agentId' in provider && provider.agentId).to.equal('OpenPencil');
        expect('purpose' in provider && provider.purpose).to.equal('openpencil-design');
    });

    it('does not inherit arbitrary ready models that were not selected for chat or design', async () => {
        const registry = new FlowAgentProviderRegistry(readyButUnselectedLanguageModelRegistry(), {} as unknown as LanguageModelService);

        await expectRejectedWith(
            registry.resolveProvider(createResolutionContext()),
            ['provider is missing', 'Deterministic production fallback is disabled']
        );
    });
});

function createResolutionContext(statePatch: Partial<FlowWorkflowState> = {}): { state: FlowWorkflowState; workload: FlowWorkload } {
    const state: FlowWorkflowState = {
        id: 'agent',
        type: 'agent',
        agent: 'reviewer',
        outputs: ['report.md'],
        ...statePatch
    };
    return {
        state,
        workload: {
            id: 'workload-1',
            runId: 'run-1',
            stateId: state.id || 'agent',
            status: 'running',
            agent: state.agent,
            inputArtifacts: [],
            outputArtifacts: [],
            issues: [],
            effectIds: [],
            createdAt: '2026-05-19T00:00:00.000Z',
            updatedAt: '2026-05-19T00:00:00.000Z'
        }
    };
}

function unavailableLanguageModelRegistry(): LanguageModelRegistry {
    return {
        getLanguageModel: async (_modelId: string) => undefined,
        selectLanguageModel: async () => undefined,
        getLanguageModels: async () => [] as LanguageModel[]
    } as unknown as LanguageModelRegistry;
}

function selectedLanguageModelRegistry(agentId: string, purpose: string, model: LanguageModel): LanguageModelRegistry {
    return {
        getLanguageModel: async (_modelId: string) => undefined,
        selectLanguageModel: async (selection: { agent: string; purpose: string }) => selection.agent === agentId && selection.purpose === purpose ? model : undefined,
        getLanguageModels: async () => [] as LanguageModel[]
    } as unknown as LanguageModelRegistry;
}

function readyButUnselectedLanguageModelRegistry(): LanguageModelRegistry {
    return {
        getLanguageModel: async (_modelId: string) => undefined,
        selectLanguageModel: async () => undefined,
        getLanguageModels: async () => [readyLanguageModel('unselected-ready-model')]
    } as unknown as LanguageModelRegistry;
}

function readyLanguageModel(id: string): LanguageModel {
    return {
        id,
        name: id,
        status: { status: 'ready' }
    } as unknown as LanguageModel;
}

function codexProviderService(available: boolean, statusRequests: unknown[] = []): CodexProviderService {
    return {
        getStatus: async (request: unknown) => {
            statusRequests.push(request);
            return {
                available,
                authenticated: available,
                capabilities: { imageGeneration: available }
            };
        }
    } as unknown as CodexProviderService;
}

async function expectRejectedWith(action: Promise<unknown>, snippets: string[]): Promise<void> {
    try {
        await action;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        for (const snippet of snippets) {
            expect(message).to.contain(snippet);
        }
        return;
    }
    throw new Error('Expected promise to be rejected.');
}

function snapshotEnv(keys: string[]): Record<string, string | undefined> {
    return Object.fromEntries(keys.map(key => [key, process.env[key]]));
}

function restoreEnv(snapshot: Record<string, string | undefined>, keys: string[]): void {
    for (const key of keys) {
        const value = snapshot[key];
        if (value === undefined) {
            delete process.env[key];
        } else {
            process.env[key] = value;
        }
    }
}

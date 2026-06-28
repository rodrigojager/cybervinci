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
import { JsonRepairService, REASONING_PROFILES, ReasoningStage, VirtualReasoningEngine } from './virtual-reasoning';

describe('JsonRepairService', () => {
    const service = new JsonRepairService();

    it('parses valid JSON directly', () => {
        const result = service.parse<{ approved: boolean }>('{"approved":true}', { approved: false });

        expect(result).deep.equals({
            success: true,
            value: { approved: true },
            source: 'direct'
        });
    });

    it('extracts JSON from surrounding text', () => {
        const result = service.parse<{ approved: boolean }>('Review result:\n```json\n{"approved":true}\n```', { approved: false });

        expect(result).deep.equals({
            success: true,
            value: { approved: true },
            source: 'extracted'
        });
    });

    it('uses fallback when JSON cannot be repaired locally', () => {
        const result = service.parse<{ approved: boolean }>('not json', { approved: false });

        expect(result.success).to.equal(false);
        expect(result.value).deep.equals({ approved: false });
        expect(result.source).to.equal('fallback');
    });

    it('asks a model repair function to rewrite invalid JSON before falling back', async () => {
        const prompts: string[] = [];

        const result = await service.parseWithModel<{ approved: boolean }>(
            'approved: yes',
            { approved: false },
            async prompt => {
                prompts.push(prompt);
                return '{"approved":true}';
            },
            '{"approved":true}'
        );

        expect(result).deep.equals({
            success: true,
            value: { approved: true },
            source: 'model'
        });
        expect(prompts[0]).to.contain('Rewrite the following model output as valid JSON only.');
        expect(prompts[0]).to.contain('approved: yes');
    });
});

describe('VirtualReasoningEngine', () => {
    it('defines MVP profiles with bounded internal call budgets', () => {
        expect(REASONING_PROFILES.off.maxInternalCalls).to.equal(1);
        expect(REASONING_PROFILES.fast.maxInternalCalls).to.equal(3);
        expect(REASONING_PROFILES.balanced.maxInternalCalls).to.equal(6);
        expect(REASONING_PROFILES.deep.maxInternalCalls).to.equal(9);
        expect(REASONING_PROFILES.coding.maxInternalCalls).to.equal(7);
        expect(REASONING_PROFILES.research.maxInternalCalls).to.equal(6);
        expect(REASONING_PROFILES.lats.maxInternalCalls).to.equal(9);
    });

    it('runs Off profile as a single direct model call', async () => {
        const stages: ReasoningStage[] = [];
        const engine = new VirtualReasoningEngine();

        const result = await engine.execute({
            mode: 'off',
            basePrompt: 'Answer directly.',
            invokeStage: async stage => {
                stages.push(stage);
                return 'direct answer';
            }
        });

        expect(stages).deep.equals(['draft']);
        expect(result.finalAnswer).to.equal('direct answer');
        expect(result.internalCallCount).to.equal(1);
    });

    it('runs Fast profile as draft, critique, and revise', async () => {
        const stages: ReasoningStage[] = [];
        const engine = new VirtualReasoningEngine();

        const result = await engine.execute({
            mode: 'fast',
            basePrompt: 'Explain this briefly.',
            invokeStage: async stage => {
                stages.push(stage);
                return `result:${stage}`;
            }
        });

        expect(stages).deep.equals(['draft', 'critique', 'revise']);
        expect(result.finalAnswer).to.equal('result:revise');
        expect(result.internalCallCount).to.equal(3);
        expect(result.log.stages.every(stage => stage.success)).to.equal(true);
    });

    it('runs Balanced profile through classify, plan, draft, critique, revise, and verify', async () => {
        const stages: ReasoningStage[] = [];
        const engine = new VirtualReasoningEngine();

        const result = await engine.execute({
            mode: 'balanced',
            basePrompt: 'Debug this TypeScript error.',
            invokeStage: async stage => {
                stages.push(stage);
                return stage === 'classify'
                    ? '{"taskType":"debugging","complexity":"medium","needsReasoning":true,"needsTools":false,"recommendedMode":"balanced","reason":"debug"}'
                    : `result:${stage}`;
            }
        });

        expect(stages).deep.equals(['classify', 'plan', 'draft', 'critique', 'revise', 'verify']);
        expect(result.state.classification?.taskType).to.equal('debugging');
        expect(result.finalAnswer).to.equal('result:revise');
    });

    it('resolves explicit advanced modes to dedicated profiles', () => {
        const engine = new VirtualReasoningEngine();

        expect(engine.resolveMode('Build the feature.', 'deep')).to.equal('deep');
        expect(engine.resolveMode('Build the feature.', 'coding')).to.equal('coding');
        expect(engine.resolveMode('Build the feature.', 'research')).to.equal('research');
        expect(engine.resolveMode('Build the feature.', 'lats')).to.equal('lats');
    });

    it('resolves Auto Virtual Reasoning to specialized profiles when the task warrants it', () => {
        const engine = new VirtualReasoningEngine();

        expect(engine.resolveMode('Debug this TypeScript error.', 'auto')).to.equal('coding');
        expect(engine.resolveMode('Research the tradeoffs and cite source needs.', 'auto')).to.equal('research');
        expect(engine.resolveMode('Plan a deep architecture migration with risks.', 'auto')).to.equal('deep');
    });

    it('runs Deep profile by drafting multiple candidates before synthesis', async () => {
        const stages: ReasoningStage[] = [];
        const engine = new VirtualReasoningEngine();

        const result = await engine.execute({
            mode: 'deep',
            basePrompt: 'Design a complex architecture migration.',
            invokeStage: async stage => {
                stages.push(stage);
                return stage === 'classify'
                    ? '{"taskType":"planning","complexity":"high","needsReasoning":true,"needsTools":false,"recommendedMode":"deep","reason":"complex"}'
                    : `result:${stage}:${stages.length}`;
            }
        });

        expect(stages).deep.equals(['classify', 'plan', 'draft', 'draft', 'draft', 'critique', 'revise', 'verify']);
        expect(result.profileUsed).to.equal('deep');
        expect(result.finalAnswer).to.equal('result:revise:7');
    });

    it('runs Coding profile with code review, verification, and a final repair pass', async () => {
        const stages: ReasoningStage[] = [];
        const engine = new VirtualReasoningEngine();

        const result = await engine.execute({
            mode: 'coding',
            basePrompt: 'Debug this TypeScript error.',
            invokeStage: async stage => {
                stages.push(stage);
                return stage === 'classify'
                    ? '{"taskType":"debugging","complexity":"medium","needsReasoning":true,"needsTools":false,"recommendedMode":"coding","reason":"debug"}'
                    : `result:${stage}:${stages.length}`;
            }
        });

        expect(stages).deep.equals(['classify', 'plan', 'draft', 'critique', 'revise', 'verify', 'revise']);
        expect(result.profileUsed).to.equal('coding');
        expect(result.finalAnswer).to.equal('result:revise:7');
    });

    it('runs Research profile with evidence-limit verification', async () => {
        const stages: ReasoningStage[] = [];
        const engine = new VirtualReasoningEngine();

        const result = await engine.execute({
            mode: 'research',
            basePrompt: 'Research the options and note missing evidence.',
            invokeStage: async stage => {
                stages.push(stage);
                return stage === 'classify'
                    ? '{"taskType":"research","complexity":"medium","needsReasoning":true,"needsTools":false,"recommendedMode":"research","reason":"research"}'
                    : `result:${stage}`;
            }
        });

        expect(stages).deep.equals(['classify', 'plan', 'draft', 'critique', 'revise', 'verify']);
        expect(result.profileUsed).to.equal('research');
        expect(result.finalAnswer).to.equal('result:revise');
    });

    it('runs LATS profile as a bounded branch expansion and synthesis', async () => {
        const stages: ReasoningStage[] = [];
        const engine = new VirtualReasoningEngine();

        const result = await engine.execute({
            mode: 'lats',
            basePrompt: 'Search alternatives before deciding.',
            invokeStage: async stage => {
                stages.push(stage);
                return stage === 'classify'
                    ? '{"taskType":"planning","complexity":"high","needsReasoning":true,"needsTools":false,"recommendedMode":"lats","reason":"search"}'
                    : `result:${stage}:${stages.length}`;
            }
        });

        expect(stages).deep.equals(['classify', 'plan', 'draft', 'draft', 'critique', 'draft', 'critique', 'revise', 'verify']);
        expect(result.profileUsed).to.equal('lats');
        expect(result.finalAnswer).to.equal('result:revise:8');
    });

    it('uses model-assisted JSON repair for invalid Balanced classification output within the call budget', async () => {
        const stages: ReasoningStage[] = [];
        const prompts: string[] = [];
        const engine = new VirtualReasoningEngine();

        const result = await engine.execute({
            mode: 'balanced',
            basePrompt: 'Plan a migration.',
            invokeStage: async (stage, prompt) => {
                stages.push(stage);
                prompts.push(prompt);
                if (stage === 'classify' && stages.filter(value => value === 'classify').length === 1) {
                    return 'taskType: planning';
                }
                if (stage === 'classify') {
                    return '{"taskType":"planning","complexity":"medium","needsReasoning":true,"needsTools":false,"recommendedMode":"balanced","reason":"migration planning"}';
                }
                return `result:${stage}`;
            }
        });

        expect(stages).deep.equals(['classify', 'classify', 'plan', 'draft', 'critique', 'revise']);
        expect(prompts[1]).to.contain('JSON repair step');
        expect(result.state.classification?.taskType).to.equal('planning');
        expect(result.finalAnswer).to.equal('result:revise');
        expect(result.internalCallCount).to.equal(6);
    });

    it('falls back to the best draft if a later required stage fails', async () => {
        const stages: ReasoningStage[] = [];
        const engine = new VirtualReasoningEngine();

        const result = await engine.execute({
            mode: 'balanced',
            basePrompt: 'Debug this TypeScript error.',
            invokeStage: async stage => {
                stages.push(stage);
                if (stage === 'classify') {
                    return '{"taskType":"debugging","complexity":"medium","needsReasoning":true,"needsTools":false,"recommendedMode":"balanced","reason":"debug"}';
                }
                if (stage === 'draft') {
                    return 'draft answer';
                }
                if (stage === 'revise') {
                    throw new Error('revision failed');
                }
                return `result:${stage}`;
            }
        });

        expect(stages).deep.equals(['classify', 'plan', 'draft', 'critique', 'revise', 'verify']);
        expect(result.finalAnswer).to.equal('draft answer');
    });
});

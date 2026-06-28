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
});

describe('VirtualReasoningEngine', () => {
    it('defines MVP profiles with bounded internal call budgets', () => {
        expect(REASONING_PROFILES.off.maxInternalCalls).to.equal(1);
        expect(REASONING_PROFILES.fast.maxInternalCalls).to.equal(3);
        expect(REASONING_PROFILES.balanced.maxInternalCalls).to.equal(6);
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

    it('maps prepared advanced modes to the Balanced MVP profile', () => {
        const engine = new VirtualReasoningEngine();

        expect(engine.resolveMode('Build the feature.', 'deep')).to.equal('balanced');
        expect(engine.resolveMode('Build the feature.', 'coding')).to.equal('balanced');
        expect(engine.resolveMode('Build the feature.', 'research')).to.equal('balanced');
        expect(engine.resolveMode('Build the feature.', 'lats')).to.equal('balanced');
    });

    it('falls back to the best draft if a later required stage fails', async () => {
        const stages: ReasoningStage[] = [];
        const engine = new VirtualReasoningEngine();

        const result = await engine.execute({
            mode: 'balanced',
            basePrompt: 'Debug this TypeScript error.',
            invokeStage: async stage => {
                stages.push(stage);
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

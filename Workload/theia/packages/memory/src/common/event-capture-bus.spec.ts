// *****************************************************************************
// Copyright (C) 2026.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { expect } from 'chai';
import { EventCaptureBus, InMemoryEventCaptureRepository } from './event-capture-bus';
import { MemoryEventType } from './memory-types';

describe('EventCaptureBus', () => {

    it('records supported Memory event categories through the repository', async () => {
        const repository = new InMemoryEventCaptureRepository();
        const bus = new EventCaptureBus(repository);
        const eventTypes: MemoryEventType[] = [
            'prompt.submitted',
            'tool.requested',
            'file.saved',
            'search.executed',
            'terminal.command',
            'build.succeeded',
            'test.failed',
            'context.accepted',
            'memory.created',
            'skill.suggested',
            'agent.completed'
        ];

        for (const eventType of eventTypes) {
            await bus.record({
                workspacePath: '/workspace',
                eventType,
                payload: JSON.stringify({ eventType, status: 'captured' }),
                relativePath: 'src/example.ts',
                promptSignature: 'intent:typescript:test'
            });
        }

        const events = await repository.listEvents({ workspacePath: '/workspace', limit: 20 });

        expect(events.map(event => event.eventType)).to.have.members(eventTypes);
    });

    it('minimizes prompt payloads and supports source filters when listing captured events', async () => {
        const bus = new EventCaptureBus();

        await bus.record({
            workspacePath: '/workspace',
            eventType: 'prompt.submitted',
            relativePath: 'src/payment.ts',
            promptSignature: 'intent:debug:typescript:payment',
            payload: JSON.stringify({
                prompt: 'Debug payment retry for alice@example.com',
                promptTextHash: 'sha256:abcdef',
                intent: 'debug',
                language: 'typescript',
                target: 'payment'
            })
        });
        await bus.record({
            workspacePath: '/workspace',
            eventType: 'file.saved',
            relativePath: 'src/payment.ts',
            payload: JSON.stringify({ operation: 'save' })
        });
        await bus.record({
            workspacePath: '/workspace',
            eventType: 'file.saved',
            relativePath: 'src/other.ts',
            payload: JSON.stringify({ operation: 'save' })
        });

        const promptEvents = await bus.list({
            workspacePath: '/workspace',
            eventTypes: ['prompt.submitted'],
            promptSignature: 'intent:debug:typescript:payment'
        });
        const parsedPayload = JSON.parse(promptEvents[0].payload ?? '{}') as Record<string, unknown>;

        expect(promptEvents).to.have.length(1);
        expect(parsedPayload).to.deep.equal({
            promptTextHash: 'sha256:abcdef',
            intent: 'debug',
            language: 'typescript',
            target: 'payment'
        });

        const fileEvents = await bus.list({
            workspacePath: '/workspace',
            eventTypes: ['file.saved'],
            relativePath: 'src/payment.ts'
        });

        expect(fileEvents.map(event => event.relativePath)).to.deep.equal(['src/payment.ts']);
    });
});

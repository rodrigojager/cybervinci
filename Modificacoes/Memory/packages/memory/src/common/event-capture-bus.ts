// *****************************************************************************
// Copyright (C) 2026.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import {
    MemoryEvent,
    MemoryEventListRequest,
    MemoryEventRecordRequest
} from './memory-types';
import { SecretRedactionService } from './secret-redaction';

export interface EventCaptureRepository {
    appendEvent(event: MemoryEvent): Promise<void>;
    listEvents(request: MemoryEventListRequest): Promise<MemoryEvent[]>;
}

export const EventCaptureRepository = Symbol('EventCaptureRepository');

export class InMemoryEventCaptureRepository implements EventCaptureRepository {

    protected readonly events: MemoryEvent[] = [];
    protected readonly redactionService = new SecretRedactionService();

    async appendEvent(event: MemoryEvent): Promise<void> {
        this.events.push(this.redactEvent(event));
    }

    async listEvents(request: MemoryEventListRequest): Promise<MemoryEvent[]> {
        const eventTypes = new Set(request.eventTypes ?? []);
        const since = request.since ? Date.parse(request.since) : undefined;
        return this.events
            .filter(event => event.workspacePath === request.workspacePath)
            .filter(event => !eventTypes.size || eventTypes.has(event.eventType))
            .filter(event => !request.relativePath || event.relativePath === request.relativePath)
            .filter(event => !request.promptSignature || event.promptSignature === request.promptSignature)
            .filter(event => since === undefined || Date.parse(event.createdAt) >= since)
            .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
            .slice(0, request.limit ?? 100);
    }

    protected redactEvent(event: MemoryEvent): MemoryEvent {
        return {
            ...event,
            payload: this.redactPayload(event),
            relativePath: this.redactionService.redactText(event.relativePath),
            promptSignature: this.redactionService.redactText(event.promptSignature)
        };
    }

    protected redactPayload(event: MemoryEvent): string | undefined {
        const payload = this.redactionService.redactText(event.payload);
        if (event.eventType !== 'prompt.submitted' || !payload) {
            return payload;
        }
        try {
            const parsed = JSON.parse(payload) as Record<string, unknown>;
            for (const key of ['prompt', 'text', 'content', 'message', 'promptSnippet', 'redactedPromptSnippet', 'promptSample', 'redactedPromptSample']) {
                delete parsed[key];
            }
            return JSON.stringify(parsed);
        } catch {
            return undefined;
        }
    }
}

export class EventCaptureBus {

    protected readonly redactionService = new SecretRedactionService();

    constructor(protected readonly repository: EventCaptureRepository = new InMemoryEventCaptureRepository()) { }

    async record(request: MemoryEventRecordRequest): Promise<MemoryEvent> {
        const event = this.redactEvent({
            id: this.id('event'),
            workspacePath: request.workspacePath,
            eventType: request.eventType,
            payload: request.payload,
            relativePath: request.relativePath,
            promptSignature: request.promptSignature,
            sessionId: request.sessionId,
            taskId: request.taskId,
            createdAt: new Date().toISOString()
        });
        await this.repository.appendEvent(event);
        return event;
    }

    async list(request: MemoryEventListRequest): Promise<MemoryEvent[]> {
        return this.repository.listEvents(request);
    }

    protected id(prefix: string): string {
        return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    }

    protected redactEvent(event: MemoryEvent): MemoryEvent {
        return {
            ...event,
            payload: this.redactPayload(event),
            relativePath: this.redactionService.redactText(event.relativePath),
            promptSignature: this.redactionService.redactText(event.promptSignature)
        };
    }

    protected redactPayload(event: MemoryEvent): string | undefined {
        const payload = this.redactionService.redactText(event.payload);
        if (event.eventType !== 'prompt.submitted' || !payload) {
            return payload;
        }
        try {
            const parsed = JSON.parse(payload) as Record<string, unknown>;
            for (const key of ['prompt', 'text', 'content', 'message', 'promptSnippet', 'redactedPromptSnippet', 'promptSample', 'redactedPromptSample']) {
                delete parsed[key];
            }
            return JSON.stringify(parsed);
        } catch {
            return undefined;
        }
    }
}

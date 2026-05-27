import { FlowEvent } from './flow-types';

export interface FlowEventLogFilter {
    stateId?: string;
    workloadId?: string;
    eventType?: string;
    gateId?: string;
    artifact?: string;
    effect?: string;
    severity?: string;
}

export function normalizeFlowEvents(events: FlowEvent[]): FlowEvent[] {
    const selected = new Map<string, FlowEvent>();
    for (const event of events) {
        const key = eventDeduplicationKey(event);
        const existing = selected.get(key);
        if (!existing || compareFlowEvents(existing, event) <= 0) {
            selected.set(key, event);
        }
    }
    return Array.from(selected.values()).sort(compareFlowEvents);
}

export function filterFlowEvents(events: FlowEvent[], filter: FlowEventLogFilter): FlowEvent[] {
    return events.filter(event => matchesEventFilter(event, filter));
}

export function hasFlowEventLogFilter(filter: FlowEventLogFilter): boolean {
    return Boolean(filter.stateId || filter.workloadId || filter.eventType || filter.gateId || filter.artifact || filter.effect || filter.severity);
}

function matchesEventFilter(event: FlowEvent, filter: FlowEventLogFilter): boolean {
    return matchesField(event.stateId, filter.stateId)
        && matchesField(event.workloadId, filter.workloadId)
        && matchesField(event.type, filter.eventType)
        && matchesField(event.gateId, filter.gateId)
        && matchesToken(eventTokens(event, ['artifactId', 'artifact', 'path', 'artifactPath', 'targetPath']), filter.artifact)
        && matchesToken(eventTokens(event, ['effectId', 'effect', 'type', 'path', 'command']), filter.effect)
        && matchesToken(eventTokens(event, ['severity']), filter.severity);
}

function matchesField(value: string | undefined, filterValue: string | undefined): boolean {
    return !filterValue || value === filterValue;
}

function matchesToken(tokens: string[], filterValue: string | undefined): boolean {
    if (!filterValue) {
        return true;
    }
    return tokens.includes(filterValue);
}

function eventTokens(event: FlowEvent, keys: string[]): string[] {
    const tokens = new Set<string>();
    const payload = event.payload || {};
    for (const key of keys) {
        collectToken(tokens, payload[key]);
    }
    if (keys.includes('severity') && isSeverityEventType(event.type)) {
        collectToken(tokens, payload.severity);
    }
    if (keys.includes('type')) {
        collectToken(tokens, payload.effectType);
    }
    return [...tokens];
}

function collectToken(tokens: Set<string>, value: unknown): void {
    if (typeof value === 'string' && value.trim()) {
        tokens.add(value);
        return;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
        tokens.add(String(value));
        return;
    }
    if (Array.isArray(value)) {
        for (const item of value) {
            collectToken(tokens, item);
        }
        return;
    }
    if (value && typeof value === 'object') {
        const record = value as Record<string, unknown>;
        for (const key of ['id', 'artifactId', 'effectId', 'path', 'artifactPath', 'type', 'severity']) {
            collectToken(tokens, record[key]);
        }
    }
}

function isSeverityEventType(type: string): boolean {
    return type === 'issue.recorded' || type === 'workload.failed' || type === 'run.failed' || type === 'workflow.validation_failed';
}

function eventDeduplicationKey(event: FlowEvent): string {
    const seq = eventSequence(event);
    if (seq !== undefined) {
        return `seq:${seq}`;
    }
    if (event.id) {
        return `id:${event.id}`;
    }
    return `fallback:${event.timestamp}:${event.type}:${event.message}`;
}

function compareFlowEvents(left: FlowEvent, right: FlowEvent): number {
    const leftSeq = eventSequence(left);
    const rightSeq = eventSequence(right);
    if (leftSeq !== undefined && rightSeq !== undefined && leftSeq !== rightSeq) {
        return leftSeq - rightSeq;
    }
    const timeComparison = eventTime(left.timestamp) - eventTime(right.timestamp);
    if (timeComparison !== 0) {
        return timeComparison;
    }
    return left.id.localeCompare(right.id);
}

function eventSequence(event: FlowEvent): number | undefined {
    const payloadSeq = event.payload?.seq;
    if (typeof payloadSeq === 'number' && Number.isInteger(payloadSeq)) {
        return payloadSeq;
    }
    if (typeof payloadSeq === 'string') {
        const seq = Number.parseInt(payloadSeq, 10);
        if (Number.isInteger(seq) && String(seq) === payloadSeq) {
            return seq;
        }
    }
    const idSeq = Number.parseInt(event.id, 10);
    if (Number.isInteger(idSeq) && String(idSeq) === event.id) {
        return idSeq;
    }
    return undefined;
}

function eventTime(timestamp: string): number {
    const value = Date.parse(timestamp);
    return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
}

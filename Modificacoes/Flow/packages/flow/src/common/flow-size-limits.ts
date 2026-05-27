export const FlowSizeLimits = {
    promptBytes: 64 * 1024,
    contextPackBytes: 256 * 1024,
    artifactBytes: 1024 * 1024,
    eventPayloadBytes: 64 * 1024,
    commandOutputBytes: 64 * 1024,
    reportBytes: 512 * 1024,
    resultJsonBytes: 1024 * 1024
} as const;

const encoder = new TextEncoder();

export function flowByteLength(value: string): number {
    return encoder.encode(value).length;
}

export function truncateFlowText(value: string, maxBytes: number, label: string): string {
    if (flowByteLength(value) <= maxBytes) {
        return value;
    }
    const marker = `\n\n[Flow truncated ${label} to ${maxBytes} bytes.]\n`;
    const markerBytes = flowByteLength(marker);
    const target = Math.max(0, maxBytes - markerBytes);
    let used = 0;
    let out = '';
    for (const char of value) {
        const next = flowByteLength(char);
        if (used + next > target) {
            break;
        }
        out += char;
        used += next;
    }
    return out + marker;
}

export function limitFlowJsonValue<T>(value: T, maxBytes: number, label: string): T | { truncated: true; label: string; maxBytes: number; originalBytes: number } {
    const json = JSON.stringify(value);
    const bytes = flowByteLength(json);
    if (bytes <= maxBytes) {
        return value;
    }
    return {
        truncated: true,
        label,
        maxBytes,
        originalBytes: bytes
    };
}

export function limitFlowJsonString(value: unknown, maxBytes: number, label: string): string {
    const json = `${JSON.stringify(value, undefined, 2)}\n`;
    if (flowByteLength(json) <= maxBytes) {
        return json;
    }
    return `${JSON.stringify(limitFlowJsonValue(value, maxBytes, label), undefined, 2)}\n`;
}

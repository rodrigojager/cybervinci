export declare const FlowSizeLimits: {
    readonly promptBytes: number;
    readonly contextPackBytes: number;
    readonly artifactBytes: number;
    readonly eventPayloadBytes: number;
    readonly commandOutputBytes: number;
    readonly reportBytes: number;
    readonly resultJsonBytes: number;
};
export declare function flowByteLength(value: string): number;
export declare function truncateFlowText(value: string, maxBytes: number, label: string): string;
export declare function limitFlowJsonValue<T>(value: T, maxBytes: number, label: string): T | {
    truncated: true;
    label: string;
    maxBytes: number;
    originalBytes: number;
};
export declare function limitFlowJsonString(value: unknown, maxBytes: number, label: string): string;

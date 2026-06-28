import { FlowRun } from './flow-types';

const SECRET_VALUE_REDACTION = '[REDACTED]';

const SECRET_PATTERNS: RegExp[] = [
    /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
    /\b(Server|Data Source|Host)=.+?;(Database|Initial Catalog)=.+?;(User Id|Uid|Username)=.+?;(Password|Pwd)=([^;\s]+)(?:;|$)/gi,
    /\b(password|passwd|pwd)\s*[:=]\s*["']?([^"'\s;]{8,})["']?/gi,
    /\b(api[_-]?key|token|secret|password)\s*[:=]\s*["']?([^"'\s;]{8,})["']?/gi,
    /\b[A-Z0-9_]*(API[_-]?KEY|SECRET[_-]?KEY|ACCESS[_-]?KEY)[A-Z0-9_]*\s*[:=]\s*["']?([A-Za-z0-9_\-./+=]{16,})["']?/gi,
    /\b(token|bearer|pat)\s*[:=]\s*["']?([A-Za-z0-9_\-./+=]{20,})["']?/gi,
    /\b(sk-[A-Za-z0-9_\-]{20,}|ghp_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{20,})\b/g
];

export function redactFlowSecretsText(value: string | undefined): string | undefined {
    if (value === undefined) {
        return undefined;
    }
    let redacted = value;
    for (const pattern of SECRET_PATTERNS) {
        redacted = redacted.replace(pattern, (...args: unknown[]) => {
            const match = String(args[0]);
            const groups = args.slice(1, -2).filter((entry): entry is string => typeof entry === 'string');
            const secret = groups[groups.length - 1] || match;
            return match.replace(secret, SECRET_VALUE_REDACTION);
        });
    }
    return redacted;
}

export function redactFlowSecretsValue<T>(value: T): T {
    return redactValue(value) as T;
}

export function redactFlowRunForDisplay(run: FlowRun): FlowRun {
    return redactFlowSecretsValue(run);
}

function redactValue(value: unknown): unknown {
    if (typeof value === 'string') {
        return redactFlowSecretsText(value);
    }
    if (!value || typeof value !== 'object') {
        return value;
    }
    if (Array.isArray(value)) {
        return value.map(item => redactValue(item));
    }
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, redactValue(entry)]));
}

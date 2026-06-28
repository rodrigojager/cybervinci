import { SecretFinding, SecretScannerRequest, SecretScannerResult } from './memory-types';

interface SecretPattern {
    kind: SecretFinding['kind'];
    severity: SecretFinding['severity'];
    pattern: RegExp;
}

const SECRET_PATTERNS: SecretPattern[] = [
    { kind: 'private-key', severity: 'critical', pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g },
    { kind: 'connection-string', severity: 'critical', pattern: /(Server|Data Source|Host)=.+?;(Database|Initial Catalog)=.+?;(User Id|Uid|Username)=.+?;(Password|Pwd)=.+?(?:;|$)/gi },
    { kind: 'password', severity: 'high', pattern: /\b(password|passwd|pwd)\s*[:=]\s*["']?([^"'\s;]{8,})["']?/gi },
    { kind: 'api-key', severity: 'critical', pattern: /\b[A-Z0-9_]*(API[_-]?KEY|SECRET[_-]?KEY|ACCESS[_-]?KEY)[A-Z0-9_]*\s*[:=]\s*["']?([A-Za-z0-9_\-./+=]{16,})["']?/gi },
    { kind: 'token', severity: 'high', pattern: /\b(token|bearer|pat)\s*[:=]\s*["']?([A-Za-z0-9_\-./+=]{20,})["']?/gi },
    { kind: 'api-key', severity: 'critical', pattern: /\b(sk-[A-Za-z0-9_\-]{20,}|ghp_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{20,})\b/g }
];

export class SecretScanner {

    scan(request: SecretScannerRequest): SecretScannerResult {
        const maxFindings = request.maxFindings ?? 50;
        const findings: SecretFinding[] = [];
        let redactedContent = request.content;
        const replacements: Array<{ start: number; end: number; redaction: string }> = [];

        for (const secretPattern of SECRET_PATTERNS) {
            for (const match of request.content.matchAll(secretPattern.pattern)) {
                if (findings.length >= maxFindings || match.index === undefined) {
                    break;
                }
                const raw = this.extractSecret(match);
                if (!raw || raw.length < 8) {
                    continue;
                }
                const absoluteStart = match.index + match[0].indexOf(raw);
                const absoluteEnd = absoluteStart + raw.length;
                const redaction = this.redact(raw);
                replacements.push({ start: absoluteStart, end: absoluteEnd, redaction });
                findings.push({
                    kind: secretPattern.kind,
                    severity: secretPattern.severity,
                    fingerprint: this.fingerprint(raw),
                    redactedPreview: redaction,
                    range: this.rangeForOffset(request.content, absoluteStart, absoluteEnd),
                    sourceUri: request.sourceUri
                });
            }
        }

        for (const replacement of replacements.sort((left, right) => right.start - left.start)) {
            redactedContent = `${redactedContent.slice(0, replacement.start)}${replacement.redaction}${redactedContent.slice(replacement.end)}`;
        }

        return {
            findings,
            redactedContent
        };
    }

    protected extractSecret(match: RegExpMatchArray): string {
        return match[2] ?? match[1] ?? match[0];
    }

    protected redact(value: string): string {
        if (value.length <= 8) {
            return '********';
        }
        return `${value.slice(0, Math.min(6, value.length - 4))}${'*'.repeat(8)}${value.slice(-4)}`;
    }

    protected fingerprint(value: string): string {
        return `sha256:${this.hash(value).padStart(16, '0').slice(0, 16)}`;
    }

    protected rangeForOffset(content: string, start: number, end: number): SecretFinding['range'] {
        const before = content.slice(0, start);
        const matched = content.slice(start, end);
        const startLines = before.split('\n');
        const endLines = matched.split('\n');
        const startLine = startLines.length;
        const startColumn = startLines[startLines.length - 1].length + 1;
        const endLine = startLine + endLines.length - 1;
        const endColumn = endLines.length === 1 ? startColumn + matched.length : endLines[endLines.length - 1].length + 1;
        return { startLine, startColumn, endLine, endColumn };
    }

    protected hash(value: string): string {
        let hash = 2166136261;
        for (let index = 0; index < value.length; index++) {
            hash ^= value.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
        }
        return (hash >>> 0).toString(16);
    }
}

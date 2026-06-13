"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redactFlowSecretsText = redactFlowSecretsText;
exports.redactFlowSecretsValue = redactFlowSecretsValue;
exports.redactFlowRunForDisplay = redactFlowRunForDisplay;
var SECRET_VALUE_REDACTION = '[REDACTED]';
var SECRET_PATTERNS = [
    /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
    /\b(Server|Data Source|Host)=.+?;(Database|Initial Catalog)=.+?;(User Id|Uid|Username)=.+?;(Password|Pwd)=([^;\s]+)(?:;|$)/gi,
    /\b(password|passwd|pwd)\s*[:=]\s*["']?([^"'\s;]{8,})["']?/gi,
    /\b(api[_-]?key|token|secret|password)\s*[:=]\s*["']?([^"'\s;]{8,})["']?/gi,
    /\b[A-Z0-9_]*(API[_-]?KEY|SECRET[_-]?KEY|ACCESS[_-]?KEY)[A-Z0-9_]*\s*[:=]\s*["']?([A-Za-z0-9_\-./+=]{16,})["']?/gi,
    /\b(token|bearer|pat)\s*[:=]\s*["']?([A-Za-z0-9_\-./+=]{20,})["']?/gi,
    /\b(sk-[A-Za-z0-9_\-]{20,}|ghp_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{20,})\b/g
];
function redactFlowSecretsText(value) {
    if (value === undefined) {
        return undefined;
    }
    var redacted = value;
    for (var _i = 0, SECRET_PATTERNS_1 = SECRET_PATTERNS; _i < SECRET_PATTERNS_1.length; _i++) {
        var pattern = SECRET_PATTERNS_1[_i];
        redacted = redacted.replace(pattern, function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            var match = String(args[0]);
            var groups = args.slice(1, -2).filter(function (entry) { return typeof entry === 'string'; });
            var secret = groups[groups.length - 1] || match;
            return match.replace(secret, SECRET_VALUE_REDACTION);
        });
    }
    return redacted;
}
function redactFlowSecretsValue(value) {
    return redactValue(value);
}
function redactFlowRunForDisplay(run) {
    return redactFlowSecretsValue(run);
}
function redactValue(value) {
    if (typeof value === 'string') {
        return redactFlowSecretsText(value);
    }
    if (!value || typeof value !== 'object') {
        return value;
    }
    if (Array.isArray(value)) {
        return value.map(function (item) { return redactValue(item); });
    }
    return Object.fromEntries(Object.entries(value).map(function (_a) {
        var key = _a[0], entry = _a[1];
        return [key, redactValue(entry)];
    }));
}

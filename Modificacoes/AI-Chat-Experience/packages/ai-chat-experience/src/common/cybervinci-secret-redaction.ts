// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

export const CYBERVINCI_REDACTED_SECRET = '[REDACTED]';

const SECRET_KEY_PARTS = [
    'apikey',
    'accesskey',
    'secretkey',
    'secret',
    'token',
    'accesstoken',
    'refreshtoken',
    'idtoken',
    'bearertoken',
    'password',
    'passwd',
    'credential',
    'credentials',
    'authorization',
    'authheader',
    'clientsecret',
    'privatekey',
    'sshkey',
    'cookie',
    'sessioncookie'
];

const SAFE_TOKEN_COUNTER_KEYS = new Set([
    'completiontokens',
    'prompttokens',
    'totaltokens',
    'cachedtokens',
    'tokencount',
    'tokencounts',
    'tokenusage',
    'tokensused',
    'maxtokens'
]);

export function isCyberVinciSensitiveKey(key: string | undefined): boolean {
    if (!key) {
        return false;
    }
    const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!normalized || SAFE_TOKEN_COUNTER_KEYS.has(normalized)) {
        return false;
    }
    return SECRET_KEY_PARTS.some(part => normalized === part || normalized.includes(part));
}

export function redactCyberVinciSecretString(value: string): string {
    return value
        .replace(/((?:authorization|auth)\s*[:=]\s*bearer\s+)[^\s'",;)}\]]+/ig, `$1${CYBERVINCI_REDACTED_SECRET}`)
        .replace(/(bearer\s+)[A-Za-z0-9._~+/=-]{12,}/ig, `$1${CYBERVINCI_REDACTED_SECRET}`)
        .replace(/\bsk-[A-Za-z0-9][A-Za-z0-9_-]{12,}\b/g, CYBERVINCI_REDACTED_SECRET)
        .replace(/\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g, CYBERVINCI_REDACTED_SECRET)
        .replace(/\bglpat-[A-Za-z0-9_-]{20,}\b/g, CYBERVINCI_REDACTED_SECRET)
        .replace(/\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g, CYBERVINCI_REDACTED_SECRET)
        .replace(/((?:api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|password|secret)\s*[:=]\s*["']?)[^"',\s}]+/ig, `$1${CYBERVINCI_REDACTED_SECRET}`);
}

export function redactCyberVinciSecrets<T>(value: T, parentKey?: string): T {
    return redactCyberVinciSecretsInternal(value, parentKey, new WeakMap<object, unknown>()) as T;
}

function redactCyberVinciSecretsInternal(value: unknown, parentKey: string | undefined, seen: WeakMap<object, unknown>): unknown {
    if (value === undefined || value === null) {
        return value;
    }
    if (isCyberVinciSensitiveKey(parentKey)) {
        return CYBERVINCI_REDACTED_SECRET;
    }
    if (typeof value === 'string') {
        return redactCyberVinciSecretString(value);
    }
    if (typeof value !== 'object') {
        return value;
    }
    const cached = seen.get(value);
    if (cached) {
        return cached;
    }
    if (Array.isArray(value)) {
        const redacted: unknown[] = [];
        seen.set(value, redacted);
        for (const item of value) {
            redacted.push(redactCyberVinciSecretsInternal(item, parentKey, seen));
        }
        return redacted;
    }
    const redacted: Record<string, unknown> = {};
    seen.set(value, redacted);
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
        redacted[key] = redactCyberVinciSecretsInternal(item, key, seen);
    }
    return redacted;
}

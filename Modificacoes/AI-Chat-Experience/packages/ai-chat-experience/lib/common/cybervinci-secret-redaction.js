"use strict";
// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************
Object.defineProperty(exports, "__esModule", { value: true });
exports.CYBERVINCI_REDACTED_SECRET = void 0;
exports.isCyberVinciSensitiveKey = isCyberVinciSensitiveKey;
exports.redactCyberVinciSecretString = redactCyberVinciSecretString;
exports.redactCyberVinciSecrets = redactCyberVinciSecrets;
exports.CYBERVINCI_REDACTED_SECRET = '[REDACTED]';
var SECRET_KEY_PARTS = [
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
var SAFE_TOKEN_COUNTER_KEYS = new Set([
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
function isCyberVinciSensitiveKey(key) {
    if (!key) {
        return false;
    }
    var normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!normalized || SAFE_TOKEN_COUNTER_KEYS.has(normalized)) {
        return false;
    }
    return SECRET_KEY_PARTS.some(function (part) { return normalized === part || normalized.includes(part); });
}
function redactCyberVinciSecretString(value) {
    return value
        .replace(/((?:authorization|auth)\s*[:=]\s*bearer\s+)[^\s'",;)}\]]+/ig, "$1".concat(exports.CYBERVINCI_REDACTED_SECRET))
        .replace(/(bearer\s+)[A-Za-z0-9._~+/=-]{12,}/ig, "$1".concat(exports.CYBERVINCI_REDACTED_SECRET))
        .replace(/\bsk-[A-Za-z0-9][A-Za-z0-9_-]{12,}\b/g, exports.CYBERVINCI_REDACTED_SECRET)
        .replace(/\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g, exports.CYBERVINCI_REDACTED_SECRET)
        .replace(/\bglpat-[A-Za-z0-9_-]{20,}\b/g, exports.CYBERVINCI_REDACTED_SECRET)
        .replace(/\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g, exports.CYBERVINCI_REDACTED_SECRET)
        .replace(/((?:api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|password|secret)\s*[:=]\s*["']?)[^"',\s}]+/ig, "$1".concat(exports.CYBERVINCI_REDACTED_SECRET));
}
function redactCyberVinciSecrets(value, parentKey) {
    return redactCyberVinciSecretsInternal(value, parentKey, new WeakMap());
}
function redactCyberVinciSecretsInternal(value, parentKey, seen) {
    if (value === undefined || value === null) {
        return value;
    }
    if (isCyberVinciSensitiveKey(parentKey)) {
        return exports.CYBERVINCI_REDACTED_SECRET;
    }
    if (typeof value === 'string') {
        return redactCyberVinciSecretString(value);
    }
    if (typeof value !== 'object') {
        return value;
    }
    var cached = seen.get(value);
    if (cached) {
        return cached;
    }
    if (Array.isArray(value)) {
        var redacted_1 = [];
        seen.set(value, redacted_1);
        for (var _i = 0, value_1 = value; _i < value_1.length; _i++) {
            var item = value_1[_i];
            redacted_1.push(redactCyberVinciSecretsInternal(item, parentKey, seen));
        }
        return redacted_1;
    }
    var redacted = {};
    seen.set(value, redacted);
    for (var _a = 0, _b = Object.entries(value); _a < _b.length; _a++) {
        var _c = _b[_a], key = _c[0], item = _c[1];
        redacted[key] = redactCyberVinciSecretsInternal(item, key, seen);
    }
    return redacted;
}

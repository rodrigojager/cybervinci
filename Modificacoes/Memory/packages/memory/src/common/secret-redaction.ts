// *****************************************************************************
// Copyright (C) 2026.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { SecretScanner } from './secret-scanner';

export class SecretRedactionService {

    protected readonly scanner = new SecretScanner();

    redactText(value: string | undefined): string | undefined {
        if (value === undefined) {
            return undefined;
        }
        return this.scanner.scan({ content: value }).redactedContent
            .replace(/(?=[A-Za-z0-9_=-]{32,})(?=[A-Za-z0-9_=-]*[0-9=])[A-Za-z0-9_=-]{32,}/g, token => `${token.slice(0, 6)}********${token.slice(-4)}`);
    }

    redactJson<T>(value: T): T {
        return this.redactValue(value) as T;
    }

    protected redactValue(value: unknown): unknown {
        if (typeof value === 'string') {
            return this.redactText(value);
        }
        if (!value || typeof value !== 'object') {
            return value;
        }
        if (Array.isArray(value)) {
            return value.map(item => this.redactValue(item));
        }
        return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, this.redactValue(entry)]));
    }
}

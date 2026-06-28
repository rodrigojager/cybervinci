// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

export function parseCyberVinciAiJson(text: string): unknown {
    const trimmed = stripMarkdownFence(text.trim());
    try {
        return JSON.parse(trimmed);
    } catch {
        const extracted = extractFirstJsonValue(trimmed);
        if (!extracted) {
            throw new Error('AI response did not contain a JSON object or array.');
        }
        return JSON.parse(extracted);
    }
}

function stripMarkdownFence(text: string): string {
    const fenceMatch = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    return fenceMatch ? fenceMatch[1].trim() : text;
}

function extractFirstJsonValue(text: string): string | undefined {
    const starts = [
        { index: text.indexOf('{'), open: '{', close: '}' },
        { index: text.indexOf('['), open: '[', close: ']' }
    ].filter(candidate => candidate.index >= 0).sort((left, right) => left.index - right.index);
    const start = starts[0];
    if (!start) {
        return undefined;
    }

    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start.index; index < text.length; index++) {
        const char = text[index];
        if (inString) {
            if (escaped) {
                escaped = false;
            } else if (char === '\\') {
                escaped = true;
            } else if (char === '"') {
                inString = false;
            }
            continue;
        }

        if (char === '"') {
            inString = true;
        } else if (char === start.open) {
            depth++;
        } else if (char === start.close) {
            depth--;
            if (depth === 0) {
                return text.slice(start.index, index + 1);
            }
        }
    }
    return undefined;
}

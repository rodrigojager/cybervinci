import { RazorToken, RazorTokenKind } from '../types/razor-token';
import { stableHash } from './razor-source-map';

export interface RazorTokenDraft {
    kind: RazorTokenKind;
    originalText: string;
    startIndex: number;
    endIndex: number;
    editableMode: 'locked' | 'inline' | 'structural';
}

export function createRazorToken(sequence: number, draft: RazorTokenDraft): RazorToken {
    const id = `rz_${String(sequence).padStart(3, '0')}`;
    const checksum = stableHash(draft.originalText);
    const token: RazorToken = {
        id,
        kind: draft.kind,
        originalText: draft.originalText,
        placeholderHtml: '',
        startIndex: draft.startIndex,
        endIndex: draft.endIndex,
        editableMode: draft.editableMode,
        checksum
    };
    token.placeholderHtml = createPlaceholderHtml(token);
    return token;
}

export function createPlaceholderHtml(token: RazorToken): string {
    const attrs = `data-cv-razor-token="${token.id}" data-cv-razor-kind="${token.kind}" data-cv-razor-checksum="${token.checksum}" contenteditable="false"`;
    if (isInvisibleToken(token.kind, token.originalText)) {
        return `<template ${attrs} class="cv-razor-token cv-razor-directive"></template>`;
    }
    if (isBlockToken(token.kind)) {
        return `<div ${attrs} class="cv-razor-token cv-razor-block">${escapeHtml(summarizeRazor(token.originalText, 'Razor'))}</div>`;
    }
    return `<span ${attrs} class="cv-razor-token cv-razor-inline">${escapeHtml(summarizeRazor(token.originalText))}</span>`;
}

export function isInvisibleToken(kind: RazorTokenKind, originalText = ''): boolean {
    return kind === RazorTokenKind.ModelDirective
        || kind === RazorTokenKind.UsingDirective
        || kind === RazorTokenKind.InjectDirective
        || kind === RazorTokenKind.PageDirective
        || kind === RazorTokenKind.TagHelperDirective
        || /^\s*@\{\s*Layout\s*=/.test(originalText);
}

export function isBlockToken(kind: RazorTokenKind): boolean {
    return kind === RazorTokenKind.CodeBlock
        || kind === RazorTokenKind.IfBlock
        || kind === RazorTokenKind.ElseBlock
        || kind === RazorTokenKind.ForEachBlock
        || kind === RazorTokenKind.ForBlock
        || kind === RazorTokenKind.SwitchBlock
        || kind === RazorTokenKind.SectionBlock;
}

export function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function summarizeRazor(value: string, prefix?: string): string {
    const compact = value.replace(/\s+/g, ' ').trim();
    const text = compact.length > 96 ? `${compact.slice(0, 93)}...` : compact;
    return prefix ? `${prefix}: ${text}` : text;
}

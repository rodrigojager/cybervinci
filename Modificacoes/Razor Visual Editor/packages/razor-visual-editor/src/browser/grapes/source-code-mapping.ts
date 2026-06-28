import type { Component, Editor } from 'grapesjs';
import { SelectedElementSnapshot } from '../types/selected-element';

interface SourceElementHint {
    tagName: string;
    id?: string;
    classes: string[];
    lineNumber: number;
}

interface GrapesComponentModel {
    view?: { el?: HTMLElement };
    get(key: string): unknown;
    getAttributes?(opts?: { noStyle?: boolean }): Record<string, unknown>;
}

interface GrapesWrapper {
    find(selector: string): Component[];
}

interface GrapesEditorWithWrapper {
    getWrapper?(): GrapesWrapper | undefined;
}

const VOID_TAGS = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'
]);

export function formatSourceHtml(html: string): string {
    const normalized = html
        .replace(/>\s+</g, '><')
        .replace(/(<\/?[A-Za-z][^>]*>)/g, '\n$1\n')
        .replace(/\n{2,}/g, '\n')
        .trim();
    const lines: string[] = [];
    let indent = 0;
    for (const rawLine of normalized.split('\n')) {
        const line = rawLine.trim();
        if (!line) {
            continue;
        }
        if (/^<\//.test(line)) {
            indent = Math.max(0, indent - 1);
        }
        lines.push(`${'  '.repeat(indent)}${line}`);
        if (isOpeningTagLine(line) && !isSelfClosingTagLine(line)) {
            indent++;
        }
    }
    return lines.join('\n');
}

export function findSourceLineForSelection(source: string, selection: SelectedElementSnapshot | undefined): number | undefined {
    if (!selection?.tagName) {
        return undefined;
    }
    const lines = source.split(/\r?\n/);
    const candidates = lines
        .map((line, index) => ({ line, lineNumber: index + 1 }))
        .filter(candidate => sourceLineMatchesSelection(candidate.line, selection));
    return candidates[0]?.lineNumber;
}

export function findComponentForSourceLine(editor: Editor | undefined, source: string, lineNumber: number): Component | undefined {
    const hint = sourceElementHintForLine(source, lineNumber);
    if (!editor || !hint) {
        return undefined;
    }
    const wrapper = (editor as GrapesEditorWithWrapper).getWrapper?.();
    if (!wrapper) {
        return undefined;
    }
    const selector = sourceHintSelector(hint);
    const candidates = selector ? wrapper.find(selector) : wrapper.find(hint.tagName);
    if (candidates.length <= 1) {
        return candidates[0];
    }
    return candidates.find(component => componentMatchesHint(component, hint)) ?? candidates[0];
}

export function highlightComponentElement(component: Component | undefined): () => void {
    const element = (component as unknown as GrapesComponentModel | undefined)?.view?.el;
    if (!element) {
        return () => undefined;
    }
    const previousOutline = element.style.outline;
    const previousOutlineOffset = element.style.outlineOffset;
    const previousBoxShadow = element.style.boxShadow;
    element.scrollIntoView({ block: 'center', inline: 'center' });
    element.style.outline = '2px solid #2dd4bf';
    element.style.outlineOffset = '3px';
    element.style.boxShadow = '0 0 0 5px rgba(45, 212, 191, 0.22)';
    return () => {
        element.style.outline = previousOutline;
        element.style.outlineOffset = previousOutlineOffset;
        element.style.boxShadow = previousBoxShadow;
    };
}

function sourceLineMatchesSelection(line: string, selection: SelectedElementSnapshot): boolean {
    const hint = parseOpeningTag(line, 1);
    if (!hint || hint.tagName !== selection.tagName) {
        return false;
    }
    if (selection.attributes.id) {
        return hint.id === selection.attributes.id;
    }
    if (selection.classes.length > 0) {
        return selection.classes.every(className => hint.classes.includes(className));
    }
    return true;
}

function sourceElementHintForLine(source: string, lineNumber: number): SourceElementHint | undefined {
    const lines = source.split(/\r?\n/);
    const stack: SourceElementHint[] = [];
    let best: SourceElementHint | undefined;

    for (let index = 0; index < Math.min(lineNumber, lines.length); index++) {
        const line = lines[index];
        const tagPattern = /<\/?([A-Za-z][\w:-]*)([^>]*)>/g;
        let match: RegExpExecArray | null;
        while ((match = tagPattern.exec(line))) {
            const fullTag = match[0];
            const tagName = match[1].toLowerCase();
            if (fullTag.startsWith('</')) {
                popStackToTag(stack, tagName);
                continue;
            }
            const hint = parseOpeningTag(fullTag, index + 1);
            if (!hint) {
                continue;
            }
            best = hint;
            if (!VOID_TAGS.has(tagName) && !/\/>$/.test(fullTag.trim())) {
                stack.push(hint);
            }
        }
        if (index + 1 === lineNumber) {
            return best ?? stack[stack.length - 1];
        }
    }
    return best ?? stack[stack.length - 1];
}

function parseOpeningTag(line: string, lineNumber: number): SourceElementHint | undefined {
    const match = line.match(/<([A-Za-z][\w:-]*)([^>]*)>/);
    if (!match || match[0].startsWith('</')) {
        return undefined;
    }
    const attrs = parseAttributes(match[2] ?? '');
    return {
        tagName: match[1].toLowerCase(),
        id: attrs.id,
        classes: normalizeClasses(attrs.class),
        lineNumber
    };
}

function parseAttributes(value: string): Record<string, string> {
    const attrs: Record<string, string> = {};
    const attrPattern = /([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>/]+))/g;
    let match: RegExpExecArray | null;
    while ((match = attrPattern.exec(value))) {
        attrs[match[1]] = match[2] ?? match[3] ?? match[4] ?? '';
    }
    return attrs;
}

function sourceHintSelector(hint: SourceElementHint): string | undefined {
    if (hint.id) {
        return `${hint.tagName}#${cssEscape(hint.id)}`;
    }
    if (hint.classes.length > 0) {
        return `${hint.tagName}${hint.classes.map(className => `.${cssEscape(className)}`).join('')}`;
    }
    return hint.tagName;
}

function componentMatchesHint(component: Component, hint: SourceElementHint): boolean {
    const model = component as unknown as GrapesComponentModel;
    const attrs = stringifyRecord(model.getAttributes?.({ noStyle: true }) ?? {});
    const element = model.view?.el;
    const tagName = String(model.get('tagName') || element?.tagName || '').toLowerCase();
    if (tagName !== hint.tagName) {
        return false;
    }
    if (hint.id && attrs.id !== hint.id) {
        return false;
    }
    const classes = new Set([...normalizeClasses(attrs.class), ...Array.from(element?.classList ?? [])]);
    return hint.classes.every(className => classes.has(className));
}

function popStackToTag(stack: SourceElementHint[], tagName: string): void {
    for (let index = stack.length - 1; index >= 0; index--) {
        const candidate = stack[index];
        stack.pop();
        if (candidate.tagName === tagName) {
            return;
        }
    }
}

function isOpeningTagLine(line: string): boolean {
    return /^<[A-Za-z][\w:-]*(\s|>|\/>)/.test(line);
}

function isSelfClosingTagLine(line: string): boolean {
    const tag = line.match(/^<([A-Za-z][\w:-]*)/)?.[1]?.toLowerCase();
    return !tag || VOID_TAGS.has(tag) || /\/>$/.test(line);
}

function stringifyRecord(value: Record<string, unknown>): Record<string, string> {
    return Object.fromEntries(Object.entries(value)
        .filter(([, entry]) => entry !== undefined && entry !== null)
        .map(([name, entry]) => [name, String(entry)]));
}

function normalizeClasses(value: string | undefined): string[] {
    return (value ?? '').split(/\s+/)
        .map(item => item.trim().replace(/^\./, ''))
        .filter(Boolean);
}

function cssEscape(value: string): string {
    if (typeof CSS !== 'undefined' && CSS.escape) {
        return CSS.escape(value);
    }
    return value.replace(/[^A-Za-z0-9_-]/g, match => `\\${match}`);
}

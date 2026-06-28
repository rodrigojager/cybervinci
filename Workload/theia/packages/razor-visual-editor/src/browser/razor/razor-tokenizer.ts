import { RazorToken, RazorTokenKind } from '../types/razor-token';
import { createRazorToken, RazorTokenDraft } from './razor-placeholder';
import { RAZOR_BLOCK_KINDS, RAZOR_DIRECTIVE_KINDS, RAZOR_INLINE_ROOTS } from './razor-rules';

export interface RazorTokenizationResult {
    processedHtml: string;
    tokens: RazorToken[];
    warnings: string[];
}

export class RazorTokenizer {
    tokenize(content: string): RazorTokenizationResult {
        const tokens: RazorToken[] = [];
        const warnings: string[] = [];
        let processedHtml = '';
        let cursor = 0;
        let tokenSequence = 1;

        while (cursor < content.length) {
            const skipped = this.skipNonRazorContext(content, cursor);
            if (skipped > cursor) {
                processedHtml += content.slice(cursor, skipped);
                cursor = skipped;
                continue;
            }

            if (content[cursor] !== '@' || this.shouldIgnoreAt(content, cursor)) {
                processedHtml += content[cursor];
                cursor++;
                continue;
            }

            const capture = this.captureRazor(content, cursor, warnings);
            if (!capture) {
                processedHtml += content[cursor];
                cursor++;
                continue;
            }

            const token = createRazorToken(tokenSequence++, capture);
            tokens.push(token);
            processedHtml += token.placeholderHtml;
            cursor = capture.endIndex;
        }

        return { processedHtml, tokens, warnings };
    }

    protected skipNonRazorContext(content: string, index: number): number {
        if (content.startsWith('<!--', index)) {
            const end = content.indexOf('-->', index + 4);
            return end >= 0 ? end + 3 : content.length;
        }
        const tag = this.openingTagAt(content, index);
        if (tag === 'script' || tag === 'style') {
            const closePattern = `</${tag}`;
            const closeStart = content.toLowerCase().indexOf(closePattern, index + 1);
            if (closeStart < 0) {
                return content.length;
            }
            const closeEnd = content.indexOf('>', closeStart);
            return closeEnd >= 0 ? closeEnd + 1 : content.length;
        }
        return index;
    }

    protected openingTagAt(content: string, index: number): string | undefined {
        if (content[index] !== '<') {
            return undefined;
        }
        const match = /^<\s*([a-zA-Z][\w:-]*)\b/.exec(content.slice(index, index + 32));
        return match?.[1].toLowerCase();
    }

    protected shouldIgnoreAt(content: string, index: number): boolean {
        const next = content[index + 1];
        if (!next || next === '@') {
            return true;
        }
        if (this.isLikelyEmail(content, index)) {
            return true;
        }
        return false;
    }

    protected isLikelyEmail(content: string, index: number): boolean {
        const previous = content[index - 1];
        const next = content[index + 1];
        if (!previous || !next || !/[\w.+-]/.test(previous) || !/[\w-]/.test(next)) {
            return false;
        }
        const tail = content.slice(index + 1, index + 80);
        return /^[\w.-]+\.[A-Za-z]{2,}/.test(tail);
    }

    protected captureRazor(content: string, start: number, warnings: string[]): RazorTokenDraft | undefined {
        const directive = this.captureDirective(content, start);
        if (directive) {
            return directive;
        }
        if (content.startsWith('@{', start)) {
            return this.captureCodeBlock(content, start, warnings);
        }
        if (content.startsWith('@(', start)) {
            return this.captureExplicitExpression(content, start, warnings);
        }
        const word = this.readWord(content, start + 1);
        if (!word) {
            return undefined;
        }
        if (word === 'section') {
            return this.captureSectionBlock(content, start, warnings);
        }
        if (Object.prototype.hasOwnProperty.call(RAZOR_BLOCK_KINDS, word)) {
            return this.captureKeywordBlock(content, start, word, warnings);
        }
        if (RAZOR_INLINE_ROOTS.has(word) || this.looksLikeGenericInlineExpression(content, start, word)) {
            return this.captureInlineExpression(content, start, word);
        }
        return undefined;
    }

    protected captureDirective(content: string, start: number): RazorTokenDraft | undefined {
        const lineStart = content.lastIndexOf('\n', start - 1) + 1;
        const beforeAt = content.slice(lineStart, start);
        if (beforeAt.trim().length > 0) {
            return undefined;
        }
        const word = this.readWord(content, start + 1);
        const kind = word ? RAZOR_DIRECTIVE_KINDS[word] : undefined;
        if (!kind) {
            return undefined;
        }
        const afterWord = content[start + 1 + word.length];
        if (word === 'using' && afterWord === '(') {
            return undefined;
        }
        const lineEnd = this.findLineEnd(content, start);
        return {
            kind,
            originalText: content.slice(start, lineEnd),
            startIndex: start,
            endIndex: lineEnd,
            editableMode: 'locked'
        };
    }

    protected captureCodeBlock(content: string, start: number, warnings: string[]): RazorTokenDraft | undefined {
        const close = this.findBalanced(content, start + 1, '{', '}');
        if (close < 0) {
            warnings.push(`Unclosed Razor code block at ${start}.`);
            return undefined;
        }
        const originalText = content.slice(start, close + 1);
        return {
            kind: /^\s*@\{\s*Layout\s*=/.test(originalText) ? RazorTokenKind.LayoutAssignment : RazorTokenKind.CodeBlock,
            originalText,
            startIndex: start,
            endIndex: close + 1,
            editableMode: 'locked'
        };
    }

    protected captureExplicitExpression(content: string, start: number, warnings: string[]): RazorTokenDraft | undefined {
        const close = this.findBalanced(content, start + 1, '(', ')');
        if (close < 0) {
            warnings.push(`Unclosed Razor expression at ${start}.`);
            return undefined;
        }
        return {
            kind: RazorTokenKind.ExplicitExpression,
            originalText: content.slice(start, close + 1),
            startIndex: start,
            endIndex: close + 1,
            editableMode: 'inline'
        };
    }

    protected captureSectionBlock(content: string, start: number, warnings: string[]): RazorTokenDraft | undefined {
        const openBrace = content.indexOf('{', start);
        if (openBrace < 0) {
            return this.captureInlineExpression(content, start, 'section');
        }
        const close = this.findBalanced(content, openBrace, '{', '}');
        if (close < 0) {
            warnings.push(`Unclosed Razor section at ${start}.`);
            return undefined;
        }
        return {
            kind: RazorTokenKind.SectionBlock,
            originalText: content.slice(start, close + 1),
            startIndex: start,
            endIndex: close + 1,
            editableMode: 'locked'
        };
    }

    protected captureKeywordBlock(content: string, start: number, word: string, warnings: string[]): RazorTokenDraft | undefined {
        const openBrace = this.findNextBlockBrace(content, start + word.length + 1);
        if (openBrace < 0) {
            return this.captureInlineExpression(content, start, word);
        }
        const close = this.findBalanced(content, openBrace, '{', '}');
        if (close < 0) {
            warnings.push(`Unclosed Razor ${word} block at ${start}.`);
            return undefined;
        }
        const endIndex = word === 'if' ? this.captureIfContinuations(content, close + 1) : close + 1;
        return {
            kind: RAZOR_BLOCK_KINDS[word] ?? RazorTokenKind.CodeBlock,
            originalText: content.slice(start, endIndex),
            startIndex: start,
            endIndex,
            editableMode: 'locked'
        };
    }

    protected captureIfContinuations(content: string, initialEnd: number): number {
        let endIndex = initialEnd;
        while (true) {
            const afterWhitespace = this.skipWhitespace(content, endIndex);
            const elseStart = content.startsWith('@else', afterWhitespace)
                ? afterWhitespace + 1
                : content.startsWith('else', afterWhitespace) ? afterWhitespace : -1;
            if (elseStart < 0) {
                return endIndex;
            }
            const openBrace = this.findNextBlockBrace(content, elseStart + 4);
            if (openBrace < 0) {
                return endIndex;
            }
            const close = this.findBalanced(content, openBrace, '{', '}');
            if (close < 0) {
                return endIndex;
            }
            endIndex = close + 1;
        }
    }

    protected captureInlineExpression(content: string, start: number, word: string): RazorTokenDraft {
        let cursor = start + 1 + word.length;
        while (cursor < content.length) {
            const char = content[cursor];
            if (char === '(') {
                const close = this.findBalanced(content, cursor, '(', ')');
                cursor = close >= 0 ? close + 1 : cursor + 1;
                continue;
            }
            if (char === '[') {
                const close = this.findBalanced(content, cursor, '[', ']');
                cursor = close >= 0 ? close + 1 : cursor + 1;
                continue;
            }
            if (/[\w.$]/.test(char) || char === '"' || char === "'") {
                cursor++;
                continue;
            }
            break;
        }
        const text = content.slice(start, cursor);
        return {
            kind: this.inlineKindFor(word, text),
            originalText: text,
            startIndex: start,
            endIndex: cursor,
            editableMode: 'inline'
        };
    }

    protected inlineKindFor(word: string, text: string): RazorTokenKind {
        if (word === 'Html') {
            return RazorTokenKind.HtmlCall;
        }
        if (word === 'Url') {
            return RazorTokenKind.UrlCall;
        }
        if (word === 'RenderBody' || word === 'RenderSection' || text.startsWith('@Html.Partial') || text.startsWith('@Html.Render')) {
            return RazorTokenKind.RenderCall;
        }
        return RazorTokenKind.InlineExpression;
    }

    protected looksLikeGenericInlineExpression(content: string, start: number, word: string): boolean {
        if (!/^[A-Za-z_]\w*$/.test(word)) {
            return false;
        }
        const previous = content[start - 1];
        if (previous && /[\w.)\]]/.test(previous)) {
            return false;
        }
        const next = content[start + 1 + word.length];
        return next === '.' || next === '(' || next === '[';
    }

    protected readWord(content: string, start: number): string {
        const match = /^[A-Za-z_]\w*/.exec(content.slice(start));
        return match?.[0] ?? '';
    }

    protected findLineEnd(content: string, start: number): number {
        const index = content.indexOf('\n', start);
        return index < 0 ? content.length : index;
    }

    protected findNextBlockBrace(content: string, start: number): number {
        let cursor = start;
        while (cursor < content.length) {
            const char = content[cursor];
            if (char === '{') {
                return cursor;
            }
            if (char === '\n' && content.slice(start, cursor).trim().length === 0) {
                cursor++;
                continue;
            }
            if (char === '<') {
                return -1;
            }
            cursor++;
        }
        return -1;
    }

    protected findBalanced(content: string, openIndex: number, open: string, close: string): number {
        let depth = 0;
        let quote: string | undefined;
        for (let cursor = openIndex; cursor < content.length; cursor++) {
            const char = content[cursor];
            if (quote) {
                if (char === '\\') {
                    cursor++;
                } else if (char === quote) {
                    quote = undefined;
                }
                continue;
            }
            if (char === '"' || char === "'" || char === '`') {
                quote = char;
                continue;
            }
            if (content.startsWith('//', cursor)) {
                const lineEnd = content.indexOf('\n', cursor + 2);
                cursor = lineEnd >= 0 ? lineEnd : content.length;
                continue;
            }
            if (content.startsWith('/*', cursor)) {
                const commentEnd = content.indexOf('*/', cursor + 2);
                cursor = commentEnd >= 0 ? commentEnd + 1 : content.length;
                continue;
            }
            if (char === open) {
                depth++;
            } else if (char === close) {
                depth--;
                if (depth === 0) {
                    return cursor;
                }
            }
        }
        return -1;
    }

    protected skipWhitespace(content: string, start: number): number {
        let cursor = start;
        while (cursor < content.length && /\s/.test(content[cursor])) {
            cursor++;
        }
        return cursor;
    }
}

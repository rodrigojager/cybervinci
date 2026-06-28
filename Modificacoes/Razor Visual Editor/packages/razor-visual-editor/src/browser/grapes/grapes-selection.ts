import type { Component } from 'grapesjs';
import { MatchedCssDeclaration, MatchedCssRule } from '../types/css-variable';
import { SelectedElementSnapshot } from '../types/selected-element';

const SIMPLE_TEXT_TAGS = new Set([
    'a', 'button', 'caption', 'dd', 'dt', 'em', 'figcaption', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'label', 'legend', 'li', 'p', 'small', 'span', 'strong', 'td', 'th'
]);

interface GrapesComponentModel {
    cid?: string;
    view?: { el?: HTMLElement };
    get(key: string): unknown;
    set(key: string | Record<string, unknown>, value?: unknown): this;
    getName?(opts?: { noCustom?: boolean }): string;
    getType(): string;
    getAttributes?(opts?: { noClass?: boolean; noStyle?: boolean }): Record<string, unknown>;
    setAttributes?(attrs: Record<string, unknown>): this;
    addAttributes?(attrs: Record<string, unknown>): this;
    setClass?(classes: string | string[]): unknown;
    getStyle?(): Record<string, unknown>;
    setStyle?(style: Record<string, unknown>): Record<string, unknown>;
    getInnerHTML?(): string;
    components?(components?: string): unknown;
}

export function createSelectedElementSnapshot(component: Component | undefined): SelectedElementSnapshot | undefined {
    if (!component) {
        return undefined;
    }
    const model = component as unknown as GrapesComponentModel;
    const attrs = stringifyRecord(model.getAttributes?.({ noStyle: true }) ?? {});
    const styles = stringifyRecord(model.getStyle?.() ?? {});
    const element = model.view?.el;
    const tagName = String(model.get('tagName') || model.view?.el?.tagName || '').toLowerCase();
    const type = model.getType?.() ?? String(model.get('type') || 'default');
    const razorTokenId = attrs['data-cv-razor-token'];
    const razorKind = attrs['data-cv-razor-kind'];
    const locked = Boolean(razorTokenId || model.get('editable') === false && model.get('removable') === false);
    const text = element?.innerText ?? stripHtml(model.getInnerHTML?.() ?? '');
    const hasRazorChild = Boolean(element?.querySelector('[data-cv-razor-token]'));
    const hasElementChildren = Boolean(element && Array.from(element.children).some(child => !child.hasAttribute('data-cv-razor-token')));
    const textEditable = !locked && !hasRazorChild && isTextEditableTag(tagName, hasElementChildren, text);
    const classes = classListFrom(element, attrs.class);

    return {
        id: model.cid ?? `${type}:${tagName}`,
        label: model.getName?.({ noCustom: true }) ?? labelFor(tagName, type),
        tagName,
        type,
        attributes: attrs,
        classes,
        styles,
        matchedRules: element ? collectMatchedCssRules(element) : [],
        text,
        textEditable,
        locked,
        razorTokenId,
        razorKind
    };
}

export function updateSelectedElementAttribute(component: Component | undefined, name: string, value: string): void {
    if (!component || !name || isProtectedAttribute(name)) {
        return;
    }
    const model = component as unknown as GrapesComponentModel;
    if (name === 'class') {
        model.setClass?.(value.split(/\s+/).map(item => item.trim()).filter(Boolean));
        return;
    }
    const attrs = { ...(model.getAttributes?.({ noClass: true, noStyle: true }) ?? {}) };
    if (value.trim() === '') {
        delete attrs[name];
    } else {
        attrs[name] = value;
    }
    model.setAttributes?.(attrs);
}

export function updateSelectedElementStyle(component: Component | undefined, name: string, value: string): void {
    if (!component || !name) {
        return;
    }
    const model = component as unknown as GrapesComponentModel;
    const styles = { ...(model.getStyle?.() ?? {}) };
    if (value.trim() === '') {
        delete styles[name];
    } else {
        styles[name] = value;
    }
    model.setStyle?.(styles);
}

export function updateSelectedElementText(component: Component | undefined, value: string): void {
    if (!component) {
        return;
    }
    const snapshot = createSelectedElementSnapshot(component);
    if (!snapshot?.textEditable) {
        return;
    }
    const model = component as unknown as GrapesComponentModel;
    model.components?.(escapeHtml(value));
}

function stringifyRecord(value: Record<string, unknown>): Record<string, string> {
    return Object.fromEntries(Object.entries(value)
        .filter(([name, entry]) => entry !== undefined && entry !== null && !isProtectedAttribute(name))
        .map(([name, entry]) => [name, String(entry)]));
}

function classListFrom(element: HTMLElement | undefined, classAttribute: string | undefined): string[] {
    const classes = new Set<string>();
    for (const className of Array.from(element?.classList ?? [])) {
        if (!isInternalEditorClass(className)) {
            classes.add(className);
        }
    }
    for (const className of (classAttribute ?? '').split(/\s+/)) {
        if (className.trim() && !isInternalEditorClass(className.trim())) {
            classes.add(className.trim());
        }
    }
    return Array.from(classes).sort((left, right) => left.localeCompare(right));
}

interface CollectedCssRule extends Omit<MatchedCssRule, 'declarations'> {
    order: number;
    specificityTuple: [number, number, number];
    declarations: MatchedCssDeclaration[];
}

function collectMatchedCssRules(element: HTMLElement): MatchedCssRule[] {
    const matched: CollectedCssRule[] = [];
    let order = 0;
    const inlineDeclarations = declarationsFrom(element.style);
    if (inlineDeclarations.length > 0 || element.hasAttribute('style')) {
        matched.push({
            selector: 'element.style',
            declarations: inlineDeclarations,
            specificity: 'inline',
            specificityTuple: [1, 0, 0],
            source: 'inline',
            inline: true,
            order: order++
        });
    }
    const document = element.ownerDocument;
    for (const sheet of Array.from(document.styleSheets)) {
        let rules: CSSRuleList | undefined;
        try {
            rules = sheet.cssRules;
        } catch {
            continue;
        }
        if (!rules) {
            continue;
        }
        order = collectFromRules(element, Array.from(rules), matched, order, sourceFromSheet(sheet));
    }
    markActiveDeclarations(matched);
    return matched
        .sort(compareCascadeRules)
        .map(({ order: _order, specificityTuple: _specificityTuple, ...rule }) => rule)
        .slice(0, 80);
}

function collectFromRules(element: HTMLElement, rules: CSSRule[], matched: CollectedCssRule[], order: number, source: string, context: string[] = []): number {
    for (const rule of rules) {
        if (isStyleRule(rule)) {
            const selectors = rule.selectorText.split(',').map(selector => selector.trim()).filter(Boolean);
            const matchingSelectors = selectors.filter(selector => !isInternalEditorSelector(selector) && safelyMatches(element, selector));
            const declarations = declarationsFrom(rule.style);
            if (matchingSelectors.length > 0) {
                const specificityTuple = maxSpecificity(matchingSelectors);
                matched.push({
                    selector: matchingSelectors.join(', '),
                    declarations,
                    specificity: specificityLabel(specificityTuple),
                    specificityTuple,
                    source,
                    mediaText: context.join(' and ') || undefined,
                    inline: false,
                    order: order++
                });
            }
            continue;
        }
        const nested = nestedRules(rule);
        if (nested) {
            order = collectFromRules(element, Array.from(nested), matched, order, source, [...context, groupingContext(rule)]);
        }
    }
    return order;
}

function isInternalEditorClass(className: string): boolean {
    return className.startsWith('gjs-') || className === 'selected' || className === 'hovered';
}

function isInternalEditorSelector(selector: string): boolean {
    return /\.gjs-|#gjs-|data-gjs-|data-highlightable|\.selected\b|\.hovered\b/.test(selector);
}

function isStyleRule(rule: CSSRule): rule is CSSStyleRule {
    return 'selectorText' in rule && 'style' in rule;
}

function nestedRules(rule: CSSRule): CSSRuleList | undefined {
    return 'cssRules' in rule ? (rule as CSSGroupingRule).cssRules : undefined;
}

function safelyMatches(element: HTMLElement, selector: string): boolean {
    try {
        return element.matches(selector);
    } catch {
        return false;
    }
}

function declarationsFrom(style: CSSStyleDeclaration): MatchedCssDeclaration[] {
    return Array.from(style)
        .map(name => ({
            property: name,
            value: style.getPropertyValue(name).trim(),
            priority: style.getPropertyPriority(name),
            active: false,
            overridden: true
        }));
}

function markActiveDeclarations(rules: CollectedCssRule[]): void {
    const winning = new Map<string, { rule: CollectedCssRule; declarationIndex: number }>();
    rules.forEach(rule => {
        rule.declarations.forEach((declaration, declarationIndex) => {
            const current = winning.get(declaration.property);
            if (!current || compareDeclarationCascade(rule, current.rule, declaration.priority, current.rule.declarations[current.declarationIndex].priority) > 0) {
                winning.set(declaration.property, { rule, declarationIndex });
            }
        });
    });

    rules.forEach(rule => {
        rule.declarations = rule.declarations.map((declaration, declarationIndex) => {
            const winner = winning.get(declaration.property);
            const active = Boolean(winner && winner.rule === rule && winner.declarationIndex === declarationIndex);
            return {
                ...declaration,
                active,
                overridden: !active
            };
        });
    });
}

function compareDeclarationCascade(leftRule: CollectedCssRule, rightRule: CollectedCssRule, leftPriority: string, rightPriority: string): number {
    const priority = priorityRank(leftPriority) - priorityRank(rightPriority);
    if (priority !== 0) {
        return priority;
    }
    if (leftRule.inline !== rightRule.inline) {
        return leftRule.inline ? 1 : -1;
    }
    const specificityComparison = compareSpecificity(leftRule.specificityTuple, rightRule.specificityTuple);
    if (specificityComparison !== 0) {
        return specificityComparison;
    }
    return leftRule.order - rightRule.order;
}

function compareCascadeRules(left: CollectedCssRule, right: CollectedCssRule): number {
    if (left.inline !== right.inline) {
        return left.inline ? -1 : 1;
    }
    const importantComparison = maxPriorityRank(right) - maxPriorityRank(left);
    if (importantComparison !== 0) {
        return importantComparison;
    }
    const specificityComparison = compareSpecificity(right.specificityTuple, left.specificityTuple);
    if (specificityComparison !== 0) {
        return specificityComparison;
    }
    return right.order - left.order;
}

function priorityRank(priority: string): number {
    return priority === 'important' ? 1 : 0;
}

function maxPriorityRank(rule: CollectedCssRule): number {
    return Math.max(0, ...rule.declarations.map(declaration => priorityRank(declaration.priority)));
}

function sourceFromSheet(sheet: CSSStyleSheet): string {
    if (sheet.href) {
        return fileNameFromHref(sheet.href);
    }
    const owner = sheet.ownerNode;
    if (owner instanceof HTMLStyleElement) {
        return owner.id || owner.getAttribute('data-source') || 'inline stylesheet';
    }
    return 'stylesheet';
}

function fileNameFromHref(href: string): string {
    try {
        const url = new URL(href);
        return url.pathname.split('/').filter(Boolean).pop() ?? href;
    } catch {
        return href.split(/[\\/]/).filter(Boolean).pop() ?? href;
    }
}

function groupingContext(rule: CSSRule): string {
    if ('conditionText' in rule) {
        return `@media ${(rule as CSSConditionRule).conditionText}`;
    }
    return rule.cssText.split('{', 1)[0].trim();
}

function maxSpecificity(selectors: string[]): [number, number, number] {
    return selectors.reduce<[number, number, number]>((current, selector) => {
        const next = specificity(selector);
        return compareSpecificity(next, current) > 0 ? next : current;
    }, [0, 0, 0]);
}

function specificity(selector: string): [number, number, number] {
    const cleaned = selector
        .replace(/:where\([^)]*\)/g, '')
        .replace(/::?[A-Za-z-]+(?:\([^)]*\))?/g, ' ');
    const ids = (cleaned.match(/#[A-Za-z0-9_-]+/g) ?? []).length;
    const classes = (cleaned.match(/\.[A-Za-z0-9_-]+|\[[^\]]+\]/g) ?? []).length;
    const elements = (cleaned.match(/(^|[\s>+~])([A-Za-z][A-Za-z0-9_-]*)/g) ?? []).length;
    return [ids, classes, elements];
}

function compareSpecificity(left: string | [number, number, number], right: string | [number, number, number]): number {
    const leftTuple = typeof left === 'string' ? parseSpecificity(left) : left;
    const rightTuple = typeof right === 'string' ? parseSpecificity(right) : right;
    return leftTuple[0] - rightTuple[0] || leftTuple[1] - rightTuple[1] || leftTuple[2] - rightTuple[2];
}

function specificityLabel(value: [number, number, number]): string {
    return value.join('-');
}

function parseSpecificity(value: string): [number, number, number] {
    const [ids = 0, classes = 0, elements = 0] = value.split('-').map(part => Number(part) || 0);
    return [ids, classes, elements];
}

function isTextEditableTag(tagName: string, hasElementChildren: boolean, text: string): boolean {
    if (SIMPLE_TEXT_TAGS.has(tagName)) {
        return !hasElementChildren;
    }
    return tagName === 'div' && !hasElementChildren && text.trim().length > 0;
}

function isProtectedAttribute(name: string): boolean {
    return name.startsWith('data-cv-razor') || name === 'contenteditable';
}

function labelFor(tagName: string, type: string): string {
    return tagName ? `<${tagName}>` : type;
}

function stripHtml(value: string): string {
    return value.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

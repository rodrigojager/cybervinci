import {
    Builder_DEFAULT_THEME,
    resolveBuilderNodeDataBinding,
    validateBuilderUrl,
    validateBuilderDocumentStructure,
    type BuilderDocument,
    type BuilderJsonValue,
    type BuilderNode,
    type BuilderStyle,
    type BuilderTheme
} from '@cybervinci/builder-schema';
import {
    createDefaultBuilderComponentRegistry,
    validateBuilderDocumentTypesAgainstRegistry,
    type BuilderComponentRegistry
} from '@cybervinci/builder-registry';

export interface BuilderHtmlExportResult {
    files: Record<string, string>;
}

export interface BuilderHtmlRendererOptions {
    registry?: BuilderComponentRegistry;
    validate?: boolean;
    pretty?: boolean;
}

export interface BuilderHtmlRenderContext {
    document: BuilderDocument;
    registry: BuilderComponentRegistry;
    styles: BuilderCssRule[];
    pretty: boolean;
}

interface BuilderCssRule {
    selector: string;
    declarations: Record<string, string | number>;
    atRule?: string;
}

export class BuilderHtmlRenderError extends Error {

    constructor(message: string, readonly errors: readonly { path: string; message: string; nodeId?: string }[] = []) {
        super(message);
        this.name = 'BuilderHtmlRenderError';
    }
}

export function htmlRenderer(document: BuilderDocument, options: BuilderHtmlRendererOptions = {}): BuilderHtmlExportResult {
    const registry = options.registry ?? createDefaultBuilderComponentRegistry();

    if (options.validate !== false) {
        assertRenderableDocument(document, registry);
    }

    const context: BuilderHtmlRenderContext = {
        document,
        registry,
        styles: [],
        pretty: options.pretty ?? true
    };
    const body = renderBuilderNodeToHtml(document.tree, context);
    const styles = renderCss(document.theme, context.styles);

    return {
        files: {
            'index.html': renderHtmlDocument(document, body, context.pretty),
            'styles.css': styles
        }
    };
}

export const renderBuilderDocumentToHtml = htmlRenderer;

export function createEmptyHtmlExport(document: BuilderDocument): BuilderHtmlExportResult {
    return htmlRenderer(document, { validate: false });
}

export function renderBuilderNodeToHtml(node: BuilderNode, context: BuilderHtmlRenderContext): string {
    if (node.meta?.hiddenInEditor === true) {
        return '';
    }

    const repeatedNodes = expandRepeatedNode(node, context.document);
    if (repeatedNodes) {
        return repeatedNodes.map(repeatedNode => renderBuilderNodeToHtml(repeatedNode, context)).join('');
    }

    const definition = context.registry.get(node.type);
    const props = {
        ...(definition?.defaultProps ?? {}),
        ...(node.props ?? {})
    };
    const children = renderChildren(node, context);
    const classNames = createNodeClassNames(node, props, definition?.exportHtml?.className);
    const attributes = createNodeAttributes(node, props, classNames, context);

    switch (node.type) {
        case 'Page':
            return renderElement('main', attributes, renderSlotsAndChildren(node, context, ['header', 'sidebar'], children, ['footer']));
        case 'Section':
            return renderElement(readTag(props.component, 'section'), attributes, renderSlotsAndChildren(node, context, ['header'], children, ['footer']));
        case 'Container':
        case 'Stack':
        case 'Group':
        case 'SimpleGrid':
        case 'Grid':
            return renderElement('div', attributes, children);
        case 'Box':
            return renderElement(readTag(props.component, 'div'), attributes, children);
        case 'Card':
            return renderElement('article', attributes, renderSlotsAndChildren(node, context, ['header'], children, ['actions', 'footer']));
        case 'Divider':
            return renderDivider(props, attributes);
        case 'Space':
            return renderElement('div', attributes, '');
        case 'Title':
            return renderElement(`h${readHeadingLevel(props.order)}`, attributes, renderTextChildren(props, children));
        case 'Text':
            return renderElement(readTag(props.component, 'p'), attributes, renderTextChildren(props, children));
        case 'Badge':
            return renderElement('span', attributes, renderTextChildren(props, children));
        case 'List':
            return renderList(props, attributes, children);
        case 'Markdown':
            return renderElement('div', attributes, renderMarkdown(String(props.content ?? ''), props.allowHtml === true, readLinkTarget(props.linkTarget)));
        case 'Button':
            return renderElement('button', attributes, renderTextChildren(props, children));
        case 'TextInput':
        case 'NumberInput':
        case 'DateInput':
            return renderInput(node.type, props, attributes);
        case 'Textarea':
            return renderFormField(props, attributes, renderElement('textarea', attributes, escapeHtml(String(props.value ?? props.defaultValue ?? ''))));
        case 'Select':
            return renderSelect(props, attributes);
        case 'Checkbox':
            return renderCheckbox(props, attributes);
        case 'RadioGroup':
            return renderRadioGroup(props, attributes);
        case 'DynamicForm':
            return renderDynamicForm(node, props, attributes, context);
        case 'Table':
        case 'DataTable':
            return renderTable(props, attributes);
        case 'MetricCard':
            return renderMetricCard(props, attributes);
        case 'StatCard':
            return renderStatCard(props, attributes);
        case 'Anchor':
            return renderElement('a', attributes, renderTextChildren(props, children));
        case 'NavLink':
            return renderNavLink(props, attributes);
        case 'Breadcrumbs':
            return renderBreadcrumbs(props, attributes);
        case 'Tabs':
            return renderTabs(props, attributes);
        case 'Modal':
            return renderElement('section', attributes, renderOverlayContent(props, children, context, node));
        case 'Drawer':
            return renderElement('aside', attributes, renderOverlayContent(props, children, context, node));
        case 'Alert':
        case 'NotificationBlock':
            return renderElement('div', attributes, renderNoticeContent(props, children));
        case 'Loader':
            return renderElement('div', attributes, escapeHtml(String(props.label ?? 'Loading')));
        case 'Image':
            return renderVoidElement('img', attributes);
        case 'Avatar':
            return renderVoidElement('img', attributes);
        case 'Icon':
            return renderElement('span', attributes, escapeHtml(String(props.label ?? props.name ?? 'Icon')));
        case 'HeroSection':
            return renderHeroSection(node, props, attributes, context);
        case 'FeatureGrid':
            return renderFeatureGrid(props, attributes);
        case 'PricingSection':
            return renderPricingSection(props, attributes);
        case 'TestimonialSection':
            return renderTestimonialSection(props, attributes);
        case 'CTASection':
            return renderCtaSection(node, props, attributes, context);
        case 'ChartPlaceholder':
            return renderChartPlaceholder(props, attributes);
        case 'MetricGrid':
            return renderElement('section', attributes, children);
        case 'DashboardHeader':
            return renderDashboardHeader(node, props, attributes, context);
        default:
            return renderUnsupportedNode(node, definition?.exportHtml?.tagName, attributes, children);
    }
}

function assertRenderableDocument(document: BuilderDocument, registry: BuilderComponentRegistry): void {
    const structural = validateBuilderDocumentStructure(document);
    const registryValidation = validateBuilderDocumentTypesAgainstRegistry(document, registry);
    const errors = [...structural.errors, ...registryValidation.errors];

    if (errors.length > 0) {
        throw new BuilderHtmlRenderError('Cannot export invalid Builder document to HTML.', errors);
    }
}

function expandRepeatedNode(node: BuilderNode, document: BuilderDocument): BuilderNode[] | undefined {
    if (!node.data?.repeat) {
        return undefined;
    }

    const binding = resolveBuilderNodeDataBinding(document, node);
    if (!binding.repeatItems) {
        return node.data.emptyState;
    }

    return binding.repeatItems.map((item, index) => ({
        ...node,
        id: `${node.id}-${index + 1}`,
        data: undefined,
        props: applyDataFields(node.props ?? {}, item)
    }));
}

function applyDataFields(props: Record<string, BuilderJsonValue>, item: BuilderJsonValue): Record<string, BuilderJsonValue> {
    if (!isRecord(item)) {
        return props;
    }

    const next = { ...props };
    for (const [key, value] of Object.entries(next)) {
        if (typeof value === 'string' && value.startsWith('$item.')) {
            next[key] = readPath(item, value.slice('$item.'.length)) ?? value;
        }
    }
    return next;
}

function renderChildren(node: BuilderNode, context: BuilderHtmlRenderContext): string {
    return (node.children ?? []).map(child => renderBuilderNodeToHtml(child, context)).join('');
}

function renderSlotsAndChildren(node: BuilderNode, context: BuilderHtmlRenderContext, beforeSlots: string[], children: string, afterSlots: string[]): string {
    return [
        ...beforeSlots.map(slot => renderSlot(node, slot, context)),
        children,
        ...afterSlots.map(slot => renderSlot(node, slot, context))
    ].join('');
}

function renderSlot(node: BuilderNode, slotName: string, context: BuilderHtmlRenderContext): string {
    const content = (node.slots?.[slotName] ?? []).map(child => renderBuilderNodeToHtml(child, context)).join('');
    return content ? renderElement('div', { class: `builder-slot builder-slot-${slotName}` }, content) : '';
}

function createNodeClassNames(node: BuilderNode, props: Record<string, unknown>, exportClassName?: string): string[] {
    return [
        'builder-node',
        `builder-${toKebabCase(node.type)}`,
        exportClassName,
        ...createLayoutClassNames(node.type, props),
        node.style?.className
    ].filter((value): value is string => typeof value === 'string' && value.length > 0);
}

function createLayoutClassNames(type: string, props: Record<string, unknown>): string[] {
    const classes: string[] = [];

    if (isLayoutType(type)) {
        addTokenClass(classes, type, 'padding', props.padding);
        addTokenClass(classes, type, 'padding-x', props.paddingX);
        addTokenClass(classes, type, 'padding-y', props.paddingY);
        addTokenClass(classes, type, 'gap', props.gap ?? props.spacing ?? props.gutter);
        addTokenClass(classes, type, 'vertical-spacing', props.verticalSpacing);
        addTokenClass(classes, type, 'align', props.align);
        addTokenClass(classes, type, 'justify', props.justify);
        addTokenClass(classes, type, 'size', props.size);
        addTokenClass(classes, type, 'radius', props.radius);
        addTokenClass(classes, type, 'shadow', props.shadow);
        addTokenClass(classes, type, 'variant', props.variant);
    }

    if (props.fullWidth === true || props.fluid === true) {
        classes.push(`builder-${toKebabCase(type)}--fluid`);
    }
    if (props.withBorder === true) {
        classes.push(`builder-${toKebabCase(type)}--bordered`);
    }
    if (props.wrap === false) {
        classes.push(`builder-${toKebabCase(type)}--nowrap`);
    }
    if (type === 'Divider' && props.orientation === 'vertical') {
        classes.push('builder-divider--vertical');
    }
    if (type === 'SimpleGrid' && typeof props.cols === 'number') {
        classes.push(`builder-simple-grid--cols-${props.cols}`);
    }
    if (type === 'Grid' && typeof props.columns === 'number') {
        classes.push(`builder-grid--columns-${props.columns}`);
    }
    if (type === 'Grid' && typeof props.span === 'number') {
        classes.push(`builder-grid--span-${props.span}`);
    }

    return classes;
}

function createNodeAttributes(node: BuilderNode, props: Record<string, unknown>, classNames: string[], context: BuilderHtmlRenderContext): Record<string, string | number | boolean | undefined> {
    const attributes: Record<string, string | number | boolean | undefined> = {
        id: node.id,
        class: classNames.join(' '),
        'data-builder-type': node.type
    };

    addCommonProps(attributes, props);
    addTypeSpecificAttributes(attributes, node.type, props);
    addStyleRule(node, context);
    return attributes;
}

function addCommonProps(attributes: Record<string, string | number | boolean | undefined>, props: Record<string, unknown>): void {
    if (typeof props.title === 'string') {
        attributes.title = props.title;
    }
    if (typeof props.href === 'string') {
        attributes.href = sanitizeUrl(props.href) ?? '#';
    }
    if (props.target === '_blank') {
        attributes.target = '_blank';
        attributes.rel = 'noopener noreferrer';
    }
    if (typeof props.src === 'string') {
        attributes.src = sanitizeUrl(props.src, 'asset') ?? '';
    }
    if (typeof props.alt === 'string') {
        attributes.alt = props.alt;
    }
    if (props.disabled === true) {
        attributes.disabled = true;
    }
    if (props.required === true) {
        attributes.required = true;
    }
    if (props.readOnly === true) {
        attributes.readonly = true;
    }
    if (typeof props.placeholder === 'string') {
        attributes.placeholder = props.placeholder;
    }
    if (typeof props.name === 'string') {
        attributes.name = props.name;
    }
    if (typeof props['aria-label'] === 'string') {
        attributes['aria-label'] = props['aria-label'];
    }
    if (typeof props.error === 'string' && props.error.length > 0) {
        attributes['aria-invalid'] = 'true';
        if (typeof attributes.id === 'string') {
            attributes['aria-errormessage'] = `${attributes.id}-error`;
        }
    }
}

function addTypeSpecificAttributes(attributes: Record<string, string | number | boolean | undefined>, type: string, props: Record<string, unknown>): void {
    if (isFormControlType(type) && !attributes['aria-label'] && typeof props.label === 'string') {
        attributes['aria-label'] = props.label;
    }
    if (type === 'Button') {
        attributes.type = typeof props.type === 'string' ? props.type : props.submit === true ? 'submit' : 'button';
        if (!attributes['aria-label'] && typeof props.label === 'string') {
            attributes['aria-label'] = props.label;
        }
    }
    if (type === 'TextInput') {
        attributes.type = ['password', 'email', 'url', 'tel', 'search'].includes(String(props.type)) ? String(props.type) : 'text';
        attributes.value = readScalarAttribute(props.value ?? props.defaultValue);
    }
    if (type === 'NumberInput') {
        attributes.type = 'number';
        attributes.min = readScalarAttribute(props.min);
        attributes.max = readScalarAttribute(props.max);
        attributes.step = readScalarAttribute(props.step);
        attributes.value = readScalarAttribute(props.value ?? props.defaultValue);
    }
    if (type === 'DateInput') {
        attributes.type = 'date';
        attributes.min = readScalarAttribute(props.minDate);
        attributes.max = readScalarAttribute(props.maxDate);
        attributes.value = readScalarAttribute(props.value ?? props.defaultValue);
    }
    if ((type === 'Image' || type === 'Avatar') && !attributes.alt) {
        attributes.alt = typeof props.name === 'string' ? props.name : '';
    }
    if ((type === 'Image' || type === 'Avatar') && typeof props.width !== 'undefined') {
        attributes.width = readDimensionAttribute(props.width);
    }
    if ((type === 'Image' || type === 'Avatar') && typeof props.height !== 'undefined') {
        attributes.height = readDimensionAttribute(props.height);
    }
    if (type === 'Alert' || type === 'NotificationBlock') {
        attributes.role = typeof props.role === 'string' ? props.role : props.variant === 'error' ? 'alert' : 'status';
        attributes['aria-live'] = typeof props['aria-live'] === 'string' ? props['aria-live'] : props.variant === 'error' ? 'assertive' : 'polite';
    }
}

function isFormControlType(type: string): boolean {
    return ['TextInput', 'Textarea', 'Select', 'Checkbox', 'RadioGroup', 'NumberInput', 'DateInput'].includes(type);
}

function addStyleRule(node: BuilderNode, context: BuilderHtmlRenderContext): void {
    const props = {
        ...(context.registry.get(node.type)?.defaultProps ?? {}),
        ...(node.props ?? {})
    };
    const declarations = {
        ...createLayoutStyleDeclarations(node.type, props),
        ...createContentStyleDeclarations(node.type, props),
        ...createCanonicalStyleDeclarations(node.style?.css)
    };

    addCssRule(context.styles, `#${cssEscape(node.id)}`, declarations);
    addResponsiveStyleRules(context.styles, node.id, node.style?.responsive);
}

function createLayoutStyleDeclarations(type: string, props: Record<string, unknown>): Record<string, string | number> {
    const declarations: Record<string, string | number> = {};

    if (!isLayoutType(type)) {
        return declarations;
    }

    setSpacingDeclaration(declarations, 'padding', props.padding);
    setSpacingDeclaration(declarations, 'padding-left', props.paddingX);
    setSpacingDeclaration(declarations, 'padding-right', props.paddingX);
    setSpacingDeclaration(declarations, 'padding-top', props.paddingY);
    setSpacingDeclaration(declarations, 'padding-bottom', props.paddingY);
    setSpacingDeclaration(declarations, 'gap', props.gap ?? props.spacing ?? props.gutter);
    setSpacingDeclaration(declarations, 'row-gap', props.verticalSpacing);
    setSpacingDeclaration(declarations, 'margin', props.margin);

    if (typeof props.background === 'string') {
        declarations.background = cssColorOrVariable(props.background);
    }
    if (typeof props.align === 'string') {
        declarations['align-items'] = props.align;
    }
    if (typeof props.justify === 'string') {
        declarations['justify-content'] = props.justify;
    }
    if (props.wrap === false) {
        declarations['flex-wrap'] = 'nowrap';
    }
    if ((type === 'SimpleGrid' || type === 'Grid') && typeof props.cols === 'number') {
        declarations['grid-template-columns'] = `repeat(${Math.max(1, props.cols)}, minmax(0, 1fr))`;
    }
    if (type === 'Grid' && typeof props.columns === 'number') {
        declarations['grid-template-columns'] = `repeat(${Math.max(1, props.columns)}, minmax(0, 1fr))`;
    }
    if (type === 'Grid' && typeof props.span === 'number') {
        declarations['grid-column'] = `span ${Math.max(1, props.span)} / span ${Math.max(1, props.span)}`;
    }
    if (type === 'Card' && props.withBorder === false) {
        declarations.border = '0';
    }
    if ((type === 'Card' || type === 'Box') && typeof props.radius === 'string') {
        declarations['border-radius'] = spacingOrCssValue(props.radius);
    }
    if (type === 'Divider' && typeof props.color === 'string') {
        declarations['border-color'] = cssColorOrVariable(props.color);
    }
    if (type === 'Space') {
        declarations.height = typeof props.h === 'number' ? props.h : spacingOrCssValue(props.size);
        declarations.width = typeof props.w === 'number' ? props.w : '100%';
    }

    return declarations;
}

function setSpacingDeclaration(declarations: Record<string, string | number>, property: string, value: unknown): void {
    if (value !== undefined) {
        declarations[property] = spacingOrCssValue(value);
    }
}

function spacingOrCssValue(value: unknown): string | number {
    if (typeof value === 'number') {
        return value;
    }
    if (typeof value !== 'string') {
        return 'var(--builder-spacing-md)';
    }
    if (value === '0') {
        return '0';
    }
    if (['xs', 'sm', 'md', 'lg', 'xl'].includes(value)) {
        return `var(--builder-spacing-${value})`;
    }
    return value;
}

function cssColorOrVariable(value: string): string {
    if (value.startsWith('token.')) {
        return cssTokenReference(value);
    }
    return /^[A-Za-z][\w-]*$/.test(value) ? `var(--builder-color-${value}, ${value})` : value;
}

function breakpointToMediaQuery(value: string): string | undefined {
    const namedBreakpoints: Record<string, string> = {
        xs: '(min-width: 30em)',
        sm: '(min-width: 48em)',
        md: '(min-width: 64em)',
        lg: '(min-width: 75em)',
        xl: '(min-width: 90em)'
    };
    const normalized = value.trim();

    if (namedBreakpoints[normalized]) {
        return `@media ${namedBreakpoints[normalized]}`;
    }
    if (/^[a-z]{2}-and-up$/i.test(normalized)) {
        return breakpointToMediaQuery(normalized.slice(0, 2));
    }
    if (/^\d+(?:px|em|rem)$/.test(normalized)) {
        return `@media (min-width: ${normalized})`;
    }
    if (/^\((?:min|max)-width:\s*\d+(?:px|em|rem)\)$/.test(normalized)) {
        return `@media ${normalized}`;
    }

    return undefined;
}

function isLayoutType(type: string): boolean {
    return ['Page', 'Section', 'Container', 'Stack', 'Group', 'SimpleGrid', 'Grid', 'Card', 'Divider', 'Space', 'Box'].includes(type);
}

function createContentStyleDeclarations(type: string, props: Record<string, unknown>): Record<string, string | number> {
    const declarations: Record<string, string | number> = {};

    if (typeof props.color === 'string') {
        declarations.color = cssColorOrVariable(props.color);
    }
    if (typeof props.align === 'string') {
        declarations['text-align'] = props.align;
    }
    if (typeof props.weight === 'number') {
        declarations['font-weight'] = props.weight;
    }
    if (props.italic === true) {
        declarations['font-style'] = 'italic';
    }
    if (props.underline === true) {
        declarations['text-decoration'] = 'underline';
    }
    if (typeof props.lineClamp === 'number') {
        declarations.display = '-webkit-box';
        declarations['-webkit-line-clamp'] = props.lineClamp;
        declarations['-webkit-box-orient'] = 'vertical';
        declarations.overflow = 'hidden';
    }
    if ((type === 'Image' || type === 'Avatar') && typeof props.fit === 'string') {
        declarations['object-fit'] = props.fit;
    }
    if ((type === 'Image' || type === 'Avatar') && typeof props.radius === 'string') {
        declarations['border-radius'] = props.radius === 'round' ? '999px' : spacingOrCssValue(props.radius);
    }
    if (type === 'ChartPlaceholder' && typeof props.height === 'number') {
        declarations['min-height'] = props.height;
    }
    if (type === 'MetricGrid' && typeof props.columns === 'number') {
        declarations['grid-template-columns'] = `repeat(${Math.max(1, props.columns)}, minmax(0, 1fr))`;
    }
    if (type === 'MetricGrid') {
        setSpacingDeclaration(declarations, 'gap', props.spacing);
    }

    return declarations;
}

function addResponsiveStyleRules(rules: BuilderCssRule[], nodeId: string, responsive: Record<string, BuilderStyle> | undefined): void {
    if (!responsive) {
        return;
    }

    for (const [breakpoint, style] of Object.entries(responsive)) {
        const atRule = breakpointToMediaQuery(breakpoint);
        if (atRule) {
            addCssRule(rules, `#${cssEscape(nodeId)}`, createCanonicalStyleDeclarations(style.css), atRule);
        }
    }
}

function createCanonicalStyleDeclarations(css: Record<string, string | number> | undefined): Record<string, string | number> {
    const declarations: Record<string, string | number> = {};

    for (const [property, value] of Object.entries(css ?? {})) {
        declarations[cssPropertyToKebabCase(property)] = typeof value === 'string' ? cssTokenReference(value) : value;
    }

    return declarations;
}

function cssTokenReference(value: string): string {
    return value.startsWith('token.') ? `var(--builder-token-${toKebabCase(value.slice('token.'.length))})` : value;
}

function addCssRule(rules: BuilderCssRule[], selector: string, declarations: Record<string, string | number>, atRule?: string): void {
    if (Object.keys(declarations).length > 0) {
        rules.push({ selector, declarations, atRule });
    }
}

function addTokenClass(classes: string[], type: string, property: string, value: unknown): void {
    if (typeof value === 'string' || typeof value === 'number') {
        classes.push(`builder-${toKebabCase(type)}--${property}-${toKebabCase(String(value))}`);
    }
}

function renderHtmlDocument(document: BuilderDocument, body: string, pretty: boolean): string {
    const title = escapeHtml(document.page.title);
    const description = document.page.description ?? document.metadata.description;
    const separator = pretty ? '\n' : '';
    const metaDescription = description ? `${separator}<meta name="description" content="${escapeHtmlAttribute(description)}">` : '';

    return [
        '<!doctype html>',
        '<html lang="en">',
        '<head>',
        '<meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1">',
        `<title>${title}</title>`,
        metaDescription.trim(),
        '<link rel="stylesheet" href="./styles.css">',
        '</head>',
        '<body>',
        body,
        '</body>',
        '</html>'
    ].filter(Boolean).join(separator);
}

function renderCss(theme: BuilderTheme | undefined, nodeRules: BuilderCssRule[]): string {
    const mergedTheme = { ...Builder_DEFAULT_THEME, ...(theme ?? {}) };
    const spacing = { ...Builder_DEFAULT_THEME.spacing, ...(theme?.spacing ?? {}) };
    const tokens = { ...(Builder_DEFAULT_THEME.tokens ?? {}), ...(theme?.tokens ?? {}) };
    const rules: BuilderCssRule[] = [
        {
            selector: ':root',
            declarations: {
                'color-scheme': mergedTheme.mode === 'dark' ? 'dark' : 'light',
                '--builder-font-family': mergedTheme.fontFamily ?? 'Inter, system-ui, sans-serif',
                '--builder-primary-color': cssColorOrVariable(mergedTheme.primaryColor ?? 'blue'),
                '--builder-radius': radiusToCssValue(mergedTheme.radius),
                '--builder-spacing-xs': spacingToCssValue(spacing.xs),
                '--builder-spacing-sm': spacingToCssValue(spacing.sm),
                '--builder-spacing-md': spacingToCssValue(spacing.md),
                '--builder-spacing-lg': spacingToCssValue(spacing.lg),
                '--builder-spacing-xl': spacingToCssValue(spacing.xl),
                ...createThemeTokenVariables(tokens)
            }
        },
        {
            selector: 'body',
            declarations: {
                margin: 0,
                'font-family': 'var(--builder-font-family)',
                color: mergedTheme.mode === 'dark' ? '#f8fafc' : '#111827',
                background: mergedTheme.mode === 'dark' ? '#111827' : '#ffffff'
            }
        },
        { selector: 'img', declarations: { 'max-width': '100%', height: 'auto' } },
        { selector: '.builder-container', declarations: { width: 'min(1120px, calc(100% - 32px))', margin: '0 auto' } },
        { selector: '.builder-section', declarations: { padding: 'var(--builder-spacing-xl) 0' } },
        { selector: '.builder-stack', declarations: { display: 'flex', 'flex-direction': 'column', gap: 'var(--builder-spacing-md)' } },
        { selector: '.builder-group', declarations: { display: 'flex', 'align-items': 'center', gap: 'var(--builder-spacing-md)', 'flex-wrap': 'wrap' } },
        { selector: '.builder-simple-grid, .builder-grid, .builder-metric-grid', declarations: { display: 'grid', gap: 'var(--builder-spacing-md)', 'grid-template-columns': 'repeat(auto-fit, minmax(220px, 1fr))' } },
        { selector: '.builder-card, .builder-metric-card, .builder-stat-card', declarations: { padding: 'var(--builder-spacing-lg)', border: '1px solid #e5e7eb', 'border-radius': 'var(--builder-radius)', background: mergedTheme.mode === 'dark' ? '#1f2937' : '#ffffff' } },
        { selector: '.builder-button', declarations: { border: 0, 'border-radius': 'var(--builder-radius)', padding: '10px 14px', background: 'var(--builder-primary-color)', color: '#ffffff', cursor: 'default' } },
        { selector: '.builder-badge', declarations: { display: 'inline-block', padding: '2px 8px', 'border-radius': '999px', background: '#e5e7eb', color: '#111827', 'font-size': '0.875rem' } },
        { selector: '.builder-table, .builder-data-table', declarations: { width: '100%', 'border-collapse': 'collapse' } },
        { selector: '.builder-table th, .builder-table td, .builder-data-table th, .builder-data-table td', declarations: { border: '1px solid #e5e7eb', padding: '8px', 'text-align': 'left' } },
        { selector: '.builder-alert, .builder-notification-block', declarations: { padding: 'var(--builder-spacing-md)', border: '1px solid #bfdbfe', 'border-radius': 'var(--builder-radius)', background: '#eff6ff' } },
        { selector: '.builder-form-field', declarations: { display: 'grid', gap: '6px', margin: '0 0 var(--builder-spacing-md)' } },
        { selector: '.builder-form-field-description', declarations: { margin: 0, color: '#6b7280', 'font-size': '0.875rem' } },
        { selector: '.builder-form-field input, .builder-form-field textarea, .builder-form-field select', declarations: { padding: '10px 12px', border: '1px solid #d1d5db', 'border-radius': 'var(--builder-radius)', 'font-family': 'inherit' } },
        { selector: '.builder-radio-options, .builder-tabs-list, .builder-actions', declarations: { display: 'flex', gap: 'var(--builder-spacing-sm)', 'flex-wrap': 'wrap' } },
        { selector: '.builder-tabs-panel', declarations: { padding: 'var(--builder-spacing-md) 0' } },
        { selector: '.builder-avatar', declarations: { 'border-radius': '999px', 'object-fit': 'cover' } },
        { selector: '.builder-chart-placeholder', declarations: { display: 'grid', 'place-items': 'center', 'min-height': '240px', border: '1px dashed #9ca3af', 'border-radius': 'var(--builder-radius)' } },
        { selector: '.builder-unsupported-component', declarations: { padding: 'var(--builder-spacing-md)', border: '1px dashed #9ca3af', 'border-radius': 'var(--builder-radius)', color: '#6b7280', background: '#f9fafb' } },
        ...nodeRules
    ];

    return rules.map(renderCssRule).join('\n');
}

function createThemeTokenVariables(tokens: Record<string, BuilderJsonValue>): Record<string, string | number> {
    const declarations: Record<string, string | number> = {};

    for (const [name, value] of Object.entries(tokens)) {
        if (typeof value === 'string' || typeof value === 'number') {
            declarations[`--builder-token-${toKebabCase(name)}`] = value;
        }
    }

    return declarations;
}

function renderCssRule(rule: BuilderCssRule): string {
    const body = `${rule.selector} { ${Object.entries(rule.declarations).map(([key, value]) => `${key}: ${formatCssValue(value)};`).join(' ')} }`;
    return rule.atRule ? `${rule.atRule} { ${body} }` : body;
}

function renderElement(tagName: string, attributes: Record<string, string | number | boolean | undefined>, children: string): string {
    return `<${tagName}${renderAttributes(attributes)}>${children}</${tagName}>`;
}

function renderVoidElement(tagName: string, attributes: Record<string, string | number | boolean | undefined>): string {
    return `<${tagName}${renderAttributes(attributes)}>`;
}

function renderAttributes(attributes: Record<string, string | number | boolean | undefined>): string {
    return Object.entries(attributes)
        .filter((entry): entry is [string, string | number | boolean] => entry[1] !== undefined && entry[1] !== '')
        .map(([key, value]) => value === true ? ` ${key}` : value === false ? '' : ` ${key}="${escapeHtmlAttribute(String(value))}"`)
        .join('');
}

function renderTextChildren(props: Record<string, unknown>, children: string, propName = 'children'): string {
    if (children) {
        return children;
    }
    const value = props[propName] ?? props.text ?? props.title;
    return value === undefined ? '' : escapeHtml(String(value));
}

function renderList(props: Record<string, unknown>, attributes: Record<string, string | number | boolean | undefined>, children: string): string {
    const tagName = props.type === 'ordered' ? 'ol' : 'ul';
    const items = Array.isArray(props.items) ? props.items : [];
    const content = children || items.map(item => renderElement('li', {}, escapeHtml(String(item)))).join('');
    return renderElement(tagName, attributes, content);
}

function renderDivider(props: Record<string, unknown>, attributes: Record<string, string | number | boolean | undefined>): string {
    const label = typeof props.label === 'string' ? props.label : undefined;
    if (!label && props.orientation !== 'vertical') {
        return renderVoidElement('hr', attributes);
    }

    return renderElement('div', {
        ...attributes,
        role: 'separator',
        'aria-orientation': props.orientation === 'vertical' ? 'vertical' : 'horizontal'
    }, label ? renderElement('span', { class: 'builder-divider-label' }, escapeHtml(label)) : '');
}

function renderInput(type: string, props: Record<string, unknown>, attributes: Record<string, string | number | boolean | undefined>): string {
    return renderFormField(props, attributes, renderVoidElement('input', attributes));
}

function renderSelect(props: Record<string, unknown>, attributes: Record<string, string | number | boolean | undefined>): string {
    const selected = props.value ?? props.defaultValue;
    const options = readOptions(props.data ?? props.options).map(option => renderElement('option', { value: option.value, selected: selected === option.value }, escapeHtml(option.label))).join('');
    return renderFormField(props, attributes, renderElement('select', attributes, options));
}

function renderCheckbox(props: Record<string, unknown>, attributes: Record<string, string | number | boolean | undefined>): string {
    if (props.checked === true || props.defaultChecked === true) {
        attributes.checked = true;
    }
    const input = renderVoidElement('input', { ...attributes, type: 'checkbox' });
    return renderElement('label', { class: 'builder-checkbox-label' }, `${input}${escapeHtml(String(props.label ?? ''))}${renderDescription(props)}`);
}

function renderRadioGroup(props: Record<string, unknown>, attributes: Record<string, string | number | boolean | undefined>): string {
    const options = readOptions(props.data ?? props.options);
    const name = String(props.name ?? attributes.id ?? 'radio');
    const selected = props.value ?? props.defaultValue;
    const radios = options.map(option => renderElement('label', { class: 'builder-radio-label' }, `${renderVoidElement('input', {
        type: 'radio',
        name,
        value: option.value,
        checked: selected === option.value,
        disabled: props.disabled === true
    })}${escapeHtml(option.label)}`)).join('');
    return renderElement('fieldset', attributes, `${props.label ? renderElement('legend', {}, escapeHtml(String(props.label))) : ''}${renderDescription(props)}${renderElement('div', { class: 'builder-radio-options' }, radios)}`);
}

function renderDynamicForm(node: BuilderNode, props: Record<string, unknown>, attributes: Record<string, string | number | boolean | undefined>, context: BuilderHtmlRenderContext): string {
    const title = props.title ? renderElement('h2', {}, escapeHtml(String(props.title))) : '';
    const description = props.description ? renderElement('p', {}, escapeHtml(String(props.description))) : '';
    const fields = renderChildren(node, context);
    const submit = renderElement('button', { type: 'submit', class: 'builder-button' }, escapeHtml(String(props.submitLabel ?? 'Submit')));
    const reset = props.resetLabel ? renderElement('button', { type: 'reset', class: 'builder-button builder-button-secondary' }, escapeHtml(String(props.resetLabel))) : '';
    const actions = renderSlot(node, 'actions', context) || renderElement('div', { class: 'builder-actions' }, `${submit}${reset}`);
    return renderElement('form', attributes, `${title}${description}${fields}${actions}`);
}

function renderTable(props: Record<string, unknown>, attributes: Record<string, string | number | boolean | undefined>): string {
    const columns = readColumns(props.columns);
    const rows = readRows(props.rows);
    const head = renderElement('thead', {}, renderElement('tr', {}, columns.map(column => renderElement('th', {}, escapeHtml(column.label))).join('')));
    const bodyRows = rows.length === 0
        ? renderElement('tr', {}, renderElement('td', { colspan: Math.max(columns.length, 1) }, escapeHtml(String(props.emptyText ?? 'No data'))))
        : rows.map(row => renderElement('tr', {}, columns.map(column => renderElement('td', {}, escapeHtml(String(row[column.key] ?? '')))).join(''))).join('');
    return renderElement('table', attributes, `${props.caption ? renderElement('caption', {}, escapeHtml(String(props.caption))) : ''}${head}${renderElement('tbody', {}, bodyRows)}`);
}

function renderMetricCard(props: Record<string, unknown>, attributes: Record<string, string | number | boolean | undefined>): string {
    return renderElement('article', attributes, [
        renderElement('p', { class: 'builder-metric-label' }, escapeHtml(String(props.label ?? 'Metric'))),
        renderElement('strong', { class: 'builder-metric-value' }, escapeHtml(String(props.value ?? ''))),
        props.description ? renderElement('p', {}, escapeHtml(String(props.description))) : ''
    ].join(''));
}

function renderStatCard(props: Record<string, unknown>, attributes: Record<string, string | number | boolean | undefined>): string {
    const metrics = readMetrics(props.metrics).map(metric => renderElement('li', {}, `${escapeHtml(metric.label)}: ${escapeHtml(String(metric.value))}`)).join('');
    return renderElement('article', attributes, [
        props.title ? renderElement('h3', {}, escapeHtml(String(props.title))) : '',
        renderElement('strong', {}, escapeHtml(String(props.value ?? ''))),
        props.subtitle ? renderElement('p', {}, escapeHtml(String(props.subtitle))) : '',
        metrics ? renderElement('ul', {}, metrics) : ''
    ].join(''));
}

function renderNavLink(props: Record<string, unknown>, attributes: Record<string, string | number | boolean | undefined>): string {
    const items = readNavItems(props.items);
    if (items.length === 0) {
        return renderElement('a', attributes, escapeHtml(String(props.label ?? 'Link')));
    }
    return renderElement('nav', attributes, items.map(item => renderElement('a', { href: sanitizeUrl(item.href ?? '#') ?? '#' }, escapeHtml(item.label))).join(''));
}

function renderBreadcrumbs(props: Record<string, unknown>, attributes: Record<string, string | number | boolean | undefined>): string {
    const items = readNavItems(props.items);
    return renderElement('nav', attributes, items.map((item, index) => {
        const link = renderElement('a', { href: sanitizeUrl(item.href ?? '#') ?? '#' }, escapeHtml(item.label));
        return renderElement('span', {}, index === 0 ? link : ` / ${link}`);
    }).join(''));
}

function renderTabs(props: Record<string, unknown>, attributes: Record<string, string | number | boolean | undefined>): string {
    const tabs = readNavItems(props.tabs ?? props.items);
    const active = String(props.defaultValue ?? tabs[0]?.value ?? '');
    const list = renderElement('div', { class: 'builder-tabs-list', role: 'tablist' }, tabs.map(tab => renderElement('a', {
        href: sanitizeUrl(tab.href ?? `#${tab.value}`) ?? `#${tab.value}`,
        id: `${tab.value}-tab`,
        role: 'tab',
        'aria-selected': tab.value === active,
        'aria-controls': `${tab.value}-panel`,
        tabindex: tab.value === active ? undefined : -1
    }, escapeHtml(tab.label))).join(''));
    const panels = tabs.map(tab => renderElement('article', {
        class: 'builder-tabs-panel',
        id: `${tab.value}-panel`,
        role: 'tabpanel',
        'aria-labelledby': `${tab.value}-tab`,
        hidden: tab.value === active ? undefined : true
    }, renderElement('h3', {}, escapeHtml(tab.label)))).join('');
    return renderElement('section', attributes, `${list}${panels}`);
}

function renderOverlayContent(props: Record<string, unknown>, children: string, context: BuilderHtmlRenderContext, node: BuilderNode): string {
    const title = props.title ? renderElement('h2', {}, escapeHtml(String(props.title))) : '';
    return `${title}${children}${renderSlot(node, 'actions', context)}`;
}

function renderNoticeContent(props: Record<string, unknown>, children: string): string {
    return [
        props.title ? renderElement('strong', {}, escapeHtml(String(props.title))) : '',
        props.message || props.children ? renderElement('p', {}, escapeHtml(String(props.message ?? props.children))) : '',
        children
    ].join('');
}

function renderHeroSection(node: BuilderNode, props: Record<string, unknown>, attributes: Record<string, string | number | boolean | undefined>, context: BuilderHtmlRenderContext): string {
    const imageSrc = typeof props.imageSrc === 'string' ? props.imageSrc : typeof props.image === 'string' ? props.image : undefined;
    const image = imageSrc ? renderVoidElement('img', { src: sanitizeUrl(imageSrc, 'asset'), alt: String(props.imageAlt ?? '') }) : '';
    const actions = renderSlot(node, 'actions', context) || [
        props.primaryActionLabel ? renderElement('a', { class: 'builder-button', href: sanitizeUrl(String(props.primaryActionHref ?? '#')) ?? '#' }, escapeHtml(String(props.primaryActionLabel))) : '',
        props.secondaryActionLabel ? renderElement('a', { class: 'builder-button builder-button-secondary', href: sanitizeUrl(String(props.secondaryActionHref ?? '#')) ?? '#' }, escapeHtml(String(props.secondaryActionLabel))) : ''
    ].join('');
    const media = renderSlot(node, 'media', context) || image;
    return renderElement('section', attributes, [
        props.eyebrow ? renderElement('p', {}, escapeHtml(String(props.eyebrow))) : '',
        renderElement('h1', {}, escapeHtml(String(props.title ?? 'Hero'))),
        props.subtitle ? renderElement('p', {}, escapeHtml(String(props.subtitle))) : '',
        actions ? renderElement('div', { class: 'builder-actions' }, actions) : '',
        media
    ].join(''));
}

function renderFeatureGrid(props: Record<string, unknown>, attributes: Record<string, string | number | boolean | undefined>): string {
    const features = readFeatures(props.features).map(feature => renderElement('article', { class: 'builder-card' }, `${renderElement('h3', {}, escapeHtml(feature.title))}${feature.description ? renderElement('p', {}, escapeHtml(feature.description)) : ''}`)).join('');
    return renderElement('section', attributes, `${renderMarketingHeader(props)}${renderElement('div', { class: 'builder-simple-grid' }, features)}`);
}

function renderPricingSection(props: Record<string, unknown>, attributes: Record<string, string | number | boolean | undefined>): string {
    const plans = readPricingPlans(props.plans).map(plan => renderElement('article', { class: 'builder-card' }, [
        renderElement('h3', {}, escapeHtml(plan.name)),
        renderElement('strong', {}, escapeHtml(plan.price)),
        renderElement('ul', {}, plan.features.map(feature => renderElement('li', {}, escapeHtml(feature))).join('')),
        plan.ctaLabel ? renderElement('a', { class: 'builder-button', href: '#' }, escapeHtml(plan.ctaLabel)) : ''
    ].join(''))).join('');
    return renderElement('section', attributes, `${renderMarketingHeader(props)}${renderElement('div', { class: 'builder-simple-grid' }, plans)}`);
}

function renderTestimonialSection(props: Record<string, unknown>, attributes: Record<string, string | number | boolean | undefined>): string {
    const testimonials = readTestimonials(props.testimonials).map(testimonial => renderElement('figure', { class: 'builder-card' }, `${renderElement('blockquote', {}, escapeHtml(testimonial.quote))}${renderElement('figcaption', {}, escapeHtml(testimonial.author))}`)).join('');
    return renderElement('section', attributes, `${renderMarketingHeader(props)}${renderElement('div', { class: 'builder-simple-grid' }, testimonials)}`);
}

function renderCtaSection(node: BuilderNode, props: Record<string, unknown>, attributes: Record<string, string | number | boolean | undefined>, context: BuilderHtmlRenderContext): string {
    const actions = renderSlot(node, 'actions', context) || [
        props.primaryActionLabel ? renderElement('a', { class: 'builder-button', href: sanitizeUrl(String(props.primaryActionHref ?? '#')) ?? '#' }, escapeHtml(String(props.primaryActionLabel))) : '',
        props.secondaryActionLabel ? renderElement('a', { class: 'builder-button builder-button-secondary', href: sanitizeUrl(String(props.secondaryActionHref ?? '#')) ?? '#' }, escapeHtml(String(props.secondaryActionLabel))) : ''
    ].join('');
    return renderElement('section', attributes, [
        renderElement('h2', {}, escapeHtml(String(props.title ?? 'Call to action'))),
        props.description ? renderElement('p', {}, escapeHtml(String(props.description))) : '',
        actions ? renderElement('div', { class: 'builder-actions' }, actions) : ''
    ].join(''));
}

function renderChartPlaceholder(props: Record<string, unknown>, attributes: Record<string, string | number | boolean | undefined>): string {
    return renderElement('div', attributes, `${props.title ? renderElement('strong', {}, escapeHtml(String(props.title))) : ''}${renderElement('span', {}, escapeHtml(String(props.emptyText ?? props.chartType ?? 'Chart')))}`);
}

function renderDashboardHeader(node: BuilderNode, props: Record<string, unknown>, attributes: Record<string, string | number | boolean | undefined>, context: BuilderHtmlRenderContext): string {
    return renderElement('header', attributes, [
        renderElement('h1', {}, escapeHtml(String(props.title ?? 'Dashboard'))),
        props.description ? renderElement('p', {}, escapeHtml(String(props.description))) : '',
        props.periodLabel ? renderElement('span', { class: 'builder-badge' }, escapeHtml(String(props.periodLabel))) : '',
        renderSlot(node, 'actions', context)
    ].join(''));
}

function renderFormField(props: Record<string, unknown>, attributes: Record<string, string | number | boolean | undefined>, control: string): string {
    const label = typeof props.label === 'string' ? renderElement('label', { for: String(attributes.id) }, escapeHtml(props.label)) : '';
    return renderElement('div', { class: 'builder-form-field' }, `${label}${renderDescription(props)}${control}${renderFieldError(props, attributes)}`);
}

function renderDescription(props: Record<string, unknown>): string {
    return typeof props.description === 'string' ? renderElement('p', { class: 'builder-form-field-description' }, escapeHtml(props.description)) : '';
}

function renderFieldError(props: Record<string, unknown>, attributes: Record<string, string | number | boolean | undefined>): string {
    return typeof props.error === 'string' && props.error.length > 0
        ? renderElement('p', { id: `${attributes.id}-error`, class: 'builder-form-field-error', role: 'alert' }, escapeHtml(props.error))
        : '';
}

function renderUnsupportedNode(node: BuilderNode, tagName: string | undefined, attributes: Record<string, string | number | boolean | undefined>, children: string): string {
    const safeTagName = readTag(tagName, 'div');
    const className = `${attributes.class ?? ''} builder-unsupported-component`.trim();
    return renderElement(safeTagName, {
        ...attributes,
        class: className,
        role: 'note',
        'data-builder-unsupported': node.type
    }, children || escapeHtml(`Unsupported component: ${node.type}`));
}

function renderMarketingHeader(props: Record<string, unknown>): string {
    return [
        props.eyebrow ? renderElement('p', {}, escapeHtml(String(props.eyebrow))) : '',
        props.title ? renderElement('h2', {}, escapeHtml(String(props.title))) : '',
        props.subtitle || props.description ? renderElement('p', {}, escapeHtml(String(props.subtitle ?? props.description))) : ''
    ].join('');
}

function renderMarkdown(markdown: string, allowHtml: boolean, linkTarget: '_self' | '_blank'): string {
    const escaped = allowHtml ? sanitizeHtml(markdown, linkTarget) : escapeHtml(markdown);
    return escaped
        .split(/\n{2,}/)
        .map(block => `<p>${block.replace(/\n/g, '<br>')}</p>`)
        .join('');
}

function sanitizeHtml(value: string, linkTarget: '_self' | '_blank'): string {
    const allowedTags = new Set(['a', 'br', 'strong', 'em', 'b', 'i', 'code', 'pre', 'blockquote', 'ul', 'ol', 'li', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

    return value.replace(/<\/?([a-z][a-z0-9-]*)((?:\s+[^\s"'=<>`/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*\/?>/gi, (match, tagName: string, rawAttributes = '') => {
        const normalizedTagName = tagName.toLowerCase();
        if (!allowedTags.has(normalizedTagName)) {
            return escapeHtml(match);
        }

        if (match.startsWith('</')) {
            return `</${normalizedTagName}>`;
        }

        if (normalizedTagName === 'br') {
            return '<br>';
        }

        const attributes = normalizedTagName === 'a' ? renderSafeAnchorAttributes(rawAttributes, linkTarget) : '';
        return `<${normalizedTagName}${attributes}>`;
    });
}

function renderSafeAnchorAttributes(rawAttributes: string, linkTarget: '_self' | '_blank'): string {
    const attributes: Record<string, string | undefined> = {};
    const href = readHtmlAttribute(rawAttributes, 'href');
    const title = readHtmlAttribute(rawAttributes, 'title');
    const safeHref = href ? sanitizeUrl(href) : undefined;

    attributes.href = safeHref ?? '#';
    if (title) {
        attributes.title = title;
    }
    if (linkTarget === '_blank') {
        attributes.target = '_blank';
        attributes.rel = 'noopener noreferrer';
    }

    return renderAttributes(attributes);
}

function readHtmlAttribute(rawAttributes: string, name: string): string | undefined {
    const matcher = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>\\x60]+))`, 'i');
    const match = matcher.exec(rawAttributes);
    const value = match?.[1] ?? match?.[2] ?? match?.[3];
    return value === undefined ? undefined : decodeBasicHtmlEntities(value);
}

function readOptions(value: unknown): Array<{ label: string; value: string }> {
    if (!Array.isArray(value)) {
        return [];
    }
    return value.map(option => {
        if (typeof option === 'string') {
            return { label: option, value: option };
        }
        if (isRecord(option) && typeof option.label === 'string' && typeof option.value === 'string') {
            return { label: option.label, value: option.value };
        }
        return undefined;
    }).filter((option): option is { label: string; value: string } => option !== undefined);
}

function readColumns(value: unknown): Array<{ key: string; label: string }> {
    return readRecords(value).map(column => ({
        key: String(column.key ?? ''),
        label: String(column.label ?? column.key ?? '')
    })).filter(column => column.key !== '');
}

function readRows(value: unknown): Record<string, unknown>[] {
    return readRecords(value);
}

function readMetrics(value: unknown): Array<{ label: string; value: string | number }> {
    return readRecords(value).map(metric => ({
        label: String(metric.label ?? 'Metric'),
        value: typeof metric.value === 'number' || typeof metric.value === 'string' ? metric.value : ''
    }));
}

function readNavItems(value: unknown): Array<{ label: string; href?: string; value: string }> {
    return readRecords(value).map((item, index) => ({
        label: String(item.label ?? `Item ${index + 1}`),
        href: typeof item.href === 'string' ? item.href : undefined,
        value: typeof item.value === 'string' ? item.value : `item-${index + 1}`
    }));
}

function readFeatures(value: unknown): Array<{ title: string; description?: string }> {
    return readRecords(value).map(item => ({ title: String(item.title ?? 'Feature'), description: typeof item.description === 'string' ? item.description : undefined }));
}

function readPricingPlans(value: unknown): Array<{ name: string; price: string; features: string[]; ctaLabel?: string }> {
    return readRecords(value).map(item => ({
        name: String(item.name ?? 'Plan'),
        price: String(item.price ?? ''),
        features: Array.isArray(item.features) ? item.features.filter((feature): feature is string => typeof feature === 'string') : [],
        ctaLabel: typeof item.ctaLabel === 'string' ? item.ctaLabel : undefined
    }));
}

function readTestimonials(value: unknown): Array<{ quote: string; author: string }> {
    return readRecords(value).map(item => ({ quote: String(item.quote ?? ''), author: String(item.author ?? 'Customer') }));
}

function readRecords(value: unknown): Record<string, unknown>[] {
    return Array.isArray(value) ? value.filter(isRecord) : [];
}

function readTag(value: unknown, fallback: string): string {
    return typeof value === 'string' && /^[a-z][a-z0-9-]*$/i.test(value) ? value : fallback;
}

function readHeadingLevel(value: unknown): number {
    return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 6 ? value : 2;
}

function readLinkTarget(value: unknown): '_self' | '_blank' {
    return value === '_blank' ? '_blank' : '_self';
}

function readScalarAttribute(value: unknown): string | number | undefined {
    return typeof value === 'string' || typeof value === 'number' ? value : undefined;
}

function readDimensionAttribute(value: unknown): string | number | undefined {
    if (typeof value === 'number') {
        return value;
    }
    if (typeof value === 'string' && /^\d+$/.test(value)) {
        return value;
    }
    return undefined;
}

function readPath(value: Record<string, unknown>, path: string): BuilderJsonValue | undefined {
    let current: unknown = value;
    for (const segment of path.split('.')) {
        current = isRecord(current) ? current[segment] : undefined;
    }
    return isJsonValue(current) ? current : undefined;
}

function radiusToCssValue(value: unknown): string {
    if (typeof value === 'number') {
        return `${value}px`;
    }
    if (value === 'none') {
        return '0';
    }
    if (typeof value === 'string' && /^\d/.test(value)) {
        return value;
    }
    return '8px';
}

function spacingToCssValue(value: unknown): string {
    return typeof value === 'number' ? `${value}px` : typeof value === 'string' ? value : '16px';
}

function formatCssValue(value: string | number): string {
    return typeof value === 'number' ? `${value}px` : value;
}

function sanitizeUrl(value: string, kind: 'link' | 'asset' | 'dataSource' = 'link'): string | undefined {
    const result = validateBuilderUrl(value, kind);
    return result.valid ? result.normalized : undefined;
}

function toKebabCase(value: string): string {
    return value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/[\s_]+/g, '-').toLowerCase();
}

function cssPropertyToKebabCase(value: string): string {
    return value.startsWith('--') ? value : toKebabCase(value);
}

function cssEscape(value: string): string {
    return value.replace(/[^A-Za-z0-9_-]/g, character => `\\${character}`);
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeHtmlAttribute(value: string): string {
    return escapeHtml(value).replace(/`/g, '&#96;');
}

function decodeBasicHtmlEntities(value: string): string {
    return value
        .replace(/&#(\d+);?/g, (_match, code: string) => String.fromCodePoint(Number(code)))
        .replace(/&#x([0-9a-f]+);?/gi, (_match, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
        .replace(/&colon;/gi, ':')
        .replace(/&tab;/gi, '\t')
        .replace(/&newline;/gi, '\n')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'");
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isJsonValue(value: unknown): value is BuilderJsonValue {
    if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return true;
    }
    if (Array.isArray(value)) {
        return value.every(isJsonValue);
    }
    return isRecord(value) && Object.values(value).every(isJsonValue);
}

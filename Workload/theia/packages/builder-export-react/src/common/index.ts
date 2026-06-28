import {
    serializeBuilderDocumentJson,
    validateBuilderUrl,
    validateBuilderDocumentStructure,
    type BuilderDocument,
    type BuilderJsonValue,
    type BuilderNode
} from '@cybervinci/builder-schema';
import {
    createDefaultBuilderComponentRegistry,
    validateBuilderDocumentTypesAgainstRegistry,
    type BuilderComponentDefinition,
    type BuilderComponentRegistry
} from '@cybervinci/builder-registry';

export interface BuilderReactExportResult {
    files: Record<string, string>;
    warnings: BuilderReactExportWarning[];
}

export interface BuilderReactExportWarning {
    path: string;
    message: string;
    nodeId?: string;
    componentType?: string;
}

export interface BuilderReactExporterOptions {
    registry?: BuilderComponentRegistry;
    validate?: boolean;
    componentImportPath?: string;
    includeCanonicalDocument?: boolean;
    includeSchemaJson?: boolean;
    pretty?: boolean;
    separateLargeSections?: boolean;
    largeSectionNodeThreshold?: number;
}

export interface BuilderReactRenderContext {
    document: BuilderDocument;
    registry: BuilderComponentRegistry;
    componentImportPath: string;
    warnings: BuilderReactExportWarning[];
    imports: Set<string>;
    localComponents: Set<string>;
    actions: Set<string>;
    dataSources: Set<string>;
    pretty: boolean;
}

export interface BuilderSeparatedComponent {
    node: BuilderNode;
    name: string;
    fileName: string;
}

export class BuilderReactExportError extends Error {

    constructor(message: string, readonly errors: readonly { path: string; message: string; nodeId?: string }[] = []) {
        super(message);
        this.name = 'BuilderReactExportError';
    }
}

const MANTINE_COMPONENTS = new Set([
    'Page',
    'Section',
    'Container',
    'Stack',
    'Group',
    'SimpleGrid',
    'Grid',
    'Card',
    'Divider',
    'Space',
    'Box',
    'Title',
    'Text',
    'Badge',
    'List',
    'Button',
    'TextInput',
    'Textarea',
    'Select',
    'Checkbox',
    'RadioGroup',
    'NumberInput',
    'Modal',
    'Drawer',
    'Alert',
    'Loader',
    'Image',
    'Avatar',
    'Anchor',
    'Breadcrumbs',
    'Tabs'
]);

const COMPONENT_NAME_OVERRIDES: Record<string, string> = {
    Page: 'Box',
    Section: 'Box',
    Markdown: 'BuilderMarkdown',
    DateInput: 'TextInput',
    DynamicForm: 'BuilderDynamicForm',
    Table: 'BuilderTable',
    DataTable: 'BuilderTable',
    MetricCard: 'BuilderMetricCard',
    StatCard: 'BuilderStatCard',
    NavLink: 'BuilderNavLink',
    NotificationBlock: 'BuilderNotificationBlock',
    Icon: 'BuilderIcon',
    HeroSection: 'BuilderHeroSection',
    FeatureGrid: 'BuilderFeatureGrid',
    PricingSection: 'BuilderPricingSection',
    TestimonialSection: 'BuilderTestimonialSection',
    CTASection: 'BuilderCTASection',
    ChartPlaceholder: 'BuilderChartPlaceholder',
    MetricGrid: 'SimpleGrid',
    DashboardHeader: 'BuilderDashboardHeader'
};

const LOCAL_COMPONENTS = new Set(Object.values(COMPONENT_NAME_OVERRIDES).filter(name => name.startsWith('Builder')));

export function reactExporter(document: BuilderDocument, options: BuilderReactExporterOptions = {}): BuilderReactExportResult {
    const generated = generateBuilderPageTsxWithContext(document, options);
    const files: Record<string, string> = {
        'Page.tsx': generated.pageTsx
    };

    for (const component of generated.components) {
        files[component.fileName] = component.tsx;
    }

    const serializedDocument = serializeBuilderDocumentJson(document, { space: 2 });

    if (options.includeCanonicalDocument !== false) {
        files['builder-document.json'] = serializedDocument;
    }

    if (options.includeSchemaJson === true) {
        files['schema.json'] = serializedDocument;
    }

    return {
        files,
        warnings: generated.warnings
    };
}

export function generateBuilderPageTsx(document: BuilderDocument, options: BuilderReactExporterOptions = {}): string {
    return generateBuilderPageTsxWithContext(document, options).pageTsx;
}

function generateBuilderPageTsxWithContext(
    document: BuilderDocument,
    options: BuilderReactExporterOptions = {}
): { pageTsx: string; warnings: BuilderReactExportWarning[]; components: { fileName: string; tsx: string }[] } {
    const registry = options.registry ?? createDefaultBuilderComponentRegistry();

    if (options.validate !== false) {
        assertExportableDocument(document, registry);
    }

    const context: BuilderReactRenderContext = {
        document,
        registry,
        componentImportPath: options.componentImportPath ?? '@mantine/core',
        warnings: [],
        imports: new Set(),
        localComponents: new Set(),
        actions: new Set(),
        dataSources: new Set(),
        pretty: options.pretty ?? true
    };
    const separatedComponents = options.separateLargeSections === true ? collectSeparatedComponents(document.tree, options) : [];
    const separatedById = new Map(separatedComponents.map(component => [component.node.id, component]));
    const body = renderBuilderNodeToTsx(document.tree, context, 2, separatedById);
    const componentFiles = separatedComponents.map(component => renderSeparatedComponentFile(component, document, options, registry));
    return {
        pageTsx: renderPageFile(document, body, context),
        warnings: [...context.warnings, ...componentFiles.flatMap(component => component.warnings)],
        components: componentFiles
    };
}

export const renderBuilderDocumentToReact = reactExporter;
export const createReactExport = reactExporter;

export function createReactExportPlaceholder(document: BuilderDocument): BuilderReactExportResult {
    return reactExporter(document, { validate: false });
}

export function renderBuilderNodeToTsx(
    node: BuilderNode,
    context: BuilderReactRenderContext,
    depth = 0,
    separatedComponents: Map<string, BuilderSeparatedComponent> = new Map()
): string {
    if (node.meta?.hiddenInEditor === true) {
        return '';
    }

    const separated = separatedComponents.get(node.id);
    if (separated) {
        return `${' '.repeat(depth * 4)}<${separated.name} />`;
    }

    const definition = context.registry.get(node.type);
    const componentName = resolveComponentName(node, definition, context);
    collectNodeRuntimeReferences(node, context);
    const props = createTsxProps(node, definition, context);
    const children = renderNodeContent(node, context, depth + 1, separatedComponents);
    const indent = ' '.repeat(depth * 4);

    if (children.length === 0) {
        return `${indent}<${componentName}${props} />`;
    }

    return [
        `${indent}<${componentName}${props}>`,
        children,
        `${indent}</${componentName}>`
    ].join('\n');
}

function assertExportableDocument(document: BuilderDocument, registry: BuilderComponentRegistry): void {
    const structural = validateBuilderDocumentStructure(document);
    const registryValidation = validateBuilderDocumentTypesAgainstRegistry(document, registry);
    const errors = [...structural.errors, ...registryValidation.errors];

    if (errors.length > 0) {
        throw new BuilderReactExportError('Cannot export invalid Builder document to React/TSX.', errors);
    }
}

function resolveComponentName(node: BuilderNode, definition: BuilderComponentDefinition | undefined, context: BuilderReactRenderContext): string {
    const componentName = definition?.exportReact?.componentName ?? COMPONENT_NAME_OVERRIDES[node.type] ?? node.type;

    if (!definition) {
        context.warnings.push({
            path: `node(${node.id}).type`,
            message: `Unknown Builder component '${node.type}' was exported with a fallback component.`,
            nodeId: node.id,
            componentType: node.type
        });
        context.localComponents.add('BuilderUnsupported');
        return 'BuilderUnsupported';
    }

    if (LOCAL_COMPONENTS.has(componentName)) {
        context.localComponents.add(componentName);
    } else if (MANTINE_COMPONENTS.has(componentName)) {
        context.imports.add(componentName);
    } else {
        context.localComponents.add('BuilderUnsupported');
        context.warnings.push({
            path: `node(${node.id}).type`,
            message: `Component '${node.type}' has no React export adapter; fallback component emitted.`,
            nodeId: node.id,
            componentType: node.type
        });
        return 'BuilderUnsupported';
    }

    return componentName;
}

function createTsxProps(node: BuilderNode, definition: BuilderComponentDefinition | undefined, context: BuilderReactRenderContext): string {
    const sourceProps = {
        ...(definition?.defaultProps ?? {}),
        ...(node.props ?? {})
    };
    const props: Record<string, unknown> = {};

    props.id = node.id;
    props['data-builder-type'] = node.type;

    for (const [key, value] of Object.entries(sourceProps)) {
        if (key === 'children' || value === undefined || isForbiddenReactProp(key)) {
            continue;
        }
        const safeValue = sanitizeReactPropValue(key, value, node, context);
        if (safeValue !== undefined) {
            props[mapPropName(key, node.type)] = safeValue;
        }
    }

    if (node.style?.className) {
        props.className = node.style.className;
    }

    if (!definition) {
        props.componentType = node.type;
    }

    return `${renderProps(props)}${renderEventProps(node, context)}`;
}

function renderNodeContent(
    node: BuilderNode,
    context: BuilderReactRenderContext,
    depth: number,
    separatedComponents: Map<string, BuilderSeparatedComponent>
): string {
    const parts: string[] = [];
    const text = readTextChildren(node.props?.children);

    if (text !== undefined) {
        parts.push(`${' '.repeat(depth * 4)}{${JSON.stringify(text)}}`);
    }

    for (const slotName of Object.keys(node.slots ?? {}).sort()) {
        const slotNodes = node.slots?.[slotName] ?? [];
        if (slotNodes.length === 0) {
            continue;
        }
        parts.push(`${' '.repeat(depth * 4)}{/* Builder slot: ${slotName} */}`);
        parts.push(...slotNodes.map(child => renderBuilderNodeToTsx(child, context, depth, separatedComponents)).filter(Boolean));
    }

    parts.push(...(node.children ?? []).map(child => renderBuilderNodeToTsx(child, context, depth, separatedComponents)).filter(Boolean));
    return parts.join('\n');
}

function renderPageFile(document: BuilderDocument, body: string, context: BuilderReactRenderContext): string {
    context.imports.add('MantineProvider');
    if (context.localComponents.size > 0) {
        context.imports.add('Box');
    }
    const imports = [...context.imports].sort();
    const localComponents = renderLocalComponents(context.localComponents);
    const theme = renderTheme(document);
    const componentImports = renderSeparatedComponentImports(body);

    return [
        '// Generated from Builder Schema. Do not edit this file as the canonical source.',
        '// Update the .builder.json document and run the exporter again.',
        "import type * as React from 'react';",
        `import { ${imports.join(', ')} } from ${JSON.stringify(context.componentImportPath)};`,
        componentImports,
        '',
        `export const builderSchemaVersion = ${JSON.stringify(document.schemaVersion)};`,
        `export const builderPageTitle = ${JSON.stringify(document.page.title)};`,
        '',
        localComponents,
        renderDataServiceStubs(document, context.dataSources),
        renderActionStubs(document, context.actions),
        `const builderTheme = ${theme};`,
        '',
        'export function BuilderPage(): JSX.Element {',
        '    return (',
        '        <MantineProvider theme={builderTheme}>',
        body,
        '        </MantineProvider>',
        '    );',
        '}',
        '',
        'export default BuilderPage;',
        ''
    ].filter(section => section !== '').join('\n');
}

function renderSeparatedComponentFile(
    component: BuilderSeparatedComponent,
    document: BuilderDocument,
    options: BuilderReactExporterOptions,
    registry: BuilderComponentRegistry
): { fileName: string; tsx: string; warnings: BuilderReactExportWarning[] } {
    const context: BuilderReactRenderContext = {
        document,
        registry,
        componentImportPath: options.componentImportPath ?? '@mantine/core',
        warnings: [],
        imports: new Set(),
        localComponents: new Set(),
        actions: new Set(),
        dataSources: new Set(),
        pretty: options.pretty ?? true
    };
    const body = renderBuilderNodeToTsx(component.node, context, 1);
    if (context.localComponents.size > 0) {
        context.imports.add('Box');
    }
    const localComponents = renderLocalComponents(context.localComponents);
    const imports = [...context.imports].sort();

    return {
        fileName: component.fileName,
        warnings: context.warnings,
        tsx: [
            '// Generated from Builder Schema. Do not edit this file as the canonical source.',
            "import type * as React from 'react';",
            `import { ${imports.join(', ')} } from ${JSON.stringify(options.componentImportPath ?? '@mantine/core')};`,
            '',
            localComponents,
            `export function ${component.name}(): JSX.Element {`,
            '    return (',
            body,
            '    );',
            '}',
            ''
        ].filter(section => section !== '').join('\n')
    };
}

function collectSeparatedComponents(root: BuilderNode, options: BuilderReactExporterOptions): BuilderSeparatedComponent[] {
    const threshold = options.largeSectionNodeThreshold ?? 6;
    const components: BuilderSeparatedComponent[] = [];
    const usedNames = new Set<string>();

    for (const child of root.children ?? []) {
        if (isLargeSectionNode(child, threshold)) {
            const baseName = toPascalCase(child.id || child.type);
            const name = createUniqueName(`${baseName}Section`, usedNames);
            components.push({
                node: child,
                name,
                fileName: `components/${name}.tsx`
            });
        }
    }

    return components;
}

function isLargeSectionNode(node: BuilderNode, threshold: number): boolean {
    return isSectionLikeNode(node) && countRenderableNodes(node) >= threshold;
}

function isSectionLikeNode(node: BuilderNode): boolean {
    return node.type === 'Section' || node.type.endsWith('Section');
}

function countRenderableNodes(node: BuilderNode): number {
    return 1
        + (node.children ?? []).reduce((total, child) => total + countRenderableNodes(child), 0)
        + Object.values(node.slots ?? {}).flat().reduce((total, child) => total + countRenderableNodes(child), 0);
}

function createUniqueName(baseName: string, usedNames: Set<string>): string {
    let name = baseName;
    let index = 2;
    while (usedNames.has(name)) {
        name = `${baseName}${index}`;
        index++;
    }
    usedNames.add(name);
    return name;
}

function toPascalCase(value: string): string {
    const normalized = value
        .replace(/[^a-zA-Z0-9]+/g, ' ')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map(part => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
        .join('');

    return normalized.length > 0 && /^[A-Z]/.test(normalized) ? normalized : 'Builder';
}

function renderSeparatedComponentImports(body: string): string {
    const componentNames = [...body.matchAll(/<([A-Z][A-Za-z0-9]*Section\d?) \/>/g)].map(match => match[1]);
    return [...new Set(componentNames)]
        .sort()
        .map(name => `import { ${name} } from './components/${name}';`)
        .join('\n');
}

function renderLocalComponents(localComponents: Set<string>): string {
    const blocks: string[] = [];

    for (const name of [...localComponents].sort()) {
        blocks.push(`function ${name}(props: Record<string, unknown> & { children?: React.ReactNode }): JSX.Element {
    const { children, ...rest } = props;
    return <Box {...rest}>{children}</Box>;
}`);
    }

    return blocks.join('\n\n');
}

function renderTheme(document: BuilderDocument): string {
    const theme = document.theme ? {
        primaryColor: document.theme.primaryColor,
        fontFamily: document.theme.fontFamily,
        radius: document.theme.radius
    } : {};

    return renderJsonExpression(theme);
}

function renderProps(props: Record<string, unknown>): string {
    const rendered = Object.entries(props)
        .filter(([, value]) => isSerializablePropValue(value))
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, value]) => renderProp(key, value));

    return rendered.length === 0 ? '' : ` ${rendered.join(' ')}`;
}

function renderEventProps(node: BuilderNode, context: BuilderReactRenderContext): string {
    const rendered = Object.entries(node.events ?? {})
        .filter(([, binding]) => typeof binding?.actionId === 'string' && binding.actionId.length > 0)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([eventName, binding]) => {
            const actionName = toSafeIdentifier(binding.actionId, 'builderAction');
            const propName = mapEventPropName(eventName);
            const options = {
                preventDefault: binding.preventDefault === true,
                stopPropagation: binding.stopPropagation === true,
                params: binding.params ?? {}
            };
            return `${propName}={(event) => builderActions.${actionName}(event, ${renderJsonExpression(options)})}`;
        });

    return rendered.length === 0 ? '' : ` ${rendered.join(' ')}`;
}

function renderDataServiceStubs(document: BuilderDocument, dataSourceIds: Set<string>): string {
    const ids = [...dataSourceIds].filter(id => document.dataSources?.[id]).sort();
    if (ids.length === 0) {
        return '';
    }

    const entries = ids.map(id => {
        const dataSource = document.dataSources![id];
        const name = toSafeIdentifier(id, 'builderDataSource');
        const config = renderJsonExpression(dataSource.config ?? {});
        return `    ${name}: async () => {
        // Builder data service stub for '${id}' (${dataSource.type}).
        return ${config};
    }`;
    });

    return `const builderDataServices = {
${entries.join(',\n')}
};
`;
}

function renderActionStubs(document: BuilderDocument, actionIds: Set<string>): string {
    const ids = [...actionIds].filter(id => document.actions?.[id]).sort();
    if (ids.length === 0) {
        return '';
    }

    const entries = ids.map(id => {
        const action = document.actions![id];
        const name = toSafeIdentifier(id, 'builderAction');
        const definition = renderJsonExpression(action);
        return `    ${name}: async (event?: unknown, binding?: Record<string, unknown>) => {
        void event;
        void binding;
        // Builder action stub for '${id}'. Wire this to the host app action registry.
        return ${definition};
    }`;
    });

    return `const builderActions = {
${entries.join(',\n')}
};
`;
}

function renderProp(key: string, value: unknown): string {
    if (typeof value === 'string') {
        return `${key}=${JSON.stringify(value)}`;
    }
    if (value === true) {
        return key;
    }
    return `${key}={${renderJsonExpression(value)}}`;
}

function collectNodeRuntimeReferences(node: BuilderNode, context: BuilderReactRenderContext): void {
    for (const binding of Object.values(node.events ?? {})) {
        if (typeof binding?.actionId === 'string' && binding.actionId.length > 0) {
            context.actions.add(binding.actionId);
        }
    }

    const sourceId = node.data?.sourceId ?? node.data?.source;
    if (sourceId) {
        context.dataSources.add(sourceId);
    }
    if (node.data?.repeat?.sourceId) {
        context.dataSources.add(node.data.repeat.sourceId);
    }
}

function mapEventPropName(eventName: string): string {
    if (/^on[A-Z]/.test(eventName)) {
        return eventName;
    }
    const normalized = eventName.replace(/[^a-zA-Z0-9]+(.)/g, (_match, character: string) => character.toUpperCase());
    return `on${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`;
}

function toSafeIdentifier(value: string, fallback: string): string {
    const identifier = value.replace(/[^a-zA-Z0-9_$]/g, '_');
    if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(identifier)) {
        return identifier;
    }
    return `${fallback}_${identifier}`;
}

function renderJsonExpression(value: unknown): string {
    return JSON.stringify(value, undefined, 4)
        .replace(/\n/g, '\n'.padEnd(5, ' '));
}

function mapPropName(key: string, type: string): string {
    if (type === 'DateInput' && key === 'type') {
        return 'inputType';
    }
    if (key === 'data' && (type === 'Select' || type === 'RadioGroup')) {
        return 'data';
    }
    return key;
}

function readTextChildren(value: unknown): string | undefined {
    return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? String(value) : undefined;
}

function isForbiddenReactProp(key: string): boolean {
    return key === 'dangerouslySetInnerHTML'
        || key === 'innerHTML'
        || key === 'outerHTML'
        || key === 'ref'
        || key === 'key'
        || /^on[A-Z]/.test(key);
}

function sanitizeReactPropValue(key: string, value: unknown, node: BuilderNode, context: BuilderReactRenderContext): unknown {
    if (typeof value !== 'string') {
        return value;
    }

    const urlKind = getReactUrlPropKind(key);
    if (!urlKind) {
        return value;
    }

    const result = validateBuilderUrl(value, urlKind);
    if (result.valid) {
        return result.normalized;
    }

    context.warnings.push({
        path: `node(${node.id}).props.${key}`,
        message: result.message ?? `Invalid URL prop '${key}' was omitted from React export.`,
        nodeId: node.id,
        componentType: node.type
    });
    return undefined;
}

function getReactUrlPropKind(key: string): 'link' | 'asset' | undefined {
    if (/^(?:src|imageSrc|image|avatar|asset|assetUrl)$/i.test(key)) {
        return 'asset';
    }
    if (/^(?:href|url|to|endpoint|primaryActionHref|secondaryActionHref)$/i.test(key)) {
        return 'link';
    }
    return undefined;
}

function isSerializablePropValue(value: unknown): value is BuilderJsonValue {
    if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return Number.isFinite(value as number) || typeof value !== 'number';
    }
    if (Array.isArray(value)) {
        return value.every(isSerializablePropValue);
    }
    return isRecord(value) && Object.values(value).every(isSerializablePropValue);
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

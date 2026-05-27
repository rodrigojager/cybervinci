import type { BuilderComponentDefinition, BuilderComponentRegistry } from '@cybervinci/builder-registry';
import {
    type BuilderAction,
    type BuilderCondition,
    type BuilderDocument,
    type BuilderEventBinding,
    type BuilderJsonValue,
    type BuilderNode,
    type BuilderPermissionRule,
    type BuilderStructuralValidationError,
    type BuilderTheme,
    type ResolveBuilderDataBindingResult,
    type ValidateBuilderDocumentStructureOptions,
    resolveBuilderNodeDataBinding,
    validateBuilderDocumentStructure
} from '@cybervinci/builder-schema';
import * as React from 'react';

export interface BuilderMantineRendererOptions {
    registry: BuilderComponentRegistry;
    validateStructure?: boolean;
    structureLimits?: ValidateBuilderDocumentStructureOptions;
    onAction?: (actionId: string, params?: Record<string, unknown>, context?: BuilderActionCallbackContext) => void;
    onSelectNode?: (nodeId: string, node: BuilderNode) => void;
    runtime?: BuilderRuntimeContext;
    actionService?: BuilderActionService;
    dataService?: BuilderDataService;
    components?: BuilderMantineComponentResolver;
    MantineProvider?: BuilderMantineProviderComponent;
    renderUnknownComponent?: (fallback: BuilderUnknownComponentFallback, context: BuilderNodeRenderContext) => React.ReactNode;
}

export interface BuilderRenderRequest {
    document: BuilderDocument;
    selectedNodeId?: string;
    runtime?: BuilderRuntimeContext;
    onAction?: (actionId: string, params?: Record<string, unknown>, context?: BuilderActionCallbackContext) => void;
    onSelectNode?: (nodeId: string, node: BuilderNode) => void;
    actionService?: BuilderActionService;
    dataService?: BuilderDataService;
    renderUnknownComponent?: (fallback: BuilderUnknownComponentFallback, context: BuilderNodeRenderContext) => React.ReactNode;
}

export interface BuilderRendererProps extends BuilderRenderRequest {
    registry: BuilderComponentRegistry;
    components?: BuilderMantineComponentResolver;
    MantineProvider?: BuilderMantineProviderComponent;
}

export interface BuilderRuntimeContext {
    values?: Record<string, unknown>;
    states?: Record<string, BuilderJsonValue>;
    permissions?: {
        roles?: string[];
        permissions?: string[];
    };
}

export interface BuilderActionCallbackContext {
    document: BuilderDocument;
    node: BuilderNode;
    eventName: string;
    action: BuilderAction;
}

export interface BuilderActionService {
    execute(actionId: string, params: Record<string, unknown>, context: BuilderActionCallbackContext): BuilderActionServiceResult;
}

export interface BuilderActionServiceResult {
    handled: boolean;
    actionId: string;
    actionType: string;
    params: Record<string, unknown>;
    reason?: string;
}

export interface BuilderDataService {
    resolveNodeDataBinding(document: BuilderDocument, node: BuilderNode): ResolveBuilderDataBindingResult;
}

export type BuilderMantineComponentType = string | React.ComponentType<Record<string, unknown>>;
export type BuilderMantineComponentResolver =
    | Record<string, BuilderMantineComponentType>
    | ((node: BuilderNode, context: BuilderNodeRenderContext) => BuilderMantineComponentType | undefined);

export interface BuilderMantineLayoutComponentSet {
    Box?: BuilderMantineComponentType;
    Card?: BuilderMantineComponentType;
    Container?: BuilderMantineComponentType;
    Divider?: BuilderMantineComponentType;
    Grid?: BuilderMantineComponentType;
    GridCol?: BuilderMantineComponentType;
    Group?: BuilderMantineComponentType;
    SimpleGrid?: BuilderMantineComponentType;
    Space?: BuilderMantineComponentType;
    Stack?: BuilderMantineComponentType;
}

export interface BuilderMantineTypographyComponentSet {
    Title?: BuilderMantineComponentType;
    Text?: BuilderMantineComponentType;
    Badge?: BuilderMantineComponentType;
    List?: BuilderMantineComponentType;
    ListItem?: BuilderMantineComponentType;
    TypographyStylesProvider?: BuilderMantineComponentType;
}

export interface BuilderMantineFormComponentSet {
    Button?: BuilderMantineComponentType;
    TextInput?: BuilderMantineComponentType;
    Textarea?: BuilderMantineComponentType;
    Select?: BuilderMantineComponentType;
    Checkbox?: BuilderMantineComponentType;
    RadioGroup?: BuilderMantineComponentType;
    Radio?: BuilderMantineComponentType;
    NumberInput?: BuilderMantineComponentType;
    DateInput?: BuilderMantineComponentType;
    DynamicForm?: BuilderMantineComponentType;
    Stack?: BuilderMantineComponentType;
    Group?: BuilderMantineComponentType;
}

export interface BuilderMantineDataDisplayComponentSet {
    Table?: BuilderMantineComponentType;
    DataTable?: BuilderMantineComponentType;
    Card?: BuilderMantineComponentType;
    Group?: BuilderMantineComponentType;
    Stack?: BuilderMantineComponentType;
    Text?: BuilderMantineComponentType;
    Title?: BuilderMantineComponentType;
    Badge?: BuilderMantineComponentType;
}

export interface BuilderMantineNavigationComponentSet {
    Anchor?: BuilderMantineComponentType;
    NavLink?: BuilderMantineComponentType;
    Breadcrumbs?: BuilderMantineComponentType;
    Tabs?: BuilderMantineComponentType;
    TabsList?: BuilderMantineComponentType;
    TabsTab?: BuilderMantineComponentType;
    TabsPanel?: BuilderMantineComponentType;
}

export interface BuilderMantineOverlayComponentSet {
    Modal?: BuilderMantineComponentType;
    Drawer?: BuilderMantineComponentType;
    Stack?: BuilderMantineComponentType;
    Group?: BuilderMantineComponentType;
}

export interface BuilderMantineFeedbackComponentSet {
    Alert?: BuilderMantineComponentType;
    Notification?: BuilderMantineComponentType;
    Loader?: BuilderMantineComponentType;
    Group?: BuilderMantineComponentType;
    Text?: BuilderMantineComponentType;
}

export interface BuilderMantineMediaComponentSet {
    Image?: BuilderMantineComponentType;
    Avatar?: BuilderMantineComponentType;
    ThemeIcon?: BuilderMantineComponentType;
}

export interface BuilderMantineMarketingComponentSet {
    Box?: BuilderMantineComponentType;
    Button?: BuilderMantineComponentType;
    Card?: BuilderMantineComponentType;
    Group?: BuilderMantineComponentType;
    Image?: BuilderMantineComponentType;
    List?: BuilderMantineComponentType;
    SimpleGrid?: BuilderMantineComponentType;
    Stack?: BuilderMantineComponentType;
    Text?: BuilderMantineComponentType;
    Title?: BuilderMantineComponentType;
}

export interface BuilderMantineDashboardComponentSet {
    Badge?: BuilderMantineComponentType;
    Box?: BuilderMantineComponentType;
    Group?: BuilderMantineComponentType;
    SimpleGrid?: BuilderMantineComponentType;
    Stack?: BuilderMantineComponentType;
    Text?: BuilderMantineComponentType;
    Title?: BuilderMantineComponentType;
}

export interface BuilderNodeRenderContext {
    document: BuilderDocument;
    registry: BuilderComponentRegistry;
    runtime: BuilderRuntimeContext;
    selectedNodeId?: string;
    renderNode: (node: BuilderNode) => React.ReactNode;
    renderNodes: (nodes: BuilderNode[] | undefined) => React.ReactNode[];
    getSlot: (node: BuilderNode, slotName: string) => React.ReactNode[];
}

export type BuilderMantineColorScheme = 'light' | 'dark' | 'auto';

export interface BuilderMantineProviderAdapterResult {
    theme: BuilderMantineThemeOverride;
    defaultColorScheme: BuilderMantineColorScheme;
}

export type BuilderMantineProviderComponent = React.ComponentType<BuilderMantineProviderProps> | string;

export interface BuilderMantineProviderProps extends BuilderMantineProviderAdapterResult {
    children?: React.ReactNode;
}

/**
 * Structural subset accepted by MantineProvider's theme prop. Keep Mantine types
 * out of this public contract so builder-schema remains renderer-independent.
 */
export interface BuilderMantineThemeOverride {
    primaryColor?: string;
    fontFamily?: string;
    defaultRadius?: string | number;
    spacing?: Record<string, string | number>;
    colors?: Record<string, string[]>;
    other?: Record<string, BuilderJsonValue>;
}

export interface BuilderUnknownComponentFallback {
    node: BuilderNode;
    reason: string;
}

export class BuilderRenderError extends Error {

    constructor(message: string, readonly errors: readonly BuilderStructuralValidationError[] = []) {
        super(message);
        this.name = 'BuilderRenderError';
    }
}

export interface BuilderEventExecutionContext {
    document: BuilderDocument;
    node: BuilderNode;
    eventName: string;
    event?: BuilderDomLikeEvent;
}

export interface BuilderDomLikeEvent {
    preventDefault?: () => void;
    stopPropagation?: () => void;
}

export class BuilderEventExecutionError extends Error {

    constructor(
        message: string,
        readonly nodeId: string,
        readonly eventName: string
    ) {
        super(message);
        this.name = 'BuilderEventExecutionError';
    }
}

export function createMantineProviderAdapter(theme: BuilderTheme | undefined): BuilderMantineProviderAdapterResult {
    return {
        theme: builderThemeToMantineTheme(theme),
        defaultColorScheme: builderThemeModeToMantineColorScheme(theme?.mode)
    };
}

export function BuilderRenderer(props: BuilderRendererProps): React.ReactElement {
    const options: BuilderMantineRendererOptions = {
        registry: props.registry,
        components: props.components,
        runtime: props.runtime,
        actionService: props.actionService,
        dataService: props.dataService,
        MantineProvider: props.MantineProvider,
        onAction: props.onAction,
        onSelectNode: props.onSelectNode,
        renderUnknownComponent: props.renderUnknownComponent
    };

    return renderBuilderDocument({
        document: props.document,
        selectedNodeId: props.selectedNodeId,
        runtime: props.runtime,
        actionService: props.actionService,
        dataService: props.dataService,
        onAction: props.onAction,
        onSelectNode: props.onSelectNode,
        renderUnknownComponent: props.renderUnknownComponent
    }, options);
}

export function renderBuilderDocument(
    request: BuilderRenderRequest,
    options: BuilderMantineRendererOptions
): React.ReactElement {
    if (options.validateStructure !== false) {
        const structural = validateBuilderDocumentStructure(request.document, options.structureLimits);
        if (!structural.valid) {
            throw new BuilderRenderError('Cannot render invalid or oversized Builder document.', structural.errors);
        }
    }

    const runtime = request.runtime ?? options.runtime ?? {};

    const renderNode = (node: BuilderNode): React.ReactNode => renderBuilderNode(node, request, options, runtime);
    const context: BuilderNodeRenderContext = {
        document: request.document,
        registry: options.registry,
        runtime,
        selectedNodeId: request.selectedNodeId,
        renderNode,
        renderNodes: nodes => (nodes ?? []).map(renderNode),
        getSlot: (node, slotName) => (node.slots?.[slotName] ?? []).map(renderNode)
    };

    return React.createElement(
        React.Fragment,
        undefined,
        renderBuilderPreviewThemeProvider(
            request.document,
            options.MantineProvider,
            renderBuilderNode(request.document.tree, request, options, runtime, context)
        )
    );
}

export function renderBuilderPreviewThemeProvider(
    document: BuilderDocument,
    MantineProvider: BuilderMantineProviderComponent | undefined,
    children: React.ReactNode
): React.ReactNode {
    if (!MantineProvider) {
        return children;
    }

    return React.createElement(MantineProvider, createMantineProviderAdapter(document.theme), children);
}

export function renderBuilderNode(
    node: BuilderNode,
    request: BuilderRenderRequest,
    options: BuilderMantineRendererOptions,
    runtime: BuilderRuntimeContext = {},
    existingContext?: BuilderNodeRenderContext
): React.ReactNode {
    if (!isNodeVisible(node, request.document, runtime) || !isNodePermitted(node, request.document, runtime)) {
        return undefined;
    }

    const repeatedNodes = expandRepeatedNode(node, request.document);
    if (repeatedNodes) {
        return repeatedNodes.map(repeatedNode => renderBuilderNode(repeatedNode, request, options, runtime));
    }

    const context = existingContext ?? createNodeRenderContext(request, options, runtime);
    const definition = options.registry.get(node.type);
    if (!definition) {
        const fallback = getUnknownComponentFallback(node);
        return options.renderUnknownComponent?.(fallback, context) ?? renderDefaultUnknownComponent(fallback);
    }

    const component = resolveRendererComponent(node, context, options.components) ?? DEFAULT_Builder_COMPONENTS[node.type] ?? 'div';
    const props = createComponentProps(node, definition.defaultProps, request, options, runtime);
    attachDeclaredSlotProps(node, definition.slots, props, context);
    const children = createComponentChildren(node, context, definition.slots);

    return React.createElement(component, props, ...children);
}

export function executeBuilderEvent(options: BuilderMantineRendererOptions, context: BuilderEventExecutionContext): void {
    const binding = readSafeEventBinding(context.node, context.eventName);
    if (!binding) {
        return;
    }

    const action = context.document.actions?.[binding.actionId];
    if (!action) {
        throw new BuilderEventExecutionError(
            `Builder event '${context.eventName}' references unknown action '${binding.actionId}'.`,
            context.node.id,
            context.eventName
        );
    }

    if (binding.preventDefault) {
        context.event?.preventDefault?.();
    }
    if (binding.stopPropagation) {
        context.event?.stopPropagation?.();
    }

    const params = {
        ...(action.params ?? {}),
        ...(binding.params ?? {})
    };
    const callbackContext = { ...context, action };

    options.onAction?.(binding.actionId, params, callbackContext);
    (options.actionService ?? createNoopBuilderActionService()).execute(binding.actionId, params, callbackContext);
}

export function createBuilderEventHandler(
    options: BuilderMantineRendererOptions,
    context: Omit<BuilderEventExecutionContext, 'event'>
): ((event?: BuilderDomLikeEvent) => void) | undefined {
    if (!context.node.events?.[context.eventName]) {
        return undefined;
    }

    return event => executeBuilderEvent(options, { ...context, event });
}

export function builderThemeToMantineTheme(theme: BuilderTheme | undefined): BuilderMantineThemeOverride {
    if (!theme) {
        return {};
    }

    const mantineTheme: BuilderMantineThemeOverride = {};

    if (theme.primaryColor) {
        mantineTheme.primaryColor = theme.primaryColor;
    }
    if (theme.fontFamily) {
        mantineTheme.fontFamily = theme.fontFamily;
    }
    if (theme.radius) {
        mantineTheme.defaultRadius = theme.radius === 'none' ? 0 : theme.radius;
    }
    if (theme.spacing) {
        mantineTheme.spacing = { ...theme.spacing };
    }

    const colors = readMantineColorTokens(theme.tokens?.colors);
    if (colors) {
        mantineTheme.colors = colors;
    }

    const other = readMantineOtherTokens(theme.tokens);
    if (other) {
        mantineTheme.other = other;
    }

    return mantineTheme;
}

export function createNoopBuilderActionService(): BuilderActionService {
    return {
        execute(actionId, params, context): BuilderActionServiceResult {
            return {
                handled: false,
                actionId,
                actionType: context.action.type,
                params,
                reason: 'No Builder action service is registered for the renderer.'
            };
        }
    };
}

export function createSafeBuilderDataService(): BuilderDataService {
    return {
        resolveNodeDataBinding(document, node): ResolveBuilderDataBindingResult {
            return resolveBuilderNodeDataBinding(document, node);
        }
    };
}

export function builderThemeModeToMantineColorScheme(mode: BuilderTheme['mode'] | undefined): BuilderMantineColorScheme {
    if (mode === 'dark' || mode === 'auto') {
        return mode;
    }
    return 'light';
}

export function getUnknownComponentFallback(node: BuilderNode): BuilderUnknownComponentFallback {
    return {
        node,
        reason: `Unknown Builder component type: ${node.type}`
    };
}

export function createBuilderMantineLayoutComponents(
    mantine: BuilderMantineLayoutComponentSet = {}
): Record<string, BuilderMantineComponentType> {
    return {
        Page: createLayoutAdapter('main', mantine.Box, mapPageProps),
        Section: createLayoutAdapter('section', mantine.Box, mapSectionProps),
        Container: createLayoutAdapter('div', mantine.Container, mapContainerProps),
        Stack: createLayoutAdapter('div', mantine.Stack, mapStackProps),
        Group: createLayoutAdapter('div', mantine.Group, mapGroupProps),
        SimpleGrid: createLayoutAdapter('div', mantine.SimpleGrid, mapSimpleGridProps),
        Grid: createGridAdapter(mantine),
        Card: createLayoutAdapter('article', mantine.Card, mapCardProps),
        Divider: createLayoutAdapter('hr', mantine.Divider, mapDividerProps),
        Space: createLayoutAdapter('div', mantine.Space, mapSpaceProps),
        Box: createLayoutAdapter('div', mantine.Box, mapBoxProps)
    };
}

export function createBuilderMantineTypographyComponents(
    mantine: BuilderMantineTypographyComponentSet = {}
): Record<string, BuilderMantineComponentType> {
    return {
        Title: createTypographyAdapter('h2', mantine.Title, mapTitleProps),
        Text: createTypographyAdapter('p', mantine.Text, mapTextProps),
        Badge: createTypographyAdapter('span', mantine.Badge, mapBadgeProps),
        List: createListAdapter(mantine),
        Markdown: createMarkdownAdapter(mantine)
    };
}

export function createBuilderMantineFormComponents(
    mantine: BuilderMantineFormComponentSet = {}
): Record<string, BuilderMantineComponentType> {
    return {
        Button: createFormAdapter('button', mantine.Button, mapButtonProps),
        TextInput: createFormAdapter('input', mantine.TextInput, mapTextInputProps),
        Textarea: createFormAdapter('textarea', mantine.Textarea, mapTextareaProps),
        Select: createSelectAdapter(mantine),
        Checkbox: createFormAdapter('input', mantine.Checkbox, mapCheckboxProps),
        RadioGroup: createRadioGroupAdapter(mantine),
        NumberInput: createFormAdapter('input', mantine.NumberInput, mapNumberInputProps),
        DateInput: createFormAdapter('input', mantine.DateInput, mapDateInputProps),
        DynamicForm: createDynamicFormAdapter(mantine)
    };
}

export function createBuilderMantineDataDisplayComponents(
    mantine: BuilderMantineDataDisplayComponentSet = {}
): Record<string, BuilderMantineComponentType> {
    return {
        Table: createTableAdapter(mantine.Table, false),
        DataTable: createTableAdapter(mantine.DataTable ?? mantine.Table, true),
        MetricCard: createMetricCardAdapter(mantine),
        StatCard: createStatCardAdapter(mantine)
    };
}

export function createBuilderMantineNavigationComponents(
    mantine: BuilderMantineNavigationComponentSet = {}
): Record<string, BuilderMantineComponentType> {
    return {
        Anchor: createSimpleAdapter('a', mantine.Anchor, mapAnchorProps),
        NavLink: createNavLinkAdapter(mantine),
        Breadcrumbs: createBreadcrumbsAdapter(mantine),
        Tabs: createTabsAdapter(mantine)
    };
}

export function createBuilderMantineOverlayComponents(
    mantine: BuilderMantineOverlayComponentSet = {}
): Record<string, BuilderMantineComponentType> {
    return {
        Modal: createOverlayAdapter('section', mantine.Modal, mantine),
        Drawer: createOverlayAdapter('aside', mantine.Drawer, mantine)
    };
}

export function createBuilderMantineFeedbackComponents(
    mantine: BuilderMantineFeedbackComponentSet = {}
): Record<string, BuilderMantineComponentType> {
    return {
        Alert: createSimpleAdapter('div', mantine.Alert, mapAlertProps),
        NotificationBlock: createNotificationAdapter(mantine),
        Loader: createLoaderAdapter(mantine)
    };
}

export function createBuilderMantineMediaComponents(
    mantine: BuilderMantineMediaComponentSet = {}
): Record<string, BuilderMantineComponentType> {
    return {
        Image: createSimpleAdapter('img', mantine.Image, mapImageProps),
        Avatar: createSimpleAdapter('img', mantine.Avatar, mapAvatarProps),
        Icon: createIconAdapter(mantine)
    };
}

export function createBuilderMantineMarketingComponents(
    mantine: BuilderMantineMarketingComponentSet = {}
): Record<string, BuilderMantineComponentType> {
    return {
        HeroSection: createHeroSectionAdapter(mantine),
        FeatureGrid: createFeatureGridAdapter(mantine),
        PricingSection: createPricingSectionAdapter(mantine),
        TestimonialSection: createTestimonialSectionAdapter(mantine),
        CTASection: createCtaSectionAdapter(mantine)
    };
}

export function createBuilderMantineDashboardComponents(
    mantine: BuilderMantineDashboardComponentSet = {}
): Record<string, BuilderMantineComponentType> {
    return {
        ChartPlaceholder: createChartPlaceholderAdapter(mantine),
        MetricGrid: createSimpleAdapter('section', mantine.SimpleGrid, mapMetricGridProps),
        DashboardHeader: createDashboardHeaderAdapter(mantine)
    };
}

function readMantineColorTokens(value: BuilderJsonValue | undefined): Record<string, string[]> | undefined {
    if (!isJsonObject(value)) {
        return undefined;
    }

    const colors: Record<string, string[]> = {};
    for (const [name, scale] of Object.entries(value)) {
        if (Array.isArray(scale) && scale.every(item => typeof item === 'string')) {
            colors[name] = [...scale];
        }
    }

    return Object.keys(colors).length > 0 ? colors : undefined;
}

function readMantineOtherTokens(tokens: BuilderTheme['tokens'] | undefined): Record<string, BuilderJsonValue> | undefined {
    if (!tokens) {
        return undefined;
    }

    const other: Record<string, BuilderJsonValue> = {};
    for (const [key, value] of Object.entries(tokens)) {
        if (key !== 'colors') {
            other[key] = value;
        }
    }

    return Object.keys(other).length > 0 ? other : undefined;
}

function readSafeEventBinding(node: BuilderNode, eventName: string): BuilderEventBinding | undefined {
    const binding = node.events?.[eventName] as unknown;
    if (binding === undefined) {
        return undefined;
    }

    if (!isRecord(binding)) {
        throw new BuilderEventExecutionError(
            `Builder event '${eventName}' must be an object action binding; JavaScript handler strings are not allowed.`,
            node.id,
            eventName
        );
    }

    if (typeof binding.handler === 'string') {
        throw new BuilderEventExecutionError(
            `Builder event '${eventName}' must not contain JavaScript handler strings; use actionId instead.`,
            node.id,
            eventName
        );
    }

    if (typeof binding.actionId !== 'string' || binding.actionId.length === 0) {
        throw new BuilderEventExecutionError(
            `Builder event '${eventName}' must reference a registered actionId.`,
            node.id,
            eventName
        );
    }

    return binding as unknown as BuilderEventBinding;
}

const DEFAULT_Builder_COMPONENTS: Record<string, BuilderMantineComponentType> = {
    ...createBuilderMantineLayoutComponents(),
    ...createBuilderMantineTypographyComponents(),
    ...createBuilderMantineFormComponents(),
    ...createBuilderMantineDataDisplayComponents(),
    ...createBuilderMantineNavigationComponents(),
    ...createBuilderMantineOverlayComponents(),
    ...createBuilderMantineFeedbackComponents(),
    ...createBuilderMantineMediaComponents(),
    ...createBuilderMantineMarketingComponents(),
    ...createBuilderMantineDashboardComponents()
};

function createNodeRenderContext(
    request: BuilderRenderRequest,
    options: BuilderMantineRendererOptions,
    runtime: BuilderRuntimeContext
): BuilderNodeRenderContext {
    const renderNode = (node: BuilderNode): React.ReactNode => renderBuilderNode(node, request, options, runtime);
    return {
        document: request.document,
        registry: options.registry,
        runtime,
        selectedNodeId: request.selectedNodeId,
        renderNode,
        renderNodes: nodes => (nodes ?? []).map(renderNode),
        getSlot: (node, slotName) => (node.slots?.[slotName] ?? []).map(renderNode)
    };
}

function createComponentProps(
    node: BuilderNode,
    defaultProps: Record<string, unknown> | undefined,
    request: BuilderRenderRequest,
    options: BuilderMantineRendererOptions,
    runtime: BuilderRuntimeContext
): Record<string, unknown> {
    const props: Record<string, unknown> = {
        ...(defaultProps ?? {}),
        ...(node.props ?? {}),
        key: node.id,
        'data-builder-node-id': node.id,
        'data-builder-type': node.type
    };
    const binding = (request.dataService ?? options.dataService ?? createSafeBuilderDataService()).resolveNodeDataBinding(request.document, node);
    Object.assign(props, binding.fields);
    if (binding.value !== undefined) {
        props.data = binding.value;
    }

    if (node.style?.className) {
        props.className = node.style.className;
    }
    if (node.style?.css) {
        props.style = node.style.css;
    }
    if (request.selectedNodeId === node.id) {
        props['data-builder-selected'] = 'true';
    }

    attachEventHandlers(props, node, request, options, runtime);
    attachSelectionHandler(props, node, request, options);
    normalizeIntrinsicProps(node.type, props);

    return props;
}

function attachDeclaredSlotProps(
    node: BuilderNode,
    slots: BuilderComponentDefinition['slots'],
    props: Record<string, unknown>,
    context: BuilderNodeRenderContext
): void {
    for (const slotName of Object.keys(slots ?? {})) {
        const slotChildren = context.getSlot(node, slotName);
        if (slotChildren.length > 0) {
            props[slotName] = slotChildren;
        }
    }
}

function createComponentChildren(
    node: BuilderNode,
    context: BuilderNodeRenderContext,
    declaredSlots: BuilderComponentDefinition['slots']
): React.ReactNode[] {
    const props = node.props ?? {};
    const explicitChildren = props.children ?? props.text ?? props.label ?? props.title;
    const children = context.renderNodes(node.children);

    for (const [slotName, slotNodes] of Object.entries(node.slots ?? {})) {
        if (!declaredSlots?.[slotName]) {
            children.push(...slotNodes.map(context.renderNode));
        }
    }

    if (children.length === 0 && explicitChildren !== undefined && node.type !== 'Image' && node.type !== 'Avatar') {
        children.push(String(explicitChildren));
    }

    return children;
}

function attachEventHandlers(
    props: Record<string, unknown>,
    node: BuilderNode,
    request: BuilderRenderRequest,
    options: BuilderMantineRendererOptions,
    runtime: BuilderRuntimeContext
): void {
    for (const eventName of Object.keys(node.events ?? {})) {
        props[eventName] = createBuilderEventHandler({
            ...options,
            runtime,
            onAction: request.onAction ?? options.onAction
        }, {
            document: request.document,
            node,
            eventName
        });
    }
}

function attachSelectionHandler(
    props: Record<string, unknown>,
    node: BuilderNode,
    request: BuilderRenderRequest,
    options: BuilderMantineRendererOptions
): void {
    const onSelectNode = request.onSelectNode ?? options.onSelectNode;
    if (!onSelectNode) {
        return;
    }

    const existingOnClick = props.onClick;
    props.onClick = (event?: BuilderDomLikeEvent) => {
        if (typeof existingOnClick === 'function') {
            existingOnClick(event);
        }
        onSelectNode(node.id, node);
        event?.stopPropagation?.();
    };
}

function normalizeIntrinsicProps(type: string, props: Record<string, unknown>): void {
    if (type === 'Checkbox') {
        props.type = 'checkbox';
    } else if (type === 'NumberInput') {
        props.type = 'number';
    } else if (type === 'DateInput') {
        props.type = 'date';
    } else if (type === 'TextInput') {
        props.type = props.type ?? 'text';
    }

    if ((type === 'Image' || type === 'Avatar') && props.src === undefined && typeof props.url === 'string') {
        props.src = props.url;
    }
    if ((type === 'Anchor' || type === 'NavLink') && props.href === undefined && typeof props.to === 'string') {
        props.href = props.to;
    }
}

function resolveRendererComponent(
    node: BuilderNode,
    context: BuilderNodeRenderContext,
    resolver: BuilderMantineComponentResolver | undefined
): BuilderMantineComponentType | undefined {
    if (!resolver) {
        return undefined;
    }
    if (typeof resolver === 'function') {
        return resolver(node, context);
    }
    return resolver[node.type];
}

function expandRepeatedNode(node: BuilderNode, document: BuilderDocument): BuilderNode[] | undefined {
    const binding = resolveBuilderNodeDataBinding(document, node);
    if (!binding.repeatItems) {
        return undefined;
    }

    return binding.repeatItems.map((item, index) => ({
        ...node,
        id: `${node.id}-${index}`,
        data: undefined,
        props: {
            ...(node.props ?? {}),
            item,
            index
        }
    }));
}

function isNodeVisible(node: BuilderNode, document: BuilderDocument, runtime: BuilderRuntimeContext): boolean {
    if (node.visibility?.condition) {
        return evaluateBuilderCondition(node.visibility.condition, document, runtime);
    }
    if (node.visibility?.stateId) {
        return runtime.states?.[node.visibility.stateId] === node.visibility.equals;
    }

    return true;
}

function isNodePermitted(node: BuilderNode, document: BuilderDocument, runtime: BuilderRuntimeContext): boolean {
    const rules = node.permissions ?? [];
    if (rules.length === 0) {
        return true;
    }

    const matchingRules = rules.filter(rule => matchesPermissionRule(rule, document, runtime));
    if (matchingRules.some(rule => rule.effect === 'deny')) {
        return false;
    }

    const allowRules = rules.filter(rule => rule.effect === 'allow');
    if (allowRules.length > 0) {
        return matchingRules.some(rule => rule.effect === 'allow');
    }

    return matchingRules.length > 0;
}

function matchesPermissionRule(rule: BuilderPermissionRule, document: BuilderDocument, runtime: BuilderRuntimeContext): boolean {
    if (rule.roles?.length && !rule.roles.some(role => runtime.permissions?.roles?.includes(role))) {
        return false;
    }
    if (rule.permissions?.length && !rule.permissions.some(permission => runtime.permissions?.permissions?.includes(permission))) {
        return false;
    }
    if (rule.condition && !evaluateBuilderCondition(rule.condition, document, runtime)) {
        return false;
    }
    return true;
}

function evaluateBuilderCondition(condition: BuilderCondition, document: BuilderDocument, runtime: BuilderRuntimeContext): boolean {
    if (condition.all) {
        return condition.all.every(child => evaluateBuilderCondition(child, document, runtime));
    }
    if (condition.any) {
        return condition.any.some(child => evaluateBuilderCondition(child, document, runtime));
    }
    if (condition.not) {
        return !evaluateBuilderCondition(condition.not, document, runtime);
    }

    const actual = readConditionValue(condition, document, runtime);
    switch (condition.operator ?? 'equals') {
        case 'exists':
            return actual !== undefined && actual !== null;
        case 'equals':
            return actual === condition.value;
        case 'notEquals':
            return actual !== condition.value;
        case 'contains':
            return containsConditionValue(actual, condition.value);
        case 'greaterThan':
            return compareConditionNumbers(actual, condition.value, (left, right) => left > right);
        case 'greaterThanOrEqual':
            return compareConditionNumbers(actual, condition.value, (left, right) => left >= right);
        case 'lessThan':
            return compareConditionNumbers(actual, condition.value, (left, right) => left < right);
        case 'lessThanOrEqual':
            return compareConditionNumbers(actual, condition.value, (left, right) => left <= right);
        default:
            return false;
    }
}

function readConditionValue(condition: BuilderCondition, document: BuilderDocument, runtime: BuilderRuntimeContext): unknown {
    const source = condition.source ?? 'state';
    if (source === 'permission') {
        const permission = condition.ref ?? condition.path;
        return permission ? runtime.permissions?.permissions?.includes(permission) : undefined;
    }

    let root: unknown;
    if (source === 'state') {
        root = condition.ref ? runtime.states?.[condition.ref] : runtime.states;
    } else if (source === 'context') {
        root = condition.ref ? runtime.values?.[condition.ref] : runtime.values;
    } else if (source === 'data') {
        const sourceId = condition.ref;
        root = sourceId ? document.dataSources?.[sourceId]?.config?.data : undefined;
    }

    return readSafePath(root, condition.path);
}

function readSafePath(root: unknown, path: string | undefined): unknown {
    if (path === undefined || path === '' || path === '$') {
        return root;
    }
    if (!isSafePath(path)) {
        return undefined;
    }

    let current = root;
    const normalizedPath = path.startsWith('$.') ? path.slice(2) : path;
    const matcher = /([A-Za-z_$][A-Za-z0-9_$]*)|\[(0|[1-9][0-9]*)\]/g;
    let match: RegExpExecArray | null;
    while ((match = matcher.exec(normalizedPath)) !== null) {
        const segment = match[1] ?? Number(match[2]);
        if (typeof segment === 'number') {
            current = Array.isArray(current) ? current[segment] : undefined;
        } else if (isRecord(current)) {
            current = current[segment];
        } else {
            current = undefined;
        }
    }
    return current;
}

function containsConditionValue(actual: unknown, expected: unknown): boolean {
    if (typeof actual === 'string' && typeof expected === 'string') {
        return actual.includes(expected);
    }
    if (Array.isArray(actual)) {
        return actual.includes(expected);
    }
    return false;
}

function compareConditionNumbers(actual: unknown, expected: unknown, compare: (left: number, right: number) => boolean): boolean {
    return typeof actual === 'number' && typeof expected === 'number' && compare(actual, expected);
}

function isSafePath(value: string): boolean {
    if (value.length > 256 || /[(){};=<>`"'\\]/.test(value)) {
        return false;
    }
    return /^(?:\$|[A-Za-z_$][A-Za-z0-9_$]*)(?:(?:\.[A-Za-z_$][A-Za-z0-9_$]*)|(?:\[(?:0|[1-9][0-9]*)\]))*$/.test(value);
}

function renderDefaultUnknownComponent(fallback: BuilderUnknownComponentFallback): React.ReactElement {
    return React.createElement(
        'div',
        {
            key: fallback.node.id,
            role: 'note',
            'data-builder-node-id': fallback.node.id,
            'data-builder-unknown-type': fallback.node.type
        },
        fallback.reason
    );
}

function isJsonObject(value: BuilderJsonValue | undefined): value is Record<string, BuilderJsonValue> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function createLayoutAdapter(
    fallbackElement: string,
    mantineComponent: BuilderMantineComponentType | undefined,
    mapProps: (props: Record<string, unknown>) => Record<string, unknown>
): React.ComponentType<Record<string, unknown>> {
    return function BuilderMantineLayoutAdapter(inputProps: Record<string, unknown>): React.ReactElement {
        const props = mapProps(inputProps);
        const component = mantineComponent ?? readString(props.component) ?? fallbackElement;
        return React.createElement(component, props);
    };
}

function createGridAdapter(mantine: BuilderMantineLayoutComponentSet): React.ComponentType<Record<string, unknown>> {
    return function BuilderMantineGridAdapter(inputProps: Record<string, unknown>): React.ReactElement {
        const props = mapGridProps(inputProps);
        return React.createElement(mantine.Grid ?? 'div', props);
    };
}

function createTypographyAdapter(
    fallbackElement: string,
    mantineComponent: BuilderMantineComponentType | undefined,
    mapProps: (props: Record<string, unknown>) => Record<string, unknown>
): React.ComponentType<Record<string, unknown>> {
    return function BuilderMantineTypographyAdapter(inputProps: Record<string, unknown>): React.ReactElement {
        const props = mapProps(inputProps);
        const component = mantineComponent ?? readString(props.component) ?? fallbackElement;
        return React.createElement(component, props);
    };
}

function createListAdapter(mantine: BuilderMantineTypographyComponentSet): React.ComponentType<Record<string, unknown>> {
    return function BuilderMantineListAdapter(inputProps: Record<string, unknown>): React.ReactElement {
        const props = mapListProps(inputProps);
        const items = Array.isArray(inputProps.items) ? inputProps.items.filter((item): item is string => typeof item === 'string') : [];
        const existingChildren = React.Children.toArray(inputProps.children as React.ReactNode);
        const itemChildren = items.map((item, index) => React.createElement(mantine.ListItem ?? 'li', { key: `item-${index}` }, item));
        props.children = itemChildren.length > 0 ? itemChildren : existingChildren;
        const component = mantine.List ?? readString(props.component) ?? 'ul';
        return React.createElement(component, props);
    };
}

function createMarkdownAdapter(mantine: BuilderMantineTypographyComponentSet): React.ComponentType<Record<string, unknown>> {
    return function BuilderMantineMarkdownAdapter(inputProps: Record<string, unknown>): React.ReactElement {
        const props = mapMarkdownProps(inputProps);
        const content = readString(inputProps.content) ?? readString(inputProps.children) ?? '';
        const allowHtml = inputProps.allowHtml === true;
        const sanitize = inputProps.sanitize !== false;
        const html = sanitize ? renderSafeMarkdown(content, allowHtml, readMarkdownLinkTarget(inputProps.linkTarget)) : escapeHtml(content);
        props.dangerouslySetInnerHTML = { __html: html };
        return React.createElement(mantine.TypographyStylesProvider ?? 'div', props);
    };
}

function createFormAdapter(
    fallbackElement: string,
    mantineComponent: BuilderMantineComponentType | undefined,
    mapProps: (props: Record<string, unknown>) => Record<string, unknown>
): React.ComponentType<Record<string, unknown>> {
    return function BuilderMantineFormAdapter(inputProps: Record<string, unknown>): React.ReactElement {
        const props = mapProps(inputProps);
        if (mantineComponent) {
            return React.createElement(mantineComponent, props);
        }
        return createAccessibleNativeFormControl(fallbackElement, props, inputProps);
    };
}

function createSelectAdapter(mantine: BuilderMantineFormComponentSet): React.ComponentType<Record<string, unknown>> {
    return function BuilderMantineSelectAdapter(inputProps: Record<string, unknown>): React.ReactElement {
        const props = mapSelectProps(inputProps);
        if (mantine.Select) {
            return React.createElement(mantine.Select, props);
        }

        const options = readOptions(inputProps.data).map(option => React.createElement('option', { key: option.value, value: option.value }, option.label));
        return React.createElement('select', props, ...options);
    };
}

function createRadioGroupAdapter(mantine: BuilderMantineFormComponentSet): React.ComponentType<Record<string, unknown>> {
    return function BuilderMantineRadioGroupAdapter(inputProps: Record<string, unknown>): React.ReactElement {
        const props = mapRadioGroupProps(inputProps);
        const options = readOptions(inputProps.data);
        const optionNodes = options.map(option => React.createElement(mantine.Radio ?? 'input', {
            key: option.value,
            label: option.label,
            'aria-label': mantine.Radio ? undefined : option.label,
            value: option.value,
            type: mantine.Radio ? undefined : 'radio',
            name: inputProps.name,
            disabled: inputProps.disabled
        }));
        props.children = optionNodes.length > 0 ? optionNodes : React.Children.toArray(inputProps.children as React.ReactNode);
        return React.createElement(mantine.RadioGroup ?? 'fieldset', props);
    };
}

function createDynamicFormAdapter(mantine: BuilderMantineFormComponentSet): React.ComponentType<Record<string, unknown>> {
    return function BuilderMantineDynamicFormAdapter(inputProps: Record<string, unknown>): React.ReactElement {
        const props = mapDynamicFormProps(inputProps);
        const children = React.Children.toArray(inputProps.children as React.ReactNode);
        const content = inputProps.layout === 'horizontal'
            ? React.createElement(mantine.Group ?? 'div', { gap: inputProps.gap }, ...children)
            : React.createElement(mantine.Stack ?? 'div', { gap: inputProps.gap }, ...children);
        return React.createElement(mantine.DynamicForm ?? 'form', props, content);
    };
}

function createSimpleAdapter(
    fallbackElement: string,
    mantineComponent: BuilderMantineComponentType | undefined,
    mapProps: (props: Record<string, unknown>) => Record<string, unknown>
): React.ComponentType<Record<string, unknown>> {
    return function BuilderMantineSimpleAdapter(inputProps: Record<string, unknown>): React.ReactElement {
        const props = mapProps(inputProps);
        return React.createElement(mantineComponent ?? fallbackElement, props);
    };
}

function createTableAdapter(
    mantineComponent: BuilderMantineComponentType | undefined,
    includeHeading: boolean
): React.ComponentType<Record<string, unknown>> {
    return function BuilderMantineTableAdapter(inputProps: Record<string, unknown>): React.ReactElement {
        const props = mapTableProps(inputProps);
        const columns = readColumns(inputProps.columns);
        const rows = readRows(inputProps.rows);
        const tableChildren: React.ReactNode[] = [
            readString(inputProps.caption) ? React.createElement('caption', { key: 'caption' }, inputProps.caption as string) : undefined,
            React.createElement('thead', { key: 'head' }, React.createElement('tr', undefined, ...columns.map(column => React.createElement('th', { key: column.key }, column.label)))),
            React.createElement('tbody', { key: 'body' }, ...createTableBodyRows(columns, rows, readString(inputProps.emptyText) ?? 'No data available'))
        ].filter(child => child !== undefined);
        const table = React.createElement(mantineComponent ?? 'table', props, ...tableChildren);

        if (!includeHeading || (!inputProps.title && !inputProps.description)) {
            return table;
        }

        return React.createElement('section', {
            key: typeof props.key === 'string' || typeof props.key === 'number' ? props.key : undefined,
            'data-builder-node-id': props['data-builder-node-id'],
            'data-builder-type': props['data-builder-type']
        },
            inputProps.title ? React.createElement('h3', { key: 'title' }, String(inputProps.title)) : undefined,
            inputProps.description ? React.createElement('p', { key: 'description' }, String(inputProps.description)) : undefined,
            table
        );
    };
}

function createMetricCardAdapter(mantine: BuilderMantineDataDisplayComponentSet): React.ComponentType<Record<string, unknown>> {
    return function BuilderMantineMetricCardAdapter(inputProps: Record<string, unknown>): React.ReactElement {
        const props = mapMetricCardProps(inputProps);
        const children = [
            React.createElement(mantine.Text ?? 'p', { key: 'label', size: 'sm', c: 'dimmed' }, String(inputProps.label ?? 'Metric')),
            React.createElement(mantine.Title ?? 'strong', { key: 'value', order: 3 }, String(inputProps.value ?? '0')),
            inputProps.description ? React.createElement(mantine.Text ?? 'p', { key: 'description' }, String(inputProps.description)) : undefined,
            inputProps.trendLabel ? React.createElement(mantine.Badge ?? 'span', { key: 'trend', color: inputProps.color }, String(inputProps.trendLabel)) : undefined
        ].filter((child): child is React.ReactElement => child !== undefined);
        return React.createElement(mantine.Card ?? 'article', props, ...children);
    };
}

function createStatCardAdapter(mantine: BuilderMantineDataDisplayComponentSet): React.ComponentType<Record<string, unknown>> {
    return function BuilderMantineStatCardAdapter(inputProps: Record<string, unknown>): React.ReactElement {
        const props = mapStatCardProps(inputProps);
        const metrics = readMetrics(inputProps.metrics);
        const children = [
            React.createElement(mantine.Text ?? 'p', { key: 'title', size: 'sm', c: 'dimmed' }, String(inputProps.title ?? 'Stat')),
            React.createElement(mantine.Title ?? 'strong', { key: 'value', order: 3 }, String(inputProps.value ?? '0')),
            inputProps.subtitle ? React.createElement(mantine.Text ?? 'p', { key: 'subtitle' }, String(inputProps.subtitle)) : undefined,
            ...metrics.map(metric => React.createElement(mantine.Badge ?? 'span', { key: metric.label, color: inputProps.color }, `${metric.label}: ${metric.value}`)),
            inputProps.helperText ? React.createElement(mantine.Text ?? 'p', { key: 'helper' }, String(inputProps.helperText)) : undefined
        ].filter((child): child is React.ReactElement => child !== undefined);
        return React.createElement(mantine.Card ?? 'article', props, ...children);
    };
}

function createNavLinkAdapter(mantine: BuilderMantineNavigationComponentSet): React.ComponentType<Record<string, unknown>> {
    return function BuilderMantineNavLinkAdapter(inputProps: Record<string, unknown>): React.ReactElement {
        const props = mapNavLinkProps(inputProps);
        if (!mantine.NavLink) {
            props.children = inputProps.label ?? inputProps.children;
        }
        return React.createElement(mantine.NavLink ?? 'a', props);
    };
}

function createBreadcrumbsAdapter(mantine: BuilderMantineNavigationComponentSet): React.ComponentType<Record<string, unknown>> {
    return function BuilderMantineBreadcrumbsAdapter(inputProps: Record<string, unknown>): React.ReactElement {
        const props = mapBreadcrumbsProps(inputProps);
        const itemNodes = readNavItems(inputProps.items).map((item, index) => React.createElement(mantine.Anchor ?? 'a', {
            key: `${item.label}-${index}`,
            href: item.href
        }, item.label));
        props.children = itemNodes.length > 0 ? itemNodes : React.Children.toArray(inputProps.children as React.ReactNode);
        return React.createElement(mantine.Breadcrumbs ?? 'nav', props);
    };
}

function createTabsAdapter(mantine: BuilderMantineNavigationComponentSet): React.ComponentType<Record<string, unknown>> {
    return function BuilderMantineTabsAdapter(inputProps: Record<string, unknown>): React.ReactElement {
        const props = mapTabsProps(inputProps);
        const tabs = readNavItems(inputProps.tabs);
        const active = readString(inputProps.defaultValue) ?? tabs[0]?.value;
        const tabList = React.createElement(mantine.TabsList ?? 'div', { key: 'list', role: mantine.TabsList ? undefined : 'tablist' },
            ...tabs.map(tab => React.createElement(mantine.TabsTab ?? 'button', {
                key: tab.value,
                value: tab.value,
                role: mantine.TabsTab ? undefined : 'tab',
                type: mantine.TabsTab ? undefined : 'button',
                tabIndex: !mantine.TabsTab && tab.value !== active ? -1 : undefined,
                'aria-selected': !mantine.TabsTab ? tab.value === active : undefined,
                'aria-controls': !mantine.TabsTab ? `${tab.value}-panel` : undefined
            }, tab.label))
        );
        const existingChildren = React.Children.toArray(inputProps.children as React.ReactNode);
        props.children = tabs.length > 0 ? [tabList, ...existingChildren] : existingChildren;
        return React.createElement(mantine.Tabs ?? 'div', props);
    };
}

function createOverlayAdapter(
    fallbackElement: string,
    mantineComponent: BuilderMantineComponentType | undefined,
    mantine: BuilderMantineOverlayComponentSet
): React.ComponentType<Record<string, unknown>> {
    return function BuilderMantineOverlayAdapter(inputProps: Record<string, unknown>): React.ReactElement {
        const props = mapOverlayProps(inputProps);
        const children = React.Children.toArray(inputProps.children as React.ReactNode);
        const actions = React.Children.toArray(inputProps.actions as React.ReactNode);
        props.children = actions.length > 0
            ? [...children, React.createElement(mantine.Group ?? 'div', { key: 'actions' }, ...actions)]
            : children;
        return React.createElement(mantineComponent ?? fallbackElement, props);
    };
}

function createNotificationAdapter(mantine: BuilderMantineFeedbackComponentSet): React.ComponentType<Record<string, unknown>> {
    return function BuilderMantineNotificationAdapter(inputProps: Record<string, unknown>): React.ReactElement {
        const props = mapNotificationProps(inputProps);
        if (!mantine.Notification) {
            props.children = inputProps.message;
        }
        return React.createElement(mantine.Notification ?? 'div', props);
    };
}

function createLoaderAdapter(mantine: BuilderMantineFeedbackComponentSet): React.ComponentType<Record<string, unknown>> {
    return function BuilderMantineLoaderAdapter(inputProps: Record<string, unknown>): React.ReactElement {
        const props = mapLoaderProps(inputProps);
        const loader = React.createElement(mantine.Loader ?? 'div', props);
        return inputProps.label
            ? React.createElement(mantine.Group ?? 'div', undefined, loader, React.createElement(mantine.Text ?? 'span', undefined, String(inputProps.label)))
            : loader;
    };
}

function createIconAdapter(mantine: BuilderMantineMediaComponentSet): React.ComponentType<Record<string, unknown>> {
    return function BuilderMantineIconAdapter(inputProps: Record<string, unknown>): React.ReactElement {
        const props = mapIconProps(inputProps);
        props.children = readString(inputProps.label) ?? readString(inputProps.name) ?? 'icon';
        return React.createElement(mantine.ThemeIcon ?? 'span', props);
    };
}

function createHeroSectionAdapter(mantine: BuilderMantineMarketingComponentSet): React.ComponentType<Record<string, unknown>> {
    return function BuilderMantineHeroSectionAdapter(inputProps: Record<string, unknown>): React.ReactElement {
        const props = mapSectionLikeProps(inputProps, ['eyebrow', 'title', 'subtitle', 'imageSrc', 'primaryActionLabel', 'secondaryActionLabel', 'align']);
        const children = React.Children.toArray(inputProps.children as React.ReactNode);
        if (children.length === 0) {
            children.push(...createMarketingHeader(mantine, inputProps));
            if (inputProps.imageSrc) {
                children.push(React.createElement(mantine.Image ?? 'img', { key: 'image', src: inputProps.imageSrc, alt: inputProps.title ?? 'Hero image' }));
            }
        }
        props.children = children;
        return React.createElement(mantine.Box ?? 'section', props);
    };
}

function createFeatureGridAdapter(mantine: BuilderMantineMarketingComponentSet): React.ComponentType<Record<string, unknown>> {
    return function BuilderMantineFeatureGridAdapter(inputProps: Record<string, unknown>): React.ReactElement {
        const props = mapSectionLikeProps(inputProps, ['title', 'description', 'columns', 'features']);
        const children = createMarketingHeader(mantine, inputProps);
        const featureCards = readFeatures(inputProps.features).map(feature => React.createElement(mantine.Card ?? 'article', { key: feature.title },
            React.createElement(mantine.Title ?? 'h3', { order: 3 }, feature.title),
            React.createElement(mantine.Text ?? 'p', undefined, feature.description)
        ));
        children.push(React.createElement(mantine.SimpleGrid ?? 'div', { key: 'features', cols: inputProps.columns }, ...featureCards));
        props.children = React.Children.count(inputProps.children as React.ReactNode) > 0 ? inputProps.children : children;
        return React.createElement(mantine.Box ?? 'section', props);
    };
}

function createPricingSectionAdapter(mantine: BuilderMantineMarketingComponentSet): React.ComponentType<Record<string, unknown>> {
    return function BuilderMantinePricingSectionAdapter(inputProps: Record<string, unknown>): React.ReactElement {
        const props = mapSectionLikeProps(inputProps, ['title', 'description', 'plans']);
        const children = createMarketingHeader(mantine, inputProps);
        const plans = readPricingPlans(inputProps.plans).map(plan => React.createElement(mantine.Card ?? 'article', { key: plan.name },
            React.createElement(mantine.Title ?? 'h3', { order: 3 }, plan.name),
            React.createElement(mantine.Text ?? 'p', undefined, plan.price),
            React.createElement(mantine.List ?? 'ul', undefined, ...plan.features.map(feature => React.createElement('li', { key: feature }, feature))),
            plan.ctaLabel ? React.createElement(mantine.Button ?? 'button', undefined, plan.ctaLabel) : undefined
        ));
        children.push(React.createElement(mantine.SimpleGrid ?? 'div', { key: 'plans', cols: plans.length || 1 }, ...plans));
        props.children = React.Children.count(inputProps.children as React.ReactNode) > 0 ? inputProps.children : children;
        return React.createElement(mantine.Box ?? 'section', props);
    };
}

function createTestimonialSectionAdapter(mantine: BuilderMantineMarketingComponentSet): React.ComponentType<Record<string, unknown>> {
    return function BuilderMantineTestimonialSectionAdapter(inputProps: Record<string, unknown>): React.ReactElement {
        const props = mapSectionLikeProps(inputProps, ['title', 'testimonials']);
        const children = createMarketingHeader(mantine, inputProps);
        const testimonials = readTestimonials(inputProps.testimonials).map(testimonial => React.createElement(mantine.Card ?? 'article', { key: testimonial.author },
            React.createElement(mantine.Text ?? 'blockquote', undefined, testimonial.quote),
            React.createElement(mantine.Text ?? 'p', undefined, testimonial.author)
        ));
        children.push(React.createElement(mantine.SimpleGrid ?? 'div', { key: 'testimonials', cols: testimonials.length || 1 }, ...testimonials));
        props.children = React.Children.count(inputProps.children as React.ReactNode) > 0 ? inputProps.children : children;
        return React.createElement(mantine.Box ?? 'section', props);
    };
}

function createCtaSectionAdapter(mantine: BuilderMantineMarketingComponentSet): React.ComponentType<Record<string, unknown>> {
    return function BuilderMantineCtaSectionAdapter(inputProps: Record<string, unknown>): React.ReactElement {
        const props = mapSectionLikeProps(inputProps, ['title', 'description', 'primaryActionLabel', 'secondaryActionLabel', 'align']);
        const children = React.Children.toArray(inputProps.children as React.ReactNode);
        props.children = children.length > 0 ? children : createMarketingHeader(mantine, inputProps);
        return React.createElement(mantine.Box ?? 'section', props);
    };
}

function createChartPlaceholderAdapter(mantine: BuilderMantineDashboardComponentSet): React.ComponentType<Record<string, unknown>> {
    return function BuilderMantineChartPlaceholderAdapter(inputProps: Record<string, unknown>): React.ReactElement {
        const props = mapChartPlaceholderProps(inputProps);
        props.children = [
            React.createElement(mantine.Title ?? 'h3', { key: 'title', order: 3 }, String(inputProps.title ?? 'Chart')),
            inputProps.description ? React.createElement(mantine.Text ?? 'p', { key: 'description' }, String(inputProps.description)) : undefined,
            React.createElement(mantine.Text ?? 'p', { key: 'empty' }, String(inputProps.emptyText ?? 'Chart data will appear here'))
        ].filter((child): child is React.ReactElement => child !== undefined);
        return React.createElement(mantine.Box ?? 'div', props);
    };
}

function createDashboardHeaderAdapter(mantine: BuilderMantineDashboardComponentSet): React.ComponentType<Record<string, unknown>> {
    return function BuilderMantineDashboardHeaderAdapter(inputProps: Record<string, unknown>): React.ReactElement {
        const props = mapDashboardHeaderProps(inputProps);
        const children = React.Children.toArray(inputProps.children as React.ReactNode);
        props.children = children.length > 0 ? children : [
            React.createElement(mantine.Title ?? 'h1', { key: 'title', order: 1 }, String(inputProps.title ?? 'Dashboard')),
            inputProps.description ? React.createElement(mantine.Text ?? 'p', { key: 'description' }, String(inputProps.description)) : undefined,
            inputProps.periodLabel ? React.createElement(mantine.Badge ?? 'span', { key: 'period' }, String(inputProps.periodLabel)) : undefined
        ].filter((child): child is React.ReactElement => child !== undefined);
        return React.createElement(mantine.Group ?? 'header', props);
    };
}

function mapPageProps(props: Record<string, unknown>): Record<string, unknown> {
    const next = withoutBuilderOnlyProps(props, ['title', 'description', 'fullWidth', 'background']);
    next.component = 'main';
    next.bg = props.background;
    next.style = mergeStyle(props.style, props.fullWidth === true ? { width: '100%' } : undefined);
    return dropUndefined(next);
}

function mapSectionProps(props: Record<string, unknown>): Record<string, unknown> {
    const next = withoutBuilderOnlyProps(props, ['background', 'fullWidth', 'padding', 'paddingX', 'paddingY']);
    next.component = props.component ?? 'section';
    next.p = props.padding;
    next.px = props.paddingX;
    next.py = props.paddingY;
    next.bg = props.background;
    next.style = mergeStyle(props.style, props.fullWidth === true ? { width: '100%' } : undefined);
    return dropUndefined(next);
}

function mapContainerProps(props: Record<string, unknown>): Record<string, unknown> {
    const next = withoutBuilderOnlyProps(props, ['padding', 'fluid', 'size']);
    next.p = props.padding;
    next.fluid = props.fluid ?? props.size === 'fluid';
    if (props.size !== 'fluid') {
        next.size = props.size;
    }
    return dropUndefined(next);
}

function mapStackProps(props: Record<string, unknown>): Record<string, unknown> {
    return dropUndefined({ ...props });
}

function mapGroupProps(props: Record<string, unknown>): Record<string, unknown> {
    const next = { ...props };
    next.wrap = props.wrap === false ? 'nowrap' : 'wrap';
    return dropUndefined(next);
}

function mapSimpleGridProps(props: Record<string, unknown>): Record<string, unknown> {
    return dropUndefined({ ...props });
}

function mapGridProps(props: Record<string, unknown>): Record<string, unknown> {
    const next = { ...props };
    return dropUndefined(next);
}

function mapCardProps(props: Record<string, unknown>): Record<string, unknown> {
    const next = withoutBuilderOnlyProps(props, ['background']);
    next.bg = props.background;
    return dropUndefined(next);
}

function mapDividerProps(props: Record<string, unknown>): Record<string, unknown> {
    return dropUndefined({ ...props });
}

function mapSpaceProps(props: Record<string, unknown>): Record<string, unknown> {
    const next = withoutBuilderOnlyProps(props, ['size']);
    if (props.h === undefined && props.w === undefined) {
        next.h = props.size;
    }
    return dropUndefined(next);
}

function mapBoxProps(props: Record<string, unknown>): Record<string, unknown> {
    const next = withoutBuilderOnlyProps(props, ['padding', 'margin', 'background']);
    next.p = props.padding;
    next.m = props.margin;
    next.bg = props.background;
    return dropUndefined(next);
}

function mapTitleProps(props: Record<string, unknown>): Record<string, unknown> {
    const next = withoutBuilderOnlyProps(props, ['align', 'weight']);
    next.ta = props.align;
    next.fw = props.weight;
    next.order = props.order;
    return dropUndefined(next);
}

function mapTextProps(props: Record<string, unknown>): Record<string, unknown> {
    const next = withoutBuilderOnlyProps(props, ['align', 'weight']);
    next.ta = props.align;
    next.fw = props.weight;
    next.component = props.component ?? 'p';
    return dropUndefined(next);
}

function mapBadgeProps(props: Record<string, unknown>): Record<string, unknown> {
    return dropUndefined({ ...props });
}

function mapListProps(props: Record<string, unknown>): Record<string, unknown> {
    const next = withoutBuilderOnlyProps(props, ['items', 'type']);
    next.type = props.type === 'ordered' ? 'ordered' : 'unordered';
    next.component = props.type === 'ordered' ? 'ol' : 'ul';
    return dropUndefined(next);
}

function mapMarkdownProps(props: Record<string, unknown>): Record<string, unknown> {
    return dropUndefined(withoutBuilderOnlyProps(props, ['content', 'allowHtml', 'sanitize', 'linkTarget', 'children']));
}

function mapButtonProps(props: Record<string, unknown>): Record<string, unknown> {
    const next = { ...props };
    next.type = props.type ?? 'button';
    if (!props.children && typeof props.label === 'string') {
        next['aria-label'] = props['aria-label'] ?? props.label;
    }
    return dropUndefined(next);
}

function mapTextInputProps(props: Record<string, unknown>): Record<string, unknown> {
    const next = withoutBuilderOnlyProps(props, ['children']);
    next.type = props.type ?? 'text';
    addFormAccessibilityProps(next, props);
    return dropUndefined(next);
}

function mapTextareaProps(props: Record<string, unknown>): Record<string, unknown> {
    const next = withoutBuilderOnlyProps(props, ['children']);
    addFormAccessibilityProps(next, props);
    return dropUndefined(next);
}

function mapSelectProps(props: Record<string, unknown>): Record<string, unknown> {
    const next = withoutBuilderOnlyProps(props, ['children']);
    addFormAccessibilityProps(next, props);
    return dropUndefined(next);
}

function mapCheckboxProps(props: Record<string, unknown>): Record<string, unknown> {
    const next = withoutBuilderOnlyProps(props, ['children']);
    next.type = 'checkbox';
    addFormAccessibilityProps(next, props);
    return dropUndefined(next);
}

function mapRadioGroupProps(props: Record<string, unknown>): Record<string, unknown> {
    const next = withoutBuilderOnlyProps(props, ['children', 'data', 'orientation']);
    addFormAccessibilityProps(next, props);
    return dropUndefined(next);
}

function mapNumberInputProps(props: Record<string, unknown>): Record<string, unknown> {
    const next = withoutBuilderOnlyProps(props, ['children']);
    next.type = 'number';
    addFormAccessibilityProps(next, props);
    return dropUndefined(next);
}

function mapDateInputProps(props: Record<string, unknown>): Record<string, unknown> {
    const next = withoutBuilderOnlyProps(props, ['children', 'minDate', 'maxDate', 'clearable']);
    next.type = 'date';
    next.min = props.minDate;
    next.max = props.maxDate;
    addFormAccessibilityProps(next, props);
    return dropUndefined(next);
}

function mapDynamicFormProps(props: Record<string, unknown>): Record<string, unknown> {
    const next = withoutBuilderOnlyProps(props, ['children', 'title', 'description', 'submitLabel', 'resetLabel', 'layout', 'gap']);
    next.noValidate = true;
    return dropUndefined(next);
}

function mapTableProps(props: Record<string, unknown>): Record<string, unknown> {
    return dropUndefined(withoutBuilderOnlyProps(props, ['title', 'description', 'caption', 'columns', 'rows', 'emptyText', 'pageSize', 'searchable', 'sortable', 'selectable']));
}

function mapMetricCardProps(props: Record<string, unknown>): Record<string, unknown> {
    return dropUndefined(withoutBuilderOnlyProps(props, ['label', 'value', 'description', 'trend', 'trendLabel', 'icon', 'loading']));
}

function mapStatCardProps(props: Record<string, unknown>): Record<string, unknown> {
    return dropUndefined(withoutBuilderOnlyProps(props, ['title', 'value', 'subtitle', 'helperText', 'metrics']));
}

function mapAnchorProps(props: Record<string, unknown>): Record<string, unknown> {
    const next = withoutBuilderOnlyProps(props, ['children']);
    if (props.target === '_blank') {
        next.rel = 'noopener noreferrer';
    }
    return dropUndefined(next);
}

function mapNavLinkProps(props: Record<string, unknown>): Record<string, unknown> {
    const next = withoutBuilderOnlyProps(props, ['items', 'icon']);
    next.children = props.children;
    return dropUndefined(next);
}

function mapBreadcrumbsProps(props: Record<string, unknown>): Record<string, unknown> {
    return dropUndefined(withoutBuilderOnlyProps(props, ['items']));
}

function mapTabsProps(props: Record<string, unknown>): Record<string, unknown> {
    const next = withoutBuilderOnlyProps(props, ['tabs', 'children']);
    next.value = props.defaultValue;
    return dropUndefined(next);
}

function mapOverlayProps(props: Record<string, unknown>): Record<string, unknown> {
    return dropUndefined(withoutBuilderOnlyProps(props, ['actions', 'children']));
}

function mapAlertProps(props: Record<string, unknown>): Record<string, unknown> {
    const next = withoutBuilderOnlyProps(props, ['icon']);
    next.role = props.role ?? (props.variant === 'error' ? 'alert' : 'status');
    next['aria-live'] = props['aria-live'] ?? (props.variant === 'error' ? 'assertive' : 'polite');
    return dropUndefined(next);
}

function mapNotificationProps(props: Record<string, unknown>): Record<string, unknown> {
    const next = withoutBuilderOnlyProps(props, ['message', 'icon']);
    next.children = props.children;
    next.role = props.role ?? (props.variant === 'error' ? 'alert' : 'status');
    next['aria-live'] = props['aria-live'] ?? (props.variant === 'error' ? 'assertive' : 'polite');
    return dropUndefined(next);
}

function mapLoaderProps(props: Record<string, unknown>): Record<string, unknown> {
    return dropUndefined(withoutBuilderOnlyProps(props, ['label']));
}

function mapImageProps(props: Record<string, unknown>): Record<string, unknown> {
    const next = withoutBuilderOnlyProps(props, ['fit']);
    next.style = mergeStyle(props.style, props.fit ? { objectFit: props.fit } : undefined);
    return dropUndefined(next);
}

function mapAvatarProps(props: Record<string, unknown>): Record<string, unknown> {
    return dropUndefined({ ...props });
}

function mapIconProps(props: Record<string, unknown>): Record<string, unknown> {
    const next = withoutBuilderOnlyProps(props, ['name', 'label', 'strokeWidth']);
    next['aria-label'] = props.label ?? props.name;
    return dropUndefined(next);
}

function mapSectionLikeProps(props: Record<string, unknown>, builderOnlyKeys: string[]): Record<string, unknown> {
    const next = withoutBuilderOnlyProps(props, [...builderOnlyKeys, 'children']);
    next.ta = props.align;
    return dropUndefined(next);
}

function mapMetricGridProps(props: Record<string, unknown>): Record<string, unknown> {
    const next = withoutBuilderOnlyProps(props, ['columns']);
    next.cols = props.columns;
    return dropUndefined(next);
}

function mapChartPlaceholderProps(props: Record<string, unknown>): Record<string, unknown> {
    const next = withoutBuilderOnlyProps(props, ['title', 'description', 'chartType', 'height', 'emptyText']);
    next.style = mergeStyle(props.style, typeof props.height === 'number' ? { minHeight: props.height } : undefined);
    return dropUndefined(next);
}

function mapDashboardHeaderProps(props: Record<string, unknown>): Record<string, unknown> {
    return dropUndefined(withoutBuilderOnlyProps(props, ['title', 'description', 'periodLabel']));
}

function withoutBuilderOnlyProps(props: Record<string, unknown>, keys: string[]): Record<string, unknown> {
    const next = { ...props };
    for (const key of keys) {
        delete next[key];
    }
    return next;
}

function addFormAccessibilityProps(next: Record<string, unknown>, props: Record<string, unknown>): void {
    if (next['aria-label'] === undefined && typeof props.label === 'string') {
        next['aria-label'] = props.label;
    }
    const invalid = props.error !== undefined && props.error !== false && props.error !== '';
    if (invalid) {
        next['aria-invalid'] = true;
        const id = readString(props.id) ?? readString(props['data-builder-node-id']);
        if (id) {
            next['aria-errormessage'] = `${id}-error`;
        }
    }
}

function createAccessibleNativeFormControl(
    fallbackElement: string,
    props: Record<string, unknown>,
    inputProps: Record<string, unknown>
): React.ReactElement {
    const control = React.createElement(fallbackElement, props);
    const label = readString(inputProps.label);
    const description = readString(inputProps.description);
    const error = typeof inputProps.error === 'string' ? inputProps.error : undefined;
    if (!label && !description && !error) {
        return control;
    }

    const id = readString(props.id) ?? readString(props['data-builder-node-id']);
    return React.createElement('label', { className: 'builder-form-field' },
        label ? React.createElement('span', { key: 'label' }, label) : undefined,
        control,
        description ? React.createElement('span', { key: 'description' }, description) : undefined,
        error ? React.createElement('span', { key: 'error', id: id ? `${id}-error` : undefined, role: 'alert' }, error) : undefined
    );
}

function dropUndefined(props: Record<string, unknown>): Record<string, unknown> {
    for (const key of Object.keys(props)) {
        if (props[key] === undefined) {
            delete props[key];
        }
    }
    return props;
}

function mergeStyle(existing: unknown, addition: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
    if (!addition) {
        return isRecord(existing) ? existing : undefined;
    }
    return {
        ...(isRecord(existing) ? existing : {}),
        ...addition
    };
}

function readString(value: unknown): string | undefined {
    return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function readMarkdownLinkTarget(value: unknown): '_self' | '_blank' {
    return value === '_blank' ? '_blank' : '_self';
}

function readOptions(value: unknown): Array<{ label: string; value: string }> {
    if (!Array.isArray(value)) {
        return [];
    }
    return value
        .map(option => {
            if (typeof option === 'string') {
                return { label: option, value: option };
            }
            if (isRecord(option) && typeof option.label === 'string' && typeof option.value === 'string') {
                return { label: option.label, value: option.value };
            }
            return undefined;
        })
        .filter((option): option is { label: string; value: string } => option !== undefined);
}

function readColumns(value: unknown): Array<{ key: string; label: string }> {
    if (!Array.isArray(value)) {
        return [];
    }
    return value
        .map(column => isRecord(column) && typeof column.key === 'string'
            ? { key: column.key, label: typeof column.label === 'string' ? column.label : column.key }
            : undefined)
        .filter((column): column is { key: string; label: string } => column !== undefined);
}

function readRows(value: unknown): Record<string, unknown>[] {
    return Array.isArray(value) ? value.filter(isRecord) : [];
}

function createTableBodyRows(columns: Array<{ key: string; label: string }>, rows: Record<string, unknown>[], emptyText: string): React.ReactElement[] {
    if (rows.length === 0) {
        return [React.createElement('tr', { key: 'empty' }, React.createElement('td', { colSpan: Math.max(columns.length, 1) }, emptyText))];
    }
    return rows.map((row, rowIndex) => React.createElement('tr', { key: `row-${rowIndex}` },
        ...columns.map(column => React.createElement('td', { key: column.key }, String(row[column.key] ?? '')))
    ));
}

function readMetrics(value: unknown): Array<{ label: string; value: string | number }> {
    if (!Array.isArray(value)) {
        return [];
    }
    return value
        .map(metric => isRecord(metric) && typeof metric.label === 'string' && (typeof metric.value === 'string' || typeof metric.value === 'number')
            ? { label: metric.label, value: metric.value }
            : undefined)
        .filter((metric): metric is { label: string; value: string | number } => metric !== undefined);
}

function readNavItems(value: unknown): Array<{ label: string; href?: string; value: string }> {
    if (!Array.isArray(value)) {
        return [];
    }
    const items: Array<{ label: string; href?: string; value: string }> = [];
    value.forEach((item, index) => {
        if (isRecord(item) && typeof item.label === 'string') {
            const navItem: { label: string; href?: string; value: string } = {
                label: item.label,
                value: typeof item.href === 'string' ? item.href : `tab-${index + 1}`
            };
            if (typeof item.href === 'string') {
                navItem.href = item.href;
            }
            items.push(navItem);
        }
    });
    return items;
}

function createMarketingHeader(mantine: BuilderMantineMarketingComponentSet, props: Record<string, unknown>): React.ReactElement[] {
    return [
        props.eyebrow ? React.createElement(mantine.Text ?? 'p', { key: 'eyebrow' }, String(props.eyebrow)) : undefined,
        props.title ? React.createElement(mantine.Title ?? 'h2', { key: 'title', order: 2 }, String(props.title)) : undefined,
        props.subtitle || props.description ? React.createElement(mantine.Text ?? 'p', { key: 'description' }, String(props.subtitle ?? props.description)) : undefined,
        props.primaryActionLabel || props.secondaryActionLabel ? React.createElement(mantine.Group ?? 'div', { key: 'actions' },
            props.primaryActionLabel ? React.createElement(mantine.Button ?? 'button', { key: 'primary' }, String(props.primaryActionLabel)) : undefined,
            props.secondaryActionLabel ? React.createElement(mantine.Button ?? 'button', { key: 'secondary', variant: 'subtle' }, String(props.secondaryActionLabel)) : undefined
        ) : undefined
    ].filter((child): child is React.ReactElement => child !== undefined);
}

function readFeatures(value: unknown): Array<{ title: string; description?: string }> {
    return readObjectList(value).map(item => ({ title: String(item.title ?? 'Feature'), description: typeof item.description === 'string' ? item.description : undefined }));
}

function readPricingPlans(value: unknown): Array<{ name: string; price: string; features: string[]; ctaLabel?: string }> {
    return readObjectList(value).map(item => ({
        name: String(item.name ?? 'Plan'),
        price: String(item.price ?? ''),
        features: Array.isArray(item.features) ? item.features.filter((feature): feature is string => typeof feature === 'string') : [],
        ctaLabel: typeof item.ctaLabel === 'string' ? item.ctaLabel : undefined
    }));
}

function readTestimonials(value: unknown): Array<{ quote: string; author: string }> {
    return readObjectList(value).map(item => ({
        quote: String(item.quote ?? ''),
        author: String(item.author ?? 'Customer')
    }));
}

function readObjectList(value: unknown): Record<string, unknown>[] {
    return Array.isArray(value) ? value.filter(isRecord) : [];
}

function renderSafeMarkdown(markdown: string, allowHtml: boolean, linkTarget: '_self' | '_blank'): string {
    const blocks = markdown.replace(/\r\n?/g, '\n').split(/\n{2,}/).map(block => block.trim()).filter(Boolean);
    return blocks.map(block => renderMarkdownBlock(block, allowHtml, linkTarget)).join('\n');
}

function renderMarkdownBlock(block: string, allowHtml: boolean, linkTarget: '_self' | '_blank'): string {
    const heading = /^(#{1,6})\s+(.+)$/.exec(block);
    if (heading) {
        const level = heading[1].length;
        return `<h${level}>${renderInlineMarkdown(heading[2], allowHtml, linkTarget)}</h${level}>`;
    }

    const lines = block.split('\n');
    if (lines.every(line => /^\s*[-*]\s+/.test(line))) {
        return `<ul>${lines.map(line => `<li>${renderInlineMarkdown(line.replace(/^\s*[-*]\s+/, ''), allowHtml, linkTarget)}</li>`).join('')}</ul>`;
    }
    if (lines.every(line => /^\s*\d+\.\s+/.test(line))) {
        return `<ol>${lines.map(line => `<li>${renderInlineMarkdown(line.replace(/^\s*\d+\.\s+/, ''), allowHtml, linkTarget)}</li>`).join('')}</ol>`;
    }

    return `<p>${renderInlineMarkdown(block, allowHtml, linkTarget).replace(/\n/g, '<br>')}</p>`;
}

function renderInlineMarkdown(value: string, allowHtml: boolean, linkTarget: '_self' | '_blank'): string {
    const escaped = allowHtml ? sanitizeHtml(value, linkTarget) : escapeHtml(value);
    return escaped
        .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_match, text: string, href: string) => renderSafeLink(text, href, linkTarget))
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code>$1</code>');
}

function renderSafeLink(text: string, href: string, linkTarget: '_self' | '_blank'): string {
    const safeHref = sanitizeUrl(href);
    const safeText = escapeHtml(text);
    if (!safeHref) {
        return safeText;
    }
    const target = linkTarget === '_blank' ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a href="${escapeHtmlAttribute(safeHref)}"${target}>${safeText}</a>`;
}

function sanitizeHtml(value: string, linkTarget: '_self' | '_blank'): string {
    const allowedTags = new Set(['a', 'br', 'strong', 'em', 'b', 'i', 'code', 'pre', 'blockquote', 'ul', 'ol', 'li', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

    return value.replace(/<\/?([a-z][a-z0-9-]*)((?:\s+[^\s"'=<>`/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*\/?>/gi, (match, tagName: string, rawAttributes = '') => {
        const normalizedTagName = tagName.toLowerCase();
        if (!allowedTags.has(normalizedTagName)) {
            return escapeHtml(stripUnsafeHtmlAttributes(match));
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

function stripUnsafeHtmlAttributes(value: string): string {
    return value
        .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
        .replace(/\s+(href|src)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi, (_match, name: string, doubleQuoted: string, singleQuoted: string, bare: string) => {
            const safeUrl = sanitizeUrl(decodeBasicHtmlEntities(doubleQuoted ?? singleQuoted ?? bare));
            return safeUrl ? ` ${name.toLowerCase()}="${escapeHtmlAttribute(safeUrl)}"` : '';
        })
        .replace(/\s+style\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
}

function renderSafeAnchorAttributes(rawAttributes: string, linkTarget: '_self' | '_blank'): string {
    const href = readHtmlAttribute(rawAttributes, 'href');
    const title = readHtmlAttribute(rawAttributes, 'title');
    const safeHref = href ? sanitizeUrl(href) : undefined;
    const attributes = [`href="${escapeHtmlAttribute(safeHref ?? '#')}"`];

    if (title) {
        attributes.push(`title="${escapeHtmlAttribute(title)}"`);
    }
    if (linkTarget === '_blank') {
        attributes.push('target="_blank"', 'rel="noopener noreferrer"');
    }

    return ` ${attributes.join(' ')}`;
}

function readHtmlAttribute(rawAttributes: string, name: string): string | undefined {
    const matcher = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>\\x60]+))`, 'i');
    const match = matcher.exec(rawAttributes);
    const value = match?.[1] ?? match?.[2] ?? match?.[3];
    return value === undefined ? undefined : decodeBasicHtmlEntities(value);
}

function decodeBasicHtmlEntities(value: string): string {
    return value
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/&#x([0-9a-f]+);/gi, (_match, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
        .replace(/&#([0-9]+);/g, (_match, code: string) => String.fromCodePoint(Number.parseInt(code, 10)));
}

function sanitizeUrl(value: string): string | undefined {
    const trimmed = value.trim();
    if (/^(?:https?:|mailto:|tel:|\/(?!\/)|#)/i.test(trimmed)) {
        return trimmed;
    }
    return undefined;
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

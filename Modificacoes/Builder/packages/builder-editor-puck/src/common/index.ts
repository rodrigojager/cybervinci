import {
    validateBuilderDocumentTypesAgainstRegistry,
    type BuilderComponentCategory,
    type BuilderComponentDefinition,
    type BuilderComponentRegistry,
    type BuilderSlotDefinition,
    type BuilderValidationError
} from '@cybervinci/builder-registry';
import { validateBuilderDocumentStructure, type BuilderDocument, type BuilderJsonValue, type BuilderNode, type BuilderStructuralValidationError } from '@cybervinci/builder-schema';

export interface BuilderPuckAdapterOptions {
    registry: BuilderComponentRegistry;
    selectedNodeId?: string;
}

export interface BuilderPuckData {
    root: BuilderPuckNode;
}

export interface BuilderPuckNode {
    id: string;
    type: string;
    props: Record<string, unknown>;
    children?: BuilderPuckNode[];
    slots?: Record<string, BuilderPuckNode[]>;
    builderNode?: BuilderNode;
    isSelected?: boolean;
    unknownComponent?: BuilderPuckUnknownComponentFallback;
}

export interface BuilderPuckUnknownComponentFallback {
    type: 'BuilderUnknownComponentFallback';
    originalType: string;
    nodeId: string;
    message: string;
}

export interface BuilderPuckAdapterResult<TPuckData = BuilderPuckData> {
    puckData: TPuckData;
    toBuilderDocument(data: TPuckData): BuilderDocument;
}

export interface PuckDataToBuilderOptions extends BuilderPuckAdapterOptions {
    baseDocument: BuilderDocument;
}

export interface BuilderPuckConfigOptions {
    registry: BuilderComponentRegistry;
    includeUnknownFallback?: boolean;
}

export interface BuilderPuckConfig {
    components: Record<string, BuilderPuckComponentConfig>;
    categories: Record<string, BuilderPuckCategoryConfig>;
    toolbox: BuilderPuckToolboxCategory[];
    rules: Record<string, BuilderPuckComponentRules>;
}

export interface BuilderPuckCategoryConfig {
    title: string;
    components: string[];
}

export interface BuilderPuckToolboxCategory {
    title: string;
    category: BuilderComponentCategory | string;
    items: BuilderPuckToolboxItem[];
}

export interface BuilderPuckToolboxItem {
    type: string;
    label: string;
    description?: string;
    defaultProps: Record<string, unknown>;
    defaultNode: BuilderNode;
}

export interface BuilderPuckComponentConfig {
    label: string;
    category: BuilderComponentCategory;
    fields: Record<string, BuilderPuckFieldConfig>;
    defaultProps: Record<string, unknown>;
    defaultNode: BuilderNode;
    allowedChildren?: string[];
    slots?: Record<string, BuilderPuckSlotConfig>;
    rules: BuilderPuckComponentRules;
    builder: BuilderComponentDefinition;
}

export interface BuilderPuckSlotConfig {
    label: string;
    description?: string;
    allowedChildren?: string[];
    defaultChildren?: BuilderNode[];
}

export interface BuilderPuckComponentRules {
    canContain: string[];
    slots?: Record<string, BuilderPuckSlotRules>;
}

export interface BuilderPuckSlotRules {
    canContain: string[];
}

export interface BuilderPuckFieldConfig {
    type: 'text' | 'textarea' | 'number' | 'select' | 'radio' | 'checkbox' | 'array' | 'object' | 'json';
    label: string;
    required?: boolean;
    options?: Array<{ label: string; value: BuilderJsonValue }>;
    default?: BuilderJsonValue;
    schema?: Record<string, unknown>;
    uiSchema?: Record<string, unknown>;
}

export class BuilderPuckAdapterValidationError extends Error {

    constructor(readonly errors: Array<BuilderStructuralValidationError | BuilderValidationError>) {
        super(`Puck data could not be converted to a valid Builder document: ${errors.map(error => error.message).join('; ')}`);
        this.name = 'BuilderPuckAdapterValidationError';
    }
}

export class BuilderPuckInternalFormatError extends Error {

    constructor(message = 'Internal Puck data cannot be used as a canonical Builder document. Convert it with puckDataToBuilder first.') {
        super(message);
        this.name = 'BuilderPuckInternalFormatError';
    }
}

export function builderToPuckData(document: BuilderDocument, options: BuilderPuckAdapterOptions): BuilderPuckData {
    return {
        root: toPuckNode(document.tree, options)
    };
}

export function puckDataToBuilder(puckData: BuilderPuckData, options: PuckDataToBuilderOptions): BuilderDocument {
    assertBuilderPuckData(puckData);

    const document: BuilderDocument = {
        ...options.baseDocument,
        tree: toBuilderNode(puckData.root)
    };

    const structuralValidation = validateBuilderDocumentStructure(document);
    const registryValidation = validateBuilderDocumentTypesAgainstRegistry(document, options.registry);
    const errors = [...structuralValidation.errors, ...registryValidation.errors];

    if (errors.length > 0) {
        throw new BuilderPuckAdapterValidationError(errors);
    }

    return document;
}

export function createBuilderPuckAdapter<TPuckData = BuilderPuckData>(
    document: BuilderDocument,
    options: BuilderPuckAdapterOptions
): BuilderPuckAdapterResult<TPuckData> {
    return {
        puckData: builderToPuckData(document, options) as TPuckData,
        toBuilderDocument: data => {
            const puckData = data as BuilderPuckData;
            assertBuilderPuckData(puckData);

            return puckDataToBuilder(puckData, {
                ...options,
                baseDocument: document
            });
        }
    };
}

function assertBuilderPuckData(value: unknown): asserts value is BuilderPuckData {
    if (!isRecord(value) || !isRecord(value.root)) {
        throw new BuilderPuckInternalFormatError('Expected internal Puck data with a root node before converting to canonical Builder.');
    }
}

export function createBuilderPuckConfig(options: BuilderPuckConfigOptions): BuilderPuckConfig {
    const components: Record<string, BuilderPuckComponentConfig> = {};
    const categories: Record<string, BuilderPuckCategoryConfig> = {};
    const rules: Record<string, BuilderPuckComponentRules> = {};

    for (const definition of options.registry.list()) {
        const category = categories[definition.category] ?? {
            title: definition.category,
            components: []
        };
        category.components.push(definition.type);
        categories[definition.category] = category;

        const componentRules = createPuckRules(definition);
        rules[definition.type] = componentRules;
        components[definition.type] = {
            label: definition.displayName ?? definition.label ?? definition.type,
            category: definition.category,
            fields: createPuckFields(definition),
            defaultProps: cloneObject(definition.defaultProps),
            defaultNode: options.registry.createDefaultNode(definition.type),
            allowedChildren: definition.allowedChildren ? [...definition.allowedChildren] : undefined,
            slots: createPuckSlots(definition.slots),
            rules: componentRules,
            builder: definition
        };
    }

    if (options.includeUnknownFallback !== false) {
        components.BuilderUnknownComponentFallback = createUnknownFallbackConfig();
    }

    return {
        components,
        categories,
        toolbox: Object.entries(categories).map(([category, config]) => ({
            title: config.title,
            category,
            items: config.components.map(type => {
                const component = components[type];
                return {
                    type,
                    label: component.label,
                    description: component.builder.description,
                    defaultProps: cloneObject(component.defaultProps),
                    defaultNode: cloneNode(component.defaultNode)
                };
            })
        })),
        rules
    };
}

function toPuckNode(node: BuilderNode, options: BuilderPuckAdapterOptions): BuilderPuckNode {
    const known = options.registry.has(node.type);
    const puckType = known ? node.type : 'BuilderUnknownComponentFallback';

    return {
        id: node.id,
        type: puckType,
        props: {
            ...(node.props ?? {}),
            ...(known ? {} : {
                originalType: node.type,
                message: `Unknown Builder component type '${node.type}'.`
            })
        },
        children: node.children?.map(child => toPuckNode(child, options)),
        slots: mapSlotsToPuck(node.slots, options),
        builderNode: node,
        isSelected: options.selectedNodeId === node.id ? true : undefined,
        unknownComponent: known ? undefined : {
            type: 'BuilderUnknownComponentFallback',
            originalType: node.type,
            nodeId: node.id,
            message: `Unknown Builder component type '${node.type}'.`
        }
    };
}

function toBuilderNode(node: BuilderPuckNode): BuilderNode {
    const knownFallbackProps = node.unknownComponent ? ['originalType', 'message'] : [];
    const props = Object.fromEntries(
        Object.entries(node.props ?? {}).filter(([key]) => !knownFallbackProps.includes(key))
    ) as Record<string, BuilderJsonValue>;
    const builderNode: BuilderNode = {
        ...(node.builderNode ?? {}),
        id: node.id,
        type: node.unknownComponent?.originalType ?? node.builderNode?.type ?? node.type,
        props
    };

    if (node.children) {
        builderNode.children = node.children.map(toBuilderNode);
    } else {
        delete builderNode.children;
    }

    const slots = mapSlotsToBuilder(node.slots);
    if (slots) {
        builderNode.slots = slots;
    } else {
        delete builderNode.slots;
    }

    return builderNode;
}

function mapSlotsToPuck(
    slots: Record<string, BuilderNode[]> | undefined,
    options: BuilderPuckAdapterOptions
): Record<string, BuilderPuckNode[]> | undefined {
    if (!slots) {
        return undefined;
    }

    return Object.fromEntries(
        Object.entries(slots).map(([slotName, nodes]) => [slotName, nodes.map(node => toPuckNode(node, options))])
    );
}

function mapSlotsToBuilder(slots: Record<string, BuilderPuckNode[]> | undefined): Record<string, BuilderNode[]> | undefined {
    if (!slots) {
        return undefined;
    }

    return Object.fromEntries(
        Object.entries(slots).map(([slotName, nodes]) => [slotName, nodes.map(toBuilderNode)])
    );
}

function createPuckFields(definition: BuilderComponentDefinition): Record<string, BuilderPuckFieldConfig> {
    const properties = asRecord(definition.propsSchema.properties);
    const required = new Set(Array.isArray(definition.propsSchema.required) ? definition.propsSchema.required.filter(isString) : []);
    const uiProperties = asRecord(definition.uiSchema);

    return Object.fromEntries(
        Object.entries(properties).map(([name, schema]) => {
            const propertySchema = asRecord(schema);
            return [name, {
                ...fieldFromJsonSchema(propertySchema),
                label: titleFromSchema(name, propertySchema),
                required: required.has(name) || undefined,
                default: cloneJsonValue(definition.defaultProps?.[name] as BuilderJsonValue | undefined),
                schema: propertySchema,
                uiSchema: asRecord(uiProperties[name])
            }];
        })
    );
}

function fieldFromJsonSchema(schema: Record<string, unknown>): Omit<BuilderPuckFieldConfig, 'label'> {
    const enumValues = Array.isArray(schema.enum) ? schema.enum.filter(isBuilderJsonValue) : undefined;
    if (enumValues) {
        return {
            type: enumValues.length <= 4 ? 'radio' : 'select',
            options: enumValues.map(value => ({ label: String(value), value }))
        };
    }

    switch (schema.type) {
        case 'boolean':
            return { type: 'checkbox' };
        case 'number':
        case 'integer':
            return { type: 'number' };
        case 'array':
            return { type: 'array' };
        case 'object':
            return { type: 'object' };
        case 'string':
            return schema.format === 'markdown' || schema.format === 'textarea' ? { type: 'textarea' } : { type: 'text' };
        default:
            return { type: 'json' };
    }
}

function createPuckRules(definition: BuilderComponentDefinition): BuilderPuckComponentRules {
    return {
        canContain: definition.allowedChildren ? [...definition.allowedChildren] : [],
        slots: definition.slots ? Object.fromEntries(
            Object.entries(definition.slots).map(([slotName, slot]) => [slotName, {
                canContain: slot.allowedChildren ? [...slot.allowedChildren] : []
            }])
        ) : undefined
    };
}

function createPuckSlots(slots: Record<string, BuilderSlotDefinition> | undefined): Record<string, BuilderPuckSlotConfig> | undefined {
    if (!slots) {
        return undefined;
    }

    return Object.fromEntries(
        Object.entries(slots).map(([slotName, slot]) => [slotName, {
            label: slot.displayName ?? slot.label ?? slotName,
            description: slot.description,
            allowedChildren: slot.allowedChildren ? [...slot.allowedChildren] : undefined,
            defaultChildren: slot.defaultChildren?.map(cloneNode)
        }])
    );
}

function createUnknownFallbackConfig(): BuilderPuckComponentConfig {
    const definition: BuilderComponentDefinition = {
        type: 'BuilderUnknownComponentFallback',
        displayName: 'Unknown Builder Component',
        category: 'Custom',
        description: 'Editor fallback for components missing from the active Builder registry.',
        propsSchema: {
            type: 'object',
            additionalProperties: true,
            properties: {
                originalType: { type: 'string' },
                message: { type: 'string' }
            }
        },
        defaultProps: {
            originalType: 'Unknown',
            message: 'Unknown Builder component.'
        },
        allowedChildren: []
    };
    const rules = createPuckRules(definition);

    return {
        label: definition.displayName,
        category: definition.category,
        fields: createPuckFields(definition),
        defaultProps: cloneObject(definition.defaultProps),
        defaultNode: {
            id: 'builder-unknown-component-fallback',
            type: definition.type,
            props: cloneBuilderJsonObject(definition.defaultProps)
        },
        allowedChildren: [],
        rules,
        builder: definition
    };
}

function titleFromSchema(name: string, schema: Record<string, unknown>): string {
    return typeof schema.title === 'string' ? schema.title : name;
}

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isString(value: unknown): value is string {
    return typeof value === 'string';
}

function isBuilderJsonValue(value: unknown): value is BuilderJsonValue {
    return value === null || ['string', 'number', 'boolean'].includes(typeof value);
}

function cloneObject<T extends Record<string, unknown> | undefined>(value: T): Record<string, unknown> {
    return value ? JSON.parse(JSON.stringify(value)) : {};
}

function cloneBuilderJsonObject(value: Record<string, unknown> | undefined): Record<string, BuilderJsonValue> {
    return cloneObject(value) as Record<string, BuilderJsonValue>;
}

function cloneNode(node: BuilderNode): BuilderNode {
    return JSON.parse(JSON.stringify(node));
}

function cloneJsonValue<T extends BuilderJsonValue | undefined>(value: T): T {
    return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

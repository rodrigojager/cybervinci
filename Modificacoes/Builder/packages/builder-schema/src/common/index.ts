// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// This Source Code may also be made available under the following Secondary
// Licenses when the conditions for such availability set forth in the Eclipse
// Public License v. 2.0 are satisfied: GNU General Public License, version 2
// with the GNU Classpath Exception which is available at
// https://www.gnu.org/software/classpath/license.html.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

export const Builder_SCHEMA_VERSION = '0.1.0';

export const Builder_DEFAULT_DOCUMENT_SIZE_LIMIT_BYTES = 512 * 1024;
export const Builder_DEFAULT_TREE_DEPTH_LIMIT = 48;
export const Builder_DEFAULT_NODE_COUNT_LIMIT = 2000;
export const Builder_DEFAULT_NODE_PROPS_SIZE_LIMIT_BYTES = 32 * 1024;
export const Builder_JSON_NULL = JSON.parse('null') as null;

export const Builder_DEFAULT_THEME: BuilderTheme = {
    mode: 'light',
    primaryColor: 'blue',
    radius: 'md',
    fontFamily: 'Inter, system-ui, sans-serif',
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32
    },
    tokens: {}
};

export interface CreateBuilderDocumentOptions {
    id?: string;
    name?: string;
    title?: string;
    route?: string;
    layout?: BuilderPageLayout;
    createdBy?: string;
    createdAt?: string;
    updatedAt?: string;
}

export function createBuilderDocument(options: CreateBuilderDocumentOptions = {}): BuilderDocument {
    const id = options.id ?? 'page';
    const name = options.name ?? options.title ?? 'Untitled Builder Page';
    const title = options.title ?? name;
    const timestamp = options.createdAt ?? options.updatedAt ?? new Date().toISOString();

    return {
        schemaVersion: Builder_SCHEMA_VERSION,
        metadata: {
            id,
            name,
            createdBy: options.createdBy,
            createdAt: timestamp,
            updatedAt: options.updatedAt ?? timestamp
        },
        page: {
            id,
            title,
            route: options.route,
            layout: options.layout ?? 'default'
        },
        theme: {
            ...Builder_DEFAULT_THEME,
            spacing: {
                ...Builder_DEFAULT_THEME.spacing
            },
            tokens: {
                ...Builder_DEFAULT_THEME.tokens
            }
        },
        dataSources: {},
        actions: {},
        states: {},
        permissions: {},
        tree: {
            id: `${id}-root`,
            type: 'Page',
            props: {
                title
            },
            children: []
        }
    };
}

export interface DeserializeBuilderDocumentJsonOptions {
    sourceName?: string;
    migrate?: boolean;
    migrations?: readonly BuilderSchemaMigration[];
    targetSchemaVersion?: string;
    maxDocumentSizeBytes?: number;
}

export interface SerializeBuilderDocumentJsonOptions {
    space?: string | number;
}

export interface BuilderStructuralValidationError {
    path: string;
    message: string;
    nodeId?: string;
    type?: BuilderStructuralValidationProblemType;
}

export interface BuilderStructuralValidationResult {
    valid: boolean;
    errors: BuilderStructuralValidationError[];
}

export type BuilderStructuralValidationProblemType =
    | 'duplicateNodeId'
    | 'invalidDataBinding'
    | 'unknownDataSource'
    | 'invalidEventBinding'
    | 'unknownEventAction'
    | 'invalidPermission'
    | 'invalidVisibility'
    | 'invalidStyle'
    | 'unsafeExpression'
    | 'invalidUrl'
    | 'dangerousUrl'
    | 'forbiddenField'
    | 'sizeLimit';

export type BuilderUrlValidationKind = 'link' | 'asset' | 'dataSource';

export interface BuilderUrlValidationResult {
    valid: boolean;
    normalized?: string;
    reason?: 'empty' | 'invalid' | 'forbiddenScheme';
    message?: string;
}

export interface ValidateBuilderDocumentStructureOptions {
    supportedSchemaVersions?: readonly string[];
    maxDocumentSizeBytes?: number;
    maxTreeDepth?: number;
    maxNodeCount?: number;
    maxNodePropsSizeBytes?: number;
}

export class BuilderJsonParseError extends Error {
    override readonly cause?: unknown;

    constructor(message: string, cause?: unknown) {
        super(message);
        this.name = 'BuilderJsonParseError';
        this.cause = cause;
    }
}

export class BuilderSchemaMigrationError extends Error {

    constructor(message: string) {
        super(message);
        this.name = 'BuilderSchemaMigrationError';
    }
}

export function deserializeBuilderDocumentJson(json: string, options: DeserializeBuilderDocumentJsonOptions = {}): BuilderDocument {
    const maxDocumentSizeBytes = options.maxDocumentSizeBytes ?? Builder_DEFAULT_DOCUMENT_SIZE_LIMIT_BYTES;
    if (maxDocumentSizeBytes > 0 && utf8ByteLength(json) > maxDocumentSizeBytes) {
        const source = options.sourceName ? ` in ${options.sourceName}` : '';
        throw new BuilderJsonParseError(`Invalid Builder JSON${source}: document exceeds the maximum size of ${maxDocumentSizeBytes} bytes.`);
    }

    let value: unknown;

    try {
        value = JSON.parse(json);
    } catch (error) {
        const source = options.sourceName ? ` in ${options.sourceName}` : '';
        const reason = error instanceof Error ? ` ${error.message}` : '';
        throw new BuilderJsonParseError(`Invalid Builder JSON${source}.${reason}`, error);
    }

    assertSafeBuilderJsonValue(value, '$');

    const document = value as BuilderDocument;

    if (options.migrate === false) {
        return document;
    }

    return migrateBuilderDocument(document, {
        migrations: options.migrations,
        targetSchemaVersion: options.targetSchemaVersion
    });
}

export function serializeBuilderDocumentJson(document: BuilderDocument, options: SerializeBuilderDocumentJsonOptions = {}): string {
    assertSafeBuilderJsonValue(document, '$');

    return JSON.stringify(document, undefined, options.space ?? 2);
}

export interface ResolveBuilderDataBindingResult {
    sourceId?: string;
    sourceType?: string;
    value?: BuilderJsonValue;
    fields: Record<string, BuilderJsonValue>;
    repeatItems?: BuilderJsonValue[];
    errors: ResolveBuilderDataBindingError[];
}

export interface ResolveBuilderDataBindingError {
    path: string;
    message: string;
    nodeId?: string;
    sourceId?: string;
}

export function resolveBuilderNodeDataBinding(
    document: BuilderDocument,
    node: BuilderNode
): ResolveBuilderDataBindingResult {
    const binding = node.data;
    const result: ResolveBuilderDataBindingResult = {
        sourceId: binding?.sourceId ?? binding?.source,
        fields: {},
        errors: []
    };

    if (!binding) {
        return result;
    }

    const bindingSourceId = binding.sourceId ?? binding.source;
    const bindingSourcePath = binding.sourceId === undefined && binding.source !== undefined ? 'source' : 'sourceId';
    const sourceResolution = resolveBuilderDataSourceValue(document, bindingSourceId, `node(${node.id}).data.${bindingSourcePath}`, node.id);
    result.sourceType = sourceResolution.sourceType;
    result.errors.push(...sourceResolution.errors);

    if (sourceResolution.value !== undefined) {
        result.value = resolveBuilderDataPath(sourceResolution.value, binding.path, `node(${node.id}).data.path`, node.id, result.errors);
    }

    const fieldBaseValue = result.value ?? sourceResolution.value;
    if (binding.fields && fieldBaseValue !== undefined) {
        for (const [fieldName, fieldBinding] of Object.entries(binding.fields)) {
            const resolved = resolveBuilderDataPath(
                fieldBaseValue,
                fieldBinding.path,
                `node(${node.id}).data.fields.${fieldName}.path`,
                node.id,
                result.errors
            );
            result.fields[fieldName] = resolved === undefined ? fieldBinding.fallback ?? Builder_JSON_NULL : resolved;
        }
    }

    if (binding.repeat) {
        const repeatResolution = resolveBuilderDataSourceValue(document, binding.repeat.sourceId, `node(${node.id}).data.repeat.sourceId`, node.id);
        result.errors.push(...repeatResolution.errors);

        if (repeatResolution.value !== undefined) {
            const repeated = resolveBuilderDataPath(repeatResolution.value, binding.path, `node(${node.id}).data.path`, node.id, result.errors);
            if (Array.isArray(repeated)) {
                result.repeatItems = binding.repeat.limit === undefined ? repeated : repeated.slice(0, binding.repeat.limit);
            } else {
                result.errors.push({
                    path: `node(${node.id}).data.repeat`,
                    message: 'Builder repeat binding resolved value must be an array.',
                    nodeId: node.id,
                    sourceId: binding.repeat.sourceId
                });
            }
        }
    }

    return result;
}

export function validateBuilderDocumentStructure(
    value: unknown,
    options: ValidateBuilderDocumentStructureOptions = {}
): BuilderStructuralValidationResult {
    const errors: BuilderStructuralValidationError[] = [];
    const supportedSchemaVersions = options.supportedSchemaVersions ?? [Builder_SCHEMA_VERSION];
    const limits = createBuilderValidationLimits(options);

    if (!isPlainRecord(value)) {
        errors.push({
            path: '$',
            message: 'Builder document must be an object.'
        });
        return { valid: false, errors };
    }

    const documentSize = getJsonByteLength(value);
    if (documentSize !== undefined && limits.maxDocumentSizeBytes > 0 && documentSize > limits.maxDocumentSizeBytes) {
        pushStructuralValidationError(
            errors,
            '$',
            `Builder document exceeds the maximum size of ${limits.maxDocumentSizeBytes} bytes.`,
            undefined,
            'sizeLimit'
        );
    }

    requireString(value, 'schemaVersion', '$.schemaVersion', errors);
    if (typeof value.schemaVersion === 'string' && !supportedSchemaVersions.includes(value.schemaVersion)) {
        errors.push({
            path: '$.schemaVersion',
            message: `Unsupported Builder schemaVersion '${value.schemaVersion}'.`
        });
    }

    validateBuilderSecurityPolicy(value, '$', errors);
    validateMetadataStructure(value.metadata, '$.metadata', errors);
    validatePageStructure(value.page, '$.page', errors);
    validateThemeStructure(value.theme, '$.theme', errors);
    validateOptionalRecord(value.dataSources, '$.dataSources', errors);
    validateOptionalRecord(value.actions, '$.actions', errors);
    validateOptionalRecord(value.states, '$.states', errors);
    validateOptionalRecord(value.permissions, '$.permissions', errors);
    validateDocumentPermissionsStructure(value.permissions, '$.permissions', errors);
    validateOptionalRecord(value.aiHints, '$.aiHints', errors);
    validateNodeStructure(
        value.tree,
        '$.tree',
        errors,
        new WeakSet<object>(),
        new Map<string, string>(),
        isPlainRecord(value.actions) ? value.actions : {},
        isPlainRecord(value.dataSources) ? value.dataSources : {},
        {
            limits,
            nodeCount: 0
        },
        1
    );

    return {
        valid: errors.length === 0,
        errors
    };
}

interface BuilderValidationLimits {
    maxDocumentSizeBytes: number;
    maxTreeDepth: number;
    maxNodeCount: number;
    maxNodePropsSizeBytes: number;
}

interface BuilderNodeValidationContext {
    limits: BuilderValidationLimits;
    nodeCount: number;
}

function createBuilderValidationLimits(options: ValidateBuilderDocumentStructureOptions): BuilderValidationLimits {
    return {
        maxDocumentSizeBytes: options.maxDocumentSizeBytes ?? Builder_DEFAULT_DOCUMENT_SIZE_LIMIT_BYTES,
        maxTreeDepth: options.maxTreeDepth ?? Builder_DEFAULT_TREE_DEPTH_LIMIT,
        maxNodeCount: options.maxNodeCount ?? Builder_DEFAULT_NODE_COUNT_LIMIT,
        maxNodePropsSizeBytes: options.maxNodePropsSizeBytes ?? Builder_DEFAULT_NODE_PROPS_SIZE_LIMIT_BYTES
    };
}

function getJsonByteLength(value: unknown): number | undefined {
    if (value === undefined) {
        return undefined;
    }
    try {
        return utf8ByteLength(JSON.stringify(value));
    } catch {
        return undefined;
    }
}

function utf8ByteLength(value: string): number {
    let bytes = 0;
    for (let index = 0; index < value.length; index++) {
        const codePoint = value.charCodeAt(index);
        if (codePoint < 0x80) {
            bytes += 1;
        } else if (codePoint < 0x800) {
            bytes += 2;
        } else if (codePoint >= 0xd800 && codePoint <= 0xdbff && index + 1 < value.length) {
            const next = value.charCodeAt(index + 1);
            if (next >= 0xdc00 && next <= 0xdfff) {
                bytes += 4;
                index++;
            } else {
                bytes += 3;
            }
        } else {
            bytes += 3;
        }
    }
    return bytes;
}

export function validateBuilderUrl(value: string, kind: BuilderUrlValidationKind = 'link'): BuilderUrlValidationResult {
    const normalized = decodeBasicHtmlEntities(value).trim();
    if (normalized === '') {
        return { valid: true, normalized };
    }
    const compact = normalized.replace(/[\u0000-\u001F\u007F\s]+/g, '').toLowerCase();
    const compactForbiddenScheme = /^(javascript|vbscript):/.exec(compact);
    if (compactForbiddenScheme) {
        return {
            valid: false,
            normalized,
            reason: 'forbiddenScheme',
            message: `Builder URL scheme '${compactForbiddenScheme[1]}' is not allowed.`
        };
    }
    if (/[\u0000-\u001F\u007F\s]/.test(normalized)) {
        return {
            valid: false,
            normalized,
            reason: 'invalid',
            message: 'Builder URL is invalid: URLs must not contain whitespace or control characters.'
        };
    }

    if (/^data:/i.test(normalized)) {
        if (kind === 'asset' && /^data:image\/(?:png|jpe?g|gif|webp|avif);base64,[A-Za-z0-9+/]+={0,2}$/i.test(normalized)) {
            return { valid: true, normalized };
        }
        return {
            valid: false,
            normalized,
            reason: 'forbiddenScheme',
            message: kind === 'asset'
                ? 'Builder asset URL uses a forbidden data URL. Only base64 data URLs for png, jpeg, gif, webp, or avif images are allowed.'
                : 'Builder URL uses a forbidden data URL scheme.'
        };
    }

    const schemeMatch = /^([A-Za-z][A-Za-z0-9+.-]*):/.exec(normalized);
    if (schemeMatch && !['http', 'https', 'mailto', 'tel'].includes(schemeMatch[1].toLowerCase())) {
        return {
            valid: false,
            normalized,
            reason: 'forbiddenScheme',
            message: `Builder URL scheme '${schemeMatch[1]}' is not allowed.`
        };
    }

    if (/^(?:https?:|mailto:|tel:)/i.test(normalized)) {
        try {
            new URL(normalized);
            return { valid: true, normalized };
        } catch {
            return {
                valid: false,
                normalized,
                reason: 'invalid',
                message: 'Builder URL is invalid: absolute URLs must be parseable.'
            };
        }
    }

    if (/^(?:\/(?!\/)|#|\.\.?\/|[A-Za-z0-9._~!$&'()*+,;=@%-]+(?:\/[A-Za-z0-9._~!$&'()*+,;=:@%-]*)*)/.test(normalized)) {
        return { valid: true, normalized };
    }

    return {
        valid: false,
        normalized,
        reason: 'invalid',
        message: 'Builder URL is invalid: use an absolute URL, a relative path, or a hash link.'
    };
}

export interface BuilderSchemaMigration {
    readonly from: string;
    readonly to: string;
    readonly description?: string;
    migrate(document: BuilderDocument): BuilderDocument;
}

export interface MigrateBuilderDocumentOptions {
    targetSchemaVersion?: string;
    migrations?: readonly BuilderSchemaMigration[];
}

export const Builder_SCHEMA_MIGRATIONS: readonly BuilderSchemaMigration[] = [];

export function migrateBuilderDocument(document: BuilderDocument, options: MigrateBuilderDocumentOptions = {}): BuilderDocument {
    assertSafeBuilderJsonValue(document, '$');

    const targetSchemaVersion = options.targetSchemaVersion ?? Builder_SCHEMA_VERSION;
    const sourceSchemaVersion = document.schemaVersion;

    if (sourceSchemaVersion === targetSchemaVersion) {
        return cloneBuilderDocument(document);
    }

    if (!sourceSchemaVersion) {
        throw new BuilderSchemaMigrationError('Cannot migrate Builder document because schemaVersion is missing.');
    }

    const migrations = options.migrations ?? Builder_SCHEMA_MIGRATIONS;
    const path = resolveMigrationPath(sourceSchemaVersion, targetSchemaVersion, migrations);

    if (!path) {
        throw new BuilderSchemaMigrationError(
            `Cannot migrate Builder document from schemaVersion '${sourceSchemaVersion}' to '${targetSchemaVersion}'.`
        );
    }

    let nextDocument = cloneBuilderDocument(document);

    for (const migration of path) {
        nextDocument = migration.migrate(cloneBuilderDocument(nextDocument));
        assertSafeBuilderJsonValue(nextDocument, '$');

        if (nextDocument.schemaVersion !== migration.to) {
            throw new BuilderSchemaMigrationError(
                `Builder migration '${migration.from}' to '${migration.to}' returned schemaVersion '${nextDocument.schemaVersion}'.`
            );
        }
    }

    return nextDocument;
}

export function generateNodeId(type: string, existingTree?: BuilderNode | BuilderNode[], preferredId?: string): string {
    const base = normalizeNodeId(preferredId ?? type);
    const existingIds = collectNodeIds(existingTree);

    if (!existingIds.has(base)) {
        return base;
    }

    for (let index = 2; ; index++) {
        const candidate = `${base}-${index}`;
        if (!existingIds.has(candidate)) {
            return candidate;
        }
    }
}

export type BuilderNodePathSegment =
    | { kind: 'root' }
    | { kind: 'children'; parentId: string; index: number }
    | { kind: 'slot'; parentId: string; slotName: string; index: number }
    | { kind: 'emptyState'; parentId: string; index: number };

export interface BuilderNodeLocation {
    node: BuilderNode;
    parent?: BuilderNode;
    index?: number;
    container?: BuilderNode[];
    slotName?: string;
    path: BuilderNodePathSegment[];
}

export interface InsertBuilderNodeOptions {
    parentId: string;
    node: BuilderNode;
    index?: number;
    slotName?: string;
}

export interface UpdateBuilderNodePropsOptions {
    nodeId: string;
    props: Record<string, BuilderJsonValue>;
}

export interface UpdateBuilderNodeMetaOptions {
    nodeId: string;
    meta: BuilderNodeMeta;
}

export interface RemoveBuilderNodeOptions {
    nodeId: string;
}

export interface MoveBuilderNodeOptions {
    nodeId: string;
    parentId: string;
    index?: number;
    slotName?: string;
}

export interface DuplicateBuilderNodeOptions {
    nodeId: string;
    parentId?: string;
    index?: number;
    slotName?: string;
}

export function findNodeById(tree: BuilderNode, nodeId: string): BuilderNodeLocation | undefined {
    if (tree.id === nodeId) {
        return {
            node: tree,
            path: [{ kind: 'root' }]
        };
    }

    return findNodeByIdInContainers(tree, nodeId, [{ kind: 'root' }]);
}

export function insertNode(document: BuilderDocument, options: InsertBuilderNodeOptions): BuilderDocument {
    const existingIds = collectNodeIds(document.tree);
    const insertedIds = collectNodeIds(options.node);

    for (const insertedId of insertedIds) {
        if (existingIds.has(insertedId)) {
            throw new Error(`Cannot insert Builder node with duplicate id '${insertedId}'.`);
        }
    }

    if (insertedIds.size !== countNodes(options.node)) {
        throw new Error('Cannot insert Builder node because the inserted subtree contains duplicate ids.');
    }

    const nextTree = cloneBuilderNode(document.tree);
    const parentLocation = findNodeById(nextTree, options.parentId);

    if (!parentLocation) {
        throw new Error(`Cannot insert Builder node because parent '${options.parentId}' was not found.`);
    }

    const container = getInsertContainer(parentLocation.node, options.slotName);
    const index = options.index ?? container.length;

    if (!Number.isInteger(index) || index < 0 || index > container.length) {
        throw new RangeError(`Cannot insert Builder node at index ${options.index}; expected a position from 0 to ${container.length}.`);
    }

    container.splice(index, 0, cloneBuilderNode(options.node));

    return {
        ...document,
        tree: nextTree
    };
}

export function updateNodeProps(document: BuilderDocument, options: UpdateBuilderNodePropsOptions): BuilderDocument {
    const nextTree = cloneBuilderNode(document.tree);
    const location = findNodeById(nextTree, options.nodeId);

    if (!location) {
        throw new Error(`Cannot update Builder node props because node '${options.nodeId}' was not found.`);
    }

    location.node.props = {
        ...location.node.props,
        ...options.props
    };

    return {
        ...document,
        tree: nextTree
    };
}

export function updateNodeMeta(document: BuilderDocument, options: UpdateBuilderNodeMetaOptions): BuilderDocument {
    const nextTree = cloneBuilderNode(document.tree);
    const location = findNodeById(nextTree, options.nodeId);

    if (!location) {
        throw new Error(`Cannot update Builder node meta because node '${options.nodeId}' was not found.`);
    }

    const nextMeta: BuilderNodeMeta = {
        ...location.node.meta,
        ...options.meta
    };
    for (const [key, value] of Object.entries(nextMeta)) {
        if (value === undefined) {
            delete nextMeta[key];
        }
    }

    location.node.meta = nextMeta;

    return {
        ...document,
        tree: nextTree
    };
}

export function removeNode(document: BuilderDocument, options: RemoveBuilderNodeOptions): BuilderDocument {
    if (document.tree.id === options.nodeId) {
        throw new Error(`Cannot remove Builder root node '${options.nodeId}'.`);
    }

    const nextTree = cloneBuilderNode(document.tree);
    const location = findNodeById(nextTree, options.nodeId);

    if (!location || !location.container || location.index === undefined) {
        throw new Error(`Cannot remove Builder node because node '${options.nodeId}' was not found.`);
    }

    if (location.node.type === 'Page') {
        throw new Error(`Cannot remove Builder Page node '${options.nodeId}'.`);
    }

    location.container.splice(location.index, 1);

    return {
        ...document,
        tree: nextTree
    };
}

export function moveNode(document: BuilderDocument, options: MoveBuilderNodeOptions): BuilderDocument {
    if (document.tree.id === options.nodeId) {
        throw new Error(`Cannot move Builder root node '${options.nodeId}'.`);
    }

    if (collectNodeIds(document.tree).size !== countNodes(document.tree)) {
        throw new Error('Cannot move Builder node because the document tree contains duplicate ids.');
    }

    const nextTree = cloneBuilderNode(document.tree);
    const sourceLocation = findNodeById(nextTree, options.nodeId);

    if (!sourceLocation || !sourceLocation.container || sourceLocation.index === undefined) {
        throw new Error(`Cannot move Builder node because node '${options.nodeId}' was not found.`);
    }

    if (sourceLocation.node.type === 'Page') {
        throw new Error(`Cannot move Builder Page node '${options.nodeId}'.`);
    }

    if (findNodeById(sourceLocation.node, options.parentId)) {
        throw new Error(`Cannot move Builder node '${options.nodeId}' into itself or one of its descendants.`);
    }

    const targetParentLocation = findNodeById(nextTree, options.parentId);

    if (!targetParentLocation) {
        throw new Error(`Cannot move Builder node because parent '${options.parentId}' was not found.`);
    }

    const targetContainer = getInsertContainer(targetParentLocation.node, options.slotName);
    const sameContainer = targetContainer === sourceLocation.container;
    const insertionLimit = targetContainer.length;
    const requestedIndex = options.index ?? insertionLimit;

    if (!Number.isInteger(requestedIndex) || requestedIndex < 0 || requestedIndex > insertionLimit) {
        throw new RangeError(`Cannot move Builder node to index ${options.index}; expected a position from 0 to ${insertionLimit}.`);
    }

    const [movedNode] = sourceLocation.container.splice(sourceLocation.index, 1);
    const insertionIndex = sameContainer && requestedIndex > sourceLocation.index ? requestedIndex - 1 : requestedIndex;
    targetContainer.splice(insertionIndex, 0, movedNode);

    return {
        ...document,
        tree: nextTree
    };
}

export function duplicateNode(document: BuilderDocument, options: DuplicateBuilderNodeOptions): BuilderDocument {
    if (document.tree.id === options.nodeId) {
        throw new Error(`Cannot duplicate Builder root node '${options.nodeId}'.`);
    }

    if (collectNodeIds(document.tree).size !== countNodes(document.tree)) {
        throw new Error('Cannot duplicate Builder node because the document tree contains duplicate ids.');
    }

    const nextTree = cloneBuilderNode(document.tree);
    const sourceLocation = findNodeById(nextTree, options.nodeId);

    if (!sourceLocation || !sourceLocation.container || sourceLocation.index === undefined) {
        throw new Error(`Cannot duplicate Builder node because node '${options.nodeId}' was not found.`);
    }

    if (sourceLocation.node.type === 'Page') {
        throw new Error(`Cannot duplicate Builder Page node '${options.nodeId}'.`);
    }

    let targetContainer = sourceLocation.container;
    let insertionLimit = targetContainer.length;
    let requestedIndex = options.index ?? sourceLocation.index + 1;

    if (options.parentId !== undefined) {
        const targetParentLocation = findNodeById(nextTree, options.parentId);

        if (!targetParentLocation) {
            throw new Error(`Cannot duplicate Builder node because parent '${options.parentId}' was not found.`);
        }

        targetContainer = getInsertContainer(targetParentLocation.node, options.slotName);
        insertionLimit = targetContainer.length;
        requestedIndex = options.index ?? insertionLimit;
    }

    if (!Number.isInteger(requestedIndex) || requestedIndex < 0 || requestedIndex > insertionLimit) {
        throw new RangeError(`Cannot duplicate Builder node to index ${options.index}; expected a position from 0 to ${insertionLimit}.`);
    }

    const existingIds = collectNodeIds(nextTree);
    const duplicatedNode = duplicateBuilderNodeWithNewIds(sourceLocation.node, existingIds);
    targetContainer.splice(requestedIndex, 0, duplicatedNode);

    return {
        ...document,
        tree: nextTree
    };
}

function findNodeByIdInContainers(
    parent: BuilderNode,
    nodeId: string,
    parentPath: BuilderNodePathSegment[],
    visited: WeakSet<object> = new WeakSet<object>()
): BuilderNodeLocation | undefined {
    if (visited.has(parent)) {
        throw new Error(`Cannot traverse Builder tree because node '${parent.id}' creates a cycle.`);
    }
    visited.add(parent);

    const childMatch = findNodeByIdInContainer(parent.children, nodeId, parent, parentPath, segment => ({
        kind: 'children',
        parentId: parent.id,
        index: segment.index
    }), visited);

    if (childMatch) {
        return childMatch;
    }

    if (parent.slots) {
        for (const [slotName, slotNodes] of Object.entries(parent.slots)) {
            const slotMatch = findNodeByIdInContainer(slotNodes, nodeId, parent, parentPath, segment => ({
                kind: 'slot',
                parentId: parent.id,
                slotName,
                index: segment.index
            }), visited);

            if (slotMatch) {
                return slotMatch;
            }
        }
    }

    const emptyStateMatch = findNodeByIdInContainer(parent.data?.emptyState, nodeId, parent, parentPath, segment => ({
        kind: 'emptyState',
        parentId: parent.id,
        index: segment.index
    }), visited);

    if (emptyStateMatch) {
        return emptyStateMatch;
    }

    return undefined;
}

function findNodeByIdInContainer(
    container: BuilderNode[] | undefined,
    nodeId: string,
    parent: BuilderNode,
    parentPath: BuilderNodePathSegment[],
    createPathSegment: (segment: { index: number }) => BuilderNodePathSegment,
    visited: WeakSet<object>
): BuilderNodeLocation | undefined {
    if (!container) {
        return undefined;
    }

    for (let index = 0; index < container.length; index++) {
        const node = container[index];
        const path = [...parentPath, createPathSegment({ index })];

        if (node.id === nodeId) {
            const lastPathSegment = path[path.length - 1];
            return {
                node,
                parent,
                index,
                container,
                slotName: lastPathSegment.kind === 'slot' ? lastPathSegment.slotName : undefined,
                path
            };
        }

        const nestedMatch = findNodeByIdInContainers(node, nodeId, path, visited);

        if (nestedMatch) {
            return nestedMatch;
        }
    }

    return undefined;
}

function getInsertContainer(parent: BuilderNode, slotName: string | undefined): BuilderNode[] {
    if (!slotName) {
        parent.children ??= [];
        return parent.children;
    }

    parent.slots ??= {};
    parent.slots[slotName] ??= [];
    return parent.slots[slotName];
}

function cloneBuilderNode(node: BuilderNode, visited: WeakSet<object> = new WeakSet<object>()): BuilderNode {
    if (visited.has(node)) {
        throw new Error(`Cannot clone Builder tree because node '${node.id}' creates a cycle.`);
    }
    visited.add(node);

    const clone: BuilderNode = {
        ...node,
    };

    if (node.props) {
        clone.props = { ...node.props };
    }
    if (node.children) {
        clone.children = node.children.map(child => cloneBuilderNode(child, visited));
    }
    if (node.slots) {
        clone.slots = Object.fromEntries(
            Object.entries(node.slots).map(([slotName, slotNodes]) => [slotName, slotNodes.map(slotNode => cloneBuilderNode(slotNode, visited))])
        );
    }
    if (node.data) {
        clone.data = {
            ...node.data,
            fields: node.data.fields ? { ...node.data.fields } : undefined,
            repeat: node.data.repeat ? { ...node.data.repeat } : undefined,
            emptyState: node.data.emptyState?.map(emptyStateNode => cloneBuilderNode(emptyStateNode, visited))
        };
    }
    if (node.events) {
        clone.events = { ...node.events };
    }
    if (node.visibility) {
        clone.visibility = { ...node.visibility };
    }
    if (node.permissions) {
        clone.permissions = node.permissions.map(permission => ({ ...permission }));
    }
    if (node.style) {
        clone.style = { ...node.style };
    }
    if (node.meta) {
        clone.meta = { ...node.meta };
    }

    return clone;
}

function duplicateBuilderNodeWithNewIds(node: BuilderNode, existingIds: Set<string>): BuilderNode {
    const clone = cloneBuilderNode(node);

    reassignBuilderNodeIds(clone, existingIds);

    return clone;
}

function reassignBuilderNodeIds(node: BuilderNode, existingIds: Set<string>): void {
    node.id = generateNodeId(node.type, Array.from(existingIds).map(id => ({ id, type: 'Box' })), `${node.id}-copy`);
    existingIds.add(node.id);

    for (const child of node.children ?? []) {
        reassignBuilderNodeIds(child, existingIds);
    }

    if (node.slots) {
        for (const slotNodes of Object.values(node.slots)) {
            for (const slotNode of slotNodes) {
                reassignBuilderNodeIds(slotNode, existingIds);
            }
        }
    }

    for (const emptyStateNode of node.data?.emptyState ?? []) {
        reassignBuilderNodeIds(emptyStateNode, existingIds);
    }
}

function cloneBuilderDocument(document: BuilderDocument): BuilderDocument {
    return cloneSafeBuilderValue(document, '$') as BuilderDocument;
}

function cloneSafeBuilderValue(value: unknown, path: string, visited: WeakSet<object> = new WeakSet<object>()): unknown {
    if (value === undefined || value === Builder_JSON_NULL || typeof value !== 'object') {
        return value;
    }

    if (visited.has(value)) {
        throw new BuilderJsonParseError(`Invalid Builder JSON value at ${path}: circular references are not allowed.`);
    }
    visited.add(value);

    if (Array.isArray(value)) {
        return value.map((item, index) => cloneSafeBuilderValue(item, `${path}[${index}]`, visited));
    }

    return Object.fromEntries(
        Object.entries(value).map(([key, child]) => [key, cloneSafeBuilderValue(child, `${path}.${key}`, visited)])
    );
}

function resolveMigrationPath(
    sourceSchemaVersion: string,
    targetSchemaVersion: string,
    migrations: readonly BuilderSchemaMigration[]
): BuilderSchemaMigration[] | undefined {
    const pending: Array<{ version: string; path: BuilderSchemaMigration[] }> = [
        { version: sourceSchemaVersion, path: [] }
    ];
    const visited = new Set<string>([sourceSchemaVersion]);

    while (pending.length > 0) {
        const current = pending.shift()!;

        for (const migration of migrations) {
            if (migration.from !== current.version || visited.has(migration.to)) {
                continue;
            }

            const path = [...current.path, migration];

            if (migration.to === targetSchemaVersion) {
                return path;
            }

            visited.add(migration.to);
            pending.push({
                version: migration.to,
                path
            });
        }
    }

    return undefined;
}

function normalizeNodeId(value: string): string {
    const normalized = value
        .trim()
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase();

    return normalized || 'node';
}

function validateMetadataStructure(value: unknown, path: string, errors: BuilderStructuralValidationError[]): void {
    if (!isPlainRecord(value)) {
        errors.push({
            path,
            message: 'Builder metadata must be an object.'
        });
        return;
    }

    requireString(value, 'id', `${path}.id`, errors);
    requireString(value, 'name', `${path}.name`, errors);
    optionalString(value, 'description', `${path}.description`, errors);
    optionalString(value, 'version', `${path}.version`, errors);
    optionalString(value, 'createdBy', `${path}.createdBy`, errors);
    optionalString(value, 'createdAt', `${path}.createdAt`, errors);
    optionalString(value, 'updatedAt', `${path}.updatedAt`, errors);
    optionalString(value, 'locale', `${path}.locale`, errors);
    optionalStringArray(value, 'tags', `${path}.tags`, errors);
}

function validatePageStructure(value: unknown, path: string, errors: BuilderStructuralValidationError[]): void {
    if (!isPlainRecord(value)) {
        errors.push({
            path,
            message: 'Builder page must be an object.'
        });
        return;
    }

    requireString(value, 'id', `${path}.id`, errors);
    requireString(value, 'title', `${path}.title`, errors);
    optionalString(value, 'route', `${path}.route`, errors);
    optionalString(value, 'layout', `${path}.layout`, errors);
    optionalString(value, 'description', `${path}.description`, errors);
}

function validateThemeStructure(value: unknown, path: string, errors: BuilderStructuralValidationError[]): void {
    if (value === undefined) {
        return;
    }
    if (!isPlainRecord(value)) {
        pushStructuralValidationError(errors, path, 'Builder theme must be an object when present.');
        return;
    }

    if (value.mode !== undefined && value.mode !== 'light' && value.mode !== 'dark' && value.mode !== 'auto') {
        pushStructuralValidationError(errors, `${path}.mode`, "Builder theme field 'mode' must be 'light', 'dark', or 'auto' when present.");
    }
    optionalString(value, 'primaryColor', `${path}.primaryColor`, errors);
    optionalString(value, 'radius', `${path}.radius`, errors);
    optionalString(value, 'fontFamily', `${path}.fontFamily`, errors);
    validateThemeSpacingStructure(value.spacing, `${path}.spacing`, errors);
    validateOptionalRecord(value.tokens, `${path}.tokens`, errors);
}

function validateThemeSpacingStructure(value: unknown, path: string, errors: BuilderStructuralValidationError[]): void {
    if (value === undefined) {
        return;
    }
    if (!isPlainRecord(value)) {
        pushStructuralValidationError(errors, path, "Builder theme field 'spacing' must be an object when present.");
        return;
    }

    Object.entries(value).forEach(([key, spacingValue]) => {
        if (typeof spacingValue !== 'string' && typeof spacingValue !== 'number') {
            pushStructuralValidationError(errors, `${path}.${key}`, 'Builder theme spacing values must be strings or numbers.');
        }
    });
}

function validateNodeStructure(
    value: unknown,
    path: string,
    errors: BuilderStructuralValidationError[],
    visited: WeakSet<object>,
    nodeIdPaths: Map<string, string>,
    actions: Record<string, unknown>,
    dataSources: Record<string, unknown>,
    context: BuilderNodeValidationContext,
    depth: number
): void {
    if (!isPlainRecord(value)) {
        errors.push({
            path,
            message: 'Builder node must be an object.'
        });
        return;
    }

    if (visited.has(value)) {
        pushStructuralValidationError(
            errors,
            path,
            'Builder node tree must not contain circular references.',
            typeof value.id === 'string' ? value.id : undefined
        );
        return;
    }
    visited.add(value);

    const nodeId = typeof value.id === 'string' ? value.id : undefined;
    context.nodeCount++;
    let exceededSizeLimit = false;
    if (context.limits.maxNodeCount > 0 && context.nodeCount > context.limits.maxNodeCount) {
        pushStructuralValidationError(errors, path, `Builder tree exceeds the maximum of ${context.limits.maxNodeCount} nodes.`, nodeId, 'sizeLimit');
        exceededSizeLimit = true;
    }
    if (context.limits.maxTreeDepth > 0 && depth > context.limits.maxTreeDepth) {
        pushStructuralValidationError(errors, path, `Builder tree exceeds the maximum depth of ${context.limits.maxTreeDepth}.`, nodeId, 'sizeLimit');
        exceededSizeLimit = true;
    }

    requireString(value, 'id', `${path}.id`, errors, nodeId);
    requireString(value, 'type', `${path}.type`, errors, nodeId);

    if (nodeId) {
        const firstPath = nodeIdPaths.get(nodeId);
        if (firstPath) {
            pushStructuralValidationError(
                errors,
                `${path}.id`,
                `Duplicate Builder node id '${nodeId}' already exists at ${firstPath}.`,
                nodeId,
                'duplicateNodeId'
            );
        } else {
            nodeIdPaths.set(nodeId, `${path}.id`);
        }
    }

    validateOptionalRecord(value.props, `${path}.props`, errors, nodeId);
    const propsSize = getJsonByteLength(value.props);
    if (propsSize !== undefined && context.limits.maxNodePropsSizeBytes > 0 && propsSize > context.limits.maxNodePropsSizeBytes) {
        pushStructuralValidationError(errors, `${path}.props`, `Builder node props exceed the maximum size of ${context.limits.maxNodePropsSizeBytes} bytes.`, nodeId, 'sizeLimit');
    }
    validateNodeEventsStructure(value.events, `${path}.events`, errors, nodeId, actions);
    validateVisibilityStructure(value.visibility, `${path}.visibility`, errors, nodeId);
    validateStyleStructure(value.style, `${path}.style`, errors, nodeId);
    validateOptionalRecord(value.meta, `${path}.meta`, errors, nodeId);

    if (exceededSizeLimit) {
        return;
    }

    validateOptionalNodeArray(value.children, `${path}.children`, errors, visited, nodeId, nodeIdPaths, actions, dataSources, context, depth + 1);

    if (value.slots !== undefined) {
        if (!isPlainRecord(value.slots)) {
            pushStructuralValidationError(errors, `${path}.slots`, 'Builder node slots must be an object.', nodeId);
        } else {
            for (const [slotName, slotNodes] of Object.entries(value.slots)) {
                validateOptionalNodeArray(slotNodes, `${path}.slots.${slotName}`, errors, visited, nodeId, nodeIdPaths, actions, dataSources, context, depth + 1);
            }
        }
    }

    if (value.permissions !== undefined) {
        if (!Array.isArray(value.permissions)) {
            pushStructuralValidationError(errors, `${path}.permissions`, 'Builder node permissions must be an array.', nodeId);
        } else {
            value.permissions.forEach((permission, index) => validatePermissionRuleStructure(
                permission,
                `${path}.permissions[${index}]`,
                errors,
                nodeId
            ));
        }
    }

    if (value.data !== undefined) {
        if (!isPlainRecord(value.data)) {
            pushStructuralValidationError(errors, `${path}.data`, 'Builder node data must be an object.', nodeId);
        } else {
            validateNodeDataBindingStructure(value.data, `${path}.data`, errors, nodeId, dataSources);
            validateOptionalNodeArray(value.data.emptyState, `${path}.data.emptyState`, errors, visited, nodeId, nodeIdPaths, actions, dataSources, context, depth + 1);
        }
    }
}

function validateDocumentPermissionsStructure(
    value: unknown,
    path: string,
    errors: BuilderStructuralValidationError[]
): void {
    if (value === undefined || !isPlainRecord(value)) {
        return;
    }

    for (const [permissionId, permission] of Object.entries(value)) {
        validatePermissionRuleStructure(permission, `${path}.${permissionId}`, errors, undefined);
    }
}

function validatePermissionRuleStructure(
    value: unknown,
    path: string,
    errors: BuilderStructuralValidationError[],
    nodeId: string | undefined
): void {
    if (!isPlainRecord(value)) {
        pushStructuralValidationError(errors, path, 'Builder permission rule must be an object.', nodeId, 'invalidPermission');
        return;
    }

    validateNoForbiddenOrUnsafeFields(value, path, errors, nodeId);
    optionalString(value, 'id', `${path}.id`, errors, nodeId);
    optionalString(value, 'reason', `${path}.reason`, errors, nodeId);
    optionalStringArrayForNode(value, 'roles', `${path}.roles`, errors, nodeId);
    optionalStringArrayForNode(value, 'permissions', `${path}.permissions`, errors, nodeId);

    if (value.effect !== undefined && value.effect !== 'allow' && value.effect !== 'deny') {
        pushStructuralValidationError(errors, `${path}.effect`, "Builder permission effect must be 'allow' or 'deny'.", nodeId, 'invalidPermission');
    }

    if (value.condition !== undefined) {
        validateConditionStructure(value.condition, `${path}.condition`, errors, nodeId);
    }
}

function validateVisibilityStructure(
    value: unknown,
    path: string,
    errors: BuilderStructuralValidationError[],
    nodeId: string | undefined
): void {
    if (value === undefined) {
        return;
    }
    if (!isPlainRecord(value)) {
        pushStructuralValidationError(errors, path, 'Builder visibility rule must be an object.', nodeId, 'invalidVisibility');
        return;
    }

    validateNoForbiddenOrUnsafeFields(value, path, errors, nodeId);
    optionalString(value, 'stateId', `${path}.stateId`, errors, nodeId);
    if (typeof value.stateId === 'string' && !isSafeIdentifier(value.stateId)) {
        pushStructuralValidationError(errors, `${path}.stateId`, 'Builder visibility stateId must be a safe identifier.', nodeId, 'invalidVisibility');
    }
    if (value.condition !== undefined) {
        validateConditionStructure(value.condition, `${path}.condition`, errors, nodeId);
    }
}

function validateConditionStructure(
    value: unknown,
    path: string,
    errors: BuilderStructuralValidationError[],
    nodeId: string | undefined
): void {
    if (!isPlainRecord(value)) {
        pushStructuralValidationError(errors, path, 'Builder condition must be an object.', nodeId, 'invalidVisibility');
        return;
    }

    validateNoForbiddenOrUnsafeFields(value, path, errors, nodeId);
    if (value.source !== undefined && value.source !== 'state' && value.source !== 'data' && value.source !== 'permission' && value.source !== 'context') {
        pushStructuralValidationError(errors, `${path}.source`, 'Builder condition source is not supported.', nodeId, 'invalidVisibility');
    }
    optionalString(value, 'ref', `${path}.ref`, errors, nodeId);
    optionalString(value, 'path', `${path}.path`, errors, nodeId);
    validateDataBindingPath(value.path, `${path}.path`, errors, nodeId);
    if (value.operator !== undefined && !isKnownConditionOperator(value.operator)) {
        pushStructuralValidationError(errors, `${path}.operator`, 'Builder condition operator is not supported.', nodeId, 'invalidVisibility');
    }

    validateConditionArray(value.all, `${path}.all`, errors, nodeId);
    validateConditionArray(value.any, `${path}.any`, errors, nodeId);
    if (value.not !== undefined) {
        validateConditionStructure(value.not, `${path}.not`, errors, nodeId);
    }
}

function validateConditionArray(
    value: unknown,
    path: string,
    errors: BuilderStructuralValidationError[],
    nodeId: string | undefined
): void {
    if (value === undefined) {
        return;
    }
    if (!Array.isArray(value)) {
        pushStructuralValidationError(errors, path, 'Builder condition collection must be an array.', nodeId, 'invalidVisibility');
        return;
    }
    value.forEach((condition, index) => validateConditionStructure(condition, `${path}[${index}]`, errors, nodeId));
}

function validateStyleStructure(
    value: unknown,
    path: string,
    errors: BuilderStructuralValidationError[],
    nodeId: string | undefined
): void {
    if (value === undefined) {
        return;
    }
    if (!isPlainRecord(value)) {
        pushStructuralValidationError(errors, path, 'Builder style must be an object.', nodeId, 'invalidStyle');
        return;
    }

    validateNoForbiddenOrUnsafeFields(value, path, errors, nodeId);
    optionalString(value, 'className', `${path}.className`, errors, nodeId);
    if (typeof value.className === 'string' && !isSafeClassNameList(value.className)) {
        pushStructuralValidationError(errors, `${path}.className`, 'Builder style className must contain safe CSS class names only.', nodeId, 'invalidStyle');
    }

    if (value.css !== undefined) {
        validateCssDeclarationRecord(value.css, `${path}.css`, errors, nodeId);
    }

    if (value.responsive !== undefined) {
        if (!isPlainRecord(value.responsive)) {
            pushStructuralValidationError(errors, `${path}.responsive`, 'Builder responsive style must be an object.', nodeId, 'invalidStyle');
        } else {
            for (const [breakpoint, style] of Object.entries(value.responsive)) {
                if (!isSafeIdentifier(breakpoint)) {
                    pushStructuralValidationError(errors, `${path}.responsive.${breakpoint}`, 'Builder responsive breakpoint must be a safe identifier.', nodeId, 'invalidStyle');
                }
                validateStyleStructure(style, `${path}.responsive.${breakpoint}`, errors, nodeId);
            }
        }
    }
}

function validateCssDeclarationRecord(
    value: unknown,
    path: string,
    errors: BuilderStructuralValidationError[],
    nodeId: string | undefined
): void {
    if (!isPlainRecord(value)) {
        pushStructuralValidationError(errors, path, 'Builder style css must be an object.', nodeId, 'invalidStyle');
        return;
    }

    for (const [property, cssValue] of Object.entries(value)) {
        if (!isSafeCssProperty(property)) {
            pushStructuralValidationError(errors, `${path}.${property}`, `Builder style css property '${property}' is not allowed.`, nodeId, 'invalidStyle');
        }
        if (typeof cssValue === 'number') {
            if (!Number.isFinite(cssValue)) {
                pushStructuralValidationError(errors, `${path}.${property}`, 'Builder style css numeric values must be finite.', nodeId, 'invalidStyle');
            }
        } else if (typeof cssValue === 'string') {
            if (isUnsafeExpressionString(cssValue) || isUnsafeCssValue(cssValue)) {
                pushStructuralValidationError(errors, `${path}.${property}`, `Builder style css value for '${property}' is unsafe.`, nodeId, 'unsafeExpression');
            }
        } else {
            pushStructuralValidationError(errors, `${path}.${property}`, 'Builder style css values must be strings or numbers.', nodeId, 'invalidStyle');
        }
    }
}

function validateNodeDataBindingStructure(
    value: Record<string, unknown>,
    path: string,
    errors: BuilderStructuralValidationError[],
    nodeId: string | undefined,
    dataSources: Record<string, unknown>
): void {
    validateDataSourceReference(value, 'sourceId', `${path}.sourceId`, errors, nodeId, dataSources);
    validateDataSourceReference(value, 'source', `${path}.source`, errors, nodeId, dataSources);
    validateDataBindingPath(value.path, `${path}.path`, errors, nodeId);

    if (value.fields !== undefined) {
        if (!isPlainRecord(value.fields)) {
            pushStructuralValidationError(errors, `${path}.fields`, 'Builder field must be an object when present.', nodeId);
        } else {
            for (const [fieldName, fieldBinding] of Object.entries(value.fields)) {
                const fieldPath = `${path}.fields.${fieldName}`;

                if (!isPlainRecord(fieldBinding)) {
                    pushStructuralValidationError(errors, fieldPath, 'Builder data field binding must be an object.', nodeId, 'invalidDataBinding');
                    continue;
                }

                requireString(fieldBinding, 'path', `${fieldPath}.path`, errors, nodeId);
                validateDataBindingPath(fieldBinding.path, `${fieldPath}.path`, errors, nodeId);
                optionalString(fieldBinding, 'format', `${fieldPath}.format`, errors, nodeId);
            }
        }
    }

    if (value.repeat !== undefined) {
        if (!isPlainRecord(value.repeat)) {
            pushStructuralValidationError(errors, `${path}.repeat`, 'Builder repeat binding must be an object.', nodeId, 'invalidDataBinding');
        } else {
            validateDataSourceReference(value.repeat, 'sourceId', `${path}.repeat.sourceId`, errors, nodeId, dataSources, true);
            optionalString(value.repeat, 'itemName', `${path}.repeat.itemName`, errors, nodeId);
            if (typeof value.repeat.itemName === 'string' && !isSafeIdentifier(value.repeat.itemName)) {
                pushStructuralValidationError(errors, `${path}.repeat.itemName`, 'Builder repeat itemName must be a safe identifier.', nodeId, 'invalidDataBinding');
            }
            optionalString(value.repeat, 'keyPath', `${path}.repeat.keyPath`, errors, nodeId);
            validateDataBindingPath(value.repeat.keyPath, `${path}.repeat.keyPath`, errors, nodeId);
            const repeatLimit = value.repeat.limit;
            if (repeatLimit !== undefined && (typeof repeatLimit !== 'number' || !Number.isInteger(repeatLimit) || repeatLimit < 0)) {
                pushStructuralValidationError(errors, `${path}.repeat.limit`, 'Builder repeat limit must be a non-negative integer when present.', nodeId, 'invalidDataBinding');
            }
        }
    }
}

function validateNodeEventsStructure(
    value: unknown,
    path: string,
    errors: BuilderStructuralValidationError[],
    nodeId: string | undefined,
    actions: Record<string, unknown>
): void {
    if (value === undefined) {
        return;
    }
    if (!isPlainRecord(value)) {
        pushStructuralValidationError(errors, path, 'Builder field must be an object when present.', nodeId);
        return;
    }

    for (const [eventName, binding] of Object.entries(value)) {
        const eventPath = `${path}.${eventName}`;

        if (!isPlainRecord(binding)) {
            pushStructuralValidationError(
                errors,
                eventPath,
                `Builder event '${eventName}' must be an object action binding; JavaScript handler strings are not allowed.`,
                nodeId,
                'invalidEventBinding'
            );
            continue;
        }

        if (typeof binding.handler === 'string') {
            pushStructuralValidationError(
                errors,
                `${eventPath}.handler`,
                `Builder event '${eventName}' must not contain JavaScript handler strings; use actionId instead.`,
                nodeId,
                'invalidEventBinding'
            );
        }

        requireString(binding, 'actionId', `${eventPath}.actionId`, errors, nodeId);

        if (typeof binding.actionId === 'string' && binding.actionId !== '' && actions[binding.actionId] === undefined) {
            pushStructuralValidationError(
                errors,
                `${eventPath}.actionId`,
                `Builder event '${eventName}' references unknown action '${binding.actionId}'.`,
                nodeId,
                'unknownEventAction'
            );
        }

        validateOptionalRecord(binding.params, `${eventPath}.params`, errors, nodeId);
        optionalBoolean(binding, 'preventDefault', `${eventPath}.preventDefault`, errors, nodeId);
        optionalBoolean(binding, 'stopPropagation', `${eventPath}.stopPropagation`, errors, nodeId);
    }
}

function validateDataSourceReference(
    value: Record<string, unknown>,
    key: string,
    path: string,
    errors: BuilderStructuralValidationError[],
    nodeId: string | undefined,
    dataSources: Record<string, unknown>,
    required = false
): void {
    if (required) {
        requireString(value, key, path, errors, nodeId);
    } else {
        optionalString(value, key, path, errors, nodeId);
    }

    if (typeof value[key] === 'string' && value[key] !== '' && dataSources[value[key] as string] === undefined) {
        pushStructuralValidationError(
            errors,
            path,
            `Builder data binding references unknown dataSource '${value[key]}'.`,
            nodeId,
            'unknownDataSource'
        );
    }
}

function validateDataBindingPath(
    value: unknown,
    path: string,
    errors: BuilderStructuralValidationError[],
    nodeId: string | undefined
): void {
    if (value === undefined) {
        return;
    }
    if (typeof value !== 'string') {
        pushStructuralValidationError(errors, path, 'Builder data binding path must be a string when present.', nodeId, 'invalidDataBinding');
        return;
    }
    if (value !== '' && !isSafeDataBindingPath(value)) {
        pushStructuralValidationError(
            errors,
            path,
            `Builder data binding path '${value}' must use safe dot or numeric bracket notation.`,
            nodeId,
            'invalidDataBinding'
        );
    }
}

function resolveBuilderDataSourceValue(
    document: BuilderDocument,
    sourceId: string | undefined,
    path: string,
    nodeId: string | undefined
): { sourceType?: string; value?: BuilderJsonValue; errors: ResolveBuilderDataBindingError[] } {
    const errors: ResolveBuilderDataBindingError[] = [];

    if (!sourceId) {
        return { errors };
    }

    const dataSource = document.dataSources?.[sourceId];
    if (!dataSource) {
        errors.push({
            path,
            message: `Builder data binding references unknown dataSource '${sourceId}'.`,
            nodeId,
            sourceId
        });
        return { errors };
    }

    if (dataSource.type !== 'static' && dataSource.type !== 'mock') {
        errors.push({
            path,
            message: `Builder data binding can resolve only static or mock dataSources in the MVP, received '${dataSource.type}'.`,
            nodeId,
            sourceId
        });
        return { sourceType: dataSource.type, errors };
    }

    return {
        sourceType: dataSource.type,
        value: dataSource.config?.data,
        errors
    };
}

function resolveBuilderDataPath(
    value: BuilderJsonValue,
    path: string | undefined,
    errorPath: string,
    nodeId: string | undefined,
    errors: ResolveBuilderDataBindingError[]
): BuilderJsonValue | undefined {
    if (path === undefined || path === '' || path === '$') {
        return value;
    }

    if (!isSafeDataBindingPath(path)) {
        errors.push({
            path: errorPath,
            message: `Builder data binding path '${path}' must use safe dot or numeric bracket notation.`,
            nodeId
        });
        return undefined;
    }

    let current: BuilderJsonValue | undefined = value;
    for (const segment of parseBuilderDataPath(path)) {
        if (current === undefined || current === Builder_JSON_NULL) {
            return undefined;
        }
        if (typeof segment === 'number') {
            current = Array.isArray(current) ? current[segment] : undefined;
        } else if (isPlainRecord(current)) {
            current = current[segment] as BuilderJsonValue | undefined;
        } else {
            current = undefined;
        }
    }
    return current;
}

function parseBuilderDataPath(path: string): Array<string | number> {
    const normalizedPath = path.startsWith('$.') ? path.slice(2) : path === '$' ? '' : path;
    const segments: Array<string | number> = [];
    const matcher = /([A-Za-z_$][A-Za-z0-9_$]*)|\[(0|[1-9][0-9]*)\]/g;
    let match: RegExpExecArray | undefined;

    while ((match = matcher.exec(normalizedPath) ?? undefined) !== undefined) {
        segments.push(match[1] ?? Number(match[2]));
    }

    return segments;
}

function isSafeDataBindingPath(value: string): boolean {
    if (value.length > 256 || /[(){};=<>`"'\\]/.test(value)) {
        return false;
    }

    return /^(?:\$|[A-Za-z_$][A-Za-z0-9_$]*)(?:(?:\.[A-Za-z_$][A-Za-z0-9_$]*)|(?:\[(?:0|[1-9][0-9]*)\]))*$/.test(value);
}

function isSafeIdentifier(value: string): boolean {
    return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(value);
}

function validateOptionalNodeArray(
    value: unknown,
    path: string,
    errors: BuilderStructuralValidationError[],
    visited: WeakSet<object>,
    nodeId: string | undefined,
    nodeIdPaths: Map<string, string>,
    actions: Record<string, unknown>,
    dataSources: Record<string, unknown>,
    context: BuilderNodeValidationContext,
    depth: number
): void {
    if (value === undefined) {
        return;
    }
    if (!Array.isArray(value)) {
        pushStructuralValidationError(errors, path, 'Builder node collection must be an array.', nodeId);
        return;
    }

    value.forEach((child, index) => validateNodeStructure(child, `${path}[${index}]`, errors, visited, nodeIdPaths, actions, dataSources, context, depth));
}

function requireString(
    value: Record<string, unknown>,
    key: string,
    path: string,
    errors: BuilderStructuralValidationError[],
    nodeId?: string
): void {
    if (typeof value[key] !== 'string' || value[key] === '') {
        pushStructuralValidationError(errors, path, `Required Builder field '${key}' must be a non-empty string.`, nodeId);
    }
}

function optionalString(
    value: Record<string, unknown>,
    key: string,
    path: string,
    errors: BuilderStructuralValidationError[],
    nodeId?: string
): void {
    if (value[key] !== undefined && typeof value[key] !== 'string') {
        pushStructuralValidationError(errors, path, `Builder field '${key}' must be a string when present.`, nodeId);
    }
}

function optionalBoolean(
    value: Record<string, unknown>,
    key: string,
    path: string,
    errors: BuilderStructuralValidationError[],
    nodeId?: string
): void {
    if (value[key] !== undefined && typeof value[key] !== 'boolean') {
        pushStructuralValidationError(errors, path, `Builder field '${key}' must be a boolean when present.`, nodeId);
    }
}

function optionalStringArray(
    value: Record<string, unknown>,
    key: string,
    path: string,
    errors: BuilderStructuralValidationError[]
): void {
    if (value[key] === undefined) {
        return;
    }
    if (!Array.isArray(value[key])) {
        errors.push({
            path,
            message: `Builder field '${key}' must be an array of strings when present.`
        });
        return;
    }
    (value[key] as unknown[]).forEach((item, index) => {
        if (typeof item !== 'string') {
            errors.push({
                path: `${path}[${index}]`,
                message: `Builder field '${key}' must contain only strings.`
            });
        }
    });
}

function optionalStringArrayForNode(
    value: Record<string, unknown>,
    key: string,
    path: string,
    errors: BuilderStructuralValidationError[],
    nodeId?: string
): void {
    if (value[key] === undefined) {
        return;
    }
    if (!Array.isArray(value[key])) {
        pushStructuralValidationError(errors, path, `Builder field '${key}' must be an array of strings when present.`, nodeId, 'invalidPermission');
        return;
    }
    (value[key] as unknown[]).forEach((item, index) => {
        if (typeof item !== 'string' || item === '') {
            pushStructuralValidationError(errors, `${path}[${index}]`, `Builder field '${key}' must contain only non-empty strings.`, nodeId, 'invalidPermission');
        } else if (isUnsafeExpressionString(item)) {
            pushStructuralValidationError(errors, `${path}[${index}]`, `Builder field '${key}' contains an unsafe expression string.`, nodeId, 'unsafeExpression');
        }
    });
}

function validateOptionalRecord(
    value: unknown,
    path: string,
    errors: BuilderStructuralValidationError[],
    nodeId?: string
): void {
    if (value !== undefined && !isPlainRecord(value)) {
        pushStructuralValidationError(errors, path, 'Builder field must be an object when present.', nodeId);
    }
}

function pushStructuralValidationError(
    errors: BuilderStructuralValidationError[],
    path: string,
    message: string,
    nodeId?: string,
    type?: BuilderStructuralValidationProblemType
): void {
    const error: BuilderStructuralValidationError = { path, message };
    if (nodeId) {
        error.nodeId = nodeId;
    }
    if (type) {
        error.type = type;
    }
    errors.push(error);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
    return value !== undefined && value !== Builder_JSON_NULL && typeof value === 'object' && !Array.isArray(value);
}

function collectNodeIds(existingTree?: BuilderNode | BuilderNode[]): Set<string> {
    const ids = new Set<string>();
    const pending = Array.isArray(existingTree) ? [...existingTree] : existingTree ? [existingTree] : [];
    const visited = new WeakSet<object>();

    while (pending.length > 0) {
        const node = pending.pop()!;
        if (visited.has(node)) {
            throw new Error(`Cannot collect Builder node ids because node '${node.id}' creates a cycle.`);
        }
        visited.add(node);
        ids.add(node.id);

        if (node.children) {
            pending.push(...node.children);
        }

        if (node.slots) {
            for (const slotNodes of Object.values(node.slots)) {
                pending.push(...slotNodes);
            }
        }

        if (node.data?.emptyState) {
            pending.push(...node.data.emptyState);
        }
    }

    return ids;
}

function countNodes(tree: BuilderNode): number {
    let count = 0;
    const pending = [tree];
    const visited = new WeakSet<object>();

    while (pending.length > 0) {
        const node = pending.pop()!;
        if (visited.has(node)) {
            throw new Error(`Cannot count Builder nodes because node '${node.id}' creates a cycle.`);
        }
        visited.add(node);
        count++;

        if (node.children) {
            pending.push(...node.children);
        }

        if (node.slots) {
            for (const slotNodes of Object.values(node.slots)) {
                pending.push(...slotNodes);
            }
        }

        if (node.data?.emptyState) {
            pending.push(...node.data.emptyState);
        }
    }

    return count;
}

function assertSafeBuilderJsonValue(value: unknown, path: string, visited: WeakSet<object> = new WeakSet<object>()): asserts value is BuilderJsonValue {
    if (value === undefined || value === Builder_JSON_NULL || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        if (typeof value === 'number' && !Number.isFinite(value)) {
            throw new BuilderJsonParseError(`Invalid Builder JSON value at ${path}: numbers must be finite.`);
        }
        return;
    }

    if (visited.has(value)) {
        throw new BuilderJsonParseError(`Invalid Builder JSON value at ${path}: circular references are not allowed.`);
    }
    visited.add(value);

    if (Array.isArray(value)) {
        value.forEach((item, index) => assertSafeBuilderJsonValue(item, `${path}[${index}]`, visited));
        return;
    }

    if (typeof value === 'object') {
        for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
            if (isUnsafeJsonKey(key)) {
                throw new BuilderJsonParseError(`Invalid Builder JSON field at ${path}.${key}: '${key}' is not allowed.`);
            }
            assertSafeBuilderJsonValue(child, `${path}.${key}`, visited);
        }
        return;
    }

    throw new BuilderJsonParseError(`Invalid Builder JSON value at ${path}: unsupported ${typeof value} value.`);
}

function isUnsafeJsonKey(key: string): boolean {
    return key === '__proto__' || key === 'prototype' || key === 'constructor';
}

function validateBuilderSecurityPolicy(
    value: unknown,
    path: string,
    errors: BuilderStructuralValidationError[],
    nodeId?: string,
    visited: WeakSet<object> = new WeakSet<object>()
): void {
    if (value === undefined || value === Builder_JSON_NULL || typeof value === 'number' || typeof value === 'boolean') {
        return;
    }

    if (typeof value === 'string') {
        const urlFieldKind = getBuilderUrlFieldKind(path);
        if (urlFieldKind) {
            const urlValidation = validateBuilderUrl(value, urlFieldKind);
            if (!urlValidation.valid) {
                pushStructuralValidationError(
                    errors,
                    path,
                    urlValidation.message ?? 'Builder URL is invalid.',
                    nodeId,
                    urlValidation.reason === 'forbiddenScheme' ? 'dangerousUrl' : 'invalidUrl'
                );
            }
        } else if (isDangerousBuilderUrl(value)) {
            pushStructuralValidationError(errors, path, 'Builder URL value uses a forbidden scheme or executable payload.', nodeId, 'dangerousUrl');
        } else if (isUnsafeExpressionString(value)) {
            pushStructuralValidationError(
                errors,
                path,
                'Builder value must not contain JavaScript, scripts, eval, Function constructors, imports, or template expressions.',
                nodeId,
                'unsafeExpression'
            );
        }
        return;
    }

    if (visited.has(value)) {
        return;
    }
    visited.add(value);

    if (Array.isArray(value)) {
        value.forEach((item, index) => validateBuilderSecurityPolicy(item, `${path}[${index}]`, errors, nodeId, visited));
        return;
    }

    if (!isPlainRecord(value)) {
        return;
    }

    const currentNodeId = typeof value.id === 'string' && typeof value.type === 'string' ? value.id : nodeId;

    for (const [key, child] of Object.entries(value)) {
        const childPath = `${path}.${key}`;

        if (isUnsafeJsonKey(key) || (isForbiddenBuilderRuntimeField(key) && !isAllowedBuilderEventBindingName(path, child))) {
            pushStructuralValidationError(errors, childPath, `Builder field '${key}' is not allowed.`, currentNodeId, 'forbiddenField');
        }

        validateBuilderSecurityPolicy(child, childPath, errors, currentNodeId, visited);
    }
}

function validateNoForbiddenOrUnsafeFields(
    value: unknown,
    path: string,
    errors: BuilderStructuralValidationError[],
    nodeId: string | undefined,
    visited: WeakSet<object> = new WeakSet<object>()
): void {
    if (value === undefined || value === Builder_JSON_NULL || typeof value === 'number' || typeof value === 'boolean') {
        return;
    }

    if (typeof value === 'string') {
        if (isUnsafeExpressionString(value)) {
            pushStructuralValidationError(errors, path, 'Builder value must not contain JavaScript or template expressions.', nodeId, 'unsafeExpression');
        }
        return;
    }

    if (visited.has(value)) {
        return;
    }
    visited.add(value);

    if (Array.isArray(value)) {
        value.forEach((item, index) => validateNoForbiddenOrUnsafeFields(item, `${path}[${index}]`, errors, nodeId, visited));
        return;
    }

    if (!isPlainRecord(value)) {
        return;
    }

    for (const [key, child] of Object.entries(value)) {
        const childPath = `${path}.${key}`;
        if (isUnsafeJsonKey(key) || isForbiddenBuilderRuntimeField(key)) {
            pushStructuralValidationError(errors, childPath, `Builder field '${key}' is not allowed.`, nodeId, 'forbiddenField');
        }
        validateNoForbiddenOrUnsafeFields(child, childPath, errors, nodeId, visited);
    }
}

function isForbiddenBuilderRuntimeField(key: string): boolean {
    return key === 'dangerouslySetInnerHTML'
        || key === 'innerHTML'
        || key === 'outerHTML'
        || key === 'handler'
        || key === 'expression'
        || key === 'eval'
        || key === 'script'
        || key === 'function'
        || /^on[A-Z]/.test(key);
}

function isAllowedBuilderEventBindingName(parentPath: string, value: unknown): boolean {
    return parentPath.endsWith('.events') && isPlainRecord(value);
}

function isUnsafeExpressionString(value: string): boolean {
    return /(?:<script\b|<\/script\s*>|expression\s*\(|\$\{|{{|=>|\bfunction\b|\beval\s*\(|\bnew\s+Function\b|\bFunction\s*\(|\bimport\s*\()/i.test(value);
}

function isDangerousBuilderUrl(value: string): boolean {
    const normalized = value.replace(/[\u0000-\u001F\u007F\s]+/g, '').toLowerCase();

    return /^(?:javascript|vbscript):/.test(normalized)
        || /^data:(?:text\/html|image\/svg\+xml|application\/xhtml\+xml)/.test(normalized)
        || /url\(['"]?(?:javascript|vbscript):/.test(normalized)
        || /url\(['"]?data:(?:text\/html|image\/svg\+xml|application\/xhtml\+xml)/.test(normalized);
}

function getBuilderUrlFieldKind(path: string): BuilderUrlValidationKind | undefined {
    const field = path.match(/(?:^|\.)([^.[\]]+)(?:\[\d+\])?$/)?.[1];
    if (!field) {
        return undefined;
    }

    if (/^(?:src|imageSrc|image|avatar|asset|assetUrl|url|href|to|endpoint|primaryActionHref|secondaryActionHref)$/i.test(field)) {
        if (/^(?:src|imageSrc|image|avatar|asset|assetUrl)$/i.test(field)) {
            return 'asset';
        }
        if (/^(?:url|endpoint)$/i.test(field) && path.includes('.dataSources.')) {
            return 'dataSource';
        }
        return 'link';
    }

    return undefined;
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

function isKnownConditionOperator(value: unknown): boolean {
    return value === 'exists'
        || value === 'equals'
        || value === 'notEquals'
        || value === 'contains'
        || value === 'greaterThan'
        || value === 'greaterThanOrEqual'
        || value === 'lessThan'
        || value === 'lessThanOrEqual';
}

function isSafeClassNameList(value: string): boolean {
    return value.split(/\s+/).filter(Boolean).every(className => /^[A-Za-z_][A-Za-z0-9_-]*$/.test(className));
}

function isSafeCssProperty(value: string): boolean {
    return /^-?[a-z][a-z0-9-]*$/i.test(value) && !isForbiddenBuilderRuntimeField(value);
}

function isUnsafeCssValue(value: string): boolean {
    return /(?:url\s*\(\s*['"]?\s*javascript:|behavior\s*:|binding\s*:)/i.test(value);
}

export type BuilderJsonPrimitive = string | number | boolean | null;
export type BuilderJsonValue = BuilderJsonPrimitive | BuilderJsonObject | BuilderJsonValue[];

export interface BuilderJsonObject {
    [key: string]: BuilderJsonValue;
}

export interface BuilderDocument {
    schemaVersion: string;
    metadata: BuilderMetadata;
    page: BuilderPage;
    theme?: BuilderTheme;
    dataSources?: Record<string, BuilderDataSource>;
    actions?: Record<string, BuilderAction>;
    states?: Record<string, BuilderState>;
    permissions?: Record<string, BuilderPermissionRule>;
    tree: BuilderNode;
    aiHints?: BuilderAiHints;
    [key: string]: BuilderJsonValue | BuilderMetadata | BuilderPage | BuilderTheme | BuilderNode |
    Record<string, BuilderJsonValue | BuilderDataSource | BuilderAction | BuilderState | BuilderPermissionRule> | undefined;
}

export interface BuilderMetadata {
    id: string;
    name: string;
    description?: string;
    version?: string;
    createdBy?: string;
    createdAt?: string;
    updatedAt?: string;
    tags?: string[];
    locale?: string;
    [key: string]: BuilderJsonValue | undefined;
}

export interface BuilderPage {
    id: string;
    title: string;
    route?: string;
    layout?: BuilderPageLayout;
    description?: string;
    [key: string]: BuilderJsonValue | undefined;
}

export type BuilderPageLayout = 'default' | 'blank' | 'dashboard' | 'marketing' | 'form' | string;

export interface BuilderTheme {
    mode?: BuilderThemeMode;
    primaryColor?: string;
    radius?: BuilderThemeRadius;
    fontFamily?: string;
    spacing?: BuilderThemeSpacing;
    tokens?: BuilderThemeTokens;
    [key: string]: BuilderJsonValue | undefined;
}

export type BuilderThemeMode = 'light' | 'dark' | 'auto';
export type BuilderThemeRadius = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | string;
export type BuilderThemeSpacingSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type BuilderThemeSpacing = Partial<Record<BuilderThemeSpacingSize, string | number>> & Record<string, string | number>;
export type BuilderThemeTokens = Record<string, BuilderJsonValue>;

export interface BuilderDataSource {
    type: BuilderDataSourceType;
    config?: Record<string, BuilderJsonValue>;
    description?: string;
    cache?: BuilderDataSourceCache;
}

export type BuilderDataSourceType = 'static' | 'mock' | 'http' | 'graphql' | string;

export interface BuilderDataSourceCache {
    enabled?: boolean;
    ttlSeconds?: number;
}

export interface BuilderAction {
    type: BuilderActionType;
    params?: Record<string, BuilderJsonValue>;
    description?: string;
}

export type BuilderActionType =
    | 'navigate'
    | 'openModal'
    | 'closeModal'
    | 'toggleState'
    | 'setState'
    | 'submitForm'
    | 'callApi'
    | 'showNotification'
    | string;

export interface BuilderState {
    initialValue?: BuilderJsonValue;
    description?: string;
    persistent?: boolean;
}

export interface BuilderPermissionRule {
    id?: string;
    effect?: BuilderPermissionEffect;
    roles?: string[];
    permissions?: string[];
    condition?: BuilderCondition;
    reason?: string;
}

export interface BuilderNode {
    id: string;
    type: string;
    props?: Record<string, BuilderJsonValue>;
    children?: BuilderNode[];
    slots?: Record<string, BuilderNode[]>;
    data?: BuilderNodeDataBinding;
    events?: Record<string, BuilderEventBinding>;
    visibility?: BuilderVisibilityRule;
    permissions?: BuilderPermissionRule[];
    style?: BuilderStyle;
    meta?: BuilderNodeMeta;
    [key: string]: string | BuilderJsonValue | BuilderNode[] | Record<string, BuilderNode[]> | BuilderNodeDataBinding |
    Record<string, BuilderEventBinding> | BuilderVisibilityRule | BuilderPermissionRule[] | BuilderStyle | BuilderNodeMeta | undefined;
}

export type BuilderPermissionEffect = 'allow' | 'deny';

export interface BuilderNodeDataBinding {
    source?: string;
    sourceId?: string;
    path?: string;
    fields?: Record<string, BuilderDataFieldBinding>;
    repeat?: BuilderRepeatBinding;
    emptyState?: BuilderNode[];
}

export interface BuilderEventBinding {
    actionId: string;
    params?: Record<string, BuilderJsonValue>;
    preventDefault?: boolean;
    stopPropagation?: boolean;
}

export interface BuilderVisibilityRule {
    condition?: BuilderCondition;
    stateId?: string;
    equals?: BuilderJsonValue;
}

export interface BuilderStyle {
    className?: string;
    css?: Record<string, string | number>;
    responsive?: Record<string, BuilderStyle>;
    [key: string]: BuilderJsonValue | BuilderStyle | Record<string, BuilderStyle> | undefined;
}

export interface BuilderNodeMeta {
    label?: string;
    locked?: boolean;
    hiddenInEditor?: boolean;
    collapsed?: boolean;
    source?: BuilderNodeSourceMeta;
    notes?: string;
    [key: string]: BuilderJsonValue | BuilderNodeSourceMeta | undefined;
}

export interface BuilderAiHints {
    intent?: string;
    tone?: string;
    audience?: string;
    context?: string;
    constraints?: string[];
    keywords?: string[];
    [key: string]: BuilderJsonValue | undefined;
}

export interface BuilderDataFieldBinding {
    path: string;
    fallback?: BuilderJsonValue;
    format?: string;
}

export interface BuilderRepeatBinding {
    sourceId: string;
    itemName?: string;
    keyPath?: string;
    limit?: number;
}

export interface BuilderCondition {
    source?: 'state' | 'data' | 'permission' | 'context';
    ref?: string;
    path?: string;
    operator?: BuilderConditionOperator;
    value?: BuilderJsonValue;
    all?: BuilderCondition[];
    any?: BuilderCondition[];
    not?: BuilderCondition;
}

export type BuilderConditionOperator =
    'exists'
    | 'equals'
    | 'notEquals'
    | 'contains'
    | 'greaterThan'
    | 'greaterThanOrEqual'
    | 'lessThan'
    | 'lessThanOrEqual';

export interface BuilderNodeSourceMeta {
    kind: 'user' | 'template' | 'ai' | 'imported' | string;
    id?: string;
    prompt?: string;
    timestamp?: string;
}

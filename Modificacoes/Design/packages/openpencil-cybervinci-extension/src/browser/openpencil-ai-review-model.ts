import {
    OpenPencilDesignOperation,
    OpenPencilDocument,
    OpenPencilNode,
    OpenPencilNodeType,
    OpenPencilValidationResult
} from '../common/openpencil-types';

export interface OpenPencilAiReviewInput {
    target: string;
    prompt?: string;
    sourceLabel?: string;
    providerLabel?: string;
    diagnostics?: string[];
    changed: boolean;
    message?: string;
    validation: OpenPencilValidationResult;
    currentSelection: string[];
    previewSelection: string[];
    operations: OpenPencilDesignOperation[];
    beforeDocument: OpenPencilDocument;
    afterDocument: OpenPencilDocument;
    previewArtifact?: string;
}

export interface OpenPencilAiReviewNodeReference {
    id: string;
    label: string;
    type?: OpenPencilNodeType;
    name?: string;
    text?: string;
    parentId?: string;
    pageId?: string;
    status: 'existing' | 'created' | 'removed' | 'missing';
}

export interface OpenPencilAiReviewPropertyChange {
    property: string;
    before?: string;
    after?: string;
}

export interface OpenPencilAiReviewNodeChange {
    node: OpenPencilAiReviewNodeReference;
    changes: OpenPencilAiReviewPropertyChange[];
}

export interface OpenPencilAiReviewOperation {
    index: number;
    operation: string;
    title: string;
    summary: string;
    effect: 'create' | 'update' | 'remove' | 'move' | 'selection' | 'page' | 'variable' | 'theme' | 'unknown';
    targets: OpenPencilAiReviewNodeReference[];
    details: string[];
    propertyChanges: OpenPencilAiReviewPropertyChange[];
}

export interface OpenPencilAiReviewModel {
    target: string;
    prompt?: string;
    sourceLabel?: string;
    providerLabel?: string;
    diagnostics: string[];
    changed: boolean;
    canApply: boolean;
    message?: string;
    validation: OpenPencilValidationResult;
    validationSummary: {
        errors: number;
        warnings: number;
    };
    currentSelection: OpenPencilAiReviewNodeReference[];
    previewSelection: OpenPencilAiReviewNodeReference[];
    selectionChanged: boolean;
    operations: OpenPencilAiReviewOperation[];
    impact: {
        created: OpenPencilAiReviewNodeReference[];
        updated: OpenPencilAiReviewNodeChange[];
        removed: OpenPencilAiReviewNodeReference[];
    };
    previewArtifact?: string;
}

interface IndexedNode {
    node: OpenPencilNode;
    parentId?: string;
    pageId?: string;
    index: number;
}

export function createOpenPencilAiReviewModel(input: OpenPencilAiReviewInput): OpenPencilAiReviewModel {
    const beforeNodes = indexDocumentNodes(input.beforeDocument);
    const afterNodes = indexDocumentNodes(input.afterDocument);
    const operations = input.operations.map((operation, index) => createOperationReview(operation, index, beforeNodes, afterNodes));
    const impact = createImpactReview(beforeNodes, afterNodes);
    const validationSummary = {
        errors: input.validation.issues.filter(issue => issue.severity === 'error').length,
        warnings: input.validation.issues.filter(issue => issue.severity === 'warning').length
    };
    const currentSelection = input.currentSelection.map(id => createNodeReference(id, beforeNodes, afterNodes));
    const previewSelection = input.previewSelection.map(id => createNodeReference(id, beforeNodes, afterNodes));

    return {
        target: input.target,
        prompt: input.prompt,
        sourceLabel: input.sourceLabel,
        providerLabel: input.providerLabel,
        diagnostics: input.diagnostics ?? [],
        changed: input.changed,
        canApply: input.changed && input.validation.valid,
        message: input.message,
        validation: input.validation,
        validationSummary,
        currentSelection,
        previewSelection,
        selectionChanged: input.currentSelection.join('\0') !== input.previewSelection.join('\0'),
        operations,
        impact,
        previewArtifact: input.previewArtifact
    };
}

function createOperationReview(
    operation: OpenPencilDesignOperation,
    index: number,
    beforeNodes: Map<string, IndexedNode>,
    afterNodes: Map<string, IndexedNode>
): OpenPencilAiReviewOperation {
    const targets = operationTargetIds(operation).map(id => createNodeReference(id, beforeNodes, afterNodes));
    const operationName = humanizeOperation(operation.operation);
    const details = operationDetails(operation, targets);
    const propertyChanges = operationPropertyChanges(operation, beforeNodes, afterNodes);
    return {
        index,
        operation: operation.operation,
        title: `${index + 1}. ${operationName}`,
        summary: summarizeOperation(operation, targets),
        effect: operationEffect(operation.operation),
        targets,
        details,
        propertyChanges
    };
}

function createImpactReview(beforeNodes: Map<string, IndexedNode>, afterNodes: Map<string, IndexedNode>): OpenPencilAiReviewModel['impact'] {
    const created: OpenPencilAiReviewNodeReference[] = [];
    const removed: OpenPencilAiReviewNodeReference[] = [];
    const updated: OpenPencilAiReviewNodeChange[] = [];

    for (const [id, after] of afterNodes) {
        const before = beforeNodes.get(id);
        if (!before) {
            created.push(createNodeReference(id, beforeNodes, afterNodes));
            continue;
        }
        const changes = nodeChanges(before, after);
        if (changes.length) {
            updated.push({
                node: createNodeReference(id, beforeNodes, afterNodes),
                changes
            });
        }
    }
    for (const id of beforeNodes.keys()) {
        if (!afterNodes.has(id)) {
            removed.push(createNodeReference(id, beforeNodes, afterNodes));
        }
    }

    return { created, updated, removed };
}

function indexDocumentNodes(document: OpenPencilDocument): Map<string, IndexedNode> {
    const nodes = new Map<string, IndexedNode>();
    const visit = (items: OpenPencilNode[] | undefined, parentId: string | undefined, pageId: string | undefined): void => {
        items?.forEach((node, index) => {
            if (typeof node.id === 'string' && node.id) {
                nodes.set(node.id, { node, parentId, pageId, index });
            }
            visit(node.children, node.id, pageId);
        });
    };
    if (document.pages?.length) {
        for (const page of document.pages) {
            visit(page.children, undefined, page.id);
        }
    } else {
        visit(document.children, undefined, document.activePageId);
    }
    return nodes;
}

function operationTargetIds(operation: OpenPencilDesignOperation): string[] {
    if ('nodeId' in operation) {
        return [operation.nodeId];
    }
    if ('nodeIds' in operation) {
        return operation.nodeIds;
    }
    if ((operation.operation === 'createNode' || operation.operation === 'addNode') && typeof operation.node.id === 'string') {
        return [operation.node.id];
    }
    return [];
}

function createNodeReference(id: string, beforeNodes: Map<string, IndexedNode>, afterNodes: Map<string, IndexedNode>): OpenPencilAiReviewNodeReference {
    const after = afterNodes.get(id);
    const before = beforeNodes.get(id);
    const indexed = after ?? before;
    if (!indexed) {
        return {
            id,
            label: id,
            status: 'missing'
        };
    }
    const status = after && !before ? 'created' : before && !after ? 'removed' : 'existing';
    return {
        id,
        label: labelNode(indexed.node),
        type: indexed.node.type,
        name: indexed.node.name,
        text: typeof indexed.node.content === 'string' ? truncate(indexed.node.content, 96) : undefined,
        parentId: indexed.parentId,
        pageId: indexed.pageId,
        status
    };
}

function operationDetails(operation: OpenPencilDesignOperation, targets: OpenPencilAiReviewNodeReference[]): string[] {
    switch (operation.operation) {
        case 'createNode':
        case 'addNode':
            return [
                `Parent: ${operation.parentId ?? 'root'}`,
                `Node: ${labelPartialNode(operation.node)}`,
                operation.index !== undefined ? `Index: ${operation.index}` : undefined
            ].filter(isString);
        case 'updateNode':
            return [`Fields: ${Object.keys(operation.changes).join(', ') || 'none'}`];
        case 'replaceNode':
            return [`Replacement: ${labelPartialNode(operation.node)}`];
        case 'removeNode':
        case 'deleteNode':
            return [`Removes ${targets[0]?.label ?? operation.nodeId}`];
        case 'moveNode':
            return [`Position: x ${operation.x}, y ${operation.y}`];
        case 'resizeNode':
            return [`Size: ${operation.width} x ${operation.height}`, operation.x !== undefined || operation.y !== undefined ? `Position: x ${operation.x ?? 'unchanged'}, y ${operation.y ?? 'unchanged'}` : undefined].filter(isString);
        case 'moveToParent':
            return [`New parent: ${operation.parentId ?? 'root'}`, operation.index !== undefined ? `Index: ${operation.index}` : undefined].filter(isString);
        case 'nudgeNodes':
            return [`Delta: ${operation.dx}, ${operation.dy}`];
        case 'alignNodes':
            return [`Alignment: ${operation.alignment}`];
        case 'distributeNodes':
            return [`Direction: ${operation.direction}`];
        case 'reorderNode':
            return [`Index: ${operation.index}`];
        case 'booleanNodes':
            return [`Boolean operation: ${operation.booleanOperation}`];
        case 'updatePathAnchors':
            return [`Anchors: ${operation.anchors.length}`, operation.closed !== undefined ? `Closed: ${operation.closed}` : undefined].filter(isString);
        case 'updatePathAnchor':
        case 'updatePathHandle':
        case 'insertPathAnchor':
        case 'removePathAnchor':
            return [`Anchor index: ${operation.anchorIndex}`];
        case 'addPage':
            return [`Page: ${operation.page?.name ?? operation.page?.id ?? 'new page'}`, operation.index !== undefined ? `Index: ${operation.index}` : undefined, operation.makeActive ? 'Makes page active' : undefined].filter(isString);
        case 'updatePage':
            return [`Page: ${operation.pageId}`, `Fields: ${Object.keys(operation.changes).join(', ') || 'none'}`];
        case 'removePage':
        case 'setActivePage':
            return [`Page: ${operation.pageId}`];
        case 'setVariable':
            return [`Variable: ${operation.name}`];
        case 'updateVariable':
            return [`Variable: ${operation.name}`, `Fields: ${Object.keys(operation.changes).join(', ') || 'none'}`];
        case 'removeVariable':
            return [`Variable: ${operation.name}`];
        case 'setThemes':
            return [`Axes: ${Object.keys(operation.themes).join(', ') || 'none'}`];
        case 'updateThemeAxis':
            return [`Axis: ${operation.axis}`, `Values: ${operation.values.join(', ')}`];
        case 'removeThemeAxis':
            return [`Axis: ${operation.axis}`];
        case 'setNodeTheme':
            return [`Theme: ${Object.entries(operation.theme).map(([axis, value]) => `${axis}=${value}`).join(', ') || 'none'}`];
        case 'clearNodeTheme':
            return [`Axes: ${operation.axes?.join(', ') ?? 'all'}`];
        case 'setNodeLayout':
            return [`Layout fields: ${Object.keys(operation.layout).join(', ') || 'none'}`, operation.normalizeChildren ? 'Normalizes children' : undefined].filter(isString);
        case 'autoLayoutNode':
            return [`Direction: ${operation.direction ?? 'auto'}`, operation.gap !== undefined ? `Gap: ${formatValue(operation.gap)}` : undefined, operation.padding !== undefined ? `Padding: ${formatValue(operation.padding)}` : undefined].filter(isString);
        case 'setSelection':
            return [`Selection: ${operation.nodeIds.join(', ') || 'empty'}`];
        default:
            return [];
    }
}

function operationPropertyChanges(
    operation: OpenPencilDesignOperation,
    beforeNodes: Map<string, IndexedNode>,
    afterNodes: Map<string, IndexedNode>
): OpenPencilAiReviewPropertyChange[] {
    if (!('nodeId' in operation)) {
        return [];
    }
    const before = beforeNodes.get(operation.nodeId);
    const after = afterNodes.get(operation.nodeId);
    if (!before || !after) {
        return [];
    }
    if (operation.operation === 'updateNode') {
        return propertyChanges(before.node, after.node, Object.keys(operation.changes));
    }
    if (operation.operation === 'replaceNode') {
        return nodeChanges(before, after).slice(0, 12);
    }
    if (operation.operation === 'moveNode') {
        return propertyChanges(before.node, after.node, ['x', 'y']);
    }
    if (operation.operation === 'resizeNode') {
        return propertyChanges(before.node, after.node, ['x', 'y', 'width', 'height']);
    }
    if (operation.operation === 'setNodeLayout') {
        return propertyChanges(before.node, after.node, Object.keys(operation.layout));
    }
    if (operation.operation === 'autoLayoutNode') {
        return propertyChanges(before.node, after.node, ['layout', 'gap', 'padding', 'justifyContent', 'alignItems']);
    }
    return nodeChanges(before, after).slice(0, 8);
}

function nodeChanges(before: IndexedNode, after: IndexedNode): OpenPencilAiReviewPropertyChange[] {
    const keys = new Set([
        ...Object.keys(stripChildren(before.node)),
        ...Object.keys(stripChildren(after.node))
    ]);
    const changes = propertyChanges(before.node, after.node, [...keys]);
    if (before.parentId !== after.parentId) {
        changes.unshift({ property: 'parent', before: before.parentId ?? 'root', after: after.parentId ?? 'root' });
    }
    if (before.index !== after.index) {
        changes.unshift({ property: 'index', before: String(before.index), after: String(after.index) });
    }
    return changes;
}

function propertyChanges(before: OpenPencilNode, after: OpenPencilNode, keys: string[]): OpenPencilAiReviewPropertyChange[] {
    return keys
        .filter(key => key !== 'children')
        .filter((key, index, all) => all.indexOf(key) === index)
        .filter(key => !sameValue(readNodeProperty(before, key), readNodeProperty(after, key)))
        .slice(0, 12)
        .map(key => ({
            property: key,
            before: formatValue(readNodeProperty(before, key)),
            after: formatValue(readNodeProperty(after, key))
        }));
}

function readNodeProperty(node: OpenPencilNode, key: string): unknown {
    return (node as Record<string, unknown>)[key];
}

function stripChildren(node: OpenPencilNode): Record<string, unknown> {
    const { children, ...rest } = node;
    return rest;
}

function summarizeOperation(operation: OpenPencilDesignOperation, targets: OpenPencilAiReviewNodeReference[]): string {
    const targetLabels = targets.map(target => target.label).join(', ');
    switch (operation.operation) {
        case 'createNode':
        case 'addNode':
            return `Create ${labelPartialNode(operation.node)} under ${operation.parentId ?? 'root'}`;
        case 'setSelection':
            return `Select ${targetLabels || 'nothing'}`;
        case 'addPage':
            return `Add page ${operation.page?.name ?? operation.page?.id ?? 'new page'}`;
        case 'setVariable':
        case 'updateVariable':
        case 'removeVariable':
            return `${humanizeOperation(operation.operation)} ${operation.name}`;
        case 'setThemes':
            return `Set theme axes ${Object.keys(operation.themes).join(', ') || 'none'}`;
        case 'updateThemeAxis':
        case 'removeThemeAxis':
            return `${humanizeOperation(operation.operation)} ${operation.axis}`;
        case 'updatePage':
        case 'removePage':
        case 'setActivePage':
            return `${humanizeOperation(operation.operation)} ${operation.pageId}`;
        default:
            return targetLabels ? `${humanizeOperation(operation.operation)} ${targetLabels}` : humanizeOperation(operation.operation);
    }
}

function operationEffect(operation: string): OpenPencilAiReviewOperation['effect'] {
    if (operation === 'createNode' || operation === 'addNode' || operation === 'duplicateNode') {
        return 'create';
    }
    if (operation === 'removeNode' || operation === 'deleteNode' || operation === 'removePage' || operation === 'removeVariable' || operation === 'removeThemeAxis') {
        return 'remove';
    }
    if (operation === 'moveNode' || operation === 'resizeNode' || operation === 'moveToParent' || operation === 'nudgeNodes' || operation === 'alignNodes' || operation === 'distributeNodes' || operation === 'reorderNode' || operation === 'bringForward' || operation === 'sendBackward' || operation === 'bringToFront' || operation === 'sendToBack') {
        return 'move';
    }
    if (operation === 'setSelection') {
        return 'selection';
    }
    if (operation === 'addPage' || operation === 'updatePage' || operation === 'setActivePage') {
        return 'page';
    }
    if (operation === 'setVariable' || operation === 'updateVariable') {
        return 'variable';
    }
    if (operation === 'setThemes' || operation === 'updateThemeAxis' || operation === 'setNodeTheme' || operation === 'clearNodeTheme') {
        return 'theme';
    }
    if (operation === 'updateNode' || operation === 'replaceNode' || operation === 'setNodeLayout' || operation === 'autoLayoutNode' || operation.startsWith('updatePath') || operation.endsWith('PathAnchor') || operation === 'convertToPath' || operation === 'groupNodes' || operation === 'ungroupNode' || operation === 'booleanNodes') {
        return 'update';
    }
    return 'unknown';
}

function labelNode(node: OpenPencilNode): string {
    const name = node.name ? `${node.name} ` : '';
    const text = typeof node.content === 'string' && node.content.trim() ? ` "${truncate(node.content.trim(), 48)}"` : '';
    return `${name}${node.type} (${node.id})${text}`;
}

function labelPartialNode(node: Partial<OpenPencilNode> & { type?: OpenPencilNodeType }): string {
    const id = typeof node.id === 'string' && node.id ? ` (${node.id})` : '';
    const name = typeof node.name === 'string' && node.name ? `${node.name} ` : '';
    const type = typeof node.type === 'string' ? node.type : 'node';
    return `${name}${type}${id}`;
}

function humanizeOperation(operation: string): string {
    return operation
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/^./, first => first.toUpperCase());
}

function sameValue(left: unknown, right: unknown): boolean {
    return JSON.stringify(left) === JSON.stringify(right);
}

function formatValue(value: unknown): string {
    if (value === undefined) {
        return 'unset';
    }
    if (value === null) {
        return 'null';
    }
    if (typeof value === 'string') {
        return truncate(value, 120);
    }
    return truncate(JSON.stringify(value) ?? String(value), 120);
}

function truncate(value: string, maxLength: number): string {
    return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}

function isString(value: string | undefined): value is string {
    return typeof value === 'string';
}

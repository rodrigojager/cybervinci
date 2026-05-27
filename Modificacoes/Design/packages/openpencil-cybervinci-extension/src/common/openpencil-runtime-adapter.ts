import {
    OpenPencilBooleanOperation,
    OpenPencilDocument,
    OpenPencilEffect,
    OpenPencilFill,
    OpenPencilNode,
    OpenPencilPage,
    OpenPencilPathAnchor,
    OpenPencilPathHandle,
    OpenPencilPathHandleSide,
    OpenPencilStroke,
    OpenPencilVariableDefinition
} from './openpencil-types';
import {
    anchorsToPathData as upstreamAnchorsToPathData,
    computeLayoutPositions as penCoreComputeLayoutPositions,
    executeBooleanOp,
    getPathBoundsFromAnchors as upstreamGetPathBoundsFromAnchors,
    pathDataToAnchors as upstreamPathDataToAnchors
} from '@zseven-w/pen-core';
import type { PenPathAnchor } from '@zseven-w/pen-types';

const OPENPENCIL_RUNTIME_CSS_COLOR_KEYWORDS: Record<string, string> = {
    black: '#000000',
    white: '#ffffff',
    red: '#ef4444',
    green: '#22c55e',
    blue: '#3b82f6',
    yellow: '#eab308',
    orange: '#f97316',
    purple: '#8b5cf6',
    pink: '#ec4899',
    gray: '#6b7280',
    grey: '#6b7280',
    slate: '#64748b',
    neutral: '#737373',
    zinc: '#71717a',
    stone: '#78716c',
    indigo: '#6366f1',
    violet: '#8b5cf6',
    cyan: '#06b6d4',
    teal: '#14b8a6',
    emerald: '#10b981',
    lime: '#84cc16',
    amber: '#f59e0b',
    rose: '#f43f5e',
    brown: '#92400e',
    navy: '#1e3a8a',
    transparent: 'transparent'
};

export type OpenPencilRuntimeNodeType =
    | 'frame'
    | 'group'
    | 'rectangle'
    | 'ellipse'
    | 'line'
    | 'polygon'
    | 'path'
    | 'text'
    | 'image'
    | 'icon_font'
    | 'ref';

export interface OpenPencilRuntimeGradientStop {
    offset: number;
    color: string;
}

export interface OpenPencilRuntimeStyledTextSegment {
    text: string;
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: number;
    fontStyle?: 'normal' | 'italic';
    fill?: string;
    underline?: boolean;
    strikethrough?: boolean;
    href?: string;
}

export type OpenPencilRuntimeFill =
    | { type: 'solid'; color: string; explain?: string; opacity?: number; blendMode?: string }
    | { type: 'linear_gradient'; angle?: number; stops: OpenPencilRuntimeGradientStop[]; explain?: string; opacity?: number; blendMode?: string }
    | { type: 'radial_gradient'; cx?: number; cy?: number; radius?: number; stops: OpenPencilRuntimeGradientStop[]; explain?: string; opacity?: number; blendMode?: string }
    | {
        type: 'image';
        url: string;
        mode?: 'fill' | 'fit' | 'crop' | 'tile' | 'stretch';
        originalSize?: { width: number; height: number };
        transform?: Record<string, number>;
        explain?: string;
        opacity?: number;
        exposure?: number;
        contrast?: number;
        saturation?: number;
        temperature?: number;
        tint?: number;
        highlights?: number;
        shadows?: number;
    };

export interface OpenPencilRuntimeStroke {
    thickness: number | [number, number, number, number];
    align?: 'inside' | 'center' | 'outside';
    join?: 'miter' | 'bevel' | 'round';
    cap?: 'none' | 'round' | 'square';
    dashPattern?: number[];
    dashOffset?: number;
    fill?: OpenPencilRuntimeFill[];
}

export type OpenPencilRuntimeEffect =
    | { type: 'blur' | 'background_blur'; radius: number }
    | { type: 'shadow'; inner?: boolean; offsetX: number; offsetY: number; blur: number; spread: number; color: string };

export interface OpenPencilRuntimeNode {
    id: string;
    type: OpenPencilRuntimeNodeType;
    name?: string;
    role?: string;
    explain?: string;
    x?: number;
    y?: number;
    width?: number | 'fit_content' | 'fill_container' | string;
    height?: number | 'fit_content' | 'fill_container' | string;
    rotation?: number;
    opacity?: number | string;
    enabled?: boolean | string;
    visible?: boolean;
    locked?: boolean;
    flipX?: boolean;
    flipY?: boolean;
    theme?: Record<string, string>;
    reusable?: boolean;
    slot?: string[];
    layout?: 'none' | 'vertical' | 'horizontal';
    gap?: number | string;
    padding?: number | [number, number] | [number, number, number, number] | string;
    justifyContent?: 'start' | 'center' | 'end' | 'space_between' | 'space_around';
    alignItems?: 'start' | 'center' | 'end';
    clipContent?: boolean;
    fill?: OpenPencilRuntimeFill[];
    stroke?: OpenPencilRuntimeStroke;
    effects?: OpenPencilRuntimeEffect[];
    children?: OpenPencilRuntimeNode[];
    cornerRadius?: number | [number, number, number, number];
    content?: string | OpenPencilRuntimeStyledTextSegment[];
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: number | string;
    fontStyle?: 'normal' | 'italic';
    letterSpacing?: number;
    lineHeight?: number;
    textAlign?: 'left' | 'center' | 'right' | 'justify';
    textAlignVertical?: 'top' | 'middle' | 'bottom';
    textGrowth?: 'auto' | 'fixed-width' | 'fixed-width-height';
    underline?: boolean;
    strikethrough?: boolean;
    src?: string;
    objectFit?: 'fill' | 'fit' | 'crop' | 'tile';
    exposure?: number;
    contrast?: number;
    saturation?: number;
    temperature?: number;
    tint?: number;
    highlights?: number;
    shadows?: number;
    imagePrompt?: string;
    imageSearchQuery?: string;
    d?: string;
    iconId?: string;
    anchors?: OpenPencilPathAnchor[];
    closed?: boolean;
    fillRule?: 'nonzero' | 'evenodd';
    x2?: number;
    y2?: number;
    polygonCount?: number;
    innerRadius?: number;
    startAngle?: number;
    sweepAngle?: number;
    iconFontName?: string;
    iconFontFamily?: string;
    ref?: string;
    descendants?: Record<string, Partial<OpenPencilRuntimeNode>>;
}

export interface OpenPencilRuntimePage {
    [key: string]: unknown;
    id: string;
    name: string;
    children: OpenPencilRuntimeNode[];
}

export interface OpenPencilRuntimeDocument {
    [key: string]: unknown;
    version: string;
    name?: string;
    activePageId?: string;
    themes?: Record<string, string[]>;
    variables?: Record<string, OpenPencilVariableDefinition>;
    pages?: OpenPencilRuntimePage[];
    children: OpenPencilRuntimeNode[];
}

export interface OpenPencilRuntimeSelectionState {
    selectedIds: string[];
    activeId: string | null;
    hoveredId: string | null;
    enteredFrameId: string | null;
    enteredFrameStack: string[];
}

export interface OpenPencilRuntimeSelectionOptions {
    activeId?: string | null;
    hoveredId?: string | null;
    enteredFrameId?: string | null;
    enteredFrameStack?: readonly string[];
    document?: OpenPencilDocument | OpenPencilRuntimeDocument;
}

export type OpenPencilRuntimeSelectionChange =
    | readonly string[]
    | OpenPencilRuntimeSelectionState
    | { ids?: readonly string[]; selection?: readonly string[]; selectedIds?: readonly string[] };

export type OpenPencilRuntimeInteractionType = 'selection' | 'hover' | 'viewport' | 'render';

export interface OpenPencilRuntimeInteractionEvent {
    type: OpenPencilRuntimeInteractionType;
    selectedIds?: string[];
    hoveredId?: string | null;
    viewport?: {
        zoom?: number;
        panX?: number;
        panY?: number;
    };
}

export type OpenPencilRuntimeMutationFailure = 'not-found' | 'missing-parent' | 'invalid-parent';

export interface OpenPencilRuntimeTreeMutationResult {
    children: OpenPencilNode[];
    changed: boolean;
    failure?: OpenPencilRuntimeMutationFailure;
    nodeId?: string;
    parentId?: string | null;
}

export interface OpenPencilRuntimeTreeMutationAdapter {
    readonly source: '@zseven-w/pen-core/tree-utils';
    findNode(children: OpenPencilNode[], nodeId: string): OpenPencilNode | undefined;
    findParent(children: OpenPencilNode[], nodeId: string): OpenPencilNode | undefined;
    insertNode(children: OpenPencilNode[], parentId: string | null, node: OpenPencilNode, index?: number): OpenPencilRuntimeTreeMutationResult;
    updateNode(children: OpenPencilNode[], nodeId: string, updates: Partial<OpenPencilNode>): OpenPencilRuntimeTreeMutationResult;
    removeNode(children: OpenPencilNode[], nodeId: string): OpenPencilRuntimeTreeMutationResult;
    moveNode(children: OpenPencilNode[], nodeId: string, parentId: string | null, index?: number): OpenPencilRuntimeTreeMutationResult;
    replaceNode(children: OpenPencilNode[], nodeId: string, replacement: OpenPencilNode): OpenPencilRuntimeTreeMutationResult;
    cloneNode(node: OpenPencilNode, idGenerator: () => string): OpenPencilNode;
    computeLayoutChildren(parent: OpenPencilNode): OpenPencilNode[];
}

export interface OpenPencilRuntimeVectorOperationAdapter {
    readonly source: '@zseven-w/pen-core/boolean-ops+path-anchors';
    canBooleanNodes(nodes: OpenPencilNode[]): boolean;
    booleanNodes(nodes: OpenPencilNode[], operation: OpenPencilBooleanOperation, idGenerator: () => string): OpenPencilNode | undefined;
    nodeToPath(node: OpenPencilNode, idGenerator?: () => string): OpenPencilNode | undefined;
    pathDataToAnchors(d: string): { anchors: OpenPencilPathAnchor[]; closed: boolean } | undefined;
    anchorsToPathData(anchors: OpenPencilPathAnchor[], closed: boolean): string;
    normalizePathAnchors(anchors: OpenPencilPathAnchor[]): OpenPencilPathAnchor[];
    updatePathAnchor(anchors: OpenPencilPathAnchor[], anchorIndex: number, anchor: OpenPencilPathAnchor): OpenPencilPathAnchor[] | undefined;
    updatePathHandle(anchors: OpenPencilPathAnchor[], anchorIndex: number, handle: OpenPencilPathHandleSide, value: OpenPencilPathHandle | null, mirror?: boolean): OpenPencilPathAnchor[] | undefined;
    insertPathAnchor(anchors: OpenPencilPathAnchor[], anchorIndex: number, anchor: OpenPencilPathAnchor): OpenPencilPathAnchor[] | undefined;
    removePathAnchor(anchors: OpenPencilPathAnchor[], anchorIndex: number): OpenPencilPathAnchor[] | undefined;
    normalizePathNodeAnchors(node: OpenPencilNode): OpenPencilNode | undefined;
}

type UpstreamChildren = OpenPencilNode[];
type UpstreamNode = UpstreamChildren[number];

export const openPencilRuntimeTreeMutations: OpenPencilRuntimeTreeMutationAdapter = {
    source: '@zseven-w/pen-core/tree-utils',
    findNode: findOpenPencilRuntimeNode,
    findParent: findOpenPencilRuntimeParent,
    insertNode: insertOpenPencilRuntimeNode,
    updateNode: updateOpenPencilRuntimeNode,
    removeNode: removeOpenPencilRuntimeNode,
    moveNode: moveOpenPencilRuntimeNode,
    replaceNode: replaceOpenPencilRuntimeNode,
    cloneNode: cloneOpenPencilRuntimeNode,
    computeLayoutChildren: computeOpenPencilRuntimeLayoutChildren
};

export const openPencilRuntimeVectorOperations: OpenPencilRuntimeVectorOperationAdapter = {
    source: '@zseven-w/pen-core/boolean-ops+path-anchors',
    canBooleanNodes: canOpenPencilRuntimeBooleanNodes,
    booleanNodes: booleanOpenPencilRuntimeNodes,
    nodeToPath: openPencilRuntimeNodeToPath,
    pathDataToAnchors: openPencilRuntimePathDataToAnchors,
    anchorsToPathData: openPencilRuntimeAnchorsToPathData,
    normalizePathAnchors: normalizeOpenPencilPathAnchors,
    updatePathAnchor: updateOpenPencilRuntimePathAnchor,
    updatePathHandle: updateOpenPencilRuntimePathHandle,
    insertPathAnchor: insertOpenPencilRuntimePathAnchor,
    removePathAnchor: removeOpenPencilRuntimePathAnchor,
    normalizePathNodeAnchors: normalizeOpenPencilRuntimePathNodeAnchors
};

const CONTAINER_NODE_TYPES = new Set<OpenPencilRuntimeNodeType>(['frame', 'group', 'rectangle']);
const PAGE_METADATA_KEYS = ['width', 'height', 'background', 'gridSize', 'showGrid', 'snapToGrid'];
const BOOLEAN_NODE_TYPES = new Set<OpenPencilRuntimeNodeType>(['rectangle', 'ellipse', 'polygon', 'path', 'line', 'frame']);

export function toOpenPencilRuntimeDocument(document: OpenPencilDocument, activePageId = document.activePageId): OpenPencilRuntimeDocument {
    const pages = orderRuntimePages(document.pages?.map(page => toOpenPencilRuntimePage(page)), activePageId);
    const children = document.children?.length
        ? document.children.map(node => toOpenPencilRuntimeNode(materializeOpenPencilRuntimeLayoutNode(node)))
        : pages?.[0]?.children ?? [];
    return {
        version: document.version,
        ...(document.name !== undefined ? { name: document.name } : {}),
        ...(activePageId !== undefined ? { activePageId } : {}),
        ...(document.themes !== undefined ? { themes: clone(document.themes) } : {}),
        ...(document.variables !== undefined ? { variables: clone(document.variables) } : {}),
        ...(pages !== undefined ? { pages } : {}),
        children
    };
}

export function fromOpenPencilRuntimeDocument(document: OpenPencilRuntimeDocument, activePageId?: string, previousDocument?: OpenPencilDocument): OpenPencilDocument {
    const requestedActivePageId = activePageId ?? document.activePageId;
    const previousRuntimeDocument = previousDocument
        ? toOpenPencilRuntimeDocument(previousDocument, requestedActivePageId ?? previousDocument.activePageId)
        : undefined;
    const runtimeDocument = previousRuntimeDocument
        ? preserveOpenPencilRuntimeManualLayoutPositions(document, previousRuntimeDocument)
        : document;
    const pages = restorePageOrder(runtimeDocument.pages?.map(page => fromOpenPencilRuntimePage(page)), previousDocument?.pages);
    const children = pages?.length ? [] : runtimeDocument.children.map(node => fromOpenPencilRuntimeNode(node));
    const resolvedActivePageId = requestedActivePageId && pages?.some(page => page.id === requestedActivePageId)
        ? requestedActivePageId
        : pages?.[0]?.id;
    return {
        version: runtimeDocument.version,
        ...(runtimeDocument.name !== undefined ? { name: runtimeDocument.name } : {}),
        ...(resolvedActivePageId !== undefined ? { activePageId: resolvedActivePageId } : {}),
        ...(runtimeDocument.themes !== undefined ? { themes: clone(runtimeDocument.themes) } : {}),
        ...(runtimeDocument.variables !== undefined ? { variables: clone(runtimeDocument.variables) } : {}),
        ...(pages !== undefined ? { pages } : {}),
        children
    };
}

export function preserveOpenPencilRuntimeManualLayoutPositions(document: OpenPencilRuntimeDocument, previousDocument: OpenPencilRuntimeDocument): OpenPencilRuntimeDocument {
    const previousNodes = new Map<string, OpenPencilRuntimeNode>();
    collectOpenPencilRuntimeNodes(previousDocument.children, previousNodes);
    previousDocument.pages?.forEach(page => collectOpenPencilRuntimeNodes(page.children, previousNodes));

    const childrenResult = preserveOpenPencilRuntimeManualLayoutNodePositions(document.children, previousNodes, false);
    const pageResults = document.pages?.map(page => {
        const result = preserveOpenPencilRuntimeManualLayoutNodePositions(page.children, previousNodes, false);
        return result.changed ? { ...page, children: result.nodes } : page;
    });
    const pagesChanged = !!pageResults?.some((page, index) => page !== document.pages?.[index]);
    if (!childrenResult.changed && !pagesChanged) {
        return document;
    }
    return {
        ...document,
        children: childrenResult.nodes,
        ...(pageResults ? { pages: pageResults } : {})
    };
}

function collectOpenPencilRuntimeNodes(nodes: readonly OpenPencilRuntimeNode[], result: Map<string, OpenPencilRuntimeNode>): void {
    for (const node of nodes) {
        result.set(node.id, node);
        if (node.children?.length) {
            collectOpenPencilRuntimeNodes(node.children, result);
        }
    }
}

function preserveOpenPencilRuntimeManualLayoutNodePositions(
    nodes: readonly OpenPencilRuntimeNode[],
    previousNodes: ReadonlyMap<string, OpenPencilRuntimeNode>,
    parentHasLayout: boolean
): { nodes: OpenPencilRuntimeNode[]; changed: boolean } {
    let changed = false;
    const nextNodes = nodes.map(node => {
        let nextNode = node;
        if (parentHasLayout
            && !isOpenPencilRuntimeOverlayNode(node)
            && openPencilRuntimeNodePositionChanged(node, previousNodes.get(node.id))) {
            nextNode = { ...nextNode, role: 'overlay' };
            changed = true;
        }
        if (nextNode.children?.length) {
            const childResult = preserveOpenPencilRuntimeManualLayoutNodePositions(
                nextNode.children,
                previousNodes,
                hasOpenPencilRuntimeLayout(nextNode)
            );
            if (childResult.changed) {
                nextNode = { ...nextNode, children: childResult.nodes };
                changed = true;
            }
        }
        return nextNode;
    });
    return { nodes: changed ? nextNodes : nodes as OpenPencilRuntimeNode[], changed };
}

function hasOpenPencilRuntimeLayout(node: OpenPencilRuntimeNode): boolean {
    return node.layout === 'vertical' || node.layout === 'horizontal';
}

function isOpenPencilRuntimeOverlayNode(node: OpenPencilRuntimeNode): boolean {
    return node.role === 'overlay';
}

function openPencilRuntimeNodePositionChanged(node: OpenPencilRuntimeNode, previous: OpenPencilRuntimeNode | undefined): boolean {
    return !!previous
        && (runtimeCoordinateChanged(node.x, previous.x) || runtimeCoordinateChanged(node.y, previous.y));
}

function runtimeCoordinateChanged(next: unknown, previous: unknown): boolean {
    return typeof next === 'number'
        && typeof previous === 'number'
        && Number.isFinite(next)
        && Number.isFinite(previous)
        && Math.abs(next - previous) >= 0.5;
}

export function toOpenPencilRuntimeSelectionState(selection: readonly string[], options: OpenPencilRuntimeSelectionOptions = {}): OpenPencilRuntimeSelectionState {
    const selectedIds = uniqueIds(filterKnownIds(selection, options.document));
    const activeId = options.activeId && selectedIds.includes(options.activeId)
        ? options.activeId
        : selectedIds[0] ?? null;
    return {
        selectedIds,
        activeId,
        hoveredId: options.hoveredId ?? null,
        enteredFrameId: options.enteredFrameId ?? null,
        enteredFrameStack: [...options.enteredFrameStack ?? []]
    };
}

export function fromOpenPencilRuntimeSelectionState(selection: OpenPencilRuntimeSelectionState, document?: OpenPencilDocument | OpenPencilRuntimeDocument): string[] {
    return uniqueIds(filterKnownIds(selection.selectedIds, document));
}

export function fromOpenPencilRuntimeSelectionChange(selection: OpenPencilRuntimeSelectionChange, document?: OpenPencilDocument | OpenPencilRuntimeDocument): string[] {
    if (Array.isArray(selection)) {
        return uniqueIds(filterKnownIds(selection, document));
    }
    if (!isRecord(selection)) {
        return [];
    }
    const selectionRecord = selection as { ids?: readonly string[]; selection?: readonly string[]; selectedIds?: readonly string[] };
    const selectedIds = selectionRecord.selectedIds ?? selectionRecord.ids ?? selectionRecord.selection ?? [];
    return uniqueIds(filterKnownIds(selectedIds, document));
}

export function toOpenPencilRuntimeInteractionEvent(type: OpenPencilRuntimeInteractionType, payload: unknown): OpenPencilRuntimeInteractionEvent {
    if (type === 'selection') {
        return { type, selectedIds: fromOpenPencilRuntimeSelectionChange(payload as OpenPencilRuntimeSelectionChange) };
    }
    if (type === 'hover') {
        return { type, hoveredId: typeof payload === 'string' || payload === null ? payload : null };
    }
    if (type === 'viewport' && isRecord(payload)) {
        return {
            type,
            viewport: {
                ...(typeof payload.zoom === 'number' ? { zoom: payload.zoom } : {}),
                ...(typeof payload.panX === 'number' ? { panX: payload.panX } : {}),
                ...(typeof payload.panY === 'number' ? { panY: payload.panY } : {})
            }
        };
    }
    return { type };
}

export function findOpenPencilRuntimeNode(children: OpenPencilNode[], nodeId: string): OpenPencilNode | undefined {
    return upstreamFindNodeInTree(asUpstreamChildren(children), nodeId) as OpenPencilNode | undefined;
}

export function findOpenPencilRuntimeParent(children: OpenPencilNode[], nodeId: string): OpenPencilNode | undefined {
    return upstreamFindParentInTree(asUpstreamChildren(children), nodeId) as OpenPencilNode | undefined;
}

export function insertOpenPencilRuntimeNode(children: OpenPencilNode[], parentId: string | null, node: OpenPencilNode, index?: number): OpenPencilRuntimeTreeMutationResult {
    if (parentId !== null && !findOpenPencilRuntimeNode(children, parentId)) {
        return { children, changed: false, failure: 'missing-parent', nodeId: node.id, parentId };
    }
    return {
        children: upstreamInsertNodeInTree(asUpstreamChildren(children), parentId, asUpstreamNode(node), index) as OpenPencilNode[],
        changed: true,
        nodeId: node.id,
        parentId
    };
}

export function updateOpenPencilRuntimeNode(children: OpenPencilNode[], nodeId: string, updates: Partial<OpenPencilNode>): OpenPencilRuntimeTreeMutationResult {
    if (!findOpenPencilRuntimeNode(children, nodeId)) {
        return { children, changed: false, failure: 'not-found', nodeId };
    }
    const nextChildren = upstreamUpdateNodeInTree(asUpstreamChildren(children), nodeId, updates as Partial<UpstreamNode>) as OpenPencilNode[];
    return { children: nextChildren, changed: nextChildren !== children, nodeId };
}

export function removeOpenPencilRuntimeNode(children: OpenPencilNode[], nodeId: string): OpenPencilRuntimeTreeMutationResult {
    if (!findOpenPencilRuntimeNode(children, nodeId)) {
        return { children, changed: false, failure: 'not-found', nodeId };
    }
    return {
        children: upstreamRemoveNodeFromTree(asUpstreamChildren(children), nodeId) as OpenPencilNode[],
        changed: true,
        nodeId
    };
}

export function moveOpenPencilRuntimeNode(children: OpenPencilNode[], nodeId: string, parentId: string | null, index?: number): OpenPencilRuntimeTreeMutationResult {
    const node = findOpenPencilRuntimeNode(children, nodeId);
    if (!node) {
        return { children, changed: false, failure: 'not-found', nodeId, parentId };
    }
    if (parentId !== null) {
        const parent = findOpenPencilRuntimeNode(children, parentId);
        if (!parent) {
            return { children, changed: false, failure: 'missing-parent', nodeId, parentId };
        }
        if (parentId === nodeId || containsOpenPencilRuntimeNode(node.children, parentId)) {
            return { children, changed: false, failure: 'invalid-parent', nodeId, parentId };
        }
    }
    const withoutNode = upstreamRemoveNodeFromTree(asUpstreamChildren(children), nodeId) as OpenPencilNode[];
    return {
        children: upstreamInsertNodeInTree(asUpstreamChildren(withoutNode), parentId, asUpstreamNode(node), index) as OpenPencilNode[],
        changed: true,
        nodeId,
        parentId
    };
}

export function replaceOpenPencilRuntimeNode(children: OpenPencilNode[], nodeId: string, replacement: OpenPencilNode): OpenPencilRuntimeTreeMutationResult {
    const parent = findOpenPencilRuntimeParent(children, nodeId);
    const siblings = parent?.children ?? children;
    const index = siblings.findIndex(node => node.id === nodeId);
    if (index < 0) {
        return { children, changed: false, failure: 'not-found', nodeId: replacement.id };
    }
    const withoutNode = upstreamRemoveNodeFromTree(asUpstreamChildren(children), nodeId) as OpenPencilNode[];
    const parentId = parent?.id ?? null;
    return {
        children: upstreamInsertNodeInTree(asUpstreamChildren(withoutNode), parentId, asUpstreamNode(replacement), index) as OpenPencilNode[],
        changed: true,
        nodeId: replacement.id,
        parentId
    };
}

export function cloneOpenPencilRuntimeNode(node: OpenPencilNode, idGenerator: () => string): OpenPencilNode {
    return upstreamCloneNodeWithNewIds(asUpstreamNode(node), idGenerator) as OpenPencilNode;
}

export function computeOpenPencilRuntimeLayoutChildren(parent: OpenPencilNode): OpenPencilNode[] {
    if (!parent.children?.length) {
        return parent.children ?? [];
    }
    const positioned = penCoreComputeLayoutPositions(parent as never, parent.children as never) as unknown as OpenPencilNode[];
    const positionedById = new Map(positioned.map(child => [child.id, child]));
    return parent.children.map(child => positionedById.get(child.id) ?? child);
}

export function canOpenPencilRuntimeBooleanNodes(nodes: OpenPencilNode[]): boolean {
    return nodes.length >= 2 && nodes.every(node => BOOLEAN_NODE_TYPES.has(node.type));
}

export function booleanOpenPencilRuntimeNodes(nodes: OpenPencilNode[], operation: OpenPencilBooleanOperation, idGenerator: () => string): OpenPencilNode | undefined {
    if (!canOpenPencilRuntimeBooleanNodes(nodes)) {
        return undefined;
    }
    if (operation !== 'exclude') {
        try {
            const upstream = executeBooleanOp(nodes as never, operation);
            if (upstream?.d) {
                return normalizeOpenPencilRuntimePathNodeAnchors({
                    ...clone(nodes[0]),
                    ...upstream,
                    id: idGenerator(),
                    type: 'path',
                    name: upstream.name ?? booleanOperationLabel(operation),
                    fillRule: 'nonzero'
                } as OpenPencilNode);
            }
        } catch {
            // Paper.js is optional in the browser host; fall back below.
        }
    }
    const geometric = booleanAxisAlignedRectangles(nodes, operation, idGenerator);
    if (geometric) {
        return normalizeOpenPencilRuntimePathNodeAnchors(geometric);
    }
    return fallbackBooleanGroup(nodes, operation, idGenerator);
}

export function openPencilRuntimeNodeToPath(node: OpenPencilNode, idGenerator?: () => string): OpenPencilNode | undefined {
    if (!BOOLEAN_NODE_TYPES.has(node.type) || node.type === 'group') {
        return undefined;
    }
    if (node.type === 'path') {
        const d = node.d || (node.anchors?.length ? openPencilRuntimeAnchorsToPathData(node.anchors, !!node.closed) : '');
        return d ? normalizeOpenPencilRuntimePathNodeAnchors({ ...clone(node), id: idGenerator ? idGenerator() : node.id, type: 'path', d }) : undefined;
    }
    const width = numericNodeSize(node.width, 100);
    const height = numericNodeSize(node.height, 100);
    const d = nodeToLocalPathData(node, width, height);
    return d ? normalizeOpenPencilRuntimePathNodeAnchors({
        ...clone(node),
        id: idGenerator ? idGenerator() : node.id,
        type: 'path',
        name: node.name ? `${node.name} path` : 'Path',
        d,
        width,
        height,
        closed: node.type !== 'line'
    }) : undefined;
}

export function openPencilRuntimePathDataToAnchors(d: string): { anchors: OpenPencilPathAnchor[]; closed: boolean } | undefined {
    const parsed = upstreamPathDataToAnchors(d);
    return parsed ? {
        anchors: parsed.anchors.map(anchor => ({
            x: anchor.x,
            y: anchor.y,
            handleIn: anchor.handleIn ? { x: anchor.handleIn.x, y: anchor.handleIn.y } : null,
            handleOut: anchor.handleOut ? { x: anchor.handleOut.x, y: anchor.handleOut.y } : null
        })),
        closed: parsed.closed
    } : undefined;
}

export function openPencilRuntimeAnchorsToPathData(anchors: OpenPencilPathAnchor[], closed: boolean): string {
    return upstreamAnchorsToPathData(toPenPathAnchors(anchors), closed);
}

export function normalizeOpenPencilRuntimePathNodeAnchors(node: OpenPencilNode): OpenPencilNode | undefined {
    if (node.type !== 'path') {
        return undefined;
    }
    if (node.anchors?.length) {
        const anchors = normalizeOpenPencilPathAnchors(node.anchors);
        const bounds = upstreamGetPathBoundsFromAnchors(toPenPathAnchors(anchors), !!node.closed);
        return {
            ...node,
            anchors,
            d: openPencilRuntimeAnchorsToPathData(anchors, !!node.closed),
            width: typeof node.width === 'number' ? node.width : Math.max(1, Math.round(bounds.width * 100) / 100),
            height: typeof node.height === 'number' ? node.height : Math.max(1, Math.round(bounds.height * 100) / 100)
        };
    }
    if (typeof node.d !== 'string' || !node.d.trim()) {
        return node;
    }
    const parsed = openPencilRuntimePathDataToAnchors(node.d);
    return parsed ? { ...node, anchors: parsed.anchors, closed: parsed.closed } : node;
}

function normalizeOpenPencilPathAnchors(anchors: OpenPencilPathAnchor[]): OpenPencilPathAnchor[] {
    return anchors.map(anchor => ({
        x: finiteNumber(anchor.x),
        y: finiteNumber(anchor.y),
        handleIn: normalizeOpenPencilPathHandle(anchor.handleIn),
        handleOut: normalizeOpenPencilPathHandle(anchor.handleOut)
    }));
}

export function updateOpenPencilRuntimePathAnchor(anchors: OpenPencilPathAnchor[], anchorIndex: number, anchor: OpenPencilPathAnchor): OpenPencilPathAnchor[] | undefined {
    if (!Number.isInteger(anchorIndex) || anchorIndex < 0 || anchorIndex >= anchors.length) {
        return undefined;
    }
    const next = normalizeOpenPencilPathAnchors(anchors);
    next[anchorIndex] = normalizeOpenPencilPathAnchors([anchor])[0];
    return next;
}

export function updateOpenPencilRuntimePathHandle(anchors: OpenPencilPathAnchor[], anchorIndex: number, handle: OpenPencilPathHandleSide, value: OpenPencilPathHandle | null, mirror = false): OpenPencilPathAnchor[] | undefined {
    if (!Number.isInteger(anchorIndex) || anchorIndex < 0 || anchorIndex >= anchors.length) {
        return undefined;
    }
    const next = normalizeOpenPencilPathAnchors(anchors);
    const anchor = next[anchorIndex];
    const normalized = normalizeOpenPencilPathHandle(value);
    if (handle === 'in') {
        anchor.handleIn = normalized;
        if (mirror) {
            anchor.handleOut = normalized ? { x: -normalized.x, y: -normalized.y } : null;
        }
    } else {
        anchor.handleOut = normalized;
        if (mirror) {
            anchor.handleIn = normalized ? { x: -normalized.x, y: -normalized.y } : null;
        }
    }
    return next;
}

export function insertOpenPencilRuntimePathAnchor(anchors: OpenPencilPathAnchor[], anchorIndex: number, anchor: OpenPencilPathAnchor): OpenPencilPathAnchor[] | undefined {
    if (!Number.isInteger(anchorIndex) || anchorIndex < 0 || anchorIndex > anchors.length) {
        return undefined;
    }
    const next = normalizeOpenPencilPathAnchors(anchors);
    next.splice(anchorIndex, 0, normalizeOpenPencilPathAnchors([anchor])[0]);
    return next;
}

export function removeOpenPencilRuntimePathAnchor(anchors: OpenPencilPathAnchor[], anchorIndex: number): OpenPencilPathAnchor[] | undefined {
    if (!Number.isInteger(anchorIndex) || anchorIndex < 0 || anchorIndex >= anchors.length || anchors.length <= 1) {
        return undefined;
    }
    const next = normalizeOpenPencilPathAnchors(anchors);
    next.splice(anchorIndex, 1);
    return next;
}

function normalizeOpenPencilPathHandle(handle: OpenPencilPathHandle | null | undefined): OpenPencilPathHandle | null {
    return handle ? { x: finiteNumber(handle.x), y: finiteNumber(handle.y) } : null;
}

function toPenPathAnchors(anchors: OpenPencilPathAnchor[]): PenPathAnchor[] {
    return anchors.map(anchor => ({
        x: anchor.x,
        y: anchor.y,
        handleIn: anchor.handleIn ? { x: anchor.handleIn.x, y: anchor.handleIn.y } : null,
        handleOut: anchor.handleOut ? { x: anchor.handleOut.x, y: anchor.handleOut.y } : null
    }));
}

function booleanAxisAlignedRectangles(nodes: OpenPencilNode[], operation: OpenPencilBooleanOperation, idGenerator: () => string): OpenPencilNode | undefined {
    if (!nodes.every(node => node.type === 'rectangle' || node.type === 'frame')) {
        return undefined;
    }
    const rects = nodes.map(nodeBounds);
    const first = nodes[0];
    if (operation === 'union') {
        const bounds = unionBounds(rects);
        return booleanPathNode(first, idGenerator(), operation, bounds, rectPathData(bounds.width, bounds.height));
    }
    if (operation === 'intersect') {
        const bounds = intersectBounds(rects);
        return bounds ? booleanPathNode(first, idGenerator(), operation, bounds, rectPathData(bounds.width, bounds.height)) : undefined;
    }
    if (operation === 'exclude') {
        const bounds = unionBounds(rects);
        const d = rects.map((rect, index) => rectPathData(rect.width, rect.height, rect.x - bounds.x, rect.y - bounds.y, index > 0)).join(' ');
        return booleanPathNode(first, idGenerator(), operation, bounds, d, 'evenodd');
    }
    const bounds = rects[0];
    const parts = [rectPathData(bounds.width, bounds.height)];
    for (const rect of rects.slice(1)) {
        const overlap = intersectBounds([bounds, rect]);
        if (overlap) {
            parts.push(rectPathData(overlap.width, overlap.height, overlap.x - bounds.x, overlap.y - bounds.y, true));
        }
    }
    return booleanPathNode(first, idGenerator(), operation, bounds, parts.join(' '), parts.length > 1 ? 'evenodd' : 'nonzero');
}

function fallbackBooleanGroup(nodes: OpenPencilNode[], operation: OpenPencilBooleanOperation, idGenerator: () => string): OpenPencilNode {
    const bounds = unionBounds(nodes.map(nodeBounds));
    return {
        id: idGenerator(),
        type: 'group',
        name: `${booleanOperationLabel(operation)} fallback`,
        role: `boolean-${operation}`,
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        children: nodes.map(node => ({ ...clone(node), x: (node.x ?? 0) - bounds.x, y: (node.y ?? 0) - bounds.y }))
    };
}

function booleanPathNode(source: OpenPencilNode, id: string, operation: OpenPencilBooleanOperation, bounds: Bounds, d: string, fillRule: 'nonzero' | 'evenodd' = 'nonzero'): OpenPencilNode {
    return {
        id,
        type: 'path',
        name: booleanOperationLabel(operation),
        role: `boolean-${operation}`,
        x: bounds.x,
        y: bounds.y,
        width: Math.max(1, Math.round(bounds.width * 100) / 100),
        height: Math.max(1, Math.round(bounds.height * 100) / 100),
        d,
        fillRule,
        fill: clone(source.fill) ?? [{ type: 'solid', color: '#e5e7eb' }],
        stroke: clone(source.stroke),
        effects: clone(source.effects),
        opacity: source.opacity
    };
}

function nodeToLocalPathData(node: OpenPencilNode, width: number, height: number): string | undefined {
    if (node.type === 'rectangle' || node.type === 'frame') {
        return rectPathData(width, height, 0, 0, false, node.cornerRadius);
    }
    if (node.type === 'ellipse') {
        return `M ${width} ${height / 2} A ${width / 2} ${height / 2} 0 0 1 ${width / 2} ${height} A ${width / 2} ${height / 2} 0 0 1 0 ${height / 2} A ${width / 2} ${height / 2} 0 0 1 ${width / 2} 0 A ${width / 2} ${height / 2} 0 0 1 ${width} ${height / 2} Z`;
    }
    if (node.type === 'line') {
        return `M 0 0 L ${width} ${height}`;
    }
    if (node.type === 'polygon') {
        const points = node.points?.length ? node.points : [{ x: width / 2, y: 0 }, { x: width, y: height }, { x: 0, y: height }];
        return `${points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')} Z`;
    }
    return node.type === 'path' ? node.d : undefined;
}

function rectPathData(width: number, height: number, x = 0, y = 0, reverse = false, cornerRadius?: OpenPencilNode['cornerRadius']): string {
    const radius = typeof cornerRadius === 'number' ? Math.max(0, Math.min(cornerRadius, width / 2, height / 2)) : 0;
    if (!radius) {
        const points = reverse
            ? [[x, y], [x, y + height], [x + width, y + height], [x + width, y]]
            : [[x, y], [x + width, y], [x + width, y + height], [x, y + height]];
        return `M ${points[0][0]} ${points[0][1]} L ${points[1][0]} ${points[1][1]} L ${points[2][0]} ${points[2][1]} L ${points[3][0]} ${points[3][1]} Z`;
    }
    return `M ${x + radius} ${y} L ${x + width - radius} ${y} A ${radius} ${radius} 0 0 1 ${x + width} ${y + radius} L ${x + width} ${y + height - radius} A ${radius} ${radius} 0 0 1 ${x + width - radius} ${y + height} L ${x + radius} ${y + height} A ${radius} ${radius} 0 0 1 ${x} ${y + height - radius} L ${x} ${y + radius} A ${radius} ${radius} 0 0 1 ${x + radius} ${y} Z`;
}

interface Bounds {
    x: number;
    y: number;
    width: number;
    height: number;
}

function nodeBounds(node: OpenPencilNode): Bounds {
    return { x: node.x ?? 0, y: node.y ?? 0, width: numericNodeSize(node.width, 0), height: numericNodeSize(node.height, 0) };
}

function unionBounds(bounds: Bounds[]): Bounds {
    const minX = Math.min(...bounds.map(item => item.x));
    const minY = Math.min(...bounds.map(item => item.y));
    const maxX = Math.max(...bounds.map(item => item.x + item.width));
    const maxY = Math.max(...bounds.map(item => item.y + item.height));
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function intersectBounds(bounds: Bounds[]): Bounds | undefined {
    const minX = Math.max(...bounds.map(item => item.x));
    const minY = Math.max(...bounds.map(item => item.y));
    const maxX = Math.min(...bounds.map(item => item.x + item.width));
    const maxY = Math.min(...bounds.map(item => item.y + item.height));
    return maxX > minX && maxY > minY ? { x: minX, y: minY, width: maxX - minX, height: maxY - minY } : undefined;
}

function numericNodeSize(value: OpenPencilNode['width'], fallback: number): number {
    if (typeof value === 'number') {
        return value;
    }
    if (typeof value === 'string') {
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }
    return fallback;
}

function booleanOperationLabel(operation: OpenPencilBooleanOperation): string {
    return operation === 'union' ? 'Union' : operation === 'subtract' ? 'Subtract' : operation === 'intersect' ? 'Intersect' : 'Exclude';
}

function upstreamFindNodeInTree(children: UpstreamChildren, nodeId: string): UpstreamNode | undefined {
    for (const child of children) {
        if (child.id === nodeId) {
            return child;
        }
        const nested = child.children ? upstreamFindNodeInTree(child.children, nodeId) : undefined;
        if (nested) {
            return nested;
        }
    }
    return undefined;
}

function upstreamFindParentInTree(children: UpstreamChildren, nodeId: string): UpstreamNode | undefined {
    for (const child of children) {
        if (child.children?.some(candidate => candidate.id === nodeId)) {
            return child;
        }
        const nested = child.children ? upstreamFindParentInTree(child.children, nodeId) : undefined;
        if (nested) {
            return nested;
        }
    }
    return undefined;
}

function upstreamInsertNodeInTree(children: UpstreamChildren, parentId: string | null, node: UpstreamNode, index?: number): UpstreamChildren {
    if (parentId === null) {
        const nextChildren = [...children];
        nextChildren.splice(index ?? nextChildren.length, 0, node);
        return nextChildren;
    }
    return children.map(child => {
        if (child.id === parentId) {
            const nextChildren = [...(child.children ?? [])];
            nextChildren.splice(index ?? nextChildren.length, 0, node);
            return { ...child, children: nextChildren };
        }
        if (child.children?.length) {
            return { ...child, children: upstreamInsertNodeInTree(child.children, parentId, node, index) };
        }
        return child;
    });
}

function upstreamUpdateNodeInTree(children: UpstreamChildren, nodeId: string, updates: Partial<UpstreamNode>): UpstreamChildren {
    if (!Object.keys(updates).length) {
        return children;
    }
    return children.map(child => {
        if (child.id === nodeId) {
            return { ...child, ...updates };
        }
        if (child.children?.length) {
            const nextChildren = upstreamUpdateNodeInTree(child.children, nodeId, updates);
            return nextChildren === child.children ? child : { ...child, children: nextChildren };
        }
        return child;
    });
}

function upstreamRemoveNodeFromTree(children: UpstreamChildren, nodeId: string): UpstreamChildren {
    return children
        .filter(child => child.id !== nodeId)
        .map(child => child.children?.length ? { ...child, children: upstreamRemoveNodeFromTree(child.children, nodeId) } : child);
}

function upstreamCloneNodeWithNewIds(node: UpstreamNode, idGenerator: () => string): UpstreamNode {
    return {
        ...node,
        id: idGenerator(),
        children: node.children?.map(child => upstreamCloneNodeWithNewIds(child, idGenerator))
    };
}

function toOpenPencilRuntimePage(page: OpenPencilPage): OpenPencilRuntimePage {
    return {
        id: page.id,
        name: page.name,
        ...copyDefined(page, PAGE_METADATA_KEYS),
        children: page.children.map(node => toOpenPencilRuntimeNode(materializeOpenPencilRuntimeLayoutNode(node)))
    };
}

function materializeOpenPencilRuntimeLayoutNode(node: OpenPencilNode, inheritedTextFill = '#1d1d1f'): OpenPencilNode {
    const withDefaults: OpenPencilNode = {
        ...clone(node),
        x: numericOpenPencilRuntimeValue(node.x, 0),
        y: numericOpenPencilRuntimeValue(node.y, 0)
    };
    const record = withDefaults as Record<string, unknown>;
    if (withDefaults.cornerRadius === undefined && typeof record.borderRadius === 'number') {
        withDefaults.cornerRadius = record.borderRadius;
    }
    if (withDefaults.type !== 'text' && withDefaults.fill === undefined) {
        const backgroundColor = typeof record.backgroundColor === 'string'
            ? normalizeOpenPencilRuntimeColorValue(record.backgroundColor)
            : typeof record.background === 'string'
                ? normalizeOpenPencilRuntimeColorValue(record.background)
                : undefined;
        if (backgroundColor) {
            withDefaults.fill = [{ type: 'solid', color: backgroundColor }];
        }
    }
    sanitizeOpenPencilRuntimePaint(withDefaults);
    withDefaults.padding = normalizeOpenPencilRuntimePaddingValue(withDefaults.padding);
    if (withDefaults.type === 'text' && !withDefaults.fill?.length) {
        withDefaults.fill = [{ type: 'solid', color: inheritedTextFill }];
    }
    const childTextFill = readableOpenPencilRuntimeTextFill(withDefaults, inheritedTextFill);
    if (withDefaults.children?.length) {
        withDefaults.children = withDefaults.children.map(child => materializeOpenPencilRuntimeLayoutNode(child, childTextFill));
        if (withDefaults.layout === 'vertical' || withDefaults.layout === 'horizontal') {
            withDefaults.children = computeOpenPencilRuntimeLayoutChildren(withDefaults)
                .map(child => materializeOpenPencilRuntimeLayoutNode(child, childTextFill));
        }
    }
    return withDefaults;
}

function normalizeOpenPencilRuntimePaddingValue(value: OpenPencilNode['padding']): OpenPencilNode['padding'] {
    if (isRecord(value)) {
        return [
            numericOpenPencilRuntimeValue(value.top, 0),
            numericOpenPencilRuntimeValue(value.right, 0),
            numericOpenPencilRuntimeValue(value.bottom, 0),
            numericOpenPencilRuntimeValue(value.left, 0)
        ];
    }
    return value;
}

function readableOpenPencilRuntimeTextFill(node: OpenPencilNode, fallback: string): string {
    const background = firstOpenPencilRuntimeSolidColor(node.fill);
    if (!background || background === 'transparent') {
        return fallback;
    }
    const rgb = parseOpenPencilRuntimeHexColor(background);
    if (!rgb) {
        return fallback;
    }
    const [red, green, blue] = rgb.map(channel => {
        const normalized = channel / 255;
        return normalized <= 0.03928 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
    });
    const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    return luminance < 0.42 ? '#ffffff' : '#1d1d1f';
}

function firstOpenPencilRuntimeSolidColor(fills: OpenPencilNode['fill']): string | undefined {
    return fills?.find(fill => fill.type === 'solid' && typeof fill.color === 'string')?.color;
}

function parseOpenPencilRuntimeHexColor(value: string): [number, number, number] | undefined {
    const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value);
    if (!match) {
        return undefined;
    }
    const hex = match[1].length === 3
        ? match[1].split('').map(character => `${character}${character}`).join('')
        : match[1];
    return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16)
    ];
}

function sanitizeOpenPencilRuntimePaint(node: OpenPencilNode): void {
    const record = node as Record<string, unknown>;
    const fill = record.fill;
    if (typeof fill === 'string') {
        const color = normalizeOpenPencilRuntimeColorValue(fill);
        if (color) {
            node.fill = [{ type: 'solid', color }];
        } else {
            delete record.fill;
        }
    } else if (Array.isArray(fill)) {
        node.fill = fill
            .map(item => sanitizeOpenPencilRuntimeFill(item))
            .filter((item): item is NonNullable<OpenPencilNode['fill']>[number] => !!item);
        if (!node.fill.length) {
            delete record.fill;
        }
    } else if (fill !== undefined) {
        delete record.fill;
    }
    const stroke = record.stroke;
    if (typeof stroke === 'string') {
        const color = normalizeOpenPencilRuntimeColorValue(stroke);
        if (color) {
            node.stroke = { color, width: 1, thickness: 1 };
        } else {
            delete record.stroke;
        }
    } else if (isRecord(stroke)) {
        const color = typeof stroke.color === 'string' ? normalizeOpenPencilRuntimeColorValue(stroke.color) : undefined;
        const width = stroke.width !== undefined ? numericOpenPencilRuntimeValue(stroke.width, 1) : undefined;
        const thickness = Array.isArray(stroke.thickness) && stroke.thickness.length === 4 && stroke.thickness.every(value => typeof value === 'number')
            ? stroke.thickness as [number, number, number, number]
            : stroke.thickness !== undefined
                ? numericOpenPencilRuntimeValue(stroke.thickness, width ?? 1)
                : width;
        const fill = Array.isArray(stroke.fill)
            ? stroke.fill.map(item => sanitizeOpenPencilRuntimeFill(item)).filter((item): item is NonNullable<OpenPencilNode['fill']>[number] => !!item)
            : undefined;
        const normalizedStroke: NonNullable<OpenPencilNode['stroke']> = {
            ...(color ? { color } : {}),
            ...(width !== undefined ? { width } : {}),
            ...(thickness !== undefined ? { thickness } : {}),
            ...(typeof stroke.opacity === 'number' ? { opacity: stroke.opacity } : {}),
            ...(stroke.align === 'inside' || stroke.align === 'center' || stroke.align === 'outside' ? { align: stroke.align } : {}),
            ...(stroke.join === 'miter' || stroke.join === 'bevel' || stroke.join === 'round' ? { join: stroke.join } : {}),
            ...(stroke.cap === 'none' || stroke.cap === 'round' || stroke.cap === 'square' ? { cap: stroke.cap } : {}),
            ...(Array.isArray(stroke.dashPattern) ? { dashPattern: stroke.dashPattern } : {}),
            ...(typeof stroke.dashOffset === 'number' ? { dashOffset: stroke.dashOffset } : {}),
            ...(fill?.length ? { fill } : {})
        };
        if (!normalizedStroke.color && !normalizedStroke.fill?.length) {
            delete record.stroke;
        } else {
            node.stroke = normalizedStroke;
        }
    } else if (stroke !== undefined) {
        delete record.stroke;
    }
}

function sanitizeOpenPencilRuntimeFill(value: unknown): NonNullable<OpenPencilNode['fill']>[number] | undefined {
    if (typeof value === 'string') {
        const color = normalizeOpenPencilRuntimeColorValue(value);
        return color ? { type: 'solid', color } : undefined;
    }
    if (!isRecord(value)) {
        return undefined;
    }
    const color = typeof value.color === 'string' ? normalizeOpenPencilRuntimeColorValue(value.color) : undefined;
    if (value.type === 'solid' || value.type === 'color' || color) {
        return {
            ...value,
            type: 'solid',
            color: color ?? '#000000'
        } as NonNullable<OpenPencilNode['fill']>[number];
    }
    if (value.type === 'gradient' || value.type === 'linear_gradient' || value.type === 'radial_gradient' || value.type === 'image') {
        return value as NonNullable<OpenPencilNode['fill']>[number];
    }
    return undefined;
}

function normalizeOpenPencilRuntimeColorValue(value: string): string | undefined {
    const trimmed = value.trim();
    if (!trimmed || trimmed.toLowerCase() === 'none') {
        return undefined;
    }
    if (trimmed === 'transparent'
        || /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(trimmed)
        || /^rgba?\(/i.test(trimmed)
        || /^hsla?\(/i.test(trimmed)) {
        return trimmed;
    }
    return OPENPENCIL_RUNTIME_CSS_COLOR_KEYWORDS[trimmed.toLowerCase().replace(/\s+/g, '')];
}

function numericOpenPencilRuntimeValue(value: unknown, fallback: number): number {
    const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number.parseFloat(value) : NaN;
    return Number.isFinite(parsed) ? parsed : fallback;
}

function fromOpenPencilRuntimePage(page: OpenPencilRuntimePage): OpenPencilPage {
    return {
        id: page.id,
        name: page.name,
        width: typeof page.width === 'number' ? page.width : 900,
        height: typeof page.height === 'number' ? page.height : 620,
        background: typeof page.background === 'string' ? page.background : '#ffffff',
        gridSize: typeof page.gridSize === 'number' ? page.gridSize : 20,
        showGrid: typeof page.showGrid === 'boolean' ? page.showGrid : true,
        snapToGrid: typeof page.snapToGrid === 'boolean' ? page.snapToGrid : false,
        children: page.children.map(node => fromOpenPencilRuntimeNode(node))
    };
}

function containsOpenPencilRuntimeNode(children: OpenPencilNode[] | undefined, nodeId: string): boolean {
    if (!children) {
        return false;
    }
    for (const child of children) {
        if (child.id === nodeId || containsOpenPencilRuntimeNode(child.children, nodeId)) {
            return true;
        }
    }
    return false;
}

function asUpstreamChildren(children: OpenPencilNode[]): UpstreamChildren {
    return children as unknown as UpstreamChildren;
}

function asUpstreamNode(node: OpenPencilNode): UpstreamNode {
    return node as unknown as UpstreamNode;
}

function orderRuntimePages(pages: OpenPencilRuntimePage[] | undefined, activePageId: string | undefined): OpenPencilRuntimePage[] | undefined {
    if (!pages?.length || !activePageId) {
        return pages;
    }
    const activeIndex = pages.findIndex(page => page.id === activePageId);
    if (activeIndex <= 0) {
        return pages;
    }
    return [pages[activeIndex], ...pages.slice(0, activeIndex), ...pages.slice(activeIndex + 1)];
}

function restorePageOrder(pages: OpenPencilPage[] | undefined, previousPages: OpenPencilPage[] | undefined): OpenPencilPage[] | undefined {
    if (!pages?.length || !previousPages?.length) {
        return pages;
    }
    const byId = new Map(pages.map(page => [page.id, page]));
    const restored = previousPages
        .map(page => byId.get(page.id))
        .filter((page): page is OpenPencilPage => !!page);
    const appended = pages.filter(page => !previousPages.some(previous => previous.id === page.id));
    return [...restored, ...appended];
}

function toOpenPencilRuntimeNode(node: OpenPencilNode): OpenPencilRuntimeNode {
    const runtime: OpenPencilRuntimeNode = {
        id: node.id,
        type: node.type,
        ...copyDefined(node, [
            'name',
            'role',
            'explain',
            'x',
            'y',
            'width',
            'height',
            'rotation',
            'opacity',
            'enabled',
            'visible',
            'locked',
            'flipX',
            'flipY',
            'theme',
            'reusable',
            'slot',
            'layout',
            'gap',
            'padding',
            'justifyContent',
            'alignItems',
            'clipContent',
            'cornerRadius',
            'fontFamily',
            'fontSize',
            'fontWeight',
            'fontStyle',
            'letterSpacing',
            'lineHeight',
            'textAlign',
            'textAlignVertical',
            'textGrowth',
            'underline',
            'strikethrough',
            'src',
            'exposure',
            'contrast',
            'saturation',
            'temperature',
            'tint',
            'highlights',
            'shadows',
            'imagePrompt',
            'imageSearchQuery',
            'd',
            'iconId',
            'anchors',
            'closed',
            'fillRule',
            'x2',
            'y2',
            'innerRadius',
            'startAngle',
            'sweepAngle',
            'iconFontFamily',
            'descendants'
        ])
    };
    if (node.fill) {
        runtime.fill = normalizeRuntimeFills(node.fill);
    }
    if (node.stroke) {
        runtime.stroke = normalizeRuntimeStroke(node.stroke);
    }
    if (node.effects) {
        runtime.effects = normalizeRuntimeEffects(node.effects);
    }
    if (node.children && CONTAINER_NODE_TYPES.has(node.type)) {
        runtime.children = node.children.map(child => toOpenPencilRuntimeNode(child));
    }
    if (node.type === 'text') {
        runtime.content = typeof node.content === 'string' || Array.isArray(node.content)
            ? clone(node.content)
            : typeof node.text === 'string'
                ? node.text
                : '';
    } else if (node.type === 'image') {
        runtime.src = typeof node.src === 'string' ? node.src : '';
        runtime.objectFit = normalizeImageFit(node.objectFit);
    } else if (node.type === 'path') {
        runtime.d = typeof node.d === 'string' ? node.d : '';
    } else if (node.type === 'polygon') {
        runtime.polygonCount = Array.isArray(node.points) && node.points.length >= 3 ? node.points.length : 3;
    } else if (node.type === 'icon_font') {
        runtime.iconFontName = typeof node.iconFontName === 'string' ? node.iconFontName : node.name ?? node.id;
    } else if (node.type === 'ref') {
        runtime.ref = typeof node.ref === 'string' ? node.ref : '';
        if (node.children) {
            runtime.children = node.children.map(child => toOpenPencilRuntimeNode(child));
        }
    }
    return runtime;
}

function fromOpenPencilRuntimeNode(node: OpenPencilRuntimeNode): OpenPencilNode {
    const local: OpenPencilNode = {
        id: node.id,
        type: node.type,
        ...copyDefined(node, [
            'name',
            'role',
            'explain',
            'x',
            'y',
            'width',
            'height',
            'rotation',
            'opacity',
            'enabled',
            'visible',
            'locked',
            'flipX',
            'flipY',
            'theme',
            'reusable',
            'slot',
            'layout',
            'gap',
            'padding',
            'justifyContent',
            'alignItems',
            'clipContent',
            'cornerRadius',
            'content',
            'fontFamily',
            'fontSize',
            'fontWeight',
            'fontStyle',
            'letterSpacing',
            'lineHeight',
            'textAlign',
            'textAlignVertical',
            'textGrowth',
            'underline',
            'strikethrough',
            'src',
            'exposure',
            'contrast',
            'saturation',
            'temperature',
            'tint',
            'highlights',
            'shadows',
            'imagePrompt',
            'imageSearchQuery',
            'objectFit',
            'd',
            'iconId',
            'anchors',
            'closed',
            'fillRule',
            'x2',
            'y2',
            'polygonCount',
            'innerRadius',
            'startAngle',
            'sweepAngle',
            'iconFontName',
            'iconFontFamily',
            'ref',
            'descendants'
        ])
    };
    if (node.fill) {
        local.fill = node.fill.map(fill => clone(fill) as OpenPencilFill);
    }
    if (node.stroke) {
        local.stroke = fromOpenPencilRuntimeStroke(node.stroke);
    }
    if (node.effects) {
        local.effects = node.effects.map(effect => clone(effect) as OpenPencilEffect);
    }
    if (node.children) {
        local.children = node.children.map(child => fromOpenPencilRuntimeNode(child));
    }
    return local;
}

function normalizeRuntimeFills(fills: OpenPencilFill[]): OpenPencilRuntimeFill[] {
    return fills.map(fill => normalizeRuntimeFill(fill)).filter((fill): fill is OpenPencilRuntimeFill => !!fill);
}

function normalizeRuntimeFill(fill: OpenPencilFill): OpenPencilRuntimeFill | undefined {
    const color = typeof fill.color === 'string' ? normalizeOpenPencilRuntimeColorValue(fill.color) : undefined;
    if (fill.type === 'solid' || fill.type === 'color' || color) {
        return {
            ...copyDefined(fill, ['explain', 'opacity', 'blendMode']),
            type: 'solid',
            color: color ?? '#000000'
        };
    }
    if (fill.type === 'gradient' || fill.type === 'linear_gradient') {
        return {
            ...copyDefined(fill, ['explain', 'opacity', 'blendMode', 'angle']),
            type: 'linear_gradient',
            stops: normalizeRuntimeGradientStops(fill)
        };
    }
    if (fill.type === 'radial_gradient') {
        return {
            ...copyDefined(fill, ['explain', 'opacity', 'blendMode', 'cx', 'cy', 'radius']),
            type: 'radial_gradient',
            stops: normalizeRuntimeGradientStops(fill)
        };
    }
    if (fill.type === 'image') {
        const source = typeof fill.url === 'string' ? fill.url : typeof fill.src === 'string' ? fill.src : '';
        return {
            ...copyDefined(fill, [
                'explain',
                'opacity',
                'originalSize',
                'transform',
                'exposure',
                'contrast',
                'saturation',
                'temperature',
                'tint',
                'highlights',
                'shadows'
            ]),
            type: 'image',
            url: source,
            mode: normalizeImageFillMode(fill.mode)
        };
    }
    return undefined;
}

function normalizeRuntimeGradientStops(fill: OpenPencilFill): OpenPencilRuntimeGradientStop[] {
    const rawStops = Array.isArray(fill.stops) ? fill.stops : Array.isArray(fill.colors) ? fill.colors : [];
    const stopCount = rawStops.length;
    return rawStops.map((rawStop, index) => {
        const stop = isRecord(rawStop) ? rawStop : {};
        const rawOffset = typeof stop.offset === 'number'
            ? stop.offset
            : typeof stop.position === 'number'
                ? stop.position
                : index / Math.max(stopCount - 1, 1);
        return {
            offset: clamp01(rawOffset > 1 ? rawOffset / 100 : rawOffset),
            color: typeof stop.color === 'string' ? stop.color : '#000000'
        };
    });
}

function normalizeRuntimeStroke(stroke: OpenPencilStroke): OpenPencilRuntimeStroke {
    const thickness = typeof stroke.thickness === 'number' || Array.isArray(stroke.thickness)
        ? stroke.thickness
        : typeof stroke.width === 'number'
            ? stroke.width
            : 1;
    const fill: OpenPencilRuntimeFill[] | undefined = stroke.fill
        ? normalizeRuntimeFills(stroke.fill)
        : typeof stroke.color === 'string'
            ? [{ type: 'solid', color: stroke.color }]
            : undefined;
    return {
        ...copyDefined(stroke, ['align', 'join', 'cap', 'dashPattern', 'dashOffset']),
        thickness,
        ...(fill?.length ? { fill } : {})
    };
}

function fromOpenPencilRuntimeStroke(stroke: OpenPencilRuntimeStroke): OpenPencilStroke {
    const firstSolid = stroke.fill?.find(fill => fill.type === 'solid');
    const width = typeof stroke.thickness === 'number' ? stroke.thickness : stroke.thickness[0];
    return {
        ...copyDefined(stroke, ['align', 'join', 'cap', 'dashPattern', 'dashOffset']),
        thickness: clone(stroke.thickness),
        width,
        ...(firstSolid?.color ? { color: firstSolid.color } : {}),
        ...(stroke.fill ? { fill: stroke.fill.map(fill => clone(fill) as OpenPencilFill) } : {})
    };
}

function normalizeRuntimeEffects(effects: OpenPencilEffect[]): OpenPencilRuntimeEffect[] {
    return effects.map(effect => {
        if (effect.type === 'shadow') {
            return {
                type: 'shadow',
                ...(effect.inner !== undefined ? { inner: effect.inner } : {}),
                offsetX: numberOrZero(effect.offsetX),
                offsetY: numberOrZero(effect.offsetY),
                blur: numberOrZero(effect.blur),
                spread: numberOrZero(effect.spread),
                color: effect.color
            };
        }
        return {
            type: effect.type,
            radius: numberOrZero(effect.radius)
        };
    });
}

function normalizeImageFit(value: unknown): 'fill' | 'fit' | 'crop' | 'tile' | undefined {
    if (value === 'fill' || value === 'fit' || value === 'crop' || value === 'tile') {
        return value;
    }
    if (value === 'contain') {
        return 'fit';
    }
    if (value === 'cover') {
        return 'fill';
    }
    return undefined;
}

function normalizeImageFillMode(value: unknown): 'fill' | 'fit' | 'crop' | 'tile' | 'stretch' | undefined {
    if (value === 'fill' || value === 'fit' || value === 'crop' || value === 'tile' || value === 'stretch') {
        return value;
    }
    return undefined;
}

function filterKnownIds(selection: readonly string[], document: OpenPencilDocument | OpenPencilRuntimeDocument | undefined): string[] {
    if (!document) {
        return [...selection];
    }
    const ids = collectNodeIds(document);
    return selection.filter(id => ids.has(id));
}

function collectNodeIds(document: OpenPencilDocument | OpenPencilRuntimeDocument): Set<string> {
    const ids = new Set<string>();
    const visit = (nodes: Array<OpenPencilNode | OpenPencilRuntimeNode>) => {
        for (const node of nodes) {
            ids.add(node.id);
            if (node.children) {
                visit(node.children);
            }
        }
    };
    visit(document.children);
    for (const page of document.pages ?? []) {
        visit(page.children);
    }
    return ids;
}

function uniqueIds(ids: readonly string[]): string[] {
    return Array.from(new Set(ids));
}

function copyDefined<T extends object>(source: T, keys: string[]): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const record = source as Record<string, unknown>;
    for (const key of keys) {
        if (record[key] !== undefined) {
            result[key] = clone(record[key]);
        }
    }
    return result;
}

function numberOrZero(value: number | string): number {
    const parsed = typeof value === 'number' ? value : Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function finiteNumber(value: number): number {
    return Number.isFinite(value) ? value : 0;
}

function clamp01(value: number): number {
    return Math.max(0, Math.min(1, value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function clone<T>(value: T): T {
    if (value === undefined || value === null) {
        return value;
    }
    return JSON.parse(JSON.stringify(value)) as T;
}

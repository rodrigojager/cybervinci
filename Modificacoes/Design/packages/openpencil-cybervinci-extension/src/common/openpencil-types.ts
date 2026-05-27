// OpenPencil-compatible subset of the .op JSON document schema.

export const OPENPENCIL_FILE_EXTENSION = '.op';
export const OPENPENCIL_UIKIT_FILE_EXTENSIONS = [OPENPENCIL_FILE_EXTENSION, '.pen'] as const;
export const OPENPENCIL_DOCUMENT_VERSION = '0.7.6';

export interface OpenPencilPage {
    [key: string]: unknown;
    id: string;
    name: string;
    width?: number;
    height?: number;
    background?: string;
    gridSize?: number;
    showGrid?: boolean;
    snapToGrid?: boolean;
    children: OpenPencilNode[];
}

export interface OpenPencilDocument {
    [key: string]: unknown;
    version: string;
    name?: string;
    activePageId?: string;
    pages?: OpenPencilPage[];
    children: OpenPencilNode[];
    variables?: Record<string, OpenPencilVariableDefinition>;
    themes?: OpenPencilThemeMap;
}

export interface OpenPencilDocumentStateSnapshot {
    document: OpenPencilDocument;
    selection: string[];
    serialized: string;
}

export type OpenPencilNodeType =
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

export interface OpenPencilSolidFill {
    [key: string]: unknown;
    type: 'solid';
    color: string;
    explain?: string;
    opacity?: number;
}

export interface OpenPencilFill {
    [key: string]: unknown;
    type: string;
    color?: string;
    url?: string;
    src?: string;
    mode?: 'fill' | 'fit' | 'crop' | 'tile' | 'stretch';
    stops?: Array<{ offset?: number; position?: number; color?: string }>;
    colors?: Array<{ offset?: number; position?: number; color?: string }>;
    angle?: number;
    explain?: string;
    opacity?: number;
    blendMode?: string;
}

export interface OpenPencilStyledTextSegment {
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

export type OpenPencilVariableValue = string | number | boolean | OpenPencilThemedValue[];

export interface OpenPencilThemedValue {
    value: string | number | boolean;
    theme?: Record<string, string>;
}

export interface OpenPencilVariableDefinition {
    [key: string]: unknown;
    type?: 'color' | 'number' | 'boolean' | 'string';
    value: OpenPencilVariableValue;
}

export type OpenPencilThemeMap = Record<string, string[]>;

export interface OpenPencilStroke {
    [key: string]: unknown;
    color?: string;
    width?: number;
    thickness?: number | [number, number, number, number] | string;
    opacity?: number;
    fill?: OpenPencilFill[];
    align?: 'inside' | 'center' | 'outside';
    join?: 'miter' | 'bevel' | 'round';
    cap?: 'none' | 'round' | 'square';
    dashPattern?: number[];
    dashOffset?: number;
}

export type OpenPencilBooleanOperation = 'union' | 'subtract' | 'intersect' | 'exclude';

export interface OpenPencilPathHandle {
    x: number;
    y: number;
}

export type OpenPencilPathHandleSide = 'in' | 'out';

export interface OpenPencilPathAnchor {
    x: number;
    y: number;
    handleIn?: OpenPencilPathHandle | null;
    handleOut?: OpenPencilPathHandle | null;
}

export interface OpenPencilShadowEffect {
    [key: string]: unknown;
    type: 'shadow';
    inner?: boolean;
    offsetX: number | string;
    offsetY: number | string;
    blur: number | string;
    spread: number | string;
    color: string;
}

export interface OpenPencilBlurEffect {
    [key: string]: unknown;
    type: 'blur' | 'background_blur';
    radius: number | string;
}

export type OpenPencilEffect = OpenPencilShadowEffect | OpenPencilBlurEffect;

export type OpenPencilSizingBehavior = number | 'fit_content' | 'fill_container' | string;
export type OpenPencilLayoutMode = 'none' | 'vertical' | 'horizontal';
export type OpenPencilSpacing = number | string;
export type OpenPencilPadding = number | [number, number] | [number, number, number, number] | string;

export interface OpenPencilNode {
    [key: string]: unknown;
    id: string;
    type: OpenPencilNodeType;
    name?: string;
    role?: string;
    explain?: string;
    x?: number;
    y?: number;
    width?: OpenPencilSizingBehavior;
    height?: OpenPencilSizingBehavior;
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
    layout?: OpenPencilLayoutMode;
    gap?: OpenPencilSpacing;
    padding?: OpenPencilPadding;
    justifyContent?: 'start' | 'center' | 'end' | 'space_between' | 'space_around';
    alignItems?: 'start' | 'center' | 'end';
    clipContent?: boolean;
    fill?: OpenPencilFill[];
    stroke?: OpenPencilStroke;
    effects?: OpenPencilEffect[];
    cornerRadius?: number | [number, number, number, number];
    content?: string | OpenPencilStyledTextSegment[];
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
    objectFit?: 'fill' | 'fit' | 'crop' | 'tile' | 'cover' | 'contain';
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
    descendants?: Record<string, Partial<OpenPencilNode>>;
    points?: Array<{ x: number; y: number }>;
    children?: OpenPencilNode[];
}

export type OpenPencilNodeChanges = Partial<Omit<OpenPencilNode, 'id' | 'type' | 'children'>> & {
    children?: OpenPencilNode[];
};

export type OpenPencilNodeLayoutChanges = Partial<Pick<
    OpenPencilNode,
    'layout' | 'gap' | 'padding' | 'justifyContent' | 'alignItems' | 'clipContent'
>>;

export type OpenPencilDesignOperation =
    | { operation: 'addNode'; parentId?: string | null; node: OpenPencilNode; index?: number }
    | { operation: 'createNode'; parentId?: string | null; node: Partial<OpenPencilNode> & { type?: OpenPencilNodeType }; index?: number }
    | { operation: 'updateNode'; nodeId: string; changes: OpenPencilNodeChanges }
    | { operation: 'removeNode'; nodeId: string }
    | { operation: 'deleteNode'; nodeId: string }
    | { operation: 'replaceNode'; nodeId: string; node: Partial<OpenPencilNode> & { type?: OpenPencilNodeType } }
    | { operation: 'moveNode'; nodeId: string; x: number; y: number }
    | { operation: 'resizeNode'; nodeId: string; x?: number; y?: number; width: number; height: number }
    | { operation: 'moveToParent'; nodeId: string; parentId?: string | null; index?: number }
    | { operation: 'nudgeNodes'; nodeIds: string[]; dx: number; dy: number }
    | { operation: 'alignNodes'; nodeIds: string[]; alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' }
    | { operation: 'distributeNodes'; nodeIds: string[]; direction: 'horizontal' | 'vertical' }
    | { operation: 'duplicateNode'; nodeId: string }
    | { operation: 'reorderNode'; nodeId: string; index: number }
    | { operation: 'bringForward'; nodeId: string }
    | { operation: 'sendBackward'; nodeId: string }
    | { operation: 'bringToFront'; nodeId: string }
    | { operation: 'sendToBack'; nodeId: string }
    | { operation: 'groupNodes'; nodeIds: string[] }
    | { operation: 'ungroupNode'; nodeId: string }
    | { operation: 'booleanNodes'; nodeIds: string[]; booleanOperation: OpenPencilBooleanOperation }
    | { operation: 'convertToPath'; nodeIds: string[] }
    | { operation: 'updatePathAnchors'; nodeId: string; anchors: OpenPencilPathAnchor[]; closed?: boolean }
    | { operation: 'updatePathAnchor'; nodeId: string; anchorIndex: number; anchor: OpenPencilPathAnchor; closed?: boolean }
    | { operation: 'updatePathHandle'; nodeId: string; anchorIndex: number; handle: OpenPencilPathHandleSide; value: OpenPencilPathHandle | null; mirror?: boolean; closed?: boolean }
    | { operation: 'insertPathAnchor'; nodeId: string; anchorIndex: number; anchor: OpenPencilPathAnchor }
    | { operation: 'removePathAnchor'; nodeId: string; anchorIndex: number }
    | { operation: 'addPage'; page?: Partial<OpenPencilPage>; index?: number; makeActive?: boolean }
    | { operation: 'updatePage'; pageId: string; changes: Partial<Pick<OpenPencilPage, 'name' | 'width' | 'height' | 'background' | 'gridSize' | 'showGrid' | 'snapToGrid' | 'children'>> }
    | { operation: 'removePage'; pageId: string }
    | { operation: 'setActivePage'; pageId: string }
    | { operation: 'setVariable'; name: string; variable: OpenPencilVariableDefinition }
    | { operation: 'updateVariable'; name: string; changes: Partial<OpenPencilVariableDefinition> }
    | { operation: 'removeVariable'; name: string }
    | { operation: 'setThemes'; themes: OpenPencilThemeMap }
    | { operation: 'updateThemeAxis'; axis: string; values: string[] }
    | { operation: 'removeThemeAxis'; axis: string }
    | { operation: 'setNodeTheme'; nodeId: string; theme: Record<string, string> }
    | { operation: 'clearNodeTheme'; nodeId: string; axes?: string[] }
    | { operation: 'setNodeLayout'; nodeId: string; layout: OpenPencilNodeLayoutChanges; normalizeChildren?: boolean }
    | { operation: 'autoLayoutNode'; nodeId: string; direction?: 'vertical' | 'horizontal'; gap?: OpenPencilSpacing; padding?: OpenPencilPadding; justifyContent?: OpenPencilNode['justifyContent']; alignItems?: OpenPencilNode['alignItems']; normalizeChildren?: boolean }
    | { operation: 'setSelection'; nodeIds: string[] };

export interface OpenPencilStructuredCommandFile {
    version?: string;
    target?: string;
    operations: OpenPencilDesignOperation[];
}

export type OpenPencilStructuredCommandInput = OpenPencilDesignOperation | OpenPencilDesignOperation[] | OpenPencilStructuredCommandFile;

export interface OpenPencilCommandResult {
    document: OpenPencilDocument;
    selection: string[];
    changed: boolean;
    message?: string;
}

export interface OpenPencilDocumentSummary {
    name: string;
    version: string;
    activePageId?: string;
    pages: Array<{
        id: string;
        name: string;
        width?: number;
        height?: number;
        background?: string;
        gridSize?: number;
        showGrid?: boolean;
        snapToGrid?: boolean;
        nodes: number;
    }>;
    nodes: Array<{
        id: string;
        type: OpenPencilNodeType;
        name?: string;
        text?: string;
    }>;
    variables?: string[];
    themes?: OpenPencilThemeMap;
}

export interface OpenPencilValidationIssue {
    severity: 'error' | 'warning';
    path: string;
    message: string;
}

export interface OpenPencilValidationResult {
    valid: boolean;
    issues: OpenPencilValidationIssue[];
}

export type OpenPencilExportFormat = 'openpencil-json' | 'openpencil-summary-json' | 'react-tailwind' | 'html-css' | 'svg' | 'vue' | 'svelte' | 'react-native' | 'flutter' | 'swiftui' | 'jetpack-compose';

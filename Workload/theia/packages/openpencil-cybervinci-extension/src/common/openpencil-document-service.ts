import {
    OPENPENCIL_DOCUMENT_VERSION,
    OPENPENCIL_FILE_EXTENSION,
    OPENPENCIL_UIKIT_FILE_EXTENSIONS,
    OpenPencilDocument,
    OpenPencilEffect,
    OpenPencilFill,
    OpenPencilNode,
    OpenPencilNodeType,
    OpenPencilPage,
    OpenPencilThemeMap,
    OpenPencilThemedValue,
    OpenPencilValidationIssue,
    OpenPencilValidationResult,
    OpenPencilVariableDefinition
} from './openpencil-types';

export class OpenPencilDocumentParseError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'OpenPencilDocumentParseError';
    }
}

interface OpenPencilNormalizationContext {
    usedIds: Set<string>;
}

const OPENPENCIL_NODE_TYPE_ALIASES: Record<string, OpenPencilNodeType> = {
    artboard: 'frame',
    component: 'frame',
    container: 'frame',
    frame: 'frame',
    group: 'group',
    rect: 'rectangle',
    rectangle: 'rectangle',
    shape: 'rectangle',
    box: 'rectangle',
    ellipse: 'ellipse',
    oval: 'ellipse',
    circle: 'ellipse',
    line: 'line',
    polygon: 'polygon',
    poly: 'polygon',
    path: 'path',
    vector: 'path',
    text: 'text',
    textbox: 'text',
    text_box: 'text',
    label: 'text',
    image: 'image',
    img: 'image',
    bitmap: 'image',
    icon: 'icon_font',
    iconfont: 'icon_font',
    icon_font: 'icon_font',
    ref: 'ref',
    reference: 'ref',
    instance: 'ref'
};

const FIGMA_NODE_TYPE_ALIASES: Record<string, OpenPencilNodeType> = {
    boolean_operation: 'group',
    canvas: 'frame',
    component_set: 'frame',
    document: 'frame',
    frame: 'frame',
    group: 'group',
    instance: 'ref',
    line: 'line',
    ellipse: 'ellipse',
    rectangle: 'rectangle',
    rounded_rectangle: 'rectangle',
    regular_polygon: 'polygon',
    polygon: 'polygon',
    star: 'polygon',
    text: 'text',
    vector: 'path'
};

export class OpenPencilDocumentService {
    createDesign(name = 'Untitled Design'): OpenPencilDocument {
        const pageId = this.generateId('page');
        return {
            version: OPENPENCIL_DOCUMENT_VERSION,
            name,
            activePageId: pageId,
            children: [],
            pages: [{
                id: pageId,
                name: 'Page 1',
                width: 900,
                height: 620,
                background: '#ffffff',
                gridSize: 20,
                showGrid: true,
                snapToGrid: false,
                children: [
                    {
                        id: 'hero-card',
                        type: 'rectangle',
                        name: 'Hero card',
                        x: 120,
                        y: 96,
                        width: 520,
                        height: 260,
                        cornerRadius: 24,
                        fill: [{ type: 'solid', color: '#f8fafc' }],
                        stroke: { color: '#cbd5e1', width: 1 }
                    },
                    {
                        id: 'hero-title',
                        type: 'text',
                        name: 'Hero title',
                        x: 160,
                        y: 144,
                        width: 440,
                        height: 64,
                        content: 'OpenPencil Design',
                        fontSize: 36,
                        fontWeight: 700,
                        fill: [{ type: 'solid', color: '#111827' }]
                    },
                    {
                        id: 'hero-copy',
                        type: 'text',
                        name: 'Hero copy',
                        x: 162,
                        y: 226,
                        width: 380,
                        height: 48,
                        content: 'Edit this embedded .op design inside Theia.',
                        fontSize: 18,
                        fill: [{ type: 'solid', color: '#475569' }]
                    }
                ]
            }]
        };
    }

    deserialize(content: string): OpenPencilDocument {
        try {
            const parsed = JSON.parse(content) as unknown;
            return this.normalizeDocument(parsed);
        } catch (error) {
            if (error instanceof OpenPencilDocumentParseError) {
                throw error;
            }
            const repaired = this.repairJsonContent(content);
            if (repaired !== content) {
                try {
                    const parsed = JSON.parse(repaired) as unknown;
                    return this.normalizeDocument(parsed);
                } catch {
                    // Report the original parse failure. Repair is intentionally best-effort.
                }
            }
            throw new OpenPencilDocumentParseError(error instanceof Error ? error.message : 'Invalid JSON');
        }
    }

    serialize(document: OpenPencilDocument): string {
        return `${JSON.stringify(this.normalizeDocument(document), undefined, 2)}\n`;
    }

    normalize(document: OpenPencilDocument): OpenPencilDocument {
        return this.normalizeDocument(document);
    }

    validateDocument(document: OpenPencilDocument): OpenPencilValidationResult {
        const issues: OpenPencilValidationIssue[] = [];
        if (!document.version) {
            issues.push({ severity: 'warning', path: '/version', message: 'Document version is missing; it will be normalized on save.' });
        }
        if (!document.pages?.length) {
            issues.push({ severity: 'error', path: '/pages', message: 'Document must contain at least one page.' });
        }
        if (document.activePageId && document.pages?.length && !document.pages.some(page => page.id === document.activePageId)) {
            issues.push({ severity: 'error', path: '/activePageId', message: `Active page '${document.activePageId}' does not exist.` });
        }
        const ids = new Set<string>();
        const visitNodes = (nodes: OpenPencilNode[] | undefined, path: string) => {
            for (let index = 0; index < (nodes ?? []).length; index++) {
                const node = nodes![index];
                const nodePath = `${path}/${index}`;
                if (!node.id) {
                    issues.push({ severity: 'error', path: `${nodePath}/id`, message: 'Node id is missing.' });
                } else if (ids.has(node.id)) {
                    issues.push({ severity: 'error', path: `${nodePath}/id`, message: `Duplicate node id '${node.id}'.` });
                } else {
                    ids.add(node.id);
                }
                if (!this.isKnownNodeType(node.type)) {
                    issues.push({ severity: 'error', path: `${nodePath}/type`, message: `Unknown node type '${String(node.type)}'.` });
                }
                if (node.children) {
                    visitNodes(node.children, `${nodePath}/children`);
                }
            }
        };
        const pageIds = new Set<string>();
        for (let index = 0; index < (document.pages ?? []).length; index++) {
            const page = document.pages![index];
            const pagePath = `/pages/${index}`;
            if (!page.id) {
                issues.push({ severity: 'error', path: `${pagePath}/id`, message: 'Page id is missing.' });
            } else if (pageIds.has(page.id)) {
                issues.push({ severity: 'error', path: `${pagePath}/id`, message: `Duplicate page id '${page.id}'.` });
            } else {
                pageIds.add(page.id);
            }
            if (!Array.isArray(page.children)) {
                issues.push({ severity: 'error', path: `${pagePath}/children`, message: 'Page children must be an array.' });
            } else {
                visitNodes(page.children, `${pagePath}/children`);
            }
        }
        for (const [axis, values] of Object.entries(document.themes ?? {})) {
            if (!axis.trim()) {
                issues.push({ severity: 'error', path: '/themes', message: 'Theme axis names must not be empty.' });
            }
            if (!Array.isArray(values) || values.some(value => typeof value !== 'string' || !value.trim())) {
                issues.push({ severity: 'error', path: `/themes/${axis}`, message: 'Theme axis values must be non-empty strings.' });
            }
        }
        for (const [name, variable] of Object.entries(document.variables ?? {})) {
            if (!name.trim()) {
                issues.push({ severity: 'error', path: '/variables', message: 'Variable names must not be empty.' });
            }
            if (!this.isRecord(variable) || !('value' in variable)) {
                issues.push({ severity: 'error', path: `/variables/${name}`, message: 'Variable must include a value.' });
            }
        }
        return {
            valid: issues.every(issue => issue.severity !== 'error'),
            issues
        };
    }

    protected repairJsonContent(content: string): string {
        return this.removeTrailingCommas(this.stripJsonComments(content.replace(/^\uFEFF/, '')));
    }

    protected stripJsonComments(content: string): string {
        let result = '';
        let inString = false;
        let escaped = false;
        for (let index = 0; index < content.length; index++) {
            const current = content[index];
            const next = content[index + 1];
            if (inString) {
                result += current;
                if (escaped) {
                    escaped = false;
                } else if (current === '\\') {
                    escaped = true;
                } else if (current === '"') {
                    inString = false;
                }
                continue;
            }
            if (current === '"') {
                inString = true;
                result += current;
                continue;
            }
            if (current === '/' && next === '/') {
                while (index < content.length && content[index] !== '\n') {
                    index++;
                }
                result += content[index] ?? '';
                continue;
            }
            if (current === '/' && next === '*') {
                index += 2;
                while (index < content.length && !(content[index] === '*' && content[index + 1] === '/')) {
                    index++;
                }
                index++;
                continue;
            }
            result += current;
        }
        return result;
    }

    protected removeTrailingCommas(content: string): string {
        let result = '';
        let inString = false;
        let escaped = false;
        for (let index = 0; index < content.length; index++) {
            const current = content[index];
            if (inString) {
                result += current;
                if (escaped) {
                    escaped = false;
                } else if (current === '\\') {
                    escaped = true;
                } else if (current === '"') {
                    inString = false;
                }
                continue;
            }
            if (current === '"') {
                inString = true;
                result += current;
                continue;
            }
            if (current === ',') {
                let lookahead = index + 1;
                while (/\s/.test(content[lookahead] ?? '')) {
                    lookahead++;
                }
                if (content[lookahead] === '}' || content[lookahead] === ']') {
                    continue;
                }
            }
            result += current;
        }
        return result;
    }

    isOpenPencilFile(path: string): boolean {
        return path.toLowerCase().endsWith(OPENPENCIL_FILE_EXTENSION);
    }

    isOpenPencilUIKitFile(path: string): boolean {
        const lowerPath = path.toLowerCase();
        return OPENPENCIL_UIKIT_FILE_EXTENSIONS.some(extension => lowerPath.endsWith(extension));
    }

    getActivePage(document: OpenPencilDocument): OpenPencilPage {
        if (!document.pages?.length) {
            document.pages = [{
                id: this.generateId('page'),
                name: 'Page 1',
                width: 900,
                height: 620,
                background: '#ffffff',
                gridSize: 20,
                showGrid: true,
                snapToGrid: false,
                children: document.children ?? []
            }];
        }
        const activePage = document.pages.find(page => page.id === document.activePageId);
        if (activePage) {
            return activePage;
        }
        document.activePageId = document.pages[0].id;
        return document.pages[0];
    }

    findPage(document: OpenPencilDocument, pageId: string): OpenPencilPage | undefined {
        return document.pages?.find(page => page.id === pageId);
    }

    createPage(name?: string): OpenPencilPage {
        return {
            id: this.generateId('page'),
            name: name || 'New Page',
            width: 900,
            height: 620,
            background: '#ffffff',
            gridSize: 20,
            showGrid: true,
            snapToGrid: false,
            children: []
        };
    }

    findNode(document: OpenPencilDocument, nodeId: string): OpenPencilNode | undefined {
        return this.findNodeInList(this.getActivePage(document).children, nodeId);
    }

    flattenNodes(document: OpenPencilDocument): OpenPencilNode[] {
        const flattened: OpenPencilNode[] = [];
        const visit = (nodes: OpenPencilNode[]) => {
            for (const node of nodes) {
                flattened.push(node);
                if (node.children) {
                    visit(node.children);
                }
            }
        };
        visit(this.getActivePage(document).children);
        return flattened;
    }

    cloneDocument(document: OpenPencilDocument): OpenPencilDocument {
        return JSON.parse(JSON.stringify(document)) as OpenPencilDocument;
    }

    getDefaultTheme(themes: OpenPencilDocument['themes']): Record<string, string> {
        const theme: Record<string, string> = {};
        for (const [axis, values] of Object.entries(themes ?? {})) {
            if (values.length > 0) {
                theme[axis] = values[0];
            }
        }
        return theme;
    }

    resolveVariableReference(reference: string, variables: OpenPencilDocument['variables'], activeTheme?: Record<string, string>): string | number | boolean | undefined {
        if (!this.isVariableReference(reference)) {
            return undefined;
        }
        const variable = variables?.[reference.slice(1)];
        if (!variable) {
            return undefined;
        }
        const value = Array.isArray(variable.value)
            ? this.resolveThemedValue(variable.value, activeTheme)
            : variable.value;
        return typeof value === 'string' && this.isVariableReference(value) ? undefined : value;
    }

    resolveColorReference(value: string | undefined, variables: OpenPencilDocument['variables'], activeTheme?: Record<string, string>): string | undefined {
        if (value === undefined || !this.isVariableReference(value)) {
            return value;
        }
        const resolved = this.resolveVariableReference(value, variables, activeTheme);
        return typeof resolved === 'string' ? resolved : undefined;
    }

    resolveNumberReference(value: number | string | undefined, variables: OpenPencilDocument['variables'], activeTheme?: Record<string, string>): number | undefined {
        if (typeof value === 'number') {
            return value;
        }
        if (typeof value !== 'string') {
            return undefined;
        }
        if (this.isVariableReference(value)) {
            const resolved = this.resolveVariableReference(value, variables, activeTheme);
            return typeof resolved === 'number' ? resolved : undefined;
        }
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed : undefined;
    }

    resolveNodeVariables(node: OpenPencilNode, variables: OpenPencilDocument['variables'], activeTheme?: Record<string, string>): OpenPencilNode {
        if (!variables || Object.keys(variables).length === 0) {
            return node;
        }
        const theme = { ...activeTheme, ...node.theme };
        const resolved: OpenPencilNode = { ...node };

        if (typeof node.opacity === 'string' && this.isVariableReference(node.opacity)) {
            resolved.opacity = this.resolveNumberReference(node.opacity, variables, theme) ?? 1;
        }
        if (typeof node.enabled === 'string' && this.isVariableReference(node.enabled)) {
            const value = this.resolveVariableReference(node.enabled, variables, theme);
            if (typeof value === 'boolean') {
                resolved.enabled = value;
            }
        }
        if (typeof node.gap === 'string' && this.isVariableReference(node.gap)) {
            resolved.gap = this.resolveNumberReference(node.gap, variables, theme) ?? 0;
        }
        if (typeof node.padding === 'string' && this.isVariableReference(node.padding)) {
            resolved.padding = this.resolveNumberReference(node.padding, variables, theme) ?? 0;
        }
        if (node.fill) {
            resolved.fill = this.resolveFillVariables(node.fill, variables, theme);
        }
        if (node.stroke) {
            resolved.stroke = this.resolveStrokeVariables(node.stroke, variables, theme);
        }
        if (node.effects) {
            resolved.effects = this.resolveEffectVariables(node.effects, variables, theme);
        }
        if (node.type === 'text' && typeof node.content === 'string' && this.isVariableReference(node.content)) {
            const value = this.resolveVariableReference(node.content, variables, theme);
            if (typeof value === 'string') {
                resolved.content = value;
            }
        }
        if (node.children) {
            resolved.children = node.children.map(child => this.resolveNodeVariables(child, variables, theme));
        }
        return resolved;
    }

    generateId(prefix = 'node'): string {
        const random = Math.random().toString(36).slice(2, 8);
        return `${prefix}-${Date.now().toString(36)}-${random}`;
    }

    protected normalizeDocument(value: unknown): OpenPencilDocument {
        if (!this.isRecord(value)) {
            throw new OpenPencilDocumentParseError('OpenPencil document must be a JSON object.');
        }
        const context: OpenPencilNormalizationContext = { usedIds: new Set() };
        const rawPages = this.extractPages(value.pages);
        const version = typeof value.version === 'string' ? value.version : OPENPENCIL_DOCUMENT_VERSION;
        const name = typeof value.name === 'string' ? value.name : 'OpenPencil Design';
        const rootChildrenContext = rawPages.length > 0 ? { usedIds: new Set<string>() } : context;
        const rootChildren = this.normalizeNodes(this.extractChildren(value), rootChildrenContext);
        const pages = rawPages.length > 0
            ? rawPages.map((page, index) => this.normalizePage(page, index, context, index === 0 ? rootChildren : undefined))
            : [{ id: this.uniqueId(this.generateId('page'), context), name: 'Page 1', width: 900, height: 620, background: '#ffffff', gridSize: 20, showGrid: true, snapToGrid: false, children: rootChildren }];
        const activePageId = typeof value.activePageId === 'string' && pages.some(page => page.id === value.activePageId)
            ? value.activePageId
            : pages[0].id;
        return {
            ...value,
            version,
            name,
            activePageId,
            children: rootChildren,
            pages,
            variables: this.normalizeVariables(value.variables),
            themes: this.normalizeThemes(value.themes)
        };
    }

    protected normalizePage(value: unknown, index: number, context: OpenPencilNormalizationContext = { usedIds: new Set() }, fallbackChildren?: OpenPencilNode[]): OpenPencilPage {
        if (!this.isRecord(value)) {
            this.registerNodeIds(fallbackChildren, context);
            return { id: this.uniqueId(this.generateId('page'), context), name: `Page ${index + 1}`, width: 900, height: 620, background: '#ffffff', gridSize: 20, showGrid: true, snapToGrid: false, children: fallbackChildren ?? [] };
        }
        const children = this.extractChildren(value);
        if (children.length === 0) {
            this.registerNodeIds(fallbackChildren, context);
        }
        return {
            ...value,
            id: this.uniqueId(typeof value.id === 'string' && value.id ? value.id : this.generateId('page'), context),
            name: typeof value.name === 'string' ? value.name : `Page ${index + 1}`,
            width: typeof value.width === 'number' ? value.width : 900,
            height: typeof value.height === 'number' ? value.height : 620,
            background: typeof value.background === 'string' ? value.background : '#ffffff',
            gridSize: typeof value.gridSize === 'number' && value.gridSize > 0 ? value.gridSize : 20,
            showGrid: typeof value.showGrid === 'boolean' ? value.showGrid : true,
            snapToGrid: typeof value.snapToGrid === 'boolean' ? value.snapToGrid : false,
            children: children.length > 0 ? this.normalizeNodes(children, context) : fallbackChildren ?? []
        };
    }

    protected normalizeNodes(values: unknown[], context: OpenPencilNormalizationContext = { usedIds: new Set() }): OpenPencilNode[] {
        return values.filter(this.isRecord).map(value => {
            const id = this.uniqueId(typeof value.id === 'string' && value.id ? value.id : this.generateId('node'), context);
            const type = this.normalizeNodeType(value.type);
            const children = Array.isArray(value.children) ? this.normalizeNodes(value.children, context) : undefined;
            const fill = this.normalizeFill(value.fill);
            const stroke = this.normalizeStroke(value.stroke);
            const bounds = this.normalizeBounds(value);
            const content = type === 'text' && value.content === undefined
                ? typeof value.text === 'string'
                    ? value.text
                    : typeof value.characters === 'string'
                        ? value.characters
                        : value.content
                : value.content;
            const iconFontName = type === 'icon_font' && value.iconFontName === undefined && typeof value.iconName === 'string' ? value.iconName : value.iconFontName;
            return {
                ...value,
                id,
                type,
                ...bounds,
                ...(content !== undefined ? { content } : {}),
                ...(iconFontName !== undefined ? { iconFontName } : {}),
                ...(fill ? { fill } : {}),
                ...(stroke ? { stroke } : {}),
                ...(children ? { children } : {})
            } as OpenPencilNode;
        });
    }

    protected extractPages(value: unknown): unknown[] {
        if (Array.isArray(value)) {
            return value;
        }
        if (this.isRecord(value)) {
            return Object.values(value);
        }
        return [];
    }

    protected extractChildren(value: Record<string, unknown>): unknown[] {
        if (Array.isArray(value.children)) {
            return value.children;
        }
        const root = value.root;
        if (this.isRecord(root) && Array.isArray(root.children)) {
            return root.children;
        }
        return [];
    }

    protected normalizeNodeType(value: unknown): OpenPencilNodeType {
        if (typeof value !== 'string') {
            return 'rectangle';
        }
        const key = value.trim().replace(/[-\s]/g, '_').toLowerCase();
        return OPENPENCIL_NODE_TYPE_ALIASES[key] ?? FIGMA_NODE_TYPE_ALIASES[key] ?? 'rectangle';
    }

    protected normalizeBounds(value: Record<string, unknown>): Partial<Pick<OpenPencilNode, 'x' | 'y' | 'width' | 'height'>> {
        const bounds = this.isRecord(value.absoluteBoundingBox)
            ? value.absoluteBoundingBox
            : this.isRecord(value.absoluteRenderBounds)
                ? value.absoluteRenderBounds
                : undefined;
        if (!bounds) {
            return {};
        }
        const normalized: Partial<Pick<OpenPencilNode, 'x' | 'y' | 'width' | 'height'>> = {};
        if (typeof value.x !== 'number' && typeof bounds.x === 'number') {
            normalized.x = bounds.x;
        }
        if (typeof value.y !== 'number' && typeof bounds.y === 'number') {
            normalized.y = bounds.y;
        }
        if (typeof value.width !== 'number' && typeof bounds.width === 'number') {
            normalized.width = bounds.width;
        }
        if (typeof value.height !== 'number' && typeof bounds.height === 'number') {
            normalized.height = bounds.height;
        }
        return normalized;
    }

    protected normalizeFill(value: unknown): OpenPencilFill[] | undefined {
        if (value === undefined || value === null || value === false) {
            return undefined;
        }
        const fills = Array.isArray(value) ? value : [value];
        const normalized = fills
            .map(fill => this.normalizeFillItem(fill))
            .filter((fill): fill is OpenPencilFill => !!fill);
        return normalized.length > 0 ? normalized : undefined;
    }

    protected normalizeFillItem(value: unknown): OpenPencilFill | undefined {
        if (typeof value === 'string') {
            return { type: 'solid', color: value };
        }
        if (!this.isRecord(value)) {
            return undefined;
        }
        const color = typeof value.color === 'string' ? value.color : undefined;
        const type = typeof value.type === 'string' && value.type ? value.type.toLowerCase() : color ? 'solid' : undefined;
        if (!type) {
            return value as OpenPencilFill;
        }
        return {
            ...value,
            type,
            ...(color ? { color } : {})
        } as OpenPencilFill;
    }

    protected normalizeStroke(value: unknown): OpenPencilNode['stroke'] | undefined {
        if (value === undefined || value === null || value === false) {
            return undefined;
        }
        if (typeof value === 'string') {
            return { color: value, width: 1 };
        }
        if (!this.isRecord(value)) {
            return undefined;
        }
        const strokeFill = this.normalizeFill(value.fill);
        const firstFillColor = strokeFill?.find(fill => typeof fill.color === 'string')?.color;
        const color = typeof value.color === 'string' ? value.color : firstFillColor ?? '#000000';
        const width = typeof value.width === 'number'
            ? value.width
            : typeof value.thickness === 'number'
                ? value.thickness
                : Array.isArray(value.thickness) && typeof value.thickness[0] === 'number'
                    ? value.thickness[0]
                    : undefined;
        return {
            ...value,
            color,
            ...(width !== undefined ? { width } : {}),
            ...(strokeFill ? { fill: strokeFill } : {})
        };
    }

    protected normalizeVariables(value: unknown): Record<string, OpenPencilVariableDefinition> | undefined {
        if (!this.isRecord(value)) {
            return undefined;
        }
        const variables: Record<string, OpenPencilVariableDefinition> = {};
        for (const [name, variable] of Object.entries(value)) {
            const normalized = this.normalizeVariable(variable);
            if (normalized) {
                variables[name] = normalized;
            }
        }
        return Object.keys(variables).length ? variables : undefined;
    }

    protected normalizeThemes(value: unknown): OpenPencilThemeMap | undefined {
        if (!this.isRecord(value)) {
            return undefined;
        }
        const themes: OpenPencilThemeMap = {};
        for (const [axis, values] of Object.entries(value)) {
            const normalizedValues = Array.isArray(values)
                ? values.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
                : [];
            if (axis.trim() && normalizedValues.length) {
                themes[axis] = Array.from(new Set(normalizedValues));
            }
        }
        return Object.keys(themes).length ? themes : undefined;
    }

    protected normalizeVariable(value: unknown): OpenPencilVariableDefinition | undefined {
        if (this.isRecord(value) && 'value' in value) {
            const variableValue = this.normalizeVariableValue(value.value);
            if (variableValue !== undefined) {
                return {
                    ...value,
                    ...(this.isVariableType(value.type) ? { type: value.type } : {}),
                    value: variableValue
                } as OpenPencilVariableDefinition;
            }
        }
        const variableValue = this.normalizeVariableValue(value);
        if (variableValue === undefined) {
            return undefined;
        }
        return { type: this.inferVariableType(variableValue), value: variableValue };
    }

    protected normalizeVariableValue(value: unknown): OpenPencilVariableDefinition['value'] | undefined {
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            return value;
        }
        if (!Array.isArray(value)) {
            return undefined;
        }
        const themed = value
            .filter(this.isRecord)
            .map(item => {
                const itemValue = item.value;
                if (typeof itemValue !== 'string' && typeof itemValue !== 'number' && typeof itemValue !== 'boolean') {
                    return undefined;
                }
                return {
                    value: itemValue,
                    ...(this.isStringRecord(item.theme) ? { theme: item.theme } : {})
                };
            })
            .filter((item): item is OpenPencilThemedValue => !!item);
        return themed.length ? themed : undefined;
    }

    protected inferVariableType(value: OpenPencilVariableDefinition['value']): OpenPencilVariableDefinition['type'] {
        const sample = Array.isArray(value) ? value[0]?.value : value;
        if (typeof sample === 'number') {
            return 'number';
        }
        if (typeof sample === 'boolean') {
            return 'boolean';
        }
        return typeof sample === 'string' && /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(sample) ? 'color' : 'string';
    }

    protected isVariableType(value: unknown): value is NonNullable<OpenPencilVariableDefinition['type']> {
        return value === 'color' || value === 'number' || value === 'boolean' || value === 'string';
    }

    protected isKnownNodeType(value: unknown): value is OpenPencilNodeType {
        return typeof value === 'string' && Object.values(OPENPENCIL_NODE_TYPE_ALIASES).includes(value as OpenPencilNodeType);
    }

    protected resolveThemedValue(values: OpenPencilThemedValue[], activeTheme?: Record<string, string>): string | number | boolean | undefined {
        if (activeTheme && Object.keys(activeTheme).length > 0) {
            const match = values.find(value => {
                if (!value.theme) {
                    return false;
                }
                return Object.entries(activeTheme).every(([axis, expected]) => value.theme?.[axis] === expected);
            });
            if (match) {
                return match.value;
            }
        }
        return values[0]?.value;
    }

    protected resolveFillVariables(fills: OpenPencilFill[], variables: OpenPencilDocument['variables'], activeTheme?: Record<string, string>): OpenPencilFill[] {
        return fills.map(fill => {
            if (typeof fill.color === 'string' && this.isVariableReference(fill.color)) {
                return { ...fill, color: this.resolveColorReference(fill.color, variables, activeTheme) ?? '#000000' };
            }
            if (Array.isArray(fill.stops)) {
                return {
                    ...fill,
                    stops: fill.stops.map(stop => this.isRecord(stop) && typeof stop.color === 'string' && this.isVariableReference(stop.color)
                        ? { ...stop, color: this.resolveColorReference(stop.color, variables, activeTheme) ?? '#000000' }
                        : stop)
                };
            }
            return fill;
        });
    }

    protected resolveStrokeVariables(stroke: OpenPencilNode['stroke'], variables: OpenPencilDocument['variables'], activeTheme?: Record<string, string>): OpenPencilNode['stroke'] {
        if (!stroke) {
            return stroke;
        }
        const resolved = { ...stroke };
        if (typeof resolved.color === 'string' && this.isVariableReference(resolved.color)) {
            resolved.color = this.resolveColorReference(resolved.color, variables, activeTheme) ?? '#000000';
        }
        if (typeof resolved.thickness === 'string' && this.isVariableReference(resolved.thickness)) {
            const thickness = this.resolveNumberReference(resolved.thickness, variables, activeTheme) ?? 1;
            resolved.thickness = thickness;
            resolved.width = resolved.width ?? thickness;
        }
        if (resolved.fill) {
            resolved.fill = this.resolveFillVariables(resolved.fill, variables, activeTheme);
            resolved.color = resolved.color ?? resolved.fill.find(fill => typeof fill.color === 'string')?.color;
        }
        return resolved;
    }

    protected resolveEffectVariables(effects: OpenPencilEffect[], variables: OpenPencilDocument['variables'], activeTheme?: Record<string, string>): OpenPencilEffect[] {
        return effects.map(effect => {
            if (effect.type === 'shadow') {
                return {
                    ...effect,
                    color: this.resolveColorReference(effect.color, variables, activeTheme) ?? effect.color,
                    offsetX: this.resolveNumberReference(effect.offsetX, variables, activeTheme) ?? 0,
                    offsetY: this.resolveNumberReference(effect.offsetY, variables, activeTheme) ?? 0,
                    blur: this.resolveNumberReference(effect.blur, variables, activeTheme) ?? 0,
                    spread: this.resolveNumberReference(effect.spread, variables, activeTheme) ?? 0
                };
            }
            return {
                ...effect,
                radius: this.resolveNumberReference(effect.radius, variables, activeTheme) ?? 0
            };
        });
    }

    protected isVariableReference(value: unknown): value is string {
        return typeof value === 'string' && value.startsWith('$') && value.length > 1;
    }

    protected uniqueId(id: string, context: OpenPencilNormalizationContext): string {
        if (!context.usedIds.has(id)) {
            context.usedIds.add(id);
            return id;
        }
        let suffix = 2;
        let candidate = `${id}-${suffix}`;
        while (context.usedIds.has(candidate)) {
            suffix += 1;
            candidate = `${id}-${suffix}`;
        }
        context.usedIds.add(candidate);
        return candidate;
    }

    protected registerNodeIds(nodes: OpenPencilNode[] | undefined, context: OpenPencilNormalizationContext): void {
        if (!nodes) {
            return;
        }
        for (const node of nodes) {
            context.usedIds.add(node.id);
            this.registerNodeIds(node.children, context);
        }
    }

    protected findNodeInList(nodes: OpenPencilNode[], nodeId: string): OpenPencilNode | undefined {
        for (const node of nodes) {
            if (node.id === nodeId) {
                return node;
            }
            if (node.children) {
                const child = this.findNodeInList(node.children, nodeId);
                if (child) {
                    return child;
                }
            }
        }
        return undefined;
    }

    protected isRecord(value: unknown): value is Record<string, unknown> {
        return typeof value === 'object' && value !== null && !Array.isArray(value);
    }

    protected isStringRecord(value: unknown): value is Record<string, string> {
        return this.isRecord(value) && Object.values(value).every(item => typeof item === 'string');
    }
}

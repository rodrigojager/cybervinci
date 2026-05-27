import { OpenPencilDocumentService, OpenPencilDocumentParseError } from './openpencil-document-service';
import { OpenPencilDocument, OpenPencilNode } from './openpencil-types';

export type OpenPencilTemplateId = 'hero' | 'login-form' | 'metric-card';

export const OPENPENCIL_PEN_DOCUMENT_VERSION = '2.10';

export interface OpenPencilTemplateDefinition {
    id: OpenPencilTemplateId;
    name: string;
    description: string;
}

export interface OpenPencilTemplateInstance {
    nodes: OpenPencilNode[];
    nodeIds: string[];
}

export interface OpenPencilUIKitDocument {
    version: string;
    name?: string;
    children: OpenPencilNode[];
    variables?: Record<string, unknown>;
    themes?: Record<string, string[]>;
    imports?: Record<string, string>;
}

export interface OpenPencilUIKitComponent {
    id: string;
    name: string;
    description?: string;
    node: OpenPencilNode;
    nodes: OpenPencilNode[];
    nodeIds: string[];
}

export interface OpenPencilUIKitImportResult {
    name: string;
    components: OpenPencilUIKitComponent[];
}

export class OpenPencilTemplateService {

    protected readonly documents = new OpenPencilDocumentService();

    readonly templates: OpenPencilTemplateDefinition[] = [
        { id: 'hero', name: 'Hero block', description: 'Landing page hero with headline, copy, and CTA.' },
        { id: 'login-form', name: 'Login form', description: 'Authentication card with fields and primary action.' },
        { id: 'metric-card', name: 'Metric card', description: 'Dashboard KPI card with label, value, delta, and trend.' }
    ];

    createTemplate(id: OpenPencilTemplateId, generateId: (prefix?: string) => string): OpenPencilTemplateInstance {
        switch (id) {
            case 'hero':
                return this.heroBlock(generateId);
            case 'login-form':
                return this.loginForm(generateId);
            case 'metric-card':
                return this.metricCard(generateId);
        }
    }

    createBuiltinUIKitDocument(generateId: (prefix?: string) => string = prefix => this.documents.generateId(prefix)): OpenPencilUIKitDocument {
        const children = this.templates.map((definition, index) => {
            const template = this.createTemplate(definition.id, generateId);
            return this.createReusableComponentNode({
                id: definition.id,
                name: definition.name,
                description: definition.description,
                nodes: template.nodes,
                x: index * 340,
                y: 0
            });
        });
        return {
            version: OPENPENCIL_PEN_DOCUMENT_VERSION,
            name: 'OpenPencil Built-in UI Kit',
            children
        };
    }

    createUIKitDocument(name: string, components: Array<{ id?: string; name: string; description?: string; nodes: OpenPencilNode[] }>): OpenPencilUIKitDocument {
        return {
            version: OPENPENCIL_PEN_DOCUMENT_VERSION,
            name,
            children: components.map((component, index) => this.createReusableComponentNode({
                id: component.id ?? this.slug(component.name || `component-${index + 1}`),
                name: component.name,
                description: component.description,
                nodes: component.nodes,
                x: index * 340,
                y: 0
            }))
        };
    }

    serializeUIKitDocument(document: OpenPencilUIKitDocument): string {
        return `${JSON.stringify(this.normalizeUIKitDocument(document), undefined, 2)}\n`;
    }

    serializeBuiltinUIKit(generateId?: (prefix?: string) => string): string {
        return this.serializeUIKitDocument(this.createBuiltinUIKitDocument(generateId));
    }

    deserializeUIKit(content: string): OpenPencilUIKitImportResult {
        const document = this.documents.deserialize(content);
        return this.extractReusableComponents(document);
    }

    importSvg(content: string, generateId: (prefix?: string) => string = prefix => this.documents.generateId(prefix), name = 'Imported SVG'): OpenPencilTemplateInstance {
        if (content.length > 100000) {
            throw new OpenPencilDocumentParseError('SVG import is limited to small files.');
        }
        const root = this.parseSvgElement(content);
        if (!root || root.name !== 'svg') {
            throw new OpenPencilDocumentParseError('SVG import expects an <svg> root element.');
        }
        const width = this.svgSize(root.attributes.width, this.svgViewBoxSize(root.attributes.viewBox)?.width ?? 120);
        const height = this.svgSize(root.attributes.height, this.svgViewBoxSize(root.attributes.viewBox)?.height ?? 120);
        const children = this.svgChildrenToNodes(root.children, generateId);
        const nodes: OpenPencilNode[] = [{
            id: generateId('svg-group'),
            type: 'group',
            name,
            x: 0,
            y: 0,
            width,
            height,
            children
        }];
        return { nodes, nodeIds: this.collectNodeIds(nodes) };
    }

    protected normalizeUIKitDocument(document: OpenPencilUIKitDocument): OpenPencilUIKitDocument {
        return {
            ...document,
            version: typeof document.version === 'string' ? document.version : OPENPENCIL_PEN_DOCUMENT_VERSION,
            children: document.children.map(node => this.toPenNode(node) as OpenPencilNode)
        };
    }

    protected toPenNode(node: OpenPencilNode): Record<string, unknown> {
        const result = this.cloneNode(node) as Record<string, unknown>;
        if (Array.isArray(node.fill)) {
            const fill = this.toPenFill(node.fill);
            if (fill === undefined) {
                delete result.fill;
            } else {
                result.fill = fill;
            }
        }
        if (node.stroke) {
            const stroke = { ...node.stroke } as Record<string, unknown>;
            if (stroke.color !== undefined && stroke.fill === undefined) {
                stroke.fill = stroke.color;
            }
            if (stroke.width !== undefined && stroke.thickness === undefined) {
                stroke.thickness = stroke.width;
            }
            if (Array.isArray(stroke.fill)) {
                stroke.fill = this.toPenFill(stroke.fill as OpenPencilNode['fill']);
            }
            delete stroke.color;
            delete stroke.width;
            result.stroke = stroke;
        }
        if (Array.isArray(node.children)) {
            result.children = node.children.map(child => this.toPenNode(child));
        }
        return result;
    }

    protected toPenFill(fill: OpenPencilNode['fill']): unknown {
        if (!fill?.length) {
            return undefined;
        }
        const converted = fill.map(item => {
            if (item.type === 'solid' && typeof item.color === 'string' && item.opacity === undefined) {
                return item.color;
            }
            if (item.type === 'solid') {
                return { ...item, type: 'color' };
            }
            return item;
        });
        return converted.length === 1 ? converted[0] : converted;
    }

    protected extractReusableComponents(document: OpenPencilDocument): OpenPencilUIKitImportResult {
        const components: OpenPencilUIKitComponent[] = [];
        const seen = new Set<string>();
        const visit = (nodes: OpenPencilNode[]) => {
            for (const node of nodes) {
                if (node.reusable === true && !seen.has(node.id)) {
                    seen.add(node.id);
                    const cloned = this.cloneNode(node);
                    components.push({
                        id: cloned.id,
                        name: cloned.name ?? cloned.id,
                        description: typeof cloned.description === 'string' ? cloned.description : undefined,
                        node: cloned,
                        nodes: [cloned],
                        nodeIds: this.collectNodeIds([cloned])
                    });
                }
                if (node.children) {
                    visit(node.children);
                }
            }
        };
        if (document.children?.length) {
            visit(document.children);
        }
        for (const page of document.pages ?? []) {
            visit(page.children);
        }
        return {
            name: document.name ?? 'OpenPencil UI Kit',
            components
        };
    }

    protected createReusableComponentNode(component: { id: string; name: string; description?: string; nodes: OpenPencilNode[]; x?: number; y?: number }): OpenPencilNode {
        const nodes = component.nodes.map(node => this.cloneNode(node));
        const bounds = this.nodeBounds(nodes);
        const children = nodes.map(node => ({
            ...node,
            x: this.numberValue(node.x, 0) - bounds.x,
            y: this.numberValue(node.y, 0) - bounds.y
        }));
        return {
            id: this.slug(component.id),
            type: 'frame',
            name: component.name,
            ...(component.description ? { description: component.description } : {}),
            reusable: true,
            x: component.x ?? bounds.x,
            y: component.y ?? bounds.y,
            width: Math.max(1, bounds.width),
            height: Math.max(1, bounds.height),
            fill: [],
            children
        } as OpenPencilNode;
    }

    protected nodeBounds(nodes: OpenPencilNode[]): { x: number; y: number; width: number; height: number } {
        if (!nodes.length) {
            return { x: 0, y: 0, width: 1, height: 1 };
        }
        const boxes = nodes.map(node => {
            const x = this.numberValue(node.x, 0);
            const y = this.numberValue(node.y, 0);
            const width = this.numberValue(node.width, node.type === 'text' ? 160 : 120);
            const height = this.numberValue(node.height, node.type === 'text' ? 40 : 120);
            return {
                x: Math.min(x, x + width),
                y: Math.min(y, y + height),
                right: Math.max(x, x + width),
                bottom: Math.max(y, y + height)
            };
        });
        const x = Math.min(...boxes.map(box => box.x));
        const y = Math.min(...boxes.map(box => box.y));
        const right = Math.max(...boxes.map(box => box.right));
        const bottom = Math.max(...boxes.map(box => box.bottom));
        return { x, y, width: right - x, height: bottom - y };
    }

    protected svgChildrenToNodes(elements: OpenPencilSvgElement[], generateId: (prefix?: string) => string): OpenPencilNode[] {
        const nodes: OpenPencilNode[] = [];
        for (const element of elements) {
            if (element.name === 'g') {
                const translate = this.svgTranslate(element.attributes.transform);
                const children = this.svgChildrenToNodes(element.children, generateId);
                nodes.push({
                    id: generateId('svg-group'),
                    type: 'group',
                    name: element.attributes.id || 'SVG group',
                    x: translate.x,
                    y: translate.y,
                    width: this.numberValue(element.attributes.width, undefined),
                    height: this.numberValue(element.attributes.height, undefined),
                    children
                } as OpenPencilNode);
            } else if (element.name === 'path' && typeof element.attributes.d === 'string') {
                nodes.push({
                    id: generateId('svg-path'),
                    type: 'path',
                    name: element.attributes.id || 'SVG path',
                    x: 0,
                    y: 0,
                    width: 1,
                    height: 1,
                    d: element.attributes.d,
                    ...(this.svgFill(element.attributes) ? { fill: this.svgFill(element.attributes) } : {}),
                    ...(this.svgStroke(element.attributes) ? { stroke: this.svgStroke(element.attributes) } : {}),
                    ...(this.numberValue(element.attributes.opacity, undefined) !== undefined ? { opacity: this.numberValue(element.attributes.opacity, 1) } : {})
                });
            }
        }
        return nodes;
    }

    protected parseSvgElement(content: string): OpenPencilSvgElement | undefined {
        const tagPattern = /<\s*(\/)?\s*([a-zA-Z][\w:-]*)([^>]*)>/g;
        const stack: OpenPencilSvgElement[] = [];
        let root: OpenPencilSvgElement | undefined;
        let match: RegExpExecArray | null;
        while ((match = tagPattern.exec(content))) {
            const closing = !!match[1];
            const name = match[2].toLowerCase();
            const rawAttributes = match[3] ?? '';
            const selfClosing = /\/\s*$/.test(rawAttributes);
            if (closing) {
                while (stack.length && stack[stack.length - 1].name !== name) {
                    stack.pop();
                }
                stack.pop();
                continue;
            }
            if (name !== 'svg' && name !== 'g' && name !== 'path') {
                continue;
            }
            const element: OpenPencilSvgElement = {
                name,
                attributes: this.parseAttributes(rawAttributes),
                children: []
            };
            const parent = stack[stack.length - 1];
            if (parent) {
                parent.children.push(element);
            } else if (!root) {
                root = element;
            }
            if (!selfClosing) {
                stack.push(element);
            }
        }
        return root;
    }

    protected parseAttributes(value: string): Record<string, string> {
        const attributes: Record<string, string> = {};
        const attributePattern = /([a-zA-Z_:][\w:.-]*)\s*=\s*("([^"]*)"|'([^']*)')/g;
        let match: RegExpExecArray | null;
        while ((match = attributePattern.exec(value))) {
            attributes[match[1]] = match[3] ?? match[4] ?? '';
        }
        return attributes;
    }

    protected svgFill(attributes: Record<string, string>): OpenPencilNode['fill'] | undefined {
        const fill = attributes.fill;
        if (!fill || fill === 'none') {
            return undefined;
        }
        return [{ type: 'solid', color: fill }];
    }

    protected svgStroke(attributes: Record<string, string>): OpenPencilNode['stroke'] | undefined {
        const stroke = attributes.stroke;
        if (!stroke || stroke === 'none') {
            return undefined;
        }
        return {
            color: stroke,
            width: this.numberValue(attributes['stroke-width'], 1)
        };
    }

    protected svgTranslate(value: string | undefined): { x: number; y: number } {
        if (!value) {
            return { x: 0, y: 0 };
        }
        const match = /translate\(\s*([+-]?\d+(?:\.\d+)?)\s*(?:[, ]\s*([+-]?\d+(?:\.\d+)?))?\s*\)/.exec(value);
        if (!match) {
            return { x: 0, y: 0 };
        }
        return {
            x: this.numberValue(match[1], 0),
            y: this.numberValue(match[2], 0)
        };
    }

    protected svgViewBoxSize(value: string | undefined): { width: number; height: number } | undefined {
        const parts = value?.trim().split(/[\s,]+/).map(part => Number(part));
        if (!parts || parts.length !== 4 || parts.some(part => !Number.isFinite(part))) {
            return undefined;
        }
        return { width: parts[2], height: parts[3] };
    }

    protected svgSize(value: string | undefined, fallback: number): number {
        const parsed = typeof value === 'string' ? Number(value.replace(/px$/, '')) : NaN;
        return Number.isFinite(parsed) ? parsed : fallback;
    }

    protected collectNodeIds(nodes: OpenPencilNode[]): string[] {
        const ids: string[] = [];
        const visit = (items: OpenPencilNode[]) => {
            for (const node of items) {
                ids.push(node.id);
                if (node.children) {
                    visit(node.children);
                }
            }
        };
        visit(nodes);
        return ids;
    }

    protected cloneNode<T extends OpenPencilNode>(node: T): T {
        return JSON.parse(JSON.stringify(node)) as T;
    }

    protected numberValue(value: unknown, fallback: number): number;
    protected numberValue(value: unknown, fallback: undefined): number | undefined;
    protected numberValue(value: unknown, fallback: number | undefined): number | undefined {
        const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
        return Number.isFinite(parsed) ? parsed : fallback;
    }

    protected slug(value: string): string {
        const slug = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        return slug || 'component';
    }

    protected heroBlock(generateId: (prefix?: string) => string): OpenPencilTemplateInstance {
        const baseX = 80;
        const baseY = 390;
        const ids = {
            surface: generateId('hero-surface'),
            eyebrow: generateId('hero-eyebrow'),
            title: generateId('hero-title'),
            copy: generateId('hero-copy'),
            button: generateId('hero-button'),
            buttonText: generateId('hero-button-text')
        };
        const nodes: OpenPencilNode[] = [
            { id: ids.surface, type: 'rectangle', name: 'Hero surface', x: baseX, y: baseY, width: 680, height: 190, cornerRadius: 18, fill: [{ type: 'solid', color: '#eef2ff' }], stroke: { color: '#6366f1', width: 1 } },
            { id: ids.eyebrow, type: 'text', name: 'Hero eyebrow', x: baseX + 32, y: baseY + 28, width: 220, height: 24, content: 'OPENPENCIL UI KIT', fontSize: 13, fontWeight: 700, fill: [{ type: 'solid', color: '#4f46e5' }] },
            { id: ids.title, type: 'text', name: 'Hero headline', x: baseX + 32, y: baseY + 62, width: 480, height: 48, content: 'Design faster inside CyberVinci', fontSize: 32, fontWeight: 700, fill: [{ type: 'solid', color: '#111827' }] },
            { id: ids.copy, type: 'text', name: 'Hero body copy', x: baseX + 34, y: baseY + 118, width: 440, height: 36, content: 'Use structured components as a starting point, then refine layers visually.', fontSize: 16, fill: [{ type: 'solid', color: '#475569' }] },
            { id: ids.button, type: 'rectangle', name: 'Hero CTA', x: baseX + 520, y: baseY + 118, width: 116, height: 40, cornerRadius: 10, fill: [{ type: 'solid', color: '#4f46e5' }] },
            { id: ids.buttonText, type: 'text', name: 'Hero CTA label', x: baseX + 545, y: baseY + 129, width: 72, height: 20, content: 'Launch', fontSize: 15, fontWeight: 700, fill: [{ type: 'solid', color: '#ffffff' }] }
        ];
        return { nodes, nodeIds: Object.values(ids) };
    }

    protected loginForm(generateId: (prefix?: string) => string): OpenPencilTemplateInstance {
        const baseX = 520;
        const baseY = 92;
        const ids = {
            surface: generateId('login-surface'),
            title: generateId('login-title'),
            email: generateId('login-email'),
            emailLabel: generateId('login-email-label'),
            password: generateId('login-password'),
            passwordLabel: generateId('login-password-label'),
            button: generateId('login-button'),
            buttonText: generateId('login-button-text')
        };
        const nodes: OpenPencilNode[] = [
            { id: ids.surface, type: 'rectangle', name: 'Login card', x: baseX, y: baseY, width: 280, height: 264, cornerRadius: 16, fill: [{ type: 'solid', color: '#ffffff' }], stroke: { color: '#cbd5e1', width: 1 } },
            { id: ids.title, type: 'text', name: 'Login title', x: baseX + 28, y: baseY + 28, width: 200, height: 34, content: 'Welcome back', fontSize: 24, fontWeight: 700, fill: [{ type: 'solid', color: '#111827' }] },
            { id: ids.emailLabel, type: 'text', name: 'Email label', x: baseX + 28, y: baseY + 78, width: 80, height: 18, content: 'Email', fontSize: 12, fontWeight: 700, fill: [{ type: 'solid', color: '#475569' }] },
            { id: ids.email, type: 'rectangle', name: 'Email input', x: baseX + 28, y: baseY + 100, width: 224, height: 38, cornerRadius: 8, fill: [{ type: 'solid', color: '#f8fafc' }], stroke: { color: '#cbd5e1', width: 1 } },
            { id: ids.passwordLabel, type: 'text', name: 'Password label', x: baseX + 28, y: baseY + 152, width: 100, height: 18, content: 'Password', fontSize: 12, fontWeight: 700, fill: [{ type: 'solid', color: '#475569' }] },
            { id: ids.password, type: 'rectangle', name: 'Password input', x: baseX + 28, y: baseY + 174, width: 224, height: 38, cornerRadius: 8, fill: [{ type: 'solid', color: '#f8fafc' }], stroke: { color: '#cbd5e1', width: 1 } },
            { id: ids.button, type: 'rectangle', name: 'Login action', x: baseX + 28, y: baseY + 226, width: 224, height: 42, cornerRadius: 10, fill: [{ type: 'solid', color: '#0f172a' }] },
            { id: ids.buttonText, type: 'text', name: 'Login action label', x: baseX + 114, y: baseY + 238, width: 64, height: 20, content: 'Sign in', fontSize: 15, fontWeight: 700, fill: [{ type: 'solid', color: '#ffffff' }] }
        ];
        return { nodes, nodeIds: Object.values(ids) };
    }

    protected metricCard(generateId: (prefix?: string) => string): OpenPencilTemplateInstance {
        const baseX = 92;
        const baseY = 380;
        const ids = {
            surface: generateId('metric-surface'),
            label: generateId('metric-label'),
            value: generateId('metric-value'),
            delta: generateId('metric-delta'),
            sparkline: generateId('metric-sparkline')
        };
        const nodes: OpenPencilNode[] = [
            { id: ids.surface, type: 'rectangle', name: 'Metric card', x: baseX, y: baseY, width: 260, height: 138, cornerRadius: 14, fill: [{ type: 'solid', color: '#ffffff' }], stroke: { color: '#cbd5e1', width: 1 } },
            { id: ids.label, type: 'text', name: 'Metric label', x: baseX + 24, y: baseY + 22, width: 180, height: 20, content: 'Automation score', fontSize: 13, fontWeight: 700, fill: [{ type: 'solid', color: '#64748b' }] },
            { id: ids.value, type: 'text', name: 'Metric value', x: baseX + 24, y: baseY + 52, width: 120, height: 44, content: '84%', fontSize: 38, fontWeight: 700, fill: [{ type: 'solid', color: '#111827' }] },
            { id: ids.delta, type: 'text', name: 'Metric delta', x: baseX + 150, y: baseY + 64, width: 84, height: 24, content: '+12.4%', fontSize: 16, fontWeight: 700, fill: [{ type: 'solid', color: '#16a34a' }] },
            { id: ids.sparkline, type: 'line', name: 'Metric sparkline', x: baseX + 24, y: baseY + 120, width: 210, height: -28, stroke: { color: '#16a34a', width: 3 } }
        ];
        return { nodes, nodeIds: Object.values(ids) };
    }
}

interface OpenPencilSvgElement {
    name: string;
    attributes: Record<string, string>;
    children: OpenPencilSvgElement[];
}

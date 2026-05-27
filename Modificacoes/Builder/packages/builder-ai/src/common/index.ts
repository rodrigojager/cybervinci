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

import {
    type BuilderAction,
    type BuilderDataSource,
    type BuilderDocument,
    type BuilderJsonValue,
    type BuilderNode,
    type BuilderNodeDataBinding,
    type BuilderTheme,
    duplicateNode,
    findNodeById,
    insertNode,
    moveNode,
    removeNode,
    updateNodeProps,
    validateBuilderDocumentStructure
} from '@cybervinci/builder-schema';
import {
    type BuilderActionRegistry,
    type BuilderComponentRegistry,
    type BuilderDataSourceRegistry,
    type BuilderRegistryAiSummary,
    validateBuilderDocumentActionsAgainstRegistry,
    validateBuilderDocumentDataSourcesAgainstRegistry,
    validateBuilderDocumentTypesAgainstRegistry,
    validateBuilderNodeTypesAgainstRegistry
} from '@cybervinci/builder-registry';

export const Builder_AI_BASE_SYSTEM_PROMPT = [
    'You are the CyberVinci UI Builder AI adapter.',
    'Return only one valid JSON object. Do not wrap it in Markdown, do not add comments, and do not add explanatory text before or after the JSON.',
    'The JSON object must match this response shape: {"operations":[BuilderAiOperation,...],"summary":"optional short summary","requiresAcceptance":true}.',
    'Every operation must be one of the allowed Builder AI operation types and must mutate or create Builder Schema data only.',
    'Builder Schema is the only canonical page format. Never return JSX, TSX, React code, Mantine code, HTML, CSS, scripts, or Puck data as the primary response.',
    'Use only component types that appear in the provided ComponentRegistry summary. Do not invent component types, props, slots, events, actions, or data source types.',
    'All generated documents must follow BuilderDocument: schemaVersion, metadata, page, optional theme, dataSources, actions, states, permissions, tree, and optional aiHints.',
    'All generated nodes must follow BuilderNode: id, type, optional props, children, slots, data, events, visibility, permissions, style, and meta.',
    'Every node id in a generated document or subtree must be unique, stable, lowercase-kebab-case when possible, and referenced consistently by operations.',
    'Events may reference only registered action ids. Do not emit inline JavaScript handlers, stringified functions, eval, script tags, dangerous URLs, or arbitrary executable expressions.',
    'For large page-wide changes, set requiresAcceptance to true so the UI can show a diff/preview before applying.',
    'If the user asks for code, JSX, HTML, or unsupported components, translate the intent into valid Builder operations using registered components instead.'
].join('\n');

export const Builder_AI_DEFAULT_RESPONSE_SIZE_LIMIT_BYTES = 256 * 1024;

export interface BuilderAiPromptContext {
    registry: BuilderRegistryAiSummary;
    currentDocument?: BuilderDocument;
    selectedNodeId?: string;
    userRequest?: string;
}

export type BuilderAiSkillName =
    | 'generate_page'
    | 'update_selected_component'
    | 'insert_component'
    | 'improve_copy'
    | 'change_theme'
    | 'generate_form'
    | 'generate_dashboard';

export interface BuilderAiSkillDefinition {
    name: BuilderAiSkillName;
    displayName: string;
    description: string;
    allowedOperations: readonly BuilderAiOperationType[];
    requiresCurrentDocument: boolean;
    requiresSelection: boolean;
    requiresAcceptance: boolean;
    instructions: readonly string[];
}

export interface BuilderAiSkillPromptOptions extends BuilderAiPromptContext {
    skillName: BuilderAiSkillName;
}

export interface BuilderAiContextBuildOptions extends BuilderAiPromptContext {
    maxRegistryComponents?: number;
    maxRegistryPropsPerComponent?: number;
    maxDocumentJsonLength?: number;
    maxSelectedNodeJsonLength?: number;
    maxUserRequestLength?: number;
}

export interface BuilderAiContextBundle {
    registry: BuilderRegistryAiSummary;
    currentDocument?: BuilderAiJsonContext<BuilderDocument>;
    selectedNode?: BuilderAiSelectedNodeContext;
    userRequest?: string;
    safetyRules: readonly string[];
}

export interface BuilderAiJsonContext<T> {
    value: T;
    truncated: boolean;
}

export interface BuilderAiSelectedNodeContext extends BuilderAiJsonContext<BuilderNode> {
    nodeId: string;
    found: boolean;
}

export const Builder_AI_SAFETY_RULES = [
    'Return only structured JSON operations. Do not return free-form JSX, TSX, HTML, CSS, scripts, Markdown, or prose as the primary answer.',
    'Builder Schema is canonical. Puck, Mantine, RJSF, JSX, and HTML are adapters or exports only.',
    'Use only registered ComponentRegistry component types, props, slots, events, action types, and data source types.',
    'Do not emit or request eval, Function constructors, inline JavaScript handlers, script tags, arbitrary executable expressions, or dangerous URLs.',
    'Events must reference existing or newly created registered actions by id. They must not contain executable source code.',
    'All output must be validated before application. Invalid operations must be rejected instead of silently applied.',
    'Set requiresAcceptance to true for page-wide, destructive, or large layout changes so the editor can show diff/preview before applying.'
] as const;

export function createBuilderAiContextBundle(options: BuilderAiContextBuildOptions): BuilderAiContextBundle {
    const currentDocument = options.currentDocument
        ? createJsonContext(options.currentDocument, options.maxDocumentJsonLength)
        : undefined;
    const selectedNode = createSelectedNodeContext(options);

    return {
        registry: compactRegistrySummary(options.registry, options),
        currentDocument,
        selectedNode,
        userRequest: truncateString(options.userRequest, options.maxUserRequestLength),
        safetyRules: Builder_AI_SAFETY_RULES
    };
}

export function createBuilderAiBasePrompt(context: BuilderAiPromptContext): string {
    const bundle = createBuilderAiContextBundle(context);
    const sections = [
        Builder_AI_BASE_SYSTEM_PROMPT,
        `Allowed Builder operations:\n${Builder_AI_OPERATION_TYPES.map(type => `- ${type}`).join('\n')}`,
        `Security and validation rules:\n${bundle.safetyRules.map(rule => `- ${rule}`).join('\n')}`,
        `ComponentRegistry summary JSON:\n${JSON.stringify(bundle.registry)}`,
        'Response JSON shape:\n{"operations":[{"type":"convertPromptToPage","payload":{"prompt":"User intent","document":{"schemaVersion":"..."}}}],"summary":"Short summary","requiresAcceptance":true}'
    ];

    if (bundle.currentDocument) {
        sections.push(`Current BuilderDocument JSON:\n${JSON.stringify(bundle.currentDocument.value)}`);
    }
    if (bundle.selectedNode) {
        sections.push(`Selected node id:\n${bundle.selectedNode.nodeId}`);
        sections.push(`Selected node found:\n${bundle.selectedNode.found ? 'true' : 'false'}`);
        if (bundle.selectedNode.found) {
            sections.push(`Selected BuilderNode JSON:\n${JSON.stringify(bundle.selectedNode.value)}`);
        }
    }
    if (bundle.userRequest) {
        sections.push(`User request:\n${bundle.userRequest}`);
    }

    return sections.join('\n\n');
}

export const Builder_AI_SKILLS: readonly BuilderAiSkillDefinition[] = [
    {
        name: 'generate_page',
        displayName: 'Generate page',
        description: 'Creates or replaces a full Builder page from a user prompt.',
        allowedOperations: ['convertPromptToPage', 'createPage', 'replacePage'],
        requiresCurrentDocument: false,
        requiresSelection: false,
        requiresAcceptance: true,
        instructions: [
            'Generate a complete valid BuilderDocument for the requested page.',
            'Prefer convertPromptToPage when turning a natural-language request into a page document.',
            'Use replacePage only when a current document exists and the request clearly asks to regenerate it.',
            'Set requiresAcceptance to true because this is a page-wide change.'
        ]
    },
    {
        name: 'update_selected_component',
        displayName: 'Update selected component',
        description: 'Updates props or safe bindings on the selected component.',
        allowedOperations: ['updateNodeProps', 'bindDataSource', 'createAction'],
        requiresCurrentDocument: true,
        requiresSelection: true,
        requiresAcceptance: false,
        instructions: [
            'Target only the selected node unless the request explicitly needs a new action or data source.',
            'Use updateNodeProps for prop edits and preserve unrelated props.',
            'Do not replace or move the selected node for this skill.'
        ]
    },
    {
        name: 'insert_component',
        displayName: 'Insert component',
        description: 'Inserts a registered component into the current Builder tree.',
        allowedOperations: ['insertNode', 'createAction', 'bindDataSource'],
        requiresCurrentDocument: true,
        requiresSelection: false,
        requiresAcceptance: false,
        instructions: [
            'Insert one valid registered component subtree into the requested parent.',
            'If no parent is specified in the user request, use the selected node when present, otherwise use the page root.',
            'Generate unique node ids and valid default props for every inserted node.'
        ]
    },
    {
        name: 'improve_copy',
        displayName: 'Improve copy',
        description: 'Rewrites text content without changing layout.',
        allowedOperations: ['generateCopy', 'updateNodeProps'],
        requiresCurrentDocument: true,
        requiresSelection: false,
        requiresAcceptance: false,
        instructions: [
            'Change only copy-oriented string props such as children, title, description, label, placeholder, badge text, or button text.',
            'Use generateCopy when updating one text field.',
            'Do not change structure, component types, data bindings, actions, or theme.'
        ]
    },
    {
        name: 'change_theme',
        displayName: 'Change theme',
        description: 'Changes canonical Builder theme tokens.',
        allowedOperations: ['changeTheme'],
        requiresCurrentDocument: true,
        requiresSelection: false,
        requiresAcceptance: false,
        instructions: [
            'Return a complete canonical BuilderTheme object in changeTheme.',
            'Keep the theme independent from Mantine-specific APIs.',
            'Do not edit component props unless the user separately asks for component content changes.'
        ]
    },
    {
        name: 'generate_form',
        displayName: 'Generate form',
        description: 'Creates a DynamicForm subtree and optional submit action.',
        allowedOperations: ['generateForm', 'createAction'],
        requiresCurrentDocument: true,
        requiresSelection: false,
        requiresAcceptance: false,
        instructions: [
            'Generate a valid DynamicForm node with registered form field children.',
            'Create submitForm actions only as structured action records; never emit executable handlers.',
            'If no parent is specified, insert into the selected node when present, otherwise into the page root.'
        ]
    },
    {
        name: 'generate_dashboard',
        displayName: 'Generate dashboard',
        description: 'Creates dashboard sections, metric grids, charts, tables, and mock/static data sources.',
        allowedOperations: ['generateDashboard', 'bindDataSource', 'createAction'],
        requiresCurrentDocument: true,
        requiresSelection: false,
        requiresAcceptance: true,
        instructions: [
            'Generate dashboard nodes using registered Dashboard and Data Display components.',
            'Prefer static or mock dataSources for MVP previews.',
            'Set requiresAcceptance to true when replacing children or inserting several dashboard sections.'
        ]
    }
] as const;

export function getBuilderAiSkillDefinition(skillName: BuilderAiSkillName): BuilderAiSkillDefinition {
    const definition = Builder_AI_SKILLS.find(skill => skill.name === skillName);
    if (!definition) {
        throw new Error(`Unknown Builder AI skill '${skillName}'.`);
    }
    return definition;
}

export function createBuilderAiSkillPrompt(options: BuilderAiSkillPromptOptions): string {
    const skill = getBuilderAiSkillDefinition(options.skillName);
    const sections = [
        createBuilderAiBasePrompt(options),
        `Active Builder AI skill:\n${skill.name}`,
        `Skill allowed operations:\n${skill.allowedOperations.map(type => `- ${type}`).join('\n')}`,
        `Skill instructions:\n${skill.instructions.map(instruction => `- ${instruction}`).join('\n')}`,
        `Skill response constraints:\n- Use only the skill allowed operations listed above.\n- Set requiresAcceptance to ${skill.requiresAcceptance ? 'true' : 'true only if the requested change is destructive or broad'}.\n- The operations must still pass the global Builder AI validators.`
    ];

    if (skill.requiresCurrentDocument) {
        sections.push('Context requirement:\nA current BuilderDocument is required. If it is absent, return {"operations":[],"summary":"Current document is required for this skill.","requiresAcceptance":false}.');
    }
    if (skill.requiresSelection) {
        sections.push('Selection requirement:\nA selected node is required. If selectedNodeFound is false or no selected node is provided, return {"operations":[],"summary":"A selected component is required for this skill.","requiresAcceptance":false}.');
    }

    return sections.join('\n\n');
}

function createSelectedNodeContext(options: BuilderAiContextBuildOptions): BuilderAiSelectedNodeContext | undefined {
    if (!options.selectedNodeId) {
        return undefined;
    }
    const location = options.currentDocument ? findNodeById(options.currentDocument.tree, options.selectedNodeId) : undefined;
    const value = location?.node ?? {
        id: options.selectedNodeId,
        type: 'Unknown'
    };
    return {
        nodeId: options.selectedNodeId,
        found: Boolean(location),
        ...createJsonContext(value, options.maxSelectedNodeJsonLength)
    };
}

function createJsonContext<T>(value: T, maxJsonLength: number | undefined): BuilderAiJsonContext<T> {
    if (!maxJsonLength || maxJsonLength < 1) {
        return { value, truncated: false };
    }
    const json = JSON.stringify(value);
    if (json.length <= maxJsonLength) {
        return { value, truncated: false };
    }
    return {
        value: truncateJsonValue(value, maxJsonLength) as T,
        truncated: true
    };
}

function compactRegistrySummary(summary: BuilderRegistryAiSummary, options: BuilderAiContextBuildOptions): BuilderRegistryAiSummary {
    const maxComponents = options.maxRegistryComponents ?? summary.components.length;
    const maxProps = options.maxRegistryPropsPerComponent;
    return {
        ...summary,
        components: summary.components.slice(0, maxComponents).map(component => ({
            ...component,
            props: maxProps === undefined ? component.props : component.props.slice(0, maxProps)
        }))
    };
}

function truncateString(value: string | undefined, maxLength: number | undefined): string | undefined {
    if (!value || !maxLength || maxLength < 1 || value.length <= maxLength) {
        return value;
    }
    return `${value.slice(0, Math.max(0, maxLength - 15))}...[truncated]`;
}

function truncateJsonValue(value: unknown, maxJsonLength: number): unknown {
    if (value === undefined || value === null || typeof value === 'number' || typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        return truncateString(value, maxJsonLength);
    }
    if (Array.isArray(value)) {
        const items: unknown[] = [];
        for (const item of value) {
            const next = truncateJsonValue(item, Math.max(1, Math.floor(maxJsonLength / 2)));
            if (JSON.stringify(items.concat(next)).length > maxJsonLength) {
                items.push('[truncated]');
                break;
            }
            items.push(next);
        }
        return items;
    }
    if (typeof value === 'object') {
        const result: Record<string, unknown> = {};
        for (const [key, child] of Object.entries(value)) {
            const next = truncateJsonValue(child, Math.max(1, Math.floor(maxJsonLength / 2)));
            if (JSON.stringify({ ...result, [key]: next }).length > maxJsonLength) {
                result.__truncated = true;
                break;
            }
            result[key] = next;
        }
        return result;
    }
    return undefined;
}

export type BuilderAiOperationType =
    | 'createPage'
    | 'replacePage'
    | 'insertNode'
    | 'updateNodeProps'
    | 'removeNode'
    | 'moveNode'
    | 'duplicateNode'
    | 'changeTheme'
    | 'generateCopy'
    | 'generateForm'
    | 'generateDashboard'
    | 'bindDataSource'
    | 'createAction'
    | 'improveLayout'
    | 'convertPromptToPage';

export const Builder_AI_OPERATION_TYPES: readonly BuilderAiOperationType[] = [
    'createPage',
    'replacePage',
    'insertNode',
    'updateNodeProps',
    'removeNode',
    'moveNode',
    'duplicateNode',
    'changeTheme',
    'generateCopy',
    'generateForm',
    'generateDashboard',
    'bindDataSource',
    'createAction',
    'improveLayout',
    'convertPromptToPage'
] as const;

export interface BuilderCreatePagePayload {
    document: BuilderDocument;
}

export interface BuilderReplacePagePayload {
    document: BuilderDocument;
    reason?: string;
}

export interface BuilderInsertNodePayload {
    parentNodeId: string;
    node: BuilderNode;
    index?: number;
    slotName?: string;
}

export interface BuilderUpdateNodePropsPayload {
    nodeId: string;
    props: Record<string, BuilderJsonValue>;
}

export interface BuilderRemoveNodePayload {
    nodeId: string;
}

export interface BuilderMoveNodePayload {
    nodeId: string;
    parentNodeId: string;
    index?: number;
    slotName?: string;
}

export interface BuilderDuplicateNodePayload {
    nodeId: string;
    parentNodeId?: string;
    index?: number;
    slotName?: string;
}

export interface BuilderChangeThemePayload {
    theme: BuilderTheme;
}

export interface BuilderGenerateCopyPayload {
    nodeId: string;
    field: string;
    value: string;
    locale?: string;
    tone?: string;
}

export interface BuilderGenerateFormPayload {
    parentNodeId: string;
    formNode: BuilderNode;
    submitActionId?: string;
    actions?: Record<string, BuilderAction>;
    index?: number;
    slotName?: string;
}

export interface BuilderGenerateDashboardPayload {
    parentNodeId?: string;
    nodes: BuilderNode[];
    dataSources?: Record<string, BuilderDataSource>;
    actions?: Record<string, BuilderAction>;
    replaceChildren?: boolean;
}

export interface BuilderBindDataSourcePayload {
    nodeId: string;
    dataSourceId: string;
    dataSource?: BuilderDataSource;
    binding?: Omit<BuilderNodeDataBinding, 'source' | 'sourceId'>;
}

export interface BuilderCreateActionPayload {
    actionId: string;
    action: BuilderAction;
}

export interface BuilderImproveLayoutPayload {
    targetNodeId?: string;
    operations: BuilderAiOperation[];
    summary?: string;
}

export interface BuilderConvertPromptToPagePayload {
    prompt: string;
    document: BuilderDocument;
}

export interface BuilderCreatePageOperation {
    type: 'createPage';
    payload: BuilderCreatePagePayload;
}

export interface BuilderReplacePageOperation {
    type: 'replacePage';
    payload: BuilderReplacePagePayload;
}

export interface BuilderInsertNodeOperation {
    type: 'insertNode';
    payload: BuilderInsertNodePayload;
}

export interface BuilderUpdateNodePropsOperation {
    type: 'updateNodeProps';
    payload: BuilderUpdateNodePropsPayload;
}

export interface BuilderRemoveNodeOperation {
    type: 'removeNode';
    payload: BuilderRemoveNodePayload;
}

export interface BuilderMoveNodeOperation {
    type: 'moveNode';
    payload: BuilderMoveNodePayload;
}

export interface BuilderDuplicateNodeOperation {
    type: 'duplicateNode';
    payload: BuilderDuplicateNodePayload;
}

export interface BuilderChangeThemeOperation {
    type: 'changeTheme';
    payload: BuilderChangeThemePayload;
}

export interface BuilderGenerateCopyOperation {
    type: 'generateCopy';
    payload: BuilderGenerateCopyPayload;
}

export interface BuilderGenerateFormOperation {
    type: 'generateForm';
    payload: BuilderGenerateFormPayload;
}

export interface BuilderGenerateDashboardOperation {
    type: 'generateDashboard';
    payload: BuilderGenerateDashboardPayload;
}

export interface BuilderBindDataSourceOperation {
    type: 'bindDataSource';
    payload: BuilderBindDataSourcePayload;
}

export interface BuilderCreateActionOperation {
    type: 'createAction';
    payload: BuilderCreateActionPayload;
}

export interface BuilderImproveLayoutOperation {
    type: 'improveLayout';
    payload: BuilderImproveLayoutPayload;
}

export interface BuilderConvertPromptToPageOperation {
    type: 'convertPromptToPage';
    payload: BuilderConvertPromptToPagePayload;
}

export type BuilderAiOperation =
    | BuilderCreatePageOperation
    | BuilderReplacePageOperation
    | BuilderInsertNodeOperation
    | BuilderUpdateNodePropsOperation
    | BuilderRemoveNodeOperation
    | BuilderMoveNodeOperation
    | BuilderDuplicateNodeOperation
    | BuilderChangeThemeOperation
    | BuilderGenerateCopyOperation
    | BuilderGenerateFormOperation
    | BuilderGenerateDashboardOperation
    | BuilderBindDataSourceOperation
    | BuilderCreateActionOperation
    | BuilderImproveLayoutOperation
    | BuilderConvertPromptToPageOperation;

export interface BuilderAiPatch {
    operations: BuilderAiOperation[];
    requiresAcceptance: boolean;
    summary?: string;
}

export interface ValidateBuilderAiOperationOptions {
    currentDocument?: BuilderDocument;
    componentRegistry: BuilderComponentRegistry;
    actionRegistry?: BuilderActionRegistry;
    dataSourceRegistry?: BuilderDataSourceRegistry;
}

export interface BuilderAiOperationValidationResult {
    valid: boolean;
    errors: BuilderAiOperationValidationError[];
}

export interface BuilderAiOperationValidationError {
    path: string;
    message: string;
    operationPath?: string;
    nodeId?: string;
    componentType?: string;
    actionId?: string;
    actionType?: string;
    dataSourceId?: string;
    dataSourceType?: string;
}

export interface ApplyBuilderAiPatchOptions extends ValidateBuilderAiOperationOptions {
    currentDocument: BuilderDocument;
}

export interface ApplyBuilderAiPatchResult {
    document: BuilderDocument;
    appliedOperations: number;
}

export type BuilderAiStructuralDiffKind = 'added' | 'removed' | 'changed';

export interface BuilderAiStructuralDiffEntry {
    kind: BuilderAiStructuralDiffKind;
    path: string;
    before?: BuilderJsonValue;
    after?: BuilderJsonValue;
}

export interface PreviewBuilderAiPatchResult extends ApplyBuilderAiPatchResult {
    diff: BuilderAiStructuralDiffEntry[];
    requiresAcceptance: boolean;
}

export class BuilderAiPatchApplyError extends Error {

    constructor(
        message: string,
        readonly errors: BuilderAiOperationValidationError[] = []
    ) {
        super(message);
        this.name = 'BuilderAiPatchApplyError';
    }
}

export class BuilderAiResponseParseError extends Error {

    constructor(message: string) {
        super(message);
        this.name = 'BuilderAiResponseParseError';
    }
}

export interface ParseBuilderAiResponseOptions {
    allowJsonCodeFence?: boolean;
    maxResponseSizeBytes?: number;
}

export function parseBuilderAiResponse(response: string, options: ParseBuilderAiResponseOptions = {}): BuilderAiPatch {
    enforceBuilderAiResponseSizeLimit(response, options);
    const json = extractBuilderAiResponseJson(response, options);
    let value: unknown;

    try {
        value = JSON.parse(json);
    } catch (error) {
        const reason = error instanceof Error ? ` ${error.message}` : '';
        throw new BuilderAiResponseParseError(`Invalid Builder AI response JSON.${reason}`);
    }

    assertSafeAiJsonValue(value, '$');
    return parseBuilderAiPatchValue(value);
}

export function validateBuilderAiPatch(patch: BuilderAiPatch, options: ValidateBuilderAiOperationOptions): BuilderAiOperationValidationResult {
    const errors: BuilderAiOperationValidationError[] = [];

    patch.operations.forEach((operation, index) => {
        errors.push(...validateBuilderAiOperation(operation, options, `operations[${index}]`).errors);
    });

    return {
        valid: errors.length === 0,
        errors
    };
}

export function applyBuilderAiPatch(patch: BuilderAiPatch, options: ApplyBuilderAiPatchOptions): ApplyBuilderAiPatchResult {
    let document = cloneBuilderDocumentValue(options.currentDocument);
    let appliedOperations = 0;

    patch.operations.forEach((operation, index) => {
        const operationPath = `operations[${index}]`;
        const validation = validateBuilderAiOperation(operation, {
            ...options,
            currentDocument: document
        }, operationPath);

        if (!validation.valid) {
            throw new BuilderAiPatchApplyError(`Cannot apply Builder AI operation at ${operationPath}: operation is invalid.`, validation.errors);
        }

        try {
            document = applyBuilderAiOperation(document, operation, options);
            appliedOperations++;
        } catch (error) {
            const reason = error instanceof Error ? error.message : String(error);
            throw new BuilderAiPatchApplyError(`Cannot apply Builder AI operation at ${operationPath}: ${reason}`, [{
                path: operationPath,
                operationPath,
                message: reason
            }]);
        }
    });

    const finalValidation = validateAppliedBuilderDocument(document, options);
    if (!finalValidation.valid) {
        throw new BuilderAiPatchApplyError('Cannot apply Builder AI patch: final document is invalid.', finalValidation.errors);
    }

    return {
        document,
        appliedOperations
    };
}

export function previewBuilderAiPatch(patch: BuilderAiPatch, options: ApplyBuilderAiPatchOptions): PreviewBuilderAiPatchResult {
    const before = cloneBuilderDocumentValue(options.currentDocument);
    const result = applyBuilderAiPatch(patch, options);

    return {
        ...result,
        diff: createBuilderStructuralDiff(before, result.document),
        requiresAcceptance: patch.requiresAcceptance || containsLargeBuilderAiOperation(patch.operations)
    };
}

function applyBuilderAiOperation(document: BuilderDocument, operation: BuilderAiOperation, options: ApplyBuilderAiPatchOptions): BuilderDocument {
    switch (operation.type) {
        case 'createPage':
        case 'replacePage':
            return cloneBuilderDocumentValue(operation.payload.document);
        case 'convertPromptToPage':
            return cloneBuilderDocumentValue(operation.payload.document);
        case 'insertNode':
            return insertNode(document, {
                parentId: operation.payload.parentNodeId,
                node: operation.payload.node,
                index: operation.payload.index,
                slotName: operation.payload.slotName
            });
        case 'updateNodeProps':
            return updateNodeProps(document, operation.payload);
        case 'removeNode':
            return removeNode(document, operation.payload);
        case 'moveNode':
            return moveNode(document, {
                nodeId: operation.payload.nodeId,
                parentId: operation.payload.parentNodeId,
                index: operation.payload.index,
                slotName: operation.payload.slotName
            });
        case 'duplicateNode':
            return duplicateNode(document, {
                nodeId: operation.payload.nodeId,
                parentId: operation.payload.parentNodeId,
                index: operation.payload.index,
                slotName: operation.payload.slotName
            });
        case 'changeTheme':
            return {
                ...document,
                theme: cloneBuilderJsonValue(operation.payload.theme) as BuilderTheme
            };
        case 'generateCopy':
            return updateNodeProps(document, {
                nodeId: operation.payload.nodeId,
                props: {
                    [operation.payload.field]: operation.payload.value
                }
            });
        case 'generateForm': {
            const withActions = operation.payload.actions ? {
                ...document,
                actions: {
                    ...(document.actions ?? {}),
                    ...(cloneBuilderJsonValue(operation.payload.actions) as Record<string, BuilderAction>)
                }
            } : document;
            return insertNode(withActions, {
                parentId: operation.payload.parentNodeId,
                node: operation.payload.formNode,
                index: operation.payload.index,
                slotName: operation.payload.slotName
            });
        }
        case 'generateDashboard': {
            let nextDocument: BuilderDocument = {
                ...document,
                actions: {
                    ...(document.actions ?? {}),
                    ...(operation.payload.actions ? cloneBuilderJsonValue(operation.payload.actions) as Record<string, BuilderAction> : {})
                },
                dataSources: {
                    ...(document.dataSources ?? {}),
                    ...(operation.payload.dataSources ? cloneBuilderJsonValue(operation.payload.dataSources) as Record<string, BuilderDataSource> : {})
                }
            };
            const parentNodeId = operation.payload.parentNodeId ?? nextDocument.tree.id;
            if (operation.payload.replaceChildren) {
                nextDocument = replaceNodeChildren(nextDocument, parentNodeId, []);
            }
            operation.payload.nodes.forEach((node, index) => {
                nextDocument = insertNode(nextDocument, {
                    parentId: parentNodeId,
                    node,
                    index: operation.payload.replaceChildren ? index : undefined
                });
            });
            return nextDocument;
        }
        case 'bindDataSource': {
            const withDataSource = operation.payload.dataSource ? {
                ...document,
                dataSources: {
                    ...(document.dataSources ?? {}),
                    [operation.payload.dataSourceId]: cloneBuilderJsonValue(operation.payload.dataSource) as BuilderDataSource
                }
            } : document;
            return updateNodeDataBinding(withDataSource, operation.payload.nodeId, {
                ...(operation.payload.binding ?? {}),
                sourceId: operation.payload.dataSourceId
            });
        }
        case 'createAction':
            return {
                ...document,
                actions: {
                    ...(document.actions ?? {}),
                    [operation.payload.actionId]: cloneBuilderJsonValue(operation.payload.action) as BuilderAction
                }
            };
        case 'improveLayout':
            return applyBuilderAiPatch({
                operations: operation.payload.operations,
                requiresAcceptance: false,
                summary: operation.payload.summary
            }, {
                currentDocument: document,
                componentRegistry: options.componentRegistry,
                actionRegistry: options.actionRegistry,
                dataSourceRegistry: options.dataSourceRegistry
            }).document;
    }
}

function containsLargeBuilderAiOperation(operations: readonly BuilderAiOperation[]): boolean {
    return operations.some(operation => {
        if (operation.type === 'createPage' || operation.type === 'replacePage' || operation.type === 'convertPromptToPage') {
            return true;
        }
        if (operation.type === 'improveLayout') {
            return true;
        }
        return false;
    });
}

function createBuilderStructuralDiff(before: BuilderDocument, after: BuilderDocument): BuilderAiStructuralDiffEntry[] {
    const entries: BuilderAiStructuralDiffEntry[] = [];
    appendStructuralDiff('$', before as unknown as BuilderJsonValue, after as unknown as BuilderJsonValue, entries);
    return entries;
}

function appendStructuralDiff(path: string, before: BuilderJsonValue | undefined, after: BuilderJsonValue | undefined, entries: BuilderAiStructuralDiffEntry[]): void {
    if (isJsonEqual(before, after)) {
        return;
    }
    if (before === undefined) {
        entries.push({ kind: 'added', path, after });
        return;
    }
    if (after === undefined) {
        entries.push({ kind: 'removed', path, before });
        return;
    }
    if (!isDiffContainer(before) || !isDiffContainer(after) || Array.isArray(before) !== Array.isArray(after)) {
        entries.push({ kind: 'changed', path, before, after });
        return;
    }
    if (Array.isArray(before) && Array.isArray(after)) {
        const length = Math.max(before.length, after.length);
        for (let index = 0; index < length; index++) {
            appendStructuralDiff(`${path}[${index}]`, before[index] as BuilderJsonValue | undefined, after[index] as BuilderJsonValue | undefined, entries);
        }
        return;
    }
    const beforeRecord = before as Record<string, BuilderJsonValue>;
    const afterRecord = after as Record<string, BuilderJsonValue>;
    const keys = Array.from(new Set([...Object.keys(beforeRecord), ...Object.keys(afterRecord)])).sort();
    for (const key of keys) {
        appendStructuralDiff(`${path}.${key}`, beforeRecord[key], afterRecord[key], entries);
    }
}

function isDiffContainer(value: BuilderJsonValue | undefined): value is BuilderJsonValue[] | Record<string, BuilderJsonValue> {
    return value !== undefined && value !== null && typeof value === 'object';
}

function isJsonEqual(left: unknown, right: unknown): boolean {
    return JSON.stringify(left) === JSON.stringify(right);
}

function validateAppliedBuilderDocument(document: BuilderDocument, options: ValidateBuilderAiOperationOptions): BuilderAiOperationValidationResult {
    const errors: BuilderAiOperationValidationError[] = [];
    validateDocumentCandidate(document, options, '$', errors);
    return validationResult(errors);
}

function replaceNodeChildren(document: BuilderDocument, nodeId: string, children: BuilderNode[]): BuilderDocument {
    const nextDocument = cloneBuilderDocumentValue(document);
    const location = findNodeById(nextDocument.tree, nodeId);
    if (!location) {
        throw new Error(`Cannot replace Builder node children because node '${nodeId}' was not found.`);
    }
    location.node.children = cloneBuilderJsonValue(children) as BuilderNode[];
    return nextDocument;
}

function updateNodeDataBinding(document: BuilderDocument, nodeId: string, data: BuilderNodeDataBinding): BuilderDocument {
    const nextDocument = cloneBuilderDocumentValue(document);
    const location = findNodeById(nextDocument.tree, nodeId);
    if (!location) {
        throw new Error(`Cannot update Builder node data because node '${nodeId}' was not found.`);
    }
    location.node.data = {
        ...(location.node.data ?? {}),
        ...cloneBuilderJsonValue(data) as BuilderNodeDataBinding
    };
    return nextDocument;
}

function cloneBuilderDocumentValue(document: BuilderDocument): BuilderDocument {
    return cloneBuilderJsonValue(document) as BuilderDocument;
}

function cloneBuilderJsonValue<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}

export function validateBuilderAiOperation(
    operation: unknown,
    options: ValidateBuilderAiOperationOptions,
    operationPath = 'operation'
): BuilderAiOperationValidationResult {
    const errors: BuilderAiOperationValidationError[] = [];

    if (!isPlainRecord(operation)) {
        return validationResult([{
            path: operationPath,
            operationPath,
            message: 'Builder AI operation must be an object.'
        }]);
    }
    if (typeof operation.type !== 'string' || !isBuilderAiOperationType(operation.type)) {
        return validationResult([{
            path: `${operationPath}.type`,
            operationPath,
            message: `Unknown Builder AI operation '${String(operation.type)}'.`
        }]);
    }
    if (!isPlainRecord(operation.payload)) {
        return validationResult([{
            path: `${operationPath}.payload`,
            operationPath,
            message: 'Builder AI operation payload must be an object.'
        }]);
    }

    validateKnownBuilderAiOperation(operation as unknown as BuilderAiOperation, options, operationPath, errors);

    return validationResult(errors);
}

function validateKnownBuilderAiOperation(
    operation: BuilderAiOperation,
    options: ValidateBuilderAiOperationOptions,
    operationPath: string,
    errors: BuilderAiOperationValidationError[]
): void {
    switch (operation.type) {
        case 'createPage':
        case 'replacePage':
            validateDocumentCandidate(operation.payload.document, options, `${operationPath}.payload.document`, errors);
            break;
        case 'convertPromptToPage':
            validateDocumentCandidate(operation.payload.document, options, `${operationPath}.payload.document`, errors);
            break;
        case 'insertNode':
            requireExistingNode(options.currentDocument, operation.payload.parentNodeId, `${operationPath}.payload.parentNodeId`, operationPath, errors);
            validateInsertedNode(operation.payload.parentNodeId, operation.payload.node, operation.payload.slotName, options, operationPath, errors);
            break;
        case 'updateNodeProps':
            validateUpdateNodeProps(operation, options, operationPath, errors);
            break;
        case 'removeNode':
            requireExistingNode(options.currentDocument, operation.payload.nodeId, `${operationPath}.payload.nodeId`, operationPath, errors);
            break;
        case 'moveNode':
            validateMoveNode(operation, options, operationPath, errors);
            break;
        case 'duplicateNode':
            requireExistingNode(options.currentDocument, operation.payload.nodeId, `${operationPath}.payload.nodeId`, operationPath, errors);
            if (operation.payload.parentNodeId) {
                validateMoveLike(operation.payload.nodeId, operation.payload.parentNodeId, operation.payload.slotName, options, operationPath, errors);
            }
            break;
        case 'generateCopy':
            requireExistingNode(options.currentDocument, operation.payload.nodeId, `${operationPath}.payload.nodeId`, operationPath, errors);
            break;
        case 'generateForm':
            requireExistingNode(options.currentDocument, operation.payload.parentNodeId, `${operationPath}.payload.parentNodeId`, operationPath, errors);
            validateInsertedNode(operation.payload.parentNodeId, operation.payload.formNode, operation.payload.slotName, withOperationActions(options, operation.payload.actions), operationPath, errors);
            if (operation.payload.submitActionId) {
                validateActionReference(operation.payload.submitActionId, withOperationActions(options, operation.payload.actions), `${operationPath}.payload.submitActionId`, operationPath, errors);
            }
            validateActionCandidates(operation.payload.actions, options, `${operationPath}.payload.actions`, operationPath, errors);
            break;
        case 'generateDashboard':
            if (operation.payload.parentNodeId) {
                requireExistingNode(options.currentDocument, operation.payload.parentNodeId, `${operationPath}.payload.parentNodeId`, operationPath, errors);
            }
            operation.payload.nodes.forEach((node, index) => {
                validateNodeCandidate(node, withOperationRegistries(options, operation.payload.actions, operation.payload.dataSources), `${operationPath}.payload.nodes[${index}]`, errors);
            });
            validateActionCandidates(operation.payload.actions, options, `${operationPath}.payload.actions`, operationPath, errors);
            validateDataSourceCandidates(operation.payload.dataSources, options, `${operationPath}.payload.dataSources`, operationPath, errors);
            break;
        case 'bindDataSource':
            requireExistingNode(options.currentDocument, operation.payload.nodeId, `${operationPath}.payload.nodeId`, operationPath, errors);
            if (!operation.payload.dataSource && !options.currentDocument?.dataSources?.[operation.payload.dataSourceId]) {
                errors.push({
                    path: `${operationPath}.payload.dataSourceId`,
                    operationPath,
                    message: `Unknown Builder data source '${operation.payload.dataSourceId}'.`,
                    dataSourceId: operation.payload.dataSourceId
                });
            }
            validateDataSourceCandidates(operation.payload.dataSource ? { [operation.payload.dataSourceId]: operation.payload.dataSource } : undefined, options, `${operationPath}.payload.dataSource`, operationPath, errors);
            break;
        case 'createAction':
            validateActionCandidates({ [operation.payload.actionId]: operation.payload.action }, options, `${operationPath}.payload.action`, operationPath, errors);
            break;
        case 'improveLayout':
            if (operation.payload.targetNodeId) {
                requireExistingNode(options.currentDocument, operation.payload.targetNodeId, `${operationPath}.payload.targetNodeId`, operationPath, errors);
            }
            operation.payload.operations.forEach((childOperation, index) => {
                errors.push(...validateBuilderAiOperation(childOperation, options, `${operationPath}.payload.operations[${index}]`).errors);
            });
            break;
        case 'changeTheme':
            break;
    }
}

function validateDocumentCandidate(
    document: BuilderDocument,
    options: ValidateBuilderAiOperationOptions,
    path: string,
    errors: BuilderAiOperationValidationError[]
): void {
    const structure = validateBuilderDocumentStructure(document);
    pushMappedErrors(structure.errors, path, undefined, errors);
    pushMappedErrors(validateBuilderDocumentTypesAgainstRegistry(document, options.componentRegistry).errors, path, undefined, errors);
    if (options.actionRegistry) {
        pushMappedErrors(validateBuilderDocumentActionsAgainstRegistry(document, options.actionRegistry).errors, path, undefined, errors);
    }
    if (options.dataSourceRegistry) {
        pushMappedErrors(validateBuilderDocumentDataSourcesAgainstRegistry(document, options.dataSourceRegistry).errors, path, undefined, errors);
    }
}

function validateNodeCandidate(
    node: BuilderNode,
    options: ValidateBuilderAiOperationOptions,
    path: string,
    errors: BuilderAiOperationValidationError[]
): void {
    pushMappedErrors(validateBuilderNodeTypesAgainstRegistry(node, options.componentRegistry).errors, path, undefined, errors);
    if (options.currentDocument) {
        const candidateDocument = {
            ...options.currentDocument,
            actions: options.currentDocument.actions,
            dataSources: options.currentDocument.dataSources,
            tree: node
        };
        pushMappedErrors(validateBuilderDocumentStructure(candidateDocument).errors, path, undefined, errors);
    }
}

function validateInsertedNode(
    parentNodeId: string,
    node: BuilderNode,
    slotName: string | undefined,
    options: ValidateBuilderAiOperationOptions,
    operationPath: string,
    errors: BuilderAiOperationValidationError[]
): void {
    validateNodeCandidate(node, options, `${operationPath}.payload.node`, errors);
    const parent = options.currentDocument && findNodeById(options.currentDocument.tree, parentNodeId)?.node;
    if (!parent) {
        return;
    }
    const candidateParent: BuilderNode = slotName
        ? { ...parent, slots: { ...(parent.slots ?? {}), [slotName]: [...(parent.slots?.[slotName] ?? []), node] } }
        : { ...parent, children: [...(parent.children ?? []), node] };
    pushMappedErrors(validateBuilderNodeTypesAgainstRegistry(candidateParent, options.componentRegistry).errors, operationPath, operationPath, errors);
}

function validateUpdateNodeProps(
    operation: BuilderUpdateNodePropsOperation,
    options: ValidateBuilderAiOperationOptions,
    operationPath: string,
    errors: BuilderAiOperationValidationError[]
): void {
    const location = requireExistingNode(options.currentDocument, operation.payload.nodeId, `${operationPath}.payload.nodeId`, operationPath, errors);
    if (!location) {
        return;
    }
    validateNodeCandidate({ ...location.node, props: { ...(location.node.props ?? {}), ...operation.payload.props } }, options, operationPath, errors);
}

function validateMoveNode(
    operation: BuilderMoveNodeOperation,
    options: ValidateBuilderAiOperationOptions,
    operationPath: string,
    errors: BuilderAiOperationValidationError[]
): void {
    requireExistingNode(options.currentDocument, operation.payload.nodeId, `${operationPath}.payload.nodeId`, operationPath, errors);
    validateMoveLike(operation.payload.nodeId, operation.payload.parentNodeId, operation.payload.slotName, options, operationPath, errors);
}

function validateMoveLike(
    nodeId: string,
    parentNodeId: string,
    slotName: string | undefined,
    options: ValidateBuilderAiOperationOptions,
    operationPath: string,
    errors: BuilderAiOperationValidationError[]
): void {
    const source = requireExistingNode(options.currentDocument, nodeId, `${operationPath}.payload.nodeId`, operationPath, errors);
    requireExistingNode(options.currentDocument, parentNodeId, `${operationPath}.payload.parentNodeId`, operationPath, errors);
    if (source) {
        validateInsertedNode(parentNodeId, source.node, slotName, options, operationPath, errors);
    }
}

function requireExistingNode(
    document: BuilderDocument | undefined,
    nodeId: string,
    path: string,
    operationPath: string,
    errors: BuilderAiOperationValidationError[]
): ReturnType<typeof findNodeById> {
    const location = document ? findNodeById(document.tree, nodeId) : undefined;
    if (!location) {
        errors.push({
            path,
            operationPath,
            message: `Unknown target node '${nodeId}'.`,
            nodeId
        });
    }
    return location;
}

function validateActionReference(
    actionId: string,
    options: ValidateBuilderAiOperationOptions,
    path: string,
    operationPath: string,
    errors: BuilderAiOperationValidationError[]
): void {
    if (!options.currentDocument?.actions?.[actionId]) {
        errors.push({
            path,
            operationPath,
            message: `Unknown Builder action '${actionId}'.`,
            actionId
        });
    }
}

function validateActionCandidates(
    actions: Record<string, BuilderAction> | undefined,
    options: ValidateBuilderAiOperationOptions,
    path: string,
    operationPath: string,
    errors: BuilderAiOperationValidationError[]
): void {
    if (!actions || !options.actionRegistry || !options.currentDocument) {
        return;
    }
    pushMappedErrors(validateBuilderDocumentActionsAgainstRegistry({ ...options.currentDocument, actions }, options.actionRegistry).errors, path, operationPath, errors);
}

function validateDataSourceCandidates(
    dataSources: Record<string, BuilderDataSource> | undefined,
    options: ValidateBuilderAiOperationOptions,
    path: string,
    operationPath: string,
    errors: BuilderAiOperationValidationError[]
): void {
    if (!dataSources || !options.dataSourceRegistry || !options.currentDocument) {
        return;
    }
    pushMappedErrors(validateBuilderDocumentDataSourcesAgainstRegistry({ ...options.currentDocument, dataSources }, options.dataSourceRegistry).errors, path, operationPath, errors);
}

function withOperationActions(options: ValidateBuilderAiOperationOptions, actions: Record<string, BuilderAction> | undefined): ValidateBuilderAiOperationOptions {
    if (!actions || !options.currentDocument) {
        return options;
    }
    return {
        ...options,
        currentDocument: {
            ...options.currentDocument,
            actions: {
                ...(options.currentDocument.actions ?? {}),
                ...actions
            }
        }
    };
}

function withOperationRegistries(
    options: ValidateBuilderAiOperationOptions,
    actions: Record<string, BuilderAction> | undefined,
    dataSources: Record<string, BuilderDataSource> | undefined
): ValidateBuilderAiOperationOptions {
    if (!options.currentDocument) {
        return options;
    }
    return {
        ...options,
        currentDocument: {
            ...options.currentDocument,
            actions: {
                ...(options.currentDocument.actions ?? {}),
                ...(actions ?? {})
            },
            dataSources: {
                ...(options.currentDocument.dataSources ?? {}),
                ...(dataSources ?? {})
            }
        }
    };
}

function pushMappedErrors(sourceErrors: readonly BuilderAiOperationValidationError[], basePath: string, operationPath: string | undefined, errors: BuilderAiOperationValidationError[]): void {
    for (const error of sourceErrors) {
        errors.push({
            ...error,
            path: `${basePath}.${error.path.replace(/^\$\./, '').replace(/^\$/, '')}`.replace(/\.$/, ''),
            operationPath
        });
    }
}

function validationResult(errors: BuilderAiOperationValidationError[]): BuilderAiOperationValidationResult {
    return {
        valid: errors.length === 0,
        errors
    };
}

export function extractBuilderAiResponseJson(response: string, options: ParseBuilderAiResponseOptions = {}): string {
    enforceBuilderAiResponseSizeLimit(response, options);
    const text = response.trim();
    if (!text) {
        throw new BuilderAiResponseParseError('Invalid Builder AI response: empty response.');
    }

    const unfenced = options.allowJsonCodeFence === false ? text : unwrapJsonCodeFence(text);
    const start = findFirstJsonObjectStart(unfenced);
    if (start === -1) {
        throw new BuilderAiResponseParseError('Invalid Builder AI response: expected one JSON object with an operations array.');
    }
    if (unfenced.slice(0, start).trim() !== '') {
        throw new BuilderAiResponseParseError('Invalid Builder AI response: text before the JSON object is not allowed.');
    }

    const end = findJsonObjectEnd(unfenced, start);
    if (end === -1) {
        throw new BuilderAiResponseParseError('Invalid Builder AI response: JSON object is incomplete.');
    }
    if (unfenced.slice(end + 1).trim() !== '') {
        throw new BuilderAiResponseParseError('Invalid Builder AI response: text after the JSON object is not allowed.');
    }

    return unfenced.slice(start, end + 1);
}

function enforceBuilderAiResponseSizeLimit(response: string, options: ParseBuilderAiResponseOptions): void {
    const maxResponseSizeBytes = options.maxResponseSizeBytes ?? Builder_AI_DEFAULT_RESPONSE_SIZE_LIMIT_BYTES;
    if (maxResponseSizeBytes > 0 && utf8ByteLength(response) > maxResponseSizeBytes) {
        throw new BuilderAiResponseParseError(`Invalid Builder AI response: response exceeds the maximum size of ${maxResponseSizeBytes} bytes.`);
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

function unwrapJsonCodeFence(text: string): string {
    const match = text.match(/^```(?:json)?\s*\r?\n([\s\S]*?)\r?\n```$/i);
    return match ? match[1].trim() : text;
}

function findFirstJsonObjectStart(text: string): number {
    for (let index = 0; index < text.length; index++) {
        if (!/\s/.test(text[index])) {
            return text[index] === '{' ? index : -1;
        }
    }
    return -1;
}

function findJsonObjectEnd(text: string, start: number): number {
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = start; index < text.length; index++) {
        const char = text[index];
        if (inString) {
            if (escaped) {
                escaped = false;
            } else if (char === '\\') {
                escaped = true;
            } else if (char === '"') {
                inString = false;
            }
            continue;
        }

        if (char === '"') {
            inString = true;
        } else if (char === '{') {
            depth++;
        } else if (char === '}') {
            depth--;
            if (depth === 0) {
                return index;
            }
            if (depth < 0) {
                return -1;
            }
        }
    }

    return -1;
}

function parseBuilderAiPatchValue(value: unknown): BuilderAiPatch {
    if (!isPlainRecord(value)) {
        throw new BuilderAiResponseParseError('Invalid Builder AI response: root value must be an object.');
    }
    if (!Array.isArray(value.operations)) {
        throw new BuilderAiResponseParseError('Invalid Builder AI response: operations must be an array.');
    }
    if (value.operations.length === 0) {
        throw new BuilderAiResponseParseError('Invalid Builder AI response: operations must contain at least one operation.');
    }

    const operations = value.operations.map((operation, index) => parseBuilderAiOperationValue(operation, `$.operations[${index}]`));

    if (value.requiresAcceptance !== undefined && typeof value.requiresAcceptance !== 'boolean') {
        throw new BuilderAiResponseParseError('Invalid Builder AI response: requiresAcceptance must be a boolean when provided.');
    }
    if (value.summary !== undefined && typeof value.summary !== 'string') {
        throw new BuilderAiResponseParseError('Invalid Builder AI response: summary must be a string when provided.');
    }

    return {
        operations,
        requiresAcceptance: value.requiresAcceptance ?? requiresAcceptanceForOperations(operations),
        summary: value.summary
    };
}

function parseBuilderAiOperationValue(value: unknown, path: string): BuilderAiOperation {
    if (!isPlainRecord(value)) {
        throw new BuilderAiResponseParseError(`Invalid Builder AI operation at ${path}: operation must be an object.`);
    }
    if (typeof value.type !== 'string' || !isBuilderAiOperationType(value.type)) {
        throw new BuilderAiResponseParseError(`Invalid Builder AI operation at ${path}: unsupported operation type '${String(value.type)}'.`);
    }
    if (!isPlainRecord(value.payload)) {
        throw new BuilderAiResponseParseError(`Invalid Builder AI operation at ${path}: payload must be an object.`);
    }

    validateBuilderAiOperationPayload(value.type, value.payload, `${path}.payload`);
    return value as unknown as BuilderAiOperation;
}

function validateBuilderAiOperationPayload(type: BuilderAiOperationType, payload: Record<string, unknown>, path: string): void {
    switch (type) {
        case 'createPage':
        case 'replacePage':
            requireObjectField(payload, 'document', path);
            break;
        case 'insertNode':
            requireStringField(payload, 'parentNodeId', path);
            requireObjectField(payload, 'node', path);
            break;
        case 'updateNodeProps':
            requireStringField(payload, 'nodeId', path);
            requireObjectField(payload, 'props', path);
            break;
        case 'removeNode':
            requireStringField(payload, 'nodeId', path);
            break;
        case 'moveNode':
            requireStringField(payload, 'nodeId', path);
            requireStringField(payload, 'parentNodeId', path);
            break;
        case 'duplicateNode':
            requireStringField(payload, 'nodeId', path);
            break;
        case 'changeTheme':
            requireObjectField(payload, 'theme', path);
            break;
        case 'generateCopy':
            requireStringField(payload, 'nodeId', path);
            requireStringField(payload, 'field', path);
            requireStringField(payload, 'value', path);
            break;
        case 'generateForm':
            requireStringField(payload, 'parentNodeId', path);
            requireObjectField(payload, 'formNode', path);
            break;
        case 'generateDashboard':
            if (!Array.isArray(payload.nodes)) {
                throw new BuilderAiResponseParseError(`Invalid Builder AI operation at ${path}: nodes must be an array.`);
            }
            break;
        case 'bindDataSource':
            requireStringField(payload, 'nodeId', path);
            requireStringField(payload, 'dataSourceId', path);
            break;
        case 'createAction':
            requireStringField(payload, 'actionId', path);
            requireObjectField(payload, 'action', path);
            break;
        case 'improveLayout':
            if (!Array.isArray(payload.operations)) {
                throw new BuilderAiResponseParseError(`Invalid Builder AI operation at ${path}: operations must be an array.`);
            }
            payload.operations.forEach((operation, index) => parseBuilderAiOperationValue(operation, `${path}.operations[${index}]`));
            break;
        case 'convertPromptToPage':
            requireStringField(payload, 'prompt', path);
            requireObjectField(payload, 'document', path);
            break;
    }
}

function requireStringField(value: Record<string, unknown>, key: string, path: string): void {
    if (typeof value[key] !== 'string' || value[key] === '') {
        throw new BuilderAiResponseParseError(`Invalid Builder AI operation at ${path}: ${key} must be a non-empty string.`);
    }
}

function requireObjectField(value: Record<string, unknown>, key: string, path: string): void {
    if (!isPlainRecord(value[key])) {
        throw new BuilderAiResponseParseError(`Invalid Builder AI operation at ${path}: ${key} must be an object.`);
    }
}

function isBuilderAiOperationType(value: string): value is BuilderAiOperationType {
    return (Builder_AI_OPERATION_TYPES as readonly string[]).includes(value);
}

function requiresAcceptanceForOperations(operations: readonly BuilderAiOperation[]): boolean {
    return operations.some(operation => operation.type === 'createPage' || operation.type === 'replacePage' || operation.type === 'convertPromptToPage' || operation.type === 'improveLayout');
}

function assertSafeAiJsonValue(value: unknown, path: string): void {
    if (value === undefined || value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        if (typeof value === 'number' && !Number.isFinite(value)) {
            throw new BuilderAiResponseParseError(`Invalid Builder AI response: unsupported number at ${path}.`);
        }
        return;
    }
    if (Array.isArray(value)) {
        value.forEach((item, index) => assertSafeAiJsonValue(item, `${path}[${index}]`));
        return;
    }
    if (isPlainRecord(value)) {
        for (const [key, child] of Object.entries(value)) {
            if (key === '__proto__' || key === 'prototype' || key === 'constructor') {
                throw new BuilderAiResponseParseError(`Invalid Builder AI response: forbidden key '${key}' at ${path}.`);
            }
            assertSafeAiJsonValue(child, `${path}.${key}`);
        }
        return;
    }
    throw new BuilderAiResponseParseError(`Invalid Builder AI response: unsupported value at ${path}.`);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

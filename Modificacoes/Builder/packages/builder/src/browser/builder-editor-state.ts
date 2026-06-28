import {
    deserializeBuilderDocumentJson,
    duplicateNode,
    findNodeById,
    moveNode,
    removeNode,
    serializeBuilderDocumentJson,
    updateNodeMeta,
    updateNodeProps,
    validateBuilderDocumentStructure,
    type BuilderDocument,
    type BuilderJsonValue,
    type BuilderNode,
    type BuilderStructuralValidationError
} from '@cybervinci/builder-schema';

export interface BuilderEditorStateOptions {
    sourceName?: string;
    validateDocument?: (document: BuilderDocument) => BuilderEditorValidationIssue[];
}

export interface BuilderEditorSnapshot {
    json: string;
    document?: BuilderDocument;
    lastAppliedVersion?: BuilderEditorDocumentVersion;
    hasUnappliedJsonChanges: boolean;
    parseError?: string;
    validationIssues: BuilderEditorValidationIssue[];
    validationMessages: string[];
    selectedNodeId?: string;
    selectedNode?: BuilderNode;
    propsDraft: string;
    propsDraftNodeId?: string;
    propsError?: string;
    dirty: boolean;
}

export interface BuilderEditorValidationIssue {
    path: string;
    message: string;
    nodeId?: string;
    componentType?: string;
}

export interface BuilderEditorDocumentVersion {
    readonly version: number;
    readonly json: string;
    readonly appliedAt: string;
}

export class BuilderEditorState {

    protected json = '';
    protected lastSavedJson = '';
    protected appliedJson = '';
    protected lastAppliedVersion: BuilderEditorDocumentVersion | undefined;
    protected nextAppliedVersion = 1;
    protected document: BuilderDocument | undefined;
    protected parseError: string | undefined;
    protected validationIssues: BuilderEditorValidationIssue[] = [];
    protected selectedNodeId: string | undefined;
    protected propsDraft = '';
    protected propsDraftNodeId: string | undefined;
    protected propsError: string | undefined;

    constructor(protected readonly options: BuilderEditorStateOptions = {}) {
    }

    get snapshot(): BuilderEditorSnapshot {
        const selectedNode = this.getSelectedNode();
        this.syncPropsDraft(selectedNode);

        return {
            json: this.json,
            document: this.document,
            lastAppliedVersion: this.lastAppliedVersion ? { ...this.lastAppliedVersion } : undefined,
            hasUnappliedJsonChanges: this.json !== this.appliedJson,
            parseError: this.parseError,
            validationIssues: this.validationIssues.map(issue => ({ ...issue })),
            validationMessages: this.validationIssues.map(issue => formatValidationMessage(issue)),
            selectedNodeId: this.selectedNodeId,
            selectedNode,
            propsDraft: this.propsDraft,
            propsDraftNodeId: this.propsDraftNodeId,
            propsError: this.propsError,
            dirty: this.json !== this.lastSavedJson
        };
    }

    loadJson(json: string): BuilderEditorSnapshot {
        this.json = json;
        this.lastSavedJson = json;
        this.appliedJson = json;
        this.refreshDraftValidation({ applyValidDocument: true });
        return this.snapshot;
    }

    setJson(json: string): BuilderEditorSnapshot {
        this.json = json;
        this.refreshDraftValidation();
        return this.snapshot;
    }

    markSaved(json: string): BuilderEditorSnapshot {
        this.json = json;
        this.lastSavedJson = json;
        this.appliedJson = json;
        this.refreshDraftValidation({ applyValidDocument: true });
        return this.snapshot;
    }

    revert(): BuilderEditorSnapshot {
        this.json = this.lastSavedJson;
        this.appliedJson = this.lastSavedJson;
        this.refreshDraftValidation({ applyValidDocument: true });
        return this.snapshot;
    }

    selectNode(nodeId: string): BuilderEditorSnapshot {
        this.selectedNodeId = nodeId;
        this.propsDraftNodeId = undefined;
        this.propsError = undefined;
        this.ensureSelection();
        return this.snapshot;
    }

    setPropsDraft(propsDraft: string): BuilderEditorSnapshot {
        this.propsDraft = propsDraft;
        return this.snapshot;
    }

    applyPropsDraft(): BuilderEditorSnapshot {
        try {
            const props = JSON.parse(this.propsDraft);
            if (!props || typeof props !== 'object' || Array.isArray(props)) {
                throw new Error('Props must be a JSON object.');
            }
            this.propsError = undefined;
            return this.updateSelectedProps(props as Record<string, BuilderJsonValue>);
        } catch (error) {
            this.propsError = error instanceof Error ? error.message : String(error);
            return this.snapshot;
        }
    }

    updateSelectedProps(props: Record<string, BuilderJsonValue>): BuilderEditorSnapshot {
        if (!this.document || !this.selectedNodeId) {
            return this.snapshot;
        }

        const nextDocument = updateNodeProps(this.document, {
            nodeId: this.selectedNodeId,
            props
        });
        const validationIssues = this.validateDocument(nextDocument);

        if (validationIssues.length > 0) {
            this.propsError = validationIssues.map(issue => formatValidationMessage(issue)).join('\n');
            return this.snapshot;
        }

        return this.applyDocument(nextDocument);
    }

    renameSelectedNode(label: string): BuilderEditorSnapshot {
        if (!this.document || !this.selectedNodeId) {
            return this.snapshot;
        }

        const trimmedLabel = label.trim();
        const nextDocument = updateNodeMeta(this.document, {
            nodeId: this.selectedNodeId,
            meta: {
                label: trimmedLabel === '' ? undefined : trimmedLabel
            }
        });
        return this.applyDocument(nextDocument);
    }

    removeSelectedNode(): BuilderEditorSnapshot {
        if (!this.document || !this.selectedNodeId || this.selectedNodeId === this.document.tree.id) {
            return this.snapshot;
        }

        const location = findNodeById(this.document.tree, this.selectedNodeId);
        const nextSelectedNodeId = location?.parent?.id ?? this.document.tree.id;
        const nextDocument = removeNode(this.document, {
            nodeId: this.selectedNodeId
        });
        this.selectedNodeId = nextSelectedNodeId;
        return this.applyDocument(nextDocument);
    }

    duplicateSelectedNode(): BuilderEditorSnapshot {
        if (!this.document || !this.selectedNodeId || this.selectedNodeId === this.document.tree.id) {
            return this.snapshot;
        }

        const location = findNodeById(this.document.tree, this.selectedNodeId);
        if (!location?.container || location.index === undefined) {
            return this.snapshot;
        }

        const nextDocument = duplicateNode(this.document, {
            nodeId: this.selectedNodeId
        });
        const nextParent = location.parent ? findNodeById(nextDocument.tree, location.parent.id)?.node : undefined;
        const nextContainer = location.slotName
            ? nextParent?.slots?.[location.slotName]
            : nextParent?.children;
        const duplicatedNode = nextContainer?.[location.index + 1];
        this.selectedNodeId = duplicatedNode?.id ?? this.selectedNodeId;
        return this.applyDocument(nextDocument);
    }

    moveSelectedNode(offset: -1 | 1): BuilderEditorSnapshot {
        if (!this.document || !this.selectedNodeId || this.selectedNodeId === this.document.tree.id) {
            return this.snapshot;
        }

        const location = findNodeById(this.document.tree, this.selectedNodeId);
        if (!location?.parent || !location.container || location.index === undefined) {
            return this.snapshot;
        }

        const targetIndex = location.index + offset;
        if (targetIndex < 0 || targetIndex >= location.container.length) {
            return this.snapshot;
        }

        const nextDocument = moveNode(this.document, {
            nodeId: this.selectedNodeId,
            parentId: location.parent.id,
            slotName: location.slotName,
            index: offset > 0 ? targetIndex + 1 : targetIndex
        });
        return this.applyDocument(nextDocument);
    }

    applyDocument(document: BuilderDocument): BuilderEditorSnapshot {
        this.json = `${serializeBuilderDocumentJson(document, { space: 2 })}\n`;
        this.appliedJson = this.json;
        this.rememberLastAppliedVersion(this.appliedJson);
        this.propsDraftNodeId = undefined;
        this.propsError = undefined;
        this.refreshDraftValidation({ applyValidDocument: true });
        return this.snapshot;
    }

    applyJsonDraft(): BuilderEditorSnapshot {
        this.refreshDraftValidation({ applyValidDocument: true });
        if (!this.parseError && this.validationIssues.length === 0) {
            this.appliedJson = this.json;
            this.rememberLastAppliedVersion(this.appliedJson);
        }
        return this.snapshot;
    }

    restoreLastAppliedDocument(): BuilderEditorSnapshot {
        this.json = this.lastAppliedVersion?.json ?? this.appliedJson;
        this.refreshDraftValidation({ applyValidDocument: true });
        return this.snapshot;
    }

    formatJson(): BuilderEditorSnapshot {
        try {
            const document = this.deserializeCurrent();
            this.json = `${serializeBuilderDocumentJson(document, { space: 2 })}\n`;
            this.refreshDraftValidation();
        } catch {
            // Keep invalid JSON untouched so formatting never replaces the user's draft.
        }
        return this.snapshot;
    }

    deserializeCurrent(): BuilderDocument {
        return deserializeBuilderDocumentJson(this.json, {
            sourceName: this.options.sourceName
        });
    }

    protected refreshDraftValidation(options: { applyValidDocument?: boolean } = {}): void {
        try {
            const document = this.deserializeCurrent();
            this.parseError = undefined;
            this.validationIssues = this.validateDocument(document);
            if (options.applyValidDocument && this.validationIssues.length === 0) {
                this.document = document;
                this.rememberLastAppliedVersion(this.json);
                this.ensureSelection();
            }
        } catch (error) {
            this.parseError = error instanceof Error ? error.message : String(error);
            this.validationIssues = [];
        }
    }

    protected validateDocument(document: BuilderDocument): BuilderEditorValidationIssue[] {
        const structural = validateBuilderDocumentStructure(document);
        const issues: BuilderEditorValidationIssue[] = structural.errors.map(error => ({
            path: error.path,
            message: error.message,
            nodeId: error.nodeId,
            componentType: error.nodeId ? findNodeById(document.tree, error.nodeId)?.node.type : undefined
        }));
        if (structural.valid) {
            issues.push(...(this.options.validateDocument?.(document) ?? []));
        }
        return issues;
    }

    protected ensureSelection(): void {
        if (!this.document) {
            return;
        }
        if (!this.selectedNodeId || !findNodeById(this.document.tree, this.selectedNodeId)) {
            this.selectedNodeId = this.document.tree.id;
            this.propsDraftNodeId = undefined;
            this.propsError = undefined;
        }
    }

    protected getSelectedNode(): BuilderNode | undefined {
        if (!this.document || !this.selectedNodeId) {
            return undefined;
        }
        return findNodeById(this.document.tree, this.selectedNodeId)?.node;
    }

    protected syncPropsDraft(node: BuilderNode | undefined): void {
        if (!node) {
            this.propsDraft = '';
            this.propsDraftNodeId = undefined;
            return;
        }
        if (this.propsDraftNodeId !== node.id) {
            this.propsDraft = JSON.stringify(node.props ?? {}, undefined, 2);
            this.propsDraftNodeId = node.id;
            this.propsError = undefined;
        }
    }

    protected rememberLastAppliedVersion(json: string): void {
        if (this.lastAppliedVersion?.json === json) {
            return;
        }
        this.lastAppliedVersion = {
            version: this.nextAppliedVersion++,
            json,
            appliedAt: new Date().toISOString()
        };
    }
}

export function formatValidationMessage(error: Pick<BuilderStructuralValidationError, 'path' | 'message' | 'nodeId'> & { componentType?: string }): string {
    const details = [
        `Path: ${error.path}`,
        error.componentType ? `Component: ${error.componentType}` : undefined,
        error.nodeId ? `nodeId: ${error.nodeId}` : undefined,
        `Error: ${error.message}`
    ].filter((detail): detail is string => detail !== undefined);

    return details.join(' | ');
}

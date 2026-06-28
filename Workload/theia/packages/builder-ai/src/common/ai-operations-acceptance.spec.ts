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

import { expect } from 'chai';
import { createBuilderDocument, validateBuilderDocumentStructure, type BuilderDocument } from '@cybervinci/builder-schema';
import {
    createDefaultBuilderActionRegistry,
    createDefaultBuilderComponentRegistry,
    createDefaultBuilderDataSourceRegistry,
    validateBuilderDocumentTypesAgainstRegistry
} from '@cybervinci/builder-registry';
import {
    applyBuilderAiPatch,
    BuilderAiPatchApplyError,
    BuilderAiResponseParseError,
    parseBuilderAiResponse,
    previewBuilderAiPatch,
    validateBuilderAiPatch,
    type BuilderAiPatch
} from './index';

describe('Builder AI operation acceptance workflow', () => {

    const componentRegistry = createDefaultBuilderComponentRegistry();
    const actionRegistry = createDefaultBuilderActionRegistry();
    const dataSourceRegistry = createDefaultBuilderDataSourceRegistry();

    const validationOptions = (currentDocument: BuilderDocument) => ({
        currentDocument,
        componentRegistry,
        actionRegistry,
        dataSourceRegistry
    });

    function createDocument(): BuilderDocument {
        const document = createBuilderDocument({ id: 'ai-workflow', title: 'AI Workflow' });
        document.tree.children = [{
            id: 'hero',
            type: 'Section',
            children: [{
                id: 'hero-title',
                type: 'Title',
                props: {
                    children: 'Old title',
                    order: 1
                }
            }]
        }];
        return document;
    }

    function createAcceptedPatch(): BuilderAiPatch {
        return parseBuilderAiResponse(JSON.stringify({
            operations: [{
                type: 'updateNodeProps',
                payload: {
                    nodeId: 'hero-title',
                    props: {
                        children: 'Accepted AI title'
                    }
                }
            }, {
                type: 'insertNode',
                payload: {
                    parentNodeId: 'hero',
                    node: {
                        id: 'hero-copy',
                        type: 'Text',
                        props: {
                            children: 'AI generated supporting copy.'
                        }
                    }
                }
            }],
            requiresAcceptance: true,
            summary: 'Update hero copy'
        }));
    }

    it('parses and validates a valid structured AI operation response', () => {
        const document = createDocument();
        const patch = createAcceptedPatch();

        const result = validateBuilderAiPatch(patch, validationOptions(document));

        expect(patch.requiresAcceptance).to.equal(true);
        expect(patch.operations.map(operation => operation.type)).to.deep.equal(['updateNodeProps', 'insertNode']);
        expect(result).to.deep.equal({
            valid: true,
            errors: []
        });
    });

    it('rejects free-form JSX instead of treating it as canonical AI output', () => {
        expect(() => parseBuilderAiResponse('<Title order={1}>Generated</Title>')).to.throw(
            BuilderAiResponseParseError,
            'expected one JSON object'
        );
    });

    it('rejects operations that create an unknown component type', () => {
        const document = createDocument();
        const patch: BuilderAiPatch = {
            operations: [{
                type: 'insertNode',
                payload: {
                    parentNodeId: 'hero',
                    node: {
                        id: 'hero-widget',
                        type: 'ImaginaryWidget'
                    }
                }
            }],
            requiresAcceptance: false
        };

        const result = validateBuilderAiPatch(patch, validationOptions(document));

        expect(result.valid).to.equal(false);
        expect(result.errors.map(error => error.message)).to.include(
            "Unknown Builder component type 'ImaginaryWidget'. Register it in ComponentRegistry or validate in editor mode to allow an editor fallback."
        );
    });

    it('rejects operations with props that do not match the registered propsSchema', () => {
        const document = createDocument();
        const patch: BuilderAiPatch = {
            operations: [{
                type: 'updateNodeProps',
                payload: {
                    nodeId: 'hero-title',
                    props: {
                        order: 'first'
                    }
                }
            }],
            requiresAcceptance: false
        };

        const result = validateBuilderAiPatch(patch, validationOptions(document));

        expect(result.valid).to.equal(false);
        expect(result.errors.some(error => (
            error.nodeId === 'hero-title'
            && error.message === "Invalid props value for component 'Title': expected integer."
        ))).to.equal(true);
    });

    it('rejects operations whose target node is absent', () => {
        const document = createDocument();
        const patch: BuilderAiPatch = {
            operations: [{
                type: 'updateNodeProps',
                payload: {
                    nodeId: 'missing-title',
                    props: {
                        children: 'No target'
                    }
                }
            }],
            requiresAcceptance: false
        };

        const result = validateBuilderAiPatch(patch, validationOptions(document));

        expect(result.valid).to.equal(false);
        expect(result.errors).to.deep.include({
            path: 'operations[0].payload.nodeId',
            operationPath: 'operations[0]',
            message: "Unknown target node 'missing-title'.",
            nodeId: 'missing-title'
        });
    });

    it('generates a preview diff before acceptance and does not mutate the current document', () => {
        const document = createDocument();
        const preview = previewBuilderAiPatch(createAcceptedPatch(), validationOptions(document));

        expect(preview.requiresAcceptance).to.equal(true);
        expect(preview.diff).to.deep.include({
            kind: 'changed',
            path: '$.tree.children[0].children[0].props.children',
            before: 'Old title',
            after: 'Accepted AI title'
        });
        expect(preview.diff.some(entry => entry.kind === 'added' && entry.path === '$.tree.children[0].children[1]')).to.equal(true);
        expect(document.tree.children?.[0].children?.map(node => node.id)).to.deep.equal(['hero-title']);
        expect(document.tree.children?.[0].children?.[0].props?.children).to.equal('Old title');
    });

    it('applies the previewed patch only on acceptance and keeps the rejected document unchanged', () => {
        const acceptedDocument = createDocument();
        const rejectedDocument = createDocument();
        const patch = createAcceptedPatch();

        previewBuilderAiPatch(patch, validationOptions(rejectedDocument));
        const accepted = applyBuilderAiPatch(patch, validationOptions(acceptedDocument));

        expect(rejectedDocument.tree.children?.[0].children?.map(node => node.id)).to.deep.equal(['hero-title']);
        expect(rejectedDocument.tree.children?.[0].children?.[0].props?.children).to.equal('Old title');
        expect(accepted.document.tree.children?.[0].children?.map(node => node.id)).to.deep.equal(['hero-title', 'hero-copy']);
        expect(accepted.document.tree.children?.[0].children?.[0].props?.children).to.equal('Accepted AI title');
    });

    it('rejects invalid patches during apply and leaves the source document unchanged', () => {
        const document = createDocument();
        const patch: BuilderAiPatch = {
            operations: [{
                type: 'insertNode',
                payload: {
                    parentNodeId: 'hero',
                    node: {
                        id: 'broken',
                        type: 'ImaginaryWidget'
                    }
                }
            }],
            requiresAcceptance: true
        };

        expect(() => applyBuilderAiPatch(patch, validationOptions(document))).to.throw(
            BuilderAiPatchApplyError,
            'operation is invalid'
        );
        expect(document.tree.children?.[0].children?.map(node => node.id)).to.deep.equal(['hero-title']);
    });

    it('produces a final document that remains structurally valid and registry-valid after acceptance', () => {
        const document = createDocument();
        const accepted = applyBuilderAiPatch(createAcceptedPatch(), validationOptions(document));

        expect(validateBuilderDocumentStructure(accepted.document)).to.deep.equal({
            valid: true,
            errors: []
        });
        expect(validateBuilderDocumentTypesAgainstRegistry(accepted.document, componentRegistry)).to.deep.equal({
            valid: true,
            errors: []
        });
    });
});

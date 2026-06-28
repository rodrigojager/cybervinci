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
import { createBuilderDocument } from '@cybervinci/builder-schema';
import {
    createBuilderRegistryAiSummary,
    createDefaultBuilderActionRegistry,
    createDefaultBuilderComponentRegistry,
    createDefaultBuilderDataSourceRegistry
} from '@cybervinci/builder-registry';
import {
    Builder_AI_BASE_SYSTEM_PROMPT,
    Builder_AI_SAFETY_RULES,
    Builder_AI_OPERATION_TYPES,
    Builder_AI_SKILLS,
    BuilderAiPatchApplyError,
    applyBuilderAiPatch,
    createBuilderAiBasePrompt,
    createBuilderAiContextBundle,
    createBuilderAiSkillPrompt,
    BuilderAiResponseParseError,
    extractBuilderAiResponseJson,
    getBuilderAiSkillDefinition,
    parseBuilderAiResponse,
    previewBuilderAiPatch,
    validateBuilderAiOperation,
    validateBuilderAiPatch
} from './index';

describe('Builder AI base prompt', () => {

    it('requires valid JSON only and forbids free-form JSX or HTML as the primary response', () => {
        expect(Builder_AI_BASE_SYSTEM_PROMPT).to.contain('Return only one valid JSON object');
        expect(Builder_AI_BASE_SYSTEM_PROMPT).to.contain('Do not wrap it in Markdown');
        expect(Builder_AI_BASE_SYSTEM_PROMPT).to.contain('Never return JSX');
        expect(Builder_AI_BASE_SYSTEM_PROMPT).to.contain('HTML');
        expect(Builder_AI_BASE_SYSTEM_PROMPT).to.contain('Builder Schema is the only canonical page format');
    });

    it('instructs the model to use only ComponentRegistry component types', () => {
        expect(Builder_AI_BASE_SYSTEM_PROMPT).to.contain('Use only component types that appear in the provided ComponentRegistry summary');
        expect(Builder_AI_BASE_SYSTEM_PROMPT).to.contain('Do not invent component types');
    });

    it('includes operation names, registry summary, current document, selection, and user request', () => {
        const registry = createBuilderRegistryAiSummary(createDefaultBuilderComponentRegistry(), {
            maxPropsPerComponent: 1,
            maxChildrenPerComponent: 1,
            maxSlotsPerComponent: 1,
            includeEvents: false
        });
        const prompt = createBuilderAiBasePrompt({
            registry,
            currentDocument: {
                schemaVersion: '1.0.0',
                metadata: {
                    id: 'home',
                    name: 'Home',
                    createdBy: 'spec',
                    createdAt: '2026-05-20T00:00:00.000Z',
                    updatedAt: '2026-05-20T00:00:00.000Z'
                },
                page: {
                    id: 'home',
                    title: 'Home',
                    route: '/',
                    layout: 'default'
                },
                tree: {
                    id: 'home-root',
                    type: 'Page',
                    props: {
                        title: 'Home'
                    }
                }
            },
            selectedNodeId: 'home-root',
            userRequest: 'Create a SaaS dashboard'
        });

        for (const operationType of Builder_AI_OPERATION_TYPES) {
            expect(prompt).to.contain(`- ${operationType}`);
        }
        expect(prompt).to.contain('"components"');
        expect(prompt).to.contain('"type":"Page"');
        expect(prompt).to.contain('Selected node id:\nhome-root');
        expect(prompt).to.contain('User request:\nCreate a SaaS dashboard');
    });

    it('builds a compact AI context with safety rules and selected node details', () => {
        const registry = createBuilderRegistryAiSummary(createDefaultBuilderComponentRegistry(), {
            maxPropsPerComponent: 3
        });
        const bundle = createBuilderAiContextBundle({
            registry,
            maxRegistryComponents: 2,
            maxRegistryPropsPerComponent: 1,
            selectedNodeId: 'hero-title',
            userRequest: 'Improve the selected title',
            currentDocument: {
                schemaVersion: '1.0.0',
                metadata: {
                    id: 'home',
                    name: 'Home',
                    createdBy: 'spec',
                    createdAt: '2026-05-20T00:00:00.000Z',
                    updatedAt: '2026-05-20T00:00:00.000Z'
                },
                page: {
                    id: 'home',
                    title: 'Home',
                    route: '/',
                    layout: 'default'
                },
                tree: {
                    id: 'home-root',
                    type: 'Page',
                    children: [{
                        id: 'hero-title',
                        type: 'Title',
                        props: {
                            children: 'Build faster'
                        }
                    }]
                }
            }
        });

        expect(bundle.registry.components).to.have.length(2);
        expect(bundle.registry.components[0].props).to.have.length.at.most(1);
        expect(bundle.selectedNode).to.deep.include({
            nodeId: 'hero-title',
            found: true,
            truncated: false
        });
        expect(bundle.selectedNode?.value).to.deep.include({
            id: 'hero-title',
            type: 'Title'
        });
        expect(bundle.safetyRules).to.equal(Builder_AI_SAFETY_RULES);
        expect(bundle.safetyRules.join('\n')).to.contain('Do not emit or request eval');
    });

    it('marks missing selected nodes and truncates oversized context fields', () => {
        const registry = createBuilderRegistryAiSummary(createDefaultBuilderComponentRegistry());
        const bundle = createBuilderAiContextBundle({
            registry,
            selectedNodeId: 'missing-node',
            maxDocumentJsonLength: 120,
            maxUserRequestLength: 32,
            userRequest: 'Create a complete dashboard with many sections, data tables, charts, and actions',
            currentDocument: {
                schemaVersion: '1.0.0',
                metadata: {
                    id: 'home',
                    name: 'Home',
                    createdBy: 'spec',
                    createdAt: '2026-05-20T00:00:00.000Z',
                    updatedAt: '2026-05-20T00:00:00.000Z'
                },
                page: {
                    id: 'home',
                    title: 'Home',
                    route: '/',
                    layout: 'default'
                },
                tree: {
                    id: 'home-root',
                    type: 'Page',
                    props: {
                        title: 'Home',
                        description: 'A long description that should be compacted when the context builder receives a small JSON budget.'
                    }
                }
            }
        });

        expect(bundle.currentDocument?.truncated).to.equal(true);
        expect(bundle.selectedNode).to.deep.include({
            nodeId: 'missing-node',
            found: false
        });
        expect(bundle.selectedNode?.value).to.deep.equal({
            id: 'missing-node',
            type: 'Unknown'
        });
        expect(bundle.userRequest).to.equal('Create a complete...[truncated]');
    });
});

describe('Builder AI skills', () => {

    it('registers the initial UI builder skills with structured operation constraints', () => {
        expect(Builder_AI_SKILLS.map(skill => skill.name)).to.deep.equal([
            'generate_page',
            'update_selected_component',
            'insert_component',
            'improve_copy',
            'change_theme',
            'generate_form',
            'generate_dashboard'
        ]);

        expect(getBuilderAiSkillDefinition('generate_page').allowedOperations).to.deep.equal([
            'convertPromptToPage',
            'createPage',
            'replacePage'
        ]);
        expect(getBuilderAiSkillDefinition('update_selected_component')).to.deep.include({
            requiresCurrentDocument: true,
            requiresSelection: true,
            requiresAcceptance: false
        });
        expect(getBuilderAiSkillDefinition('generate_dashboard')).to.deep.include({
            requiresCurrentDocument: true,
            requiresSelection: false,
            requiresAcceptance: true
        });
    });

    it('builds skill prompts that narrow the base prompt to the selected skill operations', () => {
        const registry = createBuilderRegistryAiSummary(createDefaultBuilderComponentRegistry(), {
            maxPropsPerComponent: 1
        });
        const document = createBuilderDocument({ id: 'skills', title: 'Skills' });
        document.tree.children = [{
            id: 'hero-title',
            type: 'Title',
            props: {
                children: 'Old copy'
            }
        }];

        const prompt = createBuilderAiSkillPrompt({
            skillName: 'update_selected_component',
            registry,
            currentDocument: document,
            selectedNodeId: 'hero-title',
            userRequest: 'Make the selected title clearer'
        });

        expect(prompt).to.contain(Builder_AI_BASE_SYSTEM_PROMPT);
        expect(prompt).to.contain('Active Builder AI skill:\nupdate_selected_component');
        expect(prompt).to.contain('Skill allowed operations:\n- updateNodeProps\n- bindDataSource\n- createAction');
        expect(prompt).to.contain('Use only the skill allowed operations listed above.');
        expect(prompt).to.contain('A selected node is required.');
        expect(prompt).to.contain('"id":"hero-title"');
        expect(prompt).to.contain('Never return JSX');
    });
});

describe('Builder AI response parser', () => {

    it('parses a valid operation response and infers acceptance for page-wide changes', () => {
        const patch = parseBuilderAiResponse(JSON.stringify({
            operations: [{
                type: 'convertPromptToPage',
                payload: {
                    prompt: 'Create a landing page',
                    document: {
                        schemaVersion: '0.1.0',
                        metadata: {
                            id: 'landing',
                            name: 'Landing',
                            createdAt: '2026-05-20T00:00:00.000Z',
                            updatedAt: '2026-05-20T00:00:00.000Z'
                        },
                        page: {
                            id: 'landing',
                            title: 'Landing'
                        },
                        tree: {
                            id: 'landing-root',
                            type: 'Page'
                        }
                    }
                }
            }],
            summary: 'Created a landing page'
        }));

        expect(patch.operations).to.have.length(1);
        expect(patch.operations[0].type).to.equal('convertPromptToPage');
        expect(patch.requiresAcceptance).to.equal(true);
        expect(patch.summary).to.equal('Created a landing page');
    });

    it('extracts JSON from a bare JSON code fence without accepting prose', () => {
        const response = [
            '```json',
            '{"operations":[{"type":"removeNode","payload":{"nodeId":"hero"}}],"requiresAcceptance":false}',
            '```'
        ].join('\n');

        expect(extractBuilderAiResponseJson(response)).to.equal('{"operations":[{"type":"removeNode","payload":{"nodeId":"hero"}}],"requiresAcceptance":false}');
        expect(parseBuilderAiResponse(response).requiresAcceptance).to.equal(false);
    });

    it('rejects explanatory or unsafe text outside the JSON object', () => {
        expect(() => parseBuilderAiResponse('Sure.\n{"operations":[]}')).to.throw(
            BuilderAiResponseParseError,
            'expected one JSON object'
        );
        expect(() => parseBuilderAiResponse('{"operations":[{"type":"removeNode","payload":{"nodeId":"hero"}}]} <script>alert(1)</script>')).to.throw(
            BuilderAiResponseParseError,
            'text after the JSON object is not allowed'
        );
    });

    it('rejects AI responses that exceed the configured size limit', () => {
        expect(() => parseBuilderAiResponse('{"operations":[{"type":"removeNode","payload":{"nodeId":"hero"}}]}', {
            maxResponseSizeBytes: 16
        })).to.throw(BuilderAiResponseParseError, 'response exceeds the maximum size of 16 bytes');
    });

    it('rejects invalid operation responses with clear messages', () => {
        expect(() => parseBuilderAiResponse('{"operations":[{"type":"eval","payload":{}}]}')).to.throw(
            BuilderAiResponseParseError,
            "unsupported operation type 'eval'"
        );
        expect(() => parseBuilderAiResponse('{"operations":[{"type":"insertNode","payload":{"node":{"id":"title","type":"Title"}}}]}')).to.throw(
            BuilderAiResponseParseError,
            'parentNodeId must be a non-empty string'
        );
    });

    it('rejects forbidden prototype pollution keys before applying operations', () => {
        expect(() => parseBuilderAiResponse('{"operations":[{"type":"removeNode","payload":{"nodeId":"hero","constructor":{}}}]}')).to.throw(
            BuilderAiResponseParseError,
            "forbidden key 'constructor'"
        );
    });
});

describe('Builder AI operation validator', () => {

    const componentRegistry = createDefaultBuilderComponentRegistry();
    const actionRegistry = createDefaultBuilderActionRegistry();
    const dataSourceRegistry = createDefaultBuilderDataSourceRegistry();
    const currentDocument = createBuilderDocument({ id: 'landing', title: 'Landing' });

    currentDocument.actions = {
        goHome: {
            type: 'navigate',
            params: {
                to: '/'
            }
        }
    };
    currentDocument.dataSources = {
        metrics: {
            type: 'static',
            config: {
                value: [{ label: 'Revenue', value: 42 }]
            }
        }
    };
    currentDocument.tree.children = [{
        id: 'hero',
        type: 'Section',
        children: [{
            id: 'hero-title',
            type: 'Title',
            props: {
                children: 'Launch faster',
                order: 1
            }
        }]
    }];

    const validationOptions = {
        currentDocument,
        componentRegistry,
        actionRegistry,
        dataSourceRegistry
    };

    it('accepts known operations that target existing nodes and registered components', () => {
        const result = validateBuilderAiPatch({
            operations: [{
                type: 'insertNode',
                payload: {
                    parentNodeId: 'hero',
                    node: {
                        id: 'hero-copy',
                        type: 'Text',
                        props: {
                            children: 'A polished Builder page.'
                        }
                    }
                }
            }],
            requiresAcceptance: false
        }, validationOptions);

        expect(result).to.deep.equal({
            valid: true,
            errors: []
        });
    });

    it('rejects unknown operations and missing target nodes', () => {
        expect(validateBuilderAiOperation({
            type: 'eval',
            payload: {}
        }, validationOptions)).to.deep.equal({
            valid: false,
            errors: [{
                path: 'operation.type',
                operationPath: 'operation',
                message: "Unknown Builder AI operation 'eval'."
            }]
        });

        expect(validateBuilderAiOperation({
            type: 'removeNode',
            payload: {
                nodeId: 'missing'
            }
        }, validationOptions).errors).to.deep.include({
            path: 'operation.payload.nodeId',
            operationPath: 'operation',
            message: "Unknown target node 'missing'.",
            nodeId: 'missing'
        });
    });

    it('validates inserted component type, propsSchema, allowedChildren, actions, dataSources, and permissions', () => {
        const result = validateBuilderAiOperation({
            type: 'insertNode',
            payload: {
                parentNodeId: 'hero',
                node: {
                    id: 'bad-card',
                    type: 'Card',
                    props: {
                        unknownProp: true
                    },
                    permissions: [{
                        effect: 'maybe'
                    }],
                    events: {
                        click: {
                            actionId: 'missing-action'
                        }
                    },
                    data: {
                        sourceId: 'missing-source'
                    },
                    children: [{
                        id: 'bad-child',
                        type: 'NotRegistered'
                    }]
                }
            }
        }, validationOptions);

        expect(result.valid).to.equal(false);
        expect(result.errors.map(error => error.message)).to.include.members([
            "Unknown Builder component type 'NotRegistered'. Register it in ComponentRegistry or validate in editor mode to allow an editor fallback.",
            "Builder event 'click' references unknown action 'missing-action'.",
            "Builder data binding references unknown dataSource 'missing-source'.",
            "Builder permission effect must be 'allow' or 'deny'."
        ]);
        expect(result.errors.some(error => error.message.includes("Unknown prop 'unknownProp'"))).to.equal(true);
    });

    it('validates createAction and bindDataSource against their registries', () => {
        const actionResult = validateBuilderAiOperation({
            type: 'createAction',
            payload: {
                actionId: 'broken',
                action: {
                    type: 'navigate',
                    params: {
                        target: 'popup'
                    }
                }
            }
        }, validationOptions);
        expect(actionResult.errors.map(error => error.message)).to.include("Missing required param 'to' for action 'broken'.");
        expect(actionResult.errors.map(error => error.message)).to.include("Invalid params value for action 'broken': expected one of self, blank.");

        const dataSourceResult = validateBuilderAiOperation({
            type: 'bindDataSource',
            payload: {
                nodeId: 'hero-title',
                dataSourceId: 'remote',
                dataSource: {
                    type: 'http',
                    config: {
                        method: 'TRACE'
                    }
                }
            }
        }, validationOptions);
        expect(dataSourceResult.valid).to.equal(false);
        expect(dataSourceResult.errors.some(error => error.message.includes('expected one of GET, POST'))).to.equal(true);
    });
});

describe('Builder AI patch applicator', () => {

    const componentRegistry = createDefaultBuilderComponentRegistry();
    const actionRegistry = createDefaultBuilderActionRegistry();
    const dataSourceRegistry = createDefaultBuilderDataSourceRegistry();

    it('applies operations through Builder tree helpers and validates the final document', () => {
        const currentDocument = createBuilderDocument({ id: 'ai-apply', title: 'AI Apply' });
        currentDocument.tree.children = [{
            id: 'hero',
            type: 'Section',
            children: [{
                id: 'hero-title',
                type: 'Title',
                props: {
                    children: 'Old title'
                }
            }]
        }];

        const result = applyBuilderAiPatch({
            operations: [{
                type: 'insertNode',
                payload: {
                    parentNodeId: 'hero',
                    node: {
                        id: 'hero-copy',
                        type: 'Text',
                        props: {
                            children: 'Generated copy'
                        }
                    }
                }
            }, {
                type: 'updateNodeProps',
                payload: {
                    nodeId: 'hero-title',
                    props: {
                        children: 'Generated title'
                    }
                }
            }, {
                type: 'moveNode',
                payload: {
                    nodeId: 'hero-copy',
                    parentNodeId: currentDocument.tree.id,
                    index: 1
                }
            }],
            requiresAcceptance: false
        }, {
            currentDocument,
            componentRegistry,
            actionRegistry,
            dataSourceRegistry
        });

        expect(result.appliedOperations).to.equal(3);
        expect(result.document.tree.children?.map(node => node.id)).to.deep.equal(['hero', 'hero-copy']);
        expect(result.document.tree.children?.[0].children?.[0].props?.children).to.equal('Generated title');
        expect(currentDocument.tree.children?.map(node => node.id)).to.deep.equal(['hero']);
    });

    it('rejects invalid operations before mutating the document', () => {
        const currentDocument = createBuilderDocument({ id: 'ai-reject', title: 'AI Reject' });

        expect(() => applyBuilderAiPatch({
            operations: [{
                type: 'insertNode',
                payload: {
                    parentNodeId: currentDocument.tree.id,
                    node: {
                        id: 'broken',
                        type: 'NotRegistered'
                    }
                }
            }],
            requiresAcceptance: false
        }, {
            currentDocument,
            componentRegistry,
            actionRegistry,
            dataSourceRegistry
        })).to.throw(BuilderAiPatchApplyError, 'operation is invalid');

        expect(currentDocument.tree.children).to.deep.equal([]);
    });

    it('validates the final document after sequential AI operations', () => {
        const currentDocument = createBuilderDocument({ id: 'ai-final-validation', title: 'AI Final Validation' });

        expect(() => applyBuilderAiPatch({
            operations: [{
                type: 'changeTheme',
                payload: {
                    theme: {
                        mode: 'invalid' as 'light',
                        primaryColor: 'blue'
                    }
                }
            }],
            requiresAcceptance: false
        }, {
            currentDocument,
            componentRegistry,
            actionRegistry,
            dataSourceRegistry
        })).to.throw(BuilderAiPatchApplyError, 'final document is invalid');
    });

    it('creates a structural preview diff before applying large page operations', () => {
        const currentDocument = createBuilderDocument({ id: 'ai-preview-before', title: 'Before' });
        const nextDocument = createBuilderDocument({ id: 'ai-preview-after', title: 'After' });
        nextDocument.tree.children = [{
            id: 'preview-title',
            type: 'Title',
            props: {
                children: 'Generated page'
            }
        }];

        const preview = previewBuilderAiPatch({
            operations: [{
                type: 'replacePage',
                payload: {
                    document: nextDocument,
                    reason: 'Regenerate page layout'
                }
            }],
            requiresAcceptance: false
        }, {
            currentDocument,
            componentRegistry,
            actionRegistry,
            dataSourceRegistry
        });

        expect(preview.requiresAcceptance).to.equal(true);
        expect(preview.document.metadata.id).to.equal('ai-preview-after');
        expect(preview.diff.some(entry => entry.path === '$.metadata.id' && entry.kind === 'changed')).to.equal(true);
        expect(preview.diff.some(entry => entry.path === '$.tree.children[0]' && entry.kind === 'added')).to.equal(true);
        expect(currentDocument.metadata.id).to.equal('ai-preview-before');
        expect(currentDocument.tree.children).to.deep.equal([]);
    });

    it('marks improveLayout previews as requiring acceptance and reports nested operation changes', () => {
        const currentDocument = createBuilderDocument({ id: 'ai-preview-layout', title: 'Layout Preview' });
        currentDocument.tree.children = [{
            id: 'layout-title',
            type: 'Title',
            props: {
                children: 'Old'
            }
        }];

        const preview = previewBuilderAiPatch({
            operations: [{
                type: 'improveLayout',
                payload: {
                    operations: [{
                        type: 'updateNodeProps',
                        payload: {
                            nodeId: 'layout-title',
                            props: {
                                children: 'Improved'
                            }
                        }
                    }]
                }
            }],
            requiresAcceptance: false
        }, {
            currentDocument,
            componentRegistry,
            actionRegistry,
            dataSourceRegistry
        });

        expect(preview.requiresAcceptance).to.equal(true);
        expect(preview.diff).to.deep.include({
            kind: 'changed',
            path: '$.tree.children[0].props.children',
            before: 'Old',
            after: 'Improved'
        });
        expect(currentDocument.tree.children?.[0].props?.children).to.equal('Old');
    });
});

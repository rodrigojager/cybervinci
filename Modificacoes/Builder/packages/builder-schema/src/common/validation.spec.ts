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
import {
    createBuilderDocument,
    BuilderJsonParseError,
    BuilderNode,
    deserializeBuilderDocumentJson,
    validateBuilderDocumentStructure
} from './index';

describe('validateBuilderDocumentStructure', () => {

    it('rejects invalid Builder JSON before structural validation', () => {
        expect(() => deserializeBuilderDocumentJson('{ "schemaVersion": ', { sourceName: 'invalid.builder.json' }))
            .to.throw(BuilderJsonParseError, 'Invalid Builder JSON in invalid.builder.json.');
    });

    it('accepts a minimal document created by the schema factory', () => {
        const result = validateBuilderDocumentStructure(createBuilderDocument({
            id: 'landing',
            title: 'Landing'
        }));

        expect(result).to.deep.equal({
            valid: true,
            errors: []
        });
    });

    it('reports missing required document, metadata, page, and tree fields', () => {
        const result = validateBuilderDocumentStructure({
            metadata: {},
            page: {},
            tree: {}
        });

        expect(result.valid).to.equal(false);
        expect(result.errors).to.deep.include.members([
            {
                path: '$.schemaVersion',
                message: "Required Builder field 'schemaVersion' must be a non-empty string."
            },
            {
                path: '$.metadata.id',
                message: "Required Builder field 'id' must be a non-empty string."
            },
            {
                path: '$.metadata.name',
                message: "Required Builder field 'name' must be a non-empty string."
            },
            {
                path: '$.page.id',
                message: "Required Builder field 'id' must be a non-empty string."
            },
            {
                path: '$.page.title',
                message: "Required Builder field 'title' must be a non-empty string."
            },
            {
                path: '$.tree.id',
                message: "Required Builder field 'id' must be a non-empty string."
            },
            {
                path: '$.tree.type',
                message: "Required Builder field 'type' must be a non-empty string."
            }
        ]);
    });

    it('rejects unsupported schema versions by default and allows configured versions', () => {
        const document = createBuilderDocument();
        document.schemaVersion = '0.0.1';

        expect(validateBuilderDocumentStructure(document).errors).to.deep.include({
            path: '$.schemaVersion',
            message: "Unsupported Builder schemaVersion '0.0.1'."
        });

        expect(validateBuilderDocumentStructure(document, {
            supportedSchemaVersions: ['0.0.1']
        }).valid).to.equal(true);
    });

    it('validates the canonical theme model independently from renderer libraries', () => {
        const document = createBuilderDocument();
        document.theme = {
            mode: 'dark',
            primaryColor: 'brand-blue',
            radius: 'lg',
            fontFamily: 'Inter, sans-serif',
            spacing: {
                xs: 4,
                content: '2rem'
            },
            tokens: {
                colors: {
                    surface: '#ffffff'
                }
            }
        };

        expect(validateBuilderDocumentStructure(document)).to.deep.equal({
            valid: true,
            errors: []
        });
    });

    it('reports invalid canonical theme fields', () => {
        const document = createBuilderDocument();
        document.theme = {
            mode: 'system' as never,
            primaryColor: 42 as never,
            radius: false as never,
            fontFamily: [] as never,
            spacing: {
                md: {}
            } as never,
            tokens: [] as never
        };

        expect(validateBuilderDocumentStructure(document).errors).to.deep.include.members([
            {
                path: '$.theme.mode',
                message: "Builder theme field 'mode' must be 'light', 'dark', or 'auto' when present."
            },
            {
                path: '$.theme.primaryColor',
                message: "Builder field 'primaryColor' must be a string when present."
            },
            {
                path: '$.theme.radius',
                message: "Builder field 'radius' must be a string when present."
            },
            {
                path: '$.theme.fontFamily',
                message: "Builder field 'fontFamily' must be a string when present."
            },
            {
                path: '$.theme.spacing.md',
                message: 'Builder theme spacing values must be strings or numbers.'
            },
            {
                path: '$.theme.tokens',
                message: 'Builder field must be an object when present.'
            }
        ]);
    });

    it('reports basic type errors for optional top-level, metadata, page, and node fields', () => {
        const result = validateBuilderDocumentStructure({
            schemaVersion: '0.1.0',
            metadata: {
                id: 'landing',
                name: 'Landing',
                tags: ['ok', 42],
                createdAt: false
            },
            page: {
                id: 'landing',
                title: 'Landing',
                route: 10
            },
            actions: [],
            tree: {
                id: 'root',
                type: 'Page',
                props: [],
                children: {},
                slots: [],
                permissions: {}
            }
        });

        expect(result.valid).to.equal(false);
        expect(result.errors).to.deep.include.members([
            {
                path: '$.metadata.tags[1]',
                message: "Builder field 'tags' must contain only strings."
            },
            {
                path: '$.metadata.createdAt',
                message: "Builder field 'createdAt' must be a string when present."
            },
            {
                path: '$.page.route',
                message: "Builder field 'route' must be a string when present."
            },
            {
                path: '$.actions',
                message: 'Builder field must be an object when present.'
            },
            {
                path: '$.tree.props',
                message: 'Builder field must be an object when present.',
                nodeId: 'root'
            },
            {
                path: '$.tree.children',
                message: 'Builder node collection must be an array.',
                nodeId: 'root'
            },
            {
                path: '$.tree.slots',
                message: 'Builder node slots must be an object.',
                nodeId: 'root'
            },
            {
                path: '$.tree.permissions',
                message: 'Builder node permissions must be an array.',
                nodeId: 'root'
            }
        ]);
    });

    it('validates nested children, slots, and empty state nodes', () => {
        const document = createBuilderDocument({ id: 'landing' });
        document.tree.children = [
            {
                id: 'table',
                type: 'DataTable',
                slots: {
                    toolbar: [
                        { id: '', type: 'Button' }
                    ]
                },
                data: {
                    emptyState: [
                        { id: 'empty', type: '' }
                    ]
                }
            }
        ];

        const result = validateBuilderDocumentStructure(document);

        expect(result.valid).to.equal(false);
        expect(result.errors).to.deep.include.members([
            {
                path: '$.tree.children[0].slots.toolbar[0].id',
                message: "Required Builder field 'id' must be a non-empty string."
            },
            {
                path: '$.tree.children[0].data.emptyState[0].type',
                message: "Required Builder field 'type' must be a non-empty string.",
                nodeId: 'empty'
            }
        ]);
    });

    it('reports duplicate node ids across children, slots, and empty state nodes', () => {
        const document = createBuilderDocument({ id: 'landing' });
        document.tree.children = [
            {
                id: 'content',
                type: 'Section',
                children: [
                    { id: 'cta', type: 'Button' }
                ],
                slots: {
                    actions: [
                        { id: 'cta', type: 'Button' }
                    ]
                },
                data: {
                    emptyState: [
                        { id: 'content', type: 'Text' }
                    ]
                }
            }
        ];

        const result = validateBuilderDocumentStructure(document);

        expect(result.valid).to.equal(false);
        expect(result.errors).to.deep.include.members([
            {
                path: '$.tree.children[0].slots.actions[0].id',
                message: "Duplicate Builder node id 'cta' already exists at $.tree.children[0].children[0].id.",
                nodeId: 'cta',
                type: 'duplicateNodeId'
            },
            {
                path: '$.tree.children[0].data.emptyState[0].id',
                message: "Duplicate Builder node id 'content' already exists at $.tree.children[0].id.",
                nodeId: 'content',
                type: 'duplicateNodeId'
            }
        ]);
    });

    it('accepts data bindings that point to existing dataSources and use safe paths', () => {
        const document = createBuilderDocument({ id: 'dashboard' });
        document.dataSources = {
            sales: {
                type: 'mock',
                config: {
                    rows: []
                }
            }
        };
        document.tree.children = [
            {
                id: 'table',
                type: 'DataTable',
                data: {
                    sourceId: 'sales',
                    path: '$.rows[0]',
                    fields: {
                        title: {
                            path: 'customer.name',
                            fallback: 'Unknown'
                        }
                    },
                    repeat: {
                        sourceId: 'sales',
                        itemName: 'row',
                        keyPath: 'id',
                        limit: 10
                    }
                }
            }
        ];

        expect(validateBuilderDocumentStructure(document)).to.deep.equal({
            valid: true,
            errors: []
        });
    });

    it('rejects data bindings that reference missing dataSources', () => {
        const document = createBuilderDocument({ id: 'dashboard' });
        document.tree.children = [
            {
                id: 'table',
                type: 'DataTable',
                data: {
                    sourceId: 'missingData',
                    repeat: {
                        sourceId: 'missingRepeatData'
                    }
                }
            }
        ];

        const result = validateBuilderDocumentStructure(document);

        expect(result.valid).to.equal(false);
        expect(result.errors).to.deep.include.members([
            {
                path: '$.tree.children[0].data.sourceId',
                message: "Builder data binding references unknown dataSource 'missingData'.",
                nodeId: 'table',
                type: 'unknownDataSource'
            },
            {
                path: '$.tree.children[0].data.repeat.sourceId',
                message: "Builder data binding references unknown dataSource 'missingRepeatData'.",
                nodeId: 'table',
                type: 'unknownDataSource'
            }
        ]);
    });

    it('rejects unsafe data binding paths and malformed repeat bindings', () => {
        const document = createBuilderDocument({ id: 'dashboard' });
        document.dataSources = {
            sales: {
                type: 'mock'
            }
        };
        document.tree.children = [
            {
                id: 'table',
                type: 'DataTable',
                data: {
                    sourceId: 'sales',
                    path: 'items.map(x => x.total)',
                    fields: {
                        total: {
                            path: 'totals["monthly"]'
                        }
                    },
                    repeat: {
                        sourceId: 'sales',
                        itemName: 'row-item',
                        keyPath: 'id; alert(1)',
                        limit: -1
                    }
                }
            }
        ];

        const result = validateBuilderDocumentStructure(document);

        expect(result.valid).to.equal(false);
        expect(result.errors).to.deep.include.members([
            {
                path: '$.tree.children[0].data.path',
                message: "Builder data binding path 'items.map(x => x.total)' must use safe dot or numeric bracket notation.",
                nodeId: 'table',
                type: 'invalidDataBinding'
            },
            {
                path: '$.tree.children[0].data.fields.total.path',
                message: 'Builder data binding path \'totals["monthly"]\' must use safe dot or numeric bracket notation.',
                nodeId: 'table',
                type: 'invalidDataBinding'
            },
            {
                path: '$.tree.children[0].data.repeat.itemName',
                message: 'Builder repeat itemName must be a safe identifier.',
                nodeId: 'table',
                type: 'invalidDataBinding'
            },
            {
                path: '$.tree.children[0].data.repeat.keyPath',
                message: "Builder data binding path 'id; alert(1)' must use safe dot or numeric bracket notation.",
                nodeId: 'table',
                type: 'invalidDataBinding'
            },
            {
                path: '$.tree.children[0].data.repeat.limit',
                message: 'Builder repeat limit must be a non-negative integer when present.',
                nodeId: 'table',
                type: 'invalidDataBinding'
            }
        ]);
    });

    it('rejects malformed data field and repeat binding structures', () => {
        const document = createBuilderDocument({ id: 'dashboard' });
        document.tree.children = [
            {
                id: 'table',
                type: 'DataTable',
                data: {
                    fields: {
                        total: 'total'
                    },
                    repeat: 'items'
                } as never
            }
        ];

        const result = validateBuilderDocumentStructure(document);

        expect(result.valid).to.equal(false);
        expect(result.errors).to.deep.include.members([
            {
                path: '$.tree.children[0].data.fields.total',
                message: 'Builder data field binding must be an object.',
                nodeId: 'table',
                type: 'invalidDataBinding'
            },
            {
                path: '$.tree.children[0].data.repeat',
                message: 'Builder repeat binding must be an object.',
                nodeId: 'table',
                type: 'invalidDataBinding'
            }
        ]);
    });

    it('accepts event bindings that point to existing actions', () => {
        const document = createBuilderDocument({ id: 'landing' });
        document.actions = {
            openContact: {
                type: 'openModal',
                params: {
                    modalId: 'contact'
                }
            }
        };
        document.tree.children = [
            {
                id: 'cta',
                type: 'Button',
                events: {
                    onClick: {
                        actionId: 'openContact',
                        params: {
                            source: 'hero'
                        },
                        preventDefault: true
                    }
                }
            }
        ];

        expect(validateBuilderDocumentStructure(document)).to.deep.equal({
            valid: true,
            errors: []
        });
    });

    it('rejects event bindings that reference missing actions', () => {
        const document = createBuilderDocument({ id: 'landing' });
        document.tree.children = [
            {
                id: 'cta',
                type: 'Button',
                events: {
                    onClick: {
                        actionId: 'missingAction'
                    }
                }
            }
        ];

        const result = validateBuilderDocumentStructure(document);

        expect(result.valid).to.equal(false);
        expect(result.errors).to.deep.include({
            path: '$.tree.children[0].events.onClick.actionId',
            message: "Builder event 'onClick' references unknown action 'missingAction'.",
            nodeId: 'cta',
            type: 'unknownEventAction'
        });
    });

    it('rejects JavaScript handler strings in event bindings', () => {
        const document = createBuilderDocument({ id: 'landing' });
        document.actions = {
            openContact: {
                type: 'openModal'
            }
        };
        document.tree.children = [
            {
                id: 'unsafe-string',
                type: 'Button',
                events: {
                    onClick: 'alert("xss")' as never
                }
            },
            {
                id: 'unsafe-handler',
                type: 'Button',
                events: {
                    onClick: {
                        actionId: 'openContact',
                        handler: '() => alert("xss")'
                    } as never
                }
            }
        ];

        const result = validateBuilderDocumentStructure(document);

        expect(result.valid).to.equal(false);
        expect(result.errors).to.deep.include.members([
            {
                path: '$.tree.children[0].events.onClick',
                message: "Builder event 'onClick' must be an object action binding; JavaScript handler strings are not allowed.",
                nodeId: 'unsafe-string',
                type: 'invalidEventBinding'
            },
            {
                path: '$.tree.children[1].events.onClick.handler',
                message: "Builder event 'onClick' must not contain JavaScript handler strings; use actionId instead.",
                nodeId: 'unsafe-handler',
                type: 'invalidEventBinding'
            }
        ]);
    });

    it('validates permissions, visibility, and style safety rules', () => {
        const document = createBuilderDocument({ id: 'landing' });
        document.permissions = {
            premium: {
                effect: 'maybe',
                roles: ['admin', ''],
                expression: 'user.isAdmin()'
            } as never
        };
        document.tree.children = [
            {
                id: 'guarded',
                type: 'Section',
                visibility: {
                    stateId: 'is-visible',
                    condition: {
                        source: 'state',
                        path: 'items.map(x => x.visible)',
                        operator: 'matches'
                    },
                    handler: '() => true'
                } as never,
                permissions: [
                    {
                        permissions: ['marketing.read', '${danger}']
                    }
                ],
                style: {
                    className: 'hero-section bad/class',
                    css: {
                        color: 'red',
                        backgroundImage: 'url(javascript:alert(1))',
                        onClick: 'alert(1)',
                        nested: { color: 'red' }
                    },
                    responsive: {
                        'sm-and-up': {
                            className: 'safe'
                        }
                    }
                } as never
            }
        ];

        const result = validateBuilderDocumentStructure(document);

        expect(result.valid).to.equal(false);
        expect(result.errors).to.deep.include.members([
            {
                path: '$.permissions.premium.effect',
                message: "Builder permission effect must be 'allow' or 'deny'.",
                type: 'invalidPermission'
            },
            {
                path: '$.permissions.premium.roles[1]',
                message: "Builder field 'roles' must contain only non-empty strings.",
                type: 'invalidPermission'
            },
            {
                path: '$.permissions.premium.expression',
                message: "Builder field 'expression' is not allowed.",
                type: 'forbiddenField'
            },
            {
                path: '$.tree.children[0].visibility.handler',
                message: "Builder field 'handler' is not allowed.",
                nodeId: 'guarded',
                type: 'forbiddenField'
            },
            {
                path: '$.tree.children[0].visibility.handler',
                message: 'Builder value must not contain JavaScript or template expressions.',
                nodeId: 'guarded',
                type: 'unsafeExpression'
            },
            {
                path: '$.tree.children[0].visibility.stateId',
                message: 'Builder visibility stateId must be a safe identifier.',
                nodeId: 'guarded',
                type: 'invalidVisibility'
            },
            {
                path: '$.tree.children[0].visibility.condition.path',
                message: "Builder data binding path 'items.map(x => x.visible)' must use safe dot or numeric bracket notation.",
                nodeId: 'guarded',
                type: 'invalidDataBinding'
            },
            {
                path: '$.tree.children[0].visibility.condition.operator',
                message: 'Builder condition operator is not supported.',
                nodeId: 'guarded',
                type: 'invalidVisibility'
            },
            {
                path: '$.tree.children[0].permissions[0].permissions[1]',
                message: "Builder field 'permissions' contains an unsafe expression string.",
                nodeId: 'guarded',
                type: 'unsafeExpression'
            },
            {
                path: '$.tree.children[0].style.className',
                message: 'Builder style className must contain safe CSS class names only.',
                nodeId: 'guarded',
                type: 'invalidStyle'
            },
            {
                path: '$.tree.children[0].style.css.backgroundImage',
                message: "Builder style css value for 'backgroundImage' is unsafe.",
                nodeId: 'guarded',
                type: 'unsafeExpression'
            },
            {
                path: '$.tree.children[0].style.css.onClick',
                message: "Builder style css property 'onClick' is not allowed.",
                nodeId: 'guarded',
                type: 'invalidStyle'
            },
            {
                path: '$.tree.children[0].style.css.nested',
                message: 'Builder style css values must be strings or numbers.',
                nodeId: 'guarded',
                type: 'invalidStyle'
            },
            {
                path: '$.tree.children[0].style.responsive.sm-and-up',
                message: 'Builder responsive breakpoint must be a safe identifier.',
                nodeId: 'guarded',
                type: 'invalidStyle'
            }
        ]);
    });

    it('accepts safe permissions, visibility conditions, and styles', () => {
        const document = createBuilderDocument({ id: 'landing' });
        document.permissions = {
            premium: {
                effect: 'allow',
                roles: ['admin'],
                permissions: ['marketing.read'],
                condition: {
                    source: 'permission',
                    ref: 'marketing.read',
                    operator: 'exists'
                }
            }
        };
        document.tree.children = [
            {
                id: 'guarded',
                type: 'Section',
                visibility: {
                    stateId: 'isVisible',
                    condition: {
                        source: 'state',
                        path: 'user.flags[0]',
                        operator: 'equals',
                        value: true
                    }
                },
                permissions: [
                    {
                        effect: 'allow',
                        permissions: ['marketing.read']
                    }
                ],
                style: {
                    className: 'hero-section highlighted',
                    css: {
                        color: 'red',
                        marginTop: 16
                    },
                    responsive: {
                        sm: {
                            className: 'hero-section-sm',
                            css: {
                                padding: 12
                            }
                        }
                    }
                }
            }
        ];

        expect(validateBuilderDocumentStructure(document)).to.deep.equal({
            valid: true,
            errors: []
        });
    });

    it('applies the central security policy across the whole Builder document', () => {
        const document = createBuilderDocument({ id: 'security' });
        document.metadata.description = '<script>alert(1)</script>';
        document.aiHints = {
            intent: 'landing',
            dangerous: {
                eval: 'alert(1)'
            }
        } as never;
        document.actions = {
            go: {
                type: 'navigate',
                params: {
                    to: 'java\u0000script:alert(1)'
                }
            }
        };
        document.dataSources = {
            remote: {
                type: 'http',
                config: {
                    url: 'vbscript:msgbox(1)'
                }
            }
        };
        document.tree.children = [
            {
                id: 'unsafe-card',
                type: 'Card',
                props: {
                    onClick: 'alert(1)',
                    href: 'data:text/html,<script>alert(1)</script>',
                    backgroundImage: 'url("javascript:alert(1)")',
                    dangerouslySetInnerHTML: { __html: '<img src=x onerror=alert(1)>' }
                },
                meta: {
                    script: 'import("x")'
                }
            }
        ];

        const result = validateBuilderDocumentStructure(document);

        expect(result.valid).to.equal(false);
        expect(result.errors).to.deep.include.members([
            {
                path: '$.metadata.description',
                message: 'Builder value must not contain JavaScript, scripts, eval, Function constructors, imports, or template expressions.',
                type: 'unsafeExpression'
            },
            {
                path: '$.aiHints.dangerous.eval',
                message: "Builder field 'eval' is not allowed.",
                type: 'forbiddenField'
            },
            {
                path: '$.actions.go.params.to',
                message: "Builder URL scheme 'javascript' is not allowed.",
                type: 'dangerousUrl'
            },
            {
                path: '$.dataSources.remote.config.url',
                message: "Builder URL scheme 'vbscript' is not allowed.",
                type: 'dangerousUrl'
            },
            {
                path: '$.tree.children[0].props.onClick',
                message: "Builder field 'onClick' is not allowed.",
                nodeId: 'unsafe-card',
                type: 'forbiddenField'
            },
            {
                path: '$.tree.children[0].props.href',
                message: 'Builder URL uses a forbidden data URL scheme.',
                nodeId: 'unsafe-card',
                type: 'dangerousUrl'
            },
            {
                path: '$.tree.children[0].props.backgroundImage',
                message: 'Builder URL value uses a forbidden scheme or executable payload.',
                nodeId: 'unsafe-card',
                type: 'dangerousUrl'
            },
            {
                path: '$.tree.children[0].props.dangerouslySetInnerHTML',
                message: "Builder field 'dangerouslySetInnerHTML' is not allowed.",
                nodeId: 'unsafe-card',
                type: 'forbiddenField'
            },
            {
                path: '$.tree.children[0].meta.script',
                message: "Builder field 'script' is not allowed.",
                nodeId: 'unsafe-card',
                type: 'forbiddenField'
            }
        ]);
    });

    it('reports invalid URL values separately from forbidden URL schemes', () => {
        const document = createBuilderDocument({ id: 'urls' });
        document.tree.children = [
            {
                id: 'bad-image',
                type: 'Image',
                props: {
                    src: 'https://',
                    assetUrl: 'data:image/svg+xml,<svg></svg>'
                }
            },
            {
                id: 'bad-link',
                type: 'Anchor',
                props: {
                    href: 'docs page'
                }
            }
        ];

        const result = validateBuilderDocumentStructure(document);

        expect(result.valid).to.equal(false);
        expect(result.errors).to.deep.include.members([
            {
                path: '$.tree.children[0].props.src',
                message: 'Builder URL is invalid: absolute URLs must be parseable.',
                nodeId: 'bad-image',
                type: 'invalidUrl'
            },
            {
                path: '$.tree.children[0].props.assetUrl',
                message: 'Builder asset URL uses a forbidden data URL. Only base64 data URLs for png, jpeg, gif, webp, or avif images are allowed.',
                nodeId: 'bad-image',
                type: 'dangerousUrl'
            },
            {
                path: '$.tree.children[1].props.href',
                message: 'Builder URL is invalid: URLs must not contain whitespace or control characters.',
                nodeId: 'bad-link',
                type: 'invalidUrl'
            }
        ]);
    });

    it('reports non-object documents and circular node references', () => {
        expect(validateBuilderDocumentStructure(undefined)).to.deep.equal({
            valid: false,
            errors: [
                {
                    path: '$',
                    message: 'Builder document must be an object.'
                }
            ]
        });

        const document = createBuilderDocument({ id: 'landing' });
        const section: BuilderNode = { id: 'section', type: 'Section', children: [] };
        section.children!.push(section);
        document.tree.children = [section];

        expect(validateBuilderDocumentStructure(document).errors).to.deep.include({
            path: '$.tree.children[0].children[0]',
            message: 'Builder node tree must not contain circular references.',
            nodeId: 'section'
        });
    });

    it('enforces document, tree depth, node count, and props size limits', () => {
        const document = createBuilderDocument({ id: 'limits' });
        document.tree.props = { title: 'x'.repeat(20) };
        document.tree.children = [{
            id: 'section',
            type: 'Section',
            children: [{
                id: 'nested',
                type: 'Text'
            }]
        }];

        const result = validateBuilderDocumentStructure(document, {
            maxDocumentSizeBytes: 80,
            maxTreeDepth: 2,
            maxNodeCount: 2,
            maxNodePropsSizeBytes: 12
        });

        expect(result.valid).to.equal(false);
        expect(result.errors).to.deep.include.members([
            {
                path: '$',
                message: 'Builder document exceeds the maximum size of 80 bytes.',
                type: 'sizeLimit'
            },
            {
                path: '$.tree.props',
                message: 'Builder node props exceed the maximum size of 12 bytes.',
                nodeId: 'limits-root',
                type: 'sizeLimit'
            },
            {
                path: '$.tree.children[0].children[0]',
                message: 'Builder tree exceeds the maximum of 2 nodes.',
                nodeId: 'nested',
                type: 'sizeLimit'
            },
            {
                path: '$.tree.children[0].children[0]',
                message: 'Builder tree exceeds the maximum depth of 2.',
                nodeId: 'nested',
                type: 'sizeLimit'
            }
        ]);
    });
});

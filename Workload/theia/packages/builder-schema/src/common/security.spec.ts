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
    deserializeBuilderDocumentJson,
    validateBuilderDocumentStructure,
    type BuilderNode
} from './index';

describe('Builder schema security validation', () => {

    it('rejects JavaScript handler strings and event bindings that target missing actions', () => {
        const document = createBuilderDocument({ id: 'security-events' });
        document.tree.children = [
            {
                id: 'handler-string',
                type: 'Button',
                events: {
                    onClick: 'alert(document.cookie)' as never
                }
            },
            {
                id: 'missing-action',
                type: 'Button',
                events: {
                    onClick: {
                        actionId: 'deleteEverything'
                    }
                }
            }
        ];

        const result = validateBuilderDocumentStructure(document);

        expect(result.valid).to.equal(false);
        expect(result.errors).to.deep.include.members([
            {
                path: '$.tree.children[0].events.onClick',
                message: "Builder event 'onClick' must be an object action binding; JavaScript handler strings are not allowed.",
                nodeId: 'handler-string',
                type: 'invalidEventBinding'
            },
            {
                path: '$.tree.children[1].events.onClick.actionId',
                message: "Builder event 'onClick' references unknown action 'deleteEverything'.",
                nodeId: 'missing-action',
                type: 'unknownEventAction'
            }
        ]);
    });

    it('rejects dangerous URLs in links, assets, action params, and data sources', () => {
        const document = createBuilderDocument({ id: 'security-urls' });
        document.actions = {
            go: {
                type: 'navigate',
                params: {
                    to: 'java&#x73;cript:alert(1)'
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
                id: 'bad-anchor',
                type: 'Anchor',
                props: {
                    href: 'javascript:alert(1)'
                }
            },
            {
                id: 'bad-image',
                type: 'Image',
                props: {
                    src: 'data:text/html,<script>alert(1)</script>'
                }
            }
        ];

        const result = validateBuilderDocumentStructure(document);

        expect(result.valid).to.equal(false);
        expect(result.errors).to.deep.include.members([
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
                path: '$.tree.children[0].props.href',
                message: "Builder URL scheme 'javascript' is not allowed.",
                nodeId: 'bad-anchor',
                type: 'dangerousUrl'
            },
            {
                path: '$.tree.children[1].props.src',
                message: 'Builder asset URL uses a forbidden data URL. Only base64 data URLs for png, jpeg, gif, webp, or avif images are allowed.',
                nodeId: 'bad-image',
                type: 'dangerousUrl'
            }
        ]);
    });

    it('rejects oversized JSON before parsing into a Builder document', () => {
        const hugeJson = JSON.stringify({
            ...createBuilderDocument({ id: 'huge-json' }),
            metadata: {
                id: 'huge-json',
                name: 'Huge JSON',
                description: 'x'.repeat(256)
            }
        });

        expect(() => deserializeBuilderDocumentJson(hugeJson, {
            sourceName: 'huge.builder.json',
            maxDocumentSizeBytes: 128
        })).to.throw(BuilderJsonParseError, 'Invalid Builder JSON in huge.builder.json: document exceeds the maximum size of 128 bytes.');
    });

    it('reports excessive tree depth and huge props as size-limit security failures', () => {
        const document = createBuilderDocument({ id: 'limits' });
        document.tree.props = { title: 'x'.repeat(128) };
        let current = document.tree;
        for (let index = 0; index < 6; index++) {
            const child: BuilderNode = {
                id: `nested-${index}`,
                type: 'Section',
                children: []
            };
            current.children = [child];
            current = child;
        }

        const result = validateBuilderDocumentStructure(document, {
            maxTreeDepth: 4,
            maxNodePropsSizeBytes: 64
        });

        expect(result.valid).to.equal(false);
        expect(result.errors).to.deep.include.members([
            {
                path: '$.tree.props',
                message: 'Builder node props exceed the maximum size of 64 bytes.',
                nodeId: 'limits-root',
                type: 'sizeLimit'
            },
            {
                path: '$.tree.children[0].children[0].children[0].children[0]',
                message: 'Builder tree exceeds the maximum depth of 4.',
                nodeId: 'nested-3',
                type: 'sizeLimit'
            }
        ]);
    });
});

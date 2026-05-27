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
    duplicateNode,
    findNodeById,
    insertNode,
    moveNode,
    removeNode,
    serializeBuilderDocumentJson,
    updateNodeMeta,
    updateNodeProps
} from './index';

describe('Builder tree manipulation invariants', () => {

    it('manipulates children and slots without mutating the original document', () => {
        const document = createBuilderDocument({ id: 'landing', title: 'Landing' });
        document.tree.children = [
            {
                id: 'card',
                type: 'Card',
                children: [
                    { id: 'body', type: 'Text', props: { children: 'Body' } }
                ],
                slots: {
                    header: [
                        { id: 'title', type: 'Title', props: { children: 'Original' } }
                    ]
                }
            }
        ];

        const withBadge = insertNode(document, {
            parentId: 'card',
            slotName: 'header',
            index: 1,
            node: { id: 'badge', type: 'Badge', props: { children: 'New' } }
        });
        const withUpdatedBody = updateNodeProps(withBadge, {
            nodeId: 'body',
            props: { children: 'Updated body' }
        });
        const withMovedBadge = moveNode(withUpdatedBody, {
            nodeId: 'badge',
            parentId: 'card',
            index: 0
        });

        expect(withMovedBadge.tree.children![0].children!.map(node => node.id)).to.deep.equal(['badge', 'body']);
        expect(withMovedBadge.tree.children![0].slots!.header.map(node => node.id)).to.deep.equal(['title']);
        expect(withMovedBadge.tree.children![0].children![1].props).to.deep.equal({ children: 'Updated body' });

        expect(document.tree.children[0].children!.map(node => node.id)).to.deep.equal(['body']);
        expect(document.tree.children[0].slots!.header.map(node => node.id)).to.deep.equal(['title']);
        expect(document.tree.children[0].children![0].props).to.deep.equal({ children: 'Body' });
    });

    it('preserves unique ids when duplicating subtrees across children, slots, and empty states', () => {
        const document = createBuilderDocument({ id: 'landing' });
        document.tree.children = [
            {
                id: 'section',
                type: 'Section',
                children: [
                    { id: 'copy', type: 'Text' }
                ],
                slots: {
                    aside: [
                        { id: 'aside-copy', type: 'Badge' }
                    ]
                },
                data: {
                    emptyState: [
                        { id: 'empty-copy', type: 'Alert' }
                    ]
                }
            }
        ];

        const nextDocument = duplicateNode(document, { nodeId: 'section' });
        const duplicated = nextDocument.tree.children![1];

        expect(nextDocument.tree.children!.map(node => node.id)).to.deep.equal(['section', 'section-copy']);
        expect(duplicated.children![0].id).to.equal('copy-copy');
        expect(duplicated.slots!.aside[0].id).to.equal('aside-copy-copy');
        expect(duplicated.data!.emptyState![0].id).to.equal('empty-copy-copy');

        const ids = new Set<string>();
        const visitNode = (node: BuilderNode): void => {
            expect(ids.has(node.id), `duplicate node id ${node.id}`).to.equal(false);
            ids.add(node.id);

            node.children?.forEach(visitNode);
            Object.values(node.slots ?? {}).forEach(slotNodes => slotNodes.forEach(visitNode));
            node.data?.emptyState?.forEach(visitNode);
        };
        visitNode(deserializeBuilderDocumentJson(serializeBuilderDocumentJson(nextDocument)).tree);
    });

    it('updates node meta without mutating the original document', () => {
        const document = createBuilderDocument({ id: 'rename-layer' });
        document.tree.children = [{ id: 'hero', type: 'HeroSection', meta: { notes: 'Keep' } }];

        const renamed = updateNodeMeta(document, {
            nodeId: 'hero',
            meta: { label: 'Main hero' }
        });
        const cleared = updateNodeMeta(renamed, {
            nodeId: 'hero',
            meta: { label: undefined }
        });

        expect(document.tree.children[0].meta).to.deep.equal({ notes: 'Keep' });
        expect(renamed.tree.children![0].meta).to.deep.equal({ notes: 'Keep', label: 'Main hero' });
        expect(cleared.tree.children![0].meta).to.deep.equal({ notes: 'Keep' });
    });

    it('moves nodes up and down inside the same children container by final sibling index', () => {
        const document = createBuilderDocument({ id: 'reorder' });
        document.tree.children = [
            { id: 'first', type: 'Text' },
            { id: 'second', type: 'Text' },
            { id: 'third', type: 'Text' }
        ];

        const movedDown = moveNode(document, {
            nodeId: 'second',
            parentId: 'reorder-root',
            index: 3
        });
        expect(movedDown.tree.children!.map(node => node.id)).to.deep.equal(['first', 'third', 'second']);

        const movedUp = moveNode(movedDown, {
            nodeId: 'second',
            parentId: 'reorder-root',
            index: 1
        });
        expect(movedUp.tree.children!.map(node => node.id)).to.deep.equal(['first', 'second', 'third']);
    });

    it('protects the root Page node from destructive tree operations', () => {
        const document = createBuilderDocument({ id: 'landing' });

        expect(() => removeNode(document, { nodeId: 'landing-root' }))
            .to.throw("Cannot remove Builder root node 'landing-root'.");
        expect(() => moveNode(document, { nodeId: 'landing-root', parentId: 'landing-root' }))
            .to.throw("Cannot move Builder root node 'landing-root'.");
        expect(() => duplicateNode(document, { nodeId: 'landing-root' }))
            .to.throw("Cannot duplicate Builder root node 'landing-root'.");
    });

    it('rejects object reference cycles during traversal, mutation, and serialization', () => {
        const document = createBuilderDocument({ id: 'landing' });
        const section: BuilderNode = { id: 'section', type: 'Section', children: [] };
        section.children!.push(section);
        document.tree.children = [section];

        expect(() => findNodeById(document.tree, 'missing'))
            .to.throw("Cannot traverse Builder tree because node 'section' creates a cycle.");
        expect(() => insertNode(document, {
            parentId: 'landing-root',
            node: { id: 'card', type: 'Card' }
        })).to.throw("Cannot collect Builder node ids because node 'section' creates a cycle.");
        expect(() => updateNodeProps(document, {
            nodeId: 'section',
            props: { gap: 'md' }
        })).to.throw("Cannot clone Builder tree because node 'section' creates a cycle.");
        expect(() => serializeBuilderDocumentJson(document))
            .to.throw(BuilderJsonParseError, 'Invalid Builder JSON value at $.tree.children[0].children[0]: circular references are not allowed.');
    });

    it('round-trips children, slots, unknown safe fields, and empty states through JSON serialization', () => {
        const document = createBuilderDocument({ id: 'landing', title: 'Landing' });
        document.tree.children = [
            {
                id: 'table',
                type: 'DataTable',
                props: { striped: true },
                slots: {
                    toolbar: [
                        { id: 'refresh', type: 'Button', props: { children: 'Refresh' } }
                    ]
                },
                data: {
                    sourceId: 'orders',
                    emptyState: [
                        { id: 'empty', type: 'Alert', props: { children: 'No rows' } }
                    ]
                },
                'x-editor': {
                    collapsed: false
                }
            }
        ];

        const json = serializeBuilderDocumentJson(document);
        const parsed = deserializeBuilderDocumentJson(json, { migrate: false });

        expect(parsed).to.deep.equal(JSON.parse(json));
        expect(parsed).to.not.equal(document);
        expect(parsed.tree).to.not.equal(document.tree);
        expect(parsed.tree.children![0].slots!.toolbar[0].props).to.deep.equal({ children: 'Refresh' });
        expect(parsed.tree.children![0].data!.emptyState![0].props).to.deep.equal({ children: 'No rows' });
        expect(parsed.tree.children![0]['x-editor']).to.deep.equal({ collapsed: false });
    });
});

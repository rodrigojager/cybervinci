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
    Builder_SCHEMA_VERSION,
    BuilderJsonParseError,
    BuilderSchemaMigration,
    BuilderSchemaMigrationError,
    createBuilderDocument,
    deserializeBuilderDocumentJson,
    duplicateNode,
    findNodeById,
    generateNodeId,
    insertNode,
    migrateBuilderDocument,
    moveNode,
    removeNode,
    serializeBuilderDocumentJson,
    updateNodeProps
} from './index';

describe('createBuilderDocument', () => {

    it('creates a minimal valid Builder document with a Page root', () => {
        const document = createBuilderDocument({
            id: 'home',
            title: 'Home',
            route: '/home',
            createdBy: 'test-user',
            createdAt: '2026-05-19T00:00:00.000Z'
        });

        expect(document.schemaVersion).to.equal(Builder_SCHEMA_VERSION);
        expect(document.metadata).to.include({
            id: 'home',
            name: 'Home',
            createdBy: 'test-user',
            createdAt: '2026-05-19T00:00:00.000Z',
            updatedAt: '2026-05-19T00:00:00.000Z'
        });
        expect(document.page).to.deep.equal({
            id: 'home',
            title: 'Home',
            route: '/home',
            layout: 'default'
        });
        expect(document.theme).to.deep.equal({
            mode: 'light',
            primaryColor: 'blue',
            radius: 'md',
            fontFamily: 'Inter, system-ui, sans-serif',
            spacing: {
                xs: 4,
                sm: 8,
                md: 16,
                lg: 24,
                xl: 32
            },
            tokens: {}
        });
        expect(document.actions).to.deep.equal({});
        expect(document.dataSources).to.deep.equal({});
        expect(document.states).to.deep.equal({});
        expect(document.permissions).to.deep.equal({});
        expect(document.tree).to.deep.equal({
            id: 'home-root',
            type: 'Page',
            props: {
                title: 'Home'
            },
            children: []
        });
    });

    it('does not share mutable default theme objects between documents', () => {
        const first = createBuilderDocument();
        const second = createBuilderDocument();

        first.theme!.spacing!.md = 20;
        first.theme!.tokens!.surface = '#ffffff';

        expect(second.theme!.spacing!.md).to.equal(16);
        expect(second.theme!.tokens).to.deep.equal({});
    });
});

describe('generateNodeId', () => {

    it('generates readable deterministic ids from component types', () => {
        expect(generateNodeId('HeroSection')).to.equal('hero-section');
        expect(generateNodeId('Text Input')).to.equal('text-input');
        expect(generateNodeId('BuilderWidget')).to.equal('builder-widget');
    });

    it('uses a preferred readable id when provided', () => {
        expect(generateNodeId('Title', undefined, 'Primary Hero Title')).to.equal('primary-hero-title');
    });

    it('appends the first available numeric suffix when the id already exists', () => {
        const document = createBuilderDocument({ id: 'landing' });
        document.tree.children = [
            { id: 'section', type: 'Section' },
            { id: 'section-2', type: 'Section' },
            { id: 'section-4', type: 'Section' }
        ];

        expect(generateNodeId('Section', document.tree)).to.equal('section-3');
    });

    it('checks ids in children, slots, and empty state nodes', () => {
        const tree = {
            id: 'page',
            type: 'Page',
            children: [
                {
                    id: 'card',
                    type: 'Card',
                    slots: {
                        header: [
                            { id: 'badge', type: 'Badge' }
                        ]
                    },
                    data: {
                        emptyState: [
                            { id: 'alert', type: 'Alert' }
                        ]
                    }
                }
            ]
        };

        expect(generateNodeId('Badge', tree)).to.equal('badge-2');
        expect(generateNodeId('Alert', tree)).to.equal('alert-2');
    });

    it('falls back to node for blank or symbol-only values', () => {
        expect(generateNodeId('   ')).to.equal('node');
        expect(generateNodeId('!!!', [{ id: 'node', type: 'Box' }])).to.equal('node-2');
    });
});

describe('Builder JSON serialization', () => {

    it('serializes and deserializes a Builder document without dropping safe unknown fields', () => {
        const document = createBuilderDocument({
            id: 'landing',
            title: 'Landing',
            createdAt: '2026-05-19T00:00:00.000Z'
        });

        document['x-editor'] = {
            lastPanel: 'props',
            zoom: 0.75
        };
        document.tree['x-builder'] = {
            selectedVariant: 'compact'
        };
        document.tree.children = [
            {
                id: 'hero',
                type: 'HeroSection',
                props: {
                    title: 'Build faster'
                },
                meta: {
                    label: 'Hero',
                    'x-ai-note': 'generated from prompt'
                }
            }
        ];

        const json = serializeBuilderDocumentJson(document);
        const parsed = deserializeBuilderDocumentJson(json, { sourceName: 'landing.builder.json' });

        expect(parsed['x-editor']).to.deep.equal({
            lastPanel: 'props',
            zoom: 0.75
        });
        expect(parsed.tree['x-builder']).to.deep.equal({
            selectedVariant: 'compact'
        });
        expect(parsed.tree.children![0].meta!['x-ai-note']).to.equal('generated from prompt');
    });

    it('throws a clear typed error for invalid JSON', () => {
        expect(() => deserializeBuilderDocumentJson('{ "schemaVersion": ', { sourceName: 'broken.builder.json' }))
            .to.throw(BuilderJsonParseError, 'Invalid Builder JSON in broken.builder.json.');
    });

    it('rejects oversized JSON before parsing', () => {
        expect(() => deserializeBuilderDocumentJson('{"schemaVersion":"0.1.0"}', {
            sourceName: 'large.builder.json',
            maxDocumentSizeBytes: 8
        })).to.throw(BuilderJsonParseError, 'Invalid Builder JSON in large.builder.json: document exceeds the maximum size of 8 bytes.');
    });

    it('rejects unsafe unknown fields during deserialization and serialization', () => {
        expect(() => deserializeBuilderDocumentJson('{ "__proto__": { "polluted": true } }'))
            .to.throw(BuilderJsonParseError, "Invalid Builder JSON field at $.__proto__: '__proto__' is not allowed.");

        const document = createBuilderDocument();
        Object.defineProperty(document.tree, 'constructor', {
            value: { dangerous: true },
            enumerable: true
        });

        expect(() => serializeBuilderDocumentJson(document))
            .to.throw(BuilderJsonParseError, "Invalid Builder JSON field at $.tree.constructor: 'constructor' is not allowed.");
    });
});

describe('Builder schema migrations', () => {

    const migrations: BuilderSchemaMigration[] = [
        {
            from: '0.0.1',
            to: '0.0.2',
            migrate: document => ({
                ...document,
                schemaVersion: '0.0.2',
                metadata: {
                    ...document.metadata,
                    name: document.metadata.name || document.page.title
                }
            })
        },
        {
            from: '0.0.2',
            to: Builder_SCHEMA_VERSION,
            migrate: document => ({
                ...document,
                schemaVersion: Builder_SCHEMA_VERSION,
                theme: document.theme ?? {
                    primaryColor: 'blue'
                }
            })
        }
    ];

    it('migrates documents through ordered schemaVersion steps', () => {
        const oldDocument = createBuilderDocument({
            id: 'landing',
            title: 'Landing'
        });
        oldDocument.schemaVersion = '0.0.1';
        oldDocument.metadata.name = '';
        oldDocument['x-editor'] = {
            selectedNodeId: 'hero'
        };
        oldDocument.tree.children = [
            {
                id: 'hero',
                type: 'HeroSection',
                props: {
                    title: 'Old landing'
                }
            }
        ];
        delete oldDocument.theme;

        const migrated = migrateBuilderDocument(oldDocument, { migrations });

        expect(migrated.schemaVersion).to.equal(Builder_SCHEMA_VERSION);
        expect(migrated.metadata.name).to.equal('Landing');
        expect(migrated.theme).to.deep.equal({ primaryColor: 'blue' });
        expect(migrated['x-editor']).to.deep.equal({ selectedNodeId: 'hero' });
        expect(migrated.tree.children![0].props).to.deep.equal({ title: 'Old landing' });
        expect(oldDocument.schemaVersion).to.equal('0.0.1');
        expect(oldDocument.metadata.name).to.equal('');
        expect(oldDocument.theme).to.equal(undefined);
    });

    it('migrates during deserialization by default', () => {
        const oldDocument = createBuilderDocument({
            id: 'landing',
            title: 'Landing'
        });
        oldDocument.schemaVersion = '0.0.1';
        oldDocument.metadata.name = '';

        const parsed = deserializeBuilderDocumentJson(JSON.stringify(oldDocument), {
            migrations
        });

        expect(parsed.schemaVersion).to.equal(Builder_SCHEMA_VERSION);
        expect(parsed.metadata.name).to.equal('Landing');
    });

    it('can deserialize without applying migrations', () => {
        const oldDocument = createBuilderDocument({
            id: 'landing'
        });
        oldDocument.schemaVersion = '0.0.1';

        const parsed = deserializeBuilderDocumentJson(JSON.stringify(oldDocument), {
            migrate: false,
            migrations
        });

        expect(parsed.schemaVersion).to.equal('0.0.1');
    });

    it('throws a typed error when no migration path exists', () => {
        const oldDocument = createBuilderDocument({
            id: 'landing'
        });
        oldDocument.schemaVersion = '0.0.0';

        expect(() => migrateBuilderDocument(oldDocument, { migrations }))
            .to.throw(BuilderSchemaMigrationError, "Cannot migrate Builder document from schemaVersion '0.0.0' to '0.1.0'.");
    });

    it('rejects migrations that return an unexpected schemaVersion', () => {
        const oldDocument = createBuilderDocument({
            id: 'landing'
        });
        oldDocument.schemaVersion = '0.0.1';

        expect(() => migrateBuilderDocument(oldDocument, {
            migrations: [
                {
                    from: '0.0.1',
                    to: Builder_SCHEMA_VERSION,
                    migrate: document => ({
                        ...document,
                        schemaVersion: 'wrong'
                    })
                }
            ]
        })).to.throw(BuilderSchemaMigrationError, "Builder migration '0.0.1' to '0.1.0' returned schemaVersion 'wrong'.");
    });
});

describe('findNodeById', () => {

    it('returns the root node location', () => {
        const document = createBuilderDocument({ id: 'landing' });

        const location = findNodeById(document.tree, 'landing-root');

        expect(location).to.deep.equal({
            node: document.tree,
            path: [{ kind: 'root' }]
        });
    });

    it('finds nested nodes in children with parent, index, container, and path', () => {
        const document = createBuilderDocument({ id: 'landing' });
        const title = { id: 'title', type: 'Title' };
        const text = { id: 'text', type: 'Text' };
        const section = {
            id: 'section',
            type: 'Section',
            children: [title, text]
        };
        document.tree.children = [section];

        const location = findNodeById(document.tree, 'text');

        expect(location?.node).to.equal(text);
        expect(location?.parent).to.equal(section);
        expect(location?.index).to.equal(1);
        expect(location?.container).to.equal(section.children);
        expect(location?.slotName).to.equal(undefined);
        expect(location?.path).to.deep.equal([
            { kind: 'root' },
            { kind: 'children', parentId: 'landing-root', index: 0 },
            { kind: 'children', parentId: 'section', index: 1 }
        ]);
    });

    it('finds nested nodes in slots with slot name and editable container', () => {
        const headerBadge = { id: 'header-badge', type: 'Badge' };
        const card = {
            id: 'card',
            type: 'Card',
            slots: {
                header: [headerBadge],
                footer: [
                    { id: 'footer-text', type: 'Text' }
                ]
            }
        };
        const tree = {
            id: 'page',
            type: 'Page',
            children: [card]
        };

        const location = findNodeById(tree, 'header-badge');

        expect(location?.node).to.equal(headerBadge);
        expect(location?.parent).to.equal(card);
        expect(location?.index).to.equal(0);
        expect(location?.container).to.equal(card.slots.header);
        expect(location?.slotName).to.equal('header');
        expect(location?.path).to.deep.equal([
            { kind: 'root' },
            { kind: 'children', parentId: 'page', index: 0 },
            { kind: 'slot', parentId: 'card', slotName: 'header', index: 0 }
        ]);

        location!.container![location!.index!] = { id: 'replacement', type: 'Text' };

        expect(card.slots.header[0]).to.deep.equal({ id: 'replacement', type: 'Text' });
    });

    it('returns undefined when the node does not exist', () => {
        const document = createBuilderDocument();

        expect(findNodeById(document.tree, 'missing')).to.equal(undefined);
    });

    it('finds nested nodes in data empty state containers', () => {
        const emptyText = { id: 'empty-text', type: 'Text' };
        const dataTable = {
            id: 'table',
            type: 'DataTable',
            data: {
                emptyState: [emptyText]
            }
        };
        const tree = {
            id: 'page',
            type: 'Page',
            children: [dataTable]
        };

        const location = findNodeById(tree, 'empty-text');

        expect(location?.node).to.equal(emptyText);
        expect(location?.parent).to.equal(dataTable);
        expect(location?.index).to.equal(0);
        expect(location?.container).to.equal(dataTable.data.emptyState);
        expect(location?.path).to.deep.equal([
            { kind: 'root' },
            { kind: 'children', parentId: 'page', index: 0 },
            { kind: 'emptyState', parentId: 'table', index: 0 }
        ]);
    });
});

describe('insertNode', () => {

    it('inserts a node into children at the requested position', () => {
        const document = createBuilderDocument({ id: 'landing' });
        document.tree.children = [
            { id: 'hero', type: 'HeroSection' },
            { id: 'cta', type: 'CTASection' }
        ];

        const nextDocument = insertNode(document, {
            parentId: 'landing-root',
            index: 1,
            node: { id: 'features', type: 'FeatureGrid' }
        });

        expect(nextDocument.tree.children?.map(node => node.id)).to.deep.equal(['hero', 'features', 'cta']);
        expect(document.tree.children.map(node => node.id)).to.deep.equal(['hero', 'cta']);
        expect(nextDocument).to.not.equal(document);
        expect(nextDocument.tree).to.not.equal(document.tree);
    });

    it('appends to children when index is omitted and creates missing children container', () => {
        const document = createBuilderDocument({ id: 'landing' });
        delete document.tree.children;

        const nextDocument = insertNode(document, {
            parentId: 'landing-root',
            node: { id: 'section', type: 'Section' }
        });

        expect(nextDocument.tree.children).to.deep.equal([{ id: 'section', type: 'Section' }]);
        expect(document.tree.children).to.equal(undefined);
    });

    it('inserts a node into a named slot without mutating the original document', () => {
        const document = createBuilderDocument({ id: 'landing' });
        document.tree.children = [
            {
                id: 'card',
                type: 'Card',
                slots: {
                    header: [
                        { id: 'title', type: 'Title' }
                    ]
                }
            }
        ];

        const nextDocument = insertNode(document, {
            parentId: 'card',
            slotName: 'header',
            index: 0,
            node: { id: 'badge', type: 'Badge' }
        });
        const nextCard = nextDocument.tree.children![0];

        expect(nextCard.slots?.header.map(node => node.id)).to.deep.equal(['badge', 'title']);
        expect(document.tree.children[0].slots?.header.map(node => node.id)).to.deep.equal(['title']);
        expect(nextCard).to.not.equal(document.tree.children[0]);
        expect(nextCard.slots?.header).to.not.equal(document.tree.children[0].slots?.header);
    });

    it('creates a named slot when it does not exist yet', () => {
        const document = createBuilderDocument({ id: 'landing' });
        document.tree.children = [
            { id: 'drawer', type: 'Drawer' }
        ];

        const nextDocument = insertNode(document, {
            parentId: 'drawer',
            slotName: 'footer',
            node: { id: 'close-button', type: 'Button' }
        });

        expect(nextDocument.tree.children![0].slots?.footer).to.deep.equal([
            { id: 'close-button', type: 'Button' }
        ]);
        expect(document.tree.children[0].slots).to.equal(undefined);
    });

    it('rejects duplicate ids already present in the document', () => {
        const document = createBuilderDocument({ id: 'landing' });
        document.tree.children = [
            { id: 'section', type: 'Section' }
        ];

        expect(() => insertNode(document, {
            parentId: 'landing-root',
            node: { id: 'section', type: 'Card' }
        })).to.throw("Cannot insert Builder node with duplicate id 'section'.");
    });

    it('rejects duplicate ids inside the inserted subtree', () => {
        const document = createBuilderDocument({ id: 'landing' });

        expect(() => insertNode(document, {
            parentId: 'landing-root',
            node: {
                id: 'card',
                type: 'Card',
                children: [
                    { id: 'label', type: 'Text' },
                    { id: 'label', type: 'Text' }
                ]
            }
        })).to.throw('Cannot insert Builder node because the inserted subtree contains duplicate ids.');
    });

    it('rejects missing parents and invalid positions', () => {
        const document = createBuilderDocument({ id: 'landing' });

        expect(() => insertNode(document, {
            parentId: 'missing',
            node: { id: 'section', type: 'Section' }
        })).to.throw("Cannot insert Builder node because parent 'missing' was not found.");

        expect(() => insertNode(document, {
            parentId: 'landing-root',
            index: 1,
            node: { id: 'section', type: 'Section' }
        })).to.throw('Cannot insert Builder node at index 1; expected a position from 0 to 0.');
    });
});

describe('updateNodeProps', () => {

    it('merges props for the requested node without mutating the original document', () => {
        const document = createBuilderDocument({ id: 'landing' });
        document.tree.children = [
            {
                id: 'hero',
                type: 'HeroSection',
                props: {
                    title: 'Old title',
                    subtitle: 'Keep this'
                },
                children: [
                    { id: 'cta', type: 'Button', props: { label: 'Start' } }
                ],
                events: {
                    onClick: { actionId: 'navigate-home' }
                },
                style: {
                    className: 'hero'
                },
                meta: {
                    label: 'Hero'
                }
            }
        ];

        const nextDocument = updateNodeProps(document, {
            nodeId: 'hero',
            props: {
                title: 'New title',
                align: 'center'
            }
        });
        const nextHero = nextDocument.tree.children![0];
        const originalHero = document.tree.children[0];

        expect(nextHero.props).to.deep.equal({
            title: 'New title',
            subtitle: 'Keep this',
            align: 'center'
        });
        expect(originalHero.props).to.deep.equal({
            title: 'Old title',
            subtitle: 'Keep this'
        });
        expect(nextHero.children).to.deep.equal(originalHero.children);
        expect(nextHero.events).to.deep.equal(originalHero.events);
        expect(nextHero.style).to.deep.equal(originalHero.style);
        expect(nextHero.meta).to.deep.equal(originalHero.meta);
        expect(nextDocument).to.not.equal(document);
        expect(nextDocument.tree).to.not.equal(document.tree);
        expect(nextHero).to.not.equal(originalHero);
    });

    it('creates props when the target node does not have props yet', () => {
        const document = createBuilderDocument({ id: 'landing' });
        document.tree.children = [
            { id: 'section', type: 'Section' }
        ];

        const nextDocument = updateNodeProps(document, {
            nodeId: 'section',
            props: {
                gap: 'md'
            }
        });

        expect(nextDocument.tree.children![0].props).to.deep.equal({ gap: 'md' });
        expect(document.tree.children[0].props).to.equal(undefined);
    });

    it('updates props for nodes inside slots', () => {
        const document = createBuilderDocument({ id: 'landing' });
        document.tree.children = [
            {
                id: 'card',
                type: 'Card',
                slots: {
                    header: [
                        { id: 'badge', type: 'Badge', props: { color: 'blue' } }
                    ]
                }
            }
        ];

        const nextDocument = updateNodeProps(document, {
            nodeId: 'badge',
            props: {
                color: 'green'
            }
        });

        expect(nextDocument.tree.children![0].slots!.header[0].props).to.deep.equal({ color: 'green' });
        expect(document.tree.children[0].slots!.header[0].props).to.deep.equal({ color: 'blue' });
    });

    it('rejects missing nodes', () => {
        const document = createBuilderDocument({ id: 'landing' });

        expect(() => updateNodeProps(document, {
            nodeId: 'missing',
            props: {
                title: 'No target'
            }
        })).to.throw("Cannot update Builder node props because node 'missing' was not found.");
    });
});

describe('removeNode', () => {

    it('removes a node from children without mutating the original document', () => {
        const document = createBuilderDocument({ id: 'landing' });
        document.tree.children = [
            { id: 'hero', type: 'HeroSection' },
            { id: 'features', type: 'FeatureGrid', children: [{ id: 'feature-title', type: 'Title' }] },
            { id: 'cta', type: 'CTASection' }
        ];

        const nextDocument = removeNode(document, { nodeId: 'features' });

        expect(nextDocument.tree.children?.map(node => node.id)).to.deep.equal(['hero', 'cta']);
        expect(document.tree.children.map(node => node.id)).to.deep.equal(['hero', 'features', 'cta']);
        expect(findNodeById(nextDocument.tree, 'feature-title')).to.equal(undefined);
        expect(nextDocument).to.not.equal(document);
        expect(nextDocument.tree).to.not.equal(document.tree);
    });

    it('removes a node from a named slot', () => {
        const document = createBuilderDocument({ id: 'landing' });
        document.tree.children = [
            {
                id: 'card',
                type: 'Card',
                slots: {
                    header: [
                        { id: 'badge', type: 'Badge' },
                        { id: 'title', type: 'Title' }
                    ]
                }
            }
        ];

        const nextDocument = removeNode(document, { nodeId: 'badge' });

        expect(nextDocument.tree.children![0].slots!.header.map(node => node.id)).to.deep.equal(['title']);
        expect(document.tree.children[0].slots!.header.map(node => node.id)).to.deep.equal(['badge', 'title']);
    });

    it('removes a node from a data empty state container', () => {
        const document = createBuilderDocument({ id: 'landing' });
        document.tree.children = [
            {
                id: 'table',
                type: 'DataTable',
                data: {
                    emptyState: [
                        { id: 'empty-alert', type: 'Alert' }
                    ]
                }
            }
        ];

        const nextDocument = removeNode(document, { nodeId: 'empty-alert' });

        expect(nextDocument.tree.children![0].data!.emptyState).to.deep.equal([]);
        expect(document.tree.children[0].data!.emptyState).to.deep.equal([{ id: 'empty-alert', type: 'Alert' }]);
    });

    it('rejects removal of the root Page node', () => {
        const document = createBuilderDocument({ id: 'landing' });

        expect(() => removeNode(document, {
            nodeId: 'landing-root'
        })).to.throw("Cannot remove Builder root node 'landing-root'.");
    });

    it('rejects removal of non-root Page nodes as unsafe', () => {
        const document = createBuilderDocument({ id: 'landing' });
        document.tree.children = [
            { id: 'nested-page', type: 'Page' }
        ];

        expect(() => removeNode(document, {
            nodeId: 'nested-page'
        })).to.throw("Cannot remove Builder Page node 'nested-page'.");
    });

    it('rejects missing nodes', () => {
        const document = createBuilderDocument({ id: 'landing' });

        expect(() => removeNode(document, {
            nodeId: 'missing'
        })).to.throw("Cannot remove Builder node because node 'missing' was not found.");
    });
});

describe('moveNode', () => {

    it('moves a node between children containers without mutating the original document', () => {
        const document = createBuilderDocument({ id: 'landing' });
        document.tree.children = [
            {
                id: 'hero',
                type: 'HeroSection',
                children: [
                    { id: 'headline', type: 'Title' }
                ]
            },
            {
                id: 'features',
                type: 'FeatureGrid',
                children: [
                    { id: 'feature-copy', type: 'Text' }
                ]
            }
        ];

        const nextDocument = moveNode(document, {
            nodeId: 'headline',
            parentId: 'features',
            index: 1
        });

        expect(nextDocument.tree.children![0].children).to.deep.equal([]);
        expect(nextDocument.tree.children![1].children!.map(node => node.id)).to.deep.equal(['feature-copy', 'headline']);
        expect(document.tree.children[0].children!.map(node => node.id)).to.deep.equal(['headline']);
        expect(document.tree.children[1].children!.map(node => node.id)).to.deep.equal(['feature-copy']);
    });

    it('moves a node from children into a named slot and creates the slot when needed', () => {
        const document = createBuilderDocument({ id: 'landing' });
        document.tree.children = [
            { id: 'badge', type: 'Badge' },
            { id: 'card', type: 'Card' }
        ];

        const nextDocument = moveNode(document, {
            nodeId: 'badge',
            parentId: 'card',
            slotName: 'header'
        });

        expect(nextDocument.tree.children!.map(node => node.id)).to.deep.equal(['card']);
        expect(nextDocument.tree.children![0].slots!.header).to.deep.equal([{ id: 'badge', type: 'Badge' }]);
        expect(document.tree.children[1].slots).to.equal(undefined);
    });

    it('moves a node from a named slot back to children', () => {
        const document = createBuilderDocument({ id: 'landing' });
        document.tree.children = [
            {
                id: 'card',
                type: 'Card',
                children: [
                    { id: 'body', type: 'Text' }
                ],
                slots: {
                    header: [
                        { id: 'badge', type: 'Badge' }
                    ]
                }
            }
        ];

        const nextDocument = moveNode(document, {
            nodeId: 'badge',
            parentId: 'card',
            index: 0
        });
        const nextCard = nextDocument.tree.children![0];

        expect(nextCard.children!.map(node => node.id)).to.deep.equal(['badge', 'body']);
        expect(nextCard.slots!.header).to.deep.equal([]);
        expect(document.tree.children[0].slots!.header.map(node => node.id)).to.deep.equal(['badge']);
    });

    it('reorders a node in the same children container', () => {
        const document = createBuilderDocument({ id: 'landing' });
        document.tree.children = [
            { id: 'hero', type: 'HeroSection' },
            { id: 'features', type: 'FeatureGrid' },
            { id: 'cta', type: 'CTASection' }
        ];

        const nextDocument = moveNode(document, {
            nodeId: 'hero',
            parentId: 'landing-root',
            index: 2
        });

        expect(nextDocument.tree.children!.map(node => node.id)).to.deep.equal(['features', 'hero', 'cta']);
    });

    it('rejects cycles when the target parent is the moved node or one of its descendants', () => {
        const document = createBuilderDocument({ id: 'landing' });
        document.tree.children = [
            {
                id: 'section',
                type: 'Section',
                children: [
                    { id: 'card', type: 'Card' }
                ]
            }
        ];

        expect(() => moveNode(document, {
            nodeId: 'section',
            parentId: 'card'
        })).to.throw("Cannot move Builder node 'section' into itself or one of its descendants.");

        expect(() => moveNode(document, {
            nodeId: 'section',
            parentId: 'section'
        })).to.throw("Cannot move Builder node 'section' into itself or one of its descendants.");
    });

    it('rejects duplicate ids already present in the document tree', () => {
        const document = createBuilderDocument({ id: 'landing' });
        document.tree.children = [
            { id: 'section', type: 'Section' },
            { id: 'section', type: 'Card' }
        ];

        expect(() => moveNode(document, {
            nodeId: 'section',
            parentId: 'landing-root'
        })).to.throw('Cannot move Builder node because the document tree contains duplicate ids.');
    });

    it('rejects missing nodes, missing parents, root moves, Page moves, and invalid positions', () => {
        const document = createBuilderDocument({ id: 'landing' });
        document.tree.children = [
            { id: 'section', type: 'Section' },
            { id: 'nested-page', type: 'Page' }
        ];

        expect(() => moveNode(document, {
            nodeId: 'missing',
            parentId: 'landing-root'
        })).to.throw("Cannot move Builder node because node 'missing' was not found.");

        expect(() => moveNode(document, {
            nodeId: 'section',
            parentId: 'missing'
        })).to.throw("Cannot move Builder node because parent 'missing' was not found.");

        expect(() => moveNode(document, {
            nodeId: 'landing-root',
            parentId: 'section'
        })).to.throw("Cannot move Builder root node 'landing-root'.");

        expect(() => moveNode(document, {
            nodeId: 'nested-page',
            parentId: 'section'
        })).to.throw("Cannot move Builder Page node 'nested-page'.");

        expect(() => moveNode(document, {
            nodeId: 'section',
            parentId: 'landing-root',
            index: 3
        })).to.throw('Cannot move Builder node to index 3; expected a position from 0 to 2.');
    });
});

describe('duplicateNode', () => {

    it('duplicates a subtree after the original with new unique ids and preserved fields', () => {
        const document = createBuilderDocument({ id: 'landing' });
        document.tree.children = [
            {
                id: 'hero',
                type: 'HeroSection',
                props: { title: 'Build faster' },
                children: [
                    { id: 'headline', type: 'Title', props: { order: 1 } }
                ],
                slots: {
                    actions: [
                        { id: 'primary-cta', type: 'Button', props: { label: 'Start' } }
                    ]
                },
                data: {
                    sourceId: 'marketing',
                    fields: { title: { path: 'headline' } },
                    repeat: { sourceId: 'features', itemName: 'feature' },
                    emptyState: [
                        { id: 'empty-copy', type: 'Text', props: { children: 'No content' } }
                    ]
                },
                events: {
                    onClick: { actionId: 'track-hero' }
                },
                visibility: {
                    stateId: 'isVisible',
                    equals: true
                },
                permissions: [
                    { permissions: ['marketing.read'] }
                ],
                style: {
                    className: 'hero-section'
                },
                meta: {
                    label: 'Hero'
                }
            },
            { id: 'footer', type: 'Section' }
        ];

        const nextDocument = duplicateNode(document, { nodeId: 'hero' });
        const originalHero = nextDocument.tree.children![0];
        const duplicatedHero = nextDocument.tree.children![1];

        expect(nextDocument.tree.children!.map(node => node.id)).to.deep.equal(['hero', 'hero-copy', 'footer']);
        expect(duplicatedHero.id).to.equal('hero-copy');
        expect(duplicatedHero.children![0].id).to.equal('headline-copy');
        expect(duplicatedHero.slots!.actions[0].id).to.equal('primary-cta-copy');
        expect(duplicatedHero.data!.emptyState![0].id).to.equal('empty-copy-copy');
        expect(duplicatedHero).to.deep.include({
            type: 'HeroSection',
            props: { title: 'Build faster' },
            events: { onClick: { actionId: 'track-hero' } },
            visibility: { stateId: 'isVisible', equals: true },
            permissions: [{ permissions: ['marketing.read'] }],
            style: { className: 'hero-section' },
            meta: { label: 'Hero' }
        });
        expect(duplicatedHero.data).to.deep.equal({
            sourceId: 'marketing',
            fields: { title: { path: 'headline' } },
            repeat: { sourceId: 'features', itemName: 'feature' },
            emptyState: [
                { id: 'empty-copy-copy', type: 'Text', props: { children: 'No content' } }
            ]
        });
        expect(originalHero.children![0].id).to.equal('headline');
        expect(document.tree.children.map(node => node.id)).to.deep.equal(['hero', 'footer']);
        expect(duplicatedHero).to.not.equal(document.tree.children[0]);
        expect(duplicatedHero.children).to.not.equal(document.tree.children[0].children);
        expect(duplicatedHero.slots).to.not.equal(document.tree.children[0].slots);
        expect(duplicatedHero.data).to.not.equal(document.tree.children[0].data);
    });

    it('uses the next available suffix when copy ids already exist', () => {
        const document = createBuilderDocument({ id: 'landing' });
        document.tree.children = [
            {
                id: 'card',
                type: 'Card',
                children: [
                    { id: 'label', type: 'Text' }
                ]
            },
            { id: 'card-copy', type: 'Card' },
            { id: 'label-copy', type: 'Text' }
        ];

        const nextDocument = duplicateNode(document, { nodeId: 'card' });

        expect(nextDocument.tree.children![1].id).to.equal('card-copy-2');
        expect(nextDocument.tree.children![1].children![0].id).to.equal('label-copy-2');
    });

    it('duplicates into an explicit parent slot at the requested position', () => {
        const document = createBuilderDocument({ id: 'landing' });
        document.tree.children = [
            { id: 'badge', type: 'Badge' },
            {
                id: 'card',
                type: 'Card',
                slots: {
                    header: [
                        { id: 'title', type: 'Title' }
                    ]
                }
            }
        ];

        const nextDocument = duplicateNode(document, {
            nodeId: 'badge',
            parentId: 'card',
            slotName: 'header',
            index: 0
        });

        expect(nextDocument.tree.children![0].id).to.equal('badge');
        expect(nextDocument.tree.children![1].slots!.header.map(node => node.id)).to.deep.equal(['badge-copy', 'title']);
        expect(document.tree.children[1].slots!.header.map(node => node.id)).to.deep.equal(['title']);
    });

    it('duplicates nodes in data empty state containers after the original by default', () => {
        const document = createBuilderDocument({ id: 'landing' });
        document.tree.children = [
            {
                id: 'table',
                type: 'DataTable',
                data: {
                    emptyState: [
                        { id: 'empty-alert', type: 'Alert' }
                    ]
                }
            }
        ];

        const nextDocument = duplicateNode(document, { nodeId: 'empty-alert' });

        expect(nextDocument.tree.children![0].data!.emptyState).to.deep.equal([
            { id: 'empty-alert', type: 'Alert' },
            { id: 'empty-alert-copy', type: 'Alert' }
        ]);
        expect(document.tree.children[0].data!.emptyState).to.deep.equal([{ id: 'empty-alert', type: 'Alert' }]);
    });

    it('rejects missing nodes, missing parents, root duplicates, Page duplicates, duplicate document ids, and invalid positions', () => {
        const document = createBuilderDocument({ id: 'landing' });
        document.tree.children = [
            { id: 'section', type: 'Section' },
            { id: 'nested-page', type: 'Page' }
        ];

        expect(() => duplicateNode(document, {
            nodeId: 'missing'
        })).to.throw("Cannot duplicate Builder node because node 'missing' was not found.");

        expect(() => duplicateNode(document, {
            nodeId: 'section',
            parentId: 'missing'
        })).to.throw("Cannot duplicate Builder node because parent 'missing' was not found.");

        expect(() => duplicateNode(document, {
            nodeId: 'landing-root'
        })).to.throw("Cannot duplicate Builder root node 'landing-root'.");

        expect(() => duplicateNode(document, {
            nodeId: 'nested-page'
        })).to.throw("Cannot duplicate Builder Page node 'nested-page'.");

        expect(() => duplicateNode(document, {
            nodeId: 'section',
            index: 3
        })).to.throw('Cannot duplicate Builder node to index 3; expected a position from 0 to 2.');

        document.tree.children.push({ id: 'section', type: 'Card' });

        expect(() => duplicateNode(document, {
            nodeId: 'section'
        })).to.throw('Cannot duplicate Builder node because the document tree contains duplicate ids.');
    });
});

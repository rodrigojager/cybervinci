import { expect } from 'chai';
import { createDefaultBuilderComponentRegistry } from '@cybervinci/builder-registry';
import { createBuilderDocument } from '@cybervinci/builder-schema';
import { createBuilderPuckAdapter, createBuilderPuckConfig, builderToPuckData, BuilderPuckAdapterValidationError, BuilderPuckInternalFormatError, puckDataToBuilder, type BuilderPuckData } from './index';

describe('createBuilderPuckAdapter', () => {

    const registry = createDefaultBuilderComponentRegistry();

    it('round-trips canonical Builder documents with nested children and slots', () => {
        const document = createBuilderDocument({ id: 'puck-round-trip-children-slots-test' });
        document.tree.children = [
            {
                id: 'hero',
                type: 'Section',
                props: {
                    paddingY: 'xl'
                },
                children: [
                    {
                        id: 'hero-title',
                        type: 'Title',
                        props: {
                            children: 'Round trip',
                            order: 1
                        }
                    },
                    {
                        id: 'hero-card',
                        type: 'Card',
                        props: {
                            shadow: 'sm'
                        },
                        slots: {
                            actions: [
                                {
                                    id: 'hero-cta',
                                    type: 'Button',
                                    props: {
                                        children: 'Start',
                                        variant: 'filled',
                                        type: 'button'
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        ];

        const puckData = builderToPuckData(document, { registry });
        const roundTripped = puckDataToBuilder(puckData, {
            baseDocument: document,
            registry
        });

        expect(roundTripped.tree).to.deep.equal(document.tree);
        expect(puckData.root.children![0].children![1].slots!.actions[0]).to.deep.include({
            id: 'hero-cta',
            type: 'Button'
        });
    });

    it('uses registry defaults in Puck toolbox items without sharing mutable nodes', () => {
        const config = createBuilderPuckConfig({ registry });
        const cardTool = config.toolbox.flatMap(category => category.items).find(item => item.type === 'Card')!;

        expect(cardTool.defaultProps).to.deep.equal({
            padding: 'md',
            radius: 'sm',
            shadow: 'none',
            withBorder: true
        });
        expect(cardTool.defaultNode).to.deep.include({
            type: 'Card',
            props: cardTool.defaultProps
        });

        cardTool.defaultNode.props!.padding = 'xl';

        expect(config.components.Card.defaultNode.props).to.deep.equal({
            padding: 'md',
            radius: 'sm',
            shadow: 'none',
            withBorder: true
        });
    });

    it('converts visual reorder operations back into canonical children and slot order', () => {
        const document = createBuilderDocument({ id: 'puck-reorder-test' });
        document.tree.children = [
            {
                id: 'card',
                type: 'Card',
                children: [
                    { id: 'title', type: 'Title', props: { children: 'Title' } },
                    { id: 'copy', type: 'Text', props: { children: 'Copy' } },
                    { id: 'button', type: 'Button', props: { children: 'Action' } }
                ],
                slots: {
                    actions: [
                        { id: 'primary', type: 'Button', props: { children: 'Primary' } },
                        { id: 'secondary', type: 'Button', props: { children: 'Secondary' } }
                    ]
                }
            }
        ];
        const data = builderToPuckData(document, { registry });
        const card = data.root.children![0];

        card.children = [card.children![2], card.children![0], card.children![1]];
        card.slots!.actions = [card.slots!.actions[1], card.slots!.actions[0]];

        const updated = puckDataToBuilder(data, {
            baseDocument: document,
            registry
        });

        expect(updated.tree.children![0].children!.map(node => node.id)).to.deep.equal(['button', 'title', 'copy']);
        expect(updated.tree.children![0].slots!.actions.map(node => node.id)).to.deep.equal(['secondary', 'primary']);
    });

    it('converts visual delete operations back into canonical Builder children and slots', () => {
        const document = createBuilderDocument({ id: 'puck-delete-test' });
        document.tree.children = [
            {
                id: 'card',
                type: 'Card',
                children: [
                    { id: 'title', type: 'Title', props: { children: 'Keep' } },
                    { id: 'copy', type: 'Text', props: { children: 'Delete' } }
                ],
                slots: {
                    actions: [
                        { id: 'primary', type: 'Button', props: { children: 'Keep' } },
                        { id: 'secondary', type: 'Button', props: { children: 'Delete' } }
                    ]
                }
            }
        ];
        const data = builderToPuckData(document, { registry });
        const card = data.root.children![0];

        card.children = [card.children![0]];
        card.slots!.actions = [card.slots!.actions[0]];

        const updated = puckDataToBuilder(data, {
            baseDocument: document,
            registry
        });

        expect(updated.tree.children![0].children!.map(node => node.id)).to.deep.equal(['title']);
        expect(updated.tree.children![0].slots!.actions.map(node => node.id)).to.deep.equal(['primary']);
    });

    it('accepts visual duplicate operations only when duplicated subtrees use unique Builder ids', () => {
        const document = createBuilderDocument({ id: 'puck-duplicate-test' });
        document.tree.children = [
            {
                id: 'card',
                type: 'Card',
                children: [
                    { id: 'card-title', type: 'Title', props: { children: 'Original' } }
                ],
                slots: {
                    actions: [
                        { id: 'card-cta', type: 'Button', props: { children: 'Buy' } }
                    ]
                }
            }
        ];
        const duplicate = JSON.parse(JSON.stringify(builderToPuckData(document, { registry }).root.children![0]));
        duplicate.id = 'card-copy';
        duplicate.builderNode.id = 'card-copy';
        duplicate.children[0].id = 'card-title-copy';
        duplicate.children[0].builderNode.id = 'card-title-copy';
        duplicate.children[0].props.children = 'Duplicated';
        duplicate.slots.actions[0].id = 'card-cta-copy';
        duplicate.slots.actions[0].builderNode.id = 'card-cta-copy';

        const data = builderToPuckData(document, { registry });
        data.root.children!.push(duplicate);

        const updated = puckDataToBuilder(data, {
            baseDocument: document,
            registry
        });
        const ids = collectNodeIds(updated.tree);

        expect(updated.tree.children!.map(node => node.id)).to.deep.equal(['card', 'card-copy']);
        expect(updated.tree.children![1].children![0]).to.deep.include({
            id: 'card-title-copy',
            type: 'Title'
        });
        expect(updated.tree.children![1].slots!.actions[0].id).to.equal('card-cta-copy');
        expect(ids.size).to.equal([...ids].length);
    });

    it('maps unknown Builder components to a visual editor fallback without dropping the node', () => {
        const document = createBuilderDocument({ id: 'puck-fallback-test' });
        document.tree.children = [
            {
                id: 'custom',
                type: 'CustomPremiumWidget',
                props: {
                    plan: 'enterprise'
                },
                children: [
                    {
                        id: 'copy',
                        type: 'Text',
                        props: {
                            children: 'Still rendered'
                        }
                    }
                ]
            }
        ];

        const adapter = createBuilderPuckAdapter(document, { registry });
        const data = adapter.puckData as BuilderPuckData;
        const unknown = data.root.children![0];

        expect(unknown.type).to.equal('BuilderUnknownComponentFallback');
        expect(unknown.props).to.deep.include({
            originalType: 'CustomPremiumWidget',
            message: "Unknown Builder component type 'CustomPremiumWidget'.",
            plan: 'enterprise'
        });
        expect(unknown.unknownComponent).to.deep.equal({
            type: 'BuilderUnknownComponentFallback',
            originalType: 'CustomPremiumWidget',
            nodeId: 'custom',
            message: "Unknown Builder component type 'CustomPremiumWidget'."
        });
        expect(unknown.children![0].type).to.equal('Text');
    });

    it('exposes builderToPuckData as the direct Builder to Puck conversion adapter', () => {
        const document = createBuilderDocument({ id: 'puck-direct-adapter-test' });
        document.tree.children = [
            {
                id: 'headline',
                type: 'Title',
                props: {
                    children: 'Direct adapter'
                }
            }
        ];

        const data = builderToPuckData(document, { registry });

        expect(data.root.id).to.equal('puck-direct-adapter-test-root');
        expect(data.root.children![0]).to.deep.include({
            id: 'headline',
            type: 'Title'
        });
        expect(data.root.children![0].props).to.deep.equal({
            children: 'Direct adapter'
        });
    });

    it('rejects editor fallback nodes when converting back to strict canonical Builder', () => {
        const document = createBuilderDocument({ id: 'puck-roundtrip-test' });
        document.tree.children = [
            {
                id: 'custom',
                type: 'CustomPremiumWidget',
                props: {
                    label: 'Custom'
                }
            }
        ];

        const adapter = createBuilderPuckAdapter(document, { registry });

        expect(() => adapter.toBuilderDocument(adapter.puckData)).to.throw(
            BuilderPuckAdapterValidationError,
            "Unknown Builder component type 'CustomPremiumWidget'."
        );
    });

    it('writes visual editor prop changes back to Builder nodes', () => {
        const document = createBuilderDocument({ id: 'puck-props-sync-test' });
        document.tree.children = [
            {
                id: 'headline',
                type: 'Title',
                props: {
                    children: 'Original'
                }
            }
        ];

        const adapter = createBuilderPuckAdapter(document, { registry });
        const data = adapter.puckData as BuilderPuckData;
        data.root.children![0].props = {
            children: 'Edited in Puck',
            order: 9
        };

        expect(() => adapter.toBuilderDocument(data)).to.throw(
            BuilderPuckAdapterValidationError,
            "Invalid props value for component 'Title': expected one of 1, 2, 3, 4, 5, 6."
        );

        data.root.children![0].props = {
            children: 'Edited in Puck'
        };

        const updated = adapter.toBuilderDocument(data);

        expect(updated.tree.children![0].props).to.deep.equal({
            children: 'Edited in Puck'
        });
    });

    it('preserves safe Builder node metadata when converting through Puck data', () => {
        const document = createBuilderDocument({ id: 'puck-metadata-test' });
        document.actions = {
            submitLead: {
                type: 'submitForm',
                params: {
                    formId: 'lead'
                }
            }
        };
        document.dataSources = {
            leadCopy: {
                type: 'static',
                config: {
                    data: {
                        headline: 'Lead form'
                    }
                }
            }
        };
        document.tree.children = [
            {
                id: 'lead-card',
                type: 'Card',
                props: {
                    shadow: 'sm'
                },
                data: {
                    sourceId: 'leadCopy',
                    fields: {
                        title: {
                            path: 'headline'
                        }
                    }
                },
                events: {
                    onClick: {
                        actionId: 'submitLead',
                        preventDefault: true
                    }
                },
                visibility: {
                    stateId: 'showLead',
                    equals: true
                },
                permissions: [
                    {
                        effect: 'allow',
                        roles: ['sales']
                    }
                ],
                style: {
                    className: 'lead-card',
                    css: {
                        maxWidth: 480
                    }
                },
                meta: {
                    label: 'Lead card',
                    source: {
                        kind: 'ai',
                        id: 'prompt-1'
                    }
                }
            }
        ];

        const adapter = createBuilderPuckAdapter(document, { registry });
        const roundTripped = adapter.toBuilderDocument(adapter.puckData);

        expect(roundTripped.tree.children![0]).to.deep.equal(document.tree.children[0]);
    });

    it('marks the selected Builder node in the visual editor data', () => {
        const document = createBuilderDocument({ id: 'puck-selection-test' });
        document.tree.children = [
            {
                id: 'headline',
                type: 'Title',
                props: {
                    children: 'Selected'
                }
            },
            {
                id: 'body',
                type: 'Text',
                props: {
                    children: 'Not selected'
                }
            }
        ];

        const adapter = createBuilderPuckAdapter(document, { registry, selectedNodeId: 'headline' });
        const data = adapter.puckData as BuilderPuckData;

        expect(data.root.isSelected).to.equal(undefined);
        expect(data.root.children![0].isSelected).to.equal(true);
        expect(data.root.children![1].isSelected).to.equal(undefined);
    });

    it('exposes puckDataToBuilder as the direct Puck to Builder conversion adapter', () => {
        const document = createBuilderDocument({ id: 'puck-direct-back-adapter-test' });
        const puckData = builderToPuckData(document, { registry });
        puckData.root.children = [
            {
                id: 'body',
                type: 'Text',
                props: {
                    children: 'Converted back'
                },
                builderNode: {
                    id: 'body',
                    type: 'Text'
                }
            }
        ];

        const updated = puckDataToBuilder(puckData, {
            baseDocument: document,
            registry
        });

        expect(updated).to.deep.include({
            schemaVersion: document.schemaVersion,
            metadata: document.metadata,
            page: document.page
        });
        expect(updated.tree.children).to.deep.equal([
            {
                id: 'body',
                type: 'Text',
                props: {
                    children: 'Converted back'
                }
            }
        ]);
    });

    it('rejects non-Puck data instead of treating it as a canonical Builder document', () => {
        const document = createBuilderDocument({ id: 'puck-strict-boundary-test' });
        const adapter = createBuilderPuckAdapter(document, { registry });

        expect(() => adapter.toBuilderDocument(document as unknown as BuilderPuckData)).to.throw(
            BuilderPuckInternalFormatError,
            'Expected internal Puck data with a root node before converting to canonical Builder.'
        );
        expect(() => puckDataToBuilder({} as BuilderPuckData, {
            baseDocument: document,
            registry
        })).to.throw(
            BuilderPuckInternalFormatError,
            'Expected internal Puck data with a root node before converting to canonical Builder.'
        );
    });

    it('rejects Puck data that would create duplicate Builder node ids', () => {
        const document = createBuilderDocument({ id: 'puck-duplicate-id-test' });
        const puckData = builderToPuckData(document, { registry });
        const duplicateNode = {
            id: 'duplicate',
            type: 'Text',
            props: {
                children: 'Duplicate'
            },
            builderNode: {
                id: 'duplicate',
                type: 'Text'
            }
        };
        puckData.root.children = [duplicateNode, {
            ...duplicateNode,
            props: {
                children: 'Duplicate again'
            },
            builderNode: {
                id: 'duplicate',
                type: 'Text'
            }
        }];

        expect(() => puckDataToBuilder(puckData, {
            baseDocument: document,
            registry
        })).to.throw(BuilderPuckAdapterValidationError, "Duplicate Builder node id 'duplicate'");
    });

    it('generates Puck component config, toolbox categories, defaults, fields, and child rules from the Builder registry', () => {
        const config = createBuilderPuckConfig({ registry });

        expect(config.categories.Layout.components).to.include.members(['Page', 'Section', 'Card']);
        expect(config.toolbox.find(category => category.category === 'Typography')!.items.map(item => item.type)).to.include.members(['Title', 'Text']);

        const title = config.components.Title;
        expect(title).to.deep.include({
            label: 'Title',
            category: 'Typography',
            defaultProps: {
                children: 'Title',
                order: 2
            },
            allowedChildren: []
        });
        expect(title.fields.children).to.deep.include({
            type: 'text',
            label: 'children',
            default: 'Title'
        });
        expect(title.fields.order).to.deep.include({
            type: 'select',
            label: 'order',
            default: 2
        });
        expect(title.fields.order.options!.map(option => option.value)).to.deep.equal([1, 2, 3, 4, 5, 6]);
        expect(config.rules.Title).to.deep.equal({
            canContain: [],
            slots: undefined
        });

        const card = config.components.Card;
        expect(card.defaultNode).to.deep.include({
            type: 'Card',
            props: {
                padding: 'md',
                radius: 'sm',
                shadow: 'none',
                withBorder: true
            }
        });
        expect(card.fields.withBorder).to.deep.include({
            type: 'checkbox',
            label: 'withBorder',
            default: true
        });
        expect(card.rules.canContain).to.include.members(['Title', 'Text', 'Button']);
        expect(card.slots!.actions).to.deep.include({
            label: 'Actions',
            allowedChildren: ['Button', 'Anchor', 'Group']
        });
        expect(config.rules.Card.slots!.actions).to.deep.equal({
            canContain: ['Button', 'Anchor', 'Group']
        });
    });

    it('includes an editor-only unknown component fallback in generated Puck config by default', () => {
        const config = createBuilderPuckConfig({ registry });

        expect(config.components.BuilderUnknownComponentFallback).to.deep.include({
            label: 'Unknown Builder Component',
            category: 'Custom',
            defaultProps: {
                originalType: 'Unknown',
                message: 'Unknown Builder component.'
            }
        });
        expect(createBuilderPuckConfig({ registry, includeUnknownFallback: false }).components.BuilderUnknownComponentFallback).to.equal(undefined);
    });
});

function collectNodeIds(node: { id: string; children?: Array<{ id: string }>; slots?: Record<string, Array<{ id: string }>> }): Set<string> {
    const ids = new Set<string>([node.id]);
    for (const child of node.children ?? []) {
        for (const id of collectNodeIds(child)) {
            ids.add(id);
        }
    }
    for (const slotChildren of Object.values(node.slots ?? {})) {
        for (const child of slotChildren) {
            for (const id of collectNodeIds(child)) {
                ids.add(id);
            }
        }
    }
    return ids;
}

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
    createDefaultBuilderComponentRegistry,
    createStaticComponentRegistry,
    validateBuilderDocumentTypesAgainstRegistry,
    validateBuilderNodeTypesAgainstRegistry
} from './index';

describe('validateBuilderNodeTypesAgainstRegistry', () => {

    const registry = createStaticComponentRegistry([
        {
            type: 'Page',
            displayName: 'Page',
            category: 'Layout',
            propsSchema: {}
        },
        {
            type: 'Section',
            displayName: 'Section',
            category: 'Layout',
            propsSchema: {},
            allowedChildren: ['Section', 'Text']
        },
        {
            type: 'Tabs',
            displayName: 'Tabs',
            category: 'Navigation',
            propsSchema: {},
            slots: {
                tabs: {
                    displayName: 'Tabs',
                    allowedChildren: ['Text']
                }
            }
        },
        {
            type: 'Text',
            displayName: 'Text',
            category: 'Typography',
            propsSchema: {
                type: 'object',
                required: ['children'],
                additionalProperties: false,
                properties: {
                    children: { type: 'string' },
                    color: { type: 'string', enum: ['blue', 'red'] },
                    weight: { type: 'integer' }
                }
            }
        }
    ]);

    it('accepts nodes whose types are registered', () => {
        const document = createBuilderDocument();
        document.tree.children = [
            {
                id: 'section',
                type: 'Section',
                children: [
                    { id: 'copy', type: 'Text', props: { children: 'Copy' } }
                ]
            }
        ];

        expect(validateBuilderDocumentTypesAgainstRegistry(document, registry)).to.deep.equal({
            valid: true,
            errors: []
        });
    });

    it('reports a clear strict-mode error for unknown component types', () => {
        const document = createBuilderDocument();
        document.tree.children = [
            {
                id: 'custom',
                type: 'CustomHero'
            }
        ];

        expect(validateBuilderNodeTypesAgainstRegistry(document.tree, registry)).to.deep.equal({
            valid: false,
            errors: [
                {
                    path: '$.tree.children[0].type',
                    message: "Unknown Builder component type 'CustomHero'. " +
                        'Register it in ComponentRegistry or validate in editor mode to allow an editor fallback.',
                    nodeId: 'custom',
                    componentType: 'CustomHero'
                }
            ]
        });
    });

    it('allows unknown component types only when the caller opts into editor mode', () => {
        const document = createBuilderDocument();
        document.tree.children = [
            {
                id: 'custom',
                type: 'CustomHero',
                slots: {
                    fallback: [
                        { id: 'slot-custom', type: 'CustomSlot' }
                    ]
                },
                data: {
                    emptyState: [
                        { id: 'empty-custom', type: 'CustomEmpty' }
                    ]
                }
            }
        ];

        expect(validateBuilderNodeTypesAgainstRegistry(document.tree, registry, { mode: 'editor' })).to.deep.equal({
            valid: true,
            errors: []
        });
    });

    it('validates node props against the registered propsSchema', () => {
        const document = createBuilderDocument();
        document.tree.children = [
            {
                id: 'copy',
                type: 'Text',
                props: {
                    children: 'Hello',
                    color: 'blue',
                    weight: 700
                }
            }
        ];

        expect(validateBuilderDocumentTypesAgainstRegistry(document, registry)).to.deep.equal({
            valid: true,
            errors: []
        });
    });

    it('reports propsSchema errors with path, component type, and node id', () => {
        const document = createBuilderDocument();
        document.tree.children = [
            {
                id: 'copy',
                type: 'Text',
                props: {
                    color: 'green',
                    weight: 'bold',
                    unsafe: true
                }
            }
        ];

        expect(validateBuilderDocumentTypesAgainstRegistry(document, registry)).to.deep.equal({
            valid: false,
            errors: [
                {
                    path: 'tree.children[0].props.children',
                    message: "Missing required prop 'children' for component 'Text'.",
                    nodeId: 'copy',
                    componentType: 'Text'
                },
                {
                    path: 'tree.children[0].props.color',
                    message: "Invalid props value for component 'Text': expected one of blue, red.",
                    nodeId: 'copy',
                    componentType: 'Text'
                },
                {
                    path: 'tree.children[0].props.weight',
                    message: "Invalid props value for component 'Text': expected integer.",
                    nodeId: 'copy',
                    componentType: 'Text'
                },
                {
                    path: 'tree.children[0].props.unsafe',
                    message: "Unknown prop 'unsafe' for component 'Text'.",
                    nodeId: 'copy',
                    componentType: 'Text'
                }
            ]
        });
    });

    it('rejects direct children disallowed by the parent component definition', () => {
        const document = createBuilderDocument();
        document.tree.children = [
            {
                id: 'section',
                type: 'Section',
                children: [
                    { id: 'tabs', type: 'Tabs' }
                ]
            }
        ];

        expect(validateBuilderDocumentTypesAgainstRegistry(document, registry)).to.deep.equal({
            valid: false,
            errors: [
                {
                    path: '$.tree.children[0].children[0].type',
                    message: "Component 'Section' does not allow child component 'Tabs'; expected Section, Text.",
                    nodeId: 'tabs',
                    componentType: 'Tabs'
                }
            ]
        });
    });

    it('rejects slot children disallowed by the slot definition', () => {
        const document = createBuilderDocument();
        document.tree.children = [
            {
                id: 'tabs',
                type: 'Tabs',
                slots: {
                    tabs: [
                        { id: 'nested-section', type: 'Section' }
                    ]
                }
            }
        ];

        expect(validateBuilderDocumentTypesAgainstRegistry(document, registry)).to.deep.equal({
            valid: false,
            errors: [
                {
                    path: '$.tree.children[0].slots.tabs[0].type',
                    message: "Component 'Tabs' does not allow child component 'Section'; expected Text.",
                    nodeId: 'nested-section',
                    componentType: 'Section'
                }
            ]
        });
    });

    it('rejects slots that are not declared by the parent component definition', () => {
        const document = createBuilderDocument();
        document.tree.children = [
            {
                id: 'tabs',
                type: 'Tabs',
                slots: {
                    panels: [
                        { id: 'copy', type: 'Text', props: { children: 'Panel' } }
                    ]
                }
            }
        ];

        expect(validateBuilderDocumentTypesAgainstRegistry(document, registry)).to.deep.equal({
            valid: false,
            errors: [
                {
                    path: '$.tree.children[0].slots.panels',
                    message: "Component 'Tabs' does not define slot 'panels'.",
                    nodeId: 'tabs',
                    componentType: 'Tabs'
                }
            ]
        });
    });

    it('validates documents against the default MVP Layout registry', () => {
        const document = createBuilderDocument();
        document.tree.children = [
            {
                id: 'section',
                type: 'Section',
                props: {
                    component: 'section',
                    paddingY: 'xl',
                    fullWidth: true
                },
                children: [
                    {
                        id: 'container',
                        type: 'Container',
                        children: [
                            {
                                id: 'grid',
                                type: 'SimpleGrid',
                                props: {
                                    cols: 2,
                                    spacing: 'md'
                                },
                                children: [
                                    {
                                        id: 'card',
                                        type: 'Card',
                                        slots: {
                                            actions: [
                                                { id: 'actions', type: 'Group' }
                                            ]
                                        }
                                    },
                                    { id: 'box', type: 'Box' }
                                ]
                            }
                        ]
                    }
                ]
            }
        ];

        expect(validateBuilderDocumentTypesAgainstRegistry(document, createDefaultBuilderComponentRegistry())).to.deep.equal({
            valid: true,
            errors: []
        });
    });

    it('rejects invalid Layout props and slot children in the default registry', () => {
        const document = createBuilderDocument();
        document.tree.children = [
            {
                id: 'card',
                type: 'Card',
                props: {
                    padding: 'huge',
                    unknown: true
                },
                slots: {
                    actions: [
                        { id: 'divider', type: 'Divider' }
                    ]
                }
            }
        ];

        expect(validateBuilderDocumentTypesAgainstRegistry(document, createDefaultBuilderComponentRegistry())).to.deep.equal({
            valid: false,
            errors: [
                {
                    path: 'tree.children[0].props.padding',
                    message: "Invalid props value for component 'Card': expected one of 0, xs, sm, md, lg, xl.",
                    nodeId: 'card',
                    componentType: 'Card'
                },
                {
                    path: 'tree.children[0].props.unknown',
                    message: "Unknown prop 'unknown' for component 'Card'.",
                    nodeId: 'card',
                    componentType: 'Card'
                },
                {
                    path: '$.tree.children[0].slots.actions[0].type',
                    message: "Component 'Card' does not allow child component 'Divider'; expected Button, ActionIcon, UnstyledButton, CloseButton, Burger, CopyButton, FileButton, Anchor, Group.",
                    nodeId: 'divider',
                    componentType: 'Divider'
                }
            ]
        });
    });

    it('validates Typography components in the default registry', () => {
        const document = createBuilderDocument();
        document.tree.children = [
            {
                id: 'headline',
                type: 'Title',
                props: {
                    children: 'Build faster',
                    order: 1,
                    align: 'center'
                }
            },
            {
                id: 'copy',
                type: 'Text',
                props: {
                    children: 'Safe inline content',
                    size: 'md'
                },
                children: [
                    {
                        id: 'badge',
                        type: 'Badge',
                        props: {
                            children: 'New'
                        }
                    }
                ]
            },
            {
                id: 'notes',
                type: 'Markdown',
                props: {
                    content: '## Safe markdown',
                    allowHtml: false,
                    sanitize: true
                }
            }
        ];

        expect(validateBuilderDocumentTypesAgainstRegistry(document, createDefaultBuilderComponentRegistry())).to.deep.equal({
            valid: true,
            errors: []
        });
    });

    it('rejects invalid Typography props and Markdown children in the default registry', () => {
        const document = createBuilderDocument();
        document.tree.children = [
            {
                id: 'headline',
                type: 'Title',
                props: {
                    order: 9,
                    unsafe: true
                }
            },
            {
                id: 'markdown',
                type: 'Markdown',
                props: {
                    content: 'Raw HTML is not canonical',
                    allowHtml: 'yes'
                },
                children: [
                    { id: 'nested-copy', type: 'Text' }
                ]
            }
        ];

        expect(validateBuilderDocumentTypesAgainstRegistry(document, createDefaultBuilderComponentRegistry())).to.deep.equal({
            valid: false,
            errors: [
                {
                    path: 'tree.children[0].props.order',
                    message: "Invalid props value for component 'Title': expected one of 1, 2, 3, 4, 5, 6.",
                    nodeId: 'headline',
                    componentType: 'Title'
                },
                {
                    path: 'tree.children[0].props.unsafe',
                    message: "Unknown prop 'unsafe' for component 'Title'.",
                    nodeId: 'headline',
                    componentType: 'Title'
                },
                {
                    path: 'tree.children[1].props.allowHtml',
                    message: "Invalid props value for component 'Markdown': expected boolean.",
                    nodeId: 'markdown',
                    componentType: 'Markdown'
                },
                {
                    path: '$.tree.children[1].children[0].type',
                    message: "Component 'Markdown' does not allow child component 'Text'; expected no children.",
                    nodeId: 'nested-copy',
                    componentType: 'Text'
                }
            ]
        });
    });

    it('validates Form components in the default registry', () => {
        const document = createBuilderDocument();
        document.tree.children = [
            {
                id: 'form',
                type: 'DynamicForm',
                props: {
                    submitLabel: 'Send',
                    layout: 'vertical'
                },
                events: {
                    onSubmit: {
                        actionId: 'submit-contact'
                    }
                },
                children: [
                    {
                        id: 'email',
                        type: 'TextInput',
                        props: {
                            name: 'email',
                            label: 'Email',
                            type: 'email',
                            required: true
                        },
                        events: {
                            onChange: {
                                actionId: 'sync-email'
                            }
                        }
                    },
                    {
                        id: 'plan',
                        type: 'Select',
                        props: {
                            name: 'plan',
                            label: 'Plan',
                            data: [
                                { label: 'Starter', value: 'starter' }
                            ]
                        }
                    },
                    {
                        id: 'submit',
                        type: 'Button',
                        props: {
                            children: 'Send',
                            type: 'submit'
                        }
                    }
                ]
            }
        ];

        expect(validateBuilderDocumentTypesAgainstRegistry(document, createDefaultBuilderComponentRegistry())).to.deep.equal({
            valid: true,
            errors: []
        });
    });

    it('rejects invalid Form props, children, and events in the default registry', () => {
        const document = createBuilderDocument();
        document.tree.children = [
            {
                id: 'form',
                type: 'DynamicForm',
                props: {
                    layout: 'wizard'
                },
                events: {
                    onClick: {
                        actionId: 'invalid-form-click'
                    }
                },
                children: [
                    { id: 'copy', type: 'Text' }
                ],
                slots: {
                    actions: [
                        {
                            id: 'field',
                            type: 'TextInput',
                            events: {
                                onSubmit: {
                                    actionId: 'invalid-field-submit'
                                }
                            }
                        }
                    ]
                }
            }
        ];

        expect(validateBuilderDocumentTypesAgainstRegistry(document, createDefaultBuilderComponentRegistry())).to.deep.equal({
            valid: false,
            errors: [
                {
                    path: 'tree.children[0].props.layout',
                    message: "Invalid props value for component 'DynamicForm': expected one of vertical, horizontal, grid.",
                    nodeId: 'form',
                    componentType: 'DynamicForm'
                },
                {
                    path: '$.tree.children[0].children[0].type',
                    message: "Component 'DynamicForm' does not allow child component 'Text'; expected Fieldset, InputWrapper, Input, InputBase, InputLabel, " +
                        'InputDescription, InputPlaceholder, InputClearButton, InputError, TextInput, Autocomplete, PasswordInput, Textarea, Select, MultiSelect, NativeSelect, Combobox, ComboboxTarget, ComboboxDropdownTarget, ComboboxEventsTarget, ComboboxDropdown, ComboboxOptions, ComboboxOption, ComboboxSearch, ComboboxEmpty, ComboboxGroup, ComboboxHeader, ComboboxFooter, ComboboxChevron, ComboboxClearButton, ComboboxHiddenInput, CheckboxGroup, Checkbox, CheckboxCard, SwitchGroup, Switch, RadioGroup, Radio, RadioCard, ' +
                        'NumberInput, DateInput, ChipGroup, Chip, Slider, RangeSlider, SegmentedControl, PinInput, ColorInput, ColorPicker, HueSlider, AlphaSlider, AngleSlider, ' +
                        'ColorSwatch, JsonInput, TagsInput, FileInput, FileButton, PillsInput, PillsInputField, Rating, Button, ActionIcon, UnstyledButton, ' +
                        'Burger, CloseButton, CopyButton.',
                    nodeId: 'copy',
                    componentType: 'Text'
                },
                {
                    path: '$.tree.children[0].slots.actions[0].type',
                    message: "Component 'DynamicForm' does not allow child component 'TextInput'; expected Button, ActionIcon, Group.",
                    nodeId: 'field',
                    componentType: 'TextInput'
                },
                {
                    path: '$.tree.children[0].events.onClick',
                    message: "Component 'DynamicForm' does not allow event 'onClick'; expected onSubmit, onReset, onChange.",
                    nodeId: 'form',
                    componentType: 'DynamicForm'
                },
                {
                    path: '$.tree.children[0].slots.actions[0].events.onSubmit',
                    message: "Component 'TextInput' does not allow event 'onSubmit'; expected onChange, onFocus, onBlur.",
                    nodeId: 'field',
                    componentType: 'TextInput'
                }
            ]
        });
    });

    it('validates Data Display components with initial Builder data binding in the default registry', () => {
        const document = createBuilderDocument();
        document.dataSources = {
            accounts: {
                type: 'mock',
                config: {
                    rows: []
                }
            },
            metrics: {
                type: 'static',
                config: {
                    value: 42
                }
            }
        };
        document.tree.children = [
            {
                id: 'accounts-table',
                type: 'DataTable',
                props: {
                    title: 'Accounts',
                    columns: [
                        { key: 'name', label: 'Name', sortable: true },
                        { key: 'status', label: 'Status' }
                    ],
                    pageSize: 20,
                    sortable: true
                },
                data: {
                    repeat: {
                        sourceId: 'accounts',
                        itemName: 'account',
                        keyPath: 'id'
                    },
                    fields: {
                        name: { path: 'name' },
                        status: { path: 'status', fallback: 'Unknown' }
                    }
                }
            },
            {
                id: 'revenue',
                type: 'MetricCard',
                data: {
                    sourceId: 'metrics',
                    fields: {
                        value: { path: 'value', format: 'currency' },
                        label: { path: 'label', fallback: 'Revenue' }
                    }
                }
            }
        ];

        expect(validateBuilderDocumentTypesAgainstRegistry(document, createDefaultBuilderComponentRegistry())).to.deep.equal({
            valid: true,
            errors: []
        });
    });

    it('rejects invalid Data Display props and children in the default registry', () => {
        const document = createBuilderDocument();
        document.tree.children = [
            {
                id: 'table',
                type: 'Table',
                props: {
                    columns: [
                        { label: 'Missing key' }
                    ],
                    rows: 'not rows',
                    striped: 'yes'
                },
                children: [
                    { id: 'copy', type: 'Text' }
                ]
            },
            {
                id: 'metric',
                type: 'MetricCard',
                props: {
                    trend: 'higher',
                    unsafe: true
                }
            }
        ];

        expect(validateBuilderDocumentTypesAgainstRegistry(document, createDefaultBuilderComponentRegistry())).to.deep.equal({
            valid: false,
            errors: [
                {
                    path: 'tree.children[0].props.columns[0].key',
                    message: "Missing required prop 'key' for component 'Table'.",
                    nodeId: 'table',
                    componentType: 'Table'
                },
                {
                    path: 'tree.children[0].props.rows',
                    message: "Invalid props value for component 'Table': expected array.",
                    nodeId: 'table',
                    componentType: 'Table'
                },
                {
                    path: 'tree.children[0].props.striped',
                    message: "Invalid props value for component 'Table': expected boolean.",
                    nodeId: 'table',
                    componentType: 'Table'
                },
                {
                    path: '$.tree.children[0].children[0].type',
                    message: "Component 'Table' does not allow child component 'Text'; expected TableCaption, TableThead, TableTbody, TableTfoot, TableTr.",
                    nodeId: 'copy',
                    componentType: 'Text'
                },
                {
                    path: 'tree.children[1].props.trend',
                    message: "Invalid props value for component 'MetricCard': expected one of up, down, neutral.",
                    nodeId: 'metric',
                    componentType: 'MetricCard'
                },
                {
                    path: 'tree.children[1].props.unsafe',
                    message: "Unknown prop 'unsafe' for component 'MetricCard'.",
                    nodeId: 'metric',
                    componentType: 'MetricCard'
                }
            ]
        });
    });
});

describe('createBuilderRegistryAiSummary', () => {

    it('summarizes component types, descriptions, main props, children, slots, events, and examples', () => {
        const registry = createStaticComponentRegistry([
            {
                type: 'Card',
                displayName: 'Card',
                category: 'Layout',
                description: 'Framed content block.',
                propsSchema: {
                    type: 'object',
                    required: ['title'],
                    additionalProperties: false,
                    properties: {
                        title: { type: 'string' },
                        padding: { type: 'string', enum: ['sm', 'md'] },
                        withBorder: { type: 'boolean' }
                    }
                },
                defaultProps: {
                    padding: 'md',
                    withBorder: true
                },
                allowedChildren: ['Title', 'Text', 'Button'],
                allowedEvents: ['onClick'],
                slots: {
                    actions: {
                        displayName: 'Actions',
                        allowedChildren: ['Button']
                    }
                },
                aiHints: {
                    purpose: 'Groups related content.',
                    recommendedChildren: ['Text'],
                    recommendedSlots: ['actions']
                }
            }
        ]);

        expect(createBuilderRegistryAiSummary(registry)).to.deep.equal({
            components: [
                {
                    type: 'Card',
                    description: 'Groups related content.',
                    category: 'Layout',
                    props: [
                        { name: 'title', type: 'string', enum: undefined, required: true, default: undefined },
                        { name: 'padding', type: 'string', enum: ['sm', 'md'], required: undefined, default: 'md' },
                        { name: 'withBorder', type: 'boolean', enum: undefined, required: undefined, default: true }
                    ],
                    allowedChildren: ['Title', 'Text', 'Button'],
                    slots: {
                        actions: {
                            description: 'Actions',
                            allowedChildren: ['Button']
                        }
                    },
                    events: ['onClick'],
                    example: {
                        type: 'Card',
                        props: {
                            padding: 'md',
                            withBorder: true
                        },
                        children: [
                            { type: 'Text' }
                        ],
                        slots: {
                            actions: [
                                { type: 'Button' }
                            ]
                        }
                    }
                }
            ]
        });
    });

    it('keeps summaries compact with caller-provided limits', () => {
        const summary = createBuilderRegistryAiSummary(createDefaultBuilderComponentRegistry(), {
            maxPropsPerComponent: 2,
            maxChildrenPerComponent: 3,
            maxSlotsPerComponent: 1,
            includeEvents: false
        });

        const page = summary.components.find(component => component.type === 'Page');
        const card = summary.components.find(component => component.type === 'Card');
        const button = summary.components.find(component => component.type === 'Button');

        expect(summary.components.length).to.be.greaterThan(40);
        expect(page?.props).to.have.lengthOf(2);
        expect(page?.allowedChildren).to.have.lengthOf(3);
        expect(card?.slots && Object.keys(card.slots)).to.deep.equal(['header']);
        expect(button?.events).to.equal(undefined);
    });
});

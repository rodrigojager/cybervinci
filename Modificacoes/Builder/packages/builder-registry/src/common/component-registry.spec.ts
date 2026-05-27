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
    ActionRegistry,
    Builder_ACTION_DEFINITIONS,
    ComponentRegistry,
    Builder_COMPONENT_CATEGORIES,
    Builder_DASHBOARD_COMPONENTS,
    Builder_DATA_DISPLAY_COMPONENTS,
    Builder_DATA_SOURCE_DEFINITIONS,
    Builder_FEEDBACK_COMPONENTS,
    Builder_FORM_COMPONENTS,
    Builder_LAYOUT_COMPONENTS,
    Builder_MARKETING_COMPONENTS,
    Builder_MEDIA_COMPONENTS,
    Builder_NAVIGATION_COMPONENTS,
    Builder_OVERLAY_COMPONENTS,
    Builder_TYPOGRAPHY_COMPONENTS,
    DataSourceRegistry,
    createDefaultBuilderActionRegistry,
    createDefaultBuilderDataSourceRegistry,
    createDefaultBuilderComponentRegistry,
    createStaticActionRegistry,
    createStaticDataSourceRegistry,
    createStaticComponentRegistry,
    isBuilderComponentCategory,
    validateBuilderDocumentActionsAgainstRegistry,
    validateBuilderDocumentDataSourcesAgainstRegistry
} from './index';

describe('ComponentRegistry', () => {

    it('registers, lists, finds, and checks component definitions by type', () => {
        const registry = new ComponentRegistry();
        const page = {
            type: 'Page',
            displayName: 'Page',
            category: 'Layout',
            propsSchema: {}
        } as const;

        registry.register(page);

        expect(registry.has('Page')).to.equal(true);
        expect(registry.has('Text')).to.equal(false);
        expect(registry.get('Page')).to.equal(page);
        expect(registry.list()).to.deep.equal([page]);
    });

    it('rejects duplicate component types', () => {
        const registry = new ComponentRegistry([
            {
                type: 'Text',
                displayName: 'Text',
                category: 'Typography',
                propsSchema: {}
            }
        ]);

        expect(() => registry.register({
            type: 'Text',
            displayName: 'Text copy',
            category: 'Typography',
            propsSchema: {}
        })).to.throw("Builder component type 'Text' is already registered.");
    });

    it('exports the initial canonical component categories', () => {
        expect(Builder_COMPONENT_CATEGORIES).to.deep.equal([
            'Layout',
            'Typography',
            'Form',
            'Navigation',
            'Feedback',
            'Data Display',
            'Overlay',
            'Media',
            'Marketing',
            'Dashboard',
            'Custom'
        ]);
        expect(isBuilderComponentCategory('Layout')).to.equal(true);
        expect(isBuilderComponentCategory('layout')).to.equal(false);
    });

    it('lists the initial canonical categories without exposing mutable state', () => {
        const registry = new ComponentRegistry();
        const categories = registry.listCategories();

        categories.pop();

        expect(registry.listCategories()).to.deep.equal(Builder_COMPONENT_CATEGORIES);
    });

    it('rejects unsupported component categories', () => {
        const registry = new ComponentRegistry();

        expect(() => registry.register({
            type: 'LegacyBox',
            displayName: 'Legacy Box',
            category: 'layout' as never,
            propsSchema: {}
        })).to.throw("Builder component category 'layout' is not supported.");
    });

    it('lists component definitions by category in registration order', () => {
        const registry = createStaticComponentRegistry([
            {
                type: 'Section',
                displayName: 'Section',
                category: 'Layout',
                propsSchema: {}
            },
            {
                type: 'Text',
                displayName: 'Text',
                category: 'Typography',
                propsSchema: {}
            },
            {
                type: 'Stack',
                displayName: 'Stack',
                category: 'Layout',
                propsSchema: {}
            }
        ]);

        expect(registry.listByCategory('Layout').map(definition => definition.type)).to.deep.equal(['Section', 'Stack']);
        expect(registry.listByCategory('unknown')).to.deep.equal([]);
    });

    it('lists, finds, categorizes, defines defaults and propsSchema, and creates default nodes for core MVP components', () => {
        const registry = createDefaultBuilderComponentRegistry();
        const expected = [
            {
                type: 'Button',
                category: 'Form',
                defaultProps: { children: 'Button', variant: 'filled', type: 'button' },
                props: ['children', 'variant', 'color', 'size', 'radius', 'fullWidth', 'disabled', 'loading', 'type']
            },
            {
                type: 'Text',
                category: 'Typography',
                defaultProps: { children: 'Text', size: 'md' },
                props: ['children', 'size', 'color', 'align', 'weight', 'italic', 'underline', 'lineClamp', 'component']
            },
            {
                type: 'Title',
                category: 'Typography',
                defaultProps: { children: 'Title', order: 2 },
                props: ['children', 'order', 'size', 'color', 'align', 'weight', 'lineClamp']
            },
            {
                type: 'Card',
                category: 'Layout',
                defaultProps: { padding: 'md', radius: 'sm', shadow: 'none', withBorder: true },
                props: ['padding', 'radius', 'shadow', 'withBorder', 'background']
            },
            {
                type: 'Stack',
                category: 'Layout',
                defaultProps: { gap: 'md', align: 'stretch' },
                props: ['gap', 'align', 'justify']
            },
            {
                type: 'Section',
                category: 'Layout',
                defaultProps: { component: 'section', paddingY: 'xl', fullWidth: true },
                props: ['component', 'padding', 'paddingY', 'paddingX', 'background', 'fullWidth', 'withBorder']
            }
        ] as const;

        const listedTypes = registry.list().map(definition => definition.type);
        expect(listedTypes).to.include.members(expected.map(definition => definition.type));

        for (const component of expected) {
            const definition = registry.get(component.type)!;
            expect(registry.has(component.type)).to.equal(true);
            expect(definition).to.not.equal(undefined);
            expect(definition.category).to.equal(component.category);
            expect(registry.listByCategory(component.category).map(item => item.type)).to.include(component.type);
            expect(definition.defaultProps).to.deep.equal(component.defaultProps);
            expect(definition.propsSchema).to.deep.include({
                type: 'object',
                additionalProperties: false
            });
            expect(Object.keys(definition.propsSchema.properties as Record<string, unknown>)).to.have.members(component.props);
            expect(registry.createDefaultNode(component.type, { id: `${component.type.toLowerCase()}-node` })).to.deep.equal({
                id: `${component.type.toLowerCase()}-node`,
                type: component.type,
                props: component.defaultProps
            });
        }
    });

    it('creates a default node from registered defaults without sharing mutable children', () => {
        const registry = new ComponentRegistry([
            {
                type: 'Card',
                displayName: 'Card',
                category: 'Layout',
                propsSchema: {},
                defaultProps: {
                    padding: 'md'
                },
                defaultChildren: [
                    {
                        id: 'card-title',
                        type: 'Text',
                        props: {
                            children: 'Title'
                        }
                    }
                ],
                slots: {
                    footer: {
                        displayName: 'Footer',
                        defaultChildren: [
                            {
                                id: 'card-action',
                                type: 'Button',
                                props: {
                                    children: 'Action'
                                }
                            }
                        ]
                    }
                }
            }
        ]);

        const node = registry.createDefaultNode('Card', {
            id: 'summary-card',
            props: {
                shadow: 'sm'
            }
        });

        expect(node).to.deep.equal({
            id: 'summary-card',
            type: 'Card',
            props: {
                padding: 'md',
                shadow: 'sm'
            },
            children: [
                {
                    id: 'card-title',
                    type: 'Text',
                    props: {
                        children: 'Title'
                    }
                }
            ],
            slots: {
                footer: [
                    {
                        id: 'card-action',
                        type: 'Button',
                        props: {
                            children: 'Action'
                        }
                    }
                ]
            }
        });

        node.children![0].props!.children = 'Changed';
        expect(registry.createDefaultNode('Card').children![0].props!.children).to.equal('Title');
    });

    it('creates a unique default node id against an existing tree', () => {
        const registry = new ComponentRegistry([
            {
                type: 'Text',
                displayName: 'Text',
                category: 'Typography',
                propsSchema: {}
            }
        ]);

        expect(registry.createDefaultNode('Text', {
            existingTree: {
                id: 'text',
                type: 'Text'
            }
        }).id).to.equal('text-2');
    });

    it('throws when creating a default node for an unknown type', () => {
        const registry = new ComponentRegistry();

        expect(() => registry.createDefaultNode('Missing')).to.throw(
            "Cannot create default Builder node because component type 'Missing' is not registered."
        );
    });

    it('exports the MVP Layout component definitions', () => {
        expect(Builder_LAYOUT_COMPONENTS.map(definition => definition.type)).to.deep.equal([
            'Page',
            'Section',
            'Container',
            'Stack',
            'Group',
            'SimpleGrid',
            'Grid',
            'Card',
            'Divider',
            'Space',
            'Box'
        ]);
        expect(Builder_LAYOUT_COMPONENTS.every(definition => definition.category === 'Layout')).to.equal(true);
    });

    it('creates a default registry with the MVP Layout components', () => {
        const registry = createDefaultBuilderComponentRegistry();

        expect(registry.listByCategory('Layout').map(definition => definition.type)).to.deep.equal([
            'Page',
            'Section',
            'Container',
            'Stack',
            'Group',
            'SimpleGrid',
            'Grid',
            'Card',
            'Divider',
            'Space',
            'Box'
        ]);
    });

    it('exports the MVP Typography component definitions', () => {
        expect(Builder_TYPOGRAPHY_COMPONENTS.map(definition => definition.type)).to.deep.equal([
            'Title',
            'Text',
            'Badge',
            'List',
            'Markdown'
        ]);
        expect(Builder_TYPOGRAPHY_COMPONENTS.every(definition => definition.category === 'Typography')).to.equal(true);
    });

    it('creates a default registry with the MVP Typography components', () => {
        const registry = createDefaultBuilderComponentRegistry();

        expect(registry.listByCategory('Typography').map(definition => definition.type)).to.deep.equal([
            'Title',
            'Text',
            'Badge',
            'List',
            'Markdown'
        ]);
    });

    it('exports the MVP Form component definitions', () => {
        expect(Builder_FORM_COMPONENTS.map(definition => definition.type)).to.deep.equal([
            'Button',
            'TextInput',
            'Textarea',
            'Select',
            'Checkbox',
            'RadioGroup',
            'NumberInput',
            'DateInput',
            'DynamicForm'
        ]);
        expect(Builder_FORM_COMPONENTS.every(definition => definition.category === 'Form')).to.equal(true);
    });

    it('creates a default registry with the MVP Form components', () => {
        const registry = createDefaultBuilderComponentRegistry();

        expect(registry.listByCategory('Form').map(definition => definition.type)).to.deep.equal([
            'Button',
            'TextInput',
            'Textarea',
            'Select',
            'Checkbox',
            'RadioGroup',
            'NumberInput',
            'DateInput',
            'DynamicForm'
        ]);
    });

    it('exports the MVP Data Display component definitions', () => {
        expect(Builder_DATA_DISPLAY_COMPONENTS.map(definition => definition.type)).to.deep.equal([
            'Table',
            'DataTable',
            'MetricCard',
            'StatCard'
        ]);
        expect(Builder_DATA_DISPLAY_COMPONENTS.every(definition => definition.category === 'Data Display')).to.equal(true);
    });

    it('creates a default registry with the MVP Data Display components', () => {
        const registry = createDefaultBuilderComponentRegistry();

        expect(registry.listByCategory('Data Display').map(definition => definition.type)).to.deep.equal([
            'Table',
            'DataTable',
            'MetricCard',
            'StatCard'
        ]);
    });

    it('exports and registers the remaining MVP component categories', () => {
        const registry = createDefaultBuilderComponentRegistry();

        expect(Builder_NAVIGATION_COMPONENTS.map(definition => definition.type)).to.deep.equal([
            'Anchor',
            'NavLink',
            'Breadcrumbs',
            'Tabs'
        ]);
        expect(Builder_NAVIGATION_COMPONENTS.every(definition => definition.category === 'Navigation')).to.equal(true);
        expect(registry.listByCategory('Navigation').map(definition => definition.type)).to.deep.equal([
            'Anchor',
            'NavLink',
            'Breadcrumbs',
            'Tabs'
        ]);

        expect(Builder_OVERLAY_COMPONENTS.map(definition => definition.type)).to.deep.equal(['Modal', 'Drawer']);
        expect(Builder_OVERLAY_COMPONENTS.every(definition => definition.category === 'Overlay')).to.equal(true);
        expect(registry.listByCategory('Overlay').map(definition => definition.type)).to.deep.equal(['Modal', 'Drawer']);

        expect(Builder_FEEDBACK_COMPONENTS.map(definition => definition.type)).to.deep.equal([
            'Alert',
            'NotificationBlock',
            'Loader'
        ]);
        expect(Builder_FEEDBACK_COMPONENTS.every(definition => definition.category === 'Feedback')).to.equal(true);
        expect(registry.listByCategory('Feedback').map(definition => definition.type)).to.deep.equal([
            'Alert',
            'NotificationBlock',
            'Loader'
        ]);

        expect(Builder_MEDIA_COMPONENTS.map(definition => definition.type)).to.deep.equal(['Image', 'Avatar', 'Icon']);
        expect(Builder_MEDIA_COMPONENTS.every(definition => definition.category === 'Media')).to.equal(true);
        expect(registry.listByCategory('Media').map(definition => definition.type)).to.deep.equal(['Image', 'Avatar', 'Icon']);

        expect(Builder_MARKETING_COMPONENTS.map(definition => definition.type)).to.deep.equal([
            'HeroSection',
            'FeatureGrid',
            'PricingSection',
            'TestimonialSection',
            'CTASection'
        ]);
        expect(Builder_MARKETING_COMPONENTS.every(definition => definition.category === 'Marketing')).to.equal(true);
        expect(registry.listByCategory('Marketing').map(definition => definition.type)).to.deep.equal([
            'HeroSection',
            'FeatureGrid',
            'PricingSection',
            'TestimonialSection',
            'CTASection'
        ]);

        expect(Builder_DASHBOARD_COMPONENTS.map(definition => definition.type)).to.deep.equal([
            'ChartPlaceholder',
            'MetricGrid',
            'DashboardHeader'
        ]);
        expect(Builder_DASHBOARD_COMPONENTS.every(definition => definition.category === 'Dashboard')).to.equal(true);
        expect(registry.listByCategory('Dashboard').map(definition => definition.type)).to.deep.equal([
            'ChartPlaceholder',
            'MetricGrid',
            'DashboardHeader'
        ]);
    });

    it('defines propsSchema, defaults, and children for representative Layout components', () => {
        const registry = createDefaultBuilderComponentRegistry();
        const section = registry.get('Section')!;
        const card = registry.get('Card')!;
        const stack = registry.get('Stack')!;

        expect(section.propsSchema).to.deep.include({
            type: 'object',
            additionalProperties: false
        });
        expect(section.defaultProps).to.deep.equal({
            component: 'section',
            paddingY: 'xl',
            fullWidth: true
        });
        expect(section.allowedChildren).to.include.members(['Container', 'Stack', 'Title', 'Text', 'Button']);

        expect(stack.defaultProps).to.deep.equal({
            gap: 'md',
            align: 'stretch'
        });
        expect(stack.allowedChildren).to.include.members(['Card', 'Divider', 'DynamicForm']);

        expect(card.defaultProps).to.deep.equal({
            padding: 'md',
            radius: 'sm',
            shadow: 'none',
            withBorder: true
        });
        expect(card.slots).to.have.keys(['header', 'footer', 'actions']);
        expect(card.slots!.actions.allowedChildren).to.deep.equal(['Button', 'Anchor', 'Group']);
    });

    it('creates default Layout nodes from registered default props', () => {
        const registry = createDefaultBuilderComponentRegistry();

        expect(registry.createDefaultNode('Card', { id: 'card' })).to.deep.equal({
            id: 'card',
            type: 'Card',
            props: {
                padding: 'md',
                radius: 'sm',
                shadow: 'none',
                withBorder: true
            }
        });
        expect(registry.createDefaultNode('SimpleGrid', { id: 'grid' }).props).to.deep.equal({
            cols: 3,
            spacing: 'md',
            verticalSpacing: 'md'
        });
    });

    it('defines propsSchema, defaults, children, and Markdown sanitization intent for Typography components', () => {
        const registry = createDefaultBuilderComponentRegistry();
        const title = registry.get('Title')!;
        const text = registry.get('Text')!;
        const list = registry.get('List')!;
        const markdown = registry.get('Markdown')!;

        expect(title.defaultProps).to.deep.equal({
            children: 'Title',
            order: 2
        });
        expect(title.allowedChildren).to.deep.equal([]);

        expect(text.defaultProps).to.deep.equal({
            children: 'Text',
            size: 'md'
        });
        expect(text.allowedChildren).to.deep.equal(['Badge', 'Icon', 'Anchor']);

        expect(list.defaultProps).to.deep.equal({
            items: ['First item', 'Second item'],
            type: 'unordered',
            spacing: 'xs'
        });
        expect(list.allowedChildren).to.deep.equal(['Text', 'Badge', 'Anchor', 'Icon']);

        expect(markdown.defaultProps).to.deep.equal({
            content: 'Markdown content',
            allowHtml: false,
            sanitize: true
        });
        expect(markdown.allowedChildren).to.deep.equal([]);
        expect(markdown.description).to.contain('Sanitized Markdown content');
        expect(markdown.propsSchema).to.deep.include({
            type: 'object',
            additionalProperties: false
        });
    });

    it('defines propsSchema, defaults, children, and permitted events for Form components', () => {
        const registry = createDefaultBuilderComponentRegistry();
        const button = registry.get('Button')!;
        const textInput = registry.get('TextInput')!;
        const select = registry.get('Select')!;
        const dynamicForm = registry.get('DynamicForm')!;

        expect(button.defaultProps).to.deep.equal({
            children: 'Button',
            variant: 'filled',
            type: 'button'
        });
        expect(button.allowedChildren).to.deep.equal([]);
        expect(button.allowedEvents).to.deep.equal(['onClick']);

        expect(textInput.defaultProps).to.deep.equal({
            name: 'text',
            label: 'Text input',
            type: 'text'
        });
        expect(textInput.allowedChildren).to.deep.equal([]);
        expect(textInput.allowedEvents).to.deep.equal(['onChange', 'onFocus', 'onBlur']);

        expect(select.defaultProps).to.deep.equal({
            name: 'select',
            label: 'Select',
            data: [
                { label: 'Option 1', value: 'option-1' },
                { label: 'Option 2', value: 'option-2' }
            ]
        });

        expect(dynamicForm.defaultProps).to.deep.equal({
            submitLabel: 'Submit',
            layout: 'vertical',
            gap: 'md'
        });
        expect(dynamicForm.allowedChildren).to.deep.equal([
            'TextInput',
            'Textarea',
            'Select',
            'Checkbox',
            'RadioGroup',
            'NumberInput',
            'DateInput',
            'Button'
        ]);
        expect(dynamicForm.allowedEvents).to.deep.equal(['onSubmit', 'onReset', 'onChange']);
        expect(dynamicForm.slots).to.have.keys(['actions']);
        expect(dynamicForm.slots!.actions.allowedChildren).to.deep.equal(['Button', 'Group']);
    });

    it('defines propsSchema, defaults, and data binding hints for Data Display components', () => {
        const registry = createDefaultBuilderComponentRegistry();
        const table = registry.get('Table')!;
        const dataTable = registry.get('DataTable')!;
        const metricCard = registry.get('MetricCard')!;
        const statCard = registry.get('StatCard')!;

        expect(table.defaultProps).to.deep.equal({
            columns: [
                { key: 'name', label: 'Name' },
                { key: 'value', label: 'Value' }
            ],
            rows: [
                { name: 'Example', value: 'Value' }
            ],
            striped: true,
            highlightOnHover: true,
            emptyText: 'No data available'
        });
        expect(table.allowedChildren).to.deep.equal([]);
        expect(table.aiHints!.dataBinding).to.contain('node.data.repeat.sourceId');

        expect(dataTable.defaultProps).to.deep.include({
            title: 'Data table',
            pageSize: 10,
            searchable: false,
            sortable: true,
            selectable: false,
            emptyText: 'No records found'
        });
        expect(dataTable.allowedChildren).to.deep.equal([]);
        expect(dataTable.aiHints!.dataBinding).to.contain('node.data.repeat.sourceId');

        expect(metricCard.defaultProps).to.deep.equal({
            label: 'Metric',
            value: '0',
            trend: 'neutral',
            color: 'blue'
        });
        expect(metricCard.allowedChildren).to.deep.equal([]);
        expect(metricCard.aiHints!.dataBinding).to.contain('node.data.fields.value');

        expect(statCard.defaultProps).to.deep.equal({
            title: 'Stat',
            value: '0',
            variant: 'default',
            metrics: []
        });
        expect(statCard.allowedChildren).to.deep.equal([]);
        expect(statCard.aiHints!.dataBinding).to.contain('node.data.fields');
    });

    it('defines representative schemas, defaults, children, and events for the remaining MVP components', () => {
        const registry = createDefaultBuilderComponentRegistry();

        expect(registry.get('Anchor')!.defaultProps).to.deep.equal({
            children: 'Link',
            href: '#',
            underline: 'hover'
        });
        expect(registry.get('Anchor')!.allowedEvents).to.deep.equal(['onClick']);

        expect(registry.get('Modal')!.defaultProps).to.deep.equal({
            title: 'Modal',
            opened: false,
            size: 'md',
            centered: true
        });
        expect(registry.get('Modal')!.slots).to.have.keys(['actions']);

        expect(registry.get('Alert')!.defaultProps).to.deep.equal({
            title: 'Alert',
            children: 'Important message',
            color: 'blue',
            variant: 'light'
        });

        expect(registry.get('Image')!.defaultProps).to.deep.equal({
            src: '',
            alt: 'Image',
            fit: 'cover'
        });

        expect(registry.get('HeroSection')!.defaultProps).to.deep.include({
            title: 'Build better interfaces',
            primaryActionLabel: 'Get started',
            align: 'left'
        });
        expect(registry.get('HeroSection')!.slots).to.have.keys(['actions', 'media']);

        expect(registry.get('MetricGrid')!.defaultProps).to.deep.equal({
            columns: 4,
            spacing: 'md'
        });
        expect(registry.get('MetricGrid')!.allowedChildren).to.deep.equal(['MetricCard', 'StatCard']);

        expect(registry.get('DashboardHeader')!.slots).to.have.keys(['actions']);
    });

    it('provides custom RJSF uiSchema for high-touch property panels', () => {
        const registry = createDefaultBuilderComponentRegistry();
        const types = ['Button', 'Title', 'Text', 'Card', 'Section', 'Image', 'Table', 'HeroSection'];

        for (const type of types) {
            expect(registry.get(type)!.uiSchema, type).to.be.an('object');
        }

        expect(registry.get('Button')!.uiSchema).to.deep.include({
            'ui:order': ['children', 'variant', 'color', 'size', 'radius', 'type', 'fullWidth', 'disabled', 'loading']
        });
        expect(registry.get('Button')!.uiSchema!.children).to.deep.include({
            'ui:title': 'Label'
        });
        expect(registry.get('Title')!.uiSchema!.order).to.deep.include({
            'ui:widget': 'select'
        });
        expect(registry.get('Text')!.uiSchema!.children).to.deep.include({
            'ui:widget': 'textarea'
        });
        expect(registry.get('Card')!.uiSchema!.shadow).to.deep.include({
            'ui:widget': 'select'
        });
        expect(registry.get('Section')!.uiSchema!.component).to.deep.include({
            'ui:widget': 'select'
        });
        expect(registry.get('Image')!.uiSchema!.src).to.deep.include({
            'ui:widget': 'uri'
        });
        expect(registry.get('Table')!.uiSchema!.columns).to.deep.include({
            'ui:options': {
                orderable: true,
                addable: true,
                removable: true
            }
        });
        expect(registry.get('HeroSection')!.uiSchema!.subtitle).to.deep.include({
            'ui:widget': 'textarea'
        });
    });
});

describe('DataSourceRegistry', () => {

    it('registers, lists, finds, and checks data source definitions by type', () => {
        const registry = new DataSourceRegistry();
        const staticDefinition = Builder_DATA_SOURCE_DEFINITIONS[0];

        registry.register(staticDefinition);

        expect(registry.has('static')).to.equal(true);
        expect(registry.has('http')).to.equal(false);
        expect(registry.get('static')).to.equal(staticDefinition);
        expect(registry.list()).to.deep.equal([staticDefinition]);
    });

    it('rejects duplicate data source types', () => {
        const registry = createStaticDataSourceRegistry([Builder_DATA_SOURCE_DEFINITIONS[0]]);

        expect(() => (registry as DataSourceRegistry).register(Builder_DATA_SOURCE_DEFINITIONS[0]))
            .to.throw("Builder data source type 'static' is already registered.");
    });

    it('creates default MVP static and mock data sources', () => {
        const registry = createDefaultBuilderDataSourceRegistry();

        expect(registry.createDefaultDataSource('static')).to.deep.equal({
            type: 'static',
            config: {
                data: []
            }
        });
        expect(registry.createDefaultDataSource('mock', {
            description: 'Preview rows',
            config: {
                data: [{ name: 'Ada' }],
                scenario: 'happy-path'
            }
        })).to.deep.equal({
            type: 'mock',
            description: 'Preview rows',
            config: {
                data: [{ name: 'Ada' }],
                scenario: 'happy-path'
            }
        });
    });

    it('includes future http and graphql contracts without making them MVP sources', () => {
        const registry = createDefaultBuilderDataSourceRegistry();

        expect(registry.list().map(definition => [definition.type, definition.status])).to.deep.equal([
            ['static', 'mvp'],
            ['mock', 'mvp'],
            ['http', 'future'],
            ['graphql', 'future']
        ]);
    });

    it('validates data source configs against the registered schemas', () => {
        const registry = createDefaultBuilderDataSourceRegistry();

        expect(validateBuilderDocumentDataSourcesAgainstRegistry({
            schemaVersion: '1.0.0',
            metadata: { id: 'page', name: 'Page' },
            page: { id: 'page', title: 'Page' },
            tree: { id: 'root', type: 'Page' },
            dataSources: {
                rows: {
                    type: 'static',
                    config: {
                        data: [{ id: 1 }]
                    }
                },
                preview: {
                    type: 'mock',
                    config: {
                        data: [],
                        seed: 'stable'
                    }
                }
            }
        }, registry)).to.deep.equal({
            valid: true,
            errors: []
        });

        expect(validateBuilderDocumentDataSourcesAgainstRegistry({
            schemaVersion: '1.0.0',
            metadata: { id: 'page', name: 'Page' },
            page: { id: 'page', title: 'Page' },
            tree: { id: 'root', type: 'Page' },
            dataSources: {
                rows: {
                    type: 'static',
                    config: {
                        unexpected: true
                    }
                },
                remote: {
                    type: 'unknown',
                    config: {}
                }
            }
        }, registry)).to.deep.equal({
            valid: false,
            errors: [
                {
                    path: 'dataSources.rows.config.data',
                    message: "Missing required config 'data' for data source 'rows'.",
                    dataSourceId: 'rows',
                    dataSourceType: 'static'
                },
                {
                    path: 'dataSources.rows.config.unexpected',
                    message: "Unknown config 'unexpected' for data source 'rows'.",
                    dataSourceId: 'rows',
                    dataSourceType: 'static'
                },
                {
                    path: 'dataSources.remote.type',
                    message: "Unknown Builder data source type 'unknown'. Register it in DataSourceRegistry before use.",
                    dataSourceId: 'remote',
                    dataSourceType: 'unknown'
                }
            ]
        });
    });
});

describe('ActionRegistry', () => {

    it('registers, lists, finds, and checks action definitions by type', () => {
        const registry = new ActionRegistry();
        const navigate = Builder_ACTION_DEFINITIONS[0];

        registry.register(navigate);

        expect(registry.has('navigate')).to.equal(true);
        expect(registry.has('openModal')).to.equal(false);
        expect(registry.get('navigate')).to.equal(navigate);
        expect(registry.list()).to.deep.equal([navigate]);
    });

    it('rejects duplicate action types', () => {
        const registry = createStaticActionRegistry([Builder_ACTION_DEFINITIONS[0]]);

        expect(() => (registry as ActionRegistry).register(Builder_ACTION_DEFINITIONS[0]))
            .to.throw("Builder action type 'navigate' is already registered.");
    });

    it('includes the initial MVP action contracts in order', () => {
        const registry = createDefaultBuilderActionRegistry();

        expect(registry.list().map(definition => [definition.type, definition.status])).to.deep.equal([
            ['navigate', 'mvp'],
            ['openModal', 'mvp'],
            ['closeModal', 'mvp'],
            ['toggleState', 'mvp'],
            ['setState', 'mvp'],
            ['submitForm', 'mvp'],
            ['callApi', 'mvp'],
            ['showNotification', 'mvp']
        ]);
    });

    it('creates default actions from registered default params', () => {
        const registry = createDefaultBuilderActionRegistry();

        expect(registry.createDefaultAction('navigate', {
            description: 'Go home',
            params: {
                to: '/home',
                replace: true
            }
        })).to.deep.equal({
            type: 'navigate',
            description: 'Go home',
            params: {
                to: '/home',
                target: 'self',
                replace: true
            }
        });

        expect(registry.createDefaultAction('openModal', {
            params: {
                modalId: 'details'
            }
        })).to.deep.equal({
            type: 'openModal',
            params: {
                modalId: 'details'
            }
        });
    });

    it('throws when creating a default action for an unknown type', () => {
        const registry = createDefaultBuilderActionRegistry();

        expect(() => registry.createDefaultAction('missing')).to.throw(
            "Cannot create default Builder action because type 'missing' is not registered."
        );
    });

    it('validates document actions against registered params schemas', () => {
        const registry = createDefaultBuilderActionRegistry();

        expect(validateBuilderDocumentActionsAgainstRegistry({
            schemaVersion: '1.0.0',
            metadata: { id: 'page', name: 'Page' },
            page: { id: 'page', title: 'Page' },
            tree: { id: 'root', type: 'Page' },
            actions: {
                goHome: {
                    type: 'navigate',
                    params: {
                        to: '/home',
                        target: 'self'
                    }
                },
                notify: {
                    type: 'showNotification',
                    params: {
                        message: 'Saved',
                        variant: 'success'
                    }
                }
            }
        }, registry)).to.deep.equal({
            valid: true,
            errors: []
        });

        expect(validateBuilderDocumentActionsAgainstRegistry({
            schemaVersion: '1.0.0',
            metadata: { id: 'page', name: 'Page' },
            page: { id: 'page', title: 'Page' },
            tree: { id: 'root', type: 'Page' },
            actions: {
                goHome: {
                    type: 'navigate',
                    params: {
                        target: 'popup',
                        unsafe: true
                    }
                },
                custom: {
                    type: 'unknown',
                    params: {}
                }
            }
        }, registry)).to.deep.equal({
            valid: false,
            errors: [
                {
                    path: 'actions.goHome.params.to',
                    message: "Missing required param 'to' for action 'goHome'.",
                    actionId: 'goHome',
                    actionType: 'navigate'
                },
                {
                    path: 'actions.goHome.params.target',
                    message: "Invalid params value for action 'goHome': expected one of self, blank.",
                    actionId: 'goHome',
                    actionType: 'navigate'
                },
                {
                    path: 'actions.goHome.params.unsafe',
                    message: "Unknown param 'unsafe' for action 'goHome'.",
                    actionId: 'goHome',
                    actionType: 'navigate'
                },
                {
                    path: 'actions.custom.type',
                    message: "Unknown Builder action type 'unknown'. Register it in ActionRegistry before use.",
                    actionId: 'custom',
                    actionType: 'unknown'
                }
            ]
        });
    });
});

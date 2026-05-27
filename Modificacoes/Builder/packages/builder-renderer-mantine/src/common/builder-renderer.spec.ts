import { expect } from 'chai';
import * as React from 'react';
import { createDefaultBuilderComponentRegistry } from '@cybervinci/builder-registry';
import { createBuilderDocument, type BuilderDocument } from '@cybervinci/builder-schema';
import {
    createBuilderMantineDashboardComponents,
    createBuilderMantineDataDisplayComponents,
    createBuilderMantineFeedbackComponents,
    createBuilderMantineFormComponents,
    createBuilderMantineLayoutComponents,
    createBuilderMantineMarketingComponents,
    createBuilderMantineMediaComponents,
    createBuilderMantineNavigationComponents,
    createBuilderMantineOverlayComponents,
    createBuilderMantineTypographyComponents,
    createNoopBuilderActionService,
    createSafeBuilderDataService,
    BuilderRenderError,
    BuilderRenderer,
    renderBuilderDocument
} from './index';

describe('BuilderRenderer', () => {

    const registry = createDefaultBuilderComponentRegistry();

    it('renders the Builder tree through registered component adapters', () => {
        const document = createBuilderDocument({ id: 'renderer-test', title: 'Renderer test' });
        document.tree.children = [
            {
                id: 'title',
                type: 'Title',
                props: {
                    children: 'Hello Builder'
                }
            }
        ];

        const rendered = renderBuilderDocument({ document }, {
            registry,
            components: {
                Page: 'main',
                Title: 'h1'
            }
        });
        const page = onlyChild(rendered);
        const title = onlyChild(page);

        expect(page.type).to.equal('main');
        expect(page.props['data-builder-node-id']).to.equal('renderer-test-root');
        expect(title.type).to.equal('h1');
        expect(title.props.children).to.equal('Hello Builder');
    });

    it('wraps preview output in a MantineProvider using the Builder theme adapter', () => {
        const document = createBuilderDocument({ id: 'theme-preview-test', title: 'Theme preview' });
        document.theme = {
            mode: 'dark',
            primaryColor: 'brand',
            radius: 'none',
            fontFamily: 'Inter, sans-serif',
            spacing: {
                md: 20
            },
            tokens: {
                colors: {
                    brand: [
                        '#f0f7ff',
                        '#ddecff',
                        '#bddbff',
                        '#8cc4ff',
                        '#5badfa',
                        '#2d94ee',
                        '#177bd3',
                        '#0d60a8',
                        '#094b84',
                        '#073966'
                    ]
                }
            }
        };

        const rendered = renderBuilderDocument({ document }, {
            registry,
            MantineProvider: 'mantine-provider',
            components: {
                Page: 'main'
            }
        });
        const provider = onlyChild(rendered);
        const page = onlyChild(provider);

        expect(provider.type).to.equal('mantine-provider');
        expect(provider.props.defaultColorScheme).to.equal('dark');
        expect(provider.props.theme).to.deep.equal({
            primaryColor: 'brand',
            defaultRadius: 0,
            fontFamily: 'Inter, sans-serif',
            spacing: {
                md: 20
            },
            colors: {
                brand: [
                    '#f0f7ff',
                    '#ddecff',
                    '#bddbff',
                    '#8cc4ff',
                    '#5badfa',
                    '#2d94ee',
                    '#177bd3',
                    '#0d60a8',
                    '#094b84',
                    '#073966'
                ]
            }
        });
        expect(page.type).to.equal('main');
        expect(page.props['data-builder-node-id']).to.equal('theme-preview-test-root');
    });

    it('renders a friendly fallback for unknown components', () => {
        const document = createBuilderDocument({ id: 'unknown-test' });
        document.tree.children = [
            {
                id: 'custom',
                type: 'CustomPremiumWidget'
            }
        ];

        const rendered = renderBuilderDocument({ document }, { registry });
        const page = onlyChild(rendered);
        const unknown = onlyChild(page);

        expect(unknown.type).to.equal('div');
        expect(unknown.props['data-builder-unknown-type']).to.equal('CustomPremiumWidget');
        expect(unknown.props.children).to.contain('Unknown Builder component type');
    });

    it('rejects oversized or too-deep documents before recursive rendering', () => {
        const document = createBuilderDocument({ id: 'deep-render-test' });
        document.tree.children = [createDeepNodeTree(8)];

        expect(() => renderBuilderDocument({ document }, {
            registry,
            structureLimits: {
                maxTreeDepth: 4
            }
        })).to.throw(BuilderRenderError, 'Cannot render invalid or oversized Builder document.');
    });

    it('can intentionally bypass structural validation for trusted renderer tests', () => {
        const document = createBuilderDocument({ id: 'trusted-render-test' });
        document.tree.children = [createDeepNodeTree(3)];

        const rendered = renderBuilderDocument({ document }, {
            registry,
            validateStructure: false,
            components: {
                Page: 'main',
                Box: 'div'
            }
        });

        expect(onlyChild(rendered).type).to.equal('main');
    });

    it('wires node events to registered document actions', () => {
        const document: BuilderDocument = createBuilderDocument({ id: 'event-test' });
        document.actions = {
            primary: {
                type: 'navigate',
                params: {
                    to: '/before'
                }
            }
        };
        document.tree.children = [
            {
                id: 'cta',
                type: 'Button',
                props: {
                    children: 'Open'
                },
                events: {
                    onClick: {
                        actionId: 'primary',
                        params: {
                            to: '/after'
                        },
                        preventDefault: true
                    }
                }
            }
        ];
        const calls: Array<{ actionId: string; params?: Record<string, unknown>; nodeId?: string }> = [];
        let prevented = false;

        const rendered = BuilderRenderer({
            document,
            registry,
            onAction: (actionId, params, context) => calls.push({ actionId, params, nodeId: context?.node.id })
        });
        const page = onlyChild(rendered);
        const button = onlyChild(page);

        button.props.onClick({ preventDefault: () => { prevented = true; } });

        expect(prevented).to.equal(true);
        expect(calls).to.deep.equal([
            {
                actionId: 'primary',
                params: {
                    to: '/after'
                },
                nodeId: 'cta'
            }
        ]);
    });

    it('provides a safe noop action service stub for pages with events', () => {
        const document: BuilderDocument = createBuilderDocument({ id: 'noop-action-test' });
        document.actions = {
            open: {
                type: 'navigate',
                params: {
                    to: '/target',
                    target: 'self'
                }
            }
        };
        document.tree.children = [
            {
                id: 'cta',
                type: 'Button',
                props: { children: 'Open' },
                events: { onClick: { actionId: 'open' } }
            }
        ];
        const results: unknown[] = [];

        const rendered = renderBuilderDocument({ document }, {
            registry,
            actionService: {
                execute: (actionId, params, context) => {
                    const result = createNoopBuilderActionService().execute(actionId, params, context);
                    results.push(result);
                    return result;
                }
            },
            components: {
                Page: 'main',
                Button: 'button'
            }
        });
        const page = onlyChild(rendered);
        const button = onlyChild(page);

        button.props.onClick();

        expect(results).to.deep.equal([{
            handled: false,
            actionId: 'open',
            actionType: 'navigate',
            params: {
                to: '/target',
                target: 'self'
            },
            reason: 'No Builder action service is registered for the renderer.'
        }]);
    });

    it('shares preview node clicks with the editor selection state without dropping actions', () => {
        const document: BuilderDocument = createBuilderDocument({ id: 'selection-test' });
        document.actions = {
            clicked: { type: 'navigate', params: { to: '/selected' } }
        };
        document.tree.children = [
            {
                id: 'cta',
                type: 'Button',
                props: { children: 'Select me' },
                events: {
                    onClick: { actionId: 'clicked' }
                }
            }
        ];
        const selected: string[] = [];
        const actions: string[] = [];
        let stopped = false;

        const rendered = renderBuilderDocument({
            document,
            selectedNodeId: 'cta',
            onSelectNode: nodeId => selected.push(nodeId),
            onAction: actionId => actions.push(actionId)
        }, {
            registry,
            components: {
                Page: 'main',
                Button: 'button'
            }
        });
        const page = onlyChild(rendered);
        const button = onlyChild(page);

        expect(button.props['data-builder-selected']).to.equal('true');

        button.props.onClick({ stopPropagation: () => { stopped = true; } });

        expect(actions).to.deep.equal(['clicked']);
        expect(selected).to.deep.equal(['cta']);
        expect(stopped).to.equal(true);
    });

    it('resolves registry defaults, data binding fields, children, and named slots recursively', () => {
        const document = createBuilderDocument({ id: 'data-test' });
        document.dataSources = {
            stats: {
                type: 'static',
                config: {
                    data: {
                        title: 'Revenue',
                        value: 42
                    }
                }
            }
        };
        document.tree.children = [
            {
                id: 'card',
                type: 'MetricCard',
                data: {
                    sourceId: 'stats',
                    fields: {
                        value: { path: 'value' }
                    }
                },
                children: [
                    {
                        id: 'body',
                        type: 'Text',
                        props: { children: 'Body' }
                    }
                ],
                slots: {
                    header: [
                        {
                            id: 'header',
                            type: 'Title',
                            data: {
                                sourceId: 'stats',
                                path: 'title'
                            }
                        }
                    ]
                }
            }
        ];

        const rendered = renderBuilderDocument({ document }, { registry });
        const page = onlyChild(rendered);
        const card = onlyChild(page);
        const [body, header] = React.Children.toArray(card.props.children) as React.ReactElement[];

        expect(card.props.value).to.equal(42);
        expect(card.props.label).to.equal('Metric');
        expect(body.props.children).to.equal('Body');
        expect(header.props.data).to.equal('Revenue');
    });

    it('provides a safe data service stub and does not fetch remote dataSources', () => {
        const document = createBuilderDocument({ id: 'safe-data-service-test' });
        document.dataSources = {
            remote: {
                type: 'http',
                config: {
                    url: 'https://example.com/api'
                }
            }
        };
        document.tree.children = [
            {
                id: 'metric',
                type: 'MetricCard',
                data: {
                    sourceId: 'remote',
                    fields: {
                        value: { path: 'value', fallback: 'offline' }
                    }
                }
            }
        ];
        const service = createSafeBuilderDataService();
        const resolution = service.resolveNodeDataBinding(document, document.tree.children[0]);

        const rendered = renderBuilderDocument({ document, dataService: service }, { registry });
        const page = onlyChild(rendered);
        const metric = onlyChild(page);

        expect(resolution.errors.map(error => error.message)).to.deep.equal([
            "Builder data binding can resolve only static or mock dataSources in the MVP, received 'http'."
        ]);
        expect(metric.props.value).to.equal('0');
        expect(metric.props.data).to.equal(undefined);
    });

    it('renders repeated nodes from mock data bindings without using mock data as canonical children', () => {
        const document = createBuilderDocument({ id: 'mock-data-test' });
        document.dataSources = {
            leads: {
                type: 'mock',
                config: {
                    data: {
                        rows: [
                            { name: 'Ada', plan: 'Pro' },
                            { name: 'Grace', plan: 'Team' },
                            { name: 'Linus', plan: 'Free' }
                        ]
                    }
                }
            }
        };
        document.tree.children = [
            {
                id: 'lead-row',
                type: 'Text',
                props: {
                    children: 'Lead'
                },
                data: {
                    sourceId: 'leads',
                    path: 'rows',
                    repeat: {
                        sourceId: 'leads',
                        limit: 2
                    }
                }
            }
        ];

        const rendered = renderBuilderDocument({ document }, { registry, components: { Page: 'main', Text: 'p' } });
        const page = onlyChild(rendered);
        const rows = React.Children.toArray(page.props.children) as React.ReactElement[];

        expect(rows.map(row => row.props['data-builder-node-id'])).to.deep.equal(['lead-row-0', 'lead-row-1']);
        expect(rows.map(row => row.props.item)).to.deep.equal([
            { name: 'Ada', plan: 'Pro' },
            { name: 'Grace', plan: 'Team' }
        ]);
        expect(rows.map(row => row.props.index)).to.deep.equal([0, 1]);
        expect(rows.map(row => row.props.children)).to.deep.equal(['Lead', 'Lead']);
    });

    it('passes declared named slots as component props without duplicating them as children', () => {
        const document = createBuilderDocument({ id: 'named-slots-test' });
        document.tree.children = [
            {
                id: 'button',
                type: 'Button',
                props: {
                    children: 'Search'
                },
                slots: {
                    leftSection: [
                        { id: 'search-icon', type: 'Icon', props: { name: 'search' } }
                    ],
                    rightSection: [
                        { id: 'shortcut', type: 'Badge', props: { children: 'K' } }
                    ]
                }
            }
        ];

        const rendered = renderBuilderDocument({ document }, { registry, components: { Button: 'button', Icon: 'span', Badge: 'strong' } });
        const page = onlyChild(rendered);
        const button = onlyChild(page);
        const leftSection = React.Children.toArray(button.props.leftSection)[0] as React.ReactElement;
        const rightSection = React.Children.toArray(button.props.rightSection)[0] as React.ReactElement;

        expect(button.props.children).to.equal('Search');
        expect(leftSection.props['data-builder-node-id']).to.equal('search-icon');
        expect(rightSection.props['data-builder-node-id']).to.equal('shortcut');
    });

    it('filters nodes with visibility conditions and permission rules', () => {
        const document = createBuilderDocument({ id: 'filter-test' });
        document.tree.children = [
            {
                id: 'visible',
                type: 'Text',
                props: { children: 'Visible' },
                visibility: {
                    condition: {
                        source: 'state',
                        ref: 'showMarketing',
                        operator: 'equals',
                        value: true
                    }
                },
                permissions: [
                    {
                        effect: 'allow',
                        permissions: ['marketing.read']
                    }
                ]
            },
            {
                id: 'hidden',
                type: 'Text',
                props: { children: 'Hidden' },
                permissions: [
                    {
                        effect: 'deny',
                        roles: ['guest']
                    }
                ]
            }
        ];

        const rendered = renderBuilderDocument({
            document,
            runtime: {
                states: { showMarketing: true },
                permissions: {
                    roles: ['guest'],
                    permissions: ['marketing.read']
                }
            }
        }, { registry });
        const page = onlyChild(rendered);
        const children = React.Children.toArray(page.props.children) as React.ReactElement[];

        expect(children.map(child => child.props['data-builder-node-id'])).to.deep.equal(['visible']);
    });

    it('provides Mantine adapters for every MVP layout component', () => {
        const components = createBuilderMantineLayoutComponents({
            Box: 'mantine-box',
            Card: 'mantine-card',
            Container: 'mantine-container',
            Divider: 'mantine-divider',
            Grid: 'mantine-grid',
            Group: 'mantine-group',
            SimpleGrid: 'mantine-simple-grid',
            Space: 'mantine-space',
            Stack: 'mantine-stack'
        });

        expect(Object.keys(components).sort()).to.deep.equal([
            'Box',
            'Card',
            'Container',
            'Divider',
            'Grid',
            'Group',
            'Page',
            'Section',
            'SimpleGrid',
            'Space',
            'Stack'
        ]);

        const page = renderAdapter(components.Page, { background: 'gray.0', fullWidth: true });
        const section = renderAdapter(components.Section, { component: 'header', paddingY: 'xl', paddingX: 'md', background: 'blue.0' });
        const container = renderAdapter(components.Container, { size: 'fluid', padding: 'lg' });
        const stack = renderAdapter(components.Stack, { gap: 'sm', align: 'center' });
        const group = renderAdapter(components.Group, { gap: 'xs', wrap: false });
        const simpleGrid = renderAdapter(components.SimpleGrid, { cols: 3, spacing: 'md' });
        const grid = renderAdapter(components.Grid, { columns: 12, gutter: 'lg', span: 6 });
        const card = renderAdapter(components.Card, { padding: 'xl', background: 'white' });
        const divider = renderAdapter(components.Divider, { label: 'Details', variant: 'dashed' });
        const space = renderAdapter(components.Space, { size: 'xl' });
        const box = renderAdapter(components.Box, { component: 'aside', padding: 'sm', margin: 'md', background: 'gray.1' });

        expect(page.type).to.equal('mantine-box');
        expect(page.props.component).to.equal('main');
        expect(page.props.bg).to.equal('gray.0');
        expect(page.props.style).to.deep.equal({ width: '100%' });
        expect(section.type).to.equal('mantine-box');
        expect(section.props.component).to.equal('header');
        expect(section.props.py).to.equal('xl');
        expect(section.props.px).to.equal('md');
        expect(section.props.bg).to.equal('blue.0');
        expect(container.type).to.equal('mantine-container');
        expect(container.props.fluid).to.equal(true);
        expect(container.props.p).to.equal('lg');
        expect(container.props.size).to.equal(undefined);
        expect(stack.type).to.equal('mantine-stack');
        expect(stack.props.gap).to.equal('sm');
        expect(group.type).to.equal('mantine-group');
        expect(group.props.wrap).to.equal('nowrap');
        expect(simpleGrid.type).to.equal('mantine-simple-grid');
        expect(simpleGrid.props.cols).to.equal(3);
        expect(grid.type).to.equal('mantine-grid');
        expect(grid.props.columns).to.equal(12);
        expect(grid.props.span).to.equal(6);
        expect(card.type).to.equal('mantine-card');
        expect(card.props.bg).to.equal('white');
        expect(divider.type).to.equal('mantine-divider');
        expect(divider.props.label).to.equal('Details');
        expect(space.type).to.equal('mantine-space');
        expect(space.props.h).to.equal('xl');
        expect(box.type).to.equal('mantine-box');
        expect(box.props.component).to.equal('aside');
        expect(box.props.p).to.equal('sm');
        expect(box.props.m).to.equal('md');
        expect(box.props.bg).to.equal('gray.1');
    });

    it('provides Mantine adapters for every MVP typography component', () => {
        const components = createBuilderMantineTypographyComponents({
            Title: 'mantine-title',
            Text: 'mantine-text',
            Badge: 'mantine-badge',
            List: 'mantine-list',
            ListItem: 'mantine-list-item',
            TypographyStylesProvider: 'mantine-typography'
        });

        expect(Object.keys(components).sort()).to.deep.equal([
            'Badge',
            'List',
            'Markdown',
            'Text',
            'Title'
        ]);

        const title = renderAdapter(components.Title, { children: 'Heading', order: 1, align: 'center', weight: 700 });
        const text = renderAdapter(components.Text, { children: 'Body', component: 'span', align: 'right', weight: 500 });
        const badge = renderAdapter(components.Badge, { children: 'Live', color: 'green', variant: 'light' });
        const list = renderAdapter(components.List, { items: ['One', 'Two'], type: 'ordered' });

        expect(title.type).to.equal('mantine-title');
        expect(title.props.ta).to.equal('center');
        expect(title.props.fw).to.equal(700);
        expect(text.type).to.equal('mantine-text');
        expect(text.props.component).to.equal('span');
        expect(text.props.ta).to.equal('right');
        expect(badge.type).to.equal('mantine-badge');
        expect(badge.props.color).to.equal('green');
        expect(list.type).to.equal('mantine-list');
        expect(list.props.type).to.equal('ordered');
        expect(list.props.component).to.equal('ol');
        const items = React.Children.toArray(list.props.children) as React.ReactElement[];
        expect(items.map(item => item.type)).to.deep.equal(['mantine-list-item', 'mantine-list-item']);
        expect(items.map(item => item.props.children)).to.deep.equal(['One', 'Two']);
    });

    it('renders sanitized Markdown without unsafe scripts, handlers, or URLs', () => {
        const components = createBuilderMantineTypographyComponents();
        const markdown = renderAdapter(components.Markdown, {
            content: '# Hello\n\nVisit [safe](/docs) [bad](javascript:alert(1))\n\n<a href="java&#x73;cript:alert(1)" onclick="alert(1)" title="<bad>">bad html link</a>\n\n<script>alert(1)</script><img src="javascript:alert(1)" onerror="alert(1)">',
            allowHtml: true,
            sanitize: true,
            linkTarget: '_blank'
        });

        const html = markdown.props.dangerouslySetInnerHTML.__html;

        expect(markdown.type).to.equal('div');
        expect(html).to.contain('<h1>Hello</h1>');
        expect(html).to.contain('<a href="/docs" target="_blank" rel="noopener noreferrer">safe</a>');
        expect(html).to.contain('<a href="#" title="&lt;bad&gt;" target="_blank" rel="noopener noreferrer">bad html link</a>');
        expect(html).to.contain('bad');
        expect(html).not.to.contain('javascript:');
        expect(html).not.to.contain('<script');
        expect(html).not.to.contain('<img');
        expect(html).not.to.contain('onerror');
        expect(html).not.to.contain('onclick');
    });

    it('provides Mantine adapters for every MVP Form component and keeps events action-bound', () => {
        const components = createBuilderMantineFormComponents({
            Button: 'mantine-button',
            TextInput: 'mantine-text-input',
            Textarea: 'mantine-textarea',
            Select: 'mantine-select',
            Checkbox: 'mantine-checkbox',
            RadioGroup: 'mantine-radio-group',
            Radio: 'mantine-radio',
            NumberInput: 'mantine-number-input',
            DateInput: 'mantine-date-input',
            DynamicForm: 'mantine-form',
            Stack: 'mantine-stack',
            Group: 'mantine-group'
        });

        expect(Object.keys(components).sort()).to.deep.equal([
            'Button',
            'Checkbox',
            'DateInput',
            'DynamicForm',
            'NumberInput',
            'RadioGroup',
            'Select',
            'TextInput',
            'Textarea'
        ]);

        const button = renderAdapter(components.Button, { children: 'Save', variant: 'light' });
        const textInput = renderAdapter(components.TextInput, { label: 'Email', children: 'Email', type: 'email' });
        const textarea = renderAdapter(components.Textarea, { label: 'Bio', minRows: 4, children: 'Bio' });
        const select = renderAdapter(components.Select, { data: [{ label: 'Admin', value: 'admin' }], clearable: true });
        const checkbox = renderAdapter(components.Checkbox, { label: 'Accept', defaultChecked: true });
        const radioGroup = renderAdapter(components.RadioGroup, { name: 'role', data: [{ label: 'User', value: 'user' }] });
        const numberInput = renderAdapter(components.NumberInput, { label: 'Amount', step: 2 });
        const dateInput = renderAdapter(components.DateInput, { label: 'Due', minDate: '2026-01-01', maxDate: '2026-12-31' });
        const dynamicForm = renderAdapter(components.DynamicForm, { layout: 'horizontal', gap: 'sm', children: React.createElement('span') });

        expect(button.type).to.equal('mantine-button');
        expect(button.props.children).to.equal('Save');
        expect(button.props.type).to.equal('button');
        expect(textInput.type).to.equal('mantine-text-input');
        expect(textInput.props.type).to.equal('email');
        expect(textInput.props['aria-label']).to.equal('Email');
        expect(textInput.props.children).to.equal(undefined);
        expect(textarea.type).to.equal('mantine-textarea');
        expect(textarea.props.minRows).to.equal(4);
        expect(select.type).to.equal('mantine-select');
        expect(select.props.data).to.deep.equal([{ label: 'Admin', value: 'admin' }]);
        expect(checkbox.type).to.equal('mantine-checkbox');
        expect(checkbox.props.type).to.equal('checkbox');
        expect(radioGroup.type).to.equal('mantine-radio-group');
        expect(React.Children.toArray(radioGroup.props.children).map(child => (child as React.ReactElement).type)).to.deep.equal(['mantine-radio']);
        expect(numberInput.type).to.equal('mantine-number-input');
        expect(numberInput.props.type).to.equal('number');
        expect(dateInput.type).to.equal('mantine-date-input');
        expect(dateInput.props.min).to.equal('2026-01-01');
        expect(dateInput.props.max).to.equal('2026-12-31');
        expect(dynamicForm.type).to.equal('mantine-form');
        expect((React.Children.toArray(dynamicForm.props.children)[0] as React.ReactElement).type).to.equal('mantine-group');

        const nativeTextInput = renderAdapter(createBuilderMantineFormComponents().TextInput, {
            id: 'email',
            label: 'Email',
            error: 'Email is required'
        });
        expect(nativeTextInput.type).to.equal('label');
        const nativeInput = React.Children.toArray(nativeTextInput.props.children)[1] as React.ReactElement;
        const nativeError = React.Children.toArray(nativeTextInput.props.children)[2] as React.ReactElement;
        expect(nativeInput.type).to.equal('input');
        expect(nativeInput.props['aria-label']).to.equal('Email');
        expect(nativeInput.props['aria-invalid']).to.equal(true);
        expect(nativeInput.props['aria-errormessage']).to.equal('email-error');
        expect(nativeError.props.role).to.equal('alert');

        const document = createBuilderDocument({ id: 'form-events' });
        document.actions = {
            submit: { type: 'submitForm', params: { formId: 'lead' } },
            changed: { type: 'submitForm', params: { field: 'email' } },
            clicked: { type: 'navigate', params: { to: '/done' } }
        };
        document.tree.children = [
            {
                id: 'lead-form',
                type: 'DynamicForm',
                events: { onSubmit: { actionId: 'submit', preventDefault: true } },
                children: [
                    {
                        id: 'email',
                        type: 'TextInput',
                        events: { onChange: { actionId: 'changed', params: { value: 'new' } } }
                    },
                    {
                        id: 'save',
                        type: 'Button',
                        props: { children: 'Save' },
                        events: { onClick: { actionId: 'clicked' } }
                    }
                ]
            }
        ];
        const calls: Array<{ actionId: string; params?: Record<string, unknown>; nodeId?: string; eventName?: string }> = [];
        let prevented = false;
        const rendered = BuilderRenderer({
            document,
            registry,
            onAction: (actionId, params, context) => calls.push({ actionId, params, nodeId: context?.node.id, eventName: context?.eventName })
        });
        const page = onlyChild(rendered);
        const form = onlyChild(page);
        const [email, save] = React.Children.toArray(form.props.children) as React.ReactElement[];

        form.props.onSubmit({ preventDefault: () => { prevented = true; } });
        email.props.onChange();
        save.props.onClick();

        expect(prevented).to.equal(true);
        expect(calls).to.deep.equal([
            { actionId: 'submit', params: { formId: 'lead' }, nodeId: 'lead-form', eventName: 'onSubmit' },
            { actionId: 'changed', params: { field: 'email', value: 'new' }, nodeId: 'email', eventName: 'onChange' },
            { actionId: 'clicked', params: { to: '/done' }, nodeId: 'save', eventName: 'onClick' }
        ]);
    });

    it('provides Mantine adapters for MVP data display components', () => {
        const components = createBuilderMantineDataDisplayComponents({
            Table: 'mantine-table',
            DataTable: 'mantine-data-table',
            Card: 'mantine-card',
            Text: 'mantine-text',
            Title: 'mantine-title',
            Badge: 'mantine-badge'
        });

        expect(Object.keys(components).sort()).to.deep.equal(['DataTable', 'MetricCard', 'StatCard', 'Table']);

        const table = renderAdapter(components.Table, { columns: [{ key: 'name', label: 'Name' }], rows: [{ name: 'Ada' }] });
        const dataTable = renderAdapter(components.DataTable, { title: 'Users', columns: [{ key: 'name', label: 'Name' }], rows: [{ name: 'Ada' }] });
        const metric = renderAdapter(components.MetricCard, { label: 'Revenue', value: '$10k', trendLabel: 'Up' });
        const stat = renderAdapter(components.StatCard, { title: 'Orders', value: 12, metrics: [{ label: 'Open', value: 3 }] });

        expect(table.type).to.equal('mantine-table');
        expect((React.Children.toArray(table.props.children)[0] as React.ReactElement).type).to.equal('thead');
        expect(dataTable.type).to.equal('section');
        expect((React.Children.toArray(dataTable.props.children)[1] as React.ReactElement).type).to.equal('mantine-data-table');
        expect(metric.type).to.equal('mantine-card');
        expect((React.Children.toArray(metric.props.children)[1] as React.ReactElement).type).to.equal('mantine-title');
        expect(stat.type).to.equal('mantine-card');
        expect((React.Children.toArray(stat.props.children)[2] as React.ReactElement).type).to.equal('mantine-badge');
    });

    it('provides Mantine adapters for MVP navigation, overlay, feedback, and media components', () => {
        const navigation = createBuilderMantineNavigationComponents({
            Anchor: 'mantine-anchor',
            NavLink: 'mantine-nav-link',
            Breadcrumbs: 'mantine-breadcrumbs',
            Tabs: 'mantine-tabs',
            TabsList: 'mantine-tabs-list',
            TabsTab: 'mantine-tabs-tab'
        });
        const overlay = createBuilderMantineOverlayComponents({ Modal: 'mantine-modal', Drawer: 'mantine-drawer', Group: 'mantine-group' });
        const feedback = createBuilderMantineFeedbackComponents({ Alert: 'mantine-alert', Notification: 'mantine-notification', Loader: 'mantine-loader', Group: 'mantine-group', Text: 'mantine-text' });
        const media = createBuilderMantineMediaComponents({ Image: 'mantine-image', Avatar: 'mantine-avatar', ThemeIcon: 'mantine-theme-icon' });

        expect(Object.keys(navigation).sort()).to.deep.equal(['Anchor', 'Breadcrumbs', 'NavLink', 'Tabs']);
        expect(Object.keys(overlay).sort()).to.deep.equal(['Drawer', 'Modal']);
        expect(Object.keys(feedback).sort()).to.deep.equal(['Alert', 'Loader', 'NotificationBlock']);
        expect(Object.keys(media).sort()).to.deep.equal(['Avatar', 'Icon', 'Image']);

        const anchor = renderAdapter(navigation.Anchor, { href: '/docs', target: '_blank', children: 'Docs' });
        const navLink = renderAdapter(navigation.NavLink, { label: 'Home', href: '/' });
        const breadcrumbs = renderAdapter(navigation.Breadcrumbs, { items: [{ label: 'Home', href: '/' }, { label: 'Page' }] });
        const tabs = renderAdapter(navigation.Tabs, { defaultValue: 'overview', tabs: [{ label: 'Overview', href: 'overview' }] });
        const modal = renderAdapter(overlay.Modal, { title: 'Dialog', opened: true, children: React.createElement('p'), actions: React.createElement('button') });
        const alert = renderAdapter(feedback.Alert, { title: 'Heads up', children: 'Message' });
        const loader = renderAdapter(feedback.Loader, { label: 'Loading' });
        const image = renderAdapter(media.Image, { src: '/hero.png', alt: 'Hero', fit: 'cover' });
        const icon = renderAdapter(media.Icon, { name: 'circle', label: 'Status' });

        expect(anchor.type).to.equal('mantine-anchor');
        expect(anchor.props.rel).to.equal('noopener noreferrer');
        expect(navLink.type).to.equal('mantine-nav-link');
        expect(breadcrumbs.type).to.equal('mantine-breadcrumbs');
        expect((React.Children.toArray(tabs.props.children)[0] as React.ReactElement).type).to.equal('mantine-tabs-list');
        expect((React.Children.toArray((React.Children.toArray(tabs.props.children)[0] as React.ReactElement).props.children)[0] as React.ReactElement).props['aria-selected']).to.equal(undefined);
        expect(modal.type).to.equal('mantine-modal');
        expect((React.Children.toArray(modal.props.children)[1] as React.ReactElement).type).to.equal('mantine-group');
        expect(alert.type).to.equal('mantine-alert');
        expect(loader.type).to.equal('mantine-group');
        expect(image.type).to.equal('mantine-image');
        expect(icon.type).to.equal('mantine-theme-icon');

        const nativeTabs = renderAdapter(createBuilderMantineNavigationComponents().Tabs, {
            defaultValue: 'overview',
            tabs: [{ label: 'Overview', href: 'overview' }, { label: 'Settings', href: 'settings' }]
        });
        const nativeTabList = React.Children.toArray(nativeTabs.props.children)[0] as React.ReactElement;
        const nativeTabItems = React.Children.toArray(nativeTabList.props.children) as React.ReactElement[];
        expect(nativeTabList.props.role).to.equal('tablist');
        expect(nativeTabItems[0].props.role).to.equal('tab');
        expect(nativeTabItems[0].props['aria-selected']).to.equal(true);
        expect(nativeTabItems[1].props.tabIndex).to.equal(-1);
    });

    it('provides Mantine adapters for MVP marketing and dashboard components', () => {
        const marketing = createBuilderMantineMarketingComponents({
            Box: 'mantine-box',
            Button: 'mantine-button',
            Card: 'mantine-card',
            Group: 'mantine-group',
            Image: 'mantine-image',
            List: 'mantine-list',
            SimpleGrid: 'mantine-simple-grid',
            Text: 'mantine-text',
            Title: 'mantine-title'
        });
        const dashboard = createBuilderMantineDashboardComponents({
            Badge: 'mantine-badge',
            Box: 'mantine-box',
            Group: 'mantine-group',
            SimpleGrid: 'mantine-simple-grid',
            Text: 'mantine-text',
            Title: 'mantine-title'
        });

        expect(Object.keys(marketing).sort()).to.deep.equal(['CTASection', 'FeatureGrid', 'HeroSection', 'PricingSection', 'TestimonialSection']);
        expect(Object.keys(dashboard).sort()).to.deep.equal(['ChartPlaceholder', 'DashboardHeader', 'MetricGrid']);

        const hero = renderAdapter(marketing.HeroSection, { title: 'Launch', subtitle: 'Now', imageSrc: '/hero.png', primaryActionLabel: 'Start' });
        const features = renderAdapter(marketing.FeatureGrid, { title: 'Features', columns: 2, features: [{ title: 'Fast', description: 'Quick setup' }] });
        const pricing = renderAdapter(marketing.PricingSection, { plans: [{ name: 'Pro', price: '$9', features: ['One'], ctaLabel: 'Buy' }] });
        const testimonials = renderAdapter(marketing.TestimonialSection, { testimonials: [{ quote: 'Great', author: 'Ada' }] });
        const cta = renderAdapter(marketing.CTASection, { title: 'Ready', primaryActionLabel: 'Go' });
        const chart = renderAdapter(dashboard.ChartPlaceholder, { title: 'Sales', height: 240 });
        const metricGrid = renderAdapter(dashboard.MetricGrid, { columns: 3, spacing: 'sm' });
        const header = renderAdapter(dashboard.DashboardHeader, { title: 'Dashboard', periodLabel: 'Today' });

        expect(hero.type).to.equal('mantine-box');
        expect(React.Children.toArray(hero.props.children).map(child => (child as React.ReactElement).type)).to.include('mantine-image');
        expect(React.Children.toArray(features.props.children).map(child => (child as React.ReactElement).type)).to.include('mantine-simple-grid');
        expect(React.Children.toArray(pricing.props.children).map(child => (child as React.ReactElement).type)).to.include('mantine-simple-grid');
        expect(React.Children.toArray(testimonials.props.children).map(child => (child as React.ReactElement).type)).to.include('mantine-simple-grid');
        expect((React.Children.toArray(cta.props.children)[1] as React.ReactElement).type).to.equal('mantine-group');
        expect(chart.type).to.equal('mantine-box');
        expect(chart.props.style).to.deep.equal({ minHeight: 240 });
        expect(metricGrid.type).to.equal('mantine-simple-grid');
        expect(metricGrid.props.cols).to.equal(3);
        expect(header.type).to.equal('mantine-group');
        expect((React.Children.toArray(header.props.children)[1] as React.ReactElement).type).to.equal('mantine-badge');
    });
});

function createDeepNodeTree(depth: number): BuilderDocument['tree'] {
    const node: BuilderDocument['tree'] = {
        id: `deep-${depth}`,
        type: 'Box'
    };
    if (depth > 1) {
        node.children = [createDeepNodeTree(depth - 1)];
    }
    return node;
}

function onlyChild(element: React.ReactElement): React.ReactElement {
    return React.Children.only(element.props.children) as React.ReactElement;
}

function renderAdapter(component: unknown, props: Record<string, unknown>): React.ReactElement {
    return (component as (inputProps: Record<string, unknown>) => React.ReactElement)(props);
}

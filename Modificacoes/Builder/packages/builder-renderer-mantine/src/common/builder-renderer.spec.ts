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
                md: '20px'
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
            Affix: 'mantine-affix',
            AppShell: 'mantine-app-shell',
            AppShellAside: 'mantine-app-shell-aside',
            AppShellFooter: 'mantine-app-shell-footer',
            AppShellHeader: 'mantine-app-shell-header',
            AppShellMain: 'mantine-app-shell-main',
            AppShellNavbar: 'mantine-app-shell-navbar',
            AppShellSection: 'mantine-app-shell-section',
            AspectRatio: 'mantine-aspect-ratio',
            Box: 'mantine-box',
            Card: 'mantine-card',
            CardSection: 'mantine-card-section',
            Center: 'mantine-center',
            Collapse: 'mantine-collapse',
            Container: 'mantine-container',
            Divider: 'mantine-divider',
            Flex: 'mantine-flex',
            Grid: 'mantine-grid',
            GridCol: 'mantine-grid-col',
            Group: 'mantine-group',
            Indicator: 'mantine-indicator',
            Paper: 'mantine-paper',
            ScrollArea: 'mantine-scroll-area',
            ScrollAreaAutosize: 'mantine-scroll-area-autosize',
            SimpleGrid: 'mantine-simple-grid',
            Space: 'mantine-space',
            Spoiler: 'mantine-spoiler',
            Stack: 'mantine-stack',
            TableScrollContainer: 'mantine-table-scroll-container',
            VisuallyHidden: 'mantine-visually-hidden'
        });

        expect(Object.keys(components).sort()).to.deep.equal([
            'Affix',
            'AppShell',
            'AppShellAside',
            'AppShellFooter',
            'AppShellHeader',
            'AppShellMain',
            'AppShellNavbar',
            'AppShellSection',
            'AspectRatio',
            'Box',
            'Card',
            'CardSection',
            'Center',
            'Collapse',
            'Container',
            'Divider',
            'Flex',
            'Grid',
            'GridCol',
            'Group',
            'Indicator',
            'Page',
            'Paper',
            'ScrollArea',
            'ScrollAreaAutosize',
            'Section',
            'SimpleGrid',
            'Space',
            'Spoiler',
            'Stack',
            'TableScrollContainer',
            'VisuallyHidden'
        ]);

        const page = renderAdapter(components.Page, { background: 'gray.0', fullWidth: true });
        const section = renderAdapter(components.Section, { component: 'header', paddingY: 'xl', paddingX: 'md', background: 'blue.0' });
        const container = renderAdapter(components.Container, { size: 'fluid', padding: 'lg' });
        const stack = renderAdapter(components.Stack, { gap: 'sm', align: 'center' });
        const group = renderAdapter(components.Group, { gap: 'xs', wrap: false });
        const simpleGrid = renderAdapter(components.SimpleGrid, { cols: 3, spacing: 'md' });
        const grid = renderAdapter(components.Grid, { columns: 12, gutter: 'lg', span: 6 });
        const card = renderAdapter(components.Card, { padding: 'xl', background: 'white' });
        const cardSection = renderAdapter(components.CardSection, { padding: 'sm', withBorder: true });
        const paper = renderAdapter(components.Paper, { padding: 'lg', background: 'gray.0' });
        const center = renderAdapter(components.Center, { minHeight: 160, padding: 'sm' });
        const flex = renderAdapter(components.Flex, { direction: 'column', gap: 'lg', wrap: false });
        const appShellHeader = renderAdapter(components.AppShellHeader, { height: 56, padding: 'sm' });
        const aspectRatio = renderAdapter(components.AspectRatio, { ratio: 4 / 3, width: '100%' });
        const scrollArea = renderAdapter(components.ScrollArea, { height: 180 });
        const spoiler = renderAdapter(components.Spoiler, { maxHeight: 100, showLabel: 'More', hideLabel: 'Less' });
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
        expect(cardSection.type).to.equal('mantine-card-section');
        expect(cardSection.props.p).to.equal('sm');
        expect(cardSection.props.withBorder).to.equal(true);
        expect(paper.type).to.equal('mantine-paper');
        expect(paper.props.bg).to.equal('gray.0');
        expect(center.type).to.equal('mantine-center');
        expect(center.props.mih).to.equal(160);
        expect(flex.type).to.equal('mantine-flex');
        expect(flex.props.wrap).to.equal('nowrap');
        expect(appShellHeader.type).to.equal('mantine-app-shell-header');
        expect(appShellHeader.props.h).to.equal(56);
        expect(appShellHeader.props.p).to.equal('sm');
        expect(aspectRatio.type).to.equal('mantine-aspect-ratio');
        expect(aspectRatio.props.ratio).to.equal(4 / 3);
        expect(scrollArea.type).to.equal('mantine-scroll-area');
        expect(scrollArea.props.h).to.equal(180);
        expect(spoiler.type).to.equal('mantine-spoiler');
        expect(spoiler.props.showLabel).to.equal('More');
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
            Blockquote: 'mantine-blockquote',
            Code: 'mantine-code',
            Highlight: 'mantine-highlight',
            Kbd: 'mantine-kbd',
            List: 'mantine-list',
            ListItem: 'mantine-list-item',
            Mark: 'mantine-mark',
            NumberFormatter: 'mantine-number-formatter',
            Pill: 'mantine-pill',
            PillGroup: 'mantine-pill-group',
            TypographyStylesProvider: 'mantine-typography'
        });

        expect(Object.keys(components).sort()).to.deep.equal([
            'Badge',
            'Blockquote',
            'Code',
            'Highlight',
            'Kbd',
            'List',
            'ListItem',
            'Mark',
            'Markdown',
            'NumberFormatter',
            'Pill',
            'PillGroup',
            'Text',
            'Title',
            'TypographyStylesProvider'
        ]);

        const title = renderAdapter(components.Title, { children: 'Heading', order: 1, align: 'center', weight: 700 });
        const text = renderAdapter(components.Text, { children: 'Body', component: 'span', align: 'right', weight: 500 });
        const badge = renderAdapter(components.Badge, { children: 'Live', color: 'green', variant: 'light' });
        const code = renderAdapter(components.Code, { children: 'npm test', block: true });
        const kbd = renderAdapter(components.Kbd, { children: 'Ctrl K' });
        const mark = renderAdapter(components.Mark, { children: 'Marked' });
        const blockquote = renderAdapter(components.Blockquote, { children: 'Quote', cite: 'Ada' });
        const highlight = renderAdapter(components.Highlight, { children: 'Important words', highlight: 'Important' });
        const list = renderAdapter(components.List, { items: ['One', 'Two'], type: 'ordered' });
        const listItem = renderAdapter(components.ListItem, { children: 'Manual item' });
        const pillGroup = renderAdapter(components.PillGroup, { children: React.createElement('span') });
        const typographyProvider = renderAdapter(components.TypographyStylesProvider, { children: React.createElement('p') });

        expect(title.type).to.equal('mantine-title');
        expect(title.props.ta).to.equal('center');
        expect(title.props.fw).to.equal(700);
        expect(text.type).to.equal('mantine-text');
        expect(text.props.component).to.equal('span');
        expect(text.props.ta).to.equal('right');
        expect(badge.type).to.equal('mantine-badge');
        expect(badge.props.color).to.equal('green');
        expect(code.type).to.equal('mantine-code');
        expect(code.props.style).to.deep.equal({ display: 'block', whiteSpace: 'pre-wrap' });
        expect(kbd.type).to.equal('mantine-kbd');
        expect(mark.type).to.equal('mantine-mark');
        expect(blockquote.type).to.equal('mantine-blockquote');
        expect(highlight.type).to.equal('mantine-highlight');
        expect(list.type).to.equal('mantine-list');
        expect(list.props.type).to.equal('ordered');
        expect(list.props.component).to.equal('ol');
        const items = React.Children.toArray(list.props.children) as React.ReactElement[];
        expect(items.map(item => item.type)).to.deep.equal(['mantine-list-item', 'mantine-list-item']);
        expect(items.map(item => item.props.children)).to.deep.equal(['One', 'Two']);
        expect(listItem.type).to.equal('mantine-list-item');
        expect(pillGroup.type).to.equal('mantine-pill-group');
        expect(typographyProvider.type).to.equal('mantine-typography');
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
            ActionIcon: 'mantine-action-icon',
            ActionIconGroup: 'mantine-action-icon-group',
            ActionIconGroupSection: 'mantine-action-icon-group-section',
            Autocomplete: 'mantine-autocomplete',
            Burger: 'mantine-burger',
            Button: 'mantine-button',
            ButtonGroup: 'mantine-button-group',
            ButtonGroupSection: 'mantine-button-group-section',
            AlphaSlider: 'mantine-alpha-slider',
            AngleSlider: 'mantine-angle-slider',
            CheckboxGroup: 'mantine-checkbox-group',
            CheckboxCard: 'mantine-checkbox-card',
            CheckboxIndicator: 'mantine-checkbox-indicator',
            Chip: 'mantine-chip',
            ChipGroup: 'mantine-chip-group',
            CloseButton: 'mantine-close-button',
            ColorInput: 'mantine-color-input',
            ColorPicker: 'mantine-color-picker',
            ColorSwatch: 'mantine-color-swatch',
            Combobox: 'mantine-combobox',
            ComboboxChevron: 'mantine-combobox-chevron',
            ComboboxClearButton: 'mantine-combobox-clear-button',
            ComboboxDropdown: 'mantine-combobox-dropdown',
            ComboboxDropdownTarget: 'mantine-combobox-dropdown-target',
            ComboboxEmpty: 'mantine-combobox-empty',
            ComboboxEventsTarget: 'mantine-combobox-events-target',
            ComboboxFooter: 'mantine-combobox-footer',
            ComboboxGroup: 'mantine-combobox-group',
            ComboboxHeader: 'mantine-combobox-header',
            ComboboxHiddenInput: 'mantine-combobox-hidden-input',
            ComboboxOption: 'mantine-combobox-option',
            ComboboxOptions: 'mantine-combobox-options',
            ComboboxSearch: 'mantine-combobox-search',
            ComboboxTarget: 'mantine-combobox-target',
            CopyButton: 'mantine-copy-button',
            HueSlider: 'mantine-hue-slider',
            Input: 'mantine-input',
            InputBase: 'mantine-input-base',
            InputWrapper: 'mantine-input-wrapper',
            InputLabel: 'mantine-input-label',
            InputDescription: 'mantine-input-description',
            InputPlaceholder: 'mantine-input-placeholder',
            InputClearButton: 'mantine-input-clear-button',
            InputError: 'mantine-input-error',
            Fieldset: 'mantine-fieldset',
            FileButton: 'mantine-file-button',
            TextInput: 'mantine-text-input',
            PasswordInput: 'mantine-password-input',
            Textarea: 'mantine-textarea',
            Select: 'mantine-select',
            MultiSelect: 'mantine-multi-select',
            NativeSelect: 'mantine-native-select',
            Checkbox: 'mantine-checkbox',
            FileInput: 'mantine-file-input',
            JsonInput: 'mantine-json-input',
            Pill: 'mantine-pill',
            PillGroup: 'mantine-pill-group',
            PillsInput: 'mantine-pills-input',
            PillsInputField: 'mantine-pills-input-field',
            PinInput: 'mantine-pin-input',
            RadioCard: 'mantine-radio-card',
            RadioGroup: 'mantine-radio-group',
            Radio: 'mantine-radio',
            RadioIndicator: 'mantine-radio-indicator',
            RangeSlider: 'mantine-range-slider',
            Rating: 'mantine-rating',
            SegmentedControl: 'mantine-segmented-control',
            Slider: 'mantine-slider',
            SwitchGroup: 'mantine-switch-group',
            Switch: 'mantine-switch',
            TagsInput: 'mantine-tags-input',
            NumberInput: 'mantine-number-input',
            DateInput: 'mantine-date-input',
            DynamicForm: 'mantine-form',
            UnstyledButton: 'mantine-unstyled-button',
            Stack: 'mantine-stack',
            Group: 'mantine-group'
        });

        expect(Object.keys(components).sort()).to.deep.equal([
            'ActionIcon',
            'ActionIconGroup',
            'ActionIconGroupSection',
            'AlphaSlider',
            'AngleSlider',
            'Autocomplete',
            'Burger',
            'Button',
            'ButtonGroup',
            'ButtonGroupSection',
            'Checkbox',
            'CheckboxCard',
            'CheckboxGroup',
            'CheckboxIndicator',
            'Chip',
            'ChipGroup',
            'CloseButton',
            'ColorInput',
            'ColorPicker',
            'ColorSwatch',
            'Combobox',
            'ComboboxChevron',
            'ComboboxClearButton',
            'ComboboxDropdown',
            'ComboboxDropdownTarget',
            'ComboboxEmpty',
            'ComboboxEventsTarget',
            'ComboboxFooter',
            'ComboboxGroup',
            'ComboboxHeader',
            'ComboboxHiddenInput',
            'ComboboxOption',
            'ComboboxOptions',
            'ComboboxSearch',
            'ComboboxTarget',
            'CopyButton',
            'DateInput',
            'DynamicForm',
            'Fieldset',
            'FileButton',
            'FileInput',
            'HueSlider',
            'Input',
            'InputBase',
            'InputClearButton',
            'InputDescription',
            'InputError',
            'InputLabel',
            'InputPlaceholder',
            'InputWrapper',
            'JsonInput',
            'MultiSelect',
            'NativeSelect',
            'NumberInput',
            'PasswordInput',
            'PillsInput',
            'PillsInputField',
            'PinInput',
            'Radio',
            'RadioCard',
            'RadioGroup',
            'RadioIndicator',
            'RangeSlider',
            'Rating',
            'SegmentedControl',
            'Select',
            'Slider',
            'Switch',
            'SwitchGroup',
            'TagsInput',
            'TextInput',
            'Textarea',
            'UnstyledButton'
        ]);

        const actionIcon = renderAdapter(components.ActionIcon, { label: 'Add', children: '+' });
        const actionIconGroup = renderAdapter(components.ActionIconGroup, { orientation: 'vertical' });
        const actionIconGroupSection = renderAdapter(components.ActionIconGroupSection, { children: '+' });
        const button = renderAdapter(components.Button, { children: 'Save', variant: 'light' });
        const buttonGroup = renderAdapter(components.ButtonGroup, { orientation: 'vertical' });
        const buttonGroupSection = renderAdapter(components.ButtonGroupSection, { children: 'or' });
        const input = renderAdapter(components.Input, { placeholder: 'Name' });
        const inputWrapper = renderAdapter(components.InputWrapper, { label: 'Name', children: React.createElement('span') });
        const inputClearButton = renderAdapter(components.InputClearButton, { 'aria-label': 'Clear name' });
        const inputError = renderAdapter(components.InputError, { children: 'Required' });
        const autocomplete = renderAdapter(components.Autocomplete, { label: 'Search', data: ['One'] });
        const textInput = renderAdapter(components.TextInput, { label: 'Email', children: 'Email', type: 'email' });
        const passwordInput = renderAdapter(components.PasswordInput, { label: 'Password' });
        const textarea = renderAdapter(components.Textarea, { label: 'Bio', minRows: 4, children: 'Bio' });
        const select = renderAdapter(components.Select, { data: [{ label: 'Admin', value: 'admin' }], clearable: true });
        const multiSelect = renderAdapter(components.MultiSelect, { data: [{ label: 'Admin', value: 'admin' }], defaultValue: ['admin'] });
        const nativeSelect = renderAdapter(components.NativeSelect, { data: [{ label: 'Admin', value: 'admin' }] });
        const combobox = renderAdapter(components.Combobox, { children: React.createElement('span') });
        const comboboxOption = renderAdapter(components.ComboboxOption, { value: 'admin', children: 'Admin' });
        const comboboxSearch = renderAdapter(components.ComboboxSearch, { placeholder: 'Search' });
        const comboboxClearButton = renderAdapter(components.ComboboxClearButton, { 'aria-label': 'Clear option' });
        const comboboxHiddenInput = renderAdapter(components.ComboboxHiddenInput, { name: 'role', values: ['admin', 'editor'] });
        const checkboxGroup = renderAdapter(components.CheckboxGroup, { label: 'Choices', children: React.createElement('span') });
        const checkbox = renderAdapter(components.Checkbox, { label: 'Accept', defaultChecked: true });
        const switchGroup = renderAdapter(components.SwitchGroup, { label: 'Toggles', children: React.createElement('span') });
        const switchInput = renderAdapter(components.Switch, { label: 'Enabled', defaultChecked: true });
        const radioGroup = renderAdapter(components.RadioGroup, { name: 'role', data: [{ label: 'User', value: 'user' }] });
        const numberInput = renderAdapter(components.NumberInput, { label: 'Amount', step: 2 });
        const dateInput = renderAdapter(components.DateInput, { label: 'Due', minDate: '2026-01-01', maxDate: '2026-12-31' });
        const chipGroup = renderAdapter(components.ChipGroup, { multiple: true, defaultValue: ['one'] });
        const slider = renderAdapter(components.Slider, { label: 'Volume', defaultValue: 40 });
        const rangeSlider = renderAdapter(components.RangeSlider, { label: 'Range', defaultValue: [20, 80] });
        const segmented = renderAdapter(components.SegmentedControl, { label: 'Mode', data: [{ label: 'One', value: 'one' }] });
        const pin = renderAdapter(components.PinInput, { label: 'PIN', length: 6 });
        const colorInput = renderAdapter(components.ColorInput, { label: 'Color', defaultValue: '#228be6' });
        const colorPicker = renderAdapter(components.ColorPicker, { defaultValue: '#228be6' });
        const hueSlider = renderAdapter(components.HueSlider, { defaultValue: 220 });
        const alphaSlider = renderAdapter(components.AlphaSlider, { color: '#228be6', defaultValue: 0.5 });
        const angleSlider = renderAdapter(components.AngleSlider, { defaultValue: 90 });
        const jsonInput = renderAdapter(components.JsonInput, { label: 'JSON', defaultValue: '{}' });
        const tagsInput = renderAdapter(components.TagsInput, { label: 'Tags', data: ['alpha'] });
        const fileInput = renderAdapter(components.FileInput, { label: 'File', accept: 'image/*' });
        const pillsInputField = renderAdapter(components.PillsInputField, { placeholder: 'Add item' });
        const rating = renderAdapter(components.Rating, { label: 'Rating', defaultValue: 4, count: 5 });
        const dynamicForm = renderAdapter(components.DynamicForm, { layout: 'horizontal', gap: 'sm', children: React.createElement('span') });

        expect(actionIcon.type).to.equal('mantine-action-icon');
        expect(actionIcon.props['aria-label']).to.equal('Add');
        expect(actionIconGroup.type).to.equal('mantine-action-icon-group');
        expect(actionIconGroup.props.orientation).to.equal('vertical');
        expect(actionIconGroupSection.type).to.equal('mantine-action-icon-group-section');
        expect(button.type).to.equal('mantine-button');
        expect(button.props.children).to.equal('Save');
        expect(button.props.type).to.equal('button');
        expect(buttonGroup.type).to.equal('mantine-button-group');
        expect(buttonGroup.props.orientation).to.equal('vertical');
        expect(buttonGroupSection.type).to.equal('mantine-button-group-section');
        expect(input.type).to.equal('mantine-input');
        expect(input.props.type).to.equal('text');
        expect(inputWrapper.type).to.equal('mantine-input-wrapper');
        expect(inputClearButton.type).to.equal('mantine-input-clear-button');
        expect(inputClearButton.props.type).to.equal('button');
        expect(inputError.type).to.equal('mantine-input-error');
        expect(autocomplete.type).to.equal('mantine-autocomplete');
        expect(autocomplete.props.data).to.deep.equal(['One']);
        expect(textInput.type).to.equal('mantine-text-input');
        expect(textInput.props.type).to.equal('email');
        expect(textInput.props['aria-label']).to.equal('Email');
        expect(textInput.props.children).to.equal(undefined);
        expect(passwordInput.type).to.equal('mantine-password-input');
        expect(passwordInput.props.type).to.equal('password');
        expect(textarea.type).to.equal('mantine-textarea');
        expect(textarea.props.minRows).to.equal(4);
        expect(select.type).to.equal('mantine-select');
        expect(select.props.data).to.deep.equal([{ label: 'Admin', value: 'admin' }]);
        expect(multiSelect.type).to.equal('mantine-multi-select');
        expect(multiSelect.props.defaultValue).to.deep.equal(['admin']);
        expect(nativeSelect.type).to.equal('mantine-native-select');
        expect(combobox.type).to.equal('mantine-combobox');
        expect(React.Children.toArray(combobox.props.children)[0]).to.not.equal(undefined);
        expect(comboboxOption.type).to.equal('mantine-combobox-option');
        expect(comboboxOption.props.value).to.equal('admin');
        expect(comboboxSearch.type).to.equal('mantine-combobox-search');
        expect(comboboxSearch.props.type).to.equal('text');
        expect(comboboxClearButton.type).to.equal('mantine-combobox-clear-button');
        expect(comboboxClearButton.props.type).to.equal('button');
        expect(comboboxHiddenInput.type).to.equal('mantine-combobox-hidden-input');
        expect(comboboxHiddenInput.props.value).to.equal('admin,editor');
        expect(checkboxGroup.type).to.equal('mantine-checkbox-group');
        expect(checkbox.type).to.equal('mantine-checkbox');
        expect(checkbox.props.type).to.equal('checkbox');
        expect(switchGroup.type).to.equal('mantine-switch-group');
        expect(switchInput.type).to.equal('mantine-switch');
        expect(switchInput.props.type).to.equal('checkbox');
        expect(radioGroup.type).to.equal('mantine-radio-group');
        expect(React.Children.toArray(radioGroup.props.children).map(child => (child as React.ReactElement).type)).to.deep.equal(['mantine-radio']);
        expect(numberInput.type).to.equal('mantine-number-input');
        expect(numberInput.props.type).to.equal('number');
        expect(dateInput.type).to.equal('mantine-date-input');
        expect(dateInput.props.min).to.equal('2026-01-01');
        expect(dateInput.props.max).to.equal('2026-12-31');
        expect(chipGroup.type).to.equal('mantine-chip-group');
        expect(chipGroup.props.multiple).to.equal(true);
        expect(slider.type).to.equal('mantine-slider');
        expect(slider.props.defaultValue).to.equal(40);
        expect(rangeSlider.type).to.equal('mantine-range-slider');
        expect(rangeSlider.props.defaultValue).to.deep.equal([20, 80]);
        expect(segmented.type).to.equal('mantine-segmented-control');
        expect(pin.type).to.equal('mantine-pin-input');
        expect(pin.props.length).to.equal(6);
        expect(colorInput.type).to.equal('mantine-color-input');
        expect(colorPicker.type).to.equal('mantine-color-picker');
        expect(hueSlider.type).to.equal('mantine-hue-slider');
        expect(alphaSlider.type).to.equal('mantine-alpha-slider');
        expect(angleSlider.type).to.equal('mantine-angle-slider');
        expect(jsonInput.type).to.equal('mantine-json-input');
        expect(tagsInput.type).to.equal('mantine-tags-input');
        expect(fileInput.type).to.equal('mantine-file-input');
        expect(pillsInputField.type).to.equal('mantine-pills-input-field');
        expect(rating.type).to.equal('mantine-rating');
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
            Accordion: 'mantine-accordion',
            AccordionItem: 'mantine-accordion-item',
            AccordionControl: 'mantine-accordion-control',
            AccordionPanel: 'mantine-accordion-panel',
            Table: 'mantine-table',
            TableCaption: 'mantine-table-caption',
            TableThead: 'mantine-table-thead',
            TableTbody: 'mantine-table-tbody',
            TableTfoot: 'mantine-table-tfoot',
            TableTr: 'mantine-table-tr',
            TableTh: 'mantine-table-th',
            TableTd: 'mantine-table-td',
            DataTable: 'mantine-data-table',
            Timeline: 'mantine-timeline',
            TimelineItem: 'mantine-timeline-item',
            Tree: 'mantine-tree',
            Card: 'mantine-card',
            Text: 'mantine-text',
            Title: 'mantine-title',
            Badge: 'mantine-badge'
        });

        expect(Object.keys(components).sort()).to.deep.equal([
            'Accordion',
            'AccordionControl',
            'AccordionItem',
            'AccordionPanel',
            'DataTable',
            'MetricCard',
            'StatCard',
            'Table',
            'TableCaption',
            'TableTbody',
            'TableTd',
            'TableTfoot',
            'TableTh',
            'TableThead',
            'TableTr',
            'Timeline',
            'TimelineItem',
            'Tree'
        ]);

        const table = renderAdapter(components.Table, { columns: [{ key: 'name', label: 'Name' }], rows: [{ name: 'Ada' }] });
        const tableCell = renderAdapter(components.TableTd, { children: 'Cell', colSpan: 2 });
        const dataTable = renderAdapter(components.DataTable, { title: 'Users', columns: [{ key: 'name', label: 'Name' }], rows: [{ name: 'Ada' }] });
        const accordion = renderAdapter(components.Accordion, { items: [{ label: 'Details', value: 'details', content: 'Body' }] });
        const timeline = renderAdapter(components.Timeline, { items: [{ title: 'Created', description: 'Done', time: 'Today' }] });
        const metric = renderAdapter(components.MetricCard, { label: 'Revenue', value: '$10k', trendLabel: 'Up' });
        const stat = renderAdapter(components.StatCard, { title: 'Orders', value: 12, metrics: [{ label: 'Open', value: 3 }] });

        expect(table.type).to.equal('mantine-table');
        expect((React.Children.toArray(table.props.children)[0] as React.ReactElement).type).to.equal('thead');
        expect(tableCell.type).to.equal('mantine-table-td');
        expect(tableCell.props.colSpan).to.equal(2);
        expect(dataTable.type).to.equal('section');
        expect((React.Children.toArray(dataTable.props.children)[1] as React.ReactElement).type).to.equal('mantine-data-table');
        expect(accordion.type).to.equal('mantine-accordion');
        expect((React.Children.toArray(accordion.props.children)[0] as React.ReactElement).type).to.equal('mantine-accordion-item');
        expect(timeline.type).to.equal('mantine-timeline');
        expect((React.Children.toArray(timeline.props.children)[0] as React.ReactElement).type).to.equal('mantine-timeline-item');
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
            Button: 'mantine-button',
            Menu: 'mantine-menu',
            MenuTarget: 'mantine-menu-target',
            MenuDropdown: 'mantine-menu-dropdown',
            MenuItem: 'mantine-menu-item',
            MenuLabel: 'mantine-menu-label',
            MenuDivider: 'mantine-menu-divider',
            Pagination: 'mantine-pagination',
            PaginationRoot: 'mantine-pagination-root',
            PaginationControl: 'mantine-pagination-control',
            PaginationDots: 'mantine-pagination-dots',
            PaginationFirst: 'mantine-pagination-first',
            PaginationItems: 'mantine-pagination-items',
            PaginationLast: 'mantine-pagination-last',
            PaginationNext: 'mantine-pagination-next',
            PaginationPrevious: 'mantine-pagination-previous',
            Stepper: 'mantine-stepper',
            StepperCompleted: 'mantine-stepper-completed',
            StepperStep: 'mantine-stepper-step',
            TableOfContents: 'mantine-table-of-contents',
            Tabs: 'mantine-tabs',
            TabsList: 'mantine-tabs-list',
            TabsPanel: 'mantine-tabs-panel',
            TabsTab: 'mantine-tabs-tab'
        });
        const overlay = createBuilderMantineOverlayComponents({
            Dialog: 'mantine-dialog',
            Modal: 'mantine-modal',
            ModalRoot: 'mantine-modal-root',
            ModalOverlay: 'mantine-modal-overlay',
            ModalContent: 'mantine-modal-content',
            ModalHeader: 'mantine-modal-header',
            ModalTitle: 'mantine-modal-title',
            ModalCloseButton: 'mantine-modal-close-button',
            ModalBody: 'mantine-modal-body',
            ModalStack: 'mantine-modal-stack',
            ModalBase: 'mantine-modal-base',
            ModalBaseOverlay: 'mantine-modal-base-overlay',
            ModalBaseContent: 'mantine-modal-base-content',
            ModalBaseHeader: 'mantine-modal-base-header',
            ModalBaseTitle: 'mantine-modal-base-title',
            ModalBaseCloseButton: 'mantine-modal-base-close-button',
            ModalBaseBody: 'mantine-modal-base-body',
            Drawer: 'mantine-drawer',
            DrawerRoot: 'mantine-drawer-root',
            DrawerOverlay: 'mantine-drawer-overlay',
            DrawerContent: 'mantine-drawer-content',
            DrawerHeader: 'mantine-drawer-header',
            DrawerTitle: 'mantine-drawer-title',
            DrawerCloseButton: 'mantine-drawer-close-button',
            DrawerBody: 'mantine-drawer-body',
            DrawerStack: 'mantine-drawer-stack',
            HoverCard: 'mantine-hover-card',
            HoverCardDropdown: 'mantine-hover-card-dropdown',
            HoverCardTarget: 'mantine-hover-card-target',
            Popover: 'mantine-popover',
            PopoverDropdown: 'mantine-popover-dropdown',
            PopoverTarget: 'mantine-popover-target',
            Tooltip: 'mantine-tooltip',
            TooltipFloating: 'mantine-tooltip-floating',
            TooltipGroup: 'mantine-tooltip-group',
            Overlay: 'mantine-overlay',
            Portal: 'mantine-portal',
            OptionalPortal: 'mantine-optional-portal',
            Transition: 'mantine-transition',
            FocusTrap: 'mantine-focus-trap',
            FocusTrapInitialFocus: 'mantine-focus-trap-initial-focus',
            FloatingArrow: 'mantine-floating-arrow',
            FloatingIndicator: 'mantine-floating-indicator',
            NativeScrollArea: 'mantine-native-scroll-area',
            RemoveScroll: 'mantine-remove-scroll',
            Group: 'mantine-group'
        });
        const feedback = createBuilderMantineFeedbackComponents({
            Alert: 'mantine-alert',
            LoadingOverlay: 'mantine-loading-overlay',
            Notification: 'mantine-notification',
            Loader: 'mantine-loader',
            Progress: 'mantine-progress',
            ProgressRoot: 'mantine-progress-root',
            ProgressSection: 'mantine-progress-section',
            ProgressLabel: 'mantine-progress-label',
            RingProgress: 'mantine-ring-progress',
            SemiCircleProgress: 'mantine-semi-circle-progress',
            Skeleton: 'mantine-skeleton',
            Group: 'mantine-group',
            Text: 'mantine-text'
        });
        const media = createBuilderMantineMediaComponents({
            BackgroundImage: 'mantine-background-image',
            Image: 'mantine-image',
            Avatar: 'mantine-avatar',
            AvatarGroup: 'mantine-avatar-group',
            ThemeIcon: 'mantine-theme-icon',
            CheckIcon: 'mantine-check-icon',
            CloseIcon: 'mantine-close-icon',
            RadioIcon: 'mantine-radio-icon',
            AccordionChevron: 'mantine-accordion-chevron'
        });

        expect(Object.keys(navigation).sort()).to.deep.equal([
            'Anchor',
            'Breadcrumbs',
            'Menu',
            'MenuDivider',
            'MenuDropdown',
            'MenuItem',
            'MenuLabel',
            'MenuTarget',
            'NavLink',
            'Pagination',
            'PaginationControl',
            'PaginationDots',
            'PaginationFirst',
            'PaginationItems',
            'PaginationLast',
            'PaginationNext',
            'PaginationPrevious',
            'PaginationRoot',
            'Stepper',
            'StepperCompleted',
            'StepperStep',
            'TableOfContents',
            'Tabs',
            'TabsList',
            'TabsPanel',
            'TabsTab'
        ]);
        expect(Object.keys(overlay).sort()).to.deep.equal([
            'Dialog',
            'Drawer',
            'DrawerBody',
            'DrawerCloseButton',
            'DrawerContent',
            'DrawerHeader',
            'DrawerOverlay',
            'DrawerRoot',
            'DrawerStack',
            'DrawerTitle',
            'FloatingArrow',
            'FloatingIndicator',
            'FocusTrap',
            'FocusTrapInitialFocus',
            'HoverCard',
            'HoverCardDropdown',
            'HoverCardTarget',
            'Modal',
            'ModalBase',
            'ModalBaseBody',
            'ModalBaseCloseButton',
            'ModalBaseContent',
            'ModalBaseHeader',
            'ModalBaseOverlay',
            'ModalBaseTitle',
            'ModalBody',
            'ModalCloseButton',
            'ModalContent',
            'ModalHeader',
            'ModalOverlay',
            'ModalRoot',
            'ModalStack',
            'ModalTitle',
            'NativeScrollArea',
            'OptionalPortal',
            'Overlay',
            'Popover',
            'PopoverDropdown',
            'PopoverTarget',
            'Portal',
            'RemoveScroll',
            'Tooltip',
            'TooltipFloating',
            'TooltipGroup',
            'Transition'
        ]);
        expect(Object.keys(feedback).sort()).to.deep.equal(['Alert', 'Loader', 'LoadingOverlay', 'Notification', 'NotificationBlock', 'Progress', 'ProgressLabel', 'ProgressRoot', 'ProgressSection', 'RingProgress', 'SemiCircleProgress', 'Skeleton']);
        expect(Object.keys(media).sort()).to.deep.equal(['AccordionChevron', 'Avatar', 'AvatarGroup', 'BackgroundImage', 'CheckIcon', 'CloseIcon', 'Icon', 'Image', 'RadioIcon', 'ThemeIcon']);

        const anchor = renderAdapter(navigation.Anchor, { href: '/docs', target: '_blank', children: 'Docs' });
        const navLink = renderAdapter(navigation.NavLink, { label: 'Home', href: '/' });
        const breadcrumbs = renderAdapter(navigation.Breadcrumbs, { items: [{ label: 'Home', href: '/' }, { label: 'Page' }] });
        const menu = renderAdapter(navigation.Menu, { label: 'Actions', items: [{ label: 'Open', href: '/open' }] });
        const menuLabel = renderAdapter(navigation.MenuLabel, { children: 'Section' });
        const paginationRoot = renderAdapter(navigation.PaginationRoot, { total: 5, defaultValue: 2 });
        const paginationControl = renderAdapter(navigation.PaginationControl, { children: '2', active: true });
        const tabs = renderAdapter(navigation.Tabs, { defaultValue: 'overview', tabs: [{ label: 'Overview', href: 'overview' }] });
        const stepper = renderAdapter(navigation.Stepper, { active: 1, steps: [{ label: 'One', description: 'Start' }] });
        const pagination = renderAdapter(navigation.Pagination, { total: 10, defaultValue: 2 });
        const modal = renderAdapter(overlay.Modal, { title: 'Dialog', opened: true, children: React.createElement('p'), actions: React.createElement('button') });
        const modalRoot = renderAdapter(overlay.ModalRoot, { opened: true });
        const modalTitle = renderAdapter(overlay.ModalTitle, { children: 'Title' });
        const modalBase = renderAdapter(overlay.ModalBase, { opened: true, children: React.createElement('span') });
        const modalBaseTitle = renderAdapter(overlay.ModalBaseTitle, { children: 'Base title' });
        const drawerRoot = renderAdapter(overlay.DrawerRoot, { opened: true, position: 'left' });
        const drawerBody = renderAdapter(overlay.DrawerBody, { children: React.createElement('span') });
        const popoverTarget = renderAdapter(overlay.PopoverTarget, { children: React.createElement('button') });
        const hoverCardDropdown = renderAdapter(overlay.HoverCardDropdown, { children: React.createElement('span') });
        const tooltip = renderAdapter(overlay.Tooltip, { label: 'Help', children: React.createElement('button') });
        const tooltipFloating = renderAdapter(overlay.TooltipFloating, { label: 'Help', children: React.createElement('button') });
        const tooltipGroup = renderAdapter(overlay.TooltipGroup, { children: React.createElement('span') });
        const overlayLayer = renderAdapter(overlay.Overlay, { backgroundOpacity: 0.5 });
        const portal = renderAdapter(overlay.Portal, { children: React.createElement('span') });
        const optionalPortal = renderAdapter(overlay.OptionalPortal, { withinPortal: false, children: React.createElement('span') });
        const transition = renderAdapter(overlay.Transition, { mounted: true, children: React.createElement('span') });
        const focusTrap = renderAdapter(overlay.FocusTrap, { active: true, children: React.createElement('button') });
        const initialFocus = renderAdapter(overlay.FocusTrapInitialFocus, {});
        const floatingArrow = renderAdapter(overlay.FloatingArrow, { arrowSize: 10 });
        const floatingIndicator = renderAdapter(overlay.FloatingIndicator, { target: {}, parent: {}, children: React.createElement('span') });
        const nativeScrollArea = renderAdapter(overlay.NativeScrollArea, { h: 120, children: React.createElement('span') });
        const removeScroll = renderAdapter(overlay.RemoveScroll, { enabled: true, children: React.createElement('span') });
        const alert = renderAdapter(feedback.Alert, { title: 'Heads up', children: 'Message' });
        const loader = renderAdapter(feedback.Loader, { label: 'Loading' });
        const progress = renderAdapter(feedback.Progress, { value: 42, label: '42%' });
        const progressSection = renderAdapter(feedback.ProgressSection, { value: 35, color: 'green' });
        const progressLabel = renderAdapter(feedback.ProgressLabel, { children: '35%' });
        const ringProgress = renderAdapter(feedback.RingProgress, { value: 72, color: 'green', label: '72%' });
        const skeleton = renderAdapter(feedback.Skeleton, { width: '100%', height: 40 });
        const backgroundImage = renderAdapter(media.BackgroundImage, { src: '/bg.png', padding: 'lg', minHeight: 220 });
        const image = renderAdapter(media.Image, { src: '/hero.png', alt: 'Hero', fit: 'cover' });
        const avatarGroup = renderAdapter(media.AvatarGroup, { spacing: 'sm' });
        const themeIcon = renderAdapter(media.ThemeIcon, { label: 'Status', children: '*' });
        const icon = renderAdapter(media.Icon, { name: 'circle', label: 'Status' });
        const checkIcon = renderAdapter(media.CheckIcon, { label: 'Done' });
        const closeIcon = renderAdapter(media.CloseIcon, { label: 'Close' });
        const radioIcon = renderAdapter(media.RadioIcon, { label: 'Selected' });
        const accordionChevron = renderAdapter(media.AccordionChevron, { label: 'Expand' });

        expect(anchor.type).to.equal('mantine-anchor');
        expect(anchor.props.rel).to.equal('noopener noreferrer');
        expect(navLink.type).to.equal('mantine-nav-link');
        expect(breadcrumbs.type).to.equal('mantine-breadcrumbs');
        expect(menu.type).to.equal('mantine-menu');
        expect((React.Children.toArray(menu.props.children)[1] as React.ReactElement).type).to.equal('mantine-menu-dropdown');
        expect(menuLabel.type).to.equal('mantine-menu-label');
        expect(paginationRoot.type).to.equal('mantine-pagination-root');
        expect(paginationRoot.props.value).to.equal(2);
        expect(paginationControl.type).to.equal('mantine-pagination-control');
        expect(paginationControl.props.active).to.equal(true);
        expect((React.Children.toArray(tabs.props.children)[0] as React.ReactElement).type).to.equal('mantine-tabs-list');
        expect((React.Children.toArray((React.Children.toArray(tabs.props.children)[0] as React.ReactElement).props.children)[0] as React.ReactElement).props['aria-selected']).to.equal(undefined);
        expect(stepper.type).to.equal('mantine-stepper');
        expect((React.Children.toArray(stepper.props.children)[0] as React.ReactElement).type).to.equal('mantine-stepper-step');
        expect(pagination.type).to.equal('mantine-pagination');
        expect(pagination.props.value).to.equal(2);
        expect(modal.type).to.equal('mantine-modal');
        expect((React.Children.toArray(modal.props.children)[1] as React.ReactElement).type).to.equal('mantine-group');
        expect(modalRoot.type).to.equal('mantine-modal-root');
        expect(modalRoot.props.opened).to.equal(true);
        expect(modalTitle.type).to.equal('mantine-modal-title');
        expect(modalBase.type).to.equal('mantine-modal-base');
        expect(React.Children.toArray(modalBase.props.children)[0]).to.not.equal(undefined);
        expect(modalBaseTitle.type).to.equal('mantine-modal-base-title');
        expect(drawerRoot.type).to.equal('mantine-drawer-root');
        expect(drawerRoot.props.position).to.equal('left');
        expect(drawerBody.type).to.equal('mantine-drawer-body');
        expect(popoverTarget.type).to.equal('mantine-popover-target');
        expect(hoverCardDropdown.type).to.equal('mantine-hover-card-dropdown');
        expect(tooltip.type).to.equal('mantine-tooltip');
        expect(tooltipFloating.type).to.equal('mantine-tooltip-floating');
        expect(tooltipGroup.type).to.equal('mantine-tooltip-group');
        expect(overlayLayer.type).to.equal('mantine-overlay');
        expect(portal.type).to.equal('mantine-portal');
        expect(optionalPortal.type).to.equal('mantine-optional-portal');
        expect(transition.type).to.equal('mantine-transition');
        expect(typeof transition.props.children).to.equal('function');
        expect(focusTrap.type).to.equal('mantine-focus-trap');
        expect(initialFocus.type).to.equal('mantine-focus-trap-initial-focus');
        expect(floatingArrow.type).to.equal('mantine-floating-arrow');
        expect(floatingIndicator.type).to.equal('mantine-floating-indicator');
        expect(nativeScrollArea.type).to.equal('mantine-native-scroll-area');
        expect(removeScroll.type).to.equal('mantine-remove-scroll');
        expect(alert.type).to.equal('mantine-alert');
        expect(loader.type).to.equal('mantine-group');
        expect(progress.type).to.equal('mantine-progress');
        expect(progress.props.value).to.equal(42);
        expect(progressSection.type).to.equal('mantine-progress-section');
        expect(progressSection.props.value).to.equal(35);
        expect(progressLabel.type).to.equal('mantine-progress-label');
        expect(ringProgress.type).to.equal('mantine-ring-progress');
        expect(ringProgress.props.sections).to.deep.equal([{ value: 72, color: 'green' }]);
        expect(skeleton.type).to.equal('mantine-skeleton');
        expect(skeleton.props.h).to.equal(40);
        expect(backgroundImage.type).to.equal('mantine-background-image');
        expect(backgroundImage.props.p).to.equal('lg');
        expect(image.type).to.equal('mantine-image');
        expect(avatarGroup.type).to.equal('mantine-avatar-group');
        expect(themeIcon.type).to.equal('mantine-theme-icon');
        expect(icon.type).to.equal('mantine-theme-icon');
        expect(checkIcon.type).to.equal('mantine-check-icon');
        expect(closeIcon.type).to.equal('mantine-close-icon');
        expect(radioIcon.type).to.equal('mantine-radio-icon');
        expect(accordionChevron.type).to.equal('mantine-accordion-chevron');

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

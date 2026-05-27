import { expect } from 'chai';
import { createBuilderDocument, type BuilderDocument } from '@cybervinci/builder-schema';
import { BuilderHtmlRenderError, htmlRenderer } from './index';

describe('builder htmlRenderer', () => {

    it('exports a Builder document to index.html and styles.css', () => {
        const document: BuilderDocument = {
            ...createBuilderDocument({ id: 'landing', title: 'Landing' }),
            tree: {
                id: 'page',
                type: 'Page',
                props: { title: 'Landing' },
                children: [
                    {
                        id: 'hero',
                        type: 'HeroSection',
                        props: {
                            title: 'Build interfaces',
                            subtitle: 'Exported without React.',
                            primaryActionLabel: 'Start'
                        }
                    },
                    {
                        id: 'features',
                        type: 'FeatureGrid',
                        props: {
                            title: 'Features',
                            features: [
                                { title: 'Schema first', description: 'Builder stays canonical.' }
                            ]
                        }
                    }
                ]
            }
        };

        const result = htmlRenderer(document);

        expect(result.files['index.html']).to.contain('<title>Landing</title>');
        expect(result.files['index.html']).to.contain('Build interfaces');
        expect(result.files['index.html']).to.contain('Start');
        expect(result.files['index.html']).to.contain('Schema first');
        expect(result.files['index.html']).to.contain('builder-hero-section');
        expect(result.files['styles.css']).to.contain('.builder-card');
    });

    it('rejects oversized documents before recursive HTML export', () => {
        const document = createBuilderDocument({ id: 'large-export' });
        document.tree.children = Array.from({ length: 2001 }, (_value, index) => ({
            id: `item-${index}`,
            type: 'Text',
            props: {
                children: `Item ${index}`
            }
        }));

        expect(() => htmlRenderer(document)).to.throw(BuilderHtmlRenderError, 'Cannot export invalid Builder document to HTML.');
    });

    it('exports MVP Layout components with semantic tags and predictable classes', () => {
        const document: BuilderDocument = {
            ...createBuilderDocument({ id: 'layout', title: 'Layout' }),
            tree: {
                id: 'page',
                type: 'Page',
                children: [
                    {
                        id: 'top',
                        type: 'Section',
                        props: {
                            component: 'header',
                            paddingY: 'lg',
                            withBorder: true
                        },
                        children: [
                            {
                                id: 'container',
                                type: 'Container',
                                props: { size: 'xl', padding: 'sm' },
                                children: [
                                    {
                                        id: 'stack',
                                        type: 'Stack',
                                        props: { gap: 'lg', align: 'center' },
                                        children: [
                                            {
                                                id: 'group',
                                                type: 'Group',
                                                props: { gap: 'sm', justify: 'space-between', wrap: false },
                                                children: [
                                                    { id: 'box', type: 'Box', props: { component: 'nav', padding: 'xs' } }
                                                ]
                                            },
                                            {
                                                id: 'grid',
                                                type: 'SimpleGrid',
                                                props: { cols: 2, spacing: 'lg' },
                                                children: [
                                                    { id: 'card-a', type: 'Card', props: { padding: 'xl', withBorder: true } },
                                                    { id: 'card-b', type: 'Card' }
                                                ]
                                            },
                                            { id: 'divider', type: 'Divider', props: { label: 'More', variant: 'dashed' } },
                                            { id: 'space', type: 'Space', props: { size: 'xl' } }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        };

        const result = htmlRenderer(document);

        expect(result.files['index.html']).to.contain('<header id="top"');
        expect(result.files['index.html']).to.contain('builder-section--padding-y-lg');
        expect(result.files['index.html']).to.contain('builder-container--size-xl');
        expect(result.files['index.html']).to.contain('builder-stack--gap-lg');
        expect(result.files['index.html']).to.contain('builder-group--nowrap');
        expect(result.files['index.html']).to.contain('<nav id="box"');
        expect(result.files['index.html']).to.contain('builder-simple-grid--cols-2');
        expect(result.files['index.html']).to.contain('<article id="card-a"');
        expect(result.files['index.html']).to.contain('role="separator"');
        expect(result.files['styles.css']).to.contain('#grid {');
        expect(result.files['styles.css']).to.contain('grid-template-columns: repeat(2, minmax(0, 1fr));');
        expect(result.files['styles.css']).to.contain('#space { height: var(--builder-spacing-xl); width: 100%; }');
    });

    it('exports nested children and named slots from the canonical Builder tree', () => {
        const document: BuilderDocument = {
            ...createBuilderDocument({ id: 'slots', title: 'Slots' }),
            tree: {
                id: 'page',
                type: 'Page',
                slots: {
                    header: [
                        { id: 'page-header', type: 'Text', props: { children: 'Global header' } }
                    ],
                    footer: [
                        { id: 'page-footer', type: 'Text', props: { children: 'Global footer' } }
                    ]
                },
                children: [
                    {
                        id: 'section',
                        type: 'Section',
                        slots: {
                            header: [
                                { id: 'section-title', type: 'Title', props: { children: 'Section title', order: 2 } }
                            ],
                            footer: [
                                { id: 'section-note', type: 'Text', props: { children: 'Section note' } }
                            ]
                        },
                        children: [
                            {
                                id: 'card',
                                type: 'Card',
                                slots: {
                                    header: [
                                        { id: 'card-title', type: 'Title', props: { children: 'Card title', order: 3 } }
                                    ],
                                    actions: [
                                        { id: 'card-action', type: 'Button', props: { children: 'Open' } }
                                    ],
                                    footer: [
                                        { id: 'card-footer', type: 'Text', props: { children: 'Card footer' } }
                                    ]
                                },
                                children: [
                                    {
                                        id: 'nested-stack',
                                        type: 'Stack',
                                        children: [
                                            { id: 'nested-copy', type: 'Text', props: { children: 'Nested body' } }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        };

        const result = htmlRenderer(document);
        const html = result.files['index.html'];

        expect(html).to.contain('builder-slot builder-slot-header');
        expect(html).to.contain('builder-slot builder-slot-actions');
        expect(html).to.contain('builder-slot builder-slot-footer');
        expect(html.indexOf('Global header')).to.be.lessThan(html.indexOf('Section title'));
        expect(html.indexOf('Section title')).to.be.lessThan(html.indexOf('Card title'));
        expect(html.indexOf('Card title')).to.be.lessThan(html.indexOf('Nested body'));
        expect(html.indexOf('Nested body')).to.be.lessThan(html.indexOf('Open'));
        expect(html.indexOf('Open')).to.be.lessThan(html.indexOf('Card footer'));
        expect(html.indexOf('Card footer')).to.be.lessThan(html.indexOf('Section note'));
        expect(html.indexOf('Section note')).to.be.lessThan(html.indexOf('Global footer'));
    });

    it('generates styles.css from canonical theme tokens, component defaults, and node styles', () => {
        const document: BuilderDocument = {
            ...createBuilderDocument({ id: 'styled', title: 'Styled' }),
            theme: {
                mode: 'dark',
                primaryColor: '#0ea5e9',
                radius: 'lg',
                fontFamily: 'Arial, sans-serif',
                spacing: {
                    xs: 2,
                    sm: 6,
                    md: 18,
                    lg: 28,
                    xl: 40
                },
                tokens: {
                    surfaceRaised: '#111827',
                    ignoredObject: { unsafe: true }
                }
            },
            tree: {
                id: 'page',
                type: 'Page',
                children: [
                    {
                        id: 'panel',
                        type: 'Card',
                        props: { withBorder: false },
                        style: {
                            className: 'custom-panel',
                            css: {
                                background: 'token.surfaceRaised',
                                padding: '24px'
                            },
                            responsive: {
                                sm: {
                                    css: {
                                        padding: '32px'
                                    }
                                }
                            }
                        }
                    },
                    {
                        id: 'default-grid',
                        type: 'SimpleGrid'
                    }
                ]
            }
        };

        const result = htmlRenderer(document);
        const css = result.files['styles.css'];

        expect(css).to.contain('--builder-font-family: Arial, sans-serif;');
        expect(css).to.contain('--builder-primary-color: #0ea5e9;');
        expect(css).to.contain('--builder-token-surface-raised: #111827;');
        expect(css).not.to.contain('--builder-token-ignored-object');
        expect(css).to.contain('#panel { padding: 24px; border: 0; border-radius: var(--builder-spacing-sm); background: var(--builder-token-surface-raised); }');
        expect(css).to.contain('@media (min-width: 48em) { #panel { padding: 32px; } }');
        expect(css).to.contain('#default-grid { gap: var(--builder-spacing-md); row-gap: var(--builder-spacing-md); grid-template-columns: repeat(3, minmax(0, 1fr)); }');
        expect(result.files['index.html']).to.contain('custom-panel');
    });

    it('exports Typography, Form, Navigation, Feedback, Media, Marketing, and Dashboard MVP components', () => {
        const document: BuilderDocument = {
            ...createBuilderDocument({ id: 'mvp', title: 'MVP' }),
            tree: {
                id: 'page',
                type: 'Page',
                children: [
                    { id: 'title', type: 'Title', props: { children: 'Dashboard landing', order: 1, align: 'center' } },
                    { id: 'copy', type: 'Text', props: { children: 'Safe body copy', italic: true } },
                    { id: 'badge', type: 'Badge', props: { children: 'Beta' } },
                    { id: 'list', type: 'List', props: { items: ['One', 'Two'], type: 'ordered' } },
                    { id: 'markdown', type: 'Markdown', props: { content: 'Safe markdown\n\n**Text**' } },
                    {
                        id: 'form',
                        type: 'DynamicForm',
                        props: { title: 'Contact', description: 'Tell us more', submitLabel: 'Send', resetLabel: 'Clear' },
                        children: [
                            { id: 'email', type: 'TextInput', props: { name: 'email', label: 'Email', type: 'email', required: true } },
                            { id: 'message', type: 'Textarea', props: { name: 'message', label: 'Message', defaultValue: 'Hello' } },
                            { id: 'plan', type: 'Select', props: { name: 'plan', label: 'Plan', defaultValue: 'pro', data: [{ label: 'Pro', value: 'pro' }] } },
                            { id: 'agree', type: 'Checkbox', props: { name: 'agree', label: 'Agree', defaultChecked: true } },
                            { id: 'size', type: 'RadioGroup', props: { name: 'size', label: 'Size', defaultValue: 'm', data: [{ label: 'Medium', value: 'm' }] } },
                            { id: 'count', type: 'NumberInput', props: { name: 'count', label: 'Count', min: 1, max: 5 } },
                            { id: 'date', type: 'DateInput', props: { name: 'date', label: 'Date', defaultValue: '2026-05-20' } },
                            { id: 'button', type: 'Button', props: { children: 'Inline action', type: 'button' } }
                        ]
                    },
                    { id: 'anchor', type: 'Anchor', props: { children: 'Docs', href: '/docs' } },
                    { id: 'nav', type: 'NavLink', props: { label: 'Home', href: '/', items: [{ label: 'Settings', href: '/settings' }] } },
                    { id: 'crumbs', type: 'Breadcrumbs', props: { items: [{ label: 'Home', href: '/' }, { label: 'MVP' }], separator: '>' } },
                    { id: 'tabs', type: 'Tabs', props: { defaultValue: 'item-1', tabs: [{ label: 'Overview', href: 'overview' }] } },
                    { id: 'alert', type: 'Alert', props: { title: 'Heads up', children: 'Alert copy' } },
                    { id: 'notice', type: 'NotificationBlock', props: { title: 'Saved', message: 'Notification copy' } },
                    { id: 'loader', type: 'Loader', props: { label: 'Loading data' } },
                    { id: 'image', type: 'Image', props: { src: 'https://example.com/image.png', alt: 'Preview', width: 320, fit: 'cover' } },
                    { id: 'avatar', type: 'Avatar', props: { src: 'https://example.com/avatar.png', name: 'Ada' } },
                    { id: 'icon', type: 'Icon', props: { name: 'sparkles', label: 'Sparkles' } },
                    { id: 'hero', type: 'HeroSection', props: { title: 'Launch', subtitle: 'Ship pages', imageSrc: 'https://example.com/hero.png', primaryActionLabel: 'Start', secondaryActionLabel: 'Learn' } },
                    { id: 'pricing', type: 'PricingSection', props: { title: 'Pricing', plans: [{ name: 'Pro', price: '$20', features: ['Export'], ctaLabel: 'Buy' }] } },
                    { id: 'testimonials', type: 'TestimonialSection', props: { title: 'Loved', testimonials: [{ quote: 'Great', author: 'Customer' }] } },
                    { id: 'cta', type: 'CTASection', props: { title: 'Ready?', description: 'Continue now', primaryActionLabel: 'Continue', secondaryActionLabel: 'Later' } },
                    { id: 'chart', type: 'ChartPlaceholder', props: { title: 'Revenue', emptyText: 'No chart data', height: 280 } },
                    {
                        id: 'metrics',
                        type: 'MetricGrid',
                        props: { columns: 2 },
                        children: [
                            { id: 'metric', type: 'MetricCard', props: { label: 'MRR', value: '$42k', description: 'Monthly' } },
                            { id: 'stat', type: 'StatCard', props: { title: 'Users', value: 1200, subtitle: 'Active' } }
                        ]
                    },
                    { id: 'dash-header', type: 'DashboardHeader', props: { title: 'Ops', description: 'Live metrics', periodLabel: 'Today' } }
                ]
            }
        };

        const result = htmlRenderer(document);
        const html = result.files['index.html'];

        expect(html).to.contain('<h1 id="title"');
        expect(html).to.contain('<form id="form"');
        expect(html).to.contain('type="email"');
        expect(html).to.contain('required');
        expect(html).to.contain('aria-label="Email"');
        expect(html).to.contain('<textarea id="message"');
        expect(html).to.contain('<select id="plan"');
        expect(html).to.contain('checked');
        expect(html).to.contain('role="tablist"');
        expect(html).to.contain('role="tab"');
        expect(html).to.contain('aria-controls="item-1-panel"');
        expect(html).to.contain('role="tabpanel"');
        expect(html).to.contain('role="status"');
        expect(html).to.contain('aria-live="polite"');
        expect(html).to.contain('Alert copy');
        expect(html).to.contain('Loading data');
        expect(html).to.contain('src="https://example.com/hero.png"');
        expect(html).to.contain('Learn');
        expect(html).to.contain('$20');
        expect(html).to.contain('No chart data');
        expect(html).to.contain('$42k');
        expect(result.files['styles.css']).to.contain('#metrics { grid-template-columns: repeat(2, minmax(0, 1fr));');
        expect(html).not.to.contain('<script>');
    });

    it('exports accessible field errors when a field has an error prop', () => {
        const document: BuilderDocument = {
            ...createBuilderDocument({ id: 'field-error', title: 'Field Error' }),
            tree: {
                id: 'page',
                type: 'Page',
                children: [
                    { id: 'email', type: 'TextInput', props: { name: 'email', label: 'Email', error: 'Email is required' } }
                ]
            }
        };

        const result = htmlRenderer(document, { validate: false });
        const html = result.files['index.html'];

        expect(html).to.contain('aria-invalid="true"');
        expect(html).to.contain('aria-errormessage="email-error"');
        expect(html).to.contain('id="email-error"');
        expect(html).to.contain('role="alert"');
    });

    it('escapes text and strips unsafe urls', () => {
        const document: BuilderDocument = {
            ...createBuilderDocument({ id: 'safe', title: 'Safe' }),
            tree: {
                id: 'page',
                type: 'Page',
                children: [
                    {
                        id: 'cta',
                        type: 'HeroSection',
                        props: {
                            title: '<script>alert(1)</script>',
                            primaryActionLabel: 'Go',
                            primaryActionHref: 'javascript:alert(1)'
                        }
                    }
                ]
            }
        };

        const result = htmlRenderer(document, { validate: false });

        expect(result.files['index.html']).to.contain('&lt;script&gt;alert(1)&lt;/script&gt;');
        expect(result.files['index.html']).to.contain('href="#"');
        expect(result.files['index.html']).not.to.contain('javascript:alert');
    });

    it('sanitizes Markdown HTML and URL attributes before export', () => {
        const document: BuilderDocument = {
            ...createBuilderDocument({ id: 'markdown-safe', title: 'Markdown Safe' }),
            tree: {
                id: 'page',
                type: 'Page',
                children: [
                    {
                        id: 'markdown',
                        type: 'Markdown',
                        props: {
                            allowHtml: true,
                            linkTarget: '_blank',
                            content: [
                                '<strong onclick="alert(1)">Safe text</strong>',
                                '<a href="java&#x73;cript:alert(1)" title="<bad>">Bad link</a>',
                                '<a href="https://example.com?q=<x>">Good link</a>',
                                '<img src=x onerror=alert(1)>',
                                '<svg><script>alert(1)</script></svg>',
                                '<iframe src="https://example.com"></iframe>'
                            ].join('\n\n')
                        }
                    },
                    {
                        id: 'image',
                        type: 'Image',
                        props: {
                            src: 'data:text/html,<script>alert(1)</script>',
                            alt: 'Preview" onerror="alert(1)'
                        }
                    },
                    {
                        id: 'anchor',
                        type: 'Anchor',
                        props: {
                            children: 'Entity URL',
                            href: 'java&#115;cript:alert(1)'
                        }
                    }
                ]
            }
        };

        const result = htmlRenderer(document, { validate: false });
        const html = result.files['index.html'];

        expect(html).to.contain('<strong>Safe text</strong>');
        expect(html).to.contain('<a href="#" title="&lt;bad&gt;" target="_blank" rel="noopener noreferrer">Bad link</a>');
        expect(html).to.contain('<a href="https://example.com?q=&lt;x&gt;" target="_blank" rel="noopener noreferrer">Good link</a>');
        expect(html).to.contain('&lt;img src=x onerror=alert(1)&gt;');
        expect(html).to.contain('&lt;svg&gt;&lt;script&gt;alert(1)&lt;/script&gt;&lt;/svg&gt;');
        expect(html).to.contain('&lt;iframe src=&quot;https://example.com&quot;&gt;&lt;/iframe&gt;');
        expect(html).to.contain('alt="Preview&quot; onerror=&quot;alert(1)"');
        expect(html).not.to.contain('<script>');
        expect(html).not.to.contain('<iframe');
        expect(html).not.to.contain('<img src=x');
        expect(html).not.to.contain('javascript:');
        expect(html).not.to.contain('data:text/html');
        expect(html).not.to.contain('onclick=');
    });

    it('rejects unknown components when validation is enabled', () => {
        const document: BuilderDocument = {
            ...createBuilderDocument({ id: 'invalid', title: 'Invalid' }),
            tree: {
                id: 'page',
                type: 'Page',
                children: [
                    {
                        id: 'unknown',
                        type: 'UnknownPremiumWidget'
                    }
                ]
            }
        };

        expect(() => htmlRenderer(document)).to.throw(BuilderHtmlRenderError);
    });

    it('uses a safe fallback for unsupported components when validation is disabled', () => {
        const document: BuilderDocument = {
            ...createBuilderDocument({ id: 'fallback', title: 'Fallback' }),
            tree: {
                id: 'page',
                type: 'Page',
                children: [
                    {
                        id: 'unknown',
                        type: 'UnknownPremiumWidget',
                        props: {
                            children: '<img src=x onerror=alert(1)>'
                        }
                    }
                ]
            }
        };

        const result = htmlRenderer(document, { validate: false });

        expect(result.files['index.html']).to.contain('builder-unsupported-component');
        expect(result.files['index.html']).to.contain('data-builder-unsupported="UnknownPremiumWidget"');
        expect(result.files['index.html']).to.contain('Unsupported component: UnknownPremiumWidget');
        expect(result.files['index.html']).not.to.contain('onerror');
    });
});

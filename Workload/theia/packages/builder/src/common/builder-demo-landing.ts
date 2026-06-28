import {
    createBuilderDocument,
    type BuilderDocument,
    type BuilderNode
} from '@cybervinci/builder-schema';

export const BUILDER_DEMO_LANDING_PAGE_BASENAME = 'cybervinci-landing-demo';
export const BUILDER_DEMO_LANDING_PAGE_TITLE = 'CyberVinci Launch Studio';
export const BUILDER_DEMO_LANDING_PAGE_VERSION = '2026-06-04-spacing-2';

const DEMO_IMAGE_SRC = 'https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1200&q=80';

export interface CreateBuilderDemoLandingDocumentOptions {
    id?: string;
    route?: string;
    createdBy?: string;
}

export function createBuilderDemoLandingDocument(options: CreateBuilderDemoLandingDocumentOptions = {}): BuilderDocument {
    const id = options.id ?? BUILDER_DEMO_LANDING_PAGE_BASENAME;
    const document = createBuilderDocument({
        id,
        name: BUILDER_DEMO_LANDING_PAGE_TITLE,
        title: BUILDER_DEMO_LANDING_PAGE_TITLE,
        route: options.route ?? '/launch-studio',
        layout: 'marketing',
        createdBy: options.createdBy ?? 'CyberVinci Builder demo'
    });

    return {
        ...document,
        metadata: {
            ...document.metadata,
            name: BUILDER_DEMO_LANDING_PAGE_TITLE,
            description: 'Polished sample landing page loaded by default in the CyberVinci Builder.',
            builderDemoVersion: BUILDER_DEMO_LANDING_PAGE_VERSION,
            tags: ['demo', 'landing-page', 'builder']
        },
        page: {
            ...document.page,
            title: BUILDER_DEMO_LANDING_PAGE_TITLE,
            description: 'A complete sample landing page to exercise Builder editing, preview, properties, data, actions and export.'
        },
        theme: {
            mode: 'light',
            primaryColor: 'teal',
            radius: 'md',
            fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
            spacing: {
                xs: 6,
                sm: 10,
                md: 18,
                lg: 28,
                xl: 42
            },
            tokens: {
                surface: '#ffffff',
                surfaceMuted: '#f3faf8',
                surfaceWarm: '#fff7ed',
                ink: '#12201f',
                muted: '#5c6f6c',
                brand: '#0f766e',
                accent: '#ff7a59',
                highlight: '#d9f99d'
            }
        },
        dataSources: {
            launchMetrics: {
                type: 'static',
                description: 'Static metrics used by the sample page.',
                config: {
                    data: [
                        { label: 'Qualified leads', value: '+48%', trend: 'up' },
                        { label: 'Build time saved', value: '32h', trend: 'up' },
                        { label: 'Launch score', value: '96', trend: 'neutral' }
                    ]
                }
            }
        },
        actions: {
            startTrial: {
                type: 'navigate',
                description: 'Jump to the sign-up CTA section.',
                params: {
                    to: '#signup',
                    target: 'self'
                }
            },
            viewFeatures: {
                type: 'navigate',
                description: 'Jump to the feature section.',
                params: {
                    to: '#features',
                    target: 'self'
                }
            }
        },
        states: {
            selectedPlan: {
                description: 'Example local state for future pricing interactions.',
                initialValue: 'growth',
                persistent: false
            }
        },
        tree: {
            ...document.tree,
            props: {
                title: BUILDER_DEMO_LANDING_PAGE_TITLE,
                description: 'Sample landing page',
                fullWidth: true,
                background: '#f7fbfa'
            },
            style: {
                css: {
                    display: 'grid',
                    gap: 0,
                    background: '#f7fbfa',
                    color: '#12201f'
                }
            },
            children: [
                createHeaderSection(),
                createHeroSection(),
                createMetricsSection(),
                createFeatureSection(),
                createWorkflowSection(),
                createPricingSection(),
                createTestimonialSection(),
                createSignupSection(),
                createFooterSection()
            ]
        }
    };
}

function createHeaderSection(): BuilderNode {
    return {
        id: 'demo-header',
        type: 'Section',
        props: {
            component: 'header',
            paddingY: 'sm',
            fullWidth: true,
            background: 'rgba(255, 255, 255, 0.88)'
        },
        style: {
            css: {
                position: 'sticky',
                top: 0,
                zIndex: 10,
                padding: '10px 0',
                backdropFilter: 'blur(18px)',
                borderBottom: '1px solid rgba(15, 118, 110, 0.16)'
            }
        },
        children: [{
            id: 'demo-header-container',
            type: 'Container',
            props: {
                size: 'xl',
                padding: 'md'
            },
            children: [{
                id: 'demo-header-layout',
                type: 'Group',
                props: {
                    justify: 'space-between',
                    align: 'center',
                    gap: 'md',
                    wrap: true
                },
                children: [
                    {
                        id: 'demo-brand',
                        type: 'Group',
                        props: {
                            gap: 'sm',
                            align: 'center',
                            wrap: false
                        },
                        children: [
                            {
                                id: 'demo-brand-mark',
                                type: 'Box',
                                props: {
                                    component: 'span',
                                    radius: 'lg'
                                },
                                style: {
                                    css: {
                                        width: 36,
                                        height: 36,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: 'linear-gradient(135deg, #0f766e 0%, #ff7a59 100%)',
                                        color: '#ffffff',
                                        fontWeight: 800,
                                        boxShadow: '0 12px 30px rgba(15, 118, 110, 0.25)'
                                    }
                                },
                                children: [{
                                    id: 'demo-brand-mark-text',
                                    type: 'Text',
                                    props: {
                                        children: 'CV',
                                        component: 'span',
                                        size: 'sm',
                                        weight: 800
                                    },
                                    style: {
                                        css: {
                                            margin: 0,
                                            color: '#ffffff'
                                        }
                                    }
                                }]
                            },
                            {
                                id: 'demo-brand-name',
                                type: 'Text',
                                props: {
                                    children: 'Launch Studio',
                                    component: 'span',
                                    size: 'lg',
                                    weight: 800
                                },
                                style: {
                                    css: {
                                        color: '#12201f',
                                        letterSpacing: 0
                                    }
                                }
                            }
                        ]
                    },
                    {
                        id: 'demo-nav',
                        type: 'Group',
                        props: {
                            gap: 'lg',
                            align: 'center',
                            wrap: true
                        },
                        children: [
                            navLink('demo-nav-features', 'Features', '#features'),
                            navLink('demo-nav-workflow', 'Workflow', '#workflow'),
                            navLink('demo-nav-pricing', 'Pricing', '#pricing'),
                            {
                                id: 'demo-nav-cta',
                                type: 'Button',
                                props: {
                                    children: 'Open CTA',
                                    variant: 'filled',
                                    color: 'teal',
                                    radius: 'xl',
                                    size: 'sm'
                                },
                                events: {
                                    onClick: {
                                        actionId: 'startTrial'
                                    }
                                }
                            }
                        ]
                    }
                ]
            }]
        }]
    };
}

function createHeroSection(): BuilderNode {
    return {
        id: 'demo-hero',
        type: 'Section',
        props: {
            component: 'section',
            paddingY: 'xl',
            fullWidth: true,
            background: 'linear-gradient(135deg, #062a2f 0%, #0f766e 50%, #ff7a59 145%)'
        },
        style: {
            css: {
                padding: '84px 0 92px',
                minHeight: 680,
                overflow: 'hidden'
            }
        },
        children: [{
            id: 'demo-hero-container',
            type: 'Container',
            props: {
                size: 'xl',
                padding: 'md'
            },
            children: [{
                id: 'demo-hero-layout',
                type: 'Group',
                props: {
                    justify: 'space-between',
                    align: 'center',
                    gap: 'xl',
                    wrap: true
                },
                style: {
                    css: {
                        minHeight: 560
                    }
                },
                children: [
                    {
                        id: 'demo-hero-copy',
                        type: 'Stack',
                        props: {
                            gap: 'lg',
                            align: 'flex-start'
                        },
                        style: {
                            css: {
                                maxWidth: 620,
                                flex: '1 1 420px'
                            }
                        },
                        children: [
                            {
                                id: 'demo-hero-badge',
                                type: 'Badge',
                                props: {
                                    children: 'New Builder demo',
                                    color: 'lime',
                                    variant: 'light',
                                    radius: 'xl',
                                    size: 'lg'
                                },
                                style: {
                                    css: {
                                        color: '#12201f',
                                        background: '#d9f99d'
                                    }
                                }
                            },
                            {
                                id: 'demo-hero-title',
                                type: 'Title',
                                props: {
                                    children: 'Launch pages faster with a visual builder that stays structured.',
                                    order: 1,
                                    weight: 900
                                },
                                style: {
                                    css: {
                                        color: '#ffffff',
                                        fontSize: 58,
                                        lineHeight: 1.02,
                                        maxWidth: 760,
                                        margin: 0
                                    }
                                }
                            },
                            {
                                id: 'demo-hero-subtitle',
                                type: 'Text',
                                props: {
                                    children: 'This sample page shows nested sections, editable props, theme tokens, data records, actions, responsive grids and export-ready Builder JSON in one polished canvas.',
                                    size: 'xl'
                                },
                                style: {
                                    css: {
                                        color: 'rgba(255, 255, 255, 0.84)',
                                        lineHeight: 1.65,
                                        maxWidth: 650,
                                        margin: 0
                                    }
                                }
                            },
                            {
                                id: 'demo-hero-actions',
                                type: 'Group',
                                props: {
                                    gap: 'md',
                                    align: 'center',
                                    wrap: true
                                },
                                children: [
                                    {
                                        id: 'demo-primary-action',
                                        type: 'Button',
                                        props: {
                                            children: 'Start from this page',
                                            variant: 'filled',
                                            color: 'orange',
                                            size: 'lg',
                                            radius: 'xl'
                                        },
                                        style: {
                                            css: {
                                                boxShadow: '0 18px 42px rgba(249, 115, 22, 0.28)'
                                            }
                                        },
                                        events: {
                                            onClick: {
                                                actionId: 'startTrial'
                                            }
                                        }
                                    },
                                    {
                                        id: 'demo-secondary-action',
                                        type: 'Button',
                                        props: {
                                            children: 'Explore features',
                                            variant: 'white',
                                            color: 'dark',
                                            size: 'lg',
                                            radius: 'xl'
                                        },
                                        events: {
                                            onClick: {
                                                actionId: 'viewFeatures'
                                            }
                                        }
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        id: 'demo-hero-visual',
                        type: 'Card',
                        props: {
                            padding: 'sm',
                            radius: 'xl',
                            shadow: 'xl',
                            background: 'rgba(255, 255, 255, 0.94)'
                        },
                        style: {
                            css: {
                                flex: '1 1 360px',
                                maxWidth: 520,
                                overflow: 'hidden',
                                boxShadow: '0 34px 90px rgba(6, 42, 47, 0.36)'
                            }
                        },
                        children: [
                            {
                                id: 'demo-hero-image',
                                type: 'Image',
                                props: {
                                    src: DEMO_IMAGE_SRC,
                                    alt: 'Team working on a launch dashboard',
                                    fit: 'cover',
                                    radius: 'lg',
                                    height: 330
                                },
                                style: {
                                    css: {
                                        width: '100%',
                                        display: 'block'
                                    }
                                }
                            },
                            {
                                id: 'demo-hero-visual-content',
                                type: 'Stack',
                                props: {
                                    gap: 'md',
                                    align: 'stretch'
                                },
                                style: {
                                    css: {
                                        padding: '22px 20px 18px'
                                    }
                                },
                                children: [
                                    {
                                        id: 'demo-hero-card-label',
                                        type: 'Badge',
                                        props: {
                                            children: 'Live page health',
                                            color: 'teal',
                                            variant: 'light',
                                            radius: 'xl'
                                        }
                                    },
                                    {
                                        id: 'demo-hero-card-title',
                                        type: 'Title',
                                        props: {
                                            children: 'Everything remains editable.',
                                            order: 3,
                                            weight: 800
                                        },
                                        style: {
                                            css: {
                                                margin: 0,
                                                color: '#12201f'
                                            }
                                        }
                                    },
                                    {
                                        id: 'demo-hero-card-copy',
                                        type: 'Text',
                                        props: {
                                            children: 'Select any layer, inspect its props, change theme tokens or switch to JSON to see the canonical page contract.',
                                            size: 'md'
                                        },
                                        style: {
                                            css: {
                                                color: '#5c6f6c',
                                                lineHeight: 1.55,
                                                margin: 0
                                            }
                                        }
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }]
        }]
    };
}

function createMetricsSection(): BuilderNode {
    return {
        id: 'demo-metrics',
        type: 'Section',
        props: {
            component: 'section',
            paddingY: 'lg',
            fullWidth: true,
            background: '#f7fbfa'
        },
        children: [{
            id: 'demo-metrics-container',
            type: 'Container',
            props: {
                size: 'xl',
                padding: 'md'
            },
            style: {
                css: {
                    paddingTop: 48,
                    paddingBottom: 48
                }
            },
            children: [{
                id: 'demo-metric-grid',
                type: 'MetricGrid',
                props: {
                    columns: 3,
                    spacing: 'md'
                },
                style: {
                    css: {
                        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))'
                    }
                },
                children: [
                    metricCard('demo-metric-one', 'Conversion lift', '+42%', 'After replacing static mockups with editable Builder pages.', 'up', '+12 pts', 'teal'),
                    metricCard('demo-metric-two', 'Sections edited', '9', 'Hero, feature, workflow, pricing, proof, CTA and footer.', 'neutral', 'ready', 'orange'),
                    metricCard('demo-metric-three', 'Schema errors', '0', 'The demo page is generated from valid Builder components.', 'neutral', 'validated', 'lime')
                ]
            }]
        }]
    };
}

function createFeatureSection(): BuilderNode {
    return {
        id: 'features',
        type: 'Section',
        props: {
            component: 'section',
            paddingY: 'xl',
            fullWidth: true,
            background: '#ffffff'
        },
        style: {
            css: {
                padding: '88px 0'
            }
        },
        children: [{
            id: 'demo-features-container',
            type: 'Container',
            props: {
                size: 'xl',
                padding: 'md'
            },
            children: [{
                id: 'demo-features',
                type: 'FeatureGrid',
                props: {
                    title: 'Built to show the Builder workflow at a glance',
                    description: 'The page combines visual blocks with real schema-backed components so every part can be selected, edited, validated and exported.',
                    columns: 3,
                    features: [
                        {
                            title: 'Visual composition',
                            description: 'Nested sections, cards, grids and typography make the layer tree useful immediately.'
                        },
                        {
                            title: 'Inspectable props',
                            description: 'Headlines, badges, actions, images and pricing content are all editable in the property panel.'
                        },
                        {
                            title: 'Portable schema',
                            description: 'The same document powers preview, JSON editing, AI patches and static export.'
                        }
                    ]
                },
                style: {
                    css: {
                        display: 'grid',
                        gap: 34,
                        padding: '18px 0'
                    }
                },
                children: [
                    {
                        id: 'demo-features-title',
                        type: 'Title',
                        props: {
                            children: 'Built to show the Builder workflow at a glance',
                            order: 2,
                            weight: 900
                        },
                        style: {
                            css: {
                                maxWidth: 760,
                                margin: '0 auto',
                                color: '#12201f',
                                fontSize: 40,
                                lineHeight: 1.12,
                                textAlign: 'center'
                            }
                        }
                    },
                    {
                        id: 'demo-features-copy',
                        type: 'Text',
                        props: {
                            children: 'The page combines visual blocks with real schema-backed components so every part can be selected, edited, validated and exported.',
                            size: 'lg'
                        },
                        style: {
                            css: {
                                maxWidth: 760,
                                margin: '0 auto',
                                color: '#5c6f6c',
                                lineHeight: 1.7,
                                textAlign: 'center'
                            }
                        }
                    },
                    {
                        id: 'demo-features-grid',
                        type: 'SimpleGrid',
                        props: {
                            cols: 3,
                            spacing: 'lg',
                            verticalSpacing: 'lg'
                        },
                        style: {
                            css: {
                                marginTop: 8,
                                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))'
                            }
                        },
                        children: [
                            featureCard('demo-feature-compose', 'Visual composition', 'Nested sections, cards, grids and typography make the layer tree useful immediately.'),
                            featureCard('demo-feature-inspect', 'Inspectable props', 'Headlines, badges, actions, images and pricing content are all editable in the property panel.'),
                            featureCard('demo-feature-portable', 'Portable schema', 'The same document powers preview, JSON editing, AI patches and static export.')
                        ]
                    }
                ]
            }]
        }]
    };
}

function createWorkflowSection(): BuilderNode {
    return {
        id: 'workflow',
        type: 'Section',
        props: {
            component: 'section',
            paddingY: 'xl',
            fullWidth: true,
            background: '#f3faf8'
        },
        style: {
            css: {
                padding: '92px 0'
            }
        },
        children: [{
            id: 'demo-workflow-container',
            type: 'Container',
            props: {
                size: 'xl',
                padding: 'md'
            },
            children: [{
                id: 'demo-workflow-stack',
                type: 'Stack',
                props: {
                    gap: 'xl',
                    align: 'stretch'
                },
                children: [
                    sectionHeading('demo-workflow-heading', 'From idea to export without leaving Builder', 'Use this page to test the everyday loop: pick a layer, change props, preview responsive sizes, inspect JSON, then export.'),
                    {
                        id: 'demo-workflow-grid',
                        type: 'SimpleGrid',
                        props: {
                            cols: 3,
                            spacing: 'lg',
                            verticalSpacing: 'lg'
                        },
                        children: [
                            workflowCard('demo-workflow-plan', '01', 'Select a polished block', 'Open Layers or Components and select sections, cards, buttons or text directly from the page tree.'),
                            workflowCard('demo-workflow-edit', '02', 'Tune props and theme', 'Change colors, copy, spacing and data in the right panels while the live preview stays in sync.'),
                            workflowCard('demo-workflow-ship', '03', 'Export clean output', 'The canonical JSON can be saved, validated, patched by AI and exported as static HTML.')
                        ],
                        style: {
                            css: {
                                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))'
                            }
                        }
                    }
                ]
            }]
        }]
    };
}

function createPricingSection(): BuilderNode {
    return {
        id: 'pricing',
        type: 'Section',
        props: {
            component: 'section',
            paddingY: 'xl',
            fullWidth: true,
            background: '#ffffff'
        },
        style: {
            css: {
                padding: '92px 0'
            }
        },
        children: [{
            id: 'demo-pricing-container',
            type: 'Container',
            props: {
                size: 'xl',
                padding: 'md'
            },
            children: [{
                id: 'demo-pricing',
                type: 'PricingSection',
                props: {
                    title: 'A realistic pricing block, ready to edit',
                    description: 'Pricing plans are plain Builder props, so the property panel can update names, prices, feature lists and CTA labels.',
                    plans: [
                        {
                            name: 'Starter',
                            price: '$49',
                            description: 'For quick prototype launches.',
                            features: ['Visual page assembly', 'JSON preview', 'Static HTML export'],
                            ctaLabel: 'Choose Starter'
                        },
                        {
                            name: 'Growth',
                            price: '$149',
                            description: 'For teams shipping pages weekly.',
                            features: ['Everything in Starter', 'AI patch review', 'Reusable Builder blocks'],
                            ctaLabel: 'Choose Growth',
                            highlighted: true
                        },
                        {
                            name: 'Studio',
                            price: 'Custom',
                            description: 'For larger product surfaces.',
                            features: ['Design system mapping', 'Governed publishing', 'Team workflows'],
                            ctaLabel: 'Talk to us'
                        }
                    ]
                },
                style: {
                    css: {
                        display: 'grid',
                        gap: 34
                    }
                },
                children: [
                    {
                        id: 'demo-pricing-title',
                        type: 'Title',
                        props: {
                            children: 'A realistic pricing block, ready to edit',
                            order: 2,
                            weight: 900
                        },
                        style: {
                            css: {
                                maxWidth: 760,
                                margin: '0 auto',
                                color: '#12201f',
                                fontSize: 40,
                                lineHeight: 1.12,
                                textAlign: 'center'
                            }
                        }
                    },
                    {
                        id: 'demo-pricing-copy',
                        type: 'Text',
                        props: {
                            children: 'Pricing plans are plain Builder props, so the property panel can update names, prices, feature lists and CTA labels.',
                            size: 'lg'
                        },
                        style: {
                            css: {
                                maxWidth: 760,
                                margin: '0 auto',
                                color: '#5c6f6c',
                                lineHeight: 1.7,
                                textAlign: 'center'
                            }
                        }
                    },
                    {
                        id: 'demo-pricing-grid',
                        type: 'SimpleGrid',
                        props: {
                            cols: 3,
                            spacing: 'lg',
                            verticalSpacing: 'lg'
                        },
                        style: {
                            css: {
                                marginTop: 8,
                                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))'
                            }
                        },
                        children: [
                            pricingCard('demo-plan-starter', 'Starter', '$49', 'For quick prototype launches.', ['Visual page assembly', 'JSON preview', 'Static HTML export'], 'Choose Starter', false),
                            pricingCard('demo-plan-growth', 'Growth', '$149', 'For teams shipping pages weekly.', ['Everything in Starter', 'AI patch review', 'Reusable Builder blocks'], 'Choose Growth', true),
                            pricingCard('demo-plan-studio', 'Studio', 'Custom', 'For larger product surfaces.', ['Design system mapping', 'Governed publishing', 'Team workflows'], 'Talk to us', false)
                        ]
                    }
                ]
            }]
        }]
    };
}

function createTestimonialSection(): BuilderNode {
    return {
        id: 'demo-proof',
        type: 'Section',
        props: {
            component: 'section',
            paddingY: 'xl',
            fullWidth: true,
            background: '#fff7ed'
        },
        style: {
            css: {
                padding: '92px 0'
            }
        },
        children: [{
            id: 'demo-proof-container',
            type: 'Container',
            props: {
                size: 'xl',
                padding: 'md'
            },
            children: [{
                id: 'demo-testimonials',
                type: 'TestimonialSection',
                props: {
                    title: 'Designed for product teams that need momentum',
                    testimonials: [
                        {
                            quote: 'We can now review the live page structure, JSON and export in one place.',
                            author: 'Marina Costa',
                            role: 'Product Lead'
                        },
                        {
                            quote: 'The Builder page is useful immediately because every demo block is editable.',
                            author: 'Rafael Mendes',
                            role: 'Design Systems'
                        },
                        {
                            quote: 'It finally makes the full workflow visible before connecting real project data.',
                            author: 'Bianca Alves',
                            role: 'Frontend Engineer'
                        }
                    ]
                },
                style: {
                    css: {
                        display: 'grid',
                        gap: 34
                    }
                },
                children: [
                    {
                        id: 'demo-proof-title',
                        type: 'Text',
                        props: {
                            children: 'Designed for product teams that need momentum',
                            component: 'div',
                            weight: 900
                        },
                        style: {
                            css: {
                                maxWidth: 760,
                                margin: '0 auto',
                                color: '#12201f',
                                fontSize: 40,
                                lineHeight: 1.12,
                                textAlign: 'center'
                            }
                        }
                    },
                    {
                        id: 'demo-proof-grid',
                        type: 'SimpleGrid',
                        props: {
                            cols: 3,
                            spacing: 'lg',
                            verticalSpacing: 'lg'
                        },
                        style: {
                            css: {
                                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))'
                            }
                        },
                        children: [
                            testimonialCard('demo-testimonial-marina', 'We can now review the live page structure, JSON and export in one place.', 'Marina Costa', 'Product Lead'),
                            testimonialCard('demo-testimonial-rafael', 'The Builder page is useful immediately because every demo block is editable.', 'Rafael Mendes', 'Design Systems'),
                            testimonialCard('demo-testimonial-bianca', 'It finally makes the full workflow visible before connecting real project data.', 'Bianca Alves', 'Frontend Engineer')
                        ]
                    }
                ]
            }]
        }]
    };
}

function createSignupSection(): BuilderNode {
    return {
        id: 'signup',
        type: 'Section',
        props: {
            component: 'section',
            paddingY: 'xl',
            fullWidth: true,
            background: 'linear-gradient(135deg, #10201f 0%, #0f766e 58%, #d9f99d 160%)'
        },
        style: {
            css: {
                padding: '96px 0'
            }
        },
        children: [{
            id: 'demo-signup-container',
            type: 'Container',
            props: {
                size: 'lg',
                padding: 'md'
            },
            children: [{
                id: 'demo-cta',
                type: 'CTASection',
                props: {
                    title: 'Edit this landing page and see Builder come alive.',
                    description: 'Use the left panels to insert components, the right panels to inspect props and the preview mode to test the page before exporting.',
                    primaryActionLabel: 'Duplicate the hero',
                    secondaryActionLabel: 'Open JSON',
                    align: 'center'
                },
                style: {
                    css: {
                        display: 'grid',
                        gap: 24,
                        color: '#ffffff',
                        padding: '64px 32px',
                        textAlign: 'center'
                    }
                },
                children: [
                    {
                        id: 'demo-cta-title',
                        type: 'Title',
                        props: {
                            children: 'Edit this landing page and see Builder come alive.',
                            order: 2,
                            weight: 900
                        },
                        style: {
                            css: {
                                maxWidth: 760,
                                margin: '0 auto',
                                color: '#ffffff',
                                fontSize: 42,
                                lineHeight: 1.12
                            }
                        }
                    },
                    {
                        id: 'demo-cta-copy',
                        type: 'Text',
                        props: {
                            children: 'Use the left panels to insert components, the right panels to inspect props and the preview mode to test the page before exporting.',
                            size: 'lg'
                        },
                        style: {
                            css: {
                                maxWidth: 720,
                                margin: '0 auto',
                                color: 'rgba(255, 255, 255, 0.82)',
                                lineHeight: 1.7
                            }
                        }
                    },
                    {
                        id: 'demo-cta-actions',
                        type: 'Group',
                        props: {
                            justify: 'center',
                            gap: 'md',
                            wrap: true
                        },
                        style: {
                            css: {
                                marginTop: 8
                            }
                        },
                        children: [
                            {
                                id: 'demo-cta-primary',
                                type: 'Button',
                                props: {
                                    children: 'Duplicate the hero',
                                    variant: 'filled',
                                    color: 'orange',
                                    size: 'lg',
                                    radius: 'xl'
                                }
                            },
                            {
                                id: 'demo-cta-secondary',
                                type: 'Button',
                                props: {
                                    children: 'Open JSON',
                                    variant: 'white',
                                    color: 'dark',
                                    size: 'lg',
                                    radius: 'xl'
                                }
                            }
                        ]
                    }
                ]
            }]
        }]
    };
}

function createFooterSection(): BuilderNode {
    return {
        id: 'demo-footer',
        type: 'Section',
        props: {
            component: 'footer',
            paddingY: 'lg',
            fullWidth: true,
            background: '#10201f'
        },
        style: {
            css: {
                padding: '34px 0'
            }
        },
        children: [{
            id: 'demo-footer-container',
            type: 'Container',
            props: {
                size: 'xl',
                padding: 'md'
            },
            children: [{
                id: 'demo-footer-layout',
                type: 'Group',
                props: {
                    justify: 'space-between',
                    align: 'center',
                    gap: 'md',
                    wrap: true
                },
                children: [
                    {
                        id: 'demo-footer-copy',
                        type: 'Text',
                        props: {
                            children: 'CyberVinci Launch Studio - sample Builder landing page',
                            size: 'sm'
                        },
                        style: {
                            css: {
                                color: 'rgba(255, 255, 255, 0.72)',
                                margin: 0
                            }
                        }
                    },
                    {
                        id: 'demo-footer-links',
                        type: 'Group',
                        props: {
                            gap: 'lg',
                            wrap: true
                        },
                        children: [
                            navLink('demo-footer-features', 'Features', '#features', '#d9f99d'),
                            navLink('demo-footer-pricing', 'Pricing', '#pricing', '#d9f99d'),
                            navLink('demo-footer-signup', 'CTA', '#signup', '#d9f99d')
                        ]
                    }
                ]
            }]
        }]
    };
}

function navLink(id: string, children: string, href: string, color = '#12201f'): BuilderNode {
    return {
        id,
        type: 'Anchor',
        props: {
            children,
            href,
            underline: 'never',
            color
        },
        style: {
            css: {
                fontWeight: 700
            }
        }
    };
}

function metricCard(
    id: string,
    label: string,
    value: string,
    description: string,
    trend: 'up' | 'down' | 'neutral',
    trendLabel: string,
    color: string
): BuilderNode {
    return {
        id,
        type: 'MetricCard',
        props: {
            label,
            value,
            description,
            trend,
            trendLabel,
            color
        },
        style: {
            css: {
                border: '1px solid rgba(15, 118, 110, 0.12)',
                boxShadow: '0 18px 45px rgba(18, 32, 31, 0.08)',
                background: '#ffffff'
            }
        }
    };
}

function featureCard(id: string, title: string, description: string): BuilderNode {
    return {
        id,
        type: 'Card',
        props: {
            padding: 'lg',
            radius: 'lg',
            shadow: 'md',
            background: '#f7fbfa'
        },
        style: {
            css: {
                minHeight: 240,
                border: '1px solid rgba(15, 118, 110, 0.10)',
                boxShadow: '0 20px 52px rgba(18, 32, 31, 0.08)'
            }
        },
        children: [{
            id: `${id}-content`,
            type: 'Stack',
            props: {
                gap: 'md',
                align: 'flex-start'
            },
            style: {
                css: {
                    height: '100%'
                }
            },
            children: [
                {
                    id: `${id}-icon`,
                    type: 'Badge',
                    props: {
                        children: 'Builder',
                        color: 'teal',
                        variant: 'light',
                        radius: 'xl'
                    }
                },
                {
                    id: `${id}-title`,
                    type: 'Title',
                    props: {
                        children: title,
                        order: 3,
                        weight: 800
                    },
                    style: {
                        css: {
                            margin: 0,
                            color: '#12201f',
                            lineHeight: 1.2
                        }
                    }
                },
                {
                    id: `${id}-description`,
                    type: 'Text',
                    props: {
                        children: description,
                        size: 'md'
                    },
                    style: {
                        css: {
                            margin: 0,
                            color: '#5c6f6c',
                            lineHeight: 1.65
                        }
                    }
                }
            ]
        }]
    };
}

function pricingCard(id: string, name: string, price: string, description: string, features: string[], ctaLabel: string, highlighted: boolean): BuilderNode {
    return {
        id,
        type: 'Card',
        props: {
            padding: 'lg',
            radius: 'lg',
            shadow: highlighted ? 'xl' : 'md',
            background: highlighted ? '#10201f' : '#f7fbfa'
        },
        style: {
            css: {
                minHeight: 420,
                border: highlighted ? '1px solid rgba(217, 249, 157, 0.36)' : '1px solid rgba(15, 118, 110, 0.10)',
                boxShadow: highlighted ? '0 28px 72px rgba(16, 32, 31, 0.24)' : '0 18px 48px rgba(18, 32, 31, 0.08)'
            }
        },
        children: [{
            id: `${id}-stack`,
            type: 'Stack',
            props: {
                gap: 'lg',
                align: 'stretch'
            },
            style: {
                css: {
                    height: '100%'
                }
            },
            children: [
                {
                    id: `${id}-heading`,
                    type: 'Stack',
                    props: {
                        gap: 'sm',
                        align: 'flex-start'
                    },
                    children: [
                        highlighted ? {
                            id: `${id}-badge`,
                            type: 'Badge',
                            props: {
                                children: 'Most popular',
                                color: 'lime',
                                variant: 'light',
                                radius: 'xl'
                            }
                        } : {
                            id: `${id}-badge`,
                            type: 'Badge',
                            props: {
                                children: 'Plan',
                                color: 'teal',
                                variant: 'light',
                                radius: 'xl'
                            }
                        },
                        {
                            id: `${id}-name`,
                            type: 'Title',
                            props: {
                                children: name,
                                order: 3,
                                weight: 850
                            },
                            style: {
                                css: {
                                    margin: 0,
                                    color: highlighted ? '#ffffff' : '#12201f'
                                }
                            }
                        },
                        {
                            id: `${id}-price`,
                            type: 'Text',
                            props: {
                                children: price,
                                component: 'div',
                                weight: 900
                            },
                            style: {
                                css: {
                                    margin: 0,
                                    color: highlighted ? '#d9f99d' : '#0f766e',
                                    fontSize: 34,
                                    lineHeight: 1
                                }
                            }
                        },
                        {
                            id: `${id}-description`,
                            type: 'Text',
                            props: {
                                children: description,
                                size: 'md'
                            },
                            style: {
                                css: {
                                    margin: 0,
                                    color: highlighted ? 'rgba(255, 255, 255, 0.72)' : '#5c6f6c',
                                    lineHeight: 1.6
                                }
                            }
                        }
                    ]
                },
                {
                    id: `${id}-features`,
                    type: 'List',
                    props: {
                        items: features,
                        spacing: 'sm',
                        size: 'md',
                        withPadding: true
                    },
                    style: {
                        css: {
                            margin: '4px 0 0',
                            color: highlighted ? 'rgba(255, 255, 255, 0.86)' : '#33413f',
                            lineHeight: 1.7
                        }
                    }
                },
                {
                    id: `${id}-button`,
                    type: 'Button',
                    props: {
                        children: ctaLabel,
                        variant: highlighted ? 'filled' : 'outline',
                        color: highlighted ? 'lime' : 'teal',
                        size: 'md',
                        radius: 'xl',
                        fullWidth: true
                    },
                    style: {
                        css: {
                            marginTop: 'auto'
                        }
                    }
                }
            ]
        }]
    };
}

function testimonialCard(id: string, quote: string, author: string, role: string): BuilderNode {
    return {
        id,
        type: 'Card',
        props: {
            padding: 'lg',
            radius: 'lg',
            shadow: 'md',
            background: '#ffffff'
        },
        style: {
            css: {
                minHeight: 270,
                border: '1px solid rgba(255, 122, 89, 0.16)',
                boxShadow: '0 18px 48px rgba(117, 66, 28, 0.08)'
            }
        },
        children: [{
            id: `${id}-stack`,
            type: 'Stack',
            props: {
                gap: 'lg',
                align: 'stretch'
            },
            style: {
                css: {
                    height: '100%'
                }
            },
            children: [
                {
                    id: `${id}-quote`,
                    type: 'Text',
                    props: {
                        children: quote,
                        size: 'lg'
                    },
                    style: {
                        css: {
                            margin: 0,
                            color: '#12201f',
                            lineHeight: 1.65
                        }
                    }
                },
                {
                    id: `${id}-author`,
                    type: 'Group',
                    props: {
                        gap: 'md',
                        align: 'center',
                        wrap: false
                    },
                    style: {
                        css: {
                            marginTop: 'auto'
                        }
                    },
                    children: [
                        {
                            id: `${id}-avatar`,
                            type: 'Avatar',
                            props: {
                                name: author,
                                color: 'orange',
                                size: 'md',
                                radius: 'round'
                            }
                        },
                        {
                            id: `${id}-meta`,
                            type: 'Stack',
                            props: {
                                gap: 'xs',
                                align: 'flex-start'
                            },
                            children: [
                                {
                                    id: `${id}-name`,
                                    type: 'Text',
                                    props: {
                                        children: author,
                                        component: 'span',
                                        weight: 800
                                    },
                                    style: {
                                        css: {
                                            margin: 0,
                                            color: '#12201f'
                                        }
                                    }
                                },
                                {
                                    id: `${id}-role`,
                                    type: 'Text',
                                    props: {
                                        children: role,
                                        component: 'span',
                                        size: 'sm'
                                    },
                                    style: {
                                        css: {
                                            margin: 0,
                                            color: '#5c6f6c'
                                        }
                                    }
                                }
                            ]
                        }
                    ]
                }
            ]
        }]
    };
}

function sectionHeading(id: string, title: string, description: string): BuilderNode {
    return {
        id,
        type: 'Stack',
        props: {
            gap: 'md',
            align: 'center'
        },
        style: {
            css: {
                maxWidth: 760,
                margin: '0 auto',
                textAlign: 'center'
            }
        },
        children: [
            {
                id: `${id}-title`,
                type: 'Title',
                props: {
                    children: title,
                    order: 2,
                    weight: 900
                },
                style: {
                    css: {
                        margin: 0,
                        color: '#12201f',
                        fontSize: 38,
                        lineHeight: 1.12
                    }
                }
            },
            {
                id: `${id}-description`,
                type: 'Text',
                props: {
                    children: description,
                    size: 'lg'
                },
                style: {
                    css: {
                        margin: 0,
                        color: '#5c6f6c',
                        lineHeight: 1.65
                    }
                }
            }
        ]
    };
}

function workflowCard(id: string, step: string, title: string, description: string): BuilderNode {
    return {
        id,
        type: 'Card',
        props: {
            padding: 'lg',
            radius: 'lg',
            shadow: 'md',
            background: '#ffffff'
        },
        style: {
            css: {
                minHeight: 250,
                border: '1px solid rgba(15, 118, 110, 0.10)',
                boxShadow: '0 22px 60px rgba(18, 32, 31, 0.08)'
            }
        },
        children: [{
            id: `${id}-stack`,
            type: 'Stack',
            props: {
                gap: 'md',
                align: 'flex-start'
            },
            children: [
                {
                    id: `${id}-badge`,
                    type: 'Badge',
                    props: {
                        children: step,
                        color: 'orange',
                        variant: 'light',
                        radius: 'xl',
                        size: 'lg'
                    }
                },
                {
                    id: `${id}-title`,
                    type: 'Title',
                    props: {
                        children: title,
                        order: 3,
                        weight: 800
                    },
                    style: {
                        css: {
                            margin: 0,
                            color: '#12201f'
                        }
                    }
                },
                {
                    id: `${id}-description`,
                    type: 'Text',
                    props: {
                        children: description,
                        size: 'md'
                    },
                    style: {
                        css: {
                            margin: 0,
                            color: '#5c6f6c',
                            lineHeight: 1.6
                        }
                    }
                }
            ]
        }]
    };
}

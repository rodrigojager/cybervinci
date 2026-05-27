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

import {
    Builder_JSON_NULL,
    generateNodeId,
    type BuilderAction,
    type BuilderDataSource,
    type BuilderDocument,
    type BuilderJsonValue,
    type BuilderNode
} from '@cybervinci/builder-schema';

export const Builder_COMPONENT_CATEGORIES = [
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
] as const;

export type BuilderComponentCategory = typeof Builder_COMPONENT_CATEGORIES[number];

export interface BuilderComponentDefinition {
    type: string;
    displayName: string;
    category: BuilderComponentCategory;
    description?: string;
    propsSchema: Record<string, unknown>;
    uiSchema?: Record<string, unknown>;
    defaultProps?: Record<string, unknown>;
    defaultChildren?: BuilderNode[];
    allowedChildren?: string[];
    allowedEvents?: string[];
    slots?: Record<string, BuilderSlotDefinition>;
    exportHtml?: BuilderComponentExportDefinition;
    exportReact?: BuilderComponentExportDefinition;
    aiHints?: BuilderComponentAiHints;
    /**
     * @deprecated Use displayName. Kept temporarily for existing registry entries.
     */
    label?: string;
}

export interface BuilderSlotDefinition {
    displayName: string;
    description?: string;
    allowedChildren?: string[];
    defaultChildren?: BuilderNode[];
    /**
     * @deprecated Use displayName. Kept temporarily for existing registry entries.
     */
    label?: string;
}

export interface BuilderComponentExportDefinition {
    strategy?: string;
    tagName?: string;
    componentName?: string;
    importPath?: string;
    className?: string;
    propMap?: Record<string, string>;
    omitProps?: string[];
    staticProps?: Record<string, BuilderJsonValue>;
    wrapper?: string;
    [key: string]: BuilderJsonValue | Record<string, string> | string[] | undefined;
}

export interface BuilderComponentAiHints {
    purpose?: string;
    promptAliases?: string[];
    recommendedChildren?: string[];
    recommendedSlots?: string[];
    copyFields?: string[];
    layoutRole?: string;
    [key: string]: BuilderJsonValue | undefined;
}

export interface BuilderDataSourceDefinition {
    type: string;
    displayName: string;
    description?: string;
    configSchema: Record<string, unknown>;
    defaultConfig?: Record<string, BuilderJsonValue>;
    cacheable?: boolean;
    status: 'mvp' | 'future';
}

export interface BuilderActionDefinition {
    type: string;
    displayName: string;
    description?: string;
    paramsSchema: Record<string, unknown>;
    defaultParams?: Record<string, BuilderJsonValue>;
    status: 'mvp' | 'future';
}

export interface BuilderActionRegistry {
    get(type: string): BuilderActionDefinition | undefined;
    has(type: string): boolean;
    list(): BuilderActionDefinition[];
    createDefaultAction(type: string, options?: CreateDefaultBuilderActionOptions): BuilderAction;
}

export interface CreateDefaultBuilderActionOptions {
    params?: Record<string, BuilderJsonValue>;
    description?: string;
}

export interface BuilderActionRegistryValidationResult {
    valid: boolean;
    errors: BuilderActionRegistryValidationError[];
}

export interface BuilderActionRegistryValidationError {
    path: string;
    message: string;
    actionId?: string;
    actionType?: string;
}

export interface BuilderDataSourceRegistry {
    get(type: string): BuilderDataSourceDefinition | undefined;
    has(type: string): boolean;
    list(): BuilderDataSourceDefinition[];
    createDefaultDataSource(type: string, options?: CreateDefaultBuilderDataSourceOptions): BuilderDataSource;
}

export interface CreateDefaultBuilderDataSourceOptions {
    config?: Record<string, BuilderJsonValue>;
    description?: string;
    cache?: BuilderDataSource['cache'];
}

export interface BuilderDataSourceRegistryValidationResult {
    valid: boolean;
    errors: BuilderDataSourceRegistryValidationError[];
}

export interface BuilderDataSourceRegistryValidationError {
    path: string;
    message: string;
    dataSourceId?: string;
    dataSourceType?: string;
}

export const Builder_ACTION_DEFINITIONS: BuilderActionDefinition[] = [
    {
        type: 'navigate',
        displayName: 'Navigate',
        description: 'Navigate to an internal route or external URL.',
        status: 'mvp',
        paramsSchema: {
            type: 'object',
            required: ['to'],
            additionalProperties: false,
            properties: {
                to: { type: 'string' },
                target: { type: 'string', enum: ['self', 'blank'] },
                replace: { type: 'boolean' }
            }
        },
        defaultParams: {
            to: '/',
            target: 'self'
        }
    },
    {
        type: 'openModal',
        displayName: 'Open Modal',
        description: 'Open a registered modal by id.',
        status: 'mvp',
        paramsSchema: {
            type: 'object',
            required: ['modalId'],
            additionalProperties: false,
            properties: {
                modalId: { type: 'string' }
            }
        }
    },
    {
        type: 'closeModal',
        displayName: 'Close Modal',
        description: 'Close a registered modal by id.',
        status: 'mvp',
        paramsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                modalId: { type: 'string' }
            }
        }
    },
    {
        type: 'toggleState',
        displayName: 'Toggle State',
        description: 'Toggle a boolean page state.',
        status: 'mvp',
        paramsSchema: {
            type: 'object',
            required: ['stateId'],
            additionalProperties: false,
            properties: {
                stateId: { type: 'string' }
            }
        }
    },
    {
        type: 'setState',
        displayName: 'Set State',
        description: 'Set a page state to a JSON value.',
        status: 'mvp',
        paramsSchema: {
            type: 'object',
            required: ['stateId', 'value'],
            additionalProperties: false,
            properties: {
                stateId: { type: 'string' },
                value: {}
            }
        }
    },
    {
        type: 'submitForm',
        displayName: 'Submit Form',
        description: 'Submit a Builder form through a named action target.',
        status: 'mvp',
        paramsSchema: {
            type: 'object',
            required: ['formId'],
            additionalProperties: false,
            properties: {
                formId: { type: 'string' },
                actionId: { type: 'string' },
                dataSourceId: { type: 'string' }
            }
        }
    },
    {
        type: 'callApi',
        displayName: 'Call API',
        description: 'Call a registered HTTP data source or endpoint contract.',
        status: 'mvp',
        paramsSchema: {
            type: 'object',
            required: ['dataSourceId'],
            additionalProperties: false,
            properties: {
                dataSourceId: { type: 'string' },
                method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
                body: {},
                assignToStateId: { type: 'string' }
            }
        }
    },
    {
        type: 'showNotification',
        displayName: 'Show Notification',
        description: 'Show a user-facing notification.',
        status: 'mvp',
        paramsSchema: {
            type: 'object',
            required: ['message'],
            additionalProperties: false,
            properties: {
                title: { type: 'string' },
                message: { type: 'string' },
                color: { type: 'string' },
                variant: { type: 'string', enum: ['info', 'success', 'warning', 'error'] },
                autoCloseMs: { type: 'integer' }
            }
        },
        defaultParams: {
            message: 'Notification',
            variant: 'info'
        }
    }
];

export const Builder_DATA_SOURCE_DEFINITIONS: BuilderDataSourceDefinition[] = [
    {
        type: 'static',
        displayName: 'Static',
        description: 'Inline JSON data stored in the Builder document.',
        status: 'mvp',
        cacheable: false,
        configSchema: {
            type: 'object',
            required: ['data'],
            additionalProperties: false,
            properties: {
                data: {}
            }
        },
        defaultConfig: {
            data: []
        }
    },
    {
        type: 'mock',
        displayName: 'Mock',
        description: 'Generated or sample JSON data for design-time preview.',
        status: 'mvp',
        cacheable: false,
        configSchema: {
            type: 'object',
            required: ['data'],
            additionalProperties: false,
            properties: {
                data: {},
                seed: { type: 'string' },
                scenario: { type: 'string' }
            }
        },
        defaultConfig: {
            data: []
        }
    },
    {
        type: 'http',
        displayName: 'HTTP',
        description: 'Future remote HTTP data source contract.',
        status: 'future',
        cacheable: true,
        configSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                url: { type: 'string' },
                method: { type: 'string', enum: ['GET', 'POST'] },
                headers: { type: 'object' }
            }
        },
        defaultConfig: {
            method: 'GET'
        }
    },
    {
        type: 'graphql',
        displayName: 'GraphQL',
        description: 'Future GraphQL data source contract.',
        status: 'future',
        cacheable: true,
        configSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                endpoint: { type: 'string' },
                query: { type: 'string' },
                variables: { type: 'object' }
            }
        }
    }
];

const Builder_MVP_COMPONENT_TYPES = [
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
    'Box',
    'Title',
    'Text',
    'Badge',
    'List',
    'Markdown',
    'Button',
    'TextInput',
    'Textarea',
    'Select',
    'Checkbox',
    'RadioGroup',
    'NumberInput',
    'DateInput',
    'DynamicForm',
    'Table',
    'DataTable',
    'MetricCard',
    'StatCard',
    'Anchor',
    'NavLink',
    'Breadcrumbs',
    'Tabs',
    'Modal',
    'Drawer',
    'Alert',
    'NotificationBlock',
    'Loader',
    'Image',
    'Avatar',
    'Icon',
    'HeroSection',
    'FeatureGrid',
    'PricingSection',
    'TestimonialSection',
    'CTASection',
    'ChartPlaceholder',
    'MetricGrid',
    'DashboardHeader'
] as const;

const Builder_LAYOUT_CHILDREN = [...Builder_MVP_COMPONENT_TYPES];
const Builder_GRID_CHILDREN = ['Grid', 'Card', 'Box', 'Stack', 'Group', 'Container', 'Section', 'MetricCard', 'StatCard', 'ChartPlaceholder'] as const;
const Builder_CARD_SLOT_CHILDREN = ['Title', 'Text', 'Badge', 'Button', 'Group', 'Stack', 'Anchor', 'Icon', 'Avatar'] as const;
const Builder_ACTION_SLOT_CHILDREN = ['Button', 'Anchor', 'Group'] as const;
const Builder_SECTION_SLOT_CHILDREN = ['Container', 'Stack', 'Group', 'Card', 'Title', 'Text', 'Badge', 'Button', 'Anchor', 'NavLink', 'Breadcrumbs'] as const;
const Builder_INPUT_SECTION_SLOT_CHILDREN = ['Icon', 'Avatar', 'Badge', 'Text'] as const;
const Builder_TEXT_INLINE_CHILDREN = ['Badge', 'Icon', 'Anchor'] as const;
const Builder_FORM_FIELD_TYPES = ['TextInput', 'Textarea', 'Select', 'Checkbox', 'RadioGroup', 'NumberInput', 'DateInput', 'Button'] as const;
const Builder_FORM_ALLOWED_EVENTS = ['onSubmit', 'onReset', 'onChange'] as const;
const Builder_FIELD_ALLOWED_EVENTS = ['onChange', 'onFocus', 'onBlur'] as const;
const Builder_BUTTON_ALLOWED_EVENTS = ['onClick'] as const;
const Builder_LINK_ALLOWED_EVENTS = ['onClick'] as const;
const Builder_OVERLAY_ALLOWED_EVENTS = ['onOpen', 'onClose'] as const;

const spacingSchema = {
    type: 'string',
    enum: ['0', 'xs', 'sm', 'md', 'lg', 'xl']
} as const;

const sizeSchema = {
    type: 'string',
    enum: ['xs', 'sm', 'md', 'lg', 'xl']
} as const;

const colorSchema = {
    type: 'string'
} as const;

const booleanSchema = {
    type: 'boolean'
} as const;

const stringSchema = {
    type: 'string'
} as const;

const stringArraySchema = {
    type: 'array',
    items: stringSchema
} as const;

const integerSchema = {
    type: 'integer'
} as const;

const numberSchema = {
    type: 'number'
} as const;

const objectSchema = {
    type: 'object'
} as const;

const optionArraySchema = {
    type: 'array',
    items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'value'],
        properties: {
            label: stringSchema,
            value: stringSchema,
            disabled: booleanSchema
        }
    }
} as const;

const tableColumnArraySchema = {
    type: 'array',
    items: {
        type: 'object',
        additionalProperties: false,
        required: ['key', 'label'],
        properties: {
            key: stringSchema,
            label: stringSchema,
            align: { type: 'string', enum: ['left', 'center', 'right'] },
            width: stringSchema,
            format: stringSchema,
            sortable: booleanSchema
        }
    }
} as const;

const tableRowArraySchema = {
    type: 'array',
    items: {
        type: 'object'
    }
} as const;

const metricArraySchema = {
    type: 'array',
    items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'value'],
        properties: {
            label: stringSchema,
            value: { type: ['string', 'number'] },
            description: stringSchema,
            trend: { type: 'string', enum: ['up', 'down', 'neutral'] },
            color: colorSchema,
            icon: stringSchema
        }
    }
} as const;

const navItemArraySchema = {
    type: 'array',
    items: {
        type: 'object',
        additionalProperties: false,
        required: ['label'],
        properties: {
            label: stringSchema,
            href: stringSchema,
            active: booleanSchema,
            disabled: booleanSchema,
            icon: stringSchema
        }
    }
} as const;

const breadcrumbItemArraySchema = {
    type: 'array',
    items: {
        type: 'object',
        additionalProperties: false,
        required: ['label'],
        properties: {
            label: stringSchema,
            href: stringSchema
        }
    }
} as const;

const featureArraySchema = {
    type: 'array',
    items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'description'],
        properties: {
            title: stringSchema,
            description: stringSchema,
            icon: stringSchema
        }
    }
} as const;

const pricingPlanArraySchema = {
    type: 'array',
    items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'price'],
        properties: {
            name: stringSchema,
            price: stringSchema,
            description: stringSchema,
            features: stringArraySchema,
            ctaLabel: stringSchema,
            highlighted: booleanSchema
        }
    }
} as const;

const testimonialArraySchema = {
    type: 'array',
    items: {
        type: 'object',
        additionalProperties: false,
        required: ['quote', 'author'],
        properties: {
            quote: stringSchema,
            author: stringSchema,
            role: stringSchema,
            avatar: stringSchema
        }
    }
} as const;

const compactObjectUiSchema = {
    'ui:options': {
        label: false
    }
} as const;

const multilineTextUiOptions = {
    rows: 4
} as const;

const tableArrayUiOptions = {
    orderable: true,
    addable: true,
    removable: true
} as const;

export const Builder_LAYOUT_COMPONENTS: BuilderComponentDefinition[] = [
    {
        type: 'Page',
        displayName: 'Page',
        category: 'Layout',
        description: 'Root page component for a Builder document.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                title: stringSchema,
                description: stringSchema,
                fullWidth: booleanSchema,
                background: colorSchema
            }
        },
        defaultProps: {
            title: 'Untitled page',
            fullWidth: false
        },
        allowedChildren: Builder_LAYOUT_CHILDREN.filter(type => type !== 'Page'),
        slots: {
            header: {
                displayName: 'Header',
                allowedChildren: [...Builder_SECTION_SLOT_CHILDREN]
            },
            footer: {
                displayName: 'Footer',
                allowedChildren: [...Builder_SECTION_SLOT_CHILDREN]
            },
            sidebar: {
                displayName: 'Sidebar',
                allowedChildren: [...Builder_SECTION_SLOT_CHILDREN]
            }
        },
        aiHints: {
            purpose: 'Owns the top-level page canvas.',
            layoutRole: 'root',
            recommendedChildren: ['Section', 'Container'],
            recommendedSlots: ['header', 'footer', 'sidebar']
        }
    },
    {
        type: 'Section',
        displayName: 'Section',
        category: 'Layout',
        description: 'Semantic page section with optional spacing and background.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                component: { type: 'string', enum: ['section', 'header', 'main', 'footer', 'aside'] },
                padding: spacingSchema,
                paddingY: spacingSchema,
                paddingX: spacingSchema,
                background: colorSchema,
                fullWidth: booleanSchema,
                withBorder: booleanSchema
            }
        },
        defaultProps: {
            component: 'section',
            paddingY: 'xl',
            fullWidth: true
        },
        uiSchema: {
            'ui:order': ['component', 'paddingY', 'paddingX', 'padding', 'background', 'fullWidth', 'withBorder'],
            component: {
                'ui:widget': 'select',
                'ui:help': 'Use semantic landmarks for large page regions.'
            },
            padding: {
                'ui:widget': 'select'
            },
            paddingY: {
                'ui:widget': 'select'
            },
            paddingX: {
                'ui:widget': 'select'
            },
            background: {
                'ui:placeholder': 'theme color, CSS color, or token'
            }
        },
        allowedChildren: Builder_LAYOUT_CHILDREN.filter(type => type !== 'Page'),
        slots: {
            header: {
                displayName: 'Header',
                allowedChildren: [...Builder_SECTION_SLOT_CHILDREN]
            },
            footer: {
                displayName: 'Footer',
                allowedChildren: [...Builder_SECTION_SLOT_CHILDREN]
            },
            sidebar: {
                displayName: 'Sidebar',
                allowedChildren: [...Builder_SECTION_SLOT_CHILDREN]
            }
        },
        aiHints: {
            purpose: 'Groups a meaningful page region.',
            layoutRole: 'section',
            recommendedChildren: ['Container', 'Stack', 'SimpleGrid']
        }
    },
    {
        type: 'Container',
        displayName: 'Container',
        category: 'Layout',
        description: 'Constrains content width inside a page section.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                size: { type: 'string', enum: ['xs', 'sm', 'md', 'lg', 'xl', 'responsive', 'fluid'] },
                padding: spacingSchema,
                fluid: booleanSchema
            }
        },
        defaultProps: {
            size: 'lg',
            padding: 'md'
        },
        allowedChildren: Builder_LAYOUT_CHILDREN.filter(type => type !== 'Page')
    },
    {
        type: 'Stack',
        displayName: 'Stack',
        category: 'Layout',
        description: 'Vertical flex layout for ordered content.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                gap: spacingSchema,
                align: { type: 'string', enum: ['stretch', 'flex-start', 'center', 'flex-end'] },
                justify: { type: 'string', enum: ['flex-start', 'center', 'flex-end', 'space-between'] }
            }
        },
        defaultProps: {
            gap: 'md',
            align: 'stretch'
        },
        allowedChildren: Builder_LAYOUT_CHILDREN.filter(type => type !== 'Page')
    },
    {
        type: 'Group',
        displayName: 'Group',
        category: 'Layout',
        description: 'Horizontal flex layout for controls and compact content.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                gap: spacingSchema,
                align: { type: 'string', enum: ['flex-start', 'center', 'flex-end', 'stretch'] },
                justify: { type: 'string', enum: ['flex-start', 'center', 'flex-end', 'space-between', 'space-around'] },
                wrap: booleanSchema
            }
        },
        defaultProps: {
            gap: 'md',
            align: 'center',
            wrap: true
        },
        allowedChildren: Builder_LAYOUT_CHILDREN.filter(type => type !== 'Page')
    },
    {
        type: 'SimpleGrid',
        displayName: 'Simple Grid',
        category: 'Layout',
        description: 'Responsive grid with equal-width columns.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                cols: integerSchema,
                spacing: spacingSchema,
                verticalSpacing: spacingSchema,
                breakpoints: objectSchema
            }
        },
        defaultProps: {
            cols: 3,
            spacing: 'md',
            verticalSpacing: 'md'
        },
        allowedChildren: [...Builder_GRID_CHILDREN]
    },
    {
        type: 'Grid',
        displayName: 'Grid',
        category: 'Layout',
        description: 'Column grid item or container for more controlled layouts.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                columns: integerSchema,
                span: integerSchema,
                offset: integerSchema,
                gutter: spacingSchema,
                align: { type: 'string', enum: ['flex-start', 'center', 'flex-end', 'stretch'] }
            }
        },
        defaultProps: {
            columns: 12,
            span: 12,
            gutter: 'md'
        },
        allowedChildren: Builder_LAYOUT_CHILDREN.filter(type => type !== 'Page')
    },
    {
        type: 'Card',
        displayName: 'Card',
        category: 'Layout',
        description: 'Framed content block for grouped information.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                padding: spacingSchema,
                radius: sizeSchema,
                shadow: { type: 'string', enum: ['none', 'xs', 'sm', 'md', 'lg', 'xl'] },
                withBorder: booleanSchema,
                background: colorSchema
            }
        },
        defaultProps: {
            padding: 'md',
            radius: 'sm',
            shadow: 'none',
            withBorder: true
        },
        uiSchema: {
            'ui:order': ['padding', 'radius', 'shadow', 'withBorder', 'background'],
            padding: {
                'ui:widget': 'select'
            },
            radius: {
                'ui:widget': 'select'
            },
            shadow: {
                'ui:widget': 'select'
            },
            background: {
                'ui:placeholder': 'transparent, white, gray.0, #fff'
            }
        },
        allowedChildren: Builder_LAYOUT_CHILDREN.filter(type => type !== 'Page'),
        slots: {
            header: {
                displayName: 'Header',
                allowedChildren: [...Builder_CARD_SLOT_CHILDREN]
            },
            footer: {
                displayName: 'Footer',
                allowedChildren: [...Builder_CARD_SLOT_CHILDREN]
            },
            actions: {
                displayName: 'Actions',
                allowedChildren: [...Builder_ACTION_SLOT_CHILDREN]
            }
        },
        aiHints: {
            purpose: 'Groups related content and optional actions.',
            recommendedSlots: ['header', 'footer', 'actions']
        }
    },
    {
        type: 'Divider',
        displayName: 'Divider',
        category: 'Layout',
        description: 'Visual separator between content groups.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                label: stringSchema,
                orientation: { type: 'string', enum: ['horizontal', 'vertical'] },
                variant: { type: 'string', enum: ['solid', 'dashed', 'dotted'] },
                color: colorSchema
            }
        },
        defaultProps: {
            orientation: 'horizontal',
            variant: 'solid'
        },
        allowedChildren: []
    },
    {
        type: 'Space',
        displayName: 'Space',
        category: 'Layout',
        description: 'Fixed empty spacing element.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                h: numberSchema,
                w: numberSchema,
                size: spacingSchema
            }
        },
        defaultProps: {
            size: 'md'
        },
        allowedChildren: []
    },
    {
        type: 'Box',
        displayName: 'Box',
        category: 'Layout',
        description: 'Generic layout wrapper with minimal semantics.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                component: stringSchema,
                padding: spacingSchema,
                margin: spacingSchema,
                background: colorSchema,
                radius: sizeSchema
            }
        },
        defaultProps: {
            component: 'div'
        },
        allowedChildren: Builder_LAYOUT_CHILDREN.filter(type => type !== 'Page')
    }
];

export const Builder_TYPOGRAPHY_COMPONENTS: BuilderComponentDefinition[] = [
    {
        type: 'Title',
        displayName: 'Title',
        category: 'Typography',
        description: 'Page or section heading text.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                children: stringSchema,
                order: { type: 'integer', enum: [1, 2, 3, 4, 5, 6] },
                size: { type: 'string', enum: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'xs', 'sm', 'md', 'lg', 'xl'] },
                color: colorSchema,
                align: { type: 'string', enum: ['left', 'center', 'right', 'justify'] },
                weight: integerSchema,
                lineClamp: integerSchema
            }
        },
        defaultProps: {
            children: 'Title',
            order: 2
        },
        uiSchema: {
            'ui:order': ['children', 'order', 'size', 'align', 'color', 'weight', 'lineClamp'],
            children: {
                'ui:placeholder': 'Section heading'
            },
            order: {
                'ui:widget': 'select',
                'ui:help': 'Controls semantic heading level.'
            },
            size: {
                'ui:widget': 'select'
            },
            align: {
                'ui:widget': 'radio',
                'ui:options': {
                    inline: true
                }
            },
            color: {
                'ui:placeholder': 'dark, blue, #111'
            },
            weight: {
                'ui:widget': 'range',
                'ui:options': {
                    step: 100,
                    min: 100,
                    max: 900
                }
            }
        },
        allowedChildren: [],
        aiHints: {
            purpose: 'Communicates page hierarchy with concise heading copy.',
            copyFields: ['children']
        }
    },
    {
        type: 'Text',
        displayName: 'Text',
        category: 'Typography',
        description: 'Body copy or compact inline text.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                children: stringSchema,
                size: sizeSchema,
                color: colorSchema,
                align: { type: 'string', enum: ['left', 'center', 'right', 'justify'] },
                weight: integerSchema,
                italic: booleanSchema,
                underline: booleanSchema,
                lineClamp: integerSchema,
                component: { type: 'string', enum: ['p', 'span', 'div'] }
            }
        },
        defaultProps: {
            children: 'Text',
            size: 'md'
        },
        uiSchema: {
            'ui:order': ['children', 'component', 'size', 'align', 'color', 'weight', 'lineClamp', 'italic', 'underline'],
            children: {
                'ui:widget': 'textarea',
                'ui:options': multilineTextUiOptions,
                'ui:placeholder': 'Write the visible text content'
            },
            component: {
                'ui:widget': 'select'
            },
            size: {
                'ui:widget': 'select'
            },
            align: {
                'ui:widget': 'radio',
                'ui:options': {
                    inline: true
                }
            },
            color: {
                'ui:placeholder': 'dimmed, dark, blue, #333'
            },
            weight: {
                'ui:widget': 'range',
                'ui:options': {
                    step: 100,
                    min: 100,
                    max: 900
                }
            }
        },
        allowedChildren: [...Builder_TEXT_INLINE_CHILDREN],
        aiHints: {
            purpose: 'Renders regular readable copy.',
            copyFields: ['children']
        }
    },
    {
        type: 'Badge',
        displayName: 'Badge',
        category: 'Typography',
        description: 'Small status, label, or category marker.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                children: stringSchema,
                color: colorSchema,
                size: sizeSchema,
                variant: { type: 'string', enum: ['filled', 'light', 'outline', 'dot', 'transparent', 'white'] },
                radius: sizeSchema,
                fullWidth: booleanSchema
            }
        },
        defaultProps: {
            children: 'Badge',
            color: 'blue',
            variant: 'light'
        },
        allowedChildren: []
    },
    {
        type: 'List',
        displayName: 'List',
        category: 'Typography',
        description: 'Ordered or unordered text list.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                items: stringArraySchema,
                type: { type: 'string', enum: ['unordered', 'ordered'] },
                spacing: spacingSchema,
                size: sizeSchema,
                withPadding: booleanSchema,
                center: booleanSchema
            }
        },
        defaultProps: {
            items: ['First item', 'Second item'],
            type: 'unordered',
            spacing: 'xs'
        },
        allowedChildren: ['Text', 'Badge', 'Anchor', 'Icon']
    },
    {
        type: 'Markdown',
        displayName: 'Markdown',
        category: 'Typography',
        description: 'Sanitized Markdown content. Raw HTML is disabled by default and must remain sanitized by renderers/exporters.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                content: stringSchema,
                allowHtml: booleanSchema,
                sanitize: booleanSchema,
                linkTarget: { type: 'string', enum: ['_self', '_blank'] },
                className: stringSchema
            }
        },
        defaultProps: {
            content: 'Markdown content',
            allowHtml: false,
            sanitize: true
        },
        allowedChildren: [],
        aiHints: {
            purpose: 'Renders rich copy from Markdown without making raw HTML canonical.',
            copyFields: ['content'],
            security: 'Renderers and exporters must sanitize generated HTML and must not execute scripts.'
        }
    }
];

export const Builder_FORM_COMPONENTS: BuilderComponentDefinition[] = [
    {
        type: 'Button',
        displayName: 'Button',
        category: 'Form',
        description: 'Clickable action control bound to a registered Builder action through events.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                children: stringSchema,
                variant: { type: 'string', enum: ['filled', 'light', 'outline', 'subtle', 'default', 'transparent', 'white'] },
                color: colorSchema,
                size: sizeSchema,
                radius: sizeSchema,
                fullWidth: booleanSchema,
                disabled: booleanSchema,
                loading: booleanSchema,
                type: { type: 'string', enum: ['button', 'submit', 'reset'] }
            }
        },
        defaultProps: {
            children: 'Button',
            variant: 'filled',
            type: 'button'
        },
        uiSchema: {
            'ui:order': ['children', 'variant', 'color', 'size', 'radius', 'type', 'fullWidth', 'disabled', 'loading'],
            children: {
                'ui:title': 'Label',
                'ui:placeholder': 'Call to action'
            },
            variant: {
                'ui:widget': 'select'
            },
            color: {
                'ui:placeholder': 'blue, green, red, #228be6'
            },
            size: {
                'ui:widget': 'select'
            },
            radius: {
                'ui:widget': 'select'
            },
            type: {
                'ui:widget': 'radio',
                'ui:options': {
                    inline: true
                }
            }
        },
        allowedChildren: [],
        allowedEvents: [...Builder_BUTTON_ALLOWED_EVENTS],
        slots: {
            leftSection: {
                displayName: 'Left Section',
                allowedChildren: [...Builder_INPUT_SECTION_SLOT_CHILDREN]
            },
            rightSection: {
                displayName: 'Right Section',
                allowedChildren: [...Builder_INPUT_SECTION_SLOT_CHILDREN]
            }
        },
        aiHints: {
            purpose: 'Triggers a registered action or submits a form.',
            copyFields: ['children']
        }
    },
    {
        type: 'TextInput',
        displayName: 'Text Input',
        category: 'Form',
        description: 'Single-line text field.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                name: stringSchema,
                label: stringSchema,
                placeholder: stringSchema,
                description: stringSchema,
                defaultValue: stringSchema,
                required: booleanSchema,
                disabled: booleanSchema,
                readOnly: booleanSchema,
                type: { type: 'string', enum: ['text', 'email', 'password', 'url', 'tel', 'search'] },
                size: sizeSchema
            }
        },
        defaultProps: {
            name: 'text',
            label: 'Text input',
            type: 'text'
        },
        allowedChildren: [],
        allowedEvents: [...Builder_FIELD_ALLOWED_EVENTS],
        slots: {
            leftSection: {
                displayName: 'Left Section',
                allowedChildren: [...Builder_INPUT_SECTION_SLOT_CHILDREN]
            },
            rightSection: {
                displayName: 'Right Section',
                allowedChildren: [...Builder_INPUT_SECTION_SLOT_CHILDREN]
            }
        }
    },
    {
        type: 'Textarea',
        displayName: 'Textarea',
        category: 'Form',
        description: 'Multi-line text field.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                name: stringSchema,
                label: stringSchema,
                placeholder: stringSchema,
                description: stringSchema,
                defaultValue: stringSchema,
                required: booleanSchema,
                disabled: booleanSchema,
                readOnly: booleanSchema,
                minRows: integerSchema,
                maxRows: integerSchema,
                autosize: booleanSchema,
                size: sizeSchema
            }
        },
        defaultProps: {
            name: 'textarea',
            label: 'Textarea',
            minRows: 3
        },
        allowedChildren: [],
        allowedEvents: [...Builder_FIELD_ALLOWED_EVENTS],
        slots: {
            leftSection: {
                displayName: 'Left Section',
                allowedChildren: [...Builder_INPUT_SECTION_SLOT_CHILDREN]
            },
            rightSection: {
                displayName: 'Right Section',
                allowedChildren: [...Builder_INPUT_SECTION_SLOT_CHILDREN]
            }
        }
    },
    {
        type: 'Select',
        displayName: 'Select',
        category: 'Form',
        description: 'Dropdown selection field with canonical JSON options.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                name: stringSchema,
                label: stringSchema,
                placeholder: stringSchema,
                description: stringSchema,
                data: optionArraySchema,
                defaultValue: stringSchema,
                searchable: booleanSchema,
                clearable: booleanSchema,
                required: booleanSchema,
                disabled: booleanSchema,
                size: sizeSchema
            }
        },
        defaultProps: {
            name: 'select',
            label: 'Select',
            data: [
                { label: 'Option 1', value: 'option-1' },
                { label: 'Option 2', value: 'option-2' }
            ]
        },
        allowedChildren: [],
        allowedEvents: [...Builder_FIELD_ALLOWED_EVENTS],
        slots: {
            leftSection: {
                displayName: 'Left Section',
                allowedChildren: [...Builder_INPUT_SECTION_SLOT_CHILDREN]
            },
            rightSection: {
                displayName: 'Right Section',
                allowedChildren: [...Builder_INPUT_SECTION_SLOT_CHILDREN]
            }
        }
    },
    {
        type: 'Checkbox',
        displayName: 'Checkbox',
        category: 'Form',
        description: 'Boolean input field.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                name: stringSchema,
                label: stringSchema,
                description: stringSchema,
                defaultChecked: booleanSchema,
                required: booleanSchema,
                disabled: booleanSchema,
                size: sizeSchema
            }
        },
        defaultProps: {
            name: 'checkbox',
            label: 'Checkbox',
            defaultChecked: false
        },
        allowedChildren: [],
        allowedEvents: [...Builder_FIELD_ALLOWED_EVENTS],
        slots: {
            leftSection: {
                displayName: 'Left Section',
                allowedChildren: [...Builder_INPUT_SECTION_SLOT_CHILDREN]
            },
            rightSection: {
                displayName: 'Right Section',
                allowedChildren: [...Builder_INPUT_SECTION_SLOT_CHILDREN]
            }
        }
    },
    {
        type: 'RadioGroup',
        displayName: 'Radio Group',
        category: 'Form',
        description: 'Single-choice radio group with canonical JSON options.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                name: stringSchema,
                label: stringSchema,
                description: stringSchema,
                data: optionArraySchema,
                defaultValue: stringSchema,
                required: booleanSchema,
                disabled: booleanSchema,
                orientation: { type: 'string', enum: ['vertical', 'horizontal'] },
                size: sizeSchema
            }
        },
        defaultProps: {
            name: 'radio',
            label: 'Radio group',
            orientation: 'vertical',
            data: [
                { label: 'Option 1', value: 'option-1' },
                { label: 'Option 2', value: 'option-2' }
            ]
        },
        allowedChildren: [],
        allowedEvents: [...Builder_FIELD_ALLOWED_EVENTS],
        slots: {
            leftSection: {
                displayName: 'Left Section',
                allowedChildren: [...Builder_INPUT_SECTION_SLOT_CHILDREN]
            },
            rightSection: {
                displayName: 'Right Section',
                allowedChildren: [...Builder_INPUT_SECTION_SLOT_CHILDREN]
            }
        }
    },
    {
        type: 'NumberInput',
        displayName: 'Number Input',
        category: 'Form',
        description: 'Numeric input field.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                name: stringSchema,
                label: stringSchema,
                placeholder: stringSchema,
                description: stringSchema,
                defaultValue: numberSchema,
                min: numberSchema,
                max: numberSchema,
                step: numberSchema,
                required: booleanSchema,
                disabled: booleanSchema,
                size: sizeSchema
            }
        },
        defaultProps: {
            name: 'number',
            label: 'Number input',
            step: 1
        },
        allowedChildren: [],
        allowedEvents: [...Builder_FIELD_ALLOWED_EVENTS]
    },
    {
        type: 'DateInput',
        displayName: 'Date Input',
        category: 'Form',
        description: 'Date field using ISO date strings in Builder props.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                name: stringSchema,
                label: stringSchema,
                placeholder: stringSchema,
                description: stringSchema,
                defaultValue: stringSchema,
                minDate: stringSchema,
                maxDate: stringSchema,
                required: booleanSchema,
                disabled: booleanSchema,
                clearable: booleanSchema,
                size: sizeSchema
            }
        },
        defaultProps: {
            name: 'date',
            label: 'Date input'
        },
        allowedChildren: [],
        allowedEvents: [...Builder_FIELD_ALLOWED_EVENTS]
    },
    {
        type: 'DynamicForm',
        displayName: 'Dynamic Form',
        category: 'Form',
        description: 'Form container composed from registered Builder field components.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                title: stringSchema,
                description: stringSchema,
                submitLabel: stringSchema,
                resetLabel: stringSchema,
                layout: { type: 'string', enum: ['vertical', 'horizontal', 'grid'] },
                gap: spacingSchema,
                disabled: booleanSchema
            }
        },
        defaultProps: {
            submitLabel: 'Submit',
            layout: 'vertical',
            gap: 'md'
        },
        allowedChildren: [...Builder_FORM_FIELD_TYPES],
        allowedEvents: [...Builder_FORM_ALLOWED_EVENTS],
        slots: {
            actions: {
                displayName: 'Actions',
                allowedChildren: ['Button', 'Group']
            }
        },
        aiHints: {
            purpose: 'Collects user input through Builder field components.',
            recommendedChildren: ['TextInput', 'Textarea', 'Select', 'Button']
        }
    }
];

export const Builder_DATA_DISPLAY_COMPONENTS: BuilderComponentDefinition[] = [
    {
        type: 'Table',
        displayName: 'Table',
        category: 'Data Display',
        description: 'Basic tabular data display with static rows or Builder node data binding.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                caption: stringSchema,
                columns: tableColumnArraySchema,
                rows: tableRowArraySchema,
                striped: booleanSchema,
                highlightOnHover: booleanSchema,
                withTableBorder: booleanSchema,
                withColumnBorders: booleanSchema,
                verticalSpacing: spacingSchema,
                horizontalSpacing: spacingSchema,
                emptyText: stringSchema
            }
        },
        defaultProps: {
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
        },
        uiSchema: {
            'ui:order': [
                'caption',
                'columns',
                'rows',
                'emptyText',
                'striped',
                'highlightOnHover',
                'withTableBorder',
                'withColumnBorders',
                'verticalSpacing',
                'horizontalSpacing'
            ],
            caption: {
                'ui:placeholder': 'Optional accessible table caption'
            },
            columns: {
                'ui:options': tableArrayUiOptions,
                items: {
                    ...compactObjectUiSchema,
                    key: {
                        'ui:placeholder': 'fieldName'
                    },
                    label: {
                        'ui:placeholder': 'Column label'
                    },
                    align: {
                        'ui:widget': 'select'
                    },
                    width: {
                        'ui:placeholder': '120px or 20%'
                    }
                }
            },
            rows: {
                'ui:options': tableArrayUiOptions,
                'ui:help': 'Rows are generic JSON objects keyed by column keys.',
                items: compactObjectUiSchema
            },
            verticalSpacing: {
                'ui:widget': 'select'
            },
            horizontalSpacing: {
                'ui:widget': 'select'
            }
        },
        allowedChildren: [],
        aiHints: {
            purpose: 'Shows structured records in columns. Prefer node.data.sourceId and node.data.repeat for dynamic rows.',
            dataBinding: 'Bind rows from node.data.repeat.sourceId and map columns through node.data.fields.'
        }
    },
    {
        type: 'DataTable',
        displayName: 'Data Table',
        category: 'Data Display',
        description: 'Feature-ready data table for datasets, backed by static rows or Builder data binding.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                title: stringSchema,
                description: stringSchema,
                columns: tableColumnArraySchema,
                rows: tableRowArraySchema,
                pageSize: integerSchema,
                searchable: booleanSchema,
                sortable: booleanSchema,
                selectable: booleanSchema,
                striped: booleanSchema,
                highlightOnHover: booleanSchema,
                emptyText: stringSchema
            }
        },
        defaultProps: {
            title: 'Data table',
            columns: [
                { key: 'name', label: 'Name', sortable: true },
                { key: 'status', label: 'Status', sortable: true }
            ],
            rows: [
                { name: 'Example', status: 'Active' }
            ],
            pageSize: 10,
            searchable: false,
            sortable: true,
            selectable: false,
            emptyText: 'No records found'
        },
        allowedChildren: [],
        aiHints: {
            purpose: 'Shows larger datasets with table affordances. Keep data canonical in props.rows or node.data binding.',
            dataBinding: 'Bind records through node.data.repeat.sourceId; use node.data.fields to map displayed columns.'
        }
    },
    {
        type: 'MetricCard',
        displayName: 'Metric Card',
        category: 'Data Display',
        description: 'Single KPI card that can read its value from static props or Builder data fields.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                label: stringSchema,
                value: { type: ['string', 'number'] },
                description: stringSchema,
                trend: { type: 'string', enum: ['up', 'down', 'neutral'] },
                trendLabel: stringSchema,
                color: colorSchema,
                icon: stringSchema,
                loading: booleanSchema
            }
        },
        defaultProps: {
            label: 'Metric',
            value: '0',
            trend: 'neutral',
            color: 'blue'
        },
        allowedChildren: [],
        aiHints: {
            purpose: 'Highlights one important number or KPI.',
            dataBinding: 'Use node.data.fields.value, label, description, trend, and trendLabel for dynamic metrics.'
        }
    },
    {
        type: 'StatCard',
        displayName: 'Stat Card',
        category: 'Data Display',
        description: 'Compact statistic card with optional supporting metrics and Builder data binding.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                title: stringSchema,
                value: { type: ['string', 'number'] },
                subtitle: stringSchema,
                helperText: stringSchema,
                color: colorSchema,
                variant: { type: 'string', enum: ['default', 'filled', 'light', 'outline'] },
                metrics: metricArraySchema
            }
        },
        defaultProps: {
            title: 'Stat',
            value: '0',
            variant: 'default',
            metrics: []
        },
        allowedChildren: [],
        aiHints: {
            purpose: 'Summarizes one statistic with optional secondary metrics.',
            dataBinding: 'Use node.data.fields for title, value, subtitle, helperText, and metrics.'
        }
    }
];

export const Builder_NAVIGATION_COMPONENTS: BuilderComponentDefinition[] = [
    {
        type: 'Anchor',
        displayName: 'Anchor',
        category: 'Navigation',
        description: 'Semantic link that can navigate through href or a registered action.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                children: stringSchema,
                href: stringSchema,
                target: { type: 'string', enum: ['_self', '_blank'] },
                underline: { type: 'string', enum: ['always', 'hover', 'never'] },
                color: colorSchema,
                disabled: booleanSchema
            }
        },
        defaultProps: {
            children: 'Link',
            href: '#',
            underline: 'hover'
        },
        allowedChildren: [...Builder_TEXT_INLINE_CHILDREN],
        allowedEvents: [...Builder_LINK_ALLOWED_EVENTS],
        aiHints: {
            purpose: 'Navigates to another page, route, or external URL.'
        }
    },
    {
        type: 'NavLink',
        displayName: 'Nav Link',
        category: 'Navigation',
        description: 'Navigation item for sidebars, menus, and app navigation.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                label: stringSchema,
                href: stringSchema,
                description: stringSchema,
                icon: stringSchema,
                active: booleanSchema,
                disabled: booleanSchema,
                items: navItemArraySchema
            }
        },
        defaultProps: {
            label: 'Navigation link',
            href: '#',
            active: false
        },
        allowedChildren: [],
        allowedEvents: [...Builder_LINK_ALLOWED_EVENTS],
        aiHints: {
            purpose: 'Represents one navigation destination or grouped navigation item.'
        }
    },
    {
        type: 'Breadcrumbs',
        displayName: 'Breadcrumbs',
        category: 'Navigation',
        description: 'Hierarchical page location trail.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                items: breadcrumbItemArraySchema,
                separator: stringSchema
            }
        },
        defaultProps: {
            items: [
                { label: 'Home', href: '#' },
                { label: 'Page' }
            ],
            separator: '/'
        },
        allowedChildren: ['Anchor', 'Text'],
        aiHints: {
            purpose: 'Shows where the current page sits in a navigation hierarchy.'
        }
    },
    {
        type: 'Tabs',
        displayName: 'Tabs',
        category: 'Navigation',
        description: 'Tabbed content region with canonical Builder slots for each panel.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                defaultValue: stringSchema,
                orientation: { type: 'string', enum: ['horizontal', 'vertical'] },
                variant: { type: 'string', enum: ['default', 'outline', 'pills'] },
                tabs: navItemArraySchema
            }
        },
        defaultProps: {
            defaultValue: 'tab-1',
            orientation: 'horizontal',
            variant: 'default',
            tabs: [
                { label: 'Tab 1', href: 'tab-1' },
                { label: 'Tab 2', href: 'tab-2' }
            ]
        },
        allowedChildren: [...Builder_LAYOUT_CHILDREN],
        slots: {
            panels: {
                displayName: 'Panels',
                allowedChildren: [...Builder_LAYOUT_CHILDREN]
            }
        },
        aiHints: {
            purpose: 'Groups related page sections into switchable panels.',
            recommendedSlots: ['panels']
        }
    }
];

export const Builder_OVERLAY_COMPONENTS: BuilderComponentDefinition[] = [
    {
        type: 'Modal',
        displayName: 'Modal',
        category: 'Overlay',
        description: 'Dialog overlay controlled by registered actions or editor state.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                title: stringSchema,
                opened: booleanSchema,
                size: sizeSchema,
                centered: booleanSchema,
                closeOnClickOutside: booleanSchema
            }
        },
        defaultProps: {
            title: 'Modal',
            opened: false,
            size: 'md',
            centered: true
        },
        allowedChildren: [...Builder_LAYOUT_CHILDREN],
        allowedEvents: [...Builder_OVERLAY_ALLOWED_EVENTS],
        slots: {
            actions: {
                displayName: 'Actions',
                allowedChildren: ['Button', 'Group']
            }
        }
    },
    {
        type: 'Drawer',
        displayName: 'Drawer',
        category: 'Overlay',
        description: 'Slide-out panel controlled by registered actions or editor state.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                title: stringSchema,
                opened: booleanSchema,
                position: { type: 'string', enum: ['left', 'right', 'top', 'bottom'] },
                size: sizeSchema
            }
        },
        defaultProps: {
            title: 'Drawer',
            opened: false,
            position: 'right',
            size: 'md'
        },
        allowedChildren: [...Builder_LAYOUT_CHILDREN],
        allowedEvents: [...Builder_OVERLAY_ALLOWED_EVENTS]
    }
];

export const Builder_FEEDBACK_COMPONENTS: BuilderComponentDefinition[] = [
    {
        type: 'Alert',
        displayName: 'Alert',
        category: 'Feedback',
        description: 'Inline status, warning, or informational message.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                title: stringSchema,
                children: stringSchema,
                color: colorSchema,
                variant: { type: 'string', enum: ['light', 'filled', 'outline', 'transparent', 'white'] },
                icon: stringSchema,
                radius: sizeSchema
            }
        },
        defaultProps: {
            title: 'Alert',
            children: 'Important message',
            color: 'blue',
            variant: 'light'
        },
        allowedChildren: ['Text', 'Anchor', 'Button', 'Group']
    },
    {
        type: 'NotificationBlock',
        displayName: 'Notification Block',
        category: 'Feedback',
        description: 'Persistent notification-style message inside the page.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                title: stringSchema,
                message: stringSchema,
                color: colorSchema,
                icon: stringSchema,
                withCloseButton: booleanSchema
            }
        },
        defaultProps: {
            title: 'Notification',
            message: 'Notification message',
            color: 'blue',
            withCloseButton: false
        },
        allowedChildren: ['Text', 'Anchor', 'Button', 'Group']
    },
    {
        type: 'Loader',
        displayName: 'Loader',
        category: 'Feedback',
        description: 'Loading indicator for pending content.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                size: sizeSchema,
                color: colorSchema,
                variant: { type: 'string', enum: ['oval', 'bars', 'dots'] },
                label: stringSchema
            }
        },
        defaultProps: {
            size: 'md',
            variant: 'oval'
        },
        allowedChildren: []
    }
];

export const Builder_MEDIA_COMPONENTS: BuilderComponentDefinition[] = [
    {
        type: 'Image',
        displayName: 'Image',
        category: 'Media',
        description: 'Semantic image with alt text.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                src: stringSchema,
                alt: stringSchema,
                width: { type: ['string', 'number'] },
                height: { type: ['string', 'number'] },
                fit: { type: 'string', enum: ['contain', 'cover', 'fill', 'none', 'scale-down'] },
                radius: sizeSchema
            }
        },
        defaultProps: {
            src: '',
            alt: 'Image',
            fit: 'cover'
        },
        uiSchema: {
            'ui:order': ['src', 'alt', 'fit', 'width', 'height', 'radius'],
            src: {
                'ui:widget': 'uri',
                'ui:placeholder': 'https://example.com/image.jpg'
            },
            alt: {
                'ui:placeholder': 'Describe the image for accessibility'
            },
            fit: {
                'ui:widget': 'select'
            },
            width: {
                'ui:placeholder': '100%, 320, or 320px'
            },
            height: {
                'ui:placeholder': '240, 240px, or auto'
            },
            radius: {
                'ui:widget': 'select'
            }
        },
        allowedChildren: []
    },
    {
        type: 'Avatar',
        displayName: 'Avatar',
        category: 'Media',
        description: 'User or entity avatar.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                src: stringSchema,
                alt: stringSchema,
                name: stringSchema,
                size: sizeSchema,
                radius: { type: 'string', enum: ['xs', 'sm', 'md', 'lg', 'xl', 'round'] },
                color: colorSchema
            }
        },
        defaultProps: {
            name: 'User',
            size: 'md',
            radius: 'round'
        },
        allowedChildren: []
    },
    {
        type: 'Icon',
        displayName: 'Icon',
        category: 'Media',
        description: 'Named icon from the renderer icon adapter.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                name: stringSchema,
                size: { type: ['string', 'number'] },
                color: colorSchema,
                strokeWidth: numberSchema,
                label: stringSchema
            }
        },
        defaultProps: {
            name: 'circle',
            size: 20
        },
        allowedChildren: []
    }
];

export const Builder_MARKETING_COMPONENTS: BuilderComponentDefinition[] = [
    {
        type: 'HeroSection',
        displayName: 'Hero Section',
        category: 'Marketing',
        description: 'Top marketing section with headline, copy, media, and actions.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                eyebrow: stringSchema,
                title: stringSchema,
                subtitle: stringSchema,
                imageSrc: stringSchema,
                primaryActionLabel: stringSchema,
                secondaryActionLabel: stringSchema,
                align: { type: 'string', enum: ['left', 'center'] }
            }
        },
        defaultProps: {
            title: 'Build better interfaces',
            subtitle: 'Compose a page from structured Builder components.',
            primaryActionLabel: 'Get started',
            align: 'left'
        },
        uiSchema: {
            'ui:order': ['eyebrow', 'title', 'subtitle', 'imageSrc', 'primaryActionLabel', 'secondaryActionLabel', 'align'],
            eyebrow: {
                'ui:placeholder': 'Optional short label'
            },
            title: {
                'ui:placeholder': 'Main hero headline'
            },
            subtitle: {
                'ui:widget': 'textarea',
                'ui:options': multilineTextUiOptions,
                'ui:placeholder': 'Supporting copy'
            },
            imageSrc: {
                'ui:widget': 'uri',
                'ui:placeholder': 'https://example.com/hero.jpg'
            },
            primaryActionLabel: {
                'ui:title': 'Primary CTA',
                'ui:placeholder': 'Get started'
            },
            secondaryActionLabel: {
                'ui:title': 'Secondary CTA',
                'ui:placeholder': 'Learn more'
            },
            align: {
                'ui:widget': 'radio',
                'ui:options': {
                    inline: true
                }
            }
        },
        allowedChildren: ['Title', 'Text', 'Button', 'Group', 'Image', 'Badge'],
        slots: {
            actions: {
                displayName: 'Actions',
                allowedChildren: ['Button', 'Anchor', 'Group']
            },
            media: {
                displayName: 'Media',
                allowedChildren: ['Image', 'Box']
            }
        }
    },
    {
        type: 'FeatureGrid',
        displayName: 'Feature Grid',
        category: 'Marketing',
        description: 'Grid of product features or benefits.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                title: stringSchema,
                description: stringSchema,
                columns: integerSchema,
                features: featureArraySchema
            }
        },
        defaultProps: {
            title: 'Features',
            columns: 3,
            features: [
                { title: 'Feature', description: 'Describe the feature.' }
            ]
        },
        allowedChildren: ['Card', 'Title', 'Text', 'Icon', 'SimpleGrid']
    },
    {
        type: 'PricingSection',
        displayName: 'Pricing Section',
        category: 'Marketing',
        description: 'Pricing cards with plan names, prices, and feature lists.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                title: stringSchema,
                description: stringSchema,
                plans: pricingPlanArraySchema
            }
        },
        defaultProps: {
            title: 'Pricing',
            plans: [
                { name: 'Starter', price: '$0', features: ['Feature'], ctaLabel: 'Choose plan' }
            ]
        },
        allowedChildren: ['Card', 'Title', 'Text', 'List', 'Button', 'SimpleGrid']
    },
    {
        type: 'TestimonialSection',
        displayName: 'Testimonial Section',
        category: 'Marketing',
        description: 'Customer quotes and social proof.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                title: stringSchema,
                testimonials: testimonialArraySchema
            }
        },
        defaultProps: {
            title: 'Testimonials',
            testimonials: [
                { quote: 'This changed our workflow.', author: 'Customer' }
            ]
        },
        allowedChildren: ['Card', 'Text', 'Avatar', 'Group', 'SimpleGrid']
    },
    {
        type: 'CTASection',
        displayName: 'CTA Section',
        category: 'Marketing',
        description: 'Call-to-action section with title, copy, and actions.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                title: stringSchema,
                description: stringSchema,
                primaryActionLabel: stringSchema,
                secondaryActionLabel: stringSchema,
                align: { type: 'string', enum: ['left', 'center'] }
            }
        },
        defaultProps: {
            title: 'Ready to continue?',
            primaryActionLabel: 'Continue',
            align: 'center'
        },
        allowedChildren: ['Title', 'Text', 'Button', 'Group', 'Anchor'],
        slots: {
            actions: {
                displayName: 'Actions',
                allowedChildren: ['Button', 'Anchor', 'Group']
            }
        }
    }
];

export const Builder_DASHBOARD_COMPONENTS: BuilderComponentDefinition[] = [
    {
        type: 'ChartPlaceholder',
        displayName: 'Chart Placeholder',
        category: 'Dashboard',
        description: 'Placeholder for future chart renderers with Builder data binding.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                title: stringSchema,
                description: stringSchema,
                chartType: { type: 'string', enum: ['line', 'bar', 'area', 'pie', 'donut'] },
                height: integerSchema,
                emptyText: stringSchema
            }
        },
        defaultProps: {
            title: 'Chart',
            chartType: 'line',
            height: 320,
            emptyText: 'Chart data will appear here'
        },
        allowedChildren: [],
        aiHints: {
            dataBinding: 'Use node.data.sourceId or node.data.repeat.sourceId for chart datasets.'
        }
    },
    {
        type: 'MetricGrid',
        displayName: 'Metric Grid',
        category: 'Dashboard',
        description: 'Grid container optimized for dashboard metric cards.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                columns: integerSchema,
                spacing: spacingSchema
            }
        },
        defaultProps: {
            columns: 4,
            spacing: 'md'
        },
        allowedChildren: ['MetricCard', 'StatCard'],
        aiHints: {
            recommendedChildren: ['MetricCard', 'StatCard']
        }
    },
    {
        type: 'DashboardHeader',
        displayName: 'Dashboard Header',
        category: 'Dashboard',
        description: 'Dashboard page heading with optional filters and actions.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                title: stringSchema,
                description: stringSchema,
                periodLabel: stringSchema
            }
        },
        defaultProps: {
            title: 'Dashboard',
            periodLabel: 'Today'
        },
        allowedChildren: ['Title', 'Text', 'Badge', 'Button', 'Group', 'Select', 'DateInput'],
        slots: {
            actions: {
                displayName: 'Actions',
                allowedChildren: ['Button', 'Group', 'Select', 'DateInput']
            }
        }
    }
];

export interface BuilderComponentRegistry {
    get(type: string): BuilderComponentDefinition | undefined;
    has(type: string): boolean;
    list(): BuilderComponentDefinition[];
    listCategories(): BuilderComponentCategory[];
    listByCategory(category: BuilderComponentCategory | string): BuilderComponentDefinition[];
    createDefaultNode(type: string, options?: CreateDefaultBuilderNodeOptions): BuilderNode;
}

export interface BuilderRegistryAiSummary {
    components: BuilderRegistryAiComponentSummary[];
}

export interface BuilderRegistryAiComponentSummary {
    type: string;
    description?: string;
    category: BuilderComponentCategory;
    props: BuilderRegistryAiPropSummary[];
    allowedChildren?: string[];
    slots?: Record<string, BuilderRegistryAiSlotSummary>;
    events?: string[];
    example: BuilderRegistryAiNodeExample;
}

export interface BuilderRegistryAiPropSummary {
    name: string;
    type?: string;
    enum?: BuilderJsonValue[];
    required?: boolean;
    default?: BuilderJsonValue;
}

export interface BuilderRegistryAiSlotSummary {
    description?: string;
    allowedChildren?: string[];
}

export interface BuilderRegistryAiNodeExample {
    type: string;
    props?: Record<string, BuilderJsonValue>;
    children?: BuilderRegistryAiNodeExample[];
    slots?: Record<string, BuilderRegistryAiNodeExample[]>;
}

export interface CreateBuilderRegistryAiSummaryOptions {
    maxPropsPerComponent?: number;
    maxChildrenPerComponent?: number;
    maxSlotsPerComponent?: number;
    includeEvents?: boolean;
}

export interface CreateDefaultBuilderNodeOptions {
    id?: string;
    existingTree?: BuilderNode | BuilderNode[];
    props?: Record<string, BuilderJsonValue>;
    includeDefaultChildren?: boolean;
}

export interface BuilderValidationError {
    path: string;
    message: string;
    nodeId?: string;
    componentType?: string;
}

export interface BuilderRegistryValidationResult {
    valid: boolean;
    errors: BuilderValidationError[];
}

export interface ValidateBuilderDocumentWithRegistryOptions {
    mode?: 'strict' | 'editor';
}

export class DataSourceRegistry implements BuilderDataSourceRegistry {

    protected readonly definitions: BuilderDataSourceDefinition[] = [];
    protected readonly byType = new Map<string, BuilderDataSourceDefinition>();

    constructor(definitions: readonly BuilderDataSourceDefinition[] = []) {
        definitions.forEach(definition => this.register(definition));
    }

    register(definition: BuilderDataSourceDefinition): void {
        if (this.byType.has(definition.type)) {
            throw new Error(`Builder data source type '${definition.type}' is already registered.`);
        }

        this.definitions.push(definition);
        this.byType.set(definition.type, definition);
    }

    get(type: string): BuilderDataSourceDefinition | undefined {
        return this.byType.get(type);
    }

    has(type: string): boolean {
        return this.byType.has(type);
    }

    list(): BuilderDataSourceDefinition[] {
        return [...this.definitions];
    }

    createDefaultDataSource(type: string, options: CreateDefaultBuilderDataSourceOptions = {}): BuilderDataSource {
        const definition = this.get(type);

        if (!definition) {
            throw new Error(`Cannot create default Builder data source because type '${type}' is not registered.`);
        }

        const dataSource: BuilderDataSource = {
            type,
            config: {
                ...cloneJsonObject(definition.defaultConfig),
                ...cloneJsonObject(options.config)
            }
        };

        if (options.description !== undefined) {
            dataSource.description = options.description;
        }
        if (options.cache !== undefined) {
            dataSource.cache = { ...options.cache };
        }

        return dataSource;
    }
}

export class ActionRegistry implements BuilderActionRegistry {

    protected readonly definitions: BuilderActionDefinition[] = [];
    protected readonly byType = new Map<string, BuilderActionDefinition>();

    constructor(definitions: readonly BuilderActionDefinition[] = []) {
        definitions.forEach(definition => this.register(definition));
    }

    register(definition: BuilderActionDefinition): void {
        if (this.byType.has(definition.type)) {
            throw new Error(`Builder action type '${definition.type}' is already registered.`);
        }

        this.definitions.push(definition);
        this.byType.set(definition.type, definition);
    }

    get(type: string): BuilderActionDefinition | undefined {
        return this.byType.get(type);
    }

    has(type: string): boolean {
        return this.byType.has(type);
    }

    list(): BuilderActionDefinition[] {
        return [...this.definitions];
    }

    createDefaultAction(type: string, options: CreateDefaultBuilderActionOptions = {}): BuilderAction {
        const definition = this.get(type);

        if (!definition) {
            throw new Error(`Cannot create default Builder action because type '${type}' is not registered.`);
        }

        const action: BuilderAction = {
            type,
            params: {
                ...cloneJsonObject(definition.defaultParams),
                ...cloneJsonObject(options.params)
            }
        };

        if (Object.keys(action.params ?? {}).length === 0) {
            delete action.params;
        }
        if (options.description !== undefined) {
            action.description = options.description;
        }

        return action;
    }
}

export class ComponentRegistry implements BuilderComponentRegistry {

    protected readonly definitions: BuilderComponentDefinition[] = [];
    protected readonly byType = new Map<string, BuilderComponentDefinition>();
    protected readonly byCategory = new Map<string, BuilderComponentDefinition[]>();

    constructor(definitions: readonly BuilderComponentDefinition[] = []) {
        definitions.forEach(definition => this.register(definition));
    }

    register(definition: BuilderComponentDefinition): void {
        if (!isBuilderComponentCategory(definition.category)) {
            throw new Error(`Builder component category '${definition.category}' is not supported.`);
        }

        if (this.byType.has(definition.type)) {
            throw new Error(`Builder component type '${definition.type}' is already registered.`);
        }

        this.definitions.push(definition);
        this.byType.set(definition.type, definition);

        const categoryDefinitions = this.byCategory.get(definition.category) ?? [];
        categoryDefinitions.push(definition);
        this.byCategory.set(definition.category, categoryDefinitions);
    }

    get(type: string): BuilderComponentDefinition | undefined {
        return this.byType.get(type);
    }

    has(type: string): boolean {
        return this.byType.has(type);
    }

    list(): BuilderComponentDefinition[] {
        return [...this.definitions];
    }

    listCategories(): BuilderComponentCategory[] {
        return [...Builder_COMPONENT_CATEGORIES];
    }

    listByCategory(category: BuilderComponentCategory | string): BuilderComponentDefinition[] {
        return [...(this.byCategory.get(category) ?? [])];
    }

    createDefaultNode(type: string, options: CreateDefaultBuilderNodeOptions = {}): BuilderNode {
        const definition = this.get(type);

        if (!definition) {
            throw new Error(`Cannot create default Builder node because component type '${type}' is not registered.`);
        }

        const node: BuilderNode = {
            id: generateNodeId(type, options.existingTree, options.id),
            type
        };

        const props = {
            ...cloneJsonObject(definition.defaultProps),
            ...cloneJsonObject(options.props)
        };

        if (Object.keys(props).length > 0) {
            node.props = props;
        }

        if (options.includeDefaultChildren !== false) {
            const defaultChildren = cloneNodeArray(definition.defaultChildren);
            if (defaultChildren.length > 0) {
                node.children = defaultChildren;
            }

            const defaultSlots = createDefaultSlots(definition);
            if (Object.keys(defaultSlots).length > 0) {
                node.slots = defaultSlots;
            }
        }

        return node;
    }
}

export function createStaticComponentRegistry(definitions: BuilderComponentDefinition[]): BuilderComponentRegistry {
    return new ComponentRegistry(definitions);
}

export function createStaticDataSourceRegistry(definitions: BuilderDataSourceDefinition[]): BuilderDataSourceRegistry {
    return new DataSourceRegistry(definitions);
}

export function createStaticActionRegistry(definitions: BuilderActionDefinition[]): BuilderActionRegistry {
    return new ActionRegistry(definitions);
}

export function createDefaultBuilderDataSourceRegistry(): BuilderDataSourceRegistry {
    return new DataSourceRegistry(Builder_DATA_SOURCE_DEFINITIONS);
}

export function createDefaultBuilderActionRegistry(): BuilderActionRegistry {
    return new ActionRegistry(Builder_ACTION_DEFINITIONS);
}

export function createDefaultBuilderComponentRegistry(): BuilderComponentRegistry {
    return new ComponentRegistry([
        ...Builder_LAYOUT_COMPONENTS,
        ...Builder_TYPOGRAPHY_COMPONENTS,
        ...Builder_FORM_COMPONENTS,
        ...Builder_DATA_DISPLAY_COMPONENTS,
        ...Builder_NAVIGATION_COMPONENTS,
        ...Builder_OVERLAY_COMPONENTS,
        ...Builder_FEEDBACK_COMPONENTS,
        ...Builder_MEDIA_COMPONENTS,
        ...Builder_MARKETING_COMPONENTS,
        ...Builder_DASHBOARD_COMPONENTS
    ]);
}

export function validateBuilderDocumentActionsAgainstRegistry(
    document: BuilderDocument,
    registry: BuilderActionRegistry
): BuilderActionRegistryValidationResult {
    const errors: BuilderActionRegistryValidationError[] = [];

    for (const [actionId, action] of Object.entries(document.actions ?? {})) {
        const definition = registry.get(action.type);

        if (!definition) {
            errors.push({
                path: `actions.${actionId}.type`,
                message: `Unknown Builder action type '${action.type}'. Register it in ActionRegistry before use.`,
                actionId,
                actionType: action.type
            });
            continue;
        }

        validateActionParamsAgainstSchema(action, actionId, definition, errors);
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

export function isBuilderComponentCategory(category: string): category is BuilderComponentCategory {
    return (Builder_COMPONENT_CATEGORIES as readonly string[]).includes(category);
}

export function isKnownBuilderNode(node: BuilderNode, registry: BuilderComponentRegistry): boolean {
    return registry.has(node.type);
}

export function validateBuilderDocumentDataSourcesAgainstRegistry(
    document: BuilderDocument,
    registry: BuilderDataSourceRegistry
): BuilderDataSourceRegistryValidationResult {
    const errors: BuilderDataSourceRegistryValidationError[] = [];

    for (const [dataSourceId, dataSource] of Object.entries(document.dataSources ?? {})) {
        const definition = registry.get(dataSource.type);

        if (!definition) {
            errors.push({
                path: `dataSources.${dataSourceId}.type`,
                message: `Unknown Builder data source type '${dataSource.type}'. Register it in DataSourceRegistry before use.`,
                dataSourceId,
                dataSourceType: dataSource.type
            });
            continue;
        }

        validateDataSourceConfigAgainstSchema(dataSource, dataSourceId, definition, errors);
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

export function createBuilderRegistryAiSummary(
    registry: BuilderComponentRegistry,
    options: CreateBuilderRegistryAiSummaryOptions = {}
): BuilderRegistryAiSummary {
    const maxPropsPerComponent = options.maxPropsPerComponent ?? 8;
    const maxChildrenPerComponent = options.maxChildrenPerComponent ?? 12;
    const maxSlotsPerComponent = options.maxSlotsPerComponent ?? 4;

    return {
        components: registry.list().map(definition => ({
            type: definition.type,
            description: definition.aiHints?.purpose ?? definition.description,
            category: definition.category,
            props: summarizeProps(definition, maxPropsPerComponent),
            allowedChildren: summarizeAllowedChildren(definition.allowedChildren, maxChildrenPerComponent),
            slots: summarizeSlots(definition.slots, maxSlotsPerComponent, maxChildrenPerComponent),
            events: options.includeEvents === false ? undefined : summarizeAllowedChildren(definition.allowedEvents, maxChildrenPerComponent),
            example: createAiNodeExample(definition)
        }))
    };
}

function summarizeProps(definition: BuilderComponentDefinition, maxProps: number): BuilderRegistryAiPropSummary[] {
    const properties = getSchemaProperties(definition.propsSchema);
    const required = new Set(getSchemaRequired(definition.propsSchema));
    const defaultProps = cloneJsonObject(definition.defaultProps);
    const preferredNames = [
        ...getSchemaRequired(definition.propsSchema),
        ...Object.keys(defaultProps),
        ...(definition.aiHints?.copyFields ?? [])
    ];
    const propNames = uniqueStrings([
        ...preferredNames,
        ...Object.keys(properties)
    ]).slice(0, maxProps);

    return propNames.map(name => ({
        name,
        ...summarizePropSchema(properties[name]),
        required: required.has(name) || undefined,
        default: defaultProps[name]
    }));
}

function summarizePropSchema(schema: unknown): Omit<BuilderRegistryAiPropSummary, 'name' | 'required' | 'default'> {
    if (!isJsonObject(schema)) {
        return {};
    }

    return {
        type: summarizeSchemaType(schema),
        enum: Array.isArray(schema.enum) ? schema.enum.filter(isBuilderJsonValue) : undefined
    };
}

function summarizeSchemaType(schema: Record<string, unknown>): string | undefined {
    const types = getSchemaTypes(schema.type);
    if (types.length > 0) {
        return types.join('|');
    }
    if (schema.properties) {
        return 'object';
    }
    if (schema.items) {
        return 'array';
    }
    return undefined;
}

function summarizeAllowedChildren(values: readonly string[] | undefined, maxItems: number): string[] | undefined {
    if (!values) {
        return undefined;
    }
    return values.slice(0, maxItems);
}

function summarizeSlots(
    slots: Record<string, BuilderSlotDefinition> | undefined,
    maxSlots: number,
    maxChildren: number
): Record<string, BuilderRegistryAiSlotSummary> | undefined {
    if (!slots) {
        return undefined;
    }

    const summarizedSlots: Record<string, BuilderRegistryAiSlotSummary> = {};
    for (const [slotName, slotDefinition] of Object.entries(slots).slice(0, maxSlots)) {
        summarizedSlots[slotName] = {
            description: slotDefinition.description ?? slotDefinition.displayName,
            allowedChildren: summarizeAllowedChildren(slotDefinition.allowedChildren, maxChildren)
        };
    }
    return summarizedSlots;
}

function createAiNodeExample(definition: BuilderComponentDefinition): BuilderRegistryAiNodeExample {
    const example: BuilderRegistryAiNodeExample = {
        type: definition.type
    };

    const props = cloneJsonObject(definition.defaultProps);
    if (Object.keys(props).length > 0) {
        example.props = props;
    }

    const recommendedChildType = definition.aiHints?.recommendedChildren?.[0] ?? definition.allowedChildren?.[0];
    if (recommendedChildType && recommendedChildType !== definition.type) {
        example.children = [{ type: recommendedChildType }];
    }

    const recommendedSlot = definition.aiHints?.recommendedSlots?.[0] ?? Object.keys(definition.slots ?? {})[0];
    const slotDefinition = recommendedSlot ? definition.slots?.[recommendedSlot] : undefined;
    const recommendedSlotChildType = slotDefinition?.allowedChildren?.[0];
    if (recommendedSlot && recommendedSlotChildType) {
        example.slots = {
            [recommendedSlot]: [{ type: recommendedSlotChildType }]
        };
    }

    return example;
}

function getSchemaProperties(schema: Record<string, unknown>): Record<string, unknown> {
    return isJsonObject(schema.properties) ? schema.properties : {};
}

function getSchemaRequired(schema: Record<string, unknown>): string[] {
    return Array.isArray(schema.required) ? schema.required.filter((key): key is string => typeof key === 'string') : [];
}

function uniqueStrings(values: string[]): string[] {
    return [...new Set(values)];
}

function isBuilderJsonValue(value: unknown): value is BuilderJsonValue {
    if (
        value === Builder_JSON_NULL ||
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
    ) {
        return true;
    }
    if (Array.isArray(value)) {
        return value.every(isBuilderJsonValue);
    }
    if (isJsonObject(value)) {
        return Object.values(value).every(isBuilderJsonValue);
    }
    return false;
}

function createDefaultSlots(definition: BuilderComponentDefinition): Record<string, BuilderNode[]> {
    const slots: Record<string, BuilderNode[]> = {};

    for (const [slotName, slotDefinition] of Object.entries(definition.slots ?? {})) {
        const defaultChildren = cloneNodeArray(slotDefinition.defaultChildren);
        if (defaultChildren.length > 0) {
            slots[slotName] = defaultChildren;
        }
    }

    return slots;
}

function cloneNodeArray(nodes: BuilderNode[] | undefined): BuilderNode[] {
    return nodes?.map(node => cloneNode(node)) ?? [];
}

function cloneNode(node: BuilderNode): BuilderNode {
    const clone: BuilderNode = {
        ...node
    };

    if (node.props) {
        clone.props = cloneJsonObject(node.props);
    }
    if (node.children) {
        clone.children = cloneNodeArray(node.children);
    }
    if (node.slots) {
        clone.slots = {};
        for (const [slotName, slotNodes] of Object.entries(node.slots)) {
            clone.slots[slotName] = cloneNodeArray(slotNodes);
        }
    }
    if (node.data) {
        clone.data = {
            ...node.data,
            fields: cloneUnknown(node.data.fields),
            repeat: node.data.repeat ? { ...node.data.repeat } : undefined,
            emptyState: cloneNodeArray(node.data.emptyState)
        };
    }
    if (node.events) {
        clone.events = {};
        for (const [eventName, binding] of Object.entries(node.events)) {
            clone.events[eventName] = {
                ...binding,
                params: cloneJsonObject(binding.params)
            };
        }
    }
    if (node.permissions) {
        clone.permissions = node.permissions.map(rule => ({ ...rule }));
    }
    if (node.style) {
        clone.style = cloneJsonObject(node.style) as BuilderNode['style'];
    }
    if (node.meta) {
        clone.meta = cloneJsonObject(node.meta) as BuilderNode['meta'];
    }

    return clone;
}

function cloneJsonObject<T extends Record<string, unknown> | undefined>(value: T): Record<string, BuilderJsonValue> {
    if (!value) {
        return {};
    }

    return JSON.parse(JSON.stringify(value)) as Record<string, BuilderJsonValue>;
}

function cloneUnknown<T>(value: T): T {
    if (value === undefined) {
        return value;
    }

    return JSON.parse(JSON.stringify(value)) as T;
}

export function validateBuilderDocumentTypesAgainstRegistry(
    document: BuilderDocument,
    registry: BuilderComponentRegistry,
    options: ValidateBuilderDocumentWithRegistryOptions = {}
): BuilderRegistryValidationResult {
    return validateBuilderNodeTypesAgainstRegistry(document.tree, registry, options);
}

export function validateBuilderNodeTypesAgainstRegistry(
    node: BuilderNode,
    registry: BuilderComponentRegistry,
    options: ValidateBuilderDocumentWithRegistryOptions = {}
): BuilderRegistryValidationResult {
    const errors: BuilderValidationError[] = [];
    validateNodeTypeAgainstRegistry(node, '$.tree', registry, options.mode ?? 'strict', errors);

    return {
        valid: errors.length === 0,
        errors
    };
}

function validateNodeTypeAgainstRegistry(
    node: BuilderNode,
    path: string,
    registry: BuilderComponentRegistry,
    mode: 'strict' | 'editor',
    errors: BuilderValidationError[]
): void {
    const definition = registry.get(node.type);

    if (!definition && mode !== 'editor') {
        errors.push({
            path: `${path}.type`,
            message: `Unknown Builder component type '${node.type}'. ` +
                'Register it in ComponentRegistry or validate in editor mode to allow an editor fallback.',
            nodeId: node.id,
            componentType: node.type
        });
    }

    if (definition) {
        validateNodePropsAgainstSchema(node, path, definition, errors);
        validateNodeChildrenAgainstDefinition(node, path, definition, errors);
        validateNodeEventsAgainstDefinition(node, path, definition, errors);
    }

    node.children?.forEach((child, index) => {
        validateNodeTypeAgainstRegistry(child, `${path}.children[${index}]`, registry, mode, errors);
    });

    for (const [slotName, slotNodes] of Object.entries(node.slots ?? {})) {
        slotNodes.forEach((slotNode, index) => {
            validateNodeTypeAgainstRegistry(slotNode, `${path}.slots.${slotName}[${index}]`, registry, mode, errors);
        });
    }

    node.data?.emptyState?.forEach((emptyStateNode, index) => {
        validateNodeTypeAgainstRegistry(emptyStateNode, `${path}.data.emptyState[${index}]`, registry, mode, errors);
    });
}

function validateNodeChildrenAgainstDefinition(
    node: BuilderNode,
    nodePath: string,
    definition: BuilderComponentDefinition,
    errors: BuilderValidationError[]
): void {
    if (definition.allowedChildren !== undefined) {
        node.children?.forEach((child, index) => {
            validateChildTypeAllowed(
                child,
                `${nodePath}.children[${index}].type`,
                node,
                definition.allowedChildren!,
                errors
            );
        });
    }

    for (const [slotName, slotNodes] of Object.entries(node.slots ?? {})) {
        const slotDefinition = definition.slots?.[slotName];

        if (!slotDefinition) {
            errors.push({
                path: `${nodePath}.slots.${slotName}`,
                message: `Component '${node.type}' does not define slot '${slotName}'.`,
                nodeId: node.id,
                componentType: node.type
            });
            continue;
        }

        if (slotDefinition.allowedChildren === undefined) {
            continue;
        }

        slotNodes.forEach((slotNode, index) => {
            validateChildTypeAllowed(
                slotNode,
                `${nodePath}.slots.${slotName}[${index}].type`,
                node,
                slotDefinition.allowedChildren!,
                errors
            );
        });
    }
}

function validateChildTypeAllowed(
    child: BuilderNode,
    childTypePath: string,
    parent: BuilderNode,
    allowedChildren: string[],
    errors: BuilderValidationError[]
): void {
    if (allowedChildren.includes(child.type)) {
        return;
    }

    const expectation = allowedChildren.length > 0 ? allowedChildren.join(', ') : 'no children';
    errors.push({
        path: childTypePath,
        message: `Component '${parent.type}' does not allow child component '${child.type}'; expected ${expectation}.`,
        nodeId: child.id,
        componentType: child.type
    });
}

function validateNodeEventsAgainstDefinition(
    node: BuilderNode,
    nodePath: string,
    definition: BuilderComponentDefinition,
    errors: BuilderValidationError[]
): void {
    if (definition.allowedEvents === undefined || !node.events) {
        return;
    }

    for (const eventName of Object.keys(node.events)) {
        if (definition.allowedEvents.includes(eventName)) {
            continue;
        }

        const expectation = definition.allowedEvents.length > 0 ? definition.allowedEvents.join(', ') : 'no events';
        errors.push({
            path: `${nodePath}.events.${eventName}`,
            message: `Component '${node.type}' does not allow event '${eventName}'; expected ${expectation}.`,
            nodeId: node.id,
            componentType: node.type
        });
    }
}

function validateNodePropsAgainstSchema(
    node: BuilderNode,
    nodePath: string,
    definition: BuilderComponentDefinition,
    errors: BuilderValidationError[]
): void {
    const schema = definition.propsSchema;

    if (!schema || Object.keys(schema).length === 0) {
        return;
    }

    validateJsonSchemaValue(node.props ?? {}, schema, `${nodePath}.props`, node, errors);
}

function validateDataSourceConfigAgainstSchema(
    dataSource: BuilderDataSource,
    dataSourceId: string,
    definition: BuilderDataSourceDefinition,
    errors: BuilderDataSourceRegistryValidationError[]
): void {
    if (!definition.configSchema || Object.keys(definition.configSchema).length === 0) {
        return;
    }

    validateDataSourceSchemaValue(
        dataSource.config ?? {},
        definition.configSchema,
        `dataSources.${dataSourceId}.config`,
        dataSourceId,
        definition,
        errors
    );
}

function validateActionParamsAgainstSchema(
    action: BuilderAction,
    actionId: string,
    definition: BuilderActionDefinition,
    errors: BuilderActionRegistryValidationError[]
): void {
    if (!definition.paramsSchema || Object.keys(definition.paramsSchema).length === 0) {
        return;
    }

    validateActionSchemaValue(
        action.params ?? {},
        definition.paramsSchema,
        `actions.${actionId}.params`,
        actionId,
        definition,
        errors
    );
}

function validateActionSchemaValue(
    value: unknown,
    schema: Record<string, unknown>,
    path: string,
    actionId: string,
    definition: BuilderActionDefinition,
    errors: BuilderActionRegistryValidationError[]
): void {
    const schemaTypes = getSchemaTypes(schema.type);

    if (schemaTypes.length > 0 && !schemaTypes.some(type => matchesJsonSchemaType(value, type))) {
        pushActionValidationError(errors, path, `Invalid params value for action '${actionId}': expected ${schemaTypes.join(' or ')}.`, actionId, definition.type);
        return;
    }

    if (Array.isArray(schema.enum) && !schema.enum.some(option => option === value)) {
        pushActionValidationError(errors, path, `Invalid params value for action '${actionId}': expected one of ${schema.enum.map(String).join(', ')}.`, actionId, definition.type);
        return;
    }

    if (isJsonObject(value)) {
        validateActionObjectSchema(value, schema, path, actionId, definition, errors);
        return;
    }

    if (Array.isArray(value) && isJsonObject(schema.items)) {
        value.forEach((item, index) => validateActionSchemaValue(item, schema.items as Record<string, unknown>, `${path}[${index}]`, actionId, definition, errors));
    }
}

function validateActionObjectSchema(
    value: Record<string, unknown>,
    schema: Record<string, unknown>,
    path: string,
    actionId: string,
    definition: BuilderActionDefinition,
    errors: BuilderActionRegistryValidationError[]
): void {
    const properties = isJsonObject(schema.properties) ? schema.properties : {};
    const required = Array.isArray(schema.required) ? schema.required.filter((key): key is string => typeof key === 'string') : [];

    for (const requiredKey of required) {
        if (value[requiredKey] === undefined) {
            pushActionValidationError(errors, `${path}.${requiredKey}`, `Missing required param '${requiredKey}' for action '${actionId}'.`, actionId, definition.type);
        }
    }

    for (const [key, childValue] of Object.entries(value)) {
        const propertySchema = properties[key];

        if (isJsonObject(propertySchema)) {
            validateActionSchemaValue(childValue, propertySchema, `${path}.${key}`, actionId, definition, errors);
        } else if (schema.additionalProperties === false) {
            pushActionValidationError(errors, `${path}.${key}`, `Unknown param '${key}' for action '${actionId}'.`, actionId, definition.type);
        }
    }
}

function validateDataSourceSchemaValue(
    value: unknown,
    schema: Record<string, unknown>,
    path: string,
    dataSourceId: string,
    definition: BuilderDataSourceDefinition,
    errors: BuilderDataSourceRegistryValidationError[]
): void {
    const schemaTypes = getSchemaTypes(schema.type);

    if (schemaTypes.length > 0 && !schemaTypes.some(type => matchesJsonSchemaType(value, type))) {
        pushDataSourceValidationError(errors, path, `Invalid config value for data source '${dataSourceId}': expected ${schemaTypes.join(' or ')}.`, dataSourceId, definition.type);
        return;
    }

    if (Array.isArray(schema.enum) && !schema.enum.some(option => option === value)) {
        pushDataSourceValidationError(
            errors,
            path,
            `Invalid config value for data source '${dataSourceId}': expected one of ${schema.enum.map(String).join(', ')}.`,
            dataSourceId,
            definition.type
        );
        return;
    }

    if (isJsonObject(value)) {
        validateDataSourceObjectSchema(value, schema, path, dataSourceId, definition, errors);
        return;
    }

    if (Array.isArray(value) && isJsonObject(schema.items)) {
        value.forEach((item, index) => validateDataSourceSchemaValue(item, schema.items as Record<string, unknown>, `${path}[${index}]`, dataSourceId, definition, errors));
    }
}

function validateDataSourceObjectSchema(
    value: Record<string, unknown>,
    schema: Record<string, unknown>,
    path: string,
    dataSourceId: string,
    definition: BuilderDataSourceDefinition,
    errors: BuilderDataSourceRegistryValidationError[]
): void {
    const properties = isJsonObject(schema.properties) ? schema.properties : {};
    const required = Array.isArray(schema.required) ? schema.required.filter((key): key is string => typeof key === 'string') : [];

    for (const requiredKey of required) {
        if (value[requiredKey] === undefined) {
            pushDataSourceValidationError(
                errors,
                `${path}.${requiredKey}`,
                `Missing required config '${requiredKey}' for data source '${dataSourceId}'.`,
                dataSourceId,
                definition.type
            );
        }
    }

    for (const [key, childValue] of Object.entries(value)) {
        const propertySchema = properties[key];

        if (isJsonObject(propertySchema)) {
            validateDataSourceSchemaValue(childValue, propertySchema, `${path}.${key}`, dataSourceId, definition, errors);
        } else if (schema.additionalProperties === false) {
            pushDataSourceValidationError(errors, `${path}.${key}`, `Unknown config '${key}' for data source '${dataSourceId}'.`, dataSourceId, definition.type);
        }
    }
}

function validateJsonSchemaValue(
    value: unknown,
    schema: Record<string, unknown>,
    path: string,
    node: BuilderNode,
    errors: BuilderValidationError[]
): void {
    const schemaTypes = getSchemaTypes(schema.type);

    if (schemaTypes.length > 0 && !schemaTypes.some(type => matchesJsonSchemaType(value, type))) {
        pushPropsValidationError(
            errors,
            path,
            `Invalid props value for component '${node.type}': expected ${schemaTypes.join(' or ')}.`,
            node
        );
        return;
    }

    if (Array.isArray(schema.enum) && !schema.enum.some(option => option === value)) {
        pushPropsValidationError(
            errors,
            path,
            `Invalid props value for component '${node.type}': expected one of ${schema.enum.map(String).join(', ')}.`,
            node
        );
        return;
    }

    if (isJsonObject(value)) {
        validateObjectSchema(value, schema, path, node, errors);
        return;
    }

    if (Array.isArray(value) && isJsonObject(schema.items)) {
        value.forEach((item, index) => validateJsonSchemaValue(item, schema.items as Record<string, unknown>, `${path}[${index}]`, node, errors));
    }
}

function validateObjectSchema(
    value: Record<string, unknown>,
    schema: Record<string, unknown>,
    path: string,
    node: BuilderNode,
    errors: BuilderValidationError[]
): void {
    const properties = isJsonObject(schema.properties) ? schema.properties : {};
    const required = Array.isArray(schema.required) ? schema.required.filter((key): key is string => typeof key === 'string') : [];

    for (const requiredKey of required) {
        if (value[requiredKey] === undefined) {
            pushPropsValidationError(
                errors,
                `${path}.${requiredKey}`,
                `Missing required prop '${requiredKey}' for component '${node.type}'.`,
                node
            );
        }
    }

    for (const [key, childValue] of Object.entries(value)) {
        const propertySchema = properties[key];

        if (isJsonObject(propertySchema)) {
            validateJsonSchemaValue(childValue, propertySchema, `${path}.${key}`, node, errors);
        } else if (schema.additionalProperties === false) {
            pushPropsValidationError(
                errors,
                `${path}.${key}`,
                `Unknown prop '${key}' for component '${node.type}'.`,
                node
            );
        }
    }
}

function pushPropsValidationError(
    errors: BuilderValidationError[],
    path: string,
    message: string,
    node: BuilderNode
): void {
    errors.push({
        path: path.replace(/^\$\./, ''),
        message,
        nodeId: node.id,
        componentType: node.type
    });
}

function pushDataSourceValidationError(
    errors: BuilderDataSourceRegistryValidationError[],
    path: string,
    message: string,
    dataSourceId: string,
    dataSourceType: string
): void {
    errors.push({
        path,
        message,
        dataSourceId,
        dataSourceType
    });
}

function pushActionValidationError(
    errors: BuilderActionRegistryValidationError[],
    path: string,
    message: string,
    actionId: string,
    actionType: string
): void {
    errors.push({
        path,
        message,
        actionId,
        actionType
    });
}

function getSchemaTypes(type: unknown): string[] {
    if (typeof type === 'string') {
        return [type];
    }
    if (Array.isArray(type)) {
        return type.filter((item): item is string => typeof item === 'string');
    }
    return [];
}

function matchesJsonSchemaType(value: unknown, type: string): boolean {
    switch (type) {
        case 'array':
            return Array.isArray(value);
        case 'boolean':
            return typeof value === 'boolean';
        case 'integer':
            return typeof value === 'number' && Number.isInteger(value);
        case 'null':
            return value === Builder_JSON_NULL;
        case 'number':
            return typeof value === 'number' && Number.isFinite(value);
        case 'object':
            return isJsonObject(value);
        case 'string':
            return typeof value === 'string';
        default:
            return true;
    }
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
    return value !== undefined && value !== Builder_JSON_NULL && typeof value === 'object' && !Array.isArray(value);
}
